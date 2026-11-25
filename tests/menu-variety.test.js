// התפריט מתגוון מיום ליום גם בארוחת הבוקר (25.11.2026): קודם ארוחת הבוקר לא התחלפה חודש שלם, כי הזרע (היום בחודש) לא עורבב
import test from 'node:test';
import assert from 'node:assert/strict';
import { mealPlan, dayTargets } from '../js/engine/nutrition.js';

const key = (m) => m.items.map((i) => i.id).sort().join('+');
test('28 ימים: ארוחת הבוקר מתחלפת, ואף ארוחה לא חוזרת יותר מחמישה ימים ברצף', () => {
  const p = { heightCm: 178, age: 30, sex: 'm', weightKg: 80, goal: 'muscle', track: 'gym', days: 4, dislikes: [], dislikedFoods: [], nutrition: true };
  for (const prof of [p, { ...p, diet: 'veg' }, { ...p, kosher: true }]) {
    const slots = [];
    for (let day = 1; day <= 28; day++) mealPlan(prof, { ctx: 'home', seed: day, t: dayTargets(prof, day % 2 ? 'hard' : 'rest') }).meals.forEach((m, i) => (slots[i] ||= []).push(key(m)));
    assert.ok(new Set(slots[0]).size >= 6, `מנות בוקר שונות: ${new Set(slots[0]).size}`);
    for (const a of slots) { let run = 1; for (let i = 1; i < a.length; i++) { run = a[i] === a[i - 1] ? run + 1 : 1; assert.ok(run <= 5, 'אותה ארוחה יותר מחמישה ימים ברצף'); } }
    // אותו יום — אותו תפריט
    assert.deepEqual(mealPlan(prof, { ctx: 'home', seed: 9, t: dayTargets(prof, 'hard') }).meals.map(key), mealPlan(prof, { ctx: 'home', seed: 9, t: dayTargets(prof, 'hard') }).meals.map(key));
  }
});
