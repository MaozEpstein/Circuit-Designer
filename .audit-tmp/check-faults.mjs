// Verify part ו (bridge fault) and part ז (stuck-at-0) live circuits.
import { QUESTIONS } from '../IQ/timing-cdc/index.js';
import { evaluate } from '../js/engine/SimulationEngine.js';

const q = QUESTIONS.find(x => x.id === 'interview-2bit-multiplier-identification');
const partVav = q.parts.find(p => p.label === 'ו');
const partZayin = q.parts.find(p => p.label === 'ז');

let fails = 0;
function check(label, cond, detail = '') {
  console.log(`  [${cond ? 'PASS' : 'FAIL'}] ${label}${detail ? ' — ' + detail : ''}`);
  if (!cond) fails++;
}

// ── Part ו: bridge fault PP10↔PP01 ─────────────────────────
console.log('\n-- Part ו (bridge fault) --');
{
  const built = partVav.circuit();
  const lab = (l) => built.nodes.find(n => n.label === l);
  const A0 = lab('A0'), A1 = lab('A1'), B0 = lab('B0'), B1 = lab('B1');
  const Y0 = lab('Y0'), Y1 = lab('Y1'), Y2 = lab('Y2'), Y3 = lab('Y3');

  // Detection vector: A=01 (A0=1,A1=0), B=11 (B0=1,B1=1)
  // Without fault: 1·3 = 3 = 0011 → Y3=0, Y2=0, Y1=1, Y0=1
  // With wired-AND fault on PP10/PP01: Y1 = 0 (XOR1 sees 0,0 instead of 0,1)
  A0.fixedValue = 1; A1.fixedValue = 0;
  B0.fixedValue = 1; B1.fixedValue = 1;
  const { nodeValues } = evaluate(built.nodes, built.wires, new Map(), 0);
  const y = [Y0, Y1, Y2, Y3].map(n => nodeValues.get(n.id));
  console.log(`  Detection vector (A=01,B=11): Y3..Y0 = ${y[3]}${y[2]}${y[1]}${y[0]} (expected without fault: 0011)`);
  check('Y0 = 1 (PP00 unchanged)', y[0] === 1);
  check('Y1 = 0 (bridge collapses XOR1 inputs)', y[1] === 0, `got Y1=${y[1]}, expected 0`);

  // Transparent vector: A=B=11 → both PP10 and PP01 are 1 → bridge invisible
  A0.fixedValue = 1; A1.fixedValue = 1; B0.fixedValue = 1; B1.fixedValue = 1;
  const r2 = evaluate(built.nodes, built.wires, new Map(), 0);
  const y2 = [Y0, Y1, Y2, Y3].map(n => r2.nodeValues.get(n.id));
  console.log(`  Transparent vector (A=B=11): Y3..Y0 = ${y2[3]}${y2[2]}${y2[1]}${y2[0]} (3·3=9=1001)`);
  check('Y3..Y0 = 1001 (bridge transparent at A=B=11)',
        y2[3] === 1 && y2[2] === 0 && y2[1] === 0 && y2[0] === 1);
}

// ── Part ז: stuck-at-0 on C1 ───────────────────────────────
console.log('\n-- Part ז (stuck-at-0 on C1) --');
{
  const built = partZayin.circuit();
  const lab = (l) => built.nodes.find(n => n.label === l);
  const A0 = lab('A0'), A1 = lab('A1'), B0 = lab('B0'), B1 = lab('B1');
  const Y0 = lab('Y0'), Y1 = lab('Y1'), Y2 = lab('Y2'), Y3 = lab('Y3');

  // Detection vector: A=B=11 → C1 should be 1
  // Without fault: 3·3 = 9 = 1001 → Y3=1, Y2=0, Y1=0, Y0=1
  // With C1 s-a-0: Y2 = XOR2(1, 0) = 1; Y3 = AND6(1, 0) = 0
  // Expected output: Y3..Y0 = 0101 = 5
  A0.fixedValue = 1; A1.fixedValue = 1; B0.fixedValue = 1; B1.fixedValue = 1;
  const { nodeValues } = evaluate(built.nodes, built.wires, new Map(), 0);
  const y = [Y0, Y1, Y2, Y3].map(n => nodeValues.get(n.id));
  console.log(`  Detection vector (A=B=11): Y3..Y0 = ${y[3]}${y[2]}${y[1]}${y[0]} (expected with C1 s-a-0: 0101)`);
  check('Y0 = 1', y[0] === 1);
  check('Y1 = 0', y[1] === 0);
  check('Y2 = 1 (was 0; flipped by s-a-0)', y[2] === 1, `got Y2=${y[2]}, expected 1`);
  check('Y3 = 0 (was 1; flipped by s-a-0)', y[3] === 0, `got Y3=${y[3]}, expected 0`);

  // Transparent vector: A=B=01 → C1 expected 0 → fault invisible
  A0.fixedValue = 1; A1.fixedValue = 0; B0.fixedValue = 1; B1.fixedValue = 0;
  const r2 = evaluate(built.nodes, built.wires, new Map(), 0);
  const y2 = [Y0, Y1, Y2, Y3].map(n => r2.nodeValues.get(n.id));
  console.log(`  Transparent vector (A=B=01): Y3..Y0 = ${y2[3]}${y2[2]}${y2[1]}${y2[0]} (1·1=1=0001)`);
  check('Y3..Y0 = 0001 (s-a-0 transparent when C1 expected = 0)',
        y2[3] === 0 && y2[2] === 0 && y2[1] === 0 && y2[0] === 1);
}

console.log('\n' + (fails === 0 ? '✓ ALL fault checks pass' : `✗ ${fails} failure(s)`));
process.exit(fails === 0 ? 0 : 1);
