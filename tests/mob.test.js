// מסלול המוביליטי והגמישות: מבחן הטווחים, בניית אימון לפי זמן, חסימות בטיחות, ושילוב בשבוע של מסלול אחר
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EX, EXERCISES } from '../js/data/exercises.js';
import { MOB_EXERCISES, MOB_TIPS } from '../js/data/mob-exercises.js';
import { REGIONS, TESTS, FLAG_BLOCK, MOB_INJ, THEMES } from '../js/data/mob.js';
import { newMob, saveMobTest, mobScore, mobLevel, mobTested, regionScores, weakRegions, retestDue, mobBlocked, buildMobWorkout, buildMobWeek,
  buildMobSessions, mobCount, hasMob, isMob, regionOf, regionMinutes, resizeMobWorkout } from '../js/engine/mob.js';
import { buildWeek, goalsFor, goalForTrack, blockedSet } from '../js/engine/program.js';
import { newCali, sessionCoach, exCoach, mixCaliCount, hasGym } from '../js/engine/cali.js';
import { targets } from '../js/engine/nutrition.js';
import { coachSays, VOICE_LINES } from '../js/data/voice-lines.js';

const base = { name: 'דנה', sex: 'f', age: 35, heightCm: 165, weightKg: 62, days: 4, sessionMin: 60, level: 2, injuries: [], dislikes: [], runLevel: 2 };
const mobP = (o = {}, test = { ankle: 0, ham: 1, shoulder: 2, overhead: 1, squat: 1, hip: 0 }, flags = []) => ({ ...base, track: 'mob', coach: 'tamar', goal: 'flex', mob: newMob(test, flags), ...o });
const secs = (w) => w.items.reduce((t, it) => t + it.sets * (it.reps[0] + it.rest), 0);

test('mobility data: every exercise has a region, cues, a tip and belongs only to the mobility track', () => {
  assert.ok(MOB_EXERCISES.length >= 35);
  for (const e of MOB_EXERCISES) {
    assert.ok(REGIONS[e.region], `${e.id} region`);
    assert.ok(['static', 'dynamic'].includes(e.kind), `${e.id} kind`);
    assert.equal(e.cues.length, 3, `${e.id} cues`);
    assert.ok(MOB_TIPS[e.id], `${e.id} tip`);
    assert.deepEqual(EX[e.id].tracks, ['mob']);
    assert.equal(EX[e.id].type, 'time');
  }
  // שש המתיחות הוותיקות משותפות לכל המסלולים, כולל מוביליטי
  for (const id of ['quad_stretch', 'hamstring_stretch', 'hip_flexor_stretch', 'chest_stretch', 'shoulder_stretch', 'child_pose']) { assert.ok(EX[id].tracks.includes('mob')); assert.ok(EX[id].tracks.includes('gym')); assert.ok(regionOf(id)); }
  // שום תרגיל של חדר כושר או קליסתניקס לא דלף למסלול
  assert.ok(EXERCISES.filter((e) => e.tracks.includes('mob')).every((e) => e.group === 'mobility'));
  for (const list of [...Object.values(FLAG_BLOCK), ...Object.values(MOB_INJ)]) for (const id of list) assert.ok(EX[id], `blocked id ${id} exists`);
  for (const t of Object.values(THEMES)) for (const r of t.regions) assert.ok(REGIONS[r]);
  for (const r of Object.keys(REGIONS)) assert.ok(EXERCISES.some((e) => e.tracks.includes('mob') && regionOf(e.id) === r), `region ${r} has exercises`);
});

test('mobility test: score, level, weak regions and retest timing', () => {
  const none = newMob();
  assert.equal(mobTested(none), false); assert.equal(retestDue(none), true); assert.equal(mobScore(none), 33);
  const mob = newMob({ ankle: 0, ham: 1, shoulder: 2, overhead: 1, squat: 1, hip: 0 }, [], '2026-11-01T08:00:00Z');
  assert.equal(mobTested(mob), true); assert.equal(mobScore(mob), 28); assert.equal(mobLevel(mob), 2);
  const sc = regionScores(mob);
  assert.equal(sc.ankles, 0.5); assert.equal(sc.shoulders, 1.5); assert.equal(sc.hamstrings, 1);
  assert.deepEqual(weakRegions(mob, 2), ['adductors', 'hipflex']);
  assert.equal(retestDue(mob, new Date('2026-11-20T08:00:00Z').getTime()), false);
  assert.equal(retestDue(mob, new Date('2026-12-02T08:00:00Z').getTime()), true);
  saveMobTest(mob, Object.fromEntries(TESTS.map((t) => [t.id, 3])), '2026-12-02T08:00:00Z');
  assert.equal(mob.tests.length, 2); assert.equal(mobScore(mob), 100); assert.equal(mobLevel(mob), 5);
  assert.equal(mobScore(mob, mob.tests[0].test), 28, 'the first test is kept for comparison');
});

test('mobility session: fits the chosen time, opens with movement, holds for the weak regions, ends calmly', () => {
  const p = mobP();
  for (const tid of Object.keys(THEMES)) for (const min of [10, 20, 30]) {
    const w = buildMobWorkout(tid, p, { minutes: min });
    assert.equal(w.track, 'mob'); assert.equal(w.minutes, min);
    assert.ok(secs(w) <= min * 60, `${tid} ${min}: ${secs(w)}s`);
    assert.ok(secs(w) >= min * 60 * 0.8, `${tid} ${min} fills the time: ${secs(w)}s`);
    assert.equal(new Set(w.items.map((it) => it.exId)).size, w.items.length, 'no exercise twice');
    assert.equal(EX[w.items[0].exId].kind, 'dynamic', 'opens with movement');
    assert.ok(['m_breathing', 'child_pose'].includes(w.items[w.items.length - 1].exId), 'ends with breathing or child pose');
    assert.deepEqual(w.warmup, []); assert.deepEqual(w.cooldown, []);
    for (const it of w.items) { assert.equal(it.role, 'mob'); assert.equal(it.unit, 'sec'); assert.ok(EX[it.exId].tracks.includes('mob')); assert.ok(THEMES[tid].regions.includes(it.region) || it.region === 'calm' || it.exId === 'child_pose'); }
  }
  // האזורים החלשים במבחן מקבלים שני סבבים באימון של 20 דקות
  const full = buildMobWorkout('mFull', p, { minutes: 20 });
  const two = full.items.filter((it) => it.sets === 2).map((it) => it.region);
  assert.ok(two.length >= 1 && two.every((r) => weakRegions(p.mob, 3).includes(r)), two.join());
  // החזקה חד־צדדית: 30 שניות לכל צד
  const uni = full.items.find((it) => EX[it.exId].unilateral && EX[it.exId].kind === 'static');
  assert.equal(uni.reps[0], 60);
  // אימון שונה בכל יום של השבוע
  const week = buildMobWeek(p);
  assert.equal(week.sessions.length, 4); assert.equal(new Set(week.sessions.map((s) => s.name)).size, 4);
  assert.equal(week.phase.id, 'mob');
  // אותו אימון באורך אחר שומר על השם והיום
  const r = resizeMobWorkout(week.sessions[1], p, 30, { blockIndex: 0, weekInBlock: 0 });
  assert.equal(r.name, week.sessions[1].name); assert.equal(r.day, 2); assert.ok(r.items.length > week.sessions[1].items.length);
  // מטרת "יציבה": השבוע נפתח באימון עמוד השדרה
  assert.equal(buildMobSessions({ ...p, goal: 'posture' }, 4)[0].templateId, 'mSpine');
});

test('mobility safety: injuries and screening flags remove exercises; hypermobility shortens holds', () => {
  const all = (p) => Object.keys(THEMES).flatMap((tid) => [10, 20, 30].flatMap((m) => buildMobWorkout(tid, p, { minutes: m }).items));
  const knee = mobP({ injuries: ['knee'] });
  assert.ok(mobBlocked(knee).has('m_pigeon'));
  assert.ok(all(knee).every((it) => !MOB_INJ.knee.includes(it.exId)));
  for (const f of ['preg', 'osteo', 'joint']) {
    const p = mobP({}, undefined, [f]);
    assert.ok(all(p).every((it) => !FLAG_BLOCK[f].includes(it.exId)), f);
    assert.ok(buildMobWorkout('mFull', p, { minutes: 20 }).items.length >= 8, `${f}: still a full session`);
  }
  const hyper = buildMobWorkout('mFull', mobP({}, undefined, ['hyper']), { minutes: 20 });
  assert.ok(hyper.note);
  assert.ok(hyper.items.filter((it) => EX[it.exId].kind === 'static' && it.exId !== 'm_breathing').every((it) => it.reps[0] <= 40 && it.sets === 1));
  assert.ok(blockedSet(knee).has('m_deep_squat'), 'the shared blocked set includes mobility blocks');
  // תרגילים מתקדמים (רמה 2) נכנסים רק כשהאזור לא חלש מדי
  const stiff = mobP({}, { ankle: 0, ham: 0, shoulder: 0, overhead: 0, squat: 0, hip: 0 });
  assert.ok(all(stiff).every((it) => (EX[it.exId].level || 1) <= 1));
});

test('mobility inside another track: replaces some of the week, keeps at least one session of every other part', () => {
  const mob = newMob();
  const gym = { ...base, track: 'gym', coach: 'ori', gymCoach: 'ori', goal: 'combat', mob, mobN: 1 };
  assert.equal(mobCount(gym), 1); assert.equal(hasMob(gym), true); assert.equal(isMob(gym), false); assert.equal(hasGym(gym), true);
  let wk = buildWeek(gym);
  assert.equal(wk.sessions.length, 4);
  assert.equal(wk.sessions.filter((s) => s.track === 'mob').length, 1);
  assert.deepEqual(wk.sessions.map((s) => s.day), [1, 2, 3, 4]);
  assert.ok(wk.sessions.filter((s) => s.track === 'mob').every((s) => s.name.startsWith('מוביליטי · ') && !s.run));
  assert.equal(sessionCoach(gym, wk.sessions.find((s) => s.track === 'mob')), 'tamar');
  assert.equal(sessionCoach(gym, wk.sessions.find((s) => !s.track)), 'ori');
  assert.equal(exCoach(gym, 'm_cat_cow'), 'tamar'); assert.equal(exCoach(gym, 'back_squat'), 'ori');
  // יותר מדי אימוני מוביליטי → נשאר לפחות אימון כוח אחד
  assert.equal(mobCount({ ...gym, days: 3, mobN: 5 }), 2);
  assert.equal(buildWeek({ ...gym, days: 3, mobN: 5 }).sessions.filter((s) => s.track !== 'mob').length, 1);
  assert.equal(mobCount({ ...gym, mobN: 0 }), 0); assert.equal(mobCount({ ...gym, mob: undefined }), 0);
  // קליסתניקס + מוביליטי
  const cali = newCali({ pushups: 20, pullups: 5, squats: 30, dips: 5, plankSec: 60 }, ['bar']);
  wk = buildWeek({ ...base, track: 'cali', coach: 'maya', goal: 'skill', cali, mob, mobN: 1, days: 3 });
  assert.deepEqual(wk.sessions.map((s) => s.track), ['cali', 'cali', 'mob']);
  // משולב + מוביליטי: אימון אחד לפחות מכל סוג
  const mix = { ...base, track: 'mix', coach: 'ori', gymCoach: 'noa', goal: 'combat', cali, mob, mobN: 2, days: 4 };
  assert.equal(mobCount(mix), 2); assert.equal(mixCaliCount(mix), 1);
  wk = buildWeek(mix);
  assert.deepEqual(wk.sessions.map((s) => s.track || 'gym').sort(), ['cali', 'gym', 'mob', 'mob']);
  assert.equal(mobCount({ ...mix, days: 3 }), 1);
  // בלי מוביליטי השבוע לא משתנה
  assert.deepEqual(buildWeek({ ...gym, mobN: 0 }).sessions.map((s) => s.name), buildWeek({ ...gym, mob: undefined, mobN: 0 }).sessions.map((s) => s.name));
  // מסלול מוביליטי בלבד: כל השבוע מוביליטי, והמאמנת תמר
  const solo = mobP();
  assert.ok(buildWeek(solo).sessions.every((s) => s.track === 'mob'));
  assert.equal(sessionCoach(solo, buildWeek(solo).sessions[0]), 'tamar'); assert.equal(hasGym(solo), false);
});

test('mobility track: goals, nutrition and what the coach says', () => {
  assert.deepEqual(goalsFor('mob'), ['flex', 'posture', 'cut']);
  assert.equal(goalForTrack('strength', 'mob'), 'flex'); assert.equal(goalForTrack('flex', 'gym'), 'combat'); assert.equal(goalForTrack('posture', 'cali'), 'skill'); assert.equal(goalForTrack('cut', 'mob'), 'cut');
  const solo = mobP(), gym = { ...base, track: 'gym', goal: 'combat' };
  const a = targets(solo), b = targets(gym);
  assert.equal(a.delta, 0); assert.equal(a.perKg, 1.4); assert.ok(a.kcal < b.kcal, 'light activity → fewer calories than the gym plan');
  assert.equal(a.activity.factor, 1.375); assert.ok(a.kcal >= a.bmr);
  assert.ok(targets({ ...solo, goal: 'cut' }).delta < 0); assert.equal(targets({ ...solo, goal: 'cut' }).perKg, 1.8);
  // תמר: יש לה את המשפטים שלה ואת שמות התרגילים שלה, ואין לה ספירת חזרות, סטים או ריצה
  for (const k of ['hello_tamar', 'mob_intro', 'mob_hold', 'mob_again', 'mob_breathe', 'mob_close', 'n3', 'switch_side', 'hold_done', 'workout_done', 'ex_m_cat_cow', 'tip_m_cat_cow', 'ex_child_pose']) { assert.ok(VOICE_LINES[k] != null, k); assert.equal(coachSays(k, 'tamar'), true, k); }
  for (const k of ['n10', 'set2', 'down', 'up', 'run_fast', 'pr', 'last_set', 'rate_set', 'hello_ori', 'ex_back_squat', 'ex_pushup', 'rung_up', 'm1']) assert.equal(coachSays(k, 'tamar'), false, k);
  for (const k of ['mob_intro', 'hello_tamar', 'ex_m_cat_cow']) for (const c of ['ori', 'noa', 'maya']) assert.equal(coachSays(k, c), false, `${c} ${k}`);
  assert.equal(coachSays('ex_child_pose', 'ori'), true); assert.equal(coachSays('n10', 'maya'), true);
});

test('mobility tracking: minutes per region over the last week', () => {
  const now = Date.now();
  const ses = (daysAgo, ex) => ({ date: new Date(now - daysAgo * 864e5).toISOString(), track: 'mob', exercises: ex.map(([exId, reps]) => ({ exId, role: 'mob', sets: [{ reps, done: true }] })) });
  const m = regionMinutes([ses(1, [['m_pigeon', 60], ['m_figure4', 120], ['m_breathing', 60]]), ses(3, [['m_calf_wall', 90]]), ses(9, [['m_pigeon', 600]]),
    { date: new Date(now).toISOString(), exercises: [{ exId: 'back_squat', role: 'main', sets: [{ reps: 8 }] }] }], now);
  assert.equal(m.hips, 3); assert.equal(m.ankles, 1.5); assert.equal(m.calm, undefined); assert.equal(Object.keys(m).length, 2);
});
