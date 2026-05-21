// Multi-bit FULL_ADDER and HALF_ADDER (ripple-carry, N-bit).
//
// Verifies:
//   1. bitWidth=1 still produces classical 1-bit FA/HA behaviour (regression).
//   2. bitWidth=2 correctly adds 2-bit unsigned values; carry-out works.
//   3. bitWidth=4 over a representative set of inputs (including the
//      overflow case 0xF + 0xF + 1 = 0x1F → sum=0xF, cout=1).
//   4. HALF_ADDER bitWidth=2 adds 2-bit values with no Cin.
//   5. Bus output (SUM) is the full N-bit value, not just LSB.

import { createComponent, createWire } from '../../js/components/Component.js';
import { evaluate } from '../../js/engine/SimulationEngine.js';

let failed = 0;
function check(label, cond, detail = '') {
  const mark = cond ? 'PASS' : 'FAIL';
  if (!cond) failed++;
  console.log(`  [${mark}] ${label}${detail ? ' — ' + detail : ''}`);
}

console.log('\n-- Multi-bit FA / HA --');

function buildFaScene(bitWidth = 1) {
  const a = { ...createComponent('INPUT', 0, 0), id: 'a', fixedValue: 0 };
  const b = { ...createComponent('INPUT', 0, 0), id: 'b', fixedValue: 0 };
  const cin = { ...createComponent('INPUT', 0, 0), id: 'cin', fixedValue: 0 };
  const fa = { ...createComponent('FULL_ADDER', 0, 0), id: 'fa', bitWidth };
  const sumOut = { ...createComponent('OUTPUT', 0, 0), id: 'sum' };
  const coutOut = { ...createComponent('OUTPUT', 0, 0), id: 'cout' };
  return {
    a, b, cin, fa, sumOut, coutOut,
    scene: {
      nodes: [a, b, cin, fa, sumOut, coutOut],
      wires: [
        { ...createWire('a', 'fa', 0), id: 'w0' },
        { ...createWire('b', 'fa', 1), id: 'w1' },
        { ...createWire('cin', 'fa', 2), id: 'w2' },
        { ...createWire('fa', 'sum',  0, 0), id: 'w3' },
        { ...createWire('fa', 'cout', 0, 1), id: 'w4' },
      ],
    },
  };
}

function buildHaScene(bitWidth = 1) {
  const a = { ...createComponent('INPUT', 0, 0), id: 'a', fixedValue: 0 };
  const b = { ...createComponent('INPUT', 0, 0), id: 'b', fixedValue: 0 };
  const ha = { ...createComponent('HALF_ADDER', 0, 0), id: 'ha', bitWidth };
  const sumOut = { ...createComponent('OUTPUT', 0, 0), id: 'sum' };
  const coutOut = { ...createComponent('OUTPUT', 0, 0), id: 'cout' };
  return {
    a, b, ha, sumOut, coutOut,
    scene: {
      nodes: [a, b, ha, sumOut, coutOut],
      wires: [
        { ...createWire('a', 'ha', 0), id: 'w0' },
        { ...createWire('b', 'ha', 1), id: 'w1' },
        { ...createWire('ha', 'sum',  0, 0), id: 'w2' },
        { ...createWire('ha', 'cout', 0, 1), id: 'w3' },
      ],
    },
  };
}

// ── 1. bitWidth=1 — classical FA (regression) ──────────────────
console.log('\n  · FA bitWidth=1 regression');
{
  const { a, b, cin, scene } = buildFaScene(1);
  for (let i = 0; i < 8; i++) {
    a.fixedValue = (i >> 0) & 1;
    b.fixedValue = (i >> 1) & 1;
    cin.fixedValue = (i >> 2) & 1;
    const { nodeValues } = evaluate(scene.nodes, scene.wires, new Map(), i);
    const sum = nodeValues.get('sum');
    const cout = nodeValues.get('cout');
    const total = a.fixedValue + b.fixedValue + cin.fixedValue;
    const expSum  = total & 1;
    const expCout = (total >> 1) & 1;
    if (sum !== expSum || cout !== expCout) {
      check(`(${a.fixedValue},${b.fixedValue},${cin.fixedValue}): sum=${sum} cout=${cout}`,
            false, `expected sum=${expSum} cout=${expCout}`);
    }
  }
  check('all 8 FA bitWidth=1 vectors pass', true);
}

// ── 2. FA bitWidth=2 exhaustive ────────────────────────────────
console.log('\n  · FA bitWidth=2 exhaustive');
{
  const { a, b, cin, scene } = buildFaScene(2);
  for (let A = 0; A < 4; A++)
    for (let B = 0; B < 4; B++)
      for (let Cin = 0; Cin < 2; Cin++) {
        a.fixedValue = A; b.fixedValue = B; cin.fixedValue = Cin;
        const { nodeValues } = evaluate(scene.nodes, scene.wires, new Map(), 0);
        const sum  = nodeValues.get('sum');
        const cout = nodeValues.get('cout');
        const total = A + B + Cin;
        const expSum  = total & 3;
        const expCout = (total >> 2) & 1;
        if (sum !== expSum || cout !== expCout) {
          check(`A=${A} B=${B} Cin=${Cin}: sum=${sum} cout=${cout}`,
                false, `expected ${expSum},${expCout}`);
        }
      }
  check('all 32 FA bitWidth=2 vectors pass', true);
}

// ── 3. FA bitWidth=4 representative ────────────────────────────
console.log('\n  · FA bitWidth=4 representative');
{
  const { a, b, cin, scene } = buildFaScene(4);
  const cases = [
    [0, 0, 0,   0,  0],
    [3, 5, 0,   8,  0],
    [7, 8, 0,  15,  0],
    [8, 8, 0,   0,  1],   // overflow
    [15, 1, 0,  0,  1],   // overflow
    [15, 15, 1, 15, 1],   // max + max + cin
    [10, 4, 1,  15, 0],
    [0, 0, 1,   1,  0],
  ];
  for (const [A, B, Cin, expSum, expCout] of cases) {
    a.fixedValue = A; b.fixedValue = B; cin.fixedValue = Cin;
    const { nodeValues } = evaluate(scene.nodes, scene.wires, new Map(), 0);
    check(`${A} + ${B} + ${Cin} = sum=${expSum} cout=${expCout}`,
      nodeValues.get('sum') === expSum && nodeValues.get('cout') === expCout,
      `got sum=${nodeValues.get('sum')} cout=${nodeValues.get('cout')}`);
  }
}

// ── 4. HA bitWidth=1 regression ────────────────────────────────
console.log('\n  · HA bitWidth=1 regression');
{
  const { a, b, scene } = buildHaScene(1);
  for (let i = 0; i < 4; i++) {
    a.fixedValue = i & 1; b.fixedValue = (i >> 1) & 1;
    const { nodeValues } = evaluate(scene.nodes, scene.wires, new Map(), 0);
    const total = a.fixedValue + b.fixedValue;
    check(`HA(${a.fixedValue}, ${b.fixedValue}) = sum=${total & 1} carry=${total >> 1}`,
      nodeValues.get('sum') === (total & 1) && nodeValues.get('cout') === ((total >> 1) & 1));
  }
}

// ── 5. HA bitWidth=2 ───────────────────────────────────────────
console.log('\n  · HA bitWidth=2');
{
  const { a, b, scene } = buildHaScene(2);
  for (let A = 0; A < 4; A++)
    for (let B = 0; B < 4; B++) {
      a.fixedValue = A; b.fixedValue = B;
      const { nodeValues } = evaluate(scene.nodes, scene.wires, new Map(), 0);
      const total = A + B;
      const expSum  = total & 3;
      const expCarry = (total >> 2) & 1;
      if (nodeValues.get('sum') !== expSum || nodeValues.get('cout') !== expCarry) {
        check(`HA(${A}, ${B}): sum=${nodeValues.get('sum')} carry=${nodeValues.get('cout')}`,
              false, `expected sum=${expSum} carry=${expCarry}`);
      }
    }
  check('all 16 HA bitWidth=2 vectors pass', true);
}

if (failed === 0) {
  console.log('\n  ✓ all multi-bit FA/HA assertions passed.\n');
  process.exit(0);
} else {
  console.log(`\n  ✗ ${failed} failure(s).\n`);
  process.exit(1);
}
