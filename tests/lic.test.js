// קישורי הפעלה (worker/lic.js) מקצה לקצה דרך ה-Worker, עם KV בזיכרון
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.js';
import { APPS } from '../worker/lic.js';

function makeEnv() {
  const kv = new Map();
  return { kv, SUBS: {
    get: async (k, type) => { const v = kv.get(k); return v == null ? null : type === 'json' ? JSON.parse(v) : v; },
    put: async (k, v) => { kv.set(k, v); }, delete: async (k) => { kv.delete(k); },
    list: async ({ prefix }) => ({ keys: [...kv.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }),
  } };
}
const ORIGIN = 'https://dudutal-dev.github.io';
const post = async (env, path, body, ip = '1.1.1.1') => (await worker.fetch(new Request(`https://w.dev/lic/${path}`, { method: 'POST', headers: { Origin: ORIGIN, 'cf-connecting-ip': ip }, body: JSON.stringify(body) }), env)).json();
const DAY = 864e5;

test('licences: admin password, issuing a link, one phone per link, expiry, revoke, reset', async () => {
  const env = makeEnv();
  assert.deepEqual(APPS, ['lohem', 'studio', 'calisthenics', 'behind']);
  // ברירת מחדל: האפליקציה פתוחה לכולם
  const cfg = async (app) => (await worker.fetch(new Request(`https://w.dev/lic/cfg?app=${app}`, { headers: { Origin: ORIGIN } }), env));
  const r0 = await cfg('studio'); assert.equal(r0.headers.get('Access-Control-Allow-Origin'), ORIGIN); assert.deepEqual(await r0.json(), { enforce: false });
  assert.equal((await cfg('athens')).status, 400);

  // סיסמת ניהול: נקבעת פעם אחת, ובלעדיה אין גישה
  const admin = (op, o = {}, pw = 'correct horse') => post(env, 'admin', { pw, op, ...o });
  assert.deepEqual(await admin('state'), { claimed: false });
  assert.equal((await admin('claim', {}, 'short')).why, 'short');
  assert.equal((await admin('claim')).ok, true);
  assert.equal((await admin('claim', {}, 'another password')).why, 'claimed');
  assert.equal((await admin('list', {}, 'wrong password')).why, 'auth');
  assert.equal((await admin('create', { app: 'athens', name: 'x' })).ok, false);

  // הנפקה
  const made = await admin('create', { app: 'studio', name: 'יוסי', days: 30 });
  assert.ok(made.ok && /^P\.[a-z0-9]{8}\.[A-Za-z0-9_-]{22}$/.test(made.token));
  let list = await admin('list');
  assert.equal(list.passes.length, 1); assert.equal(list.passes[0].name, 'יוסי'); assert.equal(list.passes[0].token, made.token);
  assert.ok(Math.abs(list.passes[0].exp - list.now - 30 * DAY) < 5000); assert.deepEqual(list.cfg, { lohem: false, studio: false, calisthenics: false, behind: false });

  // הפעלה: טלפון אחד בלבד, רק באפליקציה שלה הונפק, וחתימה מזויפת נדחית
  const A = 'phoneaaaa1', B = 'phonebbbb2';
  assert.equal((await post(env, 'activate', { token: made.token, dev: A, app: 'lohem' })).why, 'bad');
  assert.equal((await post(env, 'activate', { token: made.token.slice(0, -1) + (made.token.endsWith('A') ? 'B' : 'A'), dev: A, app: 'studio' })).why, 'bad');
  const act = await post(env, 'activate', { token: made.token, dev: A, app: 'studio' });
  assert.equal(act.ok, true); assert.equal(act.name, 'יוסי'); assert.equal(act.id, made.id);
  assert.equal((await post(env, 'activate', { token: made.token, dev: A, app: 'studio' })).ok, true, 'same phone again is fine');
  assert.equal((await post(env, 'activate', { token: made.token, dev: B, app: 'studio' })).why, 'used');
  list = await admin('list');
  assert.equal(list.passes[0].devs.length, 1); assert.equal(list.passes[0].rejects, 1); assert.ok(list.passes[0].lastReject);

  // בדיקה תקופתית
  assert.equal((await post(env, 'check', { id: made.id, dev: A })).ok, true);
  assert.equal((await post(env, 'check', { id: made.id, dev: B })).why, 'gone');

  // איפוס טלפון: הישן נחסם, חדש יכול להפעיל
  assert.equal((await admin('reset', { id: made.id })).ok, true);
  assert.equal((await post(env, 'check', { id: made.id, dev: A })).why, 'gone');
  assert.equal((await post(env, 'activate', { token: made.token, dev: B, app: 'studio' })).ok, true);

  // ביטול והחזרה
  await admin('revoke', { id: made.id, on: true });
  assert.equal((await post(env, 'check', { id: made.id, dev: B })).why, 'revoked');
  assert.equal((await post(env, 'activate', { token: made.token, dev: B, app: 'studio' })).why, 'revoked');
  await admin('revoke', { id: made.id, on: false });
  assert.equal((await post(env, 'check', { id: made.id, dev: B })).ok, true);

  // תוקף: פג → נחסם; הארכה → חוזר
  const p = JSON.parse(env.kv.get('lic:p:' + made.id)); p.exp = Date.now() - 1000; env.kv.set('lic:p:' + made.id, JSON.stringify(p));
  assert.equal((await post(env, 'check', { id: made.id, dev: B })).why, 'expired');
  await admin('extend', { id: made.id, days: 7 });
  const again = await post(env, 'check', { id: made.id, dev: B });
  assert.equal(again.ok, true); assert.ok(again.exp > Date.now() + 6 * DAY && again.exp < Date.now() + 8 * DAY);

  // מתג האכיפה
  assert.equal((await admin('cfg', { app: 'studio', enforce: true })).enforce, true);
  assert.deepEqual(await (await cfg('studio')).json(), { enforce: true });
  assert.deepEqual(await (await cfg('lohem')).json(), { enforce: false });

  // מחיקה
  await admin('delete', { id: made.id });
  assert.equal((await post(env, 'check', { id: made.id, dev: B })).why, 'bad');
  assert.equal((await admin('list')).passes.length, 0);
});

test('licences: handing a link from iPhone Safari to the home-screen app', async () => {
  const env = makeEnv();
  await post(env, 'admin', { pw: 'correct horse', op: 'claim' });
  const { token } = await post(env, 'admin', { pw: 'correct horse', op: 'create', app: 'calisthenics', name: 'דנה' });
  const fp = '390x844|he-IL|Asia/Jerusalem|iPhone';
  assert.equal((await post(env, 'hand-put', { app: 'calisthenics', fp, k: 'not-a-token' })).error, 'bad token');
  assert.equal((await post(env, 'hand-put', { app: 'calisthenics', fp, k: token })).ok, true);
  assert.equal((await post(env, 'hand-get', { app: 'calisthenics', fp: fp + '|x' })).k, undefined, 'another device does not get it');
  assert.equal((await post(env, 'hand-put', { app: 'calisthenics', fp, k: token }, '8.8.8.8')).ok, true);
  assert.equal((await post(env, 'hand-get', { app: 'studio', fp })).k, undefined, 'another app does not get it');
  assert.equal((await post(env, 'hand-get', { app: 'calisthenics', fp }, '9.9.9.9')).k, token, 'same phone on another network (cellular / private relay) gets it');
  assert.equal((await post(env, 'hand-get', { app: 'calisthenics', fp })).k, undefined, 'collected once');
});

test('licences: usage log — opens per day and hour, at most once in 25 minutes', async () => {
  const { lic } = await import('../worker/lic.js');
  const env = makeEnv(), json = (o) => o;
  const call = (path, body, now) => lic(new Request(`https://w.dev/lic/${path}`, { method: 'POST', body: JSON.stringify(body) }), env, new URL(`https://w.dev/lic/${path}`), json, now);
  const t0 = Date.UTC(2026, 10, 20, 17, 30);   // 19:30 בישראל
  await call('admin', { pw: 'correct horse', op: 'claim' }, t0);
  const made = await call('admin', { pw: 'correct horse', op: 'create', app: 'studio', name: 'דנה', days: 365 }, t0);
  const dev = 'abcdefgh12345';
  assert.equal((await call('activate', { token: made.token, dev, app: 'studio' }, t0)).ok, true);
  await call('check', { id: made.id, dev }, t0 + 10 * 60e3);            // אותה פתיחה: לא נספרת שוב
  await call('check', { id: made.id, dev }, t0 + 40 * 60e3);            // פתיחה חדשה באותו יום (20:10)
  await call('check', { id: made.id, dev }, t0 + 12 * 3600e3);           // למחרת, 07:30
  const p = (await call('admin', { pw: 'correct horse', op: 'list' }, t0 + 2 * DAY)).passes[0];
  assert.deepEqual(p.use, { '2026-11-20': 2, '2026-11-21': 1 }); assert.equal(p.opens, 3);
  assert.equal(p.hrs[19], 1); assert.equal(p.hrs[20], 1); assert.equal(p.hrs[7], 1); assert.equal(p.hrs.reduce((a, x) => a + x, 0), 3);
  assert.equal(p.devs[0].seen, t0 + 12 * 3600e3);
  // נשמרים 90 ימים לכל היותר
  for (let i = 2; i < 100; i++) await call('check', { id: made.id, dev }, t0 + i * DAY);
  const q = (await call('admin', { pw: 'correct horse', op: 'list' }, t0 + 100 * DAY)).passes[0];
  assert.equal(Object.keys(q.use).length, 90); assert.ok(!q.use['2026-11-20']);
});

test('licences: per-link switches (perms) reach the app, and only "off" switches are stored', async () => {
  const env = makeEnv();
  const admin = (op, o = {}) => post(env, 'admin', { pw: 'correct horse', op, ...o });
  await admin('claim');
  const made = await admin('create', { app: 'behind', name: 'דנה', days: 30 });
  assert.ok(made.ok);
  const dev = 'abcd1234efgh';
  const a1 = await post(env, 'activate', { token: made.token, dev, app: 'behind' });
  assert.equal(a1.ok, true); assert.deepEqual(a1.perms, {});
  // כיבוי שני מתגים; מפתח לא תקין וערך שאינו false לא נשמרים
  assert.equal((await admin('perms', { id: made.id, perms: { feed: false, 'cat-space': false, sims: true, 'BAD KEY': false } })).ok, true);
  const c1 = await post(env, 'check', { id: made.id, dev });
  assert.deepEqual(c1.perms, { feed: false, 'cat-space': false });
  assert.deepEqual((await admin('list')).passes[0].perms, { feed: false, 'cat-space': false });
  // פתיחה מחדש של הכול
  await admin('perms', { id: made.id, perms: {} });
  assert.deepEqual((await post(env, 'check', { id: made.id, dev })).perms, {});
  assert.equal((await admin('perms', { id: 'nosuchid', perms: {} })).why, 'none');
  // קישור של אפליקציה אחת לא מופעל באחרת
  assert.equal((await post(env, 'activate', { token: made.token, dev, app: 'studio' })).ok, false);
});
