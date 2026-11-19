// דופק חי ב-Bluetooth (Web Bluetooth): שעוני Garmin במצב "שידור דופק" (Broadcast Heart Rate), רצועות חזה (HRM-Pro וכו׳),
// וחיישן מהירות/קדנס בריצה (RSC) אם קיים. + אזורי דופק ומקליט סשן.

const listeners = new Set();
let device = null, hrChar = null, rscChar = null;
let last = { hr: null, at: 0, speed: null, cadence: null, distM: null };
let reconnects = 0;

export const supported = () => typeof navigator !== 'undefined' && !!navigator.bluetooth;
export const isConnected = () => !!device?.gatt?.connected;
export const deviceName = () => device?.name || null;
export const current = () => (Date.now() - last.at < 6000 ? last : { ...last, hr: null });
export const onHR = (fn) => (listeners.add(fn), () => listeners.delete(fn));
const emit = () => listeners.forEach((f) => f(current(), isConnected()));

// פענוח Heart Rate Measurement (0x2A37)
export function parseHR(dv) {
  const flags = dv.getUint8(0);
  return flags & 0x01 ? dv.getUint16(1, true) : dv.getUint8(1);
}

// פענוח RSC Measurement (0x2A53): מהירות (1/256 מ׳/ש׳), קדנס, אורך צעד, מרחק כולל (1/10 מ׳)
export function parseRSC(dv) {
  const flags = dv.getUint8(0);
  let o = 4;
  const out = { speed: dv.getUint16(1, true) / 256, cadence: dv.getUint8(3) };
  if (flags & 0x01) o += 2;
  if (flags & 0x02) out.distM = dv.getUint32(o, true) / 10;
  return out;
}

export async function connect() {
  if (!supported()) throw new Error('הדפדפן לא תומך ב-Bluetooth');
  device = await navigator.bluetooth.requestDevice({
    filters: [{ services: ['heart_rate'] }],
    optionalServices: ['running_speed_and_cadence', 'battery_service'],
  });
  device.addEventListener('gattserverdisconnected', onDisconnect);
  await setup();
  reconnects = 0;
  return device.name;
}

async function setup() {
  const server = await device.gatt.connect();
  const svc = await server.getPrimaryService('heart_rate');
  hrChar = await svc.getCharacteristic('heart_rate_measurement');
  hrChar.addEventListener('characteristicvaluechanged', (e) => {
    last = { ...last, hr: parseHR(e.target.value), at: Date.now() };
    emit();
  });
  await hrChar.startNotifications();
  try {
    const rsc = await server.getPrimaryService('running_speed_and_cadence');
    rscChar = await rsc.getCharacteristic('rsc_measurement');
    rscChar.addEventListener('characteristicvaluechanged', (e) => { last = { ...last, ...parseRSC(e.target.value) }; });
    await rscChar.startNotifications();
  } catch { rscChar = null; }
  emit();
}

async function onDisconnect() {
  emit();
  if (!device || reconnects >= 5) return;
  reconnects++;
  setTimeout(() => setup().catch(onDisconnect), 1500 * reconnects);
}

export function disconnect() {
  const d = device;
  device = null;
  try { d?.gatt?.disconnect(); } catch { /* */ }
  last = { hr: null, at: 0, speed: null, cadence: null, distM: null };
  emit();
}

export const hasRSC = () => !!rscChar;

// ───── אזורי דופק ─────
export const maxHrFor = (profile) => profile.maxHr || Math.round(208 - 0.7 * (profile.age || 20)); // Tanaka
export const ZONES = [
  { z: 1, name: 'התאוששות', from: 0.5, color: '#8b95a1' },
  { z: 2, name: 'אירובי קל', from: 0.6, color: '#5aa9ff' },
  { z: 3, name: 'אירובי', from: 0.7, color: '#2bb673' },
  { z: 4, name: 'סף', from: 0.8, color: '#ff8a3d' },
  { z: 5, name: 'מקסימום', from: 0.9, color: '#ff4d5e' },
];
export function zoneOf(hr, max) {
  if (!hr) return null;
  const p = hr / max;
  let z = ZONES[0];
  for (const x of ZONES) if (p >= x.from) z = x;
  return { ...z, pct: Math.round(p * 100) };
}

// ───── מקליט דופק לאימון ─────
export function recorder(profile) {
  const max = maxHrFor(profile);
  const samples = [];
  const zoneSec = [0, 0, 0, 0, 0];
  let lastT = null;
  const off = onHR((c) => {
    if (!c.hr) return;
    const t = Date.now();
    if (lastT && t - lastT < 15000) zoneSec[(zoneOf(c.hr, max)?.z || 1) - 1] += (t - lastT) / 1000;
    lastT = t;
    if (!samples.length || t - samples[samples.length - 1].t >= 5000) samples.push({ t, hr: c.hr });
  });
  return {
    stop() {
      off();
      if (!samples.length) return null;
      return summarizeHR(samples, zoneSec);
    },
  };
}

export function summarizeHR(samples, zoneSec = null, max = null) {
  if (!samples?.length) return null;
  const hrs = samples.map((s) => s.hr);
  if (!zoneSec && max) {
    zoneSec = [0, 0, 0, 0, 0];
    for (let i = 1; i < samples.length; i++) {
      const dt = (samples[i].t - samples[i - 1].t) / 1000;
      if (dt > 0 && dt < 30) zoneSec[(zoneOf(samples[i].hr, max)?.z || 1) - 1] += dt;
    }
  }
  const step = Math.max(1, Math.ceil(samples.length / 240)); // עד ~240 דגימות לשמירה
  return {
    avg: Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length),
    max: Math.max(...hrs),
    zones: (zoneSec || [0, 0, 0, 0, 0]).map((s) => Math.round(s)),
    samples: samples.filter((_, i) => i % step === 0).map((s) => [Math.round(s.t / 1000), s.hr]),
  };
}
