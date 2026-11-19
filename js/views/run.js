// מצב ריצה חי: מקטעים (חימום/ספרינט/הליכה/טמפו), טיימר, הנחיות קוליות, מבדק 3 ק״מ,
// מרחק וקצב מ-GPS (או מחיישן ריצה), דופק משעון Garmin ואימון לפי אזורי דופק.
import { html, esc, on, sheet, toast, confetti, vibrate, icon, fmtTime, el, emi } from '../ui/dom.js';
import { get, set, addXP, XP, pushEvent } from '../store.js';
import { COACHES, demoVideo, demoPoster } from '../data/coaches.js';
import { SEG_LABEL, fmtPace, runLevelFrom3k, next3kTarget, isRun } from '../engine/running.js';
import { coachSays } from '../data/voice-lines.js';
import { maybeAdvanceWeek } from './workout.js';
import { sessionCoach } from '../engine/cali.js';
import { say, sayNow, stop, onSpeaking, unlock, preload } from '../coach/voice.js';
import { gpsTracker } from '../devices/gps.js';
import { recorder, current as hrNow, zoneOf, maxHrFor, hasRSC } from '../devices/hr.js';
import { hrPill, hrSummaryHtml } from '../devices/ui.js';
import { pingWorkout } from '../reminders.js';

const SEG_VOICE = { warm: 'run_warm', fast: 'run_fast', easy: 'run_easy', walk: 'run_walk', tempo: 'run_tempo', steady: 'run_steady', cool: 'run_cool', test: 'go' };
// אזור דופק יעד לכל סוג מקטע [מינ׳, מקס׳]
const TARGET_Z = { fast: [4, 5], tempo: [4, 4], steady: [2, 3], easy: [2, 3], test: [4, 5] };

export function startRun(run, { day = null } = {}) {
  unlock();
  // טעינה מראש של כל מה שהמאמן אומר בריצה
  const s = get();
  const profile = s.profile;
  const coach = sessionCoach(profile, null); // ריצה: המאמן של מסלול חדר הכושר, או מאמן הריצה במסלול הריצה
  const runCoach = COACHES[coach].track === 'run', demo = runCoach ? 'outdoor_run' : 'treadmill_run';
  preload(['run_warm', 'run_fast', 'run_easy', 'run_walk', 'run_steady', 'run_tempo', 'run_half', 'run_min', 'run_last', 'run_done', 'run_cool', 'run_km', 'run_3k', 'run_long', 'run_form', 'run_breathe', 'zone_up', 'zone_down', 'watch_on', 'n1', 'n2', 'n3'].filter((k) => coachSays(k, coach)));
  const segs = run.segs;
  const hrMax = maxHrFor(profile);
  let i = 0;
  let segStart = 0, elapsed = 0, lastTick = Date.now();
  let paused = false, timer = null, wakeLock = null;
  let testStart = null, testStartDist = 0, saidHalf = false;
  let kmAnnounced = 0;
  let zoneOutSince = 0, zoneCooldown = 0, tipped = false;
  const totalPlanned = segs.reduce((t, x) => t + x.sec, 0);
  try { navigator.wakeLock?.request('screen').then((l) => (wakeLock = l)).catch(() => {}); } catch { /* */ }

  const gps = gpsTracker();
  const gpsOn = gps.start();
  const hrRec = recorder(profile);
  let rscBase = null;
  const distM = () => {
    const c = hrNow();
    if (hasRSC() && c.distM != null) { if (rscBase == null) rscBase = c.distM; return c.distM - rscBase; }
    return gps.distM;
  };

  const root = el(`<div class="live" role="dialog" aria-label="ריצה">
    <div class="stage" style="flex:0 0 34%"><img class="poster" src="${demoPoster(coach, demo)}" alt="">
      <video muted playsinline loop autoplay src="${demoVideo(coach, demo)}"></video>
      <div class="hud-top"><button class="icon-btn" data-act="exit">${icon('close', 'width="20" height="20"')}</button><span class="spacer"></span>
        <span class="clock num" id="tot">0:00</span></div>
      <div class="coach-pip"><img src="${COACHES[coach].face}" alt=""></div><div class="say"></div>
      <div class="title"><div class="eyebrow">${emi(run.icon)} ${esc(run.name)}</div><div class="name" style="font-size:22px">קצב יעד: <span class="num" id="pace"></span></div></div></div>
    <div class="panel" style="flex:1;display:flex;flex-direction:column">
      <div class="segs">${segs.map((x, j) => `<i class="${x.kind}" style="flex-grow:${Math.max(30, x.sec || 600)}" data-i="${j}"></i>`).join('')}</div>
      <div class="run-kind" id="kind"></div><div class="run-big" id="big">0:00</div><div class="sub" style="text-align:center" id="lbl"></div>
      <div class="run-stats">
        <div><b class="num" id="dist">—</b><span>ק״מ</span></div>
        <div><b class="num" id="cpace">—</b><span>קצב נוכחי</span></div>
        <div><b class="num" id="hr">—</b><span id="hrz">דופק</span></div>
      </div>
      <div class="sub" id="gpsst" style="text-align:center;font-size:12px"></div>
      <div class="spacer"></div>
      <div class="row" style="gap:10px;margin-top:10px">
        <button class="btn xl" style="flex:1" data-act="pause" id="pauseBtn">${icon('pause', 'width="22" height="22"')} השהה</button>
        <button class="btn xl" style="flex:1" data-act="skip">${icon('skip', 'width="22" height="22"')} דלג</button></div>
      <button class="btn primary block xl" style="margin-top:10px;display:none" data-act="test-done" id="testDone">סיימתי 3 ק״מ</button>
    </div></div>`);
  document.body.append(root);
  document.body.style.overflow = 'hidden';
  const $ = (q) => root.querySelector(q);
  const pill = hrPill();
  $('#tot').after(pill);
  $('video').addEventListener('error', (e) => (e.target.style.display = 'none'));
  let sayT;
  const offSpeak = onSpeaking((v, text) => {
    $('.coach-pip').classList.toggle('speaking', v);
    clearTimeout(sayT);
    if (v && text) { $('.say').textContent = text; $('.say').classList.add('show'); }
    if (!v) sayT = setTimeout(() => $('.say')?.classList.remove('show'), 1200);
  });

  function enterSeg() {
    const sg = segs[i];
    segStart = elapsed;
    zoneOutSince = 0;
    root.querySelectorAll('.segs i').forEach((n, j) => { n.classList.toggle('cur', j === i); n.classList.toggle('past', j < i); });
    $('#kind').className = `run-kind ${sg.kind}`;
    $('#kind').textContent = SEG_LABEL[sg.kind];
    $('#lbl').textContent = sg.label + (TARGET_Z[sg.kind] ? ` · יעד דופק Z${TARGET_Z[sg.kind].join('–Z')}` : '');
    const p = run.pace;
    const pace = sg.kind === 'fast' ? p.fast : sg.kind === 'tempo' ? p.tempo : sg.kind === 'test' ? p.test : ['steady', 'easy'].includes(sg.kind) ? p.easy : null;
    $('#pace').textContent = pace ? `${fmtPace(pace)} לק״מ` : 'הליכה / קל';
    const isLastFast = sg.kind === 'fast' && !segs.slice(i + 1).some((x) => x.kind === 'fast');
    say(isLastFast ? 'run_last' : runCoach && run.type === 'long' && sg.kind === 'steady' ? 'run_long' : SEG_VOICE[sg.kind], { priority: true });
    tipped = false;
    if (sg.kind === 'test') { testStart = elapsed; testStartDist = distM(); $('#testDone').style.display = ''; $('[data-act="skip"]').style.display = 'none'; }
    else { $('#testDone').style.display = 'none'; $('[data-act="skip"]').style.display = ''; }
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
    $('#cpace').textContent = pc && pc < 1200 ? fmtPace(pc) : '—';
    if (gpsOn && !hasRSC()) { const st = gps.status; $('#gpsst').textContent = st.error ? 'אין גישה למיקום — המרחק לא יימדד. אפשר לאשר מיקום בהגדרות הדפדפן.' : st.ok ? `GPS · דיוק ${st.accuracy} מ׳` : 'מחפש GPS…'; }
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
    if (sg.kind !== 'test' && Math.floor(d / 1000) > kmAnnounced) { kmAnnounced = Math.floor(d / 1000); say('run_km'); }

    if (sg.kind === 'test') {
      $('#big').textContent = fmtTime(inSeg);
      if (d - testStartDist >= 3000) { say('run_3k', { priority: true }); testDone(); }
      return;
    }
    // מאמני הריצה: דגש טכניקה אחרי שתי דקות בקטע ריצה ארוך, ותזכורת קצב בריצות הקלות
    if (runCoach && !tipped && inSeg > 120 && sg.sec >= 480 && ['steady', 'easy'].includes(sg.kind)) { tipped = true; say(i % 2 ? 'run_breathe' : 'run_form'); }
    const left = sg.sec - inSeg;
    $('#big').textContent = fmtTime(left);
    const secLeft = Math.ceil(left);
    if (secLeft !== tick.last) {
      tick.last = secLeft;
      if (secLeft === 60 && sg.sec >= 180) say('run_min');
      if (secLeft <= 3 && secLeft >= 1) sayNow([`n${secLeft}`]);
      if (!saidHalf && totalPlanned > 600 && elapsed / 1000 >= totalPlanned / 2) { saidHalf = true; say('run_half'); }
    }
    if (left <= 0) nextSeg();
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
    if (!testSec) { stop(); say('run_done', { priority: true }); } else say('run_done');
    confetti(90);
    const dur = Math.round(elapsed / 1000);
    const measured = distM();
    const distGuess = testSec ? 3 : measured >= 200 ? Math.round(measured / 10) / 100 : '';
    $('.panel').innerHTML = html`<div class="h1" style="text-align:center;margin-top:8px">ריצה הושלמה</div>
      <div class="kpis" style="margin:14px 0"><div class="kpi"><b>${fmtTime(dur)}</b><span>זמן כולל</span></div>
        ${testSec ? `<div class="kpi up"><b>${fmtTime(testSec)}</b><span>3 ק״מ</span></div>` : `<div class="kpi"><b>${distGuess || '—'}</b><span>ק״מ</span></div>`}
        <div class="kpi"><b>+${XP.run}</b><span>XP</span></div></div>
      ${hrSummaryHtml(hr)}
      <label class="field" style="margin-top:12px"><span>מרחק (ק״מ) ${measured >= 200 ? '— נמדד ב-GPS, אפשר לתקן' : '— לא חובה'}</span><input class="input num" id="dist" type="number" step="0.01" inputmode="decimal" value="${distGuess}" placeholder="למשל 5.2"></label>
      <div class="sub" style="margin-bottom:6px">כמה קשה היה?</div>
      <div class="rpe">${[[icon('effort1'), 'קל', 6], [icon('effort2'), 'טוב', 7.5], [icon('effort3'), 'קשה', 9], [icon('effort4'), 'מקסימום', 10]].map(([e, t, v]) => `<button data-rpe="${v}"><span>${e}</span>${t}</button>`).join('')}</div>`;
    on($('.panel'), 'click', '[data-rpe]', (e, b) => {
      const dist = Number($('#dist').value) || null;
      saveRun({ type: run.type, name: run.name, durationSec: dur, distanceKm: dist, timeSec: testSec, rpe: Number(b.dataset.rpe), day, hr, gps: measured >= 200 });
      close();
    });
  }

  function close() {
    clearInterval(timer); offSpeak(); stop(); gps.stop(); hrRec.stop(); pill._destroy?.();
    try { wakeLock?.release(); } catch { /* */ }
    root.remove();
    document.body.style.overflow = '';
    dispatchEvent(new HashChangeEvent('hashchange'));
  }

  on(root, 'click', '[data-act]', (e, t) => {
    const a = t.dataset.act;
    if (a === 'pause') {
      paused = !paused;
      gps.pause(paused);
      t.innerHTML = paused ? `${icon('play', 'width="22" height="22"')} המשך` : `${icon('pause', 'width="22" height="22"')} השהה`;
      paused ? $('video').pause() : $('video').play().catch(() => {});
    }
    if (a === 'skip') nextSeg();
    if (a === 'test-done') testDone();
    if (a === 'exit') {
      sheet(html`<div class="h1" style="font-size:22px">לסיים את הריצה?</div>
        <button class="btn primary block" data-x="save">סיים ושמור</button>
        <button class="btn block" style="margin-top:8px" data-x="quit">צא בלי לשמור</button>
        <button class="btn ghost block" style="margin-top:8px" data-close>המשך לרוץ</button>`, {
        onMount(sh, c) { on(sh, 'click', '[data-x]', (ev, b) => { c(); b.dataset.x === 'save' ? finish() : close(); }); },
      });
    }
  });

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
    // מסלול ריצה: הריצה היא האימון של היום בתוכנית
    if (isRun(s2.profile) && r.day != null && !s2.plan.completedDays.includes(r.day)) s2.plan.completedDays.push(r.day);
    if (isRun(s2.profile) && r.timeSec) s2.profile.level = runLevelFrom3k(r.timeSec);
    if (r.timeSec) { s2.profile.run3k = r.timeSec; s2.profile.runLevel = runLevelFrom3k(r.timeSec); }
    return s2;
  });
  addXP(XP.run + (isPR ? XP.pr : 0), 'run');
  if (isRun(get().profile) && r.day != null) { const msg = maybeAdvanceWeek(); if (msg) pushEvent({ type: 'coach', text: msg }); }
  pingWorkout();
  if (r.timeSec) pushEvent({ type: isPR ? 'pr' : 'coach', text: `${isPR ? 'שיא חדש ב-3 ק״מ' : 'מבדק 3 ק״מ'}: ${fmtTime(r.timeSec)}. היעד הבא: ${fmtTime(next3kTarget(r.timeSec))}` });
  if (isPR) say('pr');
  toast('הריצה נשמרה');
  return isPR;
}
