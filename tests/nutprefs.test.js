// שאלון התזונה: ליווי התזונה הוא בחירה; מי שבחר בו — התפריט מכבד סוג תזונה, כשרות, אלרגיות ומספר ארוחות.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mealPlan, targets, wantsNutrition, mealsFor, planAllowed } from '../js/engine/nutrition.js';
import { FOOD } from '../js/data/foods.js';

const P = (o = {}) => ({ name: 'דנה', sex: 'f', age: 32, heightCm: 168, weightKg: 64, days: 4, sessionMin: 60, goal: 'tone', level: 2, track: 'gym', dislikes: [], dislikedFoods: [], ...o });
const each = (p, fn) => { for (const ctx of ['home', 'base', 'field']) for (let seed = 1; seed <= 25; seed++) fn(mealPlan(p, { ctx, seed }), ctx, seed); };
const tagsOf = (plan) => plan.meals.flatMap((m) => m.items.flatMap((it) => FOOD[it.id].tags));

test('nutrition is opt-in: only an explicit "no" turns it off', () => {
  assert.equal(wantsNutrition({}), true); assert.equal(wantsNutrition({ nutrition: true }), true); assert.equal(wantsNutrition({ nutrition: false }), false);
});

test('vegetarian and vegan menus contain no animal foods and still reach the targets', () => {
  for (const [diet, banned] of [['veg', ['chicken', 'red_meat', 'fish', 'tuna']], ['vegan', ['chicken', 'red_meat', 'fish', 'tuna', 'eggs', 'dairy', 'cottage']]]) {
    const p = P({ diet }), t = targets(p);
    each(p, (plan, ctx, seed) => {
      const bad = tagsOf(plan).filter((x) => banned.includes(x));
      assert.deepEqual(bad, [], `${diet} ${ctx} #${seed}`);
      assert.ok(plan.total.p >= t.protein * 0.85, `${diet} ${ctx} #${seed}: protein ${plan.total.p}/${t.protein}`);
      assert.ok(Math.abs(plan.total.kcal - t.kcal) <= t.kcal * 0.12, `${diet} ${ctx} #${seed}: kcal ${plan.total.kcal}/${t.kcal}`);
    });
  }
});

test('kosher: no meal mixes meat with dairy', () => {
  const meat = ['chicken', 'red_meat'], milk = ['dairy', 'cottage'];
  let mixedWithout = 0;
  each(P({ kosher: true }), (plan, ctx, seed) => {
    for (const m of plan.meals) { const tg = m.items.flatMap((it) => FOOD[it.id].tags); assert.ok(!(tg.some((x) => meat.includes(x)) && tg.some((x) => milk.includes(x))), `${ctx} #${seed} ${m.name}`); }
  });
  each(P(), (plan) => { for (const m of plan.meals) { const tg = m.items.flatMap((it) => FOOD[it.id].tags); if (tg.some((x) => meat.includes(x)) && tg.some((x) => milk.includes(x))) mixedWithout++; } });
  assert.ok(mixedWithout > 0, 'without the kosher setting such meals do occur — the test is meaningful');
});

test('allergies remove the foods from the menu', () => {
  each(P({ allergies: ['gluten', 'lactose', 'peanut'] }), (plan, ctx, seed) => {
    const ids = plan.meals.flatMap((m) => m.items.map((it) => it.id));
    assert.deepEqual(tagsOf(plan).filter((x) => ['bread', 'pasta', 'oats', 'dairy', 'cottage', 'peanut'].includes(x)), [], `${ctx} #${seed}`);
    assert.ok(!ids.includes('couscous') && !ids.includes('schnitzel'));
  });
  assert.equal(planAllowed(FOOD.tofu, P({ allergies: ['soy'] })), false);
  assert.equal(planAllowed(FOOD.tofu, P()), true);
});

test('number of meals: 3, 4 or 5 — and the day still adds up', () => {
  for (const n of [3, 4, 5]) {
    const p = P({ mealsN: n }), t = targets(p), ms = mealsFor(p);
    assert.equal(ms.length, n);
    assert.ok(Math.abs(ms.reduce((a, m) => a + m.share, 0) - 1) < 1e-9);
    each(p, (plan, ctx, seed) => {
      assert.equal(plan.meals.length, n);
      assert.ok(Math.abs(plan.total.kcal - t.kcal) <= t.kcal * 0.12, `${n} meals ${ctx} #${seed}: ${plan.total.kcal}/${t.kcal}`);
    });
  }
});

test('favourites and recently logged foods are picked more often', () => {
  const count = (p, opt) => { let n = 0; for (let seed = 1; seed <= 200; seed++) if (mealPlan(p, { ctx: 'home', seed, ...opt }).meals.some((m) => m.items.some((it) => it.id === 'salmon'))) n++; return n; };
  const base = count(P(), {});
  assert.ok(count(P({ favFoods: ['salmon'] }), {}) > base * 1.3, 'favourite');
  assert.ok(count(P(), { recent: ['salmon'] }) > base * 1.1, 'recent');
});
