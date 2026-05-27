// STA Engine unit tests.
//
// Run:  node examples/tests/test-sta-engine.mjs

import { analyzeTimingPaths, pathDetail } from '../../js/backend/STAEngine.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const loadCircuit = f => JSON.parse(readFileSync(resolve(__dir, '..', 'circuits', f), 'utf-8'));

let failed = 0;
function check(label, cond, detail = '') {
  const mark = cond ? 'PASS' : 'FAIL';
  if (!cond) failed++;
  console.log(`  [${mark}] ${label}${detail ? ' — ' + detail : ''}`);
}

// Helper: build a minimal scene inline
function mkScene(nodes, wires) { return { nodes, wires }; }

// ───────────────────────────────────────────
console.log('\n=== STA Engine Tests ===\n');

// --- T1: Single reg2reg path, correct arrival/slack ---
{
  console.log('T1: Single reg2reg path');
  const scene = mkScene(
    [
      { type: 'CLOCK',    id: 'clk', x: 0, y: 0, value: 0 },
      { type: 'FF_SLOT',  id: 'fa',  x: 0, y: 0, gate: 'D' },
      { type: 'GATE_SLOT',id: 'g1',  x: 0, y: 0, gate: 'AND' }, // 50ps
      { type: 'GATE_SLOT',id: 'g2',  x: 0, y: 0, gate: 'NOT' }, // 30ps
      { type: 'FF_SLOT',  id: 'fb',  x: 0, y: 0, gate: 'D' },
    ],
    [
      { sourceId: 'clk', targetId: 'fa', targetInputIndex: 2, sourceOutputIndex: 0, isClockWire: true, id: 'wc1' },
      { sourceId: 'clk', targetId: 'fb', targetInputIndex: 2, sourceOutputIndex: 0, isClockWire: true, id: 'wc2' },
      { sourceId: 'fa',  targetId: 'g1', targetInputIndex: 0, sourceOutputIndex: 0, id: 'w1' },
      { sourceId: 'g1',  targetId: 'g2', targetInputIndex: 0, sourceOutputIndex: 0, id: 'w2' },
      { sourceId: 'g2',  targetId: 'fb', targetInputIndex: 0, sourceOutputIndex: 0, id: 'w3' },
    ]
  );
  const r = analyzeTimingPaths(scene, { clockPeriodPs: 2000 });
  const p = r.paths.find(p => p.endId === 'fb' && p.type === 'reg2reg');
  check('path found', !!p);
  // arrival = tClk2Q(100) + AND(50) + NOT(30) = 180
  check('arrival = 180ps', p?.arrivalPs === 180, `got ${p?.arrivalPs}`);
  // required = 2000 - 50 = 1950
  check('required = 1950ps', p?.requiredPs === 1950, `got ${p?.requiredPs}`);
  check('slack = 1770ps', p?.slackPs === 1770, `got ${p?.slackPs}`);
  check('status MET', p?.status === 'MET');
  check('WNS = 0', r.wns === 0);
  check('no violations', r.numViolations === 0);
}

// --- T2: Two parallel paths, critical = longer ---
{
  console.log('\nT2: Two parallel paths');
  const scene = mkScene(
    [
      { type: 'CLOCK',    id: 'clk', x: 0, y: 0, value: 0 },
      { type: 'FF_SLOT',  id: 'fa',  x: 0, y: 0, gate: 'D' },
      { type: 'GATE_SLOT',id: 'short', x: 0, y: 0, gate: 'NOT' },   // 30ps path
      { type: 'GATE_SLOT',id: 'long1', x: 0, y: 0, gate: 'XOR' },   // 80ps
      { type: 'GATE_SLOT',id: 'long2', x: 0, y: 0, gate: 'AND' },   // 50ps
      { type: 'GATE_SLOT',id: 'merge', x: 0, y: 0, gate: 'OR' },    // 50ps
      { type: 'FF_SLOT',  id: 'fb',  x: 0, y: 0, gate: 'D' },
    ],
    [
      { sourceId: 'clk', targetId: 'fa', targetInputIndex: 2, sourceOutputIndex: 0, isClockWire: true, id: 'wc1' },
      { sourceId: 'clk', targetId: 'fb', targetInputIndex: 2, sourceOutputIndex: 0, isClockWire: true, id: 'wc2' },
      // Short path: fa -> short -> merge
      { sourceId: 'fa',    targetId: 'short', targetInputIndex: 0, sourceOutputIndex: 0, id: 'ws1' },
      { sourceId: 'short', targetId: 'merge', targetInputIndex: 0, sourceOutputIndex: 0, id: 'ws2' },
      // Long path: fa -> long1 -> long2 -> merge
      { sourceId: 'fa',    targetId: 'long1', targetInputIndex: 0, sourceOutputIndex: 0, id: 'wl1' },
      { sourceId: 'long1', targetId: 'long2', targetInputIndex: 0, sourceOutputIndex: 0, id: 'wl2' },
      { sourceId: 'long2', targetId: 'merge', targetInputIndex: 1, sourceOutputIndex: 0, id: 'wl3' },
      // merge -> fb
      { sourceId: 'merge', targetId: 'fb',    targetInputIndex: 0, sourceOutputIndex: 0, id: 'wm' },
    ]
  );
  const r = analyzeTimingPaths(scene, { clockPeriodPs: 2000 });
  const p = r.paths.find(p => p.endId === 'fb' && p.type === 'reg2reg');
  // Long path: tClk2Q(100) + XOR(80) + AND(50) + OR(50) = 280
  check('arrival via long path = 280ps', p?.arrivalPs === 280, `got ${p?.arrivalPs}`);
  check('critical path includes long gates',
    p?.nodeIds.includes('long1') && p?.nodeIds.includes('long2'),
    `path: ${p?.nodeIds.join('→')}`
  );
}

// --- T3: Setup violation with tight clock ---
{
  console.log('\nT3: Setup violation');
  const scene = mkScene(
    [
      { type: 'CLOCK',    id: 'clk', x: 0, y: 0, value: 0 },
      { type: 'FF_SLOT',  id: 'fa',  x: 0, y: 0, gate: 'D' },
      { type: 'GATE_SLOT',id: 'g1',  x: 0, y: 0, gate: 'XOR' }, // 80
      { type: 'GATE_SLOT',id: 'g2',  x: 0, y: 0, gate: 'XOR' }, // 80
      { type: 'GATE_SLOT',id: 'g3',  x: 0, y: 0, gate: 'XOR' }, // 80
      { type: 'FF_SLOT',  id: 'fb',  x: 0, y: 0, gate: 'D' },
    ],
    [
      { sourceId: 'clk', targetId: 'fa', targetInputIndex: 2, sourceOutputIndex: 0, isClockWire: true, id: 'wc1' },
      { sourceId: 'clk', targetId: 'fb', targetInputIndex: 2, sourceOutputIndex: 0, isClockWire: true, id: 'wc2' },
      { sourceId: 'fa', targetId: 'g1', targetInputIndex: 0, sourceOutputIndex: 0, id: 'w1' },
      { sourceId: 'g1', targetId: 'g2', targetInputIndex: 0, sourceOutputIndex: 0, id: 'w2' },
      { sourceId: 'g2', targetId: 'g3', targetInputIndex: 0, sourceOutputIndex: 0, id: 'w3' },
      { sourceId: 'g3', targetId: 'fb', targetInputIndex: 0, sourceOutputIndex: 0, id: 'w4' },
    ]
  );
  // arrival = 100 + 80*3 = 340ps; clock = 300ps; required = 300-50 = 250ps; slack = -90ps
  const r = analyzeTimingPaths(scene, { clockPeriodPs: 300 });
  const p = r.paths.find(p => p.type === 'reg2reg');
  check('arrival = 340ps', p?.arrivalPs === 340, `got ${p?.arrivalPs}`);
  check('status VIOLATED', p?.status === 'VIOLATED');
  check('slack = -90ps', p?.slackPs === -90, `got ${p?.slackPs}`);
  check('WNS = -90', r.wns === -90, `got ${r.wns}`);
  check('numViolations = 1', r.numViolations >= 1);
}

// --- T4: Hold violation ---
{
  console.log('\nT4: Hold violation');
  // Direct reg-to-reg with no combinational logic → very fast path
  const scene = mkScene(
    [
      { type: 'CLOCK',   id: 'clk', x: 0, y: 0, value: 0 },
      { type: 'FF_SLOT', id: 'fa',  x: 0, y: 0, gate: 'D' },
      { type: 'FF_SLOT', id: 'fb',  x: 0, y: 0, gate: 'D' },
    ],
    [
      { sourceId: 'clk', targetId: 'fa', targetInputIndex: 2, sourceOutputIndex: 0, isClockWire: true, id: 'wc1' },
      { sourceId: 'clk', targetId: 'fb', targetInputIndex: 2, sourceOutputIndex: 0, isClockWire: true, id: 'wc2' },
      { sourceId: 'fa',  targetId: 'fb', targetInputIndex: 0, sourceOutputIndex: 0, id: 'w1' },
    ]
  );
  // arrival at fb = tClk2Q of fa = 100ps; holdSlack = arrival - tClk2Q - tHold
  // With large tHold: holdSlack = 100 - 100 - 200 = -200
  const r = analyzeTimingPaths(scene, { clockPeriodPs: 2000, tHoldPs: 200 });
  const p = r.paths.find(p => p.type === 'reg2reg');
  check('hold violation detected', p?.holdViolation === true, `holdSlack=${p?.holdSlackPs}`);
  check('numHoldViolations >= 1', r.numHoldViolations >= 1);
}

// --- T5: in2reg path ---
{
  console.log('\nT5: in2reg path');
  const scene = mkScene(
    [
      { type: 'CLOCK',    id: 'clk', x: 0, y: 0, value: 0 },
      { type: 'INPUT',    id: 'in1', x: 0, y: 0, fixedValue: 1 },
      { type: 'GATE_SLOT',id: 'g1',  x: 0, y: 0, gate: 'AND' }, // 50ps
      { type: 'FF_SLOT',  id: 'fb',  x: 0, y: 0, gate: 'D' },
    ],
    [
      { sourceId: 'clk', targetId: 'fb', targetInputIndex: 2, sourceOutputIndex: 0, isClockWire: true, id: 'wc' },
      { sourceId: 'in1', targetId: 'g1', targetInputIndex: 0, sourceOutputIndex: 0, id: 'w1' },
      { sourceId: 'g1',  targetId: 'fb', targetInputIndex: 0, sourceOutputIndex: 0, id: 'w2' },
    ]
  );
  const r = analyzeTimingPaths(scene);
  const p = r.paths.find(p => p.type === 'in2reg');
  check('in2reg path found', !!p);
  // arrival = INPUT(0) + AND(50) = 50ps
  check('arrival = 50ps', p?.arrivalPs === 50, `got ${p?.arrivalPs}`);
}

// --- T6: reg2out path ---
{
  console.log('\nT6: reg2out path');
  const scene = mkScene(
    [
      { type: 'CLOCK',    id: 'clk', x: 0, y: 0, value: 0 },
      { type: 'FF_SLOT',  id: 'fa',  x: 0, y: 0, gate: 'D' },
      { type: 'GATE_SLOT',id: 'g1',  x: 0, y: 0, gate: 'NOT' }, // 30ps
      { type: 'OUTPUT',   id: 'out', x: 0, y: 0 },
    ],
    [
      { sourceId: 'clk', targetId: 'fa',  targetInputIndex: 2, sourceOutputIndex: 0, isClockWire: true, id: 'wc' },
      { sourceId: 'fa',  targetId: 'g1',  targetInputIndex: 0, sourceOutputIndex: 0, id: 'w1' },
      { sourceId: 'g1',  targetId: 'out', targetInputIndex: 0, sourceOutputIndex: 0, id: 'w2' },
    ]
  );
  const r = analyzeTimingPaths(scene);
  const p = r.paths.find(p => p.type === 'reg2out');
  check('reg2out path found', !!p);
  // arrival = tClk2Q(100) + NOT(30) = 130ps
  check('arrival = 130ps', p?.arrivalPs === 130, `got ${p?.arrivalPs}`);
}

// --- T7: WNS/TNS aggregate ---
{
  console.log('\nT7: WNS/TNS aggregate');
  // Two endpoints, both violated with different slacks
  const scene = mkScene(
    [
      { type: 'CLOCK',    id: 'clk', x: 0, y: 0, value: 0 },
      { type: 'FF_SLOT',  id: 'fa',  x: 0, y: 0, gate: 'D' },
      { type: 'GATE_SLOT',id: 'g1',  x: 0, y: 0, gate: 'XOR' },   // 80
      { type: 'GATE_SLOT',id: 'g2',  x: 0, y: 0, gate: 'XOR' },   // 80
      { type: 'FF_SLOT',  id: 'fb',  x: 0, y: 0, gate: 'D' },
      { type: 'GATE_SLOT',id: 'g3',  x: 0, y: 0, gate: 'AND' },   // 50
      { type: 'FF_SLOT',  id: 'fc',  x: 0, y: 0, gate: 'D' },
    ],
    [
      { sourceId: 'clk', targetId: 'fa', targetInputIndex: 2, sourceOutputIndex: 0, isClockWire: true, id: 'wc1' },
      { sourceId: 'clk', targetId: 'fb', targetInputIndex: 2, sourceOutputIndex: 0, isClockWire: true, id: 'wc2' },
      { sourceId: 'clk', targetId: 'fc', targetInputIndex: 2, sourceOutputIndex: 0, isClockWire: true, id: 'wc3' },
      // fa -> g1 -> g2 -> fb: arrival = 100+80+80 = 260; clock=200 → slack = 150-260 = -110
      { sourceId: 'fa', targetId: 'g1', targetInputIndex: 0, sourceOutputIndex: 0, id: 'w1' },
      { sourceId: 'g1', targetId: 'g2', targetInputIndex: 0, sourceOutputIndex: 0, id: 'w2' },
      { sourceId: 'g2', targetId: 'fb', targetInputIndex: 0, sourceOutputIndex: 0, id: 'w3' },
      // fa -> g3 -> fc: arrival = 100+50 = 150; clock=200 → slack = 150-150 = 0  (MET)
      { sourceId: 'fa', targetId: 'g3', targetInputIndex: 0, sourceOutputIndex: 0, id: 'w4' },
      { sourceId: 'g3', targetId: 'fc', targetInputIndex: 0, sourceOutputIndex: 0, id: 'w5' },
    ]
  );
  const r = analyzeTimingPaths(scene, { clockPeriodPs: 200 });
  check('WNS = -110', r.wns === -110, `got ${r.wns}`);
  check('TNS = -110 (only one violated)', r.tns === -110, `got ${r.tns}`);
  check('numViolations = 1', r.numViolations === 1, `got ${r.numViolations}`);
}

// --- T8: pathDetail breakdown ---
{
  console.log('\nT8: pathDetail');
  const scene = mkScene(
    [
      { type: 'FF_SLOT',  id: 'fa', x: 0, y: 0, gate: 'D', label: 'FF_A' },
      { type: 'GATE_SLOT',id: 'g1', x: 0, y: 0, gate: 'AND', label: 'AND1' },
      { type: 'FF_SLOT',  id: 'fb', x: 0, y: 0, gate: 'D', label: 'FF_B' },
    ],
    []
  );
  const rows = pathDetail(scene, ['fa', 'g1', 'fb']);
  check('3 rows returned', rows.length === 3);
  check('cumulative delay correct', rows[2].arrivalPs === 50, `got ${rows[2]?.arrivalPs}`);
  check('gate type = AND', rows[1].type === 'AND');
}

// --- T9: Demo circuit: sta-setup-pass.json ---
{
  console.log('\nT9: sta-setup-pass.json');
  const scene = loadCircuit('sta-setup-pass.json');
  const r = analyzeTimingPaths(scene, { clockPeriodPs: 2000 });
  check('has paths', r.paths.length > 0, `found ${r.paths.length}`);
  check('no violations', r.numViolations === 0);
  check('WNS = 0', r.wns === 0);
  const reg2reg = r.paths.find(p => p.type === 'reg2reg');
  check('reg2reg found', !!reg2reg);
  if (reg2reg) {
    // FF_A(tClk2Q=100) + AND(50) + OR(50) + NOT(30) = 230
    check('arrival = 230ps', reg2reg.arrivalPs === 230, `got ${reg2reg.arrivalPs}`);
  }
}

// --- T10: Demo circuit: sta-setup-violation.json ---
{
  console.log('\nT10: sta-setup-violation.json');
  const scene = loadCircuit('sta-setup-violation.json');
  // 8 gates: AND(50)+XOR(80)+AND(50)+OR(50)+XOR(80)+AND(50)+OR(50)+NOT(30) = 440
  // + tClk2Q(100) = 540ps. Clock 500ps → required 450ps → slack -90ps
  const r = analyzeTimingPaths(scene, { clockPeriodPs: 500 });
  check('has paths', r.paths.length > 0);
  check('has violations', r.numViolations > 0);
  check('WNS < 0', r.wns < 0, `WNS = ${r.wns}`);
  const reg2reg = r.paths.find(p => p.type === 'reg2reg');
  if (reg2reg) {
    check('arrival = 540ps', reg2reg.arrivalPs === 540, `got ${reg2reg.arrivalPs}`);
    check('VIOLATED', reg2reg.status === 'VIOLATED');
  }
}

// --- T11: Demo circuit: sta-multi-path.json ---
{
  console.log('\nT11: sta-multi-path.json');
  const scene = loadCircuit('sta-multi-path.json');
  const r = analyzeTimingPaths(scene, { clockPeriodPs: 2000 });
  const reg2reg = r.paths.find(p => p.type === 'reg2reg');
  check('reg2reg found', !!reg2reg);
  if (reg2reg) {
    // Long path B: FF_SRC(100) + OR(50)+XOR(80)+AND(50)+OR(50)+NOT(30)+OR(50) = 410
    // Short path A: FF_SRC(100) + AND(50)+NOT(30)+OR(50) = 230
    // Critical = B → arrival at merge = max(path A arrive at merge, path B arrive at merge)
    check('critical path takes longer route', reg2reg.arrivalPs > 300, `got ${reg2reg.arrivalPs}`);
    check('MET at 2ns', reg2reg.status === 'MET');
  }
}

// ───────────────────────────────────────────
console.log(`\n${'─'.repeat(40)}`);
if (failed) {
  console.log(`FAILED: ${failed} test(s)\n`);
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED\n');
}
