// תיקונים מהבדיקה המקיפה (25.11.2026)
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { trendAdvice, allergyHits, blockedBy } from '../js/engine/nutrition.js';
import { FOODS } from '../js/data/foods.js';

const now = Date.now(), up = [21, 14, 7, 0].map((d, i) => ({ date: new Date(now - d * 864e5).toISOString(), kg: 62 + i * 0.4 }));
const base = { sex: 'f', weightKg: 63, heightCm: 165, age: 30, goal: 'cut', track: 'gym', days: 3 };

test('מצב רגיש: כשהמשקל עולה אין המלצה להוריד קלוריות; ירידה מהירה עדיין מקבלת המלצה להעלות', () => {
  assert.equal(trendAdvice(up, base).step, -150);                                   // מתאמנת רגילה בחיטוב: ההמלצה נשארת
  for (const h of ['preg', 'nurse', 'med']) assert.equal(trendAdvice(up, { ...base, health: [h] }), null, h);
  assert.equal(trendAdvice(up.map((x) => ({ ...x, kg: x.kg - 15 })), { ...base, weightKg: 48 }), null);   // תת־משקל
  assert.equal(trendAdvice(up, { ...base, age: 16 }), null);
  assert.equal(trendAdvice(up.map((x, i) => ({ ...x, kg: 62 - i * 0.6 })), { ...base, health: ['preg'] }).step, 150);
});

test('אלרגיה לגלוטן: מאכלי חיטה מהמאגר המורחב מסומנים, ומה שבלי גלוטן לא', () => {
  const p = { allergies: ['gluten'] }, by = (s) => FOODS.find((x) => x.name.includes(s)), ids = blockedBy(p).ids;
  for (const s of ['קרואסון חמאה', 'בבקה', 'וופל בלגי', 'בייגלה מלוח', 'עוגיות אוראו', 'טאבולה', 'וויטביקס', 'דייסת סולת', 'שניצל עם פירה', 'קוסקוס עם מרק', 'נאגטס', 'מרק קובה', 'כנפי עוף מצופות', 'פיתה']) {
    const f = by(s); assert.ok(f, s); assert.ok(allergyHits(f, p).length, `לא מסומן: ${f.name}`); assert.ok(ids.has(f.id) || (f.tags || []).some((t) => blockedBy(p).tags.has(t)), `לא נחסם בתפריט: ${f.name}`); }
  for (const s of ['אורז לבן', 'אטריות אורז', 'מקופלת', 'חזה עוף', 'חטיף גבינה מצופה שוקולד', 'פופקורן']) { const f = by(s); if (f) assert.equal(allergyHits(f, p).length, 0, `מסומן בטעות: ${f.name}`); }
  assert.equal(allergyHits(by('קרואסון חמאה'), { allergies: ['eggs'] }).length, 0);   // רק למי שסימן גלוטן
});

test('קליסתניקס: פלאנק הוא החזקה בזמן ולא סט של חזרות', { skip: !existsSync('js/engine/cali.js') }, async () => {
  const { newCali } = await import('../js/engine/cali.js'), { buildWeek } = await import('../js/engine/program.js');
  const prof = { track: 'cali', coach: 'maya', days: 3, level: 1, goal: 'skill', injuries: [], sex: 'm', cali: newCali({ pushups: 10, pullups: 2, squats: 20, dips: 0, plankSec: 30, bmi: 23 }, []) };
  const planks = buildWeek(prof, { blockIndex: 0, weekInBlock: 0 }).sessions.flatMap((s) => s.items).filter((i) => i.exId === 'plank');
  assert.ok(planks.length); for (const i of planks) assert.equal(i.unit, 'sec');
});
