// סריקת ברקוד של מוצר ארוז וחיפוש ערכי התזונה שלו במאגר הפתוח Open Food Facts.
// פענוח: BarcodeDetector של הדפדפן אם קיים (אנדרואיד/כרום), אחרת מפענח EAN-13 משלנו (ספארי באייפון לא תומך ב-BarcodeDetector).
// למאגר נשלח רק מספר הברקוד.

// ───── מפענח EAN-13 / UPC-A מתוך תמונה ─────
// רוחבי הפסים של כל ספרה (4 מקטעים, סה״כ 7 יחידות). קוד R זהה ברוחבים ל-L; קוד G הוא ההיפוך.
const L = ['3211', '2221', '2122', '1411', '1132', '1231', '1114', '1312', '1213', '3112'];
const G = L.map((s) => s.split('').reverse().join(''));
const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

export function validEAN13(code) {
  if (!/^\d{13}$/.test(code)) return false;
  const sum = code.slice(0, 12).split('').reduce((a, d, i) => a + Number(d) * (i % 2 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === Number(code[12]);
}

// ספרה מתוך 4 מקטעים: מנרמלים ל-7 יחידות ובוחרים את התבנית הקרובה ביותר.
// ההשוואה נשענת בעיקר על מרחקים בין קצוות דומים (פס+רווח) — הם לא מושפעים מ"מריחת דיו" וטשטוש שמרחיבים את הפסים.
function digitOf(runs, start, table) {
  const w = [runs[start], runs[start + 1], runs[start + 2], runs[start + 3]];
  const total = w[0] + w[1] + w[2] + w[3];
  if (!total) return null;
  const u = w.map((x) => (x * 7) / total);
  let best = -1, bestErr = Infinity;
  for (let d = 0; d < 10; d++) {
    const q = table[d];
    let err = 0;
    for (let i = 0; i < 3; i++) err += Math.abs(u[i] + u[i + 1] - (Number(q[i]) + Number(q[i + 1])));
    for (let i = 0; i < 4; i++) err += 0.3 * Math.abs(u[i] - Number(q[i]));
    if (err < bestErr) { bestErr = err; best = d; }
  }
  return bestErr < 1.9 ? { d: best, err: bestErr } : null;
}

// שורה אחת של בהירות (0–255) → מקטעים (פס/רווח) → ניסיון פענוח
function decodeRow(lum) {
  const n = lum.length;
  // סף מקומי: ממוצע נע (חלון ~1/8 מהרוחב) — עמיד לתאורה לא אחידה
  const win = Math.max(16, Math.round(n / 8));
  const pre = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + lum[i];
  const th = (i) => { const a = Math.max(0, i - win), b = Math.min(n, i + win); return ((pre[b] - pre[a]) / (b - a)) * 0.92; };
  // מיקומי המעברים בדיוק תת-פיקסלי (אינטרפולציה ליניארית של חציית הסף) — קריטי כשהפסים צרים
  const runs = []; // אורכי מקטעים לסירוגין; runs[0] הוא רווח (בהיר)
  let dark = false, lastEdge = 0, prev = lum[0] - th(0);
  for (let i = 1; i < n; i++) {
    const cur = lum[i] - th(i);
    const isDark = cur < 0;
    if (isDark !== dark) {
      const edge = i - 1 + (prev === cur ? 0.5 : prev / (prev - cur));
      runs.push(edge - lastEdge); lastEdge = edge; dark = isDark;
    }
    prev = cur;
  }
  runs.push(n - lastEdge);
  // מחפשים רצף של 59 מקטעים שמתחיל בפס: 3 (פתיחה) + 24 + 5 (אמצע) + 24 + 3 (סיום)
  for (let s = 1; s + 59 <= runs.length; s += 2) {
    let total = 0;
    for (let i = 0; i < 59; i++) total += runs[s + i];
    const m = total / 95;
    if (m < 1.2) continue;
    if (runs[s - 1] < m * 4) continue;                                   // אזור שקט לפני
    const guard = (i, k) => { for (let j = 0; j < k; j++) if (Math.abs(runs[s + i + j] - m) > m * 0.8) return false; return true; };
    if (!guard(0, 3) || !guard(27, 5) || !guard(56, 3)) continue;
    let code = '', parity = '', ok = true;
    for (let d = 0; d < 6 && ok; d++) {
      const at = s + 3 + d * 4;
      const l = digitOf(runs, at, L), g = digitOf(runs, at, G);
      const pick = l && (!g || l.err <= g.err) ? ['L', l] : g ? ['G', g] : null;
      if (!pick) { ok = false; break; }
      parity += pick[0]; code += pick[1].d;
    }
    if (!ok) continue;
    const first = PARITY.indexOf(parity);
    if (first < 0) continue;
    for (let d = 0; d < 6 && ok; d++) {
      const r = digitOf(runs, s + 32 + d * 4, L);
      if (!r) { ok = false; break; }
      code += r.d;
    }
    if (!ok) continue;
    code = first + code;
    if (validEAN13(code)) return code;
  }
  return null;
}

// img: { data: Uint8ClampedArray (RGBA), width, height }. סורק כמה שורות באזור המרכזי, לשני הכיוונים.
export function decodeEAN(img) {
  const { data, width, height } = img;
  const lum = new Float64Array(width);
  const rows = 15;
  for (let r = 0; r < rows; r++) {
    const y0 = Math.round(height * (0.25 + (0.5 * r) / (rows - 1)));
    lum.fill(0);
    let cnt = 0;
    for (let dy = -1; dy <= 1; dy++) { // ממוצע של 3 שורות סמוכות — מפחית רעש
      const y = y0 + dy;
      if (y < 0 || y >= height) continue;
      cnt++;
      for (let x = 0; x < width; x++) { const i = (y * width + x) * 4; lum[x] += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114; }
    }
    for (let x = 0; x < width; x++) lum[x] /= cnt;
    const code = decodeRow(lum) || decodeRow(Float64Array.from(lum).reverse());
    if (code) return code;
  }
  return null;
}

// ───── חיפוש במאגר ─────
// מחזיר { found, name, portion, kcal, p, c, f, fib, complete } — ערכים למנה אם המוצר מגדיר מנה, אחרת ל-100 ג׳.
export async function lookupBarcode(code) {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,product_name_he,brands,serving_quantity,nutriments`;
  const res = await fetch(url);
  if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
  const d = await res.json().catch(() => ({}));
  if (!d.product || d.status === 0) return { found: false };
  return productToFood(d.product, code);
}

export function productToFood(p, code) {
  const n = p.nutriments || {};
  const num = (v) => (Number.isFinite(Number(v)) && v !== '' && v != null ? Number(v) : null);
  let kcal = num(n['energy-kcal_100g']);
  if (kcal == null && num(n.energy_100g) != null) kcal = num(n.energy_100g) / 4.184; // קילו-ג׳אול → קק״ל
  const g = num(p.serving_quantity);
  const k = g && g > 0 && g <= 1000 ? g / 100 : 1;
  const r1 = (v) => (v == null ? null : Math.round(v * k * 10) / 10);
  const name = [p.product_name_he || p.product_name, (p.brands || '').split(',')[0].trim()].filter(Boolean).join(' · ');
  return {
    found: true, barcode: code, name: name || '',
    portion: k === 1 ? '100 g' : `Serving · ${Math.round(g)} g`,
    kcal: kcal == null ? null : Math.round(kcal * k), p: r1(num(n.proteins_100g)), c: r1(num(n.carbohydrates_100g)), f: r1(num(n.fat_100g)), fib: r1(num(n.fiber_100g)),
    complete: kcal != null && num(n.proteins_100g) != null,
  };
}

// ───── מצלמה ─────
// מפעיל את המצלמה האחורית בתוך אלמנט <video> וקורא ל-onCode כשזוהה ברקוד תקין. מחזיר פונקציית עצירה.
export async function startScanner(video, onCode) {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
  video.srcObject = stream;
  video.setAttribute('playsinline', '');
  await video.play().catch(() => {});
  let stopped = false;
  const stop = () => { stopped = true; stream.getTracks().forEach((t) => t.stop()); video.srcObject = null; };
  let native = null;
  try { if ('BarcodeDetector' in window) native = new window.BarcodeDetector({ formats: ['ean_13', 'upc_a', 'ean_8'] }); } catch { native = null; }
  const canvas = document.createElement('canvas');
  const cx = canvas.getContext('2d', { willReadFrequently: true });
  let last = '', hits = 0;
  const tick = async () => {
    if (stopped) return;
    let code = null;
    if (video.videoWidth) {
      try {
        if (native) { const r = await native.detect(video); code = r[0]?.rawValue || null; if (code && code.length === 12) code = `0${code}`; }
        if (!code) {
          // חותכים את הפס המרכזי של התמונה (שם המשתמש מכוון את הברקוד) ומקטינים ל-900 פיקסלים רוחב
          const vw = video.videoWidth, vh = video.videoHeight, sh = Math.round(vh * 0.4);
          canvas.width = Math.min(900, vw); canvas.height = Math.round((sh * canvas.width) / vw);
          cx.drawImage(video, 0, Math.round((vh - sh) / 2), vw, sh, 0, 0, canvas.width, canvas.height);
          code = decodeEAN(cx.getImageData(0, 0, canvas.width, canvas.height));
        }
      } catch { code = null; }
    }
    // אותו קוד בשתי קריאות רצופות — מונע קריאה שגויה חד-פעמית
    if (code && code === last) hits++; else { last = code || ''; hits = code ? 1 : 0; }
    if (code && hits >= 2) { stop(); onCode(code); return; }
    setTimeout(tick, 120);
  };
  tick();
  return stop;
}
