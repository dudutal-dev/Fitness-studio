// מאגר מצב מרכזי עם שמירה אוטומטית ל-localStorage (כל שינוי + כל 3 שניות + ביציאה).
import { buildWeek } from './engine/program.js';
import { rankFor, XP, dayKey } from './engine/stats.js';

const KEY = 'fitness_studio_v1';
// אפליקציית LOHEM המקורית רצה באותו דומיין (GitHub Pages) ושומרת במפתח משלה — אפשר להמשיך ממנה (ראו importFromLohem)
const LOHEM_KEY = 'golani_fit_v1';

const DEFAULT = {
  profile: null,          // נקבע באונבורדינג
  plan: null,             // { startDate, blockIndex, weekInBlock, week, completedDays: [] }
  history: {},            // exId -> [{date, sets, target}]
  sessions: [],           // אימוני כוח שהושלמו
  runs: [],               // ריצות שהושלמו
  weights: [],            // [{date, kg}]
  daily: {},              // 'YYYY-MM-DD' -> { water, protein, checkin }
  xp: 0,
  events: [],             // התראות/הודעות מאמן אחרונות
  settings: { voice: true, volume: 0.9, tempoCount: true, captions: true, theme: 'dark', themeV: 4, units: 'kg' },
};

let state = load();
const subs = new Set();
let dirty = false;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const st = { ...structuredClone(DEFAULT), ...JSON.parse(raw) };
      // עיצוב v4: מעבר חד-פעמי לערכה הכהה החדשה; אפשר לשנות בהגדרות ← מראה
      if (st.settings && st.settings.themeV !== 4) { st.settings.theme = 'dark'; st.settings.themeV = 4; }
      return st;
    }
  } catch { /* מצב פרטי / חסום */ }
  return structuredClone(DEFAULT);
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify({ ...state, _savedAt: new Date().toISOString() })); dirty = false; } catch { /* ignore */ }
}

setInterval(() => dirty && save(), 3000);
addEventListener('beforeunload', save);
addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && save());

export const get = () => state;
export function set(fn) {
  const next = typeof fn === 'function' ? fn(structuredClone(state)) : { ...state, ...fn };
  state = next || state;
  dirty = true;
  save();
  subs.forEach((s) => s(state));
}
export const subscribe = (fn) => (subs.add(fn), () => subs.delete(fn));

// טקסט לפי מין המתאמן: g('צא', 'צאי')
export const g = (m, f) => (state.profile?.sex === 'f' ? f : m);

// תאריך מקומי (לא UTC) — אחרת היום מתחלף ב-02:00/03:00 בלילה שעון ישראל
export const today = () => dayKey();

export function daily(date = today()) {
  return { water: 0, protein: 0, checkin: null, ...state.daily[date] };   // גם רשומה חלקית (גיבוי ישן) מקבלת ברירות מחדל
}
export function setDaily(patch, date = today()) {
  set((s) => { s.daily[date] = { ...{ water: 0, protein: 0, checkin: null }, ...s.daily[date], ...patch }; return s; });
}

export function addXP(amount, reason) {
  const before = rankFor(state.xp).idx;
  set((s) => { s.xp += amount; return s; });
  const after = rankFor(state.xp);
  if (after.idx > before) pushEvent({ type: 'rank', text: `דרגה חדשה: ${after.name}!` });
  return { amount, reason, rankUp: after.idx > before ? after : null };
}

export function pushEvent(ev) {
  set((s) => { s.events = [{ ...ev, date: new Date().toISOString() }, ...s.events].slice(0, 30); return s; });
}

// ───── תוכנית ─────
export function createPlan(profile) {
  const week = buildWeek(profile, { blockIndex: 0, weekInBlock: 0 });
  return { startDate: today(), blockIndex: 0, weekInBlock: 0, week, completedDays: [], weekStart: today() };
}

export function regenerateWeek(s) {
  s.plan.week = buildWeek(s.profile, { blockIndex: s.plan.blockIndex, weekInBlock: s.plan.weekInBlock });
  return s;
}

export function exportData() {
  return JSON.stringify(state, null, 1);
}
// קובץ גיבוי נבדק לפני שהוא מחליף את מה שבטלפון (25.11.2026): פרופיל ותוכנית אמיתיים, ורשימות במקום שהאפליקציה מצפה לרשימות.
// קודם התקבל כל JSON עם מפתח profile — קובץ שגוי מחק את כל הנתונים או השאיר מסך ריק. מפתח שחסר בגיבוי ישן מתמלא מברירת המחדל, כמו בטעינה.
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
export function readBackup(json) {
  let data;
  try { data = JSON.parse(json); } catch { throw new Error('הקובץ אינו קובץ גיבוי תקין'); }
  const p = data?.profile, pl = data?.plan, bad = (m) => { throw new Error(m); };
  if (!isObj(data) || !('profile' in data)) bad('הקובץ אינו גיבוי של האפליקציה');
  if (!isObj(p) || typeof p.name !== 'string' || !p.name || !(Number(p.days) > 0)) bad('אין בקובץ פרופיל — אי אפשר לשחזר ממנו');
  if (!isObj(pl) || !Array.isArray(pl.week?.sessions) || !Array.isArray(pl.completedDays)) bad('אין בקובץ תוכנית אימונים — אי אפשר לשחזר ממנו');
  for (const k of ['sessions', 'runs', 'weights', 'events']) if (k in data && !(Array.isArray(data[k]) && data[k].every(isObj))) bad('הקובץ פגום — אי אפשר לשחזר ממנו');
  for (const k of ['history', 'daily', 'settings']) if (k in data && !isObj(data[k])) bad('הקובץ פגום — אי אפשר לשחזר ממנו');
  if ('xp' in data && !Number.isFinite(data.xp)) bad('הקובץ פגום — אי אפשר לשחזר ממנו');
  return data;
}
export function importData(json) {
  state = { ...structuredClone(DEFAULT), ...readBackup(json) };
  save();
  subs.forEach((s) => s(state));
}
// ───── המשך מאפליקציית LOHEM ─────
// מי שהתאמן ב-LOHEM (אותו דפדפן, אותו דומיין) יכול להעתיק לכאן את כל הנתונים. LOHEM עצמה לא משתנה.
export function lohemData() {
  try {
    const d = JSON.parse(localStorage.getItem(LOHEM_KEY) || 'null');
    return d && d.profile?.name && d.plan ? d : null;
  } catch { return null; }
}
export function importFromLohem() {
  const d = lohemData();
  if (!d) return false;
  state = { ...structuredClone(DEFAULT), ...d, importedFrom: 'lohem', importedAt: new Date().toISOString() };
  save();
  subs.forEach((s) => s(state));
  return true;
}

export function resetAll() {
  state = structuredClone(DEFAULT);
  save();
  subs.forEach((s) => s(state));
}

export { XP };
