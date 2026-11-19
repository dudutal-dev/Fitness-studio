// ייבוא מ-Apple Health (אפליקציית "בריאות" באייפון).
// אפליקציית דפדפן לא יכולה להתחבר ל-Apple Health ישירות (אין לזה ממשק בספארי), ולכן הייבוא נעשה מקובץ הייצוא:
// בריאות ← תמונת הפרופיל ← "ייצוא כל נתוני הבריאות" ← שמירה ב"קבצים" ← בחירת הקובץ כאן.
// הקובץ (export.zip) יכול להגיע למאות מגה, לכן הוא נקרא בזרימה: לא נטען כולו לזיכרון, והכול נשאר במכשיר.

const KG_PER_LB = 0.45359237;
const SPORTS = {
  Running: 'running', Walking: 'walking', Hiking: 'hiking', Cycling: 'cycling', Swimming: 'swimming',
  TraditionalStrengthTraining: 'strength', FunctionalStrengthTraining: 'strength', CoreTraining: 'strength', CrossTraining: 'strength',
  HighIntensityIntervalTraining: 'training',
};

const attr = (s, name) => { const m = s.match(new RegExp(`\\b${name}="([^"]*)"`)); return m ? m[1] : null; };
// "2026-11-18 07:30:00 +0200" → ISO
export function healthDate(s) {
  const m = s && s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2}) ?([+-]\d{2}):?(\d{2})$/);
  const d = m ? new Date(`${m[1]}T${m[2]}${m[3]}:${m[4]}`) : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
const localDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const toKm = (v, unit) => (v == null ? null : unit === 'mi' ? v * 1.609344 : unit === 'm' ? v / 1000 : v);
const toMin = (v, unit) => (v == null ? null : unit === 'hr' ? v * 60 : unit === 's' || unit === 'sec' ? v / 60 : v);

function parseWorkout(block) {
  const open = block.slice(0, block.indexOf('>') + 1);
  const type = (attr(open, 'workoutActivityType') || '').replace('HKWorkoutActivityType', '');
  const start = healthDate(attr(open, 'startDate')), end = healthDate(attr(open, 'endDate'));
  if (!start) return null;
  let durMin = toMin(Number(attr(open, 'duration')) || null, attr(open, 'durationUnit') || 'min');
  if (!durMin && end) durMin = (end - start) / 60000;
  // גרסאות ישנות: totalDistance על התגית; חדשות: WorkoutStatistics בתוך הבלוק
  let km = toKm(Number(attr(open, 'totalDistance')) || null, attr(open, 'totalDistanceUnit') || 'km');
  let kcal = Number(attr(open, 'totalEnergyBurned')) || null;
  let avgHr = null, maxHr = null;
  for (const m of block.matchAll(/<WorkoutStatistics\b[^>]*>/g)) {
    const t = attr(m[0], 'type') || '';
    if (/Distance(WalkingRunning|Cycling|Swimming)/.test(t)) km = toKm(Number(attr(m[0], 'sum')) || null, attr(m[0], 'unit') || 'km') ?? km;
    else if (t.endsWith('ActiveEnergyBurned')) kcal = Number(attr(m[0], 'sum')) || kcal;
    else if (t.endsWith('HeartRate')) { avgHr = Math.round(Number(attr(m[0], 'average'))) || null; maxHr = Math.round(Number(attr(m[0], 'maximum'))) || null; }
  }
  return { id: start.toISOString(), start: start.toISOString(), sport: SPORTS[type] || 'other', appleType: type, durationSec: Math.round((durMin || 0) * 60),
    distanceKm: km ? Math.round(km * 100) / 100 : null, calories: kcal ? Math.round(kcal) : null, avgHr, maxHr };
}

// סורק את טקסט ה-XML בזרימה. chunks: איטרטור אסינכרוני של מחרוזות. since: לא מייבאים אימונים ישנים מזה.
export async function scanHealthXml(chunks, { since = 0, onProgress } = {}) {
  const weights = new Map(); // יום → { date, kg, t }
  const workouts = [];
  let buf = '', seen = 0;
  const flush = (final) => {
    let pos = 0, partial = -1;
    for (;;) {
      const r = buf.indexOf('<Record type="HKQuantityTypeIdentifierBodyMass"', pos);
      const w = buf.indexOf('<Workout ', pos);
      if (r < 0 && w < 0) break;
      if (r >= 0 && (w < 0 || r < w)) {
        const e = buf.indexOf('>', r);
        if (e < 0) { partial = r; break; }                     // התגית נחתכה — נמשיך כשיגיע המקטע הבא
        const tag = buf.slice(r, e + 1);
        const d = healthDate(attr(tag, 'startDate')), v = Number(attr(tag, 'value'));
        if (d && v > 0) {
          const unit = attr(tag, 'unit') || 'kg';
          const kg = Math.round((unit === 'lb' ? v * KG_PER_LB : unit === 'g' ? v / 1000 : v) * 10) / 10;
          const day = localDay(d), prev = weights.get(day);
          if (kg >= 25 && kg <= 300 && (!prev || d.getTime() >= prev.t)) weights.set(day, { date: day, kg, t: d.getTime() });
        }
        pos = e + 1;
      } else {
        const openEnd = buf.indexOf('>', w);
        if (openEnd < 0) { partial = w; break; }
        let end;
        if (buf[openEnd - 1] === '/') end = openEnd + 1;
        else { const c = buf.indexOf('</Workout>', openEnd); if (c < 0) { partial = w; break; } end = c + 10; }
        const wk = parseWorkout(buf.slice(w, end));
        if (wk && new Date(wk.start).getTime() >= since && wk.durationSec >= 120) workouts.push(wk);
        pos = end;
      }
    }
    // שומרים רק אלמנט שנחתך באמצע, או זנב קצר (למקרה שתחילת תגית נחתכה בין שני מקטעים) — כך הזיכרון לא גדל עם הקובץ
    buf = final ? '' : buf.slice(partial >= 0 ? partial : Math.max(pos, buf.length - 80));
  };
  for await (const chunk of chunks) {
    buf += chunk; seen += chunk.length;
    if (buf.length > 1 << 20) { flush(false); onProgress?.(seen); }
  }
  flush(true);
  return { weights: [...weights.values()].sort((a, b) => a.date.localeCompare(b.date)).map(({ date, kg }) => ({ date, kg })),
    workouts: workouts.sort((a, b) => a.start.localeCompare(b.start)) };
}

// מאתר את export.xml בתוך ה-ZIP בלי לטעון את כל הקובץ: קוראים רק את סוף הקובץ (ה-Central Directory)
export async function findZipEntry(file, pick) {
  const tailLen = Math.min(file.size, 4 << 20);
  const tail = new DataView(await file.slice(file.size - tailLen).arrayBuffer());
  let eocd = -1;
  for (let i = tail.byteLength - 22; i >= 0; i--) if (tail.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('הקובץ אינו ZIP תקין');
  const count = tail.getUint16(eocd + 10, true), cdSize = tail.getUint32(eocd + 12, true), cdOff = tail.getUint32(eocd + 16, true);
  if (cdOff === 0xffffffff) throw new Error('קובץ הייצוא גדול מדי (ZIP64) — לא נתמך');
  const cd = cdOff >= file.size - tailLen ? new DataView(tail.buffer, cdOff - (file.size - tailLen), cdSize) : new DataView(await file.slice(cdOff, cdOff + cdSize).arrayBuffer());
  const entries = [];
  let p = 0;
  for (let n = 0; n < count && p + 46 <= cd.byteLength; n++) {
    if (cd.getUint32(p, true) !== 0x02014b50) break;
    const nlen = cd.getUint16(p + 28, true), elen = cd.getUint16(p + 30, true), clen = cd.getUint16(p + 32, true);
    entries.push({ name: new TextDecoder().decode(new Uint8Array(cd.buffer, cd.byteOffset + p + 46, nlen)), method: cd.getUint16(p + 10, true),
      csize: cd.getUint32(p + 20, true), usize: cd.getUint32(p + 24, true), lho: cd.getUint32(p + 42, true) });
    p += 46 + nlen + elen + clen;
  }
  const e = pick(entries);
  if (!e) return null;
  const lh = new DataView(await file.slice(e.lho, e.lho + 30).arrayBuffer());
  const start = e.lho + 30 + lh.getUint16(26, true) + lh.getUint16(28, true);
  return { ...e, start };
}

// file: export.zip או export.xml. מחזיר { weights: [{date, kg}], workouts: [...] }
export async function readHealthExport(file, opts = {}) {
  let stream;
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (head[0] === 0x50 && head[1] === 0x4b) {
    // שם הקובץ משתנה לפי שפת הטלפון (export.xml / ייצוא.xml) — לוקחים את ה-XML הגדול ביותר שאינו ה-CDA
    const e = await findZipEntry(file, (list) => list.filter((x) => /\.xml$/i.test(x.name) && !/cda/i.test(x.name)).sort((a, b) => b.usize - a.usize)[0]);
    if (!e) throw new Error('לא נמצא קובץ הנתונים בתוך ה-ZIP');
    const raw = file.slice(e.start, e.start + e.csize).stream();
    if (e.method === 0) stream = raw;
    else if (e.method === 8) stream = raw.pipeThrough(new DecompressionStream('deflate-raw'));
    else throw new Error('שיטת דחיסה לא נתמכת');
  } else stream = file.stream();
  const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
  const chunks = { [Symbol.asyncIterator]: () => ({ next: () => reader.read() }) };
  const out = await scanHealthXml(chunks, opts);
  if (!out.weights.length && !out.workouts.length) throw new Error('לא נמצאו בקובץ שקילות או אימונים');
  return out;
}

// ממזג את מה שנקרא לתוך מצב האפליקציה. שקילה שכבר קיימת לאותו יום ואימון שכבר יובא — לא נדרסים.
export function mergeHealth(state, data) {
  const added = { weights: 0, runs: 0, sessions: 0 };
  const days = new Set(state.weights.map((w) => w.date));
  for (const w of data.weights) if (!days.has(w.date)) { state.weights.push(w); added.weights++; }
  state.weights.sort((a, b) => a.date.localeCompare(b.date));
  if (added.weights && state.profile) state.profile.weightKg = state.weights[state.weights.length - 1].kg;
  const have = new Set([...state.runs, ...state.sessions].map((x) => x.importId).filter(Boolean));
  const NAME = { running: 'ריצה', walking: 'הליכה', hiking: 'מסע / הליכה', cycling: 'אופניים', swimming: 'שחייה', strength: 'אימון כוח', training: 'אימון', other: 'פעילות' };
  for (const w of data.workouts) {
    if (have.has(w.id)) continue;
    const hr = w.avgHr ? { avg: w.avgHr, max: w.maxHr || w.avgHr } : undefined;
    const common = { date: w.start, name: `${NAME[w.sport]} (Apple Health)`, durationSec: w.durationSec, calories: w.calories, source: 'apple', importId: w.id, ...(hr ? { hr } : {}) };
    if (w.sport === 'strength') { state.sessions.push({ ...common, day: null, field: false, imported: true, volume: 0, setsDone: 0, exercises: [], prs: [] }); added.sessions++; }
    else { state.runs.push({ ...common, type: w.sport === 'running' ? 'import' : 'cardio', distanceKm: w.distanceKm, timeSec: null, rpe: null }); added.runs++; }
  }
  state.runs.sort((a, b) => a.date.localeCompare(b.date));
  state.sessions.sort((a, b) => a.date.localeCompare(b.date));
  return added;
}
