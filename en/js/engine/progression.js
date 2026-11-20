// מנוע ההתקדמות: המלצת משקל לכל תרגיל לפי היסטוריה, זיהוי שיאים, והתאמת רמה אוטומטית.
import { EX } from '../data/exercises.js';

// Epley: 1RM משוער
export const e1rm = (w, reps) => (reps <= 1 ? w : w * (1 + reps / 30));
// משקל לחזרות יעד עם RIR (חזרות ברזרבה)
export const weightFor = (oneRm, reps, rir = 2) => oneRm / (1 + (reps + rir) / 30);

export function roundLoad(w, ex) {
  const step = ex.inc >= 5 ? 2.5 : ex.inc >= 2 ? 1 : 0.5;
  // מוט אולימפי: מינימום 20 ק״ג
  const r = Math.max(step, Math.round(w / step) * step);
  return /barbell/i.test(ex.equip) && !/dumbbell/i.test(ex.equip) ? Math.max(20, r) : r;
}

// ───── הרמות ידועות (מההרשמה / ההגדרות) ─────
// profile.lifts: { bench_press | back_squat | deadlift: { w, reps } } — מה שהמתאמן יודע שהוא מרים.
// משמש רק למשקל הפתיחה של תרגיל שעוד אין לו היסטוריה; אחרי האימון הראשון ההיסטוריה קובעת.
export const ANCHOR_LIFTS = { bench_press: 'Bench press', back_squat: 'Squat', deadlift: 'Deadlift' };
const ANCHOR_FOR = { push_h: 'bench_press', push_v: 'bench_press', pull_h: 'bench_press', pull_v: 'bench_press', squat: 'back_squat', lunge: 'back_squat', hinge: 'deadlift' };
const validLift = (l) => l && l.w > 0 && l.w <= 400 && l.reps >= 1 && l.reps <= 30;

// איזו הרמה ידועה מייצגת את התרגיל: לפי תבנית התנועה, ואם אין — לפי קבוצת השרירים
function anchorFor(ex, lifts) {
  const upper = ['chest', 'shoulders', 'arms', 'back'].includes(ex.group);
  const order = [ANCHOR_FOR[ex.pattern], ex.group === 'legs' ? 'back_squat' : upper ? 'bench_press' : null,
    ex.group === 'legs' ? 'deadlift' : null].filter(Boolean);
  return order.find((k) => validLift(lifts?.[k])) || null;
}

// יחס בין הכוח שדווח לבין ברירת המחדל של הרמה (למשל 1.3 = חזק ב-30% מההנחה), תחום ל-0.5–2.2
export function strengthFactor(ex, profile) {
  const key = anchorFor(ex, profile.lifts);
  if (!key) return null;
  const l = profile.lifts[key], bw = profile.weightKg || 70;
  const tenRep = e1rm(l.w, l.reps) / (1 + 10 / 30);                    // המשקל המקביל ל-10 חזרות
  const assumed = bw * (EX[key].load?.[(profile.level || 1) - 1] ?? 0.5);
  return { key, factor: Math.min(2.2, Math.max(0.5, tenRep / assumed)) };
}

// השיא הטוב ביותר מתוך סשן
export function bestSet(sets) {
  let best = null;
  for (const s of sets || []) {
    if (!s.done || !s.reps) continue;
    const v = e1rm(s.w || 0, s.reps);
    if (!best || v > best.e1rm) best = { ...s, e1rm: v };
  }
  return best;
}

// history: [{date, sets:[{w,reps,rpe,done}], target:[lo,hi]}] — מהישן לחדש
export function suggest(exId, item, history, profile) {
  const ex = EX[exId];
  const [lo, hi] = item.reps;
  const adj = item.loadAdj || 1;
  const last = history?.length ? history[history.length - 1] : null;

  // קליסתניקס: אין משקל — מתקדמים בחזרות/שניות עד יעד השלב, ואז עולים שלב בסולם (engine/cali.js)
  const cali = profile?.track === 'cali' || !!item.ladder; // גם אימון קליסתניקס בתוך מסלול משולב
  if (cali && (ex.hold || (item.ladder && ex.type === 'time'))) {
    if (!last) return { reps: lo, w: 0, why: 'New step — start from the minimum target' };
    const best = Math.max(...last.sets.filter((s) => s.done).map((s) => s.reps), 0);
    const step = hi - lo >= 15 ? 5 : 2;
    if (best >= hi) return { reps: hi, w: 0, why: `Last time: ${best} sec — target reached` };
    return { reps: Math.min(hi, Math.max(lo, best >= lo ? best + step : lo)), w: 0, why: best ? `Last time: ${best} sec` : '' };
  }
  if (ex.type === 'bw') {
    if (!last) return { reps: lo, w: 0, why: cali ? 'New step — start from the minimum target' : 'Getting started — find your pace' };
    const best = Math.max(...last.sets.filter((s) => s.done).map((s) => s.reps), 0);
    if (cali && best >= hi) return { reps: hi, w: 0, why: `Last time: ${best} — target reached` };
    if (best >= hi + 3) return { reps: hi, w: 0, why: 'You\'ve got this! Consider adding weight (belt/vest)', addWeight: true };
    return { reps: Math.min(hi, Math.max(lo, best + 1)), w: 0, why: best ? `Last time: ${best} — one more!` : '' };
  }
  if (ex.type === 'time' || ex.type === 'cardio') {
    const base = ex.load ? roundLoad((profile.weightKg || 70) * ex.load[profile.level - 1], ex) : 0;
    if (!last) return { reps: lo, w: base, why: '' };
    const allDone = last.sets.every((s) => s.done && s.reps >= lo);
    return { reps: allDone ? Math.min(hi + 20, lo + 5) : lo, w: last.sets[0]?.w ?? base, why: allDone ? '+5 seconds from last time' : '' };
  }

  // תרגיל משקל
  if (!last) {
    const bw = profile.weightKg || 70;
    // התרגיל עצמו דווח בהרשמה → מחשבים ישירות מה-1RM המשוער שלו
    const own = profile.lifts?.[exId];
    if (validLift(own)) {
      return { reps: hi, w: roundLoad(weightFor(e1rm(own.w, own.reps), hi, 2) * adj, ex), why: `Based on what you reported: ${own.w} kg × ${own.reps}`, first: true };
    }
    // תרגיל אחר → ברירת המחדל של הרמה, מוכפלת ביחס הכוח שעולה מההרמה הקרובה שדווחה
    const sf = strengthFactor(ex, profile);
    const base10 = bw * (ex.load?.[profile.level - 1] ?? 0.3) * (sf?.factor ?? 1);
    const est1rm = e1rm(base10, 10);
    return { reps: hi, w: roundLoad(weightFor(est1rm, hi, 3) * adj, ex), first: true,
      why: sf ? `Starting weight based on the${ANCHOR_LIFTS[sf.key]} you reported — we'll calibrate after the first set` : 'A conservative starting weight — we\'ll calibrate after the first set' };
  }
  const done = last.sets.filter((s) => s.done);
  const lastW = Math.max(...done.map((s) => s.w || 0), 0);
  const sameRange = last.target && last.target[0] === lo && last.target[1] === hi;
  if (!sameRange) {
    // מעבר שלב (טווח חזרות חדש) → חישוב מחדש מ-1RM משוער
    const b = bestSet(last.sets);
    if (b) return { reps: lo, w: roundLoad(weightFor(b.e1rm, lo, 2) * adj, ex), why: 'New step — weight calculated from your 1RM' };
  }
  const allTop = done.length >= (last.sets.length || 1) && done.every((s) => s.reps >= hi);
  const avgRpe = done.reduce((t, s) => t + (s.rpe || 8), 0) / (done.length || 1);
  const missed = done.some((s) => s.reps < lo) || done.length < last.sets.length;
  if (allTop && avgRpe <= 8.5) return { reps: lo, w: roundLoad((lastW + ex.inc) * adj, ex), why: `You completed all the reps — moving up to${roundLoad(lastW + ex.inc, ex)} kg`, up: true };
  if (missed && avgRpe >= 9) return { reps: lo, w: roundLoad(lastW * 0.92 * adj, ex), why: 'That was too hard — drop a little and rebuild', down: true };
  const lastReps = Math.min(...done.map((s) => s.reps));
  return { reps: Math.min(hi, Math.max(lo, lastReps + 1)), w: roundLoad(lastW * adj, ex), why: 'Same weight — goal: one more rep in every set' };
}

// האם הסשן שבר שיא (1RM משוער)
export function isPR(exId, sets, history) {
  const b = bestSet(sets);
  if (!b || !b.w) return false;
  const prev = Math.max(0, ...(history || []).map((h) => bestSet(h.sets)?.e1rm || 0));
  return b.e1rm > prev * 1.001 && prev > 0;
}

// התאמת רמה בסוף בלוק
// stats: { planned, completed, progressed, tracked, avgRpe }
export function evaluateLevel(level, stats) {
  const adherence = stats.planned ? stats.completed / stats.planned : 0;
  const progress = stats.tracked ? stats.progressed / stats.tracked : 0;
  if (adherence >= 0.85 && progress >= 0.5 && stats.avgRpe <= 8.3 && level < 5) {
    return { level: level + 1, change: 1, msg: 'You hit your targets, made progress and seem to have more in you — moving up a level!' };
  }
  if ((adherence < 0.5 || stats.avgRpe >= 9.2) && level > 1) {
    return { level: level - 1, change: -1, msg: 'We\'ll go down one level to build a solid base. It\'s a smart step, not a setback.' };
  }
  return { level, change: 0, msg: 'Staying at this level — keep building.' };
}
