// שמות מתאמנים שיש להם הקלטות אישיות (המאמן קורא להם בשם).
// להוספת מתאמן: להוסיף שורה ולהריץ  NODE_USE_ENV_PROXY=1 node tools/gen_voice.mjs
// spoken = השם בניקוד, לשיפור ההגייה.
export const NAMES = [
  { name: 'Omer', en: 'Omer', he: '\u05e2\u05d5\u05de\u05e8', slug: 'omer', sex: 'm', spoken: 'Omer' },
  // שמות נפוצים (בקשת בעל המוצר, 21.11.2026). שם שמתאים לגברים ולנשים מוקלט פעמיים — הפנייה בעברית שונה
  { name: 'Omer', en: 'Omer', he: '\u05e2\u05d5\u05de\u05e8', slug: 'omer_f', sex: 'f', spoken: 'Omer' },
  { name: 'Tal', en: 'Tal', he: '\u05d8\u05dc', slug: 'tal', sex: 'm', spoken: 'Tal' },
  { name: 'Tal', en: 'Tal', he: '\u05d8\u05dc', slug: 'tal_f', sex: 'f', spoken: 'Tal' },
  { name: 'Shira', en: 'Shira', he: '\u05e9\u05d9\u05e8\u05d4', slug: 'shira', sex: 'f', spoken: 'Shira' },
  { name: 'Yifat', en: 'Yifat', he: '\u05d9\u05e4\u05e2\u05ea', slug: 'yifat', sex: 'f', spoken: 'Yifat' },
  { name: 'Dudu', en: 'Dudu', he: '\u05d3\u05d5\u05d3\u05d5', slug: 'dudu', sex: 'm', spoken: 'Dudu' },
  { name: 'Alex', en: 'Alex', he: '\u05d0\u05dc\u05db\u05e1', slug: 'alex', sex: 'm', spoken: 'Alex' },
  { name: 'Alex', en: 'Alex', he: '\u05d0\u05dc\u05db\u05e1', slug: 'alex_f', sex: 'f', spoken: 'Alex' },
  { name: 'Adi', en: 'Adi', he: '\u05e2\u05d3\u05d9', slug: 'adi', sex: 'm', spoken: 'Adi' },
  { name: 'Adi', en: 'Adi', he: '\u05e2\u05d3\u05d9', slug: 'adi_f', sex: 'f', spoken: 'Adi' },
  { name: 'Eran', en: 'Eran', he: '\u05e2\u05e8\u05df', slug: 'eran', sex: 'm', spoken: 'Eran' },
  { name: 'Aviv', en: 'Aviv', he: '\u05d0\u05d1\u05d9\u05d1', slug: 'aviv', sex: 'm', spoken: 'Aviv' },
  { name: 'Aviv', en: 'Aviv', he: '\u05d0\u05d1\u05d9\u05d1', slug: 'aviv_f', sex: 'f', spoken: 'Aviv' },
  { name: 'Ziv', en: 'Ziv', he: '\u05d6\u05d9\u05d5', slug: 'ziv', sex: 'm', spoken: 'Ziv' },
  { name: 'Ziv', en: 'Ziv', he: '\u05d6\u05d9\u05d5', slug: 'ziv_f', sex: 'f', spoken: 'Ziv' },
];

// ההתאמה לפי השם הפרטי (המילה הראשונה) והמין. השם מזוהה בעברית ובאותיות לטיניות, בשתי השפות של האפליקציה:
// מי שכתב "דודו" ועבר לאנגלית, או כתב "Dudu" בעברית, עדיין מקבל פנייה בשמו.
// he הוא השם העברי בקידוד (\u05..) — כך הוא נשאר עברי גם בגרסה האנגלית, שבה name מתורגם.
export function nameEntry(profile) {
  const n = (profile?.name || '').trim().split(/\s+/)[0].toLowerCase();
  if (!n) return null;
  return NAMES.find((x) => [x.name, x.en, x.he].some((v) => v && v.toLowerCase() === n) && x.sex === (profile.sex || 'm')) || null;
}
