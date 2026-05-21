// Multi-input gates — AND/OR/XOR/NAND/NOR/XNOR with 3 and 4 inputs.
//
// Verifies:
//   1. GATE_FN.* is variadic and produces the correct logic for ≥3 args.
//   2. MULTI_INPUT_GATES set contains exactly the variadic gates.
//   3. End-to-end: 3-input AND built as a GATE_SLOT with inputCount=3
//      reads 3 wires and produces the AND of all three.
//   4. NOT/BUF/TRIBUF remain unchanged (regression).

import { createComponent, createWire } from '../../js/components/Component.js';
import { evaluate, GATE_FN, MULTI_INPUT_GATES } from '../../js/engine/SimulationEngine.js';

let failed = 0;
function check(label, cond, detail = '') {
  const mark = cond ? 'PASS' : 'FAIL';
  if (!cond) failed++;
  console.log(`  [${mark}] ${label}${detail ? ' — ' + detail : ''}`);
}

console.log('\n-- Multi-input gates --');

// ── 1. GATE_FN variadic correctness ────────────────────────────
console.log('\n  · GATE_FN variadic');

// AND
check('AND(1,1,1) = 1', GATE_FN.AND(1, 1, 1) === 1);
check('AND(1,1,0) = 0', GATE_FN.AND(1, 1, 0) === 0);
check('AND(1,1,1,1) = 1', GATE_FN.AND(1, 1, 1, 1) === 1);
check('AND(1,0,1,1) = 0', GATE_FN.AND(1, 0, 1, 1) === 0);
check('AND(0,0,0,0) = 0', GATE_FN.AND(0, 0, 0, 0) === 0);

// OR
check('OR(0,0,0) = 0', GATE_FN.OR(0, 0, 0) === 0);
check('OR(0,1,0) = 1', GATE_FN.OR(0, 1, 0) === 1);
check('OR(0,0,0,1) = 1', GATE_FN.OR(0, 0, 0, 1) === 1);
check('OR(0,0,0,0) = 0', GATE_FN.OR(0, 0, 0, 0) === 0);

// XOR (odd parity)
check('XOR(1,1,1) = 1 (odd ones)', GATE_FN.XOR(1, 1, 1) === 1);
check('XOR(1,1,0) = 0 (even ones)', GATE_FN.XOR(1, 1, 0) === 0);
check('XOR(1,0,1,1) = 1 (3 ones, odd)', GATE_FN.XOR(1, 0, 1, 1) === 1);
check('XOR(1,1,1,1) = 0 (4 ones, even)', GATE_FN.XOR(1, 1, 1, 1) === 0);

// NAND
check('NAND(1,1,1) = 0', GATE_FN.NAND(1, 1, 1) === 0);
check('NAND(1,1,0) = 1', GATE_FN.NAND(1, 1, 0) === 1);
check('NAND(1,1,1,1) = 0', GATE_FN.NAND(1, 1, 1, 1) === 0);
check('NAND(1,0,1,1) = 1', GATE_FN.NAND(1, 0, 1, 1) === 1);

// NOR
check('NOR(0,0,0) = 1', GATE_FN.NOR(0, 0, 0) === 1);
check('NOR(0,1,0) = 0', GATE_FN.NOR(0, 1, 0) === 0);
check('NOR(0,0,0,0) = 1', GATE_FN.NOR(0, 0, 0, 0) === 1);

// XNOR (even parity)
check('XNOR(1,1,1) = 0', GATE_FN.XNOR(1, 1, 1) === 0);
check('XNOR(1,1,0) = 1', GATE_FN.XNOR(1, 1, 0) === 1);
check('XNOR(1,1,1,1) = 1', GATE_FN.XNOR(1, 1, 1, 1) === 1);

// ── 2. MULTI_INPUT_GATES set ───────────────────────────────────
console.log('\n  · MULTI_INPUT_GATES set');
const expected = ['AND', 'OR', 'XOR', 'NAND', 'NOR', 'XNOR'];
check('exactly 6 entries', MULTI_INPUT_GATES.size === 6);
for (const g of expected) check(`contains ${g}`, MULTI_INPUT_GATES.has(g));
check('does NOT contain NOT', !MULTI_INPUT_GATES.has('NOT'));
check('does NOT contain BUF', !MULTI_INPUT_GATES.has('BUF'));
check('does NOT contain TRIBUF', !MULTI_INPUT_GATES.has('TRIBUF'));

// ── 3. End-to-end: 3-input AND in a circuit ───────────────────
console.log('\n  · end-to-end 3-input AND');
{
  const a = { ...createComponent('INPUT', 0, 0), id: 'a', fixedValue: 1 };
  const b = { ...createComponent('INPUT', 0, 0), id: 'b', fixedValue: 1 };
  const c = { ...createComponent('INPUT', 0, 0), id: 'c', fixedValue: 1 };
  const g = { ...createComponent('GATE_SLOT', 0, 0), id: 'g', gate: 'AND', inputCount: 3 };
  const o = { ...createComponent('OUTPUT', 0, 0), id: 'o' };
  const scene = {
    nodes: [a, b, c, g, o],
    wires: [
      { ...createWire('a', 'g', 0), id: 'w1' },
      { ...createWire('b', 'g', 1), id: 'w2' },
      { ...createWire('c', 'g', 2), id: 'w3' },
      { ...createWire('g', 'o', 0), id: 'w4' },
    ],
  };

  // All three 1 → output 1
  let { nodeValues } = evaluate(scene.nodes, scene.wires, new Map(), 0);
  check('AND(1,1,1) via engine = 1', nodeValues.get('o') === 1);

  // One zero → output 0
  c.fixedValue = 0;
  ({ nodeValues } = evaluate(scene.nodes, scene.wires, new Map(), 1));
  check('AND(1,1,0) via engine = 0', nodeValues.get('o') === 0);
}

// ── 4. End-to-end: 4-input XOR (odd-parity detector) ──────────
console.log('\n  · end-to-end 4-input XOR (parity)');
{
  const ins = [];
  for (let i = 0; i < 4; i++) {
    ins.push({ ...createComponent('INPUT', 0, 0), id: 'i' + i, fixedValue: 0 });
  }
  const g = { ...createComponent('GATE_SLOT', 0, 0), id: 'xor4', gate: 'XOR', inputCount: 4 };
  const o = { ...createComponent('OUTPUT', 0, 0), id: 'parity' };
  const scene = {
    nodes: [...ins, g, o],
    wires: [
      ...ins.map((n, idx) => ({ ...createWire(n.id, 'xor4', idx), id: 'w' + idx })),
      { ...createWire('xor4', 'parity', 0), id: 'wout' },
    ],
  };

  for (let bits = 0; bits < 16; bits++) {
    ins.forEach((n, i) => { n.fixedValue = (bits >> i) & 1; });
    const onesCount = bits.toString(2).split('').filter(c => c === '1').length;
    const expected = onesCount & 1; // odd parity
    const { nodeValues } = evaluate(scene.nodes, scene.wires, new Map(), bits);
    const got = nodeValues.get('parity');
    if (got !== expected) {
      check(`XOR4(bits=${bits.toString(2).padStart(4,'0')}) = ${expected}`, false, `got ${got}`);
    }
  }
  // Spot-confirm two specific cases as PASS messages
  ins.forEach((n, i) => { n.fixedValue = [1,1,1,0][i]; });
  let { nodeValues } = evaluate(scene.nodes, scene.wires, new Map(), 100);
  check('XOR4(1,1,1,0) = 1 (3 ones, odd)', nodeValues.get('parity') === 1);

  ins.forEach((n, i) => { n.fixedValue = [1,1,1,1][i]; });
  ({ nodeValues } = evaluate(scene.nodes, scene.wires, new Map(), 101));
  check('XOR4(1,1,1,1) = 0 (4 ones, even)', nodeValues.get('parity') === 0);
}

// ── 5. Regression — single-input gates still work ─────────────
console.log('\n  · regression: NOT / BUF / TRIBUF');
check('NOT(0) = 1',  GATE_FN.NOT(0) === 1);
check('NOT(1) = 0',  GATE_FN.NOT(1) === 0);
check('BUF(1) = 1',  GATE_FN.BUF(1) === 1);
check('TRIBUF(1, 1) = 1', GATE_FN.TRIBUF(1, 1) === 1);
check('TRIBUF(1, 0) = null (high-Z)', GATE_FN.TRIBUF(1, 0) === null);

// ── 6. Regression — 2-input case unchanged ────────────────────
console.log('\n  · regression: 2-input still works');
check('AND(1, 0) = 0', GATE_FN.AND(1, 0) === 0);
check('AND(1, 1) = 1', GATE_FN.AND(1, 1) === 1);
check('OR(1, 0) = 1',  GATE_FN.OR(1, 0) === 1);
check('XOR(1, 0) = 1', GATE_FN.XOR(1, 0) === 1);
check('NAND(1, 1) = 0', GATE_FN.NAND(1, 1) === 0);
check('NOR(0, 0) = 1',  GATE_FN.NOR(0, 0) === 1);
check('XNOR(1, 1) = 1', GATE_FN.XNOR(1, 1) === 1);

// ── 7. Regression — unconnected gate doesn't throw ────────────
// Bug fix: variadic reduce() throws on empty array. Engine must
// short-circuit when an unconnected gate has no input slots.
console.log('\n  · regression: unconnected gate is safe');
{
  const g = { ...createComponent('GATE_SLOT', 0, 0), id: 'orphan', gate: 'AND' };
  const o = { ...createComponent('OUTPUT', 0, 0), id: 'o' };
  const scene = {
    nodes: [g, o],
    wires: [{ ...createWire('orphan', 'o', 0), id: 'w' }],
  };
  let threw = false;
  try {
    const { nodeValues } = evaluate(scene.nodes, scene.wires, new Map(), 0);
    check('unconnected AND evaluates without throwing', true);
    check('unconnected AND has null intermediate value',
          nodeValues.get('orphan') === null);
  } catch (e) {
    threw = true;
    check('unconnected AND evaluates without throwing', false, e.message);
  }
}

if (failed === 0) {
  console.log('\n  ✓ all multi-input-gate assertions passed.\n');
  process.exit(0);
} else {
  console.log(`\n  ✗ ${failed} failure(s).\n`);
  process.exit(1);
}
