// מסלול ההליכה (שירה): סוגי ההליכות, אורך, התקדמות, שבוע התאוששות, רמות, תחום נוסף, תזונה, קול ונכסים
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { isWalk, buildWalkSession, buildWalkSessions, buildWalkWeek, walkLongMinutes, walkLevelUp, walkLevel, WALK_TYPES, WALK_MINUTES } from '../js/engine/walking.js';
import { buildWeek, goalsFor, goalForTrack, phaseFor, applyReadiness, extraCoach, canExtra } from '../js/engine/program.js';
import { hasGym, sessionCoach } from '../js/engine/cali.js';
import { targets, loadOf } from '../js/engine/nutrition.js';
import { coachSays, VOICE_LINES } from '../js/data/voice-lines.js';
import { coachesFor, COACHES, demoVideo, demoPoster } from '../js/data/coaches.js';
import { SEG_LABEL } from '../js/engine/running.js';

const P = (o = {}) => ({ name: 'רות', sex: 'f', age: 52, heightCm: 164, weightKg: 68, track: 'walk', coach: 'shira', goal: 'health', days: 4, level: 1, walkMin: 30, injuries: [], dislikes: [], ...o });
const has = (p) => existsSync(new URL('../' + p, import.meta.url));
const KINDS = ['warm', 'stroll', 'brisk', 'power', 'cool'];

test('Walking track: helpers, coach and goals', () => {
  const p = P(); assert.equal(isWalk(p), true); assert.equal(hasGym(p), false); assert.equal(phaseFor(p, 0).id, 'walk');
  assert.deepEqual(coachesFor('walk').map((c) => c.id), ['shira']); assert.deepEqual(coachesFor('run').map((c) => c.id), ['guy', 'shira']); assert.equal(sessionCoach(p, { track: 'walk' }), 'shira');
  assert.deepEqual(goalsFor('walk'), ['health', 'cut']); assert.equal(goalForTrack('strength', 'walk'), 'health'); assert.equal(goalForTrack('health', 'gym'), 'combat');
  assert.equal(walkLevel(P({ level: 7 })), 3); for (const k of KINDS) assert.ok(SEG_LABEL[k], k);
});

test('A walk fits its length, opens with a warm-up, ends with a cool-down, and gets harder with the level', () => {
  for (const level of [1, 2, 3]) for (const mins of WALK_MINUTES) for (const type of Object.keys(WALK_TYPES)) {
    const r = buildWalkSession(P({ level, walkMin: mins }), type);
    assert.equal(r.walk, true); assert.equal(r.segs[0].kind, 'warm'); assert.equal(r.segs.at(-1).kind, 'cool');
    assert.ok(r.segs.every((s) => KINDS.includes(s.kind) && s.sec >= 60 && s.label), `${type} L${level} ${mins}`);
    assert.ok(Math.abs(r.totalSec - mins * 60) <= 120, `${type} L${level} ${mins}: ${r.totalSec}s`);
    if (type === 'wEasy') assert.ok(r.segs.slice(1, -1).every((s) => s.kind === 'stroll'));
    if (type === 'wInt') assert.ok(r.segs.filter((s) => s.kind === 'power').length >= 3);
  }
  const power = (level) => buildWalkSession(P({ level }), 'wInt').segs.find((s) => s.kind === 'power').sec;
  assert.ok(power(1) < power(2) && power(2) < power(3), 'longer power intervals at higher levels');
  assert.ok(buildWalkSession(P({ level: 1 }), 'wBrisk').segs.some((s) => s.kind === 'stroll'), 'beginners get easy breaks');
  assert.ok(buildWalkSession(P({ level: 2 }), 'wBrisk').segs.slice(1, -1).every((s) => s.kind === 'brisk'), 'regular walkers go nonstop');
});

test('Walking week: the mix by days, a long walk that grows, and a recovery week', () => {
  for (const days of [2, 3, 4, 5, 6]) {
    const w = buildWalkWeek(P({ days }));
    assert.equal(w.sessions.length, days); assert.ok(w.sessions.every((s) => s.track === 'walk' && s.runOnly && s.run.walk && s.minutes > 0));
    assert.equal(new Set(w.sessions.map((s) => s.name)).size, days, 'distinct names'); assert.equal(w.sessions.at(-1).run.type, 'wLong');
    if (days >= 3) assert.ok(w.sessions.some((s) => s.run.type === 'wInt'));
  }
  assert.equal(walkLongMinutes(P(), 0), 45); assert.ok(walkLongMinutes(P(), 2) > walkLongMinutes(P(), 0)); assert.ok(walkLongMinutes(P({ walkMin: 60 }), 40) <= 90);
  const build = buildWalkSessions(P(), 4, { blockIndex: 0, weekInBlock: 2 }), easy = buildWalkSessions(P(), 4, { blockIndex: 0, weekInBlock: 3 });
  assert.ok(easy.at(-1).minutes < build.at(-1).minutes, 'shorter long walk in the recovery week'); assert.ok(!easy.some((s) => s.run.type === 'wInt'), 'no intervals in the recovery week');
  const one = buildWeek(P()).sessions[0]; assert.deepEqual(applyReadiness(one, 0.2).run, one.run, 'the walk is the same on a low day');
});

test('Walking: level-up, nutrition, and as an extra next to another track', () => {
  const now = Date.now(), walks = (n) => Array.from({ length: n }, (_, i) => ({ walk: true, date: new Date(now - i * 864e5 * 2).toISOString() }));
  assert.equal(walkLevelUp(P(), walks(13), now), true); assert.equal(walkLevelUp(P(), walks(6), now), false); assert.equal(walkLevelUp(P({ level: 3 }), walks(14), now), false);
  assert.equal(walkLevelUp(P(), walks(13).map((r) => ({ ...r, walk: false })), now), false, 'runs do not count');
  assert.equal(loadOf({ track: 'walk', runOnly: true, items: [] }), 'light'); assert.ok(targets(P()).kcal > 1200);
  const gym = P({ track: 'gym', coach: 'ori', goal: 'muscle', days: 5, level: 2, extras: { walk: 2 } });
  assert.ok(canExtra(gym, 'walk')); assert.equal(extraCoach(gym, 'walk'), 'shira'); assert.ok(!canExtra(P(), 'walk'));
  const w = buildWeek(gym), ex = w.sessions.filter((x) => x.xtrack === 'walk');
  assert.equal(w.sessions.length, 5); assert.equal(ex.length, 2); assert.ok(ex.every((x) => x.extra && x.coach === 'shira' && x.run.walk && /^הליכה/.test(x.name) && !/· הליכה/.test(x.name)));
});

test('Walking voice and assets: Shira has every line, a demo video and four music tracks', () => {
  const KEYS = ['walk_hello', 'walk_warm', 'walk_stroll', 'walk_brisk', 'walk_power', 'walk_last', 'walk_cool', 'walk_half', 'walk_form', 'walk_talk', 'walk_done'];
  for (const k of KEYS) { assert.ok(VOICE_LINES[k], k); assert.ok(coachSays(k, 'shira'), k); assert.ok(!coachSays(k, 'guy') && !coachSays(k, 'ori'), `${k} only for Shira`); assert.ok(has(`assets/voice/shira/${k}.mp3`), `he ${k}`); assert.ok(has(`assets/voice-en/shira/${k}.mp3`), `en ${k}`); }
  assert.ok(has(demoVideo('shira', 'outdoor_walk')) && has(demoPoster('shira', 'outdoor_walk')));
  for (let i = 1; i <= 4; i++) assert.ok(has(`assets/music/walk_${i}.mp3`), `walk_${i}`);
  assert.deepEqual(COACHES.shira.tracks, ['run', 'walk']);
});
