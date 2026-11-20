// ערכת נושא: כהה / בהירה / לפי המכשיר. נקבעת גם בסקריפט קטן ב-index.html (לפני הציור) כדי שלא יהבהב.
import { get } from './store.js';

const mq = matchMedia('(prefers-color-scheme: light)');

export function resolvedTheme(pref = get().settings?.theme || 'dark') {
  return pref === 'auto' ? (mq.matches ? 'light' : 'dark') : pref;
}

export function applyTheme() {
  const t = resolvedTheme();
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'light' ? '#e8ecf0' : '#0f161d');
}

mq.addEventListener?.('change', () => { if ((get().settings?.theme || 'dark') === 'auto') applyTheme(); });
