// תרגילי מסלול הקליסתניקס (משקל גוף). כל תרגיל הוא שלב בסולם התקדמות — ראו js/data/cali.js.
// needs: ציוד שנדרש (מספיק אחד מהרשימה): bar מתח · pbars מקבילים · rings טבעות · pole עמוד אנכי. בלי needs = בלי ציוד.
// hold: תרגיל סטטי (החזקה בשניות). neg: שלילי — רק שלב הירידה, לאט.
// freeDemo: סרטון ההדגמה מתנגן בלולאה חופשית ולא מסונכרן לספירה (מתחיל מהתנוחה שהכי קל לזהות, לא מתחילת החזרה).
const B = { type: 'bw', cali: true, compound: true, level: 2, tempo: [2, 0, 1] };
const H = { type: 'time', cali: true, hold: true, compound: true, level: 2 };
const NONE = 'משקל גוף', BAR = 'מתח', PB = 'מקבילים', RINGS = 'טבעות', WALL = 'קיר', TABLE = 'שולחן יציב / מוט נמוך', CHAIR = 'כיסא / ספסל', POLE = 'עמוד אנכי / סולם שוודי';
const bar = ['bar', 'rings'];

export const CALI_EXERCISES = [
  // ───── דחיפה אופקית ─────
  { ...B, id: 'wall_pushup', name: 'שכיבות סמיכה על קיר', group: 'chest', pattern: 'push_h', level: 1, equip: WALL, muscles: ['chest', 'triceps', 'shoulders'],
    cues: ['כפות ידיים על הקיר בגובה החזה, גוף ישר ונטוי קדימה', 'מורידים את החזה אל הקיר, מרפקים קרובים לגוף', 'דוחפים חזרה עד יישור מלא של הידיים'] },
  { ...B, id: 'incline_pushup', name: 'שכיבות סמיכה בשיפוע', group: 'chest', pattern: 'push_h', level: 1, equip: 'שולחן / ספסל', muscles: ['chest', 'triceps', 'shoulders'],
    cues: ['ידיים על משטח מוגבה, גוף בקו ישר מהראש עד העקבים', 'מורידים חזה עד המשטח, בטן וישבן מכווצים', 'ככל שהמשטח נמוך יותר — קשה יותר'] },
  { ...B, id: 'knee_pushup', name: 'שכיבות סמיכה על הברכיים', group: 'chest', pattern: 'push_h', level: 1, equip: NONE, muscles: ['chest', 'triceps', 'shoulders'],
    cues: ['ברכיים על הרצפה, קו ישר מהברכיים עד הראש', 'חזה כמעט נוגע ברצפה, מרפקים בארבעים וחמש מעלות', 'לא שוברים באגן — הגוף זז כיחידה אחת'] },
  { ...B, id: 'diamond_pushup', name: 'שכיבות סמיכה יהלום', group: 'chest', pattern: 'push_h', level: 3, equip: NONE, muscles: ['triceps', 'chest', 'shoulders'],
    cues: ['כפות ידיים צמודות מתחת לחזה, אגודלים ואצבעות יוצרים יהלום', 'מרפקים צמודים לגוף לאורך כל הירידה', 'חזה נוגע בגב כפות הידיים, ודוחפים למעלה'] },
  { ...B, id: 'archer_pushup', name: 'שכיבות סמיכה קשת', group: 'chest', pattern: 'push_h', level: 4, equip: NONE, unilateral: true, muscles: ['chest', 'triceps', 'shoulders'],
    cues: ['ידיים רחבות מאוד, יורדים לצד אחד כשהיד השנייה נשארת ישרה', 'רוב המשקל על היד המתכופפת', 'אגן יציב — לא מסתובבים'] },
  { ...B, id: 'pseudo_planche_pushup', name: 'שכיבות סמיכה פסאודו פלאנש', group: 'chest', pattern: 'push_h', level: 4, equip: NONE, muscles: ['shoulders', 'chest', 'triceps'],
    cues: ['כפות ידיים ליד המותניים, אצבעות החוצה, כתפיים נשענות קדימה מעבר לידיים', 'שומרים על ההישענות קדימה גם בירידה וגם בעלייה', 'שכמות פרושות, גב מעט מעוגל'] },
  { ...B, id: 'one_arm_pushup', name: 'שכיבות סמיכה ביד אחת', group: 'chest', pattern: 'push_h', level: 5, equip: NONE, unilateral: true, tempo: [3, 0, 1], muscles: ['chest', 'triceps', 'shoulders', 'obliques'],
    cues: ['רגליים בפיסוק רחב, יד אחת מתחת לכתף והשנייה על הגב', 'יורדים לאט, המרפק קרוב לגוף', 'כתפיים ואגן מקבילים לרצפה — בלי סיבוב'] },

  // ───── דחיפה אנכית (מעל הראש) ─────
  { ...B, id: 'pike_pushup', name: 'שכיבות סמיכה פייק', group: 'shoulders', pattern: 'push_v', level: 2, equip: NONE, muscles: ['shoulders', 'triceps', 'traps'],
    cues: ['אגן גבוה באוויר, גוף בצורת וי הפוכה, ידיים ברוחב כתפיים', 'מורידים את הראש קדימה אל בין הידיים — משולש עם כפות הידיים', 'דוחפים חזרה למעלה ולאחור'] },
  { ...B, id: 'elevated_pike_pushup', name: 'פייק עם רגליים מוגבהות', group: 'shoulders', pattern: 'push_v', level: 3, equip: CHAIR, muscles: ['shoulders', 'triceps', 'traps'],
    cues: ['כפות רגליים על כיסא, אגן מעל הכתפיים', 'הראש יורד קדימה לרצפה, מרפקים לא נפתחים לצדדים', 'דוחפים עד נעילה מלאה של הידיים'] },
  { ...B, id: 'wall_hspu_negative', name: 'עמידת ידיים — ירידה שלילית', group: 'shoulders', pattern: 'push_v', level: 4, equip: WALL, neg: true, tempo: [5, 0, 3], muscles: ['shoulders', 'triceps', 'traps'],
    cues: ['עמידת ידיים עם הגב לקיר, ידיים מעט רחבות מהכתפיים', 'יורדים לאט, חמש שניות, עד שהראש נוגע בעדינות במזרן', 'יורדים מהקיר ועולים מחדש לכל חזרה'] },
  { ...B, id: 'wall_hspu', name: 'שכיבות סמיכה בעמידת ידיים', group: 'shoulders', pattern: 'push_v', level: 5, equip: WALL, muscles: ['shoulders', 'triceps', 'traps'],
    cues: ['עמידת ידיים עם הגב לקיר, בטן וישבן מכווצים', 'יורדים בשליטה עד שהראש נוגע במזרן', 'דוחפים עד נעילה מלאה, עקבים מחליקים על הקיר'] },

  // ───── מקבילים ─────
  { ...H, id: 'support_hold', name: 'החזקת תמיכה', group: 'chest', pattern: 'push_v', level: 1, equip: `${PB} / ${RINGS}`, needs: ['pbars', 'rings'], muscles: ['shoulders', 'triceps', 'chest'],
    cues: ['ידיים ישרות ונעולות, כתפיים דחוקות למטה — רחוק מהאוזניים', 'גוף ישר, רגליים מעט קדימה', 'לא שוקעים בין הכתפיים'] },
  { ...B, id: 'dip_negative', name: 'מקבילים — ירידה שלילית', group: 'chest', pattern: 'push_v', level: 2, equip: PB, needs: ['pbars', 'rings'], neg: true, tempo: [5, 0, 3], muscles: ['chest', 'triceps', 'shoulders'],
    cues: ['מתחילים למעלה בידיים ישרות', 'יורדים לאט, חמש שניות, עד שהכתף מעט מתחת למרפק', 'מניחים רגליים, קופצים חזרה למעלה וחוזרים'] },
  { ...B, id: 'ring_dips', name: 'מקבילים בטבעות', group: 'chest', pattern: 'push_v', level: 4, equip: RINGS, needs: ['rings'], muscles: ['chest', 'triceps', 'shoulders'],
    cues: ['טבעות צמודות לגוף, ידיים נעולות, כפות ידיים מסובבות מעט החוצה למעלה', 'יורדים בשליטה, הטבעות לא בורחות לצדדים', 'עולים עד נעילה מלאה'] },

  // ───── משיכה אנכית ─────
  { ...H, id: 'dead_hang', name: 'תלייה על מתח', group: 'back', pattern: 'pull_v', level: 1, equip: BAR, needs: bar, muscles: ['forearms', 'lats', 'shoulders'],
    cues: ['אחיזה מעט רחבה מהכתפיים, ידיים ישרות', 'כתפיים פעילות — לא נתלים על המפרק', 'בטן אסופה, רגליים יחד'] },
  { ...B, id: 'scap_pull', name: 'משיכות שכמות', group: 'back', pattern: 'pull_v', level: 1, equip: BAR, needs: bar, compound: false, tempo: [1, 1, 1], muscles: ['lats', 'traps', 'upper_back'],
    cues: ['תלויים בידיים ישרות — המרפקים לא מתכופפים בכלל', 'מושכים את השכמות למטה ולאחור, הגוף עולה כמה סנטימטרים', 'עוצרים שנייה למעלה ומשחררים לאט'] },
  { ...B, id: 'pullup_negative', name: 'מתח — ירידה שלילית', group: 'back', pattern: 'pull_v', level: 2, equip: BAR, needs: bar, neg: true, tempo: [5, 0, 3], muscles: ['lats', 'biceps', 'upper_back'],
    cues: ['קופצים או עולים מכיסא עד שהסנטר מעל המוט', 'יורדים לאט, חמש שניות, עד יישור מלא של הידיים', 'מניחים רגליים וחוזרים למעלה'] },
  { ...B, id: 'lsit_pullup', name: 'מתח בישיבת אל', group: 'back', pattern: 'pull_v', level: 4, equip: BAR, needs: bar, muscles: ['lats', 'biceps', 'abs'],
    cues: ['רגליים ישרות קדימה, מקבילות לרצפה, לאורך כל החזרה', 'מושכים עד שהסנטר מעל המוט', 'יורדים בשליטה בלי להוריד את הרגליים'] },
  { ...B, id: 'archer_pullup', freeDemo: true, name: 'מתח קשת', group: 'back', pattern: 'pull_v', level: 5, equip: BAR, needs: bar, unilateral: true, muscles: ['lats', 'biceps', 'upper_back'],
    cues: ['אחיזה רחבה מאוד, מושכים לכיוון יד אחת כשהשנייה מתיישרת לצד', 'הסנטר מגיע אל היד המושכת', 'יורדים לאט וחוזרים למרכז'] },

  // ───── חתירה (משיכה אופקית) ─────
  { ...B, id: 'door_row', name: 'חתירת משקוף', group: 'back', pattern: 'pull_h', level: 1, equip: 'משקוף דלת', muscles: ['upper_back', 'lats', 'biceps'],
    cues: ['אוחזים בשני צדי המשקוף, כפות רגליים קרוב לסף, ונשענים לאחור בידיים ישרות', 'מושכים את החזה אל המשקוף, מרפקים צמודים לגוף', 'חוזרים לאט, גוף ישר כמו קרש'] },
  { ...B, id: 'table_row', name: 'חתירה מתחת לשולחן', group: 'back', pattern: 'pull_h', level: 2, equip: TABLE, muscles: ['upper_back', 'lats', 'biceps'],
    cues: ['שוכבים מתחת לשולחן יציב, אוחזים בקצה, ברכיים כפופות וכפות רגליים על הרצפה', 'מושכים את החזה אל קצה השולחן, שכמות נצמדות', 'יורדים לאט עד יישור מלא'] },
  { ...B, id: 'inverted_row', name: 'חתירה אוסטרלית', group: 'back', pattern: 'pull_h', level: 3, equip: TABLE, muscles: ['upper_back', 'lats', 'biceps'],
    cues: ['גוף ישר לגמרי מהעקבים עד הראש, רק העקבים על הרצפה', 'מושכים עד שהחזה נוגע במוט או בקצה השולחן', 'אגן לא צונח — ישבן ובטן מכווצים'] },
  { ...B, id: 'elevated_row', name: 'חתירה אוסטרלית עם רגליים מוגבהות', group: 'back', pattern: 'pull_h', level: 4, equip: `${TABLE} + כיסא`, muscles: ['upper_back', 'lats', 'biceps'],
    cues: ['עקבים על כיסא, גוף אופקי ומקביל לרצפה', 'מושכים חזה למוט, עוצרים רגע למעלה', 'יורדים בשליטה'] },
  { ...B, id: 'archer_row', name: 'חתירת קשת', group: 'back', pattern: 'pull_h', level: 5, equip: TABLE, unilateral: true, muscles: ['upper_back', 'lats', 'biceps'],
    cues: ['אחיזה רחבה, מושכים לכיוון יד אחת כשהשנייה נשארת ישרה', 'החזה מגיע אל היד המושכת', 'גוף ישר, בלי סיבוב באגן'] },
  { ...B, id: 'prone_pull', name: 'משיכות בשכיבה על הבטן', group: 'back', pattern: 'pull_h', level: 1, equip: NONE, compound: false, tempo: [2, 1, 1], muscles: ['upper_back', 'lats', 'lower_back'],
    cues: ['שוכבים על הבטן, ידיים מושטות קדימה, חזה מעט מורם', 'מושכים מרפקים לאחור ולמטה אל הצלעות, כאילו מושכים מוט', 'מקרבים שכמות, עוצרים שנייה, ומושיטים חזרה'] },

  // ───── סקוואט ─────
  { ...B, id: 'assisted_squat', name: 'סקוואט בעזרת אחיזה', group: 'legs', pattern: 'squat', level: 1, equip: 'משקוף / עמוד לאחיזה', muscles: ['quads', 'glutes', 'hamstrings'],
    cues: ['אוחזים במשקוף או בעמוד מול הגוף, רגליים ברוחב כתפיים', 'יורדים לאט לסקוואט עמוק, הידיים רק עוזרות לאיזון', 'עולים דרך העקבים, כמה שפחות עזרה מהידיים'] },
  { ...B, id: 'bw_bulgarian', name: 'סקוואט בולגרי במשקל גוף', group: 'legs', pattern: 'lunge', level: 3, equip: CHAIR, unilateral: true, muscles: ['quads', 'glutes', 'hamstrings'],
    cues: ['רגל אחורית על כיסא, רגל קדמית רחוק מספיק קדימה', 'יורדים ישר למטה עד שהירך הקדמית מקבילה לרצפה', 'דוחפים דרך העקב הקדמי, גו זקוף'] },
  { ...B, id: 'shrimp_squat', name: 'סקוואט שרימפ', group: 'legs', pattern: 'squat', level: 4, equip: NONE, unilateral: true, tempo: [3, 0, 1], muscles: ['quads', 'glutes', 'hamstrings'],
    cues: ['עומדים על רגל אחת, הרגל השנייה כפופה מאחור', 'יורדים לאט עד שהברך האחורית נוגעת בעדינות ברצפה', 'ידיים קדימה לאיזון, ועולים בלי דחיפה מהרגל האחורית'] },
  { ...B, id: 'box_pistol', name: 'פיסטול לכיסא', group: 'legs', pattern: 'squat', level: 4, equip: 'כיסא', unilateral: true, tempo: [3, 0, 1], muscles: ['quads', 'glutes', 'hamstrings'],
    cues: ['עומדים על רגל אחת מול כיסא, הרגל השנייה ישרה קדימה', 'יורדים לאט עד ישיבה קלה על הכיסא', 'קמים על אותה רגל, בלי תנופה'] },
  { ...B, id: 'pistol_squat', freeDemo: true, name: 'סקוואט פיסטול', group: 'legs', pattern: 'squat', level: 5, equip: NONE, unilateral: true, tempo: [3, 0, 1], muscles: ['quads', 'glutes', 'hamstrings', 'abs'],
    cues: ['רגל אחת ישרה קדימה באוויר, ידיים קדימה לאיזון', 'יורדים על רגל אחת עד למטה, העקב נשאר על הרצפה', 'עולים בכוח, הרגל הקדמית לא נוגעת ברצפה'] },

  // ───── ירך אחורית וישבן ─────
  { ...B, id: 'single_leg_bridge', name: 'גשר ישבן ברגל אחת', group: 'legs', pattern: 'hinge', level: 2, equip: 'מזרן', unilateral: true, compound: false, tempo: [2, 1, 1], muscles: ['glutes', 'hamstrings', 'lower_back'],
    cues: ['שוכבים על הגב, רגל אחת כפופה על הרצפה והשנייה ישרה באוויר', 'מרימים אגן עד קו ישר מהכתף עד הברך', 'עוצרים שנייה למעלה, אגן לא נוטה לצד'] },
  { ...B, id: 'single_leg_rdl', name: 'דדליפט רומני ברגל אחת', group: 'legs', pattern: 'hinge', level: 3, equip: NONE, unilateral: true, tempo: [3, 0, 1], muscles: ['hamstrings', 'glutes', 'lower_back'],
    cues: ['עומדים על רגל אחת, ברך מעט כפופה', 'מתקפלים קדימה מהאגן כשהרגל השנייה עולה לאחור — גוף ורגל בקו אחד', 'גב ישר, חוזרים לעמידה בכיווץ ישבן'] },
  { ...B, id: 'nordic_negative', name: 'נורדיק — ירידה שלילית', group: 'legs', pattern: 'hinge', level: 4, equip: 'עיגון לקרסוליים (ספה / שותף)', neg: true, tempo: [5, 0, 3], muscles: ['hamstrings', 'glutes', 'calves'],
    cues: ['על הברכיים, קרסוליים מעוגנים, גוף ישר מהברכיים עד הראש', 'נופלים קדימה לאט ככל האפשר, בולמים עם הירך האחורית', 'נוחתים על הידיים, דוחפים חזרה למעלה'] },
  { ...B, id: 'nordic_curl', name: 'כפיפת נורדיק', group: 'legs', pattern: 'hinge', level: 5, equip: 'עיגון לקרסוליים (ספה / שותף)', tempo: [4, 0, 2], muscles: ['hamstrings', 'glutes', 'calves'],
    cues: ['על הברכיים, קרסוליים מעוגנים, אגן נעול קדימה', 'יורדים לאט עד שהחזה כמעט ברצפה', 'מושכים חזרה למעלה עם הירך האחורית, בלי לשבור באגן'] },

  // ───── ליבה ─────
  { ...B, id: 'dead_bug', name: 'דד באג', group: 'core', pattern: 'core', level: 1, equip: 'מזרן', compound: false, tempo: [2, 1, 2], muscles: ['abs', 'obliques'],
    cues: ['שוכבים על הגב, ידיים למעלה וברכיים בתשעים מעלות, גב תחתון צמוד לרצפה', 'מושיטים יד ורגל נגדית לאט עד כמעט הרצפה', 'חוזרים ומחליפים צד — הגב התחתון לא מתנתק'] },
  { ...H, id: 'hollow_hold', name: 'החזקת סירה', group: 'core', pattern: 'core', level: 2, equip: 'מזרן', compound: false, muscles: ['abs', 'obliques'],
    cues: ['שוכבים על הגב, גב תחתון לחוץ לרצפה', 'מרימים כתפיים ורגליים ישרות מעט מהרצפה, ידיים מעל הראש', 'הגוף בצורת בננה — אם הגב מתנתק, מרימים רגליים גבוה יותר'] },
  { ...B, id: 'lying_leg_raise', name: 'הרמות רגליים בשכיבה', group: 'core', pattern: 'core', level: 2, equip: 'מזרן', compound: false, tempo: [3, 0, 1], muscles: ['abs', 'obliques'],
    cues: ['שוכבים על הגב, ידיים לצדי הגוף, רגליים ישרות', 'מרימים רגליים עד תשעים מעלות', 'מורידים לאט עד כמעט הרצפה — הגב התחתון נשאר צמוד'] },
  { ...B, id: 'dragon_flag_negative', name: 'דגל הדרקון — ירידה שלילית', group: 'core', pattern: 'core', level: 4, equip: 'ספסל / אחיזה מאחורי הראש', neg: true, tempo: [5, 0, 3], muscles: ['abs', 'obliques', 'lats'],
    cues: ['שוכבים על הגב ואוחזים חזק מאחורי הראש, עולים לנר על הכתפיים', 'מורידים את הגוף ישר כמו קרש, לאט, חמש שניות', 'רק הכתפיים על המשטח — לא שוברים באגן'] },
  { ...B, id: 'dragon_flag', name: 'דגל הדרקון', group: 'core', pattern: 'core', level: 5, equip: 'ספסל / אחיזה מאחורי הראש', tempo: [4, 0, 2], muscles: ['abs', 'obliques', 'lats'],
    cues: ['אחיזה חזקה מאחורי הראש, גוף ישר מהכתפיים עד כפות הרגליים', 'מורידים את הגוף עד כמעט המשטח בלי לגעת', 'מרימים חזרה כיחידה אחת, בלי קיפול באגן'] },
  { ...B, id: 'hanging_knee_raise', name: 'הרמות ברכיים בתלייה', group: 'core', pattern: 'core', level: 2, equip: BAR, needs: bar, compound: false, tempo: [2, 0, 1], muscles: ['abs', 'obliques', 'forearms'],
    cues: ['תלויים על המתח, כתפיים פעילות', 'מרימים ברכיים אל החזה ומגלגלים מעט את האגן', 'מורידים לאט, בלי להתנדנד'] },
  { ...B, id: 'toes_to_bar', name: 'רגליים למוט', group: 'core', pattern: 'core', level: 4, equip: BAR, needs: bar, tempo: [3, 0, 1], muscles: ['abs', 'obliques', 'lats'],
    cues: ['תלויים על המתח, רגליים ישרות', 'מרימים רגליים עד שכפות הרגליים נוגעות במוט', 'מורידים לאט ובשליטה, בלי תנופה'] },

  // ───── מיומנות: ישיבת L ─────
  { ...H, id: 'lsit_foot', name: 'ישיבת אל עם עקבים על הרצפה', group: 'core', pattern: 'skill', level: 1, equip: NONE, muscles: ['abs', 'triceps', 'shoulders'],
    cues: ['יושבים עם רגליים ישרות, כפות ידיים על הרצפה ליד הירכיים', 'דוחפים את הרצפה ומרימים את הישבן — רק העקבים נשארים למטה', 'כתפיים למטה, ידיים נעולות'] },
  { ...H, id: 'lsit_tuck', name: 'ישיבת אל מקופלת', group: 'core', pattern: 'skill', level: 2, equip: NONE, muscles: ['abs', 'triceps', 'shoulders'],
    cues: ['ידיים ליד הירכיים, דוחפים את הרצפה ומרימים את כל הגוף', 'ברכיים מקופלות אל החזה, כפות הרגליים באוויר', 'כתפיים דחוקות למטה, ידיים ישרות'] },
  { ...H, id: 'lsit_one_leg', name: 'ישיבת אל ברגל אחת', group: 'core', pattern: 'skill', level: 3, equip: NONE, unilateral: true, muscles: ['abs', 'quads', 'triceps'],
    cues: ['ממצב מקופל באוויר, מיישרים רגל אחת קדימה', 'הרגל הישרה מקבילה לרצפה, ברך נעולה', 'באמצע הזמן מחליפים רגל'] },
  { ...H, id: 'lsit', name: 'ישיבת אל מלאה', group: 'core', pattern: 'skill', level: 4, equip: NONE, muscles: ['abs', 'quads', 'triceps'],
    cues: ['ידיים נעולות, כל הגוף באוויר, שתי הרגליים ישרות קדימה', 'רגליים מקבילות לרצפה, אצבעות מושטות', 'כתפיים למטה, חזה פתוח'] },

  // ───── מיומנות: עמידת ידיים ─────
  { ...B, id: 'wall_walk', name: 'הליכת קיר', group: 'shoulders', pattern: 'skill', level: 2, equip: WALL, tempo: [3, 1, 3], muscles: ['shoulders', 'triceps', 'abs'],
    cues: ['ממצב שכיבת סמיכה עם כפות הרגליים על הקיר, הולכים עם הרגליים למעלה ועם הידיים לאחור', 'עוצרים כשהחזה קרוב לקיר, בטן אסופה', 'יורדים באותה דרך, לאט ובשליטה'] },
  { ...H, id: 'wall_handstand', name: 'עמידת ידיים מול הקיר', group: 'shoulders', pattern: 'skill', level: 3, equip: WALL, muscles: ['shoulders', 'traps', 'abs'],
    cues: ['חזה אל הקיר, ידיים ברוחב כתפיים, קרוב לקיר', 'דוחפים את הרצפה — כתפיים אל האוזניים, גוף ישר ומתוח', 'בטן וישבן מכווצים, מבט אל בין הידיים'] },
  { ...B, id: 'handstand_kickup', name: 'עליות לעמידת ידיים', group: 'shoulders', pattern: 'skill', level: 4, equip: 'קיר (לגיבוי)', tempo: [1, 2, 1], muscles: ['shoulders', 'traps', 'abs'],
    cues: ['ידיים על הרצפה ברוחב כתפיים, רגל אחת נשלחת למעלה בעדינות', 'מחפשים את נקודת האיזון — אצבעות לוחצות את הרצפה', 'עוצרים רגע למעלה ויורדים בשליטה'] },
  { ...H, id: 'handstand', name: 'עמידת ידיים חופשית', group: 'shoulders', pattern: 'skill', level: 5, equip: NONE, muscles: ['shoulders', 'traps', 'abs'],
    cues: ['עולים לעמידת ידיים בלי קיר, גוף בקו אחד', 'מאזנים עם האצבעות ושורש כף היד', 'כתפיים דחוקות למעלה, בטן וישבן מכווצים'] },

  // ───── מיומנות: עליית כוח ─────
  { ...B, id: 'chest_to_bar', name: 'מתח עד החזה', group: 'back', pattern: 'skill', level: 4, equip: BAR, needs: ['bar'], tempo: [2, 0, 1], muscles: ['lats', 'biceps', 'upper_back'],
    cues: ['מושכים בעוצמה ובמהירות — המוט מגיע עד החזה, לא רק עד הסנטר', 'מרפקים נמשכים לאחור ולמטה', 'יורדים בשליטה עד יישור מלא'] },
  { ...B, id: 'bar_dip', name: 'מקבילים על מוט ישר', group: 'chest', pattern: 'skill', level: 3, equip: BAR, needs: ['bar'], muscles: ['chest', 'triceps', 'shoulders'],
    cues: ['נתמכים מעל המוט בידיים ישרות, המוט בגובה הירכיים', 'יורדים עד שהחזה התחתון נוגע במוט, נשענים קדימה', 'דוחפים חזרה עד נעילה'] },
  { ...B, id: 'muscleup_negative', name: 'עליית כוח — ירידה שלילית', group: 'back', pattern: 'skill', level: 4, equip: BAR, needs: ['bar'], neg: true, tempo: [5, 0, 3], muscles: ['lats', 'chest', 'triceps'],
    cues: ['מתחילים בתמיכה מעל המוט', 'יורדים לאט דרך המעבר — חזה צמוד למוט, מרפקים עוברים מאחור', 'ממשיכים לרדת עד תלייה מלאה'] },
  { ...B, id: 'muscle_up', freeDemo: true, name: 'עליית כוח', group: 'back', pattern: 'skill', level: 5, equip: BAR, needs: ['bar'], tempo: [2, 0, 2], muscles: ['lats', 'chest', 'triceps', 'biceps'],
    cues: ['מושכים בעוצמה, המוט נמשך אל הבטן', 'במעבר מגלגלים חזה ומרפקים אל מעל המוט', 'דוחפים עד נעילה, ויורדים בשליטה'] },

  // ───── מיומנות: באק לבר ─────
  { ...B, id: 'skin_the_cat', name: 'סקין דה קאט', group: 'back', pattern: 'skill', level: 3, equip: `${BAR} / ${RINGS}`, needs: bar, tempo: [3, 1, 3], muscles: ['lats', 'shoulders', 'abs'],
    cues: ['בתלייה, מקפלים ברכיים ומעבירים את הרגליים בין הידיים לאחור', 'ממשיכים לאט עד מתיחה נוחה בכתפיים — לא מעבר לזה', 'חוזרים באותה דרך בשליטה'] },
  { ...H, id: 'back_lever_tuck', name: 'באק לבר מקופל', group: 'back', pattern: 'skill', level: 3, equip: `${BAR} / ${RINGS}`, needs: bar, straight: true, muscles: ['lats', 'shoulders', 'lower_back'],
    cues: ['מעבירים רגליים בין הידיים, גב מקביל לרצפה, פנים למטה', 'ברכיים מקופלות אל החזה, ידיים ישרות', 'כפות ידיים פונות למטה, מרפקים נעולים'] },
  { ...H, id: 'back_lever_adv_tuck', name: 'באק לבר מקופל מתקדם', group: 'back', pattern: 'skill', level: 4, equip: `${BAR} / ${RINGS}`, needs: bar, straight: true, muscles: ['lats', 'shoulders', 'lower_back'],
    cues: ['כמו המקופל, אבל הגב שטוח וישר', 'ירכיים בתשעים מעלות לגו, ברכיים כפופות', 'ידיים ישרות, אגן בגובה הכתפיים'] },
  { ...H, id: 'back_lever_straddle', name: 'באק לבר בפיסוק', group: 'back', pattern: 'skill', level: 5, equip: `${BAR} / ${RINGS}`, needs: bar, straight: true, muscles: ['lats', 'shoulders', 'lower_back', 'glutes'],
    cues: ['גוף אופקי, פנים למטה, רגליים ישרות ופתוחות לצדדים', 'אגן בקו אחד עם הכתפיים', 'ישבן מכווץ, ידיים נעולות'] },
  { ...H, id: 'back_lever', name: 'באק לבר מלא', group: 'back', pattern: 'skill', level: 5, equip: `${BAR} / ${RINGS}`, needs: bar, straight: true, muscles: ['lats', 'shoulders', 'lower_back', 'glutes'],
    cues: ['גוף ישר לגמרי ומקביל לרצפה, פנים למטה, רגליים צמודות', 'ידיים ישרות, כתפיים מעל האגן', 'כל הגוף מתוח — ישבן, בטן ורגליים'] },

  // ───── מיומנות: פרונט לבר ─────
  { ...H, id: 'front_lever_tuck', name: 'פרונט לבר מקופל', group: 'back', pattern: 'skill', level: 4, equip: `${BAR} / ${RINGS}`, needs: bar, straight: true, muscles: ['lats', 'abs', 'upper_back'],
    cues: ['בתלייה בידיים ישרות, מרימים את הגוף עד שהגב מקביל לרצפה, פנים למעלה', 'ברכיים מקופלות אל החזה', 'דוחפים את המוט אל הירכיים, שכמות למטה'] },
  { ...H, id: 'front_lever_adv_tuck', name: 'פרונט לבר מקופל מתקדם', group: 'back', pattern: 'skill', level: 4, equip: `${BAR} / ${RINGS}`, needs: bar, straight: true, muscles: ['lats', 'abs', 'upper_back'],
    cues: ['גב שטוח ומקביל לרצפה', 'ירכיים בתשעים מעלות לגו, ברכיים כפופות', 'ידיים ישרות לגמרי'] },
  { ...H, id: 'front_lever_straddle', name: 'פרונט לבר בפיסוק', group: 'back', pattern: 'skill', level: 5, equip: `${BAR} / ${RINGS}`, needs: bar, straight: true, muscles: ['lats', 'abs', 'upper_back'],
    cues: ['גוף אופקי, פנים למעלה, רגליים ישרות ופתוחות לצדדים', 'אגן בגובה הכתפיים — לא שוקע', 'ידיים נעולות, בטן מכווצת'] },
  { ...H, id: 'front_lever', name: 'פרונט לבר מלא', group: 'back', pattern: 'skill', level: 5, equip: `${BAR} / ${RINGS}`, needs: bar, straight: true, muscles: ['lats', 'abs', 'upper_back'],
    cues: ['גוף ישר לגמרי ומקביל לרצפה, פנים למעלה, רגליים צמודות', 'ידיים ישרות, מושכים את המוט אל הירכיים', 'כל הגוף קרש אחד'] },

  // ───── מיומנות: פלאנש ─────
  { ...H, id: 'planche_lean', name: 'הישענות פלאנש', group: 'shoulders', pattern: 'skill', level: 3, equip: NONE, straight: true, muscles: ['shoulders', 'chest', 'abs'],
    cues: ['ממצב שכיבת סמיכה בידיים ישרות, נשענים קדימה עד שהכתפיים עוברות את כפות הידיים', 'שכמות פרושות, גב עליון מעוגל', 'מרפקים נעולים — לא מתכופפים'] },
  { ...H, id: 'frog_stand', name: 'עמידת צפרדע', group: 'shoulders', pattern: 'skill', level: 3, equip: NONE, muscles: ['shoulders', 'triceps', 'abs'],
    cues: ['בכריעה, ידיים על הרצפה, ברכיים נשענות על המרפקים', 'נשענים קדימה עד שכפות הרגליים מתרוממות', 'מבט קדימה, אצבעות לוחצות את הרצפה'] },
  { ...H, id: 'planche_tuck', name: 'פלאנש מקופל', group: 'shoulders', pattern: 'skill', level: 4, equip: NONE, straight: true, muscles: ['shoulders', 'chest', 'abs'],
    cues: ['ידיים ישרות ונעולות, כל הגוף באוויר', 'ברכיים מקופלות אל החזה, אגן בגובה הכתפיים', 'נשענים קדימה, שכמות פרושות'] },
  { ...H, id: 'planche_adv_tuck', name: 'פלאנש מקופל מתקדם', group: 'shoulders', pattern: 'skill', level: 5, equip: NONE, straight: true, muscles: ['shoulders', 'chest', 'abs'],
    cues: ['כמו המקופל, אבל הגב שטוח ומקביל לרצפה', 'ירכיים בתשעים מעלות לגו', 'ידיים נעולות, הישענות חזקה קדימה'] },
  { ...H, id: 'planche_straddle', name: 'פלאנש בפיסוק', group: 'shoulders', pattern: 'skill', level: 5, equip: NONE, straight: true, muscles: ['shoulders', 'chest', 'abs', 'glutes'],
    cues: ['גוף אופקי מעל הרצפה, רגליים ישרות ופתוחות לצדדים', 'ידיים נעולות, כתפיים הרבה לפני כפות הידיים', 'ישבן ובטן מכווצים'] },
  { ...H, id: 'planche', name: 'פלאנש מלא', group: 'shoulders', pattern: 'skill', level: 5, equip: NONE, straight: true, muscles: ['shoulders', 'chest', 'abs', 'glutes'],
    cues: ['גוף ישר ומקביל לרצפה, רק כפות הידיים נוגעות', 'ידיים ישרות, רגליים צמודות', 'הישענות מלאה קדימה, כל הגוף מתוח'] },

  // ───── מיומנות: דגל אנושי ─────
  { ...H, id: 'flag_tuck', name: 'דגל אנושי מקופל', group: 'core', pattern: 'skill', level: 4, equip: POLE, needs: ['pole'], straight: true, muscles: ['obliques', 'lats', 'shoulders'],
    cues: ['יד תחתונה דוחפת את העמוד, יד עליונה מושכת — שתיהן ישרות', 'מרימים את הגוף לצד, ברכיים מקופלות', 'בכל סט מחליפים את היד התחתונה'] },
  { ...H, id: 'flag_straddle', name: 'דגל אנושי בפיסוק', group: 'core', pattern: 'skill', level: 5, equip: POLE, needs: ['pole'], straight: true, muscles: ['obliques', 'lats', 'shoulders'],
    cues: ['גוף אופקי לצד העמוד, רגליים ישרות ופתוחות', 'יד תחתונה דוחפת חזק, עליונה מושכת', 'לא נותנים לאגן לצנוח'] },
  { ...H, id: 'human_flag', name: 'דגל אנושי מלא', group: 'core', pattern: 'skill', level: 5, equip: POLE, needs: ['pole'], straight: true, muscles: ['obliques', 'lats', 'shoulders'],
    cues: ['גוף ישר ואופקי לצד העמוד, רגליים צמודות', 'שתי הידיים נעולות — דחיפה למטה, משיכה למעלה', 'כל הגוף מתוח כמו דגל'] },

  // ───── חימום ייעודי ─────
  { ...H, id: 'wrist_prep', name: 'הכנת שורשי כף היד', group: 'mobility', pattern: 'mobility', level: 1, equip: 'מזרן', warm: true, hold: false, cali: true, compound: false, muscles: ['forearms'],
    cues: ['על הברכיים, כפות ידיים על הרצפה, אצבעות קדימה', 'מתנדנדים לאט קדימה ואחורה', 'מסובבים אצבעות לאחור וחוזרים'] },
  { ...H, id: 'scap_pushup', name: 'שכיבות שכמות', group: 'mobility', pattern: 'mobility', level: 1, equip: 'מזרן', warm: true, hold: false, cali: true, compound: false, muscles: ['upper_back', 'shoulders'],
    cues: ['שכיבת סמיכה בידיים ישרות — המרפקים לא מתכופפים', 'נותנים לחזה לשקוע בין השכמות, ואז דוחפים את הרצפה ופורשים שכמות', 'תנועה קטנה ואיטית'] },
];
