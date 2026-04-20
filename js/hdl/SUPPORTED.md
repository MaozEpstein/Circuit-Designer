# HDL Toolchain — Supported Verilog Subset

Each phase extends this document with concrete examples of what the importer
accepts and the exporter produces. Anything not listed here is outside the
subset and fails with a precise error (see [SEMANTICS.md](./SEMANTICS.md)).

## Phase 1 — Export skeleton ✓

- Empty modules: `module top; endmodule`.
- Port declarations for INPUT / CLOCK (`input`) and OUTPUT (`output`) nodes.
- Bus widths on ports via `[N-1:0]`.
- Identifier sanitisation (reserved words, illegal chars, leading digits).

## Phase 2 — IR & verification harness ✓

- All Phase-1 capabilities expressed through HDL-IR.
- Deterministic pretty-printing.
- Round-trip stub harness.
- No new user-visible Verilog constructs yet.

## Phase 3 — Combinational (pending)

Will add: `assign`, logic gate primitives (`and`, `or`, `xor`, `nand`, `nor`,
`xnor`, `not`, `buf`), `case`, MUX/DEMUX/Decoder/Encoder patterns.

## Phase 4 — Sequential (pending)

Will add: `always @(posedge clk)` blocks, `always @(posedge clk or negedge rst_n)`,
non-blocking assignment `<=`, level-sensitive latches.

## Phase 5 — Memory & CPU (pending)

Will add: `reg [W-1:0] mem [0:D-1]`, `$readmemh`, register files,
parametric sub-module instantiation.

(Subsequent phases populate this list atomically.)
