// כל המשפטים שהמאמן הווירטואלי אומר. נוצרים מראש כקבצי MP3 ב-ElevenLabs (tools/gen_voice.mjs)
// ומושמעים בזמן האימון. ערך יכול להיות מחרוזת (זהה לשני המאמנים) או {ori, noa} כשיש הבדל בין המאמנים.
// FEMALE: גרסת פנייה למתאמנת (קובץ key__f.mp3). NAME_LINES: משפטים עם שם המתאמן (../assets/voice/<coach>/names/<slug>/).
import { EXERCISES, EX } from './exercises.js';
import { COACHES } from './coaches.js';
import { MOB_TIPS } from './mob-exercises.js';
import { HIIT_TIPS } from './hiit-exercises.js';
import { PIL_TIPS } from './pil-exercises.js';
import { YOGA_TIPS } from './yoga-exercises.js';
import { TAI_SAY } from './tai-exercises.js';

const NUM = ['', 'One!', 'Two!', 'Three!', 'Four!', 'Five!', 'Six!', 'Seven!', 'Eight!', 'Nine!', 'Ten!',
  'Eleven!', 'Twelve!', 'Thirteen!', 'Fourteen!', 'Fifteen!', 'Sixteen!', 'Seventeen!', 'Eighteen!', 'Nineteen!', 'Twenty!'];

export const ORDINAL_SET = ['', 'First set', 'Second set', 'Third set', 'Fourth set', 'Fifth set', 'Sixth set'];

const lines = {
  // ספירה
  ...Object.fromEntries(NUM.slice(1).map((t, i) => [`n${i + 1}`, `${t}!`])),
  // טמפו
  down: 'Down...', up: 'Up!', hold: 'Hold!', pull: 'Pull!', press: 'Press!', release: 'Release slowly...', slow_down: 'Slowly down...', push: 'Drive up!',
  // סטים
  ...Object.fromEntries(ORDINAL_SET.slice(1).map((t, i) => [`set${i + 1}`, `${t}.`])),
  last_set: '[excited] Last set! Give it everything!',
  two_more: 'Two more! Don\'t give up!', last_rep: '[excited] Last rep!',
  go: 'Three, two, one... let\'s go!',
  set_done: 'Very nice! Set done.',
  rest: 'Rest. Drink some water and breathe deep.',
  rest_30: 'Thirty seconds left.', rest_10: 'Ten seconds left, get ready.',
  next_ex: 'Next exercise.',
  hold_start: 'Start the hold... now!', hold_half: 'Halfway! Keep going!', hold_done: 'That\'s it! Release.',
  rate_set: 'How was that set? Mark it for me.',
  weight_up: 'I noticed that was easy. Next time I\'m raising the weight.',
  form_first: 'Remember — technique before weight. Always.',
  // פתיחה וסיום
  hello_ori: '[excited] Hey! I\'m Ori, your personal coach. Today we work hard. Let\'s get started!',
  hello_noa: '[excited] Hi! I\'m Noa, your personal coach. Today we work hard. Let\'s get started!',
  hello_maya: '[excited] Hi! I\'m Maya, your calisthenics coach. Here we build body control, step by step. Let\'s begin!',
  warmup: 'We start with a warm-up. Five minutes on a cardio machine at an easy pace, then joint mobility.',
  workout_start: 'The workout begins. I\'m here for every set.',
  workout_done: '[excited] Workout complete! Incredible work. Remember to eat some protein within the hour.',
  pr: '[excited] New personal record! You\'re a machine!',
  streak: 'A workout streak! That\'s how fitness is built.',
  cooldown: 'Cool-down and stretching. Five minutes, slow breaths.',
  // מוטיבציה
  m1: 'You\'re stronger than you think.',
  m2: 'Every rep brings you closer to the goal.',
  m3: 'That pain is weakness leaving the body.',
  m4: 'Consistency beats talent. Today too.',
  m5: 'Breathe, focus, and one more.',
  m6: 'I can see the progress. Keep it up!',
  m7: 'Hard in training — easy in life.',
  m8: 'You\'re not training for today. You\'re training for the years ahead.',
  m9: 'This is exactly where others stop. You keep going.',
  m10: 'Well done. Seriously.',
  // ריצה
  run_warm: 'Warm-up: brisk walk and an easy jog.',
  run_fast: '[excited] Fast run! Strong pace!',
  run_easy: 'Easy jog. Settle your breathing.',
  run_walk: 'Walk. Breathe deep.',
  run_steady: 'Steady pace. Keep your breathing even.',
  run_tempo: 'Tempo pace. Hard but under control.',
  run_half: 'Halfway there! Keep it strong!',
  run_min: 'One more minute!',
  run_last: '[excited] Last segment! Everything you\'ve got left!',
  run_done: '[excited] Run complete! Well done!',
  run_cool: 'Cool-down. Easy walk and stretching.',
  // שעון / דופק / GPS
  watch_on: 'The watch is connected. I can see your heart rate.',
  hr_ready: 'Your heart rate has recovered. You\'re ready for the next set.',
  hr_high: 'Your heart rate is still high. Take a few more seconds.',
  zone_up: 'Your heart rate is below target. Pick it up a little.',
  zone_down: 'Your heart rate is above target. Slow down a little and breathe.',
  run_km: 'Another kilometer done!',
  run_3k: '[excited] Three kilometers! Test complete!',
  // חימום ומתיחות
  warm_intro: 'We start with a dynamic warm-up. Five short movements — follow me.',
  warm_go: 'Let\'s begin!',
  switch_side: 'Switch sides!',
  warm_done: '[excited] Warm-up complete. Now let\'s get to work!',
  cool_intro: 'Cool-down and stretching. Breathe slowly and let go.',
  cool_done: 'Stretching complete. Your body will thank you tomorrow.',
  // צ׳ק־אין
  checkin_low: 'Got it. Today we\'ll ease the load a little and keep the quality. That\'s part of the plan.',
  checkin_high: '[excited] Great energy! Today we go all in!',
  // ───── משפטים בהקשר (js/coach/context.js): נאמרים רק כשהתנאי נכון, ולא יותר מפעם בשבועיים. ניטרליים למין המתאמן ─────
  ctx_first: 'This is our first workout. We go slowly and learn the movements.',
  ctx_back: 'Good to be back. We start easy — the body remembers.',
  ctx_third: 'Third workout this week. That\'s what consistency looks like.',
  ctx_weeklast: 'One more workout, and the week is done.',
  ctx_early: 'A morning workout. The day is already off to a good start.',
  ctx_late: 'A workout at the end of a long day. Well done for showing up.',
  ctx_after_pr: 'Last time a record was broken. Today we hold that level.',
  ctx_after_hard: 'Last time was hard. Today we work with a bit more control.',
  ctx_easy: 'Too easy? We add on the next set.',
  ctx_max: 'That was everything. Now breathe until the rest is over.',
  ctx_half: 'Half the workout is behind us. The second half always goes faster.',
  ctx_last_ex: 'Last exercise. Finish clean.',
  ctx_resume: 'We\'re back. Picking up where we left off.',
  ctx_swap: 'All good, we adapt. What matters is that the muscle works.',
  ctx_week_done: 'The week is done. Tomorrow is rest — it\'s part of the training.',
  ctx_long: 'That was a long workout. Drink water and eat something.',
  ctx_n10: 'This is our tenth workout together.',
  ctx_n50: 'Fifty workouts together. This is a way of life now.',
  ctx_n100: '[excited] A hundred workouts together! Well done.',
  ctx_short: 'A short workout counts too. See you next time.',
  // קליסתניקס (מאיה בלבד)
  skill_intro: 'We start with skill work, while the body is fresh. Quality before quantity.',
  rung_up: '[excited] You\'ve moved up the ladder! From the next workout — a harder variation.',
  rung_wait: 'Target reached. We stay on this step a little longer, to give your tendons time to get stronger.',
};
const CALI_ONLY = ['skill_intro', 'rung_up', 'rung_wait'];
// מוביליטי (תמר בלבד)
Object.assign(lines, {
  hello_tamar: 'Hi, I\'m Tamar, your mobility and flexibility coach. Today we move slowly, breathe, and let the body open up. Let\'s begin.',
  mob_intro: 'We open with gentle movement, to warm up the joints.',
  mob_hold: 'Now the holds. Breathe slowly, and let go a little more with every exhale.',
  mob_again: 'One more round of the same movement.',
  mob_breathe: 'Long exhale. Let go a little more.',
  mob_no_pain: 'A comfortable stretch only. If it hurts, ease out of the position a little.',
  mob_close: 'We finish with breathing. Let the body rest.',
});
// HIIT (ליה)
Object.assign(lines, {
  hello_lia: '[excited] Hi! I\'m Lia. Today\'s workout is short and intense — give everything during the work, and really rest during the rest. Let\'s go!',
  hiit_go: 'Work!',
  hiit_10: 'Ten more seconds!',
  hiit_round: 'New round. Hold the pace.',
  hiit_last: '[excited] Last round! Give it everything!',
  hiit_low: 'Switching to the no-jump version. Same effort.',
});
// פילאטיס (ליה): פתיחה וסיום משלה, ומשפטי הרצף (אותם מפתחות mob_* של המוביליטי, בנוסח שלה — ראו COACH_LINES)
Object.assign(lines, {
  pil_hello: 'Hi, I\'m Lia. Today is Pilates: slow, precise movement that comes from the center. Let\'s begin.',
  pil_half: 'Halfway. Keep the same control.',
  pil_done: 'Nice. Release.',
});
// יוגה (יעל): משפטי הרצף באותם מפתחות mob_* של המוביליטי, בנוסח שלה — ראו COACH_LINES
lines.hello_yael = 'Hello, I\'m Yael, your yoga teacher. Today we breathe, move slowly, and listen to the body. Let\'s begin.';
// טאי צ'י (מיי): משפטי הרצף באותם מפתחות mob_*, בנוסח שלה; ההנחיות בזמן התרגול הן tc_* (הקריינות מהריפו taichi)
lines.hello_mei = 'Hello, I\'m Mei, your tai chi teacher. Today we practice slowly, in small steps, and in comfort. Let\'s begin.';
for (const [id, text] of Object.entries(TAI_SAY)) lines[`tc_${id}`] = text;
const PIL_ONLY = ['pil_hello', 'pil_half', 'pil_done'];
const HIIT_ONLY = ['hiit_go', 'hiit_10', 'hiit_round', 'hiit_last', 'hiit_low'];
const HIIT_SAYS = ['n1', 'n2', 'n3', 'warm_intro', 'warm_go', 'switch_side', 'warm_done', 'cool_intro', 'cool_done', 'next_ex', 'hold_half', 'hold_done', 'workout_start', 'workout_done', 'streak',
  'm2', 'm4', 'm5', 'm6', 'm9', 'm10', 'checkin_low', 'checkin_high'];
// ריצה (גיא ושירה)
Object.assign(lines, {
  hello_guy: '[excited] Hi! I\'m Guy, your running coach. Today we hit the road — at the right pace, step by step. Let\'s go!',
  hello_shira: '[excited] Hi! I\'m Shira, your running coach. Today we run smart: easy most of the time, and enjoying the way. Let\'s go!',
  run_long: 'Long run. Conversation pace, no rushing. Today we build endurance.',
  run_form: 'Shoulders relaxed, eyes forward, short, light steps.',
  run_breathe: 'If you can\'t talk, slow down a little. That\'s exactly the right pace.',
});
const RUN_ONLY = ['run_long', 'run_form', 'run_breathe'];
// הליכה (שירה): מה שנאמר רק במסלול ההליכה
Object.assign(lines, {
  walk_hello: 'Hi! I\'m Shira. Today we\'re heading out for a walk — at the right pace, with a clear head. Let\'s go!',
  walk_warm: 'We start with an easy walk to warm up the body.',
  walk_stroll: 'Easy walk. Breathe, and let your shoulders drop.',
  walk_brisk: 'Brisk walk! Short, quick steps, and let your arms work.',
  walk_power: 'Now power walk! As fast as you can — without running.',
  walk_last: 'Last power interval! Give it everything.',
  walk_cool: 'Slow down. An easy walk to finish.',
  walk_half: 'Halfway there! Keep the same pace.',
  walk_form: 'Back tall, eyes forward, arms swinging by your sides.',
  walk_talk: 'A good pace is one where you can talk, but not sing.',
  walk_done: '[excited] Walk complete! Well done!',
  // לפי הקצב שנמדד ב-GPS
  walk_pace_up: 'The pace has dropped a little. Pick it up — quicker steps, arms working.',
  walk_pace_good: 'Great pace! Just like that — keep going.',
  walk_pace_easy: 'Now ease off. Breathe deep and let your heart rate come down.',
  walk_km: 'Another kilometer behind us! Very nice.',
  walk_free: 'A free walk — your pace, your route. I\'ll count the kilometers.',
});
const WALK_ONLY = ['walk_hello', 'walk_warm', 'walk_stroll', 'walk_brisk', 'walk_power', 'walk_last', 'walk_cool', 'walk_half', 'walk_form', 'walk_talk', 'walk_done', 'walk_pace_up', 'walk_pace_good', 'walk_pace_easy', 'walk_km', 'walk_free'];
// מה אומרים מאמני הריצה: כל משפטי הריצה והדופק, ספירה לאחור, פתיחה וסיום — בלי סטים, משקלים ותרגילים
const RUN_SAYS = ['n1', 'n2', 'n3', 'go', 'workout_start', 'streak', 'pr', 'm2', 'm4', 'm5', 'm6', 'm8', 'm10', 'watch_on', 'zone_up', 'zone_down', 'checkin_low', 'checkin_high'];
const MOB_ONLY = ['mob_intro', 'mob_hold', 'mob_again', 'mob_breathe', 'mob_no_pain', 'mob_close'];
// המשפטים הכלליים שגם תמר אומרת (אין אצלה ספירת חזרות, סטים, משקלים או ריצה)
const MOB_SAYS = ['n1', 'n2', 'n3', 'warm_go', 'switch_side', 'next_ex', 'hold_half', 'hold_done', 'workout_start', 'workout_done', 'streak', 'm10'];

// שמות תרגילים — "התרגיל הבא: ..."
for (const e of EXERCISES) lines[`ex_${e.id}`] = e.say || `${e.name}. ${e.cues[0]}.`;
// דגש ביצוע שני לכל תנועת חימום/מתיחה — נאמר כמה שניות אחרי "מתחילים!", כדי שהמאמן ידריך ולא רק יספור
export const MOBILITY_TIPS = {
  jumping_jacks: 'Arms all the way overhead, at an easy, steady rhythm.',
  arm_circles: 'Big, controlled circles. Switch direction halfway.',
  leg_swings: 'Straight leg forward and back. The range grows gradually.',
  inchworm: 'Walk your hands out to a plank, and come back slowly.',
  bw_squat: 'Heels on the floor, arms forward for balance.',
  high_knees: 'Arms pumping in rhythm. Rhythmic breathing.',
  quad_stretch: 'Knees together, hips slightly forward.',
  hamstring_stretch: 'Long back. Go deeper with every exhale.',
  hip_flexor_stretch: 'Squeeze your glutes and push your hips forward. Torso upright.',
  chest_stretch: 'Rotate your torso gently. No pain, just a stretch.',
  shoulder_stretch: 'Shoulders down, away from your ears.',
  child_pose: 'Arms reaching forward. Slow breaths into your back.',
  wrist_prep: 'Gentle pressure only, no pain. Turn to the sides as well.',
  scap_pushup: 'Arms straight the whole time. Only the shoulder blades move.',
};
Object.assign(MOBILITY_TIPS, MOB_TIPS, HIIT_TIPS, PIL_TIPS, YOGA_TIPS);
for (const [id, text] of Object.entries(MOBILITY_TIPS)) lines[`tip_${id}`] = text;

export const VOICE_LINES = lines;

// משפטים בנוסח של מאמן מסוים (גוברים על הנוסח הכללי). מאיה מדברת על שליטה, סבלנות וטכניקה.
// הנוסחים האלה ניטרליים למין המתאמן, ולכן אין להם גרסת נקבה.
export const COACH_LINES = {
  maya: {
    streak: 'A workout streak! That\'s how body control is built.',
    m3: 'Slow and clean beats fast and sloppy.',
    m4: 'Every step on the ladder is built on the one before. Patience.',
    m7: 'First control, then strength, and only then speed.',
    m8: 'Today, one more second in the hold. That\'s how you go far.',
    workout_start: 'The workout begins. I\'m here for every set.',
  },
  // ליה: קצרה וחדה. הנוסחים ניטרליים למין המתאמן.
  lia: {
    hold_half: 'Halfway! Keep it strong!', hold_done: 'Rest!', next_ex: 'Next exercise.',
    workout_start: 'The workout begins. Short, intense, and I\'m with you all the way.',
    workout_done: '[excited] Workout complete! Now water, and a deep breath.',
    streak: 'A workout streak! Twenty minutes a day, and it adds up.',
    warm_intro: 'We start with a short warm-up. Three movements, then to work.',
    m9: 'This is where most people slow down. Keep going a little longer.', m6: 'The progress is showing. Keep it up!',
    // פילאטיס: משפטי הרצף
    mob_intro: 'We start with the breath. Find your center — every movement comes from there.',
    mob_hold: 'Now a hold. Breathe, and the center works.',
    mob_again: 'One more round, with the same control.',
    mob_breathe: 'Long exhale. Draw the belly in.',
    mob_no_pain: 'Quality before quantity. A small, precise movement is better.',
    mob_close: 'We\'re finishing. Let the body lengthen and rest.',
  },
  // מאמני הריצה: בלי "לאכול חלבון" ובלי חדר כושר
  guy: { workout_start: 'We\'re heading out for a run. I\'m with you all the way.', streak: 'A workout streak! That\'s how endurance is built — run after run.' },
  shira: { workout_start: 'We\'re heading out for a run. I\'m with you all the way.', streak: 'A workout streak! That\'s how endurance is built — run after run.' },
  // יעל: שקטה ואיטית. הנוסחים ניטרליים למין המתרגל.
  yael: {
    warm_go: 'Let\'s begin.', switch_side: 'Switch sides.', next_ex: 'Next pose.',
    hold_half: 'Keep breathing.', hold_done: 'And release slowly.',
    workout_start: 'The class begins. Listen to your breath.',
    workout_done: 'Class complete. Thank you for practicing.',
    streak: 'A practice streak! A few minutes on the mat every day, and it adds up.',
    m10: 'Every breath on the mat counts.',
    mob_intro: 'We begin seated. Close your eyes, and listen to your breath.',
    mob_hold: 'Stay in the pose. The breath is slow and quiet.',
    mob_again: 'Return to the pose once more.',
    mob_breathe: 'Long exhale. Relax your shoulders and your face.',
    mob_no_pain: 'No pain. Go only as far as you can still breathe calmly.',
    mob_close: 'We finish with relaxation. Let the body rest.',
  },
  // מיי: איטית וסבלנית. הנוסחים ניטרליים למין המתרגל.
  mei: {
    warm_go: 'Let\'s begin.', switch_side: 'Switch sides.', next_ex: 'Next movement.',
    hold_half: 'Continue slowly.', hold_done: 'And return to standing.',
    workout_start: 'The class begins. Slowly, and in comfort.',
    workout_done: 'Class complete. Well done for today.',
    streak: 'A practice streak! A few minutes every day — that\'s what builds balance.',
    m10: 'Every practice counts, even the short ones.',
    mob_intro: 'Let\'s stand quietly for a moment. Two deep breaths. Keep a chair or a wall within reach.',
    mob_hold: 'Stay standing. The breath is slow and quiet.',
    mob_again: 'And once more, a little smoother.',
    mob_breathe: 'Inhale as the arms rise. Exhale as they lower.',
    mob_no_pain: 'Knee over the foot. Only a slight bend. If it hurts, straighten up.',
    mob_close: 'And now we finish. Slowly, all the way to the end.',
  },
  // תמר מדברת לאט וברוגע, בלי לדחוף. הנוסחים ניטרליים למין המתאמן.
  tamar: {
    warm_go: 'Let\'s begin.', switch_side: 'Switch sides.', next_ex: 'Next movement.',
    hold_half: 'Halfway. Keep breathing.', hold_done: 'Nice. Release slowly.',
    workout_start: 'The workout begins. Slowly, and with the breath.',
    workout_done: 'Workout complete. Your body will thank you tomorrow.',
    streak: 'A workout streak! That\'s how range of motion is built — a little every day.',
  },
};
const coachTrack = (coach) => COACHES[coach]?.track || 'gym';
// האם המאמן אומר את המשפט הזה בכלל (לא מייצרים ולא מורידים קליפים שלא יושמעו לעולם)
// משפטים בהקשר: לכל מאמן נוסח שמתאים לאופי ולתחום שלו
Object.assign(COACH_LINES.yael, {
  ctx_first: 'This is our first class. There\'s no rush — just listen to your body.', ctx_back: 'Good to be back on the mat. We start gently.', ctx_third: 'Third class this week. The body already feels it.',
  ctx_weeklast: 'One more class, and the week is complete.', ctx_early: 'A morning practice. A good way to open the day.', ctx_late: 'An evening practice. Letting go of the day that was.',
  ctx_half: 'Half the class is behind us. We continue with the same breath.', ctx_last_ex: 'Last pose. Stay with the breath.', ctx_resume: 'Coming back. One breath, and we continue.',
  ctx_week_done: 'The week is complete. Tomorrow we rest.', ctx_long: 'That was a long class. Drink water and rest a little.', ctx_n10: 'This is our tenth class together.', ctx_n50: 'Fifty classes together. This is a path now.', ctx_n100: 'A hundred classes together. Thank you for the journey.',
  ctx_short: 'A short practice is still a practice. See you soon.',
});
Object.assign(COACH_LINES.mei, {
  ctx_first: 'This is our first practice. Slowly, in small steps.', ctx_back: 'Good to be back. We start slowly, as always.', ctx_third: 'Third practice this week. This is how balance is built.',
  ctx_weeklast: 'One more practice, and the week is complete.', ctx_early: 'A morning practice. The body wakes up slowly.', ctx_late: 'An evening practice. Calming the body for the night.',
  ctx_half: 'Half the practice is behind us. We continue slowly.', ctx_last_ex: 'Last movement. Slowly, all the way through.', ctx_resume: 'Coming back. Slowly, and we continue.',
  ctx_week_done: 'The week is complete. Tomorrow we rest.', ctx_long: 'That was a long practice. Drink water and sit for a moment.', ctx_n10: 'This is our tenth practice together.', ctx_n50: 'Fifty practices together. This is a good habit now.', ctx_n100: 'A hundred practices together. Well done for sticking with it.',
  ctx_short: 'A short practice counts too. See you soon.',
});
Object.assign(COACH_LINES.tamar, {
  ctx_first: 'This is our first session. We move slowly, and only as far as feels comfortable.', ctx_back: 'Good to be back. We start gently — the range comes back quickly.', ctx_half: 'Halfway there. We continue slowly, and breathe.',
  ctx_last_ex: 'Last exercise. Slowly, with the breath.', ctx_resume: 'Coming back. A breath, and we continue.', ctx_week_done: 'The week is done. Tomorrow we let the body rest.', ctx_short: 'Even a few minutes are good for the body. See you soon.',
});
Object.assign(COACH_LINES.guy, { ctx_first: 'This is our first run. An easy pace, no rush.', ctx_back: 'Good to be running again. We start easy — the legs remember.', ctx_long: 'That was a long run. Drink water and eat something.' });
// מי אומר איזה משפט־הקשר: דירוג סט והחלפת תרגיל — רק במסלולים שיש בהם סטים (חדר כושר וקליסתניקס); השאר — כולם
const CTX_SETS = ['ctx_easy', 'ctx_max', 'ctx_swap'];

export function coachSays(key, coach) {
  const track = coachTrack(coach), cali = track === 'cali';
  if (key.startsWith('ctx_')) return !CTX_SETS.includes(key) || track === 'gym' || cali;
  const all = COACHES[coach]?.tracks || [track];   // מאמנת של שני מסלולים (ליה: HIIT ופילאטיס)
  if (key.startsWith('hello_')) return key === `hello_${coach}`;
  if (key.startsWith('tc_')) return track === 'tai';
  if (WALK_ONLY.includes(key)) return all.includes('walk');
  if (key.startsWith('ex_') || key.startsWith('tip_')) { const e = EX[key.replace(/^(ex|tip)_/, '')]; return !!e && e.tracks.some((t) => all.includes(t)); }
  if (PIL_ONLY.includes(key)) return all.includes('pil');
  if (MOB_ONLY.includes(key) && all.includes('pil')) return true;
  if (track === 'yoga' || track === 'tai') return MOB_ONLY.includes(key) || MOB_SAYS.includes(key);
  if (HIIT_ONLY.includes(key)) return track === 'hiit';
  if (track === 'hiit') return HIIT_SAYS.includes(key);
  if (RUN_ONLY.includes(key)) return track === 'run';
  if (track === 'run') return key.startsWith('run_') || RUN_SAYS.includes(key);
  if (MOB_ONLY.includes(key)) return track === 'mob';
  if (track === 'mob') return MOB_SAYS.includes(key);
  if (CALI_ONLY.includes(key)) return cali;
  if (cali && (key.startsWith('run_') || key.startsWith('zone_') || ['weight_up', 'form_first', 'warmup', 'cooldown'].includes(key))) return false;
  return true;
}
// גרסת הנקבה של משפט אצל מאמן מסוים (null = אין; המשפט ניטרלי או שלמאמן יש נוסח משלו)
export const femaleLine = (key, coach) => (COACH_LINES[coach]?.[key] ? null : FEMALE[key] ?? null);

// ───── פנייה בלשון נקבה (למתאמנת) ─────
export const FEMALE = {
  hold: 'Hold!', last_set: '[excited] Last set! Give it everything!', two_more: 'Two more! Don\'t give up!', hold_done: 'That\'s it! Release.',
  rate_set: 'How was that set? Mark it for me.',
  form_first: 'Remember — technique before weight. Always.',
  hello_ori: '[excited] Hey! I\'m Ori, your personal coach. Today we work hard. Let\'s get started!',
  hello_noa: '[excited] Hi! I\'m Noa, your personal coach. Today we work hard. Let\'s get started!',
  workout_done: '[excited] Workout complete! Incredible work. Remember to eat some protein within the hour.',
  pr: '[excited] New personal record! You\'re a machine!',
  m1: 'You\'re stronger than you think.',
  m6: 'I can see the progress. Keep it up!', m8: 'You\'re not training for today. You\'re training for the years ahead.',
  m9: 'This is exactly where others stop. You keep going.',
  hr_ready: 'Your heart rate has recovered. You\'re ready for the next set.', hr_high: 'Your heart rate is still high. Take a few more seconds.',
  zone_up: 'Your heart rate is below target. Pick it up a little.', zone_down: 'Your heart rate is above target. Slow down a little and breathe.',
  warm_intro: 'We start with a dynamic warm-up. Five short movements — follow me.'
};

// שים לב: מילים כמו "שלך / לך / אותך" נכתבות אותו דבר בזכר ובנקבה, ומנוע הקול עלול להגות אותן בלשון הלא נכונה
// (במיוחד בקול של מאמנת). משפטי הפתיחה מנוסחים בלי מילים כאלה; במקומות שאין ברירה — ניקוד ב-SPOKEN.
// ───── משפטים עם שם המתאמן ─────
// {name} מוחלף בשם; ערך: { m, f } לפי מין המתאמן, ו-hello לפי מאמן.
export const NAME_LINES = {
  hello: {
    ori: { m: '[excited] Hey {name}! I\'m Ori, your personal coach. Today we work hard. Let\'s get started!', f: '[excited] Hey {name}! I\'m Ori, your personal coach. Today we work hard. Let\'s get started!' },
    noa: { m: '[excited] Hi {name}! I\'m Noa, your personal coach. Today we work hard. Let\'s get started!', f: '[excited] Hi {name}! I\'m Noa, your personal coach. Today we work hard. Let\'s get started!' },
    maya: { m: '[excited] Hi {name}! I\'m Maya, your calisthenics coach. Here we build body control, step by step. Let\'s begin!', f: '[excited] Hi {name}! I\'m Maya, your calisthenics coach. Here we build body control, step by step. Let\'s begin!' },
    guy: { m: '[excited] Hi {name}! I\'m Guy, your running coach. Today we hit the road — at the right pace, step by step. Let\'s go!', f: '[excited] Hi {name}! I\'m Guy, your running coach. Today we hit the road — at the right pace, step by step. Let\'s go!' },
    shira: { m: '[excited] Hi {name}! I\'m Shira, your running coach. Today we run smart: easy most of the time, and enjoying the way. Let\'s go!', f: '[excited] Hi {name}! I\'m Shira, your running coach. Today we run smart: easy most of the time, and enjoying the way. Let\'s go!' },
    lia: { m: '[excited] Hi {name}! I\'m Lia. Today\'s workout is short and intense — give everything during the work, and really rest during the rest. Let\'s go!', f: '[excited] Hi {name}! I\'m Lia. Today\'s workout is short and intense — give everything during the work, and really rest during the rest. Let\'s go!' },
    yael: { m: 'Hello {name}, I\'m Yael, your yoga teacher. Today we breathe, move slowly, and listen to the body. Let\'s begin.', f: 'Hello {name}, I\'m Yael, your yoga teacher. Today we breathe, move slowly, and listen to the body. Let\'s begin.' },
    mei: { m: 'Hello {name}, I\'m Mei, your tai chi teacher. Today we practice slowly, in small steps, and in comfort. Let\'s begin.', f: 'Hello {name}, I\'m Mei, your tai chi teacher. Today we practice slowly, in small steps, and in comfort. Let\'s begin.' },
    tamar: { m: 'Hi {name}, I\'m Tamar, your mobility and flexibility coach. Today we move slowly, breathe, and let the body open up. Let\'s begin.', f: 'Hi {name}, I\'m Tamar, your mobility and flexibility coach. Today we move slowly, breathe, and let the body open up. Let\'s begin.' },
  },
  welcome: { m: '{name}, let\'s get to work.', f: '{name}, let\'s get to work.' },
  go: { m: 'Let\'s go, {name}!', f: 'Let\'s go, {name}!' },
  last_set: { m: '[excited] {name}, last set! Give it everything!', f: '[excited] {name}, last set! Give it everything!' },
  two_more: { m: 'Two more, {name}! Don\'t give up!', f: 'Two more, {name}! Don\'t give up!' },
  pr: { m: '[excited] New personal record! {name}, you\'re a machine!', f: '[excited] New personal record! {name}, you\'re a machine!' },
  workout_done: { m: '[excited] Workout complete, {name}! Incredible work. Remember to eat some protein.', f: '[excited] Workout complete, {name}! Incredible work. Remember to eat some protein.',
    lia: { m: '[excited] Workout complete, {name}! Now water, and a deep breath.', f: '[excited] Workout complete, {name}! Now water, and a deep breath.' },
    tamar: { m: 'Workout complete, {name}. Your body will thank you tomorrow.', f: 'Workout complete, {name}. Your body will thank you tomorrow.' },
    yael: { m: 'Class complete, {name}. Thank you for practicing.', f: 'Class complete, {name}. Thank you for practicing.' },
    mei: { m: 'Class complete, {name}. Well done for today.', f: 'Class complete, {name}. Well done for today.' } },
  run_done: { m: '[excited] Run complete! {name}, well done!', f: '[excited] Run complete! {name}, well done!' },
  // מילה טובה בשם באמצע תרגיל לפי זמן (מוחלף לפעמים במקום "חצי, ממשיכים") — כך השם נשמע גם בשיעורים שאין בהם סטים
  half: { m: 'Very nice, {name}. Keep going.', f: 'Very nice, {name}. Keep going.' },
  // פתיחות וסיומים שיש רק למאמנת אחת (המפתח הוא שם המאמנת — מאמנים אחרים לא מקליטים אותם)
  pil_hello: { lia: { m: 'Hi {name}, I\'m Lia. Today is Pilates: slow, precise movement that comes from your center. Let\'s begin.', f: 'Hi {name}, I\'m Lia. Today is Pilates: slow, precise movement that comes from your center. Let\'s begin.' } },
  walk_hello: { shira: { m: 'Hi {name}! I\'m Shira. Today we\'re heading out for a walk — at the right pace, with a clear head. Let\'s go!', f: 'Hi {name}! I\'m Shira. Today we\'re heading out for a walk — at the right pace, with a clear head. Let\'s go!' } },
  walk_done: { shira: { m: '[excited] Walk complete! {name}, well done!', f: '[excited] Walk complete! {name}, well done!' } },
  proud: { m: '{name}, well done. Seriously.', f: '{name}, well done. Seriously.' },
  push_on: { m: 'Come on, {name}! You\'re stronger than you think!', f: 'Come on, {name}! You\'re stronger than you think!' },
  hr_ready: { m: '{name}, your heart rate has recovered. You\'re ready for the next set.', f: '{name}, your heart rate has recovered. You\'re ready for the next set.' },
};
// מתי להחליף משפט רגיל בגרסה עם השם: [מפתח שמי, הסתברות]
export const NAME_SWAP = {
  hello_ori: ['hello', 1], hello_noa: ['hello', 1], hello_maya: ['hello', 1], hello_tamar: ['hello', 1], hello_lia: ['hello', 1], hello_yael: ['hello', 1], hello_mei: ['hello', 1], hello_guy: ['hello', 1], hello_shira: ['hello', 1], workout_done: ['workout_done', 1], run_done: ['run_done', 1], pr: ['pr', 1],
  last_set: ['last_set', 0.6], two_more: ['two_more', 0.4], hr_ready: ['hr_ready', 0.5],
  m1: ['push_on', 0.5], m6: ['proud', 0.5], m10: ['proud', 0.7], workout_start: ['welcome', 0.5],
  hold_half: ['half', 0.3], pil_half: ['half', 0.3], pil_hello: ['pil_hello', 1], walk_hello: ['walk_hello', 1], walk_done: ['walk_done', 1],
};

// הגייה: גרסאות מנוקדות למילים קצרות/דו־משמעיות — משמשות רק ליצירת הקול (הטקסט המוצג נשאר ללא ניקוד).
const NUM_NIQQUD = ['', 'One!', 'Two!', 'Three!', 'Four!', 'Five!', 'Six!', 'Seven!', 'Eight!', 'Nine!', 'Ten!',
  'Eleven!', 'Twelve!', 'Thirteen!', 'Fourteen!', 'Fifteen!', 'Sixteen!', 'Seventeen!',
  'Eighteen!', 'Nineteen!', 'Twenty!'];
const SET_NIQQUD = ['', 'First set', 'Second set', 'Third set', 'Fourth set', 'Fifth set', 'Sixth set'];
export const SPOKEN = {
  ...Object.fromEntries(NUM_NIQQUD.slice(1).map((t, i) => [`n${i + 1}`, `${t}!`])),
  ...Object.fromEntries(SET_NIQQUD.slice(1).map((t, i) => [`set${i + 1}`, `${t}.`])),
  up: 'Up!', down: 'Down...', pull: 'Pull!', press: 'Press!', release: 'Release slowly...', hold: 'Hold!', next_ex: 'Next exercise.', run_min: 'One more minute!',
  rest_30: 'Thirty seconds left.', rest_10: 'Ten seconds left, get ready.', push: 'Drive up!',
 
  hold__f: 'Hold!',
  ex_mountain_climber: 'Mountain climbers. High plank, shoulders over your hands.',
  pr__f: '[excited] New personal record! You\'re a machine!',
  // תיקוני הגייה שעלו בביקורת המילים (tools/voice_audit.py, 20.11.2026)
  tip_h_bicycle: 'Slowly. The rotation comes from your torso.',
  ex_y_savasana: 'Savasana — relaxation. Lie on your back, legs slightly apart.',
};
export const MOTIVATION_KEYS = Array.from({ length: 10 }, (_, i) => `m${i + 1}`);

export function lineFor(key, coach, sex = 'm') {
  const own = COACH_LINES[coach]?.[key];
  if (own) return own;
  if (sex === 'f' && FEMALE[key]) return FEMALE[key];
  const v = VOICE_LINES[key];
  if (v == null) return null;
  return typeof v === 'string' ? v : v[coach];
}

// נוסח לפי מאמן אם יש (hello לכולם; workout_done לתמר), אחרת הנוסח הכללי
// התבנית של משפט־שם למאמן: נוסח משלו, או הנוסח הכללי. משפט שיש רק למאמנים מסוימים (pil_hello — רק ליה) מחזיר undefined לאחרים
export const nameTpl = (v, coach) => v[coach] || (v.m ? v : v.hello_generic);
export function nameLine(nkey, coach, sex, name) {
  const v = NAME_LINES[nkey];
  if (!v) return null;
  const t = nameTpl(v, coach)[sex === 'f' ? 'f' : 'm'];
  return t.replaceAll('{name}', name);
}
