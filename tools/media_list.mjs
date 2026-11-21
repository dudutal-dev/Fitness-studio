// רשימת סרטוני ההדגמה לכל מאמן → js/data/media-list.js (להורדה מראש באפליקציה, js/media-warm.js). רץ בכל שחרור (tools/release.mjs).
// נכנס רק תרגיל שיש לו גם סרטון (.mp4) וגם תמונה (.webp).
import { readdirSync, existsSync, writeFileSync } from 'node:fs';
const root = new URL('../', import.meta.url), dir = new URL('assets/demos/', root);
const out = {};
for (const coach of readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()) {
  const ids = readdirSync(new URL(coach + '/', dir)).filter((f) => f.endsWith('.mp4')).map((f) => f.slice(0, -4)).filter((id) => existsSync(new URL(`${coach}/${id}.webp`, dir))).sort();
  if (ids.length) out[coach] = ids;
}
writeFileSync(new URL('js/data/media-list.js', root), `// נוצר ע״י tools/media_list.mjs — לא לערוך ביד\nexport const DEMO_FILES = ${JSON.stringify(out)};\n`);
console.log('media list:', Object.entries(out).map(([c, i]) => `${c} ${i.length}`).join(', '));
