// מתי כל משפט־הקשר נכון (לוגיקה בלבד, בלי אחסון — כדי שאפשר לבדוק אותה). ראו js/coach/context.js
const DAY = 864e5;

// כל הפעילויות שנשמרו (אימונים וריצות / הליכות), מהישנה לחדשה
const acts = (s) => [
  ...(s.sessions || []).map((x) => ({ t: new Date(x.date).getTime(), prs: x.prs?.length || 0, rpe: Math.max(0, ...(x.exercises || []).flatMap((e) => (e.sets || []).map((y) => y.rpe || 0))) })),
  ...(s.runs || []).map((r) => ({ t: new Date(r.date).getTime(), prs: 0, rpe: r.rpe || 0 })),
].filter((a) => a.t).sort((a, b) => a.t - b.t);

// אילו הקשרים נכונים עכשיו בפתיחת אימון, לפי סדר החשיבות. now / hour: לבדיקות
export function startContexts(s, now = Date.now(), hour = new Date(now).getHours()) {
  const list = acts(s), last = list[list.length - 1], out = [];
  const total = s.plan?.week?.sessions?.length || 0, done = s.plan?.completedDays?.length || 0;
  if (!list.length) out.push('ctx_first');
  else {
    if (now - last.t >= 7 * DAY) out.push('ctx_back');
    if (total >= 2 && done === total - 1) out.push('ctx_weeklast');
    else if (total > 3 && done === 2) out.push('ctx_third');
    if (last.prs && now - last.t < 7 * DAY) out.push('ctx_after_pr');
    else if (last.rpe >= 10 && now - last.t < 4 * DAY) out.push('ctx_after_hard');
  }
  if (hour < 7 && hour >= 4) out.push('ctx_early'); else if (hour >= 21 || hour < 2) out.push('ctx_late');
  return out;
}
// אילו הקשרים נכונים בסיום. partial: האימון נעצר באמצע; weekDone: השבוע נסגר עכשיו; durSec / plannedMin: אורך האימון מול המתוכנן
// plus: 1 כשהאימון הנוכחי עוד לא נשמר (ריצה / הליכה נשמרת רק אחרי הדירוג)
export function endContexts(s, { partial = false, weekDone = false, durSec = 0, plannedMin = 0, plus = 0 } = {}) {
  const n = (s.sessions?.length || 0) + (s.runs?.length || 0) + plus, out = [];
  if (partial) return ['ctx_short'];
  if (n === 100) out.push('ctx_n100'); else if (n === 50) out.push('ctx_n50'); else if (n === 10) out.push('ctx_n10');
  if (weekDone) out.push('ctx_week_done');
  if (durSec >= 45 * 60 && plannedMin && durSec >= plannedMin * 60 * 1.3) out.push('ctx_long');
  return out;
}
