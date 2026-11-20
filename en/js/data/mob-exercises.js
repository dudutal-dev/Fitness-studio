// תרגילי מסלול המוביליטי והגמישות (תמר). כולם לפי זמן, בלי ציוד מיוחד — מזרן, קיר וכיסא.
// region: אזור הגוף (ראו js/data/mob.js) · kind: static = החזקה רגועה · dynamic = תנועה איטית ומבוקרת
// unilateral: מחליפים צד באמצע הזמן. avoid: מצבים שבהם התרגיל לא נכנס לאימון (פציעות ושאלון הבטיחות).
// המקורות והכללים: docs/MOBILITY.md
const M = { group: 'mobility', pattern: 'mobility', type: 'time', mob: true, level: 1 };
const MAT = 'Mat', STAND = 'Standing', WALL = 'Wall', CHAIR = 'Chair';

export const MOB_EXERCISES = [
  // ───── צוואר ─────
  { ...M, id: 'm_neck_side', name: 'Side neck tilt', region: 'neck', kind: 'static', unilateral: true, equip: STAND, muscles: ['traps'],
    cues: ['Lower your ear toward your shoulder, without lifting the shoulder', 'Keep the opposite shoulder heavy and low', 'Gentle stretch only — the neck doesn\'t like force'] },

  // ───── כתפיים ─────
  { ...M, id: 'm_wall_slide', name: 'Wall slides', region: 'shoulders', kind: 'dynamic', equip: WALL, muscles: ['shoulders', 'upper_back'],
    cues: ['Back, head and forearms against the wall, elbows at ninety degrees', 'Slide your arms up without letting your lower back leave the wall', 'Lower slowly back down'] },
  { ...M, id: 'm_shoulder_cars', name: 'Controlled shoulder circles', region: 'shoulders', kind: 'dynamic', unilateral: true, equip: STAND, muscles: ['shoulders'],
    cues: ['Draw the biggest circle you can with a straight arm, very slowly', 'The rest of your body stays still — only the shoulder works', 'Switch arms halfway'] },
  { ...M, id: 'm_overhead_lat', name: 'Lat stretch', region: 'shoulders', kind: 'static', unilateral: true, equip: STAND, muscles: ['lats', 'obliques'],
    cues: ['One arm overhead, the other hand holding its wrist', 'Lean to the side and pull gently', 'Keep your hips in place, both feet on the floor'] },
  { ...M, id: 'm_back_scratch', name: 'Overhead triceps stretch', region: 'shoulders', kind: 'static', unilateral: true, equip: STAND, muscles: ['triceps', 'lats', 'shoulders'],
    cues: ['Point your elbow to the ceiling, hand between your shoulder blades', 'Use the other hand to draw the elbow toward your head', 'Ribs down — don\'t arch your back'] },
  { ...M, id: 'm_wrist_stretch', name: 'Wrist stretch', region: 'shoulders', kind: 'static', equip: MAT, muscles: ['forearms'],
    cues: ['On all fours, palms on the mat with fingers pointing toward your knees', 'Lean back slowly until you feel a stretch in your forearms', 'Keep your whole palm on the mat'] },

  // ───── גב עליון ─────
  { ...M, id: 'm_cat_cow', name: 'Cat-cow', region: 'tspine', kind: 'dynamic', equip: MAT, muscles: ['lower_back', 'upper_back', 'abs'],
    cues: ['On all fours: inhale, arch your back and lift your gaze', 'Exhale, round your back to the ceiling and tuck your chin', 'One vertebra at a time, at the pace of your breath'] },
  { ...M, id: 'm_thread_needle', name: 'Thread the needle', region: 'tspine', kind: 'dynamic', unilateral: true, equip: MAT, muscles: ['upper_back', 'shoulders'],
    cues: ['On all fours: reach one arm under your body until the shoulder touches the mat', 'Come back and open the same arm to the ceiling, following it with your eyes', 'Keep your hips over your knees'] },
  { ...M, id: 'm_open_book', name: 'Open book', region: 'tspine', kind: 'dynamic', unilateral: true, equip: MAT, muscles: ['upper_back', 'chest'],
    cues: ['Lie on your side, knees bent, arms straight in front of you, one on top of the other', 'Open the top arm slowly to the other side, following it with your eyes', 'Keep your knees together'] },
  { ...M, id: 'm_puppy', name: 'Puppy pose', region: 'tspine', kind: 'static', equip: MAT, muscles: ['lats', 'shoulders', 'upper_back'],
    cues: ['On all fours: walk your hands forward, hips staying over your knees', 'Let your chest sink toward the mat and rest your forehead', 'Breathe into your upper back'] },
  { ...M, id: 'm_seated_twist', name: 'Seated twist', region: 'tspine', kind: 'static', unilateral: true, equip: MAT, muscles: ['obliques', 'upper_back'],
    cues: ['Sit tall, one leg bent over the other', 'Turn toward the bent knee, resting the opposite elbow on it', 'Inhale to lengthen, exhale to twist a little more'] },

  // ───── גב תחתון ─────
  { ...M, id: 'm_cobra', name: 'Cobra', region: 'lumbar', kind: 'static', equip: MAT, muscles: ['abs', 'lower_back'],
    cues: ['Lie on your stomach, palms under your shoulders', 'Lift your chest gently, hips staying on the mat', 'Shoulders away from your ears, glutes relaxed'] },
  { ...M, id: 'm_knees_to_chest', name: 'Knees to chest', region: 'lumbar', kind: 'static', equip: MAT, muscles: ['lower_back', 'glutes'],
    cues: ['Lie on your back and hug both knees', 'Let your lower back spread on the mat', 'You can rock gently from side to side'] },
  { ...M, id: 'm_supine_twist', name: 'Supine twist', region: 'lumbar', kind: 'static', unilateral: true, equip: MAT, muscles: ['lower_back', 'obliques', 'glutes'],
    cues: ['Lie on your back, one knee crossing your body to the other side', 'Keep both shoulders on the mat', 'Look to the opposite side and breathe slowly'] },
  { ...M, id: 'm_pelvic_tilt', name: 'Pelvic tilts', region: 'lumbar', kind: 'dynamic', equip: MAT, muscles: ['abs', 'lower_back'],
    cues: ['Lie on your back, knees bent and feet on the mat', 'Press your lower back into the mat, then arch it slightly', 'A small, slow movement, only from the pelvis'] },
  { ...M, id: 'm_happy_baby', name: 'Happy baby', region: 'lumbar', kind: 'static', equip: MAT, muscles: ['glutes', 'lower_back', 'hamstrings'],
    cues: ['Lie on your back and hold the outsides of your feet', 'Knees wide, toward your armpits', 'Keep your tailbone on the mat'] },
  { ...M, id: 'm_side_bend', name: 'Standing side bend', region: 'lumbar', kind: 'static', unilateral: true, equip: STAND, muscles: ['obliques', 'lats'],
    cues: ['Stand with feet slightly apart, one arm overhead', 'Lean to the side without falling forward or back', 'Breathe into the open ribs'] },

  // ───── אגן וירכיים ─────
  { ...M, id: 'm_couch', name: 'Couch stretch', region: 'hipflex', kind: 'static', unilateral: true, level: 2, equip: `${WALL} / couch`, muscles: ['quads', 'glutes'],
    cues: ['Back knee on the mat right by the wall, shin up the wall', 'Front leg in a lunge, torso upright', 'Squeeze your glutes — that\'s what deepens the stretch'] },
  { ...M, id: 'm_lizard', name: 'Lizard', region: 'hipflex', kind: 'static', unilateral: true, equip: MAT, muscles: ['glutes', 'hamstrings', 'quads'],
    cues: ['Deep lunge, both hands inside the front leg', 'Back knee on the mat, hips sinking forward and down', 'You can lower to your forearms if it\'s comfortable'] },
  { ...M, id: 'm_worlds_greatest', name: 'Lunge with chest opener', region: 'hipflex', kind: 'dynamic', unilateral: true, equip: MAT, muscles: ['glutes', 'upper_back', 'hamstrings'],
    cues: ['Deep lunge, one hand on the floor next to the front foot', 'Open the other arm to the ceiling, following it with your eyes', 'Lower slowly and repeat'] },
  { ...M, id: 'm_figure4', name: 'Supine glute stretch', region: 'hips', kind: 'static', unilateral: true, equip: MAT, muscles: ['glutes'],
    cues: ['Lie on your back, one ankle resting on the other knee', 'Pull the bottom leg toward your chest', 'Keep your head and shoulders on the mat'] },
  { ...M, id: 'm_pigeon', name: 'Pigeon', region: 'hips', kind: 'static', unilateral: true, level: 2, equip: MAT, muscles: ['glutes'],
    cues: ['Front leg bent in front of you, back leg straight behind', 'Hips face forward, don\'t fall to the side', 'You can fold forward onto your forearms'] },
  { ...M, id: 'm_9090', name: '90/90 sit', region: 'hips', kind: 'static', unilateral: true, equip: MAT, muscles: ['glutes'],
    cues: ['Sit with both knees at a right angle: one in front and one to the side', 'Torso upright, leaning slightly over the front leg', 'Both sit bones reach toward the mat'] },
  { ...M, id: 'm_9090_switch', name: '90/90 transitions', region: 'hips', kind: 'dynamic', level: 2, equip: MAT, muscles: ['glutes', 'obliques'],
    cues: ['Sit in 90/90, hands behind you for support', 'Lift your knees and move them slowly to the other side', 'Keep your feet in place'] },
  { ...M, id: 'm_hip_cars', name: 'Controlled hip circles', region: 'hips', kind: 'dynamic', unilateral: true, equip: MAT, muscles: ['glutes'],
    cues: ['On all fours: draw a big circle with one knee — forward, out to the side and back', 'Your back and hips stay still, only the hip joint moves', 'Very slowly, and switch legs halfway'] },
  { ...M, id: 'm_hip_circles', name: 'Hip circles', region: 'hips', kind: 'dynamic', equip: STAND, muscles: ['glutes', 'lower_back'],
    cues: ['Stand with feet apart, hands on your waist', 'Draw big, slow circles with your hips', 'Switch direction halfway'] },
  { ...M, id: 'm_deep_squat', name: 'Deep squat hold', region: 'hips', kind: 'static', level: 2, equip: STAND, muscles: ['glutes', 'quads', 'calves'],
    cues: ['Lower into the deepest squat that\'s comfortable, heels on the floor', 'Elbows push your knees out, chest lifted', 'You can hold a door frame or a chair for balance'] },

  // ───── מקרבים ─────
  { ...M, id: 'm_butterfly', name: 'Butterfly', region: 'adductors', kind: 'static', equip: MAT, muscles: ['glutes'],
    cues: ['Sit with the soles of your feet together and your knees falling out to the sides', 'Long back, lean forward from the hips', 'Don\'t force your knees down'] },
  { ...M, id: 'm_frog', name: 'Frog', region: 'adductors', kind: 'static', level: 2, equip: MAT, muscles: ['glutes'],
    cues: ['On all fours: move your knees out to the sides, shins parallel', 'Lower to your forearms and send your hips back', 'A stretch in the inner thighs, with no knee pain'] },
  { ...M, id: 'm_side_lunge', name: 'Wide-stance side shifts', region: 'adductors', kind: 'dynamic', equip: STAND, muscles: ['glutes', 'quads', 'hamstrings'],
    cues: ['Wide stance: shift your weight onto one leg and bend it', 'The other leg stays straight, heel on the floor', 'Move slowly to the other side, chest lifted'] },

  // ───── ירך אחורית ─────
  { ...M, id: 'm_forward_fold', name: 'Standing forward fold', region: 'hamstrings', kind: 'static', equip: STAND, muscles: ['hamstrings', 'lower_back', 'calves'],
    cues: ['Fold from the hips, arms and head hanging heavy', 'Knees slightly soft', 'Let go a little more with each exhale — don\'t pull with force'] },
  { ...M, id: 'm_down_dog', name: 'Downward-facing dog', region: 'hamstrings', kind: 'static', equip: MAT, muscles: ['hamstrings', 'calves', 'shoulders'],
    cues: ['Hands and feet on the mat, hips high — your body in an upside-down V', 'Push the mat away and lengthen your back', 'Heels reach for the floor; knees can stay bent'] },
  { ...M, id: 'm_active_ham', name: 'Supine straight-leg raise', region: 'hamstrings', kind: 'dynamic', unilateral: true, equip: MAT, muscles: ['hamstrings', 'abs'],
    cues: ['Lie on your back, one leg straight on the mat', 'Raise the other leg as straight as you can, and lower it slowly', 'Keep your hips and lower back on the mat'] },

  // ───── קרסוליים ושוקיים ─────
  { ...M, id: 'm_calf_wall', name: 'Wall calf stretch', region: 'ankles', kind: 'static', unilateral: true, equip: WALL, muscles: ['calves'],
    cues: ['Hands on the wall, one leg back — straight, heel on the floor', 'Lean forward until you feel a stretch in your calf', 'Point the back foot straight ahead'] },
  { ...M, id: 'm_knee_to_wall', name: 'Knee to wall', region: 'ankles', kind: 'dynamic', unilateral: true, equip: WALL, muscles: ['calves'],
    cues: ['Foot a short distance from the wall, heel staying on the floor', 'Send your knee forward until it touches the wall, and come back', 'The knee tracks over your second toe'] },
  { ...M, id: 'm_ankle_circles', name: 'Ankle circles', region: 'ankles', kind: 'dynamic', unilateral: true, equip: `${STAND} / ${CHAIR}`, muscles: ['calves'],
    cues: ['Lift one foot and draw big circles with your toes', 'Only the ankle moves, the shin stays steady', 'Switch legs halfway'] },

  // ───── סיום ─────
  { ...M, id: 'm_breathing', name: 'Diaphragmatic breathing', region: 'calm', kind: 'static', equip: MAT, muscles: ['abs'],
    cues: ['Lie on your back, one hand on your belly and one on your chest', 'Inhale through your nose — the belly rises; a long exhale through your mouth', 'Make the exhale longer than the inhale. Your body is heavy on the mat'] },
];

// דגשים שהמאמנת אומרת כמה שניות אחרי תחילת התרגיל
export const MOB_TIPS = {
  m_neck_side: 'Opposite shoulder heavy and low. No force.',
  m_wall_slide: 'Keep your lower back against the wall.',
  m_shoulder_cars: 'Only the shoulder moves. A big, slow circle.',
  m_overhead_lat: 'Hips stay in place. Breathe into the open side.',
  m_back_scratch: 'Ribs down. Don\'t arch your back.',
  m_wrist_stretch: 'Whole palm on the mat. Lean back slowly.',
  m_cat_cow: 'One vertebra at a time, at the pace of your breath.',
  m_thread_needle: 'Hips over your knees. Follow your hand with your eyes.',
  m_open_book: 'Knees together. Open the arm slowly.',
  m_puppy: 'Let your chest sink. Breathe into your upper back.',
  m_seated_twist: 'Inhale to lengthen, exhale to twist.',
  m_cobra: 'Hips on the mat. Shoulders away from your ears.',
  m_knees_to_chest: 'Let your lower back spread on the mat.',
  m_supine_twist: 'Both shoulders on the mat. Breathe slowly.',
  m_pelvic_tilt: 'A small movement, only from the pelvis.',
  m_happy_baby: 'Keep your tailbone on the mat.',
  m_side_bend: 'Don\'t fall forward. Breathe into your ribs.',
  m_couch: 'Squeeze your glutes. Torso upright.',
  m_lizard: 'Hips sink forward and down.',
  m_worlds_greatest: 'Open your arm to the ceiling. Follow it with your eyes.',
  m_figure4: 'Head and shoulders on the mat.',
  m_pigeon: 'Hips face forward. Don\'t fall to the side.',
  m_9090: 'Torso upright. Both sit bones down.',
  m_9090_switch: 'Feet stay in place. Slowly.',
  m_hip_cars: 'Your back stays still. Only the hip joint.',
  m_hip_circles: 'Big, slow circles.',
  m_deep_squat: 'Heels on the floor. Chest lifted.',
  m_butterfly: 'Long back. Don\'t force your knees.',
  m_frog: 'Hips back. No knee pain.',
  m_side_lunge: 'Heel on the floor. Chest lifted.',
  m_forward_fold: 'Soft knees. Head heavy.',
  m_down_dog: 'Push the mat away. Long back.',
  m_active_ham: 'Keep your lower back on the mat.',
  m_calf_wall: 'Back heel on the floor.',
  m_knee_to_wall: 'Keep your heel down.',
  m_ankle_circles: 'Only the ankle moves.',
  m_breathing: 'A long exhale. Your body is heavy on the mat.',
};
