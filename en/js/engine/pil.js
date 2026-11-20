// מנוע מסלול הפילאטיס (ליה): שיעורי מזרן לפי זמן — פתיחה בנשימה, רצף תרגילים איטי ומבוקר, וסיום באורך.
// profile.track === 'pil'. profile.pilMin = אורך השיעור (20 / 30 / 40 דקות). profile.level 1–3 = בסיס / ביניים / מתקדם.
// profile.pilFlags = שאלון הבטיחות (אותם מפתחות כמו במוביליטי). הכללים: docs/PILATES.md
// הפריטים רצים באימון החי באותו מנגנון של המוביליטי (role: 'mob'): לפי זמן, מעבר אוטומטי, בלי דירוג.
import { EX, EXERCISES } from '../data/exercises.js';
import { PIL_AREAS } from '../data/pil-exercises.js';

export const isPil = (profile) => profile?.track === 'pil';
export const PIL_MINUTES = [20, 30, 40];
export const PIL_LEVELS = ['', 'Basic', 'Intermediate', 'Advanced'];
export const pilLevel = (profile) => Math.min(3, Math.max(1, profile?.level || 1));
// נושאי השיעור: סדר האזורים שממנו נבחרים התרגילים, במחזוריות
export const PIL_THEMES = {
  pFull: { name: 'Full class', focus: 'Core · back · hips', areas: ['core', 'back', 'hips', 'core'] },
  pCore: { name: 'Core', focus: 'Deep abs and obliques', areas: ['core', 'core', 'back', 'core', 'hips'] },
  pBack: { name: 'Back & posture', focus: 'Spinal erectors, shoulder blades and length', areas: ['back', 'core', 'back', 'hips'] },
  pHips: { name: 'Hips & glutes', focus: 'Glutes, outer thigh and pelvic stability', areas: ['hips', 'core', 'hips', 'back'] },
};
const SPLIT = ['pFull', 'pCore', 'pBack', 'pHips', 'pFull', 'pCore'];

const PIL_INJ = {
  wrist: ['p_bird_dog', 'plank', 'p_side_plank', 'p_swan'],
  back: ['p_teaser', 'p_swan', 'p_swimming', 'p_double_leg', 'p_scissors'],
  shoulder: ['p_side_plank', 'plank', 'p_swan'],
  knee: ['child_pose', 'p_bird_dog', 'p_mermaid'],
};
const PIL_FLAG = {
  preg: ['p_hundred', 'p_single_leg', 'p_double_leg', 'p_scissors', 'p_teaser', 'p_swimming', 'p_swan', 'p_toe_taps', 'p_dead_bug', 'p_leg_circles', 'p_breathing', 'p_pelvic_curl', 'glute_bridge', 'plank'],
  osteo: ['p_hundred', 'p_single_leg', 'p_double_leg', 'p_scissors', 'p_teaser', 'p_spine_stretch'],
  joint: ['p_leg_circles', 'child_pose', 'p_mermaid', 'p_clam'],
  hyper: [],
};
export function pilBlocked(profile) {
  const s = new Set();
  for (const inj of profile?.injuries || []) for (const id of PIL_INJ[inj] || []) s.add(id);
  for (const f of profile?.pilFlags || []) for (const id of PIL_FLAG[f] || []) s.add(id);
  return s;
}

const POOL = () => EXERCISES.filter((e) => e.tracks.includes('pil') && e.area);
const GAP = 10;
const secsFor = (e) => (e.unilateral ? 60 : e.kind === 'static' ? 40 : 50);
const item = (e, secs = secsFor(e)) => ({ exId: e.id, role: 'mob', sets: 1, reps: [secs, secs], unit: 'sec', rest: GAP, rpe: 6, label: PIL_AREAS[e.area] });
const cost = (it) => it.sets * (it.reps[0] + GAP);

export function buildPilWorkout(tid, profile, { minutes = null, dayIdx = 0, blockIndex = 0, weekInBlock = 0 } = {}) {
  const theme = PIL_THEMES[tid] || PIL_THEMES.pFull;
  const level = pilLevel(profile), mins = minutes || profile.pilMin || 30;
  const blocked = pilBlocked(profile), rot = dayIdx + blockIndex * 4 + weekInBlock;
  const used = new Set();
  const ok = (e) => !blocked.has(e.id) && !used.has(e.id) && (e.level || 1) <= level;
  let left = mins * 60 - 15;
  const open = [], main = [], close = [];
  const put = (list, id, secs) => { const e = EX[id]; if (!e || !ok(e)) return; const it = item(e, secs); if (cost(it) > left) return; used.add(id); list.push(it); left -= cost(it); };
  put(open, 'p_breathing', 60); put(open, 'p_pelvic_curl');
  // הסיום שמור מראש, כדי שהרצף לא יאכל לו את הזמן
  const tail = [];
  put(tail, 'p_mermaid'); put(tail, 'child_pose', 40);
  // הרצף: עוברים על האזורים של הנושא במחזוריות; בכל אזור — התרגיל הבא שעוד לא נעשה
  const by = (area) => POOL().filter((e) => e.area === area && ok(e));
  for (let i = 0; i < 60 && left > 55; i++) {
    const area = theme.areas[i % theme.areas.length];
    let list = by(area);
    if (!list.length) { list = POOL().filter((e) => e.area !== 'flow' && ok(e)); if (!list.length) break; }
    const e = list[rot % list.length], it = item(e);
    if (cost(it) > left) { used.add(e.id); continue; }
    used.add(e.id); main.push(it); left -= cost(it);
  }
  // נגמרו התרגילים ונשאר זמן: סבב שני, מההתחלה של הרצף
  for (let pass = 0; pass < 2; pass++) for (const it of main) { const extra = it.reps[0] + GAP; if (it.sets < 3 && extra <= left) { it.sets += 1; left -= extra; } }
  close.push(...tail);
  const items = [...open, ...main, ...close];
  return { templateId: tid, name: theme.name, focus: theme.focus, phase: 'pil', track: 'pil', minutes: mins, items, warmup: [], cooldown: [] };
}

export function buildPilSessions(profile, n, opt = {}) {
  const sessions = SPLIT.slice(0, Math.min(6, Math.max(1, n))).map((tid, i) => buildPilWorkout(tid, profile, { ...opt, dayIdx: i }));
  const count = {}, seen = {};
  for (const s of sessions) count[s.name] = (count[s.name] || 0) + 1;
  for (const s of sessions) if (count[s.name] > 1) { seen[s.name] = (seen[s.name] || 0) + 1; s.name = `${s.name} ${'ABC'[seen[s.name] - 1]}`; }
  return sessions;
}
export function buildPilWeek(profile, { blockIndex = 0, weekInBlock = 0 } = {}) {
  const days = Math.min(6, Math.max(2, profile.days || 3));
  const sessions = buildPilSessions(profile, days, { blockIndex, weekInBlock }).map((w, i) => ({ day: i + 1, ...w }));
  return { blockIndex, weekInBlock, phase: PIL_PHASE, week: PIL_WEEKS[weekInBlock % 4], sessions };
}
export const PIL_PHASE = { id: 'pil', name: 'Mat Pilates', desc: 'Breathing and connecting to the core, a slow and precise sequence of exercises, and lengthening to finish. Quality of movement matters more than quantity.' };
export const PIL_WEEKS = [
  { name: 'Base week', rpe: 6, volume: 1, load: 1 }, { name: 'Build week', rpe: 6, volume: 1, load: 1 },
  { name: 'Deepening week', rpe: 7, volume: 1, load: 1 }, { name: 'Refinement week', rpe: 6, volume: 1, load: 1 },
];
// סוף בלוק: מי שהשלים לפחות 80% מהשיעורים עולה רמה (נפתחים תרגילים חדשים)
export function pilLevelUp(profile, sessions = [], now = Date.now()) {
  const done = sessions.filter((s) => s.track === 'pil' && !s.partial && now - new Date(s.date).getTime() < 28 * 864e5).length;
  return done >= Math.min(6, Math.max(2, profile.days || 3)) * 4 * 0.8 && pilLevel(profile) < 3;
}
