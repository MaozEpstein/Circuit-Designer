// Run with: node extract-showcase.js
// Extracts solved circuits from AND_GAME levels into showcase-data.js

const fs = require('fs');
const path = require('path');

// Load levels.js content
const levelsPath = path.join(__dirname, '..', 'Board Design', 'js', 'levels.js');
const levelsCode = fs.readFileSync(levelsPath, 'utf-8');

// Execute to get LEVELS array - wrap in function to capture const
const vm = require('vm');
const sandbox = { _result: null };
vm.createContext(sandbox);
vm.runInContext(levelsCode + '\n_result = LEVELS;', sandbox);

const LEVELS = sandbox._result;
const showcase = [];

for (const level of LEVELS) {
  if (level.id >= 61) continue; // skip design mode
  if (!level.solution) continue;

  const sol = level.solution;

  // Deep clone nodes and wires
  const nodes = JSON.parse(JSON.stringify(level.nodes));
  const wires = JSON.parse(JSON.stringify(level.wires));

  // Apply solution: place gates
  if (sol.gatesUsed) {
    const gateSlots = nodes.filter(n => n.type === 'GATE_SLOT');
    const linkedDone = new Set();
    let gi = 0;
    for (const slot of gateSlots) {
      if (slot.linkedGroup && linkedDone.has(slot.linkedGroup)) {
        // Copy gate from first in group
        const first = nodes.find(n => n.linkedGroup === slot.linkedGroup && n.gate);
        if (first) slot.gate = first.gate;
        continue;
      }
      if (gi < sol.gatesUsed.length) {
        slot.gate = sol.gatesUsed[gi];
        if (slot.linkedGroup) linkedDone.add(slot.linkedGroup);
        gi++;
      }
    }
  }

  // Apply solution: place flip-flops
  if (sol.ffsUsed) {
    const ffMap = { 'D-FF': 'D', 'T-FF': 'T', 'SR-FF': 'SR', 'JK-FF': 'JK' };
    const ffSlots = nodes.filter(n => n.type === 'FF_SLOT');
    const linkedDone = new Set();
    let fi = 0;
    for (const slot of ffSlots) {
      if (slot.linkedGroup && linkedDone.has(slot.linkedGroup)) {
        const first = nodes.find(n => n.linkedGroup === slot.linkedGroup && n.ffType);
        if (first) slot.ffType = first.ffType;
        continue;
      }
      if (fi < sol.ffsUsed.length) {
        slot.ffType = ffMap[sol.ffsUsed[fi]] || sol.ffsUsed[fi];
        if (slot.linkedGroup) linkedDone.add(slot.linkedGroup);
        fi++;
      }
    }
  }

  // Build category from difficulty
  const category = level.difficulty || 'Fundamentals';

  showcase.push({
    name: level.name,
    author: 'AND_GAME',
    desc: sol.explanation || level.description || '',
    category: category,
    originalId: level.id,
    date: Date.now(),
    likes: 0,
    nodes: nodes,
    wires: wires,
  });
}

// Write output
const output = `/* ============================================================
   showcase-data.js — Pre-built circuit designs from AND_GAME
   60 solved circuits organized by category for the public gallery
   ============================================================ */

const SHOWCASE_DESIGNS = ${JSON.stringify(showcase, null, 0)};
`;

fs.writeFileSync(path.join(__dirname, 'js', 'showcase-data.js'), output, 'utf-8');
console.log(`Extracted ${showcase.length} showcase designs.`);
