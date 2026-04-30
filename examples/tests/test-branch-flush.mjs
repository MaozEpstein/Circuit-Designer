// Conditional-branch flush smoke test.
//
// Program in mips-5stage-branch.json:
//   0: LI  R1, 5        ; baseline write
//   1-2: NOP
//   3: CMP R0, R0       ; sets Z=1
//   4-5: NOP
//   6: JZ  8            ; taken (Z=1)
//   7: LI  R5, 99       ; POISON — fetched while JZ is in ID
//   8: LI  R3, 42       ; target
//   9: HALT
//
// With the branch-flush wiring (CU.JMP → MUX-before-IR), the POISON
// instruction in IF when JZ resolves gets squashed to NOP. Final RF
// must have R3=42 and R5=0. Without the wiring, R5 ends up 99.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { evaluate } from '../../js/engine/SimulationEngine.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const file = resolve(__dirname, '..', 'circuits', 'mips-5stage-branch.json');
const scene = JSON.parse(readFileSync(file, 'utf8'));

let failed = 0;
function check(label, cond, detail = '') {
  const mark = cond ? 'PASS' : 'FAIL';
  if (!cond) failed++;
  console.log(`  [${mark}] ${label}${detail ? ' — ' + detail : ''}`);
}

console.log('\n[1] Branch-flush wiring contract');
const fmux = scene.nodes.find(n => n.id === 'ir_flush_mux');
check('MUX before IR exists', fmux && fmux.type === 'MUX' && fmux.inputCount === 2);
const cuToMux = scene.wires.some(w => w.sourceId === 'cu' && w.targetId === 'ir_flush_mux' && w.sourceOutputIndex === 4);
check('CU.JMP → ir_flush_mux.sel', cuToMux);
const muxToIr = scene.wires.some(w => w.sourceId === 'ir_flush_mux' && w.targetId === 'ir' && w.targetInputIndex === 0);
check('ir_flush_mux → IR', muxToIr);
const orGate = scene.nodes.find(n => n.id === 'gate_idex_flush');
check('OR gate folds HDU.Bubble + CU.JMP into ID/EX.FLUSH', orGate && orGate.type === 'GATE_SLOT' && orGate.gate === 'OR');

console.log('\n[2] Program semantics — JZ taken, POISON squashed');
const ffStates = new Map();
const clk = scene.nodes.find(n => n.type === 'CLOCK');
clk.value = 0;
evaluate(scene.nodes, scene.wires, ffStates, 0);
for (let cycle = 1; cycle <= 20; cycle++) {
  clk.value = 1; evaluate(scene.nodes, scene.wires, ffStates, cycle * 2 - 1);
  clk.value = 0; evaluate(scene.nodes, scene.wires, ffStates, cycle * 2);
}
const rf = ffStates.get('rf').regs;
console.log(`  Final RF[1..6] = [${rf[1]}, ${rf[2]}, ${rf[3]}, ${rf[4]}, ${rf[5]}, ${rf[6]}]`);
check('R1 = 5 (baseline LI before branch)', rf[1] === 5);
check('R3 = 42 (LI at target reached WB)', rf[3] === 42);
check('R5 = 0 (POISON squashed by branch flush)', rf[5] === 0,
      rf[5] !== 0 ? `got ${rf[5]} — flush is NOT working` : '');

console.log(`\n${failed === 0 ? 'OK' : `FAIL: ${failed} assertion(s) failed`}`);
process.exit(failed === 0 ? 0 : 1);
