// מצב אימון חי: הדגמת וידאו של המאמן, ספירת חזרות בטמפו עם קול, מדידת מנוחות, רישום ביצועים
// והתאמת משקל בזמן אמת (אוטו־רגולציה בין סטים).
import { ctxStart, ctxMid, ctxEnd } from '../coach/context.js';
import { weekClosed } from '../engine/schedule.js';
import { track } from '../usage.js';
import { keepAlive, releaseKeepAlive, setKeepAliveState } from '../coach/keepalive.js';
import { html, esc, on, sheet, toast, confetti, vibrate, icon, fmtTime, el, ib } from '../ui/dom.js';
import { ring, setRing } from '../ui/charts.js';
import { get, set, addXP, XP, pushEvent, regenerateWeek, today } from '../store.js';
import { EX, EXERCISES, MUSCLES } from '../data/exercises.js';
import { COACHES, demoVideo, demoPoster } from '../data/coaches.js';
import { shareCard } from '../share-card.js';
import { suggest, isPR, roundLoad, nextSetLoad, bestSet, evaluateLevel } from '../engine/progression.js';
import { applyReadiness, blockedSet, LEVEL_NAMES, warmupFor, cooldownFor } from '../engine/program.js';
import { say, sayNow, resolve, clipDur, keyDur, stop, onSpeaking, preload, unlock, isSpeaking, coachId, useCoach } from '../coach/voice.js';
import { weightClip, weightChange, isRecordWeight } from '../data/weights.js';
import { hasMusic, musicOn, startMusic, stopMusic, setMusicMood } from '../coach/music.js';
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
import { isTai, taiLevelUp, TAI_LEVELS } from '../engine/tai.js';
import { isWalk, isMed, walkLevelUp, WALK_LEVELS } from '../engine/walking.js';
import { mjOf, mjStep, MJ_STAGES } from '../engine/med-journey.js';
import { taiClip } from '../data/tai-exercises.js';

const WARM_CHEER = ['m2', 'm5', 'm6', 'm9', 'm10'];
const RPE = [{ v: 6.5, e: icon('effort1'), t: 'קל' }, { v: 8, e: icon('effort2'), t: 'טוב' }, { v: 9, e: icon('effort3'), t: 'קשה' }, { v: 10, e: icon('effort4'), t: 'עד הקצה' }];

// נקודות לאימון (25.11.2026): אימון שהושלם — XP.workout. שמירה חלקית ("סיים ושמור" באמצע) — לפי חלק הסטים שבוצעו מתוך המתוכננים
// (בלי חימום ומתיחות, שלא נספרים גם ב-setsDone), ולפחות עשירית — כדי שעבודה אמיתית לא תהיה אפס. קודם שני סטים מתוך עשרים נתנו 120.
export const workoutXP = (partial, done, planned) => (partial ? Math.max(Math.round(XP.workout * 0.1), Math.round(XP.workout * Math.min(1, done / Math.max(planned, done, 1)))) : XP.workout);
// דף שנרדם באמצע סט (25.11.2026): פער של יותר מעשר שניות בין שתי פעימות של שעון הסט (טלפון נעול, האפליקציה ברקע) — כמה זמן להחזיר לשעון; פער קצר נספר כרגיל
export const SLEEP_GAP = 10000;
export const sleptFor = (last, now) => (last && now - last > SLEEP_GAP ? now - last : 0);

export function startWorkout(workout, { readiness = null, sized = false } = {}) {
  // מוביליטי: קודם בוחרים כמה זמן יש (10 / 20 / 30 דקות), והאימון נבנה לפי זה
  if (workout.track === 'mob' && !sized) { unlock(); return mobMinutesSheet(workout, (w) => startWorkout(w, { readiness, sized: true })); }
  const useKind = workout.track || (workout.field ? 'field' : 'gym');   // לסטטיסטיקת השימוש: רק שם התחום
  track(`start:${useKind}`);
  unlock();
  const s = get();
  const profile = s.profile;
  // המאמן של האימון הזה (במסלול משולב: מאיה בקליסתניקס, אורי/נועה בחדר הכושר) — גם מדגים וגם מדבר
  const coach = sessionCoach(profile, workout);
  const caliW = workout.track === 'cali', mobW = workout.track === 'mob', hiitW = workout.track === 'hiit', pilW = workout.track === 'pil', yogaW = workout.track === 'yoga', taiW = workout.track === 'tai';
  const flowW = mobW || pilW || yogaW || taiW;   // אימון רצף לפי זמן: מוביליטי, פילאטיס או יוגה
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

  // השהיה: שעון האימון (vnow) עוצר, וכל הטיימרים — תרגיל לפי זמן, מנוחה, ספירת חזרות וזמן האימון הכולל — נשענים עליו.
  // כך ההשהיה עובדת בכל תחום ובכל שלב, והזמן שעמדנו לא נספר.
  let pausedAt = 0, pauseShift = 0;
  const vnow = () => (pausedAt || Date.now()) - pauseShift;
  // דף שנרדם באמצע סט (25.11.2026): הזמן שהדף לא רץ לא נספר — לא לחזרות, לא להחזקה ולא לשעון האימון — והסט נעצר בהשהיה, במקום שבו היה.
  // קודם הפער נוסף לשעון: סט נספר שנרדם בחזרה 0 נרשם עם כל חזרות היעד, והחזקה בזמן הסתיימה כאילו בוצעה. במנוחה הפער נספר כרגיל (לנוח יותר זה בסדר).
  let lastTick = 0;
  const woke = () => {
    const now = Date.now(), gap = pausedAt ? 0 : sleptFor(lastTick, now);
    lastTick = now;
    if (!gap) return;
    pauseShift += gap; setPaused(true);
    toast('הסט נעצר כשהמסך היה סגור. "המשך" — וממשיכים מאותה נקודה.', 5000);
  };
  const t0 = vnow();
  let k = 0;            // צעד נוכחי
  let mode = 'ready';   // ready | active | log | rest | summary
  let timer = null;
  let wakeLock = null;
  let countedReps = 0;
  let lastExShown = -1;
  let intraMsg = '';
  // המשקל בקול (מאמני חדר הכושר, js/data/weights.js): בכניסה לתרגיל — המשקל של הסט; בין סטים של אותו תרגיל — רק כשהמשקל השתנה
  // ("מעלים משקל. ארבעים ושניים וחצי קילו"), ובשינוי ידני לפני הסט — המשקל החדש, אחרי שמפסיקים ללחוץ.
  let kgTimer = null;
  // משקל שיא (בקשת בעל המוצר, 23.11.2026): סט במשקל גבוה מכל מה שבוצע בתרגיל — המאמן אומר זאת אחרי המשקל, ומברך כשהסט בוצע. פעם אחת לתרגיל באימון
  const recAhead = new Set(), recDone = new Set();
  const recordAt = (ii, w) => { const it = items[ii]; return !!it && it.role !== 'finisher' && EX[it.exId]?.type === 'weight' && isRecordWeight(w, get().history[it.exId]); };
  const sayKg = (w, prev = 0, ii = null) => {
    const clip = weightClip(w, coachId());
    if (clip) { const ch = weightChange(w, prev); if (ch) say(ch); say({ clip, text: `${w} ק״ג` }); }
    if (ii != null && recordAt(ii, w) && !recAhead.has(ii)) { recAhead.add(ii); if (coachSays('w_record', coachId())) say('w_record'); toast(`משקל שיא בתרגיל הזה: ${w} ק״ג`, 3500); }
  };
  const sayStepKg = (st) => { const e = st && EX[items[st.ii].exId]; if (e && (e.type === 'weight' || e.load)) sayKg(log[st.ii].sets[st.si].w, 0, st.ii); };

  try { navigator.wakeLock?.request('screen').then((l) => (wakeLock = l)).catch(() => {}); } catch { /* */ }
  keepAlive({ title: workout.name || 'אימון', artist: COACHES[coach]?.name || '', artwork: COACHES[coach]?.face, togglePause: (v) => setPaused(v) });   // ממשיך גם כשהמסך נעול
  const hrRec = recorder(profile);
  const hrMax = maxHrFor(profile);
  // טעינה מראש של כל מה שהמאמן עשוי להגיד באימון הזה (ספירה 1–20, טמפו, סטים, מוטיבציה, שמות התרגילים)
  preload(['go', 'down', 'up', 'hold', 'pull', 'press', 'release', 'rest', 'rest_10', 'rest_30', 'set_done', 'two_more', 'last_rep', 'last_set',
    'next_ex', 'rate_set', 'warm_intro', 'warm_go', 'switch_side', 'warm_done', 'cool_intro', 'cool_done', 'hold_start', 'hold_half', 'hold_done', 'workout_done', 'pr', 'w_record', 'w_record_done', 'hr_ready', 'hr_high', `hello_${coach}`,
    ...Array.from({ length: 20 }, (_, i) => `n${i + 1}`), ...Array.from({ length: 6 }, (_, i) => `set${i + 1}`),
    ...(caliW ? ['slow_down', 'skill_intro', 'rung_up', 'rung_wait'] : []),
    ...(hiitW ? ['hiit_go', 'hiit_10', 'hiit_round', 'hiit_last', 'hiit_low'] : []),
    ...(pilW ? ['pil_hello', 'pil_half', 'pil_done'] : []),
    ...(flowW ? ['mob_intro', 'mob_hold', 'mob_again', 'mob_breathe', 'mob_no_pain', 'mob_close'] : []),
    ...MOTIVATION_KEYS, ...items.map((it) => `ex_${it.exId}`), ...items.filter((it) => MOBILITY_TIPS[it.exId]).map((it) => `tip_${it.exId}`),
    ...items.flatMap((it) => (EX[it.exId].steps || []).filter((x) => x[0]).map((x) => `tc_${x[0]}`))].filter((key) => coachSays(key, coach))); // רק מה שהמאמן הזה באמת אומר

  const mKey = workout.track || 'gym';   // איזו מוזיקה: לפי סוג האימון; אימון בלי סוג הוא אימון חדר כושר
  // אופי התרגיל הנוכחי — לפיו נבחרת המוזיקה (coach/music.js)
  const musicMood = () => {
    const it = item(), e = ex();
    if (it.role === 'warmup') return 'warm';
    if (it.role === 'cooldown') return 'calm';
    if (workout.track === 'yoga' || workout.track === 'pil' || workout.track === 'mob' || workout.track === 'tai') return workout.track;
    if (it.role === 'hiit' || it.role === 'finisher') return 'high';
    if (it.role === 'skill' || e?.pattern === 'core' || e?.hold) return 'focus';
    return workout.track === 'cali' ? 'groove' : 'power';
  };
  const deferFirst = ['warmup', 'mob', 'cooldown'].includes(items[0]?.role) && items[0]?.unit === 'sec';
  let firstShown = false, firstWait = false, shareData = null;
  const root = el(`<div class="live" role="dialog" aria-label="אימון חי">
    <div class="stage"><img class="stage-bg" alt="" aria-hidden="true"><img class="poster" alt=""><video muted playsinline loop autoplay preload="auto"></video>
      <div class="paused-badge">מושהה</div>
      <div class="hud-top"><button class="icon-btn" data-act="exit" aria-label="יציאה">${icon('close', 'width="20" height="20"')}</button>
        <button class="icon-btn" data-act="pause" id="pauseHud" aria-label="השהיה והמשך" aria-pressed="false">${icon('pause', 'width="20" height="20"')}</button>
        <div class="progress"></div><span class="clock num">0:00</span>
        <button class="icon-btn" data-act="tv" aria-label="מצב טלוויזיה">${icon('tv', 'width="20" height="20"')}</button>
        ${hasMusic(mKey) ? `<button class="icon-btn ${musicOn() ? '' : 'off'}" data-act="music" aria-label="מוזיקת רקע" aria-pressed="${musicOn()}">${icon('music', 'width="20" height="20"')}</button>` : ''}
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
  const clock = setInterval(() => { $('.clock').textContent = fmtTime((vnow() - t0) / 1000); }, 1000);

  const cur = () => steps[k];
  const item = () => items[cur().ii];
  const ex = () => EX[item().exId];
  const setLog = () => log[cur().ii].sets[cur().si];

  function showExercise() {
    const ii = cur().ii;
    if (ii === lastExShown) return;
    lastExShown = ii;
    setMusicMood(musicMood());   // המוזיקה הולכת עם אופי התרגיל
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
            <div class="stepper"><button data-w="-">−</button><div class="val" data-act="wedit" role="button" aria-label="הקלדת משקל"><span data-wshow>${sl.w}</span><small>ק״ג</small></div><button data-w="+">+</button></div></div>` : ''}
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
      p.innerHTML = html`<div class="counter cnt-set">${ring(0, { size: 190, stroke: 14, big: timed ? sl.reps : '0', lbl: timed ? 'שניות' : `מתוך ${sl.reps}` })}
        <div class="phase-lbl" id="ph">היכון…</div>
        ${!timed && it.role !== 'hiit' ? `<div class="set-ctx">${e.type === 'weight' || e.load ? `<button class="w-edit" data-act="wedit" aria-label="שינוי המשקל"><b class="num" data-wshow>${sl.w}</b> ק״ג ${icon('edit', 'width="14" height="14"')}</button> · ` : ''}סט <b class="num">${cur().si + 1}</b> מתוך <b class="num">${log[cur().ii].sets.length}</b></div>` : ''}</div>
        ${timed && AUTO.has(it.role) ? `<button class="btn block xl" data-act="pause" data-pause-main>${icon('pause', 'width="22" height="22"')} השהה</button>
        <button class="btn sm ghost block" style="margin-top:8px" data-act="finish-set">${icon('skip', 'width="16" height="16"')} דלג לתרגיל הבא</button>`
    : `<button class="btn block xl" data-act="finish-set">${timed ? 'עצור' : 'סיימתי את הסט'}</button>`}
        ${it.role === 'hiit' && lowAlt(it.exId) ? `<button class="btn sm ghost block" style="margin-top:8px" data-act="low">${icon('swap', 'width="16" height="16"')} קשה על המפרקים? גרסה בלי קפיצות</button>` : ''}`;
    } else if (mode === 'log') {
      p.innerHTML = html`<div class="h2" style="margin:6px 0 10px">איך היה?</div>
        <div class="target">
          ${e.type === 'weight' || e.load ? html`<div><div class="stepper"><button data-w="-">−</button><div class="val" data-act="wedit" role="button" aria-label="הקלדת משקל"><span data-wshow>${sl.w}</span><small>ק״ג</small></div><button data-w="+">+</button></div></div>` : ''}
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
    // לחצו "התחל" בזמן הברכה: הצגת התרגיל הראשון לא נזרקת מהתור, והשעון מחכה לה
    firstWait = deferFirst && !firstShown && k === 0;
    if (firstWait) { say(`ex_${item().exId}`, { keep: true }); sayStepKg(steps[k]); }
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
    const startAt = vnow() + Math.max(1500, goDur * 1000);
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
    lastTick = 0;
    timer = setInterval(() => {
      woke();
      const t = vnow() - startAt;
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
    let startAt = mobility ? null : vnow() + 1200;
    // תרגיל זמן סטטי (פלאנק, נשיאה): "מתחילים להחזיק… עכשיו!"; דינמי (סקוואט, ברכיים גבוהות, חבלים): "מתחילים!"
    if (!mobility) say(role === 'hiit' ? 'hiit_go' : e?.pattern === 'core' || e?.hold || e?.id === 'farmer_carry' ? 'hold_start' : 'warm_go', { priority: true });
    const hiit = role === 'hiit', firstRound = hiit && cur().si === 0;
    let ten = false;
    const sides = e?.unilateral && (mobility || e?.hold); // החזקה חד־צדדית: מחליפים צד באמצע
    const waitUntil = vnow() + (firstWait ? 32000 : 15000);
    let lastSec = -1, half = false, cheered = false, tipped = false, breathed = false;
    // טאי צ'י: ההנחיות של התנועה נאמרות אחת אחת לאורך התרגול, ועם כל הנחיה מוצג הסרטון שלה (מלפנים / מהצד / הצד השני)
    const taiSteps = e?.tai ? e.steps || [] : null;
    const taiAt = (i) => (taiSteps.every((x) => !x[0]) ? secs / 2 : 3 + i * ((secs - 10) / taiSteps.length));
    let taiI = 0;
    if (taiSteps) half = breathed = true;   // בלי "ממשיכים" ובלי תזכורת נשימה: ההנחיות שלה ממלאות את הזמן
    lastTick = 0;
    timer = setInterval(() => {
      woke();
      if (startAt == null) {
        if (isSpeaking() && vnow() < waitUntil) { $('#ph').textContent = 'מתכוננים…'; return; }
        say('warm_go');
        startAt = vnow() + (get().settings.voice ? keyDur('warm_go') * 1000 + 150 : 600);
      }
      const t = (vnow() - startAt) / 1000;
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
        if (taiSteps && taiI < taiSteps.length && t >= taiAt(taiI)) {
          const [line, clip] = taiSteps[taiI++];
          if (clip) { video.src = demoVideo(coach, taiClip(e, clip)); video.play().catch(() => {}); }
          if (line) say(`tc_${line}`);
        }
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

  function setPaused(v) {
    if (!!pausedAt === v) return;
    if (v) { pausedAt = Date.now(); stop(); video.pause(); stopMusic(); }
    else { if (Date.now() - pausedAt > 20000) { const cr = ctxMid('resume', coach); if (cr) say(cr); } pauseShift += Date.now() - pausedAt; pausedAt = 0; video.play().catch(() => {}); if (musicOn()) startMusic(musicMood()); }
    root.classList.toggle('is-paused', v); setKeepAliveState(v);
    $('#pauseHud').innerHTML = icon(v ? 'play' : 'pause', 'width="20" height="20"'); $('#pauseHud').setAttribute('aria-pressed', v);
    const main = $('[data-pause-main]'); if (main) main.innerHTML = v ? `${icon('play', 'width="22" height="22"')} המשך` : `${icon('pause', 'width="22" height="22"')} השהה`;
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
      const adj = nextSetLoad(sl, it, e);
      // חל על כל הסטים שנותרו בתרגיל, כמו שינוי ידני
      log[cur().ii].sets.forEach((x, j) => { if (j > cur().si && !x.done) x.w = adj.w; });
      if (adj.why === 'up') intraMsg = `היה קל — העליתי ל-${adj.w} ק״ג`;
      else if (adj.why === 'down') intraMsg = `הורדתי ל-${adj.w} ק״ג כדי לשמור על טכניקה`;
      nextSame.reps = Math.max(nextSame.reps, it.reps[0]);
    }
    if (k >= steps.length - 1) return finish();
    k++;
    // באמצע האימון: "חצי מאחורינו"; ובכניסה לתרגיל האחרון (לא מתיחות): "תרגיל אחרון"
    { const mainIdx = items.map((x, j) => (['warmup', 'cooldown'].includes(x.role) ? -1 : j)).filter((j) => j >= 0), lastMain = mainIdx[mainIdx.length - 1];
      const cm = steps[k].ii === lastMain && steps[k - 1].ii !== lastMain && mainIdx.length > 2 ? ctxMid('last_ex', coach) : k === Math.ceil(steps.length / 2) && steps.length >= 8 ? ctxMid('half', coach) : null;
      if (cm) say(cm); }
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
    else if (!autoNext && prevRole !== 'warmup') {
      // הסט שהסתיים היה במשקל שיא: ברכה במקום "סט נגמר"
      const pi = steps[k - 1].ii, ps = log[pi].sets[steps[k - 1].si];
      if (ps.done && ps.reps > 0 && recordAt(pi, ps.w) && !recDone.has(pi)) { recDone.add(pi); recAhead.add(pi); toast(`שיא משקל חדש: ${ps.w} ק״ג`, 3500); say(coachSays('w_record_done', coachId()) ? 'w_record_done' : 'set_done'); }
      else say('set_done');
    }
    // הסט הבא באותו תרגיל במשקל אחר (התאמה אוטומטית אחרי הדירוג, או שינוי ידני): אומרים כבר בתחילת המנוחה, כדי שיהיה זמן להחליף
    if (!autoNext && !newEx && nxt.si > 0) { const w = log[nxt.ii].sets[nxt.si].w, prev = log[nxt.ii].sets[nxt.si - 1].w; if (weightChange(w, prev)) sayKg(w, prev, nxt.ii); }
    if (secs >= 40 && !autoNext) say(Math.random() < 0.25 ? MOTIVATION_KEYS[Math.floor(Math.random() * MOTIVATION_KEYS.length)] : 'rest');
    const p = $('.panel');
    p.innerHTML = html`<div class="counter">${ring(1, { size: 190, stroke: 14, big: fmtTime(secs), lbl: autoNext ? (nIt.role === 'hiit' && prevRole === 'hiit' ? 'מנוחה' : nIt.role === 'mob' ? 'עוברים' : 'מתכוננים') : 'מנוחה', color: 'var(--acc)' })}</div>
      <div class="row"><button class="btn sm" data-act="rest-minus">−15</button><span class="spacer"></span>
        <button class="btn sm teal" data-act="rest-skip">${icon('skip', 'width="16" height="16"')} דלג</button><span class="spacer"></span>
        <button class="btn sm" data-act="rest-plus">+30</button></div>
      <div class="next-up"><img src="${demoPoster(coach, nIt.exId)}" alt=""><div><div class="sub" style="font-size:12px">${newEx ? 'תרגיל הבא' : 'הסט הבא'}</div>
        <b>${esc(nEx.name)}</b> · <span class="num">${log[nxt.ii].sets[nxt.si].w ? `<span data-wshow>${log[nxt.ii].sets[nxt.si].w}</span> ק״ג × ` : ''}${log[nxt.ii].sets[nxt.si].reps}</span></div></div>
      ${!autoNext && (nEx.type === 'weight' || nEx.load) ? `<div class="rest-w"><span class="sub">${newEx ? 'משקל לתרגיל הבא' : 'משקל לסט הבא'}</span><div class="stepper"><button data-w="-">−</button><div class="val" data-act="wedit" role="button" aria-label="הקלדת משקל"><span data-wshow>${log[nxt.ii].sets[nxt.si].w}</span><small>ק״ג</small></div><button data-w="+">+</button></div></div>` : ''}`;
    let end = vnow() + secs * 1000;
    let lastSec = -1;
    let total = secs;
    const restStart = vnow();
    let hrReady = false, hrExtended = false;
    root._restAdj = (d) => { end += d * 1000; };
    root._restSkip = () => { end = vnow(); };
    timer = setInterval(() => {
      const left = Math.max(0, (end - vnow()) / 1000);
      const node = $('.counter .ring');
      if (node) { setRing(node, left / total); node.querySelector('.big').textContent = fmtTime(left); }
      // מנוחה חכמה לפי דופק
      const hr = hrNow().hr;
      if (hr) {
        const z = zoneOf(hr, hrMax);
        if (!hrReady && z.z <= 2 && vnow() - restStart > 40000 && left > 8) {
          hrReady = true; say('hr_ready');
          const n = root.querySelector('.counter .lbl'); if (n) n.textContent = '❤ התאוששת';
        }
        if (!hrExtended && left <= 4 && left > 3 && z.pct >= 88) { hrExtended = true; end += 15000; total += 15; say('hr_high'); }
      }
      const sec = Math.ceil(left);
      if (sec !== lastSec) {
        lastSec = sec;
        // רק מאמן שמקליט את המשפטים האלה (25.11.2026): ב-HIIT ובשיעורים אין הקלטה, והבקשה נכשלה ועברה לקול המערכת
        if (sec === 30 && total >= 60 && coachSays('rest_30', coach)) say('rest_30');
        if (sec === 10 && total >= 25 && coachSays('rest_10', coach)) say('rest_10');
        if (sec <= 3 && sec >= 1 && !autoNext) { sayNow([`n${sec}`]); vibrate(20); }
      }
      if (left <= 0) {
        clearInterval(timer); timer = null;
        mode = 'ready';
        if (autoNext) { paint(); startSet(); return; }
        if (newEx) { say('next_ex'); say(`ex_${nIt.exId}`); sayStepKg(nxt); } else {
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
    if (!partial) track(`done:${useKind}`);
    mode = 'summary';
    const st = get();
    const dur = Math.round((vnow() - t0) / 1000);
    const exercises = [];
    const prs = [];
    let volume = 0, setsDone = 0, repsTotal = 0;
    let ladderChanges = [];
    const mobilityDone = { warmup: 0, cooldown: 0 };
    items.forEach((it, ii) => {
      let done = log[ii].sets.filter((x) => x.done);
      if (!done.length) return;
      if (it.role === 'warmup' || it.role === 'cooldown') { mobilityDone[it.role]++; return; }
      for (const [exId, list] of swappedSets(done, it)) {   // סטים שבוצעו לפני החלפת תרגיל — נרשמים על התרגיל שבו בוצעו
        const u = list[0].exUnit; setsDone += list.length; list.forEach((x) => (volume += (x.w || 0) * (u === 'sec' ? 0 : x.reps)));
        if (u !== 'sec') list.forEach((x) => (repsTotal += x.reps || 0));
        exercises.push({ exId, role: it.role, sets: list.map(cleanSet), target: list[0].exTarget, ...(u === 'sec' ? { unit: 'sec' } : {}) });
        if (it.role !== 'finisher' && EX[exId].type === 'weight' && isPR(exId, list, st.history[exId])) prs.push(exId);
      }
      done = done.filter((x) => !x.ex || x.ex === it.exId).map(cleanSet);
      if (!done.length) return;
      setsDone += done.length;
      done.forEach((x) => (volume += (x.w || 0) * (it.unit === 'sec' ? 0 : x.reps)));
      exercises.push({ exId: it.exId, role: it.role, sets: done, target: it.reps, ...(it.ladder ? { ladder: it.ladder, planned: it.sets, ...(it.vol ? { vol: true } : {}) } : {}), ...(it.unit === 'sec' ? { unit: 'sec' } : {}) });
      if (it.unit !== 'sec') done.forEach((x) => (repsTotal += x.reps || 0));
      if (it.role !== 'finisher' && EX[it.exId].type === 'weight' && isPR(it.exId, done, st.history[it.exId])) prs.push(it.exId);
    });
    if (!exercises.length) { close(); return; }
    const planned = log.reduce((n, l, ii) => n + (items[ii].role === 'warmup' || items[ii].role === 'cooldown' ? 0 : l.sets.length), 0);
    let gained = workoutXP(partial, setsDone, planned) + prs.length * XP.pr;
    const hr = hrRec.stop();
    const nowIso = new Date().toISOString(), sid = `s_${Date.now()}`;
    set((s2) => {
      for (const e of exercises) {
        if (e.role === 'finisher' || e.role === 'mob' || e.role === 'hiit') continue;
        (s2.history[e.exId] ||= []).push({ date: nowIso, sid, sets: e.sets, target: e.target });
      }
      s2.sessions.push({ id: sid, date: nowIso, name: w.name, ...(caliW ? { track: 'cali' } : mobW ? { track: 'mob' } : hiitW ? { track: 'hiit' } : pilW ? { track: 'pil' } : yogaW ? { track: 'yoga' } : taiW ? { track: 'tai' } : {}), day: workout.day ?? null, field: !!workout.field, durationSec: dur, volume: Math.round(volume), setsDone, exercises, prs, warmupDone: mobilityDone.warmup, stretchDone: mobilityDone.cooldown, readiness: w.readiness ?? null, partial, hr, xp: gained });   // xp: כדי שמחיקה מההיסטוריה תוריד בדיוק מה שהאימון נתן
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
    { const ce = ctxEnd(coach, { partial, weekDone: !!weekMsg, durSec: dur, plannedMin: workout.minutes || 0 }); if (ce) say(ce); }   // סגירת שבוע, אימון עשירי, אימון ארוך…
    confetti(prs.length ? 140 : 80);
    try { wakeLock?.release(); } catch { /* */ }
    releaseKeepAlive();

    // תמונת הסיכום לשיתוף: שם האימון, שלושה מספרים, ושיאים / עליות שלב אם היו
    const moveMin = Math.round(exercises.reduce((t, x) => t + (x.unit === 'sec' ? x.sets.reduce((a, y) => a + (y.reps || 0), 0) : 0), 0) / 60);
    shareData = { title: w.name, coachImg: COACHES[coach].img,
      kpis: [[fmtTime(dur), 'זמן'], exercises.every((x) => x.unit === 'sec') ? [exercises.length, 'תרגילים'] : [setsDone, 'סטים'],
        volume > 0 ? [Math.round(volume).toLocaleString('he-IL'), 'ק״ג הורמו'] : repsTotal > 0 ? [repsTotal, 'חזרות'] : [moveMin, 'דקות תנועה']],
      lines: [...prs.map((id) => `שיא אישי: ${EX[id].name} — ${bestSet(exercises.find((x) => x.exId === id).sets).w} ק״ג`), ...ladderChanges.filter((c) => c.type === 'up').map((c) => `עליית שלב: ${EX[c.to].name}`)] };
    video.pause();
    root.querySelector('.stage').style.flex = '0 0 34%';
    $('.title').innerHTML = html`<div class="eyebrow">משימה הושלמה</div><div class="name">${esc(w.name)} ✓</div>`;
    $('.progress').innerHTML = '';
    $('.panel').innerHTML = html`
      <div class="kpis" style="margin-top:8px">
        <div class="kpi"><b>${fmtTime(dur)}</b><span>זמן</span></div>
        <div class="kpi"><b>${hiitW ? Math.max(...exercises.map((x) => x.sets.length)) : flowW ? exercises.length : setsDone}</b><span>${hiitW ? 'סבבים' : yogaW ? 'תנוחות' : taiW ? 'תנועות' : flowW ? 'תרגילים' : 'סטים'}</span></div>
        ${hiitW ? `<div class="kpi up"><b>${Math.round(exercises.reduce((t, x) => t + x.sets.reduce((a, y) => a + (y.reps || 0), 0), 0) / 60)}</b><span>דקות עבודה</span></div>` : pilW || yogaW || taiW ? `<div class="kpi up"><b>${Math.round(exercises.reduce((t, x) => t + x.sets.reduce((a, y) => a + (y.reps || 0), 0), 0) / 60)}</b><span>דקות תנועה</span></div>` : mobW ? `<div class="kpi up"><b>${new Set(exercises.map((x) => regionOf(x.exId)).filter((r) => r && r !== 'calm')).size}</b><span>אזורים</span></div>` : caliW ? `<div class="kpi up"><b>${repsTotal}</b><span>חזרות</span></div>` : `<div class="kpi up"><b>${Math.round(volume).toLocaleString('he-IL')}</b><span>ק״ג נפח</span></div>`}</div>
      ${ladderChanges.length ? html`<div class="card tight" style="margin-top:12px">${ladderChanges.map((c) => `<div class="row" style="padding:5px 0;align-items:flex-start">${ib(c.type === 'up' ? 'rocket' : c.type === 'down' ? 'refresh' : c.type === 'top' ? 'crown' : 'clock', c.type === 'up' || c.type === 'top' ? 'pri' : 'acc')}<div style="flex:1;min-width:0"><b>${esc(LADDERS[c.lid].name)}: ${
    c.type === 'up' ? `עלית שלב — ${esc(EX[c.to].name)}` : c.type === 'down' ? `יורדים שלב — ${esc(EX[c.to].name)}` : c.type === 'top' ? 'ראש הסולם!' : 'היעד הושג'}</b><div class="sub" style="font-size:13px">${
    c.type === 'up' ? 'מהאימון הבא. מתחילים מהיעד המינימלי ובונים מחדש.' : c.type === 'down' ? 'שני אימונים מתחת ליעד. בונים בסיס וחוזרים — זה חלק מהדרך.' : c.type === 'top' ? 'השלב האחרון בסולם הושלם. ממשיכים לשמר ולהוסיף חזרות.'
    : c.type === 'gated' ? `נשארים בשלב עוד ${c.daysLeft} ימים — גידים מסתגלים לאט יותר מהשריר.` : 'עוד אימון אחד כזה — ועולים שלב.'}</div></div></div>`)}</div>` : ''}
      ${hrSummaryHtml(hr)}
      ${prs.length ? html`<div class="card tight" style="margin-top:12px">${prs.map((id) => `<div class="row" style="padding:4px 0"><span class="pr-badge">PR</span><b>${esc(EX[id].name)}</b><span class="spacer"></span><span class="num">${bestSet(exercises.find((x) => x.exId === id).sets).w} ק״ג</span></div>`)}</div>` : ''}
      <div class="card tight" style="margin-top:12px"><div class="row">${ib('star', 'pri', 'lg')}<div><b>+${gained} XP</b>${rk.rankUp ? `<div class="sub">דרגה חדשה: ${rk.rankUp.name}!</div>` : ''}</div></div>
        ${weekMsg ? `<div class="sub" style="margin-top:8px;color:var(--pri-ink);font-weight:700">${esc(weekMsg)}</div>` : ''}</div>
      ${workout.run && !partial ? `<button class="btn teal block xl" style="margin-top:14px" data-act="run-now">${icon('run')} המשך לריצה: ${esc(workout.run.name)}</button>` : ''}
      <button class="btn block" style="margin-top:10px" data-act="share">שיתוף האימון</button>
      <button class="btn primary block xl" style="margin-top:10px" data-act="close">סיום</button>`;
  }

  function close() {
    clearInterval(timer); clearInterval(clock); offSpeak(); stop(); stopMusic();
    if (tvOn) tvMode(false);
    useCoach(null);
    pill._destroy?.(); hrRec.stop();
    try { wakeLock?.release(); } catch { /* */ }
    releaseKeepAlive();
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
      if (first > k) { k = first; stop(); say('next_ex'); say(`ex_${item().exId}`); sayStepKg(steps[k]); mode = 'ready'; paint(); }
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
      k = nk; stop(); say('next_ex'); say(`ex_${item().exId}`); sayStepKg(steps[k]); mode = 'ready'; paint();
    }
    if (a === 'manual') { countedReps = setLog().reps; mode = 'log'; paint(); }
    if (a === 'pause') return setPaused(!pausedAt);
    if (a === 'finish-set') { if (pausedAt) setPaused(false); endSet(true); }
    if (a === 'rest-skip') root._restSkip?.();
    if (a === 'rest-plus') root._restAdj?.(30);
    if (a === 'rest-minus') root._restAdj?.(-15);
    if (a === 'info') infoSheet(item().exId, coach);
    if (a === 'swap') swapSheet();
    if (a === 'tv') tvMode(!tvOn);
    if (a === 'music') {
      set((s2) => { s2.settings.music = !musicOn(); s2.settings.musicHint = true; return s2; });
      if (musicOn()) startMusic(musicMood()); else stopMusic();
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
    if (a === 'share' && shareData) shareCard(shareData);
    if (a === 'close') close();
    if (a === 'run-now') { close(); startRun(workout.run, { day: workout.day }); }
  });
  // שינוי המשקל של הסט הנוכחי (או הבא, בזמן מנוחה) — לפני הסט, באמצעו, במנוחה ובסיכום הסט. מתעדכנים גם הסטים הבאים של אותו תרגיל
  const setW = (v) => {
    const sl = setLog();
    sl.w = Math.max(0, Math.round(v * 10) / 10);
    log[cur().ii].sets.forEach((x, i) => { if (i > cur().si && !x.done) x.w = sl.w; });
    root.querySelectorAll('[data-wshow]').forEach((n) => { n.textContent = sl.w; });
    // המאמן אומר את המשקל החדש אחרי שמפסיקים ללחוץ (לא בסיכום הסט — שם מתקנים מה שכבר בוצע)
    clearTimeout(kgTimer); if (mode !== 'log') kgTimer = setTimeout(() => { if (mode !== 'log' && mode !== 'summary') sayKg(setLog().w, 0, cur().ii); }, 1200);
  };
  on(root, 'click', '[data-w]', (e, t) => {
    const ex1 = ex(), step = ex1.inc >= 5 ? 2.5 : ex1.inc >= 2 ? 1 : 0.5;
    setW(setLog().w + (t.dataset.w === '+' ? step : -step));
  });
  // הקלדת משקל מדויק (לחיצה על המספר, או על המשקל באמצע הסט)
  function weightSheet() {
    const it1 = item(), n = log[cur().ii].sets.length;
    sheet(html`<div class="h1" style="font-size:22px">שינוי משקל</div><p class="sub">${esc(EX[it1.exId].name)} · סט ${cur().si + 1} מתוך ${n}. הסטים הבאים של התרגיל יתעדכנו גם הם.</p>
      <label class="field"><span>משקל בק״ג</span><input class="input num" type="number" inputmode="decimal" step="0.5" min="0" max="400" data-wval value="${setLog().w}" style="font-size:22px;text-align:center"></label>
      <button class="btn primary block" style="margin-top:12px" data-wsave>שמירה</button>
      <button class="btn ghost block" style="margin-top:8px" data-close>ביטול</button>`, {
      onMount(sh, close) {
        const inp = sh.querySelector('[data-wval]'); setTimeout(() => { inp.focus(); inp.select?.(); }, 250);
        const save = () => { const v = Number(String(inp.value).replace(',', '.')); if (!Number.isFinite(v) || v < 0 || v > 400) return toast('משקל לא תקין'); setW(Math.round(v * 2) / 2); close(); };
        on(sh, 'click', '[data-wsave]', save);
        inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') save(); });
      },
    });
  }
  on(root, 'click', '[data-act="wedit"]', () => weightSheet());
  on(root, 'click', '[data-r]', (e, t) => {
    const sl = setLog();
    const step = item().unit === 'sec' && sl.reps >= 20 ? 5 : 1;
    sl.reps = Math.max(1, sl.reps + (t.dataset.r === '+' ? step : -step));
    t.parentElement.querySelector('.val span').textContent = sl.reps;
  });
  on(root, 'click', '[data-rpe]', (e, t) => {
    setLog().rpe = Number(t.dataset.rpe);
    vibrate(20);
    { const r = setLog().rpe, kind = r >= 10 ? 'max' : r <= 6.5 ? 'easy' : null, cm = kind && ctxMid(kind, coach); if (cm) say(cm); }   // "טוב" / "קשה": אין מה לומר (25.11.2026: נוצר המפתח ctx_- — קליפ שלא קיים, ורישום ב-ctxSaid)
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
          keepSwapped(log[cur().ii], cur1);
          cur1.exId = id;
          const sg = suggest(id, cur1, get().history[id], profile);
          const L = log[cur().ii];
          L.sg = sg;
          L.sets.forEach((x) => { if (!x.done) { x.w = sg.w || 0; x.reps = sg.reps; } });
          lastExShown = -1;
          closeSheet(); say(`ex_${id}`, { priority: true }); sayStepKg(steps[k]); { const cs = ctxMid('swap', coach); if (cs) say(cs); } paint();
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
          keepSwapped(log[cur().ii], cur1);
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
  // מוזיקת רקע (יוגה, פילאטיס, מוביליטי, קליסתניקס) — רק למי שהפעיל; בפעם הראשונה מזכירים שיש כפתור
  if (hasMusic(mKey)) {
    if (musicOn()) startMusic(musicMood());
    else if (!get().settings.musicHint) { set((s2) => { s2.settings.musicHint = true; return s2; }); setTimeout(() => root.isConnected && toast('רוצים מוזיקת רקע? כפתור התו למעלה', 3200), 5000); }
  }
  say(pilW ? 'pil_hello' : `hello_${coach}`, { priority: true });
  if (items[0].role === 'warmup') say('warm_intro');
  { const c0 = ctxStart(coach); if (c0) say(c0); }   // משפט אחד בהקשר: אימון ראשון, חזרה אחרי הפסקה, בוקר מוקדם…
  if (flowW) say('mob_intro');
  // התרגיל הראשון: כשהוא תנועת חימום / מתיחה לפי זמן, המאמן מציג אותו רק כשלוחצים "התחל" — לא לפני, ולא פעמיים
  if (!deferFirst) { say(`ex_${items[0].exId}`); sayStepKg(steps[0]); }
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
// החלפת תרגיל באמצע (25.11.2026): הסטים שכבר בוצעו נשארים רשומים על התרגיל שבו בוצעו. קודם הם נשמרו תחת התרגיל החדש —
// ההיסטוריה, המשקל המומלץ לפעם הבאה והשיא של התרגיל החדש נקבעו לפי משקלים של תרגיל אחר.
const keepSwapped = (L, it) => L.sets.forEach((x) => { if (x.done && !x.ex) { x.ex = it.exId; x.exTarget = it.reps; if (it.unit) x.exUnit = it.unit; } });
const swappedSets = (done, it) => { const m = new Map(); for (const x of done) if (x.ex && x.ex !== it.exId) (m.get(x.ex) || m.set(x.ex, []).get(x.ex)).push(x); return m; };
const cleanSet = ({ ex, exTarget, exUnit, ...x }) => x;

export function maybeAdvanceWeek() {
  const s = get();
  if (!weekClosed(s.plan)) return '';
  const full = s.plan.completedDays.length >= s.plan.week.sessions.length;   // false: חלק מהאימונים בוטלו השבוע
  let msg = 'שבוע הושלם! השבוע הבא נבנה לפי הביצועים שלך.';
  // מסע מדיטטיבי בשלבים: בסוף שלב ובסוף המסע נשמרת הודעה (mjNote) שמסך הבית מציג כסיכום, עם משפט של אור
  const mj = mjOf(s.profile), step = mj ? mjStep(mj, s.plan.blockIndex * 4 + s.plan.weekInBlock) : null;
  if (mj) msg = step?.kind === 'journey' ? 'המסע הושלם! הסיכום מחכה במסך הבית.' : step ? `שלב "${MJ_STAGES[step.stage].name}" הושלם. מתחילים את שלב "${MJ_STAGES[step.stage + 1].name}".` : 'שבוע הושלם. המסע ממשיך.';
  set((s2) => {
    s2.plan.weekInBlock += 1;
    if (step) { const now = new Date().toISOString(), J = s2.profile.medJ; s2.mjNote = { ...step, path: mj.path, weeks: mj.weeks, level: mj.level, since: step.kind === 'journey' ? J.start || null : J.stageAt || J.start || null, date: now }; J.stageAt = now; }
    if (s2.plan.weekInBlock >= 4 && mj) { s2.plan.weekInBlock = 0; s2.plan.blockIndex += 1; }
    else if (s2.plan.weekInBlock >= 4) {
      s2.plan.weekInBlock = 0;
      s2.plan.blockIndex += 1;
      const ev = isCali(s2.profile) ? { change: 0, msg: 'ממשיכים בסולמות — כל סולם מתקדם בקצב שלו.' } : isMed(s2.profile) ? { change: 0, msg: 'בלוק של ארבעה שבועות הושלם. ממשיכים ללכת — המסעות חוזרים, וכל פעם פוגשים בהם משהו אחר.' } : isWalk(s2.profile) ? (walkLevelUp(s2.profile, s2.runs) ? { change: 1, level: s2.profile.level + 1, msg: 'השלמת את רוב ההליכות — עולים רמה: יותר זמן בקצב מהיר.' } : { change: 0, msg: 'ממשיכים באותה רמה. התמדה לפני מהירות.' }) : isTai(s2.profile) ? (taiLevelUp(s2.profile, s2.sessions) ? { change: 1, level: s2.profile.level + 1, msg: 'השלמת את רוב השיעורים — עולים רמה, ונפתחות תנועות חדשות.' } : { change: 0, msg: 'ממשיכים באותה רמה. קודם יציבות, ואחר כך תנועות חדשות.' }) : isYoga(s2.profile) ? (yogaLevelUp(s2.profile, s2.sessions) ? { change: 1, level: s2.profile.level + 1, msg: 'השלמת את רוב השיעורים — עולים רמה, ונפתחות תנוחות חדשות.' } : { change: 0, msg: 'ממשיכים באותה רמה. נשימה רגועה לפני תנוחות חדשות.' }) : isPil(s2.profile) ? (pilLevelUp(s2.profile, s2.sessions) ? { change: 1, level: s2.profile.level + 1, msg: 'השלמת את רוב השיעורים — עולים רמה, ונפתחים תרגילים חדשים.' } : { change: 0, msg: 'ממשיכים באותה רמה. דיוק לפני קושי.' }) : isHiit(s2.profile) ? (hiitLevelUp(s2.profile, s2.sessions) ? { change: 1, level: s2.profile.level + 1, msg: 'השלמת את רוב האימונים — עולים רמה: יותר עבודה, פחות מנוחה.' } : { change: 0, msg: 'נשארים באותה רמה עוד בלוק. התמדה לפני עצימות.' }) : s2.profile.track === 'run' ? { change: 0, msg: 'ארבעה שבועות של ריצה מאחוריך. הריצה הארוכה ממשיכה לגדול.' } : isMob(s2.profile) ? { change: 0, msg: 'ארבעה שבועות עברו — זה הזמן למבחן טווחים חוזר (מסך ההתקדמות).' } : evaluateLevel(s2.profile.level, blockStats(s2));
      if (ev.change) {
        s2.profile.level = ev.level;
        s2.events = [{ type: 'level', text: `רמה ${ev.level} (${isWalk(s2.profile) ? WALK_LEVELS[ev.level] : isTai(s2.profile) ? TAI_LEVELS[ev.level] : isYoga(s2.profile) ? YOGA_LEVELS[ev.level] : isPil(s2.profile) ? PIL_LEVELS[ev.level] : LEVEL_NAMES[ev.level]}): ${ev.msg}`, date: new Date().toISOString() }, ...s2.events];
      }
      msg = `בלוק הושלם! ${ev.msg}`;
    }
    s2.plan.completedDays = [];
    s2.plan.weekStart = today();
    regenerateWeek(s2);
    return s2;
  });
  if (full) addXP(XP.perfectWeek, 'week');
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
