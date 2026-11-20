// שיעורים נוספים לצד המסלול הראשי (profile.extras): לוח האימונים והתזונה מתעדכנים יחד.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWeek, extrasOf } from '../js/engine/program.js';
import { sessionCoach } from '../js/engine/cali.js';
import { targets, weeklyLoad, activityKey } from '../js/engine/nutrition.js';

const P = (o = {}) => ({ name: 'דנה', sex: 'f', age: 30, heightCm: 165, weightKg: 60, goal: 'tone', level: 2, days: 4, sessionMin: 45, injuries: [], coach: 'lia', gymCoach: 'ori', lifts: {}, dislikes: [], dislikedFoods: [], ...o });
const tracks = (w) => w.sessions.map((s) => (s.extra ? s.track : 'main'));

test('extra classes join the week; the main track keeps the rest', () => {
  const w = buildWeek(P({ track: 'pil', days: 5, extras: { yoga: 2 } }));
  assert.equal(w.sessions.length, 5);
  assert.equal(tracks(w).filter((t) => t === 'yoga').length, 2);
  assert.equal(tracks(w).filter((t) => t === 'main').length, 3);
  assert.deepEqual(w.sessions.map((s) => s.day), [1, 2, 3, 4, 5]);
  for (const s of w.sessions) assert.ok(s.items?.length || s.run, `${s.name} has content`);
});

test('each extra class is led by its own coach', () => {
  const p = P({ track: 'gym', coach: 'ori', days: 6, extras: { yoga: 1, pil: 1, hiit: 1 } });
  const w = buildWeek(p);
  const by = Object.fromEntries(w.sessions.filter((s) => s.extra).map((s) => [s.track, sessionCoach(p, s)]));
  assert.deepEqual(by, { yoga: 'yael', pil: 'lia', hiit: 'lia' });
  assert.equal(sessionCoach(p, w.sessions.find((s) => !s.extra)), 'ori');
});

test('extras never take the whole week, and the main track is not its own extra', () => {
  assert.ok(buildWeek(P({ track: 'gym', coach: 'ori', days: 3, extras: { yoga: 3, pil: 3 } })).sessions.some((s) => !s.extra));
  assert.deepEqual(extrasOf(P({ track: 'pil', extras: { pil: 2 } })), []);
  assert.equal(buildWeek(P({ track: 'pil', extras: { pil: 2 } })).sessions.every((s) => !s.extra), true);
});

test('extras are spread through the week, not stacked at the end', () => {
  const t = tracks(buildWeek(P({ track: 'gym', coach: 'ori', days: 6, extras: { yoga: 2 } })));
  assert.ok(t.indexOf('yoga') < 4 && t[0] === 'main', t.join(','));
});

test('nutrition follows the mix: protein by the most demanding discipline, energy by the real weekly load', () => {
  const yoga = targets(P({ track: 'yoga', coach: 'yael', days: 3 }));
  const yogaGym = targets(P({ track: 'gym', coach: 'ori', days: 5, extras: { yoga: 2 } }));
  const yogaHiit = targets(P({ track: 'yoga', coach: 'yael', days: 5, extras: { hiit: 2 } }));
  assert.ok(yogaGym.perKg > yoga.perKg, 'strength work raises protein');
  assert.ok(yogaHiit.perKg > yoga.perKg, 'adding HIIT to yoga raises protein');
  assert.ok(weeklyLoad(P({ track: 'gym', days: 5 })) > weeklyLoad(P({ track: 'gym', days: 5, extras: { yoga: 2 } })), 'two yoga classes cost less than two gym sessions');
  assert.equal(activityKey(P({ track: 'yoga', days: 3 })), 'light');
  assert.equal(activityKey(P({ track: 'gym', days: 4 })), 'base');
  assert.equal(activityKey(P({ track: 'gym', days: 6 })), 'training');
  assert.equal(activityKey(P({ track: 'gym', days: 6, extras: { yoga: 2, pil: 1 } })), 'base');
});
