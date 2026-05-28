/**
 * BackendPanel — VLSI Backend Design panel.
 * Tab-based UI: STA (active) | Synthesis | Floorplan | Placement | Signoff.
 * Only STA is functional; other tabs show placeholders.
 */

import { analyzeTimingPaths, pathDetail } from '../STAEngine.js';
import { synthesize, generateSDC, classifyGroupPaths, estimateCongestion, synthesisSteps, generateDEF } from '../SynthesisEngine.js';
import { setStaCriticalPath }             from '../../rendering/CanvasRenderer.js';

const TABS = [
  { id: 'sta',       label: 'STA',       enabled: true  },
  { id: 'synthesis',  label: 'Synthesis',  enabled: true  },
  { id: 'floorplan',  label: 'Floorplan',  enabled: false },
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
    this._collapsedSections = new Set([
      'hist-info',     // STA: slack distribution explanation
      'synth-info',    // Synthesis: overview (now also contains flow diagram)
      'mode-info',     // Synthesis: topo vs non-topo table
      'group-info',    // Synthesis: group paths descriptions
      'sdc-info',      // Synthesis: wire load model
      'netlist-info',  // Synthesis: GL netlist assign hint
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
      else this._runSta();
    });
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
      }
    });

    // Track draft input for custom group fields (input event — no re-render)
    this._bodyEl?.addEventListener('input', e => {
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
    r.paths.forEach((p, i) => {
      const cls = i === this._selectedPath ? ' selected' : '';
      const sCls = p.status === 'MET' ? 'status-met' : 'status-violated';
      html += `<tr class="${cls}" data-action="select-path" data-index="${i}">
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
      { label: '< -200',  min: -Infinity, max: -200,     count: 0, color: '#cc3333' },
      { label: '-200..0',  min: -200,      max: 0,        count: 0, color: '#dd6644' },
      { label: '0..500',   min: 0,         max: 500,      count: 0, color: '#aaaa44' },
      { label: '500..1k',  min: 500,       max: 1000,     count: 0, color: '#55bb55' },
      { label: '> 1000',   min: 1000,      max: Infinity, count: 0, color: '#33cc77' },
    ];
    for (const p of r.paths) {
      for (const b of buckets) {
        if (p.slackPs >= b.min && p.slackPs < b.max) { b.count++; break; }
      }
    }
    const maxCount = Math.max(1, ...buckets.map(b => b.count));
    const barH = 80;
    html += '<div class="backend-histogram">';
    for (const b of buckets) {
      const h = b.count > 0 ? Math.max(18, Math.round((b.count / maxCount) * barH)) : 6;
      html += `<div class="backend-hist-col">`;
      html += `<span class="backend-hist-count" style="color:${b.color}">${b.count}</span>`;
      html += `<div class="backend-hist-bar" style="height:${h}px;background:${b.color}" title="${b.label}: ${b.count} path(s)"></div>`;
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
}
