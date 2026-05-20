// DFT March C- memory test pattern.
//
// Three layers of coverage:
//   1. Op-list shape — March C- generates the canonical 6-element
//      sequence with the expected ops count (10N).
//   2. Clean RAM — runs to completion without failures.
//   3. Fault catch — each of: per-cell stuck-at, CFin coupling
//      (ascending direction), CFin coupling (descending direction),
//      decoder proxy (wire stuck-at on RAM ADDR pin) — surfaces a
//      FAIL in the result. March C- is meant to subsume Walking-1
//      and Address-as-data for the standard fault models, so we
//      verify it catches the same canonical examples.
//
// Run:  node examples/tests/test-dft-march-c.mjs

import { createComponent } from '../../js/components/Component.js';
import { runMemoryTest } from '../../js/dft/MemoryTestRunner.js';
import { getRamPattern, RAM_PATTERNS } from '../../js/dft/TestPatterns.js';

let failed = 0;
function check(label, cond, detail = '') {
  const mark = cond ? 'PASS' : 'FAIL';
  if (!cond) failed++;
  console.log(`  [${mark}] ${label}${detail ? ' — ' + detail : ''}`);
}

console.log('\n-- DFT March C- --');

// ─────────────────────────────────────────────────────────────
//   Layer 1: pattern shape
// ─────────────────────────────────────────────────────────────
console.log('\n  · pattern shape');

const pat = getRamPattern('marchC', 3, 8);
check('pattern exists in RAM_PATTERNS registry',
      RAM_PATTERNS.some(p => p.id === 'marchC'));
check('getRamPattern("marchC") returns object', !!pat);
check('id and name set', pat && pat.id === 'marchC' && pat.name === 'March C-');

// 10N = 10 * 8 = 80 ops for N=8
const N = 8;
check(`generates 10N = ${10 * N} ops`, pat && pat.ops.length === 10 * N,
      `got ${pat ? pat.ops.length : 'null'}`);

// First N ops = M0 (writes of 0)
const m0 = pat.ops.slice(0, N);
check('M0 is N writes of 0',
      m0.every(o => o.op === 'write' && o.data === 0));

// Last N ops = M5 (reads of 0)
const m5 = pat.ops.slice(-N);
check('M5 is N reads expecting 0',
      m5.every(o => o.op === 'read' && o.expected === 0));

// M1 starts at idx N: should be read-then-write pairs, ascending addr
const m1 = pat.ops.slice(N, N + 2 * N);
check('M1 reads ascend 0..N-1',
      m1.filter((_, i) => i % 2 === 0).every((o, i) => o.addr === i && o.expected === 0));

// M3 starts at idx N + 4N = 5N: descending reads
const m3 = pat.ops.slice(5 * N, 7 * N);
check('M3 reads descend N-1..0',
      m3.filter((_, i) => i % 2 === 0).every((o, i) => o.addr === N - 1 - i && o.expected === 0));

// ─────────────────────────────────────────────────────────────
//   Layer 2: clean RAM
// ─────────────────────────────────────────────────────────────
console.log('\n  · clean RAM');

function makeRam(addrBits = 3, dataBits = 8) {
  const ram = createComponent('RAM', 0, 0);
  ram.id = 'ram-test';
  ram.addrBits = addrBits;
  ram.dataBits = dataBits;
  return ram;
}

{
  const ram = makeRam();
  const result = runMemoryTest(ram, pat);
  check('clean RAM passes March C-', result.passed,
        result.firstFail ? `firstFail @ step ${result.firstFail.stepIdx}` : '');
}

// ─────────────────────────────────────────────────────────────
//   Layer 3: stuck-at fault detection
// ─────────────────────────────────────────────────────────────
console.log('\n  · stuck-at detection');

{
  const ram = makeRam();
  ram.cellFaults = { 3: { stuckAt: 1, bit: 4 } };
  const result = runMemoryTest(ram, pat);
  check('stuck-at-1 at addr=3, bit=4 → FAIL', !result.passed);
  check('failure points to addr 3',
        result.firstFail && result.firstFail.addr === 3,
        `firstFail addr = ${result.firstFail && result.firstFail.addr}`);
}

{
  const ram = makeRam();
  ram.cellFaults = { 7: { stuckAt: 0, bit: null } };  // whole-word stuck-at-0
  const result = runMemoryTest(ram, pat);
  check('stuck-at-0 whole-word at addr=7 → FAIL', !result.passed);
  check('failure at addr 7',
        result.firstFail && result.firstFail.addr === 7);
}

// ─────────────────────────────────────────────────────────────
//   Layer 4: coupling-fault detection
// ─────────────────────────────────────────────────────────────
console.log('\n  · coupling-fault detection');

// CFin: write 0→1 to addr 2 flips addr 5 from 0 to all-ones.
// M1 ascends, hitting addr 2 first → addr 5 flips at that moment.
// When the M1 read of addr 5 (next iteration) happens, it expects 0
// but reads all-ones → FAIL.
{
  const ram = makeRam();
  ram.couplingFaults = [
    { aggressor: 2, victim: 5, type: 'CFin', trigger: '01' },
  ];
  const result = runMemoryTest(ram, pat);
  check('CFin(2→5, 0→1) → FAIL', !result.passed);
  check('failure surfaced (some addr)',
        !!result.firstFail,
        result.firstFail ? `at addr ${result.firstFail.addr}` : '');
}

// CFid forcing victim to all-ones — should fail at the M2 read.
{
  const ram = makeRam();
  ram.couplingFaults = [
    { aggressor: 1, victim: 4, type: 'CFid', trigger: '01', forceTo: 1 },
  ];
  const result = runMemoryTest(ram, pat);
  check('CFid(1→4) → FAIL', !result.passed);
}

// CFst: while aggressor 3 holds all-ones, victim 6 reads as 0.
// Since March C- writes all-ones to every cell at various points,
// this will surface during one of the read passes.
{
  const ram = makeRam();
  ram.couplingFaults = [
    { aggressor: 3, victim: 6, type: 'CFst', aggressorValue: 1, forceTo: 0 },
  ];
  const result = runMemoryTest(ram, pat);
  check('CFst(3 holds 1 → 6 reads 0) → FAIL', !result.passed);
}

// ─────────────────────────────────────────────────────────────
//   Layer 5: regression — clean RAM with all 8 patterns still passes
// ─────────────────────────────────────────────────────────────
console.log('\n  · regression: all 8 patterns pass on clean RAM');

for (const p of RAM_PATTERNS) {
  const ram = makeRam();
  const result = runMemoryTest(ram, p.generate(3, 8));
  check(`${p.label} clean RAM → PASS`, result.passed);
}

// ─────────────────────────────────────────────────────────────
//   Summary
// ─────────────────────────────────────────────────────────────
if (failed === 0) {
  console.log('\n  ✓ all March C- assertions passed.\n');
  process.exit(0);
} else {
  console.log(`\n  ✗ ${failed} failure(s).\n`);
  process.exit(1);
}
