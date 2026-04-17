/**
 * SelectionManager — Multi-select, copy/paste, align, distribute.
 *
 * Supports:
 *   - Rubber-band (marquee) selection
 *   - Shift+click to add/remove from selection
 *   - Copy/paste with offset
 *   - Align (left, right, top, bottom, center-h, center-v)
 *   - Distribute (horizontal, vertical)
 */
import { bus } from '../core/EventBus.js';
import { generateId } from '../core/SceneGraph.js';

export class SelectionManager {
  constructor(scene, commands) {
    this._scene = scene;
    this._commands = commands;

    /** @type {Set<string>} selected node IDs */
    this._selected = new Set();

    // Rubber-band state
    this._rubberBanding = false;
    this._rbStart = { x: 0, y: 0 };
    this._rbEnd = { x: 0, y: 0 };

    // Clipboard
    this._clipboard = null; // { nodes: [], wires: [] }
  }

  get selected() { return this._selected; }
  get count() { return this._selected.size; }
  get rubberBanding() { return this._rubberBanding; }
  get rubberBandRect() {
    if (!this._rubberBanding) return null;
    return {
      x: Math.min(this._rbStart.x, this._rbEnd.x),
      y: Math.min(this._rbStart.y, this._rbEnd.y),
      w: Math.abs(this._rbEnd.x - this._rbStart.x),
      h: Math.abs(this._rbEnd.y - this._rbStart.y),
    };
  }

  // ── Selection ─────────────────────────────────────────────

  select(nodeId) {
    this._selected.clear();
    this._selected.add(nodeId);
    bus.emit('multiselect:changed', [...this._selected]);
  }

  toggleSelect(nodeId) {
    if (this._selected.has(nodeId)) {
      this._selected.delete(nodeId);
    } else {
      this._selected.add(nodeId);
    }
    bus.emit('multiselect:changed', [...this._selected]);
  }

  selectAll() {
    this._selected.clear();
    for (const node of this._scene.nodes) {
      this._selected.add(node.id);
    }
    bus.emit('multiselect:changed', [...this._selected]);
  }

  clearSelection() {
    this._selected.clear();
    bus.emit('multiselect:changed', []);
  }

  isSelected(nodeId) {
    return this._selected.has(nodeId);
  }

  // ── Rubber-band ───────────────────────────────────────────

  startRubberBand(worldX, worldY) {
    this._rubberBanding = true;
    this._rbStart = { x: worldX, y: worldY };
    this._rbEnd = { x: worldX, y: worldY };
  }

  updateRubberBand(worldX, worldY) {
    this._rbEnd = { x: worldX, y: worldY };
  }

  finishRubberBand(addToSelection = false) {
    if (!this._rubberBanding) return;

    // Compute rect BEFORE clearing the flag
    const rect = {
      x: Math.min(this._rbStart.x, this._rbEnd.x),
      y: Math.min(this._rbStart.y, this._rbEnd.y),
      w: Math.abs(this._rbEnd.x - this._rbStart.x),
      h: Math.abs(this._rbEnd.y - this._rbStart.y),
    };
    this._rubberBanding = false;

    if (rect.w < 5 || rect.h < 5) return;

    if (!addToSelection) this._selected.clear();

    // Select nodes inside the rectangle
    for (const node of this._scene.nodes) {
      if (node.x >= rect.x && node.x <= rect.x + rect.w &&
          node.y >= rect.y && node.y <= rect.y + rect.h) {
        this._selected.add(node.id);
      }
    }

    bus.emit('multiselect:changed', [...this._selected]);
  }

  // ── Copy / Paste ──────────────────────────────────────────

  copy() {
    if (this._selected.size === 0) return;

    const nodeIds = this._selected;
    const nodes = this._scene.nodes.filter(n => nodeIds.has(n.id)).map(n => ({ ...n }));
    const wires = this._scene.wires.filter(w =>
      nodeIds.has(w.sourceId) && nodeIds.has(w.targetId)
    ).map(w => ({ ...w }));

    this._clipboard = { nodes, wires };
    bus.emit('clipboard:copied', { nodeCount: nodes.length, wireCount: wires.length });
  }

  paste(offsetX = 40, offsetY = 40) {
    if (!this._clipboard || this._clipboard.nodes.length === 0) return;

    // Create ID mapping for the new copies
    const idMap = new Map();
    const newNodes = this._clipboard.nodes.map(n => {
      const newId = generateId('n');
      idMap.set(n.id, newId);
      return { ...n, id: newId, x: n.x + offsetX, y: n.y + offsetY };
    });

    const newWires = this._clipboard.wires.map(w => {
      const newId = generateId('w');
      return {
        ...w,
        id: newId,
        sourceId: idMap.get(w.sourceId) || w.sourceId,
        targetId: idMap.get(w.targetId) || w.targetId,
        waypoints: (w.waypoints || []).map(wp => ({ x: wp.x + offsetX, y: wp.y + offsetY })),
      };
    });

    // Add to scene
    const before = this._scene.snapshot();
    for (const node of newNodes) this._scene.addNode(node);
    for (const wire of newWires) this._scene.addWire(wire);
    const after = this._scene.snapshot();

    // Record for undo
    this._commands._undoStack.push({
      description: 'Paste',
      execute() { /* already done */ },
      undo: () => this._scene.restoreSnapshot(before),
    });
    this._commands._redoStack = [];
    bus.emit('history:changed', { canUndo: this._commands.canUndo, canRedo: this._commands.canRedo });

    // Select the pasted nodes
    this._selected.clear();
    for (const n of newNodes) this._selected.add(n.id);
    bus.emit('multiselect:changed', [...this._selected]);
  }

  // ── Align ─────────────────────────────────────────────────

  _getSelectedNodes() {
    return this._scene.nodes.filter(n => this._selected.has(n.id));
  }

  alignLeft() {
    const nodes = this._getSelectedNodes();
    if (nodes.length < 2) return;
    const minX = Math.min(...nodes.map(n => n.x));
    nodes.forEach(n => { n.x = minX; });
    bus.emit('nodes:aligned');
  }

  alignRight() {
    const nodes = this._getSelectedNodes();
    if (nodes.length < 2) return;
    const maxX = Math.max(...nodes.map(n => n.x));
    nodes.forEach(n => { n.x = maxX; });
    bus.emit('nodes:aligned');
  }

  alignTop() {
    const nodes = this._getSelectedNodes();
    if (nodes.length < 2) return;
    const minY = Math.min(...nodes.map(n => n.y));
    nodes.forEach(n => { n.y = minY; });
    bus.emit('nodes:aligned');
  }

  alignBottom() {
    const nodes = this._getSelectedNodes();
    if (nodes.length < 2) return;
    const maxY = Math.max(...nodes.map(n => n.y));
    nodes.forEach(n => { n.y = maxY; });
    bus.emit('nodes:aligned');
  }

  alignCenterH() {
    const nodes = this._getSelectedNodes();
    if (nodes.length < 2) return;
    const avg = nodes.reduce((s, n) => s + n.x, 0) / nodes.length;
    nodes.forEach(n => { n.x = Math.round(avg); });
    bus.emit('nodes:aligned');
  }

  alignCenterV() {
    const nodes = this._getSelectedNodes();
    if (nodes.length < 2) return;
    const avg = nodes.reduce((s, n) => s + n.y, 0) / nodes.length;
    nodes.forEach(n => { n.y = Math.round(avg); });
    bus.emit('nodes:aligned');
  }

  distributeH() {
    const nodes = this._getSelectedNodes();
    if (nodes.length < 3) return;
    nodes.sort((a, b) => a.x - b.x);
    const minX = nodes[0].x;
    const maxX = nodes[nodes.length - 1].x;
    const step = (maxX - minX) / (nodes.length - 1);
    nodes.forEach((n, i) => { n.x = Math.round(minX + i * step); });
    bus.emit('nodes:distributed');
  }

  distributeV() {
    const nodes = this._getSelectedNodes();
    if (nodes.length < 3) return;
    nodes.sort((a, b) => a.y - b.y);
    const minY = nodes[0].y;
    const maxY = nodes[nodes.length - 1].y;
    const step = (maxY - minY) / (nodes.length - 1);
    nodes.forEach((n, i) => { n.y = Math.round(minY + i * step); });
    bus.emit('nodes:distributed');
  }

  // ── Delete Selected ───────────────────────────────────────

  deleteSelected() {
    if (this._selected.size === 0) return;
    const before = this._scene.snapshot();
    for (const id of this._selected) {
      this._scene.removeNode(id);
    }
    this._selected.clear();
    bus.emit('multiselect:changed', []);

    this._commands._undoStack.push({
      description: 'Delete selected',
      execute() { /* already done */ },
      undo: () => this._scene.restoreSnapshot(before),
    });
    this._commands._redoStack = [];
    bus.emit('history:changed', { canUndo: this._commands.canUndo, canRedo: this._commands.canRedo });
  }
}
