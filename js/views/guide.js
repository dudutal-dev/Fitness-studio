// מדריך שימוש: נפתח אוטומטית בפתיחה הראשונה, ואפשר לפתוח שוב בכל רגע (כפתור "?" במסך הבית / מסך המאמן / #/guide).
import { html, el, on, icon, em } from '../ui/dom.js';
import { COACHES } from '../data/coaches.js';
import { get, set } from '../store.js';
import { unlock } from '../coach/voice.js';

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

const step = (n, t, d) => `<div class="g-step"><span class="g-n num">${n}</span><div><b>${t}</b>${d ? `<span>${d}</span>` : ''}</div></div>`;
const tip = (i, t) => `<div class="g-tip">${em(i, 'acc', 'sm')}<div>${t}</div></div>`;

function slides() {
  const p = get().profile;
  const coach = COACHES[p?.coach || 'ori'];
  return [
    {
      id: 'welcome', title: 'ברוכים הבאים ל-LOHEM STUDIO', eyebrow: 'מדריך · 1 דקה',
      visual: `<div class="g-duo"><img src="${COACHES.ori.img}" alt=""><img src="${COACHES.noa.img}" alt=""></div>`,
      body: `<p>מאמן אישי וירטואלי שבונה לך תוכנית אימונים, מדגים כל תרגיל, <b>סופר איתך כל חזרה בקול</b>, מודד מנוחות — ומשנה את התוכנית לפי ההתקדמות.</p>
        ${tip('🧭', 'המדריך מסביר מה להגדיר ואיך עובדים. אפשר לחזור אליו תמיד: כפתור <b>הגדרות</b> במסך הבית ← מדריך שימוש.')}`,
    },
    {
      id: 'install', title: 'שלב 1 · מתקינים על הטלפון', eyebrow: 'פעם אחת',
      visual: `${em('📲', 'pri', 'xl')}`,
      body: (standalone() ? tip('✅', 'האפליקציה כבר מותקנת על המסך הראשי. מעולה!') : '') +
        (isIOS()
          ? step(1, 'פותחים את הכתובת בספארי', 'dudutal-dev.github.io/Fitness-studio') + step(2, 'לוחצים על כפתור השיתוף ⬆️', 'בתחתית המסך') + step(3, 'בוחרים "הוסף למסך הבית"', 'ומאשרים "הוסף"')
          : step(1, 'פותחים את הכתובת ב-Chrome', 'dudutal-dev.github.io/Fitness-studio') + step(2, 'תפריט ⋮ למעלה', '') + step(3, 'בוחרים "התקנת אפליקציה" / "הוספה למסך הבית"', '')) +
        tip('🔄', 'האפליקציה <b>מתעדכנת לבד</b> — לא צריך להוריד כלום שוב.') +
        tip('🔔', 'רק מהאפליקציה המותקנת אפשר להפעיל <b>תזכורות</b> (אימון, שתייה, שקילה): הגדרות ← תזכורות.') +
        tip('📴', 'עובדת גם בלי קליטה (אחרי הפתיחה הראשונה).'),
    },
    {
      id: 'setup', title: 'שלב 2 · ההגדרות הראשונות', eyebrow: '2 דקות',
      visual: `${em('⚙️', 'pri', 'xl')}`,
      body: step(1, 'בוחרים מסלול ומאמן', 'חדר כושר (אורי או נועה) או קליסתניקס — משקל גוף עם מאיה. אפשר לעבור בין המסלולים אחר כך') +
        step(2, 'פרטים אישיים', 'לשון פנייה (זכר/נקבה), שם, גיל, גובה, משקל ומשקל יעד') +
        step(3, 'מטרה', 'כושר קרבי / מסה / כוח / חיטוב') +
        step(4, 'מבדק רמה', 'שכיבות סמיכה ומתח מקסימליים, זמן 3 ק״מ — לענות בכנות. מי שיודע כמה הוא מרים בלחיצת חזה, בסקוואט ובדדליפט יכול להוסיף (לא חובה) — והאימון הראשון יתחיל במשקל הנכון') +
        step(5, 'זמנים', 'כמה אימונים בשבוע וכמה דקות כל אימון') +
        step(6, 'פציעות ומה לא אוכלים', 'התוכנית והתפריט יתאימו את עצמם') +
        tip('🎯', 'לא צריך לדייק — <b>הרמה מתעדכנת אוטומטית</b> לפי הביצועים.'),
    },
    {
      id: 'cali', title: 'מסלול קליסתניקס', eyebrow: 'משקל גוף',
      visual: `<div class="g-coach"><img src="${COACHES.maya.img}" alt=""></div>`,
      body: tip('🧭', '<b>שני מסלולים נפרדים</b>: חדר כושר וקליסתניקס. לכל אחד תוכנית, מאמן ויעדי תזונה משלו. עוברים ב<b>הגדרות ← המסלול שלך</b>; ההיסטוריה נשמרת.') +
        tip('🚀', '<b>סולמות במקום משקלים</b>: לכל תנועה סולם מהקל לקשה (למשל שכיבות סמיכה על קיר ← על הברכיים ← מלאות ← יהלום ← ביד אחת). כשכל הסטים מגיעים ליעד העליון — עולים שלב לבד.') +
        tip('🎯', '<b>מיומנויות</b>: ישיבת L ועמידת ידיים פתוחות מההתחלה. עליית כוח, לברים, פלאנש ודגל אנושי נפתחות כשהבסיס מוכן. מפעילים ומכבים במסך <b>התוכנית</b>.') +
        tip('🎒', '<b>עובד גם בלי ציוד</b> — רצפה, קיר, כיסא ושולחן יציב. מתח פותח את סולם המשיכה ואת הלברים; מסמנים ציוד בהגדרות.') +
        tip('⚠️', '<b>לאט זה מהר</b>: במיומנויות עם ידיים ישרות נשארים 3 שבועות לפחות בכל שלב, כי גידים מתחזקים לאט מהשריר. כאב חד במפרק — עוצרים.'),
    },
    {
      id: 'home', title: 'מסך הבית', eyebrow: 'כל יום',
      visual: `<div class="g-mock"><div class="gm-row"><span class="gm-ring num">72</span><div><b>הכושר שלך</b><small>כוח · סבולת · עקביות · גוף</small></div></div>
        <div class="gm-card"><small>האימון הבא</small><b>פלג עליון A</b><span class="gm-btn">התחל אימון</span></div></div>`,
      body: tip('🎯', '<b>האימון הבא</b> — תמיד בראש המסך. לא צמוד לימים בשבוע: פשוט עושים את הבא.') +
        tip('💧', '<b>היום</b> — מים, קלוריות, משקל ומוכנות. הקשה אחת על אריח.') +
        tip('📊', '<b>הכושר שלך</b> — ציון מ-0 עד 100 שמורכב מכוח, סבולת, עקביות וגוף. בהתחלה (וגם אחרי איפוס) הוא ריק ומסומן "עוד לא נמדד" — זה תקין. כל חלק מתמלא כשיש לו נתונים: <b>כוח</b> אחרי אימון כוח, <b>סבולת</b> אחרי מבדק 3 ק״מ, <b>גוף</b> אחרי שקילה שנייה.') +
        tip('💪', 'רוצים הערכת כוח כבר עכשיו? מזינים את ההרמות ב<b>הגדרות ← פרופיל ויעדים</b>.') +
        tip('🎒', '<b>אין חדר כושר?</b> כפתור "אימון בלי ציוד".') +
        tip('⚙️', `<b>כפתור הגדרות למעלה</b> — החלפת מאמן, מראה בהיר/כהה, שעון, גיבוי והמדריך הזה.`),
    },
    {
      id: 'workout', title: 'איך מתאמנים עם המאמן', eyebrow: 'הכי חשוב',
      visual: `<div class="g-mock"><div class="gm-tempo"><span class="num">4</span><small>מתוך 10</small></div><div class="gm-phase"><span class="ph-ico go-down">${icon('phDown')}</span>ירידה &nbsp;·&nbsp; <span class="ph-ico go-up">${icon('phUp')}</span>עלייה</div></div>`,
      body: step(0, 'חימום מודרך', '5 תנועות קצרות — המאמן מדגים וסופר, עובר לבד לתנועה הבאה') + step(1, 'צ׳ק־אין קצר', '4 שאלות (שינה, אנרגיה, כאבים, עומס) — המאמן מתאים את העומס להיום') +
        step(2, 'מסתכלים על ההדגמה', 'מכוונים משקל וחזרות עם + / −. "הסבר" = דגשי ביצוע') +
        step(3, 'לוחצים "התחל סט"', 'המאמן סופר "3, 2, 1… יאללה!" — ומתחילים יחד איתו') +
        step(4, 'עובדים בקצב של המאמן', '"ירידה… עלייה!" + מספר כל חזרה. הווידאו זז בדיוק בקצב') +
        step(5, 'מדרגים את הסט', 'קל / טוב / קשה / עד הקצה — לפי זה המשקל עולה או יורד') +
        step(6, 'מנוחה', 'טיימר עם ספירה לאחור. "דלג" או "+30" לפי הצורך') +
        tip('🧘', 'בסוף האימון — <b>מתיחות לפי השרירים שעבדו</b>. אפשר לדלג.') +
        tip('🔁', '<b>המכשיר תפוס?</b> "החלף תרגיל". <b>רוצים בלי ספירה?</b> "סיימתי בלי ספירה".') +
        tip('🔊', 'להגביר ווליום. הקול עובד גם כשהטלפון על שקט. אם אין קול — לגעת פעם אחת במסך.'),
    },
    {
      id: 'run', title: 'ריצה', eyebrow: 'משולבת בתוכנית',
      visual: `${em('🏃', 'pri', 'xl')}`,
      body: tip('', 'אינטרוולים, טמפו וריצה קלה — המאמן מכריז על כל קטע ("ספרינט!", "הליכה", "עוד דקה").') +
        tip('📡', 'מאשרים <b>הרשאת מיקום</b> — מרחק וקצב מה-GPS. להשאיר את המסך דלוק.') +
        tip('🏁', 'בשבוע הרביעי של כל בלוק — <b>מבדק 3 ק״מ</b>. המאמן מזהה לבד כשמגיעים ל-3 ק״מ.') +
        tip('❤', 'יש שעון Garmin? אפשר לחבר דופק חי או לייבא ריצות (הגדרות ← Garmin).'),
    },
    {
      id: 'progress', title: 'התוכנית מתקדמת איתך', eyebrow: 'אוטומטי',
      visual: `<div class="g-mock"><div class="gm-bars"><i style="height:30%"></i><i style="height:45%"></i><i style="height:55%"></i><i style="height:75%"></i><i class="on" style="height:95%"></i></div></div>`,
      body: tip('📈', '<b>השלמת את כל החזרות?</b> בפעם הבאה המשקל עולה. היה קשה מדי? יורד.') +
        tip('🗓️', 'כל 4 שבועות = בלוק: בסיס → בנייה → שיא → פריקה. אחרי כל בלוק — <b>הערכת רמה</b>.') +
        tip('📊', 'מסך "התקדמות": <b>סיכום שבועי</b> מול השבוע שעבר, משקל עם מגמה, כוח (1RM), ריצה, ומפת שרירים שבועית.') +
        tip('✏️', 'טעות ברישום? לוחצים על אימון בהיסטוריה — <b>עריכה או מחיקה</b>.') +
        tip('🎖️', 'XP ודרגות: טירון → לוחם → … → אגדת חטיבה.'),
    },
    {
      id: 'food', title: 'תזונה', eyebrow: 'דלק ללוחם',
      visual: `${em('🍽️', 'pri', 'xl')}`,
      body: tip('🎯', 'יעד קלוריות וחלבון יומי מחושב לפי המשקל והמטרה.') +
        tip('📒', '<b>היום</b>: "הוספת אוכל" — חיפוש ב-600+ מאכלים, עם אחרונים ומועדפים, או <b>סריקת ברקוד</b> של מוצר ארוז. בלשונית <b>תפריט</b>: "אכלתי" רושם ארוחה שלמה.') +
        tip('🪖', 'תפריט לפי מקום: <b>בבסיס</b> (חדר אוכל), <b>בשטח</b>, <b>בבית</b>. "תפריט אחר" לרעיונות.') +
        tip('🚫', 'בלשונית <b>העדפות</b>: "מה אני לא אוכל" — מסמנים, וזה לא יופיע לעולם. בלי ירקות? יש טיפים להשלמה.'),
    },
    {
      id: 'go', title: 'מוכנים?', eyebrow: 'עוד דבר אחד',
      visual: `<div class="g-coach"><img src="${coach.img}" alt=""></div>`,
      body: tip('💪', '<b>עקביות מנצחת עוצמה.</b> עדיף 3 אימונים טובים בשבוע מ-6 חצאי אימונים.') +
        tip('😴', 'שינה, מים וחלבון — חצי מההתקדמות קורית מחוץ לחדר הכושר.') +
        tip('⚠️', 'כאב חד = עוצרים. לפני תוכנית אימונים מומלץ אישור רפואי.') +
        tip('💾', 'הנתונים נשמרים רק בטלפון. האפליקציה תזכיר לגבות פעם בחודש — הקובץ נשמר ב"קבצים" או ב-iCloud.'),
    },
  ];
}

// renderGuide: מסך מלא. onDone נקרא בסיום/דילוג.
export function openGuide({ onDone, first = false } = {}) {
  document.querySelector('.guide')?.remove();
  const S = slides();
  let i = 0;
  const root = el(`<div class="guide" role="dialog" aria-label="מדריך שימוש">
    <div class="g-top"><div class="g-dots">${S.map(() => '<i></i>').join('')}</div><button class="g-skip" data-g="skip">${first ? 'דלג' : 'סגור ✕'}</button></div>
    <div class="g-track">${S.map((s) => html`<section class="g-slide" data-id="${s.id}"><div class="g-visual">${s.visual}</div>
      <div class="g-body"><div class="eyebrow">${s.eyebrow}</div><h2>${s.title}</h2>${s.body}</div></section>`).join('')}</div>
    <div class="g-nav"><button class="btn" data-g="prev">הקודם</button><button class="btn primary xl" data-g="next">הבא</button></div></div>`);
  document.body.append(root);
  document.body.style.overflow = 'hidden';
  const track = root.querySelector('.g-track');

  const paint = () => {
    root.querySelectorAll('.g-dots i').forEach((d, j) => d.classList.toggle('on', j <= i));
    root.querySelector('[data-g="prev"]').style.visibility = i ? 'visible' : 'hidden';
    root.querySelector('[data-g="next"]').textContent = i === S.length - 1 ? (first ? 'בוא נתחיל' : 'סיום ✓') : 'הבא';
  };
  const go = (n) => {
    i = Math.max(0, Math.min(S.length - 1, n));
    track.children[i].scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    track.children[i].querySelector('.g-body').scrollTop = 0;
    paint();
  };
  // החלקה באצבע מעדכנת את המיקום
  let st;
  track.addEventListener('scroll', () => {
    clearTimeout(st);
    st = setTimeout(() => {
      const w = track.clientWidth;
      const n = Math.round(Math.abs(track.scrollLeft) / w);
      if (n !== i) { i = n; paint(); }
    }, 80);
  }, { passive: true });

  const close = () => {
    set((s) => { s.guideSeen = true; return s; });
    root.remove();
    document.body.style.overflow = '';
    onDone?.();
  };
  on(root, 'click', '[data-g]', (e, b) => {
    unlock();
    const a = b.dataset.g;
    if (a === 'skip') close();
    if (a === 'prev') go(i - 1);
    if (a === 'next') (i === S.length - 1 ? close() : go(i + 1));
  });
  paint();
}
