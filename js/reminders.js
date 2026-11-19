// תזכורות Push: הרשמה לשרת התזכורות (Cloudflare Worker), עדכון הגדרות, בדיקה, ודיווח על אימון שבוצע.
// השרת שולח תזכורות גם כשהאפליקציה סגורה. באייפון — רק כשהאפליקציה מותקנת במסך הבית (iOS 16.4+).
import { get, set } from './store.js';

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
export const reminders = () => get().reminders || { enabled: false, id: null, settings: defaultReminderSettings(get().profile) };

const b64uToBytes = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

function profilePart() {
  const s = get();
  const p = s.profile || {};
  const last = [...(s.sessions || []), ...(s.runs || [])].map((x) => x.date).sort().pop() || null;
  return { name: p.name || '', sex: p.sex || 'm', coach: p.coach || 'ori', tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jerusalem', lastWorkout: last };
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
  t = setTimeout(() => syncReminders().catch(() => {}), 800);
}

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
export function buildICS(settings, { name = '', coach = 'אורי' } = {}) {
  const pad = (n) => String(n).padStart(2, '0');
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const ev = [];
  const nextDate = (dow) => { const d = new Date(now); d.setDate(d.getDate() + ((dow - d.getDay() + 7) % 7)); return d; };
  const dt = (d, hhmm) => { const [h, m] = hhmm.split(':'); return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(h)}${pad(m)}00`; };
  const add = (uid, summary, desc, start, rrule, mins) => ev.push(['BEGIN:VEVENT', `UID:${uid}@lohem`, `DTSTAMP:${stamp}`, `DTSTART:${start}`, `DURATION:PT${mins}M`, `RRULE:${rrule}`, `SUMMARY:${summary}`, `DESCRIPTION:${desc}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${summary}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT'].join('\r\n'));
  if (settings.workout?.on && settings.workout.days?.length) {
    const first = Math.min(...settings.workout.days.map((d) => (d - now.getDay() + 7) % 7));
    const d = new Date(now); d.setDate(d.getDate() + first);
    add('workout', `💪 אימון בסטודיו כושר${name ? ` — ${name}` : ''}`, `${coach} מחכה לך באפליקציה. https://dudutal-dev.github.io/Fitness-studio/`, dt(d, settings.workout.time), `FREQ=WEEKLY;BYDAY=${settings.workout.days.map((x) => ICS_DAYS[x]).join(',')}`, 60);
  }
  if (settings.weigh?.on) add('weigh', '⚖️ שקילה שבועית', 'בבוקר, לפני אוכל — לרשום באפליקציה.', dt(nextDate(Number(settings.weigh.day)), settings.weigh.time), `FREQ=WEEKLY;BYDAY=${ICS_DAYS[Number(settings.weigh.day)]}`, 5);
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LOHEM//Reminders//HE', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:סטודיו כושר', ...ev, 'END:VCALENDAR'].join('\r\n');
}
