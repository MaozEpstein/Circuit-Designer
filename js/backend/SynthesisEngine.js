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
    maxCapacitancePf = 0.20,
    inputDelayNs    = 0.2,
    outputDelayNs   = 0.2,
    setupUncertaintyNs = 0,
    customGroups    = [],
    timingExceptions = [],
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
  // Global setup margin → clock uncertainty (the real-flow equivalent).
  if (setupUncertaintyNs > 0) {
    lines.push(`set_clock_uncertainty -setup ${setupUncertaintyNs.toFixed(3)} [all_clocks]`);
  }
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
  lines.push(`set_max_capacitance ${maxCapacitancePf.toFixed(3)} [current_design]`);
  lines.push('set_load 0.050 [all_outputs]');
  lines.push('');
  lines.push('# --- Wire load model (synthesis default) ---');
  lines.push('set_wire_load_model -name ForQA -library saed90nm_typ');
  lines.push('');
  lines.push('# --- Operating conditions ---');
  lines.push('set_operating_conditions -analysis_type single typ');

  // Custom group paths (user-defined optimization buckets)
  const valid = (customGroups || []).filter(g => g && (g.from || g.to));
  if (valid.length) {
    lines.push('');
    lines.push('# --- Custom group paths (user-defined) ---');
    for (const g of valid) {
      const name = _sanitize(g.name || 'custom_grp');
      const fromClause = g.from ? `-from [get_pins ${_sanitize(g.from)}/Q] ` : '';
      const toClause   = g.to   ? `-to [get_pins ${_sanitize(g.to)}/D] `   : '';
      lines.push(`set_group_path -name ${name} ${fromClause}${toClause}-weight 1.0`);
    }
  }

  // Timing exceptions (false_path / multicycle / max_delay / case_analysis).
  // Priority among path exceptions is MCP > max_delay > false_path; the STA
  // engine enforces that — here we just emit the TCL the lecture shows.
  const excs = timingExceptions || [];
  if (excs.length) {
    lines.push('');
    lines.push('# --- Timing exceptions ---');
    const fromC = e => e.from ? `-from [get_pins ${_sanitize(e.from)}/Q] ` : '';
    const toC   = e => e.to   ? `-to [get_pins ${_sanitize(e.to)}/D] `   : '';
    for (const e of excs) {
      const ft = `${fromC(e)}${toC(e)}`.trim();
      if (e.type === 'false_path') {
        lines.push(`set_false_path ${ft}`.trim());
      } else if (e.type === 'multicycle') {
        const N = Math.max(1, Math.round(Number(e.value) || 1));
        lines.push(`set_multicycle_path ${N} -setup ${ft}`.trim());
        lines.push(`set_multicycle_path ${N - 1} -hold ${ft}`.trim());
      } else if (e.type === 'max_delay') {
        const d = Number(e.value) || 0;
        lines.push(`set_max_delay ${d.toFixed(3)} ${ft}`.trim());
      } else if (e.type === 'case_analysis') {
        const v = (Number(e.value) ? 1 : 0);
        const port = _sanitize(e.from || 'mode_pin');
        lines.push(`set_case_analysis ${v} [get_ports ${port}]`);
      }
    }
  }

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

/**
 * Internal phases of a real synthesis tool (DC compile_ultra style).
 * Educational — metrics are best-effort estimates derived from the scene.
 */
export function synthesisSteps(scene) {
  const nodes = scene.nodes || [];
  const wires = scene.wires || [];
  const physical = nodes.filter(isPhysicalCell);
  const r = synthesize(scene, { includeNetlist: false });
  // Heuristics for the educational metrics
  const nets = wires.filter(w => !w.isClockWire).length;
  const sharing = Math.max(0, physical.length - r.totalCells);
  // Approximate "buffered" as nodes with fanout > 1 (would need buffers in real flow)
  const succCount = new Map();
  for (const w of wires) {
    if (w.isClockWire) continue;
    succCount.set(w.sourceId, (succCount.get(w.sourceId) || 0) + 1);
  }
  let buffered = 0;
  for (const v of succCount.values()) if (v > 2) buffered++;
  return [
    {
      name: 'Elaborate',
      desc: 'Parse RTL, build module hierarchy, resolve generics & parameters',
      status: 'done',
      metrics: { modules: 1, nets },
    },
    {
      name: 'Translate',
      desc: 'Convert RTL constructs to generic gates (technology-independent)',
      status: 'done',
      metrics: { generic_gates: physical.length },
    },
    {
      name: 'Optimize',
      desc: 'Constant folding, dead-code elimination, sub-expression sharing',
      status: 'done',
      metrics: { removed: 0, shared: sharing },
    },
    {
      name: 'Map',
      desc: 'Bind generic gates to vendor STD cells from the timing library',
      status: r.unmappedTypes.length ? 'warn' : 'done',
      metrics: { mapped: r.totalCells, unmapped: r.unmappedTypes.length },
    },
    {
      name: 'Optimize+',
      desc: 'Post-map: buffering high-fanout nets, gate sizing, retiming',
      status: 'done',
      metrics: { buffered, sized: r.totalCells },
    },
  ];
}

/**
 * Minimal DEF (Design Exchange Format) — what synthesis writes before
 * placement runs. Real synthesis emits cells with `+ UNPLACED` and
 * pins with placeholder coordinates; real placement fills the geometry.
 */
export function generateDEF(scene) {
  const nodes = scene.nodes || [];
  const warnings = [];
  const physical = nodes.filter(isPhysicalCell);
  const ports = nodes.filter(n => n.type === 'INPUT' || n.type === 'OUTPUT' || n.type === 'CLOCK');

  if (physical.length === 0) warnings.push('Empty design — DEF has no components');

  const lines = [];
  lines.push('# =========================================================');
  lines.push('# Auto-generated DEF (Design Exchange Format)');
  lines.push('# Pre-placement: components UNPLACED, pins at placeholder');
  lines.push('# =========================================================');
  lines.push('VERSION 5.8 ;');
  lines.push('DIVIDERCHAR "/" ;');
  lines.push('BUSBITCHARS "[]" ;');
  lines.push('DESIGN top ;');
  lines.push('UNITS DISTANCE MICRONS 1000 ;');
  lines.push('DIEAREA ( 0 0 ) ( 100000 100000 ) ;');
  lines.push('');

  // Components
  lines.push(`COMPONENTS ${physical.length} ;`);
  let i = 0;
  for (const n of physical) {
    i++;
    const cell = (require_synth_cell(n)).cellName;
    lines.push(`- U${i} ${cell} + UNPLACED ;`);
  }
  lines.push('END COMPONENTS');
  lines.push('');

  // Pins
  if (ports.length) {
    lines.push(`PINS ${ports.length} ;`);
    for (const p of ports) {
      const nm = _sanitize(p.label || p.id);
      const dir = p.type === 'INPUT' ? 'INPUT'
                : p.type === 'OUTPUT' ? 'OUTPUT'
                : 'INPUT';
      const use = p.type === 'CLOCK' ? 'CLOCK' : 'SIGNAL';
      lines.push(`- ${nm} + NET ${nm} + DIRECTION ${dir} + USE ${use} + LAYER metal1 ( -1000 -1000 ) ( 1000 1000 ) + PLACED ( 0 0 ) N ;`);
    }
    lines.push('END PINS');
    lines.push('');
  }

  lines.push('END DESIGN');
  return { def: lines.join('\n'), warnings };
}

// Cell lookup helper local to DEF generation to avoid extra import noise.
function require_synth_cell(node) {
  // cellFor is already imported at the top of this module
  return cellFor(node);
}

// ── Clock-gating power model (educational; mirrors SignoffEngine style) ──
const CG_VDD_V            = 0.9;     // supply voltage (matches SignoffEngine)
const CG_CLK_CAP_PF_PER_FF = 0.004;  // clock-pin + local clock-net cap per FF
const CG_IDLE_FRACTION   = 0.5;      // assumed fraction of cycles the bank is idle
const CG_OVERHEAD_PF     = 0.008;    // CKG cell's own always-toggling cap (→ ~4-FF break-even)
const CG_BREAK_EVEN_FFS  = 4;        // rule-of-thumb minimum FFs per gate to pay off

/**
 * Detect clock-gating opportunities in the scene.
 *
 * Finds flip-flops whose data input is an enable-recirculation MUX
 * (D = enable ? new_data : Q), groups them by their shared enable net, and
 * estimates the dynamic-power saving of replacing each recirculation bank with
 * a clock-gating (CKG/ICG) cell. The break-even is ~4 FFs per gate (lecture 5):
 * below that the CKG cell's own switching wastes more than it saves.
 *
 * @param {{nodes: object[], wires: object[]}} scene
 * @param {object} [opts]
 * @param {number} [opts.clockPeriodPs=2000]
 * @returns {{
 *   groups: {enableId, enableLabel, ffIds, ffCount, gateable, savedDynamicMw}[],
 *   totalFFs: number, gateableFFs: number, numGroups: number,
 *   estTotalSavedMw: number, breakEvenFFs: number, estimated: boolean
 * }}
 */
export function detectClockGating(scene, opts = {}) {
  const { clockPeriodPs = 2000 } = opts;
  const nodes = scene.nodes || [];
  const wires = scene.wires || [];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // Incoming wires per node (for D / select / EN pin lookup).
  const inWires = new Map(nodes.map(n => [n.id, []]));
  for (const w of wires) {
    if (inWires.has(w.targetId)) inWires.get(w.targetId).push(w);
  }

  const byEnable = new Map();   // enable net id → Set<ffId>
  let totalFFs = 0;
  const addToEnable = (enId, ffId) => {
    if (enId == null) return;
    if (!byEnable.has(enId)) byEnable.set(enId, new Set());
    byEnable.get(enId).add(ffId);
  };

  for (const n of nodes) {
    const isFF  = FF_TYPE_SET.has(n.type);
    const isReg = n.type === 'REGISTER';   // memory macro with explicit EN pin
    if (!isFF && !isReg) continue;
    totalFFs++;
    const ins = inWires.get(n.id) || [];

    if (isFF) {
      // Data wire(s) into the D pin (skip clock + reset). If the driver is a
      // MUX and the FF's own Q feeds one of the MUX data inputs, it's a
      // recirculation enable bank; the enable = the MUX select net.
      const dataIns = ins.filter(w => !w.isClockWire && !w.isResetWire);
      for (const dw of dataIns) {
        const drv = nodeMap.get(dw.sourceId);
        if (!drv || drv.type !== 'MUX') continue;
        const muxIns    = inWires.get(drv.id) || [];
        const m         = drv.inputCount || 2;       // data inputs 0..m-1, select at m
        const dataMuxIns = muxIns.filter(w => (w.targetInputIndex ?? 0) < m);
        const selWire    = muxIns.find(w => (w.targetInputIndex ?? 0) === m);
        const recirc     = dataMuxIns.some(w => w.sourceId === n.id);
        if (recirc && selWire) { addToEnable(selWire.sourceId, n.id); break; }
      }
    } else if (isReg) {
      // REGISTER pin order: DATA(0), EN(1), CLR(2), CLK. A wired EN = gateable.
      const enWire = ins.find(w => (w.targetInputIndex ?? -1) === 1);
      if (enWire) addToEnable(enWire.sourceId, n.id);
    }
  }

  // Power model.
  const fHz   = 1 / (clockPeriodPs * 1e-12);
  const v2    = CG_VDD_V * CG_VDD_V;
  const r3    = v => Math.round(v * 1000) / 1000;
  const savedFor = (ffCount) => {
    const savedClockMw = fHz * (ffCount * CG_CLK_CAP_PF_PER_FF * 1e-12) * v2 * CG_IDLE_FRACTION * 1e3;
    const overheadMw   = fHz * (CG_OVERHEAD_PF * 1e-12) * v2 * 1e3;   // one CKG cell
    return r3(savedClockMw - overheadMw);
  };

  const groups = [];
  for (const [enableId, ffSet] of byEnable) {
    const ffIds    = [...ffSet];
    const ffCount  = ffIds.length;
    const gateable = ffCount >= CG_BREAK_EVEN_FFS;
    const enNode   = nodeMap.get(enableId);
    groups.push({
      enableId,
      enableLabel: enNode ? (enNode.label || enNode.id) : enableId,
      ffIds, ffCount, gateable,
      savedDynamicMw: gateable ? Math.max(0, savedFor(ffCount)) : savedFor(ffCount),
    });
  }
  // Biggest banks first (most worthwhile).
  groups.sort((a, b) => b.ffCount - a.ffCount);

  const gateableGroups = groups.filter(g => g.gateable);
  const gateableFFs    = gateableGroups.reduce((s, g) => s + g.ffCount, 0);
  const estTotalSavedMw = r3(gateableGroups.reduce((s, g) => s + Math.max(0, g.savedDynamicMw), 0));

  return {
    groups,
    totalFFs,
    gateableFFs,
    numGroups: groups.length,
    estTotalSavedMw,
    breakEvenFFs: CG_BREAK_EVEN_FFS,
    estimated: true,
  };
}

// ── Net DRC model (educational; slew/cap scale with fanout — no library RC) ──
const DRC_BASE_NET_CAP_PF   = 0.02;   // a net's own wire + driver self cap
const DRC_LOAD_PER_FANOUT_PF = 0.03;  // sink input cap + branch wire, per load
const DRC_TRANS_NS_PER_PF   = 1.6;    // slew ≈ cap × this (tuned to limits below)
const DRC_CAP_LIMIT_PF      = 0.20;   // set_max_capacitance
const DRC_TRANS_LIMIT_NS    = 0.50;   // set_max_transition

/**
 * Estimate post-synthesis design-rule violations for max_transition and
 * max_capacitance. Real DRCs use extracted RC; we proxy net cap (and the slew
 * it produces) from fanout, so a high-fanout net flags both checks. Honest
 * heuristic — clearly labeled `estimated`.
 *
 * @param {{nodes: object[], wires: object[]}} scene
 * @param {object} [opts] {capLimitPf, transLimitNs}
 */
export function estimateNetDRC(scene, opts = {}) {
  const {
    capLimitPf   = DRC_CAP_LIMIT_PF,
    transLimitNs = DRC_TRANS_LIMIT_NS,
  } = opts;
  const nodes = scene.nodes || [];
  const wires = scene.wires || [];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // Fanout per driver over data nets (skip clock wires).
  const fanout = new Map();
  for (const w of wires) {
    if (w.isClockWire) continue;
    fanout.set(w.sourceId, (fanout.get(w.sourceId) || 0) + 1);
  }

  let maxNetCapPf = 0, worstCapNodeId = null;
  let maxTransNs  = 0, worstTransNodeId = null;
  let capViolators = 0, transViolators = 0;
  for (const [id, f] of fanout) {
    const cap   = DRC_BASE_NET_CAP_PF + f * DRC_LOAD_PER_FANOUT_PF;
    const trans = DRC_TRANS_NS_PER_PF * cap;
    if (cap   > maxNetCapPf) { maxNetCapPf = cap; worstCapNodeId = id; }
    if (trans > maxTransNs)  { maxTransNs  = trans; worstTransNodeId = id; }
    if (cap   > capLimitPf)   capViolators++;
    if (trans > transLimitNs) transViolators++;
  }
  const lbl = id => { const n = nodeMap.get(id); return n ? (n.label || n.id) : (id || '—'); };
  const r3 = v => Math.round(v * 1000) / 1000;
  return {
    maxNetCapPf: r3(maxNetCapPf), worstCapNodeId, worstCapLabel: lbl(worstCapNodeId),
    capLimitPf, capViolators,
    maxTransNs: r3(maxTransNs), worstTransNodeId, worstTransLabel: lbl(worstTransNodeId),
    transLimitNs, transViolators,
    estimated: true,
  };
}

// ── Multi-Vt model (educational; relative to SVT) ──
const VT_MODEL = {
  LVT: { delayK: 0.85, leakK: 8.0,  label: 'LVT', use: 'critical / tight-slack paths' },
  SVT: { delayK: 1.00, leakK: 1.0,  label: 'SVT', use: 'general logic (balance)' },
  HVT: { delayK: 1.25, leakK: 0.15, label: 'HVT', use: 'slack-rich / leakage-sensitive' },
};
const VT_BASE_LEAK_UW_PER_UM2 = 0.04;   // SVT-equivalent leakage density (mirrors SignoffEngine)

/**
 * Assign a threshold-voltage flavour (HVT / SVT / LVT) to every standard cell
 * and report the mix + speed/power characteristics. Standalone analysis — does
 * NOT change STA timing or the Signoff verdict.
 *
 * Heuristic (needs STA): a cell's tightness = the min slack over the paths it
 * lies on. Tight/critical → LVT (speed), slack-rich → HVT (low leakage), else
 * SVT. With no STA result everything defaults to SVT.
 *
 * @param {{nodes: object[], wires: object[]}} scene
 * @param {object} [opts] {sta, synth}  precomputed STA + synthesize() results
 */
export function analyzeVT(scene, opts = {}) {
  const synth = opts.synth || synthesize(scene, { includeNetlist: false });
  const sta   = opts.sta || null;
  const hasSta = !!(sta && sta.paths && sta.paths.length);

  // min slack per node over the (non-FALSE) paths it appears on
  const minSlack = new Map();
  if (hasSta) {
    for (const p of sta.paths) {
      if (p.status === 'FALSE') continue;
      for (const id of p.nodeIds) {
        const cur = minSlack.get(id);
        if (cur === undefined || p.slackPs < cur) minSlack.set(id, p.slackPs);
      }
    }
  }
  const period = (sta && sta.clockPeriodPs) || 2000;
  const tight  = 0.10 * period;   // < this slack ⇒ LVT
  const loose  = 0.40 * period;   // > this slack ⇒ HVT

  const byVt = {
    LVT: { count: 0, areaUm2: 0, nodeIds: [] },
    SVT: { count: 0, areaUm2: 0, nodeIds: [] },
    HVT: { count: 0, areaUm2: 0, nodeIds: [] },
  };
  for (const ci of synth.cellInstances) {
    const s = minSlack.get(ci.nodeId);
    let vt = 'SVT';
    if (hasSta && s !== undefined) {
      if (s < tight) vt = 'LVT';
      else if (s > loose) vt = 'HVT';
    }
    byVt[vt].count++;
    byVt[vt].areaUm2 += ci.areaUm2;
    if (byVt[vt].nodeIds.length < 200) byVt[vt].nodeIds.push(ci.nodeId);
  }

  const r3 = v => Math.round(v * 1000) / 1000;
  for (const k of ['LVT', 'SVT', 'HVT']) {
    byVt[k].areaUm2 = r3(byVt[k].areaUm2);
    byVt[k].estLeakageMw = r3(byVt[k].areaUm2 * VT_BASE_LEAK_UW_PER_UM2 * VT_MODEL[k].leakK / 1000);
  }
  const characteristics = ['LVT', 'SVT', 'HVT'].map(k => ({
    vt: k,
    relSpeed:   `×${VT_MODEL[k].delayK} delay`,
    relLeakage: `×${VT_MODEL[k].leakK} leakage`,
    use:        VT_MODEL[k].use,
  }));
  const totalLeakageMw = r3(['LVT', 'SVT', 'HVT'].reduce((s, k) => s + byVt[k].estLeakageMw, 0));

  return {
    byVt, characteristics,
    totalCells: synth.cellInstances.length,
    totalLeakageMw,
    hasSta,
    note: hasSta ? null : 'All cells default to SVT — run STA (or RUN ALL) to enable Vt assignment by slack.',
    estimated: true,
  };
}
