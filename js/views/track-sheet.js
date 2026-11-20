// "המסלול שלי" — חלונית מהבית: החלפת מסלול, והוספה או הורדה של אימוני מוביליטי. (קיים רק ב-MOVA.)
// ההחלפה עצמה היא אותה פעולה שבהגדרות (switchTrack): נבנית תוכנית חדשה, וכל השאר נשמר.
import { html, esc, on, sheet, toast } from '../ui/dom.js';
import { get, set, regenerateWeek } from '../store.js';
import { COACHES, coachesFor } from '../data/coaches.js';
import { TRACKS } from './onboarding.js';
import { switchTrack } from './cali-ui.js';
import { mobCount, newMob } from '../engine/mob.js';

const ORDER = ['gym', 'cali', 'run', 'hiit', 'pil', 'yoga', 'mob', 'mix'];
const faces = (id) => (id === 'mix' ? ['ori', 'noa', 'maya'].map((c) => COACHES[c]) : coachesFor(id)).map((c) => `<img src="${c.face}" alt="">`).join('');

export const trackLabel = (p) => (TRACKS[p.track] || TRACKS.gym).name + (p.track !== 'mob' && mobCount(p) ? ' + מוביליטי' : '');

export function trackSheet(rerender) {
  const body = () => {
    const p = get().profile, cur = TRACKS[p.track] ? p.track : 'gym', n = mobCount(p);
    const max = Math.min(3, (p.days || 3) - (cur === 'mix' ? 2 : 1));
    return html`<div class="h1" style="font-size:22px">המסלול שלי</div>
      <p class="sub" style="margin:4px 0 12px">עכשיו: <b>${esc(trackLabel(p))}</b>. מעבר למסלול אחר בונה תוכנית אימונים חדשה ומחליף מאמן. האימונים שכבר נעשו, המשקל, ההתקדמות והעדפות התזונה נשמרים; יעדי הקלוריות והחלבון מתעדכנים למסלול החדש.</p>
      <div class="ts-list">${ORDER.map((id) => html`<button class="ts-row ${id === cur ? 'on' : ''}" data-ts="${id}">
        <span class="ts-faces">${faces(id)}</span><span class="ts-txt"><b>${TRACKS[id].name}</b><small>${esc(TRACKS[id].sub)}</small></span>
        ${id === cur ? '<span class="tag lime">נוכחי</span>' : ''}</button>`)}</div>
      ${cur !== 'mob' && max >= 1 ? html`<div class="h2" style="margin-top:14px">להוסיף מוביליטי לשבוע</div>
        <div class="seg" data-ts-mob>${Array.from({ length: max + 1 }, (_, i) => `<button data-v="${i}" class="${n === i ? 'on' : ''}">${i === 0 ? 'בלי' : i}</button>`).join('')}</div>
        <div class="sub t-foot" style="margin-top:6px">${n ? `${n === 1 ? 'אימון אחד' : `${n} אימונים`} מתוך ${p.days} בשבוע ${n === 1 ? 'הוא' : 'הם'} מוביליטי עם ${COACHES.tamar.name}.` : `אימוני גמישות וטווחי תנועה עם ${COACHES.tamar.name}, על חשבון חלק מימי האימון.`}</div>` : ''}
      <button class="btn block" style="margin-top:14px" data-close>סגור</button>`;
  };
  sheet(`<div data-ts-body>${body()}</div>`, {
    onMount(sh, close) {
      const repaint = () => { const b = sh.querySelector('[data-ts-body]'); if (b) b.innerHTML = body(); };
      on(sh, 'click', '[data-ts]', (e, b) => {
        const id = b.dataset.ts;
        if (id === get().profile.track) return;
        close(); switchTrack(id, rerender);
      });
      on(sh, 'click', '[data-ts-mob] button', (e, b) => {
        const n = Number(b.dataset.v);
        set((s) => { const q = s.profile; if (n && !q.mob) q.mob = newMob(); q.mobN = n; s.plan.completedDays = []; return regenerateWeek(s); });
        toast(n ? `${n === 1 ? 'אימון מוביליטי אחד נוסף' : `${n} אימוני מוביליטי נוספו`} לשבוע` : 'אימוני המוביליטי הוסרו מהשבוע');
        repaint(); rerender();
      });
    },
  });
}
