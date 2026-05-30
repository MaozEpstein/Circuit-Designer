/**
 * BackendPanel — VLSI Backend Design panel.
 * Tab-based UI: STA (active) | Synthesis | Floorplan | Placement | Signoff.
 * Only STA is functional; other tabs show placeholders.
 */

import { analyzeTimingPaths, pathDetail } from '../STAEngine.js';
import { synthesize, generateSDC, classifyGroupPaths, estimateCongestion, synthesisSteps, generateDEF } from '../SynthesisEngine.js';
import { computeFloorplan, PORT_COLORS }  from '../FloorplanEngine.js';
import { computePlacement }               from '../PlacementEngine.js';
import { runSignoff }                      from '../SignoffEngine.js';
import { registerGenericCells }            from '../CellLibrary.js';
import { setStaCriticalPath }             from '../../rendering/CanvasRenderer.js';

const TABS = [
  { id: 'sta',       label: 'STA',       enabled: true  },
  { id: 'synthesis',  label: 'Synthesis',  enabled: true  },
  { id: 'floorplan',  label: 'Floorplan',  enabled: true  },
  { id: 'placement',  label: 'Placement',  enabled: true  },
  { id: 'signoff',    label: 'Signoff',    enabled: true  },
];

const TAB_PLACEHOLDERS = {
  synthesis:  'Logic Synthesis: RTL to gate-level netlist translation, cell mapping, area/timing/power optimization.',
  floorplan:  'Floorplanning: die area definition, macro placement, port assignment, congestion estimation.',
  placement:  'Placement & CTS: standard cell placement, clock tree synthesis, utilization and density analysis.',
  signoff:    'Signoff & Reports: DRC, LVS, power estimation, timing signoff, area breakdown, GDS/OASIS export.',
};

export class BackendPanel {
  constructor(sceneRef) {
    this._scene          = sceneRef;
    this._el             = document.getElementById('backend-panel');
    this._tabsEl         = document.getElementById('backend-panel-tabs');
    this._summaryEl      = document.getElementById('backend-panel-summary');
    this._bodyEl         = document.getElementById('backend-panel-body');
    this._visible        = false;
    this._renderScheduled = false;
    this._activeTab      = 'sta';
    this._lastResult     = null;
    this._lastSynth      = null;
    this._lastSdc        = null;
    this._lastGroups     = null;
    this._lastCongestion = null;
    this._lastSteps      = null;
    this._lastDef        = null;
    this._synthMode      = 'topological';
    this._customGroups   = [];      // [{ name, from, to }]
    this._cgDraft        = { name: '', from: '', to: '' };
    this._selectedPath   = -1;
    this._selectedBucket = null;   // { min, max, color } — STA histogram range highlight

    // Floorplan tab state
    this._lastFloorplan    = null;
    this._fpUtilization    = 0.70;
    this._fpAspect         = 1.0;
    this._fpShowCongestion = false;
    this._fpShowPower      = true;  // power rings + strap mesh overlay
    this._fpShowTracks     = true;  // routing-track grid over the core
    this._fpPortEdges      = {};    // nodeId → 'N'|'E'|'S'|'W'

    // Placement & CTS tab state
    this._lastPlacement         = null;
    this._lastPlacementSta      = null;   // STA re-run with CTS skew
    this._lastPlacementStaIdeal = null;   // STA with ideal clock (skew 0)
    this._plShowDensity         = false;
    this._plShowClockTree       = true;
    this._plIdealVsCts          = 'cts';  // which timing column is emphasized
    this._plClockBufferPs       = 35;

    // Signoff tab state
    this._lastSignoff           = null;
    this._collapsedSections = new Set([
      'hist-info',     // STA: slack distribution explanation
      'synth-info',    // Synthesis: overview (now also contains flow diagram)
      'mode-info',     // Synthesis: topo vs non-topo table
      'group-info',    // Synthesis: group paths descriptions
      'sdc-info',      // Synthesis: wire load model
      'netlist-info',  // Synthesis: GL netlist assign hint
      'floorplan-info',   // Floorplan: Die Plan overview
      'fp-controls-info', // Floorplan: controls explanation
      'fp-metrics-info',  // Floorplan: metrics explanation
      'fp-ports-info',    // Floorplan: port assignment explanation
      'fp-macros-info',   // Floorplan: macros explanation
      'pl-controls-info', // Placement: controls
      'pl-place-info',    // Placement: standard-cell placement
      'pl-cts-info',      // Placement: clock tree synthesis
      'pl-timing-info',   // Placement: timing impact
      'so-checklist-info',// Signoff: checklist explanation
      'so-power-info',    // Signoff: power estimate
      'so-tapeout-info',  // Signoff: tapeout export
    ]);

    // STA parameters
    this._clockPeriodPs  = 2000;
    this._tSetupPs       = 50;
    this._tHoldPs        = 20;
    this._tClk2QPs       = 100;

    this._bindEvents();
  }

  // ── Public API ───────────────────────────────────────

  show() {
    if (!this._el) return;
    this._el.classList.remove('hidden');
    document.getElementById('btn-backend-toggle')?.classList.add('active');
    this._visible = true;
    this._scheduleRender();
  }

  hide() {
    if (!this._el) return;
    this._el.classList.add('hidden');
    document.getElementById('btn-backend-toggle')?.classList.remove('active');
    this._visible = false;
    setStaCriticalPath(null);
  }

  toggle() {
    if (this._visible) this.hide();
    else this.show();
  }

  // ── Events ───────────────────────────────────────────

  _bindEvents() {
    document.getElementById('btn-backend-toggle')?.addEventListener('click', () => this.toggle());
    document.getElementById('btn-backend-run')?.addEventListener('click', () => {
      if (this._activeTab === 'synthesis') this._runSynthesis();
      else if (this._activeTab === 'floorplan') this._runFloorplan();
      else if (this._activeTab === 'placement') this._runPlacement();
      else if (this._activeTab === 'signoff') this._runSignoff();
      else this._runSta();
    });
    document.getElementById('btn-backend-run-all')?.addEventListener('click', () => this._runAll());
    document.getElementById('btn-backend-close')?.addEventListener('click', () => this.hide());
    document.getElementById('btn-backend-fullscreen')?.addEventListener('click', () => this._toggleFullscreen());

    // Corner resize grip (top-left): resizes width + height simultaneously
    const grip = document.getElementById('backend-resize-grip');
    if (grip) {
      let startX, startY, startW, startH;
      const onMove = e => {
        this._el.style.width  = Math.max(340, startW - (e.clientX - startX)) + 'px';
        this._el.style.height = Math.max(160, startH - (e.clientY - startY)) + 'px';
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      grip.addEventListener('mousedown', e => {
        startX = e.clientX;
        startY = e.clientY;
        startW = this._el.offsetWidth;
        startH = this._el.offsetHeight;
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        e.preventDefault();
      });
    }

    // Event delegation on body
    this._bodyEl?.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === 'select-path') {
        this._selectedPath = parseInt(btn.dataset.index, 10);
        this._selectedBucket = null;   // direct row click clears the range highlight
        this._highlightPath(this._selectedPath);
        this._scheduleRender();
      } else if (action === 'select-hist-bucket') {
        this._selectedBucket = {
          min:   parseFloat(btn.dataset.min),
          max:   parseFloat(btn.dataset.max),
          color: btn.dataset.color,
        };
        this._selectedPath = parseInt(btn.dataset.index, 10);
        this._highlightPath(this._selectedPath);
        this._scheduleRender();
      } else if (action === 'toggle-section') {
        const sec = btn.dataset.section;
        if (this._collapsedSections.has(sec)) this._collapsedSections.delete(sec);
        else this._collapsedSections.add(sec);
        this._scheduleRender();
      } else if (action === 'apply-clock') {
        this._readClockInputs();
        this._runSta();
      } else if (action === 'so-fix-clock') {
        this._clockPeriodPs = parseInt(btn.dataset.value, 10);
        this._recomputeSignoff();
        this._scheduleRender();
      } else if (action === 'so-fix-util') {
        this._fpUtilization = parseFloat(btn.dataset.value);
        this._recomputeSignoff();
        this._scheduleRender();
      } else if (action === 'so-fix-map') {
        registerGenericCells((btn.dataset.value || '').split(',').filter(Boolean));
        this._recomputeSignoff();
        this._scheduleRender();
      } else if (action === 'copy-netlist') {
        if (this._lastSynth?.netlist && navigator.clipboard) {
          navigator.clipboard.writeText(this._lastSynth.netlist);
          btn.textContent = 'COPIED';
          setTimeout(() => { btn.textContent = 'COPY'; }, 1200);
        }
      } else if (action === 'copy-sdc') {
        if (this._lastSdc?.sdc && navigator.clipboard) {
          navigator.clipboard.writeText(this._lastSdc.sdc);
          btn.textContent = 'COPIED';
          setTimeout(() => { btn.textContent = 'COPY'; }, 1200);
        }
      } else if (action === 'set-synth-mode') {
        this._synthMode = btn.dataset.mode;
        this._scheduleRender();
      } else if (action === 'select-group') {
        const grp = this._lastGroups?.groups?.[btn.dataset.group];
        if (grp?.nodeIds?.length) {
          setStaCriticalPath(grp.nodeIds, 'met');
          btn.textContent = 'HIGHLIGHTED';
          setTimeout(() => { btn.textContent = 'HIGHLIGHT'; }, 1500);
        }
      } else if (action === 'copy-def') {
        if (this._lastDef?.def && navigator.clipboard) {
          navigator.clipboard.writeText(this._lastDef.def);
          btn.textContent = 'COPIED';
          setTimeout(() => { btn.textContent = 'COPY'; }, 1200);
        }
      } else if (action === 'copy-oasis') {
        if (this._lastSignoff?.oasisStub && navigator.clipboard) {
          navigator.clipboard.writeText(this._lastSignoff.oasisStub);
          btn.textContent = 'COPIED';
          setTimeout(() => { btn.textContent = 'COPY'; }, 1200);
        }
      } else if (action === 'cg-add') {
        this._readCgDraftFromDom();
        const d = this._cgDraft;
        if (d.from || d.to) {
          this._customGroups.push({
            name: d.name || `grp${this._customGroups.length + 1}`,
            from: d.from,
            to:   d.to,
          });
          this._cgDraft = { name: '', from: '', to: '' };
          // Re-run synthesis so SDC reflects the new custom group
          this._runSynthesis();
        }
      } else if (action === 'cg-remove') {
        const idx = parseInt(btn.dataset.idx, 10);
        if (Number.isInteger(idx)) {
          this._customGroups.splice(idx, 1);
          this._runSynthesis();
        }
      } else if (action === 'fp-aspect') {
        this._fpAspect = parseFloat(btn.dataset.aspect);
        this._recomputeFloorplan();
        this._scheduleRender();
      } else if (action === 'fp-toggle-congestion') {
        this._fpShowCongestion = !this._fpShowCongestion;
        this._scheduleRender();
      } else if (action === 'fp-toggle-power') {
        this._fpShowPower = !this._fpShowPower;
        this._scheduleRender();
      } else if (action === 'fp-toggle-tracks') {
        this._fpShowTracks = !this._fpShowTracks;
        this._scheduleRender();
      } else if (action === 'fp-cycle-port') {
        const id = btn.dataset.nodeId;
        const order = ['N', 'E', 'S', 'W'];
        const cur = this._currentPortEdge(id);
        this._fpPortEdges[id] = order[(order.indexOf(cur) + 1) % order.length];
        this._recomputeFloorplan();
        this._scheduleRender();
      } else if (action === 'fp-set-port') {
        const id = btn.dataset.nodeId, edge = btn.dataset.edge;
        if (this._currentPortEdge(id) !== edge) {
          this._fpPortEdges[id] = edge;
          this._recomputeFloorplan();
          this._scheduleRender();
        }
      } else if (action === 'fp-highlight-macro') {
        const id = btn.dataset.nodeId;
        setStaCriticalPath(this._macroHighlightIds(id), 'met');
        btn.textContent = 'HIGHLIGHTED';
        setTimeout(() => { btn.textContent = 'HIGHLIGHT'; }, 1500);
      } else if (action === 'pl-toggle-density') {
        this._plShowDensity = !this._plShowDensity;
        this._scheduleRender();
      } else if (action === 'pl-toggle-tree') {
        this._plShowClockTree = !this._plShowClockTree;
        this._scheduleRender();
      } else if (action === 'pl-set-timing') {
        this._plIdealVsCts = btn.dataset.mode;
        this._scheduleRender();
      } else if (action === 'pl-highlight-sink') {
        setStaCriticalPath(this._macroHighlightIds(btn.dataset.nodeId), 'met');
        btn.textContent = 'HIGHLIGHTED';
        setTimeout(() => { btn.textContent = 'HIGHLIGHT'; }, 1500);
      }
    });

    // Track draft input for custom group fields (input event — no re-render)
    this._bodyEl?.addEventListener('input', e => {
      // Floorplan utilization slider: live, surgical update (no full re-render,
      // so the range input keeps focus during the drag).
      if (e.target?.dataset?.fpField === 'utilization') {
        this._fpUtilization = parseInt(e.target.value, 10) / 100;
        this._updateFloorplanLive();
        return;
      }
      if (e.target?.dataset?.plField === 'clockBuffer') {
        this._plClockBufferPs = parseInt(e.target.value, 10);
        this._updatePlacementLive();
        return;
      }
      const field = e.target?.dataset?.cgField;
      if (!field) return;
      this._cgDraft[field] = e.target.value;
    });

    // Tab clicks
    this._tabsEl?.addEventListener('click', e => {
      const tab = e.target.closest('.backend-tab');
      if (!tab) return;
      this._activeTab = tab.dataset.tab;
      this._selectedPath = -1;
      // Clear STA overlay when leaving STA tab
      if (this._activeTab !== 'sta') setStaCriticalPath(null);
      this._scheduleRender();
    });
  }

  // ── Core ──────────────────────────────────────────────

  _runSta() {
    if (!this._scene) return;
    const scene = {
      nodes: this._scene.nodes,
      wires: this._scene.wires,
    };
    this._lastResult = analyzeTimingPaths(scene, {
      clockPeriodPs: this._clockPeriodPs,
      tSetupPs:      this._tSetupPs,
      tHoldPs:       this._tHoldPs,
      tClk2QPs:      this._tClk2QPs,
    });
    this._selectedPath = -1;
    this._selectedBucket = null;
    if (this._lastResult.criticalPath?.length) {
      this._selectedPath = 0;
      this._highlightPath(0);
    } else {
      setStaCriticalPath(null);
    }
    this._scheduleRender();
  }

  _highlightPath(idx) {
    const r = this._lastResult;
    if (!r || idx < 0 || idx >= r.paths.length) {
      setStaCriticalPath(null);
      return;
    }
    const p = r.paths[idx];
    setStaCriticalPath(p.nodeIds, p.status === 'VIOLATED' ? 'violated' : 'met');
  }

  _readClockInputs() {
    const body = this._bodyEl;
    if (!body) return;
    const get = id => {
      const el = body.querySelector(`[data-param="${id}"]`);
      return el ? parseInt(el.value, 10) : null;
    };
    this._clockPeriodPs = get('clockPeriod') ?? this._clockPeriodPs;
    this._tSetupPs      = get('tSetup')      ?? this._tSetupPs;
    this._tHoldPs       = get('tHold')       ?? this._tHoldPs;
    this._tClk2QPs      = get('tClk2Q')      ?? this._tClk2QPs;
  }

  _toggleFullscreen() {
    this._el?.classList.toggle('backend-fullscreen');
  }

  // ── Rendering ─────────────────────────────────────────

  _scheduleRender() {
    if (this._renderScheduled) return;
    this._renderScheduled = true;
    requestAnimationFrame(() => {
      this._renderScheduled = false;
      if (this._visible) this._render();
    });
  }

  _render() {
    this._renderTabs();
    this._updateRunButtonLabel();
    if (this._activeTab === 'sta') {
      this._renderSummary(this._lastResult);
      this._renderStaBody(this._lastResult);
    } else if (this._activeTab === 'synthesis') {
      this._renderSynthSummary(this._lastSynth);
      this._renderSynthBody(this._lastSynth);
    } else if (this._activeTab === 'floorplan') {
      this._renderFloorplanSummary(this._lastFloorplan);
      this._renderFloorplanBody(this._lastFloorplan);
    } else if (this._activeTab === 'placement') {
      this._renderPlacementSummary(this._lastPlacement);
      this._renderPlacementBody(this._lastPlacement);
    } else if (this._activeTab === 'signoff') {
      this._renderSignoffSummary(this._lastSignoff);
      this._renderSignoffBody(this._lastSignoff);
    } else {
      this._renderSummary(null);
      this._renderPlaceholder(this._activeTab);
    }
  }

  _updateRunButtonLabel() {
    const btn = document.getElementById('btn-backend-run');
    if (!btn) return;
    if (this._activeTab === 'synthesis') {
      btn.textContent = 'RUN SYNTH';
      btn.title = 'Run logic synthesis: map gates to standard cells, compute area, generate netlist';
    } else if (this._activeTab === 'sta') {
      btn.textContent = 'RUN STA';
      btn.title = 'Run Static Timing Analysis on the current circuit';
    } else if (this._activeTab === 'floorplan') {
      btn.textContent = 'RUN FLOORPLAN';
      btn.title = 'Plan the die: core/die area from utilization, place macros, assign ports';
    } else if (this._activeTab === 'placement') {
      btn.textContent = 'RUN PLACE+CTS';
      btn.title = 'Legalize standard cells into rows and synthesize a balanced clock tree (CTS)';
    } else if (this._activeTab === 'signoff') {
      btn.textContent = 'RUN SIGNOFF';
      btn.title = 'Aggregate all stages: timing, DRC, power, LVS/FM proxies, tapeout export';
    } else {
      btn.textContent = '—';
      btn.title = 'Not available on this tab';
    }
  }

  _renderTabs() {
    if (!this._tabsEl) return;
    this._tabsEl.innerHTML = TABS.map(t =>
      `<button class="backend-tab${t.id === this._activeTab ? ' active' : ''}" data-tab="${t.id}">${t.label}</button>`
    ).join('');
  }

  _renderSummary(r) {
    if (!this._summaryEl) return;
    if (!r) {
      this._summaryEl.innerHTML = '';
      return;
    }
    const sv = (label, value, cls = '') =>
      `<div><span class="backend-summary-label">${label}</span><br><span class="backend-summary-value ${cls}">${value}</span></div>`;

    const wnsClass = r.wns < 0 ? 'violated' : 'met';
    this._summaryEl.innerHTML = [
      sv('WNS', `${r.wns} ps`, wnsClass),
      sv('TNS', `${r.tns} ps`, r.tns < 0 ? 'violated' : ''),
      sv('Paths', r.paths.length),
      sv('Violations', r.numViolations, r.numViolations > 0 ? 'violated' : 'met'),
      sv('fMax', `${r.fMaxMHz} MHz`),
    ].join('');
  }

  _renderPlaceholder(tabId) {
    if (!this._bodyEl) return;
    const desc = TAB_PLACEHOLDERS[tabId] || '';
    this._bodyEl.innerHTML = `<div class="backend-coming-soon"><h3>${tabId.toUpperCase()}</h3><p>Coming soon</p><p style="font-size:9px;margin-top:1em;color:#3a6a4a">${desc}</p></div>`;
  }

  _renderStaBody(r) {
    if (!this._bodyEl) return;
    if (!r) {
      this._bodyEl.innerHTML = '<div class="backend-coming-soon"><p>Click <b>RUN STA</b> to analyze timing paths</p></div>';
      return;
    }

    let html = '';

    // Clock settings section
    const clkField = (label, param, val, step) => `<div class="backend-clk-field">
      <label>${label}</label>
      <input type="number" data-param="${param}" value="${val}" min="0" step="${step}" />
    </div>`;
    html += this._renderSection('clock', 'Clock Settings', `
      <div class="backend-clk-grid">
        ${clkField('Clock Period (ps)', 'clockPeriod', this._clockPeriodPs, 10)}
        ${clkField('t<sub>Setup</sub> (ps)', 'tSetup', this._tSetupPs, 5)}
        ${clkField('t<sub>Hold</sub> (ps)', 'tHold', this._tHoldPs, 5)}
        ${clkField('t<sub>Clk2Q</sub> (ps)', 'tClk2Q', this._tClk2QPs, 10)}
      </div>
      <button class="btn-secondary backend-action-run" data-action="apply-clock" style="font-size:9px;padding:5px 12px;margin-top:8px">APPLY &amp; RE-RUN</button>
    `);

    // Timing paths table
    html += this._renderSection('paths', `Timing Paths (${r.paths.length})`, this._renderPathsTable(r));

    // Path detail (if a path is selected)
    if (this._selectedPath >= 0 && this._selectedPath < r.paths.length) {
      const p = r.paths[this._selectedPath];
      const scene = { nodes: this._scene.nodes, wires: this._scene.wires };
      const rows = pathDetail(scene, p.nodeIds);
      html += this._renderSection('detail', `Path Detail: ${p.startLabel} → ${p.endLabel}`, this._renderDetailTable(rows, p));
    }

    // Slack histogram
    html += this._renderSection('histogram', 'Slack Distribution <button class="backend-info-btn" data-action="toggle-section" data-section="hist-info" title="What is Slack?">i</button>', this._renderHistogram(r));

    this._bodyEl.innerHTML = html;
  }

  _renderSection(id, title, bodyHtml) {
    const collapsed = this._collapsedSections.has(id);
    const arrow = collapsed ? '&#9656;' : '&#9662;';
    return `<div class="backend-section${collapsed ? ' collapsed' : ''}">
      <div class="backend-section-header" data-action="toggle-section" data-section="${id}">
        <span class="backend-section-arrow">${arrow}</span> ${title}
      </div>
      <div class="backend-section-body">${bodyHtml}</div>
    </div>`;
  }

  _renderPathsTable(r) {
    if (!r.paths.length) return '<div style="color:#4a8a6a;font-size:9px">No timing paths found</div>';
    // Slack bar scaled to the widest |slack| so the worst paths read at a glance.
    const maxAbs = Math.max(1, ...r.paths.map(p => Math.abs(p.slackPs)));
    const typeColors = { reg2reg: '#90ffc8', in2reg: '#6aaadd', reg2out: '#ccaa66', in2out: '#cc88cc', unknown: '#88aa99' };
    let html = `<table class="backend-paths-table">
      <tr><th>#</th><th>Type</th><th>Start</th><th>End</th><th>Delay</th><th>Req'd</th><th>Slack</th><th>Status</th></tr>`;
    const bkt = this._selectedBucket;
    r.paths.forEach((p, i) => {
      const inBucket = bkt && p.slackPs >= bkt.min && p.slackPs < bkt.max;
      const cls = (i === this._selectedPath ? ' selected' : '') + (inBucket ? ' bucket-hit' : '');
      const rowStyle = inBucket ? ` style="box-shadow: inset 3px 0 0 ${bkt.color}; background:${bkt.color}22"` : '';
      const met = p.status === 'MET';
      const tc = typeColors[p.type] || '#88aa99';
      const pct = Math.round(Math.abs(p.slackPs) / maxAbs * 100);
      const slackBar = `<div class="backend-slack-wrap"><div class="backend-slack-bar ${met ? 'pos' : 'neg'}" style="width:${pct}%"></div></div><span class="backend-slack-v ${met ? '' : 'neg'}">${p.slackPs}</span>`;
      html += `<tr class="${cls}"${rowStyle} data-action="select-path" data-index="${i}">
        <td>${i + 1}</td>
        <td><span class="backend-port-chip" style="color:${tc}">${p.type}</span></td>
        <td title="${p.startId}">${this._truncate(p.startLabel, 10)}</td>
        <td title="${p.endId}">${this._truncate(p.endLabel, 10)}</td>
        <td>${p.arrivalPs}</td>
        <td>${p.requiredPs}</td>
        <td class="backend-slack-cell">${slackBar}</td>
        <td><span class="backend-signoff-badge ${met ? 'pass' : 'fail'}">${p.status}</span></td>
      </tr>`;
    });
    html += '</table>';
    return html;
  }

  _renderDetailTable(rows, path) {
    const met = path.slackPs >= 0;
    // Summary header card
    let html = `<div class="backend-detail-head">
      <div class="backend-detail-route">
        <span class="backend-port-chip" style="color:#6aaadd">${this._escapeAttr(path.startLabel)}</span>
        <span class="backend-detail-arrow">→</span>
        <span class="backend-port-chip" style="color:#ccaa66">${this._escapeAttr(path.endLabel)}</span>
        <span class="backend-port-chip" style="color:#90ffc8;margin-left:4px">${path.type}</span>
      </div>
      <div class="backend-detail-stats">
        <span>Clock <b>${this._clockPeriodPs} ps</b></span>
        <span>Arrival <b>${path.arrivalPs} ps</b></span>
        <span>Slack <b class="${met ? 'status-met' : 'status-violated'}">${path.slackPs} ps</b></span>
      </div>
    </div>`;
    // Per-node table with a cumulative-arrival bar (shows where delay accrues)
    const maxArr = Math.max(1, ...rows.map(r => r.arrivalPs));
    html += `<table class="backend-detail-table backend-sink-table">
      <tr><th>#</th><th>Node</th><th>Type</th><th>Delay (ps)</th><th>Arrival (ps)</th></tr>`;
    rows.forEach((row, i) => {
      const pct = Math.round(row.arrivalPs / maxArr * 100);
      html += `<tr>
        <td style="color:#6a9a7a">${i + 1}</td>
        <td><b>${this._escapeAttr(row.label)}</b></td>
        <td><span class="backend-cell-chip">${this._escapeAttr(String(row.type))}</span></td>
        <td>${row.delayPs ? '+' + row.delayPs : '0'}</td>
        <td><div class="backend-sink-bar"><div class="backend-sink-bar-fill" style="width:${pct}%"></div></div><span class="backend-sink-ps">${row.arrivalPs}</span></td>
      </tr>`;
    });
    html += '</table>';
    return html;
  }

  _renderHistogram(r) {
    if (!r.paths.length) return '';
    const infoOpen = !this._collapsedSections.has('hist-info');
    let html = '';
    if (infoOpen) {
      html += `<div class="backend-info-box">
        <div class="backend-info-formula">Slack = T<sub>required</sub> &minus; T<sub>arrival</sub></div>
        <div class="backend-info-formula-detail">T<sub>required</sub> = Clock Period &minus; t<sub>setup</sub> &nbsp;&nbsp;|&nbsp;&nbsp; T<sub>arrival</sub> = t<sub>clk&rarr;Q</sub> + &Sigma; Gate Delays</div>
        <p>Slack measures how much timing margin a path has. Positive slack means the data arrives before the deadline. Negative slack means a <b>timing violation</b> — the circuit won't work at this clock frequency.</p>
        <table class="backend-info-table">
          <tr><td style="color:#cc3333">&lt; -200 ps</td><td>Severe violation — data arrives far too late, design will fail</td></tr>
          <tr><td style="color:#dd6644">-200..0 ps</td><td>Mild violation — needs optimization or slower clock</td></tr>
          <tr><td style="color:#aaaa44">0..500 ps</td><td>Passing with tight margin — functional but fragile</td></tr>
          <tr><td style="color:#55bb55">500..1k ps</td><td>Comfortable margin — healthy timing</td></tr>
          <tr><td style="color:#33cc77">&gt; 1000 ps</td><td>Large margin — path is short relative to clock period</td></tr>
        </table>
      </div>`;
    }
    const buckets = [
      { label: '< -200',  min: -Infinity, max: -200,     count: 0, firstIdx: -1, color: '#cc3333' },
      { label: '-200..0',  min: -200,      max: 0,        count: 0, firstIdx: -1, color: '#dd6644' },
      { label: '0..500',   min: 0,         max: 500,      count: 0, firstIdx: -1, color: '#aaaa44' },
      { label: '500..1k',  min: 500,       max: 1000,     count: 0, firstIdx: -1, color: '#55bb55' },
      { label: '> 1000',   min: 1000,      max: Infinity, count: 0, firstIdx: -1, color: '#33cc77' },
    ];
    // Paths are sorted by slack ascending, so the first match per bucket is the
    // worst-slack path in that range — the one we jump to on click.
    r.paths.forEach((p, idx) => {
      for (const b of buckets) {
        if (p.slackPs >= b.min && p.slackPs < b.max) {
          b.count++;
          if (b.firstIdx < 0) b.firstIdx = idx;
          break;
        }
      }
    });
    const maxCount = Math.max(1, ...buckets.map(b => b.count));
    const barH = 80;
    html += '<div class="backend-histogram">';
    for (const b of buckets) {
      const h = b.count > 0 ? Math.max(18, Math.round((b.count / maxCount) * barH)) : 6;
      const clickable = b.count > 0;
      const selCls = (this._selectedBucket && this._selectedBucket.min === b.min && this._selectedBucket.max === b.max)
        ? ' bucket-active' : '';
      const attrs = clickable
        ? ` data-action="select-hist-bucket" data-index="${b.firstIdx}" data-min="${b.min}" data-max="${b.max}" data-color="${b.color}" style="cursor:pointer"`
        : '';
      const tip = clickable
        ? `${b.label}: ${b.count} path(s) — click to highlight all of them in the table`
        : `${b.label}: 0 paths`;
      html += `<div class="backend-hist-col${selCls}"${attrs} title="${tip}">`;
      html += `<span class="backend-hist-count" style="color:${b.color}">${b.count}</span>`;
      html += `<div class="backend-hist-bar" style="height:${h}px;background:${b.color}"></div>`;
      html += `<span class="backend-hist-range">${b.label}</span>`;
      html += `</div>`;
    }
    html += '</div>';
    return html;
  }

  _truncate(s, n) {
    return s && s.length > n ? s.slice(0, n - 1) + '…' : (s || '');
  }

  // ── Synthesis tab ────────────────────────────────────────────

  _runSynthesis() {
    if (!this._scene) return;
    const scene = { nodes: this._scene.nodes, wires: this._scene.wires };
    this._lastSynth      = synthesize(scene);
    this._lastSdc        = generateSDC(scene, { customGroups: this._customGroups });
    this._lastGroups     = classifyGroupPaths(scene);
    this._lastCongestion = estimateCongestion(scene, 8);
    this._lastSteps      = synthesisSteps(scene);
    this._lastDef        = generateDEF(scene);
    this._scheduleRender();
  }

  _renderSynthSummary(r) {
    if (!this._summaryEl) return;
    if (!r) { this._summaryEl.innerHTML = ''; return; }
    const sv = (label, value, cls = '') =>
      `<div><span class="backend-summary-label">${label}</span><br><span class="backend-summary-value ${cls}">${value}</span></div>`;
    this._summaryEl.innerHTML = [
      sv('Total Cells',  r.totalCells),
      sv('Comb', r.numCombinational),
      sv('Seq',  r.numSequential),
      sv('Area', `${r.totalAreaUm2} µm²`),
      sv('Logic Levels', r.logicLevels),
    ].join('');
  }

  _renderSynthBody(r) {
    if (!this._bodyEl) return;
    if (!r) {
      this._bodyEl.innerHTML = '<div class="backend-coming-soon"><p>Click <b>RUN SYNTH</b> to map your circuit to standard cells</p></div>';
      return;
    }
    let html = '';
    html += this._renderSection('synth-overview',
      `Synthesis Overview <button class="backend-info-btn" data-action="toggle-section" data-section="synth-info" title="What is synthesis? — text explanation + inputs/outputs flow diagram">i</button>`,
      this._renderSynthOverview(r));
    html += this._renderSection('internal-steps', 'Internal Steps (inside the SYNTHESIS box)', this._renderInternalSteps());
    html += this._renderSection('synth-mode',
      `Synthesis Mode <button class="backend-info-btn" data-action="toggle-section" data-section="mode-info" title="Topological vs Non-Topological comparison">i</button>`,
      this._renderModeSection());
    html += this._renderSection('group-paths',
      `Group Paths (${this._lastGroups?.totalPaths ?? 0} total) <button class="backend-info-btn" data-action="toggle-section" data-section="group-info" title="Show description of each group type">i</button>`,
      this._renderGroupPaths() + this._renderCustomGroupForm());
    html += this._renderSection('cell-breakdown', `Cell Library Breakdown (${Object.keys(r.cellHistogram).length} types)`, this._renderCellTable(r));
    html += this._renderSection('sdc',
      `SDC — Design Constraints (TCL) <button class="backend-info-btn" data-action="toggle-section" data-section="sdc-info" title="Explain Wire Load Model">i</button>`,
      this._renderSdcSection());
    html += this._renderSection('def', 'DEF — Design Exchange Format', this._renderDefSection());
    html += this._renderSection('netlist',
      `Gate-Level Netlist (structural Verilog) <button class="backend-info-btn" data-action="toggle-section" data-section="netlist-info" title="What's in a GL netlist?">i</button>`,
      this._renderNetlist(r));
    if (r.unmappedTypes.length) {
      html += `<div class="backend-warning">⚠ Unmapped types: ${r.unmappedTypes.join(', ')}</div>`;
    }
    this._bodyEl.innerHTML = html;
  }

  // ── Flow diagram (inputs → SYNTHESIS → outputs) ──
  // Now embedded inside the Synthesis Overview info box (Phase 4).
  _renderFlowDiagramContent() {
    const inputs = [
      { label: 'Verilog Sources', have: true,  note: 'RTL (your schematic)' },
      { label: 'STD Cells',       have: true,  note: 'Cell library views' },
      { label: 'Process LEF',     have: false, note: 'Foundry tech file' },
      { label: 'Constraints',     have: false, note: 'User-defined SDC inputs' },
      { label: 'FLP',             have: false, note: 'Floorplan (topological only)' },
    ];
    const outputs = [
      { label: 'GL Netlist', have: true, note: 'Verilog structural' },
      { label: 'SDC',        have: true, note: 'Synopsys Design Constraints' },
      { label: 'DEF View',   have: true,  note: 'Pre-placement design exchange (cells UNPLACED)' },
    ];
    const chip = (c, side) =>
      `<div class="backend-flow-chip ${c.have ? 'have' : 'missing'}" title="${c.note}">
        <span class="backend-flow-mark">${c.have ? '✓' : '○'}</span>
        ${c.label}
      </div>`;
    return `<div class="backend-flow-diagram">
      <div class="backend-flow-col">${inputs.map(c => chip(c, 'in')).join('')}</div>
      <div class="backend-flow-arrow">&#10142;</div>
      <div class="backend-flow-box">SYNTHESIS</div>
      <div class="backend-flow-arrow">&#10142;</div>
      <div class="backend-flow-col">${outputs.map(c => chip(c, 'out')).join('')}</div>
    </div>
    <div class="backend-flow-legend">
      <span><b style="color:#90ffc8">✓</b> generated by this tool</span>
      <span><b style="color:#88ccaa">○</b> not yet supported</span>
    </div>`;
  }

  // ── Mode toggle + congestion preview ──
  _renderModeSection() {
    const isTopo = this._synthMode === 'topological';
    let html = `<div class="backend-mode-pills">
      <button class="backend-mode-pill ${isTopo ? 'active' : ''}" data-action="set-synth-mode" data-mode="topological">Topological</button>
      <button class="backend-mode-pill ${!isTopo ? 'active' : ''}" data-action="set-synth-mode" data-mode="non-topological">Non-Topological</button>
    </div>`;
    if (!this._collapsedSections.has('mode-info')) {
      html += `<table class="backend-info-table" style="margin-top:8px">
        <tr><th></th><th>Topological</th><th>Non-Topological</th></tr>
        <tr><td>Considers FLP</td><td style="color:#90ffc8">Yes</td><td style="color:#ff8888">No</td></tr>
        <tr><td>Path buffering by distance</td><td style="color:#90ffc8">Yes</td><td style="color:#ff8888">No</td></tr>
        <tr><td>Placement congestion estimate</td><td style="color:#90ffc8">Yes</td><td style="color:#ff8888">No</td></tr>
        <tr><td>Route congestion estimate</td><td style="color:#90ffc8">Yes</td><td style="color:#ff8888">No</td></tr>
      </table>`;
    }
    if (isTopo && this._lastCongestion) html += this._renderCongestion(this._lastCongestion);
    else if (!isTopo) html += `<div style="margin-top:8px;font-size:10px;color:#88ccaa;font-style:italic">Non-topological mode skips FLP — no congestion preview available.</div>`;
    return html;
  }

  _renderCongestion(c) {
    if (!c.maxDensity) return '<div style="margin-top:8px;color:#88ccaa;font-size:10px">No physical cells to estimate congestion.</div>';
    let html = `<div class="backend-congestion-title">Placement Congestion Estimate (${c.gridSize}×${c.gridSize} grid)</div>
      <div class="backend-congestion-grid" style="grid-template-columns:repeat(${c.gridSize}, 1fr)">`;
    for (let y = 0; y < c.gridSize; y++) {
      for (let x = 0; x < c.gridSize; x++) {
        const v = c.grid[y][x];
        const t = c.maxDensity > 0 ? v / c.maxDensity : 0;
        // Green → Yellow → Red gradient
        const hue = Math.round(120 - t * 120);
        const sat = v === 0 ? 0 : 60;
        const lum = v === 0 ? 16 : 30 + t * 25;
        html += `<div class="backend-congestion-cell" style="background:hsl(${hue}, ${sat}%, ${lum}%)" title="cell (${x},${y}): ${v} node(s)">${v || ''}</div>`;
      }
    }
    html += `</div>
      <div class="backend-congestion-legend">
        <span style="color:#90ffc8">■ low</span>
        <span style="color:#ffd054">■ medium</span>
        <span style="color:#ff5454">■ high</span>
      </div>`;
    return html;
  }

  // ── Group paths table ──
  _renderGroupPaths() {
    const g = this._lastGroups?.groups;
    if (!g) return '';
    const rows = [
      ['in2reg',  g.in2reg],
      ['reg2reg', g.reg2reg],
      ['reg2out', g.reg2out],
      ['in2out',  g.in2out],
    ];
    const showDesc = !this._collapsedSections.has('group-info');
    let html = '';
    if (showDesc) {
      html += `<div class="info-headline" style="color:#88ccaa;border-color:rgba(58,138,74,0.5);margin-top:4px">
        <div class="info-diagram-grid" style="grid-template-columns:auto 1fr">
          <span class="info-diagram-label" style="text-align:left">in2reg</span>
          <span><span class="info-box muted">PORT</span> <span class="info-arrow">→ comb →</span> <span class="info-box safe">FF</span></span>
          <span class="info-diagram-label" style="text-align:left">reg2reg</span>
          <span><span class="info-box safe">FF</span> <span class="info-arrow">→ comb →</span> <span class="info-box safe">FF</span></span>
          <span class="info-diagram-label" style="text-align:left">reg2out</span>
          <span><span class="info-box safe">FF</span> <span class="info-arrow">→ comb →</span> <span class="info-box muted">PORT</span></span>
          <span class="info-diagram-label" style="text-align:left">in2out</span>
          <span><span class="info-box muted">PORT</span> <span class="info-arrow">→ comb →</span> <span class="info-box muted">PORT</span></span>
        </div>
        <div class="info-caption">Synthesis optimizes each group independently against its own slack target</div>
      </div>`;
    }
    const maxC = Math.max(1, ...rows.map(([, d]) => d.count));
    html += `<table class="backend-group-table backend-sink-table">
      <tr><th>Group</th>${showDesc ? '<th>Description</th>' : ''}<th>Count</th><th>Action</th></tr>`;
    for (const [name, data] of rows) {
      const disabled = data.count === 0;
      const pct = Math.round(data.count / maxC * 100);
      html += `<tr>
        <td><span class="backend-port-chip" style="color:#90ffc8">${name}</span></td>
        ${showDesc ? `<td>${data.desc}</td>` : ''}
        <td><div class="backend-sink-bar"><div class="backend-sink-bar-fill" style="width:${pct}%"></div></div><span class="backend-sink-ps">${data.count}</span></td>
        <td>${disabled ? '—' : `<button class="backend-copy-btn" data-action="select-group" data-group="${name}" style="padding:1px 6px;font-size:8px">HIGHLIGHT</button>`}</td>
      </tr>`;
    }
    html += `</table>`;
    if (showDesc) {
      html += `<div style="margin-top:6px;font-size:9px;color:#88ccaa">Click HIGHLIGHT to color the nodes of that group on the canvas. Synthesis optimizes each group independently against its own slack target.</div>`;
    }
    return html;
  }

  // ── SDC viewer ──
  _renderSdcSection() {
    if (!this._lastSdc) return '';
    const esc = (this._lastSdc.sdc || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let warns = '';
    if (this._lastSdc.warnings?.length) {
      warns = `<div class="backend-sdc-warn">${this._lastSdc.warnings.map(w => `⚠ ${w}`).join('<br>')}</div>`;
    }
    const wireLoadHint = this._collapsedSections.has('sdc-info') ? '' : `<div class="backend-info-chip">
      <span class="backend-info-chip-icon">i</span>
      <span><b>Wire Load Model</b> — statistical pre-placement RC estimate per fanout. Real extracted delays replace it after route.<br><code>set_wire_load_model -name ForQA -library saed90nm_typ</code></span>
    </div>`;
    return `<button class="backend-copy-btn" data-action="copy-sdc" title="Copy SDC to clipboard">COPY</button>
            ${warns}
            <pre class="backend-sdc">${esc}</pre>
            ${wireLoadHint}`;
  }

  _renderSynthOverview(r) {
    const infoOpen = !this._collapsedSections.has('synth-info');
    let html = '';
    if (infoOpen) {
      html += `<div class="backend-info-box">
        <div class="backend-info-formula">Synthesis: RTL &rarr; Gate-Level Netlist</div>
        <div class="backend-info-formula-detail">map(node) &rarr; STD cell &nbsp;|&nbsp; Σ areaUm² &nbsp;|&nbsp; depth = longest combinational chain</div>
        <p><b>Synthesis</b> translates the logical description of a circuit (RTL — what you drew) into a netlist of <b>standard cells</b> from a silicon vendor's library. Each gate becomes a specific cell with a known area, delay, and physical footprint.</p>
        <table class="backend-info-table">
          <tr><td>STD Cell</td><td>Pre-designed building block (e.g. AND2X1 = 2-input AND, drive strength X1)</td></tr>
          <tr><td>Area (µm²)</td><td>Physical silicon area the cell occupies on the die</td></tr>
          <tr><td>Logic Levels</td><td>Longest combinational chain between two flip-flops — affects max clock frequency</td></tr>
          <tr><td>Max Fanout</td><td>Number of cells driven by one output — high fanout slows the path</td></tr>
        </table>
        <div class="backend-info-divider">Inputs &amp; Outputs of the synthesis step</div>
        ${this._renderFlowDiagramContent()}
      </div>`;
    }
    // Composition bar
    const nSpec = r.numSpecial || 0;
    const total = Math.max(1, r.numCombinational + r.numSequential + r.numComplex + nSpec);
    const pComb = (r.numCombinational / total) * 100;
    const pSeq  = (r.numSequential   / total) * 100;
    const pCplx = (r.numComplex      / total) * 100;
    const pSpec = (nSpec             / total) * 100;
    html += `<div class="backend-stats-bar" title="Cell composition">
      <div class="backend-stats-seg comb" style="width:${pComb}%" title="Combinational: ${r.numCombinational}">${r.numCombinational > 0 ? r.numCombinational : ''}</div>
      <div class="backend-stats-seg seq"  style="width:${pSeq}%"  title="Sequential: ${r.numSequential}">${r.numSequential > 0 ? r.numSequential : ''}</div>
      <div class="backend-stats-seg cplx" style="width:${pCplx}%" title="Complex: ${r.numComplex}">${r.numComplex > 0 ? r.numComplex : ''}</div>
      <div class="backend-stats-seg spec" style="width:${pSpec}%" title="Memory/Special: ${nSpec}">${nSpec > 0 ? nSpec : ''}</div>
    </div>
    <div class="backend-stats-legend">
      <span><i class="dot comb"></i> Combinational</span>
      <span><i class="dot seq"></i> Sequential</span>
      <span><i class="dot cplx"></i> Complex</span>
      <span><i class="dot spec"></i> Memory</span>
    </div>`;
    const depthHint = r.logicLevels === 0 && (r.numComplex + r.numSpecial) > 0
      ? '<br><span style="font-size:8px;color:#88ccaa">(0 = no GATE_SLOT chains — all logic is in macros)</span>'
      : '';
    html += `<div class="backend-mini-grid">
      <div><span class="backend-summary-label">Max Fanout</span><br><b>${r.maxFanout}</b></div>
      <div title="Longest combinational chain of basic gates (GATE_SLOT) between sequential elements"><span class="backend-summary-label">Logic Depth</span><br><b>${r.logicLevels}</b>${depthHint}</div>
      <div><span class="backend-summary-label">Total Area</span><br><b>${r.totalAreaUm2} µm²</b></div>
    </div>`;
    return html;
  }

  _renderCellTable(r) {
    const entries = Object.entries(r.cellHistogram).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return '<div style="color:#88ccaa;font-size:10px">No cells to show</div>';
    // Aggregate area per cell type
    const areaByCell = {};
    for (const ci of r.cellInstances) {
      areaByCell[ci.cellName] = (areaByCell[ci.cellName] || 0) + ci.areaUm2;
    }
    // Look up fn from first matching instance
    const fnByCell = {};
    for (const ci of r.cellInstances) {
      if (!fnByCell[ci.cellName]) fnByCell[ci.cellName] = ci.fn;
    }
    const maxA = Math.max(1, ...entries.map(([c]) => areaByCell[c] || 0));
    let html = '<table class="backend-cell-table backend-sink-table"><tr><th>Cell</th><th>Function</th><th>Count</th><th>Unit (µm²)</th><th>Total (µm²)</th></tr>';
    for (const [cell, count] of entries) {
      const a = areaByCell[cell] || 0;
      const unit = (count > 0 ? a / count : 0);
      const pct = Math.round(a / maxA * 100);
      html += `<tr><td><span class="backend-cell-chip">${cell}</span></td><td style="color:#88ccaa">${fnByCell[cell] || ''}</td><td>${count}</td><td>${unit.toFixed(2)}</td><td><div class="backend-sink-bar"><div class="backend-sink-bar-fill" style="width:${pct}%"></div></div><span class="backend-sink-ps">${a.toFixed(2)}</span></td></tr>`;
    }
    html += '</table>';
    return html;
  }

  _renderNetlist(r) {
    const escaped = (r.netlist || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const hint = this._collapsedSections.has('netlist-info') ? '' : `<div class="backend-info-chip">
      <span class="backend-info-chip-icon">i</span>
      <span><b>GL netlists</b> contain only standard-cell instances + <code>assign</code> statements. No <code>always</code>, <code>if</code>, or <code>case</code> — those live only in RTL.<br><code>AND2X1 U1 (.A(a), .B(b), .Y(n1));</code></span>
    </div>`;
    return `${hint}<button class="backend-copy-btn" data-action="copy-netlist" title="Copy netlist to clipboard">COPY</button>
            <pre class="backend-netlist">${escaped}</pre>`;
  }

  // ── Phase 3: Internal Steps timeline ──
  _renderInternalSteps() {
    if (!this._lastSteps) return '';
    let html = `<div class="backend-steps-timeline">`;
    this._lastSteps.forEach((step, i) => {
      const statusCls = step.status === 'warn' ? 'warn' : (step.status === 'error' ? 'error' : 'done');
      const metrics = Object.entries(step.metrics).map(([k, v]) =>
        `<div class="backend-step-metric"><span>${k}</span><b>${v}</b></div>`
      ).join('');
      html += `<div class="backend-step-box ${statusCls}" title="${step.desc}">
        <div class="backend-step-name">${i + 1}. ${step.name}</div>
        <div class="backend-step-desc">${step.desc}</div>
        <div class="backend-step-metrics">${metrics}</div>
      </div>`;
      if (i < this._lastSteps.length - 1) html += `<div class="backend-step-arrow">&#10142;</div>`;
    });
    html += `</div>`;
    html += `<div style="font-size:9px;color:#88ccaa;margin-top:6px">
      These are the algorithmic phases inside <b>compile_ultra</b> (Synopsys DC) or <b>genus</b> (Cadence). Metrics are estimated from your scene.
    </div>`;
    return html;
  }

  // ── Phase 3: Custom Group Paths form ──
  _renderCustomGroupForm() {
    const drafts = this._cgDraft;
    let html = `<div class="backend-custom-group-section">
      <div class="backend-custom-group-title">Custom Group Paths
        <span style="color:#88ccaa;font-weight:normal">— focus optimization with <code>set_group_path -from … -to …</code></span>
      </div>
      <div class="backend-custom-group-form">
        <input type="text" data-cg-field="name" placeholder="group name" value="${this._escapeAttr(drafts.name)}" />
        <input type="text" data-cg-field="from" placeholder="-from (node id)" value="${this._escapeAttr(drafts.from)}" />
        <input type="text" data-cg-field="to"   placeholder="-to (node id)"   value="${this._escapeAttr(drafts.to)}" />
        <button class="backend-copy-btn" data-action="cg-add">+ ADD</button>
      </div>`;
    if (this._customGroups.length) {
      html += `<div class="backend-custom-group-list">`;
      this._customGroups.forEach((g, i) => {
        html += `<div class="backend-custom-group-item">
          <b>${g.name || '(unnamed)'}</b>
          <span class="backend-cg-tag">-from ${g.from || '?'}</span>
          <span class="backend-cg-tag">-to ${g.to || '?'}</span>
          <button class="backend-cg-remove" data-action="cg-remove" data-idx="${i}" title="Remove">×</button>
        </div>`;
      });
      html += `</div>`;
    } else {
      html += `<div style="font-size:9px;color:#88ccaa;margin-top:4px;font-style:italic">No custom groups defined. Add one above to emit a <code>set_group_path</code> line in the SDC.</div>`;
    }
    html += `</div>`;
    return html;
  }

  // ── Phase 3: DEF viewer ──
  _renderDefSection() {
    if (!this._lastDef) return '';
    const esc = (this._lastDef.def || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const note = `<div class="backend-info-chip">
      <span class="backend-info-chip-icon">i</span>
      <span>DEF written by synthesis lists cells as <code>+ UNPLACED</code>. Real placement coordinates are filled by the next tool (Innovus / ICC). Full DEF visualization will live in the Floorplan / Placement tabs.</span>
    </div>`;
    let warns = '';
    if (this._lastDef.warnings?.length) {
      warns = `<div class="backend-sdc-warn">${this._lastDef.warnings.map(w => `⚠ ${w}`).join('<br>')}</div>`;
    }
    return `${note}<button class="backend-copy-btn" data-action="copy-def" title="Copy DEF to clipboard">COPY</button>
            ${warns}
            <pre class="backend-def">${esc}</pre>`;
  }

  _escapeAttr(s) {
    return String(s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  _readCgDraftFromDom() {
    if (!this._bodyEl) return;
    for (const f of ['name', 'from', 'to']) {
      const el = this._bodyEl.querySelector(`[data-cg-field="${f}"]`);
      if (el) this._cgDraft[f] = el.value;
    }
  }

  // ── Run all tabs at once ─────────────────────────────────────

  /** Compute every backend stage in one shot, then render the active tab. */
  _runAll() {
    this._runSta();
    this._runSynthesis();
    this._recomputeFloorplan();
    this._recomputePlacement();   // consumes the fresh floorplan
    this._lastSignoff = this._aggregateSignoff();   // consumes all of the above
    // _runSta highlights the worst path on the canvas — only keep it on the STA tab.
    if (this._activeTab !== 'sta') setStaCriticalPath(null);
    this._scheduleRender();
  }

  // ── Floorplan tab ────────────────────────────────────────────

  _runFloorplan() {
    this._recomputeFloorplan();
    this._scheduleRender();
  }

  /** Recompute the floorplan model into this._lastFloorplan (no re-render). */
  _recomputeFloorplan() {
    if (!this._scene) return;
    const scene = { nodes: this._scene.nodes, wires: this._scene.wires };
    this._lastFloorplan = computeFloorplan(scene, {
      utilization: this._fpUtilization,
      aspectRatio: this._fpAspect,
      portEdges:   this._fpPortEdges,
    });
  }

  /** Surgical update for the live utilization slider — keeps the slider focused. */
  _updateFloorplanLive() {
    this._recomputeFloorplan();
    const m = this._lastFloorplan;
    if (!m) return;
    const viz = this._bodyEl?.querySelector('#fp-viz');
    if (viz) viz.innerHTML = this._buildDieSvg(m);
    const met = this._bodyEl?.querySelector('#fp-metrics');
    if (met) met.innerHTML = this._buildMetricsTable(m);
    const ro = this._bodyEl?.querySelector('#fp-util-readout');
    if (ro) ro.textContent = `${Math.round(m.utilization * 100)}%`;
    this._renderFloorplanSummary(m);
  }

  _renderFloorplanSummary(m) {
    if (!this._summaryEl) return;
    if (!m) { this._summaryEl.innerHTML = ''; return; }
    const sv = (label, value, cls = '') =>
      `<div><span class="backend-summary-label">${label}</span><br><span class="backend-summary-value ${cls}">${value}</span></div>`;
    this._summaryEl.innerHTML = [
      sv('Die Area', `${m.dieAreaUm2} µm²`),
      sv('Die W×H', `${m.dieW}×${m.dieH}`),
      sv('Utilization', `${Math.round(m.utilization * 100)}%`),
      sv('Macros', m.macroCount),
      sv('Ports', m.portCount),
    ].join('');
  }

  _renderFloorplanBody(m) {
    if (!this._bodyEl) return;
    if (!m) {
      this._bodyEl.innerHTML = '<div class="backend-coming-soon"><p>Click <b>RUN FLOORPLAN</b> to plan the die from your circuit</p></div>';
      return;
    }
    if (m.warnings?.includes('Empty design — nothing to floorplan')) {
      this._bodyEl.innerHTML = '<div class="backend-coming-soon"><p>No physical cells to floorplan.</p><p style="font-size:9px;color:#88ccaa;margin-top:8px">Add gates, flip-flops, or memories to the canvas, then run synthesis / floorplan.</p></div>';
      return;
    }

    let html = '';
    html += this._renderSection('fp-controls', `Floorplan Controls ${this._fpInfoBtn('fp-controls-info')}`, this._buildFloorplanControls(m));
    html += this._renderSection('fp-die',
      `Die Plan ${this._fpInfoBtn('floorplan-info')}`,
      this._buildDieSection(m));
    html += this._renderSection('fp-metrics-sec', `Floorplan Metrics ${this._fpInfoBtn('fp-metrics-info')}`,
      this._fpInfoBox('fp-metrics-info', this._fpMetricsInfo()) + `<div id="fp-metrics">${this._buildMetricsTable(m)}</div>`);
    html += this._renderSection('fp-ports', `Port Assignment (${m.portCount}) ${this._fpInfoBtn('fp-ports-info')}`,
      this._fpInfoBox('fp-ports-info', this._fpPortsInfo()) + this._buildPortList(m));
    html += this._renderSection('fp-macros', `Macros (${m.macroCount}) ${this._fpInfoBtn('fp-macros-info')}`,
      this._fpInfoBox('fp-macros-info', this._fpMacrosInfo()) + this._buildMacroList(m));
    this._bodyEl.innerHTML = html;
  }

  _buildFloorplanControls(m) {
    const aspects = [
      { label: '1:1',  v: 1.0   },
      { label: '4:3',  v: 1.333 },
      { label: '16:9', v: 1.777 },
      { label: '2:1',  v: 2.0   },
    ];
    const pills = aspects.map(a =>
      `<button class="backend-mode-pill ${Math.abs(this._fpAspect - a.v) < 0.01 ? 'active' : ''}" data-action="fp-aspect" data-aspect="${a.v}">${a.label}</button>`
    ).join('');
    const congLabel = this._fpShowCongestion ? 'Congestion: ON' : 'Congestion: OFF';
    return this._fpInfoBox('fp-controls-info', this._fpControlsInfo()) + `
      <div class="backend-fp-slider-row">
        <label>Utilization</label>
        <input type="range" min="30" max="95" step="1" data-fp-field="utilization" value="${Math.round(m.utilization * 100)}" />
        <span id="fp-util-readout">${Math.round(m.utilization * 100)}%</span>
      </div>
      <div class="backend-fp-slider-row" style="margin-top:6px">
        <label>Aspect Ratio</label>
        <div class="backend-mode-pills" style="margin:0">${pills}</div>
      </div>
      <div class="backend-fp-slider-row" style="margin-top:6px">
        <label>Overlays</label>
        <div class="backend-mode-pills" style="margin:0">
          <button class="backend-mode-pill ${this._fpShowCongestion ? 'active' : ''}" data-action="fp-toggle-congestion">${congLabel}</button>
          <button class="backend-mode-pill ${this._fpShowPower ? 'active' : ''}" data-action="fp-toggle-power">${this._fpShowPower ? 'Power: ON' : 'Power: OFF'}</button>
          <button class="backend-mode-pill ${this._fpShowTracks ? 'active' : ''}" data-action="fp-toggle-tracks">${this._fpShowTracks ? 'Tracks: ON' : 'Tracks: OFF'}</button>
        </div>
      </div>`;
  }

  _buildDieSection(m) {
    let info = '';
    if (!this._collapsedSections.has('floorplan-info')) {
      info = `<div class="backend-info-box">
        <div class="backend-info-formula">Core Area = Cell Area / Utilization</div>
        <div class="backend-info-formula-detail">Die = Core + I/O ring &nbsp;|&nbsp; W×H from aspect ratio &nbsp;|&nbsp; macro footprint = &radic;area</div>
        <p><b>Floorplanning</b> fixes the chip's shape before placement: how big the silicon die is, how much of the core is filled with logic (<b>utilization</b>), where large <b>macros</b> (memories, register files) sit, and which die edge each I/O <b>port</b> exits from.</p>
        <table class="backend-info-table">
          <tr><td>Utilization</td><td>Cell area ÷ core area. Lower = more empty space for routing (easier timing, bigger die)</td></tr>
          <tr><td>Core</td><td>Inner region holding standard-cell rows; surrounded by an I/O ring</td></tr>
          <tr><td>Macro</td><td>Pre-built hard block (SRAM, ROM, reg file) placed by hand, not in rows</td></tr>
          <tr><td>Aspect Ratio</td><td>Die width ÷ height — affects port reachability and routing</td></tr>
          <tr><td>Power Rings/Straps</td><td>VDD/VSS rings around the core + a strap mesh that delivers current to every cell</td></tr>
        </table>
      </div>`;
    }
    const legend = `<div class="backend-fp-legend">
      <span><i style="background:${PORT_COLORS.INPUT}"></i> Input</span>
      <span><i style="background:${PORT_COLORS.OUTPUT}"></i> Output</span>
      <span><i style="background:${PORT_COLORS.CLOCK}"></i> Clock</span>
      <span><i style="background:#aa44aa"></i> Macro</span>
      ${this._fpShowTracks ? '<span><i style="background:#5aa0c0"></i> Tracks</span>' : ''}
      ${this._fpShowPower ? '<span><i style="background:#e0803a"></i> VDD</span><span><i style="background:#5a9ad0"></i> VSS</span>' : ''}
      ${this._fpShowCongestion ? '<span><i style="background:#ffd054"></i> Congestion</span>' : ''}
    </div>`;
    return `${info}<div class="backend-fp-viz" id="fp-viz">${this._buildDieSvg(m)}</div>${legend}`;
  }

  /**
   * Shared responsive die-base SVG used by both the Floorplan and Placement tabs:
   * geometry, defs (prefixed ids), die body, core, and the clipped substrate
   * (zebra rows + optional tracks + optional heatmap + caller-supplied content).
   * Stops at the clip close — callers append their own overlays then `</svg>`.
   * Returns the partial SVG plus geometry, label-position helpers, and a `macros()` builder.
   */
  _dieBaseSvg(m, opts = {}) {
    const {
      prefix       = 'fp',
      glow         = false,
      zebraOpacity = 0.05,
      tracks       = null,   // { color, widthMul, opacity } or null
      heatmap      = null,   // { grid, n, max, opacity } or null
      extraClipped = '',     // string injected inside the clip after the heatmap
    } = opts;
    const W = m.dieW, H = m.dieH, c = m.core, max = Math.max(W, H);
    const pad = max * 0.06, vbW = W + 2 * pad, vbH = H + 2 * pad;
    const sw = max * 0.0035, rDie = max * 0.02, rCore = max * 0.012, hs = max * 0.03;
    const id = s => prefix + s;

    let svg = `<svg viewBox="${_n(-pad)} ${_n(-pad)} ${_n(vbW)} ${_n(vbH)}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<defs>
      <linearGradient id="${id('Die')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e2016"/><stop offset="1" stop-color="#060d09"/></linearGradient>
      <linearGradient id="${id('Core')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#173620"/><stop offset="1" stop-color="#0d2215"/></linearGradient>
      <linearGradient id="${id('Macro')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(190,90,190,0.45)"/><stop offset="1" stop-color="rgba(120,40,120,0.4)"/></linearGradient>
      <pattern id="${id('Hatch')}" width="${_n(hs)}" height="${_n(hs)}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="${_n(hs)}" stroke="#d870d8" stroke-width="${_n(sw * 0.7)}" stroke-opacity="0.45"/></pattern>
      <filter id="${id('Shadow')}" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="${_n(sw * 1.2)}" stdDeviation="${_n(sw * 1.6)}" flood-color="#000" flood-opacity="0.55"/></filter>
      ${glow ? `<filter id="${id('Glow')}" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="${_n(sw * 1.4)}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` : ''}
      <clipPath id="${id('CoreClip')}"><rect x="${_n(c.x)}" y="${_n(c.y)}" width="${_n(c.w)}" height="${_n(c.h)}" rx="${_n(rCore)}"/></clipPath>
    </defs>`;

    // die body + inner frame line
    svg += `<rect x="0" y="0" width="${_n(W)}" height="${_n(H)}" rx="${_n(rDie)}" fill="url(#${id('Die')})" stroke="#50cc70" stroke-width="${_n(sw * 1.6)}" filter="url(#${id('Shadow')})"/>`;
    svg += `<rect x="${_n(sw * 1.5)}" y="${_n(sw * 1.5)}" width="${_n(W - sw * 3)}" height="${_n(H - sw * 3)}" rx="${_n(rDie)}" fill="none" stroke="#2a6a3a" stroke-width="${_n(sw * 0.6)}" stroke-opacity="0.6"/>`;
    // core
    svg += `<rect x="${_n(c.x)}" y="${_n(c.y)}" width="${_n(c.w)}" height="${_n(c.h)}" rx="${_n(rCore)}" fill="url(#${id('Core')})" stroke="#3a8a4a" stroke-width="${_n(sw)}" stroke-dasharray="${_n(sw * 3)} ${_n(sw * 2)}"/>`;

    // clipped substrate: zebra rows → tracks → heatmap → caller extras
    svg += `<g clip-path="url(#${id('CoreClip')})">`;
    const shown = Math.min(m.rows.count, 60), bandH = c.h / shown;
    for (let i = 0; i < shown; i += 2) {
      svg += `<rect x="${_n(c.x)}" y="${_n(c.y + i * bandH)}" width="${_n(c.w)}" height="${_n(bandH)}" fill="#50cc70" fill-opacity="${zebraOpacity}"/>`;
    }
    if (tracks) {
      const pitch = Math.max(m.rows.height, max / 100);
      const nV = Math.min(100, Math.floor(c.w / pitch)), nH = Math.min(100, Math.floor(c.h / pitch));
      const tw = sw * tracks.widthMul;
      for (let i = 1; i < nV; i++) { const tx = c.x + i / nV * c.w; svg += `<line x1="${_n(tx)}" y1="${_n(c.y)}" x2="${_n(tx)}" y2="${_n(c.y + c.h)}" stroke="${tracks.color}" stroke-width="${_n(tw)}" stroke-opacity="${tracks.opacity}"/>`; }
      for (let j = 1; j < nH; j++) { const ty = c.y + j / nH * c.h; svg += `<line x1="${_n(c.x)}" y1="${_n(ty)}" x2="${_n(c.x + c.w)}" y2="${_n(ty)}" stroke="${tracks.color}" stroke-width="${_n(tw)}" stroke-opacity="${tracks.opacity}"/>`; }
    }
    if (heatmap && heatmap.max) {
      const n = heatmap.n, cw = c.w / n, ch = c.h / n;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const v = heatmap.grid[y][x]; if (!v) continue;
        const t = v / heatmap.max, hue = Math.round(120 - t * 120), lum = 30 + t * 25;
        svg += `<rect x="${_n(c.x + x * cw)}" y="${_n(c.y + y * ch)}" width="${_n(cw)}" height="${_n(ch)}" fill="hsl(${hue}, 60%, ${lum}%)" fill-opacity="${heatmap.opacity}"/>`;
      }
    }
    svg += extraClipped;
    svg += `</g>`;

    const geom = { W, H, c, max, pad, vbW, vbH, sw, rDie, rCore, hs };
    const fx = x => ((x + pad) / vbW * 100).toFixed(2);
    const fy = y => ((y + pad) / vbH * 100).toFixed(2);
    // Macro boxes (gradient + hatch + shadow, optional top highlight line).
    const macros = ({ strokeMul = 1.2, highlight = true } = {}) => {
      let s = '';
      for (const mac of m.macros) {
        const ms = mac.side, mx = mac.x - ms / 2, my = mac.y - ms / 2;
        s += `<g filter="url(#${id('Shadow')})"><rect x="${_n(mx)}" y="${_n(my)}" width="${_n(ms)}" height="${_n(ms)}" rx="${_n(sw)}" fill="url(#${id('Macro')})" stroke="#d870d8" stroke-width="${_n(sw * strokeMul)}"/><rect x="${_n(mx)}" y="${_n(my)}" width="${_n(ms)}" height="${_n(ms)}" rx="${_n(sw)}" fill="url(#${id('Hatch')})"/>${highlight ? `<line x1="${_n(mx + sw)}" y1="${_n(my + sw * 1.5)}" x2="${_n(mx + ms - sw)}" y2="${_n(my + sw * 1.5)}" stroke="#ffb0ff" stroke-width="${_n(sw * 0.6)}" stroke-opacity="0.5"/>` : ''}</g>`;
      }
      return s;
    };
    const macroLabels = () => {
      let s = '';
      for (const mac of m.macros) {
        const fit = Math.max(2, Math.round(mac.side / (max * 0.028)));
        s += `<div class="backend-fp-label macro" style="left:${fx(mac.x)}%;top:${fy(mac.y)}%;max-width:${(mac.side / vbW * 100).toFixed(2)}%">${this._escapeAttr(this._truncate(mac.label, fit))}</div>`;
      }
      return s;
    };
    return { svg, geom, fx, fy, id, macros, macroLabels };
  }

  /** Build the responsive SVG die plan + absolutely-positioned HTML labels. */
  _buildDieSvg(m) {
    if (!m.dieW || !m.dieH) return '<div style="color:#88ccaa;font-size:9px">No die to draw</div>';
    const base = this._dieBaseSvg(m, {
      prefix: 'fp',
      tracks: this._fpShowTracks ? { color: '#7ac0e0', widthMul: 0.5, opacity: 0.38 } : null,
      heatmap: (this._fpShowCongestion && m.congestion?.maxDensity)
        ? { grid: m.congestion.grid, n: m.congestion.gridSize, max: m.congestion.maxDensity, opacity: 0.5 } : null,
    });
    const { W, H, c, max, sw, rDie } = base.geom;
    const rCore = base.geom.rCore;
    let svg = base.svg;

    // ── power planning: rings around the core + strap mesh across it ──
    if (this._fpShowPower) {
      const VDD = '#e0803a', VSS = '#5a9ad0';
      const margin = Math.min(c.x, c.y);
      const rt = Math.min(max * 0.007, margin * 0.22);    // ring thickness (slim)
      const g1 = rt * 1.4, g2 = rt * 3.0;                 // ring offsets outside core
      const ring = (off, col) =>
        `<rect x="${_n(c.x - off)}" y="${_n(c.y - off)}" width="${_n(c.w + 2 * off)}" height="${_n(c.h + 2 * off)}" rx="${_n(rCore)}" fill="none" stroke="${col}" stroke-width="${_n(rt)}" stroke-opacity="0.6"/>`;
      svg += ring(g2, VDD) + ring(g1, VSS);
      // strap mesh (clipped to core) — sparse & faint so it reads as a grid, not a fill
      const strapW = rt * 0.4;
      const nV = Math.max(2, Math.min(5, Math.round(c.w / (max * 0.28))));
      const nH = Math.max(2, Math.min(5, Math.round(c.h / (max * 0.28))));
      svg += `<g clip-path="url(#fpCoreClip)" stroke-opacity="0.28" stroke-width="${_n(strapW)}">`;
      for (let i = 0; i < nV; i++) {
        const x = c.x + ((i + 0.5) / nV) * c.w;
        svg += `<line x1="${_n(x)}" y1="${_n(c.y)}" x2="${_n(x)}" y2="${_n(c.y + c.h)}" stroke="${i % 2 ? VSS : VDD}"/>`;
      }
      for (let j = 0; j < nH; j++) {
        const y = c.y + ((j + 0.5) / nH) * c.h;
        svg += `<line x1="${_n(c.x)}" y1="${_n(y)}" x2="${_n(c.x + c.w)}" y2="${_n(y)}" stroke="${j % 2 ? VDD : VSS}"/>`;
      }
      svg += `</g>`;
    }

    // ── corner brackets (EDA frame accent) ──
    const bl = max * 0.05, bi = rDie + sw;
    const bracket = (x, y, dx, dy) =>
      `<path d="M ${_n(x + dx * bl)} ${_n(y)} L ${_n(x)} ${_n(y)} L ${_n(x)} ${_n(y + dy * bl)}" fill="none" stroke="#90ffc8" stroke-width="${_n(sw * 1.1)}" stroke-linecap="round" stroke-opacity="0.8"/>`;
    svg += bracket(bi, bi, 1, 1) + bracket(W - bi, bi, -1, 1) + bracket(bi, H - bi, 1, -1) + bracket(W - bi, H - bi, -1, -1);
    // pin-1 marker (top-left, in the I/O ring)
    svg += `<circle cx="${_n(c.x * 0.5)}" cy="${_n(c.y * 0.5)}" r="${_n(max * 0.012)}" fill="#90ffc8" fill-opacity="0.9"/>`;

    // ── macros (shared builder: hatch + gradient + shadow + top highlight) ──
    svg += base.macros({ strokeMul: 1.2, highlight: true });

    // ── ports: edge pads + inward pin stubs ──
    const padDepth = max * 0.028, padLen = max * 0.05, stub = max * 0.03;
    for (const p of m.ports) {
      const col = PORT_COLORS[p.type] || '#88ccaa';
      let rx, ry, rw, rh, sx1, sy1, sx2, sy2;
      if (p.edge === 'N')      { rx = p.ex - padLen / 2; ry = -padDepth / 2; rw = padLen; rh = padDepth; sx1 = p.ex; sy1 = padDepth / 2; sx2 = p.ex; sy2 = padDepth / 2 + stub; }
      else if (p.edge === 'S') { rx = p.ex - padLen / 2; ry = H - padDepth / 2; rw = padLen; rh = padDepth; sx1 = p.ex; sy1 = H - padDepth / 2; sx2 = p.ex; sy2 = H - padDepth / 2 - stub; }
      else if (p.edge === 'W') { rx = -padDepth / 2; ry = p.ey - padLen / 2; rw = padDepth; rh = padLen; sx1 = padDepth / 2; sy1 = p.ey; sx2 = padDepth / 2 + stub; sy2 = p.ey; }
      else                     { rx = W - padDepth / 2; ry = p.ey - padLen / 2; rw = padDepth; rh = padLen; sx1 = W - padDepth / 2; sy1 = p.ey; sx2 = W - padDepth / 2 - stub; sy2 = p.ey; }
      svg += `<line x1="${_n(sx1)}" y1="${_n(sy1)}" x2="${_n(sx2)}" y2="${_n(sy2)}" stroke="${col}" stroke-width="${_n(sw * 1.2)}" stroke-opacity="0.8"/>`;
      svg += `<circle cx="${_n(sx2)}" cy="${_n(sy2)}" r="${_n(sw * 1.3)}" fill="${col}"/>`;
      svg += `<rect x="${_n(rx)}" y="${_n(ry)}" width="${_n(rw)}" height="${_n(rh)}" rx="${_n(sw * 0.8)}" fill="${col}" stroke="#06100a" stroke-width="${_n(sw * 0.6)}" filter="url(#fpShadow)"/>`;
    }
    svg += `</svg>`;

    // HTML labels (avoid SVG <text> / the {16..32} font-size standard).
    // Positions are % of the full viewBox (incl. padding) so they track the SVG.
    const fx = base.fx, fy = base.fy;
    let labels = base.macroLabels();
    for (const p of m.ports) {
      // nudge the label inward from the edge so it sits inside the die
      const inset = padDepth + stub + max * 0.02;
      let lx = p.ex, ly = p.ey;
      if (p.edge === 'N') ly = inset;
      else if (p.edge === 'S') ly = H - inset;
      else if (p.edge === 'W') lx = inset + max * 0.03;
      else lx = W - inset - max * 0.03;
      labels += `<div class="backend-fp-label port" style="left:${fx(lx)}%;top:${fy(ly)}%;color:${PORT_COLORS[p.type] || '#88ccaa'}">${this._escapeAttr(this._truncate(p.label, 8))}</div>`;
    }
    return svg + labels;
  }

  _buildMetricsTable(m) {
    const card = (label, value, unit = '') =>
      `<div class="backend-cts-card">
        <div class="backend-cts-k">${label}</div>
        <div class="backend-cts-v">${value}${unit ? ` <small>${unit}</small>` : ''}</div>
      </div>`;
    // Headline cards for the numbers people scan first.
    let html = `<div class="backend-cts-grid">
      ${card('Die Area', m.dieAreaUm2, 'µm²')}
      ${card('Die W × H', `${m.dieW}×${m.dieH}`, 'µm')}
      ${card('Utilization', Math.round(m.actualUtilization * 100), '%')}
      ${card('Aspect', m.aspectRatio)}
    </div>`;
    // utilization fill bar (cell area inside the core)
    const u = Math.min(100, Math.round(m.actualUtilization * 100));
    html += `<div class="backend-power-bar" style="margin-top:10px" title="Cell area fills ${u}% of the core">
      <div class="seg dyn" style="width:${u}%">${u >= 12 ? `Cells ${u}%` : ''}</div>
      <div class="seg leak" style="width:${100 - u}%;background:#2a4a36;color:#88ccaa">${100 - u >= 12 ? 'Free' : ''}</div>
    </div>`;
    // remaining detail in a compact table
    const row = (k, v) => `<tr><td>${k}</td><td><b>${v}</b></td></tr>`;
    html += `<table class="backend-cell-table" style="margin-top:10px">
      ${row('Core Area', `${m.coreAreaUm2} µm²`)}
      ${row('Cell Area', `${m.totalCellAreaUm2} µm² <span style="color:#88ccaa">(macro ${m.macroAreaUm2} / std ${m.stdAreaUm2})</span>`)}
      ${row('Target Utilization', `${Math.round(m.utilization * 100)}%`)}
      ${row('Std-Cell Rows', `${m.rows.count} × ${m.rows.height} µm`)}
      ${row('Std Cells / Macros', `${m.stdCellCount} / ${m.macroCount}`)}
      ${row('Ports', m.portCount)}
    </table>`;
    return html;
  }

  _buildPortList(m) {
    if (!m.ports.length) return '<div style="color:#88ccaa;font-size:9px">No primary ports (INPUT/OUTPUT/CLOCK) in this design</div>';
    const edgeName = { N: 'North', E: 'East', S: 'South', W: 'West' };
    let html = `<table class="backend-group-table backend-port-table">
      <tr><th>Port</th><th>Type</th><th>Edge</th><th>Action</th></tr>`;
    for (const p of m.ports) {
      const col = PORT_COLORS[p.type] || '#88ccaa';
      html += `<tr>
        <td><b>${this._escapeAttr(this._truncate(p.label, 12))}</b></td>
        <td><span class="backend-port-chip" style="color:${col}">${p.type}</span></td>
        <td><span class="backend-edge-pin">${p.edge}</span> ${edgeName[p.edge]}</td>
        <td>${this._edgePicker(p.nodeId, p.edge)}</td>
      </tr>`;
    }
    html += `</table>
      <div style="margin-top:6px;font-size:9px;color:#88ccaa">Click an edge (N/E/S/W) to move a port directly around the die.</div>`;
    return html;
  }

  /** 4-button N/E/S/W picker with the active edge highlighted (one click to move). */
  _edgePicker(nodeId, active) {
    const id = this._escapeAttr(nodeId);
    return `<div class="backend-edge-picker">${['N', 'E', 'S', 'W'].map(e =>
      `<button class="backend-edge-btn${e === active ? ' active' : ''}" data-action="fp-set-port" data-node-id="${id}" data-edge="${e}" title="Move to ${e}">${e}</button>`
    ).join('')}</div>`;
  }

  _buildMacroList(m) {
    if (!m.macros.length) return '<div style="color:#88ccaa;font-size:9px">No macros (memories / register files) in this design</div>';
    const sorted = [...m.macros].sort((a, b) => b.areaUm2 - a.areaUm2);
    const maxA = Math.max(1, ...sorted.map(x => x.areaUm2));
    let html = `<table class="backend-group-table backend-sink-table">
      <tr><th>Macro</th><th>Cell</th><th>Area (µm²)</th><th>Side</th><th>Action</th></tr>`;
    for (const mac of sorted) {
      const pct = Math.round(mac.areaUm2 / maxA * 100);
      html += `<tr>
        <td><b>${this._escapeAttr(this._truncate(mac.label, 12))}</b></td>
        <td><span class="backend-cell-chip">${mac.cellName}</span></td>
        <td>
          <div class="backend-sink-bar"><div class="backend-sink-bar-fill macro" style="width:${pct}%"></div></div>
          <span class="backend-sink-ps">${mac.areaUm2}</span>
        </td>
        <td style="color:#88ccaa">${mac.side} µm</td>
        <td><button class="backend-copy-btn" data-action="fp-highlight-macro" data-node-id="${this._escapeAttr(mac.nodeId)}" style="padding:1px 6px;font-size:8px">HIGHLIGHT</button></td>
      </tr>`;
    }
    html += '</table>';
    return html;
  }

  // Floorplan info-button + collapsible info-box helpers (grounded in the course material).
  _fpInfoBtn(section) {
    return `<button class="backend-info-btn" data-action="toggle-section" data-section="${section}" title="Explain this section">i</button>`;
  }
  _fpInfoBox(section, html) {
    return this._collapsedSections.has(section) ? '' : `<div class="backend-info-box">${html}</div>`;
  }

  _fpControlsInfo() {
    return `<div class="backend-info-formula">Core Area = &Sigma; Cell Area / Utilization</div>
      <div class="backend-info-formula-detail">lower utilization &rarr; larger core &rarr; shorter routes &amp; easier timing, but a bigger (costlier) die</div>
      <p>Floorplanning (<b>FLP</b>) trades silicon area against routability and timing. These controls set the chip's shape and density <i>before</i> placement &amp; routing.</p>
      <table class="backend-info-table">
        <tr><td>Utilization</td><td>How densely the core is filled. Typical 60–80%; too high &rarr; congestion, too low &rarr; wasted silicon</td></tr>
        <tr><td>Aspect Ratio</td><td>Die width ÷ height. 1:1 is balanced; a non-square die can ease specific pin/bus access</td></tr>
        <tr><td>Congestion</td><td>Placement/route hot-spots predicted by <b>topological</b> synthesis (the run that consumes the FLP)</td></tr>
        <tr><td>Power</td><td>VDD/VSS rings + a strap mesh that carries current from the I/O ring to every cell</td></tr>
      </table>`;
  }

  _fpMetricsInfo() {
    return `<div class="backend-info-formula">Die Area = Core / (1 &minus; 2&middot;margin)&sup2;</div>
      <div class="backend-info-formula-detail">core holds the standard-cell rows; the surrounding I/O ring carries pads &amp; power</div>
      <p>These numbers are derived from the synthesized cell area. The die is what you pay for in silicon, so utilization and the macro fraction drive cost directly.</p>
      <table class="backend-info-table">
        <tr><td>Core Area</td><td>Σ cell area ÷ utilization — the region that holds logic</td></tr>
        <tr><td>Die Area</td><td>Core plus the I/O ring around it</td></tr>
        <tr><td>Std-Cell Rows</td><td>Core height ÷ row pitch; synthesized gates legalize into these rows</td></tr>
        <tr><td>Tracks</td><td>Fixed routing grid on the metal layers; wires &amp; power straps run along it (a DEF view holds both <i>rows and tracks</i>)</td></tr>
        <tr><td>Macro / Std split</td><td>Macros are placed by hand; standard cells fill the rows between them</td></tr>
      </table>`;
  }

  _fpPortsInfo() {
    return `<div class="backend-info-formula">Ports = chip I/O pins on the die edge</div>
      <div class="backend-info-formula-detail">each primary INPUT / OUTPUT / CLOCK exits through a pad on one of the four edges (N/E/S/W)</div>
      <p>Where a port sits sets the length of its <b>paths to/from ports</b> and any <b>feedthrough</b> (in2out) crossing the die — exactly the paths that topological synthesis buffers by distance. Grouping a bus on one edge shortens its routing.</p>
      <table class="backend-info-table">
        <tr><td>Edge (N/E/S/W)</td><td>Which side the pin exits — click a port's button to cycle it</td></tr>
        <tr><td>in2reg / reg2out</td><td>Timing of these paths depends on the port's distance to its register</td></tr>
        <tr><td>in2out (feedthrough)</td><td>A signal passing edge-to-edge across the die</td></tr>
        <tr><td>Clock port</td><td>Feeds the clock tree built later in CTS (Clock Tree Synthesis)</td></tr>
      </table>`;
  }

  _fpMacrosInfo() {
    return `<div class="backend-info-formula">Macros = hard IP (memories, register files)</div>
      <div class="backend-info-formula-detail">footprint drawn &prop; &radic;area &nbsp;|&nbsp; placed by hand, preserved through synthesis into the DEF</div>
      <p>Macros are pre-built blocks (SRAM/ROM/cache/register-file/pipeline-reg) with a fixed internal layout and large area. They are positioned during FLP and <i>not</i> dropped into standard-cell rows — the rows flow around them.</p>
      <table class="backend-info-table">
        <tr><td>isMacro</td><td>RAM, ROM, CACHE, REG_FILE, PIPE_REG, COUNTER… (from the cell library)</td></tr>
        <tr><td>Footprint</td><td>Side = √area, so box size reflects real silicon area</td></tr>
        <tr><td>Halo / keep-out</td><td>Real flows reserve a margin around each macro where no std cells are placed</td></tr>
        <tr><td>HIGHLIGHT</td><td>Locate the macro's source component on the main canvas</td></tr>
      </table>`;
  }

  _currentPortEdge(id) {
    if (this._fpPortEdges[id]) return this._fpPortEdges[id];
    const p = this._lastFloorplan?.ports?.find(pt => pt.nodeId === id);
    return p?.edge || 'W';
  }

  /** Macro highlight needs ≥2 ids to draw — pair the macro with a wired neighbor. */
  _macroHighlightIds(id) {
    const w = (this._scene?.wires || []).find(wr => wr.sourceId === id || wr.targetId === id);
    if (w) return [id, w.sourceId === id ? w.targetId : w.sourceId];
    return [id, id];
  }

  // ── Placement & CTS tab ──────────────────────────────────────

  _runPlacement() {
    this._recomputePlacement();
    this._scheduleRender();
  }

  _recomputePlacement() {
    if (!this._scene) return;
    const scene = { nodes: this._scene.nodes, wires: this._scene.wires };
    if (!this._lastFloorplan) this._recomputeFloorplan();
    this._lastPlacement = computePlacement(scene, {
      floorplan: this._lastFloorplan,
      clockBufferDelayPs: this._plClockBufferPs,
    });
    const clk = {
      clockPeriodPs: this._clockPeriodPs, tSetupPs: this._tSetupPs,
      tHoldPs: this._tHoldPs, tClk2QPs: this._tClk2QPs,
    };
    this._lastPlacementStaIdeal = analyzeTimingPaths(scene, { ...clk, skewPs: 0 });
    this._lastPlacementSta      = analyzeTimingPaths(scene, { ...clk, skewPs: this._lastPlacement.cts.skewPs });
  }

  /** Live clock-buffer slider — surgical update so the slider keeps focus. */
  _updatePlacementLive() {
    this._recomputePlacement();
    const p = this._lastPlacement;
    if (!p) return;
    const viz = this._bodyEl?.querySelector('#pl-viz');
    if (viz) viz.innerHTML = this._buildPlacementSvg(p);
    const cts = this._bodyEl?.querySelector('#pl-cts-metrics');
    if (cts) cts.innerHTML = this._buildCtsTable(p);
    const tim = this._bodyEl?.querySelector('#pl-timing');
    if (tim) tim.innerHTML = this._buildTimingImpact();
    const ro = this._bodyEl?.querySelector('#pl-buf-readout');
    if (ro) ro.textContent = `${this._plClockBufferPs} ps`;
    this._renderPlacementSummary(p);
  }

  _renderPlacementSummary(p) {
    if (!this._summaryEl) return;
    if (!p) { this._summaryEl.innerHTML = ''; return; }
    const sv = (label, value, cls = '') =>
      `<div><span class="backend-summary-label">${label}</span><br><span class="backend-summary-value ${cls}">${value}</span></div>`;
    const skewCls = p.cts.skewPs > this._clockPeriodPs * 0.1 ? 'violated' : 'met';
    this._summaryEl.innerHTML = [
      sv('Std Cells', p.placedCount),
      sv('Clock Sinks', p.cts.numSinks),
      sv('CTS Buffers', p.cts.numBuffers),
      sv('Skew', `${p.cts.skewPs} ps`, skewCls),
      sv('Max Insertion', `${p.cts.maxInsertionPs} ps`),
    ].join('');
  }

  _renderPlacementBody(p) {
    if (!this._bodyEl) return;
    if (!p) {
      this._bodyEl.innerHTML = '<div class="backend-coming-soon"><p>Click <b>RUN PLACE+CTS</b> to place cells and synthesize the clock tree</p></div>';
      return;
    }
    if (p.warnings?.includes('Empty design — nothing to place')) {
      this._bodyEl.innerHTML = '<div class="backend-coming-soon"><p>No physical cells to place.</p><p style="font-size:9px;color:#88ccaa;margin-top:8px">Add gates, flip-flops, or memories, then run.</p></div>';
      return;
    }
    const legend = `<div class="backend-fp-legend">
      <span><i style="background:#50cc70"></i> Std cell</span>
      <span><i style="background:#aa44aa"></i> Macro</span>
      <span><i style="background:#90ffc8"></i> Clock source</span>
      <span><i style="background:#a8ffd6"></i> CTS buffer</span>
      <span><i style="background:#88ccaa"></i> Clock sink</span>
      ${this._plShowDensity ? '<span><i style="background:#ffd054"></i> Density</span>' : ''}
    </div>`;
    let html = '';
    html += this._renderSection('pl-controls', `Placement Controls ${this._fpInfoBtn('pl-controls-info')}`, this._buildPlacementControls(p));
    html += this._renderSection('pl-die', `Placement & Clock Tree ${this._fpInfoBtn('pl-place-info')}`,
      this._fpInfoBox('pl-place-info', this._plPlaceInfo()) + `<div class="backend-fp-viz" id="pl-viz">${this._buildPlacementSvg(p)}</div>${legend}`);
    html += this._renderSection('pl-cts', `Clock Tree Synthesis ${this._fpInfoBtn('pl-cts-info')}`,
      this._fpInfoBox('pl-cts-info', this._plCtsInfo()) + `<div id="pl-cts-metrics">${this._buildCtsTable(p)}</div>` + this._buildSinkTable(p));
    html += this._renderSection('pl-timing-sec', `Timing Impact (ideal vs CTS) ${this._fpInfoBtn('pl-timing-info')}`,
      this._fpInfoBox('pl-timing-info', this._plTimingInfo()) + this._buildTimingControls() + `<div id="pl-timing">${this._buildTimingImpact()}</div>`);
    this._bodyEl.innerHTML = html;
  }

  _buildPlacementControls(p) {
    return `
      <div class="backend-fp-slider-row">
        <label>Clock Buffer Delay</label>
        <input type="range" min="10" max="120" step="5" data-pl-field="clockBuffer" value="${this._plClockBufferPs}" />
        <span id="pl-buf-readout">${this._plClockBufferPs} ps</span>
      </div>
      <div class="backend-fp-slider-row" style="margin-top:6px">
        <label>Overlays</label>
        <div class="backend-mode-pills" style="margin:0">
          <button class="backend-mode-pill ${this._plShowDensity ? 'active' : ''}" data-action="pl-toggle-density">${this._plShowDensity ? 'Density: ON' : 'Density: OFF'}</button>
          <button class="backend-mode-pill ${this._plShowClockTree ? 'active' : ''}" data-action="pl-toggle-tree">${this._plShowClockTree ? 'Clock Tree: ON' : 'Clock Tree: OFF'}</button>
        </div>
      </div>`;
  }

  _buildTimingControls() {
    const isCts = this._plIdealVsCts === 'cts';
    return `<div class="backend-mode-pills" style="margin-bottom:6px">
      <button class="backend-mode-pill ${!isCts ? 'active' : ''}" data-action="pl-set-timing" data-mode="ideal">Ideal clock</button>
      <button class="backend-mode-pill ${isCts ? 'active' : ''}" data-action="pl-set-timing" data-mode="cts">Post-CTS</button>
    </div>`;
  }

  /** Die + placement substrate + clock-tree SVG, built on the shared die base. */
  _buildPlacementSvg(p) {
    if (!p.dieW || !p.dieH) return '<div style="color:#88ccaa;font-size:9px">No die to draw</div>';
    const max = Math.max(p.dieW, p.dieH), sw = max * 0.0035;

    // Placed standard cells live inside the core clip (after the heatmap).
    let cellsStr = '';
    const cellCap = Math.min(p.cells.length, 2000);
    for (let i = 0; i < cellCap; i++) {
      const cell = p.cells[i];
      cellsStr += `<rect x="${_n(cell.x - cell.w / 2)}" y="${_n(cell.y - cell.h / 2)}" width="${_n(cell.w)}" height="${_n(cell.h * 0.8)}" fill="#50cc70" fill-opacity="0.5" rx="${_n(sw * 0.3)}"/>`;
    }

    const base = this._dieBaseSvg(p, {
      prefix: 'pl', glow: true, zebraOpacity: 0.04,
      tracks: { color: '#5aa0c0', widthMul: 0.3, opacity: 0.14 },
      heatmap: (this._plShowDensity && p.density.maxDensity)
        ? { grid: p.density.grid, n: p.density.bins, max: p.density.maxDensity, opacity: 0.5 } : null,
      extraClipped: cellsStr,
    });
    let svg = base.svg;

    // macros (thinner stroke, no top-highlight — keeps the clock tree readable)
    svg += base.macros({ strokeMul: 1, highlight: false });

    // clock tree — orthogonal (Manhattan) routing, like a real clock spine
    if (this._plShowClockTree) {
      // L-shaped path: vertical from parent then horizontal to child (with a rounded knee).
      const elbow = (e) => {
        const r = Math.min(max * 0.01, Math.abs(e.x2 - e.x1) / 2, Math.abs(e.y2 - e.y1) / 2);
        if (r < sw) return `M ${_n(e.x1)} ${_n(e.y1)} V ${_n(e.y2)} H ${_n(e.x2)}`;
        const sy = e.y2 > e.y1 ? 1 : -1, sx = e.x2 > e.x1 ? 1 : -1;
        return `M ${_n(e.x1)} ${_n(e.y1)} V ${_n(e.y2 - sy * r)} Q ${_n(e.x1)} ${_n(e.y2)} ${_n(e.x1 + sx * r)} ${_n(e.y2)} H ${_n(e.x2)}`;
      };
      const ekStyle = { src: `stroke="#a8ffe0" stroke-width="${_n(sw * 1.6)}" stroke-opacity="0.95"`,
                        buf: `stroke="#7ad0a8" stroke-width="${_n(sw * 1.1)}" stroke-opacity="0.8"`,
                        sink:`stroke="#5fae88" stroke-width="${_n(sw * 0.7)}" stroke-opacity="0.7"` };
      svg += `<g fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#plGlow)">`;
      for (const e of p.treeEdges) svg += `<path d="${elbow(e)}" ${ekStyle[e.kind] || ekStyle.buf}/>`;
      svg += `</g>`;
      // sinks (drawn under buffers): soft dots
      const sr = max * 0.0085;
      for (const s of p.sinks) svg += `<circle cx="${_n(s.x)}" cy="${_n(s.y)}" r="${_n(sr)}" fill="#a8ffd6" fill-opacity="0.9" stroke="#0d2215" stroke-width="${_n(sw * 0.4)}"/>`;
      // buffers: glowing rounded squares
      const bs = max * 0.014;
      svg += `<g filter="url(#plGlow)">`;
      for (const b of p.buffers) svg += `<rect x="${_n(b.x - bs / 2)}" y="${_n(b.y - bs / 2)}" width="${_n(bs)}" height="${_n(bs)}" rx="${_n(bs * 0.28)}" fill="#caffe8" stroke="#3a8a4a" stroke-width="${_n(sw * 0.5)}"/>`;
      svg += `</g>`;
      // clock source: glowing concentric pulse
      const src = p.clockSource, R = max * 0.022;
      svg += `<g filter="url(#plGlow)">
        <circle cx="${_n(src.x)}" cy="${_n(src.y)}" r="${_n(R)}" fill="none" stroke="#90ffc8" stroke-width="${_n(sw * 0.6)}" stroke-opacity="0.5"/>
        <circle cx="${_n(src.x)}" cy="${_n(src.y)}" r="${_n(R * 0.6)}" fill="#90ffc8" stroke="#0d2215" stroke-width="${_n(sw * 0.6)}"/>
      </g>`;
    }
    svg += `</svg>`;

    // HTML labels — clock source + (shared) macro labels
    const labels = `<div class="backend-fp-label" style="left:${base.fx(p.clockSource.x)}%;top:${base.fy(p.clockSource.y)}%;color:#90ffc8">${this._escapeAttr(this._truncate(p.clockSource.label, 6))}</div>` + base.macroLabels();
    return svg + labels;
  }

  _buildCtsTable(p) {
    const t = p.cts;
    const skewBad = t.skewPs > this._clockPeriodPs * 0.1;
    const card = (label, value, unit = '', cls = '') =>
      `<div class="backend-cts-card ${cls}">
        <div class="backend-cts-k">${label}</div>
        <div class="backend-cts-v">${value}${unit ? ` <small>${unit}</small>` : ''}</div>
      </div>`;
    // headline stat cards
    let html = `<div class="backend-cts-grid">
      ${card('Clock Sinks', t.numSinks)}
      ${card('CTS Buffers', t.numBuffers)}
      ${card('Tree Levels', t.treeLevels)}
      ${card('Clock Skew', t.skewPs, 'ps', skewBad ? 'bad' : 'good')}
    </div>`;
    // insertion-delay span (min → avg → max), visualized
    const lo = t.minInsertionPs, hi = t.maxInsertionPs, span = Math.max(1, hi - lo);
    const avgPct = Math.round((t.avgInsertionPs - lo) / span * 100);
    html += `<div class="backend-cts-insert">
      <div class="backend-cts-insert-head">
        <span>Insertion delay (source → sink)</span>
        <span class="backend-cts-insert-src">source ${t.sourceInsertionPs} ps</span>
      </div>
      <div class="backend-cts-range">
        <div class="backend-cts-range-fill"></div>
        <div class="backend-cts-range-avg" style="left:${avgPct}%" title="avg ${t.avgInsertionPs} ps"></div>
      </div>
      <div class="backend-cts-range-labels">
        <span>min ${lo} ps</span><span>avg ${t.avgInsertionPs} ps</span><span>max ${hi} ps</span>
      </div>
    </div>`;
    html += `<div class="backend-cts-foot">Buffer delay ${t.clockBufferDelayPs} ps &middot; wire ${t.wireDelayPsPerUm} ps·µm⁻¹</div>`;
    return html;
  }

  _buildSinkTable(p) {
    if (!p.sinks.length) return '<div style="color:#88ccaa;font-size:9px;margin-top:6px">No clock sinks</div>';
    const sorted = [...p.sinks].sort((a, b) => b.insertionDelayPs - a.insertionDelayPs);
    const maxIns = Math.max(1, ...sorted.map(s => s.insertionDelayPs));
    let html = `<table class="backend-group-table backend-sink-table" style="margin-top:8px">
      <tr><th>Sink</th><th>Kind</th><th>Insertion delay</th><th>Depth</th><th>Action</th></tr>`;
    for (const s of sorted.slice(0, 20)) {
      const pct = Math.round(s.insertionDelayPs / maxIns * 100);
      html += `<tr>
        <td><b>${this._escapeAttr(this._truncate(s.label, 12))}</b></td>
        <td><span class="backend-sink-kind ${s.isMacro ? 'macro' : 'ff'}">${s.isMacro ? 'macro' : 'FF'}</span></td>
        <td>
          <div class="backend-sink-bar"><div class="backend-sink-bar-fill" style="width:${pct}%"></div></div>
          <span class="backend-sink-ps">${s.insertionDelayPs} ps</span>
        </td>
        <td>${s.bufferDepth}</td>
        <td><button class="backend-copy-btn" data-action="pl-highlight-sink" data-node-id="${this._escapeAttr(s.nodeId)}" style="padding:1px 6px;font-size:8px">HIGHLIGHT</button></td>
      </tr>`;
    }
    html += `</table>`;
    if (sorted.length > 20) html += `<div style="font-size:8px;color:#88ccaa;margin-top:3px">Showing 20 of ${sorted.length} sinks (worst insertion first)</div>`;
    return html;
  }

  _buildTimingImpact() {
    const ideal = this._lastPlacementStaIdeal, cts = this._lastPlacementSta;
    if (!ideal || !cts) return '<div style="color:#88ccaa;font-size:9px">Run placement to compute timing impact</div>';
    const skew = this._lastPlacement?.cts.skewPs ?? 0;
    const ins = this._lastPlacement?.cts.sourceInsertionPs ?? 0;
    const emph = this._plIdealVsCts;

    // Δ cell: shows the post-CTS change vs ideal, arrow + good/bad coloring.
    // `betterUp` = is an increase good? (fMax yes; violations / WNS-toward-negative no)
    const delta = (iv, cv, betterUp) => {
      const d = Math.round((cv - iv) * 100) / 100;
      if (d === 0) return `<span class="backend-ti-delta flat">—</span>`;
      const up = d > 0, good = betterUp ? up : !up;
      return `<span class="backend-ti-delta ${good ? 'good' : 'bad'}">${up ? '▲ +' : '▼ '}${d}</span>`;
    };
    const onI = emph === 'ideal' ? ' col-on' : '';
    const onC = emph === 'cts' ? ' col-on' : '';
    const wcls = v => v < 0 ? 'status-violated' : 'status-met';
    const row = (label, iv, cv, betterUp, icls = '', ccls = '') => `<tr>
        <td>${label}</td>
        <td class="ti-col${onI} ${icls}">${iv}</td>
        <td class="ti-col${onC} ${ccls}">${cv}</td>
        <td class="ti-delta-cell">${delta(iv, cv, betterUp)}</td>
      </tr>`;
    const vc = (a, b) => [a ? 'status-violated' : 'status-met', b ? 'status-violated' : 'status-met'];
    const [si, sc] = vc(ideal.numViolations, cts.numViolations);
    const [hi, hc] = vc(ideal.numHoldViolations, cts.numHoldViolations);

    return `<div class="backend-info-formula" style="margin-bottom:4px">T<sub>cq</sub> + T<sub>comb</sub> + T<sub>setup</sub> &lt; T<sub>ck</sub> &plusmn; T<sub>skew</sub></div>
      <div class="backend-info-formula-detail">Before CTS the clock is <b>ideal</b> (network delay 0). After CTS: insertion ${ins} ps, skew <b>${skew} ps</b> — the &plusmn;T<sub>skew</sub> term.</div>
      <table class="backend-cell-table backend-ti-table" style="margin-top:8px">
        <tr><th>Metric</th><th class="ti-col${onI}">Ideal clock</th><th class="ti-col${onC}">Post-CTS</th><th class="ti-delta-cell">Δ (skew effect)</th></tr>
        ${row('WNS (ps)', ideal.wns, cts.wns, true, wcls(ideal.wns), wcls(cts.wns))}
        ${row('TNS (ps)', ideal.tns, cts.tns, true)}
        ${row('Setup Violations', ideal.numViolations, cts.numViolations, false, si, sc)}
        ${row('Hold Violations', ideal.numHoldViolations, cts.numHoldViolations, false, hi, hc)}
        ${row('fMax (MHz)', ideal.fMaxMHz, cts.fMaxMHz, true)}
      </table>
      <div style="font-size:8px;color:#88ccaa;margin-top:6px">Positive skew relaxes setup (capture edge arrives later) but tightens hold — the &plusmn;T<sub>skew</sub> term.</div>`;
  }

  // ── Placement info boxes (grounded in lessons 1/4/5/6) ──
  _plControlsInfo() {
    return `<div class="backend-info-formula">Placement &rarr; legalize cells into rows; CTS &rarr; balanced clock tree</div>
      <p>After floorplanning, <b>placement</b> drops the synthesized standard cells into the core rows, and <b>CTS</b> builds the clock distribution. These controls tune the clock-buffer delay and what the die view overlays.</p>
      <table class="backend-info-table">
        <tr><td>Clock Buffer Delay</td><td>Per-buffer delay in the clock tree — drives insertion delay &amp; skew</td></tr>
        <tr><td>Density</td><td>Placement-density heatmap (cells per core bin) — the "placement congestion" of synthesis</td></tr>
        <tr><td>Clock Tree</td><td>Show/hide the CTS tree from clock source through buffers to sinks</td></tr>
      </table>`;
  }
  _plPlaceInfo() {
    return `<div class="backend-info-formula">Std cells fill the rows; macros stay fixed</div>
      <div class="backend-info-formula-detail">"Logic gates placed inside unit area" — and a DEF view holds rows, tracks, cells &amp; the clock net</div>
      <p>Each synthesized standard cell is legalized into a core row (skipping macro keep-outs). The clock tree is drawn over the placement: source &rarr; buffers (squares) &rarr; sinks (dots).</p>
      <table class="backend-info-table">
        <tr><td>Std cell</td><td>A placed gate/flip-flop sitting in a row</td></tr>
        <tr><td>Macro</td><td>Hard block (memory / reg file) fixed during floorplan</td></tr>
        <tr><td>Density</td><td>How tightly a region is packed — hot spots risk routing congestion</td></tr>
      </table>`;
  }
  _plCtsInfo() {
    return `<div class="backend-info-formula">Skew = max &minus; min sink insertion delay</div>
      <div class="backend-info-formula-detail">insertion = &Sigma;(buffer delay + wire delay) on source&rarr;sink path</div>
      <p><b>Clock Tree Synthesis</b> distributes one clock to every sequential element with balanced delay. A <b>balanced</b> tree gives near-equal insertion delays &rarr; low <b>skew</b>; uneven sink placement raises skew.</p>
      <table class="backend-info-table">
        <tr><td>Insertion delay</td><td>Source &rarr; sink clock latency (a.k.a. clock network / source insertion delay)</td></tr>
        <tr><td>Skew</td><td>Spread of insertion delays across sinks — directly hits setup/hold</td></tr>
        <tr><td>Clock buffers</td><td>Repeaters inserted to balance & drive the clock net (CTS_* cells)</td></tr>
      </table>`;
  }
  _plTimingInfo() {
    return `<div class="backend-info-formula">T<sub>cq</sub> + T<sub>comb</sub> + T<sub>setup</sub> &lt; T<sub>ck</sub> &plusmn; T<sub>skew</sub></div>
      <p>Before CTS, STA assumes an <b>ideal</b> clock (network delay 0). After CTS the clock is <b>propagated</b> — real insertion delay and skew. This table re-runs STA with the CTS skew to show the impact.</p>
      <table class="backend-info-table">
        <tr><td>Ideal clock</td><td>Pre-CTS assumption (skew 0) — matches the STA tab</td></tr>
        <tr><td>Post-CTS</td><td>STA re-run with the computed skew</td></tr>
        <tr><td>+skew</td><td>Relaxes setup (more margin) but tightens hold</td></tr>
      </table>`;
  }

  // ── Signoff tab ──────────────────────────────────────────────

  _runSignoff() {
    this._recomputeSignoff();
    if (this._activeTab !== 'sta') setStaCriticalPath(null);
    this._scheduleRender();
  }

  /** Re-run the full upstream chain so the signoff always reflects the current scene. */
  _recomputeSignoff() {
    if (!this._scene) return;
    this._runSta();
    this._runSynthesis();
    this._recomputeFloorplan();
    this._recomputePlacement();   // also fills _lastPlacementSta / Ideal
    this._lastSignoff = this._aggregateSignoff();
  }

  /** Assemble caches + run the signoff aggregator. Shared by _recomputeSignoff and _runAll. */
  _aggregateSignoff() {
    return runSignoff({
      sta:               this._lastResult,
      synth:             this._lastSynth,
      sdc:               this._lastSdc,
      def:               this._lastDef,
      floorplan:         this._lastFloorplan,
      placement:         this._lastPlacement,
      placementSta:      this._lastPlacementSta,
      placementStaIdeal: this._lastPlacementStaIdeal,
    }, {
      clockPeriodPs: this._clockPeriodPs,
      tSetupPs:      this._tSetupPs,
    });
  }

  _renderSignoffSummary(r) {
    if (!this._summaryEl) return;
    if (!r) { this._summaryEl.innerHTML = ''; return; }
    const sv = (label, value, cls = '') =>
      `<div><span class="backend-summary-label">${label}</span><br><span class="backend-summary-value ${cls}">${value}</span></div>`;
    const dieArea = this._lastFloorplan?.dieAreaUm2 ?? '—';
    this._summaryEl.innerHTML = [
      sv('Verdict', r.verdict === 'READY' ? 'READY' : 'BLOCKED', r.verdict === 'READY' ? 'met' : 'violated'),
      sv('Blockers', r.blockers, r.blockers > 0 ? 'violated' : 'met'),
      sv('Warnings', r.warnings),
      sv('Die Area', `${dieArea} µm²`),
      sv('Power est', `${r.power.totalMw} mW`),
    ].join('');
  }

  _renderSignoffBody(r) {
    if (!this._bodyEl) return;
    if (!r) {
      this._bodyEl.innerHTML = '<div class="backend-coming-soon"><p>Click <b>RUN SIGNOFF</b> to aggregate all stages and check tapeout readiness</p></div>';
      return;
    }
    const ready = r.verdict === 'READY';
    const banner = `<div class="backend-verdict ${ready ? 'ready' : 'blocked'}">
      <span>${ready ? '✓ READY FOR TAPEOUT' : '✗ BLOCKED'}</span>
      <span style="font-weight:normal;font-size:10px;color:#88ccaa">${ready
        ? 'all blocking checks pass'
        : `${r.blockers} blocking check${r.blockers === 1 ? '' : 's'} failing`}</span>
    </div>`;

    let html = '';
    html += this._renderSection('so-verdict', 'Tapeout Verdict', banner);
    html += this._renderSection('so-checklist', `Signoff Checklist ${this._fpInfoBtn('so-checklist-info')}`,
      this._fpInfoBox('so-checklist-info', this._signoffChecklistInfo()) + this._buildChecklistTable(r));
    html += this._renderSection('so-power', `Power Estimate ${this._fpInfoBtn('so-power-info')}`,
      this._fpInfoBox('so-power-info', this._signoffPowerInfo()) + this._buildPowerReport(r));
    html += this._renderSection('so-tapeout', `Tapeout Export ${this._fpInfoBtn('so-tapeout-info')}`,
      this._fpInfoBox('so-tapeout-info', this._signoffTapeoutInfo()) + this._buildTapeoutSection(r));
    this._bodyEl.innerHTML = html;
  }

  _buildChecklistTable(r) {
    const badge = (s) => {
      const cls = { PASS: 'pass', FAIL: 'fail', WARN: 'warn', NA: 'na' }[s] || 'na';
      const txt = s === 'NA' ? 'N/A' : s;
      return `<span class="backend-signoff-badge ${cls}">${txt}</span>`;
    };
    const kindTag = (k) => k === 'real' ? '' : `<span class="backend-signoff-tag">${k}</span>`;
    let html = `<table class="backend-cell-table">
      <tr><th>Check</th><th>Status</th><th>Measured</th><th>Limit</th><th>Note</th></tr>`;
    let lastCat = null;
    for (const c of r.checks) {
      if (c.category !== lastCat) {
        html += `<tr class="backend-signoff-cat"><td colspan="5">${c.category}</td></tr>`;
        lastCat = c.category;
      }
      html += `<tr>
        <td><b>${c.label}</b></td>
        <td>${badge(c.status)}</td>
        <td>${this._escapeAttr(String(c.value))}</td>
        <td style="color:#88ccaa">${this._escapeAttr(String(c.limit))}</td>
        <td style="color:#a8c8b8">${kindTag(c.kind)}${this._escapeAttr(c.note)}</td>
      </tr>`;
      // Fix-suggestion sub-row under any failing/warning check that carries one.
      if (c.fix && (c.status === 'FAIL' || c.status === 'WARN')) {
        const act = { 'raise-clock': 'so-fix-clock', 'set-util': 'so-fix-util', 'map-generic': 'so-fix-map' }[c.fix.action];
        let btn = '';
        if (act && c.fix.value != null) {
          const lbl = c.fix.action === 'set-util'  ? `Fix: Util ${c.fix.from}→${Math.round(c.fix.value * 100)}%`
                    : c.fix.action === 'map-generic' ? 'Fix: add generic cells'
                    : `Fix: Clock ${c.fix.from}→${c.fix.value} ps`;
          btn = `<button class="backend-fix-btn" data-action="${act}" data-value="${this._escapeAttr(String(c.fix.value))}">${lbl}</button>`;
        }
        html += `<tr class="backend-fix-row"><td></td><td colspan="4">
          <span class="backend-fix-icon">➜</span> ${this._escapeAttr(c.fix.text)} ${btn}
        </td></tr>`;
      }
    }
    html += `</table>
      <div style="margin-top:6px;font-size:8px;color:#88ccaa">
        <b>${r.realCount}</b> real checks &middot; <b>${r.checks.filter(c => c.kind === 'proxy').length}</b> proxy &middot; <b>${r.naCount}</b> N/A.
        Only real blocking checks set the verdict — <span class="backend-signoff-tag">proxy</span> and <span class="backend-signoff-badge na">N/A</span> do not guarantee silicon signoff.
      </div>`;
    return html;
  }

  _buildPowerReport(r) {
    const p = r.power;
    const tot = p.totalMw || 1;
    const dynPct = Math.round(p.dynamicMw / tot * 100);
    const leakPct = 100 - dynPct;
    return `<div class="backend-info-formula">P<sub>total</sub> = &alpha;&middot;C&middot;V<sub>dd</sub>²&middot;f + P<sub>leak</sub></div>
      <div class="backend-info-formula-detail">&alpha;=${p.activity}, V<sub>dd</sub>=${p.vddV} V, f=${p.fGHz} GHz, C=${p.switchCapPf} pF (= area &times; ${p.capPfPerUm2} pF/µm²), leak=${p.leakUwPerUm2} µW/µm²</div>

      <div class="backend-power-grid">
        <div class="backend-power-card">
          <span class="backend-power-dot dyn"></span>
          <div class="backend-power-k">Dynamic</div>
          <div class="backend-power-v">${p.dynamicMw} <small>mW</small></div>
          <div class="backend-power-pct">${dynPct}%</div>
        </div>
        <div class="backend-power-card">
          <span class="backend-power-dot leak"></span>
          <div class="backend-power-k">Leakage</div>
          <div class="backend-power-v">${p.leakageMw} <small>mW</small></div>
          <div class="backend-power-pct">${leakPct}%</div>
        </div>
        <div class="backend-power-card total">
          <div class="backend-power-k">Total</div>
          <div class="backend-power-v">${p.totalMw} <small>mW</small></div>
          <div class="backend-power-pct">est.</div>
        </div>
      </div>

      <div class="backend-power-bar" title="Dynamic ${dynPct}% / Leakage ${leakPct}%">
        <div class="seg dyn" style="width:${dynPct}%">${dynPct >= 12 ? `Dynamic ${dynPct}%` : ''}</div>
        <div class="seg leak" style="width:${leakPct}%">${leakPct >= 12 ? `Leakage ${leakPct}%` : ''}</div>
      </div>

      <div style="margin-top:6px;font-size:8px;color:#88ccaa">Estimated — the cell library has no real capacitance/leakage data; α, V<sub>dd</sub> and the cap/leak coefficients are assumed (28nm-class).</div>`;
  }

  _buildTapeoutSection(r) {
    const esc = s => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const defStr = this._lastDef?.def || '';
    const sdcStr = this._lastSdc?.sdc || '';
    let html = '';
    html += `<div class="backend-tapeout-block">
      <div class="backend-tapeout-title">DEF — Design Exchange Format <button class="backend-copy-btn" data-action="copy-def">COPY</button></div>
      <pre class="backend-def">${esc(defStr) || '(run signoff to generate)'}</pre>
    </div>`;
    html += `<div class="backend-tapeout-block">
      <div class="backend-tapeout-title">SDC — Design Constraints <button class="backend-copy-btn" data-action="copy-sdc">COPY</button></div>
      <pre class="backend-sdc">${esc(sdcStr) || '(run signoff to generate)'}</pre>
    </div>`;
    html += `<div class="backend-info-chip">
      <span class="backend-info-chip-icon">i</span>
      <span><b>GDS / OASIS</b> (the real tapeout masks) are written <b>after route</b> — this pre-route flow has no routed geometry. Below is a labeled ASCII placeholder only.</span>
    </div>`;
    html += `<div class="backend-tapeout-block">
      <div class="backend-tapeout-title">OASIS (placeholder) <button class="backend-copy-btn" data-action="copy-oasis">COPY</button></div>
      <pre class="backend-def">${esc(r.oasisStub)}</pre>
    </div>`;
    return html;
  }

  _signoffChecklistInfo() {
    return `<div class="backend-info-formula">Signoff: Power; PI + EM; DRC; LVS; FM; STA + SI &rarr; Tapeout</div>
      <p><b>Signoff</b> is the final gate before tapeout: every backend stage is checked against its limit. This panel aggregates the results already computed by the STA, Synthesis, Floorplan and Placement tabs.</p>
      <table class="backend-info-table">
        <tr><td>DRC</td><td>Design-Rule Check — e.g. max fanout, legalization (real here)</td></tr>
        <tr><td>LVS</td><td>Layout-vs-Schematic — netlist matches layout (proxy here; needs extracted layout)</td></tr>
        <tr><td>FM</td><td>Formal — proves RTL ≡ gate netlist (proxy here; needs a formal tool)</td></tr>
        <tr><td>STA + SI</td><td>Timing with signal-integrity (crosstalk) derate — SI needs routed parasitics</td></tr>
        <tr><td>Honesty</td><td>real = from data; proxy = structural approximation; N/A = needs routed layout</td></tr>
      </table>`;
  }
  _signoffPowerInfo() {
    return `<div class="backend-info-formula">Dynamic = &alpha;&middot;C&middot;V²&middot;f &nbsp;|&nbsp; Leakage &prop; area</div>
      <p>Power has two parts: <b>dynamic</b> (charging net capacitance as signals switch) and <b>leakage</b> (static transistor current). This is an <b>estimate</b> — real signoff uses per-cell power from the timing library.</p>
      <table class="backend-info-table">
        <tr><td>Power Integrity (PI)</td><td>IR-drop & EM on the power grid — needs the routed PG mesh (N/A here)</td></tr>
        <tr><td>EM</td><td>Electromigration — metal wears out under high current density (N/A; needs route)</td></tr>
        <tr><td>Clock gating</td><td>The main dynamic-power lever — gates the clock to idle flops</td></tr>
      </table>`;
  }
  _signoffTapeoutInfo() {
    return `<div class="backend-info-formula">Tapeout = GDS / OASIS delivery to the FAB</div>
      <p>The deliverables. <b>GDS(II)</b> is binary mask data; <b>OASIS</b> is a compact ASCII alternative. Both describe the routed layout and are produced only after Route. Pre-route, the closest artifacts are the <b>DEF</b> (placement) and <b>SDC</b> (constraints).</p>
      <table class="backend-info-table">
        <tr><td>DEF</td><td>Design Exchange Format — cells + placement (available now)</td></tr>
        <tr><td>SDC</td><td>Synopsys Design Constraints — clocks, I/O delays, DRC limits (available now)</td></tr>
        <tr><td>GDS / OASIS</td><td>Final masks — post-route only</td></tr>
      </table>`;
  }
}

// Format a number for SVG output (trim to 2 dp, drop trailing zeros).
function _n(v) {
  return (Math.round(v * 100) / 100).toString();
}
