/**
 * BackendPanel — VLSI Backend Design panel.
 * Tab-based UI: STA (active) | Synthesis | Floorplan | Placement | Signoff.
 * Only STA is functional; other tabs show placeholders.
 */

import { analyzeTimingPaths, pathDetail } from '../STAEngine.js';
import { setStaCriticalPath }             from '../../rendering/CanvasRenderer.js';

const TABS = [
  { id: 'sta',       label: 'STA',       enabled: true  },
  { id: 'synthesis',  label: 'Synthesis',  enabled: false },
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
    this._selectedPath   = -1;
    this._collapsedSections = new Set(['hist-info']);

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
    document.getElementById('btn-backend-run')?.addEventListener('click', () => this._runSta());
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
      }
    });

    // Tab clicks
    this._tabsEl?.addEventListener('click', e => {
      const tab = e.target.closest('.backend-tab');
      if (!tab) return;
      this._activeTab = tab.dataset.tab;
      this._selectedPath = -1;
      setStaCriticalPath(null);
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
    if (this._activeTab === 'sta') {
      this._renderSummary(this._lastResult);
      this._renderStaBody(this._lastResult);
    } else {
      this._renderSummary(null);
      this._renderPlaceholder(this._activeTab);
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
}
