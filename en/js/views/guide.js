// מדריך שימוש: נפתח אוטומטית בפתיחה הראשונה, ואפשר לפתוח שוב בכל רגע (כפתור "?" במסך הבית / מסך המאמן / #/guide).
import { html, el, on, icon, em, ib } from '../ui/dom.js';
import { BRAND } from '../brand.js';
import { COACHES } from '../data/coaches.js';
import { get, set } from '../store.js';
import { unlock } from '../coach/voice.js';
import { platform, platformName, installSteps, installOneLine } from '../install.js';

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

const step = (n, t, d) => `<div class="g-step"><span class="g-n num">${n}</span><div><b>${t}</b>${d ? `<span>${d}</span>` : ''}</div></div>`;
const tip = (i, t) => `<div class="g-tip">${em(i, 'acc', 'sm')}<div>${t}</div></div>`;

function slides() {
  const p = get().profile;
  const coach = COACHES[p?.coach || 'ori'];
  return [
    {
      // שקף פתיחה בעיצוב משלו: ארבעת המאמנים, שם האפליקציה ושלוש הבטחות קצרות
      id: 'welcome', hero: true,
      visual: `<div class="g-trio">${[['ori', 'Gym'], ['maya', 'Calisthenics'], ['shira', 'Running'], ['lia', 'HIIT']].map(([c, t]) => `<figure><img src="${COACHES[c].img}" alt=""><figcaption><b>${COACHES[c].name}</b><span>${t}</span></figcaption></figure>`).join('')}</div>`,
      body: `<div class="g-brand">${BRAND.name}</div><h2>A personal coach for every track, at every level</h2>
        <div class="g-feats">
          <div>${ib('dumbbell', 'pri')}<span><b>One track or a mix</b>Gym, calisthenics, running, walking, HIIT, Pilates, yoga, tai chi, mobility — or several together</span></div>
          <div>${ib('vol', 'acc')}<span><b>A coach who talks to you</b>Demonstrates every exercise, counts reps and times rests</span></div>
          <div>${ib('chart', 'ok')}<span><b>A plan that progresses with you</b>Changes by itself based on your performance</span></div>
        </div>
        <p class="g-note">The guide takes a minute. You can always come back to it from Settings.</p>`,
    },
    {
      id: 'install', title: 'Step 1 · Install on your phone', eyebrow: 'One time',
      visual: `${em('📲', 'pri', 'xl')}`,
      body: (standalone() ? tip('✅', 'The app is already installed on your Home Screen. Great!') : '') +
        `<div class="sub" style="font-size:13px;margin:0 0 4px">Instructions for your device: <b>${platformName()}</b></div>` +
        installSteps().map(([t, d], i) => step(i + 1, t, d)).join('') +
        tip('📱', `<b>On another device?</b> ${['ios-safari', 'ios-chrome', 'android'].filter((p) => p !== platform()).map(installOneLine).join(' ')}`) +
        tip('🔄', 'The app <b>updates itself</b> — no need to download anything again.') +
        tip('🔔', 'Only the installed app can turn on <b>reminders</b> (workout, water, weigh-in): Settings → Reminders.') +
        tip('📴', 'Works without reception too (after the first launch).'),
    },
    {
      id: 'setup', title: 'Step 2 · First setup', eyebrow: '2 minutes',
      visual: `${em('⚙️', 'pri', 'xl')}`,
      body: step(1, 'Choose a track and a coach', 'Gym (Ori or Noa), calisthenics with Maya, running (Guy or Shira), HIIT or Pilates with Lia, yoga with Yael, tai chi with Mei, mobility & flexibility with Tamar, or a mix of them. You can change it later — from Home too, with the "My track" button') +
        step(2, 'Personal details', 'Form of address (male/female), name, age, height, weight and target weight') +
        step(3, 'Goal', 'General fitness / mass / strength / fat loss') +
        step(4, 'Level check', 'Max push-ups and pull-ups, 3 km time — answer honestly. If you know how much you lift on bench press, squat and deadlift you can add it (optional) — and your first workout will start at the right weight') +
        step(5, 'Schedule', 'How many workouts a week and how many minutes each') +
        step(6, 'Injuries', 'Exercises that don\'t suit you won\'t go into the plan') +
        step(7, 'Nutrition coaching — only if you want it', 'Choose "Yes" or "Workouts only". If you choose yes, you answer a few short questions: diet type, kosher, number of meals, allergies and what you don\'t eat. You can turn it on or off later') +
        tip('🎯', 'No need to be exact — <b>your level updates automatically</b> based on your performance.'),
    },
    {
      id: 'run', title: 'Running track', eyebrow: 'From 5 km to a half marathon',
      visual: `<div class="g-coach"><img src="${COACHES.guy.img}" alt=""></div>`,
      body: tip('🧭', '<b>Three goals</b>: a first 5 km, 10 km or a half marathon. Choose a coach — Guy or Shira — and say how long you can run nonstop today.') +
        tip('🚶', '<b>Beginner? Run-walk</b>: short run segments with walking in between, getting longer every week up to half an hour nonstop. Your coach tells you in your earphones when to run and when to walk.') +
        tip('📈', '<b>The full plan</b>: easy runs at a conversational pace, one quality run a week, and a long run that grows by four minutes every week. Every fourth week is easier.') +
        tip('⏱️', '<b>3 km test</b> once a month updates your target paces. Distance and pace are measured by the phone\'s GPS; a heart-rate watch adds zone-based training.') +
        tip('🤸', 'You can add a <b>mobility workout</b> with Tamar to your running week — in Settings → Mobility & flexibility. Want running alongside weights? The gym track already includes runs.'),
    },
    {
      id: 'hiit', title: 'HIIT track', eyebrow: '15 to 25 minutes',
      visual: `<div class="g-coach"><img src="${COACHES.lia.img}" alt=""></div>`,
      body: tip('⚡', '<b>Short and intense</b>: a warm-up, a circuit of five or six bodyweight exercises, a few rounds, and stretching. No equipment — two meters of free space and a mat.') +
        tip('⏱️', '<b>Work and rest</b>: Lia tells you when to start and when to rest. The ratio is set by level: 30/30 for beginners, up to 45/15 for advanced.') +
        tip('🤫', '<b>No jumps</b>: every jumping exercise has a quiet, joint-friendly version. Choose in advance in Settings, or switch mid-exercise with a tap.') +
        tip('🛌', '<b>Up to three hard workouts a week</b>. Train more and you get "easy cardio" days in between — because the body improves at rest, not in the workout.') +
        tip('📈', 'Complete most of your workouts and you <b>level up</b> after four weeks. You can also add a mobility workout with Tamar.'),
    },
    {
      id: 'pil', title: 'Pilates track', eyebrow: 'Mat classes',
      visual: `<div class="g-coach"><img src="${COACHES.lia.img}" alt=""></div>`,
      body: tip('🧘', '<b>A 20, 30 or 40 minute class</b>: breathing and connecting to your center, a slow sequence of exercises — about a minute each — and a stretch to finish. Just a mat.') +
        tip('🎯', '<b>Three levels</b>: basic, intermediate and advanced. The level decides which exercises go in; complete most of your classes and you level up after four weeks.') +
        tip('🔄', '<b>Classes rotate</b> between core, back and posture, and hips and glutes — so the whole week is balanced.') +
        tip('⚠️', '<b>Quality before quantity</b>: a small, precise movement is better. If your neck strains — rest your head down. If you\'re pregnant, have osteoporosis or a joint replacement, mark it in Settings, and exercises that don\'t suit you are taken out of the class.'),
    },
    {
      id: 'walk', title: 'Walking track', eyebrow: 'Guided walks, with music',
      visual: `<div class="g-coach"><img src="${COACHES.shira.img}" alt=""></div>`,
      body: tip('👟', '<b>A walk of 20 to 60 minutes</b>: warm-up, the main part and a cool-down. Shira guides you in your earphones — when to speed up, when to ease off and when a minute is left.') +
        tip('⚡', '<b>Three kinds</b>: brisk walk, intervals (power stretches with recovery between them), and a long walk that grows by five minutes every week.') +
        tip('🎵', '<b>Music at walking pace</b>: the note button on the walk screen.') +
        tip('🧭', '<b>Shira coaches to your pace</b>: GPS measures distance and pace and draws your route on a map. Too slow in a brisk segment — she asks you to pick it up; too fast in recovery — to ease off.') +
        tip('🎯', '<b>Three levels</b>: beginners, regular walkers and fast walkers. Complete most of your walks and you move up a level after four weeks.'),
    },
    {
      id: 'tai', title: 'Tai chi track', eyebrow: 'Slow movement, balance and breathing',
      visual: `<div class="g-coach"><img src="${COACHES.mei.img}" alt=""></div>`,
      body: tip('☯️', '<b>A 15, 20 or 30 minute class</b>: a short warm-up, an opening stance, slow movements in a high stance, and a closing stance. No equipment — just a chair or wall within reach.') +
        tip('👣', '<b>Step by step</b>: Mei demonstrates every movement from the front and the side, and explains it as you practice. Small steps, knee over foot, no pain.') +
        tip('🎯', '<b>Three levels</b>: fundamentals, the 8-form, and movements from the 24-form. Complete most of your classes and you level up after four weeks.') +
        tip('⚠️', '<b>Safety</b>: in balance movements, keep one hand on a chair. If you\'re pregnant, have osteoporosis or a joint replacement, mark it in Settings, and movements that don\'t suit you are taken out of the class.'),
    },
    {
      id: 'yoga', title: 'Yoga track', eyebrow: 'Breathing, poses and relaxation',
      visual: `<div class="g-coach"><img src="${COACHES.yael.img}" alt=""></div>`,
      body: tip('🧘', '<b>A 20, 30 or 45 minute class</b>: sitting and breathing, standing and balance poses, down to the mat, and relaxation to finish. Just a mat.') +
        tip('🌬️', '<b>Hold and breathe</b>: each pose lasts a few breaths. Yael tells you when to come in, when to switch sides and when to release.') +
        tip('🎯', '<b>Three levels</b>: beginner, intermediate and advanced. Complete most of your classes and you level up after four weeks, with new poses unlocked.') +
        tip('⚠️', '<b>No pain and no competing</b>: go only as far as you can still breathe calmly. If you\'re pregnant, have osteoporosis or a joint replacement, mark it in Settings, and poses that don\'t suit you are taken out of the class.'),
    },
    {
      id: 'mob', title: 'Mobility & flexibility track', eyebrow: 'Mat and wall',
      visual: `<div class="g-coach"><img src="${COACHES.tamar.img}" alt=""></div>`,
      body: tip('🧭', '<b>A track of its own, or an add-on</b>: you can train with Tamar only, or add one to three mobility workouts to the week of any other track — in <b>Settings → Mobility & flexibility</b>.') +
        tip('⏱️', '<b>To fit the time you have</b>: before each workout you choose 10, 20 or 30 minutes. Start with slow movement, continue with relaxed 30-second holds on each side, and finish with breathing.') +
        tip('🎯', '<b>Range-of-motion test</b>: six short at-home tests. Workouts then focus on the areas that need it most, and after four weeks you test again and see what improved.') +
        tip('📈', '<b>About ten minutes a week per area</b> — that\'s the target. Short and often beats long and rare; the Progress screen shows how much each area got.') +
        tip('⚠️', '<b>Pleasant stretch only</b>: no pain and no bouncing. If you\'re pregnant, have osteoporosis, a joint replacement or hypermobility — mark it in Settings, and exercises that don\'t suit you are taken out of your workouts.'),
    },
    {
      id: 'cali', title: 'Calisthenics track', eyebrow: 'Bodyweight',
      visual: `<div class="g-coach"><img src="${COACHES.maya.img}" alt=""></div>`,
      body: tip('🧭', '<b>Three options</b>: gym, calisthenics, or <b>combined</b> — some of the week\'s workouts in the gym and some with bodyweight, each with its own coach. Choose in <b>Settings → Your track</b>; your history is kept.') +
        tip('🚀', '<b>Ladders instead of weights</b>: every movement has a ladder from easy to hard (e.g. push-ups on a wall → on the knees → full → diamond → one-arm). When all sets reach the top target — you move up a step automatically.') +
        tip('🎯', '<b>Skills</b>: L-sit and handstand are open from the start. Muscle-up, levers, planche and human flag unlock when the base is ready. Turn them on and off on the <b>Plan screen</b>.') +
        tip('🎒', '<b>Works without equipment too</b> — floor, wall, chair and a sturdy table. A pull-up bar opens the pull ladder and the levers; mark your equipment in Settings.') +
        tip('⚠️', '<b>Slow is fast</b>: in straight-arm skills you stay at least 3 weeks on each step, because tendons strengthen more slowly than muscle. Sharp joint pain — stop.'),
    },
    {
      id: 'home', title: 'Home screen', eyebrow: 'Every day',
      visual: `<div class="g-mock"><div class="gm-card"><small>Next workout</small><b>Upper body A</b><span class="gm-btn">Start workout</span></div>
        <div class="gm-row"><span class="gm-ring num">64%</span><div><b>Today's nutrition</b><small>780 kcal left · next meal</small></div></div></div>`,
      body: tip('🎯', '<b>Next workout</b> — always at the top of the screen. Not tied to days of the week: just do the next one.') +
        tip('🍽️', '<b>Today\'s nutrition</b> — calories left, protein, carbs and fat, and the next meal. Shown if you chose nutrition coaching; a tap opens the Nutrition screen.') +
        tip('💧', '<b>Four tiles</b> — water, weight, readiness and fitness. One tap on a tile.') +
        tip('🧭', '<b>My track</b> — the button at the top, next to the greeting. Switch track, or add classes from another discipline to your week (yoga, Pilates, tai chi, HIIT, running and more) and keep your current track too. The workout schedule and nutrition targets update together, and a summary is shown.') +
        tip('📊', '<b>Your fitness</b> — a score from 0 to 100 made up of strength, endurance, consistency and body. At first (and after a reset) it\'s empty and marked "Not measured yet" — that\'s normal. Each part fills in when it has data: <b>Strength</b> after a strength workout, <b>Endurance</b> after a 3 km test, <b>Body</b> after a second weigh-in.') +
        tip('💪', 'Want a strength estimate right now? Enter your lifts in <b>Settings → Profile and goals</b>.') +
        tip('🎒', '<b>No gym?</b> The "No-equipment workout" button.') +
        tip('⚙️', `<b>The Settings button at the top</b> — switch coach, light/dark look, language (עברית / English), watch, backup and this guide.`),
    },
    {
      id: 'workout', title: 'How to train with your coach', eyebrow: 'Most important',
      visual: `<div class="g-mock"><div class="gm-tempo"><span class="num">4</span><small>of 10</small></div><div class="gm-phase"><span class="ph-ico go-down">${icon('phDown')}</span>Down &nbsp;·&nbsp; <span class="ph-ico go-up">${icon('phUp')}</span>Up</div></div>`,
      body: step(0, 'Quick check-in', '4 questions (sleep, energy, pain, load) — your coach adjusts today\'s load') + step(1, 'Guided warm-up', '5 short movements — your coach demonstrates and counts, and moves on to the next one automatically') +
        step(2, 'Watch the demo', 'Set weight and reps with + / −. "Explain" = form cues') +
        step(3, 'Tap "Start set"', 'Your coach counts "3, 2, 1… go!" — and you start together') +
        step(4, 'Work at your coach\'s pace', '"Down… up!" + the number of each rep. The video moves exactly in time') +
        step(5, 'Rate the set', 'Easy / Good / Hard / To the limit — the weight goes up or down accordingly') +
        step(6, 'Rest', 'A countdown timer. "Skip" or "+30" as needed') +
        tip('🧘', 'At the end of the workout — <b>stretches for the muscles you worked</b>. You can skip them.') +
        tip('🔁', '<b>Machine taken?</b> "Swap exercise". <b>Prefer no counting?</b> "Done without counting".') +
        tip('🔊', 'Turn the volume up. Voice works even when the phone is on silent. If there\'s no sound — tap the screen once.') +
        tip('🎵', '<b>Background music</b>: the note button at the top of the workout screen, or Settings → Background music. The music changes with the character of the exercise, and lowers itself when your coach speaks.') +
        tip('📸', '<b>Share your workout</b>: on the summary screen, "Share your workout" makes an image with the workout name, time and numbers — to send on WhatsApp or post as a story. Without your name and without body data.') +
        tip('📺', '<b>TV mode</b>: when training at home you can turn the phone sideways (or tap the screen icon at the top) and mirror the screen to a TV — AirPlay on iPhone, Cast on Android. The demo on one side, a big clock on the other.'),
    },
    {
      id: 'run', title: 'Running', eyebrow: 'Built into the plan',
      visual: `${em('🏃', 'pri', 'xl')}`,
      body: tip('', 'Intervals, tempo and easy runs — your coach announces every segment ("Sprint!", "Walk", "One more minute").') +
        tip('📡', 'Allow <b>location access</b> — distance and pace from GPS, and a<b>map with your route</b> in place of the video (the compass button switches between them; tap the map to see the whole route). At the end: the route, average pace and the time for each kilometer. Keep the screen on.') +
        tip('🏁', 'In the fourth week of every block — <b>3 km test</b>. Your coach detects it automatically when you reach 3 km.') +
        tip('❤', 'Have a Garmin watch? You can connect live heart rate or import runs (Settings → Garmin).'),
    },
    {
      id: 'progress', title: 'The plan progresses with you', eyebrow: 'Automatic',
      visual: `<div class="g-mock"><div class="gm-bars"><i style="height:30%"></i><i style="height:45%"></i><i style="height:55%"></i><i style="height:75%"></i><i class="on" style="height:95%"></i></div></div>`,
      body: tip('📈', '<b>Completed all your reps?</b> Next time the weight goes up. Too hard? It goes down.') +
        tip('🗓️', 'Every 4 weeks = a block: base → build → peak → deload. After each block — <b>a level assessment</b>.') +
        tip('📊', 'The "Progress" screen: <b>a weekly summary</b> against last week, weight with a trend, strength (1RM), running, and a weekly muscle map.') +
        tip('✏️', 'Logged something wrong? Tap a workout in History — <b>edit or delete</b>.') +
        tip('🎖️', 'XP and ranks: Beginners → Regulars → … → Studio legend.'),
    },
    {
      id: 'food', title: 'Nutrition', eyebrow: 'Fuel for training',
      visual: `${em('🍽️', 'pri', 'xl')}`,
      body: tip('🎯', 'A daily calorie and protein target calculated from your weight and goal.') +
        tip('📒', '<b>Today</b>: "Add food" — search 600+ foods, with recents and favorites, or <b>a barcode scan</b> of a packaged product. On the <b>Menu tab</b>: "I ate it" logs a whole meal.') +
        tip('🍱', 'Menu by place: <b>At home</b>, <b>At work</b> (cafeteria or restaurant) and <b>On the go</b> (no kitchen). Every meal is a <b>real dish</b> with quantities, fitted to that day\'s target.') +
        tip('🔁', '<b>Doesn\'t suit you?</b> Tap the dish name to swap the whole dish, or an item to swap just that. "Another menu" builds a new day.') +
        tip('🪖', '<b>In service?</b> In Preferences choose "In service", and the menu is built from what the dining hall and the field offer — with "Dining hall", "In the field" and "At home" tabs.') +
        tip('🚫', 'On the <b>Preferences tab</b>: diet type (everything / vegetarian / vegan), kosher, number of meals, allergies and "What I don\'t eat" — whatever is marked won\'t appear in the menu. No vegetables? There are tips to make up for it.') +
        tip('⚖️', '<b>Nutrition coaching is a choice</b>: if you skipped it in onboarding you can turn it on from the Nutrition screen, and turn it off too. If you\'re pregnant, breastfeeding, have a medical condition, are under 18 or underweight, there is no calorie-deficit target — mark it in Preferences.'),
    },
    {
      id: 'go', title: 'Ready?', eyebrow: 'One more thing',
      visual: `<div class="g-coach"><img src="${coach.img}" alt=""></div>`,
      body: tip('💪', '<b>Consistency beats intensity.</b> 3 good workouts a week beat 6 half workouts.') +
        tip('😴', 'Sleep, water and protein — half your progress happens outside the gym.') +
        tip('⚠️', 'Sharp pain = stop. Medical clearance is recommended before starting a training plan.') +
        tip('💾', 'Your data is stored only on your phone. The app will remind you to back up once a month — the file is saved in Files or iCloud.'),
    },
  ];
}

// renderGuide: מסך מלא. onDone נקרא בסיום/דילוג.
export function openGuide({ onDone, first = false } = {}) {
  document.querySelector('.guide')?.remove();
  const S = slides();
  let i = 0;
  const root = el(`<div class="guide" role="dialog" aria-label="User guide">
    <div class="g-top"><div class="g-dots">${S.map(() => '<i></i>').join('')}</div><button class="g-skip" data-g="skip">${first ? 'Skip' : 'Close ✕'}</button></div>
    <div class="g-track">${S.map((s) => html`<section class="g-slide ${s.hero ? 'g-hero' : ''}" data-id="${s.id}"><div class="g-visual">${s.visual}</div>
      <div class="g-body">${s.hero ? s.body : `<div class="eyebrow">${s.eyebrow}</div><h2>${s.title}</h2>${s.body}`}</div></section>`).join('')}</div>
    <div class="g-nav"><button class="btn" data-g="prev">Previous</button><button class="btn primary xl" data-g="next">Next</button></div></div>`);
  document.body.append(root);
  document.body.style.overflow = 'hidden';
  const track = root.querySelector('.g-track');

  const paint = () => {
    root.querySelectorAll('.g-dots i').forEach((d, j) => d.classList.toggle('on', j <= i));
    root.querySelector('[data-g="prev"]').style.display = i ? '' : 'none'; // בשקף הראשון כפתור "הבא" ברוחב מלא
    root.querySelector('[data-g="next"]').textContent = i === S.length - 1 ? (first ? 'Let\'s start' : 'Done ✓') : 'Next';
  };
  const at = () => Math.round(Math.abs(track.scrollLeft) / (track.clientWidth || 1));
  // מעבר בכפתור: בזמן ההחלקה המונפשת לא מסנכרנים את המיקום מהגלילה (אחרת עצירה רגעית מחזירה לשקף הקודם),
  // ואם ההנפשה לא הגיעה ליעד (קורה באייפון, עם scroll-snap) — קופצים אליו בלי הנפשה. כך לחיצה אחת תמיד מספיקה.
  let st, nav = 0;
  const go = (n) => {
    i = Math.max(0, Math.min(S.length - 1, n));
    const target = i;
    clearTimeout(st); clearTimeout(nav);
    track.children[i].querySelector('.g-body').scrollTop = 0;
    track.children[i].scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    paint();
    nav = setTimeout(() => {
      nav = 0;
      if (i === target && at() !== target) {
        track.style.scrollSnapType = 'none';
        track.children[target].scrollIntoView({ behavior: 'auto', inline: 'start', block: 'nearest' });
        requestAnimationFrame(() => { track.style.scrollSnapType = ''; });
      }
    }, 600);
  };
  // החלקה באצבע מעדכנת את המיקום
  track.addEventListener('scroll', () => {
    if (nav) return;
    clearTimeout(st);
    st = setTimeout(() => {
      const n = at();
      if (!nav && n !== i) { i = n; paint(); }
    }, 120);
  }, { passive: true });
  // נגיעה באצבע במסלול מבטלת את ההמתנה: מכאן המיקום שוב נקבע לפי הגלילה
  track.addEventListener('touchstart', () => { clearTimeout(nav); nav = 0; }, { passive: true });

  const close = () => {
    set((s) => { s.guideSeen = true; return s; });
    root.remove();
    document.body.style.overflow = '';
    onDone?.();
  };
  on(root, 'click', '[data-g]', (e, b) => {
    unlock();
    const a = b.dataset.g;
    if (a === 'skip') close();
    if (a === 'prev') go(i - 1);
    if (a === 'next') (i === S.length - 1 ? close() : go(i + 1));
  });
  paint();
}
