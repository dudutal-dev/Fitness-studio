// מסך הבית: מסך אחד בלי גלילה — האימון הבא, שורת המאמן, המעקב היומי ומדד הכושר. התראות ופירוט בחלוניות.
import { html, esc, on, sheet, toast, greeting, icon, ib, emi, fmtDate } from '../ui/dom.js';
import { ring } from '../ui/charts.js';
import { get, set, daily, setDaily, today, addXP, XP, g } from '../store.js';
import { COACHES, demoPoster } from '../data/coaches.js';
import { EX } from '../data/exercises.js';
import { combatReadiness, rankFor, streak, readinessScore } from '../engine/stats.js';
import { targets, dayTotals } from '../engine/nutrition.js';
import { buildFieldWorkout } from '../engine/program.js';
import { say, onSpeaking, unlock } from '../coach/voice.js';
import { MOTIVATION_KEYS, lineFor } from '../data/voice-lines.js';
import { startWorkout } from './workout.js';
import { startRun } from './run.js';
import { isCali, hasCali, hasGym, sessionCoach } from '../engine/cali.js';
import { isMob, hasMob, mobScore, mobTested, retestDue } from '../engine/mob.js';
import { quickMobSheet, mobTestSheet } from './mob-ui.js';
import { isRun } from '../engine/running.js';
import { isHiit } from '../engine/hiit.js';
import { isPil } from '../engine/pil.js';
import { reminderPromptHtml, bindReminderPrompt } from './reminders-ui.js';
import { backupDue, backupNow, snoozeBackup } from '../backup.js';

export function nextSession(s) {
  const done = new Set(s.plan.completedDays);
  return s.plan.week.sessions.find((x) => !done.has(x.day)) || null;
}

export function estMinutes(w) {
  if (['mob', 'hiit', 'pil'].includes(w.track)) return w.minutes || 20;
  if (w.runOnly) return Math.round(w.run.totalSec / 60) || 15;
  const t = w.items.reduce((a, it) => a + it.sets * (40 + it.rest), 0) / 60 + 8 + (w.finisher ? 8 : 0);
  return Math.round(t / 5) * 5;
}

function coachLine(s) {
  const p = s.profile;
  const st = streak([...s.sessions, ...s.runs]);
  const ns = nextSession(s);
  if (!s.sessions.length && !s.runs.length) return { key: 'workout_start', text: `<b>${esc(p.name)}</b>, התוכנית שלך מוכנה. האימון הראשון הוא הכי חשוב — ${g('בוא', 'בואי')} נעשה אותו יחד.` };
  if (st >= 3) return { key: 'streak', text: `רצף של <b>${st} ימים</b>! ${isPil(p) ? 'שיעור אחרי שיעור, והמרכז מתחזק.' : isHiit(p) ? 'עשרים דקות ביום, וזה מצטבר.' : isRun(p) ? 'ככה בונים סבולת — ריצה אחרי ריצה.' : isMob(p) ? 'טווח תנועה נבנה ככה — קצת בכל יום.' : isCali(p) ? 'ככה בונים שליטה בגוף.' : 'ככה בונים כושר.'} ${ns ? `היום: ${esc(ns.name)}.` : ''}` };
  if (isPil(p)) return { key: 'workout_start', text: `${ns ? `השיעור הבא: <b>${esc(ns.name)}</b>, ${ns.minutes} דקות. ` : ''}תנועה קטנה ומדויקת עדיפה על גדולה ומרושלת.` };
  if (isHiit(p)) return { key: 'workout_start', text: `${ns ? `האימון הבא: <b>${esc(ns.name)}</b>, ${ns.minutes} דקות. ` : ''}נותנים הכל בזמן העבודה, ונחים באמת במנוחה.` };
  if (isRun(p)) return { key: 'workout_start', text: `${ns ? `הריצה הבאה: <b>${esc(ns.name)}</b>. ` : ''}רוב הריצות בקצב שאפשר לדבר בו — שם נבנית הסבולת.` };
  if (isMob(p)) return { key: 'workout_start', text: `${ns ? `האימון הבא: <b>${esc(ns.name)}</b>. ` : ''}עשר דקות היום שוות יותר משעה פעם בשבוע.` };
  const key = MOTIVATION_KEYS[new Date().getDate() % MOTIVATION_KEYS.length];
  return { key, text: `${esc(lineFor(key, p.coach, p.sex))} ${ns ? `<br>המשימה הבאה: <b>${esc(ns.name)}</b>.` : ''}` };
}

export function renderHome(root) {
  const s = get();
  const p = s.profile;
  const coach = COACHES[p.coach];
  const cri = combatReadiness({ profile: p, history: s.history, sessions: s.sessions, runs: s.runs, weights: s.weights });
  const rank = rankFor(s.xp);
  const st = streak([...s.sessions, ...s.runs]);
  const ns = nextSession(s);
  const dd = daily();
  const t = targets(p);
  const line = coachLine(s);
  const doneDays = new Set(s.plan.completedDays);
  const lastW = s.weights[s.weights.length - 1];
  const heroEx = ns?.items[0]?.exId || (ns?.runOnly || isRun(p) ? 'outdoor_run' : isHiit(p) ? 'h_squat_jump' : isPil(p) ? 'p_hundred' : isMob(p) ? 'm_cat_cow' : isCali(p) ? 'pushup' : 'back_squat');

  const total = s.plan.week.sessions.length;
  const doneN = s.plan.week.sessions.filter((x) => doneDays.has(x.day)).length;
  const eaten = dayTotals(dd, p.customFoods);
  const pct = (v, of) => Math.min(100, Math.round((v / Math.max(1, of)) * 100));
  const tile = (act, ic, val, unit, label, bar) => `<button class="card tight tracker" data-act="${act}"><div class="tr-top">${ic}<span class="tr-add">＋</span></div>
    <div class="v num">${val}<small> ${unit}</small></div><div class="sub t-cap">${label}</div>${bar != null ? `<div class="bar"><i style="width:${bar}%"></i></div>` : ''}</button>`;

  // מה שלא חייב להיות מול העיניים עבר לחלוניות: התראות ועדכונים (פעמון), ופירוט מדד הכושר (הקשה על השורה שלו)
  const promptsHtml = html`${hasMob(p) && retestDue(p.mob) ? `<div class="card tight rem-prompt"><div class="row">${ib('target', 'acc', 'lg')}<div style="flex:1"><b>${mobTested(p.mob) ? 'הגיע הזמן למבחן טווחים חוזר' : 'מבחן טווחים קצר'}</b><div class="sub" style="font-size:13px">${mobTested(p.mob) ? 'עברו ארבעה שבועות. שישה מבחנים קצרים יראו מה השתפר.' : 'שישה מבחנים ביתיים, כחמש דקות. לפיהם האימונים יתמקדו במה שהכי צריך.'}</div></div></div>
      <button class="btn sm primary" style="margin-top:10px" data-act="mob-test">${mobTested(p.mob) ? 'למבחן החוזר' : 'לעשות את המבחן'}</button></div>` : ''}
    ${reminderPromptHtml()}
    ${backupDue(s) && !reminderPromptHtml() ? html`<div class="card tight rem-prompt"><div class="row">${ib('save', 'acc', 'lg')}<div style="flex:1"><b>כדאי לגבות את הנתונים</b><div class="sub" style="font-size:13px">${s.sessions.length + s.runs.length} אימונים שמורים רק בטלפון הזה. ${s.lastBackupAt ? 'עבר חודש מהגיבוי האחרון.' : 'עדיין לא בוצע גיבוי.'}</div></div></div>
      <div class="row" style="margin-top:10px"><button class="btn sm primary" data-act="backup">גבה עכשיו</button><button class="btn sm ghost" data-act="backup-later">אחר כך</button></div></div>` : ''}`.trim();
  const eventsHtml = html`${s.events.length ? html`<div class="h2">עדכונים</div><div class="card tight list-hist">${s.events.slice(0, 3).map((e) => `<div class="it">${ib(e.type === 'pr' ? 'trophy' : e.type === 'rank' ? 'medal' : e.type === 'level' ? 'rocket' : 'chat', e.type === 'pr' || e.type === 'rank' ? 'pri' : 'acc')}<div><div style="font-weight:700;font-size:14px">${esc(e.text)}</div><div class="sub t-cap">${fmtDate(e.date)}</div></div></div>`)}</div>` : ''}`.trim();
  const fitHtml = html`<div class="card">
      <div class="cri">
        ${ring((cri.score ?? 0) / 100, { size: 104, stroke: 10, big: cri.score ?? '—', lbl: cri.score == null ? 'עוד לא נמדד' : 'מתוך 100' })}
        <div>
          ${isRun(p) || isHiit(p) || isPil(p) ? '' : isMob(p) ? meter('טווחים', mobTested(p.mob) ? mobScore(p.mob) : null, 'אחרי מבחן הטווחים') : meter('כוח', cri.parts.strength, 'אחרי אימון כוח')}${hasGym(p) || isRun(p) ? meter('סבולת', cri.parts.endurance, 'אחרי מבדק 3 ק״מ') : ''}${hasCali(p) ? meter('מיומנות', cri.parts.skill, 'בחר מיומנות במסך התוכנית') : ''}
          ${meter('עקביות', cri.parts.consistency)}${meter('גוף', cri.parts.body, 'אחרי שקילה שנייה')}
        </div>
      </div>
      <div class="rank-row"><span>${emi(rank.icon)} ${rank.name}</span><div class="bar"><i style="width:${rank.pct * 100}%"></i></div><span class="num">${rank.next ? `${s.xp} / ${rank.next.xp}` : s.xp} XP</span></div>
    </div>`;

  // מסך אחד, בלי גלילה: האימון הבא תופס את רוב המסך, ומתחתיו המאמן, המעקב היומי ומדד הכושר
  root.innerHTML = html`<div class="home">
    <div class="topbar">
      <div class="hello"><div class="sub">${greeting()}</div><div class="h1">${esc(p.name)}</div></div>
      <div class="top-actions">
        ${st ? `<span class="tag orange" title="רצף ימים">${icon('flame')} <span class="num">${st}</span></span>` : ''}
        <button class="set-btn bell" data-act="notices" aria-label="עדכונים">${icon('bell')}${promptsHtml ? '<i class="dot"></i>' : ''}</button>
        <a href="#/coach" class="set-btn" aria-label="הגדרות">${icon('gear')}<span>הגדרות</span></a>
      </div>
    </div>

    ${ns ? html`<div class="hero"><img class="bg" src="${demoPoster(sessionCoach(p, ns), heroEx)}" alt="">
      <div class="hero-in"><div class="eyebrow">האימון הבא · ${esc(s.plan.week.phase.name)}</div>
        <div class="h1" style="font-size:24px">${esc(ns.name)}</div><div class="sub">${esc(ns.focus)}</div>
        <div class="stats"><div><b>${estMinutes(ns)}</b>דקות</div>${ns.runOnly ? `<div><b>${ns.run.segs.filter((x) => !['warm', 'cool'].includes(x.kind)).length}</b>קטעים</div>` : `<div><b>${ns.items.length}</b>תרגילים</div>`}
          ${ns.track === 'hiit' ? `<div><b>${ns.rounds}</b>סבבים</div><div><b>${ns.work}/${ns.rest}</b>שנ׳</div>` : ns.track === 'mob' || ns.track === 'pil' || ns.runOnly ? '' : `<div><b>${ns.items.reduce((a, b) => a + b.sets, 0)}</b>סטים</div>`}${ns.run && !ns.runOnly ? `<div><b>+</b>ריצה</div>` : ''}</div>
        <button class="btn primary block xl" data-act="start">${icon('play', 'width="22" height="22"')} ${g('התחל', 'התחילי')} ${ns.runOnly ? 'ריצה' : 'אימון'}</button>
        <div class="hero-sub">${ns?.run && !ns.runOnly ? `<button class="btn sm" data-act="run">${icon('run', 'width="18" height="18"')} רק ריצה</button>` : ''}
      ${isRun(p) || isHiit(p) || isPil(p) ? (hasMob(p) ? `<button class="btn sm" data-act="quick-mob" style="grid-column:1/-1">${icon('sparkle', 'width="18" height="18"')} מוביליטי קצר</button>` : '')
    : isMob(p) ? `<button class="btn sm" data-act="quick-mob" style="grid-column:1/-1">${icon('sparkle', 'width="18" height="18"')} אימון חופשי לפי אזור</button>`
    : `<button class="btn sm" data-act="field" ${ns?.run || hasMob(p) ? '' : 'style="grid-column:1/-1"'}>${icon('pack', 'width="18" height="18"')} אימון בלי ציוד</button>${hasMob(p) && !ns?.run ? `<button class="btn sm" data-act="quick-mob">${icon('sparkle', 'width="18" height="18"')} מוביליטי קצר</button>` : ''}`}</div>
        <div class="week-cap"><span>השבוע</span><span><span class="num">${doneN}</span> מתוך <span class="num">${total}</span> אימונים</span></div>
        <div class="week">${s.plan.week.sessions.map((x) => `<i class="d ${doneDays.has(x.day) ? 'done' : ns?.day === x.day ? 'next' : ''}"></i>`)}</div>
      </div></div>`
    : html`<div class="hero done"><div class="hero-in"><div class="e">${ib('trophy', 'pri', 'xl')}</div><div class="h1" style="font-size:24px">השבוע הושלם!</div><div class="sub">מנוחה — השבוע הבא נטען אוטומטית.</div>
        <div class="hero-sub">${ns?.run && !ns.runOnly ? `<button class="btn sm" data-act="run">${icon('run', 'width="18" height="18"')} רק ריצה</button>` : ''}
      ${isRun(p) || isHiit(p) || isPil(p) ? (hasMob(p) ? `<button class="btn sm" data-act="quick-mob" style="grid-column:1/-1">${icon('sparkle', 'width="18" height="18"')} מוביליטי קצר</button>` : '')
    : isMob(p) ? `<button class="btn sm" data-act="quick-mob" style="grid-column:1/-1">${icon('sparkle', 'width="18" height="18"')} אימון חופשי לפי אזור</button>`
    : `<button class="btn sm" data-act="field" ${ns?.run || hasMob(p) ? '' : 'style="grid-column:1/-1"'}>${icon('pack', 'width="18" height="18"')} אימון בלי ציוד</button>${hasMob(p) && !ns?.run ? `<button class="btn sm" data-act="quick-mob">${icon('sparkle', 'width="18" height="18"')} מוביליטי קצר</button>` : ''}`}</div></div></div>`}

    <div class="card coach-hero">
      <div class="holo"><img src="${coach.face}" alt="${coach.name}"></div>
      <div class="bubble">${line.text}</div>
      <button class="speak" data-act="speak" data-key="${line.key}" aria-label="השמע את ${coach.name}"><span class="wave"><i></i><i></i><i></i><i></i></span></button>
    </div>

    <div class="today">
      ${tile('water', ib('drop', 'acc'), (dd.water / 1000).toFixed(1), `/ ${t.waterL} ל׳`, 'מים', pct(dd.water, t.waterL * 1000))}
      ${tile('food', ib('food', 'pri'), eaten.kcal.toLocaleString('he-IL'), `/ ${t.kcal.toLocaleString('he-IL')}`, 'קלוריות', pct(eaten.kcal, t.kcal))}
      ${tile('weight', ib('scale'), lastW ? lastW.kg : '—', 'ק״ג', 'משקל', null)}
      ${tile('checkin', ib('pulse', 'ok'), dd.checkin != null ? Math.round(dd.checkin * 100) : '—', dd.checkin != null ? '%' : '', 'מוכנות', dd.checkin != null ? Math.round(dd.checkin * 100) : null)}
    </div>

    <button class="card tight fit-strip" data-act="fitness">
      ${ring((cri.score ?? 0) / 100, { size: 46, stroke: 5, big: cri.score ?? '—' })}
      <div class="grow"><div class="row between"><b>הכושר שלך</b><span class="sub t-cap">${emi(rank.icon)} ${rank.name}</span></div>
        <div class="bar"><i style="width:${rank.pct * 100}%"></i></div></div>
      <span class="chev">${icon('chev', 'width="18" height="18"')}</span>
    </button>
    </div>
  `;

  const off = onSpeaking((v) => root.querySelector('.speak')?.classList.toggle('speaking', v));
  root._cleanup = off;

  const rerender = () => renderHome(root);
  const act = (a, el) => {
    unlock();
    if (a === 'notices') {
      return sheet(`<div class="h1" style="font-size:22px">הודעות</div>${promptsHtml}${eventsHtml}${promptsHtml || eventsHtml ? '' : '<p class="sub">אין עדכונים חדשים.</p>'}<button class="btn block" style="margin-top:14px" data-close>סגור</button>`, {
        onMount(sh, close) {
          bindReminderPrompt(sh, () => { close(); rerender(); });
          on(sh, 'click', '[data-act], [data-remgo]', (ev, b) => { close(); if (b.dataset.act) act(b.dataset.act, b); });
        },
      });
    }
    if (a === 'fitness') return sheet(`<div class="h1" style="font-size:22px">הכושר שלך</div><p class="sub">הציון מורכב מהמדדים שכבר נמדדו.</p>${fitHtml}<a class="btn primary block" style="margin-top:14px" href="#/progress" data-close>להתקדמות המלאה</a><button class="btn ghost block" style="margin-top:8px" data-close>סגור</button>`);
    if (a === 'speak') say(el.dataset.key, { priority: true });
    if (a === 'start') begin(ns);
    if (a === 'run') startRun(ns.run, { day: ns.day });
    if (a === 'field') checkIn((r) => startWorkout({ ...buildFieldWorkout(p), day: null, field: true }, { readiness: r }));
    if (a === 'water') { setDaily({ water: dd.water + 250 }); if (dd.water + 250 >= t.waterL * 1000 && dd.water < t.waterL * 1000) { addXP(XP.water * 4); toast('יעד השתייה הושלם!'); } renderHome(root); }
    if (a === 'food') location.hash = '#/nutrition';
    if (a === 'weight') weightSheet(() => renderHome(root));
    if (a === 'backup') backupNow().then((ok) => { if (ok) toast('הגיבוי נשמר'); renderHome(root); });
    if (a === 'backup-later') { snoozeBackup(7); renderHome(root); }
    if (a === 'checkin') checkIn(() => renderHome(root), true);
    if (a === 'quick-mob') quickMobSheet((w) => startWorkout(w));
    if (a === 'mob-test') mobTestSheet(() => renderHome(root));
  };
  on(root, 'click', '[data-act]', (e, el) => act(el.dataset.act, el));
}

// רכיב שעוד לא נמדד מוצג בלי מספר, עם הסבר מתי יופיע
const meter = (label, v, pending = '') => `<div class="meter"><div class="row"><span>${label}</span><span>${v ?? `<small>${pending}</small>`}</span></div><div class="bar"><i style="width:${v ?? 0}%"></i></div></div>`;

// התחלת אימון: לפני אימון כוח — צ׳ק־אין מוכנות; אימון מוביליטי מתחיל ישר (שם בוחרים רק כמה זמן יש)
export const begin = (w) => (w.runOnly ? startRun(w.run, { day: w.day }) : w.track === 'mob' || w.track === 'pil' ? startWorkout(w) : checkIn((r) => startWorkout(w, { readiness: r })));

// צ׳ק־אין מוכנות לפני אימון → אוטו־רגולציה
export function checkIn(cb, onlyLog = false) {
  const existing = daily().checkin;
  if (existing != null && !onlyLog) return cb(existing);
  const q = { sleep: 3, energy: 3, soreness: 3, stress: 3 };
  const Q = [['sleep', 'איך ישנת?', [1, 2, 3, 4, 5]], ['energy', 'רמת אנרגיה', [1, 2, 3, 4, 5]],
    ['soreness', 'כאבי שרירים', [5, 4, 3, 2, 1]], ['stress', 'לחץ ועומס', [5, 4, 3, 2, 1]]];
  sheet(html`<div class="eyebrow">צ׳ק־אין לפני אימון</div><div class="h1" style="font-size:24px">${g('איך אתה מרגיש', 'איך את מרגישה')} היום?</div>
    <p class="sub">המאמן יתאים את עומס האימון למצב שלך — אחרי יום קשה מורידים, ביום טוב מגבירים.</p>
    ${Q.map(([k, t, em]) => html`<div style="margin:14px 0 6px;font-weight:700">${t}</div>
      <div class="rpe" style="grid-template-columns:repeat(5,1fr)" data-q="${k}">${em.map((x, i) => `<button data-v="${i + 1}" class="${q[k] === i + 1 ? 'on' : ''}" aria-label="${i + 1} מתוך 5"><span>${icon(`face${x}`)}</span></button>`)}</div>`)}
    <button class="btn primary block xl" style="margin-top:20px" data-go>${onlyLog ? 'שמור' : 'יאללה, לאימון'}</button>`, {
    onMount(sh, close) {
      on(sh, 'click', '[data-q] button', (e, b) => {
        const k = b.parentElement.dataset.q; q[k] = Number(b.dataset.v);
        b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      });
      sh.querySelector('[data-go]').addEventListener('click', () => {
        const r = readinessScore(q);
        const first = daily().checkin == null;
        setDaily({ checkin: r });
        if (first) addXP(XP.checkin);
        say(isMob(get().profile) ? 'workout_start' : r < 0.45 ? 'checkin_low' : r > 0.8 ? 'checkin_high' : 'workout_start', { priority: true });
        close(); cb(r);
      });
    },
  });
}

export function weightSheet(cb) {
  const s = get();
  const last = s.weights[s.weights.length - 1]?.kg ?? s.profile.weightKg;
  let v = last;
  sheet(html`<div class="eyebrow">שקילה</div><div class="h1" style="font-size:24px">${g('כמה אתה שוקל', 'כמה את שוקלת')} היום?</div>
    <p class="sub">הכי מדויק: בבוקר, אחרי שירותים, לפני אוכל. המגמה חשובה יותר מכל שקילה בודדת.</p>
    <div class="stepper" style="margin:18px 0"><button data-d="-0.1">−</button><div class="val"><span id="wv">${v.toFixed(1)}</span><small>ק״ג</small></div><button data-d="0.1">+</button></div>
    <div class="row"><button class="btn sm" data-d="-1">−1</button><button class="btn sm" data-d="-0.5">−0.5</button><span class="spacer"></span><button class="btn sm" data-d="0.5">+0.5</button><button class="btn sm" data-d="1">+1</button></div>
    <button class="btn primary block xl" style="margin-top:18px" data-save>שמור</button>`, {
    onMount(sh, close) {
      on(sh, 'click', '[data-d]', (e, b) => { v = Math.round((v + Number(b.dataset.d)) * 10) / 10; sh.querySelector('#wv').textContent = v.toFixed(1); });
      sh.querySelector('[data-save]').addEventListener('click', () => {
        set((st) => {
          st.weights = st.weights.filter((w) => w.date !== today()).concat({ date: today(), kg: v });
          st.profile.weightKg = v;
          return st;
        });
        addXP(XP.weight);
        toast('המשקל נשמר');
        close(); cb?.();
      });
    },
  });
}
