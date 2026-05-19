// DFT Fault Dictionary Diagnosis.
//
// Verifies:
//   1. buildDictionary produces signatures of correct length.
//   2. observeSignature picks up an injected fault's effect.
//   3. diagnose ranks the actually-injected fault in the top-1.
//   4. Edge cases: no injection → score 1 for "no-effect" entries
//      (which means no useful ranking — that's correct behaviour).
//
// Scene: Y = (A & B) | C — same as the FaultSimulator test, deliberately.
//
// Run:  node examples/tests/test-dft-diagnosis.mjs

import { createComponent, createWire } from '../../js/components/Component.js';
import { simulateFaults } from '../../js/dft/FaultSimulator.js';
import {
  buildDictionary, observeSignature, diagnose, diagnoseScene,
} from '../../js/dft/FaultDictionary.js';

let failed = 0;
function check(label, cond, detail = '') {
  const mark = cond ? 'PASS' : 'FAIL';
  if (!cond) failed++;
  console.log(`  [${mark}] ${label}${detail ? ' — ' + detail : ''}`);
}

console.log('\n-- DFT Fault Dictionary Diagnosis --');

function buildScene() {
  const inA  = { ...createComponent('INPUT',     -200, -80), id: 'in_a', fixedValue: 0 };
  const inB  = { ...createComponent('INPUT',     -200,   0), id: 'in_b', fixedValue: 0 };
  const inC  = { ...createComponent('INPUT',     -200,  80), id: 'in_c', fixedValue: 0 };
  const and1 = { ...createComponent('GATE_SLOT',  -50, -40), id: 'and1', gate: 'AND' };
  const or1  = { ...createComponent('GATE_SLOT',  100,   0), id: 'or1',  gate: 'OR'  };
  const out  = { ...createComponent('OUTPUT',     250,   0), id: 'out_y' };
  const w_a  = { ...createWire('in_a', 'and1', 0), id: 'w_a' };
  const w_b  = { ...createWire('in_b', 'and1', 1), id: 'w_b' };
  const w_c  = { ...createWire('in_c', 'or1',  1), id: 'w_c' };
  const w_q  = { ...createWire('and1', 'or1',  0), id: 'w_q' };
  const w_o  = { ...createWire('or1',  'out_y', 0), id: 'w_o' };
  return {
    nodes: [inA, inB, inC, and1, or1, out],
    wires: [w_a, w_b, w_c, w_q, w_o],
  };
}

// Test vectors: 4 corners covering enough to distinguish most faults.
const vectors = [
  [0, 0, 0],  // Y = 0
  [1, 1, 0],  // Y = 1
  [0, 0, 1],  // Y = 1
  [1, 0, 0],  // Y = 0
];

// ── 1. buildDictionary basic shape ───────────────────────────
{
  const s = buildScene();
  const sim = simulateFaults(s.nodes, s.wires, vectors, {
    models: ['stuck-at-0', 'stuck-at-1'],
  });
  const d = buildDictionary(sim);
  check('dictionary covers every per-fault entry',
        d.size === sim.perFault.length, `got ${d.size}, expected ${sim.perFault.length}`);
  for (const sig of d.values()) {
    check('signature length = vector count', sig.length === vectors.length);
    if (sig.length !== vectors.length) break;
  }
}

// ── 2. observeSignature with no injection → all zeros ────────
{
  const s = buildScene();
  const sim = simulateFaults(s.nodes, s.wires, vectors, {});
  sim._vectors = vectors;
  const { signature, mismatchCount } = observeSignature(s.nodes, s.wires, sim);
  check('no injection → signature all zeros',
        signature === '0'.repeat(vectors.length) && mismatchCount === 0,
        `got "${signature}", mismatch=${mismatchCount}`);
}

// ── 3. Inject w_q/sa0 → diagnose ranks it #1 ─────────────────
{
  const s = buildScene();
  const sim = simulateFaults(s.nodes, s.wires, vectors, {
    models: ['stuck-at-0', 'stuck-at-1'],
  });
  sim._vectors = vectors;
  // Now inject the fault on the real scene.
  const wq = s.wires.find(w => w.id === 'w_q');
  wq.stuckAt = 0;

  const r = diagnoseScene(s.nodes, s.wires, sim, { topK: 5 });
  check('observed signature is non-empty under w_q/sa0',
        r.mismatchCount > 0, `mismatch=${r.mismatchCount}`);
  check('top-5 suspects returned', r.suspects.length === 5);
  // w_q/sa0, w_a/sa0, w_b/sa0 are structurally equivalent on (A&B)|C:
  // all three force AND output to 0, so any of them tied at score 1.0
  // is a valid answer. The diagnoser sorts alphabetically on ties.
  const topScoreSet = r.suspects.filter(s => s.exact).map(s => s.faultId);
  check('w_q/sa0 is in the exact-match top set (with its equivalents)',
        topScoreSet.includes('w_q/sa0'),
        `top exact set = ${topScoreSet.join(',')}`);
  check('top suspect has score 1.0',
        r.suspects[0].score === 1, `got ${r.suspects[0].score}`);
  check('top suspect has exact-match flag',
        r.suspects[0].exact);
}

// ── 4. Inject w_c/sa1 → diagnose ranks it #1 ─────────────────
{
  const s = buildScene();
  const sim = simulateFaults(s.nodes, s.wires, vectors, {
    models: ['stuck-at-0', 'stuck-at-1'],
  });
  sim._vectors = vectors;
  const wc = s.wires.find(w => w.id === 'w_c');
  wc.stuckAt = 1;

  const r = diagnoseScene(s.nodes, s.wires, sim, { topK: 3 });
  check('w_c/sa1 ranked #1', r.suspects[0].faultId === 'w_c/sa1',
        `got ${r.suspects[0].faultId} (score ${r.suspects[0].score.toFixed(2)})`);
}

// ── 5. Multi-fault: at least one of the two in top-3 ────────
{
  const s = buildScene();
  const sim = simulateFaults(s.nodes, s.wires, vectors, {
    models: ['stuck-at-0', 'stuck-at-1'],
  });
  sim._vectors = vectors;
  s.wires.find(w => w.id === 'w_q').stuckAt = 0;
  s.wires.find(w => w.id === 'w_c').stuckAt = 1;

  const r = diagnoseScene(s.nodes, s.wires, sim, { topK: 3 });
  const top3 = r.suspects.map(s => s.faultId);
  check('multi-fault: at least one of w_q/sa0, w_c/sa1 in top-3',
        top3.includes('w_q/sa0') || top3.includes('w_c/sa1'),
        `top3=${top3.join(',')}`);
}

// ── 6. Empty / bad inputs ───────────────────────────────────
{
  const empty = buildDictionary(null);
  check('buildDictionary(null) → empty Map', empty.size === 0);
  const r = diagnose(empty, '0000', { topK: 3 });
  check('diagnose with empty dictionary → []', r.length === 0);
}

console.log(`\n${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
process.exit(failed === 0 ? 0 : 1);
