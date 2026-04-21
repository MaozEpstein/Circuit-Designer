// Standalone verification for RunLengthEstimator — the static heuristic
// that predicts how many cycles a scene will run.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { estimateRunLength } from '../../js/analysis/RunLengthEstimator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const load = (rel) => JSON.parse(readFileSync(resolve(__dirname, rel), 'utf8'));

let failed = 0;
function check(label, cond, extra = '') {
  const mark = cond ? 'PASS' : 'FAIL';
  if (!cond) failed++;
  console.log(`  [${mark}] ${label}${extra ? '  \u2014 ' + extra : ''}`);
}
function encode(op, rd, rs1, rs2) {
  return ((op & 0xF) << 12) | ((rd & 0xF) << 8) | ((rs1 & 0xF) << 4) | (rs2 & 0xF);
}

// ── 1. No clock → unknown, 1 cycle ─────────────────────────────
console.log('\n-- Case 6: combinational-only (no clock) --');
{
  const scene = {
    nodes: [
      { id: 'a',  type: 'INPUT',  fixedValue: 1, x: 0, y: 0 },
      { id: 'n1', type: 'GATE_SLOT', gate: 'NOT', x: 100, y: 0 },
      { id: 'q',  type: 'OUTPUT', targetValue: 0, sandbox: true, x: 200, y: 0 },
    ],
    wires: [
      { id: 'w1', sourceId: 'a',  targetId: 'n1', targetInputIndex: 0, sourceOutputIndex: 0, waypoints: [], netName: '', colorGroup: null, isClockWire: false },
      { id: 'w2', sourceId: 'n1', targetId: 'q',  targetInputIndex: 0, sourceOutputIndex: 0, waypoints: [], netName: '', colorGroup: null, isClockWire: false },
    ],
  };
  const r = estimateRunLength(scene);
  check('confidence = unknown',    r.confidence === 'unknown');
  check('cycles = 1',               r.cycles === 1);
  check('isBounded = true',         r.isBounded === true);
  check('reason mentions "no clock"', /no clock/i.test(r.reason));
  check('pipelineDepth is numeric',   typeof r.pipelineDepth === 'number');
}

// ── 2. ROM with HALT → high confidence ─────────────────────────
console.log('\n-- Case 1: ROM + HALT --');
{
  const scene = {
    nodes: [
      { id: 'clk', type: 'CLOCK', value: 0, x: 0, y: 100 },
      { id: 'rom', type: 'ROM',   addrBits: 4, dataBits: 16, x: 0, y: 0,
        memory: {
          '0': encode(0x0, 1, 2, 3),   // ADD R1, R2, R3
          '1': encode(0x1, 4, 1, 5),   // SUB R4, R1, R5
          '2': encode(0xF, 0, 0, 0),   // HALT
        } },
    ],
    wires: [],
  };
  const r = estimateRunLength(scene);
  check('confidence = high',             r.confidence === 'high');
  check('sources includes rom-halt',     r.sources.includes('rom-halt'));
  check('cycles \u2265 HALT PC + margin', r.cycles >= 2 + 2);
  check('isBounded = true',               r.isBounded === true);
  check('reason names HALT PC',           /HALT.*0x2/i.test(r.reason));
}

// ── 3. ROM with JMP back → infinite loop detected ──────────────
console.log('\n-- Case 2: ROM + unconditional JMP backwards --');
{
  // 0x00: ADD
  // 0x01: JMP 0x00 (loop forever)
  // No HALT.
  const jmp = (0xA << 12) | 0x000;   // JMP addr=0
  const scene = {
    nodes: [
      { id: 'clk', type: 'CLOCK', value: 0, x: 0, y: 100 },
      { id: 'rom', type: 'ROM',   addrBits: 4, dataBits: 16, x: 0, y: 0,
        memory: {
          '0': encode(0x0, 1, 2, 3),
          '1': jmp,
        } },
    ],
    wires: [],
  };
  const r = estimateRunLength(scene);
  check('confidence = medium',       r.confidence === 'medium');
  check('sources includes rom-loop', r.sources.includes('rom-loop'));
  check('isBounded = false (loop)',  r.isBounded === false);
  check('reason mentions JMP',       /JMP/i.test(r.reason));
}

// ── 4. ROM without HALT and without loop → medium "fall off end" ─
console.log('\n-- Case 3: ROM without HALT, no loop --');
{
  const scene = {
    nodes: [
      { id: 'clk', type: 'CLOCK', value: 0, x: 0, y: 100 },
      { id: 'rom', type: 'ROM',   addrBits: 4, dataBits: 16, x: 0, y: 0,
        memory: {
          '0': encode(0x0, 1, 2, 3),
          '1': encode(0x1, 4, 1, 5),
          '2': encode(0xD, 7, 8, 0),   // MOV
        } },
    ],
    wires: [],
  };
  const r = estimateRunLength(scene);
  check('confidence = medium',       r.confidence === 'medium');
  check('sources includes rom-end',  r.sources.includes('rom-end'));
  check('isBounded = true',          r.isBounded === true);
}

// ── 5. Pipeline-only (no program) → low confidence fallback ────
console.log('\n-- Case 5: pipeline-only demo --');
{
  const data  = load('../circuits/pipeline-demo-retime.json');
  const scene = { nodes: data.nodes, wires: data.wires };
  const r = estimateRunLength(scene);
  check('confidence = low',                  r.confidence === 'low');
  check('sources includes pipeline-default', r.sources.includes('pipeline-default'));
  check('cycles \u2265 FLOOR_CYCLES (6)',    r.cycles >= 6);
  check('cycles tracks depth+idle',           r.cycles === Math.max(6, r.pipelineDepth + 3));
  check('isBounded = true',                  r.isBounded === true);
  check('upperBound is null (no counter)',   r.upperBound === null);
}

// ── 6. Real example: simple-cpu.json ──────────────────────────
console.log('\n-- Real example: simple-cpu.json --');
{
  const data  = load('../circuits/simple-cpu.json');
  const scene = { nodes: data.nodes, wires: data.wires };
  const r = estimateRunLength(scene);
  console.log(`  (cycles=${r.cycles}, confidence=${r.confidence}, reason=${r.reason})`);
  check('confidence is high or medium',  ['high','medium'].includes(r.confidence));
  check('cycles in a plausible range',   r.cycles >= 6 && r.cycles <= 200);
}

// ── 7. Real example: mips-gcd.json ────────────────────────────
console.log('\n-- Real example: mips-gcd.json --');
{
  const data  = load('../circuits/mips-gcd.json');
  const scene = { nodes: data.nodes, wires: data.wires };
  const r = estimateRunLength(scene);
  console.log(`  (cycles=${r.cycles}, confidence=${r.confidence}, reason=${r.reason})`);
  check('returns a numeric cycle count',  typeof r.cycles === 'number' && r.cycles > 0);
  check('has a reason string',            typeof r.reason === 'string' && r.reason.length > 0);
}

// ── 8. Naked COUNTER (no CLR wire) → unbounded, high confidence ───
console.log('\n-- Case 0b: naked COUNTER (no CLR) --');
{
  const scene = {
    nodes: [
      { id: 'clk', type: 'CLOCK',   value: 0, x: 0, y: 100 },
      { id: 'c1',  type: 'COUNTER', bitWidth: 8, x: 0, y: 0, label: 'CTR' },
    ],
    wires: [
      // Only clock wired — no CLR, LOAD, or EN drivers.
      { id: 'wc', sourceId: 'clk', targetId: 'c1', targetInputIndex: 4, sourceOutputIndex: 0, waypoints: [], netName: '', colorGroup: null, isClockWire: true },
    ],
  };
  const r = estimateRunLength(scene);
  check('confidence = high (naked counter)', r.confidence === 'high');
  check('isBounded = false',                 r.isBounded === false);
  check('sources includes naked-counter',    r.sources.includes('naked-counter'));
  check('upperBound = 256 (2^8)',            r.upperBound === 256);
}

// ── 9. Counter WITH a CLR wire → falls back to pipeline estimate ──
console.log('\n-- Case 4: COUNTER with CLR wired (upper-bound path) --');
{
  const scene = {
    nodes: [
      { id: 'clk', type: 'CLOCK',   value: 0, x: 0, y: 100 },
      { id: 'clr', type: 'INPUT',   fixedValue: 0, x: -100, y: 0 },
      { id: 'c1',  type: 'COUNTER', bitWidth: 8, x: 0, y: 0 },
    ],
    wires: [
      { id: 'wc', sourceId: 'clk', targetId: 'c1', targetInputIndex: 4, sourceOutputIndex: 0, waypoints: [], netName: '', colorGroup: null, isClockWire: true },
      { id: 'wr', sourceId: 'clr', targetId: 'c1', targetInputIndex: 3, sourceOutputIndex: 0, waypoints: [], netName: '', colorGroup: null, isClockWire: false },
    ],
  };
  const r = estimateRunLength(scene);
  check('confidence = low',                    r.confidence === 'low');
  check('sources includes counter-width',      r.sources.includes('counter-width'));
  check('upperBound = 256 (2^8)',              r.upperBound === 256);
  check('cycles does not exceed upperBound',   r.cycles <= r.upperBound);
}

// ── 10. LOOP hazard → unbounded, high confidence ─────────────
console.log('\n-- Case 0a: combinational loop hazard --');
{
  // Two NOTs forming a pure combinational cycle.
  const scene = {
    nodes: [
      { id: 'clk', type: 'CLOCK',     value: 0, x: 0, y: 100 },
      { id: 'n1',  type: 'GATE_SLOT', gate: 'NOT', x: 0, y: 0 },
      { id: 'n2',  type: 'GATE_SLOT', gate: 'NOT', x: 100, y: 0 },
    ],
    wires: [
      { id: 'w1', sourceId: 'n1', targetId: 'n2', targetInputIndex: 0, sourceOutputIndex: 0, waypoints: [], netName: '', colorGroup: null, isClockWire: false },
      { id: 'w2', sourceId: 'n2', targetId: 'n1', targetInputIndex: 0, sourceOutputIndex: 0, waypoints: [], netName: '', colorGroup: null, isClockWire: false },
    ],
  };
  const r = estimateRunLength(scene);
  check('confidence = high (loop detected)', r.confidence === 'high');
  check('isBounded = false',                 r.isBounded === false);
  check('sources includes hazard-loop',      r.sources.includes('hazard-loop'));
  check('reason mentions loop',              /loop/i.test(r.reason));
}

// ── 11. RAW feedback reaching OUTPUT → unbounded (medium) ────────
console.log('\n-- Case 0a\u2032: RAW/WAR/WAW hazard whose cycle reaches an OUTPUT --');
{
  const data  = load('../circuits/pipeline-demo-hazard.json');
  const scene = { nodes: data.nodes, wires: data.wires };
  const r = estimateRunLength(scene);
  console.log(`  (cycles=${r.cycles}, confidence=${r.confidence}, sources=[${r.sources.join(',')}])`);
  check('confidence = medium',                r.confidence === 'medium');
  check('isBounded = false',                  r.isBounded === false);
  check('sources includes hazard-feedback',   r.sources.includes('hazard-feedback'));
  check('reason mentions OUTPUT',             /output/i.test(r.reason));
}

// ── 12. verify: true on a known CPU → estimate upgraded to 'verified' ──
console.log('\n-- verify option: CPU with HALT (estimate vs measurement) --');
{
  // Silence the SimulationEngine's per-clock debug logs for this block only.
  const orig = console.log;
  console.log = function () { const s = arguments[0]; if (typeof s === 'string' && /^\[(EVAL|CPU|P4e-|P4-)/.test(s)) return; return orig.apply(console, arguments); };

  const data  = load('../circuits/simple-cpu.json');
  const scene = { nodes: data.nodes, wires: data.wires };
  const r = estimateRunLength(scene, { verify: true });

  console.log = orig;
  console.log(`  (cycles=${r.cycles}, confidence=${r.confidence})`);
  check('confidence is verified / verified-diff', ['verified','verified-diff'].includes(r.confidence));
  check('measured cycle count is present',        typeof r.measured?.cycles === 'number');
  check('estimated cycle count is preserved',     typeof r.estimated?.cycles === 'number');
  check('sources includes measured',              r.sources.includes('measured'));
}

// ── 13. verify: true on unbounded circuit → still flagged correctly ─
console.log('\n-- verify option: naked counter (should stay unbounded) --');
{
  const orig = console.log;
  console.log = function () { const s = arguments[0]; if (typeof s === 'string' && /^\[(EVAL|CPU|P4e-|P4-)/.test(s)) return; return orig.apply(console, arguments); };

  const scene = {
    nodes: [
      { id: 'clk', type: 'CLOCK',   value: 0, x: 0, y: 100 },
      { id: 'c1',  type: 'COUNTER', bitWidth: 4, x: 0, y: 0 },
    ],
    wires: [
      { id: 'wc', sourceId: 'clk', targetId: 'c1', targetInputIndex: 4, sourceOutputIndex: 0, waypoints: [], netName: '', colorGroup: null, isClockWire: true },
    ],
  };
  const r = estimateRunLength(scene, { verify: true, verifyMaxCycles: 100 });
  console.log = orig;

  check('confidence = verified (both unbounded)', r.confidence === 'verified');
  check('isBounded = false (agreed)',             r.isBounded === false);
  check('measured.terminated = false',            r.measured?.terminated === false);
}

console.log(`\n${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
process.exit(failed === 0 ? 0 : 1);
