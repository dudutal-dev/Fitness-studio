// המשקלים שהמאמנים אומרים בקול: הרשימה, מפתח ההקלטה, שינוי בין סטים, והמספר במילים
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { WEIGHT_VALUES, WEIGHT_COACHES, weightClip, weightChange, topWeight, isRecordWeight, weightFile } from '../js/data/weights.js';
import { heKg, enKg } from '../tools/he_kg.mjs';
import { EXERCISES } from '../js/data/exercises.js';
import { roundLoad } from '../js/engine/progression.js';

test('הרשימה מכסה את המשקלים שהאפליקציה מציעה: חצאים עד 30, שלמים עד 120, קפיצות של 2.5 עד 200', () => {
  for (const w of [0.5, 7.5, 12, 19.5, 20, 37, 42.5, 60, 99, 120, 122.5, 180, 197.5, 200, 250]) assert.ok(WEIGHT_VALUES.includes(w), String(w));
  assert.equal(new Set(WEIGHT_VALUES).size, WEIGHT_VALUES.length);
  // כל משקל שהעיגול של האפליקציה מפיק בטווח סביר (משקולות קלות עד 30, משקולות יד ומכונות עד 120, מוט עד 200) נמצא ברשימה
  for (const e of EXERCISES.filter((x) => x.type === 'weight')) { const max = e.inc >= 5 ? 200 : e.inc >= 2 ? 120 : 30;
    for (let w = 1; w <= max; w += 0.1) assert.ok(WEIGHT_VALUES.includes(roundLoad(w, e)), `${e.id} ${roundLoad(w, e)}`); }
});
test('מפתח ההקלטה: רק למאמני חדר הכושר ורק למשקל שברשימה', () => {
  assert.equal(weightClip(40, 'ori'), 'kg/40');
  assert.equal(weightClip(42.5, 'noa'), 'kg/42_5');
  assert.equal(weightClip(41.3, 'ori'), null);
  assert.equal(weightClip(0, 'ori'), null);
  assert.equal(weightClip(40, 'maya'), null);
});
test('שינוי בין סטים: עולים, יורדים, או בלי שינוי', () => {
  assert.equal(weightChange(42.5, 40), 'w_up');
  assert.equal(weightChange(37.5, 40), 'w_down');
  assert.equal(weightChange(40, 40), null);
  assert.equal(weightChange(40, 0), null);
});
test('המספר במילים, בזכר ("קילו")', () => {
  assert.equal(heKg(0.5), 'חצי קילו.');
  assert.equal(heKg(1.5), 'קילו וחצי.');
  assert.equal(heKg(2), 'שני קילו.');
  assert.equal(heKg(2.5), 'שניים וחצי קילו.');
  assert.equal(heKg(40), 'ארבעים קילו.');
  assert.equal(heKg(42.5), 'ארבעים ושניים וחצי קילו.');
  assert.equal(heKg(15), 'חמישה־עשר קילו.');
  assert.equal(heKg(100), 'מאה קילו.');
  assert.equal(heKg(125), 'מאה עשרים וחמישה קילו.');
  assert.equal(heKg(110), 'מאה ועשרה קילו.');
  assert.equal(enKg(42.5), '42 and a half kilos.');
});
test('לכל משקל ברשימה יש הקלטה אצל כל מאמן של חדר הכושר', () => {
  for (const c of WEIGHT_COACHES) for (const w of WEIGHT_VALUES) assert.ok(existsSync(new URL(`../assets/voice/${c}/kg/${weightFile(w)}.mp3`, import.meta.url)), `${c} ${w}`);
  for (const c of WEIGHT_COACHES) for (const k of ['w_up', 'w_down']) assert.ok(existsSync(new URL(`../assets/voice/${c}/${k}.mp3`, import.meta.url)), `${c} ${k}`);
});

test('משקל שיא: גבוה מכל מה שבוצע בתרגיל; בלי היסטוריה אין שיא; סט שלא בוצע לא נספר', () => {
  const h = [{ sets: [{ w: 40, reps: 8, done: true }, { w: 42.5, reps: 6, done: true }] }, { sets: [{ w: 45, reps: 0, done: true }, { w: 50, reps: 5, done: false }] }];
  assert.equal(topWeight(h), 42.5);
  assert.equal(isRecordWeight(45, h), true);
  assert.equal(isRecordWeight(42.5, h), false);
  assert.equal(isRecordWeight(60, []), false);
  assert.equal(isRecordWeight(60, undefined), false);
  for (const c of WEIGHT_COACHES) for (const k of ['w_record', 'w_record_done']) assert.ok(existsSync(new URL(`../assets/voice/${c}/${k}.mp3`, import.meta.url)), `${c} ${k}`);
});
