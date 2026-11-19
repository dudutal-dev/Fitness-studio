// תרגילי מסלול המוביליטי והגמישות (תמר). כולם לפי זמן, בלי ציוד מיוחד — מזרן, קיר וכיסא.
// region: אזור הגוף (ראו js/data/mob.js) · kind: static = החזקה רגועה · dynamic = תנועה איטית ומבוקרת
// unilateral: מחליפים צד באמצע הזמן. avoid: מצבים שבהם התרגיל לא נכנס לאימון (פציעות ושאלון הבטיחות).
// המקורות והכללים: docs/MOBILITY.md
const M = { group: 'mobility', pattern: 'mobility', type: 'time', mob: true, level: 1 };
const MAT = 'מזרן', STAND = 'עמידה', WALL = 'קיר', CHAIR = 'כיסא';

export const MOB_EXERCISES = [
  // ───── צוואר ─────
  { ...M, id: 'm_neck_side', name: 'הטיית צוואר לצד', region: 'neck', kind: 'static', unilateral: true, equip: STAND, muscles: ['traps'],
    cues: ['אוזן יורדת לכיוון הכתף, בלי להרים את הכתף', 'הכתף הנגדית כבדה ונמוכה', 'מתיחה עדינה בלבד — הצוואר לא אוהב כוח'] },

  // ───── כתפיים ─────
  { ...M, id: 'm_wall_slide', name: 'החלקות קיר', region: 'shoulders', kind: 'dynamic', equip: WALL, muscles: ['shoulders', 'upper_back'],
    cues: ['גב, ראש ואמות צמודים לקיר, מרפקים בתשעים מעלות', 'מחליקים את הידיים למעלה בלי שהגב התחתון יתנתק מהקיר', 'יורדים לאט חזרה'] },
  { ...M, id: 'm_shoulder_cars', name: 'מעגלי כתף מבוקרים', region: 'shoulders', kind: 'dynamic', unilateral: true, equip: STAND, muscles: ['shoulders'],
    cues: ['יד ישרה מציירת את המעגל הגדול ביותר שאפשר, לאט מאוד', 'שאר הגוף לא זז — רק הכתף עובדת', 'באמצע מחליפים יד'] },
  { ...M, id: 'm_overhead_lat', name: 'מתיחת רחב גבי', region: 'shoulders', kind: 'static', unilateral: true, equip: STAND, muscles: ['lats', 'obliques'],
    cues: ['יד אחת מעל הראש, היד השנייה אוחזת בשורש כף היד', 'נוטים הצידה ומושכים בעדינות', 'האגן נשאר במקום, שתי כפות הרגליים על הרצפה'] },
  { ...M, id: 'm_back_scratch', name: 'מתיחת יד אחורית מעל הראש', region: 'shoulders', kind: 'static', unilateral: true, equip: STAND, muscles: ['triceps', 'lats', 'shoulders'],
    cues: ['מרפק פונה לתקרה, כף היד בין השכמות', 'היד השנייה מקרבת את המרפק לכיוון הראש', 'צלעות סגורות — לא מקשתים את הגב'] },
  { ...M, id: 'm_wrist_stretch', name: 'מתיחת שורש כף היד', region: 'shoulders', kind: 'static', equip: MAT, muscles: ['forearms'],
    cues: ['על שש, כפות הידיים על המזרן והאצבעות פונות אל הברכיים', 'נשענים לאחור לאט עד שמרגישים מתיחה באמות', 'כף היד כולה נשארת על המזרן'] },

  // ───── גב עליון ─────
  { ...M, id: 'm_cat_cow', name: 'חתול־פרה', region: 'tspine', kind: 'dynamic', equip: MAT, muscles: ['lower_back', 'upper_back', 'abs'],
    cues: ['על שש: בשאיפה מקשתים את הגב ומרימים מבט', 'בנשיפה מעגלים את הגב לתקרה ומכניסים סנטר', 'חוליה אחרי חוליה, בקצב הנשימה'] },
  { ...M, id: 'm_thread_needle', name: 'השחלת מחט', region: 'tspine', kind: 'dynamic', unilateral: true, equip: MAT, muscles: ['upper_back', 'shoulders'],
    cues: ['על שש: יד אחת נשלחת מתחת לגוף עד שהכתף נוגעת במזרן', 'חוזרים ופותחים את אותה יד לתקרה, המבט עוקב', 'האגן נשאר מעל הברכיים'] },
  { ...M, id: 'm_open_book', name: 'ספר נפתח', region: 'tspine', kind: 'dynamic', unilateral: true, equip: MAT, muscles: ['upper_back', 'chest'],
    cues: ['שוכבים על הצד, ברכיים כפופות, ידיים ישרות קדימה אחת על השנייה', 'היד העליונה נפתחת לאט לצד השני, המבט עוקב אחריה', 'הברכיים נשארות צמודות זו לזו'] },
  { ...M, id: 'm_puppy', name: 'תנוחת גור', region: 'tspine', kind: 'static', equip: MAT, muscles: ['lats', 'shoulders', 'upper_back'],
    cues: ['על שש: הולכים עם הידיים קדימה, האגן נשאר מעל הברכיים', 'החזה שוקע לכיוון המזרן, המצח נח', 'נושמים לגב העליון'] },
  { ...M, id: 'm_seated_twist', name: 'סיבוב גו בישיבה', region: 'tspine', kind: 'static', unilateral: true, equip: MAT, muscles: ['obliques', 'upper_back'],
    cues: ['יושבים זקוף, רגל אחת כפופה מעל השנייה', 'מסתובבים לכיוון הברך הכפופה, המרפק הנגדי נשען עליה', 'בשאיפה מתארכים, בנשיפה מסתובבים עוד מעט'] },

  // ───── גב תחתון ─────
  { ...M, id: 'm_cobra', name: 'קוברה', region: 'lumbar', kind: 'static', equip: MAT, muscles: ['abs', 'lower_back'],
    cues: ['שוכבים על הבטן, כפות ידיים מתחת לכתפיים', 'מרימים את החזה בעדינות, האגן נשאר על המזרן', 'כתפיים רחוק מהאוזניים, ישבן רפוי'] },
  { ...M, id: 'm_knees_to_chest', name: 'ברכיים לחזה', region: 'lumbar', kind: 'static', equip: MAT, muscles: ['lower_back', 'glutes'],
    cues: ['שוכבים על הגב ומחבקים את שתי הברכיים', 'הגב התחתון נפרש על המזרן', 'אפשר להתנדנד בעדינות מצד לצד'] },
  { ...M, id: 'm_supine_twist', name: 'סיבוב גו בשכיבה', region: 'lumbar', kind: 'static', unilateral: true, equip: MAT, muscles: ['lower_back', 'obliques', 'glutes'],
    cues: ['שוכבים על הגב, ברך אחת חוצה את הגוף לצד השני', 'שתי הכתפיים נשארות על המזרן', 'המבט לצד ההפוך, נושמים לאט'] },
  { ...M, id: 'm_pelvic_tilt', name: 'הטיות אגן', region: 'lumbar', kind: 'dynamic', equip: MAT, muscles: ['abs', 'lower_back'],
    cues: ['שוכבים על הגב, ברכיים כפופות וכפות רגליים על המזרן', 'מצמידים את הגב התחתון למזרן, ואז מקשתים אותו מעט', 'תנועה קטנה ואיטית, רק מהאגן'] },
  { ...M, id: 'm_happy_baby', name: 'תינוק שמח', region: 'lumbar', kind: 'static', equip: MAT, muscles: ['glutes', 'lower_back', 'hamstrings'],
    cues: ['שוכבים על הגב ואוחזים בכפות הרגליים מבחוץ', 'ברכיים רחבות לכיוון בתי השחי', 'עצם הזנב נשארת על המזרן'] },
  { ...M, id: 'm_side_bend', name: 'כפיפה לצד בעמידה', region: 'lumbar', kind: 'static', unilateral: true, equip: STAND, muscles: ['obliques', 'lats'],
    cues: ['עומדים בפיסוק קל, יד אחת מעל הראש', 'נוטים הצידה בלי ליפול קדימה או אחורה', 'נושמים לצלעות הפתוחות'] },

  // ───── אגן וירכיים ─────
  { ...M, id: 'm_couch', name: 'מתיחת ספה', region: 'hipflex', kind: 'static', unilateral: true, level: 2, equip: `${WALL} / ספה`, muscles: ['quads', 'glutes'],
    cues: ['ברך אחורית על המזרן צמוד לקיר, השוק עולה על הקיר', 'הרגל הקדמית בכריעה, גו זקוף', 'מכווצים ישבן — זה מה שמעמיק את המתיחה'] },
  { ...M, id: 'm_lizard', name: 'לטאה', region: 'hipflex', kind: 'static', unilateral: true, equip: MAT, muscles: ['glutes', 'hamstrings', 'quads'],
    cues: ['כריעה עמוקה, שתי הידיים בצד הפנימי של הרגל הקדמית', 'הברך האחורית על המזרן, האגן שוקע קדימה ולמטה', 'אפשר לרדת לאמות אם נוח'] },
  { ...M, id: 'm_worlds_greatest', name: 'כריעה עם פתיחת חזה', region: 'hipflex', kind: 'dynamic', unilateral: true, equip: MAT, muscles: ['glutes', 'upper_back', 'hamstrings'],
    cues: ['כריעה עמוקה, יד אחת על הרצפה ליד כף הרגל הקדמית', 'היד השנייה נפתחת לתקרה, המבט עוקב', 'חוזרים למטה לאט וחוזרים על התנועה'] },
  { ...M, id: 'm_figure4', name: 'מתיחת ישבן בשכיבה', region: 'hips', kind: 'static', unilateral: true, equip: MAT, muscles: ['glutes'],
    cues: ['שוכבים על הגב, קרסול אחד מונח על הברך השנייה', 'מושכים את הרגל התחתונה לכיוון החזה', 'הראש והכתפיים נשארים על המזרן'] },
  { ...M, id: 'm_pigeon', name: 'יונה', region: 'hips', kind: 'static', unilateral: true, level: 2, equip: MAT, muscles: ['glutes'],
    cues: ['רגל קדמית כפופה לפני הגוף, רגל אחורית ישרה לאחור', 'האגן פונה קדימה, לא נופלים לצד', 'אפשר להתקפל קדימה על האמות'] },
  { ...M, id: 'm_9090', name: 'ישיבת תשעים־תשעים', region: 'hips', kind: 'static', unilateral: true, equip: MAT, muscles: ['glutes'],
    cues: ['יושבים כששתי הברכיים בזווית ישרה: אחת לפנים ואחת לצד', 'גו זקוף ונוטה מעט מעל הרגל הקדמית', 'שתי עצמות הישיבה שואפות אל המזרן'] },
  { ...M, id: 'm_9090_switch', name: 'מעברי תשעים־תשעים', region: 'hips', kind: 'dynamic', level: 2, equip: MAT, muscles: ['glutes', 'obliques'],
    cues: ['יושבים בתשעים־תשעים, הידיים מאחור לתמיכה', 'מרימים את הברכיים ומעבירים אותן לאט לצד השני', 'כפות הרגליים נשארות במקום'] },
  { ...M, id: 'm_hip_cars', name: 'מעגלי ירך מבוקרים', region: 'hips', kind: 'dynamic', unilateral: true, equip: MAT, muscles: ['glutes'],
    cues: ['על שש: ברך אחת מציירת מעגל גדול — קדימה, הצידה ולאחור', 'הגב והאגן לא זזים, רק מפרק הירך', 'לאט מאוד, ובאמצע מחליפים רגל'] },
  { ...M, id: 'm_hip_circles', name: 'סיבובי אגן', region: 'hips', kind: 'dynamic', equip: STAND, muscles: ['glutes', 'lower_back'],
    cues: ['עומדים בפיסוק, ידיים על המותניים', 'מציירים עם האגן מעגלים גדולים ואיטיים', 'באמצע מחליפים כיוון'] },
  { ...M, id: 'm_deep_squat', name: 'ישיבת סקוואט עמוקה', region: 'hips', kind: 'static', level: 2, equip: STAND, muscles: ['glutes', 'quads', 'calves'],
    cues: ['יורדים לסקוואט הכי עמוק שנוח, עקבים על הרצפה', 'המרפקים דוחפים את הברכיים החוצה, חזה מורם', 'אפשר להחזיק במשקוף או בכיסא לאיזון'] },

  // ───── מקרבים ─────
  { ...M, id: 'm_butterfly', name: 'פרפר', region: 'adductors', kind: 'static', equip: MAT, muscles: ['glutes'],
    cues: ['יושבים, כפות הרגליים צמודות זו לזו והברכיים נופלות לצדדים', 'גב ארוך, נוטים קדימה מהאגן', 'לא דוחפים את הברכיים בכוח'] },
  { ...M, id: 'm_frog', name: 'צפרדע', region: 'adductors', kind: 'static', level: 2, equip: MAT, muscles: ['glutes'],
    cues: ['על שש: מרחיקים את הברכיים לצדדים, שוקיים מקבילות', 'יורדים לאמות ושולחים את האגן לאחור', 'מתיחה בפנים הירך, בלי כאב בברך'] },
  { ...M, id: 'm_side_lunge', name: 'מעברי צד בפיסוק רחב', region: 'adductors', kind: 'dynamic', equip: STAND, muscles: ['glutes', 'quads', 'hamstrings'],
    cues: ['פיסוק רחב: מעבירים משקל לרגל אחת ומכופפים אותה', 'הרגל השנייה נשארת ישרה, העקב על הרצפה', 'עוברים לאט לצד השני, חזה מורם'] },

  // ───── ירך אחורית ─────
  { ...M, id: 'm_forward_fold', name: 'כפיפה לפנים בעמידה', region: 'hamstrings', kind: 'static', equip: STAND, muscles: ['hamstrings', 'lower_back', 'calves'],
    cues: ['מתקפלים מהאגן, הידיים והראש כבדים למטה', 'ברכיים מעט רכות', 'בכל נשיפה מרפים עוד קצת — לא מושכים בכוח'] },
  { ...M, id: 'm_down_dog', name: 'כלב מביט מטה', region: 'hamstrings', kind: 'static', equip: MAT, muscles: ['hamstrings', 'calves', 'shoulders'],
    cues: ['ידיים ורגליים על המזרן, האגן גבוה — הגוף בצורת וי הפוכה', 'דוחפים את המזרן ומאריכים את הגב', 'עקבים שואפים לרצפה; ברכיים יכולות להיות כפופות'] },
  { ...M, id: 'm_active_ham', name: 'הרמת רגל ישרה בשכיבה', region: 'hamstrings', kind: 'dynamic', unilateral: true, equip: MAT, muscles: ['hamstrings', 'abs'],
    cues: ['שוכבים על הגב, רגל אחת ישרה על המזרן', 'מרימים את הרגל השנייה ישרה ככל האפשר, ומורידים לאט', 'האגן והגב התחתון נשארים על המזרן'] },

  // ───── קרסוליים ושוקיים ─────
  { ...M, id: 'm_calf_wall', name: 'מתיחת תאומים מול קיר', region: 'ankles', kind: 'static', unilateral: true, equip: WALL, muscles: ['calves'],
    cues: ['ידיים על הקיר, רגל אחת לאחור — ישרה, והעקב על הרצפה', 'נשענים קדימה עד למתיחה בשוק', 'כף הרגל האחורית פונה ישר קדימה'] },
  { ...M, id: 'm_knee_to_wall', name: 'ברך לקיר', region: 'ankles', kind: 'dynamic', unilateral: true, equip: WALL, muscles: ['calves'],
    cues: ['כף רגל במרחק קצר מהקיר, העקב נשאר על הרצפה', 'שולחים את הברך קדימה עד שהיא נוגעת בקיר, וחוזרים', 'הברך נעה מעל האצבע השנייה'] },
  { ...M, id: 'm_ankle_circles', name: 'סיבובי קרסול', region: 'ankles', kind: 'dynamic', unilateral: true, equip: `${STAND} / ${CHAIR}`, muscles: ['calves'],
    cues: ['מרימים רגל אחת ומציירים עם הבהונות מעגלים גדולים', 'רק הקרסול זז, השוק יציבה', 'באמצע מחליפים רגל'] },

  // ───── סיום ─────
  { ...M, id: 'm_breathing', name: 'נשימה סרעפתית', region: 'calm', kind: 'static', equip: MAT, muscles: ['abs'],
    cues: ['שוכבים על הגב, יד אחת על הבטן ויד אחת על החזה', 'שאיפה מהאף — הבטן עולה; נשיפה ארוכה מהפה', 'הנשיפה ארוכה מהשאיפה. הגוף כבד על המזרן'] },
];

// דגשים שהמאמנת אומרת כמה שניות אחרי תחילת התרגיל
export const MOB_TIPS = {
  m_neck_side: 'הכתף הנגדית כבדה ונמוכה. בלי כוח.',
  m_wall_slide: 'הגב התחתון נשאר צמוד לקיר.',
  m_shoulder_cars: 'רק הכתף זזה. מעגל גדול ואיטי.',
  m_overhead_lat: 'האגן נשאר במקום. נושמים לצד הפתוח.',
  m_back_scratch: 'צלעות סגורות. לא מקשתים את הגב.',
  m_wrist_stretch: 'כף היד כולה על המזרן. נשענים לאחור לאט.',
  m_cat_cow: 'חוליה אחרי חוליה, בקצב הנשימה.',
  m_thread_needle: 'האגן מעל הברכיים. המבט עוקב אחרי היד.',
  m_open_book: 'הברכיים צמודות. היד נפתחת לאט.',
  m_puppy: 'החזה שוקע. נושמים לגב העליון.',
  m_seated_twist: 'בשאיפה מתארכים, בנשיפה מסתובבים.',
  m_cobra: 'האגן על המזרן. כתפיים רחוק מהאוזניים.',
  m_knees_to_chest: 'הגב התחתון נפרש על המזרן.',
  m_supine_twist: 'שתי הכתפיים על המזרן. נושמים לאט.',
  m_pelvic_tilt: 'תנועה קטנה, רק מהאגן.',
  m_happy_baby: 'עצם הזנב נשארת על המזרן.',
  m_side_bend: 'לא נופלים קדימה. נושמים לצלעות.',
  m_couch: 'מכווצים ישבן. גו זקוף.',
  m_lizard: 'האגן שוקע קדימה ולמטה.',
  m_worlds_greatest: 'היד נפתחת לתקרה. המבט עוקב.',
  m_figure4: 'הראש והכתפיים על המזרן.',
  m_pigeon: 'האגן פונה קדימה. לא נופלים לצד.',
  m_9090: 'גו זקוף. שתי עצמות הישיבה למטה.',
  m_9090_switch: 'כפות הרגליים במקום. לאט.',
  m_hip_cars: 'הגב לא זז. רק מפרק הירך.',
  m_hip_circles: 'מעגלים גדולים ואיטיים.',
  m_deep_squat: 'עקבים על הרצפה. חזה מורם.',
  m_butterfly: 'גב ארוך. לא דוחפים את הברכיים.',
  m_frog: 'האגן לאחור. בלי כאב בברך.',
  m_side_lunge: 'העקב על הרצפה. חזה מורם.',
  m_forward_fold: 'ברכיים רכות. הראש כבד.',
  m_down_dog: 'דוחפים את המזרן. הגב ארוך.',
  m_active_ham: 'הגב התחתון נשאר על המזרן.',
  m_calf_wall: 'העקב האחורי על הרצפה.',
  m_knee_to_wall: 'העקב לא מתרומם.',
  m_ankle_circles: 'רק הקרסול זז.',
  m_breathing: 'נשיפה ארוכה. הגוף כבד על המזרן.',
};
