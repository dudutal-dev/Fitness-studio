// מסלול קליסתניקס — סולמות התקדמות ומיומנויות.
// העיקרון: במקום להוסיף משקל, עולים לווריאציה קשה יותר של אותה תנועה. כל סולם = תנועה אחת, מהקל לקשה.
// שלב: [תרגיל, יעד מינימום, יעד מקסימום] — חזרות, או שניות בתרגיל סטטי. עולים שלב כשכל הסטים מגיעים ליעד המקסימום
// בטכניקה נקייה (מוסכמת ה-Recommended Routine של r/bodyweightfitness: 3 סטים של 5–8, עולים ב-3×8).
// מקורות ומה מהם מבוסס מחקר ומה מוסכמת מאמנים: docs/CALISTHENICS.md

export const EQUIP = {
  bar: { name: 'מתח', desc: 'מוט מתח בבית, בפארק או בבסיס' },
  pbars: { name: 'מקבילים', desc: 'מקבילים או מתקן דיפים' },
  rings: { name: 'טבעות', desc: 'טבעות התעמלות על רצועות' },
  pole: { name: 'עמוד / סולם שוודי', desc: 'עמוד אנכי יציב — לדגל אנושי' },
};

const R = (id, lo = 5, hi = 8) => ({ id, lo, hi });

// kind: strength = סולם כוח שנכנס לכל אימון · skill = מיומנות שהמתאמן בוחר לעבוד עליה
// needs: ציוד שבלעדיו אין סולם (מספיק אחד) · gateDays: מינימום ימים בשלב לפני עלייה (גידים מסתגלים לאט מהשריר)
// req: דרישות קדם — { סולם: תרגיל מינימלי }
export const LADDERS = {
  push: { name: 'דחיפה', goal: 'שכיבות סמיכה ביד אחת', kind: 'strength', icon: 'bolt',
    rungs: [R('wall_pushup', 8, 12), R('incline_pushup', 8, 12), R('knee_pushup', 8, 12), R('pushup'), R('diamond_pushup'), R('pseudo_planche_pushup'), R('archer_pushup'), R('one_arm_pushup', 3, 6)] },
  vpush: { name: 'דחיפה מעל הראש', goal: 'שכיבות סמיכה בעמידת ידיים', kind: 'strength', icon: 'rocket', req: { push: 'pushup' },
    rungs: [R('pike_pushup'), R('elevated_pike_pushup'), R('wall_hspu_negative', 3, 5), R('wall_hspu', 3, 8)] },
  dip: { name: 'מקבילים', goal: 'מקבילים בטבעות', kind: 'strength', icon: 'dumbbell', needs: ['pbars', 'rings'],
    rungs: [R('support_hold', 15, 30), R('dip_negative', 3, 5), R('dips'), R('ring_dips')] },
  pull: { name: 'משיכה', goal: 'מתח קשת', kind: 'strength', icon: 'bolt', needs: ['bar', 'rings'],
    rungs: [R('dead_hang', 20, 45), R('scap_pull', 8, 12), R('pullup_negative', 3, 5), R('pullup'), R('lsit_pullup'), R('archer_pullup', 3, 6)] },
  row: { name: 'חתירה', goal: 'חתירת קשת', kind: 'strength', icon: 'swap',
    rungs: [R('door_row', 8, 12), R('table_row', 8, 12), R('inverted_row'), R('elevated_row'), R('archer_row')] },
  squat: { name: 'סקוואט', goal: 'סקוואט פיסטול', kind: 'strength', icon: 'bolt',
    rungs: [R('assisted_squat', 8, 12), R('air_squat', 10, 20), R('bw_lunge', 8, 12), R('bw_bulgarian', 6, 10), R('shrimp_squat'), R('box_pistol'), R('pistol_squat')] },
  hinge: { name: 'ירך אחורית', goal: 'כפיפת נורדיק', kind: 'strength', icon: 'bolt',
    rungs: [R('glute_bridge', 10, 15), R('single_leg_bridge', 8, 12), R('single_leg_rdl', 6, 10), R('nordic_negative', 3, 5), R('nordic_curl', 3, 8)] },
  core: { name: 'ליבה', goal: 'דגל הדרקון', kind: 'strength', icon: 'shield',
    rungs: [R('dead_bug', 8, 12), R('plank', 30, 60), R('hollow_hold', 15, 40), R('lying_leg_raise', 8, 12), R('dragon_flag_negative', 3, 5), R('dragon_flag', 3, 8)] },
  hang: { name: 'ליבה בתלייה', goal: 'רגליים למוט', kind: 'strength', icon: 'shield', needs: ['bar', 'rings'],
    rungs: [R('hanging_knee_raise', 8, 12), R('hanging_leg_raise'), R('toes_to_bar')] },

  lsit: { name: 'ישיבת אל (L-sit)', goal: 'ישיבת אל מלאה', kind: 'skill', icon: 'target', gateDays: 7, type: 'push',
    about: 'מיומנות הבסיס: כוח ליבה, כתפיים וגמישות ירך אחורית. מתאימה לכל רמה ולא דורשת ציוד.',
    rungs: [R('lsit_foot', 10, 30), R('lsit_tuck', 10, 20), R('lsit_one_leg', 10, 20), R('lsit', 10, 20)] },
  handstand: { name: 'עמידת ידיים', goal: 'עמידת ידיים חופשית', kind: 'skill', icon: 'rocket', gateDays: 7, type: 'push', req: { push: 'pushup' },
    about: 'שיווי משקל וכוח כתפיים. דורשת בעיקר תרגול קצר ותכוף — כמה דקות בתחילת כל אימון.',
    rungs: [R('wall_walk', 3, 5), R('wall_handstand', 20, 45), R('handstand_kickup', 5, 8), R('handstand', 10, 30)] },
  muscleup: { name: 'עליית כוח (Muscle-up)', goal: 'עליית כוח נקייה', kind: 'skill', icon: 'bolt', gateDays: 7, type: 'pull', needs: ['bar'], req: { pull: 'pullup', push: 'diamond_pushup' },
    about: 'משיכה ודחיפה בתנועה אחת מעל המוט. דורשת מתח חזק ומהיר ושליטה במקבילים.',
    rungs: [R('chest_to_bar', 3, 6), R('bar_dip'), R('muscleup_negative', 2, 4), R('muscle_up', 1, 5)] },
  backlever: { name: 'באק לבר', goal: 'באק לבר מלא', kind: 'skill', icon: 'swap', gateDays: 21, type: 'pull', needs: ['bar', 'rings'], req: { pull: 'pullup' },
    about: 'החזקה אופקית עם הפנים למטה. הלבר הראשון שלומדים — מעמיס על הכתפיים והמרפקים, ולכן עולים לאט.',
    rungs: [R('skin_the_cat', 3, 5), R('back_lever_tuck', 8, 15), R('back_lever_adv_tuck', 6, 12), R('back_lever_straddle', 5, 10), R('back_lever', 5, 10)] },
  frontlever: { name: 'פרונט לבר', goal: 'פרונט לבר מלא', kind: 'skill', icon: 'swap', gateDays: 21, type: 'pull', needs: ['bar', 'rings'], req: { pull: 'pullup', core: 'hollow_hold' },
    about: 'החזקה אופקית עם הפנים למעלה. דורשת גב רחב וליבה חזקים מאוד.',
    rungs: [R('front_lever_tuck', 8, 15), R('front_lever_adv_tuck', 6, 12), R('front_lever_straddle', 5, 10), R('front_lever', 5, 10)] },
  planche: { name: 'פלאנש', goal: 'פלאנש מלא', kind: 'skill', icon: 'crown', gateDays: 21, type: 'push', req: { push: 'diamond_pushup' },
    about: 'הגוף מרחף אופקית על ידיים ישרות. המיומנות הקשה ביותר כאן — התקדמות של חודשים ושנים, בלי קיצורי דרך.',
    rungs: [R('planche_lean', 15, 30), R('frog_stand', 15, 30), R('planche_tuck', 6, 12), R('planche_adv_tuck', 5, 10), R('planche_straddle', 4, 8), R('planche', 3, 8)] },
  flag: { name: 'דגל אנושי', goal: 'דגל אנושי מלא', kind: 'skill', icon: 'flag', gateDays: 21, type: 'pull', needs: ['pole'], req: { pull: 'pullup', push: 'pushup' },
    about: 'החזקה אופקית לצד עמוד. בכל סט מחליפים את היד התחתונה.',
    rungs: [R('flag_tuck', 5, 10), R('flag_straddle', 4, 8), R('human_flag', 3, 8)] },
};

export const STRENGTH_LADDERS = Object.keys(LADDERS).filter((k) => LADDERS[k].kind === 'strength');
export const SKILL_LADDERS = Object.keys(LADDERS).filter((k) => LADDERS[k].kind === 'skill');
// באיזה סולם נמצא כל תרגיל (תרגיל שייך לסולם אחד לכל היותר)
export const LADDER_OF = Object.fromEntries(Object.entries(LADDERS).flatMap(([lid, l]) => l.rungs.map((r) => [r.id, lid])));
export const MAX_ACTIVE_SKILLS = 4;
