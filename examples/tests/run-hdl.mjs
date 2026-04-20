// Discovers and runs every test-hdl-*.mjs under examples/tests/ in parallel.
//
// Usage:
//   node examples/tests/run-hdl.mjs
//   node examples/tests/run-hdl.mjs --serial
//
// Each test file is spawned as its own node process. Stdout is captured and
// replayed after completion so interleaved workers don't produce jumbled
// output. Exits non-zero on any failure.

import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { cpus } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serial = process.argv.includes('--serial');

const files = readdirSync(__dirname)
  .filter(f => /^test-hdl-.+\.mjs$/.test(f))
  .sort();

if (files.length === 0) {
  console.log('No test-hdl-*.mjs files found.');
  process.exit(0);
}

function runOne(file) {
  return new Promise(resolve => {
    const full = join(__dirname, file);
    const p = spawn(process.execPath, [full], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    p.stdout.on('data', d => out += d.toString());
    p.stderr.on('data', d => err += d.toString());
    p.on('close', code => resolve({ file, code, out, err }));
  });
}

async function runAll() {
  const poolSize = serial ? 1 : Math.max(1, Math.min(files.length, cpus().length));
  const queue = [...files];
  const results = [];
  const workers = [];

  for (let i = 0; i < poolSize; i++) {
    workers.push((async () => {
      while (queue.length) {
        const f = queue.shift();
        results.push(await runOne(f));
      }
    })());
  }
  await Promise.all(workers);

  // Replay in sorted order for stable output.
  results.sort((a, b) => a.file < b.file ? -1 : 1);
  let failed = 0;
  for (const r of results) {
    console.log(`\n──── ${r.file} ${r.code === 0 ? '(ok)' : '(FAIL)'} ────`);
    if (r.out) process.stdout.write(r.out);
    if (r.err) process.stderr.write(r.err);
    if (r.code !== 0) failed++;
  }
  console.log(`\n${failed === 0 ? 'All HDL test files passed.' : `${failed} HDL test file(s) failed.`}`);
  process.exit(failed === 0 ? 0 : 1);
}

runAll();
