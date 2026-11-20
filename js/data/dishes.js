// מנות אמיתיות לתפריט: כל מנה היא שם מוכר והרכב של מאכלים מהמאגר (js/data/foods.js), עם כמות התחלתית במנות.
// המנוע (engine/nutrition.js → mealPlan) בוחר מנה לכל ארוחה, ואז מתאים את הכמויות ליעדי היום.
// meals: b=בוקר s=ביניים l=צהריים p=אחרי אימון d=ערב. איפה המנה זמינה (בבית / בעבודה / בדרכים) נגזר מהמרכיבים שלה,
// וכך גם ההתאמה לסוג התזונה, לכשרות ולאלרגיות — מנה נכנסת רק אם כל המרכיבים שלה מותרים למתאמן.
// הקובץ זהה בשלוש האפליקציות.
const D = (id, name, meals, items) => ({ id, name, meals: meals.split(''), items });

export const DISHES = [
  // ───── בוקר ─────
  D('b_shakshuka', 'שקשוקה עם לחם מלא וסלט ירקות', 'b', [['shakshuka', 1], ['whole_bread', 1], ['israeli_salad', 1]]),
  D('b_omelette', 'חביתה עם לחם מלא, קוטג׳ ומלפפון', 'b', [['egg_omelette', 1], ['whole_bread', 1], ['cottage_light', 0.5], ['cucumber', 1]]),
  D('b_yogurt_oats', 'יוגורט עם שיבולת שועל ובננה', 'b', [['greek_yogurt', 1], ['oats', 1], ['banana', 1]]),
  D('b_porridge', 'דייסת שיבולת שועל עם תפוח', 'b', [['oatmeal_milk', 1], ['apple', 1]]),
  D('b_cheese_sandwich', 'כריך גבינה צהובה עם עגבנייה', 'b', [['whole_bread', 1], ['yellow_cheese', 1], ['tomato', 1]]),
  D('b_white_cheese', 'גבינה לבנה עם לחם כהה וסלט ירקות', 'b', [['white_cheese', 0.5], ['dark_bread', 1], ['israeli_salad', 1]]),
  D('b_eggs_pita', 'ביצים קשות עם פיתה וסלט ירקות', 'b', [['eggs', 1], ['pita', 1], ['israeli_salad', 1]]),
  D('b_hummus_egg', 'פיתה עם חומוס, ביצה קשה ומלפפון', 'b', [['pita', 1], ['hummus', 1], ['eggs', 0.5], ['cucumber', 1]]),
  D('b_pb_banana', 'לחם עם חמאת בוטנים ובננה, וכוס חלב', 'b', [['whole_bread', 1], ['peanut_butter', 1], ['banana', 1], ['milk', 1]]),
  D('b_cottage', 'קוטג׳ עם לחם מלא, עגבנייה ומלפפון', 'b', [['cottage', 1], ['whole_bread', 1], ['tomato', 1], ['cucumber', 1]]),
  D('b_pancakes', 'פנקייק עם יוגורט ותותים', 'b', [['pancakes', 1], ['greek_yogurt', 1], ['strawberries', 1]]),
  D('b_soy_oats', 'שיבולת שועל עם משקה סויה ובננה', 'b', [['oats', 1], ['soy_milk', 1], ['banana', 1]]),
  D('b_tahini_toast', 'לחם מלא עם טחינה, אבוקדו ועגבנייה', 'b', [['whole_bread', 1], ['tahini', 1], ['avocado', 1], ['tomato', 1]]),
  D('b_ful', 'פול עם פיתה וסלט ירקות', 'b', [['ful', 1], ['pita', 1], ['israeli_salad', 1]]),
  D('b_pea_shake', 'שייק חלבון אפונה עם שיבולת שועל ותמרים', 'b', [['pea_protein', 1], ['oats', 1], ['dates', 1]]),
  D('b_hummus_veg', 'פיתה עם חומוס, עגבנייה ומלפפון', 'b', [['pita', 1], ['hummus', 1], ['tomato', 1], ['cucumber', 1]]),

  // ───── ביניים ─────
  D('s_yogurt_fruit', 'יוגורט ותפוח', 's', [['yogurt', 1], ['apple', 1]]),
  D('s_cottage_cakes', 'קוטג׳ עם פריכיות אורז', 's', [['cottage_light', 0.5], ['rice_cakes', 1]]),
  D('s_apple_almonds', 'תפוח ושקדים', 's', [['apple', 1], ['almonds', 1]]),
  D('s_dates_walnuts', 'תמרים ואגוזי מלך', 's', [['dates', 1], ['walnuts', 1]]),
  D('s_pb_cakes', 'פריכיות אורז עם חמאת בוטנים ובננה', 's', [['rice_cakes', 1], ['peanut_butter', 1], ['banana', 1]]),
  D('s_yogurt_berries', 'יוגורט חלבון עם תותים', 's', [['greek_yogurt', 1], ['strawberries', 1]]),
  D('s_carrot_hummus', 'גזר עם חומוס', 's', [['carrot', 1], ['hummus', 1]]),
  D('s_egg_orange', 'ביצה קשה ותפוז', 's', [['eggs', 0.5], ['orange', 1]]),
  D('s_chickpeas_banana', 'חומוס קלוי ובננה', 's', [['roasted_chickpeas', 1], ['banana', 1]]),
  D('s_edamame', 'אדממה ותפוז', 's', [['edamame', 1], ['orange', 1]]),
  D('s_tuna_bread', 'טונה על לחם מלא', 's', [['tuna_can', 1], ['whole_bread', 1]]),
  D('s_turkey_roll', 'פסטרמה הודו בלחמנייה', 's', [['turkey_slices', 1], ['roll', 1]]),

  // ───── אחרי אימון ─────
  D('p_shake_banana', 'שייק חלבון ובננה', 'p', [['protein_shake', 1], ['banana', 1]]),
  D('p_whey_dates', 'שייק חלבון עם חלב, ותמרים', 'p', [['whey_milk', 1], ['dates', 1]]),
  D('p_cottage_bread', 'קוטג׳ עם לחם', 'p', [['cottage_light', 1], ['white_bread', 1]]),
  D('p_yogurt_oats', 'יוגורט חלבון עם שיבולת שועל', 'p', [['greek_yogurt', 1], ['oats', 1]]),
  D('p_tuna_pita', 'טונה בפיתה', 'p', [['tuna_can', 1], ['pita', 1]]),
  D('p_eggs_pita', 'ביצים קשות ופיתה', 'p', [['eggs', 1], ['pita', 1]]),
  D('p_pea_banana', 'שייק חלבון אפונה ובננה', 'p', [['pea_protein', 1], ['banana', 1]]),
  D('p_soy_dates', 'משקה סויה עם חלבון סויה, ותמרים', 'p', [['soy_milk', 1], ['soy_protein', 1], ['dates', 1]]),
  D('p_tempeh_cakes', 'טמפה עם פריכיות אורז', 'p', [['tempeh', 1], ['rice_cakes', 1]]),

  // ───── צהריים / ערב: עוף, בשר ודגים ─────
  D('m_chicken_rice', 'חזה עוף עם אורז וסלט ירקות', 'ld', [['chicken_breast', 1], ['rice', 1], ['israeli_salad', 1]]),
  D('m_pargit_couscous', 'פרגית עם קוסקוס ושעועית ירוקה', 'ld', [['pargit', 1], ['couscous', 1], ['green_beans', 1]]),
  D('m_schnitzel_mash', 'שניצל עם פירה וסלט כרוב', 'ld', [['schnitzel', 1], ['mashed_potatoes', 1], ['cabbage_salad', 1]]),
  D('m_schnitzel_potatoes', 'שניצל עם תפוחי אדמה וסלט כרוב', 'ld', [['schnitzel', 1], ['potatoes', 1], ['cabbage_salad', 1]]),
  D('m_meatballs_rice', 'קציצות בקר ברוטב עגבניות עם אורז', 'ld', [['beef_meatballs', 1], ['rice', 1], ['cucumber', 1]]),
  D('m_kebab_bulgur', 'קבב עם בורגול, טחינה וסלט ירקות', 'ld', [['kebab', 1], ['bulgur', 1], ['tahini', 1], ['israeli_salad', 1]]),
  D('m_shawarma_pita', 'שווארמה הודו בפיתה עם סלט וטחינה', 'ld', [['turkey_shawarma', 1], ['pita', 1], ['israeli_salad', 1], ['tahini', 1]]),
  D('m_salmon_potatoes', 'סלמון עם תפוחי אדמה וברוקולי', 'ld', [['salmon', 1], ['potatoes', 1], ['broccoli', 1]]),
  D('m_tilapia_rice', 'דג אמנון עם אורז ושעועית ירוקה', 'ld', [['tilapia', 1], ['rice', 1], ['green_beans', 1]]),
  D('m_tuna_pasta', 'פסטה עם טונה ורוטב עגבניות', 'ld', [['pasta', 1], ['tuna_can', 1], ['tomato_sauce', 1]]),
  D('m_steak', 'סטייק עם תפוחי אדמה אפויים וסלט ירקות', 'ld', [['steak', 1], ['baked_fries', 1], ['israeli_salad', 1]]),
  D('m_bolognese', 'פסטה עם בשר טחון ורוטב עגבניות', 'ld', [['ground_beef', 1], ['pasta', 1], ['tomato_sauce', 1]]),
  D('m_chicken_balls', 'קציצות עוף עם קוסקוס וגזר', 'ld', [['chicken_meatballs', 1], ['couscous', 1], ['carrot', 1]]),
  D('m_turkey_quinoa', 'חזה הודו עם קינואה וסלט ירקות', 'ld', [['turkey_breast', 1], ['quinoa', 1], ['israeli_salad', 1]]),
  D('m_fish_patties', 'קציצות דג עם אורז וסלט כרוב', 'ld', [['fish_patties', 1], ['rice', 1], ['cabbage_salad', 1]]),

  // ───── צהריים / ערב: צמחוני ─────
  D('v_majadra', 'מג׳דרה עם יוגורט וסלט ירקות', 'ld', [['majadra', 1], ['yogurt', 1], ['israeli_salad', 1]]),
  D('v_pasta_cheese', 'פסטה ברוטב עגבניות עם גבינה בולגרית וסלט', 'ld', [['pasta', 1], ['tomato_sauce', 1], ['bulgarian', 1], ['israeli_salad', 1]]),
  D('v_shakshuka_pita', 'שקשוקה עם פיתה, סלט וטחינה', 'ld', [['shakshuka', 1], ['pita', 1], ['israeli_salad', 1], ['tahini', 1]]),
  D('v_omelette_dinner', 'חביתה עם גבינה צפתית, לחם מלא וסלט', 'd', [['egg_omelette', 1], ['tzfatit', 1], ['whole_bread', 1], ['israeli_salad', 1]]),
  D('v_lentil_soup', 'מרק עדשים עם לחם מלא וגבינה לבנה', 'ld', [['lentil_soup', 1], ['whole_bread', 1], ['white_cheese', 0.5]]),
  D('v_tuna_plate', 'טונה עם ביצה קשה, לחם מלא וסלט', 'd', [['tuna_can', 1], ['eggs', 0.5], ['whole_bread', 1], ['israeli_salad', 1]]),
  D('v_cottage_dinner', 'קוטג׳ עם לחם מלא, סלט ירקות וזיתים', 'd', [['cottage', 1], ['whole_bread', 1], ['israeli_salad', 1], ['olives', 1]]),
  D('v_hummus_plate', 'פיתה עם חומוס, ביצה קשה וסלט ירקות', 'ld', [['pita', 1], ['hummus', 1], ['eggs', 1], ['israeli_salad', 1]]),
  D('v_falafel', 'פלאפל בפיתה עם סלט וטחינה', 'ld', [['falafel', 1], ['pita', 1], ['israeli_salad', 1], ['tahini', 1]]),

  // ───── צהריים / ערב: טבעוני ─────
  D('g_tofu_rice', 'טופו מוקפץ עם אורז וברוקולי', 'ld', [['tofu', 1], ['rice', 1], ['broccoli', 1]]),
  D('g_lentils_rice', 'עדשים עם אורז, סלט ירקות וטחינה', 'l', [['lentils', 1], ['rice', 1], ['israeli_salad', 1], ['tahini', 1]]),
  D('g_chickpeas_couscous', 'חומוס גרגירים עם קוסקוס ושעועית ירוקה', 'l', [['chickpeas', 1], ['couscous', 1], ['green_beans', 1]]),
  D('g_tempeh_quinoa', 'טמפה עם קינואה, ברוקולי וטחינה', 'ld', [['tempeh', 1], ['quinoa', 1], ['broccoli', 1], ['tahini', 1]]),
  D('g_veg_schnitzel', 'שניצל מן הצומח עם תפוחי אדמה וסלט ירקות', 'ld', [['veg_schnitzel', 1], ['potatoes', 1], ['israeli_salad', 1]]),
  D('g_veg_burger', 'המבורגר מן הצומח בלחמנייה עם חומוס וסלט', 'ld', [['veg_burger', 1], ['roll', 1], ['hummus', 1], ['israeli_salad', 1]]),
  D('g_soy_pasta', 'פסטה עם פתיתי סויה ורוטב עגבניות', 'ld', [['soy_flakes', 1], ['pasta', 1], ['tomato_sauce', 1]]),
  D('g_veg_kebab', 'קבב מן הצומח עם בורגול, טחינה וסלט', 'ld', [['veg_kebab', 1], ['bulgur', 1], ['tahini', 1], ['israeli_salad', 1]]),
  D('g_black_beans', 'שעועית שחורה עם אורז, אבוקדו ועגבנייה', 'ld', [['black_beans', 1], ['rice', 1], ['avocado', 1], ['tomato', 1]]),
  D('g_lentils_bulgur', 'עדשים עם בצל מטוגן, בורגול וסלט ירקות', 'ld', [['lentils_onion', 1], ['bulgur', 1], ['israeli_salad', 1]]),
  D('g_soup_tahini', 'מרק עדשים עם לחם מלא וטחינה', 'ld', [['lentil_soup', 1], ['whole_bread', 1], ['tahini', 1]]),
  D('g_veg_bolognese', 'פסטה עם טחון צמחוני ורוטב עגבניות', 'ld', [['veg_ground', 1], ['pasta', 1], ['tomato_sauce', 1]]),

  // ───── בלי מטבח (בדרכים / בשטח) ─────
  D('f_tuna_pita', 'טונה בפיתה עם חומוס ומלפפון', 'ld', [['tuna_can', 1], ['pita', 1], ['hummus', 1], ['cucumber', 1]]),
  D('f_turkey_bread', 'לחם מלא עם פסטרמה הודו, עגבנייה ומלפפון', 'ld', [['turkey_slices', 1], ['whole_bread', 1], ['tomato', 1], ['cucumber', 1]]),
  D('f_beans_bread', 'שעועית ברוטב עגבניות עם לחם מלא ומלפפון', 'ld', [['beans_tomato_canned', 1], ['whole_bread', 1], ['cucumber', 1]]),
  D('f_eggs_hummus', 'ביצים קשות עם לחם מלא, חומוס וגזר', 'ld', [['eggs', 1], ['whole_bread', 1], ['hummus', 1], ['carrot', 1]]),
  D('f_cheese_roll', 'לחמנייה עם גבינה צהובה, עגבנייה ומלפפון', 'ld', [['roll', 1], ['yellow_cheese', 1], ['tomato', 1], ['cucumber', 1]]),
  D('f_tuna_oil', 'טונה בשמן עם לחם כהה, עגבנייה וגזר', 'ld', [['tuna_oil', 1], ['dark_bread', 1], ['tomato', 1], ['carrot', 1]]),
  D('f_loof', 'בשר משומר בפיתה עם מלפפון ועגבנייה', 'ld', [['loof', 1], ['pita', 1], ['cucumber', 1], ['tomato', 1]]),
  D('f_hummus_pea', 'פיתה עם חומוס ומלפפון, ושייק חלבון אפונה', 'ld', [['pita', 1], ['hummus', 1], ['cucumber', 1], ['pea_protein', 1]]),
];
export const DISH = Object.fromEntries(DISHES.map((d) => [d.id, d]));
