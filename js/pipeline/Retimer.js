/**
 * Retimer — greedy single-move retiming suggestion (Phase 10a).
 *
 * Explores every PIPE_REG in the scene and, for each, tries to push it
 * across the single combinational node adjacent to its data input
 * (backward) or data output (forward). The evaluator re-runs on the
 * trial graph; the move with the biggest drop in `maxDelayPs` wins.
 *
 * Scope of v1 (ship-then-improve):
 *   - PIPE_REGs with `channels === 1` (single data lane).
 *   - Adjacent combinational node must have exactly one data input AND
 *     exactly one data-output consumer. This rules out multi-input gates
 *     (AND/OR/XOR with 2+ inputs) and fan-out nodes; full Leiserson–Saxe
 *     (Phase 10b) will generalise by duplicating PIPEs across inputs.
 *   - STALL / FLUSH / CLK wires on the PIPE are preserved as-is.
 *
 * Returned proposal shape:
 *   {
 *     pipeId, direction: 'backward'|'forward', pastNodeId, pastNodeLabel,
 *     description, wireEdits: { remove: wireId[], add: Wire[] },
 *     before: { maxDelayPs, cycles, bottleneck },
 *     after:  { maxDelayPs, cycles, bottleneck },
 *     improvementPs,
 *   }
 * or null when nothing improves.
 */
import { evaluate } from './StageEvaluator.js';

/** Nodes we'll retime across — pure combinational computation only. */
const COMB_RETIMABLE_TYPES = new Set([
  'GATE_SLOT', 'HALF_ADDER', 'FULL_ADDER', 'COMPARATOR',
  'MUX', 'DEMUX', 'DECODER', 'ENCODER', 'BUS_MUX',
  'SIGN_EXT', 'SPLIT', 'MERGE', 'ALU',
]);

export function suggestRetime(scene) {
  const base = evaluate(scene);
  if (base.cycles < 2 || base.bottleneck < 0) return null;

  let best = null;
  for (const node of scene.nodes) {
    if (node.type !== 'PIPE_REG') continue;

    const isMulti = (node.channels ?? 1) > 1;
    for (const direction of ['backward', 'forward']) {
      const prop = isMulti
        ? _trialMoveMulti(scene, node, direction, base)
        : _trialMove(scene, node, direction, base);
      if (!prop) continue;
      if (!best || prop.improvementPs > best.improvementPs) best = prop;
    }
  }
  return best;
}

/** Compose a trial proposal for one PIPE + direction, or null if invalid / no improvement. */
function _trialMove(scene, pipe, direction, base) {
  const move = _planMove(scene, pipe, direction);
  if (!move) return null;
  const trial = _applyMove(scene, move);
  if (!trial) return null;
  const res = evaluate(trial);
  if (res.hasCycle) return null;
  if ((res.violations?.length || 0) > (base.violations?.length || 0)) return null;
  const improvementPs = base.maxDelayPs - res.maxDelayPs;
  if (improvementPs <= 0) return null;

  // Swap canvas positions of PIPE and the node it just crossed — keeps the
  // schematic readable after retiming (PIPE visually takes the node's slot,
  // the node shifts into PIPE's old slot). Y is kept for each so a pipeline
  // laid out horizontally stays horizontal.
  const past = (scene.nodes || []).find(n => n.id === move.pastNodeId);
  const nodeEdits = (past && pipe.x != null && past.x != null) ? [
    { nodeId: pipe.id,        newX: past.x, newY: past.y ?? pipe.y ?? 0 },
    { nodeId: move.pastNodeId, newX: pipe.x, newY: pipe.y ?? past.y ?? 0 },
  ] : [];

  return {
    pipeId:        pipe.id,
    direction,
    pastNodeId:    move.pastNodeId,
    pastNodeLabel: move.pastNodeLabel,
    description:   move.description,
    wireEdits:     move.wireEdits,
    nodeEdits,
    before: { maxDelayPs: base.maxDelayPs, cycles: base.cycles, bottleneck: base.bottleneck },
    after:  { maxDelayPs: res.maxDelayPs,  cycles: res.cycles,  bottleneck: res.bottleneck },
    improvementPs,
  };
}

/**
 * Plan wire rewrites to push PIPE across one adjacent combinational node.
 * Returns { pastNodeId, pastNodeLabel, description, wireEdits } or null.
 */
function _planMove(scene, pipe, direction) {
  const nodes = scene.nodes;
  const wires = scene.wires || [];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // PIPE's data input wire (into pin 0) and data output wires (out of pin 0).
  // STALL/FLUSH/CLK wires live on pins ch..ch+2 and are ignored here.
  const pipeDataIn = wires.find(w =>
    !w.isClockWire && w.targetId === pipe.id && w.targetInputIndex === 0);
  const pipeDataOuts = wires.filter(w =>
    !w.isClockWire && w.sourceId === pipe.id && (w.sourceOutputIndex ?? 0) === 0);
  if (!pipeDataIn || pipeDataOuts.length !== 1) return null;
  const pipeDataOut = pipeDataOuts[0];

  if (direction === 'backward') {
    // Pull PIPE across the node C feeding its input.
    const cId = pipeDataIn.sourceId;
    const c   = nodeMap.get(cId);
    if (!_isRetimableNode(c)) return null;
    const cIns  = wires.filter(w => !w.isClockWire && w.targetId === cId);
    const cOuts = wires.filter(w => !w.isClockWire && w.sourceId === cId);
    if (cIns.length !== 1)                                     return null;
    if (cOuts.length !== 1 || cOuts[0].id !== pipeDataIn.id)   return null;

    const feeder = cIns[0];               // S → C
    // New chain: S → PIPE → C → next   (next is pipeDataOut's target)
    return {
      pastNodeId:    cId,
      pastNodeLabel: c.label || c.id,
      description:   `Move ${pipe.label || pipe.id} backward across ${c.label || c.id}`,
      wireEdits: {
        remove: [feeder.id, pipeDataIn.id, pipeDataOut.id],
        add: [
          _wire(feeder.sourceId, feeder.sourceOutputIndex ?? 0, pipe.id, 0),
          _wire(pipe.id,   0,                               cId,   feeder.targetInputIndex),
          _wire(cId,       0,                               pipeDataOut.targetId, pipeDataOut.targetInputIndex),
        ],
      },
    };
  }

  if (direction === 'forward') {
    // Push PIPE across the node C consuming its output.
    const cId = pipeDataOut.targetId;
    const c   = nodeMap.get(cId);
    if (!_isRetimableNode(c)) return null;
    const cIns  = wires.filter(w => !w.isClockWire && w.targetId === cId);
    const cOuts = wires.filter(w => !w.isClockWire && w.sourceId === cId);
    if (cIns.length !== 1 || cIns[0].id !== pipeDataOut.id)    return null;
    if (cOuts.length !== 1)                                    return null;

    const consumer = cOuts[0];            // C → next
    const prevId   = pipeDataIn.sourceId;
    // New chain: prev → C → PIPE → next
    return {
      pastNodeId:    cId,
      pastNodeLabel: c.label || c.id,
      description:   `Move ${pipe.label || pipe.id} forward across ${c.label || c.id}`,
      wireEdits: {
        remove: [pipeDataIn.id, pipeDataOut.id, consumer.id],
        add: [
          _wire(prevId, pipeDataIn.sourceOutputIndex ?? 0, cId,     pipeDataOut.targetInputIndex),
          _wire(cId,    0,                                 pipe.id, 0),
          _wire(pipe.id,0,                                 consumer.targetId, consumer.targetInputIndex),
        ],
      },
    };
  }

  return null;
}

function _isRetimableNode(n) {
  return !!n && COMB_RETIMABLE_TYPES.has(n.type);
}

/** Clone the scene shallowly and apply wire + node-property edits. */
function _applyMove(scene, move) {
  const nodes = (scene.nodes || []).map(n => ({ ...n }));
  if (move.nodePropEdits) {
    for (const e of move.nodePropEdits) {
      const n = nodes.find(x => x.id === e.nodeId);
      if (n) Object.assign(n, e.props);
    }
  }
  let wires = (scene.wires || []).filter(w => !move.wireEdits.remove.includes(w.id));
  wires = wires.concat(move.wireEdits.add);
  return {
    nodes,
    wires,
    getNode: (id) => nodes.find(n => n.id === id),
  };
}

// ─── Multi-channel retiming ───────────────────────────────────────
// A PIPE_REG with channels > 1 carries N parallel data lanes plus
// stall/flush/clk control pins at indices N..N+2. Moving this pipe
// across a combinational node C (which may consume only SOME of the
// pipe's channels) requires:
//   • dropping the channels currently fed by C (or feeding C, depending
//     on direction),
//   • adding new channels carrying C's other-side signals,
//   • leaving "passthrough" channels (not involved with C) unchanged
//     in semantics but possibly renumbered,
//   • re-targeting stall/flush/clk pin indices to match the new count.
//
// We only allow a multi-channel move if ALL of C's outputs (backward
// case) or ALL of C's inputs (forward case) interact exclusively with
// this pipe — otherwise the move would orphan an external consumer
// or feed an external signal through an extra register without the
// user asking for it.

function _trialMoveMulti(scene, pipe, direction, base) {
  const move = _planMoveMulti(scene, pipe, direction);
  if (!move) return null;
  const trial = _applyMove(scene, move);
  if (!trial) return null;
  const res = evaluate(trial);
  if (res.hasCycle) return null;
  if ((res.violations?.length || 0) > (base.violations?.length || 0)) return null;
  const improvementPs = base.maxDelayPs - res.maxDelayPs;
  if (improvementPs <= 0) return null;

  const past = (scene.nodes || []).find(n => n.id === move.pastNodeId);
  const nodeEdits = (past && pipe.x != null && past.x != null) ? [
    { nodeId: pipe.id,         newX: past.x, newY: past.y ?? pipe.y ?? 0 },
    { nodeId: move.pastNodeId, newX: pipe.x, newY: pipe.y ?? past.y ?? 0 },
  ] : [];

  return {
    pipeId:        pipe.id,
    direction,
    pastNodeId:    move.pastNodeId,
    pastNodeLabel: move.pastNodeLabel,
    description:   move.description,
    wireEdits:     move.wireEdits,
    nodePropEdits: move.nodePropEdits,
    nodeEdits,
    before: { maxDelayPs: base.maxDelayPs, cycles: base.cycles, bottleneck: base.bottleneck },
    after:  { maxDelayPs: res.maxDelayPs,  cycles: res.cycles,  bottleneck: res.bottleneck },
    improvementPs,
  };
}

function _planMoveMulti(scene, pipe, direction) {
  const wires = scene.wires || [];
  const nodeMap = new Map((scene.nodes || []).map(n => [n.id, n]));
  const oldCh = pipe.channels ?? 1;
  // Snapshot of all data input wires (at indices 0..oldCh-1) and data
  // output wires (sourceOutputIndex 0..oldCh-1). Control pins
  // (stall=oldCh, flush=oldCh+1, clk=oldCh+2) are handled separately.
  const dataIns  = wires.filter(w => !w.isClockWire && w.targetId === pipe.id && w.targetInputIndex < oldCh)
                        .sort((a, b) => a.targetInputIndex - b.targetInputIndex);
  const dataOuts = wires.filter(w => w.sourceId === pipe.id && (w.sourceOutputIndex || 0) < oldCh && !w.isClockWire);
  const stallW = wires.find(w => w.targetId === pipe.id && w.targetInputIndex === oldCh && !w.isClockWire);
  const flushW = wires.find(w => w.targetId === pipe.id && w.targetInputIndex === oldCh + 1 && !w.isClockWire);
  const clkW   = wires.find(w => w.targetId === pipe.id && w.isClockWire);

  if (dataIns.length !== oldCh) return null; // need every data channel populated
  if (!clkW) return null;                    // pipe must be clocked

  if (direction === 'backward') {
    // Pick a candidate C: the source of one of pipe's data input wires.
    // For correctness, every output of C must terminate at THIS pipe
    // (we'll re-route them through C-after-pipe). C must be combinational.
    const candidateIds = [...new Set(dataIns.map(w => w.sourceId))];
    for (const cId of candidateIds) {
      const c = nodeMap.get(cId);
      if (!_isRetimableNode(c)) continue;
      const cOuts = wires.filter(w => w.sourceId === cId && !w.isClockWire);
      const cOutsToPipe = cOuts.filter(w => w.targetId === pipe.id);
      if (cOutsToPipe.length !== cOuts.length) continue; // C feeds something else too
      const cIns = wires.filter(w => w.targetId === cId && !w.isClockWire)
                        .sort((a, b) => a.targetInputIndex - b.targetInputIndex);
      if (cIns.length === 0) continue;
      // Layout new channels: passthrough channels first (preserving relative
      // order), then one new channel per C input.
      const cChannelIdxSet = new Set(cOutsToPipe.map(w => w.targetInputIndex));
      const passthrough = dataIns.filter(w => !cChannelIdxSet.has(w.targetInputIndex));
      const newDataInWires = [];
      const oldToNewIdx = new Map(); // for passthrough: old chIdx → new chIdx
      let nextIdx = 0;
      for (const pi of passthrough) {
        oldToNewIdx.set(pi.targetInputIndex, nextIdx);
        newDataInWires.push(_wire(pi.sourceId, pi.sourceOutputIndex || 0, pipe.id, nextIdx));
        nextIdx++;
      }
      const cInputStartIdx = nextIdx;
      for (const ci of cIns) {
        newDataInWires.push(_wire(ci.sourceId, ci.sourceOutputIndex || 0, pipe.id, nextIdx));
        nextIdx++;
      }
      const newCh = nextIdx;
      // Build wires from pipe to C (C now downstream of pipe).
      const pipeToC = cIns.map((ci, j) =>
        _wire(pipe.id, cInputStartIdx + j, cId, ci.targetInputIndex));
      // Re-target every consumer of an old pipe data output:
      //   - if it consumed a passthrough channel → new index from oldToNewIdx
      //   - if it consumed a C-fed channel → now reads C directly at the
      //     same source-output index that USED to feed pipe at that channel
      const newConsumerWires = [];
      for (const consumer of dataOuts) {
        const oldCi = consumer.sourceOutputIndex || 0;
        if (oldToNewIdx.has(oldCi)) {
          newConsumerWires.push(_wire(pipe.id, oldToNewIdx.get(oldCi), consumer.targetId, consumer.targetInputIndex));
        } else {
          // Find the C output that fed pipe at oldCi.
          const cOutFeeding = cOutsToPipe.find(w => w.targetInputIndex === oldCi);
          if (!cOutFeeding) return null; // shouldn't happen
          newConsumerWires.push(_wire(cId, cOutFeeding.sourceOutputIndex || 0, consumer.targetId, consumer.targetInputIndex));
        }
      }
      // Re-target stall/flush/clk to new pin indices.
      const ctrlAdds = [];
      if (stallW) ctrlAdds.push(_wire(stallW.sourceId, stallW.sourceOutputIndex || 0, pipe.id, newCh));
      if (flushW) ctrlAdds.push(_wire(flushW.sourceId, flushW.sourceOutputIndex || 0, pipe.id, newCh + 1));
      const newClkWire = _wire(clkW.sourceId, clkW.sourceOutputIndex || 0, pipe.id, newCh + 2);
      newClkWire.isClockWire = true;
      ctrlAdds.push(newClkWire);

      const removeIds = [
        ...dataIns.map(w => w.id),
        ...dataOuts.map(w => w.id),
        ...cIns.map(w => w.id),
        ...cOutsToPipe.map(w => w.id),
        ...(stallW ? [stallW.id] : []),
        ...(flushW ? [flushW.id] : []),
        clkW.id,
      ];
      return {
        pastNodeId:    cId,
        pastNodeLabel: c.label || c.id,
        description:   `Move ${pipe.label || pipe.id} backward across ${c.label || c.id}`,
        wireEdits: {
          remove: removeIds,
          add: [...newDataInWires, ...pipeToC, ...newConsumerWires, ...ctrlAdds],
        },
        nodePropEdits: [{ nodeId: pipe.id, props: { channels: newCh } }],
      };
    }
    return null;
  }

  if (direction === 'forward') {
    // Pick a candidate C: the target of one of pipe's data output wires.
    // For correctness, every input of C must come from THIS pipe.
    const candidateIds = [...new Set(dataOuts.map(w => w.targetId))];
    for (const cId of candidateIds) {
      const c = nodeMap.get(cId);
      if (!_isRetimableNode(c)) continue;
      const cIns = wires.filter(w => w.targetId === cId && !w.isClockWire)
                        .sort((a, b) => a.targetInputIndex - b.targetInputIndex);
      const cInsFromPipe = cIns.filter(w => w.sourceId === pipe.id);
      if (cInsFromPipe.length !== cIns.length) continue; // C has external inputs
      const cOuts = wires.filter(w => w.sourceId === cId && !w.isClockWire);
      if (cOuts.length === 0) continue;
      // Channels of pipe consumed by C (the wires from pipe TO C):
      const cChannelIdxSet = new Set(cInsFromPipe.map(w => w.sourceOutputIndex || 0));
      const passthrough = dataIns.filter(w => !cChannelIdxSet.has(w.targetInputIndex));
      const newDataInWires = [];
      const oldToNewIdx = new Map();
      let nextIdx = 0;
      for (const pi of passthrough) {
        oldToNewIdx.set(pi.targetInputIndex, nextIdx);
        newDataInWires.push(_wire(pi.sourceId, pi.sourceOutputIndex || 0, pipe.id, nextIdx));
        nextIdx++;
      }
      // Then add one new channel per C output.
      // Sort by sourceOutputIndex so "new C-output channel" order is predictable.
      const cOutsSorted = [...cOuts].sort((a, b) => (a.sourceOutputIndex || 0) - (b.sourceOutputIndex || 0));
      const cOutToNewIdx = new Map();
      for (const co of cOutsSorted) {
        const outIdx = co.sourceOutputIndex || 0;
        if (cOutToNewIdx.has(outIdx)) continue; // dedupe by C output pin
        cOutToNewIdx.set(outIdx, nextIdx);
        // Pipe channel sourced from C.outIdx — but since C now sits BEFORE pipe,
        // this new channel's source IS C at outIdx.
        newDataInWires.push(_wire(cId, outIdx, pipe.id, nextIdx));
        nextIdx++;
      }
      const newCh = nextIdx;
      // C's inputs now come from the original pipe sources directly (skipping pipe).
      // For each cIn, find the original pipe input wire feeding the channel cIn was reading.
      const cInputSources = cIns.map(ci => {
        const origSrc = dataIns.find(di => di.targetInputIndex === (ci.sourceOutputIndex || 0));
        if (!origSrc) return null;
        return _wire(origSrc.sourceId, origSrc.sourceOutputIndex || 0, cId, ci.targetInputIndex);
      });
      if (cInputSources.some(x => !x)) return null;
      // Re-target every consumer of an old pipe data output:
      //   - passthrough → new chIdx
      //   - C-output channel → new chIdx (since C feeds pipe now)
      // Original consumers of cOuts (external nodes reading C.outX) → now read pipe.newCh.
      const newConsumerWires = [];
      for (const consumer of dataOuts) {
        const oldCi = consumer.sourceOutputIndex || 0;
        if (oldToNewIdx.has(oldCi)) {
          newConsumerWires.push(_wire(pipe.id, oldToNewIdx.get(oldCi), consumer.targetId, consumer.targetInputIndex));
        }
        // If consumer was reading a C-fed channel: the C-fed channel was from PIPE→C
        // (so it can't be in dataOuts since dataOuts go FROM pipe). Skipped.
      }
      // Original consumers of C's outputs (reading C.outX): redirect to pipe.newCh.
      for (const co of cOuts) {
        // Skip the wires going back into pipe (we've removed them).
        // Actually cOuts here is "C → external"; cInsFromPipe is "pipe → C".
        // Nothing in cOuts goes back into pipe, since C's inputs come from pipe.
        const newIdx = cOutToNewIdx.get(co.sourceOutputIndex || 0);
        if (newIdx == null) return null;
        newConsumerWires.push(_wire(pipe.id, newIdx, co.targetId, co.targetInputIndex));
      }
      // Re-target control wires.
      const ctrlAdds = [];
      if (stallW) ctrlAdds.push(_wire(stallW.sourceId, stallW.sourceOutputIndex || 0, pipe.id, newCh));
      if (flushW) ctrlAdds.push(_wire(flushW.sourceId, flushW.sourceOutputIndex || 0, pipe.id, newCh + 1));
      const newClkWire = _wire(clkW.sourceId, clkW.sourceOutputIndex || 0, pipe.id, newCh + 2);
      newClkWire.isClockWire = true;
      ctrlAdds.push(newClkWire);

      const removeIds = [
        ...dataIns.map(w => w.id),
        ...dataOuts.map(w => w.id),
        ...cIns.map(w => w.id),
        ...cOuts.map(w => w.id),
        ...(stallW ? [stallW.id] : []),
        ...(flushW ? [flushW.id] : []),
        clkW.id,
      ];
      return {
        pastNodeId:    cId,
        pastNodeLabel: c.label || c.id,
        description:   `Move ${pipe.label || pipe.id} forward across ${c.label || c.id}`,
        wireEdits: {
          remove: removeIds,
          add: [...newDataInWires, ...cInputSources, ...newConsumerWires, ...ctrlAdds],
        },
        nodePropEdits: [{ nodeId: pipe.id, props: { channels: newCh } }],
      };
    }
    return null;
  }

  return null;
}

let _wireIdCounter = 0;
function _wire(sourceId, sourceOutputIndex, targetId, targetInputIndex) {
  return {
    id: `w_retime_${Date.now().toString(36)}_${++_wireIdCounter}`,
    sourceId,
    sourceOutputIndex,
    targetId,
    targetInputIndex,
    waypoints: [],
    netName: '',
    colorGroup: null,
    isClockWire: false,
  };
}
