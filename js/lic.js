// קישור הפעלה אישי (?k=…) שמופעל על טלפון אחד, עם תוקף. הקישורים מונפקים באפליקציית הניהול הנפרדת
// (Fitness-studio/admin/) ונבדקים מול השרת (worker/lic.js). באפליקציה עצמה אין שום כניסה לניהול.
// השרת מחליט אם האפליקציה דורשת קישור בכלל ("אכיפה"). כשהאכיפה כבויה — שום דבר כאן לא חוסם.
// בלי אינטרנט: קישור שאושר ב-21 הימים האחרונים ממשיך לעבוד, כדי שאפשר יהיה להתאמן גם בלי קליטה.
import { APP_ID, APP_IN } from './app-id.js';
import { WORKER, isIOS, isStandalone } from './reminders.js';

const K = `${APP_ID}.lic`, KC = `${APP_ID}.licCfg`, KD = `${APP_ID}.dev`, KH = `${APP_ID}.hand`;
const GRACE = 21 * 864e5, RECHECK = 6 * 3600e3;
const get = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const put = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* מצב פרטי */ } };
const TOKEN = /P\.[a-z0-9]{6,12}\.[A-Za-z0-9_-]{22}/;

let dev = get(KD);
if (!dev) { dev = Math.random().toString(36).slice(2, 10).padEnd(8, 'x') + Date.now().toString(36); put(KD, dev); }
let L = get(K), cfg = get(KC) || { enforce: false }, why = '', gateEl = null;
const kParam = (() => { const m = TOKEN.exec(new URLSearchParams(location.search).get('k') || ''); return m ? m[0] : ''; })();
const valid = () => !!L && L.exp > Date.now() && Date.now() - (L.t || 0) < GRACE;
// תיאור המכשיר: זהה בספארי ובאפליקציה שבמסך הבית — כך הקישור עובר ביניהן דרך השרת
const fp = () => [screen.width, screen.height, devicePixelRatio, navigator.language, Intl.DateTimeFormat().resolvedOptions().timeZone].join('|');
const api = async (path, body) => (await fetch(`${WORKER}/lic/${path}`, body ? { method: 'POST', body: JSON.stringify(body) } : undefined)).json();

const WHY = {
  used: 'הקישור הזה כבר הופעל בטלפון אחר. כל קישור עובד על טלפון אחד.',
  revoked: 'הקישור בוטל.', expired: 'תוקף הקישור הסתיים.', gone: 'הקישור הועבר לטלפון אחר.',
  bad: 'הקישור לא תקין. כדאי להעתיק אותו שוב במלואו.', net: 'אין חיבור לרשת. צריך חיבור רק להפעלה הראשונה.',
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
    ${wait ? `<ol class="lic-steps"><li>לוחצים על כפתור השיתוף בתחתית המסך.</li><li>בוחרים <b>"הוסף למסך הבית"</b>.</li><li>פותחים את האפליקציה מהאייקון החדש${kParam ? ' — היא תופעל לבד' : ''}.</li></ol>` : ''}
    <form class="lic-form" ${wait && kParam && !why ? 'hidden' : ''}>
      <input dir="ltr" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="P.xxxxxxxx.xxxx" aria-label="קישור או קוד הפעלה">
      <button class="btn primary block">הפעלה</button>
      <p class="lic-note">מדביקים כאן את הקישור או את הקוד שקיבלתם.</p>
    </form></div>`;
  if (typed) gateEl.querySelector('input').value = typed;
}

async function activate(tok) {
  why = '';
  try {
    const r = await api('activate', { token: tok, dev, app: APP_ID });
    if (r.ok) { L = { id: r.id, name: r.name, exp: r.exp, token: tok, t: Date.now() }; put(K, L); }
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
  try { const c = await api(`cfg?app=${APP_ID}`); if (typeof c.enforce === 'boolean') { cfg = { enforce: c.enforce }; put(KC, cfg); } } catch { /* אין רשת: לפי ההגדרה האחרונה שנשמרה */ }
  const browserOnIos = isIOS() && !isStandalone();
  if (kParam && (!L || L.token !== kParam)) {
    // באייפון מפעילים רק מהאפליקציה שבמסך הבית, כדי שההפעלה האחת לא תתבזבז על הדפדפן. הקישור מחכה לה בשרת רבע שעה.
    if (browserOnIos) api('hand-put', { app: APP_ID, fp: fp(), k: kParam }).catch(() => {});
    else { await activate(kParam); try { history.replaceState(null, '', location.pathname + location.hash); } catch { /* */ } return; }
  } else if (!valid() && isIOS() && isStandalone()) {
    // האפליקציה שבמסך הבית נפתחה בלי קישור: בודקים אם מחכה לה אחד מהדפדפן (עד כמה ניסיונות, בפתיחות הראשונות)
    const asked = get(KH) || 0;
    if (asked < 6) {
      put(KH, asked + 1);
      for (let n = 0; n < 3 && !valid(); n++) {
        try { const r = await api('hand-get', { app: APP_ID, fp: fp() }); if (r?.k) { put(KH, 9); await activate(r.k); return; } } catch { break; }
        await new Promise((res) => setTimeout(res, 3000));
      }
    }
  }
  if (L && Date.now() - (L.t || 0) > RECHECK) return void (await check());
  gate();
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && L && Date.now() - (L.t || 0) > RECHECK) check(); });

// ───── מה שמוצג בהגדרות ─────
export const licenseText = () => (valid() ? `קישור הפעלה${L.name ? ` עבור ${L.name}` : ''} · בתוקף עד ${new Date(L.exp).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' })}` : '');
export const licenseEnforced = () => !!cfg.enforce;
