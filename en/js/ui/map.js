// מפת המסלול בריצה ובהליכה: אריחי OpenStreetMap, ומעליהם קו המסלול, נקודת ההתחלה והמיקום הנוכחי. בלי ספריות.
// האריחים נטענים ישירות מ-OpenStreetMap (לא דרך השרת שלנו). בלי רשת — נשאר קו המסלול על רקע כהה.
// שני מצבים: follow — המפה ממורכזת על המיקום הנוכחי; fit — כל המסלול בתמונה אחת (בסיכום, או בלחיצה על המפה).
const T = 256;
const tileUrl = (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

// קו רוחב / אורך → פיקסלים במפת העולם (היטל מרקטור) בזום z
export function project(lat, lon, z) {
  const n = T * 2 ** z, s = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180);
  return [((lon + 180) / 360) * n, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n];
}
// הזום הגבוה ביותר שבו כל המסלול נכנס במסגרת w × h (עם שוליים), ומרכז המסלול
export function fitView(path, w, h, pad = 28, maxZ = 17) {
  const lats = path.map((p) => p[0]), lons = path.map((p) => p[1]);
  const b = [Math.min(...lats), Math.min(...lons), Math.max(...lats), Math.max(...lons)];
  const c = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
  for (let z = maxZ; z > 2; z--) {
    const a = project(b[2], b[1], z), d = project(b[0], b[3], z);
    if (d[0] - a[0] <= w - pad * 2 && d[1] - a[1] <= h - pad * 2) return { z, c };
  }
  return { z: 3, c };
}

// כמה אפשר להגדיל את המסלול מעבר לזום השלם שנבחר (25.11.2026): האריחים קיימים רק בזומים שלמים, ולכן מסלול קצר נשאר לפעמים על רבע מהמסגרת.
// מחזיר מקדם הגדלה בין 1 ל-max, כך שהמסלול ממלא את המסגרת עם השוליים.
export function fitScale(path, w, h, z, pad = 28, max = 1.7) {
  const lats = path.map((p) => p[0]), lons = path.map((p) => p[1]);
  const a = project(Math.max(...lats), Math.min(...lons), z), d = project(Math.min(...lats), Math.max(...lons), z);
  const s = Math.min((w - pad * 2) / Math.max(1, d[0] - a[0]), (h - pad * 2) / Math.max(1, d[1] - a[1]));
  return Math.max(1, Math.min(max, s));
}
// anchor: היכן במסגרת (0–1 מלמעלה) יושב המרכז; inset: גובה שמוסתר בתחתית (כותרת ובועת המאמנת) ולא נחשב בהתאמת המסלול
export function routeMap(host, { zoom = 16, anchor = 0.5, inset = 0, pad = 28 } = {}) {
  host.classList.add('rmap');
  host.innerHTML = `<div class="rmap-tiles"></div>
    <svg class="rmap-line" aria-hidden="true"><polyline class="edge"/><polyline class="path"/><circle class="a" r="7"/><circle class="halo" r="13"/><circle class="b" r="7"/><g class="marks"></g></svg>
    <a class="rmap-credit" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>`;
  const layer = host.querySelector('.rmap-tiles'), q = (s) => host.querySelector(s);
  const tiles = new Map();   // "z/x/y" → img, או זמן הכישלון האחרון (כדי לא לנסות שוב ושוב בלי רשת)
  let mode = 'follow', last = { path: [], here: null }, marks = [];   // marks: נקודות ממוספרות על המסלול [{ pos: [lat, lon] }]

  function draw(path = last.path, here = last.here) {
    last = { path, here };
    const w = host.clientWidth, h = host.clientHeight, at = here || path[path.length - 1];
    if (!w || !h || !at) return;
    const fit = mode === 'fit' && path.length > 1, v = fit ? fitView(path, w, h - inset, pad) : { z: zoom, c: at };
    const s = fit ? fitScale(path, w, h - inset, v.z, pad) : 1;   // s: הגדלה של התמונה כולה (אריחים וקו) כדי שמסלול קצר ימלא את המסגרת
    const [cx, cy] = project(v.c[0], v.c[1], v.z), ox = cx - w / 2 / s, oy = cy - (h * anchor) / s, n = 2 ** v.z;
    const want = new Set();
    for (let x = Math.floor(ox / T); x <= Math.floor((ox + w / s) / T); x++) for (let y = Math.floor(oy / T); y <= Math.floor((oy + h / s) / T); y++) {
      if (y < 0 || y >= n) continue;
      const key = `${v.z}/${((x % n) + n) % n}/${y}`; want.add(key);
      let im = tiles.get(key);
      if (typeof im === 'number') { if (Date.now() - im < 30000) continue; im = null; }
      if (!im) {
        im = new Image(); im.alt = ''; im.draggable = false; im.decoding = 'async'; im.style.transformOrigin = '0 0';
        im.onerror = () => { im.remove(); tiles.set(key, Date.now()); };
        im.src = tileUrl(...key.split('/')); layer.append(im); tiles.set(key, im);
      }
      im.style.transform = s === 1 ? `translate(${Math.round(x * T - ox)}px,${Math.round(y * T - oy)}px)` : `translate(${Math.floor((x * T - ox) * s)}px,${Math.floor((y * T - oy) * s)}px) scale(${s + 0.008})`;   // תוספת זעירה: בלי קו דק בין אריחים מוגדלים
    }
    for (const [k, im] of tiles) if (!want.has(k)) { if (typeof im !== 'number') im.remove(); tiles.delete(k); }
    const xy = (p) => { const [x, y] = project(p[0], p[1], v.z); return [Math.round((x - ox) * s * 10) / 10, Math.round((y - oy) * s * 10) / 10]; };
    const pts = path.map(xy).map((p) => p.join(',')).join(' ');
    q('.edge').setAttribute('points', pts); q('.path').setAttribute('points', pts);
    const put = (sel, p) => { const c = q(sel); c.style.display = p ? '' : 'none'; if (p) { const [x, y] = xy(p); c.setAttribute('cx', x); c.setAttribute('cy', y); } };
    put('.a', path[0]); put('.b', at); put('.halo', mode === 'follow' ? at : null);
    q('.marks').innerHTML = marks.map((mk, i) => { const [x, y] = xy(mk.pos); return `<circle cx="${x}" cy="${y}" r="12"/><text x="${x}" y="${y + 4.5}">${mk.n || i + 1}</text>`; }).join('');
  }
  return {
    draw,
    setMode(m) { mode = m; draw(); },
    setMarks(list) { marks = (list || []).filter((x) => x && x.pos); draw(); },
    layout(o) { anchor = o.anchor ?? anchor; inset = o.inset ?? inset; pad = o.pad ?? pad; draw(); },
    zoomBy(d) { zoom = Math.max(12, Math.min(18, zoom + d)); mode = 'follow'; draw(); },
    get mode() { return mode; },
    destroy() { host.innerHTML = ''; host.classList.remove('rmap'); tiles.clear(); },
  };
}
