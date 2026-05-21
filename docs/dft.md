# DFT — Design For Test

The DFT subsystem provides hands-on test-infrastructure components and a fault-coverage analyzer. It is exposed via the **DFT** button (or `T`) in the HUD, which opens the DFT panel — a live read-out of every test structure in the current scene plus the fault-simulator results when a stimulus is applied.

The intent is pedagogical and demonstrative, not to ship an industrial ATPG flow. The **fault list view, scan-chain auto-detection, BIST/JTAG state machines, and signature compaction** are all wired to the same simulation engine that drives normal logic, so a student can drop in a SCAN-FF chain, generate an LFSR pattern, run the BIST controller, and watch a MISR signature converge — all inside the canvas.

## Components

| Component | Role |
|---|---|
| **SCAN_FF** | Scan flip-flop. Pin order `D, TI, TE, CLK → Q`. With `TE=0` it behaves as a normal D-FF; with `TE=1` it captures from `TI` (test-input). Chains form when one SCAN_FF's `Q` drives the next one's `TI`. |
| **LFSR** | Fibonacci linear-feedback shift register. Properties: `bitWidth`, `taps[]` (LSB-indexed), `seed`. Drives test patterns into a scan-in or directly onto a primary input. |
| **MISR** | Multiple-input signature register — a parallel-input LFSR used as a signature compactor. Reduces a long sequence of output values to a fixed-width fingerprint comparable against a *golden signature*. |
| **BIST_CONTROLLER** | Built-in self-test FSM. States: `IDLE → SETUP → RUN → COMPARE → DONE`. Drives the LFSR(s) for `runLength` cycles, then compares the MISR's signature against `goldenSignature`. |
| **JTAG_TAP** | IEEE 1149.1 Test Access Port. Implements the canonical 16-state TAP FSM (Test-Logic-Reset, Run-Test/Idle, Select-DR/IR-Scan, …, Update-DR/IR), an IR of `irBits` width, and a 32-bit ID code. |
| **BOUNDARY_SCAN_CELL** | Boundary-scan cell intended for chip-edge wiring. Two-mode operation: normal pass-through and test (capture/update through the JTAG TAP). |
| **MBIST_CONTROLLER** | Memory BIST controller. Walks a connected RAM through the **March C−** algorithm (`{ ⇕w0; ⇑r0,w1; ⇑r1,w0; ⇓r0,w1; ⇓r1,w0; ⇕r0 }`) and asserts `PASS` or `FAIL`. Pins: `START(0), RESET(1), DATA_IN(2, dataBits), CLK(3) → DONE, PASS, FAIL, TEST_MODE, STATE (3-bit), ADDR (addrBits), DATA_OUT (dataBits), WE, RE`. Designed to sit behind a four-MUX "MBIST collar" so the test mode takes over the RAM's `ADDR/DATA/WE/RE` lines from the functional drivers under `TEST_MODE`. |

### Memory-cell faults — `cellFaults` on RAM

`RAM` nodes carry an optional `cellFaults` map alongside `memory`:

```js
node.cellFaults = {
  3: { stuckAt: 1, bit: null }, // address 3, whole-word stuck-at-1
  5: { stuckAt: 0, bit: 2 },    // address 5, bit 2 only, stuck-at-0
}
```

Absent entry = clean cell. `bit: null` = whole-word fault (every bit of the cell). The engine applies the fault on **both** read and write paths (mirrors `_applyWireFault` for wires) — so the fault is storage-transparent and immune to test-order reshuffles. A write of `1` into a stuck-at-0 cell silently stores `0`; the next read returns `0` ≠ expected `1`; MBIST flags FAIL with the matching `failAddr` and `failBit`.

Wire-level fault state (`stuck-at-0`, `stuck-at-1`, `open`, `bridge`) is per-wire metadata read by both the simulator (live) and the fault simulator (golden vs faulty comparison).

### Transition delay faults — `slowToRise` / `slowToFall` on wires

The four wire-level faults above are **stateless** — the engine returns the same fault-affected value regardless of what the wire's value was a tick ago. Transition delay faults are different: they are a function of *(previous stable value, current target value)*. An at-speed test must drive the circuit with **two consecutive vectors** — V1 establishes the prior state, V2 launches the transition, and the FF capture clock samples the result. A wire that "didn't make it in time" presents the prior value to its sink for one cycle.

```js
wire.slowToRise = true;   // 0 → 1 transition on this wire returns 0 (prior)
wire.slowToFall = true;   // 1 → 0 transition on this wire returns 1 (prior)
```

These two flags share the existing `_applyWireFault` chokepoint. Precedence inside the chokepoint is:

```
open  →  stuck-at  →  transition (STR / STF)  →  bridge
```

A wire pre-armed with `open` or `stuckAt` is **not enumerated** for transition faults — the dominant fault would always mask the transition behaviour, so the candidate is meaningless. Bridging resolves last because it combines the post-fault local value with the partner wire's source.

**Engine state-tracking** — three engine-private fields per wire support this model:

- `wire._lastStableValue` — the value the wire settled to on the previous tick. Promoted from `_currentValue` at the **start** of each new tick's `evaluate()` (guarded by `_lastSnapshotStep` so re-entrant calls at the same step don't overwrite the prior-tick snapshot).
- `wire._currentValue` — cached at the **end** of each `evaluate()`. Becomes next tick's `_lastStableValue`.
- `wire._lastSnapshotStep` — the `stepCount` value at which `_lastStableValue` was last promoted. Acts as the "have I already promoted this tick?" guard.

These are not part of any public API. The only public hook is:

```js
import { resetTransitionState } from 'js/engine/SimulationEngine.js';
resetTransitionState(wires);
```

Call this before and after a fault-simulator run so prior-tick values do not leak between runs, or between a live interactive simulation and a fault sim. `simulateTransitionFaults` calls it internally at the top, between every pair-loop iteration, and at the end.

### `simulateTransitionFaults(nodes, wires, vectorPairs, opts)`

Sibling of `simulateFaults()`. Mirrors its `perFault` / `coverage` shape but takes **vector pairs** instead of single vectors:

```js
import { simulateTransitionFaults } from 'js/dft/FaultSimulator.js';

const result = simulateTransitionFaults(nodes, wires, [
  [[0,0], [0,1]],   // pair 0: V1=00, V2=01 — launches a transition on PI[1]
  [[0,1], [1,1]],   // pair 1: V1=01, V2=11 — launches on PI[0]
], { models: ['slow-to-rise', 'slow-to-fall'] });

// result.perFault[i]  = { id: 'w_0/str', wireId, kind: 'str'|'stf',
//                         detected, detectedBy: number[] }
// result.coverage     = { detected, total, percent }
// result.golden[i]    = primary-output values at V2 of pair i (no fault)
// result._pairs       = echo of vectorPairs
```

Per pair, the simulator runs V1 fault-free (seeds `_currentValue`), arms the candidate fault, runs V2, and compares V2 outputs to the golden V2 result. V1 outputs are identical by construction (fault not yet armed) so they are not compared. Detection is **pair-indexed**, not vector-indexed — `detectedBy: [0,2]` means pairs 0 and 2 caught the fault.

### Panel — RUN TRANSITION SIM

The DFT panel's header bar has a sibling button to RUN FAULT SIM: **RUN TRANSITION SIM**. Click → builds consecutive pairs from `scene._dft.vectors` (`[v0,v1], [v1,v2], …`), calls `simulateTransitionFaults`, and caches the result at `this._lastTransitionSim`. The FAULT LIST table grows two new columns (`STR`, `STF`) and the per-wire "detected by" cell shows `str p0,p1` / `stf p2` alongside the existing stuck-at detection. The FAULT COVERAGE section adds a second bar (blue-tinted) when transition results are present.

**Pairing convention**: consecutive only. To craft non-adjacent pairs, pass them directly to `simulateTransitionFaults` from code or a test — the panel UI doesn't expose arbitrary pair construction.

### Current limitations

- **No ATPG** for transition faults — vectors come from the caller / panel patterns. Random-pair ATPG and PODEM-class search are out of scope for this layer.
- **No interactive injection** UI — `wire.slowToRise = true` is set via code or JSON. The FAULT LIST pills are display-only, matching the existing stuck-at convention.
- **Combinational propagation only** — the engine applies the prior value at the chokepoint and returns. There is no notion of "the transition eventually arrives a few hundred ps later"; while the fault is armed, every faulty-direction transition fails for the entire tick. To model "eventually arrives", disarm the fault between ticks.
- **LOS / LOC distinction** — out of scope. The simulator doesn't care how V2 is produced; that's a test-pattern-generation concern.

## DFT Panel — `js/dft/ui/DFTPanel.js`

Single panel with collapsible sections. Each section is read-only when no scene state matches it (e.g., no SCAN_FFs → "Scan Chains" hides itself with a hint).

**Testability Overview** — wire count, fault candidates, detected vs. undetected (after the most recent fault-sim run), fault-coverage percentage, current vector count.

**Scan Chains** — auto-detected from the scene. The detector walks each SCAN_FF's `TI` driver: if it's another SCAN_FF's `Q`, the two are linked; the chain head is any SCAN_FF whose `TI` is *not* fed by another SCAN_FF. Per chain it shows: head, tail, length, `TE` source (which signal arms the scan mode), and the scan-in / scan-out endpoints. Chains of length 1 with no upstream/downstream linkage are flagged as "orphans" so they don't pollute the topology view.

**Pattern Generators (LFSRs)** — for each LFSR in the scene:
- Live state, period (computed by direct simulation up to `2^N` cycles), and feedback polynomial in `1 + x^a + x^b + … + x^N` form.
- Edit fields for `bitWidth`, `taps[]`, `seed` — saved through the standard command pipeline so the change is undoable.
- Sink resolution — where the LFSR's `Q` actually goes (scan-in to a chain, primary input, or "unused").
- Special states flagged: `seed === 0` (LFSR cannot advance), `taps === []` (no feedback, becomes a shifter), `period < 2^N − 1` (sub-maximal polynomial).

**Signature Compactor (MISR)** — golden signature comparison with selectable radix (BIN / DEC / HEX), polynomial display, parallel input count.

**BIST Controller** — current FSM state, `runLength` (how many RUN cycles before COMPARE), golden signature, pass/fail badge after a comparison.

**JTAG TAP** — current state in the 16-state FSM with a small diagram, IR contents, IDCODE, TMS/TCK trace.

**Fault List** — every wire × every active fault model. Columns: wire id, kind (`sa0` / `sa1` / `open` / `bridge`), detected by which test vectors, status badge.

**Fault Injection (manual)** — right-click any wire to inject `stuck-at-0`, `stuck-at-1`, `open`, or `bridge` (paired with another wire). The simulator honours the injection live; clearing is a single click.

> **Mobile:** the panel is fully read-only on mobile-viewer mode. All editing controls (LFSR fields, GEN RANDOM, RUN FAULT SIM, fullscreen) are hidden via CSS; the structural views remain.

## Fault Simulator — `js/dft/FaultSimulator.js`

Combinational fault simulator. Skips ATPG entirely — the user supplies test vectors, the simulator scores them against every candidate fault.

```js
import { simulateFaults } from 'js/dft/FaultSimulator.js';

const result = simulateFaults(nodes, wires, vectors, {
  models: ['stuck-at-0', 'stuck-at-1', 'open']  // default
});
```

**Inputs**
- `nodes`, `wires` — the scene.
- `vectors` — array of vectors. Each vector is one assignment to **all** primary inputs (sorted by node id), as an array of 0/1 of length `primaryInputs.length`.
- `opts.models` — which fault models to enumerate per wire. `'bridge'` is excluded from auto-enumeration since it requires a partner wire; manually-injected bridges are still scored.

**Output**
```ts
{
  primaryInputs:  Node[],
  primaryOutputs: Node[],
  golden:         Value[][],     // per-vector golden output values
  perFault: [{
    id:         string,          // e.g. "wire-7/sa0"
    wireId:     string,
    kind:       'sa0' | 'sa1' | 'open',
    detected:   boolean,
    detectedBy: number[],        // indices into vectors[]
  }, ...],
  coverage: { detected: number, total: number, percent: number },
}
```

**Algorithm**
1. **Golden run** — apply each vector, evaluate, record the OUTPUT values.
2. **Per-fault loop** — clear any pre-existing injection on the wire, mutate it with the candidate fault, re-evaluate every vector, compare to golden. First differing primary output flags detection. Restore the wire when done.
3. **Coverage** — `detected / total` across all candidate faults.

The simulator reads OUTPUTs by following the wire that targets each OUTPUT node and reading its `wireValue` from the engine result map — this is the single chokepoint that already honours `stuckAt` / `open`, so faults propagate correctly without a separate fault-aware engine.

## Helper Exports — `js/dft/ui/DFTPanel.js`

The panel module exports a handful of pure helpers usable from tests, the engine, or future tooling:

| Function | Purpose |
|---|---|
| `detectScanChains(scanFFs, wires)` | Walks `TI`/`Q` links, returns ordered chain arrays head→tail. |
| `describeChainEndpoints(chain, allNodes, wires)` | Resolves a chain's external `scanIn` driver and `scanOut` consumer (or `null`). |
| `lfsrPeriod(width, taps, seed)` | True period via direct simulation; capped at `2^N`. Returns `{ period, stuckAtZero, hitsZero }`. |
| `lfsrPolynomial(width, taps)` | Pretty-print `1 + x^a + x^b + … + x^N`. |
| `describeLfsrSinks(lfsr, allNodes, wires)` | Reports each LFSR `Q` consumer; flags scan-in usage so the panel can label the LFSR as a BIST source. |

All five functions are pure and stateless — they take a snapshot and return data, suitable for unit tests.

## Adding a New DFT Component

Follow the standard [component checklist](../CONTRIBUTING.md). DFT-specific notes:

- **Pin order matters for SCAN_FF-class components.** Auto-chain detection relies on `TI` being input index 1 (`(w.targetInputIndex || 0) === 1`).
- **LFSR/MISR translators land in `js/hdl/translators/dft.js`** when HDL Phase 4 enables sequential translators (see [hdl-plan.md](hdl-plan.md)).
- **Boundary-scan cells** must be wired to a JTAG TAP via the canonical IR/DR shift signals; the panel will not auto-detect them otherwise.

## What This DFT Layer is NOT

- **Not an ATPG engine.** Test vectors are user-supplied or LFSR-generated; there is no SAT/structural pattern-generation pass.
- **Not sequential fault simulation.** The fault simulator is pure-combinational — sequential fault sim (with state) requires a different harness.
- **Not industrial-grade compaction.** Real silicon compresses vectors via EDT (Mentor) / OPMISR (Cadence) — this is called out in the panel's `[compaction?]` tooltip.
- **Not transition / delay-fault aware.** Only static stuck-at + open + bridge in this layer.

These are deliberate scope decisions: the layer focuses on demonstrating the *structures* (scan chains, LFSR, MISR, BIST, JTAG) and the *coverage idea* (vectors → detected faults), not on building a production tool.
