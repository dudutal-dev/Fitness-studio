// קבוצות המזון מטבלה (25.11.2026): "לא אוכל" הרחב וסימוני האלרגיה שלפי שם המאכל נענים מ-js/data/food-groups.js, שנוצרת מהמקור העברי —
// כדי שהמהדורה האנגלית של MOVA, שבה השמות מתורגמים, תסנן ותסמן בדיוק את אותם מאכלים. ועוד: רצפה מוחלטת ליעד הקלוריות.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FOODS, FOOD } from '../js/data/foods.js';
import { FOOD_GROUPS } from '../js/data/food-groups.js';
import { RAW_FOOD_RULES, DISLIKE_GROUPS, inDislikeGroup, allergyHits, blockedBy, ALLERGIES, targets, dayTargets, KCAL_MIN, DAY_TYPES } from '../js/engine/nutrition.js';
import { render } from '../tools/food_groups.mjs';

test('js/data/food-groups.js מעודכן: זהה למה ש-tools/food_groups.mjs מייצר עכשיו מהמאגר', async () => {
  assert.equal(readFileSync('js/data/food-groups.js', 'utf8'), await render(), 'הטבלה ישנה — להריץ node tools/food_groups.mjs');
});

test('הטבלה מכסה את כל הכללים, מחזיקה מזהים קיימים בלבד, ואין בה טקסט בעברית מחוץ להערה', () => {
  assert.deepEqual(Object.keys(FOOD_GROUPS).sort(), [...Object.keys(DISLIKE_GROUPS), 'gluten', 'sesame'].sort());
  for (const [k, ids] of Object.entries(FOOD_GROUPS)) { assert.ok(ids.length > 0, k); for (const id of ids) assert.ok(FOOD[id], `${k}: ${id}`); }
  assert.ok(!/[א-ת]/.test(readFileSync('js/data/food-groups.js', 'utf8').split('\n').slice(1).join('\n')), 'טקסט בעברית בטבלה היה מתורגם בבניית en/');
});

test('לכל מאכל במאגר: התשובה מהטבלה זהה לכלל הגולמי (ההתנהגות בעברית לא השתנתה)', () => {
  for (const f of FOODS) {
    for (const g of Object.keys(DISLIKE_GROUPS)) assert.equal(inDislikeGroup(f, g), RAW_FOOD_RULES[g](f), `${g}: ${f.id}`);
    for (const a of ['gluten', 'sesame']) if (RAW_FOOD_RULES[a](f)) assert.ok(allergyHits(f, { allergies: [a] }).includes(ALLERGIES[a]), `${a}: ${f.id}`);
  }
  for (const a of ['gluten', 'sesame']) for (const id of FOOD_GROUPS[a]) assert.ok(blockedBy({ allergies: [a] }).ids.has(id), `${a} חסום בתפריט: ${id}`);
});

test('מאכל מהמאגר נענה לפי המזהה גם כשהשם אינו בעברית; מזון שהמתאמן יצר נבדק לפי השם שהקליד', () => {
  // כך נראה מאכל במהדורה האנגלית: אותו אובייקט מהמאגר, עם שם ותיאור מקור מתורגמים. מדמים זאת על המאגר עצמו ומחזירים.
  const tr = (f) => ({ ...f, name: 'Translated name', src: (f.src || []).map((x) => ({ ...x, name: 'translated source' })) });
  const pick = (k) => FOODS.find((f) => FOOD_GROUPS[k].includes(f.id) && !RAW_FOOD_RULES[k](tr(f)));   // מאכל שנתפס רק בזכות השם או תיאור המקור
  for (const k of Object.keys(FOOD_GROUPS)) {
    const f = pick(k); assert.ok(f, `אין מאכל לבדיקה ב-${k}`);
    const keep = [f.name, f.src]; ({ name: f.name, src: f.src } = tr(f));
    try {
      assert.equal(RAW_FOOD_RULES[k](f), false, `${k}: ${f.id} — הכלל הגולמי אמור להחמיץ שם מתורגם (אחרת הבדיקה לא בודקת כלום)`);
      if (DISLIKE_GROUPS[k]) assert.equal(inDislikeGroup(f, k), true, `${k}: ${f.id}`); else assert.ok(allergyHits(f, { allergies: [k] }).length, `${k}: ${f.id}`);
    } finally { [f.name, f.src] = keep; }
  }
  const mine = { id: 'c_1', name: 'עוגת שוקולד ביתית', tags: [], custom: true };
  assert.ok(inDislikeGroup(mine, 'sugar') && inDislikeGroup(mine, 'wheat') && allergyHits(mine, { allergies: ['gluten'] }).length === 1);
  assert.ok(!inDislikeGroup({ id: 'c_2', name: 'סלט ירקות', tags: [], custom: true }, 'sugar'));
  // מזהה של מאכל מהמאגר עם שם אחר (לא אותו מאכל) — לפי השם, לא לפי הטבלה
  assert.equal(inDislikeGroup({ id: pick('sugar').id, name: 'מלפפון', tags: [] }, 'sugar'), false);
  assert.equal(inDislikeGroup(null, 'sugar'), false); assert.equal(inDislikeGroup(FOODS[0], 'nope'), false);
});

test('הטבלה ב-CORE של ה-service worker, ונוצרת בשחרור לפני בניית הגרסה האנגלית', () => {
  assert.ok(readFileSync('sw.js', 'utf8').includes("'js/data/food-groups.js'"));
  const rel = readFileSync('tools/release.mjs', 'utf8'), at = rel.indexOf('food_groups.mjs');
  assert.ok(at > 0); const en = rel.indexOf('i18n.mjs'); assert.ok(en < 0 || at < en, 'food_groups.mjs צריך לרוץ לפני i18n.mjs build');
});

test('רצפה מוחלטת ליעד הקלוריות: 1,200 לנשים, 1,500 לגברים — גם ביום מנוחה ועם כיול שלילי', () => {
  const a = { sex: 'f', weightKg: 45, heightCm: 150, age: 70, goal: 'cut', days: 1 }, b = { sex: 'f', weightKg: 50, heightCm: 150, age: 55, goal: 'cut', days: 1 };
  assert.equal(targets(a).kcal, 1200); assert.equal(targets(b).kcal, 1200);   // היו 960 ו-1,100
  assert.equal(dayTargets(a, 'rest').kcal, 1200); assert.equal(dayTargets(b, 'rest').kcal, 1200);
  // הגירעון שמוחזר הוא מה שנשאר בפועל אחרי הרצפה, ולא יותר מהמקורי
  for (const p of [a, b]) { const t = targets(p); assert.ok(t.delta <= 0 && t.delta >= -280 && Math.abs(t.kcal - (t.tdee + t.delta)) <= 6, JSON.stringify([t.kcal, t.tdee, t.delta])); }
  // מי שהרצפה לא נוגעת בו — בלי שינוי
  const big = targets({ sex: 'm', weightKg: 80, heightCm: 178, age: 30, goal: 'cut', days: 4 }); assert.equal(big.delta, -Math.round((0.005 * 80 * 7700) / 7)); assert.equal(big.kcal, Math.round((big.tdee + big.delta) / 10) * 10);
  let n = 0;
  for (const sex of ['f', 'm']) for (let w = 40; w <= 130; w += 10) for (let h = 145; h <= 200; h += 5) for (const age of [18, 30, 55, 70, 85]) for (const goal of ['cut', 'muscle', 'fit']) for (const days of [1, 3, 6]) for (const kcalAdjust of [0, -500])
    for (const type of Object.keys(DAY_TYPES)) { const p = { sex, weightKg: w, heightCm: h, age, goal, days, kcalAdjust }, t = dayTargets(p, type); n++;
      assert.ok(t.kcal >= KCAL_MIN[sex] && t.kcal >= t.bmr - 5 && t.carbs >= 0, `${JSON.stringify(p)} ${type}: ${t.kcal}`); }
  assert.ok(n > 10000);
});
