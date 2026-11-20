// מסך פתיחה עם פתיח מוזיקלי (../assets/intro.mp3, כארבע שניות), פעם אחת בכל פתיחה של האפליקציה — לא בריענון אחרי עדכון.
// הפתיח מתנגן מהרגע שהאפליקציה עולה. דפדפנים (ובמיוחד אייפון) לא מרשים להשמיע צליל לפני נגיעה ראשונה במסך,
// ולכן: כשמותר — הצליל מתחיל מיד והמסך נסגר לבד; כשחסום — המסך מחכה להקשה אחת ("הקשה לכניסה"), והיא מפעילה את הצליל.
// מתנגן כ-<audio> רגיל, ולכן מכבד את מתג ההשתקה של הטלפון. אפשר לכבות בהגדרות (settings.introSound) — ואז אין מסך פתיחה.
import { get } from './store.js';

export function playIntro() {
  try { if (sessionStorage.getItem('intro_done')) return; sessionStorage.setItem('intro_done', '1'); } catch { /* */ }
  if (get().settings?.introSound === false) return;
  const name = document.title.split('·')[0].trim();
  const el = document.createElement('div');
  el.className = 'intro-splash'; el.setAttribute('role', 'button'); el.setAttribute('aria-label', `Enter${name}`);
  el.innerHTML = `<div class="is-in"><span class="is-ring"></span><img src="../assets/icons/icon-192.png" alt="" width="112" height="112"><b>${name}</b><small hidden>Tap to enter</small></div>`;
  document.body.append(el);
  const a = new Audio('../assets/intro.mp3');
  a.preload = 'auto'; a.volume = 0.85;
  let closed = false, started = false, t = 0;
  const close = () => { if (closed) return; closed = true; clearTimeout(t); el.classList.add('out'); setTimeout(() => el.remove(), 450); };
  const begun = (ms) => { started = true; el.classList.add('playing'); clearTimeout(t); t = setTimeout(close, ms); };
  el.addEventListener('pointerdown', () => {
    if (started) return close();              // כבר מתנגן: הקשה מדלגת
    a.play().then(() => begun(2600), close);  // חסום עד עכשיו: ההקשה מפעילה את הפתיח
  });
  a.play().then(() => begun(3000), () => {
    el.querySelector('small').hidden = false;
    t = setTimeout(close, 12000);             // מי שלא הקיש — נכנס בלי פתיח
  });
}
