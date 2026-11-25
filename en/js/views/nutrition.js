// מסך תזונה: יעדים מול מה שנאכל בפועל (יומן אכילה עם חיפוש ב-600+ מזונות), תפריט יומי לפי הקשר (בסיס/שטח/בית),
// "לא אוכל", מזונות אישיים, מעקב שתייה, טיפים.
import { html, esc, on, toast, sheet, icon, ib, em, emi, vibrate } from '../ui/dom.js';
import { ring } from '../ui/charts.js';
import { get, set, daily, setDaily, g } from '../store.js';
import { dayType, dayTargets, fuelTips, DAY_TYPES, wantsNutrition, allergyHits, swapOptions, dishOptions, inService, mainCtx, ctxList, activityFor } from '../engine/nutrition.js';
import { nutPrefsHtml, bindNutPrefs } from './nut-prefs.js';
import { mealPlan, menuToday, orderMeals, mealWindow, qtyLabel, dayTotals, foodLookup, searchFoods, partsTotals, ACTIVITY, activityKey, trendAdvice } from '../engine/nutrition.js';
import { FOOD, FOODS, DISLIKE_TAGS, NO_VEG_TIPS, ARMY_TIPS, NUTRITION_REFS } from '../data/foods.js';
// טיפים למי שאוכל בחדר אוכל ובשטח (העדפות ← "בשירות"): במקום הטיפ על ימים עמוסים — שלושה טיפים של שירות
const SERVICE_TIPS = [
  { icon: '🍽️', title: 'In the dining hall', text: 'First fill half your plate with protein and vegetables — chicken, meat, eggs, legumes and salad — and only then add rice, Israeli couscous or bread. A second helping of protein beats a second helping of carbs.' },
  { icon: '🎒', title: 'In the field', text: 'On field days energy expenditure is very high — choose "Field" as your activity level (Nutrition → Preferences) so the target goes up. Tuna, canned meat, halva, dates and nuts pack a lot of energy into a small volume.' },
  { icon: '🛒', title: 'From the canteen', text: 'When a meal is low in protein: a protein yogurt, cheese, tuna or a protein bar fills the gap. Chocolate milk after a workout is a good, easy recovery option.' },
  ...ARMY_TIPS.filter((t) => t.title !== 'Busy days'),
];
import { dayKey } from '../engine/stats.js';
import { lookupBarcode, startScanner } from '../barcode.js';

let tab = 'today';
export const openNutritionTab = (t) => { tab = t; };   // מהבית: הכרטיס "התזונה של היום" פותח ישר את התפריט
let ctx = null;   // נקבע בכניסה לפי ההעדפה: בבית, או חדר האוכל למי שבשירות
let editDislikes = false;
let dislikeQuery = '';

const CATS = [['', 'All'], ['meal', 'Dishes'], ['protein', 'Protein'], ['dairy', 'Dairy'], ['carb', 'Carbs'], ['fruit', 'Fruit'], ['veg', 'Vegetables'], ['fat', 'Fats'], ['sauce', 'Sauces'], ['snack', 'Snacks and drinks'], ['custom', 'Mine']];
const QTYS = [0.5, 1, 1.5, 2, 3];
const MEAL_SLOTS = [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['dinner', 'Dinner'], ['snack', 'Snack']];

function currentSlot() {
  const h = new Date().getHours();
  return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 21 ? 'dinner' : 'snack';
}

// הערות בטיחות: למי שאין לו יעד גירעון (ראו nutritionGuard במנוע) — מה השתנה, ולמי לפנות
const GUARD_NOTES = {
  preg: 'Weight loss is not a goal during pregnancy, so the target here is maintenance. Needs rise later in pregnancy — about 340 kcal a day in the second trimester and about 450 in the third. It is best to plan your nutrition with your care team or a clinical dietitian.',
  nurse: 'While breastfeeding the body needs more energy (about 330 to 400 kcal a day), so the target here is not a deficit. For personal guidance, see a clinical dietitian.',
  med: 'With a medical condition that is affected by diet, the recommendations here are general only: the target is maintenance and protein is moderate. It is best to plan your nutrition with your doctor or a clinical dietitian.',
  minor: 'Under 18 we do not build a weight-loss menu, because the body is still growing. The target is regular, sufficient eating. For questions about weight, see a pediatrician or a dietitian.',
  under: 'Based on height and weight, the weight is below the healthy range (BMI under 18.5), so the target is not a deficit. It is a good idea to consult a doctor or a dietitian.',
};
const guardCard = (t) => (t.guard?.noDeficit ? `<div class="card tight guard-note">${icon('shield', 'width="18" height="18"')}<div>${t.guard.reasons.map((k) => `<p>${GUARD_NOTES[k]}</p>`).join('')}</div></div>` : '');
const algMark = (f, p) => { const h = allergyHits(f, p); return h.length ? `<small class="alg-warn">${icon('warn', 'width="13" height="13"')} ${h.join(', ')}</small>` : ''; };

export function renderNutrition(root) {
  const s = get();
  const p = s.profile;
  // ליווי התזונה כבוי (בחירת המתאמן בהיכרות): מסך אחד קצר, עם אפשרות להפעיל
  // מסלול המדיטציה בתנועה: אין תפריט (החלטת בעל המוצר, 25.11.2026) — מסך קצר בלי כפתור הפעלה
  if (p.track === 'med') {
    root.innerHTML = html`<div class="page-head"><div class="h1">Nutrition</div></div>
      <div class="card nut-off"><div class="nc-ico">${icon('leaf')}</div><b style="font-size:19px">This track has no menu</b>
        <p class="sub" style="margin:8px 0 4px">Moving meditation is walking and quiet, with no calorie targets and no food log. If you want nutrition guidance, pick a different main track under "My track", and the menu comes back as it was.</p></div>`;
    return;
  }
  if (!wantsNutrition(p)) {
    root.innerHTML = html`<div class="page-head"><div class="h1">Nutrition</div></div>
      <div class="card nut-off"><div class="nc-ico">${icon('food')}</div><b style="font-size:19px">Nutrition coaching is off</b>
        <p class="sub" style="margin:8px 0 16px">You chose to focus on training. If you like, you can turn on a tailored daily menu, calorie and protein targets and a food log — with a few short questions.</p>
        <button class="btn primary block" data-act="nut-on">Turn on nutrition coaching</button></div>`;
    on(root, 'click', '[data-act="nut-on"]', () => { set((s2) => { s2.profile.nutrition = true; return s2; }); tab = 'prefs'; renderNutrition(root); });
    return;
  }
  const custom = p.customFoods || [];
  const dd = daily();
  // היעדים והתפריט של היום — לפי האימון של היום (ראו dayType / dayTargets במנוע התזונה)
  const dt = dayType(s, Date.now(), dd.dayType);
  // החלפות שנעשו בתפריט של היום נשמרות ברשומה היומית, כל עוד לא ביקשו "תפריט אחר" ולא שינו מקום
  ctx ||= mainCtx(p);
  // הזרע, היומן האחרון וההחלפות מגיעים ממקור אחד (menuToday במנוע) — אותו תפריט כמו במסך הבית; הזרע נגזר בכל ציור, לא פעם אחת בטעינה (25.11.2026)
  const ms = menuToday(s, ctx), seed = ms.seed;
  const mw = mealWindow(s), plan = orderMeals(mealPlan(p, { ...ms, t: dayTargets(p, dt.type) }), mw);   // הארוחות מסודרות לפי שעת האימון של היום
  const t = plan.targets;
  const fuel = fuelTips(p, dt.type);
  const eaten = dayTotals(dd, custom);
  const ctxs = ctxList(p);
  const log = (dd.foods || []).map((it, i) => ({ ...it, i, f: foodLookup(it.id, custom) })).filter((x) => x.f);
  const left = t.kcal - eaten.kcal;
  const actKey = activityKey(p);
  const act = activityFor(p)[actKey];
  const advice = trendAdvice(s.weights, p);
  const nf = (n) => n.toLocaleString('en-US');
  // ארוחות שנרשמו אתמול ועדיין לא נרשמו היום — אפשר להעתיק בהקשה אחת
  const yFoods = (s.daily[dayKey(new Date(Date.now() - 864e5))]?.foods || []).filter((it) => foodLookup(it.id, custom));
  const repeatable = MEAL_SLOTS.map(([slot, label]) => [slot, label, yFoods.filter((it) => (it.slot || 'snack') === slot).length])
    .filter(([slot, , n]) => n && !log.some((x) => (x.slot || 'snack') === slot));
  const macro = (name, val, of, unit, color) => `<div class="macro"><div class="row between"><span>${name}</span><b><bdi>${val}</bdi><small> / <bdi>${of} ${unit}</bdi></small></b></div>
    <div class="bar"><i style="width:${Math.min(100, Math.round((val / Math.max(1, of)) * 100))}%;background:${color}"></i></div></div>`;
  // לפי היעד שחושב בפועל, לא לפי המטרה שנבחרה (25.11.2026): במצב רגיש (nutritionGuard) המטרה "חיטוב" מקבלת יעד תחזוקה, והשורה אמרה "גירעון"
  const goalTag = t.delta < 0 ? 'Deficit' : t.delta > 0 ? 'Surplus' : 'Maintenance';
  const TABS = [['today', 'Today'], ['menu', 'Menu'], ['prefs', 'Preferences']];

  const todayTab = () => html`
    <div class="card tight day-fuel">
      <div class="row between"><div class="grow"><div class="eyebrow">Today's nutrition</div><b>${DAY_TYPES[dt.type].name}</b>${dt.name ? `<span class="sub"> · ${esc(dt.name)}</span>` : ''}</div>
        ${dt.done ? '<span class="tag lime">Done</span>' : dt.planned || dt.manual ? `<div class="seg" data-daytype><button data-v="train" class="${dt.manual ? '' : 'on'}">Workout</button><button data-v="rest" class="${dt.manual ? 'on' : ''}">Rest</button></div>` : ''}</div>
      <div class="sub t-foot" style="margin-top:6px">${t.dayDelta ? `Today's target: <b class="num">${nf(t.kcal)}</b> kcal — <span class="num">${nf(Math.abs(t.dayDelta))}</span> ${t.dayDelta > 0 ? 'above' : 'below'} a regular day, and the whole change is in carbs (<span class="num">${t.carbs}</span> g instead of <span class="num">${t.baseCarbs}</span>). Protein stays the same.` : 'Today\'s target is your regular target.'}</div>
      ${fuel.rest ? `<div class="fuel"><div><b>Today</b><span>${fuel.rest}</span></div></div>`
    : `<div class="fuel"><div><b>Before</b><span>${fuel.before}</span></div><div><b>During</b><span>${fuel.during}</span></div><div><b>After</b><span>${fuel.after}</span></div></div>`}
    </div>

    <div class="card">
      <div class="nut-top">
        ${ring(eaten.kcal / t.kcal, { size: 124, stroke: 11, color: left < 0 ? 'var(--acc)' : 'var(--pri)', big: nf(Math.abs(left)), lbl: left >= 0 ? 'kcal left' : 'kcal over target' })}
        <div class="nut-macros">
          ${macro('Protein', eaten.p, t.protein, 'g', 'var(--pri)')}
          ${macro('Carbs', eaten.c, t.carbs, 'g', 'var(--acc)')}
          ${macro('Fat', eaten.f, t.fat, 'g', 'var(--orange)')}
        </div>
      </div>
      <div class="sub t-foot center-t mt-3">Eaten <b class="num">${nf(eaten.kcal)}</b> of <b class="num">${nf(t.kcal)}</b> kcal · ${goalTag} · fiber <span class="num">${eaten.fib}</span>/<span class="num">${t.fiber}</span> g</div>
      <button class="btn primary block mt-4" data-act="add-food">＋ Add food</button>
    </div>

    <div class="card tight water-row">
      ${ib('drop', 'acc')}
      <div class="grow"><div class="row between"><b>Water</b><span class="num sub">${(dd.water / 1000).toFixed(1)} / ${t.waterL} L</span></div>
        <div class="bar"><i style="width:${Math.min(100, Math.round((dd.water / (t.waterL * 1000)) * 100))}%;background:var(--blue)"></i></div></div>
      <button class="btn sm" data-add="water">＋ Glass</button>
    </div>

    ${advice ? html`<div class="card tight advice ${advice.step ? 'act' : ''}">
      <b>${advice.onTrack ? 'Your pace matches your goal' : advice.step > 0 ? 'Weight is dropping faster than planned' : advice.step < 0 ? 'Weight is rising faster than planned' : 'Weight trend'}</b>
      <div class="sub t-foot">In recent weeks: <span class="num ltr">${advice.kgWeek > 0 ? '+' : ''}${advice.kgWeek}</span> kg per week (<span class="num ltr">${advice.pctWeek}%</span>). Recommended range for your goal: <span class="num ltr">${advice.range[0]}%</span> to <span class="num ltr">${advice.range[1]}%</span>.</div>
      ${advice.step ? `<button class="btn sm block mt-3" data-adjust="${advice.step}">${advice.step > 0 ? 'Raise' : 'Lower'} the target by ${Math.abs(advice.step)} kcal</button>` : ''}
    </div>` : ''}

    <div class="h2">What I ate${log.length ? `<span class="more" data-act="clear-log">Clear</span>` : ''}</div>
    ${repeatable.length ? `<div class="chips" style="margin-bottom:10px">${repeatable.map(([slot, label, n]) => `<button class="chip" data-repeat="${slot}">${icon('refresh')} ${label} same as yesterday <small class="num">(${n})</small></button>`).join('')}</div>` : ''}
    <div class="card tight">
      ${log.length ? MEAL_SLOTS.map(([slot, label]) => {
        const items = log.filter((x) => (x.slot || 'snack') === slot);
        if (!items.length) return '';
        const k = items.reduce((a, x) => a + x.f.kcal * x.qty, 0);
        return html`<div class="log-slot"><div class="row between"><b>${label}</b><span class="sub num t-cap">${Math.round(k)} kcal</span></div>
          ${items.map((x) => html`<button class="log-it" data-log="${x.i}"><span>${esc(x.f.name)}<small> · ${qtyLabel(x.qty)}${esc(x.f.portion)}</small>${algMark(x.f, p)}</span>
            <span class="num sub">${Math.round(x.f.kcal * x.qty)}</span></button>`)}</div>`;
      }).join('') : `<div class="empty" style="padding:12px 4px">No food logged yet today.<br>You can add food, or mark a whole meal in the "Menu" tab.</div>`}
    </div>`;

  const menuTab = () => html`
    <div class="seg">${ctxs.map(([k, v]) => `<button data-ctx="${k}" class="${ctx === k ? 'on' : ''}">${v}</button>`)}</div>
    <div class="row between menu-sum"><div class="sub t-foot">Menu: <b class="num">${nf(plan.total.kcal)}</b> kcal · <b class="num">${plan.total.p}</b> g protein<br>Target: <span class="num">${nf(t.kcal)}</span> kcal · <span class="num">${t.protein}</span> g protein</div>
      <button class="btn sm" data-act="shuffle">${icon('swap', 'width="16" height="16"')} Different menu</button></div>
    ${mw && plan.meals.some((m) => m.id === 'post') ? `<div class="sub t-foot meal-note">${mw === 'rest' ? 'No workout in the calendar today — a snack replaces "After workout".' : mw.done ? 'Meals are ordered around the workout you did today.' : `Today's workout is at ${mw.time}  — meals are ordered around it.`}</div>` : ''}
    <div class="sub t-foot swap-hint">Tap a dish or a food to see alternatives; the amounts adjust to your target.</div>
    ${plan.over ? `<div class="sub t-foot" style="margin:-4px 0 10px;color:var(--orange)">${plan.lowP ? 'With the restrictions you chose there aren\'t enough suitable foods here: the menu comes out above the calorie target and below the protein target. You can try "Different menu".' : 'With the restrictions you chose there aren\'t enough suitable foods here, and the menu comes out above the calorie target. You can make a portion smaller, or try "Different menu".'}</div>`
    : plan.short ? '<div class="sub t-foot" style="margin:-4px 0 10px;color:var(--orange)">With the restrictions you chose, there are not enough suitable foods here to reach the target. Top up with what you have on hand, or try "Different menu".</div>' : ''}
    ${plan.meals.map((m, mi) => html`<div class="card tight meal">
      <div class="meal-head"><div class="grow"><b>${emi(m.icon)} ${m.name}${m.hint ? ` <small class="meal-at num">around ${m.hint}</small>` : ''}</b><span class="num sub t-foot">${m.total.kcal} kcal · ${m.total.p} g protein</span></div>
        <button class="eat-btn" data-eat-meal="${mi}" aria-label="I ate ${esc(m.name)}">${icon('check')} Ate it</button></div>
      <button class="dish-line" data-dish="${mi}">${m.dish ? `<b>${esc(m.dish.name)}</b>` : '<b class="sub" style="font-weight:600">Built from the foods</b>'}<span>${icon('swap')} Different dish</span></button>
      ${m.items.map((it) => { const f = FOOD[it.id]; return `<button class="mi" data-swap="${mi}|${it.id}"><span>${it.extra ? '<span class="tag">Extra</span>' : ''}${esc(f.name)}</span><small>${qtyLabel(it.qty)}${esc(f.portion)}</small><i>${icon('swap')}</i></button>`; })}
    </div>`)}
    <div class="sub t-foot center-t mt-3">Daily total: <span class="num">${plan.total.c}</span> g carbs · <span class="num">${plan.total.f}</span> g fat · <span class="num">${plan.total.fib}</span> g fiber (target ${t.fiber})</div>`;

  const prefsTab = () => html`
    ${nutPrefsHtml(p)}
    <div class="h2">Activity level</div>
    <div class="seg" data-activity>${Object.entries(activityFor(p)).map(([k, a]) => `<button data-v="${k}" class="${actKey === k ? 'on' : ''}">${a.name}</button>`).join('')}</div>
    <div class="sub t-foot mt-2">${esc(act.full)}: ${esc(act.desc)}. This sets your calorie target.</div>

    <div class="h2">What I don't eat<span class="more" data-act="edit">${editDislikes ? 'Done' : 'Edit'}</span></div>
    <div class="card tight">
      ${editDislikes ? html`<div class="sub" style="margin-bottom:8px">Categories:</div>
        <div class="chips">${Object.entries(DISLIKE_TAGS).map(([k, v]) => `<button class="chip no ${p.dislikes.includes(k) ? 'on' : ''}" data-dis="${k}">${v}</button>`)}</div>
        <div class="sub" style="margin:14px 0 8px">Specific foods:</div>
        <input class="input" data-dq placeholder="Search for a food…" value="${esc(dislikeQuery)}" style="height:44px;margin-bottom:10px">
        <div class="chips" id="dislikeChips">${dislikeChips(p)}</div>`
      : html`<div class="chips">${[...p.dislikes.map((k) => DISLIKE_TAGS[k]), ...(p.dislikedFoods || []).map((id) => FOOD[id]?.name)].filter(Boolean).map((x) => `<span class="chip no on">${esc(x)}</span>`).join('') || '<span class="sub">I eat everything</span>'}</div>`}
    </div>

    <div class="h2">Info</div>
    ${plan.noVeg ? html`<details class="card acc"><summary>No vegetables — how to make up for it</summary><div class="acc-body">${NO_VEG_TIPS.map(tip)}</div></details>` : ''}
    <details class="card acc"><summary>${inService(p) ? 'Tips for service' : 'Tips'}</summary><div class="acc-body">${(inService(p) ? SERVICE_TIPS : ARMY_TIPS).map(tip)}</div></details>
    <details class="card acc method"><summary>How it's calculated</summary><div class="acc-body">
      ${p.track === 'cali' ? `<div class="m-row"><b>Calisthenics</b><span>${p.goal === 'muscle' ? 'The calorie surplus is kept small on purpose: every extra kilo is a kilo you have to lift in pull-ups and dips.' : p.goal === 'cut' ? 'A slow cut preserves strength. Every kilo of fat lost directly makes pull-ups, levers and handstands easier.' : 'Calorie balance with high protein: you build strength without gaining weight, because strength here is measured relative to body weight.'}</span></div>` : ''}
      <div class="m-row"><b>By day</b><span>Carbs follow that day's training load (Burke 2011; ACSM / AND / DC 2016): +15% calories on a long run day, +5% on a hard workout day, no change on an easy day, and −5% on a rest day. Protein is fixed. The size of the shift is the app's choice, not a research finding.</span></div>
      <div class="m-row"><b>Calories</b><span>BMR by Mifflin-St Jeor (<span class="num">${t.bmr}</span>) × activity factor ${t.activity.factor} = <span class="num">${t.tdee}</span>${t.delta ? ` ${t.delta > 0 ? '+' : '−'} <span class="num">${Math.abs(t.delta)}</span> (${p.goal === 'cut' ? 'a loss of ~0.5% of body weight per week' : 'a surplus of ~10% — a gain of 0.25–0.5% per week'})` : ' (maintenance)'}${t.adjust ? ` ${t.adjust > 0 ? '+' : '−'} <span class="num">${Math.abs(t.adjust)}</span> (calibrated to your weight trend)` : ''}${t.minKcal && t.kcal === t.minKcal ? `  · never below <span class="num">${t.minKcal}</span>  kcal a day, the accepted minimum without professional supervision` : ''}</span></div>
      <div class="m-row"><b>Protein</b><span>${t.perKg} g per kg${t.refW < Math.round(p.weightKg) ? ` (based on a reference weight of ${t.refW} kg)` : ''} — ISSN: 1.4–2.0 for people who train, more in a deficit; 20–40 g per meal</span></div>
      <div class="m-row"><b>Fat</b><span>25% of calories (recommended range 20–35%), no less than 0.5 g per kg</span></div>
      <div class="m-row"><b>Carbs</b><span>The rest of the calories — <span class="num">${(t.carbs / (p.weightKg || 70)).toFixed(1)}</span> g per kg (ACSM: 5–7 for moderate training, 3–5 for light)</span></div>
      <div class="m-row"><b>Fiber</b><span>14 g per 1,000 kcal (IOM)</span></div>
      <div class="m-row"><b>Fluids</b><span>${p.sex === 'f' ? '1.6' : '2.0'} L from drinks (EFSA) + 0.5 L per hour of training (ACSM); more in heat and prolonged effort</span></div>
      <div class="m-row"><b>Calibration</b><span>After two weeks of weigh-ins, the target is compared with your actual rate of change and a 150 kcal adjustment is suggested</span></div>
      <div class="m-row"><b>Food values</b><span>The Israeli Ministry of Health's national nutrition database — ${FOODS.length} foods, serving weights from the database's weights table</span></div>
      ${t.adjust ? '<button class="btn sm block mt-3" data-adjust="reset">Reset personal calibration</button>' : ''}
      <details style="margin-top:8px"><summary class="sub" style="cursor:pointer;min-height:44px;display:flex;align-items:center">Sources (${NUTRITION_REFS.length})</summary>
        <ol class="refs">${NUTRITION_REFS.map((r) => `<li><a href="${r.u}" target="_blank" rel="noopener">${esc(r.t)}</a></li>`).join('')}</ol></details>
    </div></details>
    <p class="sub t-cap mt-3">These recommendations are general and are not a substitute for advice from a dietitian or doctor.</p>
    <button class="btn sm block mt-3" data-act="nut-off">Turn off nutrition coaching</button>`;

  root.innerHTML = html`<div class="page-head"><div class="h1">Nutrition</div></div>
    <div class="seg tabs" data-tabs>${TABS.map(([k, v]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${v}</button>`).join('')}</div>
    ${tab === 'prefs' ? '' : guardCard(t)}
    ${tab === 'menu' ? menuTab() : tab === 'prefs' ? prefsTab() : todayTab()}`;

  const rerender = () => renderNutrition(root);
  on(root, 'click', '[data-daytype] button', (e, b) => { setDaily({ dayType: b.dataset.v === 'rest' ? 'rest' : null }); renderNutrition(root); });
  on(root, 'click', '[data-repeat]', (e, b) => {
    const slot = b.dataset.repeat;
    const items = yFoods.filter((it) => (it.slot || 'snack') === slot).map((it) => ({ id: it.id, qty: it.qty, slot, at: Date.now() }));
    setDaily({ foods: [...(daily().foods || []), ...items] });
    toast(`${items.length} items logged`, 1400); rerender();
  });
  on(root, 'click', '[data-tab]', (e, b) => { tab = b.dataset.tab; rerender(); });
  on(root, 'click', '[data-adjust]', (e, b) => {
    const v = b.dataset.adjust;
    set((s2) => { s2.profile.kcalAdjust = v === 'reset' ? 0 : (s2.profile.kcalAdjust || 0) + Number(v); return s2; });
    toast(v === 'reset' ? 'Calibration reset' : 'Calorie target updated'); rerender();
  });
  on(root, 'click', '[data-activity] button', (e, b) => { set((s2) => { s2.profile.activityLevel = b.dataset.v; return s2; }); rerender(); });
  on(root, 'click', '[data-ctx]', (e, b) => { ctx = b.dataset.ctx; rerender(); });
  // החלפת פריט בודד בתפריט
  on(root, 'click', '[data-swap]', (e, b) => {
    const [mi, id] = b.dataset.swap.split('|'), meal = plan.meals[Number(mi)], it = meal.items.find((x) => x.id === id);
    const key = `${meal.id}|${it.from || it.id}`, opts = swapOptions(p, plan, Number(mi), id, { ctx });
    sheet(html`<div class="eyebrow">${esc(meal.name)}</div><div class="h1" style="font-size:22px">Instead of ${esc(FOOD[id].name)}</div>
      ${opts.length ? opts.map((f) => `<button class="swap-opt" data-to="${f.id}"><span><b>${esc(f.name)}</b><small>${esc(f.portion)}</small></span><span class="num"><b>${Math.round(f.kcal)}</b><small>${Math.round(f.p)} g protein</small></span></button>`).join('') : '<p class="sub" style="margin-top:10px">There is no suitable alternative for this meal right now with your preferences.</p>'}
      ${it.from ? `<button class="btn block" style="margin-top:12px" data-to="">Bring back ${esc(FOOD[it.from].name)}</button>` : ''}
      <button class="btn ghost block" style="margin-top:8px" data-close>Cancel</button>`, {
      onMount(sh, close) {
        on(sh, 'click', '[data-to]', (ev, o) => {
          const swaps = { ...ms.swaps }; if (o.dataset.to) swaps[key] = o.dataset.to; else delete swaps[key];
          setDaily({ menu: { seed, ctx, swaps, dishes: ms.dishes } }); close(); rerender();
        });
      },
    });
  });
  // החלפת המנה כולה
  on(root, 'click', '[data-dish]', (e, b) => {
    const mi = Number(b.dataset.dish), meal = plan.meals[mi], opts = dishOptions(p, plan, mi, { ctx });
    sheet(html`<div class="eyebrow">${esc(meal.name)}</div><div class="h1" style="font-size:22px">Different dish</div>
      ${opts.length ? opts.map((d) => `<button class="swap-opt" data-to="${d.id}"><span><b>${esc(d.name)}</b><small>${d.items.map(([id]) => esc(FOOD[id].name)).join(' · ')}</small></span></button>`).join('') : '<p class="sub" style="margin-top:10px">There is no other dish right now that fits this meal with your preferences and in this place.</p>'}
      <button class="btn ghost block" style="margin-top:12px" data-close>Cancel</button>`, {
      onMount(sh, close) {
        on(sh, 'click', '[data-to]', (ev, o) => {
          // מנה חדשה: ההחלפות הקודמות של הארוחה הזאת כבר לא רלוונטיות
          const swaps = Object.fromEntries(Object.entries(ms.swaps).filter(([k]) => !k.startsWith(meal.id + '|')));
          setDaily({ menu: { seed, ctx, swaps, dishes: { ...ms.dishes, [meal.id]: o.dataset.to } } }); close(); rerender();
        });
      },
    });
  });
  bindNutPrefs(root, on, (mutate) => { const was = inService(get().profile); set((s2) => { mutate(s2.profile); return s2; }); if (inService(get().profile) !== was) ctx = null; rerender(); });
  on(root, 'click', '[data-act="nut-off"]', () => { set((s2) => { s2.profile.nutrition = false; return s2; }); tab = 'today'; toast('Nutrition coaching is off. You can turn it back on from here.'); rerender(); });
  // "תפריט אחר" נשמר ברשומה של היום (daily.shuffle), כדי שהתפריט שנבחר — וההחלפות שנעשו עליו — יישארו גם אחרי רענון (25.11.2026)
  on(root, 'click', '[data-act="shuffle"]', () => { setDaily({ shuffle: (daily().shuffle || 0) + 1 }); rerender(); });
  on(root, 'click', '[data-act="edit"]', () => { editDislikes = !editDislikes; rerender(); });
  on(root, 'click', '[data-act="add-food"]', () => foodSearchSheet(rerender));
  on(root, 'click', '[data-act="clear-log"]', () => { setDaily({ foods: [] }); rerender(); });
  on(root, 'click', '[data-log]', (e, b) => logItemSheet(Number(b.dataset.log), rerender));
  on(root, 'click', '[data-eat-meal]', (e, b) => {
    const m = plan.meals[Number(b.dataset.eatMeal)];
    const slot = m.id === 'breakfast' ? 'breakfast' : m.id === 'lunch' ? 'lunch' : m.id === 'dinner' ? 'dinner' : 'snack';
    const foods = [...(daily().foods || []), ...m.items.map((it) => ({ id: it.id, qty: it.qty, slot, at: Date.now() }))];
    setDaily({ foods });
    toast(`✓ ${m.name} logged`, 1500);
    rerender();
  });
  on(root, 'click', '[data-dis]', (e, b) => { set((s2) => { toggle(s2.profile.dislikes, b.dataset.dis); return s2; }); rerender(); });
  on(root, 'click', '[data-food]', (e, b) => { set((s2) => { s2.profile.dislikedFoods ||= []; toggle(s2.profile.dislikedFoods, b.dataset.food); return s2; }); b.classList.toggle('on'); });
  root.querySelector('[data-dq]')?.addEventListener('input', (e) => { dislikeQuery = e.target.value; root.querySelector('#dislikeChips').innerHTML = dislikeChips(get().profile); });
  on(root, 'click', '[data-add]', (e, b) => {
    const d2 = daily();
    setDaily({ water: d2.water + 250 });
    rerender();
  });
}

function dislikeChips(p) {
  const list = dislikeQuery ? searchFoods(dislikeQuery, [], { limit: 60 }) : FOODS.filter((f) => f.cat !== 'meal').slice(0, 40);
  return list.map((f) => `<button class="chip no ${(p.dislikedFoods || []).includes(f.id) ? 'on' : ''}" data-food="${f.id}">${esc(f.name)}</button>`).join('')
    + (dislikeQuery ? '' : '<span class="sub" style="font-size:12px;align-self:center">…search to see more</span>');
}

// ───── מועדפים ואחרונים ─────
const favFoods = () => get().profile.favFoods || [];
const favLabel = (id) => (favFoods().includes(id) ? `${icon('star')} In favorites — remove` : `${icon('star')} Add to favorites`);
// מה שנרשם ב-14 הימים האחרונים, מהחדש לישן, בלי כפילויות
function recentFoods() {
  const days = Object.keys(get().daily).sort().slice(-14).reverse();
  const seen = new Set();
  for (const d of days) for (const it of [...(get().daily[d].foods || [])].reverse()) seen.add(it.id);
  return [...seen];
}

// ───── חיפוש והוספת מזון ─────
export function foodSearchSheet(onDone) {
  let q = '', cat = '', slot = currentSlot();
  const custom = () => get().profile.customFoods || [];
  sheet(html`<div class="eyebrow">Food log</div><div class="h1" style="font-size:22px">What ${g('did you eat', 'did you eat')}?</div>
    <div class="seg" data-slot style="margin:10px 0">${MEAL_SLOTS.map(([k, v]) => `<button data-sl="${k}" class="${slot === k ? 'on' : ''}">${v}</button>`).join('')}</div>
    <input class="input" data-q placeholder="Search: schnitzel, cottage cheese, Bamba…" autocomplete="off">
    <div class="chips scroll" style="margin-block:10px">${CATS.map(([k, v]) => `<button class="chip ${k === cat ? 'on' : ''}" data-cat="${k}">${v}</button>`).join('')}</div>
    <div id="fres" class="food-res"></div>
    <div class="grid2" style="margin-top:12px"><button class="btn sm" data-scan>${icon('scan')} Scan barcode</button><button class="btn sm" data-custom>＋ New food</button></div>`, {
    onMount(sh, close) {
      const row = (f, mark = '') => html`<button class="food-row" data-pick="${f.id}">
          <span><b>${mark}${esc(f.name)}</b><small>${esc(f.portion)}${f.custom ? ' · mine' : ''}</small>${algMark(f, get().profile)}</span>
          <span class="num"><b>${Math.round(f.kcal)}</b><small>${Math.round(f.p)} g protein</small></span></button>`;
      const paint = () => {
        let out = '';
        if (!q && !cat) {
          // בלי חיפוש: קודם מועדפים, אחר כך מה שנאכל לאחרונה — רישום חוזר בשתי הקשות
          const favs = favFoods().map((id) => foodLookup(id, custom())).filter(Boolean);
          const rec = recentFoods().filter((id) => !favFoods().includes(id)).map((id) => foodLookup(id, custom())).filter(Boolean).slice(0, 8);
          if (favs.length) out += `<div class="food-sec">${icon('star')} Favorites</div>` + favs.map((f) => row(f)).join('');
          if (rec.length) out += `<div class="food-sec">${icon('clock')} Recent</div>` + rec.map((f) => row(f)).join('');
          if (out) out += '<div class="food-sec">All foods</div>';
        }
        const res = searchFoods(q, custom(), { cat: cat || null, limit: 50 });
        out += res.map((f) => row(f)).join('');
        sh.querySelector('#fres').innerHTML = out || '<div class="empty" style="padding:14px">Not found. You can add it below with "New food".</div>';
      };
      const inp = sh.querySelector('[data-q]');
      inp.addEventListener('input', () => { q = inp.value; paint(); });
      on(sh, 'click', '[data-cat]', (e, b) => { cat = b.dataset.cat; sh.querySelectorAll('[data-cat]').forEach((x) => x.classList.toggle('on', x === b)); paint(); });
      on(sh, 'click', '[data-sl]', (e, b) => { slot = b.dataset.sl; sh.querySelectorAll('[data-sl]').forEach((x) => x.classList.toggle('on', x === b)); });
      on(sh, 'click', '[data-pick]', (e, b) => { const f = foodLookup(b.dataset.pick, custom()); close(); qtySheet(f, slot, onDone); });
      sh.querySelector('[data-custom]').addEventListener('click', () => { close(); customFoodSheet(slot, onDone, q); });
      sh.querySelector('[data-scan]').addEventListener('click', () => { close(); scanSheet(slot, onDone); });
      paint();
    },
  });
}

function qtySheet(f, slot, onDone) {
  let qty = 1;
  const line = () => `<b class="num">${Math.round(f.kcal * qty)}</b> kcal · <b class="num">${Math.round(f.p * qty)}</b>g protein · <b class="num">${Math.round(f.c * qty)}</b>g carbs · <b class="num">${Math.round(f.f * qty)}</b>g fat`;
  sheet(html`<div class="h1" style="font-size:22px">${esc(f.name)}</div><div class="sub">Serving: ${esc(f.portion)}</div>
    ${allergyHits(f, get().profile).length ? `<div class="card tight guard-note" style="margin-top:8px">${icon('warn', 'width="18" height="18"')}<div><p>According to the database, this food contains: <b>${allergyHits(f, get().profile).join(', ')}</b> — you marked an allergy or sensitivity. Always check the label.</p></div></div>` : ''}
    ${f.src ? `<div class="src-line">Source: Israeli Ministry of Health database — ${f.src.map((x) => `${esc(x.name)} (${x.g} g)`).join(' + ')}</div>` : f.custom ? '<div class="src-line">Personal food (values you entered)</div>' : ''}
    <div class="sub" style="margin:14px 0 6px">Amount</div>
    <div class="seg" data-qty>${QTYS.map((v) => `<button data-qv="${v}" class="${v === qty ? 'on' : ''}">${v === 0.5 ? '½' : v === 1.5 ? '1½' : v}</button>`).join('')}</div>
    <div class="card tight" style="margin-top:12px" id="qline">${line()}</div>
    <button class="btn primary block xl" style="margin-top:14px" data-ok>Add to log</button>
    <button class="btn ghost block" style="margin-top:6px" data-fav>${favLabel(f.id)}</button>`, {
    onMount(sh, close) {
      sh.querySelector('[data-fav]').addEventListener('click', (e) => {
        set((s2) => { const a = (s2.profile.favFoods ||= []); const i = a.indexOf(f.id); i >= 0 ? a.splice(i, 1) : a.unshift(f.id); return s2; });
        e.currentTarget.innerHTML = favLabel(f.id);
      });
      on(sh, 'click', '[data-qv]', (e, b) => { qty = Number(b.dataset.qv); sh.querySelectorAll('[data-qv]').forEach((x) => x.classList.toggle('on', x === b)); sh.querySelector('#qline').innerHTML = line(); });
      sh.querySelector('[data-ok]').addEventListener('click', () => {
        setDaily({ foods: [...(daily().foods || []), { id: f.id, qty, slot, at: Date.now() }] });
        toast(`✓ ${f.name} logged`, 1300);
        close(); onDone?.();
      });
    },
  });
}

function logItemSheet(i, onDone) {
  const dd = daily();
  const it = dd.foods[i];
  const f = foodLookup(it.id, get().profile.customFoods || []);
  sheet(html`<div class="h1" style="font-size:22px">${esc(f.name)}</div><div class="sub">${qtyLabel(it.qty)}${esc(f.portion)} · ${Math.round(f.kcal * it.qty)} kcal</div>
    <div class="sub" style="margin:14px 0 6px">Change amount</div>
    <div class="seg">${QTYS.map((v) => `<button data-qv="${v}" class="${v === it.qty ? 'on' : ''}">${v === 0.5 ? '½' : v === 1.5 ? '1½' : v}</button>`).join('')}</div>
    <button class="btn danger block" style="margin-top:14px" data-del>Remove from log</button>
    <button class="btn ghost block" style="margin-top:8px" data-close>Close</button>`, {
    onMount(sh, close) {
      on(sh, 'click', '[data-qv]', (e, b) => { const foods = [...daily().foods]; foods[i] = { ...foods[i], qty: Number(b.dataset.qv) }; setDaily({ foods }); close(); onDone?.(); });
      sh.querySelector('[data-del]').addEventListener('click', () => { const foods = daily().foods.filter((_, j) => j !== i); setDaily({ foods }); close(); onDone?.(); });
    },
  });
}

// ───── סריקת ברקוד ─────
function scanSheet(slot, onDone) {
  let stopCam = null, busy = false;
  const closeSheet = sheet(html`<div class="eyebrow">Packaged product</div><div class="h1" style="font-size:22px">Scan barcode</div>
    <div class="scan-box"><video muted playsinline></video><i class="scan-line"></i><div class="scan-msg" data-msg>Starting camera…</div></div>
    <p class="sub t-foot" style="margin:10px 0">Point the barcode at the line. You can also type the number below it.</p>
    <div class="row"><input class="input num" data-code inputmode="numeric" placeholder="7290000000000" maxlength="14" style="flex:1;min-width:0"><button class="btn" data-find>Search</button></div>
    <p class="sub t-cap" style="margin-top:10px">The values come from the open database Open Food Facts; only the barcode number is sent to it. Compare with the label before saving.</p>`, {
    onClose() { stopCam?.(); },
    onMount(sh) {
      const msg = (x) => { const m = sh.querySelector('[data-msg]'); if (m) m.textContent = x; };
      const found = async (code) => {
        if (busy) return;
        busy = true;
        // מוצר שכבר נסרק ונשמר — ישר לבחירת כמות
        const known = (get().profile.customFoods || []).find((f) => f.barcode === code);
        if (known) { closeSheet(); qtySheet(known, slot, onDone); return; }
        msg(`Found barcode ${code} — searching…`);
        try {
          const r = await lookupBarcode(code);
          closeSheet();
          if (!r.found) { toast('Product not found in the database — you can enter it from the label'); customFoodSheet(slot, onDone, { barcode: code }); return; }
          if (!r.complete) toast('Product found, but without full values — complete them from the label');
          customFoodSheet(slot, onDone, r);
        } catch {
          busy = false;
          msg(navigator.onLine ? 'Search failed — try again' : 'No network connection — search needs internet');
        }
      };
      sh.querySelector('[data-find]').addEventListener('click', () => {
        const code = sh.querySelector('[data-code]').value.replace(/\D/g, '');
        if (code.length < 8) { toast('Barcode number is too short'); return; }
        found(code.length === 12 ? `0${code}` : code);
      });
      if (!navigator.mediaDevices?.getUserMedia) { msg('No camera access in this browser — you can type the number'); return; }
      startScanner(sh.querySelector('video'), (code) => { vibrate(40); found(code); })
        .then((stop) => { stopCam = stop; if (!document.body.contains(sh)) stop(); else msg(''); })
        .catch(() => msg('No camera permission — you can type the number'));
    },
  });
}

// prefill: מחרוזת (שם) או אובייקט ממאגר הברקודים { name, portion, kcal, p, c, f, fib, barcode }
// מנה ממרכיבים (בקשת בעל המוצר, 23.11.2026): מחפשים מרכיבים מהמאגר, קובעים כמות לכל אחד, והקלוריות והערכים מחושבים לבד (partsTotals).
// בלי מרכיבים — מקלידים ערכים מהתווית, כמו קודם.
function customFoodSheet(slot, onDone, prefill = '') {
  const pre = typeof prefill === 'string' ? { name: prefill } : prefill || {};
  const val = (v) => (v == null ? '' : esc(v));
  const custom = () => get().profile.customFoods || [];
  let parts = [], pq = '';
  sheet(html`<div class="eyebrow">${pre.barcode ? `Barcode ${esc(pre.barcode)}` : 'Personal food'}</div><div class="h1" style="font-size:22px">${pre.found ? 'Check and save' : 'Add a new food'}</div>
    <p class="sub">${pre.found ? 'The values came from an open database filled in by users — compare with the label.' : 'It\'s saved for you and shows up in search next time. Add the ingredients and the calories are worked out for you, or copy the values from the label on the pack.'}</p>
    <label class="field"><span>Name</span><input class="input" name="name" value="${val(pre.name)}"></label>
    ${pre.found ? '' : `<div class="h2" style="margin-top:12px">What's in it?</div>
    <div data-parts></div>
    <input class="input" data-pq placeholder="Search an ingredient: rice, chicken, olive oil…" autocomplete="off" style="height:44px">
    <div class="food-res part-res" data-pres hidden></div>`}
    <div class="sub t-foot" data-pnote style="margin:10px 0 6px">${pre.found ? '' : 'With no ingredients, you can type the values per serving:'}</div>
    <label class="field"><span>Serving (e.g. 1 unit, 100 g)</span><input class="input" name="portion" value="${val(pre.portion || 'serving')}"></label>
    <div class="grid2">
      <label class="field"><span>Calories</span><input class="input num" name="kcal" type="number" inputmode="numeric" value="${val(pre.kcal)}"></label>
      <label class="field"><span>Protein (g)</span><input class="input num" name="p" type="number" inputmode="decimal" value="${val(pre.p)}"></label>
      <label class="field"><span>Carbs (g)</span><input class="input num" name="c" type="number" inputmode="decimal" value="${val(pre.c)}"></label>
      <label class="field"><span>Fat (g)</span><input class="input num" name="f" type="number" inputmode="decimal" value="${val(pre.f)}"></label>
    </div>
    <button class="btn primary block xl" data-save>Save and add to log</button>`, {
    onMount(sh, close) {
      const inp = (n) => sh.querySelector(`[name=${n}]`);
      // המרכיבים שנבחרו, וערכי המנה שמחושבים מהם (השדות ננעלים כל עוד יש מרכיבים)
      const paintParts = () => {
        const box = sh.querySelector('[data-parts]'); if (!box) return;
        box.innerHTML = parts.map((it, i) => { const x = foodLookup(it.id, custom()); return `<div class="part-row"><span><b>${esc(x.name)}</b><small>${qtyLabel(it.qty)}${esc(x.portion)} · ${Math.round(x.kcal * it.qty)} kcal</small></span>
          <button type="button" data-pm="${i}" aria-label="Less">−</button><b class="num">${it.qty}</b><button type="button" data-pp="${i}" aria-label="More">+</button></div>`; }).join('');
        const has = parts.length > 0, tot = partsTotals(parts, custom());
        for (const k of ['kcal', 'p', 'c', 'f']) { const el = inp(k); if (has) el.value = tot[k]; el.readOnly = has; el.classList.toggle('auto', has); }
        sh.querySelector('[data-pnote]').textContent = has ? `Worked out from the ingredients: ${tot.kcal} kcal · ${tot.p} g protein per serving` : 'With no ingredients, you can type the values per serving:';
      };
      const paintRes = () => {
        const box = sh.querySelector('[data-pres]'); if (!box) return;
        const res = pq.trim().length < 2 ? [] : searchFoods(pq, custom(), { limit: 6 });
        box.hidden = !res.length;
        box.innerHTML = res.map((x) => `<button type="button" class="food-row" data-padd="${x.id}"><span><b>${esc(x.name)}</b><small>${esc(x.portion)}</small></span><span class="num"><b>${Math.round(x.kcal)}</b><small>kcal</small></span></button>`).join('');
      };
      sh.querySelector('[data-pq]')?.addEventListener('input', (e) => { pq = e.target.value; paintRes(); });
      on(sh, 'click', '[data-padd]', (e, b) => {
        const had = parts.find((x) => x.id === b.dataset.padd);
        if (had) had.qty += 1; else parts.push({ id: b.dataset.padd, qty: 1 });
        pq = ''; sh.querySelector('[data-pq]').value = ''; paintRes(); paintParts();
      });
      on(sh, 'click', '[data-pp]', (e, b) => { parts[Number(b.dataset.pp)].qty += 0.5; paintParts(); });
      on(sh, 'click', '[data-pm]', (e, b) => { const i = Number(b.dataset.pm); parts[i].qty -= 0.5; if (parts[i].qty <= 0) parts.splice(i, 1); paintParts(); });
      sh.querySelector('[data-save]').addEventListener('click', () => {
        const v = (n) => inp(n).value.trim();
        const name = v('name'), tot = parts.length ? partsTotals(parts, custom()) : null, kcal = tot ? tot.kcal : Number(v('kcal'));
        if (!name) { toast('Give it a name'); return; }
        if (!(kcal > 0)) { toast('Add at least one ingredient, or type the calories'); return; }
        const food = { id: `c_${Date.now()}`, name, portion: v('portion') || 'serving', kcal, p: tot ? tot.p : Number(v('p')) || 0, c: tot ? tot.c : Number(v('c')) || 0, f: tot ? tot.f : Number(v('f')) || 0, fib: tot ? tot.fib : Number(pre.fib) || 0,
          cat: 'custom', tags: [], ctx: ['base', 'home', 'field'], custom: true, ...(pre.barcode ? { barcode: pre.barcode } : {}), ...(tot ? { parts: parts.map((x) => ({ id: x.id, qty: x.qty })) } : {}) };
        set((s2) => { (s2.profile.customFoods ||= []).push(food); return s2; });
        setDaily({ foods: [...(daily().foods || []), { id: food.id, qty: 1, slot, at: Date.now() }] });
        toast(`✓ ${name} saved and logged`);
        close(); onDone?.();
      });
    },
  });
}

const tip = (x) => `<div class="tip"><div class="ti">${em(x.icon, 'acc')}</div><div><b>${esc(x.title)}</b><span>${esc(x.text)}</span>${x.ref ? `<small class="ref">Source: ${esc(x.ref)}</small>` : ''}</div></div>`;
function toggle(arr, v) { const i = arr.indexOf(v); i >= 0 ? arr.splice(i, 1) : arr.push(v); }
