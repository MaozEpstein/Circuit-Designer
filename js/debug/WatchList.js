/**
 * WatchList — Pin signals to a persistent monitoring panel.
 *
 * Displays a table of watched signals with live values,
 * previous values, and change indicators.
 */
import { bus } from '../core/EventBus.js';
import { formatValue } from '../engine/SimulationController.js';

/**
 * @typedef {object} WatchEntry
 * @property {string} id
 * @property {string} nodeId
 * @property {string} label
 * @property {number|null} value
 * @property {number|null} prevValue
 * @property {boolean} changed
 */

let _watchIdCounter = 0;

export class WatchList {
  constructor() {
    /** @type {Map<string, WatchEntry>} */
    this._entries = new Map();
  }

  add(nodeId, label = '') {
    // Don't duplicate
    for (const e of this._entries.values()) {
      if (e.nodeId === nodeId) return e;
    }
    const id = 'watch_' + (_watchIdCounter++);
    const entry = {
      id,
      nodeId,
      label: label || nodeId,
      value: null,
      prevValue: null,
      changed: false,
    };
    this._entries.set(id, entry);
    bus.emit('watch:added', entry);
    return entry;
  }

  remove(watchId) {
    this._entries.delete(watchId);
    bus.emit('watch:removed', { id: watchId });
  }

  clear() {
    this._entries.clear();
    bus.emit('watch:cleared');
  }

  get entries() {
    return [...this._entries.values()];
  }

  /**
   * Update all watch entries with current values.
   */
  update(nodeValues) {
    for (const entry of this._entries.values()) {
      entry.prevValue = entry.value;
      entry.value = nodeValues.get(entry.nodeId) ?? null;
      entry.changed = entry.prevValue !== null && entry.value !== entry.prevValue;
    }
    bus.emit('watch:updated');
  }

  /**
   * Render the watch list to a container element.
   */
  renderTo(container, valueFormat = 'bin') {
    if (!container) return;
    const entries = this.entries;

    if (entries.length === 0) {
      container.innerHTML = '<div style="color:#4a6080;font-size:9px;padding:4px">No watched signals. Right-click a node to add.</div>';
      return;
    }

    let html = '<table class="watch-table"><thead><tr><th>Signal</th><th>Value</th><th>Prev</th><th></th></tr></thead><tbody>';
    for (const e of entries) {
      const valStr = formatValue(e.value, valueFormat);
      const prevStr = formatValue(e.prevValue, valueFormat);
      const changeClass = e.changed ? ' watch-changed' : '';
      const valColor = e.value === 1 ? '#39ff14' : (e.value === 0 ? '#ff4444' : '#4a6080');
      html += `<tr class="watch-row${changeClass}">`;
      html += `<td class="watch-label">${e.label}</td>`;
      html += `<td class="watch-val" style="color:${valColor}">${valStr}</td>`;
      html += `<td class="watch-prev">${prevStr}</td>`;
      html += `<td><button class="watch-remove" data-id="${e.id}">&times;</button></td>`;
      html += '</tr>';
    }
    html += '</tbody></table>';
    container.innerHTML = html;

    // Bind remove buttons
    container.querySelectorAll('.watch-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        this.remove(btn.dataset.id);
        this.renderTo(container, valueFormat);
      });
    });
  }
}
