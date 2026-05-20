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
];
