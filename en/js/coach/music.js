// מוזיקת רקע לכל האימונים. רצועות מקוריות שנוצרו עבור האפליקציה (ElevenLabs Music; ההנחיות ב-tools/gen_music.sh).
// המוזיקה הולכת עם אופי התרגיל: לכל אופי יש מאגר רצועות, ובתוך המאגר הבחירה אקראית (בלי לחזור על מה שהתנגן לאחרונה).
//   warm — חימום · calm — מתיחות והרפיה · focus — מיומנות, שיווי משקל וליבה · power — כוח בחדר הכושר
//   groove — קליסתניקס (היפ־הופ) · high — HIIT וסיומת עצימה · run — ריצה · yoga / pil / mob / tai — שיעורים
// כשהתרגיל משתנה והאופי שלו אחר, המוזיקה דועכת ועוברת לרצועה מהמאגר החדש — אבל לא יותר מפעם ב-40 שניות.
// כבויה כברירת מחדל (settings.music). מתנגנת בשקט מתחת למאמן, ומנמיכה את עצמה כשהוא מדבר.
// הנגן הוא <audio> שמחובר למנוע ה-Web Audio של הקול — כך אפשר לשלוט בעוצמה גם באייפון (שם audio.volume לא ניתן לשינוי).
import { keptAlive } from './keepalive.js';
import { get } from '../store.js';
import { onSpeaking, audioCtx } from './voice.js';

const n = (k, to, from = 1) => Array.from({ length: to - from + 1 }, (_, i) => `${k}_${i + from}`);
const POOLS = {
  warm: [...n('warm', 3), 'cali_warm'],
  calm: [...n('calm', 2), 'cali_cool', 'mob_2'],
  focus: n('focus', 3),
  power: n('gym', 10),
  groove: n('cali', 9),
  high: n('hiit', 7),
  run: n('run', 9),
  walk: n('walk', 4),
  // מדיטציה בתנועה (אור): פסיכדלית רגועה ומרחפת לחימום ולהליכה האיטית, פסיכדלית קצבית למקטעים המהירים
  // הרצועות 4–6 הן הגרסה השנייה (25.11.2026, צליל נקי); 1–3 הוסרו אחרי שבעל המוצר שמע בהן רעשים. שמות חדשים — כדי שלא תישאר גרסה ישנה במטמון של הטלפון
  medcalm: n('medcalm', 6, 4),
  medbeat: n('medbeat', 6, 4),
  yoga: n('yoga', 4),
  tai: n('tai', 4),
  pil: n('pil', 4),
  mob: n('mob', 3),
};
// תאימות לאחור: מפתחות ישנים (סוג האימון) → אופי
const ALIAS = { gym: 'power', cali: 'groove', hiit: 'high' };
const moodKey = (m) => (POOLS[m] ? m : POOLS[ALIAS[m]] ? ALIAS[m] : null);

const FULL = 0.42, DUCK = 0.13, MIN_DWELL = 40000;
// קובץ שקט קצר: מתנגן מיד בתוך הנגיעה, כדי שאייפון ירשה לנגן אחר כך את הרצועה עצמה (שנטענת ברקע)
const SILENCE = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';

let el = null, gain = null, mood = null, now = null, offSpeak = null, urls = [], alive = false, speaking = false, upT = 0;
let lastSwitch = 0, pending = null, pendT = 0, token = 0;
const recent = [];   // הרצועות האחרונות שהתנגנו — לא חוזרים עליהן מיד

export const hasMusic = (m) => !!moodKey(m);
export const musicOn = () => get().settings.music === true;
export const musicPlaying = () => alive;
// לבדיקות: קפיצה לסוף הרצועה (כדי לבדוק את המעבר לרצועה הבאה), ומצב הנגן
export const musicSeekEnd = () => { if (el && el.duration) el.currentTime = el.duration - 1.5; };
export const musicState = () => ({ alive, paused: el ? el.paused : null, t: el ? el.currentTime : 0, track: now, mood, real: !!el && !!el.src && !el.src.startsWith('data:'), gain: gain ? gain.gain.value : null, speaking });

const level = () => (speaking ? DUCK : FULL) * Math.min(1, (get().settings.volume ?? 0.9) + 0.1);
function ramp(to, sec) {
  if (!el) return;
  const ctx = audioCtx();
  if (gain && ctx) { try { gain.gain.cancelScheduledValues(ctx.currentTime); gain.gain.setTargetAtTime(to, ctx.currentTime, sec / 3); } catch { /* */ } } else { try { el.volume = Math.max(0, Math.min(1, to)); } catch { /* */ } }
}
const setLevel = (sec = 0.4) => ramp(level(), sec);

// בחירה אקראית מהמאגר, בלי הרצועות שהתנגנו לאחרונה
function pick(m) {
  const pool = POOLS[m], fresh = pool.filter((t) => !recent.slice(-Math.min(4, pool.length - 1)).includes(t));
  const list = fresh.length ? fresh : pool;
  const t = list[Math.floor(Math.random() * list.length)];
  recent.push(t); if (recent.length > 8) recent.shift();
  return t;
}
async function load(name) {
  const res = await fetch(`../assets/music/${name}.mp3`);   // דרך ה-service worker: נשמר למטמון המדיה ועובד גם בלי רשת
  if (!res.ok) throw new Error('music ' + res.status);
  const u = URL.createObjectURL(await res.blob()); urls.push(u); if (urls.length > 3) URL.revokeObjectURL(urls.shift());
  return u;
}
// מנגן רצועה חדשה מהמאגר הנוכחי. fade: דעיכה קצרה של מה שמתנגן לפני ההחלפה
async function playNext(fade = false) {
  const mine = el, my = ++token, name = pick(mood);
  now = name;
  try {
    if (fade) ramp(0, 0.5);
    const [u] = await Promise.all([load(name), fade ? new Promise((r) => setTimeout(r, 650)) : null]);
    if (el !== mine || !alive || my !== token) return;
    el.src = u; ramp(0, 0.01);
    await el.play();
    setLevel(fade ? 1.2 : 0.6);
  } catch { /* אין רשת / נחסם: האימון ממשיך בלי מוזיקה */ }
}
const retry = () => { if (alive && el && el.paused && el.src && !el.src.startsWith('data:')) el.play().catch(() => {}); };
const onVis = () => { if (!el || !alive) return; if (document.visibilityState === 'hidden') { if (!keptAlive()) el.pause(); } else el.play().catch(() => {}); };

// חייב להיקרא מתוך נגיעה (התחלת האימון או כפתור המוזיקה). m: אופי התרגיל הנוכחי
export function startMusic(m) {
  const k = moodKey(m);
  if (!k || alive) return;
  mood = k; alive = true; speaking = false; lastSwitch = Date.now(); pending = null;
  el = new Audio(); el.preload = 'auto'; el.src = SILENCE;
  const ctx = audioCtx();
  gain = null;
  if (ctx) { try { const src = ctx.createMediaElementSource(el); gain = ctx.createGain(); gain.gain.value = 0; src.connect(gain); gain.connect(ctx.destination); } catch { gain = null; } }
  el.play().catch(() => {});
  el.addEventListener('ended', () => { if (alive && !el.src.startsWith('data:')) playNext(); });
  // מנמיכים מיד כשהמאמן מדבר, ומחזירים רק אחרי שקט של שנייה וחצי — כדי שספירת חזרות לא תגרום למוזיקה לעלות ולרדת בין מספר למספר
  offSpeak = onSpeaking((v) => {
    clearTimeout(upT);
    if (v) { speaking = true; setLevel(0.25); } else upT = setTimeout(() => { speaking = false; setLevel(1.2); }, 1500);
  });
  addEventListener('pointerdown', retry, { capture: true, passive: true });
  document.addEventListener('visibilitychange', onVis);
  playNext();
}

// התרגיל השתנה: אם האופי שלו אחר, עוברים למאגר המתאים (לא יותר מפעם ב-40 שניות — אחרת המוזיקה קופצת בין תרגילים קצרים)
export function setMusicMood(m) {
  const k = moodKey(m);
  if (!alive || !k) return;
  clearTimeout(pendT); pending = null;
  if (k === mood) return;
  const wait = MIN_DWELL - (Date.now() - lastSwitch);
  if (wait > 0) { pending = k; pendT = setTimeout(() => { if (alive && pending) { const p = pending; pending = null; setMusicMood(p); } }, wait); return; }
  mood = k; lastSwitch = Date.now();
  playNext(true);
}

export function stopMusic() {
  if (!alive) return;
  alive = false; offSpeak?.(); offSpeak = null; clearTimeout(upT); clearTimeout(pendT); pending = null; token++;
  removeEventListener('pointerdown', retry, { capture: true });
  document.removeEventListener('visibilitychange', onVis);
  const old = el, g = gain, ctx = audioCtx(), us = urls; el = null; gain = null; urls = []; now = null;
  // דעיכה קצרה, ואז עצירה ושחרור
  if (g && ctx) { try { g.gain.cancelScheduledValues(ctx.currentTime); g.gain.setTargetAtTime(0, ctx.currentTime, 0.25); } catch { /* */ } }
  setTimeout(() => { try { old.pause(); old.removeAttribute('src'); old.load(); } catch { /* */ } us.forEach((u) => URL.revokeObjectURL(u)); }, g ? 900 : 0);
}
