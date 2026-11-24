// מדיטציה בתנועה עם אור: ששת המסעות, מבנה ההליכה, הקול, והשילוב בשבוע כתחום נוסף
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { MED_JOURNEYS, MED_ORDER, MED_ALL, MED_LINES, MED_ANCHORS, MED_POINTS, MED_PACE, medLine } from '../js/data/med-lines.js';
import { buildMedSession, buildMedSessions, weekJourney, medShape, medEffort, MED_MINUTES } from '../js/engine/meditation.js';
import { coachSays, VOICE_LINES } from '../js/data/voice-lines.js';
import { COACHES, coachesFor } from '../js/data/coaches.js';
import { buildWeek, phaseFor, goalsFor, goalForTrack, EXTRA_TRACKS, extraCoach } from '../js/engine/program.js';
import { hasGym, sessionCoach } from '../js/engine/cali.js';
import { isWalk, isMed } from '../js/engine/walking.js';
import { wantsNutrition } from '../js/engine/nutrition.js';

const has = (p) => existsSync(new URL(`../${p}`, import.meta.url));

test('שישה מסעות בסבב השבועי ומדיטציית בוקר; לכל אחד שישה קטעי דיבור, איור ורקע נע', () => {
  assert.deepEqual(MED_ORDER, ['release', 'heal', 'connect', 'reset', 'thanks', 'presence']); assert.deepEqual(MED_ALL, ['morning', ...MED_ORDER]);
  for (const j of MED_ALL) {
    assert.ok(MED_JOURNEYS[j].name && MED_JOURNEYS[j].desc, j);
    for (let i = 0; i < 6; i++) { const k = medLine(j, i); assert.ok(MED_LINES[k] && VOICE_LINES[k], k); assert.ok(has(`assets/voice/or/${k}.mp3`), `${k}.mp3`); }
    for (const f of [`${j}.webp`, `${j}_sq.webp`, `${j}.mp4`]) assert.ok(has(`assets/med/${f}`), f);
  }
  for (const k of ['med_hello', 'med_done', ...MED_ANCHORS, ...Object.values(MED_PACE)]) { assert.ok(MED_LINES[k], k); assert.ok(has(`assets/voice/or/${k}.mp3`), k); }
});
test('הטקסטים ניטרליים: בלי פנייה ביחיד (שלך, איתך, אותך…), כי היא נשמעת אחרת לגבר ולאישה', () => {
  for (const [k, t] of Object.entries(MED_LINES)) assert.ok(!/(^|[\s,.])(שלך|איתך|אותך|לך|עצמך|אליך|ממך|בך)([\s,.]|$)/.test(t), `${k}: ${t}`);
});
test('אור אומרת רק את משפטי המדיטציה, ואף מאמן אחר לא אומר אותם', () => {
  assert.equal(COACHES.or.track, 'med'); assert.deepEqual(coachesFor('med').map((c) => c.id), ['or']);
  for (const k of Object.keys(MED_LINES)) { assert.equal(coachSays(k, 'or'), true, k); for (const c of ['ori', 'shira', 'yael']) assert.equal(coachSays(k, c), false, `${c} ${k}`); }
  for (const k of ['go', 'rest', 'walk_hello', 'hello_ori', 'm1', 'ctx_first']) assert.equal(coachSays(k, 'or'), false, k);
  for (const f of ['assets/coaches/or.webp', 'assets/coaches/or_face.webp', 'assets/demos/or/outdoor_walk.webp', 'assets/demos/or/outdoor_walk.mp4']) assert.ok(has(f), f);
  for (const m of ['medcalm', 'medbeat']) for (const n of [7, 8, 9, 10]) assert.ok(has(`assets/music/${m}_${n}.mp3`), `${m}_${n}`);
});
test('הליכה מדיטטיבית: תמיד שישה מקטעים באורך שנבחר, ולכל מסע מבנה ורמת מאמץ משלו', () => {
  for (const minutes of MED_MINUTES) for (const pace of ['calm', 'fast']) for (const j of MED_ALL) {
    const r = buildMedSession(j, { minutes, pace });
    assert.equal(r.segs.length, 6); assert.equal(r.segs[0].kind, 'warm'); assert.equal(r.segs[5].kind, 'cool');
    assert.equal(r.totalSec, minutes * 60, `${j} ${pace} ${minutes}`);
    assert.ok(r.segs.every((s) => s.sec >= 60 && s.sec % 15 === 0), 'כל מקטע דקה לפחות, בכפולות של רבע דקה');
    assert.deepEqual(r.segs.slice(1, 5).map((s) => s.kind), medShape(j, pace)); assert.deepEqual(r.segs.slice(1, 5).map((s) => s.point), MED_POINTS[j]);
    assert.equal(r.walk, true); assert.equal(r.med, j); assert.equal(r.type, 'med'); assert.equal(r.effort, medEffort(j, pace));
  }
  // ריפוי ונוכחות — הכי עדינים; שחרור מהיר — הכי נמרץ; מהירה אף פעם לא קלה מרגועה
  assert.equal(medEffort('heal', 'calm'), 1); assert.equal(medEffort('presence', 'calm'), 1); assert.equal(medEffort('release', 'fast'), 3);
  assert.ok(medShape('release', 'fast').includes('power')); assert.ok(!medShape('heal', 'fast').includes('power'));
  for (const j of MED_ALL) { assert.ok(medEffort(j, 'fast') >= medEffort(j, 'calm'), j); assert.equal(MED_POINTS[j].length, 4); }
  // הבוקר מתעורר בהדרגה: מתחיל רגוע ומסתיים מהיר
  assert.deepEqual(medShape('morning', 'calm'), ['stroll', 'stroll', 'brisk', 'brisk']); assert.ok(!MED_ORDER.includes('morning'), 'הבוקר לא בסבב השבועי');
  // מי שבחר הליכה מהירה מקבל חלקים מהירים בכל מסע: שניים לפחות, ושליש מההליכה לפחות; ברגועה — רוב ההליכה רגועה
  for (const j of MED_ALL) for (const minutes of MED_MINUTES) { const fast = (r) => r.segs.filter((s) => s.kind === 'brisk' || s.kind === 'power');
    const rf = buildMedSession(j, { minutes, pace: 'fast' }), rc = buildMedSession(j, { minutes, pace: 'calm' });
    assert.ok(fast(rf).length >= 2, `${j}: ${fast(rf).length} חלקים מהירים`); assert.ok(fast(rf).reduce((a, s) => a + s.sec, 0) >= rf.totalSec / 3, `${j} ${minutes}`);
    assert.ok(fast(rc).reduce((a, s) => a + s.sec, 0) <= rc.totalSec * 0.45, `${j} רגועה`); }
  assert.ok(new Set(MED_ORDER.map((j) => medShape(j, 'calm').join() + medShape(j, 'fast').join())).size >= 5, 'המסעות שונים זה מזה במבנה');
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
test('דף המסלול: נקודה לכל קילומטר שלם על המסלול', async () => {
  const { kmPoints } = await import('../js/ui/route-image.js').catch(() => ({}));
  if (!kmPoints) return;   // המודול נשען על הדפדפן
  const route = Array.from({ length: 60 }, (_, i) => [32 + i * 0.0005, 34.8]);   // כ-55 מ׳ בין נקודות, כ-3.3 ק״מ
  const k = kmPoints(route); assert.equal(k.length, 3); assert.ok(k[0][0] > 32.008 && k[0][0] < 32.0095);
});
test('מדיטציה בתנועה כמסלול ראשי: שבוע של הליכות עם אור, בלי חדר כושר ובלי תפריט', () => {
  const p = { name: 'דנה', sex: 'f', age: 40, heightCm: 165, weightKg: 62, track: 'med', coach: 'or', goal: 'zen', days: 4, level: 1, medMin: 20, medPace: 'calm', nutrition: true, injuries: [], dislikes: [] };
  assert.equal(isMed(p), true); assert.equal(isWalk(p), true); assert.equal(hasGym(p), false); assert.equal(phaseFor(p, 0).id, 'med');
  assert.deepEqual(goalsFor('med'), ['zen']); assert.equal(goalForTrack('strength', 'med'), 'zen');
  for (const days of [2, 3, 4, 6]) { const wk = buildWeek({ ...p, days }, { blockIndex: 0, weekInBlock: 2 });
    assert.equal(wk.sessions.length, days); assert.ok(wk.sessions.every((s, i) => s.day === i + 1 && s.track === 'med' && s.runOnly && s.run.med && s.minutes === 20));
    assert.equal(wk.sessions[0].run.med, 'connect', 'המסע של השבוע השלישי פותח את השבוע'); assert.equal(sessionCoach(p, wk.sessions[0]), 'or'); }
  // אין תפריט במסלול הזה — גם כשליווי התזונה היה דולק; כשחוזרים למסלול אחר הוא חוזר
  assert.equal(wantsNutrition(p), false); assert.equal(wantsNutrition({ ...p, track: 'walk' }), true); assert.equal(wantsNutrition({ ...p, track: 'gym', nutrition: false }), false);
  // מסלול ההליכה הרגיל לא השתנה
  assert.equal(isMed({ track: 'walk' }), false); assert.equal(phaseFor({ track: 'walk' }, 0).id, 'walk');
});
