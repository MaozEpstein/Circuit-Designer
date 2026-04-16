/**
 * MiniMap — Small overview of the entire circuit for quick navigation.
 *
 * Renders a scaled-down version of all nodes and wires in a fixed
 * corner panel. Clicking on the mini-map pans the main canvas.
 */
import { C } from '../rendering/Theme.js';
import { FF_TYPE_SET } from '../components/Component.js';

const MINIMAP_W = 180;
const MINIMAP_H = 120;
const PAD = 10;

export class MiniMap {
  constructor() {
    this._canvas = null;
    this._ctx = null;
    this._visible = false;
    this._onNavigate = null; // callback(worldX, worldY)

    this._buildDOM();
  }

  _buildDOM() {
    const container = document.createElement('div');
    container.id = 'minimap-container';
    container.innerHTML = `
      <canvas id="minimap-canvas" width="${MINIMAP_W}" height="${MINIMAP_H}"></canvas>
    `;
    document.body.appendChild(container);

    this._canvas = document.getElementById('minimap-canvas');
    this._ctx = this._canvas.getContext('2d');

    // Click to navigate
    this._canvas.addEventListener('click', (e) => {
      if (!this._onNavigate || !this._bounds) return;
      const rect = this._canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      // Convert minimap coords to world coords
      const worldX = this._bounds.minX + (mx - PAD) / this._mmScale;
      const worldY = this._bounds.minY + (my - PAD) / this._mmScale;
      this._onNavigate(worldX, worldY);
    });

    this._canvas.style.cursor = 'pointer';
  }

  set onNavigate(fn) { this._onNavigate = fn; }

  get visible() { return this._visible; }
  set visible(v) {
    this._visible = v;
    const container = document.getElementById('minimap-container');
    if (container) container.style.display = v ? '' : 'none';
  }

  _bounds = null;
  _mmScale = 1;

  /**
   * Render the mini-map with current circuit state.
   */
  render(nodes, wires) {
    if (!this._visible || !this._ctx) return;
    const ctx = this._ctx;

    ctx.clearRect(0, 0, MINIMAP_W, MINIMAP_H);

    // Background
    ctx.fillStyle = 'rgba(10, 14, 20, 0.9)';
    ctx.fillRect(0, 0, MINIMAP_W, MINIMAP_H);
    ctx.strokeStyle = '#1e3a50';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, MINIMAP_W, MINIMAP_H);

    if (nodes.length === 0) return;

    // Compute bounds
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y);
    });
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const scaleX = (MINIMAP_W - PAD * 2) / rangeX;
    const scaleY = (MINIMAP_H - PAD * 2) / rangeY;
    const scale = Math.min(scaleX, scaleY);
    this._mmScale = scale;
    this._bounds = { minX, maxX, minY, maxY };

    function toMM(x, y) {
      return {
        x: PAD + (x - minX) * scale,
        y: PAD + (y - minY) * scale,
      };
    }

    // Draw wires
    ctx.strokeStyle = 'rgba(100, 150, 200, 0.3)';
    ctx.lineWidth = 0.5;
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    wires.forEach(w => {
      const src = nodeMap.get(w.sourceId);
      const dst = nodeMap.get(w.targetId);
      if (!src || !dst) return;
      const a = toMM(src.x, src.y);
      const b = toMM(dst.x, dst.y);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });

    // Draw nodes
    nodes.forEach(n => {
      const p = toMM(n.x, n.y);
      let color = '#4a6080';
      if (n.type === 'INPUT') color = '#39ff14';
      else if (n.type === 'OUTPUT') color = '#00d4ff';
      else if (n.type === 'CLOCK') color = '#ffcc00';
      else if (n.type === 'GATE_SLOT') color = n.gate ? '#a0c8ff' : '#3a5a7a';
      else if (FF_TYPE_SET.has(n.type)) color = '#a060ff';
      else if (n.type === 'DISPLAY_7SEG') color = '#ff4444';

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}
