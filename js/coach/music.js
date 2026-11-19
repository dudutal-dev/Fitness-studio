// מוזיקת רקע לשיעורים (יוגה, פילאטיס, מוביליטי): רצועות מקוריות שנוצרו עבור האפליקציה (ElevenLabs Music; ההנחיות ב-tools/gen_music.sh).
// כבויה כברירת מחדל (settings.music). מתנגנת בשקט מתחת למאמנת, ומנמיכה את עצמה כשהיא מדברת.
// הנגן הוא <audio> שמחובר למנוע ה-Web Audio של הקול — כך אפשר לשלוט בעוצמה גם באייפון (שם audio.volume לא ניתן לשינוי).
import { get } from '../store.js';
import { onSpeaking, audioCtx } from './voice.js';

const TRACKS = { yoga: ['yoga_1', 'yoga_2'], pil: ['pil_1', 'pil_2'], mob: ['mob_2', 'mob_1'] };
const FULL = 0.42, DUCK = 0.13;
// קובץ שקט קצר: מתנגן מיד בתוך הנגיעה, כדי שאייפון ירשה לנגן אחר כך את הרצועה עצמה (שנטענת ברקע)
const SILENCE = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';

let el = null, gain = null, list = [], idx = 0, offSpeak = null, urls = [], alive = false, speaking = false;

export const hasMusic = (track) => !!TRACKS[track];
export const musicOn = () => get().settings.music === true;
export const musicPlaying = () => alive;
// לבדיקות: מצב הנגן
export const musicState = () => ({ alive, paused: el ? el.paused : null, t: el ? el.currentTime : 0, track: list[idx] || null, real: !!el && !!el.src && !el.src.startsWith('data:'), gain: gain ? gain.gain.value : null, speaking });

const level = () => (speaking ? DUCK : FULL) * Math.min(1, (get().settings.volume ?? 0.9) + 0.1);
function setLevel(sec = 0.4) {
  if (!el) return;
  const ctx = audioCtx();
  if (gain && ctx) { try { gain.gain.cancelScheduledValues(ctx.currentTime); gain.gain.setTargetAtTime(level(), ctx.currentTime, sec / 3); } catch { /* */ } } else { try { el.volume = level(); } catch { /* */ } }
}
async function load(i) {
  const res = await fetch(`assets/music/${list[i]}.mp3`);   // דרך ה-service worker: נשמר למטמון המדיה ועובד גם בלי רשת
  if (!res.ok) throw new Error('music ' + res.status);
  const u = URL.createObjectURL(await res.blob()); urls.push(u); return u;
}
async function playAt(i) {
  const mine = el;
  try {
    const u = await load(i);
    if (el !== mine || !alive) return;
    el.src = u; setLevel(0);
    await el.play();
  } catch { /* אין רשת / נחסם: האימון ממשיך בלי מוזיקה */ }
}
const retry = () => { if (alive && el && el.paused && el.src && !el.src.startsWith('data:')) el.play().catch(() => {}); };
const onVis = () => { if (!el || !alive) return; if (document.visibilityState === 'hidden') el.pause(); else el.play().catch(() => {}); };

// חייב להיקרא מתוך נגיעה (התחלת האימון או כפתור המוזיקה)
export function startMusic(track) {
  if (!TRACKS[track] || alive) return;
  list = TRACKS[track]; idx = new Date().getDate() % list.length; alive = true; speaking = false;
  el = new Audio(); el.preload = 'auto'; el.src = SILENCE;
  const ctx = audioCtx();
  gain = null;
  if (ctx) { try { const src = ctx.createMediaElementSource(el); gain = ctx.createGain(); gain.gain.value = 0; src.connect(gain); gain.connect(ctx.destination); } catch { gain = null; } }
  el.play().catch(() => {});
  el.addEventListener('ended', () => { if (!alive || el.src.startsWith('data:')) return; idx = (idx + 1) % list.length; playAt(idx); });
  offSpeak = onSpeaking((v) => { speaking = !!v; setLevel(v ? 0.25 : 1.2); });
  addEventListener('pointerdown', retry, { capture: true, passive: true });
  document.addEventListener('visibilitychange', onVis);
  playAt(idx);
}
export function stopMusic() {
  if (!alive) return;
  alive = false; offSpeak?.(); offSpeak = null;
  removeEventListener('pointerdown', retry, { capture: true });
  document.removeEventListener('visibilitychange', onVis);
  const old = el, g = gain, ctx = audioCtx(), us = urls; el = null; gain = null; urls = [];
  // דעיכה קצרה, ואז עצירה ושחרור
  if (g && ctx) { try { g.gain.cancelScheduledValues(ctx.currentTime); g.gain.setTargetAtTime(0, ctx.currentTime, 0.25); } catch { /* */ } }
  setTimeout(() => { try { old.pause(); old.removeAttribute('src'); old.load(); } catch { /* */ } us.forEach((u) => URL.revokeObjectURL(u)); }, g ? 900 : 0);
}
