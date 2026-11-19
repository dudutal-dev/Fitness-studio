// תזונה לפי היום: עומס האימון קובע את יעד הפחמימה של אותו יום; החלבון קבוע; והמלצות לפני / במהלך / אחרי
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { targets, dayTargets, dayType, loadOf, fuelTips, mealPlan, DAY_TYPES } from '../js/engine/nutrition.js';

const P = (o = {}) => ({ name: 'דנה', sex: 'f', age: 32, heightCm: 168, weightKg: 64, days: 4, sessionMin: 60, goal: 'combat', level: 2, track: 'gym', dislikes: [], dislikedFoods: [], ...o });

test('load of a session: long runs, hard sessions, light sessions', () => {
  assert.equal(loadOf(null), 'rest');
  assert.equal(loadOf({ items: [{}], name: 'פלג עליון' }), 'hard');
  assert.equal(loadOf({ track: 'cali', items: [{}] }), 'hard');
  assert.equal(loadOf({ track: 'hiit', items: [{}] }), 'hard'); assert.equal(loadOf({ track: 'hiit', easy: true, items: [{}] }), 'light');
  assert.equal(loadOf({ track: 'mob', items: [{}] }), 'light'); assert.equal(loadOf({ track: 'pil', items: [{}] }), 'light'); assert.equal(loadOf({ track: 'yoga', items: [{}] }), 'light');
  assert.equal(loadOf({ runOnly: true, items: [], run: { type: 'long', totalSec: 2700 } }), 'long');
  assert.equal(loadOf({ runOnly: true, items: [], run: { type: 'easy', totalSec: 3900 } }), 'long', 'an hour or more counts as long');
  assert.equal(loadOf({ runOnly: true, items: [], run: { type: 'intervals', totalSec: 1500 } }), 'hard');
  assert.equal(loadOf({ runOnly: true, items: [], run: { type: 'runwalk', totalSec: 1700 } }), 'light');
  assert.equal(loadOf({ type: 'tempo', durationSec: 1500 }), 'hard', 'a saved run'); assert.equal(loadOf({ type: 'easy', durationSec: 4000 }), 'long');
  assert.equal(loadOf({ exercises: [{}], track: 'mob', durationSec: 700 }), 'light', 'a saved session');
  assert.equal(loadOf({ items: [{}], run: { type: 'intervals' } }), 'hard', 'a gym session with a run attached');
});

test('day targets: carbs follow the day, protein and fat stay the same, never below resting needs', () => {
  for (const p of [P(), P({ goal: 'cut' }), P({ goal: 'muscle' }), P({ sex: 'm', weightKg: 85, heightCm: 182 })]) {
    const base = targets(p);
    const d = Object.fromEntries(Object.keys(DAY_TYPES).map((k) => [k, dayTargets(p, k)]));
    assert.equal(d.light.kcal, base.kcal); assert.equal(d.light.carbs, base.carbs); assert.equal(d.light.dayDelta, 0);
    assert.ok(d.long.kcal > d.hard.kcal && d.hard.kcal > d.light.kcal && d.light.kcal >= d.rest.kcal);
    assert.ok(d.long.carbs > d.hard.carbs && d.hard.carbs > d.light.carbs && d.light.carbs >= d.rest.carbs);
    for (const t of Object.values(d)) { assert.equal(t.protein, base.protein); assert.equal(t.fat, base.fat); assert.ok(t.kcal >= base.bmr); assert.equal(t.baseKcal, base.kcal); assert.equal(t.dayDelta, t.kcal - base.kcal); }
    assert.ok(Math.abs(d.long.kcal / base.kcal - 1.15) < 0.01); assert.ok(Math.abs(d.hard.kcal / base.kcal - 1.05) < 0.01);
    // שבוע של 4 אימונים קשים ו-3 ימי מנוחה: הממוצע נשאר קרוב ליעד הרגיל
    const week = (4 * d.hard.kcal + 3 * d.rest.kcal) / 7; assert.ok(Math.abs(week / base.kcal - 1) < 0.02, String(week / base.kcal));
  }
  assert.equal(dayTargets(P(), 'unknown').kcal, targets(P()).kcal);
});

test('which day is it: what was done today wins, then the next planned session, unless marked as rest', () => {
  const now = new Date('2026-11-19T12:00:00').getTime(), at = (h) => new Date(`2026-11-19T${h}:00:00`).toISOString(), yesterday = new Date('2026-11-18T18:00:00').toISOString();
  const plan = { completedDays: [1], week: { sessions: [{ day: 1, name: 'א', items: [{}] }, { day: 2, name: 'מוביליטי', track: 'mob', items: [{}] }, { day: 3, name: 'ג', items: [{}] }] } };
  assert.deepEqual(dayType({ plan, sessions: [], runs: [] }, now), { type: 'light', name: 'מוביליטי', planned: true });
  assert.deepEqual(dayType({ plan, sessions: [], runs: [] }, now, 'rest'), { type: 'rest', manual: true });
  assert.equal(dayType({ plan, sessions: [{ date: yesterday, name: 'אתמול', exercises: [{}] }], runs: [] }, now).planned, true, 'yesterday does not count');
  const done = dayType({ plan, sessions: [{ date: at('08'), name: 'מוביליטי', track: 'mob', exercises: [{}] }], runs: [{ date: at('10'), name: 'ריצה ארוכה', type: 'long', durationSec: 4200 }] }, now, 'rest');
  assert.deepEqual(done, { type: 'long', name: 'ריצה ארוכה', done: true }, 'the heaviest thing done today, even if rest was marked');
  assert.deepEqual(dayType({ plan: { completedDays: [1, 2, 3], week: plan.week }, sessions: [], runs: [] }, now), { type: 'rest' }, 'week finished');
  assert.deepEqual(dayType({}, now), { type: 'rest' });
});

test('fuelling tips and the menu for the day', () => {
  const p = P({ weightKg: 70 });
  const long = fuelTips(p, 'long'), hard = fuelTips(p, 'hard'), light = fuelTips(p, 'light'), rest = fuelTips(p, 'rest');
  for (const t of [long, hard, light]) { assert.ok(t.before && t.during && t.after); assert.ok(!JSON.stringify(t).match(/undefined|NaN/)); }
  assert.ok(long.before.includes('105')); assert.ok(long.during.includes('30–60')); assert.ok(hard.before.includes('70')); assert.ok(hard.after.includes('20'));
  assert.ok(rest.rest && !rest.before);
  assert.ok(fuelTips(P({ weightKg: 150 }), 'hard').after.includes('40'), 'protein after a session is capped at 40 g'); assert.ok(fuelTips(P({ weightKg: 45 }), 'hard').after.includes('20'));
  // התפריט של יום ארוך נבנה ליעד של אותו יום
  const base = mealPlan(p, { ctx: 'home', seed: 3 }), big = mealPlan(p, { ctx: 'home', seed: 3, t: dayTargets(p, 'long') });
  assert.equal(base.targets.kcal, targets(p).kcal); assert.equal(big.targets.kcal, dayTargets(p, 'long').kcal);
  assert.ok(big.total.kcal > base.total.kcal, `${big.total.kcal} > ${base.total.kcal}`);
  assert.ok(Math.abs(big.total.kcal / big.targets.kcal - 1) < 0.12, 'the menu lands near the day target');
});
