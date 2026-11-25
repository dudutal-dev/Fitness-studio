// עריכה ומחיקה של אימונים וריצות — שומרת על עקביות בין רשימת האימונים, היסטוריית ההתקדמות (שממנה מחושבים משקלים ו-1RM),
// ימי התוכנית שסומנו כבוצעו, נקודות XP ורמת הריצה.
import { EX } from '../data/exercises.js';
import { runLevelFrom3k } from './running.js';
import { dayKey, XP } from './stats.js';

const RUN_XP = 90;
// שורה שבוצעה לפי זמן (25.11.2026): לפי היחידה שנשמרה באימון (unit: 'sec' — גם תרגיל חזרות שבוצע בשניות, כמו ב-HIIT); ברשומות ישנות בלי יחידה — לפי סוג התרגיל
export const isTimed = (e) => e.unit === 'sec' || ['time', 'cardio'].includes(EX[e.exId]?.type);
// כמה XP נתנה הרשומה (25.11.2026): מה שנשמר עליה (xp); ברשומה ישנה בלי השדה — לפי מה שידוע ממנה:
// מדיטציית בוקר / לילה נתנה 60% כשהושלמה (האורך אז בדיוק 15 / 20 / 30 דקות) ו-30% כשנעצרה; אימון — 120 ועוד 50 לכל שיא שנרשם בו
export const sessionXP = (s) => s.xp ?? (s.still ? Math.round(XP.workout * ([900, 1200, 1800].includes(s.durationSec) ? 0.6 : 0.3)) : XP.workout + (s.prs?.length || 0) * XP.pr);

// רשומת היסטוריה שייכת לאימון: לפי מזהה, או (לאימונים ישנים בלי מזהה) לפי זמן קרוב
export function belongs(entry, session) {
  if (entry.sid && session.id) return entry.sid === session.id;
  return Math.abs(new Date(entry.date) - new Date(session.date)) < 120000;
}

function recompute(session) {
  let volume = 0, setsDone = 0;
  for (const ex of session.exercises || []) {
    const timed = isTimed(ex);
    for (const st of ex.sets) { setsDone++; if (!timed) volume += (st.w || 0) * (st.reps || 0); }
  }
  session.volume = Math.round(volume);
  session.setsDone = setsDone;
}

function stripHistory(state, session, exIds) {
  for (const id of exIds) {
    const h = state.history[id];
    if (!h) continue;
    state.history[id] = h.filter((e) => !belongs(e, session));
    if (!state.history[id].length) delete state.history[id];
  }
}

// edited: עותק ערוך של האימון ({ date, exercises:[{exId, role, sets:[{w,reps,rpe,done}], target}] })
export function updateSession(state, index, edited) {
  const old = state.sessions[index];
  if (!old) return state;
  const id = old.id || `s_${new Date(old.date).getTime()}`;
  const oldIds = (old.exercises || []).map((e) => e.exId);
  stripHistory(state, old, oldIds);
  const next = { ...old, ...edited, id };
  next.exercises = (next.exercises || []).map((e) => ({ ...e, sets: e.sets.filter((st) => st.reps > 0).map((st) => ({ ...st, done: true })) })).filter((e) => e.sets.length);
  recompute(next);
  for (const e of next.exercises) {
    // אותן רשומות שהאימון החי כותב (views/workout.js): בלי סיומת, מוביליטי / שיעורים ו-HIIT — אחרת שמירה בעורך מוסיפה אותם להיסטוריית הכוח
    if (e.role === 'finisher' || e.role === 'mob' || e.role === 'hiit' || e.role === 'warmup' || e.role === 'cooldown') continue;
    (state.history[e.exId] ||= []).push({ date: next.date, sid: id, sets: e.sets, target: e.target });
    state.history[e.exId].sort((a, b) => a.date.localeCompare(b.date));
  }
  state.sessions[index] = next;
  state.sessions.sort((a, b) => a.date.localeCompare(b.date));
  return state;
}

export function deleteSession(state, index) {
  const s = state.sessions[index];
  if (!s) return state;
  stripHistory(state, s, (s.exercises || []).map((e) => e.exId));
  state.sessions.splice(index, 1);
  // אם האימון היה מהשבוע הנוכחי — היום חוזר להיות "לא בוצע"
  if (s.day != null && state.plan && !s.partial && dayKey(s.date) >= (state.plan.weekStart || '')) {
    state.plan.completedDays = state.plan.completedDays.filter((d) => d !== s.day);
  }
  state.xp = Math.max(0, (state.xp || 0) - sessionXP(s));
  return state;
}

function syncRunLevel(state) {
  const tests = state.runs.filter((r) => r.type === 'test' && r.timeSec).sort((a, b) => a.date.localeCompare(b.date));
  if (tests.length) {
    state.profile.run3k = tests[tests.length - 1].timeSec;
    state.profile.runLevel = runLevelFrom3k(state.profile.run3k);
  }
}

export function updateRun(state, index, edited) {
  if (!state.runs[index]) return state;
  state.runs[index] = { ...state.runs[index], ...edited };
  state.runs.sort((a, b) => a.date.localeCompare(b.date));
  syncRunLevel(state);
  return state;
}

export function deleteRun(state, index) {
  if (!state.runs[index]) return state;
  const [r] = state.runs.splice(index, 1);
  syncRunLevel(state);
  // ריצה / הליכה מהשבוע הנוכחי שסימנה יום בתוכנית (25.11.2026): היום חוזר להיות "לא בוצע", כמו במחיקת אימון —
  // אלא אם נשאר אימון אחר מהשבוע הזה על אותו יום. אימון חופשי ואימון שנשמר חלקית לא סימנו יום, ולכן לא נוגעים.
  const wk = state.plan?.weekStart || '', inWk = (x) => x.day === r.day && !x.partial && dayKey(x.date) >= wk;
  const marked = r.planDay || ['run', 'walk', 'med'].includes(state.profile?.track);   // רק במסלולי ריצה / הליכה, או כתחום נוסף, ריצה מסמנת יום
  if (marked && r.day != null && state.plan && r.type !== 'free' && !r.partial && dayKey(r.date) >= wk && !state.runs.some((x) => x.type !== 'free' && inWk(x)) && !(state.sessions || []).some(inWk)) {
    state.plan.completedDays = (state.plan.completedDays || []).filter((d) => d !== r.day);
  }
  // הנקודות שהריצה נתנה (25.11.2026): מה שנשמר עליה (xp — כולל שיא במבדק); ברשומה ישנה בלי השדה — 90, כמו קודם
  state.xp = Math.max(0, (state.xp || 0) - (r.xp ?? RUN_XP));
  return state;
}
