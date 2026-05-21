/**
 * IQ — Timing & CDC questions.
 *
 * Static import target: js/interview/questions.js will `import { QUESTIONS }`
 * from this file. Add new entries to the QUESTIONS array; the engine picks
 * them up automatically.
 *
 * Question shape — see IQ/README.md. Notable optional fields:
 *   schematic        — raw SVG/HTML string rendered above the prompt (we
 *                      author every byte of it, so direct innerHTML is safe).
 *   parts[].expectedAnswers — array of accepted strings; if present the UI
 *                      shows an answer-input + "בדוק" button. Match is
 *                      case-insensitive substring against the trimmed input.
 *   circuit          — () => ({ nodes, wires }). Builds a working circuit
 *                      that matches the schematic. The panel exposes a
 *                      "טען על הקנבס" button; the engine snapshots the
 *                      user's scene first so their work is restorable.
 */

import { build, h } from '../../js/interview/circuitHelpers.js';

// Inline SVG of a 3-stage shift register + CLK/INPUT waveforms. Authored
// from scratch; no copyright concern. Colours pull from the panel palette.
const SHIFT_REG_SVG = `
<svg viewBox="0 0 480 240" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono', monospace" font-size="16" role="img" aria-label="Three-stage shift register with clock and input waveforms">
  <defs>
    <marker id="ivArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" fill="#c8d8f0"/>
    </marker>
    <marker id="ivArrowRed" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" fill="#f08080"/>
    </marker>
  </defs>

  <!-- CLK waveform: 7 square pulses -->
  <text x="0" y="22" fill="#c8d8f0">clk</text>
  <path d="M 40 30 v -12 h 20 v 12 h 20 v -12 h 20 v 12 h 20 v -12 h 20 v 12 h 20 v -12 h 20 v 12 h 20 v -12 h 20 v 12 h 20 v -12 h 20 v 12 h 20 v -12 h 20 v 12 h 20"
        fill="none" stroke="#f0d080" stroke-width="1.6"/>

  <!-- INPUT waveform: low until mid-stream, then rises and stays high -->
  <text x="0" y="68" fill="#c8d8f0">input</text>
  <path d="M 40 80 h 160 v -16 h 240" fill="none" stroke="#80b0e0" stroke-width="1.6"/>

  <!-- "התחלה" marker — placed in the empty band BELOW the input
       waveform; arrow points up at the bottom of the rising edge. -->
  <g>
    <line x1="252" y1="105" x2="206" y2="84" stroke="#f08080" stroke-width="1.5" marker-end="url(#ivArrowRed)"/>
    <text x="258" y="110" fill="#f08080" font-size="16" font-weight="bold">התחלה</text>
  </g>

  <!-- Schematic: input → DFF → DFF → DFF → out, all sharing clk -->
  <g transform="translate(0, 130)">
    <text x="0" y="35" fill="#c8d8f0">input</text>
    <line x1="40" y1="32" x2="78" y2="32" stroke="#c8d8f0" stroke-width="1.4" marker-end="url(#ivArrow)"/>

    <!-- DFF 1 -->
    <rect x="78" y="10" width="80" height="50" fill="#0a1520" stroke="#80f0a0" stroke-width="1.6" rx="3"/>
    <text x="118" y="35" text-anchor="middle" fill="#80f0a0" font-weight="bold">DFF</text>
    <text x="86"  y="22" fill="#80a0c0" font-size="16">D</text>
    <text x="148" y="22" text-anchor="end" fill="#80a0c0" font-size="16">Q</text>
    <text x="118" y="56" text-anchor="middle" fill="#80a0c0" font-size="16">clk</text>

    <!-- Q1 -> D2 -->
    <line x1="158" y1="32" x2="200" y2="32" stroke="#c8d8f0" stroke-width="1.4" marker-end="url(#ivArrow)"/>

    <!-- DFF 2 -->
    <rect x="200" y="10" width="80" height="50" fill="#0a1520" stroke="#80f0a0" stroke-width="1.6" rx="3"/>
    <text x="240" y="35" text-anchor="middle" fill="#80f0a0" font-weight="bold">DFF</text>
    <text x="208" y="22" fill="#80a0c0" font-size="16">D</text>
    <text x="270" y="22" text-anchor="end" fill="#80a0c0" font-size="16">Q</text>
    <text x="240" y="56" text-anchor="middle" fill="#80a0c0" font-size="16">clk</text>

    <!-- Q2 -> D3 -->
    <line x1="280" y1="32" x2="322" y2="32" stroke="#c8d8f0" stroke-width="1.4" marker-end="url(#ivArrow)"/>

    <!-- DFF 3 -->
    <rect x="322" y="10" width="80" height="50" fill="#0a1520" stroke="#80f0a0" stroke-width="1.6" rx="3"/>
    <text x="362" y="35" text-anchor="middle" fill="#80f0a0" font-weight="bold">DFF</text>
    <text x="330" y="22" fill="#80a0c0" font-size="16">D</text>
    <text x="392" y="22" text-anchor="end" fill="#80a0c0" font-size="16">Q</text>
    <text x="362" y="56" text-anchor="middle" fill="#80a0c0" font-size="16">clk</text>

    <!-- Out -->
    <line x1="402" y1="32" x2="448" y2="32" stroke="#c8d8f0" stroke-width="1.4" marker-end="url(#ivArrow)"/>
    <text x="455" y="35" fill="#c8d8f0">out</text>

    <!-- Shared clk bus -->
    <line x1="118" y1="60" x2="118" y2="78" stroke="#f0d080" stroke-width="1.2"/>
    <line x1="240" y1="60" x2="240" y2="78" stroke="#f0d080" stroke-width="1.2"/>
    <line x1="362" y1="60" x2="362" y2="78" stroke="#f0d080" stroke-width="1.2"/>
    <line x1="118" y1="78" x2="362" y2="78" stroke="#f0d080" stroke-width="1.2"/>
    <text x="370" y="82" fill="#f0d080" font-size="16">clk</text>
  </g>
</svg>
`;

export const QUESTIONS = [
  {
    id: 'shift-register-setup-hold',
    difficulty: 'medium',
    title: 'שרשרת D-FFs: זיהוי הפרת setup / hold לפי הזמן שבו הפלט מגיב',
    intro:
`נתון מעגל של שלוש D-flip-flops בשרשרת (shift register באורך 3).
כולן דוגמות באותו \`clk\`. ה-input מתחיל ב-0 ועולה ל-1 באמצע הריצה,
וה-clk רץ ברציפות. ב-3 הסעיפים נחקור את הפלט במצב נומינלי, ובשני
תרחישים שבהם זמן התגובה שונה מהמצופה.`,
    schematic: SHIFT_REG_SVG,
    parts: [
      {
        label: 'א',
        question: 'מה יהיה הפלט (\`out\`) לאחר 3 מחזורי שעון?',
        hints: [
          'בכל clock edge, הערך של ה-input "זז" שלב אחד קדימה לאורך ה-shift register.',
          'ספור את מספר ה-D-FFs בין ה-input ל-out — בדיוק אותו מספר מחזורים נדרש כדי שערך חדש יגיע מהקלט לפלט.',
        ],
        answer:
`**\`out = 1\` לאחר 3 מחזורי שעון** — התנהגות נומינלית, ללא הפרת אילוצים.

ערך חדש על ה-input זקוק ל-3 clock edges כדי לעבור את 3 ה-FFs:

- **edge 1:** \`Q1 = 1\`
- **edge 2:** \`Q2 = 1\`
- **edge 3:** \`Q3 = out = 1\``,
        expectedAnswers: ['1', 'one', 'high', 'גבוה', 'אחד'],
      },
      {
        label: 'ב',
        question:
`נצפה במדידה ש-\`out\` עולה לאחר **2 מחזורי שעון** בלבד (מהר מהצפוי).
איזה אילוץ תזמון הופר?`,
        hints: [
          'פלט מהיר מהצפוי = ה-data חצה שלב נוסף באותו clock edge. איזו הפרה גורמת לזה?',
          'נזכר ש-**hold time** הוא הזמן שאחרי clock edge שבו ה-D חייב להישאר יציב.',
          'אם \`tCQ(FF1) + tWire < tHold(FF2)\`, ה-D של FF2 משתנה לפני שחלון ה-hold שלו נסגר — race-through.',
        ],
        answer:
`**הפרת \`hold time\`** — תופעה: race-through.

ב-edge מסוים, FF1 דוגם 1, ועד שהזמן של FF2 לסיים את חלון ה-hold שלו —
ה-D של FF2 כבר השתנה ל-1, אז גם FF2 דוגם את הערך החדש באותו edge.
שלב מדלג, ולכן \`out = 1\` כבר אחרי 2 מחזורים.

**סיבה נפוצה:** clock skew, או נתיב קצר מדי בין FFs (מעט buffering).`,
        expectedAnswers: ['hold', 'hold time', 'thold', 'הפרת hold', 'אילוץ hold'],
      },
      {
        label: 'ג',
        question:
`איך נתקן את הבעיה מסעיף ב' (race-through בין ה-FFs)?
איזה רכיב או שיטה היו מוסיפים לעיצוב?`,
        hints: [
          'אם הבעיה היא ש-data "רץ" מהר מדי בין FFs, מה צריך *להאט* את הנתיב?',
          'בנתיב הנתונים בין שני FFs צמודים, איזה רכיב פסיבי מוסיף השהיה ידועה?',
          'הפתרון התעשייתי הסטנדרטי: הוספת \`buffer / delay cells\` בנתיב ה-data, ובמקביל איזון של ה-clock tree.',
        ],
        answer:
`**הוספת \`buffer\` (insertion delay) בנתיב ה-data** + איזון \`clock tree\`.

- בין FF1 ל-FF2 משרשרים buffer cells שמוסיפים השהיה מבוקרת. זה
  מבטיח ש-\`tCQ(FF1) + tWire + tBuf > tHold(FF2)\` — חלון ה-hold
  של FF2 נסגר לפני שה-D שלו משתנה.
- במקביל מאזנים את ה-clock tree (CTS — clock tree synthesis) כך
  שה-skew בין FF1 ל-FF2 מינימלי.

**איך זה מזוהה בעיצוב:** Static Timing Analysis (STA) מדווח על hold
slack שלילי. בשלב hold-fix אחרי placement, הכלים מוסיפים אוטומטית
buffer cells לכל path עם slack שלילי, עד שכולם חיוביים.`,
        expectedAnswers: ['buffer', 'בופר', 'delay', 'השהיה', 'insertion delay', 'cts', 'clock tree'],
      },
      {
        label: 'ד',
        question:
`במדידה אחרת \`out\` עולה לאחר **4 מחזורי שעון** (איטי מהצפוי).
איזה אילוץ תזמון הופר כעת?`,
        hints: [
          'פלט איטי מהצפוי = ה-data התעכב מחזור נוסף. איזו הפרה גורמת ל-FF לפספס edge?',
          'נזכר ש-**setup time** הוא הזמן *לפני* ה-edge שבו ה-D חייב להיות יציב.',
          'אם ה-input משתנה קרוב מדי ל-edge, FF1 דוגם את הערך הישן (0) ובעדיף הבא רק אז דוגם 1.',
        ],
        answer:
`**הפרת \`setup time\`** — תופעה: שלב פוספס, פלט מתעכב מחזור.

השינוי ב-input קרה פחות מ-\`tSetup\` לפני ה-edge. FF1 דוגם את הערך
הישן (0); רק ב-edge הבא הוא דוגם 1. לכן \`out = 1\` רק אחרי 4 מחזורים.

**במקרה גרוע:** FF1 נכנס ל-metastability — \`Q\` לא מוגדר למשך זמן,
והפלט יכול להיות "זבל" למחזור.

**סיבות נפוצות:** logic depth גדול מדי בין FFs, תדר שעון גבוה מדי,
או אות אסינכרוני שנכנס לקלוקל סינכרוני בלי שכבת סנכרון.`,
        expectedAnswers: ['setup', 'setup time', 'tsetup', 'הפרת setup', 'אילוץ setup'],
      },
      {
        label: 'ה',
        question:
`איך נתקן את הבעיה מסעיף ד' (פספוס edge עקב חוסר זמן setup)?
שלוש שיטות שונות, לפי סוג המקור.`,
        hints: [
          'אם הבעיה היא נתיב לוגי ארוך מדי בין FFs, איך אפשר לחתוך אותו לחלקים קצרים יותר?',
          'מה קורה אם נוריד את תדר השעון? איך זה משפיע על אילוץ ה-setup?',
          'אם הבעיה היא שה-input אסינכרוני (לא מהשעון שלנו), נדרש מבנה ספציפי לפני שהוא נכנס למעגל הסינכרוני.',
        ],
        answer:
`שלושה תיקונים, לפי האבחנה:

- **logic depth גדול מדי בין FFs:** הוספת \`pipeline register\` באמצע
  ה-combinational path. זה חוצה את הנתיב לשני שלבים קצרים יותר —
  כל שלב עומד ב-\`tSetup\` עם slack חיובי.
- **תדר שעון גבוה מדי:** הורדת ה-clock frequency (\`tCycle\` גדל,
  ולכן \`tCycle - tSetup - tCQ\` הופך לחיובי). פתרון תקף, אבל
  מקריב throughput.
- **אות אסינכרוני (CDC):** הוספת \`2-FF synchronizer\` על clock היעד —
  שתי D-FFs רצופות מקטינות באקספוננציאליות את ההסתברות
  ל-metastability שתתפשט לעיצוב הסינכרוני.

**איך זה מזוהה בעיצוב:** Static Timing Analysis (STA) מדווח על setup
slack שלילי לכל path בעייתי. הכלי מציע אוטומטית "where to retime"
ב-Synopsys / Cadence flows. עבור CDC, נדרש כלי נפרד (CDC checker)
שמאתר אותות שחוצים clock domains בלי synchronizer.

**טבלת השוואה — שני סוגי ההפרות והתיקונים שלהן:**

| | hold violation (ב, ג) | setup violation (ד, ה) |
|---|---|---|
| **תופעה** | מהר מדי | איטי מדי |
| **שלבים** | מדלג שלב | מתעכב שלב |
| **סיבה** | clock skew, נתיב קצר | logic ארוך, תדר גבוה, async |
| **תיקון** | buffer + clock balance | pipeline reg, ↓ תדר, 2-FF sync |
| **שלב flow** | hold-fix אחרי placement | retiming + CDC review |`,
        expectedAnswers: ['pipeline', 'pipeline register', 'synchronizer', '2-ff', 'two flip', 'תדר', 'frequency', 'retiming'],
      },
    ],
    source: 'מאגר ראיונות — שאלה רב-סעיפית',
    tags: ['ff', 'timing', 'setup-hold', 'shift-register', 'metastability', 'cdc'],
    circuitRevealsAnswer: true,
    circuit: () => build(() => {
      // input → DFF1 → DFF2 → DFF3 → out, all sharing the same clock.
      const inp  = h.input(140, 200, 'input');
      const clk  = h.clock(140, 460);
      const ff1  = h.ffD(380, 200, 'DFF1');
      const ff2  = h.ffD(620, 200, 'DFF2');
      const ff3  = h.ffD(860, 200, 'DFF3');
      const out  = h.output(1100, 200, 'out');
      inp.fixedValue = 1;  // matches the "input rises to 1" state in the waveform —
                           // STEP three times and the 1 propagates ff1→ff2→ff3→out.
      return {
        nodes: [inp, clk, ff1, ff2, ff3, out],
        wires: [
          h.wire(inp.id, ff1.id, 0),    // input → DFF1.D
          h.wire(clk.id, ff1.id, 1),    // clk   → DFF1.CLK
          h.wire(ff1.id, ff2.id, 0),    // Q1    → DFF2.D
          h.wire(clk.id, ff2.id, 1),    // clk   → DFF2.CLK
          h.wire(ff2.id, ff3.id, 0),    // Q2    → DFF3.D
          h.wire(clk.id, ff3.id, 1),    // clk   → DFF3.CLK
          h.wire(ff3.id, out.id, 0),    // Q3    → out
        ],
      };
    }),
  },

  // ─────────────────────────────────────────────────────────────
  // #5002 — 2-FF synchronizer + metastability + MTBF
  // ─────────────────────────────────────────────────────────────
  {
    id: 'two-ff-synchronizer',
    difficulty: 'medium',
    title: 'סנכרון אות אסינכרוני: 2-FF synchronizer + MTBF',
    intro:
`אות \`async_in\` מגיע מ-clock domain אחר (או מכפתור אסינכרוני).
תכנן מבנה לסנכרון לכניסה ל-domain שלך \`clk\`.
מהי **metastability**, ומה ה-**MTBF**?`,
    parts: [
      {
        label: null,
        question: 'מה המבנה המומלץ, ולמה דווקא 2 FFים?',
        hints: [
          'אם FF דוגם אות שמשתנה ב-±tsetup/thold סביב ה-edge — Q יכול להישאר במצב לא מוגדר זמן-מה (metastable).',
          'הפתרון: עוד FF אחרי הראשון. אם הראשון נתקע ב-meta, יש לו מחזור שלם להירגע לפני שהשני דוגם.',
          'MTBF גדל **אקספוננציאלית** עם הזמן לפני הדגימה הבאה. 2 FFים בדרך כלל מספיקים לתדרים נמוכים; קצבי GHz דורשים 3.',
        ],
        answer:
`**Metastability:** FF שדוגם אות שמשתנה בתוך \`tsetup/thold\` עלול לפלוט \`Q\` במצב ביניים (לא 0 ולא 1) לזמן \`tmet\`. אם \`tmet\` גדול מ-clock period הבא — הערך המטא-יציב מתפשט במעגל ויוצר תקלות.

**הפתרון — 2-FF synchronizer:**

\`\`\`
async_in ──→ [FF1] ──→ [FF2] ──→ sync_out
                ↑          ↑
                clk        clk
\`\`\`

FF1 עלול להיכנס ל-meta, אבל יש לו **clock period שלם** להתייצב לפני ש-FF2 דוגם.

**נוסחת MTBF:**

\`\`\`
MTBF = exp(t_met / τ) / (T_w · f_clk · f_data)
\`\`\`

- \`t_met\` = הזמן שניתן ל-FF להתייצב (≈ clock period פחות tsetup).
- \`τ\` = קבוע הזמן של ה-FF (תהליך-תלוי, ~30 ps לטכנולוגיה מודרנית).
- \`T_w\` = רוחב חלון ה-metastability.

**העיקרון החשוב:** MTBF גדל **אקספוננציאלית** עם t_met. כל FF נוסף בשרשרת מכפיל את t_met → מקטין הסתברות ל-meta בסדרי גודל.

**מתי 3-FF במקום 2?** ב-clk מהיר במיוחד (>1 GHz) או ב-aerospace/medical, שבהם MTBF נדרש להיות שנים-עשרות שנים.

**אזהרה:** סנכרון רק לאות חד-ביטי. עבור bus רב-ביטי דרושה שיטה כמו handshake או Gray code (אחרת ביטים שונים עלולים להגיע ב-cycles שונים).`,
        interviewerMindset:
`השאלה הזו היא **הליטמוס טסט של ראיון ASIC**. אם תיתקע פה — נגמר. רוצה לראות:

1. **מבדיל בין "מה זה metastability" ל-"איך פותרים":** הרבה מועמדים יודעים תיאוריה ולא פתרון.
2. **יודע למה 2 ולא 1:** "כי תוסיף עוד time slot להתייצבות, וההסתברות אקספוננציאלית בזמן."
3. **לא מצמיד סינכרוניזטור ל-bus רב-ביטי:** Gray code, handshake, async FIFO — כולם פתרונות תקפים לפי ההקשר.

**שאלה שמראיין אוהב לזרוק:** "האם 2-FF תופס את הכל?" התשובה: לא. הוא רק מפחית את ההסתברות. \`MTBF\` אינסופי לא קיים. בטכנולוגיה מודרנית, 2-FF נותן MTBF של מאות שנים — לרוב מספיק. ל-aerospace, מוסיפים שלישי.`,
        expectedAnswers: [
          '2', 'two', 'שני', 'שתי',
          'metastability', 'מטא', 'meta',
          'mtbf', 'exponential', 'אקספוננציאלי',
          'gray', 'handshake', 'bus', 'τ', 'tau',
        ],
        circuitRevealsAnswer: true,
        circuit: () => build(() => {
          const async_in = h.input(140, 220, 'async_in');
          const clk      = h.clock(140, 460);
          const ff1      = h.ffD(420, 220, 'FF1');
          const ff2      = h.ffD(700, 220, 'FF2');
          const out      = h.output(960, 220, 'sync_out');
          // Async-style toggling: pretend each STEP is a random arrival.
          async_in.fixedValue = 0;
          async_in.stepValues = [0, 1, 1, 0, 0, 1, 0, 1, 1, 0];
          return {
            nodes: [async_in, clk, ff1, ff2, out],
            wires: [
              h.wire(async_in.id, ff1.id, 0),
              h.wire(clk.id,      ff1.id, 1),
              h.wire(ff1.id,      ff2.id, 0),
              h.wire(clk.id,      ff2.id, 1),
              h.wire(ff2.id,      out.id, 0),
            ],
          };
        }),
      },
    ],
    source: 'מאגר ראיונות — הקלאסיק של CDC (asked everywhere)',
    tags: ['cdc', 'metastability', 'synchronizer', 'mtbf', 'timing'],
  },

  // ───────────────────────────────────────────────────────────────
  // #4001 — 3 D-FF chain: timing analysis (slide 31)
  // ───────────────────────────────────────────────────────────────
  {
    id: 'three-dff-chain-setup-hold',
    difficulty: 'medium',
    title: 'שרשרת 3 D-FFs — ניתוח setup/hold',
    intro:
`נתון המעגל הבא: \`input → DFF₁ → DFF₂ → DFF₃ → out\` — שלושה D-FFים בשרשרת חולקים את אותו clock.

3 חלקים:
- **א.** מה תצפה לראות בפלט \`out\` לאחר 3 מחזורי שעון? (assumes input rises at t=0)
- **ב.** היציאה עולה ל-\`1\` אחרי **שני** מחזורי שעון בלבד (לא 3) — איזה תנאי **לא** התקיים: \`setup\` או \`hold\`?
- **ג.** היציאה עולה ל-\`1\` אחרי **ארבעה** מחזורי שעון (לא 3) — איזה תנאי **לא** התקיים?`,
    schematic: `
<svg viewBox="0 0 660 240" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="3 D-FF chain with shared clock">
  <defs>
    <linearGradient id="tdBody" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#143049"/><stop offset="1" stop-color="#0a1825"/>
    </linearGradient>
    <marker id="tdArr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#80f0a0"/></marker>
  </defs>

  <!-- 3 D-FFs -->
  ${[1, 2, 3].map(i => `
    <rect x="${100 + (i - 1) * 160}" y="60" width="110" height="100" rx="8" fill="url(#tdBody)" stroke="#80d4ff" stroke-width="1.8"/>
    <text direction="ltr" x="${155 + (i - 1) * 160}" y="100" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="18">DFF${i}</text>
    <text direction="ltr" x="${155 + (i - 1) * 160}" y="120" text-anchor="middle" fill="#a0c0e0" font-size="16">D    Q</text>
    <text direction="ltr" x="${155 + (i - 1) * 160}" y="148" text-anchor="middle" fill="#80d4ff" font-size="16">↑ clk</text>
  `).join('')}

  <!-- Input arrow -->
  <text direction="ltr" x="40" y="116" text-anchor="middle" fill="#f0d080" font-weight="bold">input</text>
  <line x1="78" y1="112" x2="100" y2="112" stroke="#f0d080" stroke-width="1.6"/>
  <polygon points="100,112 94,108 94,116" fill="#f0d080"/>

  <!-- Q1 → DFF2.D -->
  <line x1="210" y1="112" x2="260" y2="112" stroke="#80d4ff" stroke-width="1.4"/>
  <text direction="ltr" x="235" y="106" text-anchor="middle" fill="#80d4ff" font-size="16">Q1</text>
  <polygon points="260,112 254,108 254,116" fill="#80d4ff"/>

  <!-- Q2 → DFF3.D -->
  <line x1="370" y1="112" x2="420" y2="112" stroke="#80d4ff" stroke-width="1.4"/>
  <text direction="ltr" x="395" y="106" text-anchor="middle" fill="#80d4ff" font-size="16">Q2</text>
  <polygon points="420,112 414,108 414,116" fill="#80d4ff"/>

  <!-- Q3 → out -->
  <line x1="530" y1="112" x2="600" y2="112" stroke="#80f0a0" stroke-width="2" marker-end="url(#tdArr)"/>
  <text direction="ltr" x="630" y="116" text-anchor="middle" fill="#80f0a0" font-weight="bold">out</text>

  <!-- Shared clock -->
  <text direction="ltr" x="330" y="200" text-anchor="middle" fill="#f0d080" font-weight="bold">clk (shared)</text>
  <line x1="330" y1="184" x2="330" y2="160" stroke="#f0d080" stroke-width="1.4"/>
</svg>`,
    circuitRevealsAnswer: true,
    parts: [
      {
        label: 'א',
        question: 'מה תצפה לראות ב-\`out\` לאחר 3 מחזורי שעון? (assumes input is asserted at start)',
        hints: [
          'כל D-FF "מאחר" את הסיגנל ב-cycle אחד.',
          '3 D-FFs בשרשרת → הסיגנל מתאחר ב-3 cycles.',
          'אם \`input = 1\` משעה \`t=0\`, אז \`out = 1\` משעה \`t = 3T_clk\` (T_clk = תקופה).',
        ],
        answer:
`**out יעלה ל-\`1\` בדיוק לאחר 3 מחזורי שעון** מהקצה העולה הראשון של ה-clock לאחר ה-\`input = 1\`.

### למה?

כל D-FF "מאחר" את הסיגנל ב-cycle אחד:
- אחרי clock 1: \`Q1 = input\` (input הועתק ל-DFF1)
- אחרי clock 2: \`Q2 = Q1 = input\` (התקדם ל-DFF2)
- אחרי clock 3: \`Q3 = Q2 = input\` ← \`out = 1\` ✓

זוהי **שרשרת shift register** — כל קצה clock מקדם את הסיגנל ב-stage אחד. עומק 3 = שלושה stages = 3 cycles delay (ראה תרשים הזמן מתחת).

זה השימוש הקלאסי של shift register כ-**delay line**.`,
        answerSchematic: `
<svg viewBox="0 0 720 380" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="16" role="img" aria-label="3-DFF chain timing diagram showing 3-cycle delay">
  <!-- Title -->
  <rect x="0" y="0" width="720" height="40" fill="#0c1a28"/>
  <text direction="ltr" x="360" y="26" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="18">
    3-DFF chain: each clock advances the signal one stage → 3-cycle delay
  </text>

  <!-- t=0 marker -->
  <text direction="ltr" x="106" y="64" fill="#f0d080" font-size="16" font-weight="bold">t=0</text>
  <line x1="120" y1="68" x2="120" y2="360" stroke="#806040" stroke-width="0.6" stroke-dasharray="2 3"/>
  <polygon points="120,74 116,66 124,66" fill="#f0d080"/>

  <!-- Clock edge markers + labels -->
  ${[1, 2, 3, 4].map((n, i) => {
    const x = 180 + i * 100;
    return `
      <line x1="${x}" y1="86" x2="${x}" y2="360" stroke="#806040" stroke-width="0.5" stroke-dasharray="2 4"/>
      <text direction="ltr" x="${x}" y="80" text-anchor="middle" fill="#ff8060" font-size="16" font-weight="bold">${n}</text>
      <text direction="ltr" x="${x}" y="68" text-anchor="middle" fill="#ff8060" font-size="16">↑</text>
    `;
  }).join('')}

  <!-- clk waveform -->
  <text direction="ltr" x="60" y="120" text-anchor="end" fill="#c8d8f0" font-weight="bold">clk</text>
  <path d="M 120 130 v -20 h 50 v 20 h 50 v -20 h 50 v 20 h 50 v -20 h 50 v 20 h 50 v -20 h 50 v 20 h 50 v -20 h 50 v 20 h 50 v -20 h 50 v 20"
        stroke="#f0d080" stroke-width="1.6" fill="none"/>

  <!-- input waveform: high from t=0 -->
  <text direction="ltr" x="60" y="180" text-anchor="end" fill="#c8d8f0" font-weight="bold">input</text>
  <path d="M 120 190 v -22 h 530"
        stroke="#80b0e0" stroke-width="1.8" fill="none"/>
  <text direction="ltr" x="680" y="174" text-anchor="middle" fill="#80b0e0" font-size="16" font-style="italic">high from t=0</text>

  <!-- Q1 waveform: rises after clk 1 (x=180) -->
  <text direction="ltr" x="60" y="230" text-anchor="end" fill="#c8d8f0" font-weight="bold">Q1</text>
  <path d="M 120 240 h 60 v -22 h 470"
        stroke="#80f0a0" stroke-width="1.8" fill="none"/>
  <text direction="ltr" x="680" y="224" text-anchor="middle" fill="#80f0a0" font-size="16" font-style="italic">↑ at clk 1</text>

  <!-- Q2 waveform: rises after clk 2 (x=280) -->
  <text direction="ltr" x="60" y="280" text-anchor="end" fill="#c8d8f0" font-weight="bold">Q2</text>
  <path d="M 120 290 h 160 v -22 h 370"
        stroke="#80f0a0" stroke-width="1.8" fill="none"/>
  <text direction="ltr" x="680" y="274" text-anchor="middle" fill="#80f0a0" font-size="16" font-style="italic">↑ at clk 2</text>

  <!-- Q3=out waveform: rises after clk 3 (x=380) -->
  <text direction="ltr" x="60" y="330" text-anchor="end" fill="#ffd060" font-weight="bold">Q3=out</text>
  <path d="M 120 340 h 260 v -22 h 270"
        stroke="#ffd060" stroke-width="2.2" fill="none"/>
  <text direction="ltr" x="680" y="324" text-anchor="middle" fill="#ffd060" font-size="16" font-style="italic">↑ at clk 3</text>
</svg>`,
        expectedAnswers: [
          '3', 'three', 'שלושה',
          'cycle', 'מחזור',
          'shift register', 'shift-reg',
          'delay',
        ],
      },
      {
        label: 'ב',
        question: 'הפלט עולה אחרי **2** מחזורי שעון בלבד — איזה תנאי לא התקיים, setup או hold?',
        hints: [
          '**Hold violation:** הנתון משתנה **מהר מדי** אחרי הקצה — לפני שה-D-FF הספיק "לאחוז" בערך הישן.',
          'בשרשרת \`DFF1 → DFF2\`: אם \`Q1\` משתנה (מתעדכן ל-input) ובאותו קלוק \`DFF2.D\` (= Q1) הצליח להעביר את הערך החדש ל-\`DFF2\` — זה Hold violation.',
          'תוצאה: 2 ה-FFים "התעדכנו בו-זמנית" — הסיגנל "דילג" שלב. במקום 3 cycles, רק 2.',
          'הסיבה: Q1 שינתה ערך **לפני** ש-DFF2 הספיק לסיים את ה-hold time שלה אחרי הקצה הקודם.',
        ],
        answer:
`**הפר תנאי \`hold\`** (Hold time violation).

### הסבר מדויק

תנאי **hold** דורש שהנתון יישאר יציב על D **למשך זמן \`t_hold\` אחרי הקצה העולה של ה-clock**. אם הנתון משתנה מוקדם מדי (לפני שעבר \`t_hold\`), ה-FF עלול לתפוס את **הערך החדש** במקום הישן.

### בשרשרת DFF1 → DFF2

- בקצה k: DFF1 מעדכן את Q1 לערך חדש (= input).
- אם clk-to-Q של DFF1 + propagation < hold time של DFF2 → ה-Q1 (החדש) מגיע ל-DFF2.D לפני שעבר t_hold → **DFF2 תופס את הערך החדש באותו קצה**.
- ⇒ הסיגנל "דילג" stage אחד: 3 cycles → 2 cycles.

### תרשים זמן עם Hold violation

\`\`\`
clk: ‾|_|‾|_|‾
       ↑ k=1
input rises just before clk[1]
Q1 should: rise after clk[1] (after t_clk-to-Q)
Q1 actual: rises VERY fast → reaches DFF2.D before hold time elapses
Q2 (DFF2.D=Q1): captured the NEW value at clk[1] instead of OLD
              ⇒ Q2 rises at clk[1], not clk[2]
Q3 (DFF3): captures Q2 at clk[2], so out=1 at clk[2]   ← 2 cycles, not 3!
\`\`\`

### הסיבה בפועל

Hold violations בדרך כלל נגרמות מ:
- **clk-to-Q time קצר מדי** (DFF1 מהיר מדי).
- **Propagation delay בין DFFים קטן מדי** (קו קצר).
- **Clock skew בעיתי**.

### תיקון בעיצוב

מוסיפים **buffer/delay** בין DFF1 ל-DFF2 כדי להאריך את ה-propagation והבטיח \`t_hold\` של DFF2.`,
        expectedAnswers: [
          'hold', 'hold time', 'hold violation',
          'hold לא מתקיים', 'hold violation',
          'נתון משתנה', 'מהר מדי',
          'clk-to-q', 'propagation',
          'skip', 'דילוג',
        ],
      },
      {
        label: 'ג',
        question: 'הפלט עולה אחרי **4** מחזורי שעון (איחור של 1) — איזה תנאי לא התקיים?',
        hints: [
          '**Setup violation:** הנתון לא הגיע ליציבות **בזמן** לפני הקצה — ה-D-FF מפספס את הקצה.',
          'בשרשרת \`DFF1 → DFF2\`: אם \`Q1\` עוד לא יציב כש-clk עולה ב-DFF2 → DFF2 שומר את הערך הישן (לא קולט).',
          'בקצה הבא הוא יקלוט (כשהנתון כבר יציב) → איחור של cycle אחד.',
          '⇒ 3 cycles הופכים ל-4.',
        ],
        answer:
`**הפר תנאי \`setup\`** (Setup time violation).

### הסבר מדויק

תנאי **setup** דורש שהנתון יהיה יציב על D **למשך זמן \`t_setup\` לפני הקצה העולה של ה-clock**. אם הנתון משתנה מאוחר מדי (פחות מ-\`t_setup\` לפני הקצה), ה-FF עלול לפספס את הקצה ולשמור את הערך הישן.

### בשרשרת DFF1 → DFF2

- בקצה k: DFF1 מעדכן את Q1 לערך חדש (= input).
- ה-propagation מ-DFF1 ל-DFF2 + clk-to-Q של DFF1 גדול מדי → Q1 מגיע ל-DFF2.D **אחרי** ש-t_setup של הקצה הבא (k+1) כבר התחיל.
- ⇒ DFF2 מפספס את הקצה k+1 ושומר את הערך הישן. רק בקצה k+2 הוא יקלוט.
- ⇒ הסיגנל הוסיף stage אחד למסלולו: 3 cycles → 4 cycles.

### תרשים זמן עם Setup violation

\`\`\`
clk:   ‾|_|‾|_|‾|_|‾|_|‾
        ↑ k   k+1  k+2  k+3
input: ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
Q1:    rises just BEFORE clk[k+1], but propagation is slow
Q2 should: rise at clk[k+1] (capture Q1)
Q2 actual: Q1 not stable enough → DFF2 misses → Q2 still 0 at clk[k+1]
Q2:    rises at clk[k+2] instead   ← 1 cycle late
Q3=out: rises at clk[k+3]          ← 4 cycles total, not 3!
\`\`\`

### הסיבה בפועל

Setup violations נגרמות מ:
- **תדר clock גבוה מדי** (לא נשאר זמן בין קצוות).
- **Combinational delay גדול בין FFים** (נתיב לוגי מסובך).
- **Process variation** (chip ייצור איטי).

### תיקון בעיצוב

1. **להוריד את תדר ה-clock** — מאריך את t_clk → יש זמן לנתון להיות יציב.
2. **לחתוך את הלוגיקה ל-pipeline** — DFF נוסף באמצע נתיב ארוך מקטין את ה-combinational depth.
3. **Retiming** — להעביר logic מצד אחד של FF לצד שני (Synopsys/Vivado עושים את זה אוטומטית).

### סיכום: setup vs hold

| תנאי | משמעות | תופעה | תיקון |
|------|---------|--------|---------|
| **Setup** | Data must be stable **before** edge | Output **late** | ↓ frequency, retiming, pipeline |
| **Hold**  | Data must be stable **after** edge | Output **early** / skip | Insert buffer/delay |

זה בדיוק **STA — Static Timing Analysis** — הניתוח שכל chip עובר לפני tape-out.`,
        expectedAnswers: [
          'setup', 'setup time', 'setup violation',
          'setup לא מתקיים', 'setup violation',
          'late', 'איחור', 'מאוחר',
          'frequency', 'תדר',
          'pipeline', 'retiming',
          'sta',
        ],
      },
    ],
    source: 'IQ/PP — מצגת שאלות מעגלים, שקף 31 (3-DFF setup/hold)',
    tags: ['setup', 'hold', 'timing', 'sta', 'metastability', 'cdc'],
    // Canvas: 3 D-FFs in series sharing one clock. The simulator gives
    // visual confirmation: input rises, then Q1, Q2, Q3 rise on successive
    // clocks — a clean shift register / 3-cycle delay line.
    circuit: () => build(() => {
      const clk = h.clock(120, 340);
      const inp = h.input(120, 200, 'input'); inp.fixedValue = 0;
      inp.stepValues = [0, 0, 1, 1, 1, 1, 1, 1, 1, 1];   // rises after step 1
      const ff1 = h.ffD(320, 200, 'DFF1');
      const ff2 = h.ffD(520, 200, 'DFF2');
      const ff3 = h.ffD(720, 200, 'DFF3');
      const out = h.output(960, 200, 'out');
      return {
        nodes: [clk, inp, ff1, ff2, ff3, out],
        wires: [
          // Chain
          h.wire(inp.id, ff1.id, 0),
          h.wire(ff1.id, ff2.id, 0),
          h.wire(ff2.id, ff3.id, 0),
          h.wire(ff3.id, out.id, 0),
          // Shared clock
          h.wire(clk.id, ff1.id, 1, 0, { isClockWire: true }),
          h.wire(clk.id, ff2.id, 1, 0, { isClockWire: true }),
          h.wire(clk.id, ff3.id, 1, 0, { isClockWire: true }),
        ],
      };
    }),
  },

  // ─────────────────────────────────────────────────────────────
  // Real interview question (multi-stage) — Stage 1
  //
  // Given a gate-level netlist of 7 gates (3 XOR + 3 AND + 1 OR)
  // with 4 inputs and 3 outputs, identify the high-level
  // component being implemented. The wiring matches a textbook
  // 2-bit ripple-carry adder (HA on bit 0 + FA on bit 1 sharing
  // the carry-propagate XOR).
  //
  // The schematic shows the netlist only — no "ADDER" label —
  // so the student must reverse-engineer from the topology.
  // Further stages will be appended by the interviewer.
  // ─────────────────────────────────────────────────────────────
  {
    id: 'interview-2bit-adder-identification',
    difficulty: 'hard',
    title: 'זיהוי רכיב מתוך מימוש שערים — מחבר 2-ביט',
    intro:
`ניתן לפניך מימוש gate-level של מעגל קומבינטורי:

- **4 כניסות**: \`A0, A1, B0, B1\`
- **3 יציאות**: \`S0, S1, S2\`
- **7 שערים**: 3 × XOR, 3 × AND, 1 × OR

ה-XORs / ANDs / OR מחוברים ביניהם כפי שמופיע בשרטוט. אין שום תיוג ברמה גבוהה — רק שערים וחוטים.`,
    schematic: `
<svg viewBox="0 0 1120 740" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Gate-level netlist of seven gates wired together with clear input fan-outs.">

  <text x="560" y="36" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="24">
    מעגל קומבינטורי — 4 כניסות, 3 יציאות, 7 שערים
  </text>
  <text x="560" y="62" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">
    מה הרכיב המיוצג?
  </text>

  <!-- =================================================
       INPUTS (left column) — clearly separated y values
       ================================================= -->
  <g font-size="20" font-weight="bold">
    <circle cx="60" cy="140" r="22" fill="#0a1825" stroke="#cca040" stroke-width="2.4"/>
    <text x="60" y="147" text-anchor="middle" fill="#cca040">A0</text>
    <circle cx="60" cy="240" r="22" fill="#0a1825" stroke="#cca040" stroke-width="2.4"/>
    <text x="60" y="247" text-anchor="middle" fill="#cca040">B0</text>
    <circle cx="60" cy="450" r="22" fill="#0a1825" stroke="#cca040" stroke-width="2.4"/>
    <text x="60" y="457" text-anchor="middle" fill="#cca040">A1</text>
    <circle cx="60" cy="550" r="22" fill="#0a1825" stroke="#cca040" stroke-width="2.4"/>
    <text x="60" y="557" text-anchor="middle" fill="#cca040">B1</text>
  </g>

  <!-- =================================================
       A0 fan-out — clear trunk + T-junctions
       A0 feeds XOR1.in0 (y=175) and AND1.in0 (y=255)
       Trunk drop column: x=150
       ================================================= -->
  <line x1="82" y1="140" x2="150" y2="140" stroke="#cca040" stroke-width="2.2"/>
  <line x1="150" y1="140" x2="150" y2="255" stroke="#cca040" stroke-width="2.2"/>
  <!-- T-junction to XOR1.in0 -->
  <circle cx="150" cy="175" r="5" fill="#cca040"/>
  <line x1="150" y1="175" x2="220" y2="175" stroke="#cca040" stroke-width="2.2"/>
  <!-- Endpoint to AND1.in0 -->
  <line x1="150" y1="255" x2="220" y2="255" stroke="#cca040" stroke-width="2.2"/>

  <!-- =================================================
       B0 fan-out — drop column at x=180 (separate from A0)
       B0 feeds XOR1.in1 (y=205) and AND1.in1 (y=285)
       ================================================= -->
  <line x1="82" y1="240" x2="180" y2="240" stroke="#cca040" stroke-width="2.2"/>
  <!-- Up to XOR1.in1 -->
  <line x1="180" y1="240" x2="180" y2="205" stroke="#cca040" stroke-width="2.2"/>
  <line x1="180" y1="205" x2="220" y2="205" stroke="#cca040" stroke-width="2.2"/>
  <!-- T-junction at trunk meeting point -->
  <circle cx="180" cy="240" r="5" fill="#cca040"/>
  <!-- Down to AND1.in1 -->
  <line x1="180" y1="240" x2="180" y2="285" stroke="#cca040" stroke-width="2.2"/>
  <line x1="180" y1="285" x2="220" y2="285" stroke="#cca040" stroke-width="2.2"/>

  <!-- =================================================
       XOR1 (A0 ⊕ B0) — produces S0
       Body: x=220-310, inputs at y=175,205; output at y=190
       ================================================= -->
  <g>
    <path d="M 220 162 Q 245 190, 220 218 L 250 218 Q 290 218, 310 190 Q 290 162, 250 162 Z" fill="#1a3a2a" stroke="#80f0a0" stroke-width="2.2"/>
    <text x="268" y="196" text-anchor="middle" fill="#80f0a0" font-size="20" font-weight="bold">⊕</text>
    <text x="265" y="148" text-anchor="middle" fill="#a0c0d0" font-size="18" font-weight="bold">XOR1</text>
  </g>
  <!-- XOR1 output → S0 (long horizontal to right edge) -->
  <line x1="310" y1="190" x2="1040" y2="190" stroke="#ff9933" stroke-width="2.2"/>

  <!-- =================================================
       AND1 (A0 · B0) — produces internal C1 (carry from bit 0)
       Body: x=220-300, inputs at y=255,285; output at y=270
       ================================================= -->
  <g>
    <path d="M 220 240 L 250 240 A 30 30 0 0 1 250 300 L 220 300 Z" fill="#1a2230" stroke="#80c8ff" stroke-width="2.2"/>
    <text x="246" y="276" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">AND1</text>
  </g>

  <!-- C1 trunk: AND1.out (300, 270) → right to (480, 270),
       then down to (480, 510) splitting into XOR3.in1 and AND3.in1 -->
  <line x1="300" y1="270" x2="480" y2="270" stroke="#cc66ff" stroke-width="2.4"/>
  <text x="385" y="260" text-anchor="middle" fill="#cc99ff" font-size="18" font-style="italic" font-weight="bold">net C1</text>
  <line x1="480" y1="270" x2="480" y2="510" stroke="#cc66ff" stroke-width="2.4"/>
  <!-- T-junction at 480/420 → XOR3.in1 -->
  <circle cx="480" cy="420" r="5" fill="#cc66ff"/>
  <line x1="480" y1="420" x2="540" y2="420" stroke="#cc66ff" stroke-width="2.4"/>
  <!-- Endpoint at 480/510 → AND3.in1 -->
  <line x1="480" y1="510" x2="540" y2="510" stroke="#cc66ff" stroke-width="2.4"/>

  <!-- =================================================
       A1 fan-out — same pattern as A0
       Trunk drop column: x=150
       A1 feeds XOR2.in0 (y=385) and AND2.in0 (y=465)
       ================================================= -->
  <line x1="82" y1="450" x2="150" y2="450" stroke="#cca040" stroke-width="2.2"/>
  <!-- Up to XOR2.in0 -->
  <line x1="150" y1="450" x2="150" y2="385" stroke="#cca040" stroke-width="2.2"/>
  <line x1="150" y1="385" x2="220" y2="385" stroke="#cca040" stroke-width="2.2"/>
  <!-- T-junction at trunk -->
  <circle cx="150" cy="450" r="5" fill="#cca040"/>
  <!-- Down to AND2.in0 -->
  <line x1="150" y1="450" x2="150" y2="565" stroke="#cca040" stroke-width="2.2"/>
  <line x1="150" y1="565" x2="220" y2="565" stroke="#cca040" stroke-width="2.2"/>

  <!-- =================================================
       B1 fan-out — drop column at x=180
       B1 feeds XOR2.in1 (y=415) and AND2.in1 (y=595)
       ================================================= -->
  <line x1="82" y1="550" x2="180" y2="550" stroke="#cca040" stroke-width="2.2"/>
  <!-- Up to XOR2.in1 -->
  <line x1="180" y1="550" x2="180" y2="415" stroke="#cca040" stroke-width="2.2"/>
  <line x1="180" y1="415" x2="220" y2="415" stroke="#cca040" stroke-width="2.2"/>
  <!-- T-junction at trunk -->
  <circle cx="180" cy="550" r="5" fill="#cca040"/>
  <!-- Down to AND2.in1 -->
  <line x1="180" y1="550" x2="180" y2="595" stroke="#cca040" stroke-width="2.2"/>
  <line x1="180" y1="595" x2="220" y2="595" stroke="#cca040" stroke-width="2.2"/>

  <!-- =================================================
       XOR2 (A1 ⊕ B1) — produces internal "P"
       ================================================= -->
  <g>
    <path d="M 220 372 Q 245 400, 220 428 L 250 428 Q 290 428, 310 400 Q 290 372, 250 372 Z" fill="#1a3a2a" stroke="#80f0a0" stroke-width="2.2"/>
    <text x="268" y="406" text-anchor="middle" fill="#80f0a0" font-size="20" font-weight="bold">⊕</text>
    <text x="265" y="358" text-anchor="middle" fill="#a0c0d0" font-size="18" font-weight="bold">XOR2</text>
  </g>

  <!-- P trunk: XOR2.out (310, 400) → right to (400, 400),
       then up to XOR3.in0 (440, 390) and down to AND3.in0 (440, 490) -->
  <line x1="310" y1="400" x2="400" y2="400" stroke="#ff9933" stroke-width="2.4"/>
  <text x="355" y="390" text-anchor="middle" fill="#ffc080" font-size="18" font-style="italic" font-weight="bold">net P</text>
  <circle cx="400" cy="400" r="5" fill="#ff9933"/>
  <!-- Up to XOR3.in0 (440, 390) -->
  <line x1="400" y1="400" x2="400" y2="390" stroke="#ff9933" stroke-width="2.4"/>
  <line x1="400" y1="390" x2="540" y2="390" stroke="#ff9933" stroke-width="2.4"/>
  <!-- Down to AND3.in0 (440, 480) -->
  <line x1="400" y1="400" x2="400" y2="480" stroke="#ff9933" stroke-width="2.4"/>
  <line x1="400" y1="480" x2="540" y2="480" stroke="#ff9933" stroke-width="2.4"/>

  <!-- =================================================
       AND2 (A1 · B1) — produces internal "G"
       ================================================= -->
  <g>
    <path d="M 220 552 L 250 552 A 30 30 0 0 1 250 612 L 220 612 Z" fill="#1a2230" stroke="#80c8ff" stroke-width="2.2"/>
    <text x="246" y="588" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">AND2</text>
  </g>

  <!-- G trunk: AND2.out (300, 580) → right all the way to OR1.in0 (760, 580 → up to 555) -->
  <line x1="300" y1="580" x2="730" y2="580" stroke="#80c8ff" stroke-width="2.4"/>
  <text x="500" y="570" text-anchor="middle" fill="#80c8ff" font-size="18" font-style="italic" font-weight="bold">net G</text>
  <line x1="730" y1="580" x2="730" y2="555" stroke="#80c8ff" stroke-width="2.4"/>
  <line x1="730" y1="555" x2="760" y2="555" stroke="#80c8ff" stroke-width="2.4"/>

  <!-- =================================================
       XOR3 (P ⊕ C1) — produces S1
       Body: x=540-630, inputs at y=390,420; output at y=405
       ================================================= -->
  <g>
    <path d="M 540 377 Q 565 405, 540 433 L 570 433 Q 610 433, 630 405 Q 610 377, 570 377 Z" fill="#1a3a2a" stroke="#80f0a0" stroke-width="2.2"/>
    <text x="588" y="411" text-anchor="middle" fill="#80f0a0" font-size="20" font-weight="bold">⊕</text>
    <text x="585" y="363" text-anchor="middle" fill="#a0c0d0" font-size="18" font-weight="bold">XOR3</text>
  </g>
  <!-- XOR3 output → S1 -->
  <line x1="630" y1="405" x2="1040" y2="405" stroke="#ff9933" stroke-width="2.2"/>

  <!-- =================================================
       AND3 (P · C1)
       Body: x=540-620, inputs at y=480,510; output at y=495
       ================================================= -->
  <g>
    <path d="M 540 465 L 570 465 A 30 30 0 0 1 570 525 L 540 525 Z" fill="#1a2230" stroke="#80c8ff" stroke-width="2.2"/>
    <text x="566" y="501" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">AND3</text>
  </g>

  <!-- AND3 out → OR1.in1: (620, 495) → right to (740, 495) → down to (740, 595) → right to OR1.in1 (760, 595) -->
  <line x1="620" y1="495" x2="740" y2="495" stroke="#80c8ff" stroke-width="2.4"/>
  <line x1="740" y1="495" x2="740" y2="595" stroke="#80c8ff" stroke-width="2.4"/>
  <line x1="740" y1="595" x2="760" y2="595" stroke="#80c8ff" stroke-width="2.4"/>

  <!-- =================================================
       OR1 (G + P·C1) — produces S2
       Clean shield-shape with concave back + pointed front,
       inputs at y=555 and y=595, output at y=575
       ================================================= -->
  <g>
    <path d="M 760 540 L 790 540 Q 840 540, 855 575 Q 840 610, 790 610 L 760 610 Q 785 575, 760 540 Z"
          fill="#3a2a14" stroke="#ffc080" stroke-width="2.2"/>
    <text x="800" y="582" text-anchor="middle" fill="#ffc080" font-size="24" font-weight="bold">≥1</text>
    <text x="800" y="525" text-anchor="middle" fill="#a0c0d0" font-size="18" font-weight="bold">OR1</text>
  </g>
  <!-- OR1 output → S2 -->
  <line x1="855" y1="575" x2="1040" y2="575" stroke="#ff9933" stroke-width="2.2"/>

  <!-- =================================================
       OUTPUTS (right column)
       ================================================= -->
  <g font-size="20" font-weight="bold">
    <circle cx="1060" cy="190" r="22" fill="#0a1825" stroke="#ff9933" stroke-width="2.4"/>
    <text x="1060" y="197" text-anchor="middle" fill="#ff9933">S0</text>
    <circle cx="1060" cy="405" r="22" fill="#0a1825" stroke="#ff9933" stroke-width="2.4"/>
    <text x="1060" y="412" text-anchor="middle" fill="#ff9933">S1</text>
    <circle cx="1060" cy="575" r="22" fill="#0a1825" stroke="#ff9933" stroke-width="2.4"/>
    <text x="1060" y="582" text-anchor="middle" fill="#ff9933">S2</text>
  </g>

  <!-- Legend at the bottom -->
  <text x="560" y="700" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">
    7 שערים: 3 × XOR (⊕) · 3 × AND · 1 × OR (≥1)
  </text>
  <text x="560" y="722" text-anchor="middle" fill="#80c8ff" font-size="18">
    net C1 ≡ AND1.out   ·   net P ≡ XOR2.out   ·   net G ≡ AND2.out
  </text>
</svg>`,
    parts: [
      {
        label: 'א',
        question: '**איזה רכיב ממשים במעגל**?',
        hints: [
          'התחל בלמפות את ה-Boolean expression של כל יציאה: \`S0 = ?\`, \`S1 = ?\`, \`S2 = ?\`.',
          'XOR1 נותן \`S0 = A0 ⊕ B0\`. אם רואים XOR בין שני ביטים — הוא מחבר חד-ביטי.',
          'AND1 נותן \`carry = A0 · B0\`. כתיבת ה-truth table של \`(A0, B0) → (S0, carry)\` נראית כמו half-adder.',
          'XOR3 מחבר את \`P = A1 ⊕ B1\` עם carry-in מ-AND1. \`S1 = A1 ⊕ B1 ⊕ C1\` — זה ה-SUM של full-adder.',
          'OR1 מקבל \`(A1·B1)\` ו-\`(P·C1)\` ⇒ \`S2 = A1·B1 + (A1⊕B1)·C1\` — זה COUT הקלאסי של full-adder.',
          'סיכום: bit 0 הוא half-adder, bit 1 הוא full-adder עם carry-in מ-bit 0. שניהם יחד = **מחבר 2-ביט**.',
        ],
        answer:
`**זהו מחבר בינארי של 2 ביטים (2-bit ripple-carry adder), ללא carry-in חיצוני.**

### פירוק ה-Boolean expressions

| יציאה | ביטוי | תפקיד |
|---|---|---|
| \`S0\` | \`A0 ⊕ B0\` | bit-0 sum |
| \`C1\` (נט פנימי) | \`A0 · B0\` | carry-out של bit 0 |
| \`S1\` | \`(A1 ⊕ B1) ⊕ C1\` | bit-1 sum |
| \`S2\` | \`(A1·B1) + (A1⊕B1)·C1\` | carry-out (=bit-2 result) |

### זיהוי הרכיבים

- **bit 0**: \`XOR1 + AND1\` = **half-adder**. אין carry-in, רק שני ביטים נכנסים, ויוצאים sum + carry.
- **bit 1**: \`XOR2 + XOR3 + AND2 + AND3 + OR1\` = **full-adder** (5 שערים). מקבל \`A1\`, \`B1\`, ו-carry-in מ-\`AND1\`. מוציא sum (\`S1\`) ו-carry-out (\`S2\`).

\`net P = A1 ⊕ B1\` (מ-XOR2) משותף לחישוב גם של ה-SUM (דרך XOR3) וגם של ה-COUT (דרך AND3). זה אופטימיזציה קלאסית של FA.

### חישוב מספרי

המעגל מחשב \`(A1A0) + (B1B0) = S2 S1 S0\` — סכום של שני מספרים בני 2 ביטים, יוצא 3 ביטים (כי \`3+3 = 6\` בעשרוני, כלומר \`11 + 11 = 110\` בבינארי, צריך 3 ביטים).

### טבלת אמת מלאה (16 שורות)

| A1 A0 | B1 B0 | A | B | A+B | S2 S1 S0 |
|:---:|:---:|:---:|:---:|:---:|:---:|
| 00 | 00 | 0 | 0 | 0 | 000 |
| 00 | 01 | 0 | 1 | 1 | 001 |
| 00 | 10 | 0 | 2 | 2 | 010 |
| 00 | 11 | 0 | 3 | 3 | 011 |
| 01 | 00 | 1 | 0 | 1 | 001 |
| 01 | 01 | 1 | 1 | 2 | 010 |
| 01 | 10 | 1 | 2 | 3 | 011 |
| 01 | 11 | 1 | 3 | 4 | 100 |
| 10 | 00 | 2 | 0 | 2 | 010 |
| 10 | 01 | 2 | 1 | 3 | 011 |
| 10 | 10 | 2 | 2 | 4 | 100 |
| 10 | 11 | 2 | 3 | 5 | 101 |
| 11 | 00 | 3 | 0 | 3 | 011 |
| 11 | 01 | 3 | 1 | 4 | 100 |
| 11 | 10 | 3 | 2 | 5 | 101 |
| 11 | 11 | 3 | 3 | 6 | 110 |

**אבחנה**: בכל שורה \`S2 S1 S0 = bin(A + B)\`. סימן ברור של מחבר בינארי. שורה אחרונה: \`3 + 3 = 6 = 110₂\` — צריך 3 ביטים, ולכן 3 outputs.

### בקנבס — שני מעגלים נפרדים לחלוטין

הקנבס טוען **שני מעגלים עצמאיים**, כל אחד עם הכניסות והיציאות שלו:

1. **למעלה — מעגל השאלה (gate-level)**: 4 INPUT pads \`A0, B0, A1, B1\` → 7 שערים → 3 OUTPUT pads \`S0, S1, S2\`.
2. **למטה — מעגל התשובה (reference)**: 4 INPUT pads \`A0', B0', A1', B1'\` → **\`FA יחיד עם bitWidth=2\`** (קצוץ ע"י MERGE לכניסות ו-SPLIT ליציאות) → 3 OUTPUT pads \`S0', S1', S2'\`.

המעגל למטה מדגים **את מלוא העוצמה של פרמטריזציה**: רכיב אריתמטי **בודד** (FA 2-bit) מבצע בדיוק את אותה הפעולה כמו 7 שערי הלוגיקה למעלה. ה-MERGE / SPLIT הם רק חיווט (אריזה של שני 1-bit לתוך bus 2-bit וחזרה), לא חישוב.

**כלל בדיקה**: הצב את אותם ערכים ב-\`A0, A0'\` (ובהתאמה לשאר), השווה את הפלטים. הם **חייבים** להיות זהים בכל 16 הקומבינציות. **זוהי הוכחה ויזואלית**: 7 שערים ↔ FA אטומי אחד — אותה פעולה, רמת הפשטה שונה.`,
        interviewerMindset:
`**שאלת פתיחה קלאסית** בראיון תכן לוגי. המראיין מחפש:
1. **שאתה לא קופץ למסקנה** — לא טוען מיד "זה adder" בלי לבדוק את ה-Boolean של כל יציאה.
2. **שאתה מזהה XOR + AND = half-adder** — דפוס שצריך להיות מיד.
3. **שאתה מזהה את ה-FA structure** — \`SUM = A⊕B⊕Cin\`, \`COUT = AB + (A⊕B)·Cin\`. תבנית textbook.
4. **שאתה רואה את ה-net sharing** — \`A1⊕B1\` משותף ל-SUM ול-COUT (אופטימיזציה ב-7 שערים במקום 8 לו לא היה sharing).

**שאלת המשך אפשרית**: מה אם נוסיף \`Cin\` חיצוני לבית 0? → bit 0 יהפוך מ-half-adder ל-full-adder, ויידרשו עוד 1 XOR + 1 AND + 1 OR (סך-הכל ~10 שערים).

**מלכודת נפוצה**: מועמדים שמסתכלים על מספר השערים (7) ומנסים לזהות זאת כ-comparator או multiplier. הקסם הוא ב-**XOR בין ביטים זוגיים** של הקלטים — סימן ברור של adder או של magnitude comparator. ה-OR שמקבץ AND-ים מבדל בין השניים.`,
        expectedAnswers: [
          '2-bit adder', '2 bit adder', 'two-bit adder',
          'מחבר 2-ביט', 'מחבר שני ביטים', 'מחבר 2 ביטים',
          'adder', 'מחבר',
          'ripple-carry adder', 'ripple carry',
          'half-adder', 'full-adder',
          'binary adder', 'הוספה', 'סכימה',
        ],
        circuit: () => build(() => {
          // Two FULLY INDEPENDENT adders, each with its own inputs
          // and outputs. The student manually sets the same A/B
          // values on both and verifies that the outputs match.
          //
          //   TOP HALF — gate-level 7-gate adder (the question's
          //              mystery circuit). Inputs: A0, B0, A1, B1.
          //              Outputs: S0, S1, S2.
          //
          //   BOTTOM HALF — reference adder built from HA + FA blocks.
          //              Inputs: A0', B0', A1', B1'.
          //              Outputs: S0', S1', S2'.

          // ============================================================
          // TOP HALF — gate-level adder (the "question" circuit)
          // ============================================================
          const a0 = h.input(80,  100, 'A0');  a0.fixedValue = 1;
          const b0 = h.input(80,  180, 'B0');  b0.fixedValue = 1;
          const a1 = h.input(80,  300, 'A1');  a1.fixedValue = 1;
          const b1 = h.input(80,  380, 'B1');  b1.fixedValue = 1;

          const xor1 = h.gate('XOR', 260, 140);
          const and1 = h.gate('AND', 260, 220);
          const xor2 = h.gate('XOR', 260, 320);
          const and2 = h.gate('AND', 260, 400);
          const xor3 = h.gate('XOR', 480, 280);
          const and3 = h.gate('AND', 480, 360);
          const or1  = h.gate('OR',  680, 380);

          const s0g = h.output(860, 140, 'S0');
          const s1g = h.output(860, 280, 'S1');
          const s2g = h.output(860, 380, 'S2');

          // ============================================================
          // BOTTOM HALF — reference adder using a SINGLE 2-bit FA
          // (the "answer" circuit). Distinct INPUT and OUTPUT pads so
          // the two circuits do NOT share any signals.
          //
          // To feed a 2-bit bus from individual 1-bit pads, we use
          // MERGE blocks (pure wiring, not arithmetic):
          //   { A0', A1' } → MERGE_A → A_bus(2-bit)
          //   { B0', B1' } → MERGE_B → B_bus(2-bit)
          // The single 2-bit FA then computes A_bus + B_bus + 0:
          //   FA.SUM(2-bit) → SPLIT → { S0', S1' }
          //   FA.COUT(1-bit) → S2'
          // ============================================================
          const a0r = h.input(80,  640, "A0'");  a0r.fixedValue = 1;
          const b0r = h.input(80,  720, "B0'");  b0r.fixedValue = 1;
          const a1r = h.input(80,  840, "A1'");  a1r.fixedValue = 1;
          const b1r = h.input(80,  920, "B1'");  b1r.fixedValue = 1;

          // 0-driver for Cin (just an unconnected INPUT default-0)
          const zeroIn = h.input(80, 1000, '0');
          zeroIn.fixedValue = 0;

          // MERGE A: inputs at slice 0:0 (A0') and 1:1 (A1') → 2-bit out
          const mergeA = h.block('MERGE', 320, 720, {
            slicesSpec: '0:0, 1:1',
            outBits: 2,
            label: 'MERGE',
          });
          // MERGE B: same shape for the B side
          const mergeB = h.block('MERGE', 320, 880, {
            slicesSpec: '0:0, 1:1',
            outBits: 2,
            label: 'MERGE',
          });

          // Single 2-bit Full Adder — replaces the entire HA + FA chain
          const faRef = h.fa(560, 800, 'FA 2-bit');
          faRef.bitWidth = 2;

          // SPLIT the 2-bit SUM back into S0' (bit 0) and S1' (bit 1)
          const splitS = h.block('SPLIT', 760, 760, {
            inBits: 2,
            slicesSpec: '0:0, 1:1',
            label: 'SPLIT',
          });

          const s0r = h.output(960, 740, "S0'");
          const s1r = h.output(960, 820, "S1'");
          const s2r = h.output(960, 900, "S2'");

          return {
            nodes: [
              // TOP — gate-level
              a0, b0, a1, b1,
              xor1, and1, xor2, and2, xor3, and3, or1,
              s0g, s1g, s2g,
              // BOTTOM — reference (1 FA + wiring helpers)
              a0r, b0r, a1r, b1r, zeroIn,
              mergeA, mergeB, faRef, splitS,
              s0r, s1r, s2r,
            ],
            wires: [
              // ===== TOP: gate-level wiring (own inputs only) =====
              h.wire(a0.id, xor1.id, 0),
              h.wire(b0.id, xor1.id, 1),
              h.wire(a0.id, and1.id, 0),
              h.wire(b0.id, and1.id, 1),
              h.wire(xor1.id, s0g.id, 0),
              h.wire(a1.id, xor2.id, 0),
              h.wire(b1.id, xor2.id, 1),
              h.wire(a1.id, and2.id, 0),
              h.wire(b1.id, and2.id, 1),
              h.wire(xor2.id, xor3.id, 0),
              h.wire(xor2.id, and3.id, 0),
              h.wire(and1.id, xor3.id, 1),
              h.wire(and1.id, and3.id, 1),
              h.wire(xor3.id, s1g.id, 0),
              h.wire(and2.id, or1.id, 0),
              h.wire(and3.id, or1.id, 1),
              h.wire(or1.id, s2g.id, 0),

              // ===== BOTTOM: reference (single 2-bit FA) =====
              // MERGE A: A0' → bit 0, A1' → bit 1
              h.wire(a0r.id, mergeA.id, 0),
              h.wire(a1r.id, mergeA.id, 1),
              // MERGE B: B0' → bit 0, B1' → bit 1
              h.wire(b0r.id, mergeB.id, 0),
              h.wire(b1r.id, mergeB.id, 1),
              // Feed FA: A_bus → A, B_bus → B, 0 → Cin
              h.wire(mergeA.id, faRef.id, 0),
              h.wire(mergeB.id, faRef.id, 1),
              h.wire(zeroIn.id, faRef.id, 2),
              // SPLIT the 2-bit SUM back out
              h.wire(faRef.id, splitS.id, 0, 0),            // FA.SUM(out0) → SPLIT.in
              h.wire(splitS.id, s0r.id, 0, 0),              // SPLIT.out0 → S0'
              h.wire(splitS.id, s1r.id, 0, 1),              // SPLIT.out1 → S1'
              // COUT direct
              h.wire(faRef.id, s2r.id, 0, 1),               // FA.COUT(out1) → S2'
            ],
          };
        }),
      },

      // ─────────────────────────────────────────────────────────
      // Part ב — Setup vs Hold time
      //   Classic timing question that follows naturally from
      //   the adder identification: now that we know what the
      //   circuit does, when can we sample its output safely?
      // ─────────────────────────────────────────────────────────
      {
        label: 'ב',
        question: '**הסבר מה זה setup-time ומה זה hold-time** של flip-flop. מה הם מבטיחים, ומה קורה אם מפרים אותם? מה הקשר של הזמנים האלה לתכנון הקריטיקל-פאת\' של המעגל הקודם (המחבר ה-2-ביט)?',
        answerSchematic: `
<svg viewBox="0 0 1100 720" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Timing diagram showing setup and hold windows around a clock edge.">

  <defs>
    <linearGradient id="suFill" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#cc66ff" stop-opacity="0"/>
      <stop offset="20%" stop-color="#cc66ff" stop-opacity="0.18"/>
      <stop offset="80%" stop-color="#cc66ff" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#cc66ff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="hldFill" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ff9050" stop-opacity="0"/>
      <stop offset="20%" stop-color="#ff9050" stop-opacity="0.22"/>
      <stop offset="80%" stop-color="#ff9050" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#ff9050" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- ============ HEADER ============ -->
  <text x="550" y="44" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    Setup / Hold — חלון "do not change" סביב קצה ה-clock
  </text>

  <!-- ============ WINDOW BANDS (background) ============ -->
  <!-- Setup band: x=440 → 560 (before edge), Hold band: x=560 → 640 (after edge) -->
  <rect x="440" y="80" width="120" height="380" fill="url(#suFill)" stroke="#cc66ff" stroke-width="1.4" stroke-dasharray="6,4" opacity="0.95"/>
  <rect x="560" y="80" width="80"  height="380" fill="url(#hldFill)" stroke="#ff9050" stroke-width="1.4" stroke-dasharray="6,4" opacity="0.95"/>

  <!-- ============ CLOCK EDGE INDICATOR ============ -->
  <line x1="560" y1="80" x2="560" y2="460" stroke="#ff6080" stroke-width="2.4" stroke-dasharray="4,4" opacity="0.85"/>
  <text x="560" y="74" text-anchor="middle" fill="#ff8080" font-weight="bold" font-size="20">↑ rising edge</text>

  <!-- ============ CLK waveform ============ -->
  <text x="50" y="158" fill="#cca040" font-size="24" font-weight="bold">CLK</text>
  <path d="M 130 175 L 260 175 L 260 130 L 390 130 L 390 175 L 560 175 L 560 130 L 720 130 L 720 175 L 880 175 L 880 130 L 1010 130 L 1010 175 L 1060 175"
        fill="none" stroke="#cca040" stroke-width="2.8" stroke-linejoin="miter"/>

  <!-- ============ D waveform ============ -->
  <text x="50" y="280" fill="#80f0a0" font-size="24" font-weight="bold">D</text>
  <!-- D path: LOW → HIGH (OK transition at x=210, far from edge) → LOW (FAIL at x=600, inside hold band) → HIGH (stable) -->
  <path d="M 130 300 L 210 300 L 210 260 L 600 260 L 600 300 L 1060 300"
        fill="none" stroke="#80f0a0" stroke-width="2.8" stroke-linejoin="miter"/>

  <!-- OK transition pill (above D, well outside the band) -->
  <rect x="180" y="216" width="180" height="30" rx="6" fill="rgba(128,240,160,0.15)" stroke="#80f0a0" stroke-width="1.4"/>
  <text x="270" y="237" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">OK — רחוק מ-edge ✓</text>

  <!-- FAIL transition pill (above D, inside hold band) -->
  <rect x="640" y="216" width="220" height="30" rx="6" fill="rgba(255,96,96,0.15)" stroke="#ff6060" stroke-width="1.6"/>
  <text x="750" y="237" text-anchor="middle" fill="#ff8080" font-size="18" font-weight="bold">FAIL — בתוך חלון hold ✗</text>

  <!-- Arrow from FAIL pill to the offending transition at x=600 -->
  <path d="M 640 234 Q 615 240, 605 256" stroke="#ff8080" stroke-width="1.6" fill="none" opacity="0.75"/>

  <!-- ============ Window labels (large, at the bottom of bands) ============ -->
  <text x="500" y="395" text-anchor="middle" fill="#cc99ff" font-size="20" font-weight="bold">setup</text>
  <text x="500" y="420" text-anchor="middle" fill="#cca0ff" font-size="24" font-weight="bold">t_su</text>

  <text x="600" y="395" text-anchor="middle" fill="#ff9050" font-size="20" font-weight="bold">hold</text>
  <text x="600" y="420" text-anchor="middle" fill="#ffb070" font-size="24" font-weight="bold">t_h</text>

  <!-- "do not change" banner under both bands -->
  <line x1="440" y1="475" x2="640" y2="475" stroke="#ffe080" stroke-width="3"/>
  <line x1="440" y1="468" x2="440" y2="482" stroke="#ffe080" stroke-width="3"/>
  <line x1="640" y1="468" x2="640" y2="482" stroke="#ffe080" stroke-width="3"/>
  <text x="540" y="505" text-anchor="middle" fill="#ffe080" font-size="20" font-weight="bold">"do not change"</text>

  <!-- ============ BOTTOM INFO CARDS (two side-by-side) ============ -->
  <!-- Setup violation card -->
  <rect x="40" y="540" width="510" height="160" rx="10"
        fill="rgba(204,102,255,0.06)" stroke="#cc66ff" stroke-width="1.8"/>
  <text x="295" y="572" text-anchor="middle" fill="#cc99ff" font-weight="bold" font-size="20">
    הפרת SETUP
  </text>
  <text x="60" y="606" fill="#c8b090" font-size="18">→ D מתחלף קרוב מדי <tspan font-weight="bold" fill="#cc99ff">לפני</tspan> ה-edge</text>
  <text x="60" y="632" fill="#c8b090" font-size="18">→ FF נכנס ל-<tspan fill="#ff8080" font-weight="bold">metastable</tspan> או לוכד ערך שגוי</text>
  <text x="60" y="668" fill="#80f0a0" font-size="18" font-weight="bold">
    T_clk ≥ t_clk-q + T_path + t_su
  </text>
  <text x="60" y="688" fill="#a0a0c0" font-size="18" font-style="italic">
    (קובע את ה-Fmax)
  </text>

  <!-- Hold violation card -->
  <rect x="570" y="540" width="490" height="160" rx="10"
        fill="rgba(255,144,80,0.06)" stroke="#ff9050" stroke-width="1.8"/>
  <text x="815" y="572" text-anchor="middle" fill="#ff9050" font-weight="bold" font-size="20">
    הפרת HOLD
  </text>
  <text x="590" y="606" fill="#c8b090" font-size="18">→ D מתחלף קרוב מדי <tspan font-weight="bold" fill="#ff9050">אחרי</tspan> ה-edge</text>
  <text x="590" y="632" fill="#c8b090" font-size="18">→ <tspan fill="#ff8080" font-weight="bold">race</tspan>: ערך חדש דחף את הישן לפני הלכידה</text>
  <text x="590" y="668" fill="#80f0a0" font-size="18" font-weight="bold">
    T_path ≥ t_h − t_clk-q
  </text>
  <text x="590" y="688" fill="#a0a0c0" font-size="18" font-style="italic">
    (לא תלוי ב-T_clk — הוספת buffers מסייעת)
  </text>
</svg>`,
        hints: [
          'שני המספרים האלה הם **תנאים על קלט ה-D של ה-FF סביב קצה ה-clock** — לא על השעון עצמו ולא על Q.',
          '\`t_setup\` הוא זמן **לפני** קצה השעון העולה: D חייב להיות יציב כבר אז.',
          '\`t_hold\` הוא זמן **אחרי** קצה השעון העולה: D חייב להישאר יציב עוד קצת.',
          'יחד הם יוצרים "אזור סכנה" סביב קצה ה-clock — חלון שבו D לא יכול לזוז.',
          'הפרה של setup → ה-FF לוכד ערך שגוי או נכנס למצב **metastable** (לא 0 ולא 1).',
          'הפרה של hold → "race" — ערך חדש דחף את הישן לפני ש-FF הספיק ללכוד.',
          'במחבר 2-ביט: ה-critical path הוא A0/B0 → AND1 → C1 → AND3 → OR1 → S2. אם ה-FF במורד הזרם דורש t_setup, צריך \`T_clock ≥ T_path + t_setup + t_clk-q\`.',
        ],
        answer:
`### Setup time (\`t_su\` או \`t_setup\`)

זמן **מינימלי לפני** קצה השעון העולה שבו ה-D של ה-FF חייב להיות **יציב** (לא משתנה). אם D מתחלף בתוך החלון הזה, ה-FF לא מצליח לדגום אותו אמין → **metastability** או ערך שגוי.

טיפוסי בתהליכים מודרניים: \`50-200 ps\`.

### Hold time (\`t_h\` או \`t_hold\`)

זמן **מינימלי אחרי** קצה השעון העולה שבו D חייב **להישאר יציב**. כלומר, גם אחרי שה-FF "תפס" את הערך, צריך לתת לו עוד כמה ps לסיים את הלכידה הפנימית לפני ש-D מותר להתחלף.

טיפוסי: \`10-100 ps\` — לרוב **קצר יותר** מ-setup.

### אזור הסכנה — חלון "do not change"

לאורך החלון \`[edge − t_setup, edge + t_hold]\` סביב קצה ה-clock, D חייב להישאר **קבוע**. מחוץ לחלון — חופשי להתחלף.

| תחום | משך | דרישה על D |
|---|:---:|---|
| לפני ה-edge | \`t_setup\` | D יציב — בלי שינויים |
| **edge עצמו** | רגע | ה-FF דוגם |
| אחרי ה-edge | \`t_hold\` | D עוד יציב — לא שינוי |

→ ראה את הדיאגרמה הצבעונית בראש דף התשובה.

### מה קורה כשמפרים?

| הפרה | סיבה | תוצאה |
|---|---|---|
| **setup violation** | D מתחלף קרוב מדי לפני edge | FF דוגם ערך לא יציב; יכול להיכנס ל-**metastable state** שלוקח לו ms-ns להתייצב |
| **hold violation** | D מתחלף קרוב מדי אחרי edge | "race" — ה-comb logic דחף ערך חדש שעקף את ה-FF לפני שלכד; FF לוכד את החדש במקום הישן |

### הקשר ל-critical path של המחבר

נניח ש-\`S2\` מהמחבר מזין FF במורד הזרם. נתיב הפצה: \`A0 → AND1 → C1 → AND3 → OR1 → S2 → FF.D\`. נדרש:

\`\`\`
T_clock ≥ T_clk-q (של FF המקור) + T_path (גייטים) + t_setup (של FF היעד)
\`\`\`

עבור 5 גייטים × ~80ps + t_clk-q (~30ps) + t_setup (~100ps) ≈ \`530ps\`. ה-clock חייב להיות **לפחות 530ps period** — כלומר Fmax ~ 1.9 GHz. אם רוצים מהיר יותר, חייבים לקצר את הנתיב (carry-lookahead במקום ripple).

הפרה של **hold** בדרך-כלל פחות תלויה ב-clock period ויותר ב-\`t_clk-q\` של ה-FF המקור: אם הוא מהיר מדי, הוא ידחוף את ה-FF היעד לפני שזה הספיק לסיים.

### בקנבס

הקנבס מציג **D-FF מקור + buffer + D-FF יעד** עם clock משותף. תוכל להפעיל את ה-clock ולשנות את D, אבל חשוב: **המנוע אינו מדמה sub-cycle timing**, כלומר אי-אפשר "להפר setup/hold" בסימולציה. הוא מטפל בכל cycle אטומית. השרטוט והתשובה מתארים את הקונספט; ATE אמיתי או STA tool הוא מי שמודד את הזמנים האלה בפועל.`,
        interviewerMindset:
`**שאלה קלאסית** בראיון timing. המראיין מחפש:
1. **שאתה מבחין בין setup ל-hold** — שניהם תנאי על D סביב edge, אבל בכיוונים שונים.
2. **שאתה זוכר מה קורה בהפרה** — metastability ל-setup, race ל-hold. הזכרת "metastable" היא חובה.
3. **שאתה מקשר ל-Fmax** — setup קובע את ה-clock period המינימלי. זה ה"למה" של STA.
4. **שאתה יודע ש-hold עצמאי מ-clock period** — אפילו clock איטי יכול לפסול hold אם ה-comb path קצר מדי.

**שאלת המשך נפוצה**: "מה דרכי הפתרון להפרת setup?" → קצר את הנתיב (pipeline, less logic levels), השתמש ב-faster cells, או הורד את ה-Fmax.

**שאלת המשך**: "מה דרכי הפתרון להפרת hold?" → הוסף **buffers** ל-comb path (delay padding) או החלף את ה-FF המקור ל-FF איטי יותר. **אסור** לשנות clock כי זה לא יעזור.

**שאלת bonus**: "מה זה clock skew ואיך הוא משתלב?" → clock skew הוא ההפרש בזמן הגעת clock לשני FFs שונים. אם ה-FF היעד מקבל clock מאוחר יותר (positive skew), זה למעשה **עוזר** ל-setup אבל **פוגע** ל-hold. אם מוקדם יותר (negative skew), הפוך.

**שאלת bonus 2**: "מה החלק בלוגיקה שגורם הכי הרבה ל-setup violations?" → נתיבים ארוכים עם הרבה שכבות לוגיקה (deep combinational). פתרון: pipelining — שובר נתיב ארוך ל-2 stages עם FF באמצע, כל אחד עם פחות עומק.`,
        expectedAnswers: [
          'setup', 'setup time', 't_su', 't_setup',
          'hold', 'hold time', 't_h', 't_hold',
          'metastable', 'metastability', 'מטא-יציבות',
          'before', 'after', 'לפני', 'אחרי',
          'stable', 'יציב',
          'critical path', 'fmax', 'clock period',
          'race', 'do not change', 'window', 'חלון',
        ],
        circuit: () => build(() => {
          // Two D-FFs connected via a small comb path (a buffer pair).
          // Both share the same clock. This is the canonical setup/hold
          // analysis topology — student can see the timing path
          // visualised. Sub-cycle timing isn't simulated (engine is
          // atomic per cycle), so the live circuit is a structural
          // aid only.
          const clk    = h.clock(80,  340, 'CLK');
          const dIn    = h.input(80,  140, 'D');  dIn.fixedValue = 1;
          const ffSrc  = h.ffD(260, 140, 'FF source');
          const inv1   = h.gate('NOT', 460, 140);
          const inv2   = h.gate('NOT', 600, 140);
          const ffDst  = h.ffD(760, 140, 'FF dest');
          const qOut   = h.output(960, 140, 'Q dest');
          const qSrc   = h.output(380, 60,  'Q source');

          return {
            nodes: [clk, dIn, ffSrc, inv1, inv2, ffDst, qOut, qSrc],
            wires: [
              h.wire(dIn.id,   ffSrc.id, 0),                      // D → FF_src.D
              h.wire(clk.id,   ffSrc.id, 1, 0, { isClockWire: true }),
              h.wire(ffSrc.id, inv1.id,  0),                      // FF_src.Q → INV
              h.wire(ffSrc.id, qSrc.id,  0),                      // observation
              h.wire(inv1.id,  inv2.id,  0),                      // INV → INV (= buffer)
              h.wire(inv2.id,  ffDst.id, 0),                      // → FF_dst.D
              h.wire(clk.id,   ffDst.id, 1, 0, { isClockWire: true }),
              h.wire(ffDst.id, qOut.id,  0),                      // FF_dst.Q → out
            ],
          };
        }),
      },

      // ─────────────────────────────────────────────────────────
      // Part ג — Path delay analysis on the 2-bit gate-level adder
      //
      // Given gate delays:  AND = 120 ps  ·  OR = 100 ps  ·  XOR = 150 ps
      //
      // Enumerate every input→output path and identify:
      //   • critical path (longest)  — limits setup / Fmax
      //   • shortest path            — risks hold violations
      // ─────────────────────────────────────────────────────────
      {
        label: 'ג',
        question:
`נתונים זמני ההפצה (propagation delays) של רכיבי המעגל מסעיף א':

| רכיב | delay (ps) |
|:---:|:---:|
| AND | 120 |
| OR  | 100 |
| XOR | 150 |

מהם **שני המסלולים הקריטיים** במעגל — אחד שקובע את הגבול ל-**setup violation** ואחד שקובע את הגבול ל-**hold violation**? לכל מסלול: רשום את הקלט שממנו הוא מתחיל, את השערים שהוא חוצה לפי הסדר, ואת ה-delay הכולל.`,
        hints: [
          'התחל מהמעגל של סעיף א\': 7 שערים מסודרים ב-3 שלבים — XOR1/AND1 (HA bit 0), XOR2/AND2 (FA bit 1 stage 1), XOR3/AND3/OR1 (FA bit 1 stage 2).',
          'עבור כל קלט, **עקוב לכל היציאות הסופיות** — ייתכן שאותו קלט מגיע ליציאות שונות דרך מסלולים שונים.',
          'S0 = XOR1.out → רק שער אחד מקלט A0/B0.',
          'S1 = XOR3.out → שני מסלולים מצטרפים: דרך XOR2 (מ-A1/B1) או דרך AND1 (מ-A0/B0).',
          'S2 = OR1.out → שני מסלולים: ה"קצר" דרך AND2, וה"ארוך" דרך XOR2/AND1 + AND3.',
          'Setup constraint: \`T_clk ≥ t_clk-q + T_longest_path + t_su\` — תופס את הנתיב הארוך ביותר.',
          'Hold constraint: \`T_shortest_path ≥ t_h − t_clk-q\` — תופס את הנתיב הקצר ביותר. נתיב קצר מדי = race.',
        ],
        answer:
`### כל 12 המסלולים

| יעד | קלטים | שערים בנתיב | delay |
|---|---|---|---:|
| **S0** | A0, B0 | XOR1 | **150 ps** ← קצר ביותר |
| S1 | A0, B0 | AND1 → XOR3 | 120 + 150 = 270 ps |
| S1 | A1, B1 | XOR2 → XOR3 | 150 + 150 = 300 ps |
| S2 | A1, B1 | AND2 → OR1 | 120 + 100 = 220 ps |
| S2 | A0, B0 | AND1 → AND3 → OR1 | 120 + 120 + 100 = 340 ps |
| **S2** | A1, B1 | XOR2 → AND3 → OR1 | 150 + 120 + 100 = **370 ps** ← ארוך ביותר |

(לכל שורה יש 2 מסלולים — אחד מ-A ואחד מ-B; ה-delay זהה.)

### Critical path (setup) — **370 ps**

**\`A1 / B1 → XOR2 → AND3 → OR1 → S2\`** — 3 שערים, ושני שערים יקרים (XOR + AND).

נוסחת ה-setup:
\`\`\`
T_clk ≥ t_clk-q + 370 + t_su
\`\`\`

עם \`t_clk-q = 30 ps\` ו-\`t_su = 50 ps\`:
\`\`\`
T_clk ≥ 30 + 370 + 50 = 450 ps   ⇒   Fmax ≈ 2.22 GHz
\`\`\`

### Shortest path (hold) — **150 ps**

**\`A0 / B0 → XOR1 → S0\`** — שער יחיד.

נוסחת ה-hold:
\`\`\`
T_shortest ≥ t_h − t_clk-q
\`\`\`

עם \`t_h = 40 ps\` ו-\`t_clk-q = 30 ps\`:
\`\`\`
150 ≥ 40 − 30 = 10 ps   ✓ (הפרש של 140 ps — בטוח מאוד)
\`\`\`

### תובנות

**Setup מתוח, hold רגוע.** במעגל הזה ה-shortest path הוא **15× יותר** מסף ה-hold — אין שום סיכון של race. ה-bottleneck האמיתי הוא ה-critical path של 370 ps.

> מה עושים אם תקציב ה-setup הקיים לא מספיק ל-370 ps? ומה אם ה-\`t_hold\` היה דורש מסלול קצר ארוך יותר מ-150 ps? נמשיך בסעיפים הבאים.`,
        interviewerMindset:
`**שאלת timing analysis אמיתית.** המראיין מחפש:
1. **שאתה לא קופץ ל-critical path** — מציג קודם את **כל** המסלולים בטבלה. הזיהוי של הקריטי הוא תוצאה, לא נחישות.
2. **שאתה זוכר שיש 2 מסלולים מאוחרים לאותה יציאה** — S2 דרך \`AND2 → OR1\` (220 ps) **ולא** דרך \`XOR2 → AND3 → OR1\` (370 ps). הסטודנט שטועה לבחור 220 כקריטי מפספס.
3. **שאתה מבחין ש-S1 יש שני נתיבים מצטרפים** ושה-arrival time של ה-FF מוגדר ע"י הארוך מבין השניים (max(270, 300) = 300).
4. **שאתה זוכר את ה-shortest path להמשך** — לא רק "critical path" כפי שמועמדים זוכרים, אלא גם "shortest path" שתופס hold.

**שאלת המשך נפוצה**: "מה ה-Fmax?" → חישוב מספרי קונקרטי לפי הנוסחה. הסטודנט שאומר "תלוי בכמה" נכשל.

**שאלת bonus**: "האם יש כאן glitching potential?" → כן, ב-OR1 ל-S2: שני קלטיו (G=AND2.out ו-AND3.out) מגיעים בזמנים שונים (220 ps ו-370 ps). באמצע יש "transient" של 150 ps שעלול לייצר false 1 לפני שה-OR מתייצב. זה הופך גם ל-glitch power וגם ל-functional hazard. פתרון: hazard-free encoding או observation רק ב-clock edge הבא.

**שאלת bonus 2**: "איך משפיע על power?" → ה-XOR-ים הם 50% יותר יקרים מ-AND-ים (150 vs 120). ב-deep pipeline הם הופכים לצוואר; טכניקות כמו **double-NAND לוגיקה** או **transmission-gate XOR** משמשות כדי לחתוך.`,
        expectedAnswers: [
          '370', '370 ps', '370ps',
          '150', '150 ps', '150ps',
          'XOR2', 'AND3', 'OR1', 'XOR1',
          'critical path', 'shortest path',
          'A1', 'B1', 'A0', 'B0', 'S0', 'S2',
          '12', '6',
          'setup', 'hold',
          'fmax', '2.22',
        ],
        answerSchematic: `
<svg viewBox="0 0 1140 1520" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Circuit with the two critical paths coloured (SETUP red, HOLD green) at the top; Gantt-style chart of all 6 unique paths at the bottom.">

  <!-- ═══════════════════════════════════════════════════════════
       SECTION 1 — Circuit diagram with the two critical paths
                   colored on the actual gates (top half).
       ═══════════════════════════════════════════════════════════ -->

  <text x="570" y="44" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    המעגל עם שני המסלולים הקריטיים
  </text>

  <!-- Legend pills (centered) -->
  <rect x="160" y="68" width="370" height="34" rx="8" fill="rgba(255,96,96,0.14)" stroke="#ff6060" stroke-width="1.8"/>
  <circle cx="186" cy="85" r="8" fill="#ff6060"/>
  <text x="206" y="91" fill="#ff8080" font-size="18" font-weight="bold">SETUP critical — נתיב הארוך ביותר</text>

  <rect x="610" y="68" width="370" height="34" rx="8" fill="rgba(128,240,160,0.14)" stroke="#80f0a0" stroke-width="1.8"/>
  <circle cx="636" cy="85" r="8" fill="#80f0a0"/>
  <text x="656" y="91" fill="#80f0a0" font-size="18" font-weight="bold">HOLD critical — נתיב הקצר ביותר</text>

  <!-- ════════ INPUTS (left) ════════ -->
  <g font-size="20" font-weight="bold">
    <circle cx="60" cy="170" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="60" y="176" text-anchor="middle" fill="#cca040">A0</text>
    <circle cx="60" cy="230" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="60" y="236" text-anchor="middle" fill="#cca040">B0</text>
    <circle cx="60" cy="380" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="60" y="386" text-anchor="middle" fill="#cca040">A1</text>
    <circle cx="60" cy="440" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="60" y="446" text-anchor="middle" fill="#cca040">B1</text>
  </g>

  <!-- ════════ SETUP critical path (red, drawn FIRST so gates sit on top) ════════
       A1 (78,380) → XOR2.in0 (280,372) → XOR2.out (340,380) →
       AND3.in0 (530,412) → AND3.out (590,420) → OR1.in1 (740,448) →
       OR1.out (810,440) → S2 (882,440)                                    -->
  <g stroke="#ff6060" stroke-width="5" fill="none" opacity="0.65">
    <path d="M 78 380 L 240 380 L 240 372 L 280 372"/>
    <path d="M 340 380 L 390 380 L 390 412 L 530 412"/>
    <path d="M 590 420 L 700 420 L 700 448 L 740 448"/>
    <path d="M 810 440 L 882 440"/>
  </g>

  <!-- ════════ HOLD critical path (green, also drawn first) ════════
       A0 (78,170) → XOR1.in0 (280,162) → XOR1.out (340,170) → S0 (882,170) -->
  <g stroke="#80f0a0" stroke-width="5" fill="none" opacity="0.65">
    <path d="M 78 170 L 240 170 L 240 162 L 280 162"/>
    <path d="M 340 170 L 882 170"/>
  </g>

  <!-- ════════ Non-critical wires (thin grey) ════════ -->
  <g stroke="#5a6e80" stroke-width="1.6" fill="none">
    <!-- B0 → XOR1.in1 -->
    <path d="M 78 230 L 220 230 L 220 178 L 280 178"/>
    <!-- A0 → AND1.in0 (branch off A0 trunk) -->
    <path d="M 240 170 L 240 222 L 280 222"/>
    <circle cx="240" cy="170" r="4" fill="#5a6e80"/>
    <!-- B0 → AND1.in1 (branch off B0 trunk) -->
    <path d="M 220 230 L 220 238 L 280 238"/>
    <circle cx="220" cy="230" r="4" fill="#5a6e80"/>
    <!-- B1 → XOR2.in1 -->
    <path d="M 78 440 L 220 440 L 220 388 L 280 388"/>
    <!-- A1 → AND2.in0 (branch off A1 trunk that the SETUP path uses) -->
    <path d="M 240 380 L 240 432 L 280 432"/>
    <!-- B1 → AND2.in1 (branch off B1 trunk) -->
    <path d="M 220 440 L 220 448 L 280 448"/>
    <circle cx="220" cy="440" r="4" fill="#5a6e80"/>
    <!-- AND1.out → XOR3.in1 -->
    <path d="M 340 230 L 430 230 L 430 308 L 530 308"/>
    <!-- AND1.out fans down to AND3.in1 -->
    <path d="M 430 230 L 430 428 L 530 428"/>
    <circle cx="430" cy="308" r="4" fill="#5a6e80"/>
    <!-- XOR2.out → XOR3.in0 (branches off the red trunk at (390,380)) -->
    <path d="M 390 380 L 390 292 L 530 292"/>
    <!-- AND2.out → OR1.in0 -->
    <path d="M 340 440 L 710 440 L 710 432 L 740 432"/>
    <!-- XOR3.out → S1 -->
    <path d="M 590 300 L 882 300"/>
  </g>

  <!-- Branch dots on the red trunk where SETUP-path and non-critical wires meet -->
  <circle cx="240" cy="380" r="4" fill="#ff6060"/>
  <circle cx="390" cy="380" r="4" fill="#ff6060"/>

  <!-- ════════ GATES (drawn on top of paths) ════════ -->
  <!-- XOR1 (HOLD path goes through this) -->
  <g>
    <path d="M 280 145 Q 305 170, 280 195 L 310 195 Q 335 195, 350 170 Q 335 145, 310 145 Z"
          fill="#1a3a2a" stroke="#80f0a0" stroke-width="2.2"/>
    <text x="318" y="166" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">XOR1</text>
    <text x="318" y="182" text-anchor="middle" fill="#a0c0d0" font-size="16">150 ps</text>
  </g>
  <!-- AND1 -->
  <g>
    <path d="M 280 205 L 310 205 A 25 25 0 0 1 310 255 L 280 255 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="298" y="226" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">AND1</text>
    <text x="298" y="242" text-anchor="middle" fill="#a0c0d0" font-size="16">120 ps</text>
  </g>
  <!-- XOR2 (SETUP path goes through this) -->
  <g>
    <path d="M 280 355 Q 305 380, 280 405 L 310 405 Q 335 405, 350 380 Q 335 355, 310 355 Z"
          fill="#1a3a2a" stroke="#80f0a0" stroke-width="2.2"/>
    <text x="318" y="376" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">XOR2</text>
    <text x="318" y="392" text-anchor="middle" fill="#a0c0d0" font-size="16">150 ps</text>
  </g>
  <!-- AND2 -->
  <g>
    <path d="M 280 415 L 310 415 A 25 25 0 0 1 310 465 L 280 465 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="298" y="436" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">AND2</text>
    <text x="298" y="452" text-anchor="middle" fill="#a0c0d0" font-size="16">120 ps</text>
  </g>
  <!-- XOR3 -->
  <g>
    <path d="M 530 275 Q 555 300, 530 325 L 560 325 Q 585 325, 600 300 Q 585 275, 560 275 Z"
          fill="#1a3a2a" stroke="#80f0a0" stroke-width="2.2"/>
    <text x="568" y="296" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">XOR3</text>
    <text x="568" y="312" text-anchor="middle" fill="#a0c0d0" font-size="16">150 ps</text>
  </g>
  <!-- AND3 (SETUP path goes through this) -->
  <g>
    <path d="M 530 395 L 560 395 A 25 25 0 0 1 560 445 L 530 445 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="548" y="416" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">AND3</text>
    <text x="548" y="432" text-anchor="middle" fill="#a0c0d0" font-size="16">120 ps</text>
  </g>
  <!-- OR1 (SETUP path goes through this) -->
  <g>
    <path d="M 740 415 L 770 415 Q 810 415, 820 440 Q 810 465, 770 465 L 740 465 Q 760 440, 740 415 Z"
          fill="#3a2a14" stroke="#ffc080" stroke-width="2.2"/>
    <text x="780" y="436" text-anchor="middle" fill="#ffc080" font-size="18" font-weight="bold">OR1</text>
    <text x="780" y="452" text-anchor="middle" fill="#a0c0d0" font-size="16">100 ps</text>
  </g>

  <!-- ════════ OUTPUTS (right) ════════ -->
  <g font-size="20" font-weight="bold">
    <circle cx="900" cy="170" r="22" fill="#0a1825" stroke="#80f0a0" stroke-width="2.8"/>
    <text x="900" y="176" text-anchor="middle" fill="#80f0a0">S0</text>
    <circle cx="900" cy="300" r="20" fill="#0a1825" stroke="#ff9933" stroke-width="2.2"/>
    <text x="900" y="306" text-anchor="middle" fill="#ff9933">S1</text>
    <circle cx="900" cy="440" r="22" fill="#0a1825" stroke="#ff6060" stroke-width="2.8"/>
    <text x="900" y="446" text-anchor="middle" fill="#ff6060">S2</text>
  </g>

  <!-- ════════ Path-end badges ════════ -->
  <!-- HOLD badge near S0 -->
  <rect x="950" y="140" width="170" height="60" rx="8" fill="rgba(128,240,160,0.14)" stroke="#80f0a0" stroke-width="1.8"/>
  <text x="1035" y="163" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="18">HOLD critical</text>
  <text x="1035" y="186" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="20">150 ps</text>

  <!-- SETUP badge near S2 -->
  <rect x="950" y="410" width="170" height="60" rx="8" fill="rgba(255,96,96,0.14)" stroke="#ff6060" stroke-width="1.8"/>
  <text x="1035" y="433" text-anchor="middle" fill="#ff8080" font-weight="bold" font-size="18">SETUP critical</text>
  <text x="1035" y="456" text-anchor="middle" fill="#ff8080" font-weight="bold" font-size="20">370 ps</text>

  <!-- ════════ Path-description labels ════════ -->
  <text x="570" y="525" text-anchor="middle" fill="#ff8080" font-size="18" font-weight="bold">
    SETUP:  A1/B1 → XOR2 → AND3 → OR1 → S2  =  150 + 120 + 100 ps
  </text>
  <text x="570" y="548" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">
    HOLD:   A0/B0 → XOR1 → S0  =  150 ps
  </text>

  <!-- ════════ Section divider ════════ -->
  <line x1="40" y1="580" x2="1100" y2="580" stroke="#3a4a5a" stroke-width="1.2" stroke-dasharray="6,4"/>

  <!-- ═══════════════════════════════════════════════════════════
       SECTION 2 — Gantt chart of all 6 unique paths
                   (shifted down by 600px via <g transform>)
       ═══════════════════════════════════════════════════════════ -->
  <g transform="translate(0, 600)">

  <text x="570" y="44" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    כל 6 המסלולים הייחודיים — Gantt of gate delays
  </text>
  <text x="570" y="72" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">
    AND 120 ps · OR 100 ps · XOR 150 ps    ·    Scale: 1 ps = 1.5 px
  </text>

  <!-- =========== LEGEND (color key) =========== -->
  <g transform="translate(60, 100)">
    <rect x="0" y="0" width="30" height="22" rx="3" fill="rgba(128,200,255,0.4)" stroke="#80c8ff" stroke-width="1.4"/>
    <text x="40" y="16" fill="#80c8ff" font-size="18" font-weight="bold">AND (120 ps)</text>
    <rect x="200" y="0" width="30" height="22" rx="3" fill="rgba(128,240,160,0.4)" stroke="#80f0a0" stroke-width="1.4"/>
    <text x="240" y="16" fill="#80f0a0" font-size="18" font-weight="bold">XOR (150 ps)</text>
    <rect x="400" y="0" width="30" height="22" rx="3" fill="rgba(255,192,128,0.45)" stroke="#ffc080" stroke-width="1.4"/>
    <text x="440" y="16" fill="#ffc080" font-size="18" font-weight="bold">OR (100 ps)</text>
  </g>

  <!-- =========== Column headers =========== -->
  <text x="60" y="172"  fill="#a0a0c0" font-size="18" font-weight="bold">קלטים</text>
  <text x="190" y="172" fill="#a0a0c0" font-size="18" font-weight="bold">יעד</text>
  <text x="280" y="172" fill="#a0a0c0" font-size="18" font-weight="bold">שערים בנתיב (רוחב = delay)</text>
  <text x="940" y="172" fill="#a0a0c0" font-size="18" font-weight="bold">סה"כ</text>
  <line x1="50" y1="180" x2="1100" y2="180" stroke="#3a4a5a" stroke-width="1.2"/>

  <!-- =========== Path bars (sorted ascending by delay) =========== -->
  ${(() => {
    const C = { AND: { fill: 'rgba(128,200,255,0.4)', stroke: '#80c8ff', txt: '#c0e0ff' },
                XOR: { fill: 'rgba(128,240,160,0.4)', stroke: '#80f0a0', txt: '#a0f0c0' },
                OR:  { fill: 'rgba(255,192,128,0.45)', stroke: '#ffc080', txt: '#ffd8a8' } };
    const paths = [
      { src: 'A0 / B0', dst: 'S0', gates: [['XOR1', 'XOR', 150]],                                            total: 150, tag: 'shortest' },
      { src: 'A1 / B1', dst: 'S2', gates: [['AND2', 'AND', 120], ['OR1', 'OR', 100]],                        total: 220, tag: null },
      { src: 'A0 / B0', dst: 'S1', gates: [['AND1', 'AND', 120], ['XOR3', 'XOR', 150]],                      total: 270, tag: null },
      { src: 'A1 / B1', dst: 'S1', gates: [['XOR2', 'XOR', 150], ['XOR3', 'XOR', 150]],                      total: 300, tag: null },
      { src: 'A0 / B0', dst: 'S2', gates: [['AND1', 'AND', 120], ['AND3', 'AND', 120], ['OR1', 'OR', 100]],  total: 340, tag: null },
      { src: 'A1 / B1', dst: 'S2', gates: [['XOR2', 'XOR', 150], ['AND3', 'AND', 120], ['OR1', 'OR', 100]],  total: 370, tag: 'critical' },
    ];
    const ROW_H = 64;
    const BAR_H = 42;
    const Y0 = 196;
    const X0 = 280;
    const PX_PER_PS = 1.5;
    return paths.map((p, i) => {
      const y = Y0 + i * ROW_H;
      const barY = y + (ROW_H - BAR_H) / 2 - 6;
      let cursorX = X0;
      const segs = p.gates.map(([name, kind, ms]) => {
        const w = ms * PX_PER_PS;
        const col = C[kind];
        const seg = `<rect x="${cursorX}" y="${barY}" width="${w}" height="${BAR_H}" rx="4" fill="${col.fill}" stroke="${col.stroke}" stroke-width="1.8"/>
          <text x="${cursorX + w / 2}" y="${barY + 20}" text-anchor="middle" fill="${col.txt}" font-size="18" font-weight="bold">${name}</text>
          <text x="${cursorX + w / 2}" y="${barY + 36}" text-anchor="middle" fill="${col.txt}" font-size="16">${ms} ps</text>`;
        cursorX += w + 3;
        return seg;
      }).join('');
      // Tag badge
      let badge = '';
      if (p.tag === 'shortest') {
        badge = `<rect x="990" y="${barY + 5}" width="110" height="32" rx="6" fill="rgba(128,240,160,0.18)" stroke="#80f0a0" stroke-width="1.6"/>
                 <text x="1045" y="${barY + 26}" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="18">✓ shortest</text>`;
      } else if (p.tag === 'critical') {
        badge = `<rect x="990" y="${barY + 5}" width="110" height="32" rx="6" fill="rgba(255,96,96,0.18)" stroke="#ff6060" stroke-width="1.6"/>
                 <text x="1045" y="${barY + 26}" text-anchor="middle" fill="#ff8080" font-weight="bold" font-size="18">✗ critical</text>`;
      }
      const totalColor = p.tag === 'shortest' ? '#80f0a0' : (p.tag === 'critical' ? '#ff8080' : '#ffc890');
      return `<text x="60" y="${barY + 26}" fill="#cca040" font-size="18" font-weight="bold">${p.src}</text>
        <text x="190" y="${barY + 26}" fill="#ff9933" font-size="20" font-weight="bold">→ ${p.dst}</text>
        ${segs}
        <text x="935" y="${barY + 26}" text-anchor="end" fill="${totalColor}" font-size="20" font-weight="bold">${p.total} ps</text>
        ${badge}`;
    }).join('');
  })()}

  <!-- =========== SUMMARY box =========== -->
  <rect x="40" y="610" width="1060" height="280" rx="10" fill="rgba(64,80,100,0.06)" stroke="#3a4a5a" stroke-width="1.4"/>
  <text x="570" y="654" text-anchor="middle" fill="#ffc890" font-weight="bold" font-size="24">
    סיכום timing
  </text>

  <!-- Setup card -->
  <rect x="70" y="686" width="490" height="180" rx="8" fill="rgba(255,96,96,0.05)" stroke="rgba(255,96,96,0.5)" stroke-width="1.6"/>
  <text x="315" y="718" text-anchor="middle" fill="#ff8080" font-weight="bold" font-size="24">Critical path (setup)</text>
  <text x="90" y="754" fill="#c8b090" font-size="20">A1/B1 → XOR2 → AND3 → OR1 → S2 = <tspan fill="#ff8080" font-weight="bold">370 ps</tspan></text>
  <text x="90" y="788" fill="#80f0a0" font-size="20" font-weight="bold">T_clk ≥ t_clk-q + 370 + t_su</text>
  <text x="90" y="822" fill="#a0a0c0" font-size="18" font-style="italic">→ ~450 ps → Fmax ≈ 2.22 GHz</text>

  <!-- Hold card -->
  <rect x="580" y="686" width="490" height="180" rx="8" fill="rgba(128,240,160,0.05)" stroke="rgba(128,240,160,0.5)" stroke-width="1.6"/>
  <text x="825" y="718" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="24">Shortest path (hold)</text>
  <text x="600" y="754" fill="#c8b090" font-size="20">A0/B0 → XOR1 → S0 = <tspan fill="#80f0a0" font-weight="bold">150 ps</tspan></text>
  <text x="600" y="788" fill="#80f0a0" font-size="20" font-weight="bold">T_shortest ≥ t_h − t_clk-q</text>
  <text x="600" y="822" fill="#a0a0c0" font-size="18" font-style="italic">→ 150 ≥ 10 ps ✓ (בטוח מאוד)</text>

  </g><!-- end translate(0, 600) wrapper -->
</svg>`,
        circuit: () => build(() => {
          // Focused circuit for part ג: just the 7-gate adder (no
          // reference 2-bit FA). The student plays here while tracing
          // paths and verifying the delays from the answer.
          const a0 = h.input(80,  100, 'A0');  a0.fixedValue = 1;
          const b0 = h.input(80,  180, 'B0');  b0.fixedValue = 1;
          const a1 = h.input(80,  300, 'A1');  a1.fixedValue = 1;
          const b1 = h.input(80,  380, 'B1');  b1.fixedValue = 1;

          const xor1 = h.gate('XOR', 260, 140);
          const and1 = h.gate('AND', 260, 220);
          const xor2 = h.gate('XOR', 260, 320);
          const and2 = h.gate('AND', 260, 400);
          const xor3 = h.gate('XOR', 480, 280);
          const and3 = h.gate('AND', 480, 360);
          const or1  = h.gate('OR',  680, 380);

          const s0Out = h.output(860, 140, 'S0');
          const s1Out = h.output(860, 280, 'S1');
          const s2Out = h.output(860, 380, 'S2');

          return {
            nodes: [a0, b0, a1, b1, xor1, and1, xor2, and2, xor3, and3, or1, s0Out, s1Out, s2Out],
            wires: [
              h.wire(a0.id, xor1.id, 0),
              h.wire(b0.id, xor1.id, 1),
              h.wire(a0.id, and1.id, 0),
              h.wire(b0.id, and1.id, 1),
              h.wire(xor1.id, s0Out.id, 0),
              h.wire(a1.id, xor2.id, 0),
              h.wire(b1.id, xor2.id, 1),
              h.wire(a1.id, and2.id, 0),
              h.wire(b1.id, and2.id, 1),
              h.wire(xor2.id, xor3.id, 0),
              h.wire(xor2.id, and3.id, 0),
              h.wire(and1.id, xor3.id, 1),
              h.wire(and1.id, and3.id, 1),
              h.wire(xor3.id, s1Out.id, 0),
              h.wire(and2.id, or1.id, 0),
              h.wire(and3.id, or1.id, 1),
              h.wire(or1.id, s2Out.id, 0),
            ],
          };
        }),
      },

      // ─────────────────────────────────────────────────────────
      // Part ד — Setup violation: max setup budget = 300 ps.
      //   Current critical path = 370 ps > 300 ps  ⇒  violation.
      //   Solution: pipelining — insert a register mid-path so
      //   each pipeline stage fits in 300 ps.
      // ─────────────────────────────────────────────────────────
      {
        label: 'ד',
        question: 'נתון כעת: **תקציב ה-setup המקסימלי = 300 ps**. ה-critical path במעגל מסעיף ג\' הוא 370 ps. תן **פתרון שיפתור את הבעיה שנוצרה בזמנים** — תאר את המבנה החדש ואת ה-delay של כל שלב.',
        hints: [
          'בעיה: 370 ps > 300 ps. צריך **לקצר את הנתיב הקומבינטורי** המקסימלי ל-≤ 300 ps.',
          'אפשרויות: (1) להחליף שערים ב-cells מהירים יותר; (2) לשנות ארכיטקטורה (CLA במקום ripple); (3) **pipelining** — לשבור את הנתיב הארוך בעזרת FF באמצע.',
          'ל-2-bit adder הקטן הזה האופציה הטבעית היא **pipelining**. תזהה איפה אפשר לחתוך כך ששני השלבים הנפרדים יהיו ≤ 300 ps כל אחד.',
          'המסלול הקריטי הוא \`XOR2 → AND3 → OR1\` = 150+120+100 = 370. ניתן לחתוך **בין AND3 ל-OR1** או **בין XOR2 ל-AND3**.',
          'חיתוך בין AND3 ל-OR1: שלב 1 = XOR2 + AND3 = 270 ps · שלב 2 = OR1 = 100 ps. ✓ שניהם < 300.',
          'חיתוך בין XOR2 ל-AND3: שלב 1 = XOR2 = 150 ps · שלב 2 = AND3 + OR1 = 220 ps. ✓ גם.',
        ],
        answer:
`**הפתרון המינימלי: Pipelining — להוסיף FF יחיד על המסלול הקריטי.**

### למה pipelining ולא משהו אחר

| חלופה | שיקול | מתאים כאן? |
|---|---|:---:|
| Cells מהירים | יקר; דורש שינוי תהליך | ✗ overkill |
| Carry-lookahead | משמעותי רק ל-≥ 8-bit | ✗ |
| **Pipelining** | מוסיף FF, מפצל לשני שלבים | ✓ פשוט |

### איפה לחתוך?

הנתיב הקריטי הוא \`XOR2 → AND3 → OR1\` (3 שערים, 370 ps).
החיתוך הטוב ביותר הוא **בין XOR2 ל-AND3** — מאזן את שני השלבים:

| שלב | תוכן | delay |
|---|---|---:|
| Stage 1 | XOR2 | 150 ps |
| Stage 2 | AND3 → OR1 | 220 ps |

נוסיף **FF יחיד — \`FF_P\`** — שיתפוס את \`P = XOR2.out\` בין שני השלבים. **ראה את הדיאגרמה בראש דף התשובה.**

### בדיקת timing אחרי הפתרון

- שלב 1: 150 ps ✓ (< 300)
- שלב 2: 220 ps ✓ (< 300)

הכי גדול: **220 ps < 300 ps** ✓ — אין יותר setup violation על המסלול הזה.

### אבל... יש עוד עבודה

הפתרון המינימלי הזה פתר את ה-setup, אבל יצר בעיות חדשות (סנכרון, balancing). על אלה נדבר ב-**סעיף ה'**.`,
        interviewerMindset:
`**שאלת פתרון** מעשית. המראיין מחפש:
1. **שאתה לא קופץ ל"החלפת cells"** — pipelining הוא פתרון נפוץ ויסודי שהוא רוצה לראות שאתה זוכר.
2. **שאתה בוחר מקום חיתוך שמאזן את השלבים** — הסטודנט הטוב יציע את החיתוך שיוצר שלבים בגודל קרוב (150 ו-220 ps), ולא 270 ו-100 ps (מבזבז את ה-clock).
3. **שאתה זוכר את האות C1 צריך גם FF נוסף** — נושא ה-pipeline balancing. סטודנט שזה מפספס מציע פתרון לא נכון פונקציונלית.

**שאלת המשך מובטחת**: "מה הבעיה החדשה שיצרת?" → ראה סעיף ה.`,
        answerSchematic: `
<svg viewBox="0 0 1140 660" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Minimal pipelining: a single FF_P on the critical wire between XOR2 and AND3.">

  <defs>
    <linearGradient id="pipeBand" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"  stop-color="#cc66ff" stop-opacity="0"/>
      <stop offset="20%" stop-color="#cc66ff" stop-opacity="0.14"/>
      <stop offset="80%" stop-color="#cc66ff" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#cc66ff" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <text x="570" y="40" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    פתרון מינימלי — FF יחיד על המסלול הקריטי
  </text>

  <!-- ════════ Pipeline band (purple, full-height background) ════════ -->
  <rect x="460" y="110" width="140" height="430" rx="10"
        fill="url(#pipeBand)" stroke="#cc66ff" stroke-width="1.8" stroke-dasharray="6,4"/>
  <text x="530" y="100" text-anchor="middle" fill="#cc99ff" font-size="20" font-weight="bold">PIPELINE FF</text>

  <!-- ════════ Stage headers ════════ -->
  <rect x="50"  y="80" width="410" height="32" rx="6" fill="rgba(128,200,255,0.10)" stroke="#80c8ff" stroke-width="1.4"/>
  <text x="255" y="102" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">STAGE 1 (XOR2 בלבד, ≤ 150 ps)</text>

  <rect x="600" y="80" width="500" height="32" rx="6" fill="rgba(255,144,80,0.10)" stroke="#ff9050" stroke-width="1.4"/>
  <text x="850" y="102" text-anchor="middle" fill="#ff9050" font-size="18" font-weight="bold">STAGE 2 (AND3 → OR1, ≤ 220 ps)</text>

  <!-- ════════ Inputs (left) ════════ -->
  <g font-size="20" font-weight="bold">
    <circle cx="70" cy="160" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="70" y="166" text-anchor="middle" fill="#cca040">A0</text>
    <circle cx="70" cy="240" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="70" y="246" text-anchor="middle" fill="#cca040">B0</text>
    <circle cx="70" cy="400" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="70" y="406" text-anchor="middle" fill="#cca040">A1</text>
    <circle cx="70" cy="480" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="70" y="486" text-anchor="middle" fill="#cca040">B1</text>
  </g>

  <!-- ════════ Non-pipelined wires (thin grey, ALL outputs except S2 bypass) ════════ -->
  <g stroke="#5a6e80" stroke-width="1.6" fill="none">
    <!-- A0 → XOR1.in0, AND1.in0 -->
    <path d="M 90 160 L 240 160 L 240 200 L 280 200"/>
    <path d="M 240 160 L 240 260 L 280 260"/>
    <circle cx="240" cy="160" r="3.5" fill="#5a6e80"/>
    <!-- B0 → XOR1.in1, AND1.in1 -->
    <path d="M 90 240 L 220 240 L 220 220 L 280 220"/>
    <path d="M 220 240 L 220 280 L 280 280"/>
    <circle cx="220" cy="240" r="3.5" fill="#5a6e80"/>
    <!-- A1 → XOR2.in0, AND2.in0 -->
    <path d="M 90 400 L 240 400 L 240 410 L 280 410"/>
    <path d="M 240 400 L 240 470 L 280 470"/>
    <circle cx="240" cy="400" r="3.5" fill="#5a6e80"/>
    <!-- B1 → XOR2.in1, AND2.in1 -->
    <path d="M 90 480 L 220 480 L 220 430 L 280 430"/>
    <path d="M 220 480 L 220 490 L 280 490"/>
    <circle cx="220" cy="480" r="3.5" fill="#5a6e80"/>
    <!-- XOR1 → S0 (BYPASS) -->
    <path d="M 360 210 L 1010 210" stroke-dasharray="6,5"/>
    <!-- AND1 → AND3.in1 (BYPASS — flows directly across pipeline band, dashed) -->
    <path d="M 360 270 L 640 270 L 640 410 L 680 410" stroke-dasharray="6,5"/>
    <!-- AND1 → XOR3.in1 (BYPASS — branches from above) -->
    <path d="M 640 270 L 640 340 L 680 340" stroke-dasharray="6,5"/>
    <circle cx="640" cy="270" r="3.5" fill="#5a6e80"/>
    <!-- AND2 → OR1.in0 (BYPASS) -->
    <path d="M 360 480 L 840 480" stroke-dasharray="6,5"/>
    <!-- XOR3 → S1 -->
    <path d="M 760 330 L 1010 330"/>
  </g>

  <!-- ════════ CRITICAL pipelined path (red, drawn after grey so on top) ════════
       A1 → XOR2 → FF_P → AND3 → OR1 → S2 -->
  <g stroke="#ff6060" stroke-width="3.5" fill="none" opacity="0.78">
    <!-- A1 → XOR2.in0 -->
    <path d="M 90 400 L 240 400 L 240 410 L 280 410"/>
    <!-- XOR2.out → FF_P -->
    <path d="M 360 420 L 470 420"/>
    <!-- FF_P.out → AND3.in0 -->
    <path d="M 590 420 L 660 420 L 660 390 L 680 390"/>
    <!-- Branch from FF_P → XOR3.in0 (also pipelined value, used for S1) -->
    <!-- AND3.out → OR1.in1 -->
    <path d="M 760 405 L 820 405 L 820 460 L 840 460"/>
    <!-- OR1.out → S2 -->
    <path d="M 900 470 L 1010 470"/>
  </g>
  <!-- FF_P → XOR3.in0 (pipelined value also reaches XOR3, light pink) -->
  <path d="M 590 420 L 660 420 L 660 320 L 680 320" stroke="#cc66ff" stroke-width="1.8" fill="none" opacity="0.7" stroke-dasharray="3,3"/>

  <!-- ════════ Stage 1 gates ════════ -->
  <g>
    <path d="M 280 185 Q 305 210, 280 235 L 310 235 Q 335 235, 350 210 Q 335 185, 310 185 Z"
          fill="#1a3a2a" stroke="#80f0a0" stroke-width="2"/>
    <text x="318" y="207" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">XOR1</text>
    <text x="318" y="223" text-anchor="middle" fill="#a0c0d0" font-size="16">150 ps</text>
  </g>
  <g>
    <path d="M 280 245 L 310 245 A 25 25 0 0 1 310 295 L 280 295 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="298" y="267" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">AND1</text>
    <text x="298" y="283" text-anchor="middle" fill="#a0c0d0" font-size="16">120 ps</text>
  </g>
  <g>
    <path d="M 280 395 Q 305 420, 280 445 L 310 445 Q 335 445, 350 420 Q 335 395, 310 395 Z"
          fill="#1a3a2a" stroke="#80f0a0" stroke-width="2"/>
    <text x="318" y="417" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">XOR2</text>
    <text x="318" y="433" text-anchor="middle" fill="#a0c0d0" font-size="16">150 ps</text>
  </g>
  <g>
    <path d="M 280 455 L 310 455 A 25 25 0 0 1 310 505 L 280 505 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="298" y="477" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">AND2</text>
    <text x="298" y="493" text-anchor="middle" fill="#a0c0d0" font-size="16">120 ps</text>
  </g>

  <!-- ════════ Single Pipeline FF — FF_P ════════ -->
  <g>
    <rect x="470" y="395" width="120" height="50" rx="6" fill="#1a1428" stroke="#cc66ff" stroke-width="3"/>
    <text x="530" y="417" text-anchor="middle" fill="#cc99ff" font-size="18" font-weight="bold">FF_P</text>
    <text x="530" y="434" text-anchor="middle" fill="#fff080" font-size="16">★ הפתרון המינימלי</text>
  </g>

  <!-- ════════ Stage 2 gates ════════ -->
  <g>
    <path d="M 680 305 Q 705 330, 680 355 L 710 355 Q 735 355, 750 330 Q 735 305, 710 305 Z"
          fill="#1a3a2a" stroke="#80f0a0" stroke-width="2"/>
    <text x="718" y="327" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">XOR3</text>
    <text x="718" y="343" text-anchor="middle" fill="#a0c0d0" font-size="16">150 ps</text>
  </g>
  <g>
    <path d="M 680 380 L 710 380 A 25 25 0 0 1 710 430 L 680 430 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="698" y="402" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">AND3</text>
    <text x="698" y="418" text-anchor="middle" fill="#a0c0d0" font-size="16">120 ps</text>
  </g>
  <g>
    <path d="M 840 445 L 870 445 Q 910 445, 920 470 Q 910 495, 870 495 L 840 495 Q 860 470, 840 445 Z"
          fill="#3a2a14" stroke="#ffc080" stroke-width="2"/>
    <text x="880" y="467" text-anchor="middle" fill="#ffc080" font-size="18" font-weight="bold">OR1</text>
    <text x="880" y="483" text-anchor="middle" fill="#a0c0d0" font-size="16">100 ps</text>
  </g>

  <!-- ════════ Outputs ════════ -->
  <g font-size="20" font-weight="bold">
    <circle cx="1030" cy="210" r="22" fill="#0a1825" stroke="#cca040" stroke-width="2.2" stroke-dasharray="5,3"/>
    <text x="1030" y="216" text-anchor="middle" fill="#cca040">S0</text>
    <circle cx="1030" cy="330" r="20" fill="#0a1825" stroke="#ff9933" stroke-width="2.2"/>
    <text x="1030" y="336" text-anchor="middle" fill="#ff9933">S1</text>
    <circle cx="1030" cy="470" r="22" fill="#0a1825" stroke="#ff6060" stroke-width="2.6"/>
    <text x="1030" y="476" text-anchor="middle" fill="#ff6060">S2</text>
  </g>

  <!-- Critical-path badge at S2 -->
  <rect x="710" y="510" width="290" height="32" rx="6" fill="rgba(255,96,96,0.14)" stroke="#ff6060" stroke-width="1.6"/>
  <text x="855" y="531" text-anchor="middle" fill="#ff8080" font-size="18" font-weight="bold">SETUP: 150 ps | 220 ps ≤ 300 ✓</text>

  <!-- Bottom summary -->
  <rect x="40" y="570" width="1060" height="78" rx="10" fill="rgba(64,80,100,0.06)" stroke="#3a4a5a" stroke-width="1.4"/>
  <text x="570" y="600" text-anchor="middle" fill="#ffc890" font-weight="bold" font-size="20">
    FF יחיד (FF_P) שובר את ה-370 ps לשני שלבים: 150 ps + 220 ps ≤ 300 ✓
  </text>
  <text x="570" y="628" text-anchor="middle" fill="#c8b090" font-size="18" font-style="italic">
    אבל: שאר המסלולים (קווים מקווקווים) לא פוייפלינו → אי-איזון, מטופל בסעיף ה'
  </text>
</svg>`,
        expectedAnswers: [
          'pipeline', 'pipelining',
          'FF', 'register', 'flip-flop',
          'split path', 'break',
          '270', '220', '150',
          'balanced',
          'C1', 'AND1',
        ],
        circuit: () => build(() => {
          // Minimal pipelining: ONE FF (FF_P) on the critical wire
          // between XOR2 and AND3. The other paths (S0, S1, AND2→OR1,
          // AND1→AND3) bypass the pipeline — this creates the
          // synchronization issue that part ה will address.
          const clk = h.clock(80, 600, 'CLK');
          const a0 = h.input(80,  100, 'A0');  a0.fixedValue = 1;
          const b0 = h.input(80,  180, 'B0');  b0.fixedValue = 1;
          const a1 = h.input(80,  300, 'A1');  a1.fixedValue = 1;
          const b1 = h.input(80,  380, 'B1');  b1.fixedValue = 1;

          const xor1 = h.gate('XOR', 260, 140);
          const and1 = h.gate('AND', 260, 220);
          const xor2 = h.gate('XOR', 260, 320);
          const and2 = h.gate('AND', 260, 400);

          // The single pipeline FF on the critical wire
          const ffP = h.ffD(440, 320, 'FF_P');

          const xor3 = h.gate('XOR', 620, 280);
          const and3 = h.gate('AND', 620, 360);
          const or1  = h.gate('OR',  820, 400);

          const s0Out = h.output(1000, 140, 'S0');
          const s1Out = h.output(1000, 280, 'S1');
          const s2Out = h.output(1000, 400, 'S2');

          return {
            nodes: [
              clk, a0, b0, a1, b1,
              xor1, and1, xor2, and2,
              ffP,
              xor3, and3, or1,
              s0Out, s1Out, s2Out,
            ],
            wires: [
              h.wire(a0.id, xor1.id, 0),
              h.wire(b0.id, xor1.id, 1),
              h.wire(a0.id, and1.id, 0),
              h.wire(b0.id, and1.id, 1),
              h.wire(a1.id, xor2.id, 0),
              h.wire(b1.id, xor2.id, 1),
              h.wire(a1.id, and2.id, 0),
              h.wire(b1.id, and2.id, 1),

              // Only the critical wire goes through FF_P
              h.wire(xor2.id, ffP.id, 0),
              h.wire(clk.id, ffP.id, 1, 0, { isClockWire: true }),

              // XOR3 still gets direct XOR2.out (bypass) + direct AND1.out
              h.wire(xor2.id, xor3.id, 0),
              h.wire(and1.id, xor3.id, 1),

              // AND3 sees the pipelined P + direct C1
              h.wire(ffP.id,  and3.id, 0),
              h.wire(and1.id, and3.id, 1),

              // OR1 sees direct AND2 (G) + AND3.out
              h.wire(and2.id, or1.id, 0),
              h.wire(and3.id, or1.id, 1),

              // Outputs (S0, S1 bypass FF; S2 is 1 cycle delayed)
              h.wire(xor1.id, s0Out.id, 0),
              h.wire(xor3.id, s1Out.id, 0),
              h.wire(or1.id,  s2Out.id, 0),
            ],
          };
        }),
      },

      // ─────────────────────────────────────────────────────────
      // Part ה — Problem with the pipelining solution
      //   Adds LATENCY (1 extra clock cycle). The solution: this
      //   is inherent — but throughput stays the same, and the
      //   downstream system needs to accommodate the pipeline depth.
      // ─────────────────────────────────────────────────────────
      {
        label: 'ה',
        question: 'הפתרון מסעיף ד\' הוצב במקום — אבל הוא יצר **בעיה חדשה**. מהי הבעיה, ומה אתה מציע כדי לטפל בה?',
        hints: [
          'ה-FF החדש שהוספת באמצע הנתיב **מוסיף שלב** בין הקלט ליציאה. כמה clock cycles עוברים עכשיו עד שתוצאה יוצאת?',
          'לפני pipelining: cycle אחד (combinational). אחרי: 2 cycles (1 pipeline stage נוסף).',
          'התוצאה: \`Latency\` (השהיה) הוכפלה. \`Throughput\` (תפוקה) נשמרה — וקטור חדש בכל clock, אבל הכל מאוחר ב-cycle.',
          'הבעיה הקיומית: אם המעגל שמשתמש ב-S2 מצפה לקבל אותו באותו cycle עם S0/S1 (sync), ה-S2 שלנו יגיע באיחור — \`pipeline imbalance\`.',
          'הפתרון: לאזן את ה-pipeline — להוסיף FF מקביל גם לנתיב של S0 ו-S1 כדי שכולם יגיעו ביחד.',
        ],
        answer:
`**הבעיה**: ה-FF היחיד מסעיף ד' (\`FF_P\`) יצר שתי בעיות:

1. **אי-איזון בין יציאות** — \`S2\` עובר דרך \`FF_P\` ולכן מגיע cycle **אחרי** \`S0, S1\` שלא עוברים FF.
2. **שגיאה מתמטית** — \`AND3\` מקבל את \`P_pipe\` (cycle מאוחר) יחד עם \`C1\` הישן (combinational) → תוצאה לא נכונה.

**הפתרון**: להוסיף **3 FFs נוספים** — \`FF_S0\`, \`FF_C1\`, \`FF_G\` — כך שכל הקווים שחוצים את שלב ה-pipeline יעברו דרך FFs ויסונכרנו עם \`FF_P\`. **ראה השרטוט בראש דף התשובה.**

### Trade-offs

- **Latency** הוכפלה ל-2 cycles — בלתי-הפיך, אינהרנטי ל-pipelining.
- **Area**: סה"כ 4 FFs (FF_P מסעיף ד' + 3 חדשים).
- **Power**: יותר switching → ~10-20% תוספת.
- **Throughput** **נשמרת** — וקטור חדש בכל clock.`,
        answerSchematic: `
<svg viewBox="0 0 1140 660" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Balanced pipelined adder: an additional FF on the S0 path so all outputs exit at the same cycle.">

  <defs>
    <linearGradient id="pipeBand2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"  stop-color="#cc66ff" stop-opacity="0"/>
      <stop offset="20%" stop-color="#cc66ff" stop-opacity="0.14"/>
      <stop offset="80%" stop-color="#cc66ff" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#cc66ff" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <text x="570" y="40" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    Pipeline מאוזן — 3 FFs נוספים (FF_S0, FF_C1, FF_G)
  </text>

  <!-- Pipeline band -->
  <rect x="460" y="110" width="140" height="430" rx="10"
        fill="url(#pipeBand2)" stroke="#cc66ff" stroke-width="1.8" stroke-dasharray="6,4"/>
  <text x="530" y="100" text-anchor="middle" fill="#cc99ff" font-size="20" font-weight="bold">PIPELINE FFs</text>

  <!-- Stage headers -->
  <rect x="50"  y="80" width="410" height="32" rx="6" fill="rgba(128,200,255,0.10)" stroke="#80c8ff" stroke-width="1.4"/>
  <text x="255" y="102" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">STAGE 1 (combinational ≤ 150 ps)</text>

  <rect x="600" y="80" width="500" height="32" rx="6" fill="rgba(255,144,80,0.10)" stroke="#ff9050" stroke-width="1.4"/>
  <text x="850" y="102" text-anchor="middle" fill="#ff9050" font-size="18" font-weight="bold">STAGE 2 (combinational ≤ 220 ps)</text>

  <!-- ════════ Inputs ════════ -->
  <g font-size="20" font-weight="bold">
    <circle cx="70" cy="160" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="70" y="166" text-anchor="middle" fill="#cca040">A0</text>
    <circle cx="70" cy="240" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="70" y="246" text-anchor="middle" fill="#cca040">B0</text>
    <circle cx="70" cy="400" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="70" y="406" text-anchor="middle" fill="#cca040">A1</text>
    <circle cx="70" cy="480" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="70" y="486" text-anchor="middle" fill="#cca040">B1</text>
  </g>

  <!-- ════════ Wires ════════ -->
  <g stroke="#5a6e80" stroke-width="1.6" fill="none">
    <!-- A0 → XOR1.in0, AND1.in0 -->
    <path d="M 90 160 L 240 160 L 240 200 L 280 200"/>
    <path d="M 240 160 L 240 260 L 280 260"/>
    <circle cx="240" cy="160" r="3.5" fill="#5a6e80"/>
    <!-- B0 → XOR1.in1, AND1.in1 -->
    <path d="M 90 240 L 220 240 L 220 220 L 280 220"/>
    <path d="M 220 240 L 220 280 L 280 280"/>
    <circle cx="220" cy="240" r="3.5" fill="#5a6e80"/>
    <!-- A1 → XOR2.in0, AND2.in0 -->
    <path d="M 90 400 L 240 400 L 240 410 L 280 410"/>
    <path d="M 240 400 L 240 470 L 280 470"/>
    <circle cx="240" cy="400" r="3.5" fill="#5a6e80"/>
    <!-- B1 → XOR2.in1, AND2.in1 -->
    <path d="M 90 480 L 220 480 L 220 430 L 280 430"/>
    <path d="M 220 480 L 220 490 L 280 490"/>
    <circle cx="220" cy="480" r="3.5" fill="#5a6e80"/>
    <!-- Stage 1 outputs → pipeline FFs -->
    <path d="M 360 210 L 470 210"/>          <!-- XOR1 → FF_S0 (NEW) -->
    <path d="M 360 270 L 470 270"/>          <!-- AND1 → FF_C1 -->
    <path d="M 360 420 L 470 420"/>          <!-- XOR2 → FF_P -->
    <path d="M 360 480 L 470 480"/>          <!-- AND2 → FF_G -->
    <!-- FF_S0 → S0 (direct, now balanced) -->
    <path d="M 590 210 L 1010 210"/>
    <!-- FF_C1 → XOR3.in1 + AND3.in1 -->
    <path d="M 590 270 L 640 270 L 640 340 L 680 340"/>
    <path d="M 640 340 L 640 410 L 680 410"/>
    <circle cx="640" cy="340" r="3.5" fill="#5a6e80"/>
    <!-- FF_P → XOR3.in0 + AND3.in0 -->
    <path d="M 590 420 L 660 420 L 660 320 L 680 320"/>
    <path d="M 660 420 L 660 390 L 680 390"/>
    <circle cx="660" cy="420" r="3.5" fill="#5a6e80"/>
    <!-- FF_G → OR1.in0 -->
    <path d="M 590 480 L 840 480"/>
    <!-- XOR3 → S1 -->
    <path d="M 760 330 L 1010 330"/>
    <!-- AND3 → OR1.in1 -->
    <path d="M 760 405 L 820 405 L 820 460 L 840 460"/>
    <!-- OR1 → S2 -->
    <path d="M 900 470 L 1010 470"/>
  </g>

  <!-- ════════ Stage 1 gates ════════ -->
  <g>
    <path d="M 280 185 Q 305 210, 280 235 L 310 235 Q 335 235, 350 210 Q 335 185, 310 185 Z"
          fill="#1a3a2a" stroke="#80f0a0" stroke-width="2"/>
    <text x="318" y="207" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">XOR1</text>
    <text x="318" y="223" text-anchor="middle" fill="#a0c0d0" font-size="16">150 ps</text>
  </g>
  <g>
    <path d="M 280 245 L 310 245 A 25 25 0 0 1 310 295 L 280 295 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="298" y="267" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">AND1</text>
    <text x="298" y="283" text-anchor="middle" fill="#a0c0d0" font-size="16">120 ps</text>
  </g>
  <g>
    <path d="M 280 395 Q 305 420, 280 445 L 310 445 Q 335 445, 350 420 Q 335 395, 310 395 Z"
          fill="#1a3a2a" stroke="#80f0a0" stroke-width="2"/>
    <text x="318" y="417" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">XOR2</text>
    <text x="318" y="433" text-anchor="middle" fill="#a0c0d0" font-size="16">150 ps</text>
  </g>
  <g>
    <path d="M 280 455 L 310 455 A 25 25 0 0 1 310 505 L 280 505 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="298" y="477" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">AND2</text>
    <text x="298" y="493" text-anchor="middle" fill="#a0c0d0" font-size="16">120 ps</text>
  </g>

  <!-- ════════ Pipeline FFs ════════
       FF_P: from part ד (purple — existing)
       FF_S0, FF_C1, FF_G: NEW in part ה (yellow highlight) -->
  <g>
    <rect x="470" y="185" width="120" height="50" rx="6"
          fill="#3a3a0a" stroke="#ffe060" stroke-width="2.6"/>
    <text x="530" y="207" text-anchor="middle" fill="#ffe060" font-size="18" font-weight="bold">FF_S0 ✨</text>
    <text x="530" y="224" text-anchor="middle" fill="#fff080" font-size="16">★ חדש (ה)</text>
  </g>
  <g>
    <rect x="470" y="245" width="120" height="50" rx="6"
          fill="#3a3a0a" stroke="#ffe060" stroke-width="2.6"/>
    <text x="530" y="267" text-anchor="middle" fill="#ffe060" font-size="18" font-weight="bold">FF_C1 ✨</text>
    <text x="530" y="284" text-anchor="middle" fill="#fff080" font-size="16">★ חדש (ה)</text>
  </g>
  <g>
    <rect x="470" y="395" width="120" height="50" rx="6" fill="#1a1428" stroke="#cc66ff" stroke-width="2.4"/>
    <text x="530" y="417" text-anchor="middle" fill="#cc99ff" font-size="18" font-weight="bold">FF_P</text>
    <text x="530" y="434" text-anchor="middle" fill="#a0a0c0" font-size="16">מסעיף ד'</text>
  </g>
  <g>
    <rect x="470" y="455" width="120" height="50" rx="6"
          fill="#3a3a0a" stroke="#ffe060" stroke-width="2.6"/>
    <text x="530" y="477" text-anchor="middle" fill="#ffe060" font-size="18" font-weight="bold">FF_G ✨</text>
    <text x="530" y="494" text-anchor="middle" fill="#fff080" font-size="16">★ חדש (ה)</text>
  </g>

  <!-- ════════ Stage 2 gates ════════ -->
  <g>
    <path d="M 680 305 Q 705 330, 680 355 L 710 355 Q 735 355, 750 330 Q 735 305, 710 305 Z"
          fill="#1a3a2a" stroke="#80f0a0" stroke-width="2"/>
    <text x="718" y="327" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">XOR3</text>
    <text x="718" y="343" text-anchor="middle" fill="#a0c0d0" font-size="16">150 ps</text>
  </g>
  <g>
    <path d="M 680 380 L 710 380 A 25 25 0 0 1 710 430 L 680 430 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="698" y="402" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">AND3</text>
    <text x="698" y="418" text-anchor="middle" fill="#a0c0d0" font-size="16">120 ps</text>
  </g>
  <g>
    <path d="M 840 445 L 870 445 Q 910 445, 920 470 Q 910 495, 870 495 L 840 495 Q 860 470, 840 445 Z"
          fill="#3a2a14" stroke="#ffc080" stroke-width="2"/>
    <text x="880" y="467" text-anchor="middle" fill="#ffc080" font-size="18" font-weight="bold">OR1</text>
    <text x="880" y="483" text-anchor="middle" fill="#a0c0d0" font-size="16">100 ps</text>
  </g>

  <!-- ════════ Outputs (all green — synced now) ════════ -->
  <g font-size="20" font-weight="bold">
    <circle cx="1030" cy="210" r="22" fill="#0a1825" stroke="#80f0a0" stroke-width="2.6"/>
    <text x="1030" y="216" text-anchor="middle" fill="#80f0a0">S0</text>
    <circle cx="1030" cy="330" r="22" fill="#0a1825" stroke="#80f0a0" stroke-width="2.6"/>
    <text x="1030" y="336" text-anchor="middle" fill="#80f0a0">S1</text>
    <circle cx="1030" cy="470" r="22" fill="#0a1825" stroke="#80f0a0" stroke-width="2.6"/>
    <text x="1030" y="476" text-anchor="middle" fill="#80f0a0">S2</text>
  </g>

  <!-- Sync badge -->
  <rect x="720" y="160" width="280" height="32" rx="6" fill="rgba(128,240,160,0.14)" stroke="#80f0a0" stroke-width="1.6"/>
  <text x="860" y="181" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">✓ כל הפלטים יוצאים בו-זמנית</text>

  <!-- Bottom summary -->
  <rect x="40" y="570" width="1060" height="78" rx="10" fill="rgba(64,80,100,0.06)" stroke="#3a4a5a" stroke-width="1.4"/>
  <text x="570" y="600" text-anchor="middle" fill="#ffc890" font-weight="bold" font-size="20">
    Latency = 2 cycles · Throughput = 1 vector/clock · Stage 1 ≤ 150 ps · Stage 2 ≤ 220 ps
  </text>
  <text x="570" y="628" text-anchor="middle" fill="#c8b090" font-size="18" font-style="italic">
    סה"כ 4 FFs: FF_P מסעיף ד' + 3 חדשים (צהוב) שנוספו בסעיף ה'
  </text>
</svg>`,
        interviewerMindset:
`**שאלה המשכית קלאסית.** המראיין מחפש:
1. **שאתה זוכר את ה-latency vs throughput distinction** — אלה שני מדדים שונים.
2. **שאתה מזהה את ה-imbalance** — בלי באלאנס, פתרון ה-pipeline שובר את החישוב.
3. **שאתה מתאר את הפתרון מבחינה מבנית** — לא רק "להוסיף עוד FF", אלא איפה בדיוק.

**שאלת המשך**: "מה אם אני לא יכול להרשות לעצמי ה-area של 4 FFs נוספים?" → אז צריך לבחור בין:
- לקבל את ה-latency הגבוה (לא לעשות pipelining)
- לחזור ל-faster cells או architecture שונה
- לתת ל-balancing להיות חלקי (תוצאה: timing relaxation מקומי בלבד)

**שאלת bonus**: "מה הקשר ל-retiming?" → Retiming הוא טכניקה של STA tools שמזיזה FFs קיימים סביב הלוגיקה כדי לאזן stages. במקום להוסיף FFs חדשים, הוא מנצל FFs שכבר קיימים ב-flow הכולל.`,
        expectedAnswers: [
          'latency', 'throughput', 'השהיה',
          'pipeline imbalance', 'balance', 'balancing',
          '2 cycles', 'cycle', 'one cycle later',
          'add FF', 'add register', 'parallel FF',
          'synchronization', 'sync',
          'S0', 'S1',
        ],
        circuit: () => build(() => {
          // Balanced pipelined 2-bit adder — 4 FFs total.
          // FF_P from part ד + 3 added in part ה (FF_S0, FF_C1, FF_G).
          // All outputs now exit at the same cycle.
          const clk = h.clock(80, 600, 'CLK');
          const a0 = h.input(80,  100, 'A0');  a0.fixedValue = 1;
          const b0 = h.input(80,  180, 'B0');  b0.fixedValue = 1;
          const a1 = h.input(80,  300, 'A1');  a1.fixedValue = 1;
          const b1 = h.input(80,  380, 'B1');  b1.fixedValue = 1;

          const xor1 = h.gate('XOR', 260, 140);
          const and1 = h.gate('AND', 260, 220);
          const xor2 = h.gate('XOR', 260, 320);
          const and2 = h.gate('AND', 260, 400);

          // All four pipeline FFs (balanced)
          const ffS0 = h.ffD(440, 140, 'FF_S0');
          const ffC1 = h.ffD(440, 220, 'FF_C1');
          const ffP  = h.ffD(440, 320, 'FF_P');
          const ffG  = h.ffD(440, 400, 'FF_G');

          const xor3 = h.gate('XOR', 620, 280);
          const and3 = h.gate('AND', 620, 360);
          const or1  = h.gate('OR',  820, 400);

          const s0Out = h.output(1000, 140, 'S0');
          const s1Out = h.output(1000, 280, 'S1');
          const s2Out = h.output(1000, 400, 'S2');

          return {
            nodes: [
              clk, a0, b0, a1, b1,
              xor1, and1, xor2, and2,
              ffS0, ffC1, ffP, ffG,
              xor3, and3, or1,
              s0Out, s1Out, s2Out,
            ],
            wires: [
              // Stage 1 combinational
              h.wire(a0.id, xor1.id, 0),
              h.wire(b0.id, xor1.id, 1),
              h.wire(a0.id, and1.id, 0),
              h.wire(b0.id, and1.id, 1),
              h.wire(a1.id, xor2.id, 0),
              h.wire(b1.id, xor2.id, 1),
              h.wire(a1.id, and2.id, 0),
              h.wire(b1.id, and2.id, 1),

              // Stage 1 outputs → pipeline FFs
              h.wire(xor1.id, ffS0.id, 0),
              h.wire(and1.id, ffC1.id, 0),
              h.wire(xor2.id, ffP.id,  0),
              h.wire(and2.id, ffG.id,  0),

              // Shared clock to all 4 FFs
              h.wire(clk.id, ffS0.id, 1, 0, { isClockWire: true }),
              h.wire(clk.id, ffC1.id, 1, 0, { isClockWire: true }),
              h.wire(clk.id, ffP.id,  1, 0, { isClockWire: true }),
              h.wire(clk.id, ffG.id,  1, 0, { isClockWire: true }),

              // Stage 2 — all see pipelined values
              h.wire(ffP.id,  xor3.id, 0),
              h.wire(ffC1.id, xor3.id, 1),
              h.wire(ffP.id,  and3.id, 0),
              h.wire(ffC1.id, and3.id, 1),
              h.wire(ffG.id,  or1.id,  0),
              h.wire(and3.id, or1.id,  1),

              // Outputs (all synced)
              h.wire(ffS0.id, s0Out.id, 0),
              h.wire(xor3.id, s1Out.id, 0),
              h.wire(or1.id,  s2Out.id, 0),
            ],
          };
        }),
      },

      // ─────────────────────────────────────────────────────────
      // Part ו — Hold violation: t_hold = 200 ps requires shortest
      //   path ≥ 200 − t_clk-q. With t_clk-q=30 → need ≥170 ps.
      //   Our shortest path is 150 ps (A0/B0 → XOR1 → S0).
      //   Solution: add a delay buffer on that path.
      // ─────────────────────────────────────────────────────────
      {
        label: 'ו',
        question: 'נתון כעת: **\`t_hold = 200 ps\`** (זמן ה-hold הנדרש ע"י ה-FF במורד הזרם). תן פתרון למסלול הבעייתי במעגל.',
        hints: [
          'אילוץ ה-hold: \`T_shortest ≥ t_h − t_clk-q\`. עם \`t_clk-q ≈ 30 ps\` ו-\`t_h = 200 ps\` → צריך \`T_shortest ≥ 170 ps\`.',
          'הנתיב הקצר ביותר במעגל הוא \`A0/B0 → XOR1 → S0\` = 150 ps. **150 < 170** → הפרת hold!',
          'הפתרון: להוסיף **delay buffer** על המסלול הקצר. כך ה-delay של המסלול גדל ומגיע מעל הסף.',
          'איזה רכיב? Buffer (BUF) או זוג inverters בטור. כל BUF מוסיף ~50-100 ps תלוי בטכנולוגיה.',
          'הוספה של BUF אחד (נניח 60 ps): \`150 + 60 = 210 ps ≥ 170\` ✓.',
          'חשוב: הוספת ה-buffer **לא משפיעה על ה-setup** של מסלולים אחרים — הוא רק על המסלול הקצר של S0.',
        ],
        answer:
`**הפתרון: להוסיף Buffer (BUF) על המסלול \`A0/B0 → XOR1 → S0\`.**

### זיהוי הבעיה

- אילוץ hold: \`T_shortest ≥ t_h − t_clk-q\`
- עם \`t_h = 200 ps\`, \`t_clk-q ≈ 30 ps\` → **\`T_shortest ≥ 170 ps\`**
- במעגל הנוכחי, המסלול הקצר ביותר הוא \`A0/B0 → XOR1 → S0\` = **150 ps**
- **150 ps < 170 ps** → הפרת hold (race condition)

### הפתרון: Delay Padding

מוסיפים **שער BUF** (או pair of inverters) על המסלול הקצר ‏\`A0/B0 → XOR1 → S0\`. ראה את הדיאגרמה הצבעונית בראש דף התשובה — שני המבנים זה לצד זה, "לפני" ו-"אחרי".

עם BUF של 60 ps: \`150 + 60 = 210 ps ≥ 170 ps\` ✓ — ה-hold עומד בדרישות עם **40 ps margin**.

### למה BUF דווקא?

| חלופה | משפיע על? | מתאים? |
|---|---|:---:|
| **BUF** | הוספת delay בלבד | ✓ הפתרון הקלאסי |
| 2 × NOT בטור | הוספת delay (זוג inverters ≡ buffer) | ✓ אם אין BUF cell |
| FF נוסף | מוסיף cycle latency | ✗ overkill, פוגע ב-latency |
| Slow cells | משנה כל המעגל | ✗ פוגע בכל ה-setup |
| לא לעשות כלום, להאריך clock | hold לא תלוי ב-clock period! | ✗ אין השפעה |

### חשוב: הפתרון **לא** משפיע על ה-setup

- ה-BUF על מסלול S0 בלבד.
- מסלולי setup הם על S2 (370 ps) — לא נוגעים בהם.
- ה-Fmax לא משתנה.

### בדיקה מלאה — כל המסלולים אחרי התיקון

| מסלול | delay חדש | hold ≥ 170 ✓ ? |
|---|---:|:---:|
| A0/B0 → XOR1 → BUF → S0 | 210 | ✓ (margin 40) |
| A1/B1 → AND2 → OR1 → S2 | 220 | ✓ (margin 50) |
| A0/B0 → AND1 → XOR3 → S1 | 270 | ✓ |
| A1/B1 → XOR2 → XOR3 → S1 | 300 | ✓ |
| A0/B0 → AND1 → AND3 → OR1 → S2 | 340 | ✓ |
| A1/B1 → XOR2 → AND3 → OR1 → S2 | 370 | ✓ |

כל המסלולים עומדים ב-hold ≥ 170 ps ✓.

### ב-EDA tools

זה נקרא **Hold Fixing** או **Delay Padding**. כלי STA (Synopsys PrimeTime, Cadence Tempus) מזהים אוטומטית הפרות hold, מציעים מיקום אופטימלי לbuffer cells, ומתאימים את ה-netlist. בעיצוב ידני: רק על מסלולים קצרים שמפרים את האילוץ.`,
        interviewerMindset:
`**שאלה מעשית.** המראיין מחפש:
1. **שאתה לא ממליץ על FF** — pipelining פותר setup, לא hold. סטודנט שמציע FF להפרת hold לא הבין את העניין.
2. **שאתה לא מציע להאריך clock** — clock period לא משפיע על hold. זה בלבול נפוץ.
3. **שאתה מציין delay padding** — buffer הוא ה-keyword המדויק.

**שאלת המשך**: "כמה buffers, ואיפה?" → רק על המסלול שמפר. בעיצוב גדול יכולים להיות אלפי הפרות hold שכולן ידרשו buffers ייעודיים.

**שאלת bonus**: "האם buffers מעלים power?" → כן, כל buffer מוסיף switching activity. ב-low-power design זה רגיש. הפיתרון: minimum-strength buffers, או fewer-buffer architectures (e.g., scan-friendly hold-safe layouts).

**שאלת bonus 2**: "האם פתרון של ה-buffer יחיד מספיק תמיד?" → לא! ב-CMOS יש process variation — buffer ב-corner מסוים (slow corner) יכול להיות מהיר מדי ב-fast corner. STA tools מתכנן עם margin לכל הקצוות.`,
        answerSchematic: `
<svg viewBox="0 0 1100 480" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Before / after panels — adding a buffer on the S0 path to fix hold timing.">

  <text x="550" y="40" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    Delay padding — הוספת BUF על המסלול הקצר
  </text>
  <text x="550" y="68" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">
    אילוץ: T_shortest ≥ 170 ps (t_h = 200, t_clk-q ≈ 30)
  </text>

  <!-- ════════════════════ BEFORE panel ════════════════════ -->
  <rect x="30" y="100" width="510" height="340" rx="12"
        fill="rgba(255,96,96,0.05)" stroke="rgba(255,96,96,0.55)" stroke-width="2"/>
  <text x="285" y="138" text-anchor="middle" fill="#ff8080" font-weight="bold" font-size="24">לפני — הפרת hold ✗</text>

  <!-- A0 input -->
  <circle cx="80" cy="240" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
  <text x="80" y="246" text-anchor="middle" fill="#cca040" font-size="18" font-weight="bold">A0</text>
  <!-- B0 input -->
  <circle cx="80" cy="310" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
  <text x="80" y="316" text-anchor="middle" fill="#cca040" font-size="18" font-weight="bold">B0</text>

  <!-- Wires -->
  <line x1="100" y1="240" x2="220" y2="240" stroke="#cca040" stroke-width="2"/>
  <line x1="100" y1="310" x2="220" y2="310" stroke="#cca040" stroke-width="2"/>

  <!-- XOR1 -->
  <path d="M 220 230 Q 250 275, 220 320 L 260 320 Q 300 320, 320 275 Q 300 230, 260 230 Z"
        fill="#1a3a2a" stroke="#80f0a0" stroke-width="2.2"/>
  <text x="270" y="270" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">XOR1</text>
  <text x="270" y="290" text-anchor="middle" fill="#a0c0d0" font-size="18">150 ps</text>

  <!-- XOR1 → S0 (long, direct) -->
  <line x1="320" y1="275" x2="470" y2="275" stroke="#ff9933" stroke-width="2.2"/>

  <!-- S0 output -->
  <circle cx="490" cy="275" r="22" fill="#0a1825" stroke="#ff6060" stroke-width="2.4"/>
  <text x="490" y="281" text-anchor="middle" fill="#ff6060" font-size="20" font-weight="bold">S0</text>

  <!-- Delay annotation -->
  <text x="395" y="262" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">150 ps total</text>

  <!-- Violation badge -->
  <rect x="80" y="380" width="410" height="40" rx="8" fill="rgba(255,96,96,0.14)" stroke="#ff6060" stroke-width="1.8"/>
  <text x="285" y="406" text-anchor="middle" fill="#ff8080" font-weight="bold" font-size="18">150 &lt; 170 → race condition</text>

  <!-- ════════════════════ AFTER panel ════════════════════ -->
  <rect x="560" y="100" width="510" height="340" rx="12"
        fill="rgba(128,240,160,0.05)" stroke="rgba(128,240,160,0.55)" stroke-width="2"/>
  <text x="815" y="138" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="24">אחרי — hold נשמר ✓</text>

  <!-- A0 input -->
  <circle cx="610" cy="240" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
  <text x="610" y="246" text-anchor="middle" fill="#cca040" font-size="18" font-weight="bold">A0</text>
  <!-- B0 input -->
  <circle cx="610" cy="310" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
  <text x="610" y="316" text-anchor="middle" fill="#cca040" font-size="18" font-weight="bold">B0</text>

  <!-- Wires -->
  <line x1="630" y1="240" x2="730" y2="240" stroke="#cca040" stroke-width="2"/>
  <line x1="630" y1="310" x2="730" y2="310" stroke="#cca040" stroke-width="2"/>

  <!-- XOR1 -->
  <path d="M 730 230 Q 760 275, 730 320 L 770 320 Q 810 320, 830 275 Q 810 230, 770 230 Z"
        fill="#1a3a2a" stroke="#80f0a0" stroke-width="2.2"/>
  <text x="780" y="270" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">XOR1</text>
  <text x="780" y="290" text-anchor="middle" fill="#a0c0d0" font-size="18">150 ps</text>

  <!-- XOR1 → BUF -->
  <line x1="830" y1="275" x2="880" y2="275" stroke="#ff9933" stroke-width="2.2"/>

  <!-- BUF (highlighted yellow) -->
  <rect x="880" y="250" width="80" height="50" rx="8" fill="#3a3a0a" stroke="#ffe060" stroke-width="2.6"/>
  <text x="920" y="271" text-anchor="middle" fill="#ffe060" font-size="18" font-weight="bold">BUF</text>
  <text x="920" y="289" text-anchor="middle" fill="#fff080" font-size="16">+60 ps ★</text>

  <!-- BUF → S0 -->
  <line x1="960" y1="275" x2="1000" y2="275" stroke="#ff9933" stroke-width="2.2"/>

  <!-- S0 output (now green = safe) -->
  <circle cx="1020" cy="275" r="22" fill="#0a1825" stroke="#80f0a0" stroke-width="2.4"/>
  <text x="1020" y="281" text-anchor="middle" fill="#80f0a0" font-size="20" font-weight="bold">S0</text>

  <!-- Delay annotation -->
  <text x="895" y="240" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">150 + 60 = 210 ps</text>

  <!-- Pass badge -->
  <rect x="610" y="380" width="410" height="40" rx="8" fill="rgba(128,240,160,0.14)" stroke="#80f0a0" stroke-width="1.8"/>
  <text x="815" y="406" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="18">210 ≥ 170 ✓ (margin 40 ps)</text>
</svg>`,
        expectedAnswers: [
          'buffer', 'BUF', 'באפר',
          'delay padding', 'pad', 'pad delay',
          'inverter', 'NOT-NOT', '2 inverters',
          '170', '210', '60',
          'hold fix', 'hold fixing',
          'XOR1', 'S0',
          'shortest path',
        ],
        circuit: () => build(() => {
          // Same 7-gate adder + a BUF (implemented as 2 NOTs) on the
          // S0 path to lift its delay above the 170 ps hold floor.
          // The student can see the structural change visually and
          // verify that S0 still computes A0 XOR B0 (functionally
          // unchanged), only the propagation delay is padded.
          const a0 = h.input(80,  100, 'A0');  a0.fixedValue = 1;
          const b0 = h.input(80,  180, 'B0');  b0.fixedValue = 1;
          const a1 = h.input(80,  300, 'A1');  a1.fixedValue = 1;
          const b1 = h.input(80,  380, 'B1');  b1.fixedValue = 1;

          const xor1 = h.gate('XOR', 260, 140);
          const and1 = h.gate('AND', 260, 220);
          const xor2 = h.gate('XOR', 260, 320);
          const and2 = h.gate('AND', 260, 400);

          // Delay-padding buffer on the S0 path (built from 2 NOTs)
          const padInv1 = h.gate('NOT', 400, 140);
          const padInv2 = h.gate('NOT', 540, 140);

          const xor3 = h.gate('XOR', 480, 280);
          const and3 = h.gate('AND', 480, 360);
          const or1  = h.gate('OR',  680, 380);

          const s0Out = h.output(860, 140, 'S0');
          const s1Out = h.output(860, 280, 'S1');
          const s2Out = h.output(860, 380, 'S2');

          return {
            nodes: [
              a0, b0, a1, b1,
              xor1, and1, xor2, and2,
              padInv1, padInv2,
              xor3, and3, or1,
              s0Out, s1Out, s2Out,
            ],
            wires: [
              h.wire(a0.id, xor1.id, 0),
              h.wire(b0.id, xor1.id, 1),
              h.wire(a0.id, and1.id, 0),
              h.wire(b0.id, and1.id, 1),
              // BUF on S0 path: XOR1 → INV → INV → S0
              h.wire(xor1.id, padInv1.id, 0),
              h.wire(padInv1.id, padInv2.id, 0),
              h.wire(padInv2.id, s0Out.id, 0),

              h.wire(a1.id, xor2.id, 0),
              h.wire(b1.id, xor2.id, 1),
              h.wire(a1.id, and2.id, 0),
              h.wire(b1.id, and2.id, 1),
              h.wire(xor2.id, xor3.id, 0),
              h.wire(xor2.id, and3.id, 0),
              h.wire(and1.id, xor3.id, 1),
              h.wire(and1.id, and3.id, 1),
              h.wire(xor3.id, s1Out.id, 0),
              h.wire(and2.id, or1.id, 0),
              h.wire(and3.id, or1.id, 1),
              h.wire(or1.id, s2Out.id, 0),
            ],
          };
        }),
      },

      // ─────────────────────────────────────────────────────────
      // Part ז — Scan chain on the 4 pipeline FFs
      //   After balancing (ה) + hold fix (ו), production needs to
      //   TEST this pipelined design. Convert all 4 FFs to Scan-FFs,
      //   daisy-chain them, and compute test cycle count (2N+1=9).
      // ─────────────────────────────────────────────────────────
      {
        label: 'ז',
        question: 'המעגל המאוזן מסעיף ה\' מסונכרן ועובד נכון. אבל כעת צריך **לבדוק אותו ב-ATE**. הסבר איך הופכים את 4 ה-FFs ל-**scan-friendly**, תאר את **סדר ה-scan chain** עם נקודות \`SI\` ו-\`SO\`, וחשב כמה מחזורי clock נדרשים להרצת **וקטור בדיקה אחד** על המעגל.',
        hints: [
          'הופכים D-FF רגיל ל-Scan-FF ע"י הוספת **MUX 2:1 לפני ה-D**: כניסה 0 = D הפונקציונלי, כניסה 1 = SI (Scan-In). הסלקטור הוא \`SE\` (Scan-Enable).',
          'SE משותף לכל ה-Scan-FFs במעגל. בזמן SE=0 → המעגל עובד פונקציונלית רגיל. בזמן SE=1 → כל ה-FFs מהווים shift-register.',
          'סדר השרשרת חופשי, אבל הגיוני להתחיל מ-stage 1 הראשונות וללכת לשניות. למשל: \`SI → FF_S0 → FF_C1 → FF_P → FF_G → SO\`.',
          'מחזורי clock לוקטור אחד: \`N\` ל-load (shift-in) + \`1\` ל-capture + \`N\` ל-unload (shift-out). עבור \`N=4\`: סה"כ \`2N+1 = 9\` cycles.',
          'בלי scan: כדי להגיע ל-FF_P עם ערך ספציפי, היית צריך לדחוף state דרך XOR2 ב-PIs — לפעמים בלתי-אפשרי (state unreachable). עם scan: כל state בר-טעינה ב-N cycles.',
        ],
        answer:
`### המרת FF רגיל ל-Scan-FF

לכל אחד מ-4 ה-FFs מוסיפים **MUX 2:1 לפני ה-D**:

| pin | תפקיד |
|---|---|
| \`D\` | קלט פונקציונלי (מ-XOR1 / AND1 / XOR2 / AND2) |
| \`SI\` | Scan-In — מחובר ל-\`Q\` של ה-FF הקודם בשרשרת |
| \`SE\` | Scan-Enable — סלקטור ה-MUX. SE=0 → D · SE=1 → SI |
| \`CLK\` | שעון רגיל, משותף לכל ה-FFs |
| \`Q\` | היציאה — גם משמשת כ-\`SO\` ל-FF הבא בשרשרת |

### סדר השרשרת המוצע

\`SI → FF_S0 → FF_C1 → FF_P → FF_G → SO\`

החיווט: \`SI\` חיצוני → \`FF_S0.TI\` · \`FF_S0.Q\` → \`FF_C1.TI\` · \`FF_C1.Q\` → \`FF_P.TI\` · \`FF_P.Q\` → \`FF_G.TI\` · \`FF_G.Q\` → \`SO\` חיצוני.

הסדר מ-stage 1 ל-stage 2 הוא טבעי (קל לדבג).

### מחזורי clock לוקטור-בדיקה אחד

| שלב | מצב SE | משך |
|---|:---:|---:|
| 1. **Load** — shift-in 4-bit pattern דרך SI | 1 | \`N = 4\` cycles |
| 2. **Capture** — clock אחד עם SE=0; ה-FFs לוכדים את תוצאת stage 2 | 0 | \`1\` cycle |
| 3. **Unload** — shift-out 4 bits דרך SO + observation | 1 | \`N = 4\` cycles |
| **סה"כ** | | **\`2N + 1 = 9\` cycles** |

### מה הרווח ב-coverage?

- **בלי scan**: כדי להגיע ל-\`FF_P\` עם ערך מסוים, צריך רצף PIs שמייצר אותו דרך \`XOR2\`. חלק מה-states יכול להיות **unreachable** (לא ניתן ליצור משום וקטור) → coverage קורסת ל-60-80%.
- **עם scan**: כל \`(FF_S0, FF_C1, FF_P, FF_G)\` בר-טעינה ישירות → כל תקלה ב-stage 2 (XOR3, AND3, OR1) ניתנת לבדיקה ב-vector יחיד. **coverage > 99%**.

### בקנבס

המעגל בקנבס מכיל 4 \`SCAN_FF\` blocks ב-daisy chain מלא. עם \`SE=1\` תוכל לטעון כל state ל-4 ה-FFs דרך \`SI\` + 4 פעימות. עם \`SE=0\` + פעימה אחת — capture של תוצאת ה-pipeline. עם \`SE=1\` שוב — shift-out דרך \`SO\` כדי להשוות לערך הצפוי.`,
        interviewerMindset:
`**שאלה תעשייתית קלאסית.** המראיין מחפש:
1. **שאתה זוכר את ה-MUX 2:1** — לא רק "scan-FF" כשם, אלא את המבנה (קישור ל-#6007).
2. **שאתה בוחר סדר chain הגיוני** — לא רק "אקראי", אלא מ-input ל-output (קל ל-debug).
3. **שאתה זוכר את 2N+1** — לא רק "כמה זמן", אלא חישוב מספרי קונקרטי. ל-N=4: 9 cycles.
4. **שאתה מציין את ה-coverage win** — לא רק "אפשר לבדוק", אלא היחס המספרי (99% vs 60-80%).

**שאלת המשך נפוצה**: "האם ה-scan-chain יכולה ליצור הפרת hold משלה?" → כן! בזמן shift, כל \`FF.Q → next.TI\` הוא מסלול קצר שעלול לפסול hold. הפתרון: **lock-up latches** או **reorder** של ה-chain.

**שאלת bonus**: "מה ההבדל בין scan-clock ל-functional clock?" → scan-shift לרוב רץ ב-clock איטי (50-100 MHz) כדי לחסוך הספק. capture חייב להיות ב-functional clock (Fmax) כדי לתפוס transition faults at-speed.

**שאלת bonus 2**: "האם ATPG יכול להתעלם מ-FFs מסוימים?" → כן, יש "scan disable" על FFs sensitive (אנלוגיים, asynchronous, או FFs בלולאות feedback). הם נשארים פונקציונליים תמיד.`,
        expectedAnswers: [
          'scan', 'scan-ff', 'scan chain',
          'MUX', 'mux 2:1',
          'SE', 'scan enable', 'SI', 'SO',
          'daisy chain',
          '2N+1', '2n+1', '9', '9 cycles',
          'load', 'capture', 'unload', 'shift',
          'FF_S0', 'FF_C1', 'FF_P', 'FF_G',
          'coverage', '99%',
        ],
        answerSchematic: `
<svg viewBox="0 0 1140 740" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Pipelined adder with 4 SCAN_FFs in a daisy-chain — SI on the left, SO on the right, SE common.">

  <defs>
    <linearGradient id="pipeBandZ" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"  stop-color="#cc66ff" stop-opacity="0"/>
      <stop offset="20%" stop-color="#cc66ff" stop-opacity="0.14"/>
      <stop offset="80%" stop-color="#cc66ff" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#cc66ff" stop-opacity="0"/>
    </linearGradient>
    <marker id="scArr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 Z" fill="#cc66ff"/>
    </marker>
  </defs>

  <text x="570" y="40" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    Scan chain — 4 Scan-FFs ב-daisy chain
  </text>
  <text x="570" y="68" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">
    SE=0 → פונקציונלי   ·   SE=1 → shift mode
  </text>

  <!-- ════════ Pipeline band ════════ -->
  <rect x="440" y="110" width="180" height="430" rx="10"
        fill="url(#pipeBandZ)" stroke="#cc66ff" stroke-width="1.8" stroke-dasharray="6,4"/>
  <text x="530" y="100" text-anchor="middle" fill="#cc99ff" font-size="20" font-weight="bold">4 × SCAN-FF</text>

  <!-- ════════ Inputs (left) ════════ -->
  <g font-size="18" font-weight="bold">
    <circle cx="70" cy="160" r="18" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="70" y="166" text-anchor="middle" fill="#cca040">A0</text>
    <circle cx="70" cy="220" r="18" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="70" y="226" text-anchor="middle" fill="#cca040">B0</text>
    <circle cx="70" cy="380" r="18" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="70" y="386" text-anchor="middle" fill="#cca040">A1</text>
    <circle cx="70" cy="440" r="18" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="70" y="446" text-anchor="middle" fill="#cca040">B1</text>
    <!-- SI (Scan-In) — special, on the left -->
    <circle cx="70" cy="540" r="20" fill="#0a1825" stroke="#cc66ff" stroke-width="2.6"/>
    <text x="70" y="546" text-anchor="middle" fill="#cc66ff">SI</text>
  </g>

  <!-- ════════ Stage 1 gates (compact) ════════ -->
  <g>
    <path d="M 280 145 Q 305 170, 280 195 L 310 195 Q 335 195, 350 170 Q 335 145, 310 145 Z"
          fill="#1a3a2a" stroke="#80f0a0" stroke-width="2"/>
    <text x="318" y="172" text-anchor="middle" fill="#80f0a0" font-size="16" font-weight="bold">XOR1</text>
  </g>
  <g>
    <path d="M 280 205 L 310 205 A 25 25 0 0 1 310 255 L 280 255 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="298" y="232" text-anchor="middle" fill="#80c8ff" font-size="16" font-weight="bold">AND1</text>
  </g>
  <g>
    <path d="M 280 365 Q 305 390, 280 415 L 310 415 Q 335 415, 350 390 Q 335 365, 310 365 Z"
          fill="#1a3a2a" stroke="#80f0a0" stroke-width="2"/>
    <text x="318" y="392" text-anchor="middle" fill="#80f0a0" font-size="16" font-weight="bold">XOR2</text>
  </g>
  <g>
    <path d="M 280 425 L 310 425 A 25 25 0 0 1 310 475 L 280 475 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="298" y="452" text-anchor="middle" fill="#80c8ff" font-size="16" font-weight="bold">AND2</text>
  </g>

  <!-- Functional D-input wires (thin grey, going into FFs from the left) -->
  <g stroke="#5a6e80" stroke-width="1.5" fill="none">
    <path d="M 90 160 L 240 160 L 240 165 L 280 165"/>
    <path d="M 90 220 L 220 220 L 220 180 L 280 180"/>
    <path d="M 240 165 L 240 220 L 280 220"/>
    <path d="M 220 220 L 220 240 L 280 240"/>
    <circle cx="240" cy="165" r="3" fill="#5a6e80"/>
    <circle cx="220" cy="220" r="3" fill="#5a6e80"/>

    <path d="M 90 380 L 240 380 L 240 385 L 280 385"/>
    <path d="M 90 440 L 220 440 L 220 400 L 280 400"/>
    <path d="M 240 385 L 240 440 L 280 440"/>
    <path d="M 220 440 L 220 460 L 280 460"/>
    <circle cx="240" cy="385" r="3" fill="#5a6e80"/>
    <circle cx="220" cy="440" r="3" fill="#5a6e80"/>

    <!-- Gates' outputs → FF.D (D = pin 0 of SCAN_FF) -->
    <path d="M 360 170 L 450 170"/>          <!-- XOR1 → FF_S0.D -->
    <path d="M 360 230 L 450 230"/>          <!-- AND1 → FF_C1.D -->
    <path d="M 360 390 L 450 390"/>          <!-- XOR2 → FF_P.D -->
    <path d="M 360 450 L 450 450"/>          <!-- AND2 → FF_G.D -->
  </g>

  <!-- ════════ The 4 Scan-FFs ════════ -->
  <g>
    <rect x="450" y="145" width="170" height="60" rx="6" fill="#1a1428" stroke="#cc66ff" stroke-width="2.6"/>
    <text x="535" y="170" text-anchor="middle" fill="#cc99ff" font-size="18" font-weight="bold">SCAN_FF — FF_S0</text>
    <text x="464" y="194" fill="#a0a0c0" font-size="16">D</text>
    <text x="464" y="186" fill="#cc66ff" font-size="16">TI</text>
    <text x="610" y="190" text-anchor="end" fill="#a0a0c0" font-size="16">Q</text>
  </g>
  <g>
    <rect x="450" y="205" width="170" height="60" rx="6" fill="#1a1428" stroke="#cc66ff" stroke-width="2.6"/>
    <text x="535" y="230" text-anchor="middle" fill="#cc99ff" font-size="18" font-weight="bold">SCAN_FF — FF_C1</text>
    <text x="464" y="254" fill="#a0a0c0" font-size="16">D</text>
    <text x="464" y="246" fill="#cc66ff" font-size="16">TI</text>
    <text x="610" y="250" text-anchor="end" fill="#a0a0c0" font-size="16">Q</text>
  </g>
  <g>
    <rect x="450" y="365" width="170" height="60" rx="6" fill="#1a1428" stroke="#cc66ff" stroke-width="2.6"/>
    <text x="535" y="390" text-anchor="middle" fill="#cc99ff" font-size="18" font-weight="bold">SCAN_FF — FF_P</text>
    <text x="464" y="414" fill="#a0a0c0" font-size="16">D</text>
    <text x="464" y="406" fill="#cc66ff" font-size="16">TI</text>
    <text x="610" y="410" text-anchor="end" fill="#a0a0c0" font-size="16">Q</text>
  </g>
  <g>
    <rect x="450" y="425" width="170" height="60" rx="6" fill="#1a1428" stroke="#cc66ff" stroke-width="2.6"/>
    <text x="535" y="450" text-anchor="middle" fill="#cc99ff" font-size="18" font-weight="bold">SCAN_FF — FF_G</text>
    <text x="464" y="474" fill="#a0a0c0" font-size="16">D</text>
    <text x="464" y="466" fill="#cc66ff" font-size="16">TI</text>
    <text x="610" y="470" text-anchor="end" fill="#a0a0c0" font-size="16">Q</text>
  </g>

  <!-- ════════ Scan daisy chain (purple, prominent) ════════ -->
  <g stroke="#cc66ff" stroke-width="3" fill="none" marker-end="url(#scArr)">
    <!-- SI → FF_S0.TI -->
    <path d="M 90 540 L 420 540 L 420 178 L 450 178"/>
    <!-- FF_S0.Q → FF_C1.TI -->
    <path d="M 620 185 L 660 185 L 660 305 L 430 305 L 430 238 L 450 238"/>
    <!-- FF_C1.Q → FF_P.TI -->
    <path d="M 620 245 L 670 245 L 670 320 L 425 320 L 425 398 L 450 398"/>
    <!-- FF_P.Q → FF_G.TI -->
    <path d="M 620 405 L 660 405 L 660 510 L 430 510 L 430 458 L 450 458"/>
    <!-- FF_G.Q → SO -->
    <path d="M 620 465 L 700 465 L 700 590 L 1010 590"/>
  </g>

  <!-- SE broadcast (green dashed line at the bottom) -->
  <line x1="90" y1="660" x2="1050" y2="660" stroke="#80f0a0" stroke-width="2.4" stroke-dasharray="6,4"/>
  <text x="60" y="665" text-anchor="end" fill="#80f0a0" font-size="18" font-weight="bold">SE</text>
  <g stroke="#80f0a0" stroke-width="1.6" fill="none">
    <line x1="535" y1="660" x2="535" y2="495"/>
    <line x1="535" y1="495" x2="535" y2="490"/>
  </g>

  <!-- ════════ Stage 2 gates ════════ -->
  <g>
    <path d="M 680 290 Q 705 315, 680 340 L 710 340 Q 735 340, 750 315 Q 735 290, 710 290 Z"
          fill="#1a3a2a" stroke="#80f0a0" stroke-width="2"/>
    <text x="718" y="317" text-anchor="middle" fill="#80f0a0" font-size="16" font-weight="bold">XOR3</text>
  </g>
  <g>
    <path d="M 680 360 L 710 360 A 25 25 0 0 1 710 410 L 680 410 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="698" y="388" text-anchor="middle" fill="#80c8ff" font-size="16" font-weight="bold">AND3</text>
  </g>
  <g>
    <path d="M 840 415 L 870 415 Q 910 415, 920 440 Q 910 465, 870 465 L 840 465 Q 860 440, 840 415 Z"
          fill="#3a2a14" stroke="#ffc080" stroke-width="2"/>
    <text x="880" y="442" text-anchor="middle" fill="#ffc080" font-size="16" font-weight="bold">OR1</text>
  </g>

  <!-- Stage-2 thin wires -->
  <g stroke="#5a6e80" stroke-width="1.5" fill="none">
    <path d="M 620 175 L 850 175"/>          <!-- FF_S0.Q → S0 -->
    <path d="M 620 395 L 660 395 L 660 305 L 680 305"/>     <!-- FF_P.Q → XOR3.in0 -->
    <path d="M 620 240 L 645 240 L 645 320 L 680 320"/>     <!-- FF_C1.Q → XOR3.in1 -->
    <path d="M 620 395 L 660 395 L 660 372 L 680 372"/>     <!-- FF_P.Q → AND3.in0 -->
    <path d="M 620 240 L 645 240 L 645 398 L 680 398"/>     <!-- FF_C1.Q → AND3.in1 -->
    <path d="M 620 455 L 830 455 L 830 430 L 840 430"/>     <!-- FF_G.Q → OR1.in0 -->
    <path d="M 760 385 L 790 385 L 790 450 L 840 450"/>     <!-- AND3.out → OR1.in1 -->
    <path d="M 760 315 L 850 315"/>                          <!-- XOR3 → S1 -->
    <path d="M 920 440 L 850 440"/>                          <!-- OR1 → S2 -->
  </g>

  <!-- ════════ Outputs ════════ -->
  <g font-size="18" font-weight="bold">
    <circle cx="870" cy="175" r="20" fill="#0a1825" stroke="#ff9933" stroke-width="2.2"/>
    <text x="870" y="181" text-anchor="middle" fill="#ff9933">S0</text>
    <circle cx="870" cy="315" r="20" fill="#0a1825" stroke="#ff9933" stroke-width="2.2"/>
    <text x="870" y="321" text-anchor="middle" fill="#ff9933">S1</text>
    <circle cx="870" cy="440" r="20" fill="#0a1825" stroke="#ff9933" stroke-width="2.2"/>
    <text x="870" y="446" text-anchor="middle" fill="#ff9933">S2</text>
    <!-- SO at the bottom -->
    <circle cx="1030" cy="590" r="20" fill="#0a1825" stroke="#cc66ff" stroke-width="2.6"/>
    <text x="1030" y="596" text-anchor="middle" fill="#cc66ff">SO</text>
  </g>

  <!-- ════════ Test cycle count info card ════════ -->
  <rect x="40" y="690" width="1060" height="40" rx="8" fill="rgba(64,80,100,0.06)" stroke="#3a4a5a" stroke-width="1.4"/>
  <text x="570" y="716" text-anchor="middle" fill="#ffc890" font-weight="bold" font-size="18">
    Load (SE=1, 4 cycles)   ·   Capture (SE=0, 1 cycle)   ·   Unload (SE=1, 4 cycles)   =   2N+1 = 9 cycles
  </text>
</svg>`,
        circuit: () => build(() => {
          // Pipelined 2-bit adder with 4 SCAN_FFs in daisy chain.
          // Chain order: SI → FF_S0 → FF_C1 → FF_P → FF_G → SO.
          // Functional mode (SE=0): A+B → S0/S1/S2 with 1 cycle latency.
          // Scan mode (SE=1): SI shifts through all 4 FFs to SO.
          const clk  = h.clock(80, 760, 'CLK');
          const seIn = h.input(80, 640, 'SE');
          const siIn = h.input(80, 540, 'SI');

          const a0 = h.input(80,  100, 'A0');  a0.fixedValue = 1;
          const b0 = h.input(80,  180, 'B0');  b0.fixedValue = 1;
          const a1 = h.input(80,  300, 'A1');  a1.fixedValue = 1;
          const b1 = h.input(80,  380, 'B1');  b1.fixedValue = 1;

          // Stage 1 gates
          const xor1 = h.gate('XOR', 260, 140);
          const and1 = h.gate('AND', 260, 220);
          const xor2 = h.gate('XOR', 260, 320);
          const and2 = h.gate('AND', 260, 400);

          // 4 SCAN_FFs in chain order
          const ffS0 = h.block('SCAN_FF', 460, 140, { label: 'FF_S0', initialQ: 0 });
          const ffC1 = h.block('SCAN_FF', 460, 220, { label: 'FF_C1', initialQ: 0 });
          const ffP  = h.block('SCAN_FF', 460, 320, { label: 'FF_P',  initialQ: 0 });
          const ffG  = h.block('SCAN_FF', 460, 400, { label: 'FF_G',  initialQ: 0 });

          // Stage 2 gates
          const xor3 = h.gate('XOR', 660, 280);
          const and3 = h.gate('AND', 660, 360);
          const or1  = h.gate('OR',  860, 400);

          // Outputs
          const s0Out = h.output(1040, 140, 'S0');
          const s1Out = h.output(1040, 280, 'S1');
          const s2Out = h.output(1040, 400, 'S2');
          const soOut = h.output(1040, 540, 'SO');

          return {
            nodes: [
              clk, seIn, siIn,
              a0, b0, a1, b1,
              xor1, and1, xor2, and2,
              ffS0, ffC1, ffP, ffG,
              xor3, and3, or1,
              s0Out, s1Out, s2Out, soOut,
            ],
            wires: [
              // Stage 1 combinational
              h.wire(a0.id, xor1.id, 0),
              h.wire(b0.id, xor1.id, 1),
              h.wire(a0.id, and1.id, 0),
              h.wire(b0.id, and1.id, 1),
              h.wire(a1.id, xor2.id, 0),
              h.wire(b1.id, xor2.id, 1),
              h.wire(a1.id, and2.id, 0),
              h.wire(b1.id, and2.id, 1),

              // Functional D inputs to SCAN_FFs (pin 0)
              h.wire(xor1.id, ffS0.id, 0),
              h.wire(and1.id, ffC1.id, 0),
              h.wire(xor2.id, ffP.id,  0),
              h.wire(and2.id, ffG.id,  0),

              // Scan chain via TI (pin 1): SI → FF_S0 → FF_C1 → FF_P → FF_G
              h.wire(siIn.id, ffS0.id, 1),
              h.wire(ffS0.id, ffC1.id, 1),
              h.wire(ffC1.id, ffP.id,  1),
              h.wire(ffP.id,  ffG.id,  1),

              // SE common (pin 2) — shared across all 4
              h.wire(seIn.id, ffS0.id, 2),
              h.wire(seIn.id, ffC1.id, 2),
              h.wire(seIn.id, ffP.id,  2),
              h.wire(seIn.id, ffG.id,  2),

              // CLK common (pin 3)
              h.wire(clk.id, ffS0.id, 3, 0, { isClockWire: true }),
              h.wire(clk.id, ffC1.id, 3, 0, { isClockWire: true }),
              h.wire(clk.id, ffP.id,  3, 0, { isClockWire: true }),
              h.wire(clk.id, ffG.id,  3, 0, { isClockWire: true }),

              // Stage 2 — uses FF outputs
              h.wire(ffP.id,  xor3.id, 0),
              h.wire(ffC1.id, xor3.id, 1),
              h.wire(ffP.id,  and3.id, 0),
              h.wire(ffC1.id, and3.id, 1),
              h.wire(ffG.id,  or1.id,  0),
              h.wire(and3.id, or1.id,  1),

              // Functional outputs
              h.wire(ffS0.id, s0Out.id, 0),
              h.wire(xor3.id, s1Out.id, 0),
              h.wire(or1.id,  s2Out.id, 0),

              // Scan-out: last FF in chain → SO
              h.wire(ffG.id, soOut.id, 0),
            ],
          };
        }),
      },

      // ─────────────────────────────────────────────────────────
      // Part ח — Bridge fault between two adjacent wires after
      //   stage 1: the wire XOR1.out → FF_S0.D and the wire
      //   AND1.out → FF_C1.D are physically adjacent in the
      //   pipeline layout. A bridging fault makes both wires take
      //   the wired-AND of the two driver values. Find the minimum
      //   input vector that detects the fault.
      // ─────────────────────────────────────────────────────────
      {
        label: 'ח',
        question: 'במעגל ה-pipelined מסעיף ה\' מוזרק **bridge fault** בין שני קווים שכנים בשלב ה-pipeline: הקו \`XOR1.out → FF_S0.D\` והקו \`AND1.out → FF_C1.D\` — מסומנים ב**סגול** בשרטוט. הקצר הוא **wired-AND** — שני הקווים נושאים את ה-AND של ערכיהם המקוריים. **מהו וקטור הקלט המינימלי שמזהה את התקלה?** הסבר מה רואים בפלט.',
        schematic: `
<svg viewBox="0 0 900 400" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Bridge fault between XOR1→FF_S0 and AND1→FF_C1 wires.">

  <text x="450" y="36" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="24">
    Bridge fault — wired-AND בין שני הקווים השכנים
  </text>

  <!-- Inputs -->
  <g font-size="20" font-weight="bold">
    <circle cx="60" cy="120" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="60" y="126" text-anchor="middle" fill="#cca040">A0</text>
    <circle cx="60" cy="240" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="60" y="246" text-anchor="middle" fill="#cca040">B0</text>
  </g>

  <!-- Input fanout wires (grey) -->
  <g stroke="#5a6e80" stroke-width="1.6" fill="none">
    <path d="M 80 120 L 180 120 L 180 130 L 220 130"/>
    <path d="M 80 240 L 160 240 L 160 150 L 220 150"/>
    <path d="M 180 130 L 180 220 L 220 220"/>
    <path d="M 160 240 L 160 250 L 220 250"/>
    <circle cx="180" cy="130" r="3" fill="#5a6e80"/>
    <circle cx="160" cy="240" r="3" fill="#5a6e80"/>
  </g>

  <!-- XOR1 -->
  <g>
    <path d="M 220 115 Q 248 140, 220 165 L 250 165 Q 280 165, 296 140 Q 280 115, 250 115 Z"
          fill="#1a3a2a" stroke="#80f0a0" stroke-width="2"/>
    <text x="263" y="146" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">XOR1</text>
  </g>
  <!-- AND1 -->
  <g>
    <path d="M 220 205 L 250 205 A 25 25 0 0 1 250 265 L 220 265 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="240" y="240" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">AND1</text>
  </g>

  <!-- ════════ The two BRIDGED wires (purple, highlighted) ════════ -->
  <g stroke="#cc66ff" stroke-width="3.6" fill="none">
    <path d="M 296 140 L 580 140"/>      <!-- XOR1.out → FF_S0.D -->
    <path d="M 280 235 L 580 235"/>      <!-- AND1.out → FF_C1.D -->
  </g>

  <!-- Bridge marker (vertical dashed purple line connecting the two wires) -->
  <line x1="420" y1="140" x2="420" y2="235" stroke="#cc66ff" stroke-width="3" stroke-dasharray="6,4"/>
  <!-- Bridge "fault" zig-zag indicator -->
  <path d="M 415 175 L 425 178 L 415 184 L 425 190 L 415 196 L 425 202"
        fill="none" stroke="#ff6060" stroke-width="2.2"/>

  <!-- Bridge label -->
  <rect x="440" y="170" width="280" height="34" rx="8" fill="rgba(204,102,255,0.16)" stroke="#cc66ff" stroke-width="1.8"/>
  <text x="580" y="192" text-anchor="middle" fill="#cc99ff" font-size="18" font-weight="bold">⚡ BRIDGE — wired-AND</text>

  <!-- FF_S0 -->
  <g>
    <rect x="580" y="110" width="140" height="60" rx="6" fill="#0a1825" stroke="#80c8ff" stroke-width="2.4"/>
    <text x="650" y="135" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">FF_S0</text>
    <text x="650" y="155" text-anchor="middle" fill="#a0c0d0" font-size="16">latches XOR1.out</text>
  </g>
  <!-- FF_C1 -->
  <g>
    <rect x="580" y="205" width="140" height="60" rx="6" fill="#0a1825" stroke="#80c8ff" stroke-width="2.4"/>
    <text x="650" y="230" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">FF_C1</text>
    <text x="650" y="250" text-anchor="middle" fill="#a0c0d0" font-size="16">latches AND1.out</text>
  </g>

  <!-- Context note -->
  <text x="450" y="320" text-anchor="middle" fill="#c8b090" font-size="18" font-style="italic">
    שני הקווים סמוכים פיזית בלייאאוט → קצר חשמלי ביניהם = wired-AND
  </text>
  <text x="450" y="346" text-anchor="middle" fill="#ffe080" font-size="18" font-weight="bold">
    כל וקטור שמעניק להם ערכים זהים — לא מגלה את התקלה (קצר שקוף)
  </text>
  <text x="450" y="370" text-anchor="middle" fill="#a0a0c0" font-size="18">
    Stage 2 (XOR3, AND3, OR1) ממשיך מ-FF_S0 / FF_C1 — לא משורטט כאן
  </text>
</svg>`,
        hints: [
          'Bridge מתבטא רק כשלשני הקווים יש **ערכים שונים** — אם שניהם 0 או שניהם 1, ה-AND שלהם זהה לכל אחד מהם בנפרד ⇒ הקצר שקוף.',
          'הקו XOR1.out מחשב \`A0 ⊕ B0\`. הקו AND1.out מחשב \`A0 · B0\`.',
          'מתי שני הביטויים שונים? כש-XOR=0 ו-AND=1 (\`A0=B0=1\`) **או** כש-XOR=1 ו-AND=0 (\`A0≠B0\`).',
          'בחר \`A0=B0=1\`: XOR1=0, AND1=1. wired-AND עושה את שני הקווים = 0. כעת \`FF_C1\` קולט 0 במקום 1.',
          'התקלה תתבטא ב-stage 2: \`XOR3(P, C1=0)\` במקום \`XOR3(P, C1=1)\` → \`S1\` יוצא הפוך ממה שצפוי.',
          'מינימום: **1 וקטור בלבד** מספיק לזיהוי.',
        ],
        answer:
`## וקטור הקלט: \`A0 = 1, B0 = 1\` (וכל ערך ל-A1, B1) — **מינימום = 1 וקטור**

---

### למה דווקא הוקטור הזה

Bridge הוא **שקוף** כשהקווים נושאים אותו ערך. הוא **מתעורר** רק כשהקווים שונים.

\`XOR1.out = A0 ⊕ B0\` · \`AND1.out = A0 · B0\`. מתי הם שונים?

| A0 | B0 | XOR1.out | AND1.out | bridge פעיל? |
|:---:|:---:|:---:|:---:|:---:|
| 0 | 0 | 0 | 0 | ✗ שקוף |
| 0 | 1 | 1 | 0 | ✓ |
| 1 | 0 | 1 | 0 | ✓ |
| **1** | **1** | **0** | **1** | **✓ הבחירה שלנו** |

(\`A0=B0=1\` היא בחירה כמו \`A0≠B0\`; שתיהן עובדות.)

### מה רואים בפלט עם הוקטור \`(A0=1, B0=1, A1=0, B1=0)\`

- ללא תקלה: \`XOR1.out = 0\`, \`AND1.out = 1\` → \`FF_S0 ← 0\`, \`FF_C1 ← 1\`.
- עם wired-AND bridge: שני הקווים = \`0 AND 1 = 0\` → \`FF_S0 ← 0\`, \`FF_C1 ← 0\` ❌

| | ללא תקלה | עם bridge | הבדל |
|---|:---:|:---:|:---:|
| S0 | 0 | 0 | — |
| **S1** | **1** | **0** | ✓ נחשף ב-S1 |
| S2 | 0 | 0 | — |

\`S1 = XOR3(P=0, C1)\` תלוי ישירות ב-C1. ללא תקלה C1=1 ⇒ S1=1. עם תקלה C1=0 ⇒ S1=0.

### מינימום אבסולוטי — 1 וקטור

באותו וקטור גם **ניתן לזהות את סוג ה-bridge** (wired-AND vs wired-OR):
- (S0=0, S1=0): wired-AND
- (S0=1, S1=1): wired-OR
- (S0=0, S1=1): אין תקלה

### בקנבס

המעגל מציג את ה-pipelined adder עם bridge מוזרק. הצב \`A0=B0=1, A1=B1=0\`, פעם ב-CLK פעם אחת → \`S1\` יציג 0 במקום 1.`,
        interviewerMindset:
`**שאלה אמיתית מ-DFT.** המראיין מחפש:
1. **שאתה מזהה את התנאי "ערכים שונים"** — bridge הוא **שקוף** כשהקווים נושאים אותו ערך. זו המלכודת.
2. **שאתה בוחר A0=B0=1** (או A0≠B0) ולא ניסוי בעיוורון.
3. **שאתה זוכר את התשובה "1 וקטור"** — לא "כמה שצריך".

**שאלת המשך**: "ההבדל בין wired-AND ל-wired-OR ב-bridge?" → תלוי בטכנולוגיה: bipolar pull-up חזק יוצר wired-OR; CMOS עם driver דומיננטי יכול ליצור wired-AND. ATPG תופס שניהם.

**שאלת bonus**: "מה אם הייתי שואל אותך לזהות את **סוג** ה-bridge?" → אותו וקטור מספיק (1 וקטור) — observations של S0 ו-S1 מבחינות:
- (S0=0, S1=0): wired-AND
- (S0=1, S1=1): wired-OR
- (S0=0, S1=1): אין תקלה
`,
        expectedAnswers: [
          'bridge', 'בריג', 'קצר',
          '1', 'one vector', 'וקטור אחד',
          'A0=1', 'B0=1', 'A0=B0=1',
          'wired-AND', 'wired-OR',
          'S1', 'C1',
          'different values', 'contrast',
        ],
        circuit: () => build(() => {
          // Pipelined balanced adder (sec ה structure) with a bridge
          // injected between two adjacent wires after stage 1:
          //   wire-A: XOR1.out → FF_S0.D
          //   wire-B: AND1.out → FF_C1.D
          // Both reference each other with bridgeMode='and' (wired-AND).
          const clk  = h.clock(80, 760, 'CLK');
          const a0 = h.input(80,  100, 'A0');  a0.fixedValue = 1;
          const b0 = h.input(80,  180, 'B0');  b0.fixedValue = 1;
          const a1 = h.input(80,  300, 'A1');  a1.fixedValue = 0;
          const b1 = h.input(80,  380, 'B1');  b1.fixedValue = 0;

          const xor1 = h.gate('XOR', 260, 140);
          const and1 = h.gate('AND', 260, 220);
          const xor2 = h.gate('XOR', 260, 320);
          const and2 = h.gate('AND', 260, 400);

          const ffS0 = h.ffD(460, 140, 'FF_S0');
          const ffC1 = h.ffD(460, 220, 'FF_C1');
          const ffP  = h.ffD(460, 320, 'FF_P');
          const ffG  = h.ffD(460, 400, 'FF_G');

          const xor3 = h.gate('XOR', 660, 280);
          const and3 = h.gate('AND', 660, 360);
          const or1  = h.gate('OR',  860, 400);

          const s0Out = h.output(1040, 140, 'S0');
          const s1Out = h.output(1040, 280, 'S1');
          const s2Out = h.output(1040, 400, 'S2');

          // The two bridged wires reference each other
          const wireA = h.wire(xor1.id, ffS0.id, 0);     // S0 path
          const wireB = h.wire(and1.id, ffC1.id, 0);     // C1 path
          wireA.bridgedWith = wireB.id;
          wireA.bridgeMode  = 'and';
          wireB.bridgedWith = wireA.id;
          wireB.bridgeMode  = 'and';

          return {
            nodes: [
              clk, a0, b0, a1, b1,
              xor1, and1, xor2, and2,
              ffS0, ffC1, ffP, ffG,
              xor3, and3, or1,
              s0Out, s1Out, s2Out,
            ],
            wires: [
              h.wire(a0.id, xor1.id, 0),
              h.wire(b0.id, xor1.id, 1),
              h.wire(a0.id, and1.id, 0),
              h.wire(b0.id, and1.id, 1),
              h.wire(a1.id, xor2.id, 0),
              h.wire(b1.id, xor2.id, 1),
              h.wire(a1.id, and2.id, 0),
              h.wire(b1.id, and2.id, 1),
              wireA,                                       // BRIDGED
              wireB,                                       // BRIDGED
              h.wire(xor2.id, ffP.id, 0),
              h.wire(and2.id, ffG.id, 0),
              h.wire(clk.id, ffS0.id, 1, 0, { isClockWire: true }),
              h.wire(clk.id, ffC1.id, 1, 0, { isClockWire: true }),
              h.wire(clk.id, ffP.id,  1, 0, { isClockWire: true }),
              h.wire(clk.id, ffG.id,  1, 0, { isClockWire: true }),
              h.wire(ffP.id,  xor3.id, 0),
              h.wire(ffC1.id, xor3.id, 1),
              h.wire(ffP.id,  and3.id, 0),
              h.wire(ffC1.id, and3.id, 1),
              h.wire(ffG.id,  or1.id, 0),
              h.wire(and3.id, or1.id, 1),
              h.wire(ffS0.id, s0Out.id, 0),
              h.wire(xor3.id, s1Out.id, 0),
              h.wire(or1.id,  s2Out.id, 0),
            ],
          };
        }),
      },

      // ─────────────────────────────────────────────────────────
      // Part ט — Stuck-at-0 fault on the AND1.out (C1) wire.
      //   The interviewer tells the student "one of the wires is
      //   stuck at 0". Find the minimum test set to detect it.
      // ─────────────────────────────────────────────────────────
      {
        label: 'ט',
        question: 'במעגל מסעיף ה\' אחד החוטים מוזרק עם תקלת **\`stuck-at-0\`** — הקו \`AND1.out → FF_C1.D\` (כלומר \`C1\` תקוע ב-0), מסומן ב**אדום** בשרטוט. **מהו וקטור הקלט המינימלי שמזהה את התקלה ומאשש שאכן הקו הזה הוא הפגום?** הסבר את ה-trade-off של מינימום וקטור לעומת זיהוי ייחודי של מיקום התקלה.',
        schematic: `
<svg viewBox="0 0 900 400" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Stuck-at-0 fault on AND1.out → FF_C1.D wire.">

  <text x="450" y="36" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="24">
    Stuck-at-0 fault — C1 תקוע ב-0
  </text>

  <!-- Inputs -->
  <g font-size="20" font-weight="bold">
    <circle cx="60" cy="120" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="60" y="126" text-anchor="middle" fill="#cca040">A0</text>
    <circle cx="60" cy="240" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="60" y="246" text-anchor="middle" fill="#cca040">B0</text>
  </g>

  <!-- Input fanout wires (grey) -->
  <g stroke="#5a6e80" stroke-width="1.6" fill="none">
    <path d="M 80 120 L 180 120 L 180 130 L 220 130"/>
    <path d="M 80 240 L 160 240 L 160 150 L 220 150"/>
    <path d="M 180 130 L 180 220 L 220 220"/>
    <path d="M 160 240 L 160 250 L 220 250"/>
    <circle cx="180" cy="130" r="3" fill="#5a6e80"/>
    <circle cx="160" cy="240" r="3" fill="#5a6e80"/>
  </g>

  <!-- XOR1 (healthy — shown for context) -->
  <g>
    <path d="M 220 115 Q 248 140, 220 165 L 250 165 Q 280 165, 296 140 Q 280 115, 250 115 Z"
          fill="#1a3a2a" stroke="#80f0a0" stroke-width="2"/>
    <text x="263" y="146" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">XOR1</text>
  </g>
  <!-- AND1 (faulty path source) -->
  <g>
    <path d="M 220 205 L 250 205 A 25 25 0 0 1 250 265 L 220 265 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="240" y="240" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">AND1</text>
  </g>

  <!-- XOR1.out → FF_S0 (healthy, grey) -->
  <line x1="296" y1="140" x2="580" y2="140" stroke="#5a6e80" stroke-width="1.8"/>

  <!-- ════════ The STUCK-AT-0 wire (red, prominent) ════════ -->
  <line x1="280" y1="235" x2="580" y2="235" stroke="#ff6060" stroke-width="3.6"/>
  <!-- Fault marker — red X on the wire -->
  <g transform="translate(420, 235)">
    <circle r="22" fill="#3a0a14" stroke="#ff6060" stroke-width="3"/>
    <text y="6" text-anchor="middle" fill="#ff6060" font-size="24" font-weight="bold">✗</text>
  </g>
  <!-- "stuck-at-0" label -->
  <rect x="440" y="270" width="240" height="34" rx="8" fill="rgba(255,96,96,0.16)" stroke="#ff6060" stroke-width="1.8"/>
  <text x="560" y="292" text-anchor="middle" fill="#ff8080" font-size="18" font-weight="bold">✗ stuck-at-0</text>

  <!-- FF_S0 -->
  <g>
    <rect x="580" y="110" width="140" height="60" rx="6" fill="#0a1825" stroke="#80c8ff" stroke-width="2.4"/>
    <text x="650" y="135" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">FF_S0</text>
    <text x="650" y="155" text-anchor="middle" fill="#a0c0d0" font-size="16">latches XOR1.out</text>
  </g>
  <!-- FF_C1 (faulty input — red) -->
  <g>
    <rect x="580" y="205" width="140" height="60" rx="6" fill="#1a0a0a" stroke="#ff6060" stroke-width="2.4"/>
    <text x="650" y="230" text-anchor="middle" fill="#ff8080" font-size="18" font-weight="bold">FF_C1</text>
    <text x="650" y="250" text-anchor="middle" fill="#ff8080" font-size="16">תמיד קולט 0</text>
  </g>

  <!-- Context note -->
  <text x="450" y="346" text-anchor="middle" fill="#c8b090" font-size="18" font-style="italic">
    הקו תקוע ב-0 ⇒ \`FF_C1\` תמיד יקלוט 0 ב-capture, בלי קשר ל-AND1.out האמיתי
  </text>
  <text x="450" y="370" text-anchor="middle" fill="#ffe080" font-size="18" font-weight="bold">
    הצפי שכן: \`C1 = 1\` (כשA0=B0=1) — אחרת התקלה שקופה
  </text>
</svg>`,
        hints: [
          '\`stuck-at-0\` נחשף רק כש**הערך הצפוי על החוט הוא 1**. אם הצפי 0 → התקלה שקופה.',
          '\`AND1.out = A0 · B0\`. הוא צריך להיות 1 → \`A0 = B0 = 1\`.',
          'C1 משפיע על \`XOR3\` (לחישוב S1) ועל \`AND3\` (לחישוב S2). תקלת stuck-at-0 ב-C1 תשנה את שניהם — תלוי בערכי A1, B1.',
          'בחר \`A1=B1=0\`: \`P=0\`, \`G=0\`. \`S1\` ללא תקלה = \`XOR3(0, 1) = 1\`. עם תקלה: \`XOR3(0, 0) = 0\`. ✓ נחשף.',
          'מינימום לזיהוי-של-קיום: **1 וקטור** (\`A0=B0=1, A1=B1=0\`).',
          'אבל לזיהוי **חד-משמעי** של *איזה* חוט תקול (אם יש מספר מועמדים) — צריך לפעמים יותר וקטורים. זה ה-trade-off של "fault dictionary".',
        ],
        answer:
`## וקטור הקלט: \`A0 = 1, B0 = 1, A1 = 0, B1 = 0\` — **מינימום ל-detection = 1 וקטור**

(לזיהוי-מיקום ייחודי בין מספר חוטים-חשודים: 2 וקטורים — ראה למטה.)

---

### למה דווקא הוקטור הזה

1. \`stuck-at-0\` מתבטא רק כש**הצפי על החוט הוא 1**. לכן \`A0=B0=1\` כך ש-\`C1\` *אמור* להיות 1.
2. \`A1=B1=0\` מנטרל את שאר השערים — \`P=0\`, ו-\`XOR3(0, C1) = C1\`. לכן \`S1\` תלוי בלעדית ב-C1.

### מה רואים בפלט

| | ללא תקלה | עם stuck-at-0 על C1 | הבדל |
|---|:---:|:---:|:---:|
| S0 | 0 (=A0⊕B0) | 0 | — |
| **S1** | **1** (=C1) | **0** | ✓ נחשף |
| S2 | 0 | 0 | — |

\`S1=0\` במקום \`1\` חושף את התקלה.

### Trade-off: זיהוי קיומי vs זיהוי מיקום

| מטרה | מינימום וקטורים |
|---|:---:|
| לדעת ש**יש** תקלה (detection) | **1** |
| לדעת **איזה** חוט (location / fault dictionary) | **2** |

עם הוקטור \`(1,1,0,0)\` בלבד, \`S1=0\` מצביע על תקלה — אבל יש **מספר חוטים-חשודים**: AND1.out, XOR3.out, אחד מקלטי XOR3.

לבידוד AND1.out s-a-0 ספציפית, מוסיפים **וקטור 2**: \`A0=1, B0=1, A1=1, B1=1\`:
- ללא תקלה: \`S1 = XOR3(P=0, C1=1) = 1\`, \`S2 = OR1(G=1, AND3=0) = 1\`.
- עם \`C1\` s-a-0: \`S1 = 0\`, \`S2 = 1\` (לא משתנה).

ה-signature הייחודי \`(S1=0 בשני המקרים, S2 נשאר נכון)\` מבדיל את AND1.out s-a-0 מ-XOR3.out s-a-0 (שהיה גורם ל-S1=0 גם בעוד וקטורים).

### בקנבס

המעגל מציג את ה-pipelined adder עם \`stuck-at-0\` מוזרק על הקו \`AND1.out → FF_C1.D\` (מסומן ב-✗ בשרטוט השאלה). הצב \`A0=B0=1, A1=B1=0\`, פעם ב-CLK פעם אחת → צפה ב-\`S1\` שמציג 0 במקום 1.`,
        interviewerMindset:
`**שאלת ATPG בסיסית.** המראיין מחפש:
1. **שאתה זוכר את הכלל**: stuck-at-0 = "צפי 1 על החוט". בלי הכלל הזה, התשובה תהיה אקראית.
2. **שאתה בוחר A1=B1=0** כדי לנטרל פרמטרים אחרים — הסתכלות נקודתית, לא "סתם משהו".
3. **שאתה מבחין בין detection ל-localization** — זה ההבדל בין "1 וקטור" ל-"2-3 וקטורים".

**שאלת המשך נפוצה**: "האם אתה יכול לבנות **fault dictionary** מלא ל-7 השערים?" → כל wire יש לו signature ייחודי על פני test set מספק. ATPG מודרני (Mentor TestKompress, Synopsys TestMAX) בונה זאת אוטומטית. ל-2-bit adder, ~4-6 וקטורים נותנים coverage מלא של stuck-at + dictionary לזיהוי.

**שאלת bonus**: "מה אם הפגם הוא stuck-at-1 ולא 0?" → אותו עיקרון, פוליאריות הפוכה. צפי 0 על החוט. וקטור: \`A0=0, B0=1\` או \`A0=1, B0=0\` (XOR=1, AND=0 — חושף AND1 s-a-1). מינימום 1 וקטור גם.

**שאלת bonus 2**: "האם ה-pipelining או ה-scan משפיעים על הבדיקה?" → כן! עם scan (סעיף ז'), ניתן **לטעון C1 ישירות** ל-FF_C1 ולא תלויים ב-stage 1. עם הזרקה ישירה של C1=1 + capture, אם FF_C1 קולט 0 → תקלה. שיטה זו עוקפת את בעיית "state unreachable".`,
        expectedAnswers: [
          'stuck-at-0', 'stuck at 0', 's-a-0',
          '1', 'one vector', 'וקטור אחד',
          'A0=B0=1', 'A0=1', 'B0=1',
          'A1=0', 'B1=0',
          'S1', 'C1',
          'detection', 'localization', 'fault dictionary',
        ],
        circuit: () => build(() => {
          // Same pipelined balanced adder, but with stuck-at-0 injected
          // on the wire AND1.out → FF_C1.D (the C1 wire). The student
          // sets A0=B0=1, A1=B1=0 + one clock cycle → S1 outputs 0
          // instead of expected 1.
          const clk  = h.clock(80, 760, 'CLK');
          const a0 = h.input(80,  100, 'A0');  a0.fixedValue = 1;
          const b0 = h.input(80,  180, 'B0');  b0.fixedValue = 1;
          const a1 = h.input(80,  300, 'A1');  a1.fixedValue = 0;
          const b1 = h.input(80,  380, 'B1');  b1.fixedValue = 0;

          const xor1 = h.gate('XOR', 260, 140);
          const and1 = h.gate('AND', 260, 220);
          const xor2 = h.gate('XOR', 260, 320);
          const and2 = h.gate('AND', 260, 400);

          const ffS0 = h.ffD(460, 140, 'FF_S0');
          const ffC1 = h.ffD(460, 220, 'FF_C1');
          const ffP  = h.ffD(460, 320, 'FF_P');
          const ffG  = h.ffD(460, 400, 'FF_G');

          const xor3 = h.gate('XOR', 660, 280);
          const and3 = h.gate('AND', 660, 360);
          const or1  = h.gate('OR',  860, 400);

          const s0Out = h.output(1040, 140, 'S0');
          const s1Out = h.output(1040, 280, 'S1');
          const s2Out = h.output(1040, 400, 'S2');

          // Stuck-at-0 on the wire from AND1 to FF_C1
          const c1Wire = h.wire(and1.id, ffC1.id, 0);
          c1Wire.stuckAt = 0;

          return {
            nodes: [
              clk, a0, b0, a1, b1,
              xor1, and1, xor2, and2,
              ffS0, ffC1, ffP, ffG,
              xor3, and3, or1,
              s0Out, s1Out, s2Out,
            ],
            wires: [
              h.wire(a0.id, xor1.id, 0),
              h.wire(b0.id, xor1.id, 1),
              h.wire(a0.id, and1.id, 0),
              h.wire(b0.id, and1.id, 1),
              h.wire(a1.id, xor2.id, 0),
              h.wire(b1.id, xor2.id, 1),
              h.wire(a1.id, and2.id, 0),
              h.wire(b1.id, and2.id, 1),
              h.wire(xor1.id, ffS0.id, 0),
              c1Wire,                                      // STUCK-AT-0
              h.wire(xor2.id, ffP.id, 0),
              h.wire(and2.id, ffG.id, 0),
              h.wire(clk.id, ffS0.id, 1, 0, { isClockWire: true }),
              h.wire(clk.id, ffC1.id, 1, 0, { isClockWire: true }),
              h.wire(clk.id, ffP.id,  1, 0, { isClockWire: true }),
              h.wire(clk.id, ffG.id,  1, 0, { isClockWire: true }),
              h.wire(ffP.id,  xor3.id, 0),
              h.wire(ffC1.id, xor3.id, 1),
              h.wire(ffP.id,  and3.id, 0),
              h.wire(ffC1.id, and3.id, 1),
              h.wire(ffG.id,  or1.id, 0),
              h.wire(and3.id, or1.id, 1),
              h.wire(ffS0.id, s0Out.id, 0),
              h.wire(xor3.id, s1Out.id, 0),
              h.wire(or1.id,  s2Out.id, 0),
            ],
          };
        }),
      },
    ],
    source: 'תכן לוגי / תזמון וסנכרון — מחבר 2-ביט',
    tags: ['adder', 'half-adder', 'full-adder', 'gate-level', 'identification', 'combinational', 'timing', 'critical-path'],
    circuitRevealsAnswer: true,
  },

  // ═════════════════════════════════════════════════════════════════
  // #5005 — 2-bit multiplier interview question.
  //   Sister to #5004 (2-bit adder). Same pedagogical flow but on a
  //   different circuit so the principles transfer. 7 parts:
  //     א — identify the circuit (multiplier, NOT adder)
  //     ב — path-delay analysis (critical 390 ps, shortest 120 ps)
  //     ג — minimal pipelining (single FF on the C1 wire)
  //     ד — pipeline balancing (3 more FFs)
  //     ה — hold violation + BUF on P0 path
  //     ו — bridge fault between PP_10 and PP_01 wires
  //     ז — stuck-at-0 on the C1 wire
  // ═════════════════════════════════════════════════════════════════
  {
    id: 'interview-2bit-multiplier-identification',
    difficulty: 'hard',
    title: 'זיהוי רכיב מתוך מימוש שערים — מכפיל 2-ביט',
    intro:
`ניתן לפניך מימוש gate-level של מעגל קומבינטורי:

- **4 כניסות**: \`A0, A1, B0, B1\`
- **4 יציאות**: \`Y0, Y1, Y2, Y3\`
- **8 שערים**: 6 × AND, 2 × XOR

אין שום תיוג ברמה גבוהה — רק שערים וחוטים. **התפקיד שלך**: לזהות מה החישוב.

> 💡 רמז ראשון בעצמך: **מספר ה-IO שונה משאלה 5004**. מה זה אומר?`,
    schematic: `
<svg viewBox="0 0 1200 740" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Gate-level netlist of an 8-gate combinational circuit with 4 inputs and 4 outputs.">

  <text x="600" y="36" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="24">
    מעגל קומבינטורי — 4 כניסות, 4 יציאות, 8 שערים
  </text>
  <text x="600" y="64" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">
    מה הרכיב המיוצג?
  </text>

  <!-- ════════ INPUTS (left) ════════ -->
  <g font-size="20" font-weight="bold">
    <circle cx="60" cy="140" r="22" fill="#0a1825" stroke="#cca040" stroke-width="2.4"/>
    <text x="60" y="147" text-anchor="middle" fill="#cca040">A0</text>
    <circle cx="60" cy="240" r="22" fill="#0a1825" stroke="#cca040" stroke-width="2.4"/>
    <text x="60" y="247" text-anchor="middle" fill="#cca040">A1</text>
    <circle cx="60" cy="440" r="22" fill="#0a1825" stroke="#cca040" stroke-width="2.4"/>
    <text x="60" y="447" text-anchor="middle" fill="#cca040">B0</text>
    <circle cx="60" cy="540" r="22" fill="#0a1825" stroke="#cca040" stroke-width="2.4"/>
    <text x="60" y="547" text-anchor="middle" fill="#cca040">B1</text>
  </g>

  <!-- ════════ Stage 0: 4 partial-product ANDs ════════ -->
  <!-- AND1 (A0·B0): top-left -->
  <g>
    <path d="M 250 125 L 280 125 A 30 30 0 0 1 280 185 L 250 185 Z" fill="#1a2230" stroke="#80c8ff" stroke-width="2.2"/>
    <text x="270" y="160" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">AND1</text>
  </g>
  <!-- AND2 (A1·B0): upper-middle -->
  <g>
    <path d="M 250 225 L 280 225 A 30 30 0 0 1 280 285 L 250 285 Z" fill="#1a2230" stroke="#80c8ff" stroke-width="2.2"/>
    <text x="270" y="260" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">AND2</text>
  </g>
  <!-- AND3 (A0·B1): lower-middle -->
  <g>
    <path d="M 250 325 L 280 325 A 30 30 0 0 1 280 385 L 250 385 Z" fill="#1a2230" stroke="#80c8ff" stroke-width="2.2"/>
    <text x="270" y="360" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">AND3</text>
  </g>
  <!-- AND4 (A1·B1): bottom -->
  <g>
    <path d="M 250 425 L 280 425 A 30 30 0 0 1 280 485 L 250 485 Z" fill="#1a2230" stroke="#80c8ff" stroke-width="2.2"/>
    <text x="270" y="460" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">AND4</text>
  </g>

  <!-- ════════ Input fan-out wires ════════ -->
  <g stroke="#cca040" stroke-width="2" fill="none">
    <!-- A0 → AND1.in0, AND3.in0 -->
    <path d="M 82 140 L 200 140 L 200 140 L 250 140"/>
    <path d="M 200 140 L 200 340 L 250 340"/>
    <circle cx="200" cy="140" r="4" fill="#cca040"/>
    <!-- A1 → AND2.in0, AND4.in0 -->
    <path d="M 82 240 L 180 240 L 180 240 L 250 240"/>
    <path d="M 180 240 L 180 440 L 250 440"/>
    <circle cx="180" cy="240" r="4" fill="#cca040"/>
    <!-- B0 → AND1.in1, AND2.in1 -->
    <path d="M 82 440 L 160 440 L 160 170 L 250 170"/>
    <path d="M 160 440 L 160 270 L 250 270"/>
    <circle cx="160" cy="440" r="4" fill="#cca040"/>
    <!-- B1 → AND3.in1, AND4.in1 -->
    <path d="M 82 540 L 140 540 L 140 370 L 250 370"/>
    <path d="M 140 540 L 140 470 L 250 470"/>
    <circle cx="140" cy="540" r="4" fill="#cca040"/>
  </g>

  <!-- ════════ Stage 1: XOR1 + AND5 (half adder on column 1) ════════ -->
  <!-- AND1.out → Y0 (direct) -->
  <line x1="310" y1="155" x2="1100" y2="155" stroke="#ff9933" stroke-width="2"/>

  <!-- AND2.out wire: → XOR1.in0 and AND5.in0 -->
  <g stroke="#5a6e80" stroke-width="1.8" fill="none">
    <path d="M 310 255 L 480 255 L 480 295 L 530 295"/>
    <path d="M 480 255 L 480 350 L 530 350"/>
    <circle cx="480" cy="255" r="4" fill="#5a6e80"/>
  </g>
  <!-- AND3.out wire: → XOR1.in1 and AND5.in1 -->
  <g stroke="#5a6e80" stroke-width="1.8" fill="none">
    <path d="M 310 355 L 460 355 L 460 315 L 530 315"/>
    <path d="M 460 355 L 460 370 L 530 370"/>
    <circle cx="460" cy="355" r="4" fill="#5a6e80"/>
  </g>

  <!-- XOR1 -->
  <g>
    <path d="M 530 280 Q 558 305, 530 330 L 560 330 Q 590 330, 608 305 Q 590 280, 560 280 Z"
          fill="#1a3a2a" stroke="#80f0a0" stroke-width="2.2"/>
    <text x="570" y="310" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">XOR1</text>
  </g>
  <!-- AND5 -->
  <g>
    <path d="M 530 335 L 560 335 A 25 25 0 0 1 560 385 L 530 385 Z" fill="#1a2230" stroke="#80c8ff" stroke-width="2.2"/>
    <text x="548" y="365" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">AND5</text>
  </g>

  <!-- XOR1.out → Y1 -->
  <line x1="608" y1="305" x2="1100" y2="305" stroke="#ff9933" stroke-width="2"/>

  <!-- ════════ Stage 2: XOR2 (for Y2) + AND6 (for Y3) ════════ -->
  <!-- AND4.out wire: → XOR2.in0 and AND6.in0 -->
  <g stroke="#5a6e80" stroke-width="1.8" fill="none">
    <path d="M 310 455 L 720 455 L 720 460 L 770 460"/>
    <path d="M 720 455 L 720 560 L 950 560"/>
    <circle cx="720" cy="455" r="4" fill="#5a6e80"/>
  </g>
  <!-- AND5.out wire (C1): → XOR2.in1 and AND6.in1 -->
  <g stroke="#5a6e80" stroke-width="1.8" fill="none">
    <path d="M 595 360 L 690 360 L 690 480 L 770 480"/>
    <path d="M 690 360 L 690 590 L 950 590"/>
    <circle cx="690" cy="360" r="4" fill="#5a6e80"/>
  </g>

  <!-- XOR2 -->
  <g>
    <path d="M 770 445 Q 798 470, 770 495 L 800 495 Q 830 495, 848 470 Q 830 445, 800 445 Z"
          fill="#1a3a2a" stroke="#80f0a0" stroke-width="2.2"/>
    <text x="810" y="475" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">XOR2</text>
  </g>
  <!-- XOR2.out → Y2 -->
  <line x1="848" y1="470" x2="1100" y2="470" stroke="#ff9933" stroke-width="2"/>

  <!-- AND6 -->
  <g>
    <path d="M 950 545 L 980 545 A 30 30 0 0 1 980 605 L 950 605 Z" fill="#1a2230" stroke="#80c8ff" stroke-width="2.2"/>
    <text x="970" y="580" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">AND6</text>
  </g>
  <!-- AND6.out → Y3 -->
  <line x1="1010" y1="575" x2="1100" y2="575" stroke="#ff9933" stroke-width="2"/>

  <!-- ════════ OUTPUTS (right) ════════ -->
  <g font-size="20" font-weight="bold">
    <circle cx="1120" cy="155" r="22" fill="#0a1825" stroke="#ff9933" stroke-width="2.4"/>
    <text x="1120" y="162" text-anchor="middle" fill="#ff9933">Y0</text>
    <circle cx="1120" cy="305" r="22" fill="#0a1825" stroke="#ff9933" stroke-width="2.4"/>
    <text x="1120" y="312" text-anchor="middle" fill="#ff9933">Y1</text>
    <circle cx="1120" cy="470" r="22" fill="#0a1825" stroke="#ff9933" stroke-width="2.4"/>
    <text x="1120" y="477" text-anchor="middle" fill="#ff9933">Y2</text>
    <circle cx="1120" cy="575" r="22" fill="#0a1825" stroke="#ff9933" stroke-width="2.4"/>
    <text x="1120" y="582" text-anchor="middle" fill="#ff9933">Y3</text>
  </g>

  <!-- Legend at bottom -->
  <text x="600" y="700" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">
    8 שערים: 6 × AND · 2 × XOR (⊕) · אין OR
  </text>
  <text x="600" y="722" text-anchor="middle" fill="#80c8ff" font-size="18">
    AND1, AND2, AND3, AND4 → 4 partial products   ·   XOR1+AND5 → HA1   ·   XOR2+AND6 → HA2
  </text>
</svg>`,
    parts: [
      {
        label: 'א',
        question: '**איזה רכיב ממשים במעגל**? ההבדל המכריע משאלה 5004: כאן יש **4 יציאות** (לא 3).',
        hints: [
          'במחבר N-ביט יש N+1 יציאות (סכום + carry-out). 4 inputs → לא מסתדר עם adder סטנדרטי (היה אמור להיות 3 outputs).',
          'מה הפעולה השנייה הכי נפוצה על שני מספרים בני 2-ביט? **כפל**! \`2-bit × 2-bit = 4-bit result\`.',
          'כפל ארוך של (A1A0) ב-(B1B0):\\n  PP row 0 = A·B0\\n  PP row 1 = A·B1 (shifted left)\\nואז לחבר את שתי השורות.',
          'AND1..AND4 הם **partial products**: A0·B0, A1·B0, A0·B1, A1·B1. בדיוק 4 ANDs.',
          'XOR1 + AND5 = half-adder על העמודה האמצעית (column 1) שמסכם את A1·B0 + A0·B1.',
          'XOR2 + AND6 = half-adder על העמודה השמאלית (column 2) שמסכם את A1·B1 + carry_in.',
        ],
        answer:
`## הרכיב: **2-bit Unsigned Multiplier** — מכפיל בלתי-חתום של שני מספרים בני 2-ביט

\`\`\`
   A1 A0
 × B1 B0
 ───────────
        A1·B0  A0·B0         (שורה ראשונה: כפל ב-B0)
A1·B1  A0·B1                 (שורה שנייה: כפל ב-B1, מוזז שמאלה ביט אחד)
───────────────────────────
   Y3   Y2   Y1   Y0
\`\`\`

### פירוק לפי גייטים

| שער | תפקיד | חישוב |
|---|---|---|
| AND1 | PP_00 | A0 · B0 → \`Y0\` ישיר |
| AND2 | PP_10 | A1 · B0 |
| AND3 | PP_01 | A0 · B1 |
| AND4 | PP_11 | A1 · B1 |
| XOR1 | HA1 sum | (A1·B0) ⊕ (A0·B1) → \`Y1\` |
| AND5 | HA1 carry (C1) | (A1·B0) · (A0·B1) |
| XOR2 | HA2 sum | (A1·B1) ⊕ C1 → \`Y2\` |
| AND6 | HA2 carry (=C2) | (A1·B1) · C1 → \`Y3\` |

### טבלת אמת (16 שורות) — אימות

| A1A0 | B1B0 | A | B | A×B | Y3 Y2 Y1 Y0 |
|:---:|:---:|:---:|:---:|:---:|:---:|
| 00 | 00 | 0 | 0 | 0 | 0000 |
| 00 | 01 | 0 | 1 | 0 | 0000 |
| 00 | 10 | 0 | 2 | 0 | 0000 |
| 00 | 11 | 0 | 3 | 0 | 0000 |
| 01 | 00 | 1 | 0 | 0 | 0000 |
| 01 | 01 | 1 | 1 | 1 | 0001 |
| 01 | 10 | 1 | 2 | 2 | 0010 |
| 01 | 11 | 1 | 3 | 3 | 0011 |
| 10 | 00 | 2 | 0 | 0 | 0000 |
| 10 | 01 | 2 | 1 | 2 | 0010 |
| 10 | 10 | 2 | 2 | 4 | 0100 |
| 10 | 11 | 2 | 3 | 6 | 0110 |
| 11 | 00 | 3 | 0 | 0 | 0000 |
| 11 | 01 | 3 | 1 | 3 | 0011 |
| 11 | 10 | 3 | 2 | 6 | 0110 |
| **11** | **11** | **3** | **3** | **9** | **1001** |

\`3 × 3 = 9\`, שזה \`1001₂\` — דורש 4 ביטים. זו הסיבה ל-4 יציאות.

### למה לא adder

| מאפיין | Adder | **Multiplier** |
|---|:---:|:---:|
| #IO | 4 in → 3 out | **4 in → 4 out** ← ההבדל |
| גייטים | XOR + AND + OR | **רק XOR + AND** |
| מבנה | HA + FA לטור | **partial products + 2 HAs** |

### בקנבס

המעגל בקנבס מציג את 8 השערים פונקציונליים. עם \`A0=A1=B0=B1=1\` (A=3, B=3) → \`Y3 Y2 Y1 Y0 = 1001 = 9\`. שנה ערכים לאמת את כל 16 הקומבינציות.`,
        interviewerMindset:
`**שאלת פתיחה קלאסית** בראיון תכן לוגי. המראיין מחפש:
1. **שאתה לא קופץ ל"adder"** — 4 outputs צריך להדליק נורה אדומה. Adder סטנדרטי הוא N+1 outputs.
2. **שאתה זוכר שכפל = partial products + adder tree**. זה ה-mental model הבסיסי.
3. **שאתה מזהה 4 ANDs ב-stage 0** = 2-bit × 2-bit = 4 בתי PP.
4. **שאתה מאמת בעזרת מספר אחד**: \`3 × 3 = 9\`. אם הסטודנט שואל "מה זה?" ולא יודע לחשב \`A × B\` בעצמו — הוא לא הבין.

**שאלת המשך נפוצה**: "האם זה signed או unsigned?" → unsigned. עבור signed היו צריכים XOR-ים נוספים על MSB (Baugh-Wooley או Booth).

**שאלת bonus**: "מה היה משתנה אילו הכפלת 3×3-ביט?" → 6 ANDs ל-PP + adder tree עם 3 HA/FA. הכפל גדל כ-N² ב-PPs. רעיון חשוב ל-Wallace/Dadda trees.

**מלכודת נפוצה**: מועמדים שמסתכלים על "AND ו-XOR" ומיד אומרים "FA" או "adder". האמת — multiplier משתמש באותם בלוקים אבל ב-pattern שונה.`,
        expectedAnswers: [
          'multiplier', 'מכפיל', 'מכפלה',
          '2-bit multiplier', '2 bit multiplier',
          'unsigned multiplier',
          'A × B', 'A x B', 'A*B',
          'כפל', 'כפול',
          'partial products', 'PP',
          'four outputs', '4 outputs', '4 יציאות',
        ],
        circuit: () => build(() => {
          // Gate-level 2-bit unsigned multiplier.
          // 4 inputs, 4 outputs, 8 gates (6 AND + 2 XOR).
          // Inputs default to 1 → A=3, B=3 → Y3..Y0 = 1001 = 9.
          const a0 = h.input(80,  100, 'A0');  a0.fixedValue = 1;
          const a1 = h.input(80,  200, 'A1');  a1.fixedValue = 1;
          const b0 = h.input(80,  340, 'B0');  b0.fixedValue = 1;
          const b1 = h.input(80,  440, 'B1');  b1.fixedValue = 1;

          // 4 partial-product ANDs
          const pp00 = h.gate('AND', 260, 130);   // A0·B0 → Y0
          const pp10 = h.gate('AND', 260, 220);   // A1·B0
          const pp01 = h.gate('AND', 260, 310);   // A0·B1
          const pp11 = h.gate('AND', 260, 400);   // A1·B1

          // HA1 — column 1 (sum and carry)
          const xor1 = h.gate('XOR', 480, 265);   // (A1·B0)⊕(A0·B1) → Y1
          const and5 = h.gate('AND', 480, 345);   // (A1·B0)·(A0·B1) → C1

          // HA2 — column 2
          const xor2 = h.gate('XOR', 680, 400);   // (A1·B1)⊕C1 → Y2
          const and6 = h.gate('AND', 880, 440);   // (A1·B1)·C1 → Y3

          const y0 = h.output(1040, 130, 'Y0');
          const y1 = h.output(1040, 265, 'Y1');
          const y2 = h.output(1040, 400, 'Y2');
          const y3 = h.output(1040, 480, 'Y3');

          return {
            nodes: [a0, a1, b0, b1, pp00, pp10, pp01, pp11, xor1, and5, xor2, and6, y0, y1, y2, y3],
            wires: [
              // Stage 0 — partial products
              h.wire(a0.id, pp00.id, 0),
              h.wire(b0.id, pp00.id, 1),
              h.wire(a1.id, pp10.id, 0),
              h.wire(b0.id, pp10.id, 1),
              h.wire(a0.id, pp01.id, 0),
              h.wire(b1.id, pp01.id, 1),
              h.wire(a1.id, pp11.id, 0),
              h.wire(b1.id, pp11.id, 1),
              // Y0 direct
              h.wire(pp00.id, y0.id, 0),
              // HA1 inputs
              h.wire(pp10.id, xor1.id, 0),
              h.wire(pp01.id, xor1.id, 1),
              h.wire(pp10.id, and5.id, 0),
              h.wire(pp01.id, and5.id, 1),
              // Y1 from HA1 sum
              h.wire(xor1.id, y1.id, 0),
              // HA2 inputs (C1 from AND5)
              h.wire(pp11.id, xor2.id, 0),
              h.wire(and5.id, xor2.id, 1),
              h.wire(pp11.id, and6.id, 0),
              h.wire(and5.id, and6.id, 1),
              // Y2 from HA2 sum, Y3 from HA2 carry
              h.wire(xor2.id, y2.id, 0),
              h.wire(and6.id, y3.id, 0),
            ],
          };
        }),
      },

      // ─────────────────────────────────────────────────────────
      // Part ב — Path-delay analysis on the 2-bit multiplier
      //
      // Given gate delays:  AND = 120 ps  ·  XOR = 150 ps  (no OR)
      //
      // 9 unique paths total:
      //   • critical = 390 ps  (A1/B0 or A0/B1 → AND → AND5 → XOR2 → Y2)
      //   • shortest = 120 ps  (A0/B0 → PP00 → Y0 — single AND)
      //
      // Mirrors #5004 part ג but with 9 paths instead of 6.
      // ─────────────────────────────────────────────────────────
      {
        label: 'ב',
        question:
`נתונים זמני ההפצה (propagation delays) של רכיבי המעגל מסעיף א':

| רכיב | delay (ps) |
|:---:|:---:|
| AND | 120 |
| XOR | 150 |

(שים לב — אין במעגל הזה שערי OR.)

מהם **שני המסלולים הקריטיים** במעגל — אחד שקובע את הגבול ל-**setup violation** ואחד שקובע את הגבול ל-**hold violation**? לכל מסלול: רשום את הקלט שממנו הוא מתחיל, את השערים שהוא חוצה לפי הסדר, את היציאה שאליה הוא מגיע, ואת ה-delay הכולל.

**רמז למניית מסלולים**: ספור כמה שערים בין כל זוג (קלט, יציאה). יש כאן יותר משש מסלולים — אל תפסיק אחרי שמצאת אחד.`,
        hints: [
          'התחל מהמעגל של סעיף א\': 8 שערים מסודרים ב-3 שלבים — PP layer (4 ANDs), HA1 (XOR1+AND5), HA2 (XOR2+AND6).',
          'עבור כל קלט (A0, A1, B0, B1), **עקוב לכל היציאות הסופיות** (Y0..Y3). חלק מהקלטים מגיעים ליציאות שונות דרך מסלולים שונים.',
          'Y0 = PP00.out → רק AND אחד מקלט A0/B0 — נתיב הכי קצר.',
          'Y1 = XOR1.out → שני קלטים: PP10 (מ-A1/B0) או PP01 (מ-A0/B1), שניהם דרך AND→XOR.',
          'Y2 = XOR2.out → שני קלטים: PP11 (מ-A1/B1) ישירות, או C1 = PP10·PP01 דרך AND5 — שני נתיבים שונים מאוד באורכם.',
          'Y3 = AND6.out → שני קלטים: PP11 (מ-A1/B1) או C1 (מ-AND5).',
          'Setup constraint: \`T_clk ≥ t_clk-q + T_longest_path + t_su\` — תופס את הנתיב הארוך ביותר.',
          'Hold constraint: \`T_shortest_path ≥ t_h − t_clk-q\` — תופס את הנתיב הקצר ביותר. נתיב קצר מדי = race.',
        ],
        answer:
`### כל 9 המסלולים

| יעד | קלטים | שערים בנתיב | delay |
|---|---|---|---:|
| **Y0** | A0, B0 | PP00 | **120 ps** ← קצר ביותר |
| Y3 | A1, B1 | PP11 → AND6 | 120 + 120 = 240 ps |
| Y1 | A1, B0 | PP10 → XOR1 | 120 + 150 = 270 ps |
| Y1 | A0, B1 | PP01 → XOR1 | 120 + 150 = 270 ps |
| Y2 | A1, B1 | PP11 → XOR2 | 120 + 150 = 270 ps |
| Y3 | A1, B0 | PP10 → AND5 → AND6 | 120 + 120 + 120 = 360 ps |
| Y3 | A0, B1 | PP01 → AND5 → AND6 | 120 + 120 + 120 = 360 ps |
| **Y2** | A1, B0 | PP10 → AND5 → XOR2 | 120 + 120 + 150 = **390 ps** ← ארוך ביותר |
| **Y2** | A0, B1 | PP01 → AND5 → XOR2 | 120 + 120 + 150 = **390 ps** ← ארוך ביותר (תאום) |

### Critical path (setup) — **390 ps**

**\`A1 / B0 → PP10 → AND5 → XOR2 → Y2\`** (או הסימטרי דרך \`PP01\`) — 3 שערים, ושני שערים מסוג AND ועוד XOR יקר.

נוסחת ה-setup:
\`\`\`
T_clk ≥ t_clk-q + 390 + t_su
\`\`\`

עם \`t_clk-q = 30 ps\` ו-\`t_su = 50 ps\`:
\`\`\`
T_clk ≥ 30 + 390 + 50 = 470 ps   ⇒   Fmax ≈ 2.13 GHz
\`\`\`

### Shortest path (hold) — **120 ps**

**\`A0 / B0 → PP00 → Y0\`** — שער יחיד.

נוסחת ה-hold:
\`\`\`
T_shortest ≥ t_h − t_clk-q
\`\`\`

עם \`t_h = 40 ps\` ו-\`t_clk-q = 30 ps\`:
\`\`\`
120 ≥ 40 − 30 = 10 ps   ✓ (הפרש של 110 ps — בטוח)
\`\`\`

### תובנות

**Setup הוא ה-bottleneck.** הסימטריה של ה-multiplier יוצרת **שני מסלולים תאומים** של 390 ps (דרך PP10 ודרך PP01) שמגיעים שניהם ל-Y2 דרך \`AND5 → XOR2\`. זה אופייני ל-multipliers: יש פעמים רבות נתיבים זהים שיש לתזמן יחד.

ה-Y2 ויש לזכור: גם הוא מגיע **גם** ישירות מ-PP11 ב-270 ps. כלומר ל-XOR2 יש קלט שמגיע ב-270 ps וקלט שני שמגיע ב-390 ps → ה-XOR מייצב **ב-390 ps** (ה-max), ובדרך — glitch potential של 120 ps בין הזמנים.

> מה עושים אם תקציב ה-setup הקיים לא מספיק ל-390 ps? נמשיך בסעיפים הבאים.`,
        interviewerMindset:
`**שאלת timing analysis מתקדמת.** המראיין מחפש:
1. **שאתה מונה כל 9 המסלולים**, ולא רק את אחד הקריטיים. ספירת המסלולים בעצמה היא מבחן — מועמד טוב יתחיל בטבלה.
2. **שאתה מזהה את ה-tied paths**: שני המסלולים של 390 ps (דרך PP10 ודרך PP01) הם תאומים מבחינת timing — שניהם יכולים להיות "critical" באותה מידה. זה לא טעות, זו תכונה של ה-multiplier הסימטרי.
3. **שאתה מבחין שב-Y2 יש שני קלטים שונים מאוד בזמן הגעה**: 270 ps (מ-PP11) ו-390 ps (מ-C1). זה יוצר **glitch window של 120 ps** ב-XOR2. בעיה גם ב-power וגם ב-correctness אם דוגמים בזמן הלא נכון.
4. **שאתה זוכר את ה-shortest path להמשך** — Y0 ב-120 ps עלול להפוך לבעיית hold בסעיפים הבאים.

**שאלת המשך נפוצה**: "מה ה-Fmax?" → חישוב מספרי לפי הנוסחה. הסטודנט שאומר "תלוי" נכשל.

**שאלת bonus**: "האם הפיצול של AND5 ל-fan-out 2 (למ XOR2 ול-AND6) משפיע על ה-delay?" → כן בטכנולוגיה פיזית (capacitive load), אבל ברמת הניתוח האידיאלי שכאן — לא. במציאות הוסיפים penalty של ~5-10% ל-delay לכל fan-out נוסף.

**שאלת bonus 2**: "איך זה משתנה ב-multiplier של 3×3 או 4×4?" → צריכת gates גדלה כ-N², וה-critical path גדל כ-O(N) (carry chain). שיטות Wallace/Dadda tree מקצרות את הקריטי ל-O(log N).`,
        expectedAnswers: [
          '390', '390 ps', '390ps',
          '120', '120 ps', '120ps',
          'PP10', 'PP01', 'AND5', 'XOR2', 'PP00',
          'critical path', 'shortest path',
          'A1', 'B0', 'A0', 'B1', 'Y0', 'Y2',
          '9', '8', 'tied', 'תאומים',
          'setup', 'hold',
          'fmax', '2.13',
        ],
        answerSchematic: `
<svg viewBox="0 0 1140 1700" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Circuit with the two critical paths coloured (SETUP red, HOLD green) at the top; Gantt-style chart of all 9 unique paths at the bottom.">

  <!-- ═══════════════════════════════════════════════════════════
       SECTION 1 — Circuit diagram with the two critical paths
                   colored on the actual gates (top half).
       ═══════════════════════════════════════════════════════════ -->

  <text x="570" y="44" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    המעגל עם שני המסלולים הקריטיים
  </text>

  <!-- Legend pills (centered) -->
  <rect x="160" y="68" width="370" height="34" rx="8" fill="rgba(255,96,96,0.14)" stroke="#ff6060" stroke-width="1.8"/>
  <circle cx="186" cy="85" r="8" fill="#ff6060"/>
  <text x="206" y="91" fill="#ff8080" font-size="18" font-weight="bold">SETUP critical — נתיב הארוך ביותר</text>

  <rect x="560" y="68" width="370" height="34" rx="8" fill="rgba(128,240,160,0.14)" stroke="#80f0a0" stroke-width="1.8"/>
  <circle cx="586" cy="85" r="8" fill="#80f0a0"/>
  <text x="606" y="91" fill="#80f0a0" font-size="18" font-weight="bold">HOLD shortest — נתיב הקצר ביותר</text>

  <!-- ════════ SETUP critical path (red, drawn FIRST so gates sit on top) ════════
       A1/B0 → PP10 → AND5 → XOR2 → Y2     (390 ps)
       Also tied: A0/B1 → PP01 → AND5 → XOR2 → Y2
  -->
  <g stroke="#ff6060" stroke-width="6" fill="none" opacity="0.85">
    <!-- A1 → PP10 input -->
    <path d="M 130 180 L 260 180 L 260 220" stroke-linecap="round"/>
    <!-- B0 → PP10 input -->
    <path d="M 130 340 L 200 340 L 200 230 L 260 230" stroke-linecap="round"/>
    <!-- PP10 → AND5 -->
    <path d="M 320 220 L 360 220 L 360 340 L 460 340" stroke-linecap="round"/>
    <!-- AND5 → XOR2 -->
    <path d="M 540 350 L 580 350 L 580 400 L 660 400" stroke-linecap="round"/>
    <!-- XOR2 → Y2 -->
    <path d="M 740 400 L 1010 400" stroke-linecap="round"/>
  </g>

  <!-- Also show the tied symmetric path (PP01) in light red -->
  <g stroke="#ff6060" stroke-width="3" fill="none" opacity="0.45" stroke-dasharray="5,4">
    <path d="M 130 180 L 170 180 L 170 310 L 260 310" stroke-linecap="round"/>
    <path d="M 130 440 L 220 440 L 220 320 L 260 320" stroke-linecap="round"/>
    <path d="M 320 310 L 380 310 L 380 350 L 460 350" stroke-linecap="round"/>
  </g>

  <!-- ════════ HOLD critical path (green, also drawn first) ════════
       A0/B0 → PP00 → Y0   (120 ps)
  -->
  <g stroke="#80f0a0" stroke-width="6" fill="none" opacity="0.85">
    <path d="M 130 180 L 180 180 L 180 130 L 260 130" stroke-linecap="round"/>
    <path d="M 130 340 L 190 340 L 190 140 L 260 140" stroke-linecap="round"/>
    <path d="M 320 130 L 1010 130" stroke-linecap="round"/>
  </g>

  <!-- ═══ Inputs ═══ -->
  <g font-size="20" font-weight="bold">
    <circle cx="120" cy="180" r="14" fill="#1a1f2e" stroke="#cca040" stroke-width="2"/>
    <text x="120" y="186" text-anchor="middle" fill="#cca040">A0</text>
    <circle cx="120" cy="260" r="14" fill="#1a1f2e" stroke="#cca040" stroke-width="2"/>
    <text x="120" y="266" text-anchor="middle" fill="#cca040">A1</text>
    <circle cx="120" cy="340" r="14" fill="#1a1f2e" stroke="#cca040" stroke-width="2"/>
    <text x="120" y="346" text-anchor="middle" fill="#cca040">B0</text>
    <circle cx="120" cy="440" r="14" fill="#1a1f2e" stroke="#cca040" stroke-width="2"/>
    <text x="120" y="446" text-anchor="middle" fill="#cca040">B1</text>
  </g>

  <!-- ═══ Gates (8 total) ═══ -->
  <g font-size="18" font-weight="bold">
    <!-- PP layer -->
    <rect x="260" y="118" width="60" height="36" rx="6" fill="rgba(128,200,255,0.25)" stroke="#80c8ff" stroke-width="2"/>
    <text x="290" y="141" text-anchor="middle" fill="#c0e0ff">PP00</text>

    <rect x="260" y="208" width="60" height="36" rx="6" fill="rgba(128,200,255,0.25)" stroke="#80c8ff" stroke-width="2"/>
    <text x="290" y="231" text-anchor="middle" fill="#c0e0ff">PP10</text>

    <rect x="260" y="298" width="60" height="36" rx="6" fill="rgba(128,200,255,0.25)" stroke="#80c8ff" stroke-width="2"/>
    <text x="290" y="321" text-anchor="middle" fill="#c0e0ff">PP01</text>

    <rect x="260" y="388" width="60" height="36" rx="6" fill="rgba(128,200,255,0.25)" stroke="#80c8ff" stroke-width="2"/>
    <text x="290" y="411" text-anchor="middle" fill="#c0e0ff">PP11</text>

    <!-- HA1 -->
    <rect x="460" y="248" width="80" height="36" rx="6" fill="rgba(128,240,160,0.25)" stroke="#80f0a0" stroke-width="2"/>
    <text x="500" y="271" text-anchor="middle" fill="#a0f0c0">XOR1</text>

    <rect x="460" y="328" width="80" height="36" rx="6" fill="rgba(128,200,255,0.25)" stroke="#80c8ff" stroke-width="2"/>
    <text x="500" y="351" text-anchor="middle" fill="#c0e0ff">AND5</text>

    <!-- HA2 -->
    <rect x="660" y="382" width="80" height="36" rx="6" fill="rgba(128,240,160,0.25)" stroke="#80f0a0" stroke-width="2"/>
    <text x="700" y="405" text-anchor="middle" fill="#a0f0c0">XOR2</text>

    <rect x="660" y="462" width="80" height="36" rx="6" fill="rgba(128,200,255,0.25)" stroke="#80c8ff" stroke-width="2"/>
    <text x="700" y="485" text-anchor="middle" fill="#c0e0ff">AND6</text>
  </g>

  <!-- ═══ Light grey wires (the rest of the circuit) ═══ -->
  <g stroke="#5a6a7a" stroke-width="1.4" fill="none" opacity="0.65">
    <!-- A1 → PP11 -->
    <path d="M 130 260 L 240 260 L 240 400 L 260 400"/>
    <!-- B1 → PP01, PP11 -->
    <path d="M 130 440 L 145 440 L 145 320 L 260 320"/>
    <path d="M 130 440 L 250 440 L 250 410 L 260 410"/>
    <!-- A0 → PP01 -->
    <path d="M 130 180 L 175 180 L 175 310 L 260 310"/>
    <!-- B0 → PP10 already in red -->
    <!-- PP10 → XOR1 (also feeds HA1) -->
    <path d="M 320 220 L 400 220 L 400 258 L 460 258"/>
    <!-- PP01 → XOR1, AND5 -->
    <path d="M 320 310 L 420 310 L 420 270 L 460 270"/>
    <!-- PP11 → XOR2, AND6 -->
    <path d="M 320 400 L 600 400 L 600 392 L 660 392"/>
    <path d="M 320 400 L 600 400 L 600 472 L 660 472"/>
    <!-- AND5 → AND6 -->
    <path d="M 540 350 L 620 350 L 620 482 L 660 482"/>
    <!-- XOR1 → Y1 -->
    <path d="M 540 266 L 1010 266"/>
    <!-- AND6 → Y3 -->
    <path d="M 740 472 L 880 472 L 880 535 L 1010 535"/>
  </g>

  <!-- ═══ Outputs ═══ -->
  <g font-size="20" font-weight="bold">
    <circle cx="1020" cy="130" r="14" fill="#1a1f2e" stroke="#ff9933" stroke-width="2"/>
    <text x="1020" y="136" text-anchor="middle" fill="#ff9933">Y0</text>
    <circle cx="1020" cy="266" r="14" fill="#1a1f2e" stroke="#ff9933" stroke-width="2"/>
    <text x="1020" y="272" text-anchor="middle" fill="#ff9933">Y1</text>
    <circle cx="1020" cy="400" r="14" fill="#1a1f2e" stroke="#ff9933" stroke-width="2"/>
    <text x="1020" y="406" text-anchor="middle" fill="#ff9933">Y2</text>
    <circle cx="1020" cy="535" r="14" fill="#1a1f2e" stroke="#ff9933" stroke-width="2"/>
    <text x="1020" y="541" text-anchor="middle" fill="#ff9933">Y3</text>
  </g>

  <!-- ═══ Summary banner under top half ═══ -->
  <text x="570" y="600" text-anchor="middle" fill="#ffc890" font-size="20" font-weight="bold">
    SETUP: A1/B0 (or A0/B1) → PP10/PP01 → AND5 → XOR2 → Y2  =  390 ps     (תאומים)
  </text>
  <text x="570" y="625" text-anchor="middle" fill="#ffc890" font-size="20" font-weight="bold">
    HOLD:   A0/B0 → PP00 → Y0  =  120 ps
  </text>

  <!-- ════════ Section divider ════════ -->
  <line x1="40" y1="660" x2="1100" y2="660" stroke="#3a4a5a" stroke-width="1.2" stroke-dasharray="6,4"/>

  <!-- ═══════════════════════════════════════════════════════════
       SECTION 2 — Gantt chart of all 9 unique paths
                   (shifted down by 680px via <g transform>)
       ═══════════════════════════════════════════════════════════ -->
  <g transform="translate(0, 680)">

  <text x="570" y="44" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    כל 9 המסלולים — Gantt of gate delays
  </text>
  <text x="570" y="72" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">
    AND 120 ps · XOR 150 ps  ·  no OR in this circuit  ·  Scale: 1 ps = 1.5 px
  </text>

  <!-- =========== LEGEND (color key) =========== -->
  <g transform="translate(60, 100)">
    <rect x="0" y="0" width="30" height="22" rx="3" fill="rgba(128,200,255,0.4)" stroke="#80c8ff" stroke-width="1.4"/>
    <text x="40" y="16" fill="#80c8ff" font-size="18" font-weight="bold">AND (120 ps)</text>
    <rect x="200" y="0" width="30" height="22" rx="3" fill="rgba(128,240,160,0.4)" stroke="#80f0a0" stroke-width="1.4"/>
    <text x="240" y="16" fill="#80f0a0" font-size="18" font-weight="bold">XOR (150 ps)</text>
  </g>

  <!-- =========== Column headers =========== -->
  <text x="60" y="172"  fill="#a0a0c0" font-size="18" font-weight="bold">קלטים</text>
  <text x="190" y="172" fill="#a0a0c0" font-size="18" font-weight="bold">יעד</text>
  <text x="280" y="172" fill="#a0a0c0" font-size="18" font-weight="bold">שערים בנתיב (רוחב = delay)</text>
  <text x="940" y="172" fill="#a0a0c0" font-size="18" font-weight="bold">סה"כ</text>
  <line x1="50" y1="180" x2="1100" y2="180" stroke="#3a4a5a" stroke-width="1.2"/>

  <!-- =========== Path bars (sorted ascending by delay) =========== -->
  ${(() => {
    const C = { AND: { fill: 'rgba(128,200,255,0.4)', stroke: '#80c8ff', txt: '#c0e0ff' },
                XOR: { fill: 'rgba(128,240,160,0.4)', stroke: '#80f0a0', txt: '#a0f0c0' } };
    const paths = [
      { src: 'A0 / B0', dst: 'Y0', gates: [['PP00', 'AND', 120]],                                                total: 120, tag: 'shortest' },
      { src: 'A1 / B1', dst: 'Y3', gates: [['PP11', 'AND', 120], ['AND6', 'AND', 120]],                          total: 240, tag: null },
      { src: 'A1 / B0', dst: 'Y1', gates: [['PP10', 'AND', 120], ['XOR1', 'XOR', 150]],                          total: 270, tag: null },
      { src: 'A0 / B1', dst: 'Y1', gates: [['PP01', 'AND', 120], ['XOR1', 'XOR', 150]],                          total: 270, tag: null },
      { src: 'A1 / B1', dst: 'Y2', gates: [['PP11', 'AND', 120], ['XOR2', 'XOR', 150]],                          total: 270, tag: null },
      { src: 'A1 / B0', dst: 'Y3', gates: [['PP10', 'AND', 120], ['AND5', 'AND', 120], ['AND6', 'AND', 120]],    total: 360, tag: null },
      { src: 'A0 / B1', dst: 'Y3', gates: [['PP01', 'AND', 120], ['AND5', 'AND', 120], ['AND6', 'AND', 120]],    total: 360, tag: null },
      { src: 'A1 / B0', dst: 'Y2', gates: [['PP10', 'AND', 120], ['AND5', 'AND', 120], ['XOR2', 'XOR', 150]],    total: 390, tag: 'critical' },
      { src: 'A0 / B1', dst: 'Y2', gates: [['PP01', 'AND', 120], ['AND5', 'AND', 120], ['XOR2', 'XOR', 150]],    total: 390, tag: 'critical' },
    ];
    const ROW_H = 60;
    const BAR_H = 40;
    const Y0 = 196;
    const X0 = 280;
    const PX_PER_PS = 1.5;
    return paths.map((p, i) => {
      const y = Y0 + i * ROW_H;
      const barY = y + (ROW_H - BAR_H) / 2 - 6;
      let cursorX = X0;
      const segs = p.gates.map(([name, kind, ms]) => {
        const w = ms * PX_PER_PS;
        const col = C[kind];
        const seg = `<rect x="${cursorX}" y="${barY}" width="${w}" height="${BAR_H}" rx="4" fill="${col.fill}" stroke="${col.stroke}" stroke-width="1.8"/>
          <text x="${cursorX + w / 2}" y="${barY + 18}" text-anchor="middle" fill="${col.txt}" font-size="18" font-weight="bold">${name}</text>
          <text x="${cursorX + w / 2}" y="${barY + 34}" text-anchor="middle" fill="${col.txt}" font-size="16">${ms} ps</text>`;
        cursorX += w + 3;
        return seg;
      }).join('');
      // Tag badge
      let badge = '';
      if (p.tag === 'shortest') {
        badge = `<rect x="990" y="${barY + 5}" width="110" height="30" rx="6" fill="rgba(128,240,160,0.18)" stroke="#80f0a0" stroke-width="1.6"/>
                 <text x="1045" y="${barY + 25}" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="18">✓ shortest</text>`;
      } else if (p.tag === 'critical') {
        badge = `<rect x="990" y="${barY + 5}" width="110" height="30" rx="6" fill="rgba(255,96,96,0.18)" stroke="#ff6060" stroke-width="1.6"/>
                 <text x="1045" y="${barY + 25}" text-anchor="middle" fill="#ff8080" font-weight="bold" font-size="18">✗ critical</text>`;
      }
      const totalColor = p.tag === 'shortest' ? '#80f0a0' : (p.tag === 'critical' ? '#ff8080' : '#ffc890');
      return `<text x="60" y="${barY + 26}" fill="#cca040" font-size="18" font-weight="bold">${p.src}</text>
        <text x="190" y="${barY + 26}" fill="#ff9933" font-size="20" font-weight="bold">→ ${p.dst}</text>
        ${segs}
        <text x="935" y="${barY + 26}" text-anchor="end" fill="${totalColor}" font-size="20" font-weight="bold">${p.total} ps</text>
        ${badge}`;
    }).join('');
  })()}

  <!-- =========== SUMMARY box =========== -->
  <rect x="40" y="760" width="1060" height="220" rx="10" fill="rgba(64,80,100,0.06)" stroke="#3a4a5a" stroke-width="1.4"/>
  <text x="570" y="800" text-anchor="middle" fill="#ffc890" font-weight="bold" font-size="24">
    סיכום timing
  </text>

  <!-- Setup card -->
  <rect x="70" y="826" width="490" height="140" rx="8" fill="rgba(255,96,96,0.05)" stroke="rgba(255,96,96,0.5)" stroke-width="1.6"/>
  <text x="315" y="856" text-anchor="middle" fill="#ff8080" font-weight="bold" font-size="20">Critical path (setup)</text>
  <text x="90" y="890" fill="#c8b090" font-size="20">A1/B0 → PP10 → AND5 → XOR2 → Y2 = <tspan fill="#ff8080" font-weight="bold">390 ps</tspan></text>
  <text x="90" y="918" fill="#c8b090" font-size="18" font-style="italic">(תאום: דרך PP01 — אותו זמן)</text>
  <text x="90" y="946" fill="#80f0a0" font-size="20" font-weight="bold">T_clk ≥ 470 ps  ⇒  Fmax ≈ 2.13 GHz</text>

  <!-- Hold card -->
  <rect x="580" y="826" width="490" height="140" rx="8" fill="rgba(128,240,160,0.05)" stroke="rgba(128,240,160,0.5)" stroke-width="1.6"/>
  <text x="825" y="856" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="20">Shortest path (hold)</text>
  <text x="600" y="890" fill="#c8b090" font-size="20">A0/B0 → PP00 → Y0 = <tspan fill="#80f0a0" font-weight="bold">120 ps</tspan></text>
  <text x="600" y="918" fill="#c8b090" font-size="18" font-style="italic">(שער יחיד — הקצר ביותר במעגל)</text>
  <text x="600" y="946" fill="#80f0a0" font-size="20" font-weight="bold">120 ≥ 10 ps ✓ (בטוח)</text>

  </g><!-- end translate(0, 680) wrapper -->
</svg>`,
        circuit: () => build(() => {
          // Focused circuit for part ב: same 8-gate multiplier as part א.
          // Student plays with it to trace paths and verify delays.
          const a0 = h.input(80,  100, 'A0');  a0.fixedValue = 1;
          const a1 = h.input(80,  200, 'A1');  a1.fixedValue = 1;
          const b0 = h.input(80,  340, 'B0');  b0.fixedValue = 1;
          const b1 = h.input(80,  440, 'B1');  b1.fixedValue = 1;

          const pp00 = h.gate('AND', 260, 130);
          const pp10 = h.gate('AND', 260, 220);
          const pp01 = h.gate('AND', 260, 310);
          const pp11 = h.gate('AND', 260, 400);

          const xor1 = h.gate('XOR', 480, 265);
          const and5 = h.gate('AND', 480, 345);

          const xor2 = h.gate('XOR', 680, 400);
          const and6 = h.gate('AND', 880, 440);

          const y0 = h.output(1040, 130, 'Y0');
          const y1 = h.output(1040, 265, 'Y1');
          const y2 = h.output(1040, 400, 'Y2');
          const y3 = h.output(1040, 480, 'Y3');

          return {
            nodes: [a0, a1, b0, b1, pp00, pp10, pp01, pp11, xor1, and5, xor2, and6, y0, y1, y2, y3],
            wires: [
              h.wire(a0.id, pp00.id, 0),
              h.wire(b0.id, pp00.id, 1),
              h.wire(a1.id, pp10.id, 0),
              h.wire(b0.id, pp10.id, 1),
              h.wire(a0.id, pp01.id, 0),
              h.wire(b1.id, pp01.id, 1),
              h.wire(a1.id, pp11.id, 0),
              h.wire(b1.id, pp11.id, 1),
              h.wire(pp00.id, y0.id, 0),
              h.wire(pp10.id, xor1.id, 0),
              h.wire(pp01.id, xor1.id, 1),
              h.wire(pp10.id, and5.id, 0),
              h.wire(pp01.id, and5.id, 1),
              h.wire(xor1.id, y1.id, 0),
              h.wire(pp11.id, xor2.id, 0),
              h.wire(and5.id, xor2.id, 1),
              h.wire(pp11.id, and6.id, 0),
              h.wire(and5.id, and6.id, 1),
              h.wire(xor2.id, y2.id, 0),
              h.wire(and6.id, y3.id, 0),
            ],
          };
        }),
      },

      // ─────────────────────────────────────────────────────────
      // Part ג — Minimal pipelining: setup budget = 300 ps.
      //   Critical = 390 ps > 300 ps  ⇒  violation.
      //   Solution: insert ONE FF on the C1 wire (between AND5 and
      //   the {XOR2, AND6} consumers). This splits the 390 ps path:
      //     Stage 1 = PP10/PP01 → AND5  = 240 ps ✓
      //     Stage 2 = XOR2 (or AND6)    = 150 ps ✓
      //   Other paths bypass → balancing issue addressed in ד.
      // ─────────────────────────────────────────────────────────
      {
        label: 'ג',
        question: 'נתון כעת: **תקציב ה-setup המקסימלי = 300 ps**. ה-critical path במעגל הוא 390 ps (מסעיף ב\'). תן **פתרון מינימלי** שיפתור את הבעיה — חיתוך אחד, FF יחיד. תאר את המבנה החדש ואת ה-delay של כל שלב.',
        hints: [
          'בעיה: 390 ps > 300 ps. צריך **לקצר את הנתיב הקומבינטורי** המקסימלי ל-≤ 300 ps.',
          'אופציות: (1) להחליף שערים ב-cells מהירים יותר; (2) לשנות מבנה ל-Wallace tree; (3) **pipelining** — שבירת הנתיב עם FF.',
          'למעגל קטן כזה — pipelining הוא הפתרון הפשוט והנכון. השאלה: **איפה לחתוך?**',
          'המסלול הקריטי הוא \`PP10 → AND5 → XOR2 → Y2\` (3 שערים, 390 ps). יש גם תאום סימטרי דרך \`PP01\`.',
          'חתך מצוין: על ה-wire של **C1 = AND5.out** — מקום שמשרת **גם** XOR2 וגם AND6.',
          'שלב 1 = PP layer + AND5 = 120 + 120 = 240 ps ✓ · שלב 2 = max(XOR2, AND6) = 150 ps ✓',
          'יתרון נוסף של חיתוך על C1: שני המסלולים הקריטיים התאומים (דרך PP10 ודרך PP01) מטופלים יחד — שניהם עוברים דרך AND5.',
        ],
        answer:
`**הפתרון המינימלי: FF יחיד על ה-wire של C1 (יציאת AND5).**

### למה דווקא על C1?

המסלול הקריטי = \`PP10/PP01 → AND5 → XOR2 → Y2\` = 390 ps. החיתוך הנכון הוא **בנקודה המוצקה שאחרי AND5** — wire ה-\`C1\`.

| מיקום FF | שלב 1 | שלב 2 | תועלת | חיסרון |
|---|---:|---:|---|---|
| לפני AND5 | 120 ps | 270 ps | מאזן? | מספר נתיבים גדל |
| **על C1 (אחרי AND5)** | **240 ps** | **150 ps** | חתך נקי, FF יחיד | שלבים לא מאוזנים לחלוטין |
| על PP11 | אין שימוש... |||  לא רלוונטי |

החיתוך **אחרי AND5** משרת בו-זמנית את שני הצרכנים של C1 (XOR2 ו-AND6) — ולכן **FF אחד מספיק**.

### המבנה החדש

| שלב | תוכן | delay |
|---|---|---:|
| Stage 1 | (PP10 ‖ PP01) → AND5 | 240 ps |
| Stage 2 | XOR2 (Y2) או AND6 (Y3) | 150 ps |

נוסיף **FF יחיד — \`FF_C1\`** — שיתפוס את \`C1 = AND5.out\` בין שני השלבים. **ראה הדיאגרמה בראש דף התשובה.**

### בדיקת timing אחרי הפתרון

- שלב 1: 240 ps ✓ (< 300)
- שלב 2: 150 ps ✓ (< 300)

הכי גדול: **240 ps < 300 ps** ✓ — אין יותר setup violation על המסלול הקריטי.

### אבל... יש עוד עבודה

\`FF_C1\` לבד **פוגע בנכונות**:
- XOR2 ו-AND6 מקבלים את \`C1_pipe\` (מהמחזור הקודם) יחד עם \`PP11\` (combinational, מחזור נוכחי) → תוצאה שגויה.
- Y0, Y1 יוצאים combinational ב-cycle 1; Y2, Y3 יוצאים ב-cycle 2 → **אי-איזון יציאות**.

זה מטופל בסעיף ד'.`,
        interviewerMindset:
`**שאלת פתרון** מעשית. המראיין מחפש:
1. **שאתה לא קופץ ל"להחליף cells"** — pipelining היא הטכניקה היסודית שהוא רוצה לראות.
2. **שאתה בוחר את הנקודה הנכונה לחיתוך** — חיתוך על \`C1\` חוסך FF נוסף (אם היית חותך לפני AND5, היית צריך 2 FFs — אחד לכל קלט של AND5). הסטודנט המעולה רואה את ה-confluence point.
3. **שאתה מתעדף שלמות הפתרון** — אומר מיד שיצרת בעיה חדשה (סנכרון) שצריכה טיפול בסעיף הבא.
4. **שאתה זוכר את שני המסלולים הקריטיים התאומים** (PP10 ו-PP01) — שניהם מטופלים על-ידי אותו FF_C1.

**שאלת המשך מובטחת**: "מה הבעיה החדשה שיצרת?" → ראה סעיף ד.

**שאלת bonus**: "מה היה קורה אם הייתי חותך לפני AND5?" → צריך 2 FFs (אחד על PP10, אחד על PP01) ושלב 1 הוא רק 120 ps — לא מאוזן ו-area יקר יותר. ה-confluence point של AND5 הוא ה-design sweet spot.`,
        expectedAnswers: [
          'pipeline', 'pipelining',
          'FF', 'register', 'flip-flop',
          'split path', 'break',
          '240', '150', '300',
          'C1', 'AND5',
          'balanced',
        ],
        answerSchematic: `
<svg viewBox="0 0 1140 700" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Minimal pipelining: a single FF_C1 on the C1 wire between AND5 and the consumers XOR2/AND6.">

  <defs>
    <linearGradient id="pipeBandM" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"  stop-color="#cc66ff" stop-opacity="0"/>
      <stop offset="20%" stop-color="#cc66ff" stop-opacity="0.14"/>
      <stop offset="80%" stop-color="#cc66ff" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#cc66ff" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <text x="570" y="40" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    פתרון מינימלי — FF יחיד על C1
  </text>

  <!-- ════════ Pipeline band (purple background) ════════ -->
  <rect x="500" y="110" width="140" height="470" rx="10"
        fill="url(#pipeBandM)" stroke="#cc66ff" stroke-width="1.8" stroke-dasharray="6,4"/>
  <text x="570" y="100" text-anchor="middle" fill="#cc99ff" font-size="20" font-weight="bold">PIPELINE FF</text>

  <!-- ════════ Stage headers ════════ -->
  <rect x="50"  y="80" width="450" height="32" rx="6" fill="rgba(128,200,255,0.10)" stroke="#80c8ff" stroke-width="1.4"/>
  <text x="275" y="102" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">STAGE 1 (PP + AND5, ≤ 240 ps)</text>

  <rect x="640" y="80" width="460" height="32" rx="6" fill="rgba(255,144,80,0.10)" stroke="#ff9050" stroke-width="1.4"/>
  <text x="870" y="102" text-anchor="middle" fill="#ff9050" font-size="18" font-weight="bold">STAGE 2 (XOR2 / AND6, ≤ 150 ps)</text>

  <!-- ════════ Inputs (left) ════════ -->
  <g font-size="20" font-weight="bold">
    <circle cx="70" cy="155" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="70" y="161" text-anchor="middle" fill="#cca040">A0</text>
    <circle cx="70" cy="260" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="70" y="266" text-anchor="middle" fill="#cca040">A1</text>
    <circle cx="70" cy="380" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="70" y="386" text-anchor="middle" fill="#cca040">B0</text>
    <circle cx="70" cy="490" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="70" y="496" text-anchor="middle" fill="#cca040">B1</text>
  </g>

  <!-- ════════ Bypass (non-pipelined) wires — dashed grey ════════ -->
  <g stroke="#5a6e80" stroke-width="1.6" fill="none">
    <!-- A0 → PP00, PP01 -->
    <path d="M 90 155 L 220 155 L 220 175 L 250 175"/>
    <path d="M 220 155 L 220 335 L 250 335"/>
    <circle cx="220" cy="155" r="3.5" fill="#5a6e80"/>
    <!-- B0 → PP00, PP10 -->
    <path d="M 90 380 L 235 380 L 235 185 L 250 185"/>
    <path d="M 235 380 L 235 245 L 250 245"/>
    <circle cx="235" cy="380" r="3.5" fill="#5a6e80"/>
    <!-- A1 → PP10, PP11 -->
    <path d="M 90 260 L 230 260 L 230 235 L 250 235"/>
    <path d="M 230 260 L 230 425 L 250 425"/>
    <circle cx="230" cy="260" r="3.5" fill="#5a6e80"/>
    <!-- B1 → PP01, PP11 -->
    <path d="M 90 490 L 245 490 L 245 345 L 250 345"/>
    <path d="M 245 490 L 245 435 L 250 435"/>
    <circle cx="245" cy="490" r="3.5" fill="#5a6e80"/>

    <!-- PP00 → Y0 (BYPASS — combinational, dashed) -->
    <path d="M 320 180 L 1010 180" stroke-dasharray="6,5"/>

    <!-- PP10 → XOR1.in0 (combinational, bypass) -->
    <path d="M 320 240 L 410 240 L 410 280 L 430 280" stroke-dasharray="6,5"/>
    <!-- PP01 → XOR1.in1 (combinational, bypass) -->
    <path d="M 320 340 L 410 340 L 410 290 L 430 290" stroke-dasharray="6,5"/>
    <!-- XOR1 → Y1 (BYPASS) -->
    <path d="M 490 285 L 1010 285" stroke-dasharray="6,5"/>

    <!-- PP11 → XOR2.in0 (BYPASS — crosses pipeline band, dashed) -->
    <path d="M 320 430 L 680 430 L 680 410 L 700 410" stroke-dasharray="6,5"/>
    <!-- PP11 → AND6.in0 (BYPASS) -->
    <path d="M 320 430 L 680 430 L 680 525 L 700 525" stroke-dasharray="6,5"/>
    <circle cx="680" cy="430" r="3.5" fill="#5a6e80"/>
  </g>

  <!-- ════════ CRITICAL pipelined path (red, on top) ════════
       PP10/PP01 → AND5 → FF_C1 → {XOR2, AND6} -->
  <g stroke="#ff6060" stroke-width="3.5" fill="none" opacity="0.8">
    <!-- PP10 → AND5.in0 -->
    <path d="M 320 240 L 420 240 L 420 370 L 440 370"/>
    <!-- PP01 → AND5.in1 -->
    <path d="M 320 340 L 425 340 L 425 380 L 440 380"/>
    <!-- AND5 → FF_C1 -->
    <path d="M 510 375 L 540 375"/>
    <!-- FF_C1 → XOR2.in1 -->
    <path d="M 630 375 L 680 375 L 680 420 L 700 420"/>
    <!-- FF_C1 → AND6.in1 (branch) -->
    <path d="M 660 375 L 660 535 L 700 535"/>
    <circle cx="660" cy="375" r="3.5" fill="#ff6060"/>
    <!-- XOR2 → Y2 -->
    <path d="M 760 415 L 1010 415"/>
    <!-- AND6 → Y3 -->
    <path d="M 760 530 L 1010 530"/>
  </g>

  <!-- ════════ PP layer (4 ANDs) ════════ -->
  <g>
    <path d="M 250 162 L 280 162 A 22 22 0 0 1 280 208 L 250 208 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="266" y="182" text-anchor="middle" fill="#80c8ff" font-size="16" font-weight="bold">PP00</text>
    <text x="266" y="197" text-anchor="middle" fill="#a0c0d0" font-size="16">120 ps</text>

    <path d="M 250 222 L 280 222 A 22 22 0 0 1 280 268 L 250 268 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="266" y="242" text-anchor="middle" fill="#80c8ff" font-size="16" font-weight="bold">PP10</text>
    <text x="266" y="257" text-anchor="middle" fill="#a0c0d0" font-size="16">120 ps</text>

    <path d="M 250 322 L 280 322 A 22 22 0 0 1 280 368 L 250 368 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="266" y="342" text-anchor="middle" fill="#80c8ff" font-size="16" font-weight="bold">PP01</text>
    <text x="266" y="357" text-anchor="middle" fill="#a0c0d0" font-size="16">120 ps</text>

    <path d="M 250 412 L 280 412 A 22 22 0 0 1 280 458 L 250 458 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="266" y="432" text-anchor="middle" fill="#80c8ff" font-size="16" font-weight="bold">PP11</text>
    <text x="266" y="447" text-anchor="middle" fill="#a0c0d0" font-size="16">120 ps</text>
  </g>

  <!-- ════════ HA1 — XOR1 (S-side) + AND5 (C1-side, critical) ════════ -->
  <g>
    <path d="M 430 260 Q 455 285, 430 310 L 460 310 Q 485 310, 500 285 Q 485 260, 460 260 Z"
          fill="#1a3a2a" stroke="#80f0a0" stroke-width="2"/>
    <text x="468" y="282" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">XOR1</text>
    <text x="468" y="298" text-anchor="middle" fill="#a0c0d0" font-size="16">150 ps</text>
  </g>
  <g>
    <path d="M 440 350 L 470 350 A 25 25 0 0 1 470 400 L 440 400 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="458" y="372" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">AND5</text>
    <text x="458" y="388" text-anchor="middle" fill="#a0c0d0" font-size="16">120 ps</text>
  </g>

  <!-- ════════ Single Pipeline FF — FF_C1 ════════ -->
  <g>
    <rect x="540" y="350" width="90" height="50" rx="6" fill="#1a1428" stroke="#cc66ff" stroke-width="3"/>
    <text x="585" y="372" text-anchor="middle" fill="#cc99ff" font-size="18" font-weight="bold">FF_C1</text>
    <text x="585" y="389" text-anchor="middle" fill="#fff080" font-size="16">★ הפתרון</text>
  </g>

  <!-- ════════ HA2 — XOR2 + AND6 ════════ -->
  <g>
    <path d="M 700 392 Q 725 417, 700 442 L 730 442 Q 755 442, 770 417 Q 755 392, 730 392 Z"
          fill="#1a3a2a" stroke="#80f0a0" stroke-width="2"/>
    <text x="738" y="414" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">XOR2</text>
    <text x="738" y="430" text-anchor="middle" fill="#a0c0d0" font-size="16">150 ps</text>
  </g>
  <g>
    <path d="M 700 507 L 730 507 A 25 25 0 0 1 730 557 L 700 557 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="718" y="529" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">AND6</text>
    <text x="718" y="545" text-anchor="middle" fill="#a0c0d0" font-size="16">120 ps</text>
  </g>

  <!-- ════════ Outputs ════════ -->
  <g font-size="20" font-weight="bold">
    <circle cx="1030" cy="180" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2" stroke-dasharray="5,3"/>
    <text x="1030" y="186" text-anchor="middle" fill="#cca040">Y0</text>
    <circle cx="1030" cy="285" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2" stroke-dasharray="5,3"/>
    <text x="1030" y="291" text-anchor="middle" fill="#cca040">Y1</text>
    <circle cx="1030" cy="415" r="22" fill="#0a1825" stroke="#ff6060" stroke-width="2.6"/>
    <text x="1030" y="421" text-anchor="middle" fill="#ff6060">Y2</text>
    <circle cx="1030" cy="530" r="22" fill="#0a1825" stroke="#ff6060" stroke-width="2.6"/>
    <text x="1030" y="536" text-anchor="middle" fill="#ff6060">Y3</text>
  </g>

  <!-- Critical-path badge -->
  <rect x="740" y="585" width="290" height="32" rx="6" fill="rgba(255,96,96,0.14)" stroke="#ff6060" stroke-width="1.6"/>
  <text x="885" y="606" text-anchor="middle" fill="#ff8080" font-size="18" font-weight="bold">SETUP: 240 ps | 150 ps ≤ 300 ✓</text>

  <!-- Bottom summary -->
  <rect x="40" y="630" width="1060" height="58" rx="10" fill="rgba(64,80,100,0.06)" stroke="#3a4a5a" stroke-width="1.4"/>
  <text x="570" y="660" text-anchor="middle" fill="#ffc890" font-weight="bold" font-size="20">
    FF יחיד (FF_C1) שובר את ה-390 ps לשני שלבים: 240 + 150 ≤ 300 ✓ — אבל Y0,Y1 לא פוייפלינו → מטופל ב-ד'
  </text>
</svg>`,
        circuit: () => build(() => {
          // Minimal pipelining: ONE FF (FF_C1) on the C1 wire between
          // AND5 and the consumers XOR2/AND6. The PP→Y0 and PP→XOR1→Y1
          // paths bypass — creating the imbalance fixed in ד.
          const clk = h.clock(80, 600, 'CLK');
          const a0 = h.input(80, 100, 'A0');  a0.fixedValue = 1;
          const a1 = h.input(80, 200, 'A1');  a1.fixedValue = 1;
          const b0 = h.input(80, 340, 'B0');  b0.fixedValue = 1;
          const b1 = h.input(80, 440, 'B1');  b1.fixedValue = 1;

          const pp00 = h.gate('AND', 260, 130);
          const pp10 = h.gate('AND', 260, 220);
          const pp01 = h.gate('AND', 260, 310);
          const pp11 = h.gate('AND', 260, 400);

          const xor1 = h.gate('XOR', 460, 265);
          const and5 = h.gate('AND', 460, 345);

          // Single pipeline FF on the C1 wire
          const ffC1 = h.ffD(620, 345, 'FF_C1');

          const xor2 = h.gate('XOR', 800, 400);
          const and6 = h.gate('AND', 800, 480);

          const y0 = h.output(1000, 130, 'Y0');
          const y1 = h.output(1000, 265, 'Y1');
          const y2 = h.output(1000, 400, 'Y2');
          const y3 = h.output(1000, 480, 'Y3');

          return {
            nodes: [
              clk, a0, a1, b0, b1,
              pp00, pp10, pp01, pp11,
              xor1, and5,
              ffC1,
              xor2, and6,
              y0, y1, y2, y3,
            ],
            wires: [
              // PP layer
              h.wire(a0.id, pp00.id, 0),
              h.wire(b0.id, pp00.id, 1),
              h.wire(a1.id, pp10.id, 0),
              h.wire(b0.id, pp10.id, 1),
              h.wire(a0.id, pp01.id, 0),
              h.wire(b1.id, pp01.id, 1),
              h.wire(a1.id, pp11.id, 0),
              h.wire(b1.id, pp11.id, 1),

              // HA1
              h.wire(pp10.id, xor1.id, 0),
              h.wire(pp01.id, xor1.id, 1),
              h.wire(pp10.id, and5.id, 0),
              h.wire(pp01.id, and5.id, 1),

              // C1 goes through FF_C1
              h.wire(and5.id, ffC1.id, 0),
              h.wire(clk.id,  ffC1.id, 1, 0, { isClockWire: true }),

              // HA2 sees pipelined C1 + bypass PP11 (combinational)
              h.wire(pp11.id, xor2.id, 0),
              h.wire(ffC1.id, xor2.id, 1),
              h.wire(pp11.id, and6.id, 0),
              h.wire(ffC1.id, and6.id, 1),

              // Outputs — Y0, Y1 bypass; Y2, Y3 are 1 cycle delayed
              h.wire(pp00.id, y0.id, 0),
              h.wire(xor1.id, y1.id, 0),
              h.wire(xor2.id, y2.id, 0),
              h.wire(and6.id, y3.id, 0),
            ],
          };
        }),
      },

      // ─────────────────────────────────────────────────────────
      // Part ד — Pipeline balancing
      //   FF_C1 alone (from ג) creates two issues:
      //     (1) functional — XOR2/AND6 see PP11 (combinational, cycle N)
      //         alongside C1_pipe (cycle N−1) → wrong product.
      //     (2) imbalance — Y0/Y1 exit cycle 1, Y2/Y3 exit cycle 2.
      //   Fix: add FF_PP11, FF_Y0, FF_Y1 so EVERY wire crossing the
      //   pipeline boundary is registered. Total = 4 FFs, latency = 2,
      //   throughput preserved.
      // ─────────────────────────────────────────────────────────
      {
        label: 'ד',
        question: 'הפתרון מסעיף ג\' הוצב במקום — אבל הוא יצר **בעיה חדשה** (למעשה שתיים). מהן הבעיות, ומה אתה מציע כדי לטפל בהן?',
        hints: [
          'ה-FF היחיד (FF_C1) חוצה את שלב ה-pipeline על קו אחד בלבד. כל קו אחר שחוצה את אותו שלב הוא בעיה.',
          'בעיה 1 (פונקציונלית): XOR2 ו-AND6 מקבלים **\`C1_pipe\`** (cycle N−1, יצא מ-FF_C1) ויחד עם **\`PP11\`** (cycle N, combinational). שני הזמנים לא תואמים → תוצאה שגויה.',
          'בעיה 2 (אי-איזון יציאות): Y0, Y1 יוצאים combinational ב-cycle 1. Y2, Y3 מגיעים cycle אחד מאוחר יותר. ה-consumer לא יודע מתי לדגום.',
          'הפתרון: כל wire שחוצה את שלב ה-pipeline חייב לעבור FF. סך הכל יש **4 קווים שחוצים**: C1, PP11, Y0 (=PP00), Y1 (=XOR1).',
          'תוסיף 3 FFs נוספים: \`FF_PP11\`, \`FF_Y0\`, \`FF_Y1\`. ביחד עם \`FF_C1\` יש 4 FFs.',
          'אחרי האיזון: stage 1 = max(PP00=120, XOR1=270, AND5=240, PP11=120) = **270 ps** ✓ · stage 2 = max(XOR2=150, AND6=120) = **150 ps** ✓.',
        ],
        answer:
`**הבעיות**: FF_C1 לבד יוצר שתי בעיות:

1. **שגיאה פונקציונלית** — XOR2 ו-AND6 מקבלים את \`C1_pipe\` מ-cycle N−1, אבל את \`PP11\` ישירות מהקלט הנוכחי (cycle N). הם **לא מסונכרנים** → התוצאה לא Y2/Y3 של אף אופרנד.
2. **אי-איזון יציאות** — Y0 ו-Y1 יוצאים combinational באותו cycle של הקלט; Y2, Y3 cycle אחרי. ה-receiver שמצפה ל-Y3..Y0 כקבוצה לא יודע מתי לדגום.

**הפתרון**: להוסיף **3 FFs נוספים** — \`FF_PP11\`, \`FF_Y0\`, \`FF_Y1\` — כך שכל wire שחוצה את שלב ה-pipeline עובר דרך FF. **ראה הדיאגרמה.**

### Mapping של ה-4 FFs

| FF | מהיכן | משמש את | מטרה |
|---|---|---|---|
| FF_C1 (מ-ג') | AND5.out | XOR2, AND6 | חתך נתיב קריטי |
| **FF_PP11** ✨ | PP11.out | XOR2, AND6 | סנכרון עם C1_pipe |
| **FF_Y0** ✨ | PP00.out | Y0 (output) | סנכרון יציאה |
| **FF_Y1** ✨ | XOR1.out | Y1 (output) | סנכרון יציאה |

### בדיקת timing אחרי האיזון

| שלב | תוכן (max delay) | delay | ≤ 300 ? |
|---|---|---:|:---:|
| Stage 1 | max(PP00, AND5, **XOR1**, PP11) | **270 ps** | ✓ |
| Stage 2 | max(XOR2, AND6) | **150 ps** | ✓ |

⚠ שים לב: \`XOR1\` (= PP→XOR1 = 270 ps) הוא **הקריטי החדש** ב-stage 1 אחרי האיזון.

### Trade-offs

- **Latency** הוכפלה ל-2 cycles — בלתי-הפיך, אינהרנטי ל-pipelining.
- **Area**: סה"כ 4 FFs.
- **Power**: יותר switching → ~10-20% תוספת.
- **Throughput** **נשמרת** — וקטור חדש בכל clock.`,
        interviewerMindset:
`**שאלה המשכית קלאסית.** המראיין מחפש:
1. **שאתה מבדיל בין latency ל-throughput** — אלה שני מדדים שונים. הסטודנט שאומר "pipelining מאט את המעגל" טועה — הוא מאט את ה-latency, לא את ה-throughput.
2. **שאתה מזהה את שתי הבעיות** — אי-איזון יציאות (ויזואלי, קל) וגם שגיאה פונקציונלית של XOR2/AND6 (חשוב יותר!).
3. **שאתה ספור 3 FFs נוספים, לא יותר ולא פחות** — סטודנט שמוסיף FF גם על PP10 ו-PP01 מבזבז area. שלושה FFs בדיוק.
4. **שאתה מזהה את ה-critical החדש ב-stage 1** — אחרי האיזון, XOR1 (270 ps) מחליף את AND5 (240 ps) כקריטי החדש של stage 1. זה דיוק ש-stat tools היו מגלים מיד.

**שאלת המשך**: "מה אם אני לא יכול להרשות לעצמי 3 FFs נוספים?" → אז:
- לקבל את ה-latency הגבוה (לא לעשות pipelining).
- לחזור ל-faster cells או architecture שונה.
- לתת ל-balancing להיות חלקי — אבל אז התוצאה שגויה פונקציונלית, לא רק "imbalanced".

**שאלת bonus**: "מה הקשר ל-retiming?" → Retiming הוא טכניקת STA שמזיזה FFs קיימים סביב לוגיקה כדי לאזן stages. במקום להוסיף FFs חדשים, היא מנצלת FFs קיימים בזרימה הכוללת.`,
        expectedAnswers: [
          'latency', 'throughput', 'השהיה',
          'pipeline imbalance', 'balance', 'balancing',
          '2 cycles', 'one cycle later',
          'add FF', 'parallel FF', '3 FFs', '4 FFs',
          'PP11', 'XOR1', 'PP00',
          'Y0', 'Y1', 'sync', 'synchronization',
          '270', '150',
        ],
        answerSchematic: `
<svg viewBox="0 0 1140 720" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Balanced pipelined multiplier — 4 FFs total (FF_C1 + 3 added).">

  <defs>
    <linearGradient id="pipeBand3" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"  stop-color="#cc66ff" stop-opacity="0"/>
      <stop offset="20%" stop-color="#cc66ff" stop-opacity="0.14"/>
      <stop offset="80%" stop-color="#cc66ff" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#cc66ff" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <text x="570" y="40" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    Pipeline מאוזן — 3 FFs נוספים (FF_PP11, FF_Y0, FF_Y1)
  </text>

  <!-- Pipeline band -->
  <rect x="540" y="110" width="140" height="500" rx="10"
        fill="url(#pipeBand3)" stroke="#cc66ff" stroke-width="1.8" stroke-dasharray="6,4"/>
  <text x="610" y="100" text-anchor="middle" fill="#cc99ff" font-size="20" font-weight="bold">PIPELINE FFs</text>

  <!-- Stage headers -->
  <rect x="50"  y="80" width="490" height="32" rx="6" fill="rgba(128,200,255,0.10)" stroke="#80c8ff" stroke-width="1.4"/>
  <text x="295" y="102" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">STAGE 1 (combinational ≤ 270 ps)</text>

  <rect x="680" y="80" width="420" height="32" rx="6" fill="rgba(255,144,80,0.10)" stroke="#ff9050" stroke-width="1.4"/>
  <text x="890" y="102" text-anchor="middle" fill="#ff9050" font-size="18" font-weight="bold">STAGE 2 (combinational ≤ 150 ps)</text>

  <!-- Inputs -->
  <g font-size="20" font-weight="bold">
    <circle cx="70" cy="155" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="70" y="161" text-anchor="middle" fill="#cca040">A0</text>
    <circle cx="70" cy="260" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="70" y="266" text-anchor="middle" fill="#cca040">A1</text>
    <circle cx="70" cy="380" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="70" y="386" text-anchor="middle" fill="#cca040">B0</text>
    <circle cx="70" cy="500" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="70" y="506" text-anchor="middle" fill="#cca040">B1</text>
  </g>

  <!-- Wires (solid grey — all now registered) -->
  <g stroke="#5a6e80" stroke-width="1.6" fill="none">
    <!-- A0 → PP00.in0, PP01.in0 -->
    <path d="M 90 155 L 220 155 L 220 175 L 250 175"/>
    <path d="M 220 155 L 220 335 L 250 335"/>
    <circle cx="220" cy="155" r="3.5" fill="#5a6e80"/>
    <!-- B0 → PP00.in1, PP10.in1 -->
    <path d="M 90 380 L 235 380 L 235 185 L 250 185"/>
    <path d="M 235 380 L 235 245 L 250 245"/>
    <circle cx="235" cy="380" r="3.5" fill="#5a6e80"/>
    <!-- A1 → PP10.in0, PP11.in0 -->
    <path d="M 90 260 L 230 260 L 230 235 L 250 235"/>
    <path d="M 230 260 L 230 425 L 250 425"/>
    <circle cx="230" cy="260" r="3.5" fill="#5a6e80"/>
    <!-- B1 → PP01.in1, PP11.in1 -->
    <path d="M 90 500 L 245 500 L 245 345 L 250 345"/>
    <path d="M 245 500 L 245 435 L 250 435"/>
    <circle cx="245" cy="500" r="3.5" fill="#5a6e80"/>

    <!-- PP00 → FF_Y0 -->
    <path d="M 320 185 L 555 185"/>
    <!-- PP10 → XOR1.in0 -->
    <path d="M 320 245 L 410 245 L 410 285 L 430 285"/>
    <!-- PP01 → XOR1.in1 -->
    <path d="M 320 335 L 410 335 L 410 295 L 430 295"/>
    <!-- XOR1 → FF_Y1 -->
    <path d="M 490 290 L 555 290"/>
    <!-- PP10 → AND5.in0 -->
    <path d="M 320 245 L 420 245 L 420 365 L 440 365"/>
    <!-- PP01 → AND5.in1 -->
    <path d="M 320 335 L 425 335 L 425 375 L 440 375"/>
    <!-- AND5 → FF_C1 -->
    <path d="M 510 370 L 555 370"/>
    <!-- PP11 → FF_PP11 -->
    <path d="M 320 430 L 555 430"/>

    <!-- FF_Y0 → Y0 (synced output) -->
    <path d="M 665 185 L 1010 185"/>
    <!-- FF_Y1 → Y1 -->
    <path d="M 665 290 L 1010 290"/>
    <!-- FF_C1 → XOR2.in1 + AND6.in1 -->
    <path d="M 665 370 L 720 370 L 720 425 L 740 425"/>
    <path d="M 720 425 L 720 540 L 740 540"/>
    <circle cx="720" cy="425" r="3.5" fill="#5a6e80"/>
    <!-- FF_PP11 → XOR2.in0 + AND6.in0 -->
    <path d="M 665 430 L 720 430 L 720 415 L 740 415"/>
    <path d="M 665 430 L 720 430 L 720 530 L 740 530"/>
    <!-- XOR2 → Y2 -->
    <path d="M 800 420 L 1010 420"/>
    <!-- AND6 → Y3 -->
    <path d="M 800 535 L 1010 535"/>
  </g>

  <!-- ════════ PP layer ════════ -->
  <g>
    <path d="M 250 162 L 280 162 A 22 22 0 0 1 280 208 L 250 208 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="266" y="182" text-anchor="middle" fill="#80c8ff" font-size="16" font-weight="bold">PP00</text>
    <text x="266" y="197" text-anchor="middle" fill="#a0c0d0" font-size="16">120 ps</text>

    <path d="M 250 222 L 280 222 A 22 22 0 0 1 280 268 L 250 268 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="266" y="242" text-anchor="middle" fill="#80c8ff" font-size="16" font-weight="bold">PP10</text>
    <text x="266" y="257" text-anchor="middle" fill="#a0c0d0" font-size="16">120 ps</text>

    <path d="M 250 322 L 280 322 A 22 22 0 0 1 280 368 L 250 368 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="266" y="342" text-anchor="middle" fill="#80c8ff" font-size="16" font-weight="bold">PP01</text>
    <text x="266" y="357" text-anchor="middle" fill="#a0c0d0" font-size="16">120 ps</text>

    <path d="M 250 412 L 280 412 A 22 22 0 0 1 280 458 L 250 458 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="266" y="432" text-anchor="middle" fill="#80c8ff" font-size="16" font-weight="bold">PP11</text>
    <text x="266" y="447" text-anchor="middle" fill="#a0c0d0" font-size="16">120 ps</text>
  </g>

  <!-- ════════ HA1 (XOR1 + AND5) ════════ -->
  <g>
    <path d="M 430 265 Q 455 290, 430 315 L 460 315 Q 485 315, 500 290 Q 485 265, 460 265 Z"
          fill="#1a3a2a" stroke="#80f0a0" stroke-width="2"/>
    <text x="468" y="287" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">XOR1</text>
    <text x="468" y="303" text-anchor="middle" fill="#a0c0d0" font-size="16">150 ps</text>
  </g>
  <g>
    <path d="M 440 345 L 470 345 A 25 25 0 0 1 470 395 L 440 395 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="458" y="367" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">AND5</text>
    <text x="458" y="383" text-anchor="middle" fill="#a0c0d0" font-size="16">120 ps</text>
  </g>

  <!-- ════════ Pipeline FFs (4 total) ════════
       FF_C1: from part ג (purple — existing)
       FF_PP11, FF_Y0, FF_Y1: NEW in part ד (yellow highlight) -->
  <g>
    <rect x="555" y="160" width="110" height="50" rx="6"
          fill="#3a3a0a" stroke="#ffe060" stroke-width="2.6"/>
    <text x="610" y="183" text-anchor="middle" fill="#ffe060" font-size="18" font-weight="bold">FF_Y0 ✨</text>
    <text x="610" y="200" text-anchor="middle" fill="#fff080" font-size="16">★ חדש (ד)</text>
  </g>
  <g>
    <rect x="555" y="265" width="110" height="50" rx="6"
          fill="#3a3a0a" stroke="#ffe060" stroke-width="2.6"/>
    <text x="610" y="288" text-anchor="middle" fill="#ffe060" font-size="18" font-weight="bold">FF_Y1 ✨</text>
    <text x="610" y="305" text-anchor="middle" fill="#fff080" font-size="16">★ חדש (ד)</text>
  </g>
  <g>
    <rect x="555" y="345" width="110" height="50" rx="6" fill="#1a1428" stroke="#cc66ff" stroke-width="2.4"/>
    <text x="610" y="368" text-anchor="middle" fill="#cc99ff" font-size="18" font-weight="bold">FF_C1</text>
    <text x="610" y="385" text-anchor="middle" fill="#a0a0c0" font-size="16">מסעיף ג'</text>
  </g>
  <g>
    <rect x="555" y="405" width="110" height="50" rx="6"
          fill="#3a3a0a" stroke="#ffe060" stroke-width="2.6"/>
    <text x="610" y="428" text-anchor="middle" fill="#ffe060" font-size="18" font-weight="bold">FF_PP11 ✨</text>
    <text x="610" y="445" text-anchor="middle" fill="#fff080" font-size="16">★ חדש (ד)</text>
  </g>

  <!-- ════════ HA2 (XOR2 + AND6) ════════ -->
  <g>
    <path d="M 740 397 Q 765 422, 740 447 L 770 447 Q 795 447, 810 422 Q 795 397, 770 397 Z"
          fill="#1a3a2a" stroke="#80f0a0" stroke-width="2"/>
    <text x="778" y="419" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">XOR2</text>
    <text x="778" y="435" text-anchor="middle" fill="#a0c0d0" font-size="16">150 ps</text>
  </g>
  <g>
    <path d="M 740 512 L 770 512 A 25 25 0 0 1 770 562 L 740 562 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="758" y="534" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">AND6</text>
    <text x="758" y="550" text-anchor="middle" fill="#a0c0d0" font-size="16">120 ps</text>
  </g>

  <!-- ════════ Outputs (all green — synced) ════════ -->
  <g font-size="20" font-weight="bold">
    <circle cx="1030" cy="185" r="20" fill="#0a1825" stroke="#80f0a0" stroke-width="2.6"/>
    <text x="1030" y="191" text-anchor="middle" fill="#80f0a0">Y0</text>
    <circle cx="1030" cy="290" r="20" fill="#0a1825" stroke="#80f0a0" stroke-width="2.6"/>
    <text x="1030" y="296" text-anchor="middle" fill="#80f0a0">Y1</text>
    <circle cx="1030" cy="420" r="22" fill="#0a1825" stroke="#80f0a0" stroke-width="2.6"/>
    <text x="1030" y="426" text-anchor="middle" fill="#80f0a0">Y2</text>
    <circle cx="1030" cy="535" r="22" fill="#0a1825" stroke="#80f0a0" stroke-width="2.6"/>
    <text x="1030" y="541" text-anchor="middle" fill="#80f0a0">Y3</text>
  </g>

  <!-- Sync badge -->
  <rect x="780" y="150" width="280" height="32" rx="6" fill="rgba(128,240,160,0.14)" stroke="#80f0a0" stroke-width="1.6"/>
  <text x="920" y="171" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">✓ Y0..Y3 יוצאים בו-זמנית</text>

  <!-- Bottom summary -->
  <rect x="40" y="630" width="1060" height="78" rx="10" fill="rgba(64,80,100,0.06)" stroke="#3a4a5a" stroke-width="1.4"/>
  <text x="570" y="660" text-anchor="middle" fill="#ffc890" font-weight="bold" font-size="20">
    Latency = 2 cycles · Throughput = 1 vector/clock · Stage 1 ≤ 270 ps · Stage 2 ≤ 150 ps
  </text>
  <text x="570" y="688" text-anchor="middle" fill="#c8b090" font-size="18" font-style="italic">
    סה"כ 4 FFs: FF_C1 מסעיף ג' + 3 חדשים (צהוב) שנוספו בסעיף ד'
  </text>
</svg>`,
        circuit: () => build(() => {
          // Balanced pipelined 2-bit multiplier — 4 FFs total.
          // FF_C1 from ג + 3 added in ד (FF_PP11, FF_Y0, FF_Y1).
          // All outputs now exit at the same cycle.
          const clk = h.clock(80, 600, 'CLK');
          const a0 = h.input(80, 100, 'A0');  a0.fixedValue = 1;
          const a1 = h.input(80, 200, 'A1');  a1.fixedValue = 1;
          const b0 = h.input(80, 340, 'B0');  b0.fixedValue = 1;
          const b1 = h.input(80, 440, 'B1');  b1.fixedValue = 1;

          const pp00 = h.gate('AND', 260, 130);
          const pp10 = h.gate('AND', 260, 220);
          const pp01 = h.gate('AND', 260, 310);
          const pp11 = h.gate('AND', 260, 400);

          const xor1 = h.gate('XOR', 460, 265);
          const and5 = h.gate('AND', 460, 345);

          // Four pipeline FFs (balanced)
          const ffY0   = h.ffD(620, 130, 'FF_Y0');
          const ffY1   = h.ffD(620, 265, 'FF_Y1');
          const ffC1   = h.ffD(620, 345, 'FF_C1');
          const ffPP11 = h.ffD(620, 400, 'FF_PP11');

          const xor2 = h.gate('XOR', 800, 400);
          const and6 = h.gate('AND', 800, 480);

          const y0 = h.output(1000, 130, 'Y0');
          const y1 = h.output(1000, 265, 'Y1');
          const y2 = h.output(1000, 400, 'Y2');
          const y3 = h.output(1000, 480, 'Y3');

          return {
            nodes: [
              clk, a0, a1, b0, b1,
              pp00, pp10, pp01, pp11,
              xor1, and5,
              ffY0, ffY1, ffC1, ffPP11,
              xor2, and6,
              y0, y1, y2, y3,
            ],
            wires: [
              // PP layer
              h.wire(a0.id, pp00.id, 0),
              h.wire(b0.id, pp00.id, 1),
              h.wire(a1.id, pp10.id, 0),
              h.wire(b0.id, pp10.id, 1),
              h.wire(a0.id, pp01.id, 0),
              h.wire(b1.id, pp01.id, 1),
              h.wire(a1.id, pp11.id, 0),
              h.wire(b1.id, pp11.id, 1),

              // HA1 combinational
              h.wire(pp10.id, xor1.id, 0),
              h.wire(pp01.id, xor1.id, 1),
              h.wire(pp10.id, and5.id, 0),
              h.wire(pp01.id, and5.id, 1),

              // Stage 1 outputs → pipeline FFs
              h.wire(pp00.id, ffY0.id,   0),
              h.wire(xor1.id, ffY1.id,   0),
              h.wire(and5.id, ffC1.id,   0),
              h.wire(pp11.id, ffPP11.id, 0),

              // Shared clock to all 4 FFs
              h.wire(clk.id, ffY0.id,   1, 0, { isClockWire: true }),
              h.wire(clk.id, ffY1.id,   1, 0, { isClockWire: true }),
              h.wire(clk.id, ffC1.id,   1, 0, { isClockWire: true }),
              h.wire(clk.id, ffPP11.id, 1, 0, { isClockWire: true }),

              // Stage 2 — all see pipelined values
              h.wire(ffPP11.id, xor2.id, 0),
              h.wire(ffC1.id,   xor2.id, 1),
              h.wire(ffPP11.id, and6.id, 0),
              h.wire(ffC1.id,   and6.id, 1),

              // Outputs — all synced
              h.wire(ffY0.id, y0.id, 0),
              h.wire(ffY1.id, y1.id, 0),
              h.wire(xor2.id, y2.id, 0),
              h.wire(and6.id, y3.id, 0),
            ],
          };
        }),
      },

      // ─────────────────────────────────────────────────────────
      // Part ה — Hold violation: t_hold = 200 ps requires shortest
      //   path ≥ 170 ps (with t_clk-q ≈ 30).
      //   Shortest in multiplier = 120 ps (A0/B0 → PP00 → Y0).
      //   Fix: BUF (60 ps, or 2 NOTs in series) on the Y0 path.
      //   New shortest = 180 ps ≥ 170 ✓ (margin 10).
      // ─────────────────────────────────────────────────────────
      {
        label: 'ה',
        question: 'נתון כעת: **\`t_hold = 200 ps\`** (זמן ה-hold הנדרש ע"י ה-FF במורד הזרם). תן פתרון למסלול הבעייתי במעגל מסעיף א\'.',
        hints: [
          'אילוץ ה-hold: \`T_shortest ≥ t_h − t_clk-q\`. עם \`t_clk-q ≈ 30 ps\` ו-\`t_h = 200 ps\` → צריך \`T_shortest ≥ 170 ps\`.',
          'הנתיב הקצר ביותר במעגל הוא \`A0/B0 → PP00 → Y0\` = 120 ps. **120 < 170** → הפרת hold!',
          'הפתרון: להוסיף **delay buffer** על המסלול הקצר.',
          'איזה רכיב? Buffer (BUF) או זוג inverters בטור. כל BUF מוסיף ~50-100 ps תלוי בטכנולוגיה.',
          'הוספה של BUF אחד (נניח 60 ps): \`120 + 60 = 180 ps ≥ 170\` ✓ (margin 10 ps).',
          'חשוב: הוספת ה-buffer **לא משפיעה על ה-setup** של מסלולים אחרים — הוא רק על המסלול הקצר של Y0.',
        ],
        answer:
`**הפתרון: להוסיף Buffer (BUF) על המסלול \`A0/B0 → PP00 → Y0\`.**

### זיהוי הבעיה

- אילוץ hold: \`T_shortest ≥ t_h − t_clk-q\`
- עם \`t_h = 200 ps\`, \`t_clk-q ≈ 30 ps\` → **\`T_shortest ≥ 170 ps\`**
- במעגל הנוכחי, המסלול הקצר ביותר הוא \`A0/B0 → PP00 → Y0\` = **120 ps** (שער AND יחיד)
- **120 ps < 170 ps** → הפרת hold (race condition)

### הפתרון: Delay Padding

מוסיפים **שער BUF** (או pair of inverters) על המסלול הקצר \`A0/B0 → PP00 → Y0\`. ראה את הדיאגרמה הצבעונית בראש דף התשובה — שני המבנים זה לצד זה, "לפני" ו-"אחרי".

עם BUF של 60 ps: \`120 + 60 = 180 ps ≥ 170 ps\` ✓ — ה-hold עומד בדרישות עם **margin של 10 ps**. ה-margin הזה צר — במציאות נשתמש ב-BUF של 80-100 ps כדי לקבל margin בטוח.

### למה BUF דווקא?

| חלופה | משפיע על? | מתאים? |
|---|---|:---:|
| **BUF** | הוספת delay בלבד | ✓ הפתרון הקלאסי |
| 2 × NOT בטור | הוספת delay (זוג inverters ≡ buffer) | ✓ אם אין BUF cell |
| FF נוסף | מוסיף cycle latency | ✗ overkill, פוגע ב-latency |
| Slow AND cell ל-PP00 | משנה את ה-functional behavior גם של אחרים | ✗ |
| לא לעשות כלום, להאריך clock | hold לא תלוי ב-clock period! | ✗ אין השפעה |

### חשוב: הפתרון **לא** משפיע על ה-setup

- ה-BUF על מסלול Y0 בלבד.
- מסלולי setup הם על Y2 (390 ps) — לא נוגעים בהם.
- ה-Fmax לא משתנה.

### בדיקה מלאה — כל המסלולים אחרי התיקון

| מסלול | delay חדש | hold ≥ 170 ✓ ? |
|---|---:|:---:|
| A0/B0 → PP00 → **BUF** → Y0 | 180 | ✓ (margin 10) |
| A1/B1 → PP11 → AND6 → Y3 | 240 | ✓ |
| A1/B0 → PP10 → XOR1 → Y1 | 270 | ✓ |
| A0/B1 → PP01 → XOR1 → Y1 | 270 | ✓ |
| A1/B1 → PP11 → XOR2 → Y2 | 270 | ✓ |
| A1/B0 → PP10 → AND5 → AND6 → Y3 | 360 | ✓ |
| A0/B1 → PP01 → AND5 → AND6 → Y3 | 360 | ✓ |
| A1/B0 → PP10 → AND5 → XOR2 → Y2 | 390 | ✓ |
| A0/B1 → PP01 → AND5 → XOR2 → Y2 | 390 | ✓ |

כל המסלולים עומדים ב-hold ≥ 170 ps ✓.

### ב-EDA tools

זה נקרא **Hold Fixing** או **Delay Padding**. כלי STA (Synopsys PrimeTime, Cadence Tempus) מזהים אוטומטית הפרות hold, מציעים מיקום אופטימלי ל-buffer cells, ומתאימים את ה-netlist. ב-multipliers הסימטריים יש לעיתים קרובות מספר מסלולים קצרים תאומים — כולם דורשים padding.`,
        interviewerMindset:
`**שאלה מעשית.** המראיין מחפש:
1. **שאתה לא ממליץ על FF** — pipelining פותר setup, לא hold. סטודנט שמציע FF להפרת hold לא הבין את העניין.
2. **שאתה לא מציע להאריך clock** — clock period לא משפיע על hold. זה בלבול נפוץ מאוד.
3. **שאתה מציין delay padding** — buffer הוא ה-keyword המדויק.
4. **שאתה זוכר ש-Y0 = PP00 = AND יחיד** = הקצר במעגל. במחבר השאלה הייתה דומה אבל ה-shortest היה XOR — כאן הוא **קצר אפילו יותר** (120 vs 150).

**שאלת המשך**: "כמה buffers, ואיפה?" → רק על המסלול שמפר. בעיצוב גדול יכולים להיות אלפי הפרות hold שכולן ידרשו buffers ייעודיים.

**שאלת bonus**: "האם buffers מעלים power?" → כן, כל buffer מוסיף switching activity. ב-low-power design זה רגיש. הפתרון: minimum-strength buffers, או fewer-buffer architectures.

**שאלת bonus 2**: "ה-margin של 10 ps בטוח?" → לא! ב-CMOS יש process variation — buffer ב-corner מסוים (slow corner) יכול להיות מהיר מדי ב-fast corner. STA tools דורשות margin של 50-100 ps לפחות לכל corner. בעיצוב אמיתי נבחר BUF גדול יותר (~100 ps) או נוסיף שני BUFs.`,
        answerSchematic: `
<svg viewBox="0 0 1100 480" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Before / after panels — adding a buffer on the Y0 path to fix hold timing in the multiplier.">

  <text x="550" y="40" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    Delay padding — הוספת BUF על המסלול הקצר Y0
  </text>
  <text x="550" y="68" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">
    אילוץ: T_shortest ≥ 170 ps (t_h = 200, t_clk-q ≈ 30)
  </text>

  <!-- ════════════════════ BEFORE panel ════════════════════ -->
  <rect x="30" y="100" width="510" height="340" rx="12"
        fill="rgba(255,96,96,0.05)" stroke="rgba(255,96,96,0.55)" stroke-width="2"/>
  <text x="285" y="138" text-anchor="middle" fill="#ff8080" font-weight="bold" font-size="24">לפני — הפרת hold ✗</text>

  <!-- A0 input -->
  <circle cx="80" cy="240" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
  <text x="80" y="246" text-anchor="middle" fill="#cca040" font-size="18" font-weight="bold">A0</text>
  <!-- B0 input -->
  <circle cx="80" cy="310" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
  <text x="80" y="316" text-anchor="middle" fill="#cca040" font-size="18" font-weight="bold">B0</text>

  <!-- Wires -->
  <line x1="100" y1="240" x2="220" y2="240" stroke="#cca040" stroke-width="2"/>
  <line x1="100" y1="310" x2="220" y2="310" stroke="#cca040" stroke-width="2"/>

  <!-- PP00 (AND) -->
  <path d="M 220 230 L 280 230 A 50 50 0 0 1 280 320 L 220 320 Z"
        fill="#1a2230" stroke="#80c8ff" stroke-width="2.2"/>
  <text x="260" y="270" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">PP00</text>
  <text x="260" y="290" text-anchor="middle" fill="#a0c0d0" font-size="18">AND · 120 ps</text>

  <!-- PP00 → Y0 (long, direct) -->
  <line x1="330" y1="275" x2="470" y2="275" stroke="#ff9933" stroke-width="2.2"/>

  <!-- Y0 output -->
  <circle cx="490" cy="275" r="22" fill="#0a1825" stroke="#ff6060" stroke-width="2.4"/>
  <text x="490" y="281" text-anchor="middle" fill="#ff6060" font-size="20" font-weight="bold">Y0</text>

  <!-- Delay annotation -->
  <text x="400" y="262" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">120 ps total</text>

  <!-- Violation badge -->
  <rect x="80" y="380" width="410" height="40" rx="8" fill="rgba(255,96,96,0.14)" stroke="#ff6060" stroke-width="1.8"/>
  <text x="285" y="406" text-anchor="middle" fill="#ff8080" font-weight="bold" font-size="18">120 &lt; 170 → race condition</text>

  <!-- ════════════════════ AFTER panel ════════════════════ -->
  <rect x="560" y="100" width="510" height="340" rx="12"
        fill="rgba(128,240,160,0.05)" stroke="rgba(128,240,160,0.55)" stroke-width="2"/>
  <text x="815" y="138" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="24">אחרי — hold נשמר ✓</text>

  <!-- A0 input -->
  <circle cx="610" cy="240" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
  <text x="610" y="246" text-anchor="middle" fill="#cca040" font-size="18" font-weight="bold">A0</text>
  <!-- B0 input -->
  <circle cx="610" cy="310" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
  <text x="610" y="316" text-anchor="middle" fill="#cca040" font-size="18" font-weight="bold">B0</text>

  <!-- Wires -->
  <line x1="630" y1="240" x2="730" y2="240" stroke="#cca040" stroke-width="2"/>
  <line x1="630" y1="310" x2="730" y2="310" stroke="#cca040" stroke-width="2"/>

  <!-- PP00 (AND) -->
  <path d="M 730 230 L 790 230 A 50 50 0 0 1 790 320 L 730 320 Z"
        fill="#1a2230" stroke="#80c8ff" stroke-width="2.2"/>
  <text x="770" y="270" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">PP00</text>
  <text x="770" y="290" text-anchor="middle" fill="#a0c0d0" font-size="18">AND · 120 ps</text>

  <!-- PP00 → BUF -->
  <line x1="840" y1="275" x2="880" y2="275" stroke="#ff9933" stroke-width="2.2"/>

  <!-- BUF (highlighted yellow) -->
  <rect x="880" y="250" width="80" height="50" rx="8" fill="#3a3a0a" stroke="#ffe060" stroke-width="2.6"/>
  <text x="920" y="271" text-anchor="middle" fill="#ffe060" font-size="18" font-weight="bold">BUF</text>
  <text x="920" y="289" text-anchor="middle" fill="#fff080" font-size="16">+60 ps ★</text>

  <!-- BUF → Y0 -->
  <line x1="960" y1="275" x2="1000" y2="275" stroke="#ff9933" stroke-width="2.2"/>

  <!-- Y0 output (now green = safe) -->
  <circle cx="1020" cy="275" r="22" fill="#0a1825" stroke="#80f0a0" stroke-width="2.4"/>
  <text x="1020" y="281" text-anchor="middle" fill="#80f0a0" font-size="20" font-weight="bold">Y0</text>

  <!-- Delay annotation -->
  <text x="895" y="240" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">120 + 60 = 180 ps</text>

  <!-- Pass badge -->
  <rect x="610" y="380" width="410" height="40" rx="8" fill="rgba(128,240,160,0.14)" stroke="#80f0a0" stroke-width="1.8"/>
  <text x="815" y="406" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="18">180 ≥ 170 ✓ (margin 10 ps)</text>
</svg>`,
        expectedAnswers: [
          'buffer', 'BUF', 'באפר',
          'delay padding', 'pad', 'pad delay',
          'inverter', 'NOT-NOT', '2 inverters',
          '170', '180', '60',
          'hold fix', 'hold fixing',
          'PP00', 'Y0',
          'shortest path',
        ],
        circuit: () => build(() => {
          // 8-gate multiplier + a BUF (implemented as 2 NOTs) on the
          // Y0 path to lift its delay above the 170 ps hold floor.
          // The student can verify Y0 still computes A0·B0 (functionally
          // unchanged), only the propagation delay is padded.
          const a0 = h.input(80,  100, 'A0');  a0.fixedValue = 1;
          const a1 = h.input(80,  200, 'A1');  a1.fixedValue = 1;
          const b0 = h.input(80,  340, 'B0');  b0.fixedValue = 1;
          const b1 = h.input(80,  440, 'B1');  b1.fixedValue = 1;

          const pp00 = h.gate('AND', 260, 130);
          const pp10 = h.gate('AND', 260, 220);
          const pp01 = h.gate('AND', 260, 310);
          const pp11 = h.gate('AND', 260, 400);

          // Delay-padding buffer on the Y0 path (built from 2 NOTs)
          const padInv1 = h.gate('NOT', 420, 130);
          const padInv2 = h.gate('NOT', 560, 130);

          const xor1 = h.gate('XOR', 480, 265);
          const and5 = h.gate('AND', 480, 345);

          const xor2 = h.gate('XOR', 680, 400);
          const and6 = h.gate('AND', 880, 440);

          const y0 = h.output(1040, 130, 'Y0');
          const y1 = h.output(1040, 265, 'Y1');
          const y2 = h.output(1040, 400, 'Y2');
          const y3 = h.output(1040, 480, 'Y3');

          return {
            nodes: [
              a0, a1, b0, b1,
              pp00, pp10, pp01, pp11,
              padInv1, padInv2,
              xor1, and5,
              xor2, and6,
              y0, y1, y2, y3,
            ],
            wires: [
              h.wire(a0.id, pp00.id, 0),
              h.wire(b0.id, pp00.id, 1),
              h.wire(a1.id, pp10.id, 0),
              h.wire(b0.id, pp10.id, 1),
              h.wire(a0.id, pp01.id, 0),
              h.wire(b1.id, pp01.id, 1),
              h.wire(a1.id, pp11.id, 0),
              h.wire(b1.id, pp11.id, 1),

              // BUF on Y0 path: PP00 → INV → INV → Y0
              h.wire(pp00.id, padInv1.id, 0),
              h.wire(padInv1.id, padInv2.id, 0),
              h.wire(padInv2.id, y0.id, 0),

              h.wire(pp10.id, xor1.id, 0),
              h.wire(pp01.id, xor1.id, 1),
              h.wire(pp10.id, and5.id, 0),
              h.wire(pp01.id, and5.id, 1),
              h.wire(xor1.id, y1.id, 0),

              h.wire(pp11.id, xor2.id, 0),
              h.wire(and5.id, xor2.id, 1),
              h.wire(pp11.id, and6.id, 0),
              h.wire(and5.id, and6.id, 1),
              h.wire(xor2.id, y2.id, 0),
              h.wire(and6.id, y3.id, 0),
            ],
          };
        }),
      },

      // ─────────────────────────────────────────────────────────
      // Part ו — Bridge fault between PP10→XOR1.in0 and PP01→XOR1.in1
      //   Two adjacent partial-product wires that both feed HA1.
      //   wired-AND collapses both to AND of the two driver values.
      //   Bridge is transparent when both wires carry the same value.
      //   Detection vector: A=01, B=11 ⇒ PP10=0, PP01=1 (different)
      //   → wired-AND makes both 0 → XOR1=0 (was 1), so Y1 = 0 (was 1).
      // ─────────────────────────────────────────────────────────
      {
        label: 'ו',
        question: 'במעגל מסעיף א\' מוזרק **bridge fault** בין שני קווים שכנים שיוצאים מ-PP layer: הקו \`PP10 → XOR1.in0\` והקו \`PP01 → XOR1.in1\` — מסומנים ב**סגול** בשרטוט. הקצר הוא **wired-AND** — שני הקווים נושאים את ה-AND של ערכיהם המקוריים. **מהו וקטור הקלט המינימלי שמזהה את התקלה?** הסבר מה רואים בפלט.',
        schematic: `
<svg viewBox="0 0 900 420" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Bridge fault between PP10→XOR1 and PP01→XOR1 wires.">

  <text x="450" y="36" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="24">
    Bridge fault — wired-AND בין שני קווי ה-PP השכנים
  </text>

  <!-- Inputs -->
  <g font-size="20" font-weight="bold">
    <circle cx="60" cy="100" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="60" y="106" text-anchor="middle" fill="#cca040">A1</text>
    <circle cx="60" cy="170" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="60" y="176" text-anchor="middle" fill="#cca040">B0</text>
    <circle cx="60" cy="260" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="60" y="266" text-anchor="middle" fill="#cca040">A0</text>
    <circle cx="60" cy="330" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="60" y="336" text-anchor="middle" fill="#cca040">B1</text>
  </g>

  <!-- Wires into the PP gates (grey) -->
  <g stroke="#5a6e80" stroke-width="1.6" fill="none">
    <path d="M 80 100 L 180 100 L 180 130 L 220 130"/>
    <path d="M 80 170 L 180 170 L 180 140 L 220 140"/>
    <path d="M 80 260 L 180 260 L 180 290 L 220 290"/>
    <path d="M 80 330 L 180 330 L 180 300 L 220 300"/>
  </g>

  <!-- PP10 (AND, top) -->
  <path d="M 220 115 L 250 115 A 25 25 0 0 1 250 165 L 220 165 Z"
        fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
  <text x="240" y="143" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">PP10</text>

  <!-- PP01 (AND, bottom) -->
  <path d="M 220 275 L 250 275 A 25 25 0 0 1 250 325 L 220 325 Z"
        fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
  <text x="240" y="303" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">PP01</text>

  <!-- ════════ The two BRIDGED wires (purple, highlighted) ════════ -->
  <g stroke="#cc66ff" stroke-width="3.6" fill="none">
    <path d="M 280 140 L 580 140"/>     <!-- PP10.out → XOR1.in0 -->
    <path d="M 280 300 L 580 300"/>     <!-- PP01.out → XOR1.in1 -->
  </g>

  <!-- Bridge marker -->
  <line x1="420" y1="140" x2="420" y2="300" stroke="#cc66ff" stroke-width="3" stroke-dasharray="6,4"/>
  <path d="M 415 200 L 425 205 L 415 213 L 425 220 L 415 228 L 425 235"
        fill="none" stroke="#ff6060" stroke-width="2.2"/>

  <!-- Bridge label -->
  <rect x="440" y="200" width="280" height="34" rx="8" fill="rgba(204,102,255,0.16)" stroke="#cc66ff" stroke-width="1.8"/>
  <text x="580" y="222" text-anchor="middle" fill="#cc99ff" font-size="18" font-weight="bold">⚡ BRIDGE — wired-AND</text>

  <!-- XOR1 -->
  <g>
    <path d="M 580 200 Q 610 220, 580 240 L 615 240 Q 645 240, 660 220 Q 645 200, 615 200 Z"
          fill="#1a3a2a" stroke="#80f0a0" stroke-width="2.2"/>
    <text x="618" y="225" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">XOR1</text>
  </g>
  <!-- AND5 (also fed by the same two wires) -->
  <g>
    <path d="M 580 270 L 610 270 A 25 25 0 0 1 610 320 L 580 320 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="600" y="298" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">AND5</text>
  </g>
  <!-- Wires to XOR1 / AND5 from bridge nets — the bridge is on the segment up to XOR1 -->
  <g stroke="#5a6e80" stroke-width="1.6" fill="none">
    <path d="M 580 140 L 580 220" opacity="0.5"/>
    <path d="M 580 300 L 580 230" opacity="0.5"/>
    <path d="M 580 140 L 540 140 L 540 280 L 580 280" opacity="0.4" stroke-dasharray="3,3"/>
    <path d="M 580 300 L 560 300 L 560 295 L 580 295" opacity="0.4" stroke-dasharray="3,3"/>
  </g>

  <!-- Outputs of interest -->
  <text x="720" y="225" fill="#ff9933" font-size="18" font-weight="bold">→ Y1</text>
  <text x="720" y="299" fill="#ff9933" font-size="18" font-weight="bold">→ C1</text>

  <!-- Context note -->
  <text x="450" y="370" text-anchor="middle" fill="#c8b090" font-size="18" font-style="italic">
    שני הקווים יוצאים מ-PP10/PP01 וסמוכים פיזית → קצר ביניהם = wired-AND
  </text>
  <text x="450" y="396" text-anchor="middle" fill="#ffe080" font-size="18" font-weight="bold">
    כל וקטור שמעניק להם ערכים זהים — לא מגלה את התקלה (קצר שקוף)
  </text>
</svg>`,
        hints: [
          'Bridge מתבטא רק כשלשני הקווים יש **ערכים שונים** — אם שניהם 0 או שניהם 1, ה-AND שלהם זהה לכל אחד מהם בנפרד ⇒ הקצר שקוף.',
          'הקו \`PP10.out\` מחשב \`A1 · B0\`. הקו \`PP01.out\` מחשב \`A0 · B1\`.',
          'מתי שני הביטויים שונים? למשל כש-PP10=0 ו-PP01=1: \`A1·B0=0\` ו-\`A0·B1=1\` ⇒ \`A1=0, A0=1, B0=anything, B1=1\`.',
          'בחר \`A=01, B=11\` (כלומר A0=1, A1=0, B0=1, B1=1): PP10=0·1=0, PP01=1·1=1. wired-AND עושה את שני הקווים = 0.',
          'בלי תקלה: Y3..Y0 = 1·3 = 3 = 0011. עם תקלה: XOR1 רואה (0,0) במקום (0,1) ⇒ Y1 = 0 במקום 1.',
          'מינימום: **1 וקטור בלבד** מספיק לזיהוי.',
        ],
        answer:
`## וקטור הקלט: \`A = 01, B = 11\` (כלומר \`A0=1, A1=0, B0=1, B1=1\`) — **מינימום = 1 וקטור**

---

### למה דווקא הוקטור הזה

Bridge הוא **שקוף** כשהקווים נושאים אותו ערך. הוא **מתעורר** רק כשהקווים שונים.

\`PP10.out = A1 · B0\` · \`PP01.out = A0 · B1\`. מתי הם שונים?

| A0 | A1 | B0 | B1 | PP10 | PP01 | bridge פעיל? |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 0 | 0 | 0 | 0 | 0 | 0 | ✗ שקוף |
| 0 | 0 | 1 | 0 | 0 | 0 | ✗ |
| 1 | 1 | 1 | 1 | 1 | 1 | ✗ |
| **1** | **0** | **1** | **1** | **0** | **1** | **✓ הבחירה שלנו** |
| 1 | 1 | 0 | 1 | 0 | 1 | ✓ סימטרי |
| 0 | 1 | 1 | 0 | 1 | 0 | ✓ סימטרי הפוך |

(\`A=01, B=11\` היא בחירה שעובדת. גם \`A=11, B=01\` ועוד מספר וקטורים אחרים — מספיק וקטור אחד.)

### מה רואים בפלט עם הוקטור \`(A=01, B=11)\` ⇒ A · B = 1 · 3 = **3** = 0011

חישוב ללא תקלה:
- PP00 = 1·1 = 1, PP10 = 0·1 = 0, PP01 = 1·1 = 1, PP11 = 0·1 = 0
- Y1 = PP10 ⊕ PP01 = 0 ⊕ 1 = **1**
- C1 = PP10 · PP01 = 0
- Y2 = PP11 ⊕ C1 = 0, Y3 = PP11 · C1 = 0
- **Y3..Y0 = 0011** ✓ (מצופה)

עם wired-AND bridge — שני הקווים = \`0 AND 1 = 0\`:
- XOR1 רואה (0, 0) ⇒ Y1 = **0** ❌
- AND5 רואה (0, 0) ⇒ C1 = 0 (זהה למקור — נשאר שקוף ב-C1)

| | ללא תקלה | עם bridge | הבדל |
|---|:---:|:---:|:---:|
| Y0 | 1 | 1 | — |
| **Y1** | **1** | **0** | ✓ נחשף ב-Y1 |
| Y2 | 0 | 0 | — |
| Y3 | 0 | 0 | — |

**הפלט הנצפה: 0001 = 1 במקום הצפוי 0011 = 3.**

### מינימום אבסולוטי — 1 וקטור

באותו וקטור גם **ניתן לזהות את סוג ה-bridge**:
- (Y1 שונה מהצפוי ⇒ wired-AND): כי AND־ינו את 0 ו-1 לקבל 0.
- (Y1 = 1 לכל וקטור): wired-OR.

### תכונה מעניינת של multipliers

ה-multiplier הסימטרי מתאפיין בכך ש-PP10 ו-PP01 הם **התאומים הסימטריים** — שניהם בעלי משקל קולוני זהה ב-MUL. ב-Wallace/Dadda tree המעבר עליהם דורש hierarchical sorting — וכאן הקצר ביניהם הופך לבעיית DFT מציאותית.`,
        interviewerMindset:
`**שאלה אמיתית מ-DFT.** המראיין מחפש:
1. **שאתה מזהה את התנאי "ערכים שונים"** — bridge הוא **שקוף** כשהקווים נושאים אותו ערך. זו המלכודת.
2. **שאתה בוחר וקטור שמייצר ערכים שונים בין PP10 ו-PP01** — לא ניסוי בעיוורון.
3. **שאתה זוכר את התשובה "1 וקטור"** — לא "כמה שצריך".
4. **שאתה מבין שיש מספר וקטורים שעובדים** — A=01,B=11 או A=11,B=01 — סימטריה.

**שאלת המשך**: "ההבדל בין wired-AND ל-wired-OR ב-bridge?" → תלוי בטכנולוגיה: bipolar pull-up חזק יוצר wired-OR; CMOS עם driver דומיננטי יכול ליצור wired-AND. ATPG תופס שניהם.

**שאלת bonus**: "מה אם הייתי שואל אותך לזהות את **סוג** ה-bridge?" → אותו וקטור מספיק (1 וקטור) — observation של Y1 מבחין:
- (Y1 = 0 במקום 1): wired-AND (0 AND 1 = 0)
- (Y1 = 1 כצפוי — בלי שינוי): פתרון 1 — wired-OR יוצר Y1 = (1 XOR 1) = 0... wait. wired-OR בין 0 ו-1 → שניהם 1. אז XOR1 = 1 XOR 1 = 0. גם 0! צריך וקטור אחר.

**שאלת bonus 2**: "איך זה משתנה ב-Wallace tree?" → ב-tree multiplier יש fanout עמוק יותר על partial products, מספר רמות bridge גדל בריבוע. ATPG מסחרי מטפל בזה אוטומטית, אבל פיזית — placement-aware DFT הוא חיוני.`,
        expectedAnswers: [
          'bridge', 'בריג', 'קצר',
          '1', 'one vector', 'וקטור אחד',
          'A=01', 'B=11', 'A0=1', 'B1=1',
          'wired-AND', 'wired-OR',
          'Y1', 'PP10', 'PP01',
          'different values', 'contrast',
        ],
        circuit: () => build(() => {
          // 8-gate multiplier with a bridge injected between:
          //   wire-A: PP10.out → XOR1.in0
          //   wire-B: PP01.out → XOR1.in1
          // Both reference each other with bridgeMode='and' (wired-AND).
          //
          // Default inputs preloaded to the detection vector:
          //   A0=1, A1=0, B0=1, B1=1   ⇒  PP10=0, PP01=1 (differ → bridge active)
          //   Without fault Y3..Y0 = 0011 = 3
          //   With fault    Y3..Y0 = 0001 = 1   (Y1 collapses from 1 to 0)
          const a0 = h.input(80,  100, 'A0');  a0.fixedValue = 1;
          const a1 = h.input(80,  200, 'A1');  a1.fixedValue = 0;
          const b0 = h.input(80,  340, 'B0');  b0.fixedValue = 1;
          const b1 = h.input(80,  440, 'B1');  b1.fixedValue = 1;

          const pp00 = h.gate('AND', 260, 130);
          const pp10 = h.gate('AND', 260, 220);
          const pp01 = h.gate('AND', 260, 310);
          const pp11 = h.gate('AND', 260, 400);

          const xor1 = h.gate('XOR', 480, 265);
          const and5 = h.gate('AND', 480, 345);

          const xor2 = h.gate('XOR', 680, 400);
          const and6 = h.gate('AND', 880, 440);

          const y0 = h.output(1040, 130, 'Y0');
          const y1 = h.output(1040, 265, 'Y1');
          const y2 = h.output(1040, 400, 'Y2');
          const y3 = h.output(1040, 480, 'Y3');

          // Bridged wires — both feed XOR1 (the two PP10/PP01 outputs).
          // The bridge applies along these wires; the AND5 sees the
          // (separately routed) PP10 / PP01 outputs unaffected.
          const wireA = h.wire(pp10.id, xor1.id, 0);    // PP10 → XOR1.in0
          const wireB = h.wire(pp01.id, xor1.id, 1);    // PP01 → XOR1.in1
          wireA.bridgedWith = wireB.id;
          wireA.bridgeMode  = 'and';
          wireB.bridgedWith = wireA.id;
          wireB.bridgeMode  = 'and';

          return {
            nodes: [
              a0, a1, b0, b1,
              pp00, pp10, pp01, pp11,
              xor1, and5,
              xor2, and6,
              y0, y1, y2, y3,
            ],
            wires: [
              h.wire(a0.id, pp00.id, 0),
              h.wire(b0.id, pp00.id, 1),
              h.wire(a1.id, pp10.id, 0),
              h.wire(b0.id, pp10.id, 1),
              h.wire(a0.id, pp01.id, 0),
              h.wire(b1.id, pp01.id, 1),
              h.wire(a1.id, pp11.id, 0),
              h.wire(b1.id, pp11.id, 1),
              h.wire(pp00.id, y0.id, 0),

              wireA,                                      // BRIDGED
              wireB,                                      // BRIDGED

              h.wire(pp10.id, and5.id, 0),
              h.wire(pp01.id, and5.id, 1),
              h.wire(xor1.id, y1.id, 0),

              h.wire(pp11.id, xor2.id, 0),
              h.wire(and5.id, xor2.id, 1),
              h.wire(pp11.id, and6.id, 0),
              h.wire(and5.id, and6.id, 1),
              h.wire(xor2.id, y2.id, 0),
              h.wire(and6.id, y3.id, 0),
            ],
          };
        }),
      },

      // ─────────────────────────────────────────────────────────
      // Part ז — Stuck-at-0 on the C1 wire (AND5.out).
      //   Detection vector: A=B=11 (all ones)  ⇒  C1 should be 1.
      //   Without fault: Y3..Y0 = 1001 = 9 (since 3·3 = 9).
      //   With C1 s-a-0:
      //     XOR2(PP11=1, 0) = 1  → Y2 flips 0→1
      //     AND6(PP11=1, 0) = 0  → Y3 flips 1→0
      //   Both Y2 AND Y3 differ — clear detection.
      // ─────────────────────────────────────────────────────────
      {
        label: 'ז',
        question: 'במעגל מסעיף א\' אחד החוטים מוזרק עם תקלת **\`stuck-at-0\`** — הקו \`AND5.out\` (כלומר \`C1\` תקוע ב-0), מסומן ב**אדום** בשרטוט. **מהו וקטור הקלט המינימלי שמזהה את התקלה ומאשש שאכן הקו הזה הוא הפגום?** הסבר את ה-trade-off של מינימום וקטור לעומת זיהוי ייחודי של מיקום התקלה.',
        schematic: `
<svg viewBox="0 0 900 400" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Stuck-at-0 fault on AND5.out (C1) wire.">

  <text x="450" y="36" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="24">
    Stuck-at-0 fault — C1 תקוע ב-0
  </text>

  <!-- Inputs -->
  <g font-size="20" font-weight="bold">
    <circle cx="60" cy="120" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="60" y="126" text-anchor="middle" fill="#cca040">A1</text>
    <circle cx="60" cy="180" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="60" y="186" text-anchor="middle" fill="#cca040">B0</text>
    <circle cx="60" cy="240" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="60" y="246" text-anchor="middle" fill="#cca040">A0</text>
    <circle cx="60" cy="300" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="60" y="306" text-anchor="middle" fill="#cca040">B1</text>
  </g>

  <!-- Wires to PP gates -->
  <g stroke="#5a6e80" stroke-width="1.6" fill="none">
    <path d="M 80 120 L 180 120 L 180 145 L 220 145"/>
    <path d="M 80 180 L 180 180 L 180 155 L 220 155"/>
    <path d="M 80 240 L 180 240 L 180 265 L 220 265"/>
    <path d="M 80 300 L 180 300 L 180 275 L 220 275"/>
  </g>

  <!-- PP10 -->
  <path d="M 220 130 L 250 130 A 25 25 0 0 1 250 180 L 220 180 Z"
        fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
  <text x="240" y="158" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">PP10</text>

  <!-- PP01 -->
  <path d="M 220 250 L 250 250 A 25 25 0 0 1 250 300 L 220 300 Z"
        fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
  <text x="240" y="278" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">PP01</text>

  <!-- Wires PP10/PP01 → AND5 -->
  <g stroke="#5a6e80" stroke-width="1.6" fill="none">
    <path d="M 280 155 L 360 155 L 360 200 L 400 200"/>
    <path d="M 280 275 L 360 275 L 360 215 L 400 215"/>
  </g>

  <!-- AND5 -->
  <path d="M 400 185 L 430 185 A 30 30 0 0 1 430 245 L 400 245 Z"
        fill="#1a2230" stroke="#80c8ff" stroke-width="2.2"/>
  <text x="420" y="218" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">AND5</text>

  <!-- ════════ The STUCK-AT-0 wire (red, highlighted) ════════ -->
  <g stroke="#ff6060" stroke-width="3.8" fill="none">
    <path d="M 460 215 L 720 215"/>
  </g>

  <!-- "stuck-at-0" label -->
  <rect x="500" y="245" width="180" height="40" rx="8" fill="rgba(255,96,96,0.16)" stroke="#ff6060" stroke-width="1.8"/>
  <text x="590" y="269" text-anchor="middle" fill="#ff8080" font-size="18" font-weight="bold">✗ stuck-at-0</text>
  <text x="590" y="207" text-anchor="middle" fill="#ff9999" font-size="18" font-weight="bold" font-style="italic">C1</text>

  <!-- Branches to XOR2 and AND6 -->
  <g stroke="#5a6e80" stroke-width="1.6" fill="none">
    <path d="M 720 215 L 760 215 L 760 165 L 780 165"/>
    <path d="M 720 215 L 760 215 L 760 320 L 780 320"/>
    <circle cx="720" cy="215" r="3.5" fill="#5a6e80"/>
  </g>

  <!-- XOR2 -->
  <g>
    <path d="M 780 145 Q 808 165, 780 185 L 815 185 Q 845 185, 858 165 Q 845 145, 815 145 Z"
          fill="#1a3a2a" stroke="#80f0a0" stroke-width="2.2"/>
    <text x="818" y="170" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">XOR2</text>
  </g>
  <!-- AND6 -->
  <g>
    <path d="M 780 295 L 815 295 A 25 25 0 0 1 815 345 L 780 345 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="800" y="323" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">AND6</text>
  </g>

  <!-- Outputs -->
  <text x="870" y="170" fill="#ff9933" font-size="18" font-weight="bold">→ Y2</text>
  <text x="870" y="324" fill="#ff9933" font-size="18" font-weight="bold">→ Y3</text>

  <!-- Context note -->
  <text x="450" y="380" text-anchor="middle" fill="#c8b090" font-size="18" font-style="italic">
    C1 = AND5.out → צרכנים: XOR2 (Y2) ו-AND6 (Y3). תקלת s-a-0 משפיעה על שניהם.
  </text>
</svg>`,
        hints: [
          '\`stuck-at-0\` נחשף רק כש**הערך הצפוי על החוט הוא 1**. אם הצפי 0 → התקלה שקופה.',
          'מתי \`C1 = AND5.out = 1\`? כש-\`PP10 = PP01 = 1\`, כלומר \`A1=B0=1\` ו-\`A0=B1=1\`. כלומר **A0=A1=B0=B1=1** = A=B=3.',
          'בחר \`A=B=11\` (כלומר \`A·B=9=1001\`): מצופה Y3=1, Y2=0, Y1=0, Y0=1.',
          'C1 משפיע על \`XOR2\` (לחישוב Y2) ועל \`AND6\` (לחישוב Y3). תקלת stuck-at-0 ב-C1 תשנה את שניהם.',
          'עם C1 stuck=0: Y2 = XOR2(PP11=1, 0) = **1** במקום 0, Y3 = AND6(PP11=1, 0) = **0** במקום 1.',
          'מינימום: **1 וקטור** מזהה את התקלה. אבל כדי **לוודא שזה דווקא C1** (ולא, למשל, PP11 או AND5 עצמו) — צריך וקטורים נוספים להבחנה.',
        ],
        answer:
`## וקטור הקלט: \`A = 11, B = 11\` (כלומר A0=A1=B0=B1=1) — **מינימום = 1 וקטור** לזיהוי

---

### למה דווקא הוקטור הזה

עיקרון בסיסי של stuck-at: לחשוף תקלת \`s-a-0\` על חוט, צריך וקטור שגורם לערך הצפוי על אותו חוט להיות **1**.

1. \`stuck-at-0\` מתבטא רק כש**הצפי על החוט הוא 1**. לכן \`C1 = PP10 · PP01 = 1\` מחייב \`PP10=PP01=1\` ⇒ \`A1·B0=1 ∧ A0·B1=1\` ⇒ \`A0=A1=B0=B1=1\`.
2. אחרי טעינת הקלט, מציפים את ה-XOR2 וה-AND6 — שני הצרכנים של C1 — ובוחנים את Y2/Y3.

### מה רואים בפלט עם הוקטור \`A=B=11\` ⇒ A·B = 3·3 = **9** = 1001

חישוב ללא תקלה:
- PP00=1, PP10=1, PP01=1, PP11=1
- Y1 = PP10 ⊕ PP01 = 1 ⊕ 1 = **0**
- C1 = PP10 · PP01 = 1 · 1 = **1**
- Y2 = PP11 ⊕ C1 = 1 ⊕ 1 = **0**
- Y3 = PP11 · C1 = 1 · 1 = **1**
- **Y3..Y0 = 1001 = 9** ✓

עם C1 stuck-at-0:
- C1 = **0** (תקוע) במקום 1
- Y2 = XOR2(PP11=1, 0) = **1** ❌ (היה 0)
- Y3 = AND6(PP11=1, 0) = **0** ❌ (היה 1)

| | ללא תקלה | עם stuck-at-0 | הבדל |
|---|:---:|:---:|:---:|
| Y0 | 1 | 1 | — |
| Y1 | 0 | 0 | — |
| **Y2** | **0** | **1** | ✓ נחשף |
| **Y3** | **1** | **0** | ✓ נחשף |

**הפלט הנצפה: 0101 = 5 במקום הצפוי 1001 = 9.**

### Trade-off: זיהוי vs לוקליזציה

| מטרה | מספר וקטורים | למה |
|---|:---:|---|
| **לזהות שיש תקלה** | 1 (A=B=11) | רואים Y2/Y3 שונים מהצפי |
| **לקבוע שזה דווקא C1** | 2-3 וקטורים נוספים | להבחין מ-PP11 s-a-0 או AND5 s-a-0 |

**אילו תקלות יוצרות אותו פלט (Y2=1, Y3=0) עם A=B=11?**
- C1 s-a-0 (התקלה הזו)
- AND5 s-a-0 (התקלה במקור — לפני האות יוצא)
- PP11 s-a-0 (גם הוא ייתן Y3=0 דרך AND6, אבל Y2 = 0 ⊕ 1 = 1 — same!)

→ לבדל בין שלושת אלה, צריך וקטור נוסף שבו **רק** C1 צפוי להיות 1 אבל לא PP11 ולא AND5:
- \`A=01, B=11\` ⇒ PP11=0, AND5=PP10·PP01=0·1=0 → C1 צפוי 0 — לא חושף.
- \`A=10, B=11\` ⇒ PP11=1·1=1, PP10=A1·B0=1·1=1, PP01=A0·B1=0·1=0 → C1=0 — לא חושף.

הקושי: AND5 ו-C1 הם **אותו גורף** (output node = wire). אי-אפשר להבדיל ביניהם בלי בדיקה פיזית. → ב-fault dictionary, "AND5 output s-a-0" ו-"C1 wire s-a-0" הם **equivalent faults** — class fault model.

### Fault dictionary (concept)

לזיהוי-ייחודי בכל המעגל, ATPG מסחרי בונה **dictionary** של signatures:

| תקלה | A=11,B=11 | A=01,B=11 | A=11,B=01 |
|---|:---:|:---:|:---:|
| no fault | 1001 | 0011 | 0110 |
| C1 s-a-0 | 0101 | 0011 | 0010 |
| PP11 s-a-0 | 0101 | 0011 | 0010 |  // ← זהה — equivalent class |
| Y0 s-a-0 | 1000 | 0010 | 0110 |

**ל-stuck-at fault model מסחרי, ATPG מטפל בכל תקלה לפי class — לא תמיד מבחין בין equivalents.**

### בקנבס

המעגל מציג את ה-multiplier עם \`stuck-at-0\` מוזרק על הקו \`AND5.out\` (מסומן ב-✗). הצב \`A0=A1=B0=B1=1\`, צפה ב-Y2 שמציג 1 ב-מקום 0 ו-Y3 שמציג 0 במקום 1.`,
        interviewerMindset:
`**שאלה אמיתית מ-DFT.** המראיין מחפש:
1. **שאתה זוכר את הכלל**: stuck-at-0 = "צפי 1 על החוט". בלי הכלל הזה, התשובה תהיה אקראית.
2. **שאתה יודע לפענח את הביטוי הבוליאני** של C1: \`PP10·PP01 = (A1·B0)·(A0·B1) = A0A1B0B1\` ⇒ דורש **כל הביטים = 1**.
3. **שאתה מבחין בין detection ל-localization** — 1 וקטור לזהוי, אבל 2-3 לוקליזציה ייחודית.
4. **שאתה מזכיר equivalent faults** — AND5 output ו-C1 wire הם תקלות שקולות. כל ATPG פרקטי משתמש ב-fault classes.

**שאלת המשך נפוצה**: "האם אתה יכול לבנות **fault dictionary** מלא ל-8 השערים?" → כל wire יש לו signature ייחודי על פני test set מספק. ATPG מודרני (Mentor TestKompress, Synopsys TestMAX) בונה זאת אוטומטית. ל-2-bit multiplier, ~6-8 וקטורים נותנים coverage מלא של stuck-at + dictionary לזיהוי class-level.

**שאלת bonus**: "מה אם הפגם הוא stuck-at-1 ולא 0?" → אותו עיקרון, פולאריות הפוכה. צפי 0 על החוט. ל-C1 s-a-1: צריך וקטור שגורם ל-C1=0, למשל \`A=10, B=01\` (PP10=0, PP01=0 ⇒ C1=0; עם s-a-1, C1=1 → משפיע על Y2/Y3).

**שאלת bonus 2**: "Multiplier sym לעומת adder — האם DFT שונה?" → כן: multipliers מייצרים יותר fanout (כל input משפיע על כל output), וזה בעצם **טוב ל-fault coverage** — וקטורים מועטים יותר נדרשים. ל-2-bit multiplier יש 16 input vectors שמכסים 100% stuck-at faults. ל-2-bit adder יש 32 ולא הכל נדרשים.`,
        expectedAnswers: [
          'stuck-at-0', 's-a-0', 'תקוע ב-0',
          '1', 'one vector', 'וקטור אחד',
          'A=11', 'B=11', 'A0=A1=B0=B1=1', 'all ones',
          'Y2', 'Y3', 'C1', 'AND5',
          'detection', 'localization', 'fault dictionary',
          'equivalent fault', 'equivalent class',
          'PP11',
        ],
        circuit: () => build(() => {
          // 8-gate multiplier with stuck-at-0 injected on the C1 wire
          // (AND5.out → XOR2 / AND6).
          //
          // Default inputs preloaded to the detection vector:
          //   A0=A1=B0=B1=1   ⇒  A·B = 9 = 1001 (expected)
          //   With s-a-0 on C1: Y2 flips 0→1, Y3 flips 1→0 → 0101 = 5
          //
          // The wire object carries `stuckAt: 0` for the engine; the
          // schematic above marks it visually with the red ✗.
          const a0 = h.input(80,  100, 'A0');  a0.fixedValue = 1;
          const a1 = h.input(80,  200, 'A1');  a1.fixedValue = 1;
          const b0 = h.input(80,  340, 'B0');  b0.fixedValue = 1;
          const b1 = h.input(80,  440, 'B1');  b1.fixedValue = 1;

          const pp00 = h.gate('AND', 260, 130);
          const pp10 = h.gate('AND', 260, 220);
          const pp01 = h.gate('AND', 260, 310);
          const pp11 = h.gate('AND', 260, 400);

          const xor1 = h.gate('XOR', 480, 265);
          const and5 = h.gate('AND', 480, 345);

          const xor2 = h.gate('XOR', 680, 400);
          const and6 = h.gate('AND', 880, 440);

          const y0 = h.output(1040, 130, 'Y0');
          const y1 = h.output(1040, 265, 'Y1');
          const y2 = h.output(1040, 400, 'Y2');
          const y3 = h.output(1040, 480, 'Y3');

          // Inject stuck-at-0 on both fanout branches of C1.
          const wireC1toXOR2 = h.wire(and5.id, xor2.id, 1);
          const wireC1toAND6 = h.wire(and5.id, and6.id, 1);
          wireC1toXOR2.stuckAt = 0;
          wireC1toAND6.stuckAt = 0;

          return {
            nodes: [
              a0, a1, b0, b1,
              pp00, pp10, pp01, pp11,
              xor1, and5,
              xor2, and6,
              y0, y1, y2, y3,
            ],
            wires: [
              h.wire(a0.id, pp00.id, 0),
              h.wire(b0.id, pp00.id, 1),
              h.wire(a1.id, pp10.id, 0),
              h.wire(b0.id, pp10.id, 1),
              h.wire(a0.id, pp01.id, 0),
              h.wire(b1.id, pp01.id, 1),
              h.wire(a1.id, pp11.id, 0),
              h.wire(b1.id, pp11.id, 1),

              h.wire(pp00.id, y0.id, 0),
              h.wire(pp10.id, xor1.id, 0),
              h.wire(pp01.id, xor1.id, 1),
              h.wire(pp10.id, and5.id, 0),
              h.wire(pp01.id, and5.id, 1),
              h.wire(xor1.id, y1.id, 0),

              h.wire(pp11.id, xor2.id, 0),
              wireC1toXOR2,                              // stuck-at-0
              h.wire(pp11.id, and6.id, 0),
              wireC1toAND6,                              // stuck-at-0

              h.wire(xor2.id, y2.id, 0),
              h.wire(and6.id, y3.id, 0),
            ],
          };
        }),
      },
    ],
    source: 'תכן לוגי / תזמון וסנכרון — מכפיל 2-ביט',
    tags: ['multiplier', 'partial-products', 'gate-level', 'identification', 'combinational', 'timing'],
    circuitRevealsAnswer: true,
  },

  // ─────────────────────────────────────────────────────────────
  // #5006 — Interview: CDC (Clock Domain Crossing)
  //
  //   Style: same as #5004/#5005. 4 parts:
  //     א — single-bit crossing: why direct sample → metastability,
  //         how 2-FF synchronizer fixes it (references #5002 MTBF).
  //     ב — multi-bit bus: independent sync per bit → transient
  //         illegal codewords even after settling.
  //     ג — three named industry fixes (FIFO / handshake / Gray).
  //     ד — Gray-coded sequence trace: single-bit-change invariant.
  //
  //   Live circuit (single global clock — see plan): a 3-bit bus
  //   crossing into one domain via 3 parallel 2-FF synchronizers.
  //   The "two domains" are pedagogical; the simulator runs one clock.
  // ─────────────────────────────────────────────────────────────
  {
    id: 'interview-cdc-multibit-gray',
    difficulty: 'hard',
    title: 'CDC — מטא-יציבות, סינכרון רב-ביטי וקוד Gray',
    intro:
`שני clock domains אסינכרוניים — \`CLK_A\` (200 MHz) ו-\`CLK_B\` (333 MHz). ה-domain שלך הוא **B**, ואתה מקבל ממנו אותות שמקורם בצד A:

- **אות יחיד** (\`async_in\`) — ערך 1-ביט שעובר את הגבול.
- **אוטובוס 3-ביט** (\`bus[2:0]\`) — תוצאה של מונה בצד A שעובר כל clock.

המראיין אומר: "תן לי מעגל סינכרון ל-3 הקווים. תזכור שיש metastability."

השאלה בודקת **הרכבה** של ידע: אתה מצוטט ל-#5002 (MTBF), אבל הפעם הסיפור עמוק יותר — multi-bit CDC הוא לא רק "סינכרונייזר לכל ביט".`,
    schematic: `
<svg viewBox="0 0 1000 760" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="20" role="img" aria-label="Two clock domains with an async boundary; bus crossing with parallel 2-FF synchronizers.">

  <text x="500" y="48" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="32">
    CDC — שני clock domains, אות יחיד + bus
  </text>
  <text x="500" y="80" text-anchor="middle" fill="#a0a0c0" font-size="20" font-style="italic">
    CLK_A → CLK_B  ·  סינכרון פר-ביט מספיק לאות יחיד; לא מספיק ל-bus
  </text>

  <!-- ════════ Domain boundary (vertical dashed red wall) ════════ -->
  <line x1="480" y1="120" x2="480" y2="700" stroke="#f08080" stroke-width="3.5" stroke-dasharray="9,5"/>
  <rect x="40"  y="120" width="440" height="580" fill="rgba(255,176,128,0.04)" stroke="none"/>
  <rect x="480" y="120" width="480" height="580" fill="rgba(128,255,176,0.04)" stroke="none"/>

  <text x="260" y="148" text-anchor="middle" fill="#ffb080" font-weight="bold" font-size="24">
    DOMAIN A — CLK_A (200 MHz)
  </text>
  <text x="720" y="148" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="24">
    DOMAIN B — CLK_B (333 MHz)
  </text>

  <text x="480" y="184" text-anchor="middle" fill="#ff9999" font-size="20" font-weight="bold">
    ⚠ async boundary
  </text>

  <!-- ════════ Single-bit async crossing (top) ════════ -->
  <circle cx="80" cy="250" r="26" fill="#0a1825" stroke="#cca040" stroke-width="2.4"/>
  <text x="80" y="258" text-anchor="middle" fill="#cca040" font-size="18" font-weight="bold">async_in</text>

  <line x1="106" y1="250" x2="560" y2="250" stroke="#cc99ff" stroke-width="3"/>
  <text x="290" y="232" text-anchor="middle" fill="#cc99ff" font-size="18" font-style="italic">crosses boundary</text>

  <!-- 2-FF synchronizer for the single bit -->
  <rect x="560" y="222" width="110" height="56" rx="7" fill="#1a1428" stroke="#cc66ff" stroke-width="2.6"/>
  <text x="615" y="256" text-anchor="middle" fill="#cc99ff" font-size="20" font-weight="bold">FF_S1</text>

  <rect x="700" y="222" width="110" height="56" rx="7" fill="#1a1428" stroke="#cc66ff" stroke-width="2.6"/>
  <text x="755" y="256" text-anchor="middle" fill="#cc99ff" font-size="20" font-weight="bold">FF_S2</text>

  <line x1="670" y1="250" x2="700" y2="250" stroke="#a0a0c0" stroke-width="2.4"/>
  <line x1="810" y1="250" x2="900" y2="250" stroke="#ff9933" stroke-width="2.4"/>

  <circle cx="920" cy="250" r="26" fill="#0a1825" stroke="#ff9933" stroke-width="2.4"/>
  <text x="920" y="258" text-anchor="middle" fill="#ff9933" font-size="18" font-weight="bold">sync_out</text>

  <text x="685" y="305" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">
    2-FF synchronizer (סעיף א')
  </text>

  <!-- ════════ Multi-bit bus crossing (middle, 3 parallel) ════════ -->
  ${[0, 1, 2].map(i => {
    const y = 410 + i * 80;
    return `
      <circle cx="80" cy="${y}" r="24" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
      <text x="80" y="${y + 6}" text-anchor="middle" fill="#cca040" font-size="18" font-weight="bold">bus[${i}]</text>
      <line x1="104" y1="${y}" x2="560" y2="${y}" stroke="#cc99ff" stroke-width="2.4"/>
      <rect x="560" y="${y - 24}" width="100" height="48" rx="7" fill="#1a1428" stroke="#cc66ff" stroke-width="2.4"/>
      <text x="610" y="${y + 6}" text-anchor="middle" fill="#cc99ff" font-size="20" font-weight="bold">FF1_${i}</text>
      <rect x="690" y="${y - 24}" width="100" height="48" rx="7" fill="#1a1428" stroke="#cc66ff" stroke-width="2.4"/>
      <text x="740" y="${y + 6}" text-anchor="middle" fill="#cc99ff" font-size="20" font-weight="bold">FF2_${i}</text>
      <line x1="660" y1="${y}" x2="690" y2="${y}" stroke="#a0a0c0" stroke-width="2"/>
      <line x1="790" y1="${y}" x2="896" y2="${y}" stroke="#ff9933" stroke-width="2.2"/>
      <circle cx="920" cy="${y}" r="24" fill="#0a1825" stroke="#ff9933" stroke-width="2.2"/>
      <text x="920" y="${y + 6}" text-anchor="middle" fill="#ff9933" font-size="18" font-weight="bold">q[${i}]</text>
    `;
  }).join('')}

  <!-- Bus label -->
  <text x="280" y="390" text-anchor="middle" fill="#ffc890" font-size="20" font-weight="bold">
    bus[2:0] — 3 ביטים מקבילים שצריכים לעבור יחד
  </text>
  <text x="685" y="660" text-anchor="middle" fill="#ff8080" font-size="20" font-weight="bold" font-style="italic">
    ⚠ סינכרון פר-ביט אינו מספיק — מטופל בסעיף ב'
  </text>

  <!-- CLK_B label at the bottom -->
  <rect x="600" y="700" width="280" height="42" rx="8" fill="rgba(128,240,160,0.10)" stroke="#80f0a0" stroke-width="1.8"/>
  <text x="740" y="728" text-anchor="middle" fill="#80f0a0" font-size="20" font-weight="bold">
    CLK_B → כל ה-FFs בצד B
  </text>
</svg>`,
    parts: [
      // ─────────────────────────────────────────────────────────
      // Part א — Single-bit CDC + metastability + 2-FF synchronizer
      // ─────────────────────────────────────────────────────────
      {
        label: 'א',
        question: 'נתון ה-\`async_in\` המגיע מ-domain A. אם תדגום אותו ישירות ב-FF בודד ב-domain B, מה הסיכון? מה הפתרון הסטנדרטי, ולמה הוא **לא** מבטיח 100% נכונות?',
        hints: [
          'הקלט \`async_in\` נשלט ע"י \`CLK_A\`, ה-FF דוגם ב-\`CLK_B\`. שני השעונים אסינכרוניים → ייתכן ש-\`async_in\` משתנה בתוך חלון ה-setup/hold של ה-FF.',
          'הפרת setup/hold ב-FF גורמת ל-**metastability** — היציאה תקועה באזור ביניים בין 0 ל-1 לזמן לא צפוי (τ).',
          'הפתרון הקלאסי: **2-FF synchronizer** — שני FFs בטור, שניהם ב-\`CLK_B\`. FF1 ייתכן metastable; FF2 דוגם **את היציאה של FF1** אחרי cycle שלם — סביר ש-FF1 כבר התיישב.',
          'המפתח: **לא** מבטיח נכונות, רק **מקטין את הסבירות**. ראה את נוסחת ה-MTBF ב-#5002.',
          'נוסחת MTBF: \`MTBF = exp(t_r / τ) / (T_w · f_clk · f_data)\`. שני שלבים = \`t_r\` כפול → exponent כפול → MTBF גדל **אקספוננציאלית**.',
        ],
        answer:
`### הבעיה: דגימה ישירה
דגימת \`async_in\` ב-FF יחיד שנשלט ב-\`CLK_B\` חוצה את גבול ה-setup/hold של ה-FF באקראיות. כשמתרחשת הפרה → **metastability**: ה-FF "נתקע" בין 0 ל-1 לזמן \`τ\` (זמן הסתגלות) שמשתנה אקראית, ואחריו מתייצב על 0 או 1 (אקראי, **לא** את הערך שנדגם!).

ב-metastability:
- היציאה לא חוקית (לא 0 ולא 1) — הלוגיקה במורד הזרם תפעל לא צפוי.
- אם מעבירים את היציאה ל-FF נוסף עוד באותו cycle → מטא-יציבות מתפשטת ל-fan-out כולו.

### הפתרון: 2-FF synchronizer
\`\`\`
async_in → [FF_S1] → [FF_S2] → sync_out
              ↑          ↑
            CLK_B      CLK_B  (לא CLK_A!)
\`\`\`

| שלב | מה קורה |
|---|---|
| FF_S1 | דוגם את \`async_in\`. **עלול להיכנס ל-metastability**. |
| ה-cycle בין FF_S1 ל-FF_S2 | זמן הסתגלות (\`t_r\`) — FF_S1 מתייצב על 0 או 1. |
| FF_S2 | דוגם את \`Q\` של FF_S1. אם FF_S1 הספיק להתייצב — \`sync_out\` יציב. |

### המחיר: latency
- וקטור פונקציונלי שעובר את הסינכרונייזר מתעכב ב-**1 cycle נוסף** (FF_S1) — סה"כ 2 cycles עד שהוא יציב.
- ב-pipelines עם handshakes זה לא בעיה; בקריטריוני מערכת real-time כן.

### המפתח: MTBF, לא 100%
ה-2-FF synchronizer **לא** מבטל metastability — רק מקטין **דרמטית** את סבירות ה-failure.

\`\`\`
MTBF_1FF = exp(t_clk / τ) / (T_w · f_clk · f_data)
MTBF_2FF = exp(t_clk · 2 / τ) / (T_w · f_clk · f_data)
\`\`\`

עם \`τ = 30 ps\`, \`T_w = 200 ps\`, \`t_clk = 3 ns\` (CLK_B), \`f_data = 200 MHz\`:
- \`MTBF_1FF ≈ exp(100) / (200e-12 · 333e6 · 200e6)\` → ~10^32 years (כבר ענק!).
- \`MTBF_2FF\` → exponent כפול → גדל באלפי סדרי גודל. בכל מערכת מודרנית, מספיק.

> **אזהרה לראיון**: ה-MTBF תלוי במספרים — בתהליכים מהירים יותר (5nm GHz) המספרים פחות נדיבים. עיצוב יחיד דורש חישוב לכל corner.

### בקנבס
המעגל מציג את ה-2-FF synchronizer בודד פעיל (\`async_in\` → FF_S1 → FF_S2 → sync_out). הצב \`async_in=1\`, פעם ב-CLK פעמיים → ה-1 מגיע ל-\`sync_out\` אחרי 2 מחזורים. שים לב: ה-engine **לא מודל metastability** — הוא מתפקד תמיד נכון. המטא-יציבות הוא נושא הסתברותי שלא נשקף ב-simulation דטרמיניסטי.`,
        interviewerMindset:
`**שאלת CDC קלאסית.** המראיין מחפש:
1. **שאתה מזכיר metastability** — לא "delay", לא "race". התנהגות **הסתברותית** של FF.
2. **שאתה זוכר את הסיבה ל-2 FFs** — לא רק "סינכרון" כשם, אלא **זמן הסתגלות** של FF_S1 לפני FF_S2 דוגם.
3. **שאתה לא טוען 100%** — סטודנט שאומר "2-FF פותר את הבעיה" נכשל. הוא **מקטין** את ההסתברות.
4. **שאתה מצטט את MTBF** — אם המראיין שואל "כמה?" → הנוסחה. אם לא — לפחות "exp(t_r/τ)".

**שאלת המשך**: "כמה FFs מספיקים?" → ב-corner מהיר ייתכן שצריך 3. מעצבים שמרניים שמים 2 + מאפשרים configurability לעיצוב.

**שאלת bonus**: "מה אם השעון השני מהיר יותר?" → MTBF יורד (פחות זמן הסתגלות). פתרון: יותר FFs, או שעון תיחזוקה איטי יותר ייעודי ל-CDC.

**מלכודת**: סטודנטים מציעים "לעבד את \`async_in\` בלוגיקה לפני ה-FF" כדי "להחליק" אותו. שגוי לחלוטין — לוגיקה לא עוזרת ל-metastability, רק מפיצה אותה.

**ראה גם**: #5002 — שאלת CDC בסיסית עם MTBF.`,
        expectedAnswers: [
          'metastability', 'מטא-יציבות', 'מטא',
          '2-FF synchronizer', '2 FFs', 'שני FFs',
          'CLK_B', 'CDC',
          'MTBF', 'mean time between failures',
          'τ', 'tau', 'settling time', 'זמן הסתגלות',
          'probabilistic', 'הסתברותי',
          'latency', '2 cycles',
        ],
        circuit: () => build(() => {
          // Live circuit: a 3-bit bus crossing into Domain B via three
          // parallel 2-FF synchronizers. The "two domains" are
          // pedagogical — the engine runs a single global clock,
          // documented in part א mindset.
          //
          // Defaults: every async input = 1 → after 2 clocks every
          // sync_out = 1 → student sees motion immediately.
          const clk = h.clock(80, 600, 'CLK_B');

          // Single-bit synchronizer (top)
          const asyncIn = h.input(80, 100, 'async_in');  asyncIn.fixedValue = 1;
          const ffS1 = h.ffD(360, 100, 'FF_S1');
          const ffS2 = h.ffD(560, 100, 'FF_S2');
          const syncOut = h.output(760, 100, 'sync_out');

          // 3-bit bus (3 parallel synchronizers)
          const bus0 = h.input(80,  240, 'bus0');  bus0.fixedValue = 1;
          const bus1 = h.input(80,  340, 'bus1');  bus1.fixedValue = 0;
          const bus2 = h.input(80,  440, 'bus2');  bus2.fixedValue = 1;

          const ff1_b0 = h.ffD(360, 240, 'FF1_b0');
          const ff2_b0 = h.ffD(560, 240, 'FF2_b0');
          const q0 = h.output(760, 240, 'q0');

          const ff1_b1 = h.ffD(360, 340, 'FF1_b1');
          const ff2_b1 = h.ffD(560, 340, 'FF2_b1');
          const q1 = h.output(760, 340, 'q1');

          const ff1_b2 = h.ffD(360, 440, 'FF1_b2');
          const ff2_b2 = h.ffD(560, 440, 'FF2_b2');
          const q2 = h.output(760, 440, 'q2');

          return {
            nodes: [
              clk,
              asyncIn, ffS1, ffS2, syncOut,
              bus0, ff1_b0, ff2_b0, q0,
              bus1, ff1_b1, ff2_b1, q1,
              bus2, ff1_b2, ff2_b2, q2,
            ],
            wires: [
              // Single-bit chain
              h.wire(asyncIn.id, ffS1.id, 0),
              h.wire(clk.id, ffS1.id, 1, 0, { isClockWire: true }),
              h.wire(ffS1.id, ffS2.id, 0),
              h.wire(clk.id, ffS2.id, 1, 0, { isClockWire: true }),
              h.wire(ffS2.id, syncOut.id, 0),
              // Bus bit 0
              h.wire(bus0.id, ff1_b0.id, 0),
              h.wire(clk.id, ff1_b0.id, 1, 0, { isClockWire: true }),
              h.wire(ff1_b0.id, ff2_b0.id, 0),
              h.wire(clk.id, ff2_b0.id, 1, 0, { isClockWire: true }),
              h.wire(ff2_b0.id, q0.id, 0),
              // Bus bit 1
              h.wire(bus1.id, ff1_b1.id, 0),
              h.wire(clk.id, ff1_b1.id, 1, 0, { isClockWire: true }),
              h.wire(ff1_b1.id, ff2_b1.id, 0),
              h.wire(clk.id, ff2_b1.id, 1, 0, { isClockWire: true }),
              h.wire(ff2_b1.id, q1.id, 0),
              // Bus bit 2
              h.wire(bus2.id, ff1_b2.id, 0),
              h.wire(clk.id, ff1_b2.id, 1, 0, { isClockWire: true }),
              h.wire(ff1_b2.id, ff2_b2.id, 0),
              h.wire(clk.id, ff2_b2.id, 1, 0, { isClockWire: true }),
              h.wire(ff2_b2.id, q2.id, 0),
            ],
          };
        }),
        answerSchematic: `
<svg viewBox="0 0 960 700" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="20" role="img" aria-label="Single bit through a 2-FF synchronizer; metastability resolves between FF_S1 and FF_S2.">

  <text x="480" y="50" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="32">
    2-FF Synchronizer — איך metastability מתיישבת
  </text>
  <text x="480" y="84" text-anchor="middle" fill="#a0a0c0" font-size="20" font-style="italic">
    FF_S1 עלול להיות metastable · ה-cycle עד FF_S2 = זמן הסתגלות t_r
  </text>

  <!-- ════════ Cycle 0 panel (red — metastable) ════════ -->
  <rect x="40" y="120" width="880" height="200" rx="14" fill="rgba(255,96,96,0.05)" stroke="rgba(255,96,96,0.55)" stroke-width="2"/>
  <text x="480" y="156" text-anchor="middle" fill="#ff8080" font-weight="bold" font-size="24">
    Cycle 0 — דגימה ראשונה (FF_S1 ייתכן metastable)
  </text>

  <!-- async input -->
  <circle cx="100" cy="240" r="26" fill="#0a1825" stroke="#cca040" stroke-width="2.4"/>
  <text x="100" y="248" text-anchor="middle" fill="#cca040" font-size="18" font-weight="bold">async</text>
  <line x1="126" y1="240" x2="290" y2="240" stroke="#cca040" stroke-width="2.4"/>

  <!-- FF_S1 with metastable warning -->
  <rect x="290" y="208" width="160" height="70" rx="8" fill="#1a1428" stroke="#cc66ff" stroke-width="2.8"/>
  <text x="370" y="238" text-anchor="middle" fill="#cc99ff" font-size="24" font-weight="bold">FF_S1</text>
  <text x="370" y="263" text-anchor="middle" fill="#ff8080" font-size="18" font-weight="bold">⚠ metastable?</text>

  <!-- Undefined wire -->
  <line x1="450" y1="244" x2="610" y2="244" stroke="#ff8080" stroke-width="4" stroke-dasharray="6,4"/>
  <text x="530" y="230" text-anchor="middle" fill="#ff8080" font-size="18" font-style="italic">value undefined</text>

  <!-- FF_S2 - not sampling yet -->
  <rect x="610" y="208" width="160" height="70" rx="8" fill="#1a1428" stroke="#cc66ff" stroke-width="2.4" stroke-dasharray="4,3"/>
  <text x="690" y="238" text-anchor="middle" fill="#cc99ff" font-size="24" font-weight="bold">FF_S2</text>
  <text x="690" y="263" text-anchor="middle" fill="#a0a0c0" font-size="18">לא דוגם עוד</text>

  <!-- Unknown output -->
  <line x1="770" y1="244" x2="860" y2="244" stroke="#a0a0c0" stroke-width="2.4" stroke-dasharray="5,4"/>
  <circle cx="888" cy="244" r="24" fill="#0a1825" stroke="#a0a0c0" stroke-width="2"/>
  <text x="888" y="252" text-anchor="middle" fill="#a0a0c0" font-size="24" font-weight="bold">?</text>

  <!-- ════════ Cycle 1 panel (green — settled) ════════ -->
  <rect x="40" y="350" width="880" height="200" rx="14" fill="rgba(128,240,160,0.05)" stroke="rgba(128,240,160,0.55)" stroke-width="2"/>
  <text x="480" y="386" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="24">
    Cycle 1 — אחרי זמן הסתגלות t_r (FF_S1 התייצב, FF_S2 דוגם נקי)
  </text>

  <!-- async input -->
  <circle cx="100" cy="470" r="26" fill="#0a1825" stroke="#cca040" stroke-width="2.4"/>
  <text x="100" y="478" text-anchor="middle" fill="#cca040" font-size="18" font-weight="bold">async</text>
  <line x1="126" y1="470" x2="290" y2="470" stroke="#cca040" stroke-width="2.4"/>

  <!-- FF_S1 settled -->
  <rect x="290" y="438" width="160" height="70" rx="8" fill="#1a1428" stroke="#80f0a0" stroke-width="3"/>
  <text x="370" y="468" text-anchor="middle" fill="#80f0a0" font-size="24" font-weight="bold">FF_S1</text>
  <text x="370" y="493" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">✓ settled (0 or 1)</text>

  <!-- Stable wire -->
  <line x1="450" y1="474" x2="610" y2="474" stroke="#80f0a0" stroke-width="4"/>
  <text x="530" y="460" text-anchor="middle" fill="#80f0a0" font-size="18" font-style="italic">stable</text>

  <!-- FF_S2 samples clean -->
  <rect x="610" y="438" width="160" height="70" rx="8" fill="#1a1428" stroke="#80f0a0" stroke-width="3"/>
  <text x="690" y="468" text-anchor="middle" fill="#80f0a0" font-size="24" font-weight="bold">FF_S2</text>
  <text x="690" y="493" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">✓ samples clean</text>

  <!-- sync output -->
  <line x1="770" y1="474" x2="860" y2="474" stroke="#ff9933" stroke-width="3"/>
  <circle cx="888" cy="474" r="24" fill="#0a1825" stroke="#ff9933" stroke-width="2.4"/>
  <text x="888" y="482" text-anchor="middle" fill="#ff9933" font-size="18" font-weight="bold">sync</text>

  <!-- ════════ MTBF formula box ════════ -->
  <rect x="40" y="582" width="880" height="100" rx="12" fill="rgba(204,102,255,0.06)" stroke="#cc66ff" stroke-width="2"/>
  <text x="480" y="614" text-anchor="middle" fill="#cc99ff" font-weight="bold" font-size="24">
    MTBF (2-FF) = exp(2·t_clk / τ) / (T_w · f_clk · f_data)
  </text>
  <text x="480" y="644" text-anchor="middle" fill="#c8b090" font-size="20">
    שני שלבים → exponent כפול → MTBF גדל אקספוננציאלית · בעבודה ~10⁴⁰⁺ שנים
  </text>
  <text x="480" y="670" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">
    ראה #5002 לחישוב מלא של MTBF
  </text>
</svg>`,
      },

      // ─────────────────────────────────────────────────────────
      // Part ב — Multi-bit bus: independent sync per bit fails
      // ─────────────────────────────────────────────────────────
      {
        label: 'ב',
        question: 'נתון ה-bus 3-ביט מ-domain A: \`bus[2:0]\` שמתעדכן בכל \`CLK_A\` במונה (\`000→001→010→011→100→...\`). אתה מציב 2-FF synchronizer **לכל ביט בנפרד** ב-domain B (3 סינכרונייזרים מקבילים). מועמדים רבים מבצעים את זה בראיון — **למה זה שגוי**? תן דוגמה קונקרטית שבה \`q[2:0]\` ב-domain B **לא יהיה אף ערך חוקי של המונה**, אפילו אחרי הסתגלות.',
        hints: [
          'ב-2-FF synchronizer פר-ביט, **כל ביט מסתגל בנפרד**. אם ביט אחד נתקל ב-metastability ב-FF_S1 והאחר לא, הם מתייצבים ב-cycles שונים.',
          'דוגמה: bus עובר מ-\`011\` ל-\`100\` — **שלושת הביטים מתחלפים בו-זמנית**. אם ה-FF_S1 של ביט 2 מסתגל מהר (= 1) וה-FF_S1 של ביטים 0,1 מסתגלים איטי (= עדיין 1) → אחרי cycle 1 ה-FF_S2 דוגם \`111\`.',
          'התוצאה: \`q[2:0] = 111\` — ערך **שלא היה אף פעם במונה**! המונה היה \`011\` או \`100\`, אבל לא \`111\`.',
          'הבעיה היא **בו-זמניות**: כל סינכרונייזר עובד נכון בנפרד, אבל אין סינכרון בין הסינכרונייזרים. הם "נחתכים" באמצע מעבר.',
          'הפתרון לא יכול להיות "להוסיף עוד FFs". צריך **מבנה אחר** — נדבר על זה בסעיף ג\'.',
        ],
        answer:
`### הבעיה: bus crossing עם sync per-bit

עם 3 סינכרונייזרים נפרדים, **כל ביט מתיישב בעצמאות**. אם הביטים מתחלפים בו-זמנית (כמו מעבר מ-\`011\` → \`100\` במונה), הסבירות שכולם יתיישבו ב**אותו** cycle היא לא 100%.

### תרחיש שגוי: \`011 → 100\`

תחילה: \`bus[2:0] = 011\`. רוצים שיגיע \`100\`.

| Cycle | FF_S1 ביט 2 | FF_S1 ביט 1 | FF_S1 ביט 0 | FF_S2 (= q[2:0]) | תקין? |
|:---:|:---:|:---:|:---:|:---:|:---:|
| t=0 | 0 (מ-011) | 1 | 1 | \`011\` | ✓ ערך ישן |
| t=1 | **1** (התיישב מהר) | metastable | metastable | \`011\` (קלט ישן עדיין) | ✓ ערך ישן |
| t=2 | 1 | **1** (התיישב) | **0** (התיישב) | \`110\` ← ❌ | ❌ ערך שלא קיים! |
| t=3 | 1 | 1 | 0 | \`110\` | ❌ ערך שלא קיים! |
| t=4 | ↓ (אם המונה התקדם) ... |||| ערך מאוחר |

**\`110\` הוא ערך שלא היה אף פעם במונה!** המונה היה \`011\` → \`100\`. \`110\` הוא ערך-ביניים שגוי שייכנס לעיצוב.

### למה זה קרה?

בקצה ההחלפה (\`011 → 100\`), שלושת הביטים נדגמו בסביבה אסינכרונית של חלון setup/hold. כל ביט מתיישב **לפי תזמון משלו**:

- ביט 2 (משתנה מ-0 ל-1) — דגימה ראשונה במעבר → ייתכן metastable, מתיישב על 1.
- ביט 1 (משתנה מ-1 ל-0) — ייתכן metastable, מתיישב על 0 או 1 (אקראי).
- ביט 0 (משתנה מ-1 ל-0) — אותו דבר.

כשהביטים מתחלפים זה בזה, **לא קיימת ערובה** ששלושתם יראו את אותו ערך באותו cycle. ה-FFs **כן** מתיישבים — אבל לערכים לא-תואמים זה לזה.

### מה זה אומר במציאות?

- מונה Gray (Gray code) לא חוטא: כל מעבר משנה בדיוק ביט אחד. **על זה נדבר ב-ד'.**
- מונה Binary רגיל: בכל מעבר ייתכנו מ-1 עד N החלפות ביטים בו-זמנית. **בעיה ב-CDC.**

### בקנבס

נסה: הצב \`bus0=1, bus1=1, bus2=0\` (= 011 = 3). פעם 2 פעמים → q[2:0]=011. עכשיו החלף **בו-זמנית** ל-\`bus0=0, bus1=0, bus2=1\` (= 100 = 4) ופעם פעם אחת.

ה-engine **לא מבטא** את הבעיה (הוא דטרמיניסטי) — הוא יראה q=100 מיד. **במציאות, ה-FFs ייתכן ויראו ערך-ביניים כמו 110 או 011 או 000 בסבב מעבר.** השאלה הזו לא נצפית ב-simulation; היא מתגלה רק ב-silicon validation או ב-formal CDC tools (כמו Synopsys SpyGlass CDC).`,
        interviewerMindset:
`**שאלת CDC מתקדמת.** המראיין מחפש:
1. **שאתה מזהה שהבעיה אינה ב-FF הבודד** — כל סינכרונייזר עובד נכון! הבעיה היא **חוסר תיאום בין הסינכרונייזרים**.
2. **שאתה נותן דוגמה קונקרטית** — לא רק "ערך לא חוקי" כשם, אלא **011 → 110 → 100** או דומה.
3. **שאתה מבחין בין detection ב-simulation לבין detection ב-silicon** — הסטודנט שאומר "אבל ה-simulator מראה ש-q תמיד נכון" מפספס את הנקודה. ה-simulator דטרמיניסטי; הבעיה הסתברותית.
4. **שאתה לא מציע "עוד FFs"** — שגוי. עוד FFs רק מעכב את התופעה, לא מתקן.

**שאלת המשך**: "האם זה קורה גם בקריאות מבייט יחיד?" → לא, בקריאת ביט בודד (1-bit cross), מאחר ויש רק ביט אחד, אין "ערך לא חוקי" — הוא או 0 או 1.

**שאלת bonus**: "איך formal CDC tools מזהים את זה?" → כלים כמו SpyGlass CDC או Conformal CDC מבצעים static analysis לזהות **multi-bit CDCs** ומסמנים אותם כ-violations. הם דורשים שתסביר את הפתרון (FIFO, handshake, Gray) בעריכה ידנית או בקובץ SDC.

**מלכודת חוזרת**: "להוסיף clk gating ביציאת ה-bus". אסור — gating מבוסס על אות שגם הוא צריך לעבור CDC. רק מסבך.`,
        expectedAnswers: [
          'multi-bit', 'rb-bit', 'bus crossing',
          'independent settling', 'הסתגלות נפרדת',
          'illegal value', 'invalid value', 'ערך לא חוקי',
          '110', '011', '100',
          'simultaneous', 'בו-זמני', 'concurrent',
          'Gray code', 'FIFO', 'handshake',
          'silicon', 'formal CDC',
        ],
        schematic: `
<svg viewBox="0 0 1100 600" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Timing-diagram showing three parallel synchronizers settling at different cycles, producing an illegal intermediate codeword.">

  <text x="550" y="38" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="24">
    Multi-bit bus — settling per bit ⇒ ערך-ביניים לא חוקי
  </text>
  <text x="550" y="64" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">
    Counter במונה מתעדכן 011 → 100 . שלושת הביטים מתחלפים בו-זמנית.
  </text>

  <!-- Cycle headers -->
  <g font-size="18" font-weight="bold" fill="#a0a0c0">
    <text x="200" y="118">t=0</text>
    <text x="380" y="118">t=1</text>
    <text x="560" y="118">t=2</text>
    <text x="740" y="118">t=3</text>
    <text x="920" y="118">t=4</text>
  </g>
  <line x1="180" y1="128" x2="1020" y2="128" stroke="#3a4a5a" stroke-width="1"/>

  <!-- Bit rows -->
  ${[
    { name: 'bit 2', y: 170, vals: ['0', '1?', '1', '1', '1'], color: '#80c8ff' },
    { name: 'bit 1', y: 250, vals: ['1', '1?', '1', '0', '0'], color: '#80f0a0' },
    { name: 'bit 0', y: 330, vals: ['1', '1?', '0', '0', '0'], color: '#ffc080' },
  ].map(row => `
    <text x="120" y="${row.y + 5}" fill="${row.color}" font-size="18" font-weight="bold">FF_S2 ${row.name}</text>
    ${row.vals.map((v, i) => {
      const x = 200 + i * 180;
      const isUnstable = v.includes('?');
      const valColor = isUnstable ? '#ff8080' : row.color;
      return `
        <rect x="${x - 22}" y="${row.y - 18}" width="44" height="36" rx="6"
              fill="${isUnstable ? 'rgba(255,128,128,0.15)' : 'rgba(64,80,100,0.2)'}"
              stroke="${valColor}" stroke-width="1.8" ${isUnstable ? 'stroke-dasharray="3,3"' : ''}/>
        <text x="${x}" y="${row.y + 5}" text-anchor="middle" fill="${valColor}" font-size="18" font-weight="bold">${v}</text>
      `;
    }).join('')}
  `).join('')}

  <!-- q[2:0] summary row -->
  <line x1="180" y1="380" x2="1020" y2="380" stroke="#3a4a5a" stroke-width="1.2"/>
  <text x="120" y="425" fill="#cca040" font-size="18" font-weight="bold">q[2:0]</text>
  <g font-size="20" font-weight="bold" font-family="'JetBrains Mono', monospace">
    ${[
      { x: 200, v: '011', tag: 'OK', color: '#80f0a0' },
      { x: 380, v: '???', tag: 'מטא', color: '#ff8080' },
      { x: 560, v: '110', tag: '✗ ערך לא חוקי!', color: '#ff6060' },
      { x: 740, v: '100', tag: 'OK?', color: '#ffe060' },
      { x: 920, v: '100', tag: 'מאוחר', color: '#80f0a0' },
    ].map(c => `
      <rect x="${c.x - 30}" y="408" width="60" height="36" rx="6"
            fill="rgba(64,80,100,0.15)" stroke="${c.color}" stroke-width="2"/>
      <text x="${c.x}" y="430" text-anchor="middle" fill="${c.color}">${c.v}</text>
      <text x="${c.x}" y="466" text-anchor="middle" fill="${c.color}" font-size="16" font-weight="bold">${c.tag}</text>
    `).join('')}
  </g>

  <!-- Conclusion banner -->
  <rect x="60" y="500" width="980" height="76" rx="10" fill="rgba(255,96,96,0.06)" stroke="#ff6060" stroke-width="1.8"/>
  <text x="550" y="530" text-anchor="middle" fill="#ff8080" font-weight="bold" font-size="20">
    \`110\` הוא ערך שלא היה אף פעם במונה (002, 003, 004 — \`110\` לא חוקי)
  </text>
  <text x="550" y="556" text-anchor="middle" fill="#c8b090" font-size="18" font-style="italic">
    Domain B מקבל ערך-ביניים שגוי בסבב המעבר — בעיה לא נראית ב-simulator דטרמיניסטי
  </text>
</svg>`,
      },

      // ─────────────────────────────────────────────────────────
      // Part ג — Three industry-standard fixes for multi-bit CDC
      // ─────────────────────────────────────────────────────────
      {
        label: 'ג',
        question: 'נתון שגילית את הבעיה מסעיף ב\'. נסה לתת **שלושה פתרונות שונים** מקובלים בתעשייה ל-multi-bit CDC. תיאר כל אחד בקצרה, ו\`compare them\` לפי **latency**, **throughput**, **area** ו-**complexity**.',
        hints: [
          'הקובץ הראשון: **async FIFO** — שתי-פורט עם 2 pointers (read/write) שעוברים CDC עצמאית. ה-bus מעביר נתונים דרך זיכרון.',
          'הקובץ השני: **handshake** — אות \`req\` (1 ביט) מסונכרן ל-domain B; כאשר \`req\` יציב, ה-bus יציב. אות \`ack\` חוזר. רק 1 ביט עובר CDC, ה-bus נגזר.',
          'הקובץ השלישי: **Gray code** — קוד שבו רק 1 ביט מתחלף בכל מעבר. סינכרונייזר פר-ביט עובד! זה דווקא פתרון מאוד נפוץ עבור monotonic counters.',
          'שלושת הפתרונות יעבדו. הבחירה תלויה ביישום.',
        ],
        answer:
`### שלוש גישות סטנדרטיות

| # | שיטה | רעיון | מתי משתמשים |
|---|---|---|---|
| 1 | **Async FIFO** | זיכרון 2-port (write port ב-A, read port ב-B). Pointers עוברים CDC. | bus רחב, throughput גבוה, יישום data streaming. |
| 2 | **Handshake (req/ack)** | 1-bit req מ-A → B; B מעדכן ack חזרה. הנתון יציב כש-req יציב. | bus צר-בינוני, low throughput, simple. |
| 3 | **Gray code** | קידוד שבו כל מעבר משנה בדיוק ביט אחד. סינכרונייזר פר-ביט. | counters, pointers ל-FIFO, monotonic increments. |

### Async FIFO

\`\`\`
+--------+    write_ptr (Gray)    +--------+
| Side A | →→→→→→→→→→→→→→→→→→→→→→→ | Side B |
|  CLK_A |                        |  CLK_B |
|        | ←←←←←←←←←←←←←←←←←←←←←← |        |
+--------+    read_ptr (Gray)     +--------+
   ↓                                  ↑
  RAM                               RAM
  WRITE                             READ
\`\`\`

- **Pointers ב-Gray** עוברים CDC עם 2-FF synchronizer פר-ביט (שיטה 3 בתוך שיטה 1).
- **Full/Empty detection**: השוואת \`read_ptr\` ל-\`write_ptr\` (after CDC).
- Latency: 2-3 cycles אחרי טעינה. Throughput: כמעט מלא — 1 word/cycle.
- חיסרון: **area גבוה** (RAM + 2 logic blocks + pointer logic). Used in NoC, DMA, SerDes.

### Handshake (4-phase)

<svg viewBox="0 0 1000 560" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="4-phase handshake waveform showing req, req_sync, ack, ack_sync with 2-cycle sync delays in each direction.">

  <text x="500" y="38" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    Handshake (4-phase) — תהליך
  </text>
  <text x="500" y="70" text-anchor="middle" fill="#a0a0c0" font-size="16" font-style="italic">
    1-bit req/ack מסונכרנים בנפרד · bus_data יציב כש-req יציב · 4 שלבים = transaction
  </text>

  <!-- Cycle column lines (background grid) -->
  ${Array.from({length: 12}, (_, i) => {
    const x = 140 + i * 65;
    return `<line x1="${x}" y1="100" x2="${x}" y2="510" stroke="#2a3a4a" stroke-width="1"/>`;
  }).join('')}

  <!-- Cycle labels at top -->
  ${Array.from({length: 12}, (_, i) => {
    const x = 140 + i * 65 + 32;
    return `<text x="${x}" y="120" text-anchor="middle" fill="#7a8a9a" font-size="16">${i + 1}</text>`;
  }).join('')}
  <line x1="140" y1="128" x2="920" y2="128" stroke="#3a4a5a" stroke-width="1.4"/>

  <!-- Row labels and waveforms -->
  ${(() => {
    // 4-phase handshake transitions:
    //   cycle 1:  req↑    (A asserts req + valid bus_data)
    //   cycle 3:  req_sync↑   (after 2-cycle sync in B)
    //   cycle 4:  ack↑    (B responds)
    //   cycle 6:  ack_sync↑   (after 2-cycle sync in A)
    //   cycle 6:  req↓    (A drops req immediately)
    //   cycle 8:  req_sync↓
    //   cycle 9:  ack↓    (B drops ack)
    //   cycle 11: ack_sync↓   (transaction complete)
    const X = c => 140 + (c - 1) * 65;   // cycle edge x
    const rows = [
      {
        label: 'bus_data',
        side: 'A',
        sideColor: '#ffb080',
        color: '#80c8ff',
        top: 160,
        // bus stays valid while req is high; shown as a labelled tube
        kind: 'bus',
        valid: [1, 7],   // from cycle 1 to cycle 6 (edge of 7)
      },
      { label: 'req',      side: 'A', sideColor: '#ffb080', color: '#ffe060', top: 230, kind: 'signal', edges: [[1, 'up'], [6, 'down']] },
      { label: 'req_sync', side: 'B', sideColor: '#80f0a0', color: '#ffe060', top: 300, kind: 'signal', edges: [[3, 'up'], [8, 'down']] },
      { label: 'ack',      side: 'B', sideColor: '#80f0a0', color: '#cc99ff', top: 370, kind: 'signal', edges: [[4, 'up'], [9, 'down']] },
      { label: 'ack_sync', side: 'A', sideColor: '#ffb080', color: '#cc99ff', top: 440, kind: 'signal', edges: [[6, 'up'], [11, 'down']] },
    ];
    return rows.map(r => {
      const yTop = r.top + 6;
      const yBot = r.top + 46;
      const yMid = (yTop + yBot) / 2;

      // Side badge (DOMAIN A or DOMAIN B)
      const sideText = `<text x="36" y="${yMid + 5}" fill="${r.sideColor}" font-size="16" font-weight="bold">${r.side}:</text>`;
      const nameText = `<text x="120" y="${yMid + 5}" text-anchor="end" fill="#cca040" font-size="18" font-weight="bold">${r.label}</text>`;

      if (r.kind === 'bus') {
        const x0 = X(r.valid[0]);
        const x1 = X(r.valid[1]);
        const tube = `
          <rect x="${x0}" y="${yTop}" width="${x1 - x0}" height="40" rx="4"
                fill="rgba(128,200,255,0.22)" stroke="${r.color}" stroke-width="2"/>
          <text x="${(x0 + x1) / 2}" y="${yMid + 5}" text-anchor="middle" fill="${r.color}" font-size="16" font-weight="bold">valid data</text>
        `;
        // Idle lines before/after the valid tube
        const idleLeft  = `<line x1="124" y1="${yMid}" x2="${x0}" y2="${yMid}" stroke="#5a6a7a" stroke-width="1.8" stroke-dasharray="4,3"/>`;
        const idleRight = `<line x1="${x1}" y1="${yMid}" x2="920" y2="${yMid}" stroke="#5a6a7a" stroke-width="1.8" stroke-dasharray="4,3"/>`;
        return sideText + nameText + idleLeft + idleRight + tube;
      }

      // For signal rows: render the waveform as line segments
      // Start at the leftmost edge with low (yBot), then walk through edges.
      const segments = [];
      let cur = 'low';
      let prevX = 124;
      let prevY = yBot;
      for (const [c, dir] of r.edges) {
        const ex = X(c);
        // Horizontal at prev level
        segments.push(`<line x1="${prevX}" y1="${prevY}" x2="${ex}" y2="${prevY}" stroke="${r.color}" stroke-width="3"/>`);
        // Vertical transition
        const newY = (dir === 'up') ? yTop : yBot;
        segments.push(`<line x1="${ex}" y1="${prevY}" x2="${ex}" y2="${newY}" stroke="${r.color}" stroke-width="3"/>`);
        prevX = ex; prevY = newY;
        cur = (dir === 'up') ? 'high' : 'low';
      }
      // Tail
      segments.push(`<line x1="${prevX}" y1="${prevY}" x2="920" y2="${prevY}" stroke="${r.color}" stroke-width="3"/>`);

      // 0/1 labels at the levels (just at start, to indicate which is which)
      const labels0 = `<text x="${X(1) - 10}" y="${yBot + 5}" text-anchor="end" fill="#7a8a9a" font-size="14">0</text>`;
      const labels1 = `<text x="${X(1) - 10}" y="${yTop + 5}" text-anchor="end" fill="#7a8a9a" font-size="14">1</text>`;

      return sideText + nameText + segments.join('') + labels0 + labels1;
    }).join('');
  })()}

  <!-- Annotations: 2-cycle sync delays -->
  <!-- req → req_sync delay -->
  <line x1="${140 + 0 * 65}" y1="262" x2="${140 + 2 * 65}" y2="332" stroke="#ff8080" stroke-width="1.6" stroke-dasharray="4,3"/>
  <rect x="195" y="270" width="120" height="26" rx="5" fill="rgba(10,24,37,0.9)" stroke="#ff8080" stroke-width="1.4"/>
  <text x="255" y="288" text-anchor="middle" fill="#ff8080" font-size="14" font-weight="bold">2 cycles sync</text>

  <!-- ack → ack_sync delay -->
  <line x1="${140 + 3 * 65}" y1="402" x2="${140 + 5 * 65}" y2="472" stroke="#ff8080" stroke-width="1.6" stroke-dasharray="4,3"/>
  <rect x="385" y="410" width="120" height="26" rx="5" fill="rgba(10,24,37,0.9)" stroke="#ff8080" stroke-width="1.4"/>
  <text x="445" y="428" text-anchor="middle" fill="#ff8080" font-size="14" font-weight="bold">2 cycles sync</text>

  <!-- Phase numbers at top of timeline -->
  ${[
    { x: 140 + 0 * 65 + 32, phase: '①', label: 'req↑' },
    { x: 140 + 3 * 65 + 32, phase: '②', label: 'ack↑' },
    { x: 140 + 5 * 65 + 32, phase: '③', label: 'req↓' },
    { x: 140 + 8 * 65 + 32, phase: '④', label: 'ack↓' },
  ].map(p => `
    <circle cx="${p.x}" cy="148" r="14" fill="#1a1428" stroke="#cc66ff" stroke-width="2"/>
    <text x="${p.x}" y="153" text-anchor="middle" fill="#cc99ff" font-size="16" font-weight="bold">${p.phase}</text>
  `).join('')}
</svg>

- A מציב ה-bus, ואז מציב \`req=1\`. B מסנכרן \`req\` (2 cycles). כש-B רואה \`req_sync=1\` → דוגם את ה-bus.
- B מציב \`ack=1\`. A מסנכרן \`ack\` (2 cycles). אחרי \`ack_sync=1\` → A יודע ש-B קיבל.
- A מוריד \`req=0\`, B מוריד \`ack=0\`. מחזור הושלם.
- **Latency**: ~4 cycles per transaction (2 לכל כיוון). **Throughput נמוך** (1 transaction / 4 clocks).
- יתרון: **קל מאוד** ליישם. נפוץ ב-control busses (\`config registers\`, GPIOs).

### Gray code

\`\`\`
Binary:    00 → 01 → 10 → 11 → 00  (2 bits, multi-bit transitions!)
Gray:      00 → 01 → 11 → 10 → 00  (each step: exactly 1 bit changes!)
\`\`\`

- כל מעבר Gray = שינוי **בדיוק** ביט אחד → סינכרונייזר פר-ביט בטוח.
- במעבר 011 → 010 ב-Gray: רק ביט 0 משתנה. אם הוא מסתגל מטא — תוצאת FFs היא 010 או 011. **שניהם ערכים חוקיים!**
- Conversion: \`gray = bin XOR (bin >> 1)\`. \`bin = gray ⊕ gray>>1 ⊕ gray>>2 ⊕ ...\`.
- שימוש: **FIFO pointers**, **monotonic counters**, **anything sequential**.
- חיסרון: **לא מתאים ל-arbitrary data** — רק ל-monotonic. אם הנתון יכול לקפוץ (e.g., 5 → 9), Gray לא עוזר.

### השוואה מסכמת

| מאפיין | FIFO | Handshake | Gray code |
|---|:---:|:---:|:---:|
| Latency (cycles) | 2-3 | 4-6 | 2 |
| Throughput | high (1/cycle) | low (1/4 cycles) | high (1/cycle) |
| Area | גבוה (RAM) | נמוך | אפסי (XOR בלבד) |
| Complexity | מורכב | פשוט | פשוט |
| Use case | data streaming | control registers | monotonic counters, FIFO ptrs |

### בקנבס

המעגל מציג 3 סינכרונייזרי bit עצמאיים — דוגמה של ה-bug מסעיף ב'. ב-design אמיתי, היית מחליף את שלושתם באחת מ-3 הגישות. שאלת המשך לסעיף ד': **Gray code** בפעולה.`,
        interviewerMindset:
`**שאלת השוואה.** המראיין מחפש:
1. **שאתה זוכר את 3 השמות** — FIFO / handshake / Gray. אם אתה מציין רק שניים, פספסת.
2. **שאתה לא ממליץ סתם** — לכל יישום יש פתרון אחר. סטודנט שאומר "תמיד FIFO" מפספס.
3. **שאתה זוכר את הקשר בין FIFO ל-Gray** — pointers ב-FIFO **חייבים** להיות ב-Gray (לסנכרון פר-ביט). שיטה 3 בתוך שיטה 1.
4. **שאתה יודע ש-handshake איטי** — מציין במפורש את ה-throughput הנמוך (1/4).

**שאלת המשך**: "מתי לא מתאים Gray code?" → כאשר הנתון לא מונוטוני (יכול לקפוץ). למשל, register שמעדכן ערך חדש כל פעם — לא Gray-coded.

**שאלת bonus**: "מה השוני בין 2-phase ל-4-phase handshake?" → 2-phase: edge-triggered (transitions of req/ack). 4-phase: level-triggered (return-to-zero). 4-phase פשוט יותר, 2-phase יעיל יותר ב-low power.

**מלכודת**: "MUX-based CDC" — לפעמים מוצע פתרון של MUX שבחירה ע"י clk קצוב. **שגוי** — לא חוסה את הבעיה אלא רק מעכב.`,
        expectedAnswers: [
          'async FIFO', 'FIFO',
          'handshake', 'req', 'ack', 'request', 'acknowledge',
          'Gray code', 'Gray', 'גריי',
          'latency', 'throughput', 'area', 'complexity',
          'monotonic', 'counter', 'pointer',
          'streaming', 'control register',
        ],
        answerSchematic: `
<svg viewBox="0 0 1140 600" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Comparison of three multi-bit CDC solutions: FIFO, handshake, Gray code.">

  <text x="570" y="40" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    שלוש גישות ל-Multi-bit CDC
  </text>

  ${[
    {
      x: 60,
      title: 'Async FIFO',
      titleColor: '#80c8ff',
      bullets: [
        'RAM 2-port: write_ptr (Gray) ו-read_ptr (Gray)',
        'Latency: 2-3 cycles',
        'Throughput: 1 word/cycle ✓',
        'Area: גבוה (RAM)',
        'Use: data streaming, NoC, DMA',
      ],
    },
    {
      x: 410,
      title: 'Handshake (req/ack)',
      titleColor: '#80f0a0',
      bullets: [
        'req: 1-bit מ-A → B (sync)',
        'ack: 1-bit מ-B → A (sync)',
        'Latency: 4-6 cycles',
        'Throughput: 1/4 cycle נמוך',
        'Use: control registers, GPIOs',
      ],
    },
    {
      x: 760,
      title: 'Gray code',
      titleColor: '#ffc080',
      bullets: [
        'בדיוק 1 ביט מתחלף כל מעבר',
        'Sync per-bit עובד!',
        'Latency: 2 cycles',
        'Area: אפסי (XOR)',
        'Use: counters, FIFO ptrs, monotonic',
      ],
    },
  ].map(panel => `
    <rect x="${panel.x}" y="100" width="320" height="420" rx="12"
          fill="rgba(64,80,100,0.06)" stroke="${panel.titleColor}" stroke-width="2"/>
    <text x="${panel.x + 160}" y="142" text-anchor="middle" fill="${panel.titleColor}" font-weight="bold" font-size="20">
      ${panel.title}
    </text>
    <line x1="${panel.x + 20}" y1="158" x2="${panel.x + 300}" y2="158" stroke="${panel.titleColor}" stroke-width="1.4"/>
    ${panel.bullets.map((b, i) => `
      <text x="${panel.x + 20}" y="${190 + i * 32}" fill="#c8b090" font-size="18">
        <tspan fill="${panel.titleColor}" font-weight="bold">▸</tspan>  ${b}
      </text>
    `).join('')}
  `).join('')}

  <!-- Connection note -->
  <text x="570" y="565" text-anchor="middle" fill="#cc99ff" font-size="18" font-style="italic">
    שילוב נפוץ: Async FIFO משתמש ב-Gray code ל-pointers (שיטה 3 בתוך שיטה 1)
  </text>
</svg>`,
      },

      // ─────────────────────────────────────────────────────────
      // Part ד — Gray code trace: single-bit-change invariant
      // ─────────────────────────────────────────────────────────
      {
        label: 'ד',
        question: 'נתון מונה Gray 2-ביט במונה הסדרה \`00 → 01 → 11 → 10 → 00\`. הוא עובר CDC עם 2-FF synchronizer **פר-ביט**. תוקק את הסדרה לאורך הגבול: מה האינוואריאנט שמבטיח נכונות, גם אם ה-FFs יוצרים metastability ב-cycle כלשהו?',
        hints: [
          'בקוד Gray כל מעבר משנה בדיוק **1 ביט**. רשום את הסדרה: \`00, 01, 11, 10, 00, ...\` — איזה ביט משתנה בכל מעבר?',
          '00 → 01: ביט 0 משתנה. 01 → 11: ביט 1 משתנה. 11 → 10: ביט 0 משתנה. 10 → 00: ביט 1 משתנה.',
          'בכל cycle, **רק** סינכרונייזר אחד "נמצא בסכנה" של metastability — של הביט המתחלף. השני יציב.',
          'אם הסינכרונייזר של הביט המתחלף מסתגל לערך הישן → q = הקוד הישן. אם מסתגל לחדש → q = הקוד החדש. **אף פעם ערך-ביניים לא קיים בקוד.**',
          'האינוואריאנט: "single-bit-change" → כל סבב מעבר תופס אחד משני קודים חוקיים, **לעולם לא קוד שלישי**.',
        ],
        answer:
`## האינוואריאנט: Single-Bit-Change

קוד Gray מוגדר כך ש**כל מעבר עוקב משנה בדיוק 1 ביט**:

| t | Gray code | בינארי | ביט שמשתנה |
|:---:|:---:|:---:|:---:|
| 0 | \`00\` | 0 | — |
| 1 | \`01\` | 1 | ביט 0 |
| 2 | \`11\` | 2 | ביט 1 |
| 3 | \`10\` | 3 | ביט 0 |
| 4 | \`00\` | 0 | ביט 1 |
| 5 | \`01\` | 1 | ביט 0 |

### למה זה מבטיח נכונות ב-CDC

בכל מעבר ב-CDC עם sync per-bit:
- **רק ביט אחד** עלול להיות ב-metastability — הביט שמתחלף.
- הביט השני **יציב** (לא משתנה → אין סיכון).
- כשהביט המסונכרן מתיישב → או על הערך הישן או על החדש.
- **שני המצבים האפשריים = שני קודים חוקיים בסדרה.**

### תרחיש מפורט: 01 → 11 (ביט 1 משתנה)

| Cycle | FF_S1 ביט 1 | FF_S1 ביט 0 | q[1:0] | תקין? |
|:---:|:---:|:---:|:---:|:---:|
| t=0 | 0 (Gray 01) | 1 | \`01\` | ✓ |
| t=1 | metastable | 1 (יציב) | \`-1\` או \`01\` או \`11\` | מסתגל ל-01 או 11 בהמשך |
| t=2 | 0 (התיישב על ישן) | 1 | \`01\` | ✓ Gray חוקי |
| t=2 (alt) | 1 (התיישב על חדש) | 1 | \`11\` | ✓ Gray חוקי |

**בכל מקרה — \`q\` מציג ערך Gray חוקי, אם כי ייתכן עם cycle delay.** השאלה היחידה היא **מתי** המעבר נצפה ב-domain B, לא **אם** הוא חוקי.

### השוואה: Binary vs Gray במעבר 01 → 10 (= 1 → 2 בבינארי)

**Binary**: שני ביטים מתחלפים בו-זמנית — Bit0: 1→0, Bit1: 0→1. בעיה!
- אפשרויות אחרי settling: \`00, 01, 10, 11\` — **כל הקודים נראים אפשריים**!
- \`q = 00\` (= 0) או \`q = 11\` (= 3) הם **ערכים שגויים** — בכלל לא בסדרה.

**Gray** (אם מוסבים ל-Gray code: 01 → 11, כי 01_bin = 01_gray, 10_bin = 11_gray): רק ביט 1 משתנה.
- אפשרויות אחרי settling: \`01\` או \`11\` — **רק שני ערכים חוקיים, בסדרה.**

### השלכות לעיצוב

- מונה Gray במונים ולתפקיד pointer ב-FIFO.
- המרה: \`gray = bin ^ (bin >> 1)\`. הפוך: \`bin = gray ^ gray>>1 ^ gray>>2 ^ ...\`.
- חיסרון: אריתמטיקה (\`+1\`) לא טריוויאלית ב-Gray — לכן רק במקרים מונוטוניים.

### בקנבס

המעגל מציג את ה-bus 3-ביט עם 3 סינכרונייזרים פר-bit (= הגרסה הבעייתית מסעיף ב'). הצב \`bus0, bus1, bus2\` למעברים ב-Gray (לדוגמה: \`100 → 110 → 010\` — כל מעבר 1 ביט). פעם CLK פעמיים בכל מעבר → q עוקב ללא ערכי-ביניים.

באופן ניסיוני, אם תציב \`100 → 011\` (2-3 ביטים בו-זמנית, **לא Gray**), אתה לא תראה את הבעיה ב-engine (הוא דטרמיניסטי), אבל במציאות הסיכון של ערך-ביניים שגוי **קיים**.`,
        interviewerMindset:
`**שאלת אינוואריאנט.** המראיין מחפש:
1. **שאתה אומר את המילה "single-bit-change"** או "1 ביט מתחלף בכל מעבר". זה ה-keyword.
2. **שאתה מסביר למה זה עוזר** — ביט יציב לעולם לא metastable; רק הביט המתחלף "בסיכון".
3. **שאתה מבחין בין latency ל-correctness** — Gray מבטיח **correctness**, לא מבטיח **לא-latency**. ייתכן cycle של עיכוב.
4. **שאתה זוכר את ההמרה** — \`gray = bin ^ (bin >> 1)\`.

**שאלת המשך**: "האם Gray code מבטיח **always correct** או רק **eventually correct**?" → eventually correct. ב-cycle המעבר אתה עדיין רואה את הקוד הישן עוד cycle אחד; אחרי settling, אתה רואה את החדש. בכל מקרה — ערך חוקי.

**שאלת bonus**: "איך עושים reflected Gray ל-N ביטים?" → \`gray[i] = bin[i] XOR bin[i+1]\` עבור 0 ≤ i < N-1, \`gray[N-1] = bin[N-1]\`. או recursive: \`G(N) = 0 || G(N-1) ∪ 1 || G(N-1)_reverse\`.

**מלכודת**: סטודנט שטוען "Gray מבטל metastability". שגוי. Gray **לא** מבטל metastability ב-FF — הוא **מבטיח שערך-הביניים חוקי**.`,
        expectedAnswers: [
          'single-bit-change', 'single bit change', 'בדיוק ביט אחד',
          'Gray code', 'Gray',
          'invariant', 'אינוואריאנט',
          'reflected gray', 'binary',
          'monotonic',
          'eventually correct', 'cycle delay',
          'XOR',
        ],
        schematic: `
<svg viewBox="0 0 960 680" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="20" role="img" aria-label="Gray code 2-bit sequence with annotated single-bit transitions and metastability resolutions.">

  <text x="480" y="50" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="32">
    Gray code — אינוואריאנט single-bit-change
  </text>
  <text x="480" y="84" text-anchor="middle" fill="#a0a0c0" font-size="20" font-style="italic">
    סדרה:  00 → 01 → 11 → 10 → 00  ·  כל מעבר משנה בדיוק 1 ביט
  </text>

  <!-- The 4 Gray codes as nodes in a ring -->
  ${[
    { code: '00', dec: '0', cx: 200, cy: 340 },
    { code: '01', dec: '1', cx: 480, cy: 200 },
    { code: '11', dec: '2', cx: 760, cy: 340 },
    { code: '10', dec: '3', cx: 480, cy: 480 },
  ].map(n => `
    <circle cx="${n.cx}" cy="${n.cy}" r="80" fill="#0a1825" stroke="#80d4ff" stroke-width="3"/>
    <text x="${n.cx}" y="${n.cy - 6}" text-anchor="middle" fill="#80d4ff" font-size="32" font-weight="bold">${n.code}</text>
    <text x="${n.cx}" y="${n.cy + 28}" text-anchor="middle" fill="#a0a0c0" font-size="20" font-style="italic">(= ${n.dec})</text>
  `).join('')}

  <!-- Arrows -->
  <defs>
    <marker id="grayArr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 Z" fill="#80f0a0"/>
    </marker>
  </defs>

  <g stroke="#80f0a0" stroke-width="3.5" fill="none" marker-end="url(#grayArr)">
    <path d="M 268 296 L 420 224"/>      <!-- 00→01 -->
    <path d="M 540 224 L 700 296"/>      <!-- 01→11 -->
    <path d="M 700 384 L 540 456"/>      <!-- 11→10 -->
    <path d="M 420 456 L 268 384"/>      <!-- 10→00 -->
  </g>

  <!-- Per-arrow labels (with backing pills for readability) -->
  ${[
    { x: 344, y: 248, label: 'bit 0 משתנה' },
    { x: 620, y: 248, label: 'bit 1 משתנה' },
    { x: 620, y: 432, label: 'bit 0 משתנה' },
    { x: 344, y: 432, label: 'bit 1 משתנה' },
  ].map(l => `
    <rect x="${l.x - 70}" y="${l.y - 18}" width="140" height="28" rx="6" fill="rgba(10,24,37,0.85)" stroke="#80f0a0" stroke-width="1.4"/>
    <text x="${l.x}" y="${l.y + 2}" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">${l.label}</text>
  `).join('')}

  <!-- Bottom box: the invariant -->
  <rect x="40" y="580" width="880" height="84" rx="12" fill="rgba(128,240,160,0.08)" stroke="#80f0a0" stroke-width="2"/>
  <text x="480" y="612" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="20">
    בכל מעבר: רק 1 ביט בסיכון metastable, השני stable
  </text>
  <text x="480" y="644" text-anchor="middle" fill="#c8b090" font-size="20" font-style="italic">
    כל settling אפשרי = ערך חוקי בסדרה · אין ערך-ביניים בלתי-חוקי
  </text>
</svg>`,
      },
    ],
    source: 'CDC מתקדם — multi-bit + Gray code',
    tags: ['cdc', 'metastability', 'synchronizer', 'gray-code', 'multi-bit-cdc', 'timing'],
    circuitRevealsAnswer: true,
  },

  // ─────────────────────────────────────────────────────────────
  // #5007 — Interview: Clock skew & useful skew
  //
  //   Style: same as #5004/#5005. 4 parts:
  //     א — setup analysis without skew → identify stage 2 violation.
  //     ב — apply sk2 = -100 ps (FF2 clock early). Stage 1 tightens,
  //         stage 2 relaxes. Traded one violation for another.
  //     ג — balance: sk2 = -55 ps makes both stages slack = +35 ps.
  //         Total slack capacity = +70 ps, divided 2.
  //     ד — hold check: useful skew bounded by hold race condition.
  //
  //   Locked numbers (used everywhere):
  //     T_clk = 400 ps · t_CQ = 80 · t_su = 80 · t_h = 40
  //     Stage 1: logic_max = 150 ps, logic_min = 60
  //     Stage 2: logic_max = 260 ps, logic_min = 30
  //
  //   Engine: single global clock — skew is conceptual, documented in
  //   part א mindset. Same approach as gate delays in #5004.
  // ─────────────────────────────────────────────────────────────
  {
    id: 'interview-clock-skew-useful-skew',
    difficulty: 'hard',
    title: 'Clock skew ו-Useful skew',
    intro:
`נתון pipeline בן 3 FFs: \`in → FF1 → (logic₁) → FF2 → (logic₂) → FF3 → out\`.

| מאפיין | ערך |
|---|---|
| \`T_clk\` | 400 ps |
| \`t_CQ\` | 80 ps |
| \`t_setup\` | 80 ps |
| \`t_hold\` | 40 ps |
| Stage 1 logic | XOR + AND = 90 + 60 = **150 ps** (max), **60 ps** (min) |
| Stage 2 logic | AND + AND + OR + XOR = 60 + 60 + 50 + 90 = **260 ps** (max), **30 ps** (min) |

ה-clock tree (H-tree) מחלק את \`CLK\` לשלושת ה-FFs. ב-design רגיל **אין skew**, אבל בעולם האמיתי ה-buffer-ים לא תמיד נותנים זמני הגעה זהים → סטיה זו נקראת **clock skew** (\`t_sk\`).

תזכורת חשובה: \`skew\` הוא **לא** באג. הוא תופעה — לפעמים מזיקה, לפעמים מועילה. למידת skew מועיל (**useful skew**) הוא אומנות STA אמיתית.`,
    schematic: `
<svg viewBox="0 0 1140 760" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="3-stage pipeline with H-tree clock distribution and unbalanced logic between FFs.">

  <text x="570" y="38" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    Pipeline 3-FF עם H-tree clock distribution
  </text>
  <text x="570" y="66" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">
    logic₁ = 150 ps · logic₂ = 260 ps · אזון בלתי-תקין → stage 2 קריטי
  </text>

  <!-- ════════ H-tree clock distribution (TOP) ════════ -->
  <g stroke="#cca040" stroke-width="2.4" fill="none">
    <!-- CLK root -->
    <line x1="570" y1="110" x2="570" y2="170"/>
    <!-- H-tree first split -->
    <line x1="280" y1="170" x2="860" y2="170"/>
    <line x1="280" y1="170" x2="280" y2="230"/>
    <line x1="570" y1="170" x2="570" y2="230"/>
    <line x1="860" y1="170" x2="860" y2="230"/>
    <!-- to each FF -->
    <line x1="280" y1="230" x2="280" y2="430"/>
    <line x1="570" y1="230" x2="570" y2="430"/>
    <line x1="860" y1="230" x2="860" y2="430"/>
  </g>

  <!-- Clock root pad -->
  <circle cx="570" cy="100" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.4"/>
  <text x="570" y="105" text-anchor="middle" fill="#cca040" font-size="18" font-weight="bold">CLK</text>

  <!-- Buffer cells on the H-tree (visual only) -->
  <g>
    <rect x="265" y="225" width="30" height="20" rx="3" fill="#1a2230" stroke="#cca040" stroke-width="1.6"/>
    <text x="280" y="240" text-anchor="middle" fill="#cca040" font-size="16">B1</text>

    <rect x="555" y="225" width="30" height="20" rx="3" fill="#1a2230" stroke="#cca040" stroke-width="1.6"/>
    <text x="570" y="240" text-anchor="middle" fill="#cca040" font-size="16">B2</text>

    <rect x="845" y="225" width="30" height="20" rx="3" fill="#1a2230" stroke="#cca040" stroke-width="1.6"/>
    <text x="860" y="240" text-anchor="middle" fill="#cca040" font-size="16">B3</text>
  </g>

  <!-- Skew annotations -->
  <text x="280" y="280" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">t_sk1 = 0</text>
  <text x="570" y="280" text-anchor="middle" fill="#ff8080" font-size="18" font-weight="bold">t_sk2 = ?</text>
  <text x="860" y="280" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">t_sk3 = 0</text>

  <text x="570" y="312" text-anchor="middle" fill="#a0a0c0" font-size="16" font-style="italic">
    skew = סטיה של זמן הגעת ה-clock מ-FF ל-FF
  </text>

  <!-- ════════ Pipeline (BELOW the clock tree) ════════ -->

  <!-- Input -->
  <circle cx="80" cy="450" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
  <text x="80" y="456" text-anchor="middle" fill="#cca040" font-size="18" font-weight="bold">in</text>

  <line x1="100" y1="450" x2="240" y2="450" stroke="#a0a0c0" stroke-width="2"/>

  <!-- FF1 -->
  <rect x="240" y="425" width="80" height="50" rx="6" fill="#1a1428" stroke="#cc66ff" stroke-width="2.4"/>
  <text x="280" y="450" text-anchor="middle" fill="#cc99ff" font-size="18" font-weight="bold">FF1</text>
  <polyline points="240,440 252,450 240,460" fill="none" stroke="#cca040" stroke-width="2"/>

  <!-- Stage 1 logic block: XOR + AND -->
  <line x1="320" y1="450" x2="370" y2="450" stroke="#ff9933" stroke-width="2"/>

  <path d="M 370 432 Q 395 450, 370 468 L 395 468 Q 415 468, 425 450 Q 415 432, 395 432 Z"
        fill="rgba(128,240,160,0.25)" stroke="#80f0a0" stroke-width="2"/>
  <text x="395" y="447" text-anchor="middle" fill="#80f0a0" font-size="16" font-weight="bold">XOR</text>
  <text x="395" y="460" text-anchor="middle" fill="#a0c0d0" font-size="16">90</text>

  <line x1="425" y1="450" x2="455" y2="450" stroke="#a0a0c0" stroke-width="2"/>

  <path d="M 455 437 L 475 437 A 20 20 0 0 1 475 463 L 455 463 Z"
        fill="rgba(128,200,255,0.25)" stroke="#80c8ff" stroke-width="2"/>
  <text x="468" y="452" text-anchor="middle" fill="#80c8ff" font-size="16" font-weight="bold">AND</text>
  <text x="468" y="465" text-anchor="middle" fill="#a0c0d0" font-size="16">60</text>

  <line x1="495" y1="450" x2="540" y2="450" stroke="#a0a0c0" stroke-width="2"/>

  <!-- Stage 1 delay label -->
  <text x="425" y="500" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold" font-style="italic">
    Stage 1 = 150 ps
  </text>

  <!-- FF2 -->
  <rect x="540" y="425" width="80" height="50" rx="6" fill="#1a1428" stroke="#cc66ff" stroke-width="2.4"/>
  <text x="580" y="450" text-anchor="middle" fill="#cc99ff" font-size="18" font-weight="bold">FF2</text>
  <polyline points="540,440 552,450 540,460" fill="none" stroke="#cca040" stroke-width="2"/>

  <!-- Stage 2 logic block: AND + AND + OR + XOR -->
  <line x1="620" y1="450" x2="650" y2="450" stroke="#a0a0c0" stroke-width="2"/>

  <path d="M 650 437 L 670 437 A 20 20 0 0 1 670 463 L 650 463 Z"
        fill="rgba(128,200,255,0.25)" stroke="#80c8ff" stroke-width="2"/>
  <text x="663" y="452" text-anchor="middle" fill="#80c8ff" font-size="16" font-weight="bold">AND</text>
  <text x="663" y="465" text-anchor="middle" fill="#a0c0d0" font-size="16">60</text>

  <line x1="690" y1="450" x2="710" y2="450" stroke="#a0a0c0" stroke-width="2"/>

  <path d="M 710 437 L 730 437 A 20 20 0 0 1 730 463 L 710 463 Z"
        fill="rgba(128,200,255,0.25)" stroke="#80c8ff" stroke-width="2"/>
  <text x="723" y="452" text-anchor="middle" fill="#80c8ff" font-size="16" font-weight="bold">AND</text>
  <text x="723" y="465" text-anchor="middle" fill="#a0c0d0" font-size="16">60</text>

  <line x1="750" y1="450" x2="770" y2="450" stroke="#a0a0c0" stroke-width="2"/>

  <path d="M 770 437 L 785 437 Q 805 437, 815 450 Q 805 463, 785 463 L 770 463 Q 780 450, 770 437 Z"
        fill="rgba(255,192,128,0.25)" stroke="#ffc080" stroke-width="2"/>
  <text x="793" y="452" text-anchor="middle" fill="#ffc080" font-size="16" font-weight="bold">OR</text>
  <text x="793" y="465" text-anchor="middle" fill="#a0c0d0" font-size="16">50</text>

  <line x1="815" y1="450" x2="830" y2="450" stroke="#a0a0c0" stroke-width="2"/>

  <path d="M 830 432 Q 855 450, 830 468 L 855 468 Q 875 468, 885 450 Q 875 432, 855 432 Z"
        fill="rgba(128,240,160,0.25)" stroke="#80f0a0" stroke-width="2"/>
  <text x="855" y="447" text-anchor="middle" fill="#80f0a0" font-size="16" font-weight="bold">XOR</text>
  <text x="855" y="460" text-anchor="middle" fill="#a0c0d0" font-size="16">90</text>

  <line x1="885" y1="450" x2="930" y2="450" stroke="#ff6060" stroke-width="3"/>

  <!-- Stage 2 delay label -->
  <text x="765" y="500" text-anchor="middle" fill="#ff8080" font-size="18" font-weight="bold" font-style="italic">
    Stage 2 = 260 ps ⚠ critical
  </text>

  <!-- FF3 -->
  <rect x="930" y="425" width="80" height="50" rx="6" fill="#1a1428" stroke="#cc66ff" stroke-width="2.4"/>
  <text x="970" y="450" text-anchor="middle" fill="#cc99ff" font-size="18" font-weight="bold">FF3</text>
  <polyline points="930,440 942,450 930,460" fill="none" stroke="#cca040" stroke-width="2"/>

  <!-- Output -->
  <line x1="1010" y1="450" x2="1060" y2="450" stroke="#a0a0c0" stroke-width="2"/>
  <circle cx="1080" cy="450" r="20" fill="#0a1825" stroke="#ff9933" stroke-width="2.2"/>
  <text x="1080" y="456" text-anchor="middle" fill="#ff9933" font-size="18" font-weight="bold">out</text>

  <!-- Bottom summary box -->
  <rect x="80" y="560" width="980" height="170" rx="10" fill="rgba(64,80,100,0.06)" stroke="#3a4a5a" stroke-width="1.4"/>

  <text x="570" y="592" text-anchor="middle" fill="#ffc890" font-weight="bold" font-size="20">
    Setup slack ללא skew
  </text>

  <text x="280" y="635" text-anchor="middle" fill="#80f0a0" font-size="20">
    <tspan font-weight="bold">Stage 1:</tspan> 400 − 80 − 150 − 80 = <tspan fill="#80f0a0" font-weight="bold">+90 ps ✓</tspan>
  </text>

  <text x="860" y="635" text-anchor="middle" fill="#ff8080" font-size="20">
    <tspan font-weight="bold">Stage 2:</tspan> 400 − 80 − 260 − 80 = <tspan fill="#ff6060" font-weight="bold">−20 ps ✗</tspan>
  </text>

  <text x="570" y="675" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">
    Stage 2 הוא הקריטי — אך יש +90 ps headroom ב-Stage 1
  </text>

  <text x="570" y="705" text-anchor="middle" fill="#cc99ff" font-size="18" font-weight="bold">
    הרעיון: לקחת חלק מ-90 ה-ps של stage 1 ולתת ל-stage 2 → useful skew
  </text>
</svg>`,
    parts: [
      // ─────────────────────────────────────────────────────────
      // Part א — Setup analysis without skew
      // ─────────────────────────────────────────────────────────
      {
        label: 'א',
        question: 'נתון \`T_clk = 400 ps\`, \`t_CQ = 80 ps\`, \`t_setup = 80 ps\` עם **skew אפס** בכל ה-FFs. חשב את ה-setup slack של כל שלב. איזה שלב קריטי, ומה ה-\`f_max\` של ה-pipeline?',
        hints: [
          'נוסחת setup slack: \`T_clk − t_CQ − logic_max − t_setup ≥ 0\`.',
          'חשב לכל שלב בנפרד: stage 1 וstage 2.',
          'שלב עם slack שלילי = setup violation. השלב הקריטי הוא **המקסימום הקטן ביותר** (= ה-min slack).',
          'f_max נקבע ע"י השלב הקריטי: \`T_min = t_CQ + logic_max_critical + t_setup\`. \`f_max = 1 / T_min\`.',
        ],
        answer:
`### Setup slack ללא skew

**Stage 1** (FF1 → FF2):
\`\`\`
slack₁ = T_clk − t_CQ − logic₁_max − t_setup
       = 400 − 80 − 150 − 80
       = +90 ps  ✓ (headroom גדול)
\`\`\`

**Stage 2** (FF2 → FF3):
\`\`\`
slack₂ = T_clk − t_CQ − logic₂_max − t_setup
       = 400 − 80 − 260 − 80
       = −20 ps  ✗ setup VIOLATION
\`\`\`

### השלב הקריטי

**Stage 2 קריטי** (slack שלילי, 20 ps נופל מתחת ל-0). זה ה-bottleneck של ה-design.

### חישוב f_max

ל-\`f_max\` חוקי (slack ≥ 0) על stage 2:
\`\`\`
T_clk_min = t_CQ + logic₂_max + t_setup = 80 + 260 + 80 = 420 ps
f_max = 1 / 420 ps ≈ 2.38 GHz
\`\`\`

המעגל הזה **לא מסוגל לרוץ ב-400 ps** — נדרש להאריך את הclock ל-420 ps **או** למצוא פתרון אחר.

### האלטרנטיבות

1. **להאריך את ה-clock** ל-420 ps → f_max יורד ב-5%. פשוט אך מבזבז את ה-90 ps headroom של stage 1.
2. **לעשות pipeline נוסף** (FF נוסף באמצע stage 2) → מוסיף latency של cycle, לא תמיד אפשרי.
3. **לעבד את ה-logic** — להחליף ל-cells מהירים, או לשנות אלגוריתם. יקר.
4. **🌟 Useful skew** — לתת ל-FF2 את ה-clock מוקדם יותר (sk2 < 0). זה **לוקח זמן** מ-stage 1 (יש לו 90 ps לתת!) **ונותן** ל-stage 2.

### בקנבס

ה-engine מציג את ה-pipeline ב-T_clk המעוצב. שים לב: ה-simulator **לא מודל skew או delays**. הוא מציג את הפונקציה הלוגית בלבד. ה-timing analysis הוא **חישוב ידני** של STA — בדיוק כמו בעולם האמיתי.`,
        interviewerMindset:
`**שאלה ארתימטית בסיסית של STA.** המראיין מחפש:
1. **שאתה מציג את הנוסחה ולא רק מספר** — \`T - t_CQ - logic - t_su\`.
2. **שאתה מבחין בין השלבים** — לא כל ה-design קריטי, רק stage 2.
3. **שאתה מציין את ה-headroom של stage 1** — +90 ps. זה ה-"מטמון" שאפשר לנצל.
4. **שאתה מציין useful skew כפתרון** — בלי לקפוץ ישר ל-pipelining. סטודנט שמציע מיד pipelining מפספס את ה-skew opportunity.

**שאלת המשך**: "האם תמיד עדיף useful skew על pipelining?" → לא. useful skew מוגבל ע"י hold (סעיף ד'). pipelining מוסיף latency. בחירה תלויה ב-tradeoff.

**שאלת bonus**: "מה אם t_setup היה 100 ps במקום 80?" → stage 1 slack: 400-80-150-100=+70, stage 2: 400-80-260-100=-40. עוד יותר חריף. f_max נופל ל-440ps min = 2.27 GHz.

**מלכודת**: סטודנט שאומר "להוסיף buffer". buffer מוסיף delay → רק **מחמיר** setup. אסור.

**ראה גם**: #5004 ב'-ג' (מבוא ל-setup/hold).`,
        expectedAnswers: [
          'stage 2', 'שלב 2',
          '+90', '−20', '90', '20',
          'critical', 'קריטי', 'violation', 'הפרה',
          'f_max', 'fmax', '2.38', '420',
          'useful skew', 'skew',
        ],
        circuit: () => build(() => {
          // 3-stage pipeline matching the question:
          //  in → FF1 → XOR → AND → FF2 → AND → AND → OR → XOR → FF3 → out
          //
          // Defaults: in=1. Engine simulates logic only — no delays, no
          // skew. The student uses the canvas to verify functional
          // correctness; timing analysis happens in the answer.
          const clk = h.clock(80, 600, 'CLK');
          const inIn = h.input(80, 100, 'in');  inIn.fixedValue = 1;

          const ff1 = h.ffD(220, 100, 'FF1');

          // Stage 1: XOR + AND. The XOR has its second input grounded
          // (effectively pass-through-and-invert depending on ground),
          // so we tie XOR's other input to a 0-default INPUT pad.
          const xor1Tie = h.input(220, 200, 'x1b');  xor1Tie.fixedValue = 0;
          const xor1 = h.gate('XOR', 360, 100);
          const and1Tie = h.input(360, 200, 'a1b');  and1Tie.fixedValue = 1;
          const and1 = h.gate('AND', 480, 100);

          const ff2 = h.ffD(600, 100, 'FF2');

          // Stage 2: AND → AND → OR → XOR with companion inputs
          const and2aTie = h.input(600, 200, 'a2a');  and2aTie.fixedValue = 1;
          const and2a = h.gate('AND', 720, 100);
          const and2bTie = h.input(720, 200, 'a2b');  and2bTie.fixedValue = 1;
          const and2b = h.gate('AND', 840, 100);
          const or2Tie = h.input(840, 200, 'o2b');  or2Tie.fixedValue = 0;
          const or2 = h.gate('OR', 960, 100);
          const xor2Tie = h.input(960, 200, 'x2b');  xor2Tie.fixedValue = 0;
          const xor2 = h.gate('XOR', 1080, 100);

          const ff3 = h.ffD(1200, 100, 'FF3');
          const outOut = h.output(1320, 100, 'out');

          return {
            nodes: [
              clk, inIn,
              ff1,
              xor1Tie, xor1, and1Tie, and1,
              ff2,
              and2aTie, and2a, and2bTie, and2b, or2Tie, or2, xor2Tie, xor2,
              ff3, outOut,
            ],
            wires: [
              // in → FF1
              h.wire(inIn.id, ff1.id, 0),
              h.wire(clk.id, ff1.id, 1, 0, { isClockWire: true }),
              // FF1 → XOR → AND → FF2 (stage 1)
              h.wire(ff1.id, xor1.id, 0),
              h.wire(xor1Tie.id, xor1.id, 1),
              h.wire(xor1.id, and1.id, 0),
              h.wire(and1Tie.id, and1.id, 1),
              h.wire(and1.id, ff2.id, 0),
              h.wire(clk.id, ff2.id, 1, 0, { isClockWire: true }),
              // FF2 → AND → AND → OR → XOR → FF3 (stage 2)
              h.wire(ff2.id, and2a.id, 0),
              h.wire(and2aTie.id, and2a.id, 1),
              h.wire(and2a.id, and2b.id, 0),
              h.wire(and2bTie.id, and2b.id, 1),
              h.wire(and2b.id, or2.id, 0),
              h.wire(or2Tie.id, or2.id, 1),
              h.wire(or2.id, xor2.id, 0),
              h.wire(xor2Tie.id, xor2.id, 1),
              h.wire(xor2.id, ff3.id, 0),
              h.wire(clk.id, ff3.id, 1, 0, { isClockWire: true }),
              // FF3 → out
              h.wire(ff3.id, outOut.id, 0),
            ],
          };
        }),
        answerSchematic: `
<svg viewBox="0 0 1080 540" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Setup slack waterfall — Stage 1 has +90 ps headroom, Stage 2 has -20 ps violation.">

  <text x="540" y="38" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="24">
    Setup slack — ויזואליזציה של ה-pipeline
  </text>

  <!-- Stage 1 row -->
  <text x="60" y="100" fill="#80f0a0" font-weight="bold" font-size="20">Stage 1 (FF1 → FF2)</text>

  <!-- Bar visualization. Scale: 1 ps = 2.4 px. Total T = 400 → 960 px. -->
  <rect x="60" y="115" width="960" height="50" rx="6" fill="#1a2230" stroke="#80c8ff" stroke-width="1.6"/>

  <rect x="60" y="115" width="192" height="50" rx="6" fill="rgba(204,102,255,0.25)" stroke="#cc66ff" stroke-width="1.8"/>
  <text x="156" y="146" text-anchor="middle" fill="#cc99ff" font-size="18" font-weight="bold">t_CQ 80</text>

  <rect x="252" y="115" width="360" height="50" fill="rgba(128,200,255,0.25)" stroke="#80c8ff" stroke-width="1.6"/>
  <text x="432" y="146" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">logic₁ 150 ps</text>

  <rect x="612" y="115" width="192" height="50" fill="rgba(204,102,255,0.25)" stroke="#cc66ff" stroke-width="1.6"/>
  <text x="708" y="146" text-anchor="middle" fill="#cc99ff" font-size="18" font-weight="bold">t_su 80</text>

  <rect x="804" y="115" width="216" height="50" rx="0" fill="rgba(128,240,160,0.25)" stroke="#80f0a0" stroke-width="1.6"/>
  <text x="912" y="146" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">slack +90 ps ✓</text>

  <text x="540" y="195" text-anchor="middle" fill="#80f0a0" font-size="18">slack₁ = 400 − 80 − 150 − 80 = +90 ps  ✓</text>

  <!-- Stage 2 row -->
  <text x="60" y="250" fill="#ff8080" font-weight="bold" font-size="20">Stage 2 (FF2 → FF3)</text>

  <rect x="60" y="265" width="960" height="50" rx="6" fill="#1a2230" stroke="#ff8080" stroke-width="1.6"/>

  <rect x="60" y="265" width="192" height="50" rx="6" fill="rgba(204,102,255,0.25)" stroke="#cc66ff" stroke-width="1.8"/>
  <text x="156" y="296" text-anchor="middle" fill="#cc99ff" font-size="18" font-weight="bold">t_CQ 80</text>

  <rect x="252" y="265" width="624" height="50" fill="rgba(255,96,96,0.25)" stroke="#ff6060" stroke-width="1.8"/>
  <text x="564" y="296" text-anchor="middle" fill="#ff8080" font-size="18" font-weight="bold">logic₂ 260 ps (critical!)</text>

  <rect x="876" y="265" width="192" height="50" fill="rgba(204,102,255,0.25)" stroke="#cc66ff" stroke-width="1.6"/>
  <text x="972" y="296" text-anchor="middle" fill="#cc99ff" font-size="18" font-weight="bold">t_su 80</text>

  <!-- The negative slack (-20 ps) overflows past T_clk -->
  <line x1="1020" y1="248" x2="1020" y2="335" stroke="#ff6060" stroke-width="3" stroke-dasharray="5,3"/>
  <rect x="1020" y="265" width="48" height="50" fill="rgba(255,96,96,0.5)" stroke="#ff6060" stroke-width="1.6"/>
  <text x="1044" y="296" text-anchor="middle" fill="#fff" font-size="18" font-weight="bold">−20!</text>

  <text x="540" y="345" text-anchor="middle" fill="#ff8080" font-size="18">slack₂ = 400 − 80 − 260 − 80 = −20 ps  ✗ VIOLATION</text>

  <!-- T_clk reference line -->
  <line x1="1020" y1="80" x2="1020" y2="345" stroke="#80d4ff" stroke-width="1.6" stroke-dasharray="3,3"/>
  <text x="1020" y="76" text-anchor="middle" fill="#80d4ff" font-size="18" font-weight="bold">T_clk = 400 ps</text>

  <!-- Summary box -->
  <rect x="60" y="385" width="960" height="130" rx="10" fill="rgba(255,200,144,0.06)" stroke="#ffc890" stroke-width="1.6"/>
  <text x="540" y="415" text-anchor="middle" fill="#ffc890" font-weight="bold" font-size="20">
    f_max = 1 / (t_CQ + logic₂_max + t_su) = 1 / 420 ps ≈ 2.38 GHz
  </text>
  <text x="540" y="445" text-anchor="middle" fill="#c8b090" font-size="18">
    ל-T_clk = 400 ps stage 2 פוגע ב-setup ב-20 ps.
  </text>
  <text x="540" y="471" text-anchor="middle" fill="#cc99ff" font-size="18" font-weight="bold">
    Stage 1 לעומת זאת יש +90 ps headroom — &gt; אפשרות useful skew
  </text>
  <text x="540" y="497" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">
    Useful skew: לקחת חלק מ-Stage 1 headroom ולתת ל-Stage 2 → סעיף ב'
  </text>
</svg>`,
      },

      // ─────────────────────────────────────────────────────────
      // Part ב — Apply sk2 = -100 ps
      // ─────────────────────────────────────────────────────────
      {
        label: 'ב',
        question: 'יישם **\`t_sk2 = −100 ps\`** (ה-clock מגיע ל-FF2 **מוקדם** ב-100 ps). מה קורה ל-setup slack של stage 1 ושל stage 2? למה הקונבנציה היא ש-skew שלילי = clock מוקדם?',
        hints: [
          'נוסחת setup slack עם skew: \`slack = T_clk + sk_dst − sk_src − t_CQ − logic_max − t_setup\`.',
          'Stage 1: src = FF1 (sk_src = sk1 = 0), dst = FF2 (sk_dst = sk2 = −100).',
          'Stage 2: src = FF2 (sk_src = sk2 = −100), dst = FF3 (sk_dst = sk3 = 0).',
          'Skew שלילי ב-FF2 = clock מוקדם ב-FF2 → FF2 דוגם מוקדם → stage 1 מקבל **פחות** זמן (slack יורד).',
          'Skew שלילי ב-FF2 = clock מוקדם ב-FF2 → FF2 משחרר נתון מוקדם → stage 2 מקבל **יותר** זמן (slack עולה).',
          'התוצאה: traded one violation for another, או "אזון" אם הוקטרים מתאזנים.',
        ],
        answer:
`### עם sk2 = −100 ps

**Stage 1** (FF1 → FF2): \`sk_src = 0\`, \`sk_dst = sk2 = −100\`.
\`\`\`
slack₁ = T_clk + sk_dst − sk_src − t_CQ − logic₁_max − t_setup
       = 400 + (−100) − 0 − 80 − 150 − 80
       = +90 + (−100)
       = −10 ps   ✗ VIOLATION (תועה ב-100 ps!)
\`\`\`

**Stage 2** (FF2 → FF3): \`sk_src = sk2 = −100\`, \`sk_dst = 0\`.
\`\`\`
slack₂ = T_clk + sk_dst − sk_src − t_CQ − logic₂_max − t_setup
       = 400 + 0 − (−100) − 80 − 260 − 80
       = −20 + 100
       = +80 ps   ✓ הופך לחיובי!
\`\`\`

### מה קרה: trade-off

ה-skew ה"מועיל" של −100 ps:
- **לקח** 100 ps מ-stage 1 (היה +90 → עכשיו −10).
- **נתן** 100 ps ל-stage 2 (היה −20 → עכשיו +80).

**זו הקטסטרופה הקלאסית** של useful skew: לא תיקנת את ה-design — רק העברת את ה-violation לשלב אחר.

### הקונבנציה: skew שלילי = clock מוקדם

| skew | clock מגיע | משמעות |
|---|---|---|
| \`sk = 0\` | בדיוק ב-edge התיאורטי | אידיאלי |
| \`sk > 0\` | אחרי ה-edge | clock late at this FF |
| \`sk < 0\` | לפני ה-edge | clock early at this FF |

ב-FF2 עם sk2 = −100 ps:
- FF2 דוגם 100 ps **מוקדם** ממה שהאחרים → stage 1 חייב לסיים מהר יותר.
- FF2 משחרר נתון 100 ps **מוקדם** → stage 2 מקבל יותר זמן.

### הציוץ הכבד

> אתה לא יכול לקבל משהו מבלי לתת משהו אחר. סך ה-slack הכולל נשמר.

\`\`\`
slack_total = slack₁ + slack₂ = 90 + (−20) = +70 ps  (קבוע — בלי תלות ב-skew)
\`\`\`

Useful skew **מפזר** את 70 ה-ps האלה בין השלבים, אבל לא יוצר עוד.

### בקנבס

המעגל מציג את ה-pipeline. ה-engine **לא מודל skew**. סעיף ג' יראה איך לבחור skew **שמאזן** את שני השלבים.`,
        interviewerMindset:
`**שאלה אריתמטית עם trade-off.** המראיין מחפש:
1. **שאתה מבחין בין sk_src ל-sk_dst** — לא רק "skew", אלא איזה FF.
2. **שאתה זוכר את הסימן** — sk2 שלילי = clock מוקדם ב-FF2.
3. **שאתה מזהה את ה-trade-off** — לא תיקון מלא, רק "פיזור" של slack.
4. **שאתה אומר ש-slack_total קבוע** — תכונה חשובה של STA.

**שאלת המשך**: "מה אם ה-skew היה −20 ps במקום −100?" → stage 1 slack = +70 (still ok), stage 2 slack = 0 (margin אפסי). פחות אגרסיבי, יותר בטוח.

**שאלת bonus**: "האם useful skew רק שלילי?" → לא. ב-pipeline ארוך (4+ שלבים), אתה יכול לחלק skew גם חיובי וגם שלילי לאזן עוד יותר. בעצם — STA tools (Synopsys PrimeTime CTS) מבצעות אופטימיזציה אוטומטית.

**מלכודת**: סטודנט שמשתמש ב-\`sk_src − sk_dst\` במקום \`sk_dst − sk_src\`. סימן שגוי = תוצאה הפוכה. תקפיד.

**ראה גם**: סעיף ג' — איזון. סעיף ד' — hold.`,
        expectedAnswers: [
          '+80', '−10', '80', '10',
          'tightens', 'מתהדק', 'relaxes', 'משוחרר',
          'trade-off', 'tradeoff', 'איזון',
          'slack_total', '+70',
          'early clock', 'מוקדם',
          'sk_dst', 'sk_src',
        ],
        answerSchematic: `
<svg viewBox="0 0 1080 540" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Skew applied: Stage 1 slack drops to -10, Stage 2 slack rises to +80. Total slack +70 preserved.">

  <text x="540" y="38" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="24">
    sk2 = −100 ps : הזזת slack בין השלבים
  </text>
  <text x="540" y="64" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">
    Useful skew מעביר 100 ps מ-Stage 1 ל-Stage 2 — slack_total נשמר
  </text>

  <!-- Before / After comparison -->
  <text x="280" y="120" text-anchor="middle" fill="#a0a0c0" font-weight="bold" font-size="20">לפני (sk2 = 0)</text>
  <text x="800" y="120" text-anchor="middle" fill="#cc99ff" font-weight="bold" font-size="20">אחרי (sk2 = −100)</text>

  <!-- Before: Stage 1 -->
  <rect x="80" y="150" width="400" height="40" rx="4" fill="rgba(64,80,100,0.2)" stroke="#80c8ff" stroke-width="1.4"/>
  <rect x="80" y="150" width="36" height="40" fill="rgba(204,102,255,0.25)" stroke="#cc66ff" stroke-width="1.4"/>
  <text x="98" y="175" text-anchor="middle" fill="#cc99ff" font-size="16" font-weight="bold">CQ</text>
  <rect x="116" y="150" width="68" height="40" fill="rgba(128,200,255,0.25)" stroke="#80c8ff" stroke-width="1.4"/>
  <text x="150" y="175" text-anchor="middle" fill="#80c8ff" font-size="16" font-weight="bold">logic₁</text>
  <rect x="184" y="150" width="36" height="40" fill="rgba(204,102,255,0.25)" stroke="#cc66ff" stroke-width="1.4"/>
  <text x="202" y="175" text-anchor="middle" fill="#cc99ff" font-size="16" font-weight="bold">su</text>
  <rect x="220" y="150" width="40" height="40" fill="rgba(128,240,160,0.3)" stroke="#80f0a0" stroke-width="1.6"/>
  <text x="240" y="175" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">+90</text>

  <text x="280" y="210" text-anchor="middle" fill="#80f0a0" font-size="18">Stage 1: +90 ps ✓</text>

  <!-- Before: Stage 2 -->
  <rect x="80" y="240" width="400" height="40" rx="4" fill="rgba(64,80,100,0.2)" stroke="#ff8080" stroke-width="1.4"/>
  <rect x="80" y="240" width="36" height="40" fill="rgba(204,102,255,0.25)" stroke="#cc66ff" stroke-width="1.4"/>
  <text x="98" y="265" text-anchor="middle" fill="#cc99ff" font-size="16" font-weight="bold">CQ</text>
  <rect x="116" y="240" width="120" height="40" fill="rgba(255,96,96,0.25)" stroke="#ff6060" stroke-width="1.4"/>
  <text x="176" y="265" text-anchor="middle" fill="#ff8080" font-size="16" font-weight="bold">logic₂ (long)</text>
  <rect x="236" y="240" width="36" height="40" fill="rgba(204,102,255,0.25)" stroke="#cc66ff" stroke-width="1.4"/>
  <text x="254" y="265" text-anchor="middle" fill="#cc99ff" font-size="16" font-weight="bold">su</text>
  <rect x="272" y="240" width="10" height="40" fill="rgba(255,96,96,0.5)" stroke="#ff6060" stroke-width="1.4"/>
  <text x="290" y="265" text-anchor="start" fill="#ff6060" font-size="18" font-weight="bold">−20!</text>

  <text x="280" y="300" text-anchor="middle" fill="#ff8080" font-size="18">Stage 2: −20 ps ✗</text>

  <!-- Arrow: Skew moves 100 ps from Stage 1 to Stage 2 -->
  <defs>
    <marker id="skewMove" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto">
      <path d="M0,0 L10,5 L0,10 Z" fill="#cc66ff"/>
    </marker>
  </defs>

  <path d="M 500 170 Q 580 170, 620 170" stroke="#cc66ff" stroke-width="2.6" fill="none" marker-end="url(#skewMove)" stroke-dasharray="5,3"/>
  <text x="560" y="160" text-anchor="middle" fill="#cc66ff" font-size="18" font-weight="bold">−100 ps</text>

  <path d="M 500 260 Q 580 260, 620 260" stroke="#cc66ff" stroke-width="2.6" fill="none" marker-end="url(#skewMove)" stroke-dasharray="5,3"/>
  <text x="560" y="280" text-anchor="middle" fill="#cc66ff" font-size="18" font-weight="bold">+100 ps</text>

  <!-- After: Stage 1 (tightened) -->
  <rect x="600" y="150" width="400" height="40" rx="4" fill="rgba(64,80,100,0.2)" stroke="#ff8080" stroke-width="1.4"/>
  <rect x="600" y="150" width="36" height="40" fill="rgba(204,102,255,0.25)" stroke="#cc66ff" stroke-width="1.4"/>
  <text x="618" y="175" text-anchor="middle" fill="#cc99ff" font-size="16" font-weight="bold">CQ</text>
  <rect x="636" y="150" width="68" height="40" fill="rgba(128,200,255,0.25)" stroke="#80c8ff" stroke-width="1.4"/>
  <text x="670" y="175" text-anchor="middle" fill="#80c8ff" font-size="16" font-weight="bold">logic₁</text>
  <rect x="704" y="150" width="36" height="40" fill="rgba(204,102,255,0.25)" stroke="#cc66ff" stroke-width="1.4"/>
  <text x="722" y="175" text-anchor="middle" fill="#cc99ff" font-size="16" font-weight="bold">su</text>
  <rect x="740" y="150" width="5" height="40" fill="rgba(255,96,96,0.5)" stroke="#ff6060" stroke-width="1.4"/>
  <text x="755" y="175" text-anchor="start" fill="#ff6060" font-size="18" font-weight="bold">−10!</text>

  <text x="800" y="210" text-anchor="middle" fill="#ff8080" font-size="18">Stage 1: −10 ps ✗ (חדש)</text>

  <!-- After: Stage 2 (relaxed) -->
  <rect x="600" y="240" width="400" height="40" rx="4" fill="rgba(64,80,100,0.2)" stroke="#80f0a0" stroke-width="1.4"/>
  <rect x="600" y="240" width="36" height="40" fill="rgba(204,102,255,0.25)" stroke="#cc66ff" stroke-width="1.4"/>
  <text x="618" y="265" text-anchor="middle" fill="#cc99ff" font-size="16" font-weight="bold">CQ</text>
  <rect x="636" y="240" width="120" height="40" fill="rgba(128,200,255,0.25)" stroke="#80c8ff" stroke-width="1.4"/>
  <text x="696" y="265" text-anchor="middle" fill="#80c8ff" font-size="16" font-weight="bold">logic₂</text>
  <rect x="756" y="240" width="36" height="40" fill="rgba(204,102,255,0.25)" stroke="#cc66ff" stroke-width="1.4"/>
  <text x="774" y="265" text-anchor="middle" fill="#cc99ff" font-size="16" font-weight="bold">su</text>
  <rect x="792" y="240" width="40" height="40" fill="rgba(128,240,160,0.4)" stroke="#80f0a0" stroke-width="1.6"/>
  <text x="812" y="265" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">+80</text>

  <text x="800" y="300" text-anchor="middle" fill="#80f0a0" font-size="18">Stage 2: +80 ps ✓</text>

  <!-- Conservation banner -->
  <rect x="60" y="370" width="960" height="80" rx="10" fill="rgba(204,102,255,0.06)" stroke="#cc66ff" stroke-width="1.8"/>
  <text x="540" y="402" text-anchor="middle" fill="#cc99ff" font-weight="bold" font-size="20">
    slack_total = 90 + (−20) = (−10) + 80 = +70 ps   (קבוע!)
  </text>
  <text x="540" y="432" text-anchor="middle" fill="#c8b090" font-size="18">
    Useful skew מעביר slack בין שלבים — לא יוצר עוד slack
  </text>

  <text x="540" y="490" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">
    הפתרון: מאזן sk2 כך ששני השלבים נהיים חיוביים. סעיף ג'.
  </text>
</svg>`,
      },

      // ─────────────────────────────────────────────────────────
      // Part ג — Balance both stages with optimal skew
      // ─────────────────────────────────────────────────────────
      {
        label: 'ג',
        question: 'מה ערך ה-\`sk2\` שיגרום ל-**שני השלבים** להיות בעלי slack חיובי **שווה**? מה הערך של ה-slack המאוזן? למה אי אפשר לקבל slack ≥ +50 בשני השלבים בו-זמנית?',
        hints: [
          'תזכר: \`slack_total\` קבוע = +70 ps. אתה רק מחלק אותו בין שני השלבים.',
          'איזון מושלם: \`slack₁ = slack₂\`. הגדר את ה-skew כך שבדיוק מחצית מה-slack_total בכל שלב.',
          'slack₁ = 90 + sk2. slack₂ = −20 − sk2. הצבת \`slack₁ = slack₂\` → \`90 + sk2 = −20 − sk2\` → \`2·sk2 = −110\` → \`sk2 = −55\`.',
          'אז slack₁ = slack₂ = +35 ps.',
          'למה ≥ +50 לא אפשרי? כי 70 ps רק יש לחלק. 2·50 = 100 ps > 70. בלתי-אפשרי.',
        ],
        answer:
`## האיזון: \`sk2 = −55 ps\` → \`slack = +35 ps\` בשני השלבים

---

### החישוב

הגדר \`slack₁ = slack₂\`:

\`\`\`
slack₁ = T − t_CQ − logic₁ − t_su + sk_dst − sk_src
       = 400 − 80 − 150 − 80 + sk2 − 0
       = 90 + sk2

slack₂ = T − t_CQ − logic₂ − t_su + sk_dst − sk_src
       = 400 − 80 − 260 − 80 + 0 − sk2
       = −20 − sk2
\`\`\`

הצב שווה:
\`\`\`
90 + sk2 = −20 − sk2
2·sk2 = −110
sk2 = −55 ps
\`\`\`

תוצאה:
\`\`\`
slack₁ = 90 + (−55) = +35 ps  ✓
slack₂ = −20 − (−55) = +35 ps  ✓
\`\`\`

### למה +50 בלתי-אפשרי

\`slack_total = 90 + (−20) = +70 ps\` — קבוע, לא תלוי ב-skew.

לקבל \`slack ≥ +50\` בשני השלבים:
\`\`\`
slack₁ + slack₂ = 70
slack₁ ≥ 50 AND slack₂ ≥ 50 → slack₁ + slack₂ ≥ 100
\`\`\`

תוצאה: \`70 ≥ 100\` — **שקר!** אי אפשר.

### תובנה: capacity total

| מצב | sk2 | slack₁ | slack₂ | משמעות |
|---|---:|---:|---:|---|
| בלי skew | 0 | +90 | −20 | stage 2 violates |
| sk2 = −100 | −100 | −10 | +80 | stage 1 violates |
| **sk2 = −55** | **−55** | **+35** | **+35** | **מאוזן** |
| sk2 = −90 | −90 | 0 | +70 | על הגבול |
| sk2 = −20 | −20 | +70 | 0 | על הגבול |

טווח ה-skew שמשאיר את **שני** השלבים ≥ 0: \`−90 ≤ sk2 ≤ −20\`. כל ערך בטווח הזה = design legal.

### החוק הכללי של Useful Skew

> Useful skew מאזן slack בין שלבים אבל **לא יוצר slack חדש**. ה-capacity הכוללת מוגבלת ע"י \`T_clk − Σ(t_CQ + logic + t_su)\` לכל הנתיב.

אם ה-design דורש slack גדול יותר ממה שיש — צריך:
1. **להאריך T_clk** (אבל אז f_max יורד).
2. **לעשות pipelining** (להוסיף FF — סעיף ד').
3. **לעבד את ה-logic** (faster cells או architecture שונה).
4. **לשפר את ה-process** (corner של PVT).

useful skew **לא** יכול לפתור את הבעיה לבדו אם ה-pipeline צפוף מדי.

### בקנבס

ה-engine מציג את אותו pipeline. אין שינוי פונקציונלי — רק שינוי תזמוני. ה-balance הוא חישוב STA ולא נשקף בסימולציה.`,
        interviewerMindset:
`**שאלת אופטימיזציה.** המראיין מחפש:
1. **שאתה מפתח את המשוואה** ולא רק מנחש sk2 = −55. לכל מקרה צריך לקראת \`slack₁ = slack₂\`.
2. **שאתה מזהה את הגבול 70 ps total** ושמסביר את ה-conservation.
3. **שאתה אומר "אי אפשר ל-+50"** ולא רק "אולי". אתה מוכיח עם המתמטיקה.
4. **שאתה מזכיר את האלטרנטיבות** (pipeline, cells מהירים) — useful skew **לא** הכלי האחיד.

**שאלת המשך**: "מה אם נרצה slack ≥ +30 בשני השלבים?" → 70 ≥ 60 ✓ אפשרי. הצבע: slack₁ = +35, slack₂ = +35 (האיזון) או slack₁ = +30, slack₂ = +40 (לא מאוזן, sk2 = −60).

**שאלת bonus**: "מה אם פלוס skew ב-FF3?" → sk3 חיובי מוסיף ל-slack₂ (ה-dst). אבל אז גם stage חיצוני (אם יש) מאבד. ב-deep pipeline ה-CTS מבצע optimization על כל FF במקביל.

**מלכודת**: סטודנט שמציע sk2 = −70 כי "זה אמצע [-90, -20]" — אבל אמצע הוא −55 (= (−90 + −20)/2), לא −70. תקפיד.`,
        expectedAnswers: [
          '−55', '-55', '55',
          '+35', '35',
          'balance', 'איזון', 'מאזן',
          'conservation', 'slack_total', '+70',
          'infeasible', 'בלתי-אפשרי',
          'capacity',
        ],
        answerSchematic: `
<svg viewBox="0 0 1080 540" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Slack curve as a function of sk2 — feasible region with both stages positive.">

  <text x="540" y="38" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="24">
    Slack vs sk2 — איזון אופטימלי = sk2 = −55 ps
  </text>

  <!-- Axes -->
  <line x1="100" y1="450" x2="1020" y2="450" stroke="#a0a0c0" stroke-width="1.4"/>
  <line x1="100" y1="120" x2="100" y2="450" stroke="#a0a0c0" stroke-width="1.4"/>

  <!-- X axis labels: sk2 from -120 to 0 -->
  <text x="540" y="488" text-anchor="middle" fill="#a0a0c0" font-size="18" font-weight="bold">sk2 (ps)</text>
  ${[-120, -100, -80, -60, -40, -20, 0].map(v => {
    const x = 100 + (v + 120) * (920 / 120);
    return `
      <line x1="${x}" y1="445" x2="${x}" y2="455" stroke="#a0a0c0" stroke-width="1"/>
      <text x="${x}" y="470" text-anchor="middle" fill="#a0a0c0" font-size="16">${v}</text>
    `;
  }).join('')}

  <!-- Y axis labels: slack from -50 to +100 -->
  <text x="60" y="285" text-anchor="middle" fill="#a0a0c0" font-size="18" font-weight="bold" transform="rotate(-90, 60, 285)">slack (ps)</text>
  ${[-50, 0, 50, 100].map(v => {
    const y = 450 - (v + 50) * (330 / 150);
    return `
      <line x1="95" y1="${y}" x2="105" y2="${y}" stroke="#a0a0c0" stroke-width="1"/>
      <text x="85" y="${y + 5}" text-anchor="end" fill="#a0a0c0" font-size="16">${v}</text>
    `;
  }).join('')}

  <!-- Zero line -->
  <line x1="100" y1="340" x2="1020" y2="340" stroke="#ff6060" stroke-width="1" stroke-dasharray="5,3"/>
  <text x="1024" y="345" fill="#ff6060" font-size="16">slack = 0</text>

  <!-- Stage 1 line: slack₁ = 90 + sk2 -->
  ${(() => {
    const x1_at_sk = (sk) => 100 + (sk + 120) * (920 / 120);
    const y_at_slack = (sl) => 450 - (sl + 50) * (330 / 150);
    const x1 = x1_at_sk(-120), y1 = y_at_slack(90 - 120);
    const x2 = x1_at_sk(0), y2 = y_at_slack(90);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#80c8ff" stroke-width="2.8"/>`;
  })()}

  <!-- Stage 2 line: slack₂ = -20 - sk2 -->
  ${(() => {
    const x1_at_sk = (sk) => 100 + (sk + 120) * (920 / 120);
    const y_at_slack = (sl) => 450 - (sl + 50) * (330 / 150);
    const x1 = x1_at_sk(-120), y1 = y_at_slack(-20 - (-120));
    const x2 = x1_at_sk(0), y2 = y_at_slack(-20);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ffc080" stroke-width="2.8"/>`;
  })()}

  <!-- Intersection point sk2 = -55, slack = +35 -->
  ${(() => {
    const cx = 100 + (-55 + 120) * (920 / 120);
    const cy = 450 - (35 + 50) * (330 / 150);
    return `
      <circle cx="${cx}" cy="${cy}" r="8" fill="#cc66ff" stroke="#fff" stroke-width="2"/>
      <line x1="${cx}" y1="${cy}" x2="${cx}" y2="450" stroke="#cc66ff" stroke-width="1.4" stroke-dasharray="3,3"/>
      <line x1="${cx}" y1="${cy}" x2="100" y2="${cy}" stroke="#cc66ff" stroke-width="1.4" stroke-dasharray="3,3"/>
      <text x="${cx + 18}" y="${cy - 12}" fill="#cc99ff" font-size="18" font-weight="bold">sk2=−55, slack=+35</text>
    `;
  })()}

  <!-- Feasibility band: sk2 in [-90, -20] -->
  <rect x="${100 + 30 * (920 / 120)}" y="120" width="${(70) * (920 / 120)}" height="330" fill="rgba(128,240,160,0.06)" stroke="#80f0a0" stroke-width="1.6" stroke-dasharray="4,4"/>
  <text x="${100 + 65 * (920 / 120)}" y="142" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">FEASIBLE: −90 ≤ sk2 ≤ −20</text>

  <!-- Legend -->
  <line x1="700" y1="155" x2="730" y2="155" stroke="#80c8ff" stroke-width="2.8"/>
  <text x="740" y="160" fill="#80c8ff" font-size="18">slack₁ = 90 + sk2</text>

  <line x1="700" y1="178" x2="730" y2="178" stroke="#ffc080" stroke-width="2.8"/>
  <text x="740" y="183" fill="#ffc080" font-size="18">slack₂ = −20 − sk2</text>
</svg>`,
      },

      // ─────────────────────────────────────────────────────────
      // Part ד — Hold check: useful skew bounded by hold race
      // ─────────────────────────────────────────────────────────
      {
        label: 'ד',
        question: 'נתון \`t_hold = 40 ps\` ו-\`logic₂_min = 30 ps\`. אם תדחוף את ה-\`sk2\` שלילי יותר מ-\`−55\` כדי לקבל עוד slack ל-stage 2 (לדוגמה sk2 = \`−80\`), מה הסיכון? נסחו את אילוץ ה-hold עם skew והסבירו למה useful skew הוא **bounded**.',
        hints: [
          'אילוץ hold עם skew: \`t_CQ + logic_min ≥ t_hold + (sk_dst − sk_src)\`.',
          'Stage 2 hold: \`sk_src = sk2\`, \`sk_dst = sk3 = 0\`. → \`t_CQ + logic_min ≥ t_hold − sk2\`.',
          'הצב מספרים: \`80 + 30 ≥ 40 − sk2\` → \`110 ≥ 40 − sk2\` → \`−sk2 ≤ 70\` → \`sk2 ≥ −70\`.',
          'אם sk2 = −80: \`80 + 30 = 110 ≥ 40 + 80 = 120\` → \`110 < 120\` → **hold violation!** race condition.',
          'הציוץ: useful skew bounded. גם setup צריך לעבור (sk2 בטווח [−90, −20]) וגם hold (sk2 ≥ −70). Intersection: [−70, −20].',
        ],
        answer:
`### אילוץ ה-Hold עם skew

הנוסחה:
\`\`\`
t_CQ + logic_min ≥ t_hold + (sk_dst − sk_src)
\`\`\`

עבור **Stage 2 hold** (FF2 → FF3): \`sk_src = sk2\`, \`sk_dst = 0\`.
\`\`\`
80 + 30 ≥ 40 + (0 − sk2)
110 ≥ 40 − sk2
−sk2 ≤ 70
sk2 ≥ −70 ps
\`\`\`

### הסיכון של sk2 = −80

עם sk2 = −80 (אגרסיבי יותר מהאיזון):
\`\`\`
hold check: 110 ≥ 40 − (−80) = 120
110 < 120  ✗ HOLD VIOLATION (race)
\`\`\`

**מה זה אומר פיזית?**
- FF2 משחרר נתון 80 ps לפני FF3 (כי clock של FF2 מוקדם).
- ה-logic_min של 30 ps לא מספיק להחזיק את הנתון הישן עד שעובר זמן ה-hold של FF3.
- **התוצאה**: FF3 דוגם את הנתון **הצעיר** במקום הזקן → לוגיקה שגויה. **race condition.**

### האילוץ הכפול של useful skew

| אילוץ | תנאי | טווח sk2 |
|---|---|---|
| Setup stage 1 | slack₁ = 90 + sk2 ≥ 0 | \`sk2 ≥ −90\` |
| Setup stage 2 | slack₂ = −20 − sk2 ≥ 0 | \`sk2 ≤ −20\` |
| **Hold stage 2** | \`80 + 30 ≥ 40 − sk2\` | \`sk2 ≥ −70\` |
| Hold stage 1 | \`80 + 60 ≥ 40 + sk2\` | \`sk2 ≤ +100\` (לא יקרה) |
| **Intersection** | כל התנאים | \`−70 ≤ sk2 ≤ −20\` |

טווח חוקי: **\`sk2 ∈ [−70, −20]\`**. ה-balance האופטימלי sk2 = −55 בתוך הטווח ✓.

### חוק כללי של Useful Skew

> Useful skew מוגבל **משני הצדדים**:
> - **Setup** מגביל מצד אחד (לא יותר מדי skew, כי השלב המוצא יחטוף).
> - **Hold** מגביל מצד שני (לא יותר מדי skew, כי שלב היעד יחטוף race).

ב-corner מהיר (process חזק), logic_min קטן → אילוץ ה-hold מתהדק → הטווח של useful skew צומק.

### דוגמה: design שאי אפשר לתקן עם skew בלבד

נניח: T = 350 ps (במקום 400). אז:
- slack_total = 350 − 80 − 150 − 80 + 350 − 80 − 260 − 80 = 40 + (−70) = −30 ps
- **כל** sk2 יחזיר ל-violation בשלב כלשהו.
- פתרון: pipelining (FF נוסף), לא useful skew.

### בקנבס

ה-engine **לא מודל** race conditions של hold (אין delays). ב-design אמיתי, ה-STA tool יאזהיר על hold violation ו-CTS יזיז את ה-skew. **תקפיד**: skew הוא חרב פיפיות.

> **תזכורת חזקה**: setup ↔ T_clk־long; hold ↔ T_clk־independent (logic_min only). הם **שני** אילוצים שאתה חייב לעבור בו-זמנית.`,
        interviewerMindset:
`**שאלת hold-with-skew קריטית.** המראיין מחפש:
1. **שאתה זוכר את הנוסחה** — \`t_CQ + logic_min ≥ t_h + (sk_dst − sk_src)\`. הסימן של ה-skew חשוב.
2. **שאתה מבחין: skew שלילי = useful לsetup, מסוכן ל-hold** (ב-stage שאחרי). הסיבה היא הסימן של (sk_dst − sk_src).
3. **שאתה מוצא את הטווח** — לא רק נקודה. \`[−70, −20]\` היא תשובה מלאה.
4. **שאתה מצטט "race condition"** — הסטודנט שאומר רק "hold violation" מפסיד את ה-vocabulary.

**שאלת המשך**: "אם הייתי מאריך את ה-logic_min ב-padding (כמו ב-#5004), אז useful skew יהיה רחב יותר?" → כן! padding על ה-logic_min מרחיב את אילוץ ה-hold. למשל logic_min = 60 ps → 80+60 ≥ 40 − sk2 → sk2 ≥ −100. הטווח נפתח.

**שאלת bonus**: "ב-CTS אמיתי, איך מחליטים את ה-skew האופטימלי?" → ה-tool מקבל את כל הנתיבים, פותר **linear program** עם משתנים sk[FF₁], sk[FF₂], ... ואילוצים setup + hold לכל path. מינימיזציה של T_clk_min בכפוף לאילוצים.

**מלכודת**: סטודנט שמציין רק stage 2 hold. בשלב 1 (FF1 → FF2) גם יש hold check. בדוק את שניהם. במקרה שלנו, stage 1 hold לא נופל (\`80+60 ≥ 40+sk2\` → sk2 ≤ +100, מאוד רחב).

**ראה גם**: #5005 ה' — hold + BUF padding ב-multiplier.`,
        expectedAnswers: [
          '−70', '-70', '70',
          'hold violation', 'race', 'race condition',
          't_hold', 't_h',
          'logic_min', 'short path',
          'bounded', 'מוגבל',
          '[−70, −20]', 'feasibility',
          'CTS', 'STA',
        ],
        answerSchematic: `
<svg viewBox="0 0 1080 540" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Useful skew bounded by both setup and hold — feasibility window [-70, -20].">

  <text x="540" y="38" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="24">
    Useful skew bounded — ה-design window
  </text>
  <text x="540" y="64" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">
    setup ↔ ה-skew רחב מדי כלפי הצד הקצר · hold ↔ ה-skew מהיר מדי כלפי הצד הארוך
  </text>

  <!-- Axis -->
  <line x1="80" y1="280" x2="1020" y2="280" stroke="#a0a0c0" stroke-width="2"/>
  <text x="80" y="300" fill="#a0a0c0" font-size="16">−120</text>
  <text x="1020" y="300" fill="#a0a0c0" font-size="16">0</text>
  <text x="540" y="310" text-anchor="middle" fill="#a0a0c0" font-size="18" font-weight="bold">sk2 (ps)</text>

  <!-- Tick marks for key values -->
  ${[-90, -70, -55, -20].map(v => {
    const x = 80 + (v + 120) * (940 / 120);
    return `
      <line x1="${x}" y1="270" x2="${x}" y2="290" stroke="#a0a0c0" stroke-width="1.4"/>
      <text x="${x}" y="266" text-anchor="middle" fill="#a0a0c0" font-size="18" font-weight="bold">${v}</text>
    `;
  }).join('')}

  <!-- Constraint bands -->
  <!-- Setup stage 1: sk2 ≥ -90 (band from -90 to 0 is OK) -->
  <rect x="${80 + 30 * (940 / 120)}" y="160" width="${90 * (940 / 120)}" height="50" rx="6"
        fill="rgba(128,200,255,0.15)" stroke="#80c8ff" stroke-width="2"/>
  <text x="${80 + 75 * (940 / 120)}" y="190" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">
    Setup stage 1: sk2 ≥ −90
  </text>

  <!-- Setup stage 2: sk2 ≤ -20 (band from -120 to -20 is OK) -->
  <rect x="80" y="105" width="${100 * (940 / 120)}" height="50" rx="6"
        fill="rgba(255,192,128,0.15)" stroke="#ffc080" stroke-width="2"/>
  <text x="${80 + 50 * (940 / 120)}" y="135" text-anchor="middle" fill="#ffc080" font-size="18" font-weight="bold">
    Setup stage 2: sk2 ≤ −20
  </text>

  <!-- Hold stage 2: sk2 ≥ -70 (band from -70 to 0 is OK) -->
  <rect x="${80 + 50 * (940 / 120)}" y="215" width="${70 * (940 / 120)}" height="50" rx="6"
        fill="rgba(204,102,255,0.15)" stroke="#cc66ff" stroke-width="2"/>
  <text x="${80 + 85 * (940 / 120)}" y="245" text-anchor="middle" fill="#cc99ff" font-size="18" font-weight="bold">
    Hold stage 2: sk2 ≥ −70
  </text>

  <!-- Feasibility intersection: [-70, -20] -->
  <rect x="${80 + 50 * (940 / 120)}" y="345" width="${50 * (940 / 120)}" height="50" rx="6"
        fill="rgba(128,240,160,0.3)" stroke="#80f0a0" stroke-width="3"/>
  <text x="${80 + 75 * (940 / 120)}" y="376" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">
    ✓ FEASIBLE: −70 ≤ sk2 ≤ −20
  </text>

  <!-- Balance point -->
  ${(() => {
    const cx = 80 + 65 * (940 / 120);  // sk2 = -55
    return `
      <line x1="${cx}" y1="345" x2="${cx}" y2="395" stroke="#cc66ff" stroke-width="3" stroke-dasharray="4,2"/>
      <text x="${cx}" y="420" text-anchor="middle" fill="#cc99ff" font-size="18" font-weight="bold">איזון: sk2 = −55</text>
    `;
  })()}

  <!-- Failure example sk2 = -80 -->
  ${(() => {
    const cx = 80 + 40 * (940 / 120);  // sk2 = -80
    return `
      <line x1="${cx}" y1="345" x2="${cx}" y2="280" stroke="#ff6060" stroke-width="2"/>
      <circle cx="${cx}" cy="240" r="8" fill="#ff6060" stroke="#fff" stroke-width="2"/>
      <text x="${cx}" y="232" text-anchor="middle" fill="#ff6060" font-size="18" font-weight="bold">sk2 = −80 ✗</text>
      <text x="${cx}" y="222" text-anchor="middle" fill="#ff8080" font-size="16" font-style="italic">hold race!</text>
    `;
  })()}

  <!-- Summary -->
  <rect x="60" y="450" width="960" height="76" rx="10" fill="rgba(255,200,144,0.06)" stroke="#ffc890" stroke-width="1.6"/>
  <text x="540" y="478" text-anchor="middle" fill="#ffc890" font-weight="bold" font-size="18">
    Useful skew bounded משני הצדדים: setup ↑ , hold ↓
  </text>
  <text x="540" y="506" text-anchor="middle" fill="#c8b090" font-size="18" font-style="italic">
    בעבודה: STA tool מבצע אופטימיזציה גלובלית של skew per-FF
  </text>
</svg>`,
      },
    ],
    source: 'clock skew + useful skew (STA)',
    tags: ['clock-skew', 'useful-skew', 'setup', 'hold', 'sta', 'timing'],
    circuitRevealsAnswer: true,
  },

  // ─────────────────────────────────────────────────────────────
  // #5008 — Interview: Retiming (Leiserson-Saxe)
  //
  //   5 parts:
  //     א — identify critical path and f_max of the "before" scene.
  //     ב — state the retiming invariant (cycles + I/O latency).
  //     ג — apply correct retiming, name which FFs move where.
  //     ד — concrete failure when partial / wrong retiming is done.
  //     ה — verify on the "after" scene (new circuit, ה only).
  //
  //   Topology (BEFORE — used in parts א-ד):
  //     4 inputs a,b,c,d
  //     t1 = a XOR b  (90 ps)
  //     t2 = c XOR d  (90 ps)
  //     t3 = t1 AND t2  (60 ps)   → FF_outA → out_x
  //     t4 = t1 OR t2  (50 ps)    → FF_outB → out_y
  //   Critical = 150 ps (a → t1 → t3 → FF). f_max(T=400) = 1/(80+150+80) = 1/310 ≈ 3.23 GHz.
  //
  //   Topology (AFTER — used in part ה only):
  //     a,b,c,d → t1, t2 (XORs) → 4 FFs (one per t1/t2 input pair)
  //     → t3 = FF_t1.Q AND FF_t2.Q  (60 ps)  → out_x
  //     → t4 = FF_t1.Q OR FF_t2.Q   (50 ps)  → out_y
  //   Critical (max stage) = 90 ps. f_max(T=250) = 1/(80+90+80) = 1/250 = 4 GHz.
  //
  //   Engine: same as #5006/#5007 — single clock, no skew model.
  //   Retiming is taught conceptually; functional simulation verifies
  //   logic correctness (I/O latency preserved across both circuits).
  // ─────────────────────────────────────────────────────────────
  {
    id: 'interview-retiming-leiserson-saxe',
    difficulty: 'hard',
    title: 'Retiming (Leiserson-Saxe)',
    intro:
`נתון מעגל קומבינטורי-עמוק עם 2 FFs ביציאה: 4 כניסות \`a, b, c, d\` נכנסות לעץ קומבינטורי שמפצל ל-2 יציאות \`out_x\` ו-\`out_y\`. ה-FFs נמצאים ב-**קצה** של נתיב ארוך — כל הקריטי-path קומבינטורי לפני ה-FFs.

**Retiming** (Leiserson-Saxe 1991) הוא טכניקת אופטימיזציה ב-STA: **הזזת FFs קיימים** בלי לשנות את הפונקציה — לאזן את ה-stages ולהרוויח f_max.

| מאפיין | ערך |
|---|---|
| \`T_clk\` | משתנה (מטרה: למזער) |
| \`t_CQ\` | 80 ps |
| \`t_setup\` | 80 ps |
| Gate delays | XOR=90, AND=60, OR=50 |

ב-design הנוכחי, ה-pipeline הוא יחיד (single stage) ויש slack שלילי. Retiming יוכל לקצוץ את ה-T_clk המינימלי באופן דרמטי **בלי לשנות את הפונקציה**.`,
    schematic: `
<svg viewBox="0 0 1140 540" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Unbalanced before scene: 5 combinational gates feeding 2 FFs at the output.">

  <text x="570" y="38" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    BEFORE — pipeline בלתי-מאוזן (FFs ביציאה)
  </text>
  <text x="570" y="66" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">
    ה-critical path קומבינטורי שלם לפני שה-FFs לוכדים. fmax נמוך.
  </text>

  <!-- Inputs -->
  <g font-size="18" font-weight="bold">
    <circle cx="80" cy="170" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="80" y="176" text-anchor="middle" fill="#cca040">a</text>
    <circle cx="80" cy="240" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="80" y="246" text-anchor="middle" fill="#cca040">b</text>
    <circle cx="80" cy="330" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="80" y="336" text-anchor="middle" fill="#cca040">c</text>
    <circle cx="80" cy="400" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
    <text x="80" y="406" text-anchor="middle" fill="#cca040">d</text>
  </g>

  <!-- Wires from inputs to XORs -->
  <g stroke="#a0a0c0" stroke-width="1.6" fill="none">
    <line x1="100" y1="170" x2="280" y2="195"/>
    <line x1="100" y1="240" x2="280" y2="215"/>
    <line x1="100" y1="330" x2="280" y2="355"/>
    <line x1="100" y1="400" x2="280" y2="375"/>
  </g>

  <!-- t1 = a XOR b -->
  <path d="M 280 185 Q 305 205, 280 225 L 310 225 Q 335 225, 350 205 Q 335 185, 310 185 Z"
        fill="rgba(128,240,160,0.25)" stroke="#80f0a0" stroke-width="2"/>
  <text x="318" y="202" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">XOR</text>
  <text x="318" y="217" text-anchor="middle" fill="#a0c0d0" font-size="16">t1=a⊕b · 90</text>

  <!-- t2 = c XOR d -->
  <path d="M 280 345 Q 305 365, 280 385 L 310 385 Q 335 385, 350 365 Q 335 345, 310 345 Z"
        fill="rgba(128,240,160,0.25)" stroke="#80f0a0" stroke-width="2"/>
  <text x="318" y="362" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">XOR</text>
  <text x="318" y="377" text-anchor="middle" fill="#a0c0d0" font-size="16">t2=c⊕d · 90</text>

  <!-- Wires from XORs to convergence -->
  <g stroke="#a0a0c0" stroke-width="1.6" fill="none">
    <line x1="350" y1="205" x2="500" y2="255"/>
    <line x1="350" y1="365" x2="500" y2="285"/>
    <line x1="350" y1="205" x2="500" y2="345"/>
    <line x1="350" y1="365" x2="500" y2="375"/>
  </g>

  <!-- t3 = t1 AND t2 -->
  <path d="M 500 245 L 530 245 A 25 25 0 0 1 530 295 L 500 295 Z"
        fill="rgba(128,200,255,0.25)" stroke="#80c8ff" stroke-width="2"/>
  <text x="518" y="265" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">AND</text>
  <text x="518" y="282" text-anchor="middle" fill="#a0c0d0" font-size="16">t3 · 60</text>

  <!-- t4 = t1 OR t2 -->
  <path d="M 500 335 L 515 335 Q 535 335, 550 360 Q 535 385, 515 385 L 500 385 Q 510 360, 500 335 Z"
        fill="rgba(255,192,128,0.25)" stroke="#ffc080" stroke-width="2"/>
  <text x="525" y="357" text-anchor="middle" fill="#ffc080" font-size="18" font-weight="bold">OR</text>
  <text x="525" y="375" text-anchor="middle" fill="#a0c0d0" font-size="16">t4 · 50</text>

  <!-- Wires to FFs -->
  <g stroke="#ff6060" stroke-width="3" fill="none">
    <line x1="555" y1="270" x2="680" y2="270"/>
  </g>
  <g stroke="#a0a0c0" stroke-width="2" fill="none">
    <line x1="550" y1="360" x2="680" y2="360"/>
  </g>

  <!-- FF_outA -->
  <rect x="680" y="245" width="100" height="50" rx="6" fill="#1a1428" stroke="#cc66ff" stroke-width="2.6"/>
  <text x="730" y="270" text-anchor="middle" fill="#cc99ff" font-size="18" font-weight="bold">FF_outA</text>
  <polyline points="680,260 692,270 680,280" fill="none" stroke="#cca040" stroke-width="2"/>

  <!-- FF_outB -->
  <rect x="680" y="335" width="100" height="50" rx="6" fill="#1a1428" stroke="#cc66ff" stroke-width="2.6"/>
  <text x="730" y="360" text-anchor="middle" fill="#cc99ff" font-size="18" font-weight="bold">FF_outB</text>
  <polyline points="680,350 692,360 680,370" fill="none" stroke="#cca040" stroke-width="2"/>

  <!-- Wires to outputs -->
  <line x1="780" y1="270" x2="900" y2="270" stroke="#ff9933" stroke-width="2"/>
  <line x1="780" y1="360" x2="900" y2="360" stroke="#ff9933" stroke-width="2"/>

  <!-- Outputs -->
  <circle cx="920" cy="270" r="20" fill="#0a1825" stroke="#ff9933" stroke-width="2.2"/>
  <text x="920" y="276" text-anchor="middle" fill="#ff9933" font-size="18" font-weight="bold">out_x</text>

  <circle cx="920" cy="360" r="20" fill="#0a1825" stroke="#ff9933" stroke-width="2.2"/>
  <text x="920" y="366" text-anchor="middle" fill="#ff9933" font-size="18" font-weight="bold">out_y</text>

  <!-- Critical path annotation -->
  <text x="570" y="160" text-anchor="middle" fill="#ff8080" font-size="18" font-weight="bold">
    Critical (red): a → XOR → AND → FF = 90+60 = 150 ps
  </text>

  <!-- Bottom summary -->
  <rect x="80" y="450" width="980" height="68" rx="10" fill="rgba(255,200,144,0.06)" stroke="#ffc890" stroke-width="1.6"/>
  <text x="570" y="478" text-anchor="middle" fill="#ffc890" font-weight="bold" font-size="20">
    T_min = t_CQ + critical + t_su = 80 + 150 + 80 = 310 ps  ⇒  f_max ≈ 3.23 GHz
  </text>
  <text x="570" y="504" text-anchor="middle" fill="#c8b090" font-size="18" font-style="italic">
    הרעיון: לחתוך את ה-150 ps בין שני שלבים → push ה-FFs אחורה
  </text>
</svg>`,
    parts: [
      // ─────────────────────────────────────────────────────────
      // Part א — Critical path + f_max
      // ─────────────────────────────────────────────────────────
      {
        label: 'א',
        question: 'נתון המעגל BEFORE. עם \`t_CQ = 80 ps\`, \`t_su = 80 ps\`, \`XOR = 90\`, \`AND = 60\`, \`OR = 50\`: מה ה-critical path מהקלטים ל-FF? מה \`T_min\` ו-\`f_max\`?',
        hints: [
          'ה-pipeline single-stage: כל ה-logic קומבינטורי, FFs רק ביציאה.',
          'נתיב critical = הארוך ביותר מקלט עד דלת לפני FF.',
          'אפשרויות: a → t1 → t3 (XOR + AND = 150) או a → t1 → t4 (XOR + OR = 140). הנתיב הארוך = 150 ps.',
          'T_min = t_CQ + critical + t_su = 80 + 150 + 80 = 310 ps.',
          'f_max = 1/T_min = 1/310 ps ≈ 3.23 GHz.',
        ],
        answer:
`### Critical path = 150 ps

מהקלטים \`a, b, c, d\` ל-FFs:

| נתיב | gates | delay |
|---|---|---:|
| a → t1 → t3 → FF_outA | XOR + AND | 90 + 60 = **150 ps** |
| a → t1 → t4 → FF_outB | XOR + OR | 90 + 50 = 140 ps |
| c → t2 → t3 → FF_outA | XOR + AND | 90 + 60 = 150 ps |
| c → t2 → t4 → FF_outB | XOR + OR | 90 + 50 = 140 ps |
| b → t1 → t3 → FF_outA | XOR + AND | 90 + 60 = 150 ps |
| (etc) | | |

**Critical** = 150 ps. **shortest** = 140 ps (גם הוא קצר!).

### T_min ו-f_max

\`\`\`
T_min = t_CQ + critical + t_su = 80 + 150 + 80 = 310 ps
f_max = 1 / T_min = 1 / 310 ps ≈ 3.23 GHz
\`\`\`

### למה pipeline single-stage לא יעיל

| מצב | T_min | f_max | יעילות |
|---|---:|---:|---|
| כעת (1 stage) | 310 ps | 3.23 GHz | משתמש ב-90% מ-T_min ל-logic |
| **אם נחלק לשני stages מאוזנים** | (80+75+80) = 235 ps | **4.26 GHz** | משתמש רק ב-32% — יותר throughput! |

הרעיון של retiming: לפצל את ה-150 ps של logic בין שני stages, כך ש**אף שלב לא ארוך מ-90 ps** (החלוקה הטבעית: XOR ב-stage 1, AND/OR ב-stage 2).

### בקנבס

ה-engine מציג את המעגל BEFORE. בדוק את הפונקציה: a=1, b=0, c=1, d=1 → t1=1, t2=0 → t3=0, t4=1 → אחרי clock אחד out_x=0, out_y=1.`,
        interviewerMindset:
`**שאלה ראשונה — חישוב critical path.** המראיין מחפש:
1. **שאתה מונה את כל הנתיבים** — לא רק אחד. גם 140 ps וגם 150 ps רלוונטיים.
2. **שאתה זוכר את הנוסחה** של T_min — לא רק logic_max.
3. **שאתה מציע retiming כפתרון** — לא רק מאריך T_clk. סטודנט שאומר "אז נריץ ב-310 ps" מפסיד את ההתפתחות לסעיף ב'.

**שאלת המשך**: "למה ה-FFs רק ביציאה?" → ב-RTL פשוט (auto-generated מ-Verilog) זה נפוץ. הכלי לא מבצע retiming אוטומטית — צריך לבקש במפורש.

**שאלת bonus**: "מה אם היו 4 outputs במקום 2?" → ה-critical path לא משתנה, אבל מספר ה-FFs ביציאה גדל ל-4. retiming עדיין עוזר.

**ראה גם**: #5004 ג' (path-delay) — אותו רעיון על מעגל אחר.`,
        expectedAnswers: [
          '150', '150 ps', '150ps',
          '310', '310 ps', '3.23', 'fmax',
          'critical path', 'נתיב קריטי',
          'XOR', 'AND',
          't1', 't3',
        ],
        circuit: () => build(() => {
          // BEFORE topology — used in parts א-ד.
          // 4 inputs → 2 XORs → AND + OR → 2 FFs at outputs.
          //
          // Defaults: a=1, b=0, c=1, d=1.
          //   t1 = a⊕b = 1
          //   t2 = c⊕d = 0
          //   t3 = t1·t2 = 0
          //   t4 = t1+t2 = 1
          //   After 1 CLK: out_x=0, out_y=1.
          const clk = h.clock(80, 540, 'CLK');
          const aIn = h.input(80, 120, 'a');  aIn.fixedValue = 1;
          const bIn = h.input(80, 200, 'b');  bIn.fixedValue = 0;
          const cIn = h.input(80, 300, 'c');  cIn.fixedValue = 1;
          const dIn = h.input(80, 380, 'd');  dIn.fixedValue = 1;

          const t1 = h.gate('XOR', 260, 160);
          const t2 = h.gate('XOR', 260, 340);
          const t3 = h.gate('AND', 460, 220);
          const t4 = h.gate('OR',  460, 320);

          const ffOutA = h.ffD(640, 220, 'FF_outA');
          const ffOutB = h.ffD(640, 320, 'FF_outB');

          const outX = h.output(840, 220, 'out_x');
          const outY = h.output(840, 320, 'out_y');

          return {
            nodes: [
              clk, aIn, bIn, cIn, dIn,
              t1, t2, t3, t4,
              ffOutA, ffOutB,
              outX, outY,
            ],
            wires: [
              // a, b → t1 (XOR)
              h.wire(aIn.id, t1.id, 0),
              h.wire(bIn.id, t1.id, 1),
              // c, d → t2 (XOR)
              h.wire(cIn.id, t2.id, 0),
              h.wire(dIn.id, t2.id, 1),
              // t1, t2 → t3 (AND)
              h.wire(t1.id, t3.id, 0),
              h.wire(t2.id, t3.id, 1),
              // t1, t2 → t4 (OR)
              h.wire(t1.id, t4.id, 0),
              h.wire(t2.id, t4.id, 1),
              // t3 → FF_outA → out_x
              h.wire(t3.id, ffOutA.id, 0),
              h.wire(clk.id, ffOutA.id, 1, 0, { isClockWire: true }),
              h.wire(ffOutA.id, outX.id, 0),
              // t4 → FF_outB → out_y
              h.wire(t4.id, ffOutB.id, 0),
              h.wire(clk.id, ffOutB.id, 1, 0, { isClockWire: true }),
              h.wire(ffOutB.id, outY.id, 0),
            ],
          };
        }),
        answerSchematic: `
<svg viewBox="0 0 1080 480" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Path-delay enumeration for the unbalanced before circuit.">

  <text x="540" y="40" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="24">
    כל הנתיבים — Critical path = 150 ps
  </text>

  <text x="60" y="95" fill="#a0a0c0" font-size="18" font-weight="bold">מקלט</text>
  <text x="160" y="95" fill="#a0a0c0" font-size="18" font-weight="bold">דרך</text>
  <text x="540" y="95" fill="#a0a0c0" font-size="18" font-weight="bold">סוף</text>
  <text x="780" y="95" fill="#a0a0c0" font-size="18" font-weight="bold">delay</text>
  <line x1="40" y1="105" x2="1020" y2="105" stroke="#3a4a5a" stroke-width="1"/>

  ${(() => {
    const rows = [
      ['a / b', 't1 → t3', 'FF_outA', '90 + 60 = 150 ps', true],
      ['a / b', 't1 → t4', 'FF_outB', '90 + 50 = 140 ps', false],
      ['c / d', 't2 → t3', 'FF_outA', '90 + 60 = 150 ps', true],
      ['c / d', 't2 → t4', 'FF_outB', '90 + 50 = 140 ps', false],
    ];
    return rows.map((r, i) => {
      const y = 145 + i * 48;
      const color = r[4] ? '#ff8080' : '#80f0a0';
      return `
        <text x="60" y="${y}" fill="#cca040" font-size="18" font-weight="bold">${r[0]}</text>
        <text x="160" y="${y}" fill="#80c8ff" font-size="18">${r[1]}</text>
        <text x="540" y="${y}" fill="#cc99ff" font-size="18">${r[2]}</text>
        <text x="780" y="${y}" fill="${color}" font-size="18" font-weight="bold">${r[3]}${r[4] ? '  ✗ critical' : ''}</text>
      `;
    }).join('');
  })()}

  <line x1="40" y1="340" x2="1020" y2="340" stroke="#3a4a5a" stroke-width="1"/>

  <!-- Final formula box -->
  <rect x="40" y="370" width="1000" height="90" rx="10" fill="rgba(255,200,144,0.06)" stroke="#ffc890" stroke-width="1.6"/>
  <text x="540" y="400" text-anchor="middle" fill="#ffc890" font-weight="bold" font-size="20">
    T_min = 80 + 150 + 80 = 310 ps   ·   f_max = 1 / 310 ps ≈ 3.23 GHz
  </text>
  <text x="540" y="426" text-anchor="middle" fill="#c8b090" font-size="18">
    הסעיף הבא: retiming מבחין את ה-150 ps של logic לשני stages
  </text>
</svg>`,
      },

      // ─────────────────────────────────────────────────────────
      // Part ב — Retiming invariant
      // ─────────────────────────────────────────────────────────
      {
        label: 'ב',
        question: 'מהו ה-**Retiming Invariant** (Leiserson-Saxe)? מה משמרים בעת הזזת FFs? תן דוגמת loop קטן (FF בטור עם XOR בfeedback) להמחיש למה ה-invariant חייב.',
        hints: [
          'שני חלקים: (1) **cycle weight preservation** — בכל לולאה במעגל, מספר ה-FFs נשמר; (2) **I/O latency preservation** — בכל נתיב מ-PI ל-PO, מספר ה-FFs נשמר.',
          'דוגמה ל-cycle invariant: feedback loop \`FF → XOR → FF\` (counter פשוט). אם מסירים אחד מהשניים, הפונקציה משתנה.',
          'דוגמה ל-I/O invariant: pipeline בן 3 stages עם 2 FFs. retiming יכול להזיז אותם, אבל בכל נתיב מ-input ל-output יישארו 2 FFs.',
          'הציוץ: אם המעגל **feedforward בלבד** (אין cycles), אז cycle invariant ריק (אין loops) ורק I/O latency נשמר.',
          'אסור: לשנות את ה-latency הקלט→פלט. אם BEFORE היה 1 cycle ו-AFTER היה 2 cycles, ה-retiming שגוי.',
        ],
        answer:
`## Retiming Invariant — שני חוקים

### 1. Cycle Weight Preservation

> **בכל לולאה מ-FF חזרה לעצמה במעגל, מספר ה-FFs נשמר.**

מתמטית: לכל cycle \`C\` במעגל הכוון, \`Σ w(e) = const\` עבור כל retiming חוקי. \`w(e)\` = מספר ה-FFs על קצה \`e\`.

#### דוגמה: counter פשוט עם feedback loop

\`\`\`
       ┌───────┐
   ────┤  XOR  ├──────┐
   ↑   └───────┘      │
   │                  ↓
   │              ┌───────┐
   └──────────────┤  FF   │
                  └───────┘
\`\`\`

לולאה: \`FF → XOR → FF\`. weight = 1 (FF יחיד בלולאה).

- אם מסירים את ה-FF: weight = 0. הלולאה הופכת לאסינכרונית, מתנודדת חופשית — counter לא עובד.
- אם מוסיפים עוד FF: weight = 2. counter עכשיו מונה ב-half-rate (כל שני clocks). פונקציה אחרת!

ה-invariant מבטיח שהפונקציה לא משתנה.

### 2. I/O Latency Preservation

> **בכל נתיב מ-Primary Input (PI) ל-Primary Output (PO), מספר ה-FFs נשמר.**

מתמטית: לכל path \`P\` מ-PI ל-PO, \`Σ w(e) = const\` עבור כל retiming חוקי.

#### דוגמה: ה-pipeline שלנו

- BEFORE: path \`a → t1 → t3 → FF_outA → out_x\`. FFs = 1.
- AFTER (retiming נכון): path \`a → FF_a' → t1' → t3' → out_x\`. FFs = 1.
- **I/O latency נשמר** ✓.

### במעגל ה-BEFORE שלנו

| לולאה (cycle) | אין | (feedforward) → invariant ריק |
| נתיב a → out_x | 1 FF | חייב להישמר |
| נתיב a → out_y | 1 FF | חייב להישמר |
| נתיב b → out_x | 1 FF | חייב להישמר |
| (וכן הלאה) | | |

### דבר חשוב: FF count יכול לגדול בכל זאת

הגם ש**I/O latency נשמר**, סך ה-FFs במעגל **יכול לגדול** בגלל פיצולי fanout.

דוגמה: \`FF_outA\` ביציאה, נתיבים אליה מ-\`a, b, c, d\`. אם תזיז את \`FF_outA\` אחורה דרך AND ולפני XORs, תצטרך FFs **על כל אחד מ-4 הקלטים** של ה-XORs (\`a, b, c, d\`).

| | FF count |
|---|---:|
| BEFORE | 2 (FF_outA, FF_outB) |
| AFTER (push fanout) | 4 (FF_a, FF_b, FF_c, FF_d) |

זה לא הפרת ה-invariant — כי בכל נתיב יחיד עדיין יש בדיוק 1 FF. רק במונח הכולל יותר.

### המסקנה

> Retiming מבטיח **שמירת פונקציה** (I/O behaviour לא משתנה). אבל הוא **לא** מבטיח שמירת FF count כללי.`,
        interviewerMindset:
`**שאלת תיאוריה חשובה.** המראיין מחפש:
1. **שאתה זוכר את שני החוקים** — לא רק "FFs נשמרים". cycle vs I/O.
2. **שאתה מבין את ההבדל בין cycle ל-feedforward** — במעגל feedforward, cycle invariant הוא vacuous.
3. **שאתה מציין שייתכן ש-FF count יגדל** — לא הפרת invariant, רק תופעה של fanout.
4. **שאתה זוכר את שם המקור** — Leiserson-Saxe 1991. (לא חובה, אבל בונוס.)

**שאלת המשך**: "האם retiming יכול להקטין את FF count?" → כן! במעגל עם fanin עמוק (הרבה signals מתאחדים), retiming יכול לאחד FFs.

**שאלת bonus**: "מה ההבדל בין retiming ל-pipelining?" → pipelining מוסיף FFs חדשים; retiming מזיז קיימים בלי לשנות סך נסיעת ה-bits. retiming "חינם" אבל מוגבל; pipelining "יקר" אבל יותר חזק.

**מלכודת**: סטודנט שמתבלבל בין retiming ל-resynthesis. retiming = הזזת FFs בלבד. resynthesis = שינוי הלוגיקה.`,
        expectedAnswers: [
          'invariant', 'אינוואריאנט',
          'cycle weight', 'cycle preservation', 'loop',
          'I/O latency', 'latency preservation',
          'feedforward', 'feedback',
          'Leiserson-Saxe', 'leiserson',
          'sum of FFs', 'preserve',
        ],
        answerSchematic: `
<svg viewBox="0 0 1080 540" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="The two retiming invariants illustrated.">

  <text x="540" y="38" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="24">
    Retiming Invariant — שני חוקים
  </text>

  <!-- Top: Cycle invariant -->
  <rect x="40" y="80" width="500" height="220" rx="12" fill="rgba(204,102,255,0.04)" stroke="#cc66ff" stroke-width="1.8"/>
  <text x="290" y="112" text-anchor="middle" fill="#cc99ff" font-weight="bold" font-size="20">
    1. Cycle Weight Preservation
  </text>

  <!-- Tiny counter loop diagram -->
  <g>
    <rect x="120" y="160" width="80" height="50" rx="6" fill="#1a1428" stroke="#cc66ff" stroke-width="2"/>
    <text x="160" y="190" text-anchor="middle" fill="#cc99ff" font-size="18" font-weight="bold">FF</text>

    <path d="M 240 175 Q 265 195, 240 215 L 270 215 Q 295 215, 310 195 Q 295 175, 270 175 Z"
          fill="rgba(128,240,160,0.25)" stroke="#80f0a0" stroke-width="2"/>
    <text x="280" y="198" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">XOR</text>

    <!-- Loop wires -->
    <line x1="200" y1="185" x2="245" y2="195" stroke="#a0a0c0" stroke-width="1.6"/>
    <path d="M 310 195 Q 380 195, 380 130 Q 380 100, 270 100 Q 160 100, 160 145" fill="none" stroke="#cc66ff" stroke-width="2"/>
    <polyline points="155,145 160,160 165,145" fill="none" stroke="#cc66ff" stroke-width="2"/>
  </g>

  <text x="290" y="250" text-anchor="middle" fill="#c8b090" font-size="18">
    בלולאה זו: 1 FF. retiming מותר רק עם 1 FF בלולאה.
  </text>
  <text x="290" y="275" text-anchor="middle" fill="#ff8080" font-size="16" font-style="italic">
    שינוי = שינוי פונקציונלי של counter
  </text>

  <!-- Bottom: I/O Latency invariant -->
  <rect x="560" y="80" width="500" height="220" rx="12" fill="rgba(128,240,160,0.04)" stroke="#80f0a0" stroke-width="1.8"/>
  <text x="810" y="112" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="20">
    2. I/O Latency Preservation
  </text>

  <!-- BEFORE: FF at end -->
  <text x="580" y="155" fill="#a0a0c0" font-size="18" font-weight="bold">BEFORE:</text>
  <g>
    <circle cx="600" cy="190" r="14" fill="#0a1825" stroke="#cca040" stroke-width="2"/>
    <text x="600" y="195" text-anchor="middle" fill="#cca040" font-size="16" font-weight="bold">a</text>
    <line x1="614" y1="190" x2="700" y2="190" stroke="#a0a0c0" stroke-width="1.6"/>
    <rect x="700" y="175" width="40" height="30" rx="4" fill="rgba(128,200,255,0.2)" stroke="#80c8ff" stroke-width="1.4"/>
    <text x="720" y="195" text-anchor="middle" fill="#80c8ff" font-size="16">logic</text>
    <line x1="740" y1="190" x2="800" y2="190" stroke="#a0a0c0" stroke-width="1.6"/>
    <rect x="800" y="175" width="40" height="30" rx="4" fill="#1a1428" stroke="#cc66ff" stroke-width="1.6"/>
    <text x="820" y="195" text-anchor="middle" fill="#cc99ff" font-size="16" font-weight="bold">FF</text>
    <line x1="840" y1="190" x2="900" y2="190" stroke="#ff9933" stroke-width="1.6"/>
    <circle cx="914" cy="190" r="14" fill="#0a1825" stroke="#ff9933" stroke-width="2"/>
    <text x="914" y="195" text-anchor="middle" fill="#ff9933" font-size="16" font-weight="bold">y</text>
  </g>
  <text x="810" y="225" text-anchor="middle" fill="#80f0a0" font-size="16">1 FF on a → y</text>

  <!-- AFTER: FF at start -->
  <text x="580" y="245" fill="#a0a0c0" font-size="18" font-weight="bold">AFTER:</text>
  <g>
    <circle cx="600" cy="280" r="14" fill="#0a1825" stroke="#cca040" stroke-width="2"/>
    <text x="600" y="285" text-anchor="middle" fill="#cca040" font-size="16" font-weight="bold">a</text>
    <line x1="614" y1="280" x2="680" y2="280" stroke="#a0a0c0" stroke-width="1.6"/>
    <rect x="680" y="265" width="40" height="30" rx="4" fill="#1a1428" stroke="#cc66ff" stroke-width="1.6"/>
    <text x="700" y="285" text-anchor="middle" fill="#cc99ff" font-size="16" font-weight="bold">FF</text>
    <line x1="720" y1="280" x2="780" y2="280" stroke="#a0a0c0" stroke-width="1.6"/>
    <rect x="780" y="265" width="40" height="30" rx="4" fill="rgba(128,200,255,0.2)" stroke="#80c8ff" stroke-width="1.4"/>
    <text x="800" y="285" text-anchor="middle" fill="#80c8ff" font-size="16">logic</text>
    <line x1="820" y1="280" x2="900" y2="280" stroke="#ff9933" stroke-width="1.6"/>
    <circle cx="914" cy="280" r="14" fill="#0a1825" stroke="#ff9933" stroke-width="2"/>
    <text x="914" y="285" text-anchor="middle" fill="#ff9933" font-size="16" font-weight="bold">y</text>
  </g>
  <text x="810" y="315" text-anchor="middle" fill="#80f0a0" font-size="16">1 FF on a → y ✓ same</text>

  <!-- Bottom summary -->
  <rect x="40" y="350" width="1020" height="160" rx="10" fill="rgba(64,80,100,0.06)" stroke="#3a4a5a" stroke-width="1.4"/>
  <text x="540" y="382" text-anchor="middle" fill="#ffc890" font-weight="bold" font-size="20">
    Retiming = הזזת FFs ע"פ שני החוקים האלה
  </text>
  <text x="540" y="412" text-anchor="middle" fill="#c8b090" font-size="18">
    Cycle invariant: רלוונטי רק במעגלים עם feedback. שלנו feedforward → ריק.
  </text>
  <text x="540" y="438" text-anchor="middle" fill="#c8b090" font-size="18">
    I/O latency: חייב לאשר שכל path PI→PO שומר על מספר FFs.
  </text>
  <text x="540" y="468" text-anchor="middle" fill="#cc99ff" font-size="18" font-weight="bold">
    שים לב: סך FFs במעגל יכול לגדול בגלל פיצולי fanout (סעיף ג').
  </text>
  <text x="540" y="494" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">
    זה לא הפרת invariant — רק התרחבות פיזית.
  </text>
</svg>`,
      },

      // ─────────────────────────────────────────────────────────
      // Part ג — Apply correct retiming
      // ─────────────────────────────────────────────────────────
      {
        label: 'ג',
        question: 'תיישם retiming שיקצוץ את ה-T_min. אלו FFs מעבירים, ולאן? למה **כל ארבעת ה-FFs** (אחד לכל קלט) חייבים לעלות יחד? מה ה-T_min החדש וה-f_max?',
        hints: [
          'כדי לחתוך את ה-150 ps של logic, צריך להעביר FF לאמצע — לפני AND/OR.',
          'אבל ה-AND וה-OR שניהם מקבלים את \`t1\` ואת \`t2\`. אם נעביר FF לפני AND ולא לפני OR, נוצרת אסימטריה.',
          'הפתרון: \`r(t1) = r(t2) = r(t3) = r(t4) = 1\` — דחיפת כל הרכיבים שעל הנתיב.',
          'תוצאה: FFs ממוקמים בקלטים (a→t1, b→t1, c→t2, d→t2). 4 FFs במקום 2 — סך גדל!',
          'I/O latency נשמר: כל input → output עדיין 1 FF (אחד בכל path).',
          'Stage 1 (combinational): XOR (90 ps). Stage 2 (combinational): AND/OR (60/50). max stage = 90.',
          'T_min = 80 + 90 + 80 = 250 ps. f_max = 1/250 = 4 GHz.',
        ],
        answer:
`## Retiming Move: \`r(t1)=r(t2)=r(t3)=r(t4)=1\`

הקצוות שלפני ה-FFs (קצוות לתוך t1, t2): מתווסף FF.
הקצוות שאחרי ה-FFs (קצוות מ-t3, t4 ליציאות): FF מוסר.

### השינוי ב-FFs

| Edge | BEFORE | AFTER | משמעות |
|---|:---:|:---:|---|
| a → t1 | 0 | **1** | FF נוסף ב-input |
| b → t1 | 0 | **1** | FF נוסף ב-input |
| c → t2 | 0 | **1** | FF נוסף ב-input |
| d → t2 | 0 | **1** | FF נוסף ב-input |
| t1 → t3 | 0 | 0 | אין שינוי |
| t1 → t4 | 0 | 0 | אין שינוי |
| t2 → t3 | 0 | 0 | אין שינוי |
| t2 → t4 | 0 | 0 | אין שינוי |
| t3 → out_x | **1** | 0 | FF_outA הוסר |
| t4 → out_y | **1** | 0 | FF_outB הוסר |

### תוצאה

- **לפני**: 2 FFs (FF_outA, FF_outB) ביציאה.
- **אחרי**: 4 FFs (אחד לכל קלט).
- **סך FFs**: 2 → 4 (גדל בגלל fanout).
- **I/O latency** (לכל path): 1 → 1 ✓ ✓ ✓ נשמר!

### למה כל ה-4 FFs חייבים לעלות יחד

ה-AND ו-OR שניהם מקבלים את t1 ואת t2. אם נעביר FF רק לפני ה-AND (להפסיק את הנתיב הקריטי), ה-OR ייראה את t1, t2 קומבינטוריים — וזה יוצר אי-תאימות זמני בין שני המסלולים.

הקפדה: **r על vertex חייב להיות אחיד** עבור כל אחד מהcrossings. הכי בטוח: \`r(t1) = r(t2)\` ו-\`r(t3) = r(t4)\`. אם תפר את זה, תקבל negative edge weights = retiming לא חוקי.

### T_min ו-f_max החדשים

לאחר retiming, ה-pipeline 2-stages:
- Stage 1 (קומבינטורי): XOR = 90 ps
- Stage 2 (קומבינטורי): AND = 60 ps OR OR = 50 ps → max = 60 ps

T_min מוגבל ע"י ה-stage הארוך:
\`\`\`
T_min = t_CQ + max(stage 1, stage 2) + t_su
      = 80 + 90 + 80 = 250 ps
f_max = 1/250 ps = 4 GHz
\`\`\`

### השוואה

| מאפיין | BEFORE | AFTER |
|---|---:|---:|
| Critical path (combinational) | 150 ps | 90 ps |
| T_min | 310 ps | **250 ps** |
| f_max | 3.23 GHz | **4 GHz** |
| Improvement | — | **+24%** |
| FF count | 2 | 4 |
| Total latency (cycles) | 1 | 1 (נשמר) |

### האם זה אופטימלי?

לא לגמרי. נסה r שטין יותר — \`r(t3)=r(t4)=1\` בלבד (לא להעביר את t1, t2). ה-FFs לא יזוזו כל הדרך לקלטים, אלא רק לאמצע (לפני AND/OR).

- Stage 1: XOR + (חצי AND/OR) — לא חוקי, FF באמצע gate.
- בעצם זה מה שהיה — אין fan-in single, אבל retiming דורש שלמות.

הפתרון של \`r=1\` עבור כל ה-cone = הכי קרוב לאופטימלי במעגל הזה.`,
        interviewerMindset:
`**שאלה אופטימיזציה ארתימטית.** המראיין מחפש:
1. **שאתה מבחין שצריך 4 FFs במקום 2** — סטודנט שאומר "2 FFs מספיקים" מפספס fanout.
2. **שאתה מסביר למה כל הקבוצה עולה יחד** — \`r(t1) = r(t2)\` הוא דרישת ה-algorithm.
3. **שאתה מציין שה-I/O latency נשמר** — לא רק "FFs זזות", אלא לכל path נשמר.
4. **שאתה מצטט את ה-improvement** — לא רק "פתרון", אלא 4 GHz vs 3.23 GHz.

**שאלת המשך**: "מה אם נרצה שלב נוסף? r=2?" → אז 8 FFs (כפול ה-fanout). f_max יישבר ע"י max stage = 90 ps (XOR לא ניתן לפיצול), אז יישאר ב-4 GHz. Retiming יותר מ-r=1 לא עוזר במקרה הזה — האלגוריתם של Leiserson-Saxe יודע להבחין באופטימום אוטומטית.

**שאלת bonus**: "האם יש משמעות ל-FF count הגדל?" → כן: area+power מתעלים. במציאות, retiming tool (PrimeTime SLD, DC Compiler) משקלל את ה-trade-off.

**מלכודת**: סטודנט שאומר "fmax יעלה pi 100%". לא — רק 24%. הסיבה: t_CQ + t_su הם רוב T_min, ו-Retiming לא משנה אותם.`,
        expectedAnswers: [
          '4 FFs', 'four FFs', 'ארבעה',
          'r(t1)', 'r=1', 'lag function',
          '250', '4 GHz',
          'input registers', 'fanout',
          'I/O latency preserved',
          'inputs', 'קלטים',
        ],
        answerSchematic: `
<svg viewBox="0 0 1080 480" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Retimed scene with FFs moved from outputs to inputs.">

  <text x="540" y="38" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="24">
    AFTER — Retimed (FFs at inputs)
  </text>
  <text x="540" y="64" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">
    r(t1)=r(t2)=r(t3)=r(t4)=1   ·   2 FFs → 4 FFs (per fanout)
  </text>

  <!-- Inputs -->
  <g font-size="18" font-weight="bold">
    <circle cx="60" cy="140" r="18" fill="#0a1825" stroke="#cca040" stroke-width="2"/>
    <text x="60" y="145" text-anchor="middle" fill="#cca040">a</text>
    <circle cx="60" cy="210" r="18" fill="#0a1825" stroke="#cca040" stroke-width="2"/>
    <text x="60" y="215" text-anchor="middle" fill="#cca040">b</text>
    <circle cx="60" cy="300" r="18" fill="#0a1825" stroke="#cca040" stroke-width="2"/>
    <text x="60" y="305" text-anchor="middle" fill="#cca040">c</text>
    <circle cx="60" cy="370" r="18" fill="#0a1825" stroke="#cca040" stroke-width="2"/>
    <text x="60" y="375" text-anchor="middle" fill="#cca040">d</text>
  </g>

  <!-- 4 new FFs at inputs (yellow highlight) -->
  ${[
    { y: 140, name: 'FF_a' },
    { y: 210, name: 'FF_b' },
    { y: 300, name: 'FF_c' },
    { y: 370, name: 'FF_d' },
  ].map(ff => `
    <line x1="78" y1="${ff.y}" x2="150" y2="${ff.y}" stroke="#a0a0c0" stroke-width="1.6"/>
    <rect x="150" y="${ff.y - 18}" width="90" height="36" rx="6"
          fill="#3a3a0a" stroke="#ffe060" stroke-width="2.4"/>
    <text x="195" y="${ff.y + 5}" text-anchor="middle" fill="#ffe060" font-size="18" font-weight="bold">${ff.name} ✨</text>
  `).join('')}

  <!-- Wires from FFs to XORs -->
  <g stroke="#a0a0c0" stroke-width="1.6" fill="none">
    <line x1="240" y1="140" x2="340" y2="165"/>
    <line x1="240" y1="210" x2="340" y2="185"/>
    <line x1="240" y1="300" x2="340" y2="325"/>
    <line x1="240" y1="370" x2="340" y2="345"/>
  </g>

  <!-- XORs (stage 1) -->
  <path d="M 340 155 Q 365 175, 340 195 L 370 195 Q 395 195, 410 175 Q 395 155, 370 155 Z"
        fill="rgba(128,240,160,0.25)" stroke="#80f0a0" stroke-width="2"/>
  <text x="378" y="170" text-anchor="middle" fill="#80f0a0" font-size="16" font-weight="bold">XOR</text>
  <text x="378" y="183" text-anchor="middle" fill="#a0c0d0" font-size="16">t1 · 90</text>

  <path d="M 340 315 Q 365 335, 340 355 L 370 355 Q 395 355, 410 335 Q 395 315, 370 315 Z"
        fill="rgba(128,240,160,0.25)" stroke="#80f0a0" stroke-width="2"/>
  <text x="378" y="330" text-anchor="middle" fill="#80f0a0" font-size="16" font-weight="bold">XOR</text>
  <text x="378" y="343" text-anchor="middle" fill="#a0c0d0" font-size="16">t2 · 90</text>

  <!-- Wires from XORs to AND/OR -->
  <g stroke="#a0a0c0" stroke-width="1.6" fill="none">
    <line x1="410" y1="175" x2="540" y2="220"/>
    <line x1="410" y1="335" x2="540" y2="250"/>
    <line x1="410" y1="175" x2="540" y2="310"/>
    <line x1="410" y1="335" x2="540" y2="340"/>
  </g>

  <!-- AND/OR (stage 2) -->
  <path d="M 540 210 L 570 210 A 25 25 0 0 1 570 260 L 540 260 Z"
        fill="rgba(128,200,255,0.25)" stroke="#80c8ff" stroke-width="2"/>
  <text x="555" y="232" text-anchor="middle" fill="#80c8ff" font-size="16" font-weight="bold">AND</text>
  <text x="555" y="246" text-anchor="middle" fill="#a0c0d0" font-size="16">t3 · 60</text>

  <path d="M 540 300 L 555 300 Q 575 300, 590 325 Q 575 350, 555 350 L 540 350 Q 550 325, 540 300 Z"
        fill="rgba(255,192,128,0.25)" stroke="#ffc080" stroke-width="2"/>
  <text x="565" y="320" text-anchor="middle" fill="#ffc080" font-size="16" font-weight="bold">OR</text>
  <text x="565" y="334" text-anchor="middle" fill="#a0c0d0" font-size="16">t4 · 50</text>

  <!-- Wires to outputs (no FFs here anymore) -->
  <line x1="595" y1="235" x2="780" y2="235" stroke="#ff9933" stroke-width="2"/>
  <line x1="590" y1="325" x2="780" y2="325" stroke="#ff9933" stroke-width="2"/>

  <!-- Outputs -->
  <circle cx="800" cy="235" r="18" fill="#0a1825" stroke="#ff9933" stroke-width="2"/>
  <text x="800" y="240" text-anchor="middle" fill="#ff9933" font-size="18" font-weight="bold">out_x</text>

  <circle cx="800" cy="325" r="18" fill="#0a1825" stroke="#ff9933" stroke-width="2"/>
  <text x="800" y="330" text-anchor="middle" fill="#ff9933" font-size="18" font-weight="bold">out_y</text>

  <!-- Stage boundaries -->
  <text x="285" y="100" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">Stage 1 = 90 ps</text>
  <text x="555" y="100" text-anchor="middle" fill="#ff9050" font-size="18" font-weight="bold">Stage 2 = 60 ps</text>
  <line x1="280" y1="110" x2="280" y2="420" stroke="#a0a0c0" stroke-width="1" stroke-dasharray="3,3"/>
  <line x1="500" y1="110" x2="500" y2="420" stroke="#a0a0c0" stroke-width="1" stroke-dasharray="3,3"/>

  <!-- Bottom summary -->
  <rect x="40" y="410" width="1000" height="60" rx="10" fill="rgba(128,240,160,0.06)" stroke="#80f0a0" stroke-width="1.6"/>
  <text x="540" y="438" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="20">
    T_min = 80 + 90 + 80 = 250 ps  ⇒  f_max = 4 GHz  (+24% vs BEFORE)
  </text>
  <text x="540" y="462" text-anchor="middle" fill="#c8b090" font-size="18" font-style="italic">
    I/O latency = 1 cycle (נשמר). FF count: 2 → 4 (fanout).
  </text>
</svg>`,
      },

      // ─────────────────────────────────────────────────────────
      // Part ד — Failure trace: partial retiming
      // ─────────────────────────────────────────────────────────
      {
        label: 'ד',
        question: 'מה קורה אם תזיז רק את \`FF_outA\` אחורה אבל תשאיר את \`FF_outB\` במקום? ספציפית: הוספת FFs על \`a → t1, b → t1, c → t2, d → t2\` (4 FFs חדשים), הסרת \`FF_outA\`, אבל **השארת FF_outB** בנתיב \`t4 → out_y\`. הוכח שזה שובר את הפונקציה — תן trace מספרי.',
        hints: [
          'בעיה: ה-FFs באמצע ה-stage 1 (a→t1, b→t1, c→t2, d→t2) משהים את t1, t2 ב-cycle אחד.',
          't3 (= t1 AND t2) במקרה זה: t1@(cycle n) דרך FF נדגם → באמת cycle n. t2@(cycle n) דרך FF גם.',
          't4 (= t1 OR t2): כאן אין FFs בזרם — t1 ו-t2 יוצאים מ-FFs ועוברים קומבינטורית ל-OR. **אבל FF_outB נשאר** ביציאה → t4 נטען ל-FF_outB → out_y מקבל t4(@n) אחרי cycle nosso.',
          'נראה שאין הבדל — שני המסלולים מקבלים cycle n. אבל יש בעיה ב-I/O latency!',
          'I/O latency חדש מ-a ל-out_x: a → FF_a → t1 → t3 → out_x = 1 FF (FF_a) ⇒ 1 cycle ✓.',
          'I/O latency חדש מ-a ל-out_y: a → FF_a → t1 → t4 → FF_outB → out_y = **2 FFs** ⇒ 2 cycles ✗.',
          'הפרת ה-invariant! out_x יוצא cycle 1, out_y יוצא cycle 2. נסיסון.',
        ],
        answer:
`## הבעיה: הפרת I/O Latency

### מה עשינו (Retiming שגוי)

| Edge | BEFORE | אחרי (שגוי) |
|---|:---:|:---:|
| a → t1 | 0 | **1** ✨ |
| b → t1 | 0 | **1** ✨ |
| c → t2 | 0 | **1** ✨ |
| d → t2 | 0 | **1** ✨ |
| t3 → out_x | **1** (FF_outA) | 0 (הוסר) |
| t4 → out_y | **1** (FF_outB) | **1** (לא שונה!) |

### חישוב I/O latency

| נתיב | BEFORE | AFTER שגוי | תקין? |
|---|:---:|:---:|:---:|
| a → out_x | 1 (FF_outA) | 1 (FF_a) | ✓ |
| a → out_y | 1 (FF_outB) | **2** (FF_a + FF_outB) | **✗ הופרה!** |
| b → out_x | 1 | 1 | ✓ |
| b → out_y | 1 | **2** | **✗ הופרה!** |
| c → out_x | 1 | 1 | ✓ |
| c → out_y | 1 | **2** | **✗ הופרה!** |
| d → out_x | 1 | 1 | ✓ |
| d → out_y | 1 | **2** | **✗ הופרה!** |

### Trace מספרי

נניח: \`a, b, c, d\` = \`1, 0, 1, 1\` ב-cycle 1, ואז משתנים ל-\`0, 1, 0, 0\` ב-cycle 2.

| Cycle | a, b, c, d | t1 (BEFORE FF) | t2 (BEFORE FF) | FF_a Q | FF_b Q | FF_c Q | FF_d Q | t3 (after FFs) | t4 (after FFs) | FF_outB Q (delayed) | out_x | out_y (delayed!) |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 0 | (init) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 1 | 1,0,1,1 | (FF inputs only) | — | (latch at end) | (latch) | (latch) | (latch) | — | — | (latch t4=0 prev cycle) | — | 0 |
| 2 | 0,1,0,0 | — | — | 1 | 0 | 1 | 1 | 1⊕0=1 OK,...| 1⊕0=1 | 0 (still prev) | 1 (t3=1AND0=0... wait) |  |

Let me redo this — getting tangled. The clean story:

- **out_x** at cycle n+1 = result of inputs at cycle n. (1 FF in path)
- **out_y** at cycle n+2 = result of inputs at cycle n. (2 FFs in path: FF_a/b/c/d, then FF_outB)
- **out_x מקדים את out_y ב-cycle אחד.** הם לא מתאימים יותר ב-timing.

### למה זה רע

ה-consumer של \`out_x\` ו-\`out_y\` (מודול במורד הזרם) ציפה ש**שני האותות מגיעים באותו cycle**. במציאות, out_x מקדים. ה-consumer יקרא ערך ישן של out_y עם ערך חדש של out_x → לוגיקה שגויה.

### זה לא רק "performance" — זו פונקציה

ה-output הוא **לא** המקור: זה שגוי **פונקציונלית**. מי שמסתכל על ה-trace של \`(out_x, out_y)\` רואה זוגות לא מתאימים, **לא רק delay**.

### הפתרון

או:
1. **גם FF_outB צריך לזוז אחורה**: r(t3) = r(t4) = 1, ואז I/O latency בכל path = 1. זה ה-retiming הנכון (סעיף ג').
2. **או להוסיף עוד FF** בנתיב out_x → לפצות ב-cycle של delay. אבל זה לא retiming — זה pipelining (= מוסיף latency כללי).

### המסקנה

> **Retiming שגוי = פונקציה שגויה.** ה-invariant מבטיח שמירת פונקציה. הפרתה היא bug, לא רק תזמון. ה-STA tool ידחה את ה-retiming.

ב-STA אמיתי (Synopsys PrimeTime), retiming מתבצע ע"י **algorithm** עם בדיקת invariants. שגיאות כמו זו לא מתרחשות. אבל ב-RTL הנדסי ידני, הסטודנט חייב לבדוק.`,
        interviewerMindset:
`**שאלת bug-detection.** המראיין מחפש:
1. **שאתה מזהה את ההפרת I/O latency** — לא רק "חוסר אזון" אלא **שינוי פונקציוני**.
2. **שאתה מציין שזה לא רק performance** — זו שגיאה פונקציונלית, לא רק תזמון.
3. **שאתה זוכר את ה-FF count לכל path** — חישוב מדויק.
4. **שאתה אומר "STA tool ייסירה את ה-retiming"** — ה-tools בודקים invariants אוטומטית.

**שאלת המשך**: "איך STA tool יזהה?" → ה-algorithm של Leiserson-Saxe בוחן את כל ה-edges אחרי הפעלת \`r\`. אם יש edge עם weight שלילי (< 0), retiming לא חוקי. ה-tool מחזיר error.

**שאלת bonus**: "מה אם out_x ו-out_y לא חשובים זה לזה?" → אז ההפרת latency מקובלת. אבל ב-consumer-side, השני strictly באותו cycle, ההפרה היא bug. עם clear interface contract.

**מלכודת**: סטודנט שאומר "פשוט נוסיף FF על out_x" → זה lots of cost (latency global, area). הפתרון הנכון הוא retiming אחיד.`,
        expectedAnswers: [
          'I/O latency', 'latency violation', 'הפרת latency',
          '2 cycles', '1 cycle', 'cycle mismatch',
          'desync', 'דה-סנכרון',
          'functional bug', 'bug פונקציונלי',
          'FF_outB', 'unmoved', 'invariant violation',
          'consumer', 'STA tool',
        ],
        answerSchematic: `
<svg viewBox="0 0 1080 540" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Partial retiming failure: out_x has 1 FF, out_y has 2 FFs — desync.">

  <text x="540" y="38" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="24">
    Retiming שגוי — הפרת I/O Latency
  </text>
  <text x="540" y="64" text-anchor="middle" fill="#ff8080" font-size="18" font-style="italic">
    ✗ FFs הוספו לקלטים אבל FF_outB לא הוסר — out_y בעיכוב 1 cycle
  </text>

  <!-- Two timelines -->
  <text x="80" y="120" fill="#80f0a0" font-weight="bold" font-size="20">a → out_x: 1 FF (1 cycle)</text>
  <line x1="80" y1="135" x2="1020" y2="135" stroke="#80f0a0" stroke-width="2"/>

  <!-- out_x path components -->
  <g>
    <circle cx="120" cy="170" r="18" fill="#0a1825" stroke="#cca040" stroke-width="2"/>
    <text x="120" y="175" text-anchor="middle" fill="#cca040" font-size="18" font-weight="bold">a</text>
    <line x1="138" y1="170" x2="200" y2="170" stroke="#a0a0c0" stroke-width="1.6"/>
    <rect x="200" y="152" width="80" height="36" rx="4" fill="#3a3a0a" stroke="#ffe060" stroke-width="2"/>
    <text x="240" y="175" text-anchor="middle" fill="#ffe060" font-size="18" font-weight="bold">FF_a</text>
    <line x1="280" y1="170" x2="370" y2="170" stroke="#a0a0c0" stroke-width="1.6"/>
    <rect x="370" y="152" width="80" height="36" rx="4" fill="rgba(128,200,255,0.2)" stroke="#80c8ff" stroke-width="1.6"/>
    <text x="410" y="175" text-anchor="middle" fill="#80c8ff" font-size="16">logic₁ (XOR)</text>
    <line x1="450" y1="170" x2="540" y2="170" stroke="#a0a0c0" stroke-width="1.6"/>
    <rect x="540" y="152" width="80" height="36" rx="4" fill="rgba(128,200,255,0.2)" stroke="#80c8ff" stroke-width="1.6"/>
    <text x="580" y="175" text-anchor="middle" fill="#80c8ff" font-size="16">logic₂ (AND)</text>
    <line x1="620" y1="170" x2="730" y2="170" stroke="#ff9933" stroke-width="1.6"/>
    <circle cx="744" cy="170" r="18" fill="#0a1825" stroke="#ff9933" stroke-width="2"/>
    <text x="744" y="175" text-anchor="middle" fill="#ff9933" font-size="16" font-weight="bold">out_x</text>
  </g>
  <text x="280" y="220" text-anchor="middle" fill="#80f0a0" font-size="18">Total: 1 FF ✓</text>

  <text x="80" y="280" fill="#ff8080" font-weight="bold" font-size="20">a → out_y: 2 FFs (2 cycles!) ✗</text>
  <line x1="80" y1="295" x2="1020" y2="295" stroke="#ff8080" stroke-width="2"/>

  <!-- out_y path components -->
  <g>
    <circle cx="120" cy="330" r="18" fill="#0a1825" stroke="#cca040" stroke-width="2"/>
    <text x="120" y="335" text-anchor="middle" fill="#cca040" font-size="18" font-weight="bold">a</text>
    <line x1="138" y1="330" x2="200" y2="330" stroke="#a0a0c0" stroke-width="1.6"/>
    <rect x="200" y="312" width="80" height="36" rx="4" fill="#3a3a0a" stroke="#ffe060" stroke-width="2"/>
    <text x="240" y="335" text-anchor="middle" fill="#ffe060" font-size="18" font-weight="bold">FF_a</text>
    <line x1="280" y1="330" x2="370" y2="330" stroke="#a0a0c0" stroke-width="1.6"/>
    <rect x="370" y="312" width="80" height="36" rx="4" fill="rgba(128,200,255,0.2)" stroke="#80c8ff" stroke-width="1.6"/>
    <text x="410" y="335" text-anchor="middle" fill="#80c8ff" font-size="16">logic₁ (XOR)</text>
    <line x1="450" y1="330" x2="540" y2="330" stroke="#a0a0c0" stroke-width="1.6"/>
    <rect x="540" y="312" width="80" height="36" rx="4" fill="rgba(255,192,128,0.2)" stroke="#ffc080" stroke-width="1.6"/>
    <text x="580" y="335" text-anchor="middle" fill="#ffc080" font-size="16">logic₂ (OR)</text>
    <line x1="620" y1="330" x2="700" y2="330" stroke="#a0a0c0" stroke-width="1.6"/>
    <rect x="700" y="312" width="80" height="36" rx="4" fill="#1a1428" stroke="#cc66ff" stroke-width="2"/>
    <text x="740" y="335" text-anchor="middle" fill="#cc99ff" font-size="18" font-weight="bold">FF_outB</text>
    <line x1="780" y1="330" x2="850" y2="330" stroke="#ff9933" stroke-width="1.6"/>
    <circle cx="864" cy="330" r="18" fill="#0a1825" stroke="#ff9933" stroke-width="2"/>
    <text x="864" y="335" text-anchor="middle" fill="#ff9933" font-size="16" font-weight="bold">out_y</text>
  </g>
  <text x="490" y="380" text-anchor="middle" fill="#ff8080" font-size="18">Total: 2 FFs ✗ desync!</text>

  <!-- Bottom analysis -->
  <rect x="40" y="410" width="1000" height="110" rx="10" fill="rgba(255,96,96,0.06)" stroke="#ff8080" stroke-width="1.8"/>
  <text x="540" y="438" text-anchor="middle" fill="#ff8080" font-weight="bold" font-size="20">
    out_x: input cycle N → output cycle N+1
  </text>
  <text x="540" y="462" text-anchor="middle" fill="#ff8080" font-weight="bold" font-size="20">
    out_y: input cycle N → output cycle N+2
  </text>
  <text x="540" y="490" text-anchor="middle" fill="#ffc890" font-size="18" font-weight="bold">
    Consumer מצפה לזוג מתאים — מקבל זוג לא תואם → לוגיקה שגויה
  </text>
  <text x="540" y="512" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">
    הפתרון הנכון: r(t3) = r(t4) = 1, FF_outA AND FF_outB צריכים שניהם להיעלם (סעיף ג')
  </text>
</svg>`,
      },

      // ─────────────────────────────────────────────────────────
      // Part ה — Verify the retimed circuit
      // ─────────────────────────────────────────────────────────
      {
        label: 'ה',
        question: 'הקנבס נטען עם המעגל AFTER (retimed). חשב מחדש את ה-T_min ו-f_max. וודא שה-fungsi פונקציונלית **זהה** ל-BEFORE: לכל 4 וקטורי הכניסה \`(a,b,c,d)\` = \`(0,0,0,0), (1,0,1,0), (1,1,1,1), (0,1,1,0)\`, מה תהיה התוצאה \`(out_x, out_y)\` (בהבדל של cycle latency)?',
        hints: [
          'AFTER topology: FFs בקלטים. Stage 1 קומבינטורי = XOR (90 ps). Stage 2 קומבינטורי = AND/OR (60/50 ps).',
          'Critical = max(stage1, stage2) = 90 ps. T_min = 80 + 90 + 80 = 250 ps. f_max = 4 GHz.',
          'פונקציה: out_x = t1 AND t2 = (a⊕b) AND (c⊕d). out_y = t1 OR t2 = (a⊕b) OR (c⊕d). זהה ל-BEFORE.',
          'Trace: (0,0,0,0) → t1=0, t2=0 → out_x=0, out_y=0.',
          'Trace: (1,0,1,0) → t1=1, t2=1 → out_x=1, out_y=1.',
          'Trace: (1,1,1,1) → t1=0, t2=0 → out_x=0, out_y=0.',
          'Trace: (0,1,1,0) → t1=1, t2=1 → out_x=1, out_y=1.',
          'בכל המקרים, output AFTER **זהה** ל-output BEFORE (עם cycle latency שווה — שניהם 1 cycle).',
        ],
        answer:
`## verification

### T_min ו-f_max החדשים

\`\`\`
Stage 1 critical = XOR = 90 ps
Stage 2 critical = AND (60) או OR (50) → max = 60 ps
Pipeline critical = max(90, 60) = 90 ps

T_min = t_CQ + 90 + t_su = 80 + 90 + 80 = 250 ps
f_max = 1 / 250 ps = 4 GHz
\`\`\`

**שיפור: 3.23 GHz → 4 GHz = +24%.** ללא שינוי בפונקציה.

### Trace פונקציונלי — השוואת BEFORE vs AFTER

עבור כל וקטור, פעם 1 CLK ב-CLK ובדוק את ה-FFs מתעדכנים.

| (a,b,c,d) | t1 = a⊕b | t2 = c⊕d | out_x = t1·t2 | out_y = t1+t2 | זהה ל-BEFORE? |
|:---:|:---:|:---:|:---:|:---:|:---:|
| (0,0,0,0) | 0 | 0 | 0 | 0 | ✓ |
| (1,0,1,0) | 1 | 1 | **1** | **1** | ✓ |
| (1,1,1,1) | 0 | 0 | 0 | 0 | ✓ |
| (0,1,1,0) | 1 | 1 | **1** | **1** | ✓ |

✅ **כל 4 הוקטורים נותנים את אותה התוצאה ב-AFTER וב-BEFORE.** הפונקציה נשמרה.

### השוואה מסכמת

| מאפיין | BEFORE | AFTER | שינוי |
|---|---:|---:|---|
| Critical path (logic) | 150 ps | 90 ps | **−40%** |
| T_min | 310 ps | 250 ps | **−19%** |
| f_max | 3.23 GHz | 4 GHz | **+24%** |
| FF count | 2 | 4 | +2 (fanout) |
| I/O latency (cycles) | 1 | 1 | **שמר** |
| Function | ✓ | ✓ | **שמר** |

### ב-design tools

- **Synopsys PrimeTime SLD** מבצע retiming אוטומטית עם objective \`maximize f_max\`.
- **DC Compiler** משלב retiming כצעד באופטימיזציה.
- שיפור של 24% הוא **סדר גודל ריאליסטי** ב-retiming של מודולי datapath מודרניים.

### בקנבס

ה-engine מציג את ה-circuit AFTER. בדוק:
1. הצב \`(a,b,c,d) = (1,0,1,0)\`.
2. פעם 1 CLK → ערכי הכניסה נטענים ל-FFs.
3. ערוך 1 CLK נוסף → t1, t2 קומבינטוריים מ-FFs.Q; t3, t4 מתעדכנים → out_x=1, out_y=1.

I/O latency = 1 cycle (זהה ל-BEFORE).`,
        interviewerMindset:
`**שאלת אימות.** המראיין מחפש:
1. **שאתה מאמת את הפונקציה ב-trace** — לא רק "אותו דבר". טבלת אמת קונקרטית.
2. **שאתה מודה ב-FF count growth** — לא מנסה להסתיר. שני FFs לארבעה.
3. **שאתה מציין latency שנשמר** — לא רק "1 cycle", אלא "באותו cycle כמו BEFORE".
4. **שאתה אומר "אותו פונקציה"** — Retiming הוא אופטימיזציה שאיננה משנה IO.

**שאלת המשך**: "האם יש מקרה שבו retiming משנה את הפונקציה?" → לא, אם invariants נשמרים. Retiming נכון תמיד שומר פונקציה.

**שאלת bonus**: "אם הייתי משתמש ב-design tool, איך אדע שה-retiming השתפר את ה-f_max?" → STA report. T_min ב-BEFORE > T_min ב-AFTER. גם report של critical-path-delay אמור להציג שיפור.

**מלכודת**: סטודנט שמאמין שיכול לקבל ביצועים יותר טובים עם עוד retiming. במעגל הזה: לא. ה-XOR (90 ps) הוא ה-bottleneck. אי אפשר לפצל gate בודד.

**ראה גם**: #5004 ד'-ה' (pipelining בסיסי).`,
        expectedAnswers: [
          '250', '4 GHz', '4GHz',
          '90', 'max stage',
          'function preserved', 'פונקציה',
          'same output', 'אותה תוצאה',
          'trace', 'test vectors',
          '+24%',
        ],
        circuit: () => build(() => {
          // AFTER topology — retimed (FFs at inputs).
          // 4 FFs latch a/b/c/d → 2 XORs → AND + OR → 2 outputs.
          //
          // Defaults: a=1, b=0, c=1, d=1. After 1 CLK, FFs latch the
          // values. After 2nd CLK, outputs reflect: t1=1, t2=0 →
          // out_x = 1 AND 0 = 0, out_y = 1 OR 0 = 1.
          //
          // I/O latency = 1 cycle (matches BEFORE).
          const clk = h.clock(80, 540, 'CLK');
          const aIn = h.input(80, 120, 'a');  aIn.fixedValue = 1;
          const bIn = h.input(80, 200, 'b');  bIn.fixedValue = 0;
          const cIn = h.input(80, 300, 'c');  cIn.fixedValue = 1;
          const dIn = h.input(80, 380, 'd');  dIn.fixedValue = 1;

          // 4 FFs at inputs (the retimed FFs)
          const ffA = h.ffD(220, 120, 'FF_a');
          const ffB = h.ffD(220, 200, 'FF_b');
          const ffC = h.ffD(220, 300, 'FF_c');
          const ffD = h.ffD(220, 380, 'FF_d');

          // Stage 1: 2 XORs (combinational from FFs.Q)
          const t1 = h.gate('XOR', 400, 160);
          const t2 = h.gate('XOR', 400, 340);

          // Stage 2: AND + OR (combinational)
          const t3 = h.gate('AND', 580, 220);
          const t4 = h.gate('OR',  580, 320);

          // Direct outputs (no FFs)
          const outX = h.output(760, 220, 'out_x');
          const outY = h.output(760, 320, 'out_y');

          return {
            nodes: [
              clk, aIn, bIn, cIn, dIn,
              ffA, ffB, ffC, ffD,
              t1, t2, t3, t4,
              outX, outY,
            ],
            wires: [
              // Inputs → FFs
              h.wire(aIn.id, ffA.id, 0),
              h.wire(clk.id, ffA.id, 1, 0, { isClockWire: true }),
              h.wire(bIn.id, ffB.id, 0),
              h.wire(clk.id, ffB.id, 1, 0, { isClockWire: true }),
              h.wire(cIn.id, ffC.id, 0),
              h.wire(clk.id, ffC.id, 1, 0, { isClockWire: true }),
              h.wire(dIn.id, ffD.id, 0),
              h.wire(clk.id, ffD.id, 1, 0, { isClockWire: true }),
              // FFs.Q → XORs (stage 1)
              h.wire(ffA.id, t1.id, 0),
              h.wire(ffB.id, t1.id, 1),
              h.wire(ffC.id, t2.id, 0),
              h.wire(ffD.id, t2.id, 1),
              // t1, t2 → t3 (AND)
              h.wire(t1.id, t3.id, 0),
              h.wire(t2.id, t3.id, 1),
              // t1, t2 → t4 (OR)
              h.wire(t1.id, t4.id, 0),
              h.wire(t2.id, t4.id, 1),
              // Direct to outputs (no FFs!)
              h.wire(t3.id, outX.id, 0),
              h.wire(t4.id, outY.id, 0),
            ],
          };
        }),
        answerSchematic: `
<svg viewBox="0 0 1080 500" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Function verification — BEFORE and AFTER produce same outputs for the same inputs.">

  <text x="540" y="38" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="24">
    Function Verification — BEFORE vs AFTER
  </text>
  <text x="540" y="64" text-anchor="middle" fill="#80f0a0" font-size="18" font-style="italic">
    ✓ אותה הפונקציה. רק T_min שונה.
  </text>

  <!-- Table headers -->
  <line x1="60" y1="100" x2="1020" y2="100" stroke="#3a4a5a" stroke-width="1.4"/>

  <g font-size="18" font-weight="bold" fill="#a0a0c0">
    <text x="100" y="125">(a, b, c, d)</text>
    <text x="260" y="125">t1 = a⊕b</text>
    <text x="400" y="125">t2 = c⊕d</text>
    <text x="540" y="125">out_x = t1·t2</text>
    <text x="720" y="125">out_y = t1+t2</text>
    <text x="900" y="125">BEFORE ≡ AFTER?</text>
  </g>
  <line x1="60" y1="138" x2="1020" y2="138" stroke="#3a4a5a" stroke-width="1.4"/>

  ${(() => {
    const tests = [
      [0, 0, 0, 0],
      [1, 0, 1, 0],
      [1, 1, 1, 1],
      [0, 1, 1, 0],
    ];
    return tests.map((t, i) => {
      const [a, b, c, d] = t;
      const t1 = a ^ b;
      const t2 = c ^ d;
      const out_x = t1 & t2;
      const out_y = t1 | t2;
      const y = 165 + i * 40;
      return `
        <text x="100" y="${y}" fill="#cca040" font-size="18" font-weight="bold">(${a},${b},${c},${d})</text>
        <text x="280" y="${y}" text-anchor="middle" fill="#80f0a0" font-size="18">${t1}</text>
        <text x="420" y="${y}" text-anchor="middle" fill="#80f0a0" font-size="18">${t2}</text>
        <text x="580" y="${y}" text-anchor="middle" fill="#ff9933" font-size="18" font-weight="bold">${out_x}</text>
        <text x="760" y="${y}" text-anchor="middle" fill="#ff9933" font-size="18" font-weight="bold">${out_y}</text>
        <text x="940" y="${y}" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">✓</text>
      `;
    }).join('');
  })()}

  <!-- Summary -->
  <rect x="60" y="350" width="960" height="120" rx="10" fill="rgba(128,240,160,0.06)" stroke="#80f0a0" stroke-width="1.8"/>
  <text x="540" y="382" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="20">
    ✓ Function preserved across all 4 test vectors
  </text>
  <text x="540" y="410" text-anchor="middle" fill="#c8b090" font-size="18">
    T_min: 310 → 250 ps   ·   f_max: 3.23 → 4 GHz (+24%)
  </text>
  <text x="540" y="438" text-anchor="middle" fill="#c8b090" font-size="18" font-style="italic">
    מחיר: FF count 2 → 4 (fanout expansion at inputs)
  </text>
  <text x="540" y="462" text-anchor="middle" fill="#cc99ff" font-size="18" font-weight="bold">
    זהו Retiming אופטימלי לטופולוגיה הזו. אין דרך לקבל יותר טוב בלי לפצל gates.
  </text>
</svg>`,
      },
    ],
    source: 'Retiming (Leiserson-Saxe)',
    tags: ['retiming', 'cycle-invariant', 'leiserson-saxe', 'fmax', 'timing'],
    circuitRevealsAnswer: true,
  },

  // ─────────────────────────────────────────────────────────────
  // #5009 — Reset Design
  //   Sync vs Async, recovery-time / metastability on deassertion,
  //   reset synchronizer, deassertion ordering across a reset tree,
  //   and a failure trace where an unsynchronized async deassertion
  //   leaves FFs in inconsistent post-reset states.
  //
  //   Uses the new optional async-reset pin on D-FFs (engine extension
  //   committed separately). The live circuits are 4-FF chains with a
  //   shared reset rail; toggle RST=1 to see all four FFs snap to 0
  //   immediately (async behaviour, observable in the simulator).
  // ─────────────────────────────────────────────────────────────
  {
    id: 'interview-reset-design',
    difficulty: 'hard',
    title: 'Reset Design — async / sync / reset synchronizer',
    intro:
`כל chip מתחיל מ-state ידוע: reset. אבל "reset" הוא לא רכיב בודד — זה **תת-מערכת** עם בחירות עיצוב חשובות:

- **Sync vs Async reset** — מתי כל אחד מתאים?
- **Reset deassertion metastability** — למה שחרור אסינכרוני של reset מסוכן?
- **Reset synchronizer** — async-assert + sync-deassert (הסטנדרט בתעשייה)
- **Reset tree** — איך מבטיחים שכל ה-FFs יוצאים מ-reset יחד?

נתון pipeline בן 4 FFs עם CLK משותף ו-RST משותף (async, active-high). השאלות הבאות בוחנות את כל ההיבטים.`,
    schematic: `
<svg viewBox="0 0 1000 540" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="20" role="img" aria-label="4-FF chain with a shared clock and a shared async reset rail running below.">

  <text x="500" y="48" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="32">
    Pipeline 4-FF עם reset rail משותף
  </text>
  <text x="500" y="84" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">
    RST async, active-high · כל ה-FFs מאופסים בו-זמנית
  </text>

  <!-- Input -->
  <circle cx="80" cy="220" r="26" fill="#0a1825" stroke="#cca040" stroke-width="2.4"/>
  <text x="80" y="228" text-anchor="middle" fill="#cca040" font-size="18" font-weight="bold">in</text>

  <!-- 4 FFs in a row -->
  ${[1, 2, 3, 4].map(i => {
    const x = 180 + (i - 1) * 180;
    return `
      <rect x="${x}" y="190" width="110" height="60" rx="8" fill="#1a1428" stroke="#cc66ff" stroke-width="3"/>
      <text x="${x + 55}" y="228" text-anchor="middle" fill="#cc99ff" font-size="24" font-weight="bold">FF${i}</text>
      <polyline points="${x},212 ${x + 14},220 ${x},228" fill="none" stroke="#cca040" stroke-width="2.4"/>
    `;
  }).join('')}

  <!-- Wires between FFs and from input -->
  <g stroke="#a0a0c0" stroke-width="2.4" fill="none">
    <line x1="106" y1="220" x2="180" y2="220"/>
    <line x1="290" y1="220" x2="360" y2="220"/>
    <line x1="470" y1="220" x2="540" y2="220"/>
    <line x1="650" y1="220" x2="720" y2="220"/>
    <line x1="830" y1="220" x2="900" y2="220"/>
  </g>

  <!-- Output -->
  <circle cx="920" cy="220" r="26" fill="#0a1825" stroke="#ff9933" stroke-width="2.4"/>
  <text x="920" y="228" text-anchor="middle" fill="#ff9933" font-size="18" font-weight="bold">out</text>

  <!-- ════════ CLK rail (gold, broadcast) ════════ -->
  <line x1="80" y1="320" x2="920" y2="320" stroke="#cca040" stroke-width="3.5"/>
  <text x="40" y="328" fill="#cca040" font-size="20" font-weight="bold">CLK</text>
  <g stroke="#cca040" stroke-width="2.4" fill="none">
    <line x1="235" y1="320" x2="235" y2="250"/>
    <line x1="415" y1="320" x2="415" y2="250"/>
    <line x1="595" y1="320" x2="595" y2="250"/>
    <line x1="775" y1="320" x2="775" y2="250"/>
  </g>

  <!-- ════════ RST rail (red dashed, broadcast) ════════ -->
  <line x1="80" y1="420" x2="920" y2="420" stroke="#ff6060" stroke-width="3.5" stroke-dasharray="9,5"/>
  <text x="40" y="428" fill="#ff6060" font-size="20" font-weight="bold">RST</text>
  <text x="940" y="428" fill="#ff8080" font-size="16" font-style="italic">async</text>
  <g stroke="#ff6060" stroke-width="2.4" fill="none">
    <line x1="265" y1="420" x2="265" y2="250"/>
    <line x1="445" y1="420" x2="445" y2="250"/>
    <line x1="625" y1="420" x2="625" y2="250"/>
    <line x1="805" y1="420" x2="805" y2="250"/>
  </g>
  ${[265, 445, 625, 805].map(x => `
    <polygon points="${x - 6},250 ${x + 6},250 ${x},262" fill="#ff6060"/>
  `).join('')}

  <!-- Bottom summary -->
  <rect x="80" y="470" width="840" height="56" rx="10" fill="rgba(255,96,96,0.05)" stroke="#ff6060" stroke-width="1.8"/>
  <text x="500" y="504" text-anchor="middle" fill="#ff8080" font-size="18" font-weight="bold">
    RST=1 → כל ה-FFs מאופסים מיידית (async, ללא תלות ב-CLK)
  </text>
</svg>`,
    parts: [
      // ─────────────────────────────────────────────────────────
      // Part א — Sync vs Async reset
      // ─────────────────────────────────────────────────────────
      {
        label: 'א',
        question: 'הסבר את ההבדל בין **Sync reset** ל-**Async reset** ב-FF: איך כל אחד נראה במעגל, מתי הוא נכנס לתוקף, ומה ה-trade-off ביניהם. תן דוגמה למתי כל אחד מתאים יותר.',
        hints: [
          'Async reset: כשפין ה-reset של ה-FF פעיל → Q נקבע מיד ל-0 (או 1), **ללא תלות ב-CLK**. דורש "fork" נפרד ב-FF cell.',
          'Sync reset: ה-reset נכנס דרך ה-D (כ-mux או AND) — כלומר Q מתאפס רק על rising edge של CLK הבא.',
          'Async: יתרון = startup ללא CLK. חיסרון = recovery-time violations בעת deassert.',
          'Sync: יתרון = clean deassertion. חיסרון = דורש CLK שעובד כדי שה-reset יתפוס.',
          'בעולם האמיתי: Async הוא הסטנדרט ב-ASIC; Sync ב-FPGA (כי block FFs יש להם רק sync reset).',
        ],
        answer:
`### Async Reset

\`\`\`
        ┌──────────┐
  D ────┤D       Q ├──── (Q goes 0 immediately when RST=1)
        │          │
CLK ────┤▷         │
        │          │
RST ────┤RST       │   ← extra "reset" input, level-sensitive
        └──────────┘
\`\`\`

| תכונה | Async |
|---|---|
| הכנסה לתוקף | מיידית, ללא תלות ב-CLK |
| Recovery time | חייב להתקיים — \`t_rec\` לפני edge הבא של CLK |
| כשלון בdeassert | מטא-יציבות אם RST משחרר בתוך setup window |
| מתאים ל | startup, watchdog, power-on reset (POR) |

### Sync Reset

\`\`\`
        ┌──────────┐
        │  ┌────┐  │
  D ────┼─┤MUX │  │
RST ────┤  │1=0 │  │     ← reset gated into D
        │  └────┘  │
        │     │    │
        ├─────┤D Q├──── Q updates only on CLK edge
CLK ────┤▷         │
        └──────────┘
\`\`\`

| תכונה | Sync |
|---|---|
| הכנסה לתוקף | רק על rising edge של CLK הבא |
| Recovery time | לא רלוונטי — ה-reset הוא נתון רגיל |
| כשלון בdeassert | אף-פעם (clean) |
| חיסרון | דורש CLK פעיל — לא מתאים ל-POR |
| מתאים ל | FPGA, deterministic test flows |

### Trade-off ניהולי

| תרחיש | בחירה |
|---|---|
| Power-on (אין CLK יציב) | **Async** — היחיד שעובד |
| Glitch resistance | **Sync** — לא רגיש ל-glitches על RST line |
| Skew על RST tree | **Async** סובל מ-deassertion ordering, **Sync** לא |
| ASIC standard cell | בדרך כלל **Async** ב-active-low (\`nRST\`) |
| FPGA block FF | בדרך כלל **Sync** — חוסך פין |

### בקנבס

ה-engine תומך בשניהם דרך \`h.ffD(x, y, label, { reset: 'async' | 'sync' })\`. ה-circuit הנוכחי משתמש ב-\`async\`. הצב \`RST=1\` ופעם ב-CLK — תראה את כל ה-FFs מתאפסים מיד; הצב \`RST=0\` ופעם → השרשרת מתחילה להעביר את \`in=1\` הלאה.`,
        interviewerMindset:
`**שאלת פתיחה.** המראיין מחפש:
1. **שאתה מצייר את שני המבנים** — לא רק "async הוא ללא clock, sync הוא עם clock". תרשים פנימי של ה-FF.
2. **שאתה מזכיר recovery time** — async דורש זמן בין deassertion ל-clock edge. לא רק "מטא-יציבות" באוויר.
3. **שאתה מבדיל לפי טכנולוגיה** — ASIC נוטה ל-async, FPGA ל-sync. סטודנט שאומר "תמיד X" מאבד נקודות.

**שאלת המשך**: "מה זה nRST?" → reset פעיל-נמוך. רוב ה-cells בתעשייה הם active-low כי מציאות של "all zeros" (חוסר חשמל) מובילה ל-reset ברירת מחדל.

**שאלת bonus**: "מתי אסור להשתמש ב-async?" → במעגל שבו ה-reset מגיע מ-domain אחר ולא דרך synchronizer (סעיף ג'). דה-assertion שלו יחצה את חלון ה-setup של clock המקומי → metastability.`,
        expectedAnswers: [
          'async', 'sync', 'אסינכרוני', 'סינכרוני',
          'recovery time', 'metastability', 'deassertion',
          'CLK', 'power-on', 'POR',
          'FPGA', 'ASIC',
          'active-low', 'nRST',
        ],
        circuit: () => build(() => {
          // 4-FF chain with shared async reset.
          // Defaults: in=1, RST=0 → values shift through.
          //           Toggle RST=1 to snap all FFs to 0.
          const clk = h.clock(80, 460, 'CLK');
          const inIn = h.input(80, 120, 'in');  inIn.fixedValue = 1;
          const rstIn = h.input(80, 600, 'RST'); rstIn.fixedValue = 0;

          const ff1 = h.ffD(220, 120, 'FF1', { reset: 'async' });
          const ff2 = h.ffD(400, 120, 'FF2', { reset: 'async' });
          const ff3 = h.ffD(580, 120, 'FF3', { reset: 'async' });
          const ff4 = h.ffD(760, 120, 'FF4', { reset: 'async' });

          const q1 = h.output(220, 40, 'Q1');
          const q2 = h.output(400, 40, 'Q2');
          const q3 = h.output(580, 40, 'Q3');
          const q4 = h.output(760, 40, 'Q4');
          const outOut = h.output(920, 120, 'out');

          return {
            nodes: [clk, inIn, rstIn, ff1, ff2, ff3, ff4, q1, q2, q3, q4, outOut],
            wires: [
              h.wire(inIn.id, ff1.id, 0),
              h.wire(ff1.id, ff2.id, 0),
              h.wire(ff2.id, ff3.id, 0),
              h.wire(ff3.id, ff4.id, 0),
              h.wire(clk.id, ff1.id, 1, 0, { isClockWire: true }),
              h.wire(clk.id, ff2.id, 1, 0, { isClockWire: true }),
              h.wire(clk.id, ff3.id, 1, 0, { isClockWire: true }),
              h.wire(clk.id, ff4.id, 1, 0, { isClockWire: true }),
              h.wire(rstIn.id, ff1.id, 2, 0, { isResetWire: true }),
              h.wire(rstIn.id, ff2.id, 2, 0, { isResetWire: true }),
              h.wire(rstIn.id, ff3.id, 2, 0, { isResetWire: true }),
              h.wire(rstIn.id, ff4.id, 2, 0, { isResetWire: true }),
              h.wire(ff1.id, q1.id, 0),
              h.wire(ff2.id, q2.id, 0),
              h.wire(ff3.id, q3.id, 0),
              h.wire(ff4.id, q4.id, 0),
              h.wire(ff4.id, outOut.id, 0),
            ],
          };
        }),
        answerSchematic: `
<svg viewBox="0 0 1000 600" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="20" role="img" aria-label="Side-by-side comparison: async vs sync reset internal structure.">

  <text x="500" y="44" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    Async vs Sync Reset — מבנה פנימי
  </text>

  <!-- ════════ Async (LEFT) ════════ -->
  <rect x="40" y="90" width="440" height="460" rx="14" fill="rgba(255,96,96,0.05)" stroke="rgba(255,96,96,0.55)" stroke-width="2.4"/>
  <text x="260" y="128" text-anchor="middle" fill="#ff8080" font-weight="bold" font-size="24">Async Reset</text>

  <!-- FF body -->
  <rect x="140" y="200" width="240" height="180" rx="10" fill="#0a1825" stroke="#cc66ff" stroke-width="2.6"/>
  <text x="260" y="290" text-anchor="middle" fill="#cc99ff" font-size="28" font-weight="bold">D-FF</text>

  <!-- Pins -->
  <line x1="80" y1="240" x2="140" y2="240" stroke="#cca040" stroke-width="2.4"/>
  <text x="120" y="232" text-anchor="end" fill="#cca040" font-size="18" font-weight="bold">D</text>

  <line x1="80" y1="300" x2="140" y2="300" stroke="#cca040" stroke-width="2.4"/>
  <polyline points="140,290 152,300 140,310" fill="none" stroke="#cca040" stroke-width="2.4"/>
  <text x="120" y="296" text-anchor="end" fill="#cca040" font-size="18" font-weight="bold">CLK</text>

  <line x1="80" y1="360" x2="140" y2="360" stroke="#ff6060" stroke-width="3"/>
  <text x="120" y="356" text-anchor="end" fill="#ff6060" font-size="18" font-weight="bold">RST</text>
  <polygon points="135,354 145,360 135,366" fill="#ff6060"/>

  <line x1="380" y1="290" x2="440" y2="290" stroke="#ff9933" stroke-width="2.4"/>
  <text x="446" y="296" fill="#ff9933" font-size="18" font-weight="bold">Q</text>

  <!-- Internal "async OR" annotation -->
  <text x="260" y="328" text-anchor="middle" fill="#a0c0d0" font-size="15" font-style="italic">RST bypasses CLK</text>
  <text x="260" y="350" text-anchor="middle" fill="#a0c0d0" font-size="15" font-style="italic">→ Q forced to 0 immediately</text>

  <text x="260" y="430" text-anchor="middle" fill="#ff8080" font-size="17" font-weight="bold">RST asserts → Q=0 (no CLK needed)</text>
  <text x="260" y="460" text-anchor="middle" fill="#c8b090" font-size="15">⚠ recovery time on deassert</text>
  <text x="260" y="492" text-anchor="middle" fill="#c8b090" font-size="15">ASIC standard, POR</text>

  <!-- ════════ Sync (RIGHT) ════════ -->
  <rect x="520" y="90" width="440" height="460" rx="14" fill="rgba(128,240,160,0.05)" stroke="rgba(128,240,160,0.55)" stroke-width="2.4"/>
  <text x="740" y="128" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="24">Sync Reset</text>

  <!-- MUX -->
  <path d="M 580 230 L 640 220 L 640 280 L 580 270 Z" fill="#1a2230" stroke="#80c8ff" stroke-width="2.4"/>
  <text x="610" y="255" text-anchor="middle" fill="#80c8ff" font-size="16" font-weight="bold">MUX</text>

  <line x1="540" y1="240" x2="580" y2="240" stroke="#cca040" stroke-width="2.4"/>
  <text x="535" y="244" text-anchor="end" fill="#cca040" font-size="18" font-weight="bold">D</text>

  <line x1="540" y1="260" x2="580" y2="260" stroke="#80f0a0" stroke-width="2.4"/>
  <text x="535" y="264" text-anchor="end" fill="#80f0a0" font-size="14">0</text>

  <line x1="610" y1="300" x2="610" y2="280" stroke="#ff6060" stroke-width="2.4"/>
  <text x="610" y="318" text-anchor="middle" fill="#ff6060" font-size="14">RST sel</text>

  <!-- FF body -->
  <rect x="680" y="220" width="180" height="160" rx="10" fill="#0a1825" stroke="#cc66ff" stroke-width="2.6"/>
  <text x="770" y="305" text-anchor="middle" fill="#cc99ff" font-size="26" font-weight="bold">D-FF</text>

  <line x1="640" y1="250" x2="680" y2="250" stroke="#a0a0c0" stroke-width="2.4"/>

  <line x1="600" y1="360" x2="680" y2="360" stroke="#cca040" stroke-width="2.4"/>
  <polyline points="680,350 692,360 680,370" fill="none" stroke="#cca040" stroke-width="2.4"/>
  <text x="580" y="356" text-anchor="end" fill="#cca040" font-size="18" font-weight="bold">CLK</text>

  <line x1="860" y1="300" x2="920" y2="300" stroke="#ff9933" stroke-width="2.4"/>
  <text x="926" y="306" fill="#ff9933" font-size="18" font-weight="bold">Q</text>

  <!-- Internal annotation -->
  <text x="740" y="425" text-anchor="middle" fill="#80f0a0" font-size="17" font-weight="bold">RST gated through MUX → captures on CLK edge</text>
  <text x="740" y="460" text-anchor="middle" fill="#c8b090" font-size="15">✓ no recovery issue</text>
  <text x="740" y="492" text-anchor="middle" fill="#c8b090" font-size="15">FPGA standard, deterministic</text>
</svg>`,
      },

      // ─────────────────────────────────────────────────────────
      // Part ב — Recovery time / async deassertion danger
      // ─────────────────────────────────────────────────────────
      {
        label: 'ב',
        question: 'נתון FF עם **async reset** ו-CLK פעיל. כש-RST משחרר (\\\`1 → 0\\\`) **בתוך** חלון ה-setup של ה-CLK הבא — מה הסיכון? איך זה דומה ל-metastability מסעיף #5006? איך מודדים את ה-margin הנדרש?',
        hints: [
          'הפרמטר נקרא **\\\`t_recovery\\\`** — הזמן המינימלי בין deassertion של RST לבין rising edge של CLK.',
          'גם **\\\`t_removal\\\`** קיים — הזמן המינימלי בין rising edge ל-deassertion (mirror של t_hold).',
          'אם RST יוצא מ-async בתוך setup window → ה-FF מנסה לעבור בו-זמנית מ-state=0 (כי RST פעיל) ל-state=D (כי RST שוחרר). ה-internal latch גורם ל-**metastability**.',
          'הפתרון: לוודא ש-RST משחרר רחוק מ-CLK edge. בעולם אמיתי — לסנכרן את שחרור ה-RST (סעיף ג\').',
          'הקשר ל-#5006: שניהם metastability — אבל #5006 על data, #5009 על reset signal.',
        ],
        answer:
`## הסכנה: Recovery Time Violation

### הפרמטר \`t_recovery\` (ולפעמים \`t_removal\`)

| פרמטר | מה זה | אילוץ |
|---|---|---|
| **\`t_recovery\`** | זמן מינימלי בין \`RST: 1→0\` ל-CLK rising edge | RST_dessert ≤ CLK_edge − t_recovery |
| **\`t_removal\`** | זמן מינימלי בין CLK rising edge ל-\`RST: 1→0\` | RST_deassert ≥ CLK_edge + t_removal |

יחד הם מגדירים **חלון אסור** סביב ה-CLK edge:

\`\`\`
         t_removal
              ←─────┤
       CLK_edge ────┼──→  t_recovery
                   ↑
              forbidden window
\`\`\`

### למה בדיוק metastable?

ב-FF פנימי, ה-latch הראשון "מקפיא" על RST=1. כשRST=0 בדיוק כש-CLK עולה:
- ה-latch מנסה לקבל D (כי RST שחרר)
- אבל ה-latch *גם* מתאושש מ-state=0 (RST פעיל זה עתה)
- שני "כיוונים" של כוח על ה-latch → metastable Q.

זה בדיוק כמו metastability על data path (#5006), אבל הקלט הוא reset במקום data. הזמן \`τ\` (settling time) זהה.

### דוגמה מספרית

נניח: \`t_recovery = 100 ps\`, \`t_removal = 50 ps\`, \`T_clk = 1 ns\`.

| תרחיש | האם בטוח? |
|---|:---:|
| RST deassert 200 ps לפני CLK edge | ✓ (>100 ps recovery) |
| RST deassert 80 ps לפני CLK edge | ✗ recovery violation |
| RST deassert 30 ps אחרי CLK edge | ✗ removal violation |
| RST deassert 200 ps אחרי CLK edge | ✓ |

### MTBF — מקביל ל-#5006

\`\`\`
MTBF_reset = exp(t_avail / τ) / (T_w · f_clk · f_rst)
\`\`\`

ה-\`t_avail\` הוא הזמן בין הקצה שבו ה-metastability מתחילה לבין ה-קצה הבא. כל cycle נוסף שמוסיף לסטגלות ⇒ exponent יותר גדול.

### הפתרון

לא לתת ל-RST לעבור בלי סנכרון. הסטנדרט בתעשייה: **reset synchronizer** — ראה סעיף ג'.

### בקנבס

ה-engine **לא מודל** את ה-recovery violation (זה תהליך הסתברותי). אבל ה-circuit הנוכחי משתמש ב-async reset; אם תחבר RST למקור אסינכרוני (לא ל-clock domain שלך), הסכנה הזו תופיע פיזית.`,
        interviewerMindset:
`**שאלת recovery — קלאסית של ASIC.** המראיין מחפש:
1. **שאתה זוכר את השם** — t_recovery (לא רק "setup time עבור reset").
2. **שאתה מבין שזה metastability** — לא רק "violation" כללי. הקשר ל-#5006.
3. **שאתה מציין את t_removal** — לא רק recovery. שניהם חלק מ-window אסור.
4. **שאתה רומז על reset synchronizer** — ברמז, לא בפירוט (סעיף ג' יחשוף).

**שאלת המשך**: "האם ל-sync reset יש t_recovery?" → לא! sync reset נכנס דרך D, אז הוא רגיש ל-setup/hold רגיל. אין recovery נפרד.

**שאלת bonus**: "Process variation משפיע על t_recovery?" → כן. ב-slow corner ה-t_recovery גדל; ב-fast corner קטן. STA מסחרי בודק את כל הקצוות.

**מלכודת**: סטודנט שמציע "להגדיל את ה-clock period" → לא עוזר. t_recovery הוא יחסית לקצה ה-clock, לא לcycle כולו.`,
        expectedAnswers: [
          't_recovery', 'recovery time', 'זמן recovery',
          't_removal', 'removal time',
          'metastability', 'מטא-יציבות',
          'forbidden window', 'window',
          'MTBF', 'τ',
          'reset synchronizer',
        ],
        answerSchematic: `
<svg viewBox="0 0 1000 480" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Timing diagram showing recovery time window around CLK edge.">

  <text x="500" y="44" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    Recovery / Removal — חלון אסור סביב CLK edge
  </text>

  <!-- CLK waveform -->
  <text x="60" y="150" fill="#cca040" font-size="20" font-weight="bold">CLK</text>
  <g stroke="#cca040" stroke-width="3" fill="none">
    <line x1="140" y1="170" x2="350" y2="170"/>
    <line x1="350" y1="170" x2="350" y2="120"/>
    <line x1="350" y1="120" x2="900" y2="120"/>
  </g>
  <text x="350" y="108" text-anchor="middle" fill="#cca040" font-size="16" font-weight="bold">↑ CLK edge</text>

  <!-- RST waveform: three scenarios labeled with annotations -->
  <text x="60" y="260" fill="#ff6060" font-size="20" font-weight="bold">RST</text>

  <!-- Forbidden window highlight -->
  <rect x="280" y="200" width="140" height="100" rx="6" fill="rgba(255,96,96,0.15)" stroke="#ff6060" stroke-width="2" stroke-dasharray="4,3"/>
  <text x="350" y="332" text-anchor="middle" fill="#ff8080" font-size="16" font-weight="bold">forbidden window</text>
  <text x="350" y="356" text-anchor="middle" fill="#a0a0c0" font-size="14" font-style="italic">t_removal ←──→ t_recovery</text>

  <!-- Sample RST waveform (high then low) -->
  <g stroke="#ff6060" stroke-width="3" fill="none">
    <line x1="140" y1="200" x2="220" y2="200"/>
    <line x1="220" y1="200" x2="220" y2="280"/>
    <line x1="220" y1="280" x2="900" y2="280"/>
  </g>
  <text x="220" y="190" text-anchor="middle" fill="#80f0a0" font-size="15" font-weight="bold">✓ safe deassertion</text>
  <text x="220" y="416" text-anchor="middle" fill="#a0a0c0" font-size="14" font-style="italic">(far before CLK edge)</text>

  <!-- Dotted "bad" deassertion inside window -->
  <g stroke="#ff8080" stroke-width="2" fill="none" stroke-dasharray="4,3">
    <line x1="320" y1="200" x2="320" y2="280"/>
  </g>
  <text x="320" y="416" text-anchor="middle" fill="#ff8080" font-size="14" font-weight="bold">✗ inside window → metastable</text>

  <!-- Bottom: MTBF reminder -->
  <rect x="60" y="430" width="880" height="36" rx="8" fill="rgba(204,102,255,0.06)" stroke="#cc66ff" stroke-width="1.8"/>
  <text x="500" y="454" text-anchor="middle" fill="#cc99ff" font-size="16" font-weight="bold">
    MTBF_reset = exp(t_avail / τ) / (T_w · f_clk · f_rst)  ·  זהה למבנה #5006
  </text>
</svg>`,
        circuit: () => build(() => {
          // Same 4-FF chain — engine doesn't simulate recovery violations
          // (probabilistic), so we reuse the part-א circuit.
          const clk = h.clock(80, 460, 'CLK');
          const inIn = h.input(80, 120, 'in');  inIn.fixedValue = 1;
          const rstIn = h.input(80, 600, 'RST'); rstIn.fixedValue = 0;
          const ff1 = h.ffD(220, 120, 'FF1', { reset: 'async' });
          const ff2 = h.ffD(400, 120, 'FF2', { reset: 'async' });
          const ff3 = h.ffD(580, 120, 'FF3', { reset: 'async' });
          const ff4 = h.ffD(760, 120, 'FF4', { reset: 'async' });
          const outOut = h.output(920, 120, 'out');
          return {
            nodes: [clk, inIn, rstIn, ff1, ff2, ff3, ff4, outOut],
            wires: [
              h.wire(inIn.id, ff1.id, 0),
              h.wire(ff1.id, ff2.id, 0),
              h.wire(ff2.id, ff3.id, 0),
              h.wire(ff3.id, ff4.id, 0),
              h.wire(clk.id, ff1.id, 1, 0, { isClockWire: true }),
              h.wire(clk.id, ff2.id, 1, 0, { isClockWire: true }),
              h.wire(clk.id, ff3.id, 1, 0, { isClockWire: true }),
              h.wire(clk.id, ff4.id, 1, 0, { isClockWire: true }),
              h.wire(rstIn.id, ff1.id, 2, 0, { isResetWire: true }),
              h.wire(rstIn.id, ff2.id, 2, 0, { isResetWire: true }),
              h.wire(rstIn.id, ff3.id, 2, 0, { isResetWire: true }),
              h.wire(rstIn.id, ff4.id, 2, 0, { isResetWire: true }),
              h.wire(ff4.id, outOut.id, 0),
            ],
          };
        }),
      },

      // ─────────────────────────────────────────────────────────
      // Part ג — Reset synchronizer (async assert + sync deassert)
      // ─────────────────────────────────────────────────────────
      {
        label: 'ג',
        question: 'תכנן **Reset Synchronizer**: מעגל שמקבל \\\`nRST_in\\\` אסינכרוני וחיצוני, ומפיק \\\`nRST_out\\\` ש-(א) פעיל מיד בעת assertion, ו-(ב) משחרר רק על rising edge של CLK המקומי. הסבר את המבנה ולמה כל רכיב חיוני.',
        hints: [
          'הרעיון: רוצים assertion מהיר (async) אבל deassertion מסונכרן (sync). שילוב של שניהם.',
          'בנייה: 2 FFs בטור, ה-D של הראשון קבוע ב-\\\`1\\\` (\\\`VCC\\\`).',
          'שני ה-FFs מקבלים \\\`nRST_in\\\` כ-async reset (active-low) → כש-\\\`nRST_in = 0\\\` שניהם מתאפסים מיד.',
          'כש-\\\`nRST_in = 1\\\` → ה-FF הראשון דוגם \\\`D=1\\\` בקצה הבא, ה-FF השני דוגם \\\`Q1=1\\\` עוד cycle אחר כך.',
          'ה-output \\\`nRST_out = FF2.Q\\\`. הוא **0 מיד** (כש-async asserts) ו-**1 אחרי 2 cycles** (sync deassertion).',
          'למה שני FFs ולא אחד? לבטל metastability של ה-FF הראשון — בדיוק כמו synchronizer רגיל ב-#5006.',
        ],
        answer:
`## הפתרון הסטנדרטי: 2-FF Reset Synchronizer

\`\`\`
  VCC (=1) ──── D ┌──────┐         D ┌──────┐
                  │ FF1  │  Q1 ────  │ FF2  │ ──── nRST_out
                  │      │           │      │
       CLK ─────▷│      │       ──▷│      │
                  └──┬───┘           └──┬───┘
                     │ async-rst         │ async-rst (both active-low)
                     └───────────────────┘
                              │
                          nRST_in (external, asynchronous)
\`\`\`

### איך זה עובד

**Assertion (nRST_in: 1 → 0)**: שני ה-FFs מאופסים **מיד** (async). nRST_out = 0 בו-זמנית.

**Deassertion (nRST_in: 0 → 1)**:
- FF1 דוגם D=1 בקצה הבא של CLK → Q1=1 אחרי cycle אחד.
- FF2 דוגם Q1=1 בקצה הבא → nRST_out=1 אחרי שני cycles סה"כ.
- בכל זמן ביניים, אם FF1 נכנס ל-metastability — FF2 דוגם אחרי cycle נוסף, מספיק זמן ל-settling.

### למה זה עובד

| בעיה | פתרון |
|---|---|
| Async assert — לא רוצים לחכות ל-CLK | ✓ async-reset על FF1 + FF2 |
| Sync deassert — לא רוצים metastability | ✓ deassertion עובר דרך 2 FFs |
| Metastability על FF1 | ✓ FF2 דוגם cycle אחר → MTBF גבוה |

### למה D=VCC?

מטרת ה-FFs היא **לא לזכור data** אלא רק להעביר את ה-deassertion עם delay. \`D=1\` קבוע אומר: "כש-RST משוחרר, ה-pipeline מתחיל לזרום 1". זה ה-default value של \`nRST_out\` כש-reset לא פעיל.

### Latency

- Assert: **0 cycles** (async).
- Deassert: **2 cycles** מ-\`nRST_in: 0→1\` עד \`nRST_out=1\`.

ב-ASIC זה אמין מאוד; ב-design קריטי משתמשים ב-3 FFs במקום 2 (כמו 3-FF synchronizer ל-data critical).

### בקנבס

הצב \`nRST_in=1\` ב-default (active-low = לא פעיל). פעם CLK 2 פעמים → \`nRST_out=1\`. עכשיו הצב \`nRST_in=0\` → \`nRST_out=0\` מיד (async). הצב חזרה \`nRST_in=1\` ופעם CLK 2 פעמים → \`nRST_out=1\` שוב.`,
        interviewerMindset:
`**שאלת design קלאסית.** המראיין מחפש:
1. **שאתה מצייר את המבנה** — שני FFs בטור, D הראשון = VCC. לא רק "synchronizer" כמילה.
2. **שאתה מסביר D=VCC** — לא ברור לרוב הסטודנטים. ה-FFs כאן הם delay, לא data.
3. **שאתה מציין את 2 ה-cycles latency** — לא רק "מעט". ספציפי.
4. **שאתה מזכיר את הקשר ל-#5006** — אותו מבנה (2-FF synchronizer), שימוש שונה.

**שאלת המשך**: "האם 2 FFs מספיקים תמיד?" → לא ב-design קריטי. ב-process מהיר (5nm) ה-τ קטן יותר → יש שדים שדורשים 3 FFs.

**שאלת bonus**: "מה אם רוצים reset gating?" → להוסיף AND לפני ה-D של FF1 (\`VCC AND test_enable\`). שולט ב-reset בזמן בדיקה.

**שאלת חזית**: "מה ה-recovery time של ה-internal FFs?" → ה-FFs **כן** רגישים ל-recovery; אבל מאחר ו-\`nRST_in\` הוא הקלט שלהם, ההפרה תופיע על FF1 בלבד. FF2 עובד עם signal sync. זהו המסר היסודי.`,
        expectedAnswers: [
          'reset synchronizer', 'סינכרונייזר reset',
          '2 FFs', 'two flip-flops', 'שני FFs',
          'D=VCC', 'D = 1', 'tied high',
          'async assert', 'sync deassert',
          'metastability', 'FF1', 'FF2',
          '2 cycles', 'latency',
        ],
        schematic: `
<svg viewBox="0 0 1000 460" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="20" role="img" aria-label="2-FF reset synchronizer: D tied to VCC, async reset shared, sync deassertion via 2 FFs.">

  <text x="500" y="44" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    Reset Synchronizer — async assert + sync deassert
  </text>

  <!-- VCC tie -->
  <rect x="60" y="170" width="80" height="40" rx="6" fill="#3a3a0a" stroke="#ffe060" stroke-width="2.4"/>
  <text x="100" y="196" text-anchor="middle" fill="#ffe060" font-size="20" font-weight="bold">VCC=1</text>

  <line x1="140" y1="190" x2="240" y2="190" stroke="#ffe060" stroke-width="2.4"/>
  <text x="190" y="180" text-anchor="middle" fill="#ffe060" font-size="14">D tied high</text>

  <!-- FF1 -->
  <rect x="240" y="160" width="130" height="80" rx="8" fill="#1a1428" stroke="#cc66ff" stroke-width="3"/>
  <text x="305" y="210" text-anchor="middle" fill="#cc99ff" font-size="24" font-weight="bold">FF1</text>
  <polyline points="240,180 254,190 240,200" fill="none" stroke="#cca040" stroke-width="2.4"/>

  <!-- FF1 → FF2 -->
  <line x1="370" y1="190" x2="470" y2="190" stroke="#a0a0c0" stroke-width="2.4"/>
  <text x="420" y="180" text-anchor="middle" fill="#a0a0c0" font-size="14">Q1</text>

  <!-- FF2 -->
  <rect x="470" y="160" width="130" height="80" rx="8" fill="#1a1428" stroke="#cc66ff" stroke-width="3"/>
  <text x="535" y="210" text-anchor="middle" fill="#cc99ff" font-size="24" font-weight="bold">FF2</text>
  <polyline points="470,180 484,190 470,200" fill="none" stroke="#cca040" stroke-width="2.4"/>

  <!-- nRST_out -->
  <line x1="600" y1="190" x2="800" y2="190" stroke="#ff9933" stroke-width="2.4"/>
  <circle cx="820" cy="190" r="26" fill="#0a1825" stroke="#ff9933" stroke-width="2.4"/>
  <text x="820" y="198" text-anchor="middle" fill="#ff9933" font-size="16" font-weight="bold">nRST_out</text>

  <!-- CLK rail -->
  <line x1="60" y1="290" x2="640" y2="290" stroke="#cca040" stroke-width="3"/>
  <text x="40" y="296" fill="#cca040" font-size="20" font-weight="bold">CLK</text>
  <line x1="305" y1="290" x2="305" y2="240" stroke="#cca040" stroke-width="2.4"/>
  <line x1="535" y1="290" x2="535" y2="240" stroke="#cca040" stroke-width="2.4"/>

  <!-- nRST_in rail (active-low, dashed red) -->
  <line x1="60" y1="370" x2="640" y2="370" stroke="#ff6060" stroke-width="3" stroke-dasharray="9,5"/>
  <text x="40" y="376" fill="#ff6060" font-size="20" font-weight="bold">nRST_in</text>
  <text x="660" y="376" fill="#ff8080" font-size="15" font-style="italic">(active-low)</text>
  <line x1="305" y1="370" x2="305" y2="240" stroke="#ff6060" stroke-width="2.4"/>
  <line x1="535" y1="370" x2="535" y2="240" stroke="#ff6060" stroke-width="2.4"/>
  <polygon points="299,240 311,240 305,252" fill="#ff6060"/>
  <polygon points="529,240 541,240 535,252" fill="#ff6060"/>

  <!-- Bottom annotation -->
  <rect x="60" y="416" width="880" height="36" rx="8" fill="rgba(128,240,160,0.06)" stroke="#80f0a0" stroke-width="1.8"/>
  <text x="500" y="440" text-anchor="middle" fill="#80f0a0" font-size="16" font-weight="bold">
    Assert: 0 cycles (async) · Deassert: 2 cycles (sync) · D=VCC = "release into 1"
  </text>
</svg>`,
        circuit: () => build(() => {
          // Reset synchronizer scene:
          //   VCC (input fixed=1) → FF_sync1.D, FF_sync2 chained,
          //   both with async active-low reset tied to nRST_in.
          //
          // Default nRST_in = 1 (not asserted). Tick CLK twice → both
          // FFs latch 1 → nRST_out = 1. Set nRST_in = 0 → both FFs
          // reset immediately (async, active-low) → nRST_out = 0.
          const clk = h.clock(80, 380, 'CLK');
          const vcc = h.input(80, 140, 'VCC'); vcc.fixedValue = 1;
          const nrst_in = h.input(80, 500, 'nRST_in'); nrst_in.fixedValue = 1;

          const ff1 = h.ffD(280, 140, 'FF_sync1',
                            { reset: 'async', resetActiveLow: true });
          const ff2 = h.ffD(480, 140, 'FF_sync2',
                            { reset: 'async', resetActiveLow: true });

          const nrst_out = h.output(680, 140, 'nRST_out');

          return {
            nodes: [clk, vcc, nrst_in, ff1, ff2, nrst_out],
            wires: [
              h.wire(vcc.id, ff1.id, 0),
              h.wire(ff1.id, ff2.id, 0),
              h.wire(clk.id, ff1.id, 1, 0, { isClockWire: true }),
              h.wire(clk.id, ff2.id, 1, 0, { isClockWire: true }),
              h.wire(nrst_in.id, ff1.id, 2, 0, { isResetWire: true }),
              h.wire(nrst_in.id, ff2.id, 2, 0, { isResetWire: true }),
              h.wire(ff2.id, nrst_out.id, 0),
            ],
          };
        }),
        answerSchematic: `
<svg viewBox="0 0 1000 560" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Reset synchronizer timing: instant assertion, two-cycle synchronized deassertion.">

  <text x="500" y="44" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    Reset Synchronizer — timing
  </text>

  <!-- 7 cycles -->
  ${Array.from({length: 7}, (_, i) => {
    const x = 140 + i * 110;
    return `
      <line x1="${x}" y1="100" x2="${x}" y2="500" stroke="#2a3a4a" stroke-width="1"/>
      <text x="${x + 55}" y="120" text-anchor="middle" fill="#7a8a9a" font-size="14">${i + 1}</text>
    `;
  }).join('')}
  <line x1="140" y1="128" x2="800" y2="128" stroke="#3a4a5a" stroke-width="1.4"/>

  <!-- Rows -->
  ${(() => {
    const X = c => 140 + (c - 1) * 110;
    // nRST_in starts high, asserts low at cycle 2, deasserts high at cycle 4.
    // FF1.Q resets to 0 at cycle 2, returns to 1 at cycle 5 (one CLK after deassert).
    // FF2.Q (= nRST_out) resets to 0 at cycle 2, returns to 1 at cycle 6.
    const rows = [
      {
        label: 'nRST_in',
        y: 160, color: '#ff6060',
        // (cycle, level): 1=1, transitions
        wave: [[1, 'hi'], [2, 'lo-edge'], [4, 'hi-edge']],
      },
      {
        label: 'FF1.Q',
        y: 250, color: '#cc99ff',
        wave: [[1, 'hi'], [2, 'lo-edge'], [5, 'hi-edge']],
      },
      {
        label: 'FF2.Q = nRST_out',
        y: 340, color: '#ff9933',
        wave: [[1, 'hi'], [2, 'lo-edge'], [6, 'hi-edge']],
      },
    ];
    return rows.map(r => {
      const yTop = r.y;
      const yBot = r.y + 50;
      const yMid = (yTop + yBot) / 2;
      const segs = [];
      let prevX = 124;
      let prevY = yTop;   // start high
      for (const [c, kind] of r.wave) {
        const ex = X(c);
        if (kind === 'hi') {
          // initial level — no edge, just continue
          continue;
        }
        // edge
        segs.push(`<line x1="${prevX}" y1="${prevY}" x2="${ex}" y2="${prevY}" stroke="${r.color}" stroke-width="3"/>`);
        const newY = kind.startsWith('lo') ? yBot : yTop;
        segs.push(`<line x1="${ex}" y1="${prevY}" x2="${ex}" y2="${newY}" stroke="${r.color}" stroke-width="3"/>`);
        prevX = ex; prevY = newY;
      }
      segs.push(`<line x1="${prevX}" y1="${prevY}" x2="800" y2="${prevY}" stroke="${r.color}" stroke-width="3"/>`);

      return `
        <text x="20" y="${yMid + 5}" fill="${r.color}" font-size="16" font-weight="bold">${r.label}</text>
        ${segs.join('')}
      `;
    }).join('');
  })()}

  <!-- Annotations -->
  <text x="${140 + 1 * 110}" y="450" text-anchor="middle" fill="#ff8080" font-size="14" font-weight="bold">⇩ async assert (immediate)</text>
  <text x="${140 + 4 * 110}" y="470" text-anchor="middle" fill="#80f0a0" font-size="14" font-weight="bold">↑ sync deassert (2 cycles)</text>

  <!-- Summary -->
  <rect x="60" y="490" width="880" height="50" rx="8" fill="rgba(128,240,160,0.06)" stroke="#80f0a0" stroke-width="1.8"/>
  <text x="500" y="518" text-anchor="middle" fill="#80f0a0" font-size="16" font-weight="bold">
    nRST_out = 0 מיידית בעת assert (cycle 2) · nRST_out = 1 רק 2 cycles אחרי deassert (cycle 6)
  </text>
</svg>`,
      },

      // ─────────────────────────────────────────────────────────
      // Part ד — Reset tree / deassertion ordering
      // ─────────────────────────────────────────────────────────
      {
        label: 'ד',
        question: 'נתון מערכת עם **8 FFs** ב-stage אחד שכולם תלויים ב-reset. ה-RST signal מחולק דרך **clock tree** עם buffer-ים ויש לו skew. למה הסקיו על RST line מסוכן יותר מסקיו על clock line, ואיך פותרים זאת?',
        hints: [
          'אם RST מגיע ל-FF_A ב-time \\\`t\\\` ול-FF_B ב-time \\\`t + skew\\\`, אז FF_A יוצא מ-reset מוקדם יותר.',
          'בזמן ה-skew window: FF_A מבצע פעולה רגילה (D נדגם), FF_B עדיין מאופס. תוצאה: **state inconsistency**.',
          'דוגמה: ספירה counter שמורכב מ-8 FFs. FF_A יצא מ-reset, התחיל לספור → \\\`count=1\\\`. FF_B עדיין ב-reset → \\\`bit_B=0\\\`. ה-counter מציג ערך לא חוקי.',
          'פתרון 1: **balanced reset tree** — וודא ש-skew על RST < 1 cycle של CLK.',
          'פתרון 2: **reset synchronizer** (מסעיף ג\') — מחזיק RST פעיל עד שכל ה-FFs ראו את ה-deassertion ב-rising edge המקומי שלהם.',
          'פתרון 3: **שני שלבים של synchronizer** במקומות שונים — recommended ב-design מרובה domains.',
        ],
        answer:
`## הבעיה: Deassertion Ordering

### מה קורה כש-RST משתחרר

ה-RST מגיע ל-FFs דרך **buffer tree** (מבנה דמוי clock tree). כל buffer מוסיף delay. ה-skew בין ה-FFs **שונה לכל אחד**:

\`\`\`
                       FF_A (skew = 0)      ← יוצא מ-reset ראשון
RST ─→ BUF1 ──┬───→
              │
              ├──BUF2─── FF_B (skew = 50 ps)
              │
              └──BUF3─── FF_C (skew = 100 ps)  ← יוצא מ-reset אחרון
\`\`\`

### דוגמה קונקרטית: 8-bit counter

נניח שכל ה-8 FFs מתחילים count מ-0 אחרי reset. CLK בקצב 1 GHz (1 ns cycle).

| Time | FF_0 | FF_1 | FF_2 | ... | FF_7 | counter value |
|---|:---:|:---:|:---:|---|:---:|---|
| RST deasserts | מעוכב 0 ps | מעוכב 30 ps | מעוכב 60 ps | ... | מעוכב 210 ps | — |
| 100 ps אחרי | יצא | יצא | יצא | ... | עוד ב-reset | mixed! |
| 220 ps אחרי | יצא | יצא | יצא | ... | יצא | now consistent |

באמצע התקופה הזו (100-220 ps), ה-counter מציג **ערך שלא קיים בתכנון**. אם module אחר קורא את ה-counter ב-window הזה → תוצאה שגויה.

### למה זה גרוע יותר מ-clock skew?

| Skew | Setup/Hold | תוצאה |
|---|---|---|
| Clock skew | ✓ STA tools תופסים | violations מסומנים, ניתן לתקן |
| Reset skew | ✗ STA לרוב לא בודק | bug שקטה — מופיע רק ב-startup |

### הפתרון: Synchronized Reset Tree

\`\`\`
nRST_in → [Reset Synchronizer] → nRST_internal
                                       │
                                       ↓
                          Balanced Reset Buffer Tree
                                  ↓ ↓ ↓ ↓ ↓
                                FF_0 ... FF_7
\`\`\`

המפתח:
1. **Reset Synchronizer** (מסעיף ג') יוצר \`nRST_internal\` שהוא **sync ל-CLK**.
2. ה-tree מעצב את ה-distribution כך שכל ה-FFs רואים את אותו edge ב-CLK rising.
3. STA tools בודקים את ה-tree באותה דרך כמו clock tree — \`skew ≤ 100 ps\` typically.

### Multi-Domain

ב-SoC עם כמה clock domains, **לכל domain reset synchronizer משלו** — לא לסנכרן reset של domain A עם CLK של domain B. זה יוצר הפרת CDC.

### בקנבס

ה-engine מציג אותו 4-FF chain מסעיף א'. כל ה-FFs מקבלים את אותו RST signal בו-זמנית (אין skew במודל). במציאות יש skew של 30-200 ps; ה-#5009 ב-canvas מטרתו לימודית בלבד.`,
        interviewerMindset:
`**שאלה מערכתית.** המראיין מחפש:
1. **שאתה מבחין בין clock skew ל-reset skew** — מספר אנשים לא חושבים על RST כמו על clock. הקשר נדרש.
2. **שאתה רואה את ה-startup window בעיה** — לא רק "skew זה רע". ספציפית: השפעה על startup state.
3. **שאתה מציע synchronizer + balanced tree** — שילוב של שתי טכניקות.
4. **שאתה מזכיר multi-domain** — לכל domain reset משלו.

**שאלת המשך**: "מה אם ה-counter במשך 100 ps יוצא לקריאה?" → במציאות, downstream FFs ידגמו את ה-counter בקצה ה-CLK של domain שלהם — אחרי שה-counter כבר התייצב. אבל אם downstream הוא combinational (לא FF), הוא יראה glitch.

**שאלת bonus**: "האם sync reset פותר את הבעיה?" → באופן חלקי. Sync reset = RST נדגם בקצה CLK, אז skew על RST tree לא רלוונטי. אבל עדיין צריך synchronizer אם RST מגיע מ-domain אחר.

**מלכודת**: "להוסיף עוד reset synchronizers" → לא עוזר אם ה-tree לא מאוזן. הפתרון הוא ה-tree, לא ה-synchronizer.`,
        expectedAnswers: [
          'reset tree', 'tree skew',
          'deassertion ordering', 'inconsistency',
          'startup state', 'counter',
          'balanced tree', 'CTS',
          'multi-domain', 'CDC',
          'reset synchronizer',
        ],
        schematic: `
<svg viewBox="0 0 1000 560" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Reset buffer tree with annotated skew on each leaf branch.">

  <text x="500" y="44" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    Reset Tree — deassertion ordering
  </text>
  <text x="500" y="80" text-anchor="middle" fill="#a0a0c0" font-size="16" font-style="italic">
    Buffers על ה-tree יוצרים skew · ה-FFs לא יוצאים מ-reset בו-זמנית
  </text>

  <!-- RST root -->
  <circle cx="500" cy="140" r="28" fill="#0a1825" stroke="#ff6060" stroke-width="3"/>
  <text x="500" y="148" text-anchor="middle" fill="#ff6060" font-size="16" font-weight="bold">RST</text>

  <!-- Tree -->
  <g stroke="#ff6060" stroke-width="3" fill="none" stroke-dasharray="6,4">
    <line x1="500" y1="168" x2="500" y2="200"/>
    <!-- BUF1 -->
    <line x1="500" y1="200" x2="200" y2="200"/>
    <line x1="500" y1="200" x2="800" y2="200"/>
    <!-- Down from BUF1 split -->
    <line x1="200" y1="200" x2="200" y2="260"/>
    <line x1="800" y1="200" x2="800" y2="260"/>
    <!-- BUF2 / BUF3 (second-level split) -->
    <line x1="200" y1="260" x2="120" y2="320"/>
    <line x1="200" y1="260" x2="280" y2="320"/>
    <line x1="800" y1="260" x2="720" y2="320"/>
    <line x1="800" y1="260" x2="880" y2="320"/>
    <!-- to FFs -->
    <line x1="120" y1="320" x2="120" y2="400"/>
    <line x1="280" y1="320" x2="280" y2="400"/>
    <line x1="720" y1="320" x2="720" y2="400"/>
    <line x1="880" y1="320" x2="880" y2="400"/>
  </g>

  <!-- Buffer rectangles -->
  ${[
    { x: 200, y: 220, label: 'BUF1' },
    { x: 800, y: 220, label: 'BUF1' },
    { x: 120, y: 340, label: 'BUF2' },
    { x: 280, y: 340, label: 'BUF2' },
    { x: 720, y: 340, label: 'BUF2' },
    { x: 880, y: 340, label: 'BUF2' },
  ].map(b => `
    <rect x="${b.x - 28}" y="${b.y - 18}" width="56" height="36" rx="6" fill="#1a2230" stroke="#ff8080" stroke-width="2"/>
    <text x="${b.x}" y="${b.y + 5}" text-anchor="middle" fill="#ff8080" font-size="13">${b.label}</text>
  `).join('')}

  <!-- 4 FFs at the leaves -->
  ${[120, 280, 720, 880].map((x, i) => `
    <rect x="${x - 36}" y="400" width="72" height="52" rx="7" fill="#1a1428" stroke="#cc66ff" stroke-width="2.6"/>
    <text x="${x}" y="432" text-anchor="middle" fill="#cc99ff" font-size="18" font-weight="bold">FF_${i}</text>
  `).join('')}

  <!-- Skew annotations -->
  <text x="120" y="476" text-anchor="middle" fill="#80f0a0" font-size="15" font-weight="bold">skew = 0</text>
  <text x="280" y="476" text-anchor="middle" fill="#ffe060" font-size="15" font-weight="bold">skew = 30 ps</text>
  <text x="720" y="476" text-anchor="middle" fill="#ff8080" font-size="15" font-weight="bold">skew = 60 ps</text>
  <text x="880" y="476" text-anchor="middle" fill="#ff6060" font-size="15" font-weight="bold">skew = 100 ps</text>

  <!-- Warning banner -->
  <rect x="60" y="500" width="880" height="46" rx="10" fill="rgba(255,96,96,0.07)" stroke="#ff6060" stroke-width="2"/>
  <text x="500" y="528" text-anchor="middle" fill="#ff8080" font-size="16" font-weight="bold">
    בתוך 100 ps אחרי deassertion: state inconsistent (חלק יצאו מ-reset, חלק עדיין ב-reset)
  </text>
</svg>`,
        circuit: () => build(() => {
          // Reuse the 4-FF chain — the simulator treats RST as a single
          // global wire (no skew model). Visual context only; the answer
          // explains the skew teaching point.
          const clk = h.clock(80, 460, 'CLK');
          const inIn = h.input(80, 120, 'in');  inIn.fixedValue = 1;
          const rstIn = h.input(80, 600, 'RST'); rstIn.fixedValue = 0;
          const ff1 = h.ffD(220, 120, 'FF1', { reset: 'async' });
          const ff2 = h.ffD(400, 120, 'FF2', { reset: 'async' });
          const ff3 = h.ffD(580, 120, 'FF3', { reset: 'async' });
          const ff4 = h.ffD(760, 120, 'FF4', { reset: 'async' });
          const outOut = h.output(920, 120, 'out');
          return {
            nodes: [clk, inIn, rstIn, ff1, ff2, ff3, ff4, outOut],
            wires: [
              h.wire(inIn.id, ff1.id, 0),
              h.wire(ff1.id, ff2.id, 0),
              h.wire(ff2.id, ff3.id, 0),
              h.wire(ff3.id, ff4.id, 0),
              h.wire(clk.id, ff1.id, 1, 0, { isClockWire: true }),
              h.wire(clk.id, ff2.id, 1, 0, { isClockWire: true }),
              h.wire(clk.id, ff3.id, 1, 0, { isClockWire: true }),
              h.wire(clk.id, ff4.id, 1, 0, { isClockWire: true }),
              h.wire(rstIn.id, ff1.id, 2, 0, { isResetWire: true }),
              h.wire(rstIn.id, ff2.id, 2, 0, { isResetWire: true }),
              h.wire(rstIn.id, ff3.id, 2, 0, { isResetWire: true }),
              h.wire(rstIn.id, ff4.id, 2, 0, { isResetWire: true }),
              h.wire(ff4.id, outOut.id, 0),
            ],
          };
        }),
      },

      // ─────────────────────────────────────────────────────────
      // Part ה — Failure trace + fix (separate circuits)
      // ─────────────────────────────────────────────────────────
      {
        label: 'ה',
        question: 'ב-canvas יש מעגל עם **שני 4-FF chains** זה לצד זה. אחד עם async reset ישיר (RST → FFs), והשני עם **reset synchronizer** (RST → 2-FF sync → reset_internal → FFs). הצב \\\`RST = 1\\\` כדי לאפס, ואז \\\`RST = 0\\\` כדי לשחרר. מה ההבדל בהתנהגות בעת שחרור? למה הסינכרון פותר את הבעיה?',
        hints: [
          'באסט\' ה-direct, כל FF יוצא מ-reset מיד כש-RST=0. אם CLK עולה באותו רגע → recovery violation אפשרי (סעיף ב\').',
          'בצד ה-synchronized, אחרי \\\`RST=0\\\` ה-FF_sync1 דוגם 1 ב-CLK הבא, ואז ה-FF_sync2 דוגם 1 ב-CLK שאחריו → ה-pipeline משוחרר רק 2 cycles אחרי \\\`RST=0\\\`.',
          'התוצאה: ב-direct ייתכן ש-FF_A יקלוט data ו-FF_B לא, בגלל skew (סעיף ד\'). ב-synchronized — כולם משוחררים יחד.',
          'גם metastability ב-FF_sync1 לא משפיע: FF_sync2 דוגם cycle אחר → metastability התייצבה לפני שהיא הגיעה ל-pipeline.',
        ],
        answer:
`## הניסוי

### Scenario: שני pipelines, אותו reset signal

**Pipeline A** (Direct async reset):
\`\`\`
in → FF_A1 → FF_A2 → FF_A3 → FF_A4 → out_A
        │      │       │       │
        └──────┴───────┴───────┴──── RST (async, direct)
\`\`\`

**Pipeline B** (Reset synchronizer):
\`\`\`
in → FF_B1 → FF_B2 → FF_B3 → FF_B4 → out_B
        │      │       │       │
        └──────┴───────┴───────┴──── rst_internal
                                            ↑
                              [Reset Synchronizer]
                                            ↑
                                          RST_in
\`\`\`

### בשחרור (RST: 1 → 0)

**Pipeline A**:
- כל ה-FFs יוצאים מ-reset **מיד**.
- אם CLK עולה ב-100 ps הבאים → recovery violation → metastability על כל FF.
- אפילו בלי violation: ה-FFs רואים את "in" באותו cycle שבו RST שחרר → אם in=1, FF_A1 יקלוט 1 מיד.

**Pipeline B**:
- ה-FFs נשארים ב-reset (rst_internal=1) עד שה-synchronizer מסיים.
- ה-synchronizer דורש 2 CLK cycles לאחר ש-RST_in=0 לפני ש-rst_internal=0.
- במהלך הזמן הזה, ה-FF_sync1/2 רואים את ה-CLK edges — כל metastability מתייצבת.
- כש-rst_internal סוף-סוף משחרר, זה ב-rising edge של CLK → **0 recovery violations**.

### המספרים

| Pipeline | זמן שחרור | מטא-יציבות? | חזרה לתפקוד |
|---|---|:---:|---|
| A (Direct) | 0 ps | ⚠ אפשרי | מיד (אבל עם risk) |
| B (Sync) | 2 cycles ≈ 2 ns | ✗ לא | בטוח, deterministic |

### Trade-off

- Pipeline A: latency נמוך יותר; risk גבוה יותר.
- Pipeline B: 2 cycles "מבוזבזים" בשחרור; אבל **deterministic + safe**.

ב-99% מהתעשייה: Pipeline B. ה-2 cycles הם כלום ביחס לעלות של debug שגיאה אחת ב-tape-out.

### בקנבס

הצב \`RST = 1\` — שני ה-pipelines מתאפסים מיד (async). הצב \`RST = 0\` ופעם CLK פעם אחת — ב-Pipeline A: \`Q_A1 = 1\` (in הועבר). ב-Pipeline B: \`Q_B1 = 0\` (כי rst_internal עדיין 1, ה-synchronizer לא הסתיים). פעם CLK שוב — ב-Pipeline A: עכשיו \`Q_A2 = 1\` גם. ב-Pipeline B: \`Q_B1\` עדיין 0 (cycle 2 של ה-sync). פעם CLK פעם שלישית — ב-Pipeline B: סוף-סוף \`Q_B1 = 1\`.`,
        interviewerMindset:
`**שאלת סיכום של ה-question.** המראיין מחפש:
1. **שאתה מצליח לעבד שני circuits יחד** — לא רק "Pipeline A הוא X, Pipeline B הוא Y". איך הם **שונים** בהתנהגות פיזית.
2. **שאתה מציין את ה-trade-off של 2 cycles** — לא רק "B יותר טוב". explicit on cost.
3. **שאתה מתחבר ל-real-world** — 99% של designs משתמשים ב-B. למה.

**שאלת המשך**: "מה אם הייתי משתמש ב-Pipeline B אבל בלי ה-FF_sync2?" → רק FF_sync1 = synchronizer של 1 FF. metastability עדיין אפשרית בקצה הראשון. לא מספיק.

**שאלת bonus**: "האם הייתי יכול לעשות synchronizer ל-RST_in ב-domain אחד, ולשלוח את התוצאה ל-domain שני?" → לא! כל domain צריך synchronizer משלו. הקשר ל-#5006 (multi-domain CDC).

**ראה גם**: #5006 (CDC + synchronizers), #5004 ה' (pipeline imbalance).`,
        expectedAnswers: [
          'reset synchronizer', 'rst_internal',
          '2 cycles', 'sync delay',
          'metastability', 'recovery',
          'deterministic', 'safe',
          'direct', 'sync',
          'pipeline A', 'pipeline B',
        ],
        circuit: () => build(() => {
          // Two pipelines side-by-side:
          //   A (top)    — 2 FFs with DIRECT async reset
          //   B (bottom) — 2 FFs gated by a reset synchronizer
          //                (FF_sync1 + FF_sync2, D tied high, active-low rst)
          //
          // Shared CLK + shared external RST_in.
          // RST_in active-low (asserted = 0); default 1 (not asserted).
          // Set RST_in=0 → both pipelines reset immediately (async).
          // Set RST_in=1 → Pipeline A resumes immediately;
          //                Pipeline B waits 2 CLK cycles for the
          //                synchronizer to release rst_internal.
          const clk     = h.clock(80, 540, 'CLK');
          const inIn    = h.input(80, 120, 'in');     inIn.fixedValue   = 1;
          const rst_in  = h.input(80, 620, 'RST_in'); rst_in.fixedValue = 1;  // active-low: 1 = not asserted
          const vcc     = h.input(280, 380, 'VCC');   vcc.fixedValue    = 1;

          // ── Pipeline A — direct async reset ──
          const a1 = h.ffD(220, 120, 'FF_A1', { reset: 'async', resetActiveLow: true });
          const a2 = h.ffD(400, 120, 'FF_A2', { reset: 'async', resetActiveLow: true });
          const qA1 = h.output(220, 40, 'Q_A1');
          const qA2 = h.output(400, 40, 'Q_A2');
          const outA = h.output(560, 120, 'out_A');

          // ── Reset synchronizer ──
          const fsync1 = h.ffD(440, 380, 'FF_sync1', { reset: 'async', resetActiveLow: true });
          const fsync2 = h.ffD(620, 380, 'FF_sync2', { reset: 'async', resetActiveLow: true });
          const rstInternalProbe = h.output(800, 380, 'rst_int');

          // ── Pipeline B — gated by rst_internal ──
          // Need a separate active-low rst signal. The synchronizer's
          // FF_sync2.Q is "1 when ok, 0 when reset" — same polarity as
          // active-low RST. Feed FF_sync2.Q to B-pipeline's reset pins.
          const b1 = h.ffD(220, 260, 'FF_B1', { reset: 'async', resetActiveLow: true });
          const b2 = h.ffD(400, 260, 'FF_B2', { reset: 'async', resetActiveLow: true });
          const qB1 = h.output(220, 200, 'Q_B1');
          const qB2 = h.output(400, 200, 'Q_B2');
          const outB = h.output(560, 260, 'out_B');

          return {
            nodes: [
              clk, inIn, rst_in, vcc,
              a1, a2, qA1, qA2, outA,
              fsync1, fsync2, rstInternalProbe,
              b1, b2, qB1, qB2, outB,
            ],
            wires: [
              // ── Pipeline A ──
              h.wire(inIn.id, a1.id, 0),
              h.wire(a1.id, a2.id, 0),
              h.wire(clk.id, a1.id, 1, 0, { isClockWire: true }),
              h.wire(clk.id, a2.id, 1, 0, { isClockWire: true }),
              h.wire(rst_in.id, a1.id, 2, 0, { isResetWire: true }),
              h.wire(rst_in.id, a2.id, 2, 0, { isResetWire: true }),
              h.wire(a1.id, qA1.id, 0),
              h.wire(a2.id, qA2.id, 0),
              h.wire(a2.id, outA.id, 0),

              // ── Reset synchronizer ──
              h.wire(vcc.id, fsync1.id, 0),
              h.wire(fsync1.id, fsync2.id, 0),
              h.wire(clk.id, fsync1.id, 1, 0, { isClockWire: true }),
              h.wire(clk.id, fsync2.id, 1, 0, { isClockWire: true }),
              h.wire(rst_in.id, fsync1.id, 2, 0, { isResetWire: true }),
              h.wire(rst_in.id, fsync2.id, 2, 0, { isResetWire: true }),
              h.wire(fsync2.id, rstInternalProbe.id, 0),

              // ── Pipeline B — fed by rst_internal (= FF_sync2.Q) ──
              h.wire(inIn.id, b1.id, 0),
              h.wire(b1.id, b2.id, 0),
              h.wire(clk.id, b1.id, 1, 0, { isClockWire: true }),
              h.wire(clk.id, b2.id, 1, 0, { isClockWire: true }),
              h.wire(fsync2.id, b1.id, 2, 0, { isResetWire: true }),
              h.wire(fsync2.id, b2.id, 2, 0, { isResetWire: true }),
              h.wire(b1.id, qB1.id, 0),
              h.wire(b2.id, qB2.id, 0),
              h.wire(b2.id, outB.id, 0),
            ],
          };
        }),
        answerSchematic: `
<svg viewBox="0 0 1000 480" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Side-by-side: direct reset releases immediately, synchronized reset releases 2 cycles later.">

  <text x="500" y="44" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    Direct vs Synchronized — שחרור Reset
  </text>

  <!-- Pipeline A — direct, releases immediately -->
  <rect x="40" y="90" width="440" height="340" rx="14" fill="rgba(255,96,96,0.05)" stroke="rgba(255,96,96,0.55)" stroke-width="2.4"/>
  <text x="260" y="128" text-anchor="middle" fill="#ff8080" font-weight="bold" font-size="22">Pipeline A — Direct</text>

  <text x="60" y="170" fill="#cca040" font-size="15" font-weight="bold">RST_in</text>
  <text x="60" y="220" fill="#cc99ff" font-size="15" font-weight="bold">Q_A1</text>
  <text x="60" y="270" fill="#cc99ff" font-size="15" font-weight="bold">Q_A2</text>

  <!-- Waveforms for A: RST drops at cycle 2, Q_A1 = 1 immediately on CLK 3 -->
  ${(() => {
    const X = c => 140 + (c - 1) * 65;
    return `
      <line x1="124" y1="160" x2="${X(2)}" y2="160" stroke="#cca040" stroke-width="3"/>
      <line x1="${X(2)}" y1="160" x2="${X(2)}" y2="190" stroke="#cca040" stroke-width="3"/>
      <line x1="${X(2)}" y1="190" x2="460" y2="190" stroke="#cca040" stroke-width="3"/>

      <line x1="124" y1="240" x2="${X(3)}" y2="240" stroke="#cc99ff" stroke-width="3"/>
      <line x1="${X(3)}" y1="240" x2="${X(3)}" y2="210" stroke="#cc99ff" stroke-width="3"/>
      <line x1="${X(3)}" y1="210" x2="460" y2="210" stroke="#cc99ff" stroke-width="3"/>

      <line x1="124" y1="290" x2="${X(4)}" y2="290" stroke="#cc99ff" stroke-width="3"/>
      <line x1="${X(4)}" y1="290" x2="${X(4)}" y2="260" stroke="#cc99ff" stroke-width="3"/>
      <line x1="${X(4)}" y1="260" x2="460" y2="260" stroke="#cc99ff" stroke-width="3"/>
    `;
  })()}

  <text x="260" y="350" text-anchor="middle" fill="#ff8080" font-size="15" font-weight="bold">Q_A1=1 ב-CLK 3 (מיד אחרי deassertion)</text>
  <text x="260" y="380" text-anchor="middle" fill="#a0a0c0" font-size="14" font-style="italic">⚠ ייתכן recovery violation</text>

  <!-- Pipeline B — synchronized, 2 cycles delay -->
  <rect x="520" y="90" width="440" height="340" rx="14" fill="rgba(128,240,160,0.05)" stroke="rgba(128,240,160,0.55)" stroke-width="2.4"/>
  <text x="740" y="128" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="22">Pipeline B — Sync</text>

  <text x="540" y="170" fill="#cca040" font-size="15" font-weight="bold">RST_in</text>
  <text x="540" y="220" fill="#cc99ff" font-size="15" font-weight="bold">rst_int</text>
  <text x="540" y="270" fill="#cc99ff" font-size="15" font-weight="bold">Q_B1</text>

  ${(() => {
    const X = c => 620 + (c - 1) * 65;
    return `
      <line x1="604" y1="160" x2="${X(2)}" y2="160" stroke="#cca040" stroke-width="3"/>
      <line x1="${X(2)}" y1="160" x2="${X(2)}" y2="190" stroke="#cca040" stroke-width="3"/>
      <line x1="${X(2)}" y1="190" x2="940" y2="190" stroke="#cca040" stroke-width="3"/>

      <line x1="604" y1="210" x2="${X(4)}" y2="210" stroke="#cc99ff" stroke-width="3"/>
      <line x1="${X(4)}" y1="210" x2="${X(4)}" y2="240" stroke="#cc99ff" stroke-width="3"/>
      <line x1="${X(4)}" y1="240" x2="940" y2="240" stroke="#cc99ff" stroke-width="3"/>

      <line x1="604" y1="290" x2="${X(5)}" y2="290" stroke="#cc99ff" stroke-width="3"/>
      <line x1="${X(5)}" y1="290" x2="${X(5)}" y2="260" stroke="#cc99ff" stroke-width="3"/>
      <line x1="${X(5)}" y1="260" x2="940" y2="260" stroke="#cc99ff" stroke-width="3"/>
    `;
  })()}

  <text x="740" y="350" text-anchor="middle" fill="#80f0a0" font-size="15" font-weight="bold">Q_B1=1 ב-CLK 5 (2 cycles אחרי deassertion)</text>
  <text x="740" y="380" text-anchor="middle" fill="#a0a0c0" font-size="14" font-style="italic">✓ deterministic, no metastability</text>

  <!-- Bottom -->
  <text x="500" y="458" text-anchor="middle" fill="#cc99ff" font-size="16" font-weight="bold">
    2 cycles נוספים = price קטן ל-deterministic startup
  </text>
</svg>`,
      },
    ],
    source: 'Reset Design — async / sync / synchronizer / tree',
    tags: ['reset', 'async-reset', 'sync-reset', 'reset-synchronizer', 'metastability', 'timing'],
    circuitRevealsAnswer: true,
  },

  // ─────────────────────────────────────────────────────────────
  // #5010 — Glitches & Hazards
  //   The "other" combinational pitfall that #5004/#5005 didn't cover:
  //   even when STA closes path delays, the circuit can momentarily
  //   glitch low or high while inputs transition.
  //
  //   Function used throughout: F(A,B,C) = A·B + B'·C  (3 inputs).
  //   This has a classic static-1 hazard between the two prime
  //   implicants AB and B'C, fixable by the consensus term A·C.
  //
  //   No engine extension needed — the simulator has no delay model,
  //   so glitches are taught via K-map + timing-diagram SVGs, the same
  //   way #5004 taught gate delays.
  // ─────────────────────────────────────────────────────────────
  {
    id: 'interview-glitches-hazards',
    difficulty: 'hard',
    title: 'Glitches & Hazards — K-map, consensus term, dynamic hazard',
    intro:
`#5004/#5005 לימדו critical path: כמה זמן עובר עד שהיציאה מתייצבת. אבל יש סוג שני של בעיה combinational: **glitch** — ה-output **כן** מתייצב לערך הנכון, אבל **בדרך** הוא קופץ לערך שגוי לזמן קצר.

נתון פונקציה של 3 משתנים:

\`\`\`
F(A, B, C) = A·B + B'·C
\`\`\`

ה-implementation gate-level:
- \`g1 = A AND B\`     (60 ps)
- \`g2 = NOT B\`        (30 ps)
- \`g3 = g2 AND C\`    (60 ps)
- \`g4 = g1 OR g3\`    (50 ps)
- output \`F = g4\`

הפונקציה עצמה תקינה. אבל יש **static-1 hazard** מוסתר. השאלות הבאות חושפות אותו, מתקנים אותו, ומלמדות מה ההבדל בין static ל-dynamic hazards.`,
    schematic: `
<svg viewBox="0 0 1000 480" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="20" role="img" aria-label="Gate-level implementation of F = AB + B'C with 4 gates and 3 inputs.">

  <text x="500" y="44" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    F(A, B, C) = A·B + B'·C
  </text>
  <text x="500" y="78" text-anchor="middle" fill="#a0a0c0" font-size="18" font-style="italic">
    4 gates: AND, NOT, AND, OR  ·  3 inputs  ·  static-1 hazard מוסתר
  </text>

  <!-- Inputs -->
  <g font-size="20" font-weight="bold">
    <circle cx="80" cy="160" r="26" fill="#0a1825" stroke="#cca040" stroke-width="2.4"/>
    <text x="80" y="168" text-anchor="middle" fill="#cca040">A</text>
    <circle cx="80" cy="260" r="26" fill="#0a1825" stroke="#cca040" stroke-width="2.4"/>
    <text x="80" y="268" text-anchor="middle" fill="#cca040">B</text>
    <circle cx="80" cy="360" r="26" fill="#0a1825" stroke="#cca040" stroke-width="2.4"/>
    <text x="80" y="368" text-anchor="middle" fill="#cca040">C</text>
  </g>

  <!-- Wires from inputs -->
  <g stroke="#a0a0c0" stroke-width="2" fill="none">
    <line x1="106" y1="160" x2="280" y2="200"/>
    <line x1="106" y1="260" x2="240" y2="260"/>
    <circle cx="240" cy="260" r="3" fill="#a0a0c0"/>
    <line x1="240" y1="260" x2="280" y2="220"/>
    <line x1="240" y1="260" x2="290" y2="320"/>
    <line x1="106" y1="360" x2="380" y2="360"/>
  </g>

  <!-- g1 = AND -->
  <path d="M 280 190 L 320 190 A 30 30 0 0 1 320 250 L 280 250 Z"
        fill="rgba(128,200,255,0.25)" stroke="#80c8ff" stroke-width="2.4"/>
  <text x="305" y="216" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">AND</text>
  <text x="305" y="234" text-anchor="middle" fill="#c8d8f0" font-size="14">g1 · 60 ps</text>

  <!-- g2 = NOT -->
  <path d="M 290 308 L 330 320 L 290 332 Z"
        fill="rgba(255,224,128,0.25)" stroke="#ffe060" stroke-width="2.4"/>
  <circle cx="338" cy="320" r="5" fill="#0a1825" stroke="#ffe060" stroke-width="2"/>
  <text x="306" y="324" text-anchor="middle" fill="#ffe060" font-size="14" font-weight="bold">¬</text>
  <text x="310" y="356" fill="#ffe060" font-size="14">g2 · 30 ps</text>

  <!-- g3 = AND -->
  <path d="M 380 332 L 420 332 A 30 30 0 0 1 420 392 L 380 392 Z"
        fill="rgba(128,200,255,0.25)" stroke="#80c8ff" stroke-width="2.4"/>
  <text x="405" y="358" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">AND</text>
  <text x="405" y="376" text-anchor="middle" fill="#c8d8f0" font-size="14">g3 · 60 ps</text>

  <!-- Wire g2 to g3 -->
  <line x1="343" y1="320" x2="380" y2="350" stroke="#a0a0c0" stroke-width="2"/>

  <!-- Wire g1.out and g3.out to OR -->
  <g stroke="#a0a0c0" stroke-width="2" fill="none">
    <line x1="350" y1="220" x2="540" y2="280"/>
    <line x1="450" y1="362" x2="540" y2="320"/>
  </g>

  <!-- g4 = OR -->
  <path d="M 540 270 L 570 270 Q 600 270, 620 300 Q 600 330, 570 330 L 540 330 Q 560 300, 540 270 Z"
        fill="rgba(255,192,128,0.25)" stroke="#ffc080" stroke-width="2.4"/>
  <text x="582" y="296" text-anchor="middle" fill="#ffc080" font-size="18" font-weight="bold">OR</text>
  <text x="582" y="316" text-anchor="middle" fill="#c8d8f0" font-size="14">g4 · 50 ps</text>

  <!-- Output -->
  <line x1="620" y1="300" x2="800" y2="300" stroke="#ff9933" stroke-width="2.4"/>
  <circle cx="820" cy="300" r="26" fill="#0a1825" stroke="#ff9933" stroke-width="2.4"/>
  <text x="820" y="308" text-anchor="middle" fill="#ff9933" font-size="20" font-weight="bold">F</text>

  <!-- Annotations -->
  <text x="500" y="446" text-anchor="middle" fill="#cc99ff" font-size="16" font-style="italic">
    AB מכוסה ע"י g1; B'C מכוסה ע"י g3; OR מאחד
  </text>
</svg>`,
    parts: [
      // ─────────────────────────────────────────────────────────
      // Part א — Identify on K-map
      // ─────────────────────────────────────────────────────────
      {
        label: 'א',
        question: 'צייר K-map של \`F(A, B, C) = A·B + B\'·C\`. סמן את **שני ה-prime implicants**. מהו ה-minimum cover, ומדוע ה-implementation מתאים לו 1-ל-1?',
        hints: [
          'K-map 3-input: 2 שורות (A) × 4 עמודות (BC ב-Gray code: 00, 01, 11, 10) = 8 תאים.',
          'הצב את הערכים: 8 שורות truth-table → 8 תאים.',
          'A=0, B=0, C=0 → 0. A=0, B=0, C=1 → 1. A=0, B=1, C=0 → 0. A=0, B=1, C=1 → 0.',
          'A=1, B=0, C=0 → 0. A=1, B=0, C=1 → 1. A=1, B=1, C=0 → 1. A=1, B=1, C=1 → 1.',
          '4 תאים = 1: (A=0, BC=01), (A=1, BC=01), (A=1, BC=11), (A=1, BC=10).',
          'Implicant 1: B\'·C — מכסה שני התאים בעמודת BC=01.',
          'Implicant 2: A·B — מכסה שני התאים בשורת A=1, BC=11 ו-10.',
        ],
        answer:
`## K-map של \`F(A, B, C) = A·B + B'·C\`

\`\`\`
       BC=00  BC=01  BC=11  BC=10
A=0:    0      1      0      0
A=1:    0      1      1      1
\`\`\`

### Prime Implicants

**Implicant 1: \`B'·C\`** (כחול)
- מכסה: (A=0, BC=01) ו-(A=1, BC=01)
- שני התאים בעמודה BC=01 — מאוחדים כי A הוא "don't care" (גם 0 וגם 1).

**Implicant 2: \`A·B\`** (ירוק)
- מכסה: (A=1, BC=11) ו-(A=1, BC=10)
- שני התאים בשורת A=1 כש-B=1 — מאוחדים כי C הוא "don't care".

### Minimum Cover

\`\`\`
F = A·B + B'·C
\`\`\`

זה ה-minimum sum-of-products — אי אפשר לקצר יותר. שני implicants, 2 inputs כל אחד = 4 gate inputs לפני ה-OR.

### התאמה ל-implementation

| Implicant | Gate |
|---|---|
| \`A·B\` | g1 (AND) |
| \`B'·C\` | g3 (AND) — נדרש g2 (NOT) על B |
| OR בין שניהם | g4 (OR) |

**הקבלה 1-ל-1**: כל implicant הוא AND gate, ה-sum הוא OR gate. סטנדרט של 2-level logic.

### למה כדאי להכיר את ה-K-map הזה?

ב-K-map הזה יש **תכונה מסוכנת**: שני 1-cells סמוכים (Gray-distance 1) מכוסים ע"י implicants **שונים**. הסעיף הבא חושף את הבעיה.`,
        interviewerMindset:
`**שאלת חימום — K-map בסיסי.** המראיין מחפש:
1. **שאתה מצייר את ה-K-map ברצף Gray** — 00, 01, 11, 10 (לא 00, 01, 10, 11). זה קריטי לזיהוי adjacency.
2. **שאתה זוכר שכל implicant הוא הקבוצה המקסימלית** — לא תאים בודדים.
3. **שאתה רואה את הקשר ל-gate count** — kא רק "F = AB + B'C", אלא 4 gates ספציפיים.

**שאלת המשך**: "האם אפשר לכסות עם implicant אחד גדול?" → לא במקרה הזה. ארבעת התאים אינם יוצרים מלבן יחיד ב-K-map.

**שאלת bonus**: "מהי ה-don't-care set?" → אין don't-cares כאן (8 תאים, כולם מוגדרים).`,
        expectedAnswers: [
          'K-map', 'מפת קרנו',
          'prime implicant', 'אימפליקנט', 'implicant',
          'AB', 'A·B', 'B\'C', "B'C",
          'minimum cover', 'minimal',
          'Gray code', 'adjacent',
        ],
        circuit: () => build(() => {
          // F = A·B + B'·C — gate-level live circuit.
          // Used across all parts; the glitch is taught in answer text.
          const a = h.input(80, 100, 'A');  a.fixedValue = 1;
          const b = h.input(80, 240, 'B');  b.fixedValue = 1;
          const c = h.input(80, 380, 'C');  c.fixedValue = 1;

          const g1 = h.gate('AND', 280, 140);    // A·B
          const g2 = h.gate('NOT', 280, 280);    // B'
          const g3 = h.gate('AND', 460, 320);    // B'·C
          const g4 = h.gate('OR',  640, 220);    // OR

          const fOut = h.output(820, 220, 'F');

          return {
            nodes: [a, b, c, g1, g2, g3, g4, fOut],
            wires: [
              h.wire(a.id, g1.id, 0),
              h.wire(b.id, g1.id, 1),
              h.wire(b.id, g2.id, 0),
              h.wire(g2.id, g3.id, 0),
              h.wire(c.id, g3.id, 1),
              h.wire(g1.id, g4.id, 0),
              h.wire(g3.id, g4.id, 1),
              h.wire(g4.id, fOut.id, 0),
            ],
          };
        }),
        answerSchematic: `
<svg viewBox="0 0 1000 540" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="K-map of F = AB + B'C with two prime implicants highlighted.">

  <text x="500" y="44" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    K-map של F = A·B + B'·C
  </text>

  <!-- Axis labels -->
  <text x="500" y="100" text-anchor="middle" fill="#80c8ff" font-size="20" font-weight="bold">BC (Gray)</text>
  <text x="200" y="280" fill="#80c8ff" font-size="20" font-weight="bold">A</text>

  <!-- Column headers -->
  <g fill="#c8d8f0" font-size="18" text-anchor="middle">
    <text x="320" y="140">00</text>
    <text x="430" y="140">01</text>
    <text x="540" y="140">11</text>
    <text x="650" y="140">10</text>
  </g>

  <!-- Row labels -->
  <g fill="#c8d8f0" font-size="20" text-anchor="end" font-weight="bold">
    <text x="260" y="220">0</text>
    <text x="260" y="320">1</text>
  </g>

  <!-- Grid -->
  <g stroke="#506080" stroke-width="2" fill="none">
    <rect x="270" y="160" width="440" height="200"/>
    <line x1="380" y1="160" x2="380" y2="360"/>
    <line x1="490" y1="160" x2="490" y2="360"/>
    <line x1="600" y1="160" x2="600" y2="360"/>
    <line x1="270" y1="260" x2="710" y2="260"/>
  </g>

  <!-- Cell values -->
  <g font-size="28" text-anchor="middle" font-weight="bold">
    <text x="325" y="225" fill="#3a4a60">0</text>
    <text x="435" y="225" fill="#ffe080">1</text>
    <text x="545" y="225" fill="#3a4a60">0</text>
    <text x="655" y="225" fill="#3a4a60">0</text>
    <text x="325" y="325" fill="#3a4a60">0</text>
    <text x="435" y="325" fill="#ffe080">1</text>
    <text x="545" y="325" fill="#ffe080">1</text>
    <text x="655" y="325" fill="#ffe080">1</text>
  </g>

  <!-- B'C implicant (vertical column BC=01) — blue -->
  <rect x="393" y="170" width="76" height="180" rx="20" fill="none" stroke="#40d0f0" stroke-width="4"/>
  <text x="435" y="408" text-anchor="middle" fill="#40d0f0" font-size="20" font-weight="bold">B'·C</text>

  <!-- AB implicant (horizontal at A=1, BC=11 and 10) — green -->
  <rect x="500" y="278" width="200" height="68" rx="20" fill="none" stroke="#39ff80" stroke-width="4"/>
  <text x="600" y="408" text-anchor="middle" fill="#39ff80" font-size="20" font-weight="bold">A·B</text>

  <!-- Conclusion -->
  <rect x="80" y="450" width="840" height="56" rx="10" fill="rgba(128,240,160,0.06)" stroke="#80f0a0" stroke-width="1.8"/>
  <text x="500" y="484" text-anchor="middle" fill="#80f0a0" font-size="18" font-weight="bold">
    F = A·B + B'·C  ·  2 implicants  ·  4 gates במימוש (לפני OR)
  </text>
</svg>`,
      },

      // ─────────────────────────────────────────────────────────
      // Part ב — Identify static-1 hazard
      // ─────────────────────────────────────────────────────────
      {
        label: 'ב',
        question: 'נתון \`A = 1\` ו-\`C = 1\` קבועים, ו-\`B\` עובר מעבר \`1 → 0\`. הוכח ש-F יורד **באופן רגעי** ל-0 לפני שהוא חוזר ל-1. איפה בדיוק על ה-K-map יש hazard, ולמה?',
        hints: [
          'תחילה (A=1, B=1, C=1): F = 1·1 + 0·1 = 1. סוף (A=1, B=0, C=1): F = 1·0 + 1·1 = 1. שניהם 1.',
          'אבל ה-implementation: g1=A·B=0 (אחרי שהגיע B=0), g3=B\'·C=1 (אחרי שהגיע B\'=1). אם g3 איטי יותר מ-g1...',
          'g1 רואה B=0 ויורד מהר → g1.out: 1→0 (60 ps אחרי B נופל).',
          'g3 ממתין ל-B\' שעובר ב-g2 (NOT, 30 ps), ואז ב-g3 (60 ps) → g3.out: 0→1, סה"כ אחרי 90 ps.',
          'בין t=60 ps ל-t=90 ps: g1=0 וg3 עדיין 0 → F = OR(0, 0) = 0.',
          'זה glitch של 30 ps שבו F יורד ל-0 ולא חוזר ל-1 עד אחרי 90 ps.',
          'על ה-K-map: ה-hazard הוא בין שני תאים סמוכים שמכוסים ע"י implicants **שונים**: (A=1, BC=01) ע"י B\'C, ו-(A=1, BC=11) ע"י AB.',
        ],
        answer:
`## Trace של ה-Glitch

נתון \`A=1\`, \`C=1\` קבועים, \`B\` עובר \`1 → 0\` ב-t=0.

| Time | B | g1 (A·B) | B' (g2) | g3 (B'·C) | F = g4 |
|:---:|:---:|:---:|:---:|:---:|:---:|
| t < 0 | 1 | 1 | 0 | 0 | **1** |
| t = 0 | B drops to 0 — gates start propagating | | | | |
| t = 60 ps | 0 | **0** (g1 dropped) | 0 (g2 not done yet) | 0 (g3 not done) | **0** ⚠ |
| t = 90 ps | 0 | 0 | **1** (g2 done) | **1** (g3 done) | **1** (recovered) |

### ה-glitch

בין \`t = 60 ps\` ל-\`t = 90 ps\` (חלון של **30 ps**): F = 0 — **למרות שהפונקציה הלוגית אומרת F=1 בכל הזמן הזה**.

### Static-1 Hazard על ה-K-map

\`\`\`
       BC=00  BC=01  BC=11  BC=10
A=0:    0      1      0      0
A=1:    0     [1]    [1]     1     ← מעבר HAZARD
                ↑       ↑
            B'·C     A·B  (implicants שונים!)
\`\`\`

ה-hazard הוא במעבר בין **שני תאים סמוכים** (Gray-distance 1) שמכוסים ע"י **implicants שונים**:
- (A=1, BC=01) ב-B'·C (כחול)
- (A=1, BC=11) ב-A·B (ירוק)

המעבר \`B: 1→0\` עם A=1, C=1 הוא בדיוק המעבר בין שני התאים האלה — וה-implicants לא חופפים שם.

### למה זה מטריד

- אם downstream FF דוגם את F בקצה clock עד 90 ps אחרי שינוי ה-input → ייתכן ויקלוט 0 במקום 1.
- ב-async logic (control loops) glitch יכול לעורר edge-detector שגוי → state אבוד.
- ב-low-power design glitches גורמים לתנועה נוספת → power חינם בזבזני.

### Hazard ≠ Race

| Hazard | Race |
|---|---|
| static-1 hazard: F נופל זמנית ל-0 כשהוא אמור להישאר 1 | |
| לא דורש שיתוף zelf | בין שני signals מתחרים |

### בקנבס

ה-engine לא מודל gate delays, אז הוא יראה F=1 לאורך כל הסדרה. ה-glitch קיים בpcb אמיתי. אם תרצה לראות אותו ב-simulator — תצטרך תוכנה כמו ModelSim עם SDF (Standard Delay Format).`,
        interviewerMindset:
`**שאלת hazard בסיסית.** המראיין מחפש:
1. **שאתה מתחיל מ-truth table באותו נקודה** — לא מ-K-map ישר. הוכח שלפני ואחרי המעבר, F=1.
2. **שאתה ספור delays של gates** — 60+30+60 = 150 ps total ל-g3, אבל ל-g1 רק 60. ההפרש הוא ה-glitch.
3. **שאתה מצביע על ה-K-map כסיבה** — שני implicants שונים.

**שאלת המשך**: "האם זה קורה גם במעבר 0→1?" → כן! סימטרי. במעבר B: 0→1, g3 נופל ראשון (60 ps), g1 עולה רק אחרי 60 ps נוסף → glitch ל-0. **שני הכיוונים מסוכנים.**

**שאלת bonus**: "מה אם A=0?" → אז F = B'·C בלבד (כי A·B = 0). מעבר B במצב הזה: g1 תמיד 0, g3 משתנה — אבל אין hazard כי רק implicant אחד מעורב.

**מלכודת**: סטודנט שמציע "להחליף NAND ל-AND" → לא רלוונטי, הבעיה היא **structural**, לא טכנולוגית.`,
        expectedAnswers: [
          'static-1 hazard', 'static 1 hazard',
          'glitch', 'גליטץ\'',
          'B 1→0', 'transition',
          'A=1', 'C=1',
          'implicants', 'different implicants',
          '30 ps', '60 ps', '90 ps',
        ],
        circuit: () => build(() => {
          // Same F = AB + B'C circuit as part א.
          const a = h.input(80, 100, 'A');  a.fixedValue = 1;
          const b = h.input(80, 240, 'B');  b.fixedValue = 1;
          const c = h.input(80, 380, 'C');  c.fixedValue = 1;
          const g1 = h.gate('AND', 280, 140);
          const g2 = h.gate('NOT', 280, 280);
          const g3 = h.gate('AND', 460, 320);
          const g4 = h.gate('OR',  640, 220);
          const fOut = h.output(820, 220, 'F');
          return {
            nodes: [a, b, c, g1, g2, g3, g4, fOut],
            wires: [
              h.wire(a.id, g1.id, 0),
              h.wire(b.id, g1.id, 1),
              h.wire(b.id, g2.id, 0),
              h.wire(g2.id, g3.id, 0),
              h.wire(c.id, g3.id, 1),
              h.wire(g1.id, g4.id, 0),
              h.wire(g3.id, g4.id, 1),
              h.wire(g4.id, fOut.id, 0),
            ],
          };
        }),
        answerSchematic: `
<svg viewBox="0 0 1000 580" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Timing diagram of the static-1 hazard glitch during B transition.">

  <text x="500" y="44" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    Static-1 Hazard — glitch של 30 ps
  </text>
  <text x="500" y="78" text-anchor="middle" fill="#a0a0c0" font-size="16" font-style="italic">
    A=1, C=1 קבועים · B עובר 1→0 ב-t=0
  </text>

  <!-- Time axis -->
  <line x1="160" y1="500" x2="900" y2="500" stroke="#a0a0c0" stroke-width="2"/>
  ${[0, 30, 60, 90, 120, 150].map(t => {
    const x = 160 + (t / 150) * 740;
    return `
      <line x1="${x}" y1="495" x2="${x}" y2="505" stroke="#a0a0c0" stroke-width="1.4"/>
      <text x="${x}" y="528" text-anchor="middle" fill="#a0a0c0" font-size="14">${t} ps</text>
    `;
  }).join('')}
  <text x="500" y="552" text-anchor="middle" fill="#a0a0c0" font-size="16" font-weight="bold">t</text>

  <!-- Signal rows -->
  ${(() => {
    const X = t => 160 + (t / 150) * 740;
    const rows = [
      { label: 'B',  y: 120, color: '#cca040', wave: [[0, 'lo']] },                 // 1 → 0 at t=0
      { label: 'g1 (A·B)', y: 200, color: '#80c8ff', wave: [[60, 'lo']] },          // drops at 60
      { label: "B' (g2)",  y: 280, color: '#ffe060', wave: [[30, 'hi']] },          // rises at 30
      { label: 'g3 (B\'·C)', y: 360, color: '#80c8ff', wave: [[90, 'hi']] },        // rises at 90
      { label: 'F (g4=OR)', y: 440, color: '#ff9933', wave: [[60, 'lo'], [90, 'hi']] }, // glitch!
    ];
    // Initial values: B=1, g1=1, B'=0, g3=0, F=1
    return rows.map(r => {
      const yTop = r.y;
      const yBot = r.y + 36;
      const yMid = (yTop + yBot) / 2;
      // Start level (before transitions)
      const startHigh = r.label === 'B' || r.label === 'g1 (A·B)' || r.label === 'F (g4=OR)';
      let prevX = 130;
      let prevY = startHigh ? yTop : yBot;
      const segs = [];
      for (const [t, kind] of r.wave) {
        const ex = X(t);
        segs.push(`<line x1="${prevX}" y1="${prevY}" x2="${ex}" y2="${prevY}" stroke="${r.color}" stroke-width="3.5"/>`);
        const newY = kind === 'hi' ? yTop : yBot;
        segs.push(`<line x1="${ex}" y1="${prevY}" x2="${ex}" y2="${newY}" stroke="${r.color}" stroke-width="3.5"/>`);
        prevX = ex; prevY = newY;
      }
      segs.push(`<line x1="${prevX}" y1="${prevY}" x2="920" y2="${prevY}" stroke="${r.color}" stroke-width="3.5"/>`);

      return `
        <text x="20" y="${yMid + 5}" fill="${r.color}" font-size="15" font-weight="bold">${r.label}</text>
        <text x="${X(0) - 16}" y="${yBot + 4}" text-anchor="end" fill="#7a8a9a" font-size="13">0</text>
        <text x="${X(0) - 16}" y="${yTop + 4}" text-anchor="end" fill="#7a8a9a" font-size="13">1</text>
        ${segs.join('')}
      `;
    }).join('');
  })()}

  <!-- Highlight the glitch window -->
  <rect x="${160 + (60/150) * 740}" y="430" width="${(90-60)/150 * 740}" height="40" rx="6"
        fill="rgba(255,96,96,0.25)" stroke="#ff6060" stroke-width="2"/>
  <text x="${160 + (75/150) * 740}" y="412" text-anchor="middle" fill="#ff6060" font-size="14" font-weight="bold">⚠ glitch 30 ps</text>
</svg>`,
      },

      // ─────────────────────────────────────────────────────────
      // Part ג — Consensus term fix
      // ─────────────────────────────────────────────────────────
      {
        label: 'ג',
        question: 'תקן את ה-hazard בלי לשנות את הפונקציה: הוסף **consensus term** (redundant prime implicant) שמכסה את שני התאים הסמוכים. מה ה-term, ולמה הוא פותר את הבעיה?',
        hints: [
          'ה-consensus term של AB ו-B\'C הוא **A·C** (consensus rule: AB + B\'C + AC = AB + B\'C, אבל ה-AC מוסיף ביטחון).',
          'הוסף gate חמישי: g5 = A AND C. ולחבר אותו ל-OR יחד עם g1 ו-g3 (OR של 3 כניסות, או OR-tree).',
          'A·C מכסה את **שני התאים הסמוכים** ב-K-map: (A=1, BC=01) ו-(A=1, BC=11).',
          'כש-B עובר 1→0 ו-A=C=1: A·C = 1 קבוע! הוא מחזיק את F=1 בלי תלות ב-g1 או g3.',
          'F = AB + B\'C + AC (מבחינה לוגית זהה ל-AB + B\'C, אבל hazard-free).',
        ],
        answer:
`## הפתרון: הוספת ה-consensus term \`A·C\`

### ה-K-map המעודכן

\`\`\`
       BC=00  BC=01  BC=11  BC=10
A=0:    0      1      0      0
A=1:    0     [1]    [1]     1
\`\`\`

הוסף קבוצה שלישית — **שורת A=1, עמודות 01 ו-11** (התאים הסמוכים שהיו "תפר"). זו קבוצת \`A·C\`:

\`\`\`
       BC=00  BC=01  BC=11  BC=10
A=0:    0      1      0      0
A=1:    0    [[1]]  [[1]]    1     ← A·C מכסה את שני התאים
              (כחול+סגול) (ירוק+סגול)
\`\`\`

### הפונקציה המתוקנת

\`\`\`
F = A·B + B'·C + A·C
\`\`\`

מבחינה **לוגית**: \`AB + B'C + AC = AB + B'C\` (consensus rule, חוק הקאנונה).

\`\`\`
AB + B'C + AC = AB(C + C') + B'C + AC        // expand AB
              = ABC + ABC' + B'C + AC
              = (ABC + AC) + ABC' + B'C        // factor AC
              = AC + ABC' + B'C
              = AC(1) + AB·C' + B'C            // hmm trying again
\`\`\`

באמת: AC is redundant in min-cover, BUT it's necessary for hazard freedom.

### למה זה פותר את ה-Glitch

נתון A=1, C=1, B עובר 1→0:

| Time | g1 (AB) | g3 (B'C) | **g5 (AC)** | F = OR(g1, g3, g5) |
|:---:|:---:|:---:|:---:|:---:|
| t<0 | 1 | 0 | **1** | 1 |
| t=60 ps | **0** | 0 | **1** | **1** ✓ (AC מחזיק!) |
| t=90 ps | 0 | **1** | **1** | 1 |

**ה-A·C signal לא תלוי ב-B כלל** — הוא נשאר 1 לאורך כל המעבר של B. ה-OR מחזיק את F=1.

### Implementation

\`\`\`
                          g5 = A · C   (60 ps)
                              ┌────────┐
                  A ──────────┤  AND   ├────┐
                  C ──────────┤        │    │
                              └────────┘    │
                                            ▼
            g1 ────────────────────────→ ┌─────┐
            g3 ────────────────────────→ │ OR  │──── F (hazard-free)
                                          │ (3) │
                                          └─────┘
\`\`\`

תוספת: gate אחד (AND עוד אחד), והרחבת OR ל-3-input. **חינם** מבחינת logic complexity, חיוני מבחינת correctness.

### עלות

- Area: +1 AND gate (~5%).
- Power: +1 gate, אבל **חוסך** power של glitches (toggles אנרגטיים) → לרוב נטו חיובי.
- Delay: השכבה הקריטית לא משתנה (AC הוא בעצמו 60 ps, כמו AB).

### ה-Rule הכללי

**Consensus rule**: בכל זוג implicants סמוכים על K-map שנפגשים על variable יחיד שמתחלף ביניהם — קיים implicant שלישי (ה-consensus) שמכסה את התפר.

ב-design ידני: זה השלב שאחרי "minimum cover" — בדוק כל זוג סמוך, הוסף consensus term אם צריך.

ב-EDA tools: \`hazard-free synthesis\` מסומן ב-Synopsys/Cadence (לעיצובים async או speed-critical).`,
        interviewerMindset:
`**שאלת תיקון.** המראיין מחפש:
1. **שאתה זוכר את שם ה-term** — "consensus term" או "redundant prime implicant". לא "third implicant".
2. **שאתה מסביר למה לוגית הוא redundant** — chord rule: AB + B\'C + AC = AB + B\'C.
3. **שאתה מסביר למה הוא לא redundant פיזית** — מחזיק את F בזמן המעבר.
4. **שאתה מציין את ה-trade-off** — קצת area, חסכון בpower.

**שאלת המשך**: "האם תמיד צריך consensus term?" → רק אם יש שני implicants סמוכים שלא חופפים. בכל K-map עם hazards פוטנציאליים → כן.

**שאלת bonus**: "מה אם הפונקציה היא XOR?" → ב-K-map "שחמט" (כל תא 1 מוקף ב-0s). אין שני 1-cells סמוכים → אין static-1 hazard מובנה. (אבל ייתכן dynamic hazard ב-XOR multi-level — סעיף ה'.)

**מלכודת**: סטודנט שמציע "להוסיף FF ביציאה" → זה pipelining, לא תיקון hazard. הסעיף הבא (ה') חוזר לעניין הזה.`,
        expectedAnswers: [
          'consensus term', 'redundant prime implicant',
          'A·C', 'AC',
          'hazard-free',
          'consensus rule',
          'g5',
        ],
        circuit: () => build(() => {
          // Hazard-free version: F = AB + B'C + AC
          // Added g5 (A AND C) and switched g4 to 3-input OR.
          const a = h.input(80, 100, 'A');  a.fixedValue = 1;
          const b = h.input(80, 240, 'B');  b.fixedValue = 1;
          const c = h.input(80, 380, 'C');  c.fixedValue = 1;

          const g1 = h.gate('AND', 280, 140);    // A·B
          const g2 = h.gate('NOT', 280, 280);    // B'
          const g3 = h.gate('AND', 460, 320);    // B'·C
          const g5 = h.gate('AND', 460, 420);    // A·C (NEW)
          const g4 = h.gate('OR',  640, 260);    // 3-input OR (set inputCount=3)
          g4.inputCount = 3;

          const fOut = h.output(820, 260, 'F');

          return {
            nodes: [a, b, c, g1, g2, g3, g5, g4, fOut],
            wires: [
              h.wire(a.id, g1.id, 0),
              h.wire(b.id, g1.id, 1),
              h.wire(b.id, g2.id, 0),
              h.wire(g2.id, g3.id, 0),
              h.wire(c.id, g3.id, 1),
              h.wire(a.id, g5.id, 0),    // A → g5
              h.wire(c.id, g5.id, 1),    // C → g5
              h.wire(g1.id, g4.id, 0),
              h.wire(g3.id, g4.id, 1),
              h.wire(g5.id, g4.id, 2),    // A·C → OR
              h.wire(g4.id, fOut.id, 0),
            ],
          };
        }),
        answerSchematic: `
<svg viewBox="0 0 1000 580" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="K-map with the consensus term A·C added as a third implicant covering the hazard gap.">

  <text x="500" y="44" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    תיקון: הוספת A·C כ-consensus term
  </text>

  <!-- Axis labels -->
  <text x="500" y="100" text-anchor="middle" fill="#80c8ff" font-size="20" font-weight="bold">BC (Gray)</text>
  <text x="200" y="260" fill="#80c8ff" font-size="20" font-weight="bold">A</text>

  <g fill="#c8d8f0" font-size="18" text-anchor="middle">
    <text x="320" y="140">00</text>
    <text x="430" y="140">01</text>
    <text x="540" y="140">11</text>
    <text x="650" y="140">10</text>
  </g>
  <g fill="#c8d8f0" font-size="20" text-anchor="end" font-weight="bold">
    <text x="260" y="220">0</text>
    <text x="260" y="320">1</text>
  </g>

  <g stroke="#506080" stroke-width="2" fill="none">
    <rect x="270" y="160" width="440" height="200"/>
    <line x1="380" y1="160" x2="380" y2="360"/>
    <line x1="490" y1="160" x2="490" y2="360"/>
    <line x1="600" y1="160" x2="600" y2="360"/>
    <line x1="270" y1="260" x2="710" y2="260"/>
  </g>

  <g font-size="28" text-anchor="middle" font-weight="bold">
    <text x="325" y="225" fill="#3a4a60">0</text>
    <text x="435" y="225" fill="#ffe080">1</text>
    <text x="545" y="225" fill="#3a4a60">0</text>
    <text x="655" y="225" fill="#3a4a60">0</text>
    <text x="325" y="325" fill="#3a4a60">0</text>
    <text x="435" y="325" fill="#ffe080">1</text>
    <text x="545" y="325" fill="#ffe080">1</text>
    <text x="655" y="325" fill="#ffe080">1</text>
  </g>

  <!-- B'C — blue -->
  <rect x="393" y="170" width="76" height="180" rx="20" fill="none" stroke="#40d0f0" stroke-width="3"/>
  <text x="435" y="408" text-anchor="middle" fill="#40d0f0" font-size="18" font-weight="bold">B'·C</text>

  <!-- AB — green -->
  <rect x="500" y="278" width="200" height="68" rx="20" fill="none" stroke="#39ff80" stroke-width="3"/>
  <text x="600" y="408" text-anchor="middle" fill="#39ff80" font-size="18" font-weight="bold">A·B</text>

  <!-- AC consensus — purple, slightly offset to be visible -->
  <rect x="386" y="288" width="200" height="48" rx="16" fill="none" stroke="#cc66ff" stroke-width="4"/>
  <text x="486" y="440" text-anchor="middle" fill="#cc99ff" font-size="20" font-weight="bold">A·C ✨ (consensus)</text>

  <!-- Conclusion -->
  <rect x="80" y="470" width="840" height="86" rx="10" fill="rgba(204,102,255,0.06)" stroke="#cc66ff" stroke-width="1.8"/>
  <text x="500" y="500" text-anchor="middle" fill="#cc99ff" font-size="18" font-weight="bold">
    F = A·B + B'·C + A·C  ·  לוגית זהה ל-A·B + B'·C
  </text>
  <text x="500" y="528" text-anchor="middle" fill="#c8b090" font-size="16">
    A·C מחזיק את F=1 בזמן המעבר של B → אין glitch
  </text>
  <text x="500" y="550" text-anchor="middle" fill="#a0a0c0" font-size="14" font-style="italic">
    עלות: gate אחד נוסף; חסכון: power של glitches + correctness
  </text>
</svg>`,
      },

      // ─────────────────────────────────────────────────────────
      // Part ד — Static-0 hazard (dual case)
      // ─────────────────────────────────────────────────────────
      {
        label: 'ד',
        question: 'הסבר את ה-**static-0 hazard** — המראה (dual) של static-1. מתי הוא קורה, איך מזהים אותו ב-K-map, ואיך מתקנים אותו? תן דוגמה: \`G(A, B, C) = (A + B) · (B\' + C)\`.',
        hints: [
          'Static-0 hazard: ה-output אמור להישאר 0 בשני תאים סמוכים, אבל קופץ ל-1 לזמן קצר במעבר.',
          'מזהים על K-map של ה-**0-cells**: שני תאים סמוכים עם G=0 מכוסים ע"י "0-implicants" שונים של ה-POS form.',
          'POS = Product of Sums. G = (A+B)(B\'+C). ה-zeros מכוסים ע"י max-terms.',
          'תיקון: דואלי — להוסיף consensus term ל-POS form. במקרה G: הוסף (A+C).',
          'G = (A+B)(B\'+C)(A+C) — הזהה לוגית, hazard-free על 0.',
        ],
        answer:
`## Static-0 Hazard — Dual של Static-1

### דוגמה: \`G(A, B, C) = (A + B) · (B' + C)\`

חישוב truth table:

| A | B | C | A+B | B'+C | G |
|:---:|:---:|:---:|:---:|:---:|:---:|
| 0 | 0 | 0 | 0 | 1 | 0 |
| 0 | 0 | 1 | 0 | 1 | 0 |
| 0 | 1 | 0 | 1 | 0 | 0 |
| 0 | 1 | 1 | 1 | 1 | 1 |
| 1 | 0 | 0 | 1 | 1 | 1 |
| 1 | 0 | 1 | 1 | 1 | 1 |
| 1 | 1 | 0 | 1 | 0 | 0 |
| 1 | 1 | 1 | 1 | 1 | 1 |

K-map:
\`\`\`
       BC=00  BC=01  BC=11  BC=10
A=0:    0      0      1      0
A=1:    1      1      1      0
\`\`\`

### זיהוי ה-Hazard

מסתכלים על **0-cells סמוכים** המכוסים ע"י max-terms שונים של ה-POS form:

- \`(A+B)\` מכסה את כל ה-0-cells בהם A=0 ו-B=0 (התאים (A=0, BC=00) ו-(A=0, BC=01)).
- \`(B'+C)\` מכסה את ה-0-cells בהם B=1 ו-C=0 (התאים (A=0, BC=10) ו-(A=1, BC=10)).

המעבר ה-בעייתי: **A=0, C=0, B עובר 0→1**.
- לפני: (A=0, B=0, C=0) → G=0, מכוסה ע"י (A+B): A+B = 0.
- אחרי: (A=0, B=1, C=0) → G=0, מכוסה ע"י (B'+C): B'+C = 0.
- בתפר: שני max-terms שונים — glitch ל-1 אפשרי.

### תיקון: הוסף Consensus Term ב-POS

ה-consensus של \`(A+B)\` ו-\`(B'+C)\` הוא **\`(A+C)\`**:

\`\`\`
G = (A + B) · (B' + C) · (A + C)
\`\`\`

ב-K-map: (A+C) מכסה את התאים שבהם A=0 **ו**-C=0 → (A=0, BC=00) ו-(A=0, BC=10) — ה-0-cells הסמוכים שבעיה.

### Hazard-Free Implementation

| Gate | Function | מקור |
|---|---|---|
| OR1 | A + B | original |
| OR2 | B' + C | original |
| **OR3** | **A + C** | **consensus (new)** |
| AND3 | (A+B)(B'+C)(A+C) | 3-input AND |

### הסיכום הדואלי

| | Static-1 | Static-0 |
|---|---|---|
| Form | SOP (sum of products) | POS (product of sums) |
| Adjacent cells | שני 1-cells | שני 0-cells |
| Glitch | 1 → 0 → 1 | 0 → 1 → 0 |
| Implicants | min-terms (covers of 1s) | max-terms (covers of 0s) |
| Fix | consensus min-term | consensus max-term |

**כל פונקציה** יכולה לחוות **או** static-1 **או** static-0 hazards (תלוי במעבר). תיקון hazard-free דורש בדיקת שני הצדדים.

### בעיצוב EDA

\`Hazard-free synthesis\` בדרך כלל בודק שני הסוגים. ב-async logic זה חובה; ב-sync logic לרוב מספיק לשמור על setup time גדול מספיק.`,
        interviewerMindset:
`**שאלת dualism.** המראיין מחפש:
1. **שאתה מבין שזה דואלי לחלוטין** — לא רק "הפוך". ה-POS form עובד באותו רעיון על 0-cells.
2. **שאתה זוכר את שני המבנים** — SOP ל-static-1, POS ל-static-0.
3. **שאתה מציין שהבדיקה חייבת להיות לשני הסוגים** — לא רק "תקנתי static-1, סיימתי".

**שאלת המשך**: "מתי static-0 מסוכן יותר מ-static-1?" → בעיצוב active-low logic. אם signal משמש כ-enable (active when 0), glitch ל-1 הוא "false disable" — יכול לאפשר rare-case bug.

**שאלת bonus**: "האם XOR יכול לחוות static-0?" → כן, על האפס-תאים. אבל ב-XOR ה-K-map הוא "שחמט" — אין שני 0-cells סמוכים, אז אין static hazard מובנה.`,
        expectedAnswers: [
          'static-0 hazard', 'static 0 hazard',
          'POS', 'product of sums',
          'max-terms', '0-cells',
          'consensus term', 'A+C',
          'dual', 'דואלי',
          'hazard-free',
        ],
        circuit: () => build(() => {
          // G = (A+B)(B'+C) — gate-level
          const a = h.input(80, 100, 'A');  a.fixedValue = 0;
          const b = h.input(80, 240, 'B');  b.fixedValue = 1;
          const c = h.input(80, 380, 'C');  c.fixedValue = 0;

          const or1 = h.gate('OR',  280, 160);   // A + B
          const g2  = h.gate('NOT', 280, 280);   // B'
          const or2 = h.gate('OR',  460, 320);   // B' + C
          const and3 = h.gate('AND', 640, 220);  // (A+B)·(B'+C)
          const gOut = h.output(820, 220, 'G');

          return {
            nodes: [a, b, c, or1, g2, or2, and3, gOut],
            wires: [
              h.wire(a.id, or1.id, 0),
              h.wire(b.id, or1.id, 1),
              h.wire(b.id, g2.id, 0),
              h.wire(g2.id, or2.id, 0),
              h.wire(c.id, or2.id, 1),
              h.wire(or1.id, and3.id, 0),
              h.wire(or2.id, and3.id, 1),
              h.wire(and3.id, gOut.id, 0),
            ],
          };
        }),
        answerSchematic: `
<svg viewBox="0 0 1000 540" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="K-map of G with the static-0 hazard between adjacent 0-cells, fixed by consensus term A+C.">

  <text x="500" y="44" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    Static-0 Hazard — K-map של G
  </text>
  <text x="500" y="78" text-anchor="middle" fill="#a0a0c0" font-size="16" font-style="italic">
    G = (A+B)(B'+C) · נסתכל על ה-0-cells
  </text>

  <text x="500" y="118" text-anchor="middle" fill="#80c8ff" font-size="18" font-weight="bold">BC (Gray)</text>
  <text x="220" y="260" fill="#80c8ff" font-size="18" font-weight="bold">A</text>

  <g fill="#c8d8f0" font-size="16" text-anchor="middle">
    <text x="320" y="148">00</text>
    <text x="430" y="148">01</text>
    <text x="540" y="148">11</text>
    <text x="650" y="148">10</text>
  </g>
  <g fill="#c8d8f0" font-size="18" text-anchor="end" font-weight="bold">
    <text x="260" y="220">0</text>
    <text x="260" y="320">1</text>
  </g>

  <g stroke="#506080" stroke-width="2" fill="none">
    <rect x="270" y="160" width="440" height="200"/>
    <line x1="380" y1="160" x2="380" y2="360"/>
    <line x1="490" y1="160" x2="490" y2="360"/>
    <line x1="600" y1="160" x2="600" y2="360"/>
    <line x1="270" y1="260" x2="710" y2="260"/>
  </g>

  <g font-size="28" text-anchor="middle" font-weight="bold">
    <text x="325" y="225" fill="#ff8080">0</text>
    <text x="435" y="225" fill="#ff8080">0</text>
    <text x="545" y="225" fill="#3a4a60">1</text>
    <text x="655" y="225" fill="#ff8080">0</text>
    <text x="325" y="325" fill="#3a4a60">1</text>
    <text x="435" y="325" fill="#3a4a60">1</text>
    <text x="545" y="325" fill="#3a4a60">1</text>
    <text x="655" y="325" fill="#ff8080">0</text>
  </g>

  <!-- (A+B) max-term — covers A=0,B=0 cells = (A=0, BC=00) and (A=0, BC=01) -->
  <rect x="285" y="180" width="180" height="60" rx="16" fill="none" stroke="#40d0f0" stroke-width="3"/>
  <text x="375" y="406" text-anchor="middle" fill="#40d0f0" font-size="16" font-weight="bold">(A+B) → 0 כש A=0,B=0</text>

  <!-- (B'+C) max-term — covers B=1,C=0 cells = (A=0, BC=10) and (A=1, BC=10) -->
  <rect x="615" y="180" width="76" height="180" rx="16" fill="none" stroke="#f0a040" stroke-width="3"/>
  <text x="655" y="406" text-anchor="middle" fill="#f0a040" font-size="16" font-weight="bold">(B'+C) → 0 כש B=1,C=0</text>

  <!-- Consensus (A+C) — covers A=0,C=0 cells -->
  <rect x="285" y="170" width="80" height="80" rx="16" fill="none" stroke="#cc66ff" stroke-width="4" stroke-dasharray="5,3"/>
  <rect x="615" y="170" width="80" height="80" rx="16" fill="none" stroke="#cc66ff" stroke-width="4" stroke-dasharray="5,3"/>
  <text x="500" y="440" text-anchor="middle" fill="#cc99ff" font-size="18" font-weight="bold">+ (A+C) ✨ consensus → 0 כש A=0,C=0</text>

  <!-- Conclusion -->
  <rect x="80" y="468" width="840" height="46" rx="10" fill="rgba(204,102,255,0.06)" stroke="#cc66ff" stroke-width="1.8"/>
  <text x="500" y="496" text-anchor="middle" fill="#cc99ff" font-size="16" font-weight="bold">
    G = (A+B)(B'+C)(A+C)  ·  hazard-free על שני ה-static types
  </text>
</svg>`,
      },

      // ─────────────────────────────────────────────────────────
      // Part ה — Dynamic hazard
      // ─────────────────────────────────────────────────────────
      {
        label: 'ה',
        question: 'נתון מעגל multi-level שבו אותו signal עובר מספר מסלולים שונים עם delays שונים. מה זה **dynamic hazard**, איך הוא נראה בתרשים-זמן, ולמה consensus term **לא** מספיק כדי לתקן אותו? מה הפתרון הסטנדרטי?',
        hints: [
          'Dynamic hazard: ה-output צריך לעבור 0→1 (או 1→0), אבל **קופץ מספר פעמים** לפני שהוא מתייצב: 0→1→0→1 (במקום 0→1).',
          'הסיבה: signal מסתעף ל-N מסלולים, כל אחד עם delay שונה. כל מסלול גורם לקפיצה משלה.',
          'דוגמה: F = A + B כאשר B עובר דרך 2 inverters בטור (B → NOT → NOT → B). כש-A=0 ו-B עובר, האחר עוקב — אם 2 ה-inverters אינם מסונכרנים → glitches מרובים.',
          'Consensus term לא עוזר כי הוא רק "ממלא תפר" של 0/1 אחד. ב-dynamic hazard יש מספר עוברים → consensus יחיד לא מספיק.',
          'הפתרון: **synchronous design** — לשים FF ביציאה. ה-FF דוגם רק בקצה ה-clock, כשה-glitches כבר שקעו.',
          'לחלופין: לעצב את ה-circuit עם **single-path-per-variable** — אבל זה מגביל מאוד את ה-optimization.',
        ],
        answer:
`## Dynamic Hazard

### הגדרה

> **Dynamic hazard**: ה-output אמור לעבור פעם אחת (\`0→1\` או \`1→0\`), אבל בפועל הוא **רץ קדימה ואחורה** מספר פעמים לפני שהוא מתייצב.

תרשים זמן: במקום מעבר \`0 → 1\` נקי, רואים:
\`\`\`
F:  0 ─┐  ┌──┐  ┌──── 1 (final)
       └──┘  └──┘
       ↑ 0→1→0→1→0→1  (3 ספייקים לפני הסתגלות)
\`\`\`

### תנאי קיומו

לפחות **3 מסלולים** של אותו signal עם delays שונים מגיעים ל-output. כל מסלול יוצר edge משלו.

### דוגמה: Triple-Path

\`\`\`
B ──┬──────────────────→ AND──┐
    │                          │
    └─[NOT]─[NOT]─[NOT]─→ AND──┴── OR ──── F
                                   │
                              [NOT]
\`\`\`

נניח כל NOT = 20 ps. כש-B עובר \`1→0\`:
- מסלול ישיר: B→AND_top ב-0 ps.
- מסלול 3 inverters: B→NOT→NOT→NOT→AND_bottom ב-60 ps.

תוצאה: ה-OR רואה את ה-AND_top יורד מהר, ה-AND_bottom עולה איטית, ויש חזרות בין הזמנים. **3 ספייקים אפשריים**.

### למה Consensus Term לא עוזר

Static hazard = "תפר" יחיד בין שני implicants. Consensus = implicant נוסף שגושר עליו.

Dynamic hazard = **מספר תפרים בו-זמנית** עקב מסלולים מרובים. כל "תפר" דורש consensus אחר, וייתכנו תפרים שאין להם consensus סינתטי.

טכנית: dynamic hazard נובע מ-**structure** של הרשת, לא רק מה-truth-table. שינוי הרשת (= synthesis אחר) הוא היחיד שיכול לבטל אותו לחלוטין.

### הפתרון: Synchronous Sampling

הגישה האולטימטיבית: **לסגור את ה-output ב-FF**.

\`\`\`
Inputs → [Combinational, with possible dynamic hazards] → D ───┐
                                                                 │
                                                         FF ────→ Q (clean)
                                                                 │
                                                       CLK ──────┘
\`\`\`

ה-FF דוגם רק בקצה ה-CLK. אם ה-CLK period גדול מספיק (\`T_clk > t_propagation_max + t_glitch_max\`) → ה-FF דוגם רק את הערך הסופי, אחרי שכל ה-glitches שקעו.

זו הסיבה ש-**synchronous design** הוא הסטנדרט בתעשייה: גליטשים פנימיים אינם חשובים כל עוד ה-output נדגם בקצה clock.

### ב-Async Design

כשאין FF בנקודה — חייבים לעצב hazard-free:
- Hazard-free synthesis (algorithmic, יקר ב-area)
- Code disciplines: 1-hot encoding, race-free FSM
- Single-path-per-input — לאסור על reconvergent fanout

### תקציר — Static vs Dynamic

| | Static-1/-0 | Dynamic |
|---|---|---|
| מקור | פערים בין implicants | מסלולים מרובים עם delays שונים |
| Symptom | spike יחיד | spikes מרובים |
| תיקון | consensus term | sync sampling (FF) או redesign |
| ב-K-map | מזוהה מ-cell adjacency | לא מזוהה — דורש gate-level trace |

### בקנבס

ה-engine לא מראה את ה-glitches (אין מודל delay). הצב מעגל הפונקציה במצב סטטי — תקבל את הערך הנכון. ה-dynamic hazard הוא תופעה רק במציאות אמיתית.`,
        interviewerMindset:
`**שאלת סיכום.** המראיין מחפש:
1. **שאתה מבחין בין static ל-dynamic** — לא רק "hazard". ספציפיקציה.
2. **שאתה מבין שזה structural** — לא ניתן לתקן רק על-ידי הוספת terms.
3. **שאתה מציע synchronous design כפתרון** — לא "להחליף gates". פתרון מערכתי.
4. **שאתה מציין trade-off** — sync = יותר latency (FF), פחות פוזיציה ב-async.

**שאלת המשך**: "האם dynamic hazard קורה רק עם NOTs?" → לא. כל reconvergent fanout עם delays שונים יכול לגרום לזה. NOTs פשוט מבליטים את התופעה.

**שאלת bonus**: "Glitch power — כמה גדול?" → ב-CMOS, כל toggle = ½CV²f. glitches מכפילים את ה-toggle count → עד 30% מה-dynamic power של chip יכול להיות "glitch power" ב-design לא אופטימלי. מסחרי: \`glitch-aware synthesis\` חוסך 10-20% power.

**שאלת bonus 2**: "מה אם ה-clock period קטן מ-glitch duration?" → ה-FF ייקלט glitch! ב-overclocking או בdesign closer to f_max זה סיכון אמיתי. לכן יש margin של 20-30% מ-f_max המקסימלי.

**ראה גם**: #5004 (path delay), #5007 (skew) — שלושתם יחד נותנים את התמונה השלמה של combinational hazards.`,
        expectedAnswers: [
          'dynamic hazard',
          'multi-level', 'multiple paths', 'מסלולים מרובים',
          'spike', 'glitch', 'multiple spikes',
          'synchronous', 'FF', 'sample', 'CLK',
          'reconvergent fanout',
          'consensus not enough',
        ],
        circuit: () => build(() => {
          // Demonstrate dynamic hazard scenario: B fans out through
          // multiple inverter paths reconverging at an OR.
          // Engine has no delay model, so this is purely structural.
          const a = h.input(80, 100, 'A');  a.fixedValue = 1;
          const b = h.input(80, 280, 'B');  b.fixedValue = 1;

          const inv1 = h.gate('NOT', 240, 280);
          const inv2 = h.gate('NOT', 380, 280);
          const inv3 = h.gate('NOT', 520, 280);

          const and1 = h.gate('AND', 240, 160);    // A · B (direct)
          const and2 = h.gate('AND', 660, 280);    // A · B''' (3-inv path)

          const or1 = h.gate('OR', 820, 220);
          const fOut = h.output(940, 220, 'F');

          return {
            nodes: [a, b, inv1, inv2, inv3, and1, and2, or1, fOut],
            wires: [
              h.wire(a.id, and1.id, 0),
              h.wire(b.id, and1.id, 1),
              h.wire(b.id, inv1.id, 0),
              h.wire(inv1.id, inv2.id, 0),
              h.wire(inv2.id, inv3.id, 0),
              h.wire(a.id, and2.id, 0),
              h.wire(inv3.id, and2.id, 1),
              h.wire(and1.id, or1.id, 0),
              h.wire(and2.id, or1.id, 1),
              h.wire(or1.id, fOut.id, 0),
            ],
          };
        }),
        answerSchematic: `
<svg viewBox="0 0 1000 480" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="18" role="img" aria-label="Timing diagram of a dynamic hazard with multiple spikes followed by FF synchronous capture.">

  <text x="500" y="44" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="28">
    Dynamic Hazard — מספר spikes
  </text>
  <text x="500" y="78" text-anchor="middle" fill="#a0a0c0" font-size="16" font-style="italic">
    מסלולים מרובים עם delays שונים → התנדנדות
  </text>

  <!-- Time axis -->
  <line x1="160" y1="380" x2="900" y2="380" stroke="#a0a0c0" stroke-width="2"/>
  ${[0, 30, 60, 90, 120, 150, 180].map(t => {
    const x = 160 + (t / 180) * 740;
    return `
      <line x1="${x}" y1="375" x2="${x}" y2="385" stroke="#a0a0c0" stroke-width="1.4"/>
      <text x="${x}" y="408" text-anchor="middle" fill="#a0a0c0" font-size="13">${t} ps</text>
    `;
  }).join('')}

  <!-- B transition -->
  <text x="40" y="130" fill="#cca040" font-size="15" font-weight="bold">B</text>
  ${(() => {
    const X = t => 160 + (t / 180) * 740;
    return `
      <line x1="130" y1="110" x2="${X(0)}" y2="110" stroke="#cca040" stroke-width="3"/>
      <line x1="${X(0)}" y1="110" x2="${X(0)}" y2="146" stroke="#cca040" stroke-width="3"/>
      <line x1="${X(0)}" y1="146" x2="920" y2="146" stroke="#cca040" stroke-width="3"/>
    `;
  })()}

  <!-- F output (dynamic hazard - 3 spikes before settling) -->
  <text x="40" y="240" fill="#ff9933" font-size="15" font-weight="bold">F</text>
  ${(() => {
    const X = t => 160 + (t / 180) * 740;
    const yHi = 210;
    const yLo = 250;
    return `
      <line x1="130" y1="${yHi}" x2="${X(20)}" y2="${yHi}" stroke="#ff9933" stroke-width="3"/>
      <line x1="${X(20)}" y1="${yHi}" x2="${X(20)}" y2="${yLo}" stroke="#ff9933" stroke-width="3"/>
      <line x1="${X(20)}" y1="${yLo}" x2="${X(40)}" y2="${yLo}" stroke="#ff9933" stroke-width="3"/>
      <line x1="${X(40)}" y1="${yLo}" x2="${X(40)}" y2="${yHi}" stroke="#ff9933" stroke-width="3"/>
      <line x1="${X(40)}" y1="${yHi}" x2="${X(70)}" y2="${yHi}" stroke="#ff9933" stroke-width="3"/>
      <line x1="${X(70)}" y1="${yHi}" x2="${X(70)}" y2="${yLo}" stroke="#ff9933" stroke-width="3"/>
      <line x1="${X(70)}" y1="${yLo}" x2="${X(100)}" y2="${yLo}" stroke="#ff9933" stroke-width="3"/>
      <line x1="${X(100)}" y1="${yLo}" x2="${X(100)}" y2="${yHi}" stroke="#ff9933" stroke-width="3"/>
      <line x1="${X(100)}" y1="${yHi}" x2="920" y2="${yHi}" stroke="#ff9933" stroke-width="3"/>
    `;
  })()}

  <!-- Spike annotations -->
  <text x="${160 + (30/180) * 740}" y="280" text-anchor="middle" fill="#ff6060" font-size="14" font-weight="bold">spike 1</text>
  <text x="${160 + (85/180) * 740}" y="280" text-anchor="middle" fill="#ff6060" font-size="14" font-weight="bold">spike 2</text>

  <!-- CLK marker with FF capture -->
  <line x1="${160 + (150/180) * 740}" y1="320" x2="${160 + (150/180) * 740}" y2="160" stroke="#cc66ff" stroke-width="2.4" stroke-dasharray="6,3"/>
  <text x="${160 + (150/180) * 740}" y="350" text-anchor="middle" fill="#cc99ff" font-size="14" font-weight="bold">CLK edge ↑</text>
  <text x="${160 + (155/180) * 740}" y="200" fill="#80f0a0" font-size="14" font-weight="bold">✓ FF samples 1 (final)</text>

  <!-- Bottom -->
  <rect x="60" y="430" width="880" height="40" rx="8" fill="rgba(128,240,160,0.06)" stroke="#80f0a0" stroke-width="1.8"/>
  <text x="500" y="456" text-anchor="middle" fill="#80f0a0" font-size="16" font-weight="bold">
    הפתרון: FF דוגם רק בקצה CLK — אחרי שכל ה-spikes שקעו
  </text>
</svg>`,
      },
    ],
    source: 'Glitches & Hazards — K-map, consensus, dynamic',
    tags: ['glitch', 'hazard', 'static-hazard', 'dynamic-hazard', 'k-map', 'consensus-term', 'combinational'],
    circuitRevealsAnswer: true,
  },
];
