// מסלול הפילאטיס: רמות, שיעור שמתאים לזמן, פתיחה וסיום, חסימות בטיחות, ועליית רמה
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EX, EXERCISES } from '../js/data/exercises.js';
import { PIL_EXERCISES, PIL_SHARED, PIL_TIPS, PIL_AREAS } from '../js/data/pil-exercises.js';
import { isPil, buildPilWorkout, buildPilWeek, PIL_THEMES, pilBlocked, pilLevelUp, pilLevel } from '../js/engine/pil.js';
import { buildWeek, goalsFor, goalForTrack, phaseFor, applyReadiness } from '../js/engine/program.js';
import { hasGym, sessionCoach } from '../js/engine/cali.js';
import { newMob } from '../js/engine/mob.js';
import { coachSays, VOICE_LINES, lineFor } from '../js/data/voice-lines.js';
import { coachesFor } from '../js/data/coaches.js';

const P = (o = {}) => ({ name: 'רותם', sex: 'f', age: 41, heightCm: 164, weightKg: 60, track: 'pil', coach: 'lia', goal: 'core', days: 3, level: 1, pilMin: 30, injuries: [], dislikes: [], ...o });
const secs = (w) => w.items.reduce((t, it) => t + it.sets * (it.reps[0] + it.rest), 0);

test('Pilates data and track helpers', () => {
  assert.ok(PIL_EXERCISES.length >= 18);
  for (const e of PIL_EXERCISES) { assert.ok(PIL_AREAS[e.area], e.id); assert.ok(['static', 'dynamic'].includes(e.kind)); assert.equal(e.cues.length, 3); assert.ok(PIL_TIPS[e.id], `${e.id} tip`); assert.deepEqual(EX[e.id].tracks, ['pil']); assert.ok([1, 2, 3].includes(e.level)); }
  for (const [id, area] of PIL_SHARED) { assert.ok(EX[id].tracks.includes('pil')); assert.equal(EX[id].area, area); assert.ok(EX[id].tracks.length > 1); }
  for (const a of ['core', 'back', 'hips']) assert.ok(EXERCISES.some((e) => e.tracks.includes('pil') && e.area === a && (e.level || 1) === 1), `${a} has a basic exercise`);
  assert.deepEqual(coachesFor('pil').map((c) => c.id), ['lia']); assert.deepEqual(coachesFor('hiit').map((c) => c.id), ['lia']); assert.deepEqual(coachesFor('gym').map((c) => c.id), ['ori', 'noa']);
  assert.deepEqual(goalsFor('pil'), ['core', 'posture', 'cut']); assert.equal(goalForTrack('strength', 'pil'), 'core'); assert.equal(goalForTrack('core', 'gym'), 'combat'); assert.equal(goalForTrack('posture', 'pil'), 'posture');
  const p = P(); assert.equal(isPil(p), true); assert.equal(hasGym(p), false); assert.equal(phaseFor(p, 0).id, 'pil'); assert.equal(sessionCoach(p, { track: 'pil' }), 'lia');
  assert.equal(pilLevel(P({ level: 5 })), 3);
});

test('Pilates class: fits the time, opens with breathing, ends with a stretch, respects the level', () => {
  for (const level of [1, 2, 3]) for (const mins of [20, 30, 40]) for (const tid of Object.keys(PIL_THEMES)) {
    const w = buildPilWorkout(tid, P({ level, pilMin: mins }));
    assert.equal(w.track, 'pil'); assert.equal(w.minutes, mins);
    assert.ok(secs(w) <= mins * 60, `${tid} L${level} ${mins}: ${secs(w)}s`); assert.ok(secs(w) >= mins * 60 * 0.8, `${tid} L${level} ${mins} fills the time: ${secs(w)}s`);
    assert.equal(w.items[0].exId, 'p_breathing'); assert.equal(w.items[1].exId, 'p_pelvic_curl'); assert.equal(w.items[w.items.length - 1].exId, 'child_pose');
    assert.equal(new Set(w.items.map((it) => it.exId)).size, w.items.length);
    assert.ok(w.items.every((it) => it.role === 'mob' && it.unit === 'sec' && it.label && EX[it.exId].tracks.includes('pil') && (EX[it.exId].level || 1) <= level && it.sets <= 3));
    assert.deepEqual(w.warmup, []); assert.deepEqual(w.cooldown, []);
  }
  assert.ok(!buildPilWorkout('pCore', P({ level: 1, pilMin: 40 })).items.some((it) => ['p_hundred', 'p_teaser'].includes(it.exId)));
  assert.ok(buildPilWorkout('pCore', P({ level: 3, pilMin: 40 })).items.some((it) => it.exId === 'p_teaser'));
  // הנושא קובע במה מתחילים אחרי הפתיחה
  assert.equal(EX[buildPilWorkout('pHips', P({ level: 2 })).items[2].exId].area, 'hips'); assert.equal(EX[buildPilWorkout('pBack', P({ level: 2 })).items[2].exId].area, 'back');
  const w = buildPilWorkout('pFull', P()); assert.deepEqual(applyReadiness(w, 0.2).items, w.items, 'the class is the same on a low day');
});

test('Pilates safety: injuries and screening flags remove exercises but leave a class', () => {
  const all = (p) => Object.keys(PIL_THEMES).flatMap((tid) => [20, 40].flatMap((m) => buildPilWorkout(tid, p, { minutes: m }).items));
  for (const inj of ['wrist', 'back', 'shoulder', 'knee']) { const p = P({ level: 3, injuries: [inj] }), bl = pilBlocked(p); assert.ok(bl.size); assert.ok(all(p).every((it) => !bl.has(it.exId)), inj); assert.ok(buildPilWorkout('pFull', p).items.length >= 8); }
  for (const f of ['preg', 'osteo', 'joint']) { const p = P({ level: 3, pilFlags: [f] }), bl = pilBlocked(p); assert.ok(all(p).every((it) => !bl.has(it.exId)), f); assert.ok(buildPilWorkout('pFull', p, { minutes: 20 }).items.length >= 5, `${f}: still a class`); }
  const preg = buildPilWorkout('pFull', P({ pilFlags: ['preg'] }), { minutes: 20 });
  assert.ok(preg.items.every((it) => !['p_hundred', 'p_swimming', 'p_breathing', 'plank'].includes(it.exId))); assert.ok(secs(preg) >= 20 * 60 * 0.6);
});

test('Pilates week, mobility add-on, level-up and voice', () => {
  for (const days of [2, 3, 4, 5]) { const wk = buildPilWeek(P({ days })); assert.equal(wk.sessions.length, days); assert.equal(new Set(wk.sessions.map((s) => s.name)).size, days); assert.deepEqual(wk.sessions.map((s) => s.day), Array.from({ length: days }, (_, i) => i + 1)); }
  const wk = buildWeek(P({ days: 4, mob: newMob(), mobN: 1 })); assert.deepEqual(wk.sessions.map((s) => s.track), ['pil', 'pil', 'pil', 'mob']); assert.equal(sessionCoach(P(), wk.sessions[3]), 'tamar');
  const now = Date.now(), ses = (n, o = {}) => Array.from({ length: n }, (_, i) => ({ date: new Date(now - i * 2 * 864e5).toISOString(), track: 'pil', ...o }));
  assert.equal(pilLevelUp(P(), ses(10), now), true); assert.equal(pilLevelUp(P(), ses(8), now), false); assert.equal(pilLevelUp(P({ level: 3 }), ses(12), now), false); assert.equal(pilLevelUp(P(), ses(12, { track: 'hiit' }), now), false);
  for (const k of ['pil_hello', 'pil_half', 'pil_done', 'mob_intro', 'mob_close', 'mob_again', 'mob_breathe', 'ex_p_hundred', 'tip_p_hundred', 'ex_plank', 'ex_child_pose', 'n3', 'switch_side', 'next_ex', 'workout_done']) { assert.ok(VOICE_LINES[k] != null, k); assert.equal(coachSays(k, 'lia'), true, k); }
  assert.notEqual(lineFor('mob_intro', 'lia', 'f'), lineFor('mob_intro', 'tamar', 'f'), 'Lia has her own wording for the flow lines');
  for (const k of ['pil_hello', 'ex_p_hundred', 'pil_done']) for (const c of ['ori', 'noa', 'maya', 'tamar', 'guy', 'shira']) assert.equal(coachSays(k, c), false, `${c} ${k}`);
  assert.equal(coachSays('mob_intro', 'tamar'), true); assert.equal(coachSays('mob_intro', 'ori'), false); assert.equal(coachSays('ex_m_cat_cow', 'lia'), false);
});
