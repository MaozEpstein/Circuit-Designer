// SourceRef — dual-mode location pointer carried by every IR node.
//
//   circuit-origin: { nodeId } or { wireId }
//   verilog-origin: { sourceFile, line, col, range? }
//
// A SourceRef is never null; use SourceRef.unknown() as a sentinel when no
// origin is available. Both modes may coexist on the same ref (e.g., after
// round-trip, the IR carries both the circuit nodeId it came from and the
// verilog line that produced its latest representation).

export function makeSourceRef({ sourceFile, line, col, range, nodeId, wireId } = {}) {
  const ref = Object.freeze({
    sourceFile: sourceFile ?? null,
    line: line ?? null,
    col: col ?? null,
    range: range ?? null,
    nodeId: nodeId ?? null,
    wireId: wireId ?? null,
  });
  return ref;
}

export const SourceRef = {
  unknown: () => makeSourceRef(),
  fromNode: (nodeId) => makeSourceRef({ nodeId }),
  fromWire: (wireId) => makeSourceRef({ wireId }),
  fromVerilog: (sourceFile, line, col, range) =>
    makeSourceRef({ sourceFile, line, col, range }),
};

export function formatSourceRef(ref) {
  if (!ref) return '<unknown>';
  if (ref.sourceFile && ref.line != null) {
    return `${ref.sourceFile}:${ref.line}${ref.col != null ? ':' + ref.col : ''}`;
  }
  if (ref.nodeId) return `node#${ref.nodeId}`;
  if (ref.wireId) return `wire#${ref.wireId}`;
  return '<unknown>';
}
