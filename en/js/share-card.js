// תמונת סיכום אימון לשיתוף (וואטסאפ, אינסטגרם ועוד): מצוירת על canvas בטלפון עצמו — שום דבר לא נשלח לשרת.
// בתמונה: המאמן, שם האימון, התאריך, שלושה מספרים גדולים, שיאים אישיים אם היו, ושם האפליקציה. בלי שם המתאמן ובלי נתוני גוף.
// הקובץ זהה בשלוש האפליקציות; שם האפליקציה נלקח מכותרת העמוד.
import { sheet, toast } from './ui/dom.js';

const W = 1080, H = 1350, PAD = 72;
const FONT = "'Heebo', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif", NUM = "'Rubik', 'Heebo', system-ui, sans-serif";
const img = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
// מקטין את הגופן עד שהטקסט נכנס ברוחב
function fit(c, text, weight, size, family, max) { do { c.font = `${weight} ${size}px ${family}`; if (c.measureText(text).width <= max) break; size -= 4; } while (size > 28); return size; }

// data: { title, eyebrow, coachImg, kpis: [[ערך, תווית], …] (עד 3), lines: [טקסט, …] (עד 2), accent }
export async function drawCard(data) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'), accent = data.accent || '#ff8a4c';
  try { await Promise.all([document.fonts.load(`800 80px ${FONT}`), document.fonts.load(`800 80px ${NUM}`)]); } catch { /* גופן המערכת */ }
  const [photo, logo] = await Promise.all([data.coachImg ? img(data.coachImg) : null, img('../assets/icons/icon-192.png')]);
  c.direction = 'rtl'; c.textAlign = 'right'; c.textBaseline = 'alphabetic';
  // רקע
  c.fillStyle = '#0b0d13'; c.fillRect(0, 0, W, H);
  const PH = 580;
  if (photo) {   // תמונת המאמן: חיתוך מהחלק העליון, דועכת אל הרקע
    const s = Math.max(W / photo.width, PH / photo.height), dw = photo.width * s, dh = photo.height * s;
    c.drawImage(photo, (W - dw) / 2, Math.min(0, (PH - dh) * 0.18), dw, dh);
    c.fillStyle = '#0b0d13'; c.fillRect(0, PH, W, H - PH);
  }
  let g = c.createLinearGradient(0, photo ? 220 : 0, 0, PH); g.addColorStop(0, 'rgba(11,13,19,0)'); g.addColorStop(1, '#0b0d13'); c.fillStyle = g; c.fillRect(0, 0, W, PH + 2);
  g = c.createRadialGradient(W * 0.85, 60, 20, W * 0.85, 60, 620); g.addColorStop(0, accent + '55'); g.addColorStop(1, accent + '00'); c.fillStyle = g; c.fillRect(0, 0, W, 700);
  // כותרת
  const X = W - PAD; let y = PH - 96;
  c.fillStyle = accent; c.font = `800 38px ${FONT}`; c.fillText(data.eyebrow || 'Workout complete', X, y);
  y += 26 + fit(c, data.title, 900, 92, FONT, W - PAD * 2) * 0.9; c.fillStyle = '#fff'; c.fillText(data.title, X, y);
  c.fillStyle = '#9aa3b5'; c.font = `600 36px ${FONT}`; y += 62;
  c.fillText(new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), X, y);
  // מספרים
  const k = (data.kpis || []).slice(0, 3), gap = 24, bw = (W - PAD * 2 - gap * (k.length - 1)) / Math.max(1, k.length), by = y + 56, bh = 236;
  k.forEach(([v, l], i) => {
    const bx = W - PAD - bw - i * (bw + gap);
    rr(c, bx, by, bw, bh, 36); c.fillStyle = 'rgba(255,255,255,0.06)'; c.fill(); c.strokeStyle = 'rgba(255,255,255,0.10)'; c.lineWidth = 2; c.stroke();
    c.textAlign = 'center'; c.direction = 'ltr'; c.fillStyle = i === k.length - 1 && data.kpiAccent !== false ? accent : '#fff';
    fit(c, String(v), 800, 104, NUM, bw - 40); c.fillText(String(v), bx + bw / 2, by + 132);
    c.direction = 'rtl'; c.fillStyle = '#9aa3b5'; c.font = `700 34px ${FONT}`; c.fillText(l, bx + bw / 2, by + 196); c.textAlign = 'right';
  });
  // שורות (שיאים אישיים וכדומה)
  y = by + bh + 78;
  for (const t of (data.lines || []).slice(0, 2)) {
    c.fillStyle = accent; c.beginPath(); c.arc(X - 12, y - 14, 10, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#eef1f7'; fit(c, t, 700, 40, FONT, W - PAD * 2 - 50); c.fillText(t, X - 44, y); y += 64;
  }
  // תחתית: שם האפליקציה
  const fy = H - PAD - 96, name = (document.title || '').split(/[—|·-]/)[0].trim() || 'MOVA';
  c.strokeStyle = 'rgba(255,255,255,0.10)'; c.lineWidth = 2; c.beginPath(); c.moveTo(PAD, fy - 34); c.lineTo(W - PAD, fy - 34); c.stroke();
  if (logo) { c.save(); rr(c, X - 96, fy, 96, 96, 24); c.clip(); c.drawImage(logo, X - 96, fy, 96, 96); c.restore(); }
  c.fillStyle = '#fff'; c.font = `900 50px ${FONT}`; c.fillText(name, X - 122, fy + 46);
  c.fillStyle = '#9aa3b5'; c.font = `600 30px ${FONT}`; c.fillText(data.tagline || 'A personal coach with you in every workout', X - 122, fy + 88);
  return cv;
}

// מציג את התמונה בחלונית, עם שיתוף (חלון השיתוף של הטלפון) ושמירה
export async function shareCard(data) {
  let cv; try { cv = await drawCard(data); } catch { toast('Couldn\'t prepare the image'); return; }
  const blob = await new Promise((res) => cv.toBlob(res, 'image/png'));
  if (!blob) { toast('Couldn\'t prepare the image'); return; }
  const file = new File([blob], 'workout.png', { type: 'image/png' }), url = URL.createObjectURL(blob);
  const can = !!navigator.canShare && navigator.canShare({ files: [file] });
  sheet(`<div class="h1" style="font-size:22px">Share the workout</div>
    <img class="share-img" src="${url}" alt="Workout summary image">
    <div class="row" style="gap:10px;margin-top:12px">${can ? '<button class="btn primary" style="flex:2" data-share-go>Share</button>' : ''}<a class="btn ${can ? '' : 'primary'}" style="flex:1;text-align:center" download="workout.png" href="${url}" data-share-save>Save</a></div>
    <div class="sub t-foot" style="margin-top:8px">The image shows only the workout and its numbers — without your name or body data.</div>
    <button class="btn ghost block" style="margin-top:8px" data-close>Close</button>`, {
    onMount(sh) {
      sh.querySelector('[data-share-go]')?.addEventListener('click', () => { navigator.share({ files: [file], title: data.title, text: data.text || '' }).catch(() => {}); });
      sh.querySelector('[data-share-save]').addEventListener('click', () => toast('Image saved'));
    },
  });
}
