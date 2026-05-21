// DFT Fault Simulator (combinational).
//
// Given a scene + a list of test vectors, the simulator iterates every
// candidate wire-level fault (every wire × {s-a-0, s-a-1, open}) and
// determines, for each fault, which vectors detect it (cause an OUTPUT
// value to differ from the fault-free "golden" run).
//
// Layer 2 keeps the model simple and combinational:
//   - Primary inputs: every INPUT node, ordered by id (deterministic).
//   - Primary outputs: every OUTPUT node, ordered by id.
//   - A vector is one assignment to ALL primary inputs (array of 0/1
//     of length N where N = primaryInputs.length).
//   - A fault is detected by a vector if any primary output disagrees
//     with the golden run for that vector.
//
// This skirts ATPG entirely — the user provides the vectors, we score
// them. Random / targeted vector generation lives in Layer 2.5.
//
// Designed to be extensible to future fault models (bridging,
// transition) without touching the loop structure: just lengthen the
// faultModelsFor(wire) generator.

import { evaluate, resetTransitionState } from '../engine/SimulationEngine.js';

/**
 * Enumerate the candidate faults for a single wire under the active
 * fault models. Layer 2 ships stuck-at-0, stuck-at-1, and open by
 * default. Bridging is excluded from auto-enumeration because it
 * requires a partner wire — only manually-injected bridges are scored.
 *
 * @param {object} wire
 * @param {string[]} models  e.g. ['stuck-at-0', 'stuck-at-1', 'open']
 * @returns {Array<{ id: string, kind: string, mutate: (w) => void }>}
 */
function faultsForWire(wire, models) {
  const out = [];
  for (const m of models) {
    if (m === 'stuck-at-0') out.push({ id: `${wire.id}/sa0`, kind: 'sa0', mutate: w => { w.stuckAt = 0; } });
    if (m === 'stuck-at-1') out.push({ id: `${wire.id}/sa1`, kind: 'sa1', mutate: w => { w.stuckAt = 1; } });
    if (m === 'open')       out.push({ id: `${wire.id}/open`, kind: 'open', mutate: w => { w.open = true; } });
  }
  return out;
}

/**
 * Run the fault simulator.
 *
 * @param {object[]} nodes
 * @param {object[]} wires
 * @param {number[][]} vectors          Each vector: [primaryInputs.length] of 0/1
 * @param {object} [opts]
 * @param {string[]} [opts.models]      Fault models to enumerate per wire.
 *                                       Default: ['stuck-at-0','stuck-at-1','open'].
 * @returns {{
 *   primaryInputs: object[],
 *   primaryOutputs: object[],
 *   golden: any[][],                  // per-vector array of OUTPUT values
 *   perFault: Array<{ id, wireId, kind, detected: boolean, detectedBy: number[] }>,
 *   coverage: { detected: number, total: number, percent: number },
 * }}
 */
export function simulateFaults(nodes, wires, vectors, opts = {}) {
  const models = opts.models || ['stuck-at-0', 'stuck-at-1', 'open'];

  const primaryInputs  = nodes.filter(n => n.type === 'INPUT' ).slice().sort((a, b) => (a.id || '').localeCompare(b.id || ''));
  const primaryOutputs = nodes.filter(n => n.type === 'OUTPUT').slice().sort((a, b) => (a.id || '').localeCompare(b.id || ''));

  // Apply a vector to the scene by mutating each primary input's
  // fixedValue. Returns a function that restores the original values.
  const applyVector = (vec) => {
    const restore = primaryInputs.map(n => ({ n, prev: n.fixedValue }));
    primaryInputs.forEach((n, i) => { n.fixedValue = vec[i] ?? 0; });
    return () => restore.forEach(({ n, prev }) => { n.fixedValue = prev; });
  };

  // Read primary output values after one evaluate(). The wire feeding an
  // OUTPUT node is what we observe — read its wireValue (which already
  // honours stuck-at via the engine chokepoint).
  const readOutputs = (result) => {
    return primaryOutputs.map(o => {
      const inboundWire = wires.find(w => w.targetId === o.id);
      if (!inboundWire) return null;
      return result.wireValues.get(inboundWire.id);
    });
  };

  // ── 1. Golden run: no faults, one entry per vector ───────────
  const golden = vectors.map(vec => {
    const restore = applyVector(vec);
    const r = evaluate(nodes, wires, new Map(), 0);
    const out = readOutputs(r);
    restore();
    return out;
  });

  // ── 2. Iterate every fault candidate, compare against golden ─
  const perFault = [];
  for (const w of wires) {
    for (const f of faultsForWire(w, models)) {
      // Snapshot original wire fault state so we can restore.
      const orig = { stuckAt: w.stuckAt ?? null, open: !!w.open };
      // Clear pre-existing injected fault on this wire so the test
      // candidate is the only fault active.
      w.stuckAt = null; w.open = false;
      f.mutate(w);

      const detectedBy = [];
      for (let vi = 0; vi < vectors.length; vi++) {
        const restore = applyVector(vectors[vi]);
        const r = evaluate(nodes, wires, new Map(), 0);
        const out = readOutputs(r);
        restore();
        // Compare to golden[vi] — any output position differing flags
        // this vector as a detector.
        for (let oi = 0; oi < out.length; oi++) {
          if (out[oi] !== golden[vi][oi]) { detectedBy.push(vi); break; }
        }
      }

      // Restore the wire's pre-test state.
      w.stuckAt = orig.stuckAt;
      w.open    = orig.open;

      perFault.push({
        id:         f.id,
        wireId:     w.id,
        kind:       f.kind,
        detected:   detectedBy.length > 0,
        detectedBy,
      });
    }
  }

  const detected = perFault.filter(f => f.detected).length;
  const total    = perFault.length;
  const percent  = total === 0 ? 100 : Math.round((detected / total) * 100);

  return {
    primaryInputs,
    primaryOutputs,
    golden,
    perFault,
    coverage: { detected, total, percent },
  };
}

// ─────────────────────────────────────────────────────────────────
//   TRANSITION DELAY FAULTS  (slow-to-rise / slow-to-fall)
// ─────────────────────────────────────────────────────────────────
//
// Stateful fault model — depends on the wire's PREVIOUS stable value,
// not just its current one. Requires a 2-vector test: V1 establishes the
// prior state, V2 launches the transition. The engine's transition hook
// in _applyWireFault returns the prior value when the requested
// transition is the faulty direction (proxy for "didn't make it in
// time"). Capture is the result of evaluate() on V2.
//
// API is intentionally separate from simulateFaults(): the vector shape
// changes (pairs instead of single vectors), the per-fault state
// management is different, and the result fields document the pair
// semantics — folding both into one function would muddy the contract.

/**
 * Enumerate transition fault candidates for one wire. Wires that already
 * carry a value-overriding fault (open / stuck-at) are skipped because
 * the dominant fault would mask any transition behaviour.
 *
 * @param {object} wire
 * @param {string[]} models   subset of ['slow-to-rise', 'slow-to-fall']
 * @returns {Array<{ id: string, kind: 'str' | 'stf', mutate: (w) => void }>}
 */
function transitionFaultsForWire(wire, models) {
  if (wire.open || wire.stuckAt === 0 || wire.stuckAt === 1) return [];
  const out = [];
  if (models.includes('slow-to-rise')) {
    out.push({ id: `${wire.id}/str`, kind: 'str', mutate: w => { w.slowToRise = true; } });
  }
  if (models.includes('slow-to-fall')) {
    out.push({ id: `${wire.id}/stf`, kind: 'stf', mutate: w => { w.slowToFall = true; } });
  }
  return out;
}

/**
 * Run the transition fault simulator.
 *
 * @param {object[]}     nodes
 * @param {object[]}     wires
 * @param {number[][][]} vectorPairs   Array of [V1, V2] pairs. Each V is
 *                                     [primaryInputs.length] of 0/1.
 * @param {object}       [opts]
 * @param {string[]}     [opts.models] Subset of ['slow-to-rise','slow-to-fall'].
 *                                     Default: both.
 * @returns {{
 *   primaryInputs: object[],
 *   primaryOutputs: object[],
 *   golden: any[][],            // per-pair V2 outputs, no faults
 *   perFault: Array<{ id, wireId, kind: 'str'|'stf',
 *                     detected: boolean, detectedBy: number[] }>,
 *   coverage: { detected, total, percent },
 *   _pairs: number[][][],       // echo of vectorPairs (for diagnosis)
 * }}
 */
export function simulateTransitionFaults(nodes, wires, vectorPairs, opts = {}) {
  const models = opts.models || ['slow-to-rise', 'slow-to-fall'];

  const primaryInputs  = nodes.filter(n => n.type === 'INPUT' ).slice().sort((a, b) => (a.id || '').localeCompare(b.id || ''));
  const primaryOutputs = nodes.filter(n => n.type === 'OUTPUT').slice().sort((a, b) => (a.id || '').localeCompare(b.id || ''));

  const applyVector = (vec) => {
    const restore = primaryInputs.map(n => ({ n, prev: n.fixedValue }));
    primaryInputs.forEach((n, i) => { n.fixedValue = vec[i] ?? 0; });
    return () => restore.forEach(({ n, prev }) => { n.fixedValue = prev; });
  };

  const readOutputs = (result) => primaryOutputs.map(o => {
    const inboundWire = wires.find(w => w.targetId === o.id);
    if (!inboundWire) return null;
    return result.wireValues.get(inboundWire.id);
  });

  // Defensive — clear any leftover transition state from a prior live
  // simulation or fault run.
  resetTransitionState(wires);

  // ── 1. Golden run: NO faults. Per pair, V1 then V2; record V2 outs ─
  const golden = vectorPairs.map(([V1, V2]) => {
    resetTransitionState(wires);
    const r1 = applyVector(V1);
    evaluate(nodes, wires, new Map(), 0);
    r1();
    const r2 = applyVector(V2);
    const out = readOutputs(evaluate(nodes, wires, new Map(), 1));
    r2();
    return out;
  });

  // ── 2. Per-fault loop: V1 (clean) seeds prior state, fault armed for V2 ─
  const perFault = [];
  for (const w of wires) {
    for (const f of transitionFaultsForWire(w, models)) {
      const detectedBy = [];
      for (let pi = 0; pi < vectorPairs.length; pi++) {
        const [V1, V2] = vectorPairs[pi];
        resetTransitionState(wires);
        // V1 — fault NOT armed, so _currentValue settles to the honest
        // prior-state value. This becomes _lastStableValue at the start
        // of the V2 evaluate (the stepCount promotion fires).
        const r1 = applyVector(V1);
        evaluate(nodes, wires, new Map(), 0);
        r1();
        // V2 — arm the fault, then evaluate. The engine sees the prior
        // value and decides whether to return it (transition direction
        // matches) or let the new value through.
        f.mutate(w);
        const r2 = applyVector(V2);
        const out = readOutputs(evaluate(nodes, wires, new Map(), 1));
        r2();
        // Disarm before next pair / fault.
        delete w.slowToRise;
        delete w.slowToFall;

        const ref = golden[pi];
        for (let i = 0; i < out.length; i++) {
          if (out[i] !== ref[i]) { detectedBy.push(pi); break; }
        }
      }
      perFault.push({
        id:         f.id,
        wireId:     w.id,
        kind:       f.kind,
        detected:   detectedBy.length > 0,
        detectedBy,
      });
    }
  }

  // Final reset so the scene is clean for any subsequent live sim.
  resetTransitionState(wires);

  const detected = perFault.filter(f => f.detected).length;
  const total    = perFault.length;
  const percent  = total === 0 ? 100 : Math.round((detected / total) * 100);

  return {
    primaryInputs,
    primaryOutputs,
    golden,
    perFault,
    coverage: { detected, total, percent },
    _pairs: vectorPairs,
  };
}
