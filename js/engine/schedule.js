// יומן האימונים של השבוע (בקשת בעל המוצר, 21.11.2026; בשלוש האפליקציות): מתי כל אימון פתוח מתוכנן, לפי הימים והשעות שהמתאמן קבע.
// אימון אפשר להזיז (תאריך ושעה אחרים) או לבטל לשבוע הזה; הכול נשמר בתוכנית עצמה (plan.sched) ומתאפס כשהשבוע מתחלף.
//   plan.sched = { wk: <מזהה השבוע>, moves: { <day>: { date: 'YYYY-MM-DD', time: 'HH:MM', from: <המועד הקבוע שממנו הוזז> } }, skipped: [<day>, …] }
// מודול טהור — בלי אחסון ובלי מסך, כדי שאפשר יהיה לבדוק אותו (tests/schedule.test.js).

const pad = (n) => String(n).padStart(2, '0');
export const dkey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const toMin = (hhmm) => { const [h, m] = String(hhmm || '').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
export const fromMin = (min) => `${pad(Math.floor(min / 60) % 24)}:${pad(Math.round(min) % 60)}`;

// מזהה השבוע: בלוק, שבוע, תאריך הפתיחה, ומבנה האימונים (מסלולים ומספר) — כך שהחלפת מסלול מאפסת הזזות וביטולים
export const weekKey = (plan) => [plan?.blockIndex ?? 0, plan?.weekInBlock ?? 0, plan?.weekStart ?? '', (plan?.week?.sessions || []).map((x) => x.track || 'x').join('-')].join('.');
// ההזזות והביטולים של השבוע הנוכחי; מה שנשמר לשבוע אחר — לא בתוקף
export function sched(plan) {
  const wk = weekKey(plan), c = plan?.sched;
  return c && c.wk === wk ? { wk, moves: c.moves || {}, skipped: c.skipped || [] } : { wk, moves: {}, skipped: [] };
}
// אימונים "סגורים" השבוע: בוצעו או בוטלו
export const closedDays = (plan) => new Set([...(plan?.completedDays || []), ...sched(plan).skipped]);
export const openSessions = (plan) => { const c = closedDays(plan); return (plan?.week?.sessions || []).filter((x) => !c.has(x.day)); };
export const skippedSessions = (plan) => { const sk = new Set(sched(plan).skipped), done = new Set(plan?.completedDays || []); return (plan?.week?.sessions || []).filter((x) => sk.has(x.day) && !done.has(x.day)); };
export const weekClosed = (plan) => !openSessions(plan).length;

// האם כבר התאמנו היום (אימון או ריצה שנשמרו)
export const trainedToday = (state, now = new Date()) => [...(state?.sessions || []), ...(state?.runs || [])].some((x) => new Date(x.date).toDateString() === now.toDateString());

const timeOf = (settings, dow) => settings?.workout?.times?.[dow] || settings?.workout?.time || '18:00';
// האם המתאמן קבע ימי אימון
export const hasSchedule = (settings) => !!(settings?.workout?.on && settings.workout.days?.length);

// האימונים הפתוחים, כל אחד עם התאריך והשעה שלו: אימון שהוזז — במועד שנבחר; השאר — לפי הסדר, בימי האימון הקרובים.
// trainedToday: כבר התאמנו היום, ולכן האימון הבא מתחיל ממחר. בלי ימים קבועים — הרשימה חוזרת בלי תאריכים.
export function upcoming(plan, settings, now = new Date(), trainedToday = false) {
  const sc = sched(plan), today = dkey(now), out = [], rest = [];
  for (const x of openSessions(plan)) {
    const m = sc.moves[x.day];
    if (m && m.date >= today) out.push({ session: x, date: m.date, time: m.time || '18:00', moved: true }); else rest.push(x);
  }
  if (hasSchedule(settings)) {
    // יום שכבר יש בו אימון שהוזז, ויום שאימון הוזז ממנו (from) — נשארים בלי אימון נוסף
    const days = settings.workout.days, taken = new Set([...out.map((o) => o.date), ...out.map((o) => sc.moves[o.session.day].from).filter(Boolean)]);
    for (let i = trainedToday ? 1 : 0, n = 0; n < rest.length && i < 35; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      if (!days.includes(d.getDay()) || taken.has(dkey(d))) continue;
      out.push({ session: rest[n++], date: dkey(d), time: timeOf(settings, d.getDay()) });
    }
  } else for (const x of rest) out.push({ session: x, date: null, time: null });
  const key = (o) => (o.date ? `${o.date} ${o.time}` : '9999');
  return out.map((o, i) => [o, i]).sort((a, b) => (key(a[0]) < key(b[0]) ? -1 : key(a[0]) > key(b[0]) ? 1 : a[1] - b[1])).map(([o]) => o);
}
export const nextPlanned = (plan, settings, now = new Date(), trainedToday = false) => upcoming(plan, settings, now, trainedToday)[0] || null;
// האימון שמתוכנן להיום (או null) — לתזונה ולמסך הבית
export const plannedToday = (plan, settings, now = new Date(), trainedToday = false) => upcoming(plan, settings, now, trainedToday).find((o) => o.date === dkey(now)) || null;

const DAY_FULL = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
// "היום ב-18:00" · "מחר ב-07:00" · "יום שלישי ב-18:00" · "יום שלישי 1.12 ב-18:00"
export function whenLabel(date, time, now = new Date()) {
  if (!date) return '';
  const d = fromKey(date), diff = Math.round((d - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 864e5);
  const day = diff === 0 ? 'היום' : diff === 1 ? 'מחר' : `יום ${DAY_FULL[d.getDay()]}${diff > 6 ? ` ${d.getDate()}.${d.getMonth() + 1}` : ''}`;
  return time ? `${day} ב-${time}` : day;
}
// שבעת הימים הקרובים, לבחירה כשמזיזים אימון
export function nextDays(now = new Date(), n = 7) {
  return Array.from({ length: n }, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i); return { date: dkey(d), dow: d.getDay(), label: whenLabel(dkey(d), '', now) }; });
}

// שינויים (על אובייקט התוכנית עצמו — קוראים להם מתוך set של האחסון)
const own = (plan) => (plan.sched = sched(plan));
// from: המועד הקבוע שממנו האימון הוזז — היום הזה נשאר פנוי
export function moveSession(plan, day, date, time, from = null) { const sc = own(plan); sc.moves = { ...sc.moves, [day]: { date, time, ...(sc.moves[day]?.from || from ? { from: sc.moves[day]?.from || from } : {}) } }; sc.skipped = sc.skipped.filter((x) => x !== day); return plan; }
export function skipSession(plan, day) { const sc = own(plan); if (!sc.skipped.includes(day)) sc.skipped = [...sc.skipped, day]; const { [day]: _drop, ...keep } = sc.moves; sc.moves = keep; return plan; }
export function restoreSession(plan, day) { const sc = own(plan); sc.skipped = sc.skipped.filter((x) => x !== day); return plan; }
export function unmoveSession(plan, day) { const sc = own(plan); const { [day]: _drop, ...keep } = sc.moves; sc.moves = keep; return plan; }
