// מנוע מסלול המוביליטי והגמישות (תמר): מבחן טווחים → אזורי עדיפות, ובניית אימון לפי הזמן שיש.
// מצב המתאמן נשמר ב-profile.mob: { test: { מבחן: 0–3 }, tests: [{ date, test }], flags: [], minutes }
// profile.track === 'mob' = מסלול מוביליטי בלבד. profile.mobN > 0 = אימוני מוביליטי משולבים בשבוע של מסלול אחר.
import { EX, EXERCISES } from '../data/exercises.js';
import { REGIONS, STRETCH_REGION, TESTS, TEST_IDS, MAX_SCORE, FLAG_BLOCK, MOB_INJ, THEMES, MOB_SPLITS, MOB_MINUTES } from '../data/mob.js';

export const isMob = (profile) => profile?.track === 'mob';
// כמה מאימוני השבוע הם מוביליטי כשהמסלול הוא אחר (חדר כושר / קליסתניקס / משולב). תמיד נשאר לפחות אימון אחד לכל חלק אחר.
export function mobCount(profile) {
  if (!profile || isMob(profile) || !profile.mob) return 0;
  const days = Math.min(6, Math.max(3, profile.days || 4));
  return Math.max(0, Math.min(profile.mobN || 0, days - (profile.track === 'mix' ? 2 : 1)));
}
export const hasMob = (profile) => isMob(profile) || mobCount(profile) > 0;
export const regionOf = (exId) => EX[exId]?.region || STRETCH_REGION[exId] || null;

// ───── מבחן ─────
const NEUTRAL = Object.fromEntries(TEST_IDS.map((id) => [id, 1]));
export function newMob(test = null, flags = [], now = new Date().toISOString()) {
  const mob = { test: { ...NEUTRAL, ...(test || {}) }, tests: [], flags: [...flags], minutes: 20 };
  if (test) mob.tests.push({ date: now, test: { ...mob.test } });
  return mob;
}
export function saveMobTest(mob, test, now = new Date().toISOString()) {
  mob.test = { ...NEUTRAL, ...test };
  (mob.tests ||= []).push({ date: now, test: { ...mob.test } });
  return mob;
}
export const mobTested = (mob) => !!mob?.tests?.length;
export const mobScore = (mob, test = mob?.test) => Math.round((TEST_IDS.reduce((t, id) => t + (test?.[id] ?? 1), 0) / MAX_SCORE) * 100);
export const mobLevel = (mob) => Math.min(5, Math.max(1, 1 + Math.round(mobScore(mob) / 25)));
// ציון 0–3 לכל אזור: ממוצע המבחנים שמעידים עליו
export function regionScores(mob) {
  const out = {};
  for (const r of Object.keys(REGIONS)) {
    const ts = TESTS.filter((t) => t.regions.includes(r));
    out[r] = ts.length ? ts.reduce((a, t) => a + (mob?.test?.[t.id] ?? 1), 0) / ts.length : 1.5;
  }
  return out;
}
// האזורים שהכי צריכים עבודה (לתצוגה)
export const weakRegions = (mob, n = 3) => Object.entries(regionScores(mob)).filter(([r]) => r !== 'calm').sort((a, b) => a[1] - b[1]).slice(0, n).map(([r]) => r);
export const retestDue = (mob, now = Date.now()) => !mobTested(mob) || now - new Date(mob.tests[mob.tests.length - 1].date).getTime() > 28 * 864e5;

export function mobBlocked(profile) {
  const s = new Set();
  for (const inj of profile?.injuries || []) for (const id of MOB_INJ[inj] || []) s.add(id);
  for (const f of profile?.mob?.flags || []) for (const id of FLAG_BLOCK[f] || []) s.add(id);
  return s;
}

// ───── בניית אימון ─────
// המבנה: פתיחה בתנועה (דינמי) → החזקות לפי אזורי העדיפות → נשימה. הכללים (docs/MOBILITY.md):
//  • החזקה סטטית של 30 שניות לכל צד; לאזור בעדיפות גבוהה — שני סבבים.
//  • גמישות־יתר: החזקות של 20 שניות, ויותר תנועה מבוקרת.
const POOL = () => EXERCISES.filter((e) => e.tracks.includes('mob'));
const GAP = 8; // שניות מעבר בין תרגיל לתרגיל
const secsFor = (e, hyper) => (e.kind === 'static' ? (e.unilateral ? (hyper ? 40 : 60) : hyper ? 30 : 40) : e.unilateral ? 60 : 40);
const item = (e, hyper, sets = 1) => ({ exId: e.id, role: 'mob', sets, reps: [secsFor(e, hyper), secsFor(e, hyper)], unit: 'sec', rest: GAP, rpe: 3, region: regionOf(e.id) });
const cost = (it) => it.sets * (it.reps[0] + GAP);

export function buildMobWorkout(tid, profile, { minutes = null, dayIdx = 0, blockIndex = 0, weekInBlock = 0 } = {}) {
  const theme = THEMES[tid] || THEMES.mFull;
  const mob = profile.mob || newMob();
  const mins = minutes || mob.minutes || 20;
  const hyper = (mob.flags || []).includes('hyper');
  const blocked = mobBlocked(profile);
  const scores = regionScores(mob);
  const rot = dayIdx + blockIndex * 4 + weekInBlock;
  const ok = (e) => !blocked.has(e.id) && ((e.level || 1) <= 1 || (scores[regionOf(e.id)] ?? 1.5) >= 1.5);
  const pool = POOL().filter(ok);
  const used = new Set();
  const by = (region, kind) => pool.filter((e) => regionOf(e.id) === region && e.kind === kind && !used.has(e.id));
  const take = (list) => { if (!list.length) return null; const e = list[rot % list.length]; used.add(e.id); return e; };
  // סדר האזורים: קודם החלשים במבחן, ובשוויון — לפי סדר הנושא
  const regions = [...theme.regions].sort((a, b) => (scores[a] - scores[b]) || (theme.regions.indexOf(a) - theme.regions.indexOf(b)));
  const budget = mins * 60 - 15;
  const closing = (() => { const e = mins >= 20 && !blocked.has('m_breathing') ? EX.m_breathing : EX.child_pose; used.add(e.id); return { ...item(e, hyper), reps: [mins >= 20 ? 60 : 40, mins >= 20 ? 60 : 40] }; })();
  let left = budget - cost(closing);
  const open = [], main = [];
  // פתיחה בתנועה: 2–4 תרגילים דינמיים מהאזורים של הנושא
  const nOpen = mins <= 10 ? 2 : mins <= 20 ? 3 : 4;
  for (const r of theme.regions) {
    if (open.length >= nOpen) break;
    const e = take(by(r, 'dynamic'));
    if (e && cost(item(e, hyper)) <= left) { const it = item(e, hyper); open.push(it); left -= cost(it); }
  }
  // החזקות: סבב ראשון — אחת לכל אזור; שני סבבים לשני האזורים החלשים. אחר כך ממלאים את הזמן בעוד תרגילים.
  regions.forEach((r, i) => {
    const e = take(by(r, 'static'));
    if (!e) return;
    const it = item(e, hyper, i < 2 && mins >= 20 && !hyper ? 2 : 1);
    if (cost(it) > left) { it.sets = 1; if (cost(it) > left) { used.delete(e.id); return; } }
    main.push(it); left -= cost(it);
  });
  for (let pass = 0; pass < 3 && left > 45; pass++) {
    for (const r of regions) {
      const e = take(by(r, hyper || pass % 2 ? 'dynamic' : 'static')) || take(by(r, 'static')) || take(by(r, 'dynamic'));
      if (!e) continue;
      const it = item(e, hyper);
      if (cost(it) > left) { used.delete(e.id); continue; }
      main.push(it); left -= cost(it);
    }
  }
  // נגמרו התרגילים החדשים לנושא ועוד נשאר זמן (נושא ממוקד באימון ארוך): סבב שני, קודם לאזורים החלשים
  for (const r of regions) for (const it of main) {
    if (it.region !== r || it.sets > 1 || (hyper && EX[it.exId].kind === 'static')) continue;
    const extra = it.reps[0] + GAP;
    if (extra <= left) { it.sets = 2; left -= extra; }
  }
  // סדר נוח: מלמעלה למטה בעמידה ואז על המזרן — כאן פשוט לפי אזור, כדי לא לקפוץ בין חלקי הגוף
  const order = Object.keys(REGIONS);
  main.sort((a, b) => order.indexOf(a.region) - order.indexOf(b.region));
  const items = [...open, ...main, closing];
  const w = { templateId: tid, name: theme.name, focus: theme.focus, phase: 'mob', track: 'mob', minutes: mins, items, warmup: [], cooldown: [] };
  if (hyper) w.note = 'Hypermobility: short holds, without going to end range. The focus is on control.';
  return w;
}

// n אימוני מוביליטי לשבוע, בלי מספרי ימים — משמש גם כשהמוביליטי משולב במסלול אחר
export function buildMobSessions(profile, n, { blockIndex = 0, weekInBlock = 0 } = {}) {
  let split = [...MOB_SPLITS[Math.min(6, Math.max(1, n))]];
  if (profile.goal === 'posture') split = split.map((t, i) => (t === 'mFull' && i === 0 ? 'mSpine' : t === 'mSpine' ? 'mFull' : t));
  const sessions = split.map((tid, i) => buildMobWorkout(tid, profile, { blockIndex, weekInBlock, dayIdx: i }));
  const count = {}, seen = {};
  for (const s of sessions) count[s.name] = (count[s.name] || 0) + 1;
  for (const s of sessions) if (count[s.name] > 1) { seen[s.name] = (seen[s.name] || 0) + 1; s.name = `${s.name} ${'ABC'[seen[s.name] - 1]}`; }
  return sessions;
}
export function buildMobWeek(profile, { blockIndex = 0, weekInBlock = 0 } = {}) {
  const days = Math.min(6, Math.max(3, profile.days || 4));
  const sessions = buildMobSessions(profile, days, { blockIndex, weekInBlock }).map((w, i) => ({ day: i + 1, ...w }));
  return { blockIndex, weekInBlock, phase: MOB_PHASE, week: MOB_WEEKS[weekInBlock % 4], sessions };
}
// אותו אימון באורך אחר (המתאמן בוחר 10 / 20 / 30 דקות לפני שמתחילים)
export const resizeMobWorkout = (workout, profile, minutes, plan = {}) => ({ ...buildMobWorkout(workout.templateId, profile, { minutes, dayIdx: (workout.day || 1) - 1, blockIndex: plan.blockIndex || 0, weekInBlock: plan.weekInBlock || 0 }),
  name: workout.name, ...(workout.day != null ? { day: workout.day } : {}) });
// אימון חופשי לפי אזור או מצב (מחוץ לתוכנית השבועית)
export const QUICK = {
  mSpine: { name: 'After a day of sitting', icon: 'clock' }, mHips: { name: 'Hips & legs', icon: 'bolt' },
  mUpper: { name: 'Shoulders & neck', icon: 'swap' }, mFull: { name: 'Full body', icon: 'sparkle' },
};
export const buildQuickMob = (tid, profile, minutes) => ({ ...buildMobWorkout(tid, profile, { minutes, dayIdx: new Date().getDate() }), name: QUICK[tid]?.name || THEMES[tid].name, field: true });

export const MOB_PHASE = { id: 'mob', name: 'Range of motion', desc: 'Start with slow movement, then relaxed holds in the areas that need it most, and breathing to finish. Progress by the range-of-motion test — not by pain.' };
export const MOB_WEEKS = [
  { name: 'Base week', rpe: 3, volume: 1, load: 1 }, { name: 'Build week', rpe: 3, volume: 1, load: 1 },
  { name: 'Deepening week', rpe: 3, volume: 1, load: 1 }, { name: 'Retest week', rpe: 3, volume: 1, load: 1 },
];

// ───── מעקב: דקות לכל אזור בשבוע האחרון ─────
// היעד: כ-10 דקות בשבוע לכל אזור — מעבר לזה התוספת לטווח התנועה קטנה (Thomas 2018; ראו docs/MOBILITY.md)
export const REGION_TARGET_MIN = 10;
export function regionMinutes(sessions = [], now = Date.now(), days = 7) {
  const out = {};
  for (const s of sessions) {
    if (now - new Date(s.date).getTime() > days * 864e5) continue;
    for (const e of s.exercises || []) {
      if (e.role !== 'mob') continue;
      const r = regionOf(e.exId);
      if (r && r !== 'calm') out[r] = (out[r] || 0) + e.sets.reduce((t, x) => t + (x.reps || 0), 0) / 60;
    }
  }
  return out;
}

export { REGIONS, TESTS, THEMES, MOB_MINUTES };
