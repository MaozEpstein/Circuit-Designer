// Verify the #5009 part ה side-by-side circuit:
//   Pipeline A (direct) and Pipeline B (synchronized) react differently
//   to RST_in deassertion. After deassertion, Pipeline A's FFs release
//   immediately; Pipeline B's FFs wait 2 cycles (sync delay).
import { QUESTIONS } from '../IQ/timing-cdc/index.js';
import { evaluate } from '../js/engine/SimulationEngine.js';

const q = QUESTIONS.find(x => x.id === 'interview-reset-design');
const partHe = q.parts.find(p => p.label === 'ה');
const scene = partHe.circuit();

const byLabel = l => scene.nodes.find(n => n.label === l);
const clk    = byLabel(undefined) || scene.nodes.find(n => n.type === 'CLOCK');
const rst_in = byLabel('RST_in');
const qA1    = byLabel('Q_A1');
const qB1    = byLabel('Q_B1');
const rstInt = byLabel('rst_int');

function tick(ffs, i) {
  clk.value = 1; evaluate(scene.nodes, scene.wires, ffs, i);
  clk.value = 0; evaluate(scene.nodes, scene.wires, ffs, i);
}

let fails = 0;
function check(label, cond, detail = '') {
  if (!cond) fails++;
  console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${label}${detail ? ' — ' + detail : ''}`);
}

const ffs = new Map();

// ── Phase 1: RST_in=0 (asserted, active-low) — prime and observe reset ──
rst_in.fixedValue = 0;
for (let i = 0; i < 3; i++) tick(ffs, i);

// Read all relevant FFs
const qA1Node = scene.nodes.find(n => n.label === 'FF_A1');
const qB1Node = scene.nodes.find(n => n.label === 'FF_B1');
const sync2   = scene.nodes.find(n => n.label === 'FF_sync2');

check('RST asserted: Q_A1 = 0', ffs.get(qA1Node.id)?.q === 0, `got ${ffs.get(qA1Node.id)?.q}`);
check('RST asserted: Q_B1 = 0', ffs.get(qB1Node.id)?.q === 0, `got ${ffs.get(qB1Node.id)?.q}`);
check('RST asserted: rst_int (FF_sync2) = 0', ffs.get(sync2.id)?.q === 0, `got ${ffs.get(sync2.id)?.q}`);

// ── Phase 2: RST_in=1 (deassert) — observe differential behavior ──
rst_in.fixedValue = 1;
tick(ffs, 10);   // CLK cycle 1 after deassert

// After 1 cycle:
// Pipeline A: FF_A1 sampled in=1 → Q_A1=1 (immediate release)
// Pipeline B: rst_int still 0 (sync needs 2 cycles), FF_B1 still in reset → Q_B1=0
check('1 cycle after deassert: Q_A1 = 1 (direct, fast)',
      ffs.get(qA1Node.id)?.q === 1, `got ${ffs.get(qA1Node.id)?.q}`);
check('1 cycle after deassert: Q_B1 = 0 (sync still in reset)',
      ffs.get(qB1Node.id)?.q === 0, `got ${ffs.get(qB1Node.id)?.q}`);

tick(ffs, 11);   // CLK cycle 2 after deassert

// After 2 cycles:
// Pipeline B: FF_sync2 sampled FF_sync1.Q (=1) → rst_int=1 → FF_B1 out of reset (but D=1 captured this same edge)
check('2 cycles after deassert: rst_int = 1 (sync released)',
      ffs.get(sync2.id)?.q === 1, `got ${ffs.get(sync2.id)?.q}`);

tick(ffs, 12);   // CLK cycle 3

check('3 cycles after deassert: Q_B1 = 1 (now released and capturing)',
      ffs.get(qB1Node.id)?.q === 1, `got ${ffs.get(qB1Node.id)?.q}`);

console.log('\n' + (fails === 0
  ? '✓ ALL part-ה reset behaviors verified'
  : `✗ ${fails} failure(s)`));
process.exit(fails === 0 ? 0 : 1);
