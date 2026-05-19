// DFT MemoryTestRunner + RAM patterns.
//
// Verifies:
//   1. Every RAM pattern passes on a clean RAM.
//   2. Injected cellFaults are caught at the expected addr/bit.
//   3. ram.memory is not mutated by a run (non-destructive contract).
//   4. Pattern generators produce the expected op counts and contents.
//
// Run:  node examples/tests/test-dft-memory-tests.mjs

import { createComponent } from '../../js/components/Component.js';
import {
  RAM_PATTERNS, getRamPattern,
} from '../../js/dft/TestPatterns.js';
import { runMemoryTest } from '../../js/dft/MemoryTestRunner.js';

let failed = 0;
function check(label, cond, detail = '') {
  const mark = cond ? 'PASS' : 'FAIL';
  if (!cond) failed++;
  console.log(`  [${mark}] ${label}${detail ? ' — ' + detail : ''}`);
}

console.log('\n-- DFT Memory Test Runner --');

function buildRam(addrBits, dataBits) {
  return { ...createComponent('RAM', 0, 0), id: 'ram_t',
           addrBits, dataBits, memory: {}, cellFaults: undefined };
}

// ── 1. Clean RAM passes every pattern ─────────────────────────
{
  for (const p of RAM_PATTERNS) {
    const ram = buildRam(3, 4);             // 8 cells, 4-bit
    const pat = p.generate(3, 4);
    const r   = runMemoryTest(ram, pat);
    check(`${p.id} passes on clean 8×4 RAM`, r.passed,
          r.firstFail ? `failed at addr ${r.firstFail.addr}` : '');
    check(`${p.id} reads = writes (round-trip)`,
          r.reads === r.writes || p.id === 'walkingOne' || p.id === 'walkingZero',
          `reads=${r.reads}, writes=${r.writes}`);
  }
}

// ── 2. Pattern op counts and contents ────────────────────────
{
  const cb = getRamPattern('checkerboard', 2, 4);
  check('Checkerboard 4 cells, 4-bit → 8 ops', cb.ops.length === 8);
  // Expect: write[0]=0xA, write[1]=0x5, write[2]=0xA, write[3]=0x5, then 4 reads matching.
  check('Checkerboard addr 0 stores 0xA', cb.ops[0].data === 0xA);
  check('Checkerboard addr 1 stores 0x5', cb.ops[1].data === 0x5);

  const wOne = getRamPattern('walkingOne', 2, 4);
  // 4 cells × 4-bit: init(4) + 4 walks × (write + read + 3 cross-reads + write) = 4 + 4·6 = 28.
  check('Walking-1 4×4 → 28 ops', wOne.ops.length === 28,
        `got ${wOne.ops.length}`);

  const aad = getRamPattern('addressAsData', 3, 4);
  check('Address-as-data 8×4 → 16 ops', aad.ops.length === 16);
  // Each cell stores its address truncated to dataBits.
  check('Address-as-data: write addr 0 = 0', aad.ops[0].data === 0);
  check('Address-as-data: write addr 7 = 7', aad.ops[7].data === 7);
  check('Address-as-data: read addr 5 expects 5', aad.ops[8 + 5].expected === 5);
}

// ── 3. Whole-word stuck-at-1 fault at addr 2 ─────────────────
{
  const ram = buildRam(2, 4);
  ram.cellFaults = { 2: { stuckAt: 1, bit: null } };
  // Checkerboard writes 0xA to addr 2 (even); fault forces it to 0xF; the
  // subsequent read expects 0xA, observes 0xF → fail at addr 2.
  const r = runMemoryTest(ram, getRamPattern('checkerboard', 2, 4));
  check('cellFaults[2] s-a-1: checkerboard fails',
        !r.passed && r.firstFail?.addr === 2,
        r.passed ? 'unexpectedly passed' : `firstFail addr=${r.firstFail?.addr}`);
  check('  → expected = 0xA, observed = 0xF',
        r.firstFail?.expected === 0xA && r.firstFail?.observed === 0xF);
}

// ── 4. Per-bit stuck-at-0 fault at addr 5, bit 2 ──────────────
{
  const ram = buildRam(3, 4);
  ram.cellFaults = { 5: { stuckAt: 0, bit: 2 } };
  // Address-as-data writes 5 (0101) to addr 5; bit 2 is forced to 0 → stored 0001.
  // Read expects 5, observes 1 → fail at addr 5 bit 2.
  const r = runMemoryTest(ram, getRamPattern('addressAsData', 3, 4));
  check('cellFaults[5] bit=2 s-a-0: address-as-data fails at addr 5',
        !r.passed && r.firstFail?.addr === 5);
  check('  → bit = 2 reported in firstFail',
        r.firstFail?.bit === 2);
}

// ── 5. ram.memory untouched after run (non-destructive) ───────
{
  const ram = buildRam(2, 4);
  ram.memory = { 1: 0xC, 3: 0x7 };
  const before = JSON.stringify(ram.memory);
  runMemoryTest(ram, getRamPattern('walkingOne', 2, 4));
  const after = JSON.stringify(ram.memory);
  check('ram.memory unchanged after walkingOne run',
        before === after, `before=${before}, after=${after}`);
}

// ── 6. Catalogue sanity ──────────────────────────────────────
{
  check('RAM_PATTERNS exposes 7 entries', RAM_PATTERNS.length === 7);
  const ids = RAM_PATTERNS.map(p => p.id);
  const expected = ['allZero','allOne','checkerboard','inverseCheckerboard',
                    'addressAsData','walkingOne','walkingZero'];
  check('Catalogue ids in expected order',
        ids.join(',') === expected.join(','),
        `got: ${ids.join(',')}`);
  check('getRamPattern("bogus") returns null',
        getRamPattern('bogus', 2, 4) === null);
}

// ── 7. inverseCheckerboard flips polarity ────────────────────
{
  const cb  = getRamPattern('checkerboard',        2, 4).ops;
  const icb = getRamPattern('inverseCheckerboard', 2, 4).ops;
  // Compare write ops: each inverted bitwise within dataBits.
  let bad = 0;
  for (let i = 0; i < cb.length; i++) {
    if (cb[i].op === 'write' && (cb[i].data ^ icb[i].data) !== 0xF) bad++;
    if (cb[i].op === 'read'  && (cb[i].expected ^ icb[i].expected) !== 0xF) bad++;
  }
  check('inverseCheckerboard flips every byte within dataBits',
        bad === 0, `bad=${bad}`);
}

console.log(`\n${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
process.exit(failed === 0 ? 0 : 1);
