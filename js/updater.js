// עדכון אוטומטי ברקע: בודק אם יש גרסה חדשה — בפתיחה, בכל חזרה לאפליקציה (גם כשהיא רק עלתה מהרקע), כשהרשת חוזרת,
// וכל 5 דקות כשהיא פתוחה — ומרענן לבד, בלי שהמשתמש צריך לסגור ולפתוח. אף פעם לא באמצע אימון או ריצה.
import { APP_VERSION } from './version.js';
import { toast } from './ui/dom.js';

const KEY = 'studio_updated_to';
let reg = null;
let pending = false;

const inSession = () => !!document.querySelector('.live');

function reloadNow(v) {
  try { sessionStorage.setItem(KEY, v || ''); } catch { /* */ }
  location.reload();
}

function applyWhenIdle(v) {
  if (pending) return;
  pending = true;
  const tryIt = () => { if (!inSession()) reloadNow(v); else setTimeout(tryIt, 5000); };
  tryIt();
}

let lastCheck = 0;
export async function checkForUpdate() {
  if (!navigator.onLine || Date.now() - lastCheck < 20000) return;   // לא יותר מפעם ב-20 שניות
  lastCheck = Date.now();
  try {
    reg?.update().catch(() => {});
    const r = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return;
    const { v } = await r.json();
    if (v && v !== APP_VERSION) {
      // הגנה מלולאה: אם כבר ניסינו לעבור לגרסה הזו ולא הצליח (השרת עוד לא סיים להתעדכן), מנסים שוב רק אחרי 3 דקות
      let tried = '';
      try { tried = sessionStorage.getItem(`${KEY}_try`) || ''; } catch { /* */ }
      const [tv, at] = tried.split('|');
      if (tv === v && Date.now() - Number(at) < 3 * 60 * 1000) return;
      try { sessionStorage.setItem(`${KEY}_try`, `${v}|${Date.now()}`); } catch { /* */ }
      applyWhenIdle(v);
    }
  } catch { /* אופליין / שגיאת רשת */ }
}

export function initUpdater() {
  // הודעה אחרי עדכון
  try {
    const to = sessionStorage.getItem(KEY);
    if (to && to === APP_VERSION) setTimeout(() => toast('האפליקציה עודכנה לגרסה החדשה'), 800);
    sessionStorage.removeItem(KEY);
  } catch { /* */ }

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((r) => { reg = r; }).catch(() => {});
    let first = !navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (first) { first = false; return; } // התקנה ראשונה — אין צורך לרענן
      applyWhenIdle(null);
    });
  }
  setTimeout(checkForUpdate, 2500);
  setInterval(checkForUpdate, 5 * 60 * 1000);
  // חזרה לאפליקציה בכל צורה: מהרקע, ממסך נעול, או מדף שנשמר בזיכרון (באייפון האפליקציה המותקנת כמעט אף פעם לא נטענת מחדש לבד)
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && checkForUpdate());
  addEventListener('pageshow', checkForUpdate);
  addEventListener('focus', checkForUpdate);
  addEventListener('online', checkForUpdate);
}
