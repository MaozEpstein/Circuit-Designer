// DFT ATPG — single-fault vector generation.
//
// Verifies:
//   1. For detectable faults, ATPG returns a vector that the fault
//      simulator actually scores as a detector.
//   2. For redundant faults (logic whose effect never reaches a PO),
//      ATPG returns success=false / reason='redundant'.
//   3. The 'all-undetected' helper appends one vector per testable
//      fault and partitions the rest into redundant / exhausted.
//
// Scene #1: Y = (A & B) | C — same as test-dft-fault-simulator.mjs.
// Scene #2: Y = A | (A & B) — B is structurally irrelevant.
//
// Run:  node examples/tests/test-dft-atpg.mjs

import { createComponent, createWire } from '../../js/components/Component.js';
import { simulateFaults } from '../../js/dft/FaultSimulator.js';
import { generateATPGVector, generateATPGForUndetected } from '../../js/dft/ATPG.js';

let failed = 0;
function check(label, cond, detail = '') {
  const mark = cond ? 'PASS' : 'FAIL';
  if (!cond) failed++;
  console.log(`  [${mark}] ${label}${detail ? ' — ' + detail : ''}`);
}

console.log('\n-- DFT ATPG --');

// ── Scene 1: Y = (A & B) | C ─────────────────────────────────
function buildAndOr() {
  const inA  = { ...createComponent('INPUT',     -200, -80), id: 'in_a', fixedValue: 0 };
  const inB  = { ...createComponent('INPUT',     -200,   0), id: 'in_b', fixedValue: 0 };
  const inC  = { ...createComponent('INPUT',     -200,  80), id: 'in_c', fixedValue: 0 };
  const and1 = { ...createComponent('GATE_SLOT',  -50, -40), id: 'and1', gate: 'AND' };
  const or1  = { ...createComponent('GATE_SLOT',  100,   0), id: 'or1',  gate: 'OR'  };
  const out  = { ...createComponent('OUTPUT',     250,   0), id: 'out_y' };
  const w_a  = { ...createWire('in_a', 'and1',  0), id: 'w_a' };
  const w_b  = { ...createWire('in_b', 'and1',  1), id: 'w_b' };
  const w_c  = { ...createWire('in_c', 'or1',   1), id: 'w_c' };
  const w_q  = { ...createWire('and1', 'or1',   0), id: 'w_q' };
  const w_o  = { ...createWire('or1',  'out_y', 0), id: 'w_o' };
  return {
    nodes: [inA, inB, inC, and1, or1, out],
    wires: [w_a, w_b, w_c, w_q, w_o],
  };
}

// Single-fault ATPG should always return a detecting vector on this
// circuit (no redundant logic), and the resulting vector must score as
// a detector when fed back into the fault simulator.
{
  const s = buildAndOr();
  const targets = ['w_a/sa0', 'w_a/sa1', 'w_b/sa0', 'w_b/sa1',
                   'w_c/sa0', 'w_c/sa1', 'w_q/sa0', 'w_q/sa1',
                   'w_o/sa0', 'w_o/sa1'];
  for (const faultId of targets) {
    const r = generateATPGVector(s.nodes, s.wires, faultId);
    if (!r.success) {
      check(`${faultId} ATPG returned a vector`, false, `reason=${r.reason}`);
      continue;
    }
    // Re-run fault simulator with the generated vector and check the
    // target is in the detected set.
    const sim = simulateFaults(s.nodes, s.wires, [r.vector], {
      models: ['stuck-at-0', 'stuck-at-1', 'open'],
    });
    const f = sim.perFault.find(x => x.id === faultId);
    check(`${faultId} vector ${JSON.stringify(r.vector)} detects in sim`,
      f && f.detected, f ? '' : 'fault not enumerated');
  }
}

// generateATPGForUndetected: feed the simulator an empty set first, so
// every fault is undetected; ATPG should lift coverage to 100 % on
// this fully-testable circuit.
{
  const s = buildAndOr();
  const baseline = simulateFaults(s.nodes, s.wires, [], {
    models: ['stuck-at-0', 'stuck-at-1', 'open'],
  });
  check('baseline coverage = 0 % with no vectors',
    baseline.coverage.detected === 0 && baseline.coverage.total > 0);

  const atpg = generateATPGForUndetected(s.nodes, s.wires, baseline);
  check('every fault got a vector (no redundant on (A&B)|C)',
    atpg.added.length === baseline.perFault.length,
    `added=${atpg.added.length}, total=${baseline.perFault.length}`);
  check('no redundant verdicts on this circuit', atpg.redundant.length === 0);

  const vecs = atpg.added.map(a => a.vector);
  const after = simulateFaults(s.nodes, s.wires, vecs, {
    models: ['stuck-at-0', 'stuck-at-1', 'open'],
  });
  check('coverage = 100 % after appending ATPG vectors',
    after.coverage.percent === 100, `got ${after.coverage.percent}%`);
}

// ── Scene 2: Y = A | (A & B) — B is structurally redundant ───
function buildRedundant() {
  const inA  = { ...createComponent('INPUT',     -200, -40), id: 'in_a', fixedValue: 0 };
  const inB  = { ...createComponent('INPUT',     -200,  60), id: 'in_b', fixedValue: 0 };
  const and1 = { ...createComponent('GATE_SLOT',  -50,  20), id: 'and1', gate: 'AND' };
  const or1  = { ...createComponent('GATE_SLOT',  100,  -10), id: 'or1', gate: 'OR'  };
  const out  = { ...createComponent('OUTPUT',     250,  -10), id: 'out_y' };
  // A fans out: directly to OR input 0, and through the AND.
  const w_a1 = { ...createWire('in_a', 'and1',  0), id: 'w_a1' };
  const w_a2 = { ...createWire('in_a', 'or1',   0), id: 'w_a2' };
  const w_b  = { ...createWire('in_b', 'and1',  1), id: 'w_b'  };
  const w_q  = { ...createWire('and1', 'or1',   1), id: 'w_q'  };
  const w_o  = { ...createWire('or1',  'out_y', 0), id: 'w_o'  };
  return {
    nodes: [inA, inB, and1, or1, out],
    wires: [w_a1, w_a2, w_b, w_q, w_o],
  };
}

// Y = A | (A & B). When A=0, AND=0, Y=0. When A=1, OR's first input
// is 1, Y=1. So B has no effect on Y at all — every fault on w_b is
// redundant, and (since w_q = A & B is also dominated by the direct
// A fanout) w_q/sa0 is also redundant.
{
  const s = buildRedundant();
  const rB0 = generateATPGVector(s.nodes, s.wires, 'w_b/sa0');
  check('w_b/sa0 (B has no effect on Y) → redundant',
    !rB0.success && rB0.reason === 'redundant',
    rB0.success ? `unexpectedly testable, vec=${JSON.stringify(rB0.vector)}` : `reason=${rB0.reason}`);
  const rB1 = generateATPGVector(s.nodes, s.wires, 'w_b/sa1');
  check('w_b/sa1 → redundant',
    !rB1.success && rB1.reason === 'redundant',
    rB1.success ? `unexpectedly testable, vec=${JSON.stringify(rB1.vector)}` : `reason=${rB1.reason}`);
  const rQ0 = generateATPGVector(s.nodes, s.wires, 'w_q/sa0');
  check('w_q/sa0 (AND output, dominated by direct A) → redundant',
    !rQ0.success && rQ0.reason === 'redundant',
    rQ0.success ? `unexpectedly testable, vec=${JSON.stringify(rQ0.vector)}` : `reason=${rQ0.reason}`);

  // A is testable: stuck-at-0 on direct fanout becomes observable when
  // B=0 (so AND=0 too, removing the recovery path).
  const rA = generateATPGVector(s.nodes, s.wires, 'w_a2/sa0');
  check('w_a2/sa0 (direct A fanout to OR) → testable',
    rA.success, rA.success ? '' : `reason=${rA.reason}`);
}

// ── Bad inputs: misparsed fault id, missing wire ─────────────
{
  const s = buildAndOr();
  const r1 = generateATPGVector(s.nodes, s.wires, 'garbage');
  check('bad fault id → success=false / bad-fault-id',
    !r1.success && r1.reason === 'bad-fault-id');
  const r2 = generateATPGVector(s.nodes, s.wires, 'no-such-wire/sa0');
  check('unknown wire id → success=false / wire-not-found',
    !r2.success && r2.reason === 'wire-not-found');
}

console.log(`\n${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
process.exit(failed === 0 ? 0 : 1);
