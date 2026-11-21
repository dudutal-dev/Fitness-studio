import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encryptPayload, vapidAuth, b64u } from '../worker/webpush.js';

// וקטור הבדיקה הרשמי מ-RFC 8291 §5
const V = {
  plaintext: 'When I grow up, I want to be a watermelon',
  asPrivate: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
  asPublic: 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
  uaPublic: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
  auth: 'BTBZMqHH6r4Tts7J_aSIgg',
  salt: 'DGv6ra1nlYgDCS1FRnbzlw',
  body: 'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
};

test('RFC 8291 test vector: aes128gcm encryption matches exactly', async () => {
  const pub = b64u.dec(V.asPublic);
  const jwk = { kty: 'EC', crv: 'P-256', d: V.asPrivate, x: b64u.enc(pub.slice(1, 33)), y: b64u.enc(pub.slice(33)), ext: true };
  const privateKey = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const publicKey = await crypto.subtle.importKey('raw', pub, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
  const out = await encryptPayload(V.plaintext, V.uaPublic, V.auth, { asKeys: { privateKey, publicKey }, salt: b64u.dec(V.salt) });
  assert.equal(b64u.enc(out), V.body);
});

test('VAPID JWT is a valid ES256 signature', async () => {
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const privateJwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
  const publicKey = b64u.enc(await crypto.subtle.exportKey('raw', kp.publicKey));
  const h = await vapidAuth('https://fcm.googleapis.com/fcm/send/abc', { publicKey, privateJwk, subject: 'https://example.com/' });
  const [, jwt, k] = h.match(/^vapid t=([^,]+), k=(.+)$/);
  assert.equal(k, publicKey);
  const [hd, bd, sg] = jwt.split('.');
  const claims = JSON.parse(new TextDecoder().decode(b64u.dec(bd)));
  assert.equal(claims.aud, 'https://fcm.googleapis.com');
  assert.ok(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, kp.publicKey, b64u.dec(sg), new TextEncoder().encode(`${hd}.${bd}`)));
});

test('reminder schedule: workout days/time, skip if trained, water slots, weigh-in, comeback', async () => {
  const { dueReminders, localNow, pruneSent } = await import('../worker/schedule.js');
  // 2026-11-17 is a Tuesday. Israel = UTC+2 in November
  const at = (hhmm) => new Date(`2026-11-17T${hhmm}:00+02:00`);
  assert.deepEqual(localNow('Asia/Jerusalem', at('18:31')), { date: '2026-11-17', dow: 2, min: 18 * 60 + 31 });
  const base = { tz: 'Asia/Jerusalem', name: 'עומר', sex: 'm', coach: 'ori', sent: {}, settings: {
    workout: { on: true, days: [0, 2, 4], time: '18:30' }, water: { on: true, from: '09:00', to: '21:00', every: 120 },
    weigh: { on: true, day: 2, time: '08:00' }, comeback: { on: true } } };
  const w = dueReminders(base, at('18:32'));
  assert.equal(w.length, 1); assert.equal(w[0].tag, 'workout'); assert.ok(w[0].body.startsWith('עומר, '));
  assert.equal(dueReminders(base, at('18:36')).length, 0, 'outside the 5-minute window');
  assert.equal(dueReminders({ ...base, lastWorkout: at('12:00').toISOString() }, at('18:32')).length, 0, 'already trained today');
  assert.equal(dueReminders({ ...base, sent: { 'workout:2026-11-17': 'x' } }, at('18:32')).length, 0, 'not twice');
  assert.equal(dueReminders({ ...base, settings: { ...base.settings, workout: { on: true, days: [1], time: '18:30' } } }, at('18:30')).length, 0, 'not a workout day');
  assert.deepEqual(dueReminders(base, at('11:02')).map((x) => x.key), ['water:2026-11-17:1']);
  assert.equal(dueReminders(base, at('12:02')).length, 0);
  assert.deepEqual(dueReminders(base, at('08:00')).map((x) => x.tag), ['weigh']);
  const old = { ...base, lastWorkout: new Date('2026-11-13T10:00:00+02:00').toISOString(), settings: { comeback: { on: true } } };
  assert.deepEqual(dueReminders(old, at('19:01')).map((x) => x.tag), ['comeback']);
  assert.equal(dueReminders({ ...old, sent: { 'comeback:2026-11-16': 'x' } }, at('19:01')).length, 0, 'comeback at most every 2 days');
  const f = dueReminders({ ...base, sex: 'f', name: 'מאיה', coach: 'noa' }, at('18:30'))[0];
  assert.ok(f.title.startsWith('נועה') && /(מוכנה|תתחילי|צאי|בואי)/.test(f.body));
  assert.deepEqual(Object.keys(pruneSent({ 'water:2026-11-01:1': 1, 'water:2026-11-16:2': 1 }, at('10:00'))), ['water:2026-11-16:2']);
});

test('reminder schedule: a separate time per day (workout.times) overrides the general time', async () => {
  const { dueReminders } = await import('../worker/schedule.js');
  const at = (hhmm) => new Date(`2026-11-17T${hhmm}:00+02:00`);   // Tuesday
  const sub = { tz: 'Asia/Jerusalem', name: 'דנה', sex: 'f', coach: 'yael', sent: {}, settings: { workout: { on: true, days: [0, 2, 4], time: '18:30', times: { 2: '07:15' } } } };
  assert.equal(dueReminders(sub, at('07:16')).filter((x) => x.tag === 'workout').length, 1, 'Tuesday uses its own time');
  assert.equal(dueReminders(sub, at('18:32')).filter((x) => x.tag === 'workout').length, 0, 'the general time no longer applies on Tuesday');
  const thu = new Date('2026-11-19T18:32:00+02:00');
  assert.equal(dueReminders(sub, thu).filter((x) => x.tag === 'workout').length, 1, 'Thursday has no time of its own — the general one applies');
});
