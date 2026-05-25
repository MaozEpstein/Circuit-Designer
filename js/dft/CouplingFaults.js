// DFT RAM Coupling-fault helpers — shared logic for the live engine
// and the standalone MemoryTestRunner.
//
// A coupling fault describes a defect where one cell ("aggressor")
// affects another ("victim"). Three classical types are modelled here:
//
//   • CFin (inversion coupling)
//     A write transition on the aggressor flips the victim.
//     Schema: { aggressor, victim, type:'CFin', trigger:'01'|'10'|'any' }
//
//   • CFid (idempotent coupling)
//     A write transition on the aggressor forces the victim to a fixed
//     value, regardless of the victim's prior value.
//     Schema: { aggressor, victim, type:'CFid', trigger, forceTo:0|1 }
//
//   • CFst (state coupling)
//     Whenever the aggressor *holds* a specific value, every read of
//     the victim returns the forced value (no transition needed).
//
//     Two schemas — choose by which fields are present:
//
//     (a) Whole-word (textbook): fires only when the entire aggressor
//         word equals all-0 or all-1.
//           { aggressor, victim, type:'CFst',
//             aggressorValue:0|1, forceTo:0|1 }
//
//     (b) Per-bit "bridge" (physical bit-line short): for each bit set
//         in `bits`, when that bit of the aggressor matches the
//         corresponding bit of `aggressorPattern`, force the same bit
//         of the victim to the corresponding bit of `forcePattern`.
//         Bits outside `bits` are ignored. This is what catches
//         Checkerboard-style stimulus where the aggressor never holds
//         all-0 or all-1.
//           { aggressor, victim, type:'CFst',
//             bits:number, aggressorPattern:number, forcePattern:number }
//
//         Common presets:
//           AND-bridge:  bits=mask, aggressorPattern=0,    forcePattern=0
//             (any 0 bit in aggressor pulls the matching victim bit to 0)
//           OR-bridge:   bits=mask, aggressorPattern=mask, forcePattern=mask
//             (any 1 bit in aggressor pulls the matching victim bit to 1)
//
// CFin/CFid trigger on writes (aggressor side); CFst affects reads
// (victim side). The helpers are no-ops when couplingFaults is empty,
// so the cost on clean RAMs is zero.

function _mask(bits) {
  if (bits >= 32) return Math.pow(2, bits) - 1;
  return (1 << bits) - 1;
}

// Classify a write transition at the BIT level. Returns a bitmask struct
// describing which bits of the aggressor word flipped in each direction.
// A whole-word 0→all-ones write sets every bit in `up`; a partial write
// (e.g. 0x00→0xAA from a checkerboard pattern) sets only the bits that
// actually transitioned. Returns null only when nothing changed.
//
// Per-bit granularity is what makes Checkerboard / Walking-1 catch
// coupling between adjacent cells the way the textbook physical model
// expects — a coupling defect between a bit-line of the aggressor and
// the corresponding bit-line of the victim fires whenever THAT bit
// transitions, not only when the entire word flips polarity.
function _transitionBits(oldVal, newVal, mask) {
  const o = (oldVal | 0) & mask;
  const n = (newVal | 0) & mask;
  const changed = (o ^ n) & mask;
  if (changed === 0) return null;
  return {
    up:   (n & changed) & mask,   // bits that went 0→1
    down: (o & changed) & mask,   // bits that went 1→0
    any:  changed,
  };
}

// Pick the subset of bits that qualify under the trigger. Returns 0
// when no bits qualify (caller treats that as "fault didn't fire").
function _triggerBits(transitionBits, trigger) {
  if (!transitionBits) return 0;
  if (trigger === '01') return transitionBits.up;
  if (trigger === '10') return transitionBits.down;
  return transitionBits.any;   // 'any' or undefined falls through here
}

// Summarise a triggered bit set back to a textbook label ('01' / '10' /
// 'mixed') for the causedBy field. Pure cosmetic — the engine logic
// never reads this string.
function _summariseTrigger(transitionBits, firedBits) {
  if (!transitionBits || !firedBits) return null;
  const upFired   = firedBits & transitionBits.up;
  const downFired = firedBits & transitionBits.down;
  if (upFired && !downFired) return '01';
  if (downFired && !upFired) return '10';
  return 'mixed';
}

/**
 * Apply CFin / CFid effects after a write lands. Mutates `mem` in place
 * (the victim cell's value is rewritten). CFst is NOT applied here
 * because state coupling is read-side, not write-side.
 *
 * @param {Array}  couplingFaults  ram.couplingFaults (may be undefined)
 * @param {number} addr            address that was just written
 * @param {number} oldVal          pre-write value of mem[addr]
 * @param {number} newVal          post-write value of mem[addr]
 * @param {object} mem             memory map { [addr]: value } — mutated
 * @param {number} dataBits        word width
 * @returns {null | { type, aggressor, victim }}
 *   Returns the first applied coupling effect (so the caller can stash
 *   it as `causedBy` on a fail record), or null if none fired.
 */
export function applyCouplingOnWrite(couplingFaults, addr, oldVal, newVal, mem, dataBits) {
  if (!couplingFaults || !couplingFaults.length) return null;
  const mask = _mask(dataBits || 4);
  const tBits = _transitionBits(oldVal, newVal, mask);
  if (!tBits) return null;
  let firstApplied = null;
  for (const cf of couplingFaults) {
    if (cf.type !== 'CFin' && cf.type !== 'CFid') continue;
    if (cf.aggressor !== addr) continue;
    if (cf.aggressor === cf.victim) continue;   // self-coupling = malformed
    const firedBits = _triggerBits(tBits, cf.trigger || 'any') & mask;
    if (!firedBits) continue;
    const victimVal = ((mem[cf.victim] ?? 0) | 0) & mask;
    let nextVictim;
    if (cf.type === 'CFin') {
      // Invert only the victim bits whose aggressor bit triggered.
      nextVictim = (victimVal ^ firedBits) & mask;
    } else {     // CFid — force triggered bits to the configured value;
                 // leave the rest of the victim word untouched.
      const forceVal = (cf.forceTo ? mask : 0);
      nextVictim = ((victimVal & ~firedBits) | (forceVal & firedBits)) & mask;
    }
    mem[cf.victim] = nextVictim;
    if (!firstApplied) {
      firstApplied = {
        type: cf.type, aggressor: cf.aggressor, victim: cf.victim,
        transition: _summariseTrigger(tBits, firedBits),
      };
    }
  }
  return firstApplied;
}

/**
 * Apply CFst (state coupling) at read time. If any CFst entry names
 * `addr` as its victim AND the aggressor cell currently holds the
 * trigger state, the returned value is the forced value rather than the
 * caller's `val`. The first matching CFst wins (deterministic).
 *
 * Does NOT mutate `mem` — only filters the returned value.
 *
 * @param {Array}  couplingFaults
 * @param {number} addr      address being read
 * @param {number} val       value the caller would otherwise return
 * @param {object} mem       memory snapshot for looking up aggressor state
 * @param {number} dataBits
 * @returns {number} possibly-overridden value
 */
// Compute the per-bit CFst effect for one entry. Returns the override
// mask (`affected`: bits that were forced) and the forced bits' values
// (`forced`). If no bits match, returns null. Whole-word legacy CFst
// is folded into this same per-bit machinery: legacy entries are
// translated to `bits = mask, aggressorPattern = all-0/all-1,
// forcePattern = all-0/all-1` with the additional constraint that
// *every* checked bit must match (whole-word semantics).
function _cfstEffect(cf, aggCurrent, mask) {
  const isPerBit = (cf.bits !== undefined);
  if (isPerBit) {
    const bits = (cf.bits | 0) & mask;
    if (!bits) return null;
    const aggPat = (cf.aggressorPattern | 0) & mask;
    // matched: bits within `bits` where aggressor matches the pattern.
    const matched = (~(aggCurrent ^ aggPat)) & bits;
    if (!matched) return null;
    return { affected: matched, forced: (cf.forcePattern | 0) & matched };
  }
  // Legacy whole-word path — preserve textbook behaviour exactly.
  const triggerState = (cf.aggressorValue ? mask : 0) & mask;
  if (aggCurrent !== triggerState) return null;
  const forced = (cf.forceTo ? mask : 0) & mask;
  return { affected: mask, forced };
}

export function applyCFstOnRead(couplingFaults, addr, val, mem, dataBits) {
  if (!couplingFaults || !couplingFaults.length) return val;
  const mask = _mask(dataBits || 4);
  let out = (val | 0) & mask;
  let touched = 0;
  for (const cf of couplingFaults) {
    if (cf.type !== 'CFst') continue;
    if (cf.victim !== addr) continue;
    if (cf.aggressor === cf.victim) continue;
    const aggCurrent = ((mem[cf.aggressor] ?? 0) | 0) & mask;
    const eff = _cfstEffect(cf, aggCurrent, mask);
    if (!eff) continue;
    // Multiple CFst entries on the same victim compose by bit — each
    // entry overrides only the bits it claims, leaving the rest alone.
    // First-touch-wins on overlapping bits (deterministic, matches
    // the legacy "first matching CFst" semantics).
    const fresh = eff.affected & ~touched;
    if (!fresh) continue;
    out = (out & ~fresh) | (eff.forced & fresh);
    touched |= fresh;
  }
  return out;
}

/**
 * Same as applyCFstOnRead but also returns the coupling entry that
 * fired, so the caller can attribute a fail to it. Used by the
 * MemoryTestRunner to populate `firstFail.causedBy`.
 *
 * @returns {{ val: number, causedBy: null | { type, aggressor, victim } }}
 */
export function applyCFstOnReadWithCause(couplingFaults, addr, val, mem, dataBits) {
  if (!couplingFaults || !couplingFaults.length) return { val, causedBy: null };
  const mask = _mask(dataBits || 4);
  let out = (val | 0) & mask;
  let touched = 0;
  let causedBy = null;
  for (const cf of couplingFaults) {
    if (cf.type !== 'CFst') continue;
    if (cf.victim !== addr) continue;
    if (cf.aggressor === cf.victim) continue;
    const aggCurrent = ((mem[cf.aggressor] ?? 0) | 0) & mask;
    const eff = _cfstEffect(cf, aggCurrent, mask);
    if (!eff) continue;
    const fresh = eff.affected & ~touched;
    if (!fresh) continue;
    out = (out & ~fresh) | (eff.forced & fresh);
    touched |= fresh;
    // First firing CFst gets credit for the fail attribution.
    if (!causedBy) causedBy = { type: 'CFst', aggressor: cf.aggressor, victim: cf.victim };
  }
  return { val: out, causedBy };
}
