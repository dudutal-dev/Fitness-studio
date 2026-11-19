// כרטיס התזכורות במסך המאמן + הצעה במסך הבית.
import { html, on, toast, sheet, ib } from '../ui/dom.js';
import { get, set, g } from '../store.js';
import { reminders, enableReminders, disableReminders, testReminder, saveReminderSettings, needsInstall, pushSupported, buildICS } from '../reminders.js';
import { COACHES } from '../data/coaches.js';

const DAY_NAMES = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const DAY_FULL = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export function reminderCard() {
  const r = reminders();
  const st = r.settings;
  if (!r.enabled) {
    return html`<div class="card">
      <div><div><b>תזכורות מהמאמן</b><div class="sub t-foot">אימון, שתייה ושקילה — גם כשהאפליקציה סגורה</div></div></div>
      ${needsInstall() ? html`<div class="g-tip" style="margin-top:12px">${ib('phone', 'acc', 'sm')}<div>באייפון, תזכורות עובדות רק כשהאפליקציה <b>מותקנת במסך הבית</b>: שיתוף ⬆️ ← "הוסף למסך הבית", ואז לפתוח משם ולהפעיל כאן.</div></div>`
        : !pushSupported() ? '<div class="sub" style="margin-top:10px">הדפדפן הזה לא תומך בתזכורות. אפשר להשתמש בלוח השנה</div>'
        : '<button class="btn primary block" style="margin-top:12px" data-rem="on">הפעל תזכורות</button>'}
      <button class="btn sm ghost block" style="margin-top:8px" data-rem="ics">או: הוסף ללוח השנה</button>
    </div>`;
  }
  const tog = (k, label, sub) => `<button class="row between rem-tog" data-rtog="${k}"><div><b>${label}</b><div class="sub" style="font-size:12px">${sub}</div></div><span class="sw ${st[k]?.on ? 'on' : ''}"><i></i></span></button>`;
  return html`<div class="card rem">
    <div class="row between"><b>תזכורות פעילות</b><button class="btn sm" data-rem="test">שלח דוגמה</button></div>

    ${tog('workout', 'תזכורת אימון', 'לא נשלחת אם כבר התאמנת באותו יום')}
    ${st.workout?.on ? html`<div class="rem-sub"><div class="chips">${DAY_NAMES.map((d, i) => `<button class="chip ${st.workout.days.includes(i) ? 'on' : ''}" data-rday="${i}">${d}</button>`).join('')}</div>
      <label class="rem-time">בשעה <input class="input num" type="time" data-rtime="workout" value="${st.workout.time}"></label></div>` : ''}

    ${tog('water', 'תזכורת שתייה', 'כל כמה שעות, בשעות היום')}
    ${st.water?.on ? html`<div class="rem-sub"><div class="seg" data-rwater>${[[90, 'שעה וחצי'], [120, 'שעתיים'], [180, '3 שעות']].map(([v, t]) => `<button data-v="${v}" class="${st.water.every === v ? 'on' : ''}">${t}</button>`).join('')}</div>
      <div class="row" style="margin-top:8px"><label class="rem-time">מ- <input class="input num" type="time" data-rtime="water.from" value="${st.water.from}"></label><label class="rem-time">עד <input class="input num" type="time" data-rtime="water.to" value="${st.water.to}"></label></div></div>` : ''}

    ${tog('weigh', 'שקילה שבועית', 'בבוקר, לפני אוכל')}
    ${st.weigh?.on ? html`<div class="rem-sub row"><select class="input" data-rweighday style="height:44px">${DAY_FULL.map((d, i) => `<option value="${i}" ${Number(st.weigh.day) === i ? 'selected' : ''}>יום ${d}</option>`).join('')}</select>
      <label class="rem-time"><input class="input num" type="time" data-rtime="weigh" value="${st.weigh.time}"></label></div>` : ''}

    ${tog('comeback', '"חסר לי אותך"', 'אחרי 3 ימים בלי אימון, ב-19:00')}
    <div class="row" style="margin-top:12px"><button class="btn sm ghost" data-rem="ics">ללוח השנה</button><span class="spacer"></span><button class="btn sm danger" data-rem="off">כבה</button></div>
  </div>`;
}

export function bindReminders(root, rerender) {
  const edit = (fn) => { const s = structuredClone(reminders().settings); fn(s); saveReminderSettings(s); rerender(); };
  on(root, 'click', '[data-rem]', async (e, b) => {
    const a = b.dataset.rem;
    if (a === 'on') {
      b.disabled = true; b.textContent = 'מפעיל…';
      try { await enableReminders(); toast('התזכורות פעילות'); testReminder().catch(() => {}); }
      catch (err) {
        toast(err.message === 'denied' ? 'לא אושרו התראות. אפשר לאשר בהגדרות הטלפון ← התראות.' : err.message === 'install' ? 'קודם להתקין במסך הבית' : `לא הצלחתי להפעיל: ${err.message}`, 4500);
      }
      rerender();
    }
    if (a === 'test') { try { await testReminder(); toast('נשלחה תזכורת לדוגמה — אמורה להגיע תוך כמה שניות'); } catch (err) { toast(`שליחה נכשלה: ${err.message}`, 4000); rerender(); } }
    if (a === 'off') { await disableReminders(); toast('התזכורות כבויות'); rerender(); }
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
  toast('הקובץ ירד — לפתוח אותו ולבחור "הוסף הכל" ללוח השנה', 4500);
}

// הצעה חד־פעמית במסך הבית
export function reminderPromptHtml() {
  const s = get();
  if (reminders().enabled || s.reminderPromptDismissed || !s.sessions?.length) return '';
  return html`<div class="card tight rem-prompt"><div class="row">${ib('bell', 'pri', 'lg')}<div style="flex:1"><b>${g('רוצה', 'רוצה')} שאזכיר לך להתאמן?</b><div class="sub" style="font-size:13px">תזכורת אימון, שתייה ושקילה — גם כשהאפליקציה סגורה</div></div></div>
    <div class="row" style="margin-top:10px"><a class="btn sm primary" href="#/coach" data-remgo>כן, להגדרות</a><button class="btn sm ghost" data-remno>לא עכשיו</button></div></div>`;
}
export function bindReminderPrompt(root, rerender) {
  on(root, 'click', '[data-remno]', () => { set((s) => { s.reminderPromptDismissed = true; return s; }); rerender(); });
  on(root, 'click', '[data-remgo]', () => { sessionStorage.setItem('scrollTo', 'reminders'); });
}
