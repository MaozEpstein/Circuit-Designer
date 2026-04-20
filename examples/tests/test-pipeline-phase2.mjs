// Standalone verification for Phase 2 StageEvaluator.
// Runs against examples/circuits/pipeline-demo.json without a browser.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { evaluate } from '../../js/pipeline/StageEvaluator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const file = resolve(__dirname, '../circuits/pipeline-demo.json');
const data = JSON.parse(readFileSync(file, 'utf8'));

// Minimal scene adapter: evaluate() only reads .nodes and .wires.
const scene = { nodes: data.nodes, wires: data.wires };

const r = evaluate(scene);

let failed = 0;
function check(label, cond, extra = '') {
  const mark = cond ? 'PASS' : 'FAIL';
  if (!cond) failed++;
  console.log(`  [${mark}] ${label}${extra ? '  — ' + extra : ''}`);
}

console.log(`\nresult: cycles=${r.cycles} bottleneck=${r.bottleneck} hasCycle=${r.hasCycle}`);
console.table(r.stages.map(s => ({ stage: s.idx, depth: s.depth, nodeCount: s.nodes.length, ids: s.nodes.join(',') })));

console.log('\nassertions:');
check('no cycle detected', r.hasCycle === false);
check('3 stages reported', r.cycles === 3);
check('bottleneck is a valid stage index', r.bottleneck >= 0 && r.bottleneck < r.cycles);

const stageOf = (id) => data.nodes.find(n => n.id === id)?.stage;
check('in_a   @ stage 0', stageOf('in_a')   === 0);
check('in_b   @ stage 0', stageOf('in_b')   === 0);
check('in_c   @ stage 0', stageOf('in_c')   === 0);
check('and_1  @ stage 0', stageOf('and_1')  === 0);
check('pipe_1 @ stage 0', stageOf('pipe_1') === 0);
check('not_1  @ stage 1', stageOf('not_1')  === 1);
check('or_1   @ stage 1', stageOf('or_1')   === 1);
check('pipe_2 @ stage 1', stageOf('pipe_2') === 1);
check('pipe_3 @ stage 1', stageOf('pipe_3') === 1);
check('xor_1  @ stage 2', stageOf('xor_1')  === 2);
check('out_q  @ stage 2', stageOf('out_q')  === 2);

// Every stage has at least one combinational gate → depth 1.
check('stage 0 depth >= 1', r.stages[0].depth >= 1);
check('stage 1 depth >= 1', r.stages[1].depth >= 1);
check('stage 2 depth >= 1', r.stages[2].depth >= 1);

// Clock wires must be ignored — otherwise clk_1 → pipe_1/2/3 would distort stages.
check('clk_1 @ stage 0', stageOf('clk_1') === 0);

console.log(`\n${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
process.exit(failed === 0 ? 0 : 1);
