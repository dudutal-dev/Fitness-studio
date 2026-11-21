// שמות שהמאמנים פונים אליהם: התאמה לפי השם הפרטי והמין, ולכל שם יש הקלטות אצל כל המאמנים
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { NAMES, nameEntry } from '../js/data/names.js';

test('עשרת השמות הנפוצים קיימים, ושם שמתאים לשני המינים מופיע פעמיים', () => {
  for (const n of ['טל', 'שירה', 'עומר', 'יפעת', 'דודו', 'אלכס', 'עדי', 'ערן', 'אביב', 'זיו', 'שרית']) assert.ok(NAMES.some((x) => x.name === n), n);
  for (const n of ['טל', 'עומר', 'אלכס', 'עדי', 'אביב', 'זיו']) assert.deepEqual(NAMES.filter((x) => x.name === n).map((x) => x.sex).sort(), ['f', 'm'], n);
  assert.equal(new Set(NAMES.map((x) => x.slug)).size, NAMES.length);
});
test('התאמה: לפי המילה הראשונה בשם ולפי המין', () => {
  assert.equal(nameEntry({ name: 'דודו טל', sex: 'm' }).slug, 'dudu');
  assert.equal(nameEntry({ name: ' טל ', sex: 'f' }).slug, 'tal_f');
  assert.equal(nameEntry({ name: 'טל', sex: 'm' }).slug, 'tal');
  assert.equal(nameEntry({ name: 'יפעת', sex: 'm' }), null);
  assert.equal(nameEntry({ name: 'מיכל', sex: 'f' }), null);
  // באותיות לטיניות, ובלי תלות באותיות גדולות
  assert.equal(nameEntry({ name: 'Dudu', sex: 'm' }).slug, 'dudu');
  assert.equal(nameEntry({ name: 'yifat cohen', sex: 'f' }).slug, 'yifat');
  assert.equal(nameEntry({ name: '', sex: 'm' }), null);
});
test('לכל שם יש הקלטות אצל כל מאמן', () => {
  for (const coach of readdirSync(new URL('../assets/voice/', import.meta.url))) {
    const base = new URL(`../assets/voice/${coach}/names/`, import.meta.url);
    if (!existsSync(base)) continue;
    for (const n of NAMES) for (const k of ['hello', 'go', 'workout_done']) assert.ok(existsSync(new URL(`${n.slug}/${k}.mp3`, base)), `${coach}/names/${n.slug}/${k}`);
  }
});
