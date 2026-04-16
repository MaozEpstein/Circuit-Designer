/**
 * AnnotationLayer — Text labels, boxes, and arrows for documentation.
 *
 * Annotations live in a separate layer above the circuit but below tooltips.
 * They are saved/loaded with the project.
 */
import { bus } from '../core/EventBus.js';

let _annotIdCounter = 0;

/**
 * @typedef {object} Annotation
 * @property {string} id
 * @property {string} type — 'text' | 'box' | 'arrow'
 * @property {number} x
 * @property {number} y
 * @property {string} [text]
 * @property {number} [width]
 * @property {number} [height]
 * @property {number} [x2] — for arrows
 * @property {number} [y2]
 * @property {string} color
 * @property {number} fontSize
 */

export class AnnotationLayer {
  constructor() {
    /** @type {Annotation[]} */
    this._annotations = [];
    this._visible = true;
  }

  get visible() { return this._visible; }
  set visible(v) { this._visible = v; }
  get annotations() { return this._annotations; }

  addText(x, y, text = 'Label', color = '#c8d8f0', fontSize = 12) {
    const a = {
      id: 'annot_' + (_annotIdCounter++),
      type: 'text',
      x, y, text, color, fontSize,
    };
    this._annotations.push(a);
    bus.emit('annotation:added', a);
    return a;
  }

  addBox(x, y, width = 100, height = 60, color = 'rgba(0,212,255,0.15)') {
    const a = {
      id: 'annot_' + (_annotIdCounter++),
      type: 'box',
      x, y, width, height, color, fontSize: 0,
    };
    this._annotations.push(a);
    bus.emit('annotation:added', a);
    return a;
  }

  addArrow(x, y, x2, y2, color = '#4a6080') {
    const a = {
      id: 'annot_' + (_annotIdCounter++),
      type: 'arrow',
      x, y, x2, y2, color, fontSize: 0,
    };
    this._annotations.push(a);
    bus.emit('annotation:added', a);
    return a;
  }

  remove(annotId) {
    this._annotations = this._annotations.filter(a => a.id !== annotId);
    bus.emit('annotation:removed', { id: annotId });
  }

  clear() {
    this._annotations = [];
    bus.emit('annotations:cleared');
  }

  /**
   * Render annotations onto a canvas context (called from the main renderer).
   */
  render(ctx) {
    if (!this._visible) return;

    for (const a of this._annotations) {
      ctx.save();

      if (a.type === 'text') {
        ctx.fillStyle = a.color;
        ctx.font = `${a.fontSize}px JetBrains Mono, monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(a.text, a.x, a.y);
      }

      else if (a.type === 'box') {
        ctx.fillStyle = a.color;
        ctx.fillRect(a.x, a.y, a.width, a.height);
        ctx.strokeStyle = a.color.replace(/[\d.]+\)$/, '0.5)');
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(a.x, a.y, a.width, a.height);
        ctx.setLineDash([]);
      }

      else if (a.type === 'arrow') {
        const dx = a.x2 - a.x;
        const dy = a.y2 - a.y;
        const angle = Math.atan2(dy, dx);
        const headLen = 10;

        ctx.strokeStyle = a.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(a.x2, a.y2);
        ctx.stroke();

        // Arrowhead
        ctx.fillStyle = a.color;
        ctx.beginPath();
        ctx.moveTo(a.x2, a.y2);
        ctx.lineTo(
          a.x2 - headLen * Math.cos(angle - Math.PI / 6),
          a.y2 - headLen * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          a.x2 - headLen * Math.cos(angle + Math.PI / 6),
          a.y2 - headLen * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // ── Serialization ─────────────────────────────────────────

  serialize() {
    return this._annotations.map(a => ({ ...a }));
  }

  deserialize(data) {
    this._annotations = (data || []).map(a => ({ ...a }));
    let maxId = 0;
    for (const a of this._annotations) {
      const m = String(a.id).match(/(\d+)$/);
      if (m) maxId = Math.max(maxId, parseInt(m[1]));
    }
    _annotIdCounter = maxId + 1;
  }
}
