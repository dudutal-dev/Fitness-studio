// מנות אמיתיות בתפריט, והחלפה של פריט בודד או של מנה שלמה.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mealPlan, targets, swapOptions, dishOptions, planPool } from '../js/engine/nutrition.js';
import { DISHES, DISH } from '../js/data/dishes.js';
import { FOOD } from '../js/data/foods.js';

const P = (o = {}) => ({ name: 'דנה', sex: 'f', age: 32, heightCm: 168, weightKg: 64, days: 4, sessionMin: 60, goal: 'tone', level: 2, track: 'gym', dislikes: [], dislikedFoods: [], ...o });
const MEAT = ['chicken', 'red_meat'], MILK = ['dairy', 'cottage'];
const tagsOf = (ids) => ids.flatMap((id) => FOOD[id].tags);

test('every dish is built from foods that exist, with sensible quantities and a unique id', () => {
  assert.equal(new Set(DISHES.map((d) => d.id)).size, DISHES.length);
  for (const d of DISHES) {
    assert.ok(d.name && d.meals.length && d.items.length >= 2, d.id);
    for (const [id, q] of d.items) { assert.ok(FOOD[id], `${d.id}: unknown food ${id}`); assert.ok(q >= 0.5 && q <= 2, `${d.id}: quantity ${q}`); }
    assert.ok(d.meals.every((c) => 'bslpd'.includes(c)), d.id);
  }
});

test('an ordinary menu is made of real dishes and still reaches the targets', () => {
  const p = P(), t = targets(p);
  let withDish = 0, meals = 0;
  for (const ctx of ['home', 'base', 'field']) for (let seed = 1; seed <= 20; seed++) {
    const plan = mealPlan(p, { ctx, seed });
    for (const m of plan.meals) { meals++; if (m.dish) { withDish++; assert.equal(DISH[m.dish.id].name, m.dish.name); for (const [id] of DISH[m.dish.id].items) assert.ok(m.items.some((it) => it.id === id), `${m.dish.name}: missing ${id}`); } }
    assert.ok(Math.abs(plan.total.kcal - t.kcal) <= t.kcal * 0.12, `${ctx} #${seed}: ${plan.total.kcal}/${t.kcal}`);
    assert.ok(plan.total.p >= t.protein * 0.85, `${ctx} #${seed}: protein ${plan.total.p}/${t.protein}`);
    assert.equal(new Set(plan.meals.map((m) => m.dish?.id).filter(Boolean)).size, plan.meals.filter((m) => m.dish).length, 'no dish twice in a day');
  }
  assert.ok(withDish / meals > 0.9, `only ${withDish}/${meals} meals are real dishes`);
});

test('dishes respect diet, kashrut and allergies', () => {
  for (let seed = 1; seed <= 25; seed++) {
    const vegan = mealPlan(P({ diet: 'vegan' }), { ctx: 'home', seed });
    assert.deepEqual(tagsOf(vegan.meals.flatMap((m) => m.items.map((it) => it.id))).filter((x) => [...MEAT, ...MILK, 'fish', 'tuna', 'eggs'].includes(x)), []);
    const kosher = mealPlan(P({ kosher: true }), { ctx: 'home', seed });
    for (const m of kosher.meals) { const tg = tagsOf(m.items.map((it) => it.id)); assert.ok(!(tg.some((x) => MEAT.includes(x)) && tg.some((x) => MILK.includes(x))), `${m.dish?.name || m.name} mixes meat and dairy`); }
    const gf = mealPlan(P({ allergies: ['gluten'] }), { ctx: 'home', seed });
    assert.deepEqual(tagsOf(gf.meals.flatMap((m) => m.items.map((it) => it.id))).filter((x) => ['bread', 'pasta', 'oats'].includes(x)), []);
  }
});

test('a dish keeps its components: nothing is dropped to zero, and they scale together', () => {
  for (let seed = 1; seed <= 30; seed++) for (const m of mealPlan(P({ weightKg: 95, goal: 'cut' }), { ctx: 'home', seed }).meals) {
    const parts = m.items.filter((it) => it.base);
    for (const it of parts) assert.ok(it.qty >= 0.5, `${m.dish?.name}: ${it.id} x${it.qty}`);
    if (parts.length > 1) { const r = parts.map((it) => it.qty / it.base); assert.ok(Math.max(...r) / Math.min(...r) <= 5, `${m.dish?.name}: ${r.join(', ')}`); }
  }
});

test('swapping one item: alternatives are of the same kind, allowed, and the swap sticks', () => {
  const p = P({ kosher: true, allergies: ['gluten'] }), opt = { ctx: 'home', seed: 3 };
  const plan = mealPlan(p, opt), pool = new Set(planPool(p, 'home').map((f) => f.id));
  const mi = plan.meals.findIndex((m) => m.items.length >= 3), meal = plan.meals[mi], it = meal.items[0];
  const alts = swapOptions(p, plan, mi, it.id, opt);
  assert.ok(alts.length >= 1 && alts.length <= 3);
  for (const f of alts) { assert.equal(f.cat, FOOD[it.id].cat); assert.ok(pool.has(f.id)); assert.ok(!plan.meals.some((m) => m.items.some((x) => x.id === f.id))); }
  const after = mealPlan(p, { ...opt, swaps: { [`${meal.id}|${it.id}`]: alts[0].id } }), m2 = after.meals[mi];
  assert.ok(m2.items.some((x) => x.id === alts[0].id) && !m2.items.some((x) => x.id === it.id));
  assert.equal(m2.items.find((x) => x.id === alts[0].id).from, it.id, 'remembers what it replaced');
  assert.equal(m2.dish, undefined, 'the dish name is dropped once its composition changed');
  const tg = tagsOf(m2.items.map((x) => x.id)); assert.ok(!(tg.some((x) => MEAT.includes(x)) && tg.some((x) => MILK.includes(x))));
  const t = targets(p); assert.ok(Math.abs(after.total.kcal - t.kcal) <= t.kcal * 0.12, 'quantities are refitted after the swap');
  // שאר הארוחות לא השתנו
  after.meals.forEach((m, i) => { if (i !== mi) assert.equal(m.dish?.id, plan.meals[i].dish?.id); });
});

test('a swap to a food the trainee may not eat is ignored', () => {
  const p = P({ diet: 'vegan' }), opt = { ctx: 'home', seed: 2 }, plan = mealPlan(p, opt);
  const meal = plan.meals[0], it = meal.items[0];
  const after = mealPlan(p, { ...opt, swaps: { [`${meal.id}|${it.id}`]: 'chicken_breast' } });
  assert.ok(!after.meals.some((m) => m.items.some((x) => x.id === 'chicken_breast')));
});

test('choosing another dish: the options fit the meal and the choice is applied', () => {
  const p = P(), opt = { ctx: 'home', seed: 5 }, plan = mealPlan(p, opt);
  const mi = plan.meals.findIndex((m) => m.id === 'lunch'), opts = dishOptions(p, plan, mi, opt);
  assert.ok(opts.length >= 2 && opts.length <= 3);
  for (const d of opts) { assert.ok(d.meals.includes('l')); assert.notEqual(d.id, plan.meals[mi].dish?.id); }
  const after = mealPlan(p, { ...opt, dishes: { lunch: opts[0].id } });
  assert.equal(after.meals[mi].dish.id, opts[0].id);
  const t = targets(p); assert.ok(Math.abs(after.total.kcal - t.kcal) <= t.kcal * 0.12);
});
