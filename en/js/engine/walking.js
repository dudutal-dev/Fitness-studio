// מנוע מסלול ההליכה (שירה): הליכות מודרכות בחוץ — הליכה נינוחה, הליכה מהירה, אינטרוולים בהליכה והליכה ארוכה.
// profile.track === 'walk'. profile.walkMin = אורך הליכה רגילה (20 / 30 / 45 / 60 דקות). profile.level 1–3 = מתחילים / הולכים קבוע / הולכים מהר.
// ההליכה רצה במסך הריצה החי (views/run.js): מקטעים לפי זמן, מרחק וקצב מה-GPS, ומוזיקה לפי אופי המקטע.
// מקטעים: warm חימום · stroll הליכה נינוחה · brisk הליכה מהירה · power הליכה נמרצת (הכי מהר בלי לרוץ) · cool שחרור. הכללים: docs/WALKING.md
export const isWalk = (profile) => profile?.track === 'walk';
export const WALK_MINUTES = [20, 30, 45, 60];
export const WALK_LEVELS = ['', 'Beginners', 'Regular walkers', 'Fast walkers'];
export const walkLevel = (profile) => Math.min(3, Math.max(1, profile?.level || 1));
export const WALK_TYPES = {
  wEasy: { name: 'Easy walk', icon: 'leaf', desc: 'A pleasant pace you can chat at — for easy days and recovery' },
  wBrisk: { name: 'Brisk walk', icon: 'bolt', desc: 'A pace that raises your heart rate: you can talk, but not sing' },
  wInt: { name: 'Walking intervals', icon: 'target', desc: 'Power intervals with easy walking between them — builds fitness fast' },
  wLong: { name: 'Long walk', icon: 'flag', desc: 'The long walk of the week, at a comfortable pace' },
};
const seg = (kind, sec, label) => ({ kind, sec, label });
const total = (segs) => segs.reduce((t, s) => t + s.sec, 0);
const mk = (type, segs, name) => ({ type, walk: true, name: name || WALK_TYPES[type].name, icon: WALK_TYPES[type].icon, segs, totalSec: total(segs), pace: {}, lvl: 0 });

// הליכה אחת. mins: אורך כולל (כולל חימום ושחרור). weekIdx: שבוע מצטבר — בהליכה המהירה ובאינטרוולים החלק הנמרץ גדל משבוע לשבוע
export function buildWalkSession(profile, type, { minutes = null, weekIdx = 0 } = {}) {
  const lvl = walkLevel(profile), mins = minutes || profile.walkMin || 30, prog = weekIdx % 12;
  const warm = mins <= 20 ? 180 : 300, cool = mins <= 20 ? 120 : 180, main = mins * 60 - warm - cool;
  const segs = [seg('warm', warm, 'Warm-up at an easy walk')];
  if (type === 'wEasy') segs.push(seg('stroll', main, `Easy walk ${Math.round(main / 60)} min`));
  else if (type === 'wLong') segs.push(seg(lvl >= 2 ? 'brisk' : 'stroll', main, `Long walk ${Math.round(main / 60)} min`));
  else if (type === 'wBrisk') {
    // מתחילים: מקטעים מהירים עם הפוגות נינוחות; מהרמה השנייה — רצף אחד
    if (lvl === 1) {
      const fast = Math.min(600, 240 + prog * 30), easy = 120; let t = 0, i = 1;
      for (; t + fast <= main; i++) { segs.push(seg('brisk', fast, `Brisk walk ${i}`)); t += fast; if (t + easy + 60 <= main) { segs.push(seg('stroll', easy, 'Easy break')); t += easy; } }
      if (main - t >= 60) segs.push(seg('brisk', main - t, `Brisk walk ${i}`));   // מה שנשאר עד סוף ההליכה
    }
    else segs.push(seg('brisk', main, `Brisk walk ${Math.round(main / 60)} min`));
  } else if (type === 'wInt') {
    // קטע נמרץ (הכי מהר בלי לרוץ) ואחריו התאוששות: 1:2 למתחילים, 2:2 לקבועים, 3:2 למהירים
    const work = lvl === 1 ? 60 : lvl === 2 ? 120 : 180, rest = 120, reps = Math.max(3, Math.floor(main / (work + rest)));
    for (let i = 0; i < reps; i++) { segs.push(seg('power', work, `Power interval ${i + 1}/${reps}`)); segs.push(seg(lvl === 1 ? 'stroll' : 'brisk', rest, 'Recovery walk')); }
    const left = main - reps * (work + rest); if (left >= 60) segs.push(seg('brisk', left, 'Brisk walk'));
  }
  segs.push(seg('cool', cool, 'Cool-down at a relaxed walk'));
  return mk(type, segs);
}
// ההליכה הארוכה: מתחילה ברבע שעה מעל ההליכה הרגילה וגדלה בחמש דקות בכל שבוע בנייה, עד 90 דקות
export function walkLongMinutes(profile, weekIdx) {
  const built = weekIdx - Math.floor(weekIdx / 4);
  return Math.min(90, (profile.walkMin || 30) + 15 + built * 5);
}

const W = (run, focus) => ({ name: run.name, focus, track: 'walk', runOnly: true, minutes: Math.round(run.totalSec / 60), items: [], warmup: [], cooldown: [], run });
// n הליכות לשבוע (בלי מספרי ימים)
export function buildWalkSessions(profile, n, { blockIndex = 0, weekInBlock = 0 } = {}) {
  const w = blockIndex * 4 + weekInBlock, deload = weekInBlock % 4 === 3, days = Math.min(6, Math.max(1, n));
  let long = walkLongMinutes(profile, w); if (deload) long = Math.round((long * 0.75) / 5) * 5;
  const ses = (type, mins) => W(buildWalkSession(profile, type, { minutes: mins, weekIdx: w }), WALK_TYPES[type].desc);
  const easy = () => ses('wEasy'), brisk = () => ses('wBrisk'), int = () => (deload ? ses('wBrisk') : ses('wInt', Math.min(45, profile.walkMin || 30)));
  const LONG = W(buildWalkSession(profile, 'wLong', { minutes: long, weekIdx: w }), deload ? 'Recovery week — shorter' : WALK_TYPES.wLong.desc);
  const plans = { 1: [brisk()], 2: [brisk(), LONG], 3: [brisk(), int(), LONG], 4: [brisk(), easy(), int(), LONG], 5: [brisk(), easy(), int(), brisk(), LONG], 6: [brisk(), easy(), int(), brisk(), easy(), LONG] };
  const out = plans[days], count = {}, seen = {};
  for (const s of out) count[s.name] = (count[s.name] || 0) + 1;
  for (const s of out) if (count[s.name] > 1) { seen[s.name] = (seen[s.name] || 0) + 1; s.name = `${s.name} ${'ABC'[seen[s.name] - 1]}`; }
  return out;
}
export function buildWalkWeek(profile, { blockIndex = 0, weekInBlock = 0 } = {}) {
  const days = Math.min(6, Math.max(2, profile.days || 4));
  const sessions = buildWalkSessions(profile, days, { blockIndex, weekInBlock }).map((x, i) => ({ day: i + 1, ...x }));
  return { blockIndex, weekInBlock, phase: WALK_PHASE, week: WALK_WEEKS[weekInBlock % 4], sessions };
}
export const WALK_PHASE = { id: 'walk', name: 'Walking', desc: 'Most walks at a brisk, comfortable pace, intervals once a week, and a long walk that grows gradually. Three build weeks and one easy week.' };
export const WALK_WEEKS = [
  { name: 'Base week', rpe: 4, volume: 1, load: 1 }, { name: 'Build week', rpe: 5, volume: 1, load: 1 },
  { name: 'Peak week', rpe: 5, volume: 1, load: 1 }, { name: 'Easy week', rpe: 4, volume: 0.75, load: 1 },
];
// סוף בלוק: מי שהשלים לפחות 80% מההליכות עולה רמה (קטעים נמרצים ארוכים יותר)
export function walkLevelUp(profile, runs = [], now = Date.now()) {
  const done = runs.filter((r) => r.walk && now - new Date(r.date).getTime() < 28 * 864e5).length;
  return done >= Math.min(6, Math.max(2, profile.days || 4)) * 4 * 0.8 && walkLevel(profile) < 3;
}

// ───── קצב מה-GPS ─────
// יעד הקצב לכל מקטע, בשניות לק״מ. brisk / power: לא לאט מ-max. stroll / cool: לא מהר מ-min (כדי שההתאוששות תהיה התאוששות).
// הרמות: מתחילים 5.5 קמ״ש בהליכה מהירה ו-6 בנמרצת · הולכים קבוע 6 ו-6.5 · הולכים מהר 6.5 ו-7.
const BRISK = [0, 655, 600, 555], POWER = [0, 600, 555, 515];
export function walkTarget(profile, kind) {
  const l = walkLevel(profile);
  if (kind === 'brisk') return { max: BRISK[l], floor: Math.round(POWER[l] * 0.93) };   // floor: מהר מזה — שורפים את הכוח למקטעים הנמרצים
  if (kind === 'power') return { max: POWER[l] };
  if (kind === 'stroll' || kind === 'cool') return { min: BRISK[l] };
  return null;
}
// איך הקצב הנוכחי ביחס ליעד: slow — לאט מדי במקטע מהיר · fast — מהר מדי במקטע רגוע · over — מהר מדי במקטע מהיר (לא נמרץ) · ok. סטייה של עד 5% נחשבת בסדר
export function paceVerdict(target, paceSec) {
  if (!target || !paceSec) return null;
  if (target.max) return paceSec > target.max * 1.05 ? 'slow' : target.floor && paceSec < target.floor ? 'over' : 'ok';
  return paceSec < target.min * 0.95 ? 'fast' : 'ok';
}
