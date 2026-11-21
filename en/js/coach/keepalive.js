// מצב רקע באימון: האפליקציה ממשיכה לעבוד גם כשהמסך ננעל או כשעוברים לאפליקציה אחרת.
// דפדפנים עוצרים דף שלא משמיע כלום; רצועה שקטה שמתנגנת בלולאה משאירה את הדף חי — הטיימר ממשיך, והמאמן ממשיך לדבר
// (coach/voice.js עובר אז לנגן רגיל, כי מנוע האודיו הראשי נעצר ברקע באייפון). במסך הנעילה מוצג שם האימון עם כפתור השהיה.
// מה שלא אפשרי באפליקציית רשת: מיקום (GPS) לא מתקבל כשהמסך נעול — המרחק שנצבר בזמן הזה מושלם בקו ישר כשחוזרים.
import { backgroundVoice } from './voice.js';

let el = null, onToggle = null;
const onVis = () => { if (el && !document.hidden && el.paused) el.play().catch(() => {}); };
export const keptAlive = () => !!el;

// חייב להיקרא מתוך נגיעה (התחלת האימון). togglePause(v): השהיה / המשך מכפתורי מסך הנעילה
export function keepAlive({ title = '', artist = '', artwork = '', togglePause = null } = {}) {
  onToggle = togglePause;
  if (!el) {
    el = new Audio('../assets/silence.mp3'); el.loop = true; el.preload = 'auto';
    document.addEventListener('visibilitychange', onVis);
  }
  el.play().catch(() => {});
  backgroundVoice(true);
  try {
    const ms = navigator.mediaSession;
    ms.metadata = new MediaMetadata({ title, artist, artwork: artwork ? [{ src: artwork, sizes: '512x512' }] : [] });
    ms.playbackState = 'playing';
    // השהיה ממסך הנעילה משהה את האימון, אבל הרצועה השקטה ממשיכה — אחרת הדף נעצר ואי אפשר לחזור
    ms.setActionHandler('pause', () => { onToggle?.(true); ms.playbackState = 'paused'; });
    ms.setActionHandler('play', () => { el?.play().catch(() => {}); onToggle?.(false); ms.playbackState = 'playing'; });
  } catch { /* דפדפן בלי Media Session */ }
}
export function setKeepAliveState(paused) { try { navigator.mediaSession.playbackState = paused ? 'paused' : 'playing'; } catch { /* */ } }

export function releaseKeepAlive() {
  if (!el) return;
  document.removeEventListener('visibilitychange', onVis);
  try { el.pause(); el.removeAttribute('src'); el.load(); } catch { /* */ }
  el = null; onToggle = null;
  backgroundVoice(false);
  try { const ms = navigator.mediaSession; ms.metadata = null; ms.playbackState = 'none'; ms.setActionHandler('pause', null); ms.setActionHandler('play', null); } catch { /* */ }
}
