// DFT Test Patterns — pure generators.
//
// Two families:
//   • RAM patterns — produce an ordered list of {op:'write'|'read',addr,
//     data,expected} for a given (addrBits, dataBits). Consumed by
//     MemoryTestRunner.js — no engine calls here.
//   • Wire patterns — produce vectors[] for primary-input assignment,
//     same shape FaultSimulator and the DFT panel already consume.
//
// Each pattern is a pure function: (params) → { id, name, description, ops|generate }.
// Stateless and serialisable — safe to call from the panel, tests, or
// future tooling without side effects.

// ── helpers ─────────────────────────────────────────────────────
function _mask(bits) {
  if (bits >= 32) return Math.pow(2, bits) - 1;
  return (1 << bits) - 1;
}

// Build the canonical checkerboard byte for `dataBits` width:
// dataBits=4 → 0b1010 (0xA); dataBits=8 → 0b10101010 (0xAA); etc.
// MSB convention — bit (dataBits-1) is 1, alternating down.
function _checkerByte(dataBits, oddFirst = false) {
  const mask = _mask(dataBits);
  let v = 0;
  for (let b = 0; b < dataBits; b++) {
    // For oddFirst=false (the "0xA" polarity), bits at ODD positions are 1.
    if (((b & 1) === 1) !== oddFirst) v |= (1 << b);
  }
  return v & mask;
}

// ─────────────────────────────────────────────────────────────────
//   RAM PATTERNS
// ─────────────────────────────────────────────────────────────────

// Sanity baseline: write 0 to all, read 0 from all. Catches whole-word
// stuck-at-1 faults; misses stuck-at-0 and all coupling/decoder issues.
function allZero(addrBits, dataBits) {
  const cells = 1 << addrBits;
  const ops = [];
  for (let a = 0; a < cells; a++) ops.push({ op: 'write', addr: a, data: 0 });
  for (let a = 0; a < cells; a++) ops.push({ op: 'read',  addr: a, expected: 0 });
  return {
    id: 'allZero', name: 'All-zero',
    description: 'Write 0 to every cell, then read back. Catches stuck-at-1 cells; misses everything else. Use as a sanity baseline.',
    ops,
  };
}

// Mirror baseline for stuck-at-0.
function allOne(addrBits, dataBits) {
  const cells = 1 << addrBits;
  const allOnes = _mask(dataBits);
  const ops = [];
  for (let a = 0; a < cells; a++) ops.push({ op: 'write', addr: a, data: allOnes });
  for (let a = 0; a < cells; a++) ops.push({ op: 'read',  addr: a, expected: allOnes });
  return {
    id: 'allOne', name: 'All-one',
    description: 'Write all-ones to every cell, then read back. Catches stuck-at-0 cells.',
    ops,
  };
}

// Alternating pattern across cells. Even addresses store 0xAA…A, odd
// store 0x55…5 (or reversed in inverseCheckerboard). Catches stuck-at
// faults on both polarities + per-bit shorts between cells.
function checkerboard(addrBits, dataBits) {
  const cells = 1 << addrBits;
  const even  = _checkerByte(dataBits, false);
  const odd   = _checkerByte(dataBits, true);
  const ops = [];
  for (let a = 0; a < cells; a++) ops.push({ op: 'write', addr: a, data: (a & 1) ? odd : even });
  for (let a = 0; a < cells; a++) ops.push({ op: 'read',  addr: a, expected: (a & 1) ? odd : even });
  return {
    id: 'checkerboard', name: 'Checkerboard',
    description: 'Alternating 0xAA / 0x55 pattern across cells. Catches stuck-at faults on either polarity, plus simple bit-line and word-line shorts between neighbouring cells.',
    ops,
  };
}

function inverseCheckerboard(addrBits, dataBits) {
  const base = checkerboard(addrBits, dataBits);
  // Swap polarities: each write/read flips its data within the dataBits mask.
  const allOnes = _mask(dataBits);
  const flipped = base.ops.map(o => {
    if (o.op === 'write') return { ...o, data: o.data ^ allOnes };
    return { ...o, expected: o.expected ^ allOnes };
  });
  return {
    id: 'inverseCheckerboard', name: 'Inverse Checkerboard',
    description: 'Checkerboard with polarities flipped. Run as a follow-up to standard Checkerboard to catch faults whose effect is polarity-asymmetric.',
    ops: flipped,
  };
}

// Walking-1: one cell holds all-ones while every other cell holds 0.
// The "1" walks through every address. Cross-reads after each walk-step
// confirm the address decoder is unique (a misrouted write would also
// flip a neighbour). 2N + N(N+1) ops total.
function walkingOne(addrBits, dataBits) {
  const cells = 1 << addrBits;
  const allOnes = _mask(dataBits);
  const ops = [];
  // Init all to 0.
  for (let a = 0; a < cells; a++) ops.push({ op: 'write', addr: a, data: 0 });
  // Walk a single all-ones cell through the array.
  for (let c = 0; c < cells; c++) {
    ops.push({ op: 'write', addr: c, data: allOnes });
    ops.push({ op: 'read',  addr: c, expected: allOnes });
    for (let other = 0; other < cells; other++) {
      if (other === c) continue;
      ops.push({ op: 'read', addr: other, expected: 0 });
    }
    ops.push({ op: 'write', addr: c, data: 0 });
  }
  return {
    id: 'walkingOne', name: 'Walking-1',
    description: 'A single all-ones cell walks through every address; all others hold 0. Cross-reads verify decoder uniqueness and word-line isolation. Best at catching coupling faults and address-decoder bugs.',
    ops,
  };
}

// Inverse: a single 0 cell walks; everything else holds all-ones.
function walkingZero(addrBits, dataBits) {
  const cells = 1 << addrBits;
  const allOnes = _mask(dataBits);
  const ops = [];
  for (let a = 0; a < cells; a++) ops.push({ op: 'write', addr: a, data: allOnes });
  for (let c = 0; c < cells; c++) {
    ops.push({ op: 'write', addr: c, data: 0 });
    ops.push({ op: 'read',  addr: c, expected: 0 });
    for (let other = 0; other < cells; other++) {
      if (other === c) continue;
      ops.push({ op: 'read', addr: other, expected: allOnes });
    }
    ops.push({ op: 'write', addr: c, data: allOnes });
  }
  return {
    id: 'walkingZero', name: 'Walking-0',
    description: 'A single 0 cell walks through every address; all others hold all-ones. Mirror of Walking-1 for the opposite polarity.',
    ops,
  };
}

// Address-as-data: cell A stores A (truncated to dataBits). Reading
// back any value other than A means the decoder routed to the wrong
// cell. Cheapest test for decoder uniqueness — 2N ops.
function addressAsData(addrBits, dataBits) {
  const cells = 1 << addrBits;
  const dmask = _mask(dataBits);
  const ops = [];
  for (let a = 0; a < cells; a++) ops.push({ op: 'write', addr: a, data: a & dmask });
  for (let a = 0; a < cells; a++) ops.push({ op: 'read',  addr: a, expected: a & dmask });
  return {
    id: 'addressAsData', name: 'Address-as-data',
    description: 'Each address A stores its own value A. A misrouted read returns the wrong A, exposing address-decoder faults. Cheap (2N ops) and effective.',
    ops,
  };
}

// Ordered catalogue, used by the panel dropdown. Order = recommended
// run order from quickest baseline to most exhaustive.
export const RAM_PATTERNS = [
  { id: 'allZero',             label: 'All-zero',              generate: allZero },
  { id: 'allOne',              label: 'All-one',               generate: allOne },
  { id: 'checkerboard',        label: 'Checkerboard',          generate: checkerboard },
  { id: 'inverseCheckerboard', label: 'Inverse Checkerboard',  generate: inverseCheckerboard },
  { id: 'addressAsData',       label: 'Address-as-data',       generate: addressAsData },
  { id: 'walkingOne',          label: 'Walking-1',             generate: walkingOne },
  { id: 'walkingZero',         label: 'Walking-0',             generate: walkingZero },
];

export function getRamPattern(id, addrBits, dataBits) {
  const entry = RAM_PATTERNS.find(p => p.id === id);
  if (!entry) return null;
  return entry.generate(addrBits, dataBits);
}

// ─────────────────────────────────────────────────────────────────
//   WIRE PATTERNS  (Phase 2 — populated by the next phase)
// ─────────────────────────────────────────────────────────────────
//
// Each entry: { id, label, description, generate(piCount[, opts]) → vectors[] }
// where vectors[i] is an array of length piCount of 0/1 values.

function _random(piCount, N = 16) {
  return Array.from({ length: N }, () =>
    Array.from({ length: piCount }, () => Math.random() < 0.5 ? 0 : 1));
}

function _walkingOnePI(piCount) {
  const out = [Array(piCount).fill(0)];
  for (let b = 0; b < piCount; b++) {
    const v = Array(piCount).fill(0); v[b] = 1; out.push(v);
  }
  return out;
}

function _walkingZeroPI(piCount) {
  const out = [Array(piCount).fill(1)];
  for (let b = 0; b < piCount; b++) {
    const v = Array(piCount).fill(1); v[b] = 0; out.push(v);
  }
  return out;
}

function _exhaustivePI(piCount) {
  const total = 1 << piCount;
  return Array.from({ length: total }, (_, i) =>
    Array.from({ length: piCount }, (_, b) => (i >> b) & 1));
}

function _toggleAllPI(piCount) {
  return [Array(piCount).fill(0), Array(piCount).fill(1)];
}

function _defaultSweepPI(piCount) {
  const allZero = Array(piCount).fill(0);
  const allOne  = Array(piCount).fill(1);
  const walking = Array.from({ length: piCount }, (_, i) => {
    const v = Array(piCount).fill(0); v[i] = 1; return v;
  });
  return [allZero, allOne, ...walking];
}

export const WIRE_PATTERNS = [
  { id: 'random',        label: 'Random N=16',
    description: '16 random vectors. Honest baseline — production flow uses ATPG to target each fault.',
    generate: (pi) => _random(pi, 16) },
  { id: 'toggleAll',     label: 'Toggle-all-wires',
    description: 'All-zero followed by all-ones. The minimum stimulus that drives every PI through both polarities.',
    generate: _toggleAllPI },
  { id: 'walkingOne',    label: 'Walking-1',
    description: 'All-zero, then one PI = 1 at a time. Isolates per-input observability — useful for diagnosis.',
    generate: _walkingOnePI },
  { id: 'walkingZero',   label: 'Walking-0',
    description: 'All-one, then one PI = 0 at a time. Mirror of Walking-1.',
    generate: _walkingZeroPI },
  { id: 'defaultSweep',  label: 'Default sweep',
    description: 'All-zero, all-one, then walking-1 (default fallback). Modest coverage, always-available.',
    generate: _defaultSweepPI },
  { id: 'exhaustive',    label: 'Exhaustive (≤14 PIs)',
    description: 'Every 2^N input combination. Complete combinational coverage. Disabled when piCount > 14 (16384+ vectors).',
    generate: _exhaustivePI,
    maxPI: 14 },
];

export function getWirePattern(id, piCount) {
  const entry = WIRE_PATTERNS.find(p => p.id === id);
  if (!entry) return null;
  if (entry.maxPI && piCount > entry.maxPI) return null;
  return { id: entry.id, label: entry.label, vectors: entry.generate(piCount) };
}
