// תזכורות Push: הרשמה לשרת התזכורות (Cloudflare Worker), עדכון הגדרות, בדיקה, ודיווח על אימון שבוצע.
// השרת שולח תזכורות גם כשהאפליקציה סגורה. באייפון — רק כשהאפליקציה מותקנת במסך הבית (iOS 16.4+).
import { get, set } from './store.js';
import { APP_ID } from './app-id.js';

export const WORKER = (typeof window !== 'undefined' && window.__LOHEM_WORKER) || 'https://lohem-reminders.dudu-tal.workers.dev'; // ניתן לעקוף לבדיקות
const VAPID_PUBLIC = 'BKfwqeI-cB2O0RjGsdpnZ0cP9ObKW9DWhSufgftbnsaNYoeSOHul9gaS-_aoY979yKJoGCulUuIUm8qmo5cEg1w';

export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const needsInstall = () => isIOS() && !isStandalone();

const DAYS_BY_COUNT = { 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5] };
export function defaultReminderSettings(profile) {
  return {
    workout: { on: true, days: DAYS_BY_COUNT[profile?.days] || [0, 2, 4], time: '18:00' },
    water: { on: true, from: '09:00', to: '21:00', every: 120 },
    weigh: { on: true, day: 5, time: '08:00' },
    comeback: { on: true },
  };
}
// שעת האימון ביום מסוים: לכל יום אפשר שעה משלו (workout.times: { <יום 0–6>: 'HH:MM' }); אחרת השעה הכללית (workout.time)
export const workoutTime = (settings, dow) => settings?.workout?.times?.[dow] || settings?.workout?.time || '18:00';
// האם הגיע עכשיו זמן האימון — לתזכורת הקופצת באפליקציה: היום ברשימה, ועברו עד 30 דקות מהשעה שנקבעה
export function workoutDue(settings, now = new Date()) {
  const w = settings?.workout;
  if (!w?.on || !(w.days || []).includes(now.getDay())) return false;
  const [h, m] = workoutTime(settings, now.getDay()).split(':').map(Number), late = now.getHours() * 60 + now.getMinutes() - (h * 60 + (m || 0));
  return late >= 0 && late < 30;
}
export const reminders = () => get().reminders || { enabled: false, id: null, settings: defaultReminderSettings(get().profile) };

const b64uToBytes = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

function profilePart() {
  const s = get();
  const p = s.profile || {};
  const last = [...(s.sessions || []), ...(s.runs || [])].map((x) => x.date).sort().pop() || null;
  return { app: APP_ID, name: p.name || '', sex: p.sex || 'm', coach: p.coach || 'ori', tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jerusalem', lastWorkout: last };
}

async function post(path, body) {
  const r = await fetch(WORKER + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error || `HTTP ${r.status}`), { status: r.status });
  return data;
}

// הפעלה: חייב להיקרא מתוך לחיצה (בקשת הרשאה)
export async function enableReminders() {
  if (needsInstall()) throw new Error('install');
  if (!pushSupported()) throw new Error('unsupported');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('denied');
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToBytes(VAPID_PUBLIC) });
  const cur = reminders();
  const { id } = await post('/subscribe', { id: cur.id, subscription: sub.toJSON(), settings: cur.settings, ...profilePart() });
  set((s) => { s.reminders = { ...cur, id, enabled: true }; return s; });
  return id;
}

let t;
export function saveReminderSettings(settings) {
  set((s) => { s.reminders = { ...reminders(), settings }; return s; });
  clearTimeout(t);
  t = setTimeout(() => { syncReminders().catch(() => {}); if (reminders().calId) calendarFeed().catch(() => {}); }, 800);   // גם היומן שבשידור מתעדכן
}

// ───── יומן אימונים בשידור ─────
// הלוח (ימים ושעות בלבד) נשמר בשרת, והטלפון נרשם לכתובת שלו כיומן — כך כל שינוי כאן מגיע ליומן לבד, בלי להוסיף שוב.
// מחזיר את כתובת היומן (https). opts: { name, coach, mins } — לכותרת האירוע ולאורכו.
export async function calendarFeed(opts = {}) {
  const r = reminders(), last = get().calOpts || {}, o = { ...last, ...opts };
  // הכותרת והתיאור — באותו נוסח של הקובץ, אבל בלי השם (25.11.2026): השם לא נשלח לשרת, וכתובת היומן נקראת בלי הזדהות. השרת מקודד את הטקסט בעצמו.
  const { id } = await post('/cal/set', { id: r.calId || undefined, settings: { workout: r.settings.workout }, title: icsTitle(''), desc: icsDesc(o.coach), calName: ICS_NAME, mins: o.mins || 60 });
  set((s) => { s.reminders = { ...reminders(), calId: id }; s.calOpts = o; s.calNoName = 1; return s; });
  return `${WORKER}/cal/${id}.ics`;
}

// יומן שנרשם לפני 25.11.2026 נשמר בשרת עם השם בכותרת: נשלח מחדש פעם אחת, בלי השם
if (typeof window !== 'undefined') setTimeout(() => { if (reminders().calId && !get().calNoName && navigator.onLine) calendarFeed().catch(() => {}); }, 6000);

export async function syncReminders() {
  const r = reminders();
  if (!r.enabled || !r.id) return;
  try { await post('/update', { id: r.id, settings: r.settings, ...profilePart() }); }
  catch (e) { if (e.status === 404) set((s) => { s.reminders = { ...reminders(), enabled: false }; return s; }); throw e; }
}

export async function testReminder() {
  const r = reminders();
  return post('/test', { id: r.id });
}

export async function disableReminders() {
  const r = reminders();
  try { if (r.id) await post('/unsubscribe', { id: r.id }); } catch { /* */ }
  try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); await sub?.unsubscribe(); } catch { /* */ }
  set((s) => { s.reminders = { ...reminders(), enabled: false, id: null }; return s; });
}

// אחרי אימון/ריצה: השרת לא ישלח תזכורת אימון היום
export function pingWorkout() {
  const r = reminders();
  if (!r.enabled || !r.id) return;
  post('/ping', { id: r.id, lastWorkout: new Date().toISOString() }).catch(() => {});
}

// ───── חלופה בלי Push: קובץ לוח שנה (iCal) עם התראות ─────
const ICS_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const ICS_NAME = 'MOVA';
const icsTitle = (name) => `💪 אימון ב־MOVA${name ? ` — ${name}` : ''}`;
const icsDesc = (coach = 'אורי') => `${coach} מחכה לך באפליקציה. https://dudutal-dev.github.io/Fitness-studio/`;
// ערכי טקסט לפי RFC 5545: לוכסן הפוך, נקודה-פסיק, פסיק ושורה חדשה מקודדים (שם עם פסיק נכנס קודם לכותרת כמו שהוא)
export const icsEsc = (t) => String(t ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
// המזהה של כל אירוע, ה-PRODID ושם הקובץ כוללים את מזהה האפליקציה (25.11.2026): קודם שלוש האפליקציות יצרו אותם מזהים (…@lohem), ואירוע של אחת יכול היה להחליף ביומן אירוע של אחרת
export function buildICS(settings, { name = '', coach = 'אורי', mins = 60 } = {}) {
  const pad = (n) => String(n).padStart(2, '0');
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const ev = [];
  const nextDate = (dow) => { const d = new Date(now); d.setDate(d.getDate() + ((dow - d.getDay() + 7) % 7)); return d; };
  const dt = (d, hhmm) => { const [h, m] = hhmm.split(':'); return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(h)}${pad(m)}00`; };
  const add = (uid, title, text, start, rrule, mins, summary = icsEsc(title), desc = icsEsc(text)) => ev.push(['BEGIN:VEVENT', `UID:${uid}@${APP_ID}`, `DTSTAMP:${stamp}`, `DTSTART:${start}`, `DURATION:PT${mins}M`, `RRULE:${rrule}`, `SUMMARY:${summary}`, `DESCRIPTION:${desc}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${summary}`, 'TRIGGER:-PT15M', 'END:VALARM', 'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${summary}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT'].join('\r\n'));
  if (settings.workout?.on && settings.workout.days?.length) {
    // אירוע שבועי חוזר לכל שעה: ימים עם אותה שעה נכנסים לאירוע אחד
    const byTime = {};
    for (const day of settings.workout.days) (byTime[workoutTime(settings, day)] ||= []).push(day);
    for (const [time, ds] of Object.entries(byTime)) {
      const first = Math.min(...ds.map((x) => (x - now.getDay() + 7) % 7));
      const d = new Date(now); d.setDate(d.getDate() + first);
      add(`workout-${time.replace(':', '')}`, icsTitle(name), icsDesc(coach), dt(d, time), `FREQ=WEEKLY;BYDAY=${ds.map((x) => ICS_DAYS[x]).join(',')}`, mins);
    }
  }
  if (settings.weigh?.on) add('weigh', '⚖️ שקילה שבועית', 'בבוקר, לפני אוכל — לרשום באפליקציה.', dt(nextDate(Number(settings.weigh.day)), settings.weigh.time), `FREQ=WEEKLY;BYDAY=${ICS_DAYS[Number(settings.weigh.day)]}`, 5);
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//${APP_ID.toUpperCase()}//Reminders//HE`, 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${icsEsc(ICS_NAME)}`, ...ev, 'END:VCALENDAR'].join('\r\n');
}
