// "המסלול שלי" — חלונית מהבית (קיים רק ב-MOVA). חושבים כמו סטודיו: מתאמן יכול להחליף מסלול,
// או להוסיף לשבוע שיעורים מתחום אחר ולהמשיך גם במסלול שלו.
//  • מסלול ראשי (profile.track) — אחד. החלפה היא אותה פעולה שבהגדרות (switchTrack): נבנית תוכנית חדשה, וכל השאר נשמר.
//  • שיעורים נוספים (profile.extras: יוגה / פילאטיס / HIIT) ומוביליטי (profile.mobN) — על חשבון ימי האימון, או כתוספת להם.
// אחרי כל שינוי מוצג סיכום: לוח האימונים החדש, ומה השתנה ביעדי התזונה.
import { html, esc, on, sheet, toast } from '../ui/dom.js';
import { get, set, regenerateWeek } from '../store.js';
import { COACHES, coachesFor } from '../data/coaches.js';
import { TRACKS } from './onboarding.js';
import { switchTrack } from './cali-ui.js';
import { mobCount, newMob } from '../engine/mob.js';
import { newCali } from '../engine/cali.js';
import { EXTRA_TRACKS, extrasOf } from '../engine/program.js';
import { targets, wantsNutrition } from '../engine/nutrition.js';

const ORDER = ['gym', 'cali', 'run', 'walk', 'med', 'hiit', 'pil', 'yoga', 'tai', 'mob', 'mix'];
const faces = (id) => (id === 'mix' ? ['ori', 'noa', 'maya'].map((c) => COACHES[c]) : coachesFor(id)).map((c) => `<img src="${c.face}" alt="">`).join('');
const nameOf = (id) => (TRACKS[id] || TRACKS.gym).name;
const isClass = (id) => ['yoga', 'pil', 'hiit', 'tai'].includes(id);
// אילו תחומים אפשר להוסיף לצד המסלול הראשי: הכול חוץ ממנו עצמו; ובמסלול המשולב חדר הכושר והקליסתניקס כבר בפנים
const canAdd = (cur, t) => EXTRA_TRACKS.includes(t) && t !== cur && !(cur === 'mix' && (t === 'gym' || t === 'cali'));

export const trackLabel = (p) => [nameOf(p.track), ...extrasOf(p).map((x) => nameOf(x.track)), ...(p.track !== 'mob' && mobCount(p) ? ['Mobility'] : [])].join(' + ');

const snapshot = () => { const s = get(), t = targets(s.profile); return { kcal: t.kcal, protein: t.protein, label: trackLabel(s.profile) }; };

// סיכום אחרי שינוי: מה יש עכשיו בשבוע, ומה קרה ליעדי התזונה
function summarySheet(before) {
  const s = get(), p = s.profile, t = targets(p), nf = (n) => n.toLocaleString('en-US');
  const count = {}; for (const w of s.plan.week.sessions) { const k = w.track === 'mob' ? 'mob' : w.extra ? w.xtrack || w.track : p.track; count[k] = (count[k] || 0) + 1; }
  const parts = Object.entries(count).map(([k, n]) => `<b class="num">${n}</b> ${esc(nameOf(k))}`).join(' · ');
  const same = before.kcal === t.kcal && before.protein === t.protein;
  sheet(html`<div class="h1" style="font-size:22px">Program updated</div>
    <div class="h2" style="margin-top:10px">Weekly workout schedule</div>
    <div class="card tight"><div style="margin-bottom:8px">${parts} — <span class="num">${s.plan.week.sessions.length}</span> workouts</div>
      ${s.plan.week.sessions.map((w) => `<div class="ts-day"><span class="num">${w.day}</span><b>${esc(w.name)}</b><small>${esc(COACHES[w.track === 'mob' ? 'tamar' : w.extra ? w.coach : p.track === 'mix' ? (w.track === 'cali' ? 'maya' : p.gymCoach || 'ori') : p.coach]?.name || '')}</small></div>`).join('')}</div>
    ${wantsNutrition(p) ? html`<div class="h2">Nutrition</div>
      <div class="card tight">${same ? `Your nutrition targets stayed the same: <b class="num">${nf(t.kcal)}</b> kcal and<b class="num">${t.protein}</b> g protein a day.`
    : `Calorie target: <span class="num">${nf(before.kcal)}</span> ← <b class="num">${nf(t.kcal)}</b> kcal a day<br>Protein target: <span class="num">${before.protein}</span> ← <b class="num">${t.protein}</b> g a day`}
        <div class="sub t-foot" style="margin-top:6px">The menu was rebuilt around the targets, and your nutrition preferences were kept. Each day's target is matched to that day's workout: more carbs on an intense day, fewer on an easy or rest day.</div></div>` : ''}
    <button class="btn primary block" style="margin-top:14px" data-close>Great</button>`);
}

// כמה שיעורים מהתחום באמת נכנסים לשבוע, וכמה ימי אימון הם מוסיפים (25.11.2026). days — ימי האימון עכשיו; took — כמה מהם התחום הזה כבר הוסיף;
// others — שאר התוספות שבשבוע (תחומים אחרים ומוביליטי); n — כמה שיעורים ביקשו. השבוע מוגבל ל-6 אימונים, ואימון אחד לפחות נשאר למסלול הראשי.
// מחזיר את מספר השיעורים שנכנס, את ימי האימון החדשים, ואת מה שהתחום הוסיף להם — כדי שהסרה תחזיר בדיוק את זה.
export function fitExtra(days, took, others, n) {
  const base = Math.max(1, days - took);
  let fit = Math.max(0, Math.floor(n));
  while (fit > 0 && fit > Math.min(6, Math.max(2, base + fit)) - 1 - others) fit--;
  const d = Math.min(6, Math.max(2, base + fit));
  return { n: fit, days: d, took: Math.max(0, d - base) };
}

// מוסיפים שיעורים: מעדכנים את מספר השיעורים מהסוג הזה, ואת סך האימונים בשבוע (עד 6). מחזיר כמה שיעורים נכנסו בפועל.
// 25.11.2026: קודם התוספת נחתכה ב-6 אבל ההסרה הורידה את כל n — 4 אימונים, טאי צ'י 3 ואז "בלי" השאירו 3. עכשיו profile.extraDays זוכר
// כמה ימים כל תחום הוסיף, וההסרה מחזירה בדיוק אותם; ומה שנשמר (ומסומן) הוא מה שנכנס לשבוע, לא מה שביקשו.
function setExtra(track, n) {
  let got = 0;
  set((s) => {
    const q = s.profile, was = q.extras?.[track] || 0;
    // קליסתניקס כתחום נוסף בלי מבדק רמה: מתחילים משלבי הבסיס ובלי ציוד; הסולמות מתקדמים לבד מאימון לאימון
    if (track === 'cali' && n && !q.cali) { const hM = (q.heightCm || 175) / 100; q.cali = newCali({ pushups: 15, squats: 20, pullups: 0, dips: 0, plankSec: 45, bmi: (q.weightKg || 70) / (hM * hM) }, []); }
    const others = Object.entries(q.extras || {}).reduce((a, [t, m]) => a + (t !== track && canAdd(q.track, t) ? m || 0 : 0), 0) + (q.track !== 'mob' ? mobCount(q) : 0);
    // פרופיל שנשמר לפני התיקון לא זוכר כמה ימים התחום הוסיף: מניחים שאת כולם, כמו קודם
    const f = fitExtra(q.days || 3, was ? q.extraDays?.[track] ?? was : 0, others, n);
    got = f.n;
    q.extras = { ...(q.extras || {}), [track]: f.n };
    q.extraDays = { ...(q.extraDays || {}), [track]: f.took };
    if (!f.n) { delete q.extras[track]; delete q.extraDays[track]; }
    q.days = f.days;
    s.plan.completedDays = [];
    return regenerateWeek(s);
  });
  return got;
}
// מוביליטי לצד המסלול (25.11.2026): כמו בתחומים הנוספים, profile.extraDays.mob זוכר כמה ימי אימון המוביליטי הוסיף, וההסרה מחזירה בדיוק אותם.
// קודם "להוסיף ולהמשיך" הוסיף יום אימון ו"בלי" לא החזיר אותו (4 ← 5 ← נשאר 5); לחיצה שנייה על "להוסיף" הוסיפה עוד יום בלי אימון מוביליטי;
// ובשבוע מלא נשמר mobN בלי שאימון נכנס לשבוע. add — "להוסיף ולהמשיך": יום אימון נוסף (fitExtra; בשבוע מלא לא נכנס כלום).
// בלי add — הבחירה שבחלונית: על חשבון ימי האימון הקיימים, כמו קודם. הורדה מחזירה ימים רק כשנשארו פחות אימוני מוביליטי מהימים שנוספו.
// פרופיל שהוסיף מוביליטי לפני התיקון לא זוכר יום שנוסף, ולכן אצלו ההסרה לא מורידה יום (כמו קודם). מחזיר כמה אימונים נכנסו לשבוע.
export function fitMob(q, n, add = false) {
  const was = mobCount(q), took = was ? q.extraDays?.mob || 0 : 0;
  const others = Object.entries(q.extras || {}).reduce((a, [t, m]) => a + (canAdd(q.track, t) ? m || 0 : 0), 0);
  let days = q.days || 3, keep = Math.min(took, n);
  if (add && was) return was;                                                                  // כבר בשבוע: לא מוסיפים יום נוסף
  if (add) { const f = fitExtra(days, 0, others + (q.track === 'mix' ? 1 : 0), n); n = f.n; days = f.days; keep = f.took; }   // במשולב נשארים שני אימונים למסלול הראשי
  else days = Math.max(2, days - (took - keep));
  if (n && !q.mob) q.mob = newMob();
  q.mobN = n; q.days = days;
  q.extraDays = { ...(q.extraDays || {}), mob: keep };
  if (!keep) delete q.extraDays.mob;
  return mobCount(q);
}
function setMob(n, add) {
  let got = 0;
  set((s) => { got = fitMob(s.profile, n, add); s.plan.completedDays = []; return regenerateWeek(s); });
  return got;
}
// ההודעה אחרי שינוי: מה נכנס לשבוע, ואם נכנס פחות ממה שביקשו — למה
const extraToast = (t, got, want) => (!want ? `${nameOf(t)} removed from the week` : !got ? `No room for ${nameOf(t)} — the week is full`
  : `${nameOf(t)}: ${got === 1 ? '1 workout' : `${got} workouts`} a week${got < want ? ' — no room for more' : ''}`);

// בחירה במסלול אחר: שואלים אם התחום הקודם נשאר בתוקף
function askSheet(target, rerender) {
  const p = get().profile, cur = p.track, curN = Math.max(1, Math.min(3, (p.days || 3) - extrasOf(p).reduce((a, x) => a + x.n, 0) - mobCount(p)));
  // שני התחומים יכולים לחיות באותו שבוע, חוץ מהמסלול המשולב מול חדר כושר / קליסתניקס (שכבר כלולים בו)
  const swap = isClass(cur) && !isClass(target) && target !== 'mix' && canAdd(target, cur);   // שיעור + תוכנית: התוכנית נעשית המסלול הראשי
  const canKeep = swap || canAdd(cur, target);
  const mixHint = (cur === 'gym' && target === 'cali') || (cur === 'cali' && target === 'gym');
  let n = 1;
  const body = () => html`<div class="h1" style="font-size:22px">${esc(nameOf(target))} — what about ${esc(nameOf(cur))}?</div>
    ${canKeep ? html`<p class="sub" style="margin:4px 0 12px">You can keep both in the same week, or switch to only${esc(nameOf(target))}.</p>
      <div class="card tight"><b>Also keep ${esc(nameOf(cur))}</b>
        <div class="sub t-foot" style="margin:4px 0 8px">${swap ? `${esc(nameOf(target))} will be the main track. How many classes of ${esc(nameOf(cur))} to keep each week?` : `How many workouts of ${esc(nameOf(target))} to add to the week?`}</div>
        <div class="seg" data-ask-n>${[1, 2, 3].map((i) => `<button data-v="${i}" class="${n === i ? 'on' : ''}">${i}</button>`).join('')}</div>
        <button class="btn primary block" style="margin-top:10px" data-ask="both">Add and keep both</button></div>`
    : html`<p class="sub" style="margin:4px 0 12px">The combined track already includes both gym and calisthenics in the same week, so here you choose one of them.</p>`}
    ${canKeep && mixHint ? '<button class="btn block" style="margin-top:10px" data-ask="mix">Switch to the combined track (balanced split between the two)</button>' : ''}
    <button class="btn block" style="margin-top:10px" data-ask="only">Only ${esc(nameOf(target))} from now on</button>
    <button class="btn ghost block" style="margin-top:8px" data-close>Cancel</button>`;
  sheet(`<div data-ask-body>${body()}</div>`, {
    onMount(sh, close) {
      on(sh, 'click', '[data-ask-n] button', (e, b) => { n = Number(b.dataset.v); sh.querySelector('[data-ask-body]').innerHTML = body(); });
      on(sh, 'click', '[data-ask]', (e, b) => {
        const before = snapshot(), how = b.dataset.ask;
        close();
        if (how === 'both' && !swap) { const got = setExtra(target, n); toast(got === n ? `${nameOf(target)} added to the week` : extraToast(target, got, n), got === n ? undefined : 3200); rerender(); setTimeout(() => summarySheet(before), 350); return; }
        // המעבר עצמו לא תמיד מיידי (25.11.2026): מדיטציה בתנועה פותחת קודם את "המסע שלי", וקליסתניקס / משולב — מבדק רמה.
        // לכן ההמשך (תחומים נוספים, ציור מחדש, "התוכנית עודכנה") רץ רק כשהמעבר הושלם. קודם הוא רץ מיד: הפרופיל השתנה לפני האישור,
        // ביטול השאיר אותו שונה, והסיכום הוצג עם התוכנית הישנה.
        let switched = false;
        const whenSwitched = (fn) => () => { if (switched) return; switched = true; fn(); rerender(); setTimeout(() => summarySheet(before), 350); };
        if (how === 'both') {
          // התחום החדש הוא תוכנית (חדר כושר, ריצה…): הוא נעשה המסלול הראשי, והשיעורים הקודמים נשארים כתוספת
          switchTrack(target, whenSwitched(() => {
            set((s) => { const q = s.profile; q.extras = { ...(q.extras || {}) }; delete q.extras[target]; return s; });
            setExtra(cur, Math.min(n, 3));
          }));
        } else {
          // מסלול שהפך לראשי לא נשאר גם כשיעור נוסף
          switchTrack(how === 'mix' ? 'mix' : target, whenSwitched(() => {
            set((s) => { const q = s.profile; if (q.extras) { delete q.extras[q.track]; } s.plan.completedDays = []; return regenerateWeek(s); });
          }));
        }
      });
    },
  });
}

export function trackSheet(rerender) {
  const body = () => {
    const p = get().profile, cur = TRACKS[p.track] ? p.track : 'gym', n = mobCount(p), ex = Object.fromEntries(extrasOf(p).map((x) => [x.track, x.n]));
    const exN = Object.values(ex).reduce((a, b) => a + b, 0);
    const maxMob = Math.min(3, (p.days || 3) - exN - (cur === 'mix' ? 2 : 1));
    return html`<div class="h1" style="font-size:22px">My track</div>
      <p class="sub" style="margin:4px 0 12px">Now: <b>${esc(trackLabel(p))}</b>, ${p.days} workouts a week. Choosing another track will ask whether to replace or add. What you've already done, your weight, progress and nutrition preferences are always kept.</p>
      <div class="ts-list">${ORDER.map((id) => html`<button class="ts-row ${id === cur ? 'on' : ''}" data-ts="${id}">
        <span class="ts-faces">${faces(id)}</span><span class="ts-txt"><b>${TRACKS[id].name}</b><small>${esc(TRACKS[id].sub)}</small></span>
        ${id === cur ? '<span class="tag lime">Main</span>' : ex[id] ? `<span class="tag teal">+${ex[id]} a week</span>` : id === 'mob' && n ? `<span class="tag teal">+${n} a week</span>` : ''}</button>`)}</div>
      <div class="h2" style="margin-top:14px">More areas this week</div>
      <div class="card tight">${EXTRA_TRACKS.filter((t) => canAdd(cur, t)).map((t) => html`<div class="ts-extra"><b>${TRACKS[t].name}</b>
          <div class="seg" data-ts-extra="${t}">${[0, 1, 2, 3].map((i) => `<button data-v="${i}" class="${(ex[t] || 0) === i ? 'on' : ''}">${i === 0 ? 'None' : i}</button>`).join('')}</div></div>`)}
        ${cur !== 'mob' && maxMob >= 1 ? html`<div class="ts-extra"><b>Mobility</b>
          <div class="seg" data-ts-mob>${Array.from({ length: maxMob + 1 }, (_, i) => `<button data-v="${i}" class="${n === i ? 'on' : ''}">${i === 0 ? 'None' : i}</button>`).join('')}</div></div>` : ''}
        <div class="sub t-foot" style="margin-top:8px">Every workout you add is added to the week's training days (up to 6). The workout schedule and nutrition targets update right away.</div></div>
      <button class="btn block" style="margin-top:14px" data-close>Close</button>`;
  };
  sheet(`<div data-ts-body>${body()}</div>`, {
    onMount(sh, close) {
      const repaint = () => { const b = sh.querySelector('[data-ts-body]'); if (b) b.innerHTML = body(); };
      on(sh, 'click', '[data-ts]', (e, b) => {
        const id = b.dataset.ts, p = get().profile;
        if (id === p.track) return;
        close();
        if (id === 'mob' && p.track !== 'mob') return setTimeout(() => askMob(rerender), 250);
        setTimeout(() => askSheet(id, rerender), 250);
      });
      on(sh, 'click', '[data-ts-extra] button', (e, b) => {
        const t = b.parentElement.dataset.tsExtra, v = Number(b.dataset.v), before = snapshot();
        const got = setExtra(t, v);
        toast(extraToast(t, got, v), got < v ? 3200 : undefined);
        repaint(); rerender();
        if (got >= v && wantsNutrition(get().profile) && snapshot().kcal !== before.kcal) toast(`Calorie target updated: ${snapshot().kcal.toLocaleString('en-US')} kcal`, 2600);
      });
      on(sh, 'click', '[data-ts-mob] button', (e, b) => {
        const v = Number(b.dataset.v);
        setMob(v);
        toast(v ? `${v === 1 ? '1 mobility workout' : `${v} mobility workouts`} a week` : 'Mobility workouts removed from the week');
        repaint(); rerender();
      });
    },
  });
}

// מוביליטי: להוסיף לצד המסלול הנוכחי (דרך profile.mobN), או לעבור למסלול מוביליטי בלבד
function askMob(rerender) {
  const p = get().profile, cur = p.track;
  sheet(html`<div class="h1" style="font-size:22px">Mobility — what about ${esc(nameOf(cur))}?</div>
    <p class="sub" style="margin:4px 0 12px">You can add one mobility workout a week alongside ${esc(nameOf(cur))}, or switch to a mobility-only track.</p>
    <button class="btn primary block" data-am="both">Add and also keep ${esc(nameOf(cur))}</button>
    <button class="btn block" style="margin-top:10px" data-am="only">Only mobility from now on</button>
    <button class="btn ghost block" style="margin-top:8px" data-close>Cancel</button>`, {
    onMount(sh, close) {
      on(sh, 'click', '[data-am]', (e, b) => {
        const before = snapshot(); close();
        if (b.dataset.am === 'both') { if (!setMob(Math.max(1, get().profile.mobN || 0), true)) { rerender(); return toast(extraToast('mob', 0, 1), 3200); } }   // שבוע מלא: אומרים, ולא מציגים סיכום של שינוי שלא קרה
        else switchTrack('mob', () => {});
        rerender(); setTimeout(() => summarySheet(before), 350);
      });
    },
  });
}
