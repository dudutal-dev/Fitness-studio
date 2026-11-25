// תיקוני תזונה מהבדיקה המקיפה (25.11.2026)
import test from 'node:test';
import assert from 'node:assert/strict';
import { mealPlan, menuToday, dayTargets, targets, allergyHits, blockedBy, planPool, inDislikeGroup } from '../js/engine/nutrition.js';
import * as program from '../js/engine/program.js';
import { FOODS, FOOD } from '../js/data/foods.js';

const base = { heightCm: 178, age: 30, sex: 'm', weightKg: 80, goal: 'muscle', track: 'gym', days: 4, dislikes: [], dislikedFoods: [], nutrition: true };
const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const sig = (pl) => pl.meals.map((m) => m.id + ':' + m.items.map((i) => i.id + 'x' + i.qty).join(',')).join('|');
const src = (f) => (f.src || []).map((x) => x.name).join(' + ');

test('התפריט של היום: מקור אחד — אותו זרע, אותו יומן ואותן החלפות לכל המסכים', () => {
  const now = new Date(2026, 10, 25, 9, 0), yest = new Date(2026, 10, 24, 9, 0);
  const state = { profile: base, daily: { [key(yest)]: { foods: [{ id: 'tuna_can', qty: 1 }] }, [key(now)]: { foods: [{ id: 'cottage', qty: 1 }] } } };
  const o = menuToday(state, 'home', now);
  assert.equal(o.seed, 25); assert.equal(o.ctx, 'home');
  assert.deepEqual(o.recent, ['tuna_can']);   // היומן של הימים הקודמים, בלי היום עצמו: רישום אוכל היום לא מחליף את התפריט
  const t = dayTargets(base, 'hard');
  assert.equal(sig(mealPlan(base, { ...menuToday(state, 'home', now), t })), sig(mealPlan(base, { ...o, t })));
  // רישום אוכל היום לא משנה את האפשרויות
  state.daily[key(now)].foods.push({ id: 'banana', qty: 1 });
  assert.deepEqual(menuToday(state, 'home', now), o);
  // הזרע נגזר מהתאריך בכל קריאה: אפליקציה שנשארה פתוחה בלילה מקבלת למחרת את התפריט של היום החדש
  assert.equal(menuToday(state, 'home', new Date(2026, 10, 26, 0, 5)).seed, 26);
});

test('"תפריט אחר" נשמר ברשומה של היום, יחד עם ההחלפות שנעשו עליו — ולא עובר ליום הבא', () => {
  const now = new Date(2026, 10, 25, 9, 0), state = { profile: base, daily: { [key(now)]: { shuffle: 2 } } };
  const o = menuToday(state, 'home', now);
  assert.equal(o.seed, 225);
  const t = dayTargets(base, 'hard');
  assert.notEqual(sig(mealPlan(base, { ...o, t })), sig(mealPlan(base, { ...menuToday({ daily: {} }, 'home', now), t })));
  state.daily[key(now)].menu = { seed: 225, ctx: 'home', swaps: { 'lunch|rice': 'potatoes' }, dishes: { dinner: 'x' } };
  assert.deepEqual(menuToday(state, 'home', now).swaps, { 'lunch|rice': 'potatoes' });   // "רענון": אותו מצב שמור ← אותן החלפות
  assert.deepEqual(menuToday(state, 'home', now).dishes, { dinner: 'x' });
  assert.deepEqual(menuToday(state, 'base', now).swaps, {});                               // מקום אחר: בלי ההחלפות
  state.daily[key(now)].shuffle = 3;
  assert.deepEqual(menuToday(state, 'home', now).swaps, {});                               // תפריט אחר: ההחלפות הישנות לא חלות
  assert.equal(menuToday(state, 'home', new Date(2026, 10, 26, 9, 0)).seed, 26);           // למחרת: בלי הערבוב של אתמול
  assert.equal(menuToday({ daily: { [key(now)]: { menu: { seed: 25, ctx: 'home', swaps: { a: 'b' } } } } }, 'home', now).swaps.a, 'b');   // רשומה ישנה, בלי shuffle
});

test('אלרגיה לשומשום: מאכל ששומשום נזכר בשמו או בתיאור המקור מסומן ונחסם', () => {
  const p = { ...base, allergies: ['sesame'] }, ids = blockedBy(p).ids;
  for (const id of ['roll', 'burger_meal', 'schnitzel_sesame', 'pretzels_sesame', 'hotdog_bun', 'burger_fries']) {
    assert.ok(FOOD[id], id); assert.ok(allergyHits(FOOD[id], p).includes('שומשום'), `לא מסומן: ${id}`); assert.ok(ids.has(id), `לא נחסם: ${id}`);
  }
  for (const f of FOODS) if (/שומשום/.test(f.name + ' ' + src(f))) assert.ok(allergyHits(f, p).length, f.id);
  for (const c of ['home', 'base', 'field']) for (const f of planPool(p, c)) assert.ok(!/שומשום/.test(f.name + ' ' + src(f)), `${c}: ${f.id}`);
  for (let sd = 1; sd <= 31; sd++) for (const m of mealPlan(p, { ctx: 'home', seed: sd }).meals) for (const it of m.items) assert.notEqual(it.id, 'roll');
  for (const id of ['bread', 'pita', 'rice', 'chicken_breast']) if (FOOD[id]) assert.equal(allergyHits(FOOD[id], p).length, 0, id);
  assert.equal(allergyHits(FOOD.roll, { allergies: ['eggs'] }).length, 0);   // רק למי שסימן שומשום
});

test('שמני זרעים: גם לפי תיאור המקור — ושמן זית, סויה שאינה שמן ו"ללא שמן" נשארים', () => {
  for (const id of ['whole_bread', 'couscous', 'tomato_sauce', 'fish_patties', 'turkey_breast', 'cabbage_salad', 'majadra', 'liver', 'matbucha', 'pancakes'])
    assert.ok(inDislikeGroup(FOOD[id], 'seed_oils'), `צריך להיחסם: ${id} (${src(FOOD[id])})`);
  for (const id of ['olive_oil', 'tahini', 'raw_tahini', 'almonds', 'walnuts', 'sunflower_seeds', 'avocado', 'peanut_butter', 'egg_omelette', 'israeli_salad', 'ground_beef', 'shakshuka',
    'edamame', 'tofu_plain', 'soy_milk', 'soy_sauce', 'tempeh', 'pasta', 'lentil_soup', 'kebab', 'peanuts', 'hamburger_patty', 'omelette_no_oil', 'rice', 'chicken_breast', 'bread', 'pita'])
    if (FOOD[id]) assert.ok(!inDislikeGroup(FOOD[id], 'seed_oils'), `צריך להישאר: ${id} (${src(FOOD[id])})`);
  // אף מאכל בתפריט של מי שביקש בלי שמני זרעים לא מזכיר במקור שמן זרעים או טיגון (חוץ משמן זית ו"ללא שמן")
  const p = { ...base, dislikes: ['seed_oils'] }, bad = (f) => (f.src || []).some((x) => /שמן (סויה|קנולה|חמניות|תירס)|מרגרינה|מיונז/.test(x.name));
  for (const c of ['home', 'base', 'field']) for (const diet of ['all', 'veg', 'vegan']) for (const f of planPool({ ...p, diet }, c)) assert.ok(!bad(f), `${c}/${diet}: ${f.id} — ${src(f)}`);
  // ועדיין יש ממה לבנות תפריט קרוב ליעד
  for (let sd = 1; sd <= 31; sd++) { const pl = mealPlan(p, { ctx: 'home', seed: sd }); assert.ok(!pl.short && !pl.over, `seed ${sd}`); assert.ok(pl.meals.every((m) => m.items.length), `seed ${sd}`); }
});

test('אוכל מעובד: קציצות עוף תעשייתיות וצ׳יפס קפוא בקבוצה; שימורי טונה, תירס ושעועית נשארים', () => {
  for (const id of ['chicken_meatballs', 'baked_fries']) assert.ok(inDislikeGroup(FOOD[id], 'processed'), id);
  for (const id of ['tuna_can', 'tuna_oil', 'corn_canned', 'beans_tomato_canned', 'chicken_breast', 'edamame', 'bulgur']) if (FOOD[id]) assert.ok(!inDislikeGroup(FOOD[id], 'processed'), id);
});

test('תפריט שיוצא מעל יעד הקלוריות מסומן (over), לא רק תפריט שחסר בו', () => {
  const p = { ...base, sex: 'f', weightKg: 62, heightCm: 165, goal: 'cut', days: 3, diet: 'veg', kosher: true, dislikes: ['wheat', 'processed', 'sugar', 'seed_oils'] };
  let over = 0;
  for (let sd = 1; sd <= 31; sd++) for (const type of ['hard', 'rest']) {
    const t = dayTargets(p, type), pl = mealPlan(p, { ctx: 'home', seed: sd, t });
    assert.equal(pl.over, pl.total.kcal > t.kcal * 1.1); assert.equal(pl.lowP, pl.total.p < t.protein * 0.85);
    assert.equal(pl.short, pl.lowP || pl.total.kcal < t.kcal * 0.9);
    if (pl.over) over++;
  }
  assert.ok(over > 0, 'בפרופיל המוגבל הזה יש ימים מעל היעד, והם צריכים להיות מסומנים');
  for (let sd = 1; sd <= 31; sd++) assert.equal(mealPlan(base, { ctx: 'home', seed: sd }).over, false);   // פרופיל רגיל: בלי הערה
});

test('משקל המנה לא מודפס פעמיים', () => {
  const twice = FOODS.filter((f) => /(\d+) ג׳ · \1 ג׳/.test(f.portion));
  assert.deepEqual(twice.map((f) => f.id), []);
  assert.equal(FOOD.oatmeal_milk.portion, '250 ג׳');
});

test('מעבר מסלול הלוך וחזור מחזיר את המטרה הקודמת (MOVA)', { skip: !program.goalOnSwitch || !program.goalsFor('med')?.includes('zen') }, () => {
  const { goalOnSwitch } = program, sw = (q, track) => { q.goal = goalOnSwitch(q, track); q.track = track; return q; };
  const f = { sex: 'f', weightKg: 62, heightCm: 165, age: 30, days: 3, track: 'gym', goal: 'cut' };
  const before = targets(f).kcal;
  const q = { ...f }; sw(q, 'med'); assert.equal(q.goal, 'zen'); sw(q, 'gym');
  assert.equal(q.goal, 'cut'); assert.equal(targets(q).kcal, before); assert.equal(q.goalBack, undefined);
  for (const [goal, via] of [['muscle', ['med']], ['muscle', ['yoga']], ['strength', ['run']], ['muscle', ['med', 'yoga']], ['muscle', ['yoga', 'run', 'walk']], ['cut', ['med', 'tai']]]) {
    const x = { ...f, goal }; for (const tr of via) sw(x, tr); sw(x, 'gym');
    assert.equal(x.goal, goal, `${goal} דרך ${via.join(' ← ')}`);
  }
  // "חיטוב" קיים ביוגה: אחרי מדיטציה ← יוגה הוא חוזר כבר שם
  const y = { ...f }; sw(y, 'med'); sw(y, 'yoga'); assert.equal(y.goal, 'cut');
  // מי שבחר בינתיים מטרה אחרת בעצמו — הבחירה שלו קובעת, והמטרה הישנה לא חוזרת
  const z = { ...f, goal: 'muscle' }; sw(z, 'yoga'); z.goal = 'flex'; sw(z, 'gym'); assert.equal(z.goal, 'combat');
  // מטרה שקיימת בשני המסלולים לא משתנה
  const c = { ...f, goal: 'cut' }; sw(c, 'yoga'); sw(c, 'run'); sw(c, 'gym'); assert.equal(c.goal, 'cut'); assert.equal(c.goalBack, undefined);
});
