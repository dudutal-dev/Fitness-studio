// מדדים: מדד כשירות קרבית (CRI), דרגות XP, מפת שרירים שבועית, מגמת משקל.
import { EX } from '../data/exercises.js';
import { bestSet } from './progression.js';
import { isCali, hasCali, caliProgress } from './cali.js';
import { isMob, mobScore, mobTested } from './mob.js';

export const RANKS = [
  { xp: 0, name: 'מתחילים', icon: 'rank1' },
  { xp: 600, name: 'מתמידים', icon: 'medal' },
  { xp: 1800, name: 'ותיקים', icon: 'shield' },
  { xp: 4000, name: 'מתקדמים', icon: 'rank3' },
  { xp: 7500, name: 'נבחרת', icon: 'star' },
  { xp: 12000, name: 'אגדת הסטודיו', icon: 'crown' },
];

export function rankFor(xp) {
  let i = 0;
  while (i + 1 < RANKS.length && xp >= RANKS[i + 1].xp) i++;
  const cur = RANKS[i], next = RANKS[i + 1];
  const pct = next ? (xp - cur.xp) / (next.xp - cur.xp) : 1;
  return { ...cur, idx: i, next, pct };
}

export const XP = { workout: 120, run: 90, pr: 50, weight: 10, checkin: 10, water: 5, perfectWeek: 200 };

// מפתח יום לפי השעון המקומי (לא UTC — אחרת אימון ב-01:00 בלילה נרשם ליום הקודם). מקבל Date, חותמת זמן ISO או 'YYYY-MM-DD'.
export function dayKey(d = new Date()) {
  if (typeof d === 'string' && d.length === 10) return d;
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

// ימי רצף: ימים רצופים עם פעילות כלשהי (אימון/ריצה) מאפשרים יום מנוחה אחד בין אימונים
export function streak(sessions, today = new Date()) {
  const days = new Set(sessions.map((s) => dayKey(s.date)));
  let count = 0, gap = 0;
  const d = new Date(today);
  for (let i = 0; i < 120; i++) {
    const key = dayKey(d);
    if (days.has(key)) { count++; gap = 0; } else if (++gap > 2) break;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

// סטים לכל שריר בשבעת הימים האחרונים
export function muscleLoad(sessions, now = Date.now()) {
  const out = {};
  for (const s of sessions) {
    if (now - new Date(s.date).getTime() > 7 * 864e5) continue;
    for (const ex of s.exercises || []) {
      const e = EX[ex.exId];
      if (!e) continue;
      const n = (ex.sets || []).filter((x) => x.done).length;
      e.muscles.forEach((m, i) => { out[m] = (out[m] || 0) + n * (i === 0 ? 1 : 0.5); });
    }
  }
  return out;
}

// מגמת משקל (ממוצע נע מעריכי) — מסנן תנודות מים
export function weightTrend(entries, alpha = 0.25) {
  let ema = null;
  return entries.map((e) => { ema = ema == null ? e.kg : ema + alpha * (e.kg - ema); return { ...e, trend: Math.round(ema * 10) / 10 }; });
}

// מדד כשירות קרבית 0..100.
// רכיב שאין עליו נתונים מחזיר null (ולא מספר ברירת מחדל) — כדי שאחרי איפוס או בהתחלה לא יוצג "ציון" שלא נמדד.
// הציון הכולל מחושב רק מהרכיבים הידועים; בלי אף מדידה של כוח/סבולת/גוף — אין ציון.
export function combatReadiness({ profile, history, sessions, runs, weights }) {
  const bw = profile.weightKg || 70;
  // כוח יחסי: 1RM משוער ביחס למשקל גוף מול יעדי עילית
  const BENCH = { back_squat: 1.75, deadlift: 2.1, bench_press: 1.35, ohp: 0.8, leg_press: 3, lat_pulldown: 1.1, rdl: 1.6, incline_db_press: 0.45 };
  const ratios = [];
  for (const [id, goal] of Object.entries(BENCH)) {
    const h = history[id];
    if (!h?.length) continue;
    const best = Math.max(...h.slice(-6).map((x) => bestSet(x.sets)?.e1rm || 0));
    if (best) ratios.push(Math.min(1, best / bw / goal));
  }
  const pullHist = history.pullup;
  if (pullHist?.length) ratios.push(Math.min(1, Math.max(...pullHist.slice(-4).flatMap((x) => x.sets.map((s) => s.reps || 0))) / 18));
  // עוד אין היסטוריה? הרמות שדווחו בהרשמה נותנות הערכה ראשונה
  if (!ratios.length) {
    for (const [id, l] of Object.entries(profile.lifts || {})) {
      if (BENCH[id] && l?.w > 0 && l?.reps >= 1) ratios.push(Math.min(1, (l.reps <= 1 ? l.w : l.w * (1 + l.reps / 30)) / bw / BENCH[id]));
    }
  }
  let strength = ratios.length ? (ratios.reduce((a, b) => a + b, 0) / ratios.length) * 100 : null;
  // קליסתניקס: כוח = המיקום בסולמות הכוח, מיומנות = המיקום בסולמות המיומנויות הפעילות (במקום סבולת ריצה)
  // במסלול משולב: כוח = ממוצע של שני המדדים, וסבולת ומיומנות נמדדות שתיהן
  const cali = hasCali(profile) ? caliProgress(profile.cali) : null;
  const pureCali = isCali(profile);
  if (cali) strength = pureCali || strength == null ? cali.strength : (strength + cali.strength) / 2;

  // סבולת: זמן 3 ק״מ (10:30 = 100, 18:00 = 0)
  const tests = runs.filter((r) => r.type === 'test' && r.timeSec);
  const best3k = tests.length ? Math.min(...tests.map((r) => r.timeSec)) : profile.run3k;
  const endurance = (cali && pureCali) || isMob(profile) ? null : best3k ? Math.max(0, Math.min(100, ((18 * 60 - best3k) / (7.5 * 60)) * 100)) : null;
  let skill = cali ? cali.skill : null;
  // מוביליטי בלבד: הציון הוא ציון מבחן הטווחים (במקום כוח וסבולת)
  if (isMob(profile)) { strength = null; skill = mobTested(profile.mob) ? mobScore(profile.mob) : null; }

  // עקביות: אימונים ב-28 יום אחרונים מול מתוכנן
  const now = Date.now();
  const recent = [...sessions, ...runs].filter((s) => now - new Date(s.date).getTime() < 28 * 864e5).length;
  const planned = (profile.days || 4) * 4 + 2;
  const consistency = Math.min(100, (recent / planned) * 100);

  // גוף: התקרבות ליעד משקל
  let body = null;
  if (weights.length >= 2 && profile.targetWeight) {
    const start = weights[0].kg, cur = weights[weights.length - 1].kg, tgt = profile.targetWeight;
    const total = Math.abs(start - tgt) || 1;
    body = Math.max(0, Math.min(100, 50 + ((Math.abs(start - tgt) - Math.abs(cur - tgt)) / total) * 50));
  }
  // ממוצע משוקלל של הרכיבים הידועים בלבד. עקביות לבדה (0 בהתחלה) אינה מדידה של כושר.
  const W = { strength: 0.35, endurance: 0.3, skill: 0.3, consistency: 0.25, body: 0.1 };
  const parts = { strength, endurance, skill, consistency, body };
  const measured = strength != null || endurance != null || skill != null || body != null;
  let sum = 0, wsum = 0;
  for (const [k, v] of Object.entries(parts)) if (v != null) { sum += v * W[k]; wsum += W[k]; }
  const round = (v) => (v == null ? null : Math.round(v));
  return { score: measured ? Math.round(sum / wsum) : null, parts: { strength: round(strength), endurance: round(endurance), skill: round(skill), consistency: round(consistency), body: round(body) } };
}

// ציון מוכנות מצ׳ק־אין (1..5 לכל שאלה)
export function readinessScore({ sleep = 3, energy = 3, soreness = 3, stress = 3 }) {
  const v = (sleep + energy + (6 - soreness) + (6 - stress) - 4) / 16;
  return Math.round(v * 100) / 100;
}
