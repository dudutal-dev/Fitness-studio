import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildWeek, buildWorkout, buildFieldWorkout, applyReadiness, estimateLevel, blockedSet } from '../js/engine/program.js';
import { suggest, e1rm, evaluateLevel, isPR } from '../js/engine/progression.js';
import { targets, mealPlan } from '../js/engine/nutrition.js';
import { FOOD } from '../js/data/foods.js';
import { buildRunSession, runLevelFrom3k } from '../js/engine/running.js';
import { combatReadiness, rankFor, readinessScore, streak } from '../js/engine/stats.js';
import { EX, EXERCISES } from '../js/data/exercises.js';
import { VOICE_LINES } from '../js/data/voice-lines.js';

const P = { name: 'דוד', age: 20, sex: 'm', heightCm: 178, weightKg: 72, goal: 'combat', level: 3, days: 4, sessionMin: 60, run3k: 13 * 60, injuries: [], dislikes: ['vegetables'], dislikedFoods: [] };

test('every exercise referenced exists and has cues', () => {
  for (const e of EXERCISES) assert.ok(e.cues.length >= 3 || e.cues.length >= 2, e.id);
  for (const days of [3, 4, 5, 6]) {
    const w = buildWeek({ ...P, days });
    assert.equal(w.sessions.length, days);
    for (const s of w.sessions) for (const it of s.items) assert.ok(EX[it.exId], it.exId);
  }
});

test('combat goal schedules 3 runs, deload week has a 3k test', () => {
  const w = buildWeek(P);
  assert.equal(w.sessions.filter((s) => s.run).length, 3);
  const d = buildWeek(P, { weekInBlock: 3 });
  assert.ok(d.sessions.some((s) => s.run?.type === 'test'));
});

test('injuries block exercises', () => {
  const p = { ...P, injuries: ['knee', 'back'] };
  const blocked = blockedSet(p);
  for (const days of [3, 4, 5, 6]) for (const s of buildWeek({ ...p, days }).sessions)
    for (const it of s.items) assert.ok(!blocked.has(it.exId), `${it.exId} should be blocked`);
});

test('session length caps exercises', () => {
  const long = buildWorkout('upperB', { ...P, sessionMin: 90 });
  const short = buildWorkout('upperB', { ...P, sessionMin: 40 });
  assert.ok(short.items.length < long.items.length);
});

test('readiness low reduces sets and load', () => {
  const w = buildWorkout('lowerA', P);
  const low = applyReadiness(w, 0.2);
  assert.ok(low.items.every((it, i) => it.sets <= w.items[i].sets && it.loadAdj === 0.9));
});

test('double progression: hits top → weight up; fails hard → weight down', () => {
  const item = { reps: [8, 10] };
  const hist = [{ date: '2026-11-01', target: [8, 10], sets: [1, 2, 3].map(() => ({ w: 60, reps: 10, rpe: 8, done: true })) }];
  const up = suggest('back_squat', item, hist, P);
  assert.equal(up.w, 65); assert.ok(up.up);
  const bad = [{ date: '2026-11-01', target: [8, 10], sets: [{ w: 60, reps: 6, rpe: 10, done: true }, { w: 60, reps: 5, rpe: 10, done: true }] }];
  const down = suggest('back_squat', item, bad, P);
  assert.ok(down.w < 60 && down.down);
  const first = suggest('bench_press', item, [], P);
  assert.ok(first.w >= 20 && first.first);
});

test('PR detection and e1rm', () => {
  assert.equal(Math.round(e1rm(100, 5)), 117);
  const h = [{ sets: [{ w: 80, reps: 5, done: true }] }];
  assert.ok(isPR('bench_press', [{ w: 85, reps: 5, done: true }], h));
  assert.ok(!isPR('bench_press', [{ w: 75, reps: 5, done: true }], h));
});

test('level evaluation', () => {
  assert.equal(evaluateLevel(3, { planned: 16, completed: 15, progressed: 6, tracked: 10, avgRpe: 8 }).level, 4);
  assert.equal(evaluateLevel(3, { planned: 16, completed: 5, progressed: 1, tracked: 10, avgRpe: 8 }).level, 2);
  assert.equal(estimateLevel({ years: 0, pushups: 10, pullups: 0 }), 1);
  assert.ok(estimateLevel({ years: 4, pushups: 60, pullups: 18, run3k: 11 * 60 }) >= 5);
});

test('nutrition respects dislikes and targets', () => {
  const t = targets(P);
  assert.ok(t.kcal > 2500 && t.kcal < 4000, String(t.kcal));
  assert.equal(t.protein, 144);
  for (let seed = 1; seed < 20; seed++) {
    const plan = mealPlan({ ...P, dislikes: ['vegetables', 'fish', 'dairy'] }, { seed });
    for (const m of plan.meals) for (const it of m.items) {
      const f = FOOD[it.id];
      assert.ok(!f.tags.some((x) => ['vegetables', 'fish', 'dairy'].includes(x)), f.id);
    }
    assert.ok(plan.noVeg);
    assert.ok(Math.abs(plan.total.kcal - t.kcal) / t.kcal < 0.35, `seed ${seed}: ${plan.total.kcal} vs ${t.kcal}`);
  }
});

test('running sessions progress', () => {
  assert.equal(runLevelFrom3k(11 * 60), 5);
  assert.equal(runLevelFrom3k(17 * 60), 1);
  const a = buildRunSession(P, 'intervals', 0), b = buildRunSession(P, 'intervals', 6);
  assert.ok(b.totalSec > a.totalSec);
});

test('stats', () => {
  assert.equal(rankFor(0).name, 'מתחילים');
  assert.equal(rankFor(700).name, 'מתמידים');
  assert.ok(readinessScore({ sleep: 5, energy: 5, soreness: 1, stress: 1 }) === 1);
  const cri = combatReadiness({ profile: P, history: {}, sessions: [], runs: [], weights: [] });
  assert.ok(cri.score > 0 && cri.score < 100);
  const d = (n) => new Date(Date.now() - n * 864e5).toISOString();
  assert.equal(streak([{ date: d(0) }, { date: d(2) }, { date: d(3) }]), 3);
});

test('voice lines exist for every exercise', () => {
  for (const e of EXERCISES) assert.ok(VOICE_LINES[`ex_${e.id}`]);
});

test('every voice clip (incl. female + names) exists on disk', async () => {
  const { manifest } = await import('../tools/voice_manifest.mjs');
  const { existsSync } = await import('node:fs');
  const { FEMALE, VOICE_LINES } = await import('../js/data/voice-lines.js');
  for (const k of Object.keys(FEMALE)) assert.ok(VOICE_LINES[k], `female variant without base: ${k}`);
  const missing = Object.keys(manifest()).filter((k) => !existsSync(new URL(`../assets/voice/${k}.mp3`, import.meta.url)));
  assert.deepEqual(missing, []);
});

test('release version is consistent (version.json / js/version.js / sw.js)', async () => {
  const { readFileSync } = await import('node:fs');
  const { APP_VERSION } = await import('../js/version.js');
  const vj = JSON.parse(readFileSync(new URL('../version.json', import.meta.url)));
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.equal(vj.v, APP_VERSION);
  assert.ok(sw.includes(`studio-${APP_VERSION}`));
  assert.ok(sw.includes(`studio-media-${vj.media}`));
});

test('demo timing: every rep-based exercise video has rep segments for both coaches', async () => {
  const { DEMO_TIMING } = await import('../js/data/demo-timing.js');
  for (const e of EXERCISES) {
    if (['time', 'cardio'].includes(e.type) || e.freeDemo) continue;
    // חדר כושר: אורי ונועה; קליסתניקס: מאיה
    for (const c of [...(e.tracks.includes('gym') ? ['ori', 'noa'] : []), ...(e.tracks.includes('cali') ? ['maya'] : [])]) {
      assert.ok(DEMO_TIMING[c]?.[e.id], `no demo timing for ${c}/${e.id}`);
      const segs = DEMO_TIMING[c][e.id].segs;
      assert.ok(segs.length >= 1, `${c}/${e.id}`);
      for (const [a, t, b] of segs) assert.ok(a < t && t < b && b <= 4.01, `${c}/${e.id} ${a},${t},${b}`);
    }
  }
});

test('edit/delete workouts keeps progression history consistent', async () => {
  const { updateSession, deleteSession, updateRun, deleteRun } = await import('../js/engine/history-edit.js');
  const d1 = '2026-11-10T18:00:00.000Z', d2 = '2026-11-12T18:00:00.000Z';
  const st = {
    xp: 500, profile: { run3k: 800 }, plan: { weekStart: '2026-11-11', completedDays: [1, 2] },
    sessions: [
      { id: 's1', date: d1, day: 1, exercises: [{ exId: 'bench_press', role: 'main', target: [8, 10], sets: [{ w: 60, reps: 10, done: true }, { w: 60, reps: 9, done: true }] }] },
      // אימון ישן בלי מזהה — הקישור לפי זמן
      { date: d2, day: 2, exercises: [{ exId: 'bench_press', role: 'main', target: [8, 10], sets: [{ w: 62.5, reps: 8, done: true }] }, { exId: 'back_squat', role: 'main', target: [8, 10], sets: [{ w: 80, reps: 8, done: true }] }] },
    ],
    history: {
      bench_press: [{ sid: 's1', date: d1, sets: [{ w: 60, reps: 10 }, { w: 60, reps: 9 }] }, { date: '2026-11-12T18:00:01.000Z', sets: [{ w: 62.5, reps: 8 }] }],
      back_squat: [{ date: '2026-11-12T18:00:01.000Z', sets: [{ w: 80, reps: 8 }] }],
    },
    runs: [{ date: d1, type: 'test', timeSec: 800 }, { date: d2, type: 'test', timeSec: 760 }],
  };
  // עריכה: תיקון משקל ומחיקת סט
  updateSession(st, 0, { exercises: [{ exId: 'bench_press', role: 'main', target: [8, 10], sets: [{ w: 65, reps: 10, done: true }] }] });
  assert.equal(st.history.bench_press.length, 2);
  assert.deepEqual(st.history.bench_press.find((h) => h.sid === 's1').sets.map((x) => x.w), [65]);
  assert.equal(st.sessions[0].volume, 650);
  assert.equal(st.sessions[0].setsDone, 1);
  // מחיקה של אימון ישן (בלי מזהה): ההיסטוריה שלו נמחקת, יום 2 בשבוע הנוכחי חוזר להיות פתוח, XP יורד
  deleteSession(st, 1);
  assert.equal(st.sessions.length, 1);
  assert.equal(st.history.bench_press.length, 1);
  assert.equal(st.history.back_squat, undefined);
  assert.deepEqual(st.plan.completedDays, [1]);
  assert.equal(st.xp, 380);
  // ריצות: מחיקת המבדק האחרון מחזירה את זמן ה-3 ק״מ הקודם
  deleteRun(st, 1);
  assert.equal(st.profile.run3k, 800);
  updateRun(st, 0, { timeSec: 790 });
  assert.equal(st.profile.run3k, 790);
});

test('warm-up and targeted stretches per workout', async () => {
  const { warmupFor, cooldownFor, buildWorkout } = await import('../js/engine/program.js');
  const legs = buildWorkout('lowerA', P), upper = buildWorkout('upperA', P);
  assert.equal(legs.warmup.length, 5);
  assert.ok(legs.warmup.some((x) => x.exId === 'bw_squat'));
  assert.ok(upper.warmup.some((x) => x.exId === 'high_knees'));
  assert.ok(legs.cooldown.some((x) => ['quad_stretch', 'hamstring_stretch'].includes(x.exId)));
  assert.ok(upper.cooldown.some((x) => ['chest_stretch', 'shoulder_stretch'].includes(x.exId)));
  for (const w of [legs, upper]) {
    assert.equal(w.cooldown[w.cooldown.length - 1].exId, 'child_pose');
    for (const m of [...w.warmup, ...w.cooldown]) assert.equal(EX[m.exId].group, 'mobility');
    for (const it of w.items) assert.notEqual(EX[it.exId].group, 'mobility');
  }
  // פציעת ברכיים: בלי קפיצות בחימום
  const knee = warmupFor(buildWorkout('lowerA', { ...P, injuries: ['knee'] }).items, new Set(['box_jump']));
  assert.ok(!knee.some((x) => ['jumping_jacks', 'high_knees'].includes(x.exId)));
});

test('food database: every item has a MoH source, sane values, search and day totals', async () => {
  const { searchFoods, dayTotals } = await import('../js/engine/nutrition.js');
  const { FOODS, FOOD } = await import('../js/data/foods.js');
  assert.ok(FOODS.length >= 150);
  for (const f of FOODS) {
    assert.ok(Array.isArray(f.src) && f.src.length && f.src.every((x) => Number.isInteger(x.code) && x.g > 0), `${f.id} has no source`);
    assert.ok(f.g > 0 && f.kcal >= 0 && Array.isArray(f.meals) && f.meals.length, f.id);
    // אנרגיה ממאקרו (4/4/9 + סיבים 2) קרובה לערך האנרגיה במאגר — פער גדול = טעות מיפוי או פריט חשוד במאגר.
    const est = f.p * 4 + f.c * 4 + f.f * 9 + (f.fib || 0) * 2 + (f.alc || 0) * 7; // אלכוהול: 7 קק״ל לגרם
    if (f.kcal > 40) assert.ok(Math.abs(est - f.kcal) / f.kcal < 0.15, `${f.id}: ${f.kcal} vs ${Math.round(est)}`);
  }
  assert.ok(searchFoods('שניצל').some((f) => f.id === 'schnitzel_pita'));
  assert.ok(searchFoods('קוטג').length >= 2);
  assert.equal(searchFoods('', [], { cat: 'meal' }).every((f) => f.cat === 'meal'), true);
  const custom = [{ id: 'c_1', name: 'חטיף של עומר', kcal: 100, p: 10, c: 10, f: 2, custom: true }];
  assert.equal(searchFoods('עומר', custom)[0].id, 'c_1');
  const t = dayTotals({ foods: [{ id: 'banana', qty: 2 }, { id: 'c_1', qty: 1 }], protein: 20 }, custom);
  assert.equal(t.kcal, Math.round(FOOD.banana.kcal * 2 + 100 + 80));
});

test('meal plan: no chicken / meat / fish at breakfast; foods fit their meal; no junk in plan', async () => {
  const { mealPlan } = await import('../js/engine/nutrition.js');
  const { FOOD } = await import('../js/data/foods.js');
  const MEAT = ['chicken', 'red_meat', 'fish', 'tuna'];
  const code = { breakfast: 'b', snack1: 's', lunch: 'l', post: 'p', dinner: 'd' };
  for (const ctx of ['base', 'field', 'home']) for (let seed = 1; seed <= 60; seed++) {
    const plan = mealPlan({ ...P, dislikes: [] }, { ctx, seed });
    for (const m of plan.meals) for (const it of m.items) {
      const f = FOOD[it.id];
      assert.ok(f.meals.includes(code[m.id]), `${f.name} not allowed in ${m.id}`);
      assert.notEqual(f.cat, 'meal');
      if (m.id === 'breakfast') assert.ok(!f.tags.some((t) => MEAT.includes(t)), `breakfast has ${f.name} (${ctx}, seed ${seed})`);
    }
  }
});


// ───── תזונה: התאמה למחקר ─────
test('menu hits the calorie and protein targets it prescribes', async () => {
  const { mealPlan } = await import('../js/engine/nutrition.js');
  const profiles = [
    { weightKg: 78, heightCm: 178, age: 24, sex: 'm', goal: 'combat', days: 4 },
    { weightKg: 78, heightCm: 178, age: 24, sex: 'm', goal: 'muscle', days: 5 },
    { weightKg: 95, heightCm: 178, age: 30, sex: 'm', goal: 'cut', days: 3 },
    { weightKg: 60, heightCm: 165, age: 22, sex: 'f', goal: 'cut', days: 3 },
  ];
  for (const base of profiles) for (const ctx of ['base', 'field', 'home']) for (let seed = 1; seed <= 12; seed++) {
    const plan = mealPlan({ ...base, dislikes: [], dislikedFoods: [] }, { ctx, seed });
    const t = plan.targets;
    assert.ok(Math.abs(plan.total.kcal / t.kcal - 1) <= 0.12, `kcal ${plan.total.kcal} vs ${t.kcal} (${base.goal}/${ctx}/${seed})`);
    assert.ok(plan.total.p >= t.protein * 0.85, `protein ${plan.total.p} vs ${t.protein} (${base.goal}/${ctx}/${seed})`);
    for (const m of plan.meals) for (const it of m.items) assert.ok(it.qty >= 0.5 && it.qty <= 2.5);
  }
});

test('targets: activity derives from training days, protein is capped for high BMI, floors hold', async () => {
  const { targets, activityKey, goalDelta } = await import('../js/engine/nutrition.js');
  assert.equal(activityKey({ days: 2 }), 'light');
  assert.equal(activityKey({ days: 4 }), 'base');
  assert.equal(activityKey({ days: 6 }), 'training');
  assert.equal(activityKey({ days: 2, activityLevel: 'field' }), 'field');
  const heavy = targets({ weightKg: 130, heightCm: 180, age: 35, sex: 'm', goal: 'cut', days: 3 });
  assert.ok(heavy.protein < 130 * 2.2 && heavy.protein === Math.round(30 * 1.8 * 1.8 * 2.2));
  const lean = targets({ weightKg: 75, heightCm: 180, age: 25, sex: 'm', goal: 'cut', days: 4 });
  assert.equal(lean.protein, Math.round(75 * 2.2));
  assert.ok(lean.kcal >= lean.bmr && lean.fat >= 0.5 * 75);
  assert.equal(lean.fiber, Math.round(lean.kcal / 1000 * 14));
  const surplus = goalDelta('muscle', 78, 2900);
  assert.ok(surplus >= 250 && surplus <= 450);
  assert.equal(targets({ weightKg: 75, heightCm: 180, age: 25, sex: 'm', goal: 'combat', days: 4, kcalAdjust: 150 }).kcal - targets({ weightKg: 75, heightCm: 180, age: 25, sex: 'm', goal: 'combat', days: 4 }).kcal, 150);
});

test('trendAdvice compares the real weight trend with the recommended rate', async () => {
  const { trendAdvice } = await import('../js/engine/nutrition.js');
  const now = new Date('2026-11-18').getTime();
  assert.equal(trendAdvice([{ date: '2026-11-10', kg: 80 }, { date: '2026-11-17', kg: 79.5 }], { goal: 'cut' }, now), null);
  const w = (kgs) => kgs.map((kg, i) => ({ date: `2026-11-${String(1 + i * 5).padStart(2, '0')}`, kg }));
  const ok = trendAdvice(w([80, 79.7, 79.4, 79.1]), { goal: 'cut' }, now);   // ~-0.42 ק״ג/שבוע ≈ -0.53%
  assert.ok(ok.onTrack && ok.step === 0);
  const fast = trendAdvice(w([80, 79, 78, 77]), { goal: 'cut' }, now);        // ~-1.75%/שבוע
  assert.equal(fast.step, 150);
  const stuck = trendAdvice(w([80, 80.1, 80, 80.1]), { goal: 'cut' }, now);
  assert.equal(stuck.step, -150);
  assert.equal(trendAdvice(w([80, 80.1, 80, 80.1]), { goal: 'cut', kcalAdjust: -450 }, now).step, 0);
});

test('no-equipment workout uses only bodyweight exercises, for every level and injury', async () => {
  const { buildFieldWorkout, isBodyweight, INJURIES } = await import('../js/engine/program.js');
  for (let level = 1; level <= 5; level++) for (const injuries of [[], ...Object.keys(INJURIES).map((k) => [k])]) {
    const w = buildFieldWorkout({ ...P, level, injuries });
    assert.ok(w.items.length >= 3, `too few exercises (level ${level}, ${injuries})`);
    for (const it of w.items) assert.ok(isBodyweight(it.exId), `${it.exId} needs equipment (level ${level}, ${injuries})`);
    for (const [id] of w.finisher?.items || []) assert.ok(isBodyweight(id), `finisher ${id} needs equipment`);
    const main = new Set(w.items.map((it) => it.exId));
    for (const m of w.warmup) assert.ok(!main.has(m.exId), `warm-up repeats ${m.exId}`);
  }
});

test('weekSummary compares the last 7 days with the 7 before', async () => {
  const { weekSummary } = await import('../js/engine/summary.js');
  const now = new Date(2026, 10, 18, 12).getTime(), d = (n) => new Date(now - n * 864e5).toISOString();
  const key = (n) => { const x = new Date(now - n * 864e5); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
  const state = {
    profile: { ...P, customFoods: [] }, plan: { week: { sessions: [1, 2, 3, 4] } },
    sessions: [{ date: d(0), durationSec: 3000, volume: 5000, prs: ['bench_press'] }, { date: d(2), durationSec: 2400, volume: 4000, prs: [] }, { date: d(6), durationSec: 2400, volume: 3000 },
      { date: d(8), durationSec: 2400, volume: 2000, prs: [] }, { date: d(20), durationSec: 2400, volume: 9000 }],
    runs: [{ date: d(1), durationSec: 1500, distanceKm: 4.2 }, { date: d(9), durationSec: 1200, distanceKm: 3 }],
    daily: { [key(0)]: { foods: [{ id: 'chicken_breast', qty: 2 }], water: 2000 }, [key(1)]: { foods: [{ id: 'chicken_breast', qty: 1 }], water: 1000 }, [key(9)]: { foods: [{ id: 'rice', qty: 1 }] } },
    weights: [{ date: key(10), kg: 73 }, { date: key(3), kg: 72.4 }],
  };
  const s = weekSummary(state, now);
  assert.equal(s.cur.workouts, 3); assert.equal(s.prev.workouts, 1);
  assert.equal(s.cur.runs, 1); assert.equal(s.cur.runKm, 4.2);
  assert.equal(s.cur.volume, 12000); assert.equal(s.cur.prs, 1); assert.equal(s.cur.activeDays, 4);
  assert.equal(s.cur.foodDays, 2); assert.equal(s.cur.kcal, Math.round((480 + 240) / 2)); assert.equal(s.cur.waterL, 1.5);
  assert.deepEqual(s.weight, { kg: 72.4, delta: -0.6 });
  assert.ok(s.verdict.length > 5);
  const empty = weekSummary({ profile: P, sessions: [], runs: [], daily: {}, weights: [] }, now);
  assert.equal(empty.cur.workouts, 0); assert.equal(empty.cur.kcal, null); assert.equal(empty.weight, null);
});

test('known lifts set the opening weight; exercises with history ignore them', async () => {
  const { suggest, strengthFactor, weightFor } = await import('../js/engine/progression.js');
  const base = { ...P, weightKg: 75, level: 2 };
  const item = { reps: [8, 10], sets: 4 };
  const plain = suggest('bench_press', item, null, base);
  // דיווח על התרגיל עצמו: 80 ק״ג × 8 → משקל ל-10 חזרות עם 2 ברזרבה
  const strong = suggest('bench_press', item, null, { ...base, lifts: { bench_press: { w: 80, reps: 8 } } });
  const expected = weightFor(e1rm(80, 8), 10, 2);
  assert.ok(Math.abs(strong.w - expected) <= 2.5, `${strong.w} vs ${expected}`);
  assert.ok(strong.w > plain.w && strong.w < 80);
  // תרגיל קרוב (לחיצה משופעת) מקבל את אותו יחס כוח; תרגיל רגליים לא מושפע מלחיצת חזה
  const inc0 = suggest('incline_db_press', item, null, base), inc1 = suggest('incline_db_press', item, null, { ...base, lifts: { bench_press: { w: 80, reps: 8 } } });
  assert.ok(inc1.w > inc0.w);
  assert.equal(suggest('back_squat', item, null, { ...base, lifts: { bench_press: { w: 80, reps: 8 } } }).w, suggest('back_squat', item, null, base).w);
  // מתאמן חלש מההנחה → משקל נמוך יותר; יחס קיצוני נתחם
  assert.ok(suggest('back_squat', item, null, { ...base, lifts: { back_squat: { w: 30, reps: 10 } } }).w < suggest('back_squat', item, null, base).w);
  assert.equal(strengthFactor(EX.leg_press, { ...base, lifts: { back_squat: { w: 400, reps: 10 } } }).factor, 2.2);
  assert.equal(strengthFactor(EX.leg_press, base), null);
  // ערכים לא סבירים מתעלמים מהם
  assert.equal(suggest('bench_press', item, null, { ...base, lifts: { bench_press: { w: 0, reps: 8 } } }).w, plain.w);
  // יש היסטוריה → ההרמה שדווחה לא משנה
  const hist = [{ date: '2026-11-01', target: [8, 10], sets: [{ w: 50, reps: 10, rpe: 8, done: true }, { w: 50, reps: 9, rpe: 8, done: true }] }];
  assert.equal(suggest('bench_press', item, hist, { ...base, lifts: { bench_press: { w: 120, reps: 5 } } }).w, suggest('bench_press', item, hist, base).w);
});

test('fitness score: nothing measured → no score; parts appear as data arrives', () => {
  const fresh = { ...P, run3k: null, lifts: undefined, targetWeight: 70 };
  const none = combatReadiness({ profile: fresh, history: {}, sessions: [], runs: [], weights: [{ date: '2026-11-18', kg: 72 }] });
  assert.equal(none.score, null);
  assert.deepEqual(none.parts, { strength: null, endurance: null, skill: null, consistency: 0, body: null });
  // זמן 3 ק״מ מההרשמה → סבולת ידועה, והציון מחושב רק מהרכיבים הידועים
  const withRun = combatReadiness({ profile: { ...fresh, run3k: 13 * 60 }, history: {}, sessions: [], runs: [], weights: [] });
  assert.equal(withRun.parts.endurance, 67); assert.equal(withRun.parts.strength, null);
  assert.equal(withRun.score, Math.round(((200 / 3) * 0.3 + 0 * 0.25) / 0.55));
  // הרמות שדווחו → הערכת כוח ראשונה; היסטוריה אמיתית גוברת עליהן
  const lifts = combatReadiness({ profile: { ...fresh, weightKg: 75, lifts: { bench_press: { w: 80, reps: 8 } } }, history: {}, sessions: [], runs: [], weights: [] });
  assert.ok(lifts.parts.strength > 60 && lifts.parts.strength <= 100);
  const hist = { bench_press: [{ date: '2026-11-10', sets: [{ w: 40, reps: 10, done: true }] }] };
  assert.ok(combatReadiness({ profile: { ...fresh, weightKg: 75, lifts: { bench_press: { w: 80, reps: 8 } } }, history: hist, sessions: [], runs: [], weights: [] }).parts.strength < lifts.parts.strength);
  // שתי שקילות → רכיב הגוף
  assert.ok(combatReadiness({ profile: fresh, history: {}, sessions: [], runs: [], weights: [{ date: 'a', kg: 74 }, { date: 'b', kg: 72 }] }).parts.body != null);
});

test('expanded food database: every food is sourced, sane and searchable; the menu still uses only the curated set', async () => {
  const { FOODS } = await import('../js/data/foods.js');
  const { mealPlan, searchFoods } = await import('../js/engine/nutrition.js');
  assert.ok(FOODS.length >= 600, `only ${FOODS.length} foods`);
  const ids = new Set(), names = new Set();
  const CATS = new Set(['protein', 'dairy', 'carb', 'fruit', 'veg', 'fat', 'snack', 'meal', 'sauce']);
  for (const f of FOODS) {
    assert.ok(!ids.has(f.id), `duplicate id ${f.id}`); ids.add(f.id);
    assert.ok(!names.has(f.name), `duplicate name ${f.name}`); names.add(f.name);
    assert.ok(CATS.has(f.cat), `${f.id}: cat ${f.cat}`);
    assert.ok(f.src?.length >= 1 && f.src.every((s) => s.code > 0 && s.g > 0), `${f.id}: no source`);   // אין ערך בלי מקור
    assert.ok(f.g >= 5 && f.g <= 800 && f.kcal >= 0 && f.kcal <= 1400, `${f.id}: portion ${f.g} g / ${f.kcal} kcal`);
    assert.ok(f.ctx.length && f.meals.length, `${f.id}: ctx/meals`);
  }
  const curated = new Set(FOODS.filter((f) => f.plan !== false).map((f) => f.id));
  assert.equal(curated.size, 153);
  assert.ok(FOODS.length - curated.size >= 450);
  for (const ctx of ['base', 'field', 'home']) for (let seed = 1; seed <= 20; seed++) {
    for (const m of mealPlan({ ...P, dislikes: [] }, { ctx, seed }).meals) for (const it of m.items) assert.ok(curated.has(it.id), `${it.id} in menu`);
  }
  for (const q of ['יוגורט', 'קטשופ', 'שווארמה בלאפה', 'ביצה קשה', 'קינדר', 'מרק', 'לחם שיפון', 'קשיו', 'אפרסק']) assert.ok(searchFoods(q).length >= 1, `search "${q}"`);
  assert.ok(searchFoods('', [], { cat: 'sauce' }).length >= 10);
});

// ───── מסלול קליסתניקס ─────
test('calisthenics: every ladder rung is a real exercise with a demo prompt and a voice line', async () => {
  const { LADDERS, LADDER_OF } = await import('../js/data/cali.js');
  const { VOICE_LINES, coachSays } = await import('../js/data/voice-lines.js');
  const demos = JSON.parse(fs.readFileSync(new URL('../tools/demos.json', import.meta.url), 'utf8'));
  const seen = new Set();
  for (const [lid, L] of Object.entries(LADDERS)) {
    assert.ok(L.rungs.length >= 3, lid);
    for (const r of L.rungs) {
      const e = EX[r.id];
      assert.ok(e, `${lid}: unknown exercise ${r.id}`);
      assert.ok(!seen.has(r.id), `${r.id} appears in two ladders`); seen.add(r.id);
      assert.equal(LADDER_OF[r.id], lid);
      assert.ok(r.lo < r.hi && r.lo >= 1, `${r.id} target`);
      assert.ok(e.tracks.includes('cali'), `${r.id} not in the calisthenics track`);
      assert.ok(e.type === 'bw' || e.type === 'time', `${r.id} must be bodyweight`);
      assert.ok(VOICE_LINES[`ex_${r.id}`] && coachSays(`ex_${r.id}`, 'maya'), `no maya voice line for ${r.id}`);
      assert.ok(['cali', 'all'].includes(demos[r.id]?.[2]), `no maya demo for ${r.id}`);
      for (const dep of Object.values(L.req || {})) assert.ok(EX[dep], `${lid} requires unknown ${dep}`);
    }
  }
  // מאמני חדר הכושר לא אומרים תרגילי קליסתניקס, ומאיה לא אומרת תרגילי מכונות
  assert.equal(coachSays('ex_planche', 'ori'), false);
  assert.equal(coachSays('ex_bench_press', 'maya'), false);
  assert.equal(coachSays('ex_pushup', 'maya'), true);
  assert.equal(coachSays('ex_pushup', 'noa'), true);
});

test('calisthenics: level test picks a starting rung; equipment decides which ladders exist', async () => {
  const { newCali, rungState, ladderLock, ladderOpen, startRungs } = await import('../js/engine/cali.js');
  const beginner = newCali({ pushups: 0, squats: 4, plankSec: 10, bmi: 31 }, []);
  assert.equal(rungState(beginner, 'push').rung.id, 'wall_pushup');
  assert.equal(rungState(beginner, 'squat').rung.id, 'assisted_squat');
  assert.equal(rungState(beginner, 'pull'), null, 'no bar → no pull-up ladder');
  assert.equal(rungState(beginner, 'row').rung.id, 'door_row', 'rows work without equipment');
  assert.deepEqual(ladderLock(beginner, 'pull'), { equip: ['bar', 'rings'] });
  assert.ok(ladderLock(beginner, 'handstand').req, 'handstand needs full push-ups first');
  assert.deepEqual(beginner.skills, ['lsit']);
  const mid = newCali({ pushups: 22, pullups: 6, squats: 35, dips: 5, plankSec: 70 }, ['bar', 'pbars']);
  assert.equal(rungState(mid, 'push').rung.id, 'pushup');
  assert.equal(rungState(mid, 'pull').rung.id, 'pullup');
  assert.equal(rungState(mid, 'dip').rung.id, 'dip_negative');
  assert.equal(rungState(mid, 'dip').n, 3, 'no rings → the dip ladder ends at bar dips');
  assert.deepEqual(mid.skills, ['lsit', 'handstand']);
  assert.ok(ladderOpen(mid, 'backlever') && !ladderOpen(mid, 'planche') && !ladderOpen(mid, 'flag'));
  // יותר חזרות לעולם לא נותנות שלב נמוך יותר
  const order = (lid, id) => LADDERS_IDX[lid].indexOf(id);
  const { LADDERS } = await import('../js/data/cali.js');
  const LADDERS_IDX = Object.fromEntries(Object.entries(LADDERS).map(([k, L]) => [k, L.rungs.map((r) => r.id)]));
  let prev = null;
  for (let n = 0; n <= 60; n += 3) {
    const r = startRungs({ pushups: n, pullups: Math.floor(n / 3), squats: n, dips: Math.floor(n / 3), plankSec: n * 2 }, ['bar', 'pbars', 'rings']);
    if (prev) for (const lid of ['push', 'pull', 'squat', 'hinge', 'core', 'dip', 'row']) assert.ok(order(lid, r[lid]) >= order(lid, prev[lid]), `${lid} at ${n}`);
    prev = r;
  }
});

test('calisthenics: weekly plan respects equipment, time, injuries and days', async () => {
  const { newCali, buildCaliWeek, buildCaliFieldWorkout, canDo } = await import('../js/engine/cali.js');
  for (const equip of [[], ['bar'], ['bar', 'pbars', 'rings', 'pole']]) {
    for (const days of [3, 4, 5, 6]) {
      for (const sessionMin of [45, 60, 90]) {
        const cali = newCali({ pushups: 30, pullups: 9, squats: 40, dips: 9, plankSec: 80 }, equip);
        const p = { track: 'cali', cali, days, sessionMin, goal: 'skill', injuries: [] };
        const week = buildWeek(p, {});
        assert.equal(week.sessions.length, days);
        assert.equal(new Set(week.sessions.map((s) => s.name)).size, days, 'session names are unique');
        for (const s of week.sessions) {
          assert.ok(s.items.length >= 4, `${equip}/${days}/${sessionMin} ${s.name}: ${s.items.length} items`);
          assert.equal(new Set(s.items.map((i) => i.exId)).size, s.items.length, 'no exercise twice in a session');
          for (const it of s.items) {
            assert.ok(canDo(it.exId, equip), `${it.exId} needs equipment the user lacks (${equip})`);
            assert.ok(it.sets >= 2 && it.reps[0] <= it.reps[1] && it.rest >= 45);
            assert.equal(it.unit === 'sec', EX[it.exId].type === 'time', `${it.exId} unit`);
          }
          assert.ok(s.warmup.length >= 3 && s.warmup.every((m) => EX[m.exId].warm));
          const strength = s.items.filter((i) => i.role !== 'skill');
          assert.ok(s.items.findIndex((i) => i.role !== 'skill') >= s.items.filter((i) => i.role === 'skill').length, 'skills come first');
          assert.ok(strength.length >= 3);
        }
        // גוף מלא: יש גם משיכה (או חתירה), גם דחיפה וגם רגליים
        if (days === 3) for (const s of week.sessions) {
          const pats = new Set(s.items.map((i) => EX[i.exId].pattern));
          assert.ok(pats.has('squat') || pats.has('lunge'), 'legs'); assert.ok(pats.has('push_h') || pats.has('push_v'), 'push'); assert.ok(pats.has('pull_v') || pats.has('pull_h'), 'pull');
        }
      }
    }
  }
  const cali = newCali({ pushups: 30, pullups: 9, squats: 40, dips: 9, plankSec: 80 }, ['bar', 'pbars']);
  const field = buildFieldWorkout({ track: 'cali', cali, days: 3, sessionMin: 60, goal: 'skill', injuries: [] });
  assert.ok(field.items.length >= 4 && field.items.every((i) => canDo(i.exId, [])), 'field workout needs no equipment');
  const hurt = buildWeek({ track: 'cali', cali, days: 3, sessionMin: 60, goal: 'skill', injuries: ['wrist', 'knee'] }, {});
  const banned = blockedSet({ track: 'cali', injuries: ['wrist', 'knee'] });
  for (const s of hurt.sessions) for (const it of s.items) assert.ok(!banned.has(it.exId), `${it.exId} is blocked by an injury`);
  // שבוע פריקה: פחות סטים
  const sets = (w) => w.sessions.reduce((a, s) => a + s.items.reduce((b, i) => b + i.sets, 0), 0);
  const p = { track: 'cali', cali, days: 3, sessionMin: 90, goal: 'skill', injuries: [] };
  assert.ok(sets(buildWeek(p, { weekInBlock: 3 })) < sets(buildWeek(p, { weekInBlock: 0 })));
});

test('calisthenics: moving up and down a ladder', async () => {
  const { newCali, rungState, applyCaliSession, toggleSkill, caliProgress } = await import('../js/engine/cali.js');
  const cali = newCali({ pushups: 22, pullups: 6, squats: 35, dips: 5, plankSec: 70 }, ['bar', 'pbars']);
  const S = (reps, n = 3, rpe = 8) => Array.from({ length: n }, () => ({ reps, rpe, done: true }));
  const sess = (exId, ladder, sets, extra = {}) => [{ exId, ladder, sets, planned: 3, target: [5, 8], ...extra }];
  // לא הגיע ליעד העליון → נשאר
  assert.deepEqual(applyCaliSession(cali, sess('pushup', 'push', S(7))), []);
  assert.equal(rungState(cali, 'push').rung.id, 'pushup');
  // סט אחד חסר → נשאר
  applyCaliSession(cali, sess('pushup', 'push', S(8, 2)));
  assert.equal(rungState(cali, 'push').rung.id, 'pushup');
  // הכול ביעד אבל "עד הקצה" → נשאר
  applyCaliSession(cali, sess('pushup', 'push', S(8, 3, 10)));
  assert.equal(rungState(cali, 'push').rung.id, 'pushup');
  // 3×8 נקי → עולה שלב
  const up = applyCaliSession(cali, sess('pushup', 'push', S(8)));
  assert.deepEqual(up.map((c) => [c.type, c.to]), [['up', 'diamond_pushup']]);
  assert.equal(rungState(cali, 'push').rung.id, 'diamond_pushup');
  // סט נפח (שלב מתחת) לא משפיע על הסולם
  assert.deepEqual(applyCaliSession(cali, sess('pushup', 'push', S(14), { vol: true })), []);
  // שני אימונים מתחת ליעד המינימום → יורד שלב
  assert.deepEqual(applyCaliSession(cali, sess('diamond_pushup', 'push', S(3))), []);
  const down = applyCaliSession(cali, sess('diamond_pushup', 'push', S(4)));
  assert.deepEqual(down.map((c) => [c.type, c.to]), [['down', 'pushup']]);
  // מיומנות: צריך פעמיים ברצף, ומינימום ימים בשלב
  const t0 = new Date(cali.since.lsit).getTime();
  const hold = () => sess('lsit_foot', 'lsit', S(30, 4), { planned: 4 });
  assert.equal(applyCaliSession(cali, hold(), t0 + 864e5)[0].type, 'almost');
  const gated = applyCaliSession(cali, hold(), t0 + 3 * 864e5)[0];
  assert.equal(gated.type, 'gated'); assert.equal(gated.daysLeft, 4);
  assert.equal(applyCaliSession(cali, hold(), t0 + 8 * 864e5)[0].type, 'up');
  assert.equal(rungState(cali, 'lsit').rung.id, 'lsit_tuck');
  // מיומנות נעולה לא נדלקת; פתוחה נדלקת ונכבית
  assert.equal(toggleSkill(cali, 'planche'), false);
  assert.equal(toggleSkill(cali, 'backlever'), true); assert.ok(cali.skills.includes('backlever'));
  assert.equal(toggleSkill(cali, 'backlever'), true); assert.ok(!cali.skills.includes('backlever'));
  const pr = caliProgress(cali);
  assert.ok(pr.strength > 0 && pr.strength < 100 && pr.skill > 0);
});

test('calisthenics: profile wiring — goals, nutrition, fitness score, suggestions', async () => {
  const { newCali } = await import('../js/engine/cali.js');
  const { goalsFor, goalForTrack, phaseFor } = await import('../js/engine/program.js');
  assert.deepEqual(goalsFor('cali'), ['skill', 'muscle', 'cut']);
  assert.equal(goalForTrack('combat', 'cali'), 'skill'); assert.equal(goalForTrack('skill', 'gym'), 'combat'); assert.equal(goalForTrack('cut', 'cali'), 'cut');
  const cali = newCali({ pushups: 22, pullups: 6, squats: 35, dips: 5, plankSec: 70 }, ['bar']);
  const p = { track: 'cali', cali, goal: 'skill', days: 3, sessionMin: 60, weightKg: 75, heightCm: 178, age: 24, sex: 'm', injuries: [] };
  assert.equal(phaseFor(p, 2).id, 'cali');
  const t = targets(p);
  assert.equal(t.delta, 0, 'skill goal = maintenance');
  const bulkCali = targets({ ...p, goal: 'muscle' }).delta, bulkGym = targets({ ...p, goal: 'muscle', track: 'gym' }).delta;
  assert.ok(bulkCali > 0 && bulkCali < bulkGym, 'smaller surplus in calisthenics');
  const cri = combatReadiness({ profile: p, history: {}, sessions: [], runs: [], weights: [] });
  assert.ok(cri.parts.strength > 0 && cri.parts.skill > 0 && cri.parts.endurance === null && cri.score > 0);
  // הצעת יעד לסט: מתחילים מהמינימום, מוסיפים חזרה, ונעצרים ביעד העליון; החזקה מתקדמת בשניות
  const item = { reps: [5, 8], ladder: 'push' };
  assert.equal(suggest('pushup', item, [], p).reps, 5);
  assert.equal(suggest('pushup', item, [{ sets: [{ reps: 6, done: true }] }], p).reps, 7);
  assert.equal(suggest('pushup', item, [{ sets: [{ reps: 12, done: true }] }], p).reps, 8);
  const hold = { reps: [30, 60], ladder: 'core', unit: 'sec' };
  assert.equal(suggest('plank', hold, [{ sets: [{ reps: 40, done: true }] }], p).reps, 45);
  assert.equal(suggest('plank', hold, [{ sets: [{ reps: 60, done: true }] }], p).reps, 60);
});
