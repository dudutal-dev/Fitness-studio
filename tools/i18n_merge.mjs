// ממזג תרגום שנכתב שורה-מול-שורה אל מילון התרגום.
// i18n/todo/<name>.txt — הקטעים בעברית (שורה לכל קטע; ⏎ מסמן ירידת שורה בתוך קטע). i18n/work/<name>.txt — התרגום, באותו מספר שורות ובאותו סדר.
// שימוש: node tools/i18n_merge.mjs <name>   (name כמו js__views__plan.js)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
const root = new URL('../', import.meta.url).pathname, name = process.argv[2];
const lines = (p) => readFileSync(p, 'utf8').replace(/\n$/, '').split('\n');
const he = lines(`${root}i18n/todo/${name}.txt`), en = lines(`${root}i18n/work/${name}.txt`);
if (he.length !== en.length) { console.error(`line count differs: ${he.length} Hebrew, ${en.length} English`); process.exit(1); }
mkdirSync(`${root}i18n/en`, { recursive: true });
const out = `${root}i18n/en/${name}.json`, dict = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : {};
let bad = 0;
he.forEach((h, i) => { if (/[א-ת]/.test(en[i])) { bad++; console.error(`line ${i + 1} still has Hebrew: ${en[i].slice(0, 60)}`); } dict[h.replace(/⏎/g, '\n')] = en[i].replace(/⏎/g, '\n').replace(/^∅$/, ''); });
writeFileSync(out, JSON.stringify(dict, null, 1));
console.log(`merged ${he.length} lines into i18n/en/${name}.json${bad ? ` (${bad} lines still contain Hebrew)` : ''}`);
