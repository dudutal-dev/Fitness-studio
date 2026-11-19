// המאמנים הווירטואליים: אורי ונועה למסלול חדר הכושר, מאיה למסלול הקליסתניקס. תמונות ודמויות נוצרו ב-ElevenLabs (Gemini Flash Image + Veo 3.1 Fast).
export const COACHES = {
  ori: {
    id: 'ori', name: 'אורי', title: 'מאמן כוח וכושר קרבי', voice: 'Dorian (ElevenLabs)',
    bio: 'ישיר, אנרגטי ולא מוותר. מאמין שכוח אמיתי נבנה מטכניקה מושלמת ועקביות.',
    style: 'קשוח-חם', img: 'assets/coaches/ori.webp', face: 'assets/coaches/ori_face.webp',
  },
  noa: {
    id: 'noa', name: 'נועה', title: 'מאמנת כושר ותנועה', voice: 'Danit (ElevenLabs)',
    bio: 'מדויקת, מעודדת וחדה. תדאג שכל חזרה תספור ושתתקדם בלי פציעות.',
    style: 'מדויק-מעודד', img: 'assets/coaches/noa.webp', face: 'assets/coaches/noa_face.webp',
  },
  maya: {
    id: 'maya', name: 'מאיה', title: 'מאמנת קליסתניקס', voice: 'Zina (ElevenLabs)', track: 'cali', f: true,
    bio: 'רגועה, סבלנית ומדויקת. מאמינה ששליטה בגוף נבנית שלב אחרי שלב — בלי לדלג ובלי למהר.',
    style: 'רגוע-מדויק', img: 'assets/coaches/maya.webp', face: 'assets/coaches/maya_face.webp',
  },
};
COACHES.noa.f = true;
// המאמנים של כל מסלול: חדר כושר — אורי ונועה; קליסתניקס — מאיה
export const coachesFor = (track) => Object.values(COACHES).filter((c) => (c.track || 'gym') === (track === 'cali' ? 'cali' : 'gym'));

export const demoVideo = (coach, exId) => `assets/demos/${coach}/${exId}.mp4`;
export const demoPoster = (coach, exId) => `assets/demos/${coach}/${exId}.webp`;
