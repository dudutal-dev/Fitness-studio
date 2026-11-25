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
  { icon: '🍽️', title: 'בחדר האוכל', text: 'קודם ממלאים חצי צלחת בחלבון ובירקות — עוף, בשר, ביצים, קטניות וסלט — ורק אז מוסיפים אורז, פתיתים או לחם. מנה שנייה של חלבון עדיפה על מנה שנייה של פחמימה.' },
  { icon: '🎒', title: 'בשטח', text: 'בימי שטח ההוצאה האנרגטית גבוהה מאוד — לבחור "שטח" ברמת הפעילות (תזונה ← העדפות) כדי שהיעד יעלה. טונה, בשר משומר, חלבה, תמרים ואגוזים נותנים הרבה אנרגיה בנפח קטן.' },
  { icon: '🛒', title: 'מהשק״ם', text: 'כשהארוחה דלה בחלבון: יוגורט חלבון, גבינה, טונה או חטיף חלבון משלימים אותה. שוקו אחרי אימון הוא התאוששות טובה וזמינה.' },
  ...ARMY_TIPS.filter((t) => t.title !== 'ימים עמוסים'),
];
import { dayKey } from '../engine/stats.js';
import { lookupBarcode, startScanner } from '../barcode.js';

let tab = 'today';
export const openNutritionTab = (t) => { tab = t; };   // מהבית: הכרטיס "התזונה של היום" פותח ישר את התפריט
let ctx = null;   // נקבע בכניסה לפי ההעדפה: בבית, או חדר האוכל למי שבשירות
let editDislikes = false;
let dislikeQuery = '';

const CATS = [['', 'הכל'], ['meal', 'מנות'], ['protein', 'חלבון'], ['dairy', 'חלב'], ['carb', 'פחמימה'], ['fruit', 'פירות'], ['veg', 'ירקות'], ['fat', 'שומנים'], ['sauce', 'רטבים'], ['snack', 'חטיפים ומשקאות'], ['custom', 'שלי']];
const QTYS = [0.5, 1, 1.5, 2, 3];
const MEAL_SLOTS = [['breakfast', 'בוקר'], ['lunch', 'צהריים'], ['dinner', 'ערב'], ['snack', 'ביניים']];

function currentSlot() {
  const h = new Date().getHours();
  return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 21 ? 'dinner' : 'snack';
}

// הערות בטיחות: למי שאין לו יעד גירעון (ראו nutritionGuard במנוע) — מה השתנה, ולמי לפנות
const GUARD_NOTES = {
  preg: 'בהיריון לא יורדים במשקל, ולכן היעד כאן הוא תחזוקה. הצרכים עולים בהמשך ההיריון — כ-340 קק״ל ביום בשליש השני וכ-450 בשלישי. את התזונה כדאי לבנות עם הצוות המטפל או עם דיאטנית קלינית.',
  nurse: 'בהנקה הגוף צריך יותר אנרגיה (כ-330 עד 400 קק״ל ביום), ולכן היעד כאן אינו גירעון. לליווי אישי — דיאטנית קלינית.',
  med: 'במצב רפואי שמושפע מתזונה ההמלצות כאן כלליות בלבד: היעד הוא תחזוקה והחלבון מתון. את התזונה כדאי לבנות עם הרופא המטפל או עם דיאטנית קלינית.',
  minor: 'מתחת לגיל 18 לא בונים תפריט ירידה במשקל, כי הגוף עדיין גדל. היעד הוא אכילה מסודרת ומספקת. בשאלות על משקל — רופא ילדים או דיאטנית.',
  under: 'לפי הגובה והמשקל, המשקל נמוך מהטווח התקין (BMI מתחת ל-18.5), ולכן היעד אינו גירעון. כדאי להתייעץ עם רופא או עם דיאטנית.',
};
const guardCard = (t) => (t.guard?.noDeficit ? `<div class="card tight guard-note">${icon('shield', 'width="18" height="18"')}<div>${t.guard.reasons.map((k) => `<p>${GUARD_NOTES[k]}</p>`).join('')}</div></div>` : '');
const algMark = (f, p) => { const h = allergyHits(f, p); return h.length ? `<small class="alg-warn">${icon('warn', 'width="13" height="13"')} ${h.join(', ')}</small>` : ''; };

export function renderNutrition(root) {
  const s = get();
  const p = s.profile;
  // ליווי התזונה כבוי (בחירת המתאמן בהיכרות): מסך אחד קצר, עם אפשרות להפעיל
  // מסלול המדיטציה בתנועה: אין תפריט (החלטת בעל המוצר, 25.11.2026) — מסך קצר בלי כפתור הפעלה
  if (p.track === 'med') {
    root.innerHTML = html`<div class="page-head"><div class="h1">תזונה</div></div>
      <div class="card nut-off"><div class="nc-ico">${icon('leaf')}</div><b style="font-size:19px">במסלול הזה אין תפריט</b>
        <p class="sub" style="margin:8px 0 4px">מדיטציה בתנועה היא הליכה ושקט, בלי יעדי קלוריות ובלי יומן אכילה. מי שרוצה ליווי תזונה בוחר מסלול ראשי אחר ב"המסלול שלי", והתפריט חוזר כמו שהיה.</p></div>`;
    return;
  }
  if (!wantsNutrition(p)) {
    root.innerHTML = html`<div class="page-head"><div class="h1">תזונה</div></div>
      <div class="card nut-off"><div class="nc-ico">${icon('food')}</div><b style="font-size:19px">ליווי התזונה כבוי</b>
        <p class="sub" style="margin:8px 0 16px">בחרת להתמקד באימונים. אם רוצים, אפשר להפעיל תפריט יומי מותאם, יעדי קלוריות וחלבון ויומן אכילה — עם כמה שאלות קצרות.</p>
        <button class="btn primary block" data-act="nut-on">להפעיל ליווי תזונה</button></div>`;
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
  const nf = (n) => n.toLocaleString('he-IL');
  // ארוחות שנרשמו אתמול ועדיין לא נרשמו היום — אפשר להעתיק בהקשה אחת
  const yFoods = (s.daily[dayKey(new Date(Date.now() - 864e5))]?.foods || []).filter((it) => foodLookup(it.id, custom));
  const repeatable = MEAL_SLOTS.map(([slot, label]) => [slot, label, yFoods.filter((it) => (it.slot || 'snack') === slot).length])
    .filter(([slot, , n]) => n && !log.some((x) => (x.slot || 'snack') === slot));
  const macro = (name, val, of, unit, color) => `<div class="macro"><div class="row between"><span>${name}</span><b><bdi>${val}</bdi><small> / <bdi>${of} ${unit}</bdi></small></b></div>
    <div class="bar"><i style="width:${Math.min(100, Math.round((val / Math.max(1, of)) * 100))}%;background:${color}"></i></div></div>`;
  // לפי היעד שחושב בפועל, לא לפי המטרה שנבחרה (25.11.2026): במצב רגיש (nutritionGuard) המטרה "חיטוב" מקבלת יעד תחזוקה, והשורה אמרה "גירעון"
  const goalTag = t.delta < 0 ? 'גירעון' : t.delta > 0 ? 'עודף' : 'תחזוקה';
  const TABS = [['today', 'היום'], ['menu', 'תפריט'], ['prefs', 'העדפות']];

  const todayTab = () => html`
    <div class="card tight day-fuel">
      <div class="row between"><div class="grow"><div class="eyebrow">התזונה של היום</div><b>${DAY_TYPES[dt.type].name}</b>${dt.name ? `<span class="sub"> · ${esc(dt.name)}</span>` : ''}</div>
        ${dt.done ? '<span class="tag lime">בוצע</span>' : dt.planned || dt.manual ? `<div class="seg" data-daytype><button data-v="train" class="${dt.manual ? '' : 'on'}">אימון</button><button data-v="rest" class="${dt.manual ? 'on' : ''}">מנוחה</button></div>` : ''}</div>
      <div class="sub t-foot" style="margin-top:6px">${t.dayDelta ? `היעד היום: <b class="num">${nf(t.kcal)}</b> קק״ל — <span class="num">${nf(Math.abs(t.dayDelta))}</span> ${t.dayDelta > 0 ? 'מעל' : 'מתחת'} ליום רגיל, והשינוי כולו בפחמימה (<span class="num">${t.carbs}</span> ג׳ במקום <span class="num">${t.baseCarbs}</span>). החלבון לא משתנה.` : 'היעד היום הוא היעד הרגיל שלך.'}</div>
      ${fuel.rest ? `<div class="fuel"><div><b>היום</b><span>${fuel.rest}</span></div></div>`
    : `<div class="fuel"><div><b>לפני</b><span>${fuel.before}</span></div><div><b>במהלך</b><span>${fuel.during}</span></div><div><b>אחרי</b><span>${fuel.after}</span></div></div>`}
    </div>

    <div class="card">
      <div class="nut-top">
        ${ring(eaten.kcal / t.kcal, { size: 124, stroke: 11, color: left < 0 ? 'var(--acc)' : 'var(--pri)', big: nf(Math.abs(left)), lbl: left >= 0 ? 'קק״ל נשארו' : 'קק״ל מעל היעד' })}
        <div class="nut-macros">
          ${macro('חלבון', eaten.p, t.protein, 'ג׳', 'var(--pri)')}
          ${macro('פחמימה', eaten.c, t.carbs, 'ג׳', 'var(--acc)')}
          ${macro('שומן', eaten.f, t.fat, 'ג׳', 'var(--orange)')}
        </div>
      </div>
      <div class="sub t-foot center-t mt-3">נאכלו <b class="num">${nf(eaten.kcal)}</b> מתוך <b class="num">${nf(t.kcal)}</b> קק״ל · ${goalTag} · סיבים <span class="num">${eaten.fib}</span>/<span class="num">${t.fiber}</span> ג׳</div>
      <button class="btn primary block mt-4" data-act="add-food">＋ הוספת אוכל</button>
    </div>

    <div class="card tight water-row">
      ${ib('drop', 'acc')}
      <div class="grow"><div class="row between"><b>מים</b><span class="num sub">${(dd.water / 1000).toFixed(1)} / ${t.waterL} ל׳</span></div>
        <div class="bar"><i style="width:${Math.min(100, Math.round((dd.water / (t.waterL * 1000)) * 100))}%;background:var(--blue)"></i></div></div>
      <button class="btn sm" data-add="water">＋ כוס</button>
    </div>

    ${advice ? html`<div class="card tight advice ${advice.step ? 'act' : ''}">
      <b>${advice.onTrack ? 'הקצב שלך מתאים למטרה' : advice.step > 0 ? 'המשקל יורד מהר מהמתוכנן' : advice.step < 0 ? 'המשקל עולה מהר מהמתוכנן' : 'מגמת המשקל'}</b>
      <div class="sub t-foot">בשבועות האחרונים: <span class="num ltr">${advice.kgWeek > 0 ? '+' : ''}${advice.kgWeek}</span> ק״ג לשבוע (<span class="num ltr">${advice.pctWeek}%</span>). הטווח המומלץ למטרה: <span class="num ltr">${advice.range[0]}%</span> עד <span class="num ltr">${advice.range[1]}%</span>.</div>
      ${advice.step ? `<button class="btn sm block mt-3" data-adjust="${advice.step}">${advice.step > 0 ? 'העלה' : 'הורד'} את היעד ב-${Math.abs(advice.step)} קק״ל</button>` : ''}
    </div>` : ''}

    <div class="h2">מה אכלתי${log.length ? `<span class="more" data-act="clear-log">ניקוי</span>` : ''}</div>
    ${repeatable.length ? `<div class="chips" style="margin-bottom:10px">${repeatable.map(([slot, label, n]) => `<button class="chip" data-repeat="${slot}">${icon('refresh')} ${label} כמו אתמול <small class="num">(${n})</small></button>`).join('')}</div>` : ''}
    <div class="card tight">
      ${log.length ? MEAL_SLOTS.map(([slot, label]) => {
        const items = log.filter((x) => (x.slot || 'snack') === slot);
        if (!items.length) return '';
        const k = items.reduce((a, x) => a + x.f.kcal * x.qty, 0);
        return html`<div class="log-slot"><div class="row between"><b>${label}</b><span class="sub num t-cap">${Math.round(k)} קק״ל</span></div>
          ${items.map((x) => html`<button class="log-it" data-log="${x.i}"><span>${esc(x.f.name)}<small> · ${qtyLabel(x.qty)}${esc(x.f.portion)}</small>${algMark(x.f, p)}</span>
            <span class="num sub">${Math.round(x.f.kcal * x.qty)}</span></button>`)}</div>`;
      }).join('') : `<div class="empty" style="padding:12px 4px">עוד לא נרשם אוכל היום.<br>אפשר להוסיף אוכל, או לסמן ארוחה שלמה בלשונית "תפריט".</div>`}
    </div>`;

  const menuTab = () => html`
    <div class="seg">${ctxs.map(([k, v]) => `<button data-ctx="${k}" class="${ctx === k ? 'on' : ''}">${v}</button>`)}</div>
    <div class="row between menu-sum"><div class="sub t-foot">התפריט: <b class="num">${nf(plan.total.kcal)}</b> קק״ל · <b class="num">${plan.total.p}</b> ג׳ חלבון<br>יעד: <span class="num">${nf(t.kcal)}</span> קק״ל · <span class="num">${t.protein}</span> ג׳ חלבון</div>
      <button class="btn sm" data-act="shuffle">${icon('swap', 'width="16" height="16"')} תפריט אחר</button></div>
    ${mw && plan.meals.some((m) => m.id === 'post') ? `<div class="sub t-foot meal-note">${mw === 'rest' ? 'היום אין אימון ביומן — במקום "אחרי אימון" יש ארוחת ביניים.' : mw.done ? 'הארוחות מסודרות לפי האימון שעשית היום.' : `האימון היום ב-${mw.time} — הארוחות מסודרות סביבו.`}</div>` : ''}
    <div class="sub t-foot swap-hint">לחיצה על מנה או על מאכל מציעה חלופות, והכמויות מתעדכנות ליעד.</div>
    ${plan.over ? `<div class="sub t-foot" style="margin:-4px 0 10px;color:var(--orange)">${plan.lowP ? 'עם ההגבלות שנבחרו אין כאן מספיק מאכלים מתאימים: התפריט יוצא מעל יעד הקלוריות, והחלבון מתחת ליעד. אפשר לנסות "תפריט אחר".' : 'עם ההגבלות שנבחרו אין כאן מספיק מאכלים מתאימים, והתפריט יוצא מעל יעד הקלוריות. אפשר להקטין מנה, או לנסות "תפריט אחר".'}</div>`
    : plan.short ? '<div class="sub t-foot" style="margin:-4px 0 10px;color:var(--orange)">עם ההגבלות שנבחרו אין כאן מספיק מאכלים מתאימים כדי להגיע ליעד. כדאי להשלים ממה שיש בהישג יד, או לנסות "תפריט אחר".</div>' : ''}
    ${plan.meals.map((m, mi) => html`<div class="card tight meal">
      <div class="meal-head"><div class="grow"><b>${emi(m.icon)} ${m.name}${m.hint ? ` <small class="meal-at num">בסביבות ${m.hint}</small>` : ''}</b><span class="num sub t-foot">${m.total.kcal} קק״ל · ${m.total.p} ג׳ חלבון</span></div>
        <button class="eat-btn" data-eat-meal="${mi}" aria-label="אכלתי את ${esc(m.name)}">${icon('check')} אכלתי</button></div>
      <button class="dish-line" data-dish="${mi}">${m.dish ? `<b>${esc(m.dish.name)}</b>` : '<b class="sub" style="font-weight:600">הרכב לפי המאכלים</b>'}<span>${icon('swap')} מנה אחרת</span></button>
      ${m.items.map((it) => { const f = FOOD[it.id]; return `<button class="mi" data-swap="${mi}|${it.id}"><span>${it.extra ? '<span class="tag">תוספת</span>' : ''}${esc(f.name)}</span><small>${qtyLabel(it.qty)}${esc(f.portion)}</small><i>${icon('swap')}</i></button>`; })}
    </div>`)}
    <div class="sub t-foot center-t mt-3">סה״כ ביום: <span class="num">${plan.total.c}</span> ג׳ פחמימה · <span class="num">${plan.total.f}</span> ג׳ שומן · <span class="num">${plan.total.fib}</span> ג׳ סיבים (יעד ${t.fiber})</div>`;

  const prefsTab = () => html`
    ${nutPrefsHtml(p)}
    <div class="h2">רמת פעילות</div>
    <div class="seg" data-activity>${Object.entries(activityFor(p)).map(([k, a]) => `<button data-v="${k}" class="${actKey === k ? 'on' : ''}">${a.name}</button>`).join('')}</div>
    <div class="sub t-foot mt-2">${esc(act.full)}: ${esc(act.desc)}. קובע את יעד הקלוריות.</div>

    <div class="h2">מה אני לא אוכל<span class="more" data-act="edit">${editDislikes ? 'סיום' : 'עריכה'}</span></div>
    <div class="card tight">
      ${editDislikes ? html`<div class="sub" style="margin-bottom:8px">קטגוריות:</div>
        <div class="chips">${Object.entries(DISLIKE_TAGS).map(([k, v]) => `<button class="chip no ${p.dislikes.includes(k) ? 'on' : ''}" data-dis="${k}">${v}</button>`)}</div>
        <div class="sub" style="margin:14px 0 8px">מאכלים ספציפיים:</div>
        <input class="input" data-dq placeholder="חיפוש מאכל…" value="${esc(dislikeQuery)}" style="height:44px;margin-bottom:10px">
        <div class="chips" id="dislikeChips">${dislikeChips(p)}</div>`
      : html`<div class="chips">${[...p.dislikes.map((k) => DISLIKE_TAGS[k]), ...(p.dislikedFoods || []).map((id) => FOOD[id]?.name)].filter(Boolean).map((x) => `<span class="chip no on">${esc(x)}</span>`).join('') || '<span class="sub">אוכל הכל</span>'}</div>`}
    </div>

    <div class="h2">מידע</div>
    ${plan.noVeg ? html`<details class="card acc"><summary>בלי ירקות — ככה משלימים</summary><div class="acc-body">${NO_VEG_TIPS.map(tip)}</div></details>` : ''}
    <details class="card acc"><summary>${inService(p) ? 'טיפים לשירות' : 'טיפים'}</summary><div class="acc-body">${(inService(p) ? SERVICE_TIPS : ARMY_TIPS).map(tip)}</div></details>
    <details class="card acc method"><summary>איך זה מחושב</summary><div class="acc-body">
      ${p.track === 'cali' ? `<div class="m-row"><b>קליסתניקס</b><span>${p.goal === 'muscle' ? 'העודף הקלורי נשאר קטן בכוונה: כל קילו נוסף הוא קילו שצריך להרים במתח ובמקבילים.' : p.goal === 'cut' ? 'ירידה איטית שומרת על הכוח. כל קילו שומן שיורד מקל ישירות על מתח, לברים ועמידת ידיים.' : 'איזון קלורי עם חלבון גבוה: בונים כוח בלי לעלות במשקל, כי הכוח כאן נמדד ביחס למשקל הגוף.'}</span></div>` : ''}
      <div class="m-row"><b>לפי היום</b><span>הפחמימה עוקבת אחרי עומס האימון של אותו יום (Burke 2011; ACSM / AND / DC 2016): ‎+15% קלוריות ביום ריצה ארוכה, ‎+5% ביום אימון קשה, בלי שינוי ביום קל, ו-‎−5% ביום מנוחה. החלבון קבוע. גודל ההזזה הוא בחירה של האפליקציה, לא ממצא מחקרי.</span></div>
      <div class="m-row"><b>קלוריות</b><span>BMR לפי Mifflin-St Jeor (<span class="num">${t.bmr}</span>) × מקדם פעילות ${t.activity.factor} = <span class="num">${t.tdee}</span>${t.delta ? ` ${t.delta > 0 ? '+' : '−'} <span class="num">${Math.abs(t.delta)}</span> (${p.goal === 'cut' ? 'ירידה של ~0.5% ממשקל הגוף בשבוע' : 'עודף של ~10% — עלייה של 0.25–0.5% בשבוע'})` : ' (תחזוקה)'}${t.adjust ? ` ${t.adjust > 0 ? '+' : '−'} <span class="num">${Math.abs(t.adjust)}</span> (כיול לפי מגמת המשקל שלך)` : ''}</span></div>
      <div class="m-row"><b>חלבון</b><span>${t.perKg} ג׳ לק״ג${t.refW < Math.round(p.weightKg) ? ` (לפי משקל ייחוס ${t.refW} ק״ג)` : ''} — ISSN: 1.4–2.0 למתאמנים, יותר בגירעון; 20–40 ג׳ בכל ארוחה</span></div>
      <div class="m-row"><b>שומן</b><span>25% מהקלוריות (טווח מומלץ 20–35%), לא פחות מ-0.5 ג׳ לק״ג</span></div>
      <div class="m-row"><b>פחמימה</b><span>יתרת הקלוריות — <span class="num">${(t.carbs / (p.weightKg || 70)).toFixed(1)}</span> ג׳ לק״ג (ACSM: 5–7 לאימון בינוני, 3–5 לקל)</span></div>
      <div class="m-row"><b>סיבים</b><span>14 ג׳ לכל 1,000 קק״ל (IOM)</span></div>
      <div class="m-row"><b>שתייה</b><span>${p.sex === 'f' ? '1.6' : '2.0'} ל׳ ממשקאות (EFSA) + 0.5 ל׳ לשעת אימון (ACSM); בחום ובמאמץ ממושך יותר</span></div>
      <div class="m-row"><b>כיול</b><span>אחרי שבועיים של שקילות, היעד מושווה לקצב השינוי בפועל ומוצע תיקון של 150 קק״ל</span></div>
      <div class="m-row"><b>ערכי מזון</b><span>מאגר התזונה הלאומי של משרד הבריאות — ${FOODS.length} מאכלים, משקל מנה מטבלת המשקלים של המאגר</span></div>
      ${t.adjust ? '<button class="btn sm block mt-3" data-adjust="reset">איפוס הכיול האישי</button>' : ''}
      <details style="margin-top:8px"><summary class="sub" style="cursor:pointer;min-height:44px;display:flex;align-items:center">מקורות (${NUTRITION_REFS.length})</summary>
        <ol class="refs">${NUTRITION_REFS.map((r) => `<li><a href="${r.u}" target="_blank" rel="noopener">${esc(r.t)}</a></li>`).join('')}</ol></details>
    </div></details>
    <p class="sub t-cap mt-3">ההמלצות כלליות ואינן תחליף לייעוץ של דיאטנית/רופא.</p>
    <button class="btn sm block mt-3" data-act="nut-off">לכבות את ליווי התזונה</button>`;

  root.innerHTML = html`<div class="page-head"><div class="h1">תזונה</div></div>
    <div class="seg tabs" data-tabs>${TABS.map(([k, v]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${v}</button>`).join('')}</div>
    ${tab === 'prefs' ? '' : guardCard(t)}
    ${tab === 'menu' ? menuTab() : tab === 'prefs' ? prefsTab() : todayTab()}`;

  const rerender = () => renderNutrition(root);
  on(root, 'click', '[data-daytype] button', (e, b) => { setDaily({ dayType: b.dataset.v === 'rest' ? 'rest' : null }); renderNutrition(root); });
  on(root, 'click', '[data-repeat]', (e, b) => {
    const slot = b.dataset.repeat;
    const items = yFoods.filter((it) => (it.slot || 'snack') === slot).map((it) => ({ id: it.id, qty: it.qty, slot, at: Date.now() }));
    setDaily({ foods: [...(daily().foods || []), ...items] });
    toast(`${items.length} פריטים נרשמו`, 1400); rerender();
  });
  on(root, 'click', '[data-tab]', (e, b) => { tab = b.dataset.tab; rerender(); });
  on(root, 'click', '[data-adjust]', (e, b) => {
    const v = b.dataset.adjust;
    set((s2) => { s2.profile.kcalAdjust = v === 'reset' ? 0 : (s2.profile.kcalAdjust || 0) + Number(v); return s2; });
    toast(v === 'reset' ? 'הכיול אופס' : 'יעד הקלוריות עודכן'); rerender();
  });
  on(root, 'click', '[data-activity] button', (e, b) => { set((s2) => { s2.profile.activityLevel = b.dataset.v; return s2; }); rerender(); });
  on(root, 'click', '[data-ctx]', (e, b) => { ctx = b.dataset.ctx; rerender(); });
  // החלפת פריט בודד בתפריט
  on(root, 'click', '[data-swap]', (e, b) => {
    const [mi, id] = b.dataset.swap.split('|'), meal = plan.meals[Number(mi)], it = meal.items.find((x) => x.id === id);
    const key = `${meal.id}|${it.from || it.id}`, opts = swapOptions(p, plan, Number(mi), id, { ctx });
    sheet(html`<div class="eyebrow">${esc(meal.name)}</div><div class="h1" style="font-size:22px">במקום ${esc(FOOD[id].name)}</div>
      ${opts.length ? opts.map((f) => `<button class="swap-opt" data-to="${f.id}"><span><b>${esc(f.name)}</b><small>${esc(f.portion)}</small></span><span class="num"><b>${Math.round(f.kcal)}</b><small>${Math.round(f.p)} ג׳ חלבון</small></span></button>`).join('') : '<p class="sub" style="margin-top:10px">אין כרגע חלופה מתאימה לארוחה הזאת עם ההעדפות שלך.</p>'}
      ${it.from ? `<button class="btn block" style="margin-top:12px" data-to="">להחזיר את ${esc(FOOD[it.from].name)}</button>` : ''}
      <button class="btn ghost block" style="margin-top:8px" data-close>ביטול</button>`, {
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
    sheet(html`<div class="eyebrow">${esc(meal.name)}</div><div class="h1" style="font-size:22px">מנה אחרת</div>
      ${opts.length ? opts.map((d) => `<button class="swap-opt" data-to="${d.id}"><span><b>${esc(d.name)}</b><small>${d.items.map(([id]) => esc(FOOD[id].name)).join(' · ')}</small></span></button>`).join('') : '<p class="sub" style="margin-top:10px">אין כרגע מנה אחרת שמתאימה לארוחה הזאת עם ההעדפות שלך ובמקום הזה.</p>'}
      <button class="btn ghost block" style="margin-top:12px" data-close>ביטול</button>`, {
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
  on(root, 'click', '[data-act="nut-off"]', () => { set((s2) => { s2.profile.nutrition = false; return s2; }); tab = 'today'; toast('ליווי התזונה כובה. אפשר להפעיל שוב מכאן.'); rerender(); });
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
    toast(`✓ ${m.name} נרשמה ביומן`, 1500);
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
    + (dislikeQuery ? '' : '<span class="sub" style="font-size:12px;align-self:center">…חפש כדי לראות עוד</span>');
}

// ───── מועדפים ואחרונים ─────
const favFoods = () => get().profile.favFoods || [];
const favLabel = (id) => (favFoods().includes(id) ? `${icon('star')} במועדפים — הסר` : `${icon('star')} הוסף למועדפים`);
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
  sheet(html`<div class="eyebrow">יומן אכילה</div><div class="h1" style="font-size:22px">מה ${g('אכלת', 'אכלת')}?</div>
    <div class="seg" data-slot style="margin:10px 0">${MEAL_SLOTS.map(([k, v]) => `<button data-sl="${k}" class="${slot === k ? 'on' : ''}">${v}</button>`).join('')}</div>
    <input class="input" data-q placeholder="חיפוש: שניצל, קוטג׳, במבה…" autocomplete="off">
    <div class="chips scroll" style="margin-block:10px">${CATS.map(([k, v]) => `<button class="chip ${k === cat ? 'on' : ''}" data-cat="${k}">${v}</button>`).join('')}</div>
    <div id="fres" class="food-res"></div>
    <div class="grid2" style="margin-top:12px"><button class="btn sm" data-scan>${icon('scan')} סריקת ברקוד</button><button class="btn sm" data-custom>＋ מזון חדש</button></div>`, {
    onMount(sh, close) {
      const row = (f, mark = '') => html`<button class="food-row" data-pick="${f.id}">
          <span><b>${mark}${esc(f.name)}</b><small>${esc(f.portion)}${f.custom ? ' · שלי' : ''}</small>${algMark(f, get().profile)}</span>
          <span class="num"><b>${Math.round(f.kcal)}</b><small>${Math.round(f.p)} ג׳ חלבון</small></span></button>`;
      const paint = () => {
        let out = '';
        if (!q && !cat) {
          // בלי חיפוש: קודם מועדפים, אחר כך מה שנאכל לאחרונה — רישום חוזר בשתי הקשות
          const favs = favFoods().map((id) => foodLookup(id, custom())).filter(Boolean);
          const rec = recentFoods().filter((id) => !favFoods().includes(id)).map((id) => foodLookup(id, custom())).filter(Boolean).slice(0, 8);
          if (favs.length) out += `<div class="food-sec">${icon('star')} מועדפים</div>` + favs.map((f) => row(f)).join('');
          if (rec.length) out += `<div class="food-sec">${icon('clock')} אחרונים</div>` + rec.map((f) => row(f)).join('');
          if (out) out += '<div class="food-sec">כל המאכלים</div>';
        }
        const res = searchFoods(q, custom(), { cat: cat || null, limit: 50 });
        out += res.map((f) => row(f)).join('');
        sh.querySelector('#fres').innerHTML = out || '<div class="empty" style="padding:14px">לא נמצא. אפשר להוסיף "מזון שלא ברשימה" למטה.</div>';
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
  const line = () => `<b class="num">${Math.round(f.kcal * qty)}</b> קק״ל · <b class="num">${Math.round(f.p * qty)}</b>ג׳ חלבון · <b class="num">${Math.round(f.c * qty)}</b>ג׳ פחמ׳ · <b class="num">${Math.round(f.f * qty)}</b>ג׳ שומן`;
  sheet(html`<div class="h1" style="font-size:22px">${esc(f.name)}</div><div class="sub">מנה: ${esc(f.portion)}</div>
    ${allergyHits(f, get().profile).length ? `<div class="card tight guard-note" style="margin-top:8px">${icon('warn', 'width="18" height="18"')}<div><p>לפי המאגר, המאכל הזה מכיל: <b>${allergyHits(f, get().profile).join(', ')}</b> — סימנת אלרגיה או רגישות. תמיד לבדוק את התווית.</p></div></div>` : ''}
    ${f.src ? `<div class="src-line">מקור: מאגר משרד הבריאות — ${f.src.map((x) => `${esc(x.name)} (${x.g} ג׳)`).join(' + ')}</div>` : f.custom ? '<div class="src-line">מזון אישי (ערכים שהזנת)</div>' : ''}
    <div class="sub" style="margin:14px 0 6px">כמות</div>
    <div class="seg" data-qty>${QTYS.map((v) => `<button data-qv="${v}" class="${v === qty ? 'on' : ''}">${v === 0.5 ? '½' : v === 1.5 ? '1½' : v}</button>`).join('')}</div>
    <div class="card tight" style="margin-top:12px" id="qline">${line()}</div>
    <button class="btn primary block xl" style="margin-top:14px" data-ok>הוסף ליומן</button>
    <button class="btn ghost block" style="margin-top:6px" data-fav>${favLabel(f.id)}</button>`, {
    onMount(sh, close) {
      sh.querySelector('[data-fav]').addEventListener('click', (e) => {
        set((s2) => { const a = (s2.profile.favFoods ||= []); const i = a.indexOf(f.id); i >= 0 ? a.splice(i, 1) : a.unshift(f.id); return s2; });
        e.currentTarget.innerHTML = favLabel(f.id);
      });
      on(sh, 'click', '[data-qv]', (e, b) => { qty = Number(b.dataset.qv); sh.querySelectorAll('[data-qv]').forEach((x) => x.classList.toggle('on', x === b)); sh.querySelector('#qline').innerHTML = line(); });
      sh.querySelector('[data-ok]').addEventListener('click', () => {
        setDaily({ foods: [...(daily().foods || []), { id: f.id, qty, slot, at: Date.now() }] });
        toast(`✓ ${f.name} נרשם`, 1300);
        close(); onDone?.();
      });
    },
  });
}

function logItemSheet(i, onDone) {
  const dd = daily();
  const it = dd.foods[i];
  const f = foodLookup(it.id, get().profile.customFoods || []);
  sheet(html`<div class="h1" style="font-size:22px">${esc(f.name)}</div><div class="sub">${qtyLabel(it.qty)}${esc(f.portion)} · ${Math.round(f.kcal * it.qty)} קק״ל</div>
    <div class="sub" style="margin:14px 0 6px">שינוי כמות</div>
    <div class="seg">${QTYS.map((v) => `<button data-qv="${v}" class="${v === it.qty ? 'on' : ''}">${v === 0.5 ? '½' : v === 1.5 ? '1½' : v}</button>`).join('')}</div>
    <button class="btn danger block" style="margin-top:14px" data-del>הסר מהיומן</button>
    <button class="btn ghost block" style="margin-top:8px" data-close>סגור</button>`, {
    onMount(sh, close) {
      on(sh, 'click', '[data-qv]', (e, b) => { const foods = [...daily().foods]; foods[i] = { ...foods[i], qty: Number(b.dataset.qv) }; setDaily({ foods }); close(); onDone?.(); });
      sh.querySelector('[data-del]').addEventListener('click', () => { const foods = daily().foods.filter((_, j) => j !== i); setDaily({ foods }); close(); onDone?.(); });
    },
  });
}

// ───── סריקת ברקוד ─────
function scanSheet(slot, onDone) {
  let stopCam = null, busy = false;
  const closeSheet = sheet(html`<div class="eyebrow">מוצר ארוז</div><div class="h1" style="font-size:22px">סריקת ברקוד</div>
    <div class="scan-box"><video muted playsinline></video><i class="scan-line"></i><div class="scan-msg" data-msg>מפעיל מצלמה…</div></div>
    <p class="sub t-foot" style="margin:10px 0">מכוונים את הברקוד אל הקו. אפשר גם להקליד את המספר שמתחתיו.</p>
    <div class="row"><input class="input num" data-code inputmode="numeric" placeholder="7290000000000" maxlength="14" style="flex:1;min-width:0"><button class="btn" data-find>חפש</button></div>
    <p class="sub t-cap" style="margin-top:10px">הערכים מגיעים מהמאגר הפתוח Open Food Facts; נשלח אליו רק מספר הברקוד. כדאי להשוות לתווית לפני השמירה.</p>`, {
    onClose() { stopCam?.(); },
    onMount(sh) {
      const msg = (x) => { const m = sh.querySelector('[data-msg]'); if (m) m.textContent = x; };
      const found = async (code) => {
        if (busy) return;
        busy = true;
        // מוצר שכבר נסרק ונשמר — ישר לבחירת כמות
        const known = (get().profile.customFoods || []).find((f) => f.barcode === code);
        if (known) { closeSheet(); qtySheet(known, slot, onDone); return; }
        msg(`נמצא ברקוד ${code} — מחפש…`);
        try {
          const r = await lookupBarcode(code);
          closeSheet();
          if (!r.found) { toast('המוצר לא נמצא במאגר — אפשר להזין מהתווית'); customFoodSheet(slot, onDone, { barcode: code }); return; }
          if (!r.complete) toast('המוצר נמצא, אבל בלי ערכים מלאים — להשלים מהתווית');
          customFoodSheet(slot, onDone, r);
        } catch {
          busy = false;
          msg(navigator.onLine ? 'החיפוש נכשל — לנסות שוב' : 'אין חיבור לרשת — החיפוש דורש אינטרנט');
        }
      };
      sh.querySelector('[data-find]').addEventListener('click', () => {
        const code = sh.querySelector('[data-code]').value.replace(/\D/g, '');
        if (code.length < 8) { toast('מספר ברקוד קצר מדי'); return; }
        found(code.length === 12 ? `0${code}` : code);
      });
      if (!navigator.mediaDevices?.getUserMedia) { msg('אין גישה למצלמה בדפדפן הזה — אפשר להקליד את המספר'); return; }
      startScanner(sh.querySelector('video'), (code) => { vibrate(40); found(code); })
        .then((stop) => { stopCam = stop; if (!document.body.contains(sh)) stop(); else msg(''); })
        .catch(() => msg('אין הרשאה למצלמה — אפשר להקליד את המספר'));
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
  sheet(html`<div class="eyebrow">${pre.barcode ? `ברקוד ${esc(pre.barcode)}` : 'מזון אישי'}</div><div class="h1" style="font-size:22px">${pre.found ? 'לבדוק ולשמור' : 'הוספת מזון חדש'}</div>
    <p class="sub">${pre.found ? 'הערכים הגיעו ממאגר פתוח שמשתמשים ממלאים — כדאי להשוות לתווית.' : 'יישמר אצלך ויופיע בחיפוש בפעם הבאה. מוסיפים את המרכיבים והקלוריות מחושבות לבד, או מעתיקים ערכים מהתווית שעל האריזה.'}</p>
    <label class="field"><span>שם</span><input class="input" name="name" value="${val(pre.name)}"></label>
    ${pre.found ? '' : `<div class="h2" style="margin-top:12px">ממה המנה מורכבת?</div>
    <div data-parts></div>
    <input class="input" data-pq placeholder="חיפוש מרכיב: אורז, עוף, שמן זית…" autocomplete="off" style="height:44px">
    <div class="food-res part-res" data-pres hidden></div>`}
    <div class="sub t-foot" data-pnote style="margin:10px 0 6px">${pre.found ? '' : 'בלי מרכיבים אפשר להקליד את הערכים למנה:'}</div>
    <label class="field"><span>מנה (למשל: יחידה, 100 ג׳)</span><input class="input" name="portion" value="${val(pre.portion || 'מנה')}"></label>
    <div class="grid2">
      <label class="field"><span>קלוריות</span><input class="input num" name="kcal" type="number" inputmode="numeric" value="${val(pre.kcal)}"></label>
      <label class="field"><span>חלבון (ג׳)</span><input class="input num" name="p" type="number" inputmode="decimal" value="${val(pre.p)}"></label>
      <label class="field"><span>פחמימות (ג׳)</span><input class="input num" name="c" type="number" inputmode="decimal" value="${val(pre.c)}"></label>
      <label class="field"><span>שומן (ג׳)</span><input class="input num" name="f" type="number" inputmode="decimal" value="${val(pre.f)}"></label>
    </div>
    <button class="btn primary block xl" data-save>שמור והוסף ליומן</button>`, {
    onMount(sh, close) {
      const inp = (n) => sh.querySelector(`[name=${n}]`);
      // המרכיבים שנבחרו, וערכי המנה שמחושבים מהם (השדות ננעלים כל עוד יש מרכיבים)
      const paintParts = () => {
        const box = sh.querySelector('[data-parts]'); if (!box) return;
        box.innerHTML = parts.map((it, i) => { const x = foodLookup(it.id, custom()); return `<div class="part-row"><span><b>${esc(x.name)}</b><small>${qtyLabel(it.qty)}${esc(x.portion)} · ${Math.round(x.kcal * it.qty)} קק״ל</small></span>
          <button type="button" data-pm="${i}" aria-label="פחות">−</button><b class="num">${it.qty}</b><button type="button" data-pp="${i}" aria-label="עוד">+</button></div>`; }).join('');
        const has = parts.length > 0, tot = partsTotals(parts, custom());
        for (const k of ['kcal', 'p', 'c', 'f']) { const el = inp(k); if (has) el.value = tot[k]; el.readOnly = has; el.classList.toggle('auto', has); }
        sh.querySelector('[data-pnote]').textContent = has ? `מחושב מהמרכיבים: ${tot.kcal} קק״ל · ${tot.p} ג׳ חלבון למנה` : 'בלי מרכיבים אפשר להקליד את הערכים למנה:';
      };
      const paintRes = () => {
        const box = sh.querySelector('[data-pres]'); if (!box) return;
        const res = pq.trim().length < 2 ? [] : searchFoods(pq, custom(), { limit: 6 });
        box.hidden = !res.length;
        box.innerHTML = res.map((x) => `<button type="button" class="food-row" data-padd="${x.id}"><span><b>${esc(x.name)}</b><small>${esc(x.portion)}</small></span><span class="num"><b>${Math.round(x.kcal)}</b><small>קק״ל</small></span></button>`).join('');
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
        if (!name) { toast('צריך לתת למנה שם'); return; }
        if (!kcal) { toast('מוסיפים מרכיב אחד לפחות, או מקלידים קלוריות'); return; }
        const food = { id: `c_${Date.now()}`, name, portion: v('portion') || 'מנה', kcal, p: tot ? tot.p : Number(v('p')) || 0, c: tot ? tot.c : Number(v('c')) || 0, f: tot ? tot.f : Number(v('f')) || 0, fib: tot ? tot.fib : Number(pre.fib) || 0,
          cat: 'custom', tags: [], ctx: ['base', 'home', 'field'], custom: true, ...(pre.barcode ? { barcode: pre.barcode } : {}), ...(tot ? { parts: parts.map((x) => ({ id: x.id, qty: x.qty })) } : {}) };
        set((s2) => { (s2.profile.customFoods ||= []).push(food); return s2; });
        setDaily({ foods: [...(daily().foods || []), { id: food.id, qty: 1, slot, at: Date.now() }] });
        toast(`✓ ${name} נשמר ונרשם`);
        close(); onDone?.();
      });
    },
  });
}

const tip = (x) => `<div class="tip"><div class="ti">${em(x.icon, 'acc')}</div><div><b>${esc(x.title)}</b><span>${esc(x.text)}</span>${x.ref ? `<small class="ref">מקור: ${esc(x.ref)}</small>` : ''}</div></div>`;
function toggle(arr, v) { const i = arr.indexOf(v); i >= 0 ? arr.splice(i, 1) : arr.push(v); }
