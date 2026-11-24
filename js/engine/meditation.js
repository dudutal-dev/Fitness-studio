// מסלול "מדיטציה בתנועה" עם אור (בקשת בעל המוצר, 24.11.2026; רק ב-MOVA): הליכה מדיטטיבית בחוץ, בקצב רגוע או מהיר.
// נוסף לשבוע כתחום נוסף (profile.extras.med) או מתחיל מיד מהכרטיס שבמסך הבית. רץ במסך ההליכה החי (views/run.js) עם run.med = מזהה המסע:
// בלי הכוונת קצב ובלי ספירה; אור מדברת בפתיחת כל מקטע (js/data/med-lines.js), והמוזיקה מתחלפת בין רגועה לקצבית לפי המקטע.
// תמיד שישה מקטעים: חימום · ארבעה חלקי הליכה · סיום רגוע — כך שלכל מסע יש שישה קטעי דיבור.
import { MED_JOURNEYS, MED_ORDER } from '../data/med-lines.js';

export const MED_MINUTES = [20, 30, 45];
export const MED_PACES = { calm: 'רגועה', fast: 'מהירה' };
const seg = (kind, sec, label) => ({ kind, sec, label });

// הליכה אחת. pace: calm — כל ההליכה בקצב נינוח · fast — החלק השני והרביעי בהליכה מהירה
export function buildMedSession(journey = 'release', { minutes = 30, pace = 'calm' } = {}) {
  const j = MED_JOURNEYS[journey] ? journey : 'release', mins = MED_MINUTES.includes(minutes) ? minutes : 30;
  const warm = mins <= 20 ? 180 : 240, cool = mins <= 20 ? 180 : 240, part = Math.round((mins * 60 - warm - cool) / 4);
  const kinds = pace === 'fast' ? ['stroll', 'brisk', 'stroll', 'brisk'] : ['stroll', 'stroll', 'stroll', 'stroll'];
  const segs = [seg('warm', warm, 'פתיחה בהליכה איטית'), ...kinds.map((k, i) => seg(k, part, k === 'brisk' ? `חלק ${i + 1} · הליכה מהירה` : `חלק ${i + 1} · הליכה רגועה`)), seg('cool', cool, 'סיום בהליכה איטית')];
  return { type: 'med', walk: true, med: j, medPace: pace === 'fast' ? 'fast' : 'calm', name: `הליכה מדיטטיבית · ${MED_JOURNEYS[j].name}`, icon: MED_JOURNEYS[j].icon, segs, totalSec: segs.reduce((t, s) => t + s.sec, 0), pace: {}, lvl: 0 };
}
// המסע של השבוע: מתחלף כל שבוע, לפי הסדר
export const weekJourney = (weekIdx = 0) => MED_ORDER[((weekIdx % MED_ORDER.length) + MED_ORDER.length) % MED_ORDER.length];
// n הליכות מדיטטיביות לשבוע (כתחום נוסף): המסע של השבוע; כשיש יותר מאחת — השנייה במסע הבא
export function buildMedSessions(profile, n, { blockIndex = 0, weekInBlock = 0 } = {}) {
  const w = blockIndex * 4 + weekInBlock, minutes = profile?.medMin || 30, pace = profile?.medPace || 'calm';
  return Array.from({ length: Math.max(1, n) }, (_, i) => {
    const run = buildMedSession(weekJourney(w + i), { minutes, pace });
    return { name: run.name, focus: MED_JOURNEYS[run.med].desc, track: 'med', runOnly: true, minutes: Math.round(run.totalSec / 60), items: [], warmup: [], cooldown: [], run };
  });
}
