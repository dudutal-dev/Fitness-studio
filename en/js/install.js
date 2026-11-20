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

const SHARE = 'a square with an arrow pointing up';
const STEPS = {
  'ios-safari': [['Tap the Share button', `${SHARE} — at the bottom of the screen (on iPad: at the top)`], ['Choose "Add to Home Screen"', 'If you don\'t see it, scroll down the list'], ['Confirm with "Add"', 'and open the app from the new icon']],
  'ios-chrome': [['Tap the Share button', `${SHARE} — at the top, at the end of the address bar`], ['Choose "Add to Home Screen"', 'If you don\'t see it, scroll down the list'], ['Confirm with "Add"', 'and open the app from the new icon']],
  'ios-other': [['Open the browser menu', 'and tap "Share"'], ['Choose "Add to Home Screen"', 'If the option is missing, open the same address in Safari or Chrome'], ['Confirm with "Add"', 'and open the app from the new icon']],
  android: [['Open the ⋮ menu', 'three dots, in the top corner of Chrome'], ['Choose "Add to Home screen" or "Install app"', 'In Samsung Internet: ☰ menu at the bottom → "Add page to" → "Home screen"'], ['Confirm with "Install"', 'and open the app from the new icon']],
  desktop: [['Click the install icon', 'at the end of the address bar in Chrome or Edge'], ['Confirm with "Install"', 'The app opens in its own window']],
};
const NAMES = { 'ios-safari': 'iPhone · Safari', 'ios-chrome': 'iPhone · Chrome', 'ios-other': 'iPhone', android: 'Android', desktop: 'Computer' };

export const installSteps = (p = platform()) => STEPS[p];
export const platformName = (p = platform()) => NAMES[p];
// שורה אחת למכשיר אחר מזה שמחזיקים עכשיו (למשל כדי להסביר לחבר)
export const installOneLine = (p) => ({
  'ios-safari': 'On iPhone in Safari: the Share button at the bottom → "Add to Home Screen".',
  'ios-chrome': 'On iPhone in Chrome: the Share button at the top, at the end of the address bar → "Add to Home Screen".',
  android: 'On Android (Chrome): the ⋮ menu at the top → "Install app" or "Add to Home screen".',
}[p] || '');
