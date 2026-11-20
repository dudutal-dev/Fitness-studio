// רשימת הנכסים של מסלול הטאי צ'י לפי js/data/tai-exercises.js — הקלט של tools/build_tai.py
import { TAI_EXERCISES, taiClip } from '../js/data/tai-exercises.js';

const videos = new Map(), voice = [];
for (const e of TAI_EXERCISES) {
  videos.set(taiClip(e, e.clip), e.clip);
  if (e.src) voice.push([e.src, `ex_${e.id}`]);
  for (const [say, clip] of e.steps || []) {
    if (clip) videos.set(taiClip(e, clip), clip);
    if (say) voice.push([say, `tc_${say}`]);
  }
}
console.log(JSON.stringify({ videos: [...videos].map(([name, clip]) => [clip, name]), voice }));
