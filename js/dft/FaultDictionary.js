// DFT Fault Dictionary — diagnosis ranker.
//
// "Given an observed output mismatch, which wire-level fault best
// explains it?" Inverts the FaultSimulator output: the simulator
// answers "for each fault, which vectors detect it?"; this module
// answers "for a given detection signature, which fault is it?"
//
// Algorithm:
//   1. Build a dictionary from a prior simulateFaults() result. Each
//      fault gets a signature string of length |vectors|, with bit i
//      set iff vector i detects that fault.
//   2. Build the observed signature by running each vector against the
//      *current* (possibly injected) scene and recording where the
//      output disagrees with the dictionary's golden run.
//   3. Score each fault by Hamming similarity: matches − mismatches,
//      normalised to [0..1]. Top-K returned, ties broken alphabetically.
//
// This is "single-fault diagnosis". It assumes one fault is active. If
// two faults are active their combined signature usually still ranks
// at least one of them in the top-K, but the score is degraded.

import { evaluate } from '../engine/SimulationEngine.js';

/**
 * Build a fault → detection-signature map from a simulateFaults result.
 *
 * @param {object} lastSim   prior simulateFaults() result
 * @returns {Map<string, string>}   faultId → signature string of '0'/'1'
 *                                  of length lastSim.golden.length
 */
export function buildDictionary(lastSim) {
  const dict = new Map();
  if (!lastSim || !Array.isArray(lastSim.perFault)) return dict;
  const totalVectors = lastSim.golden?.length || 0;
  for (const f of lastSim.perFault) {
    const bits = new Array(totalVectors).fill('0');
    for (const vi of f.detectedBy || []) {
      if (vi >= 0 && vi < totalVectors) bits[vi] = '1';
    }
    dict.set(f.id, bits.join(''));
  }
  return dict;
}

/**
 * Run every vector against the current scene (with whatever faults are
 * presently injected) and build an "observed signature": bit i = 1 iff
 * vector i produces a primary-output value that differs from the
 * dictionary's golden run.
 *
 * @param {object[]} nodes
 * @param {object[]} wires
 * @param {object}   lastSim    prior simulateFaults() result (for golden + vectors)
 * @returns {{ signature: string, mismatchCount: number }}
 */
export function observeSignature(nodes, wires, lastSim) {
  if (!lastSim || !Array.isArray(lastSim._vectors) || !Array.isArray(lastSim.golden)) {
    return { signature: '', mismatchCount: 0 };
  }
  const vectors = lastSim._vectors;
  const golden  = lastSim.golden;
  const primaryInputs = nodes.filter(n => n.type === 'INPUT')
    .slice().sort((a, b) => (a.id || '').localeCompare(b.id || ''));
  const primaryOutputs = nodes.filter(n => n.type === 'OUTPUT')
    .slice().sort((a, b) => (a.id || '').localeCompare(b.id || ''));
  const inbound = primaryOutputs.map(o => wires.find(w => w.targetId === o.id) || null);

  const applyVector = (vec) => {
    const restore = primaryInputs.map(n => ({ n, prev: n.fixedValue }));
    primaryInputs.forEach((n, i) => { n.fixedValue = vec[i] ?? 0; });
    return () => restore.forEach(({ n, prev }) => { n.fixedValue = prev; });
  };
  const readOutputs = (r) => inbound.map(w => w ? r.wireValues.get(w.id) : null);

  let mismatch = 0;
  const bits = vectors.map((vec, vi) => {
    const restore = applyVector(vec);
    const r = evaluate(nodes, wires, new Map(), 0);
    const out = readOutputs(r);
    restore();
    const ref = golden[vi] || [];
    for (let i = 0; i < out.length; i++) {
      if (out[i] !== ref[i]) { mismatch++; return '1'; }
    }
    return '0';
  });
  return { signature: bits.join(''), mismatchCount: mismatch };
}

/**
 * Rank fault candidates by similarity to an observed signature.
 *
 * @param {Map<string,string>} dictionary   faultId → signature
 * @param {string}             observed     signature string ('0'/'1')
 * @param {object}             [opts]
 * @param {number}             [opts.topK]  number of suspects to return (default 5)
 * @returns {Array<{
 *   faultId: string,
 *   score: number,        // 0..1, higher = better fit (Jaccard-ish)
 *   exact: boolean,       // signature exactly matches observed
 *   matches: number,      // vectors where dictionary & observed agree (both 1 or both 0)
 *   matches1: number,     // vectors where both = 1 (a "true positive")
 *   mismatches: number,
 *   total: number,
 * }>}
 */
export function diagnose(dictionary, observed, opts = {}) {
  const topK = opts.topK || 5;
  if (!observed || dictionary.size === 0) return [];
  const N = observed.length;

  const ranked = [];
  for (const [faultId, sig] of dictionary) {
    if (sig.length !== N) continue;        // can't compare different sets

    // True-positive count (both '1') is the strongest evidence — random
    // noise rarely lines up on '1's. Pure Hamming similarity would
    // count both-zero agreements which inflates trivially.
    let m1 = 0, m0 = 0, mm = 0;
    for (let i = 0; i < N; i++) {
      const a = sig[i] === '1';
      const b = observed[i] === '1';
      if (a && b)        m1++;
      else if (!a && !b) m0++;
      else               mm++;
    }
    // If observed has zero detections (no fault yet active), nothing
    // to diagnose — give every fault score 0 so the panel shows the
    // "nothing to diagnose" state.
    const obsOnes = m1 + (observed.split('').filter(c => c === '1').length - m1);
    // Score = (matches - mismatches) / total, with weight on
    // both-detected agreements. Empirically ranks single-fault cases
    // first. Range [-1..1] then clamped to [0..1].
    let score;
    if (obsOnes === 0) {
      // No observed mismatch → only the "no-effect" faults score 1.
      score = (m1 === 0 && mm === 0) ? 1 : 0;
    } else {
      // Jaccard-like: |intersection| / |union|.
      const sigOnes = sig.split('').filter(c => c === '1').length;
      const union   = sigOnes + obsOnes - m1;
      score = union === 0 ? 0 : (m1 / union);
    }
    const exact = sig === observed;
    ranked.push({
      faultId, score, exact,
      matches: m1 + m0, matches1: m1, mismatches: mm, total: N,
    });
  }
  // Sort by score desc, then exact first, then faultId asc.
  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.exact !== a.exact) return b.exact ? 1 : -1;
    return a.faultId.localeCompare(b.faultId);
  });
  return ranked.slice(0, topK);
}

/**
 * Convenience: end-to-end diagnosis from a prior simulateFaults result.
 * Builds dict, observes signature, returns top-K + the signature itself.
 *
 * @returns {{
 *   suspects: ReturnType<typeof diagnose>,
 *   observed: string,
 *   mismatchCount: number,
 *   totalVectors: number,
 * }}
 */
export function diagnoseScene(nodes, wires, lastSim, opts = {}) {
  const dict = buildDictionary(lastSim);
  const { signature, mismatchCount } = observeSignature(nodes, wires, lastSim);
  return {
    suspects: diagnose(dict, signature, opts),
    observed: signature,
    mismatchCount,
    totalVectors: signature.length,
  };
}
