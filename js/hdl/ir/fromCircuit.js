// circuitJSON → IRModule.
//
// Phase 2 scope: port enumeration, net deduplication by source endpoint,
// translator dispatch (registry populated in Phases 3+). Identifier stability
// is enforced by preserving user-given labels as IRNet.originalName.

import { hasTranslator, getTranslator } from '../translators/index.js';
import { sanitizeIdentifier, uniqueIdentifier } from '../core/identifiers.js';
import { SourceRef } from '../core/SourceRef.js';
import {
  makeModule, makePort, makeNet, makeInstance,
  PORT_DIR, NET_KIND,
} from './types.js';

function nodeBitWidth(node) {
  const w = node?.bitWidth ?? node?.dataBits ?? node?.width ?? 1;
  return Math.max(1, w | 0);
}

function collectPorts(circuit, usedNames) {
  const ports = [];
  const portByNodeId = new Map();
  // Stable iteration order: node array order (deterministic).
  for (const n of (circuit.nodes || [])) {
    if (n.type === 'INPUT' || n.type === 'CLOCK') {
      const name = uniqueIdentifier(n.label || n.id, usedNames, 'in');
      const p = makePort({
        name, dir: PORT_DIR.INPUT, width: nodeBitWidth(n),
        sourceRef: SourceRef.fromNode(n.id),
      });
      ports.push(p);
      portByNodeId.set(n.id, p);
    } else if (n.type === 'OUTPUT') {
      const name = uniqueIdentifier(n.label || n.id, usedNames, 'out');
      const p = makePort({
        name, dir: PORT_DIR.OUTPUT, width: nodeBitWidth(n),
        sourceRef: SourceRef.fromNode(n.id),
      });
      ports.push(p);
      portByNodeId.set(n.id, p);
    }
  }
  return { ports, portByNodeId };
}

// Group wires into nets by (sourceId, sourceOutputIndex). Names prefer the
// user-given netName; fallback "net_<srcId>_<outIdx>".
function collectNets(circuit, portByNodeId, usedNames) {
  const nets = [];
  const netByEndpoint = new Map();
  const nodeById = new Map();
  for (const n of (circuit.nodes || [])) nodeById.set(n.id, n);

  // Deterministic order: sort wires by (sourceId, sourceOutputIndex, id).
  const sortedWires = [...(circuit.wires || [])].sort((a, b) => {
    const sa = String(a.sourceId ?? '');
    const sb = String(b.sourceId ?? '');
    if (sa !== sb) return sa < sb ? -1 : 1;
    const oa = a.sourceOutputIndex ?? 0;
    const ob = b.sourceOutputIndex ?? 0;
    if (oa !== ob) return oa - ob;
    return String(a.id ?? '') < String(b.id ?? '') ? -1 : 1;
  });

  for (const w of sortedWires) {
    const key = `${w.sourceId}:${w.sourceOutputIndex ?? 0}`;
    if (netByEndpoint.has(key)) continue;

    // If the source is a top-level INPUT/CLOCK, reuse the port name rather
    // than inventing a separate net — keeps output human-readable.
    const srcPort = portByNodeId.get(w.sourceId);
    if (srcPort && srcPort.dir === PORT_DIR.INPUT) {
      netByEndpoint.set(key, { name: srcPort.name, width: srcPort.width, isPort: true });
      continue;
    }

    const srcNode = nodeById.get(w.sourceId);
    const original = w.netName || null;
    const fallback = `net_${w.sourceId}_${w.sourceOutputIndex ?? 0}`;
    const name = uniqueIdentifier(original || fallback, usedNames, 'net');
    const net = makeNet({
      name,
      originalName: original,
      width: srcNode ? nodeBitWidth(srcNode) : 1,
      kind: NET_KIND.WIRE,
      sourceRef: SourceRef.fromWire(w.id),
    });
    nets.push(net);
    netByEndpoint.set(key, net);
  }

  // Ensure top-level OUTPUT ports appear as driven nets (matched by wire
  // targets). We do not emit separate wire decls for ports; toVerilog knows.
  return { nets, netByEndpoint };
}

export function fromCircuit(circuitJSON) {
  const circuit = circuitJSON || { nodes: [], wires: [] };
  const usedNames = new Set();
  const { ports, portByNodeId } = collectPorts(circuit, usedNames);
  const { nets, netByEndpoint } = collectNets(circuit, portByNodeId, usedNames);

  // Translator context — formalised here so Phases 3+ have a stable API.
  const nodeById = new Map();
  for (const n of (circuit.nodes || [])) nodeById.set(n.id, n);

  const ctx = {
    circuit,
    nodeById,
    portByNodeId,
    netByEndpoint,
    sanitize: sanitizeIdentifier,
    netOf(nodeId, outIdx = 0) {
      const key = `${nodeId}:${outIdx}`;
      return netByEndpoint.get(key) || null;
    },
    widthOf(nodeId) {
      const n = nodeById.get(nodeId);
      return n ? nodeBitWidth(n) : 1;
    },
    instanceName(node) {
      return sanitizeIdentifier(node.label || `u_${node.id}`, 'u');
    },
  };

  const instances = [];
  const unmapped = [];     // [{ type, nodeId }] — caller renders as // TODO
  const instUsedNames = new Set();

  for (const node of (circuit.nodes || [])) {
    if (!node.type) continue;
    if (node.type === 'INPUT' || node.type === 'OUTPUT' || node.type === 'CLOCK') continue;
    if (!hasTranslator(node.type)) {
      unmapped.push({ type: node.type, nodeId: node.id });
      continue;
    }
    const fn = getTranslator(node.type);
    const out = fn(node, ctx) || {};
    if (out.instance) {
      const inst = out.instance;
      // Enforce unique instance names.
      if (!inst.instanceName) inst.instanceName = ctx.instanceName(node);
      inst.instanceName = uniqueIdentifier(inst.instanceName, instUsedNames, 'u');
      instances.push(inst);
    }
    if (Array.isArray(out.instances)) {
      for (const inst of out.instances) {
        if (!inst.instanceName) inst.instanceName = ctx.instanceName(node);
        inst.instanceName = uniqueIdentifier(inst.instanceName, instUsedNames, 'u');
        instances.push(inst);
      }
    }
  }

  const ir = makeModule({
    name: 'top',
    ports,
    nets,
    instances,
    assigns: [],
    alwaysBlocks: [],
    memories: [],
    submodules: [],
  });
  // Non-IR metadata used by the pretty printer to render // TODO markers.
  ir._unmapped = unmapped;
  return ir;
}
