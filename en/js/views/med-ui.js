// מדיטציה בתנועה עם אור (רק ב-MOVA): הכרטיס שבמסך הבית, חלונית המסעות, ומסך המסע — מה מצפה בו, אורך וקצב — שממנו יוצאים להליכה.
// 25.11.2026 (בקשת בעל המוצר): לחיצה על מסע פותחת מסך מלא עם האיור שלו, פסקה על המסע, ומה מחכה בכל חלק של הדרך.
import { html, esc, on, sheet, icon, el } from '../ui/dom.js';
import { get, set } from '../store.js';
import { COACHES } from '../data/coaches.js';
import { MED_JOURNEYS, MED_ALL, MED_ABOUT } from '../data/med-lines.js';
import { buildMedSession, weekJourney, MED_EFFORT, MED_MINUTES, MED_PACES } from '../engine/meditation.js';
import { MJ_PATHS, MJ_STAGES, MJ_WEEKS, MJ_LEVELS, MJ_TIMES, MJ_DEFAULT, mjOf, mjAt, mjWeekPlan } from '../engine/med-journey.js';
import { startRun } from './run.js';
import { STILL, STILL_ALL, STILL_MINUTES, STILL_STAGES, STILL_FRAC } from '../data/med-still.js';
import { startStill } from './still.js';

export const medArt = (id, sq = true) => `../assets/med/${id}${sq ? '_sq' : ''}.webp`;
// טעינה עמידה של האיורים (25.11.2026): בטלפון של בעל המוצר הכרטיסים נפתחו פעם בלי תמונות. כל איור נטען גם בנפרד, ואם נכשל — מנסים שוב, עד שלוש פעמים
function ensureArt(scope) {
  const again = (set, url, n = 0) => { const im = new Image(); im.onload = () => set(url); im.onerror = () => { if (n < 3) setTimeout(() => again(set, `${url.split('?')[0]}?r=${n + 1}`, n + 1), 1200 * (n + 1)); }; im.src = url; };
  scope.querySelectorAll('.med-j[data-mj]').forEach((b) => again((u) => { b.style.backgroundImage = `linear-gradient(180deg, rgba(20,12,40,0) 30%, rgba(20,12,40,.92) 78%), url(${u})`; }, medArt(b.dataset.mj)));
  scope.querySelectorAll('.med-head img').forEach((im) => { im.addEventListener('error', () => { const n = Number(im.dataset.n || 0); if (n < 3) { im.dataset.n = n + 1; setTimeout(() => { im.src = `${COACHES.or.face}?r=${n + 1}`; }, 1200 * (n + 1)); } }); });
}
export const medCardHtml = () => html`<button class="med-card" data-act="med" style="background-image:linear-gradient(100deg, rgba(30,18,60,.25), rgba(30,18,60,.86) 62%), url(${medArt('thanks')})"><img src="${COACHES.or.face}" alt="" loading="lazy">
  <span><b>Meditation with  ${esc(COACHES.or.name)}</b><small>Meditative walks · Morning meditation · Night meditation</small></span>${icon('play', 'width="20" height="20"')}</button>`;

const KIND_TXT = (k) => (k === 'brisk' ? 'brisk walk' : k === 'power' ? 'power walk' : k === 'stroll' ? 'calm walk' : 'slow walk');

// חלונית המדיטציות: שלוש לשוניות לפי זמן — הליכה (שבעת המסעות), בוקר (שתי מדיטציות בישיבה), לילה (מדיטציה בשכיבה).
// הלשונית שנפתחת: לפני עשר בבוקר — בוקר; אחרי תשע בערב — לילה; אחרת — הליכה. המסע שמוצע עכשיו מסומן.
export function medSheet(tab0 = null) {
  const s = get(), h = new Date().getHours(), now = h < 10 ? 'morning' : weekJourney((s.plan?.blockIndex || 0) * 4 + (s.plan?.weekInBlock || 0));
  let tab = tab0 || (h < 10 ? 'morning' : h >= 21 || h < 4 ? 'night' : 'walk');
  const card = (id, name, desc, cls, mark) => `<button type="button" class="med-j ${cls}" data-mj="${id}" style="background-image:linear-gradient(180deg, rgba(20,12,40,0) 30%, rgba(20,12,40,.92) 78%), url(${medArt(id)})">${mark ? '<i class="med-now">Suggested now</i>' : ''}<b>${name}</b><small>${esc(desc)}</small></button>`;
  const body = () => (tab === 'walk'
    ? `<p class="sub">An outdoor walk, 20 to 45 minutes. Choose a journey, and see what's waiting in it.</p><div class="med-journeys">${MED_ALL.map((id) => card(id, MED_JOURNEYS[id].name, MED_JOURNEYS[id].desc, `${id === 'morning' ? 'wide' : ''} ${id === now ? 'on' : ''}`, id === now)).join('')}</div>`
    : `<p class="sub">${tab === 'morning' ? 'Sitting, 15 to 30 minutes, with guided breathing. Two ways to open the day.' : 'Lying down, 15 to 30 minutes, with guided breathing. At the end the music stays a little longer and fades out on its own.'}</p>
      <div class="med-journeys still-cards">${STILL_ALL.filter((id) => STILL[id].when === tab).map((id) => card(id, STILL[id].name, STILL[id].desc, 'wide tall', false)).join('')}</div>`);
  sheet(html`<div class="med-head"><img src="${COACHES.or.face}" alt=""><div><div class="eyebrow">Meditation</div><div class="h1" style="font-size:22px">with ${esc(COACHES.or.name)}</div></div></div>
    <div class="seg med-tabs" data-mtab>${[['walk', 'Effort:'], ['morning', 'Morning'], ['night', 'Night']].map(([k, v]) => `<button type="button" data-v="${k}" class="${tab === k ? 'on' : ''}">${v}</button>`).join('')}</div>
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
  const way = () => `<div class="mj-top"><b>Five stages</b><span class="ms-eff e1">${night ? 'lying down' : 'sitting'}</span></div>
      <div class="ms-bar">${STILL_FRAC.map((f) => `<i class="stroll" style="flex:${f}"></i>`).join('')}</div>
      <ol class="mj-way">${STILL_STAGES.map((n, i) => `<li><span class="dot stroll"></span><div><b>${n}</b><small>${Math.max(1, Math.round(STILL_FRAC[i] * minutes))} min</small>
        <p>${[night ? 'Lie on your back, and close your eyes.' : 'Sit comfortably, with a tall, soft back.', `${esc(M.breathName)}. ${esc(COACHES.or.name)}  guides a few rounds, and then you continue with the circle on the screen.`, night ? 'A slow release, part by part, until the body is heavy and warm.' : 'A short pass over the body, from the soles of the feet to the face.', esc(M.desc) + '.', night ? `${esc(COACHES.or.name)}  goes quiet, and the music stays for ten more minutes and fades out on its own.` : 'Come back slowly, and open your eyes.'][i]}</p></div></li>`).join('')}</ol>`;
  const root = el(html`<div class="med-screen ${night ? 'night' : ''}" role="dialog" aria-modal="true" aria-label="${esc(M.name)}">
    <div class="mj-scroll">
      <div class="mj-hero" style="background-image:url(${medArt(id, false)})"><button class="icon-btn mj-back" data-mback aria-label="Back">${icon('close', 'width="20" height="20"')}</button>
        <div class="mj-title"><div class="eyebrow">${night ? 'Night meditation · lying down' : 'Morning meditation · sitting'}  · with ${esc(COACHES.or.name)}</div><div class="mj-name">${esc(M.name)}</div><div class="mj-desc">${esc(M.desc)}</div></div></div>
      <div class="mj-body">
        <p class="mj-about">${esc(M.about)}</p>
        <div class="mj-pick"><label class="field"><span>How long? (minutes)</span><div class="seg" data-mmin>${STILL_MINUTES.map((v) => `<button type="button" data-v="${v}" class="${minutes === v ? 'on' : ''}">${v}</button>`).join('')}</div></label></div>
        <div class="mj-card" data-way>${way()}</div>
        <div class="sub t-foot">${night ? 'Turn the phone volume down and put it beside the bed. The screen can go dark; the meditation continues.' : 'A quiet place, and headphones if you have them. The speech is short, with music and silence between the parts.'}</div>
      </div>
    </div>
    <div class="mj-go"><button class="btn primary block xl" data-mgo>${icon('play', 'width="22" height="22"')} Begin</button></div></div>`);
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
    set((x) => { if (!mjOf(x.profile)) { x.profile.medMin = minutes; x.profile.medPace = pace; } return x; });   // במסע בשלבים האורך והקצב נקבעים במסע — הליכה חד־פעמית לא משנה אותם
    close(); closeSheet?.(); startRun(buildMedSession(journey, { minutes, pace }), { coach: 'or' });
  });
  document.body.append(root);
}

// הגדרת המסע (25.11.2026): כשמדיטציה בתנועה נבחרת כמסלול ראשי — בוחרים דרך רוחנית, אורך מסע, ימים בשבוע, אורך הליכה, כושר הליכה ומתי הולכים,
// ורואים את ארבעת השלבים לפני שמתחילים. onStart מקבל { medJ, days, medMin } — מי שקרא שומר ובונה את התוכנית.
export function journeySetup(onStart) {
  const p = get().profile, cur = mjOf(p);
  const c = { ...MJ_DEFAULT, ...(p.medJ || {}), days: Math.min(6, Math.max(2, p.days || 3)), medMin: MED_MINUTES.includes(p.medMin) ? p.medMin : 30 };
  if (!MJ_PATHS[c.path]) c.path = MJ_DEFAULT.path;
  const names = (pool) => pool.map((j) => MED_JOURNEYS[j].name).join(' · ');
  const stages = () => { const per = c.weeks / 4;
    return `<div class="mj-top"><b>Four stages</b><span class="ms-eff">${c.weeks} weeks</span></div>
      <ol class="mj-way">${MJ_STAGES.map((st, i) => { const w = i * per, pl = mjWeekPlan(c, w, c.days, c.medMin), fast = pl.filter((x) => x.pace === 'fast').length, long = Math.max(...pl.map((x) => x.minutes));
        return `<li><span class="dot ${i === 0 ? 'stroll' : i === 3 ? 'power' : 'brisk'}"></span><div><b>${st.name}</b><small>${per === 1 ? `Week ${w + 1}` : `weeks ${w + 1}–${w + per}`} · ${esc(names(MJ_PATHS[c.path].stages[i]))}</small>
          <p>${esc(st.desc)} ${fast ? `${fast} of ${c.days} walks at a brisk pace` : 'All walks are calm'}${long > c.medMin ? `, and a long walk of ${long} minutes` : ''}.</p></div></li>`; }).join('')}</ol>`; };
  const segH = (key, opts) => `<div class="seg" data-js="${key}">${opts.map(([v, t]) => `<button type="button" data-v="${v}" class="${String(c[key]) === String(v) ? 'on' : ''}">${t}</button>`).join('')}</div>`;
  const root = el(html`<div class="med-screen" role="dialog" aria-modal="true" aria-label="My Journey">
    <div class="mj-scroll">
      <div class="mj-hero short" data-hero style="background-image:url(${medArt(MJ_PATHS[c.path].art, false)})"><button class="icon-btn mj-back" data-mback aria-label="Close">${icon('close', 'width="20" height="20"')}</button>
        <div class="mj-title"><div class="eyebrow">Moving meditation · with ${esc(COACHES.or.name)}</div><div class="mj-name">My Journey</div><div class="mj-desc">A spiritual journey in stages that also builds walking fitness</div></div></div>
      <div class="mj-body">
        <div class="field"><span>Which path?</span><div class="mjp-list">${Object.entries(MJ_PATHS).map(([k, v]) => `<button type="button" class="mjp ${c.path === k ? 'on' : ''}" data-path="${k}" style="background-image:linear-gradient(90deg, rgba(12,10,26,.25), rgba(12,10,26,.9) 55%), url(${medArt(v.art)})"><b>${v.name}</b><small>${v.desc}</small></button>`).join('')}</div></div>
        <div class="mj-pick">
          <label class="field"><span>Journey length</span>${segH('weeks', MJ_WEEKS.map((v) => [v, `${v} weeks`]))}</label>
          <label class="field"><span>How many walks a week?</span>${segH('days', [2, 3, 4, 5, 6].map((v) => [v, v]))}</label>
          <label class="field"><span>Regular walk length (minutes)</span>${segH('medMin', MED_MINUTES.map((v) => [v, v]))}</label>
          <label class="field"><span>Walking fitness today</span>${segH('level', Object.entries(MJ_LEVELS))}</label>
          <label class="field"><span>When do you walk?</span>${segH('time', Object.entries(MJ_TIMES))}</label>
        </div>
        <div class="mj-card" data-stages>${stages()}</div>
        <div class="sub t-foot">The long walk of the week gets longer gradually, and the last week of each stage is easier. This track has no nutrition menu.</div>
      </div>
    </div>
    <div class="mj-go"><button class="btn primary block xl" data-jstart>${cur ? 'Start a new journey' : 'Start the journey'}</button></div></div>`);
  const close = () => root.remove(), fresh = () => { root.querySelector('[data-stages]').innerHTML = stages(); };
  on(root, 'click', '[data-mback]', close);
  on(root, 'click', '[data-path]', (e, b) => { c.path = b.dataset.path; root.querySelectorAll('.mjp').forEach((x) => x.classList.toggle('on', x === b)); root.querySelector('[data-hero]').style.backgroundImage = `url(${medArt(MJ_PATHS[c.path].art, false)})`; fresh(); });
  on(root, 'click', '[data-js] button', (e, b) => { const k = b.closest('[data-js]').dataset.js; c[k] = k === 'time' ? b.dataset.v : Number(b.dataset.v); b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); fresh(); });
  on(root, 'click', '[data-jstart]', () => { close(); onStart({ medJ: { path: c.path, weeks: c.weeks, level: c.level, time: c.time }, days: c.days, medMin: c.medMin }); });
  document.body.append(root);
}
