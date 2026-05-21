// Verify the new D-FF async / sync reset support.
//   1. A D-FF with NO reset wire behaves exactly as before (regression).
//   2. Async reset forces Q=0 immediately (no clock edge needed).
//   3. Sync reset forces Q=0 on the next rising edge.
//   4. Reset value can be 1 (parameterizable).
//   5. Active-low reset works (resetActiveLow: true → assert on 0).

import { build, h } from '../js/interview/circuitHelpers.js';
import { evaluate } from '../js/engine/SimulationEngine.js';

let fails = 0;
function check(label, cond, detail = '') {
  const tag = cond ? 'PASS' : 'FAIL';
  if (!cond) fails++;
  console.log(`  [${tag}] ${label}${detail ? ' — ' + detail : ''}`);
}

// Single clock cycle. Matches the existing test-snapshot-regression
// pattern (clk=1 → evaluate → clk=0 → evaluate). Note: the FF's
// prevClkValue starts as `null`, so the very first tick(0) does NOT
// produce a rising-edge latch — it only initializes prevClk to 0.
// A second tick(1) provides the actual rising edge. Tests below
// therefore prime with one extra tick before reading FF state.
function tick(scene, ffs, i) {
  const clk = scene.nodes.find(n => n.type === 'CLOCK');
  clk.value = 1; evaluate(scene.nodes, scene.wires, ffs, i);
  clk.value = 0; evaluate(scene.nodes, scene.wires, ffs, i);
}
function ticks(scene, ffs, n) {
  for (let i = 0; i < n; i++) tick(scene, ffs, i);
}

// ── 1. Regression: D-FF with no reset wire ─────────────────────
console.log('\n-- D-FF without reset (regression) --');
{
  const scene = build(() => {
    const clk = h.clock(0, 0);
    const d   = h.input(0, 0, 'D'); d.fixedValue = 1;
    const ff  = h.ffD(0, 0, 'FF');
    const out = h.output(0, 0, 'Q');
    return {
      nodes: [clk, d, ff, out],
      wires: [
        h.wire(d.id, ff.id, 0),
        h.wire(clk.id, ff.id, 1, 0, { isClockWire: true }),
        h.wire(ff.id, out.id, 0),
      ],
    };
  });
  const ffs = new Map();
  ticks(scene, ffs, 2);   // one prime tick + one real edge
  const q = scene.nodes[2];
  const ffState = ffs.get(q.id);
  check('D=1 → Q=1 after one tick', ffState && ffState.q === 1, `q=${ffState?.q}`);
}

// ── 2. Async reset asserts → Q immediately = 0 ─────────────────
console.log('\n-- Async reset (forces Q=0 immediately) --');
{
  const scene = build(() => {
    const clk = h.clock(0, 0);
    const d   = h.input(0, 0, 'D'); d.fixedValue = 1;
    const rst = h.input(0, 0, 'RST'); rst.fixedValue = 0;
    const ff  = h.ffD(0, 0, 'FF', { reset: 'async' });
    const out = h.output(0, 0, 'Q');
    return {
      nodes: [clk, d, rst, ff, out],
      wires: [
        h.wire(d.id, ff.id, 0),
        h.wire(clk.id, ff.id, 1, 0, { isClockWire: true }),
        h.wire(rst.id, ff.id, 2, 0, { isResetWire: true }),
        h.wire(ff.id, out.id, 0),
      ],
    };
  });
  const ffs = new Map();
  // First two ticks: prime + real edge. D=1, RST=0 → Q latches to 1.
  ticks(scene, ffs, 2);
  const ff = scene.nodes[3];
  check('D=1, RST=0 → Q=1', ffs.get(ff.id)?.q === 1, `q=${ffs.get(ff.id)?.q}`);

  // Now assert reset MID-cycle (no clock edge); evaluate without tick → Q must drop to 0
  const rst = scene.nodes[2];
  rst.fixedValue = 1;
  evaluate(scene.nodes, scene.wires, ffs, 1);
  check('RST asserted (no clk edge) → Q=0 (async)', ffs.get(ff.id)?.q === 0, `q=${ffs.get(ff.id)?.q}`);

  // Deassert RST; Q stays 0 until next clock edge captures D=1
  rst.fixedValue = 0;
  evaluate(scene.nodes, scene.wires, ffs, 2);
  check('RST=0, no clk yet → Q stays 0', ffs.get(ff.id)?.q === 0, `q=${ffs.get(ff.id)?.q}`);

  ticks(scene, ffs, 1);   // prevClk is already 0 from the prior evaluate
  check('After clk edge → Q latches D=1', ffs.get(ff.id)?.q === 1, `q=${ffs.get(ff.id)?.q}`);
}

// ── 3. Sync reset: only on clock edge ───────────────────────────
console.log('\n-- Sync reset (only on clock edge) --');
{
  const scene = build(() => {
    const clk = h.clock(0, 0);
    const d   = h.input(0, 0, 'D'); d.fixedValue = 1;
    const rst = h.input(0, 0, 'RST'); rst.fixedValue = 0;
    const ff  = h.ffD(0, 0, 'FF', { reset: 'sync' });
    const out = h.output(0, 0, 'Q');
    return {
      nodes: [clk, d, rst, ff, out],
      wires: [
        h.wire(d.id, ff.id, 0),
        h.wire(clk.id, ff.id, 1, 0, { isClockWire: true }),
        h.wire(rst.id, ff.id, 2, 0, { isResetWire: true }),
        h.wire(ff.id, out.id, 0),
      ],
    };
  });
  const ffs = new Map();
  ticks(scene, ffs, 2);   // one prime tick + one real edge
  const ff = scene.nodes[3];
  check('D=1, RST=0 → Q=1 after tick', ffs.get(ff.id)?.q === 1, `q=${ffs.get(ff.id)?.q}`);

  // Assert RST mid-cycle (no clk edge yet) — sync reset should NOT fire
  const rst = scene.nodes[2];
  rst.fixedValue = 1;
  evaluate(scene.nodes, scene.wires, ffs, 10);
  check('RST=1 (no clk edge) → Q stays 1 (sync reset)', ffs.get(ff.id)?.q === 1, `q=${ffs.get(ff.id)?.q}`);

  // Now clock edge → sync reset overrides D
  ticks(scene, ffs, 1);
  check('Clock edge with RST=1 → Q=0 (sync reset fires)', ffs.get(ff.id)?.q === 0, `q=${ffs.get(ff.id)?.q}`);
}

// ── 4. Reset value = 1 ──────────────────────────────────────────
console.log('\n-- Reset value = 1 --');
{
  const scene = build(() => {
    const clk = h.clock(0, 0);
    const d   = h.input(0, 0, 'D'); d.fixedValue = 0;
    const rst = h.input(0, 0, 'RST'); rst.fixedValue = 1;
    const ff  = h.ffD(0, 0, 'FF', { reset: 'async', resetValue: 1 });
    const out = h.output(0, 0, 'Q');
    return {
      nodes: [clk, d, rst, ff, out],
      wires: [
        h.wire(d.id, ff.id, 0),
        h.wire(clk.id, ff.id, 1, 0, { isClockWire: true }),
        h.wire(rst.id, ff.id, 2, 0, { isResetWire: true }),
        h.wire(ff.id, out.id, 0),
      ],
    };
  });
  const ffs = new Map();
  evaluate(scene.nodes, scene.wires, ffs, 0);
  const ff = scene.nodes[3];
  check('RST=1 with resetValue=1 → Q=1 immediately', ffs.get(ff.id)?.q === 1, `q=${ffs.get(ff.id)?.q}`);
}

// ── 5. Active-low reset ─────────────────────────────────────────
console.log('\n-- Active-low reset --');
{
  const scene = build(() => {
    const clk = h.clock(0, 0);
    const d   = h.input(0, 0, 'D'); d.fixedValue = 1;
    const rst = h.input(0, 0, 'nRST'); rst.fixedValue = 0;     // asserted = 0
    const ff  = h.ffD(0, 0, 'FF', { reset: 'async', resetActiveLow: true });
    const out = h.output(0, 0, 'Q');
    return {
      nodes: [clk, d, rst, ff, out],
      wires: [
        h.wire(d.id, ff.id, 0),
        h.wire(clk.id, ff.id, 1, 0, { isClockWire: true }),
        h.wire(rst.id, ff.id, 2, 0, { isResetWire: true }),
        h.wire(ff.id, out.id, 0),
      ],
    };
  });
  const ffs = new Map();
  evaluate(scene.nodes, scene.wires, ffs, 0);
  const ff = scene.nodes[3];
  check('nRST=0 (active-low asserted) → Q=0 immediately', ffs.get(ff.id)?.q === 0, `q=${ffs.get(ff.id)?.q}`);

  // Deassert
  const rst = scene.nodes[2];
  rst.fixedValue = 1;
  tick(scene, ffs, 1);
  check('nRST=1 (deasserted), D=1 → Q=1 after clk', ffs.get(ff.id)?.q === 1, `q=${ffs.get(ff.id)?.q}`);
}

console.log('\n' + (fails === 0 ? '✓ ALL reset checks pass' : `✗ ${fails} failure(s)`));
process.exit(fails === 0 ? 0 : 1);
