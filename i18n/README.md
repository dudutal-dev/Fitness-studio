# English edition of MOVA — how the translation works

The Hebrew source is the single source of truth. `tools/i18n.mjs` parses every JS file, finds each piece of Hebrew text
(a string, or a text fragment inside a template literal — text between HTML tags, and attribute values such as `aria-label`),
and replaces it with the English from `i18n/en/<file>.json`. The result is written to `en/` and served at `…/Fitness-studio/en/`.

- `node tools/i18n.mjs todo [file…]` writes `i18n/todo/<name>.txt`: the pieces that still have no translation, one per line, in source order.
- A translator writes `i18n/work/<name>.txt`: the English, **same number of lines, same order**.
- `node tools/i18n_merge.mjs <name>` merges the pair into `i18n/en/<name>.json`.
- `node tools/i18n.mjs build` builds `en/` and prints coverage per file.

`<name>` is the source path with `/` replaced by `__`, for example `js__views__plan.js`.

## Rules for translators

1. **One English line per Hebrew line.** Line N of the work file translates line N of the todo file. Never add, drop or merge lines.
   `⏎` inside a line marks a line break inside the piece: keep it at the matching place.
2. **Pieces are fragments.** Many lines are parts of a sentence that the code glues together around values, e.g.
   `עוד` + number + `ימים`. Translate each fragment so the glued English reads naturally: `` (empty) + number + `days left`.
   Read the neighbouring lines for context — they come from the same template, in order.
   When a fragment needs no English at all, write `∅` on that line (a truly empty line would be ambiguous).
3. **Keep what is not language:** emoji, numbers, `·`, `—`, HTML entities (`&nbsp;`), bracket tags like `[excited]`, and any markup that
   happens to be inside a line (e.g. `" aria-label="`). Do not add backslashes. If the Hebrew has `\'`, write a plain `'`.
4. **Punctuation and spacing** at the ends of a fragment should match the Hebrew's role (a fragment ending with `:` still ends with `:`).
5. **Gender:** Hebrew often has a masculine and a feminine variant of the same line (`בוא` / `בואי`, `אתה` / `את`). Give both the same neutral English.
6. **Tone:** short, plain, friendly coaching English. Imperatives for cues ("Keep your back straight"). No exclamation marks unless the Hebrew has one.
   Sentence case for buttons and titles ("Start workout", not "Start Workout").
7. **Names:** coaches are Ori, Noa, Maya, Tamar, Guy, Shira, Lia, Yael, Mei. The app is MOVA.
8. **Units:** ק״ג → kg, ק״מ → km, קק״ל → kcal, ג׳ → g, ל׳ → L, מ״ל → ml, דק׳ / דקות → min, שנ׳ / שניות → sec, ס״מ → cm. Keep metric.
9. **Glossary**

| Hebrew | English |
|---|---|
| אימון | workout (class for yoga / Pilates / tai chi sessions: שיעור → class) |
| מסלול | track |
| סט / חזרות | set / reps |
| מנוחה | rest |
| חימום / מתיחות | warm-up / stretching |
| תנוחה (יוגה) / תנועה (טאי צ'י, מוביליטי) | pose / movement |
| מוביליטי וגמישות | mobility & flexibility |
| מבחן טווחים | range-of-motion test |
| מוכנות / צ׳ק־אין | readiness / check-in |
| סולם, שלב (קליסתניקס) | ladder, step |
| מיומנות | skill |
| רמה | level |
| התקדמות | progress |
| ליווי תזונה | nutrition coaching |
| תפריט / מנה / ארוחה | menu / dish / meal |
| חלבון / פחמימה / שומן | protein / carbs / fat |
| בשירות / חדר אוכל / בשטח | in service / dining hall / in the field |
| קישור הפעלה | activation link |
| מסך הבית (של הטלפון) | Home Screen |
| הגדרות | Settings |
| גיבוי | backup |
| שיא אישי | personal record (PR) |
| מאמן / מאמנת | coach (teacher for yoga and tai chi) |

Exercise names use the standard English gym / calisthenics / yoga / Pilates / tai chi names (Back squat, Romanian deadlift, Downward-facing dog,
The Hundred, Cloud hands). Food names use the common English name; Israeli items keep their name when there is no English one (Bamba, Bissli, sabich).
