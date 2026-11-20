// שפת הממשק: עברית ואנגלית הן אותה אפליקציה — אותו אחסון, אותה תוכנית, אותו רישיון. האנגלית נבנית מהקוד הזה אל en/
// (tools/i18n.mjs), והמעבר בין השפות הוא מעבר בין שתי הכתובות באותה התקנה. הבחירה נשמרת ב-localStorage (mova.lang),
// ובכל פתיחה העמוד שנפתח בודק אותה ועובר לשפה שנבחרה (הסקריפט הקצר שבראש index.html).
export const LANG = 'en';                                   // בגרסה האנגלית הכלי מחליף ל-'en'
export const OTHER = { code: 'he', label: 'עברית' };      // השפה השנייה: לאן עוברים, ואיך היא נקראת בשפה שלה
const KEY = 'mova.lang';
export function setLang(code) {
  try { localStorage.setItem(KEY, code); } catch { /* מצב פרטי */ }
  if (code !== LANG) location.replace(new URL(LANG === 'he' ? 'en/' : '../', location.origin + location.pathname).href + location.hash);
}
