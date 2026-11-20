// המאמנים הווירטואליים: אורי ונועה למסלול חדר הכושר, מאיה למסלול הקליסתניקס, תמר למסלול המוביליטי. תמונות ודמויות נוצרו ב-ElevenLabs (Gemini Flash Image + Veo 3.1 Fast).
export const COACHES = {
  ori: {
    id: 'ori', name: 'אורי', title: 'מאמן כוח וכושר', voice: 'Dorian (ElevenLabs)',
    bio: 'ישיר, אנרגטי ולא מוותר. מאמין שכוח אמיתי נבנה מטכניקה מושלמת ועקביות.',
    style: 'קשוח-חם', img: 'assets/coaches/ori.webp', face: 'assets/coaches/ori_face.webp',
  },
  noa: {
    id: 'noa', name: 'נועה', title: 'מאמנת כושר ותנועה', voice: 'Danit (ElevenLabs)',
    bio: 'מדויקת, מעודדת וחדה. תדאג שכל חזרה תספור ושתתקדם בלי פציעות.',
    style: 'מדויק-מעודד', img: 'assets/coaches/noa.webp', face: 'assets/coaches/noa_face.webp',
  },
  maya: {
    id: 'maya', name: 'מאיה', title: 'מאמנת קליסתניקס', voice: 'קול ייעודי (ElevenLabs)', track: 'cali', f: true,
    bio: 'רגועה, סבלנית ומדויקת. מאמינה ששליטה בגוף נבנית שלב אחרי שלב — בלי לדלג ובלי למהר.',
    style: 'רגוע-מדויק', img: 'assets/coaches/maya.webp', face: 'assets/coaches/maya_face.webp',
  },
  tamar: {
    id: 'tamar', name: 'תמר', title: 'מאמנת מוביליטי וגמישות', voice: 'Jessica (ElevenLabs)', track: 'mob', f: true,
    bio: 'רגועה, קשובה ומדויקת. מאמינה שטווח תנועה נבנה בנשימה ובהתמדה — כמה דקות ביום, בלי כאב ובלי כוח.',
    style: 'רגוע-קשוב', img: 'assets/coaches/tamar.webp', face: 'assets/coaches/tamar_face.webp',
  },
  guy: {
    id: 'guy', name: 'גיא', title: 'מאמן ריצה', voice: 'ElevenLabs', track: 'run',
    bio: 'אנרגטי, מעודד ומעשי. מאמין שכל אחד יכול לרוץ — אם מתחילים לאט ומוסיפים קצת בכל שבוע.',
    style: 'אנרגטי-מעודד', img: 'assets/coaches/guy.webp', face: 'assets/coaches/guy_face.webp',
  },
  shira: {
    id: 'shira', name: 'שירה', title: 'מאמנת ריצה', voice: 'ElevenLabs', track: 'run', f: true,
    bio: 'קלילה, ממוקדת וסבלנית. תשמור שהקצב יהיה נכון: רוב הריצות בקלות, ומעט מאוד במאמץ.',
    style: 'קליל-ממוקד', img: 'assets/coaches/shira.webp', face: 'assets/coaches/shira_face.webp',
  },
  lia: {
    id: 'lia', name: 'ליה', title: 'מאמנת HIIT ופילאטיס', voice: 'ElevenLabs', track: 'hiit', tracks: ['hiit', 'pil'], f: true,
    bio: 'אנרגטית, חדה ומדויקת. ב-HIIT לא מבזבזת שנייה; בפילאטיס מאטה, ומקפידה על כל תנועה.',
    style: 'אנרגטי-חד', img: 'assets/coaches/lia.webp', face: 'assets/coaches/lia_face.webp',
  },
  yael: {
    id: 'yael', name: 'יעל', title: 'מאמנת יוגה', voice: 'קול ייעודי (ElevenLabs)', track: 'yoga', f: true,
    bio: 'שלווה, חמה ומדויקת. מאמינה שיוגה מתחילה בנשימה: מי שנושם ברוגע בתנוחה, כבר עושה אותה נכון.',
    style: 'שלו-חם', img: 'assets/coaches/yael.webp', face: 'assets/coaches/yael_face.webp',
  },
  mei: {
    id: 'mei', name: 'מיי', title: 'מאמנת טאי צ\'י', voice: 'קול ייעודי (ElevenLabs)', track: 'tai', f: true,
    bio: 'רגועה, סבלנית ומדויקת. מלמדת טאי צ\'י בעמידה גבוהה ובצעדים קטנים: לאט, בלי כאב, ועם כיסא בהישג יד.',
    style: 'רגוע-סבלני', img: 'assets/coaches/mei.webp', face: 'assets/coaches/mei_face.webp',
  },
};
COACHES.noa.f = true;
// המאמנים של כל מסלול: חדר כושר — אורי ונועה; קליסתניקס — מאיה; מוביליטי — תמר; ריצה — גיא ושירה
const OWN = ['cali', 'mob', 'run', 'hiit', 'pil', 'yoga', 'tai'];
export const coachesFor = (track) => Object.values(COACHES).filter((c) => (c.tracks || [c.track || 'gym']).includes(OWN.includes(track) ? track : 'gym'));

export const demoVideo = (coach, exId) => `assets/demos/${coach}/${exId}.mp4`;
export const demoPoster = (coach, exId) => `assets/demos/${coach}/${exId}.webp`;
