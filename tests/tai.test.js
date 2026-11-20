// מסלול הטאי צ'י (מיי): נתונים ונכסים, שיעור שמתאים לזמן, חימום ופתיחה וסיום, סדר הצורה, רמות, חסימות בטיחות, תזונה, ותחום נוסף
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { EX } from '../js/data/exercises.js';
import { TAI_EXERCISES, TAI_AREAS, TAI_SAY, taiSecs, taiClip } from '../js/data/tai-exercises.js';
import { isTai, buildTaiWorkout, buildTaiWeek, TAI_THEMES, TAI_MINUTES, taiBlocked, taiLevelUp, taiLevel, taiSeconds } from '../js/engine/tai.js';
import { buildWeek, goalsFor, goalForTrack, phaseFor, applyReadiness, extraCoach, canExtra } from '../js/engine/program.js';
import { hasGym, sessionCoach } from '../js/engine/cali.js';
import { targets, loadOf, activityKey, nutritionGuard } from '../js/engine/nutrition.js';
import { coachSays, VOICE_LINES } from '../js/data/voice-lines.js';
import { coachesFor, COACHES, demoVideo, demoPoster } from '../js/data/coaches.js';
import { VOICE_TIMING } from '../js/data/voice-timing.js';

const P = (o = {}) => ({ name: 'רות', sex: 'f', age: 62, heightCm: 162, weightKg: 64, track: 'tai', coach: 'mei', goal: 'bal', days: 3, level: 1, taiMin: 20, injuries: [], dislikes: [], ...o });
const FORM = TAI_EXERCISES.map((e) => e.id);
const root = new URL('../', import.meta.url);
const has = (p) => existsSync(new URL(p, root));

test('Tai chi data, coach and track helpers', () => {
  assert.equal(TAI_EXERCISES.length, 21);
  for (const e of TAI_EXERCISES) {
    assert.ok(TAI_AREAS[e.area], e.id); assert.equal(e.cues.length, 3); assert.ok(e.say && e.clip, e.id); assert.deepEqual(EX[e.id].tracks, ['tai']); assert.ok([1, 2, 3].includes(e.level));
    assert.equal(VOICE_LINES[`ex_${e.id}`], e.say, 'the caption is what she says');
    for (const [line] of e.steps || []) if (line) assert.equal(VOICE_LINES[`tc_${line}`], TAI_SAY[line], line);
    assert.ok(taiSecs(e) >= 40 && taiSecs(e) <= 120, `${e.id}: ${taiSecs(e)}s`);
  }
  assert.deepEqual(coachesFor('tai').map((c) => c.id), ['mei']); assert.equal(COACHES.mei.name, 'מיי'); assert.deepEqual(coachesFor('yoga').map((c) => c.id), ['yael']);
  assert.deepEqual(goalsFor('tai'), ['bal', 'zen', 'cut']); assert.equal(goalForTrack('strength', 'tai'), 'bal'); assert.equal(goalForTrack('bal', 'gym'), 'combat'); assert.equal(goalForTrack('zen', 'tai'), 'zen');
  const p = P(); assert.equal(isTai(p), true); assert.equal(hasGym(p), false); assert.equal(phaseFor(p, 0).id, 'tai'); assert.equal(sessionCoach(p, { track: 'tai' }), 'mei');
  assert.equal(taiLevel(P({ level: 5 })), 3);
});

test('Tai chi assets: every movement has its videos, poster and voice clips', () => {
  for (const e of TAI_EXERCISES) {
    for (const clip of [e.clip, ...(e.steps || []).map((s) => s[1]).filter(Boolean)]) assert.ok(has(demoVideo('mei', taiClip(e, clip))), `${e.id} video ${clip}`);
    assert.ok(has(demoPoster('mei', e.id)), `${e.id} poster`);
    assert.ok(has(`assets/voice/mei/ex_${e.id}.mp3`) && VOICE_TIMING[`mei/ex_${e.id}`] > 1, `${e.id} intro clip`);
    for (const [line] of e.steps || []) if (line) assert.ok(has(`assets/voice/mei/tc_${line}.mp3`) && VOICE_TIMING[`mei/tc_${line}`] > 1, line);
  }
  for (const k of ['hello_mei', 'mob_intro', 'mob_again', 'mob_close', 'next_ex', 'hold_done', 'workout_done', 'n1', 'n2', 'n3']) { assert.ok(coachSays(k, 'mei'), k); assert.ok(has(`assets/voice/mei/${k}.mp3`), k); }
  assert.ok(coachSays('tc_cloud_hands_cue1', 'mei')); assert.ok(!coachSays('tc_cloud_hands_cue1', 'yael')); assert.ok(!coachSays('last_set', 'mei')); assert.ok(!coachSays('ex_y_tree', 'mei')); assert.ok(!coachSays('ex_t_opening', 'yael'));
  assert.ok(has('assets/coaches/mei.webp') && has('assets/coaches/mei_face.webp'));
});

test('Tai chi class: fits the time, warm-up and opening first, closing last, form order, respects the level', () => {
  for (const level of [1, 2, 3]) for (const mins of TAI_MINUTES) for (const tid of Object.keys(TAI_THEMES)) {
    const w = buildTaiWorkout(tid, P({ level, taiMin: mins }));
    assert.equal(w.track, 'tai'); assert.equal(w.minutes, mins);
    assert.ok(taiSeconds(w) <= mins * 60, `${tid} L${level} ${mins}: ${taiSeconds(w)}s`); assert.ok(taiSeconds(w) >= mins * 60 * 0.85, `${tid} L${level} ${mins} fills the time: ${taiSeconds(w)}s`);
    const ids = w.items.map((it) => it.exId), warm = mins <= 15 ? 2 : 3;
    assert.ok(ids.slice(0, warm).every((id) => EX[id].area === 'open')); assert.equal(ids[warm], 't_opening'); assert.equal(ids.at(-1), 't_closing');
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(w.items.every((it) => it.role === 'mob' && it.unit === 'sec' && it.label && EX[it.exId].tai && (EX[it.exId].level || 1) <= level && it.sets <= 3));
    const mid = ids.slice(warm + 1, -1).map((id) => FORM.indexOf(id));
    assert.ok(mid.length >= 4, `${tid} L${level} ${mins}: ${mid.length} movements`); assert.ok(mid.every((v, i) => i === 0 || v > mid[i - 1]), `${tid}: the order of the form`);
    assert.deepEqual(w.warmup, []); assert.deepEqual(w.cooldown, []);
  }
  assert.ok(!buildTaiWorkout('tFull', P({ level: 1, taiMin: 30 })).items.some((it) => EX[it.exId].level > 1));
  assert.ok(buildTaiWorkout('tStep', P({ level: 2 })).items.some((it) => it.exId === 't_wild_horse'));
  assert.ok(buildTaiWorkout('tFull', P({ level: 3 })).items.some((it) => EX[it.exId].level === 3));
  const full = buildTaiWorkout('tFull', P());
  assert.deepEqual(applyReadiness(full, 0.2).items, full.items, 'the class is the same on a low day');
  const week = buildTaiWeek(P({ days: 4 }));
  assert.equal(week.sessions.length, 4); assert.equal(new Set(week.sessions.map((s) => s.name)).size, 4); assert.equal(buildWeek(P()).sessions.length, 3);
});

test('Tai chi safety: injuries and screening flags remove movements but leave a class', () => {
  const all = (p) => Object.keys(TAI_THEMES).flatMap((tid) => TAI_MINUTES.flatMap((m) => buildTaiWorkout(tid, p, { minutes: m }).items));
  for (const inj of ['knee', 'back', 'shoulder', 'ankle']) { const p = P({ level: 3, injuries: [inj] }), bl = taiBlocked(p); assert.ok(bl.size, inj); assert.ok(all(p).every((it) => !bl.has(it.exId)), inj); assert.ok(buildTaiWorkout('tFull', p).items.length >= 7, inj); }
  for (const f of ['preg', 'osteo', 'joint']) { const p = P({ level: 3, taiFlags: [f] }), bl = taiBlocked(p); assert.ok(bl.size, f); assert.ok(all(p).every((it) => !bl.has(it.exId)), f); assert.ok(buildTaiWorkout('tFull', p, { minutes: 15 }).items.length >= 6, f); }
  // ברך רגישה: בלי צעדים עמוקים; נשארות עמידה, ידיים ושיווי משקל עדין
  assert.ok(all(P({ level: 3, injuries: ['knee'] })).every((it) => (EX[it.exId].knee || 0) < 2));
  // תנועות שיווי המשקל מסומנות לתרגול ליד כיסא
  for (const id of ['t_golden_rooster', 't_heel_kick', 't_warm_ankle']) assert.equal(EX[id].chair, true);
  assert.ok(nutritionGuard(P({ taiFlags: ['preg'] })).reasons.includes('preg'));
});

test('Tai chi: level-up, nutrition load, and as an extra class next to another track', () => {
  const now = Date.now(), s = (n) => Array.from({ length: n }, (_, i) => ({ track: 'tai', date: new Date(now - i * 864e5 * 2).toISOString() }));
  assert.equal(taiLevelUp(P(), s(10), now), true); assert.equal(taiLevelUp(P(), s(5), now), false); assert.equal(taiLevelUp(P({ level: 3 }), s(12), now), false);
  assert.equal(loadOf({ track: 'tai', items: [{}] }), 'light'); assert.equal(activityKey(P()), 'light'); assert.equal(targets(P()).protein, targets(P({ track: 'mob' })).protein);
  const gym = P({ track: 'gym', coach: 'ori', goal: 'muscle', days: 5, level: 2, extras: { tai: 2 } });
  assert.ok(canExtra(gym, 'tai')); assert.equal(extraCoach(gym, 'tai'), 'mei'); assert.ok(!canExtra(P(), 'tai'));
  const w = buildWeek(gym), tai = w.sessions.filter((x) => x.xtrack === 'tai');
  assert.equal(w.sessions.length, 5); assert.equal(tai.length, 2); assert.ok(tai.every((x) => x.extra && x.coach === 'mei' && x.track === 'tai' && /^טאי צ'י · /.test(x.name)));
  assert.equal(sessionCoach(gym, tai[0]), 'mei');
  const both = buildWeek(P({ days: 4, extras: { yoga: 1 } }));
  assert.equal(both.sessions.filter((x) => x.xtrack === 'yoga').length, 1); assert.equal(both.sessions.filter((x) => !x.extra && x.track === 'tai').length, 3);
});
