// Thin wrapper around Icarus Verilog (`iverilog` + `vvp`).
//
// Node-only module (uses child_process, fs). Not imported from the browser
// bundle; used exclusively by HDL tests under examples/tests/.

import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let cachedAvailable = null;

export function isIverilogAvailable() {
  if (cachedAvailable !== null) return cachedAvailable;
  try {
    const r = spawnSync('iverilog', ['-V'], { encoding: 'utf8' });
    cachedAvailable = r.status === 0 || (r.stdout || '').includes('Icarus');
  } catch {
    cachedAvailable = false;
  }
  return cachedAvailable;
}

// Syntax-only check: iverilog parses the source and exits. Does not require
// a testbench. Returns { ok, skipped, stderr }.
export function parseCheck(verilogSource, { standard = '2012' } = {}) {
  if (!isIverilogAvailable()) {
    return { ok: true, skipped: true, stderr: 'iverilog not on PATH' };
  }
  const dir = mkdtempSync(join(tmpdir(), 'hdl-iv-'));
  const src = join(dir, 'design.v');
  const out = join(dir, 'out.vvp');
  writeFileSync(src, verilogSource, 'utf8');
  try {
    const r = spawnSync('iverilog', [`-g${standard}`, '-o', out, src], { encoding: 'utf8' });
    return { ok: r.status === 0, skipped: false, stderr: r.stderr || '' };
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

// Compile and run; if the source includes `$dumpfile`/`$dumpvars`, read
// the resulting VCD. Returns { ok, skipped, stderr, stdout, vcd? }.
export function simulate(verilogSource, { standard = '2012', vcdName = 'dump.vcd' } = {}) {
  if (!isIverilogAvailable()) {
    return { ok: true, skipped: true, stderr: 'iverilog not on PATH' };
  }
  const dir = mkdtempSync(join(tmpdir(), 'hdl-iv-'));
  const src = join(dir, 'design.v');
  const out = join(dir, 'out.vvp');
  const vcd = join(dir, vcdName);
  writeFileSync(src, verilogSource, 'utf8');
  try {
    const c = spawnSync('iverilog', [`-g${standard}`, '-o', out, src], { encoding: 'utf8' });
    if (c.status !== 0) {
      return { ok: false, skipped: false, stderr: c.stderr || '', stdout: '' };
    }
    const v = spawnSync('vvp', [out], { encoding: 'utf8', cwd: dir });
    const vcdContent = existsSync(vcd) ? readFileSync(vcd, 'utf8') : null;
    return {
      ok: v.status === 0,
      skipped: false,
      stderr: (c.stderr || '') + (v.stderr || ''),
      stdout: v.stdout || '',
      vcd: vcdContent,
    };
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}
