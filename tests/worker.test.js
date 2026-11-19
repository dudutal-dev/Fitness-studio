import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.js';
import { b64u } from '../worker/webpush.js';

// ── "דפדפן" מדומה: מפתחות מנוי ופענוח aes128gcm כמו שהטלפון עושה ──
async function makeBrowserSub() {
  const ua = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const uaPub = new Uint8Array(await crypto.subtle.exportKey('raw', ua.publicKey));
  const auth = crypto.getRandomValues(new Uint8Array(16));
  return { ua, sub: { endpoint: 'https://push.example.net/send/abc', keys: { p256dh: b64u.enc(uaPub), auth: b64u.enc(auth) } }, uaPub, auth };
}
async function hkdf(salt, ikm, info, len) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, len * 8));
}
async function decrypt(body, { ua, uaPub, auth }) {
  const salt = body.slice(0, 16), idlen = body[20], asPub = body.slice(21, 21 + idlen), ct = body.slice(21 + idlen);
  const asKey = await crypto.subtle.importKey('raw', asPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asKey }, ua.privateKey, 256));
  const te = new TextEncoder();
  const ikm = await hkdf(auth, shared, new Uint8Array([...te.encode('WebPush: info\0'), ...uaPub, ...asPub]), 32);
  const cek = await hkdf(salt, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, te.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
  const pt = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, ct));
  return JSON.parse(new TextDecoder().decode(pt.slice(0, pt.lastIndexOf(2))));
}

test('worker end-to-end: subscribe → update → test push → scheduled reminders → expired sub cleanup', async () => {
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
  const kv = new Map();
  const env = {
    VAPID_PUBLIC: b64u.enc(await crypto.subtle.exportKey('raw', kp.publicKey)),
    VAPID_PRIVATE_JWK: JSON.stringify(await crypto.subtle.exportKey('jwk', kp.privateKey)),
    VAPID_SUBJECT: 'https://dudutal-dev.github.io/Fitness-center/',
    SUBS: {
      get: async (k) => kv.get(k) ?? null, put: async (k, v) => kv.set(k, v), delete: async (k) => kv.delete(k),
      list: async ({ prefix }) => ({ keys: [...kv.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }),
    },
  };
  const browser = await makeBrowserSub();
  const sent = [];
  let pushStatus = 201;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    sent.push({ url, headers: init.headers, payload: await decrypt(new Uint8Array(init.body), browser) });
    return new Response(null, { status: pushStatus });
  };
  const call = (path, body) => worker.fetch(new Request(`https://w.dev${path}`, { method: 'POST', headers: { Origin: 'https://dudutal-dev.github.io', 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), env);
  try {
    // preflight של CORS מהאתר
    const pre = await worker.fetch(new Request('https://w.dev/subscribe', { method: 'OPTIONS', headers: { Origin: 'https://dudutal-dev.github.io', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } }), env);
    assert.equal(pre.headers.get('Access-Control-Allow-Origin'), 'https://dudutal-dev.github.io');
    assert.match(pre.headers.get('Access-Control-Allow-Headers'), /Content-Type/i);
    assert.match(pre.headers.get('Access-Control-Allow-Methods'), /POST/);
    let r = await call('/subscribe', { subscription: browser.sub, name: 'עומר', sex: 'm', coach: 'ori', tz: 'Asia/Jerusalem', settings: {} });
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('Access-Control-Allow-Origin'), 'https://dudutal-dev.github.io');
    const { id } = await r.json();
    assert.match(id, /^[a-f0-9-]{36}$/);
    r = await call('/update', { id, name: 'עומר', sex: 'm', coach: 'ori', tz: 'Asia/Jerusalem', settings: { workout: { on: true, days: [2], time: '18:30' } } });
    assert.equal(r.status, 200);
    r = await call('/test', { id });
    assert.equal(r.status, 200);
    assert.equal(sent.length, 1);
    assert.ok(sent[0].headers.Authorization.startsWith('vapid t='));
    assert.equal(sent[0].headers['Content-Encoding'], 'aes128gcm');
    assert.match(sent[0].payload.title, /אורי: התזכורות עובדות/);
    // קרון: שלישי 18:31 שעון ישראל → תזכורת אימון אחת, ופעם שנייה לא נשלחת שוב
    const ctx = { waitUntil: (p) => (ctx.p = p) };
    await worker.scheduled({ scheduledTime: Date.parse('2026-11-17T18:31:00+02:00') }, env, ctx); await ctx.p;
    assert.equal(sent.length, 2);
    assert.equal(sent[1].payload.tag, 'workout');
    assert.ok(sent[1].payload.body.includes('עומר'));
    await worker.scheduled({ scheduledTime: Date.parse('2026-11-17T18:33:00+02:00') }, env, ctx); await ctx.p;
    assert.equal(sent.length, 2, 'no duplicate');
    // אימון בוצע היום → אין תזכורת ביום אימון הבא באותו יום
    // מנוי שפג (410) נמחק
    pushStatus = 410;
    r = await call('/test', { id });
    assert.equal(kv.size, 0);
    r = await call('/update', { id, settings: {} });
    assert.equal(r.status, 404);
  } finally { globalThis.fetch = realFetch; }
});
