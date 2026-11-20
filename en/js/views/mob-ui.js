// ממשק מסלול המוביליטי (תמר): מבחן הטווחים, שאלון הבטיחות, בחירת אורך האימון, אימון חופשי לפי אזור, והתקדמות.
import { html, esc, on, sheet, toast, icon, ib, fmtDate } from '../ui/dom.js';
import { get, set, regenerateWeek } from '../store.js';
import { COACHES } from '../data/coaches.js';
import { TESTS, FLAGS, REGIONS, MOB_MINUTES, MAX_SCORE } from '../data/mob.js';
import { isMob, hasMob, mobCount, newMob, saveMobTest, mobScore, mobLevel, mobTested, retestDue, weakRegions, regionScores, regionMinutes,
  REGION_TARGET_MIN, resizeMobWorkout, buildQuickMob, QUICK } from '../engine/mob.js';

const T = COACHES.tamar;

// ───── מבחן הטווחים ─────
export const mobTestHtml = (test) => TESTS.map((t) => html`<div class="card tight mob-test"><b>${t.name}</b><div class="sub t-foot">${esc(t.how)}</div>
  <div class="mt-opts">${t.opts.map((o, i) => `<button data-mt="${t.id}" data-v="${i}" class="${test[t.id] === i ? 'on' : ''}"><span class="num">${i}</span>${esc(o)}</button>`).join('')}</div></div>`).join('');
// מאזין לבחירות במבחן; מחזיר את האובייקט שמתעדכן
export function bindMobTest(root, test, onChange) {
  on(root, 'click', '[data-mt]', (e, b) => {
    test[b.dataset.mt] = Number(b.dataset.v);
    b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    onChange?.();
  });
  return test;
}
export function mobTestSheet(done) {
  const p = get().profile;
  const test = mobTested(p.mob) ? { ...p.mob.test } : {};
  sheet(html`<div class="eyebrow">${esc(T.name)} · range-of-motion test</div><div class="h1" style="font-size:24px">Six short tests</div>
    <p class="sub">At home, no equipment — a wall and the floor are enough. Do each test once, without warming up and without forcing, and mark the closest option. Based on the results, ${esc(T.name)} will decide what to focus on.</p>
    ${mobTestHtml(test)}
    <button class="btn primary block xl" style="margin-top:12px" data-save>Save and update workouts</button>
    <button class="btn ghost block" style="margin-top:8px" data-close>Cancel</button>`, {
    onMount(sh, close) {
      bindMobTest(sh, test);
      on(sh, 'click', '[data-save]', () => {
        if (Object.keys(test).length < TESTS.length) { toast('Some tests are still unanswered'); return; }
        const before = mobTested(p.mob) ? mobScore(p.mob) : null;
        set((s) => { saveMobTest(s.profile.mob, test); if (isMob(s.profile)) s.profile.level = mobLevel(s.profile.mob); return regenerateWeek(s); });
        const now = mobScore(get().profile.mob);
        close();
        toast(before == null ? `Range-of-motion score: ${now} out of 100. Workouts updated.` : now > before ? `You went up from${before} to${now}. Well done!` : `Range-of-motion score: ${now} out of 100.`, 3600);
        done?.();
      });
    },
  });
}

// ───── שאלון בטיחות ─────
export const flagChips = (flags = []) => `<div class="chips">${Object.entries(FLAGS).map(([id, f]) => `<button class="chip no ${flags.includes(id) ? 'on' : ''}" data-flag="${id}">${f.name}</button>`).join('')}</div>`;
export const flagNotes = (flags = []) => flags.map((id) => `<div class="sub t-foot" style="margin-top:6px"><b>${FLAGS[id].name}:</b> ${FLAGS[id].note}</div>`).join('')
  + (flags.length ? '<div class="sub t-foot" style="margin-top:6px">It\'s best to get clearance from a doctor or physiotherapist before you start.</div>' : '');

// ───── לפני אימון: כמה זמן יש? ─────
export function mobMinutesSheet(workout, go) {
  const s = get(), p = s.profile;
  const cur = p.mob?.minutes || 20;
  sheet(html`<div class="row" style="gap:12px;align-items:center"><img src="${T.face}" alt="" style="width:54px;height:64px;object-fit:cover;border-radius:14px"><div><div class="eyebrow">${esc(workout.name)}</div><div class="h1" style="font-size:22px">How much time do you have today?</div></div></div>
    <p class="sub" style="margin-top:8px">${esc(T.name)} will build the workout around your time: opening with movement, holds in the areas that need it most, and breathing to finish. Even ten minutes does the job.</p>
    <div class="mob-mins">${MOB_MINUTES.map((m) => `<button class="${m === cur ? 'on' : ''}" data-min="${m}"><b class="num">${m}</b><span>minutes</span></button>`).join('')}</div>
    <button class="btn ghost block" style="margin-top:10px" data-close>Not now</button>`, {
    onMount(sh, close) {
      on(sh, 'click', '[data-min]', (e, b) => {
        const m = Number(b.dataset.min);
        set((s2) => { if (s2.profile.mob) s2.profile.mob.minutes = m; return s2; });
        close();
        go(workout.field ? { ...buildQuickMob(workout.templateId, get().profile, m), name: workout.name } : resizeMobWorkout(workout, get().profile, m, get().plan));
      });
    },
  });
}

// ───── אימון חופשי: לפי אזור או מצב ─────
export function quickMobSheet(start) {
  sheet(html`<div class="eyebrow">${esc(T.name)} · free workout</div><div class="h1" style="font-size:24px">What are we working on now?</div>
    <p class="sub">A short workout outside the program — it doesn't change the order of this week's workouts.</p>
    ${Object.entries(QUICK).map(([tid, q]) => `<button class="ex-row" style="width:100%;text-align:right" data-quick="${tid}">${ib(q.icon, 'acc')}<div><div class="t">${q.name}</div></div></button>`).join('')}
    <button class="btn ghost block" style="margin-top:8px" data-close>Close</button>`, {
    onMount(sh, close) {
      on(sh, 'click', '[data-quick]', (e, b) => { close(); start({ templateId: b.dataset.quick, name: QUICK[b.dataset.quick].name, track: 'mob', field: true, day: null, items: [] }); });
    },
  });
}

// ───── הגדרות ─────
export function mobSettings(p) {
  const on = hasMob(p), solo = isMob(p);
  const days = Math.min(6, Math.max(3, p.days || 4));
  const max = Math.min(3, days - (p.track === 'mix' ? 2 : 1));
  const n = mobCount(p);
  return html`<div class="card tight">
    ${solo ? '' : html`<div style="font-weight:700;margin-bottom:6px">Mobility workouts with ${esc(T.name)} per week</div>
      <div class="seg" data-mobn>${Array.from({ length: max + 1 }, (_, i) => `<button data-v="${i}" class="${n === i ? 'on' : ''}">${i === 0 ? 'None' : i}</button>`).join('')}</div>
      <div class="sub t-foot" style="margin-top:6px">${n ? `${n === 1 ? '1 workout' : `${n} workouts`} of ${days} per week ${n === 1 ? 'is' : 'are'} mobility & flexibility with ${esc(T.name)}; the rest stay on your track.` : `You can add mobility to any track: some of the week's workouts will be with ${esc(T.name)}, instead of a regular workout.`}</div>`}
    ${on ? html`<div style="font-weight:700;margin:${solo ? 0 : 14}px 0 6px">Range-of-motion test</div>
      <div class="row between"><div class="sub t-foot">${mobTested(p.mob) ? `Score ${mobScore(p.mob)} out of 100 · ${fmtDate(p.mob.tests[p.mob.tests.length - 1].date)}` : 'Not done yet — for now the workouts are balanced across all areas.'}</div>
        <button class="btn sm teal" data-mobtest>${icon('target', 'width="16" height="16"')} ${mobTested(p.mob) ? 'Retest' : 'Take the test'}</button></div>
      <div style="font-weight:700;margin:14px 0 6px">Any of these?</div>${flagChips(p.mob.flags)}${flagNotes(p.mob.flags) || '<div class="sub t-foot" style="margin-top:6px">Exercises that don\'t suit the condition won\'t be included in workouts.</div>'}` : ''}</div>`;
}
export function bindMobSettings(root, rerender) {
  on(root, 'click', '[data-mobn] button', (e, b) => {
    const n = Number(b.dataset.v);
    set((s) => { const q = s.profile; if (n && !q.mob) q.mob = newMob(); q.mobN = n; s.plan.completedDays = []; return regenerateWeek(s); });
    toast(n ? `${n === 1 ? '1 mobility workout added' : `${n} mobility workouts added`} to the week` : 'Mobility workouts removed from the week');
    rerender();
  });
  on(root, 'click', '[data-mobtest]', () => mobTestSheet(rerender));
  on(root, 'click', '[data-flag]', (e, b) => {
    set((s) => { const f = (s.profile.mob.flags ||= []); const i = f.indexOf(b.dataset.flag); i >= 0 ? f.splice(i, 1) : f.push(b.dataset.flag); return regenerateWeek(s); });
    toast('Workouts updated'); rerender();
  });
}

// ───── התקדמות ─────
export function mobProgress(s) {
  const p = s.profile, mob = p.mob;
  const tests = mob.tests || [];
  const first = tests[0], last = tests[tests.length - 1];
  const mins = regionMinutes(s.sessions);
  const weak = weakRegions(mob);
  const sc = regionScores(mob);
  const regs = Object.keys(REGIONS).filter((r) => r !== 'calm');
  return html`
    <div class="card"><div class="row between"><b>Range-of-motion score</b>${retestDue(mob) ? `<button class="btn sm teal" data-mobtest>${icon('target', 'width="16" height="16"')} ${tests.length ? 'Retest' : 'Take the test'}</button>` : `<span class="sub t-foot">Retest: ${fmtDate(new Date(new Date(last.date).getTime() + 28 * 864e5).toISOString())}</span>`}</div>
      ${tests.length ? html`<div class="row" style="align-items:baseline;gap:8px;margin-top:6px"><span class="num" style="font-size:40px;font-weight:800">${mobScore(mob)}</span><span class="sub">out of 100</span>
        ${tests.length > 1 ? `<span class="tag ${mobScore(mob) >= mobScore(mob, first.test) ? 'lime' : ''}">${mobScore(mob) >= mobScore(mob, first.test) ? '+' : ''}${mobScore(mob) - mobScore(mob, first.test)} since ${fmtDate(first.date)}</span>` : ''}</div>
        ${TESTS.map((t) => `<div class="mob-row"><span>${t.name}</span><div class="dots">${[1, 2, 3].map((i) => `<i class="${mob.test[t.id] >= i ? 'f' : ''}"></i>`).join('')}</div><span class="sub t-foot">${esc(t.opts[mob.test[t.id]] || '')}</span></div>`).join('')}`
    : `<div class="sub" style="margin-top:6px">Six short at-home tests. Based on them, ${esc(T.name)} will decide what to focus on, and after four weeks we'll check again.</div>`}</div>
    <div class="card" style="margin-top:12px"><b>Minutes per area · last 7 days</b>
      <div class="sub t-foot" style="margin:4px 0 8px">Target: about${REGION_TARGET_MIN} minutes a week per area. Beyond that, the extra gain in range is small.</div>
      ${regs.map((r) => { const m = Math.round(mins[r] || 0); return `<div class="mob-row"><span>${REGIONS[r]}${weak.includes(r) && tests.length ? ' <span class="tag orange">Priority</span>' : ''}</span><div class="bar"><i style="width:${Math.min(100, Math.round((m / REGION_TARGET_MIN) * 100))}%"></i></div><span class="num">${m}׳</span></div>`; }).join('')}</div>
    <div class="sub t-foot" style="margin-top:10px">Score per area (0–3) from the test: ${regs.filter((r) => weak.includes(r)).map((r) => `${REGIONS[r]} ${sc[r].toFixed(1)}`).join(' · ')} — these are the areas${esc(T.name)} gives more time to. ${MAX_SCORE} points = 100.</div>`;
}
