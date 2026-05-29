/**
 * BackendPanel — VLSI Backend Design panel.
 * Tab-based UI: STA (active) | Synthesis | Floorplan | Placement | Signoff.
 * Only STA is functional; other tabs show placeholders.
 */

import { analyzeTimingPaths, pathDetail } from '../STAEngine.js';
import { synthesize, generateSDC, classifyGroupPaths, estimateCongestion, synthesisSteps, generateDEF } from '../SynthesisEngine.js';
import { computeFloorplan, PORT_COLORS }  from '../FloorplanEngine.js';
import { setStaCriticalPath }             from '../../rendering/CanvasRenderer.js';

const TABS = [
  { id: 'sta',       label: 'STA',       enabled: true  },
  { id: 'synthesis',  label: 'Synthesis',  enabled: true  },
  { id: 'floorplan',  label: 'Floorplan',  enabled: true  },
  { id: 'placement',  label: 'Placement',  enabled: false },
  { id: 'signoff',    label: 'Signoff',    enabled: false },
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
      } else if (action === 'fp-highlight-macro') {
        const id = btn.dataset.nodeId;
        setStaCriticalPath(this._macroHighlightIds(id), 'met');
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
    html += this._renderSection('clock', 'Clock Settings', `
      <div class="backend-clock-grid">
        <label>Clock Period (ps)</label>
        <input type="number" data-param="clockPeriod" value="${this._clockPeriodPs}" min="10" step="10" />
        <label>t<sub>Setup</sub> (ps)</label>
        <input type="number" data-param="tSetup" value="${this._tSetupPs}" min="0" step="5" />
        <label>t<sub>Hold</sub> (ps)</label>
        <input type="number" data-param="tHold" value="${this._tHoldPs}" min="0" step="5" />
        <label>t<sub>Clk2Q</sub> (ps)</label>
        <input type="number" data-param="tClk2Q" value="${this._tClk2QPs}" min="0" step="10" />
      </div>
      <button class="btn-secondary backend-action-run" data-action="apply-clock" style="font-size:8px;padding:2px 8px">APPLY &amp; RE-RUN</button>
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
    let html = `<table class="backend-paths-table">
      <tr><th>#</th><th>Type</th><th>Start</th><th>End</th><th>Delay</th><th>Req'd</th><th>Slack</th><th>Status</th></tr>`;
    const bkt = this._selectedBucket;
    r.paths.forEach((p, i) => {
      const inBucket = bkt && p.slackPs >= bkt.min && p.slackPs < bkt.max;
      const cls = (i === this._selectedPath ? ' selected' : '') + (inBucket ? ' bucket-hit' : '');
      const rowStyle = inBucket ? ` style="box-shadow: inset 3px 0 0 ${bkt.color}; background:${bkt.color}22"` : '';
      const sCls = p.status === 'MET' ? 'status-met' : 'status-violated';
      html += `<tr class="${cls}"${rowStyle} data-action="select-path" data-index="${i}">
        <td>${i + 1}</td>
        <td>${p.type}</td>
        <td title="${p.startId}">${this._truncate(p.startLabel, 10)}</td>
        <td title="${p.endId}">${this._truncate(p.endLabel, 10)}</td>
        <td>${p.arrivalPs}</td>
        <td>${p.requiredPs}</td>
        <td>${p.slackPs}</td>
        <td class="${sCls}">${p.status}</td>
      </tr>`;
    });
    html += '</table>';
    return html;
  }

  _renderDetailTable(rows, path) {
    let html = `<div style="font-size:8px;color:#4a8a6a;margin-bottom:4px">
      Startpoint: ${path.startLabel} (${path.type})<br>
      Endpoint: ${path.endLabel}<br>
      Clock Period: ${this._clockPeriodPs} ps &nbsp; Slack: <span style="color:${path.slackPs >= 0 ? '#44ff88' : '#ff4444'}">${path.slackPs} ps</span>
    </div>`;
    html += `<table class="backend-detail-table">
      <tr><th>Node</th><th>Type</th><th>Delay (ps)</th><th>Arrival (ps)</th></tr>`;
    for (const row of rows) {
      html += `<tr>
        <td>${row.label}</td>
        <td>${row.type}</td>
        <td>${row.delayPs}</td>
        <td>${row.arrivalPs}</td>
      </tr>`;
    }
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
    html += `<table class="backend-group-table">
      <tr><th>Group</th>${showDesc ? '<th>Description</th>' : ''}<th>Count</th><th>Action</th></tr>`;
    for (const [name, data] of rows) {
      const disabled = data.count === 0;
      html += `<tr>
        <td><b>${name}</b></td>
        ${showDesc ? `<td>${data.desc}</td>` : ''}
        <td>${data.count}</td>
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
    let html = '<table class="backend-cell-table"><tr><th>Cell</th><th>Function</th><th>Count</th><th>Unit (µm²)</th><th>Total (µm²)</th></tr>';
    for (const [cell, count] of entries) {
      const a = areaByCell[cell] || 0;
      const unit = (count > 0 ? a / count : 0);
      html += `<tr><td><b>${cell}</b></td><td style="color:#88ccaa">${fnByCell[cell] || ''}</td><td>${count}</td><td>${unit.toFixed(2)}</td><td><b>${a.toFixed(2)}</b></td></tr>`;
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

  /** Compute STA + Synthesis + Floorplan in one shot, then render the active tab. */
  _runAll() {
    this._runSta();
    this._runSynthesis();
    this._recomputeFloorplan();
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

  /** Build the responsive SVG die plan + absolutely-positioned HTML labels. */
  _buildDieSvg(m) {
    if (!m.dieW || !m.dieH) return '<div style="color:#88ccaa;font-size:9px">No die to draw</div>';
    const W = m.dieW, H = m.dieH, c = m.core;
    const max = Math.max(W, H);
    const pad = max * 0.06;
    const vbW = W + 2 * pad, vbH = H + 2 * pad;
    const sw  = max * 0.0035;            // generic stroke width (µm)
    const rDie  = max * 0.02;            // die corner radius
    const rCore = max * 0.012;           // core corner radius
    const hs    = max * 0.03;            // hatch pitch

    // ── defs: gradients, macro hatch, drop shadow, core clip ──
    let svg = `<svg viewBox="${_n(-pad)} ${_n(-pad)} ${_n(vbW)} ${_n(vbH)}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<defs>
      <linearGradient id="fpDie" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0e2016"/><stop offset="1" stop-color="#060d09"/>
      </linearGradient>
      <linearGradient id="fpCore" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#173620"/><stop offset="1" stop-color="#0d2215"/>
      </linearGradient>
      <linearGradient id="fpMacro" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="rgba(190,90,190,0.45)"/><stop offset="1" stop-color="rgba(120,40,120,0.4)"/>
      </linearGradient>
      <pattern id="fpHatch" width="${_n(hs)}" height="${_n(hs)}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="${_n(hs)}" stroke="#d870d8" stroke-width="${_n(sw * 0.7)}" stroke-opacity="0.45"/>
      </pattern>
      <filter id="fpShadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="${_n(sw * 1.2)}" stdDeviation="${_n(sw * 1.6)}" flood-color="#000" flood-opacity="0.55"/>
      </filter>
      <clipPath id="fpCoreClip"><rect x="${_n(c.x)}" y="${_n(c.y)}" width="${_n(c.w)}" height="${_n(c.h)}" rx="${_n(rCore)}"/></clipPath>
    </defs>`;

    // ── die body (with shadow + glow) ──
    svg += `<rect x="0" y="0" width="${_n(W)}" height="${_n(H)}" rx="${_n(rDie)}" fill="url(#fpDie)" stroke="#50cc70" stroke-width="${_n(sw * 1.6)}" filter="url(#fpShadow)"/>`;
    svg += `<rect x="${_n(sw * 1.5)}" y="${_n(sw * 1.5)}" width="${_n(W - sw * 3)}" height="${_n(H - sw * 3)}" rx="${_n(rDie)}" fill="none" stroke="#2a6a3a" stroke-width="${_n(sw * 0.6)}" stroke-opacity="0.6"/>`;

    // ── core ──
    svg += `<rect x="${_n(c.x)}" y="${_n(c.y)}" width="${_n(c.w)}" height="${_n(c.h)}" rx="${_n(rCore)}" fill="url(#fpCore)" stroke="#3a8a4a" stroke-width="${_n(sw)}" stroke-dasharray="${_n(sw * 3)} ${_n(sw * 2)}"/>`;

    // ── clipped content: zebra rows + congestion ──
    svg += `<g clip-path="url(#fpCoreClip)">`;
    const shown = Math.min(m.rows.count, 60);
    const bandH = c.h / shown;
    for (let i = 0; i < shown; i += 2) {
      svg += `<rect x="${_n(c.x)}" y="${_n(c.y + i * bandH)}" width="${_n(c.w)}" height="${_n(bandH)}" fill="#50cc70" fill-opacity="0.05"/>`;
    }
    // Routing tracks: fixed grid (metal layers) on which wires & power straps run.
    if (this._fpShowTracks) {
      const pitch = Math.max(m.rows.height, Math.max(W, H) / 100);
      const nV = Math.min(100, Math.floor(c.w / pitch));
      const nH = Math.min(100, Math.floor(c.h / pitch));
      const tw = sw * 0.5;
      for (let i = 1; i < nV; i++) {
        const tx = c.x + (i / nV) * c.w;
        svg += `<line x1="${_n(tx)}" y1="${_n(c.y)}" x2="${_n(tx)}" y2="${_n(c.y + c.h)}" stroke="#7ac0e0" stroke-width="${_n(tw)}" stroke-opacity="0.38"/>`;
      }
      for (let j = 1; j < nH; j++) {
        const ty = c.y + (j / nH) * c.h;
        svg += `<line x1="${_n(c.x)}" y1="${_n(ty)}" x2="${_n(c.x + c.w)}" y2="${_n(ty)}" stroke="#7ac0e0" stroke-width="${_n(tw)}" stroke-opacity="0.38"/>`;
      }
    }
    if (this._fpShowCongestion && m.congestion?.maxDensity) {
      const g = m.congestion, n = g.gridSize;
      const cw = c.w / n, ch = c.h / n;
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const v = g.grid[y][x];
          if (!v) continue;
          const t = v / g.maxDensity;
          const hue = Math.round(120 - t * 120);
          const lum = 30 + t * 25;
          svg += `<rect x="${_n(c.x + x * cw)}" y="${_n(c.y + y * ch)}" width="${_n(cw)}" height="${_n(ch)}" fill="hsl(${hue}, 60%, ${lum}%)" fill-opacity="0.5"/>`;
        }
      }
    }
    svg += `</g>`;

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

    // ── macros (hatch + gradient + shadow + top highlight) ──
    for (const mac of m.macros) {
      const s = mac.side, mx = mac.x - s / 2, my = mac.y - s / 2;
      svg += `<g filter="url(#fpShadow)">
        <rect x="${_n(mx)}" y="${_n(my)}" width="${_n(s)}" height="${_n(s)}" rx="${_n(sw)}" fill="url(#fpMacro)" stroke="#d870d8" stroke-width="${_n(sw * 1.2)}"/>
        <rect x="${_n(mx)}" y="${_n(my)}" width="${_n(s)}" height="${_n(s)}" rx="${_n(sw)}" fill="url(#fpHatch)"/>
        <line x1="${_n(mx + sw)}" y1="${_n(my + sw * 1.5)}" x2="${_n(mx + s - sw)}" y2="${_n(my + sw * 1.5)}" stroke="#ffb0ff" stroke-width="${_n(sw * 0.6)}" stroke-opacity="0.5"/>
      </g>`;
    }

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
    const fx = x => ((x + pad) / vbW * 100).toFixed(2);
    const fy = y => ((y + pad) / vbH * 100).toFixed(2);
    let labels = '';
    for (const mac of m.macros) {
      // Fit the label to the macro box so it doesn't overflow small macros.
      const fit = Math.max(2, Math.round(mac.side / (max * 0.028)));
      labels += `<div class="backend-fp-label macro" style="left:${fx(mac.x)}%;top:${fy(mac.y)}%;max-width:${(mac.side / vbW * 100).toFixed(2)}%">${this._escapeAttr(this._truncate(mac.label, fit))}</div>`;
    }
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
    const row = (k, v) => `<tr><td>${k}</td><td><b>${v}</b></td></tr>`;
    return `<table class="backend-cell-table">
      <tr><th>Metric</th><th>Value</th></tr>
      ${row('Die Area', `${m.dieAreaUm2} µm²`)}
      ${row('Die W × H', `${m.dieW} × ${m.dieH} µm`)}
      ${row('Core Area', `${m.coreAreaUm2} µm²`)}
      ${row('Cell Area', `${m.totalCellAreaUm2} µm² (macro ${m.macroAreaUm2} / std ${m.stdAreaUm2})`)}
      ${row('Target Utilization', `${Math.round(m.utilization * 100)}%`)}
      ${row('Actual Utilization', `${Math.round(m.actualUtilization * 100)}%`)}
      ${row('Aspect Ratio', m.aspectRatio)}
      ${row('Std-Cell Rows', `${m.rows.count} × ${m.rows.height} µm`)}
      ${row('Std Cells / Macros', `${m.stdCellCount} / ${m.macroCount}`)}
      ${row('Ports', m.portCount)}
    </table>`;
  }

  _buildPortList(m) {
    if (!m.ports.length) return '<div style="color:#88ccaa;font-size:9px">No primary ports (INPUT/OUTPUT/CLOCK) in this design</div>';
    const edgeName = { N: 'North', E: 'East', S: 'South', W: 'West' };
    let html = `<table class="backend-group-table">
      <tr><th>Port</th><th>Type</th><th>Edge</th><th>Action</th></tr>`;
    for (const p of m.ports) {
      html += `<tr>
        <td><b>${this._escapeAttr(this._truncate(p.label, 12))}</b></td>
        <td style="color:${PORT_COLORS[p.type] || '#88ccaa'}">${p.type}</td>
        <td>${edgeName[p.edge]}</td>
        <td><button class="backend-copy-btn" data-action="fp-cycle-port" data-node-id="${this._escapeAttr(p.nodeId)}" style="padding:1px 6px;font-size:8px">${p.edge} ▸</button></td>
      </tr>`;
    }
    html += `</table>
      <div style="margin-top:6px;font-size:9px;color:#88ccaa">Click the edge button to cycle a port around the die (N→E→S→W).</div>`;
    return html;
  }

  _buildMacroList(m) {
    if (!m.macros.length) return '<div style="color:#88ccaa;font-size:9px">No macros (memories / register files) in this design</div>';
    let html = `<table class="backend-group-table">
      <tr><th>Macro</th><th>Cell</th><th>Area (µm²)</th><th>Side (µm)</th><th>Action</th></tr>`;
    for (const mac of m.macros) {
      html += `<tr>
        <td><b>${this._escapeAttr(this._truncate(mac.label, 12))}</b></td>
        <td style="color:#88ccaa">${mac.cellName}</td>
        <td>${mac.areaUm2}</td>
        <td>${mac.side}</td>
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
}

// Format a number for SVG output (trim to 2 dp, drop trailing zeros).
function _n(v) {
  return (Math.round(v * 100) / 100).toString();
}
