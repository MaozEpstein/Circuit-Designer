/**
 * SignalProbe — Attach probes to nodes/wires to monitor live values.
 *
 * Probes display a floating value badge near the attached point
 * and feed data into the Watch List and Waveform Viewer.
 */
import { bus } from '../core/EventBus.js';
import { formatValue } from '../engine/SimulationController.js';

let _probeIdCounter = 0;

/**
 * @typedef {object} Probe
 * @property {string} id
 * @property {string} targetId   — nodeId or wireId being probed
 * @property {string} targetType — 'node' | 'wire'
 * @property {string} label
 * @property {string} color
 * @property {number|null} currentValue
 * @property {number[]} history  — recent values for sparkline
 */

const PROBE_COLORS = [
  '#39ff14', '#00d4ff', '#ff4444', '#ffcc00',
  '#a060ff', '#ff9933', '#ff69b4', '#4a8fff',
];

export class ProbeManager {
  constructor() {
    /** @type {Map<string, Probe>} */
    this._probes = new Map();
  }

  /**
   * Attach a probe to a node.
   */
  addNodeProbe(nodeId, label = '') {
    const id = 'probe_' + (_probeIdCounter++);
    const colorIdx = this._probes.size % PROBE_COLORS.length;
    const probe = {
      id,
      targetId: nodeId,
      targetType: 'node',
      label: label || nodeId,
      color: PROBE_COLORS[colorIdx],
      currentValue: null,
      history: [],
    };
    this._probes.set(id, probe);
    bus.emit('probe:added', probe);
    return probe;
  }

  /**
   * Attach a probe to a wire.
   */
  addWireProbe(wireId, label = '') {
    const id = 'probe_' + (_probeIdCounter++);
    const colorIdx = this._probes.size % PROBE_COLORS.length;
    const probe = {
      id,
      targetId: wireId,
      targetType: 'wire',
      label: label || wireId,
      color: PROBE_COLORS[colorIdx],
      currentValue: null,
      history: [],
    };
    this._probes.set(id, probe);
    bus.emit('probe:added', probe);
    return probe;
  }

  removeProbe(probeId) {
    this._probes.delete(probeId);
    bus.emit('probe:removed', { id: probeId });
  }

  clearProbes() {
    this._probes.clear();
    bus.emit('probes:cleared');
  }

  get probes() {
    return [...this._probes.values()];
  }

  getProbe(id) {
    return this._probes.get(id) || null;
  }

  /**
   * Update all probe values from the latest evaluation result.
   */
  update(nodeValues, wireValues) {
    for (const probe of this._probes.values()) {
      const prevValue = probe.currentValue;
      if (probe.targetType === 'node') {
        probe.currentValue = nodeValues.get(probe.targetId) ?? null;
      } else {
        probe.currentValue = wireValues.get(probe.targetId) ?? null;
      }
      probe.history.push(probe.currentValue);
      if (probe.history.length > 50) probe.history.shift();

      if (prevValue !== probe.currentValue) {
        bus.emit('probe:value_changed', { probeId: probe.id, value: probe.currentValue, prev: prevValue });
      }
    }
  }

  /**
   * Get probes attached to a specific node (for rendering badges).
   */
  getProbesForNode(nodeId) {
    return this.probes.filter(p => p.targetType === 'node' && p.targetId === nodeId);
  }

  /**
   * Get probes attached to a specific wire.
   */
  getProbesForWire(wireId) {
    return this.probes.filter(p => p.targetType === 'wire' && p.targetId === wireId);
  }
}
