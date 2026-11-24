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
  const tabs = [['week', 'שבוע'], ...(hasMob(p) ? [['mob', 'טווחים']] : []), ['weight', 'משקל'], ...(cali || mob || isRun(p) || ['hiit', 'pil', 'yoga', 'tai', 'walk', 'med'].includes(p.track) ? [] : [['strength', 'כוח']]), ...(hasCali(p) ? [['ladders', 'סולמות']] : []), ...((cali || mob || ['hiit', 'pil', 'yoga', 'tai', 'walk', 'med'].includes(p.track)) && !s.runs.length ? [] : [['run', 'ריצה']]), ['body', 'גוף']];
  if (!tabs.some(([k]) => k === tab)) tab = 'week';
  root.innerHTML = html`<div class="page-head"><div class="eyebrow">מעקב ומדדים</div><div class="h1">ההתקדמות שלך</div></div>
    <div class="seg" style="margin-bottom:14px">${tabs.map(([k, t]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${t}</button>`)}</div>
    <div id="tabc">${TABS[tab](s, p)}</div>
    <div class="h2">היסטוריה<span class="more" data-act="garmin">ייבוא מ-Garmin</span></div>
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
    const mobOnly = isMob(s.profile) || isRun(s.profile) || ['hiit', 'pil', 'yoga', 'tai', 'walk', 'med'].includes(s.profile.track), cali = isCali(s.profile) || mobOnly;
    const delta = (a, b, unit = '') => { const d = Math.round((a - b) * 10) / 10; return d ? `<small class="${d > 0 ? 'up' : 'down'}"><span class="ltr">${d > 0 ? '+' : ''}${d.toLocaleString('he-IL')}</span>${unit} מהשבוע שעבר</small>` : '<small>כמו בשבוע שעבר</small>'; };
    const kpi = (ic, tone, val, label, sub) => `<div class="wk"><div class="row">${ib(ic, tone, 'sm')}<span class="sub t-cap">${label}</span></div><b class="num">${val}</b>${sub || ''}</div>`;
    const pct = (v, of) => Math.min(100, Math.round((v / Math.max(1, of)) * 100));
    return html`<div class="card tight advice"><b>${esc(w.verdict)}</b></div>
      <div class="wk-grid">
        ${kpi('dumbbell', 'pri', `${c.workouts}${w.planned ? `<small> / ${w.planned}</small>` : ''}`, mobOnly ? 'אימונים' : 'אימוני כוח', delta(c.workouts, pv.workouts))}
        ${kpi('clock', '', c.minutes, 'דקות אימון', delta(c.minutes, pv.minutes))}
        ${cali ? kpi('chart', 'pri', c.sets, 'סטים', delta(c.sets, pv.sets)) : kpi('chart', 'pri', c.volume.toLocaleString('he-IL'), 'ק״ג נפח', delta(c.volume, pv.volume))}
        ${mobOnly ? '' : cali ? kpi('rocket', 'pri', c.ups, 'עליות בסולמות', '') : kpi('trophy', 'pri', c.prs, 'שיאים אישיים', '')}
        ${cali && !c.runs ? kpi('flame', 'acc', c.activeDays, 'ימים פעילים', delta(c.activeDays, pv.activeDays)) : kpi('run', 'acc', c.runKm || c.runs, c.runKm ? (['walk', 'med'].includes(s.profile.track) ? 'ק״מ הליכה' : 'ק״מ ריצה') : ['walk', 'med'].includes(s.profile.track) ? 'הליכות' : 'ריצות', delta(c.runKm || c.runs, pv.runKm || pv.runs))}
        ${kpi('scale', '', w.weight ? w.weight.kg : '—', 'משקל (ק״ג)', w.weight?.delta != null ? `<small><span class="ltr">${w.weight.delta > 0 ? '+' : ''}${w.weight.delta}</span> מהשקילה הקודמת</small>` : '<small>אין שקילה השבוע</small>')}
      </div>
      ${wantsNutrition(s.profile) ? html`<div class="card" style="margin-top:12px"><b>תזונה — ממוצע יומי</b>
        ${c.foodDays ? html`<div class="sub t-foot" style="margin-bottom:10px">לפי ${c.foodDays} ימים שנרשמו השבוע</div>
          <div class="meter"><div class="row"><span>קלוריות</span><span>${c.kcal.toLocaleString('he-IL')} / ${w.targets.kcal.toLocaleString('he-IL')}</span></div><div class="bar"><i style="width:${pct(c.kcal, w.targets.kcal)}%"></i></div></div>
          <div class="meter"><div class="row"><span>חלבון</span><span>${c.protein} / ${w.targets.protein} ג׳</span></div><div class="bar"><i style="width:${pct(c.protein, w.targets.protein)}%"></i></div></div>
          ${c.waterL != null ? `<div class="meter"><div class="row"><span>מים</span><span>${c.waterL} / ${w.targets.waterL} ל׳</span></div><div class="bar"><i style="width:${pct(c.waterL, w.targets.waterL)}%;background:var(--blue)"></i></div></div>` : ''}`
        : '<div class="sub t-foot" style="margin-top:6px">לא נרשם אוכל השבוע. רישום של כמה ימים מספיק כדי לראות ממוצע מול היעד.</div>'}
      </div>` : ''}`;
  },
  weight(s, p) {
    const W = weightTrend(s.weights);
    const first = W[0]?.kg, last = W[W.length - 1];
    const diff = last && first != null ? Math.round((last.trend - first) * 10) / 10 : 0;
    const toGo = last ? Math.round((p.targetWeight - last.trend) * 10) / 10 : 0;
    return html`<div class="kpis"><div class="kpi"><b>${last ? last.kg : '—'}</b><span>נוכחי</span></div>
        <div class="kpi ${(p.targetWeight > first) === (diff > 0) && diff ? 'up' : ''}"><b>${diff > 0 ? '+' : ''}${diff}</b><span>שינוי (מגמה)</span></div>
        <div class="kpi"><b>${p.targetWeight}</b><span>יעד (${toGo > 0 ? '+' : ''}${toGo})</span></div></div>
      <div class="card" style="margin-top:12px">${lineChart([
        { values: W.map((x) => ({ x: fmtDate(x.date), y: x.kg })), color: 'rgba(var(--fg-rgb),.35)', width: 1.5 },
        { values: W.map((x) => ({ x: fmtDate(x.date), y: x.trend })), color: 'var(--pri)', fill: true, dots: false, width: 3 }], { target: p.targetWeight })}
        <div class="legend"><span><i style="background:var(--pri)"></i>מגמה</span><span><i style="background:rgba(var(--fg-rgb),.35)"></i>שקילה</span><span><i style="background:var(--acc)"></i>יעד</span></div></div>
      <button class="btn primary block" style="margin-top:12px" data-act="weigh">+ שקילה חדשה</button>
      <p class="sub t-foot" style="margin-top:10px">המגמה (ממוצע נע) מסננת תנודות של מים ומלח — זה המספר האמיתי. קצב בריא: ${p.goal === 'cut' ? 'ירידה של 0.3–0.7 ק״ג בשבוע' : 'עלייה של 0.2–0.4 ק״ג בשבוע'}.</p>`;
  },
  ladders(s, p) { return caliTab(s, p); },
  strength(s) {
    const lifts = Object.keys(s.history).filter((id) => EX[id]?.type === 'weight' && s.history[id].length);
    if (!lifts.length) return `<div class="card"><div class="empty"><div class="e">${ib('dumbbell', 'pri', 'xl')}</div>אחרי האימון הראשון יופיעו כאן גרפי כוח ושיאים</div></div>`;
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
      <div class="kpis"><div class="kpi up"><b>${best}</b><span>1RM משוער</span></div><div class="kpi"><b>${h.length}</b><span>אימונים</span></div><div class="kpi ${gain > 0 ? 'up' : ''}"><b>${gain > 0 ? '+' : ''}${gain}%</b><span>שיפור</span></div></div>
      <div class="card" style="margin-top:12px">${lineChart([{ values: pts, color: 'var(--pri)', fill: true }])}<div class="sub" style="font-size:12px">1RM משוער (נוסחת Epley) — המשקל המקסימלי לחזרה אחת</div></div>
      <div class="h2">שיאים אישיים</div>
      <div class="card tight">${prs.map(({ id, b }) => `<div class="ex-row"><div><div class="t">${EX[id].name}</div><div class="s">${b.w} ק״ג × ${b.reps}</div></div><div class="w">${Math.round(b.e1rm)}<small>1RM</small></div></div>`).join('')}</div>`;
  },
  run(s, p) {
    const tests = s.runs.filter((r) => r.type === 'test' && r.timeSec);
    const best = tests.length ? Math.min(...tests.map((r) => r.timeSec)) : p.run3k;
    const paced = s.runs.filter((r) => r.distanceKm >= 1 && r.durationSec && ['running', undefined].includes(r.sport) && r.type !== 'cardio').slice(-20);
    const weekly = lastWeeks(8).map((wk) => ({ x: wk.label, y: Math.round(s.runs.filter((r) => inWeek(r.date, wk)).reduce((a, r) => a + r.durationSec, 0) / 60) }));
    return html`<div class="kpis"><div class="kpi up"><b>${best ? fmtTime(best) : '—'}</b><span>3 ק״מ שיא</span></div>
        <div class="kpi"><b>${best ? fmtTime(next3kTarget(best)) : '14:00'}</b><span>יעד הבא</span></div><div class="kpi"><b>${s.runs.length}</b><span>ריצות</span></div></div>
      <div class="card" style="margin-top:12px"><b>מבדקי 3 ק״מ</b>${tests.length ? lineChart([{ values: tests.map((r) => ({ x: fmtDate(r.date), y: Math.round((r.timeSec / 60) * 100) / 100 })), color: 'var(--orange)', fill: false }]) : '<div class="empty">המבדק הראשון יגיע בשבוע הפריקה (שבוע 4)</div>'}
        <div class="sub" style="font-size:12px">זמן בדקות — נמוך יותר = טוב יותר</div></div>
      ${paced.length ? html`<div class="card" style="margin-top:12px"><b>קצב ממוצע לק״מ</b>${lineChart([{ values: paced.map((r) => ({ x: fmtDate(r.date), y: Math.round((r.durationSec / r.distanceKm / 60) * 100) / 100 })), color: 'var(--acc)', fill: true }])}
        <div class="sub" style="font-size:12px">דקות לק״מ — נמוך יותר = מהיר יותר · אחרון: ${fmtPace(paced[paced.length - 1].durationSec / paced[paced.length - 1].distanceKm)}</div></div>` : ''}
      <div class="card" style="margin-top:12px"><b>דקות ריצה בשבוע</b>${bars(weekly, { color: 'var(--acc)' })}</div>
      <div class="card tight" style="margin-top:12px"><div class="row"><div style="flex:1"><b>יש לך שעון Garmin?</b><div class="sub t-foot">ייבוא ריצות עם דופק ומרחק, או חיבור השעון לדופק חי.</div></div><button class="btn sm" data-act="garmin-help">איך?</button></div></div>`;
  },
  body(s) {
    const load = muscleLoad(s.sessions);
    const total = Object.values(load).reduce((a, b) => a + b, 0);
    const vol = lastWeeks(8).map((wk) => ({ x: wk.label, y: Math.round(s.sessions.filter((x) => inWeek(x.date, wk)).reduce((a, x) => a + (x.volume || 0), 0) / 1000) }));
    const top = Object.entries(load).sort((a, b) => b[1] - a[1]);
    const missing = Object.keys(MUSCLES).filter((m) => !load[m]);
    return html`<div class="card"><b>מפת שרירים — 7 ימים אחרונים</b><div class="sub" style="font-size:12px;margin-bottom:8px">צבע בהיר = יותר סטים</div>
        ${bodyMap(load)}
        ${total ? `<div class="chips" style="margin-top:10px">${top.slice(0, 6).map(([m, v]) => `<span class="tag lime">${MUSCLES[m]} ${Math.round(v)}</span>`).join('')}</div>` : ''}
        ${total && missing.length ? `<div class="sub" style="margin-top:8px">לא עבדו השבוע: ${missing.map((m) => MUSCLES[m]).join(', ')}</div>` : ''}</div>
      ${isCali(s.profile) ? '' : `<div class="card" style="margin-top:12px"><b>נפח שבועי (טון)</b>${bars(vol)}</div>`}`;
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
      <div class="sub t-foot" style="margin-top:6px">השלב הנוכחי בכל סולם. פירוט ושינוי ידני: מסך התוכנית ← הסולמות שלי.</div></div>
    ${sel ? html`<div class="h2">התקדמות בתרגיל</div><div class="chips scroll" style="margin-bottom:10px">${done.map((id) => `<button class="chip ${id === sel ? 'on' : ''}" data-lift="${id}">${EX[id].name}</button>`)}</div>
      <div class="card">${lineChart([{ values: pts, color: 'var(--pri)', fill: true }])}<div class="sub" style="font-size:12px">הסט הטוב ביותר בכל אימון — ${timed ? 'שניות' : 'חזרות'}</div></div>`
    : `<div class="card" style="margin-top:12px"><div class="empty"><div class="e">${ib('chart', 'pri', 'xl')}</div>אחרי האימון הראשון יופיע כאן גרף התקדמות לכל תרגיל</div></div>`}`;
}

function history(s) {
  const items = [
    ...s.sessions.map((x, i) => ({ key: `s:${i}`, date: x.date, ico: x.field ? 'pack' : 'dumbbell', t: x.name, sub: `${fmtTime(x.durationSec)} · ${x.setsDone} סטים · ${(x.volume || 0).toLocaleString('he-IL')} ק״ג${x.prs?.length ? ` · ${x.prs.length} שיאים` : ''}${x.hr ? ` · ❤ ${x.hr.avg}` : ''}${x.source === 'garmin' ? ' · ⌚' : ''}` })),
    ...s.runs.map((r, i) => ({ key: `r:${i}`, date: r.date, ico: 'run', t: r.name, sub: `${fmtTime(r.durationSec)}${r.distanceKm ? ` · ${r.distanceKm} ק״מ` : ''}${r.timeSec ? ` · 3 ק״מ ב-${fmtTime(r.timeSec)}` : ''}${r.hr ? ` · ❤ ${r.hr.avg}` : ''}${r.source === 'garmin' ? ' · ⌚' : ''}` })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const shown = showAll ? items : items.slice(0, 15);
  if (!items.length) return `<div class="empty"><div class="e">${ib('plan', 'pri', 'xl')}</div>עוד אין אימונים. הראשון מחכה לך!</div>`;
  return shown.map((x) => `<button class="it" data-h="${x.key}">${ib(x.ico, x.ico === 'run' ? 'acc' : 'pri')}<div style="flex:1;text-align:right"><div style="font-weight:800">${esc(x.t)}</div><div class="sub" style="font-size:12px">${fmtDate(x.date)} · ${esc(x.sub)}</div></div><span class="sub" aria-hidden="true">${icon('edit')}</span></button>`).join('')
    + (items.length > 15 ? `<button class="btn sm ghost block" data-act="hist-all">${showAll ? 'הצג פחות' : `הצג הכל (${items.length})`}</button>` : '')
    + '<div class="sub" style="font-size:12px;text-align:center;margin-top:6px">לחיצה על אימון — עריכה או מחיקה</div>';
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
