// ממשק מסלול הקליסתניקס: כרטיסי הסולמות והמיומנויות במסך התוכנית, ומעבר בין מסלולים בהגדרות.
import { html, esc, on, sheet, toast, icon, ib } from '../ui/dom.js';
import { get, set, regenerateWeek, createPlan } from '../store.js';
import { EX } from '../data/exercises.js';
import { COACHES, demoPoster } from '../data/coaches.js';
import { EQUIP, MAX_ACTIVE_SKILLS } from '../data/cali.js';
import { LADDERS, STRENGTH_LADDERS, SKILL_LADDERS, rungState, ladderLock, ladderOpen, setRung, toggleSkill, newCali, caliLevel, recommendTrack, mixCaliCount } from '../engine/cali.js';
import { newMob, mobLevel, mobTested } from '../engine/mob.js';
import { mobTestSheet } from './mob-ui.js';
import { goalForTrack } from '../engine/program.js';
import { runLevelFrom3k } from '../engine/running.js';
import { infoSheet } from './workout.js';
import { say, stop, unlock } from '../coach/voice.js';

const unit = (exId) => (EX[exId].type === 'time' ? 'שנ׳' : EX[exId].unilateral ? 'לכל צד' : 'חזרות');
const targetText = (r) => `${r.lo}–${r.hi} ${unit(r.id)}`;
const dots = (st) => `<div class="rungs">${st.list.map((r, i) => `<i class="${i < st.i ? 'f' : i === st.i ? 'c' : ''}"></i>`).join('')}</div>`;
// מה חסר כדי לפתוח סולם
function lockText(lock) {
  if (lock.equip) return `דרוש ציוד: ${lock.equip.map((k) => EQUIP[k].name).join(' או ')}`;
  return `נפתח אחרי: ${lock.req.map((r) => `${EX[r.exId].name} (${LADDERS[r.lid].name})`).join(' + ')}`;
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
    <div class="h2">הסולמות שלי<span class="sub t-foot" style="margin-inline-start:auto">יעד: 3 סטים × היעד העליון ← עולים שלב</span></div>
    <div class="card tight ladders">${strength.map(row)}</div>
    <div class="h2">מיומנויות<span class="sub t-foot" style="margin-inline-start:auto">עד ${MAX_ACTIVE_SKILLS} פעילות</span></div>
    <div class="card tight ladders">${skills.map(({ lid, L, st, lock, on: active }) => (lock
    ? html`<button class="ladder locked" data-skill-info="${lid}"><div class="ld-ico">${ib(L.icon, '', 'lg')}</div><div class="grow"><b>${esc(L.name)}</b><div class="sub">${esc(lockText(lock))}</div></div></button>`
    : html`<div class="ladder ${active ? 'active' : ''}"><button class="ld-main" data-ladder="${lid}"><div class="ex-thumb"><img src="${demoPoster('maya', st.rung.id)}" alt="" loading="lazy"></div>
        <div class="grow"><div class="ld-top"><b>${esc(L.name)}</b><span class="num">${st.i + 1}/${st.n}</span></div><div class="t">${esc(EX[st.rung.id].name)}</div>${dots(st)}</div></button>
        <button class="sw ${active ? 'on' : ''}" data-skill="${lid}" aria-label="${active ? 'הפסק לתרגל' : 'התחל לתרגל'} ${esc(L.name)}" aria-pressed="${active}"><i></i></button></div>`))}</div>
    <div class="sub t-foot" style="margin-top:8px">מיומנות פעילה נכנסת לתחילת האימון, כשהגוף רענן. מיומנויות עם ידיים ישרות (לברים, פלאנש, דגל) עולות שלב רק אחרי 3 שבועות לפחות בכל שלב — גידים מסתגלים לאט מהשריר.</div>`;
}

export function bindLadders(root, rerender) {
  on(root, 'click', '[data-ladder]', (e, t) => ladderSheet(t.dataset.ladder, rerender));
  on(root, 'click', '[data-skill-info]', (e, t) => { const L = LADDERS[t.dataset.skillInfo]; toast(`${L.name}: ${lockText(ladderLock(get().profile.cali, t.dataset.skillInfo))}`, 3600); });
  on(root, 'click', '[data-skill]', (e, t) => {
    const lid = t.dataset.skill;
    let ok = true;
    set((s) => { ok = toggleSkill(s.profile.cali, lid); return regenerateWeek(s); });
    if (!ok) toast(`אפשר לתרגל עד ${MAX_ACTIVE_SKILLS} מיומנויות במקביל — כבה אחת קודם`);
    else toast((get().profile.cali.skills || []).includes(lid) ? `${LADDERS[lid].name} נכנסת לאימונים` : `${LADDERS[lid].name} יצאה מהאימונים`);
    rerender();
  });
}

function ladderSheet(lid, rerender) {
  const p = get().profile, c = p.cali, L = LADDERS[lid], st = rungState(c, lid);
  const days = Math.floor((Date.now() - new Date(c.since?.[lid] || Date.now()).getTime()) / 864e5);
  sheet(html`<div class="eyebrow">סולם · היעד: ${esc(L.goal)}</div><div class="h1" style="font-size:24px">${esc(L.name)}</div>
    ${L.about ? `<p class="sub">${esc(L.about)}</p>` : ''}
    <div class="rung-list">${st.list.map((r, i) => html`<button class="rung ${i < st.i ? 'done' : i === st.i ? 'cur' : ''}" data-info="${r.id}">
      <span class="rn num">${i < st.i ? icon('check', 'width="14" height="14"') : i + 1}</span><div class="ex-thumb"><img src="${demoPoster('maya', r.id)}" alt="" loading="lazy"></div>
      <div class="grow"><div class="t">${esc(EX[r.id].name)}</div><div class="s">יעד: ${targetText(r)}${i === st.i ? ` · ${days ? `${days} ימים בשלב` : 'השלב הנוכחי'}` : ''}</div></div></button>`)}</div>
    <div class="sub t-foot" style="margin:10px 0">עולים שלב לבד, כשכל הסטים מגיעים ליעד העליון בטכניקה נקייה${L.kind === 'skill' ? ` — פעמיים ברצף, ואחרי ${L.gateDays} ימים לפחות בשלב` : ''}. אם השלב שנקבע לא מתאים, אפשר לשנות ידנית:</div>
    <div class="grid2"><button class="btn sm" data-step="-1" ${st.prev ? '' : 'disabled'}>שלב קל יותר</button><button class="btn sm" data-step="1" ${st.next ? '' : 'disabled'}>שלב קשה יותר</button></div>
    <button class="btn block" style="margin-top:10px" data-close>סגור</button>`, {
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
const NO_GYM = ['cali', 'mob', 'run', 'hiit'];   // מסלולים בלי מאמן ורמה של חדר כושר
export function switchTrack(track, rerender) {
  const p = get().profile;
  // יוצאים מ-HIIT: זוכרים את הרמה שלו לפעם הבאה
  if (p.track === 'hiit' && track !== 'hiit') set((s) => { s.profile.hiitLevel = s.profile.level; return s; });
  if (track === 'hiit') {
    set((s) => {
      const q = s.profile;
      if (!['cali', 'mob', 'run', 'hiit'].includes(q.track)) { q.gymCoach = q.coach; q.gymLevel = q.level; }
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
  const body = () => html`<div class="eyebrow">${track === 'mix' ? 'מסלול משולב — מוסיפים קליסתניקס' : 'מעבר למסלול קליסתניקס'}</div><div class="h1" style="font-size:24px">מבדק רמה קצר</div>
    <p class="sub">${esc(COACHES.maya.name)} תקבע שלב התחלתי בכל סולם. ${track === 'mix' ? 'חלק מאימוני השבוע יישארו בחדר הכושר, וחלק יהיו קליסתניקס.' : 'ההיסטוריה שלך מחדר הכושר נשמרת, ואפשר לחזור בכל רגע.'}</p>
    <div style="font-weight:700;margin:12px 0 6px">איזה ציוד יש לך?</div>${equipChips(d.equip)}
    <div class="grid2" style="margin-top:12px">
      <label class="field"><span>שכיבות סמיכה ברצף</span><input class="input num" name="pushups" type="number" inputmode="numeric" value="${d.pushups}"></label>
      <label class="field"><span>סקוואטים ברצף</span><input class="input num" name="squats" type="number" inputmode="numeric" value="${d.squats}"></label>
      ${d.equip.includes('bar') || d.equip.includes('rings') ? `<label class="field"><span>עליות מתח ברצף</span><input class="input num" name="pullups" type="number" inputmode="numeric" value="${d.pullups}"></label>` : ''}
      ${d.equip.includes('pbars') || d.equip.includes('rings') ? `<label class="field"><span>מקבילים ברצף</span><input class="input num" name="dips" type="number" inputmode="numeric" value="${d.dips}"></label>` : ''}
      <label class="field"><span>פלאנק (שניות)</span><input class="input num" name="plankSec" type="number" inputmode="numeric" value="${d.plankSec}"></label>
    </div>
    <button class="btn primary block xl" style="margin-top:8px" data-go>${track === 'mix' ? 'בנה לי תוכנית משולבת' : 'בנה לי תוכנית קליסתניקס'}</button>
    <button class="btn ghost block" style="margin-top:8px" data-close>ביטול</button>`;
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
  unlock(); stop(); say(`hello_${p.coach}`, { priority: true });
  toast(track === 'hiit' ? `עברת למסלול HIIT עם ${COACHES.lia.name}` : track === 'run' ? `עברת למסלול ריצה עם ${COACHES[p.coach].name}` : track === 'mob' ? `עברת למסלול מוביליטי וגמישות עם ${COACHES.tamar.name}` : track === 'cali' ? `עברת למסלול קליסתניקס עם ${COACHES.maya.name}` : track === 'mix' ? `מסלול משולב: ${COACHES[p.coach].name} בחדר הכושר, ${COACHES.maya.name} בקליסתניקס` : `עברת למסלול חדר הכושר עם ${COACHES[p.coach].name}`, 3600);
  rerender();
}

// ───── המלצת המערכת (הגדרות) ─────
// אותה המלצה כמו בסוף ההיכרות: שאלה אחת על גישה לחדר כושר, והשאר מהפרופיל (מטרה, ימים, פציעות).
const TRACK_NAME = { gym: 'חדר כושר', cali: 'קליסתניקס', mix: 'משולב', mob: 'מוביליטי', run: 'ריצה', hiit: 'HIIT' };
export function recommendSheet(rerender) {
  const p = get().profile;
  const cur = p.track || 'gym';
  let access = p.gymAccess || (cur === 'cali' ? 'no' : 'yes');
  const body = () => {
    const r = recommendTrack({ gymAccess: access, goal: p.goal, days: p.days, injuries: p.injuries });
    const same = r.track === cur && (r.track !== 'mix' || r.mixCali === mixCaliCount(p));
    return html`<div class="eyebrow">המלצת המערכת</div><div class="h1" style="font-size:24px">איזה מסלול מתאים לך?</div>
      <p class="sub">לפי המטרה שלך, ${p.days} אימונים בשבוע, הפציעות שסימנת — והגישה שלך לחדר כושר:</p>
      <div style="font-weight:700;margin:0 0 6px">חדר כושר</div>
      <div class="seg" data-access>${[['yes', 'יש לי'], ['some', 'לפעמים'], ['no', 'אין לי']].map(([v, t]) => `<button data-v="${v}" class="${access === v ? 'on' : ''}">${t}</button>`).join('')}</div>
      <div class="card tight" style="margin-top:14px"><div class="eyebrow">${same ? 'זה המסלול שלך היום' : 'מומלץ'}</div>
        <div class="h2" style="margin:2px 0 6px">${TRACK_NAME[r.track]}${r.track === 'mix' ? ` · ${p.days - r.mixCali} חדר כושר + ${r.mixCali} קליסתניקס` : ''}</div>
        ${r.why.map((w) => `<div class="row" style="align-items:flex-start;padding:3px 0"><span style="color:var(--ok)">${icon('check', 'width="16" height="16"')}</span><span class="sub" style="font-size:14px">${esc(w)}</span></div>`).join('')}</div>
      <button class="btn primary block xl" style="margin-top:14px" data-apply ${same ? 'disabled' : ''}>${same ? 'כבר במסלול המומלץ' : 'עבור למסלול המומלץ'}</button>
      <button class="btn ghost block" style="margin-top:8px" data-close>${same ? 'סגור' : 'להישאר במסלול הנוכחי'}</button>`;
  };
  sheet(`<div data-tb>${body()}</div>`, {
    onMount(sh, close) {
      on(sh, 'click', '[data-access] button', (e, t) => { access = t.dataset.v; sh.querySelector('[data-tb]').innerHTML = body(); });
      on(sh, 'click', '[data-apply]', () => {
        const r = recommendTrack({ gymAccess: access, goal: p.goal, days: p.days, injuries: p.injuries });
        close();
        set((s) => { s.profile.gymAccess = access; if (r.track === 'mix') s.profile.mixCali = r.mixCali; return s; });
        if (r.track !== cur) switchTrack(r.track, rerender);
        else { set((s) => regenerateWeek(s)); toast('החלוקה עודכנה לפי ההמלצה'); rerender(); }
      });
    },
  });
}

// שינוי ציוד: השלבים נשמרים; סולמות שדורשים ציוד שאין — יוצאים מהאימונים עד שיחזור
export function setEquip(equip) {
  set((s) => { s.profile.cali.equip = [...equip]; if (s.profile.track === 'cali') s.profile.level = caliLevel(s.profile.cali); return regenerateWeek(s); });
}
export { ladderOpen };
