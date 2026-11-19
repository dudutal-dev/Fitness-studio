// מייצר את כל קבצי הקול של המאמנים ב-ElevenLabs (eleven_v3, עברית): משפטים רגילים, גרסאות נקבה, ומשפטים עם שמות מתאמנים.
// הרצה: NODE_USE_ENV_PROXY=1 node tools/gen_voice.mjs [--force key1,key2]   (מדלג על קבצים קיימים)
// אחרי יצירה מומלץ: node tools/voice_manifest.mjs m.json && python3 tools/verify_voice.py m.json && python3 tools/fix_voice.py m.json 0.9
import { mkdir, writeFile, access } from 'node:fs/promises';
import { manifest, VOICES } from './voice_manifest.mjs';

const OUT = new URL('../assets/voice/', import.meta.url);
const fi = process.argv.indexOf('--force');
const FORCE = new Set(fi > 0 ? process.argv[fi + 1].split(',') : []);

async function exists(u) { try { await access(u); return true; } catch { return false; } }

async function tts(text, voiceId) {
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.XI_API_KEY) headers['xi-api-key'] = process.env.XI_API_KEY;
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_64`, {
    method: 'POST', headers,
    body: JSON.stringify({ text, model_id: 'eleven_v3', language_code: 'he', voice_settings: { stability: 0.5, similarity_boost: 0.8 } }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

const jobs = Object.entries(manifest()).map(([path, v]) => ({ path, coach: path.split('/')[0], key: path.split('/').pop(), text: v.spoken }));
let i = 0, made = 0;
async function worker() {
  while (i < jobs.length) {
    const j = jobs[i++];
    const file = new URL(`${j.path}.mp3`, OUT);
    if (!FORCE.has(j.key) && await exists(file)) continue;
    await mkdir(new URL('.', file), { recursive: true });
    for (let attempt = 0; attempt < 3; attempt++) {
      try { await writeFile(file, await tts(j.text, VOICES[j.coach])); made++; break; }
      catch (e) { console.error(j.path, e.message); await new Promise((r) => setTimeout(r, 2000)); }
    }
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
console.log(`generated ${made} clips (total ${jobs.length})`);
