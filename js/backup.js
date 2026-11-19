// גיבוי הנתונים לקובץ: באייפון/אנדרואיד נפתח חלון השיתוף (שמירה ב"קבצים"/iCloud/Drive או שליחה לעצמך); במחשב — הורדה.
// הנתונים נשמרים רק במכשיר, ולכן האפליקציה מזכירה לגבות פעם בחודש.
import { get, set, exportData } from './store.js';
import { dayKey } from './engine/stats.js';

const DAY = 864e5;

export async function backupNow() {
  const name = `studio-backup-${dayKey()}.json`;
  const json = exportData();
  let ok = false;
  try {
    const file = new File([json], name, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'גיבוי סטודיו כושר' });
      ok = true;
    }
  } catch (e) {
    if (e?.name === 'AbortError') return false; // המשתמש סגר את חלון השיתוף
  }
  if (!ok) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  set((s) => { s.lastBackupAt = new Date().toISOString(); s.backupSnoozeUntil = null; return s; });
  return true;
}

// האם להציע גיבוי עכשיו: יש מה לאבד (3 אימונים ומעלה), ועבר חודש מהגיבוי האחרון (או שמעולם לא גובה)
export function backupDue(s = get(), now = Date.now()) {
  if (!s.profile) return false;
  if ((s.sessions?.length || 0) + (s.runs?.length || 0) < 3) return false;
  if (s.backupSnoozeUntil && now < new Date(s.backupSnoozeUntil).getTime()) return false;
  return !s.lastBackupAt || now - new Date(s.lastBackupAt).getTime() > 30 * DAY;
}
export function snoozeBackup(days = 7) {
  set((s) => { s.backupSnoozeUntil = new Date(Date.now() + days * DAY).toISOString(); return s; });
}
export const lastBackupText = (s = get()) => (s.lastBackupAt ? `גיבוי אחרון: ${new Date(s.lastBackupAt).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}` : 'עדיין לא בוצע גיבוי');
