# LOHEM STUDIO — סטודיו כושר אישי 🤸⚡

> הריפו הזה הוא הסטודיו: אפליקציית [LOHEM](https://github.com/dudutal-dev/Fitness-center) (חדר כושר וכושר קרבי) יחד עם מסלול הקליסתניקס, ובהמשך מסלולים נוספים.
> LOHEM המקורית ממשיכה להתקיים בנפרד ולא משתנה. שתי האפליקציות רצות באותו דומיין, ולכן לכל אחת מפתח אחסון ומטמון משלה
> (`fitness_studio_v1`, `studio-…`); מי שהתאמן ב-LOHEM יכול להעתיק את הנתונים במסך הפתיחה.


אפליקציית אימונים אדפטיבית (PWA) עם מאמן אישי וירטואלי בעברית: תוכנית שמשתנה לפי ההתקדמות, ספירת חזרות וטמפו בקול, הדמיית וידאו לכל תרגיל, ריצה, תזונה שמכבדת "לא אוכל", ומעקב מדדים.

⌚ **Garmin:** דופק חי ב-Bluetooth (Broadcast HR / HRM-Pro), מרחק וקצב ב-GPS, וייבוא פעילויות מ-Garmin Connect (FIT/TCX/GPX/ZIP).

🤸 **שני מסלולים:** חדר כושר (אורי / נועה) וקליסתניקס — משקל גוף עם מאיה: סולמות התקדמות, מיומנויות (עמידת ידיים, עליית כוח, לברים, פלאנש) ותמיכה מלאה באימון בלי ציוד. שיטה ומקורות: [docs/CALISTHENICS.md](docs/CALISTHENICS.md)

📄 **אפיון מלא:** [docs/SPEC.md](docs/SPEC.md)

## הפעלה מקומית
```bash
npm start            # שרת סטטי על http://localhost:8080
npm test             # בדיקות יחידה למנועים
```
אין תלויות ואין build. כל תיקייה סטטית (GitHub Pages / Cloudflare Pages / Netlify) מתאימה לאירוח.
בטלפון: לפתוח את הכתובת → "הוספה למסך הבית" → נפתחת כמו אפליקציה, עובדת גם בלי קליטה.

## פרסום
כל push לענף מתפרסם ב-GitHub Pages: https://dudutal-dev.github.io/Fitness-studio/
לפני כל commit: `node tools/release.mjs "תיאור"` (הוסף `--media` אם קבצי וידאו/קול השתנו) — כך האפליקציות המותקנות מתעדכנות לבד.

## שרת התזכורות (Cloudflare Worker)
`worker/` — `index.js` (API + קרון), `webpush.js` (הצפנה + VAPID), `schedule.js` (מתי לשלוח). פרוס כ-`lohem-reminders` עם KV `SUBS`, משתנים `VAPID_PUBLIC`, `VAPID_SUBJECT` וסוד `VAPID_PRIVATE_JWK`, וקרון `*/5 * * * *`.

## יצירת הנכסים מחדש (ElevenLabs)
```bash
python3 tools/gen_coaches.py                      # דיוקנאות המאמנים
python3 tools/gen_demos.py [exercise_id ...]      # פריים + וידאו 4 שנ׳ לכל תרגיל ולכל מאמן (ממשיך מאיפה שעצר)
python3 tools/build_assets.py                     # כיווץ לווב (mp4 540p, webp, אייקונים)
python3 tools/analyze_demos.py                    # זיהוי קטעי החזרות בכל וידאו (לסנכרון עם הספירה)
NODE_USE_ENV_PROXY=1 node tools/gen_voice.mjs     # 246 קבצי קול (eleven_v3, עברית, ניקוד למילים קצרות)
python3 tools/verify_voice.py lines.json          # בדיקת הגייה: תמלול חוזר והשוואה
python3 tools/fix_voice.py lines2.json 0.9        # יצירה מחדש של קבצים חלשים (best-of-N)
python3 tools/trim_voice.py [--level-only a/b.mp3 …]  # חיתוך שקט + השוואת עוצמה; --level-only: חיתוך רק לקליפים שנוצרו מחדש
```
מפתח: משתנה סביבה `XI_API_KEY`.

## מאגר המזון
```bash
python3 tools/build_foods.py moh.json   # בונה את js/data/foods.js ואת docs/NUTRITION_SOURCES.md
```
`moh.json` = שלוש טבלאות ממאגר התזונה הלאומי ב-data.gov.il (`foods`, `units`, `weights`). הרשימה שנבחרה ידנית נמצאת בסקריפט (`SPEC`); הרחבת המאגר ב-`tools/foods_extra.json`.

## מבנה
```
index.html · manifest.webmanifest · sw.js
css/app.css                  מערכת עיצוב
js/app.js                    ניתוב וניווט
js/store.js                  מצב + שמירה אוטומטית
js/engine/                   program · progression · running · nutrition · stats
js/data/                     exercises · foods · voice-lines · coaches
js/views/                    onboarding · home · plan · workout · run · progress · nutrition · coach
js/coach/voice.js            תור השמעת המאמן
js/devices/                  Garmin: דופק BLE, GPS, מפענח FIT/TCX/GPX/ZIP
assets/                      coaches · demos/{ori,noa,maya} · voice/{ori,noa,maya} · icons · fonts (Heebo, Rubik — OFL)
tools/                       סקריפטי יצירת נכסים
tests/                       בדיקות
```
