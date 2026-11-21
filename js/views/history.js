// עריכה ומחיקה של אימונים וריצות מתוך ההיסטוריה.
import { html, esc, on, sheet, toast, fmtTime, icon } from '../ui/dom.js';
import { get, set } from '../store.js';
import { EX } from '../data/exercises.js';
import { updateSession, deleteSession, updateRun, deleteRun } from '../engine/history-edit.js';
import { parse3k } from './onboarding.js';
import { routeMap } from '../ui/map.js';

const toLocalInput = (iso) => { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const fromLocalInput = (v, fallback) => { const d = new Date(v); return Number.isNaN(d.getTime()) ? fallback : d.toISOString(); };

function confirmDelete(text, onYes) {
  sheet(html`<div class="h1" style="font-size:22px">${text}</div><p class="sub">אי אפשר לבטל את המחיקה. ההיסטוריה, הגרפים וההמלצות יחושבו מחדש.</p>
    <button class="btn danger block" data-yes>${icon('trash')} כן, למחוק</button><button class="btn ghost block" style="margin-top:8px" data-close>ביטול</button>`, {
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
      ${timed ? '' : html`<label><input class="input num" type="number" inputmode="decimal" step="0.5" data-f="w" value="${st.w ?? 0}"><small>ק״ג</small></label>`}
      <label><input class="input num" type="number" inputmode="numeric" data-f="reps" value="${st.reps ?? 0}"><small>${timed ? 'שנ׳' : 'חזרות'}</small></label>
      <button class="icon-btn ed-x" data-delset aria-label="מחק סט">✕</button></div>`;

  const body = () => html`
    <label class="field"><span>תאריך ושעה</span><input class="input" type="datetime-local" data-date value="${toLocalInput(draft.date)}"></label>
    ${draft.exercises.length ? draft.exercises.map((e, ei) => { const ex = EX[e.exId]; const timed = ['time', 'cardio'].includes(ex?.type); return html`<div class="ed-ex">
      <div class="row between"><b>${esc(ex?.name || e.exId)}</b><button class="btn sm ghost danger" data-delex="${ei}">מחק תרגיל</button></div>
      ${e.sets.map((st, si) => setRow(ei, si, st, timed))}
      <button class="btn sm ghost" data-addset="${ei}">＋ סט</button></div>`; }).join('')
    : '<div class="sub" style="margin:8px 0">לאימון הזה אין פירוט תרגילים (למשל אימון שיובא משעון).</div>'}`;

  sheet(html`<div class="eyebrow">עריכת אימון</div><div class="h1" style="font-size:22px">${esc(draft.name)}</div>
    <div class="sub">${fmtTime(draft.durationSec || 0)} · ${draft.setsDone || 0} סטים</div>
    <div id="edBody" style="margin-top:12px">${body()}</div>
    <button class="btn primary block xl" style="margin-top:14px" data-save>שמור שינויים</button>
    <button class="btn danger block" style="margin-top:8px" data-del>${icon('trash')} מחק את האימון</button>`, {
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
      on(sh, 'click', '[data-addset]', (e, b) => { const ex = draft.exercises[Number(b.dataset.addset)]; const last = ex.sets[ex.sets.length - 1] || { w: 0, reps: 8 }; ex.sets.push({ ...last, done: true }); repaint(); });
      on(sh, 'click', '[data-delex]', (e, b) => { draft.exercises.splice(Number(b.dataset.delex), 1); repaint(); });
      sh.querySelector('[data-save]').addEventListener('click', () => {
        set((s) => updateSession(s, s.sessions.findIndex((x) => x.date === orig.date && x.name === orig.name), { date: draft.date, exercises: draft.exercises }));
        toast('האימון עודכן');
        close(); onDone?.();
      });
      sh.querySelector('[data-del]').addEventListener('click', () => {
        close();
        confirmDelete('למחוק את האימון?', () => {
          set((s) => deleteSession(s, s.sessions.findIndex((x) => x.date === orig.date && x.name === orig.name)));
          toast('האימון נמחק');
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
  sheet(html`<div class="eyebrow">עריכת ריצה</div><div class="h1" style="font-size:22px">${esc(orig.name)}</div>
    ${orig.route?.length > 1 ? `<div class="run-map hist" id="hmap"></div>${orig.distanceKm && orig.durationSec ? `<div class="sub run-splits">קצב ממוצע <b class="num">${fmtTime(orig.durationSec / orig.distanceKm)}</b> לק״מ${(orig.splits || []).map((t, k) => ` · ק״מ ${k + 1}: <b class="num">${fmtTime(t - (orig.splits[k - 1] || 0))}</b>`).join('')}</div>` : ''}` : ''}
    <label class="field" style="margin-top:12px"><span>תאריך ושעה</span><input class="input" type="datetime-local" name="date" value="${toLocalInput(orig.date)}"></label>
    <div class="grid2">
      <label class="field"><span>זמן כולל (דק:שנ׳)</span><input class="input num" name="dur" value="${fmtTime(orig.durationSec || 0)}" inputmode="numeric"></label>
      <label class="field"><span>מרחק (ק״מ)</span><input class="input num" name="dist" type="number" step="0.01" inputmode="decimal" value="${orig.distanceKm ?? ''}"></label>
    </div>
    ${orig.type === 'test' ? html`<label class="field"><span>זמן 3 ק״מ (דק:שנ׳)</span><input class="input num" name="t3k" value="${orig.timeSec ? fmtTime(orig.timeSec) : ''}" inputmode="numeric"></label>` : ''}
    <button class="btn primary block xl" data-save>שמור שינויים</button>
    <button class="btn danger block" style="margin-top:8px" data-del>${icon('trash')} מחק את הריצה</button>`, {
    onMount(sh, close) {
      const val = (n) => sh.querySelector(`[name=${n}]`)?.value.trim();
      const hm = sh.querySelector('#hmap');   // המסלול שנשמר מה-GPS
      if (hm) { const m = routeMap(hm); m.setMode('fit'); requestAnimationFrame(() => m.draw(orig.route)); }
      const parseDur = (v) => { const m = String(v || '').match(/^(?:(\d+):)?(\d{1,3}):(\d{2})$/); return m ? (Number(m[1] || 0) * 3600 + Number(m[2]) * 60 + Number(m[3])) : null; };
      sh.querySelector('[data-save]').addEventListener('click', () => {
        const dur = parseDur(val('dur'));
        if (dur == null) return toast('פורמט זמן: דקות:שניות, למשל 25:30');
        const patch = { date: fromLocalInput(val('date'), orig.date), durationSec: dur, distanceKm: Number(val('dist')) || null };
        if (orig.type === 'test') {
          const t = parse3k(val('t3k'));
          if (val('t3k') && !t) return toast('זמן 3 ק״מ: למשל 13:20');
          patch.timeSec = t;
        }
        set((s) => updateRun(s, find(s), patch));
        toast('הריצה עודכנה');
        close(); onDone?.();
      });
      sh.querySelector('[data-del]').addEventListener('click', () => {
        close();
        confirmDelete('למחוק את הריצה?', () => { set((s) => deleteRun(s, find(s))); toast('הריצה נמחקה'); onDone?.(); });
      });
    },
  });
}
