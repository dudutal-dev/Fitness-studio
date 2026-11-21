// משפטים בהקשר: מתי כל משפט נכון, ומי אומר מה
import test from 'node:test';
import assert from 'node:assert/strict';
import { startContexts, endContexts } from '../js/engine/context-rules.js';
import { coachSays, VOICE_LINES, COACH_LINES, FEMALE } from '../js/data/voice-lines.js';

const DAY = 864e5, now = Date.UTC(2026, 10, 21, 12), iso = (d) => new Date(now - d * DAY).toISOString();
const plan = (total, done) => ({ week: { sessions: Array(total).fill({}) }, completedDays: [...Array(done).keys()] });

test('פתיחה: אימון ראשון, חזרה אחרי הפסקה, שלישי השבוע, אחרון בשבוע', () => {
  assert.deepEqual(startContexts({ sessions: [], runs: [], plan: plan(4, 0) }, now, 12), ['ctx_first']);
  assert.deepEqual(startContexts({ sessions: [{ date: iso(9), exercises: [] }], runs: [], plan: plan(4, 0) }, now, 12), ['ctx_back']);
  assert.deepEqual(startContexts({ sessions: [{ date: iso(1), exercises: [] }], runs: [], plan: plan(4, 2) }, now, 12), ['ctx_third']);
  assert.deepEqual(startContexts({ sessions: [{ date: iso(1), exercises: [] }], runs: [], plan: plan(4, 3) }, now, 12), ['ctx_weeklast']);
  assert.deepEqual(startContexts({ sessions: [{ date: iso(1), exercises: [] }], runs: [], plan: plan(3, 1) }, now, 12), []);   // יום רגיל — בלי משפט
});
test('פתיחה: אחרי שיא, אחרי אימון קשה, בוקר מוקדם, ערב מאוחר', () => {
  const pr = { sessions: [{ date: iso(2), prs: [{}], exercises: [] }], runs: [], plan: plan(4, 1) };
  assert.deepEqual(startContexts(pr, now, 12), ['ctx_after_pr']);
  const hard = { sessions: [{ date: iso(2), exercises: [{ sets: [{ rpe: 7.5 }, { rpe: 10 }] }] }], runs: [], plan: plan(4, 1) };
  assert.deepEqual(startContexts(hard, now, 12), ['ctx_after_hard']);
  assert.deepEqual(startContexts({ sessions: [], runs: [{ date: iso(2), rpe: 10 }], plan: plan(4, 1) }, now, 12), ['ctx_after_hard']);
  assert.deepEqual(startContexts({ sessions: [], runs: [{ date: iso(6), rpe: 10 }], plan: plan(4, 1) }, now, 12), []);   // קשה, אבל מזמן
  const calm = { sessions: [{ date: iso(1), exercises: [] }], runs: [], plan: plan(4, 1) };
  assert.deepEqual(startContexts(calm, now, 6), ['ctx_early']); assert.deepEqual(startContexts(calm, now, 22), ['ctx_late']); assert.deepEqual(startContexts(calm, now, 3), []);
  assert.deepEqual(startContexts(pr, now, 6), ['ctx_after_pr', 'ctx_early']);   // הראשון ברשימה הוא שנאמר
});
test('סיום: אימון שנעצר, אבני דרך, סגירת שבוע, אימון ארוך', () => {
  const s = (n) => ({ sessions: Array(n).fill({}), runs: [] });
  assert.deepEqual(endContexts(s(3), { partial: true, weekDone: true }), ['ctx_short']);
  assert.deepEqual(endContexts(s(10)), ['ctx_n10']); assert.deepEqual(endContexts(s(50)), ['ctx_n50']); assert.deepEqual(endContexts(s(100)), ['ctx_n100']);
  assert.deepEqual(endContexts(s(9), { plus: 1 }), ['ctx_n10']); assert.deepEqual(endContexts(s(11)), []);
  assert.deepEqual(endContexts(s(4), { weekDone: true }), ['ctx_week_done']);
  assert.deepEqual(endContexts(s(4), { durSec: 70 * 60, plannedMin: 45 }), ['ctx_long']);
  assert.deepEqual(endContexts(s(4), { durSec: 50 * 60, plannedMin: 45 }), []); assert.deepEqual(endContexts(s(4), { durSec: 30 * 60, plannedMin: 15 }), []);
});
test('מי אומר מה: דירוג סט והחלפת תרגיל רק במסלולים עם סטים; לכל משפט יש טקסט, והוא ניטרלי למין', () => {
  const keys = Object.keys(VOICE_LINES).filter((k) => k.startsWith('ctx_')); assert.equal(keys.length, 20);
  for (const c of ['ori', 'noa', 'maya']) for (const k of keys) assert.ok(coachSays(k, c), `${c} ${k}`);
  for (const c of ['lia', 'yael', 'mei', 'tamar', 'guy', 'shira']) { for (const k of ['ctx_easy', 'ctx_max', 'ctx_swap']) assert.equal(coachSays(k, c), false, `${c} ${k}`); assert.ok(coachSays('ctx_half', c) && coachSays('ctx_first', c)); }
  for (const k of keys) assert.equal(FEMALE[k], undefined);
  assert.match(COACH_LINES.yael.ctx_last_ex, /תנוחה/); assert.match(COACH_LINES.mei.ctx_first, /תרגול/); assert.match(COACH_LINES.guy.ctx_first, /ריצה/);
  // בלי פנייה בגוף שני יחיד שמשתנה לפי מין (אתה / את, חזרת, תן / תני)
  for (const t of [...keys.map((k) => VOICE_LINES[k]), ...['yael', 'mei', 'tamar', 'guy'].flatMap((c) => Object.entries(COACH_LINES[c]).filter(([k]) => k.startsWith('ctx_')).map((x) => x[1]))]) assert.doesNotMatch(t, /(^|[\s,.!—])(אתה|שלך|אותך|לך|תן|תני|חזרת|הגעת|שברת)([\s,.!?—]|$)/, t);
});
