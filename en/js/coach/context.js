// משפטים בהקשר (בקשת בעל המוצר, 21.11.2026; רק ב-MOVA): המאמן מגיב למה שבאמת קרה — אימון ראשון, חזרה אחרי הפסקה,
// אימון מוקדם או מאוחר, סט שדורג קל או מקסימום, חצי אימון, תרגיל אחרון, סגירת שבוע, אימון עשירי — במקום משפט כללי באקראי.
// הכללים, כדי שזה לא יישמע מלאכותי:
//   · משפט נאמר רק כשהתנאי שלו נכון (לפי הנתונים שבטלפון), ולכל היותר אחד בפתיחה ואחד בסיום.
//   · אותו משפט לא חוזר פעמיים בתוך שבועיים (state.ctxSaid), וגם לא פעמיים באותו אימון.
//   · רק משפט שהמאמן הזה מקליט (coachSays) — למשל "קל מדי? בסט הבא מוסיפים" לא נאמר בשיעור יוגה.
// הטקסטים: js/data/voice-lines.js (ctx_*). הכול ניטרלי למין המתאמן, ולכן אין גרסאות נקבה.
import { get, set } from '../store.js';
import { coachSays } from '../data/voice-lines.js';
import { startContexts, endContexts } from '../engine/context-rules.js';

const DAY = 864e5, GAP = 14 * DAY;
const fresh = (key, now) => now - (get().ctxSaid?.[key] || 0) > GAP;
// מחזיר את המפתח אם מותר לומר אותו עכשיו (ומסמן שנאמר), אחרת null
function take(key, coach, now = Date.now()) {
  if (!key || !coachSays(key, coach) || !fresh(key, now)) return null;
  set((s) => { (s.ctxSaid ||= {})[key] = now; return s; });
  return key;
}
const firstOf = (keys, coach, now) => { for (const k of keys) { const t = take(k, coach, now); if (t) return t; } return null; };

export const ctxStart = (coach) => firstOf(startContexts(get()), coach);
export const ctxEnd = (coach, info) => firstOf(endContexts(get(), info), coach);
// באמצע האימון: easy / max (דירוג סט) · half (חצי אימון) · last_ex (תרגיל אחרון) · resume (חזרה מהשהיה) · swap (החלפת תרגיל)
export const ctxMid = (kind, coach) => take(`ctx_${kind}`, coach);
