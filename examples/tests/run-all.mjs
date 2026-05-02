// Runs every test-*.mjs in this directory in sequence and prints
// a summary. Exit code is 0 if all pass, 1 if any fail.
//
// One pass = one second per test (roughly), so the whole suite
// runs in a few seconds. Failing tests have their stdout/stderr
// dumped at the end so the failure context is right there.
//
// Run:  node examples/tests/run-all.mjs

import { readdirSync } from 'node:fs';
import { spawnSync }   from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Only files named test-*.mjs — this script is run-all.mjs, so it
// excludes itself naturally.
const tests = readdirSync(__dirname)
  .filter(f => f.startsWith('test-') && f.endsWith('.mjs'))
  .sort();

if (tests.length === 0) {
  console.log('No test-*.mjs files found in', __dirname);
  process.exit(0);
}

console.log(`Running ${tests.length} test files...\n`);

const results = [];
for (const file of tests) {
  const start = Date.now();
  const r = spawnSync('node', [join(__dirname, file)], {
    encoding: 'utf8',
    stdio:    'pipe',
  });
  const ms = Date.now() - start;
  const ok = r.status === 0;
  results.push({ file, ok, ms, stdout: r.stdout || '', stderr: r.stderr || '' });
  // Live one-line status per test.
  const tag = ok ? '[PASS]' : '[FAIL]';
  process.stdout.write(`  ${tag} ${file.padEnd(48)} ${String(ms).padStart(5)}ms\n`);
}

// ── Summary ───────────────────────────────────────────────────
const failed = results.filter(r => !r.ok);
const passed = results.length - failed.length;
const totalMs = results.reduce((sum, r) => sum + r.ms, 0);

console.log('\n' + '─'.repeat(70));
console.log(`${passed}/${results.length} files passed in ${totalMs}ms (${(totalMs / 1000).toFixed(1)}s)`);

// ── Failure dump ──────────────────────────────────────────────
// For each failing test, print its full output so the cause is
// visible without having to re-run that file by hand.
if (failed.length > 0) {
  console.log(`\n${failed.length} FAILED:\n`);
  for (const f of failed) {
    console.log('═'.repeat(70));
    console.log('  ' + f.file);
    console.log('═'.repeat(70));
    if (f.stdout) console.log(f.stdout);
    if (f.stderr) {
      console.log('--- stderr ---');
      console.log(f.stderr);
    }
  }
}

process.exit(failed.length > 0 ? 1 : 0);
