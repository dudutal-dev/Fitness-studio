// טבלת הקבוצות של מאכלי המאגר: "לא אוכל" הרחב (חיטה, מעובד, סוכר, שמני זרעים) וסימוני האלרגיה שלפי שם ותיאור מקור (גלוטן, שומשום).
// הכללים עצמם נשארים ב-js/engine/nutrition.js (RAW_FOOD_RULES) — תבניות על השם העברי. כאן הם מופעלים פעם אחת על המאגר העברי,
// והתוצאה נכתבת ל-js/data/food-groups.js כרשימות של מזהים בלבד, בלי טקסט בעברית — כך שהמהדורה האנגלית של MOVA (tools/i18n.mjs)
// מקבלת בדיוק אותן קבוצות. רץ בכל שחרור (tools/release.mjs), לפני בניית en/; tests/qa-foodgroups.test.js נכשל כשהקובץ לא מעודכן.
//   node tools/food_groups.mjs          — כותב את הקובץ
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = new URL('../js/data/food-groups.js', import.meta.url);
// המנוע מייבא את הקובץ שנוצר כאן; הכללים הגולמיים לא קוראים ממנו, ולכן מספיק שיהיה קיים (גם ריק או ישן)
const stub = '// נוצר ע״י tools/food_groups.mjs — לא לערוך ביד\nexport const FOOD_GROUPS = {};\n';

export async function render() {
  if (!existsSync(OUT)) writeFileSync(OUT, stub);
  const { FOODS } = await import('../js/data/foods.js');
  const { RAW_FOOD_RULES } = await import('../js/engine/nutrition.js');
  const rows = Object.entries(RAW_FOOD_RULES).map(([k, rule]) => `  ${k}: [${FOODS.filter((f) => rule(f)).map((f) => `'${f.id}'`).join(', ')}],`);
  return `// נוצר ע״י tools/food_groups.mjs — לא לערוך ביד\nexport const FOOD_GROUPS = {\n${rows.join('\n')}\n};\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const next = await render(), same = readFileSync(OUT, 'utf8') === next;
  if (!same) writeFileSync(OUT, next);
  console.log(`food groups: ${next.split('\n').slice(2, -2).map((r) => `${r.trim().split(':')[0]} ${r.split("'").length >> 1}`).join(', ')}${same ? ' (unchanged)' : ''}`);
}
