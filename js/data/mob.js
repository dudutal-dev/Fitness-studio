// מסלול המוביליטי והגמישות — אזורי גוף, מבחן הטווחים, שאלון הבטיחות ונושאי האימון.
// הכללים ומה מהם מבוסס מחקר: docs/MOBILITY.md

export const REGIONS = {
  neck: 'צוואר', shoulders: 'כתפיים', tspine: 'גב עליון', lumbar: 'גב תחתון', hipflex: 'מכופפי ירך',
  hips: 'אגן וישבן', adductors: 'מקרבים', hamstrings: 'ירך אחורית', ankles: 'קרסוליים ושוקיים', calm: 'נשימה',
};
// המתיחות הקיימות של שאר המסלולים — תמר משתמשת בהן גם
export const STRETCH_REGION = { quad_stretch: 'hipflex', hamstring_stretch: 'hamstrings', hip_flexor_stretch: 'hipflex', chest_stretch: 'shoulders', shoulder_stretch: 'shoulders', child_pose: 'lumbar' };

// מבחן טווחים ביתי: שישה מבחנים, ציון 0–3 בכל אחד (דיווח עצמי). regions = האזורים שהמבחן מעיד עליהם.
export const TESTS = [
  { id: 'ankle', name: 'ברך לקיר', regions: ['ankles'],
    how: 'כורעים מול קיר, העקב הקדמי על הרצפה, ושולחים את הברך קדימה עד שהיא נוגעת בקיר. מה המרחק הגדול ביותר של הבהונות מהקיר שבו זה עדיין מצליח?',
    opts: ['לא מצליח גם צמוד לקיר', 'עד 5 ס״מ', '5 עד 10 ס״מ', 'יותר מ-10 ס״מ'] },
  { id: 'ham', name: 'אצבעות לרצפה', regions: ['hamstrings', 'lumbar'],
    how: 'עומדים ברגליים ישרות ומתכופפים קדימה לאט, בלי לקפוץ. לאן מגיעות קצות האצבעות?',
    opts: ['עד הברכיים', 'עד אמצע השוק', 'נוגעות ברצפה', 'כפות הידיים על הרצפה'] },
  { id: 'shoulder', name: 'ידיים מאחורי הגב', regions: ['shoulders'],
    how: 'יד אחת יורדת מעל הכתף, והשנייה עולה מלמטה מאחורי הגב. כמה קרובות האצבעות זו לזו? עונים לפי הצד הקשה יותר.',
    opts: ['רחוקות יותר מכף יד', 'פחות מכף יד', 'נוגעות', 'חופפות'] },
  { id: 'overhead', name: 'ידיים מעל הראש מול קיר', regions: ['tspine', 'shoulders', 'neck'],
    how: 'עומדים עם הגב והישבן צמודים לקיר ומרימים ידיים ישרות מעל הראש, בלי שהגב התחתון יתנתק מהקיר. לאן מגיעות הידיים?',
    opts: ['עד גובה הפנים', 'מעל הראש, רחוק מהקיר', 'כמעט נוגעות בקיר', 'נוגעות בקיר בקלות'] },
  { id: 'squat', name: 'סקוואט עמוק', regions: ['hips', 'ankles', 'hipflex'],
    how: 'יורדים לסקוואט הכי עמוק שאפשר, בלי להחזיק בכלום, ונשארים חצי דקה.',
    opts: ['לא יורד מתחת לגובה כיסא', 'יורד, אבל העקבים מתרוממים', 'עקבים למטה, במאמץ', 'נוח, עקבים למטה וחזה מורם'] },
  { id: 'hip', name: 'ישיבת 90/90', regions: ['hips', 'adductors', 'hipflex'],
    how: 'יושבים על הרצפה: רגל אחת כפופה לפנים ואחת לצד, שתיהן בזווית ישרה. אפשר לשבת זקוף בלי להישען על הידיים?',
    opts: ['לא מצליח להגיע לתנוחה', 'רק בהישענות על הידיים', 'זקוף בצד אחד בלבד', 'זקוף בשני הצדדים'] },
];
export const TEST_IDS = TESTS.map((t) => t.id);
export const MAX_SCORE = TESTS.length * 3;

// שאלון בטיחות: מצבים שבהם חלק מהתרגילים לא נכנסים לאימון, וכדאי לקבל אישור מרופא או מפיזיותרפיסט
export const FLAGS = {
  preg: { name: 'היריון', note: 'בלי שכיבה ממושכת על הגב או על הבטן, ובלי מתיחות עד הקצה — הרצועות רפויות יותר בהיריון.' },
  osteo: { name: 'אוסטאופורוזיס', note: 'בלי כפיפות עמוקות וסיבובים חזקים של עמוד השדרה.' },
  joint: { name: 'מפרק מוחלף (ירך / ברך)', note: 'בלי תנוחות עמוקות של הירך והברך. חשוב לקבל את טווחי התנועה המותרים מהמנתח.' },
  hyper: { name: 'גמישות־יתר', note: 'החזקות קצרות יותר ובלי להגיע לקצה הטווח. הדגש הוא על שליטה, לא על עוד טווח.' },
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
  mFull: { name: 'גוף מלא', focus: 'כל המפרקים הגדולים, מהצוואר עד הקרסול', regions: ['tspine', 'hips', 'shoulders', 'hipflex', 'hamstrings', 'ankles', 'lumbar', 'adductors', 'neck'] },
  mHips: { name: 'אגן ורגליים', focus: 'ירכיים · מכופפי ירך · ירך אחורית · קרסוליים', regions: ['hips', 'hipflex', 'hamstrings', 'adductors', 'ankles', 'lumbar'] },
  mUpper: { name: 'כתפיים וגב עליון', focus: 'כתפיים · גב עליון · צוואר', regions: ['tspine', 'shoulders', 'neck', 'lumbar'] },
  mSpine: { name: 'עמוד שדרה ויציבה', focus: 'מה שמתקצר בישיבה ממושכת: גב, חזה ומכופפי ירך', regions: ['tspine', 'hipflex', 'lumbar', 'neck', 'shoulders', 'hamstrings'] },
};
export const MOB_SPLITS = { 1: ['mFull'], 2: ['mHips', 'mUpper'], 3: ['mFull', 'mHips', 'mUpper'], 4: ['mFull', 'mHips', 'mUpper', 'mSpine'],
  5: ['mFull', 'mHips', 'mUpper', 'mSpine', 'mFull'], 6: ['mHips', 'mUpper', 'mSpine', 'mHips', 'mUpper', 'mFull'] };
export const MOB_MINUTES = [10, 20, 30];
