// מנות אמיתיות לתפריט: כל מנה היא שם מוכר והרכב של מאכלים מהמאגר (js/data/foods.js), עם כמות התחלתית במנות.
// המנוע (engine/nutrition.js → mealPlan) בוחר מנה לכל ארוחה, ואז מתאים את הכמויות ליעדי היום.
// meals: b=בוקר s=ביניים l=צהריים p=אחרי אימון d=ערב. איפה המנה זמינה (בבית / בעבודה / בדרכים) נגזר מהמרכיבים שלה,
// וכך גם ההתאמה לסוג התזונה, לכשרות ולאלרגיות — מנה נכנסת רק אם כל המרכיבים שלה מותרים למתאמן.
// הקובץ זהה בשלוש האפליקציות.
const D = (id, name, meals, items) => ({ id, name, meals: meals.split(''), items });

export const DISHES = [
  // ───── בוקר ─────
  D('b_shakshuka', 'Shakshuka with whole-wheat bread and vegetable salad', 'b', [['shakshuka', 1], ['whole_bread', 1], ['israeli_salad', 1]]),
  D('b_omelette', 'Omelet with whole-wheat bread, cottage cheese and cucumber', 'b', [['egg_omelette', 1], ['whole_bread', 1], ['cottage_light', 0.5], ['cucumber', 1]]),
  D('b_yogurt_oats', 'Yogurt with oats and banana', 'b', [['greek_yogurt', 1], ['oats', 1], ['banana', 1]]),
  D('b_porridge', 'Oatmeal porridge with apple', 'b', [['oatmeal_milk', 1], ['apple', 1]]),
  D('b_cheese_sandwich', 'Yellow cheese sandwich with tomato', 'b', [['whole_bread', 1], ['yellow_cheese', 1], ['tomato', 1]]),
  D('b_white_cheese', 'Soft white cheese with dark bread and vegetable salad', 'b', [['white_cheese', 0.5], ['dark_bread', 1], ['israeli_salad', 1]]),
  D('b_eggs_pita', 'Hard-boiled eggs with pita and vegetable salad', 'b', [['eggs', 1], ['pita', 1], ['israeli_salad', 1]]),
  D('b_hummus_egg', 'Pita with hummus, a hard-boiled egg and cucumber', 'b', [['pita', 1], ['hummus', 1], ['eggs', 0.5], ['cucumber', 1]]),
  D('b_pb_banana', 'Bread with peanut butter and banana, and a glass of milk', 'b', [['whole_bread', 1], ['peanut_butter', 1], ['banana', 1], ['milk', 1]]),
  D('b_cottage', 'Cottage cheese with whole-wheat bread, tomato and cucumber', 'b', [['cottage', 1], ['whole_bread', 1], ['tomato', 1], ['cucumber', 1]]),
  D('b_pancakes', 'Pancakes with yogurt and strawberries', 'b', [['pancakes', 1], ['greek_yogurt', 1], ['strawberries', 1]]),
  D('b_soy_oats', 'Oats with soy drink and banana', 'b', [['oats', 1], ['soy_milk', 1], ['banana', 1]]),
  D('b_tahini_toast', 'Whole-wheat bread with tahini, avocado and tomato', 'b', [['whole_bread', 1], ['tahini', 1], ['avocado', 1], ['tomato', 1]]),
  D('b_ful', 'Ful (fava beans) with pita and vegetable salad', 'b', [['ful', 1], ['pita', 1], ['israeli_salad', 1]]),
  D('b_pea_shake', 'Pea protein shake with oats and dates', 'b', [['pea_protein', 1], ['oats', 1], ['dates', 1]]),
  D('b_hummus_veg', 'Pita with hummus, tomato and cucumber', 'b', [['pita', 1], ['hummus', 1], ['tomato', 1], ['cucumber', 1]]),

  // ───── ביניים ─────
  D('s_yogurt_fruit', 'Yogurt and an apple', 's', [['yogurt', 1], ['apple', 1]]),
  D('s_cottage_cakes', 'Cottage cheese with rice cakes', 's', [['cottage_light', 0.5], ['rice_cakes', 1]]),
  D('s_apple_almonds', 'Apple and almonds', 's', [['apple', 1], ['almonds', 1]]),
  D('s_dates_walnuts', 'Dates and walnuts', 's', [['dates', 1], ['walnuts', 1]]),
  D('s_pb_cakes', 'Rice cakes with peanut butter and banana', 's', [['rice_cakes', 1], ['peanut_butter', 1], ['banana', 1]]),
  D('s_yogurt_berries', 'Protein yogurt with strawberries', 's', [['greek_yogurt', 1], ['strawberries', 1]]),
  D('s_carrot_hummus', 'Carrots with hummus', 's', [['carrot', 1], ['hummus', 1]]),
  D('s_egg_orange', 'A hard-boiled egg and an orange', 's', [['eggs', 0.5], ['orange', 1]]),
  D('s_chickpeas_banana', 'Roasted chickpeas and a banana', 's', [['roasted_chickpeas', 1], ['banana', 1]]),
  D('s_edamame', 'Edamame and an orange', 's', [['edamame', 1], ['orange', 1]]),
  D('s_tuna_bread', 'Tuna on whole-wheat bread', 's', [['tuna_can', 1], ['whole_bread', 1]]),
  D('s_turkey_roll', 'Turkey pastrami in a roll', 's', [['turkey_slices', 1], ['roll', 1]]),

  // ───── אחרי אימון ─────
  D('p_shake_banana', 'Protein shake and a banana', 'p', [['protein_shake', 1], ['banana', 1]]),
  D('p_whey_dates', 'Protein shake with milk, and dates', 'p', [['whey_milk', 1], ['dates', 1]]),
  D('p_cottage_bread', 'Cottage cheese with bread', 'p', [['cottage_light', 1], ['white_bread', 1]]),
  D('p_yogurt_oats', 'Protein yogurt with oats', 'p', [['greek_yogurt', 1], ['oats', 1]]),
  D('p_tuna_pita', 'Tuna in a pita', 'p', [['tuna_can', 1], ['pita', 1]]),
  D('p_eggs_pita', 'Hard-boiled eggs and pita', 'p', [['eggs', 1], ['pita', 1]]),
  D('p_pea_banana', 'Pea protein shake and a banana', 'p', [['pea_protein', 1], ['banana', 1]]),
  D('p_soy_dates', 'Soy drink with soy protein, and dates', 'p', [['soy_milk', 1], ['soy_protein', 1], ['dates', 1]]),
  D('p_tempeh_cakes', 'Tempeh with rice cakes', 'p', [['tempeh', 1], ['rice_cakes', 1]]),

  // ───── צהריים / ערב: עוף, בשר ודגים ─────
  D('m_chicken_rice', 'Chicken breast with rice and vegetable salad', 'ld', [['chicken_breast', 1], ['rice', 1], ['israeli_salad', 1]]),
  D('m_pargit_couscous', 'Chicken thigh with couscous and green beans', 'ld', [['pargit', 1], ['couscous', 1], ['green_beans', 1]]),
  D('m_schnitzel_mash', 'Schnitzel with mashed potatoes and coleslaw', 'ld', [['schnitzel', 1], ['mashed_potatoes', 1], ['cabbage_salad', 1]]),
  D('m_schnitzel_potatoes', 'Schnitzel with potatoes and coleslaw', 'ld', [['schnitzel', 1], ['potatoes', 1], ['cabbage_salad', 1]]),
  D('m_meatballs_rice', 'Beef meatballs in tomato sauce with rice', 'ld', [['beef_meatballs', 1], ['rice', 1], ['cucumber', 1]]),
  D('m_kebab_bulgur', 'Kebab with bulgur, tahini and vegetable salad', 'ld', [['kebab', 1], ['bulgur', 1], ['tahini', 1], ['israeli_salad', 1]]),
  D('m_shawarma_pita', 'Turkey shawarma in a pita with salad and tahini', 'ld', [['turkey_shawarma', 1], ['pita', 1], ['israeli_salad', 1], ['tahini', 1]]),
  D('m_salmon_potatoes', 'Salmon with potatoes and broccoli', 'ld', [['salmon', 1], ['potatoes', 1], ['broccoli', 1]]),
  D('m_tilapia_rice', 'Tilapia with rice and green beans', 'ld', [['tilapia', 1], ['rice', 1], ['green_beans', 1]]),
  D('m_tuna_pasta', 'Pasta with tuna and tomato sauce', 'ld', [['pasta', 1], ['tuna_can', 1], ['tomato_sauce', 1]]),
  D('m_steak', 'Steak with baked potatoes and vegetable salad', 'ld', [['steak', 1], ['baked_fries', 1], ['israeli_salad', 1]]),
  D('m_bolognese', 'Pasta with ground beef and tomato sauce', 'ld', [['ground_beef', 1], ['pasta', 1], ['tomato_sauce', 1]]),
  D('m_chicken_balls', 'Chicken patties with couscous and carrots', 'ld', [['chicken_meatballs', 1], ['couscous', 1], ['carrot', 1]]),
  D('m_turkey_quinoa', 'Turkey breast with quinoa and vegetable salad', 'ld', [['turkey_breast', 1], ['quinoa', 1], ['israeli_salad', 1]]),
  D('m_fish_patties', 'Fish patties with rice and coleslaw', 'ld', [['fish_patties', 1], ['rice', 1], ['cabbage_salad', 1]]),

  // ───── צהריים / ערב: צמחוני ─────
  D('v_majadra', 'Mujadara with yogurt and vegetable salad', 'ld', [['majadra', 1], ['yogurt', 1], ['israeli_salad', 1]]),
  D('v_pasta_cheese', 'Pasta in tomato sauce with Bulgarian (feta-style) cheese and salad', 'ld', [['pasta', 1], ['tomato_sauce', 1], ['bulgarian', 1], ['israeli_salad', 1]]),
  D('v_shakshuka_pita', 'Shakshuka with pita, salad and tahini', 'ld', [['shakshuka', 1], ['pita', 1], ['israeli_salad', 1], ['tahini', 1]]),
  D('v_omelette_dinner', 'Omelet with Tzfat cheese, whole-wheat bread and salad', 'd', [['egg_omelette', 1], ['tzfatit', 1], ['whole_bread', 1], ['israeli_salad', 1]]),
  D('v_lentil_soup', 'Lentil soup with whole-wheat bread and soft white cheese', 'ld', [['lentil_soup', 1], ['whole_bread', 1], ['white_cheese', 0.5]]),
  D('v_tuna_plate', 'Tuna with a hard-boiled egg, whole-wheat bread and salad', 'd', [['tuna_can', 1], ['eggs', 0.5], ['whole_bread', 1], ['israeli_salad', 1]]),
  D('v_cottage_dinner', 'Cottage cheese with whole-wheat bread, vegetable salad and olives', 'd', [['cottage', 1], ['whole_bread', 1], ['israeli_salad', 1], ['olives', 1]]),
  D('v_hummus_plate', 'Pita with hummus, a hard-boiled egg and vegetable salad', 'ld', [['pita', 1], ['hummus', 1], ['eggs', 1], ['israeli_salad', 1]]),
  D('v_falafel', 'Falafel in a pita with salad and tahini', 'ld', [['falafel', 1], ['pita', 1], ['israeli_salad', 1], ['tahini', 1]]),

  // ───── צהריים / ערב: טבעוני ─────
  D('g_tofu_rice', 'Stir-fried tofu with rice and broccoli', 'ld', [['tofu', 1], ['rice', 1], ['broccoli', 1]]),
  D('g_lentils_rice', 'Lentils with rice, vegetable salad and tahini', 'l', [['lentils', 1], ['rice', 1], ['israeli_salad', 1], ['tahini', 1]]),
  D('g_chickpeas_couscous', 'Chickpeas with couscous and green beans', 'l', [['chickpeas', 1], ['couscous', 1], ['green_beans', 1]]),
  D('g_tempeh_quinoa', 'Tempeh with quinoa, broccoli and tahini', 'ld', [['tempeh', 1], ['quinoa', 1], ['broccoli', 1], ['tahini', 1]]),
  D('g_veg_schnitzel', 'Plant-based schnitzel with potatoes and vegetable salad', 'ld', [['veg_schnitzel', 1], ['potatoes', 1], ['israeli_salad', 1]]),
  D('g_veg_burger', 'Plant-based burger in a bun with hummus and salad', 'ld', [['veg_burger', 1], ['roll', 1], ['hummus', 1], ['israeli_salad', 1]]),
  D('g_soy_pasta', 'Pasta with soy flakes and tomato sauce', 'ld', [['soy_flakes', 1], ['pasta', 1], ['tomato_sauce', 1]]),
  D('g_veg_kebab', 'Plant-based kebab with bulgur, tahini and salad', 'ld', [['veg_kebab', 1], ['bulgur', 1], ['tahini', 1], ['israeli_salad', 1]]),
  D('g_black_beans', 'Black beans with rice, avocado and tomato', 'ld', [['black_beans', 1], ['rice', 1], ['avocado', 1], ['tomato', 1]]),
  D('g_lentils_bulgur', 'Lentils with fried onions, bulgur and vegetable salad', 'ld', [['lentils_onion', 1], ['bulgur', 1], ['israeli_salad', 1]]),
  D('g_soup_tahini', 'Lentil soup with whole-wheat bread and tahini', 'ld', [['lentil_soup', 1], ['whole_bread', 1], ['tahini', 1]]),
  D('g_veg_bolognese', 'Pasta with plant-based mince and tomato sauce', 'ld', [['veg_ground', 1], ['pasta', 1], ['tomato_sauce', 1]]),

  // ───── בלי מטבח (בדרכים / בשטח) ─────
  D('f_tuna_pita', 'Tuna in a pita with hummus and cucumber', 'ld', [['tuna_can', 1], ['pita', 1], ['hummus', 1], ['cucumber', 1]]),
  D('f_turkey_bread', 'Whole-wheat bread with turkey pastrami, tomato and cucumber', 'ld', [['turkey_slices', 1], ['whole_bread', 1], ['tomato', 1], ['cucumber', 1]]),
  D('f_beans_bread', 'Beans in tomato sauce with whole-wheat bread and cucumber', 'ld', [['beans_tomato_canned', 1], ['whole_bread', 1], ['cucumber', 1]]),
  D('f_eggs_hummus', 'Hard-boiled eggs with whole-wheat bread, hummus and carrots', 'ld', [['eggs', 1], ['whole_bread', 1], ['hummus', 1], ['carrot', 1]]),
  D('f_cheese_roll', 'A roll with yellow cheese, tomato and cucumber', 'ld', [['roll', 1], ['yellow_cheese', 1], ['tomato', 1], ['cucumber', 1]]),
  D('f_tuna_oil', 'Tuna in oil with dark bread, tomato and carrots', 'ld', [['tuna_oil', 1], ['dark_bread', 1], ['tomato', 1], ['carrot', 1]]),
  D('f_loof', 'Canned meat in a pita with cucumber and tomato', 'ld', [['loof', 1], ['pita', 1], ['cucumber', 1], ['tomato', 1]]),
  D('f_hummus_pea', 'Pita with hummus and cucumber, and a pea protein shake', 'ld', [['pita', 1], ['hummus', 1], ['cucumber', 1], ['pea_protein', 1]]),
];
export const DISH = Object.fromEntries(DISHES.map((d) => [d.id, d]));
