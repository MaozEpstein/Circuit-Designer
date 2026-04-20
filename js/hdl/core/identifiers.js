// Verilog identifier sanitizer, shared across the IR pipeline.

const VERILOG_KEYWORDS = new Set([
  'always','and','assign','begin','buf','bufif0','bufif1','case','casex','casez',
  'cmos','deassign','default','defparam','disable','edge','else','end','endcase',
  'endfunction','endmodule','endprimitive','endspecify','endtable','endtask','event',
  'for','force','forever','fork','function','highz0','highz1','if','ifnone','initial',
  'inout','input','integer','join','large','macromodule','medium','module','nand',
  'negedge','nmos','nor','not','notif0','notif1','or','output','parameter','pmos',
  'posedge','primitive','pull0','pull1','pulldown','pullup','rcmos','real','realtime',
  'reg','release','repeat','rnmos','rpmos','rtran','rtranif0','rtranif1','scalared',
  'small','specify','specparam','strong0','strong1','supply0','supply1','table','task',
  'time','tran','tranif0','tranif1','tri','tri0','tri1','triand','trior','trireg',
  'vectored','wait','wand','weak0','weak1','while','wire','wor','xnor','xor',
]);

export function sanitizeIdentifier(raw, fallback = 'n') {
  let s = String(raw ?? '').trim();
  if (!s) return fallback;
  s = s.replace(/[^A-Za-z0-9_]/g, '_');
  if (/^[0-9]/.test(s)) s = '_' + s;
  if (VERILOG_KEYWORDS.has(s)) s = s + '_';
  return s;
}

// Returns a unique sanitised identifier derived from `base`, never colliding
// with anything already in `used`. Mutates `used` by adding the result.
export function uniqueIdentifier(base, used, fallback = 'n') {
  const clean = sanitizeIdentifier(base, fallback);
  let name = clean;
  let i = 1;
  while (used.has(name)) name = `${clean}_${i++}`;
  used.add(name);
  return name;
}

export function isVerilogKeyword(word) {
  return VERILOG_KEYWORDS.has(word);
}
