// המשקלים שהמאמנים אומרים בקול באימון חדר כושר (בקשת בעל המוצר, 23.11.2026; MOVA וחוד — אורי ונועה).
// לכל ערך ברשימה יש הקלטה: assets/voice/<מאמן>/kg/<ערך>.mp3 (למשל kg/40.mp3, kg/42_5.mp3). ערך שאינו ברשימה לא נאמר — רק מוצג.
// הרשימה: חצאים עד 30 ק״ג (משקולות יד), כל מספר שלם עד 120, קפיצות של 2.5 עד 200 (מוט וצלחות), וקפיצות של 5 עד 250.
const build = () => {
  const s = new Set();
  for (let v = 1; v <= 60; v++) s.add(v / 2);
  for (let v = 21; v <= 120; v++) s.add(v);
  for (let v = 22.5; v <= 200; v += 2.5) s.add(v);
  for (let v = 125; v <= 250; v += 5) s.add(v);
  return [...s].sort((a, b) => a - b);
};
export const WEIGHT_VALUES = build();
const HAS = new Set(WEIGHT_VALUES);
export const WEIGHT_COACHES = ['ori', 'noa'];
export const weightFile = (w) => String(w).replace('.', '_');
// מפתח ההקלטה למשקל, או null כשאין (משקל חריג, או מאמן שלא מקליט משקלים)
export const weightClip = (w, coach) => (HAS.has(Number(w)) && WEIGHT_COACHES.includes(coach) ? `kg/${weightFile(Number(w))}` : null);
// מה לומר כשהמשקל של הסט הבא שונה מהקודם: 'w_up' / 'w_down', או null כשאין שינוי (או שאין משקל קודם)
export const weightChange = (w, prev) => (prev > 0 && w > 0 && w !== prev ? (w > prev ? 'w_up' : 'w_down') : null);

// משקל שיא (בקשת בעל המוצר, 23.11.2026): המשקל הכבד ביותר שבוצע עד היום בתרגיל, מתוך ההיסטוריה שבטלפון.
export const topWeight = (history) => Math.max(0, ...(history || []).flatMap((h) => (h.sets || []).filter((x) => x.done && x.reps > 0).map((x) => x.w || 0)));
// סט במשקל גבוה מכל מה שבוצע בתרגיל. בלי היסטוריה (פעם ראשונה בתרגיל) — אין שיא
export const isRecordWeight = (w, history) => { const top = topWeight(history); return top > 0 && w > top; };
