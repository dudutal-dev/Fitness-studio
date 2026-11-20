// שמות מתאמנים שיש להם הקלטות אישיות (המאמן קורא להם בשם).
// להוספת מתאמן: להוסיף שורה ולהריץ  NODE_USE_ENV_PROXY=1 node tools/gen_voice.mjs
// spoken = השם בניקוד, לשיפור ההגייה.
export const NAMES = [
  { name: 'Omer', slug: 'omer', sex: 'm', spoken: 'Omer' },
];

export function nameEntry(profile) {
  const n = (profile?.name || '').trim();
  return NAMES.find((x) => x.name === n && x.sex === (profile.sex || 'm')) || null;
}
