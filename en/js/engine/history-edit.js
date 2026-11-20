// עריכה ומחיקה של אימונים וריצות — שומרת על עקביות בין רשימת האימונים, היסטוריית ההתקדמות (שממנה מחושבים משקלים ו-1RM),
// ימי התוכנית שסומנו כבוצעו, נקודות XP ורמת הריצה.
import { EX } from '../data/exercises.js';
import { runLevelFrom3k } from './running.js';
import { dayKey } from './stats.js';

const WORKOUT_XP = 120, RUN_XP = 90;

// רשומת היסטוריה שייכת לאימון: לפי מזהה, או (לאימונים ישנים בלי מזהה) לפי זמן קרוב
export function belongs(entry, session) {
  if (entry.sid && session.id) return entry.sid === session.id;
  return Math.abs(new Date(entry.date) - new Date(session.date)) < 120000;
}

function recompute(session) {
  let volume = 0, setsDone = 0;
  for (const ex of session.exercises || []) {
    const timed = ['time', 'cardio'].includes(EX[ex.exId]?.type);
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
    if (e.role === 'finisher' || e.role === 'warmup' || e.role === 'cooldown') continue;
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
  state.xp = Math.max(0, (state.xp || 0) - WORKOUT_XP);
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
  state.runs.splice(index, 1);
  syncRunLevel(state);
  state.xp = Math.max(0, (state.xp || 0) - RUN_XP);
  return state;
}
