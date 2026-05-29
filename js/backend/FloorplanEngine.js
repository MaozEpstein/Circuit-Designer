/**
 * FloorplanEngine — die / core planning from a synthesized scene.
 *
 * Given the schematic, derives the chip floorplan: core area from
 * total cell area ÷ target utilization, die area with an I/O-ring
 * margin, width/height from a target aspect ratio, standard-cell row
 * count, macro footprints/placement (proxied from the drawn coords),
 * and primary-port edge assignment. Reuses the synthesis + congestion
 * passes so the numbers stay consistent with the Synthesis tab.
 *
 * Geometry units are µm. The model is visualization-oriented — there
 * is no legalization or detailed placement, only an educational view
 * of what a floorplanning tool produces before placement runs.
 */

import { synthesize, estimateCongestion } from './SynthesisEngine.js';
import { cellFor, isPhysicalCell }        from './CellLibrary.js';

const PORT_TYPES   = new Set(['INPUT', 'OUTPUT', 'CLOCK']);
const ROW_HEIGHT_UM = 1.4;        // standard-cell row pitch (µm)
const CORE_MARGIN_FRAC = 0.05;    // I/O ring per die edge (fraction of die)

export const PORT_COLORS = {
  INPUT:  '#50cc70',
  OUTPUT: '#ccaa66',
  CLOCK:  '#6aaadd',
};

/**
 * @param {{nodes: object[], wires: object[]}} scene
 * @param {object} [opts]
 * @param {number} [opts.utilization=0.70]    target core utilization (0..1)
 * @param {number} [opts.aspectRatio=1.0]     die width / height
 * @param {number} [opts.gridSize=8]          congestion grid resolution
 * @param {object} [opts.portEdges={}]        nodeId → 'N'|'E'|'S'|'W' overrides
 * @param {object} [opts.synth=null]          precomputed synthesize() result
 * @returns {FloorplanModel}
 */
export function computeFloorplan(scene, opts = {}) {
  const {
    utilization = 0.70,
    aspectRatio = 1.0,
    gridSize    = 8,
    portEdges   = {},
    synth       = null,
  } = opts;

  const nodes   = scene.nodes || [];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const synthResult = synth || synthesize(scene, { includeNetlist: false });
  const congestion  = estimateCongestion(scene, gridSize);

  const warnings = [];

  // --- 1. Split cell area into macro vs std-cell (unrounded running sums) ---
  let totalCellArea = 0, macroArea = 0, stdArea = 0;
  const macros = [];
  for (const ci of synthResult.cellInstances) {
    const node = nodeMap.get(ci.nodeId);
    const c    = cellFor(node);
    totalCellArea += ci.areaUm2;
    if (c.isMacro) {
      macroArea += ci.areaUm2;
      macros.push({ nodeId: ci.nodeId, label: ci.label, cellName: ci.cellName, areaUm2: ci.areaUm2 });
    } else {
      stdArea += ci.areaUm2;
    }
  }

  // --- 2. Empty-scene guard ---
  if (synthResult.totalCells === 0 || totalCellArea <= 0) {
    warnings.push('Empty design — nothing to floorplan');
    return _emptyModel(utilization, aspectRatio, gridSize, congestion, synthResult, warnings);
  }

  const u = Math.min(0.99, Math.max(0.05, utilization));

  // --- 3. Core / die area + dimensions ---
  const coreArea = totalCellArea / u;
  const dieArea  = coreArea / Math.pow(1 - 2 * CORE_MARGIN_FRAC, 2);
  const dieH = Math.sqrt(dieArea / aspectRatio);
  const dieW = dieArea / dieH;
  const margin = CORE_MARGIN_FRAC * Math.min(dieW, dieH);
  const core = {
    x: CORE_MARGIN_FRAC * dieW,
    y: CORE_MARGIN_FRAC * dieH,
    w: dieW * (1 - 2 * CORE_MARGIN_FRAC),
    h: dieH * (1 - 2 * CORE_MARGIN_FRAC),
  };

  // --- 4. Standard-cell rows (visualization only) ---
  const rowCount = Math.max(1, Math.floor(core.h / ROW_HEIGHT_UM));

  // --- 5. Macro placement: normalize drawn coords into the core rect ---
  _placeMacros(macros, nodes, core);

  // --- 6. Port edge assignment ---
  const ports = _assignPorts(nodes, core, dieW, dieH, portEdges);

  return {
    utilization: u,
    aspectRatio,
    gridSize,
    coreMarginFrac: CORE_MARGIN_FRAC,
    rowHeightUm: ROW_HEIGHT_UM,
    totalCellAreaUm2: _r(totalCellArea),
    macroAreaUm2: _r(macroArea),
    stdAreaUm2: _r(stdArea),
    coreAreaUm2: _r(coreArea),
    dieAreaUm2: _r(dieArea),
    actualUtilization: _r(totalCellArea / coreArea, 4),
    dieW: _r(dieW),
    dieH: _r(dieH),
    core: { x: _r(core.x), y: _r(core.y), w: _r(core.w), h: _r(core.h) },
    rows: { count: rowCount, height: ROW_HEIGHT_UM },
    macros,
    stdCellCount: synthResult.totalCells - macros.length,
    macroCount: macros.length,
    ports,
    portCount: ports.length,
    congestion,
    synth: synthResult,
    warnings,
  };
}

// ── helpers ──────────────────────────────────────────────────

/** Normalize physical-node drawn coordinates and map each macro into the core rect. */
function _placeMacros(macros, nodes, core) {
  if (!macros.length) return;
  const physical = nodes.filter(isPhysicalCell);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const n of physical) {
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;
  }
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // 1. Footprint from silicon area; record drawn position for ordering.
  for (const m of macros) {
    const n = nodeMap.get(m.nodeId);
    m.side  = Math.sqrt(m.areaUm2);
    m._ny   = n ? (n.y - minY) / h : 0.5;   // drawn row band (for stable ordering)
    m._nx   = n ? (n.x - minX) / w : 0.5;
  }

  // 2. Shelf-pack into the core: clean rows, no overlap, fills empty space.
  _packMacros(macros, core);

  // 3. Round for output.
  for (const m of macros) {
    m.side = _r(m.side);
    m.x = _r(m.x);
    m.y = _r(m.y);
    delete m._nx; delete m._ny;
  }
}

/**
 * Shelf packing: largest macros first, laid out left→right in rows that wrap
 * inside the core. If the macros dominate the core (e.g. memory-heavy designs)
 * the packed block overflows the core height — we then uniformly scale the whole
 * layout (positions + sizes) to fit. Uniform scaling of a non-overlapping layout
 * stays non-overlapping, so the result is always tidy and overlap-free.
 */
function _packMacros(macros, core) {
  const span = Math.min(core.w, core.h);
  const pad = span * 0.03;
  const gap = span * 0.05;
  // Biggest first packs tightest; ties broken by drawn position (stable, top-left first).
  macros.sort((a, b) => (b.side - a.side) || (a._ny - b._ny) || (a._nx - b._nx));
  const x0 = core.x + pad, y0 = core.y + pad;
  const maxX = core.x + core.w - pad;
  let cx = x0, cy = y0, rowH = 0;
  for (const m of macros) {
    const s = m.side;
    if (cx + s > maxX && cx > x0) {   // wrap to next shelf
      cx = x0;
      cy += rowH + gap;
      rowH = 0;
    }
    m.x = cx + s / 2;
    m.y = cy + s / 2;
    cx += s + gap;
    if (s > rowH) rowH = s;
  }

  // Scale-to-fit if the packed block is taller than the core.
  let bottom = y0;
  for (const m of macros) bottom = Math.max(bottom, m.y + m.side / 2);
  const limit = core.y + core.h - pad;
  if (bottom > limit) {
    const f = (limit - y0) / (bottom - y0);
    for (const m of macros) {
      m.x = x0 + (m.x - x0) * f;
      m.y = y0 + (m.y - y0) * f;
      m.side *= f;
    }
  }
}

/** Assign each primary port to a die edge and compute its marker coordinate. */
function _assignPorts(nodes, core, dieW, dieH, overrides) {
  const portNodes = nodes.filter(n => PORT_TYPES.has(n.type));
  if (!portNodes.length) return [];

  // bbox of ports for nearest-edge auto-assignment
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const n of portNodes) {
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;
  }
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);

  // First pass: decide edge per port
  const withEdge = portNodes.map(n => {
    let edge = overrides[n.id];
    if (!edge) {
      const nx = (n.x - minX) / w;
      const ny = (n.y - minY) / h;
      const dists = { W: nx, E: 1 - nx, N: ny, S: 1 - ny };
      edge = Object.keys(dists).reduce((a, b) => (dists[b] < dists[a] ? b : a), 'W');
    }
    return { nodeId: n.id, label: n.label || n.id, type: n.type, edge };
  });

  // Second pass: spread ports that share an edge evenly along it
  const byEdge = { N: [], E: [], S: [], W: [] };
  for (const p of withEdge) byEdge[p.edge].push(p);

  const result = [];
  for (const edge of ['N', 'E', 'S', 'W']) {
    const list = byEdge[edge];
    list.forEach((p, i) => {
      const t = (i + 1) / (list.length + 1);   // 0..1 along the edge
      let ex, ey;
      if (edge === 'N')      { ex = t * dieW; ey = 0; }
      else if (edge === 'S') { ex = t * dieW; ey = dieH; }
      else if (edge === 'W') { ex = 0;        ey = t * dieH; }
      else                   { ex = dieW;     ey = t * dieH; }
      result.push({ ...p, ex: _r(ex), ey: _r(ey) });
    });
  }
  return result;
}

function _emptyModel(utilization, aspectRatio, gridSize, congestion, synth, warnings) {
  return {
    utilization, aspectRatio, gridSize,
    coreMarginFrac: CORE_MARGIN_FRAC, rowHeightUm: ROW_HEIGHT_UM,
    totalCellAreaUm2: 0, macroAreaUm2: 0, stdAreaUm2: 0,
    coreAreaUm2: 0, dieAreaUm2: 0, actualUtilization: 0,
    dieW: 0, dieH: 0, core: { x: 0, y: 0, w: 0, h: 0 },
    rows: { count: 0, height: ROW_HEIGHT_UM },
    macros: [], stdCellCount: 0, macroCount: 0,
    ports: [], portCount: 0,
    congestion, synth, warnings,
  };
}

function _r(v, dp = 2) { const f = Math.pow(10, dp); return Math.round(v * f) / f; }
