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

export function routeMap(host, { zoom = 16 } = {}) {
  host.classList.add('rmap');
  host.innerHTML = `<div class="rmap-tiles"></div>
    <svg class="rmap-line" aria-hidden="true"><polyline class="edge"/><polyline class="path"/><circle class="a" r="5"/><circle class="halo" r="13"/><circle class="b" r="7"/></svg>
    <a class="rmap-credit" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>`;
  const layer = host.querySelector('.rmap-tiles'), q = (s) => host.querySelector(s);
  const tiles = new Map();   // "z/x/y" → img, או זמן הכישלון האחרון (כדי לא לנסות שוב ושוב בלי רשת)
  let mode = 'follow', last = { path: [], here: null };

  function draw(path = last.path, here = last.here) {
    last = { path, here };
    const w = host.clientWidth, h = host.clientHeight, at = here || path[path.length - 1];
    if (!w || !h || !at) return;
    const v = mode === 'fit' && path.length > 1 ? fitView(path, w, h) : { z: zoom, c: at };
    const [cx, cy] = project(v.c[0], v.c[1], v.z), ox = cx - w / 2, oy = cy - h / 2, n = 2 ** v.z;
    const want = new Set();
    for (let x = Math.floor(ox / T); x <= Math.floor((ox + w) / T); x++) for (let y = Math.floor(oy / T); y <= Math.floor((oy + h) / T); y++) {
      if (y < 0 || y >= n) continue;
      const key = `${v.z}/${((x % n) + n) % n}/${y}`; want.add(key);
      let im = tiles.get(key);
      if (typeof im === 'number') { if (Date.now() - im < 30000) continue; im = null; }
      if (!im) {
        im = new Image(); im.alt = ''; im.draggable = false; im.decoding = 'async';
        im.onerror = () => { im.remove(); tiles.set(key, Date.now()); };
        im.src = tileUrl(...key.split('/')); layer.append(im); tiles.set(key, im);
      }
      im.style.transform = `translate(${Math.round(x * T - ox)}px,${Math.round(y * T - oy)}px)`;
    }
    for (const [k, im] of tiles) if (!want.has(k)) { if (typeof im !== 'number') im.remove(); tiles.delete(k); }
    const xy = (p) => { const [x, y] = project(p[0], p[1], v.z); return [Math.round((x - ox) * 10) / 10, Math.round((y - oy) * 10) / 10]; };
    const pts = path.map(xy).map((p) => p.join(',')).join(' ');
    q('.edge').setAttribute('points', pts); q('.path').setAttribute('points', pts);
    const put = (sel, p) => { const c = q(sel); c.style.display = p ? '' : 'none'; if (p) { const [x, y] = xy(p); c.setAttribute('cx', x); c.setAttribute('cy', y); } };
    put('.a', path[0]); put('.b', at); put('.halo', mode === 'follow' ? at : null);
  }
  return {
    draw,
    setMode(m) { mode = m; draw(); },
    get mode() { return mode; },
    destroy() { host.innerHTML = ''; host.classList.remove('rmap'); tiles.clear(); },
  };
}
