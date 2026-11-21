// המאמנים הווירטואליים: אורי ונועה למסלול חדר הכושר, מאיה למסלול הקליסתניקס, תמר למסלול המוביליטי. תמונות ודמויות נוצרו ב-ElevenLabs (Gemini Flash Image + Veo 3.1 Fast).
export const COACHES = {
  ori: {
    id: 'ori', name: 'Ori', title: 'Strength & conditioning coach', voice: 'Dorian (ElevenLabs)',
    bio: 'Direct, energetic and relentless. Believes real strength is built on clean technique and consistency.',
    style: 'Tough but warm', img: '../assets/coaches/ori.webp', face: '../assets/coaches/ori_face.webp',
  },
  noa: {
    id: 'noa', name: 'Noa', title: 'Fitness & movement coach', voice: 'Danit (ElevenLabs)',
    bio: 'Precise, encouraging and sharp. She makes every rep count and keeps you progressing injury-free.',
    style: 'Precise and encouraging', img: '../assets/coaches/noa.webp', face: '../assets/coaches/noa_face.webp',
  },
  maya: {
    id: 'maya', name: 'Maya', title: 'Calisthenics coach', voice: 'Custom voice (ElevenLabs)', track: 'cali', f: true,
    bio: 'Calm, patient and precise. Believes body control is built one step at a time — no skipping, no rushing.',
    style: 'Calm and precise', img: '../assets/coaches/maya.webp', face: '../assets/coaches/maya_face.webp',
  },
  tamar: {
    id: 'tamar', name: 'Tamar', title: 'Mobility & flexibility coach', voice: 'Jessica (ElevenLabs)', track: 'mob', f: true,
    bio: 'Calm, attentive and precise. Believes range of motion comes from breathing and consistency — a few minutes a day, no pain, no forcing.',
    style: 'Calm and attentive', img: '../assets/coaches/tamar.webp', face: '../assets/coaches/tamar_face.webp',
  },
  guy: {
    id: 'guy', name: 'Guy', title: 'Running coach', voice: 'ElevenLabs', track: 'run',
    bio: 'Energetic, encouraging and practical. Believes anyone can run — start slow and add a little every week.',
    style: 'Energetic and encouraging', img: '../assets/coaches/guy.webp', face: '../assets/coaches/guy_face.webp',
  },
  shira: {
    id: 'shira', name: 'Shira', title: 'Running & walking coach', voice: 'ElevenLabs', track: 'run', tracks: ['run', 'walk'], f: true,
    bio: 'Light, focused and patient. She keeps your pace right: most runs easy, very few hard.',
    style: 'Light and focused', img: '../assets/coaches/shira.webp', face: '../assets/coaches/shira_face.webp',
  },
  lia: {
    id: 'lia', name: 'Lia', title: 'HIIT & Pilates coach', voice: 'ElevenLabs', track: 'hiit', tracks: ['hiit', 'pil'], f: true,
    bio: 'Energetic, sharp and precise. In HIIT she wastes no second; in Pilates she slows down and minds every move.',
    style: 'Energetic and sharp', img: '../assets/coaches/lia.webp', face: '../assets/coaches/lia_face.webp',
  },
  yael: {
    id: 'yael', name: 'Yael', title: 'Yoga teacher', voice: 'Custom voice (ElevenLabs)', track: 'yoga', f: true,
    bio: 'Serene, warm and precise. Believes yoga starts with the breath: if you can breathe calmly in a pose, you are already doing it right.',
    style: 'Serene and warm', img: '../assets/coaches/yael.webp', face: '../assets/coaches/yael_face.webp',
  },
  mei: {
    id: 'mei', name: 'Mei', title: 'Tai chi teacher', voice: 'Custom voice (ElevenLabs)', track: 'tai', f: true,
    bio: 'Calm, patient and precise. Teaches tai chi in a high stance with small steps: slowly, pain-free, with a chair within reach.',
    style: 'Calm and patient', img: '../assets/coaches/mei.webp', face: '../assets/coaches/mei_face.webp',
  },
};
COACHES.noa.f = true;
// המאמנים של כל מסלול: חדר כושר — אורי ונועה; קליסתניקס — מאיה; מוביליטי — תמר; ריצה — גיא ושירה
const OWN = ['cali', 'mob', 'run', 'hiit', 'pil', 'yoga', 'tai', 'walk'];
export const coachesFor = (track) => Object.values(COACHES).filter((c) => (c.tracks || [c.track || 'gym']).includes(OWN.includes(track) ? track : 'gym'));

export const demoVideo = (coach, exId) => `../assets/demos/${coach}/${exId}.mp4`;
export const demoPoster = (coach, exId) => `../assets/demos/${coach}/${exId}.webp`;
