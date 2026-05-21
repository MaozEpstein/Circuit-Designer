// LOC report grouped by project categories.
//
// Counts non-blank lines per file, groups files by category, then
// prints a summary table + grand total.
//
// Ignores: .git, node_modules, .audit-tmp, screenshots, docs/generated.

import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';

const ROOT = '.';
const EXCLUDE_DIRS = new Set(['.git', 'node_modules', '.audit-tmp', 'screenshots']);

const CATEGORIES = [
  // Order matters — first match wins. More specific paths first.
  { label: 'IQ — interview content',         match: p => p.startsWith('IQ' + sep) || p === 'IQ' },
  { label: 'Engine — simulation core',       match: p => p.startsWith('js/engine'.replaceAll('/', sep)) },
  { label: 'Components — node/wire factories', match: p => p.startsWith('js/components'.replaceAll('/', sep)) },
  { label: 'CPU / pipeline / DFT modules',   match: p =>
      p.startsWith('js/cpu'.replaceAll('/', sep)) ||
      p.startsWith('js/pipeline'.replaceAll('/', sep)) ||
      p.startsWith('js/dft'.replaceAll('/', sep)) },
  { label: 'Interview infrastructure',       match: p => p.startsWith('js/interview'.replaceAll('/', sep)) },
  { label: 'Rendering / canvas / UI',        match: p =>
      p.startsWith('js/rendering'.replaceAll('/', sep)) ||
      p.startsWith('js/ui'.replaceAll('/', sep)) ||
      p.startsWith('js/interaction'.replaceAll('/', sep)) ||
      p.startsWith('js/waveform'.replaceAll('/', sep)) ||
      p.startsWith('js/routing'.replaceAll('/', sep)) ||
      p.startsWith('js/mobile'.replaceAll('/', sep)) ||
      p.startsWith('js/tutorial'.replaceAll('/', sep)) },
  { label: 'Analysis / debug / HDL helpers', match: p =>
      p.startsWith('js/analysis'.replaceAll('/', sep)) ||
      p.startsWith('js/debug'.replaceAll('/', sep)) ||
      p.startsWith('js/hdl'.replaceAll('/', sep)) ||
      p.startsWith('js/core'.replaceAll('/', sep)) },
  { label: 'JS — other / app entry',         match: p => p.startsWith('js' + sep) },
  { label: 'Tests',                          match: p => p.startsWith('examples/tests'.replaceAll('/', sep)) },
  { label: 'Scripts / tooling',              match: p => p.startsWith('scripts' + sep) },
  { label: 'Styles (CSS)',                   match: p => p.startsWith('css' + sep) || p.endsWith('.css') },
  { label: 'HTML pages',                     match: p => p.endsWith('.html') },
  { label: 'Markdown / docs',                match: p => p.endsWith('.md') || p.startsWith('docs' + sep) },
  { label: 'Other (json, examples)',         match: p => true },
];

const COUNTED_EXTS = new Set(['.js', '.mjs', '.html', '.css', '.md', '.json']);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (EXCLUDE_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function countLines(path) {
  const txt = readFileSync(path, 'utf8');
  const lines = txt.split(/\r?\n/);
  // total lines (with blanks)
  const total = lines.length;
  // non-blank
  const nonBlank = lines.filter(l => l.trim().length > 0).length;
  return { total, nonBlank };
}

const all = walk(ROOT).map(p => p.startsWith('.' + sep) ? p.slice(2) : p);

const buckets = new Map(CATEGORIES.map(c => [c.label, { files: 0, total: 0, nonBlank: 0 }]));
let grandFiles = 0, grandTotal = 0, grandNonBlank = 0;

for (const file of all) {
  const dotIdx = file.lastIndexOf('.');
  const ext = dotIdx >= 0 ? file.slice(dotIdx) : '';
  if (!COUNTED_EXTS.has(ext)) continue;
  const { total, nonBlank } = countLines(file);
  // Pick the first matching category
  const cat = CATEGORIES.find(c => c.match(file)) ?? CATEGORIES[CATEGORIES.length - 1];
  const b = buckets.get(cat.label);
  b.files++; b.total += total; b.nonBlank += nonBlank;
  grandFiles++; grandTotal += total; grandNonBlank += nonBlank;
}

// Render
const rows = [...buckets.entries()]
  .filter(([_, b]) => b.files > 0)
  .sort((a, b) => b[1].nonBlank - a[1].nonBlank);

const fmt = n => String(n).padStart(7, ' ');
const pct = n => (100 * n / grandNonBlank).toFixed(1).padStart(5, ' ') + '%';

console.log('');
console.log('┌─────────────────────────────────────────┬──────┬──────────┬──────────┬───────┐');
console.log('│ Category                                │ Files│  Lines   │ Non-blank│  Share│');
console.log('├─────────────────────────────────────────┼──────┼──────────┼──────────┼───────┤');
for (const [label, b] of rows) {
  console.log(`│ ${label.padEnd(40, ' ')}│${fmt(b.files)}│${fmt(b.total)}   │${fmt(b.nonBlank)}   │${pct(b.nonBlank)}│`);
}
console.log('├─────────────────────────────────────────┼──────┼──────────┼──────────┼───────┤');
console.log(`│ ${'TOTAL'.padEnd(40, ' ')}│${fmt(grandFiles)}│${fmt(grandTotal)}   │${fmt(grandNonBlank)}   │ 100.0%│`);
console.log('└─────────────────────────────────────────┴──────┴──────────┴──────────┴───────┘');
console.log('');
