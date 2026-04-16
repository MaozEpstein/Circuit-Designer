/**
 * SimulationController — High-level simulation manager.
 *
 * Wraps the core evaluate() function with:
 *   - Propagation delay modeling
 *   - Breakpoints (pause on signal conditions)
 *   - Simulation speed control
 *   - Step-by-step execution with full state snapshots
 *   - Oscillation / feedback loop detection
 *   - Glitch detection and hazard analysis
 *   - Signal value format conversion
 *   - Multi-clock domain tracking
 */
import { bus } from '../core/EventBus.js';
import { evaluate as coreEvaluate } from './SimulationEngine.js';

// ── Signal Value Formats ────────────────────────────────────

export const VALUE_FORMAT = {
  BIN: 'bin',
  DEC: 'dec',
  HEX: 'hex',
};

/**
 * Format a signal value according to the selected format.
 */
export function formatValue(value, format = VALUE_FORMAT.BIN, bitWidth = 1) {
  if (value === null || value === undefined) return '?';
  switch (format) {
    case VALUE_FORMAT.HEX:
      return '0x' + (value >>> 0).toString(16).toUpperCase().padStart(Math.ceil(bitWidth / 4), '0');
    case VALUE_FORMAT.DEC:
      return value.toString();
    case VALUE_FORMAT.BIN:
    default:
      return value.toString(2).padStart(bitWidth, '0');
  }
}

// ── Breakpoint System ───────────────────────────────────────

/**
 * @typedef {object} Breakpoint
 * @property {string} id
 * @property {string} nodeId - Node to watch
 * @property {string} condition - 'eq'|'neq'|'rising'|'falling'|'any_change'
 * @property {number|null} value - Value to compare (for eq/neq)
 * @property {boolean} enabled
 * @property {string} [label]
 */

let _bpIdCounter = 0;

export function createBreakpoint(nodeId, condition = 'any_change', value = null, label = '') {
  return {
    id: 'bp_' + (_bpIdCounter++),
    nodeId,
    condition,
    value,
    enabled: true,
    label: label || `BP on ${nodeId}`,
  };
}

// ── Simulation Controller ───────────────────────────────────

export class SimulationController {
  constructor() {
    // Breakpoints
    this._breakpoints = [];

    // State history for step inspection
    this._history = [];        // Array of { step, nodeValues, wireValues, ffStates }
    this._maxHistory = 500;

    // Previous values for change detection
    this._prevNodeValues = new Map();

    // Simulation speed (ms between auto-clock ticks)
    this._speed = 600;         // Default: 600ms
    this._paused = false;

    // Value display format
    this._valueFormat = VALUE_FORMAT.BIN;

    // Glitch detection
    this._glitches = [];       // Array of { nodeId, step, fromValue, toValue, intermediateValue }

    // Oscillation detection
    this._oscillationLimit = 100;  // Max re-evaluations before declaring oscillation
    this._lastOscillationError = null;

    // Multi-clock domains
    this._clockDomains = new Map(); // clockNodeId → Set<nodeId>

    // Propagation delay config (per component type, in "ticks")
    this._propagationDelays = {
      GATE_SLOT: 1,
      FF_SLOT: 0,       // FFs update on clock edge, no combinational delay
      CLOCK: 0,
      INPUT: 0,
      OUTPUT: 0,
      MUX_SELECT: 0,
      DISPLAY_7SEG: 0,
    };

    // Delayed signals queue (for propagation delay simulation)
    this._delayQueue = [];     // { nodeId, value, deliverAtTick }
    this._simTick = 0;
  }

  // ── Propagation Delay ───────────────────────────────────────

  /**
   * Set propagation delay for a component type (in simulation ticks).
   */
  setPropagationDelay(componentType, ticks) {
    this._propagationDelays[componentType] = ticks;
  }

  getPropagationDelay(componentType) {
    return this._propagationDelays[componentType] || 0;
  }

  // ── Breakpoints ─────────────────────────────────────────────

  addBreakpoint(nodeId, condition = 'any_change', value = null, label = '') {
    const bp = createBreakpoint(nodeId, condition, value, label);
    this._breakpoints.push(bp);
    bus.emit('breakpoint:added', bp);
    return bp;
  }

  removeBreakpoint(bpId) {
    this._breakpoints = this._breakpoints.filter(b => b.id !== bpId);
    bus.emit('breakpoint:removed', { id: bpId });
  }

  toggleBreakpoint(bpId) {
    const bp = this._breakpoints.find(b => b.id === bpId);
    if (bp) {
      bp.enabled = !bp.enabled;
      bus.emit('breakpoint:toggled', bp);
    }
  }

  get breakpoints() { return this._breakpoints; }

  clearBreakpoints() {
    this._breakpoints = [];
    bus.emit('breakpoints:cleared');
  }

  /**
   * Check if any breakpoint should trigger.
   * @returns {Breakpoint|null} The triggered breakpoint, or null.
   */
  _checkBreakpoints(nodeValues) {
    for (const bp of this._breakpoints) {
      if (!bp.enabled) continue;
      const current = nodeValues.get(bp.nodeId) ?? null;
      const prev = this._prevNodeValues.get(bp.nodeId) ?? null;

      let triggered = false;
      switch (bp.condition) {
        case 'eq':
          triggered = current === bp.value;
          break;
        case 'neq':
          triggered = current !== bp.value;
          break;
        case 'rising':
          triggered = prev === 0 && current === 1;
          break;
        case 'falling':
          triggered = prev === 1 && current === 0;
          break;
        case 'any_change':
          triggered = prev !== null && current !== prev;
          break;
      }

      if (triggered) return bp;
    }
    return null;
  }

  // ── Simulation Speed ────────────────────────────────────────

  get speed() { return this._speed; }
  set speed(ms) {
    this._speed = Math.max(50, Math.min(5000, ms));
    bus.emit('simulation:speed_changed', this._speed);
  }

  get paused() { return this._paused; }
  set paused(v) {
    this._paused = v;
    bus.emit('simulation:paused', v);
  }

  // ── Value Format ──────────────────────────────────────────

  get valueFormat() { return this._valueFormat; }
  set valueFormat(fmt) {
    this._valueFormat = fmt;
    bus.emit('simulation:format_changed', fmt);
  }

  // ── History / State Inspection ────────────────────────────

  get history() { return this._history; }

  getStateAtStep(step) {
    return this._history.find(h => h.step === step) || null;
  }

  clearHistory() {
    this._history = [];
  }

  // ── Glitch Detection ──────────────────────────────────────

  get glitches() { return this._glitches; }

  clearGlitches() {
    this._glitches = [];
  }

  // ── Oscillation Detection ─────────────────────────────────

  get lastOscillationError() { return this._lastOscillationError; }

  // ── Multi-Clock Domains ───────────────────────────────────

  get clockDomains() { return this._clockDomains; }

  /**
   * Analyze which nodes belong to which clock domain.
   * A clock domain is the set of FF nodes driven by the same clock source.
   */
  analyzeClockDomains(nodes, wires) {
    this._clockDomains.clear();

    const clockNodes = nodes.filter(n => n.type === 'CLOCK');

    for (const clk of clockNodes) {
      const domain = new Set();
      // Find all wires from this clock
      const clkWires = wires.filter(w => w.sourceId === clk.id);
      // Trace to FF nodes
      const visited = new Set();
      const queue = clkWires.map(w => w.targetId);

      while (queue.length > 0) {
        const id = queue.shift();
        if (visited.has(id)) continue;
        visited.add(id);
        const node = nodes.find(n => n.id === id);
        if (!node) continue;

        if (node.type === 'FF_SLOT' || node.type.startsWith('FLIPFLOP_')) {
          domain.add(id);
        }
        // Continue through combinational logic
        wires.filter(w => w.sourceId === id).forEach(w => queue.push(w.targetId));
      }

      if (domain.size > 0) {
        this._clockDomains.set(clk.id, domain);
      }
    }

    // Report cross-domain signals
    if (clockNodes.length > 1) {
      bus.emit('simulation:multi_clock', {
        domainCount: this._clockDomains.size,
        domains: [...this._clockDomains.entries()].map(([clkId, nodes]) => ({
          clockId: clkId,
          nodeCount: nodes.size,
        })),
      });
    }
  }

  // ── Core Evaluation ───────────────────────────────────────

  /**
   * Run one evaluation cycle.
   * Returns the evaluation result plus simulation metadata.
   *
   * @param {object[]} nodes
   * @param {object[]} wires
   * @param {Map} ffStates
   * @param {number} stepCount
   * @returns {{ nodeValues, wireValues, ffUpdated, breakpointHit, oscillation, glitchesDetected }}
   */
  evaluate(nodes, wires, ffStates, stepCount) {
    this._simTick++;

    // Run core evaluation
    const result = coreEvaluate(nodes, wires, ffStates, stepCount);

    // ── Oscillation detection ─────────────────────────────
    // Re-evaluate to check for feedback loops causing value changes
    let oscillation = false;
    let reEvalCount = 0;
    let changed = result.ffUpdated;

    while (changed && reEvalCount < this._oscillationLimit) {
      reEvalCount++;
      const reResult = coreEvaluate(nodes, wires, ffStates, stepCount);

      // Check if values stabilized
      changed = false;
      for (const [id, val] of reResult.nodeValues) {
        if (result.nodeValues.get(id) !== val) {
          changed = true;
          result.nodeValues.set(id, val);
        }
      }
      for (const [id, val] of reResult.wireValues) {
        if (result.wireValues.get(id) !== val) {
          changed = true;
          result.wireValues.set(id, val);
        }
      }

      if (reEvalCount >= this._oscillationLimit) {
        oscillation = true;
        this._lastOscillationError = {
          step: stepCount,
          message: `Oscillation detected: circuit did not stabilize after ${this._oscillationLimit} iterations`,
          affectedNodes: [...result.nodeValues.keys()].filter(id =>
            result.nodeValues.get(id) !== this._prevNodeValues.get(id)
          ),
        };
        bus.emit('simulation:oscillation', this._lastOscillationError);
      }
    }

    // ── Glitch detection ──────────────────────────────────
    let glitchesDetected = [];
    if (this._prevNodeValues.size > 0) {
      for (const [id, newVal] of result.nodeValues) {
        if (id.endsWith('__qnot')) continue;
        const prevVal = this._prevNodeValues.get(id);
        if (prevVal !== undefined && prevVal !== null && newVal !== null) {
          // A glitch is a brief intermediate value between two stable states
          // We detect value changes that happen within the same step
          // (multiple transitions in one evaluation cycle)
          if (reEvalCount > 1 && prevVal !== newVal) {
            const glitch = {
              nodeId: id,
              step: stepCount,
              fromValue: prevVal,
              toValue: newVal,
            };
            glitchesDetected.push(glitch);
            this._glitches.push(glitch);
          }
        }
      }
      if (glitchesDetected.length > 0) {
        bus.emit('simulation:glitches', glitchesDetected);
      }
    }

    // ── Breakpoint check ──────────────────────────────────
    const breakpointHit = this._checkBreakpoints(result.nodeValues);
    if (breakpointHit) {
      this._paused = true;
      bus.emit('breakpoint:hit', {
        breakpoint: breakpointHit,
        step: stepCount,
        nodeValues: result.nodeValues,
      });
    }

    // ── Record history ────────────────────────────────────
    this._history.push({
      step: stepCount,
      tick: this._simTick,
      nodeValues: new Map(result.nodeValues),
      wireValues: new Map(result.wireValues),
      ffStates: new Map([...ffStates].map(([k, v]) => [k, { ...v }])),
      breakpointHit: breakpointHit ? breakpointHit.id : null,
      glitches: glitchesDetected,
    });
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }

    // Update previous values
    this._prevNodeValues = new Map(result.nodeValues);

    return {
      ...result,
      breakpointHit,
      oscillation,
      glitchesDetected,
      reEvalCount,
    };
  }

  /**
   * Reset the controller state.
   */
  reset() {
    this._history = [];
    this._prevNodeValues = new Map();
    this._glitches = [];
    this._lastOscillationError = null;
    this._delayQueue = [];
    this._simTick = 0;
    this._paused = false;
    this._clockDomains.clear();
  }
}
