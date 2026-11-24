// מדיטציות הבוקר (בישיבה) והלילה (בשכיבה) עם אור: שלוש מדיטציות, חמישה שלבים, נשימה מונחית
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { STILL, STILL_ALL, STILL_MINUTES, STILL_STAGES, STILL_FRAC, STILL_LINES, stillLine } from '../js/data/med-still.js';
import { coachSays, VOICE_LINES } from '../js/data/voice-lines.js';

const has = (p) => existsSync(new URL(`../${p}`, import.meta.url));
// הפונקציות הטהורות של המסך (המודול עצמו נשען על הדפדפן, ולכן נטענות מהמקור)
const src = readFileSync(new URL('../js/views/still.js', import.meta.url), 'utf8');
const fn = (name) => { const m = new RegExp(`export (function ${name}\\([\\s\\S]*?\\n}|const ${name} = [\\s\\S]*?;\\n)`).exec(src); return m[1]; };
const { breathAt, stillStarts } = new Function('STILL_FRAC', `${fn('breathAt')}\n${fn('stillStarts').replace('const stillStarts', 'var stillStarts')}\nreturn { breathAt, stillStarts };`)(STILL_FRAC);

test('שתי מדיטציות בוקר בישיבה ושתיים ללילה בשכיבה; לכל אחת חמישה קטעי דיבור, איור ומוזיקה', () => {
  assert.deepEqual(STILL_ALL, ['wake', 'intent', 'sleep', 'quiet']); assert.deepEqual(STILL_MINUTES, [15, 20, 30]); assert.equal(STILL_STAGES.length, 5);
  assert.deepEqual(STILL_ALL.filter((id) => STILL[id].when === 'morning'), ['wake', 'intent']); assert.ok(['wake', 'intent'].every((id) => STILL[id].posture === 'sit'));
  assert.deepEqual(STILL_ALL.filter((id) => STILL[id].when === 'night'), ['sleep', 'quiet']);
  for (const id of ['sleep', 'quiet']) { assert.equal(STILL[id].posture, 'lie'); assert.equal(STILL[id].tail, 600, 'בלילה המוזיקה ממשיכה עשר דקות'); assert.equal(STILL[id].mood, 'medsleep'); }
  for (const id of STILL_ALL) {
    assert.ok(STILL[id].about.length > 60 && STILL[id].desc && STILL[id].breathName, id);
    for (let i = 0; i < 5; i++) { const k = stillLine(id, i); assert.ok(STILL_LINES[k] && VOICE_LINES[k], k); assert.equal(coachSays(k, 'or'), true); assert.equal(coachSays(k, 'yael'), false); assert.ok(has(`assets/voice/or/${k}.mp3`), `${k}.mp3`); }
    for (const f of [`${id}.webp`, `${id}_sq.webp`, `${id}.mp4`]) assert.ok(has(`assets/med/${f}`), f);
  }
  for (const m of ['medstill_1', 'medstill_2', 'medsleep_1', 'medsleep_2']) assert.ok(has(`assets/music/${m}.mp3`), m);
});
test('הטקסטים ניטרליים: בלי פנייה ביחיד', () => {
  for (const [k, t] of [...Object.entries(STILL_LINES), ...STILL_ALL.map((id) => [id, STILL[id].about])]) assert.ok(!/(^|[\s,.])(שלך|איתך|אותך|לך|עצמך|אליך|ממך|בך)([\s,.]|$)/.test(t), `${k}: ${t}`);
});
test('חמישה שלבים שממלאים את הזמן שנבחר, בכל אורך', () => {
  assert.ok(Math.abs(STILL_FRAC.reduce((a, b) => a + b, 0) - 1) < 1e-9);
  for (const m of STILL_MINUTES) { const s = stillStarts(m); assert.equal(s.length, 5); assert.equal(s[0], 0); assert.ok(s.every((x, i) => !i || x > s[i - 1] + 60), `${m}: כל שלב דקה לפחות`); assert.ok(s[4] < m * 60); }
});
test('עיגול הנשימה: שאיפה, החזקה, נשיפה ומנוחה לפי הקצב של כל מדיטציה', () => {
  const box = STILL.intent.breath;   // 4-4-4-4
  assert.deepEqual([0, 4, 8, 12, 16].map((t) => breathAt(box, t).phase), [0, 1, 2, 3, 0]);
  assert.equal(breathAt(box, 2).scale, 0.5); assert.equal(breathAt(box, 5).scale, 1); assert.equal(breathAt(box, 10).scale, 0.5); assert.equal(breathAt(box, 13).scale, 0);
  const sleep = STILL.sleep.breath;   // 4-6: בלי החזקה ובלי מנוחה, והנשיפה ארוכה מהשאיפה
  assert.deepEqual([0, 3.9, 4, 9.9, 10].map((t) => breathAt(sleep, t).phase), [0, 0, 2, 2, 0]); assert.ok(sleep[2] > sleep[0]);
  assert.equal(breathAt(sleep, 4).left, 6); assert.equal(breathAt(STILL.wake.breath, 4).phase, 2);
});
