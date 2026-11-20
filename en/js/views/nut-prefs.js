// שאלון התזונה הקצר — אותו רכיב בהיכרות ובמסך התזונה (העדפות). מוצג רק למי שביקש ליווי תזונה.
import { DIETS, ALLERGIES, HEALTH, canService, inService } from '../engine/nutrition.js';

const seg = (attr, opts, cur) => `<div class="seg" ${attr}>${opts.map(([v, t]) => `<button data-v="${v}" class="${String(cur) === String(v) ? 'on' : ''}">${t}</button>`).join('')}</div>`;

export function nutPrefsHtml(o) {
  const alg = o.allergies || [], hl = o.health || [];
  const health = Object.entries(HEALTH).filter(([k]) => k === 'med' || o.sex === 'f');
  const where = canService(o) ? `<div class="h2 np-h">Where do you eat most of the week?</div>${seg('data-np="eatAt"', [['home', 'At home and at work'], ['service', 'In service']], inService(o) ? 'service' : 'home')}
    ${inService(o) ? '<div class="sub t-foot" style="margin-top:8px">The menu will be built from what the dining hall serves, and on field days from dry rations and canned food. On weekends, switch to the "At home" tab. Keeping meat and dairy separate has been turned on, and you can change it.</div>' : ''}` : '';
  return `${where}<div class="h2 np-h">How do you eat?</div>${seg('data-np="diet"', Object.entries(DIETS), o.diet || 'all')}
    <div class="h2 np-h">Kosher</div>${seg('data-np="kosher"', [['0', 'No separation'], ['1', 'Meat and dairy separate']], o.kosher ? 1 : 0)}
    <div class="h2 np-h">How many meals a day?</div>${seg('data-np="mealsN"', [['3', '3'], ['4', '4'], ['5', '5']], o.mealsN || 5)}
    <div class="h2 np-h">Allergy or sensitivity?</div>
    <div class="chips">${Object.entries(ALLERGIES).map(([k, v]) => `<button class="chip no ${alg.includes(k) ? 'on' : ''}" data-np-alg="${k}">${v}</button>`).join('')}</div>
    ${alg.length ? '<div class="sub t-foot" style="margin-top:8px">The menu will be built without these foods, based on our database, and they will be marked in search. With an allergy, always check the product label.</div>' : ''}
    <div class="h2 np-h">Do any of these apply?</div>
    <div class="chips">${health.map(([k, v]) => `<button class="chip ${hl.includes(k) ? 'on' : ''}" data-np-health="${k}">${v}</button>`).join('')}</div>
    <div class="sub t-foot" style="margin-top:8px">${hl.length ? 'In this situation we do not build a weight-loss menu: the target will be maintenance, and the recommendations are general. It is best to plan your nutrition with your doctor or a clinical dietitian.' : 'You don\'t have to mark anything. This only affects the safety of your nutrition targets.'}</div>`;
}

// change(mutate): mutate מקבל את האובייקט שמחזיק את ההעדפות (טיוטת ההיכרות או הפרופיל) ומעדכן אותו
export function bindNutPrefs(root, on, change) {
  on(root, 'click', '[data-np] button', (e, b) => {
    const k = b.parentElement.dataset.np, v = b.dataset.v;
    change((o) => { if (k === 'eatAt') { o.eatAt = v; if (v === 'service') o.kosher = true; return; } o[k] = k === 'diet' ? v : k === 'kosher' ? v === '1' : Number(v); });
  });
  on(root, 'click', '[data-np-health]', (e, b) => {
    const k = b.dataset.npHealth;
    change((o) => { const a = o.health || []; o.health = a.includes(k) ? a.filter((x) => x !== k) : [...a, k]; });
  });
  on(root, 'click', '[data-np-alg]', (e, b) => {
    const k = b.dataset.npAlg;
    change((o) => { const a = o.allergies || []; o.allergies = a.includes(k) ? a.filter((x) => x !== k) : [...a, k]; });
  });
}
