// רשימת קובצי הקול באנגלית: אותם מפתחות כמו בעברית, עם הטקסט מהבנייה האנגלית (en/js/data/voice-lines.js).
// הקולות: תשעה קולות שעוצבו באנגלית (ElevenLabs Voice Design v3) לפי האופי של כל מאמן — 20.11.2026.
// הרצה: node tools/i18n.mjs build && node tools/voice_manifest_en.mjs out.json
export const VOICES_EN = { ori: 'IuLnYv01kSbKZlZIGAC5', noa: '8CYlJulGrRsjrdWfnLCc', maya: 'EUiiDSZNR3WS64UTAJee', tamar: 'zflek5p75cEyvmhCtddx', guy: 'PoB1yI9fx8l77NGGLgwK',
  shira: 'E4ECevXo2L90KlHN98Nl', lia: 'Z06gPXJ4hPCDhJXAWdp2', yael: 'Knx0MUxBCg7ispHA4gjU', mei: '0psODMu7JXRtdGVBpykA' };

export async function manifestEn() {
  const { VOICE_LINES, SPOKEN, FEMALE, NAME_LINES, COACH_LINES, coachSays, femaleLine, nameTpl } = await import('../en/js/data/voice-lines.js');
  const { NAMES } = await import('../en/js/data/names.js');
  const out = {};
  for (const coach of Object.keys(VOICES_EN)) {
    const own = (k) => coachSays(k, coach);
    for (const [k, v] of Object.entries(VOICE_LINES)) {
      if (!own(k)) continue;
      const text = COACH_LINES[coach]?.[k] ?? (typeof v === 'string' ? v : v[coach]);
      out[`${coach}/${k}`] = { text, spoken: text };
    }
    // באנגלית אין הבדל בין פנייה לזכר ולנקבה, אבל האפליקציה מבקשת את הקובץ __f למתאמנת — אותו טקסט בדיוק
    for (const [k, text] of Object.entries(FEMALE)) { if (own(k) && femaleLine(k, coach)) out[`${coach}/${k}__f`] = { text: SPOKEN[`${k}__f`] ?? text, spoken: SPOKEN[`${k}__f`] ?? text }; }
    for (const n of NAMES) { const sx = n.sex === 'f' ? 'f' : 'm';
      for (const [k, v] of Object.entries(NAME_LINES)) { const t = nameTpl(v, coach)[sx].replaceAll('{name}', n.spoken || n.name); out[`${coach}/names/${n.slug}/${k}`] = { text: t, spoken: t }; } }
  }
  return out;
}
if (process.argv[1]?.endsWith('voice_manifest_en.mjs')) {
  const fs = await import('node:fs'); const m = await manifestEn();
  fs.writeFileSync(process.argv[2] || 'voice_manifest_en.json', JSON.stringify(m, null, 1)); console.log(Object.keys(m).length, 'clips');
}
