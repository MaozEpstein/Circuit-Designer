// CircuitValidator — runs at the entry of fromCircuit to produce HDLError[]
// without throwing. All findings are returned so the UI can surface them as
// a list; export proceeds on warnings, halts on errors (caller's decision).

import { hdlError, hdlWarn, SEVERITY } from './HDLError.js';
import { SourceRef } from './SourceRef.js';

const IO_TYPES = new Set(['INPUT', 'OUTPUT', 'CLOCK']);

export function validateCircuit(circuitJSON, { hasTranslator = () => true } = {}) {
  const errors = [];
  const circuit = circuitJSON || {};
  const nodes = Array.isArray(circuit.nodes) ? circuit.nodes : [];
  const wires = Array.isArray(circuit.wires) ? circuit.wires : [];

  // Duplicate node IDs.
  const nodeById = new Map();
  for (const n of nodes) {
    if (!n || typeof n !== 'object') {
      errors.push(hdlError('HDL_VALIDATE_MALFORMED_NODE', 'Encountered non-object entry in nodes[].'));
      continue;
    }
    if (!n.id) {
      errors.push(hdlError('HDL_VALIDATE_MISSING_ID', `Node of type "${n.type || '?'}" has no id.`));
      continue;
    }
    if (nodeById.has(n.id)) {
      errors.push(hdlError(
        'HDL_VALIDATE_DUPLICATE_ID',
        `Duplicate node id "${n.id}".`,
        { sourceRef: SourceRef.fromNode(n.id) },
      ));
      continue;
    }
    if (!n.type) {
      errors.push(hdlError(
        'HDL_VALIDATE_MISSING_TYPE',
        `Node "${n.id}" has no type.`,
        { sourceRef: SourceRef.fromNode(n.id) },
      ));
    }
    nodeById.set(n.id, n);
  }

  // Wire endpoint resolution.
  const wireById = new Map();
  for (const w of wires) {
    if (!w || typeof w !== 'object') {
      errors.push(hdlError('HDL_VALIDATE_MALFORMED_WIRE', 'Encountered non-object entry in wires[].'));
      continue;
    }
    if (w.id && wireById.has(w.id)) {
      errors.push(hdlError(
        'HDL_VALIDATE_DUPLICATE_WIRE_ID',
        `Duplicate wire id "${w.id}".`,
        { sourceRef: SourceRef.fromWire(w.id) },
      ));
    }
    if (w.id) wireById.set(w.id, w);

    if (w.sourceId && !nodeById.has(w.sourceId)) {
      errors.push(hdlError(
        'HDL_VALIDATE_DANGLING_SOURCE',
        `Wire ${w.id || '<anon>'} sourceId "${w.sourceId}" does not exist.`,
        { sourceRef: SourceRef.fromWire(w.id) },
      ));
    }
    if (w.targetId && !nodeById.has(w.targetId)) {
      errors.push(hdlError(
        'HDL_VALIDATE_DANGLING_TARGET',
        `Wire ${w.id || '<anon>'} targetId "${w.targetId}" does not exist.`,
        { sourceRef: SourceRef.fromWire(w.id) },
      ));
    }
  }

  // Translator presence — warning only, Phase 1 emits // TODO stubs.
  for (const n of nodes) {
    if (!n || !n.type || IO_TYPES.has(n.type)) continue;
    if (!hasTranslator(n.type)) {
      errors.push(hdlWarn(
        'HDL_VALIDATE_NO_TRANSLATOR',
        `No translator registered for component type "${n.type}" (node "${n.id}").`,
        {
          sourceRef: SourceRef.fromNode(n.id),
          hint: 'Export will emit a // TODO placeholder; implement a translator to produce real Verilog.',
        },
      ));
    }
  }

  return errors;
}

export function hasBlockingErrors(errors) {
  return errors.some(e => e.severity === SEVERITY.ERROR);
}
