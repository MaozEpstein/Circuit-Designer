// Verification for the mips-5stage-demo circuit — checks that:
//   (1) StageEvaluator assigns 4 visible stages with hasCycle=false
//       (IR-as-IF/ID collapses IF and ID into stage 0; ALU / RAM / WB_MUX
//       each land one stage deeper thanks to the 3 explicit PIPE_REGs).
//   (2) IsaInference reads the native CU controlTable.
//   (3) decodeROM + ProgramHazardDetector flag the expected 4 RAWs,
//       including the load-use case.
// This is both a regression gate for the StageEvaluator writeback fix
// and the acceptance test for the new demo circuit.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { evaluate } from '../../js/pipeline/StageEvaluator.js';
import { inferIsa } from '../../js/pipeline/isa/IsaInference.js';
import { decodeROM, findRomNode } from '../../js/pipeline/InstructionDecoder.js';
import { detectProgramHazards } from '../../js/pipeline/ProgramHazardDetector.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const load = (rel) => JSON.parse(readFileSync(resolve(__dirname, rel), 'utf8'));

let failed = 0;
function check(label, cond, extra = '') {
  const mark = cond ? 'PASS' : 'FAIL';
  if (!cond) failed++;
  console.log(`  [${mark}] ${label}${extra ? '  — ' + extra : ''}`);
}

// ── 1. Stage assignment ────────────────────────────────────────────
console.log('\n-- stage evaluator --');
{
  const scene = load('../circuits/mips-5stage-demo.json');
  const r = evaluate(scene);
  check('hasCycle is false',        r.hasCycle === false);
  check('4 visible stages',         r.stages?.length === 4, `got ${r.stages?.length}`);
  check('latency = 4 cycles',       r.cycles === 4, `got ${r.cycles}`);

  const stageOf = (id) => scene.nodes.find(n => n.id === id)?.stage;
  check('PC at stage 0',            stageOf('pc') === 0);
  check('IR at stage 0',            stageOf('ir') === 0);
  check('RF at stage 0',            stageOf('rf') === 0);
  check('ID/EX PIPE_REG at stage 0', stageOf('pipe_id_ex') === 0);
  check('ALU at stage 1',           stageOf('alu') === 1);
  check('EX/MEM PIPE_REG at stage 1', stageOf('pipe_ex_mem') === 1);
  check('RAM at stage 2',           stageOf('ram') === 2);
  check('MEM/WB PIPE_REG at stage 2', stageOf('pipe_mem_wb') === 2);
  check('WB_MUX at stage 3',        stageOf('wb_mux') === 3);
}

// ── 2. ISA inference ──────────────────────────────────────────────
console.log('\n-- ISA inference --');
{
  const scene = load('../circuits/mips-5stage-demo.json');
  const isa = inferIsa(scene);
  check('inferIsa returns non-null',            isa !== null);
  check('source = native-default-table',        isa.source === 'native-default-table');
  check('16 opcodes decoded',                   Object.keys(isa.opcodes).length === 16);
  check('LOAD opcode isLoad',                   isa.opcodes[0x8].isLoad === true);
  check('HALT opcode isHalt',                   isa.opcodes[0xF].isHalt === true);
}

// ── 3. Program-hazard detection over the ROM program ──────────────
console.log('\n-- program hazards --');
{
  const scene = load('../circuits/mips-5stage-demo.json');
  const rom = findRomNode(scene);
  check('ROM present',                          !!rom);
  const isa = inferIsa(scene);
  const stream = decodeROM(rom, isa);
  check('6 instructions decoded',               stream.length === 6, `got ${stream.length}`);
  check('PC 0 is ADD',                          stream[0].name === 'ADD');
  check('PC 3 is LOAD',                         stream[3].name === 'LOAD');
  check('PC 5 is HALT',                         stream[5].name === 'HALT');

  const hazards = detectProgramHazards(stream, isa);
  const raws = hazards.filter(h => h.type === 'RAW');
  check('exactly 4 RAW hazards',                raws.length === 4, `got ${raws.length}`);
  check('one load-use RAW',                     raws.filter(h => h.loadUse).length === 1);

  const loadUse = raws.find(h => h.loadUse);
  check('load-use is PC 3 → PC 4 on R7',
    loadUse?.instI === 3 && loadUse?.instJ === 4 && loadUse?.register === 7);

  // Back-to-back RAW on R1 between PC 0 and PC 1.
  const r1Adjacent = raws.find(h => h.instI === 0 && h.instJ === 1);
  check('back-to-back RAW on R1 is PC 0 → PC 1',
    r1Adjacent && r1Adjacent.register === 1 && r1Adjacent.bubbles > 0,
    `bubbles=${r1Adjacent?.bubbles}`);

  // RAW on R4 (PC 1 writes R4, PC 2 reads R4).
  const r4Hazard = raws.find(h => h.register === 4);
  check('RAW on R4 detected',                   !!r4Hazard);
}

console.log(`\n${failed === 0 ? 'OK — all checks passed.' : `FAILED — ${failed} check(s)`}`);
process.exit(failed === 0 ? 0 : 1);
