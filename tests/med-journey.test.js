// המסלול המדיטטיבי כמסע רוחני בשלבים: שלבים, התקדמות בכושר ההליכה, שבוע קל, ומבנה השבוע
import test from 'node:test';
import assert from 'node:assert/strict';
import { MJ_PATHS, MJ_STAGES, MJ_WEEKS, mjOf, mjAt, mjWeekPlan, buildMjWeek } from '../js/engine/med-journey.js';
import { MED_JOURNEYS } from '../js/data/med-lines.js';
import { buildWeek } from '../js/engine/program.js';

const prof = (medJ, extra = {}) => ({ track: 'med', coach: 'or', days: 4, medMin: 30, level: 1, goal: 'zen', injuries: [], medJ, ...extra });

test('ארבעה שלבים בכל אורך מסע, ושבוע קל בסוף שלב ארוך', () => {
  assert.equal(MJ_STAGES.length, 4);
  for (const weeks of MJ_WEEKS) {
    const mj = { path: 'full', weeks, level: 1, time: 'day' }, stages = Array.from({ length: weeks }, (_, w) => mjAt(mj, w).stage);
    assert.deepEqual([...new Set(stages)], [0, 1, 2, 3]);
    for (let s = 0; s < 4; s++) assert.equal(stages.filter((x) => x === s).length, weeks / 4);
    const light = Array.from({ length: weeks }, (_, w) => mjAt(mj, w).light);
    assert.equal(light.filter(Boolean).length, weeks === 4 ? 0 : 4);
    if (weeks > 4) assert.ok(light[weeks / 4 - 1] && light[weeks - 1]);
    assert.ok(mjAt(mj, weeks).done && !mjAt(mj, weeks - 1).done);
  }
});

test('כל דרך מפנה למסעות קיימים, בארבעה שלבים', () => {
  for (const [id, p] of Object.entries(MJ_PATHS)) { assert.equal(p.stages.length, 4, id); for (const pool of p.stages) for (const j of pool) assert.ok(MED_JOURNEYS[j], `${id}: ${j}`); assert.ok(MED_JOURNEYS[p.art]); }
});

test('כושר ההליכה נבנה: יותר הליכות מהירות משלב לשלב, וההליכה הארוכה מתארכת', () => {
  const mj = { path: 'full', weeks: 8, level: 1, time: 'day' };
  const fastN = (w) => mjWeekPlan(mj, w, 4, 30).filter((x) => x.pace === 'fast').length, longest = (w) => Math.max(...mjWeekPlan(mj, w, 4, 30).map((x) => x.minutes));
  assert.equal(fastN(0), 0);                     // בתחילת הדרך, בשלב ההגעה: רק הליכות רגועות
  assert.ok(fastN(2) >= 1 && fastN(4) >= fastN(2) && fastN(4) >= 2);
  assert.equal(longest(0), 30); assert.equal(longest(2), 35); assert.ok(longest(6) > longest(4) && longest(4) > longest(2));
  assert.equal(longest(1), 30); assert.ok(fastN(3) < fastN(2));   // שבוע קל: בלי הליכה ארוכה ופחות מהירות
  for (let w = 0; w < 9; w++) { const pl = mjWeekPlan(mj, w, 4, 45); assert.ok(pl.some((x) => x.pace === 'calm')); assert.ok(pl.every((x) => x.minutes <= 65 && x.minutes % 5 === 0)); }
  // רמה גבוהה יותר — יותר הליכות מהירות באותו שבוע
  assert.ok(mjWeekPlan({ ...mj, level: 3 }, 2, 4).filter((x) => x.pace === 'fast').length > fastN(2));
  assert.ok(mjWeekPlan({ ...mj, level: 3 }, 0, 4).filter((x) => x.pace === 'fast').length >= 1);
});

test('השבוע נבנה דרך התוכנית הרגילה, עם שם השלב; בלי medJ — הסבב הישן', () => {
  const p = prof({ path: 'heal', weeks: 8, level: 2, time: 'morning' });
  assert.ok(mjOf(p)); assert.equal(mjOf(prof(null)), null); assert.equal(mjOf({ ...p, track: 'gym' }), null);
  const w0 = buildWeek(p, { blockIndex: 0, weekInBlock: 0 }), w5 = buildWeek(p, { blockIndex: 1, weekInBlock: 0 });
  assert.equal(w0.sessions.length, 4); assert.equal(w0.mj.stage, 0); assert.equal(w5.mj.stage, 2);
  assert.match(w0.phase.name, /ריפוי והתחדשות · הגעה/); assert.match(w5.week.name, /שבוע 5 מתוך 8/);
  assert.equal(w0.sessions[0].run.med, 'morning');   // הולכים בבוקר: השבוע נפתח במסע הבוקר
  for (const s of [...w0.sessions, ...w5.sessions]) { assert.equal(s.run.segs.length, 6); assert.equal(s.run.totalSec, s.minutes * 60); assert.equal(s.track, 'med'); }
  assert.ok(w5.sessions.at(-1).long && w5.sessions.at(-1).minutes > 30);
  const old = buildWeek(prof(null), { blockIndex: 0, weekInBlock: 0 }); assert.equal(old.mj, undefined); assert.equal(old.phase.name, 'מדיטציה בתנועה');
  const after = buildMjWeek(p, { blockIndex: 2, weekInBlock: 0 }); assert.ok(after.mj.done); assert.equal(after.mj.stage, 3);
});

test('סוף שלב וסוף מסע: mjStep, וסיכום ההליכות', async () => {
  const { mjStep, mjStats } = await import('../js/engine/med-journey.js');
  const mj = { path: 'full', weeks: 8, level: 1, time: 'day' };
  assert.equal(mjStep(mj, 0), null);                                   // אמצע שלב
  assert.deepEqual(mjStep(mj, 1), { kind: 'stage', stage: 0 });        // סוף שלב ההגעה
  assert.deepEqual(mjStep(mj, 5), { kind: 'stage', stage: 2 });
  assert.deepEqual(mjStep(mj, 7), { kind: 'journey', stage: 3 });      // סוף המסע
  assert.equal(mjStep(mj, 8), null); assert.equal(mjStep(mj, 12), null);   // אחרי המסע אין עוד הודעות
  const m4 = { ...mj, weeks: 4 }; assert.deepEqual([0, 1, 2, 3].map((w) => mjStep(m4, w)?.kind), ['stage', 'stage', 'stage', 'journey']);
  const runs = [{ med: 'heal', date: '2026-11-01T08:00:00Z', durationSec: 1800, distanceKm: 2.04 }, { med: 'reset', date: '2026-11-10T08:00:00Z', durationSec: 2100, distanceKm: 2.5 }, { date: '2026-11-11T08:00:00Z', durationSec: 900, distanceKm: 3 }];
  assert.deepEqual(mjStats(runs, '2026-11-05T00:00:00Z'), { walks: 1, minutes: 35, km: 2.5, stills: 0 });
  assert.deepEqual(mjStats(runs, null), { walks: 2, minutes: 65, km: 4.5, stills: 0 });
});

test('מדיטציות הבוקר והלילה של השבוע: בנוסף להליכות, מתחלפות לפי השלב, ולא חלק מאימוני השבוע', async () => {
  const { mjStills, mjStillsDone, mjStats } = await import('../js/engine/med-journey.js');
  const { STILL } = await import('../js/data/med-still.js');
  const mj = { path: 'full', weeks: 8, level: 1, time: 'day' };
  for (let w = 0; w < 8; w++) { const [m, n] = mjStills(mj, w); assert.equal(STILL[m].when, 'morning'); assert.equal(STILL[n].when, 'night'); }
  assert.notDeepEqual(mjStills(mj, 0), mjStills(mj, 2));
  const wk = buildWeek(prof(mj), { blockIndex: 0, weekInBlock: 0 });
  assert.equal(wk.stills.length, 2); assert.equal(wk.sessions.length, 4); assert.ok(wk.sessions.every((x) => !x.still));
  const sessions = [{ still: 'wake', date: '2026-11-23T07:00:00' }, { still: 'sleep', date: '2026-11-10T22:00:00' }, { date: '2026-11-23T09:00:00' }];
  assert.deepEqual([...mjStillsDone(sessions, '2026-11-22')], ['wake']);
  assert.equal(mjStats([], '2026-11-01T00:00:00', sessions).stills, 2);
});

test('"מתי הולכים" מתאים את שעות האימון רק כשהן לא מתאימות לבחירה', async () => {
  const { mjFitWorkout, mjTimeOf } = await import('../js/engine/med-journey.js');
  assert.equal(mjTimeOf('06:30'), 'morning'); assert.equal(mjTimeOf('12:00'), 'day'); assert.equal(mjTimeOf('17:00'), 'evening');
  assert.equal(mjFitWorkout('evening', { on: true, days: [0, 2], time: '18:30' }), null);
  const w = mjFitWorkout('morning', { on: true, days: [0, 2], time: '18:00', times: { 0: '06:15', 2: '20:00' } });
  assert.equal(w.time, '07:00'); assert.deepEqual(w.times, { 0: '06:15', 2: '07:00' }); assert.deepEqual(w.days, [0, 2]);
  assert.equal(mjFitWorkout('morning', undefined), null);
});
