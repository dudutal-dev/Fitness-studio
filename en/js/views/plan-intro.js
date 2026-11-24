// מסך "התוכנית שלך": מוצג פעם אחת, מיד אחרי ההיכרות ובניית התוכנית — לפני מסך הבית.
// מציג מה נבנה: שבוע האימונים (ובקליסתניקס — השלבים ההתחלתיים והמיומנויות), ויעדי התזונה עם תפריט לדוגמה.
import { html, esc, on, el, icon, ib, emi } from '../ui/dom.js';
import { get, set } from '../store.js';
import { COACHES } from '../data/coaches.js';
import { EX } from '../data/exercises.js';
import { FOOD } from '../data/foods.js';
import { GOALS, LEVEL_NAMES } from '../engine/program.js';
import { isCali, isMix, hasCali, hasGym, sessionCoach, rungState, mixCaliCount, LADDERS, STRENGTH_LADDERS } from '../engine/cali.js';
import { mealPlan, wantsNutrition } from '../engine/nutrition.js';
import { isRun, rwWeeksLeft } from '../engine/running.js';
import { isHiit, HIIT_FORMAT, lowImpact } from '../engine/hiit.js';
import { isPil, PIL_LEVELS, pilLevel } from '../engine/pil.js';
import { isYoga, YOGA_LEVELS, yogaLevel } from '../engine/yoga.js';
import { isTai, TAI_LEVELS, taiLevel } from '../engine/tai.js';
import { isWalk, isMed, WALK_LEVELS, walkLevel } from '../engine/walking.js';
import { isMob, hasMob, mobCount, mobTested, mobScore, weakRegions, REGIONS } from '../engine/mob.js';
import { estMinutes } from './home.js';

const CTX = 'home'; // התפריט לדוגמה: מה שאוכלים בבית

export function openPlanIntro(onDone) {
  document.querySelector('.plan-intro')?.remove();
  const s = get(), p = s.profile, week = s.plan.week;
  const cali = isCali(p), mix = isMix(p);
  const mob = isMob(p), mobN = mobCount(p), run = isRun(p), hiit = isHiit(p), pil = isPil(p), yoga = isYoga(p), tai = isTai(p), med = isMed(p), walk = isWalk(p) && !med;
  const coaches = [...(mix ? [COACHES[p.gymCoach || p.coach], COACHES.maya] : [COACHES[p.coach]]), ...(mobN ? [COACHES.tamar] : [])];
  const fem = p.sex === 'f';
  const plan = mealPlan(p, { ctx: CTX, seed: new Date().getDate() });
  const t = plan.targets;
  const kcalOf = (g, per) => Math.round(g * per);
  const pct = (g, per) => Math.round((kcalOf(g, per) / Math.max(1, t.kcal)) * 100);
  const energy = t.delta < 0 ? `A deficit of ${Math.abs(t.delta)} kcal a day — slow loss that keeps your muscle` : t.delta > 0 ? `A surplus of ${t.delta} kcal a day — to build muscle without gaining extra fat` : 'Calorie balance — eat as much as you burn';
  const ladders = hasCali(p) ? STRENGTH_LADDERS.map((lid) => ({ lid, st: rungState(p.cali, lid) })).filter((x) => x.st) : [];
  const skills = hasCali(p) ? (p.cali.skills || []).map((lid) => LADDERS[lid].name) : [];
  const runs = week.sessions.filter((x) => x.run).length;

  const root = el(html`<div class="plan-intro" role="dialog" aria-label="Your plan">
    <div class="pi-scroll">
      <div class="pi-head">
        <div class="pi-faces">${coaches.map((c) => `<img src="${c.face}" alt="${c.name}">`).join('')}</div>
        <div class="eyebrow">Your plan is ready</div>
        <div class="h1">${esc(p.name)}, this is your plan</div>
        <p class="sub">${coaches.map((c) => c.name).join(' and ')} ${coaches.length > 1 ? 'built' : coaches[0].f ? 'built' : 'built'} it from what you told us. It will change by itself based on your performance — and you can change anything in Settings.</p>
      </div>

      <div class="h2">${ib('dumbbell', 'pri', 'sm')} Workouts</div>
      <div class="card tight">
        <div class="pi-kpis">
          <div><b class="num">${week.sessions.length}</b><span>workouts a week</span></div>
          <div><b class="num">${run ? Math.round(Math.max(...week.sessions.filter((x) => x.run).map((x) => x.run.totalSec)) / 60) : mob ? '10–30' : hiit ? p.hiitMin || 20 : pil ? p.pilMin || 30 : yoga ? p.yogaMin || 30 : tai ? p.taiMin || 20 : med ? p.medMin || 30 : walk ? p.walkMin || 30 : p.sessionMin}</b><span>${run ? (rwWeeksLeft(p) ? 'min per run' : 'min in the long run') : 'min per workout'}</span></div>
          <div><b>${med && week.mj ? `${week.mj.weeks} weeks` : med ? (p.medPace === 'fast' ? 'Brisk' : 'Calm') : walk ? WALK_LEVELS[walkLevel(p)] : tai ? TAI_LEVELS[taiLevel(p)] : yoga ? YOGA_LEVELS[yogaLevel(p)] : pil ? PIL_LEVELS[pilLevel(p)] : hiit ? `${HIIT_FORMAT[p.level][0]}/${HIIT_FORMAT[p.level][1]}` : run ? (rwWeeksLeft(p) ? 'Run-walk' : `Level ${p.runLevel || 2}`) : mob ? (mobTested(p.mob) ? mobScore(p.mob) : 'Range of motion') : cali ? 'Ladders' : `Level ${p.level}`}</b><span>${med && week.mj ? 'Journey length' : med ? 'Walk' : pil || yoga || tai || walk ? 'Level' : hiit ? 'sec work / rest' : run ? (rwWeeksLeft(p) ? ` ${rwWeeksLeft(p)} weeks to nonstop running` : 'Running level') : mob ? (mobTested(p.mob) ? 'Range-of-motion score' : 'instead of weights') : cali ? 'instead of weights' : LEVEL_NAMES[p.level]}</span></div>
        </div>
        <div class="pi-goal">${icon(GOALS[p.goal].icon)} <b>${GOALS[p.goal].name}</b>${mix ? ` · combined: ${p.days - mobN - mixCaliCount(p)} gym + ${mixCaliCount(p)} calisthenics` : ''}${mobN ? ` · ${mobN === 1 ? '1 mobility workout' : `${mobN} mobility workouts`} with ${COACHES.tamar.name}` : ''}</div>
      </div>
      <div class="card tight pi-week">
        ${week.sessions.map((x) => html`<div class="pi-day"><span class="dn num">${x.day}</span>
          <div class="grow"><b>${esc(x.name)}</b><span>${esc(x.focus)}</span></div>
          <small>${coaches.length > 1 ? `${COACHES[sessionCoach(p, x)].name} · ` : ''}~${estMinutes(x)} min${x.run && !x.runOnly ? ` · ${emi(x.run.icon)} run` : ''}</small></div>`)}
        <div class="sub t-foot" style="margin-top:8px">Workouts aren't tied to days of the week: just do the next one in line${hasCali(p) ? ', with a rest day between workouts when possible' : ''}.${runs && !run ? ` ${runs === 1 ? 'One of them includes' : `${runs} of them include`} a run too.` : ''}</div>
      </div>
      ${ladders.length ? html`<div class="card tight"><b>Your starting point on the ladders</b>
        <div class="pi-ladders">${ladders.map(({ lid, st }) => `<div><span>${esc(LADDERS[lid].name)}</span><b>${esc(EX[st.rung.id].name)}</b><small class="num">${st.i + 1}/${st.n}</small></div>`).join('')}</div>
        ${skills.length ? `<div class="sub t-foot" style="margin-top:8px">Skills that go into your workouts: <b>${skills.map(esc).join(', ')}</b>. Others unlock when the base is ready.</div>` : ''}
        <div class="sub t-foot" style="margin-top:6px">When all sets reach the top target — you move up a step automatically. If a step doesn't suit you, change it on the Plan screen.</div></div>` : ''}
      ${walk ? `<div class="card tight"><b>How it works</b><div class="sub t-foot" style="margin-top:4px">Every walk opens with a warm-up and ends with a cool-down. In between: a brisk walk, power intervals with recovery between them, or a long walk that grows by five minutes every week. ${COACHES.shira.name} tells you when to speed up and when to ease off, and distance and pace are measured by GPS.</div></div>` : ''}
      ${tai ? `<div class="card tight"><b>How it works</b><div class="sub t-foot" style="margin-top:4px">Every class opens with a short warm-up and an opening stance, continues with slow movements in a high stance, and ends with a closing stance. ${COACHES.mei.name} demonstrates every movement from the front and the side, and explains it step by step. A chair or wall within reach, and no pain.</div></div>` : ''}
      ${yoga ? `<div class="card tight"><b>How it works</b><div class="sub t-foot" style="margin-top:4px">Every class opens seated with breathing, continues to standing and balance poses, comes down to the mat, and ends with relaxation. Hold each pose for a few breaths. ${COACHES.yael.name} demonstrates every pose and reminds you what to watch for.</div>
        <div class="sub t-foot" style="margin-top:6px">Classes rotate: full class, hips and flexibility, standing and strength, back and chest. Complete most of your classes and you level up after four weeks, with new poses unlocked.</div></div>` : ''}
      ${pil ? `<div class="card tight"><b>How it works</b><div class="sub t-foot" style="margin-top:4px">Every class opens with breathing and connecting to your center, continues with a slow sequence of exercises — about a minute each — and ends with a stretch. ${COACHES.lia.name} demonstrates every movement and reminds you what to watch for.</div>
        <div class="sub t-foot" style="margin-top:6px">Classes rotate between core, back and hips. Complete most of your classes and you level up after four weeks, with new exercises unlocked.</div></div>` : ''}
      ${hiit ? `<div class="card tight"><b>How it works</b><div class="sub t-foot" style="margin-top:4px">A short warm-up, then a circuit of five or six exercises: ${HIIT_FORMAT[p.level][0]} sec work, ${HIIT_FORMAT[p.level][1]} sec rest, and the next exercise. A few rounds, and stretching to finish. ${lowImpact(p) ? 'All exercises in the no-jump version.' : 'On any jumping exercise you can switch to the no-jump version, even mid-way.'}</div>
        <div class="sub t-foot" style="margin-top:6px">${week.sessions.some((x) => x.easy) ? 'Between the hard workouts there are "easy cardio" days, so your body recovers. ' : ''}Complete most of your workouts and you level up after four weeks: more work, less rest.</div></div>` : ''}
      ${run ? `<div class="card tight"><b>How it works</b><div class="sub t-foot" style="margin-top:4px">${rwWeeksLeft(p) ? 'You start with run-walk: short run segments with walking in between. Each week the segments get longer, up to half an hour of nonstop running — and then you move to the full plan.' : 'Most runs are at a pace you can talk at, one quality run a week, and a long run that grows by four minutes every week. Every fourth week is easier, with a 3 km test that updates your paces.'}</div>
        <div class="sub t-foot" style="margin-top:6px">Distance and pace are measured by the phone's GPS. ${COACHES[p.coach].name} ${COACHES[p.coach].f ? 'will tell you' : 'will tell you'} in your earphones when to run, when to walk and when to slow down.</div></div>` : ''}
      ${hasMob(p) ? `<div class="card tight"><b>${mob ? 'How it works' : `Mobility with ${COACHES.tamar.name}`}</b><div class="sub t-foot" style="margin-top:4px">Before each workout you choose how much time you have — 10, 20 or 30 minutes. Start with slow movement, continue with relaxed 30-second holds, and finish with breathing. Pleasant stretch only, no pain.</div>
        <div class="sub t-foot" style="margin-top:6px">${mobTested(p.mob) ? `Based on the range-of-motion test, the most time will go to: <b>${weakRegions(p.mob).map((r) => REGIONS[r]).join(' · ')}</b>. We'll test again in four weeks.` : 'The range-of-motion test (six short tests) is waiting on the Plan screen. Until then, workouts are balanced across all areas.'}</div></div>` : ''}
      ${hasGym(p) && !cali ? `<div class="card tight"><b>The weights</b><div class="sub t-foot" style="margin-top:4px">In your first workout the weights are conservative on purpose. After each set ${fem ? 'you rate' : 'you rate'} how hard it was, and the next weight adjusts accordingly.</div></div>` : ''}

      ${wantsNutrition(p) ? html`<div class="h2">${ib('food', 'pri', 'sm')} Nutrition</div>
      <div class="card tight">
        <div class="pi-kcal"><b class="num">${t.kcal.toLocaleString('en-US')}</b><span>kcal a day</span></div>
        <div class="sub t-foot" style="text-align:center;margin-bottom:10px">${energy}</div>
        <div class="pi-macros">
          <div><i style="background:var(--pri)"></i><b class="num">${t.protein} g</b><span>Protein · ${pct(t.protein, 4)}%</span></div>
          <div><i style="background:var(--acc)"></i><b class="num">${t.carbs} g</b><span>Carbs · ${pct(t.carbs, 4)}%</span></div>
          <div><i style="background:var(--orange)"></i><b class="num">${t.fat} g</b><span>Fat · ${pct(t.fat, 9)}%</span></div>
        </div>
        <div class="pi-bar"><i style="width:${pct(t.protein, 4)}%;background:var(--pri)"></i><i style="width:${pct(t.carbs, 4)}%;background:var(--acc)"></i><i style="width:${pct(t.fat, 9)}%;background:var(--orange)"></i></div>
        <div class="sub t-foot" style="margin-top:10px">${ib('drop', 'acc', 'sm')} ${t.waterL} L of water a day · ${t.fiber} g fiber · protein: ${t.perKg} g per kg of body weight</div>
      </div>
      <div class="card tight"><b>Sample day</b><span class="sub t-foot"> · ${plan.total.kcal.toLocaleString('en-US')} kcal · ${plan.total.p} g protein</span>
        ${plan.meals.map((m) => html`<div class="pi-meal"><div class="pm-top"><b>${emi(m.icon)} ${m.name}</b><span class="num">${m.total.kcal} kcal</span></div>
          <div class="sub">${m.dish ? esc(m.dish.name) : m.items.map((it) => esc(FOOD[it.id].name)).join(' · ')}</div></div>`)}
        <div class="sub t-foot" style="margin-top:8px">${(p.dislikes || []).length ? `The menu leaves out the foods you marked that ${fem ? 'you don\'t eat' : 'you don\'t eat'}. ` : ''}This is a suggestion, not a must: the Nutrition screen has a menu that changes by place (at home, at work, on the go), and a log of what you actually eat.</div>
      </div>
` : ''}
      <p class="sub t-foot" style="text-align:center;margin:14px 0 6px">Medical clearance is recommended before starting a training plan. Sharp pain — stop.</p>
    </div>
    <div class="pi-actions">
      <div class="grid2"><button class="btn sm" data-go="plan" ${wantsNutrition(p) ? '' : 'style="grid-column:1/-1"'}>${icon('plan', 'width="16" height="16"')} The full plan</button>${wantsNutrition(p) ? `<button class="btn sm" data-go="nutrition">${icon('food', 'width="16" height="16"')} Nutrition screen</button>` : ''}</div>
      <button class="btn primary block xl" data-go="home">${fem ? 'Great, let\'s start' : 'Great, let\'s start'}</button>
    </div></div>`);
  document.body.append(root);
  document.body.style.overflow = 'hidden';
  on(root, 'click', '[data-go]', (e, b) => {
    set((st) => { st.planSeen = true; return st; });
    root.remove();
    document.body.style.overflow = '';
    onDone(b.dataset.go);
  });
}
