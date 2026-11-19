// מסלול היוגה: רמות, שיעור שמתאים לזמן, פתיחה וסיום, סדר התנוחות, חסימות בטיחות, ועליית רמה
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EX } from '../js/data/exercises.js';
import { YOGA_EXERCISES, YOGA_TIPS, YOGA_AREAS } from '../js/data/yoga-exercises.js';
import { isYoga, buildYogaWorkout, buildYogaWeek, YOGA_THEMES, yogaBlocked, yogaLevelUp, yogaLevel } from '../js/engine/yoga.js';
import { buildWeek, goalsFor, goalForTrack, phaseFor, applyReadiness } from '../js/engine/program.js';
import { hasGym, sessionCoach } from '../js/engine/cali.js';
import { newMob } from '../js/engine/mob.js';
import { targets, loadOf } from '../js/engine/nutrition.js';
import { coachSays, VOICE_LINES, lineFor } from '../js/data/voice-lines.js';
import { coachesFor } from '../js/data/coaches.js';

const P = (o = {}) => ({ name: 'דנה', sex: 'f', age: 38, heightCm: 165, weightKg: 62, track: 'yoga', coach: 'yael', goal: 'zen', days: 3, level: 1, yogaMin: 30, injuries: [], dislikes: [], ...o });
const secs = (w) => w.items.reduce((t, it) => t + it.sets * (it.reps[0] + it.rest), 0);
const ORDER = ['stand', 'balance', 'core', 'back', 'floor', 'twist'];

test('Yoga data and track helpers', () => {
  assert.ok(YOGA_EXERCISES.length >= 26);
  for (const e of YOGA_EXERCISES) { assert.ok(YOGA_AREAS[e.area], e.id); assert.ok(['static', 'dynamic'].includes(e.kind)); assert.equal(e.cues.length, 3); assert.ok(YOGA_TIPS[e.id], `${e.id} tip`); assert.deepEqual(EX[e.id].tracks, ['yoga']); assert.ok([1, 2, 3].includes(e.level)); }
  for (const a of ORDER) assert.ok(YOGA_EXERCISES.some((e) => e.area === a && e.level === 1), `${a} has a beginner pose`);
  assert.deepEqual(coachesFor('yoga').map((c) => c.id), ['yael']); assert.deepEqual(coachesFor('pil').map((c) => c.id), ['lia']); assert.deepEqual(coachesFor('gym').map((c) => c.id), ['ori', 'noa']);
  assert.deepEqual(goalsFor('yoga'), ['zen', 'flex', 'cut']); assert.equal(goalForTrack('strength', 'yoga'), 'zen'); assert.equal(goalForTrack('zen', 'gym'), 'combat'); assert.equal(goalForTrack('flex', 'yoga'), 'flex');
  const p = P(); assert.equal(isYoga(p), true); assert.equal(hasGym(p), false); assert.equal(phaseFor(p, 0).id, 'yoga'); assert.equal(sessionCoach(p, { track: 'yoga' }), 'yael');
  assert.equal(yogaLevel(P({ level: 5 })), 3);
  assert.equal(loadOf({ track: 'yoga', items: [{}] }), 'light'); assert.equal(targets(P()).protein, targets(P({ track: 'mob' })).protein);
});

test('Yoga class: fits the time, opens with breathing, ends with relaxation, keeps the order, respects the level', () => {
  for (const level of [1, 2, 3]) for (const mins of [20, 30, 45]) for (const tid of Object.keys(YOGA_THEMES)) {
    const w = buildYogaWorkout(tid, P({ level, yogaMin: mins }));
    const m = tid === 'yCalm' ? Math.min(mins, 30) : mins;   // שיעור רגוע: עד 30 דקות
    assert.equal(w.track, 'yoga'); assert.equal(w.minutes, m);
    assert.ok(secs(w) <= m * 60, `${tid} L${level} ${mins}: ${secs(w)}s`); assert.ok(secs(w) >= m * 60 * 0.8, `${tid} L${level} ${mins} fills the time: ${secs(w)}s`);
    assert.deepEqual(w.items.slice(0, 3).map((it) => it.exId), ['y_breath', 'y_cat_cow', 'y_down_dog']);
    assert.deepEqual(w.items.slice(-2).map((it) => it.exId), ['y_supine_twist', 'y_savasana']);
    assert.ok(w.items[w.items.length - 1].reps[0] >= 90, 'a real relaxation at the end');
    assert.equal(new Set(w.items.map((it) => it.exId)).size, w.items.length);
    assert.ok(w.items.every((it) => it.role === 'mob' && it.unit === 'sec' && it.label && EX[it.exId].yoga && (EX[it.exId].level || 1) <= level && it.sets <= 2));
    const mid = w.items.slice(3, -2).map((it) => ORDER.indexOf(EX[it.exId].area));
    assert.ok(mid.length >= 4, `${tid} L${level} ${mins}: ${mid.length} poses`); assert.ok(mid.every((v, i) => v >= 0 && (i === 0 || v >= mid[i - 1])), `${tid}: standing first, floor last`);
    assert.deepEqual(w.warmup, []); assert.deepEqual(w.cooldown, []);
  }
  assert.ok(!buildYogaWorkout('yStand', P({ level: 1, yogaMin: 45 })).items.some((it) => ['y_crow', 'y_warrior3', 'y_triangle'].includes(it.exId)));
  assert.ok(buildYogaWorkout('yStand', P({ level: 3, yogaMin: 45 })).items.some((it) => ['y_crow', 'y_warrior3'].includes(it.exId)));
  // שיעור רגוע: בלי עמידה ושיווי משקל, והרפיה ארוכה יותר
  const calm = buildYogaWorkout('yCalm', P({ level: 2 })), full = buildYogaWorkout('yFull', P({ level: 2 }));
  assert.ok(calm.items.slice(3, -2).every((it) => !['stand', 'balance', 'core'].includes(EX[it.exId].area))); assert.ok(calm.items.at(-1).reps[0] > full.items.at(-1).reps[0]); assert.ok(calm.items[3].reps[0] >= 80, 'long holds');
  // גמישות־יתר: החזקות קצרות יותר
  assert.ok(buildYogaWorkout('yFull', P({ yogaFlags: ['hyper'] })).items[3].reps[0] < full.items[3].reps[0]);
  assert.deepEqual(applyReadiness(full, 0.2).items, full.items, 'the class is the same on a low day');
});

test('Yoga safety: injuries and screening flags remove poses but leave a class', () => {
  const all = (p) => Object.keys(YOGA_THEMES).flatMap((tid) => [20, 45].flatMap((m) => buildYogaWorkout(tid, p, { minutes: m }).items));
  for (const inj of ['wrist', 'back', 'shoulder', 'knee']) { const p = P({ level: 3, injuries: [inj] }), bl = yogaBlocked(p); assert.ok(bl.size); assert.ok(all(p).every((it) => !bl.has(it.exId)), inj); assert.ok(buildYogaWorkout('yFull', p).items.length >= 8); }
  for (const f of ['preg', 'osteo', 'joint']) { const p = P({ level: 3, yogaFlags: [f] }), bl = yogaBlocked(p); assert.ok(all(p).every((it) => !bl.has(it.exId)), f); assert.ok(buildYogaWorkout('yFull', p, { minutes: 20 }).items.length >= 6, `${f}: still a class`); }
  // היריון: בלי שכיבה על הבטן ובלי שכיבה ממושכת על הגב — ההרפיה בסוף על הצד
  const preg = buildYogaWorkout('yFull', P({ level: 3, yogaFlags: ['preg'] }));
  assert.equal(preg.items.at(-1).exId, 'y_side_rest'); assert.ok(preg.items.every((it) => !['y_cobra', 'y_locust', 'y_bow', 'y_savasana', 'y_supine_twist', 'y_boat'].includes(it.exId))); assert.ok(secs(preg) >= 30 * 60 * 0.6);
  assert.ok(!buildYogaWorkout('yFull', P()).items.some((it) => it.exId === 'y_side_rest'), 'the side-lying rest is only a replacement');
  const osteo = buildYogaWorkout('yHips', P({ level: 3, yogaFlags: ['osteo'] }));
  assert.ok(osteo.items.every((it) => !['y_forward_fold', 'y_seated_fold', 'y_seated_twist'].includes(it.exId)));
});

test('Yoga week, mobility add-on, level-up and voice', () => {
  for (const days of [2, 3, 4, 5]) { const wk = buildYogaWeek(P({ days })); assert.equal(wk.sessions.length, days); assert.equal(new Set(wk.sessions.map((s) => s.name)).size, days); assert.deepEqual(wk.sessions.map((s) => s.day), Array.from({ length: days }, (_, i) => i + 1)); }
  const wk = buildWeek(P({ days: 4, mob: newMob(), mobN: 1 })); assert.deepEqual(wk.sessions.map((s) => s.track), ['yoga', 'yoga', 'yoga', 'mob']); assert.equal(sessionCoach(P(), wk.sessions[3]), 'tamar');
  const now = Date.now(), ses = (n, o = {}) => Array.from({ length: n }, (_, i) => ({ date: new Date(now - i * 2 * 864e5).toISOString(), track: 'yoga', ...o }));
  assert.equal(yogaLevelUp(P(), ses(10), now), true); assert.equal(yogaLevelUp(P(), ses(8), now), false); assert.equal(yogaLevelUp(P({ level: 3 }), ses(12), now), false); assert.equal(yogaLevelUp(P(), ses(12, { track: 'pil' }), now), false);
  for (const k of ['hello_yael', 'mob_intro', 'mob_close', 'mob_again', 'mob_breathe', 'mob_hold', 'mob_no_pain', 'ex_y_warrior2', 'tip_y_warrior2', 'ex_y_savasana', 'n3', 'switch_side', 'next_ex', 'hold_half', 'hold_done', 'workout_start', 'workout_done', 'streak']) { assert.ok(VOICE_LINES[k] != null || lineFor(k, 'yael', 'f'), k); assert.equal(coachSays(k, 'yael'), true, k); }
  assert.notEqual(lineFor('mob_intro', 'yael', 'f'), lineFor('mob_intro', 'tamar', 'f'), 'Yael has her own wording for the flow lines');
  assert.notEqual(lineFor('workout_done', 'yael', 'm'), lineFor('workout_done', 'ori', 'm'), 'no "eat protein" after yoga');
  for (const k of ['hello_yael', 'ex_y_warrior2', 'tip_y_tree']) for (const c of ['ori', 'noa', 'maya', 'tamar', 'guy', 'shira', 'lia']) assert.equal(coachSays(k, c), false, `${c} ${k}`);
  for (const k of ['pr', 'last_set', 'hiit_go', 'run_half', 'pil_hello', 'ex_m_cat_cow', 'ex_plank', 'm1', 'warm_intro', 'hello_tamar']) assert.equal(coachSays(k, 'yael'), false, k);
});
