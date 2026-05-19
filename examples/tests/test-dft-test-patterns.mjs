// DFT TestPatterns — wire-pattern generators.
//
// Verifies:
//   1. Each generator returns vectors of correct length and shape.
//   2. Specific generators produce expected vector sets.
//   3. exhaustive's PI cap is enforced (getWirePattern returns null).
//
// Run:  node examples/tests/test-dft-test-patterns.mjs

import { WIRE_PATTERNS, getWirePattern } from '../../js/dft/TestPatterns.js';

let failed = 0;
function check(label, cond, detail = '') {
  const mark = cond ? 'PASS' : 'FAIL';
  if (!cond) failed++;
  console.log(`  [${mark}] ${label}${detail ? ' — ' + detail : ''}`);
}

console.log('\n-- DFT Wire Patterns --');

// ── 1. Catalogue sanity ──────────────────────────────────────
{
  check('WIRE_PATTERNS exposes 6 entries', WIRE_PATTERNS.length === 6);
  const ids = WIRE_PATTERNS.map(p => p.id);
  const expected = ['random','toggleAll','walkingOne','walkingZero','defaultSweep','exhaustive'];
  check('Catalogue ids in expected order',
        ids.join(',') === expected.join(','), `got: ${ids.join(',')}`);
  for (const p of WIRE_PATTERNS) {
    check(`${p.id} has label + description + generate`,
          typeof p.label === 'string' && typeof p.description === 'string'
          && typeof p.generate === 'function');
  }
}

// ── 2. random ────────────────────────────────────────────────
{
  const r = getWirePattern('random', 4);
  check('random returns 16 vectors of length 4',
        r.vectors.length === 16 && r.vectors.every(v => v.length === 4));
  check('random vector cells are 0 or 1',
        r.vectors.every(v => v.every(b => b === 0 || b === 1)));
}

// ── 3. toggleAll → 2 vectors: all-0 + all-1 ──────────────────
{
  const r = getWirePattern('toggleAll', 4);
  check('toggleAll(4) returns exactly 2 vectors', r.vectors.length === 2);
  check('toggleAll v0 = all-zero', r.vectors[0].every(b => b === 0));
  check('toggleAll v1 = all-one',  r.vectors[1].every(b => b === 1));
}

// ── 4. walkingOne(4) → 5 vectors ─────────────────────────────
{
  const r = getWirePattern('walkingOne', 4);
  check('walkingOne(4) returns exactly 5 vectors',
        r.vectors.length === 5, `got ${r.vectors.length}`);
  check('walkingOne v0 = all-zero', r.vectors[0].every(b => b === 0));
  // v1..v4: one bit at position 0..3 is 1.
  for (let i = 0; i < 4; i++) {
    const v = r.vectors[i + 1];
    const ones = v.filter(b => b === 1).length;
    check(`walkingOne v${i + 1}: exactly one '1' at position ${i}`,
          ones === 1 && v[i] === 1);
  }
}

// ── 5. walkingZero(4) → 5 vectors ────────────────────────────
{
  const r = getWirePattern('walkingZero', 4);
  check('walkingZero(4) returns exactly 5 vectors', r.vectors.length === 5);
  check('walkingZero v0 = all-one', r.vectors[0].every(b => b === 1));
  for (let i = 0; i < 4; i++) {
    const v = r.vectors[i + 1];
    const zeros = v.filter(b => b === 0).length;
    check(`walkingZero v${i + 1}: exactly one '0' at position ${i}`,
          zeros === 1 && v[i] === 0);
  }
}

// ── 6. exhaustive(3) → 8 vectors ─────────────────────────────
{
  const r = getWirePattern('exhaustive', 3);
  check('exhaustive(3) returns 8 vectors', r.vectors.length === 8);
  // Every truth-table corner exactly once.
  const sigs = new Set(r.vectors.map(v => v.join('')));
  check('exhaustive(3) covers all 8 unique combinations',
        sigs.size === 8);
}

// ── 7. exhaustive cap enforced ───────────────────────────────
{
  const r = getWirePattern('exhaustive', 15);
  check('exhaustive(15) past 14-PI cap → null',
        r === null, r ? `got ${r.vectors?.length} vectors` : '');
}

// ── 8. defaultSweep(3) shape ─────────────────────────────────
{
  const r = getWirePattern('defaultSweep', 3);
  // all-zero + all-one + 3 walking-1 = 5 vectors.
  check('defaultSweep(3) returns 5 vectors', r.vectors.length === 5);
  check('defaultSweep v0 = all-zero', r.vectors[0].every(b => b === 0));
  check('defaultSweep v1 = all-one',  r.vectors[1].every(b => b === 1));
}

// ── 9. Unknown pattern id → null ─────────────────────────────
{
  check('getWirePattern("bogus", 4) → null',
        getWirePattern('bogus', 4) === null);
}

console.log(`\n${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
process.exit(failed === 0 ? 0 : 1);
