// כרטיס התזכורות במסך המאמן + הצעה במסך הבית.
import { html, on, toast, sheet, ib } from '../ui/dom.js';
import { platform, installOneLine } from '../install.js';
import { get, set, g } from '../store.js';
import { reminders, enableReminders, disableReminders, testReminder, saveReminderSettings, needsInstall, pushSupported, buildICS, workoutTime, calendarFeed, isIOS } from '../reminders.js';
import { COACHES } from '../data/coaches.js';
import { APP_ID } from '../app-id.js';
import { plannedToday, toMin } from '../engine/schedule.js';

const DAY_NAMES = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const DAY_FULL = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export function reminderCard() {
  const r = reminders();
  const st = r.settings;
  if (!r.enabled) {
    return html`<div class="card">
      <div><div><b>תזכורות מהמאמן</b><div class="sub t-foot">אימון, שתייה ושקילה — גם כשהאפליקציה סגורה</div></div></div>
      ${needsInstall() ? html`<div class="g-tip" style="margin-top:12px">${ib('phone', 'acc', 'sm')}<div>באייפון, תזכורות עובדות רק כשהאפליקציה <b>מותקנת במסך הבית</b>. ${installOneLine(platform()) || installOneLine('ios-safari')} אחר כך פותחים משם ומפעילים כאן.</div></div>`
        : !pushSupported() ? '<div class="sub" style="margin-top:10px">הדפדפן הזה לא תומך בתזכורות. אפשר להשתמש בלוח השנה</div>'
        : '<button class="btn primary block" style="margin-top:12px" data-rem="on">הפעל תזכורות</button>'}
      <button class="sched-line" style="margin-top:10px" data-sched><span class="txt">${scheduleText(st)}</span><b>ימים ושעות</b></button>
      <button class="btn sm ghost block" style="margin-top:8px" data-rem="ics">הוספה ליומן של הטלפון</button>
    </div>`;
  }
  const tog = (k, label, sub) => `<button class="row between rem-tog" data-rtog="${k}"><div><b>${label}</b><div class="sub" style="font-size:12px">${sub}</div></div><span class="sw ${st[k]?.on ? 'on' : ''}"><i></i></span></button>`;
  return html`<div class="card rem">
    <div class="row between"><b>תזכורות פעילות</b><button class="btn sm" data-rem="test">שלח דוגמה</button></div>

    ${tog('workout', 'תזכורת אימון', 'לא נשלחת אם כבר התאמנת באותו יום')}
    ${st.workout?.on ? html`<div class="rem-sub"><button class="sched-line" data-sched><span class="txt">${scheduleText(st)}</span><b>שינוי</b></button></div>` : ''}

    ${tog('water', 'תזכורת שתייה', 'כל כמה שעות, בשעות היום')}
    ${st.water?.on ? html`<div class="rem-sub"><div class="seg" data-rwater>${[[90, 'שעה וחצי'], [120, 'שעתיים'], [180, '3 שעות']].map(([v, t]) => `<button data-v="${v}" class="${st.water.every === v ? 'on' : ''}">${t}</button>`).join('')}</div>
      <div class="row" style="margin-top:8px"><label class="rem-time">מ- <input class="input num" type="time" data-rtime="water.from" value="${st.water.from}"></label><label class="rem-time">עד <input class="input num" type="time" data-rtime="water.to" value="${st.water.to}"></label></div></div>` : ''}

    ${tog('weigh', 'שקילה שבועית', 'בבוקר, לפני אוכל')}
    ${st.weigh?.on ? html`<div class="rem-sub row"><select class="input" data-rweighday style="height:44px">${DAY_FULL.map((d, i) => `<option value="${i}" ${Number(st.weigh.day) === i ? 'selected' : ''}>יום ${d}</option>`).join('')}</select>
      <label class="rem-time"><input class="input num" type="time" data-rtime="weigh" value="${st.weigh.time}"></label></div>` : ''}

    ${tog('comeback', '"חסר לי אותך"', 'אחרי 3 ימים בלי אימון, ב-19:00')}
    <div class="row" style="margin-top:12px"><button class="btn sm ghost" data-rem="ics">הוספה ליומן של הטלפון</button><span class="spacer"></span><button class="btn sm danger" data-rem="off">כבה</button></div>
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
  a.download = `${APP_ID}-reminders.ics`;   // שם הקובץ לפי האפליקציה (25.11.2026)
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  toast('נפתח קובץ יומן — לבחור "הוסף הכל", והאימונים ייכנסו ליומן עם התראה', 5000);
}

// ───── ימים ושעות ─────
// סיכום קצר של לוח האימונים: "א׳ 18:00 · ג׳ 07:00 · ה׳ 18:00" (או "לא נקבעו ימים")
export function scheduleText(st = reminders().settings) {
  const days = [...(st.workout?.days || [])].sort();
  if (!st.workout?.on || !days.length) return 'עוד לא נקבעו ימי אימון';
  const times = [...new Set(days.map((d) => workoutTime(st, d)))];
  return times.length === 1 ? `${days.map((d) => DAY_NAMES[d]).join(' · ')} — ב-${times[0]}` : days.map((d) => `${DAY_NAMES[d]} ${workoutTime(st, d)}`).join(' · ');
}
// שורה במסך הבית: ימי האימון והשעות, ולחיצה פותחת את המסך
export const scheduleRowHtml = () => `<button class="sched-line sched-home" data-sched>${ib('plan', 'acc', 'sm')}<span class="txt">${scheduleText()}</span><b>ימים ושעות</b></button>`;
export const bindSchedule = (root, rerender) => on(root, 'click', '[data-sched]', () => scheduleSheet(rerender));

// המסך: לכל יום בשבוע — מתג ושעה. נשמר מיד; מכאן גם שולחים ליומן של הטלפון ומפעילים תזכורות
export function scheduleSheet(rerender) {
  const cur = () => structuredClone(reminders().settings);
  const save = (fn) => { const s = cur(); s.workout = { on: true, days: [], time: '18:00', ...s.workout, times: { ...(s.workout?.times || {}) } }; fn(s.workout); s.workout.days.sort(); saveReminderSettings(s); };
  const rows = () => { const st = cur(); return DAY_FULL.map((d, i) => { const on = st.workout?.on && (st.workout.days || []).includes(i);
    return `<div class="sched-day ${on ? 'on' : ''}"><button class="sched-tog" data-sday="${i}" role="switch" aria-checked="${on}"><span class="sw ${on ? 'on' : ''}"><i></i></span><b>יום ${d}</b></button>
      <input class="input num" type="time" data-stime="${i}" value="${workoutTime(st, i)}" ${on ? '' : 'disabled'} aria-label="שעת האימון ביום ${d}"></div>`; }).join(''); };
  sheet(html`<div class="h1" style="font-size:22px">ימים ושעות</div><p class="sub">מתי מתאמנים? בוחרים ימים, ולכל יום שעה. לפי זה נשלחות התזכורות.</p>
    <div data-srows>${rows()}</div>
    <button class="btn primary block" style="margin-top:14px" data-sfeed>שידור ליומן של הטלפון</button>
    <p class="sub" style="text-align:center;margin:6px 0 0;font-size:12px">${reminders().calId ? 'היומן מחובר — שינוי בימים או בשעות מגיע אליו לבד.' : 'מתחברים פעם אחת, ומעכשיו כל שינוי כאן מגיע ליומן לבד.'}</p>
    <button class="btn sm ghost block" style="margin-top:6px" data-scal>או: הוספה חד־פעמית כקובץ</button>
    ${reminders().enabled ? '<p class="sub" style="text-align:center;margin-top:10px">התזכורות פעילות — יגיעו לפי השעות האלה.</p>'
    : needsInstall() || !pushSupported() ? '<p class="sub" style="text-align:center;margin-top:10px">כשהאפליקציה פתוחה תופיע תזכורת בשעת האימון. לתזכורות גם כשהיא סגורה: להתקין במסך הבית ולהפעיל בהגדרות, או להוסיף ליומן.</p>'
    : '<button class="btn block" style="margin-top:8px" data-spush>הפעלת תזכורות גם כשהאפליקציה סגורה</button>'}
    <button class="btn ghost block" style="margin-top:8px" data-close>סיום</button>`, {
    onMount(sh, close) {
      const paint = () => { sh.querySelector('[data-srows]').innerHTML = rows(); };
      on(sh, 'click', '[data-sday]', (e, b) => { const d = Number(b.dataset.sday); save((w) => { const i = w.days.indexOf(d); if (i >= 0) w.days.splice(i, 1); else w.days.push(d); }); paint(); });
      sh.addEventListener('change', (e) => { const t = e.target; if (t.dataset.stime === undefined || !t.value) return; save((w) => { w.times[Number(t.dataset.stime)] = t.value; }); });
      on(sh, 'click', '[data-sfeed]', (e, b) => openFeed(b));
      on(sh, 'click', '[data-scal]', () => { if (!cur().workout?.days?.length) return toast('קודם לבחור לפחות יום אחד'); downloadICS(); });
      on(sh, 'click', '[data-spush]', async (e, b) => { b.disabled = true; b.textContent = 'מפעיל…';
        try { await enableReminders(); toast('התזכורות פעילות'); b.remove(); } catch (err) { b.disabled = false; b.textContent = 'הפעלת תזכורות גם כשהאפליקציה סגורה'; toast(err.message === 'denied' ? 'לא אושרו התראות. אפשר לאשר בהגדרות הטלפון ← התראות.' : `לא הצלחתי להפעיל: ${err.message}`, 4500); } });
      void close;
    },
    onClose: () => rerender?.(),   // בכל סגירה (כפתור, גרירה, לחיצה בחוץ) המסך שמתחת מתעדכן
  });
}

// שידור ליומן של הטלפון: שומר את הלוח בשרת ופותח את חלונית החיבור (מהמסך "ימים ושעות" ומיומן האימונים)
export async function openFeed(b) {
  if (!reminders().settings.workout?.days?.length) return toast('קודם לבחור לפחות יום אחד');
  if (b) b.disabled = true;
  try {
    const p = get().profile, ns = get().plan?.week?.sessions?.[0];
    const url = await calendarFeed({ name: p.name, coach: COACHES[p.coach]?.name, mins: Math.min(120, Math.max(20, Math.round((ns?.minutes || 60) / 5) * 5)) });
    const web = url.replace(/^https?:/, 'webcal:');
    // אייפון ומק: כתובת webcal פותחת את "הרשמה ליומן". אנדרואיד: יומן Google מוסיף את הכתובת כיומן נוסף
    feedSheet(url, isIOS() || /Macintosh/.test(navigator.userAgent) ? web : `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(web)}`);
  } catch { toast('לא הצלחתי לחבר את היומן — צריך חיבור לרשת', 4000); }
  if (b) b.disabled = false;
}

// אחרי שהלוח נשמר בשרת: כפתור שפותח את היומן של הטלפון, והכתובת עצמה למי שרוצה להוסיף ידנית
function feedSheet(url, go) {
  sheet(html`<div class="h1" style="font-size:22px">חיבור ליומן</div>
    <p class="sub">נפתח היומן של הטלפון עם הצעה להירשם ליומן האימונים. מאשרים פעם אחת — ומעכשיו האימונים מופיעים בו, עם התראה רבע שעה לפני, ומתעדכנים לבד כשמשנים ימים או שעות.</p>
    <a class="btn primary block xl" style="margin-top:12px" href="${go}" target="_blank" rel="noopener" data-fgo>פתיחת היומן</a>
    <p class="sub" style="margin-top:12px;font-size:12px">לא נפתח? אפשר להוסיף ידנית: ביומן בוחרים "הוספת יומן לפי כתובת" ומדביקים את הכתובת.</p>
    <button class="btn sm block" data-fcopy>העתקת הכתובת</button>
    <button class="btn ghost block" style="margin-top:8px" data-close>סיום</button>`, {
    onMount(sh) { on(sh, 'click', '[data-fcopy]', () => { navigator.clipboard?.writeText(url).then(() => toast('הכתובת הועתקה'), () => toast(url, 6000)); }); },
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
  sheet(html`<div class="due"><img src="${coach.face || ''}" alt=""><div><div class="eyebrow">${pt.time} · תזכורת</div><div class="h1" style="font-size:22px">הגיע הזמן לאימון</div>
      <div class="sub">${ns ? `היום: ${ns.name}` : 'האימון של היום מחכה.'}</div></div></div>
    <button class="btn primary block xl" style="margin-top:14px" data-due="go">מתחילים</button>
    <div class="row" style="gap:8px;margin-top:8px"><button class="btn" style="flex:1" data-due="later">בעוד רבע שעה</button><button class="btn ghost" style="flex:1" data-due="no">לא היום</button></div>`, {
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
  return html`<div class="card tight rem-prompt"><div class="row">${ib('bell', 'pri', 'lg')}<div style="flex:1"><b>${g('רוצה', 'רוצה')} שאזכיר לך להתאמן?</b><div class="sub" style="font-size:13px">תזכורת אימון, שתייה ושקילה — גם כשהאפליקציה סגורה</div></div></div>
    <div class="row" style="margin-top:10px"><a class="btn sm primary" href="#/coach" data-remgo>כן, להגדרות</a><button class="btn sm ghost" data-remno>לא עכשיו</button></div></div>`;
}
export function bindReminderPrompt(root, rerender) {
  on(root, 'click', '[data-remno]', () => { set((s) => { s.reminderPromptDismissed = true; return s; }); rerender(); });
  on(root, 'click', '[data-remgo]', () => { sessionStorage.setItem('scrollTo', 'reminders'); });
}
