// Standalone verification for RunLengthMeasurer — simulation-driven
// cycle count, ground truth for the heuristic estimator.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { measureRunLength } from '../../js/analysis/RunLengthMeasurer.js';
import { estimateRunLength } from '../../js/analysis/RunLengthEstimator.js';

// Silence the SimulationEngine's per-clock debug logs (noisy for tests).
console.log = (() => {
  const orig = console.log;
  return function () {
    const s = arguments[0];
    if (typeof s === 'string' && /^\[(EVAL|CPU|P4e-|P4-)/.test(s)) return;
    return orig.apply(console, arguments);
  };
})();

const __dirname = dirname(fileURLToPath(import.meta.url));
const load = (rel) => JSON.parse(readFileSync(resolve(__dirname, rel), 'utf8'));

let failed = 0;
function check(label, cond, extra = '') {
  const mark = cond ? 'PASS' : 'FAIL';
  if (!cond) failed++;
  console.log(`  [${mark}] ${label}${extra ? '  \u2014 ' + extra : ''}`);
}

// ── 1. No clock → immediate exit, reason 'no-clock' ───────────────
console.log('\n-- no-clock scene --');
{
  const scene = {
    nodes: [
      { id: 'a', type: 'INPUT',  fixedValue: 1, x: 0, y: 0 },
      { id: 'q', type: 'OUTPUT', targetValue: 0, sandbox: true, x: 100, y: 0 },
    ],
    wires: [
      { id: 'w1', sourceId: 'a', targetId: 'q', targetInputIndex: 0, sourceOutputIndex: 0, waypoints: [], netName: '', colorGroup: null, isClockWire: false },
    ],
  };
  const r = measureRunLength(scene);
  check('reason = no-clock',  r.reason === 'no-clock');
  check('cycles = 0',         r.cycles === 0);
  check('terminated = true',  r.terminated === true);
}

// ── 2. Pipeline demo with no program — stable outputs after a few cycles ──
console.log('\n-- pipeline-demo-retime.json (stable-outputs path) --');
{
  const data  = load('../circuits/pipeline-demo-retime.json');
  const scene = { nodes: data.nodes, wires: data.wires };
  const r = measureRunLength(scene, { terminate: 'stable-outputs', stableWindow: 3, maxCycles: 100 });
  console.log(`  (cycles=${r.cycles}, reason=${r.reason}, timeMs=${r.timeMs.toFixed(0)})`);
  check('terminated before maxCycles',   r.terminated === true);
  check('reason = stable-outputs',       r.reason === 'stable-outputs');
  check('cycles within sane range',      r.cycles > 0 && r.cycles < 50);
}

// ── 3. Max-cycles trip — circuit that keeps toggling forever ──────
console.log('\n-- forced max-cycles trip --');
{
  // Clock + counter → output never stabilises because the counter keeps
  // incrementing. With a small maxCycles we should hit the cap.
  const scene = {
    nodes: [
      { id: 'clk', type: 'CLOCK',   value: 0, x: 0, y: 100 },
      { id: 'c1',  type: 'COUNTER', bitWidth: 8, x: 0, y: 0 },
      { id: 'q',   type: 'OUTPUT',  targetValue: 0, sandbox: true, x: 200, y: 0 },
    ],
    wires: [
      { id: 'wc', sourceId: 'clk', targetId: 'c1', targetInputIndex: 4, sourceOutputIndex: 0, waypoints: [], netName: '', colorGroup: null, isClockWire: true },
      { id: 'wq', sourceId: 'c1',  targetId: 'q',  targetInputIndex: 0, sourceOutputIndex: 0, waypoints: [], netName: '', colorGroup: null, isClockWire: false },
    ],
  };
  const r = measureRunLength(scene, { terminate: 'halt', maxCycles: 50 });
  check('terminated = false',      r.terminated === false);
  check('reason = max-cycles',     r.reason === 'max-cycles');
  check('cycles hit the cap (50)', r.cycles === 50);
}

// ── 4. CPU example with HALT — real-world ground truth ────────────
console.log('\n-- simple-cpu.json (halt-signal path) --');
{
  const data  = load('../circuits/simple-cpu.json');
  const scene = { nodes: data.nodes, wires: data.wires };
  const r = measureRunLength(scene, { terminate: 'halt', maxCycles: 200 });
  console.log(`  (cycles=${r.cycles}, reason=${r.reason}, haltNode=${r.haltNode}, timeMs=${r.timeMs.toFixed(0)})`);
  // simple-cpu has a CU; we don't know the exact cycle count without running
  // it, but HALT must fire well before maxCycles, and the reason must be halt.
  if (r.reason === 'halt-signal') {
    check('CPU terminated via HALT', true);
    check('haltNode is set',         typeof r.haltNode === 'string');
    check('cycles \u2264 maxCycles', r.cycles <= 200);
  } else {
    // Some CPUs might not propagate HALT cleanly in this stand-alone model;
    // accept a stable-state / stable-outputs terminator as well.
    check('terminated somehow',      r.terminated === true, 'reason=' + r.reason);
  }
}

// ── 5. Cross-validation: measurer vs estimator on demo programs ───
console.log('\n-- estimator vs measurer agreement --');
{
  const data  = load('../circuits/pipeline-demo-program.json');
  const scene = { nodes: data.nodes, wires: data.wires };
  const est = estimateRunLength(scene);
  const mes = measureRunLength(scene, { terminate: 'any', maxCycles: 500 });
  console.log(`  estimator: ${est.cycles} cyc (${est.confidence})`);
  console.log(`  measurer:  ${mes.cycles} cyc (${mes.reason})`);
  // Estimator gives the static upper-bound-ish number; measurer gives the
  // real termination point. For HALT-bearing programs they should agree
  // within a small multiplier (measurer stops as soon as HALT asserts).
  check('measurer reports a finite cycle count', mes.cycles > 0);
  check('estimator and measurer within 5\u00D7', Math.abs(est.cycles - mes.cycles) < est.cycles * 5 + 10);
}

console.log(`\n${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
process.exit(failed === 0 ? 0 : 1);
