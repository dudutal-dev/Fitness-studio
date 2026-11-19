// לוגיקת התזכורות (טהורה, נבדקת): אילו תזכורות צריך לשלוח עכשיו למנוי מסוים.
// sub: { tz, name, sex, coach, lastWorkout, sent:{}, settings:{ workout, water, weigh, comeback } }
const COACH = { ori: 'אורי', noa: 'נועה', maya: 'מאיה' };
const WINDOW = 5; // דקות — הקרון רץ כל 5 דקות

export function localNow(tz, now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz || 'Asia/Jerusalem', hourCycle: 'h23', weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    .formatToParts(now).map((p) => [p.type, p.value]));
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  return { date: `${parts.year}-${parts.month}-${parts.day}`, dow, min: Number(parts.hour) * 60 + Number(parts.minute) };
}

const toMin = (hhmm) => { const [h, m] = String(hhmm || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
const inWindow = (min, target) => min >= target && min < target + WINDOW;
const pick = (arr, seed) => arr[Math.abs(seed) % arr.length];

function texts(sub, seed) {
  const f = sub.sex === 'f';
  const n = sub.name ? `${sub.name}, ` : '';
  const coach = COACH[sub.coach] || 'המאמן';
  return {
    workout: pick([
      { title: `${coach}: האימון מחכה לך 💪`, body: `${n}${f ? 'מוכנה' : 'מוכן'}? משימת היום בתוכנית. ${f ? 'בואי' : 'בוא'} נעשה אותה יחד.` },
      { title: `${coach}: הגיע הזמן 🔥`, body: `${n}כל אימון מקרב ${f ? 'אותך' : 'אותך'} למטרה. ${f ? 'יאללה, צאי' : 'יאללה, צא'} לאימון!` },
      sub.coach === 'maya' ? { title: `${coach}: עוד שלב בסולם 🪜`, body: `${n}אימון קצר היום שווה יותר מאימון מושלם מחר.` }
      : { title: `${coach}: לוחמים לא מדלגים ⚔️`, body: `${n}רק ${f ? 'תתחילי' : 'תתחיל'} — אני אספור איתך כל חזרה.` },
    ], seed),
    water: pick([
      { title: '💧 הפסקת מים', body: `${n}כוס מים עכשיו. בשטח ובחום — לשתות לפני שצמאים.` },
      { title: '💧 שתייה', body: `${n}${f ? 'שתי' : 'שתה'} כוס מים ו${f ? 'סמני' : 'סמן'} באפליקציה.` },
    ], seed),
    weigh: { title: '⚖️ שקילה שבועית', body: `${n}בבוקר, אחרי שירותים ולפני אוכל — ${f ? 'עלי' : 'עלה'} על המשקל ו${f ? 'רשמי' : 'רשום'}.` },
    comeback: { title: `${coach}: חסר לי ${f ? 'אותך' : 'אותך'} 👀`, body: `${n}עברו כמה ימים מהאימון האחרון. אפילו אימון שטח קצר שומר על הרצף.` },
  };
}

export function dueReminders(sub, now = new Date()) {
  const s = sub.settings || {};
  const L = localNow(sub.tz, now);
  const sent = sub.sent || {};
  const out = [];
  const T = texts(sub, L.min + L.dow);
  const trainedToday = sub.lastWorkout && localNow(sub.tz, new Date(sub.lastWorkout)).date === L.date;
  if (s.workout?.on && (s.workout.days || []).includes(L.dow) && inWindow(L.min, toMin(s.workout.time)) && !trainedToday) {
    const key = `workout:${L.date}`;
    if (!sent[key]) out.push({ key, tag: 'workout', url: './#/home', ...T.workout });
  }
  if (s.water?.on) {
    const from = toMin(s.water.from || '09:00'), to = toMin(s.water.to || '21:00'), every = Math.max(60, s.water.every || 120);
    if (L.min >= from && L.min <= to && (L.min - from) % every < WINDOW) {
      const slot = Math.floor((L.min - from) / every);
      const key = `water:${L.date}:${slot}`;
      if (!sent[key]) out.push({ key, tag: 'water', url: './#/nutrition', ...T.water });
    }
  }
  if (s.weigh?.on && L.dow === Number(s.weigh.day ?? 5) && inWindow(L.min, toMin(s.weigh.time || '08:00'))) {
    const key = `weigh:${L.date}`;
    if (!sent[key]) out.push({ key, tag: 'weigh', url: './#/progress', ...T.weigh });
  }
  if (s.comeback?.on && sub.lastWorkout && inWindow(L.min, toMin('19:00'))) {
    const days = (now - new Date(sub.lastWorkout)) / 864e5;
    const key = `comeback:${L.date}`;
    const lastCb = Object.keys(sent).filter((k) => k.startsWith('comeback:')).sort().pop();
    const recent = lastCb && (new Date(L.date) - new Date(lastCb.slice(9))) / 864e5 < 2;
    if (days >= 3 && !sent[key] && !recent) out.push({ key, tag: 'comeback', url: './#/home', ...T.comeback });
  }
  return out;
}

// ניקוי סימוני "נשלח" ישנים (מעל 7 ימים)
export function pruneSent(sent, now = new Date()) {
  const cutoff = new Date(now - 7 * 864e5).toISOString().slice(0, 10);
  return Object.fromEntries(Object.entries(sent || {}).filter(([k]) => (k.split(':')[1] || '') >= cutoff));
}
