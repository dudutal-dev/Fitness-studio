// מסלול "מדיטציה בתנועה" עם אור (בקשת בעל המוצר, 24.11.2026; רק ב-MOVA): הליכה מדיטטיבית בחוץ, בקצב רגוע או מהיר.
// נוסף לשבוע כתחום נוסף (profile.extras.med), נבחר כמסלול ראשי, או מתחיל מיד מהכרטיס שבמסך הבית. רץ במסך ההליכה החי (views/run.js) עם run.med = מזהה המסע:
// בלי הכוונת קצב ובלי ספירה; אור מדברת בפתיחת כל מקטע (js/data/med-lines.js), והמוזיקה מתחלפת בין רגועה לקצבית לפי המקטע.
// תמיד שישה מקטעים: פתיחה · ארבעה חלקים · סיום — כך שלכל מסע יש שישה קטעי דיבור.
// לכל מסע מבנה משלו (25.11.2026): סוג ההליכה בכל חלק, האורך היחסי של כל חלק, ואורך הפתיחה והסיום — לפי מה שהמסע מבקש מהגוף:
//   שחרור — גל של מאמץ: מגבירים כדי לפרוק, ואז מרפים · ריפוי — הכי עדין, עם פתיחה וסיום ארוכים · חיבור — קצב יציב, ולב ההליכה מעט מהיר יותר
//   בוקר — מתעוררים לאט, והקצב עולה לקראת הסוף
//   איפוס — קצבי (ספירת צעדים ונשימה בצעדים), ומסתיים בשקט · הודיה — נבנה בהדרגה, והסוף קל ומהיר · נוכחות — הליכה איטית מאוד, כמעט בלי שינוי קצב
import { MED_JOURNEYS, MED_ORDER, MED_POINTS } from '../data/med-lines.js';

export const MED_MINUTES = [20, 30, 45];
export const MED_PACES = { calm: 'רגועה', fast: 'מהירה' };
// בהליכה מהירה יש בכל מסע לפחות שני חלקים מהירים, שהם לפחות שליש מההליכה (בקשת בעל המוצר, 25.11.2026).
// s = stroll (הליכה רגועה) · b = brisk (הליכה מהירה) · p = power (הליכה נמרצת). w: האורך היחסי של כל חלק. edge: החלק של הפתיחה ושל הסיום מכלל ההליכה
const SHAPES = {
  morning: { calm: 'ssbb', fast: 'sbbp', w: [0.9, 1, 1, 1.1], edge: [0.12, 0.1] },   // בוקר: מתעוררים בהדרגה, והסוף ערני
  release: { calm: 'sbbs', fast: 'bbps', w: [1, 1.1, 1.1, 0.8], edge: [0.12, 0.12] },
  heal: { calm: 'ssss', fast: 'sbbs', w: [1, 1.1, 1, 0.9], edge: [0.15, 0.17] },
  connect: { calm: 'ssbs', fast: 'sbbs', w: [1, 1, 1.1, 0.9], edge: [0.13, 0.13] },
  reset: { calm: 'ssbs', fast: 'bsbs', w: [1, 1, 1.1, 0.9], edge: [0.11, 0.13] },
  thanks: { calm: 'sssb', fast: 'sbsb', w: [0.9, 1, 1, 1.1], edge: [0.12, 0.12] },
  presence: { calm: 'ssss', fast: 'sbsb', w: [1, 1, 1, 1], edge: [0.14, 0.14] },
};
const KIND = { s: 'stroll', b: 'brisk', p: 'power' }, KIND_NAME = { stroll: 'הליכה רגועה', brisk: 'הליכה מהירה', power: 'הליכה נמרצת' };
const seg = (kind, sec, label, point) => ({ kind, sec, label, ...(point ? { point } : {}) });
const round15 = (sec) => Math.max(60, Math.round(sec / 15) * 15);

// סוגי ההליכה בארבעת החלקים של מסע, בקצב שנבחר
export const medShape = (journey, pace = 'calm') => [...(SHAPES[journey] || SHAPES.release)[pace === 'fast' ? 'fast' : 'calm']].map((c) => KIND[c]);
// רמת המאמץ של ההליכה: 1 עדינה · 2 בינונית · 3 נמרצת — לפי החלק של ההליכה המהירה והנמרצת
export function medEffort(journey, pace = 'calm') {
  const sh = SHAPES[journey] || SHAPES.release, k = medShape(journey, pace), tot = sh.w.reduce((a, b) => a + b, 0);
  const load = k.reduce((a, x, i) => a + (x === 'power' ? 1.5 : x === 'brisk' ? 1 : 0) * sh.w[i], 0) / tot;
  return load >= 0.6 ? 3 : load >= 0.2 ? 2 : 1;
}
export const MED_EFFORT = ['', 'עדינה', 'בינונית', 'נמרצת'];

// הליכה אחת. pace: calm / fast — בוחר את מבנה המסע; minutes: האורך הכולל
export function buildMedSession(journey = 'release', { minutes = 30, pace = 'calm' } = {}) {
  const j = MED_JOURNEYS[journey] ? journey : 'release', mins = MED_MINUTES.includes(minutes) ? minutes : 30, pc = pace === 'fast' ? 'fast' : 'calm';
  const sh = SHAPES[j], kinds = medShape(j, pc), total = mins * 60;
  const warm = round15(total * sh.edge[0]), cool = round15(total * sh.edge[1]), main = total - warm - cool, wsum = sh.w.reduce((a, b) => a + b, 0);
  const parts = sh.w.map((w) => round15((main * w) / wsum)); parts[3] += main - parts.reduce((a, b) => a + b, 0);   // העיגול נסגר בחלק האחרון
  const segs = [seg('warm', warm, 'פתיחה בהליכה איטית', 'פתיחה'),
    ...kinds.map((k, i) => seg(k, parts[i], `${MED_POINTS[j][i]} · ${KIND_NAME[k]}`, MED_POINTS[j][i])),
    seg('cool', cool, 'סיום בהליכה איטית', 'סיום')];
  return { type: 'med', walk: true, med: j, medPace: pc, effort: medEffort(j, pc), name: `הליכה מדיטטיבית · ${MED_JOURNEYS[j].name}`, icon: MED_JOURNEYS[j].icon, segs, totalSec: segs.reduce((t, s) => t + s.sec, 0), pace: {}, lvl: 0 };
}
// המסע של השבוע: מתחלף כל שבוע, לפי הסדר
export const weekJourney = (weekIdx = 0) => MED_ORDER[((weekIdx % MED_ORDER.length) + MED_ORDER.length) % MED_ORDER.length];
// n הליכות מדיטטיביות לשבוע: המסע של השבוע; כשיש יותר מאחת — הבאות במסעות הבאים, כך שבשבוע יש גיוון
export function buildMedSessions(profile, n, { blockIndex = 0, weekInBlock = 0 } = {}) {
  const w = blockIndex * 4 + weekInBlock, minutes = profile?.medMin || 30, pace = profile?.medPace || 'calm';
  return Array.from({ length: Math.max(1, n) }, (_, i) => {
    const run = buildMedSession(weekJourney(w + i), { minutes, pace });
    return { name: run.name, focus: MED_JOURNEYS[run.med].desc, track: 'med', runOnly: true, minutes: Math.round(run.totalSec / 60), items: [], warmup: [], cooldown: [], run };
  });
}

// מדיטציה בתנועה כמסלול ראשי: 2–6 הליכות בשבוע; המסע של השבוע ואחריו הבאים בתור. בלי רמות — הקצב והאורך נבחרים (profile.medPace / medMin)
export const MED_PHASE = { id: 'med', name: 'מדיטציה בתנועה', desc: 'הליכות מדיטטיביות עם אור. בכל שבוע מסע אחר פותח את השבוע: שחרור, ריפוי, חיבור, איפוס, הודיה ונוכחות.' };
export const MED_WEEKS = [{ name: 'שבוע ראשון', rpe: 3, volume: 1, load: 1 }, { name: 'שבוע שני', rpe: 3, volume: 1, load: 1 }, { name: 'שבוע שלישי', rpe: 3, volume: 1, load: 1 }, { name: 'שבוע רביעי', rpe: 3, volume: 1, load: 1 }];
export function buildMedWeek(profile, { blockIndex = 0, weekInBlock = 0, days = null } = {}) {
  const n = days ?? Math.min(6, Math.max(2, profile.days || 3));
  const sessions = buildMedSessions(profile, n, { blockIndex, weekInBlock }).map((x, i) => ({ day: i + 1, ...x }));
  return { blockIndex, weekInBlock, phase: MED_PHASE, week: MED_WEEKS[weekInBlock % 4], sessions };
}
