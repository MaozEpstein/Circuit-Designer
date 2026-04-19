/**
 * WaveformRenderer — Pure canvas drawing for the waveform viewer.
 * Reads from WaveformState; does not handle input or manage DOM state.
 */

import { state } from './WaveformState.js';
import { COLORS, METRICS, TYPE } from './WaveformTheme.js';

let _canvas, _ctx;

export function attach(canvasEl) {
  _canvas = canvasEl;
  _ctx    = canvasEl.getContext('2d');
}

export function resize() {
  if (!_canvas) return;
  const parent = _canvas.parentElement;
  if (!parent) return;
  const dpr = window.devicePixelRatio || 1;
  _canvas.width  = parent.clientWidth  * dpr;
  _canvas.height = parent.clientHeight * dpr;
  _canvas.style.width  = parent.clientWidth  + 'px';
  _canvas.style.height = parent.clientHeight + 'px';
  _ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/** Effective pixel width of a single cycle after zoom. */
export function stepWidth() {
  return METRICS.BASE_STEP_W * state.zoom;
}

/** Pixel x-coordinate of the step at index `i` (after pan + zoom). */
export function xForStep(i) {
  return METRICS.LABEL_W + i * stepWidth() - state.panOffset;
}

export function viewportWidth() {
  return _canvas.width / (window.devicePixelRatio || 1);
}

export function viewportHeight() {
  return _canvas.height / (window.devicePixelRatio || 1);
}

export function render() {
  if (!state.visible || !_ctx || state.signals.length === 0) return;

  const w = viewportWidth();
  const h = viewportHeight();

  // Background
  _ctx.fillStyle = COLORS.bg;
  _ctx.fillRect(0, 0, w, h);

  // Top border line
  _ctx.strokeStyle = COLORS.border;
  _ctx.lineWidth = 1;
  _ctx.beginPath();
  _ctx.moveTo(0, 0);
  _ctx.lineTo(w, 0);
  _ctx.stroke();

  const numSteps = state.history.length;
  if (numSteps === 0) {
    _drawEmptyHint(w, h);
    return;
  }

  _drawTimeAxis(w);
  _drawGrid(w, h);
  _drawSignals(w, h);
}

function _drawEmptyHint(w, h) {
  _ctx.fillStyle = COLORS.gridText;
  _ctx.font = TYPE.hint;
  _ctx.textAlign = 'center';
  _ctx.textBaseline = 'middle';
  _ctx.fillText('Press STEP to see waveforms', w / 2, h / 2);
}

/**
 * Time axis across the top of the data area.
 * Major ticks every N cycles (auto-chosen from zoom) with cycle numbers;
 * minor ticks between them for scale.
 */
function _drawTimeAxis(w) {
  const stepW = stepWidth();
  const numSteps = state.history.length;

  // Pick a major-tick interval that keeps labels from crowding.
  // Minimum label spacing of ~54 px keeps 5–6 digit numbers legible.
  const minLabelPx = 54;
  const minCyclesPerLabel = Math.max(1, Math.ceil(minLabelPx / stepW));
  const niceSteps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
  let major = niceSteps[niceSteps.length - 1];
  for (const s of niceSteps) { if (s >= minCyclesPerLabel) { major = s; break; } }
  const minor = Math.max(1, Math.floor(major / 5));

  _ctx.save();
  _ctx.beginPath();
  _ctx.rect(METRICS.LABEL_W, 0, w - METRICS.LABEL_W, METRICS.HEADER_H);
  _ctx.clip();

  // Minor ticks
  _ctx.strokeStyle = COLORS.axisMinor;
  _ctx.lineWidth = 1;
  for (let i = 0; i <= numSteps; i += minor) {
    const x = xForStep(i);
    if (x < METRICS.LABEL_W - 2 || x > w + 2) continue;
    _ctx.beginPath();
    _ctx.moveTo(x, METRICS.HEADER_H - 4);
    _ctx.lineTo(x, METRICS.HEADER_H);
    _ctx.stroke();
  }

  // Major ticks + labels
  _ctx.fillStyle = COLORS.gridText;
  _ctx.font = TYPE.axis;
  _ctx.textAlign = 'center';
  _ctx.textBaseline = 'middle';
  _ctx.strokeStyle = COLORS.axisMajor;

  for (let i = 0; i <= numSteps; i += major) {
    const x = xForStep(i);
    if (x < METRICS.LABEL_W - 20 || x > w + 20) continue;
    _ctx.beginPath();
    _ctx.moveTo(x, 0);
    _ctx.lineTo(x, METRICS.HEADER_H);
    _ctx.stroke();
    _ctx.fillText(String(i), x, METRICS.HEADER_H / 2);
  }

  // Bottom line of axis
  _ctx.strokeStyle = COLORS.border;
  _ctx.beginPath();
  _ctx.moveTo(METRICS.LABEL_W, METRICS.HEADER_H);
  _ctx.lineTo(w, METRICS.HEADER_H);
  _ctx.stroke();

  _ctx.restore();
}

function _drawGrid(w, h) {
  const stepW = stepWidth();
  const numSteps = state.history.length;
  _ctx.save();
  _ctx.beginPath();
  _ctx.rect(METRICS.LABEL_W, METRICS.HEADER_H, w - METRICS.LABEL_W, h - METRICS.HEADER_H);
  _ctx.clip();

  _ctx.strokeStyle = COLORS.grid;
  _ctx.lineWidth = 1;
  for (let i = 0; i <= numSteps; i++) {
    const x = xForStep(i);
    if (x < METRICS.LABEL_W - 1 || x > w + 1) continue;
    _ctx.beginPath();
    _ctx.moveTo(x, METRICS.HEADER_H);
    _ctx.lineTo(x, h);
    _ctx.stroke();
  }
  _ctx.restore();
}

function _drawSignals(w, h) {
  _ctx.save();
  _ctx.beginPath();
  _ctx.rect(METRICS.LABEL_W, METRICS.HEADER_H, w - METRICS.LABEL_W, h - METRICS.HEADER_H);
  _ctx.clip();

  state.signals.forEach((sig, rowIdx) => {
    const y0    = METRICS.HEADER_H + rowIdx * METRICS.ROW_H;
    const yHigh = y0 + 6;
    const yLow  = y0 + METRICS.ROW_H - 6;

    // Row separator
    _ctx.strokeStyle = COLORS.grid;
    _ctx.beginPath();
    _ctx.moveTo(METRICS.LABEL_W, y0 + METRICS.ROW_H);
    _ctx.lineTo(w, y0 + METRICS.ROW_H);
    _ctx.stroke();

    let prevVal = null;
    if (state.history.length > 0 && state.history[0].step === 0) {
      prevVal = state.history[0].signals.get(sig.id) ?? null;
    }

    // Initial segment (step 0 area before the first recorded transition)
    if (prevVal !== null) {
      const initX0 = xForStep(0);
      const initX1 = xForStep(1);
      const initY = prevVal === 1 ? yHigh : yLow;
      _ctx.strokeStyle = sig.color;
      _ctx.lineWidth = 2;
      _ctx.beginPath();
      _ctx.moveTo(initX0, initY);
      _ctx.lineTo(initX1, initY);
      _ctx.stroke();
    }

    for (let i = 0; i < state.history.length; i++) {
      const entry = state.history[i];
      if (entry.step === 0) continue;

      const val = entry.signals.get(sig.id) ?? null;
      const x0 = xForStep(i);
      const x1 = xForStep(i + 1);
      if (x1 < METRICS.LABEL_W || x0 > w) { prevVal = val; continue; } // skip offscreen
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
        _ctx.fillRect(x0, yHigh, x1 - x0, yLow - yHigh);
      }

      prevVal = val;
    }
  });

  _ctx.restore();

  // Signal labels (outside the clipped area so they never get cut)
  state.signals.forEach((sig, rowIdx) => {
    const yMid = METRICS.HEADER_H + rowIdx * METRICS.ROW_H + METRICS.ROW_H / 2;
    _ctx.fillStyle = sig.color;
    _ctx.font = TYPE.label;
    _ctx.textAlign = 'right';
    _ctx.textBaseline = 'middle';
    _ctx.fillText(sig.label, METRICS.LABEL_W - 8, yMid);
  });
}
