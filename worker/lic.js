// רישיונות (קישורי הפעלה אישיים) לשלוש האפליקציות: LOHEM, סטודיו כושר, קליסתניקס.
// אותו מנגנון כמו באפליקציות אתונה וליסבון (athens/push-worker/lic.js), בלי "מקומות לקבוצה".
// הכול נשמר ב-KV (binding בשם SUBS) תחת המפתחות lic:*.
//   lic:key            מפתח ההנפקה הראשי (HMAC). נוצר בשרת ולא יוצא ממנו.
//   lic:admin          סיסמת הניהול, כגיבוב עם מלח. נקבעת בכניסה הראשונה למסך הניהול.
//   lic:cfg:<app>      { enforce }  האם האפליקציה דורשת רישיון. כבוי = פתוחה לכולם.
//   lic:p:<id>         רישיון: { id, app, name, exp, created, revoked, devs:[{dev,t,seen}], rejects, lastReject }
//   lic:hand:<hash>    העברת קישור מהדפדפן של האייפון לאפליקציה שבמסך הבית (רבע שעה)
// קישור אישי:  P.<id>.<חתימה>   — מופעל על טלפון אחד.
const te = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const DAY = 86400e3, STALE = 60 * DAY, MAX_DEV = 1;
export const APPS = ['lohem', 'studio', 'calisthenics'];

async function hmacKey(env) {
  let k = await env.SUBS.get('lic:key');
  if (!k) { k = b64u(crypto.getRandomValues(new Uint8Array(32))); await env.SUBS.put('lic:key', k); }
  return crypto.subtle.importKey('raw', te.encode(k), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}
async function sign(env, id) { return b64u(await crypto.subtle.sign('HMAC', await hmacKey(env), te.encode('P.' + id))).slice(0, 22); }
const token = async (env, id) => `P.${id}.${await sign(env, id)}`;
const TOKEN_RE = /^P\.([a-z0-9]{6,12})\.([A-Za-z0-9_-]{22})$/;
async function parse(env, tok) {   // מחזיר את מזהה הרישיון רק אם החתימה נכונה
  const m = TOKEN_RE.exec(String(tok || '').trim());
  if (!m) return null;
  return (await sign(env, m[1])) === m[2] ? m[1] : null;
}
const getPass = (env, id) => env.SUBS.get('lic:p:' + id, 'json');
const putPass = (env, p) => env.SUBS.put('lic:p:' + p.id, JSON.stringify(p));
const newId = () => [...crypto.getRandomValues(new Uint8Array(8))].map((b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('');
const okDev = (d) => /^[a-z0-9]{8,24}$/.test(String(d || ''));
const live = (list, now) => (list || []).filter((x) => now - (x.seen || x.t) < STALE);   // טלפון שלא פתח את האפליקציה 60 יום מתפנה לבד
const days = (n, def) => Math.max(1, Math.min(3650, Math.floor(+n || def)));

async function pwHash(pw, salt) {
  const km = await crypto.subtle.importKey('raw', te.encode(pw), 'PBKDF2', false, ['deriveBits']);
  return b64u(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: te.encode(salt), iterations: 60000, hash: 'SHA-256' }, km, 256));
}
async function admin(env, pw, sess) {   // סיסמה, או כניסה שאושרה בזיהוי פנים (מפתח גישה) בחצי השעה האחרונה
  // הכניסה תקפה לחצי שעה מהפעולה האחרונה (כל פעולת ניהול מאריכה אותה), ולא לחצי שעה מרגע הזיהוי
  if (typeof sess === 'string' && /^[A-Za-z0-9_-]{30,60}$/.test(sess) && await env.SUBS.get('lic:sess:' + sess)) { await env.SUBS.put('lic:sess:' + sess, '1', { expirationTtl: 1800 }); return true; }
  const a = await env.SUBS.get('lic:admin', 'json');
  return !!a && typeof pw === 'string' && pw.length >= 6 && (await pwHash(pw, a.salt)) === a.hash;
}

// ───── זיהוי פנים / טביעת אצבע למסך הניהול (WebAuthn, מפתח גישה שנשמר בטלפון) ─────
const unb64u = (s) => Uint8Array.from(atob(String(s).replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const ORIGINS = ['https://dudutal-dev.github.io'];
const okOrigin = (o) => ORIGINS.includes(o) || /^http:\/\/localhost(:\d+)?$/.test(o);
async function challenge(env, kind) { const c = b64u(crypto.getRandomValues(new Uint8Array(32))); await env.SUBS.put('lic:ch:' + c, kind, { expirationTtl: 180 }); return c; }
async function clientOk(env, clientData, type, kind) {   // האתגר שלנו, מהאתר שלנו, ופעם אחת בלבד
  let c; try { c = JSON.parse(new TextDecoder().decode(unb64u(clientData))); } catch { return null; }
  if (c.type !== type || !okOrigin(c.origin)) return null;
  if ((await env.SUBS.get('lic:ch:' + c.challenge)) !== kind) return null;
  await env.SUBS.delete('lic:ch:' + c.challenge); return c;
}
function derToRaw(der) {   // חתימת ECDSA מגיעה בפורמט DER; לבדיקה צריך r ו-s ברצף, 32 בתים כל אחד
  let i = 2; if (der[1] & 0x80) i += der[1] & 0x7f;
  const int = () => { i++; const len = der[i++]; let v = der.slice(i, i + len); i += len; while (v.length > 32 && v[0] === 0) v = v.slice(1); const o = new Uint8Array(32); o.set(v, 32 - v.length); return o; };
  const r = int(), s2 = int(), out = new Uint8Array(64); out.set(r); out.set(s2, 32); return out;
}
async function waVerify(env, b) {
  const creds = (await env.SUBS.get('lic:wa', 'json')) || [], cred = creds.find((x) => x.id === b.id); if (!cred) return false;
  const c = await clientOk(env, b.clientData, 'webauthn.get', 'get'); if (!c) return false;
  const authData = unb64u(b.authData), rp = new Uint8Array(await crypto.subtle.digest('SHA-256', te.encode(new URL(c.origin).hostname)));
  if (authData.length < 37 || rp.some((x, i) => x !== authData[i]) || !(authData[32] & 0x04)) return false;   // האתר הנכון, והמשתמש אומת (פנים / אצבע / קוד)
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', unb64u(b.clientData))), signed = new Uint8Array(authData.length + 32); signed.set(authData); signed.set(hash, authData.length);
  const key = await crypto.subtle.importKey('spki', unb64u(cred.spki), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, derToRaw(unb64u(b.sig)), signed);
}

// יומן שימוש לכל קישור (למסך הניהול): כמה פתיחות בכל יום (90 הימים האחרונים) ובאילו שעות — לפי שעון ישראל.
// נרשמת רק עצם הפתיחה של האפליקציה; תוכן האימונים והתזונה נשאר בטלפון.
const ilDay = (t) => new Date(t).toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
const ilHour = (t) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit', hourCycle: 'h23' }).format(new Date(t))) % 24;
function touch(p, me, now) {
  me.seen = now;
  const d = ilDay(now); p.use = p.use || {}; p.use[d] = (p.use[d] || 0) + 1;
  const keys = Object.keys(p.use).sort(); for (const k of keys.slice(0, Math.max(0, keys.length - 90))) delete p.use[k];
  p.hrs = Array.isArray(p.hrs) && p.hrs.length === 24 ? p.hrs : Array(24).fill(0); p.hrs[ilHour(now)]++;
  p.opens = (p.opens || 0) + 1;
}

const view = (p) => ({ ok: true, id: p.id, name: p.name, exp: p.exp });   // מה שהאפליקציה מקבלת על הרישיון שלה

// json: (אובייקט, סטטוס) → Response. now: לבדיקות.
export async function lic(req, env, url, json, now = Date.now()) {
  const path = url.pathname.slice(5);
  if (path === 'cfg') {
    const app = url.searchParams.get('app'); if (!APPS.includes(app)) return json({ error: 'bad app' }, 400);
    return json({ enforce: !!((await env.SUBS.get('lic:cfg:' + app, 'json')) || {}).enforce });
  }
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  let b; try { b = await req.json(); } catch { return json({ error: 'bad json' }, 400); }

  if (path === 'activate') {   // הפעלת קישור על טלפון
    const id = await parse(env, b.token); if (!id || !okDev(b.dev)) return json({ ok: false, why: 'bad' });
    const p = await getPass(env, id); if (!p || p.app !== b.app) return json({ ok: false, why: 'bad' });
    if (p.revoked) return json({ ok: false, why: 'revoked' });
    if (p.exp < now) return json({ ok: false, why: 'expired' });
    const list = p.devs = live(p.devs, now); let me = list.find((x) => x.dev === b.dev);
    if (!me) {
      if (list.length >= MAX_DEV) { p.rejects = (p.rejects || 0) + 1; p.lastReject = now; await putPass(env, p); return json({ ok: false, why: 'used' }); }
      me = { dev: b.dev, t: now }; list.push(me);
    }
    touch(p, me, now);
    await putPass(env, p);
    return json(view(p));
  }
  if (path === 'check') {      // בדיקה תקופתית: האם הרישיון עדיין בתוקף לטלפון הזה
    const p = await getPass(env, String(b.id || '')); if (!p || !okDev(b.dev)) return json({ ok: false, why: 'bad' });
    if (p.revoked) return json({ ok: false, why: 'revoked' });
    if (p.exp < now) return json({ ok: false, why: 'expired' });
    const me = (p.devs || []).find((x) => x.dev === b.dev);
    if (!me) return json({ ok: false, why: 'gone' });
    if (now - (me.seen || 0) > 25 * 60e3) { touch(p, me, now); await putPass(env, p); }   // פתיחה חדשה: לא יותר מפעם ב-25 דקות
    return json(view(p));
  }
  // העברת הקישור מהדפדפן של האייפון לאפליקציה שבמסך הבית (שני אחסונים נפרדים באותו טלפון):
  // הדפדפן משאיר כאן את הקישור לרבע שעה, לפי תיאור המכשיר (מסך, שפה, אזור זמן), והאפליקציה אוספת אותו בפתיחה הראשונה.
  if (path === 'hand-put' || path === 'hand-get') {
    if (!APPS.includes(b.app)) return json({ error: 'bad app' }, 400);
    // בלי כתובת ה-IP: ברשת סלולרית ועם iCloud Private Relay היא שונה בין הדפדפן לאפליקציה שבמסך הבית, והקישור לא הגיע
    const who = b.app + '|' + String(b.fp || '').slice(0, 160);
    const hk = 'lic:hand:' + b64u(await crypto.subtle.digest('SHA-256', te.encode(who))).slice(0, 32);
    if (path === 'hand-put') {
      if (!TOKEN_RE.test(String(b.k || ''))) return json({ error: 'bad token' }, 400);
      await env.SUBS.put(hk, JSON.stringify({ k: b.k, t: now }), { expirationTtl: 900 });
      return json({ ok: true });
    }
    const hv = await env.SUBS.get(hk, 'json'); if (!hv || now - hv.t > 900e3) return json({ ok: true });
    await env.SUBS.delete(hk); return json({ ok: true, k: hv.k });
  }
  if (path === 'admin') {      // מסך הניהול
    if (b.op === 'state') return json({ claimed: !!(await env.SUBS.get('lic:admin')) });
    if (b.op === 'claim') {    // קביעת הסיסמה, פעם אחת בלבד
      if (await env.SUBS.get('lic:admin')) return json({ ok: false, why: 'claimed' });
      if (typeof b.pw !== 'string' || b.pw.length < 8) return json({ ok: false, why: 'short' });
      const salt = b64u(crypto.getRandomValues(new Uint8Array(12))); await env.SUBS.put('lic:admin', JSON.stringify({ salt, hash: await pwHash(b.pw, salt) }));
      return json({ ok: true });
    }
    if (b.op === 'wa-start') { const creds = (await env.SUBS.get('lic:wa', 'json')) || []; return json({ ok: true, challenge: await challenge(env, 'get'), ids: creds.map((x) => x.id) }); }
    if (b.op === 'wa-finish') {   // כניסה בזיהוי פנים: מחזירה אישור כניסה לחצי שעה
      let good = false; try { good = await waVerify(env, b); } catch { /* חתימה לא תקינה */ }
      if (!good) return json({ ok: false, why: 'auth' }, 401);
      const sess = b64u(crypto.getRandomValues(new Uint8Array(32))); await env.SUBS.put('lic:sess:' + sess, '1', { expirationTtl: 1800 });
      return json({ ok: true, sess });
    }
    if (!(await admin(env, b.pw, b.sess))) return json({ ok: false, why: 'auth' }, 401);
    if (b.op === 'wa-reg-start') return json({ ok: true, challenge: await challenge(env, 'reg') });
    if (b.op === 'wa-reg-finish') {   // רישום הטלפון: שומרים את המפתח הציבורי שלו
      const c = await clientOk(env, b.clientData, 'webauthn.create', 'reg');
      if (!c || !/^[A-Za-z0-9_-]{10,400}$/.test(String(b.id || '')) || !/^[A-Za-z0-9_-]{80,200}$/.test(String(b.spki || ''))) return json({ ok: false, why: 'bad' });
      try { await crypto.subtle.importKey('spki', unb64u(b.spki), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']); } catch { return json({ ok: false, why: 'bad' }); }
      const creds = ((await env.SUBS.get('lic:wa', 'json')) || []).filter((x) => x.id !== b.id); creds.push({ id: b.id, spki: b.spki, t: now, n: String(b.n || '').slice(0, 40) });
      await env.SUBS.put('lic:wa', JSON.stringify(creds.slice(-5))); return json({ ok: true });
    }
    if (b.op === 'wa-clear') { await env.SUBS.delete('lic:wa'); return json({ ok: true }); }
    if (b.op === 'login') return json({ ok: true });
    if (b.op === 'cfg') { if (!APPS.includes(b.app)) return json({ ok: false, why: 'bad' }); await env.SUBS.put('lic:cfg:' + b.app, JSON.stringify({ enforce: !!b.enforce })); return json({ ok: true, enforce: !!b.enforce }); }
    if (b.op === 'create') {
      if (!APPS.includes(b.app)) return json({ ok: false, why: 'bad' });
      const p = { id: newId(), app: b.app, name: String(b.name || '').slice(0, 40), exp: now + days(b.days, 14) * DAY, created: now, revoked: false, devs: [], rejects: 0 };
      await putPass(env, p); return json({ ok: true, id: p.id, token: await token(env, p.id) });
    }
    if (b.op === 'list') {
      const cfg = {}; for (const a of APPS) cfg[a] = !!((await env.SUBS.get('lic:cfg:' + a, 'json')) || {}).enforce;
      const out = []; let cursor;
      do {
        const r = await env.SUBS.list({ prefix: 'lic:p:', cursor }); cursor = r.list_complete ? null : r.cursor;
        for (const k of r.keys) { const p = await env.SUBS.get(k.name, 'json'); if (p) out.push({ ...p, token: await token(env, p.id), devs: live(p.devs, now) }); }
      } while (cursor);
      out.sort((x, y) => y.created - x.created);
      return json({ ok: true, cfg, passes: out, now });
    }
    const p = await getPass(env, String(b.id || '')); if (!p) return json({ ok: false, why: 'none' });
    if (b.op === 'revoke') p.revoked = b.on !== false;
    else if (b.op === 'extend') p.exp = Math.max(p.exp, now) + days(b.days, 14) * DAY;
    else if (b.op === 'reset') p.devs = [];                                   // למי שהחליף טלפון
    else if (b.op === 'rename') p.name = String(b.name || '').slice(0, 40);
    else if (b.op === 'delete') { await env.SUBS.delete('lic:p:' + p.id); return json({ ok: true }); }
    else return json({ ok: false, why: 'op' });
    await putPass(env, p); return json({ ok: true });
  }
  return json({ error: 'not found' }, 404);
}
