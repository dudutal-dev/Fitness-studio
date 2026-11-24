// מדיטציות בוקר ולילה עם אור (בקשת בעל המוצר, 25.11.2026; רק ב-MOVA) — בלי הליכה: בבוקר יושבים, בלילה שוכבים.
// שתיים לבוקר — "התעוררות" ו"כוונה ליום" — ושתיים ללילה — "שינה רגועה" (מרפה את הגוף) ו"ראש שקט" (משקיטה מחשבות). 15 / 20 / 30 דקות; הדיבור זהה בכל אורך, והשקט שביניהם מתארך.
// חמישה שלבים בכל מדיטציה: התמקמות · נשימה מונחית · סריקת גוף · לב המדיטציה · סיום. אור מדריכה את הנשימה כמה סבבים, ואז ממשיכים עם העיגול שעל המסך.
// breath: [שאיפה, החזקה, נשיפה, מנוחה] בשניות. tail: כמה שניות המוזיקה ממשיכה אחרי הסיום ודועכת (בלילה — למי שנרדם באמצע).
// הטקסטים ניטרליים למין (בלי פנייה ביחיד), כמו בהליכות. משפט חדש: כאן, תרגום, וצינור הקולות (עברית ואנגלית).
export const STILL = {
  wake: { name: 'Waking up', when: 'morning', posture: 'sit', icon: 'bolt', desc: 'Gently wake the body and the head', breath: [4, 0, 4, 0], breathName: 'Four in, four out', mood: 'medstill', tail: 0,
    about: 'A sitting morning meditation. Even, calm breathing wakes the body, a short scan moves through it from the soles of the feet to the face, and it ends with one big stretch. You get up awake, without a jolt.' },
  intent: { name: 'Intention for the day', when: 'morning', posture: 'sit', icon: 'target', desc: 'A clear head, and one thing that matters today', breath: [4, 4, 4, 4], breathName: 'Box breathing: four, four, four, four', mood: 'medstill', tail: 0,
    about: 'A sitting morning meditation, before the day starts running. Box breathing focuses the head, and then one question: what is the one thing that matters today. You leave with a short sentence of intention.' },
  sleep: { name: 'Peaceful sleep', when: 'night', posture: 'lie', icon: 'leaf', desc: 'Put the day down, and fall asleep calmly', breath: [4, 0, 6, 0], breathName: 'Four in, six out', mood: 'medsleep', tail: 600,
    about: 'A night meditation, lying down. Long exhales settle the body, a slow release moves through it part by part, and the day is set aside. At the end Or goes quiet, and the music stays for ten more minutes and fades out on its own.' },
  // מדיטציית לילה שנייה (בקשת בעל המוצר, 25.11.2026): למי שהראש שלו לא מפסיק לרוץ. "שינה רגועה" מרפה את הגוף; זאת משקיטה את המחשבות
  quiet: { name: 'A quiet head', when: 'night', posture: 'lie', icon: 'target', desc: 'Quiet the racing thoughts, and fall asleep', breath: [4, 0, 6, 0], breathName: 'Four in, six out', mood: 'medsleep', tail: 600,
    about: 'A night meditation, lying down, for when your head is still working. You don\'t stop the thoughts, you just stop chasing them: long exhales, releasing the face and neck, and a still lake where every thought fades like a ripple. At the end Or goes quiet, and the music stays for ten more minutes and fades out on its own.' },
};
export const STILL_ALL = ['wake', 'intent', 'sleep', 'quiet'];
export const STILL_MINUTES = [15, 20, 30];
export const STILL_STAGES = ['Settling in', 'Guided breathing', 'Body scan', 'The heart of the meditation', 'Closing'];
export const STILL_FRAC = [0.12, 0.22, 0.26, 0.3, 0.1];   // החלק של כל שלב מהזמן
export const stillLine = (id, i) => `med_s_${id}_${i + 1}`;

export const STILL_LINES = {
  // התעוררות (בוקר, בישיבה)
  med_s_wake_1: 'Good morning. ... Sit comfortably, back tall, shoulders soft. ... Rest your hands on your thighs. ... Your eyes can close, or rest on one point. ... A few ordinary breaths, changing nothing.',
  med_s_wake_2: 'Now we breathe together. ... Breathe in through the nose, slowly, to a count of four. ... And out, to a count of four. ... Again. Breathe in. ... And out. ... With every inhale, a little more air, a little more wakefulness. ... Carry on quietly, with the circle on the screen.',
  med_s_wake_3: 'Move through the body, and wake it up. ... The feet. ... The legs. ... The belly and the back. ... The chest opens. ... The shoulders roll slowly back. ... The neck grows long. ... The face softens. ... The whole body is awake.',
  med_s_wake_4: 'This morning is completely new. ... Nothing in it has happened yet. ... Breathe in the morning light, and feel it fill your chest. ... There is strength in this body. ... And curiosity, too. ... What will the day bring?',
  med_s_wake_5: 'Slowly, come back. ... Move your fingers. ... Stretch your arms up, with a big breath in. ... And let go. ... Your eyes open. ... Good morning. The day begins.',
  // כוונה ליום (בוקר, בישיבה)
  med_s_intent_1: 'Good morning. ... Sit comfortably, your back tall and at ease. ... Hands resting. ... Eyes closed, or resting on one point. ... Before the day starts running, pause for a moment.',
  med_s_intent_2: 'Box breathing. ... Breathe in, to four. ... Hold, to four. ... Breathe out, to four. ... And rest, to four. ... Again. Breathe in. ... Hold. ... Breathe out. ... And rest. ... This breath focuses the head. ... Carry on quietly, with the circle on the screen.',
  med_s_intent_3: 'A short scan of the body. ... Where is there tension this morning? ... The jaw. ... The shoulders. ... The belly. ... With every exhale, that place lets go a little. ... The body is steady, and the head grows clear.',
  med_s_intent_4: 'Now one question. ... What is the one thing that matters today? ... Not all the tasks. ... One thing. ... Let it come up. ... And when it is clear, put it into a short sentence. ... And say that sentence silently, three times.',
  med_s_intent_5: 'The intention is chosen. ... It will be waiting there, even when the day fills up. ... One deep breath. ... Your eyes open. ... Step into the day, with one thing clear.',
  // שינה רגועה (לילה, בשכיבה)
  med_s_sleep_1: 'Good evening. ... Lie on your back, comfortably. ... Arms by your sides, palms open. ... Your eyes close. ... The day is over. ... There is nothing more to do now.',
  med_s_sleep_2: 'Breathe slowly. ... In through the nose, to four. ... And a long breath out through the mouth, to six. ... Again. Breathe in. ... And a long breath out. ... The long exhale tells the body it can rest. ... Carry on like this, without effort.',
  med_s_sleep_3: 'Now let the body go, part by part. ... The feet are heavy. ... The calves. ... The knees. ... The thighs sink into the mattress. ... The belly is soft. ... The back spreads wide. ... The shoulders drop. ... The arms are heavy. ... The neck is loose. ... The jaw lets go. ... The forehead is smooth. ... The whole body is heavy, and warm.',
  med_s_sleep_4: 'What happened today, happened. ... You can put it down. ... Every thought that comes is placed on a cloud, and drifts slowly away. ... No need to follow it. ... Just breath. ... In. ... And out. ... Each exhale, a little deeper.',
  med_s_sleep_5: 'From here I\'ll be quiet. ... The music will stay a little longer, and fade on its own. ... There is nothing you need to do. ... Good night.',
  // ראש שקט (לילה, בשכיבה)
  med_s_quiet_1: 'Good evening. ... Lie comfortably, on your back or on your side. ... Your eyes close. ... The head is still full of the day. That\'s fine. ... You don\'t need to stop the thoughts. ... Just stop chasing them.',
  med_s_quiet_2: 'Breathe slowly. ... In through the nose, to four. ... And a long breath out, to six. ... Again. Breathe in. ... And a long breath out. ... With every exhale, the thoughts slow a little. ... Carry on like this, without effort.',
  med_s_quiet_3: 'Now let the face go. ... The forehead smooths out. ... The eyes are heavy. ... The jaw opens a little. ... The tongue is loose. ... The neck lets go. ... The shoulders sink. ... And the ease moves slowly down, to the chest, to the belly, to the legs.',
  med_s_quiet_4: 'Picture a still lake, at night. ... The water is completely smooth. ... Every thought is a small ripple on the water. ... It spreads, and disappears. ... Count backward, with each exhale. ... Ten. ... Nine. ... Eight. ... And if you lose count, that\'s a good sign. ... Just keep breathing.',
  med_s_quiet_5: 'From here I\'ll be quiet. ... The water is still. ... The music will stay a little longer, and fade on its own. ... Good night.',
};
