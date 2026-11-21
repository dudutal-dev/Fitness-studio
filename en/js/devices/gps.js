// מרחק וקצב בריצה מ-GPS של הטלפון (עובד גם באייפון), עם סינון רעשים.
import { haversine } from './importer.js';

export const gpsSupported = () => typeof navigator !== 'undefined' && 'geolocation' in navigator;

export function gpsTracker() {
  let watch = null, prev = null, dist = 0, paused = false;
  const recent = []; // [{t, d}] לחישוב קצב נוכחי
  let lastFix = 0, accuracy = null, error = null;
  const path = [];   // המסלול: [lat, lon] של כל נקודה שנספרה במרחק
  let here = null;   // המיקום האחרון (גם בעמידה במקום) — לסימון על המפה

  function onPos(p) {
    const { latitude: lat, longitude: lon, accuracy: acc } = p.coords;
    accuracy = Math.round(acc);
    lastFix = Date.now();
    if (acc <= 60) here = [lat, lon];
    if (acc > 35) return; // דיוק נמוך — מתעלמים
    const pt = { lat, lon, t: p.timestamp };
    if (!prev && !paused) path.push([lat, lon]);
    if (prev && !paused) {
      const d = haversine(prev, pt);
      const dt = (pt.t - prev.t) / 1000;
      if (dt > 0 && d / dt < 9 && d > Math.min(4, acc / 4)) { dist += d; recent.push({ t: pt.t, d: dist }); path.push([lat, lon]); }
      else if (d / Math.max(dt, 1) >= 9) return; // קפיצה לא הגיונית
      else return; // תזוזה זניחה — לא מעדכנים נקודת ייחוס
    }
    prev = pt;
    while (recent.length && pt.t - recent[0].t > 30000) recent.shift();
  }

  return {
    start() {
      if (!gpsSupported()) return false;
      watch = navigator.geolocation.watchPosition(onPos, (e) => (error = e.message), { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
      return true;
    },
    stop() { if (watch != null) navigator.geolocation.clearWatch(watch); watch = null; },
    pause(v) { paused = v; if (!v) prev = null; },
    get distM() { return dist; },
    get path() { return path; },
    get here() { return here; },
    get status() { return { ok: Date.now() - lastFix < 10000, accuracy, error }; },
    // קצב נוכחי בשניות לק״מ (חלון של 30 שנ׳)
    get paceSec() {
      if (recent.length < 2) return null;
      const a = recent[0], b = recent[recent.length - 1];
      const d = b.d - a.d, dt = (b.t - a.t) / 1000;
      return d > 15 && dt > 5 ? Math.round(dt / (d / 1000)) : null;
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
