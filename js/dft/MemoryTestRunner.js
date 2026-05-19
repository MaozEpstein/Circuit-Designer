// DFT MemoryTestRunner — standalone RAM test executor.
//
// Walks a generated pattern (from TestPatterns.js) against a RAM node
// without requiring an MBIST_CONTROLLER on the canvas. Applies cell
// faults via the same algorithm the simulation engine uses, so an
// injected fault on a cell produces the same observable as it would
// under a March C− run.
//
// Non-destructive: the run snapshots `ram.memory` at start and restores
// it at the end, mirroring how FaultSimulator handles `wire.stuckAt`.
// This lets the user re-run patterns repeatedly without polluting any
// values that other parts of the simulation (or another pattern) might
// have stashed there.
//
// Mirrors the cell-fault application from SimulationEngine.js:273-282.

function _mask(bits) {
  if (bits >= 32) return Math.pow(2, bits) - 1;
  return (1 << bits) - 1;
}

// Apply per-cell stuck-at fault. Identical semantics to
// SimulationEngine._applyCellFault (kept in sync intentionally — see
// the corresponding code in the engine for the canonical version).
function _applyCellFault(cellFaults, addr, val, dataBits) {
  const cf = cellFaults && cellFaults[addr];
  if (!cf) return val;
  const mask = _mask(dataBits);
  if (cf.bit == null) {
    return (cf.stuckAt ? mask : 0) & mask;
  }
  const bm = (1 << cf.bit) & mask;
  return cf.stuckAt ? ((val | bm) & mask) : ((val & ~bm) & mask);
}

// Find the first bit position where expected and observed differ
// within the dataBits mask. Returns -1 when equal. null = unknown bit
// (multi-bit divergence on a whole-word fault).
function _firstMismatchBit(expected, observed, dataBits) {
  const diff = (expected ^ observed) & _mask(dataBits);
  if (!diff) return -1;
  for (let b = 0; b < dataBits; b++) if ((diff >> b) & 1) return b;
  return -1;
}

/**
 * Run a memory test pattern against a RAM node.
 *
 * @param {object} ram      — node with type='RAM' (uses addrBits, dataBits,
 *                            cellFaults; memory is snapshot+restored).
 * @param {object} pattern  — from TestPatterns.RAM_PATTERNS or getRamPattern().
 *                            Shape: { id, name, description, ops: Op[] }.
 * @returns {{
 *   passed: boolean,
 *   patternId: string,
 *   patternName: string,
 *   steps: number,
 *   reads: number,
 *   writes: number,
 *   firstFail: null | {
 *     stepIdx: number, addr: number, bit: number | null,
 *     expected: number, observed: number,
 *   },
 *   trace: Array<{ op, addr, data?: number, expected?: number,
 *                  observed?: number, isFail?: boolean }>,
 * }}
 */
export function runMemoryTest(ram, pattern) {
  if (!ram || ram.type !== 'RAM') {
    throw new Error('runMemoryTest: ram must be a RAM node');
  }
  if (!pattern || !Array.isArray(pattern.ops)) {
    throw new Error('runMemoryTest: pattern.ops must be an array');
  }
  const addrBits = Math.max(1, (ram.addrBits | 0) || 4);
  const dataBits = Math.max(1, (ram.dataBits | 0) || 8);
  const cells    = 1 << addrBits;
  const dmask    = _mask(dataBits);
  const cellFaults = ram.cellFaults || null;

  // Working snapshot of the storage. Apply fault on read AND write
  // paths — fault is storage-transparent and order-resilient.
  const memOrig = ram.memory ? { ...ram.memory } : {};
  const mem     = { ...memOrig };

  const trace = [];
  let reads = 0, writes = 0;
  let firstFail = null;
  let stepIdx = -1;

  try {
    for (const rawOp of pattern.ops) {
      stepIdx++;
      const addr = (rawOp.addr | 0) & (cells - 1);

      if (rawOp.op === 'write') {
        const wValRaw = (rawOp.data | 0) & dmask;
        const wValOut = _applyCellFault(cellFaults, addr, wValRaw, dataBits);
        mem[addr] = wValOut;
        writes++;
        trace.push({ op: 'write', addr, data: wValRaw, observed: wValOut });
        continue;
      }

      if (rawOp.op === 'read') {
        const stored   = (mem[addr] !== undefined) ? mem[addr] : 0;
        const observed = _applyCellFault(cellFaults, addr, stored & dmask, dataBits);
        const expected = (rawOp.expected | 0) & dmask;
        reads++;
        const isFail = (observed !== expected);
        trace.push({ op: 'read', addr, expected, observed, isFail });
        if (isFail && firstFail === null) {
          // Whole-word fault? The mismatch is on every bit — report null.
          // Single-bit fault? Pin the differing bit.
          const cf  = cellFaults && cellFaults[addr];
          const bit = cf ? (cf.bit == null ? null : cf.bit)
                         : _firstMismatchBit(expected, observed, dataBits);
          firstFail = { stepIdx, addr, bit: bit === -1 ? null : bit,
                        expected, observed };
        }
        continue;
      }
      // Unknown op — record but don't fail.
      trace.push({ op: rawOp.op, addr, note: 'unknown-op' });
    }
  } finally {
    // No mutation persists — the original memory map is untouched.
    // (We only mutated the local `mem` snapshot; `ram.memory` was
    // never written. This is included only for symmetry with the
    // try/finally pattern used elsewhere in the DFT layer.)
  }

  return {
    passed: firstFail === null,
    patternId:   pattern.id || 'custom',
    patternName: pattern.name || pattern.id || 'custom',
    steps: trace.length,
    reads, writes,
    firstFail,
    trace,
  };
}
