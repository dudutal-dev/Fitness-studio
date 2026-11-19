// ספריית התרגילים — כל תרגיל כולל הנחיות ביצוע, טמפו, שרירים ופרמטרים להתקדמות.
// type: weight = משקל חיצוני | bw = משקל גוף | time = החזקה בזמן | cardio = מרווחי זמן
// load: יחס התחלתי למשקל גוף (לפי רמה 1..5) עבור 10 חזרות — ההמלצה מתעדכנת אוטומטית לפי ביצועים.

export const MUSCLES = {
  chest: 'חזה', shoulders: 'כתפיים', biceps: 'יד קדמית', triceps: 'יד אחורית', forearms: 'אמות',
  abs: 'בטן', obliques: 'אלכסונים', quads: 'ארבע ראשי', hamstrings: 'ירך אחורית', glutes: 'ישבן',
  calves: 'תאומים', lats: 'רחב גבי', upper_back: 'גב עליון', lower_back: 'גב תחתון', traps: 'טרפזים',
};

export const GROUPS = {
  legs: 'רגליים', back: 'גב', chest: 'חזה', shoulders: 'כתפיים', arms: 'ידיים', core: 'ליבה', conditioning: 'כושר פונקציונלי', mobility: 'חימום ומתיחות',
};

import { CALI_EXERCISES } from './cali-exercises.js';

const E = (o) => ({ unilateral: false, compound: false, inc: 2.5, tempo: [2, 0, 1], alts: [], ...o });

export const EXERCISES = [
  // ───── רגליים ─────
  E({ id: 'back_squat', name: 'סקוואט עם מוט', group: 'legs', pattern: 'squat', type: 'weight', compound: true, inc: 5,
    muscles: ['quads', 'glutes', 'hamstrings', 'lower_back'], equip: 'מתקן סקוואט + מוט', level: 2, load: [0.4, 0.6, 0.8, 1.0, 1.2],
    tempo: [3, 0, 1], alts: ['leg_press', 'bulgarian_split'],
    cues: ['כפות רגליים ברוחב כתפיים, אצבעות מעט החוצה', 'חזה למעלה, גב ניטרלי — נשימה עמוקה ונעילת בטן', 'יורדים עד שהירך מקבילה לרצפה, ברכיים בכיוון האצבעות', 'דוחפים את הרצפה ועולים בכוח'] }),
  E({ id: 'leg_press', name: 'לחיצת רגליים', group: 'legs', pattern: 'squat', type: 'weight', compound: true, inc: 10,
    muscles: ['quads', 'glutes'], equip: 'מכונת לג פרס', level: 1, load: [0.8, 1.2, 1.6, 2.0, 2.5],
    tempo: [3, 0, 1], alts: ['back_squat'],
    cues: ['גב תחתון צמוד לכרית לאורך כל התנועה', 'יורדים עד זווית 90 בברכיים', 'לא נועלים ברכיים למעלה'] }),
  E({ id: 'rdl', name: 'דדליפט רומני', group: 'legs', pattern: 'hinge', type: 'weight', compound: true, inc: 5,
    muscles: ['hamstrings', 'glutes', 'lower_back'], equip: 'מוט אולימפי', level: 2, load: [0.4, 0.6, 0.8, 1.0, 1.2],
    tempo: [3, 1, 1], alts: ['deadlift', 'leg_curl'],
    cues: ['ברכיים רכות, גב ישר לאורך כל הדרך', 'מוט צמוד לירכיים, דוחפים את האגן אחורה', 'מרגישים מתיחה בירך האחורית ועולים בכיווץ ישבן'] }),
  E({ id: 'deadlift', name: 'דדליפט', group: 'legs', pattern: 'hinge', type: 'weight', compound: true, inc: 5,
    muscles: ['hamstrings', 'glutes', 'lower_back', 'traps', 'forearms'], equip: 'מוט אולימפי', level: 3, load: [0.6, 0.9, 1.2, 1.5, 1.8],
    tempo: [2, 0, 1], alts: ['rdl'],
    cues: ['מוט מעל אמצע כף הרגל', 'גב ניטרלי, כתפיים מעל המוט, נעילת בטן', 'דוחפים רגליים ופותחים אגן יחד', 'במנעול — עומדים זקוף, לא נשענים אחורה'] }),
  E({ id: 'db_lunge', name: 'מכרעים עם משקולות', group: 'legs', pattern: 'lunge', type: 'weight', compound: true, inc: 2, unilateral: true,
    muscles: ['quads', 'glutes', 'hamstrings'], equip: 'משקולות יד', level: 1, load: [0.1, 0.15, 0.2, 0.25, 0.3],
    alts: ['bulgarian_split'],
    cues: ['צעד ארוך קדימה, גו זקוף', 'ברך אחורית כמעט נוגעת ברצפה', 'דוחפים מהעקב הקדמי חזרה'] }),
  E({ id: 'bulgarian_split', name: 'סקוואט בולגרי', group: 'legs', pattern: 'lunge', type: 'weight', compound: true, inc: 2, unilateral: true,
    muscles: ['quads', 'glutes'], equip: 'ספסל + משקולות יד', level: 2, load: [0.05, 0.1, 0.15, 0.2, 0.25],
    alts: ['db_lunge'],
    cues: ['רגל אחורית על הספסל', 'יורדים ישר למטה עד ירך מקבילה', 'ברך קדמית יציבה מעל כף הרגל'] }),
  E({ id: 'leg_ext', name: 'פשיטת ברכיים', group: 'legs', pattern: 'iso', type: 'weight', inc: 5,
    muscles: ['quads'], equip: 'מכונת פשיטת ברכיים', level: 1, load: [0.3, 0.4, 0.5, 0.6, 0.7],
    tempo: [2, 1, 1], cues: ['גב צמוד למשענת', 'פושטים עד הסוף ומחזיקים שנייה', 'יורדים לאט'] }),
  E({ id: 'leg_curl', name: 'כפיפת ברכיים', group: 'legs', pattern: 'iso', type: 'weight', inc: 5,
    muscles: ['hamstrings'], equip: 'מכונת כפיפת ברכיים', level: 1, load: [0.2, 0.3, 0.4, 0.5, 0.6],
    tempo: [3, 1, 1], cues: ['אגן צמוד לכרית', 'מכופפים עד הסוף ולוחצים', 'שליטה מלאה בירידה'] }),
  E({ id: 'calf_raise', name: 'הרמות עקבים', group: 'legs', pattern: 'iso', type: 'weight', inc: 5,
    muscles: ['calves'], equip: 'מכונת תאומים', level: 1, load: [0.5, 0.7, 0.9, 1.1, 1.3],
    tempo: [2, 1, 1], cues: ['עולים הכי גבוה שאפשר', 'עצירה למעלה', 'יורדים עד מתיחה מלאה'] }),
  E({ id: 'hip_thrust', name: 'הרמות אגן עם מוט', group: 'legs', pattern: 'hinge', type: 'weight', compound: true, inc: 5,
    muscles: ['glutes', 'hamstrings'], equip: 'ספסל + מוט', level: 2, load: [0.5, 0.8, 1.1, 1.4, 1.7],
    tempo: [2, 1, 1], cues: ['שכמות על הספסל, סנטר למטה', 'דוחפים מהעקבים עד גוף מקביל לרצפה', 'כיווץ ישבן חזק למעלה'] }),

  // ───── גב ─────
  E({ id: 'pullup', name: 'מתח', group: 'back', pattern: 'pull_v', type: 'bw', compound: true,
    muscles: ['lats', 'biceps', 'upper_back'], equip: 'מוט מתח', level: 2, alts: ['lat_pulldown'],
    cues: ['אחיזה מעט רחבה מהכתפיים', 'מושכים מרפקים לכיוון הצלעות', 'סנטר מעל המוט', 'ירידה מלאה ומבוקרת'] }),
  E({ id: 'lat_pulldown', name: 'פולי עליון', group: 'back', pattern: 'pull_v', type: 'weight', compound: true, inc: 5,
    muscles: ['lats', 'biceps'], equip: 'מכונת פולי', level: 1, load: [0.4, 0.55, 0.7, 0.85, 1.0],
    alts: ['pullup'], cues: ['חזה למעלה, הישענות קלה לאחור', 'מושכים לעצם הבריח', 'מקרבים שכמות למטה ולאחור'] }),
  E({ id: 'cable_row', name: 'חתירה בכבל', group: 'back', pattern: 'pull_h', type: 'weight', compound: true, inc: 5,
    muscles: ['upper_back', 'lats', 'biceps'], equip: 'מכונת חתירה בכבל', level: 1, load: [0.4, 0.55, 0.7, 0.85, 1.0],
    cues: ['גב זקוף, לא מתנדנדים', 'מושכים לבטן', 'סוחטים את השכמות'] }),
  E({ id: 'bb_row', name: 'חתירה עם מוט', group: 'back', pattern: 'pull_h', type: 'weight', compound: true, inc: 5,
    muscles: ['upper_back', 'lats', 'lower_back', 'biceps'], equip: 'מוט אולימפי', level: 2, load: [0.3, 0.45, 0.6, 0.75, 0.9],
    alts: ['db_row'], cues: ['גו בארבעים וחמש מעלות, גב ישר', 'מוט לחזה התחתון', 'ירידה מבוקרת'] }),
  E({ id: 'db_row', name: 'חתירה ביד אחת', group: 'back', pattern: 'pull_h', type: 'weight', compound: true, inc: 2, unilateral: true,
    muscles: ['lats', 'upper_back', 'biceps'], equip: 'ספסל + משקולת יד', level: 1, load: [0.15, 0.25, 0.35, 0.45, 0.55],
    cues: ['גב מקביל לרצפה', 'מרפק צמוד לגוף, מושכים לירך', 'לא מסובבים את הגו'] }),
  E({ id: 'face_pull', name: 'פייס פול', group: 'shoulders', pattern: 'pull_h', type: 'weight', inc: 2.5,
    muscles: ['shoulders', 'upper_back', 'traps'], equip: 'כבל + חבל', level: 1, load: [0.15, 0.2, 0.25, 0.3, 0.35],
    tempo: [2, 1, 1], cues: ['מרפקים גבוהים', 'מושכים לפנים ומפרידים את קצוות החבל', 'סיבוב חיצוני של הכתף'] }),

  // ───── חזה ─────
  E({ id: 'bench_press', name: 'לחיצת חזה במוט', group: 'chest', pattern: 'push_h', type: 'weight', compound: true, inc: 2.5,
    muscles: ['chest', 'triceps', 'shoulders'], equip: 'ספסל + מוט', level: 2, load: [0.4, 0.55, 0.75, 0.95, 1.15],
    tempo: [3, 0, 1], alts: ['incline_db_press', 'pushup'],
    cues: ['שכמות מקורבות וקשת קלה', 'מוט יורד לאמצע החזה', 'מרפקים ב-45 מעלות', 'דוחפים בכוח עד נעילה'] }),
  E({ id: 'incline_db_press', name: 'לחיצת חזה בשיפוע', group: 'chest', pattern: 'push_h', type: 'weight', compound: true, inc: 2,
    muscles: ['chest', 'shoulders', 'triceps'], equip: 'ספסל משופע + משקולות', level: 1, load: [0.12, 0.18, 0.25, 0.32, 0.4],
    tempo: [3, 0, 1], cues: ['שיפוע של 30 מעלות', 'משקולות יורדות לגובה החזה', 'לוחצים למעלה ומקרבים'] }),
  E({ id: 'cable_fly', name: 'פרפר בכבלים', group: 'chest', pattern: 'iso', type: 'weight', inc: 2.5,
    muscles: ['chest'], equip: 'קרוס־אובר', level: 1, load: [0.08, 0.12, 0.16, 0.2, 0.25],
    tempo: [2, 1, 1], cues: ['מרפקים מעט כפופים וקבועים', 'תנועת חיבוק רחבה', 'סוחטים את החזה במרכז'] }),
  E({ id: 'pushup', name: 'שכיבות סמיכה', group: 'chest', pattern: 'push_h', type: 'bw', compound: true,
    muscles: ['chest', 'triceps', 'shoulders', 'abs'], equip: 'משקל גוף', level: 1,
    cues: ['גוף בקו ישר מהראש לעקבים', 'חזה כמעט נוגע ברצפה', 'מרפקים ב-45 מעלות'] }),
  E({ id: 'dips', name: 'מקבילים', group: 'chest', pattern: 'push_v', type: 'bw', compound: true,
    muscles: ['chest', 'triceps', 'shoulders'], equip: 'מקבילים', level: 2,
    cues: ['הטיה קלה קדימה', 'יורדים עד 90 מעלות במרפק', 'נעילה מלאה למעלה'] }),

  // ───── כתפיים ─────
  E({ id: 'ohp', name: 'לחיצת כתפיים בעמידה', group: 'shoulders', pattern: 'push_v', type: 'weight', compound: true, inc: 2.5,
    muscles: ['shoulders', 'triceps', 'traps'], equip: 'מוט אולימפי', level: 2, load: [0.25, 0.35, 0.45, 0.55, 0.65],
    cues: ['ישבן ובטן נעולים', 'מוט עולה בקו ישר, ראש זז אחורה', 'נעילה מעל הראש'] }),
  E({ id: 'lateral_raise', name: 'הרחקת כתפיים', group: 'shoulders', pattern: 'iso', type: 'weight', inc: 1,
    muscles: ['shoulders'], equip: 'משקולות יד', level: 1, load: [0.04, 0.06, 0.08, 0.1, 0.12],
    tempo: [2, 1, 1], cues: ['מרפקים מעט כפופים', 'עד גובה הכתפיים בלבד', 'בלי תנופה'] }),
  E({ id: 'rear_delt_fly', name: 'פרפר הפוך', group: 'shoulders', pattern: 'iso', type: 'weight', inc: 2.5,
    muscles: ['shoulders', 'upper_back'], equip: 'מכונת פרפר', level: 1, load: [0.12, 0.16, 0.2, 0.25, 0.3],
    tempo: [2, 1, 1], cues: ['חזה צמוד לכרית', 'פותחים ידיים לאחור בקשת', 'סוחטים את הכתף האחורית'] }),

  // ───── ידיים ─────
  E({ id: 'bb_curl', name: 'כפיפת מרפקים במוט', group: 'arms', pattern: 'iso', type: 'weight', inc: 2.5,
    muscles: ['biceps', 'forearms'], equip: 'מוט', level: 1, load: [0.15, 0.2, 0.28, 0.35, 0.42],
    tempo: [3, 0, 1], cues: ['מרפקים צמודים לגוף', 'בלי תנופה בגב', 'ירידה איטית'] }),
  E({ id: 'hammer_curl', name: 'פטישים', group: 'arms', pattern: 'iso', type: 'weight', inc: 1,
    muscles: ['biceps', 'forearms'], equip: 'משקולות יד', level: 1, load: [0.07, 0.1, 0.13, 0.16, 0.2],
    tempo: [2, 0, 1], cues: ['אחיזה ניטרלית', 'מרפק קבוע', 'שליטה מלאה'] }),
  E({ id: 'rope_pushdown', name: 'פשיטת מרפקים בכבל', group: 'arms', pattern: 'iso', type: 'weight', inc: 2.5,
    muscles: ['triceps'], equip: 'כבל + חבל', level: 1, load: [0.15, 0.2, 0.27, 0.34, 0.4],
    tempo: [2, 1, 1], cues: ['מרפקים צמודים לצלעות', 'פושטים עד הסוף ומפרידים את החבל', 'חוזרים לאט'] }),
  E({ id: 'oh_tri_ext', name: 'פשיטת מרפקים מעל הראש', group: 'arms', pattern: 'iso', type: 'weight', inc: 2,
    muscles: ['triceps'], equip: 'משקולת יד', level: 1, load: [0.1, 0.14, 0.18, 0.22, 0.27],
    tempo: [3, 0, 1], cues: ['מרפקים מכוונים לתקרה', 'יורדים מאחורי הראש', 'פשיטה מלאה'] }),

  // ───── ליבה ─────
  E({ id: 'plank', name: 'פלאנק', group: 'core', pattern: 'core', type: 'time',
    muscles: ['abs', 'obliques'], equip: 'מזרן', level: 1,
    cues: ['מרפקים מתחת לכתפיים', 'גוף ישר — לא מרימים אגן', 'נושמים ונועלים בטן'] }),
  E({ id: 'hanging_leg_raise', name: 'הרמות רגליים בתלייה', group: 'core', pattern: 'core', type: 'bw',
    muscles: ['abs', 'obliques', 'forearms'], equip: 'מוט מתח', level: 2,
    cues: ['תלייה יציבה בלי נדנוד', 'מרימים רגליים לגובה האגן', 'ירידה איטית'] }),
  E({ id: 'woodchop', name: 'חוטב עצים בכבל', group: 'core', pattern: 'core', type: 'weight', inc: 2.5, unilateral: true,
    muscles: ['obliques', 'abs', 'shoulders'], equip: 'כבל', level: 1, load: [0.1, 0.14, 0.18, 0.22, 0.26],
    cues: ['סיבוב מהגו, ידיים ישרות', 'תנועה אלכסונית מלמעלה למטה', 'שליטה בחזרה'] }),
  E({ id: 'ab_wheel', name: 'גלגלת בטן', group: 'core', pattern: 'core', type: 'bw',
    muscles: ['abs', 'lats'], equip: 'גלגלת', level: 2,
    cues: ['בטן נעולה, גב לא קורס', 'מתגלגלים רק כמה ששולטים', 'חוזרים בכיווץ בטן'] }),

  // ───── כושר קרבי ─────
  E({ id: 'kb_swing', name: 'סווינג קטלבל', group: 'conditioning', pattern: 'hinge', type: 'weight', compound: true, inc: 4,
    muscles: ['glutes', 'hamstrings', 'lower_back', 'shoulders'], equip: 'קטלבל', level: 1, load: [0.16, 0.2, 0.24, 0.3, 0.36],
    tempo: [1, 0, 1], cues: ['תנועה מהאגן — לא סקוואט', 'פיצוץ ישבן למעלה', 'ידיים רק מכוונות'] }),
  E({ id: 'burpee', name: 'ברפי', group: 'conditioning', pattern: 'cardio', type: 'bw', compound: true,
    muscles: ['chest', 'quads', 'shoulders', 'abs'], equip: 'משקל גוף', level: 1, tempo: [1, 0, 1],
    cues: ['ידיים לרצפה, קפיצה לפלאנק', 'שכיבת סמיכה', 'קפיצה למעלה עם ידיים'] }),
  // ───── משקל גוף — בלי ציוד, בכל מקום ─────
  E({ id: 'air_squat', name: 'סקוואט משקל גוף', group: 'legs', pattern: 'squat', type: 'bw', compound: true,
    muscles: ['quads', 'glutes', 'hamstrings'], equip: 'משקל גוף', level: 1, tempo: [2, 0, 1],
    cues: ['כפות רגליים ברוחב כתפיים, ידיים קדימה', 'יורדים עד שהירך מקבילה לרצפה', 'עקבים על הרצפה, חזה למעלה'] }),
  E({ id: 'bw_lunge', name: 'מכרעים', group: 'legs', pattern: 'lunge', type: 'bw', compound: true, unilateral: true,
    muscles: ['quads', 'glutes', 'hamstrings'], equip: 'משקל גוף', level: 1, tempo: [2, 0, 1],
    cues: ['צעד ארוך קדימה, גו זקוף', 'ברך אחורית כמעט נוגעת ברצפה', 'דוחפים מהעקב הקדמי חזרה, ומחליפים רגל'] }),
  E({ id: 'glute_bridge', name: 'גשר ישבן', group: 'legs', pattern: 'hinge', type: 'bw',
    muscles: ['glutes', 'hamstrings', 'lower_back'], equip: 'מזרן', level: 1, tempo: [2, 1, 1],
    cues: ['שכיבה על הגב, ברכיים כפופות, כפות רגליים על הרצפה', 'דוחפים מהעקבים עד קו ישר מהכתפיים לברכיים', 'כיווץ ישבן למעלה, ויורדים לאט'] }),
  E({ id: 'mountain_climber', name: 'מטפסי הרים', group: 'conditioning', pattern: 'cardio', type: 'bw', compound: true,
    muscles: ['abs', 'shoulders', 'quads'], equip: 'משקל גוף', level: 1, tempo: [1, 0, 1],
    cues: ['פלאנק גבוה, כתפיים מעל כפות הידיים', 'ברך לחזה ומחליפים רגל בקצב', 'אגן נמוך, בטן אסופה'] }),
  E({ id: 'farmer_carry', name: 'הליכת חקלאי', group: 'conditioning', pattern: 'carry', type: 'time', compound: true,
    muscles: ['forearms', 'traps', 'abs', 'glutes'], equip: 'משקולות כבדות', level: 1, load: [0.25, 0.3, 0.4, 0.5, 0.6],
    cues: ['עומדים זקוף, כתפיים למטה', 'צעדים קצרים ויציבים', 'אחיזה חזקה — לא מוותרים'] }),
  E({ id: 'box_jump', name: 'קפיצה לקופסה', group: 'conditioning', pattern: 'plyo', type: 'bw', compound: true,
    muscles: ['quads', 'glutes', 'calves'], equip: 'קופסת פליאו', level: 2, tempo: [1, 0, 1],
    cues: ['תנופת ידיים', 'נחיתה רכה בכפיפת ברכיים', 'יורדים בצעד — לא בקפיצה'] }),
  E({ id: 'battle_rope', name: 'חבלי קרב', group: 'conditioning', pattern: 'cardio', type: 'time',
    muscles: ['shoulders', 'forearms', 'abs'], equip: 'חבלי קרב', level: 1,
    cues: ['חצי סקוואט יציב', 'גלים מהירים לסירוגין', 'נושמים בקצב'] }),
  E({ id: 'rower', name: 'מכונת חתירה', group: 'conditioning', pattern: 'cardio', type: 'cardio',
    muscles: ['lats', 'quads', 'upper_back', 'hamstrings'], equip: 'מכונת חתירה', level: 1,
    cues: ['רגליים — גו — ידיים', 'חזרה: ידיים — גו — רגליים', 'קצב יציב של 24–28 משיכות'] }),
  E({ id: 'sled_push', name: 'דחיפת מזחלת', group: 'conditioning', pattern: 'carry', type: 'time', compound: true,
    muscles: ['quads', 'glutes', 'calves', 'shoulders'], equip: 'מזחלת', level: 2,
    cues: ['גוף נמוך בארבעים וחמש מעלות', 'צעדים חזקים וקצרים', 'ידיים נעולות'] }),
  E({ id: 'treadmill_run', name: 'ריצה', group: 'conditioning', pattern: 'cardio', type: 'cardio',
    muscles: ['quads', 'hamstrings', 'calves', 'glutes'], equip: 'הליכון / מסלול', level: 1,
    cues: ['כתפיים רפויות', 'נחיתה מתחת לגוף', 'נשימה קצבית'] }),

  // ───── חימום דינמי ומתיחות (תרגילי זמן) ─────
  E({ id: 'jumping_jacks', name: 'קפיצות פיסוק', group: 'mobility', pattern: 'mobility', type: 'time', warm: true,
    muscles: ['calves', 'shoulders', 'quads'], equip: 'משקל גוף', level: 1, cues: ['נחיתה רכה על כריות כף הרגל', 'ידיים עד מעל הראש', 'קצב נוח ואחיד'] }),
  E({ id: 'arm_circles', name: 'סיבובי ידיים', group: 'mobility', pattern: 'mobility', type: 'time', warm: true,
    muscles: ['shoulders'], equip: 'משקל גוף', level: 1, cues: ['ידיים ישרות בגובה הכתפיים', 'מעגלים גדולים ומבוקרים', 'באמצע — מחליפים כיוון'] }),
  E({ id: 'leg_swings', name: 'נדנוד רגליים', group: 'mobility', pattern: 'mobility', type: 'time', warm: true, unilateral: true,
    muscles: ['hamstrings', 'glutes', 'quads'], equip: 'מתקן לאחיזה', level: 1, cues: ['מחזיקים במתקן לשיווי משקל', 'רגל ישרה קדימה ואחורה', 'הטווח גדל בהדרגה'] }),
  E({ id: 'inchworm', name: 'תולעת (אינצ׳וורם)', group: 'mobility', pattern: 'mobility', type: 'time', warm: true,
    muscles: ['hamstrings', 'shoulders', 'abs'], equip: 'משקל גוף', level: 1, cues: ['ידיים לרצפה ליד הרגליים', 'הולכים עם הידיים עד פלאנק', 'חוזרים ונעמדים לאט'] }),
  E({ id: 'bw_squat', name: 'סקוואט חימום', group: 'mobility', pattern: 'mobility', type: 'time', warm: true,
    muscles: ['quads', 'glutes'], equip: 'משקל גוף', level: 1, cues: ['ירידה איטית ועמוקה', 'עקבים על הרצפה', 'ידיים קדימה לאיזון'] }),
  E({ id: 'high_knees', name: 'ברכיים גבוהות', group: 'mobility', pattern: 'mobility', type: 'time', warm: true,
    muscles: ['quads', 'calves', 'abs'], equip: 'משקל גוף', level: 1, cues: ['ברכיים לגובה האגן', 'ידיים עובדות בקצב', 'נשימה קצבית'] }),
  E({ id: 'quad_stretch', name: 'מתיחת ארבע ראשי', group: 'mobility', pattern: 'mobility', type: 'time', stretch: true, unilateral: true,
    muscles: ['quads'], equip: 'עמידה', level: 1, cues: ['עקב לכיוון הישבן', 'ברכיים צמודות', 'אגן מעט קדימה'] }),
  E({ id: 'hamstring_stretch', name: 'מתיחת ירך אחורית', group: 'mobility', pattern: 'mobility', type: 'time', stretch: true, unilateral: true,
    muscles: ['hamstrings', 'lower_back'], equip: 'מזרן', level: 1, cues: ['רגל ישרה, הבוהן למעלה', 'מתכופפים מהאגן, גב ארוך', 'נושמים ומעמיקים בכל נשיפה'] }),
  E({ id: 'hip_flexor_stretch', name: 'מתיחת מכופפי ירך', group: 'mobility', pattern: 'mobility', type: 'time', stretch: true, unilateral: true,
    muscles: ['glutes', 'quads'], equip: 'מזרן', level: 1, cues: ['ברך אחורית על המזרן', 'מכווצים ישבן ודוחפים אגן קדימה', 'גו זקוף'] }),
  E({ id: 'chest_stretch', name: 'מתיחת חזה', group: 'mobility', pattern: 'mobility', type: 'time', stretch: true, unilateral: true,
    muscles: ['chest', 'shoulders'], equip: 'עמוד / קיר', level: 1, cues: ['אמה צמודה לעמוד בגובה הכתף', 'מסובבים את הגו הצידה בעדינות', 'בלי כאב — רק מתיחה'] }),
  E({ id: 'shoulder_stretch', name: 'מתיחת כתף', group: 'mobility', pattern: 'mobility', type: 'time', stretch: true, unilateral: true,
    muscles: ['shoulders', 'upper_back'], equip: 'עמידה', level: 1, cues: ['יד ישרה לרוחב החזה', 'היד השנייה מקרבת', 'כתפיים למטה, רחוק מהאוזניים'] }),
  E({ id: 'child_pose', name: 'תנוחת ילד', group: 'mobility', pattern: 'mobility', type: 'time', stretch: true,
    muscles: ['lower_back', 'lats', 'shoulders'], equip: 'מזרן', level: 1, cues: ['ישבן לעקבים', 'ידיים מושטות קדימה', 'נשימות איטיות לגב'] }),
  // ───── קליסתניקס (js/data/cali-exercises.js) ─────
  ...CALI_EXERCISES.map(E),
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
  e.tracks = e.cali ? ['cali'] : SHARED.includes(e.id) || e.group === 'mobility' ? ['gym', 'cali'] : ['gym'];
  e.first = CON_FIRST.includes(e.id) ? 'con' : 'ecc';
  e.cueCon = PULL.includes(e.id) ? 'pull' : PRESS.includes(e.id) ? 'press' : 'up';
  e.cueEcc = e.neg ? 'slow_down' : PULL.includes(e.id) || PRESS.includes(e.id) ? 'release' : 'down'; // שלילי: "לאט למטה..."
}

export const EX = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
