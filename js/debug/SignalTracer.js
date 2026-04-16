/**
 * SignalTracer — Highlight signal paths from source to destination.
 *
 * Traces forward (from a node to all its downstream consumers)
 * or backward (from a node to all its upstream sources).
 * Provides highlight data for the renderer.
 */
import { bus } from '../core/EventBus.js';

export class SignalTracer {
  constructor() {
    this._active = false;
    this._highlightedNodes = new Set();
    this._highlightedWires = new Set();
    this._traceColor = '#ffcc00';
    this._direction = 'forward'; // 'forward' | 'backward'
  }

  get active() { return this._active; }
  get highlightedNodes() { return this._highlightedNodes; }
  get highlightedWires() { return this._highlightedWires; }
  get traceColor() { return this._traceColor; }

  /**
   * Trace forward from a node — highlight all downstream nodes and wires.
   */
  traceForward(startNodeId, nodes, wires) {
    this._clear();
    this._direction = 'forward';
    this._traceColor = '#39ff14';

    const visited = new Set();
    const queue = [startNodeId];

    while (queue.length > 0) {
      const id = queue.shift();
      if (visited.has(id)) continue;
      visited.add(id);
      this._highlightedNodes.add(id);

      // Find outgoing wires
      for (const wire of wires) {
        if (wire.sourceId === id) {
          this._highlightedWires.add(wire.id);
          if (!visited.has(wire.targetId)) {
            queue.push(wire.targetId);
          }
        }
      }
    }

    this._active = true;
    bus.emit('trace:started', {
      direction: 'forward',
      startNode: startNodeId,
      nodeCount: this._highlightedNodes.size,
      wireCount: this._highlightedWires.size,
    });
  }

  /**
   * Trace backward from a node — highlight all upstream sources.
   */
  traceBackward(startNodeId, nodes, wires) {
    this._clear();
    this._direction = 'backward';
    this._traceColor = '#00d4ff';

    const visited = new Set();
    const queue = [startNodeId];

    while (queue.length > 0) {
      const id = queue.shift();
      if (visited.has(id)) continue;
      visited.add(id);
      this._highlightedNodes.add(id);

      // Find incoming wires
      for (const wire of wires) {
        if (wire.targetId === id) {
          this._highlightedWires.add(wire.id);
          if (!visited.has(wire.sourceId)) {
            queue.push(wire.sourceId);
          }
        }
      }
    }

    this._active = true;
    bus.emit('trace:started', {
      direction: 'backward',
      startNode: startNodeId,
      nodeCount: this._highlightedNodes.size,
      wireCount: this._highlightedWires.size,
    });
  }

  /**
   * Stop tracing.
   */
  stop() {
    this._clear();
    bus.emit('trace:stopped');
  }

  _clear() {
    this._active = false;
    this._highlightedNodes.clear();
    this._highlightedWires.clear();
  }
}
