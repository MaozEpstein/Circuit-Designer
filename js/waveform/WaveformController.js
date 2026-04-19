/**
 * WaveformController — Public API + input handling for the waveform.
 * Wires up zoom, pan, resize, and keyboard shortcuts. All mutating
 * actions funnel through here; the renderer stays pure.
 */

import { state, reset as stateReset, setSignals as stateSetSignals, record as stateRecord } from './WaveformState.js';
import * as Renderer from './WaveformRenderer.js';
import { METRICS } from './WaveformTheme.js';

let _canvas = null;
let _panel  = null;
let _rafPending = false;

// ── Public API (keeps the old surface so app.js doesn't change) ──
export function init(canvasEl) {
  _canvas = canvasEl;
  Renderer.attach(canvasEl);
  _panel = document.getElementById('waveform-panel');
  _attachInput();
  _attachResize();
  _attachKeyboard();
}

export function reset()            { stateReset(); _requestRender(); }
export function setSignals(nodes)  { stateSetSignals(nodes); _requestRender(); }
export function record(step, vals) { stateRecord(step, vals); _requestRender(); }
export function isVisible()        { return state.visible; }

export function show() {
  state.visible = true;
  requestAnimationFrame(() => { Renderer.resize(); Renderer.render(); });
}
export function hide() { state.visible = false; }
export function toggle() { state.visible ? hide() : show(); }

export function render() {
  if (!state.visible) return;
  Renderer.render();
}

/** Public action: fit the entire recorded history into the visible area. */
export function fitToWindow() {
  const n = state.history.length;
  if (n === 0) return;
  const avail = Renderer.viewportWidth() - METRICS.LABEL_W - 8;
  const desiredStep = Math.max(4, avail / n);
  const z = desiredStep / METRICS.BASE_STEP_W;
  state.zoom = Math.max(METRICS.MIN_ZOOM, Math.min(METRICS.MAX_ZOOM, z));
  state.panOffset = 0;
  _requestRender();
}

// ── rAF-coalesced render (performance budget) ───────────────────
function _requestRender() {
  if (_rafPending || !state.visible) return;
  _rafPending = true;
  requestAnimationFrame(() => {
    _rafPending = false;
    Renderer.render();
  });
}

// ── Input: Zoom (Ctrl+Scroll) + Pan (Shift+Scroll or plain drag) ─
function _attachInput() {
  if (!_canvas) return;

  _canvas.addEventListener('wheel', (e) => {
    if (!state.visible) return;

    if (e.ctrlKey) {
      // Ctrl+wheel = zoom around the cursor position.
      e.preventDefault();
      const rect   = _canvas.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const dataX  = cursorX - METRICS.LABEL_W + state.panOffset;
      const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const newZoom = Math.max(METRICS.MIN_ZOOM, Math.min(METRICS.MAX_ZOOM, state.zoom * zoomFactor));
      const ratio = newZoom / state.zoom;
      state.panOffset = dataX * ratio - (cursorX - METRICS.LABEL_W);
      state.zoom = newZoom;
      _clampPan();
      _requestRender();
    } else {
      // Plain wheel = horizontal pan (either axis delta — right/left on a
      // horizontal wheel, or up/down on a regular wheel, both scroll along
      // the time axis). Shift+wheel still works for the same reason.
      e.preventDefault();
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      state.panOffset += dx;
      _clampPan();
      _requestRender();
    }
  }, { passive: false });

  // Drag-to-pan with middle or left button on the data area.
  let dragging = false;
  let dragStartX = 0;
  let dragStartPan = 0;
  _canvas.addEventListener('mousedown', (e) => {
    if (!state.visible) return;
    // Only inside the data area; leave the label column alone.
    const rect = _canvas.getBoundingClientRect();
    if (e.clientX - rect.left < METRICS.LABEL_W) return;
    dragging = true;
    dragStartX = e.clientX;
    dragStartPan = state.panOffset;
    _canvas.style.cursor = 'grabbing';
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    state.panOffset = dragStartPan - (e.clientX - dragStartX);
    _clampPan();
    _requestRender();
  });
  window.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    _canvas.style.cursor = '';
  });
}

function _clampPan() {
  const stepW = METRICS.BASE_STEP_W * state.zoom;
  const totalWidth = state.history.length * stepW;
  const avail = Renderer.viewportWidth() - METRICS.LABEL_W - 8;
  const maxPan = Math.max(0, totalWidth - avail);
  if (state.panOffset < 0) state.panOffset = 0;
  if (state.panOffset > maxPan) state.panOffset = maxPan;
}

// ── Input: Panel vertical resize via top-edge drag handle ────────
function _attachResize() {
  const handle = document.getElementById('waveform-resize-top');
  if (!handle || !_panel) { console.warn('[Waveform] resize handle not found'); return; }
  let dragging = false;
  let startY = 0;
  let startH = 0;
  let moveCount = 0;

  handle.addEventListener('mousedown', (e) => {
    console.log('[Waveform] resize mousedown fired', { y: e.clientY });
    dragging = true;
    moveCount = 0;
    startY = e.clientY;
    startH = _panel.getBoundingClientRect().height;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ns-resize';
    e.preventDefault();
    e.stopPropagation();
  });

  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    moveCount++;
    if (moveCount === 1 || moveCount % 30 === 0) {
      console.log('[Waveform] resize mousemove', { delta: startY - e.clientY, moves: moveCount });
    }
    // Panel is pinned at bottom; mouse moves UP → height increases.
    const delta = startY - e.clientY;
    const maxH = window.innerHeight * METRICS.MAX_PANEL_FRAC;
    const newH = Math.max(METRICS.MIN_PANEL_H, Math.min(maxH, startH + delta));
    _panel.style.height = newH + 'px';
    state.panelHeight = newH;
    Renderer.resize();
    _requestRender();
  });

  window.addEventListener('mouseup', () => {
    if (!dragging) return;
    console.log('[Waveform] resize mouseup — moves=' + moveCount);
    dragging = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  });
}

// ── Input: Keyboard shortcuts (F = fit-to-window) ────────────────
function _attachKeyboard() {
  window.addEventListener('keydown', (e) => {
    if (!state.visible) return;
    const isTyping = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
    if (isTyping) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      fitToWindow();
    }
  });
}
