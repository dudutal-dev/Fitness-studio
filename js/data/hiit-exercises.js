// תרגילי מסלול ה-HIIT (ליה): אינטרוולים במשקל גוף, בלי ציוד. כולם לפי זמן.
// cat: legs רגליים · cardio דופק · core ליבה · upper פלג עליון. impact: high = קפיצות. low: החלופה בלי קפיצות.
// המקורות והכללים: docs/HIIT.md
const H = { group: 'conditioning', pattern: 'hiit', type: 'time', hiit: true, level: 1, equip: 'משקל גוף' };

export const HIIT_EXERCISES = [
  { ...H, id: 'h_squat_jump', name: 'סקוואט קפיצה', cat: 'legs', impact: 'high', low: 'air_squat', level: 2, muscles: ['quads', 'glutes', 'calves'],
    cues: ['יורדים לסקוואט וקופצים ישר למעלה', 'נוחתים רך על כריות כף הרגל וישר לסקוואט הבא', 'ברכיים בכיוון הבהונות, חזה מורם'] },
  { ...H, id: 'h_jump_lunge', name: 'מכרעים בקפיצה', cat: 'legs', impact: 'high', low: 'h_reverse_lunge', level: 3, muscles: ['quads', 'glutes', 'hamstrings'],
    cues: ['יורדים למכרע וקופצים תוך החלפת רגליים באוויר', 'נחיתה רכה ושקטה, ברך אחורית כמעט נוגעת', 'גו זקוף, ידיים עוזרות בתנופה'] },
  { ...H, id: 'h_reverse_lunge', name: 'מכרע לאחור', cat: 'legs', impact: 'low', muscles: ['quads', 'glutes', 'hamstrings'],
    cues: ['צעד גדול לאחור ויורדים עד שהברך האחורית כמעט נוגעת', 'דוחפים מהעקב הקדמי וחוזרים לעמידה', 'מחליפים רגל בכל חזרה'] },
  { ...H, id: 'h_wall_sit', name: 'ישיבת קיר', cat: 'legs', impact: 'low', equip: 'קיר', hold: true, muscles: ['quads', 'glutes'],
    cues: ['גב צמוד לקיר, ברכיים בתשעים מעלות', 'ירכיים מקבילות לרצפה, עקבים מתחת לברכיים', 'נושמים — לא עוצרים אוויר'] },
  { ...H, id: 'h_skater', name: 'קפיצות מחליק', cat: 'cardio', impact: 'high', low: 'h_step_jack', level: 2, muscles: ['glutes', 'quads', 'calves'],
    cues: ['קופצים הצידה מרגל לרגל, כמו מחליק על קרח', 'הרגל האחורית חוצה מאחור, היד הנגדית נוגעת קרוב לרצפה', 'נחיתה רכה ויציבה לפני הקפיצה הבאה'] },
  { ...H, id: 'h_butt_kicks', name: 'עקבים לישבן', cat: 'cardio', impact: 'high', low: 'h_march', muscles: ['hamstrings', 'calves'],
    cues: ['ריצה במקום, העקבים עולים עד הישבן', 'גו זקוף, ידיים עובדות בקצב', 'קצב מהיר וקליל על כריות כף הרגל'] },
  { ...H, id: 'h_fast_feet', name: 'ריצה מהירה במקום', cat: 'cardio', impact: 'high', low: 'h_march', level: 2, muscles: ['calves', 'quads'],
    cues: ['צעדים קצרים ומהירים במקום, בעמידה נמוכה', 'ברכיים כפופות מעט, משקל על כריות כף הרגל', 'כמה שיותר נגיעות ברצפה'] },
  { ...H, id: 'h_step_jack', name: 'פיסוק בצעדים', cat: 'cardio', impact: 'low', muscles: ['shoulders', 'calves', 'glutes'],
    cues: ['צעד הצידה עם רגל אחת, והידיים עולות מעל הראש', 'חוזרים למרכז וצעד לצד השני', 'בלי קפיצות — קצב זריז ורציף'] },
  { ...H, id: 'h_march', name: 'צעידה נמרצת במקום', cat: 'cardio', impact: 'low', muscles: ['quads', 'abs', 'calves'],
    cues: ['מרימים ברך לגובה האגן, רגל אחרי רגל', 'היד הנגדית עולה עם הברך', 'גו זקוף, בטן אסופה, קצב מהיר'] },
  { ...H, id: 'h_plank_jack', name: 'פלאנק פיסוק', cat: 'core', impact: 'high', low: 'h_plank_tap', level: 2, muscles: ['abs', 'shoulders', 'glutes'],
    cues: ['פלאנק גבוה, קופצים עם הרגליים לפיסוק וחזרה', 'האגן נשאר בגובה אחיד — לא קופץ למעלה', 'כתפיים מעל כפות הידיים'] },
  { ...H, id: 'h_plank_tap', name: 'פלאנק עם נגיעה בכתף', cat: 'core', impact: 'low', muscles: ['abs', 'shoulders', 'obliques'],
    cues: ['פלאנק גבוה, רגליים בפיסוק קל', 'יד אחת נוגעת בכתף הנגדית, ומחליפים', 'האגן לא מתנדנד מצד לצד'] },
  { ...H, id: 'h_bicycle', name: 'אופניים בשכיבה', cat: 'core', impact: 'low', muscles: ['abs', 'obliques'],
    cues: ['שוכבים על הגב, ידיים מאחורי הראש, רגליים באוויר', 'מרפק לברך הנגדית, והרגל השנייה מתיישרת', 'לאט ובשליטה — הסיבוב מהגו, לא מהצוואר'] },
  { ...H, id: 'h_russian_twist', name: 'סיבובי גו בישיבה', cat: 'core', impact: 'low', muscles: ['obliques', 'abs'],
    cues: ['יושבים, גו נשען מעט לאחור, ברכיים כפופות', 'מסובבים את הגו מצד לצד, ידיים נוגעות ברצפה', 'גב ארוך, חזה פתוח'] },
];
// תרגילים קיימים שליה משתמשת בהם גם (יש להם הדגמה שלה): [מזהה, קטגוריה, עומס, חלופה בלי קפיצות]
export const HIIT_SHARED = [
  ['burpee', 'cardio', 'high', 'inchworm'], ['mountain_climber', 'core', 'high', 'h_plank_tap'], ['jumping_jacks', 'cardio', 'high', 'h_step_jack'], ['high_knees', 'cardio', 'high', 'h_march'],
  ['air_squat', 'legs', 'low'], ['bw_lunge', 'legs', 'low'], ['glute_bridge', 'legs', 'low'], ['pushup', 'upper', 'low'], ['knee_pushup', 'upper', 'low'], ['plank', 'core', 'low'], ['inchworm', 'upper', 'low'],
];
// חימום ומתיחות של אימוני ה-HIIT (גם להם יש הדגמה של ליה)
export const HIIT_WARM = ['h_march', 'arm_circles', 'bw_squat', 'leg_swings'];
export const HIIT_COOL = ['quad_stretch', 'hamstring_stretch', 'hip_flexor_stretch', 'chest_stretch', 'child_pose'];
export const HIIT_TIPS = {
  h_squat_jump: 'נחיתה רכה. ברכיים בכיוון הבהונות.', h_jump_lunge: 'נחיתה שקטה. גו זקוף.', h_reverse_lunge: 'דוחפים מהעקב הקדמי.', h_wall_sit: 'ירכיים מקבילות לרצפה. נושמים.',
  h_skater: 'נוחתים יציב, ורק אז קופצים שוב.', h_butt_kicks: 'גו זקוף, קצב קליל.', h_fast_feet: 'צעדים קצרים, כמה שיותר מהר.', h_step_jack: 'ידיים עד מעל הראש.',
  h_march: 'ברך לגובה האגן. בטן אסופה.', h_plank_jack: 'האגן נשאר בגובה אחיד.', h_plank_tap: 'האגן לא מתנדנד.', h_bicycle: 'לאט. הסיבוב מהגו.',
  h_russian_twist: 'גב ארוך, חזה פתוח.',
};
