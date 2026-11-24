// אונבורדינג: 9 שלבים — מסלול, מאמן (וציוד בקליסתניקס), פרטים, מטרה, מבדק רמה, לו״ז, פציעות, תזונה, בניית תוכנית.
import { OTHER, setLang } from '../lang.js';
import { html, esc, on, $, toast, icon } from '../ui/dom.js';
import { defaultReminderSettings } from '../reminders.js';
import { COACHES, coachesFor } from '../data/coaches.js';
import { MJ_PATHS, MJ_WEEKS, MJ_STAGES } from '../engine/med-journey.js';
import { GOALS, INJURIES, estimateLevel, LEVEL_NAMES, goalsFor, goalForTrack } from '../engine/program.js';
import { newCali, caliLevel, mixCaliCount, recommendTrack } from '../engine/cali.js';
import { newMob, mobLevel, mobScore } from '../engine/mob.js';
import { TEST_IDS } from '../data/mob.js';
import { mobTestHtml, bindMobTest, flagChips, flagNotes } from './mob-ui.js';
import { EQUIP } from '../data/cali.js';
import { runLevelFrom3k, RUN_BASES } from '../engine/running.js';
import { ANCHOR_LIFTS } from '../engine/progression.js';
import { DISLIKE_TAGS } from '../data/foods.js';
import { nutPrefsHtml, bindNutPrefs } from './nut-prefs.js';
import { set, createPlan, today, lohemData, importFromLohem } from '../store.js';
import { BRAND } from '../brand.js';
import { say, unlock, stop } from '../coach/voice.js';

const WD_NAMES = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const WD_SPREAD = { 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5] };
// שער האפליקציה: התחום של כל מאמן על הכרטיס שלו, ומספר המאמנים במילים
const GATE_TILES = {
  gym: ['חדר כושר', 'עם אורי ונועה', ['ori', 'noa']], cali: ['קליסתניקס', 'עם מאיה', ['maya']], run: ['ריצה', 'עם גיא ושירה', ['guy', 'shira']],
  hiit: ['HIIT', 'עם ליה', ['lia']], pil: ['פילאטיס', 'עם ליה', ['lia']], yoga: ['יוגה', 'עם יעל', ['yael']], tai: ['טאי צ\'י', 'עם מיי', ['mei']], walk: ['הליכה', 'עם שירה', ['shira']], med: ['מדיטציה בתנועה', 'עם אור', ['or']], mob: ['מוביליטי', 'עם תמר', ['tamar']],
  mix: ['משולב', 'כמה מסלולים בשבוע', []],
};

const GOAL_DESC = {
  combat: 'כוח + ריצה + סבולת. כושר מאוזן לכל מה שהחיים דורשים.',
  muscle: 'בניית מסת שריר ונפח, עם ריצה לשמירה על כושר.',
  strength: 'להרים כבד יותר — סקוואט, דדליפט, לחיצות.',
  cut: 'הורדת אחוזי שומן תוך שמירה על שריר וכוח.',
  skill: 'כוח יחסי ושליטה: מתח, מקבילים, עמידת ידיים, ומשם למיומנויות המתקדמות.',
  core: 'בטן עמוקה, גב ויציבות אגן — הבסיס של כל תנועה אחרת.',
  fit: 'סיבולת לב־ריאה וכוח במשקל גוף, באימונים קצרים ועצימים.',
  r5k: 'מריצה־הליכה ועד חמישה קילומטרים רצופים. מתאים גם למי שעוד לא רץ.',
  r10k: 'להאריך את הריצה ולהוסיף קצב: עשרה קילומטרים בביטחון.',
  r21k: 'ריצות ארוכות שגדלות בהדרגה, עד 21 קילומטרים.',
  flex: 'טווחי תנועה גדולים יותר בכל הגוף: ירכיים, כתפיים, גב וקרסוליים.',
  posture: 'לפתוח את מה שמתקצר בישיבה ממושכת: גב עליון, חזה, מכופפי ירך וצוואר.',
};
const MOB_GOAL_DESC = { cut: 'ירידה בשומן דרך התזונה, עם תנועה יומית שקל להתמיד בה.' };
const PIL_GOAL_DESC = { posture: 'זוקפי הגב, שכמות ואורך: לעמוד ולשבת זקוף בלי מאמץ.', cut: 'ירידה בשומן דרך התזונה, עם שיעורים שמחזקים ומאריכים.' };
const WALK_GOAL_DESC = { health: 'לב, ריאות ומצב רוח: חצי שעה של הליכה מהירה ברוב ימות השבוע — ההמלצה הבסיסית לבריאות.', cut: 'ירידה בשומן דרך התזונה, עם הליכות שקל להתמיד בהן.' };
const TAI_GOAL_DESC = { bal: 'עמידה יציבה ובטוחה יותר: רגליים חזקות, שיווי משקל, ופחות חשש מנפילה.', zen: 'להאט, לנשום ולהירגע — בתנועה איטית ורציפה.', cut: 'ירידה בשומן דרך התזונה, עם תרגול עדין שקל להתמיד בו.' };
const YOGA_GOAL_DESC = { zen: 'להאט, לנשום ולשחרר מתח — עם גוף חזק וגמיש יותר.', flex: 'טווחי תנועה גדולים יותר: ירכיים, אחורי הרגליים, גב וכתפיים.', cut: 'ירידה בשומן דרך התזונה, עם תרגול שמחזק ומרגיע.' };
const HIIT_GOAL_DESC = { cut: 'ירידה בשומן: אימונים קצרים ועצימים, עם תזונה בגירעון מתון.' };
const RUN_GOAL_DESC = { cut: 'ירידה בשומן עם ריצות קלות וארוכות, ותזונה בגירעון מתון.' };
const CALI_GOAL_DESC = { muscle: 'בניית שריר במשקל גוף: יותר נפח וסטים, עם עודף קלורי קטן.', cut: 'ירידה בשומן תוך שמירה על כוח. גוף קל יותר — מיומנויות קלות יותר.' };
export const goalDesc = (goal, track) => (track === 'cali' && CALI_GOAL_DESC[goal]) || (track === 'mob' && MOB_GOAL_DESC[goal]) || (track === 'run' && RUN_GOAL_DESC[goal]) || (track === 'hiit' && HIIT_GOAL_DESC[goal]) || (track === 'pil' && PIL_GOAL_DESC[goal]) || (track === 'yoga' && YOGA_GOAL_DESC[goal]) || (track === 'tai' && TAI_GOAL_DESC[goal]) || (track === 'walk' && WALK_GOAL_DESC[goal]) || GOAL_DESC[goal];
// "2 אימוני חדר כושר + אימון קליסתניקס אחד"
const nWorkouts = (n, kind) => (n === 1 ? `אימון ${kind} אחד` : `${n} אימוני ${kind}`);
export const splitText = (gym, cali) => `${nWorkouts(gym, 'חדר כושר')} + ${nWorkouts(cali, 'קליסתניקס')}`;
export const TRACKS = {
  med: { name: 'מדיטציה בתנועה', sub: 'הליכה מדיטטיבית עם אור', desc: 'הליכה בחוץ עם אור: רעיון אחד לכל הליכה — שחרור, ריפוי, חיבור, איפוס, הודיה או נוכחות — דיבור קצר, הרבה שקט, ומוזיקה שמשתנה עם הקצב.' },
  gym: { name: 'חדר כושר', sub: 'משקולות, מכונות וריצה', desc: 'תוכנית כוח וכושר עם אורי או נועה: משקלים שמתעדכנים לבד, ריצות ומבדק 3 ק״מ.' },
  mix: { name: 'משולב', sub: 'חדר כושר + קליסתניקס באותו שבוע', desc: 'חלק מהאימונים בחדר הכושר עם אורי או נועה, וחלק במשקל גוף עם מאיה. משקלים וסולמות מתקדמים במקביל, ואפשר לקבוע כמה אימונים מכל סוג — ולצרף גם אימוני מוביליטי עם תמר.' },
  run: { name: 'ריצה', sub: 'מ-5 ק״מ ראשונים ועד חצי מרתון', desc: 'תוכנית ריצה עם גיא או שירה: ריצה־הליכה למתחילים, ריצות קלות, אינטרוולים וריצה ארוכה שגדלה כל שבוע. מרחק וקצב ב-GPS, ומבדק 3 ק״מ פעם בחודש.' },
  hiit: { name: 'HIIT', sub: 'אימונים קצרים ועצימים בבית', desc: 'אימוני אינטרוולים עם ליה: 15 עד 25 דקות, משקל גוף בלבד, בלי ציוד. קטע עבודה חזק, מנוחה קצרה, והתרגיל הבא. לכל תרגיל קופצני יש גרסה בלי קפיצות.' },
  pil: { name: 'פילאטיס', sub: 'שיעורי מזרן — ליבה, גב ויציבה', desc: 'פילאטיס מזרן עם ליה: שיעורים של 20 עד 40 דקות, תנועה איטית ומדויקת מהמרכז. שלוש רמות, בלי ציוד — רק מזרן.' },
  walk: { name: 'הליכה', sub: 'הליכות מודרכות בחוץ, עם מוזיקה', desc: 'תוכנית הליכה עם שירה: הליכה מהירה, אינטרוולים בהליכה והליכה ארוכה שגדלה כל שבוע. שירה מדריכה באוזניות, והמרחק והקצב נמדדים ב-GPS. בלי ציוד — רק נעליים נוחות.' },
  tai: { name: 'טאי צ\'י', sub: 'תנועה איטית, שיווי משקל ונשימה — בעמידה', desc: 'שיעורי טאי צ\'י עם מיי: 15 עד 30 דקות, בעמידה גבוהה ובצעדים קטנים. מתחילים מהיסודות, ממשיכים לצורת שמונה ולתנועות מצורת עשרים וארבע. בלי ציוד — רק כיסא או קיר בהישג יד.' },
  yoga: { name: 'יוגה', sub: 'נשימה, תנוחות והרפיה — על מזרן', desc: 'שיעורי יוגה עם יעל: 20 עד 45 דקות, מתנוחות עמידה ושיווי משקל ועד הרפיה בסוף. שלוש רמות, בלי ציוד — רק מזרן.' },
  mob: { name: 'מוביליטי', sub: 'גמישות וטווחי תנועה — מזרן וקיר', desc: 'אימוני מוביליטי וגמישות עם תמר: מבחן טווחים ביתי, אימון של 10 עד 30 דקות לפי הזמן שיש, והתמקדות באזורים שהכי צריכים. בלי ציוד ובלי כאב.' },
  cali: { name: 'קליסתניקס', sub: 'משקל גוף — בבית או בפארק', desc: 'אימוני משקל גוף עם מאיה: סולמות התקדמות מהשלב הראשון ועד מתח, עמידת ידיים, עליית כוח ופלאנש. עובד גם בלי ציוד בכלל.' },
};

export function renderOnboarding(root, done) {
  const d = {
    track: 'gym', auto: false, gymAccess: 'yes', coach: 'ori', equip: [], squats: 20, dips: 0, plankSec: 45, name: '', age: 20, heightCm: 178, weightKg: 72, targetWeight: 75, sex: 'm',
    goal: 'combat', years: 1, pushups: 30, pullups: 8, run3kStr: '', days: 4, sessionMin: 60,
    injuries: [], dislikes: [], dislikedFoods: [], nutrition: null, diet: 'all', kosher: false, mealsN: 5, allergies: [], health: [], mobN: 0, mobMin: 20, mobTest: {}, flags: [], runBase: 15, hiitMin: 20, hiitLevel: 2, hiitLow: false, pilMin: 30, pilLevel: 1, yogaMin: 30, yogaLevel: 1, taiMin: 20, taiLevel: 1, walkMin: 30, walkLevel: 1, medMin: 30, mjPath: 'full', mjWeeks: 8, mjLevel: 1,
  };
  let step = 0;
  const STEPS = 11;
  const REC = 9, BUILD = 10;
  // "תמליצו לי": המסלול נקבע רק בשלב ההמלצה (אחרי ההיכרות). עד אז שואלים את כל מה שצריך לשני המסלולים —
  // או רק לקליסתניקס, אם אין גישה לחדר כושר.
  const undecided = () => d.auto && !d.decided;
  const cali = () => (undecided() ? d.gymAccess === 'no' : d.track === 'cali');      // קליסתניקס בלבד
  const mix = () => (undecided() ? d.gymAccess !== 'no' : d.track === 'mix');        // משולב
  const anyCali = () => undecided() || d.track === 'cali' || d.track === 'mix';
  const run = () => !undecided() && d.track === 'run';                                // ריצה בלבד
  const hiit = () => !undecided() && d.track === 'hiit';                              // HIIT בלבד
  const pil = () => !undecided() && d.track === 'pil';                                // פילאטיס בלבד
  const yoga = () => !undecided() && d.track === 'yoga';                              // יוגה בלבד
  const tai = () => !undecided() && d.track === 'tai';                                // טאי צ'י בלבד
  const walk = () => !undecided() && d.track === 'walk';                              // הליכה בלבד
  const med = () => !undecided() && d.track === 'med';                                // מדיטציה בתנועה: מסע רוחני בשלבים (25.11.2026)
  const mjTime = () => { const h = Number(String(d.schedTime || '18:00').split(':')[0]); return h < 11 ? 'morning' : h >= 17 ? 'evening' : 'day'; };   // מתי הולכים — לפי השעה שנבחרה בשלב הזמנים
  const cls = () => pil() || yoga() || tai();                                                  // מסלולי שיעורים: רמה, אורך שיעור ושאלון בטיחות
  const mob = () => !undecided() && d.track === 'mob';                                // מוביליטי בלבד
  // כמה אימוני מוביליטי אפשר לשלב בשבוע של מסלול אחר (נשאר לפחות אימון אחד לכל חלק אחר)
  const mobMax = () => Math.min(3, d.days - (mix() ? 2 : 1));
  const mobN = () => (mob() ? 0 : Math.max(0, Math.min(d.mobN || 0, mobMax())));
  const withMob = () => mob() || mobN() > 0;
  const withFlags = () => withMob() || cls();
  const dm = () => ({ ...d, mobN: mobN(), mob: mobN() ? {} : null });                // לחישוב החלוקה במשולב כשיש גם מוביליטי
  const testDone = () => TEST_IDS.every((id) => d.mobTest[id] != null);
  const rec = () => recommendTrack({ gymAccess: d.auto ? d.gymAccess : 'yes', goal: d.goalWanted || d.goal, days: d.days, injuries: d.injuries });
  // מחיל מסלול (המלצה או בחירה ידנית בשלב ההמלצה)
  const decide = (track, mixCali) => {
    d.decided = true; d.track = track; d.goal = goalForTrack(d.goalWanted || d.goal, track);
    if (track === 'mix') d.mixCali = mixCali ?? rec().mixCali ?? undefined; else delete d.mixCali;
    d.coach = track === 'cali' ? 'maya' : track === 'mob' ? 'tamar' : track === 'run' ? (d.runCoach || 'guy') : track === 'hiit' || track === 'pil' ? 'lia' : track === 'yoga' ? 'yael' : track === 'tai' ? 'mei' : track === 'walk' ? 'shira' : track === 'med' ? 'or' : (d.gymCoach || 'ori');
  };
  const fem = () => !!COACHES[d.coach].f;
  const recMix = () => { const r = recommendTrack({ gymAccess: 'yes', goal: d.goal, days: d.days - mobN(), injuries: d.injuries }); return r.track === 'mix' ? r.mixCali : Math.floor((d.days - mobN()) / 2); };

  const views = [
    // 0 — פתיחה
    () => { const tile = (id) => { const [name, sub, who] = GATE_TILES[id]; return `<figure>${who.length ? `<span class="gt-faces">${who.map((c) => `<img src="${COACHES[c].face}" alt="">`).join('')}</span>` : `<span class="gt-ico">${icon('sparkle')}</span>`}<figcaption><b>${name}</b><span>${sub}</span></figcaption></figure>`; };
      const row = (ids, cls) => `<div class="gate-row ${cls}"><div class="gate-track">${[...ids, ...ids, ...ids, ...ids].map(tile).join('')}</div></div>`;
      return html`<div class="gate">
        <div class="gate-top"><div class="gate-logo">${BRAND.name}</div><div class="gate-tag">הסטודיו שלך. בכל מקום.</div></div>
        <div class="gate-wall" aria-hidden="true">${row(['gym', 'med', 'yoga', 'run'], 'tall')}${row(['cali', 'pil', 'hiit', 'med'], 'tall b')}${row(['mob', 'tai', 'walk', 'mix'], 'tall')}${row(['gym', 'yoga', 'med', 'run', 'pil'], 'short')}${row(['cali', 'hiit', 'tai', 'walk', 'mob', 'mix'], 'short b')}</div>
        <div class="gate-copy">
          <div class="gate-h">עשרה סוגי אימון.<br><em>סטודיו אחד.</em></div>
          <p class="sub">עשרה מאמנים מלווים אותך — במסלול אחד או בשילוב ביניהם.</p>
          <div class="gate-feats"><span>${icon('target')}תוכנית שמשתנה איתך</span><span>${icon('vol')}ספירת חזרות בקול</span><span>${icon('chart')}תזונה ומעקב</span></div>
          ${lohemData() ? `<button class="btn block" style="margin-top:12px" data-lohem>${icon('download', 'width="18" height="18"')} להמשיך עם הנתונים שלי מ"חוד"</button><p class="sub" style="font-size:12px;margin-top:6px">הפרופיל, האימונים, השקילות והתזונה של ${esc(lohemData().profile.name)} יועתקו לכאן. אפליקציית "חוד" נשארת כמו שהיא.</p>` : ''}
        </div></div>`; },
    // 1 — מסלול
    () => html`<div class="eyebrow">שלב 1 · המסלול</div><div class="q">איך ${d.sex === 'f' ? 'את מתאמנת' : 'אתה מתאמן'}?</div>
      <p class="sub">אפשר לבחור מסלול אחד או לשלב. מחליפים בהגדרות בכל רגע, בלי לאבד היסטוריה.</p>
      ${['gym', 'cali', 'run', 'walk', 'med', 'hiit', 'pil', 'yoga', 'tai', 'mob', 'mix'].map((id) => [id, TRACKS[id]]).map(([id, t]) => html`<button class="track-card ${!d.auto && d.track === id ? 'on' : ''}" data-track="${id}">
        <div class="tc-img">${(id === 'mix' ? ['ori', 'noa', 'maya', 'tamar'].map((c) => COACHES[c]) : coachesFor(id)).map((c) => `<img src="${c.face}" alt="">`).join('')}</div>
        <div><b>${t.name}</b><span class="tc-sub">${t.sub}</span><span>${t.desc}</span></div></button>`)}
      <button class="track-card auto ${d.auto ? 'on' : ''}" data-track="auto"><div class="tc-ico">${icon('sparkle')}</div>
        <div><b>לא ${d.sex === 'f' ? 'בטוחה' : 'בטוח'}? נמליץ לך</b><span class="tc-sub">המלצת המערכת</span><span>כמה שאלות על המטרה, הציוד והזמן — ובסוף ההיכרות נציע מסלול וחלוקה של השבוע. אפשר לקבל או לבחור אחרת.</span></div></button>`,
    // 2 — מאמן (ובקליסתניקס: ציוד). במצב "תמליצו לי": איפה אפשר להתאמן
    () => (d.auto ? html`<div class="eyebrow">שלב 2 · איפה מתאמנים</div><div class="q">מה יש לך בהישג יד?</div>
      <label class="field"><span>חדר כושר</span><div class="seg" data-seg="gymAccess">
        ${[['yes', 'יש לי'], ['some', 'לפעמים'], ['no', 'אין']].map(([v, t]) => `<button data-v="${v}" class="${d.gymAccess === v ? 'on' : ''}">${t}</button>`).join('')}</div></label>
      <div class="q" style="font-size:20px;margin-top:14px">וציוד למשקל גוף?</div>
      <p class="sub">בבית, בפארק או בחצר. אפשר לסמן כמה, ואפשר גם כלום.</p>
      <div class="chips">${Object.entries(EQUIP).map(([id, x]) => `<button class="chip ${d.equip.includes(id) ? 'on' : ''}" data-equip="${id}">${x.name}</button>`).join('')}</div>
      <div class="card tight" style="margin-top:14px"><b>בסוף ההיכרות נמליץ על מסלול.</b><div class="sub">לפי המטרה, הימים, הציוד והפציעות. ההחלטה נשארת אצלך — ואת המאמן בוחרים שם, כשיודעים באיזה מסלול מדובר.</div></div>`
      : run() ? html`<div class="eyebrow">שלב 2 · המאמן שלך</div><div class="q">מי ירוץ איתך?</div>
      <p class="sub">המאמן ילווה אותך באוזניות בכל ריצה: יגיד מתי לרוץ ומתי ללכת, ישמור על הקצב ויעודד. אפשר להחליף בכל רגע.</p>
      <div class="coach-pick">${coachesFor('run').map((c) => html`
        <button class="coach-card ${d.coach === c.id ? 'on' : ''}" data-coach="${c.id}">
          <img src="${c.img}" alt="${c.name}"><span class="check">✓</span>
          <div class="cap"><b>${c.name}</b><span>${c.title}</span></div></button>`)}</div>
      <p class="sub" style="margin-top:14px">${esc(COACHES[d.coach].bio)}</p>
      <div class="card tight" style="margin-top:6px"><b>מה צריך?</b><div class="sub">נעלי ריצה וטלפון. המרחק והקצב נמדדים ב-GPS של הטלפון; שעון דופק הוא תוספת, לא חובה.</div></div>`
      : med() ? html`<div class="eyebrow">שלב 2 · המלווה</div><div class="q">${esc(COACHES.or.name)} תלווה את המסע</div>
      <div class="coach-solo"><img src="${COACHES.or.img}" alt="${COACHES.or.name}"><div><b>${COACHES.or.name}</b><span>${COACHES.or.title}</span><p class="sub">${esc(COACHES.or.bio)}</p>
        <button class="btn sm teal" data-coach="or">${icon('play', 'width="16" height="16"')} לשמוע אותה</button></div></div>
      <div class="card tight" style="margin-top:16px"><b>מה צריך?</b><div class="sub">נעליים נוחות, אוזניות, ומסלול שנעים ללכת בו. העיניים פקוחות והמבט על הדרך.</div></div>
      <div class="card tight" style="margin-top:10px"><b>איך נראה המסע?</b><div class="sub">מסע של כמה שבועות בארבעה שלבים: ${MJ_STAGES.map((x) => x.name).join(', ')}. בכל הליכה רעיון אחד, דיבור קצר והרבה שקט, עם מוזיקה שמשתנה עם הקצב — ובדרך נבנה גם כושר ההליכה.</div></div>`
      : walk() ? html`<div class="eyebrow">שלב 2 · המאמנת</div><div class="q">${esc(COACHES.shira.name)} תלך איתך</div>
      <div class="coach-solo"><img src="${COACHES.shira.img}" alt="${COACHES.shira.name}"><div><b>${COACHES.shira.name}</b><span>${COACHES.shira.title}</span><p class="sub">${esc(COACHES.shira.bio)}</p>
        <button class="btn sm teal" data-coach="shira">${icon('play', 'width="16" height="16"')} לשמוע אותה</button></div></div>
      <div class="card tight" style="margin-top:16px"><b>מה צריך?</b><div class="sub">נעליים נוחות, אוזניות, ומסלול שנעים ללכת בו. הטלפון מודד מרחק וקצב ב-GPS.</div></div>
      <div class="card tight" style="margin-top:10px"><b>איך נראית הליכה?</b><div class="sub">חימום בהליכה נינוחה, החלק המרכזי — הליכה מהירה או קטעים נמרצים — ושחרור לסיום. שירה אומרת מתי להגביר ומתי להאט, ומוזיקה בקצב הליכה מלווה אותך.</div></div>`
      : tai() ? html`<div class="eyebrow">שלב 2 · המאמנת</div><div class="q">${esc(COACHES.mei.name)} תאמן אותך</div>
      <div class="coach-solo"><img src="${COACHES.mei.img}" alt="${COACHES.mei.name}"><div><b>${COACHES.mei.name}</b><span>${COACHES.mei.title}</span><p class="sub">${esc(COACHES.mei.bio)}</p>
        <button class="btn sm teal" data-coach="mei">${icon('play', 'width="16" height="16"')} לשמוע אותה</button></div></div>
      <div class="card tight" style="margin-top:16px"><b>מה צריך?</b><div class="sub">מקום לצעד לכל כיוון, נעליים שטוחות או יחפים, וכיסא יציב או קיר בהישג יד. בלי ציוד נוסף.</div></div>
      <div class="card tight" style="margin-top:10px"><b>איך נראה שיעור?</b><div class="sub">חימום קצר לקרסוליים ולכתפיים, עמידת פתיחה, כמה תנועות איטיות שמיי מדגימה ומסבירה שלב אחרי שלב, ועמידת סיום. עמידה גבוהה, צעדים קטנים, בלי כאב.</div></div>`
      : yoga() ? html`<div class="eyebrow">שלב 2 · המאמנת</div><div class="q">${esc(COACHES.yael.name)} תאמן אותך</div>
      <div class="coach-solo"><img src="${COACHES.yael.img}" alt="${COACHES.yael.name}"><div><b>${COACHES.yael.name}</b><span>${COACHES.yael.title}</span><p class="sub">${esc(COACHES.yael.bio)}</p>
        <button class="btn sm teal" data-coach="yael">${icon('play', 'width="16" height="16"')} לשמוע אותה</button></div></div>
      <div class="card tight" style="margin-top:16px"><b>מה צריך?</b><div class="sub">מזרן, ומקום לפרוש ידיים לצדדים. בגדים נוחים, ויחפים. בלי ציוד נוסף.</div></div>
      <div class="card tight" style="margin-top:10px"><b>איך נראה שיעור?</b><div class="sub">פותחים בישיבה ובנשימה, עוברים לתנוחות עמידה ושיווי משקל, יורדים למזרן, ומסיימים בהרפיה. מחזיקים כל תנוחה כמה נשימות — בלי כאב ובלי תחרות.</div></div>`
      : pil() ? html`<div class="eyebrow">שלב 2 · המאמנת</div><div class="q">${esc(COACHES.lia.name)} תאמן אותך</div>
      <div class="coach-solo"><img src="${COACHES.lia.img}" alt="${COACHES.lia.name}"><div><b>${COACHES.lia.name}</b><span>${COACHES.lia.title}</span><p class="sub">${esc(COACHES.lia.bio)}</p>
        <button class="btn sm teal" data-coach="lia">${icon('play', 'width="16" height="16"')} לשמוע אותה</button></div></div>
      <div class="card tight" style="margin-top:16px"><b>מה צריך?</b><div class="sub">מזרן, ומקום לשכב עם ידיים ורגליים פרושות. בלי ציוד נוסף.</div></div>
      <div class="card tight" style="margin-top:10px"><b>איך נראה שיעור?</b><div class="sub">פותחים בנשימה ובחיבור למרכז, ממשיכים לרצף תרגילים איטי — כל תרגיל כדקה — ומסיימים במתיחה. ליה מדגימה כל תנועה ומזכירה על מה לשים לב.</div></div>`
      : hiit() ? html`<div class="eyebrow">שלב 2 · המאמנת</div><div class="q">${esc(COACHES.lia.name)} תאמן אותך</div>
      <div class="coach-solo"><img src="${COACHES.lia.img}" alt="${COACHES.lia.name}"><div><b>${COACHES.lia.name}</b><span>${COACHES.lia.title}</span><p class="sub">${esc(COACHES.lia.bio)}</p>
        <button class="btn sm teal" data-coach="lia">${icon('play', 'width="16" height="16"')} לשמוע אותה</button></div></div>
      <div class="card tight" style="margin-top:16px"><b>מה צריך?</b><div class="sub">שני מטרים פנויים ומזרן. בלי ציוד — רק משקל גוף.</div></div>
      <div class="card tight" style="margin-top:10px"><b>איך נראה אימון?</b><div class="sub">חימום קצר, ואז מעגל של חמישה או שישה תרגילים: עבודה חזקה, מנוחה קצרה, והבא בתור. כמה סבבים, מתיחות — ונגמר.</div></div>`
      : mob() ? html`<div class="eyebrow">שלב 2 · המאמנת</div><div class="q">${esc(COACHES.tamar.name)} תאמן אותך</div>
      <div class="coach-solo"><img src="${COACHES.tamar.img}" alt="${COACHES.tamar.name}"><div><b>${COACHES.tamar.name}</b><span>${COACHES.tamar.title}</span><p class="sub">${esc(COACHES.tamar.bio)}</p>
        <button class="btn sm teal" data-coach="tamar">${icon('play', 'width="16" height="16"')} לשמוע אותה</button></div></div>
      <div class="card tight" style="margin-top:16px"><b>מה צריך?</b><div class="sub">מזרן או שטיח, קיר פנוי וכיסא. בלי ציוד נוסף, ואפשר גם בסלון.</div></div>
      <div class="card tight" style="margin-top:10px"><b>איך נראה אימון?</b><div class="sub">פותחים בתנועה איטית, ממשיכים להחזקות רגועות של 30 שניות, ומסיימים בנשימה. לפני כל אימון בוחרים כמה זמן יש: 10, 20 או 30 דקות.</div></div>`
      : cali() ? html`<div class="eyebrow">שלב 2 · המאמנת והציוד</div><div class="q">${esc(COACHES.maya.name)} תאמן אותך</div>
      <div class="coach-solo"><img src="${COACHES.maya.img}" alt="${COACHES.maya.name}"><div><b>${COACHES.maya.name}</b><span>${COACHES.maya.title}</span><p class="sub">${esc(COACHES.maya.bio)}</p>
        <button class="btn sm teal" data-coach="maya">${icon('play', 'width="16" height="16"')} לשמוע אותה</button></div></div>
      <div class="q" style="font-size:20px;margin-top:18px">איזה ציוד יש לך?</div>
      <p class="sub">אפשר לסמן כמה, ואפשר גם כלום — התוכנית תיבנה ממה שיש: רצפה, קיר, כיסא ושולחן יציב מספיקים. משנים בכל רגע בהגדרות.</p>
      <div class="chips">${Object.entries(EQUIP).map(([id, x]) => `<button class="chip ${d.equip.includes(id) ? 'on' : ''}" data-equip="${id}">${x.name}</button>`).join('')}</div>
      <p class="sub" style="margin-top:12px">${d.equip.length ? d.equip.map((id) => EQUIP[id].desc).join(' · ') : 'בלי ציוד: משיכות ייעשו כחתירה מתחת לשולחן או במשקוף. מתח הוא הציוד הראשון שכדאי להוסיף.'}</p>`
      : html`<div class="eyebrow">שלב 2 · המאמן שלך</div><div class="q">${mix() ? 'מי יאמן אותך בחדר הכושר?' : 'מי יאמן אותך?'}</div>
      <p class="sub">המאמן ילווה אותך בכל אימון: ידגים כל תרגיל, יספור חזרות, ימדוד מנוחות ויעודד. אפשר להחליף בכל רגע.</p>
      <div class="coach-pick">${coachesFor('gym').map((c) => html`
        <button class="coach-card ${d.coach === c.id ? 'on' : ''}" data-coach="${c.id}">
          <img src="${c.img}" alt="${c.name}"><span class="check">✓</span>
          <div class="cap"><b>${c.name}</b><span>${c.title}</span></div></button>`)}</div>
      <p class="sub" style="margin-top:14px">${esc(COACHES[d.coach].bio)}</p>
      ${mix() ? html`<div class="card tight" style="margin-top:6px"><div class="row"><img src="${COACHES.maya.face}" alt="" style="width:46px;height:54px;object-fit:cover;border-radius:12px"><div><div class="eyebrow">ובאימוני הקליסתניקס</div><b>${COACHES.maya.name}</b><div class="sub" style="font-size:13px">במסלול המשולב יש שני מאמנים: ${COACHES[d.coach].name} בחדר הכושר, ו${COACHES.maya.name} באימוני הקליסתניקס. ${esc(COACHES.maya.bio)}</div></div></div></div>
      <div class="q" style="font-size:20px;margin-top:16px">איזה ציוד יש לך לקליסתניקס?</div>
      <p class="sub">אפשר לסמן כמה, ואפשר גם כלום.</p>
      <div class="chips">${Object.entries(EQUIP).map(([id, x]) => `<button class="chip ${d.equip.includes(id) ? 'on' : ''}" data-equip="${id}">${x.name}</button>`).join('')}</div>` : ''}`),
    // 3 — פרטים
    () => html`<div class="eyebrow">שלב 3 · נכיר</div><div class="q">נעים להכיר</div>
      <label class="field"><span>${undecided() ? 'פנייה אליך בלשון' : `${COACHES[d.coach].name} ${fem() ? 'תפנה' : 'יפנה'} אליך בלשון`}</span><div class="seg" data-seg="sex">
        <button data-v="m" class="${d.sex === 'm' ? 'on' : ''}">זכר</button><button data-v="f" class="${d.sex === 'f' ? 'on' : ''}">נקבה</button></div></label>
      <label class="field"><span>${undecided() ? 'שם (כך יקראו לך באימונים)' : `שם (${COACHES[d.coach].name} ${fem() ? 'תקרא' : 'יקרא'} לך בשם)`}</span><input class="input" name="name" value="${esc(d.name)}" placeholder="איך לקרוא לך?" autocomplete="given-name"></label>
      <div class="grid2">
        <label class="field"><span>גיל</span><input class="input num" name="age" type="number" inputmode="numeric" value="${d.age}"></label>
        <label class="field"><span>גובה (ס״מ)</span><input class="input num" name="heightCm" type="number" inputmode="numeric" value="${d.heightCm}"></label>
        <label class="field"><span>משקל נוכחי (ק״ג)</span><input class="input num" name="weightKg" type="number" inputmode="decimal" step="0.1" value="${d.weightKg}"></label>
        <label class="field"><span>משקל יעד (ק״ג)</span><input class="input num" name="targetWeight" type="number" inputmode="decimal" step="0.1" value="${d.targetWeight}"></label>
      </div>`,
    // 4 — מטרה
    () => (med() ? html`<div class="eyebrow">שלב 4 · הדרך</div><div class="q">איזו דרך?</div>
      <p class="sub">הדרך קובעת אילו מסעות פוגשים בכל שלב. אפשר להתחיל מסע חדש בכל רגע, בהגדרות.</p>
      <div class="mjp-list">${Object.entries(MJ_PATHS).map(([id, x]) => `<button type="button" class="mjp ${d.mjPath === id ? 'on' : ''}" data-mjpath="${id}" style="background-image:linear-gradient(90deg, rgba(12,10,26,.05), rgba(12,10,26,.82) 60%), url(assets/med/${x.art}_sq.webp)"><b>${x.name}</b><small>${x.desc}</small></button>`).join('')}</div>`
    : html`<div class="eyebrow">שלב 4 · המטרה</div><div class="q">על מה עובדים?</div>
      ${(undecided() ? ['combat', 'muscle', 'strength', 'cut', 'skill'] : goalsFor(d.track)).map((id) => html`<button class="goal-card ${d.goal === id ? 'on' : ''}" data-goal="${id}">
        <div class="gi">${icon(GOALS[id].icon)}</div><div><b>${GOALS[id].name}</b><span>${goalDesc(id, d.track)}</span></div></button>`)}`),
    // 5 — מבדק רמה
    () => (med() ? html`<div class="eyebrow">שלב 5 · נקודת הפתיחה</div><div class="q">כמה ${d.sex === 'f' ? 'את הולכת' : 'אתה הולך'} היום?</div>
      <p class="sub">לפי זה נקבע כמה מההליכות יהיו בקצב מהיר. המסע מתחיל רגוע, והקצב עולה משלב לשלב.</p>
      <div class="mt-opts" data-mjlevel>${[[1, 'בתחילת הדרך', 'כמעט לא הולכים, או חוזרים אחרי הפסקה ארוכה'], [2, 'הליכה קבועה', 'חצי שעה ברצף בלי קושי, כמה פעמים בשבוע'], [3, 'כושר הליכה טוב', 'שעה ברצף בקצב מהיר']].map(([v, n, x]) => `<button data-v="${v}" class="${d.mjLevel === v ? 'on' : ''}"><span style="display:grid"><b>${n}</b><span class="sub" style="font-size:12px">${x}</span></span></button>`).join('')}</div>`
      : walk() ? html`<div class="eyebrow">שלב 5 · נקודת הפתיחה</div><div class="q">כמה ${d.sex === 'f' ? 'את הולכת' : 'אתה הולך'} היום?</div>
      <p class="sub">לפי זה נקבע כמה מההליכה תהיה בקצב מהיר. מי שמתמיד עולה רמה אחרי ארבעה שבועות.</p>
      <div class="mt-opts" data-walklevel>${[[1, 'מתחילים', 'כמעט לא הולכים, או חוזרים אחרי הפסקה ארוכה'], [2, 'הולכים קבוע', 'חצי שעה ברצף בלי קושי, כמה פעמים בשבוע'], [3, 'הולכים מהר', 'שעה ברצף בקצב מהיר; רוצים אתגר']].map(([v, t, x]) => `<button data-v="${v}" class="${d.walkLevel === v ? 'on' : ''}"><span style="display:grid"><b>${t}</b><span class="sub" style="font-size:12px">${x}</span></span></button>`).join('')}</div>`
      : tai() ? html`<div class="eyebrow">שלב 5 · נקודת הפתיחה</div><div class="q">כמה טאי צ'י כבר עשית?</div>
      <p class="sub">לפי זה נקבע אילו תנועות נכנסות לשיעור. מי שמתמיד עולה רמה אחרי ארבעה שבועות, ונפתחות לו תנועות חדשות.</p>
      <div class="mt-opts" data-tailevel>${[[1, 'יסודות', 'פעם ראשונה: עמידה, העברת משקל והתנועות הראשונות'], [2, 'צורת שמונה', 'מכיר את היסודות; מוסיפים צעדים ובעיטת עקב נמוכה'], [3, 'צורת עשרים וארבע', 'מתרגל באופן קבוע; מוסיפים תנועות מהצורה הארוכה']].map(([v, t, x]) => `<button data-v="${v}" class="${d.taiLevel === v ? 'on' : ''}"><span style="display:grid"><b>${t}</b><span class="sub" style="font-size:12px">${x}</span></span></button>`).join('')}</div>`
      : yoga() ? html`<div class="eyebrow">שלב 5 · נקודת הפתיחה</div><div class="q">כמה יוגה כבר עשית?</div>
      <p class="sub">לפי זה נקבע אילו תנוחות נכנסות לשיעור. מי שמתמיד עולה רמה אחרי ארבעה שבועות, ונפתחות לו תנוחות חדשות.</p>
      <div class="mt-opts" data-yogalevel>${[[1, 'מתחילים', 'פעם ראשונה, או אחרי הפסקה ארוכה'], [2, 'ממשיכים', 'מכיר את התנוחות הבסיסיות — לוחם, כלב מביט מטה, קוברה'], [3, 'מתקדמים', 'מתרגל באופן קבוע; מוכן גם לשיווי משקל על הידיים']].map(([v, t, x]) => `<button data-v="${v}" class="${d.yogaLevel === v ? 'on' : ''}"><span style="display:grid"><b>${t}</b><span class="sub" style="font-size:12px">${x}</span></span></button>`).join('')}</div>`
      : pil() ? html`<div class="eyebrow">שלב 5 · נקודת הפתיחה</div><div class="q">כמה פילאטיס כבר עשית?</div>
      <p class="sub">לפי זה נקבע אילו תרגילים נכנסים לשיעור. מי שמתמיד עולה רמה אחרי ארבעה שבועות, ונפתחים לו תרגילים חדשים.</p>
      <div class="mt-opts" data-pillevel>${[[1, 'בסיס', 'פעם ראשונה, או אחרי הפסקה ארוכה'], [2, 'ביניים', 'מכיר את התרגילים הבסיסיים — כולל המאה ומספריים'], [3, 'מתקדם', 'מתרגל באופן קבוע; מוכן גם לטיזר']].map(([v, t, x]) => `<button data-v="${v}" class="${d.pilLevel === v ? 'on' : ''}"><span style="display:grid"><b>${t}</b><span class="sub" style="font-size:12px">${x}</span></span></button>`).join('')}</div>`
      : hiit() ? html`<div class="eyebrow">שלב 5 · נקודת הפתיחה</div><div class="q">מה רמת הכושר שלך היום?</div>
      <p class="sub">לפי זה נקבע היחס בין עבודה למנוחה. עדיף להתחיל נמוך — מי שמתמיד עולה רמה אחרי ארבעה שבועות.</p>
      <div class="mt-opts" data-hiitlevel>${[[1, 'מתחיל', '30 שניות עבודה, 30 מנוחה'], [3, 'בכושר סביר', '40 שניות עבודה, 20 מנוחה'], [5, 'בכושר טוב', '45 שניות עבודה, 15 מנוחה']].map(([v, t, x]) => `<button data-v="${v}" class="${d.hiitLevel === v ? 'on' : ''}"><span style="display:grid"><b>${t}</b><span class="sub" style="font-size:12px">${x}</span></span></button>`).join('')}</div>
      <label class="field" style="margin-top:14px"><span>קפיצות</span><div class="seg" data-seg="hiitLowStr">
        <button data-v="no" class="${!d.hiitLow ? 'on' : ''}">עם קפיצות</button><button data-v="yes" class="${d.hiitLow ? 'on' : ''}">בלי קפיצות</button></div>
        <div class="sub" style="font-size:12px;margin-top:4px">${d.hiitLow ? 'כל התרגילים בגרסה שקטה ועדינה למפרקים — מתאים גם לדירה עם שכנים מתחת.' : 'אפשר לעבור לגרסה בלי קפיצות בכל תרגיל, גם באמצע אימון.'}</div></label>`
      : run() ? html`<div class="eyebrow">שלב 5 · נקודת הפתיחה</div><div class="q">כמה זמן ${d.sex === 'f' ? 'את רצה' : 'אתה רץ'} היום ברצף?</div>
      <p class="sub">בלי לעצור ובלי ללכת. לפי זה נקבע מאיפה מתחילים — עדיף להעריך נמוך.</p>
      <div class="mt-opts" data-runbase>${RUN_BASES.map(([v, t]) => `<button data-v="${v}" class="${d.runBase === v ? 'on' : ''}">${t}</button>`).join('')}</div>
      <div class="card tight" style="margin-top:12px"><b>${d.runBase < 30 ? 'מתחילים בריצה־הליכה.' : 'מתחילים בריצות רצופות.'}</b><div class="sub">${d.runBase < 30 ? 'קטעי ריצה קצרים עם הליכה ביניהם, שמתארכים כל שבוע — עד חצי שעה של ריצה רצופה. ככה הגוף מסתגל בלי פציעות.' : 'ריצות קלות, ריצה איכותית אחת בשבוע, וריצה ארוכה שגדלה בארבע דקות בכל שבוע.'}</div></div>
      <label class="field" style="margin-top:12px"><span>זמן ריצת 3 ק״מ (דק:שנ׳) — אם ידוע. אפשר להשאיר ריק</span><input class="input num" name="run3kStr" placeholder="למשל 16:30" value="${esc(d.run3kStr)}" inputmode="numeric"></label>`
      : mob() ? html`<div class="eyebrow">שלב 5 · מבחן טווחים</div><div class="q">שישה מבחנים קצרים</div>
      <p class="sub">בבית, בלי ציוד: עושים כל מבחן פעם אחת, בלי חימום ובלי כוח, ומסמנים את מה שהכי קרוב. לפי התוצאות ${esc(COACHES.tamar.name)} תקבע במה להתמקד. אין זמן עכשיו? אפשר להמשיך ולעשות את המבחן אחר כך, מתוך מסך התוכנית.</p>
      ${mobTestHtml(d.mobTest)}`
      : cali() ? html`<div class="eyebrow">שלב 5 · מבדק רמה</div><div class="q">איפה ${d.sex === 'f' ? 'את עומדת' : 'אתה עומד'} היום?</div>
      <p class="sub">לפי התשובות ייקבע השלב ההתחלתי בכל סולם. לא ${d.sex === 'f' ? 'בטוחה' : 'בטוח'}? עדיף להעריך נמוך — עלייה בשלב קורית מהר, אחרי אימון טוב אחד.</p>
      <div class="grid2">
        <label class="field"><span>שכיבות סמיכה ברצף (מקס׳)</span><input class="input num" name="pushups" type="number" inputmode="numeric" value="${d.pushups}"></label>
        <label class="field"><span>סקוואטים ברצף (מקס׳)</span><input class="input num" name="squats" type="number" inputmode="numeric" value="${d.squats}"></label>
        ${d.equip.includes('bar') || d.equip.includes('rings') ? `<label class="field"><span>עליות מתח ברצף (מקס׳)</span><input class="input num" name="pullups" type="number" inputmode="numeric" value="${d.pullups}"></label>` : ''}
        ${d.equip.includes('pbars') || d.equip.includes('rings') ? `<label class="field"><span>מקבילים ברצף (מקס׳)</span><input class="input num" name="dips" type="number" inputmode="numeric" value="${d.dips}"></label>` : ''}
        <label class="field"><span>פלאנק — כמה שניות?</span><input class="input num" name="plankSec" type="number" inputmode="numeric" value="${d.plankSec}"></label>
      </div>
      <div class="card tight" style="margin-top:8px"><b>0 זה בסדר גמור.</b><div class="sub">לכל תנועה יש שלב ראשון שכל אחד יכול לבצע — שכיבות סמיכה על קיר, תלייה על מתח, סקוואט בעזרת אחיזה.</div></div>`
      : html`<div class="eyebrow">שלב 5 · מבדק רמה</div><div class="q">איפה ${d.sex === 'f' ? 'את עומדת' : 'אתה עומד'} היום?</div>
      <p class="sub">התשובות קובעות את רמת הקושי ההתחלתית (1–5). האפליקציה תעדכן אותה אוטומטית לפי הביצועים שלך.</p>
      <label class="field"><span>ניסיון בחדר כושר</span><div class="seg" data-seg="years">
        ${[[0, 'אין'], [0.5, 'חצי שנה'], [1, 'שנה+'], [3, '3 שנים+']].map(([v, t]) => `<button data-v="${v}" class="${d.years == v ? 'on' : ''}">${t}</button>`)}</div></label>
      <div class="grid2">
        <label class="field"><span>שכיבות סמיכה ברצף (מקס׳)</span><input class="input num" name="pushups" type="number" inputmode="numeric" value="${d.pushups}"></label>
        <label class="field"><span>עליות מתח ברצף (מקס׳)</span><input class="input num" name="pullups" type="number" inputmode="numeric" value="${d.pullups}"></label>
      </div>
      ${mix() ? `<div class="grid2">
        <label class="field"><span>סקוואטים ברצף (מקס׳)</span><input class="input num" name="squats" type="number" inputmode="numeric" value="${d.squats}"></label>
        <label class="field"><span>פלאנק — כמה שניות?</span><input class="input num" name="plankSec" type="number" inputmode="numeric" value="${d.plankSec}"></label>
        ${d.equip.includes('pbars') || d.equip.includes('rings') ? `<label class="field"><span>מקבילים ברצף (מקס׳)</span><input class="input num" name="dips" type="number" inputmode="numeric" value="${d.dips}"></label>` : ''}
      </div>` : ''}
      <label class="field"><span>זמן ריצת 3 ק״מ (דק:שנ׳) — אפשר להשאיר ריק</span><input class="input num" name="run3kStr" placeholder="למשל 13:30" value="${esc(d.run3kStr)}" inputmode="numeric"></label>
      <details class="card acc set-sec lifts" ${d.liftsOpen || Object.keys(ANCHOR_LIFTS).some((k) => d[`lift_${k}_w`]) ? 'open' : ''}><summary><span class="grow"><b>${d.sex === 'f' ? 'יודעת כמה את מרימה' : 'יודע כמה אתה מרים'}?</b><span class="sub">לא חובה — כך האימון הראשון יתחיל במשקל הנכון</span></span></summary>
        <div class="acc-body"><div class="sub t-foot" style="margin-bottom:8px">סט טוב אחד מהתקופה האחרונה: משקל × חזרות. אפשר למלא רק חלק.</div>
        ${Object.entries(ANCHOR_LIFTS).map(([k, name]) => `<div class="lift-row"><span>${name}</span>
          <input class="input num" name="lift_${k}_w" type="number" inputmode="decimal" placeholder="ק״ג" value="${d[`lift_${k}_w`] || ''}" aria-label="${name} — משקל בק״ג">
          <i>×</i><input class="input num" name="lift_${k}_r" type="number" inputmode="numeric" placeholder="חזרות" value="${d[`lift_${k}_r`] || ''}" aria-label="${name} — חזרות"></div>`).join('')}</div></details>`),
    // 6 — לו"ז
    () => html`<div class="eyebrow">שלב 6 · זמנים</div><div class="q">כמה ${d.sex === 'f' ? 'את יכולה' : 'אתה יכול'} להתאמן?</div>
      <label class="field"><span>אימונים בשבוע</span><div class="seg" data-seg="days">${(med() ? [2, 3, 4, 5, 6] : cls() ? [2, 3, 4, 5] : [3, 4, 5, 6]).map((v) => `<button data-v="${v}" class="${d.days == v ? 'on' : ''}">${v}</button>`)}</div></label>
      <label class="field"><span>באילו ימים?</span><div class="chips wd-chips">${WD_NAMES.map((n, i) => `<button type="button" class="chip ${wdays().includes(i) ? 'on' : ''}" data-wd="${i}">${n}</button>`).join('')}</div></label>
      <label class="field"><span>באיזו שעה בדרך כלל?</span><input class="input num" type="time" name="schedTime" value="${d.schedTime || '18:00'}" style="max-width:150px"></label>
      <div class="sub" style="font-size:12px;margin:-4px 0 10px">לפי זה נבנה יומן האימונים. אחר כך אפשר לשנות, לקבוע שעה אחרת לכל יום, להזיז אימון או לבטל.</div>
      ${mix() && !undecided() ? `<label class="field"><span>כמה מהם קליסתניקס? (השאר בחדר הכושר)</span><div class="seg" data-seg="mixCali">${Array.from({ length: d.days - mobN() - 1 }, (_, i) => i + 1).map((v) => `<button data-v="${v}" class="${mixCaliCount(dm()) === v ? 'on' : ''}">${v}${recMix() === v ? ' ★' : ''}</button>`).join('')}</div>
        <div class="sub" style="font-size:12px;margin-top:4px">★ המלצת המערכת לפי המטרה שלך. אפשר לבחור אחרת.</div></label>` : ''}
      ${mob() ? `<label class="field"><span>אורך אימון רגיל (דקות)</span><div class="seg" data-seg="mobMin">${[10, 20, 30].map((v) => `<button data-v="${v}" class="${d.mobMin == v ? 'on' : ''}">${v}</button>`).join('')}</div>
        <div class="sub" style="font-size:12px;margin-top:4px">זו רק ברירת המחדל — לפני כל אימון אפשר לבחור אחרת.</div></label>`
    : med() ? `<label class="field"><span>אורך הליכה רגילה (דקות)</span><div class="seg" data-seg="medMin">${[20, 30, 45].map((v) => `<button data-v="${v}" class="${d.medMin == v ? 'on' : ''}">${v}</button>`).join('')}</div></label>
      <label class="field"><span>אורך המסע</span><div class="seg" data-seg="mjWeeks">${MJ_WEEKS.map((v) => `<button data-v="${v}" class="${d.mjWeeks == v ? 'on' : ''}">${v} שבועות</button>`).join('')}</div>
        <div class="sub" style="font-size:12px;margin-top:4px">ארבעה שלבים שווים. מי שהולך בבוקר פותח כל שבוע במסע הבוקר.</div></label>`
    : html`${walk() ? `<label class="field"><span>אורך הליכה רגילה (דקות)</span><div class="seg" data-seg="walkMin">${[20, 30, 45, 60].map((v) => `<button data-v="${v}" class="${d.walkMin == v ? 'on' : ''}">${v}</button>`).join('')}</div></label>` : tai() ? `<label class="field"><span>אורך שיעור (דקות)</span><div class="seg" data-seg="taiMin">${[15, 20, 30].map((v) => `<button data-v="${v}" class="${d.taiMin == v ? 'on' : ''}">${v}</button>`).join('')}</div></label>` : yoga() ? `<label class="field"><span>אורך שיעור (דקות)</span><div class="seg" data-seg="yogaMin">${[20, 30, 45].map((v) => `<button data-v="${v}" class="${d.yogaMin == v ? 'on' : ''}">${v}</button>`).join('')}</div></label>` : pil() ? `<label class="field"><span>אורך שיעור (דקות)</span><div class="seg" data-seg="pilMin">${[20, 30, 40].map((v) => `<button data-v="${v}" class="${d.pilMin == v ? 'on' : ''}">${v}</button>`).join('')}</div></label>` : hiit() ? `<label class="field"><span>אורך אימון (דקות)</span><div class="seg" data-seg="hiitMin">${[15, 20, 25].map((v) => `<button data-v="${v}" class="${d.hiitMin == v ? 'on' : ''}">${v}</button>`).join('')}</div></label>` : run() || cls() ? '' : `<label class="field"><span>משך אימון (דקות)</span><div class="seg" data-seg="sessionMin">${[45, 60, 75, 90].map((v) => `<button data-v="${v}" class="${d.sessionMin == v ? 'on' : ''}">${v}</button>`).join('')}</div></label>`}
      <label class="field"><span>לשלב אימוני מוביליטי וגמישות עם ${COACHES.tamar.name}?</span><div class="seg" data-seg="mobN">${Array.from({ length: mobMax() + 1 }, (_, i) => `<button data-v="${i}" class="${mobN() === i ? 'on' : ''}">${i === 0 ? 'בלי' : i}</button>`).join('')}</div>
        <div class="sub" style="font-size:12px;margin-top:4px">${mobN() ? `${mobN() === 1 ? 'אימון אחד' : `${mobN()} אימונים`} מתוך ${d.days} בשבוע ${mobN() === 1 ? 'יהיה' : 'יהיו'} מוביליטי (10–30 דקות), והשאר במסלול שבחרת.` : 'אפשר להוסיף גם אחר כך, בהגדרות.'}</div></label>`}
      ${mob() ? `<div class="card tight" style="margin-top:8px"><b>קצר ותכוף עדיף על ארוך ונדיר.</b><div class="sub">עשר דקות ארבע פעמים בשבוע משפרות טווח תנועה יותר מאימון ארוך אחד. היעד הוא כעשר דקות בשבוע לכל אזור בגוף.</div></div>`
    : med() ? `<div class="card tight" style="margin-top:8px"><b>שלוש הליכות בשבוע הן התחלה טובה.</b><div class="sub">ההליכה האחרונה בשבוע היא הארוכה, והיא מתארכת בחמש דקות בכל שבוע. השבוע האחרון של כל שלב קל יותר.</div></div>`
    : walk() ? `<div class="card tight" style="margin-top:8px"><b>חמש הליכות בשבוע הן היעד; שלוש הן התחלה טובה.</b><div class="sub">ההמלצה לבריאות היא 150 דקות של הליכה מהירה בשבוע. ההליכה הארוכה נבנית בנפרד, וגדלה בחמש דקות בכל שבוע.</div></div>`
    : tai() ? `<div class="card tight" style="margin-top:8px"><b>שלושה שיעורים קצרים בשבוע, ואפשר יותר.</b><div class="sub">בטאי צ'י ההתמדה חשובה מהאורך: עשרים דקות כמה פעמים בשבוע בונות שיווי משקל וכוח ברגליים.</div></div>`
    : yoga() ? `<div class="card tight" style="margin-top:8px"><b>שניים־שלושה שיעורים בשבוע.</b><div class="sub">תרגול קצר וקבוע עדיף על שיעור ארוך פעם בשבוע. אפשר גם יותר — השיעורים מתחלפים בין עמידה, ירכיים, גב ושיעור רגוע.</div></div>`
    : pil() ? `<div class="card tight" style="margin-top:8px"><b>שניים־שלושה שיעורים בשבוע.</b><div class="sub">זה מה שנבדק ברוב המחקרים על פילאטיס, וזה מספיק כדי להרגיש שינוי. אפשר גם יותר — השיעורים מתחלפים בין מרכז, גב וירכיים.</div></div>`
    : hiit() ? `<div class="card tight" style="margin-top:8px"><b>עד שלושה אימונים קשים בשבוע.</b><div class="sub">גוף שלא מתאושש לא משתפר. מי שבוחר ארבעה אימונים ומעלה מקבל בין הקשים גם ימי "אירובי קל" — בלי קפיצות ובקצב נוח.</div></div>`
    : run() ? `<div class="card tight" style="margin-top:8px"><b>3 ריצות בשבוע מספיקות להתחלה.</b><div class="sub">עם יום מנוחה בין ריצה לריצה. 4 ומעלה — מתווספות ריצות קלות, ובחמש גם ריצה איכותית שנייה. אורך כל ריצה נקבע בתוכנית.</div></div>`
    : cali() ? `<div class="card tight" style="margin-top:8px"><b>3 אימונים בשבוע מספיקים.</b><div class="sub">זו ההמלצה המקובלת למתחילים: גוף מלא, עם יום מנוחה בין אימון לאימון. 4 ומעלה — האימונים מתפצלים לפלג עליון, רגליים, דחיפה ומשיכה.</div></div>`
    : `<div class="card tight" style="margin-top:8px"><b>הלו״ז משתנה?</b><div class="sub">אין בעיה — האימונים לא צמודים לימים בשבוע. פשוט עושים את האימון הבא בתור. ואם אין חדר כושר, יש "אימון בלי ציוד".</div></div>`}`,
    // 7 — פציעות
    () => html`<div class="eyebrow">שלב 7 · בטיחות</div><div class="q">יש כאבים או פציעות?</div>
      <p class="sub">נחליף תרגילים שעלולים להחמיר. במקרה של כאב חד — לעצור ולפנות לרופא.</p>
      <div class="chips">${Object.entries(INJURIES).map(([id, x]) => `<button class="chip no ${d.injuries.includes(id) ? 'on' : ''}" data-inj="${id}">${x.name}</button>`)}</div>
      <p class="sub" style="margin-top:14px">${d.injuries.length ? '' : 'אין פציעות — מצוין.'}</p>
      ${withFlags() ? `<div class="q" style="font-size:20px;margin-top:8px">${cls() ? 'ועוד שאלה — יש אחד מאלה?' : 'ולפני מתיחות — יש אחד מאלה?'}</div>
        <p class="sub">תרגילים שלא מתאימים למצב לא ייכנסו ${cls() ? 'לשיעורים' : 'לאימוני המוביליטי'}.</p>${flagChips(d.flags)}${flagNotes(d.flags)}` : ''}`,
    // 8 — תזונה
    () => (med() ? html`<div class="eyebrow">שלב 8 · תזונה</div><div class="q">במסלול הזה אין תפריט</div>
      <p class="sub">מדיטציה בתנועה היא הליכה ושקט, בלי יעדי קלוריות ובלי יומן אכילה. מי שרוצה ליווי תזונה יכול לבחור מסלול אחר בהגדרות, ולהפעיל אותו שם.</p>`
    : html`<div class="eyebrow">שלב 8 · תזונה</div><div class="q">רוצים גם ליווי תזונה?</div>
      <p class="sub">תפריט יומי מותאם, יעדי קלוריות וחלבון ויומן אכילה. זה לא חובה, ואפשר להפעיל או לכבות בכל רגע במסך התזונה.</p>
      <button class="nut-choice ${d.nutrition === true ? 'on' : ''}" data-nut="1"><div class="nc-ico">${icon('food')}</div><div><b>כן, עם תזונה</b><span>עוד כמה שאלות קצרות, והתפריט ייבנה לפיהן.</span></div></button>
      <button class="nut-choice ${d.nutrition === false ? 'on' : ''}" data-nut="0"><div class="nc-ico">${icon('dumbbell')}</div><div><b>לא עכשיו — רק אימונים</b><span>מדלגים על השאלות. מסך התזונה נשאר כבוי עד שמפעילים אותו.</span></div></button>
      ${d.nutrition ? html`${nutPrefsHtml(d)}
        <div class="h2 np-h">מה לא אוכלים?</div>
        <div class="chips">${Object.entries(DISLIKE_TAGS).map(([id, t]) => `<button class="chip no ${d.dislikes.includes(id) ? 'on' : ''}" data-dis="${id}">${t}</button>`)}</div>` : ''}`),
    // 9 — המלצת המערכת (רק במצב "תמליצו לי")
    () => {
      const r = rec();
      const isRec = d.track === r.track && (r.track !== 'mix' || mixCaliCount(dm()) === r.mixCali);
      return html`<div class="eyebrow">שלב 9 · המלצת המערכת</div><div class="q">${isRec ? 'זה המסלול שמתאים לך' : 'בחרת מסלול אחר'}</div>
      <div class="track-card on rec"><div class="tc-img">${(d.track === 'mix' ? ['ori', 'noa', 'maya', 'tamar'].map((c) => COACHES[c]) : coachesFor(d.track)).map((c) => `<img src="${c.face}" alt="">`).join('')}</div>
        <div><b>${TRACKS[d.track].name}</b><span class="tc-sub">${d.track === 'mix' ? `${splitText(d.days - mobN() - mixCaliCount(dm()), mixCaliCount(dm()))} בשבוע` : TRACKS[d.track].sub}</span>
        ${isRec ? r.why.map((w) => `<span class="why">${icon('check', 'width="14" height="14"')} ${esc(w)}</span>`).join('') : `<span>ההמלצה הייתה: ${TRACKS[r.track].name}${r.track === 'mix' ? ` (${splitText(d.days - r.mixCali, r.mixCali)})` : ''}.</span>`}</div></div>
      ${isRec ? '' : `<button class="btn sm teal" data-rec>${icon('sparkle', 'width="16" height="16"')} חזרה להמלצת המערכת</button>`}
      ${d.track === 'mix' ? `<label class="field" style="margin-top:14px"><span>כמה מהאימונים קליסתניקס?</span><div class="seg" data-seg="mixCali">${Array.from({ length: d.days - mobN() - 1 }, (_, i) => i + 1).map((v) => `<button data-v="${v}" class="${mixCaliCount(dm()) === v ? 'on' : ''}">${v}${r.track === 'mix' && r.mixCali === v ? ' ★' : ''}</button>`).join('')}</div></label>` : ''}
      ${!['cali', 'mob', 'hiit', 'pil', 'yoga', 'tai', 'walk', 'med'].includes(d.track) ? html`<div style="font-weight:700;margin:14px 0 8px">${d.track === 'run' ? 'מי ירוץ איתך?' : 'מי יאמן אותך בחדר הכושר?'}</div>
        <div class="coach-pick mini">${coachesFor(d.track === 'run' ? 'run' : 'gym').map((c) => `<button class="coach-card ${d.coach === c.id ? 'on' : ''}" data-coach="${c.id}"><img src="${c.img}" alt="${c.name}"><span class="check">✓</span><div class="cap"><b>${c.name}</b></div></button>`).join('')}</div>` : ''}
      <div style="font-weight:700;margin:16px 0 8px">${d.sex === 'f' ? 'מעדיפה' : 'מעדיף'} אחרת?</div>
      <div class="seg" data-pick-track>${['gym', 'cali', 'run', 'walk', 'med', 'hiit', 'pil', 'yoga', 'tai', 'mob', 'mix'].map((k) => `<button data-v="${k}" class="${d.track === k ? 'on' : ''}">${TRACKS[k].name}</button>`).join('')}</div>
      <p class="sub" style="font-size:12px;margin-top:8px">ההמלצה היא נקודת פתיחה. אפשר לשנות מסלול וחלוקה בכל רגע בהגדרות.</p>`;
    },
    // 10 — בנייה
    () => html`<div class="build-anim"><div class="core"></div>
      <div class="h1" style="font-size:24px">${esc(COACHES[d.coach].name)} ${fem() ? 'בונה' : 'בונה'} לך תוכנית…</div>
      <ul id="buildList">
        ${med() ? '<li>בוחרת את המסעות של כל שלב</li><li>קובעת כמה מההליכות בקצב מהיר</li><li>בונה הליכה ארוכה שגדלה כל שבוע</li><li>פורסת את המסע על השבועות</li>'
    : walk() ? '<li>קובעת כמה מההליכה בקצב מהיר</li><li>בונה הליכה ארוכה שגדלה כל שבוע</li><li>משבצת אינטרוולים בהליכה</li><li>מחשבת יעדי תזונה ותפריט</li>'
    : tai() ? '<li>בוחרת תנועות לפי הרמה</li><li>מתאימה לפציעות ולמצב</li><li>בונה שיעורים לשבוע</li><li>מחשבת יעדי תזונה ותפריט</li>'
    : yoga() ? '<li>בוחרת תנוחות לפי הרמה</li><li>מתאימה לפציעות ולמצב</li><li>בונה שיעורים לשבוע</li><li>מחשבת יעדי תזונה ותפריט</li>'
    : pil() ? '<li>בוחרת תרגילים לפי הרמה</li><li>מתאימה לפציעות ולמצב</li><li>בונה שיעורים לשבוע</li><li>מחשבת יעדי תזונה ותפריט</li>'
    : hiit() ? '<li>קובעת יחס עבודה ומנוחה</li><li>מתאימה תרגילים לפציעות</li><li>בונה מעגלים לשבוע</li><li>מחשבת יעדי תזונה ותפריט</li>'
    : run() ? `<li>${d.runBase < 30 ? 'קובע שלב פתיחה בריצה־הליכה' : 'קובע קצבי ריצה'}</li><li>בונה ריצה ארוכה שגדלה כל שבוע</li><li>משלב ריצות קלות ואיכותיות</li><li>מחשב יעדי תזונה ותפריט</li>`
    : mob() ? `<li>${testDone() ? 'מנתחת את מבחן הטווחים' : 'מאזנת בין כל אזורי הגוף'}</li><li>מתאימה תרגילים לפציעות ולמצב</li><li>בונה שבוע של אימוני מוביליטי</li><li>מחשבת יעדי תזונה ותפריט</li>`
    : cali() ? '<li>קובעת שלב התחלתי בכל סולם</li><li>מתאימה תרגילים לציוד ולפציעות</li><li>בוחרת מיומנויות ראשונות</li><li>בונה שבוע אימונים</li><li>מחשבת יעדי תזונה ותפריט</li>'
    : '<li>מנתח רמת כושר ויעדים</li><li>מתאים תרגילים למכשירים ולפציעות</li><li>בונה מחזור אימונים של 12 שבועות</li><li>משלב תוכנית ריצה לשיפור 3 ק״מ</li><li>מחשב יעדי תזונה ותפריט</li>'}</ul></div>`,
  ];

  // ימי האימון: מה שסומן, כל עוד מספרם תואם ל"אימונים בשבוע"; אחרת פיזור ברירת מחדל
  const wdays = () => (d.schedDays && d.schedDays.length === Number(d.days) ? d.schedDays : WD_SPREAD[d.days] || [0, 2, 4]);
  function readInputs() {
    root.querySelectorAll('input[name]').forEach((i) => {
      d[i.name] = i.type === 'number' ? Number(i.value) : i.value.trim();
    });
  }

  // קיר המאמנים בשער: השורות נגללות לאט (שורה ב' בכיוון ההפוך). נגיעה עוצרת לרגע, ואפשר לגלול באצבע
  function gateDrift() {
    const wall = root.querySelector('.gate-wall');
    if (!wall || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rows = [...wall.querySelectorAll('.gate-row')].map((el) => ({ el, dir: el.classList.contains('b') ? -1 : 1, x: null }));
    let hold = 0, last = 0;
    const touch = () => { hold = performance.now() + 2500; for (const r of rows) r.x = null; };
    wall.addEventListener('touchstart', touch, { passive: true }); wall.addEventListener('touchmove', touch, { passive: true }); wall.addEventListener('wheel', touch, { passive: true });
    const tick = (t) => {
      if (!wall.isConnected) return;
      const dt = Math.min(64, t - (last || t)); last = t;
      if (t > hold) for (const r of rows) {
        const half = r.el.scrollWidth / 2; if (!r.el.offsetWidth || half < 50) continue;
        if (r.x == null) r.x = r.el.scrollLeft || (r.dir < 0 ? half : 0);
        r.x += r.dir * dt * 0.034;
        if (r.x >= half) r.x -= half; else if (r.x <= 0) r.x += half;
        r.el.scrollLeft = r.x;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function paint() {
    // משולב שנבחר ידנית: עד שהמתאמן נוגע בחלוקה, היא לפי המלצת המערכת (ומתעדכנת כשמשנים ימים או מטרה)
    if (d.track === 'mix' && !d.auto && !d.mixTouched) d.mixCali = recMix();
    const isBuild = step === BUILD;
    const last = step === (d.auto ? REC : REC - 1); // השלב האחרון לפני בניית התוכנית
    root.innerHTML = html`<div class="ob">
      ${step > 0 && !isBuild ? `<div class="steps">${Array.from({ length: STEPS - 2 }, (_, i) => `<i class="${i < step ? 'f' : ''}"></i>`).join('')}</div>` : ''}
      <div class="content">${views[step]()}</div>
      ${isBuild ? '' : html`<div class="actions">
        ${step > 0 ? '<button class="btn" data-act="back">חזרה</button>' : ''}
        <button class="btn primary block xl" data-act="next">${step === 0 ? 'מתחילים' : last ? 'בנה לי תוכנית' : step === REC - 1 ? 'להמלצה' : 'המשך'}</button></div>
        ${step === 0 ? `<button class="gate-guide" data-act="guide">${icon('info', 'width="16" height="16"')} איך זה עובד? הסבר קצר</button><button class="gate-guide gate-lang" data-act="lang" lang="${OTHER.code}">${OTHER.label}</button>` : ''}`}
    </div>`;
    // הסעיף נשאר פתוח גם כשהמסך מצויר מחדש (למשל אחרי בחירת ניסיון)
    root.querySelector('details.lifts')?.addEventListener('toggle', (e) => { d.liftsOpen = e.target.open; });
    if (step === 0) gateDrift();
    if (isBuild) runBuild();
  }

  on(root, 'click', '[data-act]', (e, t) => {
    unlock();
    readInputs();
    if (t.dataset.act === 'guide') { location.hash = '#/guide'; return; }
    if (t.dataset.act === 'lang') { setLang(OTHER.code); return; }
    if (t.dataset.act === 'back') { if (step === REC) { d.decided = false; d.goal = d.goalWanted || d.goal; } step--; paint(); return; }
    if (root.querySelector('[data-nut]') && d.nutrition == null) { toast('רוצים ליווי תזונה? בוחרים כן או לא'); return; }
    if (step === 3 && !d.name) { toast('איך קוראים לך?'); return; }
    if (step === 5 && !cali() && !mob() && !hiit() && !cls() && d.run3kStr && !parse3k(d.run3kStr)) { toast('פורמט זמן: דקות:שניות, למשל 13:30'); return; }
    if (step === REC - 1) {
      if (!d.auto) { step = BUILD; paint(); return; }
      const r = rec(); decide(r.track, r.mixCali);       // נכנסים לשלב ההמלצה עם ההמלצה מוחלת
    }
    step++; paint();
  });
  on(root, 'click', '[data-coach]', (e, t) => {
    unlock(); readInputs();
    d.coach = t.dataset.coach;
    if (!COACHES[d.coach].track) d.gymCoach = d.coach; // רק אורי/נועה הם מאמני חדר הכושר
    if (COACHES[d.coach].track === 'run') d.runCoach = d.coach;
    set((s) => { s.profile = s.profile || {}; s.profile.coach = d.coach; return s; });
    stop(); say(pil() ? 'pil_hello' : `hello_${d.coach}`, { priority: true });
    paint();
  });
  on(root, 'click', '[data-lohem]', () => { if (importFromLohem()) { toast('הנתונים מ"חוד" הועתקו'); done(); } });
  on(root, 'click', '[data-track]', (e, t) => {
    readInputs();
    d.auto = t.dataset.track === 'auto'; d.decided = false;
    if (d.auto) { d.goalWanted = d.goal; paint(); return; }
    delete d.goalWanted;
    d.track = t.dataset.track;
    d.coach = cali() ? 'maya' : mob() ? 'tamar' : run() ? (d.runCoach || 'guy') : hiit() || pil() ? 'lia' : yoga() ? 'yael' : tai() ? 'mei' : walk() ? 'shira' : med() ? 'or' : (d.gymCoach || 'ori');
    d.goal = goalForTrack(d.goal, d.track);
    if (cls() && d.days > 3 && !d.daysTouched) d.days = 3;
    if (hiit() && d.days > 3 && !d.daysTouched) d.days = 3;
    if (run() && d.days > 3 && !d.daysTouched) d.days = 3;
    if (cali() && d.days > 3 && !d.daysTouched) d.days = 3;
    set((s) => { s.profile = s.profile || {}; s.profile.coach = d.coach; return s; });
    paint();
  });
  on(root, 'click', '[data-equip]', (e, t) => { readInputs(); toggle(d.equip, t.dataset.equip); paint(); });
  on(root, 'click', '[data-goal]', (e, t) => { d.goal = t.dataset.goal; if (d.auto) d.goalWanted = d.goal; paint(); });
  on(root, 'click', '[data-pick-track] button', (e, t) => { decide(t.dataset.v); paint(); });
  on(root, 'click', '[data-rec]', () => { const r = rec(); decide(r.track, r.mixCali); paint(); });
  on(root, 'click', '[data-seg] button', (e, t) => {
    readInputs();
    const v = t.dataset.v;
    d[t.closest('[data-seg]').dataset.seg] = Number.isNaN(Number(v)) ? v : Number(v);
    if (t.closest('[data-seg]').dataset.seg === 'days') d.daysTouched = true;
    if (t.closest('[data-seg]').dataset.seg === 'mixCali') d.mixTouched = true;
    if (t.closest('[data-seg]').dataset.seg === 'hiitLowStr') d.hiitLow = v === 'yes';
    paint();
  });
  on(root, 'click', '[data-wd]', (e, t) => {
    readInputs();
    const i = Number(t.dataset.wd), cur = wdays(), next = (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]).sort();
    const opts = [...root.querySelectorAll('[data-seg="days"] button')].map((b) => Number(b.dataset.v));
    if (!opts.includes(next.length)) { toast(`אפשר לבחור בין ${Math.min(...opts)} ל-${Math.max(...opts)} ימים`); return; }
    d.schedDays = next; d.days = next.length; d.daysTouched = true;
    paint();
  });
  on(root, 'click', '[data-inj]', (e, t) => { toggle(d.injuries, t.dataset.inj); paint(); });
  on(root, 'click', '[data-runbase] button', (e, t) => { readInputs(); d.runBase = Number(t.dataset.v); paint(); });
  on(root, 'click', '[data-pillevel] button', (e, t) => { d.pilLevel = Number(t.dataset.v); paint(); });
  on(root, 'click', '[data-yogalevel] button', (e, t) => { d.yogaLevel = Number(t.dataset.v); paint(); });
  on(root, 'click', '[data-walklevel] button', (e, t) => { d.walkLevel = Number(t.dataset.v); paint(); });
  on(root, 'click', '[data-mjlevel] button', (e, t) => { d.mjLevel = Number(t.dataset.v); paint(); });
  on(root, 'click', '[data-mjpath]', (e, t) => { d.mjPath = t.dataset.mjpath; root.querySelectorAll('[data-mjpath]').forEach((x) => x.classList.toggle('on', x === t)); });   // בלי ציור מחדש: המסך לא מהבהב בכל בחירה
  on(root, 'click', '[data-tailevel] button', (e, t) => { d.taiLevel = Number(t.dataset.v); paint(); });
  on(root, 'click', '[data-hiitlevel] button', (e, t) => { d.hiitLevel = Number(t.dataset.v); paint(); });
  on(root, 'click', '[data-flag]', (e, t) => { toggle(d.flags, t.dataset.flag); paint(); });
  bindMobTest(root, d.mobTest);
  on(root, 'click', '[data-dis]', (e, t) => { toggle(d.dislikes, t.dataset.dis); paint(); });
  on(root, 'click', '[data-nut]', (e, t) => { d.nutrition = t.dataset.nut === '1'; paint(); });
  bindNutPrefs(root, on, (mutate) => { mutate(d); paint(); });

  function runBuild() {
    const items = [...root.querySelectorAll('#buildList li')];
    items.forEach((li, i) => setTimeout(() => li.classList.add('ok'), 450 * (i + 1)));
    setTimeout(() => {
      const run3k = parse3k(d.run3kStr);
      const hM = (d.heightCm || 175) / 100;
      const caliState = anyCali() ? newCali({ pushups: d.pushups, pullups: mix() || d.equip.includes('bar') || d.equip.includes('rings') ? d.pullups : 0, squats: d.squats,
        dips: d.equip.includes('pbars') || d.equip.includes('rings') ? d.dips : 0, plankSec: d.plankSec, bmi: d.weightKg / (hM * hM) }, d.equip) : null;
      const mobState = withMob() ? { ...newMob(testDone() ? d.mobTest : null, d.flags), minutes: d.mobMin } : null;
      const level = med() ? d.mjLevel : walk() ? d.walkLevel : tai() ? d.taiLevel : yoga() ? d.yogaLevel : pil() ? d.pilLevel : hiit() ? d.hiitLevel : run() ? runLevelFrom3k(run3k) : mob() ? mobLevel(mobState) : caliState && cali() ? caliLevel(caliState) : estimateLevel({ years: d.years, pushups: d.pushups, pullups: d.pullups, run3k });
      const profile = {
        track: d.track, ...(d.auto ? { gymAccess: d.gymAccess } : {}), ...(caliState ? { cali: caliState } : {}), ...(mobState ? { mob: mobState, mobN: mobN() } : {}), ...(mix() ? { mixCali: mixCaliCount(dm()) } : {}), gymCoach: d.gymCoach || 'ori', ...(run() ? { runBase: d.runBase, runCoach: d.coach } : {}), ...(hiit() ? { hiitMin: d.hiitMin, hiitLow: d.hiitLow } : {}), ...(pil() ? { pilMin: d.pilMin, pilFlags: [...d.flags] } : {}), ...(yoga() ? { yogaMin: d.yogaMin, yogaFlags: [...d.flags] } : {}), ...(tai() ? { taiMin: d.taiMin, taiFlags: [...d.flags] } : {}), ...(walk() ? { walkMin: d.walkMin } : {}), ...(med() ? { medMin: d.medMin, medPace: 'calm', medJ: { path: d.mjPath, weeks: d.mjWeeks, level: d.mjLevel, time: mjTime(), start: new Date().toISOString() } } : {}),
        coach: d.coach, name: d.name, age: d.age, sex: d.sex, heightCm: d.heightCm, weightKg: d.weightKg, targetWeight: d.targetWeight,
        goal: d.goal, level, days: d.days, sessionMin: d.sessionMin, run3k, runLevel: runLevelFrom3k(run3k), injuries: d.injuries,
        nutrition: med() ? false : d.nutrition !== false, ...(d.nutrition ? { diet: d.diet, kosher: d.kosher, mealsN: d.mealsN, allergies: d.allergies, health: d.health, ...(d.eatAt === 'service' ? { eatAt: 'service' } : {}) } : {}),
        dislikes: d.nutrition ? d.dislikes : [], dislikedFoods: [], createdAt: new Date().toISOString(),
        lifts: liftsFrom((k, f) => d[`lift_${k}_${f}`]),
      };
      set((s) => {
        s.profile = profile;
        s.plan = createPlan(profile);
        s.reminders = { enabled: false, id: null, ...(s.reminders || {}), settings: { ...defaultReminderSettings(profile), ...(s.reminders?.settings || {}), workout: { on: true, days: [...wdays()], time: d.schedTime || '18:00' } } };
        s.planSeen = false; // המסך הבא: הצגת התוכנית (views/plan-intro.js)
        s.weights = [{ date: today(), kg: d.weightKg }];
        s.events = [{ type: 'coach', text: med() ? `המסע מוכן! ${MJ_PATHS[d.mjPath].name}, ${d.mjWeeks} שבועות, ${d.days} הליכות בשבוע.` : walk() ? `תוכנית ההליכה מוכנה! ${d.days} הליכות בשבוע, ${d.walkMin} דקות להליכה רגילה.` : tai() ? `תוכנית הטאי צ'י מוכנה! ${d.days} שיעורים בשבוע, ${d.taiMin} דקות כל אחד.` : yoga() ? `תוכנית היוגה מוכנה! ${d.days} שיעורים בשבוע, ${d.yogaMin} דקות כל אחד.` : pil() ? `תוכנית הפילאטיס מוכנה! ${d.days} שיעורים בשבוע, ${d.pilMin} דקות כל אחד.` : hiit() ? `תוכנית ה-HIIT מוכנה! ${d.hiitMin} דקות לאימון, ${d.days} פעמים בשבוע.` : run() ? `תוכנית הריצה מוכנה! היעד: ${GOALS[d.goal].name}. ${d.runBase < 30 ? 'מתחילים בריצה־הליכה.' : 'מתחילים בריצות רצופות.'}` : mob() ? `התוכנית מוכנה! ${GOALS[d.goal].name}.${testDone() ? ` ציון טווחים: ${mobScore(mobState)} מתוך 100.` : ' מבחן הטווחים מחכה במסך התוכנית.'}` : mix() ? `התוכנית המשולבת מוכנה! ${splitText(d.days - mobN() - mixCaliCount(dm()), mixCaliCount(dm()))} בשבוע.` : caliState ? `התוכנית מוכנה! ${GOALS[d.goal].name}. נקבע שלב התחלתי בכל סולם — אפשר לראות ולשנות במסך התוכנית.` : `התוכנית מוכנה! רמה ${level} — ${LEVEL_NAMES[level]}. ${GOALS[d.goal].name}.`, date: new Date().toISOString() }];
        return s;
      });
      done();
    }, 450 * (items.length + 1) + 300);
  }

  paint();
}

function toggle(arr, v) { const i = arr.indexOf(v); i >= 0 ? arr.splice(i, 1) : arr.push(v); }

// אוסף את ההרמות הידועות מהטופס: { bench_press: { w, reps }, ... } — רק שורות שמולאו במלואן ובטווח סביר
export function liftsFrom(get) {
  const out = {};
  for (const k of Object.keys(ANCHOR_LIFTS)) {
    const w = Number(get(k, 'w')), reps = Math.round(Number(get(k, 'r')));
    if (w > 0 && w <= 400 && reps >= 1 && reps <= 30) out[k] = { w, reps };
  }
  return out;
}

export function parse3k(str) {
  if (!str) return null;
  const m = String(str).trim().match(/^(\d{1,2})[:.](\d{2})$/);
  if (!m) return null;
  const sec = Number(m[1]) * 60 + Number(m[2]);
  return sec >= 8 * 60 && sec <= 30 * 60 ? sec : null;
}
