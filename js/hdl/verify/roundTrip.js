// Round-trip harness: IRModule → Verilog → (parser) → IRModule, then equals.
//
// ⚠  IMPORTANT LIMITATION (Phase 2 through Phase 7):
//     The default parser here is a STUB. It returns the original IR
//     verbatim without ever reading the Verilog string. This means every
//     round-trip check via roundTripIR() with the stub is *vacuous* with
//     respect to Verilog fidelity — it only exercises the harness API and
//     the `equals` function. Real round-trip coverage begins at Phase 8
//     when the Verilog parser lands and the caller passes it in as
//     `parser`. Tests that rely on this harness between Phases 2 and 7
//     are foundation checks, not fidelity checks. Do not mistake a green
//     stub-round-trip for a proof that exported Verilog is re-importable.

import { toVerilog } from '../ir/toVerilog.js';
import { equals } from '../ir/equals.js';

export function roundTripIR(ir, { parser = stubParser } = {}) {
  const verilog = toVerilog(ir);
  const parsed = parser(verilog, ir);   // ir passed as sidecar for the stub
  const ok = equals(ir, parsed);
  return { ok, verilog, parsed };
}

// Stub parser — returns the sidecar IR verbatim. This is sufficient to
// exercise the harness and `equals` while the real parser is unimplemented.
function stubParser(_verilog, sidecarIR) {
  return sidecarIR;
}

// Determinism check: serialise n times, all outputs must be identical.
export function isDeterministic(ir, n = 10) {
  const first = toVerilog(ir);
  for (let i = 1; i < n; i++) {
    if (toVerilog(ir) !== first) return false;
  }
  return true;
}
