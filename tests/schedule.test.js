// יומן האימונים: שיבוץ לפי ימים ושעות, הזזה, ביטול, והתאמת התזונה לשעת האימון
import test from 'node:test';
import assert from 'node:assert/strict';
import { upcoming, nextPlanned, plannedToday, moveSession, skipSession, restoreSession, unmoveSession, weekClosed, openSessions, whenLabel, sched, dkey, nextDays } from '../js/engine/schedule.js';
import { dayType, orderMeals, mealWindow } from '../js/engine/nutrition.js';

const mkPlan = () => ({ blockIndex: 0, weekInBlock: 0, weekStart: '2026-11-22', completedDays: [], week: { sessions: [1, 2, 3].map((day) => ({ day, name: `אימון ${day}`, minutes: 60, items: [] })) } });
const st = { workout: { on: true, days: [0, 2, 4], time: '18:00', times: { 2: '07:00' } } };
const SUN = new Date(2026, 10, 22, 9, 0);   // יום ראשון 22.11.2026, 09:00

test('האימונים משתבצים לפי הסדר בימי האימון הקרובים, עם השעה של כל יום', () => {
  const up = upcoming(mkPlan(), st, SUN);
  assert.deepEqual(up.map((o) => [o.session.day, o.date, o.time]), [[1, '2026-11-22', '18:00'], [2, '2026-11-24', '07:00'], [3, '2026-11-26', '18:00']]);
  assert.equal(whenLabel(up[0].date, up[0].time, SUN), 'היום ב-18:00');
  assert.equal(whenLabel(up[1].date, up[1].time, SUN), 'יום שלישי ב-07:00');
  assert.equal(whenLabel('2026-11-23', '06:30', SUN), 'מחר ב-06:30');
});
test('אחרי אימון היום — האימון הבא מתחיל מיום האימון הבא', () => {
  const p = mkPlan(); p.completedDays = [1];
  assert.deepEqual(upcoming(p, st, SUN, true).map((o) => [o.session.day, o.date]), [[2, '2026-11-24'], [3, '2026-11-26']]);
});
test('ביום שאינו יום אימון אין אימון מתוכנן להיום', () => {
  const mon = new Date(2026, 10, 23, 9, 0);
  assert.equal(plannedToday(mkPlan(), st, mon), null);
  assert.equal(nextPlanned(mkPlan(), st, mon).date, '2026-11-24');
});
test('הזזה: האימון עובר למועד שנבחר, והאחרים נשארים בסדר', () => {
  const p = mkPlan(); moveSession(p, 1, '2026-11-23', '20:30', '2026-11-22');
  const up = upcoming(p, st, SUN);
  // היום שממנו האימון הוזז נשאר פנוי; שאר האימונים במקומם — גם כשמסתכלים למחרת
  assert.deepEqual(up.map((o) => [o.session.day, o.date, o.time]), [[1, '2026-11-23', '20:30'], [2, '2026-11-24', '07:00'], [3, '2026-11-26', '18:00']]);
  assert.equal(up[0].moved, true);
  assert.equal(plannedToday(p, st, SUN), null);
  assert.deepEqual(upcoming(p, st, new Date(2026, 10, 23, 8)).map((o) => [o.session.day, o.date]), [[1, '2026-11-23'], [2, '2026-11-24'], [3, '2026-11-26']]);
  unmoveSession(p, 1);
  assert.equal(upcoming(p, st, SUN)[0].session.day, 1);
});
test('ביטול: האימון יוצא מהיומן, אפשר להחזיר, והשבוע נסגר כשהכול בוצע או בוטל', () => {
  const p = mkPlan(); skipSession(p, 2);
  assert.deepEqual(openSessions(p).map((x) => x.day), [1, 3]);
  restoreSession(p, 2);
  assert.equal(openSessions(p).length, 3);
  p.completedDays = [1, 3]; assert.equal(weekClosed(p), false);
  skipSession(p, 2); assert.equal(weekClosed(p), true);
});
test('הזזות וביטולים מתאפסים כשהשבוע מתחלף', () => {
  const p = mkPlan(); skipSession(p, 2); moveSession(p, 1, '2026-11-23', '20:00');
  p.weekInBlock = 1; p.weekStart = '2026-11-29';
  assert.deepEqual(sched(p).skipped, []); assert.deepEqual(sched(p).moves, {});
});
test('בלי ימים קבועים — רשימה בלי תאריכים', () => {
  const up = upcoming(mkPlan(), { workout: { on: true, days: [] } }, SUN);
  assert.equal(up.length, 3); assert.equal(up[0].date, null);
});
test('שמונת הימים הקרובים לבחירה מתחילים מהיום', () => {
  const d = nextDays(SUN, 8);
  assert.equal(d[0].date, dkey(SUN)); assert.equal(d[0].label, 'היום'); assert.equal(d[1].label, 'מחר'); assert.equal(d.length, 8);
});

test('תזונה: יום שאין בו אימון ביומן הוא יום מנוחה; ביום אימון — לפי האימון', () => {
  const state = { plan: mkPlan(), reminders: { settings: st }, sessions: [], runs: [] };
  assert.equal(dayType(state, new Date(2026, 10, 23, 9).getTime()).type, 'rest');
  const t = dayType(state, SUN.getTime());
  assert.equal(t.planned, true); assert.equal(t.time, '18:00');
  // בלי ימים שנקבעו — כמו קודם: לפי האימון הבא בתוכנית
  assert.equal(dayType({ plan: mkPlan(), sessions: [], runs: [] }, new Date(2026, 10, 23, 9).getTime()).planned, true);
});
test('תזונה: "אחרי אימון" זזה לחצי שעה אחרי האימון; ביום מנוחה הופכת לביניים', () => {
  const meals = () => ({ meals: ['breakfast', 'snack1', 'lunch', 'post', 'dinner'].map((id) => ({ id, name: id })) });
  const state = { plan: mkPlan(), reminders: { settings: st }, sessions: [], runs: [] };
  const eve = orderMeals(meals(), mealWindow(state, SUN));                       // אימון ב-18:00, שעה
  assert.deepEqual(eve.meals.map((m) => m.id), ['breakfast', 'snack1', 'lunch', 'post', 'dinner']);
  assert.equal(eve.meals[3].hint, '19:30');
  const tue = orderMeals(meals(), mealWindow(state, new Date(2026, 10, 24, 5, 0)));   // אימון ב-07:00
  assert.deepEqual(tue.meals.map((m) => m.id), ['breakfast', 'post', 'snack1', 'lunch', 'dinner']);
  assert.equal(tue.meals[1].hint, '08:30');
  const rest = orderMeals(meals(), mealWindow(state, new Date(2026, 10, 23, 9, 0)));
  assert.equal(rest.meals.find((m) => m.id === 'post').name, 'ביניים');
  assert.equal(mealWindow({ plan: mkPlan(), sessions: [], runs: [] }, SUN), null);   // לא נקבעו ימים — בלי שינוי
});
