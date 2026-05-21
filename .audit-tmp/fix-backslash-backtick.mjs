// Replace stray `\\\`` (4 source chars) with `\\` ` (2 source chars)
// across IQ/timing-cdc/index.js. The 4-char pattern shows up as
// visible backslashes in the rendered markdown; the 2-char form
// renders as proper inline code.
import { readFileSync, writeFileSync } from 'node:fs';

const paths = ['IQ/timing-cdc/index.js', 'IQ/dft/index.js'];
const BAD = '\\\\\\`';   // source: 4 chars  \ \ \ `
const GOOD = '\\`';      // source: 2 chars  \ `

for (const path of paths) {
  const src = readFileSync(path, 'utf8');
  const parts = src.split(BAD);
  const occurrences = parts.length - 1;
  const fixed = parts.join(GOOD);
  writeFileSync(path, fixed);
  console.log(`  ${path}: replaced ${occurrences} occurrences`);
}
