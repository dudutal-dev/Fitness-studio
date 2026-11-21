// מצב ריצה חי: מקטעים (חימום/ספרינט/הליכה/טמפו), טיימר, הנחיות קוליות, מבדק 3 ק״מ,
// מרחק וקצב מ-GPS (או מחיישן ריצה), דופק משעון Garmin ואימון לפי אזורי דופק.
import { html, esc, on, sheet, toast, confetti, vibrate, icon, fmtTime, el, emi } from '../ui/dom.js';
import { get, set, addXP, XP, pushEvent } from '../store.js';
import { isWalk, walkTarget, paceVerdict } from '../engine/walking.js';
import { COACHES, demoVideo, demoPoster } from '../data/coaches.js';
import { shareCard } from '../share-card.js';
import { SEG_LABEL, fmtPace, runLevelFrom3k, next3kTarget, isRun } from '../engine/running.js';
import { coachSays } from '../data/voice-lines.js';
import { maybeAdvanceWeek } from './workout.js';
import { sessionCoach } from '../engine/cali.js';
import { say, sayNow, stop, onSpeaking, unlock, preload, useCoach } from '../coach/voice.js';
import { musicOn, startMusic, stopMusic, setMusicMood } from '../coach/music.js';
// המוזיקה בריצה: חימום ושחרור רגועים יותר, ובשאר הקטעים — מוזיקת ריצה
const runMood = (kind, walk) => (kind === 'warm' ? 'warm' : kind === 'cool' ? 'calm' : walk ? 'walk' : 'run');
import { gpsTracker, simplifyPath } from '../devices/gps.js';
import { routeMap } from '../ui/map.js';
import { keepAlive, releaseKeepAlive, setKeepAliveState } from '../coach/keepalive.js';
import { recorder, current as hrNow, zoneOf, maxHrFor, hasRSC } from '../devices/hr.js';
import { hrPill, hrSummaryHtml } from '../devices/ui.js';
import { pingWorkout } from '../reminders.js';

const SEG_VOICE = { free: 'run_steady', warm: 'run_warm', fast: 'run_fast', easy: 'run_easy', walk: 'run_walk', tempo: 'run_tempo', steady: 'run_steady', cool: 'run_cool', test: 'go' };
// מסלול ההליכה (שירה): משפטים משלה לכל מקטע
const WALK_VOICE = { free: 'walk_free', warm: 'walk_warm', stroll: 'walk_stroll', brisk: 'walk_brisk', power: 'walk_power', cool: 'walk_cool' };
// אזור דופק יעד לכל סוג מקטע [מינ׳, מקס׳]
const TARGET_Z = { fast: [4, 5], tempo: [4, 4], steady: [2, 3], easy: [2, 3], test: [4, 5], stroll: [1, 2], brisk: [2, 3], power: [3, 4] };

// אימון חופשי — בלי תוכנית ובלי מקטעים: יוצאים, והמאמן מלווה (קילומטרים, טיפים), עם מפה ומסלול. מסיימים בכפתור
export const freeRun = (walk = false) => ({ type: 'free', ...(walk ? { walk: true } : {}), name: walk ? 'Free walk' : 'Free run', icon: walk ? 'leaf' : 'run',
  segs: [{ kind: 'free', sec: 0, label: 'At your own pace — finish whenever you like' }], totalSec: 0, pace: {} });

export function startRun(run, { day = null, coach: forced = null, extra = false } = {}) {
  unlock();
  // טעינה מראש של כל מה שהמאמן אומר בריצה
  const s = get();
  const profile = s.profile;
  // ריצה: המאמן של מסלול חדר הכושר, או מאמן הריצה במסלול הריצה. ריצה שנוספה לשבוע של מסלול אחר (extra) — עם מאמן הריצה
  const coach = forced || sessionCoach(profile, null);
  if (forced) useCoach(forced);
  const walkS = !!run.walk;   // הליכה מודרכת: אותו מסך, עם הניסוחים, הקולות והמוזיקה של ההליכה
  const runCoach = COACHES[coach].track === 'run', demo = walkS ? 'outdoor_walk' : runCoach ? 'outdoor_run' : 'treadmill_run';
  preload(['run_warm', 'run_fast', 'run_easy', 'run_walk', 'run_steady', 'run_tempo', 'run_half', 'run_min', 'run_last', 'run_done', 'run_cool', 'run_km', 'run_3k', 'run_long', 'run_form', 'run_breathe', 'zone_up', 'zone_down', 'watch_on', 'n1', 'n2', 'n3',
    ...(walkS ? ['walk_hello', 'walk_warm', 'walk_stroll', 'walk_brisk', 'walk_power', 'walk_last', 'walk_cool', 'walk_half', 'walk_form', 'walk_talk', 'walk_done', 'walk_pace_up', 'walk_pace_good', 'walk_pace_easy', 'walk_km', 'walk_free'] : [])].filter((k) => coachSays(k, coach)));
  const segs = run.segs;
  const hrMax = maxHrFor(profile);
  let i = 0;
  let segStart = 0, elapsed = 0, lastTick = Date.now();
  let paused = false, timer = null, wakeLock = null;
  let testStart = null, testStartDist = 0, saidHalf = false;
  let kmAnnounced = 0;
  let zoneOutSince = 0, zoneCooldown = 0, tipped = false, freeTips = 0;
  const FREE_TIP = (n) => (walkS ? (n % 2 ? 'walk_form' : 'walk_talk') : runCoach ? (n % 2 ? 'run_form' : 'run_breathe') : null);
  const totalPlanned = segs.reduce((t, x) => t + x.sec, 0);
  const lockScreen = () => { try { navigator.wakeLock?.request('screen').then((l) => (wakeLock = l)).catch(() => {}); } catch { /* */ } };
  lockScreen();
  // חוזרים מהרקע: נעילת המסך משתחררת כשהדף מוסתר, אז מבקשים אותה שוב
  const onShow = () => { if (!document.hidden) lockScreen(); };
  document.addEventListener('visibilitychange', onShow);

  const gps = gpsTracker();
  const gpsOn = gps.start();
  // המפה: מוצגת במקום הסרטון ברגע שיש מיקום; הכפתור שבראש המסך מחליף בין מפה לסרטון, ולחיצה על המפה — בין מעקב לכל המסלול
  let map = null, mapOn = false, mapDrawn = 0, segPace = null, ended = false;
  const splits = [];   // זמן האימון (שניות) בסוף כל קילומטר
  let paceWas = null, paceSince = 0, paceCooldown = 0, praised = false;
  const hrRec = recorder(profile);
  let rscBase = null;
  const distM = () => {
    const c = hrNow();
    if (hasRSC() && c.distM != null) { if (rscBase == null) rscBase = c.distM; return c.distM - rscBase; }
    return gps.distM;
  };

  const root = el(`<div class="live" role="dialog" aria-label="${walkS ? 'Walk' : 'Run'}">
    <div class="stage run-stage" style="flex:0 0 38%"><img class="poster" src="${demoPoster(coach, demo)}" alt="">
      <video muted playsinline loop autoplay src="${demoVideo(coach, demo)}"></video>
      <div class="run-map" id="rmap" data-act="mapmode" hidden></div>
      <div class="map-zoom"><button data-act="zin" aria-label="Zoom in">+</button><button data-act="zout" aria-label="Zoom out">−</button></div>
      <div class="hud-top"><button class="icon-btn" data-act="exit">${icon('close', 'width="20" height="20"')}</button><span class="spacer"></span>
        <button class="icon-btn off" data-act="map" id="mapBtn" aria-label="Map" aria-pressed="false" hidden>${icon('compass', 'width="20" height="20"')}</button>
        <button class="icon-btn ${musicOn() ? '' : 'off'}" data-act="music" aria-label="Background music" aria-pressed="${musicOn()}">${icon('music', 'width="20" height="20"')}</button>
        <span class="clock num" id="tot">0:00</span></div>
      <div class="coach-pip"><img src="${COACHES[coach].face}" alt=""></div><div class="say"></div>
      <div class="title"><div class="eyebrow">${emi(run.icon)} ${esc(run.name)}</div><div class="name" style="font-size:22px">${walkS ? `Walk with ${esc(COACHES[coach].name)}` : run.type === 'free' ? `Run with ${esc(COACHES[coach].name)}` : 'Target pace: <span class="num" id="pace"></span>'}</div></div></div>
    <div class="panel" style="flex:1;display:flex;flex-direction:column">
      <button class="panel-grab" data-act="panel" aria-label="Hide or show the stats panel" aria-expanded="true"><i></i></button>
      <div class="segs">${segs.map((x, j) => `<i class="${x.kind}" style="flex-grow:${Math.max(30, x.sec || 600)}" data-i="${j}"></i>`).join('')}</div>
      <div class="run-kind" id="kind"></div><div class="run-big" id="big">0:00</div><div class="sub" style="text-align:center" id="lbl"></div>
      <div class="run-stats">
        <div><b class="num" id="dist">—</b><span>km</span></div>
        <div><b class="num" id="cpace">—</b><span>Current pace</span></div>
        <div><b class="num" id="hr">—</b><span id="hrz">Heart rate</span></div>
      </div>
      <div class="sub" id="gpsst" style="text-align:center;font-size:12px"></div>
      <div class="spacer"></div>
      <div class="row" style="gap:10px;margin-top:10px">
        <button class="btn xl" style="flex:1" data-act="pause" id="pauseBtn">${icon('pause', 'width="22" height="22"')} Pause</button>
        <button class="btn xl" style="flex:1" data-act="skip">${icon('skip', 'width="22" height="22"')} Skip</button></div>
      <button class="btn primary block xl" style="margin-top:10px;display:none" data-act="test-done" id="testDone">I finished 3 km</button>
      <button class="btn primary block xl" style="margin-top:10px;display:none" data-act="free-done" id="freeDone">Finish and save</button>
    </div></div>`);
  document.body.append(root);
  if (musicOn()) startMusic(runMood(segs[0]?.kind, walkS));
  document.body.style.overflow = 'hidden';
  const $ = (q) => root.querySelector(q);
  const pill = hrPill();
  // גרירה של הלוח למטה / למעלה מקפלת ופותחת אותו (כמו לחיצה על הידית)
  let grabY = null;
  $('.panel').addEventListener('touchstart', (e) => { grabY = e.touches[0].clientY; }, { passive: true });
  $('.panel').addEventListener('touchend', (e) => {
    const dy = e.changedTouches[0].clientY - (grabY ?? e.changedTouches[0].clientY); grabY = null;
    if (!root.classList.contains('map-full') || Math.abs(dy) < 40) return;
    root.classList.toggle('panel-min', dy > 0); $('.panel-grab').setAttribute('aria-expanded', dy < 0); layoutMap();
  }, { passive: true });
  $('#tot').after(pill);
  $('video').addEventListener('error', (e) => (e.target.style.display = 'none'));
  let sayT;
  const offSpeak = onSpeaking((v, text) => {
    $('.coach-pip').classList.toggle('speaking', v);
    clearTimeout(sayT);
    if (v && text) { $('.say').textContent = text; $('.say').classList.add('show'); }
    if (!v) sayT = setTimeout(() => $('.say')?.classList.remove('show'), 1200);
  });

  function showMap(v) {
    mapOn = v; $('#rmap').hidden = !v;
    $('video').style.visibility = $('.poster').style.visibility = v ? 'hidden' : '';
    $('#mapBtn').classList.toggle('off', !v); $('#mapBtn').setAttribute('aria-pressed', v);
    // בזמן האימון המפה על כל המסך והפקדים מעליה; בסיכום היא חוזרת לחלק העליון
    root.classList.toggle('map-full', v && !ended);
    if (v) { map ||= routeMap($('#rmap')); layoutMap(); map.draw(gps.path, gps.here); }
  }
  // המיקום (או המסלול כולו) ממורכז באזור הפנוי: בין הכפתורים שלמעלה ללוח שלמטה
  function layoutMap() {
    if (!map) return;
    const h = root.clientHeight;
    if (!root.classList.contains('map-full')) return map.layout({ anchor: 0.56, inset: 90 });
    const top = $('.hud-top').getBoundingClientRect().bottom + 54, bot = $('.panel').getBoundingClientRect().top;
    map.layout({ anchor: (top + bot) / 2 / h, inset: h - (bot - top) });
  }

  function setPaused(v) {
    if (paused === v) return;
    paused = v; gps.pause(paused); setKeepAliveState(paused);
    $('#pauseBtn').innerHTML = paused ? `${icon('play', 'width="22" height="22"')} Continue` : `${icon('pause', 'width="22" height="22"')} Pause`;
    paused ? $('video').pause() : $('video').play().catch(() => {});
  }

  function enterSeg() {
    const sg = segs[i];
    segStart = elapsed;
    zoneOutSince = 0;
    root.querySelectorAll('.segs i').forEach((n, j) => { n.classList.toggle('cur', j === i); n.classList.toggle('past', j < i); });
    $('#kind').className = `run-kind ${sg.kind}`;
    setMusicMood(runMood(sg.kind, walkS));
    $('#kind').textContent = SEG_LABEL[sg.kind];
    $('#lbl').textContent = sg.label + (TARGET_Z[sg.kind] ? ` · heart rate target Z${TARGET_Z[sg.kind].join('–Z')}` : '');
    const p = run.pace;
    const pace = sg.kind === 'fast' ? p.fast : sg.kind === 'tempo' ? p.tempo : sg.kind === 'test' ? p.test : ['steady', 'easy'].includes(sg.kind) ? p.easy : null;
    if ($('#pace')) $('#pace').textContent = pace ? `${fmtPace(pace)} per km` : 'Walk / easy';
    segPace = walkS ? walkTarget(profile, sg.kind) : pace ? { max: pace } : null;
    if (walkS && segPace?.max) $('#lbl').textContent += ` · target pace ${fmtPace(segPace.max)} per km`;
    const isLastFast = sg.kind === 'fast' && !segs.slice(i + 1).some((x) => x.kind === 'fast');
    const lastPower = walkS && sg.kind === 'power' && !segs.slice(i + 1).some((x) => x.kind === 'power');
    // הליכה: בפתיחה שירה מציגה את עצמה, ואז את המקטע הראשון (בלי לקטוע את הברכה)
    if (walkS) say(lastPower ? 'walk_last' : WALK_VOICE[sg.kind], { priority: !(i === 0 && elapsed === 0) });
    else say(isLastFast ? 'run_last' : runCoach && run.type === 'long' && sg.kind === 'steady' ? 'run_long' : SEG_VOICE[sg.kind], { priority: true });
    tipped = false; praised = false;
    if (sg.kind === 'test') { testStart = elapsed; testStartDist = distM(); $('#testDone').style.display = ''; $('[data-act="skip"]').style.display = 'none'; }
    else { $('#testDone').style.display = 'none'; $('[data-act="skip"]').style.display = sg.kind === 'free' ? 'none' : ''; }
    $('#freeDone').style.display = sg.kind === 'free' ? '' : 'none';
    vibrate([60, 40, 60]);
  }

  function tick() {
    const now = Date.now();
    if (!paused) elapsed += now - lastTick;
    lastTick = now;
    $('#tot').textContent = fmtTime(elapsed / 1000);
    const sg = segs[i];
    const inSeg = (elapsed - segStart) / 1000;

    // מרחק / קצב / דופק
    const d = distM();
    $('#dist').textContent = d >= 10 ? (d / 1000).toFixed(2) : '0.00';
    const c = hrNow();
    const pc = hasRSC() && c.speed > 0.5 ? Math.round(1000 / c.speed) : gps.paceSec;
    $('#cpace').textContent = pc && pc < (walkS ? 2400 : 1200) ? fmtPace(pc) : '—';
    // הקצב הנוכחי מול יעד המקטע: ירוק כשעומדים בו, כתום כשלא
    const off = !!(pc && segPace && (segPace.max ? pc > segPace.max * 1.05 : pc < segPace.min * 0.95));
    $('#cpace').className = `num${pc && segPace ? (off ? ' pace-off' : ' pace-ok') : ''}`;
    // מפה: נפתחת לבד כשמתקבל מיקום ראשון (אלא אם כובתה), ומתעדכנת פעם בשנייה
    if (gps.here && $('#mapBtn').hidden && !$('[data-rpe]')) { $('#mapBtn').hidden = false; if (get().settings.runMap !== false) showMap(true); }
    if (mapOn && now - mapDrawn > 1000) { mapDrawn = now; layoutMap(); map.draw(gps.path, gps.here); }   // המיקום העדכני — המפה זזה עם ההליכה
    if (Math.floor(d / 1000) > splits.length) splits.push(Math.round(elapsed / 1000));
    if (gpsOn && !hasRSC()) { const st = gps.status; $('#gpsst').textContent = st.error ? 'No location access — distance won\'t be measured. You can allow location in your browser settings.' : st.ok ? `GPS · accuracy ${st.accuracy} m${st.accuracy > 40 ? ' · weak signal, distance is approximate' : ''}` : st.fixes ? 'No GPS signal right now…' : 'Searching for GPS…'; }
    if (c.hr) {
      const z = zoneOf(c.hr, hrMax);
      $('#hr').textContent = c.hr; $('#hrz').textContent = `Z${z.z} · ${z.name}`; $('#hr').style.color = z.color;
      // אימון לפי אזורי דופק (לא בדקה הראשונה של מקטע)
      const tz = TARGET_Z[sg.kind];
      if (tz && inSeg > 45 && !paused && now > zoneCooldown) {
        const out = z.z > tz[1] ? 'high' : z.z < tz[0] && sg.kind !== 'test' ? 'low' : null;
        if (out) {
          zoneOutSince ||= now;
          if (now - zoneOutSince > (out === 'high' ? 20000 : 30000)) { say(out === 'high' ? 'zone_down' : 'zone_up'); zoneCooldown = now + 75000; zoneOutSince = 0; }
        } else zoneOutSince = 0;
      }
    }
    // קילומטרים
    if (sg.kind !== 'test' && Math.floor(d / 1000) > kmAnnounced) { kmAnnounced = Math.floor(d / 1000); say(walkS ? 'walk_km' : 'run_km'); }

    if (sg.kind === 'free') {   // אימון חופשי: הטיימר סופר קדימה, ומסיימים בכפתור
      $('#big').textContent = fmtTime(inSeg);
      const n = Math.floor(inSeg / 360);
      if (n > freeTips && !paused) { freeTips = n; const k = FREE_TIP(n); if (k) say(k); }
      return;
    }
    if (sg.kind === 'test') {
      $('#big').textContent = fmtTime(inSeg);
      if (d - testStartDist >= 3000) { say('run_3k', { priority: true }); testDone(); }
      return;
    }
    // מאמני הריצה: דגש טכניקה אחרי שתי דקות בקטע ריצה ארוך, ותזכורת קצב בריצות הקלות
    if (runCoach && !tipped && inSeg > 120 && sg.sec >= 480 && ['steady', 'easy'].includes(sg.kind)) { tipped = true; say(i % 2 ? 'run_breathe' : 'run_form'); }
    if (walkS && !tipped && inSeg > 90 && sg.sec >= 300 && ['stroll', 'brisk'].includes(sg.kind)) { tipped = true; say(sg.kind === 'brisk' ? 'walk_talk' : 'walk_form'); }
    const left = sg.sec - inSeg;
    // הליכה לפי הקצב מה-GPS: לאט מדי במקטע מהיר — מגבירים; מהר מדי במקטע רגוע — מאטים; ועל קצב טוב שנשמר — מילה טובה
    if (walkS && !paused) {
      const v = gps.status.ok ? paceVerdict(walkTarget(profile, sg.kind), pc && pc < 2400 ? pc : null) : null;
      if (v !== paceWas) { paceWas = v; paceSince = now; }
      if (v && inSeg > 45 && left > 20 && now > paceCooldown) {
        const held = now - paceSince;
        if (v === 'slow' && held > 25000) { say('walk_pace_up'); paceCooldown = now + 90000; paceSince = now; }
        else if (v === 'fast' && held > 25000) { say('walk_pace_easy'); paceCooldown = now + 120000; paceSince = now; }
        else if (v === 'ok' && held > 90000 && !praised && segPace?.max) { praised = true; say('walk_pace_good'); paceCooldown = now + 60000; }
      }
    }
    $('#big').textContent = fmtTime(left);
    const secLeft = Math.ceil(left);
    if (secLeft !== tick.last) {
      tick.last = secLeft;
      if (secLeft === 60 && sg.sec >= 180) say('run_min');
      if (secLeft <= 3 && secLeft >= 1) sayNow([`n${secLeft}`]);
      if (!saidHalf && totalPlanned > 600 && elapsed / 1000 >= totalPlanned / 2) { saidHalf = true; say(walkS ? 'walk_half' : 'run_half'); }
    }
    // סוף המקטע. אם הדף היה מושהה (מסך נעול) והזמן עבר את סוף המקטע — העודף נזקף למקטע הבא, כדי שהאימון יישאר מסונכרן לשעון
    if (left <= 0) { nextSeg(); if (left < -1 && segs[i] !== sg) segStart = elapsed + left * 1000; }
  }

  function nextSeg() {
    if (i >= segs.length - 1) return finish();
    i++; enterSeg();
  }

  function testDone() {
    const sec = Math.round((elapsed - testStart) / 1000);
    clearInterval(timer);
    finish(sec);
  }

  function finish(testSec = null) {
    clearInterval(timer);
    gps.stop();
    const hr = hrRec.stop();
    if (!testSec) { stop(); say(walkS ? 'walk_done' : 'run_done', { priority: true }); } else say('run_done');
    confetti(90);
    const dur = Math.round(elapsed / 1000);
    const measured = distM();
    const route = measured >= 200 ? simplifyPath(gps.path) : [];
    $('#mapBtn').hidden = true;
    ended = true; root.classList.remove('map-full', 'panel-min'); root.classList.add('run-ended');
    if (route.length > 1) { showMap(true); map.setMode('fit'); }
    else if (mapOn) layoutMap();
    const splitsHtml = measured >= 200 ? `<div class="sub run-splits">Average pace <b class="num">${fmtPace(dur / (measured / 1000))}</b> per km${splits.map((t, k) => ` · km ${k + 1}: <b class="num">${fmtTime(t - (splits[k - 1] || 0))}</b>`).join('')}</div>` : '';
    const distGuess = testSec ? 3 : measured >= 200 ? Math.round(measured / 10) / 100 : '';
    $('.panel').innerHTML = html`<div class="h1" style="text-align:center;margin-top:8px">${walkS ? 'Walk complete' : 'Run complete'}</div>
      <div class="kpis" style="margin:14px 0"><div class="kpi"><b>${fmtTime(dur)}</b><span>Total time</span></div>
        ${testSec ? `<div class="kpi up"><b>${fmtTime(testSec)}</b><span>3 km</span></div>` : `<div class="kpi"><b>${distGuess || '—'}</b><span>km</span></div>`}
        <div class="kpi"><b>+${XP.run}</b><span>XP</span></div></div>
      ${splitsHtml}${hrSummaryHtml(hr)}
      <label class="field" style="margin-top:12px"><span>Distance (km) ${measured >= 200 ? '— measured by GPS, you can correct it' : '— optional'}</span><input class="input num" id="dist" type="number" step="0.01" inputmode="decimal" value="${distGuess}" placeholder="e.g. 5.2"></label>
      <div class="sub" style="margin-bottom:6px">How hard was it?</div>
      <div class="rpe">${[[icon('effort1'), 'Easy', 6], [icon('effort2'), 'Good', 7.5], [icon('effort3'), 'Hard', 9], [icon('effort4'), 'Max', 10]].map(([e, t, v]) => `<button data-rpe="${v}"><span>${e}</span>${t}</button>`).join('')}</div>
      <button class="btn sm block" style="margin-top:12px" data-act="share-run">${walkS ? 'Share walk' : 'Share run'}</button>`;
    // תמונת הסיכום לשיתוף: זמן, מרחק וקצב (לפי המרחק שבשדה)
    on($('.panel'), 'click', '[data-act="share-run"]', () => {
      const km = Number($('#dist').value) || 0, pace = km ? dur / km : 0, mmss = (x) => `${Math.floor(x / 60)}:${String(Math.round(x % 60)).padStart(2, '0')}`;
      shareCard({ title: run.name, eyebrow: walkS ? 'Walk complete' : 'Run complete', coachImg: COACHES[coach]?.img, kpis: [[fmtTime(dur), 'Time'], ...(km ? [[km, 'km'], [mmss(pace), 'min per km']] : [])], lines: testSec ? [`3 km test: ${fmtTime(testSec)}`] : [] });
    });
    on($('.panel'), 'click', '[data-rpe]', (e, b) => {
      const dist = Number($('#dist').value) || null;
      saveRun({ type: run.type, name: run.name, durationSec: dur, distanceKm: dist, timeSec: testSec, rpe: Number(b.dataset.rpe), day, hr, gps: measured >= 200, ...(route.length > 1 ? { route, splits } : {}), ...(extra ? { planDay: true } : {}), ...(walkS ? { walk: true } : {}) });
      close();
    });
  }

  function close() {
    clearInterval(timer); offSpeak(); map?.destroy(); stop(); stopMusic(); gps.stop(); hrRec.stop(); pill._destroy?.();
    if (forced) useCoach(null);
    try { wakeLock?.release(); } catch { /* */ }
    document.removeEventListener('visibilitychange', onShow); releaseKeepAlive();
    root.remove();
    document.body.style.overflow = '';
    dispatchEvent(new HashChangeEvent('hashchange'));
  }

  on(root, 'click', '[data-act]', (e, t) => {
    const a = t.dataset.act;
    if (a === 'music') {
      set((s2) => { s2.settings.music = !musicOn(); s2.settings.musicHint = true; return s2; });
      if (musicOn()) startMusic(runMood(segs[i]?.kind, walkS)); else stopMusic();
      t.classList.toggle('off', !musicOn()); t.setAttribute('aria-pressed', musicOn());
      toast(musicOn() ? 'Background music on' : 'Background music off', 1400);
      return;
    }
    if (a === 'map') { showMap(!mapOn); set((s2) => { s2.settings.runMap = mapOn; return s2; }); return; }
    // לוח הנתונים שמעל המפה: מקפלים אותו כדי לראות יותר מפה (נשארות שלוש הקוביות), ולחיצה נוספת מחזירה
    if (a === 'panel') { const min = root.classList.toggle('panel-min'); t.setAttribute('aria-expanded', !min); layoutMap(); return; }
    if (a === 'zin' || a === 'zout') { map?.zoomBy(a === 'zin' ? 1 : -1); return; }
    if (a === 'mapmode') { if (!e.target.closest('a') && map) map.setMode(map.mode === 'fit' ? 'follow' : 'fit'); return; }
    if (a === 'pause') setPaused(!paused);
    if (a === 'skip') nextSeg();
    if (a === 'test-done') testDone();
    if (a === 'free-done') finish();
    if (a === 'exit') {
      sheet(html`<div class="h1" style="font-size:22px">${walkS ? 'End the walk?' : 'End the run?'}</div>
        <button class="btn primary block" data-x="save">Finish and save</button>
        <button class="btn block" style="margin-top:8px" data-x="quit">Leave without saving</button>
        <button class="btn ghost block" style="margin-top:8px" data-close>${walkS ? 'Keep walking' : 'Keep running'}</button>`, {
        onMount(sh, c) { on(sh, 'click', '[data-x]', (ev, b) => { c(); b.dataset.x === 'save' ? finish() : close(); }); },
      });
    }
  });

  if (walkS) say('walk_hello', { priority: true });
  keepAlive({ title: run.name, artist: COACHES[coach].name, artwork: COACHES[coach].face, togglePause: setPaused });   // ממשיך גם כשהמסך נעול
  enterSeg();
  timer = setInterval(tick, 250);
}

// שמירת ריצה (גם מייבוא Garmin): עדכון רמת ריצה במבדק, XP, שיאים
export function saveRun(r) {
  const st = get();
  const prev = st.runs.filter((x) => x.type === 'test' && x.timeSec).map((x) => x.timeSec);
  const isPR = r.timeSec && (!prev.length || r.timeSec < Math.min(...prev));
  set((s2) => {
    s2.runs.push({ date: r.date || new Date().toISOString(), ...r });
    s2.runs.filter((x) => x.route).slice(0, -40).forEach((x) => { delete x.route; });   // המסלול נשמר ל-40 האימונים האחרונים
    // מסלול ריצה: הריצה היא האימון של היום בתוכנית
    if ((isRun(s2.profile) || isWalk(s2.profile) || r.planDay) && r.day != null && !s2.plan.completedDays.includes(r.day)) s2.plan.completedDays.push(r.day);
    if (isRun(s2.profile) && r.timeSec) s2.profile.level = runLevelFrom3k(r.timeSec);
    if (r.timeSec) { s2.profile.run3k = r.timeSec; s2.profile.runLevel = runLevelFrom3k(r.timeSec); }
    return s2;
  });
  addXP(XP.run + (isPR ? XP.pr : 0), 'run');
  if ((isRun(get().profile) || isWalk(get().profile) || r.planDay) && r.day != null) { const msg = maybeAdvanceWeek(); if (msg) pushEvent({ type: 'coach', text: msg }); }
  pingWorkout();
  if (r.timeSec) pushEvent({ type: isPR ? 'pr' : 'coach', text: `${isPR ? 'New 3 km record' : '3 km test'}: ${fmtTime(r.timeSec)}. Next target: ${fmtTime(next3kTarget(r.timeSec))}` });
  if (isPR) say('pr');
  toast(r.walk ? 'Walk saved' : 'Run saved');
  return isPR;
}
