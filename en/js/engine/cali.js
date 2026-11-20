// מנוע מסלול הקליסתניקס: מבחן רמה → שלב התחלתי בכל סולם, בניית אימונים לפי ציוד, ועלייה/ירידה בשלבים לפי ביצועים.
// מצב המתאמן נשמר ב-profile.cali: { equip: [], rungs: { סולם: תרגיל }, since: { סולם: תאריך }, hits: {}, fails: {}, skills: [] }
import { EX } from '../data/exercises.js';
import { LADDERS, STRENGTH_LADDERS, SKILL_LADDERS, LADDER_OF, MAX_ACTIVE_SKILLS } from '../data/cali.js';

// מסלולים: gym = חדר כושר · cali = קליסתניקס · mix = משולב (חלק מאימוני השבוע בחדר כושר וחלק קליסתניקס)
export const isCali = (profile) => profile?.track === 'cali';            // קליסתניקס בלבד
export const isMix = (profile) => profile?.track === 'mix' && !!profile.cali;
export const hasCali = (profile) => (profile?.track === 'cali' || profile?.track === 'mix') && !!profile.cali;
export const hasGym = (profile) => !['cali', 'mob', 'run', 'hiit', 'pil', 'yoga', 'tai'].includes(profile?.track);
// מי מאמן: במסלול משולב כל אימון עם המאמן של המסלול שלו — מאיה בקליסתניקס, אורי/נועה בחדר הכושר
// אימון מוביליטי תמיד עם תמר, גם כשהוא משולב בשבוע של מסלול אחר
export const sessionCoach = (profile, workout) => (workout?.track === 'mob' ? 'tamar' : workout?.extra && workout.coach ? workout.coach : profile?.track === 'mix' ? (workout?.track === 'cali' ? 'maya' : profile.gymCoach || 'ori') : profile?.coach || 'ori');
// מי מדגים תרגיל מחוץ לאימון (ספרייה, סולמות)
// למאמני הריצה אין הדגמות של תרגילים, ולכן מתיחות המוביליטי במסלול ריצה מודגמות אצל תמר
export const exCoach = (profile, exId) => (EX[exId]?.mob || (profile?.track === 'run' && EX[exId]?.tracks.includes('mob')) ? 'tamar' : profile?.track === 'mix' ? (EX[exId]?.cali ? 'maya' : profile.gymCoach || 'ori') : profile?.coach || 'ori');
const DAY = 864e5;

// ───── ציוד ─────
export const canDo = (exId, equip = []) => { const n = EX[exId]?.needs; return !n || n.some((x) => equip.includes(x)); };
const ladderHasEquip = (lid, equip) => { const n = LADDERS[lid].needs; return !n || n.some((x) => equip.includes(x)); };
// השלבים שאפשר לבצע עם הציוד שיש (למשל בלי טבעות, סולם המקבילים נגמר במקבילים רגילים)
export const rungsOf = (lid, equip = []) => (ladderHasEquip(lid, equip) ? LADDERS[lid].rungs.filter((r) => canDo(r.id, equip)) : []);
const idxOf = (lid, exId) => LADDERS[lid].rungs.findIndex((r) => r.id === exId);

// המצב בסולם: השלב הנוכחי (אם התרגיל השמור לא זמין בציוד הנוכחי — הקרוב ביותר מתחתיו)
export function rungState(cali, lid) {
  const equip = cali?.equip || [];
  const list = rungsOf(lid, equip);
  if (!list.length) return null;
  const saved = idxOf(lid, cali?.rungs?.[lid]);
  let i = 0;
  list.forEach((r, k) => { if (idxOf(lid, r.id) <= saved) i = k; });
  return { lid, i, n: list.length, rung: list[i], next: list[i + 1] || null, prev: list[i - 1] || null, list, pct: list.length > 1 ? i / (list.length - 1) : 1 };
}

// דרישות קדם: האם הסולם פתוח למתאמן, ואם לא — מה חסר
export function ladderLock(cali, lid) {
  const L = LADDERS[lid], equip = cali?.equip || [];
  if (!ladderHasEquip(lid, equip)) return { equip: L.needs };
  const missing = [];
  for (const [dep, minId] of Object.entries(L.req || {})) {
    // סולם התלות עצמו לא זמין (אין מתח) → הדרישה לא מתקיימת
    const st = rungState(cali, dep);
    if (!st || idxOf(dep, st.rung.id) < idxOf(dep, minId)) missing.push({ lid: dep, exId: minId });
  }
  return missing.length ? { req: missing } : null;
}
export const ladderOpen = (cali, lid) => !ladderLock(cali, lid);

// ───── מבחן רמה ─────
// הכלל המקובל: מתחילים בווריאציה הקשה ביותר שאפשר לבצע בה 3 סטים של 5–8 חזרות נקיות.
// המיפוי ממקסימום חזרות לשלב שמרני בכוונה — עלייה קורית מהר (אימון אחד טוב), ירידה מתסכלת יותר.
const pick = (v, table) => { let out = table[0][1]; for (const [min, id] of table) if (v >= min) out = id; return out; };
export function startRungs({ pushups = 0, pullups = 0, squats = 0, dips = 0, plankSec = 0, bmi = 23 } = {}, equip = []) {
  const r = {};
  r.push = pick(pushups, [[0, bmi >= 30 ? 'wall_pushup' : 'incline_pushup'], [3, 'knee_pushup'], [10, 'pushup'], [25, 'diamond_pushup'], [40, 'pseudo_planche_pushup']]);
  r.vpush = pick(pushups, [[0, 'pike_pushup'], [35, 'elevated_pike_pushup']]);
  r.dip = pick(dips, [[0, 'support_hold'], [1, 'dip_negative'], [8, 'dips']]);
  r.pull = pick(pullups, [[0, pushups >= 15 ? 'scap_pull' : 'dead_hang'], [1, 'pullup_negative'], [6, 'pullup'], [15, 'lsit_pullup']]);
  r.row = pick(Math.max(pullups * 3, pushups), [[0, 'door_row'], [10, 'table_row'], [20, 'inverted_row'], [36, 'elevated_row']]);
  r.squat = pick(squats, [[0, 'assisted_squat'], [10, 'air_squat'], [30, 'bw_lunge'], [50, 'bw_bulgarian']]);
  r.hinge = pick(squats, [[0, 'glute_bridge'], [20, 'single_leg_bridge'], [50, 'single_leg_rdl']]);
  r.core = pick(plankSec, [[0, 'dead_bug'], [30, 'plank'], [60, 'hollow_hold'], [100, 'lying_leg_raise']]);
  r.hang = pick(pullups, [[0, 'hanging_knee_raise'], [10, 'hanging_leg_raise']]);
  for (const lid of SKILL_LADDERS) r[lid] = LADDERS[lid].rungs[0].id;
  if (pushups >= 25) r.lsit = 'lsit_tuck';
  return r;
}

export function newCali(test, equip = [], now = new Date().toISOString()) {
  const cali = { equip: [...equip], rungs: startRungs(test, equip), since: {}, hits: {}, fails: {}, skills: [], test: { ...test } };
  for (const lid of Object.keys(LADDERS)) cali.since[lid] = now;
  cali.skills = ['lsit', 'handstand'].filter((lid) => ladderOpen(cali, lid));
  return cali;
}

// רמה כללית 1–5 (לתצוגה): ממוצע ההתקדמות בסולמות הכוח הזמינים
export function caliLevel(cali) {
  const st = STRENGTH_LADDERS.map((lid) => rungState(cali, lid)).filter(Boolean);
  if (!st.length) return 1;
  const avg = st.reduce((a, s) => a + idxOf(s.lid, s.rung.id) / (LADDERS[s.lid].rungs.length - 1), 0) / st.length;
  return Math.min(5, Math.max(1, 1 + Math.round(avg * 4)));
}
// אחוזי התקדמות למדד הכושר: כוח = סולמות הכוח, מיומנות = המיומנויות הפעילות
export function caliProgress(cali) {
  const avg = (ids) => { const st = ids.map((lid) => rungState(cali, lid)).filter(Boolean); return st.length ? Math.round((st.reduce((a, s) => a + (idxOf(s.lid, s.rung.id) + 1) / LADDERS[s.lid].rungs.length, 0) / st.length) * 100) : null; };
  return { strength: avg(STRENGTH_LADDERS), skill: avg((cali?.skills || []).filter((lid) => ladderOpen(cali, lid))) };
}

// ───── בניית אימון ─────
// משבצת: [סולם, תפקיד, אפשרויות]. vol = שלב אחד מתחת לנוכחי, יותר חזרות (נפח — לא משפיע על הסולם).
const SL = (lid, role, o = {}) => ({ lid, role, ...o });
const TPL = {
  cFull: { name: 'Full body', focus: 'Pull · squat · push · core', skills: 'any', slots: [
    SL('pull', 'main', { alt: 'row' }), SL('squat', 'main'), SL('push', 'second', { rotate: 'dip' }), SL('hinge', 'second'),
    SL('row', 'acc', { ifNoPull: 'prone' }), SL('vpush', 'acc'), SL('core', 'core', { rotate: 'hang' })] },
  cUpper: { name: 'Upper body', focus: 'Pull · push · shoulders', skills: 'any', slots: [
    SL('pull', 'main', { alt: 'row' }), SL('push', 'main'), SL('row', 'second', { ifNoPull: 'prone' }), SL('dip', 'second', { alt: 'vpush' }),
    SL('vpush', 'acc'), SL('pull', 'acc', { vol: true }), SL('hang', 'core', { alt: 'core' })] },
  cLower: { name: 'Legs & core', focus: 'Squat · hamstrings · core', skills: 'push', slots: [
    SL('squat', 'main'), SL('hinge', 'main'), SL('squat', 'second', { vol: true }), SL('hinge', 'acc', { vol: true }),
    SL('core', 'core'), SL('hang', 'core')] },
  cPush: { name: 'Push', focus: 'Chest · shoulders · triceps', skills: 'push', slots: [
    SL('push', 'main'), SL('dip', 'main', { alt: 'vpush' }), SL('vpush', 'second'), SL('push', 'acc', { vol: true }), SL('core', 'core')] },
  cPull: { name: 'Pull', focus: 'Back · biceps · grip', skills: 'pull', slots: [
    SL('pull', 'main', { alt: 'row' }), SL('row', 'main', { ifNoPull: 'prone' }), SL('pull', 'second', { vol: true }), SL('row', 'acc', { vol: true }), SL('hang', 'core', { alt: 'core' })] },
};
const SPLITS = { 1: ['cFull'], 2: ['cFull', 'cFull'], 3: ['cFull', 'cFull', 'cFull'], 4: ['cUpper', 'cLower', 'cUpper', 'cLower'], 5: ['cPush', 'cPull', 'cLower', 'cUpper', 'cFull'], 6: ['cPush', 'cPull', 'cLower', 'cPush', 'cPull', 'cLower'] };
export const CALI_TEMPLATES = TPL;

// מנוחה: 2 דקות לתרגילים המרכזיים (ACSM 2009: 2–3 דק׳ לכוח; ה-Recommended Routine: 90 שנ׳ עד 3 דק׳), פחות לעזר ולליבה.
// אפשר להאריך באימון בכפתור ‎+30.
const REST = { skill: 60, main: 120, second: 90, acc: 60, core: 60 };
const DELOAD = 3; // שבוע רביעי בכל בלוק — פחות נפח

function itemFor(rung, lid, role, { week = 0, level = 2, goal = 'skill', vol = false } = {}) {
  const ex = EX[rung.id];
  const skill = LADDERS[lid].kind === 'skill';
  let sets = skill ? (ex.hold ? 4 : 3) : role === 'acc' || role === 'core' ? 3 : 3;
  if (!skill && role === 'main' && level >= 4) sets += 1;
  if (!skill && goal === 'muscle' && (role === 'second' || role === 'acc')) sets += 1;
  if (skill && goal === 'skill') sets += 1;
  if (vol) sets = 2;
  if (week === DELOAD) sets = Math.max(2, sets - 1);
  // נפח: אותו טווח, כמה חזרות יותר. החזקות ושליליות — לפי היעד של השלב עצמו.
  const reps = vol && !ex.hold && !ex.neg ? [rung.hi, rung.hi + 6] : [rung.lo, rung.hi];
  const it = { exId: rung.id, role: skill ? 'skill' : role, sets, reps, rest: skill ? (ex.straight ? 90 : REST.skill) : REST[role], rpe: week === DELOAD ? 6 : 8, ladder: lid };
  if (ex.hold) it.unit = 'sec';
  if (vol) it.vol = true;
  return it;
}

// אילו מיומנויות נכנסות לאימון: שתיים (אחת באימון קצר), לפי סוג היום, ברוטציה בין האימונים
function skillsFor(cali, tpl, dayIdx, minutes) {
  const active = (cali.skills || []).filter((lid) => ladderOpen(cali, lid));
  const fit = active.filter((lid) => tpl.skills === 'any' || LADDERS[lid].type === tpl.skills);
  const pool = fit.length ? [...fit, ...active.filter((x) => !fit.includes(x))] : active;
  const n = Math.min(pool.length, minutes <= 45 ? 1 : 2);
  const fitN = fit.length || pool.length;
  const out = [];
  for (let k = 0; k < n; k++) { const id = pool[(dayIdx + k) % (k < fitN ? fitN : pool.length)]; if (!out.includes(id)) out.push(id); }
  return out;
}

export function buildCaliWorkout(tid, profile, { blockIndex = 0, weekInBlock = 0, dayIdx = 0, equip = null, minutes = null } = {}) {
  const tpl = TPL[tid];
  const cali = equip ? { ...profile.cali, equip } : profile.cali;
  const level = caliLevel(cali);
  const mins = minutes || profile.sessionMin || 60;
  const blocked = caliBlocked(profile);
  const opt = { week: weekInBlock % 4, level, goal: profile.goal };
  const used = new Set();
  const items = [];
  const push = (lid, role, o = {}) => {
    const st = rungState(cali, lid);
    if (!st || !ladderOpen(cali, lid)) return false;
    let rung = o.vol ? st.prev : st.rung;
    // פציעה: יורדים בסולם עד לתרגיל שאינו חסום
    let i = st.list.indexOf(rung);
    while (rung && (blocked.has(rung.id) || used.has(rung.id))) rung = st.list[--i];
    if (!rung) return false;
    used.add(rung.id);
    items.push(itemFor(rung, lid, role, { ...opt, vol: o.vol }));
    return true;
  };
  for (const lid of skillsFor(cali, tpl, dayIdx + blockIndex, mins)) push(lid, 'skill');
  const hasPull = !!rungState(cali, 'pull');
  tpl.slots.forEach((s) => {
    // רוטציה בין אימונים: שכיבות סמיכה ↔ מקבילים, ליבה על הרצפה ↔ בתלייה
    let lid = s.rotate && dayIdx % 2 === 1 && rungState(cali, s.rotate) ? s.rotate : s.lid;
    if (s.vol && !rungState(cali, lid)?.prev) return;
    if (s.ifNoPull && !hasPull) {
      // אין מתח: משבצת המשיכה הראשית כבר לקחה את החתירה — כאן משלימים במשיכות בשכיבה
      if (!blocked.has('prone_pull') && !used.has('prone_pull')) { used.add('prone_pull'); items.push({ exId: 'prone_pull', role: s.role, sets: 3, reps: [10, 15], rest: REST.acc, rpe: opt.week === DELOAD ? 6 : 8 }); }
      return;
    }
    if (!push(lid, s.role, { vol: s.vol }) && s.alt) push(s.alt, s.role, { vol: s.vol });
  });
  // התאמה לזמן: מורידים קודם נפח ועזר, ואז מיומנות שנייה
  const est = (arr) => arr.reduce((t, it) => t + it.sets * ((it.unit === 'sec' ? it.reps[1] : 40) + it.rest), 0) / 60 + 8;
  const drop = (pred) => { const i = items.map(pred).lastIndexOf(true); if (i < 0) return false; items.splice(i, 1); return true; };
  while (est(items) > mins && items.length > 4) {
    if (!(drop((it) => !!it.vol) || drop((it) => it.role === 'acc') || (items.filter((it) => it.role === 'skill').length > 1 && drop((it) => it.role === 'skill')) || drop((it) => it.role === 'core'))) break;
  }
  const w = { templateId: tid, name: tpl.name, focus: tpl.focus, phase: 'cali', track: 'cali', items };
  w.warmup = caliWarmup(items, blocked);
  if (profile.goal === 'cut' && weekInBlock % 4 !== DELOAD && !blocked.has('burpee')) {
    w.finisher = { name: 'Finisher: burpees + mountain climbers', items: [['burpee', 8], ['mountain_climber', 20]], rounds: 3 };
  }
  return w;
}

// חימום: שורשי כף היד ושכמות תמיד (כל הדחיפות והמיומנויות נשענות עליהם), ועוד שלוש תנועות לפי האימון
export function caliWarmup(items, blocked = new Set()) {
  const legs = items.some((it) => ['squat', 'hinge', 'lunge'].includes(EX[it.exId]?.pattern));
  const upper = items.some((it) => ['push_h', 'push_v', 'pull_h', 'pull_v', 'skill'].includes(EX[it.exId]?.pattern));
  const ids = ['jumping_jacks', ...(upper ? ['wrist_prep', 'arm_circles', 'scap_pushup'] : ['high_knees', 'inchworm']), legs ? 'leg_swings' : 'inchworm', legs ? 'bw_squat' : null];
  const jumpy = blocked.has('burpee');
  return [...new Set(ids.filter(Boolean))].filter((id) => !(blocked.has('pushup') && ['wrist_prep', 'scap_pushup', 'inchworm'].includes(id)) && !(jumpy && ['jumping_jacks', 'high_knees'].includes(id)))
    .slice(0, 5).map((exId) => ({ exId, secs: 40 }));
}

// פציעות → תרגילים חסומים (אותם מפתחות כמו במסלול חדר הכושר)
const CALI_INJ = {
  knee: ['pistol_squat', 'box_pistol', 'shrimp_squat', 'bw_bulgarian', 'bw_lunge', 'nordic_curl', 'nordic_negative', 'burpee'],
  back: ['dragon_flag', 'dragon_flag_negative', 'back_lever', 'back_lever_straddle', 'back_lever_adv_tuck', 'back_lever_tuck', 'skin_the_cat', 'nordic_curl', 'single_leg_rdl'],
  shoulder: ['dips', 'ring_dips', 'dip_negative', 'bar_dip', 'muscle_up', 'muscleup_negative', 'skin_the_cat', 'back_lever', 'back_lever_straddle', 'back_lever_adv_tuck', 'back_lever_tuck',
    'wall_hspu', 'wall_hspu_negative', 'handstand', 'handstand_kickup', 'wall_handstand', 'wall_walk', 'planche', 'planche_straddle', 'planche_adv_tuck', 'planche_tuck', 'planche_lean',
    'human_flag', 'flag_straddle', 'flag_tuck', 'archer_pullup', 'one_arm_pushup', 'pseudo_planche_pushup'],
  wrist: ['pushup', 'diamond_pushup', 'pseudo_planche_pushup', 'archer_pushup', 'one_arm_pushup', 'knee_pushup', 'pike_pushup', 'elevated_pike_pushup', 'wall_hspu', 'wall_hspu_negative', 'handstand',
    'handstand_kickup', 'wall_handstand', 'wall_walk', 'planche', 'planche_straddle', 'planche_adv_tuck', 'planche_tuck', 'planche_lean', 'frog_stand', 'lsit', 'lsit_one_leg', 'lsit_tuck', 'lsit_foot', 'burpee'],
};
export function caliBlocked(profile) {
  const s = new Set();
  for (const inj of profile.injuries || []) for (const id of CALI_INJ[inj] || []) s.add(id);
  return s;
}

// n אימוני קליסתניקס לשבוע (1–6), בלי מספרי ימים — משמש גם את המסלול המשולב
export function buildCaliSessions(profile, n, { blockIndex = 0, weekInBlock = 0 } = {}) {
  const sessions = SPLITS[Math.min(6, Math.max(1, n))].map((tid, i) => buildCaliWorkout(tid, profile, { blockIndex, weekInBlock, dayIdx: i }));
  // שמות ייחודיים כשאותה תבנית חוזרת בשבוע
  const count = {};
  for (const s of sessions) count[s.name] = (count[s.name] || 0) + 1;
  const seen = {};
  for (const s of sessions) if (count[s.name] > 1) { seen[s.name] = (seen[s.name] || 0) + 1; s.name = `${s.name} ${'ABC'[seen[s.name] - 1]}`; }
  return sessions;
}
export function buildCaliWeek(profile, { blockIndex = 0, weekInBlock = 0 } = {}) {
  const days = Math.min(6, Math.max(3, profile.days || 3));
  const sessions = buildCaliSessions(profile, days, { blockIndex, weekInBlock }).map((w, i) => ({ day: i + 1, ...w }));
  return { blockIndex, weekInBlock, phase: CALI_PHASE, week: CALI_WEEKS[weekInBlock % 4], sessions };
}
// מסלול משולב: כמה מאימוני השבוע הם קליסתניקס (ברירת מחדל: חצי, מעוגל למטה; תמיד נשאר לפחות אימון אחד מכל סוג)
// כשמשולבים גם אימוני מוביליטי (profile.mobN), החלוקה היא של האימונים שנשארו
export const mixCaliCount = (profile) => {
  const all = Math.min(6, Math.max(3, profile.days || 4));
  const mobN = profile.mob ? Math.max(0, Math.min(profile.mobN || 0, all - 2)) : 0;
  const days = all - mobN;
  return Math.min(days - 1, Math.max(1, profile.mixCali ?? Math.floor(days / 2)));
};
// אימון בלי שום ציוד (בשטח, בנסיעה) — אותם סולמות, רק מה שאפשר על הרצפה
export const buildCaliFieldWorkout = (profile) => ({ ...buildCaliWorkout('cFull', profile, { equip: [], minutes: Math.min(45, profile.sessionMin || 45) }), name: 'No-equipment workout', focus: 'Your ladders — floor and wall only' });

export const CALI_PHASE = { id: 'cali', name: 'Strength & skill', desc: 'Skill at the start of the workout while the body is fresh, then strength and finally core. You progress through ladders — not weights.' };
export const CALI_WEEKS = [
  { name: 'Base week', rpe: 8, volume: 1, load: 1 }, { name: 'Build week', rpe: 8, volume: 1, load: 1 },
  { name: 'Peak week', rpe: 8.5, volume: 1, load: 1 }, { name: 'Deload week', rpe: 6, volume: 0.7, load: 1 },
];

// ───── התקדמות בסולמות אחרי אימון ─────
// exercises: [{ exId, sets: [{reps, rpe, done}], target: [lo, hi], planned, ladder, vol }]
// עלייה: כל הסטים המתוכננים בוצעו, כולם הגיעו ליעד המקסימום, ולא "עד הקצה" בממוצע. במיומנויות — פעמיים ברצף,
// ורק אחרי מינימום ימים בשלב (גידים ורצועות מסתגלים לאט מהשריר: Magnusson & Kjaer 2016).
// ירידה: שני אימונים ברצף שבהם אף סט לא הגיע ליעד המינימום.
export function applyCaliSession(cali, exercises, now = Date.now()) {
  const changes = [];
  for (const e of exercises) {
    const lid = e.ladder;
    if (!lid || e.vol || !LADDERS[lid]) continue;
    const st = rungState(cali, lid);
    if (!st || st.rung.id !== e.exId) continue;
    const [lo, hi] = [st.rung.lo, st.rung.hi];
    const done = e.sets.filter((x) => x.done);
    const planned = e.planned || done.length;
    const avgRpe = done.reduce((t, x) => t + (x.rpe || 8), 0) / (done.length || 1);
    const top = done.length >= planned && done.every((x) => x.reps >= hi) && avgRpe < 9.6;
    const miss = done.length > 0 && done.every((x) => x.reps < lo);
    const L = LADDERS[lid];
    if (top) {
      cali.hits[lid] = (cali.hits[lid] || 0) + 1; cali.fails[lid] = 0;
      const need = L.kind === 'skill' ? 2 : 1;
      const days = (now - new Date(cali.since?.[lid] || now).getTime()) / DAY;
      const gate = L.gateDays || 0;
      if (cali.hits[lid] < need) changes.push({ lid, type: 'almost', exId: e.exId });
      else if (days < gate) changes.push({ lid, type: 'gated', exId: e.exId, daysLeft: Math.ceil(gate - days) });
      else if (st.next) { setRung(cali, lid, st.next.id, now); changes.push({ lid, type: 'up', from: e.exId, to: st.next.id }); }
      else changes.push({ lid, type: 'top', exId: e.exId });
    } else if (miss) {
      cali.fails[lid] = (cali.fails[lid] || 0) + 1; cali.hits[lid] = 0;
      if (cali.fails[lid] >= 2 && st.prev) { setRung(cali, lid, st.prev.id, now); changes.push({ lid, type: 'down', from: e.exId, to: st.prev.id }); }
    } else { cali.hits[lid] = 0; cali.fails[lid] = 0; }
  }
  return changes;
}

export function setRung(cali, lid, exId, now = Date.now()) {
  cali.rungs[lid] = exId;
  (cali.since ||= {})[lid] = new Date(now).toISOString();
  (cali.hits ||= {})[lid] = 0; (cali.fails ||= {})[lid] = 0;
  // מיומנות פעילה שננעלה בעקבות ירידה בסולם הבסיס נשארת ברשימה — היא פשוט לא תיכנס לאימון עד שתיפתח שוב
  return cali;
}

export function toggleSkill(cali, lid) {
  const list = cali.skills || (cali.skills = []);
  const i = list.indexOf(lid);
  if (i >= 0) { list.splice(i, 1); return true; }
  if (!ladderOpen(cali, lid) || list.length >= MAX_ACTIVE_SKILLS) return false;
  list.push(lid);
  return true;
}

export { LADDERS, STRENGTH_LADDERS, SKILL_LADDERS, LADDER_OF };

// ───── המלצת המערכת: איזה מסלול, וכמה אימונים מכל סוג ─────
// לפי מה שהמתאמן סיפר בהיכרות: גישה לחדר כושר (yes / some = לפעמים / no), מטרה, ימים בשבוע ופציעות.
// אלה כללי תכנון של האפליקציה, לא ממצא מחקרי: המחקר מראה ששתי השיטות בונות כוח ושריר (docs/CALISTHENICS.md),
// ולכן ההמלצה נשענת על שיקולים מעשיים — היכן קל יותר להעמיס בהדרגה, מה דורש תרגול תכוף, ומה עוקף פציעה.
// מחזיר { track, mixCali, why: [נימוקים] }. המתאמן תמיד יכול לבחור אחרת.
export function recommendTrack({ gymAccess = 'yes', goal = 'combat', days = 4, injuries = [] } = {}) {
  const n = Math.min(6, Math.max(3, days || 4));
  const why = [];
  let track, share = 0.5; // share = החלק של הקליסתניקס במסלול משולב
  const wrist = injuries.includes('wrist');
  if (gymAccess === 'no') {
    track = 'cali';
    why.push('No regular access to a gym — calisthenics works at home, in the park and anywhere.');
    if (wrist) why.push('Wrist sensitivity: the program will skip exercises that load the wrist, so some ladders will be limited.');
  } else if (wrist) {
    track = 'gym';
    why.push('Wrist sensitivity: most calisthenics exercises load the wrist, and in the gym it\'s easier to work around it.');
  } else if (goal === 'strength' || goal === 'muscle') {
    if (gymAccess === 'some') { track = 'mix'; share = 0.5; why.push('Gym only sometimes: use it for the heavy exercises, and do the rest of the workouts with bodyweight.'); }
    else { track = 'gym'; why.push(goal === 'strength' ? 'Maximal strength: with external weight it\'s simplest to add load gradually and measure progress.' : 'Muscle mass: in the gym it\'s easier to gradually load each muscle group, especially legs.'); }
  } else if (goal === 'skill') {
    track = 'mix'; share = 2 / 3;
    why.push('Skills (handstand, levers, muscle-up) need frequent practice, so most of the week is calisthenics.');
    why.push('One or two weight workouts fill in what\'s hard to load with bodyweight — mainly legs.');
  } else {
    track = 'mix'; share = gymAccess === 'some' ? 2 / 3 : 0.5;
    why.push(goal === 'cut' ? 'Fat loss: mixing weights and bodyweight keeps your strength up and makes it easier to stick with it.' : 'General fitness: weights build strength, and calisthenics adds body control, core and mobility.');
    if (gymAccess === 'some') why.push('Gym only sometimes — so most workouts are bodyweight.');
  }
  if (track !== 'gym' && injuries.includes('shoulder')) why.push('Shoulder sensitivity: skills that load the shoulder will stay locked, and the program will choose alternatives.');
  const mixCali = track === 'mix' ? Math.min(n - 1, Math.max(1, Math.round(n * share))) : 0;
  return { track, mixCali, why };
}
