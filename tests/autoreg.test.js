// התאמת המשקל בין סטים לפי דירוג הסט: קל — מעלים; קשה מהיעד — מורידים; על היעד — נשארים
import test from 'node:test';
import assert from 'node:assert/strict';
import { nextSetLoad } from '../js/engine/progression.js';

const bar = { inc: 5, equip: 'מוט' }, db = { inc: 2, equip: 'משקולות' }, it = (rpe, reps = [8, 12]) => ({ reps, rpe });

test('קל ובראש הטווח — מעלים צעד', () => {
  assert.deepEqual(nextSetLoad({ w: 60, reps: 12, rpe: 6.5 }, it(8), bar), { w: 65, why: 'up' });
  assert.equal(nextSetLoad({ w: 60, reps: 9, rpe: 6.5 }, it(8), bar).why, null);
});
test('"קשה" כשיעד השבוע נמוך יותר — מורידים מעט; בשבוע שיא "קשה" הוא היעד ונשארים', () => {
  assert.deepEqual(nextSetLoad({ w: 60, reps: 10, rpe: 9 }, it(7), bar), { w: 57.5, why: 'down' });
  assert.deepEqual(nextSetLoad({ w: 60, reps: 10, rpe: 9 }, it(8), bar), { w: 57.5, why: 'down' });
  assert.deepEqual(nextSetLoad({ w: 60, reps: 10, rpe: 9 }, it(8.5), bar), { w: 60, why: null });
  assert.deepEqual(nextSetLoad({ w: 60, reps: 10, rpe: 8 }, it(7), bar), { w: 60, why: null });
});
test('"עד הקצה" — מורידים גם בתוך הטווח, ויותר כשלא הגיעו למינימום החזרות', () => {
  assert.deepEqual(nextSetLoad({ w: 100, reps: 9, rpe: 10 }, it(8.5), bar), { w: 95, why: 'down' });
  assert.deepEqual(nextSetLoad({ w: 100, reps: 6, rpe: 10 }, it(8.5), bar), { w: 92.5, why: 'down' });
  assert.deepEqual(nextSetLoad({ w: 100, reps: 6, rpe: 9 }, it(8.5), bar), { w: 95, why: 'down' });
});
test('משקלים קטנים: צעד אחד למטה אם הוא סביר, אחרת נשארים; מוט לא יורד מ-20', () => {
  assert.deepEqual(nextSetLoad({ w: 12, reps: 10, rpe: 9 }, it(7), db), { w: 11, why: 'down' });
  assert.deepEqual(nextSetLoad({ w: 5, reps: 10, rpe: 9 }, it(7), db), { w: 5, why: null });
  assert.deepEqual(nextSetLoad({ w: 20, reps: 10, rpe: 10 }, it(7), bar), { w: 20, why: null });
  assert.deepEqual(nextSetLoad({ w: 0, reps: 10, rpe: 10 }, it(7), db), { w: 0, why: null });
});
