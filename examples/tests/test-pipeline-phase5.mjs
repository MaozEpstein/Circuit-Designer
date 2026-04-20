// Standalone verification for Phase 5 — cross-stage violation detection.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { evaluate } from '../../js/pipeline/StageEvaluator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const load = (rel) => JSON.parse(readFileSync(resolve(__dirname, rel), 'utf8'));

let failed = 0;
function check(label, cond, extra='') {
  const mark = cond ? 'PASS' : 'FAIL';
  if (!cond) failed++;
  console.log(`  [${mark}] ${label}${extra ? '  — ' + extra : ''}`);
}

console.log('\n-- pipeline-demo.json (clean) --');
{
  const data = load('../circuits/pipeline-demo.json');
  const r = evaluate({ nodes: data.nodes, wires: data.wires });
  check('no violations on clean demo', r.violations.length === 0, `got ${r.violations.length}`);
}

console.log('\n-- pipeline-demo-bad.json (injected violation) --');
{
  const data = load('../circuits/pipeline-demo-bad.json');
  const r = evaluate({ nodes: data.nodes, wires: data.wires });
  console.log(`  (cycles=${r.cycles}, bottleneck=${r.bottleneck}, violations=${r.violations.length})`);
  check('exactly 1 violation detected', r.violations.length === 1);
  const v = r.violations[0];
  check('violation is on the A → XOR wire', v && v.srcId === 'in_a' && v.dstId === 'xor_1');
  check('violation crosses at least one stage', v && v.dstStage > v.srcStage);
  check('missing >= 1', v && v.missing >= 1);
}

console.log(`\n${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
process.exit(failed === 0 ? 0 : 1);
