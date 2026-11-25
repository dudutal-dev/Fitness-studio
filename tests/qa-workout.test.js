// תיקונים מהבדיקה המקיפה (25.11.2026) — אימון חי, היסטוריה והתאמת משקל
import test from 'node:test';
import assert from 'node:assert/strict';
import { nextSetLoad } from '../js/engine/progression.js';
import * as HE from '../js/engine/history-edit.js';

const { updateSession, deleteSession } = HE;
const bar = { inc: 5, equip: 'מוט' };

test('"קל" מעלה משקל רק בראש טווח החזרות — לא חזרה אחת מתחתיו', () => {
  assert.deepEqual(nextSetLoad({ w: 42.5, reps: 11, rpe: 6.5 }, { reps: [8, 12], rpe: 8 }, bar), { w: 42.5, why: null });
  assert.deepEqual(nextSetLoad({ w: 42.5, reps: 12, rpe: 6.5 }, { reps: [8, 12], rpe: 8 }, bar), { w: 47.5, why: 'up' });
  assert.equal(nextSetLoad({ w: 42.5, reps: 13, rpe: 6 }, { reps: [8, 12], rpe: 8 }, bar).why, 'up');
});

const base = (sessions, history = {}) => ({ xp: 500, profile: {}, plan: { weekStart: '2026-11-22', completedDays: [] }, sessions, history, runs: [] });
const d = '2026-11-24T18:00:00.000Z';
const sec = (exId, role, n = 30) => ({ exId, role, unit: 'sec', target: [n, n], sets: [{ w: 0, reps: n, done: true }, { w: 0, reps: n, done: true }] });

test('שמירה בעורך: HIIT, מוביליטי וסיומת לא נכתבים להיסטוריית הכוח — כמו באימון החי', () => {
  const st = base([{ id: 's1', date: d, name: 'HIIT', track: 'hiit', exercises: [sec('air_squat', 'hiit'), sec('knee_pushup', 'hiit'), sec('cat_cow', 'mob'), sec('burpee', 'finisher')] }]);
  updateSession(st, 0, { date: d, exercises: structuredClone(st.sessions[0].exercises) });
  assert.deepEqual(Object.keys(st.history), []);
  assert.equal(st.sessions[0].setsDone, 8);
  // תרגיל כוח רגיל ממשיך להיכתב
  const st2 = base([{ id: 's2', date: d, name: 'A', exercises: [{ exId: 'bench_press', role: 'main', target: [8, 10], sets: [{ w: 60, reps: 10, done: true }] }, sec('air_squat', 'hiit')] }]);
  updateSession(st2, 0, { date: d, exercises: structuredClone(st2.sessions[0].exercises) });
  assert.deepEqual(Object.keys(st2.history), ['bench_press']);
});

test('שורה שנשמרה בשניות מזוהה לפי היחידה שנשמרה, ולא נספרת בנפח', () => {
  assert.equal(HE.isTimed({ exId: 'air_squat', unit: 'sec' }), true);    // תרגיל חזרות שבוצע לפי זמן (HIIT)
  assert.equal(HE.isTimed({ exId: 'air_squat' }), false);
  assert.equal(HE.isTimed({ exId: 'plank' }), true);                     // רשומה ישנה בלי יחידה — לפי סוג התרגיל
  const st = base([{ id: 's1', date: d, name: 'x', exercises: [{ exId: 'air_squat', role: 'hiit', unit: 'sec', target: [30, 30], sets: [{ w: 10, reps: 30, done: true }] }] }]);
  updateSession(st, 0, { date: d, exercises: structuredClone(st.sessions[0].exercises) });
  assert.equal(st.sessions[0].volume, 0);
});

test('מחיקה מורידה את ה-XP שהרשומה נתנה', () => {
  // רשומה חדשה: השדה xp
  let st = base([{ id: 'a', date: d, name: 'מדיטציית לילה', still: 'sleep', durationSec: 400, exercises: [], xp: 36 }]);
  deleteSession(st, 0); assert.equal(st.xp, 464);
  st = base([{ id: 'a', date: d, name: 'A', exercises: [], prs: ['bench_press'], xp: 170 }]);
  deleteSession(st, 0); assert.equal(st.xp, 330);
  // רשומות ישנות בלי השדה: לפי מה שנשמר — מדיטציה מלאה (15 / 20 / 30 דקות בדיוק) 72, חלקית 36; אימון 120 ועוד 50 לכל שיא
  st = base([{ id: 'a', date: d, name: 'm', still: 'sleep', durationSec: 900, exercises: [] }]);
  deleteSession(st, 0); assert.equal(st.xp, 428);
  st = base([{ id: 'a', date: d, name: 'm', still: 'wake', durationSec: 431, exercises: [] }]);
  deleteSession(st, 0); assert.equal(st.xp, 464);
  st = base([{ id: 'a', date: d, name: 'A', exercises: [], prs: ['bench_press', 'back_squat'] }]);
  deleteSession(st, 0); assert.equal(st.xp, 280);
  st = base([{ id: 'a', date: d, name: 'A', exercises: [] }]);
  deleteSession(st, 0); assert.equal(st.xp, 380);
});
