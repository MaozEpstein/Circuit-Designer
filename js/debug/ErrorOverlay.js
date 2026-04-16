/**
 * ErrorOverlay — Detect and highlight nodes with undefined,
 * conflicting, or unconnected signals.
 *
 * Provides a list of diagnostic errors for the renderer to display.
 */
import { bus } from '../core/EventBus.js';
import { FF_TYPE_SET } from '../components/Component.js';

/**
 * @typedef {object} DiagnosticError
 * @property {string} nodeId
 * @property {string} severity — 'error' | 'warning'
 * @property {string} message
 */

export class ErrorOverlay {
  constructor() {
    /** @type {DiagnosticError[]} */
    this._errors = [];
    this._enabled = true;
  }

  get enabled() { return this._enabled; }
  set enabled(v) { this._enabled = v; }

  get errors() { return this._errors; }

  /**
   * Get errors for a specific node.
   */
  getErrorsForNode(nodeId) {
    return this._errors.filter(e => e.nodeId === nodeId);
  }

  /**
   * Get all error node IDs (for renderer highlighting).
   */
  get errorNodeIds() {
    return new Set(this._errors.filter(e => e.severity === 'error').map(e => e.nodeId));
  }

  get warningNodeIds() {
    return new Set(this._errors.filter(e => e.severity === 'warning').map(e => e.nodeId));
  }

  /**
   * Run diagnostics on the current circuit state.
   *
   * @param {object[]} nodes
   * @param {object[]} wires
   * @param {Map} nodeValues - Latest evaluation results
   */
  analyze(nodes, wires, nodeValues) {
    if (!this._enabled) {
      this._errors = [];
      return;
    }

    const errors = [];
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    // Build connection info
    const hasInput = new Set();
    const hasOutput = new Set();
    wires.forEach(w => {
      hasOutput.add(w.sourceId);
      hasInput.add(w.targetId);
    });

    for (const node of nodes) {
      const val = nodeValues.get(node.id);

      // ── Unconnected nodes ───────────────────────────────
      if (node.type === 'GATE_SLOT' && !hasInput.has(node.id)) {
        errors.push({
          nodeId: node.id,
          severity: 'warning',
          message: `${node.label || 'Gate'}: no input connections`,
        });
      }

      if (node.type === 'OUTPUT' && !hasInput.has(node.id)) {
        errors.push({
          nodeId: node.id,
          severity: 'error',
          message: `${node.label || 'Output'}: not connected to any source`,
        });
      }

      if (node.type === 'INPUT' && !hasOutput.has(node.id)) {
        errors.push({
          nodeId: node.id,
          severity: 'warning',
          message: `${node.label || 'Input'}: not connected to anything`,
        });
      }

      // ── Undefined signals ─────────────────────────────
      if (val === null || val === undefined) {
        if (node.type === 'GATE_SLOT' && node.gate != null) {
          errors.push({
            nodeId: node.id,
            severity: 'error',
            message: `${node.label || 'Gate'}: output is undefined (check inputs)`,
          });
        }
        if (node.type === 'OUTPUT' && hasInput.has(node.id)) {
          errors.push({
            nodeId: node.id,
            severity: 'error',
            message: `${node.label || 'Output'}: receiving undefined signal`,
          });
        }
      }

      // ── Empty gate/FF slots ───────────────────────────
      if (node.type === 'GATE_SLOT' && node.gate == null && hasInput.has(node.id)) {
        errors.push({
          nodeId: node.id,
          severity: 'warning',
          message: `Gate slot is empty but has wired inputs`,
        });
      }

      if (node.type === 'FF_SLOT' && !node.ffType && hasInput.has(node.id)) {
        errors.push({
          nodeId: node.id,
          severity: 'warning',
          message: `Flip-flop slot is empty but has wired inputs`,
        });
      }

      // ── FF without clock ──────────────────────────────
      if (FF_TYPE_SET.has(node.type) && node.type !== 'FF_SLOT') {
        const clkWire = wires.find(w => w.targetId === node.id && w.isClockWire);
        if (!clkWire) {
          errors.push({
            nodeId: node.id,
            severity: 'warning',
            message: `${node.label || 'FF'}: no clock wire connected`,
          });
        }
      }
      if (node.type === 'FF_SLOT' && node.ffType) {
        const clkWire = wires.find(w => w.targetId === node.id && w.isClockWire);
        const anyWire = wires.find(w => w.targetId === node.id);
        if (!clkWire && anyWire) {
          errors.push({
            nodeId: node.id,
            severity: 'warning',
            message: `${node.label || 'FF'}: no clock wire (mark a wire as Clock Wire)`,
          });
        }
      }
    }

    this._errors = errors;

    if (errors.length > 0) {
      bus.emit('errors:updated', errors);
    }
  }

  /**
   * Render errors to a container element.
   */
  renderTo(container) {
    if (!container) return;

    if (this._errors.length === 0) {
      container.innerHTML = '<div style="color:#39ff14;font-size:9px;padding:4px">&#10003; No errors detected</div>';
      return;
    }

    let html = '';
    for (const err of this._errors) {
      const icon = err.severity === 'error' ? '&#9888;' : '&#9432;';
      const color = err.severity === 'error' ? '#ff4444' : '#ffcc00';
      html += `<div class="error-item" style="color:${color};font-size:9px;padding:2px 4px">${icon} ${err.message}</div>`;
    }
    container.innerHTML = html;
  }

  clear() {
    this._errors = [];
  }
}
