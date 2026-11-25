// גרסה אנגלית של האפליקציה — נבנית מהמקור העברי, בלי לשנות אותו.
// הרעיון: הקוד העברי נשאר מקור האמת. הכלי מפרק כל קובץ JS (acorn), מוצא כל קטע טקסט בעברית (מחרוזת, או קטע בתוך תבנית —
// גם טקסט בין תגיות HTML וגם ערכי מאפיינים כמו aria-label), ומחליף אותו בתרגום מתוך i18n/en/<קובץ>.json.
// התוצאה נכתבת ל-en/ (מוגשת בכתובת …/Fitness-studio/en/), עם כיוון משמאל לימין, מפתח אחסון נפרד, ונכסים משותפים (../assets).
//
//   node tools/i18n.mjs todo [file…]   — כותב i18n/todo/<קובץ>.txt: הקטעים שעוד אין להם תרגום, לפי הסדר במקור
//   node tools/i18n.mjs build          — בונה את en/ ומדפיס כמה תורגם בכל קובץ
//   node tools/i18n.mjs stats          — רק הסטטיסטיקה
//
// מפתח התרגום הוא הטקסט העברי עצמו. כשאותו טקסט צריך תרגום אחר במקום אחר באותו קובץ: "הטקסט#2" (המופע השני), וכן הלאה.
import { parse } from 'acorn';
import { simple } from 'acorn-walk';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync, copyFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname, OUT = join(ROOT, 'en'), DICT = join(ROOT, 'i18n', 'en'), TODO = join(ROOT, 'i18n', 'todo');
const HE = /[א-ת]/;
const walkDir = (d) => readdirSync(join(ROOT, d)).flatMap((f) => (statSync(join(ROOT, d, f)).isDirectory() ? walkDir(join(d, f)) : [join(d, f)]));
const JS = () => [...walkDir('js').filter((f) => f.endsWith('.js')), 'sw.js'];
const dictPath = (f) => join(DICT, f.replace(/\//g, '__') + '.json');
const loadDict = (f) => (existsSync(dictPath(f)) ? JSON.parse(readFileSync(dictPath(f), 'utf8')) : {});

// מפרק טקסט גולמי (תוכן של מחרוזת או של קטע בתבנית) לקטעי עברית: טקסט מחוץ לתגיות, וערכי מאפיינים בתוך תגיות
function segments(raw) {
  const out = [];
  const text = (s, e) => { const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(raw.slice(s, e)); if (m[2] && HE.test(m[2])) out.push([s + m[1].length, e - m[3].length]); };
  const trim = (s, e) => { const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(raw.slice(s, e)); if (m[2] && HE.test(m[2])) out.push([s + m[1].length, e - m[3].length]); };
  // ערכי מאפיינים בעברית בתוך תגית; גם ערך שנקטע בסוף הקטע (ההמשך שלו בביטוי ${…} שאחריו)
  const attrs = (s, e) => { const re = /="([^"]*[א-ת][^"]*)("|$)/g; let m; const part = raw.slice(s, e); while ((m = re.exec(part))) trim(s + m.index + 2, s + m.index + 2 + m[1].length); };
  let i = 0;
  // קטע שמתחיל באמצע ערך של מאפיין (… aria-label="${n} מתוך 5">): הטקסט שעד המירכאות הוא חלק מהערך
  const lead = /^([^"<>]*)"[^<>]*>/.exec(raw);
  if (lead && HE.test(lead[1])) { trim(0, lead[1].length); raw = ' '.repeat(lead[1].length) + raw.slice(lead[1].length); }
  // קטע שמתחיל באמצע תגית (התגית נפתחה בקטע קודם של התבנית)
  const firstGt = raw.indexOf('>'), firstLt = raw.indexOf('<');
  // קטע שכולו בתוך תגית ונגמר באמצע ערך של מאפיין (… aria-label="השמע את ${name}")
  if (firstGt < 0 && firstLt < 0 && /="[^"]*$/.test(raw) && !HE.test(raw.replace(/="[^"]*$/, ''))) { attrs(0, raw.length); return out; }
  if (firstGt >= 0 && (firstLt < 0 || firstGt < firstLt) && !HE.test(raw.slice(0, firstGt).replace(/"[^"]*"/g, ''))) { attrs(0, firstGt); i = firstGt + 1; }
  while (i < raw.length) {
    const lt = raw.indexOf('<', i);
    if (lt < 0) { text(i, raw.length); break; }
    text(i, lt);
    const gt = raw.indexOf('>', lt);
    if (gt < 0) { attrs(lt, raw.length); break; }   // תגית שנמשכת לקטע הבא
    attrs(lt, gt); i = gt + 1;
  }
  return out;
}

// כל קטעי העברית בקובץ, לפי הסדר: { start, end, he, key, quote }
function pieces(src, file) {
  const ast = parse(src, { ecmaVersion: 'latest', sourceType: 'module' });
  const list = [], warn = [];
  const add = (start, end, quote) => { for (const [a, b] of segments(src.slice(start, end))) list.push({ start: start + a, end: start + b, he: src.slice(start + a, start + b), quote }); };
  simple(ast, {
    Literal(n) {
      if (n.regex) { if (HE.test(n.raw)) warn.push(`regex with Hebrew at ${n.start}: ${n.raw.slice(0, 60)}`); return; }
      if (typeof n.value === 'string' && HE.test(n.raw)) add(n.start + 1, n.end - 1, n.raw[0]);
    },
    TemplateElement(n) { if (HE.test(n.value.raw)) add(n.start, n.end, '`'); },
  });
  list.sort((a, b) => a.start - b.start);
  const seen = {};
  for (const p of list) { seen[p.he] = (seen[p.he] || 0) + 1; p.n = seen[p.he]; }
  return { list, warn };
}
const lookup = (dict, p) => dict[`${p.he}#${p.n}`] ?? dict[p.he];
const esc = (t, q) => (q === '`' ? t.replace(/`/g, '\\`').replace(/\$\{/g, '\\${') : t.replace(new RegExp(q, 'g'), '\\' + q));

function translate(file) {
  const src = readFileSync(join(ROOT, file), 'utf8'), dict = loadDict(file), { list, warn } = pieces(src, file);
  let out = '', pos = 0, done = 0; const missing = [];
  for (const p of list) {
    const en = lookup(dict, p);
    out += src.slice(pos, p.start);
    if (en == null) { out += p.he; missing.push(p); } else { out += esc(en, p.quote); done++; }
    pos = p.end;
  }
  return { code: out + src.slice(pos), total: list.length, done, missing, warn };
}

// התאמות לגרסה האנגלית שאינן תרגום: מיקום הנכסים, אזור הזמן של תאריכים, מפתח האחסון ושמות המטמון
const adapt = (file, code) => {
  code = code.replace(/(['"`(])assets\//g, '$1../assets/').replace(/'he-IL'/g, "'en-US'");
  // מקומות שבהם הקוד בודק מילה בעברית בתוך טקסט (לא רק מציג אותה): אותה בדיקה מול המילה האנגלית
  if (file === 'js/engine/program.js') code = code.replace('/^(ריצה|קליסתניקס|הליכה)/', '/^(Run|Calisthenics)|[Ww]alk/');
  if (file === 'js/engine/progression.js') code = code.replace('/מוט/', '/barbell/i').replace('/משקולת/', '/dumbbell/i');
  if (file === 'js/brand.js' || file === 'js/reminders.js') code = code.replace(/github\.io\/Fitness-studio\//g, 'github.io/Fitness-studio/en/');
  // אותה אפליקציה בשתי שפות: אותו מפתח אחסון ואותו רישיון. רק קובץ השפה מתהפך
  if (file === 'js/lang.js') code = code.replace("export const LANG = 'he';", "export const LANG = 'en';").replace("{ code: 'en', label: 'English' }", "{ code: 'he', label: 'עברית' }");
  // קולות באנגלית: תיקייה משלהם (assets/voice-en), באותם שמות קבצים
  if (file === 'js/coach/voice.js') code = code.replace(/assets\/voice\//g, 'assets/voice-en/').replace(/'studio-media'/g, "'studio-en-media'");   // גם ספירת הקבצים השמורים בהגדרות מסתכלת במטמון של הגרסה האנגלית
  if (file === 'sw.js') code = code.replace(/'studio-/g, "'studio-en-").replace(/x-studio-media/g, 'x-studio-en-media').replace(/lang: 'he', dir: 'rtl'/g, "lang: 'en', dir: 'ltr'");
  return code;
};

function build(write) {
  if (write) { rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT, { recursive: true }); }
  let T = 0, D = 0; const rows = [];
  for (const f of JS()) {
    const r = translate(f); T += r.total; D += r.done;
    if (r.total) rows.push([r.total - r.done, `${String(r.done).padStart(5)} / ${String(r.total).padEnd(5)} ${f}${r.warn.length ? `  (${r.warn.length} regex)` : ''}`]);
    if (write) { const o = join(OUT, f); mkdirSync(dirname(o), { recursive: true }); writeFileSync(o, adapt(f, r.code)); }
  }
  if (write) {
    // עמוד הבית, המניפסט והעיצוב
    const hd = loadDict('index.html'); let html = readFileSync(join(ROOT, 'index.html'), 'utf8');
    for (const [he, en] of Object.entries(hd)) html = html.split(he).join(en);
    // בגרסה האנגלית: מי שבחר עברית חוזר אליה; מי שהגיע ישר לכתובת האנגלית — זו הבחירה שלו
    html = html.replace(/<script>\/\*lang\*\/.*?<\/script>/, "<script>/*lang*/try{var l=localStorage.getItem('mova.lang');if(l==='he')location.replace('../'+location.search+location.hash);else if(!l)localStorage.setItem('mova.lang','en')}catch(e){}</script>");
    html = html.replace('lang="he"', 'lang="en"').replace('dir="rtl"', 'dir="ltr"').replace(/(href|src)="assets\//g, '$1="../assets/');
    writeFileSync(join(OUT, 'index.html'), html);
    const md = loadDict('manifest.webmanifest'); let man = readFileSync(join(ROOT, 'manifest.webmanifest'), 'utf8');
    for (const [he, en] of Object.entries(md)) man = man.split(he).join(en);
    // התיאור (25.11.2026): נשאר בעברית במניפסט האנגלי כי לא היה במילון. תרגום במילון קודם; בלעדיו — הנוסח הזה. המניפסט העברי לא משתנה
    man = man.replace(/("description": ")([^"]*)(")/, (m, a, d, z) => (HE.test(d) ? `${a}Your personal fitness studio: gym, calisthenics, running, nutrition and tracking — with a virtual coach for every track${z}` : m));
    writeFileSync(join(OUT, 'manifest.webmanifest'), man.replace('"lang": "he"', '"lang": "en"').replace('"dir": "rtl"', '"dir": "ltr"').replace(/"assets\//g, '"../assets/'));
    mkdirSync(join(OUT, 'css'), { recursive: true });
    for (const f of readdirSync(join(ROOT, 'css'))) writeFileSync(join(OUT, 'css', f), readFileSync(join(ROOT, 'css', f), 'utf8').replace(/url\((['"]?)\.\.\/assets\//g, 'url($1../../assets/'));
    copyFileSync(join(ROOT, 'version.json'), join(OUT, 'version.json'));
    // משך כל קליפ באנגלית (נכתב ע״י tools/trim_voice.py עם VOICE_LANG=en)
    if (existsSync(join(ROOT, 'i18n', 'voice-timing-en.js'))) copyFileSync(join(ROOT, 'i18n', 'voice-timing-en.js'), join(OUT, 'js', 'data', 'voice-timing.js'));
  }
  rows.sort((a, b) => b[0] - a[0]);
  console.log(rows.map((r) => r[1]).join('\n'));
  console.log(`\ntranslated ${D} of ${T} text pieces (${Math.round((D / T) * 100)}%)${write ? ' — built en/' : ''}`);
}

function todo(files) {
  mkdirSync(TODO, { recursive: true });
  for (const f of files.length ? files : JS()) {
    const r = translate(f); const seen = new Set(), lines = [];
    for (const p of r.missing) { const k = p.he; if (seen.has(k)) continue; seen.add(k); lines.push(k.replace(/\n/g, '⏎')); }
    const o = join(TODO, f.replace(/\//g, '__') + '.txt');
    if (lines.length) writeFileSync(o, lines.join('\n') + '\n'); else if (existsSync(o)) rmSync(o);
    if (lines.length) console.log(`${String(lines.length).padStart(5)} ${f}`);
    for (const w of r.warn) console.log('      ' + w);
  }
}

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'todo') todo(rest); else if (cmd === 'build') build(true); else build(false);
