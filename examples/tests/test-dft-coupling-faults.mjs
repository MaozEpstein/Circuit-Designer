// DFT RAM Coupling Faults — three textbook types (CFin / CFid / CFst).
//
// Three layers of coverage:
//   1. Pure helper unit tests (CouplingFaults.js).
//   2. MemoryTestRunner end-to-end — confirms that the patterns the
//      panel exposes (Walking-1, Checkerboard, etc.) catch each CF type.
//   3. Engine end-to-end — write through evaluate() with a coupling
//      fault injected, observe the victim cell flip via ffStates.
//
// Run:  node examples/tests/test-dft-coupling-faults.mjs

import { createComponent } from '../../js/components/Component.js';
import { runMemoryTest } from '../../js/dft/MemoryTestRunner.js';
import { getRamPattern } from '../../js/dft/TestPatterns.js';
import {
  applyCouplingOnWrite,
  applyCFstOnRead,
  applyCFstOnReadWithCause,
} from '../../js/dft/CouplingFaults.js';
import { evaluate } from '../../js/engine/SimulationEngine.js';

let failed = 0;
function check(label, cond, detail = '') {
  const mark = cond ? 'PASS' : 'FAIL';
  if (!cond) failed++;
  console.log(`  [${mark}] ${label}${detail ? ' — ' + detail : ''}`);
}

console.log('\n-- DFT Coupling Faults --');

// ─────────────────────────────────────────────────────────────
//   Layer 1: helper unit tests
// ─────────────────────────────────────────────────────────────
console.log('\n  · helpers');

// CFin: write 0→0xF to aggressor=3 → victim=5 flips (from 0 to 0xF).
{
  const mem = { 5: 0 };
  const cfaults = [{ aggressor: 3, victim: 5, type: 'CFin', trigger: '01' }];
  const r = applyCouplingOnWrite(cfaults, 3, 0, 0xF, mem, 4);
  check('CFin matched trigger → victim flipped 0→0xF',
        mem[5] === 0xF && r && r.type === 'CFin' && r.aggressor === 3 && r.victim === 5,
        `mem[5]=${mem[5]}, ret=${JSON.stringify(r)}`);
}

// CFin: trigger='10' but write was 0→0xF → no effect.
{
  const mem = { 5: 0 };
  const cfaults = [{ aggressor: 3, victim: 5, type: 'CFin', trigger: '10' }];
  const r = applyCouplingOnWrite(cfaults, 3, 0, 0xF, mem, 4);
  check('CFin non-matching trigger → no effect',
        mem[5] === 0 && r === null, `mem[5]=${mem[5]}`);
}

// CFin trigger 'any' → both directions fire.
{
  const mem = { 5: 0 };
  const cfaults = [{ aggressor: 3, victim: 5, type: 'CFin', trigger: 'any' }];
  applyCouplingOnWrite(cfaults, 3, 0, 0xF, mem, 4);
  check('CFin "any" trigger on 0→0xF → victim flipped', mem[5] === 0xF);
  applyCouplingOnWrite(cfaults, 3, 0xF, 0, mem, 4);
  check('CFin "any" trigger on 0xF→0 → victim flipped again',
        mem[5] === 0);
}

// CFid: write 0xF→0 to aggressor → victim forced to all-ones (regardless of prior).
{
  const mem = { 5: 0x7 };    // arbitrary prior — should be clobbered
  const cfaults = [{ aggressor: 3, victim: 5, type: 'CFid', trigger: '10', forceTo: 1 }];
  applyCouplingOnWrite(cfaults, 3, 0xF, 0, mem, 4);
  check('CFid 1→0 forceTo=1 → victim = 0xF (forced)', mem[5] === 0xF);
}

// CFid forceTo=0 with prior 0xF.
{
  const mem = { 5: 0xF };
  const cfaults = [{ aggressor: 3, victim: 5, type: 'CFid', trigger: '01', forceTo: 0 }];
  applyCouplingOnWrite(cfaults, 3, 0, 0xF, mem, 4);
  check('CFid 0→1 forceTo=0 → victim = 0', mem[5] === 0);
}

// CFst: while aggressor is all-ones, read of victim returns forceTo.
{
  const mem = { 3: 0xF, 5: 0xA };
  const cfaults = [{ aggressor: 3, victim: 5, type: 'CFst', aggressorValue: 1, forceTo: 0 }];
  const v = applyCFstOnRead(cfaults, 5, 0xA, mem, 4);
  check('CFst aggressor=0xF matches aggressorValue=1 → read returns 0',
        v === 0, `got ${v}`);
}

// CFst: aggressor not in trigger state → original value preserved.
{
  const mem = { 3: 0x5, 5: 0xA };
  const cfaults = [{ aggressor: 3, victim: 5, type: 'CFst', aggressorValue: 1, forceTo: 0 }];
  const v = applyCFstOnRead(cfaults, 5, 0xA, mem, 4);
  check('CFst aggressor=0x5 ≠ 0xF (trigger) → read returns original 0xA',
        v === 0xA, `got ${v}`);
}

// Empty couplingFaults → no-op everywhere.
{
  const mem = { 5: 0 };
  applyCouplingOnWrite(null,      3, 0, 0xF, mem, 4);
  applyCouplingOnWrite([],        3, 0, 0xF, mem, 4);
  applyCouplingOnWrite(undefined, 3, 0, 0xF, mem, 4);
  check('Empty couplingFaults → no mutation', mem[5] === 0);
  const v = applyCFstOnRead(null, 5, 0xA, mem, 4);
  check('Empty couplingFaults read → returns input val', v === 0xA);
}

// Self-coupling (aggressor === victim) → ignored as malformed.
{
  const mem = { 3: 0 };
  const cfaults = [{ aggressor: 3, victim: 3, type: 'CFin', trigger: '01' }];
  applyCouplingOnWrite(cfaults, 3, 0, 0xF, mem, 4);
  check('Self-coupling write → not applied (mem[3] unchanged)',
        mem[3] === 0, `mem[3]=${mem[3]}`);
}

// applyCFstOnReadWithCause: surfaces the causedBy entry.
{
  const mem = { 3: 0xF, 5: 0 };
  const cfaults = [{ aggressor: 3, victim: 5, type: 'CFst', aggressorValue: 1, forceTo: 0 }];
  const r = applyCFstOnReadWithCause(cfaults, 5, 0xA, mem, 4);
  check('applyCFstOnReadWithCause returns { val, causedBy }',
        r.val === 0 && r.causedBy?.type === 'CFst' && r.causedBy?.aggressor === 3);
}

// ─────────────────────────────────────────────────────────────
//   Layer 2: MemoryTestRunner end-to-end
// ─────────────────────────────────────────────────────────────
console.log('\n  · MemoryTestRunner');

function buildRam(addrBits, dataBits) {
  return { ...createComponent('RAM', 0, 0), id: 'ram_t',
           addrBits, dataBits, memory: {},
           cellFaults: undefined, couplingFaults: undefined };
}

// CFin caught by Walking-1: when cell 3 is written all-ones during its
// walk-step, cell 5 flips to all-ones. The cross-read of cell 5 (which
// expects 0) then fails. Walking-1 with N=8 cells starts with init=0,
// then walks c=0,1,2,…
{
  const ram = buildRam(3, 4);   // 8 cells × 4-bit
  ram.couplingFaults = [{ aggressor: 3, victim: 5, type: 'CFin', trigger: '01' }];
  const r = runMemoryTest(ram, getRamPattern('walkingOne', 3, 4));
  check('Walking-1 catches CFin(3→5, 0→1)',
        !r.passed && r.firstFail?.addr === 5,
        r.passed ? 'unexpectedly passed' : `firstFail.addr=${r.firstFail?.addr}`);
  check('firstFail.causedBy attributes CFin from aggressor 3',
        r.firstFail?.causedBy?.type === 'CFin' && r.firstFail?.causedBy?.aggressor === 3,
        `causedBy=${JSON.stringify(r.firstFail?.causedBy)}`);
}

// Same CFin: All-zero never triggers a 0→1 transition → no coupling fires.
{
  const ram = buildRam(3, 4);
  ram.couplingFaults = [{ aggressor: 3, victim: 5, type: 'CFin', trigger: '01' }];
  const r = runMemoryTest(ram, getRamPattern('allZero', 3, 4));
  check('CFin 0→1 not triggered by All-zero → PASS', r.passed,
        r.passed ? '' : `failed at addr ${r.firstFail?.addr}`);
}

// CFid caught by Walking-0: aggressor=7, victim=8, trigger='10', forceTo=1.
// Walking-0 inits all-ones, then walks a single-0 cell. When cell 7 is
// written 0 (transition 0xF→0), cell 8 is forced to 0xF. The cross-read
// of cell 8 (which expects 0xF, since walking-0 leaves it untouched at
// 0xF) actually passes... hmm. Let me adjust: trigger '10' means
// aggressor going 1→0; in walking-0 cell 7 gets written 0 from prior 0xF.
// Victim 8 forced to 0xF — but background is 0xF anyway, so no
// observable failure!
//
// Better demonstrator: CFid with forceTo=0 — clobbers victim from 0xF to 0.
{
  const ram = buildRam(3, 4);
  ram.couplingFaults = [{ aggressor: 7, victim: 8 & 0x7, type: 'CFid', trigger: '10', forceTo: 0 }];
  // 8 & 0x7 = 0, valid address.
  const r = runMemoryTest(ram, getRamPattern('walkingZero', 3, 4));
  check('Walking-0 catches CFid(7→0, forceTo=0) on 1→0 transition',
        !r.passed,
        r.passed ? 'unexpectedly passed' : `firstFail at addr=${r.firstFail?.addr}`);
  if (!r.passed) {
    check('firstFail.causedBy attributes CFid from aggressor 7',
          r.firstFail?.causedBy?.type === 'CFid' && r.firstFail?.causedBy?.aggressor === 7,
          `causedBy=${JSON.stringify(r.firstFail?.causedBy)}`);
  }
}

// CFst caught by Checkerboard. aggressor=2 (even, holds 0xA after
// checkerboard's write phase). aggressorValue=1 means trigger when the
// aggressor cell is all-ones. But 0xA != 0xF, so CFst with
// aggressorValue=1 will NOT fire here. Use aggressorValue=0 — but 0xA
// is not 0 either. Real trigger has to align with what checkerboard
// writes. Simpler: pick CFst with all-one write phase ⇒ aggressor=2,
// aggressorValue=1; run All-one pattern (writes 0xF to all cells, then
// reads). Aggressor cell 2 will hold 0xF → CFst fires on victim read.
{
  const ram = buildRam(3, 4);
  ram.couplingFaults = [{ aggressor: 2, victim: 5, type: 'CFst', aggressorValue: 1, forceTo: 0 }];
  const r = runMemoryTest(ram, getRamPattern('allOne', 3, 4));
  check('All-one catches CFst (cell 2 = 0xF forces cell 5 read → 0)',
        !r.passed && r.firstFail?.addr === 5,
        r.passed ? 'unexpectedly passed' : `firstFail addr=${r.firstFail?.addr}`);
  check('firstFail.causedBy attributes CFst from aggressor 2',
        r.firstFail?.causedBy?.type === 'CFst' && r.firstFail?.causedBy?.aggressor === 2,
        `causedBy=${JSON.stringify(r.firstFail?.causedBy)}`);
}

// Per-bit semantics — partial-word transitions (e.g. 0x0 → 0xA) trigger
// the corresponding bits of the victim. This is what makes Checkerboard
// catch coupling between adjacent cells the way the physical model
// expects: the bits that flip in the aggressor flip in the victim too.
{
  // Aggressor=7 written AFTER victim=6 — checkerboard's sequential write
  // phase finishes the aggressor write while no later write touches
  // victim=6, so the corruption survives to the read phase.
  const ram = buildRam(4, 8);   // 16 cells × 8-bit
  ram.couplingFaults = [{ aggressor: 7, victim: 6, type: 'CFin', trigger: 'any' }];
  const r = runMemoryTest(ram, getRamPattern('checkerboard', 4, 8));
  check('Checkerboard catches CFin(7→6, any) on partial-word transition',
        !r.passed && r.firstFail?.addr === 6,
        r.passed ? 'unexpectedly passed' : `firstFail.addr=${r.firstFail?.addr}`);
  check('Checkerboard fail attributed to aggressor 7',
        r.firstFail?.causedBy?.type === 'CFin' && r.firstFail?.causedBy?.aggressor === 7,
        `causedBy=${JSON.stringify(r.firstFail?.causedBy)}`);
}

// Per-bit CFin: only the bits that transitioned in the aggressor flip in
// the victim. Aggressor=3 written 0x00→0xA (bits 1 and 3 go 0→1); victim=5
// starts at 0 — should end up with exactly bits 1+3 set, i.e. 0xA.
{
  const mem = { 5: 0 };
  const cfaults = [{ aggressor: 3, victim: 5, type: 'CFin', trigger: '01' }];
  applyCouplingOnWrite(cfaults, 3, 0, 0xA, mem, 4);
  check('CFin per-bit: 0x0→0xA flips only bits 1+3 of victim',
        mem[5] === 0xA, `mem[5]=0x${mem[5].toString(16)}`);
}

// Per-bit CFid: only the triggered bits are forced; the rest of the
// victim word survives unchanged.
{
  const mem = { 5: 0x6 };   // 0110 — bit 1 and bit 2 set
  const cfaults = [{ aggressor: 3, victim: 5, type: 'CFid', trigger: '01', forceTo: 1 }];
  applyCouplingOnWrite(cfaults, 3, 0, 0xA, mem, 4);   // bits 1+3 of agg go up
  // Force bits 1+3 of victim to 1, leave bits 0,2 alone.
  // Victim 0x6 = 0110; force bits 1,3 to 1 → 1110 = 0xE.
  check('CFid per-bit: forces only triggered bits, others survive',
        mem[5] === 0xE, `mem[5]=0x${mem[5].toString(16)}`);
}

// Per-bit CFst — "AND-bridge" between two adjacent cells. The aggressor
// pulls each victim bit to 0 wherever the aggressor itself holds 0.
// Checkerboard now catches this: when victim=6 reads 0xAA and aggressor=7
// holds 0x55, the bridge forces victim bits 0,2,4,6 to 0 → read returns
// 0xAA & 0x55 = 0x00, mismatch with expected 0xAA.
{
  const ram = buildRam(4, 8);   // 16 cells × 8-bit
  ram.couplingFaults = [{
    aggressor: 7, victim: 6, type: 'CFst',
    bits: 0xFF, aggressorPattern: 0x00, forcePattern: 0x00,
  }];
  const r = runMemoryTest(ram, getRamPattern('checkerboard', 4, 8));
  check('Checkerboard catches CFst AND-bridge between adjacent cells',
        !r.passed && r.firstFail?.addr === 6,
        r.passed ? 'unexpectedly passed' : `firstFail.addr=${r.firstFail?.addr}`);
  check('Bridge fail attributed to CFst from aggressor 7',
        r.firstFail?.causedBy?.type === 'CFst' && r.firstFail?.causedBy?.aggressor === 7,
        `causedBy=${JSON.stringify(r.firstFail?.causedBy)}`);
}

// Per-bit CFst — "OR-bridge": any 1 bit in the aggressor pulls the
// corresponding victim bit up to 1. Checkerboard catches this too.
{
  const ram = buildRam(4, 8);
  ram.couplingFaults = [{
    aggressor: 7, victim: 6, type: 'CFst',
    bits: 0xFF, aggressorPattern: 0xFF, forcePattern: 0xFF,
  }];
  const r = runMemoryTest(ram, getRamPattern('checkerboard', 4, 8));
  // Aggressor cell 7 holds 0x55 after the write phase, so bits 0,2,4,6
  // of the aggressor are 1 → victim bits 0,2,4,6 forced to 1.
  // Victim cell 6 was supposed to hold 0xAA; observed becomes 0xAA|0x55=0xFF.
  check('Checkerboard catches CFst OR-bridge between adjacent cells',
        !r.passed && r.firstFail?.addr === 6,
        r.passed ? 'unexpectedly passed' : `firstFail.addr=${r.firstFail?.addr}`);
}

// Per-bit CFst on a single bit-line only — only bit 0 is bridged.
// The other bits read clean. Useful for modelling a defect localised
// to one specific bit-line, not the whole word.
{
  const mem = { 3: 0xA, 5: 0x0 };
  const cfaults = [{
    aggressor: 3, victim: 5, type: 'CFst',
    bits: 0x1, aggressorPattern: 0x0, forcePattern: 0x1,
  }];
  // bit 0 of aggressor (mem[3]=0xA=1010) is 0 → matches pattern → force
  // bit 0 of victim to 1. Other bits of victim survive.
  const v = applyCFstOnRead(cfaults, 5, 0x0, mem, 4);
  check('Per-bit CFst forces only the bridged bit',
        v === 0x1, `got 0x${v.toString(16)}`);
}

// Per-bit CFst does NOT fire when the bridged bit of the aggressor
// holds a non-matching value — the victim survives unchanged.
{
  const mem = { 3: 0x1, 5: 0x6 };   // aggressor bit 0 = 1 ≠ pattern 0
  const cfaults = [{
    aggressor: 3, victim: 5, type: 'CFst',
    bits: 0x1, aggressorPattern: 0x0, forcePattern: 0x1,
  }];
  const v = applyCFstOnRead(cfaults, 5, 0x6, mem, 4);
  check('Per-bit CFst is silent when the aggressor bit mismatches',
        v === 0x6, `got 0x${v.toString(16)}`);
}

// Legacy whole-word CFst is unaffected by the per-bit extension.
{
  const mem = { 3: 0xF, 5: 0xA };
  const cfaults = [{ aggressor: 3, victim: 5, type: 'CFst',
                     aggressorValue: 1, forceTo: 0 }];
  const v = applyCFstOnRead(cfaults, 5, 0xA, mem, 4);
  check('Legacy whole-word CFst still works (regression)',
        v === 0, `got 0x${v.toString(16)}`);
}

// Clean RAM (no coupling) — all 7 patterns still PASS.
{
  const ram = buildRam(3, 4);
  const patternIds = ['allZero','allOne','checkerboard','inverseCheckerboard',
                      'addressAsData','walkingOne','walkingZero'];
  let allPass = true;
  for (const id of patternIds) {
    const r = runMemoryTest(ram, getRamPattern(id, 3, 4));
    if (!r.passed) { allPass = false; break; }
  }
  check('Clean RAM (no coupling) — all 7 patterns still PASS', allPass);
}

// ─────────────────────────────────────────────────────────────
//   Layer 3: Engine end-to-end (live evaluate())
// ─────────────────────────────────────────────────────────────
console.log('\n  · Engine');

// Minimal scene: RAM + INPUT pads + CLOCK. We mutate the inputs across
// ticks, call evaluate(), and observe ffStates[ram.id].memory directly.
{
  const inA = { ...createComponent('INPUT', -200,  0), id: 'in_addr', fixedValue: 3 };
  const inD = { ...createComponent('INPUT', -200, 60), id: 'in_data', fixedValue: 0 };
  const inW = { ...createComponent('INPUT', -200,120), id: 'in_we',   fixedValue: 0 };
  const clk = { ...createComponent('CLOCK', -200,180), id: 'in_clk',  value: 0 };
  const ram = { ...createComponent('RAM', 0, 0), id: 'ram_e',
                addrBits: 3, dataBits: 4, memory: {},
                couplingFaults: [{ aggressor: 3, victim: 5, type: 'CFin', trigger: '01' }] };
  const wA  = { id: 'wA', sourceId: 'in_addr', targetId: 'ram_e', targetInputIndex: 0, sourceOutputIndex: 0 };
  const wD  = { id: 'wD', sourceId: 'in_data', targetId: 'ram_e', targetInputIndex: 1, sourceOutputIndex: 0 };
  const wW  = { id: 'wW', sourceId: 'in_we',   targetId: 'ram_e', targetInputIndex: 2, sourceOutputIndex: 0 };
  const wC  = { id: 'wC', sourceId: 'in_clk',  targetId: 'ram_e', targetInputIndex: 3, sourceOutputIndex: 0, isClockWire: true };

  const nodes = [inA, inD, inW, clk, ram];
  const wires = [wA, wD, wW, wC];
  const ffStates = new Map();

  // Set up: write 0 to cell 3 first (no transition yet, prevMem=0 by default).
  inA.fixedValue = 3; inD.fixedValue = 0; inW.fixedValue = 1;
  clk.value = 1; evaluate(nodes, wires, ffStates, 0);
  clk.value = 0; evaluate(nodes, wires, ffStates, 1);

  // Now write all-ones to cell 3 — this is the 0→1 transition.
  inD.fixedValue = 0xF;
  clk.value = 1; evaluate(nodes, wires, ffStates, 2);

  const ms = ffStates.get('ram_e');
  check('Engine: write 0→0xF to cell 3 stores 0xF',
        (ms.memory[3] & 0xF) === 0xF, `mem[3]=${ms.memory[3]}`);
  check('Engine: CFin fires → cell 5 flipped to 0xF (was 0)',
        (ms.memory[5] & 0xF) === 0xF, `mem[5]=${ms.memory[5]}`);
}

console.log(`\n${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
process.exit(failed === 0 ? 0 : 1);
