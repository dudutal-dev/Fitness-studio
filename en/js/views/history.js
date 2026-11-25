// עריכה ומחיקה של אימונים וריצות מתוך ההיסטוריה.
import { html, esc, on, sheet, toast, fmtTime, icon } from '../ui/dom.js';
import { get, set } from '../store.js';
import { EX } from '../data/exercises.js';
import { updateSession, deleteSession, updateRun, deleteRun, isTimed } from '../engine/history-edit.js';
import { parse3k } from './onboarding.js';
import { routeMap } from '../ui/map.js';
import { renderRouteImage, loadRouteImage, deleteRouteImage, shareRouteImage } from '../ui/route-image.js';

const toLocalInput = (iso) => { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const fromLocalInput = (v, fallback) => { const d = new Date(v); return Number.isNaN(d.getTime()) ? fallback : d.toISOString(); };

function confirmDelete(text, onYes) {
  sheet(html`<div class="h1" style="font-size:22px">${text}</div><p class="sub">Deleting can't be undone. History, charts and recommendations will be recalculated.</p>
    <button class="btn danger block" data-yes>${icon('trash')} Yes, delete</button><button class="btn ghost block" style="margin-top:8px" data-close>Cancel</button>`, {
    onMount(sh, close) { sh.querySelector('[data-yes]').addEventListener('click', () => { close(); onYes(); }); },
  });
}

export function openSessionEditor(index, onDone) {
  const orig = get().sessions[index];
  if (!orig) return;
  const draft = structuredClone(orig);
  draft.exercises ||= [];

  const setRow = (ei, si, st, timed) => html`<div class="ed-set" data-ei="${ei}" data-si="${si}">
      <span class="ed-n num">${si + 1}</span>
      ${timed ? '' : html`<label><input class="input num" type="number" inputmode="decimal" step="0.5" data-f="w" value="${st.w ?? 0}"><small>kg</small></label>`}
      <label><input class="input num" type="number" inputmode="numeric" data-f="reps" value="${st.reps ?? 0}"><small>${timed ? 'sec' : 'reps'}</small></label>
      <button class="icon-btn ed-x" data-delset aria-label="Delete set">✕</button></div>`;

  const body = () => html`
    <label class="field"><span>Date and time</span><input class="input" type="datetime-local" data-date value="${toLocalInput(draft.date)}"></label>
    ${draft.exercises.length ? draft.exercises.map((e, ei) => { const ex = EX[e.exId]; const timed = isTimed(e); return html`<div class="ed-ex">
      <div class="row between"><b>${esc(ex?.name || e.exId)}</b><button class="btn sm ghost danger" data-delex="${ei}">Delete exercise</button></div>
      ${e.sets.map((st, si) => setRow(ei, si, st, timed))}
      <button class="btn sm ghost" data-addset="${ei}">＋ Set</button></div>`; }).join('')
    : '<div class="sub" style="margin:8px 0">This workout has no exercise details (for example, a workout imported from a watch).</div>'}`;

  sheet(html`<div class="eyebrow">Edit workout</div><div class="h1" style="font-size:22px">${esc(draft.name)}</div>
    <div class="sub">${fmtTime(draft.durationSec || 0)}${draft.setsDone ? ` · ${draft.setsDone} Sets` : ''}</div>
    <div id="edBody" style="margin-top:12px">${body()}</div>
    <button class="btn primary block xl" style="margin-top:14px" data-save>Save changes</button>
    <button class="btn danger block" style="margin-top:8px" data-del>${icon('trash')} Delete workout</button>`, {
    onMount(sh, close) {
      const repaint = () => { sh.querySelector('#edBody').innerHTML = body(); };
      sh.addEventListener('input', (e) => {
        const inp = e.target;
        if (inp.dataset.date !== undefined) { draft.date = fromLocalInput(inp.value, draft.date); return; }
        const row = inp.closest('.ed-set');
        if (!row) return;
        draft.exercises[Number(row.dataset.ei)].sets[Number(row.dataset.si)][inp.dataset.f] = Number(inp.value) || 0;
      });
      on(sh, 'click', '[data-delset]', (e, b) => { const row = b.closest('.ed-set'); draft.exercises[Number(row.dataset.ei)].sets.splice(Number(row.dataset.si), 1); repaint(); });
      on(sh, 'click', '[data-addset]', (e, b) => { const ex = draft.exercises[Number(b.dataset.addset)]; const last = ex.sets[ex.sets.length - 1] || { w: 0, reps: isTimed(ex) ? 30 : 8 }; ex.sets.push({ ...last, done: true }); repaint(); });
      on(sh, 'click', '[data-delex]', (e, b) => { draft.exercises.splice(Number(b.dataset.delex), 1); repaint(); });
      sh.querySelector('[data-save]').addEventListener('click', () => {
        set((s) => updateSession(s, s.sessions.findIndex((x) => x.date === orig.date && x.name === orig.name), { date: draft.date, exercises: draft.exercises }));
        toast('Workout updated');
        close(); onDone?.();
      });
      sh.querySelector('[data-del]').addEventListener('click', () => {
        close();
        confirmDelete('Delete this workout?', () => {
          set((s) => deleteSession(s, s.sessions.findIndex((x) => x.date === orig.date && x.name === orig.name)));
          toast('Workout deleted');
          onDone?.();
        });
      });
    },
  });
}

export function openRunEditor(index, onDone) {
  const orig = get().runs[index];
  if (!orig) return;
  const find = (s) => s.runs.findIndex((r) => r.date === orig.date && r.name === orig.name);
  sheet(html`<div class="eyebrow">Edit run</div><div class="h1" style="font-size:22px">${esc(orig.name)}</div>
    ${orig.route?.length > 1 ? `<div class="run-map hist" id="hmap"></div><img class="route-img" id="himg" alt="" hidden><button class="btn sm block" data-rimg style="margin-bottom:8px">Share route image</button>${orig.distanceKm && orig.durationSec ? `<div class="sub run-splits">Average pace <b class="num">${fmtTime(orig.durationSec / orig.distanceKm)}</b> per km${(orig.splits || []).map((t, k) => ` · km ${k + 1}: <b class="num">${fmtTime(t - (orig.splits[k - 1] || 0))}</b>`).join('')}</div>` : ''}` : ''}
    <label class="field" style="margin-top:12px"><span>Date and time</span><input class="input" type="datetime-local" name="date" value="${toLocalInput(orig.date)}"></label>
    <div class="grid2">
      <label class="field"><span>Total time (min:sec)</span><input class="input num" name="dur" value="${fmtTime(orig.durationSec || 0)}" inputmode="numeric"></label>
      <label class="field"><span>Distance (km)</span><input class="input num" name="dist" type="number" step="0.01" inputmode="decimal" value="${orig.distanceKm ?? ''}"></label>
    </div>
    ${orig.type === 'test' ? html`<label class="field"><span>3 km time (min:sec)</span><input class="input num" name="t3k" value="${orig.timeSec ? fmtTime(orig.timeSec) : ''}" inputmode="numeric"></label>` : ''}
    <button class="btn primary block xl" data-save>Save changes</button>
    <button class="btn danger block" style="margin-top:8px" data-del>${icon('trash')} Delete run</button>`, {
    onMount(sh, close) {
      const val = (n) => sh.querySelector(`[name=${n}]`)?.value.trim();
      const hm = sh.querySelector('#hmap');   // המסלול שנשמר מה-GPS
      if (hm) {
        const m = routeMap(hm); m.setMode('fit'); requestAnimationFrame(() => m.draw(orig.route));
        // התמונה שנשמרה בסוף האימון (מוצגת גם בלי רשת); אם אין — המפה החיה, והתמונה נוצרת כשמבקשים לשתף
        let saved = null;
        loadRouteImage(orig.date).then((b) => { if (!b || !sh.isConnected) return; saved = b; const im = sh.querySelector('#himg'); im.src = URL.createObjectURL(b); im.hidden = false; hm.hidden = true; });
        sh.querySelector('[data-rimg]').addEventListener('click', async () => {
          const km = orig.distanceKm, cap = km && orig.durationSec ? `${km} km · ${fmtTime(orig.durationSec)} · ${fmtTime(orig.durationSec / km)} per km` : '';
          shareRouteImage(saved || await renderRouteImage(orig.route, { title: orig.name, caption: cap, date: new Date(orig.date).toLocaleDateString(document.documentElement.lang === 'en' ? 'en-GB' : 'en-US', { day: 'numeric', month: 'numeric', year: 'numeric' }),
            stats: km && orig.durationSec ? [{ v: km, l: 'km' }, { v: fmtTime(orig.durationSec), l: 'Time' }, { v: fmtTime(orig.durationSec / km), l: 'Pace per km' }] : [], marks: orig.marks || [], ...(orig.med ? { accent: '#8a5cf6', art: `../assets/med/${orig.med}.webp` } : {}) }), orig.name);
        });
      }
      const parseDur = (v) => { const m = String(v || '').match(/^(?:(\d+):)?(\d{1,3}):(\d{2})$/); return m ? (Number(m[1] || 0) * 3600 + Number(m[2]) * 60 + Number(m[3])) : null; };
      sh.querySelector('[data-save]').addEventListener('click', () => {
        const dur = parseDur(val('dur'));
        if (dur == null) return toast('Time format: minutes:seconds, for example 25:30');
        const patch = { date: fromLocalInput(val('date'), orig.date), durationSec: dur, distanceKm: Number(val('dist')) || null };
        if (orig.type === 'test') {
          const t = parse3k(val('t3k'));
          if (val('t3k') && !t) return toast('3 km time: for example 13:20');
          patch.timeSec = t;
        }
        set((s) => updateRun(s, find(s), patch));
        toast('Run updated');
        close(); onDone?.();
      });
      sh.querySelector('[data-del]').addEventListener('click', () => {
        close();
        confirmDelete('Delete this run?', () => { set((s) => deleteRun(s, find(s))); deleteRouteImage(orig.date); toast('Run deleted'); onDone?.(); });
      });
    },
  });
}
