// מדיטציה בתנועה עם אור: ששת המסעות, מבנה ההליכה, הקול, והשילוב בשבוע כתחום נוסף
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { MED_JOURNEYS, MED_ORDER, MED_LINES, MED_ANCHORS, medLine } from '../js/data/med-lines.js';
import { buildMedSession, buildMedSessions, weekJourney, MED_MINUTES } from '../js/engine/meditation.js';
import { coachSays, VOICE_LINES } from '../js/data/voice-lines.js';
import { COACHES, coachesFor } from '../js/data/coaches.js';
import { buildWeek, EXTRA_TRACKS, extraCoach } from '../js/engine/program.js';

const has = (p) => existsSync(new URL(`../${p}`, import.meta.url));

test('שישה מסעות, ולכל אחד שישה קטעי דיבור, איור ורקע נע', () => {
  assert.deepEqual(MED_ORDER, ['release', 'heal', 'connect', 'reset', 'thanks', 'presence']);
  for (const j of MED_ORDER) {
    assert.ok(MED_JOURNEYS[j].name && MED_JOURNEYS[j].desc, j);
    for (let i = 0; i < 6; i++) { const k = medLine(j, i); assert.ok(MED_LINES[k] && VOICE_LINES[k], k); assert.ok(has(`assets/voice/or/${k}.mp3`), `${k}.mp3`); }
    for (const f of [`${j}.webp`, `${j}_sq.webp`, `${j}.mp4`]) assert.ok(has(`assets/med/${f}`), f);
  }
  for (const k of ['med_hello', 'med_done', ...MED_ANCHORS]) assert.ok(has(`assets/voice/or/${k}.mp3`), k);
});
test('הטקסטים ניטרליים: בלי פנייה ביחיד (שלך, איתך, אותך…), כי היא נשמעת אחרת לגבר ולאישה', () => {
  for (const [k, t] of Object.entries(MED_LINES)) assert.ok(!/(^|[\s,.])(שלך|איתך|אותך|לך|עצמך|אליך|ממך|בך)([\s,.]|$)/.test(t), `${k}: ${t}`);
});
test('אור אומרת רק את משפטי המדיטציה, ואף מאמן אחר לא אומר אותם', () => {
  assert.equal(COACHES.or.track, 'med'); assert.deepEqual(coachesFor('med').map((c) => c.id), ['or']);
  for (const k of Object.keys(MED_LINES)) { assert.equal(coachSays(k, 'or'), true, k); for (const c of ['ori', 'shira', 'yael']) assert.equal(coachSays(k, c), false, `${c} ${k}`); }
  for (const k of ['go', 'rest', 'walk_hello', 'hello_ori', 'm1', 'ctx_first']) assert.equal(coachSays(k, 'or'), false, k);
  for (const f of ['assets/coaches/or.webp', 'assets/coaches/or_face.webp', 'assets/demos/or/outdoor_walk.webp', 'assets/demos/or/outdoor_walk.mp4']) assert.ok(has(f), f);
  for (const m of ['medcalm', 'medbeat']) for (const n of [1, 2, 3]) assert.ok(has(`assets/music/${m}_${n}.mp3`), `${m}_${n}`);
});
test('הליכה מדיטטיבית: תמיד שישה מקטעים באורך שנבחר; במהירה — שני חלקים בהליכה מהירה', () => {
  for (const minutes of MED_MINUTES) for (const pace of ['calm', 'fast']) for (const j of MED_ORDER) {
    const r = buildMedSession(j, { minutes, pace });
    assert.equal(r.segs.length, 6); assert.equal(r.segs[0].kind, 'warm'); assert.equal(r.segs[5].kind, 'cool');
    assert.ok(Math.abs(r.totalSec - minutes * 60) <= 4, `${minutes}: ${r.totalSec}`);
    assert.equal(r.segs.filter((s) => s.kind === 'brisk').length, pace === 'fast' ? 2 : 0);
    assert.equal(r.walk, true); assert.equal(r.med, j); assert.equal(r.type, 'med');
  }
  assert.equal(buildMedSession('nope').med, 'release');
});
test('המסע מתחלף כל שבוע, וכתחום נוסף ההליכה נכנסת לשבוע עם אור', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(weekJourney), [...MED_ORDER, 'release']);
  assert.ok(EXTRA_TRACKS.includes('med')); assert.equal(extraCoach({}, 'med'), 'or');
  const two = buildMedSessions({ medMin: 20, medPace: 'fast' }, 2, { blockIndex: 0, weekInBlock: 1 });
  assert.deepEqual(two.map((s) => s.run.med), ['heal', 'connect']); assert.ok(two.every((s) => s.track === 'med' && s.runOnly && s.minutes === 20));
  const p = { name: 'דנה', sex: 'f', age: 40, heightCm: 165, weightKg: 62, track: 'yoga', coach: 'yael', goal: 'zen', days: 4, level: 1, yogaLevel: 1, yogaMin: 30, injuries: [], dislikes: [], extras: { med: 1 } };
  const wk = buildWeek(p);
  const med = wk.sessions.filter((s) => s.xtrack === 'med');
  assert.equal(med.length, 1); assert.equal(med[0].coach, 'or'); assert.ok(med[0].run.med); assert.equal(wk.sessions.length, 4);
});
