// שאלון התזונה הקצר — אותו רכיב בהיכרות ובמסך התזונה (העדפות). מוצג רק למי שביקש ליווי תזונה.
import { DIETS, ALLERGIES } from '../engine/nutrition.js';

const seg = (attr, opts, cur) => `<div class="seg" ${attr}>${opts.map(([v, t]) => `<button data-v="${v}" class="${String(cur) === String(v) ? 'on' : ''}">${t}</button>`).join('')}</div>`;

export function nutPrefsHtml(o) {
  const alg = o.allergies || [];
  return `<div class="h2 np-h">איך אוכלים?</div>${seg('data-np="diet"', Object.entries(DIETS), o.diet || 'all')}
    <div class="h2 np-h">כשרות</div>${seg('data-np="kosher"', [['0', 'בלי הפרדה'], ['1', 'בשר וחלב בנפרד']], o.kosher ? 1 : 0)}
    <div class="h2 np-h">כמה ארוחות ביום?</div>${seg('data-np="mealsN"', [['3', '3'], ['4', '4'], ['5', '5']], o.mealsN || 5)}
    <div class="h2 np-h">אלרגיה או רגישות?</div>
    <div class="chips">${Object.entries(ALLERGIES).map(([k, v]) => `<button class="chip no ${alg.includes(k) ? 'on' : ''}" data-np-alg="${k}">${v}</button>`).join('')}</div>
    ${alg.length ? '<div class="sub t-foot" style="margin-top:8px">התפריט ייבנה בלי המאכלים האלה לפי המאגר שלנו. באלרגיה — תמיד לבדוק את התווית על המוצר.</div>' : ''}`;
}

// change(mutate): mutate מקבל את האובייקט שמחזיק את ההעדפות (טיוטת ההיכרות או הפרופיל) ומעדכן אותו
export function bindNutPrefs(root, on, change) {
  on(root, 'click', '[data-np] button', (e, b) => {
    const k = b.parentElement.dataset.np, v = b.dataset.v;
    change((o) => { o[k] = k === 'diet' ? v : k === 'kosher' ? v === '1' : Number(v); });
  });
  on(root, 'click', '[data-np-alg]', (e, b) => {
    const k = b.dataset.npAlg;
    change((o) => { const a = o.allergies || []; o.allergies = a.includes(k) ? a.filter((x) => x !== k) : [...a, k]; });
  });
}
