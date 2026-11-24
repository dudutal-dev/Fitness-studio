// ממשק מסלול הקליסתניקס: כרטיסי הסולמות והמיומנויות במסך התוכנית, ומעבר בין מסלולים בהגדרות.
import { html, esc, on, sheet, toast, icon, ib } from '../ui/dom.js';
import { get, set, regenerateWeek, createPlan } from '../store.js';
import { EX } from '../data/exercises.js';
import { COACHES, demoPoster } from '../data/coaches.js';
import { EQUIP, MAX_ACTIVE_SKILLS } from '../data/cali.js';
import { LADDERS, STRENGTH_LADDERS, SKILL_LADDERS, rungState, ladderLock, ladderOpen, setRung, toggleSkill, newCali, caliLevel, recommendTrack, mixCaliCount } from '../engine/cali.js';
import { newMob, mobLevel, mobTested } from '../engine/mob.js';
import { mobTestSheet } from './mob-ui.js';
import { journeySetup } from './med-ui.js';
import { goalForTrack } from '../engine/program.js';
import { runLevelFrom3k } from '../engine/running.js';
import { infoSheet } from './workout.js';
import { say, stop, unlock } from '../coach/voice.js';

const unit = (exId) => (EX[exId].type === 'time' ? 'sec' : EX[exId].unilateral ? 'per side' : 'reps');
const targetText = (r) => `${r.lo}–${r.hi} ${unit(r.id)}`;
const dots = (st) => `<div class="rungs">${st.list.map((r, i) => `<i class="${i < st.i ? 'f' : i === st.i ? 'c' : ''}"></i>`).join('')}</div>`;
// מה חסר כדי לפתוח סולם
function lockText(lock) {
  if (lock.equip) return `Equipment needed: ${lock.equip.map((k) => EQUIP[k].name).join(' or ')}`;
  return `Unlocks after: ${lock.req.map((r) => `${EX[r.exId].name} (${LADDERS[r.lid].name})`).join(' + ')}`;
}

// ───── מסך התוכנית ─────
export function laddersSection(p) {
  const c = p.cali;
  const strength = STRENGTH_LADDERS.map((lid) => ({ lid, L: LADDERS[lid], st: rungState(c, lid), lock: ladderLock(c, lid) }));
  const skills = SKILL_LADDERS.map((lid) => ({ lid, L: LADDERS[lid], st: rungState(c, lid), lock: ladderLock(c, lid), on: (c.skills || []).includes(lid) }));
  const row = ({ lid, L, st, lock }) => (lock ? html`<div class="ladder locked"><div class="ld-ico">${ib('ban', '', 'lg')}</div><div class="grow"><b>${esc(L.name)}</b><div class="sub">${esc(lockText(lock))}</div></div></div>`
    : html`<button class="ladder" data-ladder="${lid}"><div class="ex-thumb"><img src="${demoPoster('maya', st.rung.id)}" alt="" loading="lazy"></div>
      <div class="grow"><div class="ld-top"><b>${esc(L.name)}</b><span class="num">${st.i + 1}/${st.n}</span></div><div class="t">${esc(EX[st.rung.id].name)}</div>${dots(st)}</div></button>`);
  return html`
    <div class="h2">My ladders<span class="sub t-foot" style="margin-inline-start:auto">Target: 3 sets × the top target → move up a step</span></div>
    <div class="card tight ladders">${strength.map(row)}</div>
    <div class="h2">Skills<span class="sub t-foot" style="margin-inline-start:auto">up to ${MAX_ACTIVE_SKILLS} active</span></div>
    <div class="card tight ladders">${skills.map(({ lid, L, st, lock, on: active }) => (lock
    ? html`<button class="ladder locked" data-skill-info="${lid}"><div class="ld-ico">${ib(L.icon, '', 'lg')}</div><div class="grow"><b>${esc(L.name)}</b><div class="sub">${esc(lockText(lock))}</div></div></button>`
    : html`<div class="ladder ${active ? 'active' : ''}"><button class="ld-main" data-ladder="${lid}"><div class="ex-thumb"><img src="${demoPoster('maya', st.rung.id)}" alt="" loading="lazy"></div>
        <div class="grow"><div class="ld-top"><b>${esc(L.name)}</b><span class="num">${st.i + 1}/${st.n}</span></div><div class="t">${esc(EX[st.rung.id].name)}</div>${dots(st)}</div></button>
        <button class="sw ${active ? 'on' : ''}" data-skill="${lid}" aria-label="${active ? 'Stop practicing' : 'Start practicing'} ${esc(L.name)}" aria-pressed="${active}"><i></i></button></div>`))}</div>
    <div class="sub t-foot" style="margin-top:8px">An active skill goes at the start of the workout, while the body is fresh. Straight-arm skills (levers, planche, flag) move up a step only after at least 3 weeks at each step — tendons adapt more slowly than muscle.</div>`;
}

export function bindLadders(root, rerender) {
  on(root, 'click', '[data-ladder]', (e, t) => ladderSheet(t.dataset.ladder, rerender));
  on(root, 'click', '[data-skill-info]', (e, t) => { const L = LADDERS[t.dataset.skillInfo]; toast(`${L.name}: ${lockText(ladderLock(get().profile.cali, t.dataset.skillInfo))}`, 3600); });
  on(root, 'click', '[data-skill]', (e, t) => {
    const lid = t.dataset.skill;
    let ok = true;
    set((s) => { ok = toggleSkill(s.profile.cali, lid); return regenerateWeek(s); });
    if (!ok) toast(`You can practice up to ${MAX_ACTIVE_SKILLS} skills at once — turn one off first`);
    else toast((get().profile.cali.skills || []).includes(lid) ? `${LADDERS[lid].name} added to your workouts` : `${LADDERS[lid].name} removed from your workouts`);
    rerender();
  });
}

function ladderSheet(lid, rerender) {
  const p = get().profile, c = p.cali, L = LADDERS[lid], st = rungState(c, lid);
  const days = Math.floor((Date.now() - new Date(c.since?.[lid] || Date.now()).getTime()) / 864e5);
  sheet(html`<div class="eyebrow">Ladder · goal: ${esc(L.goal)}</div><div class="h1" style="font-size:24px">${esc(L.name)}</div>
    ${L.about ? `<p class="sub">${esc(L.about)}</p>` : ''}
    <div class="rung-list">${st.list.map((r, i) => html`<button class="rung ${i < st.i ? 'done' : i === st.i ? 'cur' : ''}" data-info="${r.id}">
      <span class="rn num">${i < st.i ? icon('check', 'width="14" height="14"') : i + 1}</span><div class="ex-thumb"><img src="${demoPoster('maya', r.id)}" alt="" loading="lazy"></div>
      <div class="grow"><div class="t">${esc(EX[r.id].name)}</div><div class="s">Target: ${targetText(r)}${i === st.i ? ` · ${days ? `${days} days at this step` : 'Current step'}` : ''}</div></div></button>`)}</div>
    <div class="sub t-foot" style="margin:10px 0">You move up a step automatically, when all sets reach the top target with clean technique${L.kind === 'skill' ? ` — twice in a row, and after at least ${L.gateDays} days at the step` : ''}. If the assigned step doesn't fit, you can change it manually:</div>
    <div class="grid2"><button class="btn sm" data-step="-1" ${st.prev ? '' : 'disabled'}>Easier step</button><button class="btn sm" data-step="1" ${st.next ? '' : 'disabled'}>Harder step</button></div>
    <button class="btn block" style="margin-top:10px" data-close>Close</button>`, {
    onMount(sh, close) {
      on(sh, 'click', '[data-info]', (e, t) => infoSheet(t.dataset.info, 'maya'));
      on(sh, 'click', '[data-step]', (e, t) => {
        const to = Number(t.dataset.step) > 0 ? st.next : st.prev;
        if (!to) return;
        set((s) => { setRung(s.profile.cali, lid, to.id); if (s.profile.track === 'cali') s.profile.level = caliLevel(s.profile.cali); return regenerateWeek(s); });
        toast(`${L.name}: ${EX[to.id].name}`);
        close(); rerender(); ladderSheet(lid, rerender);
      });
    },
  });
}

// ───── ציוד (הגדרות) ─────
export const equipChips = (equip) => `<div class="chips">${Object.entries(EQUIP).map(([id, x]) => `<button class="chip ${equip.includes(id) ? 'on' : ''}" data-equip="${id}">${x.name}</button>`).join('')}</div>`;

// ───── מעבר בין מסלולים ─────
// ההיסטוריה, השקילות והתזונה נשמרות. התוכנית נבנית מחדש, והמאמן מתחלף: מאיה בקליסתניקס, אורי/נועה בחדר הכושר,
// ובמסלול המשולב — כל אימון עם המאמן של המסלול שלו.
const NO_GYM = ['cali', 'mob', 'run', 'hiit', 'pil', 'yoga', 'tai', 'walk', 'med'];   // מסלולים בלי מאמן ורמה של חדר כושר
export function switchTrack(track, rerender, preset) {
  const p = get().profile;
  // יוצאים מ-HIIT: זוכרים את הרמה שלו לפעם הבאה
  if (p.track === 'hiit' && track !== 'hiit') set((s) => { s.profile.hiitLevel = s.profile.level; return s; });
  if (p.track === 'pil' && track !== 'pil') set((s) => { s.profile.pilLevel = s.profile.level; return s; });
  if (p.track === 'yoga' && track !== 'yoga') set((s) => { s.profile.yogaLevel = s.profile.level; return s; });
  if (p.track === 'tai' && track !== 'tai') set((s) => { s.profile.taiLevel = s.profile.level; return s; });
  if (p.track === 'walk' && track !== 'walk') set((s) => { s.profile.walkLevel = s.profile.level; return s; });
  // מדיטציה בתנועה כמסלול ראשי: בלי רמות ובלי תפריט; ההליכות לפי profile.medMin / medPace
  // מ-25.11.2026 זה מסע רוחני בשלבים: קודם מסך ההגדרה (דרך, אורך, ימים, כושר הליכה), ורק אחרי "מתחילים" עוברים מסלול והתוכנית נבנית
  if (track === 'med') {
    journeySetup((cfg) => {
      set((s) => {
        const q = s.profile;
        if (!NO_GYM.includes(q.track)) { q.gymCoach = q.coach; q.gymLevel = q.level; }
        q.track = 'med'; q.coach = 'or'; q.goal = goalForTrack(q.goal, 'med'); q.medMin = cfg.medMin; q.medPace ??= 'calm'; q.days = cfg.days; q.medJ = { ...cfg.medJ, start: new Date().toISOString() };
        if (q.extras) delete q.extras.med;
        s.plan = createPlan(q);
        return s;
      });
      after('med', rerender);
    }, preset);
    return;
  }
  if (track === 'walk') {
    set((s) => {
      const q = s.profile;
      if (!NO_GYM.includes(q.track)) { q.gymCoach = q.coach; q.gymLevel = q.level; }
      q.level = q.walkLevel || 1;
      q.track = 'walk'; q.coach = 'shira'; q.goal = goalForTrack(q.goal, 'walk'); q.walkMin ??= 30; q.days = Math.max(3, q.days || 4);
      s.plan = createPlan(q);
      return s;
    });
    after('walk', rerender);
    return;
  }
  if (track === 'tai') {
    set((s) => {
      const q = s.profile;
      if (!NO_GYM.includes(q.track)) { q.gymCoach = q.coach; q.gymLevel = q.level; }
      q.level = q.taiLevel || 1;
      q.track = 'tai'; q.coach = 'mei'; q.goal = goalForTrack(q.goal, 'tai'); q.taiMin ??= 20; q.days = Math.min(5, q.days || 3);
      s.plan = createPlan(q);
      return s;
    });
    after('tai', rerender);
    return;
  }
  if (track === 'yoga') {
    set((s) => {
      const q = s.profile;
      if (!NO_GYM.includes(q.track)) { q.gymCoach = q.coach; q.gymLevel = q.level; }
      q.level = q.yogaLevel || 1;
      q.track = 'yoga'; q.coach = 'yael'; q.goal = goalForTrack(q.goal, 'yoga'); q.yogaMin ??= 30; q.days = Math.min(5, q.days || 3);
      s.plan = createPlan(q);
      return s;
    });
    after('yoga', rerender);
    return;
  }
  if (track === 'pil') {
    set((s) => {
      const q = s.profile;
      if (!NO_GYM.includes(q.track)) { q.gymCoach = q.coach; q.gymLevel = q.level; }
      q.level = q.pilLevel || 1;
      q.track = 'pil'; q.coach = 'lia'; q.goal = goalForTrack(q.goal, 'pil'); q.pilMin ??= 30; q.days = Math.min(5, q.days || 3);
      s.plan = createPlan(q);
      return s;
    });
    after('pil', rerender);
    return;
  }
  if (track === 'hiit') {
    set((s) => {
      const q = s.profile;
      if (!NO_GYM.includes(q.track)) { q.gymCoach = q.coach; q.gymLevel = q.level; }
      q.level = q.hiitLevel || Math.min(3, q.gymLevel || q.level || 2);
      q.track = 'hiit'; q.coach = 'lia'; q.goal = goalForTrack(q.goal, 'hiit'); q.hiitMin ??= 20;
      s.plan = createPlan(q);
      return s;
    });
    after('hiit', rerender);
    return;
  }
  if (track === 'run') {
    set((s) => {
      const q = s.profile;
      if (!NO_GYM.includes(q.track)) { q.gymCoach = q.coach; q.gymLevel = q.level; }
      q.runBase ??= q.run3k ? 30 : 15;
      q.track = 'run'; q.coach = q.runCoach || 'guy'; q.goal = goalForTrack(q.goal, 'run'); q.level = q.runLevel || runLevelFrom3k(q.run3k);
      s.plan = createPlan(q);
      return s;
    });
    after('run', rerender);
    return;
  }
  if (track === 'mob') {
    set((s) => {
      const q = s.profile;
      if (!NO_GYM.includes(q.track)) { q.gymCoach = q.coach; q.gymLevel = q.level; }
      q.mob ||= newMob(); q.mobN = 0;
      q.track = 'mob'; q.coach = 'tamar'; q.goal = goalForTrack(q.goal, 'mob'); q.level = mobLevel(q.mob);
      s.plan = createPlan(q);
      return s;
    });
    after('mob', rerender);
    if (!mobTested(get().profile.mob)) mobTestSheet(rerender);
    return;
  }
  if (track === 'gym') {
    set((s) => {
      const q = s.profile;
      if (NO_GYM.includes(q.track)) q.level = q.gymLevel || (q.track === 'cali' ? q.level : 2) || 2;
      q.track = 'gym'; q.coach = q.gymCoach || 'ori'; q.goal = goalForTrack(q.goal, 'gym');
      s.plan = createPlan(q);
      return s;
    });
    after('gym', rerender);
    return;
  }
  // כבר עבר מבחן קליסתניקס בעבר → חוזרים לאותם שלבים
  if (p.cali) { toCali(track, p.cali, rerender); return; }
  const d = { equip: [], pushups: 15, squats: 20, pullups: 0, dips: 0, plankSec: 45 };
  const body = () => html`<div class="eyebrow">${track === 'mix' ? 'Combined track — adding calisthenics' : 'Switching to the calisthenics track'}</div><div class="h1" style="font-size:24px">Short level test</div>
    <p class="sub">${esc(COACHES.maya.name)} will set a starting step on each ladder. ${track === 'mix' ? 'Some of the week\'s workouts will stay in the gym, and some will be calisthenics.' : 'Your gym history is kept, and you can switch back at any time.'}</p>
    <div style="font-weight:700;margin:12px 0 6px">What equipment do you have?</div>${equipChips(d.equip)}
    <div class="grid2" style="margin-top:12px">
      <label class="field"><span>Push-ups in a row</span><input class="input num" name="pushups" type="number" inputmode="numeric" value="${d.pushups}"></label>
      <label class="field"><span>Squats in a row</span><input class="input num" name="squats" type="number" inputmode="numeric" value="${d.squats}"></label>
      ${d.equip.includes('bar') || d.equip.includes('rings') ? `<label class="field"><span>Pull-ups in a row</span><input class="input num" name="pullups" type="number" inputmode="numeric" value="${d.pullups}"></label>` : ''}
      ${d.equip.includes('pbars') || d.equip.includes('rings') ? `<label class="field"><span>Dips in a row</span><input class="input num" name="dips" type="number" inputmode="numeric" value="${d.dips}"></label>` : ''}
      <label class="field"><span>Plank (seconds)</span><input class="input num" name="plankSec" type="number" inputmode="numeric" value="${d.plankSec}"></label>
    </div>
    <button class="btn primary block xl" style="margin-top:8px" data-go>${track === 'mix' ? 'Build me a combined program' : 'Build me a calisthenics program'}</button>
    <button class="btn ghost block" style="margin-top:8px" data-close>Cancel</button>`;
  sheet(`<div data-tb>${body()}</div>`, {
    onMount(sh, close) {
      const read = () => sh.querySelectorAll('input[name]').forEach((i) => { d[i.name] = Math.max(0, Number(i.value) || 0); });
      on(sh, 'click', '[data-equip]', (e, t) => {
        read();
        const i = d.equip.indexOf(t.dataset.equip); i >= 0 ? d.equip.splice(i, 1) : d.equip.push(t.dataset.equip);
        sh.querySelector('[data-tb]').innerHTML = body();
      });
      on(sh, 'click', '[data-go]', () => {
        read();
        const hM = (p.heightCm || 175) / 100;
        const bar = d.equip.includes('bar') || d.equip.includes('rings'), pb = d.equip.includes('pbars') || d.equip.includes('rings');
        close();
        toCali(track, newCali({ pushups: d.pushups, squats: d.squats, pullups: bar ? d.pullups : 0, dips: pb ? d.dips : 0, plankSec: d.plankSec, bmi: (p.weightKg || 70) / (hM * hM) }, d.equip), rerender);
      });
    },
  });
}

// track: 'cali' (קליסתניקס בלבד) או 'mix' (משולב)
function toCali(track, cali, rerender) {
  set((s) => {
    const q = s.profile;
    // יוצאים ממצב שיש בו חדר כושר → זוכרים את המאמן והרמה שלו
    if (!NO_GYM.includes(q.track)) { q.gymCoach = q.coach; q.gymLevel = q.level; }
    q.cali = cali;
    if (track === 'mix') {
      if (NO_GYM.includes(q.track)) q.level = q.gymLevel || (q.track === 'cali' ? q.level : 2) || 2;
      q.track = 'mix'; q.coach = q.gymCoach || 'ori'; q.goal = goalForTrack(q.goal, 'gym');
    } else { q.track = 'cali'; q.coach = 'maya'; q.goal = goalForTrack(q.goal, 'cali'); q.level = caliLevel(cali); }
    s.plan = createPlan(q);
    return s;
  });
  after(track, rerender);
}

function after(track, rerender) {
  const p = get().profile;
  unlock(); stop(); say(track === 'med' ? 'med_j_begin' : track === 'pil' ? 'pil_hello' : track === 'walk' ? 'walk_hello' : `hello_${p.coach}`, { priority: true });
  toast(track === 'med' ? `You switched to the Moving meditation track with  ${COACHES.or.name}. This track has no nutrition menu.` : track === 'walk' ? `Switched to the walking track with ${COACHES.shira.name}` : track === 'tai' ? `You've switched to the tai chi track with ${COACHES.mei.name}` : track === 'yoga' ? `You've switched to the yoga track with ${COACHES.yael.name}` : track === 'pil' ? `You've switched to the Pilates track with ${COACHES.lia.name}` : track === 'hiit' ? `You've switched to the HIIT track with ${COACHES.lia.name}` : track === 'run' ? `You've switched to the running track with ${COACHES[p.coach].name}` : track === 'mob' ? `You've switched to the mobility & flexibility track with ${COACHES.tamar.name}` : track === 'cali' ? `You've switched to the calisthenics track with ${COACHES.maya.name}` : track === 'mix' ? `Combined track: ${COACHES[p.coach].name} in the gym, ${COACHES.maya.name} for calisthenics` : `You've switched to the gym track with ${COACHES[p.coach].name}`, 3600);
  rerender();
}

// ───── המלצת המערכת (הגדרות) ─────
// אותה המלצה כמו בסוף ההיכרות: שאלה אחת על גישה לחדר כושר, והשאר מהפרופיל (מטרה, ימים, פציעות).
const TRACK_NAME = { gym: 'Gym', cali: 'Calisthenics', mix: 'Combined', mob: 'Mobility', run: 'Running', hiit: 'HIIT', pil: 'Pilates', yoga: 'Yoga', tai: 'Tai chi', walk: 'Walking', med: 'Moving meditation' };
export function recommendSheet(rerender) {
  const p = get().profile;
  const cur = p.track || 'gym';
  let access = p.gymAccess || (cur === 'cali' ? 'no' : 'yes');
  const body = () => {
    const r = recommendTrack({ gymAccess: access, goal: p.goal, days: p.days, injuries: p.injuries });
    const same = r.track === cur && (r.track !== 'mix' || r.mixCali === mixCaliCount(p));
    return html`<div class="eyebrow">System recommendation</div><div class="h1" style="font-size:24px">Which track suits you?</div>
      <p class="sub">Based on your goal, ${p.days} workouts a week, the injuries you marked — and your gym access:</p>
      <div style="font-weight:700;margin:0 0 6px">Gym</div>
      <div class="seg" data-access>${[['yes', 'I have one'], ['some', 'Sometimes'], ['no', 'I don\'t']].map(([v, t]) => `<button data-v="${v}" class="${access === v ? 'on' : ''}">${t}</button>`).join('')}</div>
      <div class="card tight" style="margin-top:14px"><div class="eyebrow">${same ? 'This is your track today' : 'Recommended'}</div>
        <div class="h2" style="margin:2px 0 6px">${TRACK_NAME[r.track]}${r.track === 'mix' ? ` · ${p.days - r.mixCali} gym + ${r.mixCali} Calisthenics` : ''}</div>
        ${r.why.map((w) => `<div class="row" style="align-items:flex-start;padding:3px 0"><span style="color:var(--ok)">${icon('check', 'width="16" height="16"')}</span><span class="sub" style="font-size:14px">${esc(w)}</span></div>`).join('')}</div>
      <button class="btn primary block xl" style="margin-top:14px" data-apply ${same ? 'disabled' : ''}>${same ? 'Already on the recommended track' : 'Switch to the recommended track'}</button>
      <button class="btn ghost block" style="margin-top:8px" data-close>${same ? 'Close' : 'Stay on the current track'}</button>`;
  };
  sheet(`<div data-tb>${body()}</div>`, {
    onMount(sh, close) {
      on(sh, 'click', '[data-access] button', (e, t) => { access = t.dataset.v; sh.querySelector('[data-tb]').innerHTML = body(); });
      on(sh, 'click', '[data-apply]', () => {
        const r = recommendTrack({ gymAccess: access, goal: p.goal, days: p.days, injuries: p.injuries });
        close();
        set((s) => { s.profile.gymAccess = access; if (r.track === 'mix') s.profile.mixCali = r.mixCali; return s; });
        if (r.track !== cur) switchTrack(r.track, rerender);
        else { set((s) => regenerateWeek(s)); toast('The split was updated to match the recommendation'); rerender(); }
      });
    },
  });
}

// שינוי ציוד: השלבים נשמרים; סולמות שדורשים ציוד שאין — יוצאים מהאימונים עד שיחזור
export function setEquip(equip) {
  set((s) => { s.profile.cali.equip = [...equip]; if (s.profile.track === 'cali') s.profile.level = caliLevel(s.profile.cali); return regenerateWeek(s); });
}
export { ladderOpen };
