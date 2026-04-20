// Standalone verification for Phase 6 — weighted critical-path + f_max.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { evaluate } from '../../js/pipeline/StageEvaluator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(resolve(__dirname, '../circuits/pipeline-demo.json'), 'utf8'));
const r = evaluate({ nodes: data.nodes, wires: data.wires });

let failed = 0;
function check(label, cond, extra='') {
  const mark = cond ? 'PASS' : 'FAIL';
  if (!cond) failed++;
  console.log(`  [${mark}] ${label}${extra ? '  — ' + extra : ''}`);
}

console.log(`cycles=${r.cycles} maxDelayPs=${r.maxDelayPs} fMaxMHz=${r.fMaxMHz?.toFixed(1)} bottleneck=${r.bottleneck}`);
for (const s of r.stages) {
  console.log(`  S${s.idx}: delay=${s.delayPs}ps  depth=${s.depth}  nodes=${s.nodes.length}  critPath=[${s.criticalPath.join(',')}]`);
}

// Each stage in the 3-stage demo has a single 50 ps gate (AND/NOT/OR/XOR).
// PIPE/IN/OUT/CLOCK are 0 ps. So stage delay should be 50 ps (for gates-only stages).
check('stage 0 delay includes an AND (50 ps)', r.stages[0].delayPs >= 50);
check('stage 1 delay includes a gate (50 ps)',  r.stages[1].delayPs >= 50);
check('stage 2 delay includes XOR (50 ps)',     r.stages[2].delayPs >= 50);
check('maxDelayPs is the max across stages',
  r.maxDelayPs === Math.max(...r.stages.map(s => s.delayPs)));
check('fMaxMHz matches 1e6 / maxDelayPs',
  Math.abs(r.fMaxMHz - 1e6 / r.maxDelayPs) < 1);
check('every stage has a non-empty criticalPath',
  r.stages.every(s => s.criticalPath.length > 0));

console.log(`\n${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
process.exit(failed === 0 ? 0 : 1);
