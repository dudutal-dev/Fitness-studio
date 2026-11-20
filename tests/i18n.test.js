// הגרסה האנגלית: לכל קטע טקסט בעברית בקוד יש תרגום (i18n/en), והבנייה לא משאירה עברית במחרוזות
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('English edition: every Hebrew text piece has a translation', () => {
  const out = execFileSync('node', [new URL('../tools/i18n.mjs', import.meta.url).pathname, 'stats'], { encoding: 'utf8' });
  const m = /translated (\d+) of (\d+) text pieces/.exec(out);
  assert.ok(m, out.slice(-200));
  assert.equal(Number(m[1]), Number(m[2]), `${m[2] - m[1]} pieces have no English yet — run: node tools/i18n.mjs todo`);
});
