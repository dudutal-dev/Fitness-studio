// מנוע תזונה: יעדים קלוריים ומאקרו, ובניית תפריט יומי שמכבד את מה שהמשתמש לא אוכל.
import { FOODS, FOOD } from '../data/foods.js';
import { hasSchedule, plannedToday, closedDays, toMin, fromMin } from './schedule.js';
import { DISHES, DISH } from '../data/dishes.js';

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
// עומס שבועי: לא כל אימון שווה. שיעור יוגה, פילאטיס או מוביליטי עולה הרבה פחות אנרגיה מאימון כוח, ריצה או HIIT
// (Compendium of Physical Activities: יוגה ~2.5 MET, פילאטיס ~3, מתיחות ~2.3, מול 3.5–8 באימון כוח ו-HIIT).
// המשקלים עצמם הם בחירה תכנונית. כך שבוע של "חדר כושר + יוגה" מקבל יעד אחר משבוע של חמישה אימוני כוח.
const LOAD_W = { yoga: 0.5, pil: 0.6, mob: 0.35, tai: 0.35, walk: 0.5 };
export function weeklyLoad(profile) {
  const days = Math.min(6, Math.max(1, profile.days || 4));
  const extras = Object.entries(profile.extras || {}).filter(([t, n]) => n > 0 && t !== profile.track);
  const exN = Math.min(days - 1, extras.reduce((a, [, n]) => a + n, 0));
  const mobN = profile.track === 'mob' || !profile.mob ? 0 : Math.min(profile.mobN || 0, Math.max(0, days - exN - 1));
  const main = Math.max(0, days - exN - mobN);
  return main * (LOAD_W[profile.track] ?? 1) + extras.reduce((a, [t, n]) => a + n * (LOAD_W[t] ?? 1), 0) * (exN ? exN / extras.reduce((a, [, n]) => a + n, 0) : 1) + mobN * LOAD_W.mob;
}
export function activityKey(profile) {
  if (ACTIVITY[profile.activityLevel]) return profile.activityLevel;
  const L = weeklyLoad(profile);
  return L < 2.5 ? 'light' : L <= 5.2 ? 'base' : 'training';
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

// ───── שערי בטיחות ─────
// למי שהיעד האוטומטי עלול להזיק לו אין גירעון קלורי: היריון, הנקה, מתחת לגיל 18, תת־משקל (BMI < 18.5), או מצב רפואי שמושפע מתזונה.
// במצבים האלה היעד הוא תחזוקה, והמסך מפנה לאיש מקצוע (IOM — צרכים בהיריון ובהנקה; IOC 2018 — RED-S; ראו docs/NUTRITION_SOURCES.md).
// profile.health: מה שסומן בשאלון התזונה. היריון שסומן בשאלון הבטיחות של השיעורים (יוגה / פילאטיס / מוביליטי) נספר גם כאן.
export const HEALTH = { preg: 'היריון', nurse: 'הנקה', med: 'סוכרת, מחלת כליות או מחלה כרונית אחרת' };
export function nutritionGuard(profile = {}) {
  const hM = (profile.heightCm || 175) / 100, bmi = (profile.weightKg || 70) / (hM * hM);
  const h = new Set(profile.health || []);
  if ([...(profile.yogaFlags || []), ...(profile.taiFlags || []), ...(profile.pilFlags || []), ...(profile.mob?.flags || [])].includes('preg')) h.add('preg');
  const reasons = ['preg', 'nurse', 'med'].filter((k) => h.has(k));
  if ((profile.age || 20) < 18) reasons.push('minor');
  if (bmi < 18.5) reasons.push('under');
  return { noDeficit: reasons.length > 0, reasons };
}

export function targets(profile) {
  const w = profile.weightKg || 70;
  const hM = (profile.heightCm || 175) / 100;
  const act = ACTIVITY[activityKey(profile)];
  const rest = bmr({ weightKg: w, heightCm: profile.heightCm || 175, age: profile.age || 20, sex: profile.sex });
  const tdee = rest * act.factor;
  const guard = nutritionGuard(profile);
  const rawDelta = goalDelta(profile.goal, w, tdee, profile.track);
  const delta = guard.noDeficit ? Math.max(0, rawDelta) : rawDelta;
  // כיול אישי לפי מגמת המשקל בפועל (ראו trendAdvice) — המשוואות הן הערכה; המשקל הוא המדידה.
  const adjust = Math.max(guard.noDeficit ? 0 : -KCAL_ADJ_MAX, Math.min(KCAL_ADJ_MAX, profile.kcalAdjust || 0));
  // רצפה: לא יורדים מתחת לקצב חילוף החומרים במנוחה.
  const kcal = Math.round(Math.max(rest, tdee + delta + adjust) / 10) * 10;
  // חלבון: ISSN (Jäger 2017) — 1.4–2.0 ג׳/ק״ג למתאמנים; Morton 2018 — התועלת לשריר מתייצבת סביב 1.6 (גבול עליון 2.2).
  // בגירעון יותר (Helms 2014: 2.3–3.1 ג׳ לק״ג מסה רזה ≈ 2.2 לק״ג משקל גוף). בעודף משקל מחשבים לפי משקל ב-BMI 30,
  // אחרת היעד מתנפח לפי רקמת שומן שלא צריכה חלבון.
  const refW = Math.min(w, 30 * hM * hM);
  // מוביליטי בלבד (בלי אימוני כוח): 1.4 ג׳/ק״ג — הקצה התחתון של טווח ה-ISSN לאנשים פעילים; בגירעון 1.8
  // עם שיעורים נוספים (profile.extras) קובע התחום התובעני ביותר בשבוע: כוח > ריצה / HIIT / פילאטיס > יוגה / מוביליטי
  const tracks = [profile.track, ...Object.keys(profile.extras || {}).filter((k) => profile.extras[k] > 0)];
  const mobOnly = tracks.every((x) => x === 'mob' || x === 'yoga' || x === 'tai'); // גם יוגה: בלי אימוני כוח
  // ריצה בלבד: 1.6 ג׳/ק״ג (ISSN לספורט סבולת: 1.4–1.8), ובגירעון 2.0
  const runOnly = !mobOnly && tracks.every((x) => ['run', 'pil', 'hiit', 'mob', 'yoga', 'tai', 'walk'].includes(x)); // גם HIIT ופילאטיס: בלי משקולות
  const perKg0 = mobOnly ? (profile.goal === 'cut' ? 1.8 : 1.4) : runOnly ? (profile.goal === 'cut' ? 2.0 : 1.6) : profile.goal === 'cut' ? 2.2 : 2.0;
  // מצב רפואי: חלבון מתון (עומס חלבון גבוה אינו מתאים למחלת כליות); מתחת לגיל 18: עד 1.6 ג׳/ק״ג
  const perKg = guard.reasons.includes('med') ? Math.min(perKg0, 1.2) : guard.reasons.includes('minor') ? Math.min(perKg0, 1.6) : perKg0;
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
  return { kcal, protein, fat, carbs, fiber, waterL, tdee: Math.round(tdee), bmr: Math.round(rest), delta, adjust, activity: act, perKg, refW: Math.round(refW), guard };
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
  const [lo, hi] = (nutritionGuard(profile).noDeficit && profile.goal === 'cut' ? null : RATE[profile.goal]) || [-0.25, 0.25];
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

// ליווי התזונה הוא בחירה של המתאמן (profile.nutrition === false — כבוי). פרופילים ישנים, בלי השדה: פעיל.
export const wantsNutrition = (profile) => profile?.nutrition !== false;
// "בשירות" (profile.eatAt === 'service'): מי שאוכל רוב השבוע בחדר אוכל ובשטח. התפריט נבנה ממה שיש שם (ctx: base / field),
// הלשוניות נקראות "חדר אוכל · בשטח · בבית", וברירת המחדל היא חדר האוכל. ב-MOVA מוצע במסלול חדר הכושר (וגם כשהוא תחום נוסף).
export const canService = (o) => ['gym', 'mix'].includes(o?.track) || !!o?.extras?.gym;
export const inService = (o) => o?.eatAt === 'service' && canService(o);
// רמות הפעילות כפי שהן מוצגות: בשירות הרמה הגבוהה נקראת "שטח", כמו בחוד
export const activityFor = (o) => (inService(o) ? { ...ACTIVITY, field: { ...ACTIVITY.field, name: 'שטח', full: 'שבוע שטח / אימון כפול', desc: 'מסעות, שטח, אימון כפול' } } : ACTIVITY);
export const mainCtx = (o) => (inService(o) ? 'base' : 'home');
export const ctxList = (o) => (inService(o) ? [['base', 'חדר אוכל'], ['field', 'בשטח'], ['home', 'בבית']] : [['home', 'בבית'], ['base', 'בעבודה'], ['field', 'בדרכים']]);
// השאלון הקצר: סוג תזונה, כשרות, מספר ארוחות, אלרגיות. הסינון לפי התגיות שבמאגר (ועוד כמה מאכלים בשמם).
export const DIETS = { all: 'הכול', veg: 'צמחוני', vegan: 'טבעוני' };
export const ALLERGIES = { gluten: 'גלוטן', lactose: 'חלב / לקטוז', eggs: 'ביצים', peanut: 'בוטנים', nuts: 'אגוזים', sesame: 'שומשום', fish: 'דגים', soy: 'סויה' };
const MEAT = ['chicken', 'red_meat'], FISH = ['fish', 'tuna'], MILK = ['dairy', 'cottage'];
const DIET_TAGS = { veg: [...MEAT, ...FISH], vegan: [...MEAT, ...FISH, ...MILK, 'eggs'] };
const DIET_IDS = { vegan: ['honey'] };
const ALLERGY_TAGS = { gluten: ['bread', 'pasta', 'oats'], lactose: MILK, eggs: ['eggs'], peanut: ['peanut'], nuts: ['nuts'], sesame: ['tahini', 'hummus'], fish: FISH, soy: [] };
const ALLERGY_IDS = {
  gluten: ['couscous', 'bulgur', 'schnitzel', 'pancakes', 'cornflakes', 'fish_patties', 'chicken_meatballs', 'beef_meatballs', 'kebab', 'falafel', 'cookies', 'wafers', 'bissli', 'granola_bar'],
  soy: ['tofu', 'tofu_plain', 'edamame', 'veg_schnitzel', 'veg_burger', 'veg_kebab', 'veg_ground', 'soy_milk', 'soy_flakes', 'tempeh', 'soy_protein'], sesame: ['halva'],
};
ALLERGY_IDS.gluten.push('veg_schnitzel', 'veg_burger', 'veg_kebab', 'veg_ground');
// מקורות חלבון מן הצומח מהמאגר המורחב: נכנסים לתפריט רק בתזונה צמחונית או טבעונית (אחרת אין מספיק חלבון לבחור ממנו)
const PLANT_PLAN = new Set(['veg_schnitzel', 'veg_burger', 'veg_kebab', 'veg_ground', 'soy_flakes', 'tempeh', 'soy_milk', 'pea_protein', 'soy_protein',
  'black_beans', 'red_beans', 'lentils_onion', 'ful', 'lupin', 'roasted_chickpeas', 'beans_tomato_canned']);
// מה שנשמר בלי קירור ובלי מטבח — זמין בתזונה מן הצומח גם בדרכים
const PLANT_ANYWHERE = new Set(['pea_protein', 'soy_protein', 'soy_milk', 'roasted_chickpeas', 'beans_tomato_canned']);
export function blockedBy(profile = {}) {
  const tags = new Set(DIET_TAGS[profile.diet] || []), ids = new Set(DIET_IDS[profile.diet] || []);
  for (const a of profile.allergies || []) { for (const t of ALLERGY_TAGS[a] || []) tags.add(t); for (const id of ALLERGY_IDS[a] || []) ids.add(id); }
  return { tags, ids };
}
export function planAllowed(food, profile = {}, blk = blockedBy(profile)) {
  return allowed(food, profile.dislikes, profile.dislikedFoods) && !blk.ids.has(food.id) && !food.tags.some((t) => blk.tags.has(t));
}
// אלרגיות שהמאכל נוגע בהן (לפי התגיות והמזהים שבמאגר) — לסימון בחיפוש וביומן
export function allergyHits(food, profile = {}) {
  const tags = food?.tags || [];
  return (profile.allergies || []).filter((a) => (ALLERGY_TAGS[a] || []).some((t) => tags.includes(t)) || (ALLERGY_IDS[a] || []).includes(food?.id)).map((a) => ALLERGIES[a]);
}
const isMeat = (f) => f.tags.some((t) => MEAT.includes(t));
const isDairy = (f) => f.tags.some((t) => MILK.includes(t));

// ארוחות: כל משבצת מתמלאת רק במאכלים שמתאימים לארוחה (שדה meals במאגר) — לא עוף או בשר בבוקר.
// share = חלק מהקלוריות; pShare = חלק מהחלבון — מפוזר שווה יותר, כדי שכל ארוחה תגיע ל-20–40 ג׳ (ISSN: 0.25–0.4 ג׳/ק״ג לארוחה).
const MEALS = [
  { id: 'breakfast', code: 'b', name: 'ארוחת בוקר', icon: 'sunrise', share: 0.25, pShare: 0.22, slots: [['protein', 'dairy'], ['carb'], ['veg', 'fruit']] },
  { id: 'snack1', code: 's', name: 'ביניים', icon: 'apple', share: 0.1, pShare: 0.12, slots: [['dairy', 'protein'], ['fruit', 'fat']] },
  { id: 'lunch', code: 'l', name: 'צהריים', icon: 'plate', share: 0.3, pShare: 0.26, slots: [['protein'], ['carb'], ['veg'], ['fat']] },
  { id: 'post', code: 'p', name: 'אחרי אימון', icon: 'dumbbell', share: 0.12, pShare: 0.18, slots: [['protein', 'dairy'], ['fruit', 'carb']] },
  { id: 'dinner', code: 'd', name: 'ערב', icon: 'moon', share: 0.23, pShare: 0.22, slots: [['protein', 'dairy'], ['carb'], ['veg']] },
];
// מספר הארוחות לפי בחירת המתאמן (3 / 4 / 5); החלקים מנורמלים כך שיסתכמו ליום שלם
const MEAL_SETS = { 3: ['breakfast', 'lunch', 'dinner'], 4: ['breakfast', 'lunch', 'post', 'dinner'] };
export function mealsFor(profile) {
  const ids = MEAL_SETS[profile?.mealsN];
  if (!ids) return MEALS;
  const use = MEALS.filter((m) => ids.includes(m.id)), ks = use.reduce((a, m) => a + m.share, 0), ps = use.reduce((a, m) => a + m.pShare, 0);
  return use.map((m) => ({ ...m, share: m.share / ks, pShare: m.pShare / ps }));
}
// סדר הארוחות לפי שעת האימון של היום (בקשת בעל המוצר, 21.11.2026). w: { start: דקות מחצות, mins: אורך האימון } — "אחרי אימון" זזה
// לחצי שעה אחרי סוף האימון, והארוחות מסודרות לפי השעה; w === 'rest' — יום בלי אימון, והיא הופכת לארוחת ביניים; null — בלי שינוי.
const MEAL_AT = { breakfast: 450, snack1: 630, lunch: 810, post: 990, dinner: 1200 };
export function orderMeals(plan, w) {
  if (!w) return plan;
  const at = (m) => (m.id === 'post' && w !== 'rest' ? Math.min(1410, w.start + w.mins + 30) : MEAL_AT[m.id] ?? 720);
  plan.meals = plan.meals.map((m, i) => ({ ...m, at: at(m), i0: i, ...(m.id === 'post' ? (w === 'rest' ? { name: 'ביניים', icon: 'apple' } : { hint: fromMin(at(m)) }) : {}) })).sort((a, b) => a.at - b.at || a.i0 - b.i0);
  return plan;
}
// מה לסדר לפיו היום: האימון שביומן להיום (שעה ואורך), 'rest' ביום בלי אימון, או null כשלא נקבעו ימים או שכבר התאמנו
export function mealWindow(state, now = new Date()) {
  const st = state.reminders?.settings;
  if (!state.plan || !hasSchedule(st)) return null;
  const done = [...(state.sessions || []), ...(state.runs || [])].find((x) => new Date(x.date).toDateString() === now.toDateString());
  if (done) { const d = new Date(done.date); return { start: Math.max(0, d.getHours() * 60 + d.getMinutes() - 30), mins: 0, done: true }; }   // אחרי אימון שבוצע: "אחרי אימון" צמודה לשעה שבה הסתיים
  const pt = plannedToday(state.plan, st, now);
  return pt ? { start: toMin(pt.time), mins: pt.session.minutes || 60, time: pt.time } : 'rest';
}

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
    // מנה אמיתית נשארת מנה: המרכיבים שלה גדלים וקטנים יחד, בערך באותו יחס (לא חצי פלאפל עם שתיים וחצי פיתות)
    const dishIt = m.items.filter((it) => it.base);
    if (dishIt.length > 1) { const rs = dishIt.map((it) => it.qty / it.base), avg = rs.reduce((a, b) => a + b, 0) / rs.length; cost += 0.05 * rs.reduce((a, x) => a + (x - avg) ** 2, 0) / rs.length; }
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
      const cat = FOOD[it.id].cat, lo = it.base ? 0.5 : QMIN[cat] ?? 0.5, hi = QCAP[cat] || 2, q0 = it.qty;   // מרכיב של מנה לא יורד לאפס
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
// המאכלים שמותר לבנות מהם תפריט למתאמן הזה, במקום הזה (בית / עבודה / דרכים): בלי מה שהוא לא אוכל, בלי מה שחסום בתזונה או באלרגיה
export function planPool(profile, ctx = 'base') {
  const blk = blockedBy(profile), plant = profile.diet === 'veg' || profile.diet === 'vegan';
  return FOODS.filter((f) => planAllowed(f, profile, blk) && (f.ctx.includes(ctx) || (plant && PLANT_ANYWHERE.has(f.id))) && f.cat !== 'meal' && (f.plan !== false || (plant && PLANT_PLAN.has(f.id))) && !NOT_IN_PLAN.has(f.id));
}
const mixesMeatMilk = (ids) => ids.some((id) => isMeat(FOOD[id])) && ids.some((id) => isDairy(FOOD[id]));
// מנה מתאימה לארוחה כשכל המרכיבים שלה מותרים וזמינים, ובכשרות — בלי בשר וחלב יחד
const dishFits = (d, code, ids, kosher) => d.meals.includes(code) && d.items.every(([id]) => ids.has(id)) && !(kosher && mixesMeatMilk(d.items.map(([id]) => id)));

// בניית תפריט יומי. swaps: החלפות של פריט בודד ({ 'מזהה ארוחה|מזהה מאכל': מאכל חדש }); dishes: מנה שנבחרה ידנית לארוחה ({ מזהה ארוחה: מזהה מנה })
export function mealPlan(profile, { ctx = 'base', seed = 1, t: dayT = null, recent = [], swaps = {}, dishes = {} } = {}) {
  const t = dayT || targets(profile);   // dayT: יעדי היום (dayTargets) — כשהתפריט נבנה ליום מסוים
  const rnd = seeded(seed);
  const pool = planPool(profile, ctx), poolIds = new Set(pool.map((f) => f.id));
  const usedToday = new Set();
  // מה שסומן כמועדף, או נרשם ביומן לאחרונה, מקבל עדיפות בהגרלה (פי 3 / פי 2)
  const fav = new Set(profile.favFoods || []), seen = new Set(recent);
  const pick = (opts) => {
    const w = opts.map((f) => (fav.has(f.id) ? 3 : seen.has(f.id) ? 2 : 1));
    let r = rnd() * w.reduce((a, b) => a + b, 0), i = 0;
    while (i < opts.length - 1 && (r -= w[i]) >= 0) i++;
    usedToday.add(opts[i].id); return { id: opts[i].id, qty: 1 };
  };
  // כשרות (profile.kosher): באותה ארוחה אין בשר עם חלב
  const fits = (items, f) => !profile.kosher || !(isMeat(f) ? items.some((it) => isDairy(FOOD[it.id])) : isDairy(f) && items.some((it) => isMeat(FOOD[it.id])));
  // מנה אמיתית לכל ארוחה (data/dishes.js): מה שנבחר ידנית, אחרת הגרלה מבין המנות שמתאימות — בלי לחזור על אותו מקור חלבון באותו יום.
  // כשאין מנה מתאימה (הגבלות רבות, או מקום בלי מטבח) הארוחה מורכבת ממאכלים בודדים, כמו קודם.
  const usedDish = new Set();
  const pickDish = (m) => {
    const forced = DISH[dishes[m.id]];
    if (forced && dishFits(forced, m.code, poolIds, profile.kosher)) { usedDish.add(forced.id); return forced; }
    let opts = DISHES.filter((d) => dishFits(d, m.code, poolIds, profile.kosher) && !usedDish.has(d.id) && !d.items.some(([id]) => usedToday.has(id) && ['protein', 'dairy'].includes(FOOD[id].cat)));
    if (!opts.length) return null;
    // מי שצריך הרבה חלבון (ירידה במשקל, משקל גוף גבוה) מקבל מנות עשירות בחלבון: מסננים לפי צפיפות החלבון שהארוחה דורשת
    const dens = (d) => { const x = d.items.reduce((a, [id, q]) => { a.p += FOOD[id].p * q; a.k += FOOD[id].kcal * q; return a; }, { p: 0, k: 1 }); return x.p / x.k; };
    const need = (t.protein * m.pShare) / (t.kcal * m.share);
    const rich = opts.filter((d) => dens(d) >= need * 0.8);
    if (rich.length >= 2) opts = rich; else if (opts.length > 3) opts = [...opts].sort((a, b) => dens(b) - dens(a)).slice(0, 3);
    const w = opts.map((d) => Math.max(...d.items.map(([id]) => (fav.has(id) ? 3 : seen.has(id) ? 2 : 1))));
    let r = rnd() * w.reduce((a, b) => a + b, 0), i = 0;
    while (i < opts.length - 1 && (r -= w[i]) >= 0) i++;
    usedDish.add(opts[i].id); return opts[i];
  };
  const meals = mealsFor(profile).map((m) => {
    const items = [];
    const dish = pickDish(m);
    if (dish) for (const [id, qty] of dish.items) { items.push({ id, qty, base: qty }); usedToday.add(id); }
    else for (const cats of m.slots) {
      let opts = pool.filter((f) => cats.includes(f.cat) && f.meals.includes(m.code) && !usedToday.has(f.id) && fits(items, f));
      // לא אוכל ירקות? המשבצת מקבלת פרי או שומן בריא במקום להישאר ריקה
      if (!opts.length && cats.includes('veg')) opts = pool.filter((f) => ['fruit', 'fat'].includes(f.cat) && f.meals.includes(m.code) && !usedToday.has(f.id));
      if (opts.length) items.push(pick(opts));
    }
    // החלפת פריט בודד: המאכל החדש נכנס במקום הישן (אם הוא עדיין מותר ומתאים לארוחה), והכמויות מותאמות מחדש
    let swapped = false;
    for (const it of items) {
      const to = swaps[`${m.id}|${it.id}`];
      if (to && poolIds.has(to) && !items.some((x) => x.id === to) && fits(items.filter((x) => x !== it), FOOD[to])) { it.from = it.id; it.id = to; swapped = true; usedToday.add(to); }
    }
    return { ...m, items, ...(dish && !swapped ? { dish: { id: dish.id, name: dish.name } } : {}) };
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
      const opts = pool.filter((f) => cats.includes(f.cat) && f.meals.includes(m.code) && !usedToday.has(f.id) && fits(m.items, f));
      if (!opts.length) continue;
      m.items.push({ ...pick(opts), extra: true }); added = true; break;   // תוספת מעבר למנה — מוצגת בנפרד
    }
    if (!added) break;
    fitQuantities(meals, t, minMealP);
  }
  for (const m of meals) { m.items = m.items.filter((it) => it.qty > 0); m.total = roundMacros(sumItems(m.items)); }
  const total = roundMacros(meals.reduce((a, m) => { for (const k of Object.keys(a)) a[k] += m.total[k]; return a; }, { kcal: 0, p: 0, c: 0, f: 0, fib: 0 }));
  const noVeg = (profile.dislikes || []).includes('vegetables');
  // short: התפריט רחוק מהיעד (מעט מדי מאכלים מתאימים) — המסך מציג על זה הערה
  return { targets: t, meals, total, noVeg, short: total.p < t.protein * 0.85 || total.kcal < t.kcal * 0.9 };
}

// חלופות לפריט בתפריט: עד שלושה מאכלים מאותו סוג שמתאימים לארוחה, קרובים בקלוריות ובחלבון
export function swapOptions(profile, plan, mealIdx, foodId, { ctx = 'base' } = {}) {
  const m = plan.meals[mealIdx], cur = FOOD[foodId];
  if (!m || !cur) return [];
  const rest = m.items.filter((x) => x.id !== foodId).map((x) => FOOD[x.id]);
  const inPlan = new Set(plan.meals.flatMap((x) => x.items.map((it) => it.id)));
  const okKosher = (f) => !profile.kosher || !(isMeat(f) ? rest.some(isDairy) : isDairy(f) && rest.some(isMeat));
  const dist = (f) => Math.abs(f.kcal - cur.kcal) / Math.max(60, cur.kcal) + Math.abs(f.p - cur.p) / Math.max(6, cur.p);
  return planPool(profile, ctx).filter((f) => f.cat === cur.cat && f.id !== foodId && !inPlan.has(f.id) && f.meals.includes(m.code) && okKosher(f))
    .sort((a, b) => dist(a) - dist(b)).slice(0, 3);
}
// מנות אחרות לאותה ארוחה: עד שלוש, מבין אלה שמתאימות למתאמן ולמקום
export function dishOptions(profile, plan, mealIdx, { ctx = 'base' } = {}) {
  const m = plan.meals[mealIdx];
  if (!m) return [];
  const ids = new Set(planPool(profile, ctx).map((f) => f.id)), used = new Set(plan.meals.map((x) => x.dish?.id).filter(Boolean));
  const others = new Set(plan.meals.filter((x) => x !== m).flatMap((x) => x.items.map((it) => it.id)).filter((id) => ['protein', 'dairy'].includes(FOOD[id].cat)));
  const list = DISHES.filter((d) => dishFits(d, m.code, ids, profile.kosher) && !used.has(d.id));
  const fresh = list.filter((d) => !d.items.some(([id]) => others.has(id)));
  const rot = (plan.meals.reduce((a, x) => a + x.items.length, 0) + mealIdx) % Math.max(1, fresh.length || list.length);
  const src = fresh.length >= 3 ? fresh : list;
  return [...src.slice(rot), ...src.slice(0, rot)].slice(0, 3);
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

// ───── תזונה לפי היום ─────
// צריכת הפחמימה אמורה לעקוב אחרי עומס האימון של אותו יום (Burke 2011; עמדת ACSM / AND / DC 2016), והחלבון נשאר קבוע.
// כאן זה מיושם כהזזה קטנה של יעד הקלוריות דרך הפחמימה: יותר ביום ארוך או קשה, פחות ביום מנוחה — כך שהממוצע השבועי כמעט לא משתנה.
// גודל ההזזה (‎+15% / ‎+5% / 0 / ‎−5%) הוא החלטת תכנון, לא ממצא מחקרי. ראו docs/NUTRITION_SOURCES.md.
export const DAY_TYPES = {
  long: { name: 'יום ריצה ארוכה', f: 0.15 },
  hard: { name: 'יום אימון קשה', f: 0.05 },
  light: { name: 'יום אימון קל', f: 0 },
  rest: { name: 'יום מנוחה', f: -0.05 },
};
const LOAD_RANK = { rest: 0, light: 1, hard: 2, long: 3 };
// עומס של אימון או ריצה — מתוכננים (מהתוכנית השבועית) או שמורים (מההיסטוריה)
export function loadOf(x) {
  if (!x) return 'rest';
  const run = x.runOnly ? x.run : x.segs || (x.type && !x.items && !x.exercises) ? x : null;
  if (run) {
    const sec = run.totalSec || run.durationSec || 0;
    if (run.type === 'long' || sec >= 3600) return 'long';
    return ['intervals', 'tempo', 'test'].includes(run.type) ? 'hard' : 'light';
  }
  if (x.track === 'mob' || x.track === 'pil' || x.track === 'yoga' || x.track === 'tai' || x.track === 'walk' || x.easy) return 'light';
  return 'hard';
}
// איזה יום היום: לפי מה שכבר בוצע היום; אחרת לפי האימון הבא בתוכנית — אלא אם המתאמן סימן "מנוחה" (manual === 'rest')
export function dayType(state, now = Date.now(), manual = null) {
  const same = (d) => new Date(d).toDateString() === new Date(now).toDateString();
  const done = [...(state.sessions || []), ...(state.runs || [])].filter((x) => same(x.date));
  if (done.length) {
    const top = done.map((x) => ({ x, type: loadOf(x) })).sort((a, b) => LOAD_RANK[b.type] - LOAD_RANK[a.type])[0];
    return { type: top.type, name: top.x.name || '', done: true };
  }
  if (manual === 'rest') return { type: 'rest', manual: true };
  // קבעו ימי אימון: היום נחשב יום אימון רק אם יש בו אימון ביומן (כולל אימון שהוזז להיום); אחרת — מנוחה
  const st = state.reminders?.settings;
  if (state.plan && hasSchedule(st)) {
    const pt = plannedToday(state.plan, st, new Date(now));
    return pt ? { type: loadOf(pt.session), name: pt.session.name, planned: true, time: pt.time } : { type: 'rest', sched: true };
  }
  const doneDays = closedDays(state.plan);
  const next = (state.plan?.week?.sessions || []).find((x) => !doneDays.has(x.day));
  return next ? { type: loadOf(next), name: next.name, planned: true } : { type: 'rest' };
}
export function dayTargets(profile, type = 'light') {
  const b = targets(profile);
  const f0 = DAY_TYPES[type]?.f || 0, f = f0 < 0 && b.guard.noDeficit ? 0 : f0;   // בלי "יום מנוחה מינוס 5%" למי שאין לו גירעון
  const kcal = f ? Math.round(Math.max(b.bmr, b.kcal * (1 + f)) / 10) * 10 : b.kcal;
  const carbs = f ? Math.max(0, Math.round((kcal - b.protein * 4 - b.fat * 9) / 4)) : b.carbs;
  return { ...b, kcal, carbs, fiber: Math.round((kcal / 1000) * 14), dayType: type, baseKcal: b.kcal, baseCarbs: b.carbs, dayDelta: kcal - b.kcal };
}
// מה לאכול סביב האימון של היום. הכמויות לפי משקל הגוף:
//  לפני: 1–4 ג׳ פחמימה לק״ג, 1–4 שעות לפני (ACSM / AND / DC 2016) — כאן 1 ג׳/ק״ג, ו-1.5 לפני ריצה ארוכה.
//  במהלך: 30–60 ג׳ פחמימה לשעה במאמץ של יותר משעה (אותה עמדה). אחרי: 0.25–0.3 ג׳ חלבון לק״ג, 20–40 ג׳ (ISSN, Jäger 2017).
export function fuelTips(profile, type) {
  const w = profile.weightKg || 70;
  const r5 = (v) => Math.round(v / 5) * 5;
  const prot = Math.min(40, Math.max(20, r5(w * 0.3)));
  if (type === 'long') return {
    before: `2–3 שעות לפני: ארוחה עם כ-${r5(w * 1.5)} ג׳ פחמימה (אורז, פסטה או לחם), מעט שומן וסיבים, וכוס־שתיים מים.`,
    during: 'אחרי השעה הראשונה: 30–60 ג׳ פחמימה לשעה (תמרים, בננה או ג׳ל), ולגימות מים קבועות.',
    after: `בתוך שעתיים: ${prot} ג׳ חלבון וכ-${r5(w)} ג׳ פחמימה, והרבה שתייה.`,
  };
  if (type === 'hard') return {
    before: `שעה־שעתיים לפני: כ-${r5(w)} ג׳ פחמימה ומעט חלבון (יוגורט עם פרי, או כריך).`,
    during: 'מים. באימון של עד שעה אין צורך באוכל.',
    after: `בתוך שעתיים: ארוחה עם ${prot} ג׳ חלבון.`,
  };
  if (type === 'light') return {
    before: 'לא צריך ארוחה מיוחדת. עדיף לא על בטן מלאה — כשעה אחרי ארוחה.',
    during: 'מים.',
    after: `ארוחה רגילה, עם ${prot} ג׳ חלבון.`,
  };
  return { rest: `פחות פחמימה מביום אימון, ואותו חלבון. ביום הזה הגוף מתאושש ונבנה — לא מדלגים על ארוחות, ו-${prot} ג׳ חלבון בכל אחת.` };
}
