// השלמות לבדיקה המקיפה (25.11.2026): נקודות בשמירה חלקית, דף שנרדם באמצע סט, מטרה במעבר מסלול, מוביליטי לצד המסלול, והשם שלא נשלח לשרת התזכורות
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// reminders.js ו-store.js נכתבו לדפדפן: כאן מספיקים להם אחסון בזיכרון ומאזינים ריקים (בלי window — כדי שהשליחה החד־פעמית שבפתיחה לא תרוץ בבדיקה)
const mem = new Map(), realInterval = globalThis.setInterval;
globalThis.addEventListener ||= () => {};
globalThis.setInterval = () => 0;
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
globalThis.location = { search: '', pathname: '/', hash: '' };
globalThis.matchMedia = () => ({ matches: false });
globalThis.document = { hidden: false, addEventListener() {}, querySelector: () => null };

const { APP_ID } = await import('../js/app-id.js');
const store = await import('../js/store.js');
const rem = await import('../js/reminders.js');
const program = await import('../js/engine/program.js');
globalThis.setInterval = realInterval;
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const XP = store.XP;

// workoutXP ו-sleptFor הן פונקציות טהורות בתוך מסך האימון (שאי אפשר לטעון ב-node): נלקחות מהמקור
const wsrc = read('js/views/workout.js');
const pure = (name) => wsrc.match(new RegExp(`export const ${name} = ([^\\n]*);\\n`))[1];
const workoutXP = new Function('XP', `return ${pure('workoutXP')};`)(XP);
const SLEEP_GAP = Number(pure('SLEEP_GAP'));
const sleptFor = new Function('SLEEP_GAP', `return ${pure('sleptFor')};`)(SLEEP_GAP);

test('שמירה חלקית של אימון נותנת נקודות לפי חלק הסטים שבוצעו; אימון מלא לא השתנה', () => {
  assert.equal(XP.workout, 120);
  assert.equal(workoutXP(false, 20, 20), 120);
  assert.equal(workoutXP(false, 17, 20), 120);            // אימון שהגיע לסופו (גם עם סטים שדולגו) — כמו קודם
  assert.equal(workoutXP(true, 2, 20), 12);               // קודם: 120
  assert.equal(workoutXP(true, 10, 20), 60);
  assert.equal(workoutXP(true, 7, 24), 35);
  assert.equal(workoutXP(true, 19, 20), 114);
  assert.equal(workoutXP(true, 20, 20), 120);             // יצאו במתיחות אחרי כל הסטים: מלוא הנקודות
  assert.equal(workoutXP(true, 22, 20), 120);             // לא יותר מאימון מלא
  assert.equal(workoutXP(true, 1, 40), 12);               // לפחות עשירית: עבודה אמיתית היא לא אפס
  assert.equal(workoutXP(true, 3, 0), 120);               // בלי סטים מתוכננים אין חלוקה באפס
  for (let d = 1; d <= 30; d++) assert.ok(workoutXP(true, d, 30) >= workoutXP(true, d - 1 || 1, 30));
  // הנקודות שנשמרות על האימון (xp) הן אלה שניתנו, ושיאים נוספים במלואם
  assert.match(wsrc, /let gained = workoutXP\(partial, setsDone, planned\) \+ prs\.length \* XP\.pr;/);
  assert.match(wsrc, /partial, hr, xp: gained \}/);
});

test('דף שנרדם באמצע סט: פער ארוך בשעון הסט מוחזר לשעון, פער קצר נספר כרגיל', () => {
  assert.equal(SLEEP_GAP, 10000);
  const t = 1.7e12;
  assert.equal(sleptFor(0, t), 0);                         // פעימה ראשונה של הסט
  assert.equal(sleptFor(t, t + 40), 0);
  assert.equal(sleptFor(t, t + 1000), 0);                  // דף ברקע: פעימה בשנייה
  assert.equal(sleptFor(t, t + 10000), 0);
  assert.equal(sleptFor(t, t + 10001), 10001);
  assert.equal(sleptFor(t, t + 300000), 300000);           // חמש דקות: קודם הסט נרשם עם כל חזרות היעד
  // שני שעוני הסט (חזרות, החזקה בזמן) בודקים את הפער בכל פעימה ומתחילים ממדידה נקייה; שעון המנוחה לא
  assert.equal(wsrc.match(/\n {4}lastTick = 0;\n {4}timer = setInterval\(\(\) => \{\n {6}woke\(\);/g)?.length, 2);
  assert.equal(wsrc.match(/woke\(\);/g).length, 2);
  assert.match(wsrc, /pauseShift \+= gap; setPaused\(true\);/);
});

test('תזכורות דחיפה: השם הפרטי לא נשלח לשרת, ושדה ריק מוחק שם שנשמר בעבר', async () => {
  const NAME = 'רות המלכה';
  store.importData(JSON.stringify({ profile: { name: NAME, days: 3, sex: 'f', coach: APP_ID === 'calisthenics' ? 'maya' : 'noa', ...(APP_ID === 'lohem' ? {} : { track: APP_ID === 'calisthenics' ? 'cali' : 'gym' }) },
    plan: { startDate: '2026-11-01', blockIndex: 0, weekInBlock: 0, week: { sessions: [] }, completedDays: [] }, sessions: [{ date: '2026-11-20T10:00:00Z' }] }));
  store.set((s) => { s.reminders = { enabled: true, id: '11111111-2222-3333-4444-555555555555', settings: rem.defaultReminderSettings(s.profile) }; delete s.pushNoName; return s; });
  assert.equal(store.get().profile.name, NAME);
  const sent = [], realFetch = globalThis.fetch;
  globalThis.fetch = async (url, o) => { sent.push({ url, body: JSON.parse(o.body) }); return { ok: true, json: async () => ({ ok: true }) }; };
  try {
    await rem.syncReminders();
    assert.equal(sent.length, 1); assert.match(sent[0].url, /\/update$/);
    const b = sent[0].body;
    assert.deepEqual(Object.keys(b).sort(), ['app', 'coach', 'id', 'lastWorkout', 'name', 'settings', 'sex', 'tz']);
    assert.equal(b.name, '');                                // ריק ולא חסר: ב-/update השרת שומר את השם הישן כשהשדה חסר
    assert.ok(!JSON.stringify(b).includes('רות'), `השם נשלח: ${JSON.stringify(b)}`);
    assert.equal(b.app, APP_ID); assert.equal(b.sex, 'f'); assert.equal(b.lastWorkout, '2026-11-20T10:00:00Z');
    assert.equal(store.get().pushNoName, 1);                 // מי שנרשם לפני התיקון: נשלח פעם אחת, ומסומן
    assert.equal(store.get().profile.name, NAME);            // בטלפון השם נשאר
  } finally { globalThis.fetch = realFetch; }
  // השרת (worker/index.js, לקריאה בלבד): clean() שומר name מהבקשה, וב-/update ממזג את הרשומה עם הבקשה — שדה ריק דורס
  const w = read('worker/index.js');
  assert.match(w, /name: String\(b\.name \|\| ''\)\.slice\(0, 30\)/);
  assert.match(w, /clean\(\{ \.\.\.rec, \.\.\.b \}\)/);
  const src = read('js/reminders.js');
  assert.ok(!/name: p\.name/.test(src));
  assert.match(src, /r\.enabled && r\.id && !get\(\)\.pushNoName && navigator\.onLine\) syncReminders\(\)/);   // השליחה החד־פעמית בפתיחה
  assert.match(src, /s\.reminders = \{ \.\.\.cur, id, enabled: true \}; s\.pushNoName = 1;/);                    // רישום חדש כבר בלי שם
});

test('מעבר מסלול הלוך וחזור מחזיר את המטרה הקודמת (MOVA וקליסתניקס)', { skip: !program.goalOnSwitch }, () => {
  const { goalOnSwitch } = program, sw = (q, track) => { q.goal = goalOnSwitch(q, track === 'mix' ? 'gym' : track); q.track = track; return q; };
  for (const [goal, via, back] of [['strength', ['cali'], 'gym'], ['combat', ['cali'], 'gym'], ['strength', ['cali', 'mix'], 'gym'], ['combat', ['cali'], 'mix'], ['skill', ['gym'], 'cali'], ['skill', ['mix', 'gym'], 'cali'], ['muscle', ['cali'], 'gym'], ['cut', ['cali', 'mix'], 'gym']]) {
    const q = { goal, track: back }; for (const t of [...via, back]) sw(q, t);
    assert.equal(q.goal, goal, `${goal} דרך ${via.join(' ← ')}`);
    assert.equal(q.goalBack, undefined);
  }
  // בדרך: המטרה המקבילה של המסלול, והמקורית נזכרת
  const q = sw({ goal: 'strength', track: 'gym' }, 'cali');
  assert.equal(q.goal, 'skill'); assert.deepEqual(q.goalBack, { from: 'strength', to: 'skill' });
  // מי שבחר בינתיים מטרה אחרת בעצמו — הבחירה שלו קובעת
  const z = sw({ goal: 'strength', track: 'gym' }, 'cali'); z.goal = 'muscle'; sw(z, 'gym'); assert.equal(z.goal, 'muscle');
  const y = sw({ goal: 'strength', track: 'gym' }, 'cali'); y.goal = 'cut'; sw(y, 'gym'); assert.equal(y.goal, 'cut');
  // כל שורת מטרה במעבר מסלול משתמשת בזה
  const ui = read('js/views/cali-ui.js');
  assert.ok(!/q\.goal = goalForTrack\(/.test(ui));
  assert.ok(ui.match(/q\.goal = goalOnSwitch\(q, /g).length >= 3);
});

test('מוביליטי לצד המסלול: הוספה והסרה מחזירות את מספר ימי האימון (MOVA)', { skip: APP_ID !== 'studio' }, async () => {
  const { mobCount, newMob } = await import('../js/engine/mob.js');
  const src = read('js/views/track-sheet.js');
  const fitExtra = new Function(`${src.match(/export (function fitExtra\([^]*?\n}\n)/)[1]}; return fitExtra;`)();
  const canAdd = (cur, t) => program.EXTRA_TRACKS.includes(t) && t !== cur && !(cur === 'mix' && (t === 'gym' || t === 'cali'));
  const fitMob = new Function('mobCount', 'newMob', 'canAdd', 'fitExtra', `${src.match(/export (function fitMob\([^]*?\n}\n)/)[1]}; return fitMob;`)(mobCount, newMob, canAdd, fitExtra);
  const P = (o = {}) => ({ track: 'gym', days: 4, ...o });
  // "להוסיף ולהמשיך" ואז "בלי": קודם 4 ← 5 ← נשאר 5
  let q = P(); assert.equal(fitMob(q, 1, true), 1); assert.equal(q.days, 5); assert.deepEqual(q.extraDays, { mob: 1 });
  assert.equal(fitMob(q, 0), 0); assert.equal(q.days, 4); assert.equal(q.mobN, 0); assert.deepEqual(q.extraDays, {});
  // לחיצה שנייה על "להוסיף" לא מוסיפה עוד יום
  q = P(); fitMob(q, 1, true); assert.equal(fitMob(q, 1, true), 1); assert.equal(q.days, 5); fitMob(q, 0); assert.equal(q.days, 4);
  // הבחירה שבחלונית היא על חשבון ימי האימון: הימים לא זזים, לא בהוספה ולא בהסרה
  q = P(); assert.equal(fitMob(q, 2), 2); assert.equal(q.days, 4); fitMob(q, 0); assert.equal(q.days, 4);
  // הוספה, עוד אחד מהחלונית, הורדה לאחד, הסרה
  q = P(); fitMob(q, 1, true); fitMob(q, 2); assert.equal(q.days, 5); assert.equal(mobCount(q), 2); fitMob(q, 1); assert.equal(q.days, 5); fitMob(q, 0); assert.equal(q.days, 4);
  // שבוע של 6: המוביליטי נכנס על חשבון המסלול הראשי, בלי יום נוסף, וההסרה לא מורידה יום
  q = P({ days: 6 }); assert.equal(fitMob(q, 1, true), 1); assert.equal(q.days, 6); assert.deepEqual(q.extraDays, {}); fitMob(q, 0); assert.equal(q.days, 6);
  // שבוע מלא בתחומים נוספים: לא נכנס כלום ולא נשמר mobN (קודם: mobN = 1 בלי אימון בשבוע)
  q = P({ days: 6, extras: { tai: 3, yoga: 2 }, extraDays: { tai: 2, yoga: 0 } }); assert.equal(fitMob(q, 1, true), 0); assert.equal(q.mobN, 0); assert.equal(q.days, 6); assert.deepEqual(q.extraDays, { tai: 2, yoga: 0 });
  // מסלול משולב: נשארים שני אימונים למסלול הראשי
  q = P({ track: 'mix', days: 6, extras: { yoga: 3 } }); assert.equal(fitMob(q, 1, true), 1); q = P({ track: 'mix', days: 6, extras: { yoga: 3, tai: 1 } }); assert.equal(fitMob(q, 1, true), 0);
  // מה שנבחר הוא מה שמשובץ, בכל שילוב
  for (const days of [2, 3, 4, 5, 6]) for (const ex of [0, 1, 2, 3]) {
    const p0 = P({ days, ...(ex ? { extras: { yoga: ex } } : {}) }), d0 = p0.days, got = fitMob(p0, 1, true);
    assert.equal(got, mobCount(p0)); assert.equal(p0.mobN, got); assert.ok(p0.days <= 6);
    fitMob(p0, 0); assert.equal(p0.days, d0, `${days} ימים, יוגה ${ex}`); assert.equal(mobCount(p0), 0);
  }
  // פרופיל ישן (מוביליטי שנוסף לפני התיקון, בלי extraDays): ההסרה לא מורידה יום
  q = P({ days: 5, mobN: 1, mob: newMob() }); fitMob(q, 0); assert.equal(q.days, 5);
  // שני המסלולים במסך עוברים דרך אותה פונקציה
  assert.match(src, /setMob\(v\);/); assert.match(src, /setMob\(Math\.max\(1, get\(\)\.profile\.mobN \|\| 0\), true\)/);
  assert.ok(!/q\.days = Math\.min\(6, \(q\.days \|\| 3\) \+ 1\)/.test(src));
});
