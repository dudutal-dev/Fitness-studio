// מסלול הריצה: נקודת פתיחה, ריצה־הליכה למתחילים, התקדמות הריצה הארוכה, שבוע התאוששות ומבדק, ושילוב עם מוביליטי
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isRun, buildRunWeek, buildRunSessions, buildRunWalk, longMinutes, rwWeeksLeft, RW_STAGES, RUN_BASES } from '../js/engine/running.js';
import { buildWeek, goalsFor, goalForTrack, phaseFor } from '../js/engine/program.js';
import { hasGym, sessionCoach } from '../js/engine/cali.js';
import { newMob } from '../js/engine/mob.js';
import { targets } from '../js/engine/nutrition.js';
import { coachSays, VOICE_LINES, lineFor } from '../js/data/voice-lines.js';
import { COACHES, coachesFor } from '../js/data/coaches.js';

const base = { name: 'נועם', sex: 'm', age: 34, heightCm: 176, weightKg: 74, days: 3, sessionMin: 60, level: 2, runLevel: 2, run3k: 16 * 60, injuries: [], dislikes: [] };
const P = (o = {}) => ({ ...base, track: 'run', coach: 'guy', runCoach: 'guy', goal: 'r5k', runBase: 0, ...o });
const week = (p, w) => buildRunWeek(p, { blockIndex: Math.floor(w / 4), weekInBlock: w % 4 });
const runMin = (s) => s.run.segs.filter((x) => !['warm', 'cool', 'walk'].includes(x.kind)).reduce((t, x) => t + x.sec, 0) / 60;

test('running track: coaches, goals and track helpers', () => {
  assert.deepEqual(coachesFor('run').map((c) => c.id), ['guy', 'shira']);
  assert.deepEqual(coachesFor('gym').map((c) => c.id), ['ori', 'noa']);
  assert.deepEqual(goalsFor('run'), ['r5k', 'r10k', 'r21k', 'cut']);
  assert.equal(goalForTrack('strength', 'run'), 'r5k'); assert.equal(goalForTrack('r21k', 'gym'), 'combat'); assert.equal(goalForTrack('cut', 'run'), 'cut');
  const p = P();
  assert.equal(isRun(p), true); assert.equal(hasGym(p), false); assert.equal(phaseFor(p, 0).id, 'run');
  assert.equal(sessionCoach(p, null), 'guy'); assert.equal(sessionCoach(P({ coach: 'shira' }), null), 'shira');
  assert.deepEqual(RUN_BASES.map((b) => b[0]), [0, 5, 15, 30, 60]);
});

test('beginners: run-walk stages grow by one a week up to 30 minutes of continuous running, then the full plan', () => {
  const p = P();
  assert.equal(rwWeeksLeft(p, 0), RW_STAGES.length);
  let prev = 0;
  for (let w = 0; w < RW_STAGES.length; w++) {
    const wk = week(p, w);
    assert.equal(wk.sessions.length, 3);
    assert.ok(wk.sessions.every((s) => s.run.type === 'runwalk' && s.runOnly && s.track === 'run' && s.items.length === 0), `week ${w}`);
    assert.deepEqual(wk.sessions.map((s) => s.day), [1, 2, 3]);
    const m = runMin(wk.sessions[0]);
    assert.ok(m >= prev, `week ${w}: running time does not drop (${m} after ${prev})`); prev = m;
    assert.ok(wk.sessions[0].run.totalSec <= 42 * 60);
    assert.ok(wk.sessions[0].run.segs.every((x) => ['warm', 'easy', 'walk', 'cool'].includes(x.kind)), 'no fast running for beginners');
  }
  assert.equal(prev, 30);
  assert.equal(buildRunWalk(p, 0).segs.filter((x) => x.kind === 'easy').length, 8);
  assert.equal(buildRunWalk(p, 8).segs.filter((x) => x.kind === 'walk').length, 0);
  // אחרי השלב האחרון: התוכנית הרגילה, מההתחלה שלה
  const after = week(p, RW_STAGES.length);
  assert.deepEqual(after.sessions.map((s) => s.run.type), ['easy', 'intervals', 'long']);
  assert.equal(rwWeeksLeft(p, RW_STAGES.length), 0);
  // מי שכבר רץ רבע שעה מתחיל בשלב מתקדם; ימים נוספים הם הליכות
  const mid = week(P({ runBase: 15, days: 5 }), 0);
  assert.deepEqual(mid.sessions.map((s) => s.run.type), ['runwalk', 'runwalk', 'runwalk', 'walk', 'walk']);
  assert.equal(mid.sessions[0].run.stage, 5);
  assert.equal(rwWeeksLeft(P({ runBase: 30 }), 0), 0);
});

test('full plan: one long run that grows gently, mostly easy running, recovery week with a 3k test', () => {
  for (const [goal, cap] of [['r5k', 45], ['r10k', 75], ['r21k', 130]]) {
    const p = P({ goal, runBase: 30, days: 4 });
    let last = 0;
    for (let w = 0; w < 40; w++) {
      const wk = week(p, w), long = wk.sessions[wk.sessions.length - 1];
      assert.equal(long.run.type, 'long');
      const m = runMin(long), deload = w % 4 === 3;
      assert.ok(m <= cap, `${goal} w${w}: long ${m} within cap ${cap}`);
      if (!deload) { assert.ok(m >= last, `${goal} w${w} long does not shrink`); assert.ok(m - last <= 8 || last === 0, `${goal} w${w}: +${m - last} min`); last = m; }
      else { assert.ok(m < last, 'recovery week is shorter'); assert.equal(wk.sessions[0].run.type, 'test'); assert.ok(wk.sessions.every((s) => !['intervals', 'tempo'].includes(s.run.type))); }
      const hard = wk.sessions.filter((s) => ['intervals', 'tempo'].includes(s.run.type)).length;
      assert.ok(hard <= 1, 'four days: at most one hard run');
    }
    assert.equal(last, cap, `${goal} reaches its cap`);
  }
  assert.ok(longMinutes(P({ goal: 'r21k', runBase: 60 }), 0) > longMinutes(P({ goal: 'r10k', runBase: 60 }), 0));
  const five = week(P({ goal: 'r21k', runBase: 60, days: 5 }), 0);
  assert.deepEqual(five.sessions.map((s) => s.run.type), ['easy', 'intervals', 'easy', 'tempo', 'long']);
  assert.equal(buildRunSessions(P({ runBase: 30 }), 1)[0].run.type, 'long');
  assert.equal(week(P({ runBase: 30, days: 6 }), 0).sessions.length, 6);
});

test('running with mobility sessions, and the plan builder', () => {
  const p = P({ runBase: 30, days: 4, mob: newMob(), mobN: 1 });
  const wk = buildWeek(p);
  assert.deepEqual(wk.sessions.map((s) => s.track), ['run', 'run', 'run', 'mob']);
  assert.deepEqual(wk.sessions.map((s) => s.day), [1, 2, 3, 4]);
  assert.equal(sessionCoach(p, wk.sessions[3]), 'tamar'); assert.equal(sessionCoach(p, wk.sessions[0]), 'guy');
  assert.equal(wk.sessions[2].run.type, 'long');
  assert.ok(buildWeek(P({ runBase: 30 })).sessions.every((s) => s.runOnly));
  // מסלול חדר הכושר לא השתנה: הריצות שלו נשארות צמודות לאימונים
  const gym = buildWeek({ ...base, track: 'gym', coach: 'ori', goal: 'combat', days: 4 });
  assert.ok(gym.sessions.every((s) => !s.runOnly && s.items.length > 0)); assert.ok(gym.sessions.some((s) => s.run));
});

test('running: nutrition and what the running coaches say', () => {
  const t = targets(P({ runBase: 30 }));
  assert.equal(t.perKg, 1.6); assert.equal(t.delta, 0); assert.equal(targets(P({ goal: 'cut' })).perKg, 2.0); assert.ok(targets(P({ goal: 'cut' })).delta < 0);
  for (const c of ['guy', 'shira']) {
    for (const k of [`hello_${c}`, 'run_warm', 'run_fast', 'run_easy', 'run_walk', 'run_steady', 'run_tempo', 'run_half', 'run_min', 'run_last', 'run_done', 'run_cool', 'run_km', 'run_3k', 'run_long', 'run_form', 'run_breathe', 'zone_up', 'zone_down', 'n3', 'go', 'workout_start', 'streak', 'pr']) { assert.ok(VOICE_LINES[k] != null, k); assert.equal(coachSays(k, c), true, `${c} ${k}`); }
    for (const k of ['n10', 'set2', 'down', 'last_set', 'rate_set', 'hello_ori', 'ex_back_squat', 'rung_up', 'mob_intro', 'warm_intro', 'workout_done']) assert.equal(coachSays(k, c), false, `${c} ${k}`);
    assert.ok(!lineFor('workout_start', c, 'm').includes('סט'));
  }
  assert.equal(coachSays('hello_guy', 'shira'), false);
  for (const k of ['run_long', 'run_form', 'run_breathe', 'hello_guy']) for (const c of ['ori', 'noa', 'maya', 'tamar']) assert.equal(coachSays(k, c), false, `${c} ${k}`);
  assert.equal(coachSays('run_fast', 'ori'), true);
  assert.equal(COACHES.shira.f, true); assert.ok(!COACHES.guy.f);
});
