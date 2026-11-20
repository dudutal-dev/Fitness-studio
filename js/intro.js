// פתיח מוזיקלי קצר כשהאפליקציה עולה (assets/intro.mp3, כארבע שניות). פעם אחת בכל פתיחה — לא בריענון אחרי עדכון.
// דפדפנים (ובמיוחד אייפון) לא מרשים להשמיע צליל לפני נגיעה ראשונה במסך. לכן מנסים מיד, ואם זה נחסם —
// הפתיח מתנגן בנגיעה הראשונה, בתנאי שהיא קרתה בשניות הראשונות; אחרת מוותרים עליו.
// מתנגן כ-<audio> רגיל, ולכן מכבד את מתג ההשתקה של הטלפון. אפשר לכבות בהגדרות (settings.introSound).
import { get } from './store.js';

export function playIntro() {
  try { if (sessionStorage.getItem('intro_done')) return; sessionStorage.setItem('intro_done', '1'); } catch { /* */ }
  if (get().settings?.introSound === false) return;
  const a = new Audio('assets/intro.mp3');
  a.preload = 'auto'; a.volume = 0.8;
  const t0 = performance.now();
  a.play().catch(() => {
    const once = () => { removeEventListener('pointerdown', once, true); if (performance.now() - t0 < 8000) a.play().catch(() => {}); };
    addEventListener('pointerdown', once, { capture: true, passive: true });
  });
}
