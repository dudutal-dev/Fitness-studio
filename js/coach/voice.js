// קול המאמן — מנוע Web Audio:
// • נפתח פעם אחת בנגיעה (חובה באייפון) ואז כל הקליפים מתנגנים בלי חסימות — גם אחרי "שלוש".
// • קליפים נטענים ומפוענחים לזיכרון מראש → אפס השהיה, תזמון מדויק לחזרות.
// • שני סוגי השמעה: רגילה (תור, משפטים ישנים נזרקים) ו"קריטית" (ספירה/טמפו — קוטעת הכל ומתנגנת מיד).
// • גיבוי: HTMLAudio אם אין Web Audio, ו-Web Speech לטקסט דינמי.
import { get } from '../store.js';
import { lineFor, nameLine, femaleLine, NAME_SWAP } from '../data/voice-lines.js';
import { nameEntry } from '../data/names.js';
import { VOICE_TIMING } from '../data/voice-timing.js';

const listeners = new Set();
export const onSpeaking = (fn) => (listeners.add(fn), () => listeners.delete(fn));
const emit = (v, text) => listeners.forEach((f) => f(v, text));

// המאמן שמדבר עכשיו: בדרך כלל המאמן שבפרופיל; במסלול משולב כל אימון מפעיל את המאמן שלו (useCoach)
let activeCoach = null;
export const useCoach = (id) => { activeCoach = id || null; };
export const coachId = () => activeCoach || get().profile?.coach || 'ori';
export const clipUrl = (clip, coach = coachId()) => `assets/voice/${coach}/${clip}.mp3`;
export const clipDur = (clip, coach = coachId()) => VOICE_TIMING[`${coach}/${clip}`] ?? 1;

let ctx = null, gain = null;
const buffers = new Map(); // url -> Promise<AudioBuffer|null>
const htmlCache = new Map();
let queue = [];
let current = null; // { src|audio, entry }
const log = (window.__voiceLog = window.__voiceLog || []);

// ───── פתיחת אודיו (בתוך נגיעה) ─────
export function unlock() {
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback'; // אייפון: להשמיע גם כשהמתג על שקט
  } catch { /* */ }
  if (!AC) return;
  if (!ctx) newContext();
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  // באפר שקט — "פותח" את האודיו בספארי
  try { const b = ctx.createBuffer(1, 1, 22050); const s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch { /* */ }
}
export const audioReady = () => !!ctx && ctx.state === 'running';
export const audioCtx = () => (ctx && ctx.state !== 'closed' ? ctx : null);   // למוזיקת הרקע (coach/music.js)

// ───── התאוששות: הקול חוזר לבד אחרי שהאפליקציה הייתה ברקע ─────
// באייפון מנוע האודיו נעצר כשהמסך ננעל, כשעוברים לאפליקציה אחרת או כשנכנסת שיחה, ואפשר להמשיך אותו רק מתוך נגיעה.
// בלי הטיפול הזה הקליפ הבא "מתנגן" אל מנוע עצור, לא מסתיים אף פעם, וכל התור נתקע עד שסוגרים ופותחים את האפליקציה.
const AC = window.AudioContext || window.webkitAudioContext;
function newContext() {
  ctx = new AC();
  gain = ctx.createGain();
  gain.connect(ctx.destination);
  const mine = ctx;
  ctx.onstatechange = () => { if (ctx === mine && ctx.state === 'running' && !current && queue.length) next(); };
}
// כל נגיעה במסך מחזירה את המנוע לפעולה אם נעצר (זו הדרך היחידה שאייפון מרשה)
function wake() {
  if (!ctx) return;
  if (ctx.state === 'closed') newContext();
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
}
for (const ev of ['pointerdown', 'touchend', 'click', 'keydown']) addEventListener(ev, wake, { capture: true, passive: true });
// חזרה מהרקע: מנסים להמשיך (באנדרואיד ובמחשב זה מספיק), ובודקים שהמנוע באמת מתקדם.
// לפעמים אחרי המתנה ארוכה אייפון מדווח "פועל" אבל השעון של המנוע עומד — אז מחליפים אותו בחדש; הקליפים שכבר נטענו נשארים.
function onReturn() {
  if (!ctx || document.hidden) return;
  if (ctx.state !== 'running') { ctx.resume().catch(() => {}); return; }
  const t0 = ctx.currentTime, old = ctx;
  setTimeout(() => {
    if (ctx !== old || document.hidden || old.state !== 'running' || old.currentTime > t0) return;
    stopCurrent(); queue = []; emit(false);
    try { old.close(); } catch { /* */ }
    newContext();
  }, 400);
}
document.addEventListener('visibilitychange', onReturn);
addEventListener('pageshow', onReturn);
addEventListener('focus', onReturn);

// טעינת קליפים: עד 4 במקביל (עשרות פענוחים בבת אחת נכשלים באייפון), עם ניסיון חוזר.
// קליפ שנכשל לא נשמר כ"ריק" — בפעם הבאה שצריך אותו הוא נטען שוב, כך שכשל רגעי ברשת לא משתיק אותו לכל האימון.
const MAX_PARALLEL = 4;
let active = 0;
const waiting = []; // { url, run }
function pump() {
  while (active < MAX_PARALLEL && waiting.length) {
    const job = waiting.shift();
    active++;
    job.run().finally(() => { active--; pump(); });
  }
}
async function fetchDecode(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(String(r.status));
      const ab = await r.arrayBuffer();
      return await new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej));
    } catch { await new Promise((r) => setTimeout(r, 350 * (attempt + 1))); }
  }
  return null;
}
// urgent: המאמן צריך את הקליפ עכשיו — קופץ לראש התור
function load(clip, coach = coachId(), urgent = false) {
  const url = clipUrl(clip, coach);
  if (!ctx) return Promise.resolve(null);
  if (!buffers.has(url)) {
    buffers.set(url, new Promise((resolve) => {
      const job = { url, run: () => fetchDecode(url).then((buf) => { if (!buf) buffers.delete(url); resolve(buf); }) };
      if (urgent) waiting.unshift(job); else waiting.push(job);
      pump();
    }));
  } else if (urgent) {
    const i = waiting.findIndex((j) => j.url === url);
    if (i > 0) waiting.unshift(waiting.splice(i, 1)[0]);
  }
  return buffers.get(url);
}

// ───── קובצי הקול במכשיר ─────
// כל קובצי הקול של המאמן הנבחר נשמרים במכשיר (דרך ה-Service Worker), כך שהמאמן מדבר גם בלי קליטה בחדר הכושר.
// ההורדה רצה לבד ברקע אחרי פתיחת האפליקציה, ואפשר להפעיל אותה ידנית מההגדרות ← קול והנחיות.
function voiceFiles() {
  const p = get().profile || {};
  const slug = nameEntry(p)?.slug;
  // משולב: שני מאמנים — זה של חדר הכושר ומאיה
  const coaches = p.track === 'mix' ? [p.gymCoach || p.coach || 'ori', 'maya'] : [get().profile?.coach || 'ori'];
  if (p.mob && p.mobN > 0 && !coaches.includes('tamar')) coaches.push('tamar'); // אימוני מוביליטי משולבים — גם תמר
  return Object.keys(VOICE_TIMING).filter((k) => coaches.includes(k.split('/')[0]) && (!k.includes('/names/') || (slug && k.includes(`/names/${slug}/`))))
    .map((k) => `assets/voice/${k}.mp3`);
}
// כמה מהקבצים כבר שמורים במכשיר
export async function voiceCacheStatus() {
  const files = voiceFiles();
  let have = 0;
  try {
    const cache = await caches.open('studio-media');
    const hits = await Promise.all(files.map((f) => cache.match(new URL(f, location.href).href)));
    have = hits.filter(Boolean).length;
  } catch { /* אין מטמון בדפדפן הזה */ }
  return { have, total: files.length };
}
let downloading = null;
export function downloadVoice(onProgress) {
  if (downloading) return downloading;
  const files = voiceFiles();
  downloading = (async () => {
    let done = 0, failed = 0;
    for (const f of files) {
      try { const r = await fetch(f); if (!r.ok) failed++; else await r.arrayBuffer(); } catch { failed++; }
      done++;
      onProgress?.(done, files.length);
      if (failed > 5 && failed === done) break; // אין רשת — לא ממשיכים לנסות
    }
    return { total: files.length, failed: failed + (files.length - done) };
  })().finally(() => { downloading = null; });
  return downloading;
}
let warmed = '';
export async function warmVoiceCache() {
  const p = get().profile;
  if (!p || !navigator.onLine || get().settings?.voice === false) return;
  const key = (p.track || '') + (p.coach || '') + (p.mobN || 0) + (nameEntry(p)?.slug || '');
  if (warmed === key) return;
  warmed = key;
  const st = await voiceCacheStatus();
  if (st.have < st.total) await downloadVoice();
}

// בחירת הקובץ: גרסה עם שם המתאמן (אם הוקלטה), גרסת נקבה למתאמנת, או הרגילה
export function resolve(key, { allowName = true } = {}) {
  const p = get().profile || {};
  const coach = coachId(), sex = p.sex === 'f' ? 'f' : 'm';
  const ne = allowName ? nameEntry(p) : null;
  const sw = NAME_SWAP[key];
  if (ne && sw && Math.random() < sw[1]) return { clip: `names/${ne.slug}/${sw[0]}`, text: nameLine(sw[0], coach, sex, ne.name) };
  const clip = sex === 'f' && femaleLine(key, coach) && (!key.startsWith('hello_') || key === `hello_${coach}`) ? `${key}__f` : key;
  return { clip, text: lineFor(key, coach, sex) };
}

// טעינה מראש של מפתחות (כולל גרסאות שם/נקבה)
export function preload(keys) {
  if (!ctx) return Promise.resolve();
  const ne = nameEntry(get().profile || {});
  const jobs = [];
  for (const k of keys) {
    jobs.push(load(resolve(k, { allowName: false }).clip));
    if (ne && NAME_SWAP[k]) jobs.push(load(`names/${ne.slug}/${NAME_SWAP[k][0]}`));
  }
  return Promise.all(jobs);
}

function toEntry(item) {
  const e = typeof item === 'string' ? { key: item } : { ...item };
  if (e.key && !e.clip) { const r = resolve(e.key); e.clip = r.clip; e.text ??= r.text; }
  e.text = (e.text || '').replace(/\[[^\]]+\]\s*/g, '');
  e.at = performance.now();
  return e;
}

// say('key' | {key} | {text}) — רגיל: נכנס לתור. priority: מנקה את התור.
// keep: משפט שחייב להיאמר גם אם חיכה בתור זמן רב (הצגת התרגיל הראשון, כשלוחצים "התחל" בזמן הברכה)
export function say(item, { priority = false, keep = false } = {}) {
  const e = toEntry(item);
  if (keep) e.keep = true;
  if (!get().settings.voice) { emit(false, e.text); return; }
  if (priority) stop();
  queue.push(e);
  if (!current) next();
}

// השמעה קריטית (ספירה/טמפו): קוטעת את מה שמתנגן ומשמיעה מיד את הרצף. מחזיר את משך הרצף בשניות.
export function sayNow(items) {
  const entries = items.filter(Boolean).map((i) => ({ ...toEntry(i), critical: true }));
  if (!get().settings.voice || !entries.length) return 0;
  stopCurrent();
  queue = [...entries, ...queue.filter((q) => !q.critical)];
  next();
  return entries.reduce((t, e) => t + clipDur(e.clip), 0);
}

// משך מפתח (לבדיקה אם קליפ ייכנס בחלון הזמן)
export const keyDur = (key) => clipDur(resolve(key, { allowName: false }).clip);

async function next() {
  let e = queue.shift();
  // משפטים שחיכו יותר מדי כבר לא רלוונטיים
  while (e && !e.keep && performance.now() - e.at > (e.critical ? 1500 : 12000)) e = queue.shift();
  if (!e) { current = null; emit(false); return; }
  current = { entry: e };
  emit(true, e.text);
  const done = () => { if (current?.entry === e) { current = null; next(); } };
  if (!e.clip) return speakTTS(e.text, done);
  if (ctx) {
    const loading = load(e.clip, undefined, true);
    const buf = await (e.critical ? Promise.race([loading, new Promise((r) => setTimeout(() => r(null), 350))]) : loading);
    if (current?.entry !== e) return; // נקטע בזמן הטעינה
    if (buf) {
      if (ctx.state !== 'running') {
        // המנוע עצור (האפליקציה חזרה מהרקע ועוד לא נגעו במסך): לא מנגנים אל תוך מנוע עצור — זה מה שתקע את התור.
        // מנסים להמשיך; משפט רגיל מחכה לנגיעה הבאה, ועל ספירה מדלגים. משפט שחיכה יותר מדי נזרק כרגיל.
        try { await Promise.race([ctx.resume(), new Promise((r) => setTimeout(r, 250))]); } catch { /* */ }
        if (current?.entry !== e) return;
        if (ctx.state !== 'running') {
          if (!e.critical) queue.unshift(e);
          current = null; emit(false);
          return;
        }
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      gain.gain.value = get().settings.volume ?? 0.9;
      src.connect(gain);
      src.onended = done;
      current.src = src;
      src.start();
      // רשת ביטחון: אם הקליפ לא הסתיים בזמן (המנוע נעצר באמצע), משחררים את התור
      setTimeout(done, (buf.duration + 1.5) * 1000);
      log.push({ clip: e.clip, t: performance.now(), dur: buf.duration, critical: !!e.critical });
      if (log.length > 600) log.splice(0, 300);
      return;
    }
    if (e.critical) return done(); // לא נטען בזמן — מדלגים, לא מעכבים את הספירה
  }
  // גיבוי HTMLAudio (דפדפן בלי Web Audio)
  const url = clipUrl(e.clip);
  let a = htmlCache.get(url);
  if (!a) { a = new Audio(url); htmlCache.set(url, a); }
  a.volume = get().settings.volume ?? 0.9;
  a.currentTime = 0;
  a.onended = done;
  current.audio = a;
  a.play().then(() => log.push({ clip: e.clip, t: performance.now(), dur: a.duration, critical: !!e.critical, html: true }))
    .catch(() => speakTTS(e.text, done));
}

function speakTTS(text, done) {
  try {
    if (!text || !('speechSynthesis' in window)) return done();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'he-IL'; u.rate = 1.05; u.volume = get().settings.volume ?? 0.9;
    const v = speechSynthesis.getVoices().find((x) => x.lang?.startsWith('he'));
    if (v) u.voice = v;
    u.onend = done; u.onerror = done;
    speechSynthesis.speak(u);
    setTimeout(done, 5000);
  } catch { done(); }
}

function stopCurrent() {
  if (current?.src) { try { current.src.onended = null; current.src.stop(); } catch { /* */ } }
  if (current?.audio) { current.audio.onended = null; current.audio.pause(); }
  current = null;
}

export function stop() {
  queue = [];
  stopCurrent();
  try { speechSynthesis.cancel(); } catch { /* */ }
  emit(false);
}

export const isSpeaking = () => !!current;
