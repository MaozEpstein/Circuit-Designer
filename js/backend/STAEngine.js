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
 * @returns {STAResult}
 */
export function analyzeTimingPaths(scene, opts = {}) {
  const {
    clockPeriodPs = 2000,
    tSetupPs      = 50,
    tHoldPs       = 20,
    tClk2QPs      = 100,
    skewPs        = 0,   // clock skew (capture − launch); 0 = ideal clock (pre-CTS)
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

    // Required time. Positive clock skew at the capture FF relaxes setup
    // (the capture edge arrives later) and tightens hold — i.e. Tck ± Tskew.
    const requiredTime = SEQUENTIAL_SET.has(ep.type)
      ? clockPeriodPs - tSetupPs + skewPs
      : clockPeriodPs;

    const slackPs     = requiredTime - arrivalAtEndpoint;
    const holdSlackPs = arrivalAtEndpoint - tClk2QPs - tHoldPs - skewPs;

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

    paths.push({
      startId:       chain[0],
      endId:         ep.id,
      startLabel:    startNode?.label || startNode?.id || chain[0],
      endLabel:      ep.label || ep.id,
      type:          pathType,
      nodeIds:       chain,
      arrivalPs:     arrivalAtEndpoint,
      requiredPs:    requiredTime,
      slackPs,
      status:        slackPs >= 0 ? 'MET' : 'VIOLATED',
      holdSlackPs,
      holdViolation: holdSlackPs < 0,
    });
  }

  // Sort by slack ascending (worst first)
  paths.sort((a, b) => a.slackPs - b.slackPs);

  // --- 5. Aggregates ---
  const negSlacks    = paths.filter(p => p.slackPs < 0).map(p => p.slackPs);
  const wns          = negSlacks.length ? Math.min(...negSlacks) : 0;
  const tns          = negSlacks.reduce((s, v) => s + v, 0);
  const criticalPath = paths.length ? paths[0].nodeIds : [];
  const maxArrival   = paths.length ? Math.max(...paths.map(p => p.arrivalPs)) : 0;
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
    numHoldViolations: paths.filter(p => p.holdViolation).length,
    clockPeriodPs,
    tSetupPs,
    tHoldPs,
    tClk2QPs,
    skewPs,
  };
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
