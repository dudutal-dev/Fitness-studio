// רשימת כל קבצי הקול: { "<coach>/<key>" | "<coach>/names/<slug>/<key>": { text, spoken } }
import { VOICE_LINES, SPOKEN, FEMALE, NAME_LINES, COACH_LINES, coachSays, femaleLine, nameTpl } from '../js/data/voice-lines.js';
import { NAMES } from '../js/data/names.js';

export const VOICES = { ori: 'PBHwEnXdzx0yfhIO2UCH' /* Dorian */, noa: 's0T0DT6EAPeX57MQpn3I' /* Danit */, maya: 'tPkZ8BPQfux4koA8Wyli' /* קול שעוצב למאיה */, tamar: 'cgSgspJ2msm6clMCkdW9' /* Jessica */,
  guy: 'SSaO8heNHx6ee5ZRpZ1X' /* Gad Tamir */, shira: 'RrrmZPMES7HQ6Dm2L7GF' /* קול שעוצב לשירה */, lia: '1rNBx0CqYBvQubC1R0kV' /* קול שעוצב לליה */, yael: 'lxMfkT0dhgEot7mUeEV9' /* קול שעוצב ליעל */ };
const PRONOUN_FIX = { m: [[/גאה בך\./g, 'גאה בְּךָ.']], f: [[/גאה בך\./g, 'גאה בָּךְ.']] };

// הגייה של מונחים לועזיים בשמות התרגילים (רק לקול; הטקסט המוצג נשאר בלי ניקוד)
const SAY = [[/ישיבת אל/g, 'ישיבת אֶל'], [/לבר/g, 'לֶבֶר'], [/פלאנש/g, 'פְּלַאנְשׁ'], [/פייק/g, 'פַּייְק'], [/דד באג/g, 'דֶד בַּאג'], [/נורדיק/g, 'נוֹרְדִיק']];
const say = (t) => SAY.reduce((x, [re, rep]) => x.replace(re, rep), t);

export function manifest() {
  const out = {};
  for (const coach of Object.keys(VOICES)) {
    const own = (k) => coachSays(k, coach);
    for (const [k, v] of Object.entries(VOICE_LINES)) {
      if (!own(k)) continue;
      const mine = COACH_LINES[coach]?.[k];
      const text = mine ?? (typeof v === 'string' ? v : v[coach]);
      out[`${coach}/${k}`] = { text, spoken: mine ?? SPOKEN[k] ?? (k.startsWith('ex_') ? say(text) : text) };
    }
    for (const [k, text] of Object.entries(FEMALE)) {
      if (!own(k) || !femaleLine(k, coach)) continue;
      out[`${coach}/${k}__f`] = { text, spoken: SPOKEN[`${k}__f`] ?? text };
    }
    for (const n of NAMES) {
      const sx = n.sex === 'f' ? 'f' : 'm';
      for (const [k, v] of Object.entries(NAME_LINES)) {
        const tpl = nameTpl(v, coach)[sx];
        let spoken = tpl.replaceAll('{name}', n.spoken || n.name);
        for (const [re, rep] of PRONOUN_FIX[sx]) spoken = spoken.replace(re, rep);
        out[`${coach}/names/${n.slug}/${k}`] = { text: tpl.replaceAll('{name}', n.name), spoken };
      }
    }
  }
  return out;
}

if (process.argv[1]?.endsWith('voice_manifest.mjs')) {
  const fs = await import('node:fs');
  const m = manifest();
  fs.writeFileSync(process.argv[2] || 'voice_manifest.json', JSON.stringify(m, null, 1));
  console.log(Object.keys(m).length, 'clips');
}
