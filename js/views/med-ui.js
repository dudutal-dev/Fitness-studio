// מדיטציה בתנועה עם אור (רק ב-MOVA): הכרטיס שבמסך הבית, חלונית המסעות, ומסך המסע — מה מצפה בו, אורך וקצב — שממנו יוצאים להליכה.
// 25.11.2026 (בקשת בעל המוצר): לחיצה על מסע פותחת מסך מלא עם האיור שלו, פסקה על המסע, ומה מחכה בכל חלק של הדרך.
import { html, esc, on, sheet, icon, el } from '../ui/dom.js';
import { get, set } from '../store.js';
import { COACHES } from '../data/coaches.js';
import { MED_JOURNEYS, MED_ALL, MED_ABOUT } from '../data/med-lines.js';
import { buildMedSession, weekJourney, MED_EFFORT, MED_MINUTES, MED_PACES } from '../engine/meditation.js';
import { startRun } from './run.js';
import { STILL, STILL_ALL, STILL_MINUTES, STILL_STAGES, STILL_FRAC } from '../data/med-still.js';
import { startStill } from './still.js';

export const medArt = (id, sq = true) => `assets/med/${id}${sq ? '_sq' : ''}.webp`;
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
      on(sh, 'click', '[data-mtab] button', (e, b) => { tab = b.dataset.v; sh.querySelectorAll('[data-mtab] button').forEach((x) => x.classList.toggle('on', x === b)); sh.querySelector('[data-mbody]').innerHTML = body(); });
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
    set((x) => { x.profile.medMin = minutes; x.profile.medPace = pace; return x; });
    close(); closeSheet?.(); startRun(buildMedSession(journey, { minutes, pace }), { coach: 'or' });
  });
  document.body.append(root);
}
