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
<svg viewBox="0 0 480 240" xmlns="http://www.w3.org/2000/svg" font-family="'JetBrains Mono', monospace" font-size="11" role="img" aria-label="Three-stage shift register with clock and input waveforms">
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
    <text x="258" y="110" fill="#f08080" font-size="11" font-weight="bold">התחלה</text>
  </g>

  <!-- Schematic: input → DFF → DFF → DFF → out, all sharing clk -->
  <g transform="translate(0, 130)">
    <text x="0" y="35" fill="#c8d8f0">input</text>
    <line x1="40" y1="32" x2="78" y2="32" stroke="#c8d8f0" stroke-width="1.4" marker-end="url(#ivArrow)"/>

    <!-- DFF 1 -->
    <rect x="78" y="10" width="80" height="50" fill="#0a1520" stroke="#80f0a0" stroke-width="1.6" rx="3"/>
    <text x="118" y="35" text-anchor="middle" fill="#80f0a0" font-weight="bold">DFF</text>
    <text x="86"  y="22" fill="#80a0c0" font-size="9">D</text>
    <text x="148" y="22" text-anchor="end" fill="#80a0c0" font-size="9">Q</text>
    <text x="118" y="56" text-anchor="middle" fill="#80a0c0" font-size="9">clk</text>

    <!-- Q1 -> D2 -->
    <line x1="158" y1="32" x2="200" y2="32" stroke="#c8d8f0" stroke-width="1.4" marker-end="url(#ivArrow)"/>

    <!-- DFF 2 -->
    <rect x="200" y="10" width="80" height="50" fill="#0a1520" stroke="#80f0a0" stroke-width="1.6" rx="3"/>
    <text x="240" y="35" text-anchor="middle" fill="#80f0a0" font-weight="bold">DFF</text>
    <text x="208" y="22" fill="#80a0c0" font-size="9">D</text>
    <text x="270" y="22" text-anchor="end" fill="#80a0c0" font-size="9">Q</text>
    <text x="240" y="56" text-anchor="middle" fill="#80a0c0" font-size="9">clk</text>

    <!-- Q2 -> D3 -->
    <line x1="280" y1="32" x2="322" y2="32" stroke="#c8d8f0" stroke-width="1.4" marker-end="url(#ivArrow)"/>

    <!-- DFF 3 -->
    <rect x="322" y="10" width="80" height="50" fill="#0a1520" stroke="#80f0a0" stroke-width="1.6" rx="3"/>
    <text x="362" y="35" text-anchor="middle" fill="#80f0a0" font-weight="bold">DFF</text>
    <text x="330" y="22" fill="#80a0c0" font-size="9">D</text>
    <text x="392" y="22" text-anchor="end" fill="#80a0c0" font-size="9">Q</text>
    <text x="362" y="56" text-anchor="middle" fill="#80a0c0" font-size="9">clk</text>

    <!-- Out -->
    <line x1="402" y1="32" x2="448" y2="32" stroke="#c8d8f0" stroke-width="1.4" marker-end="url(#ivArrow)"/>
    <text x="455" y="35" fill="#c8d8f0">out</text>

    <!-- Shared clk bus -->
    <line x1="118" y1="60" x2="118" y2="78" stroke="#f0d080" stroke-width="1.2"/>
    <line x1="240" y1="60" x2="240" y2="78" stroke="#f0d080" stroke-width="1.2"/>
    <line x1="362" y1="60" x2="362" y2="78" stroke="#f0d080" stroke-width="1.2"/>
    <line x1="118" y1="78" x2="362" y2="78" stroke="#f0d080" stroke-width="1.2"/>
    <text x="370" y="82" fill="#f0d080" font-size="10">clk</text>
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
     font-family="'JetBrains Mono', monospace" font-size="13" role="img" aria-label="3 D-FF chain with shared clock">
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
    <text direction="ltr" x="${155 + (i - 1) * 160}" y="100" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="14">DFF${i}</text>
    <text direction="ltr" x="${155 + (i - 1) * 160}" y="120" text-anchor="middle" fill="#a0c0e0" font-size="10">D    Q</text>
    <text direction="ltr" x="${155 + (i - 1) * 160}" y="148" text-anchor="middle" fill="#80d4ff" font-size="10">↑ clk</text>
  `).join('')}

  <!-- Input arrow -->
  <text direction="ltr" x="40" y="116" text-anchor="middle" fill="#f0d080" font-weight="bold">input</text>
  <line x1="78" y1="112" x2="100" y2="112" stroke="#f0d080" stroke-width="1.6"/>
  <polygon points="100,112 94,108 94,116" fill="#f0d080"/>

  <!-- Q1 → DFF2.D -->
  <line x1="210" y1="112" x2="260" y2="112" stroke="#80d4ff" stroke-width="1.4"/>
  <text direction="ltr" x="235" y="106" text-anchor="middle" fill="#80d4ff" font-size="10">Q1</text>
  <polygon points="260,112 254,108 254,116" fill="#80d4ff"/>

  <!-- Q2 → DFF3.D -->
  <line x1="370" y1="112" x2="420" y2="112" stroke="#80d4ff" stroke-width="1.4"/>
  <text direction="ltr" x="395" y="106" text-anchor="middle" fill="#80d4ff" font-size="10">Q2</text>
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
        question: 'מה תצפה לראות ב-\\\`out\\\` לאחר 3 מחזורי שעון? (assumes input is asserted at start)',
        hints: [
          'כל D-FF "מאחר" את הסיגנל ב-cycle אחד.',
          '3 D-FFs בשרשרת → הסיגנל מתאחר ב-3 cycles.',
          'אם \\\`input = 1\\\` משעה \\\`t=0\\\`, אז \\\`out = 1\\\` משעה \\\`t = 3T_clk\\\` (T_clk = תקופה).',
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
     font-family="'JetBrains Mono', monospace" font-size="12" role="img" aria-label="3-DFF chain timing diagram showing 3-cycle delay">
  <!-- Title -->
  <rect x="0" y="0" width="720" height="40" fill="#0c1a28"/>
  <text direction="ltr" x="360" y="26" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="14">
    3-DFF chain: each clock advances the signal one stage → 3-cycle delay
  </text>

  <!-- t=0 marker -->
  <text direction="ltr" x="106" y="64" fill="#f0d080" font-size="10" font-weight="bold">t=0</text>
  <line x1="120" y1="68" x2="120" y2="360" stroke="#806040" stroke-width="0.6" stroke-dasharray="2 3"/>
  <polygon points="120,74 116,66 124,66" fill="#f0d080"/>

  <!-- Clock edge markers + labels -->
  ${[1, 2, 3, 4].map((n, i) => {
    const x = 180 + i * 100;
    return `
      <line x1="${x}" y1="86" x2="${x}" y2="360" stroke="#806040" stroke-width="0.5" stroke-dasharray="2 4"/>
      <text direction="ltr" x="${x}" y="80" text-anchor="middle" fill="#ff8060" font-size="11" font-weight="bold">${n}</text>
      <text direction="ltr" x="${x}" y="68" text-anchor="middle" fill="#ff8060" font-size="10">↑</text>
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
  <text direction="ltr" x="680" y="174" text-anchor="middle" fill="#80b0e0" font-size="10" font-style="italic">high from t=0</text>

  <!-- Q1 waveform: rises after clk 1 (x=180) -->
  <text direction="ltr" x="60" y="230" text-anchor="end" fill="#c8d8f0" font-weight="bold">Q1</text>
  <path d="M 120 240 h 60 v -22 h 470"
        stroke="#80f0a0" stroke-width="1.8" fill="none"/>
  <text direction="ltr" x="680" y="224" text-anchor="middle" fill="#80f0a0" font-size="10" font-style="italic">↑ at clk 1</text>

  <!-- Q2 waveform: rises after clk 2 (x=280) -->
  <text direction="ltr" x="60" y="280" text-anchor="end" fill="#c8d8f0" font-weight="bold">Q2</text>
  <path d="M 120 290 h 160 v -22 h 370"
        stroke="#80f0a0" stroke-width="1.8" fill="none"/>
  <text direction="ltr" x="680" y="274" text-anchor="middle" fill="#80f0a0" font-size="10" font-style="italic">↑ at clk 2</text>

  <!-- Q3=out waveform: rises after clk 3 (x=380) -->
  <text direction="ltr" x="60" y="330" text-anchor="end" fill="#ffd060" font-weight="bold">Q3=out</text>
  <path d="M 120 340 h 260 v -22 h 270"
        stroke="#ffd060" stroke-width="2.2" fill="none"/>
  <text direction="ltr" x="680" y="324" text-anchor="middle" fill="#ffd060" font-size="10" font-style="italic">↑ at clk 3</text>
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
          'בשרשרת \\\`DFF1 → DFF2\\\`: אם \\\`Q1\\\` משתנה (מתעדכן ל-input) ובאותו קלוק \\\`DFF2.D\\\` (= Q1) הצליח להעביר את הערך החדש ל-\\\`DFF2\\\` — זה Hold violation.',
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
          'בשרשרת \\\`DFF1 → DFF2\\\`: אם \\\`Q1\\\` עוד לא יציב כש-clk עולה ב-DFF2 → DFF2 שומר את הערך הישן (לא קולט).',
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
    difficulty: 'medium',
    title: 'שאלת ראיון — זיהוי רכיב מתוך מימוש שערים',
    intro:
`**שאלה אמיתית מראיון.** ניתן לפניך מימוש gate-level של מעגל קומבינטורי:

- **4 כניסות**: \`A0, A1, B0, B1\`
- **3 יציאות**: \`S0, S1, S2\`
- **7 שערים**: 3 × XOR, 3 × AND, 1 × OR

ה-XORs / ANDs / OR מחוברים ביניהם כפי שמופיע בשרטוט. אין שום תיוג ברמה גבוהה — רק שערים וחוטים.`,
    schematic: `
<svg viewBox="0 0 1120 740" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="16" role="img" aria-label="Gate-level netlist of seven gates wired together with clear input fan-outs.">

  <text x="560" y="36" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="24">
    מעגל קומבינטורי — 4 כניסות, 3 יציאות, 7 שערים
  </text>
  <text x="560" y="62" text-anchor="middle" fill="#a0a0c0" font-size="15" font-style="italic">
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
    <text x="265" y="148" text-anchor="middle" fill="#a0c0d0" font-size="14" font-weight="bold">XOR1</text>
  </g>
  <!-- XOR1 output → S0 (long horizontal to right edge) -->
  <line x1="310" y1="190" x2="1040" y2="190" stroke="#ff9933" stroke-width="2.2"/>

  <!-- =================================================
       AND1 (A0 · B0) — produces internal C1 (carry from bit 0)
       Body: x=220-300, inputs at y=255,285; output at y=270
       ================================================= -->
  <g>
    <path d="M 220 240 L 250 240 A 30 30 0 0 1 250 300 L 220 300 Z" fill="#1a2230" stroke="#80c8ff" stroke-width="2.2"/>
    <text x="246" y="276" text-anchor="middle" fill="#80c8ff" font-size="14" font-weight="bold">AND1</text>
  </g>

  <!-- C1 trunk: AND1.out (300, 270) → right to (480, 270),
       then down to (480, 510) splitting into XOR3.in1 and AND3.in1 -->
  <line x1="300" y1="270" x2="480" y2="270" stroke="#cc66ff" stroke-width="2.4"/>
  <text x="385" y="260" text-anchor="middle" fill="#cc99ff" font-size="14" font-style="italic" font-weight="bold">net C1</text>
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
    <text x="265" y="358" text-anchor="middle" fill="#a0c0d0" font-size="14" font-weight="bold">XOR2</text>
  </g>

  <!-- P trunk: XOR2.out (310, 400) → right to (400, 400),
       then up to XOR3.in0 (440, 390) and down to AND3.in0 (440, 490) -->
  <line x1="310" y1="400" x2="400" y2="400" stroke="#ff9933" stroke-width="2.4"/>
  <text x="355" y="390" text-anchor="middle" fill="#ffc080" font-size="14" font-style="italic" font-weight="bold">net P</text>
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
    <text x="246" y="588" text-anchor="middle" fill="#80c8ff" font-size="14" font-weight="bold">AND2</text>
  </g>

  <!-- G trunk: AND2.out (300, 580) → right all the way to OR1.in0 (760, 580 → up to 555) -->
  <line x1="300" y1="580" x2="730" y2="580" stroke="#80c8ff" stroke-width="2.4"/>
  <text x="500" y="570" text-anchor="middle" fill="#80c8ff" font-size="14" font-style="italic" font-weight="bold">net G</text>
  <line x1="730" y1="580" x2="730" y2="555" stroke="#80c8ff" stroke-width="2.4"/>
  <line x1="730" y1="555" x2="760" y2="555" stroke="#80c8ff" stroke-width="2.4"/>

  <!-- =================================================
       XOR3 (P ⊕ C1) — produces S1
       Body: x=540-630, inputs at y=390,420; output at y=405
       ================================================= -->
  <g>
    <path d="M 540 377 Q 565 405, 540 433 L 570 433 Q 610 433, 630 405 Q 610 377, 570 377 Z" fill="#1a3a2a" stroke="#80f0a0" stroke-width="2.2"/>
    <text x="588" y="411" text-anchor="middle" fill="#80f0a0" font-size="20" font-weight="bold">⊕</text>
    <text x="585" y="363" text-anchor="middle" fill="#a0c0d0" font-size="14" font-weight="bold">XOR3</text>
  </g>
  <!-- XOR3 output → S1 -->
  <line x1="630" y1="405" x2="1040" y2="405" stroke="#ff9933" stroke-width="2.2"/>

  <!-- =================================================
       AND3 (P · C1)
       Body: x=540-620, inputs at y=480,510; output at y=495
       ================================================= -->
  <g>
    <path d="M 540 465 L 570 465 A 30 30 0 0 1 570 525 L 540 525 Z" fill="#1a2230" stroke="#80c8ff" stroke-width="2.2"/>
    <text x="566" y="501" text-anchor="middle" fill="#80c8ff" font-size="14" font-weight="bold">AND3</text>
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
    <text x="800" y="582" text-anchor="middle" fill="#ffc080" font-size="22" font-weight="bold">≥1</text>
    <text x="800" y="525" text-anchor="middle" fill="#a0c0d0" font-size="14" font-weight="bold">OR1</text>
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
  <text x="560" y="700" text-anchor="middle" fill="#a0a0c0" font-size="15" font-style="italic">
    7 שערים: 3 × XOR (⊕) · 3 × AND · 1 × OR (≥1)
  </text>
  <text x="560" y="722" text-anchor="middle" fill="#80c8ff" font-size="13">
    net C1 ≡ AND1.out   ·   net P ≡ XOR2.out   ·   net G ≡ AND2.out
  </text>
</svg>`,
    parts: [
      {
        label: 'א',
        question: '**איזה רכיב ממשים במעגל**?',
        hints: [
          'התחל בלמפות את ה-Boolean expression של כל יציאה: \\\`S0 = ?\\\`, \\\`S1 = ?\\\`, \\\`S2 = ?\\\`.',
          'XOR1 נותן \\\`S0 = A0 ⊕ B0\\\`. אם רואים XOR בין שני ביטים — הוא מחבר חד-ביטי.',
          'AND1 נותן \\\`carry = A0 · B0\\\`. כתיבת ה-truth table של \\\`(A0, B0) → (S0, carry)\\\` נראית כמו half-adder.',
          'XOR3 מחבר את \\\`P = A1 ⊕ B1\\\` עם carry-in מ-AND1. \\\`S1 = A1 ⊕ B1 ⊕ C1\\\` — זה ה-SUM של full-adder.',
          'OR1 מקבל \\\`(A1·B1)\\\` ו-\\\`(P·C1)\\\` ⇒ \\\`S2 = A1·B1 + (A1⊕B1)·C1\\\` — זה COUT הקלאסי של full-adder.',
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
     font-family="'JetBrains Mono', monospace" font-size="16" role="img" aria-label="Timing diagram showing setup and hold windows around a clock edge.">

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
  <text x="550" y="44" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="26">
    Setup / Hold — חלון "do not change" סביב קצה ה-clock
  </text>

  <!-- ============ WINDOW BANDS (background) ============ -->
  <!-- Setup band: x=440 → 560 (before edge), Hold band: x=560 → 640 (after edge) -->
  <rect x="440" y="80" width="120" height="380" fill="url(#suFill)" stroke="#cc66ff" stroke-width="1.4" stroke-dasharray="6,4" opacity="0.95"/>
  <rect x="560" y="80" width="80"  height="380" fill="url(#hldFill)" stroke="#ff9050" stroke-width="1.4" stroke-dasharray="6,4" opacity="0.95"/>

  <!-- ============ CLOCK EDGE INDICATOR ============ -->
  <line x1="560" y1="80" x2="560" y2="460" stroke="#ff6080" stroke-width="2.4" stroke-dasharray="4,4" opacity="0.85"/>
  <text x="560" y="74" text-anchor="middle" fill="#ff8080" font-weight="bold" font-size="17">↑ rising edge</text>

  <!-- ============ CLK waveform ============ -->
  <text x="50" y="158" fill="#cca040" font-size="22" font-weight="bold">CLK</text>
  <path d="M 130 175 L 260 175 L 260 130 L 390 130 L 390 175 L 560 175 L 560 130 L 720 130 L 720 175 L 880 175 L 880 130 L 1010 130 L 1010 175 L 1060 175"
        fill="none" stroke="#cca040" stroke-width="2.8" stroke-linejoin="miter"/>

  <!-- ============ D waveform ============ -->
  <text x="50" y="280" fill="#80f0a0" font-size="22" font-weight="bold">D</text>
  <!-- D path: LOW → HIGH (OK transition at x=210, far from edge) → LOW (FAIL at x=600, inside hold band) → HIGH (stable) -->
  <path d="M 130 300 L 210 300 L 210 260 L 600 260 L 600 300 L 1060 300"
        fill="none" stroke="#80f0a0" stroke-width="2.8" stroke-linejoin="miter"/>

  <!-- OK transition pill (above D, well outside the band) -->
  <rect x="180" y="216" width="180" height="30" rx="6" fill="rgba(128,240,160,0.15)" stroke="#80f0a0" stroke-width="1.4"/>
  <text x="270" y="237" text-anchor="middle" fill="#80f0a0" font-size="14" font-weight="bold">OK — רחוק מ-edge ✓</text>

  <!-- FAIL transition pill (above D, inside hold band) -->
  <rect x="640" y="216" width="220" height="30" rx="6" fill="rgba(255,96,96,0.15)" stroke="#ff6060" stroke-width="1.6"/>
  <text x="750" y="237" text-anchor="middle" fill="#ff8080" font-size="14" font-weight="bold">FAIL — בתוך חלון hold ✗</text>

  <!-- Arrow from FAIL pill to the offending transition at x=600 -->
  <path d="M 640 234 Q 615 240, 605 256" stroke="#ff8080" stroke-width="1.6" fill="none" opacity="0.75"/>

  <!-- ============ Window labels (large, at the bottom of bands) ============ -->
  <text x="500" y="395" text-anchor="middle" fill="#cc99ff" font-size="19" font-weight="bold">setup</text>
  <text x="500" y="420" text-anchor="middle" fill="#cca0ff" font-size="22" font-weight="bold">t_su</text>

  <text x="600" y="395" text-anchor="middle" fill="#ff9050" font-size="19" font-weight="bold">hold</text>
  <text x="600" y="420" text-anchor="middle" fill="#ffb070" font-size="22" font-weight="bold">t_h</text>

  <!-- "do not change" banner under both bands -->
  <line x1="440" y1="475" x2="640" y2="475" stroke="#ffe080" stroke-width="3"/>
  <line x1="440" y1="468" x2="440" y2="482" stroke="#ffe080" stroke-width="3"/>
  <line x1="640" y1="468" x2="640" y2="482" stroke="#ffe080" stroke-width="3"/>
  <text x="540" y="505" text-anchor="middle" fill="#ffe080" font-size="18" font-weight="bold">"do not change"</text>

  <!-- ============ BOTTOM INFO CARDS (two side-by-side) ============ -->
  <!-- Setup violation card -->
  <rect x="40" y="540" width="510" height="160" rx="10"
        fill="rgba(204,102,255,0.06)" stroke="#cc66ff" stroke-width="1.8"/>
  <text x="295" y="572" text-anchor="middle" fill="#cc99ff" font-weight="bold" font-size="18">
    הפרת SETUP
  </text>
  <text x="60" y="606" fill="#c8b090" font-size="15">→ D מתחלף קרוב מדי <tspan font-weight="bold" fill="#cc99ff">לפני</tspan> ה-edge</text>
  <text x="60" y="632" fill="#c8b090" font-size="15">→ FF נכנס ל-<tspan fill="#ff8080" font-weight="bold">metastable</tspan> או לוכד ערך שגוי</text>
  <text x="60" y="668" fill="#80f0a0" font-size="15" font-weight="bold">
    T_clk ≥ t_clk-q + T_path + t_su
  </text>
  <text x="60" y="688" fill="#a0a0c0" font-size="13" font-style="italic">
    (קובע את ה-Fmax)
  </text>

  <!-- Hold violation card -->
  <rect x="570" y="540" width="490" height="160" rx="10"
        fill="rgba(255,144,80,0.06)" stroke="#ff9050" stroke-width="1.8"/>
  <text x="815" y="572" text-anchor="middle" fill="#ff9050" font-weight="bold" font-size="18">
    הפרת HOLD
  </text>
  <text x="590" y="606" fill="#c8b090" font-size="15">→ D מתחלף קרוב מדי <tspan font-weight="bold" fill="#ff9050">אחרי</tspan> ה-edge</text>
  <text x="590" y="632" fill="#c8b090" font-size="15">→ <tspan fill="#ff8080" font-weight="bold">race</tspan>: ערך חדש דחף את הישן לפני הלכידה</text>
  <text x="590" y="668" fill="#80f0a0" font-size="15" font-weight="bold">
    T_path ≥ t_h − t_clk-q
  </text>
  <text x="590" y="688" fill="#a0a0c0" font-size="13" font-style="italic">
    (לא תלוי ב-T_clk — הוספת buffers מסייעת)
  </text>
</svg>`,
        hints: [
          'שני המספרים האלה הם **תנאים על קלט ה-D של ה-FF סביב קצה ה-clock** — לא על השעון עצמו ולא על Q.',
          '\\\`t_setup\\\` הוא זמן **לפני** קצה השעון העולה: D חייב להיות יציב כבר אז.',
          '\\\`t_hold\\\` הוא זמן **אחרי** קצה השעון העולה: D חייב להישאר יציב עוד קצת.',
          'יחד הם יוצרים "אזור סכנה" סביב קצה ה-clock — חלון שבו D לא יכול לזוז.',
          'הפרה של setup → ה-FF לוכד ערך שגוי או נכנס למצב **metastable** (לא 0 ולא 1).',
          'הפרה של hold → "race" — ערך חדש דחף את הישן לפני ש-FF הספיק ללכוד.',
          'במחבר 2-ביט: ה-critical path הוא A0/B0 → AND1 → C1 → AND3 → OR1 → S2. אם ה-FF במורד הזרם דורש t_setup, צריך \\\`T_clock ≥ T_path + t_setup + t_clk-q\\\`.',
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
          'Setup constraint: \\\`T_clk ≥ t_clk-q + T_longest_path + t_su\\\` — תופס את הנתיב הארוך ביותר.',
          'Hold constraint: \\\`T_shortest_path ≥ t_h − t_clk-q\\\` — תופס את הנתיב הקצר ביותר. נתיב קצר מדי = race.',
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
     font-family="'JetBrains Mono', monospace" font-size="16" role="img" aria-label="Circuit with the two critical paths coloured (SETUP red, HOLD green) at the top; Gantt-style chart of all 6 unique paths at the bottom.">

  <!-- ═══════════════════════════════════════════════════════════
       SECTION 1 — Circuit diagram with the two critical paths
                   colored on the actual gates (top half).
       ═══════════════════════════════════════════════════════════ -->

  <text x="570" y="44" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="26">
    המעגל עם שני המסלולים הקריטיים
  </text>

  <!-- Legend pills (centered) -->
  <rect x="160" y="68" width="370" height="34" rx="8" fill="rgba(255,96,96,0.14)" stroke="#ff6060" stroke-width="1.8"/>
  <circle cx="186" cy="85" r="8" fill="#ff6060"/>
  <text x="206" y="91" fill="#ff8080" font-size="15" font-weight="bold">SETUP critical — נתיב הארוך ביותר</text>

  <rect x="610" y="68" width="370" height="34" rx="8" fill="rgba(128,240,160,0.14)" stroke="#80f0a0" stroke-width="1.8"/>
  <circle cx="636" cy="85" r="8" fill="#80f0a0"/>
  <text x="656" y="91" fill="#80f0a0" font-size="15" font-weight="bold">HOLD critical — נתיב הקצר ביותר</text>

  <!-- ════════ INPUTS (left) ════════ -->
  <g font-size="18" font-weight="bold">
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
    <text x="318" y="166" text-anchor="middle" fill="#80f0a0" font-size="13" font-weight="bold">XOR1</text>
    <text x="318" y="182" text-anchor="middle" fill="#a0c0d0" font-size="11">150 ps</text>
  </g>
  <!-- AND1 -->
  <g>
    <path d="M 280 205 L 310 205 A 25 25 0 0 1 310 255 L 280 255 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="298" y="226" text-anchor="middle" fill="#80c8ff" font-size="13" font-weight="bold">AND1</text>
    <text x="298" y="242" text-anchor="middle" fill="#a0c0d0" font-size="11">120 ps</text>
  </g>
  <!-- XOR2 (SETUP path goes through this) -->
  <g>
    <path d="M 280 355 Q 305 380, 280 405 L 310 405 Q 335 405, 350 380 Q 335 355, 310 355 Z"
          fill="#1a3a2a" stroke="#80f0a0" stroke-width="2.2"/>
    <text x="318" y="376" text-anchor="middle" fill="#80f0a0" font-size="13" font-weight="bold">XOR2</text>
    <text x="318" y="392" text-anchor="middle" fill="#a0c0d0" font-size="11">150 ps</text>
  </g>
  <!-- AND2 -->
  <g>
    <path d="M 280 415 L 310 415 A 25 25 0 0 1 310 465 L 280 465 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="298" y="436" text-anchor="middle" fill="#80c8ff" font-size="13" font-weight="bold">AND2</text>
    <text x="298" y="452" text-anchor="middle" fill="#a0c0d0" font-size="11">120 ps</text>
  </g>
  <!-- XOR3 -->
  <g>
    <path d="M 530 275 Q 555 300, 530 325 L 560 325 Q 585 325, 600 300 Q 585 275, 560 275 Z"
          fill="#1a3a2a" stroke="#80f0a0" stroke-width="2.2"/>
    <text x="568" y="296" text-anchor="middle" fill="#80f0a0" font-size="13" font-weight="bold">XOR3</text>
    <text x="568" y="312" text-anchor="middle" fill="#a0c0d0" font-size="11">150 ps</text>
  </g>
  <!-- AND3 (SETUP path goes through this) -->
  <g>
    <path d="M 530 395 L 560 395 A 25 25 0 0 1 560 445 L 530 445 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="548" y="416" text-anchor="middle" fill="#80c8ff" font-size="13" font-weight="bold">AND3</text>
    <text x="548" y="432" text-anchor="middle" fill="#a0c0d0" font-size="11">120 ps</text>
  </g>
  <!-- OR1 (SETUP path goes through this) -->
  <g>
    <path d="M 740 415 L 770 415 Q 810 415, 820 440 Q 810 465, 770 465 L 740 465 Q 760 440, 740 415 Z"
          fill="#3a2a14" stroke="#ffc080" stroke-width="2.2"/>
    <text x="780" y="436" text-anchor="middle" fill="#ffc080" font-size="13" font-weight="bold">OR1</text>
    <text x="780" y="452" text-anchor="middle" fill="#a0c0d0" font-size="11">100 ps</text>
  </g>

  <!-- ════════ OUTPUTS (right) ════════ -->
  <g font-size="18" font-weight="bold">
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
  <text x="1035" y="163" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="15">HOLD critical</text>
  <text x="1035" y="186" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="20">150 ps</text>

  <!-- SETUP badge near S2 -->
  <rect x="950" y="410" width="170" height="60" rx="8" fill="rgba(255,96,96,0.14)" stroke="#ff6060" stroke-width="1.8"/>
  <text x="1035" y="433" text-anchor="middle" fill="#ff8080" font-weight="bold" font-size="15">SETUP critical</text>
  <text x="1035" y="456" text-anchor="middle" fill="#ff8080" font-weight="bold" font-size="20">370 ps</text>

  <!-- ════════ Path-description labels ════════ -->
  <text x="570" y="525" text-anchor="middle" fill="#ff8080" font-size="14" font-weight="bold">
    SETUP:  A1/B1 → XOR2 → AND3 → OR1 → S2  =  150 + 120 + 100 ps
  </text>
  <text x="570" y="548" text-anchor="middle" fill="#80f0a0" font-size="14" font-weight="bold">
    HOLD:   A0/B0 → XOR1 → S0  =  150 ps
  </text>

  <!-- ════════ Section divider ════════ -->
  <line x1="40" y1="580" x2="1100" y2="580" stroke="#3a4a5a" stroke-width="1.2" stroke-dasharray="6,4"/>

  <!-- ═══════════════════════════════════════════════════════════
       SECTION 2 — Gantt chart of all 6 unique paths
                   (shifted down by 600px via <g transform>)
       ═══════════════════════════════════════════════════════════ -->
  <g transform="translate(0, 600)">

  <text x="570" y="44" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="26">
    כל 6 המסלולים הייחודיים — Gantt of gate delays
  </text>
  <text x="570" y="72" text-anchor="middle" fill="#a0a0c0" font-size="15" font-style="italic">
    AND 120 ps · OR 100 ps · XOR 150 ps    ·    Scale: 1 ps = 1.5 px
  </text>

  <!-- =========== LEGEND (color key) =========== -->
  <g transform="translate(60, 100)">
    <rect x="0" y="0" width="30" height="22" rx="3" fill="rgba(128,200,255,0.4)" stroke="#80c8ff" stroke-width="1.4"/>
    <text x="40" y="16" fill="#80c8ff" font-size="14" font-weight="bold">AND (120 ps)</text>
    <rect x="200" y="0" width="30" height="22" rx="3" fill="rgba(128,240,160,0.4)" stroke="#80f0a0" stroke-width="1.4"/>
    <text x="240" y="16" fill="#80f0a0" font-size="14" font-weight="bold">XOR (150 ps)</text>
    <rect x="400" y="0" width="30" height="22" rx="3" fill="rgba(255,192,128,0.45)" stroke="#ffc080" stroke-width="1.4"/>
    <text x="440" y="16" fill="#ffc080" font-size="14" font-weight="bold">OR (100 ps)</text>
  </g>

  <!-- =========== Column headers =========== -->
  <text x="60" y="172"  fill="#a0a0c0" font-size="13" font-weight="bold">קלטים</text>
  <text x="190" y="172" fill="#a0a0c0" font-size="13" font-weight="bold">יעד</text>
  <text x="280" y="172" fill="#a0a0c0" font-size="13" font-weight="bold">שערים בנתיב (רוחב = delay)</text>
  <text x="940" y="172" fill="#a0a0c0" font-size="13" font-weight="bold">סה"כ</text>
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
          <text x="${cursorX + w / 2}" y="${barY + 20}" text-anchor="middle" fill="${col.txt}" font-size="14" font-weight="bold">${name}</text>
          <text x="${cursorX + w / 2}" y="${barY + 36}" text-anchor="middle" fill="${col.txt}" font-size="12">${ms} ps</text>`;
        cursorX += w + 3;
        return seg;
      }).join('');
      // Tag badge
      let badge = '';
      if (p.tag === 'shortest') {
        badge = `<rect x="990" y="${barY + 5}" width="110" height="32" rx="6" fill="rgba(128,240,160,0.18)" stroke="#80f0a0" stroke-width="1.6"/>
                 <text x="1045" y="${barY + 26}" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="14">✓ shortest</text>`;
      } else if (p.tag === 'critical') {
        badge = `<rect x="990" y="${barY + 5}" width="110" height="32" rx="6" fill="rgba(255,96,96,0.18)" stroke="#ff6060" stroke-width="1.6"/>
                 <text x="1045" y="${barY + 26}" text-anchor="middle" fill="#ff8080" font-weight="bold" font-size="14">✗ critical</text>`;
      }
      const totalColor = p.tag === 'shortest' ? '#80f0a0' : (p.tag === 'critical' ? '#ff8080' : '#ffc890');
      return `<text x="60" y="${barY + 26}" fill="#cca040" font-size="15" font-weight="bold">${p.src}</text>
        <text x="190" y="${barY + 26}" fill="#ff9933" font-size="17" font-weight="bold">→ ${p.dst}</text>
        ${segs}
        <text x="935" y="${barY + 26}" text-anchor="end" fill="${totalColor}" font-size="20" font-weight="bold">${p.total} ps</text>
        ${badge}`;
    }).join('');
  })()}

  <!-- =========== SUMMARY box =========== -->
  <rect x="40" y="610" width="1060" height="280" rx="10" fill="rgba(64,80,100,0.06)" stroke="#3a4a5a" stroke-width="1.4"/>
  <text x="570" y="654" text-anchor="middle" fill="#ffc890" font-weight="bold" font-size="22">
    סיכום timing
  </text>

  <!-- Setup card -->
  <rect x="70" y="686" width="490" height="180" rx="8" fill="rgba(255,96,96,0.05)" stroke="rgba(255,96,96,0.5)" stroke-width="1.6"/>
  <text x="315" y="718" text-anchor="middle" fill="#ff8080" font-weight="bold" font-size="21">Critical path (setup)</text>
  <text x="90" y="754" fill="#c8b090" font-size="18">A1/B1 → XOR2 → AND3 → OR1 → S2 = <tspan fill="#ff8080" font-weight="bold">370 ps</tspan></text>
  <text x="90" y="788" fill="#80f0a0" font-size="18" font-weight="bold">T_clk ≥ t_clk-q + 370 + t_su</text>
  <text x="90" y="822" fill="#a0a0c0" font-size="16" font-style="italic">→ ~450 ps → Fmax ≈ 2.22 GHz</text>

  <!-- Hold card -->
  <rect x="580" y="686" width="490" height="180" rx="8" fill="rgba(128,240,160,0.05)" stroke="rgba(128,240,160,0.5)" stroke-width="1.6"/>
  <text x="825" y="718" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="21">Shortest path (hold)</text>
  <text x="600" y="754" fill="#c8b090" font-size="18">A0/B0 → XOR1 → S0 = <tspan fill="#80f0a0" font-weight="bold">150 ps</tspan></text>
  <text x="600" y="788" fill="#80f0a0" font-size="18" font-weight="bold">T_shortest ≥ t_h − t_clk-q</text>
  <text x="600" y="822" fill="#a0a0c0" font-size="16" font-style="italic">→ 150 ≥ 10 ps ✓ (בטוח מאוד)</text>

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
          'המסלול הקריטי הוא \\\`XOR2 → AND3 → OR1\\\` = 150+120+100 = 370. ניתן לחתוך **בין AND3 ל-OR1** או **בין XOR2 ל-AND3**.',
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
     font-family="'JetBrains Mono', monospace" font-size="16" role="img" aria-label="Minimal pipelining: a single FF_P on the critical wire between XOR2 and AND3.">

  <defs>
    <linearGradient id="pipeBand" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"  stop-color="#cc66ff" stop-opacity="0"/>
      <stop offset="20%" stop-color="#cc66ff" stop-opacity="0.14"/>
      <stop offset="80%" stop-color="#cc66ff" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#cc66ff" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <text x="570" y="40" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="26">
    פתרון מינימלי — FF יחיד על המסלול הקריטי
  </text>

  <!-- ════════ Pipeline band (purple, full-height background) ════════ -->
  <rect x="460" y="110" width="140" height="430" rx="10"
        fill="url(#pipeBand)" stroke="#cc66ff" stroke-width="1.8" stroke-dasharray="6,4"/>
  <text x="530" y="100" text-anchor="middle" fill="#cc99ff" font-size="18" font-weight="bold">PIPELINE FF</text>

  <!-- ════════ Stage headers ════════ -->
  <rect x="50"  y="80" width="410" height="32" rx="6" fill="rgba(128,200,255,0.10)" stroke="#80c8ff" stroke-width="1.4"/>
  <text x="255" y="102" text-anchor="middle" fill="#80c8ff" font-size="16" font-weight="bold">STAGE 1 (XOR2 בלבד, ≤ 150 ps)</text>

  <rect x="600" y="80" width="500" height="32" rx="6" fill="rgba(255,144,80,0.10)" stroke="#ff9050" stroke-width="1.4"/>
  <text x="850" y="102" text-anchor="middle" fill="#ff9050" font-size="16" font-weight="bold">STAGE 2 (AND3 → OR1, ≤ 220 ps)</text>

  <!-- ════════ Inputs (left) ════════ -->
  <g font-size="18" font-weight="bold">
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
    <text x="318" y="207" text-anchor="middle" fill="#80f0a0" font-size="13" font-weight="bold">XOR1</text>
    <text x="318" y="223" text-anchor="middle" fill="#a0c0d0" font-size="11">150 ps</text>
  </g>
  <g>
    <path d="M 280 245 L 310 245 A 25 25 0 0 1 310 295 L 280 295 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="298" y="267" text-anchor="middle" fill="#80c8ff" font-size="13" font-weight="bold">AND1</text>
    <text x="298" y="283" text-anchor="middle" fill="#a0c0d0" font-size="11">120 ps</text>
  </g>
  <g>
    <path d="M 280 395 Q 305 420, 280 445 L 310 445 Q 335 445, 350 420 Q 335 395, 310 395 Z"
          fill="#1a3a2a" stroke="#80f0a0" stroke-width="2"/>
    <text x="318" y="417" text-anchor="middle" fill="#80f0a0" font-size="13" font-weight="bold">XOR2</text>
    <text x="318" y="433" text-anchor="middle" fill="#a0c0d0" font-size="11">150 ps</text>
  </g>
  <g>
    <path d="M 280 455 L 310 455 A 25 25 0 0 1 310 505 L 280 505 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="298" y="477" text-anchor="middle" fill="#80c8ff" font-size="13" font-weight="bold">AND2</text>
    <text x="298" y="493" text-anchor="middle" fill="#a0c0d0" font-size="11">120 ps</text>
  </g>

  <!-- ════════ Single Pipeline FF — FF_P ════════ -->
  <g>
    <rect x="470" y="395" width="120" height="50" rx="6" fill="#1a1428" stroke="#cc66ff" stroke-width="3"/>
    <text x="530" y="417" text-anchor="middle" fill="#cc99ff" font-size="14" font-weight="bold">FF_P</text>
    <text x="530" y="434" text-anchor="middle" fill="#fff080" font-size="11">★ הפתרון המינימלי</text>
  </g>

  <!-- ════════ Stage 2 gates ════════ -->
  <g>
    <path d="M 680 305 Q 705 330, 680 355 L 710 355 Q 735 355, 750 330 Q 735 305, 710 305 Z"
          fill="#1a3a2a" stroke="#80f0a0" stroke-width="2"/>
    <text x="718" y="327" text-anchor="middle" fill="#80f0a0" font-size="13" font-weight="bold">XOR3</text>
    <text x="718" y="343" text-anchor="middle" fill="#a0c0d0" font-size="11">150 ps</text>
  </g>
  <g>
    <path d="M 680 380 L 710 380 A 25 25 0 0 1 710 430 L 680 430 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="698" y="402" text-anchor="middle" fill="#80c8ff" font-size="13" font-weight="bold">AND3</text>
    <text x="698" y="418" text-anchor="middle" fill="#a0c0d0" font-size="11">120 ps</text>
  </g>
  <g>
    <path d="M 840 445 L 870 445 Q 910 445, 920 470 Q 910 495, 870 495 L 840 495 Q 860 470, 840 445 Z"
          fill="#3a2a14" stroke="#ffc080" stroke-width="2"/>
    <text x="880" y="467" text-anchor="middle" fill="#ffc080" font-size="13" font-weight="bold">OR1</text>
    <text x="880" y="483" text-anchor="middle" fill="#a0c0d0" font-size="11">100 ps</text>
  </g>

  <!-- ════════ Outputs ════════ -->
  <g font-size="18" font-weight="bold">
    <circle cx="1030" cy="210" r="22" fill="#0a1825" stroke="#cca040" stroke-width="2.2" stroke-dasharray="5,3"/>
    <text x="1030" y="216" text-anchor="middle" fill="#cca040">S0</text>
    <circle cx="1030" cy="330" r="20" fill="#0a1825" stroke="#ff9933" stroke-width="2.2"/>
    <text x="1030" y="336" text-anchor="middle" fill="#ff9933">S1</text>
    <circle cx="1030" cy="470" r="22" fill="#0a1825" stroke="#ff6060" stroke-width="2.6"/>
    <text x="1030" y="476" text-anchor="middle" fill="#ff6060">S2</text>
  </g>

  <!-- Critical-path badge at S2 -->
  <rect x="710" y="510" width="290" height="32" rx="6" fill="rgba(255,96,96,0.14)" stroke="#ff6060" stroke-width="1.6"/>
  <text x="855" y="531" text-anchor="middle" fill="#ff8080" font-size="14" font-weight="bold">SETUP: 150 ps | 220 ps ≤ 300 ✓</text>

  <!-- Bottom summary -->
  <rect x="40" y="570" width="1060" height="78" rx="10" fill="rgba(64,80,100,0.06)" stroke="#3a4a5a" stroke-width="1.4"/>
  <text x="570" y="600" text-anchor="middle" fill="#ffc890" font-weight="bold" font-size="17">
    FF יחיד (FF_P) שובר את ה-370 ps לשני שלבים: 150 ps + 220 ps ≤ 300 ✓
  </text>
  <text x="570" y="628" text-anchor="middle" fill="#c8b090" font-size="15" font-style="italic">
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
          'התוצאה: \\\`Latency\\\` (השהיה) הוכפלה. \\\`Throughput\\\` (תפוקה) נשמרה — וקטור חדש בכל clock, אבל הכל מאוחר ב-cycle.',
          'הבעיה הקיומית: אם המעגל שמשתמש ב-S2 מצפה לקבל אותו באותו cycle עם S0/S1 (sync), ה-S2 שלנו יגיע באיחור — \\\`pipeline imbalance\\\`.',
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
     font-family="'JetBrains Mono', monospace" font-size="16" role="img" aria-label="Balanced pipelined adder: an additional FF on the S0 path so all outputs exit at the same cycle.">

  <defs>
    <linearGradient id="pipeBand2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"  stop-color="#cc66ff" stop-opacity="0"/>
      <stop offset="20%" stop-color="#cc66ff" stop-opacity="0.14"/>
      <stop offset="80%" stop-color="#cc66ff" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#cc66ff" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <text x="570" y="40" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="26">
    Pipeline מאוזן — 3 FFs נוספים (FF_S0, FF_C1, FF_G)
  </text>

  <!-- Pipeline band -->
  <rect x="460" y="110" width="140" height="430" rx="10"
        fill="url(#pipeBand2)" stroke="#cc66ff" stroke-width="1.8" stroke-dasharray="6,4"/>
  <text x="530" y="100" text-anchor="middle" fill="#cc99ff" font-size="18" font-weight="bold">PIPELINE FFs</text>

  <!-- Stage headers -->
  <rect x="50"  y="80" width="410" height="32" rx="6" fill="rgba(128,200,255,0.10)" stroke="#80c8ff" stroke-width="1.4"/>
  <text x="255" y="102" text-anchor="middle" fill="#80c8ff" font-size="16" font-weight="bold">STAGE 1 (combinational ≤ 150 ps)</text>

  <rect x="600" y="80" width="500" height="32" rx="6" fill="rgba(255,144,80,0.10)" stroke="#ff9050" stroke-width="1.4"/>
  <text x="850" y="102" text-anchor="middle" fill="#ff9050" font-size="16" font-weight="bold">STAGE 2 (combinational ≤ 220 ps)</text>

  <!-- ════════ Inputs ════════ -->
  <g font-size="18" font-weight="bold">
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
    <text x="318" y="207" text-anchor="middle" fill="#80f0a0" font-size="13" font-weight="bold">XOR1</text>
    <text x="318" y="223" text-anchor="middle" fill="#a0c0d0" font-size="11">150 ps</text>
  </g>
  <g>
    <path d="M 280 245 L 310 245 A 25 25 0 0 1 310 295 L 280 295 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="298" y="267" text-anchor="middle" fill="#80c8ff" font-size="13" font-weight="bold">AND1</text>
    <text x="298" y="283" text-anchor="middle" fill="#a0c0d0" font-size="11">120 ps</text>
  </g>
  <g>
    <path d="M 280 395 Q 305 420, 280 445 L 310 445 Q 335 445, 350 420 Q 335 395, 310 395 Z"
          fill="#1a3a2a" stroke="#80f0a0" stroke-width="2"/>
    <text x="318" y="417" text-anchor="middle" fill="#80f0a0" font-size="13" font-weight="bold">XOR2</text>
    <text x="318" y="433" text-anchor="middle" fill="#a0c0d0" font-size="11">150 ps</text>
  </g>
  <g>
    <path d="M 280 455 L 310 455 A 25 25 0 0 1 310 505 L 280 505 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="298" y="477" text-anchor="middle" fill="#80c8ff" font-size="13" font-weight="bold">AND2</text>
    <text x="298" y="493" text-anchor="middle" fill="#a0c0d0" font-size="11">120 ps</text>
  </g>

  <!-- ════════ Pipeline FFs ════════
       FF_P: from part ד (purple — existing)
       FF_S0, FF_C1, FF_G: NEW in part ה (yellow highlight) -->
  <g>
    <rect x="470" y="185" width="120" height="50" rx="6"
          fill="#3a3a0a" stroke="#ffe060" stroke-width="2.6"/>
    <text x="530" y="207" text-anchor="middle" fill="#ffe060" font-size="13" font-weight="bold">FF_S0 ✨</text>
    <text x="530" y="224" text-anchor="middle" fill="#fff080" font-size="11">★ חדש (ה)</text>
  </g>
  <g>
    <rect x="470" y="245" width="120" height="50" rx="6"
          fill="#3a3a0a" stroke="#ffe060" stroke-width="2.6"/>
    <text x="530" y="267" text-anchor="middle" fill="#ffe060" font-size="13" font-weight="bold">FF_C1 ✨</text>
    <text x="530" y="284" text-anchor="middle" fill="#fff080" font-size="11">★ חדש (ה)</text>
  </g>
  <g>
    <rect x="470" y="395" width="120" height="50" rx="6" fill="#1a1428" stroke="#cc66ff" stroke-width="2.4"/>
    <text x="530" y="417" text-anchor="middle" fill="#cc99ff" font-size="13" font-weight="bold">FF_P</text>
    <text x="530" y="434" text-anchor="middle" fill="#a0a0c0" font-size="11">מסעיף ד'</text>
  </g>
  <g>
    <rect x="470" y="455" width="120" height="50" rx="6"
          fill="#3a3a0a" stroke="#ffe060" stroke-width="2.6"/>
    <text x="530" y="477" text-anchor="middle" fill="#ffe060" font-size="13" font-weight="bold">FF_G ✨</text>
    <text x="530" y="494" text-anchor="middle" fill="#fff080" font-size="11">★ חדש (ה)</text>
  </g>

  <!-- ════════ Stage 2 gates ════════ -->
  <g>
    <path d="M 680 305 Q 705 330, 680 355 L 710 355 Q 735 355, 750 330 Q 735 305, 710 305 Z"
          fill="#1a3a2a" stroke="#80f0a0" stroke-width="2"/>
    <text x="718" y="327" text-anchor="middle" fill="#80f0a0" font-size="13" font-weight="bold">XOR3</text>
    <text x="718" y="343" text-anchor="middle" fill="#a0c0d0" font-size="11">150 ps</text>
  </g>
  <g>
    <path d="M 680 380 L 710 380 A 25 25 0 0 1 710 430 L 680 430 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="698" y="402" text-anchor="middle" fill="#80c8ff" font-size="13" font-weight="bold">AND3</text>
    <text x="698" y="418" text-anchor="middle" fill="#a0c0d0" font-size="11">120 ps</text>
  </g>
  <g>
    <path d="M 840 445 L 870 445 Q 910 445, 920 470 Q 910 495, 870 495 L 840 495 Q 860 470, 840 445 Z"
          fill="#3a2a14" stroke="#ffc080" stroke-width="2"/>
    <text x="880" y="467" text-anchor="middle" fill="#ffc080" font-size="13" font-weight="bold">OR1</text>
    <text x="880" y="483" text-anchor="middle" fill="#a0c0d0" font-size="11">100 ps</text>
  </g>

  <!-- ════════ Outputs (all green — synced now) ════════ -->
  <g font-size="18" font-weight="bold">
    <circle cx="1030" cy="210" r="22" fill="#0a1825" stroke="#80f0a0" stroke-width="2.6"/>
    <text x="1030" y="216" text-anchor="middle" fill="#80f0a0">S0</text>
    <circle cx="1030" cy="330" r="22" fill="#0a1825" stroke="#80f0a0" stroke-width="2.6"/>
    <text x="1030" y="336" text-anchor="middle" fill="#80f0a0">S1</text>
    <circle cx="1030" cy="470" r="22" fill="#0a1825" stroke="#80f0a0" stroke-width="2.6"/>
    <text x="1030" y="476" text-anchor="middle" fill="#80f0a0">S2</text>
  </g>

  <!-- Sync badge -->
  <rect x="720" y="160" width="280" height="32" rx="6" fill="rgba(128,240,160,0.14)" stroke="#80f0a0" stroke-width="1.6"/>
  <text x="860" y="181" text-anchor="middle" fill="#80f0a0" font-size="14" font-weight="bold">✓ כל הפלטים יוצאים בו-זמנית</text>

  <!-- Bottom summary -->
  <rect x="40" y="570" width="1060" height="78" rx="10" fill="rgba(64,80,100,0.06)" stroke="#3a4a5a" stroke-width="1.4"/>
  <text x="570" y="600" text-anchor="middle" fill="#ffc890" font-weight="bold" font-size="18">
    Latency = 2 cycles · Throughput = 1 vector/clock · Stage 1 ≤ 150 ps · Stage 2 ≤ 220 ps
  </text>
  <text x="570" y="628" text-anchor="middle" fill="#c8b090" font-size="15" font-style="italic">
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
        question: 'נתון כעת: **\\\`t_hold = 200 ps\\\`** (זמן ה-hold הנדרש ע"י ה-FF במורד הזרם). תן פתרון למסלול הבעייתי במעגל.',
        hints: [
          'אילוץ ה-hold: \\\`T_shortest ≥ t_h − t_clk-q\\\`. עם \\\`t_clk-q ≈ 30 ps\\\` ו-\\\`t_h = 200 ps\\\` → צריך \\\`T_shortest ≥ 170 ps\\\`.',
          'הנתיב הקצר ביותר במעגל הוא \\\`A0/B0 → XOR1 → S0\\\` = 150 ps. **150 < 170** → הפרת hold!',
          'הפתרון: להוסיף **delay buffer** על המסלול הקצר. כך ה-delay של המסלול גדל ומגיע מעל הסף.',
          'איזה רכיב? Buffer (BUF) או זוג inverters בטור. כל BUF מוסיף ~50-100 ps תלוי בטכנולוגיה.',
          'הוספה של BUF אחד (נניח 60 ps): \\\`150 + 60 = 210 ps ≥ 170\\\` ✓.',
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
     font-family="'JetBrains Mono', monospace" font-size="16" role="img" aria-label="Before / after panels — adding a buffer on the S0 path to fix hold timing.">

  <text x="550" y="40" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="26">
    Delay padding — הוספת BUF על המסלול הקצר
  </text>
  <text x="550" y="68" text-anchor="middle" fill="#a0a0c0" font-size="15" font-style="italic">
    אילוץ: T_shortest ≥ 170 ps (t_h = 200, t_clk-q ≈ 30)
  </text>

  <!-- ════════════════════ BEFORE panel ════════════════════ -->
  <rect x="30" y="100" width="510" height="340" rx="12"
        fill="rgba(255,96,96,0.05)" stroke="rgba(255,96,96,0.55)" stroke-width="2"/>
  <text x="285" y="138" text-anchor="middle" fill="#ff8080" font-weight="bold" font-size="22">לפני — הפרת hold ✗</text>

  <!-- A0 input -->
  <circle cx="80" cy="240" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
  <text x="80" y="246" text-anchor="middle" fill="#cca040" font-size="16" font-weight="bold">A0</text>
  <!-- B0 input -->
  <circle cx="80" cy="310" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
  <text x="80" y="316" text-anchor="middle" fill="#cca040" font-size="16" font-weight="bold">B0</text>

  <!-- Wires -->
  <line x1="100" y1="240" x2="220" y2="240" stroke="#cca040" stroke-width="2"/>
  <line x1="100" y1="310" x2="220" y2="310" stroke="#cca040" stroke-width="2"/>

  <!-- XOR1 -->
  <path d="M 220 230 Q 250 275, 220 320 L 260 320 Q 300 320, 320 275 Q 300 230, 260 230 Z"
        fill="#1a3a2a" stroke="#80f0a0" stroke-width="2.2"/>
  <text x="270" y="270" text-anchor="middle" fill="#80f0a0" font-size="16" font-weight="bold">XOR1</text>
  <text x="270" y="290" text-anchor="middle" fill="#a0c0d0" font-size="13">150 ps</text>

  <!-- XOR1 → S0 (long, direct) -->
  <line x1="320" y1="275" x2="470" y2="275" stroke="#ff9933" stroke-width="2.2"/>

  <!-- S0 output -->
  <circle cx="490" cy="275" r="22" fill="#0a1825" stroke="#ff6060" stroke-width="2.4"/>
  <text x="490" y="281" text-anchor="middle" fill="#ff6060" font-size="17" font-weight="bold">S0</text>

  <!-- Delay annotation -->
  <text x="395" y="262" text-anchor="middle" fill="#a0a0c0" font-size="13" font-style="italic">150 ps total</text>

  <!-- Violation badge -->
  <rect x="80" y="380" width="410" height="40" rx="8" fill="rgba(255,96,96,0.14)" stroke="#ff6060" stroke-width="1.8"/>
  <text x="285" y="406" text-anchor="middle" fill="#ff8080" font-weight="bold" font-size="16">150 &lt; 170 → race condition</text>

  <!-- ════════════════════ AFTER panel ════════════════════ -->
  <rect x="560" y="100" width="510" height="340" rx="12"
        fill="rgba(128,240,160,0.05)" stroke="rgba(128,240,160,0.55)" stroke-width="2"/>
  <text x="815" y="138" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="22">אחרי — hold נשמר ✓</text>

  <!-- A0 input -->
  <circle cx="610" cy="240" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
  <text x="610" y="246" text-anchor="middle" fill="#cca040" font-size="16" font-weight="bold">A0</text>
  <!-- B0 input -->
  <circle cx="610" cy="310" r="20" fill="#0a1825" stroke="#cca040" stroke-width="2.2"/>
  <text x="610" y="316" text-anchor="middle" fill="#cca040" font-size="16" font-weight="bold">B0</text>

  <!-- Wires -->
  <line x1="630" y1="240" x2="730" y2="240" stroke="#cca040" stroke-width="2"/>
  <line x1="630" y1="310" x2="730" y2="310" stroke="#cca040" stroke-width="2"/>

  <!-- XOR1 -->
  <path d="M 730 230 Q 760 275, 730 320 L 770 320 Q 810 320, 830 275 Q 810 230, 770 230 Z"
        fill="#1a3a2a" stroke="#80f0a0" stroke-width="2.2"/>
  <text x="780" y="270" text-anchor="middle" fill="#80f0a0" font-size="16" font-weight="bold">XOR1</text>
  <text x="780" y="290" text-anchor="middle" fill="#a0c0d0" font-size="13">150 ps</text>

  <!-- XOR1 → BUF -->
  <line x1="830" y1="275" x2="880" y2="275" stroke="#ff9933" stroke-width="2.2"/>

  <!-- BUF (highlighted yellow) -->
  <rect x="880" y="250" width="80" height="50" rx="8" fill="#3a3a0a" stroke="#ffe060" stroke-width="2.6"/>
  <text x="920" y="271" text-anchor="middle" fill="#ffe060" font-size="14" font-weight="bold">BUF</text>
  <text x="920" y="289" text-anchor="middle" fill="#fff080" font-size="11">+60 ps ★</text>

  <!-- BUF → S0 -->
  <line x1="960" y1="275" x2="1000" y2="275" stroke="#ff9933" stroke-width="2.2"/>

  <!-- S0 output (now green = safe) -->
  <circle cx="1020" cy="275" r="22" fill="#0a1825" stroke="#80f0a0" stroke-width="2.4"/>
  <text x="1020" y="281" text-anchor="middle" fill="#80f0a0" font-size="17" font-weight="bold">S0</text>

  <!-- Delay annotation -->
  <text x="895" y="240" text-anchor="middle" fill="#a0a0c0" font-size="13" font-style="italic">150 + 60 = 210 ps</text>

  <!-- Pass badge -->
  <rect x="610" y="380" width="410" height="40" rx="8" fill="rgba(128,240,160,0.14)" stroke="#80f0a0" stroke-width="1.8"/>
  <text x="815" y="406" text-anchor="middle" fill="#80f0a0" font-weight="bold" font-size="16">210 ≥ 170 ✓ (margin 40 ps)</text>
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
        question: 'המעגל המאוזן מסעיף ה\' מסונכרן ועובד נכון. אבל כעת צריך **לבדוק אותו ב-ATE**. הסבר איך הופכים את 4 ה-FFs ל-**scan-friendly**, תאר את **סדר ה-scan chain** עם נקודות \\\`SI\\\` ו-\\\`SO\\\`, וחשב כמה מחזורי clock נדרשים להרצת **וקטור בדיקה אחד** על המעגל.',
        hints: [
          'הופכים D-FF רגיל ל-Scan-FF ע"י הוספת **MUX 2:1 לפני ה-D**: כניסה 0 = D הפונקציונלי, כניסה 1 = SI (Scan-In). הסלקטור הוא \\\`SE\\\` (Scan-Enable).',
          'SE משותף לכל ה-Scan-FFs במעגל. בזמן SE=0 → המעגל עובד פונקציונלית רגיל. בזמן SE=1 → כל ה-FFs מהווים shift-register.',
          'סדר השרשרת חופשי, אבל הגיוני להתחיל מ-stage 1 הראשונות וללכת לשניות. למשל: \\\`SI → FF_S0 → FF_C1 → FF_P → FF_G → SO\\\`.',
          'מחזורי clock לוקטור אחד: \\\`N\\\` ל-load (shift-in) + \\\`1\\\` ל-capture + \\\`N\\\` ל-unload (shift-out). עבור \\\`N=4\\\`: סה"כ \\\`2N+1 = 9\\\` cycles.',
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
     font-family="'JetBrains Mono', monospace" font-size="16" role="img" aria-label="Pipelined adder with 4 SCAN_FFs in a daisy-chain — SI on the left, SO on the right, SE common.">

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

  <text x="570" y="40" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="26">
    Scan chain — 4 Scan-FFs ב-daisy chain
  </text>
  <text x="570" y="68" text-anchor="middle" fill="#a0a0c0" font-size="15" font-style="italic">
    SE=0 → פונקציונלי   ·   SE=1 → shift mode
  </text>

  <!-- ════════ Pipeline band ════════ -->
  <rect x="440" y="110" width="180" height="430" rx="10"
        fill="url(#pipeBandZ)" stroke="#cc66ff" stroke-width="1.8" stroke-dasharray="6,4"/>
  <text x="530" y="100" text-anchor="middle" fill="#cc99ff" font-size="18" font-weight="bold">4 × SCAN-FF</text>

  <!-- ════════ Inputs (left) ════════ -->
  <g font-size="16" font-weight="bold">
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
    <text x="318" y="172" text-anchor="middle" fill="#80f0a0" font-size="12" font-weight="bold">XOR1</text>
  </g>
  <g>
    <path d="M 280 205 L 310 205 A 25 25 0 0 1 310 255 L 280 255 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="298" y="232" text-anchor="middle" fill="#80c8ff" font-size="12" font-weight="bold">AND1</text>
  </g>
  <g>
    <path d="M 280 365 Q 305 390, 280 415 L 310 415 Q 335 415, 350 390 Q 335 365, 310 365 Z"
          fill="#1a3a2a" stroke="#80f0a0" stroke-width="2"/>
    <text x="318" y="392" text-anchor="middle" fill="#80f0a0" font-size="12" font-weight="bold">XOR2</text>
  </g>
  <g>
    <path d="M 280 425 L 310 425 A 25 25 0 0 1 310 475 L 280 475 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="298" y="452" text-anchor="middle" fill="#80c8ff" font-size="12" font-weight="bold">AND2</text>
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
    <text x="535" y="170" text-anchor="middle" fill="#cc99ff" font-size="14" font-weight="bold">SCAN_FF — FF_S0</text>
    <text x="464" y="194" fill="#a0a0c0" font-size="11">D</text>
    <text x="464" y="186" fill="#cc66ff" font-size="11">TI</text>
    <text x="610" y="190" text-anchor="end" fill="#a0a0c0" font-size="11">Q</text>
  </g>
  <g>
    <rect x="450" y="205" width="170" height="60" rx="6" fill="#1a1428" stroke="#cc66ff" stroke-width="2.6"/>
    <text x="535" y="230" text-anchor="middle" fill="#cc99ff" font-size="14" font-weight="bold">SCAN_FF — FF_C1</text>
    <text x="464" y="254" fill="#a0a0c0" font-size="11">D</text>
    <text x="464" y="246" fill="#cc66ff" font-size="11">TI</text>
    <text x="610" y="250" text-anchor="end" fill="#a0a0c0" font-size="11">Q</text>
  </g>
  <g>
    <rect x="450" y="365" width="170" height="60" rx="6" fill="#1a1428" stroke="#cc66ff" stroke-width="2.6"/>
    <text x="535" y="390" text-anchor="middle" fill="#cc99ff" font-size="14" font-weight="bold">SCAN_FF — FF_P</text>
    <text x="464" y="414" fill="#a0a0c0" font-size="11">D</text>
    <text x="464" y="406" fill="#cc66ff" font-size="11">TI</text>
    <text x="610" y="410" text-anchor="end" fill="#a0a0c0" font-size="11">Q</text>
  </g>
  <g>
    <rect x="450" y="425" width="170" height="60" rx="6" fill="#1a1428" stroke="#cc66ff" stroke-width="2.6"/>
    <text x="535" y="450" text-anchor="middle" fill="#cc99ff" font-size="14" font-weight="bold">SCAN_FF — FF_G</text>
    <text x="464" y="474" fill="#a0a0c0" font-size="11">D</text>
    <text x="464" y="466" fill="#cc66ff" font-size="11">TI</text>
    <text x="610" y="470" text-anchor="end" fill="#a0a0c0" font-size="11">Q</text>
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
  <text x="60" y="665" text-anchor="end" fill="#80f0a0" font-size="16" font-weight="bold">SE</text>
  <g stroke="#80f0a0" stroke-width="1.6" fill="none">
    <line x1="535" y1="660" x2="535" y2="495"/>
    <line x1="535" y1="495" x2="535" y2="490"/>
  </g>

  <!-- ════════ Stage 2 gates ════════ -->
  <g>
    <path d="M 680 290 Q 705 315, 680 340 L 710 340 Q 735 340, 750 315 Q 735 290, 710 290 Z"
          fill="#1a3a2a" stroke="#80f0a0" stroke-width="2"/>
    <text x="718" y="317" text-anchor="middle" fill="#80f0a0" font-size="12" font-weight="bold">XOR3</text>
  </g>
  <g>
    <path d="M 680 360 L 710 360 A 25 25 0 0 1 710 410 L 680 410 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="698" y="388" text-anchor="middle" fill="#80c8ff" font-size="12" font-weight="bold">AND3</text>
  </g>
  <g>
    <path d="M 840 415 L 870 415 Q 910 415, 920 440 Q 910 465, 870 465 L 840 465 Q 860 440, 840 415 Z"
          fill="#3a2a14" stroke="#ffc080" stroke-width="2"/>
    <text x="880" y="442" text-anchor="middle" fill="#ffc080" font-size="12" font-weight="bold">OR1</text>
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
  <g font-size="16" font-weight="bold">
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
  <text x="570" y="716" text-anchor="middle" fill="#ffc890" font-weight="bold" font-size="16">
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
        question: 'במעגל ה-pipelined מסעיף ה\' מוזרק **bridge fault** בין שני קווים שכנים בשלב ה-pipeline: הקו \\\`XOR1.out → FF_S0.D\\\` והקו \\\`AND1.out → FF_C1.D\\\` — מסומנים ב**סגול** בשרטוט. הקצר הוא **wired-AND** — שני הקווים נושאים את ה-AND של ערכיהם המקוריים. **מהו וקטור הקלט המינימלי שמזהה את התקלה?** הסבר מה רואים בפלט.',
        schematic: `
<svg viewBox="0 0 900 400" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="16" role="img" aria-label="Bridge fault between XOR1→FF_S0 and AND1→FF_C1 wires.">

  <text x="450" y="36" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="22">
    Bridge fault — wired-AND בין שני הקווים השכנים
  </text>

  <!-- Inputs -->
  <g font-size="17" font-weight="bold">
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
    <text x="263" y="146" text-anchor="middle" fill="#80f0a0" font-size="14" font-weight="bold">XOR1</text>
  </g>
  <!-- AND1 -->
  <g>
    <path d="M 220 205 L 250 205 A 25 25 0 0 1 250 265 L 220 265 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="240" y="240" text-anchor="middle" fill="#80c8ff" font-size="14" font-weight="bold">AND1</text>
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
  <text x="580" y="192" text-anchor="middle" fill="#cc99ff" font-size="15" font-weight="bold">⚡ BRIDGE — wired-AND</text>

  <!-- FF_S0 -->
  <g>
    <rect x="580" y="110" width="140" height="60" rx="6" fill="#0a1825" stroke="#80c8ff" stroke-width="2.4"/>
    <text x="650" y="135" text-anchor="middle" fill="#80c8ff" font-size="14" font-weight="bold">FF_S0</text>
    <text x="650" y="155" text-anchor="middle" fill="#a0c0d0" font-size="11">latches XOR1.out</text>
  </g>
  <!-- FF_C1 -->
  <g>
    <rect x="580" y="205" width="140" height="60" rx="6" fill="#0a1825" stroke="#80c8ff" stroke-width="2.4"/>
    <text x="650" y="230" text-anchor="middle" fill="#80c8ff" font-size="14" font-weight="bold">FF_C1</text>
    <text x="650" y="250" text-anchor="middle" fill="#a0c0d0" font-size="11">latches AND1.out</text>
  </g>

  <!-- Context note -->
  <text x="450" y="320" text-anchor="middle" fill="#c8b090" font-size="14" font-style="italic">
    שני הקווים סמוכים פיזית בלייאאוט → קצר חשמלי ביניהם = wired-AND
  </text>
  <text x="450" y="346" text-anchor="middle" fill="#ffe080" font-size="14" font-weight="bold">
    כל וקטור שמעניק להם ערכים זהים — לא מגלה את התקלה (קצר שקוף)
  </text>
  <text x="450" y="370" text-anchor="middle" fill="#a0a0c0" font-size="13">
    Stage 2 (XOR3, AND3, OR1) ממשיך מ-FF_S0 / FF_C1 — לא משורטט כאן
  </text>
</svg>`,
        hints: [
          'Bridge מתבטא רק כשלשני הקווים יש **ערכים שונים** — אם שניהם 0 או שניהם 1, ה-AND שלהם זהה לכל אחד מהם בנפרד ⇒ הקצר שקוף.',
          'הקו XOR1.out מחשב \\\`A0 ⊕ B0\\\`. הקו AND1.out מחשב \\\`A0 · B0\\\`.',
          'מתי שני הביטויים שונים? כש-XOR=0 ו-AND=1 (\\\`A0=B0=1\\\`) **או** כש-XOR=1 ו-AND=0 (\\\`A0≠B0\\\`).',
          'בחר \\\`A0=B0=1\\\`: XOR1=0, AND1=1. wired-AND עושה את שני הקווים = 0. כעת \\\`FF_C1\\\` קולט 0 במקום 1.',
          'התקלה תתבטא ב-stage 2: \\\`XOR3(P, C1=0)\\\` במקום \\\`XOR3(P, C1=1)\\\` → \\\`S1\\\` יוצא הפוך ממה שצפוי.',
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
        question: 'במעגל מסעיף ה\' אחד החוטים מוזרק עם תקלת **\\\`stuck-at-0\\\`** — הקו \\\`AND1.out → FF_C1.D\\\` (כלומר \\\`C1\\\` תקוע ב-0), מסומן ב**אדום** בשרטוט. **מהו וקטור הקלט המינימלי שמזהה את התקלה ומאשש שאכן הקו הזה הוא הפגום?** הסבר את ה-trade-off של מינימום וקטור לעומת זיהוי ייחודי של מיקום התקלה.',
        schematic: `
<svg viewBox="0 0 900 400" xmlns="http://www.w3.org/2000/svg" direction="ltr"
     font-family="'JetBrains Mono', monospace" font-size="16" role="img" aria-label="Stuck-at-0 fault on AND1.out → FF_C1.D wire.">

  <text x="450" y="36" text-anchor="middle" fill="#80d4ff" font-weight="bold" font-size="22">
    Stuck-at-0 fault — C1 תקוע ב-0
  </text>

  <!-- Inputs -->
  <g font-size="17" font-weight="bold">
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
    <text x="263" y="146" text-anchor="middle" fill="#80f0a0" font-size="14" font-weight="bold">XOR1</text>
  </g>
  <!-- AND1 (faulty path source) -->
  <g>
    <path d="M 220 205 L 250 205 A 25 25 0 0 1 250 265 L 220 265 Z"
          fill="#1a2230" stroke="#80c8ff" stroke-width="2"/>
    <text x="240" y="240" text-anchor="middle" fill="#80c8ff" font-size="14" font-weight="bold">AND1</text>
  </g>

  <!-- XOR1.out → FF_S0 (healthy, grey) -->
  <line x1="296" y1="140" x2="580" y2="140" stroke="#5a6e80" stroke-width="1.8"/>

  <!-- ════════ The STUCK-AT-0 wire (red, prominent) ════════ -->
  <line x1="280" y1="235" x2="580" y2="235" stroke="#ff6060" stroke-width="3.6"/>
  <!-- Fault marker — red X on the wire -->
  <g transform="translate(420, 235)">
    <circle r="22" fill="#3a0a14" stroke="#ff6060" stroke-width="3"/>
    <text y="6" text-anchor="middle" fill="#ff6060" font-size="22" font-weight="bold">✗</text>
  </g>
  <!-- "stuck-at-0" label -->
  <rect x="440" y="270" width="240" height="34" rx="8" fill="rgba(255,96,96,0.16)" stroke="#ff6060" stroke-width="1.8"/>
  <text x="560" y="292" text-anchor="middle" fill="#ff8080" font-size="15" font-weight="bold">✗ stuck-at-0</text>

  <!-- FF_S0 -->
  <g>
    <rect x="580" y="110" width="140" height="60" rx="6" fill="#0a1825" stroke="#80c8ff" stroke-width="2.4"/>
    <text x="650" y="135" text-anchor="middle" fill="#80c8ff" font-size="14" font-weight="bold">FF_S0</text>
    <text x="650" y="155" text-anchor="middle" fill="#a0c0d0" font-size="11">latches XOR1.out</text>
  </g>
  <!-- FF_C1 (faulty input — red) -->
  <g>
    <rect x="580" y="205" width="140" height="60" rx="6" fill="#1a0a0a" stroke="#ff6060" stroke-width="2.4"/>
    <text x="650" y="230" text-anchor="middle" fill="#ff8080" font-size="14" font-weight="bold">FF_C1</text>
    <text x="650" y="250" text-anchor="middle" fill="#ff8080" font-size="11">תמיד קולט 0</text>
  </g>

  <!-- Context note -->
  <text x="450" y="346" text-anchor="middle" fill="#c8b090" font-size="14" font-style="italic">
    הקו תקוע ב-0 ⇒ \`FF_C1\` תמיד יקלוט 0 ב-capture, בלי קשר ל-AND1.out האמיתי
  </text>
  <text x="450" y="370" text-anchor="middle" fill="#ffe080" font-size="14" font-weight="bold">
    הצפי שכן: \`C1 = 1\` (כשA0=B0=1) — אחרת התקלה שקופה
  </text>
</svg>`,
        hints: [
          '\\\`stuck-at-0\\\` נחשף רק כש**הערך הצפוי על החוט הוא 1**. אם הצפי 0 → התקלה שקופה.',
          '\\\`AND1.out = A0 · B0\\\`. הוא צריך להיות 1 → \\\`A0 = B0 = 1\\\`.',
          'C1 משפיע על \\\`XOR3\\\` (לחישוב S1) ועל \\\`AND3\\\` (לחישוב S2). תקלת stuck-at-0 ב-C1 תשנה את שניהם — תלוי בערכי A1, B1.',
          'בחר \\\`A1=B1=0\\\`: \\\`P=0\\\`, \\\`G=0\\\`. \\\`S1\\\` ללא תקלה = \\\`XOR3(0, 1) = 1\\\`. עם תקלה: \\\`XOR3(0, 0) = 0\\\`. ✓ נחשף.',
          'מינימום לזיהוי-של-קיום: **1 וקטור** (\\\`A0=B0=1, A1=B1=0\\\`).',
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
    source: 'שאלת ראיון אמיתית — תכן לוגי / תזמון וסנכרון',
    tags: ['interview', 'adder', 'half-adder', 'full-adder', 'gate-level', 'identification', 'combinational', 'timing', 'critical-path'],
    circuitRevealsAnswer: true,
  },
];
