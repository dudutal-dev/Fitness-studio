"""בונה את js/data/foods.js ממאגר התזונה הלאומי של משרד הבריאות (data.gov.il, "מאגר התזונה הלאומי הישראלי").
כל מאכל מצביע על פריט/ים במאגר (קוד) + משקל מנה (יחידת מידה מטבלת המשקלים של המאגר, או גרמים כשמצוין).
הערכים (קלוריות/חלבון/פחמימה/שומן) מחושבים: ערך ל-100 ג׳ × משקל המנה. מנות מורכבות = סכום מרכיבים.
שימוש: python3 tools/build_foods.py <moh.json>   (moh.json נוצר מ-API של data.gov.il)
meals: b=בוקר s=ביניים l=צהריים d=ערב p=אחרי אימון"""
import json, sys, os

MOH = json.load(open(sys.argv[1]))
FOODS = {str(f['Code']): f for f in MOH['foods']}
UNITS = {u['smlmida']: u['shmmida'].strip() for u in MOH['units']}
WEIGHTS = {}
for w in MOH['weights']:
    WEIGHTS.setdefault(str(w['mmitzrach']), {})[UNITS.get(str(w['mida']), str(w['mida']))] = float(w['mishkal'])

B, S, L, D, P = 'b', 's', 'l', 'd', 'p'
ALL = ['base', 'home', 'field']; BH = ['base', 'home']; H = ['home']; BF = ['base', 'field']

# (id, שם, תיאור מנה, קטגוריה, תגיות "לא אוכל", הקשרים, ארוחות, רכיבים[(קוד, יחידה|גרמים, כמות)])
SPEC = [
  # ── חלבון: עוף, בשר, דגים (צהריים/ערב) ──
  ('chicken_breast', 'חזה עוף צלוי', 'חזה בינוני', 'protein', ['chicken'], BH, [L, D], [('805', 150, 1)]),
  ('schnitzel', 'שניצל עוף', 'יחידה בינונית', 'protein', ['chicken'], BH, [L, D], [('818', 'יחידה בינונית', 1)]),
  ('pargit', 'פרגית / שוק עוף צלוי', 'מנה', 'protein', ['chicken'], BH, [L, D], [('838', 150, 1)]),
  ('chicken_wings', 'כנפי עוף מצופות', '3 כנפיים', 'protein', ['chicken'], H, [L, D], [('901', 'יחידה קטנה', 3)]),
  ('turkey_shawarma', 'שווארמה הודו (בצלחת)', 'מנה', 'protein', ['chicken'], BH, [L, D], [('983', 150, 1)]),
  ('chicken_meatballs', 'קציצות עוף', '3 קציצות', 'protein', ['chicken'], BH, [L, D], [('910', 'יחידה', 3)]),
  ('turkey_breast', 'חזה הודו צלוי', 'מנה', 'protein', ['chicken'], BH, [L, D], [('967', 150, 1)]),
  ('liver', 'כבד עוף עם בצל', 'מנה', 'protein', ['chicken'], H, [L, D], [('1056', 150, 1)]),
  ('ground_beef', 'בשר בקר טחון מוקפץ', 'מנה', 'protein', ['red_meat'], H, [L, D], [('669', 150, 1)]),
  ('kebab', 'קבב בקר', '3 קבבים קטנים', 'protein', ['red_meat'], BH, [L, D], [('667', 'יחידה קטנה', 3)]),
  ('beef_meatballs', 'קציצות בקר ברוטב עגבניות', '3 קציצות', 'protein', ['red_meat'], BH, [L, D], [('672', 'יחידה בינונית', 3)]),
  ('steak', 'סטייק אנטריקוט צלוי', 'סטייק', 'protein', ['red_meat'], H, [L, D], [('610', 200, 1)]),
  ('hot_dog', 'נקניקייה', 'נקניקייה', 'protein', ['red_meat'], ALL, [L, D], [('1092', 'יחידה', 1)]),
  ('loof', 'בשר בקר משומר (טושונקה)', 'מנה', 'protein', ['red_meat'], ['field'], [L, D], [('9853', 100, 1)]),
  ('jerky', 'בשר בקר מיובש', '3 פרוסות', 'protein', ['red_meat'], ['field', 'home'], [S], [('649', 'פרוסה', 3)]),
  ('turkey_slices', 'פסטרמה הודו', '5 פרוסות', 'protein', ['chicken'], ALL, [B, S, D], [('1122', 'פרוסה', 5)]),
  ('pastrami_beef', 'פסטרמה בקר', '4 פרוסות', 'protein', ['red_meat'], ALL, [S, L, D], [('681', 'פרוסה', 4)]),
  ('salami', 'סלמי', '3 פרוסות', 'protein', ['red_meat'], ALL, [S, L, D], [('1110', 'פרוסה', 3)]),
  ('tuna_can', 'טונה במים', 'אריזה אישית', 'protein', ['tuna', 'fish'], ALL, [S, L, D, P], [('1360', 'אריזה אישית', 1)]),
  ('tuna_oil', 'טונה בשמן', 'אריזה אישית', 'protein', ['tuna', 'fish'], ALL, [S, L, D], [('1358', 'אריזה אישית', 1)]),
  ('tuna_salad', 'סלט טונה במיונז', '4 כפות', 'protein', ['tuna', 'fish', 'eggs'], BH, [S, L, D], [('1484', 'כף', 4)]),
  ('tilapia', 'אמנון / מושט מבושל', 'מנה', 'protein', ['fish'], BH, [L, D], [('1152', 200, 1)]),
  ('salmon', 'סלמון אפוי', 'פרוסה בינונית', 'protein', ['fish'], H, [L, D], [('1298', 'פרוסה בינונית', 1)]),
  ('fish_patties', 'קציצות דג', '3 קציצות', 'protein', ['fish'], BH, [L, D], [('1140', 'יחידה', 3)]),
  # ── ביצים (בוקר/ערב) ──
  ('eggs', 'ביצים קשות', '3 ביצים', 'protein', ['eggs'], ALL, [B, S, D, P], [('1564', 'יחידה בינונית', 3)]),
  ('egg_omelette', 'חביתה (בשמן זית)', 'מנה גדולה', 'protein', ['eggs'], ALL, [B, D], [('1570', 'מנה גדולה', 1)]),
  ('egg_salad', 'סלט ביצים במיונז', '3 כפות', 'protein', ['eggs'], BH, [B, S, D], [('1603', 'כף', 3)]),
  ('shakshuka', 'שקשוקה', 'מנה בינונית', 'protein', ['eggs', 'vegetables', 'spicy'], BH, [B, L, D], [('1591', 'מנה בינונית', 1)]),
  # ── צמחי / קטניות ──
  ('tofu', 'טופו מטוגן', 'מנה', 'protein', [], H, [L, D], [('1688', 150, 1)]),
  ('falafel', 'פלאפל', '5 כדורים', 'protein', ['legumes', 'hummus'], BH, [L, D, S], [('1650', 'עיגול/כדור', 5)]),
  ('edamame', 'אדממה מבושלת', 'כוס', 'protein', ['legumes'], H, [S, L, D], [('8221', 'כוס', 1)]),
  ('chickpeas', 'גרגרי חומוס מבושלים', 'כוס', 'carb', ['legumes', 'hummus'], BH, [L], [('1653', 'כוס', 1)]),
  ('beans', 'שעועית לבנה מבושלת', 'כוס', 'carb', ['legumes'], BH, [L], [('1605', 'כוס', 1)]),
  ('lentils', 'עדשים מבושלים', 'כוס', 'carb', ['legumes'], BH, [L], [('1669', 'כוס', 1)]),
  ('lentil_soup', 'מרק עדשים', 'מנה בינונית', 'carb', ['legumes'], BH, [L, D], [('1784', 'מנה בינונית', 1)]),
  # ── מוצרי חלב (בוקר/ביניים/ערב/אחרי אימון) ──
  ('cottage', 'קוטג׳ 5%', 'גביע', 'dairy', ['dairy', 'cottage'], BH, [B, S, D, P], [('494', 'גביע', 1)]),
  ('cottage_light', 'קוטג׳ 3%', 'גביע', 'dairy', ['dairy', 'cottage'], BH, [B, S, D, P], [('500', 'גביע', 1)]),
  ('white_cheese', 'גבינה לבנה 5%', 'גביע', 'dairy', ['dairy'], BH, [B, S, D], [('532', 'גביע', 1)]),
  ('bulgarian', 'גבינה בולגרית 16%', '3 כפות', 'dairy', ['dairy'], BH, [B, D], [('436', 'כף', 3)]),
  ('tzfatit', 'גבינה צפתית 10%', 'פרוסה', 'dairy', ['dairy'], BH, [B, S, D], [('429', 'פרוסה', 1)]),
  ('mozzarella', 'מוצרלה 22%', '50 ג׳', 'dairy', ['dairy'], H, [B, D], [('423', 50, 1)]),
  ('yellow_cheese', 'גבינה צהובה 22%', '3 פרוסות', 'dairy', ['dairy'], ALL, [B, S, D], [('431', 'פרוסה', 3)]),
  ('milk', 'חלב 3%', 'כוס', 'dairy', ['dairy'], ALL, [B, S, P], [('15', 'כוס', 1)]),
  ('milk_1', 'חלב 1%', 'כוס', 'dairy', ['dairy'], BH, [B, S, P], [('25', 'כוס', 1)]),
  ('yogurt', 'יוגורט 3%', 'גביע בינוני', 'dairy', ['dairy'], BH, [B, S, D], [('41', 'גביע בינוני', 1)]),
  ('greek_yogurt', 'יוגורט עשיר בחלבון (דנונה PRO)', 'גביע', 'dairy', ['dairy'], BH, [B, S, D, P], [('9707', 'גביע', 1)]),
  ('dairy_pudding', 'מעדן חלב שוקולד', 'גביע', 'snack', ['dairy'], BH, [S], [('368', 'גביע', 1)]),
  ('chocolate_milk', 'שוקו', 'שקית', 'snack', ['dairy'], ALL, [B, S, P], [('149', 'שקית', 1)]),
  ('protein_shake', 'אבקת חלבון מי גבינה (עם מים)', 'מנה של 30 ג׳', 'protein', ['dairy'], ALL, [B, S, P], [('8712', 30, 1)]),
  ('whey_milk', 'שייק חלבון עם חלב', '30 ג׳ אבקה + כוס חלב', 'protein', ['dairy'], BH, [B, S, P], [('8712', 30, 1), ('15', 'כוס', 1)]),
  # ── פחמימות ──
  ('rice', 'אורז לבן', 'כוס מבושל', 'carb', ['rice'], BH, [L, D], [('2721', 'כוס', 1)]),
  ('pasta', 'פסטה', 'מנה בינונית מבושלת', 'carb', ['pasta'], BH, [L, D], [('8552', 'מנה בינונית', 1)]),
  ('bulgur', 'בורגול', 'כוס מבושל', 'carb', [], BH, [L, D], [('9550', 'כוס', 1)]),
  ('quinoa', 'קינואה', 'כוס מבושלת', 'carb', [], H, [L, D], [('2773', 'כוס', 1)]),
  ('couscous', 'קוסקוס', 'כוס', 'carb', [], BH, [L, D], [('2761', 'כוס', 1)]),
  ('buckwheat', 'כוסמת', 'כוס מבושלת', 'carb', [], H, [L, D], [('2668', 'כוס', 1)]),
  ('potatoes', 'תפוחי אדמה מבושלים', '200 ג׳', 'carb', [], BH, [L, D], [('3459', 200, 1)]),
  ('mashed_potatoes', 'פירה (חלב וחמאה)', '200 ג׳', 'carb', ['dairy'], BH, [L, D], [('3505', 200, 1)]),
  ('fries', 'צ׳יפס מטוגן', '150 ג׳', 'carb', [], BH, [L, D], [('3488', 150, 1)]),
  ('baked_fries', 'צ׳יפס אפוי בתנור', '150 ג׳', 'carb', [], H, [L, D], [('3489', 150, 1)]),
  ('majadra', 'מג׳דרה', '2 כוסות', 'carb', ['legumes', 'rice'], BH, [L, D], [('3091', 'כוס', 2)]),
  ('pita', 'פיתה', 'יחידה', 'carb', ['bread'], ALL, [B, S, L, D, P], [('1946', 'יחידה', 1)]),
  ('baguette', 'באגט', 'חצי באגט', 'carb', ['bread'], BH, [S, L], [('1932', 'יחידה', 0.5)]),
  ('white_bread', 'לחם לבן', '2 פרוסות', 'carb', ['bread'], ALL, [B, S, D, P], [('1919', 'פרוסה בינונית', 2)]),
  ('whole_bread', 'לחם מחיטה מלאה', '2 פרוסות', 'carb', ['bread'], ALL, [B, S, D, P], [('2017', 'פרוסה בינונית', 2)]),
  ('dark_bread', 'לחם אחיד כהה', '2 פרוסות', 'carb', ['bread'], ALL, [B, S, D], [('2062', 'פרוסה בינונית', 2)]),
  ('challah', 'חלה', '2 פרוסות', 'carb', ['bread', 'eggs'], H, [B, D], [('1958', 'פרוסה בינונית', 2)]),
  ('roll', 'לחמנייה', 'יחידה', 'carb', ['bread'], ALL, [B, S, L], [('1970', 'יחידה', 1)]),
  ('rice_cakes', 'פריכיות אורז', '4 פריכיות', 'carb', ['rice'], ALL, [B, S, P], [('2552', 'יחידה', 4)]),
  ('oats', 'שיבולת שועל (יבשה)', '60 ג׳', 'carb', ['oats'], ALL, [B, P], [('8199', 60, 1)]),
  ('oatmeal_milk', 'דייסת שיבולת שועל בחלב', '250 ג׳', 'carb', ['oats', 'dairy'], BH, [B], [('2896', 250, 1)]),
  ('cornflakes', 'קורנפלקס עם חלב', '40 ג׳ + 200 מ״ל חלב', 'carb', ['dairy'], BH, [B, S], [('2826', 40, 1), ('15', 200, 1)]),
  ('pancakes', 'פנקייק ביתי', '3 יחידות', 'carb', ['eggs', 'dairy'], H, [B], [('2972', 'יחידה', 3)]),
  # ── פירות (בוקר/ביניים/אחרי אימון) ──
  ('banana', 'בננה', 'יחידה גדולה', 'fruit', ['fruit'], ALL, [B, S, P], [('3225', 'יחידה גדולה', 1)]),
  ('apple', 'תפוח עץ', 'יחידה בינונית', 'fruit', ['fruit'], ALL, [B, S], [('3201', 'יחידה בינונית', 1)]),
  ('orange', 'תפוז', 'יחידה בינונית', 'fruit', ['fruit'], BH, [B, S, P], [('3120', 'יחידה בינונית', 1)]),
  ('dates', 'תמרים יבשים', '4 תמרים', 'fruit', ['fruit'], ALL, [B, S, P], [('3171', 'יחידה', 4)]),
  ('raisins', 'צימוקים', '3 כפות', 'fruit', ['fruit'], ALL, [B, S, P], [('3199', 'כף', 3)]),
  ('grapes', 'ענבים', 'כוס', 'fruit', ['fruit'], BH, [S], [('3250', 'כוס', 1)]),
  ('watermelon', 'אבטיח', 'פרוסה בינונית', 'fruit', ['fruit'], BH, [S, D], [('3322', 'פרוסה בינונית', 1)]),
  ('melon', 'מלון', 'כוס קוביות', 'fruit', ['fruit'], BH, [S, D], [('3228', 'כוס קוביות', 1)]),
  ('mango', 'מנגו', 'חצי מנגו', 'fruit', ['fruit'], H, [S, P], [('3263', 'יחידה בינונית', 0.5)]),
  ('pomegranate', 'רימון', 'כוס גרגרים', 'fruit', ['fruit'], H, [S], [('3308', 'כוס', 1)]),
  ('strawberries', 'תותים', '150 ג׳', 'fruit', ['fruit'], BH, [B, S], [('3339', 150, 1)]),
  ('orange_juice', 'מיץ תפוזים סחוט', 'כוס', 'fruit', ['fruit'], BH, [B, S, P], [('3148', 'כוס', 1)]),
  # ── ירקות ──
  ('israeli_salad', 'סלט ירקות (שמן זית)', 'קערה (150 ג׳)', 'veg', ['vegetables'], BH, [B, L, D], [('3895', 150, 1)]),
  ('cucumber', 'מלפפון', '2 יחידות', 'veg', ['vegetables'], ALL, [B, S, L, D], [('3793', 'יחידה בינונית', 2)]),
  ('tomato', 'עגבנייה', 'יחידה בינונית', 'veg', ['vegetables'], ALL, [B, L, D], [('3663', 'יחידה בינונית', 1)]),
  ('carrot', 'גזר', '2 יחידות', 'veg', ['vegetables'], ALL, [S, L, D], [('3626', 'יחידה בינונית', 2)]),
  ('pepper', 'פלפל', 'יחידה', 'veg', ['vegetables'], BH, [B, L, D], [('3837', 'יחידה בינונית', 1)]),
  ('broccoli', 'ברוקולי מבושל', 'כוס', 'veg', ['vegetables'], H, [L, D], [('3615', 'כוס', 1)]),
  ('green_beans', 'שעועית ירוקה מבושלת', 'כוס', 'veg', ['vegetables'], BH, [L, D], [('3918', 'כוס', 1)]),
  ('cabbage_salad', 'סלט כרוב וגזר', '100 ג׳', 'veg', ['vegetables'], BH, [L, D], [('3857', 100, 1)]),
  ('eggplant_salad', 'סלט חצילים בטחינה', '3 כפות', 'veg', ['vegetables', 'tahini'], BH, [L, D], [('4200', 'כף', 3)]),
  ('matbucha', 'מטבוחה', '3 כפות', 'veg', ['vegetables', 'spicy'], BH, [B, L, D], [('3681', 'כף', 3)]),
  ('tomato_sauce', 'רוטב עגבניות', '4 כפות', 'veg', ['vegetables'], BH, [L, D], [('3724', 'כף', 4)]),
  # ── שומנים וממרחים ──
  ('tahini', 'סלט טחינה', '2 כפות', 'fat', ['tahini'], BH, [L, D], [('1886', 'כף', 2)]),
  ('hummus', 'סלט חומוס', '2 כפות', 'fat', ['hummus', 'legumes'], ALL, [S, L, D], [('1640', 'כף', 2)]),
  ('avocado', 'אבוקדו', 'חצי יחידה', 'fat', ['avocado'], BH, [B, L, D], [('3223', 'יחידה בינונית', 0.5)]),
  ('olive_oil', 'שמן זית', 'כף', 'fat', [], BH, [L, D], [('4443', 'כף', 1)]),
  ('olives', 'זיתים', '10 זיתים', 'fat', [], BH, [B, D], [('4278', 'יחידה בינונית', 10)]),
  ('peanut_butter', 'חמאת בוטנים', 'כף', 'fat', ['peanut', 'nuts'], ALL, [B, S, P], [('1858', 'כף', 1)]),
  ('almonds', 'שקדים', '30 ג׳', 'fat', ['nuts'], ALL, [S], [('1815', 30, 1)]),
  ('walnuts', 'אגוזי מלך', '30 ג׳', 'fat', ['nuts'], H, [S], [('1854', 30, 1)]),
  ('peanuts', 'בוטנים קלויים', '30 ג׳', 'fat', ['peanut', 'nuts'], ALL, [S], [('1843', 30, 1)]),
  ('sunflower_seeds', 'גרעיני חמניות (קלופים)', '30 ג׳', 'fat', [], ALL, [S], [('1873', 30, 1)]),
  ('mayo', 'מיונז', 'כף', 'fat', ['eggs'], BH, [L, D], [('4466', 'כף', 1)]),
  ('butter', 'חמאה', 'כפית', 'fat', ['dairy'], H, [B], [('4387', 'כפית', 1)]),
  ('chocolate_spread', 'ממרח שוקולד', 'כף', 'snack', ['dairy'], ALL, [B, S], [('4554', 'כף', 1)]),
  ('honey', 'דבש', 'כף', 'snack', [], ALL, [B, S], [('4544', 'כף', 1)]),
  ('jam', 'ריבה', 'כף', 'snack', ['fruit'], BH, [B], [('4577', 'כף', 1)]),
  ('halva', 'חלבה', '50 ג׳', 'snack', ['tahini'], ALL, [S], [('4711', 50, 1)]),
  # ── חטיפים ומשקאות ──
  ('bamba', 'במבה', 'שקית קטנה', 'snack', ['peanut', 'nuts'], ALL, [S], [('2581', 'שקית', 1)]),
  ('bissli', 'ביסלי', 'שקית', 'snack', [], ALL, [S], [('2585', 'שקית', 1)]),
  ('chips', 'תפוצ׳יפס', 'שקית', 'snack', [], ALL, [S], [('3477', 'שקית', 1)]),
  ('chocolate', 'שוקולד חלב', '4 קוביות', 'snack', ['dairy'], ALL, [S], [('8751', 'ריבוע/ קוביה', 4)]),
  ('wafers', 'ופל שוקולד', '3 יחידות', 'snack', [], ALL, [S], [('2360', 'יחידה', 3)]),
  ('cookies', 'עוגיות שיבולת שועל', '3 עוגיות', 'snack', ['oats'], ALL, [S], [('2318', 'יחידה', 3)]),
  ('granola_bar', 'חטיף גרנולה עם בוטנים', 'חטיף', 'snack', ['oats', 'peanut', 'nuts'], ALL, [S, P], [('2484', 'יחידה', 1)]),
  ('ice_cream', 'גלידה', '100 ג׳', 'snack', ['dairy'], H, [S], [('291', 100, 1)]),
  ('popcorn', 'פופקורן (באוויר חם)', '4 כוסות', 'snack', [], H, [S], [('2590', 'כוס', 4)]),
  ('energy_drink', 'משקה אנרגיה', 'פחית', 'snack', [], ALL, [S], [('8546', 'פחית', 1)]),
  ('soft_drink', 'משקה קל קולה', '330 מ״ל', 'snack', [], ALL, [S], [('4843', 330, 1)]),
  ('iso_drink', 'משקה איזוטוני', '500 מ״ל', 'snack', [], ALL, [S, P], [('4908', 500, 1)]),
  ('coffee_milk', 'קפה עם חלב (הפוך)', '200 מ״ל חלב', 'snack', ['dairy'], BH, [B, S], [('15', 200, 1)]),
  ('banana_pb_smoothie', 'שייק בננה, חמאת בוטנים וחלב', 'כוס גדולה', 'snack', ['fruit', 'peanut', 'nuts', 'dairy'], BH, [B, S, P], [('3225', 'יחידה גדולה', 1), ('1858', 'כף', 1), ('15', 'כוס', 1)]),
  # ── מנות מורכבות (מחושבות ממרכיבי המאגר; לחיפוש וליומן) ──
  ('schnitzel_pita', 'שניצל בפיתה', 'פיתה + שניצל + חומוס + סלט', 'meal', ['chicken', 'bread', 'hummus', 'legumes'], BH, [L, D], [('1946', 'יחידה', 1), ('818', 'יחידה בינונית', 1), ('1640', 'כף', 1), ('3895', 50, 1)]),
  ('shawarma_pita', 'שווארמה בפיתה', 'פיתה + 150 ג׳ שווארמה + טחינה + סלט', 'meal', ['chicken', 'bread', 'tahini'], BH, [L, D], [('1946', 'יחידה', 1), ('983', 150, 1), ('1886', 'כף', 2), ('3895', 50, 1)]),
  ('falafel_pita', 'פלאפל בפיתה', 'פיתה + 5 כדורים + טחינה + חומוס + סלט', 'meal', ['legumes', 'bread', 'tahini', 'hummus'], BH, [L, D], [('1946', 'יחידה', 1), ('1650', 'עיגול/כדור', 5), ('1886', 'כף', 2), ('1640', 'כף', 1), ('3895', 50, 1)]),
  ('sabich', 'סביח', 'פיתה + חציל מטוגן + ביצה + טחינה + סלט + תפו״א', 'meal', ['eggs', 'bread', 'tahini', 'vegetables'], BH, [L, D], [('1946', 'יחידה', 1), ('4199', 'פרוסה דקה', 3), ('1564', 'יחידה בינונית', 1), ('1886', 'כף', 2), ('3895', 50, 1), ('3459', 50, 1)]),
  ('hummus_plate', 'צלחת חומוס + פיתה', '200 ג׳ חומוס + פיתה', 'meal', ['hummus', 'legumes', 'bread'], BH, [L, D], [('1640', 200, 1), ('1946', 'יחידה', 1)]),
  ('hummus_meat', 'חומוס עם בשר + פיתה', '200 ג׳ חומוס + 100 ג׳ בשר + פיתה', 'meal', ['hummus', 'legumes', 'red_meat', 'bread'], BH, [L, D], [('1640', 200, 1), ('669', 100, 1), ('1946', 'יחידה', 1)]),
  ('burger_meal', 'המבורגר ביתי בלחמנייה', 'לחמנייה + קציצת בקר 150 ג׳', 'meal', ['red_meat', 'bread'], H, [L, D], [('1970', 'יחידה', 1), ('667', 150, 1)]),
  ('pizza_slice', 'פיצה גבינה', 'משולש', 'meal', ['dairy', 'bread'], BH, [S, L, D], [('9455', 'משולש', 1)]),
  ('toast', 'טוסט גבינה', '2 פרוסות לחם + 2 פרוסות גבינה', 'meal', ['dairy', 'bread'], BH, [B, S, D], [('1919', 'פרוסה בינונית', 2), ('490', 'פרוסה', 2)]),
  ('toast_tuna', 'טוסט טונה וגבינה', 'טוסט + אריזת טונה', 'meal', ['tuna', 'fish', 'bread', 'dairy'], BH, [S, L, D], [('1919', 'פרוסה בינונית', 2), ('490', 'פרוסה', 2), ('1360', 'אריזה אישית', 1)]),
  ('bourekas', 'בורקס גבינה', '2 יחידות', 'meal', ['dairy', 'bread'], BH, [B, S], [('2988', 'יחידה', 2)]),
  ('jachnun', 'ג׳חנון', 'יחידה בינונית', 'meal', ['bread'], H, [B], [('3028', 'יחידה בינונית', 1)]),
  ('malawach', 'מלאווח', 'יחידה בינונית', 'meal', ['bread'], H, [B, L], [('3024', 'יחידה בינונית', 1)]),
  ('chicken_rice', 'עוף עם אורז וסלט', 'חזה עוף + כוס אורז + סלט', 'meal', ['chicken', 'rice', 'vegetables'], BH, [L, D], [('805', 150, 1), ('2721', 'כוס', 1), ('3895', 100, 1)]),
  ('schnitzel_puree', 'שניצל עם פירה', 'שניצל + 200 ג׳ פירה', 'meal', ['chicken', 'dairy'], BH, [L, D], [('818', 'יחידה בינונית', 1), ('3505', 200, 1)]),
  ('meatballs_rice', 'קציצות ברוטב עם אורז', '3 קציצות + כוס אורז', 'meal', ['red_meat', 'rice'], BH, [L, D], [('672', 'יחידה בינונית', 3), ('2721', 'כוס', 1)]),
  ('couscous_meal', 'קוסקוס עם מרק עוף וירקות', 'כוס קוסקוס + 300 ג׳ מרק', 'meal', ['chicken', 'vegetables'], BH, [L, D], [('2761', 'כוס', 1), ('1544', 300, 1)]),
  ('spaghetti_bolognese', 'ספגטי בולונז', '200 ג׳ פסטה + 120 ג׳ רוטב', 'meal', ['pasta', 'red_meat'], BH, [L, D], [('8552', 200, 1), ('1560', 120, 1)]),
  ('pasta_tomato', 'פסטה ברוטב עגבניות', '300 ג׳', 'meal', ['pasta', 'vegetables'], BH, [L, D], [('2655', 300, 1)]),
  ('pasta_cream', 'פסטה ברוטב שמנת', '200 ג׳ פסטה + 100 ג׳ רוטב', 'meal', ['pasta', 'dairy'], BH, [L, D], [('8552', 200, 1), ('410', 100, 1)]),
  ('shakshuka_bread', 'שקשוקה עם לחם', 'מנה בינונית + 2 פרוסות', 'meal', ['eggs', 'vegetables', 'bread', 'spicy'], BH, [B, L, D], [('1591', 'מנה בינונית', 1), ('1919', 'פרוסה בינונית', 2)]),
  ('omelette_sandwich', 'כריך חביתה', 'חביתה + 2 פרוסות לחם', 'meal', ['eggs', 'bread'], ALL, [B, S, D], [('1570', 'מנה גדולה', 1), ('1919', 'פרוסה בינונית', 2)]),
  ('cottage_sandwich', 'כריך גבינה לבנה', '60 ג׳ גבינה + 2 פרוסות מלא', 'meal', ['dairy', 'bread'], ALL, [B, S, D], [('532', 60, 1), ('2017', 'פרוסה בינונית', 2)]),
  ('pb_sandwich', 'כריך חמאת בוטנים ודבש', 'כף חמאת בוטנים + כף דבש + 2 פרוסות', 'meal', ['peanut', 'nuts', 'bread'], ALL, [B, S, P], [('1858', 'כף', 1), ('4544', 'כף', 1), ('2017', 'פרוסה בינונית', 2)]),
  ('tuna_sandwich', 'כריך טונה', 'אריזת טונה + 2 פרוסות + כפית מיונז', 'meal', ['tuna', 'fish', 'bread', 'eggs'], ALL, [S, L, D, P], [('1360', 'אריזה אישית', 1), ('1919', 'פרוסה בינונית', 2), ('4466', 'כפית', 1)]),
  ('sushi', 'סושי (אורז ודג)', '8 יחידות', 'meal', ['fish', 'rice'], H, [L, D], [('3079', 'יחידה קטנה', 8)]),
  ('chicken_salad_bowl', 'סלט עוף גדול', 'חזה עוף + 200 ג׳ סלט + חצי אבוקדו', 'meal', ['chicken', 'vegetables', 'avocado'], H, [L, D], [('805', 150, 1), ('3895', 200, 1), ('3223', 'יחידה בינונית', 0.5)]),
]

def grams_of(code, unit, count):
    if isinstance(unit, (int, float)):
        return unit * count
    w = WEIGHTS.get(code, {})
    if unit not in w:
        raise SystemExit(f'קוד {code}: אין יחידה "{unit}" במאגר. קיימות: {list(w)}')
    return w[unit] * count

# ── הרחבת המאגר (tools/foods_extra.json) ──
# מאכלים שנוספו במחקר לפי סוגי מזון: כל אחד מצביע על קוד/ים במאגר משרד הבריאות ועל מנה, בדיוק כמו SPEC.
# הם משמשים לחיפוש, ליומן ולסריקה — אבל לא נכנסים לתפריט המומלץ (plan: false), שנשאר מבוסס על הרשימה שנבחרה ידנית.
EXTRA = json.load(open(os.path.join(os.path.dirname(__file__), 'foods_extra.json'), encoding='utf-8'))
EXTRA_IDS = {e['id'] for e in EXTRA}
dup = EXTRA_IDS & {s[0] for s in SPEC}
if dup:
    raise SystemExit(f'מזהים כפולים בין SPEC ל-foods_extra.json: {sorted(dup)}')
ALL_SPEC = SPEC + [(e['id'], e['name'], e['portion'], e['cat'], e['tags'], e['ctx'], e['meals'], [tuple(c) for c in e['comps']]) for e in EXTRA]

out, report = [], []
for fid, name, portion, cat, tags, ctx, meals, comps in ALL_SPEC:
    tot = {'kcal': 0, 'p': 0, 'c': 0, 'f': 0, 'fib': 0}
    srcs, grams_total, alc = [], 0, 0
    for code, unit, count in comps:
        f = FOODS.get(code)
        if not f:
            raise SystemExit(f'{fid}: קוד {code} לא קיים במאגר')
        g = grams_of(code, unit, count)
        grams_total += g
        for k, col in (('kcal', 'food_energy'), ('p', 'protein'), ('c', 'carbohydrates'), ('f', 'total_fat'), ('fib', 'total_dietary_fiber')):
            tot[k] += (float(f[col] or 0)) * g / 100
        alc += float(f.get('alcohol') or 0) * g / 100
        srcs.append({'code': int(code), 'name': f['shmmitzrach'].replace('\n', ' ').strip(), 'g': round(g)})
    r = lambda v, d=0: round(v, d) if d else round(v)
    item = {'id': fid, 'name': name, 'portion': portion if portion.endswith(f'{round(grams_total)} ג׳') else f'{portion} · {round(grams_total)} ג׳',   # בלי כפילות: "250 ג׳ · 250 ג׳" (25.11.2026)
             'g': round(grams_total), 'kcal': r(tot['kcal']), 'p': r(tot['p'], 1), 'c': r(tot['c'], 1), 'f': r(tot['f'], 1), 'fib': r(tot['fib'], 1),
            'cat': cat, 'tags': tags, 'ctx': ctx, 'meals': meals, 'src': srcs}
    # במאגר, ערך הסיבים של הפריטים האלה זהה לערך הפחמימות (כנראה שגיאת הזנה) — לא נספר כסיבים
    if fid in ('chicken_meatballs',):
        item['fib'] = 0.0
    if fid in EXTRA_IDS:
        item['plan'] = False
    if alc >= 0.5:
        item['alc'] = round(alc, 1)   # גרם אלכוהול (7 קק״ל לגרם) — מסביר את הפער בין הקלוריות למאקרו במשקאות
    out.append(item)
    report.append(item)

ROOT = os.path.join(os.path.dirname(__file__), '..')
src = open(os.path.join(ROOT, 'js/data/foods.js'), encoding='utf-8').read()
marker = '// ערכי המזון נוצרו אוטומטית' if '// ערכי המזון נוצרו אוטומטית' in src else 'const F = '
head = src[:src.index(marker)]
tail = src[src.index('export const FOOD = '):]
body = ("// ערכי המזון נוצרו אוטומטית ע״י tools/build_foods.py ממאגר התזונה הלאומי של משרד הבריאות (data.gov.il).\n"
        "// לכל מאכל: g = משקל המנה בגרמים, src = קוד/י הפריט במאגר. אין לערוך ידנית — לעדכן את tools/build_foods.py.\n"
        "// meals: b=בוקר s=ביניים l=צהריים d=ערב p=אחרי אימון\n"
        "export const FOODS = " + json.dumps(out, ensure_ascii=False, indent=0).replace('\n', '') .replace('},{', '},\n  {') + ";\n\n")
open(os.path.join(ROOT, 'js/data/foods.js'), 'w', encoding='utf-8').write(head + body + tail)

md = ['# מקורות ערכי המזון', '', 'כל הערכים מחושבים מ**מאגר התזונה הלאומי הישראלי** של משרד הבריאות ([data.gov.il/dataset/nutrition-database](https://data.gov.il/dataset/nutrition-database)): ערך ל-100 ג׳ × משקל המנה. משקלי היחידות (פרוסה, כוס, יחידה בינונית…) לקוחים מטבלת המשקלים של המאגר; במקומות שבהם צוינו גרמים — זו בחירת גודל מנה שלנו. מנות מורכבות = סכום המרכיבים המפורטים.', '',
      '| מאכל | מנה | קק״ל | חלבון | פחמ׳ | שומן | פריטים במאגר (קוד: שם, גרמים) |', '|---|---|---|---|---|---|---|']
for i in report:
    md.append(f"| {i['name']} | {i['portion']} | {i['kcal']} | {i['p']} | {i['c']} | {i['f']} | " + '<br>'.join(f"{s['code']}: {s['name']} ({s['g']} ג׳)" for s in i['src']) + ' |')
open(os.path.join(ROOT, 'docs/NUTRITION_SOURCES.md'), 'w', encoding='utf-8').write('\n'.join(md) + '\n')
print(len(out), 'foods built')
for i in report[:8] + report[-4:]:
    print(f"{i['id']:<20} {i['portion']:<45} kcal={i['kcal']:<5} P={i['p']:<5} C={i['c']:<5} F={i['f']}")
