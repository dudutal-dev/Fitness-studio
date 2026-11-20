// כרטיס התזכורות במסך המאמן + הצעה במסך הבית.
import { html, on, toast, sheet, ib } from '../ui/dom.js';
import { platform, installOneLine } from '../install.js';
import { get, set, g } from '../store.js';
import { reminders, enableReminders, disableReminders, testReminder, saveReminderSettings, needsInstall, pushSupported, buildICS } from '../reminders.js';
import { COACHES } from '../data/coaches.js';

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
      <button class="btn sm ghost block" style="margin-top:8px" data-rem="ics">Or: add to calendar</button>
    </div>`;
  }
  const tog = (k, label, sub) => `<button class="row between rem-tog" data-rtog="${k}"><div><b>${label}</b><div class="sub" style="font-size:12px">${sub}</div></div><span class="sw ${st[k]?.on ? 'on' : ''}"><i></i></span></button>`;
  return html`<div class="card rem">
    <div class="row between"><b>Reminders are on</b><button class="btn sm" data-rem="test">Send a sample</button></div>

    ${tog('workout', 'Workout reminder', 'Not sent if you\'ve already worked out that day')}
    ${st.workout?.on ? html`<div class="rem-sub"><div class="chips">${DAY_NAMES.map((d, i) => `<button class="chip ${st.workout.days.includes(i) ? 'on' : ''}" data-rday="${i}">${d}</button>`).join('')}</div>
      <label class="rem-time">At <input class="input num" type="time" data-rtime="workout" value="${st.workout.time}"></label></div>` : ''}

    ${tog('water', 'Water reminder', 'Every few hours, during the day')}
    ${st.water?.on ? html`<div class="rem-sub"><div class="seg" data-rwater>${[[90, '1.5 hours'], [120, '2 hours'], [180, '3 hours']].map(([v, t]) => `<button data-v="${v}" class="${st.water.every === v ? 'on' : ''}">${t}</button>`).join('')}</div>
      <div class="row" style="margin-top:8px"><label class="rem-time">From <input class="input num" type="time" data-rtime="water.from" value="${st.water.from}"></label><label class="rem-time">To <input class="input num" type="time" data-rtime="water.to" value="${st.water.to}"></label></div></div>` : ''}

    ${tog('weigh', 'Weekly weigh-in', 'In the morning, before eating')}
    ${st.weigh?.on ? html`<div class="rem-sub row"><select class="input" data-rweighday style="height:44px">${DAY_FULL.map((d, i) => `<option value="${i}" ${Number(st.weigh.day) === i ? 'selected' : ''}> ${d}</option>`).join('')}</select>
      <label class="rem-time"><input class="input num" type="time" data-rtime="weigh" value="${st.weigh.time}"></label></div>` : ''}

    ${tog('comeback', '"I miss you"', 'After 3 days without a workout, at 19:00')}
    <div class="row" style="margin-top:12px"><button class="btn sm ghost" data-rem="ics">Add to calendar</button><span class="spacer"></span><button class="btn sm danger" data-rem="off">Turn off</button></div>
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
  on(root, 'click', '[data-rtog]', (e, b) => edit((s) => { const k = b.dataset.rtog; s[k] = { ...s[k], on: !s[k]?.on }; }));
  on(root, 'click', '[data-rday]', (e, b) => edit((s) => { const d = Number(b.dataset.rday); const i = s.workout.days.indexOf(d); i >= 0 ? s.workout.days.splice(i, 1) : s.workout.days.push(d); s.workout.days.sort(); }));
  on(root, 'click', '[data-rwater] button', (e, b) => edit((s) => { s.water.every = Number(b.dataset.v); }));
  root.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.rtime) edit((s) => { const [k, sub] = t.dataset.rtime.split('.'); if (sub) s[k][sub] = t.value; else s[k].time = t.value; });
    if (t.dataset.rweighday !== undefined) edit((s) => { s.weigh.day = Number(t.value); });
  });
}

function downloadICS() {
  const p = get().profile;
  const ics = buildICS(reminders().settings, { name: p.name, coach: COACHES[p.coach]?.name });
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'lohem-reminders.ics';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  toast('The file was downloaded — open it and choose "Add All" to add to the calendar', 4500);
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
