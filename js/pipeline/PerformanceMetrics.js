/**
 * PerformanceMetrics — aggregate CPI / IPC / throughput from the existing
 * analysis outputs. Pure aggregation, no new graph walks.
 *
 * Cycle model (in-order, no branch prediction):
 *   idealCycles = (W - 1) + N              // fill + one issue per instr
 *   actualCycles = idealCycles + stallBubbles
 *
 *   Per-instruction stalls are the MAX bubbles the instruction owes to any
 *   upstream producer — they overlap, not accumulate. Load-use RAWs count
 *   even when they're tagged "steady-state" in a loop body.
 *
 *   Forwarding: hazards marked `resolvedByForwarding` are worth zero bubbles
 *   in `actualCycles`; their pre-resolution bubble cost goes into
 *   `bubblesRemovedByForwarding` so we can compute the speedup.
 *
 * Throughput:
 *   CPI  = actualCycles / N
 *   IPC  = N / actualCycles
 *   MIPS = IPC * f_max_MHz
 *
 * Outputs are null-safe — pass any cache; missing pieces produce null metrics.
 */

export function computeMetrics(cache) {
  if (!cache || !Array.isArray(cache.instructions) || cache.instructions.length === 0) {
    return null;
  }
  const W = cache.isa?.pipelineDepth || 5;
  const instructions = cache.instructions.filter(i => !i.isHalt);
  const N = instructions.length;
  if (N === 0) return null;

  const hazards = Array.isArray(cache.programHazards) ? cache.programHazards : [];

  // Per-consumer (instJ) MAX bubbles — stalls overlap on the same instruction.
  const bubblesByJ        = new Map();  // after forwarding
  const bubblesByJNoFwd   = new Map();  // what it would be without forwarding
  for (const h of hazards) {
    if (h.type !== 'RAW') continue;
    const nofwd = Math.max(0, (h.bubblesOriginal != null) ? h.bubblesOriginal : h.bubbles);
    const after = h.resolvedByForwarding ? 0 : h.bubbles;
    bubblesByJ.set(h.instJ,      Math.max(bubblesByJ.get(h.instJ)      || 0, after));
    bubblesByJNoFwd.set(h.instJ, Math.max(bubblesByJNoFwd.get(h.instJ) || 0, nofwd));
  }
  let stallBubbles = 0;
  for (const b of bubblesByJ.values())      stallBubbles += b;
  let stallBubblesNoFwd = 0;
  for (const b of bubblesByJNoFwd.values()) stallBubblesNoFwd += b;

  const idealCycles     = (W - 1) + N;
  const actualCycles    = idealCycles + stallBubbles;
  const noFwdCycles     = idealCycles + stallBubblesNoFwd;

  const cpi        = actualCycles / N;
  const ipc        = N / actualCycles;
  const efficiency = idealCycles / actualCycles;                 // 1.0 = perfect
  const speedupFwd = noFwdCycles > 0 ? noFwdCycles / actualCycles : 1;

  const fMaxMHz = Number.isFinite(cache.fMaxMHz) ? cache.fMaxMHz : null;
  const mips    = (fMaxMHz != null) ? ipc * fMaxMHz : null;

  return {
    instructionCount:              N,
    pipelineDepth:                 W,
    idealCycles,
    actualCycles,
    noForwardingCycles:            noFwdCycles,
    stallBubbles,
    stallBubblesNoForwarding:      stallBubblesNoFwd,
    bubblesRemovedByForwarding:    Math.max(0, stallBubblesNoFwd - stallBubbles),
    cpi,
    ipc,
    efficiency,
    speedupFromForwarding:         speedupFwd,
    fMaxMHz,
    throughputMIPS:                mips,
  };
}
