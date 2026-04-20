// Phase 1 skeleton test — an empty circuit exports a valid empty module,
// and a circuit with only INPUT/OUTPUT ports produces a sensible header
// with sanitized identifiers and bus widths. Run:
//   node examples/tests/test-hdl-skeleton.mjs

import { exportCircuit, sanitizeIdentifier } from '../../js/hdl/VerilogExporter.js';

let failed = 0;
function check(label, cond, detail = '') {
  const mark = cond ? 'PASS' : 'FAIL';
  if (!cond) failed++;
  console.log(`  [${mark}] ${label}${detail ? ' — ' + detail : ''}`);
}

console.log('HDL skeleton — empty circuit');
{
  const v = exportCircuit({ nodes: [], wires: [] });
  check('contains module top', v.includes('module top'));
  check('ends with endmodule', /endmodule\s*$/.test(v));
  check('no TODO markers', !v.includes('TODO'));
}

console.log('HDL skeleton — ports only');
{
  const circuit = {
    nodes: [
      { id: 'n1', type: 'INPUT',  label: 'a',   bitWidth: 1 },
      { id: 'n2', type: 'INPUT',  label: 'data', bitWidth: 8 },
      { id: 'n3', type: 'CLOCK',  label: 'clk', bitWidth: 1 },
      { id: 'n4', type: 'OUTPUT', label: 'y',   bitWidth: 1 },
      { id: 'n5', type: 'OUTPUT', label: 'result', bitWidth: 8 },
    ],
    wires: [],
  };
  const v = exportCircuit(circuit);
  check('input a declared',     /input\s+a[,)\s]/.test(v));
  check('input data is 8-bit',  /input\s+\[7:0\]\s+data/.test(v));
  check('clock as input',       /input\s+clk/.test(v));
  check('output y declared',    /output\s+y[,)\s]/.test(v));
  check('output result 8-bit',  /output\s+\[7:0\]\s+result/.test(v));
  check('endmodule present',    v.includes('endmodule'));
}

console.log('HDL skeleton — identifier sanitizer');
{
  check('keyword collides',  sanitizeIdentifier('module') === 'module_');
  check('leading digit',     sanitizeIdentifier('1bit') === '_1bit');
  check('illegal chars',     sanitizeIdentifier('a-b c') === 'a_b_c');
  check('blank -> fallback', sanitizeIdentifier('', 'fb') === 'fb');
}

console.log('HDL skeleton — unknown components produce TODO');
{
  const circuit = {
    nodes: [
      { id: 'g1', type: 'AND', label: 'u1' },
      { id: 'i1', type: 'INPUT', label: 'a', bitWidth: 1 },
    ],
    wires: [],
  };
  const v = exportCircuit(circuit);
  check('TODO marker emitted for untranslated gate', v.includes('TODO') && v.includes('AND'));
}

console.log(failed === 0 ? '\nAll HDL skeleton checks passed.' : `\n${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
