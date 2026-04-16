/* ============================================================
   engine.js — DAG Evaluation Engine
   Supports combinational gates AND sequential flip-flops.
   ============================================================ */

const Engine = (() => {

  // ── Combinational Gate Truth Tables ───────────────────────
  const GATE_FN = {
    AND:  (a, b) => (a & b),
    OR:   (a, b) => (a | b),
    XOR:  (a, b) => (a ^ b),
    NAND: (a, b) => ((a & b) ^ 1),
    NOR:  (a, b) => ((a | b) ^ 1),
    NOT:  (a)    => (a ^ 1),
  };

  // ── Flip-Flop Next-State Functions (called on rising edge) ─
  // Each receives (inputs[], currentQ) and returns { q, qNot }
  const FF_FN = {
    D: (args, q) => {
      const d = args[0];
      if (d === null || d === undefined) return { q, qNot: q ^ 1 }; // hold on broken input
      return { q: d, qNot: d ^ 1 };
    },
    SR: (args, q) => {
      const s = args[0], r = args[1];
      if (s === null || r === null) return { q, qNot: q ^ 1 };
      if (s && r)  return { q: 1, qNot: 0 }; // Set dominates
      if (r)       return { q: 0, qNot: 1 }; // Reset
      if (s)       return { q: 1, qNot: 0 }; // Set
      return { q, qNot: q ^ 1 };             // Hold
    },
    JK: (args, q) => {
      const j = args[0], k = args[1];
      if (j === null || k === null) return { q, qNot: q ^ 1 };
      if (j && k)  return { q: q ^ 1, qNot: q }; // Toggle
      if (k)       return { q: 0, qNot: 1 };       // Reset
      if (j)       return { q: 1, qNot: 0 };       // Set
      return { q, qNot: q ^ 1 };                   // Hold
    },
    T: (args, q) => {
      const t = args[0];
      if (t === null) return { q, qNot: q ^ 1 };
      return t ? { q: q ^ 1, qNot: q } : { q, qNot: q ^ 1 };
    },
  };

  // FF_TYPES: pre-placed (legacy) + FF_SLOT (player-placed)
  const FF_TYPES = new Set(['FLIPFLOP_D', 'FLIPFLOP_SR', 'FLIPFLOP_JK', 'FLIPFLOP_T', 'FF_SLOT']);
  const FF_TYPE_MAP = {
    FLIPFLOP_D: 'D', FLIPFLOP_SR: 'SR', FLIPFLOP_JK: 'JK', FLIPFLOP_T: 'T',
    // FF_SLOT: resolved dynamically from node.ffType
  };

  // ── Main Evaluate Function ─────────────────────────────────
  // ffStates: Map<nodeId, { q, qNot, prevClkValue }>  (mutable, updated in-place)
  // Returns: { nodeValues, wireValues, ffUpdated, solved }
  function evaluate(level, ffStates, stepCount) {
    const { nodes, wires } = level;
    ffStates = ffStates || new Map();

    const nodeMap     = new Map(nodes.map(n => [n.id, n]));
    const nodeValues  = new Map();
    const wireValues  = new Map();

    // ── Build adjacency structures ─────────────────────────
    const successors = new Map(nodes.map(n => [n.id, []]));
    const inputs     = new Map(nodes.map(n => [n.id, []]));

    wires.forEach(wire => {
      successors.get(wire.sourceId).push({ wire, targetId: wire.targetId });
      inputs.get(wire.targetId).push({
        wire,
        sourceId:   wire.sourceId,
        inputIndex: wire.targetInputIndex,
      });
    });
    inputs.forEach(arr => arr.sort((a, b) => a.inputIndex - b.inputIndex));

    // ── Topological Sort (Kahn's) ─────────────────────────
    // FF nodes are treated as pseudo-sources (they expose Q/QNot from stored state).
    // We do NOT include CLK-carrying wires that go *into* FF nodes in the in-degree
    // calculation for sorting purposes — FFs are evaluated separately.
    const inDegree = new Map(nodes.map(n => [n.id, 0]));
    wires.forEach(w => {
      inDegree.set(w.targetId, (inDegree.get(w.targetId) || 0) + 1);
    });

    // FF nodes have no topological dependency from their inputs (state is stored).
    // Override their in-degree to 0 so they enter the queue immediately.
    nodes.forEach(n => {
      if (FF_TYPES.has(n.type)) inDegree.set(n.id, 0);
    });

    const queue = [];
    inDegree.forEach((deg, id) => { if (deg === 0) queue.push(id); });

    const order = [];
    while (queue.length > 0) {
      const id = queue.shift();
      order.push(id);
      successors.get(id).forEach(({ targetId }) => {
        // Skip in-degree reduction for inputs to FF nodes
        if (FF_TYPES.has(nodeMap.get(targetId).type)) return;
        const newDeg = (inDegree.get(targetId) || 0) - 1;
        inDegree.set(targetId, newDeg);
        if (newDeg === 0) queue.push(targetId);
      });
    }

    // ── PHASE 1: Propagate combinational + FF-as-source ───
    order.forEach(id => {
      const node  = nodeMap.get(id);
      let   value = null;

      if (node.type === 'INPUT') {
        value = node.fixedValue;

      } else if (node.type === 'MUX_SELECT') {
        value = node.value ?? 0;

      } else if (node.type === 'DISPLAY_7SEG') {
        // 7-segment display: reads 7 inputs (a-g), outputs nothing
        // Just collect input values for rendering
        const inputSlots = inputs.get(id);
        const segments = inputSlots.map(s => nodeValues.get(s.sourceId) ?? 0);
        node._segments = segments; // store for renderer
        value = segments.reduce((acc, v, i) => acc | ((v ? 1 : 0) << i), 0);

      } else if (node.type === 'CLOCK') {
        // CLOCK node: value is stored in the node itself (mutable)
        value = node.value ?? 0;

      } else if (FF_TYPES.has(node.type)) {
        // FF_SLOT with no type placed → broken signal
        if (node.type === 'FF_SLOT' && !node.ffType) {
          value = null;
          nodeValues.set(id, value);
          successors.get(id).forEach(({ wire }) => wireValues.set(wire.id, null));
          return;
        }
        // FF node acts as a source: emit its current stored Q.
        const ffState = ffStates.get(id) || { q: 0, qNot: 1, prevClkValue: null };
        value = ffState.q;
        // Also make QNot available via the wire sourceOutputIndex convention
        nodeValues.set(id + '__qnot', ffState.qNot);

      } else if (node.type === 'GATE_SLOT') {
        if (node.gate == null) {
          value = null;
        } else {
          const inputSlots = inputs.get(id);
          const args = inputSlots.map(slot => nodeValues.get(slot.sourceId));
          if (args.some(a => a === null || a === undefined)) {
            value = null;
          } else {
            value = GATE_FN[node.gate](...args);
          }
        }

      } else if (node.type === 'OUTPUT') {
        const inputSlots = inputs.get(id);
        if (inputSlots.length > 0) {
          const slot = inputSlots[0];
          const outIdx = slot.wire.sourceOutputIndex || 0;
          if (outIdx === 1 && FF_TYPES.has(nodeMap.get(slot.sourceId).type)) {
            value = nodeValues.get(slot.sourceId + '__qnot') ?? null;
          } else {
            value = nodeValues.get(slot.sourceId) ?? null;
          }
        }
      }

      nodeValues.set(id, value);

      // Propagate to outgoing wires
      successors.get(id).forEach(({ wire }) => {
        // sourceOutputIndex: 0=Q, 1=QNot
        const outIdx = wire.sourceOutputIndex || 0;
        if (outIdx === 1 && FF_TYPES.has(node.type)) {
          wireValues.set(wire.id, nodeValues.get(id + '__qnot') ?? null);
        } else {
          wireValues.set(wire.id, value);
        }
      });
    });

    // ── PHASE 2: Detect rising clock edges, update FF state ─
    let ffUpdated = false;

    nodes.forEach(node => {
      if (!FF_TYPES.has(node.type)) return;

      // Find the CLK wire (the one with isClockWire: true, or highest inputIndex)
      const inputSlots = inputs.get(node.id);
      const clkSlot = inputSlots.find(s => s.wire.isClockWire) ||
                      inputSlots.reduce((best, s) =>
                        (!best || s.inputIndex > best.inputIndex) ? s : best, null);

      if (!clkSlot) return;

      const clkNow = wireValues.get(clkSlot.wire.id) ?? null;

      let ffState = ffStates.get(node.id);
      if (!ffState) {
        ffState = { q: 0, qNot: 1, prevClkValue: null };
        ffStates.set(node.id, ffState);
      }

      const prevClk = ffState.prevClkValue;

      // Rising edge: 0 → 1
      if (clkNow === 1 && prevClk === 0) {
        const dataSlots = inputSlots.filter(s => s !== clkSlot);
        const dataArgs  = dataSlots.map(s => wireValues.get(s.wire.id) ?? null);

        const ffType = node.type === 'FF_SLOT' ? node.ffType : FF_TYPE_MAP[node.type];
        const { q: newQ, qNot: newQNot } = FF_FN[ffType](dataArgs, ffState.q);

        if (newQ !== ffState.q || newQNot !== ffState.qNot) {
          ffState.q    = newQ;
          ffState.qNot = newQNot;
          ffUpdated = true;
        }
      }

      // Always update prevClk (tracks both edges)
      if (clkNow !== null) ffState.prevClkValue = clkNow;
    });

    // ── PHASE 3: Re-propagate FF outputs if state changed ──
    if (ffUpdated) {
      nodes.forEach(node => {
        if (!FF_TYPES.has(node.type)) return;

        const ffState = ffStates.get(node.id) || { q: 0, qNot: 1 };
        nodeValues.set(node.id, ffState.q);
        nodeValues.set(node.id + '__qnot', ffState.qNot);

        successors.get(node.id).forEach(({ wire }) => {
          const outIdx = wire.sourceOutputIndex || 0;
          const val    = outIdx === 1 ? ffState.qNot : ffState.q;
          wireValues.set(wire.id, val);
        });
      });

      // Re-evaluate all combinational nodes downstream of FFs
      order.forEach(id => {
        const node = nodeMap.get(id);
        if (FF_TYPES.has(node.type) || node.type === 'INPUT' ||
            node.type === 'CLOCK' || node.type === 'MUX_SELECT' ||
            node.type === 'DISPLAY_7SEG')  return;

        let value = null;
        if (node.type === 'GATE_SLOT') {
          if (node.gate != null) {
            const inputSlots = inputs.get(id);
            const args = inputSlots.map(slot => nodeValues.get(slot.sourceId));
            if (!args.some(a => a === null || a === undefined)) {
              value = GATE_FN[node.gate](...args);
            }
          }
        } else if (node.type === 'OUTPUT') {
          const inputSlots = inputs.get(id);
          if (inputSlots.length > 0) {
            const slot = inputSlots[0];
            const outIdx = slot.wire.sourceOutputIndex || 0;
            if (outIdx === 1 && FF_TYPES.has(nodeMap.get(slot.sourceId).type)) {
              value = nodeValues.get(slot.sourceId + '__qnot') ?? null;
            } else {
              value = nodeValues.get(slot.sourceId) ?? null;
            }
          }
        }

        nodeValues.set(id, value);
        successors.get(id).forEach(({ wire }) => wireValues.set(wire.id, value));
      });
    }

    // ── Win Condition ─────────────────────────────────────
    const minSteps = level.minSteps || 0;
    const outputNodes = nodes.filter(n => n.type === 'OUTPUT' && !n.sandbox);
    const solved = outputNodes.length > 0 && (stepCount || 0) >= minSteps &&
      outputNodes.every(n => {
      const computed = nodeValues.get(n.id);
      return computed !== null && computed === n.targetValue;
    });

    return { nodeValues, wireValues, ffUpdated, solved };
  }

  return { evaluate, GATE_FN, FF_FN, FF_TYPES };

})();
