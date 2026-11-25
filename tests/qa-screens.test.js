// תיקוני מסכים מהבדיקה המקיפה (25.11.2026): כותרת הבית, תחומים נוספים, לשוניות ההתקדמות, ספריית התרגילים, רמת HIIT בהיכרות, והמדריך
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { extrasOf, buildWeek } from '../js/engine/program.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const css = read('css/app.css');
const rule = (sel) => { const i = css.indexOf(`\n${sel} {`); assert.ok(i >= 0, `אין כלל ${sel}`); return css.slice(i, css.indexOf('}', i)); };

test('כותרת הבית: תיבת הכפתורים לא מתכווצת, ושורת המסלול סופגת את החוסר', () => {
  assert.match(rule('.top-actions'), /flex: 0 0 auto/);
  assert.doesNotMatch(rule('.top-actions'), /flex-shrink: 1|min-width: 0/);
  assert.match(rule('.hello'), /flex: 1 1 0; min-width: 0/);
});

test('לשוניות מסך ההתקדמות לא נחתכות, ושאר ה-.seg לא השתנו', () => {
  assert.match(css, /\.seg:not\(\.tabs\):has\(> \[data-tab\]\) button \{[^}]*min-width: max-content/);
  assert.match(rule('.seg button'), /flex: 1 1 0; min-width: 0;/);
  assert.match(read('js/views/progress.js'), /<div class="seg" style="margin-bottom:14px">\$\{tabs\.map\(\(\[k, t\]\) => `<button data-tab=/);   // הכלל נשען על המבנה הזה
});

// fitExtra היא פונקציה טהורה בתוך מסך (שאי אפשר לטעון ב-node): נלקחת מהמקור
const src = read('js/views/track-sheet.js');
const fitExtra = new Function(`${src.match(/export (function fitExtra\([^]*?\n}\n)/)[1]}; return fitExtra;`)();
// אותו חשבון כמו setExtra, על פרופיל בלבד
const setExtra = (p, track, n) => {
  const was = p.extras?.[track] || 0, others = Object.entries(p.extras || {}).reduce((a, [t, m]) => a + (t !== track ? m : 0), 0);
  const f = fitExtra(p.days, was ? p.extraDays?.[track] ?? was : 0, others, n);
  const q = { ...p, days: f.days, extras: { ...(p.extras || {}), [track]: f.n }, extraDays: { ...(p.extraDays || {}), [track]: f.took } };
  if (!f.n) { delete q.extras[track]; delete q.extraDays[track]; }
  return q;
};
const gym = { track: 'gym', coach: 'ori', days: 4, level: 2, goal: 'general', sex: 'f', injuries: [], sessionMin: 60 };
const scheduled = (p) => Object.fromEntries(extrasOf(p).map((x) => [x.track, x.n]));

test('תחומים נוספים: הסרה מחזירה בדיוק את הימים שההוספה לקחה', () => {
  let p = setExtra(gym, 'tai', 3);
  assert.equal(p.days, 6); assert.deepEqual(p.extras, { tai: 3 }); assert.equal(p.extraDays.tai, 2);
  p = setExtra(p, 'tai', 0);
  assert.equal(p.days, 4); assert.deepEqual(p.extras, {});                       // היה: 3
  for (const d of [2, 3, 4, 5, 6]) for (const n of [1, 2, 3]) assert.equal(setExtra(setExtra({ ...gym, days: d }, 'yoga', n), 'yoga', 0).days, d, `${d} ימים, ${n} שיעורים`);
});

test('תחומים נוספים: מה שנשמר הוא מה שנכנס לשבוע, גם כשאין מקום לכל מה שביקשו', () => {
  let p = gym;
  for (const [t, n] of [['yoga', 2], ['pil', 1], ['tai', 3]]) { p = setExtra(p, t, n); assert.deepEqual(scheduled(p), p.extras, `${t}=${n}`); }
  assert.deepEqual(p.extras, { yoga: 2, pil: 1, tai: 2 });                       // לטאי צ'י נשארו רק שניים
  assert.equal(buildWeek(p).sessions.filter((w) => w.xtrack === 'tai').length, 2);
  assert.equal(buildWeek(p).sessions.filter((w) => !w.extra).length, 1);          // אימון אחד לפחות נשאר למסלול הראשי
  for (const t of ['yoga', 'pil', 'tai']) { p = setExtra(p, t, 0); assert.deepEqual(scheduled(p), p.extras); }
  assert.equal(p.days, 4);                                                        // היה: 2, עם שלושה אימונים בשבוע
  assert.equal(buildWeek(p).sessions.length, 4);
});

test('תחומים נוספים: שינוי מספר (3 ← 1) ופרופיל ישן בלי extraDays', () => {
  let p = setExtra(setExtra(gym, 'yoga', 3), 'yoga', 1);
  assert.equal(p.days, 5); assert.equal(setExtra(p, 'yoga', 0).days, 4);
  assert.equal(setExtra({ ...gym, days: 5, extras: { yoga: 1 } }, 'yoga', 0).days, 4);   // בלי extraDays: כמו קודם, כל שיעור הוא יום
  assert.deepEqual(fitExtra(6, 0, 5, 2), { n: 0, days: 6, took: 0 });                    // שבוע מלא: לא נכנס כלום, והימים לא משתנים
});

test('ספריית התרגילים מוצגת רק כשיש תרגילים להציג (הליכה ומדיטציה בתנועה: אין)', async () => {
  const plan = read('js/views/plan.js');
  assert.match(plan, /const hasLib = !\(run && !mobN\) && EXERCISES\.some\(inTracks\);/);
  assert.match(plan, /\$\{hasLib \? html`<div class="h2">ספריית תרגילים/);
  const { EXERCISES } = await import('../js/data/exercises.js');
  for (const t of ['walk', 'med']) assert.equal(EXERCISES.filter((e) => e.tracks.includes(t)).length, 0, t);
});

test('היכרות HIIT: רמת ברירת המחדל היא אחת מהאפשרויות שמוצגות', () => {
  const ob = read('js/views/onboarding.js');
  const def = Number(ob.match(/hiitLevel: (\d)/)[1]);
  const opts = [...ob.match(/data-hiitlevel>\$\{\[(.*?)\]\.map/)[1].matchAll(/\[(\d),/g)].map((m) => Number(m[1]));
  assert.deepEqual(opts, [1, 3, 5]);
  assert.ok(opts.includes(def), `ברירת המחדל ${def} לא מוצעת`);
});

test('המדריך: מדיטציה בתנועה ברשימת המסלולים, ושקף משלה', () => {
  const g = read('js/views/guide.js');
  assert.match(g, /הליכה, מדיטציה בתנועה, HIIT/);
  assert.match(g, /id: 'med', title: 'מדיטציה בתנועה'/);
  assert.match(g, /COACHES\.or\.img/);
  assert.ok(existsSync(new URL('../assets/coaches/or.webp', import.meta.url)));
});
