/**
 * TruthTableGenerator — Auto-generate truth tables for combinational sub-circuits.
 *
 * Given a set of input and output nodes, exhaustively evaluates all
 * input combinations and records the output values.
 */
import { evaluate } from '../engine/SimulationEngine.js';

/**
 * Generate a truth table for a circuit.
 *
 * @param {object[]} nodes - All nodes in the circuit
 * @param {object[]} wires - All wires
 * @param {string[]} inputIds - IDs of INPUT nodes to vary
 * @param {string[]} outputIds - IDs of OUTPUT nodes to read
 * @returns {{ inputs: {id,label}[], outputs: {id,label}[], rows: number[][] }}
 */
export function generateTruthTable(nodes, wires, inputIds, outputIds) {
  const inputNodes = inputIds.map(id => nodes.find(n => n.id === id)).filter(Boolean);
  const outputNodes = outputIds.map(id => nodes.find(n => n.id === id)).filter(Boolean);

  if (inputNodes.length === 0 || outputNodes.length === 0) {
    return { inputs: [], outputs: [], rows: [] };
  }

  // Limit: max 10 inputs (1024 rows)
  const numInputs = Math.min(inputNodes.length, 10);
  const numCombinations = 1 << numInputs;

  const inputs = inputNodes.slice(0, numInputs).map(n => ({ id: n.id, label: n.label || n.id }));
  const outputs = outputNodes.map(n => ({ id: n.id, label: n.label || n.id }));

  const rows = [];

  // Save original values
  const originalValues = inputNodes.map(n => n.fixedValue);

  for (let combo = 0; combo < numCombinations; combo++) {
    // Set input values from the combination bits
    for (let i = 0; i < numInputs; i++) {
      inputNodes[i].fixedValue = (combo >> (numInputs - 1 - i)) & 1;
    }

    // Evaluate circuit
    const result = evaluate(nodes, wires, new Map(), 0);

    // Read output values
    const row = [];
    for (let i = 0; i < numInputs; i++) {
      row.push(inputNodes[i].fixedValue);
    }
    for (const out of outputNodes) {
      row.push(result.nodeValues.get(out.id) ?? null);
    }
    rows.push(row);
  }

  // Restore original values
  for (let i = 0; i < inputNodes.length; i++) {
    inputNodes[i].fixedValue = originalValues[i];
  }

  return { inputs, outputs, rows };
}

/**
 * Render a truth table as an HTML string.
 */
export function renderTruthTableHTML(table) {
  if (!table || table.rows.length === 0) {
    return '<div style="color:#4a6080;padding:8px">No data. Select inputs and outputs.</div>';
  }

  const allCols = [...table.inputs, ...table.outputs];
  const numInputs = table.inputs.length;

  let html = '<table class="truth-table-gen"><thead><tr>';
  allCols.forEach((col, i) => {
    const cls = i < numInputs ? 'tt-input' : 'tt-output';
    html += `<th class="${cls}">${col.label}</th>`;
  });
  html += '</tr></thead><tbody>';

  for (const row of table.rows) {
    html += '<tr>';
    row.forEach((val, i) => {
      const cls = i < numInputs ? 'tt-input' : 'tt-output';
      const valCls = val === 1 ? 'tt-high' : (val === 0 ? 'tt-low' : 'tt-null');
      const display = val !== null ? val.toString() : '?';
      html += `<td class="${cls} ${valCls}">${display}</td>`;
    });
    html += '</tr>';
  }

  html += '</tbody></table>';
  return html;
}
