// סטטיסטיקת שימוש (החלטת בעל המוצר, 21.11.2026; רק ב-MOVA): אילו רכיבים של האפליקציה מופעלים — כדי לדעת מה באמת משמש.
// נשלחים רק **שמות ומונים**: מסך שנפתח, תחום שהתחילו או סיימו בו אימון, כפתור שנלחץ. שום תוכן לא נשלח —
// לא משקלים, לא חזרות, לא אוכל, לא מיקום ולא השם. אם יש קישור הפעלה, הדיווח נרשם גם אצל הקישור (מסך הניהול מציג "מה הפעיל").
// אפשר לכבות בהגדרות ("סטטיסטיקת שימוש"). הדיווח נצבר בטלפון ונשלח בקבוצות: דקה אחרי האירוע הראשון, וכשהאפליקציה יורדת לרקע.
import { APP_ID } from './app-id.js';
import { WORKER } from './reminders.js';
import { LANG } from './lang.js';
import { get } from './store.js';

const KEY = `${APP_ID}.use`;
const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
let buf = read(KEY) || {}, timer = null;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(buf)); } catch { /* מצב פרטי */ } };
const enabled = () => get().settings?.usage !== false;

export function track(name, n = 1) {
  if (!enabled() || !/^[a-z][a-z0-9:_-]{1,31}$/.test(name)) return;
  buf[name] = (buf[name] || 0) + n; save();
  timer ||= setTimeout(flush, 60000);
}

export function flush() {
  clearTimeout(timer); timer = null;
  const ev = buf; if (!Object.keys(ev).length || !enabled() || navigator.onLine === false) return;
  buf = {}; save();
  const lic = read(`${APP_ID}.lic`), dev = read(`${APP_ID}.dev`);
  // keepalive: הבקשה מסתיימת גם אם האפליקציה נסגרת באמצע. אם נכשלה — המונים חוזרים לתור ויישלחו בפעם הבאה
  fetch(`${WORKER}/lic/use`, { method: 'POST', keepalive: true, body: JSON.stringify({ app: APP_ID, ev, ...(lic?.id && dev ? { id: lic.id, dev } : {}) }) })
    .then((r) => { if (!r.ok) throw new Error('bad'); })
    .catch(() => { for (const [k, n] of Object.entries(ev)) buf[k] = (buf[k] || 0) + n; save(); });
}

// כפתורים שנספרים (לפי data-act), ושם האירוע של כל אחד
const ACTS = {
  share: 'feat:share', 'share-run': 'feat:share', 'route-img': 'feat:route-img', map: 'feat:map', music: 'feat:music', tv: 'feat:tv', pause: 'feat:pause',
  backup: 'feat:backup', garmin: 'feat:garmin', 'add-food': 'feat:add-food', weigh: 'feat:weigh', 'mob-test': 'feat:mob-test', 'quick-mob': 'feat:quick-mob',
  field: 'feat:field', swap: 'feat:swap', regen: 'feat:regen', shuffle: 'feat:shuffle', track: 'feat:track-sheet', guide: 'feat:guide', speak: 'feat:speak',
  'free-walk': 'feat:free-walk', med: 'feat:med', 'free-run': 'feat:free-run', notices: 'feat:notices', 'nut-on': 'feat:nut-on', 'nut-off': 'feat:nut-off', lang: 'feat:lang',
};
const SCREENS = ['home', 'plan', 'progress', 'nutrition', 'coach', 'guide'];

export function initUsage() {
  track(`lang:${LANG}`);
  const screen = () => { const r = (location.hash.replace('#/', '') || 'home').split('?')[0]; if (SCREENS.includes(r)) track(`screen:${r}`); };
  addEventListener('hashchange', screen); screen();
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('[data-act]')?.dataset.act; if (a && ACTS[a]) track(ACTS[a]);
    if (e.target.closest?.('[data-lang] button')) track('feat:lang');
  }, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  addEventListener('pagehide', flush);
}
