# HDL Toolchain — Semantics Contract

This document pins down exactly which slice of Verilog-2012 semantics the
Circuit Designer HDL Toolchain guarantees to preserve on export and recognise
on import. Anything outside this contract is rejected with a precise error —
never silently dropped or re-interpreted.

## Value domain

The Circuit Designer native simulator is **3-state**: `0`, `1`, `null`
(high-impedance, produced by `TRIBUF` and resolved on bus nodes — see
[js/engine/SimulationEngine.js](../engine/SimulationEngine.js)).

Mapping to Verilog's 4-state value set (`0 / 1 / x / z`):

| Verilog | Our value | Notes |
|---|---|---|
| `0` | `0` | identity |
| `1` | `1` | identity |
| `z` | `null` | high-impedance, resolves identically to native `TRIBUF` |
| `x` | **error** `HDL_ELAB_X_VALUE` | unknown values are rejected on import; emitted Verilog never contains `x` literals |

Rationale: `x` propagation is a Verilog-specific convenience that does not
correspond to any physical wire state. Accepting it would force our
simulator to grow an unknown-state, which changes semantics throughout the
canvas. Rejection is explicit and pushes the user to write defensible RTL.

## Blocking vs non-blocking assignment

Both `=` (blocking) and `<=` (non-blocking) are supported **within the usual
discipline**:

- Inside `always @(*)` (combinational) — blocking `=` only.
- Inside `always @(posedge clk …)` (sequential) — non-blocking `<=` only.

Mixed usage within a single `always` block is rejected with
`HDL_ELAB_MIXED_ASSIGN`.

## Sensitivity lists

Only two canonical forms accepted:

- `always @(*)` — combinational; sensitivity inferred from RHS nets. Any
  explicit sensitivity list on a combinational block must list exactly the
  RHS nets, otherwise it is a hard error (`HDL_ELAB_INCOMPLETE_SENSITIVITY`).
- `always @(posedge <clk>)` or `always @(posedge <clk> or negedge <rst_n>)`
  — sequential; at most one clock, at most one asynchronous reset.

`always @(negedge clk)`, level-sensitive latches, and multi-edge / multi-clock
blocks are accepted only if they match a known library cell
(D-latch, master-slave FF). Otherwise: `HDL_ELAB_UNSUPPORTED_ALWAYS`.

## Signed vs unsigned arithmetic

IR is **unsigned by default**. Signed semantics are expressed by inserting
explicit `SignExtend` nodes in the IR and emitting `$signed(...)` wrappers
in Verilog output.

- `wire signed [N-1:0] x;` in imported code → IR net flagged `signed: true`,
  and every read site gets a `SignExtend` or `$signed` wrapper.
- Comparisons and shifts that depend on signedness choose the signed operator
  form (`>>>`, `<<<`, `<=`, `>=` with `$signed`) deterministically.

## Tri-state buses

The Circuit Designer canvas uses internal tri-state heavily: `TRIBUF` and
`BUS` drive `null` when disabled, and the `BUS` node arbitrates among N
(data, enable) pairs (see [SimulationEngine.js:555](../engine/SimulationEngine.js#L555)).
Modern synthesis flows (Yosys, Vivado, Quartus) **do not accept internal
tri-state** — only top-level `inout` ports keep it. A naive export of our
`BUS` as `assign bus = en ? d : 1'bz` simulates correctly under iverilog
but fails synthesis.

**Decision:** the IR normalises internal tri-state to a one-hot multiplexer
during elaboration. The rule, applied by `ir/lowerTriState.js` (Phase 5):

| Source | Output (IR) | Output (Verilog) |
|---|---|---|
| Top-level `inout` port + N internal drivers | `tri` net, preserved drivers | `tri` net, `assign` per driver with `1'bz` default |
| Internal `BUS` with N (d_i, en_i) pairs | one-hot MUX instance | priority `case(en) 1'bN<<i: out = d_i; default: out = 0;` |
| `TRIBUF` feeding a net with exactly one driver | `assign` (the enable is ignored downstream because the net has one driver) | `assign net = d;` with a warning if the enable is not a known constant |

The elaborator runs `lowerTriState` as part of `fromCircuit` when
`options.synthesisSafe !== false` (default: on). A power-user flag
`synthesisSafe: false` preserves the raw tri-state emission for users who
only target simulation — documented in SUPPORTED.md alongside a warning
that the output will not synthesise.

`HDL_ELAB_TRI_CONFLICT` remains for the import side when a user-written `.v`
has conflicting drivers that our rewrite cannot resolve.

## Widths and extension

Every IR expression carries an explicit width. When an expression appears
in a context of a different width, one of:

- `ZeroExtend(inner, toWidth)` — unsigned zero fill,
- `SignExtend(inner, toWidth)` — replicate sign bit,
- `Slice(net, hi, lo)` — truncation,

must be inserted. The pretty printer emits these as `{N'b0, inner}`,
`{{N{inner[top]}}, inner}`, or `inner[hi:lo]` respectively.

Verilog's implicit width rules (context-determined expressions, self-determined
subexpressions) are **not honoured inside IR**. The elaborator performs
one-time width inference on import and materialises extensions; the exporter
never relies on implicit behaviour.

## Identifier stability

User-given net labels are preserved as `IRNet.originalName`. Export prefers
this name when it is a legal Verilog identifier; otherwise a sanitised
variant is used while the `originalName` is retained for round-trip.

Re-import restores `originalName` from the Verilog source. Two round-trips
produce byte-identical output.

## Determinism

Every stage of the pipeline is deterministic: given the same `circuitJSON`
(or the same Verilog source), `toVerilog` produces the exact same string
across runs, machines, and Node versions. Specifically:

- No `Date.now()`, `Math.random()`, or unseeded hashes in output.
- No `Map` / `Object` iteration without explicit sort.
- Header timestamps are emitted only when `opts.header === true`; round-trip
  diffs call `toVerilog` without headers.

## Unsupported constructs (list, v1)

The following are rejected on import with a precise line/col error:

- Real numbers (`real`, `realtime`)
- `time` type
- `specify` blocks
- UDPs (`primitive` … `endprimitive`)
- Delay controls (`#N`, `@(…)` outside `always` sensitivity lists)
- `fork` / `join`
- Force / release
- Hierarchical references (`a.b.c`) in expressions

`SUPPORTED.md` is the positive counterpart to this list and is updated
atomically as each phase expands the subset.
