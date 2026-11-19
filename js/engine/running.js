// מנוע הריצה: רמת ריצה לפי זמן 3 ק״מ, בניית אימוני אינטרוולים/טמפו/נפח ומבדק 3 ק״מ.

export const RUN_TYPES = {
  intervals: { name: 'אינטרוולים', icon: 'bolt', desc: 'ספרינטים קצרים לשיפור מהירות ו-VO2max' },
  tempo: { name: 'ריצת טמפו', icon: 'target', desc: 'קצב קשה-נשלט — מעלה סף לקטט' },
  easy: { name: 'ריצת נפח קלה', icon: 'leaf', desc: 'בסיס אירובי, קצב שיחה' },
  test: { name: 'מבדק 3 ק״מ', icon: 'flag', desc: 'מבדק זמן — המדד העיקרי לכושר האירובי' },
};

// רמת ריצה 1..5 לפי זמן 3 ק״מ בשניות
export function runLevelFrom3k(sec) {
  if (!sec) return 2;
  if (sec <= 11 * 60 + 30) return 5;
  if (sec <= 12 * 60 + 45) return 4;
  if (sec <= 14 * 60) return 3;
  if (sec <= 16 * 60) return 2;
  return 1;
}

// קצב יעד לק״מ בשניות לפי סוג
export function paces(run3kSec) {
  const p3k = (run3kSec || 15 * 60) / 3; // שניות לק״מ
  return { fast: Math.round(p3k * 0.95), tempo: Math.round(p3k * 1.08), easy: Math.round(p3k * 1.28), test: Math.round(p3k * 0.97) };
}

export function fmtPace(sec) {
  const m = Math.floor(sec / 60), s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

const seg = (kind, sec, label) => ({ kind, sec, label });
export const SEG_LABEL = { warm: 'חימום', fast: 'מהיר', easy: 'קל', walk: 'הליכה', tempo: 'טמפו', steady: 'יציב', cool: 'שחרור', test: 'מבדק' };

// weekIdx: אינדקס שבוע מצטבר (להתקדמות הדרגתית)
export function buildRunSession(profile, type, weekIdx = 0) {
  const lvl = profile.runLevel || runLevelFrom3k(profile.run3k);
  const pace = paces(profile.run3k);
  const prog = weekIdx % 12; // התקדמות בתוך מחזור של 12 שבועות
  const segs = [seg('warm', 300, 'חימום')];
  if (type === 'intervals') {
    const reps = Math.min(12, 4 + lvl + Math.floor(prog / 2));
    const work = lvl >= 4 ? 90 : lvl >= 2 ? 60 : 45;
    const rest = lvl >= 4 ? 60 : 90;
    for (let i = 0; i < reps; i++) { segs.push(seg('fast', work, `ספרינט ${i + 1}/${reps}`)); if (i < reps - 1) segs.push(seg(lvl >= 3 ? 'easy' : 'walk', rest, 'התאוששות')); }
  } else if (type === 'tempo') {
    const mins = Math.min(30, 8 + lvl * 3 + prog);
    segs.push(seg('tempo', mins * 60, `טמפו ${mins} דק׳`));
  } else if (type === 'easy') {
    const mins = Math.min(50, 15 + lvl * 5 + prog * 2);
    segs.push(seg('steady', mins * 60, `ריצה קלה ${mins} דק׳`));
  } else if (type === 'test') {
    segs.push(seg('test', 0, '3 ק״מ — מקסימום'));
  }
  segs.push(seg('cool', 300, 'שחרור'));
  const total = segs.reduce((t, s) => t + s.sec, 0);
  return { type, name: RUN_TYPES[type].name, icon: RUN_TYPES[type].icon, segs, totalSec: total, pace, lvl };
}

// יעד 3 ק״מ הבא: שיפור של ~2-3% לבלוק
export function next3kTarget(sec) {
  if (!sec) return 14 * 60;
  return Math.round(sec * 0.975);
}
