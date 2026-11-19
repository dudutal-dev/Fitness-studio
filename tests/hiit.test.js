// מסלול ה-HIIT: מבנה המעגל, יחס עבודה/מנוחה לפי רמה, גרסה בלי קפיצות, ימי התאוששות, ועליית רמה
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EX, EXERCISES } from '../js/data/exercises.js';
import { HIIT_EXERCISES, HIIT_SHARED, HIIT_WARM, HIIT_COOL, HIIT_TIPS } from '../js/data/hiit-exercises.js';
import { isHiit, buildHiitWorkout, buildHiitWeek, HIIT_FORMAT, HIIT_THEMES, hiitBlocked, lowImpact, hiitLevelUp, lowAlt } from '../js/engine/hiit.js';
import { buildWeek, goalsFor, goalForTrack, applyReadiness, phaseFor } from '../js/engine/program.js';
import { hasGym, sessionCoach } from '../js/engine/cali.js';
import { newMob } from '../js/engine/mob.js';
import { coachSays, VOICE_LINES } from '../js/data/voice-lines.js';
import { coachesFor } from '../js/data/coaches.js';

const P = (o = {}) => ({ name: 'מיכל', sex: 'f', age: 33, heightCm: 166, weightKg: 63, track: 'hiit', coach: 'lia', goal: 'fit', days: 3, level: 3, hiitMin: 20, injuries: [], dislikes: [], ...o });
const total = (w) => w.items.length * w.rounds * (w.work + w.rest) + w.warmup.length * 46 + (w.warmup.length ? 20 : 0) + w.cooldown.length * 46;

test('HIIT data: exercises, low-impact alternatives and the coach', () => {
  for (const e of HIIT_EXERCISES) {
    assert.ok(['legs', 'cardio', 'core', 'upper'].includes(e.cat), e.id); assert.equal(e.cues.length, 3); assert.ok(HIIT_TIPS[e.id], `${e.id} tip`);
    assert.deepEqual(EX[e.id].tracks, ['hiit']); assert.equal(EX[e.id].type, 'time');
    if (e.impact === 'high') { assert.ok(EX[e.low], `${e.id} has a low-impact alternative`); assert.notEqual(EX[e.low].impact, 'high'); assert.equal(lowAlt(e.id), e.low); }
  }
  for (const [id, cat, impact, low] of HIIT_SHARED) { assert.ok(EX[id].tracks.includes('hiit'), id); assert.equal(EX[id].cat, cat); if (impact === 'high') assert.notEqual(EX[low].impact, 'high'); assert.ok(EX[id].tracks.length > 1, `${id} still belongs to its own track`); }
  for (const id of [...HIIT_WARM, ...HIIT_COOL]) assert.ok(EX[id].tracks.includes('hiit'), id);
  assert.equal(lowAlt('plank'), null);
  assert.deepEqual(coachesFor('hiit').map((c) => c.id), ['lia']);
  assert.deepEqual(goalsFor('hiit'), ['fit', 'cut']); assert.equal(goalForTrack('strength', 'hiit'), 'fit'); assert.equal(goalForTrack('fit', 'gym'), 'combat');
  const p = P(); assert.equal(isHiit(p), true); assert.equal(hasGym(p), false); assert.equal(phaseFor(p, 0).id, 'hiit'); assert.equal(sessionCoach(p, { track: 'hiit' }), 'lia');
  // כל קטגוריה מיוצגת גם בלי קפיצות
  for (const cat of ['legs', 'cardio', 'core', 'upper']) assert.ok(EXERCISES.some((e) => e.tracks.includes('hiit') && e.cat === cat && e.impact !== 'high'), cat);
});

test('HIIT session: a circuit that fits the chosen time, with work/rest by level', () => {
  for (const level of [1, 2, 3, 4, 5]) for (const mins of [15, 20, 25]) for (const tid of Object.keys(HIIT_THEMES)) {
    const w = buildHiitWorkout(tid, P({ level, hiitMin: mins }));
    assert.equal(w.track, 'hiit'); assert.equal(w.items.length, mins <= 15 ? 5 : 6);
    assert.equal(new Set(w.items.map((it) => it.exId)).size, w.items.length, 'no exercise twice');
    const [work, rest] = w.easy ? [30, 30] : HIIT_FORMAT[level];
    assert.ok(w.items.every((it) => it.role === 'hiit' && it.unit === 'sec' && it.reps[0] === work && it.rest === rest && it.sets === w.rounds));
    assert.ok(w.rounds >= 2); assert.ok(total(w) <= mins * 60 + 30, `${tid} L${level} ${mins}: ${total(w)}s`); assert.ok(total(w) >= mins * 60 * 0.65, `${tid} L${level} ${mins} fills the time`);
    assert.ok(w.items.every((it) => EX[it.exId].tracks.includes('hiit') && (EX[it.exId].level || 1) <= level + 1));
    assert.equal(w.warmup.length, 3); assert.equal(w.cooldown.length, 3);
    if (w.easy) assert.ok(w.items.every((it) => EX[it.exId].impact !== 'high'), 'easy day has no jumps');
  }
  assert.ok(buildHiitWorkout('hFull', P()).items.some((it) => EX[it.exId].impact === 'high'), 'a regular session includes jumps');
  // שבוע רביעי: סבב אחד פחות
  const a = buildHiitWorkout('hFull', P({ hiitMin: 25 })), b = buildHiitWorkout('hFull', P({ hiitMin: 25 }), { weekInBlock: 3 });
  assert.equal(b.rounds, Math.max(2, a.rounds - 1));
  // יום קשה: סבב אחד פחות, לא פחות משניים
  const low = applyReadiness(a, 0.2); assert.equal(low.rounds, a.rounds - 1); assert.ok(low.items.every((it) => it.sets === low.rounds)); assert.ok(low.note);
  assert.equal(applyReadiness(buildHiitWorkout('hFull', P({ hiitMin: 15 })), 0.2).rounds, 2);
});

test('HIIT safety: no jumps on request or with a knee injury; injuries remove exercises', () => {
  const all = (p) => Object.keys(HIIT_THEMES).flatMap((tid) => [15, 25].flatMap((m) => buildHiitWorkout(tid, p, { minutes: m }).items));
  for (const p of [P({ hiitLow: true }), P({ injuries: ['knee'] })]) { assert.equal(lowImpact(p), true); assert.ok(all(p).every((it) => EX[it.exId].impact !== 'high')); assert.ok(buildHiitWorkout('hFull', p).note); }
  assert.equal(lowImpact(P()), false);
  for (const inj of ['knee', 'back', 'shoulder', 'wrist']) { const p = P({ injuries: [inj] }), bl = hiitBlocked(p); assert.ok(bl.size > 0); assert.ok(all(p).every((it) => !bl.has(it.exId)), inj); assert.equal(buildHiitWorkout('hCore', p, { minutes: 20 }).items.length, 6, `${inj}: still a full circuit`); }
  assert.ok(all(P({ level: 1 })).every((it) => (EX[it.exId].level || 1) <= 2));
});

test('HIIT week: at most three hard sessions (four from level 4), easy days in between, mobility can be added', () => {
  for (const days of [3, 4, 5, 6]) {
    const wk = buildHiitWeek(P({ days }));
    assert.equal(wk.sessions.length, days); assert.deepEqual(wk.sessions.map((s) => s.day), Array.from({ length: days }, (_, i) => i + 1));
    assert.equal(wk.sessions.filter((s) => !s.easy).length, 3); assert.equal(new Set(wk.sessions.map((s) => s.name)).size, days);
    for (let i = 1; i < days - 1; i++) if (days > 3) assert.ok(!(!wk.sessions[i - 1].easy && !wk.sessions[i].easy && !wk.sessions[i + 1].easy), 'no three hard days in a row');
  }
  assert.equal(buildHiitWeek(P({ days: 5, level: 4 })).sessions.filter((s) => !s.easy).length, 4);
  const wk = buildWeek(P({ days: 4, mob: newMob(), mobN: 1 }));
  assert.deepEqual(wk.sessions.map((s) => s.track), ['hiit', 'hiit', 'hiit', 'mob']);
  assert.equal(sessionCoach(P(), wk.sessions[3]), 'tamar');
});

test('HIIT progression and voice', () => {
  const now = Date.now(), ses = (n, o = {}) => Array.from({ length: n }, (_, i) => ({ date: new Date(now - i * 2 * 864e5).toISOString(), track: 'hiit', ...o }));
  assert.equal(hiitLevelUp(P(), ses(10), now), true); assert.equal(hiitLevelUp(P(), ses(8), now), false);
  assert.equal(hiitLevelUp(P({ level: 5 }), ses(12), now), false); assert.equal(hiitLevelUp(P(), ses(12, { partial: true }), now), false); assert.equal(hiitLevelUp(P(), ses(12, { track: 'mob' }), now), false);
  for (const k of ['hello_lia', 'hiit_go', 'hiit_10', 'hiit_round', 'hiit_last', 'hiit_low', 'n3', 'warm_intro', 'warm_done', 'cool_intro', 'next_ex', 'hold_done', 'workout_done', 'ex_h_squat_jump', 'tip_h_squat_jump', 'ex_burpee', 'ex_child_pose', 'ex_h_march']) { assert.ok(VOICE_LINES[k] != null, k); assert.equal(coachSays(k, 'lia'), true, k); }
  for (const k of ['n10', 'set2', 'down', 'run_fast', 'pr', 'last_set', 'rate_set', 'hello_ori', 'ex_back_squat', 'ex_m_cat_cow', 'rung_up', 'm1']) assert.equal(coachSays(k, 'lia'), false, k);
  for (const k of ['hiit_go', 'hello_lia', 'ex_h_skater']) for (const c of ['ori', 'noa', 'maya', 'tamar', 'guy', 'shira']) assert.equal(coachSays(k, c), false, `${c} ${k}`);
  assert.equal(coachSays('ex_burpee', 'ori'), true); assert.equal(coachSays('ex_burpee', 'maya'), true);
});
