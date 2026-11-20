// מנוע מסלול ה-HIIT (ליה): אימוני אינטרוולים קצרים במשקל גוף — מעגל של 5–6 תרגילים, כמה סבבים.
// profile.track === 'hiit'. profile.hiitMin = אורך האימון (15 / 20 / 25 דקות). profile.hiitLow = בלי קפיצות.
// הרמה (profile.level 1–5) קובעת את יחס העבודה למנוחה. הכללים ומה מהם מבוסס מחקר: docs/HIIT.md
import { EX, EXERCISES } from '../data/exercises.js';
import { HIIT_WARM, HIIT_COOL } from '../data/hiit-exercises.js';

export const isHiit = (profile) => profile?.track === 'hiit';
// [שניות עבודה, שניות מנוחה] לפי רמה
export const HIIT_FORMAT = { 1: [30, 30], 2: [30, 30], 3: [40, 20], 4: [40, 20], 5: [45, 15] };
export const HIIT_MINUTES = [15, 20, 25];
// נושאי האימון: סדר הקטגוריות במעגל (דופק ורגליים לא ברצף פעמיים — כדי שהטכניקה לא תישבר)
export const HIIT_THEMES = {
  hFull: { name: 'Full body', focus: 'Legs · cardio · core · upper body', cats: ['legs', 'cardio', 'upper', 'core', 'cardio', 'legs'] },
  hLegs: { name: 'Legs & cardio', focus: 'Legs and glutes, with cardio bursts in between', cats: ['legs', 'cardio', 'legs', 'core', 'cardio', 'legs'] },
  hCore: { name: 'Core & cardio', focus: 'Abs, back and stability, with cardio bursts in between', cats: ['core', 'cardio', 'core', 'upper', 'cardio', 'core'] },
  hLow: { name: 'Easy cardio', focus: 'No jumping — an easy day between hard workouts', cats: ['cardio', 'legs', 'core', 'cardio', 'upper', 'legs'], easy: true },
};
// כמה אימונים קשים בשבוע: עד 3 (4 מרמה 4). שאר הימים — "אירובי קל", כדי שתהיה התאוששות בין אימון לאימון.
const WEEK = { 1: ['hFull'], 2: ['hFull', 'hLegs'], 3: ['hFull', 'hLegs', 'hCore'], 4: ['hFull', 'hLow', 'hLegs', 'hCore'], 5: ['hFull', 'hLow', 'hLegs', 'hLow', 'hCore'], 6: ['hFull', 'hLow', 'hLegs', 'hLow', 'hCore', 'hLow'] };
const WEEK_ADV = { 4: ['hFull', 'hLegs', 'hCore', 'hFull'], 5: ['hFull', 'hLegs', 'hLow', 'hCore', 'hFull'], 6: ['hFull', 'hLegs', 'hLow', 'hCore', 'hFull', 'hLow'] };

// פציעות → תרגילים שלא נכנסים. ברכיים: כל הקפיצות מוחלפות בגרסה בלי קפיצות (ראו lowImpact).
const HIIT_INJ = {
  knee: ['h_wall_sit', 'bw_lunge', 'h_reverse_lunge', 'h_jump_lunge'],
  back: ['h_russian_twist', 'burpee', 'h_bicycle'],
  shoulder: ['pushup', 'knee_pushup', 'h_plank_tap', 'h_plank_jack', 'burpee', 'inchworm', 'mountain_climber'],
  wrist: ['pushup', 'knee_pushup', 'plank', 'h_plank_tap', 'h_plank_jack', 'burpee', 'inchworm', 'mountain_climber'],
};
export function hiitBlocked(profile) {
  const s = new Set();
  for (const inj of profile?.injuries || []) for (const id of HIIT_INJ[inj] || []) s.add(id);
  return s;
}
export const lowImpact = (profile) => !!profile?.hiitLow || (profile?.injuries || []).includes('knee');

const POOL = () => EXERCISES.filter((e) => e.tracks.includes('hiit') && e.cat);
const WARM_SEC = 46, GAP_AFTER_WARM = 20;

export function buildHiitWorkout(tid, profile, { minutes = null, dayIdx = 0, blockIndex = 0, weekInBlock = 0, guided = true } = {}) {
  const theme = HIIT_THEMES[tid] || HIIT_THEMES.hFull;
  const level = Math.min(5, Math.max(1, profile.level || 2));
  const mins = minutes || profile.hiitMin || 20;
  const low = theme.easy || lowImpact(profile);
  const [work, rest] = theme.easy ? [30, 30] : HIIT_FORMAT[level];
  const blocked = hiitBlocked(profile);
  const rot = dayIdx + blockIndex * 4 + weekInBlock;
  const used = new Set();
  const ok = (e) => !blocked.has(e.id) && !used.has(e.id) && (e.level || 1) <= level + 1 && (!low || e.impact !== 'high');
  const n = mins <= 15 ? 5 : 6;
  const picks = [];
  theme.cats.slice(0, n).forEach((cat, i) => {
    let list = POOL().filter((e) => e.cat === cat && ok(e));
    // אימון רגיל: מעדיפים את התרגילים הקופצניים בקטגוריית הדופק; יום קל — רק בלי קפיצות
    if (!low && cat === 'cardio') { const hi = list.filter((e) => e.impact === 'high'); if (hi.length) list = hi; }
    if (!list.length) list = POOL().filter(ok);
    if (!list.length) return;
    const e = list[(rot + i) % list.length];
    used.add(e.id); picks.push(e);
  });
  const warm = guided ? HIIT_WARM.filter((id) => !blocked.has(id)).slice(0, 3) : [];
  const cool = guided ? HIIT_COOL.slice(rot % 2, (rot % 2) + 3) : [];
  const fixed = warm.length * WARM_SEC + (warm.length ? GAP_AFTER_WARM : 0) + cool.length * WARM_SEC;
  let rounds = Math.max(2, Math.floor((mins * 60 - fixed) / (picks.length * (work + rest))));
  if (weekInBlock % 4 === 3) rounds = Math.max(2, rounds - 1);   // שבוע רביעי: התאוששות
  const items = picks.map((e) => ({ exId: e.id, role: 'hiit', sets: rounds, reps: [work, work], unit: 'sec', rest, rpe: theme.easy ? 6 : 9, cat: e.cat }));
  return { templateId: tid, name: theme.name, focus: theme.focus, phase: 'hiit', track: 'hiit', minutes: mins, work, rest, rounds, easy: !!theme.easy, items,
    warmup: warm.map((exId) => ({ exId, secs: 40 })), cooldown: cool.map((exId) => ({ exId, secs: 40 })),
    ...(low && !theme.easy ? { note: 'No-jump version: same effort, less load on the joints.' } : {}) };
}

export function buildHiitSessions(profile, n, opt = {}) {
  const days = Math.min(6, Math.max(1, n));
  const split = ((profile.level || 2) >= 4 && WEEK_ADV[days]) || WEEK[days];
  const sessions = split.map((tid, i) => buildHiitWorkout(tid, profile, { ...opt, dayIdx: i }));
  const count = {}, seen = {};
  for (const s of sessions) count[s.name] = (count[s.name] || 0) + 1;
  for (const s of sessions) if (count[s.name] > 1) { seen[s.name] = (seen[s.name] || 0) + 1; s.name = `${s.name} ${'ABC'[seen[s.name] - 1]}`; }
  return sessions;
}
export function buildHiitWeek(profile, { blockIndex = 0, weekInBlock = 0 } = {}) {
  const days = Math.min(6, Math.max(3, profile.days || 3));
  const sessions = buildHiitSessions(profile, days, { blockIndex, weekInBlock }).map((w, i) => ({ day: i + 1, ...w }));
  return { blockIndex, weekInBlock, phase: HIIT_PHASE, week: HIIT_WEEKS[weekInBlock % 4], sessions };
}
export const HIIT_PHASE = { id: 'hiit', name: 'Intervals', desc: 'A circuit of five or six exercises: a hard work interval, a short rest, and on to the next exercise. A few rounds, and you\'re done.' };
export const HIIT_WEEKS = [
  { name: 'Base week', rpe: 8, volume: 1, load: 1 }, { name: 'Build week', rpe: 8.5, volume: 1, load: 1 },
  { name: 'Peak week', rpe: 9, volume: 1, load: 1 }, { name: 'Recovery week', rpe: 7, volume: 0.8, load: 1 },
];
// סוף בלוק: מי שהשלים לפחות 80% מהאימונים עולה רמה (יחס עבודה/מנוחה קשה יותר)
export function hiitLevelUp(profile, sessions = [], now = Date.now()) {
  const done = sessions.filter((s) => s.track === 'hiit' && !s.partial && now - new Date(s.date).getTime() < 28 * 864e5).length;
  const planned = Math.min(6, Math.max(3, profile.days || 3)) * 4;
  return done >= planned * 0.8 && (profile.level || 2) < 5;
}
// גרסה בלי קפיצות של תרגיל (להחלפה באמצע אימון)
export const lowAlt = (exId) => (EX[exId]?.impact === 'high' && EX[EX[exId].low] ? EX[exId].low : null);
