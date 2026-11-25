// תיקונים מהבדיקה המקיפה (25.11.2026) — ריצה והליכה: נקודות במחיקה, עמידה במקום בלי מהירות מהמכשיר, מבדק 3 ק״מ
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { deleteRun } from '../js/engine/history-edit.js';

const src = readFileSync(new URL('../js/views/run.js', import.meta.url), 'utf8');

test('מחיקת ריצה מורידה את הנקודות שהיא נתנה; רשומה ישנה בלי השדה — 90', () => {
  const st = (runs) => ({ xp: 500, profile: {}, runs });
  assert.equal(deleteRun(st([{ date: '2026-11-24T18:00:00.000Z', type: 'test', timeSec: 900, xp: 140 }]), 0).xp, 360);
  assert.equal(deleteRun(st([{ date: '2026-11-24T18:00:00.000Z', type: 'easy', xp: 90 }]), 0).xp, 410);
  assert.equal(deleteRun(st([{ date: '2026-11-20T18:00:00.000Z', type: 'test', timeSec: 900 }]), 0).xp, 410);
  assert.equal(deleteRun({ xp: 50, profile: {}, runs: [{ date: '2026-11-24T18:00:00.000Z', xp: 140 }] }, 0).xp, 0);
  assert.equal(deleteRun(st([]), 0).xp, 500);
});

test('saveRun שומר את הנקודות על הרשומה ומעניק בדיוק אותן', () => {
  assert.match(src, /const xp = XP\.run \+ \(isPR \? XP\.pr : 0\);/);
  assert.match(src, /s2\.runs\.push\(\{ date: r\.date \|\| new Date\(\)\.toISOString\(\), \.\.\.r, xp \}\);/);
  assert.match(src, /addXP\(xp, 'run'\);/);
});

test('מבדק 3 ק״מ: אחרי התוצאה ממשיכים לשחרור, והמרחק שנשמר הוא של כל האימון כשנמדד', () => {
  const body = src.slice(src.indexOf('function testDone()'), src.indexOf('function finish('));
  assert.match(body, /testT = /);
  assert.match(body, /nextSeg\(\);/);
  assert.doesNotMatch(body, /finish\(/);
  assert.match(src, /const distGuess = measured >= 200 \? Math\.round\(measured \/ 10\) \/ 100 : testSec \? 3 : '';/);
  assert.match(src, /timeSec: testSec,/);
});

// --- GPS: שעון מדומה ומדידה אחת בשנייה ---
let NOW = 1.8e12, handler = null;
const realNow = Date.now;
const LAT0 = 32.08, LON0 = 34.78, MX = 111320 * Math.cos((LAT0 * Math.PI) / 180), MY = 110540;
const rng = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
async function sim({ dur, speed, noise, acc, seed = 1, devSpeed = false }) {
  Date.now = () => NOW;
  Object.defineProperty(globalThis, 'navigator', { value: { geolocation: { watchPosition: (cb) => { handler = cb; return 1; }, clearWatch() {} } }, configurable: true });
  const { gpsTracker } = await import('../js/devices/gps.js');
  try {
    NOW = 1.8e12; const t0 = NOW, g = gpsTracker(), r = rng(seed); g.start(); let along = 0;
    for (let t = 0; t <= dur; t++) {
      NOW = t0 + t * 1000; const v = typeof speed === 'function' ? speed(t) : speed; if (t > 0) along += v;
      const x = along + (r() * 2 - 1) * noise, y = (r() * 2 - 1) * noise;
      handler({ coords: { latitude: LAT0 + y / MY, longitude: LON0 + x / MX, accuracy: acc, speed: devSpeed ? v : null }, timestamp: NOW });
    }
    return { dist: g.distM, along, path: g.path.length };
  } finally { Date.now = realNow; }
}

test('עמידה במקום עשר דקות בלי מהירות מהמכשיר: המרחק לא מצטבר', async () => {
  for (const [noise, acc] of [[5, 5], [10, 10], [15, 15], [40, 80]]) for (const seed of [1, 2, 3, 4, 5]) {
    const o = await sim({ dur: 600, speed: 0, noise, acc, seed });
    assert.ok(o.dist <= 15, `רעש ±${noise}, זרע ${seed}: ${o.dist.toFixed(1)} מ׳`);
  }
});

test('הליכה איטית (12:00–15:00 לק״מ) בלי מהירות מהמכשיר עדיין נספרת, וגם הליכה שמתחילה אחרי עמידה', async () => {
  for (const pace of [600, 720, 900]) for (const [noise, acc] of [[0, 5], [10, 10], [15, 15]]) {
    const o = await sim({ dur: 1800, speed: 1000 / pace, noise, acc });
    const err = (o.dist / o.along - 1) * 100;
    assert.ok(err > -3 && err < 8, `קצב ${pace}, רעש ±${noise}: ${err.toFixed(1)}%`);
  }
  const o = await sim({ dur: 720, speed: (t) => (t <= 120 ? 0 : 1000 / 900), noise: 10, acc: 10 });
  assert.ok(Math.abs(o.dist / o.along - 1) < 0.06, `${o.dist.toFixed(0)} מתוך ${o.along.toFixed(0)}`);
});

test('עם מהירות מהמכשיר ההתנהגות לא השתנתה: עמידה — אפס, הליכה — נספרת', async () => {
  assert.equal((await sim({ dur: 600, speed: 0, noise: 10, acc: 10, devSpeed: true })).dist, 0);
  const o = await sim({ dur: 1800, speed: 1000 / 600, noise: 0, acc: 5, devSpeed: true });
  assert.ok(Math.abs(o.dist / o.along - 1) < 0.01);
});

test('אימון מתוכנן שנעצר מוקדם נשמר, אבל לא מסמן את היום בתוכנית (כמו שמירה חלקית של אימון)', () => {
  assert.match(src, /const partial = run\.type !== 'free' && \(run\.type === 'test' \? !testSec : totalPlanned > 0 && dur < totalPlanned \* 0\.6\);/);
  assert.match(src, /\.\.\.\(partial \? \{ partial: true \} : \{\}\)/);
  assert.match(src, /r\.day != null && !r\.partial && !s2\.plan\.completedDays\.includes\(r\.day\)/);
  assert.match(src, /r\.day != null && !r\.partial\) \{ const msg = maybeAdvanceWeek\(\)/);
});

// ───── מפה וסימון (25.11.2026) ─────
test('סימוני הקילומטרים מחולקים לפי המרחק שנמדד, ומסלול קצר מוגדל למסגרת', async () => {
  const { kmPoints } = await import('../js/ui/route-image.js');
  const { fitView, fitScale, project } = await import('../js/ui/map.js');
  const MY = 111195, line = (m, n = 60) => Array.from({ length: n + 1 }, (_, i) => [32.08 + (m * i) / n / MY, 34.78]);
  const at = (p) => Math.round(((p[0] - 32.08) * MY) / 5) * 5;
  const r = line(2450);   // המסלול השמור קצר ב-2% מ-2,500 מ׳ שנמדדו
  assert.deepEqual(kmPoints(r).map(at), [1000, 2000]);
  assert.deepEqual(kmPoints(r, 2500).map(at), [980, 1960]);            // 1,000 מתוך 2,500 = 40% מהמסלול
  assert.equal(kmPoints(line(2940), 2990).length, 2);                  // לא יותר סימונים מקילומטרים שלמים
  assert.equal(kmPoints(line(2960), 3020).length, 3);                  // שלושה ק״מ נמדדו — שלושה סימונים, אף שהמסלול השמור קצר מ-3,000
  assert.deepEqual(kmPoints(r, 5000).map(at), [1000, 2000]);           // מרחק שתוקן ביד ורחוק מאורך המסלול — לא משמש
  const sq = [[32.08, 34.78], [32.0818, 34.78], [32.0818, 34.7821], [32.08, 34.7821], [32.08, 34.78]];
  const { z } = fitView(sq, 393, 220, 16), s = fitScale(sq, 393, 220, z, 16);
  const a = project(32.0818, 34.78, z), d = project(32.08, 34.7821, z), bw = (d[0] - a[0]) * s, bh = (d[1] - a[1]) * s;
  assert.ok(s >= 1 && s <= 1.7); assert.ok(bw <= 393 - 32 + 0.5 && bh <= 220 - 32 + 0.5, 'המסלול נשאר בתוך המסגרת');
  assert.ok(Math.max(bw / (393 - 32), bh / (220 - 32)) > 0.58, 'ולא נשאר קטן');
});
