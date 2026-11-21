// שמות מתאמנים שיש להם הקלטות אישיות (המאמן קורא להם בשם).
// להוספת מתאמן: להוסיף שורה ולהריץ  NODE_USE_ENV_PROXY=1 node tools/gen_voice.mjs
// spoken = השם בניקוד, לשיפור ההגייה.
export const NAMES = [
  { name: 'Omer', slug: 'omer', sex: 'm', spoken: 'Omer' },
  // שמות נפוצים (בקשת בעל המוצר, 21.11.2026). שם שמתאים לגברים ולנשים מוקלט פעמיים — הפנייה בעברית שונה
  { name: 'Omer', slug: 'omer_f', sex: 'f', spoken: 'Omer' },
  { name: 'Tal', slug: 'tal', sex: 'm', spoken: 'Tal' },
  { name: 'Tal', slug: 'tal_f', sex: 'f', spoken: 'Tal' },
  { name: 'Shira', slug: 'shira', sex: 'f', spoken: 'Shira' },
  { name: 'Yifat', slug: 'yifat', sex: 'f', spoken: 'Yifat' },
  { name: 'Dudu', slug: 'dudu', sex: 'm', spoken: 'Dudu' },
  { name: 'Alex', slug: 'alex', sex: 'm', spoken: 'Alex' },
  { name: 'Alex', slug: 'alex_f', sex: 'f', spoken: 'Alex' },
  { name: 'Adi', slug: 'adi', sex: 'm', spoken: 'Adi' },
  { name: 'Adi', slug: 'adi_f', sex: 'f', spoken: 'Adi' },
  { name: 'Eran', slug: 'eran', sex: 'm', spoken: 'Eran' },
  { name: 'Aviv', slug: 'aviv', sex: 'm', spoken: 'Aviv' },
  { name: 'Aviv', slug: 'aviv_f', sex: 'f', spoken: 'Aviv' },
  { name: 'Ziv', slug: 'ziv', sex: 'm', spoken: 'Ziv' },
  { name: 'Ziv', slug: 'ziv_f', sex: 'f', spoken: 'Ziv' },
];

export function nameEntry(profile) {
  const n = (profile?.name || '').trim().split(/\s+/)[0];   // השם הפרטי (המילה הראשונה)
  return NAMES.find((x) => x.name === n && x.sex === (profile.sex || 'm')) || null;
}
