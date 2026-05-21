// Verify #5008's BEFORE (parts א-ד) and AFTER (part ה) circuits compute
// identical outputs for the same inputs — the central claim that
// retiming preserves function.
import { QUESTIONS } from '../IQ/timing-cdc/index.js';
import { evaluate } from '../js/engine/SimulationEngine.js';

const q = QUESTIONS.find(x => x.id === 'interview-retiming-leiserson-saxe');
if (!q) { console.error('Q not found'); process.exit(1); }

function lab(scene, name) {
  return scene.nodes.find(n => n.label === name);
}

// Drive one clock cycle (rising then falling edge).
function tick(scene, ffs, i) {
  const clk = scene.nodes.find(n => n.type === 'CLOCK');
  clk.value = 1; evaluate(scene.nodes, scene.wires, ffs, i);
  clk.value = 0; evaluate(scene.nodes, scene.wires, ffs, i);
}

// Run a scene for `cycles` ticks then read combinational outputs.
function run(scene, inputs, cycles) {
  for (const k of Object.keys(inputs)) {
    const n = lab(scene, k);
    if (!n) throw new Error(`Input "${k}" not in scene`);
    n.fixedValue = inputs[k];
  }
  const ffs = new Map();
  for (let i = 0; i < cycles; i++) tick(scene, ffs, i);
  // Final eval (clk low) to settle combinational outputs after the
  // last edge.
  const clk = scene.nodes.find(n => n.type === 'CLOCK');
  clk.value = 0;
  const r = evaluate(scene.nodes, scene.wires, ffs, cycles);
  return r.nodeValues;
}

const tests = [
  { a: 0, b: 0, c: 0, d: 0, exp_x: 0, exp_y: 0 },
  { a: 1, b: 0, c: 1, d: 0, exp_x: 1, exp_y: 1 },
  { a: 1, b: 1, c: 1, d: 1, exp_x: 0, exp_y: 0 },
  { a: 0, b: 1, c: 1, d: 0, exp_x: 1, exp_y: 1 },
  { a: 1, b: 0, c: 0, d: 0, exp_x: 0, exp_y: 1 },
  { a: 0, b: 1, c: 0, d: 1, exp_x: 1, exp_y: 1 },
];

let fails = 0;

// BEFORE needs 1 cycle (combinational then 1 FF).
// AFTER needs 2 cycles (1 FF then combinational): clock 1 latches the
// inputs into FF_a/b/c/d, then combinational t1/t2/t3/t4 settles.
// (For correctness comparison the cycle count doesn't matter as long
// as each scene has had enough cycles to settle for the chosen vector.)
for (const t of tests) {
  const before = q.parts.find(p => p.label === 'א').circuit();
  const after  = q.parts.find(p => p.label === 'ה').circuit();

  const inp = { a: t.a, b: t.b, c: t.c, d: t.d };
  const bV = run(before, inp, 2);
  const aV = run(after,  inp, 2);

  const bx = bV.get(lab(before, 'out_x').id);
  const by = bV.get(lab(before, 'out_y').id);
  const ax = aV.get(lab(after,  'out_x').id);
  const ay = aV.get(lab(after,  'out_y').id);

  const ok = bx === t.exp_x && by === t.exp_y && ax === t.exp_x && ay === t.exp_y;
  if (!ok) fails++;
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] (a=${t.a},b=${t.b},c=${t.c},d=${t.d}) exp x=${t.exp_x} y=${t.exp_y} · BEFORE x=${bx} y=${by} · AFTER x=${ax} y=${ay}`);
}

console.log('\n' + (fails === 0
  ? `✓ ALL ${tests.length} vectors match — retiming preserves function`
  : `✗ ${fails} mismatched`));
process.exit(fails === 0 ? 0 : 1);
