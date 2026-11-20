// מצב אימון חי: הדגמת וידאו של המאמן, ספירת חזרות בטמפו עם קול, מדידת מנוחות, רישום ביצועים
// והתאמת משקל בזמן אמת (אוטו־רגולציה בין סטים).
import { html, esc, on, sheet, toast, confetti, vibrate, icon, fmtTime, el, ib } from '../ui/dom.js';
import { ring, setRing } from '../ui/charts.js';
import { get, set, addXP, XP, pushEvent, regenerateWeek, today } from '../store.js';
import { EX, EXERCISES, MUSCLES } from '../data/exercises.js';
import { COACHES, demoVideo, demoPoster } from '../data/coaches.js';
import { suggest, isPR, roundLoad, bestSet, evaluateLevel } from '../engine/progression.js';
import { applyReadiness, blockedSet, LEVEL_NAMES, warmupFor, cooldownFor } from '../engine/program.js';
import { say, sayNow, resolve, clipDur, keyDur, stop, onSpeaking, preload, unlock, isSpeaking, useCoach } from '../coach/voice.js';
import { hasMusic, musicOn, startMusic, stopMusic } from '../coach/music.js';
import { MOTIVATION_KEYS, ORDINAL_SET, MOBILITY_TIPS, coachSays } from '../data/voice-lines.js';
import { DEMO_TIMING } from '../data/demo-timing.js';
import { startRun } from './run.js';
import { isCali, hasCali, sessionCoach, applyCaliSession, rungState, caliLevel, canDo, LADDERS, LADDER_OF } from '../engine/cali.js';
import { pingWorkout, syncReminders } from '../reminders.js';
import { recorder, current as hrNow, zoneOf, maxHrFor } from '../devices/hr.js';
import { hrPill, hrSummaryHtml } from '../devices/ui.js';
import { mobMinutesSheet } from './mob-ui.js';
import { isMob, mobCount, regionOf, REGIONS } from '../engine/mob.js';
import { isHiit, hiitLevelUp, lowAlt } from '../engine/hiit.js';
import { isPil, pilLevelUp, PIL_LEVELS } from '../engine/pil.js';
import { isYoga, yogaLevelUp, YOGA_LEVELS } from '../engine/yoga.js';

const WARM_CHEER = ['m2', 'm5', 'm6', 'm9', 'm10'];
const RPE = [{ v: 6.5, e: icon('effort1'), t: 'קל' }, { v: 8, e: icon('effort2'), t: 'טוב' }, { v: 9, e: icon('effort3'), t: 'קשה' }, { v: 10, e: icon('effort4'), t: 'עד הקצה' }];

export function startWorkout(workout, { readiness = null, sized = false } = {}) {
  // מוביליטי: קודם בוחרים כמה זמן יש (10 / 20 / 30 דקות), והאימון נבנה לפי זה
  if (workout.track === 'mob' && !sized) { unlock(); return mobMinutesSheet(workout, (w) => startWorkout(w, { readiness, sized: true })); }
  unlock();
  const s = get();
  const profile = s.profile;
  // המאמן של האימון הזה (במסלול משולב: מאיה בקליסתניקס, אורי/נועה בחדר הכושר) — גם מדגים וגם מדבר
  const coach = sessionCoach(profile, workout);
  const caliW = workout.track === 'cali', mobW = workout.track === 'mob', hiitW = workout.track === 'hiit', pilW = workout.track === 'pil', yogaW = workout.track === 'yoga';
  const flowW = mobW || pilW || yogaW;   // אימון רצף לפי זמן: מוביליטי, פילאטיס או יוגה
  useCoach(coach);
  const w = readiness != null ? applyReadiness(workout, readiness) : structuredClone(workout);

  // פריטים: חימום → תרגילים → פיניש (סבב) → מתיחות
  const AUTO = new Set(['finisher', 'warmup', 'cooldown', 'mob', 'hiit']); // סטים שלא מדרגים ולא נכנסים להיסטוריה
  const guidedMobility = get().settings.warmup !== false && !flowW;
  const warm = guidedMobility ? (w.warmup || warmupFor(w.items, blockedSet(profile))) : [];
  const cool = guidedMobility ? (w.cooldown || cooldownFor(w.items)) : [];
  const items = [
    ...warm.map((x, i) => ({ exId: x.exId, role: 'warmup', sets: 1, reps: [x.secs, x.secs], rest: i === warm.length - 1 ? 20 : 6, unit: 'sec', rpe: 5 })),
    ...w.items.map((it) => ({ ...it })),
  ];
  if (w.finisher) {
    for (const [exId, n] of w.finisher.items) {
      const ex = EX[exId];
      const timed = ex.type === 'time' || ex.type === 'cardio';
      items.push({ exId, role: 'finisher', sets: w.finisher.rounds, reps: [n, n], rest: 25, unit: timed ? 'sec' : undefined, rpe: 9 });
    }
  }
  cool.forEach((x) => items.push({ exId: x.exId, role: 'cooldown', sets: 1, reps: [x.secs, x.secs], rest: 6, unit: 'sec', rpe: 3 }));
  // רישום מוכן לכל סט
  const log = items.map((it) => {
    const ex = EX[it.exId];
    const sg = ['warmup', 'cooldown', 'mob', 'hiit'].includes(it.role) ? { reps: it.reps[0], w: 0 } : it.role === 'finisher' ? { reps: it.reps[0], w: ex.load ? roundLoad(profile.weightKg * ex.load[profile.level - 1], ex) : 0 } : suggest(it.exId, it, s.history[it.exId], profile);
    return { sg, sets: Array.from({ length: it.sets }, () => ({ w: sg.w || 0, reps: sg.reps, rpe: null, done: false })) };
  });
  // סדר צעדים: תרגילים רגילים לפי תרגיל, פיניש לפי סבבים
  const steps = [];
  items.forEach((it, ii) => { if (!['finisher', 'cooldown', 'hiit'].includes(it.role)) for (let si = 0; si < it.sets; si++) steps.push({ ii, si }); });
  // HIIT: מעגל — עוברים על כל התרגילים, ואז סבב נוסף
  const circ = items.map((it, ii) => ({ it, ii })).filter((x) => x.it.role === 'hiit');
  if (circ.length) for (let r = 0; r < circ[0].it.sets; r++) circ.forEach(({ ii }) => steps.push({ ii, si: r }));
  const fin = items.map((it, ii) => ({ it, ii })).filter((x) => x.it.role === 'finisher');
  if (fin.length) for (let r = 0; r < fin[0].it.sets; r++) fin.forEach(({ ii }) => steps.push({ ii, si: r }));
  items.forEach((it, ii) => { if (it.role === 'cooldown') steps.push({ ii, si: 0 }); });
  const mobilityIdx = (role) => items.map((it, ii) => (it.role === role ? ii : -1)).filter((x) => x >= 0);

  const t0 = Date.now();
  let k = 0;            // צעד נוכחי
  let mode = 'ready';   // ready | active | log | rest | summary
  let timer = null;
  let wakeLock = null;
  let countedReps = 0;
  let lastExShown = -1;
  let intraMsg = '';

  try { navigator.wakeLock?.request('screen').then((l) => (wakeLock = l)).catch(() => {}); } catch { /* */ }
  const hrRec = recorder(profile);
  const hrMax = maxHrFor(profile);
  // טעינה מראש של כל מה שהמאמן עשוי להגיד באימון הזה (ספירה 1–20, טמפו, סטים, מוטיבציה, שמות התרגילים)
  preload(['go', 'down', 'up', 'hold', 'pull', 'press', 'release', 'rest', 'rest_10', 'rest_30', 'set_done', 'two_more', 'last_rep', 'last_set',
    'next_ex', 'rate_set', 'warm_intro', 'warm_go', 'switch_side', 'warm_done', 'cool_intro', 'cool_done', 'hold_start', 'hold_half', 'hold_done', 'workout_done', 'pr', 'hr_ready', 'hr_high', `hello_${coach}`,
    ...Array.from({ length: 20 }, (_, i) => `n${i + 1}`), ...Array.from({ length: 6 }, (_, i) => `set${i + 1}`),
    ...(caliW ? ['slow_down', 'skill_intro', 'rung_up', 'rung_wait'] : []),
    ...(hiitW ? ['hiit_go', 'hiit_10', 'hiit_round', 'hiit_last', 'hiit_low'] : []),
    ...(pilW ? ['pil_hello', 'pil_half', 'pil_done'] : []),
    ...(flowW ? ['mob_intro', 'mob_hold', 'mob_again', 'mob_breathe', 'mob_no_pain', 'mob_close'] : []),
    ...MOTIVATION_KEYS, ...items.map((it) => `ex_${it.exId}`), ...items.filter((it) => MOBILITY_TIPS[it.exId]).map((it) => `tip_${it.exId}`)].filter((key) => coachSays(key, coach))); // רק מה שהמאמן הזה באמת אומר

  const deferFirst = ['warmup', 'mob', 'cooldown'].includes(items[0]?.role) && items[0]?.unit === 'sec';
  let firstShown = false;
  const root = el(`<div class="live" role="dialog" aria-label="אימון חי">
    <div class="stage"><img class="stage-bg" alt="" aria-hidden="true"><img class="poster" alt=""><video muted playsinline loop autoplay preload="auto"></video>
      <div class="hud-top"><button class="icon-btn" data-act="exit" aria-label="יציאה">${icon('close', 'width="20" height="20"')}</button>
        <div class="progress"></div><span class="clock num">0:00</span>
        <button class="icon-btn" data-act="tv" aria-label="מצב טלוויזיה">${icon('tv', 'width="20" height="20"')}</button>
        ${hasMusic(workout.track) ? `<button class="icon-btn ${musicOn() ? '' : 'off'}" data-act="music" aria-label="מוזיקת רקע" aria-pressed="${musicOn()}">${icon('music', 'width="20" height="20"')}</button>` : ''}
        <button class="icon-btn" data-act="voice" aria-label="קול">${icon(get().settings.voice ? 'vol' : 'mute', 'width="20" height="20"')}</button></div>
      <div class="coach-pip"><img src="${COACHES[coach].face}" alt=""></div><div class="say"></div>
      <div class="title"></div></div>
    <div class="panel"></div></div>`);
  document.body.append(root);
  document.body.style.overflow = 'hidden';
  const $ = (q) => root.querySelector(q);
  const pill = hrPill();
  $('.clock').after(pill);
  const video = $('video'), poster = $('img.poster'), stageBg = $('img.stage-bg');
  video.addEventListener('error', () => { video.style.display = 'none'; });

  let sayT;
  const offSpeak = onSpeaking((v, text) => {
    $('.coach-pip').classList.toggle('speaking', v);
    clearTimeout(sayT);
    if (v && text) { $('.say').textContent = text; $('.say').classList.add('show'); }
    if (!v) sayT = setTimeout(() => $('.say')?.classList.remove('show'), 1200);
  });
  const clock = setInterval(() => { $('.clock').textContent = fmtTime((Date.now() - t0) / 1000); }, 1000);

  const cur = () => steps[k];
  const item = () => items[cur().ii];
  const ex = () => EX[item().exId];
  const setLog = () => log[cur().ii].sets[cur().si];

  function showExercise() {
    const ii = cur().ii;
    if (ii === lastExShown) return;
    lastExShown = ii;
    const id = item().exId;
    video.style.display = '';
    poster.src = demoPoster(coach, id);
    stageBg.src = poster.src;
    video.src = demoVideo(coach, id);
    video.play().catch(() => {});
  }

  // מצב טלוויזיה (מסך לרוחב): מה הבא בתור — מוצג ליד שם התרגיל, כדי שלא יהיה צריך להתקרב לטלפון
  function tvNext() {
    const here = cur().ii;
    const nx = steps.slice(k + 1).find((x) => x.ii !== here);
    return nx ? `<div class="tv-next">הבא: <b>${esc(EX[items[nx.ii].exId].name)}</b></div>` : '<div class="tv-next">התרגיל האחרון</div>';
  }
  // מעבר למסך לרוחב. באנדרואיד האפליקציה מסתובבת לבד; באייפון מסובבים את הטלפון (ואז המסך מתארגן לרוחב אוטומטית).
  let tvOn = false;
  async function tvMode(on) {
    tvOn = on;
    root.classList.toggle('tv', on);
    try {
      if (on) { await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).catch(() => {}); await screen.orientation?.lock?.('landscape'); }
      else { screen.orientation?.unlock?.(); if (document.fullscreenElement) await document.exitFullscreen?.(); }
    } catch { /* אייפון: אין נעילת כיוון — מסובבים ידנית */ }
    if (on && !matchMedia('(orientation: landscape)').matches) toast('מסובבים את הטלפון לרוחב, ומפעילים שיקוף מסך לטלוויזיה', 4200);
    else if (on) toast('מצב טלוויזיה: עכשיו מפעילים שיקוף מסך מהטלפון', 3200);
  }

  function paintTop() {
    const exIdx = [...new Set(steps.map((x) => x.ii))];
    $('.progress').innerHTML = exIdx.map((ii) => {
      const sets = log[ii].sets;
      const all = sets.every((x) => x.done);
      return `<i class="${all ? 'f' : ii === cur()?.ii ? 'c' : ''}"></i>`;
    }).join('');
    const it = item(), e = ex();
    const setNo = cur().si + 1;
    $('.title').innerHTML = html`<div class="row" style="gap:6px;margin-bottom:6px">
        ${it.role === 'hiit'
    ? `<span class="tag orange">${icon('flame')} סבב <span class="num">${setNo}/${it.sets}</span></span><span class="tag"><span class="num">${mobilityIdx('hiit').indexOf(cur().ii) + 1}/${mobilityIdx('hiit').length}</span></span><span class="tag">${it.reps[0]} שנ׳ עבודה · ${it.rest} מנוחה</span>`
    : it.role === 'mob'
    ? `<span class="tag teal">${esc(REGIONS[it.region] || it.label || 'מוביליטי')} <span class="num">${mobilityIdx('mob').indexOf(cur().ii) + 1}/${mobilityIdx('mob').length}</span></span>${it.sets > 1 ? `<span class="tag">סבב <span class="num">${setNo}/${it.sets}</span></span>` : ''}${e.unilateral ? `<span class="tag">${Math.round(it.reps[0] / 2)} שנ׳ לכל צד</span>` : pilW ? `<span class="tag">${it.reps[0]} שנ׳</span>` : ''}`
    : it.role === 'warmup' || it.role === 'cooldown'
    ? `<span class="tag teal">${it.role === 'warmup' ? 'חימום' : 'מתיחות'} <span class="num">${mobilityIdx(it.role).indexOf(cur().ii) + 1}/${mobilityIdx(it.role).length}</span></span>${e.unilateral ? '<span class="tag">20 שנ׳ לכל צד</span>' : ''}`
    : html`${it.role === 'finisher' ? `<span class="tag orange">${icon('flame')} ${esc(w.finisher.name)}</span>` : `<span class="tag lime">${it.role === 'skill' ? 'מיומנות' : it.role === 'main' ? 'תרגיל מרכזי' : it.role === 'second' ? 'משני' : it.role === 'core' ? 'ליבה' : it.vol ? 'נפח' : 'עזר'}</span>`}
        <span class="tag">${it.role === 'finisher' ? 'סבב' : 'סט'} <span class="num">${setNo}/${it.sets}</span></span>`}
        <button class="tag teal" data-act="info">${icon('info', 'width="12" height="12"')} הסבר</button></div>
      <div class="name">${esc(e.name)}</div>
      <div class="sub">${esc(e.equip)} · ${e.muscles.slice(0, 3).map((m) => MUSCLES[m]).join(' · ')}</div>${tvNext()}`;
  }

  // ───── מצבים ─────
  function paint() {
    if (mode === 'summary') return;
    showExercise(); paintTop();
    const p = $('.panel');
    const it = item(), e = ex(), sl = setLog();
    const timed = it.unit === 'sec';
    if (mode === 'ready') {
      const sg = log[cur().ii].sg;
      p.innerHTML = html`
        ${cur().si === 0 && sg.why ? `<div class="sub" style="margin:6px 0 10px;color:var(--acc-ink);font-weight:700">${icon('sparkle')} ${esc(sg.why)}</div>` : ''}
        ${intraMsg ? `<div class="sub" style="margin:6px 0 10px;color:var(--pri-ink);font-weight:700">${icon('bolt')} ${esc(intraMsg)}</div>` : ''}
        <div class="target">
          ${e.type === 'weight' || e.load ? html`<div><div class="sub" style="font-size:12px;margin-bottom:4px">משקל</div>
            <div class="stepper"><button data-w="-">−</button><div class="val"><span>${sl.w}</span><small>ק״ג</small></div><button data-w="+">+</button></div></div>` : ''}
          <div><div class="sub" style="font-size:12px;margin-bottom:4px">${timed ? 'זמן' : 'חזרות יעד'}</div>
            <div class="stepper"><button data-r="-">−</button><div class="val"><span>${sl.reps}</span><small>${timed ? 'שנ׳' : e.unilateral ? 'לכל צד' : ''}</small></div><button data-r="+">+</button></div></div>
        </div>
        <button class="btn primary block xl" data-act="go">${icon('play', 'width="22" height="22"')} ${timed ? 'התחל' : 'התחל סט'}</button>
        <div class="row" style="margin-top:10px">
          ${it.role === 'warmup' ? `<button class="btn sm" data-act="skip-warm">${icon('skip', 'width="16" height="16"')} דלג על החימום</button>`
    : it.role === 'cooldown' ? `<button class="btn sm" data-act="skip-cool">${icon('skip', 'width="16" height="16"')} דלג על המתיחות</button>`
    : it.role === 'hiit' ? (lowAlt(it.exId) ? `<button class="btn sm" data-act="low">${icon('swap', 'width="16" height="16"')} בלי קפיצות</button>` : '')
    : it.role === 'mob' ? `<button class="btn sm" data-act="skip-ex">${icon('skip', 'width="16" height="16"')} דלג על התרגיל</button>`
    : it.role !== 'finisher' ? `<button class="btn sm" data-act="swap">${icon('swap', 'width="16" height="16"')} החלף תרגיל</button>` : ''}
          <span class="spacer"></span>
          ${!timed ? `<button class="btn sm ghost" data-act="manual">סיימתי בלי ספירה</button>` : ''}
        </div>`;
    } else if (mode === 'active') {
      p.innerHTML = html`<div class="counter">${ring(0, { size: 190, stroke: 14, big: timed ? sl.reps : '0', lbl: timed ? 'שניות' : `מתוך ${sl.reps}` })}
        <div class="phase-lbl" id="ph">היכון…</div></div>
        <button class="btn block xl" data-act="finish-set">${timed ? 'עצור' : 'סיימתי את הסט'}</button>
        ${it.role === 'hiit' && lowAlt(it.exId) ? `<button class="btn sm ghost block" style="margin-top:8px" data-act="low">${icon('swap', 'width="16" height="16"')} קשה על המפרקים? גרסה בלי קפיצות</button>` : ''}`;
    } else if (mode === 'log') {
      p.innerHTML = html`<div class="h2" style="margin:6px 0 10px">איך היה?</div>
        <div class="target">
          ${e.type === 'weight' || e.load ? html`<div><div class="stepper"><button data-w="-">−</button><div class="val"><span>${sl.w}</span><small>ק״ג</small></div><button data-w="+">+</button></div></div>` : ''}
          <div><div class="stepper"><button data-r="-">−</button><div class="val"><span>${sl.reps}</span><small>${timed ? 'שנ׳' : 'חזרות'}</small></div><button data-r="+">+</button></div></div>
        </div>
        <div class="rpe">${RPE.map((r) => `<button data-rpe="${r.v}" class="${sl.rpe === r.v ? 'on' : ''}"><span>${r.e}</span>${r.t}</button>`)}</div>`;
    }
  }

  // ───── סנכרון וידאו לספירה ─────
  // כל חזרה שנספרת מנגנת קטע חזרה אחד מהווידאו (חלק מהסרטונים כוללים 2–3 חזרות), מתוח בדיוק לזמני הטמפו:
  // שלב ראשון = התחלה→נקודת מפנה, החזקה = עצירה בנקודת המפנה, שלב שני = נקודת מפנה→סוף.
  const segsFor = (id) => DEMO_TIMING[coach]?.[id]?.segs || [];
  let vSync = null; // { seg, to }
  function videoPhase(seg, part, secs) {
    if (!seg || video.style.display === 'none') return;
    video.loop = false;
    const [a, turn, b] = seg;
    if (part === 'hold') { video.pause(); vSync = { to: turn }; return; }
    const from = part === 'A' ? a : turn, to = part === 'A' ? turn : b;
    if (part === 'A' || Math.abs(video.currentTime - from) > 0.12) { try { video.currentTime = from; } catch { /* */ } }
    video.playbackRate = Math.min(4, Math.max(0.25, (to - from) / Math.max(0.2, secs)));
    vSync = { to };
    video.play().catch(() => {});
  }
  function videoFree() {
    vSync = null;
    video.loop = true;
    video.playbackRate = 1;
    if (video.paused) video.play().catch(() => {});
  }
  // שומר שהווידאו לא "יקדים" את הספירה: בדיקה בכל פריים (ספארי שולח timeupdate רק ~4 פעמים בשנייה)
  (function guard() {
    if (!root.isConnected) return;
    if (vSync && !video.paused && video.currentTime >= vSync.to - 0.03) video.pause();
    requestAnimationFrame(guard);
  })();

  function startSet() {
    mode = 'active'; paint();
    if (deferFirst && !firstShown && k === 0) say(`ex_${item().exId}`);
    firstShown = true;
    countedReps = 0;
    const it = item(), e = ex(), sl = setLog();
    if (it.unit === 'sec') return runTimed(sl.reps, it.role, e);
    if (!get().settings.tempoCount) { $('#ph').textContent = 'בצע בקצב שלך'; return; }
    stop();
    const goDur = sayNow(['go']) || 2.6;
    const [ecc, hold, con] = e.tempo;
    // שלבי החזרה לפי סדר התרגיל
    const conFirst = e.first === 'con';
    const P = conFirst
      ? [{ k: 'con', secs: con, cue: e.cueCon, part: 'A' }, { k: 'hold', secs: hold, cue: 'hold', part: 'hold' }, { k: 'ecc', secs: ecc, cue: e.cueEcc, part: 'B' }]
      : [{ k: 'ecc', secs: ecc, cue: e.cueEcc, part: 'A' }, { k: 'hold', secs: hold, cue: 'hold', part: 'hold' }, { k: 'con', secs: con, cue: e.cueCon, part: 'B' }];
    const ph = (ic, cls, t) => `<span class="ph-ico ${cls}">${icon(ic)}</span>${t}`;
    const LABEL = { down: ph('phDown', 'go-down', 'ירידה'), up: ph('phUp', 'go-up', 'עלייה'), pull: ph('phPull', 'go-pull', 'משיכה'),
      press: ph('phDown', 'go-down', 'לחיצה'), release: ph('phRelease', 'go-rel', 'שחרור'), hold: ph('phHold', 'go-hold', 'החזק'), slow_down: ph('phDown', 'go-down', 'לאט למטה') };
    const rep = (ecc + hold + con) * 1000;
    const target = sl.reps;
    const segs = segsFor(e.id);
    // לפני ההתחלה: הווידאו עומד בתנוחת המוצא
    if (segs.length) { video.loop = false; video.pause(); vSync = null; try { video.currentTime = segs[0][0]; } catch { /* */ } }
    // החזרה הראשונה מתחילה בדיוק כשהמאמן מסיים "...יאללה!"
    const startAt = Date.now() + Math.max(1500, goDur * 1000);
    let lastPhase = '';
    // בונה רצף קריטי שנכנס בחלון הזמן (שניות) — מה שלא נכנס לא נאמר, כדי שהקול לא "יגרר" אחרי התנועה
    const fit = (keys, window) => {
      const out = []; let t = 0;
      for (const k of keys) {
        if (!k) continue;
        // בוחרים מראש את הקליפ שיתנגן בפועל (אולי גרסה עם השם — ארוכה יותר); אם לא נכנס — הגרסה הרגילה
        let e = resolve(k), d = clipDur(e.clip) + 0.06;
        if (t + d > window - 0.15 && e.clip.startsWith('names/')) { e = resolve(k, { allowName: false }); d = clipDur(e.clip) + 0.06; }
        if (t + d <= window - 0.15 || (!out.length && k.startsWith('n'))) { out.push(e); t += d; }
      }
      return out;
    };
    timer = setInterval(() => {
      const t = Date.now() - startAt;
      if (t < 0) return;
      const r = Math.floor(t / rep);
      const within = t - r * rep;
      if (r >= target) { countedReps = target; sayNow([`n${Math.min(20, target)}`]); endSet(); return; }
      let acc = 0, pi = 0;
      while (pi < 2 && within >= (acc + P[pi].secs) * 1000) { acc += P[pi].secs; pi++; }
      const cur = P[pi];
      const key = `${r}-${pi}`;
      const ringNode = $('.counter .ring');
      setRing(ringNode, (r + within / rep) / target);
      if (key !== lastPhase) {
        lastPhase = key;
        (window.__phaseLog ||= []).push({ t: performance.now(), r, pi, label: LABEL[cur.cue], ct: video.currentTime }); // לבדיקות סנכרון
        if (segs.length) videoPhase(segs[r % segs.length], cur.part, cur.secs);
        const lbl = $('#ph');
        lbl.className = `phase-lbl ${cur.k === 'hold' ? 'hold' : cur.k === 'ecc' ? 'down' : 'up'}`;
        lbl.innerHTML = LABEL[cur.cue];
        // מה המאמן אומר בתחילת כל שלב (חלון = משך השלב):
        //  • תחילת חזרה: מספר החזרה שהושלמה, "עוד שתיים"/"חזרה אחרונה", ובשתי החזרות הראשונות גם הנחיית התנועה
        //  • שלב שני: הנחיית התנועה ("עלייה!") בכל חזרה — אם נכנס בזמן
        //  • החזקה: "החזק" אם ההחזקה ארוכה מספיק
        let words = [];
        if (pi === 0) {
          if (r > 0) {
            countedReps = r;
            ringNode.querySelector('.big').textContent = r;
            vibrate(15);
          }
          const extra = target - r === 2 && target >= 5 ? 'two_more' : target - r === 1 && target > 1 ? 'last_rep' : null;
          words = fit([r > 0 ? `n${Math.min(20, r)}` : null, extra, r < 2 ? cur.cue : null], cur.secs);
        } else if (cur.secs > 0) {
          words = fit([cur.cue], cur.secs);
        }
        if (words.length) sayNow(words);
      }
    }, 40);
  }

  function runTimed(secs, role, e) {
    const mobility = role === 'warmup' || role === 'cooldown' || role === 'mob';
    const calm = role === 'cooldown' || (role === 'mob' && e?.kind === 'static');
    // חימום/מתיחות: השעון לא מתחיל עד שהמאמן סיים להציג את התנועה (עד 15 שנ׳ המתנה), ורק אז "מתחילים!".
    // תרגילי זמן רגילים: "מתחילים להחזיק… עכשיו!"
    let startAt = mobility ? null : Date.now() + 1200;
    // תרגיל זמן סטטי (פלאנק, נשיאה): "מתחילים להחזיק… עכשיו!"; דינמי (סקוואט, ברכיים גבוהות, חבלים): "מתחילים!"
    if (!mobility) say(role === 'hiit' ? 'hiit_go' : e?.pattern === 'core' || e?.hold || e?.id === 'farmer_carry' ? 'hold_start' : 'warm_go', { priority: true });
    const hiit = role === 'hiit', firstRound = hiit && cur().si === 0;
    let ten = false;
    const sides = e?.unilateral && (mobility || e?.hold); // החזקה חד־צדדית: מחליפים צד באמצע
    const waitUntil = Date.now() + 15000;
    let lastSec = -1, half = false, cheered = false, tipped = false, breathed = false;
    timer = setInterval(() => {
      if (startAt == null) {
        if (isSpeaking() && Date.now() < waitUntil) { $('#ph').textContent = 'מתכוננים…'; return; }
        say('warm_go');
        startAt = Date.now() + (get().settings.voice ? keyDur('warm_go') * 1000 + 150 : 600);
      }
      const t = (Date.now() - startAt) / 1000;
      if (t < 0) return;
      const left = Math.max(0, secs - t);
      const node = $('.counter .ring');
      setRing(node, t / secs);
      node.querySelector('.big').textContent = Math.ceil(left);
      $('#ph').textContent = left <= 0 ? '' : hiit ? 'עבודה!' : sides ? (half ? 'צד שני' : 'צד ראשון') : calm ? 'נושמים ומרפים' : role === 'mob' ? 'לאט ובשליטה' : 'ממשיכים';
      const sec = Math.ceil(left);
      if (sec !== lastSec) {
        lastSec = sec;
        if (!half && t >= secs / 2 && secs >= 20) { half = true; if (sides) { sayNow(['switch_side']); vibrate([60, 40, 60]); } else if (!hiit && (role !== 'mob' || secs >= 40)) say(pilW ? 'pil_half' : 'hold_half'); }
        // מוביליטי: תזכורת נשימה בהחזקות ארוכות, פעם אחת
        if (role === 'mob' && calm && !breathed && secs >= 40 && sec === (sides ? 8 : 12)) { breathed = true; say('mob_breathe'); }
        // חימום/מתיחות: דגש ביצוע כמה שניות אחרי ההתחלה
        if ((mobility || firstRound) && !tipped && t >= 4 && secs >= 20 && MOBILITY_TIPS[e?.id]) { tipped = true; say(`tip_${e.id}`); }
        if (hiit && !ten && sec === 10 && secs >= 30) { ten = true; say('hiit_10'); }
        // חימום: מילת עידוד לקראת הסוף, כדי שהמאמן לא ישתוק חצי דקה
        if (role === 'warmup' && !cheered && sec === 12 && secs >= 30) { cheered = true; say(WARM_CHEER[Math.floor(Math.random() * WARM_CHEER.length)]); }
        if (sec <= 3 && sec >= 1) sayNow([`n${sec}`]);
      }
      if (left <= 0) { countedReps = secs; sayNow([pilW ? 'pil_done' : 'hold_done']); endSet(); }
    }, 100);
  }

  function endSet(manual = false) {
    clearInterval(timer); timer = null;
    videoFree();
    const sl = setLog(), it = item();
    if (it.unit === 'sec' && manual) {
      // נעצר מוקדם
      const shown = Number($('.counter .big')?.textContent || 0);
      sl.reps = Math.max(1, Math.round(sl.reps - shown));
    } else if (!manual || countedReps) sl.reps = countedReps || sl.reps;
    vibrate([40, 60, 40]);
    if (AUTO.has(it.role)) { sl.done = true; sl.rpe = it.rpe; return afterLog(); }
    mode = 'log';
    say('rate_set');
    paint();
  }

  function afterLog() {
    const sl = setLog(), it = item(), e = ex();
    sl.done = true;
    // אוטו־רגולציה בתוך האימון
    intraMsg = '';
    const nextSame = steps[k + 1] && steps[k + 1].ii === cur().ii ? log[cur().ii].sets[steps[k + 1].si] : null;
    if (nextSame && e.type === 'weight') {
      if (sl.rpe <= 6.5 && sl.reps >= it.reps[1] - 1) { nextSame.w = roundLoad(sl.w + e.inc, e); intraMsg = `היה קל — העליתי ל-${nextSame.w} ק״ג`; }
      else if (sl.rpe >= 10 && sl.reps < it.reps[0]) { nextSame.w = roundLoad(sl.w * 0.92, e); intraMsg = `הורדתי ל-${nextSame.w} ק״ג כדי לשמור על טכניקה`; }
      else nextSame.w = sl.w;
      nextSame.reps = Math.max(nextSame.reps, it.reps[0]);
    }
    if (k >= steps.length - 1) return finish();
    k++;
    rest(it.rest);
  }

  function rest(secs) {
    mode = 'rest';
    const nxt = steps[k];
    const nIt = items[nxt.ii], nEx = EX[nIt.exId];
    const newEx = nxt.ii !== steps[k - 1].ii;
    const prevRole = items[steps[k - 1].ii].role;
    const autoNext = ['warmup', 'cooldown', 'mob', 'hiit'].includes(nIt.role);
    if (prevRole === 'warmup' && nIt.role !== 'warmup') say('warm_done');
    if (nIt.role === 'skill' && prevRole !== 'skill') say('skill_intro');
    else if (nIt.role === 'cooldown' && prevRole !== 'cooldown') say('cool_intro');
    // חימום/מתיחות: מציגים ומכריזים על התנועה הבאה כבר בתחילת ההפסקה — לא אחרי שהשעון שלה התחיל
    if (autoNext && nIt.role === 'hiit') {
      showExercise(); paintTop();
      // תחילת סבב חדש: ליה מכריזה; אחרת רק שם התרגיל הבא (בסבב הראשון — עם דגש הביצוע)
      if (prevRole === 'hiit' && nxt.si !== steps[k - 1].si) say(nxt.si === nIt.sets - 1 ? 'hiit_last' : 'hiit_round');
      else if (prevRole === 'hiit') say('next_ex');
      say(`ex_${nIt.exId}`);
    } else if (autoNext && nIt.role === 'mob' && !newEx) { paintTop(); say('mob_again'); }
    else if (autoNext && nIt.role === 'mob') {
      showExercise(); paintTop();
      // מעבר מהפתיחה בתנועה להחזקות, ולנשימה שבסוף — תמר מסבירה מה משתנה
      const pk = EX[items[steps[k - 1].ii].exId]?.kind;
      if (k === steps.length - 1) say('mob_close'); else if (pk === 'dynamic' && nEx.kind === 'static' && !root._holdSaid) { root._holdSaid = true; say('mob_hold'); say('mob_no_pain'); } else say('next_ex');
      say(`ex_${nIt.exId}`);
    } else if (autoNext) { showExercise(); paintTop(); if (prevRole === nIt.role) say('next_ex'); say(`ex_${nIt.exId}`); }
    else if (!autoNext && prevRole !== 'warmup') say('set_done');
    if (secs >= 40 && !autoNext) say(Math.random() < 0.45 ? MOTIVATION_KEYS[Math.floor(Math.random() * MOTIVATION_KEYS.length)] : 'rest');
    const p = $('.panel');
    p.innerHTML = html`<div class="counter">${ring(1, { size: 190, stroke: 14, big: fmtTime(secs), lbl: autoNext ? (nIt.role === 'hiit' && prevRole === 'hiit' ? 'מנוחה' : nIt.role === 'mob' ? 'עוברים' : 'מתכוננים') : 'מנוחה', color: 'var(--acc)' })}</div>
      <div class="row"><button class="btn sm" data-act="rest-minus">−15</button><span class="spacer"></span>
        <button class="btn sm teal" data-act="rest-skip">${icon('skip', 'width="16" height="16"')} דלג</button><span class="spacer"></span>
        <button class="btn sm" data-act="rest-plus">+30</button></div>
      <div class="next-up"><img src="${demoPoster(coach, nIt.exId)}" alt=""><div><div class="sub" style="font-size:12px">${newEx ? 'תרגיל הבא' : 'הסט הבא'}</div>
        <b>${esc(nEx.name)}</b> · <span class="num">${log[nxt.ii].sets[nxt.si].w ? `${log[nxt.ii].sets[nxt.si].w} ק״ג × ` : ''}${log[nxt.ii].sets[nxt.si].reps}</span></div></div>`;
    let end = Date.now() + secs * 1000;
    let lastSec = -1;
    let total = secs;
    const restStart = Date.now();
    let hrReady = false, hrExtended = false;
    root._restAdj = (d) => { end += d * 1000; };
    root._restSkip = () => { end = Date.now(); };
    timer = setInterval(() => {
      const left = Math.max(0, (end - Date.now()) / 1000);
      const node = $('.counter .ring');
      if (node) { setRing(node, left / total); node.querySelector('.big').textContent = fmtTime(left); }
      // מנוחה חכמה לפי דופק
      const hr = hrNow().hr;
      if (hr) {
        const z = zoneOf(hr, hrMax);
        if (!hrReady && z.z <= 2 && Date.now() - restStart > 40000 && left > 8) {
          hrReady = true; say('hr_ready');
          const n = root.querySelector('.counter .lbl'); if (n) n.textContent = '❤ התאוששת';
        }
        if (!hrExtended && left <= 4 && left > 3 && z.pct >= 88) { hrExtended = true; end += 15000; total += 15; say('hr_high'); }
      }
      const sec = Math.ceil(left);
      if (sec !== lastSec) {
        lastSec = sec;
        if (sec === 30 && total >= 60) say('rest_30');
        if (sec === 10 && total >= 25) say('rest_10');
        if (sec <= 3 && sec >= 1 && !autoNext) { sayNow([`n${sec}`]); vibrate(20); }
      }
      if (left <= 0) {
        clearInterval(timer); timer = null;
        mode = 'ready';
        if (autoNext) { paint(); startSet(); return; }
        if (newEx) { say('next_ex'); say(`ex_${nIt.exId}`); } else {
          const last = nxt.si === nIt.sets - 1;
          say(last ? 'last_set' : `set${Math.min(6, nxt.si + 1)}`);
        }
        paint();
      }
    }, 200);
  }

  // ───── סיום ─────
  function finish(partial = false) {
    clearInterval(timer); timer = null;
    mode = 'summary';
    const st = get();
    const dur = Math.round((Date.now() - t0) / 1000);
    const exercises = [];
    const prs = [];
    let volume = 0, setsDone = 0, repsTotal = 0;
    let ladderChanges = [];
    const mobilityDone = { warmup: 0, cooldown: 0 };
    items.forEach((it, ii) => {
      const done = log[ii].sets.filter((x) => x.done);
      if (!done.length) return;
      if (it.role === 'warmup' || it.role === 'cooldown') { mobilityDone[it.role]++; return; }
      setsDone += done.length;
      done.forEach((x) => (volume += (x.w || 0) * (it.unit === 'sec' ? 0 : x.reps)));
      exercises.push({ exId: it.exId, role: it.role, sets: done, target: it.reps, ...(it.ladder ? { ladder: it.ladder, planned: it.sets, ...(it.vol ? { vol: true } : {}) } : {}), ...(it.unit === 'sec' ? { unit: 'sec' } : {}) });
      if (it.unit !== 'sec') done.forEach((x) => (repsTotal += x.reps || 0));
      if (it.role !== 'finisher' && EX[it.exId].type === 'weight' && isPR(it.exId, done, st.history[it.exId])) prs.push(it.exId);
    });
    if (!exercises.length) { close(); return; }
    let gained = XP.workout + prs.length * XP.pr;
    const hr = hrRec.stop();
    const nowIso = new Date().toISOString(), sid = `s_${Date.now()}`;
    set((s2) => {
      for (const e of exercises) {
        if (e.role === 'finisher' || e.role === 'mob' || e.role === 'hiit') continue;
        (s2.history[e.exId] ||= []).push({ date: nowIso, sid, sets: e.sets, target: e.target });
      }
      s2.sessions.push({ id: sid, date: nowIso, name: w.name, ...(caliW ? { track: 'cali' } : mobW ? { track: 'mob' } : hiitW ? { track: 'hiit' } : pilW ? { track: 'pil' } : yogaW ? { track: 'yoga' } : {}), day: workout.day ?? null, field: !!workout.field, durationSec: dur, volume: Math.round(volume), setsDone, exercises, prs, warmupDone: mobilityDone.warmup, stretchDone: mobilityDone.cooldown, readiness: w.readiness ?? null, partial, hr });
      if (workout.day != null && !partial && !s2.plan.completedDays.includes(workout.day)) s2.plan.completedDays.push(workout.day);
      // קליסתניקס: עלייה/ירידה בסולמות לפי הביצוע, והשבוע נבנה מחדש עם השלבים החדשים
      if (hasCali(s2.profile) && caliW) {
        ladderChanges = applyCaliSession(s2.profile.cali, exercises);
        const moved = ladderChanges.filter((c) => c.type === 'up' || c.type === 'down');
        s2.sessions[s2.sessions.length - 1].ups = ladderChanges.filter((c) => c.type === 'up').length;
        if (isCali(s2.profile)) s2.profile.level = caliLevel(s2.profile.cali);
        if (moved.length) {
          regenerateWeek(s2);
          s2.events = [...moved.map((c) => ({ type: c.type === 'up' ? 'level' : 'coach', date: nowIso,
            text: c.type === 'up' ? `עלית שלב ב${LADDERS[c.lid].name}: ${EX[c.to].name}` : `ירדנו שלב ב${LADDERS[c.lid].name}: ${EX[c.to].name} — בונים בסיס וחוזרים` })), ...s2.events].slice(0, 30);
        }
      }
      return s2;
    });
    prs.forEach((id) => pushEvent({ type: 'pr', text: `שיא אישי ב${EX[id].name}!` }));
    pingWorkout();
    const rk = addXP(gained, 'workout');
    const weekMsg = maybeAdvanceWeek();

    stop();
    say(prs.length ? 'pr' : 'workout_done', { priority: true });
    if (prs.length) say('workout_done');
    if (ladderChanges.some((c) => c.type === 'up')) say('rung_up'); else if (ladderChanges.some((c) => c.type === 'gated')) say('rung_wait');
    confetti(prs.length ? 140 : 80);
    try { wakeLock?.release(); } catch { /* */ }

    video.pause();
    root.querySelector('.stage').style.flex = '0 0 34%';
    $('.title').innerHTML = html`<div class="eyebrow">משימה הושלמה</div><div class="name">${esc(w.name)} ✓</div>`;
    $('.progress').innerHTML = '';
    $('.panel').innerHTML = html`
      <div class="kpis" style="margin-top:8px">
        <div class="kpi"><b>${fmtTime(dur)}</b><span>זמן</span></div>
        <div class="kpi"><b>${hiitW ? Math.max(...exercises.map((x) => x.sets.length)) : flowW ? exercises.length : setsDone}</b><span>${hiitW ? 'סבבים' : yogaW ? 'תנוחות' : flowW ? 'תרגילים' : 'סטים'}</span></div>
        ${hiitW ? `<div class="kpi up"><b>${Math.round(exercises.reduce((t, x) => t + x.sets.reduce((a, y) => a + (y.reps || 0), 0), 0) / 60)}</b><span>דקות עבודה</span></div>` : pilW || yogaW ? `<div class="kpi up"><b>${Math.round(exercises.reduce((t, x) => t + x.sets.reduce((a, y) => a + (y.reps || 0), 0), 0) / 60)}</b><span>דקות תנועה</span></div>` : mobW ? `<div class="kpi up"><b>${new Set(exercises.map((x) => regionOf(x.exId)).filter((r) => r && r !== 'calm')).size}</b><span>אזורים</span></div>` : caliW ? `<div class="kpi up"><b>${repsTotal}</b><span>חזרות</span></div>` : `<div class="kpi up"><b>${Math.round(volume).toLocaleString('he-IL')}</b><span>ק״ג נפח</span></div>`}</div>
      ${ladderChanges.length ? html`<div class="card tight" style="margin-top:12px">${ladderChanges.map((c) => `<div class="row" style="padding:5px 0;align-items:flex-start">${ib(c.type === 'up' ? 'rocket' : c.type === 'down' ? 'refresh' : c.type === 'top' ? 'crown' : 'clock', c.type === 'up' || c.type === 'top' ? 'pri' : 'acc')}<div style="flex:1;min-width:0"><b>${esc(LADDERS[c.lid].name)}: ${
    c.type === 'up' ? `עלית שלב — ${esc(EX[c.to].name)}` : c.type === 'down' ? `יורדים שלב — ${esc(EX[c.to].name)}` : c.type === 'top' ? 'ראש הסולם!' : 'היעד הושג'}</b><div class="sub" style="font-size:13px">${
    c.type === 'up' ? 'מהאימון הבא. מתחילים מהיעד המינימלי ובונים מחדש.' : c.type === 'down' ? 'שני אימונים מתחת ליעד. בונים בסיס וחוזרים — זה חלק מהדרך.' : c.type === 'top' ? 'השלב האחרון בסולם הושלם. ממשיכים לשמר ולהוסיף חזרות.'
    : c.type === 'gated' ? `נשארים בשלב עוד ${c.daysLeft} ימים — גידים מסתגלים לאט יותר מהשריר.` : 'עוד אימון אחד כזה — ועולים שלב.'}</div></div></div>`)}</div>` : ''}
      ${hrSummaryHtml(hr)}
      ${prs.length ? html`<div class="card tight" style="margin-top:12px">${prs.map((id) => `<div class="row" style="padding:4px 0"><span class="pr-badge">PR</span><b>${esc(EX[id].name)}</b><span class="spacer"></span><span class="num">${bestSet(exercises.find((x) => x.exId === id).sets).w} ק״ג</span></div>`)}</div>` : ''}
      <div class="card tight" style="margin-top:12px"><div class="row">${ib('star', 'pri', 'lg')}<div><b>+${gained} XP</b>${rk.rankUp ? `<div class="sub">דרגה חדשה: ${rk.rankUp.name}!</div>` : ''}</div></div>
        ${weekMsg ? `<div class="sub" style="margin-top:8px;color:var(--pri-ink);font-weight:700">${esc(weekMsg)}</div>` : ''}</div>
      ${workout.run && !partial ? `<button class="btn teal block xl" style="margin-top:14px" data-act="run-now">${icon('run')} המשך לריצה: ${esc(workout.run.name)}</button>` : ''}
      <button class="btn primary block xl" style="margin-top:10px" data-act="close">סיום</button>`;
  }

  function close() {
    clearInterval(timer); clearInterval(clock); offSpeak(); stop(); stopMusic();
    if (tvOn) tvMode(false);
    useCoach(null);
    pill._destroy?.(); hrRec.stop();
    try { wakeLock?.release(); } catch { /* */ }
    root.remove();
    document.body.style.overflow = '';
    dispatchEvent(new HashChangeEvent('hashchange'));
  }

  // ───── אירועים ─────
  on(root, 'click', '[data-act]', (e, t) => {
    const a = t.dataset.act;
    if (a === 'go') startSet();
    if (a === 'skip-warm') {
      const first = steps.findIndex((x) => items[x.ii].role !== 'warmup');
      if (first > k) { k = first; stop(); say('next_ex'); say(`ex_${item().exId}`); mode = 'ready'; paint(); }
    }
    if (a === 'skip-cool') finish();
    if (a === 'low') {
      // מחליפים לגרסה בלי קפיצות — לכל הסבבים שנשארו
      const alt = lowAlt(item().exId);
      if (alt) { item().exId = alt; lastExShown = -1; say('hiit_low', { priority: mode !== 'active' }); if (mode === 'active') { showExercise(); paintTop(); t.remove(); } else { say(`ex_${alt}`); paint(); } }
    }
    if (a === 'skip-ex') {
      const ii = cur().ii; let nk = k; while (nk < steps.length && steps[nk].ii === ii) nk++;
      if (nk >= steps.length) return finish();
      k = nk; stop(); say('next_ex'); say(`ex_${item().exId}`); mode = 'ready'; paint();
    }
    if (a === 'manual') { countedReps = setLog().reps; mode = 'log'; paint(); }
    if (a === 'finish-set') endSet(true);
    if (a === 'rest-skip') root._restSkip?.();
    if (a === 'rest-plus') root._restAdj?.(30);
    if (a === 'rest-minus') root._restAdj?.(-15);
    if (a === 'info') infoSheet(item().exId, coach);
    if (a === 'swap') swapSheet();
    if (a === 'tv') tvMode(!tvOn);
    if (a === 'music') {
      set((s2) => { s2.settings.music = !musicOn(); s2.settings.musicHint = true; return s2; });
      if (musicOn()) startMusic(workout.track); else stopMusic();
      t.classList.toggle('off', !musicOn()); t.setAttribute('aria-pressed', musicOn());
      toast(musicOn() ? 'מוזיקת רקע פועלת' : 'מוזיקת הרקע כובתה', 1400);
    }
    if (a === 'voice') {
      set((s2) => { s2.settings.voice = !s2.settings.voice; return s2; });
      if (!get().settings.voice) stop();
      t.innerHTML = icon(get().settings.voice ? 'vol' : 'mute', 'width="20" height="20"');
    }
    if (a === 'exit') {
      if (mode === 'summary') return close();
      const any = log.some((l) => l.sets.some((x) => x.done));
      sheet(html`<div class="h1" style="font-size:22px">לצאת מהאימון?</div><p class="sub">${any ? 'אפשר לשמור את מה שעשית עד עכשיו.' : 'עוד לא נרשם אף סט.'}</p>
        ${any ? '<button class="btn primary block" data-x="save">סיים ושמור</button>' : ''}
        <button class="btn block" style="margin-top:8px" data-x="quit">צא בלי לשמור</button>
        <button class="btn ghost block" style="margin-top:8px" data-close>המשך להתאמן</button>`, {
        onMount(sh, closeSheet) {
          on(sh, 'click', '[data-x]', (ev, b) => { closeSheet(); b.dataset.x === 'save' ? finish(true) : close(); });
        },
      });
    }
    if (a === 'close') close();
    if (a === 'run-now') { close(); startRun(workout.run, { day: workout.day }); }
  });
  on(root, 'click', '[data-w]', (e, t) => {
    const sl = setLog(), ex1 = ex();
    const step = ex1.inc >= 5 ? 2.5 : ex1.inc >= 2 ? 1 : 0.5;
    sl.w = Math.max(0, Math.round((sl.w + (t.dataset.w === '+' ? step : -step)) * 10) / 10);
    // עדכון גם לסטים הבאים של אותו תרגיל
    log[cur().ii].sets.forEach((x, i) => { if (i > cur().si && !x.done) x.w = sl.w; });
    t.parentElement.querySelector('.val span').textContent = sl.w;
  });
  on(root, 'click', '[data-r]', (e, t) => {
    const sl = setLog();
    const step = item().unit === 'sec' && sl.reps >= 20 ? 5 : 1;
    sl.reps = Math.max(1, sl.reps + (t.dataset.r === '+' ? step : -step));
    t.parentElement.querySelector('.val span').textContent = sl.reps;
  });
  on(root, 'click', '[data-rpe]', (e, t) => {
    setLog().rpe = Number(t.dataset.rpe);
    vibrate(20);
    afterLog();
  });

  function swapSheet() {
    const cur1 = item();
    const blocked = blockedSet(profile);
    const used = new Set(items.map((x) => x.exId));
    const e = EX[cur1.exId];
    if (cur1.ladder) return ladderSwap(cur1);
    // רק תרגילים של המסלול הנוכחי (יש להם הדגמה וקול של המאמן), ובקליסתניקס — רק מה שאפשר עם הציוד שיש
    const track = caliW ? 'cali' : 'gym';
    const opts = EXERCISES.filter((x) => x.id !== e.id && !blocked.has(x.id) && !used.has(x.id) && x.tracks.includes(track) && (track === 'gym' || canDo(x.id, profile.cali.equip))
      && (e.alts.includes(x.id) || x.pattern === e.pattern || x.group === e.group) && x.type !== 'cardio' && x.group !== 'mobility');
    sheet(html`<div class="h1" style="font-size:22px">החלפת תרגיל</div><p class="sub">המכשיר תפוס? יש כאב? בחר חלופה שעובדת על אותם שרירים.</p>
      ${opts.slice(0, 8).map((x) => html`<button class="ex-row" style="width:100%;text-align:right" data-sw="${x.id}">
        <div class="ex-thumb"><img src="${demoPoster(coach, x.id)}" alt=""></div><div><div class="t">${esc(x.name)}</div><div class="s">${esc(x.equip)}</div></div></button>`)}`, {
      onMount(sh, closeSheet) {
        on(sh, 'click', '[data-sw]', (ev, b) => {
          const id = b.dataset.sw;
          cur1.exId = id;
          const sg = suggest(id, cur1, get().history[id], profile);
          const L = log[cur().ii];
          L.sg = sg;
          L.sets.forEach((x) => { if (!x.done) { x.w = sg.w || 0; x.reps = sg.reps; } });
          lastExShown = -1;
          closeSheet(); say(`ex_${id}`, { priority: true }); paint();
        });
      },
    });
  }

  // קליסתניקס: מחליפים לשלב אחר באותו סולם (קל יותר / קשה יותר) — רק לאימון הזה
  function ladderSwap(cur1) {
    const st = rungState(profile.cali, cur1.ladder);
    const blocked = blockedSet(profile);
    const here = st.list.findIndex((r) => r.id === cur1.exId);
    const opts = st.list.map((r, i) => ({ r, i })).filter((x) => x.r.id !== cur1.exId && !blocked.has(x.r.id));
    sheet(html`<div class="eyebrow">${esc(LADDERS[cur1.ladder].name)}</div><div class="h1" style="font-size:22px">שלב אחר בסולם</div>
      <p class="sub">קשה מדי היום, או קל מדי? בחירה כאן משנה רק את האימון הזה. לשינוי קבוע: מסך התוכנית ← הסולמות שלי.</p>
      ${opts.map(({ r, i }) => html`<button class="ex-row" style="width:100%;text-align:right" data-sw="${r.id}">
        <div class="ex-thumb"><img src="${demoPoster(coach, r.id)}" alt=""></div><div><div class="t">${esc(EX[r.id].name)}</div><div class="s">${i < here ? 'קל יותר' : 'קשה יותר'} · שלב ${i + 1} מתוך ${st.n}</div></div></button>`)}`, {
      onMount(sh, closeSheet) {
        on(sh, 'click', '[data-sw]', (ev, b) => {
          const r = st.list.find((x) => x.id === b.dataset.sw), ex2 = EX[r.id];
          cur1.exId = r.id; cur1.reps = [r.lo, r.hi];
          if (ex2.hold || ex2.type === 'time') cur1.unit = 'sec'; else delete cur1.unit;
          const sg = suggest(r.id, cur1, get().history[r.id], profile);
          const L = log[cur().ii];
          L.sg = sg;
          L.sets.forEach((x) => { if (!x.done) { x.w = 0; x.reps = sg.reps; } });
          lastExShown = -1;
          closeSheet(); say(`ex_${r.id}`, { priority: true }); paint();
        });
      },
    });
  }

  // פתיחה
  // מוזיקת רקע בשיעורים (יוגה, פילאטיס, מוביליטי) — רק למי שהפעיל; בפעם הראשונה מזכירים שיש כפתור
  if (hasMusic(workout.track)) {
    if (musicOn()) startMusic(workout.track);
    else if (!get().settings.musicHint) { set((s2) => { s2.settings.musicHint = true; return s2; }); setTimeout(() => root.isConnected && toast('רוצים מוזיקת רקע? כפתור התו למעלה', 3200), 5000); }
  }
  say(pilW ? 'pil_hello' : `hello_${coach}`, { priority: true });
  if (items[0].role === 'warmup') say('warm_intro');
  if (flowW) say('mob_intro');
  // התרגיל הראשון: כשהוא תנועת חימום / מתיחה לפי זמן, המאמן מציג אותו רק כשלוחצים "התחל" — לא לפני, ולא פעמיים
  if (!deferFirst) say(`ex_${items[0].exId}`);
  if (w.note) toast(w.note, 4200);
  paint();
}

export function infoSheet(exId, coach) {
  const e = EX[exId];
  sheet(html`<video src="${demoVideo(coach, exId)}" poster="${demoPoster(coach, exId)}" muted playsinline loop autoplay style="width:100%;height:46vh;object-fit:contain;background:#0b0c12;border-radius:18px"></video>
    <div class="h1" style="font-size:24px;margin-top:14px">${esc(e.name)}</div>
    <div class="chips" style="margin:8px 0">${e.muscles.map((m) => `<span class="tag lime">${MUSCLES[m]}</span>`)}<span class="tag">${esc(e.equip)}</span></div>
    <div class="h2" style="margin-top:14px">ביצוע נכון</div>
    ${e.cues.map((c, i) => `<div class="row" style="padding:6px 0;align-items:flex-start"><span class="tag teal num">${i + 1}</span><span>${esc(c)}</span></div>`)}
    ${LADDER_OF[exId] ? `<div class="sub" style="margin-top:10px">${icon('chart')} סולם ${LADDERS[LADDER_OF[exId]].name} · שלב ${LADDERS[LADDER_OF[exId]].rungs.findIndex((r) => r.id === exId) + 1} מתוך ${LADDERS[LADDER_OF[exId]].rungs.length}</div>` : ''}
    <div class="sub" style="margin-top:10px">${icon('clock')} ${e.mob ? (e.kind === 'static' ? `החזקה רגועה${e.unilateral ? ' — 30 שניות לכל צד' : ''}. מתיחה נעימה בלבד, בלי כאב ובלי קפיצות` : 'תנועה איטית ומבוקרת, בטווח שנוח היום') : e.type === 'time' ? (e.hold ? 'החזקה סטטית — עוצרים כשהטכניקה נשברת, לא כשנגמר הכוח' : 'תרגיל לפי זמן') : e.neg ? `שלילי: ${e.tempo[0]} שניות ירידה איטית, וחוזרים למעלה בעזרה` : `טמפו: ${e.tempo[0]} שנ׳ ירידה · ${e.tempo[1] ? `${e.tempo[1]} שנ׳ החזקה · ` : ''}${e.tempo[2]} שנ׳ עלייה`}</div>
    <button class="btn block" style="margin-top:16px" data-close>סגור</button>`);
}

// ───── התקדמות שבוע / בלוק / רמה ─────
export function maybeAdvanceWeek() {
  const s = get();
  if (s.plan.completedDays.length < s.plan.week.sessions.length) return '';
  let msg = 'שבוע הושלם! השבוע הבא נבנה לפי הביצועים שלך.';
  set((s2) => {
    s2.plan.weekInBlock += 1;
    if (s2.plan.weekInBlock >= 4) {
      s2.plan.weekInBlock = 0;
      s2.plan.blockIndex += 1;
      const ev = isCali(s2.profile) ? { change: 0, msg: 'ממשיכים בסולמות — כל סולם מתקדם בקצב שלו.' } : isYoga(s2.profile) ? (yogaLevelUp(s2.profile, s2.sessions) ? { change: 1, level: s2.profile.level + 1, msg: 'השלמת את רוב השיעורים — עולים רמה, ונפתחות תנוחות חדשות.' } : { change: 0, msg: 'ממשיכים באותה רמה. נשימה רגועה לפני תנוחות חדשות.' }) : isPil(s2.profile) ? (pilLevelUp(s2.profile, s2.sessions) ? { change: 1, level: s2.profile.level + 1, msg: 'השלמת את רוב השיעורים — עולים רמה, ונפתחים תרגילים חדשים.' } : { change: 0, msg: 'ממשיכים באותה רמה. דיוק לפני קושי.' }) : isHiit(s2.profile) ? (hiitLevelUp(s2.profile, s2.sessions) ? { change: 1, level: s2.profile.level + 1, msg: 'השלמת את רוב האימונים — עולים רמה: יותר עבודה, פחות מנוחה.' } : { change: 0, msg: 'נשארים באותה רמה עוד בלוק. התמדה לפני עצימות.' }) : s2.profile.track === 'run' ? { change: 0, msg: 'ארבעה שבועות של ריצה מאחוריך. הריצה הארוכה ממשיכה לגדול.' } : isMob(s2.profile) ? { change: 0, msg: 'ארבעה שבועות עברו — זה הזמן למבחן טווחים חוזר (מסך ההתקדמות).' } : evaluateLevel(s2.profile.level, blockStats(s2));
      if (ev.change) {
        s2.profile.level = ev.level;
        s2.events = [{ type: 'level', text: `רמה ${ev.level} (${isYoga(s2.profile) ? YOGA_LEVELS[ev.level] : isPil(s2.profile) ? PIL_LEVELS[ev.level] : LEVEL_NAMES[ev.level]}): ${ev.msg}`, date: new Date().toISOString() }, ...s2.events];
      }
      msg = `בלוק הושלם! ${ev.msg}`;
    }
    s2.plan.completedDays = [];
    s2.plan.weekStart = today();
    regenerateWeek(s2);
    return s2;
  });
  addXP(XP.perfectWeek, 'week');
  return msg;
}

function blockStats(s) {
  const since = Date.now() - 28 * 864e5;
  const sess = s.sessions.filter((x) => new Date(x.date).getTime() >= since && !x.field && x.track !== 'mob'); // אימוני מוביליטי לא נכנסים להערכת רמת הכוח
  const rpes = sess.flatMap((x) => x.exercises.flatMap((e) => e.sets.map((y) => y.rpe).filter(Boolean)));
  let progressed = 0, tracked = 0;
  for (const [, hist] of Object.entries(s.history)) {
    const inBlock = hist.filter((h) => new Date(h.date).getTime() >= since);
    if (inBlock.length < 2) continue;
    tracked++;
    if ((bestSet(inBlock[inBlock.length - 1].sets)?.e1rm || 0) > (bestSet(inBlock[0].sets)?.e1rm || 0)) progressed++;
  }
  return { planned: (s.profile.days - mobCount(s.profile)) * 4, completed: sess.length, progressed, tracked, avgRpe: rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : 8 };
}
