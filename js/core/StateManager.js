/**
 * StateManager — Centralized, event-driven application state.
 * All state changes emit events so UI and other systems can react.
 */
import { bus } from './EventBus.js';

export class StateManager {
  constructor() {
    // Active tool
    this._tool = 'select';

    // Selection
    this._selectedNodeId = null;
    this._hoveredNodeId = null;

    // Sequential state
    this._ffStates = new Map();
    this._stepCount = 0;
    this._clockHigh = false;

    // Simulation running
    this._simulating = false;
  }

  // ── Tool ──────────────────────────────────────────────────

  get tool() { return this._tool; }
  set tool(value) {
    const prev = this._tool;
    this._tool = value;
    if (prev !== value) bus.emit('tool:changed', { tool: value, prev });
  }

  // ── Selection ─────────────────────────────────────────────

  get selectedNodeId() { return this._selectedNodeId; }
  set selectedNodeId(id) {
    const prev = this._selectedNodeId;
    this._selectedNodeId = id;
    if (prev !== id) bus.emit('selection:changed', { id, prev });
  }

  get hoveredNodeId() { return this._hoveredNodeId; }
  set hoveredNodeId(id) {
    const prev = this._hoveredNodeId;
    this._hoveredNodeId = id;
    if (prev !== id) bus.emit('hover:changed', { id, prev });
  }

  // ── Sequential / Clock ────────────────────────────────────

  get ffStates() { return this._ffStates; }

  get stepCount() { return this._stepCount; }
  set stepCount(v) {
    this._stepCount = v;
    bus.emit('step:changed', v);
  }

  get clockHigh() { return this._clockHigh; }
  set clockHigh(v) { this._clockHigh = v; }

  // ── Simulation ────────────────────────────────────────────

  get simulating() { return this._simulating; }
  set simulating(v) {
    this._simulating = v;
    bus.emit('simulation:toggled', v);
  }

  // ── FF State Management ───────────────────────────────────

  initFfStates(components) {
    this._ffStates = new Map();
    for (const comp of components) {
      if (comp.type === 'FF_SLOT' || comp.type === 'FLIPFLOP_D' ||
          comp.type === 'FLIPFLOP_SR' || comp.type === 'FLIPFLOP_JK' ||
          comp.type === 'FLIPFLOP_T') {
        const q0 = comp.initialQ ?? 0;
        this._ffStates.set(comp.id, { q: q0, qNot: q0 ^ 1, prevClkValue: null });
      }
    }
  }

  ensureFfState(nodeId, initialQ = 0) {
    if (!this._ffStates.has(nodeId)) {
      this._ffStates.set(nodeId, { q: initialQ, qNot: initialQ ^ 1, prevClkValue: null });
    }
  }

  resetSequentialState(components) {
    this.initFfStates(components);
    this._stepCount = 0;
    this._clockHigh = false;
    bus.emit('step:changed', 0);
  }
}
