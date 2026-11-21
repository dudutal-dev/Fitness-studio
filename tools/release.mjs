// מסמן גרסה חדשה לפני העלאה: מעדכן version.json, js/version.js ואת שמות המטמון ב-sw.js.
// שימוש: node tools/release.mjs ["תיאור השינוי"] [--media]   (--media = נכסי מדיה השתנו → ריענון מטמון המדיה)
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const media = args.includes('--media');
const note = args.find((a) => !a.startsWith('--')) || '';
const now = new Date();
const v = now.toISOString().slice(0, 19).replace(/[-:T]/g, '').replace(/^(\d{8})/, '$1.');
const root = new URL('../', import.meta.url);
const prev = JSON.parse(readFileSync(new URL('version.json', root), 'utf8') || '{}');
const mediaV = media ? v : prev.media || v;
writeFileSync(new URL('version.json', root), JSON.stringify({ v, media: mediaV, note, date: now.toISOString() }, null, 1) + '\n');
writeFileSync(new URL('js/version.js', root), `// נוצר ע״י tools/release.mjs\nexport const APP_VERSION = '${v}';\n`);
let sw = readFileSync(new URL('sw.js', root), 'utf8');
sw = sw.replace(/const VERSION = '[^']*';/, `const VERSION = 'studio-${v}';`).replace(/const MEDIA = '[^']*';/, `const MEDIA = 'studio-media-${mediaV}';`);
writeFileSync(new URL('sw.js', root), sw);
// אפליקציית הניהול (admin/): אותה גרסה, כדי שתתעדכן לבד אצל מי שהתקין אותה למסך הבית
try { const au = new URL('admin/index.html', root); writeFileSync(au, readFileSync(au, 'utf8').replace(/const ADMIN_V = '[^']*';/, `const ADMIN_V = '${v}';`)); } catch { /* אין אפליקציית ניהול בריפו הזה */ }
// רשימת סרטוני ההדגמה לכל מאמן (להורדה מראש באפליקציה)
try { const { execFileSync } = await import('node:child_process'); console.log(execFileSync('node', [new URL('media_list.mjs', import.meta.url).pathname], { encoding: 'utf8' }).trim()); } catch (e) { console.error('media list failed:', e.message); process.exit(1); }
// הגרסה האנגלית (en/) נבנית מחדש מהמקור העברי בכל שחרור, כדי ששתי הגרסאות יהיו תמיד באותה גרסה
try { const { execFileSync } = await import('node:child_process'); const out = execFileSync('node', [new URL('i18n.mjs', import.meta.url).pathname, 'build'], { encoding: 'utf8' }); console.log(out.trim().split('\n').pop()); } catch { /* אין גרסה אנגלית בריפו הזה */ }
console.log('release', v, media ? '(media refreshed)' : '');
