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

let libFilter = 'all';
let libAll = false;

export function renderPlan(root) {
  const s = get();
  const p = s.profile;
  const plan = s.plan;
  const doneDays = new Set(plan.completedDays);
  const blocks = [0, 1, 2].map((b) => phaseFor(p, Math.floor(plan.blockIndex / 3) * 3 + b));
  const curInCycle = plan.blockIndex % 3;
  const cali = isCali(p), mob = isMob(p), run = isRun(p), hiit = isHiit(p), pil = isPil(p), yoga = isYoga(p), tai = isTai(p), med = isMed(p), walk = isWalk(p), single = cali || mob || run || hiit || pil || yoga || tai || walk; // מסלול בלי בלוקים מתחלפים: בלוק אחד של 4 שבועות
  const mix = isMix(p), withCali = hasCali(p), withMob = hasMob(p), mobN = mobCount(p);
  const tracks = [...(run || walk ? [] : tai ? ['tai'] : yoga ? ['yoga'] : pil ? ['pil'] : hiit ? ['hiit'] : mob ? ['mob'] : mix ? ['gym', 'cali'] : [cali ? 'cali' : 'gym']), ...(mobN ? ['mob'] : [])];
  const inTracks = (e) => e.tracks.some((t) => tracks.includes(t));
  const libList = EXERCISES.filter((e) => inTracks(e) && (libFilter === 'all' || e.group === libFilter));

  root.innerHTML = html`
    <div class="page-head"><div class="h1">${icon(GOALS[p.goal].icon)} ${GOALS[p.goal].name}</div>
    <div class="sub">${med ? `Moving meditation ·  ${p.medMin || 30}  minutes ·  ${p.medPace === 'fast' ? 'brisk walk' : 'calm walk'}` : walk ? `Walking · ${WALK_LEVELS[walkLevel(p)]}` : tai ? `Tai chi · ${TAI_LEVELS[taiLevel(p)]}` : yoga ? `Yoga · ${YOGA_LEVELS[yogaLevel(p)]}` : pil ? `Mat Pilates · ${PIL_LEVELS[pilLevel(p)]}` : hiit ? `HIIT · level ${p.level} · ${HIIT_FORMAT[p.level][0]} sec work / ${HIIT_FORMAT[p.level][1]} rest${lowImpact(p) ? ' · no jumping' : ''}` : run ? `Running${rwWeeksLeft(p, plan.blockIndex * 4 + plan.weekInBlock) ? ' · run-walk' : ` · level ${p.runLevel || 2}`}` : mob ? `Mobility & flexibility${mobTested(p.mob) ? ` · range-of-motion score ${mobScore(p.mob)}` : ''}` : cali ? `Calisthenics · ${p.cali.equip.length ? p.cali.equip.map((k) => EQUIP[k].name).join(' + ') : 'no equipment'}` : mix ? `Combined: ${p.days - mobN - mixCaliCount(p)} gym + ${mixCaliCount(p)} calisthenics · level ${p.level}` : `Level ${p.level} · ${LEVEL_NAMES[p.level]}`}${mobN ? ` · including ${mobN === 1 ? '1 mobility workout' : `${mobN} mobility workouts`}` : ''} · ${p.days} workouts a week ${run ? '' : ` · ${mob ? `${p.mob.minutes || 20}` : hiit ? p.hiitMin || 20 : pil ? p.pilMin || 30 : yoga ? p.yogaMin || 30 : tai ? p.taiMin || 20 : walk ? p.walkMin || 30 : p.sessionMin} min`}</div></div>

    <div class="card cycle" style="margin-top:4px">
      <div class="row between"><b>${esc(plan.week.phase.name)} · ${esc(plan.week.week.name)}</b><span class="sub t-cap num">${single ? `Week ${plan.weekInBlock + 1} / 4` : `Week ${curInCycle * 4 + plan.weekInBlock + 1} / 12`}</span></div>
      <div class="cycle-bar">${(single ? [blocks[0]] : blocks).map((ph, bi) => html`<div class="cb ${bi === curInCycle ? 'on' : ''}"><div class="dots">${[0, 1, 2, 3].map((w) => `<i class="${single ? (w < plan.weekInBlock ? 'f' : w === plan.weekInBlock ? 'c' : '') : bi < curInCycle || (bi === curInCycle && w < plan.weekInBlock) ? 'f' : bi === curInCycle && w === plan.weekInBlock ? 'c' : ''}"></i>`)}</div><span>${single ? '4-week block' : esc(ph.name)}</span></div>`)}</div>
      <div class="sub t-foot">${esc(plan.week.phase.desc)} ${med ? 'Eyes open, gaze on the path.' : walk ? 'A good pace is one where you can talk, but not sing.' : tai ? 'Knee over the foot, only a slight bend. If something hurts — stand up straight and rest.' : yoga ? 'Hold each pose for a few breaths. If your breath stops — ease out of the pose a little.' : pil ? 'About a minute per exercise, moving slowly. If your neck strains — rest your head down.' : hiit ? (plan.weekInBlock === 3 ? 'This week: recovery — one round fewer in every workout.' : 'During work — nearly everything you\'ve got. During rest — breathe.') : run ? (plan.weekInBlock === 3 ? 'This week: recovery, and a 3 km test to update your paces.' : 'On easy runs — a pace you can talk at.') : mob ? (plan.weekInBlock === 3 ? 'This week: a range-of-motion retest, to see what has improved.' : 'A comfortable stretch only — no pain and no bouncing.') : plan.weekInBlock === 3 ? `This week: deload — less volume, the body recovers and comes back stronger.${cali ? '' : ' + 3 km test.'}` : cali ? 'Stop a rep or two before failure.' : `Target effort: RPE ${plan.week.week.rpe}.`}</div>
    </div>

    ${calendarCardHtml()}

    <div class="h2">This week<span class="more" data-act="regen">Rebuild</span></div>
    ${plan.week.sessions.map((x) => html`<details class="card day ${doneDays.has(x.day) ? 'done' : ''}">
      <summary><div class="dn">${doneDays.has(x.day) ? icon('check') : x.day}</div><div><b>${esc(x.name)}</b><div class="sub" style="font-size:13px">${esc(x.focus)} · ~${estMinutes(x)} min ${x.run && !x.runOnly ? `· ${emi(x.run.icon)} ${esc(x.run.name)}` : ''}</div></div></summary>
      <div class="content">
        ${x.items.map((it) => { const e = EX[it.exId]; const sg = suggest(it.exId, it, s.history[it.exId], p); return html`
          <div class="ex-row" data-info="${it.exId}" data-coach="${sessionCoach(p, x)}"><div class="ex-thumb"><img src="${demoPoster(sessionCoach(p, x), it.exId)}" alt="" loading="lazy"></div>
            <div><div class="t">${esc(e.name)}</div><div class="s">${it.role === 'hiit' ? `${it.sets} rounds × ${it.reps[0]} sec · rest ${it.rest} sec` : it.role === 'mob' ? `${it.sets > 1 ? `${it.sets} × ` : ''}${e.unilateral ? `${Math.round(it.reps[0] / 2)} sec per side` : `${it.reps[0]} sec`} · ${e.kind === 'static' ? 'hold' : 'movement'}` : `${it.sets} × ${it.reps[0]}–${it.reps[1]}${it.unit === 'sec' ? ' sec' : ''} · rest ${fmtTime(it.rest)}`}</div></div>
            <div class="w">${it.label ? `<small>${it.label}</small>` : it.role === 'hiit' ? `<small>${{ legs: 'Legs', cardio: 'Cardio', core: 'Core', upper: 'Upper body' }[it.cat] || ''}</small>` : it.role === 'mob' ? `<small>${REGIONS[it.region] || ''}</small>` : sg.w ? `${sg.w}<small>kg</small>` : `<small>${it.role === 'skill' ? 'Skill' : it.vol ? 'Volume' : 'Bodyweight'}</small>`}</div></div>`; })}
        ${s.settings.warmup !== false && x.track !== 'mob' && !x.runOnly ? `<div class="mob-line"><span><b>Warm-up:</b> ${(x.warmup || warmupFor(x.items, blockedSet(p))).map((m) => EX[m.exId].name).join(' · ')}</span><span><b>Stretching:</b> ${(x.cooldown || cooldownFor(x.items)).map((m) => EX[m.exId].name).join(' · ')}</span></div>` : ''}
        ${x.finisher ? `<div class="card tight" style="margin-top:10px"><b>${esc(x.finisher.name)}</b><div class="sub">${x.finisher.rounds} rounds: ${x.finisher.items.map(([id, n]) => `${EX[id].name} ${n}${['time', 'cardio'].includes(EX[id].type) ? ' sec' : ''}`).join(' + ')}</div></div>` : ''}
        ${x.run ? html`<div class="card tight" style="margin-top:10px"><div class="row"><b>${emi(x.run.icon)} ${esc(x.run.name)}</b><span class="spacer"></span><span class="tag teal">${x.run.type === 'test' ? 'Test' : `${Math.round(x.run.totalSec / 60)} min`}</span></div>
          <div class="sub">${x.run.segs.filter((g) => !['warm', 'cool'].includes(g.kind)).slice(0, 1).map((g) => esc(g.label))} ${x.run.type === 'intervals' ? `· sprint pace ${fmtPace(x.run.pace.fast)}/km` : x.run.type === 'tempo' ? `· pace ${fmtPace(x.run.pace.tempo)}/km` : x.run.type === 'easy' ? `· pace ${fmtPace(x.run.pace.easy)}/km` : ''}</div>
          <button class="btn sm teal" style="margin-top:8px" data-run="${x.day}">${x.run.walk ? 'Start walk' : 'Start run'}</button></div>` : ''}
        ${x.runOnly ? `<div class="sub t-foot" style="margin-top:8px">${x.run.segs.map((g) => `${esc(g.label)}${g.sec ? ` (${fmtTime(g.sec)})` : ''}`).slice(0, 7).join(' ← ')}${x.run.segs.length > 7 ? ' …' : ''}</div>` : `<button class="btn primary block" style="margin-top:12px" data-start="${x.day}">${doneDays.has(x.day) ? 'Do it again' : 'Start workout'}</button>`}
      </div></details>`)}

    ${withMob ? html`<div class="h2">Mobility & flexibility</div>
    <div class="card"><div class="row between"><b>${mobTested(p.mob) ? `Range-of-motion score: ${mobScore(p.mob)} out of 100` : 'The range-of-motion test hasn\'t been done yet'}</b><button class="btn sm teal" data-act="mob-test">${icon('target', 'width="16" height="16"')} ${mobTested(p.mob) ? 'Retest' : 'Take the test'}</button></div>
      <div class="sub t-foot" style="margin-top:6px">${mobTested(p.mob) ? `The areas that get the most time: <b>${weakRegions(p.mob).map((r) => REGIONS[r]).join(' · ')}</b>.` : 'Six short at-home tests. Until then the workouts are balanced across all areas.'} Before each workout you choose how much time you have: 10, 20 or 30 minutes.</div>
      <button class="btn sm block" style="margin-top:10px" data-act="quick-mob">${icon('sparkle', 'width="16" height="16"')} Free workout by area</button></div>` : ''}
    ${withCali ? laddersSection(p) : ''}${single ? '' : html`<div class="h2">Difficulty level${mix ? ' · gym' : ''}</div>
    <div class="card"><b>Level ${p.level} — ${LEVEL_NAMES[p.level]}</b><div class="sub t-foot">The level updates automatically at the end of each block, based on consistency, progress and effort.</div>
      <div class="lvl-dots">${[1, 2, 3, 4, 5].map((l) => `<i class="${l <= p.level ? 'on' : ''}"></i>`).join('')}</div>
      <div class="grid2"><button class="btn sm" data-lvl="-1" ${p.level <= 1 ? 'disabled' : ''}>Easier</button><button class="btn sm" data-lvl="1" ${p.level >= 5 ? 'disabled' : ''}>Harder</button></div></div>`}

    ${run && !mobN ? '' : html`<div class="h2">Exercise library<span class="sub t-foot" style="margin-inline-start:auto">${libList.length} exercises</span></div>
    <div class="chips scroll" style="margin-bottom:12px">${[['all', 'All'], ...Object.entries(GROUPS).filter(([k]) => EXERCISES.some((e) => e.group === k && inTracks(e)))].map(([k, v]) => `<button class="chip ${libFilter === k ? 'on' : ''}" data-filter="${k}">${v}</button>`)}</div>
    <div class="lib">${libList.slice(0, libAll ? 999 : 6).map((e) => html`
      <button class="lib-card" data-info="${e.id}" data-coach="${exCoach(p, e.id)}"><img src="${demoPoster(exCoach(p, e.id), e.id)}" alt="" loading="lazy"><div class="cap"><small>${GROUPS[e.group]}</small>${esc(e.name)}</div></button>`)}</div>
    ${libList.length > 6 ? `<button class="btn block mt-3" data-act="lib-all">${libAll ? 'Show less' : `Show all ${libList.length} exercises`}</button>` : ''}`}
  `;

  on(root, 'click', '[data-info]', (e, t) => infoSheet(t.dataset.info, t.dataset.coach || p.coach));
  if (withCali) bindLadders(root, () => renderPlan(root));
  on(root, 'click', '[data-filter]', (e, t) => { libFilter = t.dataset.filter; libAll = false; renderPlan(root); });
  on(root, 'click', '[data-act="lib-all"]', () => { libAll = !libAll; renderPlan(root); });
  on(root, 'click', '[data-start]', (e, t) => { const ses = plan.week.sessions.find((x) => x.day === Number(t.dataset.start)); begin(ses); });
  on(root, 'click', '[data-run]', (e, t) => { const ses = plan.week.sessions.find((x) => x.day === Number(t.dataset.run)); startRun(ses.run, { day: ses.day, ...(ses.extra ? { coach: ses.coach, extra: true } : {}) }); });
  on(root, 'click', '[data-act="mob-test"]', () => mobTestSheet(() => renderPlan(root)));
  on(root, 'click', '[data-act="quick-mob"]', () => quickMobSheet((w) => startWorkout(w)));
  bindCalendar(root, () => renderPlan(root));
  on(root, 'click', '[data-act="regen"]', () => { set((s2) => regenerateWeek(s2)); toast('The week was rebuilt'); renderPlan(root); });
  on(root, 'click', '[data-lvl]', (e, t) => {
    set((s2) => { s2.profile.level = Math.min(5, Math.max(1, s2.profile.level + Number(t.dataset.lvl))); return regenerateWeek(s2); });
    toast(`Level ${get().profile.level} — program updated`);
    renderPlan(root);
  });
}
