/**
 * SynthesisEngine — RTL → Gate-Level netlist analysis.
 *
 * Maps each node to a Standard Cell from CellLibrary, computes
 * area, cell counts, logic depth, fanout, and a structural Verilog
 * netlist. Educational view of what a real synthesis tool produces.
 */

import { cellFor, isPhysicalCell } from './CellLibrary.js';
import { FF_TYPE_SET, MEMORY_TYPE_SET } from '../components/Component.js';

const SEQ_SET = new Set([...FF_TYPE_SET, ...MEMORY_TYPE_SET]);

/**
 * @param {{nodes: object[], wires: object[]}} scene
 * @param {object} [opts]
 * @returns {SynthesisReport}
 */
export function synthesize(scene, opts = {}) {
  const { includeNetlist = true } = opts;
  const nodes = scene.nodes || [];
  const wires = scene.wires || [];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // --- 1. Build adjacency for fanout & topo sort ---
  const succs = new Map(nodes.map(n => [n.id, []]));
  const preds = new Map(nodes.map(n => [n.id, []]));
  const dataWires = wires.filter(w => !w.isClockWire);
  for (const w of dataWires) {
    if (succs.has(w.sourceId)) succs.get(w.sourceId).push(w.targetId);
    if (preds.has(w.targetId)) preds.get(w.targetId).push(w.sourceId);
  }

  // --- 2. Walk nodes, instantiate cells ---
  const cellInstances = [];
  const cellHistogram = {};
  const unmappedTypes = new Set();
  let totalAreaUm2 = 0;
  let numCombinational = 0;
  let numSequential   = 0;
  let numComplex      = 0;
  let numSpecial      = 0;
  let inst = 0;

  for (const n of nodes) {
    if (!isPhysicalCell(n)) continue;
    const c = cellFor(n);
    if (c.cellName === 'UNMAPPED') unmappedTypes.add(n.type);
    inst++;
    const instance = 'U' + inst;
    cellInstances.push({
      instance,
      cellName: c.cellName,
      nodeId:   n.id,
      label:    n.label || n.id,
      areaUm2:  c.areaUm2,
      category: c.category,
      fn:       c.fn,
    });
    cellHistogram[c.cellName] = (cellHistogram[c.cellName] || 0) + 1;
    totalAreaUm2 += c.areaUm2;
    if (c.category === 'sequential')      numSequential++;
    else if (c.category === 'complex')    numComplex++;
    else if (c.category === 'combinational') numCombinational++;
    else if (c.category === 'special')    numSpecial++;
  }

  // --- 3. Logic depth (max combinational chain between sequential boundaries) ---
  const logicLevels = _computeLogicDepth(nodes, dataWires, nodeMap);

  // --- 4. Max fanout ---
  let maxFanout = 0;
  let maxFanoutNode = null;
  for (const [id, list] of succs) {
    if (list.length > maxFanout) {
      maxFanout = list.length;
      maxFanoutNode = id;
    }
  }

  // --- 5. Netlist ---
  const netlist = includeNetlist ? _generateNetlist(nodes, wires, cellInstances, nodeMap) : '';

  return {
    cellInstances,
    cellHistogram,
    totalCells:       cellInstances.length,
    totalAreaUm2:     Math.round(totalAreaUm2 * 100) / 100,
    logicLevels,
    maxFanout,
    maxFanoutNode,
    numCombinational,
    numSequential,
    numComplex,
    numSpecial,
    unmappedTypes:    [...unmappedTypes],
    netlist,
  };
}

/**
 * Walk the DAG and compute the longest combinational chain length
 * (sequential/io nodes reset the depth at the destination).
 */
function _computeLogicDepth(nodes, wires, nodeMap) {
  const preds = new Map(nodes.map(n => [n.id, []]));
  const succs = new Map(nodes.map(n => [n.id, []]));
  for (const w of wires) {
    if (preds.has(w.targetId)) preds.get(w.targetId).push(w.sourceId);
    if (succs.has(w.sourceId)) succs.get(w.sourceId).push(w.targetId);
  }
  // Kahn's topo sort (sequential nodes forced to in-degree 0)
  const inDeg = new Map();
  for (const n of nodes) {
    inDeg.set(n.id, SEQ_SET.has(n.type) ? 0 : preds.get(n.id).length);
  }
  const queue = [];
  for (const n of nodes) if (inDeg.get(n.id) === 0) queue.push(n.id);
  const order = [];
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    for (const s of succs.get(id) || []) {
      const sn = nodeMap.get(s);
      if (SEQ_SET.has(sn?.type)) continue;
      const nd = (inDeg.get(s) || 0) - 1;
      inDeg.set(s, nd);
      if (nd === 0) queue.push(s);
    }
  }
  // Per-node depth: 1 + max(pred depth) if combinational, else 0
  const depth = new Map();
  let maxDepth = 0;
  for (const id of order) {
    const n = nodeMap.get(id);
    if (!n) continue;
    const isComb = !SEQ_SET.has(n.type) && n.type !== 'INPUT' && n.type !== 'OUTPUT'
                && n.type !== 'CLOCK' && n.type !== 'IMM';
    let d = 0;
    for (const p of preds.get(id) || []) {
      const pn = nodeMap.get(p);
      if (SEQ_SET.has(pn?.type)) continue; // depth resets at seq
      const pd = depth.get(p) || 0;
      if (pd > d) d = pd;
    }
    const v = isComb ? d + 1 : d;
    depth.set(id, v);
    if (v > maxDepth) maxDepth = v;
  }
  return maxDepth;
}

/**
 * Generate Synopsys-style structural Verilog. Wires are auto-named n1,n2…
 * unless a port label exists. Best-effort — not bit-accurate for buses.
 */
function _generateNetlist(nodes, wires, cellInstances, nodeMap) {
  // Map nodeId → wireName (one node may drive many wires; we name by source node)
  const inputs = nodes.filter(n => n.type === 'INPUT' || n.type === 'CLOCK');
  const outputs = nodes.filter(n => n.type === 'OUTPUT');
  const sanitize = s => String(s || '').replace(/[^A-Za-z0-9_]/g, '_').replace(/^([0-9])/, '_$1') || '_n';

  const portName = new Map();
  for (const n of inputs)  portName.set(n.id, sanitize(n.label || n.id));
  for (const n of outputs) portName.set(n.id, sanitize(n.label || n.id));

  let netCounter = 0;
  const netName = new Map();
  function nameOf(id) {
    if (portName.has(id)) return portName.get(id);
    if (netName.has(id))  return netName.get(id);
    const nm = 'n' + (++netCounter);
    netName.set(id, nm);
    return nm;
  }

  const ports = [
    ...inputs.map(n => portName.get(n.id)),
    ...outputs.map(n => portName.get(n.id)),
  ];

  const lines = [];
  lines.push(`module top (${ports.join(', ')});`);
  if (inputs.length)  lines.push(`  input  ${inputs.map(n => portName.get(n.id)).join(', ')};`);
  if (outputs.length) lines.push(`  output ${outputs.map(n => portName.get(n.id)).join(', ')};`);

  // Wire declarations come after we've enumerated instances; gather them.
  const instLines = [];
  const usedWires = new Set();

  for (const ci of cellInstances) {
    const n = nodeMap.get(ci.nodeId);
    if (!n) continue;
    // Skip IO nodes — they aren't real cells (already filtered by isPhysicalCell)
    const myWires = wires.filter(w => w.targetId === ci.nodeId && !w.isClockWire);
    const clkWire = wires.find(w => w.targetId === ci.nodeId && w.isClockWire);
    const pins = [];
    const inputPinNames = ['A', 'B', 'C', 'D', 'E', 'F'];
    myWires.sort((a, b) => (a.targetInputIndex || 0) - (b.targetInputIndex || 0));
    myWires.forEach((w, i) => {
      const wn = nameOf(w.sourceId);
      usedWires.add(wn);
      pins.push(`.${inputPinNames[i] || ('I' + i)}(${wn})`);
    });
    if (clkWire) {
      const wn = nameOf(clkWire.sourceId);
      usedWires.add(wn);
      pins.push(`.CLK(${wn})`);
    }
    // Output pin Y (Q for sequential)
    const outName = nameOf(ci.nodeId);
    usedWires.add(outName);
    const outPin = ci.category === 'sequential' ? 'Q' : 'Y';
    pins.push(`.${outPin}(${outName})`);
    instLines.push(`  ${ci.cellName.padEnd(8)} ${ci.instance.padEnd(4)} (${pins.join(', ')});`);
  }

  // Output assigns: each OUTPUT node maps to the wire driving it
  const assignLines = [];
  for (const out of outputs) {
    const driver = wires.find(w => w.targetId === out.id && !w.isClockWire);
    if (driver) {
      const drv = nameOf(driver.sourceId);
      if (drv !== portName.get(out.id)) {
        assignLines.push(`  assign ${portName.get(out.id)} = ${drv};`);
      }
    }
  }

  // Wire declarations (exclude ports)
  const portSet = new Set(portName.values());
  const wireDecls = [...usedWires].filter(w => !portSet.has(w));
  if (wireDecls.length) lines.push(`  wire ${wireDecls.join(', ')};`);

  lines.push(...instLines);
  if (assignLines.length) lines.push(...assignLines);
  lines.push('endmodule');
  return lines.join('\n');
}

// Shared sanitizer for port names (used by netlist + SDC).
function _sanitize(s) {
  return String(s || '').replace(/[^A-Za-z0-9_]/g, '_').replace(/^([0-9])/, '_$1') || '_n';
}

/**
 * Generate Synopsys Design Constraints (SDC) — TCL format consumed by
 * downstream PnR / STA tools. Auto-derives ports from CLOCK/INPUT/OUTPUT nodes.
 *
 * @param {{nodes: object[], wires: object[]}} scene
 * @param {object} [opts]
 * @param {number} [opts.clockPeriodNs=2]   clock period in nanoseconds
 * @param {number} [opts.maxFanout=6]       global max fanout DRC
 * @param {number} [opts.maxTransitionNs=0.5] global max transition (ns)
 * @param {number} [opts.inputDelayNs=0.2]  external arrival time for inputs
 * @param {number} [opts.outputDelayNs=0.2] external required time at outputs
 * @returns {{sdc: string, warnings: string[]}}
 */
export function generateSDC(scene, opts = {}) {
  const {
    clockPeriodNs   = 2,
    maxFanout       = 6,
    maxTransitionNs = 0.5,
    inputDelayNs    = 0.2,
    outputDelayNs   = 0.2,
  } = opts;
  const nodes = scene.nodes || [];
  const warnings = [];

  const clocks = nodes.filter(n => n.type === 'CLOCK');
  // INPUT nodes that aren't clocks, sorted by label for stable output.
  const dataInputs = nodes.filter(n => n.type === 'INPUT')
    .sort((a, b) => (a.label || a.id).localeCompare(b.label || b.id));
  const outputs = nodes.filter(n => n.type === 'OUTPUT')
    .sort((a, b) => (a.label || a.id).localeCompare(b.label || b.id));

  if (clocks.length === 0) warnings.push('No CLOCK node found — defaulting to 1 virtual clock');
  if (clocks.length > 1)   warnings.push(`${clocks.length} CLOCK nodes found — emitted ${clocks.length} create_clock entries`);

  const lines = [];
  lines.push('# ===========================================================');
  lines.push('# Auto-generated SDC (Synopsys Design Constraints)');
  lines.push('# Format: TCL  |  Time units: ns  |  Capacitance units: pF');
  lines.push('# ===========================================================');
  lines.push('');
  lines.push('set_units -time ns -capacitance pF');
  lines.push('');
  lines.push('# --- Clock definitions ---');
  const clockNames = [];
  if (clocks.length === 0) {
    lines.push(`create_clock -name CLK -period ${clockPeriodNs.toFixed(3)} -waveform {0 ${(clockPeriodNs/2).toFixed(3)}}`);
    clockNames.push('CLK');
  } else {
    for (const c of clocks) {
      const nm = _sanitize(c.label || c.id);
      lines.push(`create_clock -name ${nm} -period ${clockPeriodNs.toFixed(3)} -waveform {0 ${(clockPeriodNs/2).toFixed(3)}} [get_ports ${nm}]`);
      clockNames.push(nm);
    }
  }
  const primaryClock = clockNames[0];
  lines.push('');
  lines.push('# --- I/O delays (relative to primary clock) ---');
  if (dataInputs.length) {
    const ports = dataInputs.map(n => _sanitize(n.label || n.id)).join(' ');
    lines.push(`set_input_delay  -clock ${primaryClock} ${inputDelayNs.toFixed(3)} [get_ports {${ports}}]`);
  }
  if (outputs.length) {
    const ports = outputs.map(n => _sanitize(n.label || n.id)).join(' ');
    lines.push(`set_output_delay -clock ${primaryClock} ${outputDelayNs.toFixed(3)} [get_ports {${ports}}]`);
  }
  lines.push('');
  lines.push('# --- Design rule constraints (DRC) ---');
  lines.push(`set_max_fanout      ${maxFanout} [current_design]`);
  lines.push(`set_max_transition  ${maxTransitionNs.toFixed(3)} [current_design]`);
  lines.push('set_load 0.050 [all_outputs]');
  lines.push('');
  lines.push('# --- Wire load model (synthesis default) ---');
  lines.push('set_wire_load_model -name ForQA -library saed90nm_typ');
  lines.push('');
  lines.push('# --- Operating conditions ---');
  lines.push('set_operating_conditions -analysis_type single typ');

  return { sdc: lines.join('\n'), warnings };
}

/**
 * Classify timing paths by start/end kind: in2reg, reg2reg, reg2out, in2out.
 * Used by the Synthesis tab's "Group Paths" section.
 *
 * Note: this is a structural classification — we walk DAG predecessors from
 * each endpoint to find its closest upstream startpoint(s). It's lighter
 * than the full STA path enumeration; it just counts how many paths fall
 * into each group and tracks representative nodes for canvas highlighting.
 *
 * @param {{nodes: object[], wires: object[]}} scene
 * @returns {{
 *   groups: { in2reg, reg2reg, reg2out, in2out },
 *   totalPaths: number,
 * }}
 */
export function classifyGroupPaths(scene) {
  const nodes = scene.nodes || [];
  const wires = (scene.wires || []).filter(w => !w.isClockWire);
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const preds = new Map(nodes.map(n => [n.id, []]));
  for (const w of wires) {
    if (preds.has(w.targetId)) preds.get(w.targetId).push(w.sourceId);
  }

  const isStart = n => SEQ_SET.has(n.type) || n.type === 'INPUT';
  const isEnd   = n => SEQ_SET.has(n.type) || n.type === 'OUTPUT';
  const kindOf  = n => n.type === 'INPUT' ? 'in' : (n.type === 'OUTPUT' ? 'out' : 'reg');

  const groups = {
    in2reg:  { count: 0, nodeIds: [], desc: 'Input port → Flip-flop (data setup at register)' },
    reg2reg: { count: 0, nodeIds: [], desc: 'FF → FF (internal pipeline stage)' },
    reg2out: { count: 0, nodeIds: [], desc: 'FF → Output port (Q drives chip pin)' },
    in2out:  { count: 0, nodeIds: [], desc: 'Input → Output (combinational feedthrough)' },
  };

  // Walk upstream from each endpoint to its dominating startpoint(s).
  function walkUp(id, visited) {
    if (visited.has(id)) return [];
    visited.add(id);
    const n = nodeMap.get(id);
    if (!n) return [];
    if (isStart(n)) return [id];
    const found = [];
    for (const p of preds.get(id) || []) {
      for (const s of walkUp(p, visited)) found.push(s);
    }
    return found;
  }

  for (const end of nodes) {
    if (!isEnd(end)) continue;
    const visited = new Set();
    // Don't include the endpoint itself in the upstream walk
    const starts = new Set();
    for (const p of preds.get(end.id) || []) {
      for (const s of walkUp(p, visited)) starts.add(s);
    }
    const ek = kindOf(end);
    for (const sId of starts) {
      const s = nodeMap.get(sId);
      if (!s) continue;
      const sk = kindOf(s);
      let group = null;
      if (sk === 'in'  && ek === 'reg') group = 'in2reg';
      else if (sk === 'reg' && ek === 'reg') group = 'reg2reg';
      else if (sk === 'reg' && ek === 'out') group = 'reg2out';
      else if (sk === 'in'  && ek === 'out') group = 'in2out';
      if (group) {
        groups[group].count++;
        // Keep up to 12 representative node IDs (start + end) for highlighting
        if (groups[group].nodeIds.length < 12) {
          groups[group].nodeIds.push(sId, end.id);
        }
      }
    }
  }

  return {
    groups,
    totalPaths: Object.values(groups).reduce((s, g) => s + g.count, 0),
  };
}

/**
 * Simulated congestion estimate: divide the canvas bounding-box into
 * `gridSize × gridSize` cells, count nodes per cell, normalize.
 *
 * Real synthesis uses placement info to compute this; we have no
 * placement here, so we use the user's drawn coordinates as a proxy.
 *
 * @param {{nodes: object[], wires: object[]}} scene
 * @param {number} [gridSize=8]
 * @returns {{grid: number[][], maxDensity: number, gridSize: number}}
 */
export function estimateCongestion(scene, gridSize = 8) {
  const physical = (scene.nodes || []).filter(isPhysicalCell);
  const grid = Array.from({ length: gridSize }, () => new Array(gridSize).fill(0));
  if (physical.length === 0) return { grid, maxDensity: 0, gridSize };

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const n of physical) {
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;
  }
  // Guard against zero-width / zero-height bounding boxes
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);

  for (const n of physical) {
    const gx = Math.min(gridSize - 1, Math.floor(((n.x - minX) / w) * gridSize));
    const gy = Math.min(gridSize - 1, Math.floor(((n.y - minY) / h) * gridSize));
    grid[gy][gx]++;
  }

  let maxDensity = 0;
  for (const row of grid) for (const v of row) if (v > maxDensity) maxDensity = v;
  return { grid, maxDensity, gridSize };
}
