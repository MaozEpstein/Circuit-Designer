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
//     Schema: { aggressor, victim, type:'CFst', aggressorValue:0|1,
//               forceTo:0|1 }
//
// CFin/CFid trigger on writes (aggressor side); CFst affects reads
// (victim side). The helpers are no-ops when couplingFaults is empty,
// so the cost on clean RAMs is zero.

function _mask(bits) {
  if (bits >= 32) return Math.pow(2, bits) - 1;
  return (1 << bits) - 1;
}

// Classify a write transition by comparing pre- and post-write values
// at the whole-word level. Returns '01' for 0→all-ones, '10' for the
// reverse, or null when no whole-word transition happened (e.g. partial
// write or no change). This is the granularity the textbook CF models
// reason about.
function _transition(oldVal, newVal, mask) {
  const o = (oldVal | 0) & mask;
  const n = (newVal | 0) & mask;
  if (o === 0 && n === mask) return '01';
  if (o === mask && n === 0) return '10';
  return null;
}

function _matchesTrigger(transition, trigger) {
  if (!transition) return false;
  if (trigger === 'any') return true;
  return transition === trigger;
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
  const transition = _transition(oldVal, newVal, mask);
  if (!transition) return null;
  let firstApplied = null;
  for (const cf of couplingFaults) {
    if (cf.type !== 'CFin' && cf.type !== 'CFid') continue;
    if (cf.aggressor !== addr) continue;
    if (cf.aggressor === cf.victim) continue;   // self-coupling = malformed
    if (!_matchesTrigger(transition, cf.trigger || 'any')) continue;
    const victimVal = ((mem[cf.victim] ?? 0) | 0) & mask;
    let nextVictim;
    if (cf.type === 'CFin') {
      nextVictim = (~victimVal) & mask;
    } else {     // CFid
      nextVictim = ((cf.forceTo ? mask : 0) & mask);
    }
    mem[cf.victim] = nextVictim;
    if (!firstApplied) {
      firstApplied = { type: cf.type, aggressor: cf.aggressor, victim: cf.victim, transition };
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
export function applyCFstOnRead(couplingFaults, addr, val, mem, dataBits) {
  if (!couplingFaults || !couplingFaults.length) return val;
  const mask = _mask(dataBits || 4);
  for (const cf of couplingFaults) {
    if (cf.type !== 'CFst') continue;
    if (cf.victim !== addr) continue;
    if (cf.aggressor === cf.victim) continue;
    const aggCurrent = ((mem[cf.aggressor] ?? 0) | 0) & mask;
    const triggerState = (cf.aggressorValue ? mask : 0) & mask;
    if (aggCurrent === triggerState) {
      return ((cf.forceTo ? mask : 0) & mask);
    }
  }
  return val;
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
  for (const cf of couplingFaults) {
    if (cf.type !== 'CFst') continue;
    if (cf.victim !== addr) continue;
    if (cf.aggressor === cf.victim) continue;
    const aggCurrent = ((mem[cf.aggressor] ?? 0) | 0) & mask;
    const triggerState = (cf.aggressorValue ? mask : 0) & mask;
    if (aggCurrent === triggerState) {
      return {
        val: ((cf.forceTo ? mask : 0) & mask),
        causedBy: { type: 'CFst', aggressor: cf.aggressor, victim: cf.victim },
      };
    }
  }
  return { val, causedBy: null };
}
