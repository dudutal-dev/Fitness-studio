// יומן האימונים (בקשת בעל המוצר, 21.11.2026; בשלוש האפליקציות): מתי כל אימון של השבוע מתוכנן, עם הזזה, ביטול והחזרה.
// מוצג בשורה שבמסך הבית ("האימון הבא"), בכרטיס שבראש לשונית התוכנית, ובחלונית משלו. החישוב עצמו: js/engine/schedule.js.
import { html, esc, on, sheet, toast, ib } from '../ui/dom.js';
import { get, set } from '../store.js';
import { reminders } from '../reminders.js';
import { upcoming, skippedSessions, trainedToday, whenLabel, nextDays, moveSession, skipSession, restoreSession, unmoveSession, hasSchedule, sched } from '../engine/schedule.js';
import { scheduleSheet, openFeed } from './reminders-ui.js';
import { maybeAdvanceWeek } from './workout.js';

const list = () => { const s = get(), now = new Date(); return upcoming(s.plan, reminders().settings, now, trainedToday(s, now)); };

// שורה במסך הבית: האימון המתוכנן הבא — מתי ומה. לחיצה פותחת את היומן
export function homeNextHtml() {
  const st = reminders().settings, nx = list()[0];
  const txt = !nx ? 'כל אימוני השבוע נסגרו' : !hasSchedule(st) ? `האימון הבא: ${esc(nx.session.name)} · עוד לא נקבעו ימים` : `<strong>האימון הבא: ${whenLabel(nx.date, nx.time)}</strong><br>${esc(nx.session.name)}`;
  return `<button class="sched-line sched-home" data-cal>${ib('plan', 'acc', 'sm')}<span class="txt">${txt}</span><b>יומן</b></button>`;
}

// רשימת האימונים הפתוחים עם המועד שלהם, ומתחתיה מה שבוטל השבוע
export function calendarHtml() {
  const s = get(), st = reminders().settings, up = list(), sk = skippedSessions(s.plan);
  const row = (o) => `<div class="cal-row"><div class="cal-when">${o.date ? `<b>${whenLabel(o.date, '')}</b><span class="num">${o.time}</span>` : '<b>—</b>'}</div>
      <div class="grow"><b>${esc(o.session.name)}</b>${o.moved ? '<div class="sub">הוזז מהמועד הקבוע</div>' : ''}</div>
      <button class="btn sm" data-cmove="${o.session.day}">הזזה</button><button class="btn sm ghost" data-cskip="${o.session.day}">ביטול</button></div>`;
  return html`<div class="cal-list">
    ${!hasSchedule(st) ? '<div class="sub" style="margin-bottom:8px">עוד לא נקבעו ימי אימון. קובעים ימים ושעות, והאימונים משתבצים לבד.</div>' : ''}
    ${up.length ? up.map(row).join('') : '<div class="sub">אין אימונים פתוחים השבוע.</div>'}
    ${sk.map((x) => `<div class="cal-row off"><div class="cal-when"><b>בוטל</b></div><div class="grow"><b>${esc(x.name)}</b><div class="sub">לא יתקיים השבוע</div></div><button class="btn sm" data-cback="${x.day}">החזרה</button></div>`).join('')}
    <div class="row cal-foot"><button class="btn sm" data-sched>ימים ושעות</button><button class="btn sm" data-cfeed>שידור ליומן של הטלפון</button></div></div>`;
}

// כרטיס בראש לשונית התוכנית
export const calendarCardHtml = () => html`<div class="h2">יומן האימונים</div><div class="card cal-card">${calendarHtml()}</div>`;

export function bindCalendar(root, rerender) {
  on(root, 'click', '[data-cal]', () => calendarSheet(rerender));
  on(root, 'click', '[data-sched]', () => scheduleSheet(rerender));
  on(root, 'click', '[data-cfeed]', (e, b) => openFeed(b));
  on(root, 'click', '[data-cmove]', (e, b) => moveSheet(Number(b.dataset.cmove), rerender));
  on(root, 'click', '[data-cskip]', (e, b) => {
    const day = Number(b.dataset.cskip);
    set((s) => { skipSession(s.plan, day); return s; });
    // כשכל אימוני השבוע נסגרו (בוצעו או בוטלו) נבנה השבוע הבא
    const msg = maybeAdvanceWeek();
    toast(msg ? 'כל אימוני השבוע נסגרו — נבנה שבוע חדש' : 'האימון בוטל לשבוע הזה. אפשר להחזיר מהיומן.', 3500);
    rerender();
  });
  on(root, 'click', '[data-cback]', (e, b) => { set((s) => { restoreSession(s.plan, Number(b.dataset.cback)); return s; }); rerender(); });
}

// היומן כחלונית (מהבית)
export function calendarSheet(rerender) {
  sheet(html`<div class="h1" style="font-size:22px">יומן האימונים</div><p class="sub">מתי כל אימון מתוכנן השבוע. אפשר להזיז אימון למועד אחר או לבטל אותו.</p>
    <div data-calbody>${calendarHtml()}</div>
    <button class="btn ghost block" style="margin-top:10px" data-close>סיום</button>`, {
    onMount(sh) { bindCalendar(sh, () => { const b = sh.querySelector('[data-calbody]'); if (b) b.innerHTML = calendarHtml(); }); },
    onClose: () => rerender?.(),
  });
}

// הזזת אימון: יום (שבעת הימים הקרובים) ושעה
function moveSheet(day, rerender) {
  const s = get(), x = s.plan.week.sessions.find((y) => y.day === day), cur = list().find((o) => o.session.day === day);
  if (!x) return;
  const days = nextDays(new Date(), 8);
  let pick = cur?.date && days.some((d) => d.date === cur.date) ? cur.date : days[0].date;
  const chips = () => days.map((d) => `<button type="button" class="chip ${d.date === pick ? 'on' : ''}" data-mday="${d.date}">${d.label}</button>`).join('');
  sheet(html`<div class="h1" style="font-size:22px">הזזת אימון</div><p class="sub">${esc(x.name)}</p>
    <label class="field"><span>לאיזה יום?</span><div class="chips" data-mdays>${chips()}</div></label>
    <label class="field"><span>באיזו שעה?</span><input class="input num" type="time" data-mtime value="${cur?.time || reminders().settings.workout?.time || '18:00'}" style="max-width:150px"></label>
    <button class="btn primary block" style="margin-top:12px" data-msave>שמירה</button>
    ${sched(s.plan).moves[day] ? '<button class="btn sm ghost block" style="margin-top:8px" data-mback>חזרה למועד הקבוע</button>' : ''}
    <button class="btn ghost block" style="margin-top:8px" data-close>ביטול</button>`, {
    onMount(sh, close) {
      on(sh, 'click', '[data-mday]', (e, b) => { pick = b.dataset.mday; sh.querySelector('[data-mdays]').innerHTML = chips(); });
      on(sh, 'click', '[data-msave]', () => { const time = sh.querySelector('[data-mtime]').value || '18:00';
        set((s2) => { moveSession(s2.plan, day, pick, time, cur && !cur.moved && cur.date !== pick ? cur.date : null); return s2; }); close(); toast(`האימון נקבע ל${whenLabel(pick, time)}`); rerender(); });
      on(sh, 'click', '[data-mback]', () => { set((s2) => { unmoveSession(s2.plan, day); return s2; }); close(); rerender(); });
    },
  });
}
