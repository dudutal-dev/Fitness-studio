// כרטיס התזכורות במסך המאמן + הצעה במסך הבית.
import { html, on, toast, sheet, ib } from '../ui/dom.js';
import { platform, installOneLine } from '../install.js';
import { get, set, g } from '../store.js';
import { reminders, enableReminders, disableReminders, testReminder, saveReminderSettings, needsInstall, pushSupported, buildICS, workoutTime, calendarFeed, isIOS } from '../reminders.js';
import { COACHES } from '../data/coaches.js';
import { plannedToday, toMin } from '../engine/schedule.js';

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function reminderCard() {
  const r = reminders();
  const st = r.settings;
  if (!r.enabled) {
    return html`<div class="card">
      <div><div><b>Reminders from your coach</b><div class="sub t-foot">Workout, water and weigh-in — even when the app is closed</div></div></div>
      ${needsInstall() ? html`<div class="g-tip" style="margin-top:12px">${ib('phone', 'acc', 'sm')}<div>On iPhone, reminders work only when the app is <b>installed on the Home Screen</b>. ${installOneLine(platform()) || installOneLine('ios-safari')} Then open it from there and turn them on here.</div></div>`
        : !pushSupported() ? '<div class="sub" style="margin-top:10px">This browser doesn\'t support reminders. You can use the calendar</div>'
        : '<button class="btn primary block" style="margin-top:12px" data-rem="on">Turn on reminders</button>'}
      <button class="sched-line" style="margin-top:10px" data-sched><span class="txt">${scheduleText(st)}</span><b>Days and times</b></button>
      <button class="btn sm ghost block" style="margin-top:8px" data-rem="ics">Add to phone calendar</button>
    </div>`;
  }
  const tog = (k, label, sub) => `<button class="row between rem-tog" data-rtog="${k}"><div><b>${label}</b><div class="sub" style="font-size:12px">${sub}</div></div><span class="sw ${st[k]?.on ? 'on' : ''}"><i></i></span></button>`;
  return html`<div class="card rem">
    <div class="row between"><b>Reminders are on</b><button class="btn sm" data-rem="test">Send a sample</button></div>

    ${tog('workout', 'Workout reminder', 'Not sent if you\'ve already worked out that day')}
    ${st.workout?.on ? html`<div class="rem-sub"><button class="sched-line" data-sched><span class="txt">${scheduleText(st)}</span><b>Change</b></button></div>` : ''}

    ${tog('water', 'Water reminder', 'Every few hours, during the day')}
    ${st.water?.on ? html`<div class="rem-sub"><div class="seg" data-rwater>${[[90, '1.5 hours'], [120, '2 hours'], [180, '3 hours']].map(([v, t]) => `<button data-v="${v}" class="${st.water.every === v ? 'on' : ''}">${t}</button>`).join('')}</div>
      <div class="row" style="margin-top:8px"><label class="rem-time">From <input class="input num" type="time" data-rtime="water.from" value="${st.water.from}"></label><label class="rem-time">To <input class="input num" type="time" data-rtime="water.to" value="${st.water.to}"></label></div></div>` : ''}

    ${tog('weigh', 'Weekly weigh-in', 'In the morning, before eating')}
    ${st.weigh?.on ? html`<div class="rem-sub row"><select class="input" data-rweighday style="height:44px">${DAY_FULL.map((d, i) => `<option value="${i}" ${Number(st.weigh.day) === i ? 'selected' : ''}> ${d}</option>`).join('')}</select>
      <label class="rem-time"><input class="input num" type="time" data-rtime="weigh" value="${st.weigh.time}"></label></div>` : ''}

    ${tog('comeback', '"I miss you"', 'After 3 days without a workout, at 19:00')}
    <div class="row" style="margin-top:12px"><button class="btn sm ghost" data-rem="ics">Add to phone calendar</button><span class="spacer"></span><button class="btn sm danger" data-rem="off">Turn off</button></div>
  </div>`;
}

export function bindReminders(root, rerender) {
  const edit = (fn) => { const s = structuredClone(reminders().settings); fn(s); saveReminderSettings(s); rerender(); };
  on(root, 'click', '[data-rem]', async (e, b) => {
    const a = b.dataset.rem;
    if (a === 'on') {
      b.disabled = true; b.textContent = 'Turning on…';
      try { await enableReminders(); toast('Reminders are on'); testReminder().catch(() => {}); }
      catch (err) {
        toast(err.message === 'denied' ? 'Notifications weren\'t allowed. You can allow them in the phone\'s Settings → Notifications.' : err.message === 'install' ? 'Install on the Home Screen first' : `Couldn't turn on: ${err.message}`, 4500);
      }
      rerender();
    }
    if (a === 'test') { try { await testReminder(); toast('A sample reminder was sent — it should arrive within a few seconds'); } catch (err) { toast(`Sending failed: ${err.message}`, 4000); rerender(); } }
    if (a === 'off') { await disableReminders(); toast('Reminders are off'); rerender(); }
    if (a === 'ics') downloadICS();
  });
  on(root, 'click', '[data-sched]', () => scheduleSheet(rerender));
  on(root, 'click', '[data-rtog]', (e, b) => edit((s) => { const k = b.dataset.rtog; s[k] = { ...s[k], on: !s[k]?.on }; }));
  on(root, 'click', '[data-rwater] button', (e, b) => edit((s) => { s.water.every = Number(b.dataset.v); }));
  root.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.rtime) edit((s) => { const [k, sub] = t.dataset.rtime.split('.'); if (sub) s[k][sub] = t.value; else s[k].time = t.value; });
    if (t.dataset.rweighday !== undefined) edit((s) => { s.weigh.day = Number(t.value); });
  });
}

export function downloadICS() {
  const p = get().profile, ns = get().plan?.week?.sessions?.[0];
  const ics = buildICS(reminders().settings, { name: p.name, coach: COACHES[p.coach]?.name, mins: Math.min(120, Math.max(20, Math.round((ns?.minutes || 60) / 5) * 5)) });
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'lohem-reminders.ics';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  toast('A calendar file opens — choose "Add All", and the workouts go into your calendar with an alert', 5000);
}

// ───── ימים ושעות ─────
// סיכום קצר של לוח האימונים: "א׳ 18:00 · ג׳ 07:00 · ה׳ 18:00" (או "לא נקבעו ימים")
export function scheduleText(st = reminders().settings) {
  const days = [...(st.workout?.days || [])].sort();
  if (!st.workout?.on || !days.length) return 'No workout days set yet';
  const times = [...new Set(days.map((d) => workoutTime(st, d)))];
  return times.length === 1 ? `${days.map((d) => DAY_NAMES[d]).join(' · ')} — at ${times[0]}` : days.map((d) => `${DAY_NAMES[d]} ${workoutTime(st, d)}`).join(' · ');
}
// שורה במסך הבית: ימי האימון והשעות, ולחיצה פותחת את המסך
export const scheduleRowHtml = () => `<button class="sched-line sched-home" data-sched>${ib('plan', 'acc', 'sm')}<span class="txt">${scheduleText()}</span><b>Days and times</b></button>`;
export const bindSchedule = (root, rerender) => on(root, 'click', '[data-sched]', () => scheduleSheet(rerender));

// המסך: לכל יום בשבוע — מתג ושעה. נשמר מיד; מכאן גם שולחים ליומן של הטלפון ומפעילים תזכורות
export function scheduleSheet(rerender) {
  const cur = () => structuredClone(reminders().settings);
  const save = (fn) => { const s = cur(); s.workout = { on: true, days: [], time: '18:00', ...s.workout, times: { ...(s.workout?.times || {}) } }; fn(s.workout); s.workout.days.sort(); saveReminderSettings(s); };
  const rows = () => { const st = cur(); return DAY_FULL.map((d, i) => { const on = st.workout?.on && (st.workout.days || []).includes(i);
    return `<div class="sched-day ${on ? 'on' : ''}"><button class="sched-tog" data-sday="${i}" role="switch" aria-checked="${on}"><span class="sw ${on ? 'on' : ''}"><i></i></span><b> ${d}</b></button>
      <input class="input num" type="time" data-stime="${i}" value="${workoutTime(st, i)}" ${on ? '' : 'disabled'} aria-label="Workout time on ${d}"></div>`; }).join(''); };
  sheet(html`<div class="h1" style="font-size:22px">Days and times</div><p class="sub">When do you train? Pick the days, and a time for each. Reminders follow this schedule.</p>
    <div data-srows>${rows()}</div>
    <button class="btn primary block" style="margin-top:14px" data-sfeed>Sync to phone calendar</button>
    <p class="sub" style="text-align:center;margin:6px 0 0;font-size:12px">${reminders().calId ? 'Calendar connected — changes to days or times reach it automatically.' : 'Connect once, and from then on every change here reaches your calendar automatically.'}</p>
    <button class="btn sm ghost block" style="margin-top:6px" data-scal>Or: add once as a file</button>
    ${reminders().enabled ? '<p class="sub" style="text-align:center;margin-top:10px">Reminders are on — they will arrive at these times.</p>'
    : needsInstall() || !pushSupported() ? '<p class="sub" style="text-align:center;margin-top:10px">While the app is open, a reminder appears at workout time. For reminders when it is closed too: install it on the Home Screen and turn them on in Settings, or add the workouts to your calendar.</p>'
    : '<button class="btn block" style="margin-top:8px" data-spush>Turn on reminders when the app is closed too</button>'}
    <button class="btn ghost block" style="margin-top:8px" data-close>Done</button>`, {
    onMount(sh, close) {
      const paint = () => { sh.querySelector('[data-srows]').innerHTML = rows(); };
      on(sh, 'click', '[data-sday]', (e, b) => { const d = Number(b.dataset.sday); save((w) => { const i = w.days.indexOf(d); if (i >= 0) w.days.splice(i, 1); else w.days.push(d); }); paint(); });
      sh.addEventListener('change', (e) => { const t = e.target; if (t.dataset.stime === undefined || !t.value) return; save((w) => { w.times[Number(t.dataset.stime)] = t.value; }); });
      on(sh, 'click', '[data-sfeed]', (e, b) => openFeed(b));
      on(sh, 'click', '[data-scal]', () => { if (!cur().workout?.days?.length) return toast('Pick at least one day first'); downloadICS(); });
      on(sh, 'click', '[data-spush]', async (e, b) => { b.disabled = true; b.textContent = 'Turning on…';
        try { await enableReminders(); toast('Reminders are on'); b.remove(); } catch (err) { b.disabled = false; b.textContent = 'Turn on reminders when the app is closed too'; toast(err.message === 'denied' ? 'Notifications weren\'t allowed. You can allow them in the phone\'s Settings → Notifications.' : `Couldn't turn on: ${err.message}`, 4500); } });
      void close;
    },
    onClose: () => rerender?.(),   // בכל סגירה (כפתור, גרירה, לחיצה בחוץ) המסך שמתחת מתעדכן
  });
}

// שידור ליומן של הטלפון: שומר את הלוח בשרת ופותח את חלונית החיבור (מהמסך "ימים ושעות" ומיומן האימונים)
export async function openFeed(b) {
  if (!reminders().settings.workout?.days?.length) return toast('Pick at least one day first');
  if (b) b.disabled = true;
  try {
    const p = get().profile, ns = get().plan?.week?.sessions?.[0];
    const url = await calendarFeed({ name: p.name, coach: COACHES[p.coach]?.name, mins: Math.min(120, Math.max(20, Math.round((ns?.minutes || 60) / 5) * 5)) });
    const web = url.replace(/^https?:/, 'webcal:');
    // אייפון ומק: כתובת webcal פותחת את "הרשמה ליומן". אנדרואיד: יומן Google מוסיף את הכתובת כיומן נוסף
    feedSheet(url, isIOS() || /Macintosh/.test(navigator.userAgent) ? web : `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(web)}`);
  } catch { toast('Could not connect the calendar — a network connection is needed', 4000); }
  if (b) b.disabled = false;
}

// אחרי שהלוח נשמר בשרת: כפתור שפותח את היומן של הטלפון, והכתובת עצמה למי שרוצה להוסיף ידנית
function feedSheet(url, go) {
  sheet(html`<div class="h1" style="font-size:22px">Connect calendar</div>
    <p class="sub">Your phone's calendar opens with an offer to subscribe to the workout calendar. Confirm once — from then on your workouts appear in it, with an alert 15 minutes before, and update automatically when you change days or times.</p>
    <a class="btn primary block xl" style="margin-top:12px" href="${go}" target="_blank" rel="noopener" data-fgo>Open calendar</a>
    <p class="sub" style="margin-top:12px;font-size:12px">Didn't open? You can add it manually: in your calendar choose "Add calendar by URL" and paste the address.</p>
    <button class="btn sm block" data-fcopy>Copy address</button>
    <button class="btn ghost block" style="margin-top:8px" data-close>Done</button>`, {
    onMount(sh) { on(sh, 'click', '[data-fcopy]', () => { navigator.clipboard?.writeText(url).then(() => toast('Address copied'), () => toast(url, 6000)); }); },
  });
}

// ───── תזכורת קופצת בתוך האפליקציה ─────
// כשהאפליקציה פתוחה והגיעה שעת האימון (עד חצי שעה אחריה): חלונית עם המאמן. פעם אחת ביום; לא באמצע אימון, לא בהיכרות, ולא אם כבר התאמנו היום.
const SHOWN = 'remShown';
export function checkWorkoutDue(start) {
  const s = get(), st = reminders().settings, now = new Date(), today = now.toDateString();
  const pt = s.profile?.name && s.plan ? plannedToday(s.plan, st, now) : null, late = pt ? now.getHours() * 60 + now.getMinutes() - toMin(pt.time) : -1;
  if (!pt || late < 0 || late >= 30 || document.querySelector('.live, .still, .ob, .sheet, .lic-gate, .guide')) return false;
  try { const v = JSON.parse(localStorage.getItem(SHOWN) || 'null'); if (v && v.day === today && (v.done || Date.now() < v.until)) return false; } catch { /* */ }
  const trained = [...(s.sessions || []), ...(s.runs || [])].some((x) => new Date(x.date).toDateString() === today);
  if (trained) return false;
  const mark = (done, mins = 0) => { try { localStorage.setItem(SHOWN, JSON.stringify({ day: today, done, until: Date.now() + mins * 60000 })); } catch { /* */ } };
  mark(false, 9999);
  const coach = COACHES[s.profile.coach] || {}, ns = pt.session;
  sheet(html`<div class="due"><img src="${coach.face || ''}" alt=""><div><div class="eyebrow">${pt.time} · reminder</div><div class="h1" style="font-size:22px">Time to work out</div>
      <div class="sub">${ns ? `Today: ${ns.name}` : 'Today\'s workout is waiting.'}</div></div></div>
    <button class="btn primary block xl" style="margin-top:14px" data-due="go">Let's start</button>
    <div class="row" style="gap:8px;margin-top:8px"><button class="btn" style="flex:1" data-due="later">In 15 minutes</button><button class="btn ghost" style="flex:1" data-due="no">Not today</button></div>`, {
    onMount(sh, close) { on(sh, 'click', '[data-due]', (e, b) => { const a = b.dataset.due; close();
      if (a === 'later') return mark(false, 15);
      mark(true); if (a === 'go') start?.(); }); },
  });
  return true;
}

// הצעה חד־פעמית במסך הבית
export function reminderPromptHtml() {
  const s = get();
  if (reminders().enabled || s.reminderPromptDismissed || !s.sessions?.length) return '';
  return html`<div class="card tight rem-prompt"><div class="row">${ib('bell', 'pri', 'lg')}<div style="flex:1"><b>${g('Want', 'Want')} me to remind you to work out?</b><div class="sub" style="font-size:13px">Workout, water and weigh-in reminders — even when the app is closed</div></div></div>
    <div class="row" style="margin-top:10px"><a class="btn sm primary" href="#/coach" data-remgo>Yes, open settings</a><button class="btn sm ghost" data-remno>Not now</button></div></div>`;
}
export function bindReminderPrompt(root, rerender) {
  on(root, 'click', '[data-remno]', () => { set((s) => { s.reminderPromptDismissed = true; return s; }); rerender(); });
  on(root, 'click', '[data-remgo]', () => { sessionStorage.setItem('scrollTo', 'reminders'); });
}
