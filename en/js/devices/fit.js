// מפענח קבצי FIT (הפורמט המקורי של Garmin) — ללא ספריות.
// מחזיר סיכום פעילות: ספורט, זמנים, מרחק, דופק ממוצע/מקסימלי, קלוריות, דגימות דופק/מרחק וסטים של אימון כוח.

const FIT_EPOCH = 631065600; // 1989-12-31T00:00:00Z בשניות יוניקס

// base type -> [גודל, קורא, ערך לא תקין]
const BT = {
  0x00: [1, 'u8', 0xff], 0x01: [1, 's8', 0x7f], 0x02: [1, 'u8', 0xff], 0x83: [2, 's16', 0x7fff], 0x84: [2, 'u16', 0xffff],
  0x85: [4, 's32', 0x7fffffff], 0x86: [4, 'u32', 0xffffffff], 0x88: [4, 'f32', null], 0x89: [8, 'f64', null],
  0x0a: [1, 'u8', 0], 0x8b: [2, 'u16', 0], 0x8c: [4, 'u32', 0], 0x0d: [1, 'u8', 0xff],
};

function readVal(dv, off, type, le) {
  switch (type) {
    case 'u8': return dv.getUint8(off);
    case 's8': return dv.getInt8(off);
    case 'u16': return dv.getUint16(off, le);
    case 's16': return dv.getInt16(off, le);
    case 'u32': return dv.getUint32(off, le);
    case 's32': return dv.getInt32(off, le);
    case 'f32': return dv.getFloat32(off, le);
    case 'f64': return dv.getFloat64(off, le);
    default: return null;
  }
}

// מחזיר רשימת הודעות גולמיות: [{num, fields:{fieldNum: value}}]
export function decodeFIT(buf) {
  const dv = new DataView(buf instanceof ArrayBuffer ? buf : buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const hSize = dv.getUint8(0);
  const sig = String.fromCharCode(dv.getUint8(8), dv.getUint8(9), dv.getUint8(10), dv.getUint8(11));
  if (sig !== '.FIT') throw new Error('This is not a valid FIT file');
  const end = Math.min(dv.byteLength, hSize + dv.getUint32(4, true));
  const defs = {};
  const msgs = [];
  let off = hSize;
  let lastTs = 0;
  while (off < end) {
    const h = dv.getUint8(off++);
    if (h & 0x80) {
      // כותרת עם חותמת זמן דחוסה
      const local = (h >> 5) & 0x3;
      const t = h & 0x1f;
      lastTs = t >= (lastTs & 0x1f) ? (lastTs & ~0x1f) + t : (lastTs & ~0x1f) + t + 0x20;
      off = readData(local, lastTs);
      continue;
    }
    const local = h & 0x0f;
    if (h & 0x40) {
      const le = dv.getUint8(off + 1) === 0;
      const num = dv.getUint16(off + 2, le);
      const n = dv.getUint8(off + 4);
      off += 5;
      const fields = [];
      for (let i = 0; i < n; i++, off += 3) fields.push({ num: dv.getUint8(off), size: dv.getUint8(off + 1), type: dv.getUint8(off + 2) });
      let devSize = 0;
      if (h & 0x20) {
        const nd = dv.getUint8(off++);
        for (let i = 0; i < nd; i++, off += 3) devSize += dv.getUint8(off + 1);
      }
      defs[local] = { le, num, fields, devSize };
    } else {
      off = readData(local, null);
    }
  }
  return msgs;

  function readData(local, ts) {
    const def = defs[local];
    if (!def) throw new Error('Corrupted FIT file (missing definition)');
    const fields = {};
    for (const f of def.fields) {
      const bt = BT[f.type];
      if (bt && f.size >= bt[0]) {
        const v = readVal(dv, off, bt[1], def.le);
        if (v !== bt[2] && !(typeof v === 'number' && Number.isNaN(v))) fields[f.num] = v;
      }
      off += f.size;
    }
    off += def.devSize;
    if (fields[253] != null) lastTs = fields[253];
    else if (ts != null) fields[253] = ts;
    msgs.push({ num: def.num, fields });
    return off;
  }
}

const SPORT = { 0: 'other', 1: 'running', 2: 'cycling', 4: 'fitness', 10: 'training', 11: 'walking', 17: 'hiking', 5: 'swimming' };

export function parseFIT(buf) {
  const msgs = decodeFIT(buf);
  const session = msgs.find((m) => m.num === 18)?.fields || {};
  const records = msgs.filter((m) => m.num === 20).map((m) => m.fields);
  const sets = msgs.filter((m) => m.num === 225).map((m) => m.fields).filter((f) => f[5] === 1);
  const tsOf = (t) => (t != null ? new Date((t + FIT_EPOCH) * 1000) : null);
  const start = tsOf(session[2] ?? records[0]?.[253] ?? msgs.find((m) => m.num === 0)?.fields[4]);
  const hrRecs = records.filter((r) => r[3]);
  const lastDist = [...records].reverse().find((r) => r[5] != null)?.[5];
  let sport = SPORT[session[5]] || 'other';
  if (session[6] === 20 || sets.length) sport = 'strength';
  const durationSec = session[7] != null ? Math.round(session[7] / 1000) : records.length ? records[records.length - 1][253] - records[0][253] : 0;
  return {
    source: 'fit',
    sport,
    start: start ? start.toISOString() : new Date().toISOString(),
    durationSec,
    movingSec: session[8] != null ? Math.round(session[8] / 1000) : durationSec,
    distanceKm: session[9] != null ? round(session[9] / 100000, 2) : lastDist != null ? round(lastDist / 100000, 2) : null,
    avgHr: session[16] ?? (hrRecs.length ? Math.round(hrRecs.reduce((a, r) => a + r[3], 0) / hrRecs.length) : null),
    maxHr: session[17] ?? (hrRecs.length ? Math.max(...hrRecs.map((r) => r[3])) : null),
    calories: session[11] ?? null,
    hrSamples: hrRecs.map((r) => ({ t: (r[253] + FIT_EPOCH) * 1000, hr: r[3] })),
    sets: sets.map((f) => ({ reps: f[3] ?? null, kg: f[4] != null ? round(f[4] / 16, 1) : null, sec: f[0] != null ? Math.round(f[0] / 1000) : null })),
  };
}

const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;
