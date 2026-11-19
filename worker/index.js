// LOHEM Reminders — Cloudflare Worker משותף לשלוש האפליקציות (LOHEM, סטודיו כושר, קליסתניקס):
// שומר מנויי Push ושולח תזכורות לפי לוח זמנים (קרון כל 5 דקות), ומנהל קישורי הפעלה אישיים (lic.js, נתיבי /lic/…).
// סודות/הגדרות: VAPID_PUBLIC (טקסט), VAPID_PRIVATE_JWK (סוד), VAPID_SUBJECT; KV: SUBS
import { sendPush } from './webpush.js';
import { dueReminders, pruneSent, COACH } from './schedule.js';
import { lic } from './lic.js';

const ALLOWED = ['https://dudutal-dev.github.io'];
const allowed = (o) => ALLOWED.includes(o) || /^http:\/\/localhost(:\d+)?$/.test(o || '');   // localhost: פיתוח ובדיקות

function cors(req) {
  const o = req.headers.get('Origin');
  return { 'Access-Control-Allow-Origin': allowed(o) ? o : ALLOWED[0], 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' };
}
const json = (req, data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors(req) } });
const vapid = (env) => ({ publicKey: env.VAPID_PUBLIC, privateJwk: JSON.parse(env.VAPID_PRIVATE_JWK), subject: env.VAPID_SUBJECT });
const validId = (id) => typeof id === 'string' && /^[a-f0-9-]{36}$/.test(id);
const clean = (b) => ({
  settings: b.settings || {}, tz: String(b.tz || 'Asia/Jerusalem').slice(0, 64), name: String(b.name || '').slice(0, 30),
  sex: b.sex === 'f' ? 'f' : 'm', coach: COACH[b.coach] ? b.coach : 'ori',
  // מאיזו אפליקציה המנוי (הנוסח שונה: LOHEM פונה לחיילים, השאר לכולם). מנוי ישן בלי השדה נשאר בלעדיו עד הסנכרון הבא.
  ...(['lohem', 'studio', 'calisthenics'].includes(b.app) ? { app: b.app } : {}),
});

async function push(env, rec, msg) {
  const status = await sendPush(rec.subscription, { title: msg.title, body: msg.body, tag: msg.tag, url: msg.url }, vapid(env), { ttl: msg.ttl || 3600 });
  return status;
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) });
    const url = new URL(req.url);
    if (req.method === 'GET' && url.pathname === '/') return json(req, { ok: true, service: 'lohem-reminders', vapid: env.VAPID_PUBLIC });
    if (url.pathname.startsWith('/lic/')) return lic(req, env, url, (data, status) => json(req, data, status));   // קישורי הפעלה
    if (req.method !== 'POST') return json(req, { error: 'method' }, 405);
    let b;
    try { b = await req.json(); } catch { return json(req, { error: 'json' }, 400); }

    if (url.pathname === '/subscribe') {
      const sub = b.subscription;
      if (!sub?.endpoint?.startsWith('https://') || !sub.keys?.p256dh || !sub.keys?.auth) return json(req, { error: 'subscription' }, 400);
      const id = validId(b.id) ? b.id : crypto.randomUUID();
      const prev = JSON.parse((await env.SUBS.get(`sub:${id}`)) || '{}');
      await env.SUBS.put(`sub:${id}`, JSON.stringify({ ...prev, ...clean(b), subscription: sub, lastWorkout: b.lastWorkout || prev.lastWorkout || null, sent: prev.sent || {}, created: prev.created || new Date().toISOString() }));
      return json(req, { id });
    }
    if (!validId(b.id)) return json(req, { error: 'id' }, 400);
    const key = `sub:${b.id}`;
    const rec = JSON.parse((await env.SUBS.get(key)) || 'null');
    if (url.pathname === '/unsubscribe') { await env.SUBS.delete(key); return json(req, { ok: true }); }
    if (!rec) return json(req, { error: 'not-found' }, 404);
    if (url.pathname === '/update') {
      await env.SUBS.put(key, JSON.stringify({ ...rec, ...clean({ ...rec, ...b }), lastWorkout: b.lastWorkout ?? rec.lastWorkout }));
      return json(req, { ok: true });
    }
    if (url.pathname === '/ping') {
      await env.SUBS.put(key, JSON.stringify({ ...rec, lastWorkout: b.lastWorkout || new Date().toISOString() }));
      return json(req, { ok: true });
    }
    if (url.pathname === '/test') {
      const f = rec.sex === 'f';
      const status = await push(env, rec, { title: `${COACH[rec.coach] || 'אורי'}: התזכורות עובדות ✅`, body: `${rec.name ? `${rec.name}, ` : ''}ככה ${f ? 'תקבלי' : 'תקבל'} ממני תזכורות לאימון, שתייה ושקילה.`, tag: 'test', url: './#/coach' });
      if (status === 404 || status === 410) await env.SUBS.delete(key);
      return json(req, { status }, status < 300 ? 200 : 502);
    }
    return json(req, { error: 'route' }, 404);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      const now = new Date(event.scheduledTime || Date.now());
      let cursor;
      do {
        const page = await env.SUBS.list({ prefix: 'sub:', cursor });
        for (const k of page.keys) {
          const rec = JSON.parse((await env.SUBS.get(k.name)) || 'null');
          if (!rec) continue;
          const due = dueReminders(rec, now);
          if (!due.length) continue;
          let gone = false;
          for (const m of due) {
            const status = await push(env, rec, m);
            if (status === 404 || status === 410) { gone = true; break; }
            if (status < 300) rec.sent = { ...rec.sent, [m.key]: now.toISOString() };
          }
          if (gone) await env.SUBS.delete(k.name);
          else await env.SUBS.put(k.name, JSON.stringify({ ...rec, sent: pruneSent(rec.sent, now) }));
        }
        cursor = page.list_complete ? null : page.cursor;
      } while (cursor);
    })());
  },
};
