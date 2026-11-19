// גרפים קלים ב-SVG (ללא ספריות): טבעת, קו עם מגמה, עמודות, מפת גוף.

export function ring(pct, { size = 150, stroke = 12, color = 'var(--pri)', track = 'rgba(var(--fg-rgb),0.08)', big = '', lbl = '', cls = '' } = {}) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(1, pct)));
  return `<div class="ring ${cls}" style="width:${size}px;height:${size}px">
    <svg viewBox="0 0 ${size} ${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" style="stroke:${track}" stroke-width="${stroke}"/>
      <circle class="arc" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" style="stroke:${color}" stroke-width="${stroke}" stroke-linecap="round"
        stroke-dasharray="${c}" stroke-dashoffset="${off}" style="transition:stroke-dashoffset .6s cubic-bezier(.2,.8,.2,1)"/>
    </svg><div class="center"><div class="big num">${big}</div>${lbl ? `<div class="lbl">${lbl}</div>` : ''}</div></div>`;
}

export function setRing(node, pct) {
  const arc = node.querySelector('.arc');
  if (!arc) return;
  const c = parseFloat(arc.getAttribute('stroke-dasharray'));
  arc.setAttribute('stroke-dashoffset', c * (1 - Math.max(0, Math.min(1, pct))));
}

// series: [{ values:[{x,y}], color, fill?, dash? }]  — x: מחרוזת תווית
export function lineChart(series, { h = 190, target = null, unit = '' } = {}) {
  const all = series.flatMap((s) => s.values.map((v) => v.y)).concat(target != null ? [target] : []);
  if (!all.length) return '<div class="empty"><div class="e"><span class="ib pri xl"><svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 19h16M5 15l4.500-5 4 3L19 6"/></svg></span></div>אין עדיין נתונים</div>';
  const W = 340, H = h, P = { l: 30, r: 10, t: 12, b: 22 };
  let min = Math.min(...all), max = Math.max(...all);
  if (max - min < 1) { min -= 1; max += 1; }
  const pad = (max - min) * 0.12; min -= pad; max += pad;
  const n = Math.max(...series.map((s) => s.values.length));
  const X = (i) => P.l + (n <= 1 ? (W - P.l - P.r) / 2 : (i / (n - 1)) * (W - P.l - P.r));
  const Y = (v) => P.t + (1 - (v - min) / (max - min)) * (H - P.t - P.b);
  let out = `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:${h}px">
    <defs><linearGradient id="fillG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--pri)" stop-opacity=".22"/><stop offset="1" style="stop-color:var(--pri)" stop-opacity="0"/></linearGradient></defs>`;
  for (let i = 0; i <= 3; i++) {
    const v = min + ((max - min) * i) / 3, y = Y(v);
    out += `<line x1="${P.l}" x2="${W - P.r}" y1="${y}" y2="${y}" style="stroke:rgba(var(--fg-rgb),.08)"/><text x="2" y="${y + 3}">${Math.round(v * 10) / 10}</text>`;
  }
  if (target != null) out += `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(target)}" y2="${Y(target)}" style="stroke:var(--acc)" stroke-dasharray="4 4"/>`;
  for (const s of series) {
    if (!s.values.length) continue;
    const pts = s.values.map((v, i) => [X(i), Y(v.y)]);
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('');
    if (s.fill) out += `<path d="${d}L${pts[pts.length - 1][0]},${H - P.b}L${pts[0][0]},${H - P.b}Z" fill="url(#fillG)"/>`;
    out += `<path d="${d}" fill="none" style="stroke:${s.color}" stroke-width="${s.width || 2.5}" ${s.dash ? 'stroke-dasharray="5 4"' : ''} stroke-linejoin="round" stroke-linecap="round"/>`;
    if (s.dots !== false) pts.forEach((p) => (out += `<circle cx="${p[0]}" cy="${p[1]}" r="3" style="fill:${s.color}"/>`));
  }
  const labels = series[0].values;
  const step = Math.max(1, Math.ceil(labels.length / 5));
  labels.forEach((v, i) => { if (i % step === 0 || i === labels.length - 1) out += `<text x="${X(i)}" y="${H - 6}" text-anchor="middle">${v.x}</text>`; });
  return out + '</svg>';
}

export function bars(values, { h = 120, color = 'var(--pri)' } = {}) {
  if (!values.length) return '<div class="empty">אין נתונים</div>';
  const W = 340, max = Math.max(...values.map((v) => v.y), 1), bw = (W - 10) / values.length;
  let out = `<svg class="chart" viewBox="0 0 ${W} ${h + 18}" style="height:${h + 18}px">`;
  values.forEach((v, i) => {
    const bh = (v.y / max) * h, x = 5 + i * bw;
    out += `<rect x="${x + bw * 0.18}" y="${h - bh}" width="${bw * 0.64}" height="${Math.max(2, bh)}" rx="5" style="fill:${color}" opacity="${i === values.length - 1 ? 1 : 0.55}"/>
      <text x="${x + bw / 2}" y="${h + 14}" text-anchor="middle">${v.x}</text>`;
  });
  return out + '</svg>';
}

// מפת גוף: צביעת שרירים לפי מספר סטים שבועי (0..max)
const FRONT = {
  shoulders: ['M38 52 q-10 2 -12 14 l10 2 q2 -9 8 -12z', 'M82 52 q10 2 12 14 l-10 2 q-2 -9 -8 -12z'],
  chest: ['M46 54 h13 v16 q-9 2 -15 -3 q-2 -8 2 -13z', 'M61 54 h13 q4 5 2 13 q-6 5 -15 3z'],
  biceps: ['M27 70 l9 2 l-2 18 l-8 -2z', 'M93 70 l-9 2 l2 18 l8 -2z'],
  forearms: ['M25 92 l8 2 l-3 20 l-7 -2z', 'M95 92 l-8 2 l3 20 l7 -2z'],
  abs: ['M51 73 h18 v34 q-9 4 -18 0z'],
  obliques: ['M44 74 l6 1 v30 l-6 -6z', 'M76 74 l-6 1 v30 l6 -6z'],
  quads: ['M45 112 h13 l-1 40 h-11 q-4 -20 -1 -40z', 'M62 112 h13 q3 20 -1 40 h-11z'],
  calves: ['M47 158 h9 l-1 30 h-7z', 'M64 158 h9 l-1 30 h-7z'],
};
const BACK = {
  traps: ['M48 44 h24 l6 10 h-36z'],
  shoulders: ['M38 52 q-10 2 -12 14 l10 2 q2 -9 8 -12z', 'M82 52 q10 2 12 14 l-10 2 q-2 -9 -8 -12z'],
  upper_back: ['M44 56 h32 v12 h-32z'],
  lats: ['M43 69 h14 v22 q-9 -4 -13 -12z', 'M63 69 h14 q-1 8 -13 22z'],
  triceps: ['M27 70 l9 2 l-2 18 l-8 -2z', 'M93 70 l-9 2 l2 18 l8 -2z'],
  lower_back: ['M51 92 h18 v14 h-18z'],
  glutes: ['M45 108 h14 v16 q-10 2 -14 -4z', 'M61 108 h14 v12 q-4 6 -14 4z'],
  hamstrings: ['M45 128 h13 l-1 26 h-11z', 'M62 128 h13 l-1 26 h-11z'],
  calves: ['M47 158 h9 l-1 30 h-7z', 'M64 158 h9 l-1 30 h-7z'],
};
const SIL = '<circle class="sil" cx="60" cy="22" r="13"/><path class="sil" d="M48 40 h24 q22 4 24 26 l4 46 l-10 2 l-6 -40 l-4 0 v38 l2 6 l-2 50 l-3 30 h-10 l1 -60 h-4 l1 60 h-10 l-3 -30 l-2 -50 l2 -6 v-38 l-4 0 l-6 40 l-10 -2 l4 -46 q2 -22 24 -26z"/>';

export function bodyMap(load, max = 12) {
  const col = (m) => {
    const v = Math.min(1, (load[m] || 0) / max);
    if (!v) return '';
    return `style="fill:rgba(var(--pri-rgb),${(0.18 + v * 0.72).toFixed(2)})"`;
  };
  const draw = (map) => Object.entries(map).map(([m, ps]) => ps.map((d) => `<path class="m" d="${d}" ${col(m)}><title>${m}</title></path>`).join('')).join('');
  return `<div class="bodymap">
    <div><svg viewBox="0 0 120 200">${SIL}${draw(FRONT)}</svg><div class="sub" style="text-align:center">חזית</div></div>
    <div><svg viewBox="0 0 120 200">${SIL}${draw(BACK)}</svg><div class="sub" style="text-align:center">גב</div></div></div>`;
}
