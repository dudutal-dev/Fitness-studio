// נקודת כניסה: ניתוב (hash), ניווט תחתון, אונבורדינג, רישום Service Worker.
import { get } from './store.js';
import { icon } from './ui/dom.js';
import { renderOnboarding } from './views/onboarding.js';
import { renderHome, nextSession, checkIn } from './views/home.js';
import { renderPlan } from './views/plan.js';
import { renderProgress } from './views/progress.js';
import { renderNutrition } from './views/nutrition.js';
import { renderCoach } from './views/coach.js';
import { startWorkout } from './views/workout.js';
import { unlock, warmVoiceCache } from './coach/voice.js';
import { initUpdater } from './updater.js';
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
  // מדריך: בפתיחה הראשונה (וגם אחרי איפוס), או כשמבקשים #/guide
  if (!s.guideSeen || location.hash === '#/guide') {
    if (!document.querySelector('.guide')) {
      const first = !s.guideSeen;
      openGuide({ first, onDone: () => { if (location.hash === '#/guide') history.replaceState(null, '', '#/home'); route(); } });
    }
    if (!s.guideSeen) return;
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
  let r = (location.hash.replace('#/', '') || 'home').split('?')[0];
  if (r === 'go') {
    const ns = nextSession(s);
    history.replaceState(null, '', '#/home');
    r = 'home';
    if (ns) checkIn((rd) => startWorkout(ns, { readiness: rd }));
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

addEventListener('hashchange', route);
addEventListener('pointerdown', unlock, { passive: true }); // כל נגיעה מוודאת שהאודיו פתוח (אייפון משהה אותו ברקע)
route();

initUpdater();
// קובצי הקול של המאמן יורדים ברקע כמה שניות אחרי הפתיחה (ושוב אחרי החלפת מאמן)
setTimeout(warmVoiceCache, 5000);
addEventListener('hashchange', () => setTimeout(warmVoiceCache, 3000));
