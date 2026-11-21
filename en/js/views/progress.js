// מסך התקדמות: משקל עם מגמה, כוח (1RM משוער), ריצה, מפת שרירים, היסטוריה.
import { wantsNutrition } from '../engine/nutrition.js';
import { html, esc, on, fmtDate, fmtTime, ib, icon } from '../ui/dom.js';
import { lineChart, bars, bodyMap } from '../ui/charts.js';
import { get } from '../store.js';
import { EX, MUSCLES } from '../data/exercises.js';
import { bestSet } from '../engine/progression.js';
import { weightTrend, muscleLoad } from '../engine/stats.js';
import { weekSummary } from '../engine/summary.js';
import { next3kTarget } from '../engine/running.js';
import { weightSheet } from './home.js';
import { pickAndImport, garminHelp } from './garmin.js';
import { openSessionEditor, openRunEditor } from './history.js';
import { fmtPace } from '../engine/running.js';
import { isCali, hasCali, rungState, LADDERS, STRENGTH_LADDERS, SKILL_LADDERS, ladderOpen } from '../engine/cali.js';
import { isMob, hasMob } from '../engine/mob.js';
import { isRun } from '../engine/running.js';
import { mobProgress, mobTestSheet } from './mob-ui.js';

let tab = 'week';
let liftSel = null;
let showAll = false;

export function renderProgress(root) {
  const s = get();
  const p = s.profile;
  const cali = isCali(p);
  // קליסתניקס: סולמות במקום גרפי משקלים, ולשונית הריצה מופיעה רק אם יש ריצות (מיובאות)
  const mob = isMob(p);
  const tabs = [['week', 'Week'], ...(hasMob(p) ? [['mob', 'Range']] : []), ['weight', 'Weight'], ...(cali || mob || isRun(p) || ['hiit', 'pil', 'yoga', 'tai', 'walk'].includes(p.track) ? [] : [['strength', 'Strength']]), ...(hasCali(p) ? [['ladders', 'Ladders']] : []), ...((cali || mob || ['hiit', 'pil', 'yoga', 'tai', 'walk'].includes(p.track)) && !s.runs.length ? [] : [['run', 'Running']]), ['body', 'Body']];
  if (!tabs.some(([k]) => k === tab)) tab = 'week';
  root.innerHTML = html`<div class="page-head"><div class="eyebrow">Tracking & metrics</div><div class="h1">Your progress</div></div>
    <div class="seg" style="margin-bottom:14px">${tabs.map(([k, t]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${t}</button>`)}</div>
    <div id="tabc">${TABS[tab](s, p)}</div>
    <div class="h2">History<span class="more" data-act="garmin">Import from Garmin</span></div>
    <div class="card tight list-hist">${history(s)}</div>`;
  on(root, 'click', '[data-tab]', (e, t) => { tab = t.dataset.tab; renderProgress(root); });
  on(root, 'click', '[data-lift]', (e, t) => { liftSel = t.dataset.lift; renderProgress(root); });
  on(root, 'click', '[data-act="weigh"]', () => weightSheet(() => renderProgress(root)));
  on(root, 'click', '[data-h]', (e, b) => { const [k, i] = b.dataset.h.split(':'); (k === 's' ? openSessionEditor : openRunEditor)(Number(i), () => renderProgress(root)); });
  on(root, 'click', '[data-act="hist-all"]', () => { showAll = !showAll; renderProgress(root); });
  on(root, 'click', '[data-act="garmin"]', () => pickAndImport(() => renderProgress(root)));
  on(root, 'click', '[data-act="garmin-help"]', () => garminHelp());
  on(root, 'click', '[data-mobtest]', () => mobTestSheet(() => renderProgress(root)));
}

const TABS = {
  mob: (s) => mobProgress(s),
  // סיכום שבועי: 7 הימים האחרונים מול השבוע שלפניו
  week(s) {
    const w = weekSummary(s), c = w.cur, pv = w.prev;
    const mobOnly = isMob(s.profile) || isRun(s.profile) || ['hiit', 'pil', 'yoga', 'tai', 'walk'].includes(s.profile.track), cali = isCali(s.profile) || mobOnly;
    const delta = (a, b, unit = '') => { const d = Math.round((a - b) * 10) / 10; return d ? `<small class="${d > 0 ? 'up' : 'down'}"><span class="ltr">${d > 0 ? '+' : ''}${d.toLocaleString('en-US')}</span>${unit} vs last week</small>` : '<small>Same as last week</small>'; };
    const kpi = (ic, tone, val, label, sub) => `<div class="wk"><div class="row">${ib(ic, tone, 'sm')}<span class="sub t-cap">${label}</span></div><b class="num">${val}</b>${sub || ''}</div>`;
    const pct = (v, of) => Math.min(100, Math.round((v / Math.max(1, of)) * 100));
    return html`<div class="card tight advice"><b>${esc(w.verdict)}</b></div>
      <div class="wk-grid">
        ${kpi('dumbbell', 'pri', `${c.workouts}${w.planned ? `<small> / ${w.planned}</small>` : ''}`, mobOnly ? 'Workouts' : 'Strength workouts', delta(c.workouts, pv.workouts))}
        ${kpi('clock', '', c.minutes, 'Workout minutes', delta(c.minutes, pv.minutes))}
        ${cali ? kpi('chart', 'pri', c.sets, 'Sets', delta(c.sets, pv.sets)) : kpi('chart', 'pri', c.volume.toLocaleString('en-US'), 'kg volume', delta(c.volume, pv.volume))}
        ${mobOnly ? '' : cali ? kpi('rocket', 'pri', c.ups, 'Ladder steps up', '') : kpi('trophy', 'pri', c.prs, 'Personal records', '')}
        ${cali && !c.runs ? kpi('flame', 'acc', c.activeDays, 'Active days', delta(c.activeDays, pv.activeDays)) : kpi('run', 'acc', c.runKm || c.runs, c.runKm ? (s.profile.track === 'walk' ? 'km walked' : 'km run') : s.profile.track === 'walk' ? 'walks' : 'Runs', delta(c.runKm || c.runs, pv.runKm || pv.runs))}
        ${kpi('scale', '', w.weight ? w.weight.kg : '—', 'Weight (kg)', w.weight?.delta != null ? `<small><span class="ltr">${w.weight.delta > 0 ? '+' : ''}${w.weight.delta}</span> since the last weigh-in</small>` : '<small>No weigh-in this week</small>')}
      </div>
      ${wantsNutrition(s.profile) ? html`<div class="card" style="margin-top:12px"><b>Nutrition — daily average</b>
        ${c.foodDays ? html`<div class="sub t-foot" style="margin-bottom:10px">Based on ${c.foodDays} days logged this week</div>
          <div class="meter"><div class="row"><span>Calories</span><span>${c.kcal.toLocaleString('en-US')} / ${w.targets.kcal.toLocaleString('en-US')}</span></div><div class="bar"><i style="width:${pct(c.kcal, w.targets.kcal)}%"></i></div></div>
          <div class="meter"><div class="row"><span>Protein</span><span>${c.protein} / ${w.targets.protein} g</span></div><div class="bar"><i style="width:${pct(c.protein, w.targets.protein)}%"></i></div></div>
          ${c.waterL != null ? `<div class="meter"><div class="row"><span>Water</span><span>${c.waterL} / ${w.targets.waterL} L</span></div><div class="bar"><i style="width:${pct(c.waterL, w.targets.waterL)}%;background:var(--blue)"></i></div></div>` : ''}`
        : '<div class="sub t-foot" style="margin-top:6px">No food logged this week. Logging a few days is enough to see an average against the target.</div>'}
      </div>` : ''}`;
  },
  weight(s, p) {
    const W = weightTrend(s.weights);
    const first = W[0]?.kg, last = W[W.length - 1];
    const diff = last && first != null ? Math.round((last.trend - first) * 10) / 10 : 0;
    const toGo = last ? Math.round((p.targetWeight - last.trend) * 10) / 10 : 0;
    return html`<div class="kpis"><div class="kpi"><b>${last ? last.kg : '—'}</b><span>Current</span></div>
        <div class="kpi ${(p.targetWeight > first) === (diff > 0) && diff ? 'up' : ''}"><b>${diff > 0 ? '+' : ''}${diff}</b><span>Change (trend)</span></div>
        <div class="kpi"><b>${p.targetWeight}</b><span>Target (${toGo > 0 ? '+' : ''}${toGo})</span></div></div>
      <div class="card" style="margin-top:12px">${lineChart([
        { values: W.map((x) => ({ x: fmtDate(x.date), y: x.kg })), color: 'rgba(var(--fg-rgb),.35)', width: 1.5 },
        { values: W.map((x) => ({ x: fmtDate(x.date), y: x.trend })), color: 'var(--pri)', fill: true, dots: false, width: 3 }], { target: p.targetWeight })}
        <div class="legend"><span><i style="background:var(--pri)"></i>Trend</span><span><i style="background:rgba(var(--fg-rgb),.35)"></i>Weigh-in</span><span><i style="background:var(--acc)"></i>Target</span></div></div>
      <button class="btn primary block" style="margin-top:12px" data-act="weigh">+ New weigh-in</button>
      <p class="sub t-foot" style="margin-top:10px">The trend (moving average) filters out water and salt fluctuations — it's the real number. Healthy pace: ${p.goal === 'cut' ? 'losing 0.3–0.7 kg a week' : 'gaining 0.2–0.4 kg a week'}.</p>`;
  },
  ladders(s, p) { return caliTab(s, p); },
  strength(s) {
    const lifts = Object.keys(s.history).filter((id) => EX[id]?.type === 'weight' && s.history[id].length);
    if (!lifts.length) return `<div class="card"><div class="empty"><div class="e">${ib('dumbbell', 'pri', 'xl')}</div>Strength charts and records will appear here after your first workout</div></div>`;
    const sel = liftSel && lifts.includes(liftSel) ? liftSel : lifts.sort((a, b) => s.history[b].length - s.history[a].length)[0];
    const h = s.history[sel];
    const pts = h.map((x) => ({ x: fmtDate(x.date), y: Math.round(bestSet(x.sets)?.e1rm || 0) }));
    const best = Math.max(...pts.map((x) => x.y));
    const gain = pts.length > 1 ? Math.round(((pts[pts.length - 1].y - pts[0].y) / (pts[0].y || 1)) * 100) : 0;
    const prs = Object.entries(s.history).filter(([id]) => EX[id]?.type === 'weight').map(([id, hh]) => {
      const b = hh.map((x) => bestSet(x.sets)).filter(Boolean).sort((a, c) => c.e1rm - a.e1rm)[0];
      return b ? { id, b } : null;
    }).filter(Boolean).sort((a, b) => b.b.e1rm - a.b.e1rm);
    return html`<div class="chips scroll" style="margin-bottom:10px">${lifts.map((id) => `<button class="chip ${id === sel ? 'on' : ''}" data-lift="${id}">${EX[id].name}</button>`)}</div>
      <div class="kpis"><div class="kpi up"><b>${best}</b><span>Estimated 1RM</span></div><div class="kpi"><b>${h.length}</b><span>Workouts</span></div><div class="kpi ${gain > 0 ? 'up' : ''}"><b>${gain > 0 ? '+' : ''}${gain}%</b><span>Improvement</span></div></div>
      <div class="card" style="margin-top:12px">${lineChart([{ values: pts, color: 'var(--pri)', fill: true }])}<div class="sub" style="font-size:12px">Estimated 1RM (Epley formula) — the maximum weight for one rep</div></div>
      <div class="h2">Personal records</div>
      <div class="card tight">${prs.map(({ id, b }) => `<div class="ex-row"><div><div class="t">${EX[id].name}</div><div class="s">${b.w} kg × ${b.reps}</div></div><div class="w">${Math.round(b.e1rm)}<small>1RM</small></div></div>`).join('')}</div>`;
  },
  run(s, p) {
    const tests = s.runs.filter((r) => r.type === 'test' && r.timeSec);
    const best = tests.length ? Math.min(...tests.map((r) => r.timeSec)) : p.run3k;
    const paced = s.runs.filter((r) => r.distanceKm >= 1 && r.durationSec && ['running', undefined].includes(r.sport) && r.type !== 'cardio').slice(-20);
    const weekly = lastWeeks(8).map((wk) => ({ x: wk.label, y: Math.round(s.runs.filter((r) => inWeek(r.date, wk)).reduce((a, r) => a + r.durationSec, 0) / 60) }));
    return html`<div class="kpis"><div class="kpi up"><b>${best ? fmtTime(best) : '—'}</b><span>3 km best</span></div>
        <div class="kpi"><b>${best ? fmtTime(next3kTarget(best)) : '14:00'}</b><span>Next target</span></div><div class="kpi"><b>${s.runs.length}</b><span>Runs</span></div></div>
      <div class="card" style="margin-top:12px"><b>3 km tests</b>${tests.length ? lineChart([{ values: tests.map((r) => ({ x: fmtDate(r.date), y: Math.round((r.timeSec / 60) * 100) / 100 })), color: 'var(--orange)', fill: false }]) : '<div class="empty">The first test comes in the deload week (week 4)</div>'}
        <div class="sub" style="font-size:12px">Time in minutes — lower = better</div></div>
      ${paced.length ? html`<div class="card" style="margin-top:12px"><b>Average pace per km</b>${lineChart([{ values: paced.map((r) => ({ x: fmtDate(r.date), y: Math.round((r.durationSec / r.distanceKm / 60) * 100) / 100 })), color: 'var(--acc)', fill: true }])}
        <div class="sub" style="font-size:12px">Minutes per km — lower = faster · latest: ${fmtPace(paced[paced.length - 1].durationSec / paced[paced.length - 1].distanceKm)}</div></div>` : ''}
      <div class="card" style="margin-top:12px"><b>Running minutes per week</b>${bars(weekly, { color: 'var(--acc)' })}</div>
      <div class="card tight" style="margin-top:12px"><div class="row"><div style="flex:1"><b>Have a Garmin watch?</b><div class="sub t-foot">Import runs with heart rate and distance, or connect the watch for live heart rate.</div></div><button class="btn sm" data-act="garmin-help">How?</button></div></div>`;
  },
  body(s) {
    const load = muscleLoad(s.sessions);
    const total = Object.values(load).reduce((a, b) => a + b, 0);
    const vol = lastWeeks(8).map((wk) => ({ x: wk.label, y: Math.round(s.sessions.filter((x) => inWeek(x.date, wk)).reduce((a, x) => a + (x.volume || 0), 0) / 1000) }));
    const top = Object.entries(load).sort((a, b) => b[1] - a[1]);
    const missing = Object.keys(MUSCLES).filter((m) => !load[m]);
    return html`<div class="card"><b>Muscle map — last 7 days</b><div class="sub" style="font-size:12px;margin-bottom:8px">Brighter color = more sets</div>
        ${bodyMap(load)}
        ${total ? `<div class="chips" style="margin-top:10px">${top.slice(0, 6).map(([m, v]) => `<span class="tag lime">${MUSCLES[m]} ${Math.round(v)}</span>`).join('')}</div>` : ''}
        ${total && missing.length ? `<div class="sub" style="margin-top:8px">Not trained this week: ${missing.map((m) => MUSCLES[m]).join(', ')}</div>` : ''}</div>
      ${isCali(s.profile) ? '' : `<div class="card" style="margin-top:12px"><b>Weekly volume (tonnes)</b>${bars(vol)}</div>`}`;
  },
};

// קליסתניקס: מצב כל סולם, וגרף חזרות/שניות לתרגיל נבחר
function caliTab(s, p) {
  const c = p.cali;
  const rows = [...STRENGTH_LADDERS, ...SKILL_LADDERS.filter((lid) => (c.skills || []).includes(lid))].map((lid) => ({ lid, st: rungState(c, lid) })).filter((x) => x.st && ladderOpen(c, x.lid));
  const done = Object.keys(s.history).filter((id) => EX[id] && EX[id].type !== 'weight' && s.history[id].length);
  const sel = liftSel && done.includes(liftSel) ? liftSel : done.sort((a, b) => s.history[b].length - s.history[a].length)[0];
  const timed = sel && EX[sel].type === 'time';
  const pts = sel ? s.history[sel].map((x) => ({ x: fmtDate(x.date), y: Math.max(0, ...x.sets.filter((y) => y.done).map((y) => y.reps || 0)) })) : [];
  return html`<div class="card tight">${rows.map(({ lid, st }) => `<div class="meter"><div class="row"><span><b>${esc(LADDERS[lid].name)}</b> · ${esc(EX[st.rung.id].name)}</span><span class="num">${st.i + 1}/${st.n}</span></div><div class="bar"><i style="width:${Math.round(((st.i + 1) / st.n) * 100)}%"></i></div></div>`).join('')}
      <div class="sub t-foot" style="margin-top:6px">The current step on each ladder. Details and manual changes: Plan screen → My ladders.</div></div>
    ${sel ? html`<div class="h2">Progress by exercise</div><div class="chips scroll" style="margin-bottom:10px">${done.map((id) => `<button class="chip ${id === sel ? 'on' : ''}" data-lift="${id}">${EX[id].name}</button>`)}</div>
      <div class="card">${lineChart([{ values: pts, color: 'var(--pri)', fill: true }])}<div class="sub" style="font-size:12px">Best set in each workout — ${timed ? 'seconds' : 'reps'}</div></div>`
    : `<div class="card" style="margin-top:12px"><div class="empty"><div class="e">${ib('chart', 'pri', 'xl')}</div>A progress chart for each exercise will appear here after your first workout</div></div>`}`;
}

function history(s) {
  const items = [
    ...s.sessions.map((x, i) => ({ key: `s:${i}`, date: x.date, ico: x.field ? 'pack' : 'dumbbell', t: x.name, sub: `${fmtTime(x.durationSec)} · ${x.setsDone} sets · ${(x.volume || 0).toLocaleString('en-US')} kg${x.prs?.length ? ` · ${x.prs.length} PRs` : ''}${x.hr ? ` · ❤ ${x.hr.avg}` : ''}${x.source === 'garmin' ? ' · ⌚' : ''}` })),
    ...s.runs.map((r, i) => ({ key: `r:${i}`, date: r.date, ico: 'run', t: r.name, sub: `${fmtTime(r.durationSec)}${r.distanceKm ? ` · ${r.distanceKm} km` : ''}${r.timeSec ? ` · 3 km in${fmtTime(r.timeSec)}` : ''}${r.hr ? ` · ❤ ${r.hr.avg}` : ''}${r.source === 'garmin' ? ' · ⌚' : ''}` })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const shown = showAll ? items : items.slice(0, 15);
  if (!items.length) return `<div class="empty"><div class="e">${ib('plan', 'pri', 'xl')}</div>No workouts yet. The first one is waiting for you!</div>`;
  return shown.map((x) => `<button class="it" data-h="${x.key}">${ib(x.ico, x.ico === 'run' ? 'acc' : 'pri')}<div style="flex:1;text-align:right"><div style="font-weight:800">${esc(x.t)}</div><div class="sub" style="font-size:12px">${fmtDate(x.date)} · ${esc(x.sub)}</div></div><span class="sub" aria-hidden="true">${icon('edit')}</span></button>`).join('')
    + (items.length > 15 ? `<button class="btn sm ghost block" data-act="hist-all">${showAll ? 'Show less' : `Show all (${items.length})`}</button>` : '')
    + '<div class="sub" style="font-size:12px;text-align:center;margin-top:6px">Tap a workout to edit or delete it</div>';
}

function lastWeeks(n) {
  const out = [];
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay());
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(d); start.setDate(d.getDate() - i * 7);
    const end = new Date(start); end.setDate(start.getDate() + 7);
    out.push({ start, end, label: `${start.getDate()}/${start.getMonth() + 1}` });
  }
  return out;
}
const inWeek = (iso, wk) => { const t = new Date(iso); return t >= wk.start && t < wk.end; };
