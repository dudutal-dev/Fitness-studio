// מרחק, קצב ומסלול בריצה ובהליכה מ-GPS של הטלפון (עובד גם באייפון), עם סינון רעשים לפי דיוק המדידה.

export const gpsSupported = () => typeof navigator !== 'undefined' && 'geolocation' in navigator;

export function gpsTracker() {
  let watch = null, dist = 0, paused = false;
  const recent = []; // [{t, d}] לחישוב קצב נוכחי כשהמכשיר לא מדווח מהירות
  let lastFix = 0, accuracy = null, error = null, fixes = 0;
  const path = [];   // המסלול: [lat, lon] של כל נקודה שנספרה במרחק
  let here = null;   // המיקום האחרון (גם בעמידה במקום) — לסימון על המפה
  // מסנן: כל מדידה מקבלת משקל לפי הדיוק שלה (מסנן קלמן פשוט, במטרים סביב הנקודה הראשונה). כך גם מדידות בדיוק של 40–80 מ׳
  // (רגיל בעיר, בין בניינים או כשהטלפון בכיס) תורמות למרחק במקום להיזרק, ורעש של מדידה בודדת לא מתווסף למרחק.
  let o = null, fx = 0, fy = 0, v = 0, ft = 0, ref = null, far = 0;
  let spd = null, spdAt = 0;   // מהירות שהמכשיר מדווח (מ׳ לשנייה), מוחלקת
  const WALK_Q = 2.2;          // כמה מהר המיקום האמיתי יכול להשתנות (מ׳ לשנייה) — קובע כמה מהר המסנן "מאמין" לתזוזה
  const toLL = (x, y) => [o.lat + y / 110540, o.lon + x / (111320 * Math.cos((o.lat * Math.PI) / 180))];

  function onPos(p) {
    const { latitude: lat, longitude: lon, accuracy: acc, speed } = p.coords;
    const now = Date.now();
    accuracy = Math.round(acc); lastFix = now; fixes++;
    if (typeof speed === 'number' && speed >= 0) { spd = spd == null ? speed : spd * 0.65 + speed * 0.35; spdAt = now; }
    if (!(acc <= 120)) { if (!o) here = [lat, lon]; return; }   // מיקום גס מדי (אנטנות בלבד) — רק לסימון ראשוני
    // חותמת הזמן של המכשיר, ואם היא לא מתקדמת (קורה בדפדפנים מסוימים) — השעון שלנו
    let t = p.timestamp; if (!(t > ft)) t = Math.max(now, ft + 1);
    if (!o) { o = { lat, lon }; fx = fy = 0; v = acc * acc; ft = t; here = [lat, lon]; if (!paused) { ref = { x: 0, y: 0, t }; path.push(here); } return; }
    const mx = (lon - o.lon) * 111320 * Math.cos((o.lat * Math.PI) / 180), my = (lat - o.lat) * 110540;
    const dt = Math.min(600, (t - ft) / 1000), off = Math.hypot(mx - fx, my - fy);
    // קפיצה בודדת רחוקה מדי — מתעלמים; אם היא חוזרת שוב ושוב, המיקום הקודם היה השגוי ומתחילים ממנה
    if (off > Math.max(60, acc * 3) + dt * 9) { if (++far < 5) return; v = 1e6; } else far = 0;
    v += dt * WALK_Q * WALK_Q * (spd != null && now - spdAt < 5000 ? Math.max(0.3, Math.min(4, (spd / WALK_Q) ** 2 + 0.2)) : 1);
    const k = v / (v + acc * acc);
    fx += k * (mx - fx); fy += k * (my - fy); v *= 1 - k; ft = t;
    here = toLL(fx, fy);
    if (paused) return;
    if (!ref) { ref = { x: fx, y: fy, t }; path.push(here); return; }
    const d = Math.hypot(fx - ref.x, fy - ref.y), secs = (t - ref.t) / 1000;
    const still = spd != null && now - spdAt < 5000 && spd < 0.25;       // המכשיר מדווח שעומדים
    if (d < Math.max(3, Math.min(Math.sqrt(v) * 1.6, 25)) || still) return;   // תזוזה קטנה מאי־הוודאות של המיקום — עדיין לא סופרים
    if (d / Math.max(secs, 1) < 9) { dist += d; recent.push({ t, d: dist }); path.push(here); }
    ref = { x: fx, y: fy, t };
    while (recent.length && t - recent[0].t > 45000) recent.shift();
  }

  return {
    start() {
      if (!gpsSupported()) return false;
      watch = navigator.geolocation.watchPosition(onPos, (e) => (error = e.code === 1 ? e.message || 'denied' : null), { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
      return true;
    },
    stop() { if (watch != null) navigator.geolocation.clearWatch(watch); watch = null; },
    pause(v2) { paused = v2; if (!v2) ref = null; },
    get distM() { return dist; },
    get path() { return path; },
    get here() { return here; },
    get status() { return { ok: Date.now() - lastFix < 10000, accuracy, error, fixes, age: lastFix ? Math.round((Date.now() - lastFix) / 1000) : null }; },
    // קצב נוכחי בשניות לק״מ: מהמהירות שהמכשיר מודד (מגיבה מהר), ואם אין — מהמרחק שנצבר ב-45 השניות האחרונות
    get paceSec() {
      if (spd != null && Date.now() - spdAt < 6000) return spd > 0.45 ? Math.round(1000 / spd) : null;
      if (recent.length < 2) return null;
      const a = recent[0], b = recent[recent.length - 1];
      const d = b.d - a.d, dt = (b.t - a.t) / 1000;
      // רק אם המרחק עדיין מצטבר, ויש מדידות טריות: כשה-GPS נעלם הקצב האחרון נשאר על המסך עד סוף האימון (25.11.2026)
      return d > 12 && dt > 5 && ft - b.t < 20000 && Date.now() - lastFix < 20000 ? Math.round(dt / (d / 1000)) : null;
    },
  };
}

// המסלול לשמירה: עד max נקודות, מעוגלות לחמש ספרות (כמטר) — כדי שלא יתפוס מקום באחסון של הטלפון
export function simplifyPath(path, max = 150) {
  const step = Math.max(1, (path.length - 1) / (max - 1)), out = [];
  for (let i = 0; i < path.length - 1 && out.length < max - 1; i += step) out.push(path[Math.round(i)]);
  if (path.length) out.push(path[path.length - 1]);
  return out.map(([a, b]) => [Math.round(a * 1e5) / 1e5, Math.round(b * 1e5) / 1e5]);
}
