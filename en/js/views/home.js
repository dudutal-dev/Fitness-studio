// מסך הבית: מסך אחד בלי גלילה — האימון הבא, שורת המאמן, המעקב היומי ומדד הכושר. התראות ופירוט בחלוניות.
import { html, esc, on, sheet, toast, greeting, icon, ib, emi, fmtDate } from '../ui/dom.js';
import { ring } from '../ui/charts.js';
import { get, set, daily, setDaily, today, addXP, XP, g } from '../store.js';
import { COACHES, demoPoster } from '../data/coaches.js';
import { EX } from '../data/exercises.js';
import { combatReadiness, rankFor, streak, readinessScore } from '../engine/stats.js';
import { dayTotals, dayType, dayTargets, wantsNutrition, mealPlan, orderMeals, mealWindow, mainCtx } from '../engine/nutrition.js';
import { FOOD } from '../data/foods.js';
import { openNutritionTab } from './nutrition.js';
import { buildFieldWorkout, extraCoach } from '../engine/program.js';
import { say, onSpeaking, unlock, useCoach } from '../coach/voice.js';
import { MOTIVATION_KEYS, lineFor } from '../data/voice-lines.js';
import { startWorkout } from './workout.js';
import { startRun, freeRun } from './run.js';
import { isCali, hasCali, hasGym, sessionCoach } from '../engine/cali.js';
import { isMob, hasMob, mobScore, mobTested, retestDue } from '../engine/mob.js';
import { quickMobSheet, mobTestSheet } from './mob-ui.js';
import { isRun } from '../engine/running.js';
import { isHiit } from '../engine/hiit.js';
import { isPil } from '../engine/pil.js';
import { isYoga } from '../engine/yoga.js';
import { isTai } from '../engine/tai.js';
import { isWalk } from '../engine/walking.js';
import { medCardHtml, medSheet } from './med-ui.js';
import { reminderPromptHtml, bindReminderPrompt } from './reminders-ui.js';
import { homeNextHtml, bindCalendar } from './calendar-ui.js';
import { nextPlanned, trainedToday } from '../engine/schedule.js';
import { reminders } from '../reminders.js';
import { trackSheet, trackLabel } from './track-sheet.js';
import { backupDue, backupNow, snoozeBackup } from '../backup.js';

export function nextSession(s) {
  // האימון הפתוח הקרוב ביותר ביומן (אימון שבוטל לשבוע הזה לא נספר; אימון שהוזז מחכה למועד שלו)
  const now = new Date();
  return nextPlanned(s.plan, reminders().settings, now, trainedToday(s, now))?.session || null;
}

export function estMinutes(w) {
  if (['mob', 'hiit', 'pil', 'yoga', 'tai'].includes(w.track)) return w.minutes || 20;
  if (w.runOnly) return Math.round(w.run.totalSec / 60) || 15;
  const t = w.items.reduce((a, it) => a + it.sets * (40 + it.rest), 0) / 60 + 8 + (w.finisher ? 8 : 0);
  return Math.round(t / 5) * 5;
}

function coachLine(s) {
  const p = s.profile;
  const st = streak([...s.sessions, ...s.runs]);
  const ns = nextSession(s);
  if (!s.sessions.length && !s.runs.length) return { key: 'workout_start', text: `<b>${esc(p.name)}</b>, your plan is ready. The first workout matters most — ${g('let\'s', 'let\'s')} do it together.` };
  if (st >= 3) return { key: 'streak', text: `A streak of <b>${st} days</b>! ${isWalk(p) ? 'Step by step, it adds up.' : isTai(p) ? 'A few minutes every day — that is what builds balance.' : isYoga(p) ? 'A few minutes on the mat every day adds up.' : isPil(p) ? 'Class after class, your core gets stronger.' : isHiit(p) ? 'Twenty minutes a day adds up.' : isRun(p) ? 'This is how endurance is built — run after run.' : isMob(p) ? 'This is how range of motion is built — a little every day.' : isCali(p) ? 'This is how body control is built.' : 'This is how fitness is built.'} ${ns ? `Today: ${esc(ns.name)}.` : ''}` };
  if (isTai(p)) return { key: 'workout_start', text: `${ns ? `Next class: <b>${esc(ns.name)}</b>, ${ns.minutes} minutes. ` : ''}Slowly, in small steps, with a chair within reach.` };
  if (isYoga(p)) return { key: 'workout_start', text: `${ns ? `Next class: <b>${esc(ns.name)}</b>, ${ns.minutes} minutes. ` : ''}You don't need to be flexible to start — just breathe.` };
  if (isPil(p)) return { key: 'workout_start', text: `${ns ? `Next class: <b>${esc(ns.name)}</b>, ${ns.minutes} minutes. ` : ''}A small, precise movement beats a big, sloppy one.` };
  if (isHiit(p)) return { key: 'workout_start', text: `${ns ? `Next workout: <b>${esc(ns.name)}</b>, ${ns.minutes} minutes. ` : ''}Give it everything during work, and truly rest during rest.` };
  if (isWalk(p)) return { key: 'walk_talk', text: `${ns ? `Next walk: <b>${esc(ns.name)}</b>, ${ns.minutes} minutes. ` : ''}A good pace is one where you can talk, but not sing.` };
  if (isRun(p)) return { key: 'workout_start', text: `${ns ? `Next run: <b>${esc(ns.name)}</b>. ` : ''}Most runs at a pace you can talk at — that is where endurance is built.` };
  if (isMob(p)) return { key: 'workout_start', text: `${ns ? `Next workout: <b>${esc(ns.name)}</b>. ` : ''}Ten minutes today are worth more than an hour once a week.` };
  const key = MOTIVATION_KEYS[new Date().getDate() % MOTIVATION_KEYS.length];
  return { key, text: `${esc(lineFor(key, p.coach, p.sex))} ${ns ? `<br>Next up: <b>${esc(ns.name)}</b>.` : ''}` };
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
  const t = dayTargets(p, dayType(s, Date.now(), dd.dayType).type);   // יעד היום — כמו במסך התזונה
  const line = coachLine(s);
  const doneDays = new Set(s.plan.completedDays);
  const lastW = s.weights[s.weights.length - 1];
  const heroEx = ns?.items[0]?.exId || (ns?.run?.walk || isWalk(p) ? 'outdoor_walk' : ns?.runOnly || isRun(p) ? 'outdoor_run' : isHiit(p) ? 'h_squat_jump' : isPil(p) ? 'p_hundred' : isYoga(p) ? 'y_warrior2' : isTai(p) ? 't_cloud_hands' : isMob(p) ? 'm_cat_cow' : isCali(p) ? 'pushup' : 'back_squat');

  const total = s.plan.week.sessions.length;
  const doneN = s.plan.week.sessions.filter((x) => doneDays.has(x.day)).length;
  const eaten = dayTotals(dd, p.customFoods);
  const pct = (v, of) => Math.min(100, Math.round((v / Math.max(1, of)) * 100));
  // כרטיס התזונה של היום: כמה נשאר, שלושת אבות המזון, והארוחה הבאה מהתפריט (אותו תפריט שבמסך התזונה)
  const nutCard = () => {
    const left = t.kcal - eaten.kcal, nf = (n) => Math.round(n).toLocaleString('en-US');
    const ms = dd.menu && dd.menu.seed === new Date().getDate() && dd.menu.ctx === mainCtx(p) ? dd.menu : {};
    const plan = mealPlan(p, { ctx: mainCtx(p), seed: new Date().getDate(), t, swaps: ms.swaps, dishes: ms.dishes });
    const h = new Date().getHours();
    const order = h < 10 ? ['breakfast', 'snack1', 'lunch'] : h < 12 ? ['snack1', 'lunch'] : h < 15 ? ['lunch', 'post', 'dinner'] : h < 18 ? ['post', 'dinner'] : ['dinner'];
    // כשנקבעו ימי אימון הארוחות מסודרות לפי שעת האימון של היום (orderMeals), ו"הארוחה הבאה" היא הראשונה שעוד לא עברה
    const mw = mealWindow(s); orderMeals(plan, mw);
    const nowMin = h * 60 + new Date().getMinutes();
    const meal = (mw ? plan.meals.find((m) => m.at + 90 > nowMin) : order.map((id) => plan.meals.find((m) => m.id === id)).find(Boolean)) || plan.meals[plan.meals.length - 1];
    const bar = (name, v, of, color) => `<div class="nh-m"><span><i>${name}</i><em><b class="num">${Math.round(v)}</b><small>/${of}</small></em></span><div class="bar"><i style="width:${pct(v, of)}%;background:${color}"></i></div></div>`;
    return html`<button class="card nut-home" data-act="nut">
      <div class="nh-top">${ring(Math.min(1, eaten.kcal / Math.max(1, t.kcal)), { size: 58, stroke: 6, big: pct(eaten.kcal, t.kcal) + '%' })}
        <div class="grow"><div class="eyebrow">${icon('food', 'width="14" height="14"')} Today's nutrition</div>
          <div class="nh-left">${left >= 0 ? ` <b class="num">${nf(left)}</b> kcal left` : `<b class="num">${nf(-left)}</b> kcal over target`}<small> of ${nf(t.kcal)}</small></div>
          <div class="nh-macros">${bar('Protein', eaten.p, t.protein, 'var(--pri)')}${bar('Carbs', eaten.c, t.carbs, 'var(--acc)')}${bar('Fat', eaten.f, t.fat, 'var(--orange)')}</div></div></div>
      ${meal ? `<div class="nh-next"><span class="sub">Next meal · ${meal.name}</span><b>${meal.dish ? esc(meal.dish.name) : meal.items.slice(0, 3).map((it) => esc(FOOD[it.id].name)).join(' · ')}</b><span class="chev">${icon('chev', 'width="16" height="16"')}</span></div>` : ''}
    </button>`;
  };
  const tile = (act, ic, val, unit, label, bar) => `<button class="card tight tracker" data-act="${act}"><div class="tr-top">${ic}<span class="tr-add">＋</span></div>
    <div class="v num">${val}<small> ${unit}</small></div><div class="sub t-cap">${label}</div>${bar != null ? `<div class="bar"><i style="width:${bar}%"></i></div>` : ''}</button>`;

  // מה שלא חייב להיות מול העיניים עבר לחלוניות: התראות ועדכונים (פעמון), ופירוט מדד הכושר (הקשה על השורה שלו)
  const promptsHtml = html`${hasMob(p) && retestDue(p.mob) ? `<div class="card tight rem-prompt"><div class="row">${ib('target', 'acc', 'lg')}<div style="flex:1"><b>${mobTested(p.mob) ? 'Time to retest your range of motion' : 'A short range-of-motion test'}</b><div class="sub" style="font-size:13px">${mobTested(p.mob) ? 'Four weeks have passed. Six short tests will show what improved.' : 'Six at-home tests, about five minutes. Your sessions will then focus on what needs it most.'}</div></div></div>
      <button class="btn sm primary" style="margin-top:10px" data-act="mob-test">${mobTested(p.mob) ? 'Retest' : 'Take the test'}</button></div>` : ''}
    ${reminderPromptHtml()}
    ${backupDue(s) && !reminderPromptHtml() ? html`<div class="card tight rem-prompt"><div class="row">${ib('save', 'acc', 'lg')}<div style="flex:1"><b>Back up your data</b><div class="sub" style="font-size:13px">${s.sessions.length + s.runs.length} workouts are stored on this phone only. ${s.lastBackupAt ? 'It has been a month since your last backup.' : 'No backup yet.'}</div></div></div>
      <div class="row" style="margin-top:10px"><button class="btn sm primary" data-act="backup">Back up now</button><button class="btn sm ghost" data-act="backup-later">Later</button></div></div>` : ''}`.trim();
  const eventsHtml = html`${s.events.length ? html`<div class="h2">Updates</div><div class="card tight list-hist">${s.events.slice(0, 3).map((e) => `<div class="it">${ib(e.type === 'pr' ? 'trophy' : e.type === 'rank' ? 'medal' : e.type === 'level' ? 'rocket' : 'chat', e.type === 'pr' || e.type === 'rank' ? 'pri' : 'acc')}<div><div style="font-weight:700;font-size:14px">${esc(e.text)}</div><div class="sub t-cap">${fmtDate(e.date)}</div></div></div>`)}</div>` : ''}`.trim();
  const fitHtml = html`<div class="card">
      <div class="cri">
        ${ring((cri.score ?? 0) / 100, { size: 104, stroke: 10, big: cri.score ?? '—', lbl: cri.score == null ? 'Not measured yet' : 'out of 100' })}
        <div>
          ${isRun(p) || isWalk(p) || isHiit(p) || isPil(p) || isYoga(p) || isTai(p) ? '' : isMob(p) ? meter('Range', mobTested(p.mob) ? mobScore(p.mob) : null, 'After the range test') : meter('Strength', cri.parts.strength, 'After a strength workout')}${hasGym(p) || isRun(p) ? meter('Endurance', cri.parts.endurance, 'After a 3 km test') : ''}${hasCali(p) ? meter('Skill', cri.parts.skill, 'Pick a skill on the Plan screen') : ''}
          ${meter('Consistency', cri.parts.consistency)}${meter('Body', cri.parts.body, 'After a second weigh-in')}
        </div>
      </div>
      <div class="rank-row"><span>${emi(rank.icon)} ${rank.name}</span><div class="bar"><i style="width:${rank.pct * 100}%"></i></div><span class="num">${rank.next ? `${s.xp} / ${rank.next.xp}` : s.xp} XP</span></div>
    </div>`;

  // מסך אחד, בלי גלילה: האימון הבא תופס את רוב המסך, ומתחתיו המאמן, המעקב היומי ומדד הכושר
  root.innerHTML = html`<div class="home">
    <div class="topbar">
      <div class="hello"><div class="sub">${greeting()}, ${esc(p.name)}</div>
        <button class="track-chip" data-act="track" aria-label="My track"><img src="${coach.face}" alt=""><span>${esc(trackLabel(p))}<small> · <span class="num">${total}</span> a week</small></span>${icon('chev')}</button></div>
      <div class="top-actions">
        ${st ? `<span class="tag orange" title="Day streak">${icon('flame')} <span class="num">${st}</span></span>` : ''}
        <button class="set-btn bell" data-act="notices" aria-label="Updates">${icon('bell')}${promptsHtml ? '<i class="dot"></i>' : ''}</button>
        <a href="#/coach" class="set-btn" aria-label="Settings">${icon('gear')}<span>Settings</span></a>
      </div>
    </div>

    ${ns ? html`<div class="hero"><img class="bg" src="${demoPoster(sessionCoach(p, ns), heroEx)}" alt="">
      <div class="hero-in"><div class="eyebrow">Next workout · ${esc(s.plan.week.phase.name)}</div>
        <div class="h1" style="font-size:24px">${esc(ns.name)}</div><div class="sub">${esc(ns.focus)}</div>
        <div class="stats"><div><b>${estMinutes(ns)}</b>min</div>${ns.runOnly ? `<div><b>${ns.run.segs.filter((x) => !['warm', 'cool'].includes(x.kind)).length}</b>segments</div>` : `<div><b>${ns.items.length}</b>exercises</div>`}
          ${ns.track === 'hiit' ? `<div><b>${ns.rounds}</b>rounds</div><div><b>${ns.work}/${ns.rest}</b>sec</div>` : ns.track === 'mob' || ns.track === 'pil' || ns.track === 'yoga' || ns.track === 'tai' || ns.runOnly ? '' : `<div><b>${ns.items.reduce((a, b) => a + b.sets, 0)}</b>sets</div>`}${ns.run && !ns.runOnly ? `<div><b>+</b>run</div>` : ''}</div>
        <button class="btn primary block xl" data-act="start">${icon('play', 'width="22" height="22"')} ${g('Start', 'Start')} ${ns.run?.walk ? 'walk' : ns.runOnly ? 'run' : 'workout'}</button>
        <div class="hero-sub">${ns?.run && !ns.runOnly ? `<button class="btn sm" data-act="run">${icon('run', 'width="18" height="18"')} Run only</button>` : ''}
      ${isRun(p) || isWalk(p) || isHiit(p) || isPil(p) || isYoga(p) || isTai(p) ? (hasMob(p) ? `<button class="btn sm" data-act="quick-mob" style="grid-column:1/-1">${icon('sparkle', 'width="18" height="18"')} Quick mobility</button>` : '')
    : isMob(p) ? `<button class="btn sm" data-act="quick-mob" style="grid-column:1/-1">${icon('sparkle', 'width="18" height="18"')} Free session by area</button>`
    : `<button class="btn sm" data-act="field" ${ns?.run || hasMob(p) ? '' : 'style="grid-column:1/-1"'}>${icon('pack', 'width="18" height="18"')} No-equipment workout</button>${hasMob(p) && !ns?.run ? `<button class="btn sm" data-act="quick-mob">${icon('sparkle', 'width="18" height="18"')} Quick mobility</button>` : ''}`}</div>
        <div class="week-cap"><span>This week</span><span><span class="num">${doneN}</span> of <span class="num">${total}</span> workouts</span></div>
        <div class="week">${s.plan.week.sessions.map((x) => `<i class="d ${doneDays.has(x.day) ? 'done' : ns?.day === x.day ? 'next' : ''}"></i>`)}</div>
      </div></div>`
    : html`<div class="hero done"><div class="hero-in"><div class="e">${ib('trophy', 'pri', 'xl')}</div><div class="h1" style="font-size:24px">Week complete!</div><div class="sub">Rest — next week loads automatically.</div>
        <div class="hero-sub">${ns?.run && !ns.runOnly ? `<button class="btn sm" data-act="run">${icon('run', 'width="18" height="18"')} Run only</button>` : ''}
      ${isRun(p) || isWalk(p) || isHiit(p) || isPil(p) || isYoga(p) || isTai(p) ? (hasMob(p) ? `<button class="btn sm" data-act="quick-mob" style="grid-column:1/-1">${icon('sparkle', 'width="18" height="18"')} Quick mobility</button>` : '')
    : isMob(p) ? `<button class="btn sm" data-act="quick-mob" style="grid-column:1/-1">${icon('sparkle', 'width="18" height="18"')} Free session by area</button>`
    : `<button class="btn sm" data-act="field" ${ns?.run || hasMob(p) ? '' : 'style="grid-column:1/-1"'}>${icon('pack', 'width="18" height="18"')} No-equipment workout</button>${hasMob(p) && !ns?.run ? `<button class="btn sm" data-act="quick-mob">${icon('sparkle', 'width="18" height="18"')} Quick mobility</button>` : ''}`}</div></div></div>`}

    <div class="free-row"><button class="btn sm" data-act="free-walk">${icon('leaf', 'width="18" height="18"')} Free walk</button><button class="btn sm" data-act="free-run">${icon('run', 'width="18" height="18"')} Free run</button></div>
    ${medCardHtml()}

    ${homeNextHtml()}

    <div class="card coach-hero">
      <div class="holo"><img src="${coach.face}" alt="${coach.name}"></div>
      <div class="bubble">${line.text}</div>
      <button class="speak" data-act="speak" data-key="${line.key}" aria-label="Play ${coach.name}"><span class="wave"><i></i><i></i><i></i><i></i></span></button>
    </div>

    ${wantsNutrition(p) ? nutCard() : ''}
    <div class="today">
      ${/* מעקב השתייה עבר למסך התזונה (החלטת בעל המוצר, 21.11.2026); כאן יבוא מונה צעדים כשתהיה אפליקציה מהחנות */''}
      ${tile('weight', ib('scale'), lastW ? lastW.kg : '—', 'kg', 'Weight', null)}
      ${tile('checkin', ib('pulse', 'ok'), dd.checkin != null ? Math.round(dd.checkin * 100) : '—', dd.checkin != null ? '%' : '', 'Readiness', dd.checkin != null ? Math.round(dd.checkin * 100) : null)}
      ${tile('fitness', ib('trophy', 'pri'), cri.score ?? '—', '', 'Fitness', cri.score ?? null)}
    </div>

    </div>
  `;

  const off = onSpeaking((v) => root.querySelector('.speak')?.classList.toggle('speaking', v));
  root._cleanup = off;

  const rerender = () => renderHome(root);
  const act = (a, el) => {
    unlock();
    if (a === 'notices') {
      return sheet(`<div class="h1" style="font-size:22px">Notifications</div>${promptsHtml}${eventsHtml}${promptsHtml || eventsHtml ? '' : '<p class="sub">No new updates.</p>'}<button class="btn block" style="margin-top:14px" data-close>Close</button>`, {
        onMount(sh, close) {
          bindReminderPrompt(sh, () => { close(); rerender(); });
          on(sh, 'click', '[data-act], [data-remgo]', (ev, b) => { close(); if (b.dataset.act) act(b.dataset.act, b); });
        },
      });
    }
    if (a === 'fitness') return sheet(`<div class="h1" style="font-size:22px">Your fitness</div><p class="sub">The score is built from what has been measured so far.</p>${fitHtml}<a class="btn primary block" style="margin-top:14px" href="#/progress" data-close>Full progress</a><button class="btn ghost block" style="margin-top:8px" data-close>Close</button>`);
    if (a === 'speak') say(el.dataset.key, { priority: true });
    if (a === 'start') begin(ns);
    if (a === 'run') startRun(ns.run, { day: ns.day });
    // אימון חופשי, בלי תוכנית: הליכה עם שירה; ריצה עם המאמן של המסלול (חדר כושר / ריצה / משולב) או עם מאמן הריצה
    if (a === 'med') medSheet();
    if (a === 'free-walk') startRun(freeRun(true), { coach: s.profile.coach === 'shira' ? null : 'shira' });
    if (a === 'free-run') startRun(freeRun(false), { coach: ['gym', 'mix', 'run'].includes(s.profile.track) ? null : s.profile.track === 'walk' ? 'shira' : extraCoach(s.profile, 'run') });
    if (a === 'field') checkIn((r) => startWorkout({ ...buildFieldWorkout(p), day: null, field: true }, { readiness: r }));
    if (a === 'food') location.hash = '#/nutrition';
    if (a === 'track') return trackSheet(rerender);
    if (a === 'nut') { openNutritionTab('menu'); location.hash = '#/nutrition'; }
    if (a === 'weight') weightSheet(() => renderHome(root));
    if (a === 'backup') backupNow().then((ok) => { if (ok) toast('Backup saved'); renderHome(root); });
    if (a === 'backup-later') { snoozeBackup(7); renderHome(root); }
    if (a === 'checkin') checkIn(() => renderHome(root), true);
    if (a === 'quick-mob') quickMobSheet((w) => startWorkout(w));
    if (a === 'mob-test') mobTestSheet(() => renderHome(root));
  };
  bindCalendar(root, () => renderHome(root));
  on(root, 'click', '[data-act]', (e, el) => act(el.dataset.act, el));
}

// רכיב שעוד לא נמדד מוצג בלי מספר, עם הסבר מתי יופיע
const meter = (label, v, pending = '') => `<div class="meter"><div class="row"><span>${label}</span><span>${v ?? `<small>${pending}</small>`}</span></div><div class="bar"><i style="width:${v ?? 0}%"></i></div></div>`;

// התחלת אימון: לפני אימון כוח — צ׳ק־אין מוכנות; אימון מוביליטי מתחיל ישר (שם בוחרים רק כמה זמן יש)
export const begin = (w) => (w.runOnly ? startRun(w.run, { day: w.day, ...(w.extra ? { coach: w.coach, extra: true } : {}) }) : w.track === 'mob' || w.track === 'pil' || w.track === 'yoga' || w.track === 'tai' ? startWorkout(w) : checkIn((r) => startWorkout(w, { readiness: r }), false, w.extra ? w.coach : null));

// צ׳ק־אין מוכנות לפני אימון → אוטו־רגולציה
// coach: המאמן של האימון שעומד להתחיל, כשהוא לא המאמן של המסלול הראשי (תחום נוסף) — הוא זה שמגיב לצ'ק־אין
export function checkIn(cb, onlyLog = false, coach = null) {
  const existing = daily().checkin;
  if (existing != null && !onlyLog) return cb(existing);
  const q = { sleep: 3, energy: 3, soreness: 3, stress: 3 };
  const Q = [['sleep', 'How did you sleep?', [1, 2, 3, 4, 5]], ['energy', 'Energy level', [1, 2, 3, 4, 5]],
    ['soreness', 'Muscle soreness', [5, 4, 3, 2, 1]], ['stress', 'Stress and load', [5, 4, 3, 2, 1]]];
  sheet(html`<div class="eyebrow">Pre-workout check-in</div><div class="h1" style="font-size:24px">${g('How do you feel', 'How do you feel')} today?</div>
    <p class="sub">Your coach adjusts the load to how you feel — lighter after a hard day, harder on a good one.</p>
    ${Q.map(([k, t, em]) => html`<div style="margin:14px 0 6px;font-weight:700">${t}</div>
      <div class="rpe" style="grid-template-columns:repeat(5,1fr)" data-q="${k}">${em.map((x, i) => `<button data-v="${i + 1}" class="${q[k] === i + 1 ? 'on' : ''}" aria-label="${i + 1} of 5"><span>${icon(`face${x}`)}</span></button>`)}</div>`)}
    <button class="btn primary block xl" style="margin-top:20px" data-go>${onlyLog ? 'Save' : 'Let\'s train'}</button>`, {
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
        if (coach) useCoach(coach);
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
  sheet(html`<div class="eyebrow">Weigh-in</div><div class="h1" style="font-size:24px">${g('What do you weigh', 'What do you weigh')} today?</div>
    <p class="sub">Most accurate: in the morning, after the bathroom, before eating. The trend matters more than any single reading.</p>
    <div class="stepper" style="margin:18px 0"><button data-d="-0.1">−</button><div class="val"><span id="wv">${v.toFixed(1)}</span><small>kg</small></div><button data-d="0.1">+</button></div>
    <div class="row"><button class="btn sm" data-d="-1">−1</button><button class="btn sm" data-d="-0.5">−0.5</button><span class="spacer"></span><button class="btn sm" data-d="0.5">+0.5</button><button class="btn sm" data-d="1">+1</button></div>
    <button class="btn primary block xl" style="margin-top:18px" data-save>Save</button>`, {
    onMount(sh, close) {
      on(sh, 'click', '[data-d]', (e, b) => { v = Math.round((v + Number(b.dataset.d)) * 10) / 10; sh.querySelector('#wv').textContent = v.toFixed(1); });
      sh.querySelector('[data-save]').addEventListener('click', () => {
        set((st) => {
          st.weights = st.weights.filter((w) => w.date !== today()).concat({ date: today(), kg: v });
          st.profile.weightKg = v;
          return st;
        });
        addXP(XP.weight);
        toast('Weight saved');
        close(); cb?.();
      });
    },
  });
}
