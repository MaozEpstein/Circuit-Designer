/**
 * PlacementEngine — standard-cell placement + Clock Tree Synthesis (CTS).
 *
 * Consumes the floorplan geometry (die / core / rows / macros) and:
 *   1. Legalizes synthesized standard cells into the core rows (skipping macros).
 *   2. Bins a placement-density heatmap.
 *   3. Builds a balanced buffered clock tree from the clock port to every
 *      sequential clock sink, and computes per-sink insertion delay & skew.
 *
 * Educational model of what Placement & CTS produce. Before CTS the clock is
 * ideal (insertion delay = 0); CTS introduces real insertion delay and skew,
 * which the timing-impact view feeds back into STA via `Tck ± Tskew`.
 */

import { computeFloorplan }              from './FloorplanEngine.js';
import { cellFor, isPhysicalCell }       from './CellLibrary.js';
import { FF_TYPE_SET, MEMORY_TYPE_SET }  from '../components/Component.js';

const SEQUENTIAL_SET = new Set([...FF_TYPE_SET, ...MEMORY_TYPE_SET]);

const CLOCK_BUFFER_DELAY_PS = 35;   // per clock-buffer intrinsic delay (overridable)
const WIRE_DELAY_PS_PER_UM  = 0.5;  // clock-net segment delay ∝ Manhattan length

/**
 * @param {{nodes: object[], wires: object[]}} scene
 * @param {object} [opts]
 * @param {object} [opts.floorplan]            precomputed computeFloorplan() result
 * @param {number} [opts.clockBufferDelayPs=35]
 * @param {number} [opts.densityBins=12]
 * @param {number} [opts.maxLeafSinks=2]
 * @returns {PlacementModel}
 */
export function computePlacement(scene, opts = {}) {
  const {
    clockBufferDelayPs = CLOCK_BUFFER_DELAY_PS,
    densityBins        = 12,
    maxLeafSinks       = 2,
  } = opts;
  const fp = opts.floorplan || computeFloorplan(scene);

  const nodes   = scene.nodes || [];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const core    = fp.core;
  const warnings = [];

  // Empty-die guard
  if (!fp.dieW || !fp.dieH || !core.w) {
    return _emptyModel(fp, densityBins, clockBufferDelayPs, ['Empty design — nothing to place']);
  }

  // --- 1. Legalize standard cells into rows ---
  const { cells, rowFill, overflow } =
    _legalize(fp, fp.synth, nodeMap);

  // --- 2. Placement density heatmap ---
  const density = _densityGrid(cells, core, densityBins);

  // --- 3. Clock Tree Synthesis ---
  const cts = _buildCTS(scene, fp, cells, {
    clockBufferDelayPs, maxLeafSinks, warnings,
  });

  return {
    core, dieW: fp.dieW, dieH: fp.dieH, rows: fp.rows, macros: fp.macros,
    cells, placedCount: cells.length, rowFill, overflow,
    density,
    ...cts,                 // clockSource, tree, buffers, treeEdges, sinks, cts
    warnings,
  };
}

// ── 1. Legalization ──────────────────────────────────────────

function _legalize(fp, synth, nodeMap) {
  const core = fp.core;
  const rowH = fp.rows.height;
  const rowCount = Math.max(1, fp.rows.count);
  const gap = Math.min(core.w, core.h) * 0.01;

  // Macro keep-out boxes
  const macroBoxes = fp.macros.map(m => ({
    x0: m.x - m.side / 2, x1: m.x + m.side / 2,
    y0: m.y - m.side / 2, y1: m.y + m.side / 2,
  }));

  const stdCells = (synth?.cellInstances || []).filter(ci => {
    const n = nodeMap.get(ci.nodeId);
    return n && isPhysicalCell(n) && !cellFor(n).isMacro;
  });

  const cells = [];
  const rowFill = new Array(rowCount).fill(0);
  const rowY = r => core.y + r * rowH;
  const overlapMacro = (x, w, r) => {
    const y0 = rowY(r), y1 = y0 + rowH;
    for (const m of macroBoxes) {
      if (x < m.x1 && x + w > m.x0 && y0 < m.y1 && y1 > m.y0) return m;
    }
    return null;
  };

  let row = 0, cx = core.x, overflow = false;
  for (const ci of stdCells) {
    const w = Math.max(core.w * 0.012, Math.sqrt(ci.areaUm2));
    let guard = 0;
    while (guard++ < 5000) {
      if (cx + w > core.x + core.w) {       // wrap to next row
        row++; cx = core.x;
        if (row >= rowCount) { overflow = true; break; }
        continue;
      }
      const m = overlapMacro(cx, w, row);
      if (m) { cx = m.x1 + gap; continue; } // jump past the macro
      cells.push({
        nodeId: ci.nodeId, label: ci.label,
        x: cx + w / 2, y: rowY(row) + rowH / 2, w, h: rowH, row,
      });
      rowFill[row] += w;
      cx += w + gap;
      break;
    }
    if (overflow) break;
  }

  return { cells, rowFill, overflow };
}

// ── 2. Density grid ──────────────────────────────────────────

function _densityGrid(cells, core, bins) {
  const grid = Array.from({ length: bins }, () => new Array(bins).fill(0));
  let maxDensity = 0;
  for (const c of cells) {
    const bx = Math.min(bins - 1, Math.max(0, Math.floor((c.x - core.x) / core.w * bins)));
    const by = Math.min(bins - 1, Math.max(0, Math.floor((c.y - core.y) / core.h * bins)));
    const v = ++grid[by][bx];
    if (v > maxDensity) maxDensity = v;
  }
  return { grid, maxDensity, bins };
}

// ── 3. Clock Tree Synthesis ──────────────────────────────────

function _buildCTS(scene, fp, cells, { clockBufferDelayPs, maxLeafSinks, warnings }) {
  const nodes = scene.nodes || [];

  // Position lookup: std cells from placement, macros from floorplan.
  const cellPos  = new Map(cells.map(c => [c.nodeId, c]));
  const macroPos = new Map(fp.macros.map(m => [m.nodeId, m]));

  const sinks = [];
  for (const n of nodes) {
    if (!SEQUENTIAL_SET.has(n.type)) continue;
    const p = cellPos.get(n.id) || macroPos.get(n.id);
    if (!p) continue;   // not placed (overflow) — skip
    sinks.push({ nodeId: n.id, label: n.label || n.id, x: p.x, y: p.y, isMacro: macroPos.has(n.id) });
  }

  // Clock source = the CLOCK port on the die edge.
  const clkPort = (fp.ports || []).find(p => p.type === 'CLOCK');
  let source;
  if (clkPort) {
    source = { x: clkPort.ex, y: clkPort.ey, nodeId: clkPort.nodeId, label: clkPort.label || 'CLK' };
  } else if (sinks.length) {
    source = { x: _avg(sinks, 'x'), y: _avg(sinks, 'y'), nodeId: null, label: 'CLK' };
    warnings.push('No CLOCK port — clock source assumed at sink centroid');
  } else {
    source = { x: fp.core.x, y: fp.core.y, nodeId: null, label: 'CLK' };
  }

  const empty = {
    clockSource: source, tree: null, buffers: [], treeEdges: [], sinks: [],
    cts: {
      numSinks: 0, numBuffers: 0, treeLevels: 0,
      minInsertionPs: 0, avgInsertionPs: 0, maxInsertionPs: 0,
      skewPs: 0, sourceInsertionPs: 0,
      clockBufferDelayPs, wireDelayPsPerUm: WIRE_DELAY_PS_PER_UM,
    },
  };
  if (sinks.length === 0) {
    warnings.push('No clock sinks (sequential elements) to drive');
    return empty;
  }

  // Build the balanced median-split tree.
  let bufCounter = 0;
  const build = (list, level) => {
    const cx = _avg(list, 'x'), cy = _avg(list, 'y');
    if (list.length <= maxLeafSinks) {
      return { kind: 'leaf', level, x: cx, y: cy, id: `CTS_${level}_${bufCounter++}`, sinks: list };
    }
    const bbox = _bounds(list);
    const axis = (bbox.w >= bbox.h) ? 'x' : 'y';
    const other = axis === 'x' ? 'y' : 'x';
    const sorted = [...list].sort((a, b) =>
      (a[axis] - b[axis]) || (a[other] - b[other]) || (a.nodeId < b.nodeId ? -1 : 1));
    const mid = Math.floor(sorted.length / 2);
    const node = { kind: 'buffer', level, x: cx, y: cy, id: `CTS_${level}_${bufCounter++}`, children: [] };
    node.children.push(build(sorted.slice(0, mid), level + 1));
    node.children.push(build(sorted.slice(mid), level + 1));
    return node;
  };
  const root = build(sinks, 0);

  // Walk to assign insertion delays.
  const wire = (a, b) => WIRE_DELAY_PS_PER_UM * (Math.abs(a.x - b.x) + Math.abs(a.y - b.y));
  const buffers = [], treeEdges = [];
  let maxLevel = 0;
  const walk = (node, parentLat, parentPos, edgeKind) => {
    const lat = parentLat + wire(parentPos, node) + clockBufferDelayPs;
    node._lat = lat;
    if (node.level > maxLevel) maxLevel = node.level;
    buffers.push({ id: node.id, label: node.id, x: node.x, y: node.y, level: node.level });
    treeEdges.push({ x1: parentPos.x, y1: parentPos.y, x2: node.x, y2: node.y, kind: edgeKind });
    if (node.kind === 'buffer') {
      for (const ch of node.children) walk(ch, lat, node, 'buf');
    } else {
      for (const s of node.sinks) {
        s.insertionDelayPs = _r(lat + wire(node, s));
        s.bufferDepth = node.level;
        treeEdges.push({ x1: node.x, y1: node.y, x2: s.x, y2: s.y, kind: 'sink' });
      }
    }
  };
  walk(root, 0, source, 'src');

  const lat = sinks.map(s => s.insertionDelayPs);
  const minP = Math.min(...lat), maxP = Math.max(...lat);

  return {
    clockSource: source, tree: root, buffers, treeEdges,
    sinks: sinks.map(s => ({
      nodeId: s.nodeId, label: s.label, x: _r(s.x), y: _r(s.y),
      isMacro: s.isMacro, insertionDelayPs: s.insertionDelayPs, bufferDepth: s.bufferDepth,
    })),
    cts: {
      numSinks: sinks.length,
      numBuffers: buffers.length,
      treeLevels: maxLevel + 1,
      minInsertionPs: _r(minP),
      avgInsertionPs: _r(lat.reduce((a, b) => a + b, 0) / lat.length),
      maxInsertionPs: _r(maxP),
      skewPs: _r(maxP - minP),
      sourceInsertionPs: _r(root._lat),
      clockBufferDelayPs,
      wireDelayPsPerUm: WIRE_DELAY_PS_PER_UM,
    },
  };
}

// ── helpers ──────────────────────────────────────────────────

function _emptyModel(fp, bins, clockBufferDelayPs, warnings) {
  return {
    core: fp.core, dieW: fp.dieW, dieH: fp.dieH, rows: fp.rows, macros: fp.macros || [],
    cells: [], placedCount: 0, rowFill: [], overflow: false,
    density: { grid: Array.from({ length: bins }, () => new Array(bins).fill(0)), maxDensity: 0, bins },
    clockSource: { x: fp.core?.x || 0, y: fp.core?.y || 0, nodeId: null, label: 'CLK' },
    tree: null, buffers: [], treeEdges: [], sinks: [],
    cts: {
      numSinks: 0, numBuffers: 0, treeLevels: 0,
      minInsertionPs: 0, avgInsertionPs: 0, maxInsertionPs: 0,
      skewPs: 0, sourceInsertionPs: 0,
      clockBufferDelayPs, wireDelayPsPerUm: WIRE_DELAY_PS_PER_UM,
    },
    warnings,
  };
}

function _avg(list, k) { return list.reduce((s, e) => s + e[k], 0) / list.length; }
function _bounds(list) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const e of list) {
    if (e.x < minX) minX = e.x; if (e.x > maxX) maxX = e.x;
    if (e.y < minY) minY = e.y; if (e.y > maxY) maxY = e.y;
  }
  return { w: maxX - minX, h: maxY - minY };
}
function _r(v, dp = 2) { const f = Math.pow(10, dp); return Math.round(v * f) / f; }
