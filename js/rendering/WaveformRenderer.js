/**
 * WaveformRenderer — Timing diagram / oscilloscope display.
 * Records signal history and renders waveform chart.
 * Migrated from waveform.js.
 */

const COLORS = {
  bg:       '#0a0e14',
  grid:     'rgba(100,150,170,0.15)',
  gridText: '#555',
  high:     '#39ff14',
  low:      '#c62828',
  clock:    '#ffcc00',
  border:   '#1e3a50',
};

const ROW_H = 32;
const LABEL_W = 80;
const STEP_W = 60;
const HEADER_H = 24;

let _canvas, _ctx;
let _history = [];
let _visible = false;
let _signals = [];

export function init(canvasEl) {
  _canvas = canvasEl;
  _ctx = _canvas.getContext('2d');
}

export function reset() {
  _history = [];
  _signals = [];
}

export function setSignals(nodes) {
  if (!nodes) return;
  _signals = [];
  nodes.forEach(n => {
    if (n.type === 'CLOCK') {
      _signals.push({ id: n.id, label: 'CLK', color: COLORS.clock, type: 'clock' });
    }
  });
  nodes.forEach(n => {
    if (n.type === 'INPUT') {
      _signals.push({ id: n.id, label: n.label || n.id, color: '#39ff14', type: 'input' });
    }
  });
  nodes.forEach(n => {
    if (n.type === 'MUX_SELECT') {
      _signals.push({ id: n.id, label: n.label || n.id, color: '#a060ff', type: 'mux' });
    }
  });
  nodes.forEach(n => {
    if (n.type === 'OUTPUT') {
      _signals.push({ id: n.id, label: n.label || n.id, color: '#00d4ff', type: 'output' });
    }
  });
}

export function record(stepCount, nodeValues) {
  if (!nodeValues) return;
  const signals = new Map();
  _signals.forEach(sig => {
    signals.set(sig.id, nodeValues.get(sig.id) ?? null);
  });
  if (_history.length > 0 && _history[_history.length - 1].step === stepCount) {
    _history[_history.length - 1].signals = signals;
  } else {
    _history.push({ step: stepCount, signals });
  }
}

export function show() {
  _visible = true;
  requestAnimationFrame(() => { _resize(); render(); });
}
export function hide() { _visible = false; }
export function toggle() { _visible ? hide() : show(); }
export function isVisible() { return _visible; }

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

export function render() {
  if (!_visible || !_ctx || _signals.length === 0) return;

  const w = _canvas.width / (window.devicePixelRatio || 1);
  const h = _canvas.height / (window.devicePixelRatio || 1);

  _ctx.fillStyle = COLORS.bg;
  _ctx.fillRect(0, 0, w, h);

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

  _ctx.fillStyle = COLORS.gridText;
  _ctx.font = '10px JetBrains Mono, monospace';
  _ctx.textAlign = 'center';
  _ctx.textBaseline = 'middle';

  const totalCols = numSteps + 1;
  const availW = w - LABEL_W - 8;
  const stepW = Math.min(STEP_W, availW / totalCols);

  _ctx.fillText('init', LABEL_W + stepW / 2, HEADER_H / 2);
  for (let i = 0; i < numSteps; i++) {
    const x = LABEL_W + (i + 1) * stepW + stepW / 2;
    _ctx.fillText('S' + (i + 1), x, HEADER_H / 2);
  }

  _ctx.strokeStyle = COLORS.grid;
  _ctx.lineWidth = 1;
  for (let i = 0; i <= totalCols; i++) {
    const x = LABEL_W + i * stepW;
    _ctx.beginPath();
    _ctx.moveTo(x, HEADER_H);
    _ctx.lineTo(x, h);
    _ctx.stroke();
  }

  _signals.forEach((sig, rowIdx) => {
    const y0 = HEADER_H + rowIdx * ROW_H;
    const yHigh = y0 + 6;
    const yLow = y0 + ROW_H - 6;
    const yMid = y0 + ROW_H / 2;

    _ctx.strokeStyle = COLORS.grid;
    _ctx.beginPath();
    _ctx.moveTo(LABEL_W, y0 + ROW_H);
    _ctx.lineTo(w, y0 + ROW_H);
    _ctx.stroke();

    _ctx.fillStyle = sig.color;
    _ctx.font = 'bold 10px JetBrains Mono, monospace';
    _ctx.textAlign = 'right';
    _ctx.textBaseline = 'middle';
    _ctx.fillText(sig.label, LABEL_W - 8, yMid);

    let prevVal = null;

    if (_history.length > 0 && _history[0].step === 0) {
      prevVal = _history[0].signals.get(sig.id) ?? null;
    }

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

    for (let i = 0; i < _history.length; i++) {
      const entry = _history[i];
      if (entry.step === 0) continue;

      const val = entry.signals.get(sig.id) ?? null;
      const x0 = LABEL_W + i * stepW;
      const x1 = LABEL_W + (i + 1) * stepW;

      if (val === null) continue;

      const curY = val === 1 ? yHigh : yLow;

      _ctx.strokeStyle = sig.color;
      _ctx.lineWidth = 2;
      _ctx.beginPath();

      if (prevVal !== null && prevVal !== val) {
        const prevY = prevVal === 1 ? yHigh : yLow;
        _ctx.moveTo(x0, prevY);
        _ctx.lineTo(x0, curY);
      } else {
        _ctx.moveTo(x0, curY);
      }

      _ctx.lineTo(x1, curY);
      _ctx.stroke();

      if (val === 1) {
        _ctx.fillStyle = sig.color + '10';
        _ctx.fillRect(x0, yHigh, stepW, yLow - yHigh);
      }

      prevVal = val;
    }
  });
}
