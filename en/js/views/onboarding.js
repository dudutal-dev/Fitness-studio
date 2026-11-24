// אונבורדינג: 9 שלבים — מסלול, מאמן (וציוד בקליסתניקס), פרטים, מטרה, מבדק רמה, לו״ז, פציעות, תזונה, בניית תוכנית.
import { OTHER, setLang } from '../lang.js';
import { html, esc, on, $, toast, icon } from '../ui/dom.js';
import { defaultReminderSettings } from '../reminders.js';
import { COACHES, coachesFor } from '../data/coaches.js';
import { MJ_PATHS, MJ_WEEKS, MJ_STAGES } from '../engine/med-journey.js';
import { GOALS, INJURIES, estimateLevel, LEVEL_NAMES, goalsFor, goalForTrack } from '../engine/program.js';
import { newCali, caliLevel, mixCaliCount, recommendTrack } from '../engine/cali.js';
import { newMob, mobLevel, mobScore } from '../engine/mob.js';
import { TEST_IDS } from '../data/mob.js';
import { mobTestHtml, bindMobTest, flagChips, flagNotes } from './mob-ui.js';
import { EQUIP } from '../data/cali.js';
import { runLevelFrom3k, RUN_BASES } from '../engine/running.js';
import { ANCHOR_LIFTS } from '../engine/progression.js';
import { DISLIKE_TAGS } from '../data/foods.js';
import { nutPrefsHtml, bindNutPrefs } from './nut-prefs.js';
import { set, createPlan, today, lohemData, importFromLohem } from '../store.js';
import { BRAND } from '../brand.js';
import { say, unlock, stop } from '../coach/voice.js';

const WD_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const WD_SPREAD = { 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5] };
// שער האפליקציה: התחום של כל מאמן על הכרטיס שלו, ומספר המאמנים במילים
const GATE_TILES = {
  gym: ['Gym', 'with Ori and Noa', ['ori', 'noa']], cali: ['Calisthenics', 'with Maya', ['maya']], run: ['Running', 'with Guy and Shira', ['guy', 'shira']],
  hiit: ['HIIT', 'with Lia', ['lia']], pil: ['Pilates', 'with Lia', ['lia']], yoga: ['Yoga', 'with Yael', ['yael']], tai: ['Tai chi', 'with Mei', ['mei']], walk: ['Walking', 'with Shira', ['shira']], med: ['Moving meditation', 'with Or', ['or']], mob: ['Mobility', 'with Tamar', ['tamar']],
  mix: ['Combined', 'Several tracks a week', []],
};

const GOAL_DESC = {
  combat: 'Strength + running + endurance. Balanced fitness for whatever life asks of you.',
  muscle: 'Build muscle mass and size, with running to stay fit.',
  strength: 'Lift heavier — squat, deadlift, presses.',
  cut: 'Lower your body fat while keeping muscle and strength.',
  skill: 'Relative strength and control: pull-ups, dips, handstand, and on to the advanced skills.',
  core: 'Deep abs, back and pelvic stability — the base of every other movement.',
  fit: 'Cardio endurance and bodyweight strength, in short, intense workouts.',
  r5k: 'From run-walk to five kilometers nonstop. Also right for anyone who doesn\'t run yet.',
  r10k: 'Run longer and add pace: ten kilometers with confidence.',
  r21k: 'Long runs that grow gradually, up to 21 kilometers.',
  flex: 'Bigger range of motion across the whole body: hips, shoulders, back and ankles.',
  posture: 'Open up what tightens from long sitting: upper back, chest, hip flexors and neck.',
};
const MOB_GOAL_DESC = { cut: 'Fat loss through nutrition, with daily movement that\'s easy to stick with.' };
const PIL_GOAL_DESC = { posture: 'Back extensors, shoulder blades and length: stand and sit tall without effort.', cut: 'Fat loss through nutrition, with classes that strengthen and lengthen.' };
const WALK_GOAL_DESC = { health: 'Heart, lungs and mood: half an hour of brisk walking on most days of the week — the basic recommendation for health.', cut: 'Fat loss through nutrition, with walks that are easy to stick to.' };
const TAI_GOAL_DESC = { bal: 'A steadier, safer stance: strong legs, balance, and less fear of falling.', zen: 'Slow down, breathe and relax — in slow, continuous movement.', cut: 'Fat loss through nutrition, with a gentle practice that\'s easy to stick with.' };
const YOGA_GOAL_DESC = { zen: 'Slow down, breathe and release tension — with a stronger, more flexible body.', flex: 'Bigger range of motion: hips, hamstrings, back and shoulders.', cut: 'Fat loss through nutrition, with a practice that strengthens and calms.' };
const HIIT_GOAL_DESC = { cut: 'Fat loss: short, intense workouts, with a moderate calorie deficit.' };
const RUN_GOAL_DESC = { cut: 'Fat loss with long, easy runs and a moderate calorie deficit.' };
const CALI_GOAL_DESC = { muscle: 'Build muscle with bodyweight: more volume and sets, with a small calorie surplus.', cut: 'Fat loss while keeping strength. A lighter body — easier skills.' };
export const goalDesc = (goal, track) => (track === 'cali' && CALI_GOAL_DESC[goal]) || (track === 'mob' && MOB_GOAL_DESC[goal]) || (track === 'run' && RUN_GOAL_DESC[goal]) || (track === 'hiit' && HIIT_GOAL_DESC[goal]) || (track === 'pil' && PIL_GOAL_DESC[goal]) || (track === 'yoga' && YOGA_GOAL_DESC[goal]) || (track === 'tai' && TAI_GOAL_DESC[goal]) || (track === 'walk' && WALK_GOAL_DESC[goal]) || GOAL_DESC[goal];
// "2 אימוני חדר כושר + אימון קליסתניקס אחד"
const nWorkouts = (n, kind) => (n === 1 ? `1 × ${kind} ` : `${n} × ${kind}`);
export const splitText = (gym, cali) => `${nWorkouts(gym, 'Gym')} + ${nWorkouts(cali, 'Calisthenics')}`;
export const TRACKS = {
  med: { name: 'Moving meditation', sub: 'A meditative walk with Or', desc: 'An outdoor walk with Or: one idea per walk — release, healing, connection, reset, gratitude or presence — a few words, plenty of silence, and music that shifts with the pace.' },
  gym: { name: 'Gym', sub: 'Weights, machines and running', desc: 'A strength and fitness plan with Ori or Noa: weights that update themselves, runs and a 3 km test.' },
  mix: { name: 'Combined', sub: 'Gym + calisthenics in the same week', desc: 'Some workouts in the gym with Ori or Noa, and some with bodyweight with Maya. Weights and ladders progress side by side, and you can set how many workouts of each kind — and add mobility workouts with Tamar too.' },
  run: { name: 'Running', sub: 'From a first 5 km to a half marathon', desc: 'A running plan with Guy or Shira: run-walk for beginners, easy runs, intervals and a long run that grows every week. Distance and pace by GPS, and a 3 km test once a month.' },
  hiit: { name: 'HIIT', sub: 'Short, intense workouts at home', desc: 'Interval workouts with Lia: 15 to 25 minutes, bodyweight only, no equipment. A hard work interval, a short rest, and the next exercise. Every jumping exercise has a no-jump version.' },
  pil: { name: 'Pilates', sub: 'Mat classes — core, back and posture', desc: 'Mat Pilates with Lia: 20 to 40 minute classes, slow, precise movement from the center. Three levels, no equipment — just a mat.' },
  walk: { name: 'Walking', sub: 'Guided outdoor walks, with music', desc: 'A walking plan with Shira: brisk walks, walking intervals and a long walk that grows every week. Shira guides you in your earphones, and distance and pace are measured by GPS. No equipment — just comfortable shoes.' },
  tai: { name: 'Tai chi', sub: 'Slow movement, balance and breathing — standing', desc: 'Tai chi classes with Mei: 15 to 30 minutes, in a high stance with small steps. Start with the fundamentals, move on to the 8-form and to movements from the 24-form. No equipment — just a chair or wall within reach.' },
  yoga: { name: 'Yoga', sub: 'Breathing, poses and relaxation — on a mat', desc: 'Yoga classes with Yael: 20 to 45 minutes, from standing and balance poses to relaxation at the end. Three levels, no equipment — just a mat.' },
  mob: { name: 'Mobility', sub: 'Flexibility and range of motion — mat and wall', desc: 'Mobility & flexibility workouts with Tamar: an at-home range-of-motion test, a 10 to 30 minute workout to fit the time you have, and a focus on the areas that need it most. No equipment and no pain.' },
  cali: { name: 'Calisthenics', sub: 'Bodyweight — at home or in the park', desc: 'Bodyweight workouts with Maya: progression ladders from the first step up to pull-ups, handstand, muscle-up and planche. Works with no equipment at all.' },
};

export function renderOnboarding(root, done) {
  const d = {
    track: 'gym', auto: false, gymAccess: 'yes', coach: 'ori', equip: [], squats: 20, dips: 0, plankSec: 45, name: '', age: 20, heightCm: 178, weightKg: 72, targetWeight: 75, sex: 'm',
    goal: 'combat', years: 1, pushups: 30, pullups: 8, run3kStr: '', days: 4, sessionMin: 60,
    injuries: [], dislikes: [], dislikedFoods: [], nutrition: null, diet: 'all', kosher: false, mealsN: 5, allergies: [], health: [], mobN: 0, mobMin: 20, mobTest: {}, flags: [], runBase: 15, hiitMin: 20, hiitLevel: 2, hiitLow: false, pilMin: 30, pilLevel: 1, yogaMin: 30, yogaLevel: 1, taiMin: 20, taiLevel: 1, walkMin: 30, walkLevel: 1, medMin: 30, mjPath: 'full', mjWeeks: 8, mjLevel: 1,
  };
  let step = 0;
  const STEPS = 11;
  const REC = 9, BUILD = 10;
  // "תמליצו לי": המסלול נקבע רק בשלב ההמלצה (אחרי ההיכרות). עד אז שואלים את כל מה שצריך לשני המסלולים —
  // או רק לקליסתניקס, אם אין גישה לחדר כושר.
  const undecided = () => d.auto && !d.decided;
  const cali = () => (undecided() ? d.gymAccess === 'no' : d.track === 'cali');      // קליסתניקס בלבד
  const mix = () => (undecided() ? d.gymAccess !== 'no' : d.track === 'mix');        // משולב
  const anyCali = () => undecided() || d.track === 'cali' || d.track === 'mix';
  const run = () => !undecided() && d.track === 'run';                                // ריצה בלבד
  const hiit = () => !undecided() && d.track === 'hiit';                              // HIIT בלבד
  const pil = () => !undecided() && d.track === 'pil';                                // פילאטיס בלבד
  const yoga = () => !undecided() && d.track === 'yoga';                              // יוגה בלבד
  const tai = () => !undecided() && d.track === 'tai';                                // טאי צ'י בלבד
  const walk = () => !undecided() && d.track === 'walk';                              // הליכה בלבד
  const med = () => !undecided() && d.track === 'med';                                // מדיטציה בתנועה: מסע רוחני בשלבים (25.11.2026)
  const mjTime = () => { const h = Number(String(d.schedTime || '18:00').split(':')[0]); return h < 11 ? 'morning' : h >= 17 ? 'evening' : 'day'; };   // מתי הולכים — לפי השעה שנבחרה בשלב הזמנים
  const cls = () => pil() || yoga() || tai();                                                  // מסלולי שיעורים: רמה, אורך שיעור ושאלון בטיחות
  const mob = () => !undecided() && d.track === 'mob';                                // מוביליטי בלבד
  // כמה אימוני מוביליטי אפשר לשלב בשבוע של מסלול אחר (נשאר לפחות אימון אחד לכל חלק אחר)
  const mobMax = () => Math.min(3, d.days - (mix() ? 2 : 1));
  const mobN = () => (mob() ? 0 : Math.max(0, Math.min(d.mobN || 0, mobMax())));
  const withMob = () => mob() || mobN() > 0;
  const withFlags = () => withMob() || cls();
  const dm = () => ({ ...d, mobN: mobN(), mob: mobN() ? {} : null });                // לחישוב החלוקה במשולב כשיש גם מוביליטי
  const testDone = () => TEST_IDS.every((id) => d.mobTest[id] != null);
  const rec = () => recommendTrack({ gymAccess: d.auto ? d.gymAccess : 'yes', goal: d.goalWanted || d.goal, days: d.days, injuries: d.injuries });
  // מחיל מסלול (המלצה או בחירה ידנית בשלב ההמלצה)
  const decide = (track, mixCali) => {
    d.decided = true; d.track = track; d.goal = goalForTrack(d.goalWanted || d.goal, track);
    if (track === 'mix') d.mixCali = mixCali ?? rec().mixCali ?? undefined; else delete d.mixCali;
    d.coach = track === 'cali' ? 'maya' : track === 'mob' ? 'tamar' : track === 'run' ? (d.runCoach || 'guy') : track === 'hiit' || track === 'pil' ? 'lia' : track === 'yoga' ? 'yael' : track === 'tai' ? 'mei' : track === 'walk' ? 'shira' : track === 'med' ? 'or' : (d.gymCoach || 'ori');
  };
  const fem = () => !!COACHES[d.coach].f;
  const recMix = () => { const r = recommendTrack({ gymAccess: 'yes', goal: d.goal, days: d.days - mobN(), injuries: d.injuries }); return r.track === 'mix' ? r.mixCali : Math.floor((d.days - mobN()) / 2); };

  const views = [
    // 0 — פתיחה
    () => { const tile = (id) => { const [name, sub, who] = GATE_TILES[id]; return `<figure>${who.length ? `<span class="gt-faces">${who.map((c) => `<img src="${COACHES[c].face}" alt="">`).join('')}</span>` : `<span class="gt-ico">${icon('sparkle')}</span>`}<figcaption><b>${name}</b><span>${sub}</span></figcaption></figure>`; };
      const row = (ids, cls) => `<div class="gate-row ${cls}"><div class="gate-track">${[...ids, ...ids, ...ids, ...ids].map(tile).join('')}</div></div>`;
      return html`<div class="gate">
        <div class="gate-top"><div class="gate-logo">${BRAND.name}</div><div class="gate-tag">Your studio. Anywhere.</div></div>
        <div class="gate-wall" aria-hidden="true">${row(['gym', 'med', 'yoga', 'run'], 'tall')}${row(['cali', 'pil', 'hiit', 'med'], 'tall b')}${row(['mob', 'tai', 'walk', 'mix'], 'tall')}${row(['gym', 'yoga', 'med', 'run', 'pil'], 'short')}${row(['cali', 'hiit', 'tai', 'walk', 'mob', 'mix'], 'short b')}</div>
        <div class="gate-copy">
          <div class="gate-h">Ten kinds of training.<br><em>One studio.</em></div>
          <p class="sub">Ten coaches by your side — on one track or a mix of them.</p>
          <div class="gate-feats"><span>${icon('target')}A plan that changes with you</span><span>${icon('vol')}Reps counted out loud</span><span>${icon('chart')}Nutrition and tracking</span></div>
          ${lohemData() ? `<button class="btn block" style="margin-top:12px" data-lohem>${icon('download', 'width="18" height="18"')} Continue with my data from "HOD"</button><p class="sub" style="font-size:12px;margin-top:6px">The profile, workouts, weigh-ins and nutrition of ${esc(lohemData().profile.name)} will be copied here. The "HOD" app stays as it is.</p>` : ''}
        </div></div>`; },
    // 1 — מסלול
    () => html`<div class="eyebrow">Step 1 · Your track</div><div class="q">How ${d.sex === 'f' ? 'do you train' : 'do you train'}?</div>
      <p class="sub">Pick one track or combine. You can switch in Settings anytime, without losing history.</p>
      ${['gym', 'cali', 'run', 'walk', 'med', 'hiit', 'pil', 'yoga', 'tai', 'mob', 'mix'].map((id) => [id, TRACKS[id]]).map(([id, t]) => html`<button class="track-card ${!d.auto && d.track === id ? 'on' : ''}" data-track="${id}">
        <div class="tc-img">${(id === 'mix' ? ['ori', 'noa', 'maya', 'tamar'].map((c) => COACHES[c]) : coachesFor(id)).map((c) => `<img src="${c.face}" alt="">`).join('')}</div>
        <div><b>${t.name}</b><span class="tc-sub">${t.sub}</span><span>${t.desc}</span></div></button>`)}
      <button class="track-card auto ${d.auto ? 'on' : ''}" data-track="auto"><div class="tc-ico">${icon('sparkle')}</div>
        <div><b>Not ${d.sex === 'f' ? 'sure' : 'sure'}? We'll recommend one</b><span class="tc-sub">System recommendation</span><span>A few questions about your goal, equipment and time — and at the end we'll suggest a track and a weekly split. You can accept it or choose something else.</span></div></button>`,
    // 2 — מאמן (ובקליסתניקס: ציוד). במצב "תמליצו לי": איפה אפשר להתאמן
    () => (d.auto ? html`<div class="eyebrow">Step 2 · Where you train</div><div class="q">What do you have within reach?</div>
      <label class="field"><span>Gym</span><div class="seg" data-seg="gymAccess">
        ${[['yes', 'I have one'], ['some', 'Sometimes'], ['no', 'None']].map(([v, t]) => `<button data-v="${v}" class="${d.gymAccess === v ? 'on' : ''}">${t}</button>`).join('')}</div></label>
      <div class="q" style="font-size:20px;margin-top:14px">And bodyweight equipment?</div>
      <p class="sub">At home, in the park or in the yard. Mark as many as you like, or none at all.</p>
      <div class="chips">${Object.entries(EQUIP).map(([id, x]) => `<button class="chip ${d.equip.includes(id) ? 'on' : ''}" data-equip="${id}">${x.name}</button>`).join('')}</div>
      <div class="card tight" style="margin-top:14px"><b>At the end we'll recommend a track.</b><div class="sub">Based on your goal, days, equipment and injuries. The decision stays yours — and you pick your coach there, once the track is known.</div></div>`
      : run() ? html`<div class="eyebrow">Step 2 · Your coach</div><div class="q">Who will run with you?</div>
      <p class="sub">Your coach is in your earphones on every run: tells you when to run and when to walk, keeps the pace and cheers you on. You can switch anytime.</p>
      <div class="coach-pick">${coachesFor('run').map((c) => html`
        <button class="coach-card ${d.coach === c.id ? 'on' : ''}" data-coach="${c.id}">
          <img src="${c.img}" alt="${c.name}"><span class="check">✓</span>
          <div class="cap"><b>${c.name}</b><span>${c.title}</span></div></button>`)}</div>
      <p class="sub" style="margin-top:14px">${esc(COACHES[d.coach].bio)}</p>
      <div class="card tight" style="margin-top:6px"><b>What do you need?</b><div class="sub">Running shoes and a phone. Distance and pace are measured by the phone's GPS; a heart-rate watch is a bonus, not a must.</div></div>`
      : med() ? html`<div class="eyebrow">Step 2 · Your guide</div><div class="q">${esc(COACHES.or.name)} will guide the journey</div>
      <div class="coach-solo"><img src="${COACHES.or.img}" alt="${COACHES.or.name}"><div><b>${COACHES.or.name}</b><span>${COACHES.or.title}</span><p class="sub">${esc(COACHES.or.bio)}</p>
        <button class="btn sm teal" data-coach="or">${icon('play', 'width="16" height="16"')} Hear her</button></div></div>
      <div class="card tight" style="margin-top:16px"><b>What do you need?</b><div class="sub">Comfortable shoes, earphones, and a route that is pleasant to walk. Eyes open, looking at the path.</div></div>
      <div class="card tight" style="margin-top:10px"><b>What does the journey look like?</b><div class="sub">A journey of several weeks in four stages: ${MJ_STAGES.map((x) => x.name).join(', ')}. Each walk has one idea, a few words and a lot of quiet, with music that changes with the pace — and walking fitness builds along the way.</div></div>`
      : walk() ? html`<div class="eyebrow">Step 2 · Your coach</div><div class="q">${esc(COACHES.shira.name)} will walk with you</div>
      <div class="coach-solo"><img src="${COACHES.shira.img}" alt="${COACHES.shira.name}"><div><b>${COACHES.shira.name}</b><span>${COACHES.shira.title}</span><p class="sub">${esc(COACHES.shira.bio)}</p>
        <button class="btn sm teal" data-coach="shira">${icon('play', 'width="16" height="16"')} Hear her</button></div></div>
      <div class="card tight" style="margin-top:16px"><b>What do you need?</b><div class="sub">Comfortable shoes, earphones, and a route you enjoy walking. The phone measures distance and pace by GPS.</div></div>
      <div class="card tight" style="margin-top:10px"><b>What does a walk look like?</b><div class="sub">A warm-up at an easy walk, the main part — a brisk walk or power intervals — and a cool-down. Shira tells you when to speed up and when to ease off, and music at walking pace keeps you company.</div></div>`
      : tai() ? html`<div class="eyebrow">Step 2 · Your coach</div><div class="q">${esc(COACHES.mei.name)} will guide you</div>
      <div class="coach-solo"><img src="${COACHES.mei.img}" alt="${COACHES.mei.name}"><div><b>${COACHES.mei.name}</b><span>${COACHES.mei.title}</span><p class="sub">${esc(COACHES.mei.bio)}</p>
        <button class="btn sm teal" data-coach="mei">${icon('play', 'width="16" height="16"')} Hear her</button></div></div>
      <div class="card tight" style="margin-top:16px"><b>What do you need?</b><div class="sub">Room for a step in every direction, flat shoes or bare feet, and a sturdy chair or wall within reach. No other equipment.</div></div>
      <div class="card tight" style="margin-top:10px"><b>What does a class look like?</b><div class="sub">A short warm-up for ankles and shoulders, an opening stance, a few slow movements that Mei demonstrates and explains step by step, and a closing stance. High stance, small steps, no pain.</div></div>`
      : yoga() ? html`<div class="eyebrow">Step 2 · Your coach</div><div class="q">${esc(COACHES.yael.name)} will guide you</div>
      <div class="coach-solo"><img src="${COACHES.yael.img}" alt="${COACHES.yael.name}"><div><b>${COACHES.yael.name}</b><span>${COACHES.yael.title}</span><p class="sub">${esc(COACHES.yael.bio)}</p>
        <button class="btn sm teal" data-coach="yael">${icon('play', 'width="16" height="16"')} Hear her</button></div></div>
      <div class="card tight" style="margin-top:16px"><b>What do you need?</b><div class="sub">A mat, and room to spread your arms out to the sides. Comfortable clothes, and bare feet. No other equipment.</div></div>
      <div class="card tight" style="margin-top:10px"><b>What does a class look like?</b><div class="sub">Start seated with breathing, move to standing and balance poses, come down to the mat, and finish with relaxation. Hold each pose for a few breaths — no pain and no competing.</div></div>`
      : pil() ? html`<div class="eyebrow">Step 2 · Your coach</div><div class="q">${esc(COACHES.lia.name)} will guide you</div>
      <div class="coach-solo"><img src="${COACHES.lia.img}" alt="${COACHES.lia.name}"><div><b>${COACHES.lia.name}</b><span>${COACHES.lia.title}</span><p class="sub">${esc(COACHES.lia.bio)}</p>
        <button class="btn sm teal" data-coach="lia">${icon('play', 'width="16" height="16"')} Hear her</button></div></div>
      <div class="card tight" style="margin-top:16px"><b>What do you need?</b><div class="sub">A mat, and room to lie down with arms and legs spread. No other equipment.</div></div>
      <div class="card tight" style="margin-top:10px"><b>What does a class look like?</b><div class="sub">Start with breathing and connecting to your center, continue with a slow sequence of exercises — about a minute each — and finish with a stretch. Lia demonstrates every movement and reminds you what to watch for.</div></div>`
      : hiit() ? html`<div class="eyebrow">Step 2 · Your coach</div><div class="q">${esc(COACHES.lia.name)} will guide you</div>
      <div class="coach-solo"><img src="${COACHES.lia.img}" alt="${COACHES.lia.name}"><div><b>${COACHES.lia.name}</b><span>${COACHES.lia.title}</span><p class="sub">${esc(COACHES.lia.bio)}</p>
        <button class="btn sm teal" data-coach="lia">${icon('play', 'width="16" height="16"')} Hear her</button></div></div>
      <div class="card tight" style="margin-top:16px"><b>What do you need?</b><div class="sub">Two meters of free space and a mat. No equipment — just bodyweight.</div></div>
      <div class="card tight" style="margin-top:10px"><b>What does a workout look like?</b><div class="sub">A short warm-up, then a circuit of five or six exercises: hard work, a short rest, and on to the next. A few rounds, stretching — and done.</div></div>`
      : mob() ? html`<div class="eyebrow">Step 2 · Your coach</div><div class="q">${esc(COACHES.tamar.name)} will guide you</div>
      <div class="coach-solo"><img src="${COACHES.tamar.img}" alt="${COACHES.tamar.name}"><div><b>${COACHES.tamar.name}</b><span>${COACHES.tamar.title}</span><p class="sub">${esc(COACHES.tamar.bio)}</p>
        <button class="btn sm teal" data-coach="tamar">${icon('play', 'width="16" height="16"')} Hear her</button></div></div>
      <div class="card tight" style="margin-top:16px"><b>What do you need?</b><div class="sub">A mat or rug, a free wall and a chair. No other equipment, and the living room works too.</div></div>
      <div class="card tight" style="margin-top:10px"><b>What does a workout look like?</b><div class="sub">Start with slow movement, continue with relaxed 30-second holds, and finish with breathing. Before each workout you choose how much time you have: 10, 20 or 30 minutes.</div></div>`
      : cali() ? html`<div class="eyebrow">Step 2 · Your coach and equipment</div><div class="q">${esc(COACHES.maya.name)} will guide you</div>
      <div class="coach-solo"><img src="${COACHES.maya.img}" alt="${COACHES.maya.name}"><div><b>${COACHES.maya.name}</b><span>${COACHES.maya.title}</span><p class="sub">${esc(COACHES.maya.bio)}</p>
        <button class="btn sm teal" data-coach="maya">${icon('play', 'width="16" height="16"')} Hear her</button></div></div>
      <div class="q" style="font-size:20px;margin-top:18px">What equipment do you have?</div>
      <p class="sub">Mark as many as you like, or none at all — the plan is built from what you have: floor, wall, chair and a sturdy table are enough. Change it anytime in Settings.</p>
      <div class="chips">${Object.entries(EQUIP).map(([id, x]) => `<button class="chip ${d.equip.includes(id) ? 'on' : ''}" data-equip="${id}">${x.name}</button>`).join('')}</div>
      <p class="sub" style="margin-top:12px">${d.equip.length ? d.equip.map((id) => EQUIP[id].desc).join(' · ') : 'No equipment: pulls are done as rows under a table or in a doorframe. A pull-up bar is the first piece worth adding.'}</p>`
      : html`<div class="eyebrow">Step 2 · Your coach</div><div class="q">${mix() ? 'Who will coach you in the gym?' : 'Who will coach you?'}</div>
      <p class="sub">Your coach is with you in every workout: demonstrates each exercise, counts reps, times rests and cheers you on. You can switch anytime.</p>
      <div class="coach-pick">${coachesFor('gym').map((c) => html`
        <button class="coach-card ${d.coach === c.id ? 'on' : ''}" data-coach="${c.id}">
          <img src="${c.img}" alt="${c.name}"><span class="check">✓</span>
          <div class="cap"><b>${c.name}</b><span>${c.title}</span></div></button>`)}</div>
      <p class="sub" style="margin-top:14px">${esc(COACHES[d.coach].bio)}</p>
      ${mix() ? html`<div class="card tight" style="margin-top:6px"><div class="row"><img src="${COACHES.maya.face}" alt="" style="width:46px;height:54px;object-fit:cover;border-radius:12px"><div><div class="eyebrow">And for calisthenics workouts</div><b>${COACHES.maya.name}</b><div class="sub" style="font-size:13px">The combined track has two coaches: ${COACHES[d.coach].name} in the gym, and ${COACHES.maya.name} for calisthenics workouts. ${esc(COACHES.maya.bio)}</div></div></div></div>
      <div class="q" style="font-size:20px;margin-top:16px">What calisthenics equipment do you have?</div>
      <p class="sub">Mark as many as you like, or none at all.</p>
      <div class="chips">${Object.entries(EQUIP).map(([id, x]) => `<button class="chip ${d.equip.includes(id) ? 'on' : ''}" data-equip="${id}">${x.name}</button>`).join('')}</div>` : ''}`),
    // 3 — פרטים
    () => html`<div class="eyebrow">Step 3 · About you</div><div class="q">Nice to meet you</div>
      <label class="field"><span>${undecided() ? 'Address you as' : `${COACHES[d.coach].name} ${fem() ? 'will address' : 'will address'} you as`}</span><div class="seg" data-seg="sex">
        <button data-v="m" class="${d.sex === 'm' ? 'on' : ''}">Male</button><button data-v="f" class="${d.sex === 'f' ? 'on' : ''}">Female</button></div></label>
      <label class="field"><span>${undecided() ? 'Name (what you\'ll be called in workouts)' : `Name (${COACHES[d.coach].name} ${fem() ? 'will call' : 'will call'} you this)`}</span><input class="input" name="name" value="${esc(d.name)}" placeholder="What should we call you?" autocomplete="given-name"></label>
      <div class="grid2">
        <label class="field"><span>Age</span><input class="input num" name="age" type="number" inputmode="numeric" value="${d.age}"></label>
        <label class="field"><span>Height (cm)</span><input class="input num" name="heightCm" type="number" inputmode="numeric" value="${d.heightCm}"></label>
        <label class="field"><span>Current weight (kg)</span><input class="input num" name="weightKg" type="number" inputmode="decimal" step="0.1" value="${d.weightKg}"></label>
        <label class="field"><span>Target weight (kg)</span><input class="input num" name="targetWeight" type="number" inputmode="decimal" step="0.1" value="${d.targetWeight}"></label>
      </div>`,
    // 4 — מטרה
    () => (med() ? html`<div class="eyebrow">Step 4 · The path</div><div class="q">Which path?</div>
      <p class="sub">The path decides which journeys you meet at each stage. You can start a new journey at any time, in Settings.</p>
      <div class="mjp-list">${Object.entries(MJ_PATHS).map(([id, x]) => `<button type="button" class="mjp ${d.mjPath === id ? 'on' : ''}" data-mjpath="${id}" style="background-image:linear-gradient(90deg, rgba(12,10,26,.05), rgba(12,10,26,.82) 60%), url(../assets/med/${x.art}_sq.webp)"><b>${x.name}</b><small>${x.desc}</small></button>`).join('')}</div>`
    : html`<div class="eyebrow">Step 4 · Your goal</div><div class="q">What are we working on?</div>
      ${(undecided() ? ['combat', 'muscle', 'strength', 'cut', 'skill'] : goalsFor(d.track)).map((id) => html`<button class="goal-card ${d.goal === id ? 'on' : ''}" data-goal="${id}">
        <div class="gi">${icon(GOALS[id].icon)}</div><div><b>${GOALS[id].name}</b><span>${goalDesc(id, d.track)}</span></div></button>`)}`),
    // 5 — מבדק רמה
    () => (med() ? html`<div class="eyebrow">Step 5 · Starting point</div><div class="q">How much ${d.sex === 'f' ? 'do you walk' : 'do you walk'} these days?</div>
      <p class="sub">This sets how many of the walks are at a brisk pace. The journey starts calm, and the pace rises from stage to stage.</p>
      <div class="mt-opts" data-mjlevel>${[[1, 'Just starting', 'Hardly walking, or coming back after a long break'], [2, 'Walking regularly', 'Half an hour nonstop without difficulty, a few times a week'], [3, 'Good walking fitness', 'An hour straight at a brisk pace']].map(([v, n, x]) => `<button data-v="${v}" class="${d.mjLevel === v ? 'on' : ''}"><span style="display:grid"><b>${n}</b><span class="sub" style="font-size:12px">${x}</span></span></button>`).join('')}</div>`
      : walk() ? html`<div class="eyebrow">Step 5 · Starting point</div><div class="q">How much ${d.sex === 'f' ? 'do you walk' : 'do you walk'} today?</div>
      <p class="sub">This sets how much of the walk is at a brisk pace. Stay consistent and you move up a level after four weeks.</p>
      <div class="mt-opts" data-walklevel>${[[1, 'Beginners', 'Hardly walking, or coming back after a long break'], [2, 'Regular walkers', 'Half an hour nonstop without difficulty, a few times a week'], [3, 'Fast walkers', 'An hour nonstop at a brisk pace; looking for a challenge']].map(([v, t, x]) => `<button data-v="${v}" class="${d.walkLevel === v ? 'on' : ''}"><span style="display:grid"><b>${t}</b><span class="sub" style="font-size:12px">${x}</span></span></button>`).join('')}</div>`
      : tai() ? html`<div class="eyebrow">Step 5 · Starting point</div><div class="q">How much tai chi have you done?</div>
      <p class="sub">This decides which movements go into your class. Stick with it and you level up after four weeks, with new movements unlocked.</p>
      <div class="mt-opts" data-tailevel>${[[1, 'Fundamentals', 'First time: stance, weight shifting and the first movements'], [2, '8-form', 'You know the fundamentals; adding steps and a low heel kick'], [3, '24-form', 'You practice regularly; adding movements from the long form']].map(([v, t, x]) => `<button data-v="${v}" class="${d.taiLevel === v ? 'on' : ''}"><span style="display:grid"><b>${t}</b><span class="sub" style="font-size:12px">${x}</span></span></button>`).join('')}</div>`
      : yoga() ? html`<div class="eyebrow">Step 5 · Starting point</div><div class="q">How much yoga have you done?</div>
      <p class="sub">This decides which poses go into your class. Stick with it and you level up after four weeks, with new poses unlocked.</p>
      <div class="mt-opts" data-yogalevel>${[[1, 'Get started', 'First time, or after a long break'], [2, 'Intermediate', 'You know the basic poses — Warrior, Downward-facing dog, Cobra'], [3, 'Advanced', 'You practice regularly; ready for arm balances too']].map(([v, t, x]) => `<button data-v="${v}" class="${d.yogaLevel === v ? 'on' : ''}"><span style="display:grid"><b>${t}</b><span class="sub" style="font-size:12px">${x}</span></span></button>`).join('')}</div>`
      : pil() ? html`<div class="eyebrow">Step 5 · Starting point</div><div class="q">How much Pilates have you done?</div>
      <p class="sub">This decides which exercises go into your class. Stick with it and you level up after four weeks, with new exercises unlocked.</p>
      <div class="mt-opts" data-pillevel>${[[1, 'Basic', 'First time, or after a long break'], [2, 'Intermediate', 'You know the basic exercises — including The Hundred and Scissors'], [3, 'Advanced', 'You practice regularly; ready for the Teaser too']].map(([v, t, x]) => `<button data-v="${v}" class="${d.pilLevel === v ? 'on' : ''}"><span style="display:grid"><b>${t}</b><span class="sub" style="font-size:12px">${x}</span></span></button>`).join('')}</div>`
      : hiit() ? html`<div class="eyebrow">Step 5 · Starting point</div><div class="q">What's your fitness level today?</div>
      <p class="sub">This sets the work-to-rest ratio. Better to start low — stick with it and you level up after four weeks.</p>
      <div class="mt-opts" data-hiitlevel>${[[1, 'Beginner', '30 sec work, 30 rest'], [3, 'Fairly fit', '40 sec work, 20 rest'], [5, 'Fit', '45 sec work, 15 rest']].map(([v, t, x]) => `<button data-v="${v}" class="${d.hiitLevel === v ? 'on' : ''}"><span style="display:grid"><b>${t}</b><span class="sub" style="font-size:12px">${x}</span></span></button>`).join('')}</div>
      <label class="field" style="margin-top:14px"><span>Jumps</span><div class="seg" data-seg="hiitLowStr">
        <button data-v="no" class="${!d.hiitLow ? 'on' : ''}">With jumps</button><button data-v="yes" class="${d.hiitLow ? 'on' : ''}">No jumps</button></div>
        <div class="sub" style="font-size:12px;margin-top:4px">${d.hiitLow ? 'Every exercise in a quiet, joint-friendly version — also good for an apartment with neighbors below.' : 'You can switch to the no-jump version on any exercise, even mid-workout.'}</div></label>`
      : run() ? html`<div class="eyebrow">Step 5 · Starting point</div><div class="q">How long ${d.sex === 'f' ? 'can you run' : 'can you run'} nonstop today?</div>
      <p class="sub">Without stopping and without walking. This sets where you start — better to estimate low.</p>
      <div class="mt-opts" data-runbase>${RUN_BASES.map(([v, t]) => `<button data-v="${v}" class="${d.runBase === v ? 'on' : ''}">${t}</button>`).join('')}</div>
      <div class="card tight" style="margin-top:12px"><b>${d.runBase < 30 ? 'Starting with run-walk.' : 'Starting with continuous runs.'}</b><div class="sub">${d.runBase < 30 ? 'Short run segments with walking in between, getting longer every week — up to half an hour of nonstop running. That\'s how the body adapts without injuries.' : 'Easy runs, one quality run a week, and a long run that grows by four minutes every week.'}</div></div>
      <label class="field" style="margin-top:12px"><span>3 km run time (min:sec) — if you know it. You can leave it empty</span><input class="input num" name="run3kStr" placeholder="e.g. 16:30" value="${esc(d.run3kStr)}" inputmode="numeric"></label>`
      : mob() ? html`<div class="eyebrow">Step 5 · Range-of-motion test</div><div class="q">Six short tests</div>
      <p class="sub">At home, no equipment: do each test once, with no warm-up and no forcing, and mark what's closest. Based on the results, ${esc(COACHES.tamar.name)} will decide what to focus on. No time now? You can continue and do the test later, from the Plan screen.</p>
      ${mobTestHtml(d.mobTest)}`
      : cali() ? html`<div class="eyebrow">Step 5 · Level check</div><div class="q">Where ${d.sex === 'f' ? 'do you stand' : 'do you stand'} today?</div>
      <p class="sub">Your answers set the starting step on each ladder. Not ${d.sex === 'f' ? 'sure' : 'sure'}? Better to estimate low — moving up a step happens fast, after one good workout.</p>
      <div class="grid2">
        <label class="field"><span>Push-ups in a row (max)</span><input class="input num" name="pushups" type="number" inputmode="numeric" value="${d.pushups}"></label>
        <label class="field"><span>Squats in a row (max)</span><input class="input num" name="squats" type="number" inputmode="numeric" value="${d.squats}"></label>
        ${d.equip.includes('bar') || d.equip.includes('rings') ? `<label class="field"><span>Pull-ups in a row (max)</span><input class="input num" name="pullups" type="number" inputmode="numeric" value="${d.pullups}"></label>` : ''}
        ${d.equip.includes('pbars') || d.equip.includes('rings') ? `<label class="field"><span>Dips in a row (max)</span><input class="input num" name="dips" type="number" inputmode="numeric" value="${d.dips}"></label>` : ''}
        <label class="field"><span>Plank — how many seconds?</span><input class="input num" name="plankSec" type="number" inputmode="numeric" value="${d.plankSec}"></label>
      </div>
      <div class="card tight" style="margin-top:8px"><b>0 is perfectly fine.</b><div class="sub">Every movement has a first step anyone can do — wall push-ups, hanging from a bar, assisted squats.</div></div>`
      : html`<div class="eyebrow">Step 5 · Level check</div><div class="q">Where ${d.sex === 'f' ? 'do you stand' : 'do you stand'} today?</div>
      <p class="sub">Your answers set the starting difficulty level (1–5). The app will update it automatically based on your performance.</p>
      <label class="field"><span>Gym experience</span><div class="seg" data-seg="years">
        ${[[0, 'None'], [0.5, '6 months'], [1, '1 year+'], [3, '3 years+']].map(([v, t]) => `<button data-v="${v}" class="${d.years == v ? 'on' : ''}">${t}</button>`)}</div></label>
      <div class="grid2">
        <label class="field"><span>Push-ups in a row (max)</span><input class="input num" name="pushups" type="number" inputmode="numeric" value="${d.pushups}"></label>
        <label class="field"><span>Pull-ups in a row (max)</span><input class="input num" name="pullups" type="number" inputmode="numeric" value="${d.pullups}"></label>
      </div>
      ${mix() ? `<div class="grid2">
        <label class="field"><span>Squats in a row (max)</span><input class="input num" name="squats" type="number" inputmode="numeric" value="${d.squats}"></label>
        <label class="field"><span>Plank — how many seconds?</span><input class="input num" name="plankSec" type="number" inputmode="numeric" value="${d.plankSec}"></label>
        ${d.equip.includes('pbars') || d.equip.includes('rings') ? `<label class="field"><span>Dips in a row (max)</span><input class="input num" name="dips" type="number" inputmode="numeric" value="${d.dips}"></label>` : ''}
      </div>` : ''}
      <label class="field"><span>3 km run time (min:sec) — you can leave it empty</span><input class="input num" name="run3kStr" placeholder="e.g. 13:30" value="${esc(d.run3kStr)}" inputmode="numeric"></label>
      <details class="card acc set-sec lifts" ${d.liftsOpen || Object.keys(ANCHOR_LIFTS).some((k) => d[`lift_${k}_w`]) ? 'open' : ''}><summary><span class="grow"><b>${d.sex === 'f' ? 'Know how much you lift' : 'Know how much you lift'}?</b><span class="sub">Optional — so your first workout starts at the right weight</span></span></summary>
        <div class="acc-body"><div class="sub t-foot" style="margin-bottom:8px">One good set from recent weeks: weight × reps. You can fill in only some.</div>
        ${Object.entries(ANCHOR_LIFTS).map(([k, name]) => `<div class="lift-row"><span>${name}</span>
          <input class="input num" name="lift_${k}_w" type="number" inputmode="decimal" placeholder="kg" value="${d[`lift_${k}_w`] || ''}" aria-label="${name} — weight in kg">
          <i>×</i><input class="input num" name="lift_${k}_r" type="number" inputmode="numeric" placeholder="reps" value="${d[`lift_${k}_r`] || ''}" aria-label="${name} — reps"></div>`).join('')}</div></details>`),
    // 6 — לו"ז
    () => html`<div class="eyebrow">Step 6 · Schedule</div><div class="q">How much ${d.sex === 'f' ? 'can you' : 'can you'} train?</div>
      <label class="field"><span>Workouts a week</span><div class="seg" data-seg="days">${(med() ? [2, 3, 4, 5, 6] : cls() ? [2, 3, 4, 5] : [3, 4, 5, 6]).map((v) => `<button data-v="${v}" class="${d.days == v ? 'on' : ''}">${v}</button>`)}</div></label>
      <label class="field"><span>Which days?</span><div class="chips wd-chips">${WD_NAMES.map((n, i) => `<button type="button" class="chip ${wdays().includes(i) ? 'on' : ''}" data-wd="${i}">${n}</button>`).join('')}</div></label>
      <label class="field"><span>What time, usually?</span><input class="input num" type="time" name="schedTime" value="${d.schedTime || '18:00'}" style="max-width:150px"></label>
      <div class="sub" style="font-size:12px;margin:-4px 0 10px">The workout calendar is built from this. Later you can change it, set a different time for each day, move a workout or cancel one.</div>
      ${mix() && !undecided() ? `<label class="field"><span>How many of them calisthenics? (The rest in the gym)</span><div class="seg" data-seg="mixCali">${Array.from({ length: d.days - mobN() - 1 }, (_, i) => i + 1).map((v) => `<button data-v="${v}" class="${mixCaliCount(dm()) === v ? 'on' : ''}">${v}${recMix() === v ? ' ★' : ''}</button>`).join('')}</div>
        <div class="sub" style="font-size:12px;margin-top:4px">★ System recommendation for your goal. You can choose otherwise.</div></label>` : ''}
      ${mob() ? `<label class="field"><span>Usual workout length (minutes)</span><div class="seg" data-seg="mobMin">${[10, 20, 30].map((v) => `<button data-v="${v}" class="${d.mobMin == v ? 'on' : ''}">${v}</button>`).join('')}</div>
        <div class="sub" style="font-size:12px;margin-top:4px">This is just the default — you can choose differently before each workout.</div></label>`
    : med() ? `<label class="field"><span>Usual walk length (minutes)</span><div class="seg" data-seg="medMin">${[20, 30, 45].map((v) => `<button data-v="${v}" class="${d.medMin == v ? 'on' : ''}">${v}</button>`).join('')}</div></label>
      <label class="field"><span>Journey length</span><div class="seg" data-seg="mjWeeks">${MJ_WEEKS.map((v) => `<button data-v="${v}" class="${d.mjWeeks == v ? 'on' : ''}">${v} weeks</button>`).join('')}</div>
        <div class="sub" style="font-size:12px;margin-top:4px">Four equal stages. If you walk in the morning, each week opens with the Morning journey.</div></label>`
    : html`${walk() ? `<label class="field"><span>Usual walk length (minutes)</span><div class="seg" data-seg="walkMin">${[20, 30, 45, 60].map((v) => `<button data-v="${v}" class="${d.walkMin == v ? 'on' : ''}">${v}</button>`).join('')}</div></label>` : tai() ? `<label class="field"><span>Class length (minutes)</span><div class="seg" data-seg="taiMin">${[15, 20, 30].map((v) => `<button data-v="${v}" class="${d.taiMin == v ? 'on' : ''}">${v}</button>`).join('')}</div></label>` : yoga() ? `<label class="field"><span>Class length (minutes)</span><div class="seg" data-seg="yogaMin">${[20, 30, 45].map((v) => `<button data-v="${v}" class="${d.yogaMin == v ? 'on' : ''}">${v}</button>`).join('')}</div></label>` : pil() ? `<label class="field"><span>Class length (minutes)</span><div class="seg" data-seg="pilMin">${[20, 30, 40].map((v) => `<button data-v="${v}" class="${d.pilMin == v ? 'on' : ''}">${v}</button>`).join('')}</div></label>` : hiit() ? `<label class="field"><span>Workout length (minutes)</span><div class="seg" data-seg="hiitMin">${[15, 20, 25].map((v) => `<button data-v="${v}" class="${d.hiitMin == v ? 'on' : ''}">${v}</button>`).join('')}</div></label>` : run() || cls() ? '' : `<label class="field"><span>Workout duration (minutes)</span><div class="seg" data-seg="sessionMin">${[45, 60, 75, 90].map((v) => `<button data-v="${v}" class="${d.sessionMin == v ? 'on' : ''}">${v}</button>`).join('')}</div></label>`}
      <label class="field"><span>Add mobility & flexibility workouts with ${COACHES.tamar.name}?</span><div class="seg" data-seg="mobN">${Array.from({ length: mobMax() + 1 }, (_, i) => `<button data-v="${i}" class="${mobN() === i ? 'on' : ''}">${i === 0 ? 'None' : i}</button>`).join('')}</div>
        <div class="sub" style="font-size:12px;margin-top:4px">${mobN() ? `${mobN() === 1 ? '1 workout' : `${mobN()} workouts`} out of ${d.days} a week ${mobN() === 1 ? 'will be' : 'will be'} mobility (10–30 min), and the rest on the track you chose.` : 'You can also add them later, in Settings.'}</div></label>`}
      ${mob() ? `<div class="card tight" style="margin-top:8px"><b>Short and often beats long and rare.</b><div class="sub">Ten minutes four times a week improves range of motion more than one long workout. The target is about ten minutes a week for each body area.</div></div>`
    : med() ? `<div class="card tight" style="margin-top:8px"><b>Three walks a week is a good start.</b><div class="sub">The last walk of the week is the long one, and it grows by five minutes every week. The last week of each stage is easier.</div></div>`
    : walk() ? `<div class="card tight" style="margin-top:8px"><b>Five walks a week is the goal; three is a good start.</b><div class="sub">The health recommendation is 150 minutes of brisk walking a week. The long walk is built separately and grows by five minutes every week.</div></div>`
    : tai() ? `<div class="card tight" style="margin-top:8px"><b>Three short classes a week, or more.</b><div class="sub">In tai chi, consistency matters more than length: twenty minutes a few times a week builds balance and leg strength.</div></div>`
    : yoga() ? `<div class="card tight" style="margin-top:8px"><b>Two or three classes a week.</b><div class="sub">A short, regular practice beats one long class a week. More is fine too — classes rotate between standing, hips, back and a calm class.</div></div>`
    : pil() ? `<div class="card tight" style="margin-top:8px"><b>Two or three classes a week.</b><div class="sub">That's what most Pilates studies tested, and it's enough to feel a change. More is fine too — classes rotate between core, back and hips.</div></div>`
    : hiit() ? `<div class="card tight" style="margin-top:8px"><b>Up to three hard workouts a week.</b><div class="sub">A body that doesn't recover doesn't improve. Choose four workouts or more and you also get "easy cardio" days between the hard ones — no jumps, at a comfortable pace.</div></div>`
    : run() ? `<div class="card tight" style="margin-top:8px"><b>3 runs a week are enough to start.</b><div class="sub">With a rest day between runs. 4 or more — easy runs are added, and at five a second quality run too. The length of each run is set in the plan.</div></div>`
    : cali() ? `<div class="card tight" style="margin-top:8px"><b>3 workouts a week are enough.</b><div class="sub">That's the standard recommendation for beginners: full body, with a rest day between workouts. 4 or more — workouts split into upper body, legs, push and pull.</div></div>`
    : `<div class="card tight" style="margin-top:8px"><b>Schedule keeps changing?</b><div class="sub">No problem — workouts aren't tied to days of the week. Just do the next one in line. And if there's no gym, there's a "No-equipment workout".</div></div>`}`,
    // 7 — פציעות
    () => html`<div class="eyebrow">Step 7 · Safety</div><div class="q">Any pain or injuries?</div>
      <p class="sub">We'll swap out exercises that could make it worse. If you feel sharp pain — stop and see a doctor.</p>
      <div class="chips">${Object.entries(INJURIES).map(([id, x]) => `<button class="chip no ${d.injuries.includes(id) ? 'on' : ''}" data-inj="${id}">${x.name}</button>`)}</div>
      <p class="sub" style="margin-top:14px">${d.injuries.length ? '' : 'No injuries — great.'}</p>
      ${withFlags() ? `<div class="q" style="font-size:20px;margin-top:8px">${cls() ? 'One more question — any of these?' : 'And before stretching — any of these?'}</div>
        <p class="sub">Exercises that don't suit your condition won't go into ${cls() ? 'your classes' : 'your mobility workouts'}.</p>${flagChips(d.flags)}${flagNotes(d.flags)}` : ''}`,
    // 8 — תזונה
    () => (med() ? html`<div class="eyebrow">Step 8 · Nutrition</div><div class="q">This track has no menu</div>
      <p class="sub">Meditation in Motion is walking and quiet, with no calorie targets and no food diary. If you want nutrition coaching, choose another track in Settings and turn it on there.</p>`
    : html`<div class="eyebrow">Step 8 · Nutrition</div><div class="q">Want nutrition coaching too?</div>
      <p class="sub">A tailored daily menu, calorie and protein targets and a food log. It's optional, and you can turn it on or off anytime on the Nutrition screen.</p>
      <button class="nut-choice ${d.nutrition === true ? 'on' : ''}" data-nut="1"><div class="nc-ico">${icon('food')}</div><div><b>Yes, with nutrition</b><span>A few more short questions, and the menu is built from them.</span></div></button>
      <button class="nut-choice ${d.nutrition === false ? 'on' : ''}" data-nut="0"><div class="nc-ico">${icon('dumbbell')}</div><div><b>Not now — workouts only</b><span>Skips the questions. The Nutrition screen stays off until you turn it on.</span></div></button>
      ${d.nutrition ? html`${nutPrefsHtml(d)}
        <div class="h2 np-h">What don't you eat?</div>
        <div class="chips">${Object.entries(DISLIKE_TAGS).map(([id, t]) => `<button class="chip no ${d.dislikes.includes(id) ? 'on' : ''}" data-dis="${id}">${t}</button>`)}</div>` : ''}`),
    // 9 — המלצת המערכת (רק במצב "תמליצו לי")
    () => {
      const r = rec();
      const isRec = d.track === r.track && (r.track !== 'mix' || mixCaliCount(dm()) === r.mixCali);
      return html`<div class="eyebrow">Step 9 · System recommendation</div><div class="q">${isRec ? 'This is the track that fits you' : 'You chose a different track'}</div>
      <div class="track-card on rec"><div class="tc-img">${(d.track === 'mix' ? ['ori', 'noa', 'maya', 'tamar'].map((c) => COACHES[c]) : coachesFor(d.track)).map((c) => `<img src="${c.face}" alt="">`).join('')}</div>
        <div><b>${TRACKS[d.track].name}</b><span class="tc-sub">${d.track === 'mix' ? `${splitText(d.days - mobN() - mixCaliCount(dm()), mixCaliCount(dm()))} a week` : TRACKS[d.track].sub}</span>
        ${isRec ? r.why.map((w) => `<span class="why">${icon('check', 'width="14" height="14"')} ${esc(w)}</span>`).join('') : `<span>The recommendation was: ${TRACKS[r.track].name}${r.track === 'mix' ? ` (${splitText(d.days - r.mixCali, r.mixCali)})` : ''}.</span>`}</div></div>
      ${isRec ? '' : `<button class="btn sm teal" data-rec>${icon('sparkle', 'width="16" height="16"')} Back to the system recommendation</button>`}
      ${d.track === 'mix' ? `<label class="field" style="margin-top:14px"><span>How many of the workouts are calisthenics?</span><div class="seg" data-seg="mixCali">${Array.from({ length: d.days - mobN() - 1 }, (_, i) => i + 1).map((v) => `<button data-v="${v}" class="${mixCaliCount(dm()) === v ? 'on' : ''}">${v}${r.track === 'mix' && r.mixCali === v ? ' ★' : ''}</button>`).join('')}</div></label>` : ''}
      ${!['cali', 'mob', 'hiit', 'pil', 'yoga', 'tai', 'walk', 'med'].includes(d.track) ? html`<div style="font-weight:700;margin:14px 0 8px">${d.track === 'run' ? 'Who will run with you?' : 'Who will coach you in the gym?'}</div>
        <div class="coach-pick mini">${coachesFor(d.track === 'run' ? 'run' : 'gym').map((c) => `<button class="coach-card ${d.coach === c.id ? 'on' : ''}" data-coach="${c.id}"><img src="${c.img}" alt="${c.name}"><span class="check">✓</span><div class="cap"><b>${c.name}</b></div></button>`).join('')}</div>` : ''}
      <div style="font-weight:700;margin:16px 0 8px">${d.sex === 'f' ? 'Prefer' : 'Prefer'} something else?</div>
      <div class="seg" data-pick-track>${['gym', 'cali', 'run', 'walk', 'med', 'hiit', 'pil', 'yoga', 'tai', 'mob', 'mix'].map((k) => `<button data-v="${k}" class="${d.track === k ? 'on' : ''}">${TRACKS[k].name}</button>`).join('')}</div>
      <p class="sub" style="font-size:12px;margin-top:8px">The recommendation is a starting point. You can change track and split anytime in Settings.</p>`;
    },
    // 10 — בנייה
    () => html`<div class="build-anim"><div class="core"></div>
      <div class="h1" style="font-size:24px">${esc(COACHES[d.coach].name)} ${fem() ? 'is building' : 'is building'} your plan…</div>
      <ul id="buildList">
        ${med() ? '<li>Choosing the journeys for each stage</li><li>Setting how many walks are brisk</li><li>Builds a long walk that grows every week</li><li>Laying the journey out over the weeks</li>'
    : walk() ? '<li>Sets how much of the walk is brisk</li><li>Builds a long walk that grows every week</li><li>Schedules walking intervals</li><li>Calculating nutrition targets and menu</li>'
    : tai() ? '<li>Choosing movements for your level</li><li>Adapting to injuries and your condition</li><li>Building classes for the week</li><li>Calculating nutrition targets and menu</li>'
    : yoga() ? '<li>Choosing poses for your level</li><li>Adapting to injuries and your condition</li><li>Building classes for the week</li><li>Calculating nutrition targets and menu</li>'
    : pil() ? '<li>Choosing exercises for your level</li><li>Adapting to injuries and your condition</li><li>Building classes for the week</li><li>Calculating nutrition targets and menu</li>'
    : hiit() ? '<li>Setting the work-to-rest ratio</li><li>Adapting exercises to injuries</li><li>Building circuits for the week</li><li>Calculating nutrition targets and menu</li>'
    : run() ? `<li>${d.runBase < 30 ? 'Setting your run-walk starting stage' : 'Setting running paces'}</li><li>Building a long run that grows every week</li><li>Mixing easy and quality runs</li><li>Calculating nutrition targets and menu</li>`
    : mob() ? `<li>${testDone() ? 'Analyzing the range-of-motion test' : 'Balancing all body areas'}</li><li>Adapting exercises to injuries and your condition</li><li>Building a week of mobility workouts</li><li>Calculating nutrition targets and menu</li>`
    : cali() ? '<li>Setting a starting step on each ladder</li><li>Adapting exercises to equipment and injuries</li><li>Choosing first skills</li><li>Building a week of workouts</li><li>Calculating nutrition targets and menu</li>'
    : '<li>Analyzing fitness level and goals</li><li>Adapting exercises to machines and injuries</li><li>Building a 12-week training cycle</li><li>Adding a running plan to improve your 3 km</li><li>Calculating nutrition targets and menu</li>'}</ul></div>`,
  ];

  // ימי האימון: מה שסומן, כל עוד מספרם תואם ל"אימונים בשבוע"; אחרת פיזור ברירת מחדל
  const wdays = () => (d.schedDays && d.schedDays.length === Number(d.days) ? d.schedDays : WD_SPREAD[d.days] || [0, 2, 4]);
  function readInputs() {
    root.querySelectorAll('input[name]').forEach((i) => {
      d[i.name] = i.type === 'number' ? Number(i.value) : i.value.trim();
    });
  }

  // קיר המאמנים בשער: השורות נגללות לאט (שורה ב' בכיוון ההפוך). נגיעה עוצרת לרגע, ואפשר לגלול באצבע
  function gateDrift() {
    const wall = root.querySelector('.gate-wall');
    if (!wall || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rows = [...wall.querySelectorAll('.gate-row')].map((el) => ({ el, dir: el.classList.contains('b') ? -1 : 1, x: null }));
    let hold = 0, last = 0;
    const touch = () => { hold = performance.now() + 2500; for (const r of rows) r.x = null; };
    wall.addEventListener('touchstart', touch, { passive: true }); wall.addEventListener('touchmove', touch, { passive: true }); wall.addEventListener('wheel', touch, { passive: true });
    const tick = (t) => {
      if (!wall.isConnected) return;
      const dt = Math.min(64, t - (last || t)); last = t;
      if (t > hold) for (const r of rows) {
        const half = r.el.scrollWidth / 2; if (!r.el.offsetWidth || half < 50) continue;
        if (r.x == null) r.x = r.el.scrollLeft || (r.dir < 0 ? half : 0);
        r.x += r.dir * dt * 0.034;
        if (r.x >= half) r.x -= half; else if (r.x <= 0) r.x += half;
        r.el.scrollLeft = r.x;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function paint() {
    // משולב שנבחר ידנית: עד שהמתאמן נוגע בחלוקה, היא לפי המלצת המערכת (ומתעדכנת כשמשנים ימים או מטרה)
    if (d.track === 'mix' && !d.auto && !d.mixTouched) d.mixCali = recMix();
    const isBuild = step === BUILD;
    const last = step === (d.auto ? REC : REC - 1); // השלב האחרון לפני בניית התוכנית
    root.innerHTML = html`<div class="ob">
      ${step > 0 && !isBuild ? `<div class="steps">${Array.from({ length: STEPS - 2 }, (_, i) => `<i class="${i < step ? 'f' : ''}"></i>`).join('')}</div>` : ''}
      <div class="content">${views[step]()}</div>
      ${isBuild ? '' : html`<div class="actions">
        ${step > 0 ? '<button class="btn" data-act="back">Back</button>' : ''}
        <button class="btn primary block xl" data-act="next">${step === 0 ? 'Beginners' : last ? 'Build my plan' : step === REC - 1 ? 'To the recommendation' : 'Continue'}</button></div>
        ${step === 0 ? `<button class="gate-guide" data-act="guide">${icon('info', 'width="16" height="16"')} How does it work? A quick explanation</button><button class="gate-guide gate-lang" data-act="lang" lang="${OTHER.code}">${OTHER.label}</button>` : ''}`}
    </div>`;
    // הסעיף נשאר פתוח גם כשהמסך מצויר מחדש (למשל אחרי בחירת ניסיון)
    root.querySelector('details.lifts')?.addEventListener('toggle', (e) => { d.liftsOpen = e.target.open; });
    if (step === 0) gateDrift();
    if (isBuild) runBuild();
  }

  on(root, 'click', '[data-act]', (e, t) => {
    unlock();
    readInputs();
    if (t.dataset.act === 'guide') { location.hash = '#/guide'; return; }
    if (t.dataset.act === 'lang') { setLang(OTHER.code); return; }
    if (t.dataset.act === 'back') { if (step === REC) { d.decided = false; d.goal = d.goalWanted || d.goal; } step--; paint(); return; }
    if (root.querySelector('[data-nut]') && d.nutrition == null) { toast('Want nutrition coaching? Choose yes or no'); return; }
    if (step === 3 && !d.name) { toast('What\'s your name?'); return; }
    if (step === 5 && !cali() && !mob() && !hiit() && !cls() && d.run3kStr && !parse3k(d.run3kStr)) { toast('Time format: minutes:seconds, e.g. 13:30'); return; }
    if (step === REC - 1) {
      if (!d.auto) { step = BUILD; paint(); return; }
      const r = rec(); decide(r.track, r.mixCali);       // נכנסים לשלב ההמלצה עם ההמלצה מוחלת
    }
    step++; paint();
  });
  on(root, 'click', '[data-coach]', (e, t) => {
    unlock(); readInputs();
    d.coach = t.dataset.coach;
    if (!COACHES[d.coach].track) d.gymCoach = d.coach; // רק אורי/נועה הם מאמני חדר הכושר
    if (COACHES[d.coach].track === 'run') d.runCoach = d.coach;
    set((s) => { s.profile = s.profile || {}; s.profile.coach = d.coach; return s; });
    stop(); say(d.coach === 'or' ? 'med_hi' : pil() ? 'pil_hello' : `hello_${d.coach}`, { priority: true });   // לאור אין hello_or — משפט ההיכרות הקצר שלה הוא med_hi
    paint();
  });
  on(root, 'click', '[data-lohem]', () => { if (importFromLohem()) { toast('Data from "HOD" copied'); done(); } });
  on(root, 'click', '[data-track]', (e, t) => {
    readInputs();
    d.auto = t.dataset.track === 'auto'; d.decided = false;
    if (d.auto) { d.goalWanted = d.goal; paint(); return; }
    delete d.goalWanted;
    d.track = t.dataset.track;
    d.coach = cali() ? 'maya' : mob() ? 'tamar' : run() ? (d.runCoach || 'guy') : hiit() || pil() ? 'lia' : yoga() ? 'yael' : tai() ? 'mei' : walk() ? 'shira' : med() ? 'or' : (d.gymCoach || 'ori');
    d.goal = goalForTrack(d.goal, d.track);
    if (cls() && d.days > 3 && !d.daysTouched) d.days = 3;
    if (hiit() && d.days > 3 && !d.daysTouched) d.days = 3;
    if (run() && d.days > 3 && !d.daysTouched) d.days = 3;
    if (cali() && d.days > 3 && !d.daysTouched) d.days = 3;
    set((s) => { s.profile = s.profile || {}; s.profile.coach = d.coach; return s; });
    paint();
  });
  on(root, 'click', '[data-equip]', (e, t) => { readInputs(); toggle(d.equip, t.dataset.equip); paint(); });
  on(root, 'click', '[data-goal]', (e, t) => { d.goal = t.dataset.goal; if (d.auto) d.goalWanted = d.goal; paint(); });
  on(root, 'click', '[data-pick-track] button', (e, t) => { decide(t.dataset.v); paint(); });
  on(root, 'click', '[data-rec]', () => { const r = rec(); decide(r.track, r.mixCali); paint(); });
  on(root, 'click', '[data-seg] button', (e, t) => {
    readInputs();
    const v = t.dataset.v;
    d[t.closest('[data-seg]').dataset.seg] = Number.isNaN(Number(v)) ? v : Number(v);
    if (t.closest('[data-seg]').dataset.seg === 'days') d.daysTouched = true;
    if (t.closest('[data-seg]').dataset.seg === 'mixCali') d.mixTouched = true;
    if (t.closest('[data-seg]').dataset.seg === 'hiitLowStr') d.hiitLow = v === 'yes';
    paint();
  });
  on(root, 'click', '[data-wd]', (e, t) => {
    readInputs();
    const i = Number(t.dataset.wd), cur = wdays(), next = (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]).sort();
    const opts = [...root.querySelectorAll('[data-seg="days"] button')].map((b) => Number(b.dataset.v));
    if (!opts.includes(next.length)) { toast(`You can pick between ${Math.min(...opts)} and ${Math.max(...opts)} days`); return; }
    d.schedDays = next; d.days = next.length; d.daysTouched = true;
    paint();
  });
  on(root, 'click', '[data-inj]', (e, t) => { toggle(d.injuries, t.dataset.inj); paint(); });
  on(root, 'click', '[data-runbase] button', (e, t) => { readInputs(); d.runBase = Number(t.dataset.v); paint(); });
  on(root, 'click', '[data-pillevel] button', (e, t) => { d.pilLevel = Number(t.dataset.v); paint(); });
  on(root, 'click', '[data-yogalevel] button', (e, t) => { d.yogaLevel = Number(t.dataset.v); paint(); });
  on(root, 'click', '[data-walklevel] button', (e, t) => { d.walkLevel = Number(t.dataset.v); paint(); });
  on(root, 'click', '[data-mjlevel] button', (e, t) => { d.mjLevel = Number(t.dataset.v); paint(); });
  on(root, 'click', '[data-mjpath]', (e, t) => { d.mjPath = t.dataset.mjpath; root.querySelectorAll('[data-mjpath]').forEach((x) => x.classList.toggle('on', x === t)); });   // בלי ציור מחדש: המסך לא מהבהב בכל בחירה
  on(root, 'click', '[data-tailevel] button', (e, t) => { d.taiLevel = Number(t.dataset.v); paint(); });
  on(root, 'click', '[data-hiitlevel] button', (e, t) => { d.hiitLevel = Number(t.dataset.v); paint(); });
  on(root, 'click', '[data-flag]', (e, t) => { toggle(d.flags, t.dataset.flag); paint(); });
  bindMobTest(root, d.mobTest);
  on(root, 'click', '[data-dis]', (e, t) => { toggle(d.dislikes, t.dataset.dis); paint(); });
  on(root, 'click', '[data-nut]', (e, t) => { d.nutrition = t.dataset.nut === '1'; paint(); });
  bindNutPrefs(root, on, (mutate) => { mutate(d); paint(); });

  function runBuild() {
    const items = [...root.querySelectorAll('#buildList li')];
    items.forEach((li, i) => setTimeout(() => li.classList.add('ok'), 450 * (i + 1)));
    setTimeout(() => {
      const run3k = parse3k(d.run3kStr);
      const hM = (d.heightCm || 175) / 100;
      const caliState = anyCali() ? newCali({ pushups: d.pushups, pullups: mix() || d.equip.includes('bar') || d.equip.includes('rings') ? d.pullups : 0, squats: d.squats,
        dips: d.equip.includes('pbars') || d.equip.includes('rings') ? d.dips : 0, plankSec: d.plankSec, bmi: d.weightKg / (hM * hM) }, d.equip) : null;
      const mobState = withMob() ? { ...newMob(testDone() ? d.mobTest : null, d.flags), minutes: d.mobMin } : null;
      const level = med() ? d.mjLevel : walk() ? d.walkLevel : tai() ? d.taiLevel : yoga() ? d.yogaLevel : pil() ? d.pilLevel : hiit() ? d.hiitLevel : run() ? runLevelFrom3k(run3k) : mob() ? mobLevel(mobState) : caliState && cali() ? caliLevel(caliState) : estimateLevel({ years: d.years, pushups: d.pushups, pullups: d.pullups, run3k });
      const profile = {
        track: d.track, ...(d.auto ? { gymAccess: d.gymAccess } : {}), ...(caliState ? { cali: caliState } : {}), ...(mobState ? { mob: mobState, mobN: mobN() } : {}), ...(mix() ? { mixCali: mixCaliCount(dm()) } : {}), gymCoach: d.gymCoach || 'ori', ...(run() ? { runBase: d.runBase, runCoach: d.coach } : {}), ...(hiit() ? { hiitMin: d.hiitMin, hiitLow: d.hiitLow } : {}), ...(pil() ? { pilMin: d.pilMin, pilFlags: [...d.flags] } : {}), ...(yoga() ? { yogaMin: d.yogaMin, yogaFlags: [...d.flags] } : {}), ...(tai() ? { taiMin: d.taiMin, taiFlags: [...d.flags] } : {}), ...(walk() ? { walkMin: d.walkMin } : {}), ...(med() ? { medMin: d.medMin, medPace: 'calm', medJ: { path: d.mjPath, weeks: d.mjWeeks, level: d.mjLevel, time: mjTime(), start: new Date().toISOString() } } : {}),
        coach: d.coach, name: d.name, age: d.age, sex: d.sex, heightCm: d.heightCm, weightKg: d.weightKg, targetWeight: d.targetWeight,
        goal: d.goal, level, days: d.days, sessionMin: d.sessionMin, run3k, runLevel: runLevelFrom3k(run3k), injuries: d.injuries,
        nutrition: med() ? false : d.nutrition !== false, ...(d.nutrition ? { diet: d.diet, kosher: d.kosher, mealsN: d.mealsN, allergies: d.allergies, health: d.health, ...(d.eatAt === 'service' ? { eatAt: 'service' } : {}) } : {}),
        dislikes: d.nutrition ? d.dislikes : [], dislikedFoods: [], createdAt: new Date().toISOString(),
        lifts: liftsFrom((k, f) => d[`lift_${k}_${f}`]),
      };
      set((s) => {
        s.profile = profile;
        s.plan = createPlan(profile);
        s.reminders = { enabled: false, id: null, ...(s.reminders || {}), settings: { ...defaultReminderSettings(profile), ...(s.reminders?.settings || {}), workout: { on: true, days: [...wdays()], time: d.schedTime || '18:00' } } };
        s.planSeen = false; // המסך הבא: הצגת התוכנית (views/plan-intro.js)
        s.weights = [{ date: today(), kg: d.weightKg }];
        s.events = [{ type: 'coach', text: med() ? `The journey is ready! ${MJ_PATHS[d.mjPath].name}, ${d.mjWeeks} weeks, ${d.days} walks a week.` : walk() ? `Your walking plan is ready! ${d.days} walks a week, ${d.walkMin} minutes for a usual walk.` : tai() ? `Your tai chi plan is ready! ${d.days} classes a week, ${d.taiMin} min each.` : yoga() ? `Your yoga plan is ready! ${d.days} classes a week, ${d.yogaMin} min each.` : pil() ? `Your Pilates plan is ready! ${d.days} classes a week, ${d.pilMin} min each.` : hiit() ? `Your HIIT plan is ready! ${d.hiitMin} min per workout, ${d.days} times a week.` : run() ? `Your running plan is ready! Goal: ${GOALS[d.goal].name}. ${d.runBase < 30 ? 'Starting with run-walk.' : 'Starting with continuous runs.'}` : mob() ? `Your plan is ready! ${GOALS[d.goal].name}.${testDone() ? ` Range-of-motion score: ${mobScore(mobState)} out of 100.` : ' The range-of-motion test is waiting on the Plan screen.'}` : mix() ? `Your combined plan is ready! ${splitText(d.days - mobN() - mixCaliCount(dm()), mixCaliCount(dm()))} a week.` : caliState ? `Your plan is ready! ${GOALS[d.goal].name}. A starting step is set on each ladder — you can view and change it on the Plan screen.` : `Your plan is ready! Level ${level} — ${LEVEL_NAMES[level]}. ${GOALS[d.goal].name}.`, date: new Date().toISOString() }];
        return s;
      });
      done();
    }, 450 * (items.length + 1) + 300);
  }

  paint();
}

function toggle(arr, v) { const i = arr.indexOf(v); i >= 0 ? arr.splice(i, 1) : arr.push(v); }

// אוסף את ההרמות הידועות מהטופס: { bench_press: { w, reps }, ... } — רק שורות שמולאו במלואן ובטווח סביר
export function liftsFrom(get) {
  const out = {};
  for (const k of Object.keys(ANCHOR_LIFTS)) {
    const w = Number(get(k, 'w')), reps = Math.round(Number(get(k, 'r')));
    if (w > 0 && w <= 400 && reps >= 1 && reps <= 30) out[k] = { w, reps };
  }
  return out;
}

export function parse3k(str) {
  if (!str) return null;
  const m = String(str).trim().match(/^(\d{1,2})[:.](\d{2})$/);
  if (!m) return null;
  const sec = Number(m[1]) * 60 + Number(m[2]);
  return sec >= 8 * 60 && sec <= 30 * 60 ? sec : null;
}
