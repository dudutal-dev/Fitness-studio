// הורדה מראש של התמונות וסרטוני ההדגמה של המאמנים של המתאמן — ברקע, אחרי שהאפליקציה עלתה — כדי שהאימון יעבוד מיד
// ובלי קליטה (חדר כושר במרתף, שטח), ולא רק אחרי שכל תרגיל נצפה פעם אחת. הקבצים נשמרים במטמון המדיה של ה-service worker;
// הסרטונים מוגשים ממנו גם לבקשות טווח (ראו sw.js). הסדר: קודם כל התמונות (קטנות), אחר כך הסרטונים — תרגילי השבוע תחילה.
// רשימת הקבצים לכל מאמן נוצרת בכל שחרור (tools/media_list.mjs ← js/data/media-list.js).
import { DEMO_FILES } from './data/media-list.js';
import { demoVideo, demoPoster } from './data/coaches.js';

const abs = (u) => new URL(u, location.href).href;
const cached = async (u) => { try { return !!(await caches.match(abs(u))); } catch { return false; } };

// מה צריך לשמור לפי התוכנית: המאמנים של אימוני השבוע, ותרגילי השבוע (שיורדים ראשונים). coachOf: המאמן של אימון
export function planMedia(s, coachOf = () => null) {
  const p = s?.profile; if (!p) return { coaches: [], first: [] };
  const ses = s.plan?.week?.sessions || [];
  const coaches = [...new Set([p.coach, ...ses.map((x) => coachOf(p, x))].filter((c) => c && DEMO_FILES[c]))];
  return { coaches, first: [...new Set(ses.flatMap((x) => (x.items || []).map((i) => i.exId)))] };
}
export function mediaFiles({ coaches, first = [] }) {
  const ids = (c) => { const all = DEMO_FILES[c] || [], f = first.filter((i) => all.includes(i)); return [...f, ...all.filter((i) => !f.includes(i))]; };
  return [...coaches.flatMap((c) => ids(c).map((i) => demoPoster(c, i))), ...coaches.flatMap((c) => ids(c).map((i) => demoVideo(c, i)))];
}
export async function mediaStatus(plan) {
  const files = mediaFiles(plan), hits = await Promise.all(files.map(cached));
  return { have: hits.filter(Boolean).length, total: files.length };
}
let running = null;
export function downloadMedia(plan, onProgress) {
  if (running) return running;
  const files = mediaFiles(plan);
  running = (async () => {
    let done = 0, failed = 0, streak = 0;
    for (const f of files) {
      if (!(await cached(f))) {
        try { const r = await fetch(f); if (!r.ok) throw new Error('bad'); await r.arrayBuffer(); streak = 0; } catch { failed++; streak++; }
      }
      done++; onProgress?.(done, files.length);
      if (streak >= 4 || navigator.onLine === false) break;   // אין רשת — לא ממשיכים לנסות; ימשיך בפתיחה הבאה
    }
    return { total: files.length, failed: failed + (files.length - done) };
  })().finally(() => { running = null; });
  return running;
}
let warmed = '';
export async function warmMedia(plan) {
  if (!plan.coaches.length || navigator.onLine === false || navigator.connection?.saveData) return;   // "חיסכון בנתונים" בטלפון — לא מורידים מראש
  const key = plan.coaches.join() + '|' + plan.first.length;
  if (warmed === key) return;
  warmed = key;
  await downloadMedia(plan);
}

// איורי המדיטציה (הכרטיסים והמסכים) והתמונה של אור — קבצים קטנים שיורדים מראש, כדי שהחלונית תיפתח עם האיורים מיד וגם בלי רשת
export async function warmMedArt(ids = []) {
  const files = ['assets/coaches/or_face.webp', ...ids.map((i) => `assets/med/${i}_sq.webp`), ...ids.map((i) => `assets/med/${i}.webp`)];
  for (const f of files) { if (await cached(f)) continue; try { const r = await fetch(f); if (r.ok) await r.arrayBuffer(); } catch { break; } }
}
