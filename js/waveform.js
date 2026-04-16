/* ============================================================
   waveform.js — Timing Diagram / Oscilloscope Display
   Records signal history and renders waveform chart.
   ============================================================ */

const Waveform = (() => {

  let _canvas, _ctx;
  let _history = [];      // Array of { step, signals: Map<nodeId, value> }
  let _visible = false;
  let _signals = [];       // Array of { id, label, color } — which signals to show

  const COLORS = {
    bg:       '#0a0e14',
    grid:     'rgba(100,150,170,0.15)',
    gridText: '#555',
    high:     '#39ff14',
    low:      '#c62828',
    clock:    '#ffcc00',
    border:   '#1e3a50',
  };

  const ROW_H = 32;       // Height per signal row
  const LABEL_W = 80;     // Width for signal labels
  const STEP_W = 60;      // Width per time step
  const HEADER_H = 24;    // Height for step numbers header
  const PAD = 8;

  function init(canvasEl) {
    _canvas = canvasEl;
    _ctx = _canvas.getContext('2d');
  }

  function reset() {
    _history = [];
    _signals = [];
  }

  function setSignals(level) {
    if (!level) return;
    _signals = [];
    // Add clock first
    level.nodes.forEach(n => {
      if (n.type === 'CLOCK') {
        _signals.push({ id: n.id, label: 'CLK', color: COLORS.clock, type: 'clock' });
      }
    });
    // Add inputs
    level.nodes.forEach(n => {
      if (n.type === 'INPUT') {
        _signals.push({ id: n.id, label: n.label || n.id, color: '#39ff14', type: 'input' });
      }
    });
    // Add MUX_SELECTs
    level.nodes.forEach(n => {
      if (n.type === 'MUX_SELECT') {
        _signals.push({ id: n.id, label: n.label || n.id, color: '#a060ff', type: 'mux' });
      }
    });
    // Add outputs
    level.nodes.forEach(n => {
      if (n.type === 'OUTPUT') {
        _signals.push({ id: n.id, label: n.label || n.id, color: '#00d4ff', type: 'output' });
      }
    });
  }

  // Record current state (call after each STEP evaluation)
  function record(stepCount, nodeValues) {
    if (!nodeValues) return;
    const signals = new Map();
    _signals.forEach(sig => {
      signals.set(sig.id, nodeValues.get(sig.id) ?? null);
    });
    // Replace if same step already recorded (re-evaluation), otherwise push
    if (_history.length > 0 && _history[_history.length - 1].step === stepCount) {
      _history[_history.length - 1].signals = signals;
    } else {
      _history.push({ step: stepCount, signals });
    }
  }

  function show() {
    _visible = true;
    // Resize after a frame so the panel is visible and has dimensions
    requestAnimationFrame(() => { _resize(); render(); });
  }
  function hide() { _visible = false; }
  function toggle() { _visible ? hide() : show(); }
  function isVisible() { return _visible; }

  function _resize() {
    if (!_canvas) return;
    const parent = _canvas.parentElement;
    if (!parent) return;
    _canvas.width = parent.clientWidth * (window.devicePixelRatio || 1);
    _canvas.height = parent.clientHeight * (window.devicePixelRatio || 1);
    _canvas.style.width = parent.clientWidth + 'px';
    _canvas.style.height = parent.clientHeight + 'px';
    _ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
  }

  function render() {
    if (!_visible || !_ctx || _signals.length === 0) return;

    const w = _canvas.width / (window.devicePixelRatio || 1);
    const h = _canvas.height / (window.devicePixelRatio || 1);

    // Background
    _ctx.fillStyle = COLORS.bg;
    _ctx.fillRect(0, 0, w, h);

    // Border top
    _ctx.strokeStyle = COLORS.border;
    _ctx.lineWidth = 1;
    _ctx.beginPath();
    _ctx.moveTo(0, 0);
    _ctx.lineTo(w, 0);
    _ctx.stroke();

    const numSteps = _history.length;
    if (numSteps === 0) {
      _ctx.fillStyle = '#555';
      _ctx.font = '12px JetBrains Mono, monospace';
      _ctx.textAlign = 'center';
      _ctx.textBaseline = 'middle';
      _ctx.fillText('Press STEP to see waveforms', w / 2, h / 2);
      return;
    }

    // Step number header
    _ctx.fillStyle = COLORS.gridText;
    _ctx.font = '10px JetBrains Mono, monospace';
    _ctx.textAlign = 'center';
    _ctx.textBaseline = 'middle';

    // Also draw "init" column
    const totalCols = numSteps + 1; // init + steps
    const availW = w - LABEL_W - PAD;
    const stepW = Math.min(STEP_W, availW / totalCols);

    // Header: init, S1, S2, ...
    _ctx.fillText('init', LABEL_W + stepW / 2, HEADER_H / 2);
    for (let i = 0; i < numSteps; i++) {
      const x = LABEL_W + (i + 1) * stepW + stepW / 2;
      _ctx.fillText('S' + (i + 1), x, HEADER_H / 2);
    }

    // Draw vertical grid lines
    _ctx.strokeStyle = COLORS.grid;
    _ctx.lineWidth = 1;
    for (let i = 0; i <= totalCols; i++) {
      const x = LABEL_W + i * stepW;
      _ctx.beginPath();
      _ctx.moveTo(x, HEADER_H);
      _ctx.lineTo(x, h);
      _ctx.stroke();
    }

    // Draw each signal row
    _signals.forEach((sig, rowIdx) => {
      const y0 = HEADER_H + rowIdx * ROW_H;
      const yMid = y0 + ROW_H / 2;
      const yHigh = y0 + 6;
      const yLow = y0 + ROW_H - 6;

      // Horizontal grid line
      _ctx.strokeStyle = COLORS.grid;
      _ctx.beginPath();
      _ctx.moveTo(LABEL_W, y0 + ROW_H);
      _ctx.lineTo(w, y0 + ROW_H);
      _ctx.stroke();

      // Signal label
      _ctx.fillStyle = sig.color;
      _ctx.font = 'bold 10px JetBrains Mono, monospace';
      _ctx.textAlign = 'right';
      _ctx.textBaseline = 'middle';
      _ctx.fillText(sig.label, LABEL_W - 8, yMid);

      // Draw waveform: init value (from step 0 or null) + step values
      // Get initial value (before any step): try to get from history step 0
      let prevVal = null;

      // For init column: use the value at step 0 (before first clock)
      // We record step 0 as the initial state
      if (_history.length > 0 && _history[0].step === 0) {
        prevVal = _history[0].signals.get(sig.id) ?? null;
      }

      // Draw init column
      const initX0 = LABEL_W;
      const initX1 = LABEL_W + stepW;
      if (prevVal !== null) {
        const initY = prevVal === 1 ? yHigh : yLow;
        _ctx.strokeStyle = sig.color;
        _ctx.lineWidth = 2;
        _ctx.beginPath();
        _ctx.moveTo(initX0, initY);
        _ctx.lineTo(initX1, initY);
        _ctx.stroke();
      }

      // Draw step columns
      for (let i = 0; i < _history.length; i++) {
        const entry = _history[i];
        if (entry.step === 0) continue; // already drawn as init

        const val = entry.signals.get(sig.id) ?? null;
        const x0 = LABEL_W + i * stepW;
        const x1 = LABEL_W + (i + 1) * stepW;

        if (val === null) continue;

        const curY = val === 1 ? yHigh : yLow;

        _ctx.strokeStyle = sig.color;
        _ctx.lineWidth = 2;
        _ctx.beginPath();

        // Transition edge from previous value
        if (prevVal !== null && prevVal !== val) {
          const prevY = prevVal === 1 ? yHigh : yLow;
          _ctx.moveTo(x0, prevY);
          _ctx.lineTo(x0, curY);
        } else {
          _ctx.moveTo(x0, curY);
        }

        // Hold at current level
        _ctx.lineTo(x1, curY);
        _ctx.stroke();

        // Fill area under high signal (subtle)
        if (val === 1) {
          _ctx.fillStyle = sig.color.replace(')', ',0.06)').replace('rgb', 'rgba');
          if (sig.color.startsWith('#')) {
            _ctx.fillStyle = sig.color + '10';
          }
          _ctx.fillRect(x0, yHigh, stepW, yLow - yHigh);
        }

        prevVal = val;
      }
    });
  }

  return { init, reset, setSignals, record, show, hide, toggle, isVisible, render };

})();
