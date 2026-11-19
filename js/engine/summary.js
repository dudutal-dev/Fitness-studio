// סיכום שבועי: 7 הימים האחרונים (כולל היום) מול 7 הימים שלפניהם — אימונים, נפח, שיאים, ריצה, תזונה מול היעד ומשקל.
import { dayKey } from './stats.js';
import { dayTotals, targets } from './nutrition.js';

const DAY = 864e5;
const keysBack = (now, from, to) => Array.from({ length: to - from }, (_, i) => dayKey(new Date(now - (from + i) * DAY)));

function windowStats(state, keys) {
  const inWin = new Set(keys);
  const sessions = (state.sessions || []).filter((s) => inWin.has(dayKey(s.date)));
  const runs = (state.runs || []).filter((r) => inWin.has(dayKey(r.date)));
  const custom = state.profile?.customFoods || [];
  const logged = keys.map((k) => state.daily?.[k]).filter((d) => d && (d.foods?.length || d.protein));
  const tot = logged.map((d) => dayTotals(d, custom));
  const avg = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);
  const waterDays = keys.map((k) => state.daily?.[k]?.water || 0).filter((w) => w > 0);
  return {
    workouts: sessions.length,
    runs: runs.length,
    activeDays: new Set([...sessions, ...runs].map((x) => dayKey(x.date))).size,
    minutes: Math.round([...sessions, ...runs].reduce((a, x) => a + (x.durationSec || 0), 0) / 60),
    volume: Math.round(sessions.reduce((a, s) => a + (s.volume || 0), 0)),
    prs: sessions.reduce((a, s) => a + (s.prs?.length || 0), 0),
    sets: sessions.reduce((a, s) => a + (s.setsDone || 0), 0),
    ups: sessions.reduce((a, s) => a + (s.ups || 0), 0), // קליסתניקס: עליות שלב בסולמות
    runKm: Math.round(runs.reduce((a, r) => a + (r.distanceKm || 0), 0) * 10) / 10,
    foodDays: logged.length,
    kcal: avg(tot.map((t) => t.kcal)),
    protein: avg(tot.map((t) => t.p)),
    waterL: waterDays.length ? Math.round(waterDays.reduce((a, b) => a + b, 0) / waterDays.length / 100) / 10 : null,
  };
}

export function weekSummary(state, now = Date.now()) {
  const cur = windowStats(state, keysBack(now, 0, 7));
  const prev = windowStats(state, keysBack(now, 7, 14));
  // מסלול ריצה: הריצות הן האימונים של התוכנית
  if (state.profile?.track === 'run') { cur.workouts += cur.runs; prev.workouts += prev.runs; }
  const t = targets(state.profile || {});
  // משקל: השקילה האחרונה בשבוע מול האחרונה שלפניו
  const ws = [...(state.weights || [])].sort((a, b) => a.date.localeCompare(b.date));
  const startKey = dayKey(new Date(now - 6 * DAY));
  const last = ws.filter((w) => w.date >= startKey).pop() || null;
  const before = ws.filter((w) => w.date < startKey).pop() || null;
  const weight = last ? { kg: last.kg, delta: before ? Math.round((last.kg - before.kg) * 10) / 10 : null } : null;
  const planned = state.plan?.week?.sessions?.length || state.profile?.days || 0;
  // שורה אחת של מסקנה — הדבר הכי חשוב לשבוע הבא
  let verdict;
  if (!cur.workouts && !cur.runs) verdict = 'לא נרשמו אימונים השבוע. אימון אחד קצר מחזיר את הרצף.';
  else if (planned && cur.workouts < planned - 1) verdict = `${cur.workouts} מתוך ${planned} אימונים. עקביות היא מה שבונה כושר — לנסות להוסיף אחד בשבוע הבא.`;
  else if (cur.foodDays >= 3 && cur.protein != null && cur.protein < t.protein * 0.8) verdict = `החלבון הממוצע (${cur.protein} ג׳) נמוך מהיעד (${t.protein} ג׳). להוסיף מנת חלבון אחת ביום.`;
  else if (cur.ups) verdict = `${cur.ups === 1 ? 'עלייה אחת בסולם' : `${cur.ups} עליות בסולמות`} השבוע. ממשיכים באותו קצב.`;
  else if (cur.prs) verdict = `${cur.prs === 1 ? 'שיא אישי אחד' : `${cur.prs} שיאים אישיים`} השבוע. ממשיכים באותו קצב.`;
  else verdict = 'שבוע יציב. ממשיכים לפי התוכנית.';
  return { cur, prev, targets: { kcal: t.kcal, protein: t.protein, waterL: t.waterL }, weight, planned, verdict };
}
