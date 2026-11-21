// המדיה של "נשימה" (worker/breathe.js) מקצה לקצה דרך ה-Worker, עם KV ו-R2 בזיכרון
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.js';

function makeEnv() {
  const kv = new Map(), r2 = new Map();
  const obj = (key) => { const o = r2.get(key); return o && { key, size: o.data.length, httpMetadata: o.httpMetadata, body: o.data, json: async () => JSON.parse(new TextDecoder().decode(o.data)) }; };
  return { kv, r2, SUBS: {
    get: async (k, type) => { const v = kv.get(k); return v == null ? null : type === 'json' ? JSON.parse(v) : v; },
    put: async (k, v) => { kv.set(k, v); }, delete: async (k) => { kv.delete(k); },
    list: async ({ prefix }) => ({ keys: [...kv.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }),
  }, BREATHE: {
    get: async (k) => obj(k) || null, head: async (k) => obj(k) || null,
    put: async (k, v, o = {}) => { r2.set(k, { data: typeof v === 'string' ? new TextEncoder().encode(v) : new Uint8Array(await new Response(v).arrayBuffer()), httpMetadata: o.httpMetadata }); },
    delete: async (ks) => { for (const k of [].concat(ks)) r2.delete(k); },
    list: async ({ prefix }) => ({ objects: [...r2.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })), truncated: false }),
  } };
}
const ORIGIN = 'https://dudutal-dev.github.io', H = { Origin: ORIGIN };
const call = (env, path, init) => worker.fetch(new Request(`https://w.dev/${path}`, { headers: H, ...init }), env);
const post = async (env, path, body) => (await call(env, path, { method: 'POST', body: JSON.stringify(body) })).json();

test('breathe: only the owner publishes, only an activated link reads', async () => {
  const env = makeEnv(), pw = 'correct horse';
  await post(env, 'lic/admin', { pw, op: 'claim' });
  const made = await post(env, 'lic/admin', { pw, op: 'create', app: 'breathe', name: 'דנה', days: 30 });
  const other = await post(env, 'lic/admin', { pw, op: 'create', app: 'studio', name: 'x', days: 30 });
  const dev = 'abcdefgh1234';
  assert.equal((await post(env, 'lic/activate', { token: made.token, dev, app: 'breathe' })).ok, true);
  assert.equal((await post(env, 'lic/activate', { token: other.token, dev, app: 'studio' })).ok, true);

  // כניסת בעל המוצר
  assert.equal((await post(env, 'breathe/session', { pw: 'wrong password' })).why, 'auth');
  const { sess } = await post(env, 'breathe/session', { pw }); assert.ok(sess);
  assert.equal((await post(env, 'breathe/list', { s: sess })).manifest, null);

  // העלאה: רק עם כניסה, ורק מפתח תקין
  const put = (k, s, data = 'video-bytes', type = 'video/mp4') => call(env, `breathe/put?k=${encodeURIComponent(k)}&s=${s}`, { method: 'POST', headers: { ...H, 'Content-Type': type, 'Content-Length': String(data.length) }, body: data });
  assert.equal((await put('g04:vidA', 'nope')).status, 401);
  assert.equal((await put('../x:vidA', sess)).status, 400);
  assert.equal((await put('g04:vidA', sess)).status, 200);
  assert.equal((await put('g04:img', sess, 'jpeg', 'image/jpeg')).status, 200);
  assert.equal((await put('old:img', sess, 'jpeg', 'image/jpeg')).status, 200);

  // פרסום: קובץ שלא הועלה נדחה; מה שלא ברשימה נמחק
  assert.equal((await post(env, 'breathe/publish', { s: sess, files: { 'zz:img': {} } })).why, 'missing');
  assert.equal((await post(env, 'breathe/publish', { s: 'nope', files: {} })).why, 'auth');
  const pub = await post(env, 'breathe/publish', { s: sess, files: { 'g04:vidA': { type: 'video/mp4', kind: 'video', added: 5 }, 'g04:img': { type: 'image/jpeg', kind: 'image', added: 6 } }, deck: { custom: [{ id: 'u1', text: 'שלי' }] } });
  assert.equal(pub.ok, true); assert.equal(pub.count, 2); assert.equal(pub.removed, 1); assert.ok(!env.r2.has('m/old:img'));

  // משתמש קצה: רק רישיון של נשימה, בתוקף, על הטלפון שהופעל
  const man = await post(env, 'breathe/manifest', { id: made.id, dev });
  assert.equal(man.ok, true); assert.deepEqual(Object.keys(man.manifest.files).sort(), ['g04:img', 'g04:vidA']);
  assert.equal(man.manifest.files['g04:vidA'].size, 11); assert.equal(man.manifest.deck.custom[0].id, 'u1');
  assert.equal((await post(env, 'breathe/manifest', { id: made.id, dev: 'otherphone99' })).why, 'auth');
  assert.equal((await post(env, 'breathe/manifest', { id: other.id, dev })).why, 'auth');
  const get = (id, d, k = 'g04:vidA') => call(env, `breathe/m?k=${encodeURIComponent(k)}&id=${id}&dev=${d}`);
  const ok = await get(made.id, dev);
  assert.equal(ok.status, 200); assert.equal(ok.headers.get('Content-Type'), 'video/mp4'); assert.equal(ok.headers.get('Access-Control-Allow-Origin'), ORIGIN); assert.equal(await ok.text(), 'video-bytes');
  assert.equal((await get(made.id, 'otherphone99')).status, 403);
  assert.equal((await get(other.id, dev)).status, 403);
  assert.equal((await get('', '')).status, 403);
  assert.equal((await get(made.id, dev, 'nope:img')).status, 404);
  await post(env, 'lic/admin', { pw, op: 'revoke', id: made.id });
  assert.equal((await get(made.id, dev)).status, 403);
});
