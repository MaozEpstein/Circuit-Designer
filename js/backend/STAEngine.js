/**
 * STAEngine — Static Timing Analysis for digital circuits.
 *
 * Computes timing paths (reg2reg, in2reg, reg2out, in2out),
 * arrival / required times, setup & hold slack, WNS, TNS.
 * Reuses DelayModel for gate delays and the same DAG patterns
 * as StageEvaluator but cuts at ALL sequential boundaries
 * (not just PIPE_REG).
 */

import { delayOf, DEFAULT_DELAY_PS }        from '../pipeline/DelayModel.js';
import { FF_TYPE_SET, MEMORY_TYPE_SET }     from '../components/Component.js';

const SEQUENTIAL_SET = new Set([...FF_TYPE_SET, ...MEMORY_TYPE_SET]);
const INPUT_TYPES    = new Set(['INPUT', 'IMM']);
const OUTPUT_TYPES   = new Set(['OUTPUT']);
const CLOCK_TYPES    = new Set(['CLOCK']);

function _staDelayOf(node) {
  if (node.type === 'GATE_SLOT' && node.gate && DEFAULT_DELAY_PS[node.gate] != null) {
    return DEFAULT_DELAY_PS[node.gate];
  }
  return delayOf(node);
}

function _isWritebackEdge(w, nodeMap) {
  const dst = nodeMap.get(w.targetId);
  if (!dst) return false;
  if (dst.type === 'REG_FILE_DP') return (w.targetInputIndex ?? -1) >= 2;
  if (dst.type === 'REG_FILE')    return (w.targetInputIndex ?? -1) >= 1;
  return false;
}

function _isStartpoint(n) {
  return SEQUENTIAL_SET.has(n.type) || INPUT_TYPES.has(n.type);
}

function _isEndpoint(n) {
  return SEQUENTIAL_SET.has(n.type) || OUTPUT_TYPES.has(n.type);
}

/**
 * @param {{ nodes: object[], wires: object[] }} scene
 * @param {object} [opts]
 * @param {number} [opts.clockPeriodPs=2000]
 * @param {number} [opts.tSetupPs=50]
 * @param {number} [opts.tHoldPs=20]
 * @param {number} [opts.tClk2QPs=100]
 * @param {object[]} [opts.exceptions=[]]  timing exceptions ({type, from, to, value})
 * @returns {STAResult}
 */
export function analyzeTimingPaths(scene, opts = {}) {
  const {
    clockPeriodPs = 2000,
    tSetupPs      = 50,
    tHoldPs       = 20,
    tClk2QPs      = 100,
    skewPs        = 0,   // clock skew (capture − launch); 0 = ideal clock (pre-CTS)
    exceptions    = [],  // false_path / multicycle / max_delay applied per matching path
  } = opts;

  const nodes   = scene.nodes;
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // --- 1. Build DAG (skip clock wires + writeback edges) ---
  const dataWires = scene.wires.filter(
    w => !w.isClockWire && !_isWritebackEdge(w, nodeMap)
  );

  const preds = new Map(nodes.map(n => [n.id, []]));
  const succs = new Map(nodes.map(n => [n.id, []]));
  for (const w of dataWires) {
    if (preds.has(w.targetId))  preds.get(w.targetId).push({ id: w.sourceId, wireId: w.id });
    if (succs.has(w.sourceId))  succs.get(w.sourceId).push({ id: w.targetId, wireId: w.id });
  }

  // --- 2. Kahn's topological sort ---
  // Sequential nodes act as boundaries: force in-degree 0, don't traverse into them
  const inDeg = new Map();
  for (const n of nodes) {
    inDeg.set(n.id, SEQUENTIAL_SET.has(n.type) ? 0 : preds.get(n.id).length);
  }
  const queue = [];
  for (const n of nodes) {
    if (inDeg.get(n.id) === 0) queue.push(n.id);
  }
  const order = [];
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    for (const s of succs.get(id) || []) {
      const sn = nodeMap.get(s.id);
      if (SEQUENTIAL_SET.has(sn?.type)) continue; // don't traverse into seq
      const nd = (inDeg.get(s.id) || 0) - 1;
      inDeg.set(s.id, nd);
      if (nd === 0) queue.push(s.id);
    }
  }

  // --- 3. Forward pass: arrival time ---
  const arrival  = new Map();
  const critPred = new Map();

  for (const id of order) {
    const n = nodeMap.get(id);
    if (!n) continue;

    if (_isStartpoint(n)) {
      // Sequential startpoints launch data after tClk2Q; inputs arrive at 0
      const base = SEQUENTIAL_SET.has(n.type) ? tClk2QPs : 0;
      arrival.set(id, base + _staDelayOf(n));
    } else {
      let maxArr = -1;
      let winner = null;
      for (const p of preds.get(id)) {
        const pa = arrival.get(p.id) ?? 0;
        if (pa > maxArr) { maxArr = pa; winner = p.id; }
      }
      if (maxArr < 0) maxArr = 0;
      arrival.set(id, maxArr + _staDelayOf(n));
      if (winner) critPred.set(id, winner);
    }
  }

  // --- 4. Collect endpoints and compute slack ---
  const paths = [];
  const endpointNodes = nodes.filter(n => _isEndpoint(n));

  for (const ep of endpointNodes) {
    // For sequential endpoints, the data must arrive at the D pin.
    // We look at all predecessor combinational nodes feeding this endpoint.
    const feeders = preds.get(ep.id) || [];
    if (feeders.length === 0 && !INPUT_TYPES.has(ep.type)) continue;

    // Arrival at the endpoint's input = max arrival of its predecessors
    let arrivalAtEndpoint = 0;
    let lastPred = null;
    for (const p of feeders) {
      const pa = arrival.get(p.id) ?? 0;
      if (pa > arrivalAtEndpoint) {
        arrivalAtEndpoint = pa;
        lastPred = p.id;
      }
    }

    // Skip endpoints with no data path
    if (lastPred === null && feeders.length > 0) {
      lastPred = feeders[0].id;
      arrivalAtEndpoint = arrival.get(lastPred) ?? 0;
    }
    if (lastPred === null) continue;

    // Walk critPred chain to recover full path
    const chain = [ep.id];
    let cur = lastPred;
    const visited = new Set([ep.id]);
    while (cur != null && !visited.has(cur)) {
      chain.unshift(cur);
      visited.add(cur);
      cur = critPred.get(cur) ?? null;
    }
    if (cur != null && !visited.has(cur)) chain.unshift(cur);

    // Identify startpoint
    const startNode = nodeMap.get(chain[0]);
    const pathType = _classifyPath(startNode, ep);

    // Resolve the highest-priority matching timing exception for this path.
    // Priority follows the lecture: MCP > max_delay > false_path.
    const exc = _resolveException(exceptions, chain[0], ep.id);

    // Required time. Positive clock skew at the capture FF relaxes setup
    // (the capture edge arrives later) and tightens hold — i.e. Tck ± Tskew.
    let requiredTime = SEQUENTIAL_SET.has(ep.type)
      ? clockPeriodPs - tSetupPs + skewPs
      : clockPeriodPs;
    let holdSlackPs = arrivalAtEndpoint - tClk2QPs - tHoldPs - skewPs;
    let excTag = null;

    if (exc) {
      if (exc.type === 'multicycle') {
        // set_multicycle_path N -setup: capture edge is N cycles out.
        const N = Math.max(1, Math.round(Number(exc.value) || 1));
        requiredTime = SEQUENTIAL_SET.has(ep.type)
          ? clockPeriodPs * N - tSetupPs + skewPs
          : clockPeriodPs * N;
        // By default hold is checked (N-1) cycles behind setup — this moves the
        // hold capture edge later and makes hold HARDER (the lecture's warning;
        // a separate `set_multicycle_path N-1 -hold` is the real-flow remedy).
        holdSlackPs -= (N - 1) * clockPeriodPs;
        excTag = { type: 'multicycle', value: N };
      } else if (exc.type === 'max_delay') {
        // set_max_delay D (ns): override required time, ignore clock relation.
        requiredTime = (Number(exc.value) || 0) * 1000;
        excTag = { type: 'max_delay', value: Number(exc.value) || 0 };
      } else if (exc.type === 'false_path') {
        excTag = { type: 'false_path' };
      }
    }

    const slackPs   = requiredTime - arrivalAtEndpoint;
    const isFalse   = excTag?.type === 'false_path';
    const status    = isFalse ? 'FALSE' : (slackPs >= 0 ? 'MET' : 'VIOLATED');

    paths.push({
      startId:       chain[0],
      endId:         ep.id,
      startLabel:    startNode?.label || startNode?.id || chain[0],
      endLabel:      ep.label || ep.id,
      type:          pathType,
      nodeIds:       chain,
      arrivalPs:     arrivalAtEndpoint,
      requiredPs:    Math.round(requiredTime),
      slackPs:       Math.round(slackPs),
      status,
      holdSlackPs:   Math.round(holdSlackPs),
      holdViolation: !isFalse && holdSlackPs < 0,
      exception:     excTag,   // null, or {type, value} for the UI badge
    });
  }

  // FALSE paths are excluded from timing analysis ("any falsed path returns no
  // path"): sort them to the bottom, and keep the analyzed set separate.
  paths.sort((a, b) => {
    const af = a.status === 'FALSE', bf = b.status === 'FALSE';
    if (af !== bf) return af ? 1 : -1;
    return a.slackPs - b.slackPs;
  });
  const analyzed = paths.filter(p => p.status !== 'FALSE');

  // --- 5. Aggregates (FALSE paths excluded) ---
  const negSlacks    = analyzed.filter(p => p.slackPs < 0).map(p => p.slackPs);
  const wns          = negSlacks.length ? Math.min(...negSlacks) : 0;
  const tns          = negSlacks.reduce((s, v) => s + v, 0);
  const criticalPath = analyzed.length ? analyzed[0].nodeIds : [];
  const maxArrival   = analyzed.length ? Math.max(...analyzed.map(p => p.arrivalPs)) : 0;
  const fMaxMHz      = maxArrival > 0 ? 1e6 / (maxArrival + tSetupPs) : Infinity;

  // --- 6. Per-node detail for the selected path ---
  // (caller can request detail for any path index)

  return {
    paths,
    wns,
    tns,
    criticalPath,
    fMaxMHz: Math.round(fMaxMHz * 100) / 100,
    numViolations: negSlacks.length,
    numHoldViolations: analyzed.filter(p => p.holdViolation).length,
    numFalsePaths: paths.length - analyzed.length,
    clockPeriodPs,
    tSetupPs,
    tHoldPs,
    tClk2QPs,
    skewPs,
  };
}

/** True when a path's start/end match an exception (empty field = wildcard). */
function _matchException(exc, startId, endId) {
  if (!exc) return false;
  if (exc.from && exc.from !== startId) return false;
  if (exc.to   && exc.to   !== endId)   return false;
  return true;
}

/**
 * Pick the highest-priority exception matching a path. Priority follows the
 * lecture: multicycle > max_delay > false_path. set_case_analysis is not a
 * path-level exception (it forces constants) and is ignored here.
 */
function _resolveException(exceptions, startId, endId) {
  if (!exceptions || !exceptions.length) return null;
  const order = { multicycle: 0, max_delay: 1, false_path: 2 };
  let best = null;
  for (const e of exceptions) {
    if (!(e.type in order)) continue;           // skip case_analysis (SDC-only)
    if (!_matchException(e, startId, endId)) continue;
    if (best === null || order[e.type] < order[best.type]) best = e;
  }
  return best;
}

/**
 * Build a per-node delay breakdown for a specific path.
 * Returns an array like a Synopsys report_timing table.
 */
export function pathDetail(scene, nodeIds) {
  const nodeMap = new Map(scene.nodes.map(n => [n.id, n]));
  const rows = [];
  let cumDelay = 0;
  for (const id of nodeIds) {
    const n = nodeMap.get(id);
    if (!n) continue;
    const d = _staDelayOf(n);
    cumDelay += d;
    rows.push({
      id:       n.id,
      label:    n.label || n.id,
      type:     n.gate || n.type,
      delayPs:  d,
      arrivalPs: cumDelay,
    });
  }
  return rows;
}

function _classifyPath(startNode, endNode) {
  const sSeq = startNode && SEQUENTIAL_SET.has(startNode.type);
  const sIn  = startNode && INPUT_TYPES.has(startNode.type);
  const eSeq = SEQUENTIAL_SET.has(endNode.type);
  const eOut = OUTPUT_TYPES.has(endNode.type);
  if (sSeq && eSeq)  return 'reg2reg';
  if (sIn  && eSeq)  return 'in2reg';
  if (sSeq && eOut)  return 'reg2out';
  if (sIn  && eOut)  return 'in2out';
  return 'unknown';
}
