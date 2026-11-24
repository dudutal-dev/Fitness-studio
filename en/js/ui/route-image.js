// דף המסלול של ריצה / הליכה — התמונה שמשתפים (גרסה חדשה, 25.11.2026): כותרת עם שם האפליקציה, שם האימון והתאריך; המפה עם המסלול,
// נקודות ההתחלה והסיום, סימון לכל קילומטר, ונקודות ממוספרות (marks — למשל הנקודות של מסע המדיטציה); שורת נתונים גדולה; ומקרא לנקודות.
// נוצרת בסוף האימון ונשמרת בטלפון (Cache Storage, לא ב-localStorage — תמונות כבדות מדי בשבילו) לפי תאריך הריצה;
// ההיסטוריה מציגה אותה גם בלי רשת, ואפשר לשתף או לשמור אותה. אם אריחי המפה לא נטענים — המסלול מצויר על רקע חלק.
import { project, fitView } from './map.js';
import { APP_ID, APP_NAME } from '../app-id.js';

const STORE = `routes-${APP_ID}`, KEEP = 80;
const key = (date) => `/route/${encodeURIComponent(date)}.jpg`;
const tile = (z, x, y) => new Promise((res) => {
  const im = new Image(); im.crossOrigin = 'anonymous';
  const t = setTimeout(() => res(null), 5000);
  im.onload = () => { clearTimeout(t); res(im); }; im.onerror = () => { clearTimeout(t); res(null); };
  im.src = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
});
const R = 6371000, rad = (d) => (d * Math.PI) / 180;
const dist = (a, b) => { const dl = rad(b[0] - a[0]), dn = rad(b[1] - a[1]), h = Math.sin(dl / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
// הנקודה שעל המסלול בכל קילומטר שלם: [[lat, lon], …]
export function kmPoints(route) {
  const out = []; let acc = 0, next = 1000;
  for (let i = 1; i < route.length; i++) {
    const d = dist(route[i - 1], route[i]);
    while (d > 0 && acc + d >= next) { const f = (next - acc) / d; out.push([route[i - 1][0] + (route[i][0] - route[i - 1][0]) * f, route[i - 1][1] + (route[i][1] - route[i - 1][1]) * f]); next += 1000; }
    acc += d;
  }
  return out;
}
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };

// route: [[lat, lon], …] · title: שם האימון · date: תאריך לתצוגה · stats: [{ v, l }] עד ארבעה נתונים · caption: שורת סיכום (כשאין stats)
// marks: [{ pos: [lat, lon], name, n }] נקודות ממוספרות על המסלול, עם מקרא · accent: צבע המסלול · sub: שורה קטנה מתחת לכותרת
// art: כתובת של איור (מאותו אתר) שממלא את רקע הכותרת — למשל האיור של מסע המדיטציה. מחזיר Blob של JPEG
export async function renderRouteImage(route, { title = '', caption = '', date = '', sub = '', stats = [], marks = [], accent = '#2f6bff', art = '', w = 1080 } = {}) {
  marks = marks.filter((m) => m && m.pos);
  const artIm = art ? await new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = art; }) : null;
  const head = artIm ? 250 : 150, mh = 860, statH = stats.length || caption ? 190 : 0, rows = Math.ceil(marks.length / 2), legH = rows ? 70 + rows * 62 : 0, foot = 26, h = head + mh + statH + legH + foot;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const { z, c } = fitView(route, w, mh, 90, 17), n = 2 ** z;
  const [cx, cy] = project(c[0], c[1], z), ox = cx - w / 2, oy = cy - mh / 2;
  const want = [];
  for (let x = Math.floor(ox / 256); x <= Math.floor((ox + w) / 256); x++) for (let y = Math.floor(oy / 256); y <= Math.floor((oy + mh) / 256); y++) if (y >= 0 && y < n) want.push([x, y]);
  const tiles = await Promise.all(want.map(([x, y]) => tile(z, ((x % n) + n) % n, y)));
  const rtl = document.documentElement.dir !== 'ltr', F = 'Heebo, system-ui, sans-serif';
  const paint = (withTiles) => {
    const g = cv.getContext('2d'), X = (x) => (rtl ? w - x : x);   // X: מרחק מהצד שממנו קוראים
    g.fillStyle = '#0f161d'; g.fillRect(0, 0, w, h);
    // ── המפה
    g.save(); g.translate(0, head); g.beginPath(); g.rect(0, 0, w, mh); g.clip();
    g.fillStyle = '#e9eef2'; g.fillRect(0, 0, w, mh);
    if (withTiles) want.forEach(([x, y], i) => { if (tiles[i]) g.drawImage(tiles[i], Math.round(x * 256 - ox), Math.round(y * 256 - oy), 256, 256); });
    g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(0, 0, w, mh);   // מרכך את המפה כדי שהמסלול יבלוט
    const xy = (p) => { const [x, y] = project(p[0], p[1], z); return [x - ox, y - oy]; };
    const pts = route.map(xy);
    g.lineJoin = g.lineCap = 'round';
    const line = (color, width) => { g.strokeStyle = color; g.lineWidth = width; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
    line('rgba(15,22,29,0.28)', 20); line('#ffffff', 15); line(accent, 9);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'ltr';
    // סימון לכל קילומטר
    kmPoints(route).forEach((p, i) => { const [x, y] = xy(p); g.beginPath(); g.arc(x, y, 15, 0, 7); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 3; g.strokeStyle = accent; g.stroke(); g.fillStyle = '#0f161d'; g.font = `800 17px ${F}`; g.fillText(String(i + 1), x, y + 1); });
    const dot = ([x, y], fill, r) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = '#fff'; g.fill(); g.beginPath(); g.arc(x, y, r - 5, 0, 7); g.fillStyle = fill; g.fill(); };
    dot(pts[0], '#19b36b', 17); dot(pts[pts.length - 1], '#ff5a3c', 17);
    // הנקודות הממוספרות
    marks.forEach((m, i) => { const [x, y] = xy(m.pos); g.beginPath(); g.arc(x, y, 24, 0, 7); g.fillStyle = 'rgba(15,22,29,0.25)'; g.fill(); g.beginPath(); g.arc(x, y, 21, 0, 7); g.fillStyle = '#f3c97a'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke();
      g.fillStyle = '#2a1b52'; g.font = `800 22px ${F}`; g.fillText(String(m.n || i + 1), x, y + 1); });
    g.textAlign = 'left'; g.fillStyle = 'rgba(0,0,0,0.55)'; g.font = '500 16px system-ui, sans-serif';
    if (withTiles) g.fillText('© OpenStreetMap', 12, mh - 16);
    g.restore();
    // ── הכותרת (עם איור ברקע, כשיש)
    if (artIm) { const sc = w / artIm.width, sh = head / sc, sy = Math.max(0, artIm.height * 0.22 - sh / 2); g.drawImage(artIm, 0, sy, artIm.width, sh, 0, 0, w, head);
      const gr = g.createLinearGradient(0, 0, 0, head); gr.addColorStop(0, 'rgba(15,22,29,0.35)'); gr.addColorStop(1, 'rgba(15,22,29,0.88)'); g.fillStyle = gr; g.fillRect(0, 0, w, head); }
    const hy = artIm ? 100 : 0;
    g.direction = rtl ? 'rtl' : 'ltr'; g.textBaseline = 'middle'; g.textAlign = rtl ? 'right' : 'left';
    g.fillStyle = '#fff'; g.font = `800 44px ${F}`; g.fillText(title, X(40), 62 + hy, w - 300);
    g.fillStyle = '#9fb0c0'; g.font = `600 26px ${F}`; g.fillText([date, sub].filter(Boolean).join(' · '), X(40), 112 + hy, w - 300);
    g.textAlign = rtl ? 'left' : 'right'; g.fillStyle = accent; g.font = `800 38px ${F}`; g.fillText(APP_NAME, X(w - 40), 76 + hy);
    // ── הנתונים
    let y = head + mh;
    if (stats.length) {
      const cw = (w - 80) / stats.length;
      stats.forEach((s, i) => { const cx2 = X(40 + cw * i + cw / 2); g.textAlign = 'center'; g.direction = 'ltr'; g.fillStyle = '#fff'; g.font = `800 64px ${F}`; g.fillText(String(s.v), cx2, y + 80, cw - 20);
        g.direction = rtl ? 'rtl' : 'ltr'; g.fillStyle = '#9fb0c0'; g.font = `600 26px ${F}`; g.fillText(s.l, cx2, y + 140, cw - 20);
        if (i) { g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(X(40 + cw * i) - 1, y + 40, 2, 110); } });
    } else if (caption) { g.textAlign = rtl ? 'right' : 'left'; g.fillStyle = '#fff'; g.font = `700 36px ${F}`; g.fillText(caption, X(40), y + 95, w - 80); }
    y += statH;
    // ── מקרא הנקודות (שני טורים)
    if (rows) {
      g.fillStyle = 'rgba(255,255,255,0.06)'; rr(g, 28, y, w - 56, legH - 14, 26); g.fill();
      const colW = (w - 120) / 2;
      marks.forEach((m, i) => { const col = i % 2, row = Math.floor(i / 2), bx = X(64 + col * (colW + 8)), by = y + 58 + row * 62;
        g.beginPath(); g.arc(bx + (rtl ? -20 : 20), by, 20, 0, 7); g.fillStyle = '#f3c97a'; g.fill();
        g.textAlign = 'center'; g.direction = 'ltr'; g.fillStyle = '#2a1b52'; g.font = `800 21px ${F}`; g.fillText(String(m.n || i + 1), bx + (rtl ? -20 : 20), by + 1);
        g.direction = rtl ? 'rtl' : 'ltr'; g.textAlign = rtl ? 'right' : 'left'; g.fillStyle = '#fff'; g.font = `600 28px ${F}`; g.fillText(m.name, bx + (rtl ? -54 : 54), by + 1, colW - 70); });
    }
  };
  const blob = () => new Promise((res, rej) => { try { cv.toBlob((b) => (b ? res(b) : rej(new Error('empty'))), 'image/jpeg', 0.85); } catch (e) { rej(e); } });
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
