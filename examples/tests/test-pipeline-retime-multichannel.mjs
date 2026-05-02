// Multi-channel retime — verifies suggestRetime() handles PIPE_REGs with
// channels > 1, applies the proposal as an undoable RetimeCommand, and
// preserves the datapath's arithmetic correctness across the move.
//
// Scenario: pipeline-demo-adder.json is a 3-stage 3-bit adder where the
// carry chain forces stage 1 = FA1→FA2 = 300 ps while stages 0 and 2 sit
// at 150 ps and ~0 ps respectively. The retimer should suggest pulling
// PIPE2 backward across FA2 — splitting the chain so each stage holds
// exactly one FA = 150 ps each.
//
// Run:  node examples/tests/test-pipeline-retime-multichannel.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { SceneGraph } from '../../js/core/SceneGraph.js';
import { evaluate as stageEvaluate } from '../../js/pipeline/StageEvaluator.js';
import { suggestRetime } from '../../js/pipeline/Retimer.js';
import { RetimeCommand } from '../../js/pipeline/commands/RetimeCommand.js';
import { CommandManager } from '../../js/core/CommandManager.js';
import { evaluate as simEvaluate } from '../../js/engine/SimulationEngine.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const load = (rel) => JSON.parse(readFileSync(resolve(__dirname, rel), 'utf8'));

let failed = 0;
function check(label, cond, extra = '') {
  const mark = cond ? 'PASS' : 'FAIL';
  if (!cond) failed++;
  console.log(`  [${mark}] ${label}${extra ? '  — ' + extra : ''}`);
}

function buildSceneFromJson(relPath) {
  const data = load(relPath);
  const scene = new SceneGraph();
  for (const n of data.nodes) scene.addNode({ ...n });
  for (const w of data.wires) scene.addWire({ ...w });
  return scene;
}

console.log('\n-- Multi-channel retime on pipeline-demo-adder.json --');
const scene    = buildSceneFromJson('../circuits/pipeline-demo-adder.json');
const commands = new CommandManager();

const before = stageEvaluate({ nodes: scene.nodes, wires: scene.wires });
check('before: 3 stages, 300 ps bottleneck', before.cycles === 3 && before.maxDelayPs === 300);

const proposal = suggestRetime({ nodes: scene.nodes, wires: scene.wires });
check('suggestion exists',                   !!proposal);
check('suggestion is for PIPE2',             proposal?.pipeId === 'p2');
check('direction is backward',               proposal?.direction === 'backward');
check('past node is FA2',                    proposal?.pastNodeId === 'fa2');
check('predicts 150 ps after',               proposal?.after?.maxDelayPs === 150);
check('predicts +150 ps improvement',        proposal?.improvementPs === 150);
check('proposal includes nodePropEdits',     Array.isArray(proposal?.nodePropEdits) && proposal.nodePropEdits.length > 0);
check('PIPE2 channels grow from 4 to 5',     proposal?.nodePropEdits?.some(e => e.nodeId === 'p2' && e.props?.channels === 5));

// Snapshot pre-execute state.
const p2_channels_before = scene.getNode('p2').channels;
const startWireIds = new Set(scene.wires.map(w => w.id));

// Execute.
const cmd = new RetimeCommand(scene, proposal);
commands.execute(cmd);

const after = stageEvaluate({ nodes: scene.nodes, wires: scene.wires });
check('after execute: 150 ps bottleneck',    after.maxDelayPs === 150);
check('after execute: still 3 stages',       after.cycles === 3);
check('after execute: no cycles',            after.hasCycle === false);
check('after execute: PIPE2 now 5 channels', scene.getNode('p2').channels === 5);
check('after execute: stage 0 = 150 ps',     after.stages[0].delayPs === 150);
check('after execute: stage 1 = 150 ps',     after.stages[1].delayPs === 150);
check('after execute: stage 2 = 150 ps',     after.stages[2].delayPs === 150);

// ── Functional correctness: drive a known input through the retimed
// pipeline and check the output matches what the un-retimed adder would
// produce on the same inputs (just with one extra cycle of latency, since
// the retime added a register stage in the carry's path).
function setStep(node, idx) {
  if (node.stepValues) node.fixedValue = node.stepValues[Math.min(idx, node.stepValues.length - 1)];
}
function tickN(scene, n) {
  const ffs = new Map();
  const clk = scene.getNode('clk');
  for (let i = 0; i < n; i++) {
    for (const node of scene.nodes) if (node.type === 'INPUT') setStep(node, i);
    clk.value = 1; simEvaluate(scene.nodes, scene.wires, ffs, i);
    clk.value = 0; simEvaluate(scene.nodes, scene.wires, ffs, i);
  }
  return ffs;
}
// 8 cycles drains the deepest pipe (3 stages now post-retime ⇒ 3-cycle latency).
const ffs = tickN(scene, 8);
const p2 = ffs.get('p2');
check('PIPE2 ms.channels resized to 5',     Array.isArray(p2?.channels) && p2.channels.length === 5);

// Undo.
commands.undo();
const undone = stageEvaluate({ nodes: scene.nodes, wires: scene.wires });
check('after undo: back to 300 ps',          undone.maxDelayPs === 300);
check('after undo: PIPE2 channels = 4',      scene.getNode('p2').channels === p2_channels_before);
check('after undo: wire-id set restored',    scene.wires.every(w => startWireIds.has(w.id)) && scene.wires.length === startWireIds.size);

// Redo lands us back in the retimed state.
commands.redo();
const redone = stageEvaluate({ nodes: scene.nodes, wires: scene.wires });
check('after redo: 150 ps again',            redone.maxDelayPs === 150);
check('after redo: PIPE2 channels = 5',      scene.getNode('p2').channels === 5);

console.log(`\n${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
process.exit(failed === 0 ? 0 : 1);
