// Standardize SVG font sizes across the IQ corpus so every diagram
// uses the same legible scale. Bumps every `font-size="N"` attribute
// (and `font-size: N` inside tspans / styles, if any) to a uniform
// scale defined below.
//
// Scale:
//   <13  → 16   (smallest labels)
//   13-16 → 18  (small)
//   17-20 → 20  (body)
//   21-24 → 24  (sub-headers)
//   25-28 → 28  (headers)
//   29+   → 32  (big titles)
//
// Run: node .audit-tmp/standardize-fonts.mjs
import { readFileSync, writeFileSync } from 'node:fs';

function snap(n) {
  if (n < 13) return 16;
  if (n < 17) return 18;
  if (n < 21) return 20;
  if (n < 25) return 24;
  if (n < 29) return 28;
  return 32;
}

const files = [
  'IQ/timing-cdc/index.js',
  'IQ/dft/index.js',
  'IQ/logic/index.js',
  'IQ/sequential/index.js',
  'IQ/algorithms/index.js',
  'IQ/architecture/index.js',
  'IQ/puzzles/index.js',
  'IQ/verilog/index.js',
];

let total = 0;
for (const path of files) {
  let src;
  try { src = readFileSync(path, 'utf8'); }
  catch (e) { console.log(`  ${path}: skip (${e.code})`); continue; }

  let changes = 0;
  const fixed = src.replace(/font-size="(\d+)"/g, (m, n) => {
    const old = parseInt(n, 10);
    const next = snap(old);
    if (next !== old) { changes++; return `font-size="${next}"`; }
    return m;
  });

  if (changes > 0) {
    writeFileSync(path, fixed);
    console.log(`  ${path}: ${changes} font-size attrs bumped`);
    total += changes;
  } else {
    console.log(`  ${path}: no changes`);
  }
}

console.log(`\nTotal: ${total} font-size attributes standardized.`);
