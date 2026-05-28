// SynthesisEngine unit tests.
// Run:  node examples/tests/test-synthesis-engine.mjs

import { synthesize, generateSDC, classifyGroupPaths, estimateCongestion, synthesisSteps, generateDEF } from '../../js/backend/SynthesisEngine.js';
import { cellFor, isPhysicalCell } from '../../js/backend/CellLibrary.js';
import { readFileSync }         from 'fs';
import { fileURLToPath }        from 'url';
import { dirname, resolve }     from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const loadCircuit = f => JSON.parse(readFileSync(resolve(__dir, '..', 'circuits', f), 'utf-8'));

let failed = 0;
function check(label, cond, detail = '') {
  const mark = cond ? 'PASS' : 'FAIL';
  if (!cond) failed++;
  console.log(`  [${mark}] ${label}${detail ? ' — ' + detail : ''}`);
}
const mkScene = (nodes, wires) => ({ nodes, wires });

console.log('\n=== SynthesisEngine Tests ===\n');

// --- T1: Empty scene ---
{
  console.log('T1: Empty scene');
  const r = synthesize(mkScene([], []));
  check('totalCells = 0', r.totalCells === 0);
  check('area = 0', r.totalAreaUm2 === 0);
  check('no unmapped types', r.unmappedTypes.length === 0);
}

// --- T2: Single AND gate ---
{
  console.log('\nT2: Single AND gate');
  const r = synthesize(mkScene(
    [{ type: 'GATE_SLOT', id: 'g1', x:0, y:0, gate: 'AND' }],
    []
  ));
  check('totalCells = 1', r.totalCells === 1);
  check('histogram AND2X1 = 1', r.cellHistogram.AND2X1 === 1);
  check('area = 1.4 µm²', r.totalAreaUm2 === 1.4, `got ${r.totalAreaUm2}`);
  check('numCombinational = 1', r.numCombinational === 1);
}

// --- T3: Mixed gates ---
{
  console.log('\nT3: Mixed gates (AND, OR, NOT)');
  const r = synthesize(mkScene(
    [
      { type: 'GATE_SLOT', id: 'g1', x:0, y:0, gate: 'AND' },
      { type: 'GATE_SLOT', id: 'g2', x:0, y:0, gate: 'OR'  },
      { type: 'GATE_SLOT', id: 'g3', x:0, y:0, gate: 'NOT' },
    ],
    []
  ));
  check('totalCells = 3', r.totalCells === 3);
  // 1.4 + 1.4 + 0.7 = 3.5
  check('area = 3.5 µm²', r.totalAreaUm2 === 3.5, `got ${r.totalAreaUm2}`);
  check('histogram AND/OR/INV', r.cellHistogram.AND2X1 === 1 && r.cellHistogram.OR2X1 === 1 && r.cellHistogram.INVX1 === 1);
}

// --- T4: FF_SLOT categorized as sequential ---
{
  console.log('\nT4: FF_SLOT → sequential');
  const r = synthesize(mkScene(
    [{ type: 'FF_SLOT', id: 'ff', x:0, y:0, gate: 'D' }],
    []
  ));
  check('numSequential = 1', r.numSequential === 1);
  check('cell = DFFX1', r.cellHistogram.DFFX1 === 1);
  check('area = 4.48 µm²', r.totalAreaUm2 === 4.48, `got ${r.totalAreaUm2}`);
}

// --- T5: Logic depth of 3-gate chain ---
{
  console.log('\nT5: Logic depth');
  const r = synthesize(mkScene(
    [
      { type: 'FF_SLOT',  id: 'ff', x:0, y:0, gate: 'D' },
      { type: 'GATE_SLOT',id: 'g1', x:0, y:0, gate: 'AND' },
      { type: 'GATE_SLOT',id: 'g2', x:0, y:0, gate: 'OR'  },
      { type: 'GATE_SLOT',id: 'g3', x:0, y:0, gate: 'NOT' },
      { type: 'OUTPUT',   id: 'q',  x:0, y:0 },
    ],
    [
      { sourceId: 'ff', targetId: 'g1', targetInputIndex: 0, sourceOutputIndex: 0, id: 'w1' },
      { sourceId: 'g1', targetId: 'g2', targetInputIndex: 0, sourceOutputIndex: 0, id: 'w2' },
      { sourceId: 'g2', targetId: 'g3', targetInputIndex: 0, sourceOutputIndex: 0, id: 'w3' },
      { sourceId: 'g3', targetId: 'q',  targetInputIndex: 0, sourceOutputIndex: 0, id: 'w4' },
    ]
  ));
  check('logicLevels = 3', r.logicLevels === 3, `got ${r.logicLevels}`);
}

// --- T6: Max fanout ---
{
  console.log('\nT6: Max fanout');
  const r = synthesize(mkScene(
    [
      { type: 'GATE_SLOT', id: 'src', x:0, y:0, gate: 'AND' },
      { type: 'GATE_SLOT', id: 'a', x:0, y:0, gate: 'NOT' },
      { type: 'GATE_SLOT', id: 'b', x:0, y:0, gate: 'NOT' },
      { type: 'GATE_SLOT', id: 'c', x:0, y:0, gate: 'NOT' },
      { type: 'GATE_SLOT', id: 'd', x:0, y:0, gate: 'NOT' },
    ],
    [
      { sourceId: 'src', targetId: 'a', targetInputIndex: 0, sourceOutputIndex: 0, id: 'w1' },
      { sourceId: 'src', targetId: 'b', targetInputIndex: 0, sourceOutputIndex: 0, id: 'w2' },
      { sourceId: 'src', targetId: 'c', targetInputIndex: 0, sourceOutputIndex: 0, id: 'w3' },
      { sourceId: 'src', targetId: 'd', targetInputIndex: 0, sourceOutputIndex: 0, id: 'w4' },
    ]
  ));
  check('maxFanout = 4', r.maxFanout === 4, `got ${r.maxFanout}`);
  check('maxFanoutNode = src', r.maxFanoutNode === 'src');
}

// --- T7: Unmapped type ---
{
  console.log('\nT7: Unmapped type');
  const r = synthesize(mkScene(
    [{ type: 'WEIRD_GIZMO', id: 'x', x:0, y:0 }],
    []
  ));
  check('unmappedTypes contains WEIRD_GIZMO', r.unmappedTypes.includes('WEIRD_GIZMO'));
}

// --- T8: Netlist generation ---
{
  console.log('\nT8: Netlist generation');
  const r = synthesize(mkScene(
    [
      { type: 'INPUT',    id: 'a',  x:0, y:0, label: 'A' },
      { type: 'INPUT',    id: 'b',  x:0, y:0, label: 'B' },
      { type: 'GATE_SLOT',id: 'g1', x:0, y:0, gate: 'AND', label: 'AND1' },
      { type: 'OUTPUT',   id: 'y',  x:0, y:0, label: 'Y' },
    ],
    [
      { sourceId: 'a',  targetId: 'g1', targetInputIndex: 0, sourceOutputIndex: 0, id: 'w1' },
      { sourceId: 'b',  targetId: 'g1', targetInputIndex: 1, sourceOutputIndex: 0, id: 'w2' },
      { sourceId: 'g1', targetId: 'y',  targetInputIndex: 0, sourceOutputIndex: 0, id: 'w3' },
    ]
  ));
  check('netlist has module top', r.netlist.includes('module top'));
  check('netlist has AND2X1', r.netlist.includes('AND2X1'));
  check('netlist has endmodule', r.netlist.includes('endmodule'));
  check('netlist has input A, B', r.netlist.includes('input') && r.netlist.includes('A') && r.netlist.includes('B'));
  check('netlist has output Y', r.netlist.includes('output') && r.netlist.includes('Y'));
}

// --- T9: cellFor / isPhysicalCell ---
{
  console.log('\nT9: CellLibrary helpers');
  check('INPUT not physical', !isPhysicalCell({ type: 'INPUT' }));
  check('CLOCK not physical', !isPhysicalCell({ type: 'CLOCK' }));
  check('FF_SLOT is physical', isPhysicalCell({ type: 'FF_SLOT' }));
  check('AND gate is physical', isPhysicalCell({ type: 'GATE_SLOT', gate: 'AND' }));
  check('cellFor AND → AND2X1', cellFor({ type: 'GATE_SLOT', gate: 'AND' }).cellName === 'AND2X1');
  check('cellFor MUX → MUX2X1', cellFor({ type: 'GATE_SLOT', gate: 'MUX' }).cellName === 'MUX2X1');
}

// --- T10: Demo synth-simple-gates.json ---
{
  console.log('\nT10: synth-simple-gates.json');
  const scene = loadCircuit('synth-simple-gates.json');
  const r = synthesize(scene);
  // 3 gates (AND, OR, NOT) + 1 FF = 4 cells
  check('totalCells = 4', r.totalCells === 4, `got ${r.totalCells}`);
  check('numCombinational = 3', r.numCombinational === 3);
  check('numSequential = 1', r.numSequential === 1);
  // 1.4 + 1.4 + 0.7 + 4.48 = 7.98 µm²
  check('area ≈ 7.98', Math.abs(r.totalAreaUm2 - 7.98) < 0.01, `got ${r.totalAreaUm2}`);
  check('netlist not empty', r.netlist.length > 0);
}

// --- T11: Demo synth-with-hierarchy.json ---
{
  console.log('\nT11: synth-with-hierarchy.json');
  const scene = loadCircuit('synth-with-hierarchy.json');
  const r = synthesize(scene);
  // 2 FF (input) + XOR + AND + MUX + HA + FF (output) = 7 cells
  check('totalCells = 7', r.totalCells === 7, `got ${r.totalCells}`);
  check('has MUX2X1', r.cellHistogram.MUX2X1 === 1);
  check('has HAX1', r.cellHistogram.HAX1 === 1);
  check('has XOR2X1', r.cellHistogram.XOR2X1 === 1);
  check('numSequential = 3', r.numSequential === 3);
  check('numComplex = 2', r.numComplex === 2, `got ${r.numComplex}`);
}

// --- T12: SDC includes create_clock for each CLOCK node ---
{
  console.log('\nT12: SDC create_clock per CLOCK node');
  const scene = mkScene(
    [
      { type: 'CLOCK', id: 'clk1', x:0, y:0, label: 'CLK_MAIN' },
      { type: 'CLOCK', id: 'clk2', x:0, y:0, label: 'CLK_DDR' },
    ],
    []
  );
  const { sdc, warnings } = generateSDC(scene, { clockPeriodNs: 1.5 });
  check('has create_clock CLK_MAIN', sdc.includes('create_clock -name CLK_MAIN'));
  check('has create_clock CLK_DDR',  sdc.includes('create_clock -name CLK_DDR'));
  check('period 1.500', sdc.includes('1.500'));
  check('warns about multiple clocks', warnings.some(w => w.includes('CLOCK')));
}

// --- T13: SDC emits I/O delays ---
{
  console.log('\nT13: SDC I/O delays');
  const scene = mkScene(
    [
      { type: 'CLOCK',  id: 'clk', x:0, y:0, label: 'clk' },
      { type: 'INPUT',  id: 'a',   x:0, y:0, label: 'A' },
      { type: 'INPUT',  id: 'b',   x:0, y:0, label: 'B' },
      { type: 'OUTPUT', id: 'y',   x:0, y:0, label: 'Y' },
    ],
    []
  );
  const { sdc } = generateSDC(scene);
  check('has set_input_delay',  sdc.includes('set_input_delay'));
  check('has set_output_delay', sdc.includes('set_output_delay'));
  check('input ports A B',  sdc.includes('A B'));
  check('output port Y',    sdc.includes('Y'));
  check('has set_max_fanout',     sdc.includes('set_max_fanout'));
  check('has set_max_transition', sdc.includes('set_max_transition'));
}

// --- T14: classifyGroupPaths ---
{
  console.log('\nT14: classifyGroupPaths counts');
  // in -> g1 -> ff (in2reg)
  // ff -> g2 -> ff2 (reg2reg)
  // ff2 -> g3 -> out (reg2out)
  // in -> g4 -> out2 (in2out)
  const scene = mkScene(
    [
      { type: 'INPUT',    id: 'in1', x:0, y:0 },
      { type: 'GATE_SLOT',id: 'g1',  x:0, y:0, gate: 'AND' },
      { type: 'FF_SLOT',  id: 'ff',  x:0, y:0, gate: 'D' },
      { type: 'GATE_SLOT',id: 'g2',  x:0, y:0, gate: 'OR'  },
      { type: 'FF_SLOT',  id: 'ff2', x:0, y:0, gate: 'D' },
      { type: 'GATE_SLOT',id: 'g3',  x:0, y:0, gate: 'NOT' },
      { type: 'OUTPUT',   id: 'out', x:0, y:0 },
      { type: 'INPUT',    id: 'in2', x:0, y:0 },
      { type: 'GATE_SLOT',id: 'g4',  x:0, y:0, gate: 'NOT' },
      { type: 'OUTPUT',   id: 'out2',x:0, y:0 },
    ],
    [
      { sourceId: 'in1', targetId: 'g1',  targetInputIndex: 0, sourceOutputIndex: 0, id: 'w1' },
      { sourceId: 'g1',  targetId: 'ff',  targetInputIndex: 0, sourceOutputIndex: 0, id: 'w2' },
      { sourceId: 'ff',  targetId: 'g2',  targetInputIndex: 0, sourceOutputIndex: 0, id: 'w3' },
      { sourceId: 'g2',  targetId: 'ff2', targetInputIndex: 0, sourceOutputIndex: 0, id: 'w4' },
      { sourceId: 'ff2', targetId: 'g3',  targetInputIndex: 0, sourceOutputIndex: 0, id: 'w5' },
      { sourceId: 'g3',  targetId: 'out', targetInputIndex: 0, sourceOutputIndex: 0, id: 'w6' },
      { sourceId: 'in2', targetId: 'g4',  targetInputIndex: 0, sourceOutputIndex: 0, id: 'w7' },
      { sourceId: 'g4',  targetId: 'out2',targetInputIndex: 0, sourceOutputIndex: 0, id: 'w8' },
    ]
  );
  const r = classifyGroupPaths(scene);
  check('in2reg = 1',  r.groups.in2reg.count === 1, `got ${r.groups.in2reg.count}`);
  check('reg2reg = 1', r.groups.reg2reg.count === 1, `got ${r.groups.reg2reg.count}`);
  check('reg2out = 1', r.groups.reg2out.count === 1, `got ${r.groups.reg2out.count}`);
  check('in2out = 1',  r.groups.in2out.count === 1, `got ${r.groups.in2out.count}`);
  check('totalPaths = 4', r.totalPaths === 4);
}

// --- T15: estimateCongestion grid ---
{
  console.log('\nT15: estimateCongestion');
  const scene = mkScene(
    [
      { type: 'GATE_SLOT', id: 'g1', x:   0, y:   0, gate: 'AND' },
      { type: 'GATE_SLOT', id: 'g2', x:  10, y:  10, gate: 'AND' },
      { type: 'GATE_SLOT', id: 'g3', x: 100, y: 100, gate: 'AND' },
      { type: 'GATE_SLOT', id: 'g4', x: 100, y: 100, gate: 'AND' },
    ],
    []
  );
  const r = estimateCongestion(scene, 4);
  check('grid is 4x4', r.gridSize === 4 && r.grid.length === 4 && r.grid[0].length === 4);
  const sum = r.grid.flat().reduce((s, v) => s + v, 0);
  check('sum of densities = node count (4)', sum === 4, `got ${sum}`);
  check('maxDensity = 2', r.maxDensity === 2, `got ${r.maxDensity}`);
}

// --- T16: SDC for synth demos ---
{
  console.log('\nT16: SDC for demo circuits');
  const scene = loadCircuit('synth-simple-gates.json');
  const { sdc } = generateSDC(scene);
  check('contains module-level constraints', sdc.includes('current_design'));
  check('contains CLK port', sdc.includes('CLK'));
  check('contains output port Q', /\bQ\b/.test(sdc));
}

// --- T17: synthesisSteps returns 5 phases ---
{
  console.log('\nT17: synthesisSteps');
  const scene = loadCircuit('synth-simple-gates.json');
  const steps = synthesisSteps(scene);
  check('5 phases', steps.length === 5);
  check('phase names', steps.map(s => s.name).join('|') === 'Elaborate|Translate|Optimize|Map|Optimize+');
  check('each has metrics', steps.every(s => s.metrics && typeof s.metrics === 'object'));
  check('each has status', steps.every(s => ['done','warn','error'].includes(s.status)));
}

// --- T18: synthesisSteps Map count matches synthesize ---
{
  console.log('\nT18: synthesisSteps Map count');
  const scene = loadCircuit('synth-with-hierarchy.json');
  const steps = synthesisSteps(scene);
  const r = synthesize(scene);
  const mapStep = steps.find(s => s.name === 'Map');
  check('mapped = totalCells', mapStep.metrics.mapped === r.totalCells, `got ${mapStep.metrics.mapped} vs ${r.totalCells}`);
}

// --- T19: generateDEF basic structure ---
{
  console.log('\nT19: generateDEF structure');
  const scene = loadCircuit('synth-simple-gates.json');
  const { def } = generateDEF(scene);
  check('has VERSION 5.8', def.includes('VERSION 5.8'));
  check('has DESIGN top', def.includes('DESIGN top'));
  check('has COMPONENTS', def.includes('COMPONENTS'));
  check('has END COMPONENTS', def.includes('END COMPONENTS'));
  check('has PINS', def.includes('PINS'));
  check('has END DESIGN', def.includes('END DESIGN'));
  check('cells are UNPLACED', def.includes('+ UNPLACED'));
}

// --- T20: DEF lists one component per physical cell ---
{
  console.log('\nT20: DEF component count');
  const scene = loadCircuit('synth-simple-gates.json');
  const { def } = generateDEF(scene);
  const r = synthesize(scene);
  // Count lines starting with "- U" inside the components section
  const cellLines = def.split('\n').filter(l => /^- U\d+\s/.test(l));
  check('component count = physical cell count', cellLines.length === r.totalCells, `got ${cellLines.length} vs ${r.totalCells}`);
}

// --- T21: DEF lists one PIN per INPUT/OUTPUT/CLOCK ---
{
  console.log('\nT21: DEF pin count');
  const scene = loadCircuit('synth-simple-gates.json');
  const { def } = generateDEF(scene);
  const ports = scene.nodes.filter(n => n.type === 'INPUT' || n.type === 'OUTPUT' || n.type === 'CLOCK');
  const pinLines = def.split('\n').filter(l => /^- \w+ \+ NET/.test(l));
  check('pin count matches port count', pinLines.length === ports.length, `got ${pinLines.length} vs ${ports.length}`);
}

// --- T22: SDC with customGroups ---
{
  console.log('\nT22: SDC customGroups');
  const scene = loadCircuit('synth-simple-gates.json');
  const { sdc } = generateSDC(scene, {
    customGroups: [
      { name: 'critical1', from: 'ff_a', to: 'ff_b' },
      { name: 'critical2', from: 'reg_x', to: 'reg_y' },
    ],
  });
  check('has custom group section', sdc.includes('Custom group paths'));
  check('emits set_group_path -name critical1', sdc.includes('set_group_path -name critical1'));
  check('emits set_group_path -name critical2', sdc.includes('set_group_path -name critical2'));
  check('uses get_pins ff_a/Q', sdc.includes('get_pins ff_a/Q'));
  check('uses get_pins ff_b/D', sdc.includes('get_pins ff_b/D'));
}

console.log(`\n${'─'.repeat(40)}`);
if (failed) {
  console.log(`FAILED: ${failed} test(s)\n`);
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED\n');
}
