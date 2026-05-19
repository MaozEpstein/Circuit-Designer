#!/usr/bin/env node
// scripts/validate-iq.mjs — Data-integrity check for IQ/*/index.js
//
// Run locally:        node scripts/validate-iq.mjs
// Quiet (CI logs):    node scripts/validate-iq.mjs --quiet
// JSON for tools:     node scripts/validate-iq.mjs --json
//
// Exit code 0 if every check passes, 1 if any errors are found.
// Warnings are reported but do not fail the run.

import { pathToFileURL } from 'node:url';
import path from 'node:path';

const IQ_FILES = [
  'IQ/algorithms/index.js',
  'IQ/architecture/index.js',
  'IQ/dft/index.js',
  'IQ/logic/index.js',
  'IQ/puzzles/index.js',
  'IQ/sequential/index.js',
  'IQ/timing-cdc/index.js',
  'IQ/verilog/index.js',
];

const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

const args     = new Set(process.argv.slice(2));
const QUIET    = args.has('--quiet');
const JSON_OUT = args.has('--json');
const COLOR    = !JSON_OUT && process.stdout.isTTY && !process.env.NO_COLOR;

const c = {
  red:   (s) => COLOR ? `\x1b[31m${s}\x1b[0m` : s,
  green: (s) => COLOR ? `\x1b[32m${s}\x1b[0m` : s,
  yellow:(s) => COLOR ? `\x1b[33m${s}\x1b[0m` : s,
  dim:   (s) => COLOR ? `\x1b[90m${s}\x1b[0m` : s,
  bold:  (s) => COLOR ? `\x1b[1m${s}\x1b[0m`  : s,
};

const errors   = [];
const warnings = [];

const push = (arr, severity, file, qid, partLabel, category, message) => {
  arr.push({ severity, file, qid, part: partLabel || '', category, message });
};
const E = (file, qid, part, category, message) => push(errors,   'error', file, qid, part, category, message);
const W = (file, qid, part, category, message) => push(warnings, 'warn',  file, qid, part, category, message);

// ── Per-question / per-part checks ───────────────────────────────────

function validateQuestion(file, q, idMap) {
  const qid = q.id || '<no-id>';

  if (!q.id) {
    E(file, '', '', 'NO_ID', `question missing id (title="${q.title || '?'}")`);
  } else {
    if (!idMap.has(q.id)) idMap.set(q.id, []);
    idMap.get(q.id).push(file);
  }
  if (!q.title) E(file, qid, '', 'NO_TITLE', 'no title');
  if (q.difficulty && !VALID_DIFFICULTIES.has(q.difficulty)) {
    E(file, qid, '', 'BAD_DIFFICULTY',
      `difficulty="${q.difficulty}" not in {${[...VALID_DIFFICULTIES].join(',')}}`);
  }
  if (!q.difficulty) W(file, qid, '', 'NO_DIFFICULTY', 'no difficulty set');
  if (q.tags != null && !Array.isArray(q.tags)) E(file, qid, '', 'BAD_TAGS', 'tags is not an array');

  if (!Array.isArray(q.parts) || q.parts.length === 0) {
    E(file, qid, '', 'NO_PARTS', 'parts missing or empty');
    return;
  }
  for (const p of q.parts) validatePart(file, qid, p);
}

function validatePart(file, qid, p) {
  const pl = p.label || '?';

  const hasApproaches = Array.isArray(p.approaches) && p.approaches.length > 0;
  if (!p.question && !hasApproaches) {
    E(file, qid, pl, 'NO_QUESTION', 'has neither `question` nor non-empty `approaches`');
  }

  if (p.hints != null && !Array.isArray(p.hints)) {
    E(file, qid, pl, 'BAD_HINTS', 'hints is not an array');
  } else if (Array.isArray(p.hints)) {
    p.hints.forEach((h, i) => {
      if (typeof h !== 'string') E(file, qid, pl, 'BAD_HINT_ITEM', `hint[${i}] not a string`);
    });
  }

  if (p.expectedAnswers != null) {
    if (!Array.isArray(p.expectedAnswers)) {
      E(file, qid, pl, 'BAD_EXP', 'expectedAnswers not array');
    } else {
      p.expectedAnswers.forEach((a, i) => {
        if (typeof a !== 'string' && !(a instanceof RegExp)) {
          E(file, qid, pl, 'BAD_EXP_ITEM', `expectedAnswers[${i}] type=${typeof a}`);
        }
      });
    }
  }

  if (hasApproaches) {
    p.approaches.forEach((a, i) => {
      if (!a || typeof a !== 'object') {
        E(file, qid, pl, 'BAD_APPROACH', `approach[${i}] not an object`);
        return;
      }
      if (!a.name)    W(file, qid, pl, 'APPROACH_NO_NAME',    `approach[${i}] no name`);
      if (!a.code && !a.summary) {
        W(file, qid, pl, 'APPROACH_EMPTY', `approach[${i}] has neither code nor summary`);
      }
    });
  }

  if (p.trace) validateTrace(file, qid, pl, p.trace);
}

function validateTrace(file, qid, pl, trace) {
  if (!Array.isArray(trace.steps) || trace.steps.length === 0) {
    E(file, qid, pl, 'TRACE_EMPTY', 'trace.steps missing or empty');
    return;
  }

  let srcLines = null;
  if (trace.source != null) {
    if (typeof trace.source !== 'string' || trace.source.length === 0) {
      E(file, qid, pl, 'BAD_SOURCE', 'trace.source present but not a non-empty string');
    } else {
      srcLines = trace.source.split('\n').length;
    }
  }

  trace.steps.forEach((s, i) => {
    if (!s) { E(file, qid, pl, 'STEP_NULL', `step[${i}] is null/undefined`); return; }
    if (!s.viz && !s.explain && !s.code) {
      E(file, qid, pl, 'STEP_EMPTY', `step[${i}]: no viz, code, or explain`);
    }
    for (const f of ['code', 'explain']) {
      if (s[f] != null && typeof s[f] !== 'string') {
        E(file, qid, pl, 'BAD_FIELD_TYPE', `step[${i}].${f} not a string (typeof=${typeof s[f]})`);
      }
    }
    if (s.viz != null && typeof s.viz !== 'string') {
      E(file, qid, pl, 'BAD_FIELD_TYPE', `step[${i}].viz not a string (typeof=${typeof s.viz})`);
    }

    if (s.executed != null) {
      if (!Array.isArray(s.executed)) {
        E(file, qid, pl, 'EXEC_SHAPE', `step[${i}]: executed not array`);
      } else if (srcLines != null) {
        for (const n of s.executed) {
          if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > srcLines) {
            E(file, qid, pl, 'EXEC_OOB',
              `step[${i}]: executed=${n} not integer in [1,${srcLines}]`);
            break;
          }
        }
      }
    }

    if (s.focusLine != null && srcLines != null) {
      if (typeof s.focusLine !== 'number' || !Number.isInteger(s.focusLine)
          || s.focusLine < 1 || s.focusLine > srcLines) {
        E(file, qid, pl, 'FOCUS_OOB',
          `step[${i}]: focusLine=${s.focusLine} not integer in [1,${srcLines}]`);
      }
    }

    // Triple-escape authoring trap: \\\\` should not survive into runtime data.
    for (const f of ['code', 'explain']) {
      if (typeof s[f] === 'string' && s[f].includes('\\\\\`')) {
        E(file, qid, pl, 'TRIPLE_ESC',
          `step[${i}].${f} contains "\\\\\\\\\`" — likely a double-escape artifact`);
      }
    }
  });

  if (srcLines != null) {
    const any = trace.steps.some(s => (s?.executed?.length > 0) || s?.focusLine != null);
    if (!any) W(file, qid, pl, 'SOURCE_UNUSED',
      'trace.source is set but no step has executed/focusLine — code panel never highlights');
  }
}

// ── Main ─────────────────────────────────────────────────────────────

let totalQ = 0, totalP = 0, totalTraces = 0;
const idMap = new Map();
const perFile = [];

for (const file of IQ_FILES) {
  let mod;
  try {
    mod = await import(pathToFileURL(path.resolve(file)).href);
  } catch (e) {
    E(file, '', '', 'LOAD', 'failed to import: ' + e.message);
    perFile.push({ file, count: 0 });
    continue;
  }
  const Qs = mod.QUESTIONS;
  if (!Array.isArray(Qs)) {
    E(file, '', '', 'SHAPE', 'QUESTIONS export missing or not an array');
    perFile.push({ file, count: 0 });
    continue;
  }
  perFile.push({ file, count: Qs.length });
  for (const q of Qs) {
    totalQ++;
    for (const p of (q.parts || [])) {
      totalP++;
      if (p.trace) totalTraces++;
    }
    validateQuestion(file, q, idMap);
  }
}

for (const [id, files] of idMap) {
  if (files.length > 1) {
    E(files.join('+'), id, '', 'DUP_ID', `id appears in ${files.length} files`);
  }
}

// ── Report ───────────────────────────────────────────────────────────

const summary = {
  filesScanned : IQ_FILES.length,
  questions    : totalQ,
  parts        : totalP,
  traces       : totalTraces,
  uniqueIds    : idMap.size,
  errors       : errors.length,
  warnings     : warnings.length,
  perFile,
};

if (JSON_OUT) {
  process.stdout.write(JSON.stringify({ summary, errors, warnings }, null, 2) + '\n');
} else if (QUIET) {
  const verdict = errors.length === 0 ? 'PASS' : 'FAIL';
  process.stdout.write(
    `iq-validate: files=${IQ_FILES.length} questions=${totalQ} parts=${totalP} ` +
    `traces=${totalTraces} errors=${errors.length} warnings=${warnings.length} ${verdict}\n`
  );
} else {
  // Group by category for readability.
  const groupBy = (arr) => {
    const m = new Map();
    for (const it of arr) {
      if (!m.has(it.category)) m.set(it.category, []);
      m.get(it.category).push(it);
    }
    return [...m.entries()].sort();
  };
  const writeGroup = (label, color, list) => {
    if (list.length === 0) return;
    process.stdout.write(`\n${color(label)} (${list.length})\n`);
    for (const [cat, items] of groupBy(list)) {
      process.stdout.write(`  ${c.bold(cat)}  ${c.dim(`(${items.length})`)}\n`);
      for (const it of items.slice(0, 30)) {
        const where = it.part ? `${it.qid}/${it.part}` : it.qid || '-';
        process.stdout.write(`    ${c.dim(it.file)}  ${where}  ${it.message}\n`);
      }
      if (items.length > 30) process.stdout.write(`    ${c.dim(`(+${items.length - 30} more)`)}\n`);
    }
  };

  writeGroup('✘ ERRORS',   c.red,    errors);
  writeGroup('⚠ WARNINGS', c.yellow, warnings);

  process.stdout.write('\n' + c.bold('Summary') + '\n');
  for (const pf of perFile) {
    process.stdout.write(`  ${c.dim(pf.file.padEnd(34))}  ${String(pf.count).padStart(3)} questions\n`);
  }
  process.stdout.write(c.dim('  ─────────────────────────────────────  ───\n'));
  process.stdout.write(`  ${'total'.padEnd(34)}  ${String(totalQ).padStart(3)} questions, ` +
                       `${totalP} parts, ${totalTraces} traces\n`);
  process.stdout.write('\n');
  process.stdout.write(`Errors  : ${errors.length === 0 ? c.green(0) : c.red(errors.length)}\n`);
  process.stdout.write(`Warnings: ${warnings.length === 0 ? c.green(0) : c.yellow(warnings.length)}\n`);
  process.stdout.write(errors.length === 0
    ? `\n${c.green('✓ PASS')} — all IQ data integrity checks passed.\n\n`
    : `\n${c.red('✘ FAIL')} — fix the errors above before committing.\n\n`);
}

process.exit(errors.length > 0 ? 1 : 0);
