// מדיטציה בתנועה עם אור (24.11.2026; רק ב-MOVA): הכרטיס שבמסך הבית, וחלונית הבחירה — מסע, אורך וקצב — שממנה יוצאים להליכה.
import { html, esc, on, sheet, icon } from '../ui/dom.js';
import { get, set } from '../store.js';
import { COACHES } from '../data/coaches.js';
import { MED_JOURNEYS, MED_ORDER } from '../data/med-lines.js';
import { buildMedSession, weekJourney, medEffort, MED_EFFORT, MED_MINUTES, MED_PACES } from '../engine/meditation.js';
import { startRun } from './run.js';

export const medArt = (id, sq = true) => `assets/med/${id}${sq ? '_sq' : ''}.webp`;
export const medCardHtml = () => html`<button class="med-card" data-act="med" style="background-image:linear-gradient(100deg, rgba(30,18,60,.25), rgba(30,18,60,.86) 62%), url(${medArt('thanks')})"><img src="${COACHES.or.face}" alt="" loading="lazy">
  <span><b>הליכה מדיטטיבית עם ${esc(COACHES.or.name)}</b><small>שחרור · ריפוי · חיבור · איפוס · הודיה · נוכחות</small></span>${icon('play', 'width="20" height="20"')}</button>`;

export function medSheet() {
  const s = get(), p = s.profile;
  let journey = weekJourney((s.plan?.blockIndex || 0) * 4 + (s.plan?.weekInBlock || 0)), minutes = MED_MINUTES.includes(p.medMin) ? p.medMin : 30, pace = p.medPace === 'fast' ? 'fast' : 'calm';
  // מבנה ההליכה של המסע שנבחר: שישה חלקים באורך יחסי, צבע לפי הקצב, ושם הנקודה של כל חלק
  const shapeHtml = () => { const r = buildMedSession(journey, { minutes, pace });
    return `<div class="med-shape"><div class="ms-top"><b>כך בנויה ההליכה</b><span class="ms-eff e${r.effort}">${MED_EFFORT[medEffort(journey, pace)]}</span></div>
      <div class="ms-bar">${r.segs.map((x) => `<i class="${x.kind}" style="flex:${x.sec}"></i>`).join('')}</div>
      <ol class="ms-list">${r.segs.map((x) => `<li><span class="dot ${x.kind}"></span><b>${esc(x.point || '')}</b><small>${x.kind === 'brisk' ? 'הליכה מהירה' : x.kind === 'power' ? 'הליכה נמרצת' : x.kind === 'stroll' ? 'הליכה רגועה' : 'הליכה איטית'} · ${Math.round(x.sec / 60)} דק׳</small></li>`).join('')}</ol></div>`; };
  const body = () => html`<div class="med-journeys">${MED_ORDER.map((id) => `<button type="button" class="med-j ${id === journey ? 'on' : ''}" data-mj="${id}" style="background-image:linear-gradient(180deg, rgba(20,12,40,0) 30%, rgba(20,12,40,.92) 78%), url(${medArt(id)})"><b>${MED_JOURNEYS[id].name}</b><small>${esc(MED_JOURNEYS[id].desc)}</small></button>`).join('')}</div>
    <label class="field"><span>כמה זמן? (דקות)</span><div class="seg" data-mmin>${MED_MINUTES.map((v) => `<button type="button" data-v="${v}" class="${minutes === v ? 'on' : ''}">${v}</button>`).join('')}</div></label>
    <label class="field"><span>איזו הליכה?</span><div class="seg" data-mpace>${Object.entries(MED_PACES).map(([k, v]) => `<button type="button" data-v="${k}" class="${pace === k ? 'on' : ''}">${v}</button>`).join('')}</div></label>
    ${shapeHtml()}
    <div class="sub t-foot">המוזיקה רגועה ומרחפת בחלקים הרגועים, וקצבית בחלקים המהירים. העיניים פקוחות והמבט על הדרך.</div>`;
  sheet(html`<div class="med-head"><img src="${COACHES.or.face}" alt=""><div><div class="eyebrow">מדיטציה בתנועה</div><div class="h1" style="font-size:22px">הליכה עם ${esc(COACHES.or.name)}</div></div></div>
    <p class="sub">בוחרים רעיון אחד להליכה. ${esc(COACHES.or.name)} מדברת מעט בפתיחת כל חלק, ומשאירה הרבה שקט.</p>
    <div data-mbody>${body()}</div>
    <button class="btn primary block xl" style="margin-top:12px" data-mgo>${icon('play', 'width="22" height="22"')} יוצאים להליכה</button>`, {
    onMount(sh, close) {
      const paint = () => { sh.querySelector('[data-mbody]').innerHTML = body(); };
      on(sh, 'click', '[data-mj]', (e, b) => { journey = b.dataset.mj; paint(); });
      on(sh, 'click', '[data-mmin] button', (e, b) => { minutes = Number(b.dataset.v); paint(); });
      on(sh, 'click', '[data-mpace] button', (e, b) => { pace = b.dataset.v; paint(); });
      on(sh, 'click', '[data-mgo]', () => {
        set((x) => { x.profile.medMin = minutes; x.profile.medPace = pace; return x; });
        close(); startRun(buildMedSession(journey, { minutes, pace }), { coach: 'or' });
      });
    },
  });
}
