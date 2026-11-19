// מנוע התוכנית: בניית תוכנית שבועית לפי פרופיל, מחזוריות (בלוקים של 4 שבועות) ואוטו־רגולציה.
import { EX, EXERCISES } from '../data/exercises.js';
import { buildRunSession } from './running.js';
import { isCali, buildCaliWeek, buildCaliFieldWorkout, CALI_PHASE, caliBlocked } from './cali.js';

// ───── שלבי אימון (בלוקים) ─────
export const PHASES = [
  { id: 'base', name: 'יסוד ונפח', desc: 'בניית בסיס שריר וסבולת — חזרות בינוניות, טכניקה מושלמת.',
    main: [4, 8, 10], second: [3, 8, 12], acc: [3, 10, 15], restMain: 120, restAcc: 75 },
  { id: 'strength', name: 'כוח', desc: 'משקלים כבדים, מעט חזרות — בונים כוח גולמי.',
    main: [5, 4, 6], second: [4, 6, 8], acc: [3, 8, 12], restMain: 180, restAcc: 90 },
  { id: 'power', name: 'כוח מתפרץ וסבולת', desc: 'שילוב כוח, פיצוץ וסבולת.',
    main: [4, 5, 6], second: [3, 8, 10], acc: [3, 12, 15], restMain: 150, restAcc: 60 },
];

export const WEEK_IN_BLOCK = [
  { name: 'שבוע בסיס', rpe: 7, volume: 1, load: 1 },
  { name: 'שבוע בנייה', rpe: 8, volume: 1, load: 1.025 },
  { name: 'שבוע שיא', rpe: 8.5, volume: 1.1, load: 1.05 },
  { name: 'שבוע פריקה', rpe: 6, volume: 0.6, load: 0.9 },
];

export const GOALS = {
  combat: { name: 'כושר כללי', icon: 'shield', runs: 3, finisher: true, phaseOrder: ['base', 'strength', 'power'] },
  muscle: { name: 'מסה ושריר', icon: 'dumbbell', runs: 1, finisher: false, phaseOrder: ['base', 'base', 'strength'] },
  strength: { name: 'כוח מקסימלי', icon: 'bolt', runs: 1, finisher: false, phaseOrder: ['base', 'strength', 'strength'] },
  cut: { name: 'חיטוב והורדת שומן', icon: 'flame', runs: 2, finisher: true, phaseOrder: ['base', 'power', 'base'] },
  // מסלול קליסתניקס בלבד
  skill: { name: 'שליטה בגוף ומיומנויות', icon: 'target', runs: 0, finisher: false, phaseOrder: ['base'], track: 'cali' },
};
// המטרות של כל מסלול (מסה וחיטוב משותפות)
const TRACK_GOALS = { gym: ['combat', 'muscle', 'strength', 'cut'], cali: ['skill', 'muscle', 'cut'] };
export const goalsFor = (track) => TRACK_GOALS[track === 'cali' ? 'cali' : 'gym'];
// מעבר בין מסלולים: המטרה המקבילה במסלול השני
export const goalForTrack = (goal, track) => (goalsFor(track).includes(goal) ? goal : track === 'cali' ? 'skill' : 'combat');

// ───── תבניות פיצול ─────
// כל משבצת: role + רשימת תרגילים מועדפים לפי סדר (בחירה לפי רמה/פציעות/רוטציה)
const S = (role, ...opts) => ({ role, opts });
const T = {
  fullA: { name: 'גוף מלא A', focus: 'סקוואט · לחיצה · משיכה', slots: [
    S('main', 'back_squat', 'leg_press'), S('main', 'bench_press', 'incline_db_press', 'pushup'), S('second', 'cable_row', 'db_row'),
    S('acc', 'rdl', 'leg_curl'), S('acc', 'lateral_raise'), S('core', 'plank', 'ab_wheel')] },
  fullB: { name: 'גוף מלא B', focus: 'דדליפט · מתח · כתפיים', slots: [
    S('main', 'deadlift', 'rdl', 'hip_thrust'), S('main', 'pullup', 'lat_pulldown'), S('second', 'ohp', 'incline_db_press'),
    S('acc', 'db_lunge', 'bulgarian_split'), S('acc', 'face_pull', 'rear_delt_fly'), S('core', 'hanging_leg_raise', 'woodchop')] },
  fullC: { name: 'גוף מלא C', focus: 'רגל אחת · חזה · זרועות', slots: [
    S('main', 'bulgarian_split', 'db_lunge', 'leg_press'), S('main', 'incline_db_press', 'bench_press'), S('second', 'bb_row', 'db_row'),
    S('acc', 'dips', 'rope_pushdown'), S('acc', 'hammer_curl', 'bb_curl'), S('core', 'woodchop', 'plank')] },
  upperA: { name: 'פלג עליון A', focus: 'כוח לחיצה ומשיכה', slots: [
    S('main', 'bench_press', 'incline_db_press'), S('main', 'bb_row', 'cable_row'), S('second', 'ohp', 'incline_db_press'),
    S('second', 'lat_pulldown', 'pullup'), S('acc', 'lateral_raise'), S('acc', 'rope_pushdown'), S('acc', 'bb_curl')] },
  lowerA: { name: 'פלג תחתון A', focus: 'סקוואט ויציבות', slots: [
    S('main', 'back_squat', 'leg_press'), S('second', 'rdl', 'hip_thrust'), S('acc', 'bulgarian_split', 'db_lunge'),
    S('acc', 'leg_curl'), S('acc', 'calf_raise'), S('core', 'hanging_leg_raise', 'plank')] },
  upperB: { name: 'פלג עליון B', focus: 'נפח עליון ומתח', slots: [
    S('main', 'pullup', 'lat_pulldown'), S('main', 'incline_db_press', 'bench_press'), S('second', 'db_row', 'cable_row'),
    S('second', 'dips', 'pushup'), S('acc', 'face_pull', 'rear_delt_fly'), S('acc', 'cable_fly'), S('acc', 'hammer_curl'), S('acc', 'oh_tri_ext')] },
  lowerB: { name: 'פלג תחתון B', focus: 'דדליפט וכוח אחורי', slots: [
    S('main', 'deadlift', 'rdl'), S('second', 'leg_press', 'back_squat'), S('acc', 'hip_thrust'), S('acc', 'leg_ext'),
    S('acc', 'db_lunge'), S('core', 'ab_wheel', 'woodchop')] },
  push: { name: 'דחיפה', focus: 'חזה · כתפיים · יד אחורית', slots: [
    S('main', 'bench_press', 'incline_db_press'), S('main', 'ohp'), S('second', 'incline_db_press', 'dips'), S('acc', 'cable_fly'),
    S('acc', 'lateral_raise'), S('acc', 'rope_pushdown'), S('acc', 'oh_tri_ext')] },
  pull: { name: 'משיכה', focus: 'גב · יד קדמית · אחיזה', slots: [
    S('main', 'pullup', 'lat_pulldown'), S('main', 'bb_row', 'db_row'), S('second', 'cable_row', 'lat_pulldown'), S('acc', 'face_pull'),
    S('acc', 'rear_delt_fly'), S('acc', 'bb_curl'), S('acc', 'hammer_curl')] },
  legs: { name: 'רגליים', focus: 'כוח ועוצמת רגליים', slots: [
    S('main', 'back_squat', 'leg_press'), S('main', 'rdl', 'deadlift'), S('second', 'bulgarian_split', 'db_lunge'), S('acc', 'leg_curl'),
    S('acc', 'leg_ext'), S('acc', 'calf_raise'), S('core', 'hanging_leg_raise', 'plank')] },
  field: { name: 'אימון בלי ציוד', focus: 'משקל גוף — בכל מקום', slots: [
    S('main', 'pushup'), S('main', 'air_squat'), S('second', 'bw_lunge'), S('second', 'burpee'), S('acc', 'glute_bridge'), S('acc', 'mountain_climber'), S('core', 'plank')] },
};

const SPLITS = {
  3: ['fullA', 'fullB', 'fullC'],
  4: ['upperA', 'lowerA', 'upperB', 'lowerB'],
  5: ['upperA', 'lowerA', 'push', 'pull', 'legs'],
  6: ['push', 'pull', 'legs', 'upperB', 'lowerB', 'fullC'],
};

// אימון בלי ציוד: רק תרגילים שאפשר לעשות בכל מקום (בלי מוט מתח, משקולות או מכונות)
const NO_EQUIP = new Set(['משקל גוף', 'מזרן', 'עמידה']);
export const isBodyweight = (id) => NO_EQUIP.has(EX[id]?.equip);
const FIELD_FINISHER = { name: 'פיניש: קפיצות פיסוק + ברכיים גבוהות', items: [['jumping_jacks', 30], ['high_knees', 30]], rounds: 3 };

const FINISHERS = [
  { name: 'פיניש: סבב סווינג + ברפי', items: [['kb_swing', 15], ['burpee', 10]], rounds: 3 },
  { name: 'פיניש: חבלים + חקלאי', items: [['battle_rope', 30], ['farmer_carry', 40]], rounds: 3 },
  { name: 'פיניש: מזחלת + קפיצות', items: [['sled_push', 25], ['box_jump', 6]], rounds: 3 },
  { name: 'פיניש: חתירה ספרינט', items: [['rower', 45], ['burpee', 8]], rounds: 4 },
];

// פציעות → תרגילים לחסימה
export const INJURIES = {
  knee: { name: 'ברכיים', block: ['box_jump', 'bulgarian_split', 'db_lunge', 'leg_ext', 'back_squat', 'burpee'] },
  back: { name: 'גב תחתון', block: ['deadlift', 'bb_row', 'rdl', 'back_squat', 'kb_swing', 'ab_wheel'] },
  shoulder: { name: 'כתפיים', block: ['ohp', 'dips', 'bench_press', 'pullup', 'battle_rope'] },
  wrist: { name: 'שורש כף יד', block: ['pushup', 'burpee', 'bb_curl', 'ab_wheel'] },
};

export function blockedSet(profile) {
  const s = new Set();
  for (const inj of profile.injuries || []) for (const id of INJURIES[inj]?.block || []) s.add(id);
  if (isCali(profile)) for (const id of caliBlocked(profile)) s.add(id);
  return s;
}

export function phaseFor(profile, blockIndex) {
  if (isCali(profile)) return CALI_PHASE;
  const order = GOALS[profile.goal]?.phaseOrder || GOALS.combat.phaseOrder;
  const id = order[blockIndex % order.length];
  return PHASES.find((p) => p.id === id);
}

function pickExercise(slot, profile, blocked, rotation, used) {
  const ok = slot.opts.filter((id) => !blocked.has(id) && !used.has(id) && EX[id] && EX[id].level <= profile.level + 1);
  let pool = ok;
  if (!pool.length) {
    // חלופה: תרגיל מאותה קבוצה/תבנית שאינו חסום
    const ref = EX[slot.opts[0]];
    pool = EXERCISES.filter((e) => !blocked.has(e.id) && !used.has(e.id) && (e.pattern === ref.pattern || e.group === ref.group) && e.level <= profile.level + 1)
      .map((e) => e.id);
  }
  if (!pool.length) return null;
  // רמה נמוכה → מעדיפים תרגילי מכונה/בסיס; רוטציה בין בלוקים
  const easy = profile.level <= 1 ? pool.filter((id) => EX[id].level <= 1) : [];
  const final = easy.length ? easy : pool;
  return final[rotation % final.length];
}

function schemeFor(role, phase, profile, week) {
  const base = role === 'main' ? phase.main : role === 'second' ? phase.second : phase.acc;
  let [sets, lo, hi] = base;
  if (profile.level <= 1) sets = Math.max(2, sets - 1);
  if (profile.level >= 4 && role !== 'acc' && role !== 'core') sets += 1;
  if (profile.goal === 'cut' && role === 'acc') { lo += 2; hi += 3; }
  sets = Math.max(2, Math.round(sets * week.volume));
  const rest = role === 'main' ? phase.restMain : role === 'second' ? Math.round((phase.restMain + phase.restAcc) / 2) : phase.restAcc;
  return { sets, reps: [lo, hi], rest, rpe: week.rpe };
}

function capToTime(items, minutes) {
  // הערכת זמן: (סטים × (45 שניות עבודה + מנוחה)) — מקצצים אביזרים אם חורגים
  const est = (arr) => arr.reduce((t, it) => t + it.sets * (45 + it.rest), 0) / 60 + 10;
  const out = [...items];
  while (est(out) > minutes && out.length > 3) {
    const idx = out.map((x) => x.role).lastIndexOf('acc');
    if (idx === -1) break;
    out.splice(idx, 1);
  }
  return out;
}

export function buildWorkout(templateId, profile, { blockIndex = 0, weekInBlock = 0 } = {}) {
  const tpl = T[templateId];
  const phase = phaseFor(profile, blockIndex);
  const week = WEEK_IN_BLOCK[weekInBlock % 4];
  const blocked = blockedSet(profile);
  const used = new Set();
  const items = [];
  tpl.slots.forEach((slot) => {
    const exId = pickExercise(slot, profile, blocked, blockIndex, used);
    if (!exId || (templateId === 'field' && !isBodyweight(exId))) return;
    used.add(exId);
    const ex = EX[exId];
    const sch = schemeFor(slot.role === 'core' ? 'acc' : slot.role, phase, profile, week);
    if (ex.type === 'time') { sch.reps = [20 + profile.level * 10, 30 + profile.level * 10]; sch.unit = 'sec'; }
    if (ex.type === 'bw' && templateId === 'field') { sch.reps = [8 + profile.level * 2, 12 + profile.level * 3]; }
    items.push({ exId, role: slot.role, ...sch });
  });
  const out = { templateId, name: tpl.name, focus: tpl.focus, phase: phase.id, items: capToTime(items, profile.sessionMin || 60) };
  out.warmup = warmupFor(out.items, blocked);
  out.cooldown = cooldownFor(out.items);
  if ((GOALS[profile.goal]?.finisher || templateId === 'field') && weekInBlock !== 3) {
    const f = templateId === 'field' ? FIELD_FINISHER : FINISHERS[(blockIndex + templateId.length) % FINISHERS.length];
    const ok = f.items.every(([id]) => !blocked.has(id));
    if (ok) out.finisher = { ...f, rounds: f.rounds + (profile.level >= 4 ? 1 : 0) };
  }
  return out;
}

// ───── תוכנית שבועית ─────
export function buildWeek(profile, { blockIndex = 0, weekInBlock = 0 } = {}) {
  if (isCali(profile)) return buildCaliWeek(profile, { blockIndex, weekInBlock });
  const days = Math.min(6, Math.max(3, profile.days || 4));
  const split = SPLITS[days];
  const runsWanted = Math.min(days, GOALS[profile.goal]?.runs ?? 2);
  const runTypes = ['intervals', 'tempo', 'easy'];
  // ריצות משובצות בימים "קלים יותר" לרגליים (עליון/דחיפה/משיכה) קודם
  const order = split.map((t, i) => ({ i, lower: /lower|legs/.test(t) })).sort((a, b) => a.lower - b.lower).map((x) => x.i);
  const runDays = new Set(order.slice(0, runsWanted));
  let r = 0;
  const sessions = split.map((tid, i) => {
    const w = buildWorkout(tid, profile, { blockIndex, weekInBlock });
    if (runDays.has(i)) {
      const type = weekInBlock === 3 && r === 0 ? 'test' : runTypes[r % runTypes.length];
      w.run = buildRunSession(profile, type, blockIndex * 4 + weekInBlock);
      r++;
    }
    return { day: i + 1, ...w };
  });
  return { blockIndex, weekInBlock, phase: phaseFor(profile, blockIndex), week: WEEK_IN_BLOCK[weekInBlock], sessions };
}

export function buildFieldWorkout(profile) {
  if (isCali(profile)) return buildCaliFieldWorkout(profile);
  return buildWorkout('field', profile, {});
}

// ───── אוטו־רגולציה לפי צ׳ק־אין מוכנות ─────
// readiness: 0..1 (שינה, אנרגיה, כאבי שרירים, לחץ)
export function applyReadiness(workout, readiness) {
  const w = structuredClone(workout);
  w.readiness = readiness;
  if (w.track === 'cali') {
    // קליסתניקס: אין משקל להוריד — משנים נפח ומרחק מכישלון
    if (readiness < 0.4) {
      w.items = w.items.map((it) => ({ ...it, sets: Math.max(2, it.sets - 1), rpe: Math.min(it.rpe, 7) }));
      delete w.finisher;
      w.note = 'יום קשה? הורדתי סט מכל תרגיל. עוצרים רחוק מכישלון — איכות לפני כמות.';
    } else if (readiness < 0.6) w.note = 'מוכנות בינונית — עוצרים חזרה או שתיים לפני הסוף.';
    else if (readiness > 0.85) {
      w.items = w.items.map((it) => (it.role === 'main' ? { ...it, sets: it.sets + 1 } : it));
      w.note = 'מוכנות גבוהה! הוספתי סט לתרגילים המרכזיים.';
    }
    return w;
  }
  if (readiness < 0.4) {
    w.items = w.items.map((it) => ({ ...it, sets: Math.max(2, it.sets - 1), loadAdj: 0.9, rpe: Math.min(it.rpe, 7) }));
    delete w.finisher;
    w.note = 'יום עמוס? הורדתי נפח ועומס ב-10%. איכות לפני כמות.';
  } else if (readiness < 0.6) {
    w.items = w.items.map((it) => ({ ...it, loadAdj: 0.95 }));
    w.note = 'מוכנות בינונית — עומס מופחת ב-5%.';
  } else if (readiness > 0.85) {
    w.items = w.items.map((it) => (it.role === 'main' ? { ...it, sets: it.sets + 1 } : it));
    w.note = 'מוכנות גבוהה! הוספתי סט לתרגילים המרכזיים.';
  }
  return w;
}

// ───── הערכת רמה מהשאלון ─────
export function estimateLevel({ years = 0, pushups = 0, pullups = 0, run3k = null }) {
  let s = 0;
  s += years >= 3 ? 2 : years >= 1 ? 1.2 : years > 0 ? 0.5 : 0;
  s += pushups >= 50 ? 1.2 : pushups >= 35 ? 0.9 : pushups >= 20 ? 0.5 : 0.1;
  s += pullups >= 15 ? 1.2 : pullups >= 10 ? 0.9 : pullups >= 5 ? 0.5 : 0.1;
  if (run3k) s += run3k <= 12 * 60 ? 1 : run3k <= 13.5 * 60 ? 0.7 : run3k <= 15 * 60 ? 0.4 : 0.1;
  return Math.min(5, Math.max(1, Math.floor(1 + s)));
}

// ───── חימום ומתיחות ─────
// חימום דינמי: 5 תנועות × 40 שנ׳ (סקוואט חימום ביום רגליים, ברכיים גבוהות ביום עליון)
export function warmupFor(items, blocked = new Set()) {
  const legDay = items.some((it) => EX[it.exId] && ['squat', 'hinge', 'lunge'].includes(EX[it.exId].pattern));
  const inWorkout = new Set(items.map((it) => it.exId)); // לא חוזרים בחימום על תנועה שהיא חלק מהאימון עצמו
  const ids = ['jumping_jacks', 'arm_circles', 'leg_swings', 'inchworm', legDay ? 'bw_squat' : 'high_knees']
    .filter((id) => !inWorkout.has(id) && !blocked.has(id) && !(blocked.has('box_jump') && ['jumping_jacks', 'high_knees'].includes(id)));
  return ids.map((exId) => ({ exId, secs: 40 }));
}
// מתיחות: לפי השרירים שעבדו הכי הרבה באימון, 4 מתיחות × 40 שנ׳ (חד־צדדיות: 20 לכל צד), תנוחת ילד בסוף
const STRETCH_FOR = { quads: 'quad_stretch', hamstrings: 'hamstring_stretch', glutes: 'hip_flexor_stretch', chest: 'chest_stretch',
  shoulders: 'shoulder_stretch', upper_back: 'shoulder_stretch', lats: 'child_pose', lower_back: 'child_pose', triceps: 'shoulder_stretch', biceps: 'chest_stretch' };
export function cooldownFor(items) {
  const load = {};
  for (const it of items) (EX[it.exId]?.muscles || []).forEach((m, i) => { load[m] = (load[m] || 0) + it.sets * (i ? 0.5 : 1); });
  const picks = [];
  for (const [m] of Object.entries(load).sort((a, b) => b[1] - a[1])) {
    const id = STRETCH_FOR[m];
    if (id && id !== 'child_pose' && !picks.includes(id)) picks.push(id);
    if (picks.length === 3) break;
  }
  return [...picks, 'child_pose'].map((exId) => ({ exId, secs: 40 }));
}

export const LEVEL_NAMES = ['', 'מתחיל', 'בסיסי', 'בינוני', 'מתקדם', 'עילית'];
export { T as TEMPLATES };
