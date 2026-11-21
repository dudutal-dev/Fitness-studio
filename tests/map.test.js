// מפת המסלול, רישום המסלול מה-GPS, ויעדי הקצב בהליכה
import test from 'node:test';
import assert from 'node:assert/strict';
import { project, fitView } from '../js/ui/map.js';
import { simplifyPath } from '../js/devices/gps.js';
import { walkTarget, paceVerdict } from '../js/engine/walking.js';

test('היטל המפה: מרכז העולם, ואריח ידוע של תל אביב', () => {
  assert.deepEqual(project(0, 0, 0), [128, 128]);
  const [x, y] = project(32.0853, 34.7818, 15);
  assert.deepEqual([Math.floor(x / 256), Math.floor(y / 256)], [19549, 13297]);
});
test('fitView: כל המסלול נכנס במסגרת, בזום הגבוה ביותר האפשרי', () => {
  const path = [[32.08, 34.78], [32.09, 34.79]], v = fitView(path, 390, 280);
  const a = project(32.09, 34.78, v.z), b = project(32.08, 34.79, v.z);
  assert.ok(b[0] - a[0] <= 390 - 56 && b[1] - a[1] <= 280 - 56);
  const a2 = project(32.09, 34.78, v.z + 1), b2 = project(32.08, 34.79, v.z + 1);
  assert.ok(b2[0] - a2[0] > 390 - 56 || b2[1] - a2[1] > 280 - 56);
  assert.equal(fitView([[32.08, 34.78], [32.08001, 34.78001]], 390, 280).z, 17);
});
test('המסלול לשמירה: עד 150 נקודות, מתחיל ונגמר באותן נקודות', () => {
  const p = [...Array(2000)].map((_, i) => [32 + i / 1e5, 34.7 + i / 2e5]), o = simplifyPath(p);
  assert.equal(o.length, 150); assert.deepEqual(o[0], [32, 34.7]); assert.deepEqual(o.at(-1), [32.01999, 34.71]);
  assert.deepEqual(simplifyPath([]), []); assert.equal(simplifyPath([[1, 2], [3, 4]]).length, 2);
  assert.ok(JSON.stringify(o).length < 3500);
});
test('יעדי הקצב בהליכה: מהיר ונמרץ לפי הרמה; בהתאוששות — לא מהר מדי', () => {
  for (const level of [1, 2, 3]) {
    const b = walkTarget({ level }, 'brisk'), pw = walkTarget({ level }, 'power'), st = walkTarget({ level }, 'stroll');
    assert.ok(pw.max < b.max, 'הקטע הנמרץ מהיר מההליכה המהירה'); assert.equal(st.min, b.max);
  }
  assert.ok(walkTarget({ level: 3 }, 'brisk').max < walkTarget({ level: 1 }, 'brisk').max);
  assert.equal(walkTarget({ level: 1 }, 'warm'), null);
  const b = walkTarget({ level: 2 }, 'brisk');   // 10:00 לק״מ
  assert.equal(paceVerdict(b, 590), 'ok'); assert.equal(paceVerdict(b, 620), 'ok'); assert.equal(paceVerdict(b, 700), 'slow');
  const st = walkTarget({ level: 2 }, 'stroll');
  assert.equal(paceVerdict(st, 700), 'ok'); assert.equal(paceVerdict(st, 500), 'fast');
  assert.equal(paceVerdict(b, null), null); assert.equal(paceVerdict(null, 600), null);
});
