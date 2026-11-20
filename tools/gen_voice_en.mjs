// מקליט את קובצי הקול באנגלית (ElevenLabs eleven_v3) אל assets/voice-en/. מדלג על קבצים קיימים; --force key1,key2 מקליט מחדש.
// הרצה: NODE_USE_ENV_PROXY=1 node tools/gen_voice_en.mjs   ואז: VOICE_LANG=en python3 tools/trim_voice.py
import { mkdir, writeFile, access } from 'node:fs/promises';
import { manifestEn, VOICES_EN } from './voice_manifest_en.mjs';
const OUT = new URL('../assets/voice-en/', import.meta.url);
const fi = process.argv.indexOf('--force'), FORCE = new Set(fi > 0 ? process.argv[fi + 1].split(',') : []);
const exists = async (u) => { try { await access(u); return true; } catch { return false; } };
async function tts(text, voice) {
  const headers = { 'Content-Type': 'application/json', 'xi-api-key': process.env.XI_API_KEY || 'dummy' };
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_64`, { method: 'POST', headers,
    body: JSON.stringify({ text, model_id: 'eleven_v3', language_code: 'en', voice_settings: { stability: 0.5, similarity_boost: 0.8 } }) });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}
const jobs = Object.entries(await manifestEn()).map(([path, v]) => ({ path, coach: path.split('/')[0], key: path.split('/').pop(), text: v.spoken }));
let i = 0, made = 0, failed = 0;
async function worker() {
  while (i < jobs.length) {
    const j = jobs[i++], file = new URL(`${j.path}.mp3`, OUT);
    if (!FORCE.has(j.key) && !FORCE.has(j.path) && await exists(file)) continue;
    await mkdir(new URL('.', file), { recursive: true });
    let ok = false;
    for (let a = 0; a < 3 && !ok; a++) { try { await writeFile(file, await tts(j.text, VOICES_EN[j.coach])); made++; ok = true; } catch (e) { if (a === 2) { failed++; console.error(j.path, e.message); } await new Promise((r) => setTimeout(r, 2500)); } }
    if (made % 100 === 0 && ok) console.log(`  ${made} recorded`);
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
console.log(`generated ${made} clips (total ${jobs.length}), failed ${failed}`);
