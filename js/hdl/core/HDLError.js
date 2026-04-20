// HDLError — single error shape used across parser, elaborator, translators,
// and validator. Compatible-by-subset with ErrorOverlay's diagnostic shape
// ({ nodeId, severity, message }), so circuit-origin HDL errors render in the
// existing overlay without adapter code.

import { SourceRef, formatSourceRef } from './SourceRef.js';

export const SEVERITY = Object.freeze({
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
});

// Code namespaces: HDL_PARSE_*, HDL_ELAB_*, HDL_EXPORT_*, HDL_VALIDATE_*.
export class HDLError extends Error {
  constructor({
    severity = SEVERITY.ERROR,
    code,
    sourceRef = SourceRef.unknown(),
    message,
    hint = null,
    relatedRanges = [],
  }) {
    super(message);
    this.name = 'HDLError';
    this.severity = severity;
    this.code = code || 'HDL_UNKNOWN';
    this.sourceRef = sourceRef;
    this.message = message;
    this.hint = hint;
    this.relatedRanges = relatedRanges;
    // ErrorOverlay compatibility: lift nodeId to top level.
    this.nodeId = sourceRef?.nodeId ?? null;
  }

  toString() {
    const loc = formatSourceRef(this.sourceRef);
    const base = `[${this.severity}] ${this.code} at ${loc}: ${this.message}`;
    return this.hint ? `${base}\n  hint: ${this.hint}` : base;
  }
}

export function hdlError(code, message, opts = {}) {
  return new HDLError({ code, message, ...opts });
}

export function hdlWarn(code, message, opts = {}) {
  return new HDLError({ code, message, severity: SEVERITY.WARNING, ...opts });
}
