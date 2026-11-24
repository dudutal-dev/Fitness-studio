// מסך מדיטציית הבוקר / הלילה עם אור (25.11.2026; רק ב-MOVA): בלי הליכה — בבוקר יושבים, בלילה שוכבים.
// האיור של המדיטציה על כל המסך, עיגול נשימה שמתרחב ומתכווץ בקצב ההנחיה, שעון שקט, ושני כפתורים. אור מדברת בפתיחת כל שלב (js/data/med-still.js).
// המוזיקה פועלת כברירת מחדל (settings.medMusic). בלילה המסך כהה ולא מוחזק דולק; אחרי שאור מסיימת, המוזיקה ממשיכה עוד עשר דקות ודועכת לבד.
// נשמר ב-sessions (בלי תרגילים), עם track: 'med' ו-still: מזהה המדיטציה; אם הגיע מהתוכנית השבועית — היום מסומן כבוצע.
import { html, esc, on, sheet, toast, icon, fmtTime, el } from '../ui/dom.js';
import { get, set, addXP, XP } from '../store.js';
import { COACHES } from '../data/coaches.js';
import { STILL, STILL_STAGES, STILL_FRAC, stillLine } from '../data/med-still.js';
import { say, stop, preload, unlock, useCoach, onSpeaking } from '../coach/voice.js';
import { startMusic, stopMusic, fadeOutMusic } from '../coach/music.js';
import { keepAlive, releaseKeepAlive, setKeepAliveState } from '../coach/keepalive.js';
import { track } from '../usage.js';
import { maybeAdvanceWeek } from './workout.js';

const PHASES = ['שאיפה', 'החזקה', 'נשיפה', 'מנוחה'];
// איפה אנחנו במחזור הנשימה אחרי t שניות: { phase: 0–3, left: שניות שנותרו בשלב, scale: גודל העיגול 0–1 }
export function breathAt(pattern, t) {
  const cycle = pattern.reduce((a, b) => a + b, 0); let x = ((t % cycle) + cycle) % cycle;
  for (let i = 0; i < 4; i++) { const d = pattern[i]; if (!d) continue; if (x < d) { const f = x / d; return { phase: i, left: Math.ceil(d - x), scale: i === 0 ? f : i === 1 ? 1 : i === 2 ? 1 - f : 0 }; } x -= d; }
  return { phase: 0, left: pattern[0], scale: 0 };
}
// זמני הפתיחה של חמשת השלבים (שניות), לאורך שנבחר
export const stillStarts = (minutes) => { let t = 0; return STILL_FRAC.map((f) => { const s = Math.round(t); t += f * minutes * 60; return s; }); };

export function startStill(id, { minutes = 15, day = null } = {}) {
  const M = STILL[id]; if (!M) return;
  unlock(); useCoach('or'); track(`start:med-${M.when}`);
  const total = minutes * 60, starts = stillStarts(minutes), night = M.when === 'night';
  const mOn = () => get().settings.medMusic !== false;
  let elapsed = 0, lastTick = Date.now(), paused = false, stage = -1, done = false, wakeLock = null, timer = null, breathT0 = 0, speaking = false;
  preload([0, 1, 2, 3, 4].map((i) => stillLine(id, i)));

  const root = el(html`<div class="still ${night ? 'night' : ''}" role="dialog" aria-label="${esc(M.name)}">
    <img class="still-bg" src="assets/med/${id}.webp" alt=""><video class="still-bg" muted playsinline loop autoplay src="assets/med/${id}.mp4"></video>
    <div class="still-top"><button class="icon-btn" data-act="exit" aria-label="סגירה">${icon('close', 'width="20" height="20"')}</button><span class="spacer"></span>
      <button class="icon-btn ${mOn() ? '' : 'off'}" data-act="music" aria-label="מוזיקת רקע" aria-pressed="${mOn()}">${icon('music', 'width="20" height="20"')}</button></div>
    <div class="still-mid"><div class="breath"><i class="ring"></i><b id="bph"></b><span id="bleft" class="num"></span></div></div>
    <div class="still-bot">
      <div class="eyebrow">${night ? 'מדיטציית לילה · בשכיבה' : 'מדיטציית בוקר · בישיבה'} · עם ${esc(COACHES.or.name)}</div>
      <div class="still-name">${esc(M.name)}</div>
      <div class="still-stage" id="stg"></div>
      <div class="still-say" id="ssay"></div>
      <div class="still-bar">${STILL_FRAC.map((f) => `<i style="flex:${f}"></i>`).join('')}</div>
      <div class="still-time num" id="left"></div>
      <div class="row still-btns"><button class="btn" data-act="pause">${icon('pause', 'width="18" height="18"')} <span>השהה</span></button><button class="btn ghost" data-act="finish">סיום</button></div>
    </div></div>`);
  const $ = (s) => root.querySelector(s);
  document.body.append(root); document.body.style.overflow = 'hidden';
  // בבוקר המסך נשאר דולק; בלילה לא — הטלפון יכול לנוח לצד המיטה, והמדיטציה ממשיכה ברקע
  if (!night) { try { navigator.wakeLock?.request('screen').then((l) => (wakeLock = l)).catch(() => {}); } catch { /* */ } }
  const offSpeak = onSpeaking((on2, text) => { speaking = on2; const b = $('#ssay'); if (b) { b.textContent = on2 ? String(text || '').replace(/\s*\.\.\.\s*/g, ' ') : ''; b.classList.toggle('on', !!on2); } });
  if (mOn()) startMusic(M.mood);
  keepAlive({ title: M.name, artist: COACHES.or.name, artwork: COACHES.or.face, togglePause: setPaused });

  function enter(i) {
    stage = i;
    $('#stg').textContent = STILL_STAGES[i];
    root.querySelectorAll('.still-bar i').forEach((n, j) => { n.classList.toggle('cur', j === i); n.classList.toggle('past', j < i); });
    // עיגול הנשימה מופיע משלב הנשימה המונחית ועד הסיום; בהתמקמות ובסיום נושמים רגיל
    const guided = i >= 1 && i <= 3; root.classList.toggle('guided', guided); if (guided && i === 1) breathT0 = elapsed;
    say(stillLine(id, i), { priority: i > 0, keep: true });
  }
  function tick() {
    const now = Date.now(), dt = now - lastTick; lastTick = now;
    if (paused || done) return;
    elapsed += Math.min(dt, 5000) / 1000;   // אחרי שהדף נרדם לא קופצים קדימה בבת אחת
    const want = starts.filter((s) => elapsed >= s).length - 1;
    if (want > stage) enter(stage + 1);
    $('#left').textContent = fmtTime(Math.max(0, Math.ceil(total - elapsed)));
    if (root.classList.contains('guided')) {
      const b = breathAt(M.breath, elapsed - breathT0);
      $('.ring').style.transform = `scale(${0.55 + 0.45 * b.scale})`; $('#bph').textContent = PHASES[b.phase]; $('#bleft').textContent = b.left;
    }
    if (elapsed >= total) finish(true);
  }
  function setPaused(v) {
    if (paused === v || done) return; paused = v; setKeepAliveState(v);
    $('[data-act="pause"] span').textContent = v ? 'המשך' : 'השהה'; root.classList.toggle('paused', v);
    if (v) { stop(); stopMusic(); } else { lastTick = Date.now(); if (mOn()) startMusic(M.mood); }
  }
  function save(full) {
    const dur = Math.round(Math.min(elapsed, total));
    if (dur < 120) return;   // פחות משתי דקות — לא נרשם
    set((s) => {
      s.sessions.push({ id: `s_${Date.now()}`, date: new Date().toISOString(), name: `${night ? 'מדיטציית לילה' : 'מדיטציית בוקר'} · ${M.name}`, track: 'med', still: id, day, field: false, durationSec: dur, volume: 0, setsDone: 0, exercises: [], prs: [] });
      if (full && day != null && !s.plan.completedDays.includes(day)) s.plan.completedDays.push(day);
      return s;
    });
    addXP(Math.round(XP.workout * (full ? 0.6 : 0.3)), 'מדיטציה');
    track(`done:med-${M.when}`);
    if (full && day != null) maybeAdvanceWeek();
  }
  function finish(full) {
    if (done) return; done = true; clearInterval(timer); save(full);
    root.classList.remove('guided'); root.classList.add('ended');
    $('#stg').textContent = full ? 'המדיטציה הסתיימה' : 'נעצר כאן'; $('#left').textContent = '';
    $('.still-btns').innerHTML = `<button class="btn primary block" data-act="close">${night ? 'לילה טוב' : 'סיום'}</button>`;
    // בלילה: המוזיקה ממשיכה עוד עשר דקות ודועכת, והמסך נסגר לבד אחריה. בבוקר: דעיכה קצרה
    if (full && M.tail && mOn()) { setTimeout(() => fadeOutMusic(60), (M.tail - 60) * 1000); setTimeout(() => { if (root.isConnected) close(); }, M.tail * 1000 + 2000); }
    else if (mOn()) fadeOutMusic(full ? 12 : 3);
  }
  function close() {
    clearInterval(timer); offSpeak(); stop(); stopMusic(); useCoach(null);
    try { wakeLock?.release(); } catch { /* */ }
    releaseKeepAlive(); root.remove(); document.body.style.overflow = '';
    dispatchEvent(new HashChangeEvent('hashchange'));
  }
  on(root, 'click', '[data-act]', (e, t) => {
    const a = t.dataset.act;
    if (a === 'pause') setPaused(!paused);
    if (a === 'close') close();
    if (a === 'finish') finish(false);
    if (a === 'music') { const v = !mOn(); set((s) => { s.settings.medMusic = v; return s; }); if (v && !paused && !done) startMusic(M.mood); else if (!v) stopMusic(); t.classList.toggle('off', !v); t.setAttribute('aria-pressed', v); toast(v ? 'מוזיקת רקע פועלת' : 'מוזיקת הרקע כובתה', 1400); }
    if (a === 'exit') {
      if (done || elapsed < 20) return close();
      sheet(html`<div class="h1" style="font-size:22px">לסיים את המדיטציה?</div>
        <button class="btn primary block" data-x="save">סיים ושמור</button><button class="btn block" style="margin-top:8px" data-x="quit">צא בלי לשמור</button>
        <button class="btn ghost block" style="margin-top:8px" data-close>להמשיך</button>`, { onMount(sh, c) { on(sh, 'click', '[data-x]', (ev, b) => { c(); if (b.dataset.x === 'save') { finish(false); close(); } else close(); }); } });
    }
  });
  enter(0);
  timer = setInterval(tick, 250);
  tick();
}
