/**
 * CellLibrary — Standard cell metadata for synthesis.
 * Inspired by 28nm CMOS libraries (Synopsys SAED, NanGate).
 * Area in µm², drive strength X1 by default.
 */

const CELL_TABLE = {
  // ── Combinational primitive gates ──
  AND:        { cellName: 'AND2X1',  fn: 'Y = A & B',         areaUm2: 1.40, pinCount: 3, category: 'combinational' },
  OR:         { cellName: 'OR2X1',   fn: 'Y = A | B',         areaUm2: 1.40, pinCount: 3, category: 'combinational' },
  NOT:        { cellName: 'INVX1',   fn: 'Y = !A',            areaUm2: 0.70, pinCount: 2, category: 'combinational' },
  BUF:        { cellName: 'BUFX1',   fn: 'Y = A',             areaUm2: 0.84, pinCount: 2, category: 'combinational' },
  NAND:       { cellName: 'NAND2X1', fn: 'Y = !(A & B)',      areaUm2: 1.12, pinCount: 3, category: 'combinational' },
  NOR:        { cellName: 'NOR2X1',  fn: 'Y = !(A | B)',      areaUm2: 1.12, pinCount: 3, category: 'combinational' },
  XOR:        { cellName: 'XOR2X1',  fn: 'Y = A ^ B',         areaUm2: 2.52, pinCount: 3, category: 'combinational' },
  XNOR:       { cellName: 'XNOR2X1', fn: 'Y = !(A ^ B)',      areaUm2: 2.52, pinCount: 3, category: 'combinational' },

  // ── Sequential elements ──
  FF_SLOT:    { cellName: 'DFFX1',   fn: 'Q <= D @posedge CLK', areaUm2: 4.48, pinCount: 4, category: 'sequential' },
  FLIPFLOP_D: { cellName: 'DFFX1',   fn: 'Q <= D @posedge CLK', areaUm2: 4.48, pinCount: 4, category: 'sequential' },
  FLIPFLOP_T: { cellName: 'TFFX1',   fn: 'Q <= Q^T @posedge CLK', areaUm2: 5.04, pinCount: 4, category: 'sequential' },
  FLIPFLOP_JK:{ cellName: 'JKFFX1',  fn: 'Q <= JK fn @posedge CLK', areaUm2: 5.32, pinCount: 5, category: 'sequential' },
  FLIPFLOP_SR:{ cellName: 'SRFFX1',  fn: 'Q <= SR fn @posedge CLK', areaUm2: 5.04, pinCount: 5, category: 'sequential' },
  SCAN_FF:    { cellName: 'SDFFX1',  fn: 'D | TI on TE',      areaUm2: 5.18, pinCount: 6, category: 'sequential' },
  LATCH_SLOT: { cellName: 'DLATX1',  fn: 'Q follows D when EN', areaUm2: 2.80, pinCount: 3, category: 'sequential' },

  // ── Complex combinational ──
  MUX:        { cellName: 'MUX2X1',  fn: 'Y = SEL ? B : A',   areaUm2: 2.24, pinCount: 4, category: 'complex' },
  DEMUX:      { cellName: 'DEMUX2X1',fn: 'A/B = SEL ? Y : 0', areaUm2: 2.24, pinCount: 4, category: 'complex' },
  BUS_MUX:    { cellName: 'BMUXX1',  fn: 'wide MUX',          areaUm2: 3.50, pinCount: 4, category: 'complex' },
  HALF_ADDER: { cellName: 'HAX1',    fn: 'S, C = A + B',      areaUm2: 3.08, pinCount: 4, category: 'complex' },
  FULL_ADDER: { cellName: 'FAX1',    fn: 'S, Co = A + B + Ci', areaUm2: 4.76, pinCount: 5, category: 'complex' },
  COMPARATOR: { cellName: 'CMPX1',   fn: 'A == B / A < B',    areaUm2: 6.50, pinCount: 5, category: 'complex' },
  DECODER:    { cellName: 'DECX1',   fn: 'one-hot from binary', areaUm2: 4.20, pinCount: 6, category: 'complex' },
  ENCODER:    { cellName: 'ENCX1',   fn: 'binary from one-hot', areaUm2: 3.80, pinCount: 6, category: 'complex' },
  SIGN_EXT:   { cellName: 'SEXTX1',  fn: 'sign-extend bus',   areaUm2: 1.20, pinCount: 2, category: 'complex' },
  SPLIT:      { cellName: 'SPLITX1', fn: 'bus split',         areaUm2: 0.50, pinCount: 2, category: 'complex' },
  MERGE:      { cellName: 'MRGX1',   fn: 'bus merge',         areaUm2: 0.50, pinCount: 2, category: 'complex' },

  // ── Pipeline / control logic clusters ──
  ALU:        { cellName: 'ALU_CL',  fn: 'ADD/SUB/AND/OR/...', areaUm2: 42.00, pinCount: 8,  category: 'complex' },
  CU:         { cellName: 'CU_CL',   fn: 'control unit',       areaUm2: 18.00, pinCount: 10, category: 'complex' },
  HDU:        { cellName: 'HDU_CL',  fn: 'hazard detection',   areaUm2:  8.50, pinCount: 6,  category: 'complex' },
  FWD:        { cellName: 'FWD_CL',  fn: 'forwarding unit',    areaUm2: 10.00, pinCount: 6,  category: 'complex' },
  HANDSHAKE:  { cellName: 'HSX1',    fn: 'valid/ready hs',     areaUm2:  2.10, pinCount: 4,  category: 'complex' },

  // ── Memory / macros (area scales with capacity if available) ──
  REGISTER:   { cellName: 'REG_M',   fn: 'multi-bit register', areaUm2: 12.0, pinCount: 4, category: 'sequential', isMacro: true },
  SHIFT_REG:  { cellName: 'SREG_M',  fn: 'shift register',     areaUm2: 14.0, pinCount: 4, category: 'sequential', isMacro: true },
  COUNTER:    { cellName: 'CNTR_M',  fn: 'binary counter',     areaUm2: 16.0, pinCount: 4, category: 'sequential', isMacro: true },
  PIPE_REG:   { cellName: 'PREG_M',  fn: 'pipeline register',  areaUm2: 12.0, pinCount: 5, category: 'sequential', isMacro: true },
  RAM:        { cellName: 'RAM_M',   fn: 'SRAM macro',         areaUm2: 80.0, pinCount: 6, category: 'special',    isMacro: true },
  ROM:        { cellName: 'ROM_M',   fn: 'ROM macro',          areaUm2: 60.0, pinCount: 5, category: 'special',    isMacro: true },
  CACHE:      { cellName: 'CACHE_M', fn: 'cache macro',        areaUm2: 120.0,pinCount: 8, category: 'special',    isMacro: true },
  REG_FILE:   { cellName: 'RF_M',    fn: 'register file',      areaUm2: 45.0, pinCount: 6, category: 'sequential', isMacro: true },
  REG_FILE_DP:{ cellName: 'RFDP_M',  fn: 'dual-port reg file', areaUm2: 65.0, pinCount: 8, category: 'sequential', isMacro: true },
  FIFO:       { cellName: 'FIFO_M',  fn: 'FIFO macro',         areaUm2: 35.0, pinCount: 6, category: 'sequential', isMacro: true },
  STACK:      { cellName: 'STK_M',   fn: 'stack macro',        areaUm2: 30.0, pinCount: 5, category: 'sequential', isMacro: true },
  PC:         { cellName: 'PC_M',    fn: 'program counter',    areaUm2: 14.0, pinCount: 4, category: 'sequential', isMacro: true },
  IR:         { cellName: 'IR_M',    fn: 'instruction reg',    areaUm2: 14.0, pinCount: 4, category: 'sequential', isMacro: true },
  LFSR:       { cellName: 'LFSR_M',  fn: 'linear feedback SR', areaUm2: 16.0, pinCount: 4, category: 'sequential', isMacro: true },
  MISR:       { cellName: 'MISR_M',  fn: 'multi-input SR',     areaUm2: 18.0, pinCount: 5, category: 'sequential', isMacro: true },

  // ── I/O & clock boundaries (zero area — not real cells) ──
  INPUT:      { cellName: '<input>',  fn: 'primary input',   areaUm2: 0, pinCount: 1, category: 'io' },
  OUTPUT:     { cellName: '<output>', fn: 'primary output',  areaUm2: 0, pinCount: 1, category: 'io' },
  CLOCK:      { cellName: '<clock>',  fn: 'clock source',    areaUm2: 0, pinCount: 1, category: 'io' },
  IMM:        { cellName: '<const>',  fn: 'constant value',  areaUm2: 0, pinCount: 1, category: 'io' },
  BUS:        { cellName: 'BUS',      fn: 'bus driver',      areaUm2: 0.32, pinCount: 2, category: 'combinational' },
  MUX_SELECT: { cellName: '<sel>',    fn: 'mux select',      areaUm2: 0, pinCount: 1, category: 'io' },
  DISPLAY_7SEG: { cellName: '<disp>', fn: '7-segment display', areaUm2: 0, pinCount: 7, category: 'io' },
  SUB_CIRCUIT:{ cellName: 'SUB_CKT',  fn: 'hierarchical block', areaUm2: 20.0, pinCount: 4, category: 'complex' },
};

const UNMAPPED = {
  cellName: 'UNMAPPED', fn: '?', areaUm2: 5.0, pinCount: 2, category: 'combinational',
};

// Runtime overlay: user-added generic mappings for types not in CELL_TABLE.
// Lets the Signoff "Fix" button resolve DRC-unmapped without editing the
// static library (mirrors a real flow: add a cell to the library).
const _overlay = {};

/** Register a generic standard cell for each given node-type (idempotent). */
export function registerGenericCells(types) {
  for (const t of types || []) {
    if (!t || CELL_TABLE[t] || _overlay[t]) continue;
    _overlay[t] = {
      cellName: ('GEN_' + String(t).replace(/[^A-Za-z0-9]/g, '')).slice(0, 12),
      fn: 'generic mapped cell', areaUm2: 5.0, pinCount: 4,
      category: 'combinational', generic: true,
    };
  }
}

/**
 * Return the standard-cell mapping for a circuit node.
 * For GATE_SLOT nodes, dispatches by node.gate (AND/OR/NOT/etc).
 */
export function cellFor(node) {
  if (!node) return UNMAPPED;
  if (node.type === 'GATE_SLOT' && node.gate && CELL_TABLE[node.gate]) {
    return CELL_TABLE[node.gate];
  }
  return CELL_TABLE[node.type] || _overlay[node.type] || UNMAPPED;
}

/** True when this node represents real silicon (not an I/O boundary or const). */
export function isPhysicalCell(node) {
  const c = cellFor(node);
  return c.category !== 'io';
}

export { CELL_TABLE, UNMAPPED };
