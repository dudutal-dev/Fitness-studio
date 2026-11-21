// Service Worker: קוד האפליקציה נשמר במטמון לפי גרסה (עובד אופליין). מדיה (קול/וידאו) במטמון קבוע שלא נמחק בעדכון:
// כשגרסת המדיה משתנה, כל קובץ מוגש מיד מהמטמון ומתרענן ברקע — כך שעדכון לא משאיר את המאמן בלי קול כשאין קליטה.
// הגרסאות מתעדכנות אוטומטית ע״י tools/release.mjs — כל שינוי כאן גורם לדפדפן להתקין את הגרסה החדשה.
const VERSION = 'studio-en-20261121.174613';
const MEDIA = 'studio-en-media-20261121.072352';
const MEDIA_CACHE = 'studio-en-media';
const MEDIA_TAG = 'x-studio-en-media';
const CORE = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css', 'version.json',
  'js/app.js', 'js/intro.js', 'js/lang.js', 'js/share-card.js', 'js/brand.js', 'js/app-id.js', 'js/lic.js', 'js/install.js', 'js/version.js', 'js/updater.js', 'js/theme.js', 'js/reminders.js', 'js/views/reminders-ui.js', 'js/store.js', 'js/ui/dom.js', 'js/ui/charts.js', 'js/coach/voice.js', 'js/coach/keepalive.js', '../assets/silence.mp3', 'js/coach/music.js',
  'js/data/exercises.js', 'js/data/cali-exercises.js', 'js/data/cali.js', 'js/data/mob-exercises.js', 'js/data/mob.js', 'js/data/hiit-exercises.js', 'js/data/pil-exercises.js', 'js/data/yoga-exercises.js', 'js/data/tai-exercises.js', 'js/data/foods.js', 'js/data/dishes.js', 'js/data/coaches.js', 'js/data/voice-lines.js', 'js/data/names.js', 'js/data/demo-timing.js', 'js/data/voice-timing.js',
  'js/engine/program.js', 'js/engine/progression.js', 'js/engine/running.js', 'js/engine/nutrition.js', 'js/engine/stats.js', 'js/engine/history-edit.js', 'js/engine/summary.js', 'js/engine/cali.js', 'js/engine/mob.js', 'js/engine/hiit.js', 'js/engine/pil.js', 'js/engine/yoga.js', 'js/engine/tai.js', 'js/engine/walking.js', 'js/backup.js', 'js/barcode.js',
  'js/views/onboarding.js', 'js/views/home.js', 'js/views/plan.js', 'js/views/workout.js', 'js/views/run.js',
  'js/views/progress.js', 'js/views/nutrition.js', 'js/views/nut-prefs.js', 'js/views/track-sheet.js', 'js/views/coach.js', 'js/views/garmin.js', 'js/views/guide.js', 'js/views/history.js', 'js/views/plan-intro.js', 'js/views/cali-ui.js', 'js/views/mob-ui.js',
  'js/devices/fit.js', 'js/devices/importer.js', 'js/devices/health.js', 'js/devices/hr.js', 'js/devices/gps.js', 'js/devices/ui.js', 'js/ui/map.js', 'js/ui/route-image.js',
  '../assets/coaches/ori.webp', '../assets/coaches/noa.webp', '../assets/coaches/ori_face.webp', '../assets/coaches/noa_face.webp', '../assets/coaches/maya.webp', '../assets/coaches/maya_face.webp', '../assets/coaches/tamar.webp', '../assets/coaches/tamar_face.webp', '../assets/coaches/guy.webp', '../assets/coaches/guy_face.webp', '../assets/coaches/shira.webp', '../assets/coaches/shira_face.webp', '../assets/coaches/lia.webp', '../assets/coaches/lia_face.webp', '../assets/coaches/mei.webp', '../assets/coaches/mei_face.webp',
  '../assets/icons/icon-192.png', '../assets/icons/icon-512.png',
  '../assets/fonts/heebo-hebrew.woff2', '../assets/fonts/heebo-latin.woff2', '../assets/fonts/rubik-hebrew.woff2', '../assets/fonts/rubik-latin.woff2',
];

self.addEventListener('install', (e) => {
  // cache: 'reload' — עוקף את מטמון ה-HTTP כדי שהגרסה החדשה תיטען במלואה
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    // מוחקים רק מטמונים ישנים של האפליקציה הזאת (studio-…). באותו דומיין רצות גם אפליקציות אחרות (LOHEM) — לא נוגעים במטמונים שלהן.
    await Promise.all(keys.filter((k) => k.startsWith('studio-en-') && k !== VERSION && k !== MEDIA_CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});
// שומר תגובת מדיה עם תג גרסת המדיה (כדי לדעת מתי לרענן אותה)
async function putMedia(req, res) {
  if (!res.ok || res.status !== 200 || res.type === 'opaque') return;
  const headers = new Headers(res.headers);
  headers.set(MEDIA_TAG, MEDIA);
  const body = await res.blob();
  const cache = await caches.open(MEDIA_CACHE);
  await cache.put(req, new Response(body, { status: 200, statusText: res.statusText, headers }));
}
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.headers.has('range')) return; // וידאו: בקשות טווח הולכות ישר לרשת
  if (url.pathname.endsWith('/version.json')) { e.respondWith(fetch(req, { cache: 'no-store' }).catch(() => caches.match(req))); return; }
  if (url.origin !== location.origin) return; // בקשות לשירותים חיצוניים (מאגר הברקודים) עוברות ישר לרשת
  const isMedia = /\/assets\/(demos|voice|voice-en|music)\//.test(url.pathname);
  if (isMedia) {
    e.respondWith(caches.open(MEDIA_CACHE).then((c) => c.match(req)).then((hit) => {
      if (hit) {
        if (hit.headers.get(MEDIA_TAG) === MEDIA) return hit;
        // גרסת מדיה חדשה. קול: קודם מהרשת (בקשה מותנית — אם הקובץ לא השתנה, כמעט בלי תעבורה), כדי שהקלטה שהוחלפה תישמע
        // כבר בפעם הראשונה אחרי העדכון ולא רק בפעם שאחריה; בלי קליטה, או אם הרשת איטית — ההקלטה השמורה.
        const fresh = fetch(req, { cache: 'no-cache' }).then((res) => { if (!res.ok) throw new Error('bad'); e.waitUntil(putMedia(req, res.clone()).catch(() => {})); return res; });
        if (/\/assets\/voice(-en)?\//.test(url.pathname)) return Promise.race([fresh, new Promise((_, no) => setTimeout(no, 3000))]).catch(() => hit);
        // סרטונים ומוזיקה (קבצים גדולים): מגישים את השמור ומרעננים ברקע
        e.waitUntil(fresh.catch(() => {}));
        return hit;
      }
      return fetch(req).then((res) => { e.waitUntil(putMedia(req, res.clone()).catch(() => {})); return res; });
    }));
    return;
  }
  // קוד: רשת קודם (עם אימות מול השרת), ואם אין קליטה — מהמטמון
  e.respondWith(fetch(req, { cache: 'no-cache' }).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html'))));
});

// ───── תזכורות Push ─────
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { title: 'MOVA', body: e.data?.text() || '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'MOVA', {
    body: d.body || '', tag: d.tag || 'lohem', renotify: true, lang: 'en', dir: 'ltr',
    icon: '../assets/icons/icon-192.png', badge: '../assets/icons/icon-192.png', data: { url: d.url || './#/home' },
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || './#/home', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const w = list.find((c) => c.url.startsWith(self.registration.scope));
    if (w) { w.navigate?.(url); return w.focus(); }
    return self.clients.openWindow(url);
  }));
});
