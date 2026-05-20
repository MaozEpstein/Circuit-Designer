/**
 * IQ — DFT questions. See IQ/README.md and IQ/timing-cdc/index.js for the
 * shape. Add entries to QUESTIONS and they appear in the panel automatically.
 */

import { build, h } from '../../js/interview/circuitHelpers.js';

const LFSR4_SVG = `
<svg viewBox="0 0 560 260" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono', monospace" font-size="11" role="img" aria-label="4-bit Fibonacci LFSR with taps 3,0">
  <text x="280" y="20" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="13">4-bit Fibonacci LFSR — taps [3,0]</text>
  <text x="280" y="38" text-anchor="middle" fill="#c8d8f0" font-size="10">x⁴ + x + 1  (primitive, period 15)</text>

  <!-- 4 FFs in a row (left = high bit = b3, right = low = b0) -->
  <g stroke="#80b0e0" stroke-width="1.6" fill="#0a1520">
    <rect x="80"  y="100" width="60" height="60"/>
    <rect x="180" y="100" width="60" height="60"/>
    <rect x="280" y="100" width="60" height="60"/>
    <rect x="380" y="100" width="60" height="60"/>
  </g>
  <g fill="#c8d8f0" text-anchor="middle" font-size="11">
    <text x="110" y="135">b3</text>
    <text x="210" y="135">b2</text>
    <text x="310" y="135">b1</text>
    <text x="410" y="135">b0</text>
  </g>
  <g fill="#80b0e0" text-anchor="middle" font-size="9">
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
  <text x="40" y="225" text-anchor="middle" fill="#ffb878" font-weight="bold" font-size="14">⊕</text>
  <text x="40" y="248" text-anchor="middle" fill="#ffb878" font-size="9">XOR</text>

  <!-- b3 → XOR (top tap) -->
  <path d="M 110 160 L 110 200 L 54 200 L 54 214" stroke="#80f0a0" fill="none" stroke-width="1.3" marker-end="url(#l-arr-g)"/>
  <text x="78" y="195" fill="#80f0a0" font-size="9">tap b3</text>
  <!-- b0 → XOR (bottom tap) -->
  <path d="M 410 160 L 410 230 L 54 230 L 54 226" stroke="#80f0a0" fill="none" stroke-width="1.3" marker-end="url(#l-arr-g)"/>
  <text x="240" y="245" fill="#80f0a0" font-size="9">tap b0</text>

  <!-- XOR → b3.D -->
  <path d="M 40 206 L 40 75 L 110 75 L 110 100" stroke="#ffb878" fill="none" stroke-width="1.5" marker-end="url(#l-arr-o)"/>
  <text x="75" y="70" fill="#ffb878" font-size="10" font-weight="bold">new bit</text>

  <!-- Serial Q output = b3 -->
  <path d="M 440 130 L 510 130" stroke="#80c8ff" stroke-width="1.8" marker-end="url(#l-arr-b)"/>
  <text x="475" y="124" text-anchor="middle" fill="#80c8ff" font-weight="bold" font-size="11">Q</text>
  <text x="475" y="147" text-anchor="middle" fill="#80c8ff" font-size="9">(serial out = b3)</text>

  <defs>
    <marker id="l-arr"   viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#c8d8f0"/></marker>
    <marker id="l-arr-g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#80f0a0"/></marker>
    <marker id="l-arr-o" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#ffb878"/></marker>
    <marker id="l-arr-b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#80c8ff"/></marker>
  </defs>
</svg>
`;

const MISR4_SVG = `
<svg viewBox="0 0 760 560" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono', monospace" font-size="11" role="img" aria-label="4-bit MISR — gate-level (4 D-FFs + 5 XORs)">
  <text x="380" y="22" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="13">4-bit MISR — gate-level (4 D-FFs + 5 XORs)</text>
  <text x="380" y="40" text-anchor="middle" fill="#c8d8f0" font-size="10">per-cell XOR mixes D[i] with the shifted bit; feedback XOR closes the loop (taps [3,0])</text>

  <!-- Column x centres -->
  <!-- col0 (LSB FF0): 110 | col1 (FF1): 290 | col2 (FF2): 470 | col3 (MSB FF3): 650 -->

  <!-- D inputs (green pads at top) -->
  <g>
    <circle cx="110" cy="80" r="15" fill="#0a2018" stroke="#80f0a0" stroke-width="1.8"/>
    <text x="110" y="84" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="12">D0</text>
    <circle cx="290" cy="80" r="15" fill="#0a2018" stroke="#80f0a0" stroke-width="1.8"/>
    <text x="290" y="84" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="12">D1</text>
    <circle cx="470" cy="80" r="15" fill="#0a2018" stroke="#80f0a0" stroke-width="1.8"/>
    <text x="470" y="84" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="12">D2</text>
    <circle cx="650" cy="80" r="15" fill="#0a2018" stroke="#80f0a0" stroke-width="1.8"/>
    <text x="650" y="84" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="12">D3</text>
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
    <text x="110" y="195" text-anchor="middle" fill="#ffb878" font-weight="bold" font-size="12">XOR</text>
    <text x="110" y="208" text-anchor="middle" fill="#ffb878" font-size="9">▷ 0</text>

    <rect x="260" y="175" width="60" height="36" rx="3" fill="#0a1520" stroke="#ffb878" stroke-width="1.8"/>
    <text x="290" y="195" text-anchor="middle" fill="#ffb878" font-weight="bold" font-size="12">XOR</text>
    <text x="290" y="208" text-anchor="middle" fill="#ffb878" font-size="9">▷ 0</text>

    <rect x="440" y="175" width="60" height="36" rx="3" fill="#0a1520" stroke="#ffb878" stroke-width="1.8"/>
    <text x="470" y="195" text-anchor="middle" fill="#ffb878" font-weight="bold" font-size="12">XOR</text>
    <text x="470" y="208" text-anchor="middle" fill="#ffb878" font-size="9">▷ 0</text>

    <rect x="620" y="175" width="60" height="36" rx="3" fill="#0a1520" stroke="#ffb878" stroke-width="1.8"/>
    <text x="650" y="195" text-anchor="middle" fill="#ffb878" font-weight="bold" font-size="12">XOR</text>
    <text x="650" y="208" text-anchor="middle" fill="#ffb878" font-size="9">▷ 0</text>
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
    <text x="110" y="285" text-anchor="middle" fill="#c8d8f0" font-weight="bold" font-size="14">D</text>
    <text x="110" y="304" text-anchor="middle" fill="#80b0e0" font-size="9">FF0 (LSB)</text>
    <text x="138" y="278" text-anchor="end" fill="#c8d8f0" font-size="9">Q</text>
    <path d="M 75 320 L 84 314 L 75 308 z" fill="#80c8ff"/>

    <rect x="250" y="260" width="80" height="70" rx="4" fill="#0a1520" stroke="#80b0e0" stroke-width="1.8"/>
    <text x="290" y="285" text-anchor="middle" fill="#c8d8f0" font-weight="bold" font-size="14">D</text>
    <text x="290" y="304" text-anchor="middle" fill="#80b0e0" font-size="9">FF1</text>
    <text x="318" y="278" text-anchor="end" fill="#c8d8f0" font-size="9">Q</text>
    <path d="M 255 320 L 264 314 L 255 308 z" fill="#80c8ff"/>

    <rect x="430" y="260" width="80" height="70" rx="4" fill="#0a1520" stroke="#80b0e0" stroke-width="1.8"/>
    <text x="470" y="285" text-anchor="middle" fill="#c8d8f0" font-weight="bold" font-size="14">D</text>
    <text x="470" y="304" text-anchor="middle" fill="#80b0e0" font-size="9">FF2</text>
    <text x="498" y="278" text-anchor="end" fill="#c8d8f0" font-size="9">Q</text>
    <path d="M 435 320 L 444 314 L 435 308 z" fill="#80c8ff"/>

    <rect x="610" y="260" width="80" height="70" rx="4" fill="#0a1520" stroke="#80b0e0" stroke-width="1.8"/>
    <text x="650" y="285" text-anchor="middle" fill="#c8d8f0" font-weight="bold" font-size="14">D</text>
    <text x="650" y="304" text-anchor="middle" fill="#80b0e0" font-size="9">FF3 (MSB)</text>
    <text x="678" y="278" text-anchor="end" fill="#c8d8f0" font-size="9">Q</text>
    <path d="M 615 320 L 624 314 L 615 308 z" fill="#80c8ff"/>
  </g>

  <!-- CLK bus (cyan dashed, shared across all FFs) -->
  <g>
    <path d="M 40 350 L 720 350" stroke="#22ccff" stroke-width="1.4" stroke-dasharray="6 3" fill="none"/>
    <text x="20" y="354" fill="#22ccff" font-weight="bold" font-size="11">clk</text>
    <path d="M 110 350 L 110 320" stroke="#22ccff" stroke-width="1.4" stroke-dasharray="6 3" fill="none"/>
    <path d="M 290 350 L 290 320" stroke="#22ccff" stroke-width="1.4" stroke-dasharray="6 3" fill="none"/>
    <path d="M 470 350 L 470 320" stroke="#22ccff" stroke-width="1.4" stroke-dasharray="6 3" fill="none"/>
    <path d="M 650 350 L 650 320" stroke="#22ccff" stroke-width="1.4" stroke-dasharray="6 3" fill="none"/>
  </g>

  <!-- SIG output pads (red, like the canvas) -->
  <g>
    <text x="110" y="380" text-anchor="middle" fill="#80c8ff" font-size="10" font-weight="bold">SIG[0]</text>
    <circle cx="110" cy="405" r="18" fill="#2a0a14" stroke="#80c8ff" stroke-width="1.5"/>
    <text x="290" y="380" text-anchor="middle" fill="#80c8ff" font-size="10" font-weight="bold">SIG[1]</text>
    <circle cx="290" cy="405" r="18" fill="#2a0a14" stroke="#80c8ff" stroke-width="1.5"/>
    <text x="470" y="380" text-anchor="middle" fill="#80c8ff" font-size="10" font-weight="bold">SIG[2]</text>
    <circle cx="470" cy="405" r="18" fill="#2a0a14" stroke="#80c8ff" stroke-width="1.5"/>
    <text x="650" y="380" text-anchor="middle" fill="#80c8ff" font-size="10" font-weight="bold">SIG[3]</text>
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
    <text x="360" y="500" text-anchor="middle" fill="#39ff80" font-weight="bold" font-size="12">XOR</text>
    <text x="360" y="513" text-anchor="middle" fill="#39ff80" font-size="9">▷ FB</text>
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
  <text x="220" y="282" fill="#c8d8f0" font-size="9">shift</text>
  <text x="400" y="282" fill="#c8d8f0" font-size="9">shift</text>
  <text x="580" y="282" fill="#c8d8f0" font-size="9">shift</text>
  <text x="370" y="540" fill="#39ff80" font-size="9" text-anchor="middle">feedback (FF3.Q ⊕ FF0.Q) → FF0's XOR</text>

  <defs>
    <marker id="mm-arr"   viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#c8d8f0"/></marker>
    <marker id="mm-arr-g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#39ff80"/></marker>
  </defs>
</svg>
`;

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
     font-family="'JetBrains Mono', monospace" font-size="13" role="img" aria-label="3-input AND fed by A, NOR(B,C), and INV(C). C fans out: one branch through INV to AND, the other up with the fault circle into the NOR.">
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
  <text direction="ltr" x="22" y="64"  text-anchor="middle" fill="#f0d080" font-weight="bold" font-size="15">A</text>
  <text direction="ltr" x="22" y="154" text-anchor="middle" fill="#f0d080" font-weight="bold" font-size="15">B</text>
  <text direction="ltr" x="22" y="324" text-anchor="middle" fill="#f0d080" font-weight="bold" font-size="15">C</text>

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
  <text direction="ltr" x="268" y="180" text-anchor="middle" fill="#80d4ff" font-size="12" font-weight="bold">NOR</text>

  <!-- NOR output → AND middle input -->
  <line x1="350" y1="175" x2="600" y2="175" stroke="#80d4ff" stroke-width="1.8"/>

  <!-- ── 3-input AND gate ───────────────────────────────────────── -->
  <path d="M 600 105 L 600 245 L 645 245 A 70 70 0 0 0 645 105 Z"
        fill="#102818" stroke="#80f0a0" stroke-width="2"/>
  <text direction="ltr" x="624" y="180" text-anchor="middle" fill="#80f0a0" font-size="13" font-weight="bold">AND</text>

  <!-- AND output → Out -->
  <line x1="715" y1="175" x2="745" y2="175" stroke="#80f0a0" stroke-width="2.4" marker-end="url(#dft3arr)"/>
  <text direction="ltr" x="755" y="181" text-anchor="end" fill="#80f0a0" font-weight="bold" font-size="15">Out</text>

  <!-- ── C fanout — UP branch (with fault) into NOR bottom input ── -->
  <!-- Route: UP from the fanout dot, then RIGHT into the NOR's bottom
       input — same orientation as B (entering NOR from its LEFT). -->
  <!--    vertical segment upward (carries the fault) -->
  <line x1="200" y1="320" x2="200" y2="200" stroke="#f0d080" stroke-width="1.8"/>
  <!--    short horizontal RIGHT into NOR bottom input -->
  <line x1="200" y1="200" x2="220" y2="200" stroke="#f0d080" stroke-width="1.8"/>

  <!-- ★★★ FAULT MARKER — blue circle on the UP wire, midway up ★★★ -->
  <circle cx="200" cy="255" r="11" fill="#80c8ff" stroke="#3060a0" stroke-width="2.4"/>
  <text direction="ltr" x="222" y="259" text-anchor="start" fill="#80c8ff" font-size="11" font-weight="bold">fault</text>

  <!-- ── C fanout — FORWARD branch through INV ──────────────────── -->
  <!--    horizontal RIGHT from fanout dot to INV input -->
  <line x1="200" y1="320" x2="345" y2="320" stroke="#f0d080" stroke-width="1.8"/>
  <!--    INV triangle pointing RIGHT, bubble on right tip -->
  <polygon points="345,303 345,337 378,320" fill="#0a1825" stroke="#80d4ff" stroke-width="1.8"/>
  <circle  cx="383" cy="320" r="5" fill="#0a1825" stroke="#80d4ff" stroke-width="1.8"/>
  <text direction="ltr" x="362" y="358" text-anchor="middle" fill="#80d4ff" font-size="11" font-style="italic">INV</text>

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
  <text direction="ltr" x="225" y="194" text-anchor="start" fill="#f0d080" font-size="10" font-style="italic">C (faulty)</text>
  <text direction="ltr" x="430" y="312" text-anchor="start" fill="#80d4ff" font-size="10" font-style="italic">¬C</text>

  <!-- Caption -->
  <text direction="ltr" x="380" y="392" text-anchor="middle" fill="#a0a0c0" font-size="11" font-style="italic">
    Out = A · NOR(B, C) · ¬C = A · ¬B · ¬C   (when fault-free)
  </text>
</svg>`,
    parts: [
      {
        label: null,
        question: 'כמה וקטורי בדיקה מינימליים נדרשים, ומה הם? אילו פלטים?',
        hints: [
          'חשב את הפונקציה הלוגית: \\\`Out = A · NOR(B, C) · ¬C = A · ¬(B∨C) · ¬C = A · ¬B · ¬C · ¬C = A · ¬B · ¬C\\\`.',
          'שים לב — ה-AND מכפיל בשני גורמים שכל אחד תלוי ב-C: ה-\\\`¬C\\\` הישיר (מה-INV) וה-\\\`NOR(B,C)\\\`. שניהם הופכים ל-0 כש-\\\`C=1\\\`.',
          '**בודקים s-a-0** (הקו ל-NOR תקוע ב-0): \\\`NOR(B, 0) = ¬B\\\`. אז \\\`Out_faulty = A · ¬B · ¬C\\\` — **זהה ל-Out_free**. **התקלה s-a-0 רדוננטית — לא ניתנת לזיהוי בכלל!**',
          '**בודקים s-a-1** (הקו ל-NOR תקוע ב-1): \\\`NOR(B, 1) = 0\\\`. אז \\\`Out_faulty = 0\\\` תמיד.\\nמתי \\\`Out_free = 1\\\`? כש-\\\`A=1, B=0, C=0\\\`. \\n→ וקטור הזיהוי: \\\`(1, 0, 0)\\\` (free=1, faulty=0).',
          '**המסקנה:** אם ידוע שבוודאות אחת משתי התקלות פעילה, **וקטור יחיד מספיק.** \\\`(1,0,0)\\\` → Out=0 ⟹ s-a-1; Out=1 ⟹ s-a-0 (כי s-a-0 לא משנה את ההתנהגות).',
        ],
        answerSchematic: `
<svg viewBox="0 0 940 480" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="12" role="img" aria-label="Truth table comparison of free / s-a-0 / s-a-1 showing s-a-0 is redundant.">
  <rect x="0" y="0" width="940" height="46" fill="#0c1a28"/>
  <text direction="ltr" x="470" y="20" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="15">
    s-a-0 is REDUNDANT — single test vector (1,0,0) discriminates the two cases
  </text>
  <text direction="ltr" x="470" y="38" text-anchor="middle" fill="#a0a0c0" font-size="11" font-style="italic">
    Out = A · NOR(B, C_faulty) · ¬C   (C̄ comes from the INV branch, unaffected by the fault)
  </text>

  <!-- ── Truth-table panel ──────────────────────────────────────── -->
  <rect x="40" y="62" width="860" height="380" rx="8" fill="#0e1218" stroke="#3a2818" stroke-width="1.4"/>
  <text direction="ltr" x="470" y="92" text-anchor="middle" fill="#ffc890" font-weight="bold" font-size="13" letter-spacing="2">
    FULL TRUTH TABLE
  </text>

  <!-- column headers -->
  <g font-family="'JetBrains Mono', monospace" font-size="12" font-weight="bold" fill="#cca040">
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
      ? '<text direction="ltr" x="' + (820 + 70) + '" y="' + (y + 3) + '" text-anchor="middle" fill="#ff8090" font-size="10" font-weight="bold">⚡ s-a-1 detected</text>'
      : '';
    return `
      ${rowBg}
      <text direction="ltr" x="100" y="${y + 3}" text-anchor="middle" fill="#${a?'80f0a0':'506080'}" font-weight="bold" font-size="13">${a}</text>
      <text direction="ltr" x="160" y="${y + 3}" text-anchor="middle" fill="#${b?'80f0a0':'506080'}" font-weight="bold" font-size="13">${b}</text>
      <text direction="ltr" x="220" y="${y + 3}" text-anchor="middle" fill="#${c?'80f0a0':'506080'}" font-weight="bold" font-size="13">${c}</text>
      <text direction="ltr" x="340" y="${y + 3}" text-anchor="middle" fill="#80d4ff" font-size="12">${nc}</text>
      <text direction="ltr" x="460" y="${y + 3}" text-anchor="middle" fill="#80d4ff" font-size="12">${nor}</text>
      <text direction="ltr" x="580" y="${y + 3}" text-anchor="middle" fill="#${free?'80f0a0':'506080'}" font-weight="bold" font-size="13">${free}</text>
      <text direction="ltr" x="700" y="${y + 3}" text-anchor="middle" fill="#${sa0?'80f0a0':'506080'}" font-weight="bold" font-size="13">${sa0}</text>
      <text direction="ltr" x="820" y="${y + 3}" text-anchor="middle" fill="#${mismatch?'ff5060':sa1?'80f0a0':'506080'}" font-weight="bold" font-size="13">${sa1}</text>
    `;
  }).join('')}

  <!-- Highlight Free and s-a-0 columns as IDENTICAL -->
  <rect x="540" y="138" width="80" height="298" fill="none" stroke="#80f0a0" stroke-width="1.5" stroke-dasharray="4 3" rx="4" opacity="0.7"/>
  <rect x="660" y="138" width="80" height="298" fill="none" stroke="#80f0a0" stroke-width="1.5" stroke-dasharray="4 3" rx="4" opacity="0.7"/>
  <text direction="ltr" x="640" y="455" text-anchor="middle" fill="#80f0a0" font-size="11" font-weight="bold">
    ↑ Free Out ≡ s-a-0 Out  (identical for ALL 8 inputs → s-a-0 is REDUNDANT)
  </text>

  <!-- Highlight (1,0,0) row -->
  <text direction="ltr" x="920" y="261" text-anchor="middle" fill="#ff8090" font-size="11" font-weight="bold">⚡</text>
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
      // its own INV, NOR, and 3-input AND (built as two cascaded AND-2:
      // and_a = NOR.out · ¬C; and_b = and_a · A).
      const mkRow = (yMid, label) => {
        const yTop = yMid - 70;
        const yBot = yMid + 80;
        return {
          inv:  h.gate('NOT', 340, yBot),
          nor:  h.gate('NOR', 540, yMid),
          andA: h.gate('AND', 540, yTop - 20),  // computes NOR.out · ¬C
          andB: h.gate('AND', 760, yTop + 20),  // computes A · (NOR.out · ¬C)
          out:  h.output(960, yTop + 20, label),
        };
      };
      const r1 = mkRow(280, 'Out (free)');
      const r2 = mkRow(560, 'Out (s-a-0)');
      const r3 = mkRow(840, 'Out (s-a-1)');

      const wires = [];
      const wireRow = (row) => {
        wires.push(h.wire(A.id,         row.andB.id, 0));   // A → AND top
        wires.push(h.wire(C.id,         row.inv.id,  0));   // C → INV (forward fanout)
        wires.push(h.wire(B.id,         row.nor.id,  0));   // B → NOR top
        const cToNor = h.wire(C.id,     row.nor.id,  1);    // C → NOR (UP branch — this is the fault site)
        wires.push(cToNor);
        wires.push(h.wire(row.nor.id,   row.andA.id, 0));   // NOR → AND_a
        wires.push(h.wire(row.inv.id,   row.andA.id, 1));   // ¬C → AND_a
        wires.push(h.wire(row.andA.id,  row.andB.id, 1));   // AND_a → AND_b
        wires.push(h.wire(row.andB.id,  row.out.id,  0));   // AND_b → Out
        return cToNor;
      };
      const w1 = wireRow(r1);
      const w2 = wireRow(r2);  w2.stuckAt = 0;     // s-a-0 on C→NOR wire
      const w3 = wireRow(r3);  w3.stuckAt = 1;     // s-a-1 on C→NOR wire

      return {
        nodes: [
          A, B, C,
          r1.inv, r1.nor, r1.andA, r1.andB, r1.out,
          r2.inv, r2.nor, r2.andA, r2.andB, r2.out,
          r3.inv, r3.nor, r3.andA, r3.andB, r3.out,
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
     font-family="'JetBrains Mono', monospace" font-size="13" role="img" aria-label="Half-adder (XOR + AND) feeding a second XOR; fault marker on the COUT wire between AND and second XOR.">
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
  <text direction="ltr" x="22" y="104" text-anchor="middle" fill="#f0d080" font-weight="bold" font-size="15">A</text>
  <text direction="ltr" x="22" y="284" text-anchor="middle" fill="#f0d080" font-weight="bold" font-size="15">B</text>

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
  <text direction="ltr" x="232" y="124" text-anchor="middle" fill="#80d4ff" font-size="11" font-weight="bold">XOR</text>

  <!-- ── AND (bottom, computes COUT = A·B) ───────────────────────── -->
  <path d="M 200 235 L 200 305 L 240 305 A 35 35 0 0 0 240 235 Z"
        fill="#102818" stroke="#80f0a0" stroke-width="1.8"/>
  <text direction="ltr" x="222" y="275" text-anchor="middle" fill="#80f0a0" font-size="11" font-weight="bold">AND</text>

  <!-- ── SUM wire: XOR1.out → XOR2.top input ──────────────────────── -->
  <line x1="290" y1="120" x2="380" y2="120" stroke="#80d4ff" stroke-width="1.8"/>
  <line x1="380" y1="120" x2="380" y2="180" stroke="#80d4ff" stroke-width="1.8"/>
  <line x1="380" y1="180" x2="430" y2="180" stroke="#80d4ff" stroke-width="1.8"/>
  <text direction="ltr" x="338" y="112" text-anchor="middle" fill="#80d4ff" font-size="10" font-style="italic">SUM = A⊕B</text>

  <!-- ── COUT wire: AND.out → XOR2.bot input  (with FAULT marker) ── -->
  <line x1="280" y1="270" x2="380" y2="270" stroke="#80f0a0" stroke-width="1.8"/>
  <!--   vertical segment UP, carries the fault -->
  <line x1="380" y1="270" x2="380" y2="220" stroke="#80f0a0" stroke-width="1.8"/>
  <line x1="380" y1="220" x2="430" y2="220" stroke="#80f0a0" stroke-width="1.8"/>
  <text direction="ltr" x="335" y="284" text-anchor="middle" fill="#80f0a0" font-size="10" font-style="italic">COUT = A·B</text>

  <!-- ★★★ FAULT MARKER on the COUT vertical segment, close to XOR2 -->
  <circle cx="380" cy="240" r="11" fill="#80c8ff" stroke="#3060a0" stroke-width="2.4"/>
  <text direction="ltr" x="403" y="244" text-anchor="start" fill="#80c8ff" font-size="11" font-weight="bold">fault</text>

  <!-- ── XOR2 (right, the final XOR combining SUM + COUT) ─────────── -->
  <path d="M 425 155 Q 445 200 425 245 Q 460 245 490 222 Q 520 200 490 178 Q 460 155 425 155 Z"
        fill="#0a1825" stroke="#80d4ff" stroke-width="1.8"/>
  <path d="M 418 155 Q 438 200 418 245" fill="none" stroke="#80d4ff" stroke-width="1.8"/>
  <text direction="ltr" x="462" y="204" text-anchor="middle" fill="#80d4ff" font-size="11" font-weight="bold">XOR</text>

  <!-- ── XOR2 output → Y ──────────────────────────────────────────── -->
  <line x1="520" y1="200" x2="600" y2="200" stroke="#80f0a0" stroke-width="2.4" marker-end="url(#dft4arr)"/>
  <text direction="ltr" x="635" y="206" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="15">Y</text>

  <!-- Caption -->
  <text direction="ltr" x="350" y="362" text-anchor="middle" fill="#a0a0c0" font-size="11" font-style="italic">
    Y = (A⊕B) ⊕ (A·B)   (when fault-free)
  </text>
</svg>`,
    parts: [
      {
        label: null,
        question: 'מה הפונקציה הלוגית של המעגל ללא תקלה? ובכל אחת משתי התקלות? כמה וקטורי בדיקה מינימליים נדרשים, ומה הם?',
        hints: [
          'התחל בחישוב הפונקציה ללא תקלה: \\\`Y = SUM ⊕ COUT = (A⊕B) ⊕ (A·B)\\\`. בדוק את 4 השורות בטבלת האמת ופשט.',
          'תובנת מפתח: \\\`(A⊕B) ⊕ (A·B) = A ∨ B\\\` — זוהי **זהות ה-half-adder**: SUM XOR COUT = OR. בלי הזהות הזו אי-אפשר לאפיין נכון את הפונקציה ללא תקלה.',
          's-a-0 על קו COUT: ה-COUT שנכנס ל-XOR השני שווה 0. \\\`Y = (A⊕B) ⊕ 0 = A⊕B\\\` → **המעגל הופך ל-XOR.**',
          's-a-1 על קו COUT: ה-COUT שנכנס שווה 1. \\\`Y = (A⊕B) ⊕ 1 = ¬(A⊕B)\\\` → **המעגל הופך ל-XNOR.**',
          'שלוש פונקציות שונות: \\\`OR\\\` (free), \\\`XOR\\\` (s-a-0), \\\`XNOR\\\` (s-a-1). שים לב לסימטריה — בכניסות (0,1) ו-(1,0) כל השלוש סימטריות לאמצע (OR=XOR=1, XNOR=0). אז וקטורים "באמצע" לא מפרידים בין free ל-s-a-0!',
          'הוקטורים המבחינים חייבים להיות בקצוות: \\\`(0,0)\\\` מבחין את s-a-1 (=1) מ-free=s-a-0 (=0), ו-\\\`(1,1)\\\` מבחין את free (=1) מ-s-a-0=s-a-1 (=0). שני הקצוות יחד = הבחנה מלאה.',
        ],
        answerSchematic: `
<svg viewBox="0 0 940 400" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="12" role="img" aria-label="Truth-table comparison of OR / XOR / XNOR — the three functions produced by free / s-a-0 / s-a-1.">
  <rect x="0" y="0" width="940" height="46" fill="#0c1a28"/>
  <text direction="ltr" x="470" y="20" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="15">
    Fault scrambles the half-adder identity into 3 different functions
  </text>
  <text direction="ltr" x="470" y="38" text-anchor="middle" fill="#a0a0c0" font-size="11" font-style="italic">
    free = OR  ·  s-a-0 = XOR  ·  s-a-1 = XNOR  ·  distinguished by the two extremes (0,0) and (1,1)
  </text>

  <!-- ── Truth-table panel ──────────────────────────────────────── -->
  <rect x="40" y="62" width="860" height="310" rx="8" fill="#0e1218" stroke="#3a2818" stroke-width="1.4"/>
  <text direction="ltr" x="470" y="92" text-anchor="middle" fill="#ffc890" font-weight="bold" font-size="13" letter-spacing="2">
    Y(A, B) UNDER EACH SCENARIO
  </text>

  <g font-family="'JetBrains Mono', monospace" font-size="12" font-weight="bold" fill="#cca040">
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
      ? '<text direction="ltr" x="900" y="' + (y + 4) + '" text-anchor="middle" fill="#80f0a0" font-size="11" font-weight="bold">⚡</text>'
      : '';
    return `
      ${rowBg}
      <text direction="ltr" x="120" y="${y + 4}" text-anchor="middle" fill="#${a?'80f0a0':'506080'}" font-weight="bold" font-size="13">${a}</text>
      <text direction="ltr" x="200" y="${y + 4}" text-anchor="middle" fill="#${b?'80f0a0':'506080'}" font-weight="bold" font-size="13">${b}</text>
      <text direction="ltr" x="340" y="${y + 4}" text-anchor="middle" fill="#80d4ff" font-size="12">${sum}</text>
      <text direction="ltr" x="470" y="${y + 4}" text-anchor="middle" fill="#80d4ff" font-size="12">${cout}</text>
      <text direction="ltr" x="600" y="${y + 4}" text-anchor="middle" fill="#${free?'80f0a0':'506080'}" font-weight="bold" font-size="13">${free}</text>
      <text direction="ltr" x="720" y="${y + 4}" text-anchor="middle" fill="#${sa0?'80f0a0':'506080'}" font-weight="bold" font-size="13">${sa0}</text>
      <text direction="ltr" x="840" y="${y + 4}" text-anchor="middle" fill="#${sa1?'80f0a0':'506080'}" font-weight="bold" font-size="13">${sa1}</text>
      ${noteEl}
    `;
  }).join('')}

  <!-- Footnote — extreme rows are the detecting vectors -->
  <text direction="ltr" x="470" y="358" text-anchor="middle" fill="#80f0a0" font-size="12" font-weight="bold">
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
     font-family="'JetBrains Mono', monospace" font-size="13" role="img" aria-label="Gate-level 2:1 MUX with a bridge fault between the two data wires (A and B) before they enter their respective ANDs.">
  <defs>
    <marker id="dft5arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#80f0a0"/></marker>
  </defs>

  <!-- Input labels -->
  <text direction="ltr" x="22" y="84"  text-anchor="middle" fill="#f0d080" font-weight="bold" font-size="15">A</text>
  <text direction="ltr" x="22" y="224" text-anchor="middle" fill="#f0d080" font-weight="bold" font-size="15">B</text>
  <text direction="ltr" x="22" y="334" text-anchor="middle" fill="#f0d080" font-weight="bold" font-size="15">S</text>

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
  <text direction="ltr" x="202" y="154" text-anchor="start" fill="#80c8ff" font-size="11" font-weight="bold">bridge</text>

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
  <text direction="ltr" x="262" y="368" text-anchor="middle" fill="#80d4ff" font-size="11" font-style="italic">INV</text>

  <!-- ── ¬S wire: from INV bubble → up → into AND_B bottom ─────── -->
  <line x1="288" y1="330" x2="320" y2="330" stroke="#80d4ff" stroke-width="1.8"/>
  <line x1="320" y1="330" x2="320" y2="250" stroke="#80d4ff" stroke-width="1.8"/>
  <line x1="320" y1="250" x2="295" y2="250" stroke="#80d4ff" stroke-width="1.8"/>
  <text direction="ltr" x="335" y="298" text-anchor="start" fill="#80d4ff" font-size="10" font-style="italic">¬S</text>

  <!-- ── AND_A: 2-input AND, takes A and S ─────────────────────── -->
  <path d="M 295 65 L 295 125 L 330 125 A 30 30 0 0 0 330 65 Z"
        fill="#102818" stroke="#80f0a0" stroke-width="1.8"/>
  <text direction="ltr" x="316" y="100" text-anchor="middle" fill="#80f0a0" font-size="10" font-weight="bold">AND</text>

  <!-- ── AND_B: 2-input AND, takes B and ¬S ────────────────────── -->
  <path d="M 295 205 L 295 265 L 330 265 A 30 30 0 0 0 330 205 Z"
        fill="#102818" stroke="#80f0a0" stroke-width="1.8"/>
  <text direction="ltr" x="316" y="240" text-anchor="middle" fill="#80f0a0" font-size="10" font-weight="bold">AND</text>

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
  <text direction="ltr" x="508" y="180" text-anchor="middle" fill="#80d4ff" font-size="11" font-weight="bold">OR</text>

  <!-- ── OR output → Out ───────────────────────────────────────── -->
  <line x1="565" y1="175" x2="625" y2="175" stroke="#80f0a0" stroke-width="2.4" marker-end="url(#dft5arr)"/>
  <text direction="ltr" x="665" y="181" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="15">Out</text>

  <!-- Caption -->
  <text direction="ltr" x="360" y="362" text-anchor="middle" fill="#a0a0c0" font-size="11" font-style="italic">
    Out = S·A + ¬S·B = (S ? A : B)   (when fault-free)
  </text>
</svg>`,
    parts: [
      {
        label: null,
        question: 'מה הפונקציה הלוגית של המעגל ללא תקלה? ומה היא הופכת להיות תחת כל אחד מהשני סוגי הקצר? כמה וקטורי בדיקה מינימליים נדרשים, ומה הם?',
        hints: [
          'התחל בזיהוי הטופולוגיה: זוהי מימוש של MUX 2:1 ברמת שערים. \\\`Out = (S·A) + (¬S·B) = (S ? A : B)\\\`.',
          'תובנת מפתח: כשיש קצר בין שני קווי הדאטה, **שני הקווים נושאים אותו ערך**. הערך תלוי בסוג הקצר:\\n• wired-AND: שני הקווים = \\\`A · B\\\`.\\n• wired-OR: שני הקווים = \\\`A + B\\\`.',
          'הצב את הערך המשותף בפונקציה. עבור wired-AND, שניהם נראים כ-\\\`(A·B)\\\` עבור ה-AND שלהם. אז \\\`Out = S·(A·B) + ¬S·(A·B) = (A·B)·(S + ¬S) = A·B\\\` — **\\\`S\\\` נעלם!**',
          'באופן דומה ל-wired-OR: \\\`Out = S·(A+B) + ¬S·(A+B) = A+B\\\`. **\\\`S\\\` נעלם גם פה!**',
          'אז יש 3 תרחישים: \\\`free = S?A:B\\\`, \\\`AND-bridge = A·B\\\`, \\\`OR-bridge = A+B\\\`. כדי **להפעיל** את הקצר חייבים \\\`A ≠ B\\\` (אחרת \\\`A·B = A+B = A = B\\\` ואין הבחנה).',
          'כדי **להבחין** בין AND ל-OR צריך לבדוק **את שני ערכי \\\`S\\\`**. עם \\\`A≠B\\\` ושני ערכי \\\`S\\\` — 2 וקטורים בלבד עושים את העבודה. למשל \\\`(0,1,0)\\\` ו-\\\`(0,1,1)\\\`.',
        ],
        answerSchematic: `
<svg viewBox="0 0 1240 660" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="16" role="img" aria-label="Truth-table comparison showing how the bridge erases the MUX's S-dependence.">
  <rect x="0" y="0" width="1240" height="62" fill="#0c1a28"/>
  <text direction="ltr" x="620" y="28" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="20">
    Bridge erases the MUX's S-dependence — Out becomes independent of S
  </text>
  <text direction="ltr" x="620" y="52" text-anchor="middle" fill="#a0a0c0" font-size="14" font-style="italic">
    free = (S ? A : B)   ·   AND-bridge = A·B   ·   OR-bridge = A+B
  </text>

  <!-- ── Truth-table panel ──────────────────────────────────────── -->
  <rect x="50" y="82" width="1140" height="540" rx="10" fill="#0e1218" stroke="#3a2818" stroke-width="1.6"/>
  <text direction="ltr" x="620" y="118" text-anchor="middle" fill="#ffc890" font-weight="bold" font-size="17" letter-spacing="3">
    OUT(A, B, S) UNDER EACH SCENARIO
  </text>

  <g font-family="'JetBrains Mono', monospace" font-size="16" font-weight="bold" fill="#cca040">
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
      ? '<text direction="ltr" x="1180" y="' + (y + 6) + '" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">⚡</text>'
      : '<text direction="ltr" x="1180" y="' + (y + 6) + '" text-anchor="middle" fill="#666" font-size="16">—</text>';
    return `
      ${rowBg}
      <text direction="ltr" x="135"  y="${y + 6}" text-anchor="middle" fill="#${a?'80f0a0':'506080'}" font-weight="bold" font-size="18">${a}</text>
      <text direction="ltr" x="230"  y="${y + 6}" text-anchor="middle" fill="#${b?'80f0a0':'506080'}" font-weight="bold" font-size="18">${b}</text>
      <text direction="ltr" x="325"  y="${y + 6}" text-anchor="middle" fill="#${s?'80f0a0':'506080'}" font-weight="bold" font-size="18">${s}</text>
      <text direction="ltr" x="525"  y="${y + 6}" text-anchor="middle" fill="#${free?'80f0a0':'506080'}" font-weight="bold" font-size="18">${free}</text>
      <text direction="ltr" x="790"  y="${y + 6}" text-anchor="middle" fill="#${andBr?'80f0a0':'506080'}" font-weight="bold" font-size="18">${andBr}</text>
      <text direction="ltr" x="1050" y="${y + 6}" text-anchor="middle" fill="#${orBr?'80f0a0':'506080'}" font-weight="bold" font-size="18">${orBr}</text>
      ${noteEl}
    `;
  }).join('')}

  <text direction="ltr" x="620" y="645" text-anchor="middle" fill="#80f0a0" font-size="15" font-weight="bold">
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
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Two stacked 8x8 RAM grids: stuck-at example on top, coupling pair below.">

  <!-- ===================== TOP HEADER ===================== -->
  <text x="450" y="42" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    RAM 8 × 8 — שני סוגי תקלות
  </text>
  <text x="450" y="74" text-anchor="middle" fill="#a0a0c0" font-size="17" font-style="italic">
    8 addresses (rows) × 8 bits per word (columns)
  </text>

  <!-- ============================================================ -->
  <!-- =============== PANEL A: Part א (stuck-at) ================= -->
  <!-- ============================================================ -->
  <rect x="20" y="100" width="860" height="490" rx="12"
        fill="rgba(255,80,80,0.05)" stroke="rgba(255,96,96,0.6)" stroke-width="2"/>

  <text x="450" y="140" text-anchor="middle" fill="#ff8a8a" font-weight="bold" font-size="26">
    סעיף א — תא בודד תקוע
  </text>
  <text x="450" y="168" text-anchor="middle" fill="#c8b090" font-size="17" font-style="italic">
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
  <text x="450" y="550" text-anchor="middle" fill="#ff8080" font-size="19" font-weight="bold">
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

  <text x="450" y="660" text-anchor="middle" fill="#d699ff" font-weight="bold" font-size="26">
    סעיף ב — קיבול פרזיטי בין תאים
  </text>
  <text x="450" y="688" text-anchor="middle" fill="#c8b090" font-size="17" font-style="italic">
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
        dot = `<text x="${x + 25}" y="${y + 30}" text-anchor="middle" fill="#cc66ff" font-weight="bold" font-size="26">A</text>`;
      } else if (a === 6 && b === 5) {
        fill = '#1a0a2a'; stroke = '#cc66ff'; strokeW = 3;
        dot = `<text x="${x + 25}" y="${y + 30}" text-anchor="middle" fill="#cc66ff" font-weight="bold" font-size="26">B</text>`;
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
  <text x="680" y="912" text-anchor="middle" fill="#cc99ff" font-size="18" font-weight="bold">
    coupling
  </text>

  <!-- Explanation under grid -->
  <text x="450" y="1100" text-anchor="middle" fill="#d699ff" font-size="19" font-weight="bold">
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
          'תקלת \\\`stuck-at-1\\\`: התא תמיד מחזיר \\\`1\\\` בקריאה, בלי קשר למה שכתבת. תקלת \\\`stuck-at-0\\\`: הפוך.',
          'אסטרטגיה בסיסית: כתוב ערך ידוע לכל התאים, וקרא אותם בחזרה. כל קריאה שונה מהצפי → תא תקול.',
          'דפוס **All-zero**: כתוב \\\`0\\\` לכל \\\`N\\\` התאים, קרא את כולם. כל תא שמחזיר \\\`1\\\` הוא **\\\`s-a-1\\\`**.',
          'דפוס **All-one**: כתוב \\\`0xFF\\\` לכל התאים, קרא. כל תא שמחזיר ערך שאינו \\\`0xFF\\\` הוא **\\\`s-a-0\\\`** (וברמת ביט אפשר לדעת באיזה ביט).',
          'מינימום אופרציות לזיהוי שלם: שני דפוסים × (\\\`N\\\` write + \\\`N\\\` read) = **\\\`4N\\\` ops**. עבור N=8: 32 ops.',
          '**שדרוג**: דפוס \\\`Address-as-data\\\` (כתוב את כתובת A כערך לתא A) מזהה בנוסף **בעיות במקודד הכתובות** (decoder bugs). ב-\\\`2N\\\` ops, חסכוני יותר אבל מאתר תאים פגומים רק כשהערך השונה מבדיל.',
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
          'קיבול פרזיטי בין תאים = **coupling fault**. סוגים קלאסיים: \\\`CFin\\\` (כתיבה ב-A הופכת את B), \\\`CFid\\\` (כתיבה ב-A כופה ערך קבוע ל-B), \\\`CFst\\\` (תא A במצב מסוים כופה את B).',
          'למה All-zero/All-one **לא** עובדים: שניהם כותבים אותו ערך לכל התאים. אז \\\`A·B = A+B = A = B\\\` ואין mismatch בין מה שאמור להיות לבין מה שיש — הקיבול לא משנה כלום.',
          'הרעיון המרכזי: צריך **קונטרסט בין תאים שכנים**. תא A בערך אחד, תא B בערך הפוך, ואז לכתוב ל-A ולקרוא את B.',
          'דפוס **Walking-1**: background של 0 לכל התאים. לכל תא \\\`c\\\` בנפרד: כתוב \\\`1\\\` ל-c, ואז **cross-read** את כל התאים האחרים — אם הם מחזירים \\\`0\\\` הכל בסדר; אם תא אחר מחזיר \\\`1\\\` → coupling מ-c לאותו תא.',
          'דפוס **Walking-0**: הפוך — background של 1, walk-0 דרך כל תא. תופס את התקלות שתלויות במעבר \\\`1→0\\\` במקום \\\`0→1\\\`.',
          'שני ה-walkings הללו תופסים יחד \\\`CFin\\\` ו-\\\`CFid\\\` בשני הכיוונים. ל-\\\`CFst\\\` (state coupling) — דפוס שמותיר תא במצב מסוים תקופה ארוכה ואז קורא תאים שכנים. למשל **Checkerboard** או **All-one** + cross-reads.',
          'עלות: \\\`Walking-1\\\` על N תאים = \\\`N + N·(N+1) = N²+2N\\\` ops. ל-N=8: 80 ops לכל walking. סה"כ \\\`~160 ops\\\` לזוג Walking-1/Walking-0.',
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
];
