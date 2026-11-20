// מסלול המוביליטי והגמישות — אזורי גוף, מבחן הטווחים, שאלון הבטיחות ונושאי האימון.
// הכללים ומה מהם מבוסס מחקר: docs/MOBILITY.md

export const REGIONS = {
  neck: 'Neck', shoulders: 'Shoulders', tspine: 'Upper back', lumbar: 'Lower back', hipflex: 'Hip flexors',
  hips: 'Hips & glutes', adductors: 'Adductors', hamstrings: 'Hamstrings', ankles: 'Ankles & calves', calm: 'Breathing',
};
// המתיחות הקיימות של שאר המסלולים — תמר משתמשת בהן גם
export const STRETCH_REGION = { quad_stretch: 'hipflex', hamstring_stretch: 'hamstrings', hip_flexor_stretch: 'hipflex', chest_stretch: 'shoulders', shoulder_stretch: 'shoulders', child_pose: 'lumbar' };

// מבחן טווחים ביתי: שישה מבחנים, ציון 0–3 בכל אחד (דיווח עצמי). regions = האזורים שהמבחן מעיד עליהם.
export const TESTS = [
  { id: 'ankle', name: 'Knee to wall', regions: ['ankles'],
    how: 'Kneel facing a wall with your front heel on the floor, and send your knee forward until it touches the wall. What\'s the greatest distance from your toes to the wall where this still works?',
    opts: ['Can\'t do it even right at the wall', 'Up to 5 cm', '5 to 10 cm', 'More than 10 cm'] },
  { id: 'ham', name: 'Fingers to floor', regions: ['hamstrings', 'lumbar'],
    how: 'Stand with straight legs and bend forward slowly, without bouncing. How far do your fingertips reach?',
    opts: ['To the knees', 'To mid-shin', 'Touching the floor', 'Palms on the floor'] },
  { id: 'shoulder', name: 'Hands behind the back', regions: ['shoulders'],
    how: 'One hand comes down over your shoulder, and the other comes up from below behind your back. How close are your fingers to each other? Answer for the harder side.',
    opts: ['More than a hand\'s width apart', 'Less than a hand\'s width apart', 'Touching', 'Overlapping'] },
  { id: 'overhead', name: 'Arms overhead against a wall', regions: ['tspine', 'shoulders', 'neck'],
    how: 'Stand with your back and glutes against a wall and raise straight arms overhead, without letting your lower back leave the wall. How far do your arms reach?',
    opts: ['To face height', 'Overhead, far from the wall', 'Almost touching the wall', 'Touching the wall easily'] },
  { id: 'squat', name: 'Deep squat', regions: ['hips', 'ankles', 'hipflex'],
    how: 'Lower into the deepest squat you can, without holding on to anything, and stay for half a minute.',
    opts: ['Can\'t get below chair height', 'Gets down, but the heels lift', 'Heels down, with effort', 'Comfortable, heels down and chest lifted'] },
  { id: 'hip', name: '90/90 sit', regions: ['hips', 'adductors', 'hipflex'],
    how: 'Sit on the floor: one leg bent in front and one to the side, both at a right angle. Can you sit tall without leaning on your hands?',
    opts: ['Can\'t get into the position', 'Only when leaning on my hands', 'Tall on one side only', 'Tall on both sides'] },
];
export const TEST_IDS = TESTS.map((t) => t.id);
export const MAX_SCORE = TESTS.length * 3;

// שאלון בטיחות: מצבים שבהם חלק מהתרגילים לא נכנסים לאימון, וכדאי לקבל אישור מרופא או מפיזיותרפיסט
export const FLAGS = {
  preg: { name: 'Pregnancy', note: 'No lying on your back or stomach for long, and no stretching to the limit — ligaments are looser during pregnancy.' },
  osteo: { name: 'Osteoporosis', note: 'No deep forward bends or strong twists of the spine.' },
  joint: { name: 'Joint replacement (hip / knee)', note: 'No deep hip or knee positions. It\'s important to get your permitted ranges of motion from your surgeon.' },
  hyper: { name: 'Hypermobility', note: 'Shorter holds, and stay short of your end range. The focus is on control, not on more range.' },
};
export const FLAG_BLOCK = {
  preg: ['m_cobra', 'm_supine_twist', 'm_knees_to_chest', 'm_happy_baby', 'm_figure4', 'm_active_ham', 'm_pelvic_tilt', 'm_breathing', 'm_frog', 'm_puppy'],
  osteo: ['m_forward_fold', 'm_seated_twist', 'm_supine_twist', 'm_knees_to_chest', 'hamstring_stretch', 'm_happy_baby'],
  joint: ['m_pigeon', 'm_9090', 'm_9090_switch', 'm_deep_squat', 'm_frog', 'm_figure4', 'm_couch', 'm_side_lunge', 'm_lizard', 'm_butterfly', 'm_happy_baby', 'm_hip_cars', 'quad_stretch'],
  hyper: [],
};
// פציעות (אותם מפתחות כמו בשאר המסלולים) → תרגילים שלא נכנסים
export const MOB_INJ = {
  knee: ['m_pigeon', 'm_deep_squat', 'm_couch', 'm_side_lunge', 'm_9090_switch', 'm_frog', 'quad_stretch', 'm_lizard'],
  back: ['m_cobra', 'm_forward_fold', 'm_seated_twist', 'm_supine_twist'],
  shoulder: ['m_back_scratch', 'm_overhead_lat', 'm_puppy', 'm_down_dog', 'm_wall_slide'],
  wrist: ['m_down_dog', 'm_wrist_stretch', 'm_thread_needle', 'm_cat_cow', 'm_hip_cars', 'm_puppy'],
};

// נושאי האימון: אילו אזורים, ובאיזה סדר עדיפות (לפני ששוקלים את תוצאות המבחן)
export const THEMES = {
  mFull: { name: 'Full body', focus: 'All the major joints, from neck to ankle', regions: ['tspine', 'hips', 'shoulders', 'hipflex', 'hamstrings', 'ankles', 'lumbar', 'adductors', 'neck'] },
  mHips: { name: 'Hips & legs', focus: 'Hips · hip flexors · hamstrings · ankles', regions: ['hips', 'hipflex', 'hamstrings', 'adductors', 'ankles', 'lumbar'] },
  mUpper: { name: 'Shoulders & upper back', focus: 'Shoulders · upper back · neck', regions: ['tspine', 'shoulders', 'neck', 'lumbar'] },
  mSpine: { name: 'Spine & posture', focus: 'What tightens up from long hours of sitting: back, chest and hip flexors', regions: ['tspine', 'hipflex', 'lumbar', 'neck', 'shoulders', 'hamstrings'] },
};
export const MOB_SPLITS = { 1: ['mFull'], 2: ['mHips', 'mUpper'], 3: ['mFull', 'mHips', 'mUpper'], 4: ['mFull', 'mHips', 'mUpper', 'mSpine'],
  5: ['mFull', 'mHips', 'mUpper', 'mSpine', 'mFull'], 6: ['mHips', 'mUpper', 'mSpine', 'mHips', 'mUpper', 'mFull'] };
export const MOB_MINUTES = [10, 20, 30];
