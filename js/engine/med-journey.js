// המסלול המדיטטיבי כמסע רוחני בשלבים (בקשת בעל המוצר, 25.11.2026; רק ב-MOVA). כשמדיטציה בתנועה היא המסלול הראשי,
// התוכנית אינה רק סבב של הליכות: היא מסע של 4 / 8 / 12 שבועות בארבעה שלבים — הגעה, שחרור, העמקה, שילוב — שבונה גם כושר הליכה.
// הפרמטרים שבוחרים (profile.medJ): path — הדרך הרוחנית · weeks — אורך המסע · level — כושר ההליכה בנקודת הפתיחה (1–3) · time — מתי הולכים.
// לצדם: profile.days (ימים בשבוע) ו-profile.medMin (אורך הליכה רגילה). השבוע במסע = blockIndex * 4 + weekInBlock (התוכנית נבנית מחדש כשמתחילים מסע).
// ההתקדמות בכושר: החלק של ההליכות המהירות גדל משלב לשלב (ולפי הרמה); ההליכה הארוכה של השבוע מתארכת בחמש דקות בכל שבוע (עד 20);
// השבוע האחרון של כל שלב קל יותר (כשהשלב ארוך משבוע): בלי הליכה ארוכה, ופחות הליכות מהירות.
import { MED_JOURNEYS } from '../data/med-lines.js';
import { buildMedSession } from './meditation.js';

export const MJ_PATHS = {
  quiet: { name: 'שקט פנימי', desc: 'להשקיט את הראש, ולחזור אל הרגע הזה', art: 'presence', stages: [['presence', 'reset'], ['release', 'reset'], ['presence', 'heal'], ['thanks', 'presence']] },
  heal: { name: 'ריפוי והתחדשות', desc: 'להניח את מה שכבד, ולתת לגוף ולנפש להתחדש', art: 'heal', stages: [['heal', 'presence'], ['release', 'heal'], ['heal', 'connect'], ['thanks', 'joy']] },
  connect: { name: 'חיבור ומשמעות', desc: 'להתחבר לסביבה, לאנשים, ולמה שחשוב באמת', art: 'connect', stages: [['presence', 'connect'], ['release', 'thanks'], ['connect', 'thanks'], ['joy', 'connect']] },
  full: { name: 'המסע המלא', desc: 'כל המסעות, שלב אחרי שלב', art: 'thanks', stages: [['presence', 'reset'], ['release', 'heal'], ['connect', 'thanks'], ['energy', 'joy', 'thanks']] },
};
export const MJ_STAGES = [
  { id: 'arrive', name: 'הגעה', desc: 'מגיעים. לומדים ללכת לאט, לנשום, ולשים לב.' },
  { id: 'release', name: 'שחרור', desc: 'מניחים את מה שכבד, והגוף מתחיל לזוז יותר.' },
  { id: 'deepen', name: 'העמקה', desc: 'הולכים פנימה. ההליכות מתארכות, והקצב עולה.' },
  { id: 'integrate', name: 'שילוב', desc: 'מחברים את מה שנמצא אל החיים עצמם, וסוגרים את המסע.' },
];
export const MJ_WEEKS = [4, 8, 12];
export const MJ_LEVELS = { 1: 'בתחילת הדרך', 2: 'הליכה קבועה', 3: 'כושר הליכה טוב' };
export const MJ_TIMES = { morning: 'בבוקר', day: 'במהלך היום', evening: 'בערב' };
export const MJ_DEFAULT = { path: 'full', weeks: 8, level: 1, time: 'day' };

export const mjOf = (profile) => (profile?.track === 'med' && profile.medJ && MJ_PATHS[profile.medJ.path] ? { ...MJ_DEFAULT, ...profile.medJ } : null);
// איפה נמצאים במסע בשבוע w (מתחיל ב-0): השלב, השבוע בתוך השלב, האם זה שבוע קל, והאם המסע הושלם
export function mjAt(mj, w = 0) {
  const weeks = MJ_WEEKS.includes(mj.weeks) ? mj.weeks : 8, per = weeks / 4, done = w >= weeks, ww = Math.min(Math.max(0, w), weeks - 1);
  const stage = Math.floor(ww / per), inStage = ww - stage * per;
  return { weeks, per, week: ww, stage, inStage, light: !done && per >= 2 && inStage === per - 1, done };
}
// כמה שבועות "בונים" היו עד השבוע הזה (בלי השבועות הקלים) — לפיהם מתארכת ההליכה הארוכה
const buildWeeks = (mj, w) => { let n = 0; for (let i = 0; i < w; i++) if (!mjAt(mj, i).light) n++; return n; };
const FAST_SHARE = [0, 0.34, 0.5, 0.5], FAST_ORDER = [1, 3, 5, 2, 4, 0];

// התוכנית של שבוע במסע: לכל הליכה — המסע שלה, האורך, והקצב
export function mjWeekPlan(mj, w, n, baseMin = 30) {
  const at = mjAt(mj, w), pool = MJ_PATHS[mj.path].stages[at.stage], level = Math.min(3, Math.max(1, mj.level || 1));
  const share = Math.max(0, FAST_SHARE[at.stage] + (level - 1) * 0.17 - (at.light ? 0.34 : 0));
  const fastN = Math.min(n - 1, Math.round(n * share)), fast = new Set(FAST_ORDER.filter((i) => i < n).slice(0, Math.max(0, fastN)));
  const add = at.light ? 0 : Math.min(20, 5 * buildWeeks(mj, at.done ? at.weeks : w));
  return Array.from({ length: n }, (_, i) => {
    // מי שהולך בבוקר פותח את השבוע במסע הבוקר (כשיש לפחות שלוש הליכות)
    const journey = mj.time === 'morning' && i === 0 && n >= 3 ? 'morning' : pool[(i + at.inStage) % pool.length];
    const long = n >= 2 && i === n - 1 && add > 0;
    return { journey, pace: fast.has(i) ? 'fast' : 'calm', minutes: Math.min(65, baseMin + (long ? add : 0)), long };
  });
}
export function buildMjWeek(profile, { blockIndex = 0, weekInBlock = 0, days = null } = {}) {
  const mj = mjOf(profile), w = blockIndex * 4 + weekInBlock, at = mjAt(mj, w), n = days ?? Math.min(6, Math.max(2, profile.days || 3)), st = MJ_STAGES[at.stage];
  const sessions = mjWeekPlan(mj, w, n, profile.medMin || 30).map((x, i) => {
    const run = buildMedSession(x.journey, { minutes: x.minutes, pace: x.pace, anyLength: true });
    return { day: i + 1, name: run.name, focus: `${MED_JOURNEYS[run.med].desc}${x.long ? ' · ההליכה הארוכה של השבוע' : ''}`, track: 'med', runOnly: true, minutes: Math.round(run.totalSec / 60), items: [], warmup: [], cooldown: [], run, ...(x.long ? { long: true } : {}) };
  });
  return { blockIndex, weekInBlock, mj: { ...at, path: mj.path },
    phase: { id: 'med', name: `${MJ_PATHS[mj.path].name} · ${st.name}`, desc: at.done ? 'המסע הושלם. ממשיכים ללכת באותו קצב, עד שבוחרים מסע חדש.' : st.desc },
    week: { name: at.done ? 'אחרי המסע' : `שבוע ${at.week + 1} מתוך ${at.weeks}${at.light ? ' · שבוע קל' : ''}`, rpe: at.light ? 2 : 3, volume: 1, load: 1 }, sessions };
}

// מה קרה כשהשבוע w הושלם: שלב שהסתיים, המסע כולו, או כלום (25.11.2026 — סיכום ומשפט של אור בסוף כל שלב ובסוף המסע)
export function mjStep(mj, w) {
  const a = mjAt(mj, w), b = mjAt(mj, w + 1);
  if (a.done) return null;
  if (b.done) return { kind: 'journey', stage: 3 };
  return b.stage > a.stage ? { kind: 'stage', stage: a.stage } : null;
}
// מה נעשה מאז תאריך: הליכות מדיטטיביות, דקות וקילומטרים — לסיכום שלב ולסיכום המסע
export function mjStats(runs, since) {
  const t0 = since ? new Date(since).getTime() : 0, list = (runs || []).filter((r) => r.med && new Date(r.date).getTime() > t0);
  return { walks: list.length, minutes: Math.round(list.reduce((a, r) => a + (r.durationSec || 0), 0) / 60), km: Math.round(list.reduce((a, r) => a + (r.distanceKm || 0), 0) * 10) / 10 };
}
export const MJ_STAGE_LINES = ['med_j_s1', 'med_j_s2', 'med_j_s3'];
