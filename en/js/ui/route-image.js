// תמונת המסלול של ריצה / הליכה: המפה, המסלול הצבוע, נקודת ההתחלה והסיום, ושורת סיכום.
// נוצרת בסוף האימון ונשמרת בטלפון (Cache Storage, לא ב-localStorage — תמונות כבדות מדי בשבילו) לפי תאריך הריצה;
// ההיסטוריה מציגה אותה גם בלי רשת, ואפשר לשתף או לשמור אותה. אם אריחי המפה לא נטענים — המסלול מצויר על רקע חלק.
import { project, fitView } from './map.js';
import { APP_ID } from '../app-id.js';

const STORE = `routes-${APP_ID}`, KEEP = 80, LINE = '#2f6bff';
const key = (date) => `/route/${encodeURIComponent(date)}.jpg`;
const tile = (z, x, y) => new Promise((res) => {
  const im = new Image(); im.crossOrigin = 'anonymous';
  const t = setTimeout(() => res(null), 5000);
  im.onload = () => { clearTimeout(t); res(im); }; im.onerror = () => { clearTimeout(t); res(null); };
  im.src = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
});

// route: [[lat, lon], …]; caption: שורת הסיכום שבתחתית; title: שם האימון. מחזיר Blob של JPEG
export async function renderRouteImage(route, { title = '', caption = '', w = 900, h = 600 } = {}) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const band = 86, mh = h - band, { z, c } = fitView(route, w, mh, 60, 17), n = 2 ** z;
  const [cx, cy] = project(c[0], c[1], z), ox = cx - w / 2, oy = cy - mh / 2;
  const want = [];
  for (let x = Math.floor(ox / 256); x <= Math.floor((ox + w) / 256); x++) for (let y = Math.floor(oy / 256); y <= Math.floor((oy + mh) / 256); y++) if (y >= 0 && y < n) want.push([x, y]);
  const tiles = await Promise.all(want.map(([x, y]) => tile(z, ((x % n) + n) % n, y)));
  const paint = (withTiles) => {
    const g = cv.getContext('2d');
    g.fillStyle = '#e9eef2'; g.fillRect(0, 0, w, h);
    if (withTiles) want.forEach(([x, y], i) => { if (tiles[i]) g.drawImage(tiles[i], Math.round(x * 256 - ox), Math.round(y * 256 - oy), 256, 256); });
    const pts = route.map((p) => { const [x, y] = project(p[0], p[1], z); return [x - ox, y - oy]; });
    g.lineJoin = g.lineCap = 'round';
    const line = (color, width) => { g.strokeStyle = color; g.lineWidth = width; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
    line('#ffffff', 13); line(LINE, 8);
    const dot = ([x, y], fill, r) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = '#fff'; g.fill(); g.beginPath(); g.arc(x, y, r - 4, 0, 7); g.fillStyle = fill; g.fill(); };
    dot(pts[0], '#19b36b', 13); dot(pts[pts.length - 1], '#ff5a3c', 13);
    // שורת הסיכום
    g.fillStyle = '#0f161d'; g.fillRect(0, mh, w, band);
    g.direction = document.documentElement.dir === 'ltr' ? 'ltr' : 'rtl'; g.textBaseline = 'middle';
    const right = g.direction === 'rtl';
    g.textAlign = right ? 'right' : 'left';
    g.fillStyle = '#fff'; g.font = '800 30px Heebo, system-ui, sans-serif'; g.fillText(title, right ? w - 28 : 28, mh + 30, w - 56);
    g.fillStyle = '#9fb0c0'; g.font = '600 24px Heebo, system-ui, sans-serif'; g.fillText(caption, right ? w - 28 : 28, mh + 62, w - 56);
    g.direction = 'ltr'; g.textAlign = 'left'; g.fillStyle = 'rgba(0,0,0,0.55)'; g.font = '500 15px system-ui, sans-serif';
    if (withTiles) g.fillText('© OpenStreetMap', 10, mh - 14);
  };
  const blob = () => new Promise((res, rej) => { try { cv.toBlob((b) => (b ? res(b) : rej(new Error('empty'))), 'image/jpeg', 0.82); } catch (e) { rej(e); } });
  try { paint(true); return await blob(); } catch { paint(false); return blob(); }   // אריח שנחסם לקריאה — מציירים בלי המפה
}

export async function saveRouteImage(date, blob) {
  try {
    const c = await caches.open(STORE);
    await c.put(key(date), new Response(blob, { headers: { 'content-type': 'image/jpeg' } }));
    const all = await c.keys();   // הישנות ביותר יוצאות (המפתחות לפי סדר ההכנסה)
    for (const r of all.slice(0, Math.max(0, all.length - KEEP))) await c.delete(r);
    return true;
  } catch { return false; }
}
export async function loadRouteImage(date) {
  try { const r = await (await caches.open(STORE)).match(key(date)); return r ? await r.blob() : null; } catch { return null; }
}
export async function deleteRouteImage(date) { try { await (await caches.open(STORE)).delete(key(date)); } catch { /* */ } }

// שיתוף / שמירה של התמונה (חלונית השיתוף של הטלפון; במחשב — הורדה)
export async function shareRouteImage(blob, title = '') {
  const file = new File([blob], 'route.jpg', { type: 'image/jpeg' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title }); return; } catch (e) { if (e?.name === 'AbortError') return; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'route.jpg'; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
