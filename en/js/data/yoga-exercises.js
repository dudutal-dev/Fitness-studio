// תנוחות מסלול היוגה (יעל): יוגה על מזרן, בלי ציוד. כל התנוחות לפי זמן — מחזיקים ונושמים.
// area: open פתיחה · stand עמידה · balance שיווי משקל · core מרכז · back פתיחת חזה וגב · floor ישיבה וירכיים · twist פיתול · rest סיום.
// kind: static = החזקה · dynamic = תנועה עם הנשימה. level: 1 מתחילים · 2 ממשיכים · 3 מתקדמים. המקורות והכללים: docs/YOGA.md
const Y = { group: 'core', pattern: 'yoga', type: 'time', yoga: true, level: 1, kind: 'static', equip: 'Mat' };

export const YOGA_EXERCISES = [
  // ───── פתיחה ─────
  { ...Y, id: 'y_breath', name: 'Seated breathing', area: 'open', muscles: ['abs'],
    cues: ['Sit cross-legged, back long, palms on your knees', 'Slow inhale through the nose, belly and ribs expanding', 'Long exhale through the nose, shoulders dropping'] },
  { ...Y, id: 'y_cat_cow', name: 'Cat-cow', area: 'open', kind: 'dynamic', muscles: ['lower_back', 'abs'],
    cues: ['On all fours: palms under your shoulders, knees under your hips', 'Inhale, let your back dip and look forward', 'Exhale, round your back and bring your chin to your chest'] },
  { ...Y, id: 'y_down_dog', name: 'Downward-facing dog', area: 'open', muscles: ['shoulders', 'hamstrings', 'calves'],
    cues: ['From all fours, lift your hips up and back', 'Arms and back in one long line, head relaxed between your arms', 'You can bend your knees — what matters is a long back'] },
  // ───── עמידה ─────
  { ...Y, id: 'y_mountain', name: 'Mountain pose', area: 'stand', muscles: ['quads', 'abs'],
    cues: ['Stand tall, feet hip-width apart', 'Spread your weight evenly over both feet', 'The crown of your head lifts up, shoulders relaxed'] },
  { ...Y, id: 'y_forward_fold', name: 'Standing forward fold', area: 'stand', muscles: ['hamstrings', 'lower_back'],
    cues: ['From standing, fold forward from the hip joint', 'Knees slightly bent, belly close to your thighs', 'Head and neck completely relaxed'] },
  { ...Y, id: 'y_chair', name: 'Chair pose', area: 'stand', muscles: ['quads', 'glutes', 'shoulders'],
    cues: ['Feet together or hip-width apart', 'Bend your knees and send your hips back, as if sitting on a chair', 'Arms reach up, weight in your heels'] },
  { ...Y, id: 'y_warrior1', name: 'Warrior I', area: 'stand', unilateral: true, muscles: ['quads', 'glutes', 'shoulders'],
    cues: ['A big step back, back foot at an angle', 'Front knee bent over the ankle, hips facing forward', 'Arms reach up. Switch sides halfway'] },
  { ...Y, id: 'y_warrior2', name: 'Warrior II', area: 'stand', unilateral: true, muscles: ['quads', 'glutes', 'shoulders'],
    cues: ['Wide stance, one foot pointing forward and the other to the side', 'Front knee bent over the ankle, hips open to the side', 'Arms spread out to the sides, gaze over the front hand. Switch sides halfway'] },
  { ...Y, id: 'y_low_lunge', name: 'Low lunge', area: 'stand', unilateral: true, muscles: ['hip_flexors', 'quads', 'glutes'],
    cues: ['One leg forward, back knee on the mat', 'Hips sink forward and down, front knee over the ankle', 'Arms reach up, chest open. Switch sides halfway'] },
  { ...Y, id: 'y_triangle', name: 'Triangle', area: 'stand', unilateral: true, level: 2, muscles: ['hamstrings', 'obliques'],
    cues: ['Wide stance, both legs straight', 'Reach sideways over the front leg, hand coming down to your shin', 'The other arm to the ceiling, chest open. Switch sides halfway'] },
  // ───── שיווי משקל ─────
  { ...Y, id: 'y_tree', name: 'Tree pose', area: 'balance', unilateral: true, muscles: ['glutes', 'calves', 'abs'],
    cues: ['Stand on one leg, the other foot resting on the ankle or the shin — not on the knee', 'Palms together in front of your chest', 'Fix your gaze on one point. Switch sides halfway'] },
  { ...Y, id: 'y_warrior3', name: 'Warrior III', area: 'balance', unilateral: true, level: 3, muscles: ['glutes', 'hamstrings', 'lower_back'],
    cues: ['Stand on one leg and lean forward', 'The back leg rises until your body is parallel to the floor', 'Hips level, arms forward or by your sides. Switch sides halfway'] },
  { ...Y, id: 'y_crow', name: 'Crow', area: 'balance', level: 3, muscles: ['shoulders', 'abs', 'triceps'],
    cues: ['Squat, palms on the mat shoulder-width apart', 'Knees rest on the backs of your upper arms', 'Shift your weight forward until your feet lift off. Look forward'] },
  // ───── מרכז ─────
  { ...Y, id: 'y_plank', name: 'Plank', area: 'core', muscles: ['abs', 'shoulders'],
    cues: ['Palms under your shoulders, legs straight behind you', 'A straight line from head to heels', 'Belly drawn in. You can lower your knees'] },
  { ...Y, id: 'y_boat', name: 'Boat', area: 'core', level: 2, muscles: ['abs', 'hip_flexors'],
    cues: ['Sit, lean back slightly and lift your legs', 'Shins parallel to the floor, arms forward', 'Back long and chest open — don\'t round'] },
  // ───── פתיחת חזה וגב ─────
  { ...Y, id: 'y_cobra', name: 'Cobra', area: 'back', muscles: ['lower_back', 'upper_back'],
    cues: ['Lie on your stomach, palms beside your chest', 'Lift your chest using your back, elbows close to your body', 'Shoulders away from your ears, hips on the mat'] },
  { ...Y, id: 'y_bridge', name: 'Bridge', area: 'back', muscles: ['glutes', 'hamstrings', 'lower_back'],
    cues: ['Lie on your back, knees bent, feet hip-width apart', 'Press into your feet and lift your hips', 'Knees parallel, chest moving toward your chin'] },
  { ...Y, id: 'y_locust', name: 'Locust', area: 'back', level: 2, muscles: ['lower_back', 'glutes', 'upper_back'],
    cues: ['Lie on your stomach, arms by your sides', 'Lift your chest, arms and legs together', 'Gaze at the mat, neck long'] },
  { ...Y, id: 'y_bow', name: 'Bow', area: 'back', level: 3, muscles: ['lower_back', 'glutes', 'quads'],
    cues: ['Lie on your stomach, bend your knees and hold your ankles', 'Kick your legs back, and your chest lifts', 'Knees hip-width apart, keep breathing'] },
  // ───── ישיבה וירכיים ─────
  { ...Y, id: 'y_seated_fold', name: 'Seated forward fold', area: 'floor', muscles: ['hamstrings', 'lower_back'],
    cues: ['Sit with your legs straight in front of you', 'Lengthen up and fold forward from the hip joint', 'Hands to your shins or feet, without pulling hard'] },
  { ...Y, id: 'y_butterfly', name: 'Butterfly', area: 'floor', muscles: ['adductors', 'glutes'],
    cues: ['Sit with the soles of your feet together and your knees opening to the sides', 'Hold your feet, back long', 'Let your knees sink on their own — don\'t press on them'] },
  { ...Y, id: 'y_pigeon', name: 'Pigeon', area: 'floor', unilateral: true, level: 2, muscles: ['glutes', 'hip_flexors'],
    cues: ['One leg bent in front, the other straight behind', 'Hips face forward and sink down', 'Lower onto your forearms if it feels good. Switch sides halfway'] },
  { ...Y, id: 'y_happy_baby', name: 'Happy baby', area: 'floor', muscles: ['adductors', 'glutes', 'lower_back'],
    cues: ['Lie on your back, knees toward your armpits', 'Hold the outsides of your feet', 'Lower back on the mat. You can rock gently'] },
  { ...Y, id: 'y_child', name: 'Child\'s pose', area: 'floor', muscles: ['lower_back', 'lats'],
    cues: ['Sit on your heels, knees slightly apart', 'Fold forward, forehead to the mat', 'Arms forward or by your sides. Breathe into your back'] },
  // ───── פיתול ─────
  { ...Y, id: 'y_seated_twist', name: 'Seated twist', area: 'twist', unilateral: true, muscles: ['obliques', 'lower_back'],
    cues: ['Sit, one leg bent over the other', 'Inhale to lengthen, exhale to turn toward the bent knee', 'The twist starts from the belly, not the neck. Switch sides halfway'] },
  // ───── סיום ─────
  { ...Y, id: 'y_supine_twist', name: 'Supine twist', area: 'rest', unilateral: true, muscles: ['obliques', 'lower_back', 'glutes'],
    cues: ['Lie on your back, one knee to your chest', 'Bring the knee across to the other side, arm spread out to the side', 'Both shoulders on the mat. Switch sides halfway'] },
  { ...Y, id: 'y_savasana', name: 'Savasana — relaxation', area: 'rest', muscles: ['abs'],
    cues: ['Lie on your back, legs slightly apart', 'Arms by your sides, palms up', 'Close your eyes and let your breath flow on its own'] },
  { ...Y, id: 'y_side_rest', name: 'Side-lying relaxation', area: 'rest', muscles: ['abs'],
    cues: ['Lie on your left side, head on your arm or on a pillow', 'Top knee bent, resting on the mat or on a pillow', 'Close your eyes and let your breath flow on its own'] },
];
export const YOGA_AREAS = { open: 'Opening', stand: 'Standing', balance: 'Balance', core: 'Core', back: 'Back & chest', floor: 'Hips & flexibility', twist: 'Twist', rest: 'Closing' };
export const YOGA_TIPS = {
  y_breath: 'Back long. Exhale longer than you inhale.', y_cat_cow: 'Move with your breath. Slowly.', y_down_dog: 'Back long. You can bend your knees.',
  y_mountain: 'Weight even on both feet.', y_forward_fold: 'Head relaxed. Knees soft.', y_chair: 'Weight in your heels.',
  y_warrior1: 'Knee over the ankle. Hips forward.', y_warrior2: 'Knee over the ankle. Shoulders relaxed.', y_low_lunge: 'Hips sink. Chest open.',
  y_triangle: 'Both legs straight. Chest to the ceiling.', y_tree: 'Gaze on one point.',
  y_warrior3: 'Hips level. Body parallel to the floor.', y_crow: 'Look forward. Slowly.', y_plank: 'A straight line. Belly drawn in.', y_boat: 'Back long. Chest open.',
  y_cobra: 'Shoulders away from your ears.', y_bridge: 'Knees parallel.', y_locust: 'Neck long. Gaze at the mat.', y_bow: 'Kick back. Breathe.',
  y_seated_fold: 'Fold from the hips. No pulling.', y_butterfly: 'Back long. Don\'t press on your knees.', y_pigeon: 'Hips face forward.',
  y_happy_baby: 'Lower back on the mat.', y_child: 'Breathe into your back.', y_seated_twist: 'Lengthen, then twist.', y_supine_twist: 'Both shoulders on the mat.',
  y_savasana: 'Nothing to do. Just rest.', y_side_rest: 'Body heavy. Breath soft.',
};
