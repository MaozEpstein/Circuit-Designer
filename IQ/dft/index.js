/**
 * IQ — DFT questions. See IQ/README.md and IQ/timing-cdc/index.js for the
 * shape. Add entries to QUESTIONS and they appear in the panel automatically.
 */

import { build, h } from '../../js/interview/circuitHelpers.js';

const LFSR4_SVG = `
<svg viewBox="0 0 560 260" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono', monospace" font-size="16" role="img" aria-label="4-bit Fibonacci LFSR with taps 3,0">
  <text x="280" y="20" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="18">4-bit Fibonacci LFSR — taps [3,0]</text>
  <text x="280" y="38" text-anchor="middle" fill="#c8d8f0" font-size="16">x⁴ + x + 1  (primitive, period 15)</text>

  <!-- 4 FFs in a row (left = high bit = b3, right = low = b0) -->
  <g stroke="#80b0e0" stroke-width="1.6" fill="#0a1520">
    <rect x="80"  y="100" width="60" height="60"/>
    <rect x="180" y="100" width="60" height="60"/>
    <rect x="280" y="100" width="60" height="60"/>
    <rect x="380" y="100" width="60" height="60"/>
  </g>
  <g fill="#c8d8f0" text-anchor="middle" font-size="16">
    <text x="110" y="135">b3</text>
    <text x="210" y="135">b2</text>
    <text x="310" y="135">b1</text>
    <text x="410" y="135">b0</text>
  </g>
  <g fill="#80b0e0" text-anchor="middle" font-size="16">
    <text x="110" y="178">FF3</text>
    <text x="210" y="178">FF2</text>
    <text x="310" y="178">FF1</text>
    <text x="410" y="178">FF0</text>
  </g>

  <!-- Shift connections: b3 ← b2, b2 ← b1, b1 ← b0 -->
  <path d="M 240 130 L 280 130" stroke="#c8d8f0" fill="none" marker-end="url(#l-arr)"/>
  <path d="M 340 130 L 380 130" stroke="#c8d8f0" fill="none" marker-end="url(#l-arr)"/>
  <path d="M 140 130 L 180 130" stroke="#c8d8f0" fill="none" marker-end="url(#l-arr)"/>

  <!-- Feedback XOR: taps are b3 (high) and b0 (low) -->
  <circle cx="40" cy="220" r="14" fill="#0a1520" stroke="#ffb878" stroke-width="1.8"/>
  <text x="40" y="225" text-anchor="middle" fill="#ffb878" font-weight="bold" font-size="18">⊕</text>
  <text x="40" y="248" text-anchor="middle" fill="#ffb878" font-size="16">XOR</text>

  <!-- b3 → XOR (top tap) -->
  <path d="M 110 160 L 110 200 L 54 200 L 54 214" stroke="#80f0a0" fill="none" stroke-width="1.3" marker-end="url(#l-arr-g)"/>
  <text x="78" y="195" fill="#80f0a0" font-size="16">tap b3</text>
  <!-- b0 → XOR (bottom tap) -->
  <path d="M 410 160 L 410 230 L 54 230 L 54 226" stroke="#80f0a0" fill="none" stroke-width="1.3" marker-end="url(#l-arr-g)"/>
  <text x="240" y="245" fill="#80f0a0" font-size="16">tap b0</text>

  <!-- XOR → b3.D -->
  <path d="M 40 206 L 40 75 L 110 75 L 110 100" stroke="#ffb878" fill="none" stroke-width="1.5" marker-end="url(#l-arr-o)"/>
  <text x="75" y="70" fill="#ffb878" font-size="16" font-weight="bold">new bit</text>

  <!-- Serial Q output = b3 -->
  <path d="M 440 130 L 510 130" stroke="#80c8ff" stroke-width="1.8" marker-end="url(#l-arr-b)"/>
  <text x="475" y="124" text-anchor="middle" fill="#80c8ff" font-weight="bold" font-size="16">Q</text>
  <text x="475" y="147" text-anchor="middle" fill="#80c8ff" font-size="16">(serial out = b3)</text>

  <defs>
    <marker id="l-arr"   viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#c8d8f0"/></marker>
    <marker id="l-arr-g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#80f0a0"/></marker>
    <marker id="l-arr-o" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#ffb878"/></marker>
    <marker id="l-arr-b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#80c8ff"/></marker>
  </defs>
</svg>
`;

const MISR4_SVG = `
<svg viewBox="0 0 760 560" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono', monospace" font-size="16" role="img" aria-label="4-bit MISR — gate-level (4 D-FFs + 5 XORs)">
  <text x="380" y="22" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="18">4-bit MISR — gate-level (4 D-FFs + 5 XORs)</text>
  <text x="380" y="40" text-anchor="middle" fill="#c8d8f0" font-size="16">per-cell XOR mixes D[i] with the shifted bit; feedback XOR closes the loop (taps [3,0])</text>

  <!-- Column x centres -->
  <!-- col0 (LSB FF0): 110 | col1 (FF1): 290 | col2 (FF2): 470 | col3 (MSB FF3): 650 -->

  <!-- D inputs (green pads at top) -->
  <g>
    <circle cx="110" cy="80" r="15" fill="#0a2018" stroke="#80f0a0" stroke-width="1.8"/>
    <text x="110" y="84" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="16">D0</text>
    <circle cx="290" cy="80" r="15" fill="#0a2018" stroke="#80f0a0" stroke-width="1.8"/>
    <text x="290" y="84" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="16">D1</text>
    <circle cx="470" cy="80" r="15" fill="#0a2018" stroke="#80f0a0" stroke-width="1.8"/>
    <text x="470" y="84" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="16">D2</text>
    <circle cx="650" cy="80" r="15" fill="#0a2018" stroke="#80f0a0" stroke-width="1.8"/>
    <text x="650" y="84" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="16">D3</text>
  </g>

  <!-- D inputs drop wires -->
  <g stroke="#80f0a0" stroke-width="1.4" fill="none">
    <path d="M 110  95 L 110 175"/>
    <path d="M 290  95 L 290 175"/>
    <path d="M 470  95 L 470 175"/>
    <path d="M 650  95 L 650 175"/>
  </g>

  <!-- Per-cell XORs (block style, like the canvas) -->
  <g>
    <rect x="80"  y="175" width="60" height="36" rx="3" fill="#0a1520" stroke="#ffb878" stroke-width="1.8"/>
    <text x="110" y="195" text-anchor="middle" fill="#ffb878" font-weight="bold" font-size="16">XOR</text>
    <text x="110" y="208" text-anchor="middle" fill="#ffb878" font-size="16">▷ 0</text>

    <rect x="260" y="175" width="60" height="36" rx="3" fill="#0a1520" stroke="#ffb878" stroke-width="1.8"/>
    <text x="290" y="195" text-anchor="middle" fill="#ffb878" font-weight="bold" font-size="16">XOR</text>
    <text x="290" y="208" text-anchor="middle" fill="#ffb878" font-size="16">▷ 0</text>

    <rect x="440" y="175" width="60" height="36" rx="3" fill="#0a1520" stroke="#ffb878" stroke-width="1.8"/>
    <text x="470" y="195" text-anchor="middle" fill="#ffb878" font-weight="bold" font-size="16">XOR</text>
    <text x="470" y="208" text-anchor="middle" fill="#ffb878" font-size="16">▷ 0</text>

    <rect x="620" y="175" width="60" height="36" rx="3" fill="#0a1520" stroke="#ffb878" stroke-width="1.8"/>
    <text x="650" y="195" text-anchor="middle" fill="#ffb878" font-weight="bold" font-size="16">XOR</text>
    <text x="650" y="208" text-anchor="middle" fill="#ffb878" font-size="16">▷ 0</text>
  </g>

  <!-- XOR → FF D wires -->
  <g stroke="#ffb878" stroke-width="1.4" fill="none">
    <path d="M 110 211 L 110 260"/>
    <path d="M 290 211 L 290 260"/>
    <path d="M 470 211 L 470 260"/>
    <path d="M 650 211 L 650 260"/>
  </g>

  <!-- 4 D-FFs (block style) -->
  <g>
    <rect x="70"  y="260" width="80" height="70" rx="4" fill="#0a1520" stroke="#80b0e0" stroke-width="1.8"/>
    <text x="110" y="285" text-anchor="middle" fill="#c8d8f0" font-weight="bold" font-size="18">D</text>
    <text x="110" y="304" text-anchor="middle" fill="#80b0e0" font-size="16">FF0 (LSB)</text>
    <text x="138" y="278" text-anchor="end" fill="#c8d8f0" font-size="16">Q</text>
    <path d="M 75 320 L 84 314 L 75 308 z" fill="#80c8ff"/>

    <rect x="250" y="260" width="80" height="70" rx="4" fill="#0a1520" stroke="#80b0e0" stroke-width="1.8"/>
    <text x="290" y="285" text-anchor="middle" fill="#c8d8f0" font-weight="bold" font-size="18">D</text>
    <text x="290" y="304" text-anchor="middle" fill="#80b0e0" font-size="16">FF1</text>
    <text x="318" y="278" text-anchor="end" fill="#c8d8f0" font-size="16">Q</text>
    <path d="M 255 320 L 264 314 L 255 308 z" fill="#80c8ff"/>

    <rect x="430" y="260" width="80" height="70" rx="4" fill="#0a1520" stroke="#80b0e0" stroke-width="1.8"/>
    <text x="470" y="285" text-anchor="middle" fill="#c8d8f0" font-weight="bold" font-size="18">D</text>
    <text x="470" y="304" text-anchor="middle" fill="#80b0e0" font-size="16">FF2</text>
    <text x="498" y="278" text-anchor="end" fill="#c8d8f0" font-size="16">Q</text>
    <path d="M 435 320 L 444 314 L 435 308 z" fill="#80c8ff"/>

    <rect x="610" y="260" width="80" height="70" rx="4" fill="#0a1520" stroke="#80b0e0" stroke-width="1.8"/>
    <text x="650" y="285" text-anchor="middle" fill="#c8d8f0" font-weight="bold" font-size="18">D</text>
    <text x="650" y="304" text-anchor="middle" fill="#80b0e0" font-size="16">FF3 (MSB)</text>
    <text x="678" y="278" text-anchor="end" fill="#c8d8f0" font-size="16">Q</text>
    <path d="M 615 320 L 624 314 L 615 308 z" fill="#80c8ff"/>
  </g>

  <!-- CLK bus (cyan dashed, shared across all FFs) -->
  <g>
    <path d="M 40 350 L 720 350" stroke="#22ccff" stroke-width="1.4" stroke-dasharray="6 3" fill="none"/>
    <text x="20" y="354" fill="#22ccff" font-weight="bold" font-size="16">clk</text>
    <path d="M 110 350 L 110 320" stroke="#22ccff" stroke-width="1.4" stroke-dasharray="6 3" fill="none"/>
    <path d="M 290 350 L 290 320" stroke="#22ccff" stroke-width="1.4" stroke-dasharray="6 3" fill="none"/>
    <path d="M 470 350 L 470 320" stroke="#22ccff" stroke-width="1.4" stroke-dasharray="6 3" fill="none"/>
    <path d="M 650 350 L 650 320" stroke="#22ccff" stroke-width="1.4" stroke-dasharray="6 3" fill="none"/>
  </g>

  <!-- SIG output pads (red, like the canvas) -->
  <g>
    <text x="110" y="380" text-anchor="middle" fill="#80c8ff" font-size="16" font-weight="bold">SIG[0]</text>
    <circle cx="110" cy="405" r="18" fill="#2a0a14" stroke="#80c8ff" stroke-width="1.5"/>
    <text x="290" y="380" text-anchor="middle" fill="#80c8ff" font-size="16" font-weight="bold">SIG[1]</text>
    <circle cx="290" cy="405" r="18" fill="#2a0a14" stroke="#80c8ff" stroke-width="1.5"/>
    <text x="470" y="380" text-anchor="middle" fill="#80c8ff" font-size="16" font-weight="bold">SIG[2]</text>
    <circle cx="470" cy="405" r="18" fill="#2a0a14" stroke="#80c8ff" stroke-width="1.5"/>
    <text x="650" y="380" text-anchor="middle" fill="#80c8ff" font-size="16" font-weight="bold">SIG[3]</text>
    <circle cx="650" cy="405" r="18" fill="#2a0a14" stroke="#80c8ff" stroke-width="1.5"/>
  </g>
  <!-- FF.Q → SIG pad -->
  <g stroke="#80c8ff" stroke-width="1.4" fill="none">
    <path d="M 110 330 L 110 387"/>
    <path d="M 290 330 L 290 387"/>
    <path d="M 470 330 L 470 387"/>
    <path d="M 650 330 L 650 387"/>
  </g>

  <!-- Shift chain: FF_{i-1}.Q → XOR_i.in0 (white wires) -->
  <g stroke="#c8d8f0" stroke-width="1.4" fill="none">
    <!-- FF0.Q → XOR1.in0 -->
    <path d="M 140 290 L 220 290 L 220 192 L 260 192" marker-end="url(#mm-arr)"/>
    <!-- FF1.Q → XOR2.in0 -->
    <path d="M 320 290 L 400 290 L 400 192 L 440 192" marker-end="url(#mm-arr)"/>
    <!-- FF2.Q → XOR3.in0 -->
    <path d="M 500 290 L 580 290 L 580 192 L 620 192" marker-end="url(#mm-arr)"/>
  </g>

  <!-- Feedback XOR (bottom) — taps [3,0] -->
  <g>
    <rect x="320" y="480" width="80" height="36" rx="3" fill="#0a1520" stroke="#39ff80" stroke-width="2"/>
    <text x="360" y="500" text-anchor="middle" fill="#39ff80" font-weight="bold" font-size="16">XOR</text>
    <text x="360" y="513" text-anchor="middle" fill="#39ff80" font-size="16">▷ FB</text>
  </g>

  <!-- FF0.Q → FB (lower tap) -->
  <g stroke="#39ff80" stroke-width="1.4" fill="none">
    <path d="M 140 320 L 140 450 L 340 450 L 340 480" marker-end="url(#mm-arr-g)"/>
  </g>
  <!-- FF3.Q → FB (upper tap, longer path) -->
  <g stroke="#39ff80" stroke-width="1.4" fill="none">
    <path d="M 680 320 L 700 320 L 700 470 L 380 470 L 380 480" marker-end="url(#mm-arr-g)"/>
  </g>

  <!-- FB → XOR0.in0 (long path up the left side, into FF0's XOR top-left) -->
  <g stroke="#39ff80" stroke-width="1.4" fill="none">
    <path d="M 360 516 L 360 530 L 40 530 L 40 192 L 80 192" marker-end="url(#mm-arr-g)"/>
  </g>

  <!-- Labels -->
  <text x="220" y="282" fill="#c8d8f0" font-size="16">shift</text>
  <text x="400" y="282" fill="#c8d8f0" font-size="16">shift</text>
  <text x="580" y="282" fill="#c8d8f0" font-size="16">shift</text>
  <text x="370" y="540" fill="#39ff80" font-size="16" text-anchor="middle">feedback (FF3.Q ⊕ FF0.Q) → FF0's XOR</text>

  <defs>
    <marker id="mm-arr"   viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#c8d8f0"/></marker>
    <marker id="mm-arr-g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#39ff80"/></marker>
  </defs>
</svg>
`;

// Shared circuit builder for #6008 parts א and ב.
// 4 Scan-FFs in a chain. SE / SI / CLK common, SO out of FF4.
// Each FF has its own functional D pad (default 0 — matches the
// question text). Defaults: SE=1, SI=1 so the very first CLK edge
// shifts a 1 into FF1 and the student sees motion immediately.
function buildScanChainDemo() {
  return build(() => {
    const clk  = h.clock(80, 600);
    const seIn = h.input(80, 480, 'SE');  seIn.fixedValue = 1;
    const siIn = h.input(80, 120, 'SI');  siIn.fixedValue = 1;

    const d1 = h.input(220, 320, 'D1');  d1.fixedValue = 0;
    const d2 = h.input(420, 320, 'D2');  d2.fixedValue = 0;
    const d3 = h.input(620, 320, 'D3');  d3.fixedValue = 0;
    const d4 = h.input(820, 320, 'D4');  d4.fixedValue = 0;

    const ff1 = h.block('SCAN_FF', 280, 180, { label: 'FF1', initialQ: 0 });
    const ff2 = h.block('SCAN_FF', 480, 180, { label: 'FF2', initialQ: 0 });
    const ff3 = h.block('SCAN_FF', 680, 180, { label: 'FF3', initialQ: 0 });
    const ff4 = h.block('SCAN_FF', 880, 180, { label: 'FF4', initialQ: 0 });

    const soOut = h.output(1060, 180, 'SO');
    const q1 = h.output(280, 60, 'Q1');
    const q2 = h.output(480, 60, 'Q2');
    const q3 = h.output(680, 60, 'Q3');
    const q4 = h.output(880, 60, 'Q4');

    return {
      nodes: [clk, seIn, siIn, d1, d2, d3, d4, ff1, ff2, ff3, ff4, soOut, q1, q2, q3, q4],
      wires: [
        h.wire(d1.id, ff1.id, 0),
        h.wire(d2.id, ff2.id, 0),
        h.wire(d3.id, ff3.id, 0),
        h.wire(d4.id, ff4.id, 0),
        h.wire(siIn.id, ff1.id, 1),
        h.wire(ff1.id,  ff2.id, 1),
        h.wire(ff2.id,  ff3.id, 1),
        h.wire(ff3.id,  ff4.id, 1),
        h.wire(seIn.id, ff1.id, 2),
        h.wire(seIn.id, ff2.id, 2),
        h.wire(seIn.id, ff3.id, 2),
        h.wire(seIn.id, ff4.id, 2),
        h.wire(clk.id, ff1.id, 3, 0, { isClockWire: true }),
        h.wire(clk.id, ff2.id, 3, 0, { isClockWire: true }),
        h.wire(clk.id, ff3.id, 3, 0, { isClockWire: true }),
        h.wire(clk.id, ff4.id, 3, 0, { isClockWire: true }),
        h.wire(ff4.id, soOut.id, 0),
        h.wire(ff1.id, q1.id, 0),
        h.wire(ff2.id, q2.id, 0),
        h.wire(ff3.id, q3.id, 0),
        h.wire(ff4.id, q4.id, 0),
      ],
    };
  });
}

export const QUESTIONS = [
  // ─────────────────────────────────────────────────────────────
  // #6001 — LFSR design (Fibonacci, 4-bit, primitive polynomial)
  // ─────────────────────────────────────────────────────────────
  {
    id: 'lfsr-fibonacci-4bit',
    difficulty: 'medium',
    title: 'בנה LFSR 4-bit (Fibonacci, taps [3,0])',
    intro:
`**Linear-Feedback Shift Register** — לב הלב של pseudo-random pattern generation ל-BIST. עליך לבנות LFSR Fibonacci ברוחב 4 ביטים עם taps בעמדות 3 ו-0 (פולינום \`x⁴ + x + 1\`), ולנתח את התנהגותו.`,
    parts: [
      {
        label: 'א',
        question: 'תכן את ה-LFSR — בלוקים, חיווט, וביטוי next-state.',
        hints: [
          '4 D-FFs בשרשרת — b3 (MSB) → b2 → b1 → b0 (LSB).',
          'כל cycle: כל FF מקבל את ערך השכן (shift), פרט ל-FF הגבוה (b3) שמקבל את פלט ה-XOR של ה-taps.',
          'XOR feedback: `new_bit = b3 ⊕ b0` (taps [3,0]).',
          'next state: `{b2, b1, b0, new_bit}` — או אקוויוולנטית: \`(state << 1) | XOR(taps)\` עם mask של 4-bit.',
          'הזרע (seed) מאותחל פעם אחת — לעולם לא 0.',
        ],
        answer:
`**שרשרת shift 4-bit + XOR לחזרה:**

\`\`\`
b3 ← (b3 ⊕ b0)      // ה-tap feedback נכנס לקצה הגבוה
b2 ← b3              // shift left
b1 ← b2
b0 ← b1
\`\`\`

ב-Fibonacci form, כל ה-taps מצורפים ב-XOR יחיד שמזין את הקצה הגבוה. ה-state אחרי cycle: \`{old_b2, old_b1, old_b0, old_b3 ⊕ old_b0}\`.

**רכיבים:** 4 D-FFs (קולטים על posedge clk) + שער XOR יחיד. סה"כ ~5 רכיבים.

**הפלט הסדרתי \`Q\`** הוא ה-MSB (b3) — הביט שיוצא מהקצה ונכנס ל-XOR. גוף הרגיסטר עצמו זמין כפלט מקבילי.`,
        schematic: LFSR4_SVG,
        interviewerMindset:
`רוצה לראות שאתה מבחין בין ה-FFs לבין ה-XOR, ושאתה יודע איזה ביט הולך לאיזה.

**מקפיץ לטובה:**
- לציין שזה Fibonacci form ולהזכיר שיש גם Galois (פיזיקה זהה, מבנה שונה — ראה סעיף ד׳).
- לכתוב את ה-Verilog ב-non-blocking (\`<=\`) ב-always block — מי שכותב blocking יוצר race.
- להזכיר שה-seed מוגדר ב-\`initial\` או דרך reset, לא בכל cycle.`,
        expectedAnswers: [
          '4', 'four', 'ארבעה',
          'xor', '⊕', 'feedback',
          'b3', 'b0', 'msb', 'lsb',
          'shift', 'fibonacci',
          'seed', 'זרע',
        ],
      },
      {
        label: 'ב',
        editor: 'verilog',
        question: 'ממש ב-Verilog. תמיכה ב-reset אסינכרוני אקטיב-נמוך, רוחב פרמטרי.',
        starterCode:
`module lfsr #(
    parameter N = 4,
    parameter SEED = 4'h1    // never 0!
) (
    input  wire         clk,
    input  wire         rst_n,
    output wire [N-1:0] state,
    output wire         q       // serial output (MSB)
);
    // TODO: declare state register

    // TODO: clocked block — async-reset to SEED, else shift+XOR feedback

    // TODO: drive outputs

endmodule
`,
        hints: [
          'משתנה state ברוחב N-bit, מוצהר כ-`reg`.',
          'always @(posedge clk or negedge rst_n) — non-blocking assignments.',
          'next-state בתוך ה-always: `state <= {state[N-2:0], state[N-1] ^ state[0]};` — `^` ב-Verilog הוא XOR.',
          '`q = state[N-1]` (MSB) דרך `assign`.',
        ],
        answer:
`\`\`\`verilog
module lfsr #(
    parameter N = 4,
    parameter SEED = 4'h1
) (
    input  wire         clk,
    input  wire         rst_n,
    output wire [N-1:0] state,
    output wire         q
);
    reg [N-1:0] r;

    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) r <= SEED;
        else        r <= { r[N-2:0], r[N-1] ^ r[0] };
    end

    assign state = r;
    assign q     = r[N-1];
endmodule
\`\`\`

**מפתח:**
- ה-shift הוא \`{r[N-2:0], new_bit}\` — מצרף את \`new_bit\` כ-LSB.
- \`new_bit = r[N-1] ^ r[0]\` — taps בעמדות 3 ו-0 (עבור N=4).
- non-blocking (\`<=\`) — מבטיח שכל ה-FFs דוגמים את ה-state הישן באותו edge.

עבור פולינומים אחרים: שנה את ביטוי ה-XOR. למשל ל-N=8 פולינום primitive נפוץ: taps [7,5,4,3] → \`r[7] ^ r[5] ^ r[4] ^ r[3]\`.`,
        expectedAnswers: [
          'always', 'posedge', 'negedge', 'rst_n',
          'reg', 'assign',
          '^', 'xor',
          'state[n-1]', 'r[n-1]', 'r[0]',
          '<=', 'non-blocking',
        ],
      },
      {
        label: 'ג',
        question: 'מה התקופה (period) של ה-LFSR הזה? מה קורה כאשר seed=0?',
        hints: [
          'period מקסימלי של N-bit LFSR = `2^N - 1` (מצב 0 חסר).',
          'עבור N=4: period מקסימלי = 15. עם taps primitive (כמו [3,0]) — מגיעים ל-15 בדיוק.',
          'taps לא-primitive נותנים period קצר יותר — הרצף "תקוע" בתת-מחזור.',
          'seed=0: כל הביטים אפס → b3⊕b0 = 0 → new_bit = 0 → state נשאר 0 לנצח. **lock state**.',
        ],
        answer:
`**תקופה: 15** (= 2⁴ - 1).

ה-LFSR עובר על כל 15 המצבים הלא-אפסיים מ-0001 עד 1000 ואז חוזר. דוגמה (מתחילים מ-seed=1):

| step | state | b3⊕b0 |
|------|-------|-------|
| 0    | 0001  | 1     |
| 1    | 0011  | 1     |
| 2    | 0111  | 1     |
| 3    | 1111  | 0     |
| 4    | 1110  | 1     |
| ...  | ...   | ...   |
| 14   | 1000  | 1     |
| 15   | 0001  | (חזרה) |

**state=0 = lock**:
\`\`\`
0000 → b3=0, b0=0 → 0⊕0=0 → new=0 → state נשאר 0000
\`\`\`

המצב 0 הוא **fixed point** של ה-LFSR — נכנסת אליו, לא יוצאת. **לכן ה-seed חייב להיות ≠ 0**. בסיליקון מבטיחים את זה ע"י reset שטוען seed קבוע מ-ROM (לרוב 1, או patter פסאודו-יחודי).

**taps לא-primitive** ייתנו תקופה < 15. למשל [2,0] (פולינום x⁴+x²+1 = (x²+x+1)²) — תקופה 6 בלבד. ה-15 דורש **primitive polynomial**, ויש טבלאות סטנדרטיות.`,
        expectedAnswers: [
          '15', 'fifteen', 'חמש-עשרה',
          '2^n - 1', '2**n-1',
          'primitive', 'פרימיטיבי',
          'lock', 'נתקע', 'fixed point',
          'seed', 'זרע',
          'never', 'אסור',
        ],
      },
      {
        label: 'ד',
        question: 'מתי תעדיף Galois LFSR על Fibonacci? מה ההבדל?',
        hints: [
          'Fibonacci: XOR יחיד גדול שמזין את הקצה. Critical path עובר דרך XOR-tree של k כניסות (k = מספר taps).',
          'Galois: כל tap הוא XOR ייעודי בין שני FFs שכנים, מקבל את ה-bit היוצא. Critical path = XOR יחיד בלבד.',
          'התנהגות מתמטית **זהה** (אותו פולינום מינימלי, אותה period).',
          'ב-ASIC עם clock מהיר: Galois עדיף כי f_max גבוה יותר.',
          'בלוגיקה פשוטה / FPGA קטן: Fibonacci פשוט יותר לכתוב ולקרוא.',
        ],
        answer:
`**שתי צורות, אותה פונקציה מתמטית** — אבל מבנה שונה:

**Fibonacci (מה שבנינו):**
- \`new_bit = b3 ⊕ b0 ⊕ ... ⊕ b_k\` (XOR-tree של כל ה-taps)
- Critical path: clk→Q של FF → XOR-tree של k כניסות → D של FF הבא.
- ל-N=4 עם 2 taps זה זול. ל-N=32 עם 4 taps זה XOR-tree של 4 → log₂(4)=2 רמות → 2 גייטים בנתיב.

**Galois (אקוויוולנטי):**
- ה-shift עובר כרגיל, אבל בכל מקום שיש tap, מוסיפים XOR בודד עם ה-MSB שיוצא.
- \`b_i ← b_{i+1} ⊕ (MSB & tap_i)\`
- Critical path: clk→Q → XOR יחיד → D. **קבוע, לא תלוי במספר ה-taps**.

**מתי Galois עדיף:**
- פולינומים עם הרבה taps (8+): Fibonacci נהיה אטי, Galois נשאר מהיר.
- target frequency גבוה: Galois נותן f_max שכמעט שווה לזה של D-FF סטנדרטי.
- CRC-32 / CRC-64 בתעשייה — תמיד Galois.

**מתי Fibonacci עדיף:**
- קריאות הקוד: בולט מה ה-taps. Galois מפזר אותם בין FFs ופחות אינטואיטיבי.
- מעט taps (2-3) ו-frequency צנוע: ההפרש ב-f_max זניח.
- BIST פדגוגי / סימולציה: Fibonacci מתאים יותר להסבר.

**זהות תוצאה:** שתי הצורות מייצרות את אותו סט מצבים בסדר שונה (קשור ב-bit-reversal). ה-period זהה.`,
        interviewerMindset:
`רוצה לשמוע "Critical path קבוע ב-Galois" — זה הטיעון המכריע. מי שאומר רק "Galois מהיר יותר" בלי לנמק, חצי-נקודה.

**נוקאאוט:** להזכיר ש-CRC-32 ב-Ethernet הוא Galois — דוגמה חיה ולא תיאורטית.`,
        expectedAnswers: [
          'galois', 'fibonacci',
          'critical path', 'נתיב קריטי',
          'f_max', 'fmax', 'תדר',
          'crc', 'crc-32', 'crc32',
          'xor', 'shift',
          'taps',
        ],
      },
    ],
    source: 'מאגר ראיונות — DFT classic: pseudo-random pattern generation',
    tags: ['lfsr', 'fibonacci', 'galois', 'shift-register', 'feedback', 'pseudo-random', 'bist', 'dft'],
    circuitRevealsAnswer: true,
    circuit: () => build(() => {
      // Gate-level Fibonacci LFSR — 4 D-FFs + 1 XOR.
      //   Shift LEFT, new_bit at LSB, Q (serial) = MSB.
      //   new_bit = FF3.Q ^ FF0.Q   (taps [3,0])
      //   Seed = 1 → only FF0 starts at Q=1; others at 0.
      const clk = h.clock(60, 220);
      const ff0 = h.ffD(180,  220, 'FF0 (LSB)');  ff0.initialQ = 1;
      const ff1 = h.ffD(360,  220, 'FF1');
      const ff2 = h.ffD(540,  220, 'FF2');
      const ff3 = h.ffD(720,  220, 'FF3 (MSB)');
      const xorFb = h.gate('XOR', 450, 400);
      const qOut = h.output(880, 220, 'Q (serial)');
      const b0Out = h.output(180, 100, 'b0');
      const b1Out = h.output(360, 100, 'b1');
      const b2Out = h.output(540, 100, 'b2');
      const b3Out = h.output(720, 100, 'b3');
      return {
        nodes: [clk, ff0, ff1, ff2, ff3, xorFb, qOut, b0Out, b1Out, b2Out, b3Out],
        wires: [
          // XOR feedback: FF3.Q ^ FF0.Q → FF0.D (new bit lands at LSB)
          h.wire(ff3.id,  xorFb.id, 0),     // FF3.Q → XOR.in0
          h.wire(ff0.id,  xorFb.id, 1),     // FF0.Q → XOR.in1
          h.wire(xorFb.id, ff0.id, 0),      // XOR.out → FF0.D
          // Shift chain LSB→MSB
          h.wire(ff0.id, ff1.id, 0),
          h.wire(ff1.id, ff2.id, 0),
          h.wire(ff2.id, ff3.id, 0),
          // Clock to all 4 FFs (D-FF.CLK = input 1)
          h.wire(clk.id, ff0.id, 1, 0, { isClockWire: true }),
          h.wire(clk.id, ff1.id, 1, 0, { isClockWire: true }),
          h.wire(clk.id, ff2.id, 1, 0, { isClockWire: true }),
          h.wire(clk.id, ff3.id, 1, 0, { isClockWire: true }),
          // Output Q = FF3 (MSB shifts out as the serial bit)
          h.wire(ff3.id, qOut.id, 0),
          // Per-bit observation pads
          h.wire(ff0.id, b0Out.id, 0),
          h.wire(ff1.id, b1Out.id, 0),
          h.wire(ff2.id, b2Out.id, 0),
          h.wire(ff3.id, b3Out.id, 0),
        ],
      };
    }),
  },

  // ─────────────────────────────────────────────────────────────
  // #6002 — MISR signature compaction
  // ─────────────────────────────────────────────────────────────
  {
    id: 'misr-signature-compactor',
    difficulty: 'medium',
    title: 'בנה MISR 4-bit — דחיסת תגובות לסיגנטורה',
    intro:
`**Multiple-Input Signature Register** — מה שעושים ב-BIST אחרי שמפעילים את ה-DUT עם דפוסי LFSR. ה-MISR לוקח את ה-N ביטים שיוצאים מה-DUT בכל מחזור ו"דוחס" אותם לתוך אוגר N-bit. הסיגנטורה הסופית מושווית מול ערך גולדן — אם זהה: DUT תקין; אם שונה: יש תקלה.

עליך לבנות MISR ברוחב 4 ביטים ולנתח את חוזק הזיהוי שלו.`,
    parts: [
      {
        label: 'א',
        question: 'מהו השוני המבני בין LFSR ל-MISR? צייר את הלולאה.',
        hints: [
          'LFSR אין לו inputs — רק clk. כל cycle: shift + feedback.',
          'MISR יש N inputs מקבילים (`D[N-1:0]` = תגובת ה-DUT). כל cycle: shift + feedback + XOR עם הקלט המקביל.',
          'הוספת ה-D inputs: `state_next[i] = state_current[i-1] ⊕ D[i]` עבור i > 0; `state_next[0] = (feedback XOR taps) ⊕ D[0]`.',
          'מבחינת פולינום — שניהם מבוססים על אותו x⁴+x+1, אבל ה-MISR מערבב את ה-D עם ה-shift state.',
        ],
        answer:
`**MISR = LFSR + parallel-input XOR בכל cell.**

מבנה (N=4, taps [3,0]):
\`\`\`
b3_next = b2 ⊕ D3
b2_next = b1 ⊕ D2
b1_next = b0 ⊕ D1
b0_next = (b3 ⊕ b0) ⊕ D0      ← XOR feedback + D0
\`\`\`

(טבלת ה-LFSR הייתה זהה, רק בלי ה-D האחרון בכל שורה.)

**רכיבים:** 4 D-FFs + 4 XORs מקבילים (אחד לכל cell) + שער XOR יחיד ל-feedback. ~9 רכיבים.

**הפונקציה:** קלטי ה-DUT שהשתנו בקלט מתערבבים עם המצב הקיים — אחרי K cycles, ה-state הוא פונקציה דחוסה של כל ה-K×N הביטים שעברו.`,
        schematic: MISR4_SVG,
        interviewerMindset:
`מי שמתחיל מ-"זה LFSR עם inputs" קלע נכון. מי שמסביר נכון את ה-XOR-per-cell ולמה זה מקבל את ה-D ולא במקום ה-shift — מקבל ניקוד מלא.

**נוקאאוט:** להזכיר שהשם הפורמלי הוא **Type-II MISR** (יש גם Type-I עם XOR משותף). רוב התעשייה משתמשת ב-Type-II כי הוא compactor יעיל יותר.`,
        expectedAnswers: [
          'misr', 'lfsr',
          'parallel', 'inputs', 'מקבילים',
          'xor', '⊕',
          'shift', 'feedback', 'taps',
          'signature', 'sig',
        ],
      },
      {
        label: 'ב',
        editor: 'verilog',
        question: 'ממש ב-Verilog. רוחב ופולינום פרמטריים, reset לסיד 0.',
        starterCode:
`module misr #(
    parameter N    = 4,
    parameter TAPS = 4'b1001  // bit-mask of taps (here: positions 3,0)
) (
    input  wire         clk,
    input  wire         rst_n,
    input  wire [N-1:0] din,
    output wire [N-1:0] sig
);
    // TODO: state register

    // TODO: clocked block — async-reset to 0, else shift + XOR(taps) + XOR(din)

    // TODO: expose sig

endmodule
`,
        hints: [
          'הזרע של MISR בד"כ 0 (בניגוד ל-LFSR שזה היה lock state) — כי ה-D inputs מספקים entropy.',
          'feedback bit: `^(state & TAPS)` — XOR של כל הביטים ב-state שבעמדות ה-taps.',
          'next-state: `{state[N-2:0], feedback} ^ din` — shift, ואז XOR עם din.',
        ],
        answer:
`\`\`\`verilog
module misr #(
    parameter N    = 4,
    parameter TAPS = 4'b1001
) (
    input  wire         clk,
    input  wire         rst_n,
    input  wire [N-1:0] din,
    output wire [N-1:0] sig
);
    reg [N-1:0] r;
    wire        fb = ^(r & TAPS);

    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) r <= {N{1'b0}};
        else        r <= ({ r[N-2:0], fb } ^ din);
    end

    assign sig = r;
endmodule
\`\`\`

**מפתח:**
- \`^(r & TAPS)\` — XOR-reduce של ה-state אחרי mask של ה-taps. עבור N=4, TAPS=4'b1001 (=bit 3 + bit 0): \`fb = r[3] ^ r[0]\`.
- \`{r[N-2:0], fb}\` — אותו shift כמו LFSR.
- ה-\`^ din\` בסוף — מערבב את הקלט המקבילי.
- ב-MISR seed=0 לא נתקע (בניגוד ל-LFSR) כי ה-din מספק את האנרגיה.`,
        expectedAnswers: [
          'always', 'posedge', 'rst_n',
          'reg', 'assign',
          '^', 'xor', 'reduction',
          'taps', 'din',
          'shift',
        ],
      },
      {
        label: 'ג',
        question: 'מה ההסתברות שתקלה ב-DUT לא תזוהה (aliasing)? איך משפרים?',
        hints: [
          'ה-MISR ממפה הסטוריה ארוכה של תגובות ל-state ב-N ביטים.',
          'יש 2^N סיגנטורות אפשריות. רק אחת מהן (`golden`) מתאימה ל-DUT תקין.',
          'אם יש תקלה, ההסתברות שהיא תיתן את הסיגנטורה הזהה (במקרה) = 1 / 2^N.',
          'עבור N=4: 1/16 ≈ 6.25%. **גרוע** ליישומי silicon.',
          'בתעשייה: MISR רחבים יותר. N=16 → 1/65536 ≈ 0.0015%. N=32 → 1 ל-4 מיליארד.',
        ],
        answer:
`**הסתברות aliasing ≈ 1 / 2ᴺ.**

ה-MISR הוא דחיסה בלתי-הפיכה — אין דרך לשחזר את הקלט המקורי מהסיגנטורה. **שתי תגובות שונות יכולות לתת אותה סיגנטורה** = false negative (תקלה לא זוהתה).

**N=4:** 1/16 ≈ 6.25% — ~6 מכל 100 chips פגומים יעברו את הבדיקה. **לא קביל בייצור.**

**N=16:** 1/2¹⁶ ≈ 1.5×10⁻⁵ — ~1.5 לכל 100k chips. **גבול מינימלי בייצור.**

**N=32:** 1/2³² ≈ 2.3×10⁻¹⁰ — שווה ערך לבדיקה מלאה. **סטנדרט תעשייתי.**

**שיפורים נוספים בייצור:**
1. **MISR רחב יותר** — N=64 (CRC-64) או 128.
2. **Multiple MISRs** — כמה MISRs במקביל על partitions שונים של הפלט. תקלה צריכה ליצור aliasing בכל ה-MISRs בו-זמנית → הסתברות מוכפלת.
3. **Different polynomials** — שני MISRs עם פולינומים שונים פוגעים בקורלציות שונות.
4. **Vector reduction (compaction)** — תגובות 100M cycles → סיגנטורה 32-bit. ההסתברות לא תלויה באורך הריצה, רק ברוחב ה-MISR.

**נקודה מתקדמת:** ה-aliasing הוא אחיד **רק** עבור פולינום primitive. עם פולינום לא-primitive, יש מצבים שמסתברים יותר → aliasing לא אחיד וגרוע יותר בפועל.`,
        expectedAnswers: [
          'aliasing',
          '1/2^n', '2^n', '1/16',
          '6%', '6.25',
          'wider', 'רחב', 'n=16', 'n=32',
          'primitive',
          'partition', 'multiple',
        ],
      },
    ],
    source: 'מאגר ראיונות — DFT classic: signature compaction',
    tags: ['misr', 'signature', 'aliasing', 'compaction', 'bist', 'dft'],
    circuitRevealsAnswer: true,
    circuit: () => build(() => {
      // Gate-level Type-II MISR — 4 D-FFs + 5 XORs.
      //   Per-cell XOR mixes D_i with the shifted bit; the LSB cell also
      //   XORs in the feedback (taps [3,0]).
      //   new_b0 = (FF3.Q ⊕ FF0.Q) ⊕ D0       (feedback + D0)
      //   new_b1 = FF0.Q ⊕ D1
      //   new_b2 = FF1.Q ⊕ D2
      //   new_b3 = FF2.Q ⊕ D3
      //   All FFs start at 0; D inputs supply entropy.
      const clk = h.clock(60, 280);
      // Parallel data inputs (top row)
      const d0 = h.input(180,  60, 'D0');
      const d1 = h.input(360,  60, 'D1');
      const d2 = h.input(540,  60, 'D2');
      const d3 = h.input(720,  60, 'D3');
      d0.stepValues = [1,0,1,1,0,1,0,1,0,1];
      d1.stepValues = [0,1,1,0,1,0,1,0,1,0];
      d2.stepValues = [1,1,0,1,0,1,1,0,0,1];
      d3.stepValues = [1,0,0,1,1,0,1,1,0,0];
      // Feedback XOR (taps [3,0]) — combines FF3.Q ⊕ FF0.Q into fb_bit
      const xorFb = h.gate('XOR', 450, 460);
      // Per-cell mixing XORs
      const xor0 = h.gate('XOR', 180, 160);
      const xor1 = h.gate('XOR', 360, 160);
      const xor2 = h.gate('XOR', 540, 160);
      const xor3 = h.gate('XOR', 720, 160);
      // 4 D-FFs (MISR cells)
      const ff0 = h.ffD(180, 280, 'FF0 (LSB)');
      const ff1 = h.ffD(360, 280, 'FF1');
      const ff2 = h.ffD(540, 280, 'FF2');
      const ff3 = h.ffD(720, 280, 'FF3 (MSB)');
      // Per-bit output pads
      const b0Out = h.output(180, 400, 'SIG[0]');
      const b1Out = h.output(360, 400, 'SIG[1]');
      const b2Out = h.output(540, 400, 'SIG[2]');
      const b3Out = h.output(720, 400, 'SIG[3]');
      return {
        nodes: [clk, d0, d1, d2, d3, xorFb, xor0, xor1, xor2, xor3,
                ff0, ff1, ff2, ff3, b0Out, b1Out, b2Out, b3Out],
        wires: [
          // Feedback XOR: FF3.Q ⊕ FF0.Q → fb_bit
          h.wire(ff3.id, xorFb.id, 0),
          h.wire(ff0.id, xorFb.id, 1),
          // Per-cell mixing XORs
          h.wire(xorFb.id, xor0.id, 0),   // fb_bit  → xor0.in0
          h.wire(d0.id,    xor0.id, 1),   // D0      → xor0.in1
          h.wire(ff0.id,   xor1.id, 0),   // FF0.Q   → xor1.in0
          h.wire(d1.id,    xor1.id, 1),   // D1      → xor1.in1
          h.wire(ff1.id,   xor2.id, 0),   // FF1.Q   → xor2.in0
          h.wire(d2.id,    xor2.id, 1),   // D2      → xor2.in1
          h.wire(ff2.id,   xor3.id, 0),   // FF2.Q   → xor3.in0
          h.wire(d3.id,    xor3.id, 1),   // D3      → xor3.in1
          // XOR outputs → FF inputs
          h.wire(xor0.id, ff0.id, 0),
          h.wire(xor1.id, ff1.id, 0),
          h.wire(xor2.id, ff2.id, 0),
          h.wire(xor3.id, ff3.id, 0),
          // Clock to all 4 FFs
          h.wire(clk.id, ff0.id, 1, 0, { isClockWire: true }),
          h.wire(clk.id, ff1.id, 1, 0, { isClockWire: true }),
          h.wire(clk.id, ff2.id, 1, 0, { isClockWire: true }),
          h.wire(clk.id, ff3.id, 1, 0, { isClockWire: true }),
          // Per-bit signature output
          h.wire(ff0.id, b0Out.id, 0),
          h.wire(ff1.id, b1Out.id, 0),
          h.wire(ff2.id, b2Out.id, 0),
          h.wire(ff3.id, b3Out.id, 0),
        ],
      };
    }),
  },

  // ───────────────────────────────────────────────────────────────
  // #6003 — Stuck-at fault detection on a NOR+AND+INV circuit with C
  //         fanout (slide 40). Topology:
  //           A → AND.top
  //           B → NOR.top
  //           C fanouts: forward → INV → AND.bot
  //                       up      → (fault) → NOR.bot
  //           NOR.out → AND.mid
  //           AND.out → Out
  //         Function: Out = A · NOR(B,C) · ¬C = A · ¬B · ¬C
  //
  //         The fault sits on the C→NOR wire (the upward branch).
  //         Pedagogically interesting: s-a-0 is REDUNDANT (the ¬C from
  //         the INV branch already forces Out=0 whenever C=1, so a
  //         stuck-at-0 on the C→NOR wire never affects Out). Only
  //         s-a-1 is detectable, with the unique vector (1,0,0).
  // ───────────────────────────────────────────────────────────────
  {
    id: 'stuck-at-detection-nor-and-cfanout',
    difficulty: 'medium',
    title: 'זיהוי תקלת stuck-at על קו C→NOR (פאן-אאוט) — מינימום וקטורי בדיקה',
    intro:
`בנקודה המסומנת בעיגול הכחול בשרטוט קיימת תקלת קצר — או \`stuck-at-1\` או \`stuck-at-0\`.

איך נכנס קלטים ב-\`A\`, \`B\`, \`C\` כדי לזהות את **סוג** הקצר, במספר וקטורי הבדיקה המינימלי?`,
    schematic: `
<svg viewBox="0 0 760 400" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="3-input AND fed by A, NOR(B,C), and INV(C). C fans out: one branch through INV to AND, the other up with the fault circle into the NOR.">
  <defs>
    <marker id="dft3arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#80f0a0"/></marker>
  </defs>

  <!--
    Topology matches the slide exactly per the user's verbal walkthrough:
      A → AND top input (long horizontal at top, then DOWN into AND).
      B → NOR top input.
      C → fanout point. From the fanout:
          • FORWARD branch: continues right → INV → up & right → AND bottom.
          • UP branch    : goes up, has the BLUE FAULT CIRCLE on it, then
                           L-bends left into NOR bottom input.
      NOR output → AND middle input.
      AND has THREE inputs (A, NOR.out, INV.out) and output → Out.
      Out = A · NOR(B, C) · ¬C = A · ¬B · ¬C (when fault-free).
  -->

  <!-- ── Input labels ───────────────────────────────────────────── -->
  <text direction="ltr" x="22" y="64"  text-anchor="middle" fill="#f0d080" font-weight="bold" font-size="18">A</text>
  <text direction="ltr" x="22" y="154" text-anchor="middle" fill="#f0d080" font-weight="bold" font-size="18">B</text>
  <text direction="ltr" x="22" y="324" text-anchor="middle" fill="#f0d080" font-weight="bold" font-size="18">C</text>

  <!-- ── A wire: long horizontal then DOWN into AND top input ──── -->
  <line x1="40"  y1="60"  x2="600" y2="60"  stroke="#f0d080" stroke-width="1.8"/>
  <line x1="600" y1="60"  x2="600" y2="135" stroke="#f0d080" stroke-width="1.8"/>

  <!-- ── B wire: short horizontal to NOR top input ──────────────── -->
  <line x1="40"  y1="150" x2="200" y2="150" stroke="#f0d080" stroke-width="1.8"/>

  <!-- ── C wire: horizontal to the fanout junction at x=200 ────── -->
  <!-- Fanout placed just LEFT of the NOR so the UP branch can enter the
       NOR from the LEFT (same direction as B) without an awkward
       right-to-left L-bend at the top. -->
  <line x1="40"  y1="320" x2="200" y2="320" stroke="#f0d080" stroke-width="1.8"/>
  <!-- fanout dot — explicit junction marker -->
  <circle cx="200" cy="320" r="3.8" fill="#f0d080"/>

  <!-- ── NOR gate (left of AND) ─────────────────────────────────── -->
  <!-- The NOR uses a SHALLOW concave back (control point close to the
       back edge) so the input pins at y=150 and y=200 land cleanly on
       the back curve at x≈222 — wires entering at x=220 connect to the
       gate body unambiguously. -->
  <path d="M 220 118 Q 232 175 220 232 Q 280 232 312 207 Q 340 175 312 143 Q 280 118 220 118 Z"
        fill="#0a1825" stroke="#80d4ff" stroke-width="1.8"/>
  <circle cx="345" cy="175" r="5" fill="#0a1825" stroke="#80d4ff" stroke-width="1.8"/>
  <text direction="ltr" x="268" y="180" text-anchor="middle" fill="#80d4ff" font-size="16" font-weight="bold">NOR</text>

  <!-- NOR output → AND middle input -->
  <line x1="350" y1="175" x2="600" y2="175" stroke="#80d4ff" stroke-width="1.8"/>

  <!-- ── 3-input AND gate ───────────────────────────────────────── -->
  <path d="M 600 105 L 600 245 L 645 245 A 70 70 0 0 0 645 105 Z"
        fill="#102818" stroke="#80f0a0" stroke-width="2"/>
  <text direction="ltr" x="624" y="180" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">AND</text>

  <!-- AND output → Out -->
  <line x1="715" y1="175" x2="745" y2="175" stroke="#80f0a0" stroke-width="2.4" marker-end="url(#dft3arr)"/>
  <text direction="ltr" x="755" y="181" text-anchor="end" fill="#80f0a0" font-weight="bold" font-size="18">Out</text>

  <!-- ── C fanout — UP branch (with fault) into NOR bottom input ── -->
  <!-- Route: UP from the fanout dot, then RIGHT into the NOR's bottom
       input — same orientation as B (entering NOR from its LEFT). -->
  <!--    vertical segment upward (carries the fault) -->
  <line x1="200" y1="320" x2="200" y2="200" stroke="#f0d080" stroke-width="1.8"/>
  <!--    short horizontal RIGHT into NOR bottom input -->
  <line x1="200" y1="200" x2="220" y2="200" stroke="#f0d080" stroke-width="1.8"/>

  <!-- ★★★ FAULT MARKER — blue circle on the UP wire, midway up ★★★ -->
  <circle cx="200" cy="255" r="11" fill="#80c8ff" stroke="#3060a0" stroke-width="2.4"/>
  <text direction="ltr" x="222" y="259" text-anchor="start" fill="#80c8ff" font-size="16" font-weight="bold">fault</text>

  <!-- ── C fanout — FORWARD branch through INV ──────────────────── -->
  <!--    horizontal RIGHT from fanout dot to INV input -->
  <line x1="200" y1="320" x2="345" y2="320" stroke="#f0d080" stroke-width="1.8"/>
  <!--    INV triangle pointing RIGHT, bubble on right tip -->
  <polygon points="345,303 345,337 378,320" fill="#0a1825" stroke="#80d4ff" stroke-width="1.8"/>
  <circle  cx="383" cy="320" r="5" fill="#0a1825" stroke="#80d4ff" stroke-width="1.8"/>
  <text direction="ltr" x="362" y="358" text-anchor="middle" fill="#80d4ff" font-size="16" font-style="italic">INV</text>

  <!-- ── INV output → up & right → AND bottom input ─────────────── -->
  <!-- Route: right from INV → vertical up → right into AND bottom.
       The vertical part crosses the NOR-output wire at (560, 175); a
       small "jump arc" on the vertical wire makes the crossing clear. -->
  <line x1="388" y1="320" x2="560" y2="320" stroke="#80d4ff" stroke-width="1.8"/>
  <!-- Vertical part below the crossing -->
  <line x1="560" y1="320" x2="560" y2="180" stroke="#80d4ff" stroke-width="1.8"/>
  <!-- Small jump arc OVER the NOR output wire at y=175 -->
  <path d="M 560 180 A 5 5 0 0 1 560 170" fill="none" stroke="#80d4ff" stroke-width="1.8"/>
  <!-- Continue UP from above the crossing → into AND bottom input -->
  <line x1="560" y1="170" x2="560" y2="215" stroke="#80d4ff" stroke-width="1.8"/>
  <line x1="560" y1="215" x2="600" y2="215" stroke="#80d4ff" stroke-width="1.8"/>

  <!-- net labels -->
  <text direction="ltr" x="225" y="194" text-anchor="start" fill="#f0d080" font-size="16" font-style="italic">C (faulty)</text>
  <text direction="ltr" x="430" y="312" text-anchor="start" fill="#80d4ff" font-size="16" font-style="italic">¬C</text>

  <!-- Caption -->
  <text direction="ltr" x="380" y="392" text-anchor="middle" fill="#a0a0c0" font-size="16" font-style="italic">
    Out = A · NOR(B, C) · ¬C = A · ¬B · ¬C   (when fault-free)
  </text>
</svg>`,
    parts: [
      {
        label: null,
        question: 'כמה וקטורי בדיקה מינימליים נדרשים, ומה הם? אילו פלטים?',
        hints: [
          'חשב את הפונקציה הלוגית: \`Out = A · NOR(B, C) · ¬C = A · ¬(B∨C) · ¬C = A · ¬B · ¬C · ¬C = A · ¬B · ¬C\`.',
          'שים לב — ה-AND מכפיל בשני גורמים שכל אחד תלוי ב-C: ה-\`¬C\` הישיר (מה-INV) וה-\`NOR(B,C)\`. שניהם הופכים ל-0 כש-\`C=1\`.',
          '**בודקים s-a-0** (הקו ל-NOR תקוע ב-0): \`NOR(B, 0) = ¬B\`. אז \`Out_faulty = A · ¬B · ¬C\` — **זהה ל-Out_free**. **התקלה s-a-0 רדוננטית — לא ניתנת לזיהוי בכלל!**',
          '**בודקים s-a-1** (הקו ל-NOR תקוע ב-1): \`NOR(B, 1) = 0\`. אז \`Out_faulty = 0\` תמיד.\\nמתי \`Out_free = 1\`? כש-\`A=1, B=0, C=0\`. \\n→ וקטור הזיהוי: \`(1, 0, 0)\` (free=1, faulty=0).',
          '**המסקנה:** אם ידוע שבוודאות אחת משתי התקלות פעילה, **וקטור יחיד מספיק.** \`(1,0,0)\` → Out=0 ⟹ s-a-1; Out=1 ⟹ s-a-0 (כי s-a-0 לא משנה את ההתנהגות).',
        ],
        answerSchematic: `
<svg viewBox="0 0 940 480" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="16" role="img" aria-label="Truth table comparison of free / s-a-0 / s-a-1 showing s-a-0 is redundant.">
  <rect x="0" y="0" width="940" height="46" fill="#0c1a28"/>
  <text direction="ltr" x="470" y="20" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="18">
    s-a-0 is REDUNDANT — single test vector (1,0,0) discriminates the two cases
  </text>
  <text direction="ltr" x="470" y="38" text-anchor="middle" fill="#a0a0c0" font-size="16" font-style="italic">
    Out = A · NOR(B, C_faulty) · ¬C   (C̄ comes from the INV branch, unaffected by the fault)
  </text>

  <!-- ── Truth-table panel ──────────────────────────────────────── -->
  <rect x="40" y="62" width="860" height="380" rx="8" fill="#0e1218" stroke="#3a2818" stroke-width="1.4"/>
  <text direction="ltr" x="470" y="92" text-anchor="middle" fill="#ffc890" font-weight="bold" font-size="18" letter-spacing="2">
    FULL TRUTH TABLE
  </text>

  <!-- column headers -->
  <g font-family="'JetBrains Mono', monospace" font-size="16" font-weight="bold" fill="#cca040">
    <text x="100" y="125" text-anchor="middle">A</text>
    <text x="160" y="125" text-anchor="middle">B</text>
    <text x="220" y="125" text-anchor="middle">C</text>
    <text x="340" y="125" text-anchor="middle">¬C (INV)</text>
    <text x="460" y="125" text-anchor="middle">NOR(B,C_real)</text>
    <text x="580" y="125" text-anchor="middle">Free Out</text>
    <text x="700" y="125" text-anchor="middle">s-a-0 Out</text>
    <text x="820" y="125" text-anchor="middle">s-a-1 Out</text>
  </g>
  <line x1="60" y1="135" x2="880" y2="135" stroke="#402a00" stroke-width="1"/>

  ${[
    // [A, B, C, notC, norBC, free, sa0, sa1, isDetect, sa1Mismatch]
    [0,0,0,1,1, 0, 0, 0, false, false],
    [0,0,1,0,0, 0, 0, 0, false, false],
    [0,1,0,1,0, 0, 0, 0, false, false],
    [0,1,1,0,0, 0, 0, 0, false, false],
    [1,0,0,1,1, 1, 1, 0, false, true],   // ★ s-a-1 mismatch
    [1,0,1,0,0, 0, 0, 0, false, false],
    [1,1,0,1,0, 0, 0, 0, false, false],
    [1,1,1,0,0, 0, 0, 0, false, false],
  ].map(([a,b,c,nc,nor,free,sa0,sa1,_d,mismatch], i) => {
    const y = 158 + i * 33;
    const rowBg = mismatch ? '<rect x="60" y="' + (y - 17) + '" width="820" height="30" fill="rgba(255,80,100,0.10)" stroke="rgba(255,80,100,0.4)" stroke-width="1.2" rx="3"/>' : '';
    const noteX = 920;
    const note = mismatch
      ? '<text direction="ltr" x="' + (820 + 70) + '" y="' + (y + 3) + '" text-anchor="middle" fill="#ff8090" font-size="16" font-weight="bold">⚡ s-a-1 detected</text>'
      : '';
    return `
      ${rowBg}
      <text direction="ltr" x="100" y="${y + 3}" text-anchor="middle" fill="#${a?'80f0a0':'506080'}" font-weight="bold" font-size="18">${a}</text>
      <text direction="ltr" x="160" y="${y + 3}" text-anchor="middle" fill="#${b?'80f0a0':'506080'}" font-weight="bold" font-size="18">${b}</text>
      <text direction="ltr" x="220" y="${y + 3}" text-anchor="middle" fill="#${c?'80f0a0':'506080'}" font-weight="bold" font-size="18">${c}</text>
      <text direction="ltr" x="340" y="${y + 3}" text-anchor="middle" fill="#80d4ff" font-size="16">${nc}</text>
      <text direction="ltr" x="460" y="${y + 3}" text-anchor="middle" fill="#80d4ff" font-size="16">${nor}</text>
      <text direction="ltr" x="580" y="${y + 3}" text-anchor="middle" fill="#${free?'80f0a0':'506080'}" font-weight="bold" font-size="18">${free}</text>
      <text direction="ltr" x="700" y="${y + 3}" text-anchor="middle" fill="#${sa0?'80f0a0':'506080'}" font-weight="bold" font-size="18">${sa0}</text>
      <text direction="ltr" x="820" y="${y + 3}" text-anchor="middle" fill="#${mismatch?'ff5060':sa1?'80f0a0':'506080'}" font-weight="bold" font-size="18">${sa1}</text>
    `;
  }).join('')}

  <!-- Highlight Free and s-a-0 columns as IDENTICAL -->
  <rect x="540" y="138" width="80" height="298" fill="none" stroke="#80f0a0" stroke-width="1.5" stroke-dasharray="4 3" rx="4" opacity="0.7"/>
  <rect x="660" y="138" width="80" height="298" fill="none" stroke="#80f0a0" stroke-width="1.5" stroke-dasharray="4 3" rx="4" opacity="0.7"/>
  <text direction="ltr" x="640" y="455" text-anchor="middle" fill="#80f0a0" font-size="16" font-weight="bold">
    ↑ Free Out ≡ s-a-0 Out  (identical for ALL 8 inputs → s-a-0 is REDUNDANT)
  </text>

  <!-- Highlight (1,0,0) row -->
  <text direction="ltr" x="920" y="261" text-anchor="middle" fill="#ff8090" font-size="16" font-weight="bold">⚡</text>
</svg>`,
        answer:
`**טוויסט: אחת התקלות (s-a-0) רדוננטית — לא ניתנת לזיהוי.** אם ידוע שיש תקלה — **וקטור יחיד \`(1,0,0)\` מספיק** להבחין בין השתיים.

הפונקציה ללא תקלה:
\`Out = A · NOR(B, C) · ¬C = A · ¬(B∨C) · ¬C = A · ¬B · ¬C · ¬C = A · ¬B · ¬C\`

### ניתוח שתי התקלות

**s-a-0** על קו \`C→NOR\`: ה-NOR רואה \`(B, 0)\`.
\`Out_faulty = A · NOR(B, 0) · ¬C = A · ¬B · ¬C\` = **בדיוק Out_free.**
→ **רדוננטית.** התקלה לעולם לא מעוותת את הפלט, כי ה-\`¬C\` מהענף של ה-INV ממילא מאפס את ה-Out בכל \`C=1\` (האזור היחיד שבו ה-NOR יכול להתנהג שונה תחת התקלה).

**s-a-1** על קו \`C→NOR\`: ה-NOR רואה \`(B, 1)\` → תמיד 0.
\`Out_faulty = A · 0 · ¬C = 0\` (תמיד).
לזיהוי צריך \`Out_free = 1\` — כלומר \`A=1, B=0, C=0\`.

### הוקטור היחיד

| (A, B, C) | Free Out | s-a-0 Out | s-a-1 Out |
|:---------:|:--------:|:---------:|:---------:|
| **(1, 0, 0)** | **1** | 1 (זהה) | **0** ⚡ |

- Out = 1 → אין הבחנה בין free ל-s-a-0 (היא רדוננטית) — מעניינו, אם הנחת היסוד היא "יש תקלה", זה s-a-0.
- Out = 0 → s-a-1.

**1 וקטור = הבחנה מלאה.**

### למה s-a-0 רדוננטית?

הביטוי הסופי \`Out = A · ¬B · ¬C\` כולל את \`¬C\` כגורם. בכל פעם ש-\`C=1\`, ה-Out נסגר ל-0 ע"י ה-\`¬C\` הזה — בלי קשר למה ש-NOR מחזיר. ולכן הקטעת ה-\`C\` ל-NOR (s-a-0) לא משנה כלום: כש-\`C=0\` ממילא ה-NOR מקבל \`(B, 0)\` נורמלית; כש-\`C=1\` ה-\`¬C\` הישיר חוסם את ה-Out. הענף הקדמי דרך ה-INV "מסתיר" את התקלה.

זוהי דוגמה קלאסית של **redundant fault** — תקלות שכלי ATPG מוכרחים לזהות כדי לא לבזבז עליהן וקטורי בדיקה.

### לנסות חי בקנבס

למטה: 3 שורות מקבילות (fault-free, s-a-0, s-a-1). שנה את \`A/B/C\` ותראה ש-\`Out (free) = Out (s-a-0)\` בכל קומבינציה — בדיוק העדות לרדוננטיות. רק \`Out (s-a-1)\` נופל ל-0 ב-\`(1,0,0)\`.`,
        interviewerMindset:
`זוהי **שאלת מלכודת** — מועמד שעובד מכני יחשב 2 וקטורים ויפספס את התובנה. המראיין מחפש:

1. **חישוב הפונקציה ולפשט עד הסוף** — \`Out = A · ¬B · ¬C\`. שני גורמים שתלויים ב-C (\`NOR(B,C)\` ו-\`¬C\`) מתאחדים. מי שעוצר ב-\`A · NOR(B,C) · ¬C\` בלי לפשט יכול להתעלם מהרדוננטיות.
2. **לזהות שה-\`¬C\` מסתיר את התקלה** — תקלה על קו ל-NOR משפיעה רק על \`NOR(B, C_faulty)\`. אבל \`¬C\` הישיר מהענף של ה-INV מאפס כל פלט כש-\`C=1\`. אז שינוי ב-\`NOR\` כש-\`C=1\` בלתי-נראה. וכש-\`C=0\` — ה-NOR ממילא מקבל את ה-0 הנכון. אז s-a-0 פשוט "מסכים" עם המציאות.
3. **לקרוא לתקלה בשם:** **redundant fault.** מועמד שמשתמש במונח הזה מקבל ניקוד גבוה.
4. **הצדקה לוקטור יחיד** — אם מניחים שיש בדיוק תקלה אחת מבין שתיים, וקטור אחד יכול להפריד בין שתי אפשרויות (2 פלטים = 2 תסריטים). כאן \`(1,0,0)\` עושה את העבודה.

**שאלת המשך נפוצה:** "איזה כלי ATPG עושה בייצור עם תקלה כזו?" — מסמן אותה כ-\`untestable\` ומדווח ב-coverage report. תקלות רדוננטיות מורידות את ה-coverage המקסימלי (לדוגמה אם יש 10 תקלות ו-1 רדוננטית, הכיסוי המקסימלי הוא 90%, לא 100%).

**שאלת bonus:** "איך משחזרים את ה-\`¬C\` שמסתיר את התקלה?" — אם משנים את הטופולוגיה (למשל מוציאים את ענף ה-INV ומכניסים שער אחר), התקלה הופכת לניתנת-לזיהוי. הרדוננטיות תלויה בהקשר ה-fanout, לא רק בקו עצמו.`,
        expectedAnswers: [
          '2', 'two', 'שני', 'שניים',
          '(1,0,1)', '(1,1,1)',
          '101', '111',
          'minimum', 'מינימום', 'מינימלי',
          'stuck-at', 'stuck at', 's-a-0', 's-a-1',
          'activation', 'propagation',
          'sensitization', 'sensitize',
          'atpg', 'd-algorithm',
        ],
      },
    ],
    source: 'IQ/PP — מצגת שאלות מעגלים, שקף 40 (Stuck-at on C→NOR wire with C fanout)',
    tags: ['stuck-at', 'redundant-fault', 'atpg', 'fault-detection', 'fanout', 'test-vectors', 'dft'],
    circuitRevealsAnswer: true,
    // Canvas: THREE rows of the same circuit. Each row has C fanning
    // out — forward through INV to AND (bottom), and up to NOR (bottom).
    // NOR.out → AND middle. 3-input AND with A on top. The wire that
    // carries C to the NOR is the one tagged with stuckAt in rows 2/3.
    //
    //   Row 1 — fault-free. All three outputs of A·NOR(B,C)·¬C visible.
    //   Row 2 — C→NOR wire injected with stuckAt:0 (s-a-0). REDUNDANT;
    //           Out matches free for every input combination.
    //   Row 3 — C→NOR wire injected with stuckAt:1 (s-a-1).
    //
    // The wire.stuckAt mechanism (built during the DFT expansion)
    // makes the engine treat the wire as if forced to that value —
    // visually rendered with the dashed orange overlay. Default
    // (A,B,C) = (1,0,0):
    //   Out (free)  = 1·NOR(0,0)·1 = 1·1·1 = 1
    //   Out (s-a-0) = 1·NOR(0,0)·1 = 1·1·1 = 1   ← identical to free
    //   Out (s-a-1) = 1·NOR(0,1)·1 = 1·0·1 = 0   ← detected
    circuit: () => build(() => {
      // ── Shared inputs ─────────────────────────────────────────────────
      const A = h.input(80,  140, 'A');      A.fixedValue = 1;
      const B = h.input(80,  240, 'B');      B.fixedValue = 0;
      const C = h.input(80,  360, 'C');      C.fixedValue = 0;

      // Three parallel rows of the same C-fanout circuit. Each row has
      // its own INV, NOR, and a SINGLE 3-input AND (A · NOR.out · ¬C)
      // — leveraging the multi-input gate feature instead of two
      // cascaded 2-input ANDs.
      const mkRow = (yMid, label) => {
        const yTop = yMid - 70;
        const yBot = yMid + 80;
        const and3 = h.gate('AND', 700, yTop + 20);
        and3.inputCount = 3;
        return {
          inv:  h.gate('NOT', 340, yBot),
          nor:  h.gate('NOR', 540, yMid),
          and3,
          out:  h.output(900, yTop + 20, label),
        };
      };
      const r1 = mkRow(280, 'Out (free)');
      const r2 = mkRow(560, 'Out (s-a-0)');
      const r3 = mkRow(840, 'Out (s-a-1)');

      const wires = [];
      const wireRow = (row) => {
        wires.push(h.wire(A.id,         row.and3.id, 0));   // A → AND.in0
        wires.push(h.wire(C.id,         row.inv.id,  0));   // C → INV (forward fanout)
        wires.push(h.wire(B.id,         row.nor.id,  0));   // B → NOR top
        const cToNor = h.wire(C.id,     row.nor.id,  1);    // C → NOR (UP branch — this is the fault site)
        wires.push(cToNor);
        wires.push(h.wire(row.nor.id,   row.and3.id, 1));   // NOR → AND.in1
        wires.push(h.wire(row.inv.id,   row.and3.id, 2));   // ¬C → AND.in2
        wires.push(h.wire(row.and3.id,  row.out.id,  0));   // AND → Out
        return cToNor;
      };
      const w1 = wireRow(r1);
      const w2 = wireRow(r2);  w2.stuckAt = 0;     // s-a-0 on C→NOR wire
      const w3 = wireRow(r3);  w3.stuckAt = 1;     // s-a-1 on C→NOR wire

      return {
        nodes: [
          A, B, C,
          r1.inv, r1.nor, r1.and3, r1.out,
          r2.inv, r2.nor, r2.and3, r2.out,
          r3.inv, r3.nor, r3.and3, r3.out,
        ],
        wires,
      };
    }),
  },

  // ───────────────────────────────────────────────────────────────
  // #6004 — Stuck-at fault detection on a half-adder + XOR (sister
  //         question to #6003). Topology:
  //           A → XOR1 (HA SUM)
  //           B → XOR1
  //           A → AND  (HA COUT)
  //           B → AND
  //           XOR1.out (SUM)  → XOR2.top
  //           AND.out  (COUT) → XOR2.bot         ← FAULT lives here
  //           XOR2.out → Y
  //
  //         Fault-free identity:  Y = (A⊕B) ⊕ (A·B) = A ∨ B
  //         The fault scrambles this identity into one of three
  //         different boolean functions:
  //           free   →  OR
  //           s-a-0  →  XOR     (the AND contribution is killed)
  //           s-a-1  →  XNOR    (the XOR is inverted)
  //         All three are distinguishable, but only with the two
  //         "extremes" (0,0) and (1,1) — the middle vectors (0,1)/(1,0)
  //         are symmetry-blind because OR = XOR = 1 there.
  // ───────────────────────────────────────────────────────────────
  {
    id: 'stuck-at-detection-ha-xor-cout',
    difficulty: 'hard',
    title: 'זיהוי תקלת stuck-at על קו COUT של half-adder + XOR',
    intro:
`בנקודה המסומנת בעיגול הכחול בשרטוט — על קו ה-\`COUT\` בין יציאת ה-AND לכניסת ה-XOR השני — קיימת תקלת קצר: \`stuck-at-1\` או \`stuck-at-0\`.

איך נכנס קלטים ב-\`A\`, \`B\` כדי לזהות את **סוג** הקצר, במספר וקטורי הבדיקה המינימלי?`,
    schematic: `
<svg viewBox="0 0 700 380" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Half-adder (XOR + AND) feeding a second XOR; fault marker on the COUT wire between AND and second XOR.">
  <defs>
    <marker id="dft4arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#80f0a0"/></marker>
  </defs>

  <!--
    Layout:
      A, B inputs on the left, each fanning out to BOTH the XOR1
      (top, computes SUM) and the AND (bottom, computes COUT). The
      SUM wire goes right + down into the final XOR2's top input;
      COUT wire goes right + up into XOR2's bottom input.
      Blue fault marker on the COUT wire, on the vertical segment.
  -->

  <!-- Input labels -->
  <text direction="ltr" x="22" y="104" text-anchor="middle" fill="#f0d080" font-weight="bold" font-size="18">A</text>
  <text direction="ltr" x="22" y="284" text-anchor="middle" fill="#f0d080" font-weight="bold" font-size="18">B</text>

  <!-- ── A wire: fanout to XOR1.top + AND.top ─────────────────────── -->
  <line x1="40" y1="100" x2="140" y2="100" stroke="#f0d080" stroke-width="1.8"/>
  <circle cx="140" cy="100" r="3.8" fill="#f0d080"/>
  <line x1="140" y1="100" x2="200" y2="100" stroke="#f0d080" stroke-width="1.8"/>
  <line x1="140" y1="100" x2="140" y2="260" stroke="#f0d080" stroke-width="1.8"/>
  <line x1="140" y1="260" x2="200" y2="260" stroke="#f0d080" stroke-width="1.8"/>

  <!-- ── B wire: fanout to XOR1.bot + AND.bot ─────────────────────── -->
  <line x1="40" y1="280" x2="180" y2="280" stroke="#f0d080" stroke-width="1.8"/>
  <circle cx="180" cy="280" r="3.8" fill="#f0d080"/>
  <line x1="180" y1="280" x2="200" y2="280" stroke="#f0d080" stroke-width="1.8"/>
  <line x1="180" y1="280" x2="180" y2="140" stroke="#f0d080" stroke-width="1.8"/>
  <line x1="180" y1="140" x2="200" y2="140" stroke="#f0d080" stroke-width="1.8"/>

  <!-- ── XOR1 (top, computes SUM = A⊕B) ───────────────────────────── -->
  <path d="M 195 75 Q 215 120 195 165 Q 230 165 260 142 Q 290 120 260 98 Q 230 75 195 75 Z"
        fill="#0a1825" stroke="#80d4ff" stroke-width="1.8"/>
  <path d="M 188 75 Q 208 120 188 165" fill="none" stroke="#80d4ff" stroke-width="1.8"/>
  <text direction="ltr" x="232" y="124" text-anchor="middle" fill="#80d4ff" font-size="16" font-weight="bold">XOR</text>

  <!-- ── AND (bottom, computes COUT = A·B) ───────────────────────── -->
  <path d="M 200 235 L 200 305 L 240 305 A 35 35 0 0 0 240 235 Z"
        fill="#102818" stroke="#80f0a0" stroke-width="1.8"/>
  <text direction="ltr" x="222" y="275" text-anchor="middle" fill="#80f0a0" font-size="16" font-weight="bold">AND</text>

  <!-- ── SUM wire: XOR1.out → XOR2.top input ──────────────────────── -->
  <line x1="290" y1="120" x2="380" y2="120" stroke="#80d4ff" stroke-width="1.8"/>
  <line x1="380" y1="120" x2="380" y2="180" stroke="#80d4ff" stroke-width="1.8"/>
  <line x1="380" y1="180" x2="430" y2="180" stroke="#80d4ff" stroke-width="1.8"/>
  <text direction="ltr" x="338" y="112" text-anchor="middle" fill="#80d4ff" font-size="16" font-style="italic">SUM = A⊕B</text>

  <!-- ── COUT wire: AND.out → XOR2.bot input  (with FAULT marker) ── -->
  <line x1="280" y1="270" x2="380" y2="270" stroke="#80f0a0" stroke-width="1.8"/>
  <!--   vertical segment UP, carries the fault -->
  <line x1="380" y1="270" x2="380" y2="220" stroke="#80f0a0" stroke-width="1.8"/>
  <line x1="380" y1="220" x2="430" y2="220" stroke="#80f0a0" stroke-width="1.8"/>
  <text direction="ltr" x="335" y="284" text-anchor="middle" fill="#80f0a0" font-size="16" font-style="italic">COUT = A·B</text>

  <!-- ★★★ FAULT MARKER on the COUT vertical segment, close to XOR2 -->
  <circle cx="380" cy="240" r="11" fill="#80c8ff" stroke="#3060a0" stroke-width="2.4"/>
  <text direction="ltr" x="403" y="244" text-anchor="start" fill="#80c8ff" font-size="16" font-weight="bold">fault</text>

  <!-- ── XOR2 (right, the final XOR combining SUM + COUT) ─────────── -->
  <path d="M 425 155 Q 445 200 425 245 Q 460 245 490 222 Q 520 200 490 178 Q 460 155 425 155 Z"
        fill="#0a1825" stroke="#80d4ff" stroke-width="1.8"/>
  <path d="M 418 155 Q 438 200 418 245" fill="none" stroke="#80d4ff" stroke-width="1.8"/>
  <text direction="ltr" x="462" y="204" text-anchor="middle" fill="#80d4ff" font-size="16" font-weight="bold">XOR</text>

  <!-- ── XOR2 output → Y ──────────────────────────────────────────── -->
  <line x1="520" y1="200" x2="600" y2="200" stroke="#80f0a0" stroke-width="2.4" marker-end="url(#dft4arr)"/>
  <text direction="ltr" x="635" y="206" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="18">Y</text>

  <!-- Caption -->
  <text direction="ltr" x="350" y="362" text-anchor="middle" fill="#a0a0c0" font-size="16" font-style="italic">
    Y = (A⊕B) ⊕ (A·B)   (when fault-free)
  </text>
</svg>`,
    parts: [
      {
        label: null,
        question: 'מה הפונקציה הלוגית של המעגל ללא תקלה? ובכל אחת משתי התקלות? כמה וקטורי בדיקה מינימליים נדרשים, ומה הם?',
        hints: [
          'התחל בחישוב הפונקציה ללא תקלה: \`Y = SUM ⊕ COUT = (A⊕B) ⊕ (A·B)\`. בדוק את 4 השורות בטבלת האמת ופשט.',
          'תובנת מפתח: \`(A⊕B) ⊕ (A·B) = A ∨ B\` — זוהי **זהות ה-half-adder**: SUM XOR COUT = OR. בלי הזהות הזו אי-אפשר לאפיין נכון את הפונקציה ללא תקלה.',
          's-a-0 על קו COUT: ה-COUT שנכנס ל-XOR השני שווה 0. \`Y = (A⊕B) ⊕ 0 = A⊕B\` → **המעגל הופך ל-XOR.**',
          's-a-1 על קו COUT: ה-COUT שנכנס שווה 1. \`Y = (A⊕B) ⊕ 1 = ¬(A⊕B)\` → **המעגל הופך ל-XNOR.**',
          'שלוש פונקציות שונות: \`OR\` (free), \`XOR\` (s-a-0), \`XNOR\` (s-a-1). שים לב לסימטריה — בכניסות (0,1) ו-(1,0) כל השלוש סימטריות לאמצע (OR=XOR=1, XNOR=0). אז וקטורים "באמצע" לא מפרידים בין free ל-s-a-0!',
          'הוקטורים המבחינים חייבים להיות בקצוות: \`(0,0)\` מבחין את s-a-1 (=1) מ-free=s-a-0 (=0), ו-\`(1,1)\` מבחין את free (=1) מ-s-a-0=s-a-1 (=0). שני הקצוות יחד = הבחנה מלאה.',
        ],
        answerSchematic: `
<svg viewBox="0 0 940 400" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="16" role="img" aria-label="Truth-table comparison of OR / XOR / XNOR — the three functions produced by free / s-a-0 / s-a-1.">
  <rect x="0" y="0" width="940" height="46" fill="#0c1a28"/>
  <text direction="ltr" x="470" y="20" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="18">
    Fault scrambles the half-adder identity into 3 different functions
  </text>
  <text direction="ltr" x="470" y="38" text-anchor="middle" fill="#a0a0c0" font-size="16" font-style="italic">
    free = OR  ·  s-a-0 = XOR  ·  s-a-1 = XNOR  ·  distinguished by the two extremes (0,0) and (1,1)
  </text>

  <!-- ── Truth-table panel ──────────────────────────────────────── -->
  <rect x="40" y="62" width="860" height="310" rx="8" fill="#0e1218" stroke="#3a2818" stroke-width="1.4"/>
  <text direction="ltr" x="470" y="92" text-anchor="middle" fill="#ffc890" font-weight="bold" font-size="18" letter-spacing="2">
    Y(A, B) UNDER EACH SCENARIO
  </text>

  <g font-family="'JetBrains Mono', monospace" font-size="16" font-weight="bold" fill="#cca040">
    <text x="120" y="125" text-anchor="middle">A</text>
    <text x="200" y="125" text-anchor="middle">B</text>
    <text x="340" y="125" text-anchor="middle">A⊕B (SUM)</text>
    <text x="470" y="125" text-anchor="middle">A·B (COUT)</text>
    <text x="600" y="125" text-anchor="middle">Free = OR</text>
    <text x="720" y="125" text-anchor="middle">s-a-0 = XOR</text>
    <text x="840" y="125" text-anchor="middle">s-a-1 = XNOR</text>
  </g>
  <line x1="60" y1="135" x2="880" y2="135" stroke="#402a00" stroke-width="1"/>

  ${[
    [0,0, 0,0, 0,0,1,  /*detect*/ 'sa1',    'XNOR-only'],
    [0,1, 1,0, 1,1,0,  /*detect*/ null,     'free=sa0, sa1 differs'],
    [1,0, 1,0, 1,1,0,  /*detect*/ null,     'free=sa0, sa1 differs'],
    [1,1, 0,1, 1,0,0,  /*detect*/ 'or-only','free vs sa0=sa1'],
  ].map(([a,b,sum,cout,free,sa0,sa1,kind,note], i) => {
    const y = 165 + i * 44;
    const isExtreme = (a === b);
    const rowBg = isExtreme ? '<rect x="60" y="' + (y - 22) + '" width="820" height="38" fill="rgba(64,204,96,0.08)" stroke="rgba(64,204,96,0.35)" stroke-width="1.2" rx="3"/>' : '';
    const noteEl = isExtreme
      ? '<text direction="ltr" x="900" y="' + (y + 4) + '" text-anchor="middle" fill="#80f0a0" font-size="16" font-weight="bold">⚡</text>'
      : '';
    return `
      ${rowBg}
      <text direction="ltr" x="120" y="${y + 4}" text-anchor="middle" fill="#${a?'80f0a0':'506080'}" font-weight="bold" font-size="18">${a}</text>
      <text direction="ltr" x="200" y="${y + 4}" text-anchor="middle" fill="#${b?'80f0a0':'506080'}" font-weight="bold" font-size="18">${b}</text>
      <text direction="ltr" x="340" y="${y + 4}" text-anchor="middle" fill="#80d4ff" font-size="16">${sum}</text>
      <text direction="ltr" x="470" y="${y + 4}" text-anchor="middle" fill="#80d4ff" font-size="16">${cout}</text>
      <text direction="ltr" x="600" y="${y + 4}" text-anchor="middle" fill="#${free?'80f0a0':'506080'}" font-weight="bold" font-size="18">${free}</text>
      <text direction="ltr" x="720" y="${y + 4}" text-anchor="middle" fill="#${sa0?'80f0a0':'506080'}" font-weight="bold" font-size="18">${sa0}</text>
      <text direction="ltr" x="840" y="${y + 4}" text-anchor="middle" fill="#${sa1?'80f0a0':'506080'}" font-weight="bold" font-size="18">${sa1}</text>
      ${noteEl}
    `;
  }).join('')}

  <!-- Footnote — extreme rows are the detecting vectors -->
  <text direction="ltr" x="470" y="358" text-anchor="middle" fill="#80f0a0" font-size="16" font-weight="bold">
    ⚡ rows = the two extremes that fully distinguish the 3 scenarios. Middle rows are symmetry-blind.
  </text>
</svg>`,
        answer:
`**מינימום: 2 וקטורי בדיקה — \`(0,0)\` ו-\`(1,1)\`.**

### זהות ה-half-adder

הפונקציה ללא תקלה:
\`Y = SUM ⊕ COUT = (A⊕B) ⊕ (A·B)\`

טבלת אמת:
| A | B | A⊕B | A·B | Y |
|:-:|:-:|:---:|:---:|:-:|
| 0 | 0 | 0 | 0 | **0** |
| 0 | 1 | 1 | 0 | **1** |
| 1 | 0 | 1 | 0 | **1** |
| 1 | 1 | 0 | 1 | **1** |

זוהי בדיוק \`A ∨ B\` — **המעגל הוא OR**, שנבנה ממחצית-מחבר. זהות ידועה ב-DFT וב-design.

### השפעת הקצר

**s-a-0** על COUT (ה-COUT שנכנס ל-XOR השני נכפה ל-0):
\`Y = (A⊕B) ⊕ 0 = A ⊕ B\` → המעגל **הופך ל-XOR**.

**s-a-1** על COUT (ה-COUT נכפה ל-1):
\`Y = (A⊕B) ⊕ 1 = ¬(A⊕B) = A XNOR B\` → המעגל **הופך ל-XNOR**.

### 3 פונקציות, איפה הן מבחינות

| (A,B) | free=OR | s-a-0=XOR | s-a-1=XNOR |
|:-----:|:-------:|:---------:|:----------:|
| **(0,0)** | **0** | **0** | **1** ⚡ |
| (0,1) | 1 | 1 | 0 |
| (1,0) | 1 | 1 | 0 |
| **(1,1)** | **1** ⚡ | **0** | **0** |

ב-(0,1) ו-(1,0): \`OR = XOR = 1\` (סימטרי!). הוקטורים האלה **לא מבחינים** בין free ל-s-a-0.

ב-(0,0): \`OR = XOR = 0\`, \`XNOR = 1\` → מבחין את **s-a-1** מהשניים האחרים.
ב-(1,1): \`OR = 1\`, \`XOR = XNOR = 0\` → מבחין את **free** מהשניים האחרים.

**זוג הקצוות \`(0,0) + (1,1)\` נדרש**.

### הסיגנטורות

| תרחיש | Y(0,0) | Y(1,1) |
|---|:---:|:---:|
| Free  | 0 | 1 |
| s-a-0 | 0 | 0 |
| s-a-1 | 1 | 0 |

שלוש סיגנטורות נפרדות → הבחנה מלאה.

### למה לא וקטור יחיד

3 תסריטים שונים דורשים לפחות \`⌈log₂(3)⌉ = 2\` וקטורים. וקטור בודד יכול לחלק רק לשני תסריטים.

### מלכודת מעניינת

מועמד שמתחיל מ-\`(0,1)\` או \`(1,0)\` (האמצע) — ייכנס למלכודת: עוד וקטור באמצע לא יפתור (כל אמצע נותן free=sa0). חייבים את הקצוות בדיוק.`,
        interviewerMindset:
`**שאלה ברמת בינוני+ עם שני שלבי "אהה":**

1. **הזהות של half-adder**: \`(A⊕B) ⊕ (A·B) = A ∨ B\`. מועמד שלא רואה את זה מאבד את היכולת לאפיין את הפונקציה ללא תקלה. ATPG אמיתי מנתח כל פונקציה במונחי טבלת האמת — שווה לקפוץ ל-truth-table מיד.
2. **הסימטריה של 3 הפונקציות (OR, XOR, XNOR)**: כולן ב-1 על האמצע (01/10) או כולן ב-0; ההבחנה היחידה היא בקצוות (00/11). מועמד שבוחר וקטור באמצע + עוד וקטור באמצע — מפספס לחלוטין את ה-s-a-0.

**שאלת המשך:** "ומה אם הקצר היה על קו SUM (לא COUT)?" — אז התרחישים הם: free=OR, s-a-0=AND (\`A·B\` בלבד), s-a-1=NAND (\`¬(A·B)\`). הוקטורים הנדרשים שונים: צריך אחד מהקצוות (להבחין NAND) + אחד מהאמצע (להבחין AND מ-OR).

**שאלת bonus:** "מה היחס בין ה-OR שמתקבל כאן לבין full-adder?" — full-adder נבנה מ-2 half-adders + OR של ה-COUT-ים. הזהות שלנו היא הצד "OR" של ה-FA, מוסתר בתוך השער.

**שאלת bonus 2:** "תיאורית — כמה תקלות יחידות אפשריות במעגל הזה?" — 7 קווים פנימיים (A-fanout, B-fanout, A→XOR1, A→AND, B→XOR1, B→AND, SUM, COUT, Y) × 2 (s-a-0/s-a-1) = ~14-16 תקלות בודדות, חלקן עשויות להיות \`equivalent\` (לתת אותה התנהגות).`,
        expectedAnswers: [
          '2', 'two', 'שני', 'שניים',
          '(0,0)', '(1,1)', '00', '11',
          'minimum', 'מינימום', 'מינימלי',
          'or', 'xor', 'xnor',
          'half-adder', 'half adder', 'half_adder',
          'identity', 'זהות',
          'extreme', 'edge', 'symmetry', 'סימטריה',
        ],
      },
    ],
    source: 'אחות לשאלת stuck-at NOR+AND (#6003) — half-adder identity twist',
    tags: ['stuck-at', 'atpg', 'fault-detection', 'half-adder', 'xor', 'identity', 'symmetry', 'dft'],
    circuitRevealsAnswer: true,
    // Canvas: 3 parallel rows of (XOR + AND + XOR) sharing A and B.
    // Row 1 — fault-free. Row 2 — wire AND→XOR2.bot has stuckAt:0.
    // Row 3 — same wire has stuckAt:1. User can change A and B with
    // (1,1) → Out1=1, Out2=0, Out3=0 ; (0,0) → Out1=0, Out2=0, Out3=1.
    circuit: () => build(() => {
      // ── Shared inputs ─────────────────────────────────────────────
      const A = h.input(80, 140, 'A');     A.fixedValue = 1;
      const B = h.input(80, 280, 'B');     B.fixedValue = 1;

      // Each row builds the (XOR1, AND, XOR2, Out) chain.
      const mkRow = (yMid, label) => ({
        xor1: h.gate('XOR', 320, yMid - 60),     // SUM = A⊕B
        and1: h.gate('AND', 320, yMid + 60),     // COUT = A·B
        xor2: h.gate('XOR', 560, yMid),          // SUM ⊕ COUT
        out:  h.output(760, yMid, label),
      });
      const r1 = mkRow(220, 'Out (free)');
      const r2 = mkRow(500, 'Out (s-a-0)');
      const r3 = mkRow(780, 'Out (s-a-1)');

      const wires = [];
      const wireRow = (row) => {
        wires.push(h.wire(A.id,        row.xor1.id, 0));   // A → XOR1 top
        wires.push(h.wire(B.id,        row.xor1.id, 1));   // B → XOR1 bot
        wires.push(h.wire(A.id,        row.and1.id, 0));   // A → AND top
        wires.push(h.wire(B.id,        row.and1.id, 1));   // B → AND bot
        wires.push(h.wire(row.xor1.id, row.xor2.id, 0));   // SUM → XOR2 top
        const cout = h.wire(row.and1.id, row.xor2.id, 1);  // COUT → XOR2 bot (FAULT SITE)
        wires.push(cout);
        wires.push(h.wire(row.xor2.id, row.out.id,  0));   // Y → Out
        return cout;
      };
      const w1 = wireRow(r1);
      const w2 = wireRow(r2);  w2.stuckAt = 0;
      const w3 = wireRow(r3);  w3.stuckAt = 1;

      return {
        nodes: [
          A, B,
          r1.xor1, r1.and1, r1.xor2, r1.out,
          r2.xor1, r2.and1, r2.xor2, r2.out,
          r3.xor1, r3.and1, r3.xor2, r3.out,
        ],
        wires,
      };
    }),
  },

  // ───────────────────────────────────────────────────────────────
  // #6005 — Bridge fault between the two data wires of a gate-level
  //         2:1 MUX. Topology:
  //           A → wire pA → AND_A (with S)        AND_A.out → OR
  //           B → wire pB → AND_B (with ¬S)      AND_B.out → OR
  //           OR.out → Out
  //         Fault-free function:  Out = S·A + ¬S·B  =  (S ? A : B)
  //         The bridge wired-ANDs (or wired-ORs) wires pA and pB
  //         together. Under the bridge:
  //           wired-AND:  Out = A·B   (independent of S!)
  //           wired-OR :  Out = A+B   (independent of S!)
  //         The bridge ERASES the MUX's S-dependence — that's the
  //         pedagogical "aha".
  //
  //         Detection requires:
  //           1. A ≠ B  (otherwise A·B = A+B = A = B, bridge is transparent)
  //           2. BOTH S values (to distinguish AND-bridge from OR-bridge)
  //         Minimum test set = 2 vectors, e.g.
  //           (A,B,S) = (0,1,0)  → free=1, AND=0, OR=1   (catches AND)
  //           (A,B,S) = (0,1,1)  → free=0, AND=0, OR=1   (catches OR)
  // ───────────────────────────────────────────────────────────────
  {
    id: 'bridge-detection-mux-data',
    difficulty: 'hard',
    title: 'זיהוי תקלת bridge בין שני קווי data במולטיפלקסר',
    intro:
`בנקודה המסומנת בעיגול הכחול בשרטוט קיים **קצר (bridge)** בין שני קווי ה-data של ה-MUX —
כלומר שני הקווים מחוברים פיזית. הקצר יכול להיות אחד משני סוגים:

- **wired-AND** (קצר דומיננטי-0): שני הקווים מקבלים את הערך \`A · B\`.
- **wired-OR** (קצר דומיננטי-1): שני הקווים מקבלים את הערך \`A + B\`.

איך נכנס קלטים ב-\`A\`, \`B\`, \`S\` כדי לזהות את **סוג** הקצר, במספר וקטורי הבדיקה המינימלי?`,
    schematic: `
<svg viewBox="0 0 720 380" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Gate-level 2:1 MUX with a bridge fault between the two data wires (A and B) before they enter their respective ANDs.">
  <defs>
    <marker id="dft5arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#80f0a0"/></marker>
  </defs>

  <!-- Input labels -->
  <text direction="ltr" x="22" y="84"  text-anchor="middle" fill="#f0d080" font-weight="bold" font-size="18">A</text>
  <text direction="ltr" x="22" y="224" text-anchor="middle" fill="#f0d080" font-weight="bold" font-size="18">B</text>
  <text direction="ltr" x="22" y="334" text-anchor="middle" fill="#f0d080" font-weight="bold" font-size="18">S</text>

  <!-- ── A wire: horizontal into AND_A.top ───────────────────────── -->
  <line x1="40"  y1="80"  x2="295" y2="80"  stroke="#f0d080" stroke-width="1.8"/>

  <!-- ── B wire: horizontal into AND_B.top ───────────────────────── -->
  <line x1="40"  y1="220" x2="295" y2="220" stroke="#f0d080" stroke-width="1.8"/>

  <!-- ── Bridge marker: BLUE CIRCLE between A wire and B wire ──── -->
  <!-- Vertical "short" line in the middle of the two parallel data wires.
       Dashed to indicate a physical short across what should be two
       independent nets. -->
  <line x1="180" y1="80"  x2="180" y2="220" stroke="#80c8ff" stroke-width="1.6" stroke-dasharray="4 3"/>
  <!-- Small dots where the bridge attaches to each wire -->
  <circle cx="180" cy="80"  r="3.5" fill="#80c8ff"/>
  <circle cx="180" cy="220" r="3.5" fill="#80c8ff"/>
  <!-- ★★★ FAULT MARKER ★★★ -->
  <circle cx="180" cy="150" r="11" fill="#80c8ff" stroke="#3060a0" stroke-width="2.4"/>
  <text direction="ltr" x="202" y="154" text-anchor="start" fill="#80c8ff" font-size="16" font-weight="bold">bridge</text>

  <!-- ── S wire: fanout to AND_A bottom (UP) and INV (RIGHT) ───── -->
  <line x1="40"  y1="330" x2="110" y2="330" stroke="#f0d080" stroke-width="1.8"/>
  <circle cx="110" cy="330" r="3.8" fill="#f0d080"/>
  <!-- UP to AND_A bottom -->
  <line x1="110" y1="330" x2="110" y2="110" stroke="#f0d080" stroke-width="1.8"/>
  <line x1="110" y1="110" x2="295" y2="110" stroke="#f0d080" stroke-width="1.8"/>
  <!-- RIGHT to INV input -->
  <line x1="110" y1="330" x2="245" y2="330" stroke="#f0d080" stroke-width="1.8"/>

  <!-- ── INV: triangle pointing RIGHT, bubble on right tip ──────── -->
  <polygon points="245,314 245,346 278,330" fill="#0a1825" stroke="#80d4ff" stroke-width="1.8"/>
  <circle cx="283" cy="330" r="5" fill="#0a1825" stroke="#80d4ff" stroke-width="1.8"/>
  <text direction="ltr" x="262" y="368" text-anchor="middle" fill="#80d4ff" font-size="16" font-style="italic">INV</text>

  <!-- ── ¬S wire: from INV bubble → up → into AND_B bottom ─────── -->
  <line x1="288" y1="330" x2="320" y2="330" stroke="#80d4ff" stroke-width="1.8"/>
  <line x1="320" y1="330" x2="320" y2="250" stroke="#80d4ff" stroke-width="1.8"/>
  <line x1="320" y1="250" x2="295" y2="250" stroke="#80d4ff" stroke-width="1.8"/>
  <text direction="ltr" x="335" y="298" text-anchor="start" fill="#80d4ff" font-size="16" font-style="italic">¬S</text>

  <!-- ── AND_A: 2-input AND, takes A and S ─────────────────────── -->
  <path d="M 295 65 L 295 125 L 330 125 A 30 30 0 0 0 330 65 Z"
        fill="#102818" stroke="#80f0a0" stroke-width="1.8"/>
  <text direction="ltr" x="316" y="100" text-anchor="middle" fill="#80f0a0" font-size="16" font-weight="bold">AND</text>

  <!-- ── AND_B: 2-input AND, takes B and ¬S ────────────────────── -->
  <path d="M 295 205 L 295 265 L 330 265 A 30 30 0 0 0 330 205 Z"
        fill="#102818" stroke="#80f0a0" stroke-width="1.8"/>
  <text direction="ltr" x="316" y="240" text-anchor="middle" fill="#80f0a0" font-size="16" font-weight="bold">AND</text>

  <!-- AND_A output → OR top input -->
  <line x1="360" y1="95" x2="450" y2="95"  stroke="#80f0a0" stroke-width="1.6"/>
  <line x1="450" y1="95" x2="450" y2="155" stroke="#80f0a0" stroke-width="1.6"/>
  <line x1="450" y1="155" x2="475" y2="155" stroke="#80f0a0" stroke-width="1.6"/>

  <!-- AND_B output → OR bottom input -->
  <line x1="360" y1="235" x2="450" y2="235" stroke="#80f0a0" stroke-width="1.6"/>
  <line x1="450" y1="235" x2="450" y2="195" stroke="#80f0a0" stroke-width="1.6"/>
  <line x1="450" y1="195" x2="475" y2="195" stroke="#80f0a0" stroke-width="1.6"/>

  <!-- ── OR gate ───────────────────────────────────────────────── -->
  <path d="M 470 135 Q 490 175 470 215 Q 510 215 540 195 Q 565 175 540 155 Q 510 135 470 135 Z"
        fill="#0a1825" stroke="#80d4ff" stroke-width="1.8"/>
  <path d="M 463 135 Q 483 175 463 215" fill="none" stroke="#80d4ff" stroke-width="1.8"/>
  <text direction="ltr" x="508" y="180" text-anchor="middle" fill="#80d4ff" font-size="16" font-weight="bold">OR</text>

  <!-- ── OR output → Out ───────────────────────────────────────── -->
  <line x1="565" y1="175" x2="625" y2="175" stroke="#80f0a0" stroke-width="2.4" marker-end="url(#dft5arr)"/>
  <text direction="ltr" x="665" y="181" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="18">Out</text>

  <!-- Caption -->
  <text direction="ltr" x="360" y="362" text-anchor="middle" fill="#a0a0c0" font-size="16" font-style="italic">
    Out = S·A + ¬S·B = (S ? A : B)   (when fault-free)
  </text>
</svg>`,
    parts: [
      {
        label: null,
        question: 'מה הפונקציה הלוגית של המעגל ללא תקלה? ומה היא הופכת להיות תחת כל אחד מהשני סוגי הקצר? כמה וקטורי בדיקה מינימליים נדרשים, ומה הם?',
        hints: [
          'התחל בזיהוי הטופולוגיה: זוהי מימוש של MUX 2:1 ברמת שערים. \`Out = (S·A) + (¬S·B) = (S ? A : B)\`.',
          'תובנת מפתח: כשיש קצר בין שני קווי הדאטה, **שני הקווים נושאים אותו ערך**. הערך תלוי בסוג הקצר:\\n• wired-AND: שני הקווים = \`A · B\`.\\n• wired-OR: שני הקווים = \`A + B\`.',
          'הצב את הערך המשותף בפונקציה. עבור wired-AND, שניהם נראים כ-\`(A·B)\` עבור ה-AND שלהם. אז \`Out = S·(A·B) + ¬S·(A·B) = (A·B)·(S + ¬S) = A·B\` — **\`S\` נעלם!**',
          'באופן דומה ל-wired-OR: \`Out = S·(A+B) + ¬S·(A+B) = A+B\`. **\`S\` נעלם גם פה!**',
          'אז יש 3 תרחישים: \`free = S?A:B\`, \`AND-bridge = A·B\`, \`OR-bridge = A+B\`. כדי **להפעיל** את הקצר חייבים \`A ≠ B\` (אחרת \`A·B = A+B = A = B\` ואין הבחנה).',
          'כדי **להבחין** בין AND ל-OR צריך לבדוק **את שני ערכי \`S\`**. עם \`A≠B\` ושני ערכי \`S\` — 2 וקטורים בלבד עושים את העבודה. למשל \`(0,1,0)\` ו-\`(0,1,1)\`.',
        ],
        answerSchematic: `
<svg viewBox="0 0 1240 660" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Truth-table comparison showing how the bridge erases the MUX's S-dependence.">
  <rect x="0" y="0" width="1240" height="62" fill="#0c1a28"/>
  <text direction="ltr" x="620" y="28" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="20">
    Bridge erases the MUX's S-dependence — Out becomes independent of S
  </text>
  <text direction="ltr" x="620" y="52" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">
    free = (S ? A : B)   ·   AND-bridge = A·B   ·   OR-bridge = A+B
  </text>

  <!-- ── Truth-table panel ──────────────────────────────────────── -->
  <rect x="50" y="82" width="1140" height="540" rx="10" fill="#0e1218" stroke="#3a2818" stroke-width="1.6"/>
  <text direction="ltr" x="620" y="118" text-anchor="middle" fill="#ffc890" font-weight="bold" font-size="20" letter-spacing="3">
    OUT(A, B, S) UNDER EACH SCENARIO
  </text>

  <g font-family="'JetBrains Mono', monospace" font-size="18" font-weight="bold" fill="#cca040">
    <text x="135" y="160" text-anchor="middle">A</text>
    <text x="230" y="160" text-anchor="middle">B</text>
    <text x="325" y="160" text-anchor="middle">S</text>
    <text x="525" y="160" text-anchor="middle">Free = (S?A:B)</text>
    <text x="790" y="160" text-anchor="middle">AND-bridge = A·B</text>
    <text x="1050" y="160" text-anchor="middle">OR-bridge = A+B</text>
  </g>
  <line x1="80" y1="175" x2="1160" y2="175" stroke="#402a00" stroke-width="1.4"/>

  ${[
    [0,0,0, 0, 0, 0, null],
    [0,0,1, 0, 0, 0, null],
    [0,1,0, 1, 0, 1, 'and'],
    [0,1,1, 0, 0, 1, 'or'],
    [1,0,0, 0, 0, 1, 'or'],
    [1,0,1, 1, 0, 1, 'and'],
    [1,1,0, 1, 1, 1, null],
    [1,1,1, 1, 1, 1, null],
  ].map(([a,b,s,free,andBr,orBr,kind], i) => {
    const y = 215 + i * 48;
    const active = kind !== null;
    const rowBg = active
      ? '<rect x="80" y="' + (y - 26) + '" width="1080" height="42" fill="rgba(64,204,96,0.08)" stroke="rgba(64,204,96,0.35)" stroke-width="1.4" rx="4"/>'
      : '<rect x="80" y="' + (y - 26) + '" width="1080" height="42" fill="rgba(80,80,80,0.05)" stroke="rgba(80,80,80,0.22)" stroke-width="1.2" rx="4" stroke-dasharray="4 4"/>';
    const noteEl = active
      ? '<text direction="ltr" x="1180" y="' + (y + 6) + '" text-anchor="middle" fill="#80f0a0" font-size="20" font-weight="bold">⚡</text>'
      : '<text direction="ltr" x="1180" y="' + (y + 6) + '" text-anchor="middle" fill="#666" font-size="18">—</text>';
    return `
      ${rowBg}
      <text direction="ltr" x="135"  y="${y + 6}" text-anchor="middle" fill="#${a?'80f0a0':'506080'}" font-weight="bold" font-size="20">${a}</text>
      <text direction="ltr" x="230"  y="${y + 6}" text-anchor="middle" fill="#${b?'80f0a0':'506080'}" font-weight="bold" font-size="20">${b}</text>
      <text direction="ltr" x="325"  y="${y + 6}" text-anchor="middle" fill="#${s?'80f0a0':'506080'}" font-weight="bold" font-size="20">${s}</text>
      <text direction="ltr" x="525"  y="${y + 6}" text-anchor="middle" fill="#${free?'80f0a0':'506080'}" font-weight="bold" font-size="20">${free}</text>
      <text direction="ltr" x="790"  y="${y + 6}" text-anchor="middle" fill="#${andBr?'80f0a0':'506080'}" font-weight="bold" font-size="20">${andBr}</text>
      <text direction="ltr" x="1050" y="${y + 6}" text-anchor="middle" fill="#${orBr?'80f0a0':'506080'}" font-weight="bold" font-size="20">${orBr}</text>
      ${noteEl}
    `;
  }).join('')}

  <text direction="ltr" x="620" y="645" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">
    ⚡ rows = vectors that activate the bridge (require A ≠ B).   Dashed rows = transparent.
  </text>
</svg>`,
        answer:
`**מינימום: 2 וקטורי בדיקה — חייבים \`A ≠ B\` ושני ערכי \`S\` שונים.** למשל \`(A,B,S) = (0,1,0)\` ו-\`(0,1,1)\`.

### תובנת המפתח — הקצר מוחק את \`S\`

בריג בין שני קווי הדאטה גורם לשני הקווים לשאת אותו ערך משותף:
- **wired-AND**: שני הקווים = \`A · B\`
- **wired-OR**: שני הקווים = \`A + B\`

נציב בפונקציית ה-MUX:
\`\`\`
Out = S · (data_top) + ¬S · (data_bottom)

free       : Out = S · A   + ¬S · B   = (S ? A : B)
AND-bridge : Out = S · (A·B) + ¬S · (A·B) = (A·B) · (S + ¬S) = A · B
OR-bridge  : Out = S · (A+B) + ¬S · (A+B) = (A+B) · (S + ¬S) = A + B
\`\`\`

**ה-\`S\` נעלם** משתי פונקציות ה-bridge — שני הקווים נושאים את אותו ערך, אז ה-MUX לא יכול להפריד ביניהם. זוהי תכונה כללית של bridge בין data lines של MUX.

### למה צריך \`A ≠ B\`

אם \`A = B\` אז \`A·B = A+B = A = B\`, וכל שלוש הפונקציות נותנות אותו פלט. הקצר "שקוף". חייבים \`A ≠ B\` כדי שהקצר ישפיע.

### למה צריך שני ערכי \`S\`

עם \`A ≠ B\` קבוע, נסתכל על שני ערכי \`S\`:
- \`S=0\` (free בוחר ב-B): free=B, AND=A·B, OR=A+B. אם A=0, B=1: free=1, AND=0, OR=1.
- \`S=1\` (free בוחר ב-A): free=A, AND=A·B, OR=A+B. אם A=0, B=1: free=0, AND=0, OR=1.

| (A,B,S) | Free | AND-br | OR-br |
|---|:---:|:---:|:---:|
| (0,1,0) | **1** | **0** | **1** |
| (0,1,1) | **0** | **0** | **1** |

**סיגנטורות נפרדות:** Free=(1,0), AND-br=(0,0), OR-br=(1,1). שלוש שונות, הבחנה מלאה.

### למה לא וקטור יחיד

3 תסריטים → דורש \`⌈log₂(3)⌉ = 2\` וקטורים. וקטור בודד יכול לחלק לכל היותר ל-2 קבוצות.

### מלכודות נפוצות

1. **בחירת A=B**: כל בחירה כזו "שוטפת" את הקצר → הבחנה בלתי-אפשרית. רוב התלמידים יבחרו \`(1,1,0)\` או דומה ויחשבו שזה מספיק.
2. **שני וקטורים עם אותו S**: אי-אפשר להבחין AND מ-OR אם \`S\` קבוע. למשל \`(0,1,0) + (1,0,0)\` נותנים זוג סיגנטורות צמודות שלא מספיק.
3. **התעלמות מסימטריה ב-A vs B**: \`(0,1,0)\` ו-\`(1,0,1)\` נותנים את אותה תוצאה ל-AND ו-OR — מתועה אבל לא מבחין כי שניהם מעבירים \`A→Out\` או \`B→Out\` בצורה סימטרית.

המעגל החי למטה — שורה 1 (free), שורה 2 (AND-bridge), שורה 3 (OR-bridge). שנה את \`A/B/S\` והפלט של 3 השורות יתפצל בקצוות.`,
        interviewerMindset:
`**שאלה ברמת קושי גבוהה** — דורשת הבנה של כמה שכבות:

1. **זיהוי טופולוגיית ה-MUX** — ראש מועמד צריך לראות מיד \`(S·A) + (¬S·B)\` כ-MUX ולא להיתקע בניתוח שערים נקודתי.
2. **סמנטיקה של bridge** — wired-AND ו-wired-OR הם שני מודלים פיזיקליים שונים (CMOS pull-down vs pull-up). מועמד שלא יודע את ההבחנה מחמיץ את הכל.
3. **התובנה ש-\`S\` נמחק** — זה ה-"אהה" של השאלה. הקצר משבית את התלות התכלת המטרית של ה-MUX. מועמד שמזהה את זה ישר ניגש לוקטורים.
4. **שלוש דרישות לוקטורים**: \`A≠B\` להפעלה, שני ערכי \`S\` להבחנה. שלושה תנאים בלתי-תלויים.

**שאלת המשך מתבקשת:** "ומה אם הקצר היה בין \`S\` ל-\`¬S\` (קווי הסלקט)?" — תשובה: \`S = ¬S\`. wired-AND: שניהם = \`S·¬S = 0\` → \`Out = 0·A + 0·B = 0\` תמיד. wired-OR: שניהם = \`S+¬S = 1\` → \`Out = A + B\` תמיד. שתי תקלות שונות מהראשונות, ושני מודלים שונים.

**שאלת bonus תאורטית:** "במציאות, האם הקצר באמת סימטרי?" — לא. בסיליקון אמיתי, בדרך כלל יש "dominator" — הקו עם הציר חזק יותר מנצח. מודלים אמיתיים: A-dominated (B נמשך לערך של A), B-dominated, AND-bridge, OR-bridge. ATPG מסחרי מנתח את כל ארבעת המודלים בנפרד.

**שאלת bonus ל-design**: "איך מתגוננים מ-bridge faults?" — שמירה על מרווחים בין routes (DRC rules), שכבות metal שונות לקווים שכנים, ו-PVT testing במהלך production.`,
        expectedAnswers: [
          '2', 'two', 'שני', 'שניים',
          '(0,1,0)', '(0,1,1)', '(1,0,0)', '(1,0,1)',
          'minimum', 'מינימום', 'מינימלי',
          'bridge', 'גשר', 'קצר',
          'wired-and', 'wired and', 'wired-or', 'wired or',
          'mux', 'multiplexer', 'מולטיפלקסר',
          'A != B', 'A ≠ B', 'A neq B',
          'select', 's=0', 's=1',
          'erase', 'eliminate', 'eliminates', 'מוחק', 'מבטל',
        ],
      },
    ],
    source: 'אחות לשאלות #6003 / #6004 — תקלת bridge בין קווי data של MUX',
    tags: ['bridge', 'wired-and', 'wired-or', 'mux', 'atpg', 'fault-detection', 'dft'],
    circuitRevealsAnswer: true,
    // Canvas: 3 parallel rows of the same gate-level 2:1 MUX, sharing
    // A, B, and S inputs.
    //   Row 1 — fault-free.
    //   Row 2 — wires (A→AND_A) and (B→AND_B) bridged with bridgeMode='and'.
    //   Row 3 — same wires bridged with bridgeMode='or'.
    // Default (A,B,S) = (0,1,0):
    //   Out (free)  = ¬S·B = 1·1 = 1
    //   Out (AND-bridge) = A·B = 0·1 = 0     ← differs from free
    //   Out (OR-bridge)  = A+B = 0+1 = 1     ← matches free
    // Flip S to 1 → free = A = 0; AND = 0; OR = 1.  Now OR differs.
    circuit: () => build(() => {
      // Layout: inputs stacked on the LEFT, three scenario COLUMNS
      // stretching out to the RIGHT (side-by-side instead of stacked
      // vertically). Each column is one variant of the MUX:
      //   col 1 — fault-free
      //   col 2 — wires (A→AND_A) and (B→AND_B) bridged in wired-AND mode
      //   col 3 — same wires bridged in wired-OR mode
      // A horizontal trunk wire from each input feeds the corresponding
      // pin on all three columns — no zig-zagging across vertical rows.
      const A    = h.input(80,  100, 'A');     A.fixedValue = 0;
      const B    = h.input(80,  280, 'B');     B.fixedValue = 1;
      const S    = h.input(80,  460, 'S');     S.fixedValue = 0;
      const notS = h.gate('NOT', 260, 460);

      const mkColumn = (xLeft, label) => ({
        andA: h.gate('AND', xLeft,         140),    // top half — fed by A and S
        andB: h.gate('AND', xLeft,         320),    // bot half — fed by B and ¬S
        or1:  h.gate('OR',  xLeft + 180,   230),    // collects both ANDs
        out:  h.output(xLeft + 360,        230, label),
      });
      const c1 = mkColumn(500,  'Out (free)');
      const c2 = mkColumn(960,  'Out (AND-br)');
      const c3 = mkColumn(1420, 'Out (OR-br)');

      const wires = [];
      const wireCol = (col, mode) => {
        const wA = h.wire(A.id, col.andA.id, 0);    // A → AND_A.top  (BRIDGE SITE)
        const wB = h.wire(B.id, col.andB.id, 0);    // B → AND_B.top  (BRIDGE SITE)
        wires.push(wA);
        wires.push(wB);
        wires.push(h.wire(S.id,    col.andA.id, 1));
        wires.push(h.wire(notS.id, col.andB.id, 1));
        wires.push(h.wire(col.andA.id, col.or1.id, 0));
        wires.push(h.wire(col.andB.id, col.or1.id, 1));
        wires.push(h.wire(col.or1.id,  col.out.id, 0));
        if (mode) {
          // Symmetric bridge: each wire references the other, both
          // share the same bridgeMode. The engine resolves both wires
          // to (A·B) under 'and' / (A+B) under 'or' via _applyWireFault.
          wA.bridgedWith = wB.id;  wA.bridgeMode = mode;
          wB.bridgedWith = wA.id;  wB.bridgeMode = mode;
        }
      };
      wireCol(c1, null);     // fault-free
      wireCol(c2, 'and');    // wired-AND bridge
      wireCol(c3, 'or');     // wired-OR bridge

      // S → INV (shared by all three columns)
      wires.push(h.wire(S.id, notS.id, 0));

      return {
        nodes: [
          A, B, S, notS,
          c1.andA, c1.andB, c1.or1, c1.out,
          c2.andA, c2.andB, c2.or1, c2.out,
          c3.andA, c3.andB, c3.or1, c3.out,
        ],
        wires,
      };
    }),
  },

  // ───────────────────────────────────────────────────────────────
  // #6006 — Memory test strategy on an 8×8 RAM. Two-part conceptual
  //         question, exercises the full MemoryTestRunner pipeline:
  //   Part א — single stuck-at cell. Goal: find which cell + polarity.
  //   Part ב — cell-to-cell parasitic coupling (capacitive). Goal:
  //            recommend test patterns that catch it.
  //   Live circuit drops an 8-addr × 8-bit RAM on the canvas so the
  //   student can inject faults via the MEMORY BIST cell-fault grid
  //   (STUCK mode) and the COUPLE mode, then run patterns from the
  //   MEMORY TESTS section to verify their answer end-to-end.
  // ───────────────────────────────────────────────────────────────
  {
    id: 'ram-8x8-stuck-coupling-strategy',
    difficulty: 'hard',
    title: 'בדיקת זיכרון RAM 8×8 — תאים תקועים וקיבול פרזיטי',
    intro:
`נתון \`RAM\` של **8 כתובות × 8 ביטים** (סה"כ 64 תאי-ביט).
תכנן אסטרטגיית בדיקות שתאתר תקלות במעגל הזיכרון. שתי תקלות אפשריות:

- **תא בודד תקוע** ב-\`0\` או ב-\`1\` בלי קשר למה שנכתב אליו.
- **תא משפיע על תא אחר** (קיבול פרזיטי בין שני תאי SRAM/DRAM שכנים).

לכל סוג תקלה — איזה דפוסי בדיקה תריץ, באיזה סדר, וכמה אופרציות נדרשות?`,
    schematic: `
<svg viewBox="0 0 900 1180" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="20" role="img" aria-label="Two stacked 8x8 RAM grids: stuck-at example on top, coupling pair below.">

  <!-- ===================== TOP HEADER ===================== -->
  <text x="450" y="42" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    RAM 8 × 8 — שני סוגי תקלות
  </text>
  <text x="450" y="74" text-anchor="middle" fill="#a0a0c0" font-size="20" font-style="italic">
    8 addresses (rows) × 8 bits per word (columns)
  </text>

  <!-- ============================================================ -->
  <!-- =============== PANEL A: Part א (stuck-at) ================= -->
  <!-- ============================================================ -->
  <rect x="20" y="100" width="860" height="490" rx="12"
        fill="rgba(255,80,80,0.05)" stroke="rgba(255,96,96,0.6)" stroke-width="2"/>

  <text x="450" y="140" text-anchor="middle" fill="#ff8a8a" font-weight="bold" font-size="28">
    סעיף א — תא בודד תקוע
  </text>
  <text x="450" y="168" text-anchor="middle" fill="#c8b090" font-size="20" font-style="italic">
    cell stuck at 0 or 1, regardless of writes
  </text>

  <!-- Bit column headers -->
  <g font-size="20" font-weight="bold" fill="#cca040">
    <text x="120" y="215" text-anchor="middle">addr</text>
    <text x="195" y="215" text-anchor="middle">b7</text>
    <text x="251" y="215" text-anchor="middle">b6</text>
    <text x="307" y="215" text-anchor="middle">b5</text>
    <text x="363" y="215" text-anchor="middle">b4</text>
    <text x="419" y="215" text-anchor="middle">b3</text>
    <text x="475" y="215" text-anchor="middle">b2</text>
    <text x="531" y="215" text-anchor="middle">b1</text>
    <text x="587" y="215" text-anchor="middle">b0</text>
  </g>

  <!-- 8x8 grid: stuck-at only -->
  ${Array.from({ length: 8 }, (_, a) => {
    const y = 235 + a * 38;
    const addrLabel = `<text x="120" y="${y + 27}" text-anchor="middle" fill="#c8b090" font-size="20" font-weight="bold">${a}</text>`;
    const cells = Array.from({ length: 8 }, (_, b) => {
      const x = 170 + b * 56;
      let fill = '#0a1825', stroke = '#3a4a60', strokeW = 1.6;
      let dot = '';
      if (a === 3 && b === 3) {
        fill = '#3a0a14';
        stroke = '#ff6060';
        strokeW = 3;
        dot = `<text x="${x + 25}" y="${y + 30}" text-anchor="middle" fill="#ff6060" font-weight="bold" font-size="28">?</text>`;
      }
      return `<rect x="${x}" y="${y + 2}" width="50" height="34" rx="5" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}"/>${dot}`;
    }).join('');
    return addrLabel + cells;
  }).join('')}

  <!-- Explanation under grid -->
  <text x="450" y="550" text-anchor="middle" fill="#ff8080" font-size="20" font-weight="bold">
    קריאה ≠ כתיבה — התא תמיד מחזיר את ערכו התקוע
  </text>
  <text x="450" y="580" text-anchor="middle" fill="#ffe080" font-size="20" font-weight="bold">
    המטרה: לאתר את התא + ערך התקלה (0 או 1)
  </text>

  <!-- ============================================================ -->
  <!-- =============== PANEL B: Part ב (coupling) ================= -->
  <!-- ============================================================ -->
  <rect x="20" y="620" width="860" height="540" rx="12"
        fill="rgba(204,102,255,0.05)" stroke="rgba(204,102,255,0.6)" stroke-width="2"/>

  <text x="450" y="660" text-anchor="middle" fill="#d699ff" font-weight="bold" font-size="28">
    סעיף ב — קיבול פרזיטי בין תאים
  </text>
  <text x="450" y="688" text-anchor="middle" fill="#c8b090" font-size="20" font-style="italic">
    write to A leaks into B (parasitic capacitance)
  </text>

  <!-- Bit column headers -->
  <g font-size="20" font-weight="bold" fill="#cca040">
    <text x="120" y="735" text-anchor="middle">addr</text>
    <text x="195" y="735" text-anchor="middle">b7</text>
    <text x="251" y="735" text-anchor="middle">b6</text>
    <text x="307" y="735" text-anchor="middle">b5</text>
    <text x="363" y="735" text-anchor="middle">b4</text>
    <text x="419" y="735" text-anchor="middle">b3</text>
    <text x="475" y="735" text-anchor="middle">b2</text>
    <text x="531" y="735" text-anchor="middle">b1</text>
    <text x="587" y="735" text-anchor="middle">b0</text>
  </g>

  <!-- 8x8 grid: coupling pair only -->
  ${Array.from({ length: 8 }, (_, a) => {
    const y = 755 + a * 38;
    const addrLabel = `<text x="120" y="${y + 27}" text-anchor="middle" fill="#c8b090" font-size="20" font-weight="bold">${a}</text>`;
    const cells = Array.from({ length: 8 }, (_, b) => {
      const x = 170 + b * 56;
      let fill = '#0a1825', stroke = '#3a4a60', strokeW = 1.6;
      let dot = '';
      if (a === 1 && b === 5) {
        fill = '#1a0a2a'; stroke = '#cc66ff'; strokeW = 3;
        dot = `<text x="${x + 25}" y="${y + 30}" text-anchor="middle" fill="#cc66ff" font-weight="bold" font-size="28">A</text>`;
      } else if (a === 6 && b === 5) {
        fill = '#1a0a2a'; stroke = '#cc66ff'; strokeW = 3;
        dot = `<text x="${x + 25}" y="${y + 30}" text-anchor="middle" fill="#cc66ff" font-weight="bold" font-size="28">B</text>`;
      }
      return `<rect x="${x}" y="${y + 2}" width="50" height="34" rx="5" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}"/>${dot}`;
    }).join('');
    return addrLabel + cells;
  }).join('')}

  <!-- Curved arrow A→B
       A cell: x=170+5*56=450, y=755+1*38+2=795. Right-edge centre (500, 814).
       B cell: x=450, y=755+6*38+2=985. Right-edge centre (500, 1004). -->
  <defs>
    <marker id="arrowB6006" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 Z" fill="#cc66ff"/>
    </marker>
  </defs>
  <path d="M 500 814 C 660 855, 660 970, 500 1004"
        stroke="#cc66ff" stroke-width="2.8" fill="none"
        stroke-dasharray="8,5" opacity="0.9"
        marker-end="url(#arrowB6006)"/>
  <text x="680" y="912" text-anchor="middle" fill="#cc99ff" font-size="20" font-weight="bold">
    coupling
  </text>

  <!-- Explanation under grid -->
  <text x="450" y="1100" text-anchor="middle" fill="#d699ff" font-size="20" font-weight="bold">
    כתיבה ל-A → משפיעה על ערכו של B
  </text>
  <text x="450" y="1130" text-anchor="middle" fill="#ffe080" font-size="20" font-weight="bold">
    המטרה: לזהות aggressor + victim
  </text>
</svg>`,
    parts: [
      {
        label: 'א',
        question: 'אילו דפוסי בדיקה תריץ כדי לזהות **איזה תא** ב-RAM תקוע ו-**לאיזה ערך** (0 או 1)? כמה אופרציות נדרשות?',
        hints: [
          'תקלת \`stuck-at-1\`: התא תמיד מחזיר \`1\` בקריאה, בלי קשר למה שכתבת. תקלת \`stuck-at-0\`: הפוך.',
          'אסטרטגיה בסיסית: כתוב ערך ידוע לכל התאים, וקרא אותם בחזרה. כל קריאה שונה מהצפי → תא תקול.',
          'דפוס **All-zero**: כתוב \`0\` לכל \`N\` התאים, קרא את כולם. כל תא שמחזיר \`1\` הוא **\`s-a-1\`**.',
          'דפוס **All-one**: כתוב \`0xFF\` לכל התאים, קרא. כל תא שמחזיר ערך שאינו \`0xFF\` הוא **\`s-a-0\`** (וברמת ביט אפשר לדעת באיזה ביט).',
          'מינימום אופרציות לזיהוי שלם: שני דפוסים × (\`N\` write + \`N\` read) = **\`4N\` ops**. עבור N=8: 32 ops.',
          '**שדרוג**: דפוס \`Address-as-data\` (כתוב את כתובת A כערך לתא A) מזהה בנוסף **בעיות במקודד הכתובות** (decoder bugs). ב-\`2N\` ops, חסכוני יותר אבל מאתר תאים פגומים רק כשהערך השונה מבדיל.',
        ],
        answer:
`**אסטרטגיה: All-zero + All-one. סה"כ \`4N = 32\` אופרציות, מזהה את התא ואת ערך התקלה.**

| שלב | פעולה | מאתר |
|---|---|---|
| 1 | כתוב \`0\` לכל הכתובות, קרא הכל | קריאה ≠ 0 → תא **s-a-1** |
| 2 | כתוב \`0xFF\` לכל הכתובות, קרא הכל | קריאה ≠ 0xFF → תא **s-a-0** |

- **למה גם וגם**: All-zero לבד עיוור ל-s-a-0; All-one לבד עיוור ל-s-a-1. חייבים שתי קוטביות.
- **שדרוג Address-as-data**: \`mem[A] = A\` ב-\`2N = 16\` ops; גם תופס decoder bugs (write→cell לא נכון).

### בקנבס — תקלה מוזרקת

ב-RAM יש stuck-at-1 על \`addr=3, b4\`. הרץ \`MEMORY TESTS\`:
- **All-zero** → **FAIL בכתובת 3** (קוראים \`0x10\` במקום \`0x00\`)
- **All-one** → **PASS** (הביט התקוע תואם)`,
        interviewerMindset:
`**שאלת בסיס** בראיון memory-test. המראיין מחפש:

1. **שאתה מבחין בין \`s-a-0\` ל-\`s-a-1\`** — שני דפוסים שונים, אחד לא מספיק.
2. **שאתה לא ממציא דפוס מסובך** — All-zero + All-one זה הזוג הקלאסי, פשוט וכיסוי מלא לתקלת stuck-at.
3. **שאתה זוכר את \`Address-as-data\`** — bonus שמראה מודעות ל-decoder bugs בלי לעלות בזמן.
4. **שאתה מקבל ספירה נכונה**: \`4N\` ops. מועמד שמדבר על "כמה זמן זה לוקח" בלי לקבע מספר — חסר.

**שאלת המשך נפוצה**: "ומה אם כמה תאים תקועים בו-זמנית?" — אותו מסלול עובד; כל מיקום פגום מתגלה בנפרד. מועמד שיגיד "צריך דפוס מורכב יותר" טועה — single-stuck-at fault model הוא linear ומכסה גם מספר תאים פגומים בו-זמנית (כל אחד נחשף ב-vector שלו).

**שאלה תאורטית bonus**: "מה ה-information-theoretic lower bound לזיהוי תא תקול?" — צריך לזהות אחד מתוך \`2N\` אפשרויות (N תאים × 2 קוטביות), אז \`⌈log₂(2N)⌉ = log₂N + 1\` בדיקות \`yes/no\`. עבור N=8: 4 קריאות בלבד מבחינה תאורטית. בפועל אנחנו מבזבזים יותר כי ה-RAM קורא word-by-word, אבל זה ה-floor.`,
        expectedAnswers: [
          'all-zero', 'all zero', 'allzero',
          'all-one', 'all one', 'allone',
          '4N', '4n', '32', 'thirty-two',
          'stuck-at', 's-a-0', 's-a-1',
          'address-as-data', 'address as data',
          'write', 'read', 'compare',
          'decoder',
        ],
        // Live circuit for part א: an 8×8 RAM with cell at addr=3,
        // bit 4 stuck at 1. The student opens MEMORY TESTS, picks
        // All-zero → RUN → sees FAIL at addr=3 (bit 4 reads 1 not 0).
        // Then picks All-one → PASS (the stuck-1 matches the expected 1).
        // This visualises the "need both polarities" insight.
        circuit: () => build(() => {
          const ram = h.block('RAM', 480, 280, {
            addrBits: 3,
            dataBits: 8,
            label: 'RAM 8×8 — תא 3·b4 תקוע ב-1',
          });
          ram.cellFaults = {
            3: { stuckAt: 1, bit: 4 },
          };
          return { nodes: [ram], wires: [] };
        }),
      },
      {
        label: 'ב',
        question: 'אילו דפוסי בדיקה תריץ כדי לזהות **שני תאים שמשפיעים זה על זה** (קיבול פרזיטי)? מה ההבדל מבדיקת stuck-at, ולמה All-zero/All-one **לא** תופסים את התקלה הזו?',
        hints: [
          'קיבול פרזיטי בין תאים = **coupling fault**. סוגים קלאסיים: \`CFin\` (כתיבה ב-A הופכת את B), \`CFid\` (כתיבה ב-A כופה ערך קבוע ל-B), \`CFst\` (תא A במצב מסוים כופה את B).',
          'למה All-zero/All-one **לא** עובדים: שניהם כותבים אותו ערך לכל התאים. אז \`A·B = A+B = A = B\` ואין mismatch בין מה שאמור להיות לבין מה שיש — הקיבול לא משנה כלום.',
          'הרעיון המרכזי: צריך **קונטרסט בין תאים שכנים**. תא A בערך אחד, תא B בערך הפוך, ואז לכתוב ל-A ולקרוא את B.',
          'דפוס **Walking-1**: background של 0 לכל התאים. לכל תא \`c\` בנפרד: כתוב \`1\` ל-c, ואז **cross-read** את כל התאים האחרים — אם הם מחזירים \`0\` הכל בסדר; אם תא אחר מחזיר \`1\` → coupling מ-c לאותו תא.',
          'דפוס **Walking-0**: הפוך — background של 1, walk-0 דרך כל תא. תופס את התקלות שתלויות במעבר \`1→0\` במקום \`0→1\`.',
          'שני ה-walkings הללו תופסים יחד \`CFin\` ו-\`CFid\` בשני הכיוונים. ל-\`CFst\` (state coupling) — דפוס שמותיר תא במצב מסוים תקופה ארוכה ואז קורא תאים שכנים. למשל **Checkerboard** או **All-one** + cross-reads.',
          'עלות: \`Walking-1\` על N תאים = \`N + N·(N+1) = N²+2N\` ops. ל-N=8: 80 ops לכל walking. סה"כ \`~160 ops\` לזוג Walking-1/Walking-0.',
        ],
        answer:
`**אסטרטגיה: Walking-1 + Walking-0 ל-\`CFin/CFid\`, + Checkerboard ל-\`CFst\`. ~176 ops ל-N=8.**

### למה All-zero / All-one לא עובדים

כל התאים נושאים אותו ערך → אין הפרש פוטנציאלי בין aggressor ל-victim → הקיבול שקוף לחלוטין. **חייבים קונטרסט בין תאים שכנים.**

### Walking-1 — תופס CFin/CFid בכיוון \`0→1\`

- אתחל הכל ל-\`0\`.
- לכל תא \`c\`: כתוב \`1\` ל-\`c\` · קרא \`c\` · **cross-read** את שאר התאים (אמורים להישאר \`0\`) · שחזר \`0\`.
- אם קריאה של תא אחר מחזירה \`1\` → coupling מ-\`c\` לאותו תא.
- עלות: \`N² + 2N\` ≈ 80 ops עבור N=8.

### Walking-0

הפוך: background \`0xFF\`, walk-0 דרך כל תא. תופס CFin/CFid בכיוון \`1→0\`.

### Checkerboard — תופס CFst

זוגיות = \`0xAA\`, אי-זוגיות = \`0x55\` → קונטרסט קבוע ⇒ חושף state-coupling. עלות: \`2N = 16\` ops.

| דפוס | תופס | ops (N=8) |
|---|---|---:|
| Walking-1 | CFin/CFid (0→1) | 80 |
| Walking-0 | CFin/CFid (1→0) | 80 |
| Checkerboard | CFst | 16 |

### בקנבס — תקלה מוזרקת

ב-RAM יש \`CFin(addr 1 → addr 6, 0→1)\`. הרץ:
- **All-zero** → **PASS** (אין transition \`0→1\` ל-addr 1; הקיבול שקוף)
- **All-one** → **PASS**
- **Walking-1** → **FAIL בכתובת 6** ✓

זוהי הוכחה ויזואלית: דפוסי same-value עיוורים ל-coupling, ו-Walking-1 תופס.`,
        interviewerMindset:
`**שאלה מתקדמת.** המראיין מחפש:

1. **שאתה מזהה שזה לא stuck-at** — coupling הוא class תקלות שונה, עם דפוסים אחרים. מועמד שיציע All-zero/All-one כפתרון — מפספס לחלוטין.
2. **שאתה מסביר *למה* All-zero לא עובד** — כי הקיבול דורש קונטרסט. זוהי תובנה כללית של memory testing.
3. **שאתה מכיר את \`Walking-1\`** ואת התפקיד של ה-**cross-read** (קריאת תאים שכנים אחרי כתיבה לתא ה"מטייל"). זה הלב של הדפוס.
4. **שאתה לא טוען ב-\`Walking-1\` בודד** — צריך גם Walking-0 לכיוון \`1→0\`.
5. **שאתה מבחין בין סוגי coupling** — CFin (transition flip), CFid (transition force), CFst (state-based). כלים מודרניים מודלים את כולם.
6. **שאתה מקבל ספירה נכונה** — \`O(N²)\` לעומת \`O(N)\` של stuck-at. זה לא חולשה, זה מבני.

**שאלת המשך**: "מתי מוותרים על Walking-1 בייצור?" — ב-RAMs גדולים (1M+ cells), Walking הופך לבלתי-מעשי (\`10¹²\` ops). מחליפים ב-March tests (March C−, March B) שמשיגים כיסוי דומה ב-\`O(N)\` ops על-ידי שילוב חכם של write+read+restore.

**שאלת bonus**: "האם יש coupling שאף Walking לא תופס?" — כן. **CFdyn** (dynamic coupling) דורש רצף של 3+ פעולות בזמן ספציפי. תופסים אותם רק עם דפוסים מותאמים, או אנליזה fail-aware של ה-design.

**bonus 2**: "במציאות, איפה הקיבול הזה מתרחש?" — בעיקר בין **bit-lines שכנים** ב-DRAM (cross-talk), ובין מילים שכנות (word-line crosstalk) ב-SRAM צפוף. ATE מודרני (Teradyne, Advantest) משלב BIST של March + targeted coupling tests.`,
        expectedAnswers: [
          'walking-1', 'walking 1', 'walking1',
          'walking-0', 'walking 0', 'walking0',
          'checkerboard',
          'cfin', 'cfid', 'cfst', 'coupling',
          'cross-read', 'cross read', 'crossread',
          'contrast', 'קונטרסט',
          'aggressor', 'victim',
          'n²', 'n^2', 'n squared',
        ],
        // Live circuit for part ב: 8×8 RAM with a CFin coupling
        // fault — write 0→1 to address 1 flips the contents of
        // address 6. The student picks Walking-1 → RUN → sees FAIL
        // at addr=6 (cross-read returns 0xFF instead of 0).
        // All-zero / All-one on the same RAM both PASS, demonstrating
        // why same-value patterns are blind to coupling.
        circuit: () => build(() => {
          const ram = h.block('RAM', 480, 280, {
            addrBits: 3,
            dataBits: 8,
            label: 'RAM 8×8 — CFin: addr 1 → addr 6',
          });
          ram.couplingFaults = [
            { aggressor: 1, victim: 6, type: 'CFin', trigger: '01' },
          ];
          return { nodes: [ram], wires: [] };
        }),
      },
    ],
    source: 'תכנון: סוגיה דו-חלקית — stuck-at vs coupling — סדרה DFT memory tests',
    tags: ['memory', 'ram', 'stuck-at', 'coupling', 'walking-1', 'walking-0', 'cfin', 'cfid', 'cfst', 'march', 'dft'],
    circuitRevealsAnswer: true,
  },

  // ─────────────────────────────────────────────────────────────
  // #6007 — Scan-FF structure: how a D-FF is extended to a Scan-FF
  //   Single part. Live circuit decomposes the Scan-FF into its
  //   parts (MUX 2:1 + D-FF) so the student can play with SE and
  //   observe which input (D vs SI) propagates.
  // ─────────────────────────────────────────────────────────────
  {
    id: 'scan-ff-structure-mux',
    difficulty: 'easy',
    title: 'Scan-FF — איך מרחיבים D-FF ל-Scan-FF?',
    intro:
`נתון \`D-FF\` רגיל (כניסת \`D\`, שעון \`CLK\`, יציאה \`Q\`). במעגלים סדרתיים גדולים מוסיפים תכונת **scan** ל-FF, כך שיוכל לעבוד גם כ-**shift-register** לטעינה ישירה וקריאה ישירה של ערכי בדיקה.

איזה רכיב נוסף הופך \`D-FF\` ל-\`Scan-FF\`? מה תפקידו של כל אחד מהאותות החדשים, ומה המחיר הביצועי?`,
    schematic: `
<svg viewBox="0 0 900 520" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="D-FF compared with a Scan-FF black box. Internals of the Scan-FF are hidden.">

  <text x="450" y="38" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    D-FF רגיל לעומת Scan-FF
  </text>
  <text x="450" y="66" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">
    מה צריך להוסיף בפנים כדי לתמוך ב-scan?
  </text>

  <!-- LEFT: regular D-FF -->
  <rect x="20" y="90" width="400" height="380" rx="12"
        fill="rgba(96,192,255,0.05)" stroke="rgba(128,212,255,0.55)" stroke-width="2"/>
  <text x="220" y="128" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="24">
    D-FF רגיל
  </text>

  <!-- D-FF body -->
  <rect x="180" y="220" width="120" height="120" rx="6" fill="#0a1825" stroke="#80c8ff" stroke-width="2.4"/>
  <text x="240" y="284" text-anchor="middle" fill="#c8d8f0" font-size="24" font-weight="bold">FF</text>

  <!-- D input -->
  <line x1="80" y1="252" x2="180" y2="252" stroke="#cca040" stroke-width="2"/>
  <text x="120" y="244" text-anchor="middle" fill="#cca040" font-size="20" font-weight="bold">D</text>
  <!-- CLK input -->
  <line x1="80" y1="308" x2="180" y2="308" stroke="#80f0a0" stroke-width="2"/>
  <text x="120" y="300" text-anchor="middle" fill="#80f0a0" font-size="20" font-weight="bold">CLK</text>
  <polyline points="180,300 192,308 180,316" fill="none" stroke="#80f0a0" stroke-width="2"/>
  <!-- Q output -->
  <line x1="300" y1="280" x2="380" y2="280" stroke="#ff9933" stroke-width="2"/>
  <text x="365" y="272" text-anchor="middle" fill="#ff9933" font-size="20" font-weight="bold">Q</text>

  <text x="220" y="380" text-anchor="middle" fill="#a0c0d0" font-size="18">
    2 כניסות: <tspan fill="#cca040" font-weight="bold">D</tspan>, <tspan fill="#80f0a0" font-weight="bold">CLK</tspan>
  </text>
  <text x="220" y="404" text-anchor="middle" fill="#a0c0d0" font-size="18">
    1 יציאה: <tspan fill="#ff9933" font-weight="bold">Q</tspan>
  </text>
  <text x="220" y="432" text-anchor="middle" fill="#a0c0d0" font-size="18" font-style="italic">
    כל clock: Q ← D
  </text>

  <!-- RIGHT: Scan-FF (BLACK BOX — internals hidden) -->
  <rect x="480" y="90" width="400" height="380" rx="12"
        fill="rgba(255,176,96,0.05)" stroke="rgba(255,176,96,0.55)" stroke-width="2"/>
  <text x="680" y="128" text-anchor="middle" fill="#ffc080" font-weight="bold" font-size="24">
    Scan-FF
  </text>

  <!-- Black box body with "?" inside -->
  <rect x="620" y="200" width="140" height="140" rx="6" fill="#0a1825" stroke="#ffc080" stroke-width="2.4" stroke-dasharray="5,4"/>
  <text x="690" y="280" text-anchor="middle" fill="#ffc080" font-size="32" font-weight="bold" opacity="0.85">?</text>

  <!-- D input -->
  <line x1="520" y1="222" x2="620" y2="222" stroke="#cca040" stroke-width="2"/>
  <text x="555" y="214" text-anchor="middle" fill="#cca040" font-size="20" font-weight="bold">D</text>
  <!-- SI input -->
  <line x1="520" y1="256" x2="620" y2="256" stroke="#cc66ff" stroke-width="2"/>
  <text x="555" y="248" text-anchor="middle" fill="#cc66ff" font-size="20" font-weight="bold">SI</text>
  <!-- SE input -->
  <line x1="520" y1="290" x2="620" y2="290" stroke="#80f0a0" stroke-width="2"/>
  <text x="555" y="282" text-anchor="middle" fill="#80f0a0" font-size="20" font-weight="bold">SE</text>
  <!-- CLK input -->
  <line x1="520" y1="324" x2="620" y2="324" stroke="#80f0a0" stroke-width="2"/>
  <text x="555" y="316" text-anchor="middle" fill="#80f0a0" font-size="20" font-weight="bold">CLK</text>
  <polyline points="620,316 632,324 620,332" fill="none" stroke="#80f0a0" stroke-width="2"/>
  <!-- Q output -->
  <line x1="760" y1="270" x2="850" y2="270" stroke="#ff9933" stroke-width="2"/>
  <text x="835" y="262" text-anchor="middle" fill="#ff9933" font-size="20" font-weight="bold">Q</text>

  <text x="680" y="380" text-anchor="middle" fill="#a0c0d0" font-size="18">
    4 כניסות, 1 יציאה — <tspan fill="#ffc080" font-weight="bold">איך זה בנוי בפנים?</tspan>
  </text>
  <text x="680" y="406" text-anchor="middle" fill="#a0c0d0" font-size="18" font-style="italic">
    SE=0: התנהג כמו D-FF רגיל
  </text>
  <text x="680" y="428" text-anchor="middle" fill="#a0c0d0" font-size="18" font-style="italic">
    SE=1: טען מ-SI במקום מ-D
  </text>
</svg>`,
    parts: [
      {
        label: 'א',
        question: 'כיצד מרחיבים D-FF רגיל ל-Scan-FF? ציין את הרכיב הנוסף, את האותות החדשים, ואת מחיר הביצועים.',
        hints: [
          'צריך לבחור בין שתי כניסות אפשריות ל-D של ה-FF: \`D\` הפונקציונלי לבין \`SI\` הסריקה.',
          'הבחירה נשלטת ע"י אות יחיד שמופץ לכל ה-FFs במעגל.',
          'במצב פונקציונלי רגיל, ה-FF צריך לנהוג בדיוק כמו D-FF רגיל — כלומר הרכיב הנוסף שקוף ל-D.',
          'במצב scan, ה-FFs יוצרים שרשרת shift: \`SI\` של אחד מחובר ל-\`Q\` של הקודם.',
          'המחיר התזמוני: כל נתיב פונקציונלי אל ה-D של ה-FF חוצה עכשיו רכיב נוסף.',
        ],
        answer:
`**מוסיפים MUX 2:1 לפני ה-D של ה-FF.**

| אות | תפקיד |
|---|---|
| \`D\` | קלט פונקציונלי רגיל (מהלוגיקה הקומבינטורית) |
| \`SI\` | Scan-In — מחובר ל-\`Q\` של ה-FF הקודם בשרשרת |
| \`SE\` | Scan-Enable — סלקטור ה-MUX. \`SE=0\` → \`D\` · \`SE=1\` → \`SI\` |
| \`CLK\` | שעון רגיל, משותף לכל ה-FFs |
| \`Q\` | היציאה. גם משמשת כ-\`SO\` (Scan-Out) ל-FF הבא בשרשרת |

### מחיר ביצועים
- **Critical path**: כל path פונקציונלי שמגיע ל-\`D\` חוצה עכשיו MUX → תוספת ~5-10% delay → Fmax יורד.
- **Area**: ~10-15% תוספת לכל flop (גם MUX, גם routing נוסף ל-\`SE\` ו-\`SI\`).
- **Power**: בזמן scan-shift כל ה-FFs מתחלפים בכל clock — בדרך-כלל test רץ ב-clock איטי כדי לא להעלות חום.

### בקנבס — Scan-FF פתוח לרכיבים שלו

המעגל בנוי מ-\`MUX\` ו-\`D-FF\` בנפרד (לא בלוק \`SCAN-FF\` סגור), כדי שתראה את המנגנון. שחק:
- **\`SE=0\`**: כל clock, ה-FF טוען את \`D\`. שנה את \`D\` ופעם ב-CLK — \`Q\` עוקב אחרי \`D\` בעיכוב cycle אחד.
- **\`SE=1\`**: ה-FF טוען את \`SI\` במקום. שנה את \`SI\` — עכשיו \`Q\` עוקב אחר \`SI\`.

זהו הסוד היחיד מאחורי scan: MUX קטן ואות־בחירה גלובלי.`,
        interviewerMindset:
`**שאלת פתיחה ל-DFT.** המראיין מחפש:
1. **שתזהה MUX 2:1** כרכיב הנוסף — לא XOR, לא FF נוסף, לא latch. MUX.
2. **שתסביר את \`SE\`** ולמה הוא חייב להיות broadcast לכל ה-FFs.
3. **שתזכור את עלות התזמון** — MUX על נתיב פונקציונלי = Fmax יורד 5-10%.

**שאלת המשך**: "האם אפשר לחסוך את ה-MUX?" → תיאורטית כן (טכנולוגיית **LSSD** של IBM משתמשת בשני clocks ושני latches במקום MUX), אבל זה מסבך עוד יותר ופחות נפוץ בהדגמות מודרניות.

**שאלת bonus**: "מה עושים ב-FFs שהם החלק האחרון בנתיב לפני יציאה?" → \`Q\` שלהם בלאו הכי מתחבר ל-PI/SO, אז ה-MUX לפעמים נחסך באמצעות boundary-scan ייעודי או שילוב עם output-pad. עיצוב מתקדם.`,
        expectedAnswers: [
          'mux', 'mux 2:1', '2:1 mux', 'multiplexer', 'מוקסר', 'מוקס',
          'SE', 'scan enable', 'scan-enable',
          'SI', 'scan in', 'scan-in',
          'SO', 'scan out', 'scan-out',
          'critical path', 'fmax', 'delay', 'תזמון',
          'overhead', 'area', 'D-FF', 'flip-flop',
        ],
        circuit: () => build(() => {
          // Decomposed Scan-FF: explicit MUX + D-FF so the student
          // can see how it's built. Inputs: D, SI, SE, CLK. Output: Q.
          //
          // Defaults: D=1, SI=0, SE=0 → MUX picks D=1 → Q goes to 1
          // after the first clock edge. Flipping SE=1 swaps to SI=0
          // → Q goes to 0 on the next edge. This makes the role of
          // SE visible without needing the student to set values.
          const dIn  = h.input(80, 200, 'D');   dIn.fixedValue  = 1;
          const siIn = h.input(80, 320, 'SI');  siIn.fixedValue = 0;
          const seIn = h.input(80, 440, 'SE');  seIn.fixedValue = 0;
          const clk  = h.clock(80, 560);
          const mux  = h.mux(280, 320, 'MUX 2:1');
          const ff   = h.ffD(500, 280, 'D-FF');
          const qOut = h.output(720, 280, 'Q');
          return {
            nodes: [dIn, siIn, seIn, clk, mux, ff, qOut],
            wires: [
              h.wire(dIn.id,  mux.id, 0),                 // D → mux.d0
              h.wire(siIn.id, mux.id, 1),                 // SI → mux.d1
              h.wire(seIn.id, mux.id, 2),                 // SE → mux.sel
              h.wire(mux.id,  ff.id,  0),                 // mux.out → FF.D
              h.wire(clk.id,  ff.id,  1, 0, { isClockWire: true }),
              h.wire(ff.id,   qOut.id, 0),                // FF.Q → output
            ],
          };
        }),
      },

      // ─────────────────────────────────────────────────────────
      // Part ב — Chain the single Scan-FF from part א into a 4-stage
      //   scan chain. Demonstrates how broadcast SE + Q→SI wiring
      //   turns N independent Scan-FFs into a shift register during
      //   test mode, while staying functionally independent in
      //   mission mode (SE=0).
      // ─────────────────────────────────────────────────────────
      {
        label: 'ב',
        question:
`עכשיו יש לך **4 Scan-FFs נפרדים** (כל אחד = MUX 2:1 + D-FF, כמו שבנינו בסעיף א'). אתה רוצה להפוך אותם ל-**scan chain אחד** כך שיוכלו לפעול גם כ-shift register בזמן בדיקה.

תאר את החיווט הנדרש: איך מחברים את 4 ה-FFs, אילו אותות משותפים, ומה משמעות \`SE=0\` לעומת \`SE=1\` במעגל המחובר.`,
        schematic: `
<svg viewBox="0 0 1100 620" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="4-stage scan chain built from decomposed Scan-FFs. Each stage is a MUX 2:1 + D-FF. SE and CLK are broadcast.">

  <text x="550" y="38" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    4 Scan-FFs → scan chain אחד
  </text>
  <text x="550" y="66" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">
    כל שלב = MUX 2:1 + D-FF (כמו בסעיף א'). SE ו-CLK משותפים. Q של אחד = SI של הבא.
  </text>

  <!-- ════════ The 4 stages — drawn as repeating MUX+FF pairs ════════ -->
  ${(() => {
    const X0 = 110;
    const DX = 230;
    return [0, 1, 2, 3].map(i => {
      const x = X0 + i * DX;
      const idx = i + 1;
      return `
        <!-- Stage box -->
        <rect x="${x - 60}" y="180" width="200" height="240" rx="10"
              fill="rgba(255,176,96,0.04)" stroke="rgba(255,176,96,0.55)" stroke-width="1.8" stroke-dasharray="5,4"/>
        <text x="${x + 40}" y="208" text-anchor="middle" fill="#ffc080" font-weight="bold" font-size="20">Scan-FF ${idx}</text>

        <!-- MUX 2:1 (trapezoid) -->
        <path d="M ${x - 20} 244 L ${x + 30} 234 L ${x + 30} 304 L ${x - 20} 294 Z"
              fill="#1a2230" stroke="#cc99ff" stroke-width="2.2"/>
        <text x="${x + 5}" y="272" text-anchor="middle" fill="#cc99ff" font-size="18" font-weight="bold">MUX</text>

        <!-- FF body -->
        <rect x="${x + 50}" y="246" width="80" height="60" rx="6" fill="#0a1825" stroke="#80c8ff" stroke-width="2.2"/>
        <text x="${x + 90}" y="282" text-anchor="middle" fill="#c8d8f0" font-size="18" font-weight="bold">FF${idx}</text>

        <!-- MUX → FF.D -->
        <line x1="${x + 30}" y1="269" x2="${x + 50}" y2="269" stroke="#cca040" stroke-width="2"/>

        <!-- D_n input from above (functional) -->
        <line x1="${x - 10}" y1="155" x2="${x - 10}" y2="249" stroke="#cca040" stroke-width="2"/>
        <text x="${x - 10}" y="148" text-anchor="middle" fill="#cca040" font-size="18" font-weight="bold">D${idx}</text>

        <!-- SE input from below (broadcast) — short tap -->
        <line x1="${x + 5}" y1="304" x2="${x + 5}" y2="470" stroke="#80f0a0" stroke-width="2"/>
        <text x="${x + 5}" y="318" text-anchor="middle" fill="#80f0a0" font-size="16">SE</text>

        <!-- CLK input from below — short tap -->
        <line x1="${x + 90}" y1="306" x2="${x + 90}" y2="510" stroke="#cca040" stroke-width="2"/>
        <polyline points="${x + 84} 306 ${x + 90} 314 ${x + 96} 306" fill="none" stroke="#cca040" stroke-width="2"/>

        <!-- Stage label small caption -->
        <text x="${x + 40}" y="402" text-anchor="middle" fill="#a0a0c0" font-size="16" font-style="italic">
          MUX 2:1 + D-FF
        </text>
      `;
    }).join('');
  })()}

  <!-- ════════ SI chain — purple arrows ════════ -->
  <g stroke="#cc66ff" stroke-width="2.8" fill="none">
    <!-- SI_external → MUX1.d1 -->
    <line x1="40" y1="259" x2="90" y2="259" marker-end="url(#arrSIb)"/>
    <!-- FF1.Q → MUX2.d1 -->
    <line x1="200" y1="276" x2="320" y2="259" marker-end="url(#arrSIb)"/>
    <!-- FF2.Q → MUX3.d1 -->
    <line x1="430" y1="276" x2="550" y2="259" marker-end="url(#arrSIb)"/>
    <!-- FF3.Q → MUX4.d1 -->
    <line x1="660" y1="276" x2="780" y2="259" marker-end="url(#arrSIb)"/>
    <!-- FF4.Q → SO_external -->
    <line x1="890" y1="276" x2="1010" y2="276" marker-end="url(#arrSIb)"/>
  </g>
  <defs>
    <marker id="arrSIb" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 Z" fill="#cc66ff"/>
    </marker>
  </defs>

  <!-- SI external label -->
  <text x="30" y="252" fill="#cc66ff" font-size="20" font-weight="bold">SI</text>
  <!-- SO external label -->
  <text x="1020" y="270" fill="#cc66ff" font-size="20" font-weight="bold">SO</text>

  <!-- Per-link labels -->
  <text x="255" y="248" text-anchor="middle" fill="#cc99ff" font-size="16" font-style="italic">Q1→SI2</text>
  <text x="485" y="248" text-anchor="middle" fill="#cc99ff" font-size="16" font-style="italic">Q2→SI3</text>
  <text x="715" y="248" text-anchor="middle" fill="#cc99ff" font-size="16" font-style="italic">Q3→SI4</text>

  <!-- ════════ SE broadcast rail ════════ -->
  <line x1="40" y1="470" x2="1060" y2="470" stroke="#80f0a0" stroke-width="2.4" stroke-dasharray="6,4"/>
  <text x="30" y="464" fill="#80f0a0" font-size="20" font-weight="bold">SE</text>
  <text x="1075" y="475" fill="#80f0a0" font-size="18" font-style="italic">broadcast</text>

  <!-- ════════ CLK broadcast rail ════════ -->
  <line x1="40" y1="510" x2="1060" y2="510" stroke="#cca040" stroke-width="2.4"/>
  <text x="30" y="504" fill="#cca040" font-size="20" font-weight="bold">CLK</text>
  <text x="1075" y="515" fill="#cca040" font-size="18" font-style="italic">broadcast</text>

  <!-- ════════ Bottom summary ════════ -->
  <rect x="40" y="540" width="1020" height="68" rx="10" fill="rgba(64,80,100,0.06)" stroke="#3a4a5a" stroke-width="1.4"/>
  <text x="550" y="568" text-anchor="middle" fill="#ffc890" font-weight="bold" font-size="18">
    SE=0 (mission): כל FF טוען את D שלו עצמאית · SE=1 (test): שרשרת shift באורך 4
  </text>
  <text x="550" y="592" text-anchor="middle" fill="#c8b090" font-size="18" font-style="italic">
    SI_external זוחל דרך FF1→FF2→FF3→FF4 ב-4 מחזורי clock · SO_external = Q4
  </text>
</svg>`,
        hints: [
          'הרעיון: כש-\`SE=1\` לכל ה-FFs, ה-MUXs בוחרים ב-\`SI\`. ה-\`SI\` של כל FF הוא ה-\`Q\` של הקודם → shift register.',
          'אילו אותות חייבים להיות **משותפים (broadcast)** לכל ה-FFs? \`SE\` ו-\`CLK\`. אחד מהם — אם תפצל אותו — תיווצר חוסר עקביות.',
          'ה-\`SI\` החיצוני (PI) מגיע ל-FF1 בלבד. ה-\`SO\` החיצוני (PO) הוא ה-\`Q\` של FF4 (האחרון בשרשרת).',
          'בכל FF פנימי: \`Q_prev → SI_curr\`. למשל FF2.SI ← FF1.Q.',
          'בזמן \`SE=0\` (mission mode): כל FF טוען את ה-\`D\` הפונקציונלי שלו → ה-FFs **פועלים עצמאית** ולא רואים זה את זה.',
          'בזמן \`SE=1\` (test mode): כל FF טוען מ-\`SI\` שלו → **shift register**. הוקטור-בדיקה נדחף ב-N מחזורים.',
        ],
        answer:
`### החיווט הנדרש לשרשרת של N=4

| חיבור | כיוון | הסבר |
|---|---|---|
| \`SI_external → FF1.SI\` | PI → FF | קלט הוקטור נכנס לשרשרת ב-FF הראשון |
| \`FF1.Q → FF2.SI\` | FF → FF | פלט FF הקודם = scan-in של הבא |
| \`FF2.Q → FF3.SI\` | FF → FF | המשך השרשרת |
| \`FF3.Q → FF4.SI\` | FF → FF | המשך השרשרת |
| \`FF4.Q → SO_external\` | FF → PO | קצה השרשרת — היציאה החיצונית |
| \`SE → כל ה-FFs\` | broadcast | סלקטור MUX משותף — חובה |
| \`CLK → כל ה-FFs\` | broadcast | שעון משותף — חובה |
| \`D1..D4\` | מהלוגיקה הפונקציונלית | כל FF עם ה-\`D\` שלו (לא מחוברים בינם לבין עצמם) |

### שני המצבים

**\`SE = 0\` — Mission mode (תפקוד רגיל)**
- כל MUX בוחר את \`D\` הפונקציונלי.
- כל FF טוען עצמאית את ה-\`D\` שלו. **אין** קשר בין ה-FFs דרך ה-scan path.
- המעגל מתנהג בדיוק כמו עם 4 D-FFs רגילים.

**\`SE = 1\` — Test mode (scan shift)**
- כל MUX בוחר את \`SI\` (שהוא \`Q\` של הקודם).
- ה-FFs יוצרים **shift register באורך 4**.
- וקטור־בדיקה נכנס דרך \`SI_external\`, ובמהלך 4 מחזורי clock יושב על כל ארבעת ה-FFs.

### למה SE ו-CLK חייבים להיות broadcast

- **SE לא משותף** → חלק מה-FFs ב-mission ואחרים ב-test בו-זמנית → state inconsistent → לא scan ולא functional. תוצאה: garbage.
- **CLK לא משותף** → FFs מתפזרים על clock domains שונים → CDC, metastability, וגרוע — shift לא סינכרוני. בדרך כלל אסור בתוך אותה שרשרת (scan chains חוצי-clock דורשים lock-up latches — נושא נפרד).

### מהלך בדיקה מלא (N=4)

| שלב | SE | מחזורי clock | מה קורה |
|---|:---:|:---:|---|
| Load | 1 | 4 | וקטור נדחף מ-\`SI_external\` דרך FF1→FF2→FF3→FF4 |
| Capture | 0 | 1 | כל FF לוכד את תוצאת הלוגיקה הפונקציונלית מה-\`D\` שלו |
| Unload | 1 | 4 | התוצאה זוחלת חזרה דרך \`SO_external\` (FF4.Q) |

סה"כ **2N+1 = 9 מחזורים** לוקטור-בדיקה אחד. נושא ה-flow מטופל בהרחבה ב-#6008.

### בקנבס

ה-Scan-FFs מופיעים כ-MUX + FF מפורקים (כמו בסעיף א'), כך שתוכל לעקוב פיזית אחר ה-Q→SI chaining. **ברירת מחדל**: \`SE=0\`, כל \`D=1\` ו-\`SI_external=1\` → אחרי clock אחד כל ה-\`Q\` נטענים ל-1. החלף ל-\`SE=1\` ושנה את \`SI_external\` ל-0 → תראה את ה-0 זוחל לאורך השרשרת מ-FF1 ל-FF4 על פני 4 מחזורי clock.`,
        interviewerMindset:
`**שאלת המשך טבעית.** המראיין מחפש:
1. **שאתה זוכר ש-SE ו-CLK הם broadcast** — לא נפרדים. סטודנט שמשרטט SE נפרד לכל FF נכשל ברעיון.
2. **שאתה מבחין בין mission mode ל-test mode** — שני התנהגויות שונות לחלוטין מאותו רכיב, נשלטות ב-SE יחיד.
3. **שאתה מציין \`Q→SI\` chaining** — לא XOR, לא חיבור ישיר ל-\`D\`. MUX-input.
4. **שאתה מזכיר את ה-flow של 2N+1** או לפחות יודע שיש concept של load/capture/unload.

**שאלת המשך**: "מה אם השרשרת ארוכה מדי (N=10,000)?" → חלוקה למספר scan chains קצרות יותר במקביל (multi-chain DFT). מקצר את זמן הבדיקה הליניארית.

**שאלת bonus**: "מה קורה ל-\`Q\` בזמן shift אם הוא בלאו הכי מחובר ללוגיקה הפונקציונלית?" → ה-\`Q\` משדר ערכים שגויים ב-mission-path בזמן ה-shift, אבל זה לא משנה כי \`SE=1\` משמעו "מצב בדיקה" וההיסטוריה הפונקציונלית בלאו הכי לא חשובה. עם זאת — צריך לוודא שזה לא גורם נזק (latch-up, contention). פתרון: **scan gating** — חוסם את ה-\`Q\` בזמן shift.

**שאלת bonus 2**: "מה משנה אם משנים את **סדר** ה-FFs בשרשרת?" → פונקציונלית כלום (כל ה-FFs בכל מקרה מקבלים אותו ערך אחרי load). למעשה כלי DFT מבצעים **scan-chain reordering** כדי למזער את אורך החוטים פיזית — אופטימיזציה של routing/area.`,
        expectedAnswers: [
          'SI', 'SO', 'SE', 'CLK',
          'broadcast', 'shared', 'משותף',
          'chain', 'shift register', 'שרשרת',
          'Q to SI', 'Q→SI',
          'mission mode', 'test mode', 'scan mode',
          'FF1', 'FF4',
          '4 FFs', 'N FFs',
          'mux', 'multiplexer',
        ],
        circuit: () => build(() => {
          // 4-stage scan chain built from 4 decomposed Scan-FFs.
          // Each stage = MUX 2:1 + D-FF (same construction as part א).
          // SE and CLK broadcast; Q_n → SI_{n+1}.
          //
          // Defaults: SE=0, every D_n=1, SI_external=1.
          //   On each clock edge (SE=0), every FF captures its own D=1
          //   so all Q become 1.
          //   Flip SE=1 and SI_external=0 → on the next 4 clocks, 0s
          //   walk along the chain Q1→Q2→Q3→Q4.
          const clk = h.clock(80, 760, 'CLK');
          const seIn = h.input(80, 640, 'SE');         seIn.fixedValue = 0;
          const siExt = h.input(80, 100, 'SI');        siExt.fixedValue = 1;

          // Per-stage functional D inputs (independent)
          const d1 = h.input(80,  240, 'D1');  d1.fixedValue = 1;
          const d2 = h.input(280, 240, 'D2');  d2.fixedValue = 1;
          const d3 = h.input(480, 240, 'D3');  d3.fixedValue = 1;
          const d4 = h.input(680, 240, 'D4');  d4.fixedValue = 1;

          // Decomposed Scan-FF #1
          const mux1 = h.mux(180, 360, 'MUX1');
          const ff1  = h.ffD(180, 480, 'FF1');

          // Decomposed Scan-FF #2
          const mux2 = h.mux(380, 360, 'MUX2');
          const ff2  = h.ffD(380, 480, 'FF2');

          // Decomposed Scan-FF #3
          const mux3 = h.mux(580, 360, 'MUX3');
          const ff3  = h.ffD(580, 480, 'FF3');

          // Decomposed Scan-FF #4
          const mux4 = h.mux(780, 360, 'MUX4');
          const ff4  = h.ffD(780, 480, 'FF4');

          // Per-stage outputs (Q taps) + the external SO
          const q1Out = h.output(280, 580, 'Q1');
          const q2Out = h.output(480, 580, 'Q2');
          const q3Out = h.output(680, 580, 'Q3');
          const soOut = h.output(900, 580, 'SO');

          return {
            nodes: [
              clk, seIn, siExt,
              d1, d2, d3, d4,
              mux1, ff1, mux2, ff2, mux3, ff3, mux4, ff4,
              q1Out, q2Out, q3Out, soOut,
            ],
            wires: [
              // ── Stage 1 ──
              h.wire(d1.id,    mux1.id, 0),                            // D1 → mux1.d0
              h.wire(siExt.id, mux1.id, 1),                            // SI_ext → mux1.d1
              h.wire(seIn.id,  mux1.id, 2),                            // SE → mux1.sel
              h.wire(mux1.id,  ff1.id,  0),                            // mux1.out → FF1.D
              h.wire(clk.id,   ff1.id,  1, 0, { isClockWire: true }),
              h.wire(ff1.id,   q1Out.id, 0),                           // Q1 tap

              // ── Stage 2 ──
              h.wire(d2.id,    mux2.id, 0),
              h.wire(ff1.id,   mux2.id, 1),                            // Q1 → SI2
              h.wire(seIn.id,  mux2.id, 2),                            // broadcast SE
              h.wire(mux2.id,  ff2.id,  0),
              h.wire(clk.id,   ff2.id,  1, 0, { isClockWire: true }),  // broadcast CLK
              h.wire(ff2.id,   q2Out.id, 0),

              // ── Stage 3 ──
              h.wire(d3.id,    mux3.id, 0),
              h.wire(ff2.id,   mux3.id, 1),                            // Q2 → SI3
              h.wire(seIn.id,  mux3.id, 2),
              h.wire(mux3.id,  ff3.id,  0),
              h.wire(clk.id,   ff3.id,  1, 0, { isClockWire: true }),
              h.wire(ff3.id,   q3Out.id, 0),

              // ── Stage 4 ──
              h.wire(d4.id,    mux4.id, 0),
              h.wire(ff3.id,   mux4.id, 1),                            // Q3 → SI4
              h.wire(seIn.id,  mux4.id, 2),
              h.wire(mux4.id,  ff4.id,  0),
              h.wire(clk.id,   ff4.id,  1, 0, { isClockWire: true }),
              h.wire(ff4.id,   soOut.id, 0),                           // SO_external = Q4
            ],
          };
        }),
      },
    ],
    source: 'יסוד ב-DFT — מבנה Scan-FF',
    tags: ['scan', 'scan-ff', 'mux', 'structure', 'dft', 'fmax'],
    circuitRevealsAnswer: true,
  },

  // ─────────────────────────────────────────────────────────────
  // #6008 — Scan chain test flow: load / capture / unload
  //   Two-part: (a) cycle counting, (b) live demo of the 3-phase
  //   flow on a 4-FF scan chain with simple combinational logic.
  // ─────────────────────────────────────────────────────────────
  {
    id: 'scan-chain-load-capture-unload',
    difficulty: 'medium',
    title: 'Scan chain — flow של load / capture / unload',
    intro:
`שרשרת scan של \`N=4\` Scan-FFs מחוברים יחד: \`SI → FF1 → FF2 → FF3 → FF4 → SO\`. \`SE\` משותף, \`CLK\` משותף.

תהליך הבדיקה הקלאסי **בן 3 שלבים**:

1. **Load** (\`SE=1\`): מעבירים וקטור-בדיקה דרך \`SI\` ב-\`N\` מחזורי שעון → ה-FFs מקבלים את הערכים הרצויים.
2. **Capture** (\`SE=0\`): מחזור אחד של שעון → ה-FFs לוכדים את התוצאה של הלוגיקה הפונקציונלית.
3. **Unload** (\`SE=1\`): מעבירים את התוצאה החוצה דרך \`SO\` ב-\`N\` מחזורים → משווים לצפוי.`,
    schematic: `
<svg viewBox="0 0 1000 700" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="20" role="img" aria-label="4-FF scan chain showing SE, SI, SO common signals plus the 3-phase test flow.">

  <text x="500" y="36" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="24">
    Scan chain — 4 FFs בשרשרת
  </text>

  <!-- 4 FF blocks -->
  <g stroke="#ffc080" stroke-width="2.2" fill="#0a1825">
    <rect x="120" y="120" width="120" height="120" rx="8"/>
    <rect x="320" y="120" width="120" height="120" rx="8"/>
    <rect x="520" y="120" width="120" height="120" rx="8"/>
    <rect x="720" y="120" width="120" height="120" rx="8"/>
  </g>
  <g fill="#ffc080" font-size="20" font-weight="bold" text-anchor="middle">
    <text x="180" y="190">FF1</text>
    <text x="380" y="190">FF2</text>
    <text x="580" y="190">FF3</text>
    <text x="780" y="190">FF4</text>
  </g>
  <g fill="#a0a0c0" font-size="18" text-anchor="middle" font-style="italic">
    <text x="180" y="215">Scan-FF</text>
    <text x="380" y="215">Scan-FF</text>
    <text x="580" y="215">Scan-FF</text>
    <text x="780" y="215">Scan-FF</text>
  </g>

  <!-- Scan chain arrows (Q → next.SI) -->
  <g stroke="#cc66ff" stroke-width="2.4" fill="none" marker-end="url(#arrSI)">
    <line x1="240" y1="170" x2="320" y2="170"/>
    <line x1="440" y1="170" x2="520" y2="170"/>
    <line x1="640" y1="170" x2="720" y2="170"/>
  </g>
  <defs>
    <marker id="arrSI" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 Z" fill="#cc66ff"/>
    </marker>
  </defs>

  <!-- SI input from left -->
  <line x1="40" y1="170" x2="120" y2="170" stroke="#cc66ff" stroke-width="2.4" marker-end="url(#arrSI)"/>
  <text x="50" y="158" fill="#cc66ff" font-size="20" font-weight="bold">SI</text>

  <!-- SO output to right -->
  <line x1="840" y1="170" x2="960" y2="170" stroke="#cc66ff" stroke-width="2.4" marker-end="url(#arrSI)"/>
  <text x="940" y="158" fill="#cc66ff" font-size="20" font-weight="bold" text-anchor="end">SO</text>

  <!-- SE broadcast line below all FFs -->
  <line x1="40" y1="290" x2="960" y2="290" stroke="#80f0a0" stroke-width="2.2" stroke-dasharray="6,4"/>
  <text x="50" y="282" fill="#80f0a0" font-size="20" font-weight="bold">SE</text>
  <g stroke="#80f0a0" stroke-width="2" fill="none">
    <line x1="180" y1="290" x2="180" y2="240"/>
    <line x1="380" y1="290" x2="380" y2="240"/>
    <line x1="580" y1="290" x2="580" y2="240"/>
    <line x1="780" y1="290" x2="780" y2="240"/>
  </g>

  <!-- CLK broadcast line -->
  <line x1="40" y1="340" x2="960" y2="340" stroke="#cca040" stroke-width="2.2"/>
  <text x="50" y="332" fill="#cca040" font-size="20" font-weight="bold">CLK</text>

  <!-- 3-phase legend (each step on its own row, generous spacing) -->
  <rect x="60" y="380" width="880" height="300" rx="10"
        fill="rgba(64,80,100,0.06)" stroke="#3a4a5a" stroke-width="1.4"/>
  <text x="500" y="416" text-anchor="middle" fill="#ffc890" font-weight="bold" font-size="24">
    flow של 3 שלבים
  </text>

  <!-- Step 1: LOAD -->
  <text x="90" y="466" fill="#80f0a0" font-weight="bold" font-size="24">1. LOAD</text>
  <text x="90" y="496" fill="#c8b090" font-size="20">
    SE=1, N מחזורי clock — וקטור נכנס דרך SI ל-FF1 ומתפזר ל-FF2,3,4
  </text>

  <!-- Step 2: CAPTURE -->
  <text x="90" y="546" fill="#ff9933" font-weight="bold" font-size="24">2. CAPTURE</text>
  <text x="90" y="576" fill="#c8b090" font-size="20">
    SE=0, מחזור clock יחיד — ה-FFs לוכדים את תוצאת הלוגיקה הפונקציונלית
  </text>

  <!-- Step 3: UNLOAD -->
  <text x="90" y="626" fill="#cc99ff" font-weight="bold" font-size="24">3. UNLOAD</text>
  <text x="90" y="656" fill="#c8b090" font-size="20">
    SE=1, N מחזורי clock — התוצאה יוצאת דרך SO להשוואה
  </text>
</svg>`,
    parts: [
      {
        label: 'א',
        question: 'נתון \`N=4\` FFs בשרשרת אחת. כמה מחזורי clock נדרשים כדי להריץ **וקטור-בדיקה אחד** (load + capture + unload)? כמה מחזורים נדרשים עבור \`M=5\` וקטורי-בדיקה ברצף (עם חפיפה בין unload של אחד ל-load של הבא)?',
        hints: [
          'Load: צריך להעביר N ביטים דרך SI אל ה-FF הראשון, וכל ביט מתקדם בכל clock אחד הלאה.',
          'Capture: רק מחזור אחד, כי כל ה-FFs לוכדים במקביל.',
          'Unload: צריך להוציא N ביטים דרך SO. גם כן N clocks.',
          'חפיפה: בזמן unload של וקטור i, אפשר להעביר ב-SI את הביטים של וקטור i+1. בכל clock נכנס ביט חדש ויוצא ביט ישן.',
          'נוסחת חפיפה לכל M וקטורים: M·(N+1) + N. הביטוי "N+1" = N של shift + 1 של capture.',
        ],
        answer:
`### עבור וקטור אחד
\`N + 1 + N = 2N + 1\` מחזורים. ל-\`N=4\`: \`9\` מחזורים.

### עבור M=5 וקטורים בחפיפה
| שלב | מחזורים |
|---|---:|
| Load של הוקטור הראשון | N = 4 |
| לכל וקטור i (1..M): capture + load של הבא | N+1 = 5 |
| Unload של הוקטור האחרון | N = 4 |
| **סה"כ** | **\`M·(N+1) + N\`** |

ל-\`M=5, N=4\`: \`5·5 + 4 = 29\` מחזורים.

### למה זה חשוב?
ב-ASIC עם 100K FFs ושרשרת אחת: וקטור אחד = ~200K cycles. רק 50 וקטורים = 10M cycles → 100ms ב-100MHz test clock. **הפתרון: שרשראות מקבילות.**

עם \`K\` שרשראות מקבילות, כל אחת באורך \`N/K\`, סך המחזורים יורד ל-\`M·(N/K + 1) + N/K\`. לדוגמה: 10 שרשראות מקבילות → \`5·11 + 10 = 65\` במקום 29 לוקטורים על שרשרת אחת... רגע, זה נראה גרוע יותר! זה כי הדוגמה הקטנה (N=4) לא משקפת. ב-N=10000, K=100 → לכל שרשרת רק 100 FFs, וזה כן חיסכון של פי 100.

**כלל אצבע**: ASIC מודרני מחולק ל-\`8-64\` chains מקבילים, כל אחד באורך 1K-10K FFs.`,
        interviewerMindset:
`**שאלת ספירה** קלאסית. המראיין מחפש:
1. **שאתה לא שוכח את ה-capture** — לא \`2N\`, אלא \`2N+1\`.
2. **שאתה מבין את החפיפה** — load של הבא בזמן unload של הקודם → \`N+1\` לכל וקטור באמצע, לא \`2N+1\`.
3. **שאתה מציע פתרון לתעשייתי** — chains מקבילים, לא רק "להריץ יותר זמן".

**שאלת המשך**: "מה מגביל את מספר ה-chains?" → pin count על ה-package (כל chain דורש pin של \`SI\` ו-\`SO\` ייעודי, או שמשתמשים ב-test access port \`TAP\` של JTAG עם MUX).

**שאלת bonus**: "במציאות, האם מריצים את ה-capture ב-clock פונקציונלי או ב-test clock?" → ב-clock פונקציונלי (כדי לבדוק at-speed). זה נקרא **launch-on-shift** או **launch-on-capture**, ויש לזה השלכות תזמוניות עדינות.`,
        expectedAnswers: [
          '2N+1', '2n+1', '9',
          'M*(N+1)+N', 'M(N+1)+N', '29',
          'load', 'capture', 'unload', 'shift',
          'parallel chains', 'multiple chains', 'parallel scan',
          'overlap', 'pipeline',
        ],
        circuit: () => buildScanChainDemo(),
      },
      {
        label: 'ב',
        question: 'בקנבס יש שרשרת של 4 Scan-FFs (\`FF1..FF4\`) עם \`SE\`, \`SI\`, \`SO\` משותפים ו-\`CLK\`. אין לוגיקה פונקציונלית מורכבת — \`D\` של כל FF קבוע ב-\`0\` לצורך הדגמה נקייה. הרץ את ה-flow: load של \`SI=1,0,1,1\` (4 clocks ב-\`SE=1\`), ואז capture (\`SE=0\`, 1 clock). מה תהיה תכולת ה-FFs לאחר כל שלב? מה יהיה \`SO\` במהלך ה-unload הבא?',
        hints: [
          'אחרי clock אחד ב-load (SE=1): SI הראשון נכנס ל-FF1; שאר ה-FFs עוברים shift אחד קדימה.',
          'אחרי N=4 clocks ב-load: וקטור ה-SI מילא את כל השרשרת. הביט הראשון שנכנס נמצא ב-FF הכי רחוק.',
          'Capture (SE=0, 1 clock): כל FF טוען את D שלו. במעגל הזה D=0, אז כל ה-FFs מתאפסים.',
          'Unload (SE=1): בכל clock, FF1 מקבל את ה-SI הבא (= 0), ושאר ה-FFs מקבלים את ה-Q של הקודם. ה-Q של FF4 יוצא ל-SO.',
        ],
        answer:
`### שלב 1: Load (SE=1, 4 clocks, SI = 1, 0, 1, 1)

| Clock | SI נכנס | FF1 | FF2 | FF3 | FF4 |
|---:|:---:|:---:|:---:|:---:|:---:|
| לפני | — | 0 | 0 | 0 | 0 |
| 1 | \`1\` | \`1\` | 0 | 0 | 0 |
| 2 | \`0\` | \`0\` | \`1\` | 0 | 0 |
| 3 | \`1\` | \`1\` | \`0\` | \`1\` | 0 |
| 4 | \`1\` | \`1\` | \`1\` | \`0\` | \`1\` |

**אחרי load**: השרשרת = \`[FF1=1, FF2=1, FF3=0, FF4=1]\`. שים לב: הביט הראשון שנכנס (1) הגיע הכי רחוק (FF4).

### שלב 2: Capture (SE=0, 1 clock)

כל FF.D = 0 (במעגל הדגמה), אז:
- כולם נטענים ב-0.
- **אחרי capture**: \`[0, 0, 0, 0]\`.

(במעגל אמיתי, ה-capture משקף את תוצאת הלוגיקה הקומבינטורית בין ה-FFs ל-PIs. כאן המעגל נקי לצורך הדגמה.)

### שלב 3: Unload (SE=1, SI=0, 4 clocks)

| Clock | SI נכנס | FF1 | FF2 | FF3 | FF4 | SO יוצא |
|---:|:---:|:---:|:---:|:---:|:---:|:---:|
| לפני | — | 0 | 0 | 0 | 0 | — |
| 1 | 0 | 0 | 0 | 0 | 0 | \`0\` |
| 2 | 0 | 0 | 0 | 0 | 0 | \`0\` |
| 3 | 0 | 0 | 0 | 0 | 0 | \`0\` |
| 4 | 0 | 0 | 0 | 0 | 0 | \`0\` |

**SO sequence = \`0, 0, 0, 0\`** (כי capture איפס הכל). אם היה fault בנתיב הקומבינטורי שגרם ל-FF3 ללכוד 1 במקום 0, SO היה מחזיר \`0, 0, 1, 0\` והפגם היה נתפס.

### בקנבס

נסה בעצמך:
1. הצב את \`SE\` על \`1\`. הצב \`SI\` על \`1\` ופעם ב-\`CLK\` — תראה \`FF1=1\`.
2. הצב \`SI\` על \`0\` ופעם — \`FF1=0, FF2=1\`. וכן הלאה.
3. אחרי 4 פעימות, כל ה-FFs מלאים בערכים שטענת.
4. הצב \`SE=0\` ופעם פעם אחת — \`capture\`. כל FF טוען מ-D שלו (כאן \`0\`).
5. הצב \`SE=1\` שוב והוצא \`4\` פעימות — תראה ב-\`SO\` את הביטים שהיו ב-FFs.`,
        interviewerMindset:
`**שאלה חצי-מעשית** — מתרגלת את ה-flow על דוגמה קונקרטית. המראיין מחפש:
1. **שאתה זוכר את הסדר** — הביט הראשון ש-shift-in נכנס מגיע הכי **רחוק** (FF4), לא קרוב (FF1). זו טעות נפוצה.
2. **שאתה מבחין בין load ל-capture** — שני מצבים שונים, נשלטים ע"י SE.
3. **שאתה מבין את התפקיד של D של ה-FF בזמן load** — לא משנה! ב-load (SE=1) ה-MUX בוחר SI ומתעלם מ-D.

**שאלת המשך**: "מה אם עושים capture ב-SE=1 בטעות?" → ה-FFs לא לוכדים את ה-comb logic; ממשיכים shift. הבדיקה כושלת לחלוטין — כל ה-coverage הולך לאיבוד.

**שאלת bonus**: "האם אפשר לעשות capture של יותר ממחזור אחד?" → כן, **launch-on-shift** או **launch-on-capture** דורשים 2 capture cycles לבדיקה at-speed של נתיב transition. שונה מ-stuck-at שמספיק לו capture יחיד.`,
        expectedAnswers: [
          'load', 'capture', 'unload', 'shift',
          'SI', 'SO', 'SE', 'scan-in', 'scan-out', 'scan-enable',
          '1101', '1011', '1, 0, 1, 1', '0, 0, 0, 0',
          'first bit', 'last',
          'four', '4',
        ],
        circuit: () => buildScanChainDemo(),
      },
    ],
    source: 'יסוד ב-DFT — flow של scan test',
    tags: ['scan', 'scan-ff', 'scan-chain', 'load-capture-unload', 'cycle-counting', 'dft'],
    circuitRevealsAnswer: true,
  },

  // ─────────────────────────────────────────────────────────────
  // #6009 — Coverage: scan vs no-scan on a deep sequential chain
  //   3 FFs in series (FF1 → FF2 → FF3), with a stuck-at fault on
  //   the AND gate driving FF3.D. Without scan: need 3+ cycles of
  //   PI to reach FF3. With scan: load directly in 3 shift cycles.
  // ─────────────────────────────────────────────────────────────
  {
    id: 'scan-vs-no-scan-coverage',
    difficulty: 'medium',
    title: 'Scan לעומת ללא-scan — coverage מול עלות מחזורים',
    intro:
`נתון מעגל סדרתי קצר — 3 FFs בטור (\`FF1 → FF2 → FF3\`), עם שער \`AND\` שמזין את \`FF3.D\`. תקלת \`stuck-at-0\` ביציאת ה-AND.

השוואה בין שתי גישות לבדיקה:
- **ללא scan**: ה-FFs רגילים. ניתן לגרום ל-\`FF3\` ללכוד את ה-AND רק אחרי שמוגדרים \`FF2\` ו-PI מתאימים, מה שדורש רצף clock דרך כל ה-FFs מ-PI.
- **עם scan**: ה-FFs הם Scan-FFs. אפשר לטעון ישירות כל state ל-\`FF1, FF2\` דרך scan-chain, ואז מחזור capture יחיד חושף את התקלה.

מה ההפרש ב-**מספר המחזורים** וב-**coverage**?`,
    schematic: `
<svg viewBox="0 0 1000 700" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="20" role="img" aria-label="3-FF sequential chain with stuck-at-0 fault on AND gate driving FF3.D.">

  <text x="500" y="36" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="24">
    תקלת stuck-at-0 ב-AND שמזין את FF3
  </text>
  <text x="500" y="62" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">
    כדי להגיע ל-FF3 מ-PI נדרשים מחזורי clock רצופים
  </text>

  <!-- PI inputs on the left -->
  <circle cx="60" cy="170" r="14" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
  <text x="60" y="174" text-anchor="middle" fill="#cca040" font-size="18" font-weight="bold">PI</text>

  <!-- FF1 -->
  <rect x="140" y="130" width="100" height="80" rx="6" fill="#0a1825" stroke="#80c8ff" stroke-width="2.4"/>
  <text x="190" y="178" text-anchor="middle" fill="#80c8ff" font-size="20" font-weight="bold">FF1</text>

  <!-- FF2 -->
  <rect x="340" y="130" width="100" height="80" rx="6" fill="#0a1825" stroke="#80c8ff" stroke-width="2.4"/>
  <text x="390" y="178" text-anchor="middle" fill="#80c8ff" font-size="20" font-weight="bold">FF2</text>

  <!-- AND gate -->
  <path d="M 520 145 L 540 145 A 30 30 0 0 1 540 205 L 520 205 Z" fill="#1a1428" stroke="#ff9933" stroke-width="2.4"/>
  <text x="540" y="178" text-anchor="middle" fill="#ff9933" font-size="18" font-weight="bold">AND</text>

  <!-- Second AND input (from PI2) -->
  <circle cx="480" cy="240" r="14" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
  <text x="480" y="244" text-anchor="middle" fill="#cca040" font-size="16" font-weight="bold">PI2</text>
  <path d="M 480 226 L 480 195 L 525 195" fill="none" stroke="#cca040" stroke-width="2"/>

  <!-- FF3 -->
  <rect x="660" y="130" width="100" height="80" rx="6" fill="#0a1825" stroke="#80c8ff" stroke-width="2.4"/>
  <text x="710" y="178" text-anchor="middle" fill="#80c8ff" font-size="20" font-weight="bold">FF3</text>

  <!-- Output -->
  <circle cx="860" cy="170" r="14" fill="#0a1825" stroke="#ff9933" stroke-width="2.2"/>
  <text x="860" y="174" text-anchor="middle" fill="#ff9933" font-size="18" font-weight="bold">PO</text>

  <!-- Wires -->
  <g stroke="#a0a0c0" stroke-width="2" fill="none">
    <line x1="74" y1="170" x2="140" y2="170"/>
    <line x1="240" y1="170" x2="340" y2="170"/>
    <line x1="440" y1="170" x2="525" y2="155"/>
    <line x1="570" y1="175" x2="660" y2="170"/>
    <line x1="760" y1="170" x2="846" y2="170"/>
  </g>

  <!-- Fault marker on AND output -->
  <circle cx="610" cy="172" r="14" fill="#3a0a14" stroke="#ff6060" stroke-width="2.4"/>
  <text x="610" y="178" text-anchor="middle" fill="#ff6060" font-size="18" font-weight="bold">×</text>
  <text x="610" y="124" text-anchor="middle" fill="#ff6060" font-size="18" font-weight="bold">s-a-0</text>

  <!-- Comparison box -->
  <rect x="60" y="290" width="880" height="380" rx="12" fill="rgba(64,80,100,0.06)" stroke="#3a4a5a" stroke-width="1.4"/>
  <text x="500" y="328" text-anchor="middle" fill="#ffc890" font-weight="bold" font-size="24">
    שתי גישות לחשיפת התקלה
  </text>

  <!-- No-scan side -->
  <text x="240" y="378" text-anchor="middle" fill="#ff8080" font-weight="bold" font-size="24">
    ללא scan
  </text>
  <text x="240" y="416" text-anchor="middle" fill="#c8b090" font-size="20">
    PI → FF1 (cycle 1)
  </text>
  <text x="240" y="450" text-anchor="middle" fill="#c8b090" font-size="20">
    FF1 → FF2 (cycle 2)
  </text>
  <text x="240" y="484" text-anchor="middle" fill="#c8b090" font-size="20">
    FF2+PI2 → AND → FF3 (cycle 3)
  </text>
  <text x="240" y="518" text-anchor="middle" fill="#c8b090" font-size="20">
    FF3 → PO (cycle 4)
  </text>
  <text x="240" y="560" text-anchor="middle" fill="#ff8080" font-weight="bold" font-size="20">
    סך-הכל: 4 cycles לוקטור
  </text>

  <!-- Vertical separator -->
  <line x1="500" y1="350" x2="500" y2="640" stroke="#3a4a5a" stroke-width="1.2" stroke-dasharray="4,4"/>

  <!-- Scan side -->
  <text x="740" y="378" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="24">
    עם scan
  </text>
  <text x="740" y="416" text-anchor="middle" fill="#c8b090" font-size="20">
    SE=1: shift-in ב-3 cycles → טוען
  </text>
  <text x="740" y="450" text-anchor="middle" fill="#c8b090" font-size="20">
    \`FF1, FF2, FF3\` בערכים שרירותיים
  </text>
  <text x="740" y="484" text-anchor="middle" fill="#c8b090" font-size="20">
    SE=0: capture cycle יחיד
  </text>
  <text x="740" y="518" text-anchor="middle" fill="#c8b090" font-size="20">
    SE=1: shift-out ב-3 cycles
  </text>
  <text x="740" y="560" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="20">
    סך-הכל: 7 cycles לוקטור
  </text>
</svg>`,
    parts: [
      {
        label: 'א',
        question: 'השווה את שתי הגישות (עם / בלי scan) על המעגל הנתון: כמה מחזורי clock נדרשים לוקטור-בדיקה אחד? באיזו גישה ה-coverage בעצם **טוב יותר**, ולמה? באיזה מצב הגישה "ללא scan" עדיפה?',
        hints: [
          'ללא scan, ה-FFs נטענים רק דרך PI דרך מחזורי shift פונקציונליים. כל FF "עמוק" יותר דורש cycle נוסף להגיע אליו.',
          'עם scan, ניתן לטעון ערכים שרירותיים ל-FF1, FF2, ו-FF3 ישירות דרך scan-chain ב-N cycles, ללא תלות בנתיב הפונקציונלי.',
          'מספר ה-cycles לוקטור: ללא scan ~ עומק המעגל; עם scan = 2N+1 (= 2·3+1 = 7).',
          'Coverage: לתקלה שדורשת state ספציפי של FF3, ייתכן שאין רצף PIs קצר שמייצר אותו. עם scan: state חופשי לחלוטין.',
          'אבל scan דורש את ה-MUX ב-FF (overhead תזמוני) ושטח נוסף. לא תמיד שווה.',
        ],
        answer:
`### השוואת מחזורים — לוקטור אחד

| גישה | Cycles | הסבר |
|---|---:|---|
| ללא scan | \`4\` | אחד לכל "עומק" של FF + cycle אחרון לתצפית |
| עם scan | \`2N+1 = 7\` | \`N=3\` shift-in + 1 capture + \`N\` shift-out |

לוקטור בודד, **ללא-scan דווקא מהיר יותר** במעגל קטן. ה-overhead של scan משתלם רק כש-\`N\` קטן יחסית לעומק או כש-coverage הוא הצוואר.

### השוואת coverage — הבדל המהותי

הבעיה ב-no-scan: כדי להגיע ל-\`FF3\` עם state ספציפי, צריך **רצף PIs** שיוצר אותו דרך \`FF1\` ו-\`FF2\`. ייתכן ש-state מסוים **לא יכול להיווצר** משום רצף PIs קצר — זה נקרא **state unreachable**. אז התקלה שדורשת את ה-state לא ניתנת לבדיקה כלל.

**עם scan**: כל state ניתן לטעינה ישירה. אין state unreachable. כל תקלה במודל single-stuck-at שמתפזרת לפלט ניתנת לזיהוי. \`coverage > 99%\` הפך לסטנדרט תעשייתי.

### מתי no-scan עדיף?
- **מעגלים קטנים מאוד** (פחות מ-100 FFs) שבהם reachability מלא — חבל על ה-MUX overhead.
- **חלקים sensitive לתזמון** (אנלוג / RF / clock generators) שאסור להוסיף בהם delay על D.
- **debug** — לפעמים נוח לראות state פונקציונלי "טבעי" בלי לשבש אותו ע"י scan.

### למה scan ניצחה בשוק?
ASIC מודרני: 100K-10M FFs. בלי scan: ATPG לא יוכל למצוא vectors קצרים שמייצרים את כל ה-states. **coverage קורסת ל-60-80%**. עם scan: \`>99%\`. ה-area/timing overhead של 5-15% הוא מחיר זול ל-coverage כזה.

### בקנבס
המעגל הוא 3 Scan-FFs בטור עם תקלת \`stuck-at-0\` ב-AND. שחק:
- **מצב פונקציונלי** (\`SE=0\`): טען PI ופעם — תראה מצב FF1 משתנה, FF2 משתנה (cycle 2), FF3 משתנה (cycle 3 או יותר אם ה-AND תקול).
- **מצב scan** (\`SE=1\`): טען ישירות וקטור ל-FF3, capture, observe. התקלה נחשפת מיידית.`,
        interviewerMindset:
`**שאלה השוואתית קלאסית.** המראיין מחפש:
1. **שאתה לא טוען ש-scan תמיד מהיר יותר** — לוקטור בודד במעגל קטן הוא דווקא איטי יותר. ה-overhead משתלם בקנה-מידה.
2. **שאתה זוכר את הקונספט state unreachable** — לא רק "מהר יותר", אלא **כיסוי טוב יותר** של תקלות שאחרת לא ניתנות לבדיקה.
3. **שאתה מודע ל-cases שבהם no-scan עדיף** — RF, אנלוג, מעגלים זעירים. לא הכל ASIC.

**שאלת המשך**: "אם scan נותן 99% coverage, איך משיגים 100%?" → צריך טכניקות נוספות: **logic BIST** למעגלים אקראיים, **memory BIST** לזיכרון (ראה #6006), ולפעמים **functional patterns** ידניים לחלקים יחודיים.

**שאלת bonus**: "מה הקשר בין scan לבין at-speed testing?" → scan-shift רץ ב-clock איטי (כדי לחסוך הספק), אבל ה-capture חייב להיות ב-clock פונקציונלי כדי לתפוס \`transition\` ו-\`path-delay\` faults. דורש שני clocks מסונכרנים — אתגר תזמון.`,
        expectedAnswers: [
          'state unreachable', 'unreachable', 'reachability',
          'coverage', '99%',
          '2N+1', '2n+1', '7', '4',
          'overhead', 'MUX', 'critical path', 'fmax',
          'large designs', 'large asic',
          'rf', 'analog', 'small',
          'capture', 'shift', 'parallel',
        ],
        circuit: () => build(() => {
          // 3-stage scan-FF chain. Functional D path:
          //   FF1.D = PI1
          //   FF2.D = FF1.Q
          //   FF3.D = FF2.Q AND PI2   ← AND-gate output has stuck-at-0
          //
          // Scan chain: SI → FF1.TI, FF1.Q → FF2.TI, FF2.Q → FF3.TI,
          // FF3.Q → SO. SE + CLK common.
          //
          // The student can compare two modes:
          //  • SE=0 functional: walk a value through FF1→FF2→FF3
          //  • SE=1 scan: shift-in any state to FF1/FF2/FF3 directly
          // The AND output is stuck-at-0 — so FF3 functionally never
          // captures '1' from the AND path, but scan-load can still
          // place '1' into FF3 from SI.
          const clk  = h.clock(80, 600);
          const seIn = h.input(80, 480, 'SE');
          const siIn = h.input(80, 360, 'SI');
          const pi1  = h.input(80, 180, 'PI1');
          const pi2  = h.input(500, 360, 'PI2');

          const ff1 = h.block('SCAN_FF', 240, 180, { label: 'FF1', initialQ: 0 });
          const ff2 = h.block('SCAN_FF', 440, 180, { label: 'FF2', initialQ: 0 });
          const andG = h.gate('AND', 640, 240);
          const ff3 = h.block('SCAN_FF', 820, 180, { label: 'FF3', initialQ: 0 });

          const po   = h.output(1020, 180, 'PO');
          const soOut = h.output(1020, 80,  'SO');
          const q1 = h.output(240, 60, 'Q1');
          const q2 = h.output(440, 60, 'Q2');

          // Inject the stuck-at fault on the AND output wire so the
          // student can see the functional vs scan-load distinction.
          const andToFF3 = h.wire(andG.id, ff3.id, 0);
          andToFF3.stuckAt = 0;

          return {
            nodes: [clk, seIn, siIn, pi1, pi2, ff1, ff2, andG, ff3, po, soOut, q1, q2],
            wires: [
              // Functional D wiring
              h.wire(pi1.id,  ff1.id, 0),
              h.wire(ff1.id,  ff2.id, 0),
              h.wire(ff2.id,  andG.id, 0),
              h.wire(pi2.id,  andG.id, 1),
              andToFF3,
              // Scan chain via TI
              h.wire(siIn.id, ff1.id, 1),
              h.wire(ff1.id,  ff2.id, 1),
              h.wire(ff2.id,  ff3.id, 1),
              // SE common
              h.wire(seIn.id, ff1.id, 2),
              h.wire(seIn.id, ff2.id, 2),
              h.wire(seIn.id, ff3.id, 2),
              // CLK common
              h.wire(clk.id, ff1.id, 3, 0, { isClockWire: true }),
              h.wire(clk.id, ff2.id, 3, 0, { isClockWire: true }),
              h.wire(clk.id, ff3.id, 3, 0, { isClockWire: true }),
              // Observation pads
              h.wire(ff1.id, q1.id, 0),
              h.wire(ff2.id, q2.id, 0),
              h.wire(ff3.id, po.id, 0),
              h.wire(ff3.id, soOut.id, 0),
            ],
          };
        }),
      },
    ],
    source: 'יסוד ב-DFT — scan vs no-scan trade-offs',
    tags: ['scan', 'scan-ff', 'coverage', 'reachability', 'asic', 'overhead', 'dft'],
    circuitRevealsAnswer: true,
  },

  // ─────────────────────────────────────────────────────────────
  // #6010 — JTAG / Boundary Scan (IEEE 1149.1)
  //   Two-part: (a) TAP FSM navigation given a TMS sequence,
  //   (b) Boundary scan cell modes (shift / capture / update / normal).
  //   Live circuit uses the JTAG_TAP + BOUNDARY_SCAN_CELL components
  //   already in the engine — the student drives TCK, TMS, TDI, MODE,
  //   SHIFT manually and watches the state + chain shift in real time.
  // ─────────────────────────────────────────────────────────────
  {
    id: 'jtag-tap-boundary-scan',
    difficulty: 'medium',
    title: 'JTAG / Boundary Scan — TAP FSM + תאי boundary',
    intro:
`**JTAG** (תקן IEEE 1149.1) הוא הגישה הסטנדרטית לבדיקת chips מבחוץ דרך 4 פינים בלבד: \`TCK, TMS, TDI, TDO\` (+\`TRST\` אופציונלי).

הלב של ה-JTAG הוא ה-**TAP controller** — מכונת מצבים בעלת **16 מצבים** שמתקדמת בכל \`posedge\` של \`TCK\` לפי \`TMS\`. סביב כל pad של ה-chip יושב **boundary-scan cell** — תא קטן שבמצב test יודע גם להזריק וגם לקרוא את הערך של ה-pad.

יחד הם מאפשרים לבדוק את כל ה-I/O של ה-chip בלי לפתוח אותו פיזית, ומאפשרים flash של firmware, debug, ו-board-level continuity testing.`,
    schematic: `
<svg viewBox="0 0 1100 1320" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="20" role="img" aria-label="JTAG TAP 16-state FSM at top, boundary-scan cell black box at bottom.">

  <text x="550" y="40" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    JTAG TAP — מכונת מצבים בת 16 מצבים
  </text>
  <text x="550" y="68" text-anchor="middle" fill="#a0a0c0" font-size="20" font-style="italic">
    כל מעבר נשלט ע"י TMS על posedge של TCK
  </text>

  <!-- ========== TOP PANEL: TAP FSM ========== -->
  <rect x="20" y="90" width="1060" height="780" rx="12"
        fill="rgba(96,192,255,0.04)" stroke="rgba(128,212,255,0.5)" stroke-width="2"/>

  <!-- Define arrow markers for FSM transitions -->
  <defs>
    <marker id="tapArr0" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 Z" fill="#80f0a0"/>
    </marker>
    <marker id="tapArr1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 Z" fill="#ff6080"/>
    </marker>
  </defs>

  <!-- TLR (Test-Logic-Reset) at top center -->
  <circle cx="550" cy="150" r="42" fill="#3a0a14" stroke="#ff6060" stroke-width="2.4"/>
  <text x="550" y="148" text-anchor="middle" fill="#ff8080" font-size="18" font-weight="bold">TLR</text>
  <text x="550" y="166" text-anchor="middle" fill="#c8b090" font-size="16">state 0</text>

  <!-- RTI (Run-Test/Idle) -->
  <circle cx="550" cy="270" r="42" fill="#0a1825" stroke="#80c8ff" stroke-width="2.2"/>
  <text x="550" y="268" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">RTI</text>
  <text x="550" y="286" text-anchor="middle" fill="#c8b090" font-size="16">state 1</text>

  <!-- TLR ↔ RTI (TMS=0 down, TMS=1 self-loop on TLR) -->
  <path d="M 550 192 L 550 228" stroke="#80f0a0" stroke-width="2" fill="none" marker-end="url(#tapArr0)"/>
  <text x="538" y="214" text-anchor="end" fill="#80f0a0" font-size="18" font-weight="bold">0</text>
  <path d="M 596 130 Q 660 100, 660 150 Q 660 200, 596 170" stroke="#ff6080" stroke-width="1.8" fill="none" marker-end="url(#tapArr1)"/>
  <text x="680" y="150" text-anchor="start" fill="#ff6080" font-size="18" font-weight="bold">1 (self)</text>

  <!-- DR branch (LEFT side) -->
  <g font-size="18" font-weight="bold">
    <!-- Select-DR -->
    <circle cx="270" cy="360" r="40" fill="#0a1825" stroke="#80c8ff" stroke-width="2"/>
    <text x="270" y="358" text-anchor="middle" fill="#80c8ff" font-size="18">Sel-DR</text>
    <text x="270" y="374" text-anchor="middle" fill="#c8b090" font-size="16">state 2</text>
    <!-- Capture-DR -->
    <circle cx="270" cy="460" r="40" fill="#0a1825" stroke="#80c8ff" stroke-width="2"/>
    <text x="270" y="458" text-anchor="middle" fill="#80c8ff" font-size="18">Cap-DR</text>
    <text x="270" y="474" text-anchor="middle" fill="#c8b090" font-size="16">state 3</text>
    <!-- Shift-DR -->
    <circle cx="270" cy="560" r="40" fill="#1a3a2a" stroke="#80f0a0" stroke-width="2.6"/>
    <text x="270" y="558" text-anchor="middle" fill="#80f0a0" font-size="18">Shift-DR</text>
    <text x="270" y="574" text-anchor="middle" fill="#c8b090" font-size="16">state 4</text>
    <!-- Exit1-DR -->
    <circle cx="160" cy="640" r="36" fill="#0a1825" stroke="#80c8ff" stroke-width="2"/>
    <text x="160" y="638" text-anchor="middle" fill="#80c8ff" font-size="16">Exit1-DR</text>
    <text x="160" y="654" text-anchor="middle" fill="#c8b090" font-size="16">5</text>
    <!-- Pause-DR -->
    <circle cx="80" cy="720" r="36" fill="#0a1825" stroke="#80c8ff" stroke-width="2"/>
    <text x="80" y="718" text-anchor="middle" fill="#80c8ff" font-size="16">Pause-DR</text>
    <text x="80" y="734" text-anchor="middle" fill="#c8b090" font-size="16">6</text>
    <!-- Exit2-DR -->
    <circle cx="180" cy="800" r="36" fill="#0a1825" stroke="#80c8ff" stroke-width="2"/>
    <text x="180" y="798" text-anchor="middle" fill="#80c8ff" font-size="16">Exit2-DR</text>
    <text x="180" y="814" text-anchor="middle" fill="#c8b090" font-size="16">7</text>
    <!-- Update-DR -->
    <circle cx="360" cy="720" r="40" fill="#3a2a14" stroke="#ffc080" stroke-width="2.4"/>
    <text x="360" y="718" text-anchor="middle" fill="#ffc080" font-size="18">Upd-DR</text>
    <text x="360" y="734" text-anchor="middle" fill="#c8b090" font-size="16">state 8</text>
  </g>

  <!-- IR branch (RIGHT side) -->
  <g font-size="18" font-weight="bold">
    <circle cx="830" cy="360" r="40" fill="#0a1825" stroke="#80c8ff" stroke-width="2"/>
    <text x="830" y="358" text-anchor="middle" fill="#80c8ff" font-size="18">Sel-IR</text>
    <text x="830" y="374" text-anchor="middle" fill="#c8b090" font-size="16">state 9</text>
    <circle cx="830" cy="460" r="40" fill="#0a1825" stroke="#80c8ff" stroke-width="2"/>
    <text x="830" y="458" text-anchor="middle" fill="#80c8ff" font-size="18">Cap-IR</text>
    <text x="830" y="474" text-anchor="middle" fill="#c8b090" font-size="16">state 10</text>
    <circle cx="830" cy="560" r="40" fill="#1a3a2a" stroke="#80f0a0" stroke-width="2.6"/>
    <text x="830" y="558" text-anchor="middle" fill="#80f0a0" font-size="18">Shift-IR</text>
    <text x="830" y="574" text-anchor="middle" fill="#c8b090" font-size="16">state 11</text>
    <circle cx="940" cy="640" r="36" fill="#0a1825" stroke="#80c8ff" stroke-width="2"/>
    <text x="940" y="638" text-anchor="middle" fill="#80c8ff" font-size="16">Exit1-IR</text>
    <text x="940" y="654" text-anchor="middle" fill="#c8b090" font-size="16">12</text>
    <circle cx="1020" cy="720" r="36" fill="#0a1825" stroke="#80c8ff" stroke-width="2"/>
    <text x="1020" y="718" text-anchor="middle" fill="#80c8ff" font-size="16">Pause-IR</text>
    <text x="1020" y="734" text-anchor="middle" fill="#c8b090" font-size="16">13</text>
    <circle cx="920" cy="800" r="36" fill="#0a1825" stroke="#80c8ff" stroke-width="2"/>
    <text x="920" y="798" text-anchor="middle" fill="#80c8ff" font-size="16">Exit2-IR</text>
    <text x="920" y="814" text-anchor="middle" fill="#c8b090" font-size="16">14</text>
    <circle cx="740" cy="720" r="40" fill="#3a2a14" stroke="#ffc080" stroke-width="2.4"/>
    <text x="740" y="718" text-anchor="middle" fill="#ffc080" font-size="18">Upd-IR</text>
    <text x="740" y="734" text-anchor="middle" fill="#c8b090" font-size="16">state 15</text>
  </g>

  <!-- DR transitions -->
  <!-- RTI → Sel-DR (TMS=1) -->
  <g stroke="#ff6080" stroke-width="1.8" fill="none">
    <path d="M 512 282 Q 400 320, 308 360" marker-end="url(#tapArr1)"/>
  </g>
  <text x="370" y="320" fill="#ff6080" font-size="18" font-weight="bold">1</text>

  <!-- Sel-DR → Cap-DR (0), Sel-DR → Sel-IR (1) -->
  <path d="M 270 400 L 270 420" stroke="#80f0a0" stroke-width="1.8" fill="none" marker-end="url(#tapArr0)"/>
  <text x="280" y="416" fill="#80f0a0" font-size="18" font-weight="bold">0</text>
  <path d="M 310 360 L 790 360" stroke="#ff6080" stroke-width="1.8" fill="none" marker-end="url(#tapArr1)"/>
  <text x="540" y="354" fill="#ff6080" font-size="18" font-weight="bold">1</text>

  <!-- Cap-DR → Shift-DR (0), Cap-DR → Exit1-DR (1) -->
  <path d="M 270 500 L 270 520" stroke="#80f0a0" stroke-width="1.8" fill="none" marker-end="url(#tapArr0)"/>
  <text x="280" y="516" fill="#80f0a0" font-size="18" font-weight="bold">0</text>
  <path d="M 240 490 Q 180 540, 160 604" stroke="#ff6080" stroke-width="1.8" fill="none" marker-end="url(#tapArr1)"/>
  <text x="180" y="570" fill="#ff6080" font-size="18" font-weight="bold">1</text>

  <!-- Shift-DR → Shift-DR (0 self) and Shift-DR → Exit1-DR (1) -->
  <path d="M 230 540 Q 200 540, 200 560 Q 200 580, 230 580" stroke="#80f0a0" stroke-width="1.8" fill="none" marker-end="url(#tapArr0)"/>
  <text x="180" y="560" fill="#80f0a0" font-size="18" font-weight="bold">0</text>
  <path d="M 240 590 Q 180 615, 160 604" stroke="#ff6080" stroke-width="1.8" fill="none" marker-end="url(#tapArr1)"/>
  <text x="180" y="640" fill="#ff6080" font-size="18" font-weight="bold">1</text>

  <!-- Exit1-DR → Update-DR (1) -->
  <path d="M 196 640 Q 290 690, 320 720" stroke="#ff6080" stroke-width="1.8" fill="none" marker-end="url(#tapArr1)"/>
  <text x="280" y="666" fill="#ff6080" font-size="18" font-weight="bold">1</text>
  <!-- Exit1-DR → Pause-DR (0) -->
  <path d="M 140 670 L 100 700" stroke="#80f0a0" stroke-width="1.8" fill="none" marker-end="url(#tapArr0)"/>
  <text x="100" y="676" fill="#80f0a0" font-size="18" font-weight="bold">0</text>

  <!-- Update-DR → RTI (0) — go back up -->
  <path d="M 360 680 Q 430 540, 510 290" stroke="#80f0a0" stroke-width="1.8" fill="none" marker-end="url(#tapArr0)"/>
  <text x="430" y="450" fill="#80f0a0" font-size="18" font-weight="bold">0</text>

  <!-- IR side: mirrored transitions (kept concise) -->
  <path d="M 830 400 L 830 420" stroke="#80f0a0" stroke-width="1.8" fill="none" marker-end="url(#tapArr0)"/>
  <text x="840" y="416" fill="#80f0a0" font-size="18" font-weight="bold">0</text>
  <path d="M 830 500 L 830 520" stroke="#80f0a0" stroke-width="1.8" fill="none" marker-end="url(#tapArr0)"/>
  <text x="840" y="516" fill="#80f0a0" font-size="18" font-weight="bold">0</text>
  <path d="M 870 540 Q 900 540, 900 560 Q 900 580, 870 580" stroke="#80f0a0" stroke-width="1.8" fill="none" marker-end="url(#tapArr0)"/>
  <text x="908" y="560" fill="#80f0a0" font-size="18" font-weight="bold">0</text>
  <path d="M 860 590 Q 920 615, 940 604" stroke="#ff6080" stroke-width="1.8" fill="none" marker-end="url(#tapArr1)"/>
  <text x="920" y="640" fill="#ff6080" font-size="18" font-weight="bold">1</text>
  <path d="M 904 640 Q 810 690, 780 720" stroke="#ff6080" stroke-width="1.8" fill="none" marker-end="url(#tapArr1)"/>
  <text x="820" y="666" fill="#ff6080" font-size="18" font-weight="bold">1</text>
  <path d="M 740 680 Q 670 540, 590 290" stroke="#80f0a0" stroke-width="1.8" fill="none" marker-end="url(#tapArr0)"/>
  <text x="670" y="450" fill="#80f0a0" font-size="18" font-weight="bold">0</text>

  <!-- ── Missing IEEE 1149.1 transitions — completes the 16-state FSM ── -->

  <!-- RTI self-loop (TMS=0) — small loop on left side of RTI -->
  <path d="M 504 250 Q 462 232, 462 270 Q 462 308, 504 290" stroke="#80f0a0" stroke-width="1.8" fill="none" marker-end="url(#tapArr0)"/>
  <text x="446" y="275" text-anchor="end" fill="#80f0a0" font-size="18" font-weight="bold">0</text>

  <!-- Sel-IR → TLR (TMS=1) — long arc up to TLR -->
  <path d="M 830 320 Q 830 200, 696 145" stroke="#ff6080" stroke-width="1.8" fill="none" marker-end="url(#tapArr1)"/>
  <text x="800" y="220" fill="#ff6080" font-size="18" font-weight="bold">1</text>

  <!-- DR side: Pause-DR self (0), Pause-DR → Exit2-DR (1) -->
  <path d="M 56 700 Q 22 720, 22 750 Q 22 780, 60 750" stroke="#80f0a0" stroke-width="1.8" fill="none" marker-end="url(#tapArr0)"/>
  <text x="8" y="754" fill="#80f0a0" font-size="18" font-weight="bold">0</text>
  <path d="M 108 744 L 152 780" stroke="#ff6080" stroke-width="1.8" fill="none" marker-end="url(#tapArr1)"/>
  <text x="100" y="794" fill="#ff6080" font-size="18" font-weight="bold">1</text>

  <!-- Exit2-DR → Shift-DR (0), Exit2-DR → Upd-DR (1) -->
  <path d="M 200 770 Q 240 700, 252 600" stroke="#80f0a0" stroke-width="1.8" fill="none" marker-end="url(#tapArr0)"/>
  <text x="226" y="676" fill="#80f0a0" font-size="18" font-weight="bold">0</text>
  <path d="M 214 790 L 326 736" stroke="#ff6080" stroke-width="1.8" fill="none" marker-end="url(#tapArr1)"/>
  <text x="260" y="780" fill="#ff6080" font-size="18" font-weight="bold">1</text>

  <!-- Upd-DR → Sel-DR (TMS=1) — arc back up to Sel-DR -->
  <path d="M 326 698 Q 240 540, 264 400" stroke="#ff6080" stroke-width="1.8" fill="none" marker-end="url(#tapArr1)"/>
  <text x="240" y="540" fill="#ff6080" font-size="18" font-weight="bold">1</text>

  <!-- IR side mirrors -->
  <!-- Cap-IR → Exit1-IR (1) -->
  <path d="M 860 490 Q 920 540, 932 604" stroke="#ff6080" stroke-width="1.8" fill="none" marker-end="url(#tapArr1)"/>
  <text x="908" y="570" fill="#ff6080" font-size="18" font-weight="bold">1</text>

  <!-- Exit1-IR → Pause-IR (0) -->
  <path d="M 968 660 L 1000 696" stroke="#80f0a0" stroke-width="1.8" fill="none" marker-end="url(#tapArr0)"/>
  <text x="1000" y="676" fill="#80f0a0" font-size="18" font-weight="bold">0</text>

  <!-- Pause-IR self (0), Pause-IR → Exit2-IR (1) -->
  <path d="M 1046 700 Q 1080 720, 1080 750 Q 1080 780, 1044 750" stroke="#80f0a0" stroke-width="1.8" fill="none" marker-end="url(#tapArr0)"/>
  <text x="1090" y="754" fill="#80f0a0" font-size="18" font-weight="bold">0</text>
  <path d="M 992 744 L 950 780" stroke="#ff6080" stroke-width="1.8" fill="none" marker-end="url(#tapArr1)"/>
  <text x="1000" y="794" fill="#ff6080" font-size="18" font-weight="bold">1</text>

  <!-- Exit2-IR → Shift-IR (0), Exit2-IR → Upd-IR (1) -->
  <path d="M 902 770 Q 860 700, 848 600" stroke="#80f0a0" stroke-width="1.8" fill="none" marker-end="url(#tapArr0)"/>
  <text x="864" y="676" fill="#80f0a0" font-size="18" font-weight="bold">0</text>
  <path d="M 886 790 L 774 736" stroke="#ff6080" stroke-width="1.8" fill="none" marker-end="url(#tapArr1)"/>
  <text x="836" y="780" fill="#ff6080" font-size="18" font-weight="bold">1</text>

  <!-- Upd-IR → Sel-DR (TMS=1) — long cross-arc back to the DR side top -->
  <path d="M 706 700 Q 480 540, 296 380" stroke="#ff6080" stroke-width="1.8" fill="none" marker-end="url(#tapArr1)"/>
  <text x="500" y="490" fill="#ff6080" font-size="18" font-weight="bold">1</text>

  <!-- Legend -->
  <g transform="translate(40, 110)">
    <line x1="0" y1="0" x2="34" y2="0" stroke="#80f0a0" stroke-width="2.4"/>
    <text x="40" y="5" fill="#80f0a0" font-size="18" font-weight="bold">TMS = 0</text>
    <line x1="0" y1="22" x2="34" y2="22" stroke="#ff6080" stroke-width="2.4"/>
    <text x="40" y="27" fill="#ff6080" font-size="18" font-weight="bold">TMS = 1</text>
  </g>
  <text x="550" y="850" text-anchor="middle" fill="#ffc080" font-size="18" font-style="italic">
    הערה: מ-TLR ניתן להגיע ל-Shift-DR ב-4 מעברים בלבד
  </text>

  <!-- ========== BOTTOM PANEL: Boundary-Scan Cell ========== -->
  <rect x="20" y="900" width="1060" height="400" rx="12"
        fill="rgba(255,176,96,0.05)" stroke="rgba(255,176,96,0.55)" stroke-width="2"/>
  <text x="550" y="940" text-anchor="middle" fill="#ffc080" font-weight="bold" font-size="24">
    Boundary-Scan Cell — תא ה-pad
  </text>

  <!-- BSC black box -->
  <rect x="380" y="990" width="340" height="200" rx="8" fill="#0a1825" stroke="#ffc080" stroke-width="2.4" stroke-dasharray="6,4"/>
  <text x="550" y="1080" text-anchor="middle" fill="#ffc080" font-size="32" font-weight="bold" opacity="0.85">BSC</text>

  <!-- Inputs (left) -->
  <g font-size="20" font-weight="bold">
    <line x1="280" y1="1020" x2="380" y2="1020" stroke="#cca040" stroke-width="2"/>
    <text x="320" y="1012" text-anchor="middle" fill="#cca040">PI</text>
    <text x="232" y="1024" fill="#a0a0c0" font-size="18" font-style="italic">primary input</text>

    <line x1="280" y1="1066" x2="380" y2="1066" stroke="#cc66ff" stroke-width="2"/>
    <text x="320" y="1058" text-anchor="middle" fill="#cc66ff">SI</text>
    <text x="232" y="1070" fill="#a0a0c0" font-size="18" font-style="italic">scan input</text>

    <line x1="280" y1="1112" x2="380" y2="1112" stroke="#80f0a0" stroke-width="2"/>
    <text x="320" y="1104" text-anchor="middle" fill="#80f0a0">MODE</text>
    <text x="232" y="1116" fill="#a0a0c0" font-size="18" font-style="italic">test/normal</text>

    <line x1="280" y1="1158" x2="380" y2="1158" stroke="#80f0a0" stroke-width="2"/>
    <text x="320" y="1150" text-anchor="middle" fill="#80f0a0">SHIFT</text>
    <text x="232" y="1162" fill="#a0a0c0" font-size="18" font-style="italic">shift/capture</text>
  </g>

  <!-- Outputs (right) -->
  <g font-size="20" font-weight="bold">
    <line x1="720" y1="1044" x2="820" y2="1044" stroke="#ff9933" stroke-width="2"/>
    <text x="770" y="1036" text-anchor="middle" fill="#ff9933">PO</text>
    <text x="830" y="1048" fill="#a0a0c0" font-size="18" font-style="italic">primary output</text>

    <line x1="720" y1="1130" x2="820" y2="1130" stroke="#cc66ff" stroke-width="2"/>
    <text x="770" y="1122" text-anchor="middle" fill="#cc66ff">SO</text>
    <text x="830" y="1134" fill="#a0a0c0" font-size="18" font-style="italic">scan output</text>
  </g>

  <text x="550" y="1230" text-anchor="middle" fill="#c8b090" font-size="18">
    שני latches בפנים: <tspan fill="#cc66ff" font-weight="bold">shift latch</tspan> ו-<tspan fill="#ffc080" font-weight="bold">update latch</tspan>
  </text>
  <text x="550" y="1260" text-anchor="middle" fill="#ffe080" font-size="20" font-weight="bold">
    איך פועלים PO ו-SO ב-4 השילובים של MODE × SHIFT?
  </text>
</svg>`,
    parts: [
      {
        label: 'א',
        question: 'אתה נמצא במצב **Test-Logic-Reset** (state 0). מהי **רצף ה-TMS** המינימלית שתביא אותך ל-**Shift-DR** (state 4)? איזה רצף יחזיר אותך מ-Shift-DR ל-Run-Test/Idle (state 1) **תוך כדי שמירה** על הנתונים שטענת ל-DR?',
        hints: [
          'מ-TLR צריך לעבור ל-RTI → Sel-DR → Cap-DR → Shift-DR. ספור את ה-TMS עבור כל מעבר.',
          'מעבר \`TLR → RTI\` הוא TMS=0 (יציאה מ-self-loop \`TMS=1\` של TLR).',
          'מעבר \`RTI → Sel-DR\` הוא TMS=1.',
          'מ-Shift-DR, כדי לשמור על הנתונים שטענת, צריך לעבור דרך Exit1-DR → Update-DR → RTI. שלושה מעברים: 1, 1, 0.',
          'יצירת Update הכרחית — אחרת הנתונים שב-shift register יישארו רק שם ולא יועברו ל-update latch של ה-BSCs המחוברים.',
        ],
        answer:
`### TLR → Shift-DR: **TMS = 0, 1, 0, 0** (4 מעברים)

| צעד | TMS | מצב נוכחי | מצב הבא |
|---:|:---:|---|---|
| 1 | \`0\` | TLR (0) | RTI (1) |
| 2 | \`1\` | RTI (1) | Sel-DR (2) |
| 3 | \`0\` | Sel-DR (2) | Cap-DR (3) |
| 4 | \`0\` | Cap-DR (3) | Shift-DR (4) |

ב-Capture-DR ה-DR נטען עם ערך פנימי (למשל IDCODE אם זה ה-instruction). ב-Shift-DR מעבירים TDI פנימה ומקבלים TDO החוצה בכל clock נוסף.

### Shift-DR → RTI עם שמירת נתונים: **TMS = 1, 1, 0**

| צעד | TMS | מצב נוכחי | מצב הבא |
|---:|:---:|---|---|
| 1 | \`1\` | Shift-DR (4) | Exit1-DR (5) |
| 2 | \`1\` | Exit1-DR (5) | Update-DR (8) |
| 3 | \`0\` | Update-DR (8) | RTI (1) |

**Update-DR** הוא הרגע הקריטי: ערך ה-shift register נטען ל-**update latches** של כל ה-BSCs ⇒ הערכים שטענתי מ-TDI מופיעים על ה-pads של ה-chip.

### דרך חלופית **בלי שמירה** (לאחזרה בלבד)
Shift-DR → Exit1-DR (1) → ... אם הולכים ל-Pause-DR ולא ל-Update, הנתונים לא נטענים. דרך זו נדרשת רק לבחירת instruction אחרת או למתן הפסקה.

### בקנבס
ה-JTAG_TAP מחובר עם 4 קלטים: \`TCK\` (clock), \`TMS\`, \`TDI\`, \`TRST\`. הוצא מ-Reset (\`TRST=0\`), הצב \`TMS=0\` ופעם → המצב הופך ל-1 (RTI). פעם נוספת עם \`TMS=1\` → 2 (Sel-DR). וכן הלאה. ה-OUTPUT "state" מציג את ערך ה-state כ-4-bit.`,
        interviewerMindset:
`**שאלה קלאסית** בכל ראיון JTAG/DFT. המראיין מחפש:
1. **שאתה מבחין בין Capture-DR ל-Shift-DR** — שני מצבים שונים. Capture-DR טוען ל-DR; Shift-DR מזיז את הביטים.
2. **שאתה זוכר את Update-DR** — בלי Update, הערך שטענת לא יופיע בפלט. טעות יקרה ביישומים אמיתיים.
3. **שאתה יודע ש-5×TMS=1 תמיד מחזיר ל-TLR** — תכונת safety של ה-FSM (מאפסת מ-כל מצב).

**שאלת המשך נפוצה**: "מה אם אני רוצה להעביר את אותו command דרך IR ולא DR?" → אותו תהליך, רק עם Sel-IR → Cap-IR → Shift-IR → Exit1-IR → Upd-IR.

**שאלת bonus**: "מה התפקיד של TRST?" → reset אסינכרוני שמכריח state=0 בלי תלות ב-TCK. שימושי לבדיקה ראשונית אם השעון לא עובד.`,
        expectedAnswers: [
          'TMS=0,1,0,0', '0,1,0,0', '0 1 0 0', '0100',
          'TMS=1,1,0', '1,1,0', '1 1 0', '110',
          'TLR', 'RTI', 'Sel-DR', 'Select-DR', 'Cap-DR', 'Capture-DR',
          'Shift-DR', 'Exit1-DR', 'Update-DR',
          'four', '4', 'three', '3',
        ],
      },
      {
        label: 'ב',
        question: 'תאר את התנהגות ה-**boundary-scan cell** ב-4 השילובים של \`MODE × SHIFT\`. במיוחד: באיזה שילוב הוא **שקוף** למצב הפונקציונלי הרגיל (\`PO = PI\`)? באיזה שילוב הוא **לוכד** את ה-pin הפיזי, ובאיזה הוא **כופה** ערך חיצוני על ה-pin?',
        hints: [
          'יש בתוך התא **שני latches**: shift latch (מקבל SI כל clock כש-SHIFT=1, אחרת מקבל PI), ו-update latch (מעודכן מ-shift latch כש-MODE עולה 0→1).',
          'PO נקבע ע"י MODE: כש-MODE=0 → PO = PI ישיר (שקוף); כש-MODE=1 → PO = update latch (test).',
          'SO תמיד יוצא מה-shift latch.',
          'מצב normal: MODE=0, SHIFT=0. מצב load+capture: SHIFT=1 (אוסף ערכים מ-SI לתוך השרשרת). מצב drive: MODE=1 (אחרי Update מ-TAP).',
        ],
        answer:
`### טבלת התנהגות לפי \`MODE × SHIFT\`

| MODE | SHIFT | מה קורה ב-shift latch | PO | SO | משמעות |
|:---:|:---:|---|:---:|:---:|---|
| \`0\` | \`0\` | טוען PI (capture) | **PI** | shift latch | **Normal** — שקוף, ה-pad פועל רגיל |
| \`0\` | \`1\` | טוען SI (shift) | PI | shift latch | **Shift** — חוליה בשרשרת, ה-pad עוד רגיל |
| \`1\` | \`0\` | טוען PI (capture) | **update latch** | shift latch | **Test-drive** — ה-pin כפוי מבחוץ |
| \`1\` | \`1\` | טוען SI (shift) | update latch | shift latch | shift תוך drive חיצוני |

### תהליך טיפוסי של boundary-scan test

1. **Capture** (MODE=0, SHIFT=0, clock אחד): כל BSC לוכד את ה-PI שלו → ערך ה-pad הנוכחי שמור ב-shift latch.
2. **Shift** (SHIFT=1, אחרי TAP Shift-DR): שרשור הערכים יוצאים דרך TDO והערכים החדשים נכנסים דרך TDI.
3. **Update** (אחרי TAP Update-DR — MODE עולה 0→1): ה-shift latch מועתק ל-update latch.
4. **Drive** (MODE=1): כל BSC כופה את ה-update latch על ה-pin → ערכי בדיקה חיצוניים מופיעים על ה-pad.

### בקנבס

ב-canvas יש 3 BSCs מקושרים בשרשרת. ל-MODE / SHIFT שני קלטים נפרדים שאתה שולט בידנית.

- הצב \`MODE=0, SHIFT=0\` ושנה את \`PI1, PI2, PI3\` — \`PO1, PO2, PO3\` יעקבו בדיוק (Normal mode).
- הצב \`SHIFT=1\` והעבר ערכי \`SI\` ב-clock אחר clock — תראה את ה-shift latches מתעדכנים, וה-SO של כל אחד הופך ל-SI של הבא.
- הצב \`MODE=1\` — עכשיו \`PO\` מציג את ה-update latch (לא PI). אם MODE עלה 0→1 בדיוק לפני, נלכד ערך ה-shift latch ב-update latch.`,
        interviewerMindset:
`**שאלת רכיב** קלאסית. המראיין מחפש:
1. **שאתה מבחין בין shift latch ל-update latch** — שני elements נפרדים, ולא רק "FF אחד".
2. **שאתה זוכר את ההפרדה PO vs SO** — PO הוא הפלט שמגיע ל-pad הפיזי (בתחתית ה-chip); SO הוא חוליית השרשרת הפנימית ל-TDO. שתי דרכים שונות.
3. **שאתה מבין את ה-flow המלא** — Capture → Shift → Update → Drive זה ה-pipeline שמייצר board-level testing.

**שאלת המשך נפוצה**: "מה אם MODE=1 והשרשרת לא הספיקה לעבור Update-DR?" → ה-update latch מחזיק את הערך הקודם, שיתפרסם על ה-pin. לכן זמן הפעלת MODE קריטי.

**שאלת bonus**: "האם אפשר לבדוק short בין שני pads דרך BSCs?" → כן! זה ה-classic boundary scan use case: מציבים ערכים שונים על שני pads דרך update latches, וקוראים את ה-PI של pads אחרים. אם short → אחד הפינים מאמץ את ערכו של האחר.`,
        expectedAnswers: [
          'MODE=0', 'MODE=1', 'SHIFT=0', 'SHIFT=1',
          'normal', 'shift', 'capture', 'update', 'drive', 'test',
          'shift latch', 'update latch',
          'PI', 'PO', 'SI', 'SO',
          'transparent', 'שקוף',
          'pad',
        ],
        circuit: () => build(() => {
          // Live JTAG demo: a JTAG_TAP block + 3 BOUNDARY_SCAN_CELL
          // in a daisy chain. The student drives TCK, TMS, TDI, TRST
          // manually to navigate the TAP FSM; and separately drives
          // SHIFT and MODE to exercise the boundary-scan cells. TDI
          // doubles as the scan-in for the first BSC, TDO of the last
          // BSC is shown.
          //
          // Layout: TAP block on left, 3 BSCs in a horizontal chain
          // below. Each BSC has its own PI input pad so the student
          // can drive distinct pad values. SHIFT and MODE are common
          // across all three BSCs (one INPUT each).
          const tck  = h.clock(80, 600);
          const tms  = h.input(80, 200, 'TMS');
          const tdi  = h.input(80, 320, 'TDI');
          const trst = h.input(80, 440, 'TRST');

          // TMS sequence: walk the TAP through the DR-scan path so the
          // student sees the FSM actually move instead of sitting in RTI.
          //   tick 0  TMS=0   TLR → RTI
          //   tick 1  TMS=1   RTI → Sel-DR-Scan
          //   tick 2  TMS=0   Sel-DR → Capture-DR
          //   tick 3  TMS=0   Capture-DR → Shift-DR
          //   tick 4..7 TMS=0  stay in Shift-DR (4 serial shifts of TDI)
          //   tick 8  TMS=1   Shift-DR → Exit1-DR
          //   tick 9  TMS=1   Exit1-DR → Update-DR
          //   tick 10 TMS=0   Update-DR → RTI
          //   tick 11+ TMS=0  stay in RTI (idle)
          tms.stepValues = [0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0];
          // TDI serial pattern shifted in during ticks 4..7 (sees 1,0,1,1)
          tdi.stepValues = [0, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0];
          // TRST stays inactive after a single-tick deassert pulse — without
          // an explicit value the TAP can sit pinned in Test-Logic-Reset.
          trst.fixedValue = 0;

          const tap  = h.block('JTAG_TAP', 300, 320, {
            label: 'TAP',
            irBits: 4,
            idcode: 0x149511A1,
          });

          const tdoOut    = h.output(540, 240, 'TDO');
          const stateOut  = h.output(540, 320, 'state');

          // 3 boundary-scan cells in chain (left → right).
          // SI of BSC1 ← TDI (so the student can drive scan-in
          // independently of the TAP — simpler for learning).
          // SO of BSC1 → SI of BSC2 → SO of BSC2 → SI of BSC3.
          // SHIFT and MODE are shared.
          // PI values chosen so PO column reads "1,0,1" — distinguishable
          // boundary data instead of an all-zero blob.
          const pi1 = h.input(120, 820, 'PI1');
          const pi2 = h.input(360, 820, 'PI2');
          const pi3 = h.input(600, 820, 'PI3');
          pi1.fixedValue = 1;
          pi2.fixedValue = 0;
          pi3.fixedValue = 1;

          // SHIFT pulses high for a few ticks so the student watches the
          // boundary chain actually clock data. MODE=0 keeps the cell in
          // transparent mode: PO = PI, so PO1..PO3 read 1,0,1 immediately.
          const shIn   = h.input(120, 940, 'SHIFT');
          const modeIn = h.input(360, 940, 'MODE');
          shIn.stepValues = [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0];
          modeIn.fixedValue = 0;

          const bsc1 = h.block('BOUNDARY_SCAN_CELL', 280, 720, { label: 'BSC1' });
          const bsc2 = h.block('BOUNDARY_SCAN_CELL', 520, 720, { label: 'BSC2' });
          const bsc3 = h.block('BOUNDARY_SCAN_CELL', 760, 720, { label: 'BSC3' });

          const po1 = h.output(280, 600, 'PO1');
          const po2 = h.output(520, 600, 'PO2');
          const po3 = h.output(760, 600, 'PO3');
          const soOut = h.output(960, 720, 'chain-out');

          return {
            nodes: [
              tck, tms, tdi, trst, tap, tdoOut, stateOut,
              pi1, pi2, pi3, shIn, modeIn,
              bsc1, bsc2, bsc3,
              po1, po2, po3, soOut,
            ],
            wires: [
              // JTAG_TAP: TCK(0)*, TMS(1), TDI(2), TRST(3)
              h.wire(tck.id,  tap.id, 0, 0, { isClockWire: true }),
              h.wire(tms.id,  tap.id, 1),
              h.wire(tdi.id,  tap.id, 2),
              h.wire(trst.id, tap.id, 3),

              // TAP outputs
              h.wire(tap.id, tdoOut.id,   0, 0),    // TDO
              h.wire(tap.id, stateOut.id, 0, 1),    // state bus

              // BSC chain: SI of bsc1 ← TDI (so user controls scan-in
              // independently of TAP for learning purposes)
              h.wire(tdi.id, bsc1.id, 1),

              // PI inputs
              h.wire(pi1.id, bsc1.id, 0),
              h.wire(pi2.id, bsc2.id, 0),
              h.wire(pi3.id, bsc3.id, 0),

              // MODE common (pin 2)
              h.wire(modeIn.id, bsc1.id, 2),
              h.wire(modeIn.id, bsc2.id, 2),
              h.wire(modeIn.id, bsc3.id, 2),

              // SHIFT common (pin 3)
              h.wire(shIn.id, bsc1.id, 3),
              h.wire(shIn.id, bsc2.id, 3),
              h.wire(shIn.id, bsc3.id, 3),

              // CLK common (pin 4) — same TCK
              h.wire(tck.id, bsc1.id, 4, 0, { isClockWire: true }),
              h.wire(tck.id, bsc2.id, 4, 0, { isClockWire: true }),
              h.wire(tck.id, bsc3.id, 4, 0, { isClockWire: true }),

              // Scan chain: bsc1.SO → bsc2.SI → bsc2.SO → bsc3.SI
              h.wire(bsc1.id, bsc2.id, 1, 1),
              h.wire(bsc2.id, bsc3.id, 1, 1),

              // PO observation
              h.wire(bsc1.id, po1.id, 0, 0),
              h.wire(bsc2.id, po2.id, 0, 0),
              h.wire(bsc3.id, po3.id, 0, 0),

              // Chain-out from last BSC
              h.wire(bsc3.id, soOut.id, 0, 1),
            ],
          };
        }),
      },
    ],
    source: 'יסוד ב-DFT — IEEE 1149.1 JTAG / Boundary Scan',
    tags: ['jtag', 'tap', 'boundary-scan', 'ieee-1149.1', 'fsm', 'dft'],
    circuitRevealsAnswer: true,
  },

  // ─────────────────────────────────────────────────────────────
  // #6011 — Transition / Delay Faults (at-speed testing)
  //   Single part. Explains the two-vector requirement that
  //   distinguishes transition faults from stuck-at faults, and
  //   the LOS vs LOC test methodology. Live circuit uses a
  //   stuck-at-0 on a buffer output as a proxy for "slow-to-rise
  //   that never finishes" — the engine has no timing model.
  // ─────────────────────────────────────────────────────────────
  {
    id: 'transition-faults-at-speed',
    difficulty: 'hard',
    title: 'תקלות מעבר — Slow-to-Rise / Slow-to-Fall ובדיקת at-speed',
    intro:
`**תקלת מעבר** (transition fault) היא שער או חוט **איטיים מדי** — הם עוברים בין \`0\` ל-\`1\` (או הפוך) אבל לא מספיקים להתייצב לפני קצה השעון הבא.

שני סוגים:
- \`slow-to-rise (STR)\`: מעבר \`0→1\` איטי
- \`slow-to-fall (STF)\`: מעבר \`1→0\` איטי

בקנבס: שרשרת \`FF_A → buffer → FF_B\` עם STR על מוצא \`FF_A\`. רוץ ועקוב אחרי \`Q_A\` ו-\`Q_B\`.`,
    schematic: `
<svg viewBox="0 0 1000 1100" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="20" role="img" aria-label="Transition fault waveforms (normal vs slow-to-rise) and 2-vector test sequence.">

  <text x="500" y="40" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    תקלת מעבר — מה stuck-at לא תופס
  </text>
  <text x="500" y="68" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">
    התקלה תלויה ב-**זמן** המעבר, לא רק בערך הסופי
  </text>

  <!-- ============= TOP: WAVEFORM PANEL ============= -->
  <rect x="20" y="90" width="960" height="500" rx="12"
        fill="rgba(96,192,255,0.04)" stroke="rgba(128,212,255,0.55)" stroke-width="2"/>
  <text x="500" y="128" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="24">
    Waveform — נקי לעומת slow-to-rise
  </text>

  <!-- Clock waveform -->
  <text x="60" y="180" fill="#cca040" font-size="20" font-weight="bold">CLK</text>
  <path d="M 120 180 L 200 180 L 200 160 L 280 160 L 280 180 L 360 180 L 360 160 L 440 160 L 440 180 L 520 180 L 520 160 L 600 160 L 600 180 L 680 180 L 680 160 L 760 160 L 760 180 L 840 180 L 840 160 L 920 160"
        stroke="#cca040" stroke-width="2.2" fill="none"/>
  <!-- Clock edge markers (rising edges) -->
  <g fill="#cca040" font-size="18" text-anchor="middle">
    <text x="280" y="206">↑ t1</text>
    <text x="440" y="206">↑ t2 (V1)</text>
    <text x="600" y="206">↑ t3 (V2)</text>
    <text x="760" y="206">↑ t4 (capture)</text>
  </g>

  <!-- Input D waveform (V1: 0 stable, V2: rises to 1 at t3) -->
  <text x="60" y="280" fill="#cc66ff" font-size="20" font-weight="bold">D</text>
  <path d="M 120 290 L 600 290 L 600 250 L 920 250" stroke="#cc66ff" stroke-width="2.4" fill="none"/>
  <text x="350" y="284" fill="#a0a0c0" font-size="18" font-style="italic">stable LOW (V1)</text>
  <text x="730" y="244" fill="#a0a0c0" font-size="18" font-style="italic">HIGH (V2)</text>

  <!-- Normal output waveform -->
  <text x="60" y="380" fill="#80f0a0" font-size="20" font-weight="bold">OUT (clean)</text>
  <path d="M 120 390 L 600 390 L 615 350 L 920 350" stroke="#80f0a0" stroke-width="2.4" fill="none"/>
  <text x="730" y="344" fill="#80f0a0" font-size="18" font-style="italic">rises promptly</text>
  <!-- Capture sample marker -->
  <circle cx="760" cy="350" r="8" fill="#80f0a0" opacity="0.85"/>
  <text x="760" y="338" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">FF captures 1 ✓</text>

  <!-- Slow-to-rise output waveform -->
  <text x="60" y="480" fill="#ff6080" font-size="20" font-weight="bold">OUT (STR)</text>
  <path d="M 120 490 L 600 490 L 850 490 L 920 450" stroke="#ff6080" stroke-width="2.4" fill="none"/>
  <text x="730" y="484" fill="#ff8080" font-size="18" font-style="italic">slow — finishes too late</text>
  <!-- Capture sample marker on faulty -->
  <circle cx="760" cy="490" r="8" fill="#ff6080" opacity="0.85"/>
  <text x="760" y="478" text-anchor="middle" fill="#ff6080" font-size="18" font-weight="bold">FF captures 0 ✗</text>
  <!-- Slow rise shown as gentle slope after capture -->
  <line x1="600" y1="490" x2="850" y2="490" stroke="#ff6080" stroke-width="2.4" stroke-dasharray="3,3" opacity="0.6"/>

  <text x="500" y="560" text-anchor="middle" fill="#ffe080" font-size="20" font-weight="bold">
    אותו וקטור-כתיבה, אותו ערך סופי — אבל ה-FF לוכד **ערך שגוי** בגלל delay
  </text>

  <!-- ============= BOTTOM: TWO-VECTOR TEST PANEL ============= -->
  <rect x="20" y="610" width="960" height="470" rx="12"
        fill="rgba(255,176,96,0.05)" stroke="rgba(255,176,96,0.55)" stroke-width="2"/>
  <text x="500" y="648" text-anchor="middle" fill="#ffc080" font-weight="bold" font-size="24">
    מבנה ה-test pattern — דרושים שני וקטורים רצופים
  </text>

  <!-- V1 box -->
  <rect x="60" y="680" width="270" height="100" rx="8" fill="rgba(96,192,255,0.06)" stroke="#80c8ff" stroke-width="2"/>
  <text x="195" y="710" text-anchor="middle" fill="#80c8ff" font-weight="bold" font-size="20">V1 — Stabilize</text>
  <text x="195" y="738" text-anchor="middle" fill="#c8b090" font-size="18">מציב את המעגל במצב התחלתי</text>
  <text x="195" y="762" text-anchor="middle" fill="#c8b090" font-size="18">(הקצה האחר של המעבר)</text>

  <!-- Arrow -->
  <path d="M 340 730 L 380 730" stroke="#cca040" stroke-width="2.4" fill="none" marker-end="url(#tArrow)"/>
  <defs>
    <marker id="tArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 Z" fill="#cca040"/>
    </marker>
  </defs>

  <!-- V2 box -->
  <rect x="400" y="680" width="270" height="100" rx="8" fill="rgba(204,102,255,0.06)" stroke="#cc66ff" stroke-width="2"/>
  <text x="535" y="710" text-anchor="middle" fill="#cc99ff" font-weight="bold" font-size="20">V2 — Launch</text>
  <text x="535" y="738" text-anchor="middle" fill="#c8b090" font-size="18">מפעיל את המעבר על המעגל</text>
  <text x="535" y="762" text-anchor="middle" fill="#c8b090" font-size="18">(הופך את הקצה — STR / STF)</text>

  <!-- Arrow -->
  <path d="M 680 730 L 720 730" stroke="#cca040" stroke-width="2.4" fill="none" marker-end="url(#tArrow)"/>

  <!-- Capture box -->
  <rect x="740" y="680" width="220" height="100" rx="8" fill="rgba(128,240,160,0.06)" stroke="#80f0a0" stroke-width="2"/>
  <text x="850" y="710" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="20">Capture</text>
  <text x="850" y="738" text-anchor="middle" fill="#c8b090" font-size="18">clock אחד — לוכד</text>
  <text x="850" y="762" text-anchor="middle" fill="#c8b090" font-size="18">את התוצאה ב-FF הבא</text>

  <!-- LOS vs LOC -->
  <text x="500" y="830" text-anchor="middle" fill="#ffc890" font-weight="bold" font-size="20">
    שתי סכימות להפקת V2:
  </text>

  <rect x="60" y="855" width="430" height="180" rx="8" fill="rgba(96,192,255,0.04)" stroke="rgba(128,212,255,0.4)" stroke-width="1.6"/>
  <text x="275" y="884" text-anchor="middle" fill="#80c8ff" font-weight="bold" font-size="20">Launch-on-Shift (LOS)</text>
  <text x="275" y="912" text-anchor="middle" fill="#c8b090" font-size="18">V2 מגיע מ-shift אחרון של scan</text>
  <text x="275" y="938" text-anchor="middle" fill="#c8b090" font-size="18">SE=1 → ביט אחרון נכנס</text>
  <text x="275" y="964" text-anchor="middle" fill="#c8b090" font-size="18">SE=0 → capture cycle</text>
  <text x="275" y="998" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">פשוט יותר, כיסוי טוב</text>

  <rect x="510" y="855" width="430" height="180" rx="8" fill="rgba(255,176,96,0.04)" stroke="rgba(255,176,96,0.4)" stroke-width="1.6"/>
  <text x="725" y="884" text-anchor="middle" fill="#ffc080" font-weight="bold" font-size="20">Launch-on-Capture (LOC)</text>
  <text x="725" y="912" text-anchor="middle" fill="#c8b090" font-size="18">V2 נוצר ע"י clock פונקציונלי</text>
  <text x="725" y="938" text-anchor="middle" fill="#c8b090" font-size="18">SE=0 לאורך שני ה-clocks</text>
  <text x="725" y="964" text-anchor="middle" fill="#c8b090" font-size="18">המעבר בא מלוגיקה אמיתית</text>
  <text x="725" y="998" text-anchor="middle" fill="#ff9933" font-size="18" font-weight="bold">at-speed אמיתי, ATPG קשה יותר</text>
</svg>`,
    parts: [
      {
        label: 'א',
        question: 'איך נראה ה-test pattern שמסוגל לתפוס תקלת \`slow-to-rise\`, ובמה הוא נבדל ממה שמספיק עבור stuck-at? תאר את ההבדל בין שתי השיטות המקובלות להפעלתו: **launch-on-shift (LOS)** לעומת **launch-on-capture (LOC)**.',
        hints: [
          'תקלת stuck-at היא מודל "תמיד תקוע בערך \`0\` או \`1\`". וקטור יחיד שמציב את הערך ההפוך חושף אותה.',
          'תקלת מעבר היא **delay**, לא ערך — השער/החוט מצליחים להגיע ליעד **אבל מאוחר מדי**.',
          'כדי לראות איך מעבר התרחש, צריך לראות גם את ה-**לפני** וגם את ה-**אחרי** — שני וקטורים רצופים.',
          'LOS: ה-vector השני מגיע מ-shift נוסף של scan (SE=1 בזמן ה-launch). פשוט לטעון, אבל ה-launch אינו at-speed אמיתי.',
          'LOC: ה-vector השני נוצר ע"י clock cycle פונקציונלי (SE=0). יותר נאמן ל-at-speed, אבל ATPG צריך למצוא וקטור שמייצר את ה-state הנדרש דרך הלוגיקה הפונקציונלית.',
        ],
        answer:
`### למה stuck-at לא מספיק

Stuck-at בודק רק את ה-**ערך הסופי** — וקטור יחיד, capture, השוואה. שער איטי שמגיע ליעד אחרי ה-capture window עדיין ייתן PASS למרות התקלה.

### Transition fault דורש **2 וקטורים רצופים**

| וקטור | תפקיד |
|---|---|
| **V1** initialization | מציב את הקצה ההפוך של המעבר |
| **V2** launch | מפעיל את ה-transition |
| Capture | clock פונקציונלי יחיד אחרי V2 |

V1 לבד = אין transition. V2 לבד = אין דלתא לעקוב אחריה. רק **שניהם יחד** חושפים את ה-delay.

### LOS לעומת LOC

| | **LOS** (launch-on-shift) | **LOC** (launch-on-capture) |
|---|---|---|
| **SE בזמן launch** | \`SE=1\` | \`SE=0\` |
| **מקור V2** | shift אחרון של scan | clock פונקציונלי דרך הלוגיקה |
| **ATPG** | פשוט (שליטה ישירה ב-V2) | קשה (חייב להגיע ל-V2 דרך הלוגיקה) |
| **at-speed** | לא לגמרי | אמיתי |

### בקנבס

\`stepValues\` על \`A\` מזין \`0,0,1,1...\` — V1 (יציבות ב-0) ואז V2 (launch ל-1). תופעת ה-\`slowToRise\` על מוצא \`FF_A\` חוסמת את ה-edge 0→1 פעם אחת: \`Q_A\` עולה ל-1 כצפוי, אבל \`Q_B\` נשאר \`0\` cycle נוסף במקום לתפוס מיד. זו בדיוק התסמונת ש-LOS/LOC נועדו לחשוף.`,
        interviewerMindset:
`**שאלה מתקדמת** בראיון DFT/ATE. המראיין מחפש:
1. **שאתה מבחין בין מודל ערך (stuck-at) למודל זמן (transition)** — שני קטגוריות שונות לחלוטין.
2. **שאתה זוכר 2-vector requirement** — וקטור יחיד לעולם לא יתפוס transition fault.
3. **שאתה מכיר LOS ו-LOC** — שני ה-schemes הסטנדרטיים בתעשייה.

**שאלת המשך נפוצה**: "באיזו תדירות (Hz) צריך להריץ את ה-capture clock לבדיקת transition?" → ב-**clock פונקציונלי** המלא של ה-chip (לדוגמה 1GHz). זה ה"at-speed" — בודקים אם הלוגיקה מספיקה ב-1ns של clock period. \`shift\` יכול להישאר ב-50MHz כדי לחסוך הספק.

**שאלת bonus**: "מה ההבדל בין transition fault ל-path-delay fault?" → transition fault מתייחס ל**שער/חוט יחיד**; path-delay מתייחס ל-**נתיב שלם** מ-FF ל-FF. Path-delay מודל מדויק יותר אבל יקר ב-ATPG (מספר הנתיבים הקריטיים יכול להגיע למיליונים).

**שאלת bonus 2**: "מה הקשר ל-process variation?" → ככל ש-process קרוב למרגין (5nm, 3nm), הסטיות בין transistors עולות. transition faults נפוצות יותר; chip לא נופל אבל לא רץ ב-Fmax המתוכנן — "מהיר אבל לא מספיק". בדיקה at-speed היא מי שתופס את זה.`,
        expectedAnswers: [
          'transition fault', 'slow-to-rise', 'slow-to-fall', 'STR', 'STF',
          'two vectors', '2 vectors', 'V1', 'V2',
          'stable', 'launch', 'capture', 'at-speed',
          'LOS', 'launch-on-shift', 'LOC', 'launch-on-capture',
          'delay', 'timing',
          'stuck-at', 'value',
        ],
        circuit: () => build(() => {
          // Two-FF chain with a NOT-NOT buffer between. The real
          // transition-fault model (`slowToRise`) sits on the wire
          // RIGHT AFTER FF_A.Q — semantically: the launch FF drives
          // a slow combinational path. stepValues on A walk V1 → V2
          // automatically so the student sees the transition launch.
          const clk  = h.clock(80, 480);
          const aIn  = h.input(80, 220, 'A');
          // V1 = stabilize at 0, V2 = launch to 1. Holding high so
          // FF_B's lagging capture is visible against FF_A's clean rise.
          aIn.stepValues = [0, 0, 1, 1, 1, 1, 1, 1];

          const ffA  = h.ffD(280, 220, 'FF_A');
          const inv1 = h.gate('NOT', 460, 220);
          const inv2 = h.gate('NOT', 620, 220);
          const ffB  = h.ffD(800, 220, 'FF_B');

          // Outputs sit downstream of each FF's Q pin — clearly AFTER
          // the flip-flop they sample, never before it.
          const qaOut = h.output(380, 100, 'Q_A');
          const qbOut = h.output(900, 100, 'Q_B');

          // Real transition fault — wire stalls the first 0→1 edge,
          // so FF_B captures the stale 0 instead of the new 1.
          const slowWire = h.wire(ffA.id, inv1.id, 0);
          slowWire.slowToRise = true;

          return {
            nodes: [clk, aIn, ffA, inv1, inv2, ffB, qaOut, qbOut],
            wires: [
              h.wire(aIn.id, ffA.id, 0),                  // A → FF_A.D
              h.wire(clk.id, ffA.id, 1, 0, { isClockWire: true }),
              slowWire,                                   // FF_A.Q → NOT  (SLOW-TO-RISE)
              h.wire(inv1.id, inv2.id, 0),                // NOT → NOT (net buffer)
              h.wire(inv2.id, ffB.id, 0),                 // NOT → FF_B.D
              h.wire(clk.id, ffB.id, 1, 0, { isClockWire: true }),
              h.wire(ffA.id, qaOut.id, 0),                // FF_A.Q → Q_A (post-FF)
              h.wire(ffB.id, qbOut.id, 0),                // FF_B.Q → Q_B (post-FF)
            ],
          };
        }),
      },
    ],
    source: 'יסוד ב-DFT — Transition Fault Model + at-speed testing',
    tags: ['transition-fault', 'delay-fault', 'slow-to-rise', 'slow-to-fall', 'at-speed', 'los', 'loc', 'dft'],
    circuitRevealsAnswer: true,
  },

  // ─────────────────────────────────────────────────────────────
  // #6012 — March C- RAM test (uses the marchCminus pattern just
  //   added to TestPatterns.js). Live circuit pre-injects a CFin
  //   coupling fault — student picks March C- from MEMORY TESTS
  //   and sees it caught in 10N ops vs Walking's N²+2N.
  // ─────────────────────────────────────────────────────────────
  {
    id: 'march-c-ram-linear',
    difficulty: 'medium',
    title: 'March C- — בדיקת RAM ב-O(N) במקום O(N²)',
    intro:
`Walking-1 / Walking-0 (שאלה #6006) תופסים coupling faults אבל עולים \`O(N²)\` אופרציות. לעיצובים גדולים (\`N=1024\`+) זה הופך לבלתי-מעשי: 1M+ ops לבדיקה אחת.

**March C-** הוא ה-standard התעשייתי שמקבל **\`coverage דומה ב-O(N)\` בלבד** — 10N ops. הסוד: שני passes הפוכים בכיוון (\`↑\` ascending ו-\`↓\` descending) שמכסים שני הקטבים של כל coupling fault.

נתון \`RAM 8x8\` (\`N=8\`). תאר את ששת ה-march elements של March C-. למה שני הכיוונים הכרחיים? כמה ops זה לעומת Walking?`,
    schematic: `
<svg viewBox="0 0 1000 1180" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="20" role="img" aria-label="March C- as six march elements, vertically stacked with arrows showing direction.">

  <text x="500" y="40" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    March C- — שישה march elements
  </text>
  <text x="500" y="70" text-anchor="middle" fill="#a0a0c0" font-size="20" font-style="italic">
    init + 4 passes (2× ascending + 2× descending) + final read
  </text>

  <!-- ====== ELEMENT BOX BUILDER (6 stacked) ====== -->
  <!-- M0 — init -->
  <rect x="60" y="110" width="880" height="120" rx="10"
        fill="rgba(96,192,255,0.05)" stroke="rgba(128,212,255,0.55)" stroke-width="2"/>
  <text x="100" y="155" fill="#80c8ff" font-weight="bold" font-size="24">M0</text>
  <text x="240" y="155" fill="#ffe080" font-weight="bold" font-size="32">⇕</text>
  <text x="320" y="155" fill="#c8d8f0" font-size="24" font-family="monospace">(w0)</text>
  <text x="500" y="155" fill="#c8b090" font-size="20">— initialize all cells to 0</text>
  <text x="100" y="200" fill="#a0a0c0" font-size="18">כיוון לא קריטי — רק init</text>
  <text x="780" y="200" text-anchor="end" fill="#80f0a0" font-size="18" font-weight="bold">N ops</text>

  <!-- M1 — ascending r0,w1 -->
  <rect x="60" y="245" width="880" height="120" rx="10"
        fill="rgba(128,240,160,0.05)" stroke="rgba(128,240,160,0.55)" stroke-width="2"/>
  <text x="100" y="290" fill="#80f0a0" font-weight="bold" font-size="24">M1</text>
  <text x="240" y="290" fill="#80f0a0" font-weight="bold" font-size="32">⇑</text>
  <text x="320" y="290" fill="#c8d8f0" font-size="24" font-family="monospace">(r0, w1)</text>
  <text x="500" y="290" fill="#c8b090" font-size="20">— ascending: read 0, write 1</text>
  <text x="100" y="335" fill="#a0a0c0" font-size="18">בודק כתיבה 0→1 בכיוון עולה</text>
  <text x="780" y="335" text-anchor="end" fill="#80f0a0" font-size="18" font-weight="bold">2N ops</text>

  <!-- M2 — ascending r1,w0 -->
  <rect x="60" y="380" width="880" height="120" rx="10"
        fill="rgba(128,240,160,0.05)" stroke="rgba(128,240,160,0.55)" stroke-width="2"/>
  <text x="100" y="425" fill="#80f0a0" font-weight="bold" font-size="24">M2</text>
  <text x="240" y="425" fill="#80f0a0" font-weight="bold" font-size="32">⇑</text>
  <text x="320" y="425" fill="#c8d8f0" font-size="24" font-family="monospace">(r1, w0)</text>
  <text x="500" y="425" fill="#c8b090" font-size="20">— ascending: read 1, write 0</text>
  <text x="100" y="470" fill="#a0a0c0" font-size="18">בודק כתיבה 1→0 בכיוון עולה</text>
  <text x="780" y="470" text-anchor="end" fill="#80f0a0" font-size="18" font-weight="bold">2N ops</text>

  <!-- M3 — descending r0,w1 -->
  <rect x="60" y="515" width="880" height="120" rx="10"
        fill="rgba(255,176,96,0.05)" stroke="rgba(255,176,96,0.55)" stroke-width="2"/>
  <text x="100" y="560" fill="#ffc080" font-weight="bold" font-size="24">M3</text>
  <text x="240" y="560" fill="#ffc080" font-weight="bold" font-size="32">⇓</text>
  <text x="320" y="560" fill="#c8d8f0" font-size="24" font-family="monospace">(r0, w1)</text>
  <text x="500" y="560" fill="#c8b090" font-size="20">— descending: read 0, write 1</text>
  <text x="100" y="605" fill="#a0a0c0" font-size="18">בודק 0→1 בכיוון יורד — תופס תקלות אסימטריות</text>
  <text x="780" y="605" text-anchor="end" fill="#ffc080" font-size="18" font-weight="bold">2N ops</text>

  <!-- M4 — descending r1,w0 -->
  <rect x="60" y="650" width="880" height="120" rx="10"
        fill="rgba(255,176,96,0.05)" stroke="rgba(255,176,96,0.55)" stroke-width="2"/>
  <text x="100" y="695" fill="#ffc080" font-weight="bold" font-size="24">M4</text>
  <text x="240" y="695" fill="#ffc080" font-weight="bold" font-size="32">⇓</text>
  <text x="320" y="695" fill="#c8d8f0" font-size="24" font-family="monospace">(r1, w0)</text>
  <text x="500" y="695" fill="#c8b090" font-size="20">— descending: read 1, write 0</text>
  <text x="100" y="740" fill="#a0a0c0" font-size="18">בודק 1→0 בכיוון יורד</text>
  <text x="780" y="740" text-anchor="end" fill="#ffc080" font-size="18" font-weight="bold">2N ops</text>

  <!-- M5 — final read -->
  <rect x="60" y="785" width="880" height="120" rx="10"
        fill="rgba(204,102,255,0.05)" stroke="rgba(204,102,255,0.55)" stroke-width="2"/>
  <text x="100" y="830" fill="#cc99ff" font-weight="bold" font-size="24">M5</text>
  <text x="240" y="830" fill="#ffe080" font-weight="bold" font-size="32">⇕</text>
  <text x="320" y="830" fill="#c8d8f0" font-size="24" font-family="monospace">(r0)</text>
  <text x="500" y="830" fill="#c8b090" font-size="20">— final: read 0 from all cells</text>
  <text x="100" y="875" fill="#a0a0c0" font-size="18">verification — כל התאים אמורים להיות 0</text>
  <text x="780" y="875" text-anchor="end" fill="#cc99ff" font-size="18" font-weight="bold">N ops</text>

  <!-- Total + comparison -->
  <rect x="60" y="930" width="880" height="220" rx="10"
        fill="rgba(64,80,100,0.06)" stroke="#3a4a5a" stroke-width="1.6"/>
  <text x="500" y="966" text-anchor="middle" fill="#ffc890" font-weight="bold" font-size="24">
    סה"כ = N + 2N + 2N + 2N + 2N + N = 10N ops
  </text>

  <!-- Comparison table inline -->
  <text x="220" y="1010" text-anchor="middle" fill="#80c8ff" font-weight="bold" font-size="20">N=8</text>
  <text x="500" y="1010" text-anchor="middle" fill="#ffc080" font-weight="bold" font-size="20">N=64</text>
  <text x="780" y="1010" text-anchor="middle" fill="#ff8080" font-weight="bold" font-size="20">N=1024</text>

  <text x="120" y="1050" fill="#cc99ff" font-size="20">Walking-1 (N²+2N):</text>
  <text x="220" y="1080" text-anchor="middle" fill="#c8b090" font-size="20">80</text>
  <text x="500" y="1080" text-anchor="middle" fill="#c8b090" font-size="20">4,224</text>
  <text x="780" y="1080" text-anchor="middle" fill="#ff8080" font-size="20" font-weight="bold">1,050,624</text>

  <text x="120" y="1118" fill="#80f0a0" font-size="20">March C- (10N):</text>
  <text x="220" y="1145" text-anchor="middle" fill="#c8b090" font-size="20">80</text>
  <text x="500" y="1145" text-anchor="middle" fill="#80f0a0" font-size="20" font-weight="bold">640</text>
  <text x="780" y="1145" text-anchor="middle" fill="#80f0a0" font-size="20" font-weight="bold">10,240</text>
</svg>`,
    parts: [
      {
        label: 'א',
        question: 'תאר את ששת ה-march elements של March C-. למה צריך **שני כיוונים** של passes (ascending + descending) ולא רק אחד? כמה ops לעומת Walking-1?',
        hints: [
          'March element הוא סדרה של reads + writes שמוחלים על כל התאים בסדר כלשהו (\`↑\` עולה או \`↓\` יורד).',
          'M0 הוא init של כל התאים ל-0. M5 הוא final verification של 0.',
          'M1, M2 הם passes עולים: M1 \`(r0, w1)\` ו-M2 \`(r1, w0)\` — שני המעברים.',
          'M3, M4 הם passes יורדים: \`(r0, w1)\` ו-\`(r1, w0)\` — אותה תוכן אבל בכיוון הפוך.',
          'תחשוב על coupling fault שתלוי בשכן \`previous\` — בכיוון ↑ השכן הוא \`addr-1\`, בכיוון ↓ הוא \`addr+1\`. כל coupling tilt-symmetric ייפלט רק על אחד מהכיוונים.',
          'סה"כ ops: \`N + 2N + 2N + 2N + 2N + N = 10N\`. ל-N=1024 זה ~10K, לעומת Walking-1 שעולה ~1M.',
        ],
        answer:
`### ששת ה-march elements

| Element | סוג | פעולות לכל תא | מטרה |
|---|:---:|---|---|
| M0 | ⇕ | \`w0\` | init הכל ל-0 |
| M1 | ⇑ | \`r0\`, \`w1\` | ascending: בדוק 0, כתוב 1 |
| M2 | ⇑ | \`r1\`, \`w0\` | ascending: בדוק 1, כתוב 0 |
| M3 | ⇓ | \`r0\`, \`w1\` | **descending**: בדוק 0, כתוב 1 |
| M4 | ⇓ | \`r1\`, \`w0\` | **descending**: בדוק 1, כתוב 0 |
| M5 | ⇕ | \`r0\` | verify all 0 |

### למה צריך שני כיוונים

Coupling faults נעות. דוגמה: \`CFin(aggressor=5, victim=3, trigger='01')\` — כתיבה \`0→1\` ל-addr 5 משנה את addr 3.

- בכיוון **↑** (ascending): כותבים ל-addr 3 לפני addr 5. כש-addr 5 משתנה ל-1, addr 3 כבר היה 1 — ה-flip מ-1 משאיר אותו ב-0. הוא נראה נכון בקריאה הבאה. **התקלה לא נתפסת בכיוון ↑.**
- בכיוון **↓** (descending): כותבים ל-addr 5 לפני addr 3. כש-addr 5 משתנה ל-1, addr 3 (שאמור להיות 0 כעת) נהפך ל-1. הקריאה הבאה ב-addr 3 מצפה ל-0 ומקבלת 1 → **FAIL**.

לכן המבחן חייב להפעיל את שני הסדרים: כל coupling fault אסימטרי לפחות באחד מהם.

### Walking-1 לעומת March C-

| N | Walking-1 (N²+2N) | March C- (10N) | יחס |
|---:|---:|---:|:---:|
| 8 | 80 | 80 | 1× |
| 64 | 4,224 | 640 | 6.6× |
| 1024 | 1,050,624 | 10,240 | **103×** |
| 65536 (64K) | 4.3 × 10⁹ | 655,360 | **6560×** |

זה למה תעשייה חוזרת לבחור March: ה-coverage כמעט זהה, אבל הזמן והעלות בקטן בסדר-גודל.

### בקנבס — תקלה מוזרקת

ה-RAM הוא \`8×8\` עם תקלת \`CFin(aggressor=2, victim=5, trigger='01')\` מוזרקת מראש. ב-\`MEMORY TESTS\` בחר:

- **March C-** → ▶ RUN → **FAIL** בכתובת 5 ✓ (התקלה נחשפת ב-M3 או M4 ב-pass היורד).
- **All-zero** → PASS (לא כותב 1 ל-addr 2; ה-coupling שקוף).
- **Walking-1** → FAIL בכתובת 5 (אבל ב-80 ops, אותו cost כמו March עבור N=8 — היתרון יוצא ב-N גדול).`,
        interviewerMindset:
`**שאלה תעשייתית מובהקת.** המראיין מחפש:
1. **שאתה זוכר את 6 ה-elements** — לא רק "10N ops" אלא איזה passes ולמה.
2. **שאתה מבין למה שני כיוונים** — coupling אסימטרי דורש שני סדרים. זו התובנה המרכזית.
3. **שאתה מציין את ה-O(N) win** — מי שלא מדגיש את הצמיחה הליניארית מפספס למה זה הסטנדרט.

**שאלת המשך נפוצה**: "מה ההבדל בין March C- ל-March C (הגרסה המקורית)?" → March C המקורי כלל element ביניים נוסף. C- (minus) הוא אופטימיזציה שדילגה עליו עם coverage כמעט זהה.

**שאלת bonus**: "מה ה-coverage של March C-?" → 100% של \`stuck-at\`, 100% של אדדרס-decoder, ~100% של coupling פשוטים. **לא תופס**: CFdyn (dynamic coupling שדורש 3+ vectors) ו-retention faults (דורש pause). לאלה צריך March SR, March RAW, וכו'.

**שאלת bonus 2**: "מי המציא?" → A.J. van de Goor (TU Delft, שנות ה-80). הספר שלו "Testing Semiconductor Memories" הוא הביבליה של memory test.`,
        expectedAnswers: [
          '10N', '10n', 'march', 'march c-', 'march c minus',
          '6 elements', 'six elements',
          'ascending', 'descending', 'both directions',
          'M0', 'M1', 'M2', 'M3', 'M4', 'M5',
          'w0', 'w1', 'r0', 'r1',
          'O(N)', 'linear',
          'coupling', 'asymmetric',
          'walking', 'comparison',
        ],
        circuit: () => build(() => {
          // 8×8 RAM with a CFin coupling fault pre-injected so the
          // student can pick March C- in MEMORY TESTS and see it
          // catch the fault that All-zero/All-one would miss.
          const ram = h.block('RAM', 480, 280, {
            addrBits: 3,
            dataBits: 8,
            label: 'RAM 8×8 — CFin: addr 2 → addr 5',
          });
          ram.couplingFaults = [
            { aggressor: 2, victim: 5, type: 'CFin', trigger: '01' },
          ];
          return { nodes: [ram], wires: [] };
        }),
      },
    ],
    source: 'יסוד ב-DFT — March memory test algorithms',
    tags: ['march', 'march-c', 'memory', 'ram', 'coupling', 'linear', 'production', 'dft'],
    circuitRevealsAnswer: true,
  },

  // ─────────────────────────────────────────────────────────────
  // #6013 — Fault Collapsing on a 3-input NAND
  //   Single part. Enumerates the 8 stuck-at faults on the gate,
  //   identifies equivalent ones (collapse to 5), and discusses
  //   dominance as a bonus. Live circuit lets the student
  //   manually inject any wire stuck-at and verify equivalence
  //   experimentally.
  // ─────────────────────────────────────────────────────────────
  {
    id: 'fault-collapsing-nand3',
    difficulty: 'medium',
    title: 'Fault Collapsing — צמצום רשימת התקלות לפני ATPG',
    intro:
`לפני שמריצים **ATPG** (Automatic Test Pattern Generation) על מעגל, נהוג לבצע **fault collapsing** — צמצום רשימת התקלות עפ"י תקלות שמייצרות **אותה התנהגות בפלט**. שתי תקלות שכאלה הן **equivalent** ואחת מהן מספיקה.

נתון שער \`NAND\` עם 3 כניסות \`A, B, C\` ויציאה \`Y\`:
\`\`\`
   Y = ¬(A · B · C)
\`\`\`

לכל קו (3 כניסות + 1 יציאה) יש 2 תקלות stuck-at אפשריות (\`s-a-0\` ו-\`s-a-1\`) → סך-הכל **8 תקלות**.

מהן הקבוצות של תקלות שקולות (equivalent), ומה הרשימה ה-**collapsed** המינימלית? כמה תקלות חוסכים?`,
    schematic: `
<svg viewBox="0 0 1000 480" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="20" role="img" aria-label="3-input NAND with 8 stuck-at fault sites marked.">

  <text x="500" y="40" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    NAND עם 3 כניסות — 8 תקלות stuck-at
  </text>
  <text x="500" y="68" text-anchor="middle" fill="#a0a0c0" font-size="20" font-style="italic">
    Y = ¬(A · B · C)
  </text>

  <rect x="20" y="90" width="960" height="380" rx="12"
        fill="rgba(96,192,255,0.04)" stroke="rgba(128,212,255,0.5)" stroke-width="2"/>

  <!-- NAND gate body (rounded D shape with bubble) -->
  <path d="M 380 200 L 480 200 A 90 90 0 0 1 480 380 L 380 380 Z" fill="#0a1825" stroke="#80c8ff" stroke-width="2.6"/>
  <circle cx="595" cy="290" r="10" fill="#0a1825" stroke="#80c8ff" stroke-width="2.6"/>
  <text x="430" y="296" text-anchor="middle" fill="#80c8ff" font-size="24" font-weight="bold">NAND</text>

  <!-- Inputs A, B, C -->
  <line x1="160" y1="230" x2="380" y2="230" stroke="#cca040" stroke-width="2.2"/>
  <text x="130" y="236" text-anchor="middle" fill="#cca040" font-size="24" font-weight="bold">A</text>
  <circle cx="270" cy="230" r="13" fill="#3a0a14" stroke="#ff6060" stroke-width="2"/>
  <text x="270" y="200" text-anchor="middle" fill="#ff6060" font-size="18" font-weight="bold">f1, f2</text>

  <line x1="160" y1="290" x2="380" y2="290" stroke="#cca040" stroke-width="2.2"/>
  <text x="130" y="296" text-anchor="middle" fill="#cca040" font-size="24" font-weight="bold">B</text>
  <circle cx="270" cy="290" r="13" fill="#3a0a14" stroke="#ff6060" stroke-width="2"/>
  <text x="270" y="320" text-anchor="middle" fill="#ff6060" font-size="18" font-weight="bold">f3, f4</text>

  <line x1="160" y1="350" x2="380" y2="350" stroke="#cca040" stroke-width="2.2"/>
  <text x="130" y="356" text-anchor="middle" fill="#cca040" font-size="24" font-weight="bold">C</text>
  <circle cx="270" cy="350" r="13" fill="#3a0a14" stroke="#ff6060" stroke-width="2"/>
  <text x="270" y="380" text-anchor="middle" fill="#ff6060" font-size="18" font-weight="bold">f5, f6</text>

  <!-- Output Y -->
  <line x1="605" y1="290" x2="850" y2="290" stroke="#ff9933" stroke-width="2.2"/>
  <text x="880" y="296" text-anchor="middle" fill="#ff9933" font-size="24" font-weight="bold">Y</text>
  <circle cx="730" cy="290" r="13" fill="#3a0a14" stroke="#ff6060" stroke-width="2"/>
  <text x="730" y="260" text-anchor="middle" fill="#ff6060" font-size="18" font-weight="bold">f7, f8</text>

  <!-- Fault legend -->
  <text x="500" y="438" text-anchor="middle" fill="#ff8080" font-size="18" font-style="italic">
    8 fault sites: A_sa0/sa1 · B_sa0/sa1 · C_sa0/sa1 · Y_sa0/sa1
  </text>
</svg>`,
    parts: [
      {
        label: 'א',
        question: 'זהה את **קבוצות התקלות השקולות (equivalent fault classes)** ב-NAND עם 3 כניסות. מה ה-**collapsed list** המינימלית (לפי equivalence בלבד)? כמה תקלות חוסכים, וכמה חיסכון אחוזי ב-ATPG?',
        hints: [
          'תקלת \`A_sa0\` משמעותה \`A\` תמיד \`0\` → \`Y = ¬(0·B·C) = ¬0 = 1\` תמיד.',
          'אז \`A_sa0\` מתנהג בדיוק כמו \`Y_sa1\` — שניהם מאלצים \`Y = 1\` בכל קומבינציה. זוהי שקילות.',
          'תקלות \`B_sa0\` ו-\`C_sa0\` באותה צורה: כל אחת מאלצת \`Y = 1\` תמיד. ארבעתן שקולות.',
          'תקלת \`A_sa1\` משאירה את הפלט תלוי ב-B, C: \`Y = ¬(1·B·C) = ¬(B·C)\`. שונה משאר התקלות.',
          'תקלת \`Y_sa0\` מאלצת \`Y = 0\` תמיד — אין תקלה אחרת על קלט שמשיגה את זה (ב-NAND אין דרך להפוך פלט מ-1 ל-0 דרך input).',
          'ספור את ה-equivalence classes: {A_sa0, B_sa0, C_sa0, Y_sa1} + {A_sa1} + {B_sa1} + {C_sa1} + {Y_sa0} = 5 classes.',
        ],
        answer:
`### זיהוי קבוצות שקילות

לכל תקלה, מה היה \`Y_faulty\` בכל 8 הקומבינציות (התשובה בטבלה למעלה)?

**Class 1 — מאלצים Y=1 תמיד:**
\`{A_sa0, B_sa0, C_sa0, Y_sa1}\`

כל ארבעתן מאלצות \`Y = 1\` בכל קומבינציה. למה? \`s-a-0\` על כניסה של NAND → אותו אפקט כמו אם הקלט הזה היה 0 → \`Y = ¬(...·0·...) = ¬0 = 1\` תמיד. וזה זהה ל-\`Y_sa1\`. ⇒ **תקלה אחת מייצגת את כל הארבע.**

**Singletons (לא שקולים לאף אחד):**
- \`A_sa1\`: \`Y = ¬(B·C)\` — שונה מ-Y free כש-(A,B,C) = (0,1,1). תקלה ייחודית.
- \`B_sa1\`: \`Y = ¬(A·C)\` — שונה כש-(1,0,1). ייחודית.
- \`C_sa1\`: \`Y = ¬(A·B)\` — שונה כש-(1,1,0). ייחודית.
- \`Y_sa0\`: \`Y = 0\` תמיד — ייחודי (אין input s-a שמשיגה את זה).

### Collapsed list (5 תקלות במקום 8)

| # | מייצג | מקור equivalence | תופס ע"י וקטור |
|---:|---|---|---|
| 1 | \`Y_sa1\` | {A_sa0, B_sa0, C_sa0, Y_sa1} | (1,1,1) — Y free = 0, faulty = 1 |
| 2 | \`A_sa1\` | unique | (0,1,1) |
| 3 | \`B_sa1\` | unique | (1,0,1) |
| 4 | \`C_sa1\` | unique | (1,1,0) |
| 5 | \`Y_sa0\` | unique | any except (1,1,1) — Y free = 1, faulty = 0 |

### חיסכון

- **לפני collapsing**: 8 תקלות
- **אחרי**: 5 תקלות
- **חיסכון**: 37.5% פחות תקלות שצריך לפתור ב-ATPG

עבור chip של 100M שערים → 100M × 0.375 = **37.5M תקלות פחות לעבד**. ATPG עוצר חיים — collapsing יכול לחסוך שעות של compute time.

### עוד צמצום אפשרי — Dominance

\`Y_sa0\` נתפסת ע"י כל וקטור שבו \`Y_free = 1\` (7 מתוך 8). זה כולל את הוקטורים שתופסים \`A_sa1, B_sa1, C_sa1\` (שהם בעצמם תת-קבוצה של ה-7). אומרים ש-\`Y_sa0\` **נשלטת ע"י (dominated by)** התקלות הספציפיות יותר — ATPG מתקדם יכול לדלג עליה אם הוקטור לתקלה ספציפית בלאו-הכי תופס אותה. צמצום dominance מוריד ל-4 או אפילו 3 תקלות, אבל הוא מקובל פחות כי הוא תלוי-וקטור.

### בקנבס

NAND עם 3 כניסות. שנה את \`A, B, C\` ב-\`(0,0,0)\` עד \`(1,1,1)\` ותראה \`Y\`. עכשיו לחץ-ימני על קו A, בחר \`Inject stuck-at-0\`. תראה: \`Y = 1\` בכל קומבינציה. הזרק במקום זה stuck-at-1 ב-Y → אותה התוצאה. **זוהי הדגמת ה-equivalence.**`,
        interviewerMindset:
`**שאלת יסוד** ב-DFT/ATPG. המראיין מחפש:
1. **שאתה זוכר את הכלל הפשוט** — \`s-a-0\` ב-input של NAND ≡ \`s-a-1\` ב-output. תקלה ב-input שמאלצת controlling value (0 ל-NAND/AND, 1 ל-NOR/OR) → שקולה ל-output sa עם הערך ההפוך.
2. **שאתה לא מפרט את כל ה-8 בנפרד** — מקבל את הזיהוי הגנרי של כלל "controlling value".
3. **שאתה מציין אחוז החיסכון** — 37.5% במקרה הזה.

**שאלת המשך**: "מה הכלל המקביל ל-NOR / OR?" → \`s-a-1\` ב-input של NOR (controlling value=1) ≡ \`s-a-0\` ב-output. אותו רעיון, פוליאריות הפוכה.

**שאלת bonus**: "האם המתודה מתפשטת ל-XOR?" → לא! XOR אין לו controlling value (שום ערך input מאלץ output). לכן אין שקילות פשוטה ב-XOR; כל תקלה ייחודית.

**שאלת bonus 2**: "מה האפקט בקנה-מידה של chip שלם?" → במקום \`5 × G\` תקלות (G=מספר שערים), כל equivalent collapsing מצמצם את התקלות ל-\`~3-4 × G\` בממוצע. עוד dominance מוריד ל-\`~2 × G\`. ASIC עם 100M שערים → 200M תקלות אחרי collapsing מלא, במקום 500M. קריטי לזמן ATPG.`,
        expectedAnswers: [
          'equivalent', 'equivalence', 'שקילות', 'שקולות',
          'A_sa0', 'B_sa0', 'C_sa0', 'Y_sa1',
          'A_sa1', 'B_sa1', 'C_sa1', 'Y_sa0',
          'controlling value', 'controlling',
          '5', 'five', '8', 'eight',
          '37.5%', '3/8',
          'collapsing', 'collapse', 'collapsed',
          'dominance', 'dominated',
        ],
        answerSchematic: `
<svg viewBox="0 0 1000 540" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="20" role="img" aria-label="Behavior of Y for all 8 input combinations under each of the 8 stuck-at faults — equivalence classes become visible.">

  <rect x="20" y="20" width="960" height="490" rx="12"
        fill="rgba(255,176,96,0.05)" stroke="rgba(255,176,96,0.55)" stroke-width="2"/>
  <text x="500" y="58" text-anchor="middle" fill="#ffc080" font-weight="bold" font-size="24">
    התנהגות ה-Y בכל קומבינציה של ABC
  </text>

  <!-- Table header -->
  <g font-size="18" font-weight="bold">
    <text x="80" y="112" text-anchor="middle" fill="#cca040">ABC</text>
    <text x="180" y="112" text-anchor="middle" fill="#80c8ff">Y free</text>
    <text x="290" y="112" text-anchor="middle" fill="#ff6080">A_sa0</text>
    <text x="370" y="112" text-anchor="middle" fill="#ff6080">A_sa1</text>
    <text x="450" y="112" text-anchor="middle" fill="#ff6080">B_sa0</text>
    <text x="530" y="112" text-anchor="middle" fill="#ff6080">B_sa1</text>
    <text x="610" y="112" text-anchor="middle" fill="#ff6080">C_sa0</text>
    <text x="690" y="112" text-anchor="middle" fill="#ff6080">C_sa1</text>
    <text x="800" y="112" text-anchor="middle" fill="#cc66ff">Y_sa0</text>
    <text x="900" y="112" text-anchor="middle" fill="#cc66ff">Y_sa1</text>
  </g>

  <!-- Table separator -->
  <line x1="40" y1="125" x2="960" y2="125" stroke="#3a4a5a" stroke-width="1.4"/>

  <!-- Table rows for 8 input combinations -->
  ${[
    { abc: '000', yFree: 1, vals: [1,1,1,1,1,1,0,1] },
    { abc: '001', yFree: 1, vals: [1,1,1,1,1,1,0,1] },
    { abc: '010', yFree: 1, vals: [1,1,1,1,1,1,0,1] },
    { abc: '011', yFree: 1, vals: [1,0,1,1,1,1,0,1] },
    { abc: '100', yFree: 1, vals: [1,1,1,1,1,1,0,1] },
    { abc: '101', yFree: 1, vals: [1,1,1,0,1,1,0,1] },
    { abc: '110', yFree: 1, vals: [1,1,1,1,1,0,0,1] },
    { abc: '111', yFree: 0, vals: [1,0,1,0,1,0,0,1] },
  ].map((r, i) => {
    const y = 150 + i * 42;
    const fills = ['#ff6080','#ff6080','#ff6080','#ff6080','#ff6080','#ff6080','#cc66ff','#cc66ff'];
    let html = `<text x="80" y="${y}" text-anchor="middle" fill="#cca040" font-size="18" font-weight="bold">${r.abc}</text>`;
    html += `<text x="180" y="${y}" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">${r.yFree}</text>`;
    const xs = [290, 370, 450, 530, 610, 690, 800, 900];
    r.vals.forEach((v, j) => {
      const fill = (v === r.yFree) ? '#c8b090' : fills[j];
      const weight = (v === r.yFree) ? 'normal' : 'bold';
      html += `<text x="${xs[j]}" y="${y}" text-anchor="middle" fill="${fill}" font-size="18" font-weight="${weight}">${v}</text>`;
    });
    return html;
  }).join('')}

  <text x="500" y="500" text-anchor="middle" fill="#ffe080" font-size="20" font-style="italic">
    תאים מודגשים = הפלט שונה מ-Y free — וקטור שמזהה את התקלה
  </text>
</svg>`,
        circuit: () => build(() => {
          // 3-input NAND with PIs and Y output. The student can
          // right-click any wire and inject stuck-at faults via
          // the wire context menu, then change A/B/C to verify
          // that equivalent faults produce identical Y values.
          const inpA = h.input(120, 180, 'A');
          const inpB = h.input(120, 280, 'B');
          const inpC = h.input(120, 380, 'C');
          const nandG = h.block('GATE_SLOT', 380, 280, {
            gate: 'NAND',
            label: 'NAND',
          });
          // GATE_SLOT defaults to 2 inputs; widen to 3.
          nandG.inputCount = 3;
          const outY = h.output(600, 280, 'Y');
          return {
            nodes: [inpA, inpB, inpC, nandG, outY],
            wires: [
              h.wire(inpA.id, nandG.id, 0),
              h.wire(inpB.id, nandG.id, 1),
              h.wire(inpC.id, nandG.id, 2),
              h.wire(nandG.id, outY.id, 0),
            ],
          };
        }),
      },
    ],
    source: 'יסוד ב-DFT — Fault collapsing for ATPG efficiency',
    tags: ['fault-collapsing', 'equivalent-faults', 'dominance', 'atpg', 'stuck-at', 'nand', 'dft'],
    circuitRevealsAnswer: true,
  },

  // ─────────────────────────────────────────────────────────────
  // #6014 — Scan Compression (EDT — Embedded Deterministic Test)
  //   Two-part: (a) Decompressor XOR network — how few external
  //   pins drive many internal scan chains, (b) Compactor XOR
  //   tree — how many internal outputs collapse to few external
  //   pins, with aliasing + X-state problems.
  // ─────────────────────────────────────────────────────────────
  {
    id: 'scan-compression-edt',
    difficulty: 'hard',
    title: 'Scan Compression (EDT) — מנגנון 100:1 ב-ASIC מודרני',
    intro:
`ASIC מודרני כולל **מיליוני** flip-flops, אבל ל-package יש רק \`~10\` פינים פיזיים ל-scan I/O. כדי לגשר על הפער, מוסיפים שני רכיבים זעירים:

- **Decompressor**: רשת XOR שמרחיבה \`k\` ביטים חיצוניים ל-\`N\` כניסות פנימיות של scan chains, כך ש-\`N = 100k\` עד \`1000k\`.
- **Compactor**: עץ XOR שמכווץ \`N\` יציאות של ה-chains בחזרה ל-\`k\` פינים חיצוניים.

יחד הם משיגים **compression ratio 100:1** עד 1000:1 — סטנדרט תעשייתי.

נתון 2 פינים חיצוניים ו-3 chains פנימיים. תכנן את ה-XOR לשני הכיוונים. מה ההגבלות?`,
    schematic: `
<svg viewBox="0 0 1000 1180" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="20" role="img" aria-label="Scan compression: decompressor XOR network (top) and compactor XOR tree (bottom).">

  <text x="500" y="40" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    EDT — מ-2 פינים ל-3 chains וחזרה
  </text>
  <text x="500" y="68" text-anchor="middle" fill="#a0a0c0" font-size="20" font-style="italic">
    decompressor (XOR network) → 3 scan chains → compactor (XOR tree)
  </text>

  <!-- ========== DECOMPRESSOR PANEL ========== -->
  <rect x="20" y="90" width="960" height="490" rx="12"
        fill="rgba(204,102,255,0.05)" stroke="rgba(204,102,255,0.55)" stroke-width="2"/>
  <text x="500" y="128" text-anchor="middle" fill="#cc99ff" font-weight="bold" font-size="24">
    DECOMPRESSOR — 2 פינים → 3 chains
  </text>

  <!-- External inputs e0, e1 (top) -->
  <circle cx="100" cy="200" r="22" fill="#0a1825" stroke="#cca040" stroke-width="2.4"/>
  <text x="100" y="206" text-anchor="middle" fill="#cca040" font-size="20" font-weight="bold">e0</text>
  <circle cx="100" cy="320" r="22" fill="#0a1825" stroke="#cca040" stroke-width="2.4"/>
  <text x="100" y="326" text-anchor="middle" fill="#cca040" font-size="20" font-weight="bold">e1</text>
  <text x="58" y="160" fill="#a0a0c0" font-size="18" font-style="italic">external</text>

  <!-- XOR gate -->
  <polygon points="450,250 500,232 540,250 540,290 500,308 450,290" fill="#1a3a2a" stroke="#80f0a0" stroke-width="2.2"/>
  <text x="495" y="276" text-anchor="middle" fill="#80f0a0" font-size="24" font-weight="bold">⊕</text>

  <!-- Wires from e0 to chain0 (s0) and to XOR -->
  <line x1="122" y1="200" x2="300" y2="200" stroke="#cca040" stroke-width="2.2"/>
  <line x1="300" y1="200" x2="300" y2="258" stroke="#cca040" stroke-width="2.2"/>
  <line x1="300" y1="258" x2="450" y2="258" stroke="#cca040" stroke-width="2.2"/>
  <circle cx="300" cy="200" r="5" fill="#cca040"/>
  <line x1="300" y1="200" x2="780" y2="200" stroke="#cca040" stroke-width="2.2"/>

  <!-- Wires from e1 -->
  <line x1="122" y1="320" x2="300" y2="320" stroke="#cca040" stroke-width="2.2"/>
  <line x1="300" y1="320" x2="300" y2="282" stroke="#cca040" stroke-width="2.2"/>
  <line x1="300" y1="282" x2="450" y2="282" stroke="#cca040" stroke-width="2.2"/>
  <circle cx="300" cy="320" r="5" fill="#cca040"/>
  <line x1="300" y1="320" x2="780" y2="320" stroke="#cca040" stroke-width="2.2"/>

  <!-- XOR output goes down to chain2 -->
  <line x1="540" y1="270" x2="600" y2="270" stroke="#80f0a0" stroke-width="2.2"/>
  <line x1="600" y1="270" x2="600" y2="440" stroke="#80f0a0" stroke-width="2.2"/>
  <line x1="600" y1="440" x2="780" y2="440" stroke="#80f0a0" stroke-width="2.2"/>

  <!-- Chain SCAN_FF blocks (right side) -->
  <g>
    <rect x="780" y="170" width="120" height="60" rx="6" fill="#0a1825" stroke="#80c8ff" stroke-width="2.2"/>
    <text x="840" y="196" text-anchor="middle" fill="#80c8ff" font-weight="bold" font-size="18">chain 0</text>
    <text x="840" y="215" text-anchor="middle" fill="#c8b090" font-size="18">SI = e0</text>
  </g>
  <g>
    <rect x="780" y="290" width="120" height="60" rx="6" fill="#0a1825" stroke="#80c8ff" stroke-width="2.2"/>
    <text x="840" y="316" text-anchor="middle" fill="#80c8ff" font-weight="bold" font-size="18">chain 1</text>
    <text x="840" y="335" text-anchor="middle" fill="#c8b090" font-size="18">SI = e1</text>
  </g>
  <g>
    <rect x="780" y="410" width="120" height="60" rx="6" fill="#1a3a2a" stroke="#80f0a0" stroke-width="2.6"/>
    <text x="840" y="436" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="18">chain 2</text>
    <text x="840" y="455" text-anchor="middle" fill="#c8b090" font-size="18">SI = e0 ⊕ e1</text>
  </g>

  <text x="500" y="530" text-anchor="middle" fill="#ffe080" font-size="18" font-style="italic">
    יתרון: 1.5× חיסכון. הגבלה: chain 2 לא עצמאי — תלוי לינארית ב-chain 0 ו-1.
  </text>
  <text x="500" y="558" text-anchor="middle" fill="#a0a0c0" font-size="18">
    ב-EDT אמיתי: LFSR + phase shifter במקום XOR שטוח, מאפשר עד 1000:1
  </text>

  <!-- ========== COMPACTOR PANEL ========== -->
  <rect x="20" y="600" width="960" height="560" rx="12"
        fill="rgba(255,176,96,0.05)" stroke="rgba(255,176,96,0.55)" stroke-width="2"/>
  <text x="500" y="638" text-anchor="middle" fill="#ffc080" font-weight="bold" font-size="24">
    COMPACTOR — 3 chains → 2 פינים
  </text>

  <!-- Chain outputs Q0, Q1, Q2 (left) -->
  <g>
    <rect x="100" y="710" width="120" height="60" rx="6" fill="#0a1825" stroke="#80c8ff" stroke-width="2.2"/>
    <text x="160" y="736" text-anchor="middle" fill="#80c8ff" font-weight="bold" font-size="18">chain 0</text>
    <text x="160" y="755" text-anchor="middle" fill="#c8b090" font-size="18">Q0</text>
  </g>
  <g>
    <rect x="100" y="840" width="120" height="60" rx="6" fill="#0a1825" stroke="#80c8ff" stroke-width="2.2"/>
    <text x="160" y="866" text-anchor="middle" fill="#80c8ff" font-weight="bold" font-size="18">chain 1</text>
    <text x="160" y="885" text-anchor="middle" fill="#c8b090" font-size="18">Q1</text>
  </g>
  <g>
    <rect x="100" y="970" width="120" height="60" rx="6" fill="#0a1825" stroke="#80c8ff" stroke-width="2.2"/>
    <text x="160" y="996" text-anchor="middle" fill="#80c8ff" font-weight="bold" font-size="18">chain 2</text>
    <text x="160" y="1015" text-anchor="middle" fill="#c8b090" font-size="18">Q2</text>
  </g>

  <!-- XOR gates for compactor -->
  <!-- o0 = Q0 ⊕ Q1 -->
  <polygon points="500,760 550,742 590,760 590,800 550,818 500,800" fill="#3a2a14" stroke="#ffc080" stroke-width="2.2"/>
  <text x="545" y="786" text-anchor="middle" fill="#ffc080" font-size="24" font-weight="bold">⊕</text>
  <!-- o1 = Q1 ⊕ Q2 -->
  <polygon points="500,910 550,892 590,910 590,950 550,968 500,950" fill="#3a2a14" stroke="#ffc080" stroke-width="2.2"/>
  <text x="545" y="936" text-anchor="middle" fill="#ffc080" font-size="24" font-weight="bold">⊕</text>

  <!-- Wires Q0 → o0 XOR -->
  <line x1="220" y1="740" x2="500" y2="768" stroke="#80c8ff" stroke-width="2.2"/>
  <!-- Q1 → both XORs -->
  <line x1="220" y1="870" x2="400" y2="870" stroke="#80c8ff" stroke-width="2.2"/>
  <line x1="400" y1="870" x2="400" y2="790" stroke="#80c8ff" stroke-width="2.2"/>
  <line x1="400" y1="790" x2="500" y2="790" stroke="#80c8ff" stroke-width="2.2"/>
  <circle cx="400" cy="870" r="5" fill="#80c8ff"/>
  <line x1="400" y1="870" x2="400" y2="918" stroke="#80c8ff" stroke-width="2.2"/>
  <line x1="400" y1="918" x2="500" y2="918" stroke="#80c8ff" stroke-width="2.2"/>
  <!-- Q2 → o1 XOR -->
  <line x1="220" y1="1000" x2="450" y2="1000" stroke="#80c8ff" stroke-width="2.2"/>
  <line x1="450" y1="1000" x2="450" y2="940" stroke="#80c8ff" stroke-width="2.2"/>
  <line x1="450" y1="940" x2="500" y2="940" stroke="#80c8ff" stroke-width="2.2"/>

  <!-- Compactor outputs -->
  <line x1="590" y1="780" x2="800" y2="780" stroke="#ff9933" stroke-width="2.4"/>
  <circle cx="830" cy="780" r="22" fill="#0a1825" stroke="#ff9933" stroke-width="2.4"/>
  <text x="830" y="786" text-anchor="middle" fill="#ff9933" font-size="20" font-weight="bold">o0</text>
  <text x="694" y="770" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">Q0 ⊕ Q1</text>

  <line x1="590" y1="930" x2="800" y2="930" stroke="#ff9933" stroke-width="2.4"/>
  <circle cx="830" cy="930" r="22" fill="#0a1825" stroke="#ff9933" stroke-width="2.4"/>
  <text x="830" y="936" text-anchor="middle" fill="#ff9933" font-size="20" font-weight="bold">o1</text>
  <text x="694" y="920" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">Q1 ⊕ Q2</text>

  <text x="500" y="1080" text-anchor="middle" fill="#ff8080" font-weight="bold" font-size="20">
    בעיה: aliasing — שתי תקלות שונות יכולות לתת אותו וקטור (o0,o1)
  </text>
  <text x="500" y="1108" text-anchor="middle" fill="#ff8080" font-weight="bold" font-size="20">
    בעיה: X-states — chain אחד עם X מזהם את כל ה-compactor output
  </text>
  <text x="500" y="1140" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">
    הפתרון התעשייתי: X-masking + פתרונות EDT מתקדמים יותר
  </text>
</svg>`,
    parts: [
      {
        label: 'א',
        question: '**Decompressor** — תכנן רשת XOR מינימלית שמרחיבה 2 פינים חיצוניים \`e0, e1\` ל-3 כניסות \`SI\` של scan chains פנימיים. מה ההגבלה ה-לינארית? כמה chains באמת **בלתי-תלויים** ניתן לטעון מ-2 פינים? למה לא 4?',
        hints: [
          'Decompressor הוא רשת XOR שטוחה (combinational): לכל קלט חיצוני, מחשב מספר combinations שונים שמועברים ל-chains.',
          's0 = e0 ישיר. s1 = e1 ישיר. s2 = e0 XOR e1 (שילוב לינארי שני).',
          'מה לגבי s3? כל פונקציה לינארית של 2 משתנים מעל GF(2) היא אחד מ-\`{0, e0, e1, e0⊕e1, 1, ¬e0, ¬e1, ¬(e0⊕e1)}\`. סה"כ 8 פונקציות, אבל רק 3 בלתי-תלויות (במובן רישא XOR-תלות).',
          'אז 2 פינים → מקסימום 3 chains בלתי-תלויים (במשמעות linear independence). chain 4 חייב להיות שילוב של הקודמים.',
          'בפועל EDT מודרני מוסיף phase shifter (LFSR) שמרחיב את החלל הליניארי לאורך זמן — chain 4 יכול לקבל "linear-independent over many cycles".',
        ],
        answer:
`### תכנון רשת ה-decompressor

\`\`\`
e0 ───┬───────────────────────────► s0  (chain 0)
      │
      └─┐
        │
        ▼
       XOR ─────────────────────► s2  (chain 2 = e0 ⊕ e1)
        ▲
        │
      ┌─┘
      │
e1 ───┴───────────────────────────► s1  (chain 1)
\`\`\`

### הסבר

- **s0 = e0** — wire ישיר. Chain 0 מקבל בדיוק את ערך \`e0\` בכל clock.
- **s1 = e1** — wire ישיר. Chain 1 מקבל \`e1\`.
- **s2 = e0 ⊕ e1** — שער XOR יחיד. Chain 2 מקבל את הסכום הלינארי.

ב-3 ה-chains עכשיו טוענים ערכים שונים בו-זמנית עם 2 פינים בלבד. **חיסכון של 1.5×** בפינים.

### למה לא 4 chains?

מ-2 משתנים בינאריים \`e0, e1\` ניתן לבנות בדיוק **\`2² = 4\`** combinations מובחנות: \`(00, 01, 10, 11)\`. אבל **שילובים לינאריים מעל GF(2)** של 2 משתנים הם רק 4: \`{0, e0, e1, e0⊕e1}\`. אם נדרשים בלתי-תלויים לינארית — רק **3 מהם בלתי-תלויים** (כי 4-ה-XOR-של-שני-הקודמים = 0, שילוב טריוויאלי).

לכן: **dim של החלל הליניארי = 2 (מספר הקלטים). מספר outputs בלתי-תלויים ≤ 2.** ה-3 שלנו (s0, s1, s2) כולל אחד תלוי (\`s2 = s0 ⊕ s1\`).

### לאן זה הולך ב-EDT אמיתי

ב-EDT מסחרי (Mentor, Synopsys), במקום XOR שטוח משתמשים ב-**phase shifter** מבוסס LFSR. ה-LFSR יוצר רצף pseudo-random ארוך מ-k bits של seed, וכל chain מקבל פונקציה (לינארית) של ה-state של ה-LFSR. כי ה-LFSR מספק יותר ביטים פנימיים מהקלט, ניתן לקבל \`N >> k\` chains בלתי-תלויים פרקטית. ASIC מודרני: \`k=10\` פינים → \`N=1000\` chains. **compression 100×.**

### בקנבס

ניתן רשת decompressor 2:3 מלאה. שנה \`e0, e1\` ב-(0,0), (0,1), (1,0), (1,1). תראה ש-\`s0=e0, s1=e1, s2=e0⊕e1\`. הצב \`SE=1\` כדי לטעון את ה-FFs דרך ה-chains. \`Q0, Q1, Q2\` יציגו את ה-state של כל chain.`,
        interviewerMindset:
`**שאלת compression** קלאסית בראיון DFT מתקדם. המראיין מחפש:
1. **שאתה רואה את ה-XOR network כ-linear function** — לא סתם "כמה XORs".
2. **שאתה מציין את ה-linear-independence limit** — \`max(N independent) = k\`. זה ההגבלה היסודית.
3. **שאתה מכיר את ה-phase shifter** — הפתרון האמיתי שעוקף את ההגבלה דרך ה-state של ה-LFSR.

**שאלת המשך**: "מה הגודל של ה-LFSR ב-EDT אמיתי?" → לרוב \`L = 24-32\`. הוא מספק \`2^L\` states פוטנציאליים → מספיק entropy ל-\`~thousands\` of independent chains.

**שאלת bonus**: "האם ה-decompressor משפיע על ATPG?" → כן! ATPG עכשיו צריך לפתור עבור ה-\`k\` ביטים החיצוניים כך שייצרו את ה-N ביטים פנימיים הרצויים. זה לעיתים בלתי-אפשרי (אם הוקטור הפנימי לא בתת-מרחב של ה-LFSR). אז ATPG מתקדם בודק את ה-coverage actually achievable ב-EDT שלך — לא רק את ה-fault list.`,
        expectedAnswers: [
          'XOR network', 'XOR',
          'e0', 'e1', 's0', 's1', 's2',
          'linear', 'independent', 'GF(2)', 'linearly independent',
          'phase shifter', 'LFSR',
          '3', 'three',
          'compression', '1.5×', '1.5x',
          'decompressor',
        ],
      },
      {
        label: 'ב',
        question: '**Compactor** — תכנן עץ XOR מינימלי שמכווץ 3 יציאות \`Q0, Q1, Q2\` (סוף ה-chains) ל-2 פינים חיצוניים \`o0, o1\`. מה ה-**aliasing problem** ומה ה-**X-state problem**? איך פותרים אותם בתעשייה?',
        hints: [
          'Compactor הוא עץ XOR שטוח שלוקח N ערכים ומחשב מספר combinations לינאריים מהם.',
          'בחירה אפשרית: o0 = Q0 ⊕ Q1, o1 = Q1 ⊕ Q2. כל Q משתתף לפחות באחד מהפלטים.',
          'Aliasing: שתי תקלות שונות יכולות לייצר את **אותו ערך** ב-(o0, o1) → המנתח לא מסוגל להבחין ביניהן. במיוחד אם תקלה משנה \`Q0\` ו-\`Q1\` באותה דרך, ה-XOR משאיר o0 ללא שינוי.',
          'X-state: אם chain אחד מייצר ערך לא-מוגדר \`X\` (לא 0 ולא 1, למשל בגלל initialization issues), ה-XOR ה-output הופך גם הוא ל-X. ה-X "מתפשט" בכל ה-compactor.',
          'פתרונות: X-masking, multiple-input signature register (MISR), אורח-וקטור (vector-by-vector observation) במקום signature.',
        ],
        answer:
`### תכנון ה-compactor

\`\`\`
Q0 ──┐
     ⊕──► o0  (Q0 ⊕ Q1)
Q1 ──┴┐
      │
Q1 ──┐│
     ⊕──► o1  (Q1 ⊕ Q2)
Q2 ──┘
\`\`\`

(\`Q1\` משתתף בשני הפלטים — כל אחד מ-\`Q0, Q1, Q2\` משפיע על לפחות אחד מהפלטים, כך ש-aliasing מינימלי בשילובים פשוטים).

### Aliasing — שתי תקלות → אותה signature

נניח תקלה A מהפכת \`Q0\` מ-0 ל-1. תקלה B מהפכת \`Q1\` מ-0 ל-1. שתיהן מייצרות \`o0 = 0⊕1 = 1\` (במקום 0 ⊕ 0 = 0). **הוקטור החיצוני זהה**, ובלי ה-Q הפנימיים אי-אפשר להבחין בין A ל-B.

**אבל**: o1 שונה. תקלה A: o1 = 0⊕Q2 = 0. תקלה B: o1 = 1⊕Q2 = 1. אז במקרה הזה ה-compactor מבחין. בכלל, מבנה ה-XOR צריך להבטיח **diversity** — לא תהיינה שתי תקלות שונות שמכוונות לאותו \`(o0, o1)\`.

ההסתברות ל-aliasing ב-XOR tree יורדת באופן אקספוננציאלי במספר ה-outputs: \`P(aliasing) ≈ 2^(-k)\` עבור \`k\` outputs.

### X-state — שדה מוקש

מה אם \`chain 1\` לא הספיק להתאתחל ויש בו \`X\` (unknown)? אז \`o0 = Q0 ⊕ X = X\` — הפלט מזוהם. ובגלל ש-\`Q1\` משפיע גם על \`o1\`, גם \`o1 = X\`. **X אחד משחית את כל ה-compactor output**.

ב-ASIC מודרני יש הרבה מקורות ל-X: zero-state בלוקים, latch lost שלא אותחל, asynchronous logic. **X-state יכול להוריד את ה-effective coverage ל-0**.

### פתרונות תעשייתיים

1. **X-masking**: לפני ה-XOR tree, MUX-ים שיכולים "להחביא" chain ספציפי. אם ATPG יודע שמ-chain 1 צפוי X בוקטור הזה, הוא מוודא ש-MUX יחסום אותו → \`Q1 → 0\` ב-XOR.
2. **MISR-based compactor**: עץ XOR נטען לתוך LFSR שאוסף signature לאורך זמן. signature קטן (16-32 bits) ב-end-of-test מספיק. כי MISR ממשיך לרוץ, X יחיד לא הורס את כל ה-signature לטווח ארוך.
3. **X-bounding**: ATPG מסמן את ה-Xs מראש ועוקף אותם בדפוסי הבדיקה.

### בקנבס

ה-compactor מקבל \`Q0, Q1, Q2\` משלוש ה-chains. שנה את ערכי ה-\`e0, e1\` ב-\`SE=1\`, פעם, ותראה את ה-Q-ים מתעדכנים. אחר-כך תראה את \`o0, o1\` מציגים את ה-XOR. ניסוי aliasing: נסה שני שילובים שונים של \`(e0, e1)\` שמייצרים אותו \`(o0, o1)\` — תגלה שזה לא קל אם המבנה מתוכנן היטב.`,
        interviewerMindset:
`**שאלה תעשייתית מתקדמת.** המראיין מחפש:
1. **שאתה מזהה את ה-aliasing problem** — XOR compactor הוא lossy בהגדרה.
2. **שאתה מזכיר X-states** — בעיה ש-95% מהמועמדים שוכחים. זה ההבדל בין junior ל-senior.
3. **שאתה מכיר MISR / X-masking** — פתרון מציאותי, לא רק תיאוריה.

**שאלת המשך**: "אם אני נוסיף chain רביעי, איך משתנה ה-XOR tree?" → צריך עוד שילובים. למשל \`o0 = Q0 ⊕ Q1 ⊕ Q3\`. ה-design קריטי — צריך להבטיח שכל זוג תקלות יוצר signature שונה.

**שאלת bonus**: "מה היחס המקסימלי של compression שמושג בתעשייה?" → 100-200× בפועל. מעבר לזה ה-X-state ratio גובה מחיר ב-coverage. גבולות תיאורטיים יותר (1000×) דורשים X-bounding מאוד מהוקרא ATPG.

**שאלת bonus 2**: "מה ההבדל בין EDT לבין ה-LBIST שראינו ב-#6001/#6002 (LFSR+MISR)?" → LBIST הוא random + signature; EDT הוא deterministic. ATPG בוחר seed → known good vectors. LBIST פסיבי, EDT אקטיבי. רוב ה-chips מודרניים משתמשים בשניהם.`,
        expectedAnswers: [
          'aliasing', 'X-state', 'X states', 'unknown',
          'XOR tree', 'compactor',
          'o0', 'o1', 'Q0', 'Q1', 'Q2',
          'masking', 'X-masking', 'MISR',
          'signature',
          '2^-k', '2^(-k)',
          'compression',
        ],
        circuit: () => build(() => {
          // EDT decompressor + 3 scan chains + compactor.
          //   - 2 external INPUTs e0, e1
          //   - XOR(e0, e1) feeds chain 2's SI
          //   - 3 SCAN_FFs as the 3 chains (each 1-bit)
          //   - 2 XOR compactor producing o0 = Q0^Q1, o1 = Q1^Q2
          //   - SE + CLK common
          //   - Q observation pads + compactor output pads
          const clk  = h.clock(80, 700);
          const seIn = h.input(80, 600, 'SE');
          const e0   = h.input(80, 200, 'e0');
          const e1   = h.input(80, 380, 'e1');

          // Decompressor XOR
          const decXor = h.gate('XOR', 280, 290);

          const ff0 = h.block('SCAN_FF', 500, 200, { label: 'chain0', initialQ: 0 });
          const ff1 = h.block('SCAN_FF', 500, 380, { label: 'chain1', initialQ: 0 });
          const ff2 = h.block('SCAN_FF', 500, 560, { label: 'chain2', initialQ: 0 });

          // Compactor XOR tree: o0 = Q0 ⊕ Q1, o1 = Q1 ⊕ Q2
          const compXor0 = h.gate('XOR', 720, 280);
          const compXor1 = h.gate('XOR', 720, 470);

          // Outputs
          const o0Out = h.output(900, 280, 'o0');
          const o1Out = h.output(900, 470, 'o1');
          const q0Out = h.output(680, 110, 'Q0');
          const q1Out = h.output(500, 110, 'Q1');
          const q2Out = h.output(720, 650, 'Q2');

          return {
            nodes: [
              clk, seIn, e0, e1, decXor,
              ff0, ff1, ff2,
              compXor0, compXor1,
              o0Out, o1Out, q0Out, q1Out, q2Out,
            ],
            wires: [
              // Decompressor: e0 → XOR.in0, e1 → XOR.in1
              h.wire(e0.id, decXor.id, 0),
              h.wire(e1.id, decXor.id, 1),

              // Chain TI inputs: ff0.TI = e0, ff1.TI = e1, ff2.TI = e0⊕e1
              h.wire(e0.id, ff0.id, 1),
              h.wire(e1.id, ff1.id, 1),
              h.wire(decXor.id, ff2.id, 1),

              // Functional D inputs tied to 0 (we don't drive D in this demo).
              // Leave them unconnected — SCAN_FF reads D as 0 by default.

              // SE common (pin 2)
              h.wire(seIn.id, ff0.id, 2),
              h.wire(seIn.id, ff1.id, 2),
              h.wire(seIn.id, ff2.id, 2),

              // CLK common (pin 3)
              h.wire(clk.id, ff0.id, 3, 0, { isClockWire: true }),
              h.wire(clk.id, ff1.id, 3, 0, { isClockWire: true }),
              h.wire(clk.id, ff2.id, 3, 0, { isClockWire: true }),

              // Compactor: o0 = Q0 ⊕ Q1
              h.wire(ff0.id, compXor0.id, 0),
              h.wire(ff1.id, compXor0.id, 1),

              // o1 = Q1 ⊕ Q2
              h.wire(ff1.id, compXor1.id, 0),
              h.wire(ff2.id, compXor1.id, 1),

              // Outputs
              h.wire(compXor0.id, o0Out.id, 0),
              h.wire(compXor1.id, o1Out.id, 0),
              h.wire(ff0.id, q0Out.id, 0),
              h.wire(ff1.id, q1Out.id, 0),
              h.wire(ff2.id, q2Out.id, 0),
            ],
          };
        }),
      },
    ],
    source: 'יסוד ב-DFT — Scan Compression (EDT / X-tolerance)',
    tags: ['scan-compression', 'edt', 'decompressor', 'compactor', 'xor-tree', 'aliasing', 'x-state', 'dft'],
    circuitRevealsAnswer: true,
  },

  // ─────────────────────────────────────────────────────────────
  // #6015 — Decoder / Retention RAM Faults
  //   Two-part. Decoder faults (AFcell, AFmult, AFwrong) and
  //   retention faults are fault models beyond the engine's
  //   cellFaults/couplingFaults. Live circuit uses a whole-word
  //   cellFault as a proxy for AFcell, demonstrating that
  //   Address-as-data catches what All-zero/All-one don't.
  // ─────────────────────────────────────────────────────────────
  {
    id: 'decoder-retention-ram-faults',
    difficulty: 'medium',
    title: 'תקלות מקודד-כתובות ותקלות retention ב-RAM',
    intro:
`Walking, Checkerboard, ו-March C- מטפלים בעיקר ב-**stuck-at** ו-**coupling**. אבל ב-RAM אמיתי קיימים סוגי תקלות נוספים שדורשים דפוסים שונים:

- **תקלות מקודד-כתובות** (Address Decoder Faults — AF): ה-decoder שמתרגם addr ל-row/column line הוא עצמו תקול. דוגמאות: כתובת לא מגיעה לאף תא; כתובת מגיעה למספר תאים; כתובת מגיעה לתא שגוי.
- **תקלות retention**: התא **שומר** ערך בכתיבה אבל **מאבד** אותו אחרי זמן (קיבול דולף ב-DRAM, או leakage ב-SRAM צפוף).

איך מזהים כל אחד, ומה הדפוסים המתאימים?`,
    schematic: `
<svg viewBox="0 0 1000 1080" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="20" role="img" aria-label="Three address-decoder fault models plus retention fault timeline.">

  <text x="500" y="40" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    מודלים של תקלות RAM מעבר ל-stuck-at
  </text>

  <!-- ============ DECODER FAULTS PANEL ============ -->
  <rect x="20" y="80" width="960" height="540" rx="12"
        fill="rgba(96,192,255,0.05)" stroke="rgba(128,212,255,0.55)" stroke-width="2"/>
  <text x="500" y="118" text-anchor="middle" fill="#80c8ff" font-weight="bold" font-size="24">
    Address Decoder Faults — 3 סוגים
  </text>

  <!-- AFcell -->
  <rect x="50" y="150" width="290" height="430" rx="10"
        fill="rgba(255,80,80,0.06)" stroke="rgba(255,96,96,0.55)" stroke-width="1.8"/>
  <text x="195" y="186" text-anchor="middle" fill="#ff8080" font-weight="bold" font-size="20">AFcell</text>
  <text x="195" y="210" text-anchor="middle" fill="#c8b090" font-size="18">תא בלתי-נגיש</text>
  <!-- Cell array sketch -->
  <g>
    ${Array.from({ length: 4 }, (_, a) => Array.from({ length: 4 }, (_, b) => {
      const x = 70 + b * 60;
      const y = 240 + a * 50;
      const dead = (a === 2 && b === 2);
      const fill = dead ? '#3a0a14' : '#0a1825';
      const stroke = dead ? '#ff6060' : '#3a4a60';
      return `<rect x="${x}" y="${y}" width="50" height="40" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="${dead ? 2.4 : 1.4}"/>${dead ? `<text x="${x+25}" y="${y+27}" text-anchor="middle" fill="#ff6060" font-size="20" font-weight="bold">×</text>` : ''}`;
    }).join('')).join('')}
  </g>
  <text x="195" y="490" text-anchor="middle" fill="#c8b090" font-size="18">decoder מגיע ל-X</text>
  <text x="195" y="513" text-anchor="middle" fill="#c8b090" font-size="18">תאים — אף תא לא נכתב</text>
  <text x="195" y="555" text-anchor="middle" fill="#ffe080" font-size="18" font-weight="bold">תופס: read-after-write</text>

  <!-- AFmult -->
  <rect x="355" y="150" width="290" height="430" rx="10"
        fill="rgba(255,176,96,0.06)" stroke="rgba(255,176,96,0.55)" stroke-width="1.8"/>
  <text x="500" y="186" text-anchor="middle" fill="#ffc080" font-weight="bold" font-size="20">AFmult</text>
  <text x="500" y="210" text-anchor="middle" fill="#c8b090" font-size="18">כתובת אחת → מספר תאים</text>
  <!-- Cell array with two cells highlighted -->
  <g>
    ${Array.from({ length: 4 }, (_, a) => Array.from({ length: 4 }, (_, b) => {
      const x = 375 + b * 60;
      const y = 240 + a * 50;
      const highlighted = (a === 2 && b === 1) || (a === 2 && b === 2);
      const fill = highlighted ? '#3a2a14' : '#0a1825';
      const stroke = highlighted ? '#ffc080' : '#3a4a60';
      return `<rect x="${x}" y="${y}" width="50" height="40" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="${highlighted ? 2.4 : 1.4}"/>${highlighted ? `<text x="${x+25}" y="${y+27}" text-anchor="middle" fill="#ffc080" font-size="18" font-weight="bold">A</text>` : ''}`;
    }).join('')).join('')}
  </g>
  <text x="500" y="490" text-anchor="middle" fill="#c8b090" font-size="18">decoder מגיע לשני תאים</text>
  <text x="500" y="513" text-anchor="middle" fill="#c8b090" font-size="18">בו-זמנית — write conflict</text>
  <text x="500" y="555" text-anchor="middle" fill="#ffe080" font-size="18" font-weight="bold">תופס: March C-</text>

  <!-- AFwrong -->
  <rect x="660" y="150" width="290" height="430" rx="10"
        fill="rgba(204,102,255,0.06)" stroke="rgba(204,102,255,0.55)" stroke-width="1.8"/>
  <text x="805" y="186" text-anchor="middle" fill="#cc99ff" font-weight="bold" font-size="20">AFwrong</text>
  <text x="805" y="210" text-anchor="middle" fill="#c8b090" font-size="18">כתובת → תא שגוי</text>
  <!-- Cell array with arrow from one cell to wrong one -->
  <g>
    ${Array.from({ length: 4 }, (_, a) => Array.from({ length: 4 }, (_, b) => {
      const x = 680 + b * 60;
      const y = 240 + a * 50;
      const fill = '#0a1825';
      const stroke = '#3a4a60';
      return `<rect x="${x}" y="${y}" width="50" height="40" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="1.4"/>`;
    }).join('')).join('')}
    <!-- Arrow from (row 2, col 1) to (row 2, col 3) showing wrong addressing -->
    <text x="765" y="367" text-anchor="middle" fill="#cc66ff" font-size="18" font-weight="bold">addr</text>
    <text x="885" y="367" text-anchor="middle" fill="#cc66ff" font-size="18" font-weight="bold">actual</text>
    <path d="M 765 380 Q 825 410, 885 380" stroke="#cc66ff" stroke-width="2" fill="none" marker-end="url(#decArr)"/>
    <defs>
      <marker id="decArr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 Z" fill="#cc66ff"/>
      </marker>
    </defs>
  </g>
  <text x="805" y="490" text-anchor="middle" fill="#c8b090" font-size="18">כתיבה ל-A מגיעה ל-B</text>
  <text x="805" y="513" text-anchor="middle" fill="#c8b090" font-size="18">— כתובת מבולגנת</text>
  <text x="805" y="555" text-anchor="middle" fill="#ffe080" font-size="18" font-weight="bold">תופס: Address-as-data</text>

  <!-- ============ RETENTION PANEL ============ -->
  <rect x="20" y="640" width="960" height="420" rx="12"
        fill="rgba(255,176,96,0.05)" stroke="rgba(255,176,96,0.55)" stroke-width="2"/>
  <text x="500" y="678" text-anchor="middle" fill="#ffc080" font-weight="bold" font-size="24">
    Retention Fault — הזיכרון "דולף"
  </text>

  <!-- Timeline -->
  <line x1="80" y1="800" x2="920" y2="800" stroke="#a0a0c0" stroke-width="2.4"/>
  <text x="60" y="806" text-anchor="end" fill="#a0a0c0" font-size="18">t</text>

  <!-- Write event -->
  <circle cx="160" cy="800" r="8" fill="#80f0a0"/>
  <text x="160" y="828" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">Write 1</text>
  <text x="160" y="848" text-anchor="middle" fill="#a0a0c0" font-size="18">cell stores 1</text>

  <!-- Pause -->
  <line x1="180" y1="800" x2="640" y2="800" stroke="#cca040" stroke-width="2.4" stroke-dasharray="6,4"/>
  <text x="410" y="772" text-anchor="middle" fill="#cca040" font-size="18" font-style="italic">pause T₁ (ms) — תא לבד</text>

  <!-- Read event with fault -->
  <circle cx="700" cy="800" r="8" fill="#ff6080"/>
  <text x="700" y="828" text-anchor="middle" fill="#ff6080" font-size="18" font-weight="bold">Read</text>
  <text x="700" y="848" text-anchor="middle" fill="#ff8080" font-size="18" font-weight="bold">→ קוראים 0!</text>
  <text x="700" y="868" text-anchor="middle" fill="#a0a0c0" font-size="18">קיבול דולף</text>

  <!-- Annotation -->
  <text x="500" y="940" text-anchor="middle" fill="#ffe080" font-size="20" font-weight="bold">
    הדפוס לזיהוי: pause-based pattern
  </text>
  <text x="500" y="970" text-anchor="middle" fill="#c8b090" font-size="18">
    write all 1s → wait T (ms) → read all → השוואה
  </text>
  <text x="500" y="998" text-anchor="middle" fill="#c8b090" font-size="18">
    תאים שאיבדו → קוראים 0 במקום 1
  </text>
  <text x="500" y="1030" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">
    בתעשייה: T נקבע ע"י refresh-period של ה-DRAM (typically 64ms / row)
  </text>
</svg>`,
    parts: [
      {
        label: 'א',
        question: 'תאר את 3 הסוגים של תקלות **address decoder** (AFcell, AFmult, AFwrong). איזה דפוס בדיקה תופס כל אחד? **למה All-zero / All-one לא תופסים את AFwrong**, ולמה דווקא Address-as-data כן?',
        hints: [
          'AFcell: כתובת מסוימת לא מגיעה לאף תא — כל write לכתובת זו פשוט "נופל". התא הזה תמיד מחזיר את ערך ההתחלה (לרוב 0). תופס: read-after-write עם ערכים שונים.',
          'AFmult: כתובת מגיעה לשני תאים בו-זמנית. כתיבה לכתובת A משנה גם תא B ⇒ דומה לתקלת coupling. תופס: March C- (שני כיווני pass).',
          'AFwrong: write לכתובת A מגיע בפועל לתא B (שונה). הקריאה מ-A מחזירה את ערך B במקום A.',
          'All-zero/All-one כותבים את **אותו ערך** לכל הכתובות. אז גם אם כתיבה ל-A מגיעה ל-B, B כבר היה אמור לקבל את אותו ערך. הקריאה מחזירה את הערך הנכון → התקלה שקופה.',
          'Address-as-data כותב ערך **שונה** לכל כתובת (cell A ← A). אז כתיבה ל-A שמגיעה ל-B מותירה את B עם ערך A במקום B. הקריאה מ-B מחזירה A — מיד נראית התקלה.',
        ],
        answer:
`### שלושת המודלים

| סוג | תיאור | תופעה ב-cell | דפוס שתופס |
|---|---|---|---|
| **AFcell** | כתובת לא מגיעה לאף תא | write נופל; read מחזיר ערך התחלה | read-after-write עם ערך לא-טריוויאלי |
| **AFmult** | כתובת → מספר תאים | write לכתובת A משנה גם תא נוסף | March C- (שני כיוונים) |
| **AFwrong** | כתובת → תא שגוי | write לכתובת A נכתב לתא B | **Address-as-data** |

### למה All-zero/All-one עיוורים ל-AFwrong

\`All-zero\` כותב \`0\` לכל הכתובות. נניח write לכתובת 3 מגיע בטעות לתא 7. אבל גם תא 7 אמור היה לקבל \`0\` (כי הוא לכאורה הכתובת הבאה ב-loop). אז שני התאים מקבלים \`0\`. כשקוראים אחר-כך \`addr=3\`, הקריאה מגיעה (נניח שבקריאה הכתובת עובדת נכון, או לפחות מובילה למקום שגוי באותה צורה כמו כתיבה) ומחזירה \`0\` — בדיוק כצפוי.

**הבעיה היסודית**: כשכל התאים נושאים את אותו ערך, ההבחנה בין "write הגיע לתא הנכון" לבין "write הגיע לתא לא נכון" נמחקת.

### למה Address-as-data **כן** עובד

ב-\`Address-as-data\`, \`mem[A] = A\` — כל תא נושא ערך **ייחודי**:
- כתיבה לכתובת 3 (ערך 3) שמגיעה בטעות לתא 7 → תא 7 נושא 3.
- קריאה מכתובת 7 → מחזירה 3 (במקום 7 כצפוי).
- mismatch → התקלה נחשפת.

עלות: \`2N\` ops (זול במיוחד). תפיסה: AFwrong + stuck-at + חלק מ-AFcell.

### בקנבס

ה-RAM הוא \`8×8\` עם **AFcell מוזרק** על תא \`addr=5\` (whole-word stuck-at-0 כ-proxy). הרץ \`MEMORY TESTS\`:
- **All-zero** → **PASS** (\`addr=5\` מחזיר \`0\` והערך הצפוי הוא \`0\` — לא רואים בעיה).
- **All-one** → **FAIL** ב-\`addr=5\` (כותבים \`0xFF\`, קוראים \`0x00\`).
- **Address-as-data** → **FAIL** ב-\`addr=5\` (כותבים \`5\`, קוראים \`0\`).
- **March C-** → **FAIL** ב-\`addr=5\` (תופס בכל פעם שמצפים ל-\`1\`).

זוהי הוכחה: AFcell נראה כמו stuck-at-0 — שני סוגי תקלות שונים אבל אותם דפוסים תופסים. **AFwrong אמיתי דורש שינוי במנוע** (החלפת כתובת), אבל ה-Address-as-data היה תופס אותו באותה צורה.`,
        interviewerMindset:
`**שאלת fault model** מתקדמת. המראיין מחפש:
1. **שאתה זוכר את 3 סוגי ה-AF** — מועמדים זוכרים בדרך-כלל רק "decoder fault" כללי.
2. **שאתה מסביר *למה* All-zero לא עובד** — זה הקסם של אותה תובנה שראינו ב-coupling (#6006): same-value patterns שקופים לתקלות שדורשות contrast.
3. **שאתה רואה את Address-as-data כ-2N שעושה הרבה יותר** — לא רק stuck-at אלא גם decoder.

**שאלת המשך נפוצה**: "האם March C- תופס AFwrong?" → לרוב כן, כי המבחנים בו מערבים \`r0/w1\` ו-\`r1/w0\` בכיוונים שונים. אם \`addr=3\` מגיע לתא 7 בכתיבה, אחר כך קריאה מ-3 לא מצפה לערך — תוקרא תוצאה לא נכונה. אבל לא כל גרסה של AFwrong נתפסת — תלוי בכיוון ובכמות ה-shift.

**שאלת bonus**: "בייצור, איפה ה-decoder fault פוגע יותר?" → ב-decoders של DRAM הגדולים יש hundreds של word-lines. fault על word-line קצר יכול לגרום ל-multiple selection או no-selection בכל row של ה-RAM. בלי decoder testing מקיף, chip יוצא מ-fab עם פגיעה ב-1000s של cells בלי שיודעים.`,
        expectedAnswers: [
          'AFcell', 'AFmult', 'AFwrong', 'address fault',
          'decoder', 'מקודד',
          'Address-as-data', 'address as data',
          'March C-', 'march',
          'unique value', 'same value',
          'no contrast', 'contrast', 'קונטרסט',
        ],
      },
      {
        label: 'ב',
        question: 'מהי תקלת **retention** ולמה היא חמקמקה? איזה דפוס תופס אותה, ולמה \`All-zero / All-one / March C-\` רגילים **לא מספיקים**?',
        hints: [
          'Retention fault: התא מצליח לכתוב ולקרוא **מיד**, אבל אחרי זמן (ms) — מאבד את הערך בגלל leakage / קיבול חלש.',
          'ב-DRAM: כל cell הוא קונדנסטור זעיר. אם הוא לא רענן ב-refresh cycle (~64ms), הוא יאבד. retention fault הוא קונדנסטור עם דליפה גדולה במיוחד.',
          'דפוס רגיל (March, Walking) כותב וקורא ב-ns. אין pause → ה-leakage לא הספיק להתפרץ.',
          'דפוס לזיהוי: **pause pattern** — \`write\` → \`pause N ms\` → \`read\`. ה-pause קריטי כדי לתת ל-leakage זמן.',
          'בתעשייה: pause של 100-200ms (מעבר ל-DRAM refresh interval), על כל cell בנפרד או על RAM שלם.',
        ],
        answer:
`### תקלת retention — הגדרה

תא מצליח בכל אחד מהפעולות הבסיסיות:
- write 1 → cell holds 1 (immediate)
- read → returns 1 (immediate)

**אבל** אחרי **pause של T millisecond**, הקונדנסטור (DRAM) או ה-feedback loop (SRAM) דולף, והערך הופך ל-0 בלי שאיש כתב. הקריאה לאחר ה-pause מחזירה \`0\` (או ערך בלתי-מוגדר).

### למה דפוסים רגילים לא תופסים

| דפוס | זמן בין write ל-read | תופס retention? |
|---|---|:---:|
| All-zero | nanoseconds | ✗ |
| All-one | ns | ✗ |
| March C- | ns בין כל op | ✗ |
| Walking-1/0 | ns | ✗ |
| **Pause-based** | **ms** (T sets) | ✓ |

הסוד: כל הדפוסים הרגילים רצים **מהר מדי**. ה-leakage לא הספיק לעשות נזק. רק כשמשהים את ה-read בכוונה, התקלה מתגלה.

### דפוס לזיהוי retention

\`\`\`
1. write 0xFF לכל ה-N תאים          (~N ns)
2. pause T milliseconds              (T ≈ 64-100 ms — refresh window)
3. read all expecting 0xFF           (קוראים — תאים פגומים מחזירים < 0xFF)
4. write 0x00 לכל ה-N תאים           (~N ns)
5. pause T milliseconds
6. read all expecting 0x00           (תאים שדולפים ל-1 ייתפסו כאן)
\`\`\`

עלות: \`2 × (2N + T·clock_freq)\`. ל-N=8 ו-T=64ms ב-100MHz clock: \`2 × (16 + 6.4M) ≈ 12.8M\` clock cycles. **שלוש מסדר-גודל יקר יותר** מ-March C-, ולכן רץ פחות פעמים בבדיקה.

### במציאות

DRAM testing במפעל מריץ retention test עם pause מתאם ל-spec של ה-chip (typically 64ms per row). ה-test מחיר כי הוא דורש זמן ממשי — אפשר לבצע אותו במקביל על אלפי chips. ATE מודרני (Teradyne UltraFlex, Advantest V93000) מתאים אסטרטגיות wait/check מתוחכמות.

### בקנבס

המנוע **אינו מדמה time-domain decay** — אין דרך לזרוק תקלת retention אמיתית. הדגמה כאן מסתפקת ב-RAM נקי, ובאנשי הסביבה צריך לסמוך על האלגוריתם המוצג. לטריגר אמיתי תזדקקו ל-ATE.`,
        interviewerMindset:
`**שאלה תעשייתית נישתית.** המראיין (במיוחד בראיון memory test, DRAM design, או mobile SoC) מחפש:
1. **שאתה מבחין retention מ-stuck-at** — לא "הזיכרון נשבר", אלא "הזיכרון מאבד עם הזמן".
2. **שאתה זוכר ש-pause הוא ה-trick** — שום דפוס בלי השהיה לא יתפוס.
3. **שאתה מציין את ה-cost** — זה למה retention test רץ rarely, ולא בכל wafer-sort.

**שאלת המשך**: "ההבדל בין DRAM ל-SRAM ב-retention?" → DRAM: cell הוא קונדנסטור active → דורש refresh כל ~64ms. SRAM: cell הוא flip-flop active → לא צריך refresh, אבל ב-process קצה (5nm) leakage גובהה ויש "retention-like" בעיות במצב standby.

**שאלת bonus**: "באיזה temperature ה-test רץ?" → לרוב \`hot\` (105-125°C) — temperature מאיץ leakage exponentially. test ב-room temp עלול לפספס defects שיופיעו ב-server-room.`,
        expectedAnswers: [
          'retention', 'leakage', 'דליפה',
          'pause', 'wait', 'sleep', 'השהיה',
          'time', 'milliseconds', 'ms',
          'refresh', 'DRAM',
          'capacitor', 'קיבול', 'קונדנסטור',
        ],
        circuit: () => build(() => {
          // 8×8 RAM with a whole-word stuck-at-0 on cell 5 as a
          // proxy for AFcell (cell becomes "unaddressable" in the
          // sense that writes don't stick — reads always return 0).
          // The student runs MEMORY TESTS to see which patterns
          // catch it:
          //   - All-zero → PASS  (stuck-0 happens to match)
          //   - All-one  → FAIL  (write 0xFF, read 0x00)
          //   - Address-as-data → FAIL  (write 5, read 0)
          //   - March C- → FAIL  (catches at multiple M-elements)
          //
          // Retention faults can't be modeled — the engine has no
          // time-domain decay. The question's text explains.
          const ram = h.block('RAM', 480, 280, {
            addrBits: 3,
            dataBits: 8,
            label: 'RAM 8×8 — AFcell proxy on addr 5',
          });
          ram.cellFaults = {
            5: { stuckAt: 0, bit: null },  // whole-word "unaddressable"
          };
          return { nodes: [ram], wires: [] };
        }),
      },
    ],
    source: 'יסוד ב-DFT — Address decoder + retention fault models',
    tags: ['decoder-fault', 'retention', 'AFcell', 'AFmult', 'AFwrong', 'address-as-data', 'DRAM', 'pause', 'dft'],
    circuitRevealsAnswer: true,
  },

  // ─────────────────────────────────────────────────────────────
  // #6016 — Stuck-Open (CMOS-specific transistor fault)
  //   Single part. Explains why stuck-open requires 2 consecutive
  //   vectors (V1 charges capacitance, V2 fails to discharge), and
  //   the textbook test strategy. Live circuit uses wire.open as
  //   a proxy — engine treats null as 0, so it demonstrates the
  //   structure but not the capacitive memory of real CMOS.
  // ─────────────────────────────────────────────────────────────
  {
    id: 'stuck-open-cmos-2vector',
    difficulty: 'hard',
    title: 'תקלת Stuck-Open ב-CMOS — דורש 2 וקטורים',
    intro:
`ב-CMOS, כל שער בנוי משני סוגי transistors: **pMOS** (pull-up ל-Vdd) ו-**nMOS** (pull-down ל-GND). תקלת **stuck-open** היא transistor שנשבר ו**אינו מוליך** גם כשגייטו מאופשר.

ההשלכה ייחודית ל-CMOS:
- אם pMOS פגום במצב open: כש-input=0 (וצריך לפתוח את pMOS) → ה-pMOS לא מוליך → output **floating**.
- ה-output שומר על הערך הקודם בזכות הקיבול הטפיל של חוט output.
- כלומר: התא הופך זמנית ל-**latch** עם זיכרון מסתורי, **לא** stuck-at קבוע.

לכן **בדיקת stuck-at רגילה (וקטור יחיד) לא תופסת תקלת stuck-open**. למה? ומה הדפוס שכן יתפוס?`,
    schematic: `
<svg viewBox="0 0 1000 1180" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="20" role="img" aria-label="CMOS inverter at transistor level with pMOS open fault, and 2-vector test sequence.">

  <text x="500" y="40" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    Stuck-Open ב-CMOS — transistor שלא מוליך
  </text>
  <text x="500" y="68" text-anchor="middle" fill="#a0a0c0" font-size="20" font-style="italic">
    הקיבול של החוט הופך את התא ל-latch זמני
  </text>

  <!-- ============ TOP: CMOS INVERTER WITH FAULT ============ -->
  <rect x="20" y="90" width="960" height="540" rx="12"
        fill="rgba(96,192,255,0.05)" stroke="rgba(128,212,255,0.55)" stroke-width="2"/>
  <text x="500" y="128" text-anchor="middle" fill="#80c8ff" font-weight="bold" font-size="24">
    CMOS Inverter — pMOS פתוח (stuck-open)
  </text>

  <!-- Vdd rail -->
  <line x1="400" y1="180" x2="600" y2="180" stroke="#ff6080" stroke-width="2.6"/>
  <text x="500" y="170" text-anchor="middle" fill="#ff6080" font-size="20" font-weight="bold">Vdd</text>

  <!-- pMOS (top — FAULTY) -->
  <rect x="450" y="200" width="100" height="100" rx="6" fill="#3a0a14" stroke="#ff6060" stroke-width="2.8" stroke-dasharray="4,4"/>
  <text x="500" y="244" text-anchor="middle" fill="#ff8080" font-size="20" font-weight="bold">pMOS</text>
  <text x="500" y="270" text-anchor="middle" fill="#ff6060" font-size="18" font-weight="bold">OPEN</text>
  <text x="500" y="288" text-anchor="middle" fill="#ff8080" font-size="16" font-style="italic">(broken)</text>

  <!-- pMOS source up (to Vdd), drain down (to output) -->
  <line x1="500" y1="180" x2="500" y2="200" stroke="#ff6080" stroke-width="2.4"/>
  <line x1="500" y1="300" x2="500" y2="380" stroke="#ff6080" stroke-width="2.4"/>

  <!-- Gate of pMOS (left side) -->
  <line x1="440" y1="250" x2="350" y2="250" stroke="#cca040" stroke-width="2"/>

  <!-- Input on left (drives both gates) -->
  <line x1="350" y1="250" x2="350" y2="460" stroke="#cca040" stroke-width="2.4"/>
  <circle cx="350" cy="355" r="6" fill="#cca040"/>
  <line x1="350" y1="355" x2="200" y2="355" stroke="#cca040" stroke-width="2.4"/>
  <circle cx="180" cy="355" r="18" fill="#0a1825" stroke="#cca040" stroke-width="2.4"/>
  <text x="180" y="361" text-anchor="middle" fill="#cca040" font-size="20" font-weight="bold">IN</text>

  <!-- Output -->
  <circle cx="500" cy="380" r="8" fill="#cca040"/>
  <line x1="500" y1="380" x2="780" y2="380" stroke="#ff9933" stroke-width="2.4"/>
  <circle cx="800" cy="380" r="18" fill="#0a1825" stroke="#ff9933" stroke-width="2.4"/>
  <text x="800" y="386" text-anchor="middle" fill="#ff9933" font-size="20" font-weight="bold">OUT</text>

  <!-- Capacitance icon on output -->
  <line x1="610" y1="370" x2="660" y2="370" stroke="#a0a0c0" stroke-width="2"/>
  <line x1="620" y1="378" x2="650" y2="378" stroke="#a0a0c0" stroke-width="2"/>
  <text x="635" y="402" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">C_load</text>

  <!-- nMOS (bottom — OK) -->
  <line x1="500" y1="380" x2="500" y2="460" stroke="#80f0a0" stroke-width="2.4"/>
  <rect x="450" y="460" width="100" height="100" rx="6" fill="#0a1825" stroke="#80f0a0" stroke-width="2.4"/>
  <text x="500" y="504" text-anchor="middle" fill="#80f0a0" font-size="20" font-weight="bold">nMOS</text>
  <text x="500" y="525" text-anchor="middle" fill="#a0c0d0" font-size="16">healthy</text>

  <!-- Gate of nMOS from input -->
  <line x1="440" y1="510" x2="350" y2="510" stroke="#cca040" stroke-width="2"/>
  <circle cx="350" cy="510" r="6" fill="#cca040"/>

  <!-- GND -->
  <line x1="500" y1="560" x2="500" y2="600" stroke="#80f0a0" stroke-width="2.4"/>
  <line x1="450" y1="600" x2="550" y2="600" stroke="#80f0a0" stroke-width="2.6"/>
  <line x1="465" y1="608" x2="535" y2="608" stroke="#80f0a0" stroke-width="2"/>
  <line x1="478" y1="616" x2="522" y2="616" stroke="#80f0a0" stroke-width="2"/>
  <text x="500" y="592" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">GND</text>

  <!-- ============ BOTTOM: TWO-VECTOR TEST ============ -->
  <rect x="20" y="650" width="960" height="510" rx="12"
        fill="rgba(255,176,96,0.05)" stroke="rgba(255,176,96,0.55)" stroke-width="2"/>
  <text x="500" y="688" text-anchor="middle" fill="#ffc080" font-weight="bold" font-size="24">
    מבחן 2-vector — לתפיסת stuck-open ב-pMOS
  </text>

  <!-- V1 vector -->
  <rect x="60" y="720" width="430" height="180" rx="8" fill="rgba(96,192,255,0.06)" stroke="#80c8ff" stroke-width="2"/>
  <text x="275" y="754" text-anchor="middle" fill="#80c8ff" font-weight="bold" font-size="20">V1 — Initialization</text>
  <text x="275" y="788" text-anchor="middle" fill="#c8b090" font-size="20">IN = 1 → nMOS מוליך → OUT = 0</text>
  <text x="275" y="816" text-anchor="middle" fill="#c8b090" font-size="18">הקיבול \`C_load\` נטען ל-0 (GND)</text>
  <text x="275" y="844" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">מצב התחלתי מוגדר</text>
  <text x="275" y="876" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">(אם בדיקה רגילה הייתה עוצרת כאן — PASS)</text>

  <!-- V2 vector -->
  <rect x="510" y="720" width="430" height="180" rx="8" fill="rgba(255,80,80,0.07)" stroke="#ff6060" stroke-width="2"/>
  <text x="725" y="754" text-anchor="middle" fill="#ff8080" font-weight="bold" font-size="20">V2 — Launch</text>
  <text x="725" y="788" text-anchor="middle" fill="#c8b090" font-size="20">IN = 0 → pMOS אמור לפתוח → OUT = 1</text>
  <text x="725" y="816" text-anchor="middle" fill="#ff8080" font-size="18">אבל pMOS פגום → C_load שומר על 0</text>
  <text x="725" y="844" text-anchor="middle" fill="#ff8080" font-weight="bold" font-size="18">⇒ קוראים OUT = 0 (לא 1!)</text>
  <text x="725" y="876" text-anchor="middle" fill="#ff6060" font-size="18" font-weight="bold">תקלה נתפסה ✓</text>

  <!-- Why single-vector misses it -->
  <rect x="60" y="930" width="880" height="190" rx="8" fill="rgba(64,80,100,0.06)" stroke="#3a4a5a" stroke-width="1.4"/>
  <text x="500" y="962" text-anchor="middle" fill="#ffc890" font-weight="bold" font-size="20">
    למה stuck-at testing (וקטור יחיד) מפספס?
  </text>
  <text x="500" y="995" text-anchor="middle" fill="#c8b090" font-size="18">
    אם רק IN=0 מבחנים (בלי V1 מוקדם): OUT תלוי במה ש-C_load כבר טען
  </text>
  <text x="500" y="1020" text-anchor="middle" fill="#c8b090" font-size="18">
    אם C_load טעון 1 מקודם → OUT=1 → PASS (לא תופסים)
  </text>
  <text x="500" y="1052" text-anchor="middle" fill="#ffe080" font-size="20" font-weight="bold">
    חייבים לטעון את הקיבול לערך **הפוך** בוקטור הראשון, ואז לבדוק
  </text>
  <text x="500" y="1085" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">
    אותו רעיון כמו transition fault (#6011) — שני וקטורים, מצב התחלתי + launch
  </text>
</svg>`,
    parts: [
      {
        label: 'א',
        question: 'תאר את תקלת **stuck-open** ולמה היא ייחודית ל-CMOS. למה **stuck-at testing עם וקטור יחיד לא תופס** אותה, ומה הוקטור הראשון (V1) חייב לעשות? איך זה דומה לתקלת transition (#6011) ובאיזה מובן שונה?',
        hints: [
          'Stuck-open: transistor pull-up (pMOS) או pull-down (nMOS) **שאינו מוליך** גם כשגייטו מבקש זאת.',
          'בלי pull-up פעיל, אין מי שמושך את ה-output ל-Vdd → ה-output **floating** → הערך תלוי במה שהקיבול הטפיל של חוט ה-output מחזיק.',
          'אם בוקטור הקודם ה-output היה 0 (nMOS פעל וניקה את הקיבול), הוא נשאר 0 גם אחרי שאמור היה לעלות ל-1.',
          'אם בוקטור הקודם ה-output היה 1 (במקרה), הוא יישאר 1 — וה-stuck-open יהיה שקוף.',
          'לכן: בודקים stuck-open של pMOS דורש: V1 שמטעין את הקיבול ל-0 (input=1), ואז V2 שמבקש pull-up (input=0). אם הקיבול לא נטען ל-1, fault.',
          'הדמיון ל-transition: שניהם דורשים 2 וקטורים. ההבדל: transition fault הוא delay בגלל איטיות; stuck-open הוא transistor שמעולם לא יוליך, וה-output הוא **memory** של הקיבול.',
        ],
        answer:
`### Stuck-Open — fault model

ב-CMOS inverter יש שני transistors:
- **pMOS** (top): מוליך כש-input=0, מושך output ל-Vdd
- **nMOS** (bottom): מוליך כש-input=1, מושך output ל-GND

תקלת **stuck-open** משמעותה אחד מהם **לא מוליך** גם כשגייטו פעיל (השער "מתבקש" להוליך, אבל הוא שבור).

### למה הקיבול הופך את התא ל-latch זמני

חוט ה-output יושב על קיבול טפיל \`C_load\` (~fF). בכל פעם שה-pull-up או pull-down פעיל, הקיבול נטען לערך החדש. **אם אף transistor לא פעיל** (התקלה הזו), הקיבול **שומר** על הערך הקודם. ה-CMOS gate הופך זמנית ל-**dynamic latch** עד שה-leakage מאיין את הערך (mss-ms).

### למה stuck-at testing נכשל

stuck-at testing בודק וקטור יחיד: מציב inputs, קורא outputs, משווה. בקנקטים של pMOS-stuck-open:

- אם הוקטור הוא \`input=0\` (אמור לעשות pull-up): ה-pMOS פגום. אבל אם הקיבול **במקרה** כבר טעון ל-1 (משאריות וקטור קודם), הקריאה תהיה PASS — לא רואים fault.
- אם הוקטור הוא \`input=1\`: ה-nMOS פעיל, מושך ל-0. תקלת pMOS לא בא לידי ביטוי. PASS.

**שום וקטור יחיד אינו מבטיח שהקיבול במצב הפוך לפני המבחן.**

### הפתרון: 2 וקטורים — V1 + V2

| וקטור | input | תפקיד |
|---|:---:|---|
| **V1** | \`1\` | nMOS פעיל → OUT=0, **C_load נטען ל-0** |
| **V2** | \`0\` | pMOS אמור להפעיל pull-up → OUT צריך להיות \`1\` |

ב-V2:
- אם pMOS תקין: pull-up מצליח, C_load נטען ל-1, קוראים OUT=1. PASS.
- אם pMOS open: C_load נשאר ב-0 (שום transistor לא מוליך), קוראים OUT=**0** במקום 1. **FAIL ✓**

### דמיון לתקלת transition

| | Transition Fault | Stuck-Open |
|---|---|---|
| מקור | delay של שער איטי | transistor שבור |
| מנגנון | מעבר לא מספיק להגיע | קיבול שומר על ערך הקודם |
| דורש 2-vectors | ✓ | ✓ |
| מתגלה ע"י stuck-at יחיד | ✗ | ✗ |

**ההבדל המהותי**: transition הוא delay → מצליח לבסוף; stuck-open הוא permanent → לעולם לא יגיע ליעד. שניהם דורשים את אותה תשתית בדיקה (2-vector at-speed) — לכן בתעשייה הם נבדקים יחד.

### בקנבס

המעגל הוא inverter chain \`IN → INV1 → INV2 → OUT\`. החוט בין INV1 ל-INV2 מסומן ב-\`wire.open = true\` כ-**proxy** ל-stuck-open. נסה:

1. \`IN=0\`: \`INV1\` מבקש להוציא \`1\`, אבל החוט פתוח → המנוע מתפרש זאת כ-\`null\` → \`INV2\` מקבל \`null\` (טופל כ-0) → OUT = \`NOT 0 = 1\`. (שונה ממה שהיה בשלמות, אבל קונסיסטנטי.)
2. \`IN=1\`: \`INV1\` מבקש להוציא \`0\`, החוט פתוח, אותה בעיה → OUT = 1 גם.

**מגבלת המנוע**: \`wire.open\` כאן תמיד מחזיר 0 בקצה (deterministic), ולא "שומר על ערך קודם" כפי שהקיבול אמיתי. ה-2-vector behavior המקורי נשאר בתיאוריה — אבל המבנה ניתן לבדיקה.`,
        interviewerMindset:
`**שאלה ברמת VLSI / device-physics.** המראיין מחפש:
1. **שאתה זוכר שזה ייחודי ל-CMOS** — לוגיקה אחרת (TTL, ECL) אין לה את אותה bipolar pull-up/pull-down structure.
2. **שאתה מבין את תפקיד הקיבול** — בלי הקיבול לא היה memory effect ולא היה צורך ב-2-vector.
3. **שאתה מציין את הקשר ל-transition** — שני ה-fault models משתפים את אותה תשתית 2-vector.

**שאלת המשך**: "מה stuck-short בהשוואה ל-stuck-open?" → Stuck-short: transistor שמוליך תמיד (גם כשלא צריך) → גורם ל-Vdd-GND short → catastrophic, רואים על-ידי IDDQ (current measurement, לא logic). זה הייעוד של \`IDDQ testing\`.

**שאלת bonus**: "באיזה process node התקלות האלה הופכות נפוצות יותר?" → ב-process קצה (5nm, 3nm) defect density עולה, יחד עם variation. transition + stuck-open הופכים critical. כל chip מודרני עובר test for-this.

**שאלת bonus 2**: "האם CMOS dynamic logic יותר רגיש לזה?" → כן! Dynamic logic מסתמך *במפורש* על capacitance memory. תקלת stuck-open הופכת לסיוט — קשה לבדוק כי behavior נראה רגיל לרוב הזמן.`,
        expectedAnswers: [
          'stuck-open', 'stuck open',
          'pMOS', 'nMOS', 'transistor',
          'floating', 'float', 'capacitor', 'capacitance', 'C_load',
          'V1', 'V2', '2 vectors', 'two vectors',
          'memory', 'latch', 'dynamic',
          'initialization', 'launch',
          'transition',
          'CMOS',
        ],
        circuit: () => build(() => {
          // Inverter chain IN → INV1 → INV2 → OUT, with the wire
          // between INV1 and INV2 marked as `open` to simulate the
          // pMOS stuck-open extreme case. The engine treats open
          // as null and downstream gates evaluate it as 0 — so the
          // demo is structural rather than capacitance-aware. The
          // student observes that the inverter chain no longer
          // propagates IN; the answer text explains the limitation.
          const inIn  = h.input(120, 240, 'IN');
          const inv1  = h.gate('NOT', 320, 240);
          const inv2  = h.gate('NOT', 540, 240);
          const outOut = h.output(740, 240, 'OUT');

          // Stuck-open proxy: the wire from INV1 to INV2 is "open"
          const openWire = h.wire(inv1.id, inv2.id, 0);
          openWire.open = true;

          // Also a "healthy" reference chain for comparison
          const ref = h.gate('NOT', 320, 400);
          const ref2 = h.gate('NOT', 540, 400);
          const refOut = h.output(740, 400, 'OUT (clean)');

          return {
            nodes: [inIn, inv1, inv2, outOut, ref, ref2, refOut],
            wires: [
              h.wire(inIn.id, inv1.id, 0),
              openWire,                                   // FAULTY wire
              h.wire(inv2.id, outOut.id, 0),
              // Reference (clean) chain
              h.wire(inIn.id, ref.id, 0),
              h.wire(ref.id, ref2.id, 0),                 // healthy
              h.wire(ref2.id, refOut.id, 0),
            ],
          };
        }),
      },
    ],
    source: 'יסוד ב-DFT — Stuck-Open transistor-level fault model',
    tags: ['stuck-open', 'cmos', 'transistor', 'pMOS', 'nMOS', '2-vector', 'capacitance', 'dft'],
    circuitRevealsAnswer: true,
  },
];
