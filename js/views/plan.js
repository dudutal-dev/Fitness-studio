// מסך התוכנית: מחזוריות בלוקים, אימוני השבוע עם משקלים מומלצים, ספריית תרגילים.
import { html, esc, on, sheet, toast, emi, icon } from '../ui/dom.js';
import { get, set, regenerateWeek } from '../store.js';
import { EX, EXERCISES, GROUPS } from '../data/exercises.js';
import { demoPoster } from '../data/coaches.js';
import { PHASES, WEEK_IN_BLOCK, GOALS, LEVEL_NAMES, phaseFor } from '../engine/program.js';
import { suggest } from '../engine/progression.js';
import { fmtTime } from '../ui/dom.js';
import { fmtPace } from '../engine/running.js';
import { startWorkout, infoSheet } from './workout.js';
import { startRun } from './run.js';
import { begin, estMinutes } from './home.js';
import { calendarCardHtml, bindCalendar } from './calendar-ui.js';
import { warmupFor, cooldownFor, blockedSet } from '../engine/program.js';
import { isCali, isMix, hasCali, sessionCoach, exCoach, mixCaliCount } from '../engine/cali.js';
import { laddersSection, bindLadders } from './cali-ui.js';
import { EQUIP } from '../data/cali.js';
import { isMob, hasMob, mobCount, mobScore, mobTested, weakRegions, REGIONS } from '../engine/mob.js';
import { mobTestSheet, quickMobSheet } from './mob-ui.js';
import { isRun, rwWeeksLeft } from '../engine/running.js';
import { isHiit, HIIT_FORMAT, lowImpact } from '../engine/hiit.js';
import { isPil, PIL_LEVELS, pilLevel } from '../engine/pil.js';
import { isYoga, YOGA_LEVELS, yogaLevel } from '../engine/yoga.js';
import { isTai, TAI_LEVELS, taiLevel } from '../engine/tai.js';
import { isWalk, isMed, WALK_LEVELS, walkLevel } from '../engine/walking.js';
import { MJ_STAGES } from '../engine/med-journey.js';
import { mjStillsHtml, bindMjStills } from './med-ui.js';

let libFilter = 'all';
let libAll = false;

export function renderPlan(root) {
  const s = get();
  const p = s.profile;
  const plan = s.plan;
  const doneDays = new Set(plan.completedDays);
  const mj = plan.week.mj || null;   // מסע מדיטטיבי בשלבים
  const blocks = [0, 1, 2].map((b) => phaseFor(p, Math.floor(plan.blockIndex / 3) * 3 + b));
  const curInCycle = plan.blockIndex % 3;
  const cali = isCali(p), mob = isMob(p), run = isRun(p), hiit = isHiit(p), pil = isPil(p), yoga = isYoga(p), tai = isTai(p), med = isMed(p), walk = isWalk(p), single = cali || mob || run || hiit || pil || yoga || tai || walk; // מסלול בלי בלוקים מתחלפים: בלוק אחד של 4 שבועות
  const mix = isMix(p), withCali = hasCali(p), withMob = hasMob(p), mobN = mobCount(p);
  const tracks = [...(run || walk ? [] : tai ? ['tai'] : yoga ? ['yoga'] : pil ? ['pil'] : hiit ? ['hiit'] : mob ? ['mob'] : mix ? ['gym', 'cali'] : [cali ? 'cali' : 'gym']), ...(mobN ? ['mob'] : [])];
  const inTracks = (e) => e.tracks.some((t) => tracks.includes(t));
  const libList = EXERCISES.filter((e) => inTracks(e) && (libFilter === 'all' || e.group === libFilter));

  root.innerHTML = html`
    <div class="page-head"><div class="h1">${icon(GOALS[p.goal].icon)} ${GOALS[p.goal].name}</div>
    <div class="sub">${med && plan.week.mj ? `מדיטציה בתנועה · מסע של ${plan.week.mj.weeks} שבועות · שלב ${plan.week.mj.stage + 1} מתוך 4` : med ? `מדיטציה בתנועה · ${p.medMin || 30} דקות · ${p.medPace === 'fast' ? 'הליכה מהירה' : 'הליכה רגועה'}` : walk ? `הליכה · ${WALK_LEVELS[walkLevel(p)]}` : tai ? `טאי צ'י · ${TAI_LEVELS[taiLevel(p)]}` : yoga ? `יוגה · ${YOGA_LEVELS[yogaLevel(p)]}` : pil ? `פילאטיס מזרן · רמת ${PIL_LEVELS[pilLevel(p)]}` : hiit ? `HIIT · רמה ${p.level} · ${HIIT_FORMAT[p.level][0]} שנ׳ עבודה / ${HIIT_FORMAT[p.level][1]} מנוחה${lowImpact(p) ? ' · בלי קפיצות' : ''}` : run ? `ריצה${rwWeeksLeft(p, plan.blockIndex * 4 + plan.weekInBlock) ? ' · ריצה־הליכה' : ` · רמה ${p.runLevel || 2}`}` : mob ? `מוביליטי וגמישות${mobTested(p.mob) ? ` · ציון טווחים ${mobScore(p.mob)}` : ''}` : cali ? `קליסתניקס · ${p.cali.equip.length ? p.cali.equip.map((k) => EQUIP[k].name).join(' + ') : 'בלי ציוד'}` : mix ? `משולב: ${p.days - mobN - mixCaliCount(p)} חדר כושר + ${mixCaliCount(p)} קליסתניקס · רמה ${p.level}` : `רמה ${p.level} · ${LEVEL_NAMES[p.level]}`}${mobN ? ` · כולל ${mobN === 1 ? 'אימון מוביליטי אחד' : `${mobN} אימוני מוביליטי`}` : ''} · ${p.days} אימונים בשבוע ${run ? '' : ` · ${mob ? `${p.mob.minutes || 20}` : hiit ? p.hiitMin || 20 : pil ? p.pilMin || 30 : yoga ? p.yogaMin || 30 : tai ? p.taiMin || 20 : walk ? p.walkMin || 30 : p.sessionMin} דק׳`}</div></div>

    <div class="card cycle" style="margin-top:4px">
      <div class="row between"><b>${esc(plan.week.phase.name)}${mj ? (mj.light ? ' · שבוע קל' : '') : ` · ${esc(plan.week.week.name)}`}</b><span class="sub t-cap num">${mj ? (mj.done ? 'המסע הושלם' : `שבוע ${mj.week + 1} / ${mj.weeks}`) : single ? `שבוע ${plan.weekInBlock + 1} / 4` : `שבוע ${curInCycle * 4 + plan.weekInBlock + 1} / 12`}</span></div>
      <div class="cycle-bar ${mj ? 'mj4' : ''}">${mj ? MJ_STAGES.map((st, si) => `<div class="cb ${si === mj.stage ? 'on' : ''}"><div class="dots">${Array.from({ length: mj.per }, (_, w) => `<i class="${mj.done || si < mj.stage || (si === mj.stage && w < mj.inStage) ? 'f' : si === mj.stage && w === mj.inStage ? 'c' : ''}"></i>`).join('')}</div><span>${st.name}</span></div>`).join('') : (single ? [blocks[0]] : blocks).map((ph, bi) => html`<div class="cb ${bi === curInCycle ? 'on' : ''}"><div class="dots">${[0, 1, 2, 3].map((w) => `<i class="${single ? (w < plan.weekInBlock ? 'f' : w === plan.weekInBlock ? 'c' : '') : bi < curInCycle || (bi === curInCycle && w < plan.weekInBlock) ? 'f' : bi === curInCycle && w === plan.weekInBlock ? 'c' : ''}"></i>`)}</div><span>${single ? 'בלוק של 4 שבועות' : esc(ph.name)}</span></div>`)}</div>
      <div class="sub t-foot">${esc(plan.week.phase.desc)} ${med ? 'העיניים פקוחות, והמבט על הדרך.' : walk ? 'קצב טוב הוא קצב שאפשר לדבר בו, אבל לא לשיר.' : tai ? 'ברך מעל כף הרגל, כיפוף קל בלבד. אם משהו כואב — מזדקפים ונחים.' : yoga ? 'מחזיקים כל תנוחה כמה נשימות. אם הנשימה נעצרת — יוצאים מעט מהתנוחה.' : pil ? 'כל תרגיל כדקה, בתנועה איטית. אם הצוואר מתאמץ — מניחים את הראש.' : hiit ? (plan.weekInBlock === 3 ? 'השבוע: התאוששות — סבב אחד פחות בכל אימון.' : 'בזמן העבודה — כמעט כל מה שיש. במנוחה — נושמים.') : run ? (plan.weekInBlock === 3 ? 'השבוע: התאוששות, ומבדק 3 ק״מ לעדכון הקצבים.' : 'בריצות הקלות — קצב שאפשר לדבר בו.') : mob ? (plan.weekInBlock === 3 ? 'השבוע: מבחן טווחים חוזר, כדי לראות מה השתפר.' : 'מתיחה נעימה בלבד — בלי כאב ובלי קפיצות.') : plan.weekInBlock === 3 ? `השבוע: פריקה — פחות נפח, גוף מתאושש וחוזר חזק יותר.${cali ? '' : ' + מבדק 3 ק״מ.'}` : cali ? 'עוצרים חזרה או שתיים לפני כישלון.' : `מאמץ יעד: RPE ${plan.week.week.rpe}.`}</div>
    </div>

    ${mjStillsHtml(s)}
    ${calendarCardHtml()}

    <div class="h2">השבוע<span class="more" data-act="regen">בנה מחדש</span></div>
    ${plan.week.sessions.map((x) => html`<details class="card day ${doneDays.has(x.day) ? 'done' : ''}">
      <summary><div class="dn">${doneDays.has(x.day) ? icon('check') : x.day}</div><div><b>${esc(x.name)}</b><div class="sub" style="font-size:13px">${esc(x.focus)} · ~${estMinutes(x)} דק׳ ${x.run && !x.runOnly ? `· ${emi(x.run.icon)} ${esc(x.run.name)}` : ''}</div></div></summary>
      <div class="content">
        ${x.items.map((it) => { const e = EX[it.exId]; const sg = suggest(it.exId, it, s.history[it.exId], p); return html`
          <div class="ex-row" data-info="${it.exId}" data-coach="${sessionCoach(p, x)}"><div class="ex-thumb"><img src="${demoPoster(sessionCoach(p, x), it.exId)}" alt="" loading="lazy"></div>
            <div><div class="t">${esc(e.name)}</div><div class="s">${it.role === 'hiit' ? `${it.sets} סבבים × ${it.reps[0]} שנ׳ · מנוחה ${it.rest} שנ׳` : it.role === 'mob' ? `${it.sets > 1 ? `${it.sets} × ` : ''}${e.unilateral ? `${Math.round(it.reps[0] / 2)} שנ׳ לכל צד` : `${it.reps[0]} שנ׳`} · ${e.kind === 'static' ? 'החזקה' : 'תנועה'}` : `${it.sets} × ${it.reps[0]}–${it.reps[1]}${it.unit === 'sec' ? ' שנ׳' : ''} · מנוחה ${fmtTime(it.rest)}`}</div></div>
            <div class="w">${it.label ? `<small>${it.label}</small>` : it.role === 'hiit' ? `<small>${{ legs: 'רגליים', cardio: 'דופק', core: 'ליבה', upper: 'פלג עליון' }[it.cat] || ''}</small>` : it.role === 'mob' ? `<small>${REGIONS[it.region] || ''}</small>` : sg.w ? `${sg.w}<small>ק״ג</small>` : `<small>${it.role === 'skill' ? 'מיומנות' : it.vol ? 'נפח' : 'משקל גוף'}</small>`}</div></div>`; })}
        ${s.settings.warmup !== false && x.track !== 'mob' && !x.runOnly ? `<div class="mob-line"><span><b>חימום:</b> ${(x.warmup || warmupFor(x.items, blockedSet(p))).map((m) => EX[m.exId].name).join(' · ')}</span><span><b>מתיחות:</b> ${(x.cooldown || cooldownFor(x.items)).map((m) => EX[m.exId].name).join(' · ')}</span></div>` : ''}
        ${x.finisher ? `<div class="card tight" style="margin-top:10px"><b>${esc(x.finisher.name)}</b><div class="sub">${x.finisher.rounds} סבבים: ${x.finisher.items.map(([id, n]) => `${EX[id].name} ${n}${['time', 'cardio'].includes(EX[id].type) ? ' שנ׳' : ''}`).join(' + ')}</div></div>` : ''}
        ${x.run ? html`<div class="card tight" style="margin-top:10px"><div class="row"><b>${emi(x.run.icon)} ${esc(x.run.name)}</b><span class="spacer"></span><span class="tag teal">${x.run.type === 'test' ? 'מבדק' : `${Math.round(x.run.totalSec / 60)} דק׳`}</span></div>
          <div class="sub">${x.run.segs.filter((g) => !['warm', 'cool'].includes(g.kind)).slice(0, 1).map((g) => esc(g.label))} ${x.run.type === 'intervals' ? `· קצב ספרינט ${fmtPace(x.run.pace.fast)}/ק״מ` : x.run.type === 'tempo' ? `· קצב ${fmtPace(x.run.pace.tempo)}/ק״מ` : x.run.type === 'easy' ? `· קצב ${fmtPace(x.run.pace.easy)}/ק״מ` : ''}</div>
          <button class="btn sm teal" style="margin-top:8px" data-run="${x.day}">${x.run.walk ? 'התחל הליכה' : 'התחל ריצה'}</button></div>` : ''}
        ${x.runOnly ? `<div class="sub t-foot" style="margin-top:8px">${x.run.segs.map((g) => `${esc(g.label)}${g.sec ? ` (${fmtTime(g.sec)})` : ''}`).slice(0, 7).join(' ← ')}${x.run.segs.length > 7 ? ' …' : ''}</div>` : `<button class="btn primary block" style="margin-top:12px" data-start="${x.day}">${doneDays.has(x.day) ? 'בצע שוב' : 'התחל אימון'}</button>`}
      </div></details>`)}

    ${withMob ? html`<div class="h2">מוביליטי וגמישות</div>
    <div class="card"><div class="row between"><b>${mobTested(p.mob) ? `ציון טווחים: ${mobScore(p.mob)} מתוך 100` : 'מבחן הטווחים עוד לא נעשה'}</b><button class="btn sm teal" data-act="mob-test">${icon('target', 'width="16" height="16"')} ${mobTested(p.mob) ? 'מבחן חוזר' : 'למבחן'}</button></div>
      <div class="sub t-foot" style="margin-top:6px">${mobTested(p.mob) ? `האזורים שמקבלים הכי הרבה זמן: <b>${weakRegions(p.mob).map((r) => REGIONS[r]).join(' · ')}</b>.` : 'שישה מבחנים ביתיים קצרים. עד אז האימונים מאוזנים בין כל האזורים.'} לפני כל אימון בוחרים כמה זמן יש: 10, 20 או 30 דקות.</div>
      <button class="btn sm block" style="margin-top:10px" data-act="quick-mob">${icon('sparkle', 'width="16" height="16"')} אימון חופשי לפי אזור</button></div>` : ''}
    ${withCali ? laddersSection(p) : ''}${single ? '' : html`<div class="h2">רמת קושי${mix ? ' · חדר כושר' : ''}</div>
    <div class="card"><b>רמה ${p.level} — ${LEVEL_NAMES[p.level]}</b><div class="sub t-foot">הרמה מתעדכנת אוטומטית בסוף כל בלוק לפי עקביות, התקדמות ומאמץ.</div>
      <div class="lvl-dots">${[1, 2, 3, 4, 5].map((l) => `<i class="${l <= p.level ? 'on' : ''}"></i>`).join('')}</div>
      <div class="grid2"><button class="btn sm" data-lvl="-1" ${p.level <= 1 ? 'disabled' : ''}>קל יותר</button><button class="btn sm" data-lvl="1" ${p.level >= 5 ? 'disabled' : ''}>קשה יותר</button></div></div>`}

    ${run && !mobN ? '' : html`<div class="h2">ספריית תרגילים<span class="sub t-foot" style="margin-inline-start:auto">${libList.length} תרגילים</span></div>
    <div class="chips scroll" style="margin-bottom:12px">${[['all', 'הכל'], ...Object.entries(GROUPS).filter(([k]) => EXERCISES.some((e) => e.group === k && inTracks(e)))].map(([k, v]) => `<button class="chip ${libFilter === k ? 'on' : ''}" data-filter="${k}">${v}</button>`)}</div>
    <div class="lib">${libList.slice(0, libAll ? 999 : 6).map((e) => html`
      <button class="lib-card" data-info="${e.id}" data-coach="${exCoach(p, e.id)}"><img src="${demoPoster(exCoach(p, e.id), e.id)}" alt="" loading="lazy"><div class="cap"><small>${GROUPS[e.group]}</small>${esc(e.name)}</div></button>`)}</div>
    ${libList.length > 6 ? `<button class="btn block mt-3" data-act="lib-all">${libAll ? 'הצג פחות' : `הצג את כל ${libList.length} התרגילים`}</button>` : ''}`}
  `;

  bindMjStills(root);
  on(root, 'click', '[data-info]', (e, t) => infoSheet(t.dataset.info, t.dataset.coach || p.coach));
  if (withCali) bindLadders(root, () => renderPlan(root));
  on(root, 'click', '[data-filter]', (e, t) => { libFilter = t.dataset.filter; libAll = false; renderPlan(root); });
  on(root, 'click', '[data-act="lib-all"]', () => { libAll = !libAll; renderPlan(root); });
  on(root, 'click', '[data-start]', (e, t) => { const ses = plan.week.sessions.find((x) => x.day === Number(t.dataset.start)); begin(ses); });
  on(root, 'click', '[data-run]', (e, t) => { const ses = plan.week.sessions.find((x) => x.day === Number(t.dataset.run)); startRun(ses.run, { day: ses.day, ...(ses.extra ? { coach: ses.coach, extra: true } : {}) }); });
  on(root, 'click', '[data-act="mob-test"]', () => mobTestSheet(() => renderPlan(root)));
  on(root, 'click', '[data-act="quick-mob"]', () => quickMobSheet((w) => startWorkout(w)));
  bindCalendar(root, () => renderPlan(root));
  on(root, 'click', '[data-act="regen"]', () => { set((s2) => regenerateWeek(s2)); toast('השבוע נבנה מחדש'); renderPlan(root); });
  on(root, 'click', '[data-lvl]', (e, t) => {
    set((s2) => { s2.profile.level = Math.min(5, Math.max(1, s2.profile.level + Number(t.dataset.lvl))); return regenerateWeek(s2); });
    toast(`רמה ${get().profile.level} — התוכנית עודכנה`);
    renderPlan(root);
  });
}
