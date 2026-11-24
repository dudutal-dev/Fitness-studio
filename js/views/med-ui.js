// מדיטציה בתנועה עם אור (רק ב-MOVA): הכרטיס שבמסך הבית, חלונית המסעות, ומסך המסע — מה מצפה בו, אורך וקצב — שממנו יוצאים להליכה.
// 25.11.2026 (בקשת בעל המוצר): לחיצה על מסע פותחת מסך מלא עם האיור שלו, פסקה על המסע, ומה מחכה בכל חלק של הדרך.
import { html, esc, on, sheet, icon, el } from '../ui/dom.js';
import { get, set } from '../store.js';
import { COACHES } from '../data/coaches.js';
import { MED_JOURNEYS, MED_ALL, MED_ABOUT } from '../data/med-lines.js';
import { buildMedSession, weekJourney, MED_EFFORT, MED_MINUTES, MED_PACES } from '../engine/meditation.js';
import { MJ_PATHS, MJ_STAGES, MJ_WEEKS, MJ_LEVELS, MJ_TIMES, MJ_DEFAULT, MJ_STAGE_LINES, mjOf, mjAt, mjWeekPlan, mjStats, mjStillsDone, mjStills } from '../engine/med-journey.js';
import { say, stop, unlock, useCoach } from '../coach/voice.js';
import { startRun } from './run.js';
import { STILL, STILL_ALL, STILL_MINUTES, STILL_STAGES, STILL_FRAC } from '../data/med-still.js';
import { startStill } from './still.js';

export const medArt = (id, sq = true) => `assets/med/${id}${sq ? '_sq' : ''}.webp`;
// טעינה עמידה של האיורים (25.11.2026): בטלפון של בעל המוצר הכרטיסים נפתחו פעם בלי תמונות. כל איור נטען גם בנפרד, ואם נכשל — מנסים שוב, עד שלוש פעמים
function ensureArt(scope) {
  const again = (set, url, n = 0) => { const im = new Image(); im.onload = () => set(url); im.onerror = () => { if (n < 3) setTimeout(() => again(set, `${url.split('?')[0]}?r=${n + 1}`, n + 1), 1200 * (n + 1)); }; im.src = url; };
  scope.querySelectorAll('.med-j[data-mj]').forEach((b) => again((u) => { b.style.backgroundImage = `linear-gradient(180deg, rgba(20,12,40,0) 30%, rgba(20,12,40,.92) 78%), url(${u})`; }, medArt(b.dataset.mj)));
  scope.querySelectorAll('.med-head img').forEach((im) => { im.addEventListener('error', () => { const n = Number(im.dataset.n || 0); if (n < 3) { im.dataset.n = n + 1; setTimeout(() => { im.src = `${COACHES.or.face}?r=${n + 1}`; }, 1200 * (n + 1)); } }); });
}
export const medCardHtml = () => html`<button class="med-card" data-act="med" style="background-image:linear-gradient(100deg, rgba(30,18,60,.25), rgba(30,18,60,.86) 62%), url(${medArt('thanks')})"><img src="${COACHES.or.face}" alt="" loading="lazy">
  <span><b>מדיטציה עם ${esc(COACHES.or.name)}</b><small>הליכות מדיטטיביות · מדיטציית בוקר · מדיטציית לילה</small></span>${icon('play', 'width="20" height="20"')}</button>`;

const KIND_TXT = (k) => (k === 'brisk' ? 'הליכה מהירה' : k === 'power' ? 'הליכה נמרצת' : k === 'stroll' ? 'הליכה רגועה' : 'הליכה איטית');

// חלונית המדיטציות: שלוש לשוניות לפי זמן — הליכה (שבעת המסעות), בוקר (שתי מדיטציות בישיבה), לילה (מדיטציה בשכיבה).
// הלשונית שנפתחת: לפני עשר בבוקר — בוקר; אחרי תשע בערב — לילה; אחרת — הליכה. המסע שמוצע עכשיו מסומן.
export function medSheet(tab0 = null) {
  const s = get(), h = new Date().getHours(), now = h < 10 ? 'morning' : weekJourney((s.plan?.blockIndex || 0) * 4 + (s.plan?.weekInBlock || 0));
  let tab = tab0 || (h < 10 ? 'morning' : h >= 21 || h < 4 ? 'night' : 'walk');
  const card = (id, name, desc, cls, mark) => `<button type="button" class="med-j ${cls}" data-mj="${id}" style="background-image:linear-gradient(180deg, rgba(20,12,40,0) 30%, rgba(20,12,40,.92) 78%), url(${medArt(id)})">${mark ? '<i class="med-now">מוצע עכשיו</i>' : ''}<b>${name}</b><small>${esc(desc)}</small></button>`;
  const body = () => (tab === 'walk'
    ? `<p class="sub">הליכה בחוץ, 20 עד 45 דקות. בוחרים מסע, ורואים מה מחכה בו.</p><div class="med-journeys">${MED_ALL.map((id) => card(id, MED_JOURNEYS[id].name, MED_JOURNEYS[id].desc, `${id === 'morning' ? 'wide' : ''} ${id === now ? 'on' : ''}`, id === now)).join('')}</div>`
    : `<p class="sub">${tab === 'morning' ? 'בישיבה, 15 עד 30 דקות, עם נשימה מונחית. שתי דרכים לפתוח את היום.' : 'בשכיבה, 15 עד 30 דקות, עם נשימה מונחית. בסוף המוזיקה ממשיכה עוד קצת ונעלמת לבד.'}</p>
      <div class="med-journeys still-cards">${STILL_ALL.filter((id) => STILL[id].when === tab).map((id) => card(id, STILL[id].name, STILL[id].desc, 'wide tall', false)).join('')}</div>`);
  sheet(html`<div class="med-head"><img src="${COACHES.or.face}" alt=""><div><div class="eyebrow">מדיטציה</div><div class="h1" style="font-size:22px">עם ${esc(COACHES.or.name)}</div></div></div>
    <div class="seg med-tabs" data-mtab>${[['walk', 'הליכה'], ['morning', 'בוקר'], ['night', 'לילה']].map(([k, v]) => `<button type="button" data-v="${k}" class="${tab === k ? 'on' : ''}">${v}</button>`).join('')}</div>
    <div data-mbody>${body()}</div>`, {
    onMount(sh, close) {
      ensureArt(sh);
      on(sh, 'click', '[data-mtab] button', (e, b) => { tab = b.dataset.v; sh.querySelectorAll('[data-mtab] button').forEach((x) => x.classList.toggle('on', x === b)); sh.querySelector('[data-mbody]').innerHTML = body(); ensureArt(sh); });
      on(sh, 'click', '[data-mj]', (e, b) => (STILL[b.dataset.mj] ? stillScreen(b.dataset.mj, close) : journeyScreen(b.dataset.mj, close)));
    },
  });
}

// מסך הפתיחה של מדיטציית בוקר / לילה: האיור, מה מצפה, חמשת השלבים, הנשימה, בחירת אורך, והתחלה
export function stillScreen(id, closeSheet, { day = null } = {}) {
  const p = get().profile, M = STILL[id], night = M.when === 'night';
  let minutes = STILL_MINUTES.includes(p.stillMin) ? p.stillMin : 15;
  const way = () => `<div class="mj-top"><b>חמישה שלבים</b><span class="ms-eff e1">${night ? 'בשכיבה' : 'בישיבה'}</span></div>
      <div class="ms-bar">${STILL_FRAC.map((f) => `<i class="stroll" style="flex:${f}"></i>`).join('')}</div>
      <ol class="mj-way">${STILL_STAGES.map((n, i) => `<li><span class="dot stroll"></span><div><b>${n}</b><small>${Math.max(1, Math.round(STILL_FRAC[i] * minutes))} דק׳</small>
        <p>${[night ? 'שוכבים על הגב, והעיניים נעצמות.' : 'יושבים בנוחות, בגב זקוף ורך.', `${esc(M.breathName)}. ${esc(COACHES.or.name)} מדריכה כמה סבבים, ואז ממשיכים עם העיגול שעל המסך.`, night ? 'הרפיה איטית, חלק אחרי חלק, עד שהגוף כבד וחמים.' : 'מעבר קצר על הגוף, מכפות הרגליים ועד הפנים.', esc(M.desc) + '.', night ? `${esc(COACHES.or.name)} שותקת, והמוזיקה ממשיכה עוד עשר דקות ונעלמת לבד.` : 'חוזרים לאט, ופוקחים עיניים.'][i]}</p></div></li>`).join('')}</ol>`;
  const root = el(html`<div class="med-screen ${night ? 'night' : ''}" role="dialog" aria-modal="true" aria-label="${esc(M.name)}">
    <div class="mj-scroll">
      <div class="mj-hero" style="background-image:url(${medArt(id, false)})"><button class="icon-btn mj-back" data-mback aria-label="חזרה">${icon('close', 'width="20" height="20"')}</button>
        <div class="mj-title"><div class="eyebrow">${night ? 'מדיטציית לילה · בשכיבה' : 'מדיטציית בוקר · בישיבה'} · עם ${esc(COACHES.or.name)}</div><div class="mj-name">${esc(M.name)}</div><div class="mj-desc">${esc(M.desc)}</div></div></div>
      <div class="mj-body">
        <p class="mj-about">${esc(M.about)}</p>
        <div class="mj-pick"><label class="field"><span>כמה זמן? (דקות)</span><div class="seg" data-mmin>${STILL_MINUTES.map((v) => `<button type="button" data-v="${v}" class="${minutes === v ? 'on' : ''}">${v}</button>`).join('')}</div></label></div>
        <div class="mj-card" data-way>${way()}</div>
        <div class="sub t-foot">${night ? 'כדאי להנמיך את עוצמת הטלפון ולהניח אותו לצד המיטה. המסך יכול להיכבות; המדיטציה ממשיכה.' : 'מקום שקט, ואוזניות אם יש. הדיבור קצר, ובין הקטעים יש שקט עם מוזיקה.'}</div>
      </div>
    </div>
    <div class="mj-go"><button class="btn primary block xl" data-mgo>${icon('play', 'width="22" height="22"')} מתחילים</button></div></div>`);
  const close = () => root.remove();
  on(root, 'click', '[data-mback]', close);
  on(root, 'click', '[data-mmin] button', (e, b) => { minutes = Number(b.dataset.v); root.querySelectorAll('[data-mmin] button').forEach((x) => x.classList.toggle('on', x === b)); root.querySelector('[data-way]').innerHTML = way(); });
  on(root, 'click', '[data-mgo]', () => { set((x) => { x.profile.stillMin = minutes; return x; }); close(); closeSheet?.(); startStill(id, { minutes, day }); });
  document.body.append(root);
}

// מסך המסע: האיור על כל רוחב המסך, מה מצפה, הדרך חלק אחרי חלק, אורך וקצב, ויציאה להליכה. closeSheet: סוגר גם את חלונית המסעות כשיוצאים
export function journeyScreen(journey, closeSheet) {
  const p = get().profile, J = MED_JOURNEYS[journey], [about, points] = MED_ABOUT[journey];
  let minutes = MED_MINUTES.includes(p.medMin) ? p.medMin : 30, pace = p.medPace === 'fast' ? 'fast' : 'calm';
  const way = () => { const r = buildMedSession(journey, { minutes, pace });
    return `<div class="mj-top"><b>הדרך, חלק אחרי חלק</b><span class="ms-eff e${r.effort}">הליכה ${MED_EFFORT[r.effort]}</span></div>
      <div class="ms-bar">${r.segs.map((x) => `<i class="${x.kind}" style="flex:${x.sec}"></i>`).join('')}</div>
      <ol class="mj-way">${r.segs.map((x, i) => `<li><span class="dot ${x.kind}"></span><div><b>${esc(x.point)}</b><small>${KIND_TXT(x.kind)} · ${Math.round(x.sec / 60)} דק׳</small>
        <p>${i === 0 ? `${esc(COACHES.or.name)} פותחת את המסע, בהליכה איטית.` : i === 5 ? 'מאטים, נשימה עמוקה, ומשפט אחד שלוקחים הביתה.' : esc(points[i - 1])}</p></div></li>`).join('')}</ol>`; };
  const root = el(html`<div class="med-screen" role="dialog" aria-modal="true" aria-label="${esc(J.name)}">
    <div class="mj-scroll">
      <div class="mj-hero" style="background-image:url(${medArt(journey, false)})"><button class="icon-btn mj-back" data-mback aria-label="חזרה למסעות">${icon('close', 'width="20" height="20"')}</button>
        <div class="mj-title"><div class="eyebrow">מדיטציה בתנועה · עם ${esc(COACHES.or.name)}</div><div class="mj-name">${esc(J.name)}</div><div class="mj-desc">${esc(J.desc)}</div></div></div>
      <div class="mj-body">
        <p class="mj-about">${esc(about)}</p>
        <div class="mj-pick"><label class="field"><span>כמה זמן? (דקות)</span><div class="seg" data-mmin>${MED_MINUTES.map((v) => `<button type="button" data-v="${v}" class="${minutes === v ? 'on' : ''}">${v}</button>`).join('')}</div></label>
          <label class="field"><span>איזו הליכה?</span><div class="seg" data-mpace>${Object.entries(MED_PACES).map(([k, v]) => `<button type="button" data-v="${k}" class="${pace === k ? 'on' : ''}">${v}</button>`).join('')}</div></label></div>
        <div class="mj-card" data-way>${way()}</div>
        <div class="sub t-foot">המוזיקה רגועה בחלקים הרגועים וקצבית בחלקים המהירים. העיניים פקוחות והמבט על הדרך.</div>
      </div>
    </div>
    <div class="mj-go"><button class="btn primary block xl" data-mgo>${icon('play', 'width="22" height="22"')} יוצאים להליכה</button></div></div>`);
  const close = () => root.remove();
  const seg = (sel, v) => root.querySelectorAll(`${sel} button`).forEach((b) => b.classList.toggle('on', b.dataset.v === String(v)));
  on(root, 'click', '[data-mback]', close);
  on(root, 'click', '[data-mmin] button', (e, b) => { minutes = Number(b.dataset.v); seg('[data-mmin]', minutes); root.querySelector('[data-way]').innerHTML = way(); });
  on(root, 'click', '[data-mpace] button', (e, b) => { pace = b.dataset.v; seg('[data-mpace]', pace); root.querySelector('[data-way]').innerHTML = way(); });
  on(root, 'click', '[data-mgo]', () => {
    set((x) => { if (!mjOf(x.profile)) { x.profile.medMin = minutes; x.profile.medPace = pace; } return x; });   // במסע בשלבים האורך והקצב נקבעים במסע — הליכה חד־פעמית לא משנה אותם
    close(); closeSheet?.(); startRun(buildMedSession(journey, { minutes, pace }), { coach: 'or' });
  });
  document.body.append(root);
}

// הגדרת המסע (25.11.2026): כשמדיטציה בתנועה נבחרת כמסלול ראשי — בוחרים דרך רוחנית, אורך מסע, ימים בשבוע, אורך הליכה, כושר הליכה ומתי הולכים,
// ורואים את ארבעת השלבים לפני שמתחילים. onStart מקבל { medJ, days, medMin } — מי שקרא שומר ובונה את התוכנית.
export function journeySetup(onStart, preset = {}) {
  const p = get().profile, cur = mjOf(p);
  const c = { ...MJ_DEFAULT, ...(p.medJ || {}), ...preset, days: Math.min(6, Math.max(2, p.days || 3)), medMin: MED_MINUTES.includes(p.medMin) ? p.medMin : 30 };
  if (!MJ_PATHS[c.path]) c.path = MJ_DEFAULT.path;
  const names = (pool) => pool.map((j) => MED_JOURNEYS[j].name).join(' · ');
  const stages = () => { const per = c.weeks / 4;
    return `<div class="mj-top"><b>ארבעה שלבים</b><span class="ms-eff">${c.weeks} שבועות</span></div>
      <ol class="mj-way">${MJ_STAGES.map((st, i) => { const w = i * per, pl = mjWeekPlan(c, w, c.days, c.medMin), fast = pl.filter((x) => x.pace === 'fast').length, long = Math.max(...pl.map((x) => x.minutes));
        return `<li><span class="dot ${i === 0 ? 'stroll' : i === 3 ? 'power' : 'brisk'}"></span><div><b>${st.name}</b><small>${per === 1 ? `שבוע ${w + 1}` : `שבועות ${w + 1}–${w + per}`} · ${esc(names(MJ_PATHS[c.path].stages[i]))}</small>
          <p>${esc(st.desc)} ${fast ? `${fast} מתוך ${c.days} הליכות בקצב מהיר` : 'כל ההליכות רגועות'}${long > c.medMin ? `, והליכה ארוכה של ${long} דקות` : ''}.</p></div></li>`; }).join('')}</ol>`; };
  const segH = (key, opts) => `<div class="seg" data-js="${key}">${opts.map(([v, t]) => `<button type="button" data-v="${v}" class="${String(c[key]) === String(v) ? 'on' : ''}">${t}</button>`).join('')}</div>`;
  const root = el(html`<div class="med-screen" role="dialog" aria-modal="true" aria-label="המסע שלי">
    <div class="mj-scroll">
      <div class="mj-hero short" data-hero style="background-image:url(${medArt(MJ_PATHS[c.path].art, false)})"><button class="icon-btn mj-back" data-mback aria-label="סגירה">${icon('close', 'width="20" height="20"')}</button>
        <div class="mj-title"><div class="eyebrow">מדיטציה בתנועה · עם ${esc(COACHES.or.name)}</div><div class="mj-name">המסע שלי</div><div class="mj-desc">מסע רוחני בשלבים, שבונה גם כושר הליכה</div></div></div>
      <div class="mj-body">
        <div class="field"><span>איזו דרך?</span><div class="mjp-list">${Object.entries(MJ_PATHS).map(([k, v]) => `<button type="button" class="mjp ${c.path === k ? 'on' : ''}" data-path="${k}" style="background-image:linear-gradient(90deg, rgba(12,10,26,.05), rgba(12,10,26,.82) 60%), url(${medArt(v.art)})"><b>${v.name}</b><small>${v.desc}</small></button>`).join('')}</div></div>
        <div class="mj-pick">
          <label class="field"><span>אורך המסע</span>${segH('weeks', MJ_WEEKS.map((v) => [v, `${v} שבועות`]))}</label>
          <label class="field"><span>כמה הליכות בשבוע?</span>${segH('days', [2, 3, 4, 5, 6].map((v) => [v, v]))}</label>
          <label class="field"><span>אורך הליכה רגילה (דקות)</span>${segH('medMin', MED_MINUTES.map((v) => [v, v]))}</label>
          <label class="field"><span>כושר ההליכה היום</span>${segH('level', Object.entries(MJ_LEVELS))}</label>
          <label class="field"><span>מתי הולכים?</span>${segH('time', Object.entries(MJ_TIMES))}</label>
        </div>
        <div class="mj-card" data-stages>${stages()}</div>
        <div class="sub t-foot">ההליכה הארוכה של השבוע מתארכת בהדרגה, והשבוע האחרון של כל שלב קל יותר. במסלול הזה אין תפריט תזונה.</div>
      </div>
    </div>
    <div class="mj-go"><button class="btn primary block xl" data-jstart>${cur ? 'מתחילים מסע חדש' : 'מתחילים את המסע'}</button></div></div>`);
  const close = () => root.remove(), fresh = () => { root.querySelector('[data-stages]').innerHTML = stages(); };
  on(root, 'click', '[data-mback]', close);
  on(root, 'click', '[data-path]', (e, b) => { c.path = b.dataset.path; root.querySelectorAll('.mjp').forEach((x) => x.classList.toggle('on', x === b)); root.querySelector('[data-hero]').style.backgroundImage = `url(${medArt(MJ_PATHS[c.path].art, false)})`; fresh(); });
  on(root, 'click', '[data-js] button', (e, b) => { const k = b.closest('[data-js]').dataset.js; c[k] = k === 'time' ? b.dataset.v : Number(b.dataset.v); b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); fresh(); });
  on(root, 'click', '[data-jstart]', () => { close(); onStart({ medJ: { path: c.path, weeks: c.weeks, level: c.level, time: c.time }, days: c.days, medMin: c.medMin }); });
  document.body.append(root);
}

// מפת המסע במסך הבית (25.11.2026): הדרך, ארבעת השלבים, ואיפה נמצאים עכשיו. לחיצה פותחת את לשונית התוכנית
export function mjCardHtml(s) {
  const mj = s.plan?.week?.mj; if (!mj || !mjOf(s.profile)) return '';
  const P = MJ_PATHS[mj.path], st = MJ_STAGES[mj.stage];
  return html`<a class="mj-map" href="#/plan" style="background-image:linear-gradient(100deg, rgba(20,12,40,.35), rgba(20,12,40,.9) 58%), url(${medArt(P.art)})">
    <div class="row between"><span class="eyebrow">המסע שלי · ${esc(P.name)}</span><span class="mm-week num">${mj.done ? 'הושלם' : `שבוע ${mj.week + 1} / ${mj.weeks}`}</span></div>
    <b>${mj.done ? 'המסע הושלם' : `שלב ${mj.stage + 1} מתוך 4 · ${esc(st.name)}`}</b>
    <small>${mj.done ? 'אפשר להתחיל מסע חדש בהגדרות.' : esc(st.desc)}${mj.light ? ' השבוע קל יותר.' : ''}</small>
    <div class="mm-bar">${MJ_STAGES.map((x, si) => `<div class="${si === mj.stage && !mj.done ? 'on' : ''}"><div>${Array.from({ length: mj.per }, (_, w) => `<i class="${mj.done || si < mj.stage || (si === mj.stage && w < mj.inStage) ? 'f' : si === mj.stage && w === mj.inStage ? 'c' : ''}"></i>`).join('')}</div><span>${x.name}</span></div>`).join('')}</div></a>`;
}

// סיכום בסוף שלב ובסוף המסע (25.11.2026): מסך מלא עם מה שנעשה (הליכות, דקות, קילומטרים), מה מחכה בשלב הבא, ומשפט של אור.
// נפתח ממסך הבית כשיש state.mjNote (נשמר ב-maybeAdvanceWeek) ונמחק בסגירה. בסוף המסע: מסע חדש (עם הצעה לעלות רמה) או להמשיך ללכת.
export function mjNoteScreen(onNew) {
  const s = get(), n = s.mjNote; if (!n || !MJ_PATHS[n.path]) return false;
  if (document.querySelector('.med-screen.mj-note')) return true;
  const P = MJ_PATHS[n.path], st = MJ_STAGES[n.stage], nx = MJ_STAGES[n.stage + 1], end = n.kind === 'journey', x = mjStats(s.runs, n.since, s.sessions), up = end && (n.level || 1) < 3;
  const root = el(html`<div class="med-screen mj-note" role="dialog" aria-modal="true" aria-label="${end ? 'המסע הושלם' : 'שלב הושלם'}">
    <div class="mj-scroll">
      <div class="mj-hero short" style="background-image:url(${medArt(end ? 'thanks' : P.art, false)})"><div class="mj-title"><div class="eyebrow">${esc(P.name)} · ${end ? `${n.weeks} שבועות` : `שלב ${n.stage + 1} מתוך 4`}</div>
        <div class="mj-name">${end ? 'המסע הושלם' : `${esc(st.name)} — הושלם`}</div><div class="mj-desc">${end ? 'כל ארבעת השלבים מאחור: הגעה, שחרור, העמקה ושילוב.' : esc(st.desc)}</div></div></div>
      <div class="mj-body">
        <div class="mjn-stats"><div><b class="num">${x.walks}</b><span>הליכות</span></div><div><b class="num">${x.minutes}</b><span>דקות</span></div>${x.km ? `<div><b class="num">${x.km}</b><span>ק״מ</span></div>` : ''}${x.stills ? `<div><b class="num">${x.stills}</b><span>מדיטציות</span></div>` : ''}</div>
        ${end ? `<div class="mj-card"><b>ומה עכשיו?</b><p class="mj-about" style="margin:8px 0 0">${up ? `אפשר לצאת למסע חדש ברמת הליכה גבוהה יותר (${MJ_LEVELS[(n.level || 1) + 1]}), בדרך אחרת או באותה דרך.` : 'אפשר לצאת למסע חדש, בדרך אחרת או באותה דרך.'} ומי שרוצה פשוט ממשיך ללכת באותו קצב.</p></div>`
    : `<div class="mj-card"><div class="mj-top"><b>השלב הבא: ${esc(nx.name)}</b><span class="ms-eff">שלב ${n.stage + 2} מתוך 4</span></div><p class="mj-about" style="margin:0">${esc(nx.desc)}</p></div>`}
      </div>
    </div>
    <div class="mj-go">${end ? `<button class="btn primary block xl" data-nnew>מסע חדש</button><button class="btn ghost block" style="margin-top:8px" data-nok>ממשיכים ללכת</button>` : '<button class="btn primary block xl" data-nok>ממשיכים</button>'}</div></div>`);
  const close = () => { set((z) => { delete z.mjNote; return z; }); stop(); useCoach(null); root.remove(); };
  on(root, 'click', '[data-nok]', close);
  on(root, 'click', '[data-nnew]', () => { close(); onNew?.(up ? { level: (n.level || 1) + 1 } : {}); });
  document.body.append(root);
  // אור אומרת את משפט הסיכום
  const speak = () => { unlock(); useCoach('or'); say(end ? 'med_j_done' : MJ_STAGE_LINES[n.stage], { priority: true, keep: true }); };
  speak();
  return true;
}

// מדיטציות הבוקר והלילה של השבוע במסע (25.11.2026): שני כרטיסים קטנים במסך הבית ובלשונית התוכנית — בנוסף להליכות, רשות
export function mjStillsHtml(s) {
  const mj = mjOf(s.profile), wk = s.plan?.week; if (!mj || !wk?.mj) return '';
  const ids = wk.stills || mjStills(mj, wk.mj.week);   // שבוע שנבנה לפני הגרסה הזאת עוד לא מחזיק את הרשימה
  const done = mjStillsDone(s.sessions, s.plan.weekStart);
  return html`<div class="mj-stills"><div class="sub t-cap">גם השבוע · בנוסף להליכות</div><div class="mjs-row">${ids.map((id) => { const M = STILL[id], night = M.when === 'night';
    return `<button type="button" class="mjs ${done.has(id) ? 'done' : ''}" data-mstill="${id}" style="background-image:linear-gradient(180deg, rgba(20,12,40,.15), rgba(20,12,40,.9) 70%), url(${medArt(id)})"><i>${done.has(id) ? '✓ בוצע' : night ? 'לילה · בשכיבה' : 'בוקר · בישיבה'}</i><b>${M.name}</b><small>${night ? 'מדיטציית לילה' : 'מדיטציית בוקר'}</small></button>`; }).join('')}</div></div>`;
}
export const bindMjStills = (root) => on(root, 'click', '[data-mstill]', (e, b) => stillScreen(b.dataset.mstill));
