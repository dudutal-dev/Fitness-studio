// שערי הבטיחות של התזונה: למי שגירעון קלורי עלול להזיק לו — אין גירעון, גם אם המטרה היא ירידה במשקל.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { targets, dayTargets, nutritionGuard, trendAdvice, allergyHits, planAllowed } from '../js/engine/nutrition.js';
import { FOOD } from '../js/data/foods.js';

const P = (o = {}) => ({ name: 'דנה', sex: 'f', age: 30, heightCm: 165, weightKg: 62, days: 4, sessionMin: 60, goal: 'cut', level: 2, track: 'gym', dislikes: [], dislikedFoods: [], ...o });

test('an ordinary adult on a cut does get a deficit', () => {
  const t = targets(P());
  assert.equal(t.guard.noDeficit, false);
  assert.ok(t.delta < 0 && t.kcal < t.tdee);
});

test('no deficit for pregnancy, breastfeeding, a medical condition, under 18, or underweight', () => {
  const cases = { preg: P({ health: ['preg'] }), nurse: P({ health: ['nurse'] }), med: P({ health: ['med'] }), minor: P({ age: 16 }), under: P({ weightKg: 48 }) };
  for (const [why, p] of Object.entries(cases)) {
    const t = targets(p), g = nutritionGuard(p);
    assert.ok(g.noDeficit && g.reasons.includes(why), why);
    assert.equal(t.delta, 0, `${why}: delta`);
    assert.ok(t.kcal >= t.tdee - 10, `${why}: ${t.kcal} kcal is under maintenance ${t.tdee}`);
    assert.ok(dayTargets(p, 'rest').kcal >= t.kcal, `${why}: rest day goes under maintenance`);
    assert.ok(targets({ ...p, kcalAdjust: -400 }).kcal >= t.kcal, `${why}: calibration pushes under maintenance`);
  }
});

test('pregnancy marked in the class safety form counts for nutrition too', () => {
  for (const o of [{ yogaFlags: ['preg'] }, { pilFlags: ['preg'] }, { mob: { flags: ['preg'] } }]) assert.ok(nutritionGuard(P(o)).reasons.includes('preg'));
});

test('a surplus is still allowed, and maintenance goals are untouched', () => {
  assert.ok(targets(P({ goal: 'muscle', weightKg: 48 })).delta > 0);
  assert.equal(targets(P({ goal: 'tone', age: 16 })).delta, 0);
});

test('protein is moderated with a medical condition and capped for minors', () => {
  assert.ok(targets(P({ health: ['med'] })).perKg <= 1.2);
  assert.ok(targets(P({ age: 16 })).perKg <= 1.6);
  assert.ok(targets(P()).perKg >= 1.6);
});

test('the weight-trend advice does not push a guarded person to lose faster', () => {
  const now = Date.parse('2026-11-20'); const day = (n) => new Date(now - n * 864e5).toISOString();
  const stable = [20, 14, 7, 0].map((n) => ({ date: day(n), kg: 62 }));
  assert.equal(trendAdvice(stable, P(), now).step, -150, 'ordinary cut: stable weight asks for fewer calories');
  assert.equal(trendAdvice(stable, P({ health: ['preg'] }), now).step, 0);
});

test('allergy marking: foods that contain a marked allergen are flagged', () => {
  const p = P({ allergies: ['gluten', 'sesame'] });
  assert.deepEqual(allergyHits(FOOD.pita, p), ['גלוטן']);
  assert.deepEqual(allergyHits(FOOD.tahini, p), ['שומשום']);
  assert.deepEqual(allergyHits(FOOD.banana, p), []);
  assert.deepEqual(allergyHits(FOOD.pita, P()), []);
  assert.equal(planAllowed(FOOD.pita, p), false);
  assert.deepEqual(allergyHits({ id: 'x_custom', name: 'משלי' }, p), [], 'a custom food without tags does not crash');
});
