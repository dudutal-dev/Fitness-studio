// מדיטציה בתנועה עם אור (רק ב-MOVA): הכרטיס שבמסך הבית, חלונית המסעות, ומסך המסע — מה מצפה בו, אורך וקצב — שממנו יוצאים להליכה.
// 25.11.2026 (בקשת בעל המוצר): לחיצה על מסע פותחת מסך מלא עם האיור שלו, פסקה על המסע, ומה מחכה בכל חלק של הדרך.
import { html, esc, on, sheet, icon, el } from '../ui/dom.js';
import { get, set } from '../store.js';
import { COACHES } from '../data/coaches.js';
import { MED_JOURNEYS, MED_ALL, MED_ABOUT } from '../data/med-lines.js';
import { buildMedSession, weekJourney, MED_EFFORT, MED_MINUTES, MED_PACES } from '../engine/meditation.js';
import { startRun } from './run.js';

export const medArt = (id, sq = true) => `../assets/med/${id}${sq ? '_sq' : ''}.webp`;
export const medCardHtml = () => html`<button class="med-card" data-act="med" style="background-image:linear-gradient(100deg, rgba(30,18,60,.25), rgba(30,18,60,.86) 62%), url(${medArt('thanks')})"><img src="${COACHES.or.face}" alt="" loading="lazy">
  <span><b>Meditative walk with  ${esc(COACHES.or.name)}</b><small>Morning · Release · Healing · Connection · Reset · Gratitude · Presence</small></span>${icon('play', 'width="20" height="20"')}</button>`;

const KIND_TXT = (k) => (k === 'brisk' ? 'brisk walk' : k === 'power' ? 'power walk' : k === 'stroll' ? 'calm walk' : 'slow walk');

// חלונית המסעות: שבעה כרטיסים עם האיור של כל מסע; המסע שמוצע עכשיו מסומן (בבוקר — מדיטציית הבוקר; אחרת — המסע של השבוע)
export function medSheet() {
  const s = get(), now = new Date().getHours() < 10 ? 'morning' : weekJourney((s.plan?.blockIndex || 0) * 4 + (s.plan?.weekInBlock || 0));
  sheet(html`<div class="med-head"><img src="${COACHES.or.face}" alt=""><div><div class="eyebrow">Moving meditation</div><div class="h1" style="font-size:22px">A walk with  ${esc(COACHES.or.name)}</div></div></div>
    <p class="sub">Choose a journey, and see what's waiting in it. ${esc(COACHES.or.name)} says a little at the start of each part, and leaves plenty of silence.</p>
    <div class="med-journeys">${MED_ALL.map((id) => `<button type="button" class="med-j ${id === 'morning' ? 'wide' : ''} ${id === now ? 'on' : ''}" data-mj="${id}" style="background-image:linear-gradient(180deg, rgba(20,12,40,0) 30%, rgba(20,12,40,.92) 78%), url(${medArt(id)})">${id === now ? '<i class="med-now">Suggested now</i>' : ''}<b>${MED_JOURNEYS[id].name}</b><small>${esc(MED_JOURNEYS[id].desc)}</small></button>`).join('')}</div>`, {
    onMount(sh, close) { on(sh, 'click', '[data-mj]', (e, b) => journeyScreen(b.dataset.mj, close)); },
  });
}

// מסך המסע: האיור על כל רוחב המסך, מה מצפה, הדרך חלק אחרי חלק, אורך וקצב, ויציאה להליכה. closeSheet: סוגר גם את חלונית המסעות כשיוצאים
export function journeyScreen(journey, closeSheet) {
  const p = get().profile, J = MED_JOURNEYS[journey], [about, points] = MED_ABOUT[journey];
  let minutes = MED_MINUTES.includes(p.medMin) ? p.medMin : 30, pace = p.medPace === 'fast' ? 'fast' : 'calm';
  const way = () => { const r = buildMedSession(journey, { minutes, pace });
    return `<div class="mj-top"><b>The way, part by part</b><span class="ms-eff e${r.effort}">Effort: ${MED_EFFORT[r.effort]}</span></div>
      <div class="ms-bar">${r.segs.map((x) => `<i class="${x.kind}" style="flex:${x.sec}"></i>`).join('')}</div>
      <ol class="mj-way">${r.segs.map((x, i) => `<li><span class="dot ${x.kind}"></span><div><b>${esc(x.point)}</b><small>${KIND_TXT(x.kind)} · ${Math.round(x.sec / 60)} min</small>
        <p>${i === 0 ? `${esc(COACHES.or.name)}  opens the journey, at a slow walk.` : i === 5 ? 'Slow down, a deep breath, and one sentence to take home.' : esc(points[i - 1])}</p></div></li>`).join('')}</ol>`; };
  const root = el(html`<div class="med-screen" role="dialog" aria-modal="true" aria-label="${esc(J.name)}">
    <div class="mj-scroll">
      <div class="mj-hero" style="background-image:url(${medArt(journey, false)})"><button class="icon-btn mj-back" data-mback aria-label="Back to the journeys">${icon('close', 'width="20" height="20"')}</button>
        <div class="mj-title"><div class="eyebrow">Moving meditation · with ${esc(COACHES.or.name)}</div><div class="mj-name">${esc(J.name)}</div><div class="mj-desc">${esc(J.desc)}</div></div></div>
      <div class="mj-body">
        <p class="mj-about">${esc(about)}</p>
        <div class="mj-pick"><label class="field"><span>How long? (minutes)</span><div class="seg" data-mmin>${MED_MINUTES.map((v) => `<button type="button" data-v="${v}" class="${minutes === v ? 'on' : ''}">${v}</button>`).join('')}</div></label>
          <label class="field"><span>Which walk?</span><div class="seg" data-mpace>${Object.entries(MED_PACES).map(([k, v]) => `<button type="button" data-v="${k}" class="${pace === k ? 'on' : ''}">${v}</button>`).join('')}</div></label></div>
        <div class="mj-card" data-way>${way()}</div>
        <div class="sub t-foot">The music is calm in the calm parts and rhythmic in the brisk parts. Eyes open, gaze on the path.</div>
      </div>
    </div>
    <div class="mj-go"><button class="btn primary block xl" data-mgo>${icon('play', 'width="22" height="22"')} Start walking</button></div></div>`);
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
