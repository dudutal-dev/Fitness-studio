// מנוע מסלול היוגה (יעל): שיעורים לפי זמן — פתיחה בנשימה, תנוחות עמידה ושיווי משקל, ירידה למזרן, וסיום בהרפיה.
// profile.track === 'yoga'. profile.yogaMin = אורך השיעור (20 / 30 / 45 דקות). profile.level 1–3 = מתחילים / ממשיכים / מתקדמים.
// profile.yogaFlags = שאלון הבטיחות (אותם מפתחות כמו במוביליטי). הכללים: docs/YOGA.md
// הפריטים רצים באימון החי באותו מנגנון של המוביליטי (role: 'mob'): לפי זמן, מעבר אוטומטי, בלי דירוג.
import { EX, EXERCISES } from '../data/exercises.js';
import { YOGA_AREAS } from '../data/yoga-exercises.js';

export const isYoga = (profile) => profile?.track === 'yoga';
export const YOGA_MINUTES = [20, 30, 45];
export const YOGA_LEVELS = ['', 'מתחילים', 'ממשיכים', 'מתקדמים'];
export const yogaLevel = (profile) => Math.min(3, Math.max(1, profile?.level || 1));
// נושאי השיעור: האזורים שמהם נבחרות התנוחות, במחזוריות. הסדר בשיעור עצמו תמיד: עמידה → שיווי משקל → מרכז → גב → ישיבה → פיתול
export const YOGA_THEMES = {
  yFull: { name: 'שיעור מלא', focus: 'עמידה · שיווי משקל · גב · ירכיים', areas: ['stand', 'stand', 'balance', 'back', 'floor', 'twist', 'core'] },
  yStand: { name: 'עמידה וכוח', focus: 'רגליים, מרכז ושיווי משקל', areas: ['stand', 'stand', 'balance', 'core', 'stand', 'back'] },
  yHips: { name: 'ירכיים וגמישות', focus: 'פתיחת ירכיים ואחורי הרגליים', areas: ['floor', 'stand', 'floor', 'twist', 'back'] },
  yBack: { name: 'גב וחזה', focus: 'פתיחת חזה, גב ופיתולים', areas: ['back', 'stand', 'back', 'twist', 'floor'] },
  yCalm: { name: 'שיעור רגוע', focus: 'תנוחות מזרן איטיות והרפיה ארוכה', areas: ['floor', 'twist', 'floor', 'back'], calm: true },
};
const SPLIT = ['yFull', 'yHips', 'yStand', 'yBack', 'yFull', 'yCalm'];
const ORDER = ['stand', 'balance', 'core', 'back', 'floor', 'twist'];

const YOGA_INJ = {
  wrist: ['y_down_dog', 'y_plank', 'y_crow', 'y_cat_cow', 'y_cobra'],
  shoulder: ['y_down_dog', 'y_plank', 'y_crow', 'y_bow'],
  back: ['y_bow', 'y_locust', 'y_boat', 'y_forward_fold', 'y_seated_fold', 'y_warrior3'],
  knee: ['y_pigeon', 'y_child', 'y_low_lunge', 'y_chair', 'y_bow', 'y_crow'],
};
const YOGA_FLAG = {
  // היריון: בלי שכיבה על הבטן, בלי פיתולים סגורים, בלי עבודת בטן חזקה, ובלי שכיבה ממושכת על הגב
  preg: ['y_cobra', 'y_locust', 'y_bow', 'y_boat', 'y_plank', 'y_crow', 'y_seated_twist', 'y_supine_twist', 'y_happy_baby', 'y_bridge', 'y_warrior3', 'y_savasana'],
  // אוסטאופורוזיס: בלי כפיפה עמוקה של עמוד השדרה ובלי פיתולים חזקים
  osteo: ['y_forward_fold', 'y_seated_fold', 'y_seated_twist', 'y_supine_twist', 'y_boat', 'y_happy_baby', 'y_cat_cow', 'y_child', 'y_crow'],
  joint: ['y_pigeon', 'y_butterfly', 'y_child', 'y_low_lunge', 'y_happy_baby', 'y_chair', 'y_crow', 'y_seated_twist', 'y_tree'],
  hyper: [],
};
export function yogaBlocked(profile) {
  const s = new Set();
  for (const inj of profile?.injuries || []) for (const id of YOGA_INJ[inj] || []) s.add(id);
  for (const f of profile?.yogaFlags || []) for (const id of YOGA_FLAG[f] || []) s.add(id);
  return s;
}

const POOL = () => EXERCISES.filter((e) => e.yoga && ORDER.includes(e.area));
const GAP = 8;
// החזקה: כחמש עד שמונה נשימות. תנוחה לשני הצדדים — אותו זמן לכל צד. גמישות־יתר: החזקות קצרות יותר
// שיעור רגוע: החזקות ארוכות (כמעט כפול), כמו ביוגה משקמת
const secsFor = (e, short, calm) => Math.round((e.unilateral ? 70 : e.kind === 'dynamic' ? 50 : 45) * (short ? 0.75 : 1) * (calm ? 1.8 : 1) / 5) * 5;
const item = (e, secs) => ({ exId: e.id, role: 'mob', sets: 1, reps: [secs, secs], unit: 'sec', rest: GAP, rpe: 5, label: YOGA_AREAS[e.area] });
const cost = (it) => it.sets * (it.reps[0] + GAP);

export function buildYogaWorkout(tid, profile, { minutes = null, dayIdx = 0, blockIndex = 0, weekInBlock = 0 } = {}) {
  const theme = YOGA_THEMES[tid] || YOGA_THEMES.yFull;
  const level = yogaLevel(profile), mins = Math.min(minutes || profile.yogaMin || 30, theme.calm ? 30 : 99);   // שיעור רגוע: עד 30 דקות
  const blocked = yogaBlocked(profile), rot = dayIdx + blockIndex * 4 + weekInBlock;
  const short = (profile.yogaFlags || []).includes('hyper');
  const used = new Set();
  const ok = (e) => !blocked.has(e.id) && !used.has(e.id) && (e.level || 1) <= level;
  let left = mins * 60 - 15;
  const open = [], main = [], tail = [];
  const put = (list, id, secs) => { const e = EX[id]; if (!e || !ok(e)) return; const it = item(e, secs ?? secsFor(e, short, theme.calm)); if (cost(it) > left) return; used.add(id); list.push(it); left -= cost(it); };
  // הסיום שמור מראש: פיתול בשכיבה והרפיה (ארוכה יותר בשיעור ארוך ובשיעור רגוע). בהיריון — הרפיה בשכיבה על הצד
  const rest = Math.min(240, Math.round(mins * (theme.calm ? 6 : 4.5) / 10) * 10);
  put(tail, 'y_supine_twist');
  put(tail, blocked.has('y_savasana') ? 'y_side_rest' : 'y_savasana', rest);
  put(open, 'y_breath', 60); put(open, 'y_cat_cow', 50); put(open, 'y_down_dog', 45);
  // הרצף: עוברים על האזורים של הנושא במחזוריות; בכל אזור — התנוחה הבאה שעוד לא נעשתה
  const by = (area) => POOL().filter((e) => e.area === area && ok(e));
  for (let i = 0; i < 60 && left > 55; i++) {
    const area = theme.areas[i % theme.areas.length];
    let list = by(area);
    if (!list.length) { list = POOL().filter((e) => ok(e) && (!theme.calm || !['stand', 'balance', 'core'].includes(e.area))); if (!list.length) break; }
    const e = list[rot % list.length], it = item(e, secsFor(e, short, theme.calm));
    if (cost(it) > left) { used.add(e.id); continue; }
    used.add(e.id); main.push(it); left -= cost(it);
  }
  // נגמרו התנוחות ונשאר זמן: חוזרים לכל תנוחה פעם נוספת
  for (const it of [...main.filter((x) => x.exId !== 'y_mountain'), ...main.filter((x) => x.exId === 'y_mountain')]) { const extra = it.reps[0] + GAP; if (it.sets < 2 && extra <= left) { it.sets += 1; left -= extra; } }
  main.sort((a, b) => ORDER.indexOf(EX[a.exId].area) - ORDER.indexOf(EX[b.exId].area));
  const items = [...open, ...main, ...tail];
  return { templateId: tid, name: theme.name, focus: theme.focus, phase: 'yoga', track: 'yoga', minutes: mins, items, warmup: [], cooldown: [] };
}

export function buildYogaSessions(profile, n, opt = {}) {
  const sessions = SPLIT.slice(0, Math.min(6, Math.max(1, n))).map((tid, i) => buildYogaWorkout(tid, profile, { ...opt, dayIdx: i }));
  const count = {}, seen = {};
  for (const s of sessions) count[s.name] = (count[s.name] || 0) + 1;
  for (const s of sessions) if (count[s.name] > 1) { seen[s.name] = (seen[s.name] || 0) + 1; s.name = `${s.name} ${'ABC'[seen[s.name] - 1]}`; }
  return sessions;
}
export function buildYogaWeek(profile, { blockIndex = 0, weekInBlock = 0 } = {}) {
  const days = Math.min(6, Math.max(2, profile.days || 3));
  const sessions = buildYogaSessions(profile, days, { blockIndex, weekInBlock }).map((w, i) => ({ day: i + 1, ...w }));
  return { blockIndex, weekInBlock, phase: YOGA_PHASE, week: YOGA_WEEKS[weekInBlock % 4], sessions };
}
export const YOGA_PHASE = { id: 'yoga', name: 'יוגה', desc: 'נשימה, תנוחות עמידה ושיווי משקל, ירידה למזרן וסיום בהרפיה. מחזיקים כל תנוחה כמה נשימות, בלי להגיע לכאב.' };
export const YOGA_WEEKS = [
  { name: 'שבוע בסיס', rpe: 5, volume: 1, load: 1 }, { name: 'שבוע בנייה', rpe: 5, volume: 1, load: 1 },
  { name: 'שבוע העמקה', rpe: 6, volume: 1, load: 1 }, { name: 'שבוע דיוק', rpe: 5, volume: 1, load: 1 },
];
// סוף בלוק: מי שהשלים לפחות 80% מהשיעורים עולה רמה (נפתחות תנוחות חדשות)
export function yogaLevelUp(profile, sessions = [], now = Date.now()) {
  const done = sessions.filter((s) => s.track === 'yoga' && !s.partial && now - new Date(s.date).getTime() < 28 * 864e5).length;
  return done >= Math.min(6, Math.max(2, profile.days || 3)) * 4 * 0.8 && yogaLevel(profile) < 3;
}
