// קישור הפעלה אישי (?k=…) שמופעל על טלפון אחד, עם תוקף. הקישורים מונפקים באפליקציית הניהול הנפרדת
// (Fitness-studio/admin/) ונבדקים מול השרת (worker/lic.js). באפליקציה עצמה אין שום כניסה לניהול.
// השרת מחליט אם האפליקציה דורשת קישור בכלל ("אכיפה"). כשהאכיפה כבויה — שום דבר כאן לא חוסם.
// בלי אינטרנט: קישור שאושר ב-21 הימים האחרונים ממשיך לעבוד, כדי שאפשר יהיה להתאמן גם בלי קליטה.
// בלי תשובה מהשרת (23.11.2026): אם אין תשובה שנשמרה ב-21 הימים האחרונים — האפליקציה נעולה עד שהשרת עונה. כך טלפון שלא מגיע לשרת
// (חוסם תוכן, סינון, רשת ארגונית) לא מקבל אפליקציה פתוחה בלי קישור. מי שכבר הופעל לא מושפע.
import { APP_ID, APP_IN } from './app-id.js';
import { WORKER, isIOS, isStandalone } from './reminders.js';
import { installSteps } from './install.js';

const K = `${APP_ID}.lic`, KC = `${APP_ID}.licCfg`, KD = `${APP_ID}.dev`, KH = `${APP_ID}.hand`;
const GRACE = 21 * 864e5, RECHECK = 30 * 60e3;   // בדיקה מול השרת בפתיחת האפליקציה, לא יותר מפעם בחצי שעה (כך גם נרשמת הפתיחה ביומן השימוש שבניהול)
const get = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const put = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* מצב פרטי */ } };
const TOKEN = /P\.[a-z0-9]{6,12}\.[A-Za-z0-9_-]{22}/;

let dev = get(KD);
if (!dev) { dev = Math.random().toString(36).slice(2, 10).padEnd(8, 'x') + Date.now().toString(36); put(KD, dev); }
let L = get(K), cfg = get(KC) || { enforce: false }, why = '', gateEl = null, retry = null;
const cfgFresh = () => typeof cfg.t === 'number' && Date.now() - cfg.t < GRACE;   // תשובת השרת האחרונה עדיין בתוקף
const kParam = (() => { const m = TOKEN.exec(new URLSearchParams(location.search).get('k') || ''); return m ? m[0] : ''; })();
const valid = () => !!L && L.exp > Date.now() && Date.now() - (L.t || 0) < GRACE;
// אייפון, בדפדפן, עם קישור הפעלה: מסירים את ה-manifest, כדי ש"הוסף למסך הבית" ישמור את הכתובת הנוכחית — עם הקישור בתוכה.
// כך האפליקציה שבמסך הבית (אחסון נפרד מהדפדפן) נפתחת עם הקישור ומופעלת לבד, בלי תלות ברשת או בשרת.
if (kParam && isIOS() && !isStandalone()) document.querySelector('link[rel="manifest"]')?.remove();
// תיאור המכשיר: זהה בספארי ובאפליקציה שבמסך הבית — כך הקישור עובר ביניהן דרך השרת
const fp = () => [screen.width, screen.height, devicePixelRatio, navigator.language, Intl.DateTimeFormat().resolvedOptions().timeZone].join('|');
const api = async (path, body) => (await fetch(`${WORKER}/lic/${path}`, body ? { method: 'POST', body: JSON.stringify(body) } : undefined)).json();

const WHY = {
  used: 'הקישור הזה כבר הופעל בטלפון אחר. כל קישור עובד על טלפון אחד.',
  revoked: 'הקישור בוטל.', expired: 'תוקף הקישור הסתיים.', gone: 'הקישור הועבר לטלפון אחר.',
  bad: 'הקישור לא תקין. כדאי להעתיק אותו שוב במלואו.', net: 'אין חיבור לרשת. צריך חיבור רק להפעלה הראשונה.',
  srv: 'אין חיבור לשרת ההפעלה. בודקים שיש אינטרנט, ושחוסם תוכן או סינון לא חוסמים את האפליקציה. הבדיקה חוזרת לבד.',
};

function gate() {   // מסך הנעילה: מופיע רק כשהאכיפה פועלת ואין קישור בתוקף
  const lock = cfg.enforce && !valid();
  document.documentElement.classList.toggle('locked', lock);
  if (!lock) { gateEl?.remove(); gateEl = null; return; }
  const wait = isIOS() && !isStandalone();   // באייפון ההפעלה נעשית מהאפליקציה שבמסך הבית
  if (!gateEl) {
    gateEl = document.createElement('div');
    gateEl.className = 'lic-gate';
    gateEl.setAttribute('role', 'dialog'); gateEl.setAttribute('aria-modal', 'true'); gateEl.setAttribute('aria-label', 'נדרש קישור הפעלה');
    document.body.append(gateEl);
    gateEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      const m = TOKEN.exec(gateEl.querySelector('input').value); const btn = gateEl.querySelector('button');
      if (!m) { why = 'bad'; return gate(); }
      btn.disabled = true; await activate(m[0]); if (gateEl) gateEl.querySelector('button').disabled = false;
    });
  }
  const typed = gateEl.querySelector('input')?.value || '';
  gateEl.innerHTML = `<div class="lic-box"><img src="assets/icons/icon-192.png" alt="" width="76" height="76">
    <h2>נדרש קישור הפעלה</h2>
    <p class="lic-msg">${why ? WHY[why] || WHY.bad : wait && kParam ? 'הקישור התקבל. כדי להפעיל אותו, מוסיפים את האפליקציה למסך הבית ופותחים אותה משם:' : `כדי להשתמש ${APP_IN} צריך קישור הפעלה אישי.`}</p>
    ${wait ? `<ol class="lic-steps">${installSteps().map(([t, d]) => `<li><b>${t}</b><span>${d}</span></li>`).join('')}</ol>${kParam ? '<p class="lic-note" style="margin:-6px 0 14px">אחרי הפתיחה מהאייקון האפליקציה תופעל לבד.</p>' : ''}` : ''}
    <form class="lic-form" ${wait && kParam && !why ? 'hidden' : ''}>
      <input dir="ltr" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="P.xxxxxxxx.xxxx" aria-label="קישור או קוד הפעלה">
      <button class="btn primary block">הפעלה</button>
      <p class="lic-note">מדביקים כאן את הקישור או את הקוד שקיבלתם.</p>
    </form></div>`;
  if (typed) gateEl.querySelector('input').value = typed;
}

// אישור אחרי הפעלה מוצלחת: למי הקישור, עד מתי, ושהוא עובד בטלפון הזה בלבד. בדפדפן — גם איך מוסיפים את האפליקציה למסך הבית.
function activated() {
  const el = document.createElement('div');
  el.className = 'lic-gate'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'האפליקציה הופעלה');
  const until = new Date(L.exp).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' });
  const steps = isStandalone() ? null : installSteps();
  el.innerHTML = `<div class="lic-box"><img src="assets/icons/icon-192.png" alt="" width="76" height="76"><div><span class="lic-ok">✓</span></div>
    <h2>האפליקציה הופעלה</h2>
    <p class="lic-msg">${L.name ? `קישור ההפעלה של <b>${String(L.name).replace(/[<>&]/g, '')}</b> נקלט` : 'קישור ההפעלה נקלט'}, והוא בתוקף עד ${until}. הקישור עובד בטלפון הזה בלבד.</p>
    ${steps ? `<p class="lic-note" style="margin:0 0 8px">כדי לפתוח אותה כמו כל אפליקציה, כדאי להוסיף אותה למסך הבית:</p><ol class="lic-steps">${steps.map(([t, d]) => `<li><b>${t}</b><span>${d}</span></li>`).join('')}</ol>` : ''}
    <button class="btn primary block">המשך</button></div>`;
  el.querySelector('button').addEventListener('click', () => el.remove());
  document.body.append(el);
}

async function activate(tok) {
  why = '';
  try {
    const r = await api('activate', { token: tok, dev, app: APP_ID });
    if (r.ok) { L = { id: r.id, name: r.name, exp: r.exp, token: tok, t: Date.now() }; put(K, L); activated(); }
    else { why = r.why || 'bad'; if (L && L.token === tok) { L = null; put(K, null); } }
  } catch { why = 'net'; }
  gate(); changed();
  return !why;
}
async function check() {
  if (!L) return;
  try {
    const r = await api('check', { id: L.id, dev });
    if (r.ok) { L = { ...L, name: r.name, exp: r.exp, t: Date.now() }; put(K, L); }
    else if (['revoked', 'expired', 'gone', 'bad'].includes(r.why)) { why = r.why; L = null; put(K, null); }
  } catch { /* אין רשת: ממשיכים לפי תקופת החסד */ }
  gate(); changed();
}
const listeners = new Set();
const changed = () => listeners.forEach((f) => f());
export const onLicenseChange = (f) => (listeners.add(f), () => listeners.delete(f));

export async function initLicense() {
  gate();
  let answered = false;
  try { const c = await api(`cfg?app=${APP_ID}`); if (typeof c.enforce === 'boolean') { cfg = { enforce: c.enforce, t: Date.now() }; put(KC, cfg); answered = true; if (why === 'srv') why = ''; } } catch { /* אין תשובה */ }
  clearTimeout(retry);
  if (!answered && !cfgFresh()) {
    // השרת לא ענה, ואין תשובה שמורה בתוקף: נעולים עד שיענה (לא נשמר — התשובה הבאה מהשרת קובעת), ומנסים שוב לבד
    cfg = { enforce: true }; if (!valid() && !why) why = 'srv';
    if (!valid()) retry = setTimeout(initLicense, 8000);
  }
  const browserOnIos = isIOS() && !isStandalone();
  // אפליקציה מותקנת שנפתחת עם הקישור שבכתובת שלה: מפעילים רק כשאין קישור בתוקף (ולא דורסים קישור חדש יותר שהודבק)
  if (kParam && (!L || L.token !== kParam) && !(isStandalone() && valid())) {
    // באייפון מפעילים רק מהאפליקציה שבמסך הבית, כדי שההפעלה האחת לא תתבזבז על הדפדפן. הקישור מחכה לה בשרת רבע שעה.
    if (browserOnIos) api('hand-put', { app: APP_ID, fp: fp(), k: kParam }).catch(() => {});
    else { await activate(kParam); try { history.replaceState(null, '', location.pathname + location.hash); } catch { /* */ } return; }
  } else if (answered && cfg.enforce && !valid() && isIOS() && isStandalone()) {
    // האפליקציה שבמסך הבית נפתחה בלי קישור: בודקים אם מחכה לה אחד מהדפדפן — בכל פתיחה נעולה (בפתיחות הראשונות כמה ניסיונות)
    const asked = get(KH) || 0;
    {
      put(KH, Math.min(9, asked + 1));
      for (let n = 0; n < (asked < 6 ? 3 : 1) && !valid(); n++) {
        try { const r = await api('hand-get', { app: APP_ID, fp: fp() }); if (r?.k) { put(KH, 9); await activate(r.k); return; } } catch { break; }
        await new Promise((res) => setTimeout(res, 3000));
      }
    }
  }
  if (L && Date.now() - (L.t || 0) > RECHECK) return void (await check());
  gate();
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && L && Date.now() - (L.t || 0) > RECHECK) check(); });
if (typeof window !== 'undefined') window.addEventListener('online', () => { if (why === 'srv') initLicense(); });

// ───── מה שמוצג בהגדרות ─────
export const licenseText = () => (valid() ? `קישור הפעלה${L.name ? ` עבור ${L.name}` : ''} · בתוקף עד ${new Date(L.exp).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' })}` : '');
export const licenseEnforced = () => !!cfg.enforce;
