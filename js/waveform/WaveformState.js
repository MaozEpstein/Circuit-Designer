/**
 * WaveformState — Centralized mutable state for the waveform module.
 * All views (renderer, controller) read from here; only state-specific
 * functions mutate it.
 */

import { COLORS } from './WaveformTheme.js';

// Recorded signal history: array of { step, signals: Map<signalId, value> }
// Capped by a circular-buffer policy enforced in `record()` below.
const HISTORY_CAP = 20000;

export const state = {
  history: [],
  signals: [],
  visible: false,
  // View state — zoom is a multiplier on BASE_STEP_W; panOffset is in pixels
  // from the left of the data area (LABEL_W).
  zoom: 1,
  panOffset: 0,
  panelHeight: 220,
};

export function reset() {
  state.history = [];
  state.signals = [];
  state.zoom = 1;
  state.panOffset = 0;
}

export function setSignals(nodes) {
  if (!nodes) return;
  state.signals = [];

  nodes.forEach(n => {
    if (n.type === 'CLOCK') state.signals.push({ id: n.id, label: 'CLK', color: COLORS.clock, type: 'clock' });
  });
  nodes.forEach(n => {
    if (n.type === 'INPUT') state.signals.push({ id: n.id, label: n.label || n.id, color: COLORS.high, type: 'input' });
  });
  nodes.forEach(n => {
    if (n.type === 'MUX_SELECT') state.signals.push({ id: n.id, label: n.label || n.id, color: '#a060ff', type: 'mux' });
  });
  nodes.forEach(n => {
    if (n.type === 'OUTPUT') state.signals.push({ id: n.id, label: n.label || n.id, color: COLORS.accent, type: 'output' });
  });
}

export function record(stepCount, nodeValues) {
  if (!nodeValues) return;
  const signals = new Map();
  state.signals.forEach(sig => {
    signals.set(sig.id, nodeValues.get(sig.id) ?? null);
  });
  const last = state.history[state.history.length - 1];
  if (last && last.step === stepCount) {
    last.signals = signals;
  } else {
    state.history.push({ step: stepCount, signals });
  }
  // Circular buffer: drop oldest when cap exceeded.
  if (state.history.length > HISTORY_CAP) {
    state.history.splice(0, state.history.length - HISTORY_CAP);
  }
}
