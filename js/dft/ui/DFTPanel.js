// DFT (Design For Test) Panel.
//
// Parallel architecture to PipelinePanel — different abstraction
// (testability, fault coverage, scan chains, BIST, JTAG) but the
// same UI shape: a header bar, a summary row, and a body of
// collapsible sections, each rendered fresh on a render pass.
//
// Layer 0 (this file in this commit): scaffold only — empty body
// with a friendly placeholder. Subsequent layers add sections one
// at a time (Fault List, Coverage, Scan Chains, BIST LIVE, JTAG
// LIVE, etc.) by extending _render() with new section emitters.
//
// Mutual exclusion with PipelinePanel: opening DFT closes Pipeline
// and vice versa. Both panels share the bottom-right slot in the
// CSS, so showing both at once would overlap. Distinct accent
// colours (blue for Pipeline, orange for DFT) make it clear which
// is active.

import { bus } from '../../core/EventBus.js';
import { simulateFaults } from '../FaultSimulator.js';
import { generateATPGVector, generateATPGForUndetected } from '../ATPG.js';
import { RAM_PATTERNS, getRamPattern, WIRE_PATTERNS, getWirePattern } from '../TestPatterns.js';
import { runMemoryTest } from '../MemoryTestRunner.js';
import { diagnoseScene } from '../FaultDictionary.js';
import { evaluate as evaluateScene } from '../../engine/SimulationEngine.js';
import { setDftTrace } from '../../rendering/CanvasRenderer.js';

/**
 * Detect scan chains in a scene.
 *
 * A scan chain is a sequence of SCAN_FF nodes where each FF's TI
 * (Test Input, pin index 1) is wired from the Q output of the
 * previous SCAN_FF in the sequence. Chain heads are SCAN_FFs whose
 * TI input is NOT driven by another SCAN_FF (they receive scan-in
 * from a primary input or are unwired).
 *
 * @param {object[]} scanFFs - SCAN_FF nodes
 * @param {object[]} wires
 * @returns {Array<Array<object>>} list of chains, each an ordered
 *          list of SCAN_FF nodes from head to tail.
 */
/**
 * Resolve endpoint metadata for one detected chain — what drives the
 * head's TI (scan-in source), where the tail's Q goes (scan-out
 * sink), and which signal feeds the chain's TE pins (test enable).
 * Returns:
 *   { scanIn: { type, label, nodeId } | null,
 *     scanOut: { type, label, nodeId } | null,
 *     teSource: { type, label, nodeId } | null,
 *     teShared: bool }                       // every cell shares one TE driver
 *
 * `null` means "not driven from anything in the scene". A SCAN_FF
 * with an unwired TI is a chain head whose scan-in isn't connected;
 * a tail whose Q isn't observed externally is a chain whose pattern
 * response can't be read out — both are real DFT defects worth
 * surfacing in the panel.
 */
export function describeChainEndpoints(chain, allNodes, wires) {
  const nodeById = new Map(allNodes.map(n => [n.id, n]));
  const head = chain[0];
  const tail = chain[chain.length - 1];

  // Head's TI driver. If the head sits at the start of a chain, its
  // TI is by definition NOT another SCAN_FF — it's a primary input
  // (scan_in pad), some other gate's output, or unwired.
  const tiW = wires.find(w => w.targetId === head.id && w.targetInputIndex === 1);
  const scanIn = tiW
    ? (() => {
        const src = nodeById.get(tiW.sourceId);
        return src ? { type: src.type, label: src.label || src.id, nodeId: src.id } : null;
      })()
    : null;

  // Tail's Q consumer. The tail's Q drives whatever wire leaves it;
  // if that wire targets a non-SCAN_FF (since by chain detection no
  // downstream SCAN_FF receives this Q), we report the consumer.
  const qOut = wires.find(w => w.sourceId === tail.id && (w.sourceOutputIndex || 0) === 0);
  const scanOut = qOut
    ? (() => {
        const dst = nodeById.get(qOut.targetId);
        return dst ? { type: dst.type, label: dst.label || dst.id, nodeId: dst.id } : null;
      })()
    : null;

  // TE driver: is the same source feeding every TE pin in the chain?
  const teDrivers = chain.map(ff => {
    const w = wires.find(w2 => w2.targetId === ff.id && w2.targetInputIndex === 2);
    return w ? w.sourceId : null;
  });
  const distinct = new Set(teDrivers.filter(x => x !== null));
  const teShared = teDrivers.every(d => d !== null) && distinct.size === 1;
  const teSource = teShared
    ? (() => {
        const src = nodeById.get([...distinct][0]);
        return src ? { type: src.type, label: src.label || src.id, nodeId: src.id } : null;
      })()
    : null;

  return { scanIn, scanOut, teSource, teShared };
}

/**
 * Compute an LFSR's true period by direct simulation. Starts from
 * `seed`, runs the same Fibonacci shift the engine uses, and stops
 * when a state repeats (Floyd-style "first revisit" detection via a
 * Set). For a primitive polynomial of width N, the period equals
 * 2^N - 1 — every non-zero state visited exactly once. Anything
 * shorter means the polynomial is reducible / non-primitive (still
 * legal but useless for max-length BIST).
 *
 * Capped at 2^N iterations to keep wide LFSRs from hanging the UI.
 * Returns:
 *   { period, maxPeriod, isMaxLength, stuckAtZero }
 *   • stuckAtZero = seed is 0; the LFSR would never advance.
 */
export function lfsrPeriod(width, taps, seed) {
  width = Math.max(1, Math.min(24, width | 0));
  const mask = (1 << width) - 1;
  const maxPeriod = mask;     // 2^N - 1 — the all-zero state is excluded
  if ((seed & mask) === 0) return { period: 0, maxPeriod, isMaxLength: false, stuckAtZero: true };
  const seen = new Set();
  let s = seed & mask;
  while (!seen.has(s)) {
    seen.add(s);
    let xor = 0;
    for (const t of taps) xor ^= ((s >> t) & 1);
    s = (((s << 1) | xor) & mask) >>> 0;
    if (seen.size > maxPeriod) break;     // safety
  }
  return { period: seen.size, maxPeriod, isMaxLength: seen.size === maxPeriod, stuckAtZero: false };
}

/**
 * Format the tap list as a compact summary: degree + tap positions.
 * "x⁴ taps[3,0]" rather than a fully-expanded polynomial — the
 * Fibonacci-vs-Galois mapping rules differ across textbooks and
 * getting the symbolic form wrong is worse than skipping it.
 */
export function lfsrPolynomial(width, taps) {
  const sup = (n) => String(n).split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]).join('');
  const sorted = (taps || []).slice().sort((a, b) => b - a);
  return `x${sup(width)} taps[${sorted.join(',')}]`;
}

/**
 * Resolve where each LFSR's serial Q output is delivered. For DFT,
 * the interesting case is "Q drives the TI of a chain head" — that
 * marks the LFSR as a BIST pattern source. Returns:
 *   { sinks: [{ type, label, nodeId, isScanIn }], drivesScan: bool }
 */
export function describeLfsrSinks(lfsr, allNodes, wires) {
  const nodeById = new Map(allNodes.map(n => [n.id, n]));
  const sinks = wires
    .filter(w => w.sourceId === lfsr.id)
    .map(w => {
      const dst = nodeById.get(w.targetId);
      if (!dst) return null;
      const isScanIn = dst.type === 'SCAN_FF' && (w.targetInputIndex || 0) === 1;
      return { type: dst.type, label: dst.label || dst.id, nodeId: dst.id, isScanIn };
    })
    .filter(Boolean);
  return { sinks, drivesScan: sinks.some(s => s.isScanIn) };
}

/**
 * Resolve which RAM an MBIST_CONTROLLER is testing. The controller's
 * four "test" outputs (ADDR=5, DATA_OUT=6, WE=7, RE=8) usually run
 * through a 4-mux collar that selects between MBIST and functional
 * drivers under TEST_MODE. Walk each wire one hop (and through one
 * BUS_MUX hop if needed) and check whether all four converge on the
 * same RAM. Returns:
 *   { ram: RamNode|null, reason: 'ok'|'mismatched'|'partial'|'none',
 *     throughMux: bool }
 */
export function describeMbistDut(mbist, allNodes, wires) {
  if (!mbist || mbist.type !== 'MBIST_CONTROLLER') return { ram: null, reason: 'none', throughMux: false };
  const nodeById = new Map(allNodes.map(n => [n.id, n]));
  // For each MBIST output, walk forward: direct → RAM, or → BUS_MUX → RAM.
  const followToRam = (outIdx) => {
    const w = wires.find(w => w.sourceId === mbist.id && (w.sourceOutputIndex || 0) === outIdx);
    if (!w) return { ram: null, throughMux: false };
    const dst = nodeById.get(w.targetId);
    if (!dst) return { ram: null, throughMux: false };
    if (dst.type === 'RAM') return { ram: dst, throughMux: false };
    if (dst.type === 'BUS_MUX') {
      // Walk one more hop from the MUX's output.
      const w2 = wires.find(w => w.sourceId === dst.id);
      if (!w2) return { ram: null, throughMux: true };
      const dst2 = nodeById.get(w2.targetId);
      if (dst2 && dst2.type === 'RAM') return { ram: dst2, throughMux: true };
    }
    return { ram: null, throughMux: false };
  };
  const r5 = followToRam(5);
  const r6 = followToRam(6);
  const r7 = followToRam(7);
  const r8 = followToRam(8);
  const allRams = [r5.ram, r6.ram, r7.ram, r8.ram].filter(Boolean);
  const throughMux = r5.throughMux || r6.throughMux || r7.throughMux || r8.throughMux;
  if (allRams.length === 0) return { ram: null, reason: 'none', throughMux };
  if (allRams.length < 4) return { ram: null, reason: 'partial', throughMux };
  const firstId = allRams[0].id;
  if (!allRams.every(r => r.id === firstId)) return { ram: null, reason: 'mismatched', throughMux };
  return { ram: allRams[0], reason: 'ok', throughMux };
}

export function detectScanChains(scanFFs, wires) {
  if (scanFFs.length === 0) return [];
  const ffById = new Map(scanFFs.map(n => [n.id, n]));
  // For each SCAN_FF, find: who drives my TI? (prev), and who do I drive's TI? (next)
  const prevOf = new Map();   // ff.id → upstream SCAN_FF (or undefined)
  const nextOf = new Map();   // ff.id → downstream SCAN_FF (or undefined)
  for (const ff of scanFFs) {
    const tiWire = wires.find(w => w.targetId === ff.id && w.targetInputIndex === 1);
    if (tiWire && ffById.has(tiWire.sourceId)) {
      prevOf.set(ff.id, ffById.get(tiWire.sourceId));
      nextOf.set(tiWire.sourceId, ff);
    }
  }
  // Chain heads = SCAN_FFs with no prev. Walk forward via nextOf.
  const heads = scanFFs.filter(ff => !prevOf.has(ff.id));
  const chains = [];
  for (const head of heads) {
    const chain = [head];
    let cur = head;
    const seen = new Set([head.id]);
    while (nextOf.has(cur.id)) {
      const nxt = nextOf.get(cur.id);
      if (seen.has(nxt.id)) break;     // guard against accidental loops
      seen.add(nxt.id);
      chain.push(nxt);
      cur = nxt;
    }
    chains.push(chain);
  }
  return chains;
}

export class DFTPanel {
  constructor(sceneRef = null) {
    // Optional scene reference. When provided, sections like FAULT LIST
    // and TESTABILITY OVERVIEW enumerate the live scene's wires.
    this._scene   = sceneRef;
    this._el      = document.getElementById('dft-panel');
    this._header  = document.getElementById('dft-panel-header');
    this._summary = document.getElementById('dft-panel-summary');
    this._body    = document.getElementById('dft-panel-body');
    this._closeBtn   = document.getElementById('btn-dft-close');
    this._fsBtn      = document.getElementById('btn-dft-fullscreen');
    this._collapseAllBtn = document.getElementById('btn-dft-collapse-all');
    this._editAllBtn     = document.getElementById('btn-dft-edit-all');
    this._visible    = false;

    this._runBtn  = document.getElementById('btn-dft-run');
    this._genBtn  = document.getElementById('btn-dft-gen');
    this._genPopup= document.getElementById('dft-pattern-popup');
    this._traceToggleBtn = document.getElementById('btn-dft-trace');
    this._tracePrevBtn   = document.getElementById('btn-dft-trace-prev');
    this._traceNextBtn   = document.getElementById('btn-dft-trace-next');
    this._traceLabel     = document.getElementById('dft-trace-label');
    // Last-selected wire-pattern id — used to render an "active" tick
    // on the menu so the user remembers what they picked.
    this._wirePatternId = 'random';
    // Layer 2 — last fault-sim result. null until the user clicks RUN.
    // Cleared when the scene mutates (vectors / topology may have changed).
    this._lastSim = null;
    // Per-block collapsed state. Each entry is a block-id like
    // `chain_0` (positional, stable per scene) or `lfsr_<nodeId>` (by
    // node id, also stable). The set survives a re-render so the
    // user's fold choices aren't undone by a fault-sim refresh.
    this._collapsedBlocks     = new Set();
    this._collapsedSections   = new Set();
    // Top-level category collapse (OVERVIEW / STIMULUS / MEMORY /
    // BOUNDARY / DIAGNOSE). Survives re-render so the user's fold
    // choices aren't undone by a fault-sim tick.
    this._collapsedCategories = new Set();
    // Coupling-fault UI state, per RAM id:
    //   _couplingMode    — 'stuck' (default) | 'couple'
    //   _couplingPending — the address waiting for its partner (aggressor)
    //   _couplingDraft   — { aggressor, victim, type, trigger, ... } once
    //                       both endpoints are picked and the form is open
    // All three survive re-renders (the panel re-builds on every tick).
    this._couplingMode    = new Map();
    this._couplingPending = new Map();
    this._couplingDraft   = new Map();
    // Per-field LFSR edit state. Key shape: `<lfsrId>:<field>`. A
    // field is in view mode (read-only text + pencil) until the user
    // clicks the pencil; then it enters edit mode (input + save/
    // cancel). The set survives re-render so a partial edit isn't
    // lost when the panel refreshes for some other reason.
    this._editingFields = new Set();
    // Per-section info popovers — Set of section keys (e.g.
    // 'patterns') currently expanded. Each section can stash a small
    // explanatory block under its header via the ⓘ button.
    this._infoOpen = new Set();
    // Radix preference for the MISR signature compactor section.
    // 'bin' | 'dec' | 'hex'. Persists across renders. Decimal default
    // because that's what new users naturally read.
    this._misrRadix = 'dec';
    // Layer 2.5 — toggled when the user clicks the [source] tag in the
    // FAULT COVERAGE row. Expands an inline table of every test vector
    // and per-vector output, so the user can see exactly what stimulus
    // was applied without leaving the panel.
    this._vectorsViewOpen = false;
    // ATPG memo — fault-ids whose status was proved by a prior ATPG
    // call. `redundant` means exhaustive sweep found no detecting
    // vector (true untestable); `exhausted` means random search ran out
    // (could still be testable, just not found). Both sets are cleared
    // whenever the scene topology mutates — a new netlist invalidates
    // any prior redundancy claim.
    this._atpgRedundant = new Set();
    this._atpgExhausted = new Set();
    // Last ATPG run summary (added / redundant / exhausted counts) so
    // the coverage row can flash a small badge after a click.
    this._lastATPGSummary = null;
    // Last RUN FAULT SIM / GEN RANDOM bail reason — rendered as a
    // visible notice above the COVERAGE bar so the buttons aren't
    // silent on empty scenes.
    this._lastDiagnostic = null;
    // Last DIAGNOSE result (top-K suspects + observed signature). null
    // until the user clicks DIAGNOSE; cleared on topology mutation.
    this._lastDiagnosis = null;
    // TRACE overlay state (Phase 4).
    //  • _traceActive  — true while the TRACE toggle is on.
    //  • _traceVectorIdx — index into the active vector set being played.
    //  • _traceDiff    — Map<wireId, {golden, faulty}> for the current vector.
    // The canvas renderer reads the diff map via setDftTrace().
    this._traceActive    = false;
    this._traceVectorIdx = 0;
    this._traceDiff      = null;

    if (this._closeBtn) this._closeBtn.addEventListener('click', () => this.hide());
    if (this._fsBtn)    this._fsBtn.addEventListener('click', () => this._toggleFullscreen());
    if (this._collapseAllBtn) this._collapseAllBtn.addEventListener('click', () => this._toggleCollapseAll());
    if (this._editAllBtn)     this._editAllBtn.addEventListener('click', () => this._toggleEditAll());
    if (this._runBtn)   this._runBtn.addEventListener('click', () => this._runFaultSim());
    if (this._genBtn)   this._genBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggleGenPopup();
    });
    // Outside-click closes the popup.
    document.addEventListener('mousedown', (e) => {
      if (!this._genPopup || this._genPopup.classList.contains('hidden')) return;
      if (this._genBtn?.contains(e.target)) return;
      if (this._genPopup.contains(e.target)) return;
      this._genPopup.classList.add('hidden');
    });
    // Click on an item inside the popup → run that pattern, OR (if the
    // pattern is disabled) close the popup and surface the disabled
    // reason as a diagnostic banner. Never silently ignore the click.
    if (this._genPopup) {
      this._genPopup.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-pattern-id]');
        if (!btn) return;
        const id = btn.dataset.patternId;
        this._genPopup.classList.add('hidden');
        if (btn.classList.contains('is-disabled')) {
          // Recompute reason at click-time — keeps the message in sync
          // with whatever the current scene looks like (e.g. user
          // deleted a wire between popup-open and click).
          const piCount = (this._scene?.nodes || []).filter(n => n.type === 'INPUT').length;
          const wireCount = this._scene?.wires?.length || 0;
          const patternEntry = WIRE_PATTERNS.find(p => p.id === id);
          const est = this._estimateRunCost(patternEntry, piCount);
          const overPI = patternEntry?.maxPI && piCount > patternEntry.maxPI;
          let msg;
          if (overPI) {
            msg = `Pattern "${patternEntry.label}" is disabled — this scene has ${piCount} primary inputs, ` +
                  `which exceeds the ${patternEntry.maxPI}-PI cap (would generate ${(1 << patternEntry.maxPI).toLocaleString()} vectors). ` +
                  `Pick Random N=16, Walking-1, or Toggle-all-wires instead.`;
          } else {
            msg = `Pattern "${patternEntry?.label || id}" is disabled — running it would issue ` +
                  `~${est.cost.toLocaleString()} evaluations (${est.vectors.toLocaleString()} vectors × ${wireCount} wires × 3 fault models), ` +
                  `which would freeze the browser tab for minutes. Pick Random N=16, Walking-1, or Toggle-all-wires instead.`;
          }
          this._setDiagnostic(msg);
          return;
        }
        this._runWirePattern(id);
      });
    }
    // TRACE cluster — toggle overlay + step vectors.
    if (this._traceToggleBtn) this._traceToggleBtn.addEventListener('click', () => this._toggleTrace());
    if (this._tracePrevBtn)   this._tracePrevBtn  .addEventListener('click', () => this._stepTrace(-1));
    if (this._traceNextBtn)   this._traceNextBtn  .addEventListener('click', () => this._stepTrace(+1));

    // Event delegation for clicks inside the body — used by inline
    // toggle widgets like the [source ▸/▾] tag in the FAULT COVERAGE
    // row that expands the vectors table.
    if (this._body) {
      // Bind on mousedown specifically for actions whose target is
      // re-rendered every simulation tick — radix toggle, pencil
      // edit on a tick-rendered card, etc. Click never fires when
      // mouseup lands on a different DOM node than mousedown.
      this._body.addEventListener('mousedown', (e) => {
        // Category header click (OVERVIEW / STIMULUS / …) — top-level
        // collapse of an entire category and all sections within it.
        const catTrg = e.target.closest('[data-action="cat-toggle"]');
        if (catTrg) {
          e.preventDefault();
          const id = catTrg.dataset.catId;
          if (id) {
            if (this._collapsedCategories.has(id)) this._collapsedCategories.delete(id);
            else                                    this._collapsedCategories.add(id);
            if (this._visible) this._render();
          }
          return;
        }
        // Radix toggle.
        const radixTrg = e.target.closest('[data-action="misr-radix"]');
        if (radixTrg) {
          e.preventDefault();
          const r = radixTrg.dataset.radix;
          if (r === 'bin' || r === 'dec' || r === 'hex') {
            this._misrRadix = r;
            if (this._visible) this._render();
          }
          return;
        }
        // Info toggle. Bound on mousedown because the panel re-renders
        // every tick — a click event whose mousedown and mouseup land
        // on different DOM nodes never fires.
        const infoTrg = e.target.closest('[data-action="toggle-info"]');
        if (infoTrg) {
          e.preventDefault();
          e.stopPropagation();
          const section = infoTrg.dataset.section;
          if (!section) return;
          if (this._infoOpen.has(section)) this._closeInfoPopovers();
          else                              this._openInfoPopover(section);
          return;
        }
        // Section header collapse — same survival reasoning.
        const headerTrg = e.target.closest('.dft-section-header');
        if (headerTrg && !e.target.closest('button, [data-action]')) {
          const section = headerTrg.parentElement;
          if (section && section.classList.contains('dft-section')) {
            e.preventDefault();
            const id = section.dataset.section || '';
            const nowCollapsed = !section.classList.contains('dft-section-collapsed');
            section.classList.toggle('dft-section-collapsed', nowCollapsed);
            if (nowCollapsed) this._collapsedSections.add(id);
            else              this._collapsedSections.delete(id);
            const tog = headerTrg.querySelector('.dft-section-toggle');
            if (tog) tog.textContent = nowCollapsed ? '▸' : '▾';
          }
          return;
        }
        // MBIST cell-fault toggle: cycle clean → s-a-1 → s-a-0 → clean.
        // Click on a cell in the per-DUT injection grid mutates
        // `ram.cellFaults[addr]` directly (mirrors how wire faults
        // live on the wire object) and re-renders so the new state
        // shows up next tick.
        const cellTrg = e.target.closest('[data-action="mbist-cell-toggle"]');
        if (cellTrg) {
          e.preventDefault();
          const ramId = cellTrg.dataset.ramId;
          const addr  = parseInt(cellTrg.dataset.addr, 10);
          const bitRaw = cellTrg.dataset.bit;
          const ram = this._scene?.nodes?.find(n => n.id === ramId);
          if (!ram || ram.type !== 'RAM' || !Number.isFinite(addr)) return;
          // Mode-aware branch: STUCK cycles stuck-at as before; COUPLE
          // treats the click as a pair-selection step.
          const mode = this._couplingMode.get(ramId) || 'stuck';
          if (mode === 'couple') {
            this._handleCoupleClick(ramId, addr);
            return;
          }
          if (!ram.cellFaults) ram.cellFaults = {};
          const isWord = (bitRaw === 'word');
          const bit = isWord ? null : parseInt(bitRaw, 10);
          const cur = ram.cellFaults[addr] || null;
          const matches = cur && ((isWord && cur.bit === null) || (!isWord && cur.bit === bit));
          // Cycle: clean → s-a-1 → s-a-0 → clean (only for this addr/bit slot)
          if (!matches) {
            ram.cellFaults[addr] = { stuckAt: 1, bit: isWord ? null : bit };
          } else if (cur.stuckAt === 1) {
            ram.cellFaults[addr] = { stuckAt: 0, bit: isWord ? null : bit };
          } else {
            delete ram.cellFaults[addr];
          }
          bus.emit('node:edited', { node: ram, field: 'cellFaults' });
          if (this._visible) this._render();
          return;
        }
        // Coupling-mode toolbar — STUCK / COUPLE switch.
        const coupleModeTrg = e.target.closest('[data-action="couple-mode"]');
        if (coupleModeTrg) {
          e.preventDefault();
          const ramId = coupleModeTrg.dataset.ramId;
          const newMode = coupleModeTrg.dataset.mode;
          if (ramId && (newMode === 'stuck' || newMode === 'couple')) {
            this._couplingMode.set(ramId, newMode);
            // Switching mode cancels any pending pair / draft.
            this._couplingPending.delete(ramId);
            this._couplingDraft.delete(ramId);
            if (this._visible) this._render();
          }
          return;
        }
        // Form: change a field of the coupling draft (type, trigger, etc.).
        const coupleSetTrg = e.target.closest('[data-action="couple-set"]');
        if (coupleSetTrg) {
          e.preventDefault();
          const ramId = coupleSetTrg.dataset.ramId;
          const field = coupleSetTrg.dataset.field;
          const value = coupleSetTrg.dataset.value;
          const draft = this._couplingDraft.get(ramId);
          if (draft && field) {
            const numericFields = new Set(['forceTo', 'aggressorValue']);
            draft[field] = numericFields.has(field) ? parseInt(value, 10) : value;
            this._couplingDraft.set(ramId, draft);
            if (this._visible) this._render();
          }
          return;
        }
        // Form: ADD button — commits the draft as a new couplingFaults entry.
        const coupleAddTrg = e.target.closest('[data-action="couple-add"]');
        if (coupleAddTrg) {
          e.preventDefault();
          this._commitCouplingDraft(coupleAddTrg.dataset.ramId);
          return;
        }
        // Form: CANCEL — discards the draft.
        const coupleCancelTrg = e.target.closest('[data-action="couple-cancel"]');
        if (coupleCancelTrg) {
          e.preventDefault();
          this._couplingDraft.delete(coupleCancelTrg.dataset.ramId);
          if (this._visible) this._render();
          return;
        }
        // List row: ✕ button — remove a coupling entry.
        const coupleRemoveTrg = e.target.closest('[data-action="couple-remove"]');
        if (coupleRemoveTrg) {
          e.preventDefault();
          const ramId = coupleRemoveTrg.dataset.ramId;
          const idx   = parseInt(coupleRemoveTrg.dataset.idx, 10);
          const ram = this._scene?.nodes?.find(n => n.id === ramId);
          if (ram && Number.isFinite(idx) && Array.isArray(ram.couplingFaults)) {
            ram.couplingFaults.splice(idx, 1);
            bus.emit('node:edited', { node: ram, field: 'couplingFaults' });
            if (this._visible) this._render();
          }
          return;
        }
        // Pencil edit / save / cancel — also re-rendered every tick.
        const editTrg = e.target.closest('[data-action="lfsr-edit"], [data-action="lfsr-save"], [data-action="lfsr-cancel"]');
        if (editTrg) {
          e.preventDefault();
          const lfsrId = editTrg.dataset.lfsrId;
          const field  = editTrg.dataset.field;
          if (!lfsrId || !field) return;
          const action = editTrg.dataset.action;
          if (action === 'lfsr-edit') {
            this._editingFields.add(`${lfsrId}:${field}`);
            if (this._visible) this._render();
            const inp = this._body.querySelector(`input[data-lfsr-id="${lfsrId}"][data-field="${field}"]`);
            inp?.focus(); inp?.select?.();
          } else if (action === 'lfsr-save') {
            const inp = this._body.querySelector(`input[data-lfsr-id="${lfsrId}"][data-field="${field}"]`);
            if (inp) this._commitLfsrEdit(inp);
            this._editingFields.delete(`${lfsrId}:${field}`);
            if (this._visible) this._render();
          } else if (action === 'lfsr-cancel') {
            this._editingFields.delete(`${lfsrId}:${field}`);
            if (this._visible) this._render();
          }
          return;
        }
        // DIAGNOSE button — rank suspect faults from observed mismatches.
        const diagRun = e.target.closest('[data-action="diag-run"]');
        if (diagRun) {
          e.preventDefault();
          this._runDiagnosis();
          return;
        }
        // Click a suspect row → select that fault's wire on the canvas.
        const diagSel = e.target.closest('[data-action="diag-select"]');
        if (diagSel) {
          e.preventDefault();
          this._selectDiagnosisFault(diagSel.dataset.faultId);
          return;
        }
        // Memory test ▶ RUN. Runs the selected pattern against the
        // RAM and caches the result.
        const memRun = e.target.closest('[data-action="memtest-run"]');
        if (memRun) {
          e.preventDefault();
          this._runMemoryTest(memRun.dataset.ramId);
          return;
        }
        // ATPG single-fault target. The 🎯 button next to a UND entry
        // in the FAULT LIST. Runs ATPG synchronously, then appends the
        // generated vector to the active set and re-runs fault sim.
        const atpgOne = e.target.closest('[data-action="atpg-target"]');
        if (atpgOne) {
          e.preventDefault();
          this._runATPGForFault(atpgOne.dataset.faultId);
          return;
        }
        // ATPG all undetected. The 🎯 button in the FAULT COVERAGE row.
        const atpgAll = e.target.closest('[data-action="atpg-all"]');
        if (atpgAll) {
          e.preventDefault();
          this._runATPGAllUndetected();
          return;
        }
        // Per-block (chain / lfsr / misr / bist) collapse.
        const blockHeader = e.target.closest('.dft-chain-block[data-block-id] .dft-chain-header');
        if (blockHeader && !e.target.closest('.dft-chain-status[data-action], button, [data-action]')) {
          const block = blockHeader.closest('.dft-chain-block');
          const id = block?.dataset.blockId;
          if (id) {
            e.preventDefault();
            if (this._collapsedBlocks.has(id)) {
              this._collapsedBlocks.delete(id);
              block.classList.remove('collapsed');
            } else {
              this._collapsedBlocks.add(id);
              block.classList.add('collapsed');
            }
            const tog = blockHeader.querySelector('.dft-chain-toggle');
            if (tog) tog.textContent = block.classList.contains('collapsed') ? '▸' : '▾';
          }
          return;
        }
      });
      // toggle-vectors stays on click — it's outside the per-tick
      // re-render path. Pencil edit / save / cancel moved to the
      // mousedown listener above for the same survival reason.
      this._body.addEventListener('click', (e) => {
        const trg = e.target.closest('[data-action]');
        if (!trg) return;
        if (trg.dataset.action === 'toggle-vectors') {
          this._vectorsViewOpen = !this._vectorsViewOpen;
          if (this._visible) this._render();
          return;
        }
        // misr-radix and toggle-info are handled in the mousedown
        // listener above — click doesn't fire reliably here because
        // the panel re-renders mid-touch.
      });
      // <select> changes — used by memtest-algo dropdown. Native
      // change event fires reliably regardless of re-render timing.
      this._body.addEventListener('change', (e) => {
        const sel = e.target.closest('select[data-action]');
        if (!sel) return;
        if (sel.dataset.action === 'memtest-algo') {
          this._setMemoryTestAlgo(sel.dataset.ramId, sel.value);
        }
      });
      // Keyboard shortcuts inside the LFSR edit input — Enter saves,
      // Escape cancels.
      this._body.addEventListener('keydown', (e) => {
        const inp = e.target.closest('input[data-lfsr-id]');
        if (!inp) return;
        if (e.key === 'Enter') {
          e.preventDefault();
          this._commitLfsrEdit(inp);
          this._editingFields.delete(`${inp.dataset.lfsrId}:${inp.dataset.field}`);
          if (this._visible) this._render();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this._editingFields.delete(`${inp.dataset.lfsrId}:${inp.dataset.field}`);
          if (this._visible) this._render();
        }
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._el?.classList.contains('dft-fullscreen')) {
        this._toggleFullscreen();
      }
    });
    // Top-toolbar DFT button — parallel to the ANALYSIS button.
    document.getElementById('btn-dft-toggle')?.addEventListener('click', () => this.toggle());

    // Re-render on scene mutations so the panel reflects the current
    // circuit. Topology changes invalidate the cached fault-sim result —
    // a stale coverage % over a different netlist would be misleading.
    const refresh = () => {
      this._lastSim = null;
      // Topology changes invalidate any prior ATPG verdict — the same
      // fault on a different netlist may have a different answer.
      this._atpgRedundant.clear();
      this._atpgExhausted.clear();
      this._lastATPGSummary = null;
      this._lastDiagnostic = null;
      this._lastDiagnosis  = null;
      // Trace overlay is wire-id-keyed; a topology mutation can leave
      // stale entries. Clear and turn off — the user can re-engage.
      if (this._traceActive) {
        this._traceActive = false;
        this._traceDiff = null;
        setDftTrace(null);
        this._updateTraceButtons();
      }
      // Coupling UI is RAM-id-keyed; clear pending/draft state on topology mutation.
      this._couplingPending.clear();
      this._couplingDraft.clear();
      if (this._visible) this._render();
    };
    bus.on('node:added',     refresh);
    bus.on('node:removed',   refresh);
    bus.on('wire:added',     refresh);
    bus.on('wire:removed',   refresh);
    bus.on('scene:loaded',   refresh);
    bus.on('node:props-changed', refresh);

    // Live telemetry channel for BIST / JTAG / coverage updates.
    // Layer 0 just stores the latest payload; later layers read it
    // in their section renderers.
    this._liveData = {};
    bus.on('runtime:dft-data', (payload) => {
      this._liveData = payload || {};
      // Skip per-tick re-render while the user is interacting with a
      // form control in the body. innerHTML-replacing the body destroys
      // the underlying <select>, which in turn forces the browser to
      // close its native popup — so without this guard a select can
      // never stay open long enough to pick an option (and any edit
      // input loses focus mid-type) while the auto-clock is running.
      const ae = document.activeElement;
      if (ae && this._body && this._body.contains(ae)) {
        const tag = ae.tagName;
        if (tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA') return;
      }
      if (this._visible) this._render();
    });
  }

  show() {
    if (!this._el) return;
    this._el.classList.remove('hidden');
    document.getElementById('btn-dft-toggle')?.classList.add('active');
    this._visible = true;
    this._render();
  }

  hide() {
    if (!this._el) return;
    this._el.classList.add('hidden');
    document.getElementById('btn-dft-toggle')?.classList.remove('active');
    this._visible = false;
    // Disable trace overlay when panel closes so the canvas isn't left
    // with a stale diff highlight. Re-toggle by reopening + clicking
    // TRACE again.
    if (this._traceActive) {
      this._traceActive = false;
      this._traceDiff = null;
      setDftTrace(null);
      this._updateTraceButtons();
    }
  }

  toggle() {
    if (this._visible) this.hide();
    else this.show();
  }

  _toggleFullscreen() {
    if (!this._el) return;
    const on = this._el.classList.toggle('dft-fullscreen');
    if (this._fsBtn) this._fsBtn.textContent = on ? 'EXIT FS' : 'FULLSCREEN';
    if (this._collapseAllBtn) this._collapseAllBtn.style.display = on ? '' : 'none';
    if (this._editAllBtn)     this._editAllBtn.style.display     = on ? '' : 'none';
    if (on) {
      this._fsSaved = {
        width:    this._el.style.width,
        height:   this._el.style.height,
        fontSize: this._el.style.fontSize,
      };
      this._el.style.width    = '';
      this._el.style.height   = '';
      this._el.style.fontSize = '';
      if (this._summary && this._body && this._summary.parentNode !== this._body) {
        this._body.insertBefore(this._summary, this._body.firstChild);
      }
    } else {
      if (this._fsSaved) {
        this._el.style.width    = this._fsSaved.width;
        this._el.style.height   = this._fsSaved.height;
        this._el.style.fontSize = this._fsSaved.fontSize;
        this._fsSaved = null;
      }
      if (this._summary && this._body && this._summary.parentNode === this._body) {
        this._el.insertBefore(this._summary, this._body);
      }
    }
  }

  // Fullscreen-only "collapse all / expand all". Toggles between
  // every section + per-block being folded vs. all open. State lives
  // alongside the per-section / per-block sets so individual users
  // can still drill back in after a global expand.
  _toggleCollapseAll() {
    // Discover live section ids from the DOM (set by
    // _applyCollapsibleSections from each header's className).
    const sectionIds = Array.from(this._body?.querySelectorAll('.dft-section') || [])
      .map(s => s.dataset.section).filter(Boolean);
    const blockIds = Array.from(this._body?.querySelectorAll('.dft-chain-block[data-block-id]') || [])
      .map(b => b.dataset.blockId).filter(Boolean);
    const anyOpen = sectionIds.some(s => !this._collapsedSections.has(s)) ||
                    blockIds.some(b => !this._collapsedBlocks.has(b));
    if (anyOpen) {
      sectionIds.forEach(s => this._collapsedSections.add(s));
      blockIds.forEach(b => this._collapsedBlocks.add(b));
      if (this._collapseAllBtn) this._collapseAllBtn.textContent = '▸ EXPAND ALL';
    } else {
      this._collapsedSections.clear();
      this._collapsedBlocks.clear();
      if (this._collapseAllBtn) this._collapseAllBtn.textContent = '▾ COLLAPSE ALL';
    }
    if (this._visible) this._render();
  }

  // Fullscreen-only "edit all / save all". Opens every editable
  // field (LFSR seed/taps/width, MISR golden, BIST runLength/golden)
  // for parallel editing; on second press, commits each one and
  // returns to view mode.
  _toggleEditAll() {
    const allNodes = this._scene?.nodes || [];
    const fields = [];
    allNodes.forEach(n => {
      if (n.type === 'LFSR') {
        fields.push(`${n.id}:bitWidth`, `${n.id}:seed`, `${n.id}:taps`);
      } else if (n.type === 'MISR') {
        fields.push(`${n.id}:bitWidth`, `${n.id}:seed`, `${n.id}:taps`, `${n.id}:goldenSig`);
      } else if (n.type === 'BIST_CONTROLLER') {
        fields.push(`${n.id}:runLength`, `${n.id}:goldenSig`);
      } else if (n.type === 'JTAG_TAP') {
        fields.push(`${n.id}:irBits`, `${n.id}:idcode`);
      }
    });
    const anyEditing = fields.some(k => this._editingFields.has(k));
    if (anyEditing) {
      // SAVE ALL — commit every open input, then close.
      fields.forEach(k => {
        if (!this._editingFields.has(k)) return;
        const [id, field] = k.split(':');
        const inp = this._body?.querySelector(
          `input[data-lfsr-id="${id}"][data-field="${field}"]`);
        if (inp) this._commitLfsrEdit(inp);
        this._editingFields.delete(k);
      });
      if (this._editAllBtn) this._editAllBtn.textContent = '✎ EDIT ALL';
    } else {
      fields.forEach(k => this._editingFields.add(k));
      if (this._editAllBtn) this._editAllBtn.textContent = '💾 SAVE ALL';
    }
    if (this._visible) this._render();
  }

  // Render pass. Layer 0 only emits the placeholder body — every
  // subsequent layer adds a section by extending this method (or by
  // appending more `_render*` calls). Each section is wrapped by
  // _applyCollapsibleSections() at the end so headers become
  // toggleable.
  _render() {
    if (!this._body || !this._summary) return;
    const wires    = this._scene?.wires || [];
    const wireCnt  = wires.length;
    const injStuck = wires.filter(w => w.stuckAt === 0 || w.stuckAt === 1).length;
    const injOpen  = wires.filter(w => w.open).length;
    const injBrdg  = wires.filter(w => w.bridgedWith).length;
    const injTotal = injStuck + injOpen + injBrdg;
    const faultCnt = wireCnt * 2;       // potential s-a-0 + s-a-1 sites

    this._summary.innerHTML = `
      <span class="k">Wires</span><span class="v">${wireCnt}</span>
      <span class="k">Faults possible (s-a-0 + s-a-1)</span><span class="v">${faultCnt}</span>
      <span class="k">Injected (stuck / open / bridge)</span><span class="v">${injStuck} / ${injOpen} / ${injBrdg}</span>
    `;

    // Compose by 5 top-level categories. Each section renders ''
    // when empty (e.g. no SCAN_FFs in scene), and an empty category
    // is dropped entirely — so the panel only shows what's relevant
    // to the current scene plus the always-on Overview & Diagnose
    // catalogue rows.
    const sections = {
      overview:  this._renderTestabilityOverview(wires, { injStuck, injOpen, injBrdg, injTotal }),
      coverage:  this._renderFaultCoverage(),
      scan:      this._renderScanChains(),
      lfsr:      this._renderPatternGenerators(),
      misr:      this._renderSignatureCompactors(),
      bist:      this._renderBistControllers(),
      memtest:   this._renderMemoryTests(),
      mbist:     this._renderMbistControllers(),
      jtag:      this._renderJtagTaps(),
      diagnosis: this._renderDiagnosis(),
      faultlist: this._renderFaultList(wires),
    };
    const CATEGORIES = [
      { id: 'overview', label: 'OVERVIEW',  ids: ['overview', 'coverage']            },
      { id: 'stimulus', label: 'STIMULUS',  ids: ['scan', 'lfsr', 'misr', 'bist']    },
      { id: 'memory',   label: 'MEMORY',    ids: ['memtest', 'mbist']                },
      { id: 'boundary', label: 'BOUNDARY',  ids: ['jtag']                            },
      { id: 'diagnose', label: 'DIAGNOSE',  ids: ['diagnosis', 'faultlist']          },
    ];
    this._body.innerHTML = CATEGORIES.map(cat => {
      const inner = cat.ids.map(id => sections[id]).filter(h => h && h.trim()).join('');
      if (!inner) return '';
      const collapsed = this._collapsedCategories?.has(cat.id);
      return `
        <div class="dft-category${collapsed ? ' dft-category-collapsed' : ''}" data-category="${cat.id}">
          <div class="dft-category-header" data-action="cat-toggle" data-cat-id="${cat.id}">
            <span class="dft-category-toggle">${collapsed ? '▸' : '▾'}</span>
            <span class="dft-category-label">${cat.label}</span>
            <span class="dft-category-rule"></span>
          </div>
          <div class="dft-category-body">${inner}</div>
        </div>`;
    }).join('');

    this._applyCollapsibleSections();
  }

  // ── Run the combinational fault simulator on the current scene ─
  // Vectors come from `scene._dft?.vectors` (set by demo JSONs or by
  // future UI). If absent, fall back to a small canonical sweep:
  // all-zero, all-one, walking-1. Result is cached on this._lastSim
  // and surfaced via _renderFaultCoverage + the detection column in
  // _renderFaultList.
  _runFaultSim() {
    if (!this._scene) {
      this._setDiagnostic('no scene attached to DFT panel');
      return;
    }
    const inputs  = this._scene.nodes.filter(n => n.type === 'INPUT');
    const outputs = this._scene.nodes.filter(n => n.type === 'OUTPUT');
    if (inputs.length === 0) {
      this._setDiagnostic('No INPUT nodes — drop at least one INPUT to enable test patterns.');
      return;
    }
    if (outputs.length === 0) {
      this._setDiagnostic('No OUTPUT nodes — coverage cannot be measured without primary outputs.');
      return;
    }
    if ((this._scene.wires || []).length === 0) {
      this._setDiagnostic('No wires — connect INPUTs through gates to OUTPUTs first.');
      return;
    }
    const vectors = this._scene._dft?.vectors || this._defaultVectors();
    if (!vectors.length) {
      this._setDiagnostic('No vectors and no inputs found — unexpected. Check the scene.');
      return;
    }
    this._lastSim = simulateFaults(this._scene.nodes, this._scene.wires, vectors, {
      models: ['stuck-at-0', 'stuck-at-1', 'open'],
    });
    this._lastSim._vectors = vectors;
    // Vector source (manual / random / atpg-stub) — surfaced in the
    // FAULT COVERAGE row so the user knows whether the % comes from a
    // hand-crafted set or random testing.
    this._lastSim._source =
      this._scene._dft?.source ||
      (this._scene._dft?.vectors ? 'manual' : 'default-sweep');
    this._lastDiagnostic = null;     // success clears any prior notice.
    // If trace is on, the new vector set might have a different length —
    // clamp the playback index and recompute the diff for the new v0.
    if (this._traceActive) {
      const N = this._scene._dft?.vectors?.length || 0;
      if (N === 0) this._traceVectorIdx = 0;
      else this._traceVectorIdx = Math.min(this._traceVectorIdx, N - 1);
      this._recomputeTraceDiff();
      this._updateTraceButtons();
    }
    if (this._visible) this._render();
  }

  // Layer 2.5: replace the active vector set with N random vectors.
  // Honest baseline — production flow would use ATPG (TetraMAX, Modus)
  // to target each fault directly. Random testing usually saturates
  // below 100 % because hard-to-sensitise faults need crafted vectors.
  _generateRandomVectors(N = 16) {
    if (!this._scene) {
      this._setDiagnostic('no scene attached to DFT panel');
      return;
    }
    const inputs = this._scene.nodes
      .filter(n => n.type === 'INPUT')
      .sort((a, b) => (a.id || '').localeCompare(b.id || ''));
    if (inputs.length === 0) {
      this._setDiagnostic('GEN RANDOM: no INPUT nodes in scene — random vectors need primary inputs to assign 0/1 values to.');
      return;
    }
    const vectors = Array.from({ length: N }, () =>
      inputs.map(() => Math.random() < 0.5 ? 0 : 1)
    );
    this._scene._dft = { vectors, source: 'random' };
    this._runFaultSim();
  }

  // Set a transient notice rendered above the FAULT COVERAGE bar. Used
  // when RUN FAULT SIM / GEN RANDOM bail because the scene is missing
  // INPUT or OUTPUT nodes — without this the buttons would appear dead.
  _setDiagnostic(msg) {
    this._lastDiagnostic = msg;
    console.warn('[DFT]', msg);
    if (this._visible) this._render();
  }

  // TRACE — toggle the live wire-diff overlay on the canvas. When on,
  // pushes a Map<wireId, {golden, faulty}> to the renderer via the
  // exported setDftTrace(). The map covers wires whose value differs
  // between the fault-free run (golden) and the current scene run
  // (faulty), under the currently selected vector.
  _toggleTrace() {
    if (!this._traceActive) {
      // Need vectors to play. Use the active set or default sweep.
      if (!this._scene) return;
      const vecs = this._scene._dft?.vectors;
      if (!vecs || vecs.length === 0) {
        this._setDiagnostic('TRACE: no vectors active — pick one from GEN ▾ first.');
        return;
      }
      this._traceActive = true;
      this._traceVectorIdx = Math.min(this._traceVectorIdx, vecs.length - 1);
      this._recomputeTraceDiff();
    } else {
      this._traceActive = false;
      this._traceDiff = null;
      setDftTrace(null);
    }
    this._updateTraceButtons();
    if (this._visible) this._render();
  }

  _stepTrace(delta) {
    if (!this._traceActive || !this._scene?._dft?.vectors) return;
    const N = this._scene._dft.vectors.length;
    if (N === 0) return;
    this._traceVectorIdx = ((this._traceVectorIdx + delta) % N + N) % N;
    this._recomputeTraceDiff();
    this._updateTraceButtons();
    if (this._visible) this._render();
  }

  // Compute the per-wire delta map for the current vector. Snapshots
  // wire injection state, runs evaluate() with NO injection (golden),
  // restores injection, runs evaluate() again (faulty), and builds the
  // diff map of wires that disagree. Mirrors how FaultSimulator probes
  // each fault candidate against the golden run.
  _recomputeTraceDiff() {
    if (!this._scene) { this._traceDiff = null; setDftTrace(null); return; }
    const vecs = this._scene._dft?.vectors;
    if (!vecs || vecs.length === 0) { this._traceDiff = null; setDftTrace(null); return; }
    const vec = vecs[this._traceVectorIdx] || vecs[0];
    const primaryInputs = this._scene.nodes
      .filter(n => n.type === 'INPUT')
      .sort((a, b) => (a.id || '').localeCompare(b.id || ''));

    const applyVector = () => {
      const restore = primaryInputs.map(n => ({ n, prev: n.fixedValue }));
      primaryInputs.forEach((n, i) => { n.fixedValue = vec[i] ?? 0; });
      return () => restore.forEach(({ n, prev }) => { n.fixedValue = prev; });
    };

    // Snapshot wire fault state.
    const wireSnap = this._scene.wires.map(w => ({
      w, stuckAt: w.stuckAt ?? null, open: !!w.open, bridgedWith: w.bridgedWith || null,
    }));
    const clearAll = () => {
      this._scene.wires.forEach(w => { w.stuckAt = null; w.open = false; w.bridgedWith = null; });
    };
    const restoreAll = () => {
      wireSnap.forEach(s => { s.w.stuckAt = s.stuckAt; s.w.open = s.open; s.w.bridgedWith = s.bridgedWith; });
    };

    // Golden run — no faults active.
    let goldenWV = null;
    let faultyWV = null;
    try {
      clearAll();
      const rPI1 = applyVector();
      const rG = evaluateScene(this._scene.nodes, this._scene.wires, new Map(), 0);
      goldenWV = rG.wireValues;
      rPI1();
      restoreAll();

      // Faulty run — faults restored.
      const rPI2 = applyVector();
      const rF = evaluateScene(this._scene.nodes, this._scene.wires, new Map(), 0);
      faultyWV = rF.wireValues;
      rPI2();
    } catch (e) {
      restoreAll();
      console.error('[trace]', e);
      this._traceDiff = null;
      setDftTrace(null);
      return;
    }

    const diff = new Map();
    for (const w of this._scene.wires) {
      const g = goldenWV.get(w.id);
      const f = faultyWV.get(w.id);
      if (g !== f) diff.set(w.id, { golden: g, faulty: f });
    }
    this._traceDiff = diff;
    setDftTrace(this._traceActive ? diff : null);
  }

  // Update the visible state of the TRACE cluster (button on/off,
  // index label, prev/next disabled state).
  _updateTraceButtons() {
    if (this._traceToggleBtn) {
      this._traceToggleBtn.classList.toggle('active', this._traceActive);
      this._traceToggleBtn.textContent = this._traceActive ? 'TRACE ●' : 'TRACE';
    }
    const N = this._scene?._dft?.vectors?.length || 0;
    const enabled = this._traceActive && N > 0;
    if (this._tracePrevBtn) this._tracePrevBtn.disabled = !enabled;
    if (this._traceNextBtn) this._traceNextBtn.disabled = !enabled;
    if (this._traceLabel) {
      this._traceLabel.textContent = enabled
        ? `v${this._traceVectorIdx} of ${N}`
        : '—';
    }
  }

  // Rough cost of running fault-sim with a given pattern against the
  // current scene. Each pattern produces V vectors; the simulator then
  // runs ≈ V × wires × models evaluate() calls. On a fast machine each
  // eval is ~0.1 ms; under 100K evals = under ~10 s in browser (still
  // blocking, but completes). 500K+ evals practically hangs the tab.
  _estimateRunCost(patternEntry, piCount) {
    if (!patternEntry) return { cost: 0, vectors: 0, wires: 0 };
    if (patternEntry.maxPI && piCount > patternEntry.maxPI) return { cost: Infinity, vectors: 0, wires: 0 };
    let V = 0;
    switch (patternEntry.id) {
      case 'random':       V = 16; break;
      case 'toggleAll':    V = 2; break;
      case 'walkingOne':   V = piCount + 1; break;
      case 'walkingZero':  V = piCount + 1; break;
      case 'defaultSweep': V = piCount + 2; break;
      case 'exhaustive':   V = 1 << piCount; break;
      default:             V = 16;
    }
    const wires = this._scene?.wires?.length || 0;
    const models = 3;     // sa0 + sa1 + open
    return { cost: V * wires * models, vectors: V, wires };
  }

  // Threshold for refusing to run on UI thread. 200_000 ≈ 30 s in
  // browser — acceptable. Above this, refuse and ask the user to pick
  // a cheaper pattern.
  static get RUN_COST_LIMIT() { return 200_000; }

  // GEN ▾ — populate and toggle the wire-pattern dropdown. Renders
  // every entry from WIRE_PATTERNS as a button. The pattern that was
  // last chosen on this panel gets an `.active` tint so the user knows
  // which one is "live". Patterns that would freeze the browser tab
  // (exhaustive past its PI cap OR projected run-cost beyond the safe
  // limit) render as visibly-disabled rows with a red badge + the
  // reason inline. They REMAIN clickable so that a click surfaces the
  // same explanation in the panel's diagnostic banner — the rule of
  // thumb here is "never silently ignore a user action".
  _toggleGenPopup() {
    if (!this._genPopup) return;
    const isHidden = this._genPopup.classList.contains('hidden');
    if (!isHidden) { this._genPopup.classList.add('hidden'); return; }
    // Compute current PI count so we can disable exhaustive when needed.
    const piCount = (this._scene?.nodes || []).filter(n => n.type === 'INPUT').length;
    const wireCount = this._scene?.wires?.length || 0;
    const LIMIT = DFTPanel.RUN_COST_LIMIT;
    const items = WIRE_PATTERNS.map(p => {
      const est = this._estimateRunCost(p, piCount);
      const overPI   = p.maxPI && piCount > p.maxPI;
      const overCost = est.cost > LIMIT;
      const disabled = overPI || overCost;
      const tag = p.maxPI ? `≤${p.maxPI} PIs` : '';
      const active = (p.id === this._wirePatternId) ? ' active' : '';
      // Reason string surfaces in two places:
      //   1. Inline below the pattern name in the popup (replaces description).
      //   2. The diagnostic banner if the user actually clicks the disabled row.
      const reason = overPI
        ? `${piCount} PIs > ${p.maxPI}-PI cap (would generate ${(1 << p.maxPI).toLocaleString()} vectors)`
        : overCost
        ? `would run ~${est.cost.toLocaleString()} evaluations (${est.vectors.toLocaleString()} vectors × ${wireCount} wires × 3 models) — tab would freeze`
        : null;
      const inlineText = disabled
        ? `<span class="dft-pattern-disabled-reason">${reason}</span>`
        : `<span class="dft-pattern-item-desc">${p.description}</span>`;
      const tip = disabled ? `Disabled — ${reason}.\n\nClick for full explanation.` : p.description;
      return `
        <button class="dft-pattern-item${active}${disabled ? ' is-disabled' : ''}"
                data-pattern-id="${p.id}"
                title="${tip.replace(/"/g, '&quot;')}">
          <div class="dft-pattern-item-label">
            <span class="dft-pattern-item-name">${p.label}</span>
            ${disabled ? '<span class="dft-pattern-disabled-badge">disabled</span>' : ''}
            <span class="dft-pattern-item-tag">${tag}</span>
          </div>
          ${inlineText}
        </button>`;
    }).join('');
    this._genPopup.innerHTML = items;
    this._genPopup.classList.remove('hidden');
  }

  // Apply one wire pattern: generate vectors via TestPatterns, stash on
  // scene._dft.vectors, and run fault sim. Reuses the existing source
  // metadata pipeline — the FAULT COVERAGE row's source chip picks up
  // the pattern label automatically.
  _runWirePattern(patternId) {
    if (!this._scene) {
      this._setDiagnostic('no scene attached to DFT panel');
      return;
    }
    const inputs = this._scene.nodes
      .filter(n => n.type === 'INPUT')
      .sort((a, b) => (a.id || '').localeCompare(b.id || ''));
    if (inputs.length === 0) {
      this._setDiagnostic('No INPUT nodes — wire patterns need primary inputs to assign 0/1 to.');
      return;
    }
    const patternEntry = WIRE_PATTERNS.find(p => p.id === patternId);
    const est = this._estimateRunCost(patternEntry, inputs.length);
    if (est.cost > DFTPanel.RUN_COST_LIMIT) {
      this._setDiagnostic(
        `Pattern "${patternEntry?.label || patternId}" would run ~${est.cost.toLocaleString()} evaluations ` +
        `(${est.vectors} vectors × ${est.wires} wires × 3 fault models). ` +
        `That would freeze the browser for minutes — refusing. Pick Random N=16, Toggle-all-wires, ` +
        `or Walking-1 instead.`,
      );
      return;
    }
    const result = getWirePattern(patternId, inputs.length);
    if (!result) {
      this._setDiagnostic(`Pattern "${patternId}" unavailable for ${inputs.length} primary inputs (likely past its PI cap).`);
      return;
    }
    this._wirePatternId = patternId;
    this._scene._dft = { vectors: result.vectors, source: patternId };
    this._runFaultSim();
  }

  // ATPG for a single fault. Targets the fault from a FAULT LIST row
  // (e.g. "wire-7/sa0"), appends the generated vector to the active
  // set, and re-runs fault sim so the row turns green next render.
  // On miss, records the verdict (redundant / exhausted) so the UI
  // shows it instead of the [🎯] button on subsequent renders.
  _runATPGForFault(faultId) {
    if (!this._scene) return;
    const r = generateATPGVector(this._scene.nodes, this._scene.wires, faultId);
    if (r.success) {
      const existing = this._scene._dft?.vectors || [];
      this._scene._dft = {
        vectors: [...existing, r.vector],
        source: 'atpg',
      };
      this._atpgRedundant.delete(faultId);
      this._atpgExhausted.delete(faultId);
      this._lastATPGSummary = { added: 1, redundant: 0, exhausted: 0, bad: 0 };
      this._runFaultSim();
    } else {
      if (r.reason === 'redundant')         this._atpgRedundant.add(faultId);
      else if (r.reason === 'search-exhausted') this._atpgExhausted.add(faultId);
      console.warn('[ATPG]', faultId, '→', r.reason);
      this._lastATPGSummary = {
        added: 0,
        redundant: r.reason === 'redundant' ? 1 : 0,
        exhausted: r.reason === 'search-exhausted' ? 1 : 0,
        bad: (r.reason !== 'redundant' && r.reason !== 'search-exhausted') ? 1 : 0,
      };
      if (this._visible) this._render();
    }
  }

  // ATPG for every undetected fault in the most recent sim. Appends
  // one vector per success, then re-runs fault sim — typically lifts
  // coverage to 100 % minus the redundant set.
  _runATPGAllUndetected() {
    if (!this._scene || !this._lastSim) return;
    const r = generateATPGForUndetected(this._scene.nodes, this._scene.wires, this._lastSim);
    r.redundant.forEach(id => this._atpgRedundant.add(id));
    r.exhausted.forEach(id => this._atpgExhausted.add(id));
    this._lastATPGSummary = {
      added: r.added.length,
      redundant: r.redundant.length,
      exhausted: r.exhausted.length,
      bad: r.bad.length,
    };
    if (r.added.length === 0) {
      if (this._visible) this._render();
      return;
    }
    const existing = this._scene._dft?.vectors || [];
    this._scene._dft = {
      vectors: [...existing, ...r.added.map(a => a.vector)],
      source: 'atpg',
    };
    this._runFaultSim();
  }

  // Default vector sweep when the scene doesn't ship its own: all-zero,
  // all-one, then one walking-1 per primary input. Modest coverage but
  // always available — the user can override by editing `scene._dft.vectors`.
  _defaultVectors() {
    const inputs = (this._scene?.nodes || [])
      .filter(n => n.type === 'INPUT')
      .sort((a, b) => (a.id || '').localeCompare(b.id || ''));
    const N = inputs.length;
    if (N === 0) return [];
    const allZero = Array(N).fill(0);
    const allOne  = Array(N).fill(1);
    const walking = Array.from({ length: N }, (_, i) => {
      const v = Array(N).fill(0); v[i] = 1; return v;
    });
    return [allZero, allOne, ...walking];
  }

  // ── FAULT COVERAGE ──────────────────────────────────────────
  _renderFaultCoverage() {
    const cvHeader = `<span class="dft-section-title">FAULT COVERAGE` +
      `<button class="dft-info-btn" data-action="toggle-info" data-section="coverage" title="What does this section show?">i</button>` +
      `</span>`;
    const cvInfo = this._infoOpen.has('coverage') ? `
      <div class="dft-info-panel">
        <div class="dft-info-lead">Fraction of the scene's possible faults that the active test vectors actually flag — the headline metric of any DFT flow. The bar is coloured by industry tiers: &lt;70 % red, 70–90 % amber, ≥90 % green.</div>
      </div>` : '';
    // Diagnostic banner — surfaces why a click on RUN FAULT SIM / GEN
    // RANDOM didn't change anything (empty scene, no inputs, etc.).
    // Without this the buttons appear dead and the user has no idea
    // why nothing happens.
    const diag = this._lastDiagnostic
      ? `<div class="dft-empty" style="background:rgba(204,64,64,0.08);border:1px solid #cc404044;border-radius:4px;color:#ffb0b0;padding:8px 12px;margin:8px 12px 0">⚠ ${this._lastDiagnostic}</div>`
      : '';
    if (!this._lastSim) {
      return `
        <div class="dft-coverage-header dft-section-header">${cvHeader}</div>${cvInfo}
        ${diag}
        <div class="dft-empty">Click <b style="color:#ffb878">RUN FAULT SIM</b> in the header to score the test vectors against every wire fault. Coverage and per-fault detection rows will populate the table below.</div>
      `;
    }
    const { coverage, _vectors, _source } = this._lastSim;
    const pct = coverage.percent;
    const barW = Math.max(2, pct);
    // Colour the bar by quality tier — under 70 red-ish, 70-90 amber,
    // 90+ green (the industry rule of thumb for "shippable").
    const tier = pct < 70 ? '#cc4040' : pct < 90 ? '#cca040' : '#40cc60';
    // Per-source label + tooltip so the user (or interviewer reading
    // over their shoulder) sees whether the % was achieved with a
    // crafted set, random testing, or a fallback sweep.
    const sourceMeta = {
      'manual':         { label: 'manual',         color: '#ffb878', tip: 'Vectors crafted by hand for this scene (or shipped with the demo). In production this is an early starting point — ATPG quickly takes over.' },
      'random':         { label: 'random N=' + _vectors.length, color: '#cc99ff', tip: 'Random testing — honest baseline. Production flow uses ATPG which targets each fault directly. Random tends to plateau before 100 %.' },
      'walkingOne':     { label: 'walking-1 N=' + _vectors.length, color: '#cc99ff', tip: 'Walking-1 over primary inputs: all-zero baseline + one PI=1 at a time. Isolates per-input observability — useful for diagnosis.' },
      'walkingZero':    { label: 'walking-0 N=' + _vectors.length, color: '#cc99ff', tip: 'Walking-0 over primary inputs: all-one baseline + one PI=0 at a time. Mirror of walking-1.' },
      'exhaustive':     { label: 'exhaustive N=' + _vectors.length, color: '#40cc60', tip: 'Every 2^N input combination. Complete combinational coverage — any combinational fault that has a detecting vector will be caught.' },
      'toggleAll':      { label: 'toggle-all N=' + _vectors.length, color: '#cc99ff', tip: 'All-zero + all-one. Minimum stimulus that drives every PI through both polarities.' },
      'defaultSweep':   { label: 'default sweep',  color: '#876',    tip: 'Default fallback set: all-zero, all-one, walking-1 per primary input.' },
      'default-sweep':  { label: 'default sweep',  color: '#876',    tip: 'Default fallback set: all-zero, all-one, walking-1 per primary input. Click GEN ▾ for a wider catalogue.' },
      'atpg':           { label: 'atpg N=' + _vectors.length, color: '#40cc60', tip: 'Vectors generated by the built-in ATPG (exhaustive ≤ 16 PIs, random sampling above). Each appended vector targets one previously-undetected fault — coverage climbs monotonically as you click 🎯 on UND rows.' },
    };
    const sm = sourceMeta[_source] || sourceMeta['default-sweep'];

    // Count undetected faults; render the [🎯 ATPG N UND] chip if any.
    const undCount = this._lastSim.perFault.filter(f => !f.detected).length;
    const atpgChip = undCount > 0
      ? `<span data-action="atpg-all" style="color:#40cc60;margin-left:6px;cursor:pointer;border:1px solid #40cc6066;border-radius:10px;padding:1px 8px;font-size:0.88em;user-select:none" title="Run ATPG on every undetected fault.\nExhaustive sweep when ≤16 primary inputs (proves redundancy); bounded random above.">🎯 ATPG ${undCount} UND</span>`
      : '';

    // ATPG run summary chip (last click outcome).
    const sum = this._lastATPGSummary;
    const summaryChip = sum && (sum.added + sum.redundant + sum.exhausted + sum.bad) > 0
      ? `<span style="color:#876;margin-left:6px;font-size:0.88em">
          ${sum.added ? `<span style="color:#40cc60">+${sum.added} vec</span>` : ''}
          ${sum.redundant ? ` <span style="color:#cc4040" title="Exhaustive ATPG proved no vector exists.">${sum.redundant} redundant</span>` : ''}
          ${sum.exhausted ? ` <span style="color:#cca040" title="Random search ran out — could still be testable.">${sum.exhausted} exhausted</span>` : ''}
        </span>`
      : '';
    // Test-compaction talking point: zero-code UI hint that production
    // ATPG output (50K+ vectors) is compressed before tester delivery.
    return `
      <div class="dft-coverage-header dft-section-header">${cvHeader}</div>${cvInfo}
      <div class="dft-perf-row" style="grid-template-columns: 1fr">
        <div style="display:flex;align-items:center;gap:1em;flex-wrap:wrap">
          <div style="flex:1;min-width:200px;background:#1a1208;border:1px solid #401a00;border-radius:3px;height:18px;position:relative;overflow:hidden">
            <div style="position:absolute;left:0;top:0;bottom:0;width:${barW}%;background:linear-gradient(90deg,${tier}88,${tier});box-shadow:0 0 8px ${tier}66;transition:width 0.3s"></div>
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:bold;color:#fff;font-size:0.92em;text-shadow:0 0 4px #000">
              ${pct}% — ${coverage.detected} of ${coverage.total} faults
            </div>
          </div>
          <span style="color:#876;font-size:0.92em">
            ${_vectors.length} vector${_vectors.length === 1 ? '' : 's'}
            <span data-action="toggle-vectors" style="color:${sm.color};margin-left:6px;cursor:pointer;border-bottom:1px dotted ${sm.color}66;user-select:none" title="${sm.tip}\n\nClick to ${this._vectorsViewOpen ? 'hide' : 'view'} the vectors used.">[${sm.label}${this._vectorsViewOpen ? ' ▾' : ' ▸'}]</span>
            ${atpgChip}
            ${summaryChip}
            <span style="color:#666;margin-left:6px;cursor:help;border-bottom:1px dotted #66666666" title="In silicon, ATPG produces 50 000+ vectors which are then compressed via EDT (Mentor) / OPMISR (Cadence) before being shipped to the tester — sending raw vectors over 50× more tester time would be uneconomic.">[compaction?]</span>
          </span>
        </div>
        ${this._vectorsViewOpen ? this._renderVectorsTable() : ''}
      </div>
    `;
  }

  // ── Inline vectors table (toggled by clicking the [source] tag) ─
  // Shows: vec idx, every primary input bit, the OUTPUT value(s), and
  // a small per-vector "detected" count so the user can see which
  // vectors are pulling their weight.
  _renderVectorsTable() {
    if (!this._lastSim) return '';
    const { _vectors, primaryInputs, primaryOutputs, golden, perFault } = this._lastSim;

    // Per-vector detection count — how many faults this vector caught
    // (counted as "first vector to detect" so credit is unique).
    const firstDetector = new Map();   // vecIdx → count
    for (let i = 0; i < _vectors.length; i++) firstDetector.set(i, 0);
    perFault.forEach(f => {
      if (f.detectedBy.length > 0) {
        const first = f.detectedBy[0];
        firstDetector.set(first, (firstDetector.get(first) || 0) + 1);
      }
    });

    const inHdr  = primaryInputs.map(n  => `<th style="padding:2px 6px;color:#876">${(n.label || n.id).slice(0,4)}</th>`).join('');
    const outHdr = primaryOutputs.map(n => `<th style="padding:2px 6px;color:#cca040">${(n.label || n.id).slice(0,8)}</th>`).join('');

    const rows = _vectors.map((vec, vi) => {
      const inCells  = vec.map(b => `<td style="padding:1px 6px;text-align:center;color:${b ? '#40cc60' : '#666'};font-weight:bold">${b}</td>`).join('');
      const outCells = (golden[vi] || []).map(o => {
        const txt = o === null || o === undefined ? '∅' : String(o);
        const col = o === 1 ? '#cca040' : o === 0 ? '#666' : '#cc4040';
        return `<td style="padding:1px 6px;text-align:center;color:${col};font-weight:bold">${txt}</td>`;
      }).join('');
      const dCount = firstDetector.get(vi) || 0;
      const dCol   = dCount === 0 ? '#666' : dCount < 3 ? '#cca040' : '#40cc60';
      return `<tr>
        <td style="padding:1px 6px;color:#876">v${vi}</td>
        ${inCells}
        ${outCells}
        <td style="padding:1px 6px;text-align:right;color:${dCol};font-size:0.88em">${dCount === 0 ? '<span style="color:#555">—</span>' : '+' + dCount + ' caught'}</td>
      </tr>`;
    }).join('');

    return `
      <div style="margin-top:8px;padding:8px 12px;background:rgba(204,153,255,0.04);border:1px solid #2a1a3a;border-radius:4px">
        <div style="color:#876;font-size:0.88em;margin-bottom:6px">
          Stimulus applied to the scene's primary inputs, with the resulting OUTPUT values from the golden (fault-free) run. The right column shows how many faults each vector was the FIRST to detect — vectors with "—" are redundant under the current set.
        </div>
        <table style="border-collapse:collapse;font-family:'JetBrains Mono',monospace;font-size:0.92em">
          <thead>
            <tr style="border-bottom:1px solid #401a40">
              <th style="padding:2px 6px;color:#876;text-align:left">vec</th>
              ${inHdr}
              ${outHdr}
              <th style="padding:2px 6px;color:#876;text-align:right">first to detect</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  // ── TESTABILITY OVERVIEW ────────────────────────────────────
  _renderTestabilityOverview(wires, inj) {
    const wireCnt   = wires.length;
    const faultCnt  = wireCnt * 2;
    const nodeCnt   = this._scene?.nodes?.length || 0;
    const ffCnt     = (this._scene?.nodes || []).filter(
      n => /FF|FLIPFLOP|REGISTER|LATCH/.test(n.type || '')
    ).length;
    const ovHeader = `<span class="dft-section-title">TESTABILITY OVERVIEW` +
      `<button class="dft-info-btn" data-action="toggle-info" data-section="overview" title="What does this section show?">i</button>` +
      `</span>`;
    const ovInfo = this._infoOpen.has('overview') ? `
      <div class="dft-info-panel">
        <div class="dft-info-lead">Top-line counts for the scene: how many wires (each is two potential stuck-at sites), how many flip-flops, and how many faults you've manually injected via the wire context menu.</div>
      </div>` : '';
    return `
      <div class="dft-overview-header dft-section-header">${ovHeader}</div>${ovInfo}
      <div class="dft-perf-row">
        <span class="k">Nodes / Wires</span><span class="v">${nodeCnt} / ${wireCnt}</span>
        <span class="k">FFs (state-holding)</span><span class="v">${ffCnt}</span>
        <span class="k">Total faults possible (s-a)</span><span class="v">${faultCnt}</span>
        <span class="k">Injected — stuck-at</span><span class="v" style="color:#ff9933">${inj.injStuck}</span>
        <span class="k">Injected — open</span><span class="v" style="color:#ff4040">${inj.injOpen}</span>
        <span class="k">Injected — bridging</span><span class="v" style="color:#cc66ff">${inj.injBrdg}</span>
      </div>
    `;
  }

  // ── SCAN CHAINS ─────────────────────────────────────────────
  // Auto-detects scan chains in the scene by walking each SCAN_FF's
  // TI input back to its source. If the source is the Q output of
  // another SCAN_FF, those two are chained. We follow the chain
  // forward (each Q can feed at most one downstream TI) until it
  // ends. Multiple disjoint chains in the same scene are supported.
  _renderScanChains() {
    const allNodes = this._scene?.nodes || [];
    const wires    = this._scene?.wires || [];
    const scanFFs  = allNodes.filter(n => n.type === 'SCAN_FF');
    const totalFFs = allNodes.filter(
      n => /FF|FLIPFLOP|REGISTER|LATCH/.test(n.type || '')
    ).length;

    // Reusable header (title + ⓘ button) + the popover panel for the
    // chain-status legend. Same shape and styling as the Pattern
    // Generators help, just different content.
    const chainHeaderHtml = `<span class="dft-section-title">SCAN CHAINS` +
      `<button class="dft-info-btn" data-action="toggle-info" data-section="chains" title="What do the chain status pills mean?">i</button>` +
      `</span>`;
    const chainInfoPanel = this._infoOpen.has('chains') ? `
      <div class="dft-info-panel">
        <div class="dft-info-lead">Scan chains shift test vectors serially through every flip-flop, replacing the design's normal datapath during test mode. Status flags wiring completeness.</div>
        <div class="dft-info-row">
          <span class="dft-chain-status ok">healthy</span>
          <span class="dft-info-text">scan-in + scan-out wired AND a single TE source feeds every cell.</span>
        </div>
        <div class="dft-info-row">
          <span class="dft-chain-status warn">warn</span>
          <span class="dft-info-text">One end unwired, or each cell uses a different TE driver.</span>
        </div>
        <div class="dft-info-row">
          <span class="dft-chain-status bad">broken</span>
          <span class="dft-info-text">Both scan-in AND scan-out unwired — chain can't be tested.</span>
        </div>
        <div class="dft-info-row">
          <span class="dft-chain-status bad">orphan</span>
          <span class="dft-info-text">Lone SCAN_FF with nothing wired to its TI — not part of any chain.</span>
        </div>
      </div>
    ` : '';

    // Hide entire section when no SCAN_FFs — the panel's category
    // structure (STIMULUS group) already signals that scan-chain UI
    // would live here. An empty stub adds noise without information.
    if (scanFFs.length === 0) return '';
    const chains = detectScanChains(scanFFs, wires);
    const scanInserted = scanFFs.length;
    const scanability = totalFFs > 0 ? Math.round((scanInserted / totalFFs) * 100) : 100;

    // Categorise chains: a chain of length 1 whose SCAN_FF has neither
    // a TI driver from a SCAN_FF (it's a head by definition) NOR a
    // downstream SCAN_FF consuming its Q is an "orphan" — present in
    // the scene but not wired into any actual chain. Worth flagging.
    const isOrphan = (chain) => {
      if (chain.length !== 1) return false;
      const ff = chain[0];
      const tiW = wires.find(w => w.targetId === ff.id && w.targetInputIndex === 1);
      return !tiW;     // head with no TI driver at all
    };

    // Pad renderer — rounded "scan-in / scan-out" port at either end
    // of the flow. Empty pads (unwired) keep the shape but get the
    // dashed-red `.empty` style so the chain reads as broken.
    const padHtml = (e, kind, missingMsg) => {
      if (!e) return `
        <div class="dft-chain-pad empty">
          <small>${kind}</small>
          <strong>(unwired)</strong>
          <small title="${missingMsg}">⚠</small>
        </div>`;
      return `
        <div class="dft-chain-pad">
          <small>${kind}</small>
          <strong>${e.label}</strong>
          <small>${e.type}</small>
        </div>`;
    };

    // Health classifier — drives the status pill colour and label.
    // healthy : both ends wired AND TE shared  → green pill
    // warn    : TE shared but missing one end, or per-cell TE       → amber pill
    // bad     : both ends unwired (incl. orphan)                    → red pill
    const classifyHealth = (ends, orphan) => {
      const inOk  = !!ends.scanIn;
      const outOk = !!ends.scanOut;
      const teOk  = ends.teShared && !!ends.teSource;
      if (orphan) return { cls: 'bad',  label: 'orphan' };
      if (inOk && outOk && teOk) return { cls: 'ok', label: 'healthy' };
      if (!inOk && !outOk)       return { cls: 'bad',  label: 'broken' };
      return { cls: 'warn', label: 'warn' };
    };

    const rowsHtml = chains.map((chain, idx) => {
      const ends = describeChainEndpoints(chain, allNodes, wires);
      const orphan = isOrphan(chain);
      const health = classifyHealth(ends, orphan);

      // Build the inline flow: pad → cell → arrow → cell → ... → pad.
      // Arrows live as separate inline elements so they can pick up
      // the chain's amber accent and align baseline with the boxes.
      const cellChunks = [];
      for (let c = 0; c < chain.length; c++) {
        if (c > 0) cellChunks.push(`<span class="dft-chain-arrow">→</span>`);
        cellChunks.push(`<div class="dft-chain-cell"><strong>${chain[c].label || chain[c].id}</strong></div>`);
      }

      // TE bar — three flavours of dash pattern carry the meaning:
      //   solid  : one source feeds every cell's TE
      //   split  : each cell has its own TE (unusual; flag it)
      //   absent : at least one cell's TE is unwired entirely
      let teBarCls, teText, teTextCls = '';
      if (ends.teShared && ends.teSource) {
        teBarCls = '';
        teText = `shared ← ${ends.teSource.label} [${ends.teSource.type}]`;
      } else {
        // Distinguish "all wired but to different sources" from "some unwired".
        const teDrivers = chain.map(ff =>
          wires.find(w => w.targetId === ff.id && w.targetInputIndex === 2));
        const anyMissing = teDrivers.some(w => !w);
        teBarCls = anyMissing ? 'absent' : 'split';
        teText = anyMissing
          ? `${teDrivers.filter(w => !w).length} of ${chain.length} cells have no TE driver`
          : `per-cell TE (${chain.length} distinct sources)`;
        teTextCls = 'warn';
      }

      const chainKey = `chain_${idx}`;
      const collapsed = this._collapsedBlocks.has(chainKey);
      return `
        <div class="dft-chain-block${collapsed ? ' collapsed' : ''}" data-block-id="${chainKey}">
          <div class="dft-chain-header" title="Click to collapse / expand">
            <span class="dft-chain-toggle">${collapsed ? '▸' : '▾'}</span>
            <span class="dft-chain-title">chain_${idx}</span>
            <span class="dft-chain-len">${chain.length} cell${chain.length === 1 ? '' : 's'}</span>
            <span class="dft-chain-status ${health.cls}">${health.label}</span>
          </div>
          <div class="dft-chain-flow">
            ${padHtml(ends.scanIn,  'scan-in',  'no test-vector source')}
            <span class="dft-chain-arrow">→</span>
            ${cellChunks.join('')}
            <span class="dft-chain-arrow">→</span>
            ${padHtml(ends.scanOut, 'scan-out', 'response is unobservable')}
          </div>
          <div class="dft-chain-te">
            <span class="dft-chain-te-label">TE</span>
            <span class="dft-chain-te-bar ${teBarCls}"></span>
            <span class="dft-chain-te-source ${teTextCls}">${teText}</span>
          </div>
        </div>`;
    }).join('');

    // High-level chain-coverage summary: cells inside any non-orphan
    // chain over total scanability. Orphans count toward "scan FFs"
    // but not toward "chain coverage" — they need wiring before they
    // contribute to a real test.
    const cellsInChains = chains
      .filter(c => !isOrphan(c))
      .reduce((sum, c) => sum + c.length, 0);
    const chainedPct = scanInserted > 0
      ? Math.round((cellsInChains / scanInserted) * 100)
      : 0;
    const orphanCount = chains.filter(isOrphan).length;

    return `
      <div class="dft-scan-header dft-section-header">${chainHeaderHtml}</div>${chainInfoPanel}
      <div class="dft-perf-row">
        <span class="k">Scan FFs</span><span class="v">${scanInserted} of ${totalFFs} (${scanability}% scanability)</span>
        <span class="k">Chains</span><span class="v">${chains.length} (${cellsInChains} cells, ${chainedPct}% in chain)</span>
        ${orphanCount ? `<span class="k">Orphans</span><span class="v">${orphanCount}</span>` : ''}
      </div>
      ${rowsHtml || '<div style="padding:0 1.2em;color:#876">No completed chains — wire SCAN-FF outputs into the next SCAN-FF\'s TI input to form a chain.</div>'}
    `;
  }

  // Commit a single edited LFSR field. Validates the value, mutates
  // the scene node in place, drops cached engine state for that
  // node so the new seed/taps take effect on the next tick, and
  // re-renders the panel. On invalid input the field reverts and
  // no mutation happens.
  _commitLfsrEdit(input) {
    const id    = input.dataset.lfsrId;
    const field = input.dataset.field;
    const node  = this._scene?.nodes?.find(n => n.id === id);
    if (!node) return;
    if (node.type !== 'LFSR' && node.type !== 'MISR' && node.type !== 'BIST_CONTROLLER' && node.type !== 'JTAG_TAP') return;

    const raw = (input.value || '').trim();
    let next;
    // JTAG_TAP's irBits: small positive integer.
    if (field === 'irBits') {
      const v = parseInt(raw, 10);
      if (!Number.isFinite(v) || v < 1 || v > 16) { input.value = node.irBits ?? 4; return; }
      node.irBits = v;
      const ffStates = window.state?.ffStates;
      if (ffStates?.delete) ffStates.delete(node.id);
      bus.emit('node:edited', { node, field });
      if (this._visible) this._render();
      return;
    }
    // JTAG_TAP's idcode: 32-bit value, dec / hex / bin.
    if (field === 'idcode') {
      let v;
      if (/^0[xX][0-9a-fA-F]+$/.test(raw))      v = parseInt(raw.slice(2), 16);
      else if (/^0[bB][01]+$/.test(raw))        v = parseInt(raw.slice(2), 2);
      else if (/^[0-9]+$/.test(raw))            v = parseInt(raw, 10);
      if (!Number.isFinite(v) || v < 0) {
        input.value = '0x' + ((node.idcode | 0) >>> 0).toString(16); return;
      }
      node.idcode = v >>> 0;
      bus.emit('node:edited', { node, field });
      if (this._visible) this._render();
      return;
    }
    // BIST_CONTROLLER's runLength: positive integer.
    if (field === 'runLength') {
      const v = parseInt(raw, 10);
      if (!Number.isFinite(v) || v < 1 || v > 65535) { input.value = node.runLength; return; }
      node.runLength = v;
      const ffStates = window.state?.ffStates;
      if (ffStates?.delete) ffStates.delete(node.id);
      bus.emit('node:edited', { node, field });
      if (this._visible) this._render();
      return;
    }
    if (field === 'goldenSig') {
      // Special: blank input clears the golden signature back to null.
      if (raw === '') { node.goldenSig = null; bus.emit('node:edited', { node, field }); if (this._visible) this._render(); return; }
      let v;
      if (/^0[xX][0-9a-fA-F]+$/.test(raw))      v = parseInt(raw.slice(2), 16);
      else if (/^0[bB][01]+$/.test(raw))        v = parseInt(raw.slice(2), 2);
      else if (/^[0-9]+$/.test(raw))            v = parseInt(raw, 10);
      if (!Number.isFinite(v) || v < 0) {
        input.value = (typeof node.goldenSig === 'number') ? '0x' + (node.goldenSig >>> 0).toString(16) : '';
        return;
      }
      node.goldenSig = v & ((1 << (node.bitWidth || 4)) - 1);
      bus.emit('node:edited', { node, field });
      if (this._visible) this._render();
      return;
    }
    if (field === 'bitWidth') {
      const v = parseInt(raw, 10);
      if (!Number.isFinite(v) || v < 1 || v > 32) { input.value = node.bitWidth; return; }
      next = v;
    } else if (field === 'seed') {
      // Accept decimal, 0x… hex, or 0b… binary.
      let v;
      if (/^0[xX][0-9a-fA-F]+$/.test(raw))      v = parseInt(raw.slice(2), 16);
      else if (/^0[bB][01]+$/.test(raw))        v = parseInt(raw.slice(2), 2);
      else if (/^[0-9]+$/.test(raw))            v = parseInt(raw, 10);
      if (!Number.isFinite(v) || v < 0) {
        input.value = '0x' + ((node.seed ?? 0) >>> 0).toString(16); return;
      }
      const w = node.bitWidth | 0;
      next = v & ((1 << w) - 1);     // truncate silently to the LFSR's width
    } else if (field === 'taps') {
      // Comma-separated integers, dedup + sort.
      const parts = raw.split(/[,\s]+/).filter(Boolean).map(s => parseInt(s, 10));
      if (parts.some(n => !Number.isFinite(n) || n < 0)) {
        input.value = (node.taps || []).join(','); return;
      }
      const w = node.bitWidth | 0;
      const valid = [...new Set(parts.filter(n => n < w))].sort((a, b) => a - b);
      if (valid.length === 0) { input.value = (node.taps || []).join(','); return; }
      next = valid;
    } else {
      return;
    }

    node[field] = next;
    // Engine caches LFSR run state in the FF state map keyed by node id.
    // Drop it so the next tick re-seeds from the new value.
    const ffStates = window.state?.ffStates;
    if (ffStates?.delete) ffStates.delete(node.id);
    // Notify the rest of the app (canvas redraws, telemetry, etc.).
    bus.emit('node:edited', { node, field });
    if (this._visible) this._render();
  }

  // Open one section's info panel. The panel renders inline below
  // the section header, so no click-outside trap is needed — the
  // user closes it by clicking the i button again.
  _openInfoPopover(section) {
    this._infoOpen.add(section);
    if (this._visible) this._render();
  }
  _closeInfoPopovers() {
    if (this._infoOpen.size === 0) return;
    this._infoOpen.clear();
    if (this._visible) this._render();
  }

  // Render one editable LFSR field. Two states:
  //   view  → the value as text + ✏ pencil button (click to edit)
  //   edit  → an <input> + ✓ save + ✕ cancel buttons
  // Edit state lives in this._editingFields keyed `<id>:<field>` so
  // re-renders preserve it.
  _renderLfsrField(lfsrId, field, viewHtml, opts = {}) {
    const key = `${lfsrId}:${field}`;
    const editing = this._editingFields.has(key);
    if (!editing) {
      return `
        <span class="dft-lfsr-v">
          ${viewHtml}
          <button class="dft-lfsr-edit" data-lfsr-id="${lfsrId}" data-field="${field}"
                  data-action="lfsr-edit" title="Edit ${field}">✎</button>
        </span>`;
    }
    const inputType = opts.inputType || 'text';
    const minMax    = opts.minMax || '';
    return `
      <span class="dft-lfsr-v">
        <input class="dft-lfsr-input" type="${inputType}" ${minMax}
               data-lfsr-id="${lfsrId}" data-field="${field}"
               value="${opts.current ?? ''}"
               title="${opts.hint || ''}"
               autofocus>
        <button class="dft-lfsr-save"   data-lfsr-id="${lfsrId}" data-field="${field}"
                data-action="lfsr-save"   title="Save (Enter)">💾</button>
        <button class="dft-lfsr-cancel" data-lfsr-id="${lfsrId}" data-field="${field}"
                data-action="lfsr-cancel" title="Cancel (Esc)">✕</button>
        <small class="dft-lfsr-hint">${opts.hint || ''}</small>
      </span>`;
  }

  // ── PATTERN GENERATORS (LFSRs) ─────────────────────────────
  // Layer-4 surface in the DFT panel. Lists every LFSR in the scene,
  // computes its true period, names its polynomial, and flags whether
  // the serial Q drives a SCAN_FF's TI — i.e. whether this LFSR is
  // wired up as a real BIST pattern source or is just sitting there.
  _renderPatternGenerators() {
    const allNodes = this._scene?.nodes || [];
    const wires    = this._scene?.wires || [];
    const lfsrs    = allNodes.filter(n => n.type === 'LFSR');
    const open = this._infoOpen.has('patterns');
    const infoPanel = open ? `
      <div class="dft-info-panel">
        <div class="dft-info-lead">LFSRs as test-pattern sources for BIST. Status combines polynomial quality with whether the LFSR is actually wired into a scan path.</div>
        <div class="dft-info-row">
          <span class="dft-chain-status ok">BIST source</span>
          <span class="dft-info-text">Primitive polynomial AND Q wired to scan-in. All good.</span>
        </div>
        <div class="dft-info-row">
          <span class="dft-chain-status warn">unused</span>
          <span class="dft-info-text">Primitive but Q drives nothing testable — wire it to a SCAN_FF.TI.</span>
        </div>
        <div class="dft-info-row">
          <span class="dft-chain-status warn">sub-max</span>
          <span class="dft-info-text">Reducible polynomial — short orbit. Pick taps from a primitive table.</span>
        </div>
        <div class="dft-info-row">
          <span class="dft-chain-status bad">seed=0</span>
          <span class="dft-info-text">Zero is a fixed point — set seed to any non-zero value.</span>
        </div>
      </div>
    ` : '';
    // Wrap title + info button in one flex item so the parent's
    // justify-content: space-between keeps the toggle on the right
    // without throwing the info button into the middle.
    const headerHtml = `<span class="dft-section-title">PATTERN GENERATORS` +
      `<button class="dft-info-btn" data-action="toggle-info" data-section="patterns" title="What do the status pills mean?">i</button>` +
      `</span>`;

    if (lfsrs.length === 0) return '';
    const blocks = lfsrs.map((lfsr) => {
      const width = Math.max(1, lfsr.bitWidth | 0);
      const seed  = (lfsr.seed ?? 1) & ((1 << width) - 1);
      const taps  = Array.isArray(lfsr.taps) ? lfsr.taps.slice() : [width - 1, 0];
      const period = lfsrPeriod(width, taps, seed);
      const sinks = describeLfsrSinks(lfsr, allNodes, wires);

      // Health classifier: max-length + drives a scan-in = green;
      // sub-max polynomial OR not driving any scan = amber; stuck-at-0
      // seed = red.
      let cls, label;
      if (period.stuckAtZero)               { cls = 'bad';  label = 'seed=0'; }
      else if (period.isMaxLength && sinks.drivesScan) { cls = 'ok';   label = 'BIST source'; }
      else if (period.isMaxLength)          { cls = 'warn'; label = 'unused'; }
      else                                   { cls = 'warn'; label = 'sub-max'; }

      const sinkText = sinks.sinks.length === 0
        ? '<span class="dft-chain-end-empty">(Q not connected)</span>'
        : sinks.sinks.map(s =>
            `<span class="${s.isScanIn ? 'dft-lfsr-sink-scan' : 'dft-lfsr-sink'}">${s.label} <small>[${s.type}${s.isScanIn ? '·TI' : ''}]</small></span>`
          ).join(', ');

      const blockId = `lfsr_${lfsr.id}`;
      const collapsed = this._collapsedBlocks.has(blockId);
      return `
        <div class="dft-chain-block${collapsed ? ' collapsed' : ''}" data-block-id="${blockId}">
          <div class="dft-chain-header" title="Click to collapse / expand">
            <span class="dft-chain-toggle">${collapsed ? '▸' : '▾'}</span>
            <span class="dft-chain-title">${lfsr.label || lfsr.id}</span>
            <span class="dft-chain-len">${width}-bit</span>
            <span class="dft-chain-status ${cls}">${label}</span>
          </div>
          <div class="dft-lfsr-grid">
            <span class="dft-lfsr-k">width</span>
            ${this._renderLfsrField(lfsr.id, 'bitWidth',
              `<code>${width}</code> <small>bits</small>`,
              { current: width, hint: 'integer 1–24', inputType: 'number', minMax: 'min="1" max="24"' })}
            <span class="dft-lfsr-k">seed</span>
            ${this._renderLfsrField(lfsr.id, 'seed',
              `<code>${seed.toString(2).padStart(width, '0')}</code> <small>(0x${seed.toString(16)})</small>`,
              { current: '0x' + seed.toString(16), hint: 'dec, 0xHEX, or 0bBIN — truncated to width' })}
            <span class="dft-lfsr-k">shape</span>
            ${this._renderLfsrField(lfsr.id, 'taps',
              `<code>${lfsrPolynomial(width, taps)}</code> <small>(Fibonacci LFSR, shift-left; XOR of tap bits drops into the new LSB each clock)</small>`,
              { current: taps.join(','), hint: 'comma-separated bit positions (0 = LSB)' })}
            <span class="dft-lfsr-k">period</span>
            <span class="dft-lfsr-v">
              <code>${period.period}</code>
              <small>of ${period.maxPeriod} max ${period.isMaxLength ? '✓ max-length' : `(${Math.round(100 * period.period / period.maxPeriod)}% — non-primitive)`}</small>
            </span>
            <span class="dft-lfsr-k">drives</span>
            <span class="dft-lfsr-v">${sinkText}</span>
          </div>
        </div>`;
    }).join('');

    const goodCount = lfsrs.filter(l => {
      const w = Math.max(1, l.bitWidth | 0);
      const seed = (l.seed ?? 1) & ((1 << w) - 1);
      const taps = Array.isArray(l.taps) ? l.taps : [w - 1, 0];
      return lfsrPeriod(w, taps, seed).isMaxLength;
    }).length;

    return `
      <div class="dft-patterns-header dft-section-header">${headerHtml}</div>${infoPanel}
      <div class="dft-perf-row">
        <span class="k">LFSRs</span><span class="v">${lfsrs.length}</span>
        <span class="k">Max-length polynomials</span><span class="v">${goodCount} of ${lfsrs.length}</span>
      </div>
      ${blocks}
    `;
  }

  // ── SIGNATURE COMPACTORS (MISR) ─────────────────────────────
  // Mirror of PATTERN GENERATORS but for the BIST response side. Each
  // MISR shows its current live signature (ms.reg from the engine),
  // an editable goldenSig, and a match / mismatch / no-golden status.
  _renderSignatureCompactors() {
    const allNodes = this._scene?.nodes || [];
    const wires    = this._scene?.wires || [];
    const misrs    = allNodes.filter(n => n.type === 'MISR');

    const headerHtml = `<span class="dft-section-title">SIGNATURE COMPACTORS` +
      `<button class="dft-info-btn" data-action="toggle-info" data-section="misrs" title="What does this section show?">i</button>` +
      `</span>`;
    const infoPanel = this._infoOpen.has('misrs') ? `
      <div class="dft-info-panel">
        <div class="dft-info-lead">MISRs sit at the END of a scan chain and compress the test responses into a compact signature. Comparing it against the pre-computed "golden" value tells you instantly if any fault corrupted the response.</div>
        <div class="dft-info-row">
          <span class="dft-chain-status ok">match</span>
          <span class="dft-info-text">Current signature equals the golden value — no detected fault.</span>
        </div>
        <div class="dft-info-row">
          <span class="dft-chain-status bad">mismatch</span>
          <span class="dft-info-text">Signatures differ — at least one bit of the response was wrong; a fault is present.</span>
        </div>
        <div class="dft-info-row">
          <span class="dft-chain-status warn">no golden</span>
          <span class="dft-info-text">No reference signature set yet — capture the current one as the golden value once you trust the design.</span>
        </div>
      </div>` : '';

    // Radix selector — three small toggle pills that let the user
    // flip the value displays (seed / live sig / golden) between
    // binary, decimal, and hex. Editing inputs continue to accept all
    // three formats regardless.
    const radix = this._misrRadix;
    const radixBtn = (r, label) =>
      `<button class="dft-misr-radix-btn${radix === r ? ' active' : ''}"
               data-action="misr-radix" data-radix="${r}"
               title="Display values in ${label}">${label}</button>`;
    const radixSelector = `<span class="dft-misr-radix">` +
      radixBtn('bin', 'BIN') + radixBtn('dec', 'DEC') + radixBtn('hex', 'HEX') +
      `</span>`;

    // Number → display string for the chosen radix. Width arg only
    // matters for binary (zero-padding to N bits).
    const fmtVal = (v, W) => {
      if (radix === 'dec') return String(v >>> 0);
      if (radix === 'hex') return '0x' + (v >>> 0).toString(16);
      return (v >>> 0).toString(2).padStart(W, '0');
    };

    if (misrs.length === 0) return '';

    // Engine-side state — ms.reg holds the live signature, populated
    // each tick by the SimulationEngine. Read from the global state
    // bucket the app maintains so the panel doesn't need its own
    // simulation pass.
    const ffStates = window.state?.ffStates;

    const blocks = misrs.map(misr => {
      const W    = Math.max(1, (misr.bitWidth || 4) | 0);
      const mask = (1 << W) - 1;
      const ms   = ffStates?.get?.(misr.id);
      const sig  = (typeof ms?.reg === 'number') ? (ms.reg & mask) : 0;
      const golden = (typeof misr.goldenSig === 'number') ? (misr.goldenSig & mask) : null;

      // Status classifier.
      let cls, label;
      if (golden === null)        { cls = 'warn'; label = 'no golden'; }
      else if (sig === golden)    { cls = 'ok';   label = 'match'; }
      else                        { cls = 'bad';  label = 'mismatch'; }

      // Count wired data inputs — a MISR with no inputs wired is just a
      // standalone LFSR-shaped circuit; flag it.
      let wiredIns = 0;
      for (let i = 0; i < W; i++) {
        if (wires.find(w => w.targetId === misr.id && (w.targetInputIndex || 0) === i)) wiredIns++;
      }

      const blockId = `misr_${misr.id}`;
      const collapsed = this._collapsedBlocks.has(blockId);
      const goldenText = golden === null
        ? `<span class="dft-chain-end-empty">(not set)</span>`
        : `<code>${fmtVal(golden, W)}</code>`;
      return `
        <div class="dft-chain-block${collapsed ? ' collapsed' : ''}" data-block-id="${blockId}">
          <div class="dft-chain-header" title="Click to collapse / expand">
            <span class="dft-chain-toggle">${collapsed ? '▸' : '▾'}</span>
            <span class="dft-chain-title">${misr.label || misr.id}</span>
            <span class="dft-chain-len">${W}-bit</span>
            <span class="dft-chain-status ${cls}">${label}</span>
          </div>
          <div class="dft-lfsr-grid">
            <span class="dft-lfsr-k">width</span>
            ${this._renderMisrField(misr.id, 'bitWidth',
              `<code>${W}</code> <small>bits</small>`,
              { current: W, inputType: 'number', minMax: 'min="1" max="32"',
                hint: 'integer 1–32' })}
            <span class="dft-lfsr-k">seed</span>
            ${this._renderMisrField(misr.id, 'seed',
              `<code>${fmtVal((misr.seed ?? 0) & mask, W)}</code>`,
              { current: '0x' + ((misr.seed ?? 0) & mask).toString(16),
                hint: 'dec, 0xHEX, or 0bBIN — initial state at sim start' })}
            <span class="dft-lfsr-k">taps</span>
            ${this._renderMisrField(misr.id, 'taps',
              `<code>${(misr.taps || []).join(',')}</code> <small>(Fibonacci feedback into bit 0)</small>`,
              { current: (misr.taps || []).join(','),
                hint: 'comma-separated bit positions (0 = LSB)' })}
            <span class="dft-lfsr-k">live sig</span>
            <span class="dft-lfsr-v">
              <code>${fmtVal(sig, W)}</code>
            </span>
            <span class="dft-lfsr-k">golden</span>
            ${this._renderMisrField(misr.id, 'goldenSig',
              goldenText,
              { current: golden === null ? '' : '0x' + golden.toString(16),
                hint: 'dec, 0xHEX, or 0bBIN — leave blank to clear' })}
            <span class="dft-lfsr-k">inputs</span>
            <span class="dft-lfsr-v">
              <code>${wiredIns}</code> <small>of ${W} data pins wired</small>
            </span>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="dft-misrs-header dft-section-header">${headerHtml}</div>${infoPanel}
      <div class="dft-misr-toolbar">
        <span class="dft-misr-toolbar-label">display</span>
        ${radixSelector}
      </div>
      <div class="dft-perf-row">
        <span class="k">MISRs</span><span class="v">${misrs.length}</span>
      </div>
      ${blocks}
    `;
  }

  // Like _renderLfsrField but shared by the MISR pane. Same edit
  // lifecycle (✎ → input + 💾 + ✕) and the same `data-action` keys —
  // the click delegation handles both because we route by data-field.
  _renderMisrField(misrId, field, viewHtml, opts = {}) {
    const key = `${misrId}:${field}`;
    const editing = this._editingFields.has(key);
    if (!editing) {
      return `
        <span class="dft-lfsr-v">
          ${viewHtml}
          <button class="dft-lfsr-edit" data-lfsr-id="${misrId}" data-field="${field}"
                  data-action="lfsr-edit" title="Edit ${field}">✎</button>
        </span>`;
    }
    const inputType = opts.inputType || 'text';
    const minMax    = opts.minMax || '';
    return `
      <span class="dft-lfsr-v">
        <input class="dft-lfsr-input" type="${inputType}" ${minMax}
               data-lfsr-id="${misrId}" data-field="${field}"
               value="${opts.current ?? ''}"
               title="${opts.hint || ''}"
               autofocus>
        <button class="dft-lfsr-save"   data-lfsr-id="${misrId}" data-field="${field}"
                data-action="lfsr-save"   title="Save (Enter)">💾</button>
        <button class="dft-lfsr-cancel" data-lfsr-id="${misrId}" data-field="${field}"
                data-action="lfsr-cancel" title="Cancel (Esc)">✕</button>
        <small class="dft-lfsr-hint">${opts.hint || ''}</small>
      </span>`;
  }

  // ── BIST CONTROLLERS ────────────────────────────────────────
  // One block per BIST_CONTROLLER node — current state name, cycle
  // counter against runLength, golden signature (editable), and a
  // status pill that mirrors the FSM (idle / running / pass / fail).
  _renderBistControllers() {
    const allNodes = this._scene?.nodes || [];
    const ctls     = allNodes.filter(n => n.type === 'BIST_CONTROLLER');

    const headerHtml = `<span class="dft-section-title">BIST CONTROLLERS` +
      `<button class="dft-info-btn" data-action="toggle-info" data-section="bist" title="What does this section show?">i</button>` +
      `</span>`;
    const infoPanel = this._infoOpen.has('bist') ? `
      <div class="dft-info-panel">
        <div class="dft-info-lead">Each BIST_CONTROLLER orchestrates one self-test run: assert TEST_MODE for runLength cycles while LFSR + MISR do their work, then compare the captured signature to the golden value and latch PASS or FAIL.</div>
        <div class="dft-info-row">
          <span class="dft-chain-status warn">idle</span>
          <span class="dft-info-text">Waiting for START. Pulse the START input to begin the run.</span>
        </div>
        <div class="dft-info-row">
          <span class="dft-chain-status warn">running</span>
          <span class="dft-info-text">In SETUP / RUN — TEST_MODE high, cycle counter advancing toward runLength.</span>
        </div>
        <div class="dft-info-row">
          <span class="dft-chain-status ok">pass</span>
          <span class="dft-info-text">Run completed and the captured MISR signature matched goldenSig — design is fault-free under this test.</span>
        </div>
        <div class="dft-info-row">
          <span class="dft-chain-status bad">fail</span>
          <span class="dft-info-text">Captured signature didn't match — at least one fault sensitised by the test.</span>
        </div>
      </div>` : '';

    if (ctls.length === 0) return '';

    const ffStates = window.state?.ffStates;
    const STATE_NAMES = ['IDLE', 'SETUP', 'RUN', 'COMPARE', 'DONE', 'FAIL'];
    const radix = this._misrRadix;
    const fmtVal = (v, W) => {
      if (radix === 'dec') return String(v >>> 0);
      if (radix === 'hex') return '0x' + (v >>> 0).toString(16);
      return (v >>> 0).toString(2).padStart(W, '0');
    };

    const blocks = ctls.map(ctl => {
      const sigBits = Math.max(1, (ctl.sigBits | 0) || 4);
      const runLen  = Math.max(1, (ctl.runLength | 0) || 16);
      const golden  = (ctl.goldenSig | 0) & ((1 << sigBits) - 1);
      const ms      = ffStates?.get?.(ctl.id);
      const stateN  = (ms && typeof ms.bistState === 'number') ? ms.bistState : 0;
      const cycles  = (ms && typeof ms.cycleCount === 'number') ? ms.cycleCount : 0;
      const sName   = STATE_NAMES[stateN] || '?';

      let cls, label;
      if (stateN === 4)      { cls = 'ok';   label = 'pass'; }
      else if (stateN === 5) { cls = 'bad';  label = 'fail'; }
      else if (stateN === 0) { cls = 'warn'; label = 'idle'; }
      else                   { cls = 'warn'; label = 'running'; }

      const blockId = `bist_${ctl.id}`;
      const collapsed = this._collapsedBlocks.has(blockId);
      return `
        <div class="dft-chain-block${collapsed ? ' collapsed' : ''}" data-block-id="${blockId}">
          <div class="dft-chain-header" title="Click to collapse / expand">
            <span class="dft-chain-toggle">${collapsed ? '▸' : '▾'}</span>
            <span class="dft-chain-title">${ctl.label || ctl.id}</span>
            <span class="dft-chain-len">${sigBits}-bit sig · ${runLen}-cycle run</span>
            <span class="dft-chain-status ${cls}">${label}</span>
          </div>
          <div class="dft-lfsr-grid">
            <span class="dft-lfsr-k">state</span>
            <span class="dft-lfsr-v">
              <code>${sName}</code> <small>(code ${stateN})</small>
            </span>
            <span class="dft-lfsr-k">cycle</span>
            <span class="dft-lfsr-v">
              <code>${cycles}</code> <small>of ${runLen}${stateN === 2 ? ' (RUN in progress)' : ''}</small>
            </span>
            <span class="dft-lfsr-k">runLength</span>
            ${this._renderMisrField(ctl.id, 'runLength',
              `<code>${runLen}</code> <small>cycles per RUN phase</small>`,
              { current: runLen, inputType: 'number', minMax: 'min="1" max="65535"',
                hint: 'integer ≥ 1' })}
            <span class="dft-lfsr-k">golden</span>
            ${this._renderMisrField(ctl.id, 'goldenSig',
              `<code>${fmtVal(golden, sigBits)}</code>`,
              { current: '0x' + golden.toString(16),
                hint: 'dec, 0xHEX, or 0bBIN — expected MISR sig at end of RUN' })}
            <span class="dft-lfsr-k">sigBits</span>
            <span class="dft-lfsr-v">
              <code>${sigBits}</code> <small>bits — set to match the connected MISR's width</small>
            </span>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="dft-bist-header dft-section-header">${headerHtml}</div>${infoPanel}
      <div class="dft-perf-row">
        <span class="k">Controllers</span><span class="v">${ctls.length}</span>
      </div>
      ${blocks}
    `;
  }

  // ── MEMORY BIST CONTROLLERS ────────────────────────────────
  // One block per MBIST_CONTROLLER node: live FSM state (March C−),
  // marchStep / addr / sub-phase counters, pass/fail/idle pill, and a
  // per-cell fault-injection grid for the auto-detected RAM-under-test.
  // ── MEMORY TESTS (Phase 1 — standalone runner) ─────────────
  // One block per RAM in the scene. Independent of MBIST_CONTROLLER —
  // the panel drives the RAM directly through MemoryTestRunner.js, so
  // a student can drop a RAM, pick a pattern, click RUN, and see
  // pass/fail without ever wiring a controller. Cell-fault grid stays
  // in the MEMORY BIST section below and is shared.
  _renderMemoryTests() {
    const allNodes = this._scene?.nodes || [];
    const rams = allNodes.filter(n => n.type === 'RAM');

    const headerHtml = `<span class="dft-section-title">MEMORY TESTS` +
      `<button class="dft-info-btn" data-action="toggle-info" data-section="memtests" title="What does this section show?">i</button>` +
      `</span>`;
    const infoPanel = this._infoOpen.has('memtests') ? `
      <div class="dft-info-panel">
        <div class="dft-info-lead">Panel-driven RAM test runner. No MBIST_CONTROLLER needed — pick a pattern, click RUN, see pass/fail. Patterns apply <code>cellFaults</code> exactly as the engine does, so an injected cell fault yields the same observable here as it would under a March C− run.</div>
        <table class="dft-memtest-algo-table">
          <thead>
            <tr>
              <th>#</th><th>Algorithm</th><th>What it does</th><th>Catches</th><th>ops</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td><td class="algo">All-zero</td>
              <td>Write 0 to every cell → read 0 back.</td>
              <td>only <code>stuck-at-1</code></td>
              <td><code>2N</code></td>
            </tr>
            <tr>
              <td>2</td><td class="algo">All-one</td>
              <td>Write all-ones to every cell → read back.</td>
              <td>only <code>stuck-at-0</code></td>
              <td><code>2N</code></td>
            </tr>
            <tr>
              <td>3</td><td class="algo">Checkerboard</td>
              <td>Even cells = <code>1010…</code>, odd = <code>0101…</code></td>
              <td>stuck-at both polarities + <b>bit-line shorts</b></td>
              <td><code>2N</code></td>
            </tr>
            <tr>
              <td>4</td><td class="algo">Inverse Checkerboard</td>
              <td>Polarity flipped (run as a pair with #3).</td>
              <td>asymmetric faults #3 misses</td>
              <td><code>2N</code></td>
            </tr>
            <tr>
              <td>5</td><td class="algo">Address-as-data</td>
              <td>Cell A stores the value A.</td>
              <td><b>address-decoder bugs</b></td>
              <td><code>2N</code></td>
            </tr>
            <tr>
              <td>6</td><td class="algo">Walking-1</td>
              <td>One cell = all-ones, others = 0 — walks through cells with cross-reads.</td>
              <td><b>coupling faults</b> + decoder bugs</td>
              <td><code>N²+2N</code></td>
            </tr>
            <tr>
              <td>7</td><td class="algo">Walking-0</td>
              <td>One cell = 0, others = all-ones — mirror of #6.</td>
              <td>coupling faults (opposite polarity)</td>
              <td><code>N²+2N</code></td>
            </tr>
            <tr>
              <td>8</td><td class="algo">March C-</td>
              <td>Six march elements with ascending + descending passes — production-grade.</td>
              <td>stuck-at + coupling + most decoder (<b>linear cost</b>)</td>
              <td><code>10N</code></td>
            </tr>
          </tbody>
        </table>
        <div class="dft-info-text" style="margin-top:8px">
          <b>Recommended run order:</b> #1 + #2 (smoke) → #3 + #4 (stuck-at + shorts) → #5 (decoder) → #8 (production memory BIST) — #6 / #7 only for small RAMs or instructional comparison.
          <br><b>Trace strip below the result:</b>
          <span style="color:#506070">▮</span> write ·
          <span style="color:#40cc60">▮</span> read pass ·
          <span style="color:#ff4040">▮</span> read fail.
        </div>
      </div>` : '';

    if (rams.length === 0) return '';

    const blocks = rams.map(ram => {
      const aBits = Math.max(1, (ram.addrBits | 0) || 4);
      const dBits = Math.max(1, (ram.dataBits | 0) || 8);
      const cells = 1 << aBits;
      const cfCount = ram.cellFaults ? Object.keys(ram.cellFaults).length : 0;

      const cfg = this._scene?._dft?.ramTests?.[ram.id] || null;
      const algoId = cfg?.algorithm || 'checkerboard';
      const result = cfg?.lastResult || null;

      // Verdict pill — idle / pass / FAIL — same styling as other sections.
      let verdict;
      if (!result) {
        verdict = `<span class="dft-chain-status warn">idle</span>`;
      } else if (result.passed) {
        verdict = `<span class="dft-chain-status ok">pass</span>`;
      } else {
        verdict = `<span class="dft-chain-status bad">FAIL</span>`;
      }

      const algoOptions = RAM_PATTERNS.map(p =>
        `<option value="${p.id}"${p.id === algoId ? ' selected' : ''}>${p.label}</option>`
      ).join('');

      // Result block. Renders pass / fail summary + mini-trace strip.
      let resultBlock = '';
      if (result) {
        const tier = result.passed ? '#40cc60' : '#ff4040';
        // When a coupling fault caused the mismatch, surface it in the
        // summary so the user immediately sees the proximate source.
        const causedByText = (!result.passed && result.firstFail?.causedBy)
          ? ` · <span style="color:#ff8090">${result.firstFail.causedBy.type} from addr ${result.firstFail.causedBy.aggressor} ↗</span>`
          : '';
        const summary = result.passed
          ? `<span style="color:#40cc60;font-weight:bold">PASS</span> · <span style="color:#876">${result.steps} ops</span> <small>(${result.writes}w + ${result.reads}r)</small>`
          : `<span style="color:#ff4040;font-weight:bold">FAIL</span> at <code style="color:#ffb0b0">addr ${result.firstFail.addr}</code> ${result.firstFail.bit === null ? '<small>(whole word)</small>' : `<small>(bit ${result.firstFail.bit})</small>`} — expected <code style="color:#40cc60">${result.firstFail.expected.toString(2).padStart(dBits, '0')}</code> got <code style="color:#ff4040">${result.firstFail.observed.toString(2).padStart(dBits, '0')}</code>${causedByText}`;

        // Trace HEATMAP — each cell of the RAM gets a row, each step
        // gets a column. Every op lights up the (addr, step) cell with
        // a colour by type (write / read-pass / read-fail). This makes
        // visible at a glance:
        //   - which address was touched, and when
        //   - the structural pattern of the algorithm (diagonal sweeps
        //     for sequential writes; complex grids for walking-1)
        //   - the single FAIL cell, which becomes the only bright red
        //     dot in the grid + chevron pointer
        const MAX_STEPS = 256;
        const trace = result.trace.slice(0, MAX_STEPS);
        const more = result.trace.length > MAX_STEPS ? result.trace.length - MAX_STEPS : 0;
        const numSteps = trace.length;
        const renderedCells = Math.min(cells, 64);  // mirrors cell-fault grid cap
        const ff = result.firstFail;

        // Smart title — include first-fail step + addr + bit.
        const traceTitle = ff
          ? `trace · ${result.trace.length} ops · <span class="dft-memtest-failtag">⚠ FAIL at step ${ff.stepIdx} — addr ${ff.addr} ${ff.bit === null ? '(whole word)' : 'bit ' + ff.bit}</span>${more ? ` <small style="color:#876">(first ${MAX_STEPS} shown)</small>` : ''}`
          : `trace · ${result.trace.length} op${result.trace.length === 1 ? '' : 's'} · <span style="color:#40cc60">all reads matched</span>${more ? ` <small style="color:#876">(first ${MAX_STEPS} shown)</small>` : ''}`;

        // Adaptive cell sizing. Wide cells for short traces (12px) all
        // the way down to dense (5px) for traces approaching MAX_STEPS.
        // Heights are addr-count-driven so a 16-cell RAM stays compact.
        const cellW = numSteps <=  32 ? 14
                    : numSteps <=  64 ? 11
                    : numSteps <= 128 ? 8
                    :                    6;
        const cellH = renderedCells <=  8 ? 16
                    : renderedCells <= 16 ? 12
                    : renderedCells <= 32 ?  9
                    :                        7;
        const labelW = 28;    // addr label column width
        const axisH  = 16;    // step axis row height
        const FAIL_PANEL_H = 40;
        const gridW = numSteps * cellW;
        const gridH = renderedCells * cellH;
        const totalW = labelW + gridW + 6;
        const totalH = axisH + gridH + FAIL_PANEL_H + 6;

        // Step axis labels at the top — every Nth label, plus the last.
        const stepInterval = numSteps <=  16 ? 1
                           : numSteps <=  48 ? 4
                           : numSteps <= 128 ? 8
                           :                   16;
        let stepAxisHtml = '';
        for (let s = 0; s < numSteps; s++) {
          if (s % stepInterval !== 0 && s !== numSteps - 1) continue;
          const leftPx = labelW + s * cellW + cellW / 2;
          stepAxisHtml += `<span class="dft-hm-step-label" style="left:${leftPx}px">${s}</span>`;
        }

        // Addr axis labels on the left — interval matches cell density.
        const addrInterval = renderedCells <=  8 ? 1
                           : renderedCells <= 16 ? 2
                           : renderedCells <= 32 ? 4
                           :                       8;
        let addrAxisHtml = '';
        for (let a = 0; a < renderedCells; a++) {
          if (a % addrInterval !== 0 && a !== renderedCells - 1) continue;
          const topPx = axisH + a * cellH + cellH / 2;
          addrAxisHtml += `<span class="dft-hm-addr-label" style="top:${topPx}px">${a}</span>`;
        }

        // Faint grid backdrop — one square per (addr, step). Gives the
        // eye a structure even where no op landed, so the active cells
        // visually pop against an empty grid rather than floating in
        // void. Rendered as a CSS repeating-gradient for perf — no DOM.
        const bgGrid = `
          background-image:
            repeating-linear-gradient(to right,
              rgba(60,80,100,0.07) 0 1px,
              transparent 1px ${cellW}px),
            repeating-linear-gradient(to bottom,
              rgba(60,80,100,0.07) 0 1px,
              transparent 1px ${cellH}px);
          background-position: ${labelW}px ${axisH}px;
          background-size: ${gridW}px ${gridH}px;
          background-repeat: no-repeat;
        `;

        // Heat cells — one DOM node per op (the empty squares between
        // are pure background, so DOM count is bounded by trace length).
        const heatCells = trace.map((t, step) => {
          if (t.addr >= renderedCells) return '';
          let cls = 'cell-w';
          if (t.op === 'read') cls = t.isFail ? 'cell-f' : 'cell-r';
          const isFF = ff && step === ff.stepIdx;
          if (isFF) cls += ' cell-ff';
          const leftPx = labelW + step * cellW;
          const topPx  = axisH + t.addr * cellH;
          const titleStr = t.op === 'write'
            ? `step ${step} · addr ${t.addr} · write ${(t.data ?? 0).toString(2).padStart(dBits, '0')}`
            : `step ${step} · addr ${t.addr} · read exp ${(t.expected ?? 0).toString(2).padStart(dBits, '0')} got ${(t.observed ?? 0).toString(2).padStart(dBits, '0')}`;
          return `<div class="dft-hm-cell ${cls}"
                       style="left:${leftPx}px;top:${topPx}px;width:${cellW - 1}px;height:${cellH - 1}px"
                       title="${titleStr}"
                       data-action="memtest-tick" data-ram-id="${ram.id}" data-step="${step}"></div>`;
        }).join('');

        // Fail callout — vertical guide line from the failing cell down
        // to a labelled badge below the grid. Always rendered below the
        // grid so a fail on any addr/step gets the same anchor point.
        let failMarker = '';
        if (ff && ff.addr < renderedCells) {
          const cellCenterX = labelW + ff.stepIdx * cellW + cellW / 2;
          const cellBotY    = axisH + (ff.addr + 1) * cellH;
          const guideTop    = cellBotY;
          const guideHeight = (axisH + gridH) - cellBotY + 4;
          const bitTxt = ff.bit === null ? 'whole word' : `bit ${ff.bit}`;
          // Coupling-cause line — only renders when the runner attributed
          // the fail to a CFin / CFid / CFst entry on this RAM.
          const causedByLine = ff.causedBy
            ? `<br><small style="color:#ffb0b0">${ff.causedBy.type} from addr ${ff.causedBy.aggressor} ↗</small>`
            : '';
          failMarker = `
            <div class="dft-hm-fail-guide"
                 style="left:${cellCenterX - 1}px;top:${guideTop}px;height:${guideHeight}px"></div>
            <div class="dft-hm-fail-marker"
                 style="left:${cellCenterX}px;top:${axisH + gridH + 4}px">
              <div class="dft-hm-fail-chevron">▲</div>
              <div class="dft-hm-fail-label">addr ${ff.addr} · step ${ff.stepIdx}<br><small>${bitTxt}</small>${causedByLine}</div>
            </div>`;
        }

        // Legend — three chips inline with the title.
        const legend = `
          <span class="dft-hm-legend">
            <span class="chip cell-w"></span>write
            <span class="chip cell-r"></span>read pass
            <span class="chip cell-f"></span>read fail
          </span>`;

        resultBlock = `
          <div class="dft-lfsr-grid">
            <span class="dft-lfsr-k">result</span>
            <span class="dft-lfsr-v">${summary}</span>
            <span class="dft-lfsr-k">pattern</span>
            <span class="dft-lfsr-v"><code>${result.patternName}</code></span>
          </div>
          <div class="dft-memtest-tracewrap">
            <div class="dft-memtest-tracetitle">
              <div>${traceTitle}</div>
              ${legend}
            </div>
            <div class="dft-memtest-heatwrap" style="border-left:3px solid ${tier}">
              <div class="dft-memtest-heatmap" style="width:${totalW}px;height:${totalH}px;${bgGrid}">
                ${stepAxisHtml}
                ${addrAxisHtml}
                ${heatCells}
                ${failMarker}
              </div>
            </div>
          </div>`;
      } else {
        resultBlock = `<div class="dft-empty" style="margin:6px 12px;padding:6px 10px">No run yet — pick a pattern and click <b style="color:#ffb878">▶ RUN</b>.</div>`;
      }

      const blockId = `memtest_${ram.id}`;
      const collapsed = this._collapsedBlocks.has(blockId);
      return `
        <div class="dft-chain-block${collapsed ? ' collapsed' : ''}" data-block-id="${blockId}">
          <div class="dft-chain-header" title="Click to collapse / expand">
            <span class="dft-chain-toggle">${collapsed ? '▸' : '▾'}</span>
            <span class="dft-chain-title">${ram.label || ram.id}</span>
            <span class="dft-chain-len">${cells}×${dBits} · ${cfCount} cell fault${cfCount === 1 ? '' : 's'}</span>
            ${verdict}
          </div>
          <div class="dft-memtest-controls">
            <select class="dft-memtest-select" data-action="memtest-algo" data-ram-id="${ram.id}" title="Select test algorithm">
              ${algoOptions}
            </select>
            <button class="dft-memtest-run" data-action="memtest-run" data-ram-id="${ram.id}" title="Run the selected pattern against this RAM">▶ RUN</button>
            <span class="dft-memtest-desc">${(RAM_PATTERNS.find(p => p.id === algoId)?.label) || ''}</span>
          </div>
          ${resultBlock}
        </div>`;
    }).join('');

    return `
      <div class="dft-memtests-header dft-section-header">${headerHtml}</div>${infoPanel}
      <div class="dft-perf-row">
        <span class="k">RAMs in scene</span><span class="v">${rams.length}</span>
      </div>
      ${blocks}
    `;
  }

  // Execute a memory test pattern against a RAM and cache the result on
  // scene._dft.ramTests[ramId]. Triggered by the ▶ RUN button click.
  _runMemoryTest(ramId) {
    if (!this._scene) return;
    const ram = this._scene.nodes.find(n => n.id === ramId);
    if (!ram || ram.type !== 'RAM') return;
    const cfg = this._scene._dft?.ramTests?.[ramId] || {};
    const algoId = cfg.algorithm || 'checkerboard';
    const aBits = Math.max(1, (ram.addrBits | 0) || 4);
    const dBits = Math.max(1, (ram.dataBits | 0) || 8);
    const pattern = getRamPattern(algoId, aBits, dBits);
    if (!pattern) return;
    let result;
    try {
      result = runMemoryTest(ram, pattern);
    } catch (e) {
      console.error('[memtest]', e);
      return;
    }
    // Stash result on scene config.
    if (!this._scene._dft) this._scene._dft = {};
    if (!this._scene._dft.ramTests) this._scene._dft.ramTests = {};
    this._scene._dft.ramTests[ramId] = { algorithm: algoId, lastResult: result };
    if (this._visible) this._render();
  }

  // Switch the selected algorithm for one RAM. Pure metadata update —
  // does not run the test (user clicks ▶ RUN to actually execute).
  _setMemoryTestAlgo(ramId, algoId) {
    if (!this._scene) return;
    if (!RAM_PATTERNS.some(p => p.id === algoId)) return;
    if (!this._scene._dft) this._scene._dft = {};
    if (!this._scene._dft.ramTests) this._scene._dft.ramTests = {};
    const prev = this._scene._dft.ramTests[ramId] || {};
    // Algo change invalidates prior result — the labels would be wrong.
    this._scene._dft.ramTests[ramId] = { algorithm: algoId, lastResult: null };
    if (this._visible) this._render();
  }

  // Two-click pair-selection flow for coupling mode. First click on a
  // cell selects it as aggressor (highlighted). Second click on a
  // *different* cell opens the configuration form. Click the same cell
  // a second time to cancel the selection.
  _handleCoupleClick(ramId, addr) {
    const pending = this._couplingPending.get(ramId);
    if (pending == null) {
      this._couplingPending.set(ramId, addr);
    } else if (pending === addr) {
      this._couplingPending.delete(ramId);   // toggle off
    } else {
      // Both endpoints picked — initialise the draft.
      this._couplingDraft.set(ramId, {
        aggressor: pending,
        victim: addr,
        type: 'CFin',
        trigger: '01',
        forceTo: 1,
        aggressorValue: 1,
      });
      this._couplingPending.delete(ramId);
    }
    if (this._visible) this._render();
  }

  // ADD button: convert the draft into a permanent couplingFaults entry
  // on the RAM. Strip irrelevant fields by type to keep the schema clean.
  _commitCouplingDraft(ramId) {
    const ram = this._scene?.nodes?.find(n => n.id === ramId);
    const draft = this._couplingDraft.get(ramId);
    if (!ram || ram.type !== 'RAM' || !draft) return;
    if (!Array.isArray(ram.couplingFaults)) ram.couplingFaults = [];
    const entry = { aggressor: draft.aggressor, victim: draft.victim, type: draft.type };
    if (draft.type === 'CFin' || draft.type === 'CFid') {
      entry.trigger = draft.trigger;
    }
    if (draft.type === 'CFid' || draft.type === 'CFst') {
      entry.forceTo = draft.forceTo;
    }
    if (draft.type === 'CFst') {
      entry.aggressorValue = draft.aggressorValue;
    }
    ram.couplingFaults.push(entry);
    this._couplingDraft.delete(ramId);
    bus.emit('node:edited', { node: ram, field: 'couplingFaults' });
    if (this._visible) this._render();
  }

  // Render the SVG overlay that draws curves between coupled cells on
  // the cell-fault grid. Positions are computed from the known CSS grid
  // column widths and cell heights:
  //   col 1 (addr label): 28px
  //   col 2 (WORD):       36px
  //   data cols:          26px each
  //   column gap:         3px
  //   row height:         18px (cell) + 3px row gap
  // Curves anchor at the WORD column centre — one per aggressor and one
  // per victim. Colour-coded by type: red=CFin, orange=CFid, purple=CFst.
  _renderCouplingSVG(couplingFaults, dutDataBits, renderedCells, draft) {
    const hasDraft  = !!(draft && draft.aggressor != null && draft.victim != null);
    const hasFaults = !!(couplingFaults && couplingFaults.length);
    if (!hasFaults && !hasDraft) return '';
    const ADDR_W = 28, WORD_W = 36, CELL_W = 26, CELL_H = 18, GAP = 3;
    const headerH = CELL_H;
    const rowCenterY = (a) => headerH + GAP + CELL_H / 2 + a * (CELL_H + GAP);
    const gridW = ADDR_W + GAP + WORD_W + GAP + dutDataBits * (CELL_W + GAP) - GAP;
    const gridH = headerH + GAP + renderedCells * (CELL_H + GAP) - GAP;
    // Right-margin gutter for the curves. SVG extends beyond gridW so
    // the curves sit OUTSIDE the table, hugging its right edge.
    const GUTTER  = 90;
    const svgW    = gridW + GUTTER;
    const ANCHOR_X = gridW + 4;     // start/end x — just past the grid

    const colorOf = (t) => t === 'CFin' ? '#ff5060'
                         : t === 'CFid' ? '#ff9933'
                         : '#cc66ff';
    // Bulge proportional to address distance — closer pairs get tight
    // arcs, far pairs sweep wider. Capped so a 16-row spread still fits
    // inside the gutter.
    const bulgeFor = (a, v) => Math.min(GUTTER - 30, 16 + Math.abs(a - v) * 3);

    const renderPath = (aAddr, vAddr, type, isDraft) => {
      if (aAddr >= renderedCells || vAddr >= renderedCells) return '';
      const ay = rowCenterY(aAddr);
      const vy = rowCenterY(vAddr);
      const midY = (ay + vy) / 2;
      const bulge = bulgeFor(aAddr, vAddr);
      const cx = ANCHOR_X + bulge;
      const c  = colorOf(type);
      const dash = isDraft ? '3,3' : (type === 'CFst' ? '4,3' : '');
      const opacity = isDraft ? 0.55 : 0.9;
      // Self-coupling — small loop just outside the grid right edge.
      const dPath = (aAddr === vAddr)
        ? `M ${ANCHOR_X} ${ay - 5} C ${ANCHOR_X + 28} ${ay - 12}, ${ANCHOR_X + 28} ${ay + 12}, ${ANCHOR_X} ${ay + 5}`
        : `M ${ANCHOR_X} ${ay} Q ${cx} ${midY} ${ANCHOR_X} ${vy}`;
      const arrowId = `dft-couple-arrow-${type}${isDraft ? '-draft' : ''}`;
      // Small filled dot at the aggressor anchor so the curve start is
      // visually grounded to the row even though there's no cell at
      // that x. The arrowhead at the victim provides the same grounding.
      const startDot = `<circle cx="${ANCHOR_X}" cy="${ay}" r="2.5" fill="${c}" opacity="${opacity}"/>`;
      return `
        ${startDot}
        <path d="${dPath}" stroke="${c}" stroke-width="2.2" fill="none" opacity="${opacity}"
              stroke-dasharray="${dash}"
              marker-end="url(#${arrowId})"
              style="filter: drop-shadow(0 0 4px ${c}aa)"/>
        <text x="${cx + 6}" y="${midY + 4}" fill="${c}" font-size="10"
              font-family="JetBrains Mono, monospace" font-weight="bold"
              text-anchor="start" opacity="${isDraft ? 0.85 : 1}"
              style="text-shadow: 0 0 4px ${c}88">${type}${isDraft ? '?' : ''}</text>`;
    };

    const committedPaths = (couplingFaults || []).map(cf =>
      renderPath(cf.aggressor, cf.victim, cf.type, false)
    ).join('');

    // Preview path for the draft (during form configuration). Same
    // colour as the chosen type, but dashed + lower opacity to signal
    // "not committed yet".
    const draftPath = hasDraft
      ? renderPath(draft.aggressor, draft.victim, draft.type || 'CFin', true)
      : '';

    // Arrow markers — one per type, plus draft variants (smaller alpha).
    const marker = (id, fill) => `
      <marker id="${id}" markerWidth="9" markerHeight="9"
              refX="7.5" refY="4.5" orient="auto">
        <polygon points="0 0, 9 4.5, 0 9" fill="${fill}"/>
      </marker>`;

    return `
      <svg class="dft-mbist-couple-svg" width="${svgW}" height="${gridH}"
           viewBox="0 0 ${svgW} ${gridH}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          ${marker('dft-couple-arrow-CFin',       '#ff5060')}
          ${marker('dft-couple-arrow-CFid',       '#ff9933')}
          ${marker('dft-couple-arrow-CFst',       '#cc66ff')}
          ${marker('dft-couple-arrow-CFin-draft', '#ff5060')}
          ${marker('dft-couple-arrow-CFid-draft', '#ff9933')}
          ${marker('dft-couple-arrow-CFst-draft', '#cc66ff')}
        </defs>
        ${committedPaths}
        ${draftPath}
      </svg>`;
  }

  // Inline form rendered below the cell grid when the user has just
  // picked an aggressor + victim pair. Lets the user choose the
  // coupling type and the type-specific parameters (trigger / forceTo /
  // aggressorValue), then ADD to commit or CANCEL to discard.
  _renderCouplingForm(ramId, draft) {
    const radio = (field, value, label, tip = '') => {
      const checked = String(draft[field]) === String(value);
      return `<button class="dft-couple-radio${checked ? ' checked' : ''}"
                     data-action="couple-set" data-ram-id="${ramId}"
                     data-field="${field}" data-value="${value}"
                     title="${tip}">
        <span class="dot"></span>${label}
      </button>`;
    };
    const triggerRow = (draft.type === 'CFin' || draft.type === 'CFid')
      ? `<div class="dft-couple-form-row">
           <span class="lbl">TRIGGER</span>
           ${radio('trigger', '01',  '0→1',  'Aggressor write transition from all-zero to all-ones')}
           ${radio('trigger', '10',  '1→0',  'Aggressor write transition from all-ones to all-zero')}
           ${radio('trigger', 'any', 'any',  'Either direction triggers')}
         </div>`
      : '';
    const aggValueRow = (draft.type === 'CFst')
      ? `<div class="dft-couple-form-row">
           <span class="lbl">AGG STATE</span>
           ${radio('aggressorValue', 0, 'all-0', 'Trigger while aggressor holds 0x0')}
           ${radio('aggressorValue', 1, 'all-1', 'Trigger while aggressor holds all-ones')}
         </div>`
      : '';
    const forceRow = (draft.type === 'CFid' || draft.type === 'CFst')
      ? `<div class="dft-couple-form-row">
           <span class="lbl">FORCE VICTIM</span>
           ${radio('forceTo', 0, 'all-0', 'Force victim to 0x0')}
           ${radio('forceTo', 1, 'all-1', 'Force victim to all-ones')}
         </div>`
      : '';
    return `
      <div class="dft-couple-form">
        <div class="dft-couple-form-title">
          PAIR: <code>addr ${draft.aggressor}</code> → <code>addr ${draft.victim}</code>
        </div>
        <div class="dft-couple-form-row">
          <span class="lbl">TYPE</span>
          ${radio('type', 'CFin', 'CFin', 'Inversion coupling: aggressor transition flips victim')}
          ${radio('type', 'CFid', 'CFid', 'Idempotent coupling: aggressor transition forces victim to a fixed value')}
          ${radio('type', 'CFst', 'CFst', 'State coupling: while aggressor holds a state, victim reads as a forced value')}
        </div>
        ${triggerRow}
        ${aggValueRow}
        ${forceRow}
        <div class="dft-couple-form-actions">
          <button class="dft-couple-add"    data-action="couple-add"    data-ram-id="${ramId}">✓ ADD</button>
          <button class="dft-couple-cancel" data-action="couple-cancel" data-ram-id="${ramId}">✕ CANCEL</button>
        </div>
      </div>`;
  }

  // Compact list of all coupling entries on a RAM, each with a ✕ button
  // to remove. Rendered below the form (or below the grid when no form
  // is active). Empty when the RAM has no coupling faults.
  _renderCouplingList(ramId, couplingFaults) {
    const typeColor = (t) => t === 'CFin' ? '#ff5060' : t === 'CFid' ? '#ff9933' : '#cc66ff';
    const rows = couplingFaults.map((cf, i) => {
      let detail = '';
      if (cf.type === 'CFin') detail = `trigger ${cf.trigger}`;
      else if (cf.type === 'CFid') detail = `trigger ${cf.trigger} · force ${cf.forceTo ? 'all-1' : 'all-0'}`;
      else if (cf.type === 'CFst') detail = `agg=${cf.aggressorValue ? 'all-1' : 'all-0'} · force ${cf.forceTo ? 'all-1' : 'all-0'}`;
      return `
        <div class="dft-couple-list-row">
          <code class="addr">${cf.aggressor}</code>
          <span class="arrow">→</span>
          <code class="addr">${cf.victim}</code>
          <span class="type" style="color:${typeColor(cf.type)}">${cf.type}</span>
          <span class="detail">${detail}</span>
          <button class="rm" data-action="couple-remove"
                  data-ram-id="${ramId}" data-idx="${i}"
                  title="Remove this coupling fault">✕</button>
        </div>`;
    }).join('');
    return `
      <div class="dft-couple-list">
        <div class="dft-couple-list-title">COUPLING FAULTS · ${couplingFaults.length}</div>
        ${rows}
      </div>`;
  }

  _renderMbistControllers() {
    const allNodes = this._scene?.nodes || [];
    const wires    = this._scene?.wires || [];
    const ctls     = allNodes.filter(n => n.type === 'MBIST_CONTROLLER');

    const headerHtml = `<span class="dft-section-title">MEMORY BIST` +
      `<button class="dft-info-btn" data-action="toggle-info" data-section="mbist" title="What does this section show?">i</button>` +
      `</span>`;
    const infoPanel = this._infoOpen.has('mbist') ? `
      <div class="dft-info-panel">
        <div class="dft-info-lead">Each MBIST_CONTROLLER walks a connected RAM through the March C− algorithm: { ⇕w0; ⇑r0,w1; ⇑r1,w0; ⇓r0,w1; ⇓r1,w0; ⇕r0 }. Drives ADDR / DATA / WE / RE through an optional 4-mux TEST_MODE collar; monitors RAM.Q via DATA_IN.</div>
        <div class="dft-info-row">
          <span class="dft-chain-status warn">idle</span>
          <span class="dft-info-text">Waiting for START. Pulse START to begin the March test (≈ 15·N cycles for N cells).</span>
        </div>
        <div class="dft-info-row">
          <span class="dft-chain-status warn">running</span>
          <span class="dft-info-text">FSM in SETUP / W0_UP / RW1_UP / RW0_UP / RW1_DN / RW0_DN / READ_FINAL — TEST_MODE high.</span>
        </div>
        <div class="dft-info-row">
          <span class="dft-chain-status ok">pass</span>
          <span class="dft-info-text">All cells passed every March element — RAM is fault-free under this test.</span>
        </div>
        <div class="dft-info-row">
          <span class="dft-chain-status bad">fail</span>
          <span class="dft-info-text">First mismatch detected — <code>failAddr</code> / <code>failBit</code> pin the offending cell.</span>
        </div>

        <div class="dft-info-subtitle">Stuck-at cell faults <span class="dft-info-subtitle-hint">(STUCK mode below — click cells to cycle)</span></div>
        <table class="dft-info-table">
          <thead>
            <tr><th>Type</th><th>What it does</th><th>Best pattern to catch</th></tr>
          </thead>
          <tbody>
            <tr>
              <td class="algo sa1">s-a-1</td>
              <td>Cell always reads all-ones, regardless of writes.</td>
              <td><b>All-zero</b> — writes 0, expects 0; faulty cell returns 0xF → FAIL.</td>
            </tr>
            <tr>
              <td class="algo sa0">s-a-0</td>
              <td>Cell always reads 0.</td>
              <td><b>All-one</b> — writes 0xF, expects 0xF; faulty cell returns 0 → FAIL.</td>
            </tr>
            <tr>
              <td class="algo bit">single-bit</td>
              <td>Only one bit position in the word is stuck; the rest of the word is healthy.</td>
              <td><b>Walking-1 / Walking-0</b> — exercises every bit through both polarities.</td>
            </tr>
          </tbody>
        </table>

        <div class="dft-info-subtitle">Coupling faults between cells <span class="dft-info-subtitle-hint">(🔗 COUPLE mode below — pick aggressor + victim)</span></div>
        <table class="dft-info-table">
          <thead>
            <tr><th>Type</th><th>Triggers when</th><th>Effect on victim</th><th>Best pattern</th></tr>
          </thead>
          <tbody>
            <tr>
              <td class="algo cfin">CFin</td>
              <td>Aggressor write transition (0→1 or 1→0)</td>
              <td>victim <b>flips</b> from its current value</td>
              <td><b>Walking-1 / Walking-0</b></td>
            </tr>
            <tr>
              <td class="algo cfid">CFid</td>
              <td>Aggressor write transition</td>
              <td>victim <b>forced</b> to <code>forceTo</code></td>
              <td>Walking-1 (trig 01) / Walking-0 (trig 10)</td>
            </tr>
            <tr>
              <td class="algo cfst">CFst</td>
              <td>Aggressor <em>holds</em> <code>aggressorValue</code> — no write needed!</td>
              <td>every read returns <code>forceTo</code></td>
              <td><b>All-one</b> or <b>All-zero</b> (matching state)</td>
            </tr>
          </tbody>
        </table>

        <div class="dft-info-text-row">
          <b>Cell-fault grid below:</b> rows = address, columns = bit (plus <code>WORD</code> = whole-cell).
          Click cells in <b>STUCK</b> mode to cycle <code>clean → s-a-1 → s-a-0 → clean</code>.
          Switch to <b>🔗 COUPLE</b> mode, then click two cells to inject a coupling fault between them.
          All edits mutate <code>ram.cellFaults</code> / <code>ram.couplingFaults</code> and become visible the next cycle —
          re-pulse <b>START</b> to re-test.
        </div>
      </div>` : '';

    if (ctls.length === 0) return '';

    const ffStates = window.state?.ffStates;
    const STATE_NAMES = ['IDLE', 'SETUP', 'W0_UP', 'RW1_UP', 'RW0_UP', 'RW1_DN', 'RW0_DN', 'READ_FINAL', 'DONE', 'FAIL'];
    const STEP_NAMES  = ['⇕ w0', '⇑ r0,w1', '⇑ r1,w0', '⇓ r0,w1', '⇓ r1,w0', '⇕ r0'];

    const blocks = ctls.map(ctl => {
      const aBits   = Math.max(1, (ctl.addrBits | 0) || 4);
      const dBits   = Math.max(1, (ctl.dataBits | 0) || 8);
      const N       = 1 << aBits;
      const ms      = ffStates?.get?.(ctl.id);
      const stateN  = (ms && typeof ms.mbistState  === 'number') ? ms.mbistState  : 0;
      const step    = (ms && typeof ms.marchStep   === 'number') ? ms.marchStep   : 0;
      const addr    = (ms && typeof ms.addrCounter === 'number') ? ms.addrCounter : 0;
      const sub     = (ms && typeof ms.subPhase    === 'number') ? ms.subPhase    : 0;
      const failAddr = (ms && ms.failAddr !== undefined) ? ms.failAddr : null;
      const failBit  = (ms && ms.failBit  !== undefined) ? ms.failBit  : null;
      const sName   = STATE_NAMES[stateN] || '?';
      const stepName = STEP_NAMES[step] || '—';

      let cls, label;
      if (stateN === 8)      { cls = 'ok';   label = 'pass'; }
      else if (stateN === 9) { cls = 'bad';  label = 'fail'; }
      else if (stateN === 0) { cls = 'warn'; label = 'idle'; }
      else                   { cls = 'warn'; label = 'running'; }

      // Resolve the RAM under test (walks ADDR/DATA/WE/RE wires, one BUS_MUX hop allowed).
      const dut = describeMbistDut(ctl, allNodes, wires);

      // Cell-fault injection grid for the auto-detected DUT.
      let cellGrid = '';
      if (dut.ram) {
        const cellFaults     = dut.ram.cellFaults || {};
        const couplingFaults = dut.ram.couplingFaults || [];
        const ramId          = dut.ram.id;
        const dutAddrBits = Math.max(1, (dut.ram.addrBits | 0) || 4);
        const dutDataBits = Math.max(1, (dut.ram.dataBits | 0) || 8);
        const cells = 1 << dutAddrBits;
        const bitCols = Array.from({ length: dutDataBits }, (_, i) => dutDataBits - 1 - i); // MSB-first display
        // Cap rendered cell count to keep the panel responsive on huge RAMs.
        const renderedCells = Math.min(cells, 64);
        const mode = this._couplingMode.get(ramId) || 'stuck';
        const pendingAggressor = this._couplingPending.get(ramId);
        const draft = this._couplingDraft.get(ramId) || null;
        const isAggressorOf = new Set();   // addrs that are aggressors of an existing CF
        const isVictimOf    = new Set();
        for (const cf of couplingFaults) {
          isAggressorOf.add(cf.aggressor);
          isVictimOf.add(cf.victim);
        }
        // Draft endpoints — kept highlighted while the configuration
        // form is open so the user can always see which pair they're
        // configuring (otherwise the cells would lose their pending
        // outline the moment the form appears).
        const draftAggAddr = draft ? draft.aggressor : null;
        const draftVicAddr = draft ? draft.victim    : null;
        const cellRows = Array.from({ length: renderedCells }, (_, a) => {
          const f = cellFaults[a];
          const wordState = !f ? '·' : (f.bit == null ? (f.stuckAt === 1 ? '1' : '0') : '·');
          const wordCls   = !f ? 'clean' : (f.bit == null ? (f.stuckAt === 1 ? 'sa1' : 'sa0') : 'clean');
          // Coupling-mode visual markers on the WORD cell. Order of
          // precedence (most specific first): pending > draft-aggressor
          // > draft-victim > committed-aggressor > committed-victim.
          let extraWordCls = '';
          if (mode === 'couple') {
            if (pendingAggressor === a)            extraWordCls = ' couple-pending';
            else if (draftAggAddr === a)            extraWordCls = ' couple-draft-agg';
            else if (draftVicAddr === a)            extraWordCls = ' couple-draft-vic';
            else if (isAggressorOf.has(a))          extraWordCls = ' couple-aggressor';
            else if (isVictimOf.has(a))             extraWordCls = ' couple-victim';
          }
          const wordTitle = mode === 'couple'
            ? (draftAggAddr === a
                ? `addr ${a} — AGGRESSOR of pending pair`
                : draftVicAddr === a
                  ? `addr ${a} — VICTIM of pending pair`
                  : pendingAggressor == null
                    ? `addr ${a} — click to select as AGGRESSOR`
                    : pendingAggressor === a
                      ? `addr ${a} — click again to cancel selection`
                      : `addr ${a} — click to PAIR with aggressor ${pendingAggressor}`)
            : `addr ${a} · WORD (every bit) — click to cycle clean → s-a-1 → s-a-0`;
          const bitCells = bitCols.map(b => {
            let state = '·'; let bcls = 'clean';
            if (f && f.bit === null) {
              state = (f.stuckAt === 1) ? '1' : '0';
              bcls  = (f.stuckAt === 1) ? 'sa1' : 'sa0';
            } else if (f && f.bit === b) {
              state = (f.stuckAt === 1) ? '1' : '0';
              bcls  = (f.stuckAt === 1) ? 'sa1' : 'sa0';
            }
            return `<span class="dft-mbist-cell ${bcls}" data-action="mbist-cell-toggle"
                          data-ram-id="${ramId}" data-addr="${a}" data-bit="${b}"
                          title="addr ${a} · bit ${b} — click to cycle clean → s-a-1 → s-a-0">${state}</span>`;
          }).join('');
          return `
            <span class="dft-mbist-addrlabel">${a}</span>
            <span class="dft-mbist-cell ${wordCls}${extraWordCls}" data-action="mbist-cell-toggle"
                  data-ram-id="${ramId}" data-addr="${a}" data-bit="word"
                  data-cell-addr="${a}"
                  title="${wordTitle}">${wordState}</span>
            ${bitCells}`;
        }).join('');
        const bitHeader = bitCols.map(b => `<span class="dft-mbist-bitlabel">b${b}</span>`).join('');
        const truncatedNote = cells > renderedCells
          ? `<div class="dft-info-text" style="margin-top:6px">Showing first ${renderedCells} of ${cells} cells — edit larger RAMs via JSON.</div>`
          : '';

        // Coupling toolbar — mode switch + count chip.
        const modeToolbar = `
          <div class="dft-mbist-mode-toolbar">
            <button class="dft-mbist-mode-btn${mode === 'stuck' ? ' active' : ''}"
                    data-action="couple-mode" data-mode="stuck" data-ram-id="${ramId}"
                    title="Click cells to cycle stuck-at-1 / stuck-at-0 / clean.">STUCK</button>
            <button class="dft-mbist-mode-btn${mode === 'couple' ? ' active couple' : ''}"
                    data-action="couple-mode" data-mode="couple" data-ram-id="${ramId}"
                    title="Click two cells to pair as aggressor → victim and inject a coupling fault.">🔗 COUPLE</button>
            <span class="dft-mbist-coupling-chip${couplingFaults.length ? ' has' : ''}"
                  title="${couplingFaults.length} coupling fault${couplingFaults.length === 1 ? '' : 's'} on this RAM">
              ${couplingFaults.length} coupling fault${couplingFaults.length === 1 ? '' : 's'}
            </span>
          </div>`;

        // Pending hint — only in couple mode.
        const pendingHint = mode === 'couple'
          ? (pendingAggressor == null
              ? `<div class="dft-mbist-couple-hint">Click any cell in the WORD column to select it as the <b>aggressor</b>.</div>`
              : `<div class="dft-mbist-couple-hint active">Aggressor: <code>addr ${pendingAggressor}</code> — click another cell to pair, or click <code>addr ${pendingAggressor}</code> again to cancel.</div>`)
          : '';

        // Inline form (only when a draft exists).
        const inlineForm = draft ? this._renderCouplingForm(ramId, draft) : '';

        // Coupling list (existing entries) with delete buttons.
        const couplingList = couplingFaults.length > 0
          ? this._renderCouplingList(ramId, couplingFaults)
          : '';

        cellGrid = `
          <div class="dft-mbist-faults">
            <div class="dft-mbist-faults-title">CELL FAULTS · ${dut.ram.label || dut.ram.id} (${cells}×${dutDataBits})</div>
            ${modeToolbar}
            ${pendingHint}
            <div class="dft-mbist-grid-wrap">
              <div class="dft-mbist-grid" style="grid-template-columns: 28px 36px repeat(${dutDataBits}, 26px)">
                <span class="dft-mbist-corner">addr</span>
                <span class="dft-mbist-bitlabel">WORD</span>
                ${bitHeader}
                ${cellRows}
              </div>
              ${this._renderCouplingSVG(couplingFaults, dutDataBits, renderedCells, draft)}
            </div>
            ${truncatedNote}
            ${inlineForm}
            ${couplingList}
          </div>`;
      }

      // DUT line — friendly summary of what's connected.
      let dutLine;
      if (dut.ram) {
        dutLine = `<code>${dut.ram.label || dut.ram.id}</code> <small>${dut.throughMux ? '(via TEST_MODE mux collar)' : '(direct)'} — ${(1 << (dut.ram.addrBits|0)) || 1}×${dut.ram.dataBits|0 || 1}</small>`;
      } else {
        const why = dut.reason === 'mismatched' ? 'wires diverge to multiple RAMs'
                  : dut.reason === 'partial' ? 'not all 4 output wires reach a RAM'
                  : 'no RAM connected';
        dutLine = `<small>— ${why} —</small>`;
      }

      // failAddr / failBit summary (only meaningful in FAIL state).
      const failLine = (stateN === 9)
        ? `<code>${failAddr}</code> <small>${failBit !== null ? '(bit ' + failBit + ')' : '(whole word)'}</small>`
        : `<small>—</small>`;

      const blockId = `mbist_${ctl.id}`;
      const collapsed = this._collapsedBlocks.has(blockId);
      return `
        <div class="dft-chain-block${collapsed ? ' collapsed' : ''}" data-block-id="${blockId}">
          <div class="dft-chain-header" title="Click to collapse / expand">
            <span class="dft-chain-toggle">${collapsed ? '▸' : '▾'}</span>
            <span class="dft-chain-title">${ctl.label || ctl.id}</span>
            <span class="dft-chain-len">${aBits}-bit addr · ${dBits}-bit data · March C−</span>
            <span class="dft-chain-status ${cls}">${label}</span>
          </div>
          <div class="dft-lfsr-grid">
            <span class="dft-lfsr-k">state</span>
            <span class="dft-lfsr-v"><code>${sName}</code> <small>(code ${stateN})</small></span>
            <span class="dft-lfsr-k">march step</span>
            <span class="dft-lfsr-v"><code>${step}</code> <small>${stepName}</small></span>
            <span class="dft-lfsr-k">addr</span>
            <span class="dft-lfsr-v"><code>${addr}</code> <small>of ${N - 1} · sub-phase ${sub}</small></span>
            <span class="dft-lfsr-k">failAddr</span>
            <span class="dft-lfsr-v">${failLine}</span>
            <span class="dft-lfsr-k">DUT</span>
            <span class="dft-lfsr-v">${dutLine}</span>
          </div>
          ${cellGrid}
        </div>`;
    }).join('');

    return `
      <div class="dft-bist-header dft-section-header">${headerHtml}</div>${infoPanel}
      <div class="dft-perf-row">
        <span class="k">Controllers</span><span class="v">${ctls.length}</span>
      </div>
      ${blocks}
    `;
  }

  // ── JTAG TAPS (Layer 7) ────────────────────────────────────
  // One block per JTAG_TAP node: current TAP state name (one of 16),
  // IR + DR contents, IDCODE, and how many BOUNDARY_SCAN_CELLs sit
  // in the current scene.
  _renderJtagTaps() {
    const allNodes = this._scene?.nodes || [];
    const taps     = allNodes.filter(n => n.type === 'JTAG_TAP');
    const bscCount = allNodes.filter(n => n.type === 'BOUNDARY_SCAN_CELL').length;

    const headerHtml = `<span class="dft-section-title">JTAG TAPS` +
      `<button class="dft-info-btn" data-action="toggle-info" data-section="jtag" title="What does this section show?">i</button>` +
      `</span>`;
    const infoPanel = this._infoOpen.has('jtag') ? `
      <div class="dft-info-panel">
        <div class="dft-info-lead">Each JTAG TAP runs the IEEE 1149.1 16-state FSM. TMS on posedge TCK walks states; Shift-IR/DR clock TDI through the IR / DR registers and emit TDO. Boundary-scan cells form the chain that lets a tester poke and read every IO pin.</div>
        <div class="dft-info-row">
          <span class="dft-chain-status warn">TLR</span>
          <span class="dft-info-text">Test-Logic-Reset — TAP idle, IR cleared. Reached after 5×TMS=1 from anywhere.</span>
        </div>
        <div class="dft-info-row">
          <span class="dft-chain-status ok">Shift-DR/IR</span>
          <span class="dft-info-text">Active shifting — TDI is being clocked into the chain, TDO emits the LSB.</span>
        </div>
        <div class="dft-info-row">
          <span class="dft-chain-status warn">Update-*</span>
          <span class="dft-info-text">Latch the shifted value into the parallel hold register (e.g. boundary-scan cell update).</span>
        </div>
      </div>` : '';

    if (taps.length === 0) return '';

    const STATE_NAMES = [
      'Test-Logic-Reset', 'Run-Test/Idle',
      'Select-DR', 'Capture-DR', 'Shift-DR', 'Exit1-DR', 'Pause-DR', 'Exit2-DR', 'Update-DR',
      'Select-IR', 'Capture-IR', 'Shift-IR', 'Exit1-IR', 'Pause-IR', 'Exit2-IR', 'Update-IR',
    ];
    const ffStates = window.state?.ffStates;
    const radix = this._misrRadix;
    const fmtVal = (v, W) => {
      if (radix === 'dec') return String(v >>> 0);
      if (radix === 'hex') return '0x' + (v >>> 0).toString(16);
      return (v >>> 0).toString(2).padStart(W, '0');
    };

    const blocks = taps.map(tap => {
      const irBits = Math.max(1, (tap.irBits | 0) || 4);
      const ms     = ffStates?.get?.(tap.id);
      const stateN = (ms && typeof ms.tapState === 'number') ? ms.tapState : 0;
      const sName  = STATE_NAMES[stateN] || '?';
      const ir     = (ms && typeof ms.ir === 'number') ? ms.ir : 0;
      const dr     = (ms && typeof ms.dr === 'number') ? ms.dr : 0;
      const idcode = (tap.idcode | 0) >>> 0;

      let cls, label;
      if (stateN === 4 || stateN === 11)        { cls = 'ok';   label = 'shifting'; }
      else if (stateN === 0)                    { cls = 'warn'; label = 'TLR'; }
      else if (stateN === 8 || stateN === 15)   { cls = 'warn'; label = 'updated'; }
      else                                      { cls = 'warn'; label = 'idle'; }

      const blockId = `jtag_${tap.id}`;
      const collapsed = this._collapsedBlocks.has(blockId);
      return `
        <div class="dft-chain-block${collapsed ? ' collapsed' : ''}" data-block-id="${blockId}">
          <div class="dft-chain-header" title="Click to collapse / expand">
            <span class="dft-chain-toggle">${collapsed ? '▸' : '▾'}</span>
            <span class="dft-chain-title">${tap.label || tap.id}</span>
            <span class="dft-chain-len">${irBits}-bit IR · 32-bit DR</span>
            <span class="dft-chain-status ${cls}">${label}</span>
          </div>
          <div class="dft-lfsr-grid">
            <span class="dft-lfsr-k">state</span>
            <span class="dft-lfsr-v">
              <code>${sName}</code> <small>(code ${stateN})</small>
            </span>
            <span class="dft-lfsr-k">IR</span>
            <span class="dft-lfsr-v">
              <code>${fmtVal(ir, irBits)}</code> <small>${irBits}-bit instruction</small>
            </span>
            <span class="dft-lfsr-k">DR</span>
            <span class="dft-lfsr-v">
              <code>${fmtVal(dr, 32)}</code> <small>32-bit data shift</small>
            </span>
            <span class="dft-lfsr-k">irBits</span>
            ${this._renderMisrField(tap.id, 'irBits',
              `<code>${irBits}</code>`,
              { current: irBits, inputType: 'number', minMax: 'min="1" max="16"',
                hint: 'IR width — 4–8 typical' })}
            <span class="dft-lfsr-k">IDCODE</span>
            ${this._renderMisrField(tap.id, 'idcode',
              `<code>0x${idcode.toString(16).padStart(8, '0')}</code>`,
              { current: '0x' + idcode.toString(16),
                hint: 'dec, 0xHEX, or 0bBIN — 32-bit JEP-106 device code' })}
            <span class="dft-lfsr-k">BSCs</span>
            <span class="dft-lfsr-v">
              <code>${bscCount}</code> <small>boundary-scan cells in scene</small>
            </span>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="dft-jtag-header dft-section-header">${headerHtml}</div>${infoPanel}
      <div class="dft-perf-row">
        <span class="k">TAP controllers</span><span class="v">${taps.length}</span>
      </div>
      ${blocks}
    `;
  }

  // ── FAULT LIST ──────────────────────────────────────────────
  // ── FAULT DIAGNOSIS (Phase 3) ──────────────────────────────
  // Single-fault diagnosis: rank the wire-level faults by how well
  // their detection signature matches the current scene's observed
  // mismatch pattern. Only meaningful after RUN FAULT SIM (builds the
  // dictionary) and with at least one wire fault currently injected.
  _renderDiagnosis() {
    const wires = this._scene?.wires || [];
    const injected = wires.filter(w => w.stuckAt === 0 || w.stuckAt === 1 || w.open || w.bridgedWith);

    const headerHtml = `<span class="dft-section-title">FAULT DIAGNOSIS` +
      `<button class="dft-info-btn" data-action="toggle-info" data-section="diagnosis" title="What does this section show?">i</button>` +
      `</span>`;
    const infoPanel = this._infoOpen.has('diagnosis') ? `
      <div class="dft-info-panel">
        <div class="dft-info-lead">Single-fault diagnosis. Given an observed output mismatch, rank wire-level faults by how well their detection signature matches the observation. Top-1 with score 1.0 = exact match. Equivalent faults (e.g. an AND's input stuck-at-0 vs its output stuck-at-0) tie at the same score — the diagnoser cannot distinguish them from the boundary alone.</div>
        <div class="dft-info-row">
          <span class="dft-chain-status warn">no sim</span>
          <span class="dft-info-text">Run RUN FAULT SIM first to build the dictionary that diagnosis matches against.</span>
        </div>
        <div class="dft-info-row">
          <span class="dft-chain-status warn">no inj</span>
          <span class="dft-info-text">No injected faults on any wire — nothing to diagnose. Right-click a wire on the canvas to inject s-a-0/s-a-1/open/bridge, then come back.</span>
        </div>
        <div class="dft-info-row">
          <span class="dft-chain-status ok">match</span>
          <span class="dft-info-text">Top suspects with score 1.0 + ✓ exact tag. The diagnoser narrowed it down (modulo equivalent-fault classes).</span>
        </div>
      </div>` : '';

    // Hide entirely until the user has clicked RUN FAULT SIM —
    // diagnosis is undefined without a dictionary to match against.
    if (!this._lastSim) return '';
    if (injected.length === 0) {
      return `
        <div class="dft-diagnosis-header dft-section-header">${headerHtml}</div>${infoPanel}
        <div class="dft-empty">No wire faults injected — diagnosis is undefined. Right-click a wire on the canvas (or use the FAULT LIST below) to inject a fault, then click <b style="color:#40cc60">DIAGNOSE</b>.</div>
      `;
    }

    // Inject summary chips.
    const injChips = injected.slice(0, 5).map(w => {
      const kind = (w.stuckAt === 0) ? 'sa0' : (w.stuckAt === 1) ? 'sa1' : (w.open ? 'open' : 'bridge');
      const color = (kind === 'sa0' || kind === 'sa1') ? '#ff9933' : (kind === 'open' ? '#ff4040' : '#cc66ff');
      return `<code style="color:${color};margin-right:6px">${w.id}/${kind}</code>`;
    }).join('');
    const moreInj = injected.length > 5 ? `<small style="color:#876">+${injected.length - 5} more</small>` : '';

    // Suspect list (if a diagnose has been run).
    let suspectsBlock = '';
    if (this._lastDiagnosis) {
      const { suspects, observed, mismatchCount, totalVectors } = this._lastDiagnosis;
      const obsBits = observed
        ? observed.split('').map(b => b === '1'
            ? '<span style="color:#ff4040">1</span>'
            : '<span style="color:#666">0</span>').join('')
        : '<span style="color:#666">none</span>';

      const rows = suspects.length === 0
        ? `<div class="dft-empty">no candidates ranked.</div>`
        : suspects.map((s, i) => {
            const pct = Math.round(s.score * 100);
            const tier = pct >= 80 ? '#40cc60' : pct >= 50 ? '#cca040' : '#cc4040';
            const exactTag = s.exact ? '<span style="color:#40cc60;margin-left:6px;font-size:0.9em" title="Signature matches exactly — this fault perfectly explains the observation.">✓ exact</span>' : '';
            const barW = Math.max(2, pct);
            return `
              <div class="dft-diag-row" data-action="diag-select" data-fault-id="${s.faultId}" title="Click to highlight ${s.faultId} on the canvas">
                <span class="dft-diag-rank">#${i + 1}</span>
                <code class="dft-diag-fid" style="color:${tier}">${s.faultId}</code>
                <div class="dft-diag-bar">
                  <div class="dft-diag-bar-fill" style="width:${barW}%;background:linear-gradient(90deg,${tier}88,${tier});box-shadow:0 0 8px ${tier}66"></div>
                  <div class="dft-diag-bar-text">${pct}%</div>
                </div>
                <span class="dft-diag-meta"><small>${s.matches1} / ${observed.split('').filter(c => c === '1').length} mismatches matched</small>${exactTag}</span>
              </div>`;
          }).join('');

      suspectsBlock = `
        <div class="dft-perf-row" style="grid-template-columns:1fr">
          <div style="font-size:0.92em">
            <span style="color:#876">Observed signature:</span>
            <code style="margin-left:6px;letter-spacing:2px;font-size:1.05em">${obsBits}</code>
            <span style="color:#876;margin-left:8px">${mismatchCount} of ${totalVectors} vectors mismatched</span>
          </div>
        </div>
        <div class="dft-diag-list">${rows}</div>`;
    }

    return `
      <div class="dft-diagnosis-header dft-section-header">${headerHtml}</div>${infoPanel}
      <div class="dft-perf-row" style="grid-template-columns:1fr">
        <div style="display:flex;align-items:center;gap:1em;flex-wrap:wrap">
          <span style="color:#876">Active injections (${injected.length}):</span>
          ${injChips} ${moreInj}
          <button class="dft-diag-run" data-action="diag-run" title="Run the diagnostic: apply each vector against the current scene, compute the mismatch signature, and rank wire-fault candidates by Hamming similarity.">🔍 DIAGNOSE</button>
        </div>
      </div>
      ${suspectsBlock}
    `;
  }

  // Run diagnosis: build dictionary from _lastSim, observe signature
  // against the current scene, rank suspects. Result cached on
  // this._lastDiagnosis until topology mutates or DIAGNOSE re-clicked.
  _runDiagnosis() {
    if (!this._scene || !this._lastSim) return;
    try {
      this._lastDiagnosis = diagnoseScene(
        this._scene.nodes, this._scene.wires, this._lastSim,
        { topK: 5 },
      );
    } catch (e) {
      console.error('[diagnose]', e);
      this._lastDiagnosis = null;
    }
    if (this._visible) this._render();
  }

  // Click a suspect row → emit a scene selection event so the canvas
  // highlights the wire. Tolerant — if the bus doesn't have listeners
  // (no canvas focus) the click simply does nothing.
  _selectDiagnosisFault(faultId) {
    const slash = faultId.lastIndexOf('/');
    if (slash < 0) return;
    const wireId = faultId.slice(0, slash);
    bus.emit('scene:select-wire', { wireId });
  }

  _renderFaultList(wires) {
    // Section header + ⓘ legend for the fault model abbreviations.
    // Same shape as Pattern Generators / Scan Chains; reuses the
    // shared .dft-info-panel styling.
    const flHeader = `<span class="dft-section-title">FAULT LIST` +
      `<button class="dft-info-btn" data-action="toggle-info" data-section="faultlist" title="What do the column names mean?">i</button>` +
      `</span>`;
    const flInfoPanel = this._infoOpen.has('faultlist') ? `
      <div class="dft-info-panel">
        <div class="dft-info-lead">Every wire is a potential fault site. The four columns are the fault models the simulator can inject; "injected" shows which are currently active.</div>
        <div class="dft-info-row">
          <span class="dft-chain-status warn">s-a-0 / s-a-1</span>
          <span class="dft-info-text">Stuck-at fault — the wire is forced to 0 (or 1) regardless of its driver.</span>
        </div>
        <div class="dft-info-row">
          <span class="dft-chain-status bad">open</span>
          <span class="dft-info-text">Wire severed; downstream sees null / undefined.</span>
        </div>
        <div class="dft-info-row">
          <span class="dft-chain-status bad">bridge</span>
          <span class="dft-info-text">Wire shorted to another; both nets converge to one (typically AND-style).</span>
        </div>
        <div class="dft-info-row">
          <span class="dft-chain-status ok">injected</span>
          <span class="dft-info-text">✓ when a fault is currently active on this wire (you toggled it on).</span>
        </div>
      </div>
    ` : '';

    if (!wires.length) {
      return `
        <div class="dft-faultlist-header dft-section-header">${flHeader}</div>${flInfoPanel}
        <div class="dft-empty">no wires in scene — drop components and connect them to enumerate fault sites.</div>
      `;
    }
    // Visual conventions per fault type:
    //   stuck-at  → orange pill with S0 / S1
    //   open      → red pill "OPN"
    //   bridging  → purple pill "B→<other>"
    //   inactive  → dim dot
    const cellInactive = '<span style="color:#444">·</span>';
    const pill = (bg, fg, text) =>
      `<span style="display:inline-block;min-width:22px;padding:1px 6px;background:${bg};color:${fg};border-radius:10px;font-weight:bold;font-size:0.85em;letter-spacing:0.5px;box-shadow:0 0 6px ${bg}99">${text}</span>`;

    // Build a per-wire detection summary if a fault-sim result is cached.
    // Maps wireId → { sa0: [vec idx...], sa1: [...], open: [...] }.
    const det = new Map();
    if (this._lastSim) {
      this._lastSim.perFault.forEach(f => {
        if (!det.has(f.wireId)) det.set(f.wireId, {});
        det.get(f.wireId)[f.kind] = f.detectedBy;
      });
    }
    // Per-fault detection cell. When undetected, surfaces an ATPG
    // verdict — either a 🎯 [generate] button (default), a dim
    // [redundant] tag (prior exhaustive ATPG proved no vector exists),
    // or an amber [exhausted] tag (random ATPG ran out — could still
    // be testable, just not found).
    const fmtDetect = (arr, faultId) => {
      if (!arr) return '';
      if (arr.length === 0) {
        if (faultId && this._atpgRedundant.has(faultId)) {
          return '<span style="color:#cc4040" title="ATPG proved untestable — no input vector exists that propagates this fault to a primary output. Common when the wire feeds redundant logic.">UND</span> <span style="color:#666;font-size:0.85em;border:1px dotted #44444466;border-radius:8px;padding:0 6px">redundant</span>';
        }
        if (faultId && this._atpgExhausted.has(faultId)) {
          return `<span style="color:#cc4040">UND</span> <span data-action="atpg-target" data-fault-id="${faultId}" title="Random ATPG ran out — could still be testable. Click to retry." style="color:#cca040;font-size:0.85em;border:1px dotted #cca04066;border-radius:8px;padding:0 6px;cursor:pointer;user-select:none">exhausted ↻</span>`;
        }
        if (faultId) {
          return `<span style="color:#cc4040">UND</span> <span data-action="atpg-target" data-fault-id="${faultId}" title="Run ATPG: generate one vector that detects this fault. Exhaustive sweep when ≤16 PIs (proves redundancy on miss); random sampling above." style="color:#40cc60;font-size:0.85em;border:1px solid #40cc6066;border-radius:8px;padding:0 6px;cursor:pointer;user-select:none">🎯</span>`;
        }
        return '<span style="color:#cc4040">UND</span>';
      }
      if (arr.length <= 3)  return '<span style="color:#40cc60">v' + arr.join(',v') + '</span>';
      return `<span style="color:#40cc60">v${arr.slice(0,2).join(',v')} +${arr.length-2}</span>`;
    };

    const rows = wires.map(w => {
      const id   = (w.id || `${w.sourceId}→${w.targetId}`).slice(0, 22);
      const hasStuck  = (w.stuckAt === 0 || w.stuckAt === 1);
      const hasOpen   = !!w.open;
      const hasBridge = !!w.bridgedWith;
      const isInject  = hasStuck || hasOpen || hasBridge;
      const d         = det.get(w.id);

      const sa0 = w.stuckAt === 0 ? pill('#ff9933', '#1a0d00', 'S0') : cellInactive;
      const sa1 = w.stuckAt === 1 ? pill('#ff9933', '#1a0d00', 'S1') : cellInactive;
      const op  = hasOpen           ? pill('#ff4040', '#1a0000', 'OPN') : cellInactive;
      const br  = hasBridge
        ? pill('#cc66ff', '#1a001a', 'B→' + (w.bridgedWith || '').slice(0, 6))
        : cellInactive;

      // Row tint follows the dominant fault (open > stuck > bridge).
      let rowStyle = '';
      let idColor  = '#f0e2cf';
      if (hasOpen)        { rowStyle = 'background:rgba(255,64,64,0.10)';  idColor = '#ffb0b0'; }
      else if (hasStuck)  { rowStyle = 'background:rgba(255,153,51,0.08)'; idColor = '#ffb878'; }
      else if (hasBridge) { rowStyle = 'background:rgba(204,102,255,0.08)';idColor = '#e0c0ff'; }

      const status = isInject
        ? `<span style="color:${idColor};font-weight:bold">${
            hasOpen ? 'open' : hasStuck ? 's-a-' + w.stuckAt : 'bridge ' + w.bridgeMode
          } ◀</span>`
        : '<span style="color:#555">—</span>';

      // "detected by" column. Shows the per-fault detection summary
      // when fault sim has been run. Compact: "sa0 v2 · sa1 UND · op v0".
      let detectedHtml = '<span style="color:#444">—</span>';
      if (d) {
        const parts = [];
        if (d.sa0)  parts.push(`<span style="color:#876">sa0</span> ${fmtDetect(d.sa0,  `${w.id}/sa0`)}`);
        if (d.sa1)  parts.push(`<span style="color:#876">sa1</span> ${fmtDetect(d.sa1,  `${w.id}/sa1`)}`);
        if (d.open) parts.push(`<span style="color:#876">op</span> ${fmtDetect(d.open, `${w.id}/open`)}`);
        detectedHtml = parts.join(' · ');
      }

      return `<tr style="${rowStyle}">
        <td style="padding:2px 8px;color:${idColor};${isInject ? 'font-weight:bold' : ''}">${id}</td>
        <td style="padding:2px 8px">${(w.sourceId || '').slice(0, 12)}</td>
        <td style="padding:2px 8px">${(w.targetId || '').slice(0, 12)}[${w.targetInputIndex ?? 0}]</td>
        <td style="padding:2px 8px;text-align:center">${sa0}</td>
        <td style="padding:2px 8px;text-align:center">${sa1}</td>
        <td style="padding:2px 8px;text-align:center">${op}</td>
        <td style="padding:2px 8px;text-align:center">${br}</td>
        <td style="padding:2px 8px">${status}</td>
        <td style="padding:2px 8px;font-size:0.88em">${detectedHtml}</td>
      </tr>`;
    }).join('');
    return `
      <div class="dft-faultlist-header dft-section-header">${flHeader}</div>${flInfoPanel}
      <div style="padding:0 1.2em;overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-family:'JetBrains Mono',monospace;font-size:0.92em">
          <thead>
            <tr style="color:#876;border-bottom:1px solid #401a00">
              <th style="padding:3px 8px;text-align:left">wire-id</th>
              <th style="padding:3px 8px;text-align:left">source</th>
              <th style="padding:3px 8px;text-align:left">target[in]</th>
              <th style="padding:3px 8px">s-a-0</th>
              <th style="padding:3px 8px">s-a-1</th>
              <th style="padding:3px 8px">open</th>
              <th style="padding:3px 8px">bridge</th>
              <th style="padding:3px 8px;text-align:left">injected</th>
              <th style="padding:3px 8px;text-align:left">detected by</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  // Wraps each "*-header" element in a .dft-section container with
  // a clickable toggle. Mirrors PipelinePanel._applyCollapsibleSections.
  // Idempotent — safe to call after every _render().
  _applyCollapsibleSections() {
    if (!this._body) return;
    // Match the canonical section header class only — `[class$="-header"]`
    // would also catch nested per-block headers (e.g. .dft-chain-header
    // from the scan-chain flow diagrams) and silently turn each chain
    // into a collapsible region. Sticking to .dft-section-header keeps
    // the toggle scoped to the four top-level sections.
    const headers = this._body.querySelectorAll('.dft-section-header');
    headers.forEach(h => {
      // Skip if already wrapped.
      if (h.parentElement?.classList.contains('dft-section')) return;
      const section = document.createElement('div');
      section.className = 'dft-section';
      section.dataset.section = h.className.replace(/-header$/, '');
      h.parentNode.insertBefore(section, h);
      section.appendChild(h);
      // Move every following sibling that isn't another header into
      // this section, until the next header (or end of body).
      while (section.nextSibling && !(section.nextSibling.className || '').endsWith('-header')) {
        section.appendChild(section.nextSibling);
      }
      // Re-apply collapsed state from prior render (the wrapper DOM
      // is rebuilt from scratch on every _render, so the class needs
      // to be re-added from this._collapsedSections).
      if (this._collapsedSections.has(section.dataset.section)) {
        section.classList.add('dft-section-collapsed');
      }
      if (!h.querySelector('.dft-section-toggle')) {
        const toggle = document.createElement('span');
        toggle.className = 'dft-section-toggle';
        toggle.textContent = section.classList.contains('dft-section-collapsed') ? '▸' : '▾';
        h.appendChild(toggle);
      }
      // Click handlers for collapse + per-block toggle live on
      // _body's delegated mousedown listener (bound once in init) so
      // they survive the per-tick re-render.
    });
  }
}
