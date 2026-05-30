/**
 * SignoffEngine — final backend signoff aggregator.
 *
 * Unlike the other backend engines, this computes no geometry. It reads the
 * cached results of every prior stage (STA, Synthesis, Floorplan, Placement)
 * and produces a signoff checklist + tapeout verdict, plus an estimated power
 * report. Covers the Signoff stage: Power; Power Integrity + EM;
 * DRC; LVS; FM; STA + SI → Tapeout (GDS/OASIS).
 *
 * Honesty model — every check carries a `kind`:
 *   'real'  — derived directly from computed data (timing, DRC, area, skew)
 *   'proxy' — a labeled structural approximation (power, LVS, FM, congestion)
 *   'na'    — needs a routed layout we don't have (EM, SI, power integrity)
 * Only `blocking` REAL checks can flip the verdict to BLOCKED; proxies and N/A
 * never fabricate a tapeout pass.
 */

// ── Power model constants (heuristic, educational — no library power data) ──
const ACTIVITY        = 0.15;     // average switching activity factor α
const VDD_V           = 0.9;      // nominal supply (28nm-class)
const CAP_PF_PER_UM2  = 0.0012;   // effective switched capacitance per µm²
const LEAK_UW_PER_UM2 = 0.04;     // leakage power per µm² of cell area

/**
 * @param {object} caches  { sta, synth, sdc, def, floorplan, placement, placementSta, placementStaIdeal }
 * @param {object} [opts]  { clockPeriodPs, tSetupPs, maxFanout, utilBand, skewPct }
 * @returns {SignoffReport}
 */
export function runSignoff(caches, opts = {}) {
  const {
    clockPeriodPs = 2000,
    maxFanout     = 6,
    utilBand      = { lo: 0.50, hi: 0.85 },
    skewWarnPct   = 0.10,
    skewFailPct   = 0.25,
  } = opts;

  const { synth, floorplan, placement, def } = caches;
  const t = caches.placementSta || caches.sta;   // prefer post-CTS timing

  const checks = [];
  const add = (c) => checks.push(c);
  // Fix suggestion: always a text recommendation; action+value only when the
  // tool genuinely owns the knob and a value will clear the check.
  const fix = (text, action = null, value = null, from = null) => ({ text, action, value, from });

  // Empty-design guard
  if (!synth || synth.totalCells === 0) {
    add({ id: 'empty', label: 'Design present', category: 'DESIGN', status: 'FAIL',
          kind: 'real', value: '0 cells', limit: '> 0', blocking: true,
          note: 'No physical cells — add gates / flip-flops / memories and re-run.' });
    return _finish(checks, _power(0, clockPeriodPs), clockPeriodPs);
  }

  // ── TIMING (real) ──
  if (t) {
    add({ id: 'timing-setup', label: 'Timing — Setup (WNS ≥ 0)', category: 'TIMING',
          status: t.wns >= 0 ? 'PASS' : 'FAIL', kind: 'real', blocking: true,
          value: `${t.wns} ps`, limit: '≥ 0 ps',
          note: t.wns >= 0 ? 'All captured paths meet setup.' : 'Worst path misses the setup deadline.',
          fix: t.wns >= 0 ? null : fix(
            'Raise the clock period so the data path fits in one cycle. (Alternatively shorten the path: pipeline it, size up gates, or reduce logic depth.)',
            'raise-clock', clockPeriodPs + Math.ceil(-t.wns) + 50, clockPeriodPs) });
    add({ id: 'timing-hold', label: 'Timing — Hold', category: 'TIMING',
          status: t.numHoldViolations === 0 ? 'PASS' : 'FAIL', kind: 'real', blocking: true,
          value: `${t.numHoldViolations} viol`, limit: '0',
          note: t.numHoldViolations === 0 ? 'No hold violations.' : 'Data races the clock at the capture FF.',
          fix: t.numHoldViolations === 0 ? null : fix(
            'Add delay buffers on the short (fast) paths so data no longer races the clock. Hold is fixed by adding delay, not by changing the clock period.') });
    const meetsClock = isFinite(t.fMaxMHz) && t.fMaxMHz >= 1e6 / clockPeriodPs;
    add({ id: 'timing-fmax', label: 'Max Frequency', category: 'TIMING',
          status: meetsClock ? 'PASS' : 'WARN', kind: 'real', blocking: false,
          value: `${t.fMaxMHz} MHz`, limit: `≥ ${Math.round(1e6 / clockPeriodPs)} MHz`,
          note: meetsClock ? 'Design runs at or above the target clock.' : 'Critical path limits the clock below target.' });
    add({ id: 'timing-si', label: 'STA + SI (signal integrity)', category: 'TIMING',
          status: 'NA', kind: 'na', blocking: false, value: '—', limit: '—',
          note: 'Crosstalk-aware STA needs routed parasitics; value shown is post-CTS STA without SI derate.' });
  }

  // ── PHYSICAL / AREA (real) ──
  if (floorplan) {
    const u = floorplan.actualUtilization;
    let st = 'PASS', note = 'Utilization in the healthy band.';
    if (u > utilBand.hi) { st = 'FAIL'; note = 'Over-utilized — routing congestion risk.'; }
    else if (u < utilBand.lo) { st = 'WARN'; note = 'Under-utilized — wasted silicon area.'; }
    const uPct = Math.round(u * 100);
    const utilFix = st === 'FAIL'
      ? fix('Lower target utilization — a bigger core leaves more routing room.',
            'set-util', Math.max(0.3, Math.round((utilBand.hi - 0.10) * 100) / 100), uPct)
      : (st === 'WARN'
        ? fix('Raise target utilization — the die is mostly empty; a denser core saves silicon area.',
              'set-util', 0.70, uPct)
        : null);
    add({ id: 'area-util', label: 'Area / Utilization band', category: 'PHYSICAL',
          status: st, kind: 'real', blocking: st === 'FAIL',
          value: `${Math.round(u * 100)}%`, limit: `${Math.round(utilBand.lo * 100)}–${Math.round(utilBand.hi * 100)}%`, note,
          fix: utilFix });
  }

  // ── DRC (real) ──
  add({ id: 'drc-fanout', label: 'DRC — Max Fanout', category: 'DRC',
        status: synth.maxFanout <= maxFanout ? 'PASS' : 'FAIL', kind: 'real', blocking: true,
        value: `${synth.maxFanout}`, limit: `≤ ${maxFanout}`,
        note: synth.maxFanout <= maxFanout ? 'Within set_max_fanout.' : `Net exceeds set_max_fanout ${maxFanout} — needs buffering.`,
        fix: synth.maxFanout <= maxFanout ? null : fix(
          `Split the high-fanout net into a buffer tree so each driver feeds at most ${maxFanout} loads.`) });

  const nUnmapped = synth.unmappedTypes?.length || 0;
  add({ id: 'drc-unmapped', label: 'DRC — Unmapped Cells', category: 'DRC',
        status: nUnmapped === 0 ? 'PASS' : 'FAIL', kind: 'real', blocking: true,
        value: `${nUnmapped}`, limit: '0',
        note: nUnmapped === 0 ? 'Every node mapped to a library cell.' : `No library cell for: ${synth.unmappedTypes.join(', ')}`,
        fix: nUnmapped === 0 ? null : fix(
          `Add a standard-cell mapping for ${synth.unmappedTypes.join(', ')} to the cell library so synthesis can place them.`,
          'map-generic', synth.unmappedTypes.join(',')) });

  if (placement) {
    add({ id: 'drc-legalize', label: 'Placement Legalization', category: 'DRC',
          status: placement.overflow ? 'FAIL' : 'PASS', kind: 'real', blocking: true,
          value: `${placement.placedCount} placed`, limit: 'fits rows',
          note: placement.overflow ? 'Cells overflow the core rows — die too small / utilization too high.' : 'All standard cells fit the rows.',
          fix: placement.overflow ? fix(
            'Increase die area — lower target utilization so the standard cells fit the rows.',
            'set-util', Math.max(0.3, Math.round(((floorplan?.utilization ?? 0.7) - 0.15) * 100) / 100),
            Math.round((floorplan?.utilization ?? 0.7) * 100)) : null });

    const dens = placement.density;
    const hot = dens && dens.maxDensity ? _congested(dens) : false;
    add({ id: 'drc-congestion', label: 'Congestion Hotspot', category: 'DRC',
          status: hot ? 'WARN' : 'PASS', kind: 'proxy', blocking: false,
          value: dens ? `max ${dens.maxDensity}/bin` : '—', limit: 'even spread',
          note: hot ? 'A region is much denser than average — route congestion risk (proxy).' : 'Cells spread evenly across the core (proxy).' });

    const cts = placement.cts;
    if (cts && cts.numSinks > 0) {
      const frac = cts.skewPs / clockPeriodPs;
      let st = 'PASS', note = 'Clock tree well balanced.';
      if (frac >= skewFailPct) { st = 'FAIL'; note = 'Skew eats too much of the period.'; }
      else if (frac >= skewWarnPct) { st = 'WARN'; note = 'Skew noticeable — consider rebalancing.'; }
      const skewFix = (st === 'FAIL' || st === 'WARN') ? fix(
        'Raise the clock period so the fixed skew becomes a smaller fraction of it (or rebalance the clock tree).',
        'raise-clock', Math.ceil(cts.skewPs / skewWarnPct), clockPeriodPs) : null;
      add({ id: 'cts-skew', label: 'Clock Skew (% of period)', category: 'CLOCK',
            status: st, kind: 'real', blocking: st === 'FAIL',
            value: `${cts.skewPs} ps (${Math.round(frac * 100)}%)`,
            limit: `< ${Math.round(skewWarnPct * 100)}%`, note, fix: skewFix });
    }
  }

  // ── POWER (proxy / estimated) ──
  const power = _power(synth.totalAreaUm2, clockPeriodPs);
  add({ id: 'power-est', label: 'Power (estimated)', category: 'POWER',
        status: 'PASS', kind: 'proxy', blocking: false,
        value: `${power.totalMw} mW`, limit: 'est',
        note: 'Heuristic estimate (α·C·V²·f + leakage) — no library power data.' });

  // ── VERIFICATION (proxy / N/A) ──
  add({ id: 'lvs', label: 'LVS (layout vs schematic)', category: 'VERIF',
        status: nUnmapped === 0 ? 'PASS' : 'NA', kind: 'proxy', blocking: false,
        value: nUnmapped === 0 ? 'structural match' : '—', limit: '—',
        note: 'Proxy: every node maps to a known cell. True LVS compares an extracted layout netlist.' });
  add({ id: 'fm', label: 'Formal (FM)', category: 'VERIF',
        status: (nUnmapped === 0 && def) ? 'PASS' : 'NA', kind: 'proxy', blocking: false,
        value: def ? 'netlist complete' : '—', limit: '—',
        note: 'Proxy: GL netlist is structurally complete. True FM proves RTL ≡ netlist with a formal tool.' });
  const emNote = placement?.cts
    ? `Highest risk on the clock net (maxFanout ${synth.maxFanout}, insertion ${placement.cts.maxInsertionPs} ps) — needs routed current densities.`
    : 'Needs routed current densities to check.';
  add({ id: 'em', label: 'Electromigration (EM)', category: 'VERIF',
        status: 'NA', kind: 'na', blocking: false, value: '—', limit: '—', note: emNote });
  add({ id: 'si', label: 'Signal Integrity (crosstalk)', category: 'VERIF',
        status: 'NA', kind: 'na', blocking: false, value: '—', limit: '—',
        note: 'Coupling/crosstalk needs the routed metal — post-route.' });
  add({ id: 'pi', label: 'Power Integrity (IR-drop)', category: 'VERIF',
        status: 'NA', kind: 'na', blocking: false, value: '—', limit: '—',
        note: 'IR-drop / EM on the PG mesh needs the routed power grid + currents.' });

  return _finish(checks, power, clockPeriodPs);
}

// ── helpers ──────────────────────────────────────────────────

function _power(totalAreaUm2, clockPeriodPs) {
  const fHz = 1 / (clockPeriodPs * 1e-12);
  const fGHz = fHz / 1e9;
  const switchCapPf = totalAreaUm2 * CAP_PF_PER_UM2;
  // P = α·C·V²·f  (C in pF=1e-12 F, result in W → ×1e3 for mW)
  const dynamicMw = ACTIVITY * (switchCapPf * 1e-12) * VDD_V * VDD_V * fHz * 1e3;
  const leakageMw = totalAreaUm2 * LEAK_UW_PER_UM2 / 1000;
  const r = (v) => Math.round(v * 1000) / 1000;
  return {
    dynamicMw: r(dynamicMw), leakageMw: r(leakageMw), totalMw: r(dynamicMw + leakageMw),
    activity: ACTIVITY, vddV: VDD_V, fGHz: Math.round(fGHz * 1000) / 1000,
    switchCapPf: Math.round(switchCapPf * 1000) / 1000,
    capPfPerUm2: CAP_PF_PER_UM2, leakUwPerUm2: LEAK_UW_PER_UM2,
    estimated: true,
  };
}

/** A region is congested if any bin is well above the mean nonzero density. */
function _congested(density) {
  let sum = 0, n = 0;
  for (const row of density.grid) for (const v of row) if (v) { sum += v; n++; }
  if (!n) return false;
  const mean = sum / n;
  return density.maxDensity > Math.max(2, mean * 2.5);
}

function _finish(checks, power, clockPeriodPs) {
  const blockers = checks.filter(c => c.blocking && c.status === 'FAIL').length;
  const warnings = checks.filter(c => c.status === 'WARN').length;
  const naCount  = checks.filter(c => c.status === 'NA').length;
  const realCount = checks.filter(c => c.kind === 'real').length;
  const oasisStub = [
    '# OASIS (ASCII) — placeholder. Real GDSII/OASIS layout is generated',
    '# post-route at tapeout; this pre-route flow has no routed geometry.',
    'CELL top;',
    '  # PLACEMENT + CTS only — no metal routing yet',
    'END CELL;',
  ].join('\n');
  return {
    checks, power, blockers, warnings, naCount, realCount,
    verdict: blockers === 0 ? 'READY' : 'BLOCKED',
    clockPeriodPs, oasisStub,
  };
}
