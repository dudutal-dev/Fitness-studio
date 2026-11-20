// Garmin: ייבוא פעילויות מקבצים, כרטיס הגדרות שעון, והוראות.
import { html, esc, on, sheet, toast, fmtTime, fmtDate, icon, em } from '../ui/dom.js';
import { get, set, addXP, XP } from '../store.js';
import { dayKey } from '../engine/stats.js';
import { importActivityFile } from '../devices/importer.js';
import { readHealthExport, mergeHealth } from '../devices/health.js';
import { summarizeHR, maxHrFor, supported, isConnected, disconnect } from '../devices/hr.js';
import { connectWatch, watchStatusText, isIOS } from '../devices/ui.js';
import { fmtPace } from '../engine/running.js';
import { saveRun } from './run.js';

const SPORT_HE = { running: 'Run', strength: 'Strength workout', cycling: 'Cycling', walking: 'Walk', hiking: 'Hike', training: 'Workout', fitness: 'Fitness', swimming: 'Swim', other: 'Activity' };

export function pickAndImport(onDone) {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.fit,.tcx,.gpx,.zip,application/zip,application/octet-stream';
  inp.onchange = async () => {
    const f = inp.files[0];
    if (!f) return;
    try {
      const a = await importActivityFile(f);
      previewSheet(a, onDone);
    } catch (e) { toast(`Could not read the file: ${e.message}`, 4500); }
  };
  inp.click();
}

function previewSheet(a, onDone) {
  const s = get();
  const dup = s.runs.some((r) => r.importId === a.start) || s.sessions.some((x) => x.importId === a.start);
  const pace = a.distanceKm ? a.durationSec / a.distanceKm : null;
  const sameDay = s.sessions.filter((x) => dayKey(x.date) === dayKey(a.start) && !x.imported);
  const looksTest = a.sport === 'running' && a.distanceKm >= 2.9 && a.distanceKm <= 3.3;
  const hr = a.hrSamples?.length ? summarizeHR(a.hrSamples, null, maxHrFor(s.profile)) : a.avgHr ? { avg: a.avgHr, max: a.maxHr, zones: [0, 0, 0, 0, 0], samples: [] } : null;
  const vol = a.sets.reduce((t, x) => t + (x.kg || 0) * (x.reps || 0), 0);
  sheet(html`<div class="eyebrow">⌚ Import from Garmin</div><div class="h1" style="font-size:24px">${SPORT_HE[a.sport] || 'Activity'} · ${fmtDate(a.start)}</div>
    ${dup ? '<div class="tag orange" style="margin:6px 0">This activity was already imported</div>' : ''}
    <div class="kpis" style="margin:14px 0">
      <div class="kpi"><b>${fmtTime(a.durationSec)}</b><span>Time</span></div>
      <div class="kpi"><b>${a.distanceKm ?? '—'}</b><span>km</span></div>
      <div class="kpi"><b>${pace ? fmtPace(pace) : a.calories ?? '—'}</b><span>${pace ? 'Pace per km' : 'kcal'}</span></div></div>
    ${a.avgHr || hr ? `<div class="card tight"><b>❤ Avg heart rate ${hr?.avg ?? a.avgHr} · max ${hr?.max ?? a.maxHr}</b>${a.calories ? `<div class="sub">🔥 ${a.calories} kcal</div>` : ''}</div>` : ''}
    ${a.sets.length ? `<div class="card tight" style="margin-top:10px"><b>${a.sets.length} sets</b><div class="sub">${a.sets.reduce((t, x) => t + (x.reps || 0), 0)} reps · ${Math.round(vol)} kg volume</div></div>` : ''}
    <div class="stack" style="margin-top:16px">
      ${a.sport === 'strength' && sameDay.length ? `<button class="btn primary block" data-imp="attach">Attach heart rate to the workout "${esc(sameDay[sameDay.length - 1].name)}"</button>` : ''}
      ${a.sport === 'strength' ? '<button class="btn block" data-imp="session">Save as strength workout</button>' : ''}
      ${looksTest ? '<button class="btn primary block" data-imp="test">Save as 3 km test</button>' : ''}
      ${a.sport !== 'strength' ? `<button class="btn ${looksTest ? '' : 'primary'} block" data-imp="run">Save as ${a.sport === 'running' ? 'Run' : 'cardio activity'}</button>` : ''}
      <button class="btn ghost block" data-close>Cancel</button>
    </div>`, {
    onMount(sh, close) {
      on(sh, 'click', '[data-imp]', (e, b) => {
        const k = b.dataset.imp;
        const name = a.sport === 'running' ? 'Run (Garmin)' : `${SPORT_HE[a.sport] || 'Activity'} (Garmin)`;
        if (k === 'run' || k === 'test') {
          saveRun({ date: a.start, type: k === 'test' ? 'test' : a.sport === 'running' ? 'garmin' : 'cardio', name: k === 'test' ? '3 km test (Garmin)' : name,
            durationSec: a.durationSec, distanceKm: a.distanceKm, timeSec: k === 'test' ? a.durationSec : null, rpe: null, hr, calories: a.calories, source: 'garmin', importId: a.start });
        } else if (k === 'attach') {
          const target = sameDay[sameDay.length - 1];
          set((st) => { const x = st.sessions.find((y) => y.date === target.date); Object.assign(x, { hr, calories: a.calories, importId: a.start }); return st; });
          toast('Heart rate attached to the workout');
        } else if (k === 'session') {
          set((st) => {
            st.sessions.push({ date: a.start, name: 'Strength workout (Garmin)', day: null, field: false, imported: true, durationSec: a.durationSec, volume: Math.round(vol),
              setsDone: a.sets.length, exercises: [], prs: [], hr, calories: a.calories, source: 'garmin', importId: a.start });
            return st;
          });
          addXP(XP.workout, 'import');
          toast('Workout saved');
        }
        close(); onDone?.();
      });
    },
  });
}

export function garminHelp() {
  sheet(html`<div class="eyebrow">⌚ Garmin</div><div class="h1" style="font-size:24px">How to connect your watch</div>
    <div class="h2">1 · Live heart rate in workouts and runs</div>
    <div class="tip"><div class="ti">${em('📡', 'acc')}</div><div><b>Turn on heart rate broadcast on the watch</b><span>On the watch: long-press MENU → Settings → Health & Wellness / Wrist Heart Rate → <b>Broadcast Heart Rate</b>. On some models: from within an activity → Settings → "Broadcast During Activity".</span></div></div>
    <div class="tip"><div class="ti">${em('🔗', 'acc')}</div><div><b>Connect to the app</b><span>On the phone: "Connect watch" → choose the watch from the list. Works in Chrome on Android. A chest strap (HRM-Pro/Dual) works too, and some also broadcast speed and distance.</span></div></div>
    ${isIOS() ? `<div class="tip"><div class="ti">${em('🍏', 'acc')}</div><div><b>On iPhone</b><span>Safari does not support Bluetooth from the browser. For live heart rate: install the free browser <b>Bluefy</b> and open the app in it. Everything else (GPS, import) works in Safari too.</span></div></div>` : ''}
    <div class="h2">2 · Distance and pace on runs</div>
    <div class="tip"><div class="ti">${em('🛰️', 'acc')}</div><div><b>The phone's GPS</b><span>Turns on automatically in run mode (allow location access). In the 3 km test the coach detects the end of the 3 km by itself. Keep the screen on.</span></div></div>
    <div class="h2">3 · Importing workouts from Garmin Connect</div>
    <div class="tip"><div class="ti">${em('📤', 'acc')}</div><div><b>Export from the website</b><span>connect.garmin.com → Activity → ⚙️ (gear icon) → <b>Export Original</b> (a ZIP file), or Export to TCX/GPX. Then here: "Import from Garmin" and choose the file.</span></div></div>
    <div class="tip"><div class="ti">${em('📈', 'acc')}</div><div><b>What comes in</b><span>Time, distance, pace, average/max heart rate and heart rate zones, calories. Runs go into the charts and the fitness score; a ~3 km run can be saved as a test. For strength workouts — sets, reps and weights.</span></div></div>
    <button class="btn block" style="margin-top:14px" data-close>Got it</button>`);
}

// ───── Apple Health: ייבוא מקובץ הייצוא של אפליקציית "בריאות" ─────
export function healthSheet(onDone) {
  const DAYS = 180;
  sheet(html`<div class="eyebrow">Apple Health</div><div class="h1" style="font-size:22px">Import from the Health app</div>
    <p class="sub">An app that runs in the browser cannot connect to Apple Health directly, so you import from a file. The file is read on the device only — nothing is sent out.</p>
    <div class="g-step"><span class="g-n num">1</span><div><b>Open the Health app</b><span>Tap your profile picture at the top</span></div></div>
    <div class="g-step"><span class="g-n num">2</span><div><b>"Export All Health Data"</b><span>At the bottom of the screen. Preparing it takes about a minute</span></div></div>
    <div class="g-step"><span class="g-n num">3</span><div><b>"Save to Files"</b><span>Then choose the export.zip file here</span></div></div>
    <div class="sub t-foot" style="margin-top:10px">Will be imported: all weigh-ins, and workouts from the last ${DAYS} days (running, walking, strength and more). A weigh-in or workout that already exists will not be replaced.</div>
    <div class="src-line" data-hmsg style="display:none"></div>
    <label class="btn primary block xl" style="margin-top:14px" data-hpick>Choose the file<input type="file" accept=".zip,.xml,application/zip,text/xml" hidden data-hfile></label>
    <button class="btn ghost block" style="margin-top:8px" data-close>Cancel</button>`, {
    onMount(sh, close) {
      const msg = (x) => { const m = sh.querySelector('[data-hmsg]'); m.style.display = ''; m.textContent = x; };
      sh.querySelector('[data-hfile]').addEventListener('change', async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const pick = sh.querySelector('[data-hpick]');
        pick.style.display = 'none';
        msg(`Reading the file (${Math.round(f.size / 1048576) || 1} MB)…`);
        try {
          const data = await readHealthExport(f, { since: Date.now() - DAYS * 864e5, onProgress: (n) => msg(`Reading… ${Math.round(n / 1048576)} MB scanned`) });
          const s = get();
          const days = new Set(s.weights.map((w) => w.date)), have = new Set([...s.runs, ...s.sessions].map((x) => x.importId).filter(Boolean));
          const newW = data.weights.filter((w) => !days.has(w.date)).length, newK = data.workouts.filter((w) => !have.has(w.id)).length;
          msg(`Found ${data.weights.length} weigh-ins (${newW} new) and ${data.workouts.length} workouts (${newK} new).`);
          if (!newW && !newK) { pick.style.display = ''; toast('No new data to import'); return; }
          const go = document.createElement('button');
          go.className = 'btn primary block xl'; go.style.marginTop = '14px';
          go.textContent = `Import ${newW ? `${newW} weigh-ins` : ''}${newW && newK ? ' and ' : ''}${newK ? `${newK} workouts` : ''}`;
          go.addEventListener('click', () => {
            let added;
            set((st) => { added = mergeHealth(st, data); return st; });
            toast(`Imported ${added.weights} weigh-ins and ${added.runs + added.sessions} workouts`, 3500);
            close(); onDone?.();
          });
          pick.after(go);
        } catch (err) { pick.style.display = ''; msg(`Could not read the file: ${err.message}`); }
      });
    },
  });
}

export function watchCard() {
  const p = get().profile;
  return html`<div class="card">
    <div class="row"><div style="flex:1"><b>Watch / heart rate sensor</b><div class="sub t-foot">${watchStatusText()}</div></div>
      ${isConnected() ? '<button class="btn sm danger" data-w="off">Disconnect</button>' : supported() ? '<button class="btn sm teal" data-w="on">Connect watch</button>' : ''}</div>
    ${!supported() ? `<div class="sub t-cap" style="margin-top:8px">Live heart rate is not supported in this browser. ${isIOS() ? 'On iPhone: for live heart rate, open the app in the Bluefy browser. GPS and import work as usual.' : 'Live heart rate requires Chrome (Android/desktop).'}</div>` : ''}
    <label class="field" style="margin:12px 0 0"><span>Max heart rate</span><input class="input num" data-maxhr type="number" inputmode="numeric" value="${maxHrFor(p)}"></label>
    <div class="sub t-cap" style="margin-top:6px">Default: 208 − 0.7 × age. If you know it from your watch, update it.</div>
    <div class="grid2" style="margin-top:12px"><button class="btn sm" data-w="import">${icon('download', 'width="16" height="16"')} Import</button><button class="btn sm ghost" data-w="help">How to connect</button></div>
    <div class="voice-dl"><div class="grow"><b>Apple Health</b><div class="sub">Import weigh-ins and workouts from the Health app on iPhone</div></div>
      <button class="btn sm" data-w="health">${icon('heart')} Import</button></div>
  </div>`;
}

export function bindWatchCard(root, rerender) {
  on(root, 'click', '[data-w]', async (e, b) => {
    const k = b.dataset.w;
    if (k === 'on') { await connectWatch(); rerender(); }
    if (k === 'off') { disconnect(); rerender(); }
    if (k === 'import') pickAndImport(rerender);
    if (k === 'help') garminHelp();
    if (k === 'health') healthSheet(rerender);
  });
  root.querySelector('[data-maxhr]')?.addEventListener('change', (e) => {
    const v = Number(e.target.value);
    if (v >= 150 && v <= 230) set((s) => { s.profile.maxHr = v; return s; });
  });
}
