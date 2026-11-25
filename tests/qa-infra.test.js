// תיקוני תשתית מהבדיקה המקיפה (25.11.2026): שחזור מגיבוי, קובץ היומן, היומן שבשידור, קישור הפעלה כשהשרת לא עונה, עדכון באמצע ההיכרות
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// הקבצים נכתבו לדפדפן: כאן מספיקים להם מאזינים ריקים, אחסון בזיכרון ודף מדומה
const mem = new Map(), cls = new Set(), realInterval = globalThis.setInterval;
const node = () => ({ setAttribute() {}, addEventListener() {}, append() {}, remove() {}, querySelector: () => null, querySelectorAll: () => [], set innerHTML(v) { this.html = v; }, get innerHTML() { return this.html || ''; } });
globalThis.addEventListener ||= () => {};
globalThis.setInterval = () => 0;   // השמירה התקופתית של store.js הייתה משאירה את הבדיקה פתוחה
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
globalThis.location = { search: '', pathname: '/', hash: '' };
globalThis.screen = { width: 393, height: 852 };
globalThis.devicePixelRatio = 1;
globalThis.matchMedia = () => ({ matches: false });
globalThis.document = { hidden: false, addEventListener() {}, querySelector: () => null, createElement: node, body: node(),
  documentElement: { classList: { toggle: (c, on) => (on ? cls.add(c) : cls.delete(c)) } } };

const { APP_ID } = await import('../js/app-id.js');
const store = await import('../js/store.js');
const rem = await import('../js/reminders.js');
globalThis.setInterval = realInterval;
const tick = async (n = 12) => { for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r)); };

const NAME = 'רות, המלכה; א';
const backup = (over = {}) => ({ profile: { name: NAME, days: 3, sex: 'f', coach: APP_ID === 'calisthenics' ? 'maya' : 'ori', ...(APP_ID === 'lohem' ? {} : { track: APP_ID === 'calisthenics' ? 'cali' : 'gym' }) },
  plan: { startDate: '2026-11-01', blockIndex: 0, weekInBlock: 0, week: { sessions: [] }, completedDays: [] }, sessions: [{ date: '2026-11-20T10:00:00Z' }], ...over });

test('שחזור: רק קובץ עם פרופיל ותוכנית אמיתיים מתקבל, וקובץ שנדחה לא נוגע בנתונים', () => {
  store.importData(JSON.stringify(backup()));
  const before = JSON.stringify(store.get());
  assert.equal(store.get().profile.name, NAME);
  const b = backup(), bad = { 'לא JSON': 'BEGIN:VCALENDAR', ריק: '', מערך: '[]', מספר: '5', 'בלי פרופיל': '{"sessions":[]}', 'פרופיל ריק': '{"profile":null}', 'רק שם': '{"profile":{"name":"x"}}',
    'בלי תוכנית': JSON.stringify({ profile: b.profile }), 'תוכנית שהיא מספר': JSON.stringify({ ...b, plan: 7 }), 'אימונים שהם מספר': JSON.stringify({ ...b, sessions: 5 }), 'יומן שהוא מחרוזת': JSON.stringify({ ...b, daily: 'x' }),
    'רשימה עם ערך שאינו רשומה': JSON.stringify({ ...b, runs: [3] }), 'נקודות שאינן מספר': JSON.stringify({ ...b, xp: 'הרבה' }) };
  for (const [k, v] of Object.entries(bad)) {
    assert.throws(() => store.readBackup(v), /[א-ת]/, k);        // הודעה בעברית, לא שגיאת JSON באנגלית
    assert.throws(() => store.importData(v), k);
    assert.equal(JSON.stringify(store.get()), before, `הנתונים השתנו: ${k}`);
  }
});

test('שחזור: גיבוי מגרסה ישנה (בלי המפתחות שנוספו מאז) עדיין משוחזר, והחסר מתמלא מברירת המחדל', () => {
  const b = backup(); delete b.sessions;
  store.importData(JSON.stringify(b));
  const s = store.get();
  assert.deepEqual([s.sessions, s.runs, s.weights, s.events, s.history, s.daily, s.xp], [[], [], [], [], {}, {}, 0]);
  assert.equal(s.settings.voice, true);
  assert.equal(s.profile.name, NAME);
});

test('קובץ היומן: מזהה האפליקציה במזהי האירועים וב-PRODID, וטקסט מקודד לפי RFC 5545', () => {
  const ics = rem.buildICS({ workout: { on: true, days: [1, 3], time: '18:00', times: { 3: '07:15' } }, weigh: { on: true, day: 5, time: '08:00' } }, { name: NAME, coach: 'נועה', mins: 45 });
  const uids = ics.split('\r\n').filter((l) => l.startsWith('UID:'));
  assert.deepEqual(uids, [`UID:workout-1800@${APP_ID}`, `UID:workout-0715@${APP_ID}`, `UID:weigh@${APP_ID}`]);
  assert.ok(ics.includes(`PRODID:-//${APP_ID.toUpperCase()}//Reminders//HE`));
  if (APP_ID !== 'lohem') assert.ok(!/lohem/i.test(ics), 'נשאר מזהה של אפליקציה אחרת');
  const text = ics.split('\r\n').filter((l) => /^(SUMMARY|DESCRIPTION|X-WR-CALNAME):/.test(l));
  for (const l of text) assert.ok(!/(^|[^\\])[,;]/.test(l.slice(l.indexOf(':') + 1)), `פסיק או נקודה-פסיק לא מקודדים: ${l}`);
  assert.ok(ics.includes('רות\\, המלכה\\; א'));                    // השם נשאר בקובץ המקומי, מקודד
  assert.equal(rem.icsEsc('a\\b;c,d\ne'), 'a\\\\b\\;c\\,d\\ne');
});

test('היומן שבשידור: השם לא נשלח לשרת', async () => {
  store.importData(JSON.stringify(backup()));
  const sent = [], realFetch = globalThis.fetch;
  globalThis.fetch = async (url, o) => { sent.push({ url, body: JSON.parse(o.body) }); return { ok: true, json: async () => ({ id: 'cal1' }) }; };
  try {
    const url = await rem.calendarFeed({ name: NAME, coach: 'נועה', mins: 45 });
    assert.match(url, /\/cal\/cal1\.ics$/);
    assert.equal(sent.length, 1); assert.match(sent[0].url, /\/cal\/set$/);
    const b = sent[0].body;
    assert.deepEqual(Object.keys(b).sort(), ['calName', 'desc', 'mins', 'settings', 'title']);   // ימים, שעות וכותרת בלבד
    assert.ok(!JSON.stringify(b).includes('רות'), `השם נשלח: ${JSON.stringify(b)}`);
    assert.ok(b.title.startsWith('💪') && !b.title.includes('—') && !b.title.includes('\\'));
    assert.ok(b.desc.startsWith('נועה ') && b.mins === 45);
    assert.equal(store.get().calNoName, 1);
  } finally { globalThis.fetch = realFetch; }
});

// קישור הפעלה: בקשה שהתקבלה ולא נענית. כל טעינה של lic.js עם ?n היא עותק חדש, עם מה ששמור אז ב-localStorage.
const hang = (calls) => (url, o = {}) => new Promise((_, rej) => { calls.push(url); o.signal?.addEventListener('abort', () => rej(new Error('aborted'))); });
async function licCase(t, n, seed) {
  mem.clear(); cls.clear();
  for (const [k, v] of Object.entries(seed || {})) mem.set(`${APP_ID}.${k}`, JSON.stringify(v));
  const calls = [], realFetch = globalThis.fetch;
  globalThis.fetch = hang(calls);
  t.mock.timers.enable({ apis: ['setTimeout'] });
  t.after(() => { globalThis.fetch = realFetch; });
  const lic = await import(`../js/lic.js?${n}`);
  const done = lic.initLicense();
  await tick();
  return { lic, calls, done, locked: () => cls.has('locked'), msg: () => /lic-msg">([^<]*)/.exec(globalThis.document.body.lastGate?.html || '')?.[1] || '' };
}
const DAY = 864e5, link = (days) => ({ id: 'abc12345', name: 'בדיקה', exp: Date.now() + 30 * DAY, token: 'P.abcdefgh.ABCDEFGHIJKLMNOPQRSTUV', t: Date.now() - days * DAY });
globalThis.document.body.append = function (el) { this.lastGate = el; };

test('קישור הפעלה: השרת לא עונה ואין תשובה שמורה — נעול אחרי 8 שניות, עם ההסבר וניסיון חוזר', async (t) => {
  const c = await licCase(t, 1);
  assert.equal(c.locked(), false); assert.equal(c.calls.length, 1);
  t.mock.timers.tick(7900); await tick();
  assert.equal(c.locked(), false, 'ננעל לפני הזמן');
  t.mock.timers.tick(200); await tick(); await c.done;
  assert.equal(c.locked(), true, 'נשאר פתוח כשהשרת לא עונה');
  assert.equal(c.lic.licenseEnforced(), true);
  assert.match(c.msg(), /אין חיבור לשרת ההפעלה/);
  t.mock.timers.tick(8000); await tick();
  assert.equal(c.calls.length, 2, 'אין ניסיון חוזר');
});

test('קישור הפעלה: תשובה שמורה בת 30 יום לא משאירה את האפליקציה פתוחה; בת 5 ימים — כן', async (t) => {
  const old = await licCase(t, 2, { licCfg: { enforce: false, t: Date.now() - 30 * DAY } });
  t.mock.timers.tick(8100); await tick(); await old.done;
  assert.equal(old.locked(), true);
  t.mock.timers.reset();
  const fresh = await licCase(t, 3, { licCfg: { enforce: false, t: Date.now() - 5 * DAY } });
  t.mock.timers.tick(8100); await tick(); await fresh.done;
  assert.equal(fresh.locked(), false);
  t.mock.timers.tick(8100); await tick();
  assert.equal(fresh.calls.length, 1);          // פתוח: אין מה לנסות שוב
});

test('קישור הפעלה: קישור שאושר לפני 20 יום עובד בלי שרת; לפני 22 יום — נעול עם ההסבר על השרת וניסיון חוזר', async (t) => {
  const ok = await licCase(t, 4, { lic: link(20), licCfg: { enforce: true, t: Date.now() - 22 * DAY } });
  t.mock.timers.tick(8100); await tick(); t.mock.timers.tick(8100); await tick(); await ok.done;
  assert.equal(ok.locked(), false);
  t.mock.timers.reset();
  const late = await licCase(t, 5, { lic: link(22), licCfg: { enforce: true, t: Date.now() - 1 * DAY } });
  assert.equal(late.locked(), true);
  t.mock.timers.tick(8100); await tick(); t.mock.timers.tick(8100); await tick(); await late.done;   // cfg ואז check: שניהם לא נענים
  assert.match(late.msg(), /אין חיבור לשרת ההפעלה/);
  const n = late.calls.length;
  t.mock.timers.tick(8100); await tick();
  assert.ok(late.calls.length > n, 'אין ניסיון חוזר');
});

test('עדכון אוטומטי: לא מרעננים באמצע שאלון ההיכרות', () => {
  const src = readFileSync('js/updater.js', 'utf8');
  const m = /const inOnboarding = \(\) => (\{.*\});/.exec(src); assert.ok(m);
  const inOnboarding = new Function('document', `return (() => ${m[1]})()`);
  const page = (ob) => ({ querySelector: (s) => (s === '.ob' ? ob : null) }), ob = (...has) => ({ querySelector: (s) => (has.includes(s) ? {} : null) });
  assert.equal(inOnboarding(page(null)), false);                         // אין שאלון
  assert.equal(inOnboarding(page(ob('.actions'))), false);               // מסך השער: מתעדכן
  assert.equal(inOnboarding(page(ob('.steps', '.actions'))), true);      // שלב בשאלון
  assert.equal(inOnboarding(page(ob())), true);                          // בניית התוכנית
  assert.match(src, /const inSession = .*\|\| inOnboarding\(\)/);
});
