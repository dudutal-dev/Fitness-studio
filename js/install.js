// הוראות התקנה למסך הבית, לפי המכשיר והדפדפן שבהם האפליקציה פתוחה עכשיו.
// באייפון הכפתור תלוי בדפדפן: בספארי כפתור השיתוף למטה (באייפד למעלה), ב-Chrome הוא בקצה שורת הכתובת למעלה.
const ua = () => (typeof navigator === 'undefined' ? '' : navigator.userAgent);
const ios = () => /iPad|iPhone|iPod/.test(ua()) || (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// ios-safari | ios-chrome | ios-other (פיירפוקס, אדג׳ ודומיהם) | android | desktop
export function platform() {
  const u = ua();
  if (ios()) return /CriOS/.test(u) ? 'ios-chrome' : /FxiOS|EdgiOS|OPiOS|DuckDuckGo/.test(u) ? 'ios-other' : 'ios-safari';
  return /Android/.test(u) ? 'android' : 'desktop';
}

const SHARE = 'ריבוע עם חץ כלפי מעלה';
const STEPS = {
  'ios-safari': [['לוחצים על כפתור השיתוף', `${SHARE} — בתחתית המסך (באייפד: למעלה)`], ['בוחרים "הוסף למסך הבית"', 'אם לא רואים — גוללים למטה ברשימה'], ['מאשרים "הוסף"', 'ונכנסים מהאייקון החדש']],
  'ios-chrome': [['לוחצים על כפתור השיתוף', `${SHARE} — למעלה, בקצה שורת הכתובת`], ['בוחרים "הוסף למסך הבית"', 'אם לא רואים — גוללים למטה ברשימה'], ['מאשרים "הוסף"', 'ונכנסים מהאייקון החדש']],
  'ios-other': [['פותחים את תפריט הדפדפן', 'ולוחצים "שיתוף"'], ['בוחרים "הוסף למסך הבית"', 'אם האפשרות חסרה — פותחים את אותה כתובת בספארי או ב-Chrome'], ['מאשרים "הוסף"', 'ונכנסים מהאייקון החדש']],
  android: [['פותחים את התפריט ⋮', 'שלוש נקודות, בפינה העליונה של Chrome'], ['בוחרים "הוספה למסך הבית" או "התקנת האפליקציה"', 'ב-Samsung Internet: תפריט ☰ למטה ← "הוספת דף אל" ← "מסך הבית"'], ['מאשרים "התקנה"', 'ונכנסים מהאייקון החדש']],
  desktop: [['לוחצים על סמל ההתקנה', 'בקצה שורת הכתובת של Chrome או Edge'], ['מאשרים "התקנה"', 'האפליקציה נפתחת בחלון משלה']],
};
const NAMES = { 'ios-safari': 'אייפון · ספארי', 'ios-chrome': 'אייפון · Chrome', 'ios-other': 'אייפון', android: 'אנדרואיד', desktop: 'מחשב' };

export const installSteps = (p = platform()) => STEPS[p];
export const platformName = (p = platform()) => NAMES[p];
// שורה אחת למכשיר אחר מזה שמחזיקים עכשיו (למשל כדי להסביר לחבר)
export const installOneLine = (p) => ({
  'ios-safari': 'באייפון בספארי: כפתור השיתוף למטה ← "הוסף למסך הבית".',
  'ios-chrome': 'באייפון ב-Chrome: כפתור השיתוף למעלה, בקצה שורת הכתובת ← "הוסף למסך הבית".',
  android: 'באנדרואיד (Chrome): תפריט ⋮ למעלה ← "התקנת האפליקציה" או "הוספה למסך הבית".',
}[p] || '');
