// נקודת כניסה: ניתוב (hash), ניווט תחתון, אונבורדינג, רישום Service Worker.
import { playIntro } from './intro.js';
import { get, set, regenerateWeek } from './store.js';
import { LANG } from './lang.js';
import { icon } from './ui/dom.js';
import { renderOnboarding } from './views/onboarding.js';
import { renderHome, nextSession, begin } from './views/home.js';
import { renderPlan } from './views/plan.js';
import { renderProgress } from './views/progress.js';
import { renderNutrition } from './views/nutrition.js';
import { renderCoach } from './views/coach.js';
import { startWorkout } from './views/workout.js';
import { unlock, warmVoiceCache } from './coach/voice.js';
import { warmMedia, planMedia, warmMedArt } from './media-warm.js';
import { MED_ALL } from './data/med-lines.js';
import { STILL_ALL } from './data/med-still.js';
import { sessionCoach } from './engine/cali.js';
import { openPlanIntro } from './views/plan-intro.js';
import { initUpdater } from './updater.js';
import { initLicense } from './lic.js';
import { initUsage } from './usage.js';
import { openGuide } from './views/guide.js';
import { applyTheme } from './theme.js';

const ROUTES = { home: renderHome, plan: renderPlan, progress: renderProgress, nutrition: renderNutrition, coach: renderCoach };
const app = document.getElementById('app');

function shell() {
  app.innerHTML = `<main id="view"></main>
  <nav class="nav" aria-label="ניווט"><div class="nav-inner">
    <a href="#/home" data-r="home">${icon('home')}בית</a>
    <a href="#/plan" data-r="plan">${icon('plan')}תוכנית</a>
    <a href="#/go" class="go" aria-label="התחל אימון">${icon('bolt')}</a>
    <a href="#/progress" data-r="progress">${icon('chart')}התקדמות</a>
    <a href="#/nutrition" data-r="nutrition">${icon('food')}תזונה</a>
  </div></nav>`;
}

function route() {
  const s = get();
  applyTheme();
  // מדריך: נפתח רק כשמבקשים אותו (#/guide) — מהכפתור במסך השער או מההגדרות. לא עולה לבד בפתיחה הראשונה.
  if (location.hash === '#/guide') {
    if (!document.querySelector('.guide')) openGuide({ first: !s.profile?.name, onDone: () => { if (location.hash === '#/guide') history.replaceState(null, '', '#/home'); route(); } });
    if (!s.profile?.name || !s.plan) return;   // עוד לפני ההיכרות: המדריך מעל מסך השער, שיצויר כשהמדריך ייסגר
  }
  document.body.classList.toggle('no-captions', s.settings?.captions === false);
  if (!s.profile?.name || !s.plan) {
    app.innerHTML = '';
    const c = document.createElement('div');
    app.append(c);
    renderOnboarding(c, () => { location.hash = '#/home'; shell(); route(); });
    return;
  }
  if (!document.getElementById('view')) shell();
  // מיד אחרי ההיכרות: מסך "התוכנית שלך" (אימונים ותזונה) לפני מסך הבית. מוצג פעם אחת — גם אם האפליקציה נסגרה באמצע.
  if (s.planSeen === false && !document.querySelector('.plan-intro')) openPlanIntro((dest) => { if (dest !== 'home') location.hash = `#/${dest}`; });
  let r = (location.hash.replace('#/', '') || 'home').split('?')[0];
  if (r === 'go') {
    const ns = nextSession(s);
    history.replaceState(null, '', '#/home');
    r = 'home';
    if (ns) begin(ns);
  }
  if (!ROUTES[r]) r = 'home';
  const view = document.getElementById('view');
  view._cleanup?.();
  const c = document.createElement('div');
  view.replaceChildren(c);
  view.style.animation = 'none'; void view.offsetWidth; view.style.animation = '';
  ROUTES[r](c);
  view._cleanup = c._cleanup;
  document.querySelectorAll('.nav a[data-r]').forEach((a) => a.classList.toggle('on', a.dataset.r === r || (r === 'coach' && false)));
  window.scrollTo(0, 0);
}

// השפה הוחלפה מאז הפעם הקודמת: התוכנית השבועית נבנית מחדש, כדי ששמות האימונים יהיו בשפה הנוכחית
if (get().profile?.name && get().plan && (get().lang || 'he') !== LANG) set((s) => { s.lang = LANG; return regenerateWeek(s); });
addEventListener('hashchange', route);
addEventListener('pointerdown', unlock, { passive: true }); // כל נגיעה מוודאת שהאודיו פתוח (אייפון משהה אותו ברקע)
route();
playIntro();

initUpdater();
// תזכורת קופצת בשעת האימון, כשהאפליקציה פתוחה ("מתחילים" עובר לבית ומתחיל את האימון הבא)
const dueCheck = () => import('./views/reminders-ui.js').then((m) => m.checkWorkoutDue(() => { location.hash = '#/home'; setTimeout(() => document.querySelector('#view [data-act="start"]')?.click(), 400); })).catch(() => {});
setInterval(dueCheck, 30000); setTimeout(dueCheck, 4000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(dueCheck, 1500); });
initUsage();     // סטטיסטיקת שימוש: שמות רכיבים ומונים בלבד (אפשר לכבות בהגדרות)
initLicense();   // קישור הפעלה אישי — חוסם רק כשהאכיפה מופעלת במסך הניהול
// קובצי הקול של המאמן יורדים ברקע כמה שניות אחרי הפתיחה (ושוב אחרי החלפת מאמן)
setTimeout(warmVoiceCache, 5000);
setTimeout(() => warmMedArt([...MED_ALL, ...STILL_ALL]).catch(() => {}), 2500);   // איורי המדיטציה: קטנים, יורדים ראשונים
addEventListener('hashchange', () => setTimeout(warmVoiceCache, 3000));
// התמונות והסרטונים של המאמנים יורדים לטלפון ברקע (אחרי הקול), כדי שהאימון יעבוד מיד וגם בלי קליטה
const warmDemos = () => warmMedia(planMedia(get(), sessionCoach)).catch(() => {});
setTimeout(warmDemos, 12000);
addEventListener('hashchange', () => setTimeout(warmDemos, 8000));
