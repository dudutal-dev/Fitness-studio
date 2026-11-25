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
  const t = Math.round(sec), m = Math.floor(t / 60), s = t % 60;   // מעגלים לפני החלוקה — אחרת 539.6 שניות הודפסו "8:60"
  return `${m}:${String(s).padStart(2, '0')}`;
}

const seg = (kind, sec, label) => ({ kind, sec, label });
export const SEG_LABEL = { free: 'חופשי', warm: 'חימום', fast: 'מהיר', easy: 'קל', walk: 'הליכה', tempo: 'טמפו', steady: 'יציב', cool: 'שחרור', test: 'מבדק', stroll: 'נינוח', brisk: 'מהיר', power: 'נמרץ' };

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

// ───── מסלול ריצה (גיא / שירה) ─────
// profile.track === 'run'. היעד (profile.goal): r5k = 5 ק״מ ראשונים · r10k = 10 ק״מ · r21k = חצי מרתון.
// profile.runBase = כמה דקות ריצה רצופה היום (0 / 5 / 15 / 30 / 60) — לפיו נקבעת נקודת הפתיחה.
// הכללים ומה מהם מבוסס מחקר: docs/RUNNING.md
export const isRun = (profile) => profile?.track === 'run';
Object.assign(RUN_TYPES, {
  long: { name: 'ריצה ארוכה', icon: 'compass', desc: 'הריצה הארוכה של השבוע — קצב שיחה, בונה סבולת' },
  runwalk: { name: 'ריצה־הליכה', icon: 'run', desc: 'קטעי ריצה קלה והליכה לסירוגין — כך בונים ריצה רצופה' },
  walk: { name: 'הליכה מהירה', icon: 'leaf', desc: 'הליכה נמרצת — התאוששות פעילה ובסיס אירובי' },
});
export const RUN_BASES = [[0, 'עוד לא רץ'], [5, 'כ-5 דקות'], [15, 'רבע שעה'], [30, 'חצי שעה'], [60, 'שעה ומעלה']];
// שלבי ריצה־הליכה: [שניות ריצה, שניות הליכה, חזרות]. שלב אחד בשבוע, עד חצי שעה רצופה.
export const RW_STAGES = [[60, 90, 8], [90, 120, 6], [180, 180, 4], [300, 150, 3], [480, 180, 2], [600, 180, 2], [1500, 0, 1], [1680, 0, 1], [1800, 0, 1]];
const RW_START = { 0: 0, 5: 2, 15: 5 };   // שלב הפתיחה לפי הבסיס
const LONG_CAP = { r5k: 45, r10k: 75, r21k: 130, cut: 60 };
const LONG_START = { 30: 30, 60: 50 };
const rwStart = (profile) => RW_START[profile.runBase ?? 15] ?? null;   // null = כבר רץ חצי שעה רצופה
// שבועות עד סוף שלבי הריצה־הליכה (0 = לא רלוונטי)
export const rwWeeksLeft = (profile, weekIdx = 0) => { const s = rwStart(profile); return s == null ? 0 : Math.max(0, RW_STAGES.length - s - weekIdx); };

const custom = (profile, type, segs, name) => ({ type, name: name || RUN_TYPES[type].name, icon: RUN_TYPES[type].icon, segs, totalSec: segs.reduce((t, s) => t + s.sec, 0), pace: paces(profile.run3k), lvl: profile.runLevel || runLevelFrom3k(profile.run3k) });
export function buildRunWalk(profile, stage) {
  const [run, walk, reps] = RW_STAGES[Math.min(RW_STAGES.length - 1, Math.max(0, stage))];
  const segs = [seg('warm', 300, 'חימום בהליכה מהירה')];
  for (let i = 0; i < reps; i++) { segs.push(seg('easy', run, reps > 1 ? `ריצה קלה ${i + 1}/${reps}` : `ריצה רצופה ${Math.round(run / 60)} דק׳`)); if (walk && i < reps - 1) segs.push(seg('walk', walk, 'הליכה')); }
  segs.push(seg('cool', 300, 'שחרור בהליכה'));
  return { ...custom(profile, 'runwalk', segs, reps > 1 ? `ריצה־הליכה · שלב ${stage + 1}` : `ריצה רצופה · ${Math.round(run / 60)} דק׳`), stage };
}
export const buildSteadyRun = (profile, type, mins) => custom(profile, type, [seg('warm', 300, 'חימום'), seg('steady', mins * 60, `${type === 'long' ? 'ריצה ארוכה' : 'ריצה קלה'} ${mins} דק׳`), seg('cool', 300, 'שחרור')]);
export const buildWalk = (profile, mins = 30) => custom(profile, 'walk', [seg('walk', mins * 60, `הליכה מהירה ${mins} דק׳`)]);

// הריצה הארוכה: עולה ב-4 דקות בכל שבוע בנייה (לא בשבוע ההתאוששות), עד התקרה של היעד
export function longMinutes(profile, weekIdx) {
  const start = (LONG_START[profile.runBase] ?? 30) + (profile.goal === 'r21k' ? 10 : 0);
  const built = weekIdx - Math.floor(weekIdx / 4);
  return Math.min(LONG_CAP[profile.goal] || 45, start + built * 4);
}

const R = (run, focus) => ({ name: run.name, focus, track: 'run', runOnly: true, items: [], warmup: [], cooldown: [], run });
// n אימוני ריצה לשבוע (בלי מספרי ימים)
export function buildRunSessions(profile, n, { blockIndex = 0, weekInBlock = 0 } = {}) {
  const w = blockIndex * 4 + weekInBlock, deload = weekInBlock % 4 === 3;
  const days = Math.min(6, Math.max(1, n));
  const s0 = rwStart(profile);
  // מתחילים: שלוש ריצות־הליכה באותו שלב, והשאר הליכות. אחרי השלב האחרון — ממשיכים לתוכנית הרגילה.
  if (s0 != null && s0 + w < RW_STAGES.length) {
    const stage = s0 + w, rw = buildRunWalk(profile, stage);
    const focus = rw.segs.filter((x) => x.kind === 'easy').length > 1 ? `${rw.segs.filter((x) => x.kind === 'easy').length} קטעי ריצה, הליכה ביניהם` : 'בלי הפסקות — בקצב שאפשר לדבר בו';
    return Array.from({ length: days }, (_, i) => (i < 3 ? R(structuredClone(rw), focus) : R(buildWalk(profile, 30), 'התאוששות פעילה')));
  }
  const p = { ...profile, runBase: Math.max(30, profile.runBase ?? 30) };
  const wk = s0 != null ? w - (RW_STAGES.length - s0) : w;   // מי שסיים ריצה־הליכה מתחיל את התוכנית הרגילה מההתחלה
  let long = longMinutes(p, Math.max(0, wk));
  if (deload) long = Math.round((long * 0.75) / 5) * 5;
  const easyMin = Math.min(50, Math.max(20, Math.round((long * 0.6) / 5) * 5));
  const easy = () => R(buildSteadyRun(p, 'easy', easyMin), 'קצב שיחה — בסיס אירובי');
  const quality = (type) => (deload ? easy() : R(buildRunSession(p, type, Math.max(0, wk)), RUN_TYPES[type].desc));
  const q1 = Math.floor(wk / 1) % 2 ? 'tempo' : 'intervals';
  const LONG = R(buildSteadyRun(p, 'long', long), deload ? 'שבוע התאוששות — קצרה יותר' : 'הריצה הארוכה של השבוע, בקצב שיחה');
  const plans = { 1: [LONG], 2: [quality(q1), LONG], 3: [easy(), quality(q1), LONG], 4: [easy(), quality(q1), easy(), LONG],
    5: [easy(), quality('intervals'), easy(), quality('tempo'), LONG], 6: [easy(), quality('intervals'), easy(), quality('tempo'), easy(), LONG] };
  const out = plans[days];
  // שבוע ההתאוששות נפתח במבדק 3 ק״מ — כך רואים את ההתקדמות ומעדכנים את קצבי היעד
  if (deload && days >= 3) out[0] = R(buildRunSession(p, 'test', wk), 'מבדק זמן — לפיו מתעדכנים הקצבים');
  return out;
}
export function buildRunWeek(profile, { blockIndex = 0, weekInBlock = 0 } = {}) {
  const days = Math.min(6, Math.max(3, profile.days || 3));
  const sessions = buildRunSessions(profile, days, { blockIndex, weekInBlock }).map((x, i) => ({ day: i + 1, ...x }));
  return { blockIndex, weekInBlock, phase: RUN_PHASE, week: RUN_WEEKS[weekInBlock % 4], sessions };
}
export const RUN_PHASE = { id: 'run', name: 'בניית סבולת', desc: 'רוב הריצות בקצב שיחה, אחת איכותית בשבוע, וריצה ארוכה שגדלה בהדרגה. שלושה שבועות בנייה ושבוע התאוששות.' };
export const RUN_WEEKS = [
  { name: 'שבוע בסיס', rpe: 6, volume: 1, load: 1 }, { name: 'שבוע בנייה', rpe: 7, volume: 1, load: 1 },
  { name: 'שבוע שיא', rpe: 7.5, volume: 1, load: 1 }, { name: 'שבוע התאוששות ומבדק', rpe: 6, volume: 0.75, load: 1 },
];
