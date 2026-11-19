// מנוע תזונה: יעדים קלוריים ומאקרו, ובניית תפריט יומי שמכבד את מה שהמשתמש לא אוכל.
import { FOODS, FOOD } from '../data/foods.js';

// ───── יעדים — כל רכיב מבוסס מקור (ראו docs/NUTRITION_SOURCES.md) ─────
// BMR: משוואת Mifflin-St Jeor (1990).
export function bmr({ weightKg, heightCm, age, sex = 'm' }) {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'f' ? -161 : 5);
}

// מקדמי פעילות סטנדרטיים (McArdle; בשימוש עם Mifflin-St Jeor): 1.375 קל, 1.55 בינוני, 1.725 גבוה, 1.9 גבוה מאוד.
// מחקרים על אימונים צבאיים מדדו לעיתים קרובות הוצאה של 4,000+ קק״ל ביום שטח — לכן "שבוע שטח" = 1.9.
export const ACTIVITY = {
  light: { name: 'קל', full: 'פעילות קלה', factor: 1.375, desc: '1–2 אימונים בשבוע, רוב היום בישיבה' },
  base: { name: 'בינוני', full: 'שגרה פעילה', factor: 1.55, desc: '3–5 אימונים בשבוע, יום עבודה רגיל' },
  training: { name: 'גבוה', full: 'אימונים כמעט כל יום', factor: 1.725, desc: '6–7 אימונים בשבוע / יום פעיל מאוד' },
  field: { name: 'גבוה מאוד', full: 'עבודה פיזית / אימון כפול', factor: 1.9, desc: 'עבודה פיזית קשה, אימון כפול, טיולים ארוכים' },
};

// רמת פעילות: מה שהמשתמש בחר, ואם לא בחר — נגזרת ממספר האימונים בשבוע (ולא "גבוה" לכולם, שמנפח את היעד ב-~10%).
export function activityKey(profile) {
  if (ACTIVITY[profile.activityLevel]) return profile.activityLevel;
  const d = profile.days || 4;
  // מוביליטי בלבד: האימונים קלים, ולכן ההוצאה נספרת כפעילות קלה גם ב-3–5 אימונים בשבוע
  if (profile.track === 'mob') return d >= 6 ? 'base' : 'light';
  return d <= 2 ? 'light' : d <= 5 ? 'base' : 'training';
}

// ירידה במשקל: קצב של ~0.5% ממשקל הגוף בשבוע (Helms et al., 2014), לפי ~7,700 קק״ל לק״ג רקמה (קירוב מקובל).
// מסה: עודף של ~10% מההוצאה (Iraki et al., 2019: עודף 10–20%, עלייה של 0.25–0.5% ממשקל הגוף בשבוע) — בקצה השמרני, בין 250 ל-450 קק״ל.
// כושר קרבי / כוח: איזון אנרגטי (תחזוקה).
// קליסתניקס + מסה: חצי מזה (5%, בין 150 ל-300) — הכוח נמדד ביחס למשקל הגוף, ולכן עלייה איטית עדיפה (בחירה תכנונית, לא ממצא מחקרי).
export function goalDelta(goal, weightKg, tdee = 2800, track = 'gym') {
  if (goal === 'cut') return -Math.round((0.005 * weightKg * 7700) / 7);
  if (goal === 'muscle' && track === 'cali') return Math.round(Math.min(300, Math.max(150, tdee * 0.05)) / 10) * 10;
  if (goal === 'muscle') return Math.round(Math.min(450, Math.max(250, tdee * 0.1)) / 10) * 10;
  return 0;
}

const KCAL_ADJ_MAX = 500;

export function targets(profile) {
  const w = profile.weightKg || 70;
  const hM = (profile.heightCm || 175) / 100;
  const act = ACTIVITY[activityKey(profile)];
  const rest = bmr({ weightKg: w, heightCm: profile.heightCm || 175, age: profile.age || 20, sex: profile.sex });
  const tdee = rest * act.factor;
  const delta = goalDelta(profile.goal, w, tdee, profile.track);
  // כיול אישי לפי מגמת המשקל בפועל (ראו trendAdvice) — המשוואות הן הערכה; המשקל הוא המדידה.
  const adjust = Math.max(-KCAL_ADJ_MAX, Math.min(KCAL_ADJ_MAX, profile.kcalAdjust || 0));
  // רצפה: לא יורדים מתחת לקצב חילוף החומרים במנוחה.
  const kcal = Math.round(Math.max(rest, tdee + delta + adjust) / 10) * 10;
  // חלבון: ISSN (Jäger 2017) — 1.4–2.0 ג׳/ק״ג למתאמנים; Morton 2018 — התועלת לשריר מתייצבת סביב 1.6 (גבול עליון 2.2).
  // בגירעון יותר (Helms 2014: 2.3–3.1 ג׳ לק״ג מסה רזה ≈ 2.2 לק״ג משקל גוף). בעודף משקל מחשבים לפי משקל ב-BMI 30,
  // אחרת היעד מתנפח לפי רקמת שומן שלא צריכה חלבון.
  const refW = Math.min(w, 30 * hM * hM);
  // מוביליטי בלבד (בלי אימוני כוח): 1.4 ג׳/ק״ג — הקצה התחתון של טווח ה-ISSN לאנשים פעילים; בגירעון 1.8
  const mobOnly = profile.track === 'mob';
  // ריצה בלבד: 1.6 ג׳/ק״ג (ISSN לספורט סבולת: 1.4–1.8), ובגירעון 2.0
  const runOnly = profile.track === 'run';
  const perKg = mobOnly ? (profile.goal === 'cut' ? 1.8 : 1.4) : runOnly ? (profile.goal === 'cut' ? 2.0 : 1.6) : profile.goal === 'cut' ? 2.2 : 2.0;
  const protein = Math.round(refW * perKg);
  // שומן: 25% מהאנרגיה — בתוך הטווח 20–35% (IOM, AMDR), ולא פחות מ-0.5 ג׳/ק״ג (Iraki 2019: 0.5–1.5 ג׳/ק״ג).
  const fat = Math.round(Math.max((kcal * 0.25) / 9, 0.5 * w));
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  // סיבים: 14 ג׳ לכל 1,000 קק״ל (IOM — צריכה מספקת).
  const fiber = Math.round((kcal / 1000) * 14);
  // שתייה: EFSA — צריכה מספקת 2.5 ל׳ (גברים) / 2.0 ל׳ (נשים) מכל המקורות; כ-70–80% ממשקאות ≈ 2.0 / 1.6 ל׳.
  // + 0.5 ל׳ לכל שעת אימון (ACSM 2007: קצבי הזעה 0.5–2.0 ל׳/שעה — לוקחים את הקצה הנמוך; בחום ובשטח יותר).
  const base = profile.sex === 'f' ? 1.6 : 2.0;
  const waterL = Math.round((base + 0.5 * ((mobOnly ? profile.mob?.minutes || 20 : profile.sessionMin || 60) / 60)) * 10) / 10;
  return { kcal, protein, fat, carbs, fiber, waterL, tdee: Math.round(tdee), bmr: Math.round(rest), delta, adjust, activity: act, perKg, refW: Math.round(refW) };
}

// ───── כיול לפי מגמת המשקל ─────
// קצב שבועי (רגרסיה ליניארית על השקילות של 28 הימים האחרונים) מול הקצב שהמחקר ממליץ למטרה.
// צריך לפחות 3 שקילות על פני 14 יום. מחזיר null כשאין מספיק נתונים.
const RATE = { cut: [-1.0, -0.4], muscle: [0.2, 0.5] }; // % ממשקל הגוף בשבוע (Helms 2014; Iraki 2019)
export function trendAdvice(weights = [], profile = {}, now = Date.now()) {
  const pts = weights.map((x) => ({ t: new Date(x.date).getTime() / 864e5, kg: x.kg })).filter((x) => x.t > now / 864e5 - 28 && Number.isFinite(x.kg));
  if (pts.length < 3) return null;
  const span = pts[pts.length - 1].t - pts[0].t;
  if (span < 14) return null;
  const mt = pts.reduce((a, x) => a + x.t, 0) / pts.length, mk = pts.reduce((a, x) => a + x.kg, 0) / pts.length;
  const slope = pts.reduce((a, x) => a + (x.t - mt) * (x.kg - mk), 0) / pts.reduce((a, x) => a + (x.t - mt) ** 2, 0); // ק״ג ליום
  const pctWeek = (slope * 7 / mk) * 100;
  const [lo, hi] = RATE[profile.goal] || [-0.25, 0.25];
  const cur = profile.kcalAdjust || 0;
  let step = 0;
  if (pctWeek < lo) step = 150; else if (pctWeek > hi) step = -150;
  if (Math.abs(cur + step) > KCAL_ADJ_MAX) step = 0;
  return { kgWeek: Math.round(slope * 7 * 100) / 100, pctWeek: Math.round(pctWeek * 100) / 100, range: [lo, hi], step, onTrack: pctWeek >= lo && pctWeek <= hi };
}

export function allowed(food, dislikes = [], dislikedFoods = []) {
  if (dislikedFoods.includes(food.id)) return false;
  return !food.tags.some((t) => dislikes.includes(t));
}

// ארוחות: כל משבצת מתמלאת רק במאכלים שמתאימים לארוחה (שדה meals במאגר) — לא עוף או בשר בבוקר.
// share = חלק מהקלוריות; pShare = חלק מהחלבון — מפוזר שווה יותר, כדי שכל ארוחה תגיע ל-20–40 ג׳ (ISSN: 0.25–0.4 ג׳/ק״ג לארוחה).
const MEALS = [
  { id: 'breakfast', code: 'b', name: 'ארוחת בוקר', icon: 'sunrise', share: 0.25, pShare: 0.22, slots: [['protein', 'dairy'], ['carb'], ['veg', 'fruit']] },
  { id: 'snack1', code: 's', name: 'ביניים', icon: 'apple', share: 0.1, pShare: 0.12, slots: [['dairy', 'protein'], ['fruit', 'fat']] },
  { id: 'lunch', code: 'l', name: 'צהריים', icon: 'plate', share: 0.3, pShare: 0.26, slots: [['protein'], ['carb'], ['veg'], ['fat']] },
  { id: 'post', code: 'p', name: 'אחרי אימון', icon: 'dumbbell', share: 0.12, pShare: 0.18, slots: [['protein', 'dairy'], ['fruit', 'carb']] },
  { id: 'dinner', code: 'd', name: 'ערב', icon: 'moon', share: 0.23, pShare: 0.22, slots: [['protein', 'dairy'], ['carb'], ['veg']] },
];
// לא נכנסים לתפריט אוטומטי (ההנחיות של משרד הבריאות ממליצות להגביל חטיפים, משקאות ממותקים ובשר מעובד)
const NOT_IN_PLAN = new Set(['bamba', 'bissli', 'chips', 'chocolate', 'wafers', 'cookies', 'ice_cream', 'energy_drink', 'soft_drink', 'iso_drink',
  'chocolate_spread', 'halva', 'hot_dog', 'salami', 'fries', 'mayo', 'butter', 'jam', 'honey', 'popcorn', 'dairy_pudding', 'chocolate_milk']);

function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

// תקרות כמות ריאליות לפי סוג (למשל לא 9 כפות סלט ביצים)
const QCAP = { protein: 2, dairy: 2, carb: 2.5, fruit: 2, snack: 1.5, fat: 1.5, veg: 2 };
const QMIN = { fat: 0 }; // תוספת שומן אפשר להוריד לגמרי כשהיום כבר עשיר בשומן
const roundMacros = (o) => ({ kcal: Math.round(o.kcal), p: Math.round(o.p), c: Math.round(o.c), f: Math.round(o.f), fib: Math.round(o.fib || 0) });
const sumItems = (items) => items.reduce((a, it) => { const f = FOOD[it.id]; a.kcal += f.kcal * it.qty; a.p += f.p * it.qty; a.c += f.c * it.qty; a.f += f.f * it.qty; a.fib += (f.fib || 0) * it.qty; return a; }, { kcal: 0, p: 0, c: 0, f: 0, fib: 0 });

// מרחק התפריט מהיעדים: היום כולו (קלוריות וחלבון במשקל גבוה, חוסר חלבון חמור מעודף), ואיזון כל ארוחה.
function planCost(meals, t, minMealP) {
  const day = { kcal: 0, p: 0, c: 0, f: 0 };
  let cost = 0;
  for (const m of meals) {
    const s = sumItems(m.items);
    day.kcal += s.kcal; day.p += s.p; day.c += s.c; day.f += s.f;
    const gk = t.kcal * m.share;
    cost += 0.15 * ((s.kcal - gk) / gk) ** 2;
    if (s.p < minMealP) cost += 0.6 * ((minMealP - s.p) / minMealP) ** 2;
  }
  const rel = (v, g) => (v - g) / Math.max(1, g);
  const ep = rel(day.p, t.protein);
  return cost + 4 * rel(day.kcal, t.kcal) ** 2 + (ep < 0 ? 6 : 2) * ep ** 2 + 1.5 * rel(day.c, t.carbs) ** 2 + 1.5 * rel(day.f, t.fat) ** 2;
}

// ירידה חמדנית בצעדים של חצי מנה, עד שאין שיפור
function fitQuantities(meals, t, minMealP) {
  let best = planCost(meals, t, minMealP);
  for (let iter = 0; iter < 200; iter++) {
    let move = null;
    for (const m of meals) for (const it of m.items) {
      const cat = FOOD[it.id].cat, lo = QMIN[cat] ?? 0.5, hi = QCAP[cat] || 2, q0 = it.qty;
      for (const d of [0.5, -0.5]) {
        const q = q0 + d;
        if (q < lo || q > hi) continue;
        it.qty = q;
        const c = planCost(meals, t, minMealP);
        if (c < best - 1e-9) { best = c; move = { it, q }; }
      }
      it.qty = q0;
    }
    if (!move) break;
    move.it.qty = move.q;
  }
  return best;
}

// בניית תפריט יומי. ctx: base | field | home
// התפריט נבנה רק מהמאכלים שנבחרו לו ידנית; מאכלי הרחבת המאגר (plan: false) משמשים לחיפוש וליומן בלבד.
export function mealPlan(profile, { ctx = 'base', seed = 1 } = {}) {
  const t = targets(profile);
  const rnd = seeded(seed);
  const pool = FOODS.filter((f) => allowed(f, profile.dislikes, profile.dislikedFoods) && f.ctx.includes(ctx) && f.cat !== 'meal' && f.plan !== false && !NOT_IN_PLAN.has(f.id));
  const usedToday = new Set();
  const pick = (opts) => { const f = opts[Math.floor(rnd() * opts.length)]; usedToday.add(f.id); return { id: f.id, qty: 1 }; };
  const meals = MEALS.map((m) => {
    const items = [];
    for (const cats of m.slots) {
      let opts = pool.filter((f) => cats.includes(f.cat) && f.meals.includes(m.code) && !usedToday.has(f.id));
      // לא אוכל ירקות? המשבצת מקבלת פרי או שומן בריא במקום להישאר ריקה
      if (!opts.length && cats.includes('veg')) opts = pool.filter((f) => ['fruit', 'fat'].includes(f.cat) && f.meals.includes(m.code) && !usedToday.has(f.id));
      if (opts.length) items.push(pick(opts));
    }
    return { ...m, items };
  });
  // רצפת חלבון לארוחה: 0.25 ג׳/ק״ג, בין 15 ל-30 ג׳ (ארוחת ביניים קטנה — חצי מזה)
  const minMealP = Math.min(30, Math.max(15, 0.25 * (profile.weightKg || 70)));
  const dayOf = () => meals.reduce((a, m) => { const s = sumItems(m.items); a.kcal += s.kcal; a.p += s.p; a.c += s.c; return a; }, { kcal: 0, p: 0, c: 0 });
  fitQuantities(meals, t, minMealP);
  // עדיין חסר? מוסיפים מנה (פחמימה/פרי כשחסרות קלוריות, חלבון/חלב כשחסר חלבון) לארוחה הכי רחוקה מהיעד שלה — עד 4 תוספות
  for (let extra = 0; extra < 4; extra++) {
    const d = dayOf();
    const needP = d.p < t.protein * 0.93, needK = d.kcal < t.kcal * 0.95;
    if (!needP && !needK) break;
    const cats = needP ? ['protein', 'dairy'] : ['carb', 'fruit'];
    const order = meals.map((m) => ({ m, gap: needP ? t.protein * m.pShare - sumItems(m.items).p : t.kcal * m.share - sumItems(m.items).kcal })).sort((a, b) => b.gap - a.gap);
    let added = false;
    for (const { m } of order) {
      const opts = pool.filter((f) => cats.includes(f.cat) && f.meals.includes(m.code) && !usedToday.has(f.id));
      if (!opts.length) continue;
      m.items.push(pick(opts)); added = true; break;
    }
    if (!added) break;
    fitQuantities(meals, t, minMealP);
  }
  for (const m of meals) { m.items = m.items.filter((it) => it.qty > 0); m.total = roundMacros(sumItems(m.items)); }
  const total = roundMacros(meals.reduce((a, m) => { for (const k of Object.keys(a)) a[k] += m.total[k]; return a; }, { kcal: 0, p: 0, c: 0, f: 0, fib: 0 }));
  const noVeg = (profile.dislikes || []).includes('vegetables');
  return { targets: t, meals, total, noVeg };
}

export function qtyLabel(q) {
  if (q === 1) return '';
  if (q === 0.5) return 'חצי מנה · ';
  if (q === 1.5) return 'מנה וחצי · ';
  if (q === 2) return 'מנה כפולה · ';
  return `×${q} · `;
}

// ───── יומן אכילה ─────
// daily.foods: [{ id, qty, at }] ; מזונות אישיים: profile.customFoods
export function foodLookup(id, customFoods = []) {
  return FOOD[id] || customFoods.find((f) => f.id === id) || null;
}

export function dayTotals(dd = {}, customFoods = []) {
  const t = { kcal: 0, p: 0, c: 0, f: 0, fib: 0 };
  for (const it of dd.foods || []) {
    const f = foodLookup(it.id, customFoods);
    if (!f) continue;
    t.kcal += f.kcal * it.qty; t.p += f.p * it.qty; t.c += f.c * it.qty; t.f += f.f * it.qty; t.fib += (f.fib || 0) * it.qty;
  }
  t.p += dd.protein || 0; // תוספות חלבון מהירות (+20 ג׳)
  t.kcal += (dd.protein || 0) * 4;
  return roundMacros(t);
}

const norm = (s) => String(s).replace(/[׳״'"\-–—()]/g, '').replace(/\s+/g, ' ').trim();

// חיפוש: התאמה לפי מילים (כל מילה בחיפוש צריכה להופיע בשם), מזון אישי קודם
export function searchFoods(query, customFoods = [], { cat = null, limit = 40 } = {}) {
  const words = norm(query).split(' ').filter(Boolean);
  const pool = [...customFoods, ...FOODS];
  const res = pool.filter((f) => (!cat || f.cat === cat || (cat === 'custom' && f.custom)) && words.every((w) => norm(f.name).includes(w)));
  if (words.length) res.sort((a, b) => (norm(a.name).startsWith(words[0]) ? 0 : 1) - (norm(b.name).startsWith(words[0]) ? 0 : 1));
  return res.slice(0, limit);
}
