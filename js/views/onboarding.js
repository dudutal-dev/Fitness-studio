// אונבורדינג: 9 שלבים — מסלול, מאמן (וציוד בקליסתניקס), פרטים, מטרה, מבדק רמה, לו״ז, פציעות, תזונה, בניית תוכנית.
import { html, esc, on, $, toast, icon } from '../ui/dom.js';
import { COACHES, coachesFor } from '../data/coaches.js';
import { GOALS, INJURIES, estimateLevel, LEVEL_NAMES, goalsFor, goalForTrack } from '../engine/program.js';
import { newCali, caliLevel, mixCaliCount, recommendTrack } from '../engine/cali.js';
import { EQUIP } from '../data/cali.js';
import { runLevelFrom3k } from '../engine/running.js';
import { ANCHOR_LIFTS } from '../engine/progression.js';
import { DISLIKE_TAGS } from '../data/foods.js';
import { set, createPlan, today, lohemData, importFromLohem } from '../store.js';
import { BRAND } from '../brand.js';
import { say, unlock, stop } from '../coach/voice.js';

const GOAL_DESC = {
  combat: 'כוח + ריצה + סבולת. כושר מאוזן לכל מה שהחיים דורשים.',
  muscle: 'בניית מסת שריר ונפח, עם ריצה לשמירה על כושר.',
  strength: 'להרים כבד יותר — סקוואט, דדליפט, לחיצות.',
  cut: 'הורדת אחוזי שומן תוך שמירה על שריר וכוח.',
  skill: 'כוח יחסי ושליטה: מתח, מקבילים, עמידת ידיים, ומשם למיומנויות המתקדמות.',
};
const CALI_GOAL_DESC = { muscle: 'בניית שריר במשקל גוף: יותר נפח וסטים, עם עודף קלורי קטן.', cut: 'ירידה בשומן תוך שמירה על כוח. גוף קל יותר — מיומנויות קלות יותר.' };
export const goalDesc = (goal, track) => (track === 'cali' && CALI_GOAL_DESC[goal]) || GOAL_DESC[goal];
// "2 אימוני חדר כושר + אימון קליסתניקס אחד"
const nWorkouts = (n, kind) => (n === 1 ? `אימון ${kind} אחד` : `${n} אימוני ${kind}`);
export const splitText = (gym, cali) => `${nWorkouts(gym, 'חדר כושר')} + ${nWorkouts(cali, 'קליסתניקס')}`;
export const TRACKS = {
  gym: { name: 'חדר כושר', sub: 'משקולות, מכונות וריצה', desc: 'תוכנית כוח וכושר עם אורי או נועה: משקלים שמתעדכנים לבד, ריצות ומבדק 3 ק״מ.' },
  mix: { name: 'משולב', sub: 'חדר כושר + קליסתניקס באותו שבוע', desc: 'חלק מהאימונים בחדר הכושר עם אורי או נועה, וחלק במשקל גוף עם מאיה. משקלים וסולמות מתקדמים במקביל, ואפשר לקבוע כמה אימונים מכל סוג.' },
  cali: { name: 'קליסתניקס', sub: 'משקל גוף — בבית או בפארק', desc: 'אימוני משקל גוף עם מאיה: סולמות התקדמות מהשלב הראשון ועד מתח, עמידת ידיים, עליית כוח ופלאנש. עובד גם בלי ציוד בכלל.' },
};

export function renderOnboarding(root, done) {
  const d = {
    track: 'gym', auto: false, gymAccess: 'yes', coach: 'ori', equip: [], squats: 20, dips: 0, plankSec: 45, name: '', age: 20, heightCm: 178, weightKg: 72, targetWeight: 75, sex: 'm',
    goal: 'combat', years: 1, pushups: 30, pullups: 8, run3kStr: '', days: 4, sessionMin: 60,
    injuries: [], dislikes: [], dislikedFoods: [],
  };
  let step = 0;
  const STEPS = 11;
  const REC = 9, BUILD = 10;
  // "תמליצו לי": המסלול נקבע רק בשלב ההמלצה (אחרי ההיכרות). עד אז שואלים את כל מה שצריך לשני המסלולים —
  // או רק לקליסתניקס, אם אין גישה לחדר כושר.
  const undecided = () => d.auto && !d.decided;
  const cali = () => (undecided() ? d.gymAccess === 'no' : d.track === 'cali');      // קליסתניקס בלבד
  const mix = () => (undecided() ? d.gymAccess !== 'no' : d.track === 'mix');        // משולב
  const anyCali = () => undecided() || d.track !== 'gym';
  const rec = () => recommendTrack({ gymAccess: d.auto ? d.gymAccess : 'yes', goal: d.goalWanted || d.goal, days: d.days, injuries: d.injuries });
  // מחיל מסלול (המלצה או בחירה ידנית בשלב ההמלצה)
  const decide = (track, mixCali) => {
    d.decided = true; d.track = track; d.goal = goalForTrack(d.goalWanted || d.goal, track);
    if (track === 'mix') d.mixCali = mixCali ?? rec().mixCali ?? undefined; else delete d.mixCali;
    d.coach = track === 'cali' ? 'maya' : (d.gymCoach || 'ori');
  };
  const fem = () => !!COACHES[d.coach].f;
  const recMix = () => { const r = recommendTrack({ gymAccess: 'yes', goal: d.goal, days: d.days, injuries: d.injuries }); return r.track === 'mix' ? r.mixCali : Math.floor(d.days / 2); };

  const views = [
    // 0 — פתיחה
    () => html`<div class="splash">
        <div class="duo"><img src="${COACHES.ori.img}" alt=""><img src="${COACHES.maya.img}" alt=""><img src="${COACHES.noa.img}" alt=""></div>
        <div class="copy">
          <div class="eyebrow">מאמן אישי וירטואלי</div>
          <div class="logo">${BRAND.name}</div>
          <div class="h1" style="font-size:24px;margin-top:10px">מאמן אישי לכל מסלול, בכל רמה.</div>
          <p class="sub" style="font-size:15px">חדר כושר וריצה, קליסתניקס במשקל גוף — או שילוב של השניים. תוכנית שמשתנה איתך, ספירת חזרות בקול, תזונה ומעקב — הכל במקום אחד.</p>
          ${lohemData() ? `<button class="btn block" style="margin-top:14px" data-lohem>${icon('download', 'width="18" height="18"')} להמשיך עם הנתונים שלי מ-LOHEM</button><p class="sub" style="font-size:12px;margin-top:6px">הפרופיל, האימונים, השקילות והתזונה של ${esc(lohemData().profile.name)} יועתקו לכאן. אפליקציית LOHEM נשארת כמו שהיא.</p>` : ''}
        </div></div>`,
    // 1 — מסלול
    () => html`<div class="eyebrow">שלב 1 · המסלול</div><div class="q">איך ${d.sex === 'f' ? 'את מתאמנת' : 'אתה מתאמן'}?</div>
      <p class="sub">אפשר לבחור מסלול אחד או לשלב. מחליפים בהגדרות בכל רגע, בלי לאבד היסטוריה.</p>
      ${['gym', 'cali', 'mix'].map((id) => [id, TRACKS[id]]).map(([id, t]) => html`<button class="track-card ${!d.auto && d.track === id ? 'on' : ''}" data-track="${id}">
        <div class="tc-img">${(id === 'mix' ? Object.values(COACHES) : coachesFor(id)).map((c) => `<img src="${c.face}" alt="">`).join('')}</div>
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
      : cali() ? html`<div class="eyebrow">שלב 2 · המאמנת והציוד</div><div class="q">${esc(COACHES.maya.name)} תאמן אותך</div>
      <div class="coach-solo"><img src="${COACHES.maya.img}" alt="${COACHES.maya.name}"><div><b>${COACHES.maya.name}</b><span>${COACHES.maya.title}</span><p class="sub">${esc(COACHES.maya.bio)}</p>
        <button class="btn sm teal" data-coach="maya">${icon('play', 'width="16" height="16"')} לשמוע אותה</button></div></div>
      <div class="q" style="font-size:20px;margin-top:18px">איזה ציוד יש לך?</div>
      <p class="sub">אפשר לסמן כמה, ואפשר גם כלום — התוכנית תיבנה ממה שיש: רצפה, קיר, כיסא ושולחן יציב מספיקים. משנים בכל רגע בהגדרות.</p>
      <div class="chips">${Object.entries(EQUIP).map(([id, x]) => `<button class="chip ${d.equip.includes(id) ? 'on' : ''}" data-equip="${id}">${x.name}</button>`).join('')}</div>
      <p class="sub" style="margin-top:12px">${d.equip.length ? d.equip.map((id) => EQUIP[id].desc).join(' · ') : 'בלי ציוד: משיכות ייעשו כחתירה מתחת לשולחן או במשקוף. מתח הוא הציוד הראשון שכדאי להוסיף.'}</p>`
      : html`<div class="eyebrow">שלב 2 · המאמן שלך</div><div class="q">מי יאמן אותך?</div>
      <p class="sub">המאמן ילווה אותך בכל אימון: ידגים כל תרגיל, יספור חזרות, ימדוד מנוחות ויעודד. אפשר להחליף בכל רגע.</p>
      <div class="coach-pick">${coachesFor('gym').map((c) => html`
        <button class="coach-card ${d.coach === c.id ? 'on' : ''}" data-coach="${c.id}">
          <img src="${c.img}" alt="${c.name}"><span class="check">✓</span>
          <div class="cap"><b>${c.name}</b><span>${c.title}</span></div></button>`)}</div>
      <p class="sub" style="margin-top:14px">${esc(COACHES[d.coach].bio)}</p>
      ${mix() ? html`<div class="card tight" style="margin-top:6px"><div class="row"><img src="${COACHES.maya.face}" alt="" style="width:46px;height:54px;object-fit:cover;border-radius:12px"><div><b>${COACHES.maya.name} תאמן אותך בקליסתניקס</b><div class="sub" style="font-size:13px">${esc(COACHES.maya.bio)}</div></div></div></div>
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
    () => html`<div class="eyebrow">שלב 4 · המטרה</div><div class="q">על מה עובדים?</div>
      ${(undecided() ? ['combat', 'muscle', 'strength', 'cut', 'skill'] : goalsFor(d.track)).map((id) => html`<button class="goal-card ${d.goal === id ? 'on' : ''}" data-goal="${id}">
        <div class="gi">${icon(GOALS[id].icon)}</div><div><b>${GOALS[id].name}</b><span>${goalDesc(id, d.track)}</span></div></button>`)}`,
    // 5 — מבדק רמה
    () => (cali() ? html`<div class="eyebrow">שלב 5 · מבדק רמה</div><div class="q">איפה ${d.sex === 'f' ? 'את עומדת' : 'אתה עומד'} היום?</div>
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
      <label class="field"><span>אימונים בשבוע</span><div class="seg" data-seg="days">${[3, 4, 5, 6].map((v) => `<button data-v="${v}" class="${d.days == v ? 'on' : ''}">${v}</button>`)}</div></label>
      ${mix() && !undecided() ? `<label class="field"><span>כמה מהם קליסתניקס? (השאר בחדר הכושר)</span><div class="seg" data-seg="mixCali">${Array.from({ length: d.days - 1 }, (_, i) => i + 1).map((v) => `<button data-v="${v}" class="${mixCaliCount(d) === v ? 'on' : ''}">${v}${recMix() === v ? ' ★' : ''}</button>`).join('')}</div>
        <div class="sub" style="font-size:12px;margin-top:4px">★ המלצת המערכת לפי המטרה שלך. אפשר לבחור אחרת.</div></label>` : ''}
      <label class="field"><span>משך אימון (דקות)</span><div class="seg" data-seg="sessionMin">${[45, 60, 75, 90].map((v) => `<button data-v="${v}" class="${d.sessionMin == v ? 'on' : ''}">${v}</button>`)}</div></label>
      ${cali() ? `<div class="card tight" style="margin-top:8px"><b>3 אימונים בשבוע מספיקים.</b><div class="sub">זו ההמלצה המקובלת למתחילים: גוף מלא, עם יום מנוחה בין אימון לאימון. 4 ומעלה — האימונים מתפצלים לפלג עליון, רגליים, דחיפה ומשיכה.</div></div>`
    : `<div class="card tight" style="margin-top:8px"><b>הלו״ז משתנה?</b><div class="sub">אין בעיה — האימונים לא צמודים לימים בשבוע. פשוט עושים את האימון הבא בתור. ואם אין חדר כושר, יש "אימון בלי ציוד".</div></div>`}`,
    // 7 — פציעות
    () => html`<div class="eyebrow">שלב 7 · בטיחות</div><div class="q">יש כאבים או פציעות?</div>
      <p class="sub">נחליף תרגילים שעלולים להחמיר. במקרה של כאב חד — לעצור ולפנות לרופא.</p>
      <div class="chips">${Object.entries(INJURIES).map(([id, x]) => `<button class="chip no ${d.injuries.includes(id) ? 'on' : ''}" data-inj="${id}">${x.name}</button>`)}</div>
      <p class="sub" style="margin-top:14px">${d.injuries.length ? '' : 'אין פציעות — מצוין.'}</p>`,
    // 8 — תזונה
    () => html`<div class="eyebrow">שלב 8 · תזונה</div><div class="q">מה ${d.sex === 'f' ? 'את' : 'אתה'} <span style="color:var(--red)">לא</span> ${d.sex === 'f' ? 'אוכלת' : 'אוכל'}?</div>
      <p class="sub">${d.sex === 'f' ? 'סמני הכל — התפריט ייבנה רק ממה שאת כן אוכלת' : 'סמן הכל — התפריט ייבנה רק ממה שאתה כן אוכל'}, עם חלופות חכמות (למשל: לא אוכל ירקות? נשלים ויטמינים ממקורות אחרים).</p>
      <div class="chips">${Object.entries(DISLIKE_TAGS).map(([id, t]) => `<button class="chip no ${d.dislikes.includes(id) ? 'on' : ''}" data-dis="${id}">${t}</button>`)}</div>`,
    // 9 — המלצת המערכת (רק במצב "תמליצו לי")
    () => {
      const r = rec();
      const isRec = d.track === r.track && (r.track !== 'mix' || mixCaliCount(d) === r.mixCali);
      return html`<div class="eyebrow">שלב 9 · המלצת המערכת</div><div class="q">${isRec ? 'זה המסלול שמתאים לך' : 'בחרת מסלול אחר'}</div>
      <div class="track-card on rec"><div class="tc-img">${(d.track === 'mix' ? Object.values(COACHES) : coachesFor(d.track)).map((c) => `<img src="${c.face}" alt="">`).join('')}</div>
        <div><b>${TRACKS[d.track].name}</b><span class="tc-sub">${d.track === 'mix' ? `${splitText(d.days - mixCaliCount(d), mixCaliCount(d))} בשבוע` : TRACKS[d.track].sub}</span>
        ${isRec ? r.why.map((w) => `<span class="why">${icon('check', 'width="14" height="14"')} ${esc(w)}</span>`).join('') : `<span>ההמלצה הייתה: ${TRACKS[r.track].name}${r.track === 'mix' ? ` (${splitText(d.days - r.mixCali, r.mixCali)})` : ''}.</span>`}</div></div>
      ${isRec ? '' : `<button class="btn sm teal" data-rec>${icon('sparkle', 'width="16" height="16"')} חזרה להמלצת המערכת</button>`}
      ${d.track === 'mix' ? `<label class="field" style="margin-top:14px"><span>כמה מהאימונים קליסתניקס?</span><div class="seg" data-seg="mixCali">${Array.from({ length: d.days - 1 }, (_, i) => i + 1).map((v) => `<button data-v="${v}" class="${mixCaliCount(d) === v ? 'on' : ''}">${v}${r.track === 'mix' && r.mixCali === v ? ' ★' : ''}</button>`).join('')}</div></label>` : ''}
      ${d.track !== 'cali' ? html`<div style="font-weight:700;margin:14px 0 8px">מי יאמן אותך בחדר הכושר?</div>
        <div class="coach-pick mini">${coachesFor('gym').map((c) => `<button class="coach-card ${d.coach === c.id ? 'on' : ''}" data-coach="${c.id}"><img src="${c.img}" alt="${c.name}"><span class="check">✓</span><div class="cap"><b>${c.name}</b></div></button>`).join('')}</div>` : ''}
      <div style="font-weight:700;margin:16px 0 8px">${d.sex === 'f' ? 'מעדיפה' : 'מעדיף'} אחרת?</div>
      <div class="seg" data-pick-track>${['gym', 'cali', 'mix'].map((k) => `<button data-v="${k}" class="${d.track === k ? 'on' : ''}">${TRACKS[k].name}</button>`).join('')}</div>
      <p class="sub" style="font-size:12px;margin-top:8px">ההמלצה היא נקודת פתיחה. אפשר לשנות מסלול וחלוקה בכל רגע בהגדרות.</p>`;
    },
    // 10 — בנייה
    () => html`<div class="build-anim"><div class="core"></div>
      <div class="h1" style="font-size:24px">${esc(COACHES[d.coach].name)} ${fem() ? 'בונה' : 'בונה'} לך תוכנית…</div>
      <ul id="buildList">
        ${cali() ? '<li>קובעת שלב התחלתי בכל סולם</li><li>מתאימה תרגילים לציוד ולפציעות</li><li>בוחרת מיומנויות ראשונות</li><li>בונה שבוע אימונים</li><li>מחשבת יעדי תזונה ותפריט</li>'
    : '<li>מנתח רמת כושר ויעדים</li><li>מתאים תרגילים למכשירים ולפציעות</li><li>בונה מחזור אימונים של 12 שבועות</li><li>משלב תוכנית ריצה לשיפור 3 ק״מ</li><li>מחשב יעדי תזונה ותפריט</li>'}</ul></div>`,
  ];

  function readInputs() {
    root.querySelectorAll('input[name]').forEach((i) => {
      d[i.name] = i.type === 'number' ? Number(i.value) : i.value.trim();
    });
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
        <button class="btn primary block xl" data-act="next">${step === 0 ? 'בוא נתחיל' : last ? 'בנה לי תוכנית' : step === REC - 1 ? 'להמלצה' : 'המשך'}</button></div>`}
    </div>`;
    // הסעיף נשאר פתוח גם כשהמסך מצויר מחדש (למשל אחרי בחירת ניסיון)
    root.querySelector('details.lifts')?.addEventListener('toggle', (e) => { d.liftsOpen = e.target.open; });
    if (isBuild) runBuild();
  }

  on(root, 'click', '[data-act]', (e, t) => {
    unlock();
    readInputs();
    if (t.dataset.act === 'back') { if (step === REC) { d.decided = false; d.goal = d.goalWanted || d.goal; } step--; paint(); return; }
    if (step === 3 && !d.name) { toast('איך קוראים לך?'); return; }
    if (step === 5 && !cali() && d.run3kStr && !parse3k(d.run3kStr)) { toast('פורמט זמן: דקות:שניות, למשל 13:30'); return; }
    if (step === REC - 1) {
      if (!d.auto) { step = BUILD; paint(); return; }
      const r = rec(); decide(r.track, r.mixCali);       // נכנסים לשלב ההמלצה עם ההמלצה מוחלת
    }
    step++; paint();
  });
  on(root, 'click', '[data-coach]', (e, t) => {
    unlock(); readInputs();
    d.coach = t.dataset.coach;
    if (!cali()) d.gymCoach = d.coach;
    set((s) => { s.profile = s.profile || {}; s.profile.coach = d.coach; return s; });
    stop(); say(`hello_${d.coach}`, { priority: true });
    paint();
  });
  on(root, 'click', '[data-lohem]', () => { if (importFromLohem()) { toast('הנתונים מ-LOHEM הועתקו'); done(); } });
  on(root, 'click', '[data-track]', (e, t) => {
    readInputs();
    d.auto = t.dataset.track === 'auto'; d.decided = false;
    if (d.auto) { d.goalWanted = d.goal; paint(); return; }
    delete d.goalWanted;
    d.track = t.dataset.track;
    d.coach = cali() ? 'maya' : (d.gymCoach || 'ori');
    d.goal = goalForTrack(d.goal, d.track);
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
    paint();
  });
  on(root, 'click', '[data-inj]', (e, t) => { toggle(d.injuries, t.dataset.inj); paint(); });
  on(root, 'click', '[data-dis]', (e, t) => { toggle(d.dislikes, t.dataset.dis); paint(); });

  function runBuild() {
    const items = [...root.querySelectorAll('#buildList li')];
    items.forEach((li, i) => setTimeout(() => li.classList.add('ok'), 450 * (i + 1)));
    setTimeout(() => {
      const run3k = parse3k(d.run3kStr);
      const hM = (d.heightCm || 175) / 100;
      const caliState = anyCali() ? newCali({ pushups: d.pushups, pullups: mix() || d.equip.includes('bar') || d.equip.includes('rings') ? d.pullups : 0, squats: d.squats,
        dips: d.equip.includes('pbars') || d.equip.includes('rings') ? d.dips : 0, plankSec: d.plankSec, bmi: d.weightKg / (hM * hM) }, d.equip) : null;
      const level = caliState && cali() ? caliLevel(caliState) : estimateLevel({ years: d.years, pushups: d.pushups, pullups: d.pullups, run3k });
      const profile = {
        track: d.track, ...(d.auto ? { gymAccess: d.gymAccess } : {}), ...(caliState ? { cali: caliState } : {}), ...(mix() ? { mixCali: mixCaliCount(d) } : {}), gymCoach: d.gymCoach || 'ori',
        coach: d.coach, name: d.name, age: d.age, sex: d.sex, heightCm: d.heightCm, weightKg: d.weightKg, targetWeight: d.targetWeight,
        goal: d.goal, level, days: d.days, sessionMin: d.sessionMin, run3k, runLevel: runLevelFrom3k(run3k), injuries: d.injuries,
        dislikes: d.dislikes, dislikedFoods: [], createdAt: new Date().toISOString(),
        lifts: liftsFrom((k, f) => d[`lift_${k}_${f}`]),
      };
      set((s) => {
        s.profile = profile;
        s.plan = createPlan(profile);
        s.weights = [{ date: today(), kg: d.weightKg }];
        s.events = [{ type: 'coach', text: mix() ? `התוכנית המשולבת מוכנה! ${splitText(d.days - mixCaliCount(d), mixCaliCount(d))} בשבוע.` : caliState ? `התוכנית מוכנה! ${GOALS[d.goal].name}. נקבע שלב התחלתי בכל סולם — אפשר לראות ולשנות במסך התוכנית.` : `התוכנית מוכנה! רמה ${level} — ${LEVEL_NAMES[level]}. ${GOALS[d.goal].name}.`, date: new Date().toISOString() }];
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
