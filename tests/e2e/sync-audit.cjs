// בדיקת סנכרון מקיפה: לכל תרגיל × לכל מאמן מריצה סט מודרך של 10 חזרות בדפדפן ומודדת:
//  1. ספירה מלאה: המאמן אומר 1..10 בסדר, כל מספר פעם אחת
//  2. תזמון: כל מספר נאמר ≤150ms אחרי סיום החזרה בפועל
//  3. אין "גרירה": אף מילה לא נמשכת לתוך השלב הבא (לא נקטעת ולא מאחרת)
//  4. וידאו: בכל דגימה הווידאו נמצא בקטע הנכון של החזרה (ירידה/עלייה), ובסוף כל שלב קרוב לנקודת המפנה
// הרצה: node tests/e2e/sync-audit.cjs [webmDir] [parallel]   (שרת על localhost:8080)
const { chromium } = require('playwright');
const fs = require('fs');
const WEBM = process.argv[2] || '/tmp/claude-0/webm';
const PAR = Number(process.argv[3] || 6);
const BASE = 'http://localhost:8080/';
const REPS = 10;

async function baseState(b) {
  const p = await b.newPage();
  await p.goto(BASE); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.click('[data-g=skip]'); await p.waitForTimeout(300);
  await p.click('[data-act=next]'); await p.click('[data-act=next]'); await p.fill('input[name=name]', 'עומר');
  for (let i = 0; i < 6; i++) { await p.click('[data-act=next]'); await p.waitForTimeout(80); }
  await p.waitForTimeout(3500);
  const st = await p.evaluate(() => localStorage.getItem('fitness_studio_v1'));
  await p.close();
  return JSON.parse(st);
}

async function runOne(b, state, coach, ex) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const s = structuredClone(state); s.profile.coach = coach; s.settings.warmup = false; // בודקים את התרגיל עצמו
  await ctx.addInitScript((st) => { if (!sessionStorage.getItem('init')) { localStorage.setItem('fitness_studio_v1', st); sessionStorage.setItem('init', '1'); } }, JSON.stringify(s));
  await ctx.route(/assets\/demos\/(\w+)\/(\w+)\.mp4/, (route, req) => {
    const [, c, e] = req.url().match(/demos\/(\w+)\/(\w+)\.mp4/);
    const f = `${WEBM}/${c}/${e}.webm`;
    if (!fs.existsSync(f)) return route.continue();
    const buf = fs.readFileSync(f); const rg = req.headers().range;
    if (rg) { const m = rg.match(/bytes=(\d+)-(\d*)/); const a = +m[1], z = m[2] ? +m[2] : buf.length - 1;
      return route.fulfill({ status: 206, headers: { 'Content-Type': 'video/webm', 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${a}-${z}/${buf.length}`, 'Content-Length': String(z - a + 1) }, body: buf.subarray(a, z + 1) }); }
    return route.fulfill({ status: 200, headers: { 'Content-Type': 'video/webm', 'Accept-Ranges': 'bytes' }, body: buf });
  });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(BASE + '#/home'); await p.waitForTimeout(600);
  await p.evaluate(async ([exId, reps]) => {
    const m = await import('./js/views/workout.js');
    m.startWorkout({ name: 'audit', items: [{ exId, role: 'main', sets: 1, reps: [reps, reps], rest: 30, rpe: 8 }] });
  }, [ex.id, REPS]);
  await p.waitForTimeout(2500); // טעינת קליפים + וידאו
  // מכשור: שינויי שלב + דגימות וידאו בכל פריים
  await p.evaluate(() => {
    window.__ph = []; window.__vs = [];
    const ph = () => document.querySelector('#ph');
    const v = document.querySelector('.live video');
    let last = '';
    (function tick() {
      const el = ph();
      if (el && el.textContent !== last) { last = el.textContent; window.__ph.push({ t: performance.now(), label: last, ct: v.currentTime }); }
      if (el) window.__vs.push([performance.now(), v.currentTime, last]);
      if (!document.querySelector('.rpe')) requestAnimationFrame(tick);
    })();
    window.__voiceLog.length = 0; window.__phaseLog = [];
  });
  await p.click('[data-act=go]');
  await p.waitForSelector('.rpe', { timeout: 120000 });
  await p.waitForTimeout(1500);
  const data = await p.evaluate(async (exId) => {
    const t = await import('./js/data/demo-timing.js');
    return { ph: (window.__phaseLog || []).map((x) => ({ t: x.t, label: x.label })), vs: window.__vs, voice: window.__voiceLog.slice(), segs: t.DEMO_TIMING[document.querySelector('.coach-pip img').src.includes('noa') ? 'noa' : 'ori'][exId].segs };
  }, ex.id);
  await ctx.close();
  return analyze(data, ex, errs);
}

function analyze({ ph, vs, voice, segs }, ex, errs) {
  const phases = ph.filter((x) => !x.label.includes('היכון'));
  const isA = (lbl) => (ex.first === 'con' ? /עלייה|משיכה|לחיצה/ : /ירידה|שחרור/).test(lbl);
  // גבולות חזרות = כל כניסה לשלב A
  const repStarts = phases.filter((x, i) => isA(x.label) && (i === 0 || !isA(phases[i - 1].label))).map((x) => x.t);
  const repDur = (ex.tempo[0] + ex.tempo[1] + ex.tempo[2]) * 1000;
  const boundaries = repStarts.slice(1).concat(repStarts.length ? [repStarts[repStarts.length - 1] + repDur] : []);
  const nums = voice.filter((v) => /^n\d+$/.test(v.clip));
  const seq = nums.map((v) => +v.clip.slice(1));
  const countOk = JSON.stringify(seq) === JSON.stringify(Array.from({ length: REPS }, (_, i) => i + 1));
  const delays = nums.map((v, i) => (boundaries[i] != null ? v.t - boundaries[i] : null)).filter((d) => d != null);
  const maxDelay = delays.length ? Math.max(...delays) : null;
  // גרירה: קליפ קריטי שמסתיים אחרי תחילת השלב הבא (כלומר נקטע או מאחר)
  const phaseTimes = phases.map((x) => x.t).concat([boundaries[boundaries.length - 1] || 0]);
  let spill = 0, spillWorst = 0; const spills = [];
  for (const v of voice.filter((x) => x.critical && x.t > (phases[0]?.t || 0) - 50)) {
    const end = v.t + v.dur * 1000;
    const nextPh = phaseTimes.find((t) => t > v.t + 30);
    if (nextPh && end > nextPh + 60) { spill++; spillWorst = Math.max(spillWorst, end - nextPh); spills.push(`${v.clip}+${Math.round(end - nextPh)}ms@${phases.find((x) => x.t <= v.t + 30 && x.t >= v.t - 300)?.label || '?'}`); }
  }
  // וידאו
  let vin = 0, vn = 0;
  if (segs.length) {
    for (const [t, ct, lbl] of vs) {
      if (lbl.includes('היכון') || lbl.includes('החזק') || !lbl) continue;
      const a = isA(lbl);
      vn++;
      if (segs.some(([s, tu, e]) => (a ? ct >= s - 0.12 && ct <= tu + 0.1 : ct >= tu - 0.1 && ct <= e + 0.1))) vin++;
    }
  }
  return {
    ex: ex.id, name: ex.name, tempo: ex.tempo.join('-'), first: ex.first, segs: segs.length,
    countOk, said: seq.join(','), maxDelayMs: maxDelay == null ? null : Math.round(maxDelay),
    spill, spillWorstMs: Math.round(spillWorst), spills: spills.join(' '), videoSync: segs.length ? +(vin / Math.max(1, vn) * 100).toFixed(1) : null,
    cues: voice.filter((v) => !/^n\d+$/.test(v.clip) && v.critical).map((v) => v.clip).slice(0, 4).join(' '), errors: errs.join(';'),
  };
}

(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const state = await baseState(b);
  const exm = await (await b.newPage()).goto(BASE).then(async (r) => null);
  const page = await b.newPage(); await page.goto(BASE);
  const exercises = await page.evaluate(async () => (await import('./js/data/exercises.js')).EXERCISES.filter((e) => !['time', 'cardio'].includes(e.type)).map((e) => ({ id: e.id, name: e.name, tempo: e.tempo, first: e.first })));
  await page.close();
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  const jobs = [];
  for (const coach of ['ori', 'noa']) for (const ex of exercises) if (!only || only.includes(ex.id)) jobs.push({ coach, ex });
  const results = [];
  let i = 0;
  async function worker() {
    while (i < jobs.length) {
      const j = jobs[i++];
      try { const r = await runOne(b, state, j.coach, j.ex); results.push({ coach: j.coach, ...r }); process.stderr.write(`${j.coach}/${j.ex.id} ${r.countOk ? 'OK' : 'COUNT-FAIL'} delay=${r.maxDelayMs} spill=${r.spill} video=${r.videoSync}\n`); }
      catch (e) { results.push({ coach: j.coach, ex: j.ex.id, error: e.message }); process.stderr.write(`${j.coach}/${j.ex.id} ERROR ${e.message}\n`); }
    }
  }
  await Promise.all(Array.from({ length: PAR }, worker));
  fs.writeFileSync(process.env.OUT || '/tmp/claude-0/sync-audit.json', JSON.stringify(results, null, 1));
  await b.close();
})();
