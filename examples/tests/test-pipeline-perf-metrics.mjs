// Performance metrics aggregation — CPI / IPC / forwarding speedup.
import { computeMetrics } from '../../js/pipeline/PerformanceMetrics.js';

let failed = 0;
const check = (label, cond, extra = '') => {
  const mark = cond ? 'PASS' : 'FAIL';
  if (!cond) failed++;
  console.log(`  [${mark}] ${label}${extra ? '  — ' + extra : ''}`);
};
const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

const mkIsa = () => ({ pipelineDepth: 5, opcodes: {}, fields: {} });
const instr = (pc) => ({ pc, name: 'ADD', isHalt: false });

// ── 1. zero-hazard program — ideal = actual = (W-1) + N ────────────
console.log('\n-- zero hazards: ideal = actual --');
{
  const cache = {
    instructions: [instr(0), instr(1), instr(2), instr(3)],
    programHazards: [],
    isa: mkIsa(),
    fMaxMHz: 500,
  };
  const m = computeMetrics(cache);
  check('N = 4',                 m.instructionCount === 4);
  check('ideal = 8',             m.idealCycles === 8);
  check('actual = 8 (no stall)', m.actualCycles === 8);
  check('CPI = 2.0',             near(m.cpi, 2.0));
  check('IPC = 0.5',             near(m.ipc, 0.5));
  check('throughput 250 MIPS',   near(m.throughputMIPS, 250));
  check('no fwd benefit',        m.bubblesRemovedByForwarding === 0);
}

// ── 2. stalls overlap per consumer (MAX, not SUM) ─────────────────
console.log('\n-- overlapping RAW stalls on same consumer --');
{
  // Two producers owe bubbles to the same instJ=2: 3 and 1. Stall=3, not 4.
  const cache = {
    instructions: [instr(0), instr(1), instr(2)],
    programHazards: [
      { type: 'RAW', instJ: 2, bubbles: 3, resolvedByForwarding: false },
      { type: 'RAW', instJ: 2, bubbles: 1, resolvedByForwarding: false },
    ],
    isa: mkIsa(),
    fMaxMHz: null,
  };
  const m = computeMetrics(cache);
  check('stall = 3 (max, not 4)', m.stallBubbles === 3);
  check('actual = ideal + 3',     m.actualCycles === m.idealCycles + 3);
}

// ── 3. forwarding speedup ─────────────────────────────────────────
console.log('\n-- forwarding zeros bubbles + reports speedup --');
{
  const cache = {
    instructions: [instr(0), instr(1), instr(2), instr(3)],
    programHazards: [
      { type: 'RAW', instJ: 1, bubbles: 0, bubblesOriginal: 3, resolvedByForwarding: true },
      { type: 'RAW', instJ: 2, bubbles: 0, bubblesOriginal: 2, resolvedByForwarding: true },
      { type: 'RAW', instJ: 3, bubbles: 1, resolvedByForwarding: false },  // load-use
    ],
    isa: mkIsa(),
    fMaxMHz: null,
  };
  const m = computeMetrics(cache);
  check('stall (with fwd) = 1',             m.stallBubbles === 1);
  check('stall (no fwd) = 3+2+1 = 6',       m.stallBubblesNoForwarding === 6);
  check('bubbles removed = 5',              m.bubblesRemovedByForwarding === 5);
  check('speedup > 1',                      m.speedupFromForwarding > 1);
}

// ── 4. empty / missing data → null safe ──────────────────────────
console.log('\n-- null-safety on empty cache --');
{
  check('null cache → null',  computeMetrics(null) === null);
  check('no instrs → null',   computeMetrics({ instructions: [] }) === null);
  check('only HALT → null',   computeMetrics({ instructions: [{ pc: 0, isHalt: true }], programHazards: [], isa: mkIsa() }) === null);
}

// ── 5. WAR/WAW don't add bubbles ─────────────────────────────────
console.log('\n-- WAR/WAW ignored by stall count --');
{
  const cache = {
    instructions: [instr(0), instr(1)],
    programHazards: [
      { type: 'WAR', instJ: 1, bubbles: 0 },
      { type: 'WAW', instJ: 1, bubbles: 0 },
    ],
    isa: mkIsa(),
    fMaxMHz: null,
  };
  const m = computeMetrics(cache);
  check('stall = 0',  m.stallBubbles === 0);
}

console.log(`\n${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
process.exit(failed === 0 ? 0 : 1);
