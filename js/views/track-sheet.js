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

const ORDER = ['gym', 'cali', 'run', 'hiit', 'pil', 'yoga', 'tai', 'mob', 'mix'];
const faces = (id) => (id === 'mix' ? ['ori', 'noa', 'maya'].map((c) => COACHES[c]) : coachesFor(id)).map((c) => `<img src="${c.face}" alt="">`).join('');
const nameOf = (id) => (TRACKS[id] || TRACKS.gym).name;
const isClass = (id) => ['yoga', 'pil', 'hiit', 'tai'].includes(id);
// אילו תחומים אפשר להוסיף לצד המסלול הראשי: הכול חוץ ממנו עצמו; ובמסלול המשולב חדר הכושר והקליסתניקס כבר בפנים
const canAdd = (cur, t) => EXTRA_TRACKS.includes(t) && t !== cur && !(cur === 'mix' && (t === 'gym' || t === 'cali'));

export const trackLabel = (p) => [nameOf(p.track), ...extrasOf(p).map((x) => nameOf(x.track)), ...(p.track !== 'mob' && mobCount(p) ? ['מוביליטי'] : [])].join(' + ');

const snapshot = () => { const s = get(), t = targets(s.profile); return { kcal: t.kcal, protein: t.protein, label: trackLabel(s.profile) }; };

// סיכום אחרי שינוי: מה יש עכשיו בשבוע, ומה קרה ליעדי התזונה
function summarySheet(before) {
  const s = get(), p = s.profile, t = targets(p), nf = (n) => n.toLocaleString('he-IL');
  const count = {}; for (const w of s.plan.week.sessions) { const k = w.track === 'mob' ? 'mob' : w.extra ? w.xtrack || w.track : p.track; count[k] = (count[k] || 0) + 1; }
  const parts = Object.entries(count).map(([k, n]) => `<b class="num">${n}</b> ${esc(nameOf(k))}`).join(' · ');
  const same = before.kcal === t.kcal && before.protein === t.protein;
  sheet(html`<div class="h1" style="font-size:22px">התוכנית עודכנה</div>
    <div class="h2" style="margin-top:10px">לוח האימונים בשבוע</div>
    <div class="card tight"><div style="margin-bottom:8px">${parts} — <span class="num">${s.plan.week.sessions.length}</span> אימונים</div>
      ${s.plan.week.sessions.map((w) => `<div class="ts-day"><span class="num">${w.day}</span><b>${esc(w.name)}</b><small>${esc(COACHES[w.track === 'mob' ? 'tamar' : w.extra ? w.coach : p.track === 'mix' ? (w.track === 'cali' ? 'maya' : p.gymCoach || 'ori') : p.coach]?.name || '')}</small></div>`).join('')}</div>
    ${wantsNutrition(p) ? html`<div class="h2">התזונה</div>
      <div class="card tight">${same ? `יעדי התזונה נשארו כמו שהיו: <b class="num">${nf(t.kcal)}</b> קק״ל ו-<b class="num">${t.protein}</b> ג׳ חלבון ביום.`
    : `יעד הקלוריות: <span class="num">${nf(before.kcal)}</span> ← <b class="num">${nf(t.kcal)}</b> קק״ל ביום<br>יעד החלבון: <span class="num">${before.protein}</span> ← <b class="num">${t.protein}</b> ג׳ ביום`}
        <div class="sub t-foot" style="margin-top:6px">התפריט נבנה מחדש לפי היעדים, והעדפות התזונה שלך נשארו. בכל יום היעד מותאם לאימון של אותו יום: יותר פחמימה ביום עצים, פחות ביום קל או במנוחה.</div></div>` : ''}
    <button class="btn primary block" style="margin-top:14px" data-close>מעולה</button>`);
}

// מוסיפים שיעורים: מעדכנים את מספר השיעורים מהסוג הזה, ואת סך האימונים בשבוע (עד 6)
function setExtra(track, n) {
  set((s) => {
    const q = s.profile, was = q.extras?.[track] || 0;
    // קליסתניקס כתחום נוסף בלי מבדק רמה: מתחילים משלבי הבסיס ובלי ציוד; הסולמות מתקדמים לבד מאימון לאימון
    if (track === 'cali' && n && !q.cali) { const hM = (q.heightCm || 175) / 100; q.cali = newCali({ pushups: 15, squats: 20, pullups: 0, dips: 0, plankSec: 45, bmi: (q.weightKg || 70) / (hM * hM) }, []); }
    q.extras = { ...(q.extras || {}), [track]: n };
    if (!n) delete q.extras[track];
    q.days = Math.min(6, Math.max(2, (q.days || 3) + (n - was)));
    s.plan.completedDays = [];
    return regenerateWeek(s);
  });
}

// בחירה במסלול אחר: שואלים אם התחום הקודם נשאר בתוקף
function askSheet(target, rerender) {
  const p = get().profile, cur = p.track, curN = Math.max(1, Math.min(3, (p.days || 3) - extrasOf(p).reduce((a, x) => a + x.n, 0) - mobCount(p)));
  // שני התחומים יכולים לחיות באותו שבוע, חוץ מהמסלול המשולב מול חדר כושר / קליסתניקס (שכבר כלולים בו)
  const swap = isClass(cur) && !isClass(target) && target !== 'mix' && canAdd(target, cur);   // שיעור + תוכנית: התוכנית נעשית המסלול הראשי
  const canKeep = swap || canAdd(cur, target);
  const mixHint = (cur === 'gym' && target === 'cali') || (cur === 'cali' && target === 'gym');
  let n = 1;
  const body = () => html`<div class="h1" style="font-size:22px">${esc(nameOf(target))} — ומה עם ${esc(nameOf(cur))}?</div>
    ${canKeep ? html`<p class="sub" style="margin:4px 0 12px">אפשר להמשיך בשני התחומים באותו שבוע, או לעבור רק ל${esc(nameOf(target))}.</p>
      <div class="card tight"><b>ממשיכים גם ${esc(nameOf(cur))}</b>
        <div class="sub t-foot" style="margin:4px 0 8px">${swap ? `${esc(nameOf(target))} יהיה המסלול הראשי. כמה שיעורי ${esc(nameOf(cur))} להשאיר בשבוע?` : `כמה אימוני ${esc(nameOf(target))} להוסיף לשבוע?`}</div>
        <div class="seg" data-ask-n>${[1, 2, 3].map((i) => `<button data-v="${i}" class="${n === i ? 'on' : ''}">${i}</button>`).join('')}</div>
        <button class="btn primary block" style="margin-top:10px" data-ask="both">להוסיף ולהמשיך בשניהם</button></div>`
    : html`<p class="sub" style="margin:4px 0 12px">המסלול המשולב כבר כולל גם חדר כושר וגם קליסתניקס באותו שבוע, ולכן כאן בוחרים אחד מהם.</p>`}
    ${canKeep && mixHint ? '<button class="btn block" style="margin-top:10px" data-ask="mix">לעבור למסלול המשולב (חלוקה מאוזנת בין השניים)</button>' : ''}
    <button class="btn block" style="margin-top:10px" data-ask="only">רק ${esc(nameOf(target))} מעכשיו</button>
    <button class="btn ghost block" style="margin-top:8px" data-close>ביטול</button>`;
  sheet(`<div data-ask-body>${body()}</div>`, {
    onMount(sh, close) {
      on(sh, 'click', '[data-ask-n] button', (e, b) => { n = Number(b.dataset.v); sh.querySelector('[data-ask-body]').innerHTML = body(); });
      on(sh, 'click', '[data-ask]', (e, b) => {
        const before = snapshot(), how = b.dataset.ask;
        close();
        if (how === 'both' && !swap) { setExtra(target, n); toast(`${nameOf(target)} נוסף לשבוע`); rerender(); }
        else if (how === 'both') {
          // התחום החדש הוא תוכנית (חדר כושר, ריצה…): הוא נעשה המסלול הראשי, והשיעורים הקודמים נשארים כתוספת
          switchTrack(target, () => {});
          set((s) => { const q = s.profile; q.extras = { ...(q.extras || {}) }; delete q.extras[target]; return s; });
          setExtra(cur, Math.min(n, 3)); rerender();
        } else {
          switchTrack(how === 'mix' ? 'mix' : target, () => {});
          // מסלול שהפך לראשי לא נשאר גם כשיעור נוסף
          set((s) => { const q = s.profile; if (q.extras) { delete q.extras[q.track]; } s.plan.completedDays = []; return regenerateWeek(s); });
          rerender();
        }
        setTimeout(() => summarySheet(before), 350);
      });
    },
  });
}

export function trackSheet(rerender) {
  const body = () => {
    const p = get().profile, cur = TRACKS[p.track] ? p.track : 'gym', n = mobCount(p), ex = Object.fromEntries(extrasOf(p).map((x) => [x.track, x.n]));
    const exN = Object.values(ex).reduce((a, b) => a + b, 0);
    const maxMob = Math.min(3, (p.days || 3) - exN - (cur === 'mix' ? 2 : 1));
    return html`<div class="h1" style="font-size:22px">המסלול שלי</div>
      <p class="sub" style="margin:4px 0 12px">עכשיו: <b>${esc(trackLabel(p))}</b>, ${p.days} אימונים בשבוע. בחירה במסלול אחר תשאל אם להחליף או להוסיף. מה שכבר נעשה, המשקל, ההתקדמות והעדפות התזונה נשמרים תמיד.</p>
      <div class="ts-list">${ORDER.map((id) => html`<button class="ts-row ${id === cur ? 'on' : ''}" data-ts="${id}">
        <span class="ts-faces">${faces(id)}</span><span class="ts-txt"><b>${TRACKS[id].name}</b><small>${esc(TRACKS[id].sub)}</small></span>
        ${id === cur ? '<span class="tag lime">ראשי</span>' : ex[id] ? `<span class="tag teal">+${ex[id]} בשבוע</span>` : id === 'mob' && n ? `<span class="tag teal">+${n} בשבוע</span>` : ''}</button>`)}</div>
      <div class="h2" style="margin-top:14px">תחומים נוספים בשבוע</div>
      <div class="card tight">${EXTRA_TRACKS.filter((t) => canAdd(cur, t)).map((t) => html`<div class="ts-extra"><b>${TRACKS[t].name}</b>
          <div class="seg" data-ts-extra="${t}">${[0, 1, 2, 3].map((i) => `<button data-v="${i}" class="${(ex[t] || 0) === i ? 'on' : ''}">${i === 0 ? 'בלי' : i}</button>`).join('')}</div></div>`)}
        ${cur !== 'mob' && maxMob >= 1 ? html`<div class="ts-extra"><b>מוביליטי</b>
          <div class="seg" data-ts-mob>${Array.from({ length: maxMob + 1 }, (_, i) => `<button data-v="${i}" class="${n === i ? 'on' : ''}">${i === 0 ? 'בלי' : i}</button>`).join('')}</div></div>` : ''}
        <div class="sub t-foot" style="margin-top:8px">כל אימון שמוסיפים מתווסף לימי האימון בשבוע (עד 6). לוח האימונים ויעדי התזונה מתעדכנים מיד.</div></div>
      <button class="btn block" style="margin-top:14px" data-close>סגור</button>`;
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
        setExtra(t, v);
        toast(v ? `${nameOf(t)}: ${v === 1 ? 'אימון אחד' : `${v} אימונים`} בשבוע` : `${nameOf(t)} הוסר מהשבוע`);
        repaint(); rerender();
        if (wantsNutrition(get().profile) && snapshot().kcal !== before.kcal) toast(`יעד הקלוריות עודכן: ${snapshot().kcal.toLocaleString('he-IL')} קק״ל`, 2600);
      });
      on(sh, 'click', '[data-ts-mob] button', (e, b) => {
        const v = Number(b.dataset.v);
        set((s) => { const q = s.profile; if (v && !q.mob) q.mob = newMob(); q.mobN = v; s.plan.completedDays = []; return regenerateWeek(s); });
        toast(v ? `${v === 1 ? 'אימון מוביליטי אחד' : `${v} אימוני מוביליטי`} בשבוע` : 'אימוני המוביליטי הוסרו מהשבוע');
        repaint(); rerender();
      });
    },
  });
}

// מוביליטי: להוסיף לצד המסלול הנוכחי (דרך profile.mobN), או לעבור למסלול מוביליטי בלבד
function askMob(rerender) {
  const p = get().profile, cur = p.track;
  sheet(html`<div class="h1" style="font-size:22px">מוביליטי — ומה עם ${esc(nameOf(cur))}?</div>
    <p class="sub" style="margin:4px 0 12px">אפשר להוסיף אימון מוביליטי אחד בשבוע לצד ${esc(nameOf(cur))}, או לעבור למסלול מוביליטי בלבד.</p>
    <button class="btn primary block" data-am="both">להוסיף ולהמשיך גם ${esc(nameOf(cur))}</button>
    <button class="btn block" style="margin-top:10px" data-am="only">רק מוביליטי מעכשיו</button>
    <button class="btn ghost block" style="margin-top:8px" data-close>ביטול</button>`, {
    onMount(sh, close) {
      on(sh, 'click', '[data-am]', (e, b) => {
        const before = snapshot(); close();
        if (b.dataset.am === 'both') set((s) => { const q = s.profile; if (!q.mob) q.mob = newMob(); q.mobN = Math.max(1, q.mobN || 0); q.days = Math.min(6, (q.days || 3) + 1); s.plan.completedDays = []; return regenerateWeek(s); });
        else switchTrack('mob', () => {});
        rerender(); setTimeout(() => summarySheet(before), 350);
      });
    },
  });
}
