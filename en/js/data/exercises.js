// ספריית התרגילים — כל תרגיל כולל הנחיות ביצוע, טמפו, שרירים ופרמטרים להתקדמות.
// type: weight = משקל חיצוני | bw = משקל גוף | time = החזקה בזמן | cardio = מרווחי זמן
// load: יחס התחלתי למשקל גוף (לפי רמה 1..5) עבור 10 חזרות — ההמלצה מתעדכנת אוטומטית לפי ביצועים.

export const MUSCLES = {
  chest: 'Chest', shoulders: 'Shoulders', biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms',
  abs: 'Abs', obliques: 'Obliques', quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes',
  calves: 'Calves', lats: 'Lats', upper_back: 'Upper back', lower_back: 'Lower back', traps: 'Traps',
};

export const GROUPS = {
  legs: 'Legs', back: 'Back', chest: 'Chest', shoulders: 'Shoulders', arms: 'Arms', core: 'Core', conditioning: 'Functional fitness', mobility: 'Warm-up & stretching',
};

import { CALI_EXERCISES } from './cali-exercises.js';
import { MOB_EXERCISES } from './mob-exercises.js';
import { STRETCH_REGION } from './mob.js';
import { PIL_EXERCISES, PIL_SHARED } from './pil-exercises.js';
import { YOGA_EXERCISES } from './yoga-exercises.js';
import { TAI_EXERCISES } from './tai-exercises.js';
import { HIIT_EXERCISES, HIIT_SHARED, HIIT_WARM, HIIT_COOL } from './hiit-exercises.js';

const E = (o) => ({ unilateral: false, compound: false, inc: 2.5, tempo: [2, 0, 1], alts: [], ...o });

export const EXERCISES = [
  // ───── רגליים ─────
  E({ id: 'back_squat', name: 'Back squat', group: 'legs', pattern: 'squat', type: 'weight', compound: true, inc: 5,
    muscles: ['quads', 'glutes', 'hamstrings', 'lower_back'], equip: 'Squat rack + barbell', level: 2, load: [0.4, 0.6, 0.8, 1.0, 1.2],
    tempo: [3, 0, 1], alts: ['leg_press', 'bulgarian_split'],
    cues: ['Feet shoulder-width apart, toes slightly out', 'Chest up, neutral back — deep breath and brace your core', 'Lower until your thighs are parallel to the floor, knees track over toes', 'Push the floor away and drive up'] }),
  E({ id: 'leg_press', name: 'Leg press', group: 'legs', pattern: 'squat', type: 'weight', compound: true, inc: 10,
    muscles: ['quads', 'glutes'], equip: 'Leg press machine', level: 1, load: [0.8, 1.2, 1.6, 2.0, 2.5],
    tempo: [3, 0, 1], alts: ['back_squat'],
    cues: ['Keep your lower back against the pad throughout', 'Lower until your knees reach 90 degrees', 'Don\'t lock your knees at the top'] }),
  E({ id: 'rdl', name: 'Romanian deadlift', group: 'legs', pattern: 'hinge', type: 'weight', compound: true, inc: 5,
    muscles: ['hamstrings', 'glutes', 'lower_back'], equip: 'Olympic barbell', level: 2, load: [0.4, 0.6, 0.8, 1.0, 1.2],
    tempo: [3, 1, 1], alts: ['deadlift', 'leg_curl'],
    cues: ['Soft knees, back straight the whole way', 'Bar close to your thighs, push your hips back', 'Feel the stretch in your hamstrings, then squeeze your glutes to stand'] }),
  E({ id: 'deadlift', name: 'Deadlift', group: 'legs', pattern: 'hinge', type: 'weight', compound: true, inc: 5,
    muscles: ['hamstrings', 'glutes', 'lower_back', 'traps', 'forearms'], equip: 'Olympic barbell', level: 3, load: [0.6, 0.9, 1.2, 1.5, 1.8],
    tempo: [2, 0, 1], alts: ['rdl'],
    cues: ['Bar over mid-foot', 'Neutral back, shoulders over the bar, core braced', 'Push with your legs and open your hips together', 'At lockout — stand tall, don\'t lean back'] }),
  E({ id: 'db_lunge', name: 'Dumbbell lunges', group: 'legs', pattern: 'lunge', type: 'weight', compound: true, inc: 2, unilateral: true,
    muscles: ['quads', 'glutes', 'hamstrings'], equip: 'Dumbbells', level: 1, load: [0.1, 0.15, 0.2, 0.25, 0.3],
    alts: ['bulgarian_split'],
    cues: ['Long step forward, torso upright', 'Back knee almost touches the floor', 'Push back through the front heel'] }),
  E({ id: 'bulgarian_split', name: 'Bulgarian split squat', group: 'legs', pattern: 'lunge', type: 'weight', compound: true, inc: 2, unilateral: true,
    muscles: ['quads', 'glutes'], equip: 'Bench + dumbbells', level: 2, load: [0.05, 0.1, 0.15, 0.2, 0.25],
    alts: ['db_lunge'],
    cues: ['Back foot on the bench', 'Lower straight down until your thigh is parallel', 'Front knee stable over your foot'] }),
  E({ id: 'leg_ext', name: 'Leg extension', group: 'legs', pattern: 'iso', type: 'weight', inc: 5,
    muscles: ['quads'], equip: 'Leg extension machine', level: 1, load: [0.3, 0.4, 0.5, 0.6, 0.7],
    tempo: [2, 1, 1], cues: ['Back against the backrest', 'Extend all the way and hold for a second', 'Lower slowly'] }),
  E({ id: 'leg_curl', name: 'Leg curl', group: 'legs', pattern: 'iso', type: 'weight', inc: 5,
    muscles: ['hamstrings'], equip: 'Leg curl machine', level: 1, load: [0.2, 0.3, 0.4, 0.5, 0.6],
    tempo: [3, 1, 1], cues: ['Hips against the pad', 'Curl all the way and squeeze', 'Full control on the way down'] }),
  E({ id: 'calf_raise', name: 'Calf raises', group: 'legs', pattern: 'iso', type: 'weight', inc: 5,
    muscles: ['calves'], equip: 'Calf raise machine', level: 1, load: [0.5, 0.7, 0.9, 1.1, 1.3],
    tempo: [2, 1, 1], cues: ['Rise as high as you can', 'Pause at the top', 'Lower to a full stretch'] }),
  E({ id: 'hip_thrust', name: 'Barbell hip thrust', group: 'legs', pattern: 'hinge', type: 'weight', compound: true, inc: 5,
    muscles: ['glutes', 'hamstrings'], equip: 'Bench + barbell', level: 2, load: [0.5, 0.8, 1.1, 1.4, 1.7],
    tempo: [2, 1, 1], cues: ['Shoulder blades on the bench, chin tucked', 'Drive through your heels until your body is parallel to the floor', 'Squeeze your glutes hard at the top'] }),

  // ───── גב ─────
  E({ id: 'pullup', name: 'Pull-up', group: 'back', pattern: 'pull_v', type: 'bw', compound: true,
    muscles: ['lats', 'biceps', 'upper_back'], equip: 'Pull-up bar', level: 2, alts: ['lat_pulldown'],
    cues: ['Grip slightly wider than your shoulders', 'Pull your elbows toward your ribs', 'Chin over the bar', 'Full, controlled descent'] }),
  E({ id: 'lat_pulldown', name: 'Lat pulldown', group: 'back', pattern: 'pull_v', type: 'weight', compound: true, inc: 5,
    muscles: ['lats', 'biceps'], equip: 'Lat pulldown machine', level: 1, load: [0.4, 0.55, 0.7, 0.85, 1.0],
    alts: ['pullup'], cues: ['Chest up, lean back slightly', 'Pull to your collarbone', 'Draw your shoulder blades down and back'] }),
  E({ id: 'cable_row', name: 'Seated cable row', group: 'back', pattern: 'pull_h', type: 'weight', compound: true, inc: 5,
    muscles: ['upper_back', 'lats', 'biceps'], equip: 'Seated cable row machine', level: 1, load: [0.4, 0.55, 0.7, 0.85, 1.0],
    cues: ['Back upright, no swinging', 'Pull to your stomach', 'Squeeze your shoulder blades'] }),
  E({ id: 'bb_row', name: 'Barbell row', group: 'back', pattern: 'pull_h', type: 'weight', compound: true, inc: 5,
    muscles: ['upper_back', 'lats', 'lower_back', 'biceps'], equip: 'Olympic barbell', level: 2, load: [0.3, 0.45, 0.6, 0.75, 0.9],
    alts: ['db_row'], cues: ['Torso at forty-five degrees, back straight', 'Bar to your lower chest', 'Controlled descent'] }),
  E({ id: 'db_row', name: 'Single-arm dumbbell row', group: 'back', pattern: 'pull_h', type: 'weight', compound: true, inc: 2, unilateral: true,
    muscles: ['lats', 'upper_back', 'biceps'], equip: 'Bench + dumbbell', level: 1, load: [0.15, 0.25, 0.35, 0.45, 0.55],
    cues: ['Back parallel to the floor', 'Elbow close to your body, pull to your hip', 'Don\'t rotate your torso'] }),
  E({ id: 'face_pull', name: 'Face pull', group: 'shoulders', pattern: 'pull_h', type: 'weight', inc: 2.5,
    muscles: ['shoulders', 'upper_back', 'traps'], equip: 'Cable + rope', level: 1, load: [0.15, 0.2, 0.25, 0.3, 0.35],
    tempo: [2, 1, 1], cues: ['Elbows high', 'Pull toward your face and spread the rope ends apart', 'Rotate your shoulders outward'] }),

  // ───── חזה ─────
  E({ id: 'bench_press', name: 'Barbell bench press', group: 'chest', pattern: 'push_h', type: 'weight', compound: true, inc: 2.5,
    muscles: ['chest', 'triceps', 'shoulders'], equip: 'Bench + barbell', level: 2, load: [0.4, 0.55, 0.75, 0.95, 1.15],
    tempo: [3, 0, 1], alts: ['incline_db_press', 'pushup'],
    cues: ['Shoulder blades together, slight arch', 'Bar comes down to mid-chest', 'Elbows at 45 degrees', 'Press hard to lockout'] }),
  E({ id: 'incline_db_press', name: 'Incline dumbbell press', group: 'chest', pattern: 'push_h', type: 'weight', compound: true, inc: 2,
    muscles: ['chest', 'shoulders', 'triceps'], equip: 'Incline bench + dumbbells', level: 1, load: [0.12, 0.18, 0.25, 0.32, 0.4],
    tempo: [3, 0, 1], cues: ['30-degree incline', 'Dumbbells come down to chest height', 'Press up and bring them together'] }),
  E({ id: 'cable_fly', name: 'Cable fly', group: 'chest', pattern: 'iso', type: 'weight', inc: 2.5,
    muscles: ['chest'], equip: 'Cable crossover', level: 1, load: [0.08, 0.12, 0.16, 0.2, 0.25],
    tempo: [2, 1, 1], cues: ['Elbows slightly bent and fixed', 'Wide hugging motion', 'Squeeze your chest in the middle'] }),
  E({ id: 'pushup', name: 'Push-ups', group: 'chest', pattern: 'push_h', type: 'bw', compound: true,
    muscles: ['chest', 'triceps', 'shoulders', 'abs'], equip: 'Bodyweight', level: 1,
    cues: ['Body in a straight line from head to heels', 'Chest almost touches the floor', 'Elbows at 45 degrees'] }),
  E({ id: 'dips', name: 'Dips', group: 'chest', pattern: 'push_v', type: 'bw', compound: true,
    muscles: ['chest', 'triceps', 'shoulders'], equip: 'Parallel bars', level: 2,
    cues: ['Slight forward lean', 'Lower until your elbows reach 90 degrees', 'Full lockout at the top'] }),

  // ───── כתפיים ─────
  E({ id: 'ohp', name: 'Standing overhead press', group: 'shoulders', pattern: 'push_v', type: 'weight', compound: true, inc: 2.5,
    muscles: ['shoulders', 'triceps', 'traps'], equip: 'Olympic barbell', level: 2, load: [0.25, 0.35, 0.45, 0.55, 0.65],
    cues: ['Glutes and core braced', 'Bar travels in a straight line, head moves back', 'Lock out overhead'] }),
  E({ id: 'lateral_raise', name: 'Lateral raise', group: 'shoulders', pattern: 'iso', type: 'weight', inc: 1,
    muscles: ['shoulders'], equip: 'Dumbbells', level: 1, load: [0.04, 0.06, 0.08, 0.1, 0.12],
    tempo: [2, 1, 1], cues: ['Elbows slightly bent', 'Only up to shoulder height', 'No momentum'] }),
  E({ id: 'rear_delt_fly', name: 'Reverse fly', group: 'shoulders', pattern: 'iso', type: 'weight', inc: 2.5,
    muscles: ['shoulders', 'upper_back'], equip: 'Pec deck machine', level: 1, load: [0.12, 0.16, 0.2, 0.25, 0.3],
    tempo: [2, 1, 1], cues: ['Chest against the pad', 'Open your arms back in an arc', 'Squeeze your rear delts'] }),

  // ───── ידיים ─────
  E({ id: 'bb_curl', name: 'Barbell curl', group: 'arms', pattern: 'iso', type: 'weight', inc: 2.5,
    muscles: ['biceps', 'forearms'], equip: 'Barbell', level: 1, load: [0.15, 0.2, 0.28, 0.35, 0.42],
    tempo: [3, 0, 1], cues: ['Elbows close to your body', 'No swinging from your back', 'Slow descent'] }),
  E({ id: 'hammer_curl', name: 'Hammer curls', group: 'arms', pattern: 'iso', type: 'weight', inc: 1,
    muscles: ['biceps', 'forearms'], equip: 'Dumbbells', level: 1, load: [0.07, 0.1, 0.13, 0.16, 0.2],
    tempo: [2, 0, 1], cues: ['Neutral grip', 'Elbow fixed', 'Full control'] }),
  E({ id: 'rope_pushdown', name: 'Cable triceps pushdown', group: 'arms', pattern: 'iso', type: 'weight', inc: 2.5,
    muscles: ['triceps'], equip: 'Cable + rope', level: 1, load: [0.15, 0.2, 0.27, 0.34, 0.4],
    tempo: [2, 1, 1], cues: ['Elbows close to your ribs', 'Extend all the way and spread the rope apart', 'Return slowly'] }),
  E({ id: 'oh_tri_ext', name: 'Overhead triceps extension', group: 'arms', pattern: 'iso', type: 'weight', inc: 2,
    muscles: ['triceps'], equip: 'Dumbbell', level: 1, load: [0.1, 0.14, 0.18, 0.22, 0.27],
    tempo: [3, 0, 1], cues: ['Elbows point to the ceiling', 'Lower behind your head', 'Full extension'] }),

  // ───── ליבה ─────
  E({ id: 'plank', name: 'Plank', group: 'core', pattern: 'core', type: 'time',
    muscles: ['abs', 'obliques'], equip: 'Mat', level: 1,
    cues: ['Elbows under your shoulders', 'Body straight — don\'t lift your hips', 'Breathe and brace your core'] }),
  E({ id: 'hanging_leg_raise', name: 'Hanging leg raises', group: 'core', pattern: 'core', type: 'bw',
    muscles: ['abs', 'obliques', 'forearms'], equip: 'Pull-up bar', level: 2,
    cues: ['Steady hang, no swinging', 'Raise your legs to hip height', 'Slow descent'] }),
  E({ id: 'woodchop', name: 'Cable woodchop', group: 'core', pattern: 'core', type: 'weight', inc: 2.5, unilateral: true,
    muscles: ['obliques', 'abs', 'shoulders'], equip: 'Cable machine', level: 1, load: [0.1, 0.14, 0.18, 0.22, 0.26],
    cues: ['Rotate from your torso, arms straight', 'Diagonal motion from high to low', 'Control the return'] }),
  E({ id: 'ab_wheel', name: 'Ab wheel rollout', group: 'core', pattern: 'core', type: 'bw',
    muscles: ['abs', 'lats'], equip: 'Ab wheel', level: 2,
    cues: ['Core braced, don\'t let your back sag', 'Roll out only as far as you can control', 'Come back by squeezing your abs'] }),

  // ───── כושר קרבי ─────
  E({ id: 'kb_swing', name: 'Kettlebell swing', group: 'conditioning', pattern: 'hinge', type: 'weight', compound: true, inc: 4,
    muscles: ['glutes', 'hamstrings', 'lower_back', 'shoulders'], equip: 'Kettlebell', level: 1, load: [0.16, 0.2, 0.24, 0.3, 0.36],
    tempo: [1, 0, 1], cues: ['Hinge at the hips — it\'s not a squat', 'Snap your glutes at the top', 'Arms only guide the bell'] }),
  E({ id: 'burpee', name: 'Burpee', group: 'conditioning', pattern: 'cardio', type: 'bw', compound: true,
    muscles: ['chest', 'quads', 'shoulders', 'abs'], equip: 'Bodyweight', level: 1, tempo: [1, 0, 1],
    cues: ['Hands to the floor, jump to plank', 'Push-up', 'Jump up with your arms overhead'] }),
  // ───── משקל גוף — בלי ציוד, בכל מקום ─────
  E({ id: 'air_squat', name: 'Bodyweight squat', group: 'legs', pattern: 'squat', type: 'bw', compound: true,
    muscles: ['quads', 'glutes', 'hamstrings'], equip: 'Bodyweight', level: 1, tempo: [2, 0, 1],
    cues: ['Feet shoulder-width apart, arms forward', 'Lower until your thighs are parallel to the floor', 'Heels on the floor, chest up'] }),
  E({ id: 'bw_lunge', name: 'Lunges', group: 'legs', pattern: 'lunge', type: 'bw', compound: true, unilateral: true,
    muscles: ['quads', 'glutes', 'hamstrings'], equip: 'Bodyweight', level: 1, tempo: [2, 0, 1],
    cues: ['Long step forward, torso upright', 'Back knee almost touches the floor', 'Push back through the front heel, then switch legs'] }),
  E({ id: 'glute_bridge', name: 'Glute bridge', group: 'legs', pattern: 'hinge', type: 'bw',
    muscles: ['glutes', 'hamstrings', 'lower_back'], equip: 'Mat', level: 1, tempo: [2, 1, 1],
    cues: ['Lie on your back, knees bent, feet on the floor', 'Drive through your heels to a straight line from shoulders to knees', 'Squeeze your glutes at the top, then lower slowly'] }),
  E({ id: 'mountain_climber', name: 'Mountain climbers', group: 'conditioning', pattern: 'cardio', type: 'bw', compound: true,
    muscles: ['abs', 'shoulders', 'quads'], equip: 'Bodyweight', level: 1, tempo: [1, 0, 1],
    cues: ['High plank, shoulders over your hands', 'Knee to chest, switching legs in rhythm', 'Hips low, core tight'] }),
  E({ id: 'farmer_carry', name: 'Farmer\'s walk', group: 'conditioning', pattern: 'carry', type: 'time', compound: true,
    muscles: ['forearms', 'traps', 'abs', 'glutes'], equip: 'Heavy dumbbells', level: 1, load: [0.25, 0.3, 0.4, 0.5, 0.6],
    cues: ['Stand tall, shoulders down', 'Short, steady steps', 'Strong grip — don\'t let go'] }),
  E({ id: 'box_jump', name: 'Box jump', group: 'conditioning', pattern: 'plyo', type: 'bw', compound: true,
    muscles: ['quads', 'glutes', 'calves'], equip: 'Plyo box', level: 2, tempo: [1, 0, 1],
    cues: ['Swing your arms', 'Land softly with bent knees', 'Step down — don\'t jump down'] }),
  E({ id: 'battle_rope', name: 'Battle ropes', group: 'conditioning', pattern: 'cardio', type: 'time',
    muscles: ['shoulders', 'forearms', 'abs'], equip: 'Battle ropes', level: 1,
    cues: ['Stable half squat', 'Fast alternating waves', 'Breathe in rhythm'] }),
  E({ id: 'rower', name: 'Rowing machine', group: 'conditioning', pattern: 'cardio', type: 'cardio',
    muscles: ['lats', 'quads', 'upper_back', 'hamstrings'], equip: 'Rowing machine', level: 1,
    cues: ['Legs — torso — arms', 'Return: arms — torso — legs', 'Steady pace of 24–28 strokes'] }),
  E({ id: 'sled_push', name: 'Sled push', group: 'conditioning', pattern: 'carry', type: 'time', compound: true,
    muscles: ['quads', 'glutes', 'calves', 'shoulders'], equip: 'Sled', level: 2,
    cues: ['Body low at forty-five degrees', 'Short, powerful steps', 'Arms locked'] }),
  E({ id: 'treadmill_run', name: 'Running', group: 'conditioning', pattern: 'cardio', type: 'cardio',
    muscles: ['quads', 'hamstrings', 'calves', 'glutes'], equip: 'Treadmill / track', level: 1,
    cues: ['Shoulders relaxed', 'Land under your body', 'Rhythmic breathing'] }),

  // ───── חימום דינמי ומתיחות (תרגילי זמן) ─────
  E({ id: 'jumping_jacks', name: 'Jumping jacks', group: 'mobility', pattern: 'mobility', type: 'time', warm: true,
    muscles: ['calves', 'shoulders', 'quads'], equip: 'Bodyweight', level: 1, cues: ['Land softly on the balls of your feet', 'Arms all the way overhead', 'Easy, even pace'] }),
  E({ id: 'arm_circles', name: 'Arm circles', group: 'mobility', pattern: 'mobility', type: 'time', warm: true,
    muscles: ['shoulders'], equip: 'Bodyweight', level: 1, cues: ['Arms straight at shoulder height', 'Big, controlled circles', 'Halfway through — switch direction'] }),
  E({ id: 'leg_swings', name: 'Leg swings', group: 'mobility', pattern: 'mobility', type: 'time', warm: true, unilateral: true,
    muscles: ['hamstrings', 'glutes', 'quads'], equip: 'Something to hold on to', level: 1, cues: ['Hold on to the support for balance', 'Leg straight, forward and back', 'Increase the range gradually'] }),
  E({ id: 'inchworm', name: 'Inchworm', group: 'mobility', pattern: 'mobility', type: 'time', warm: true,
    muscles: ['hamstrings', 'shoulders', 'abs'], equip: 'Bodyweight', level: 1, cues: ['Hands to the floor next to your feet', 'Walk your hands out to a plank', 'Walk back and stand up slowly'] }),
  E({ id: 'bw_squat', name: 'Warm-up squat', group: 'mobility', pattern: 'mobility', type: 'time', warm: true,
    muscles: ['quads', 'glutes'], equip: 'Bodyweight', level: 1, cues: ['Slow, deep descent', 'Heels on the floor', 'Arms forward for balance'] }),
  E({ id: 'high_knees', name: 'High knees', group: 'mobility', pattern: 'mobility', type: 'time', warm: true,
    muscles: ['quads', 'calves', 'abs'], equip: 'Bodyweight', level: 1, cues: ['Knees to hip height', 'Arms pump in rhythm', 'Rhythmic breathing'] }),
  E({ id: 'quad_stretch', name: 'Quad stretch', group: 'mobility', pattern: 'mobility', type: 'time', stretch: true, unilateral: true,
    muscles: ['quads'], equip: 'Standing', level: 1, cues: ['Heel toward your glutes', 'Knees together', 'Hips slightly forward'] }),
  E({ id: 'hamstring_stretch', name: 'Hamstring stretch', group: 'mobility', pattern: 'mobility', type: 'time', stretch: true, unilateral: true,
    muscles: ['hamstrings', 'lower_back'], equip: 'Mat', level: 1, cues: ['Leg straight, toes up', 'Fold from your hips, long back', 'Breathe and go deeper with each exhale'] }),
  E({ id: 'hip_flexor_stretch', name: 'Hip flexor stretch', group: 'mobility', pattern: 'mobility', type: 'time', stretch: true, unilateral: true,
    muscles: ['glutes', 'quads'], equip: 'Mat', level: 1, cues: ['Back knee on the mat', 'Squeeze your glutes and push your hips forward', 'Torso upright'] }),
  E({ id: 'chest_stretch', name: 'Chest stretch', group: 'mobility', pattern: 'mobility', type: 'time', stretch: true, unilateral: true,
    muscles: ['chest', 'shoulders'], equip: 'Post / wall', level: 1, cues: ['Forearm against the post at shoulder height', 'Gently turn your torso away', 'No pain — just a stretch'] }),
  E({ id: 'shoulder_stretch', name: 'Shoulder stretch', group: 'mobility', pattern: 'mobility', type: 'time', stretch: true, unilateral: true,
    muscles: ['shoulders', 'upper_back'], equip: 'Standing', level: 1, cues: ['Arm straight across your chest', 'The other arm pulls it in', 'Shoulders down, away from your ears'] }),
  E({ id: 'child_pose', name: 'Child\'s pose', group: 'mobility', pattern: 'mobility', type: 'time', stretch: true,
    muscles: ['lower_back', 'lats', 'shoulders'], equip: 'Mat', level: 1, cues: ['Hips to your heels', 'Arms reaching forward', 'Slow breaths into your back'] }),
  // ───── קליסתניקס (js/data/cali-exercises.js) ─────
  ...CALI_EXERCISES.map(E),
  // ───── מוביליטי וגמישות (js/data/mob-exercises.js) ─────
  ...MOB_EXERCISES.map(E),
  // ───── HIIT (js/data/hiit-exercises.js) ─────
  ...HIIT_EXERCISES.map(E),
  // ───── פילאטיס (js/data/pil-exercises.js) ─────
  ...PIL_EXERCISES.map(E),
  // ───── יוגה (js/data/yoga-exercises.js) ─────
  ...YOGA_EXERCISES.map(E),
  // ───── טאי צ'י (js/data/tai-exercises.js) ─────
  ...TAI_EXERCISES.map(E),
];

// סדר שלבי החזרה: רוב התרגילים מתחילים בירידה (אקסצנטרי). בתרגילים שמתחילים מלמטה/ממצב מתוח — מתחילים במאמץ (קונצנטרי).
// cueCon/cueEcc: מילת הקריאה של המאמן לכל שלב.
const CON_FIRST = ['glute_bridge', 'leg_ext', 'leg_curl', 'calf_raise', 'hip_thrust', 'pullup', 'lat_pulldown', 'cable_row', 'bb_row', 'db_row', 'face_pull',
  'cable_fly', 'ohp', 'lateral_raise', 'rear_delt_fly', 'bb_curl', 'hammer_curl', 'rope_pushdown', 'hanging_leg_raise', 'woodchop',
  'scap_pull', 'lsit_pullup', 'archer_pullup', 'chest_to_bar', 'muscle_up', 'door_row', 'table_row', 'inverted_row', 'elevated_row', 'archer_row', 'prone_pull',
  'single_leg_bridge', 'hanging_knee_raise', 'toes_to_bar', 'lying_leg_raise', 'skin_the_cat', 'wall_walk', 'handstand_kickup'];
const PULL = ['lat_pulldown', 'cable_row', 'bb_row', 'db_row', 'face_pull', 'rear_delt_fly', 'door_row', 'table_row', 'inverted_row', 'elevated_row', 'archer_row', 'prone_pull'];
// ציוד שנדרש לתרגילי משקל גוף משותפים לשני המסלולים (ראו cali-exercises.js)
const NEEDS = { pullup: ['bar', 'rings'], hanging_leg_raise: ['bar', 'rings'], dips: ['pbars'] };
const PRESS = ['rope_pushdown', 'cable_fly', 'woodchop'];
// תרגילים שמשמשים בשני המסלולים (חדר כושר וקליסתניקס); השאר שייכים למסלול אחד
const SHARED = ['pushup', 'pullup', 'dips', 'plank', 'hanging_leg_raise', 'air_squat', 'bw_lunge', 'glute_bridge', 'burpee', 'mountain_climber'];
for (const e of EXERCISES) {
  if (NEEDS[e.id]) e.needs = NEEDS[e.id];
  // תרגילי המוביליטי של תמר שייכים רק למסלול שלה; שש המתיחות הוותיקות משותפות לכל המסלולים
  e.tracks = e.tai ? ['tai'] : e.yoga ? ['yoga'] : e.pil ? ['pil'] : e.hiit ? ['hiit'] : e.mob ? ['mob'] : e.cali ? ['cali'] : SHARED.includes(e.id) || e.group === 'mobility' ? ['gym', 'cali', ...(STRETCH_REGION[e.id] ? ['mob'] : [])] : ['gym'];
  if (STRETCH_REGION[e.id]) { e.region = STRETCH_REGION[e.id]; e.kind = 'static'; }
  const ps = PIL_SHARED.find((x) => x[0] === e.id);
  if (ps) { e.area = ps[1]; e.kind ||= ps[2]; e.tracks = [...e.tracks, 'pil']; }
  // תרגילים קיימים שגם ליה משתמשת בהם ב-HIIT (במעגל, בחימום ובמתיחות)
  const hs = HIIT_SHARED.find((x) => x[0] === e.id);
  if (hs) { e.cat = hs[1]; e.impact = hs[2]; if (hs[3]) e.low = hs[3]; }
  if ((hs || HIIT_WARM.includes(e.id) || HIIT_COOL.includes(e.id)) && !e.tracks.includes('hiit')) e.tracks = [...e.tracks, 'hiit'];
  e.first = CON_FIRST.includes(e.id) ? 'con' : 'ecc';
  e.cueCon = PULL.includes(e.id) ? 'pull' : PRESS.includes(e.id) ? 'press' : 'up';
  e.cueEcc = e.neg ? 'slow_down' : PULL.includes(e.id) || PRESS.includes(e.id) ? 'release' : 'down'; // שלילי: "לאט למטה..."
}

export const EX = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
