// מנוע הריצה: רמת ריצה לפי זמן 3 ק״מ, בניית אימוני אינטרוולים/טמפו/נפח ומבדק 3 ק״מ.

export const RUN_TYPES = {
  intervals: { name: 'Intervals', icon: 'bolt', desc: 'Short sprints to improve speed and VO2max' },
  tempo: { name: 'Tempo run', icon: 'target', desc: 'Comfortably hard pace — raises lactate threshold' },
  easy: { name: 'Easy volume run', icon: 'leaf', desc: 'Aerobic base, conversational pace' },
  test: { name: '3 km test', icon: 'flag', desc: 'Time trial — the main measure of aerobic fitness' },
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
export const SEG_LABEL = { free: 'Free', warm: 'Warm-up', fast: 'Fast', easy: 'Easy', walk: 'Walk', tempo: 'Tempo', steady: 'Steady', cool: 'Cool-down', test: 'Test', stroll: 'Easy', brisk: 'Fast', power: 'Power' };

// weekIdx: אינדקס שבוע מצטבר (להתקדמות הדרגתית)
export function buildRunSession(profile, type, weekIdx = 0) {
  const lvl = profile.runLevel || runLevelFrom3k(profile.run3k);
  const pace = paces(profile.run3k);
  const prog = weekIdx % 12; // התקדמות בתוך מחזור של 12 שבועות
  const segs = [seg('warm', 300, 'Warm-up')];
  if (type === 'intervals') {
    const reps = Math.min(12, 4 + lvl + Math.floor(prog / 2));
    const work = lvl >= 4 ? 90 : lvl >= 2 ? 60 : 45;
    const rest = lvl >= 4 ? 60 : 90;
    for (let i = 0; i < reps; i++) { segs.push(seg('fast', work, `Sprint ${i + 1}/${reps}`)); if (i < reps - 1) segs.push(seg(lvl >= 3 ? 'easy' : 'walk', rest, 'Recovery')); }
  } else if (type === 'tempo') {
    const mins = Math.min(30, 8 + lvl * 3 + prog);
    segs.push(seg('tempo', mins * 60, `Tempo ${mins} min`));
  } else if (type === 'easy') {
    const mins = Math.min(50, 15 + lvl * 5 + prog * 2);
    segs.push(seg('steady', mins * 60, `Easy run ${mins} min`));
  } else if (type === 'test') {
    segs.push(seg('test', 0, '3 km — all out'));
  }
  segs.push(seg('cool', 300, 'Cool-down'));
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
  long: { name: 'Long run', icon: 'compass', desc: 'The week\'s long run — conversational pace, builds endurance' },
  runwalk: { name: 'Run-walk', icon: 'run', desc: 'Alternating easy running and walking — that\'s how you build up to continuous running' },
  walk: { name: 'Brisk walk', icon: 'leaf', desc: 'Brisk walking — active recovery and aerobic base' },
});
export const RUN_BASES = [[0, 'Not running yet'], [5, 'About 5 minutes'], [15, '15 minutes'], [30, 'Half an hour'], [60, 'An hour or more']];
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
  const segs = [seg('warm', 300, 'Warm-up with a brisk walk')];
  for (let i = 0; i < reps; i++) { segs.push(seg('easy', run, reps > 1 ? `Easy run ${i + 1}/${reps}` : `Continuous run ${Math.round(run / 60)} min`)); if (walk && i < reps - 1) segs.push(seg('walk', walk, 'Walk')); }
  segs.push(seg('cool', 300, 'Cool-down walk'));
  return { ...custom(profile, 'runwalk', segs, reps > 1 ? `Run-walk · stage ${stage + 1}` : `Continuous run · ${Math.round(run / 60)} min`), stage };
}
export const buildSteadyRun = (profile, type, mins) => custom(profile, type, [seg('warm', 300, 'Warm-up'), seg('steady', mins * 60, `${type === 'long' ? 'Long run' : 'Easy run'} ${mins} min`), seg('cool', 300, 'Cool-down')]);
export const buildWalk = (profile, mins = 30) => custom(profile, 'walk', [seg('walk', mins * 60, `Brisk walk ${mins} min`)]);

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
    const focus = rw.segs.filter((x) => x.kind === 'easy').length > 1 ? `${rw.segs.filter((x) => x.kind === 'easy').length} run intervals, walking in between` : 'No breaks — at a pace you can talk at';
    return Array.from({ length: days }, (_, i) => (i < 3 ? R(structuredClone(rw), focus) : R(buildWalk(profile, 30), 'Active recovery')));
  }
  const p = { ...profile, runBase: Math.max(30, profile.runBase ?? 30) };
  const wk = s0 != null ? w - (RW_STAGES.length - s0) : w;   // מי שסיים ריצה־הליכה מתחיל את התוכנית הרגילה מההתחלה
  let long = longMinutes(p, Math.max(0, wk));
  if (deload) long = Math.round((long * 0.75) / 5) * 5;
  const easyMin = Math.min(50, Math.max(20, Math.round((long * 0.6) / 5) * 5));
  const easy = () => R(buildSteadyRun(p, 'easy', easyMin), 'Conversational pace — aerobic base');
  const quality = (type) => (deload ? easy() : R(buildRunSession(p, type, Math.max(0, wk)), RUN_TYPES[type].desc));
  const q1 = Math.floor(wk / 1) % 2 ? 'tempo' : 'intervals';
  const LONG = R(buildSteadyRun(p, 'long', long), deload ? 'Recovery week — shorter' : 'The week\'s long run, at a conversational pace');
  const plans = { 1: [LONG], 2: [quality(q1), LONG], 3: [easy(), quality(q1), LONG], 4: [easy(), quality(q1), easy(), LONG],
    5: [easy(), quality('intervals'), easy(), quality('tempo'), LONG], 6: [easy(), quality('intervals'), easy(), quality('tempo'), easy(), LONG] };
  const out = plans[days];
  // שבוע ההתאוששות נפתח במבדק 3 ק״מ — כך רואים את ההתקדמות ומעדכנים את קצבי היעד
  if (deload && days >= 3) out[0] = R(buildRunSession(p, 'test', wk), 'Time trial — your paces are updated from it');
  return out;
}
export function buildRunWeek(profile, { blockIndex = 0, weekInBlock = 0 } = {}) {
  const days = Math.min(6, Math.max(3, profile.days || 3));
  const sessions = buildRunSessions(profile, days, { blockIndex, weekInBlock }).map((x, i) => ({ day: i + 1, ...x }));
  return { blockIndex, weekInBlock, phase: RUN_PHASE, week: RUN_WEEKS[weekInBlock % 4], sessions };
}
export const RUN_PHASE = { id: 'run', name: 'Building endurance', desc: 'Most runs at a conversational pace, one quality run a week, and a long run that grows gradually. Three build weeks and a recovery week.' };
export const RUN_WEEKS = [
  { name: 'Base week', rpe: 6, volume: 1, load: 1 }, { name: 'Build week', rpe: 7, volume: 1, load: 1 },
  { name: 'Peak week', rpe: 7.5, volume: 1, load: 1 }, { name: 'Recovery & test week', rpe: 6, volume: 0.75, load: 1 },
];
