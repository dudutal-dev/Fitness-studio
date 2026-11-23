// "לא אוכל" רחב: חיטה, אוכל מעובד, סוכר — הקבוצות מסננות את התפריט, ועדיין נבנה תפריט שלם
import test from 'node:test';
import assert from 'node:assert/strict';
import { FOOD, FOODS, DISLIKE_TAGS } from '../js/data/foods.js';
import { mealPlan, targets, inDislikeGroup, DISLIKE_GROUPS, allowed } from '../js/engine/nutrition.js';

const P = (o = {}) => ({ name: 'דנה', sex: 'f', age: 32, heightCm: 168, weightKg: 64, days: 4, sessionMin: 60, goal: 'tone', level: 2, track: 'gym', nutrition: true, dislikes: [], dislikedFoods: [], ...o });
const by = (name) => FOODS.find((f) => f.name === name);

test('שלוש הקבוצות מופיעות ברשימת "לא אוכל", וכל מזהה שבהן קיים במאגר', () => {
  for (const g of ['wheat', 'processed', 'sugar']) {
    assert.ok(DISLIKE_TAGS[g], g);
    for (const id of DISLIKE_GROUPS[g].ids) assert.ok(FOOD[id], `${g}: ${id}`);
  }
});
test('מה נכנס לכל קבוצה ומה לא', () => {
  const yes = { wheat: ['פסטה', 'פיתה', 'קוסקוס', 'שניצל עוף', 'בורקס גבינה'], processed: ['נקניקייה', 'במבה', 'משקה קל קולה', 'מעדן חלב שוקולד'], sugar: ['דבש', 'ריבה', 'שוקולד חלב', 'גלידה', 'משקה קל קולה'] };
  const no = { wheat: ['אורז לבן', 'שיבולת שועל (יבשה)', 'קינואה', 'תפוחי אדמה מבושלים', 'פריכיות אורז'], processed: ['חזה עוף צלוי', 'טונה במים', 'קוטג׳ 5%', 'נקטרינה', 'אורז לבן'], sugar: ['בננה', 'תמרים יבשים', 'מיץ תפוזים סחוט', 'נקטרינה', 'יוגורט 3%'] };
  for (const g of Object.keys(yes)) {
    for (const n of yes[g]) assert.equal(inDislikeGroup(by(n), g), true, `${g}: ${n}`);
    for (const n of no[g]) assert.equal(inDislikeGroup(by(n), g), false, `${g}: ${n}`);
  }
  assert.equal(allowed(by('פסטה'), ['wheat']), false);
  assert.equal(allowed(by('פסטה'), ['sugar']), true);
});
test('התפריט נבנה בלי מאכלי הקבוצה — כל קבוצה לבד, ושלושתן יחד — ועדיין קרוב ליעד', () => {
  for (const dislikes of [['wheat'], ['processed'], ['sugar'], ['wheat', 'processed', 'sugar']]) for (const ctx of ['home', 'base', 'field']) for (let seed = 1; seed <= 12; seed++) {
    const p = P({ dislikes }), t = targets(p), plan = mealPlan(p, { ctx, seed });
    const items = plan.meals.flatMap((m) => m.items);
    assert.ok(items.length >= 6, `${dislikes} ${ctx} ${seed}: ${items.length} items`);
    for (const it of items) for (const g of dislikes) assert.equal(inDislikeGroup(FOOD[it.id], g), false, `${g}: ${FOOD[it.id].name} (${ctx}, ${seed})`);
    assert.ok(Math.abs(plan.total.kcal - t.kcal) / t.kcal < 0.2, `${dislikes} ${ctx} ${seed}: ${plan.total.kcal} / ${t.kcal}`);
  }
});
