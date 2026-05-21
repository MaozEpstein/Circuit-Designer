// Sanity-check the 2-bit multiplier live circuit across all 16 input combos.
import { QUESTIONS } from '../IQ/timing-cdc/index.js';
import { evaluate } from '../js/engine/SimulationEngine.js';

const q = QUESTIONS.find(x => x.id === 'interview-2bit-multiplier-identification');
const built = q.parts[0].circuit();
const lab = (l) => built.nodes.find(n => n.label === l);
const A0 = lab('A0'), A1 = lab('A1'), B0 = lab('B0'), B1 = lab('B1');
const Y0 = lab('Y0'), Y1 = lab('Y1'), Y2 = lab('Y2'), Y3 = lab('Y3');

let fails = 0;
for (let A = 0; A < 4; A++)
  for (let B = 0; B < 4; B++) {
    A0.fixedValue = A & 1;
    A1.fixedValue = (A >> 1) & 1;
    B0.fixedValue = B & 1;
    B1.fixedValue = (B >> 1) & 1;
    const { nodeValues } = evaluate(built.nodes, built.wires, new Map(), 0);
    const Y = (nodeValues.get(Y3.id) << 3) | (nodeValues.get(Y2.id) << 2) |
              (nodeValues.get(Y1.id) << 1) | nodeValues.get(Y0.id);
    const expected = A * B;
    const ok = Y === expected;
    if (!ok) {
      console.log(`FAIL A=${A} B=${B}: got Y=${Y}, expected ${expected}`);
      fails++;
    }
  }
console.log(fails === 0 ? 'ALL 16 PASS — multiplier verified' : `${fails} failures`);
process.exit(fails === 0 ? 0 : 1);
