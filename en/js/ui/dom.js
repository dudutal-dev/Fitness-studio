// עזרי DOM קטנים: תבניות, טוסט, sheet, קונפטי, אייקונים.
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function html(strings, ...vals) {
  return strings.reduce((out, s, i) => out + s + (i < vals.length ? (Array.isArray(vals[i]) ? vals[i].join('') : vals[i] ?? '') : ''), '');
}

export function el(markup) {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstElementChild;
}

// מאזין אירועים מואצל: on(root, 'click', '[data-act]', fn)
// רישום חוזר עם אותו (type, sel) מחליף את המטפל הקודם — כך רינדור מחדש של מסך לא מכפיל מאזינים.
export function on(root, type, sel, fn) {
  root._on ||= {};
  const key = `${type}|${sel}`;
  if (!root._on[key]) {
    root.addEventListener(type, (e) => {
      const t = e.target.closest(sel);
      if (t && root.contains(t)) root._on[key](e, t);
    });
  }
  root._on[key] = fn;
}

let toastT;
export function toast(text, ms = 2600) {
  document.querySelector('.toast')?.remove();
  const t = el(`<div class="toast" role="status">${esc(text)}</div>`);
  document.body.append(t);
  clearTimeout(toastT);
  toastT = setTimeout(() => t.remove(), ms);
}

export function sheet(markup, { onMount, onClose } = {}) {
  const back = el('<div class="sheet-back"></div>');
  const sh = el(`<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${markup}</div>`);
  const close = () => { back.remove(); sh.remove(); onClose?.(); };
  back.addEventListener('click', close);
  on(sh, 'click', '[data-close]', close);
  document.body.append(back, sh);
  swipeToClose(sh, back, close);
  onMount?.(sh, close);
  return close;
}

// גרירה מלמעלה למטה סוגרת את החלונית. מתחילה רק כשהתוכן גלול לראש (או מהידית), כדי לא להתנגש בגלילה רגילה.
function swipeToClose(sh, back, close) {
  let y0 = 0, x0 = 0, t0 = 0, dy = 0, drag = false, armed = false;
  const set = (v) => { sh.style.transform = `translate(-50%, ${v}px)`; back.style.opacity = String(Math.max(0.25, 1 - v / 500)); };
  sh.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    const t = e.target;
    const onGrab = !!t.closest?.('.grab');
    // לא מתחילים גרירה מתוך אזור שנגלל בעצמו, או מפקד שגוררים אותו (מחוון, שדה טקסט)
    const inner = t.closest?.('.food-res, .chips.scroll, input, textarea, select');
    armed = onGrab || (sh.scrollTop <= 0 && !inner);
    drag = false; dy = 0;
    y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; t0 = Date.now();
  }, { passive: true });
  sh.addEventListener('touchmove', (e) => {
    if (!armed) return;
    const cy = e.touches[0].clientY - y0, cx = e.touches[0].clientX - x0;
    if (!drag) {
      if (cy < 8 || Math.abs(cx) > cy) { if (cy < -4 || Math.abs(cx) > 12) armed = false; return; }
      drag = true;
      sh.style.animation = 'none'; sh.style.transition = 'none'; back.style.transition = 'none';
    }
    dy = Math.max(0, cy);
    set(dy);
    if (e.cancelable) e.preventDefault();
  }, { passive: false });
  const end = () => {
    if (!drag) return;
    drag = false; armed = false;
    const fast = dy / Math.max(1, Date.now() - t0) > 0.55; // פיקסלים למילישנייה — החלקה מהירה
    sh.style.transition = 'transform 0.22s cubic-bezier(.2,.8,.2,1)'; back.style.transition = 'opacity 0.22s';
    if (dy > 110 || (fast && dy > 40)) {
      sh.style.transform = 'translate(-50%, 105%)'; back.style.opacity = '0';
      setTimeout(close, 200);
    } else { sh.style.transform = 'translate(-50%, 0)'; back.style.opacity = ''; }
  };
  sh.addEventListener('touchend', end);
  sh.addEventListener('touchcancel', end);
}

export function confetti(n = 90) {
  const box = el('<div class="confetti"></div>');
  const colors = ['#ff8a4c', '#56c7f2', '#ffc857', '#4fd1a1', '#ffffff'];
  for (let i = 0; i < n; i++) {
    const c = document.createElement('i');
    c.style.left = `${Math.random() * 100}%`;
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = `${1.8 + Math.random() * 1.8}s`;
    c.style.animationDelay = `${Math.random() * 0.6}s`;
    c.style.transform = `rotate(${Math.random() * 360}deg)`;
    box.append(c);
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 4500);
}

export function vibrate(p = 30) { try { navigator.vibrate?.(p); } catch { /* */ } }

export const fmtTime = (sec) => {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
};

export const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

export function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Good night';
}

// ערכת אייקונים דו-גונית (SVG): קו + שכבת מילוי שקופה (class="d") באותו צבע. אחידה בכל המכשירים — בלי אמוג׳י.
const P = {
  // ניווט
  home: '<path class="d" d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z"/><path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z"/><path d="M9.5 20.5V14h5v6.5"/>',
  plan: '<rect class="d" x="3.5" y="5" width="17" height="15.5" rx="3.5"/><rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14.5h3M8 17.5h6"/>',
  bolt: '<path class="d" d="M13 2.5 5 13.5h6l-1 8 8-11h-6z"/><path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z"/>',
  chart: '<rect class="d" x="15.5" y="4" width="5" height="16.5" rx="1.6"/><rect x="3.5" y="13" width="5" height="7.5" rx="1.6"/><rect x="9.5" y="8.5" width="5" height="12" rx="1.6"/><rect x="15.5" y="4" width="5" height="16.5" rx="1.6"/>',
  food: '<path class="d" d="M15 3c-1.7 1.8-2.5 4.6-2.5 8h4V3z"/><path d="M7 3v8.5a2.5 2.5 0 0 0 0 0V21M4 3v5a3 3 0 0 0 6 0V3M16.5 21V3c-2.5 1.8-4 4.6-4 8h4"/>',
  coach: '<circle class="d" cx="12" cy="8" r="4"/><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  // פעולות
  play: '<path class="d" d="M7 4.5 19.5 12 7 19.500z"/><path d="M7 4.5 19.5 12 7 19.500z"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  swap: '<path d="M4 7.500h13l-3-3M20 16.500H7l3 3"/>',
  refresh: '<path d="M4.5 11a7.5 7.5 0 0 1 13.2-4L20 9.500M20 4.500v5h-5M19.5 13a7.5 7.5 0 0 1-13.2 4L4 14.500M4 19.500v-5h5"/>',
  info: '<circle class="d" cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/>',
  help: '<circle class="d" cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="9"/><path d="M9.5 9.500a2.5 2.5 0 1 1 3.7 2.200c-.8.4-1.2.9-1.2 1.800M12 17h.01"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  skip: '<path d="M5 5l9 7-9 7zM18 5v14"/>',
  vol: '<path class="d" d="M4 9v6h4l5 4V5L8 9z"/><path d="M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>',
  mute: '<path d="M4 9v6h4l5 4V5L8 9zM17 9l5 6M22 9l-5 6"/>',
  tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  check: '<path d="M5 12.500l4.5 4.500L19 7"/>',
  chev: '<path d="M15 6l-6 6 6 6"/>',
  trash: '<path class="d" d="M6.5 7h11l-.8 12a1.5 1.5 0 0 1-1.5 1.500H8.800A1.5 1.5 0 0 1 7.3 19z"/><path d="M4.5 7h15M9.5 7V4.500h5V7M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.500h6.400a1.5 1.5 0 0 0 1.5-1.500l.8-12M10 11v5.500M14 11v5.5"/>',
  edit: '<path class="d" d="M4 20h4L19 9l-4-4L4 16z"/><path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4"/>',
  download: '<path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/>',
  upload: '<path d="M12 20V9"/><path d="M7 14l5-5 5 5"/><path d="M5 4h14"/>',
  star: '<path class="d" d="M12 3.500l2.6 5.4 5.9.8-4.3 4.1 1 5.800L12 16.900l-5.2 2.7 1-5.800L3.5 9.700l5.9-.8z"/><path d="M12 3.500l2.6 5.4 5.9.8-4.3 4.1 1 5.800L12 16.900l-5.2 2.7 1-5.800L3.5 9.700l5.9-.8z"/>',
  clock: '<circle class="d" cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="8.5"/><path d="M12 7.500V12l3 2"/>',
  // שלבי חזרה
  phUp: '<path d="M6 13l6-6 6 6"/><path d="M6 19l6-6 6 6" opacity=".45"/>',
  phDown: '<path d="M6 11l6 6 6-6"/><path d="M6 5l6 6 6-6" opacity=".45"/>',
  phPull: '<path d="M19 12H7"/><path d="M11 7l-5 5 5 5"/><path d="M3 5v14"/>',
  phRelease: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>',
  phHold: '<rect x="7" y="5" width="3.5" height="14" rx="1.2"/><rect x="13.5" y="5" width="3.5" height="14" rx="1.2"/>',
  // אימון וגוף
  run: '<circle class="d" cx="14" cy="4.5" r="2"/><circle cx="14" cy="4.5" r="2"/><path d="M7 21l3-6 3 2v5M6 11l3-3 4 1 2 4 3 1"/>',
  pack: '<rect class="d" x="5" y="7" width="14" height="14" rx="3"/><rect x="5" y="7" width="14" height="14" rx="3"/><path d="M9 7V5a3 3 0 0 1 6 0v2M5 13h14"/>',
  dumbbell: '<rect class="d" x="5" y="7" width="3.5" height="10" rx="1.5"/><rect class="d" x="15.5" y="7" width="3.5" height="10" rx="1.5"/><rect x="5" y="7" width="3.5" height="10" rx="1.5"/><rect x="15.5" y="7" width="3.5" height="10" rx="1.5"/><path d="M8.5 12h7M2.5 10v4M21.5 10v4"/>',
  flame: '<path class="d" d="M12 2.500c.5 3.5 5.5 5.5 5.5 11a5.5 5.5 0 0 1-11 0c0-2 1-3.6 2.2-4.6.2 1.6 1 2.6 2 3 .1-3.3-.2-6.4 1.3-9.400z"/><path d="M12 2.500c.5 3.5 5.5 5.5 5.5 11a5.5 5.5 0 0 1-11 0c0-2 1-3.6 2.2-4.6.2 1.6 1 2.6 2 3 .1-3.3-.2-6.4 1.3-9.400z"/>',
  heart: '<path class="d" d="M12 20s-7.5-4.6-7.5-10.200A4.3 4.3 0 0 1 12 7.200a4.3 4.3 0 0 1 7.5 2.600C19.5 15.4 12 20 12 20z"/><path d="M12 20s-7.5-4.6-7.5-10.200A4.3 4.3 0 0 1 12 7.200a4.3 4.3 0 0 1 7.5 2.600C19.5 15.4 12 20 12 20z"/>',
  pulse: '<rect class="d" x="3" y="4" width="18" height="16" rx="4"/><path d="M3.5 12.500h3.500l2-5 3.5 9.5 2.5-6.5 1.2 2H20.5"/>',
  target: '<circle class="d" cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle class="s" cx="12" cy="12" r="1.3"/>',
  flag: '<path class="d" d="M6 4.500h11l-2.2 3.5 2.2 3.500H6z"/><path d="M6 21V4.500h11l-2.2 3.5 2.2 3.500H6"/>',
  leaf: '<path class="d" d="M5 19c0-8 5-13.5 14.5-14-.3 9-4.5 14.5-12.5 14.5-.7 0-1.4-.2-2-.5z"/><path d="M5 19c0-8 5-13.5 14.5-14-.3 9-4.5 14.5-12.5 14.5-.7 0-1.4-.2-2-.5zM4.5 20.500c2.5-5 5.5-8 10-10.5"/>',
  lotus: '<path class="d" d="M12 5c2.5 2.5 3.5 5.5 3.5 8.500S14 18.5 12 19.500c-2-1-3.5-3-3.5-6S9.5 7.5 12 5z"/><path d="M12 5c2.5 2.5 3.5 5.5 3.5 8.500S14 18.5 12 19.500c-2-1-3.5-3-3.5-6S9.5 7.5 12 5zM3.5 11c3 .3 5 2 6 4.500M20.5 11c-3 .3-5 2-6 4.500M5 19.500h14"/>',
  // מעקב
  drop: '<path class="d" d="M12 3s6.5 6.6 6.5 11.200a6.5 6.5 0 0 1-13 0C5.5 9.6 12 3 12 3z"/><path d="M12 3s6.5 6.6 6.5 11.200a6.5 6.5 0 0 1-13 0C5.5 9.6 12 3 12 3zM9 14.500a3 3 0 0 0 2.5 2.8"/>',
  scale: '<rect class="d" x="3.5" y="4" width="17" height="16.5" rx="4.5"/><rect x="3.5" y="4" width="17" height="16.5" rx="4.5"/><path d="M8 11a4.5 4.5 0 0 1 8 0M12 11l1.8-2.3"/>',
  bell: '<path class="d" d="M6 16.500V11a6 6 0 0 1 12 0v5.500l1.5 2h-15z"/><path d="M6 16.500V11a6 6 0 0 1 12 0v5.500l1.5 2h-15zM10 21a2.2 2.2 0 0 0 4 0"/>',
  // הישגים
  trophy: '<path class="d" d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 4h10v5a5 5 0 0 1-10 0zM7 5.500H4.500V7A3 3 0 0 0 7.2 10M17 5.500h2.500V7a3 3 0 0 1-2.7 3M12 14v3.500M8.5 20.500h7M9.5 17.500h5"/>',
  medal: '<circle class="d" cx="12" cy="15" r="5.5"/><circle cx="12" cy="15" r="5.5"/><path d="M8.5 3l2 6.200M15.5 3l-2 6.200M10 15.200l1.5 1.5 2.7-3"/>',
  rocket: '<path class="d" d="M12 2.500c3 2 4.5 5.5 4.5 9.500l-1.5 4H9l-1.5-4c0-4 1.5-7.5 4.5-9.500z"/><path d="M12 2.500c3 2 4.5 5.5 4.5 9.500l-1.5 4H9l-1.5-4c0-4 1.5-7.5 4.5-9.500zM7.5 12.5 5 16.500l3.3-.6M16.5 12.500l2.5 4-3.3-.6M10.5 19c.3 1.2 1 2 1.5 2.5.500-.5 1.2-1.3 1.5-2.5"/><circle cx="12" cy="9" r="1.6"/>',
  chat: '<path class="d" d="M4 6.500A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.500v7a2.5 2.5 0 0 1-2.5 2.500H10l-4.5 4v-4A2.5 2.5 0 0 1 4 13.500z"/><path d="M4 6.500A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.500v7a2.5 2.5 0 0 1-2.5 2.500H10l-4.5 4v-4A2.5 2.5 0 0 1 4 13.500z"/>',
  sparkle: '<path class="d" d="M11 3.500l1.9 5.6 5.6 1.9-5.6 1.900L11 18.500l-1.9-5.600L3.5 11l5.6-1.900z"/><path d="M11 3.500l1.9 5.6 5.6 1.9-5.6 1.900L11 18.500l-1.9-5.600L3.5 11l5.6-1.900zM18.5 15.500l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
  // דרגות
  rank1: '<path d="M6 15l6-5.5 6 5.5"/>',
  rank2: '<path d="M6 12l6-5.5 6 5.500M6 18l6-5.5 6 5.5"/>',
  rank3: '<path d="M6 9.5 12 4l6 5.500M6 14.5 12 9l6 5.500M6 19.5 12 14l6 5.5"/>',
  shield: '<path class="d" d="M12 3l7.5 2.800v5.700c0 4.6-3.1 8-7.5 9.5-4.4-1.5-7.5-4.9-7.5-9.500V5.800z"/><path d="M12 3l7.5 2.800v5.700c0 4.6-3.1 8-7.5 9.5-4.4-1.5-7.5-4.9-7.5-9.500V5.800zM9 12l2.2 2.200L15.2 10"/>',
  crown: '<path class="d" d="M4 8l4 4 4-6.5 4 6.5 4-4-1.5 10.500h-13z"/><path d="M4 8l4 4 4-6.5 4 6.5 4-4-1.5 10.500h-13z"/>',
  // ארוחות ומזון
  sunrise: '<path class="d" d="M7 17a5 5 0 0 1 10 0z"/><path d="M7 17a5 5 0 0 1 10 0M3 17h18M12 5.500V8M5.3 9.3 7 11M18.7 9.3 17 11M7 20.500h10"/>',
  apple: '<path class="d" d="M12 7.500c-1.6-1.2-4-1.3-5.4.3-1.8 2-1.3 6 .4 8.8 1 1.6 2.2 2.6 3.3 2.6.8 0 1-.4 1.7-.4s.9.4 1.7.4c1.1 0 2.3-1 3.3-2.6 1.7-2.8 2.2-6.8.4-8.8-1.4-1.6-3.8-1.5-5.4-.3z"/><path d="M12 7.500c-1.6-1.2-4-1.3-5.4.3-1.8 2-1.3 6 .4 8.8 1 1.6 2.2 2.6 3.3 2.6.8 0 1-.4 1.7-.4s.9.4 1.7.4c1.1 0 2.3-1 3.3-2.6 1.7-2.8 2.2-6.8.4-8.8-1.4-1.6-3.8-1.5-5.4-.3zM12 7.500c0-2 .8-3.5 2.5-4.5"/>',
  plate: '<circle class="d" cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/>',
  moon: '<path class="d" d="M20 14.500A8.5 8.5 0 1 1 9.5 4 7 7 0 0 0 20 14.500z"/><path d="M20 14.500A8.5 8.5 0 1 1 9.5 4 7 7 0 0 0 20 14.500z"/>',
  wheat: '<path d="M12 21V7M12 7c0-1.5.8-2.8 2-3.500M12 11.500c-2.5 0-4-1.5-4-4 2.5 0 4 1.5 4 4zM12 11.500c2.5 0 4-1.5 4-4-2.5 0-4 1.5-4 4zM12 16.500c-2.5 0-4-1.5-4-4 2.5 0 4 1.5 4 4zM12 16.500c2.5 0 4-1.5 4-4-2.5 0-4 1.5-4 4z"/>',
  medic: '<rect class="d" x="4" y="4" width="16" height="16" rx="4.5"/><rect x="4" y="4" width="16" height="16" rx="4.5"/><path d="M12 8.500v7M8.5 12h7"/>',
  // מערכת
  gear: '<path class="d" d="M10.300 3h3.400l.5 2.400 1.700 1 2.300-.8 1.700 3-1.800 1.600v2l1.800 1.600-1.700 3-2.300-.8-1.700 1-.5 2.400h-3.400l-.5-2.400-1.700-1-2.300.8-1.700-3 1.800-1.600v-2L4.100 8.600l1.700-3 2.300.8 1.700-1z"/><path d="M10.300 3h3.400l.5 2.400 1.700 1 2.300-.8 1.700 3-1.800 1.600v2l1.800 1.600-1.700 3-2.300-.8-1.700 1-.5 2.400h-3.400l-.5-2.400-1.700-1-2.300.8-1.700-3 1.800-1.600v-2L4.100 8.600l1.700-3 2.300.8 1.700-1z"/><circle cx="12" cy="12" r="2.800"/>',
  scan: '<path d="M4 8V6.5A2.5 2.5 0 0 1 6.5 4H8M16 4h1.5A2.5 2.5 0 0 1 20 6.5V8M20 16v1.500A2.500 2.500 0 0 1 17.500 20H16M8 20H6.500A2.500 2.500 0 0 1 4 17.500V16M8 8.500v7M11 8.500v7M13.500 8.500v7M16 8.500v7"/>',
  phone: '<rect class="d" x="7" y="2.5" width="10" height="19" rx="2.8"/><rect x="7" y="2.5" width="10" height="19" rx="2.8"/><path d="M11 18.500h2"/>',
  sliders: '<path d="M4.5 7h8.500M17.5 7h2M4.5 17h2M11 17h8.5"/><circle class="d" cx="15.3" cy="7" r="2.2"/><circle cx="15.3" cy="7" r="2.2"/><circle class="d" cx="8.7" cy="17" r="2.2"/><circle cx="8.7" cy="17" r="2.2"/>',
  signal: '<path d="M5 19v-3M9.7 19v-6.500M14.3 19V9M19 19V5"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3A4 4 0 0 0 13 5.300l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.700l1-1"/>',
  book: '<path class="d" d="M5 4.500h11a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z"/><path d="M5 4.500h11a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11"/>',
  ban: '<circle class="d" cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',
  warn: '<path class="d" d="M12 4l9 15.500H3z"/><path d="M12 4l9 15.500H3zM12 10v4.500M12 17.500h.01"/>',
  compass: '<circle cx="12" cy="12" r="8.5"/><path class="d" d="M15.5 8.500l-2 5-5 2 2-5z"/><path d="M15.5 8.500l-2 5-5 2 2-5z"/>',
  save: '<path class="d" d="M5 4.500h11l3 3V19a1.5 1.5 0 0 1-1.5 1.500h-11A1.5 1.5 0 0 1 5 19z"/><path d="M5 4.500h11l3 3V19a1.5 1.5 0 0 1-1.5 1.500h-11A1.5 1.5 0 0 1 5 19zM8.5 20.500v-6h7v6M8.5 4.500v4h6"/>',
};
// פנים: מצב רוח 1 (רע) עד 5 (מצוין)
const MOUTH = ['', 'M8.5 16.500q3.5-3.6 7 0', 'M9 16q3-2 6 0', 'M9 15.500h6', 'M9 14.500q3 2.5 6 0', 'M8.5 14q3.5 4.2 7 0'];
for (let n = 1; n <= 5; n++) P[`face${n}`] = `<circle class="d" cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="8.5"/><path d="${MOUTH[n]}"/><circle class="s" cx="9" cy="10" r="1.1"/><circle class="s" cx="15" cy="10" r="1.1"/>`;
// מד מאמץ: 1–4 עמודות מלאות
for (let n = 1; n <= 4; n++) P[`effort${n}`] = [0, 1, 2, 3].map((i) => `<rect class="s" x="${4 + i * 4.4}" y="${15 - i * 3.3}" width="3" height="${5 + i * 3.3}" rx="1.2" opacity="${i < n ? 1 : 0.22}"/>`).join('');

export const icon = (name, extra = '') => `<svg ${extra ? '' : 'class="i" '}viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${P[name] || ''}</svg>`;
// אייקון בתוך אריח צבעוני: ib('drop', 'acc') ; גדלים: sm / lg / xl
export const ib = (name, tone = '', size = '') => `<span class="ib ${tone} ${size}">${icon(name)}</span>`;

// המרה של אמוג׳י (מנתונים ישנים/טקסטים) לאייקון מהערכה; אמוג׳י לא מוכר נשאר כמו שהוא
const EMOJI = {
  '🧭': 'compass', '📲': 'phone', '✅': 'check', '🔄': 'refresh', '🔔': 'bell', '📴': 'signal', '⚙️': 'sliders', '🎯': 'target', '💧': 'drop', '🎒': 'pack', '👤': 'coach', '❓': 'help',
  '🧘': 'lotus', '🔁': 'swap', '🔊': 'vol', '🏃': 'run', '⚡': 'bolt', '📡': 'signal', '🏁': 'flag', '📈': 'chart', '🗓️': 'plan', '📊': 'chart', '✏️': 'edit', '🎖️': 'medal', '🍽️': 'food',
  '📒': 'book', '🪖': 'shield', '🚫': 'ban', '💪': 'dumbbell', '😴': 'moon', '⚠️': 'warn', '💾': 'save', '🔗': 'link', '🍏': 'apple', '🛰️': 'compass', '📤': 'upload', '🏋️': 'dumbbell',
  '🍅': 'apple', '🍌': 'apple', '🌾': 'wheat', '🥤': 'drop', '💊': 'medic', '🥩': 'food', '⏰': 'clock', '🌙': 'moon', '🌈': 'leaf', '🏆': 'trophy', '🚀': 'rocket', '💬': 'chat', '🔥': 'flame',
  '🌿': 'leaf', '⭐': 'star', '❤': 'heart', '💡': 'sparkle', '🧠': 'sparkle', '🔰': 'rank1', '🛡️': 'shield', '⚔️': 'rank3', '🦅': 'star', '👑': 'crown', '🌅': 'sunrise',
};
export const em = (x, tone = '', size = '') => (P[x] ? ib(x, tone, size) : EMOJI[x] ? ib(EMOJI[x], tone, size) : x);
// כמו em אבל בלי אריח — לשילוב בתוך שורת טקסט
export const emi = (x) => (P[x] ? icon(x) : EMOJI[x] ? icon(EMOJI[x]) : x);
