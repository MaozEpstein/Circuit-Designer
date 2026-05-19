// DFT live trace diff — verifies the core algorithm (golden vs faulty
// per-wire comparison) used by DFTPanel._recomputeTraceDiff(). The
// panel method itself touches the DOM and can't be unit-tested here;
// this test replicates its inner logic.
//
// Scene: Y = (A & B) | C
//
// Run:  node examples/tests/test-dft-trace-diff.mjs

import { createComponent, createWire } from '../../js/components/Component.js';
import { evaluate } from '../../js/engine/SimulationEngine.js';

let failed = 0;
function check(label, cond, detail = '') {
  const mark = cond ? 'PASS' : 'FAIL';
  if (!cond) failed++;
  console.log(`  [${mark}] ${label}${detail ? ' — ' + detail : ''}`);
}

console.log('\n-- DFT Trace Diff (algorithm) --');

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

// Replicates the panel's golden-vs-faulty pair of evaluate calls and
// builds the diff map. Same logic flow as DFTPanel._recomputeTraceDiff.
function computeDiff(scene, vec) {
  const primaryInputs = scene.nodes.filter(n => n.type === 'INPUT')
    .sort((a, b) => a.id.localeCompare(b.id));
  const apply = () => {
    const restore = primaryInputs.map(n => ({ n, prev: n.fixedValue }));
    primaryInputs.forEach((n, i) => { n.fixedValue = vec[i] ?? 0; });
    return () => restore.forEach(({ n, prev }) => { n.fixedValue = prev; });
  };
  const wireSnap = scene.wires.map(w => ({
    w, stuckAt: w.stuckAt ?? null, open: !!w.open, bridgedWith: w.bridgedWith || null,
  }));
  const clearAll = () => scene.wires.forEach(w => { w.stuckAt = null; w.open = false; w.bridgedWith = null; });
  const restoreAll = () => wireSnap.forEach(s => { s.w.stuckAt = s.stuckAt; s.w.open = s.open; s.w.bridgedWith = s.bridgedWith; });

  clearAll();
  const r1 = apply();
  const gR = evaluate(scene.nodes, scene.wires, new Map(), 0);
  r1();
  restoreAll();

  const r2 = apply();
  const fR = evaluate(scene.nodes, scene.wires, new Map(), 0);
  r2();

  const diff = new Map();
  for (const w of scene.wires) {
    const g = gR.wireValues.get(w.id);
    const f = fR.wireValues.get(w.id);
    if (g !== f) diff.set(w.id, { golden: g, faulty: f });
  }
  return diff;
}

// ── 1. No fault → empty diff ─────────────────────────────────
{
  const s = buildScene();
  const d = computeDiff(s, [1, 1, 0]);
  check('no fault → empty diff', d.size === 0, `size=${d.size}`);
}

// ── 2. w_q/sa0 injected with vector [1,1,0] → AND output differs ─
{
  const s = buildScene();
  s.wires.find(w => w.id === 'w_q').stuckAt = 0;
  const d = computeDiff(s, [1, 1, 0]);
  // golden Y = AND(1,1)|0 = 1|0 = 1, faulty Y = 0|0 = 0 → w_q differs (1→0), w_o differs (1→0).
  check('w_q/sa0 vec [1,1,0] → w_q in diff', d.has('w_q'));
  check('w_q diff: golden=1, faulty=0',
        d.get('w_q')?.golden === 1 && d.get('w_q')?.faulty === 0,
        JSON.stringify(d.get('w_q')));
  check('w_o (Y) also in diff', d.has('w_o'));
}

// ── 3. w_q/sa0 with vector [0,0,1] → no diff (path masked) ───
{
  const s = buildScene();
  s.wires.find(w => w.id === 'w_q').stuckAt = 0;
  const d = computeDiff(s, [0, 0, 1]);
  // golden: AND(0,0)=0; OR(0,1)=1. faulty: AND=0 (forced, same); OR(0,1)=1. Same.
  check('w_q/sa0 vec [0,0,1] → empty diff (path masked)', d.size === 0,
        `size=${d.size}`);
}

// ── 4. open wire propagates through ─────────────────────────
{
  const s = buildScene();
  s.wires.find(w => w.id === 'w_q').open = true;
  const d = computeDiff(s, [1, 1, 0]);
  check('w_q open vec [1,1,0] → w_q in diff', d.has('w_q'),
        `keys: ${[...d.keys()].join(',')}`);
}

// ── 5. Wire-injection state restored after computeDiff ─────
{
  const s = buildScene();
  s.wires.find(w => w.id === 'w_q').stuckAt = 1;
  computeDiff(s, [1, 0, 0]);
  check('wire stuckAt restored after diff computation',
        s.wires.find(w => w.id === 'w_q').stuckAt === 1);
}

console.log(`\n${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
process.exit(failed === 0 ? 0 : 1);
