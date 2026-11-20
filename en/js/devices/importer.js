// ייבוא פעילויות מ-Garmin Connect: FIT, TCX, GPX, ו-ZIP (של "Export Original").
import { parseFIT } from './fit.js';

export async function importActivityFile(file) {
  const name = file.name.toLowerCase();
  const buf = await file.arrayBuffer();
  if (name.endsWith('.zip') || isZip(buf)) {
    const inner = await unzipFirst(buf, /\.(fit|tcx|gpx)$/i);
    if (!inner) throw new Error('No FIT/TCX/GPX was found in the ZIP file');
    return parseByName(inner.name, inner.data);
  }
  return parseByName(name, buf);
}

export function parseByName(name, buf) {
  if (/\.fit$/i.test(name)) return parseFIT(buf);
  const text = new TextDecoder().decode(buf);
  if (/\.tcx$/i.test(name) || text.includes('<TrainingCenterDatabase')) return parseTCX(text);
  if (/\.gpx$/i.test(name) || text.includes('<gpx')) return parseGPX(text);
  throw new Error('Unsupported format — FIT, TCX, GPX or ZIP');
}

const isZip = (buf) => new DataView(buf).getUint32(0, true) === 0x04034b50;

// קורא ZIP לפי ה-Central Directory ופורס (deflate) עם DecompressionStream
export async function unzipFirst(buf, re) {
  const dv = new DataView(buf);
  let eocd = -1;
  for (let i = dv.byteLength - 22; i >= Math.max(0, dv.byteLength - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('Corrupted ZIP');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nlen = dv.getUint16(p + 28, true), elen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
    const lho = dv.getUint32(p + 42, true);
    const fname = new TextDecoder().decode(new Uint8Array(buf, p + 46, nlen));
    p += 46 + nlen + elen + clen;
    if (!re.test(fname)) continue;
    const start = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true);
    const raw = new Uint8Array(buf, start, csize);
    if (method === 0) return { name: fname, data: raw.slice().buffer };
    if (method !== 8) throw new Error('Unsupported compression method');
    const ds = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return { name: fname, data: await new Response(ds).arrayBuffer() };
  }
  return null;
}

// ───── TCX ─────
const tag = (s, t) => { const m = s.match(new RegExp(`<(?:\\w+:)?${t}\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?${t}>`)); return m ? m[1] : null; };
const tags = (s, t) => [...s.matchAll(new RegExp(`<(?:\\w+:)?${t}\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?${t}>`, 'g'))].map((m) => m[1]);
const num = (v) => (v == null || v === '' ? null : Number(String(v).replace(/<[^>]+>/g, '').trim()));

export function parseTCX(xml) {
  const sportM = xml.match(/<Activity[^>]*Sport="([^"]+)"/);
  const laps = tags(xml, 'Lap');
  const tps = tags(xml, 'Trackpoint');
  const hrSamples = tps.map((tp) => ({ t: Date.parse(tag(tp, 'Time')), hr: num(tag(tag(tp, 'HeartRateBpm') || '', 'Value')) })).filter((x) => x.hr);
  const sum = (f) => laps.reduce((a, l) => a + (num(tag(l, f)) || 0), 0);
  const maxHr = Math.max(0, ...laps.map((l) => num(tag(tag(l, 'MaximumHeartRateBpm') || '', 'Value')) || 0), ...hrSamples.map((x) => x.hr));
  const dist = sum('DistanceMeters');
  const sport = /run/i.test(sportM?.[1] || '') ? 'running' : /bik/i.test(sportM?.[1] || '') ? 'cycling' : 'other';
  return {
    source: 'tcx', sport, start: new Date(Date.parse(tag(xml, 'Id')) || Date.now()).toISOString(),
    durationSec: Math.round(sum('TotalTimeSeconds')), distanceKm: dist ? Math.round(dist / 10) / 100 : null,
    avgHr: hrSamples.length ? Math.round(hrSamples.reduce((a, x) => a + x.hr, 0) / hrSamples.length) : null,
    maxHr: maxHr || null, calories: sum('Calories') || null, hrSamples, sets: [],
  };
}

// ───── GPX ─────
export function parseGPX(xml) {
  const pts = [...xml.matchAll(/<trkpt[^>]*lat="([-\d.]+)"[^>]*lon="([-\d.]+)"[^>]*>([\s\S]*?)<\/trkpt>/g)].map((m) => ({
    lat: Number(m[1]), lon: Number(m[2]), t: Date.parse(tag(m[3], 'time')), hr: num(tag(m[3], 'hr')),
  }));
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += haversine(pts[i - 1], pts[i]);
  const hrs = pts.filter((p) => p.hr);
  const type = tag(xml, 'type') || '';
  return {
    source: 'gpx', sport: /run/i.test(type) || !type ? 'running' : 'other',
    start: new Date(pts[0]?.t || Date.now()).toISOString(),
    durationSec: pts.length > 1 ? Math.round((pts[pts.length - 1].t - pts[0].t) / 1000) : 0,
    distanceKm: Math.round(d / 10) / 100,
    avgHr: hrs.length ? Math.round(hrs.reduce((a, p) => a + p.hr, 0) / hrs.length) : null,
    maxHr: hrs.length ? Math.max(...hrs.map((p) => p.hr)) : null, calories: null,
    hrSamples: hrs.map((p) => ({ t: p.t, hr: p.hr })), sets: [],
  };
}

export function haversine(a, b) {
  const R = 6371000, toR = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toR, dLon = (b.lon - a.lon) * toR;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
