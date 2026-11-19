// רכיבי UI משותפים לשעון: תג דופק חי (במסכי אימון/ריצה) וחיבור לשעון.
import { el, toast, esc } from '../ui/dom.js';
import { supported, isConnected, connect, onHR, current, zoneOf, maxHrFor, deviceName } from './hr.js';
import { get, set } from '../store.js';
import { say } from '../coach/voice.js';

export async function connectWatch() {
  if (!supported()) {
    toast(isIOS() ? 'באייפון: פתח את האפליקציה בדפדפן Bluefy כדי לחבר שעון בלייב' : 'הדפדפן לא תומך ב-Bluetooth (נסה Chrome)', 4200);
    return false;
  }
  try {
    const name = await connect();
    set((s) => { s.settings.watchName = name; return s; });
    say('watch_on', { priority: true });
    toast(`⌚ מחובר: ${name}`);
    return true;
  } catch (e) {
    if (e?.name !== 'NotFoundError') toast(`החיבור נכשל: ${e.message || e}`, 4000);
    return false;
  }
}

export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// תג דופק: מחובר → ❤ 152 · Z4 ; לא מחובר + נתמך → כפתור "חבר שעון"
export function hrPill() {
  const node = el('<button class="hr-pill" type="button"></button>');
  const max = maxHrFor(get().profile);
  const paint = () => {
    const c = current();
    if (isConnected() && c.hr) {
      const z = zoneOf(c.hr, max);
      node.className = 'hr-pill on';
      node.style.setProperty('--z', z.color);
      node.style.setProperty('--beat', `${Math.max(0.3, 60 / c.hr)}s`);
      node.innerHTML = `<i class="heart">❤</i><b class="num">${c.hr}</b><small>Z${z.z}</small>`;
      node.title = `${z.name} · ${z.pct}% מדופק מקסימלי`;
    } else if (isConnected()) {
      node.className = 'hr-pill';
      node.innerHTML = '<i class="heart">❤</i><small>ממתין…</small>';
    } else if (supported()) {
      node.className = 'hr-pill';
      node.innerHTML = '⌚ <small>חבר שעון</small>';
    } else {
      node.style.display = 'none';
    }
  };
  node.addEventListener('click', () => { if (!isConnected()) connectWatch().then(paint); });
  const off = onHR(paint);
  paint();
  node._destroy = off;
  return node;
}

export function hrSummaryHtml(hr) {
  if (!hr) return '';
  const total = hr.zones.reduce((a, b) => a + b, 0) || 1;
  const cols = ['#8b95a1', '#5aa9ff', '#2bb673', '#ff8a3d', '#ff4d5e'];
  return `<div class="card tight" style="margin-top:12px"><div class="row"><span style="font-size:22px">❤</span><b>דופק ממוצע <span class="num">${hr.avg}</span> · מקסימום <span class="num">${hr.max}</span></b></div>
    <div class="zbar">${hr.zones.map((s, i) => `<i style="flex:${s || 0.0001};background:${cols[i]}" title="Z${i + 1}"></i>`).join('')}</div>
    <div class="row between sub" style="font-size:11px">${hr.zones.map((s, i) => `<span>Z${i + 1} ${Math.round((s / total) * 100)}%</span>`).join('')}</div></div>`;
}

export function watchStatusText() {
  if (isConnected()) return `מחובר: ${esc(deviceName() || '')}`;
  const last = get().settings.watchName;
  return last ? `לא מחובר (אחרון: ${esc(last)})` : 'לא מחובר';
}
