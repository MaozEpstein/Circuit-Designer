// DFT ATPG — Automatic Test Pattern Generation.
//
// Inverse of FaultSimulator: given a single fault, produce a primary-
// input vector that detects it (causes some OUTPUT to differ between
// the golden and faulty runs). Uses the existing SimulationEngine as
// the implication oracle — no separate fault-aware engine required.
//
// Two-tier strategy, picked by primary-input count N:
//   • N ≤ 16  → exhaustive sweep over 2^N. If no vector detects, the
//               fault is provably redundant under combinational logic.
//   • N >  16 → bounded random sampling (RANDOM_TRIES tries). On miss,
//               we don't claim redundancy — only "search exhausted".
//
// Educational stance — the goal is to show the user the *shape* of
// ATPG (fault → targeted vector), not to ship a TetraMAX-grade engine.
// A full PODEM/D-algorithm implementation needs 9-value logic, a
// D-frontier walk, and backtrace heuristics — overkill for the
// ≤ 20-PI scenes this demo serves.

import { evaluate } from '../engine/SimulationEngine.js';

const EXHAUSTIVE_MAX_PI = 16;
const RANDOM_TRIES      = 2000;

function parseFaultId(faultId) {
  const slash = faultId.lastIndexOf('/');
  if (slash < 0) return null;
  const kind = faultId.slice(slash + 1);
  if (kind !== 'sa0' && kind !== 'sa1' && kind !== 'open') return null;
  return { wireId: faultId.slice(0, slash), kind };
}

function injectFault(wire, kind) {
  if (kind === 'sa0')  wire.stuckAt = 0;
  else if (kind === 'sa1') wire.stuckAt = 1;
  else if (kind === 'open') wire.open = true;
}

/**
 * Generate a primary-input vector that detects a single wire-level fault.
 *
 * @param {object[]} nodes
 * @param {object[]} wires
 * @param {string}   faultId   e.g. "wire-7/sa0"
 * @param {object}   [opts]
 * @param {number}   [opts.randomTries]  override RANDOM_TRIES
 * @returns {{
 *   success: boolean,
 *   vector?: number[],                   // length = #primary inputs
 *   method?: 'exhaustive' | 'random',
 *   tries?: number,
 *   reason?: 'bad-fault-id' | 'wire-not-found' | 'no-primary-inputs'
 *          | 'no-primary-outputs' | 'redundant' | 'search-exhausted',
 * }}
 */
export function generateATPGVector(nodes, wires, faultId, opts = {}) {
  const parsed = parseFaultId(faultId);
  if (!parsed) return { success: false, reason: 'bad-fault-id' };

  const wire = wires.find(w => w.id === parsed.wireId);
  if (!wire) return { success: false, reason: 'wire-not-found' };

  const primaryInputs = nodes.filter(n => n.type === 'INPUT')
    .slice().sort((a, b) => (a.id || '').localeCompare(b.id || ''));
  const primaryOutputs = nodes.filter(n => n.type === 'OUTPUT')
    .slice().sort((a, b) => (a.id || '').localeCompare(b.id || ''));

  if (primaryInputs.length === 0)  return { success: false, reason: 'no-primary-inputs'  };
  if (primaryOutputs.length === 0) return { success: false, reason: 'no-primary-outputs' };

  const N = primaryInputs.length;

  // Pre-compute the wire→OUTPUT inbound map so readOutputs is O(P).
  const inboundByOut = primaryOutputs.map(o => wires.find(w => w.targetId === o.id) || null);
  const readOutputs = (result) => inboundByOut.map(w => w ? result.wireValues.get(w.id) : null);

  const applyVector = (vec) => {
    const restore = primaryInputs.map(n => ({ n, prev: n.fixedValue }));
    primaryInputs.forEach((n, i) => { n.fixedValue = vec[i] ?? 0; });
    return () => restore.forEach(({ n, prev }) => { n.fixedValue = prev; });
  };

  // Snapshot pre-existing injection so we can restore it.
  const orig = { stuckAt: wire.stuckAt ?? null, open: !!wire.open };

  // One detection probe: golden eval, then faulty eval (with target
  // fault injected on `wire`), compare every primary output.
  const detects = (vec) => {
    const restorePI1 = applyVector(vec);
    // Golden — make sure no fault is on this wire for the reference run.
    wire.stuckAt = null; wire.open = false;
    const goldR = evaluate(nodes, wires, new Map(), 0);
    const goldOut = readOutputs(goldR);
    restorePI1();

    // Faulty.
    wire.stuckAt = null; wire.open = false;
    injectFault(wire, parsed.kind);
    const restorePI2 = applyVector(vec);
    const faultR = evaluate(nodes, wires, new Map(), 0);
    const faultOut = readOutputs(faultR);
    restorePI2();

    for (let i = 0; i < goldOut.length; i++) {
      if (goldOut[i] !== faultOut[i]) return true;
    }
    return false;
  };

  let result;
  try {
    if (N <= EXHAUSTIVE_MAX_PI) {
      const total = 1 << N;
      for (let i = 0; i < total; i++) {
        const vec = new Array(N);
        for (let b = 0; b < N; b++) vec[b] = (i >> b) & 1;
        if (detects(vec)) {
          result = { success: true, vector: vec, method: 'exhaustive', tries: i + 1 };
          break;
        }
      }
      if (!result) {
        result = { success: false, reason: 'redundant', method: 'exhaustive', tries: total };
      }
    } else {
      const tries = opts.randomTries || RANDOM_TRIES;
      for (let i = 0; i < tries; i++) {
        const vec = new Array(N);
        for (let b = 0; b < N; b++) vec[b] = Math.random() < 0.5 ? 0 : 1;
        if (detects(vec)) {
          result = { success: true, vector: vec, method: 'random', tries: i + 1 };
          break;
        }
      }
      if (!result) {
        result = { success: false, reason: 'search-exhausted', method: 'random', tries };
      }
    }
  } finally {
    // Always restore the wire's pre-call fault state.
    wire.stuckAt = orig.stuckAt;
    wire.open    = orig.open;
  }
  return result;
}

/**
 * Run ATPG for every undetected fault in a prior FaultSimulator result.
 * Returns the set of new vectors plus a per-fault verdict so the caller
 * can surface "X detected, Y proven redundant, Z search-exhausted".
 *
 * @param {object[]} nodes
 * @param {object[]} wires
 * @param {object}   lastSim   prior simulateFaults() result
 * @returns {{
 *   added:      Array<{ faultId: string, vector: number[], method: string }>,
 *   redundant:  string[],     // faultIds proven untestable (exhaustive miss)
 *   exhausted:  string[],     // faultIds where random search ran out
 *   bad:        string[],     // misc failures (wire missing, etc.)
 * }}
 */
export function generateATPGForUndetected(nodes, wires, lastSim) {
  const out = { added: [], redundant: [], exhausted: [], bad: [] };
  if (!lastSim || !Array.isArray(lastSim.perFault)) return out;
  const undet = lastSim.perFault.filter(f => !f.detected);
  for (const f of undet) {
    const r = generateATPGVector(nodes, wires, f.id);
    if (r.success) {
      out.added.push({ faultId: f.id, vector: r.vector, method: r.method });
    } else if (r.reason === 'redundant') {
      out.redundant.push(f.id);
    } else if (r.reason === 'search-exhausted') {
      out.exhausted.push(f.id);
    } else {
      out.bad.push(f.id);
    }
  }
  return out;
}
