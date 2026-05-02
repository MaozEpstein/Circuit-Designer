// Layer 2 — verifies the engine populates `ffStates.get('__cache_stats__')`
// after every cache access, with the right shape for the Pipeline panel
// to consume. The panel rendering itself is DOM-only and not exercised
// here; we test the producer side that the panel reads from.
//
// Shape contract:
//   ffStates.get('__cache_stats__')  → Map<cacheNodeId, {
//     label: string,
//     hits:  number,
//     misses: number,
//     recent: Array<{ addr, hit, miss }>   // last 12 accesses
//   }>
//
// Run:  node examples/tests/test-cache-stats.mjs

import { createComponent, createWire } from '../../js/components/Component.js';
import { evaluate } from '../../js/engine/SimulationEngine.js';

let failed = 0;
function check(label, cond, detail = '') {
  const mark = cond ? 'PASS' : 'FAIL';
  if (!cond) failed++;
  console.log(`  [${mark}] ${label}${detail ? ' — ' + detail : ''}`);
}

// Same scaffold helper as test-cache-direct-mapped.mjs.
function buildScene() {
  let id = 0;
  const nid = () => 'n' + (++id);
  const wid = () => 'w' + (++id);
  const mk = (type, ov = {}) => Object.assign(createComponent(type, 0, 0), { id: nid() }, ov);
  const W  = (s, d, dp = 0, sp = 0, op = {}) => Object.assign(createWire(s, d, dp, sp, op), { id: wid() });

  const addr = mk('INPUT', { fixedValue: 0 });
  const data = mk('INPUT', { fixedValue: 0 });
  const we   = mk('INPUT', { fixedValue: 0 });
  const re   = mk('INPUT', { fixedValue: 1 });
  const clk  = mk('CLOCK', { value: 0 });
  const cache = mk('CACHE', { lines: 4, dataBits: 8, addrBits: 8, mapping: 'direct', label: 'L1' });
  const ram  = mk('RAM',   { addrBits: 8, dataBits: 8, asyncRead: true,
    memory: { 0: 100, 4: 200, 5: 50, 9: 90 } });
  const wires = [
    W(addr.id, cache.id, 0),  W(data.id, cache.id, 1), W(we.id,  cache.id, 2),
    W(re.id,   cache.id, 3),  W(clk.id,  cache.id, 4, 0, { isClockWire: true }),
    W(ram.id,  cache.id, 5),
    W(cache.id, ram.id, 0, 3), W(cache.id, ram.id, 1, 4),
    W(cache.id, ram.id, 2, 6), W(cache.id, ram.id, 3, 5),
    W(clk.id,   ram.id, 4, 0, { isClockWire: true }),
  ];
  return { nodes: [addr, data, we, re, clk, cache, ram], wires, addr, clk, cache, ram };
}
function tick(s, ffs) {
  s.clk.value = 1; const r = evaluate(s.nodes, s.wires, ffs, 0);
  s.clk.value = 0; evaluate(s.nodes, s.wires, ffs, 0);
  return r;
}

// ── 1. Snapshot map exists after first access, keyed by cache id ──
console.log('[1] __cache_stats__ Map shape');
{
  const s = buildScene();
  const ffs = new Map();
  evaluate(s.nodes, s.wires, ffs, 0);
  s.addr.fixedValue = 5; tick(s, ffs);

  const map = ffs.get('__cache_stats__');
  check('__cache_stats__ entry exists',     map instanceof Map);
  check('keyed by cache node id',            map.has(s.cache.id));

  const snap = map.get(s.cache.id);
  check('snap has label',                    snap && snap.label === 'L1');
  check('snap.hits is number',               typeof snap.hits === 'number');
  check('snap.misses is number',             typeof snap.misses === 'number');
  check('snap.recent is array',              Array.isArray(snap.recent));
}

// ── 2. Counters track exactly the engine's ms.stats ──────────
console.log('\n[2] Counters mirror ms.stats after every access');
{
  const s = buildScene();
  const ffs = new Map();
  evaluate(s.nodes, s.wires, ffs, 0);

  const trace = [5, 7, 5, 9, 5, 11, 5, 13];
  for (const a of trace) { s.addr.fixedValue = a; tick(s, ffs); }

  const ms = ffs.get(s.cache.id);
  const snap = ffs.get('__cache_stats__').get(s.cache.id);
  check('snap.hits === ms.stats.hits',       snap.hits === ms.stats.hits);
  check('snap.misses === ms.stats.misses',   snap.misses === ms.stats.misses);
  // Demo trace truth: 2 hits, 6 misses (proven in test-cache-direct-mapped.mjs).
  check('snap shows 2 hits',                 snap.hits === 2);
  check('snap shows 6 misses',               snap.misses === 6);
}

// ── 3. Recent-access tail captures last access details ───────
console.log('\n[3] snap.recent records (addr, hit/miss) for each access');
{
  const s = buildScene();
  const ffs = new Map();
  evaluate(s.nodes, s.wires, ffs, 0);

  s.addr.fixedValue = 5;  tick(s, ffs);   // miss
  s.addr.fixedValue = 5;  tick(s, ffs);   // hit
  s.addr.fixedValue = 9;  tick(s, ffs);   // miss (conflict, evicts)
  s.addr.fixedValue = 5;  tick(s, ffs);   // miss again

  const snap = ffs.get('__cache_stats__').get(s.cache.id);
  check('recent has 4 entries',              snap.recent.length === 4);
  check('recent[0] = addr 5, miss',          snap.recent[0].addr === 5 && snap.recent[0].miss === 1);
  check('recent[1] = addr 5, hit',           snap.recent[1].addr === 5 && snap.recent[1].hit === 1);
  check('recent[2] = addr 9, miss',          snap.recent[2].addr === 9 && snap.recent[2].miss === 1);
  check('recent[3] = addr 5, miss',          snap.recent[3].addr === 5 && snap.recent[3].miss === 1);
}

// ── 4. Recent tail bounded at 12 entries ─────────────────────
console.log('\n[4] snap.recent caps at 12 most recent accesses');
{
  const s = buildScene();
  const ffs = new Map();
  evaluate(s.nodes, s.wires, ffs, 0);

  for (let i = 0; i < 20; i++) {
    s.addr.fixedValue = i & 7;
    tick(s, ffs);
  }
  const snap = ffs.get('__cache_stats__').get(s.cache.id);
  check('recent length capped at 12',        snap.recent.length === 12);
}

// ── 5. Multiple cache instances → separate map entries ───────
console.log('\n[5] Multi-cache: each instance gets its own snapshot entry');
{
  // Build two independent CACHE+RAM pairs in one scene, drive both,
  // confirm two separate map entries with independent counters.
  let id = 0;
  const nid = () => 'n' + (++id);
  const wid = () => 'w' + (++id);
  const mk = (type, ov = {}) => Object.assign(createComponent(type, 0, 0), { id: nid() }, ov);
  const W  = (s2, d, dp = 0, sp = 0, op = {}) => Object.assign(createWire(s2, d, dp, sp, op), { id: wid() });

  const buildPair = (label) => {
    const addr = mk('INPUT', { fixedValue: 0 });
    const data = mk('INPUT', { fixedValue: 0 });
    const we   = mk('INPUT', { fixedValue: 0 });
    const re   = mk('INPUT', { fixedValue: 1 });
    const cache = mk('CACHE', { lines: 4, dataBits: 8, addrBits: 8, mapping: 'direct', label });
    const ram  = mk('RAM',   { addrBits: 8, dataBits: 8, asyncRead: true, memory: { 5: 50, 9: 90 } });
    return { addr, data, we, re, cache, ram };
  };
  const A = buildPair('CACHE_A');
  const B = buildPair('CACHE_B');
  const clk = mk('CLOCK', { value: 0 });
  const wires = [];
  for (const p of [A, B]) {
    wires.push(
      W(p.addr.id, p.cache.id, 0), W(p.data.id, p.cache.id, 1),
      W(p.we.id,   p.cache.id, 2), W(p.re.id,   p.cache.id, 3),
      W(clk.id,    p.cache.id, 4, 0, { isClockWire: true }),
      W(p.ram.id,  p.cache.id, 5),
      W(p.cache.id, p.ram.id, 0, 3), W(p.cache.id, p.ram.id, 1, 4),
      W(p.cache.id, p.ram.id, 2, 6), W(p.cache.id, p.ram.id, 3, 5),
      W(clk.id,     p.ram.id, 4, 0, { isClockWire: true }),
    );
  }
  const nodes = [clk, A.addr, A.data, A.we, A.re, A.cache, A.ram,
                       B.addr, B.data, B.we, B.re, B.cache, B.ram];
  const ffs = new Map();
  evaluate(nodes, wires, ffs, 0);

  const tick2 = () => {
    clk.value = 1; evaluate(nodes, wires, ffs, 0);
    clk.value = 0; evaluate(nodes, wires, ffs, 0);
  };
  // CACHE_A: 5, 5 → 1 miss + 1 hit.
  // CACHE_B: 5, 9 → 2 misses (different addresses on the same index).
  A.addr.fixedValue = 5; B.addr.fixedValue = 5; tick2();
  A.addr.fixedValue = 5; B.addr.fixedValue = 9; tick2();

  const map = ffs.get('__cache_stats__');
  check('two snapshot entries',              map.size === 2);
  const snapA = map.get(A.cache.id);
  const snapB = map.get(B.cache.id);
  check('CACHE_A: 1 hit, 1 miss',            snapA.hits === 1 && snapA.misses === 1);
  check('CACHE_B: 0 hits, 2 misses',         snapB.hits === 0 && snapB.misses === 2);
  check('labels are preserved',              snapA.label === 'CACHE_A' && snapB.label === 'CACHE_B');
}

// ── Summary ───────────────────────────────────────────────────
console.log('\n' + (failed === 0 ? 'ALL CHECKS PASSED' : `${failed} CHECK(S) FAILED`));
process.exit(failed === 0 ? 0 : 1);
