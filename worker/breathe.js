// "נשימה" (dudutal-dev/Breathe, מזהה breathe): המדיה המוכנה של בעל המוצר למשתמשי הקצה.
// התמונות והסרטונים נשמרים באחסון פרטי (R2, binding בשם BREATHE) ומוגשים רק לטלפון שמחזיק קישור הפעלה בתוקף.
//   m/<מזהה משימה>:<חריץ>   קובץ מדיה (חריצים: img, imgA, imgB, vidA, vidB, demoA, demoB)
//   manifest.json            מה שפורסם: { v, files: { <מפתח>: { type, kind, size, added } }, deck: { custom, en, customIllus } }
// פרסום (בעל המוצר, מתוך האפליקציה שלו): session ← put לכל קובץ ← publish. הזיהוי הוא סיסמת הניהול של קישורי ההפעלה.
// צפייה (משתמש קצה): manifest ו-m, עם מזהה הרישיון ומזהה הטלפון שהופעל עליו.
import { admin, getPass } from './lic.js';

const KEY_RE = /^[A-Za-z0-9_.-]{1,40}:(img|imgA|imgB|vidA|vidB|demoA|demoB)$/;
const MAX = 99 * 1024 * 1024;   // גבול גוף הבקשה ב-Workers הוא 100MB
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const readManifest = async (env) => { const o = await env.BREATHE.get('manifest.json'); return o ? o.json() : null; };

async function licensed(env, id, dev, now) {   // רישיון של "נשימה" בתוקף, שהופעל על הטלפון הזה
  const p = await getPass(env, String(id || ''));
  if (!p || p.app !== 'breathe' || p.revoked || p.exp < now) return false;
  return (p.devs || []).some((x) => x.dev === dev);
}

// json: (אובייקט, סטטוס) → Response. corsHeaders: לתשובות שאינן JSON. now: לבדיקות.
export async function breathe(req, env, url, json, corsHeaders, now = Date.now()) {
  const path = url.pathname.slice(9), q = url.searchParams;
  if (!env.BREATHE) return json({ error: 'no storage' }, 503);

  if (path === 'm' && req.method === 'GET') {   // קובץ מדיה אחד
    const k = q.get('k') || '';
    if (!KEY_RE.test(k) || !(await licensed(env, q.get('id'), q.get('dev'), now))) return json({ error: 'forbidden' }, 403);
    const o = await env.BREATHE.get('m/' + k); if (!o) return json({ error: 'not found' }, 404);
    return new Response(o.body, { headers: { ...corsHeaders, 'Content-Type': (o.httpMetadata && o.httpMetadata.contentType) || 'application/octet-stream', 'Content-Length': String(o.size), 'Cache-Control': 'private, max-age=86400' } });
  }
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  if (path === 'put') {   // העלאת קובץ אחד (גוף הבקשה הוא הקובץ)
    if (!(await admin(env, null, q.get('s')))) return json({ ok: false, why: 'auth' }, 401);
    const k = q.get('k') || ''; if (!KEY_RE.test(k)) return json({ ok: false, why: 'bad' }, 400);
    const len = +req.headers.get('Content-Length') || 0; if (!len || len > MAX) return json({ ok: false, why: 'size' }, 413);
    const type = String(req.headers.get('Content-Type') || 'application/octet-stream').slice(0, 80);
    await env.BREATHE.put('m/' + k, req.body, { httpMetadata: { contentType: type } });
    return json({ ok: true });
  }

  let b; try { b = await req.json(); } catch { return json({ error: 'bad json' }, 400); }

  if (path === 'manifest') {   // מה שפורסם, למשתמש קצה
    if (!(await licensed(env, b.id, b.dev, now))) return json({ ok: false, why: 'auth' }, 403);
    return json({ ok: true, manifest: await readManifest(env) });
  }
  if (path === 'session') {   // כניסת בעל המוצר בסיסמת הניהול: אישור לחצי שעה מהפעולה האחרונה
    if (!(await admin(env, b.pw, null))) return json({ ok: false, why: 'auth' }, 401);
    const sess = b64u(crypto.getRandomValues(new Uint8Array(32))); await env.SUBS.put('lic:sess:' + sess, '1', { expirationTtl: 1800 });
    return json({ ok: true, sess });
  }
  if (!(await admin(env, null, b.s))) return json({ ok: false, why: 'auth' }, 401);
  if (path === 'list') return json({ ok: true, manifest: await readManifest(env) });
  if (path === 'publish') {   // קובע מה פורסם, ומוחק מהאחסון כל קובץ שכבר לא ברשימה
    const files = {};
    for (const [k, f] of Object.entries(b.files && typeof b.files === 'object' ? b.files : {})) {
      if (!KEY_RE.test(k)) continue;
      const h = await env.BREATHE.head('m/' + k); if (!h) return json({ ok: false, why: 'missing', k });
      files[k] = { type: String((f && f.type) || (h.httpMetadata && h.httpMetadata.contentType) || '').slice(0, 80), kind: f && f.kind === 'video' ? 'video' : 'image', size: h.size, added: +(f && f.added) || now };
    }
    const d = b.deck && typeof b.deck === 'object' ? b.deck : {};
    const manifest = { v: now, files, deck: { custom: Array.isArray(d.custom) ? d.custom.slice(0, 500) : [], en: d.en && typeof d.en === 'object' ? d.en : {}, customIllus: d.customIllus && typeof d.customIllus === 'object' ? d.customIllus : {} } };
    await env.BREATHE.put('manifest.json', JSON.stringify(manifest), { httpMetadata: { contentType: 'application/json' } });
    let cursor, removed = 0;
    do {
      const r = await env.BREATHE.list({ prefix: 'm/', cursor }); cursor = r.truncated ? r.cursor : null;
      const gone = r.objects.map((o) => o.key).filter((key) => !files[key.slice(2)]);
      if (gone.length) { await env.BREATHE.delete(gone); removed += gone.length; }
    } while (cursor);
    return json({ ok: true, v: manifest.v, count: Object.keys(files).length, removed });
  }
  return json({ error: 'not found' }, 404);
}
