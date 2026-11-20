// מנוע מסלול הטאי צ'י (מיי): שיעורים לפי זמן — חימום קצר, עמידת פתיחה, התנועות של הרמה לפי סדר הצורה, ועמידת סיום.
// profile.track === 'tai'. profile.taiMin = אורך השיעור (15 / 20 / 30 דקות). profile.level 1–3 = יסודות / צורת שמונה / צורת עשרים וארבע.
// profile.taiFlags = שאלון הבטיחות (אותם מפתחות כמו במוביליטי). הכללים: docs/TAICHI.md
// הפריטים רצים באימון החי באותו מנגנון של המוביליטי (role: 'mob'): לפי זמן, מעבר אוטומטי, בלי דירוג.
import { EX } from '../data/exercises.js';
import { TAI_EXERCISES, TAI_AREAS, taiSecs } from '../data/tai-exercises.js';

export const isTai = (profile) => profile?.track === 'tai';
export const TAI_MINUTES = [15, 20, 30];
export const TAI_LEVELS = ['', 'יסודות', 'צורת שמונה', 'צורת עשרים וארבע'];
export const taiLevel = (profile) => Math.min(3, Math.max(1, profile?.level || 1));
// נושאי השיעור: מאילו אזורים נבחרות התנועות, במחזוריות. הסדר בשיעור עצמו תמיד סדר הצורה
export const TAI_THEMES = {
  tFull: { name: 'שיעור מלא', focus: 'עמידה · ידיים · צעדים', areas: ['hands', 'step', 'root'] },
  tHands: { name: 'ידיים רכות', focus: 'ידיים כעננים, זנב הציפור והעברת משקל', areas: ['hands', 'hands', 'root'] },
  tRoot: { name: 'יציבות ושיווי משקל', focus: 'עמידה על רגל אחת, ליד כיסא', areas: ['root', 'hands', 'root', 'step'] },
  tStep: { name: 'צעדים', focus: 'צעדים קטנים והעברת משקל', areas: ['step', 'hands', 'step', 'root'] },
};
const SPLIT = ['tFull', 'tHands', 'tRoot', 'tFull', 'tStep', 'tHands'];
const FORM = TAI_EXERCISES.map((e) => e.id);   // סדר הצורה = סדר הרשימה

// פציעות ומצבים: טאי צ'י עדין, ולכן מורידים רק צעדים עמוקים ועמידה על רגל אחת
const TAI_INJ = {
  knee: TAI_EXERCISES.filter((e) => (e.knee || 0) >= 2).map((e) => e.id),
  back: ['t_needle_sea_bottom', 't_warm_waist'],
  shoulder: ['t_strike_ears', 't_shuttle'],
  ankle: ['t_golden_rooster', 't_heel_kick', 't_warm_ankle'],
};
const TAI_FLAG = {
  preg: ['t_heel_kick', 't_golden_rooster', 't_needle_sea_bottom'],   // היריון: שיווי המשקל משתנה — בלי עמידה על רגל אחת
  osteo: ['t_needle_sea_bottom', 't_heel_kick', 't_warm_waist'],      // אוסטאופורוזיס: בלי כפיפה קדימה ובלי סיבובי גו; פחות סיכון לנפילה
  joint: ['t_heel_kick', 't_golden_rooster', 't_wild_horse', 't_repulse_monkey', 't_single_whip'],
  hyper: [],
};
export function taiBlocked(profile) {
  const s = new Set();
  for (const inj of profile?.injuries || []) for (const id of TAI_INJ[inj] || []) s.add(id);
  for (const f of profile?.taiFlags || []) for (const id of TAI_FLAG[f] || []) s.add(id);
  return s;
}

const GAP = 8, INTRO = 12;   // INTRO: הזמן שמיי מציגה את התנועה לפני שהשעון מתחיל
const item = (e) => ({ exId: e.id, role: 'mob', sets: 1, reps: [taiSecs(e), taiSecs(e)], unit: 'sec', rest: GAP, rpe: 3, label: TAI_AREAS[e.area] });
const cost = (it) => it.sets * (it.reps[0] + GAP) + INTRO;
export const taiSeconds = (w) => w.items.reduce((t, it) => t + cost(it), 0);

export function buildTaiWorkout(tid, profile, { minutes = null, dayIdx = 0, blockIndex = 0, weekInBlock = 0 } = {}) {
  const theme = TAI_THEMES[tid] || TAI_THEMES.tFull;
  const level = taiLevel(profile), mins = minutes || profile.taiMin || 20;
  const blocked = taiBlocked(profile), rot = dayIdx + blockIndex * 4 + weekInBlock;
  const used = new Set();
  const ok = (e) => !blocked.has(e.id) && !used.has(e.id) && (e.level || 1) <= level;
  let left = mins * 60 - 10;
  const open = [], main = [], tail = [];
  const put = (list, id) => { const e = EX[id]; if (!e || !ok(e)) return; const it = item(e); if (cost(it) > left) return; used.add(id); list.push(it); left -= cost(it); };
  put(tail, 't_closing');
  // חימום: בשיעור קצר שתי תנועות, אחרת שלוש. ואחריו תמיד עמידת הפתיחה
  for (const id of (mins <= 15 ? ['t_warm_ankle', 't_warm_shoulder'] : ['t_warm_ankle', 't_warm_waist', 't_warm_shoulder'])) put(open, id);
  put(open, 't_opening');
  const pool = () => TAI_EXERCISES.filter((e) => ['root', 'hands', 'step'].includes(e.area) && ok(e));
  for (let i = 0; i < 40 && left > 50; i++) {
    const area = theme.areas[i % theme.areas.length];
    let list = pool().filter((e) => e.area === area);
    if (!list.length) { list = pool(); if (!list.length) break; }
    // ברמה גבוהה התנועות החדשות קודמות; בתוך הרמה — מחזוריות
    const top = Math.max(...list.map((e) => e.level || 1)), pick = list.filter((e) => (e.level || 1) === top);
    const e = pick[rot % pick.length], it = item(e);
    used.add(e.id);
    if (cost(it) > left) continue;
    main.push(it); left -= cost(it);
  }
  // נגמרו התנועות ונשאר זמן: חוזרים על כל תנועה פעם נוספת
  for (const max of [2, 3]) for (const it of main) { const extra = it.reps[0] + GAP; if (it.sets < max && extra <= left) { it.sets += 1; left -= extra; } }
  main.sort((a, b) => FORM.indexOf(a.exId) - FORM.indexOf(b.exId));
  return { templateId: tid, name: theme.name, focus: theme.focus, phase: 'tai', track: 'tai', minutes: mins, items: [...open, ...main, ...tail], warmup: [], cooldown: [] };
}

export function buildTaiSessions(profile, n, opt = {}) {
  const sessions = SPLIT.slice(0, Math.min(6, Math.max(1, n))).map((tid, i) => buildTaiWorkout(tid, profile, { ...opt, dayIdx: i }));
  const count = {}, seen = {};
  for (const s of sessions) count[s.name] = (count[s.name] || 0) + 1;
  for (const s of sessions) if (count[s.name] > 1) { seen[s.name] = (seen[s.name] || 0) + 1; s.name = `${s.name} ${'ABC'[seen[s.name] - 1]}`; }
  return sessions;
}
export function buildTaiWeek(profile, { blockIndex = 0, weekInBlock = 0 } = {}) {
  const days = Math.min(6, Math.max(2, profile.days || 3));
  const sessions = buildTaiSessions(profile, days, { blockIndex, weekInBlock }).map((w, i) => ({ day: i + 1, ...w }));
  return { blockIndex, weekInBlock, phase: TAI_PHASE, week: TAI_WEEKS[weekInBlock % 4], sessions };
}
export const TAI_PHASE = { id: 'tai', name: 'טאי צ\'י', desc: 'חימום קצר, עמידת פתיחה, תנועות איטיות בעמידה גבוהה, ועמידת סיום. לאט, בצעדים קטנים, ובלי כאב.' };
export const TAI_WEEKS = [
  { name: 'שבוע בסיס', rpe: 3, volume: 1, load: 1 }, { name: 'שבוע בנייה', rpe: 3, volume: 1, load: 1 },
  { name: 'שבוע רצף', rpe: 4, volume: 1, load: 1 }, { name: 'שבוע דיוק', rpe: 3, volume: 1, load: 1 },
];
// סוף בלוק: מי שהשלים לפחות 80% מהשיעורים עולה רמה (נפתחות תנועות חדשות)
export function taiLevelUp(profile, sessions = [], now = Date.now()) {
  const done = sessions.filter((s) => s.track === 'tai' && !s.partial && now - new Date(s.date).getTime() < 28 * 864e5).length;
  return done >= Math.min(6, Math.max(2, profile.days || 3)) * 4 * 0.8 && taiLevel(profile) < 3;
}
