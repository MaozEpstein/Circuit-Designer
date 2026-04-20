// Structural IR equality.
//
// Two IRModules are equal iff they produce byte-identical output from
// toVerilog. This is enforced by a canonical serialisation — we stringify
// the IR with a stable key order (omitting sourceRef and attributes, which
// do not affect emitted Verilog), then compare.

import { toVerilog } from './toVerilog.js';

const IGNORED_KEYS = new Set(['sourceRef', 'attributes', 'originalText', '_unmapped']);

function canonicalise(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(canonicalise);
  if (typeof value !== 'object') return value;
  const out = {};
  const keys = Object.keys(value).filter(k => !IGNORED_KEYS.has(k)).sort();
  for (const k of keys) out[k] = canonicalise(value[k]);
  return out;
}

export function equals(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return JSON.stringify(canonicalise(a)) === JSON.stringify(canonicalise(b));
}

// Stronger check: same Verilog output. Preferred for round-trip tests once
// a parser exists; before that, structural equals is sufficient.
export function equalsByVerilog(a, b) {
  return toVerilog(a) === toVerilog(b);
}
