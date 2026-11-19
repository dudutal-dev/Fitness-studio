// עדכון אוטומטי: בודק אם יש גרסה חדשה (בפתיחה, בחזרה לאפליקציה, וכל 15 דק׳) ומרענן לבד —
// אף פעם לא באמצע אימון או ריצה.
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

export async function checkForUpdate() {
  if (!navigator.onLine) return;
  try {
    reg?.update().catch(() => {});
    const r = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return;
    const { v } = await r.json();
    if (v && v !== APP_VERSION) {
      // הגנה מלולאה: אם כבר ניסינו לעבור לגרסה הזו ולא הצליח, לא מנסים שוב באותה הפעלה
      let tried = null;
      try { tried = sessionStorage.getItem(`${KEY}_try`); } catch { /* */ }
      if (tried === v) return;
      try { sessionStorage.setItem(`${KEY}_try`, v); } catch { /* */ }
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
  setInterval(checkForUpdate, 15 * 60 * 1000);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && checkForUpdate());
  addEventListener('online', checkForUpdate);
}
