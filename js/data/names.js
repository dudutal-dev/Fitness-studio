// שמות מתאמנים שיש להם הקלטות אישיות (המאמן קורא להם בשם).
// להוספת מתאמן: להוסיף שורה ולהריץ  NODE_USE_ENV_PROXY=1 node tools/gen_voice.mjs
// spoken = השם בניקוד, לשיפור ההגייה.
export const NAMES = [
  { name: 'עומר', slug: 'omer', sex: 'm', spoken: 'עוֹמֶר' },
  // שמות נפוצים (בקשת בעל המוצר, 21.11.2026). שם שמתאים לגברים ולנשים מוקלט פעמיים — הפנייה בעברית שונה
  { name: 'עומר', slug: 'omer_f', sex: 'f', spoken: 'עוֹמֶר' },
  { name: 'טל', slug: 'tal', sex: 'm', spoken: 'טַל' },
  { name: 'טל', slug: 'tal_f', sex: 'f', spoken: 'טַל' },
  { name: 'שירה', slug: 'shira', sex: 'f', spoken: 'שִׁירָה' },
  { name: 'יפעת', slug: 'yifat', sex: 'f', spoken: 'יִפְעַת' },
  { name: 'דודו', slug: 'dudu', sex: 'm', spoken: 'דוּדוּ' },
  { name: 'אלכס', slug: 'alex', sex: 'm', spoken: 'אָלֶקְס' },
  { name: 'אלכס', slug: 'alex_f', sex: 'f', spoken: 'אָלֶקְס' },
  { name: 'עדי', slug: 'adi', sex: 'm', spoken: 'עֲדִי' },
  { name: 'עדי', slug: 'adi_f', sex: 'f', spoken: 'עֲדִי' },
  { name: 'ערן', slug: 'eran', sex: 'm', spoken: 'עֵרָן' },
  { name: 'אביב', slug: 'aviv', sex: 'm', spoken: 'אָבִיב' },
  { name: 'אביב', slug: 'aviv_f', sex: 'f', spoken: 'אָבִיב' },
  { name: 'זיו', slug: 'ziv', sex: 'm', spoken: 'זִיו' },
  { name: 'זיו', slug: 'ziv_f', sex: 'f', spoken: 'זִיו' },
];

export function nameEntry(profile) {
  const n = (profile?.name || '').trim().split(/\s+/)[0];   // השם הפרטי (המילה הראשונה)
  return NAMES.find((x) => x.name === n && x.sex === (profile.sex || 'm')) || null;
}
