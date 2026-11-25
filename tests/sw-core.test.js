// כל מודול שהאפליקציה טוענת חייב להיות ברשימת CORE של ה-service worker (25.11.2026):
// js/engine/med-journey.js נוסף לקוד ולא לרשימה, ו-MOVA לא נפתחה בלי רשת אחרי ביקור אחד (מסך ריק).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

test('כל המודולים שנטענים מ-js/app.js נמצאים ב-CORE', () => {
  const sw = readFileSync('sw.js', 'utf8'), core = new Set([...sw.slice(sw.indexOf('const CORE'), sw.indexOf('];', sw.indexOf('const CORE'))).matchAll(/'([^']+)'/g)].map((m) => m[1]));
  const seen = new Set(), todo = ['js/app.js'];
  while (todo.length) { const f = todo.pop(); if (seen.has(f)) continue; seen.add(f); assert.ok(existsSync(f), `חסר בדיסק: ${f}`);
    for (const m of readFileSync(f, 'utf8').matchAll(/(?:from\s*|import\s*\(\s*|^\s*import\s*)['"](\.{1,2}\/[^'"]+\.js)['"]/gm)) todo.push(normalize(join(dirname(f), m[1])).replace(/\\/g, '/')); }
  const missing = [...seen].filter((f) => !core.has(f));
  assert.deepEqual(missing, [], `מודולים שלא ב-CORE: ${missing.join(', ')}`);
});
