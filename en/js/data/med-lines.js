// מדיטציה בתנועה עם אור (בקשת בעל המוצר, 24.11.2026; רק ב-MOVA): ששת המסעות והטקסטים שאור אומרת.
// לכל מסע: open (בחימום) · p1–p4 (בפתיחת כל אחד מארבעת חלקי ההליכה) · close (בהליכה הרגועה שבסוף).
// הכללים: דיבור קצר על רעיון אחד ואחריו שתיקה ארוכה עם המוזיקה; הכול בלשון ניטרלית ("הולכים", "נושמים") — בלי גרסאות נקבה ובלי שמות;
// מדיטציה בעיניים פקוחות — הולכים בחוץ, והמבט נשאר על הדרך. משפט חדש: מוסיפים כאן, ואז צינור הקולות.
export const MED_JOURNEYS = {
  // מדיטציית בוקר (בקשת בעל המוצר, 25.11.2026): לפתוח את היום — מוצעת ראשונה בבוקר, ולא חלק מהסבב השבועי
  morning: { name: 'Morning', icon: 'bolt', desc: 'Wake up, breathe, and choose one thing for today' },
  // שתי הליכות מעוררות ואנרגטיות (בקשת בעל המוצר, 25.11.2026) — הקצב כמעט כולו מהיר; לא בסבב השבועי
  energy: { name: 'Energy', icon: 'bolt', desc: 'Wake the body, and feel the power in it' },
  joy: { name: 'Joy', icon: 'star', desc: 'A light step, a small smile, and an open heart' },
  release: { name: 'Release', icon: 'leaf', desc: 'What\'s heavy drops away with every exhale and every step' },
  heal: { name: 'Healing', icon: 'heart', desc: 'Gentle attention to the body, one place at a time' },
  connect: { name: 'Connection', icon: 'sparkle', desc: 'To the ground, to what\'s around you, and to the people who matter' },
  reset: { name: 'Reset', icon: 'target', desc: 'A quiet head, and one intention for the rest of the day' },
  thanks: { name: 'Gratitude', icon: 'star', desc: 'Three good things, one in each part of the way' },
  presence: { name: 'Presence', icon: 'flame', desc: 'The senses, one by one — being here' },
};
// "הנקודות" של כל מסע — שם קצר לכל אחד מארבעת חלקי ההליכה (הרעיון שאור מדברת עליו שם). מופיעות בשם המקטע, ובסיום — על מפת המסלול.
export const MED_POINTS = {
  morning: ['Wake the body', 'First light', 'What matters today', 'A first step'],
  energy: ['A waking breath', 'A strong step', 'Warmth in the belly', 'Where the power goes'],
  joy: ['A small smile', 'In rhythm', 'A good moment', 'Pass it on'],
  release: ['A long exhale', 'The hand opens', 'Leave it on the trail', 'Lightness'],
  heal: ['From the soles of the feet', 'Breathe into the place', 'A hand on the heart', 'Trust the body'],
  connect: ['Lift your gaze', 'Someone you love', 'Wish them well', 'Connecting inward'],
  reset: ['Counting steps', 'Four in, six out', 'Passing thoughts', 'One intention'],
  thanks: ['Thanks to the body', 'Thanks to a person', 'Thanks for the moment', 'Three good things'],
  presence: ['Touch', 'Sight', 'Hearing', 'All together'],
};
// מסך המסע (בקשת בעל המוצר, 25.11.2026): מה מצפה במסע — פסקה אחת, ומשפט קצר לכל אחת מארבע הנקודות. מוצג לפני היציאה להליכה (views/med-ui.js)
export const MED_ABOUT = {
  morning: ['A walk that opens the day. You start slowly, while the body is still waking, and the pace builds gradually. By the end you have one thing in mind that matters today, and the first step toward it.',
    ['Roll the shoulders, open the chest, a first deep breath.', 'Lift your gaze. This day hasn\'t been written yet.', 'One question as you walk: what is today\'s one thing?', 'See the small step you can take this very morning.']],
  energy: ['A walk that wakes and recharges. Deep, strong breathing, a long, determined stride, and a pace that is brisk almost all the way. Good for a slow morning, a tired hour, or before something that takes strength.',
    ['A breath in that widens the chest, and a strong breath out through the mouth.', 'A long, determined stride, a tall back and eyes ahead.', 'Feel the warmth that builds and spreads from the belly.', 'Choose one thing this power goes to today.']],
  joy: ['A light, uplifting walk. Start with a small smile, fall into the rhythm of the music, recall one good moment, and choose who to pass it on to. The pace is brisk and cheerful.',
    ['A small smile, even for no reason, and the step grows light.', 'The steps move with the music, and the arms are free.', 'One good moment, filling the chest again.', 'Choose one person to pass it on to today.']],
  release: ['A walk for unloading what you\'ve been carrying today. The pace rises to let the body release, then comes down. You come back lighter, with empty hands.',
    ['A long breath out through the mouth, and the shoulders drop.', 'Name one thing that weighs on you, and open your hand.', 'What\'s out of your hands stays on the trail.', 'Notice how much lighter the body and the breath feel.']],
  heal: ['The gentlest walk. You move through the body one place at a time, and breathe into whatever is tired or sore. No rush: healing happens at walking pace.',
    ['Feel your feet meet the ground, and move slowly up the body.', 'Find one place that asks for more, and breathe into it.', 'A few steps with a hand on your chest.', 'Every step moves blood, every breath brings air.']],
  connect: ['A walk that brings back a sense of belonging: to the ground under your feet, to what\'s around you, to people, and finally inward. You come back a little less alone.',
    ['The sky, the trees, the people — you walk within it all, as part of it.', 'A few steps beside someone it feels good to be with.', 'A kind wish for someone you\'ve grown distant from.', 'One kind sentence for the one walking here, too.']],
  reset: ['A walk to clear the head. Counting steps and breathing in time with them quiets the thoughts, and in that quiet you choose one intention for the rest of the day.',
    ['Count to ten, and start again. That\'s the whole practice.', 'Breathe in for four steps, out for six.', 'Watch the thoughts pass, and don\'t get in.', 'A word or a short sentence, three times, silently.']],
  thanks: ['A walk that looks for the good that\'s already here. Three things, one in each part of the way: something in the body, one person, and a simple moment from today. The ending is lighter and quicker.',
    ['One thing in the body that works without being asked.', 'One moment with someone who did some good.', 'Something small from today that almost slipped by.', 'Walk with all three, and the step gets lighter.']],
  presence: ['A slow walk that brings you back to here and now, through the senses: touch, sight and hearing, one by one, and then all together.',
    ['Feet on the ground, air on the face.', 'A soft, wide gaze: colour, shape, light and shadow.', 'The farthest sound, and then the nearest.', 'Touch, sight, sound and breath — in a single moment.']],
};
export const MED_ORDER = ['release', 'heal', 'connect', 'reset', 'thanks', 'presence'];   // הסבב השבועי
export const MED_ALL = ['morning', 'energy', 'joy', ...MED_ORDER];   // כל המסעות, לפי הסדר שבחלונית הבחירה

const L = {
  // כללי
  med_hello: 'Hello. I\'m Or. ... On this walk there is nowhere to get to. ... Eyes open, a soft gaze, and your attention on the path. ... I\'ll say a little, and leave plenty of silence. ... Let\'s begin to walk.',
  med_done: 'The walk is over. ... Stand still for a moment, and take one deep breath. ... Whatever you found on the way stays with you.',
  med_a1: 'Come back to your steps. ... One foot, and then the other.',
  med_a2: 'If your thoughts wandered off, that\'s fine. ... Come back gently to the breath.',
  med_a3: 'Soft shoulders. ... A loose jaw. ... Keep going.',
  med_a4: 'One deep breath in. ... And a long breath out.',
  // הכוונת קצב (25.11.2026): גם במדיטציה שומרים על קצב ההליכה — במשפטים מנחים ומרגיעים, ולעיתים רחוקות (לפי ה-GPS; views/run.js)
  med_pace_up: 'You can pick it up a little. ... A slightly longer step, and the breath stays calm.',
  med_pace_easy: 'Now slow down. ... There is nowhere to rush to. ... Let the step soften.',
  med_pace_hold: 'That\'s too fast for this part. ... Ease off a little, and keep the breath comfortable.',
  med_pace_good: 'This pace is good. ... Stay in it, without effort.',
  med_no_gps: 'I can\'t see your pace right now. ... Keep walking by feel, and that is perfectly fine.',

  // המסע בשלבים: פתיחה, סוף כל שלב, וסוף המסע
  med_j_begin: 'The journey begins. ... Four stages lie ahead: arriving, release, deepening, and integration. ... There is no need to hurry. ... Every walk is one step in the journey. ... We begin from wherever we are today.',
  med_j_s1: 'The arriving stage is complete. ... The body knows the path now, and the breath has found its rhythm. ... Now it is possible to start putting things down. ... The next stage is release.',
  med_j_s2: 'The release stage is complete. ... Something heavy was left behind, on the path. ... There is more room inside now. ... The next stage goes deeper. ... Deepening.',
  med_j_s3: 'The deepening stage is complete. ... The walks grew longer, and the step grew stronger. ... What was found on the way already belongs to life itself. ... One stage remains. ... Integration.',
  med_j_done: 'The journey is complete. ... One moment to stop, and look back at the path. ... All those steps were taken, one by one. ... The body is stronger, and the mind is quieter. ... What was built here stays. ... And a new journey can begin.',
  // אנרגיה
  med_energy_open: 'This walk wakes you up. ... We start slowly, but not for long. ... There is far more power in this body than it seems right now. ... On this walk, we switch it on.',
  med_energy_p1: 'A breath that wakes. ... A deep breath in through the nose, until the chest widens. ... And a strong breath out through the mouth. ... Again. ... With every breath in, energy comes in. ... With every breath out, tiredness leaves.',
  med_energy_p2: 'Now the step. ... A little longer, a little more determined. ... The legs push the ground back. ... The arms are working. ... The back is tall, and the eyes look ahead. ... This is how someone walks who knows where they are going.',
  med_energy_p3: 'Feel the warmth building in the body. ... It starts in the belly, and spreads. ... This is the power. ... It does not come from outside. ... It was here all along, waiting for movement.',
  med_energy_p4: 'And now, ask: where does this power go today? ... One thing that takes energy. ... See it getting done, with ease. ... And keep walking, at full pace.',
  med_energy_close: 'Slowing down, but the energy stays. ... A deep breath. ... The body is awake, warm, and ready. ... Leave here with strength.',
  // שמחה
  med_joy_open: 'This is a walk of joy. ... Not a big joy. ... A small joy, of movement. ... Start walking, and let the body lead.',
  med_joy_p1: 'Begin with a small smile. ... Even for no reason. ... The face softens, and the eyes open. ... The body takes the hint. ... The step grows lighter, almost by itself.',
  med_joy_p2: 'Now fall into the rhythm. ... The steps move with the music. ... The arms swing freely. ... The shoulders move a little. ... No one is watching. ... It is fine to enjoy walking.',
  med_joy_p3: 'Recall one good moment. ... A laugh, a meeting, a small win. ... See it again, in detail. ... And let its feeling fill the chest. ... It belongs to this moment too.',
  med_joy_p4: 'This joy wants out. ... Who can it be passed on to today? ... A kind word, a short message, a smile to a stranger. ... Choose one. ... And keep walking, light and quick.',
  med_joy_close: 'Slowing down. ... A deep breath, and the smile stays. ... A small joy, built step by step. ... It goes on from here.',
  // בוקר
  med_morning_open: 'Good morning. ... This walk opens the day. ... Start slowly, the body is still waking up. ... No need to hurry into the day. ... It will wait.',
  med_morning_p1: 'Wake the body, part by part. ... Roll your shoulders. ... Open your chest. ... One deep breath, all the way down. ... The body wakes at its own pace.',
  med_morning_p2: 'Lift your gaze to the light. ... Morning is a clean start. ... What happened yesterday stays in yesterday. ... This day hasn\'t been written yet.',
  med_morning_p3: 'Now a little faster. ... And as you walk, one question: what is the one thing that matters today? ... Not a list. ... One thing. ... Let it come up on its own.',
  med_morning_p4: 'And now see the first step toward that thing. ... A small step, one you can take this morning. ... Your legs are already walking. ... The day can start walking too.',
  med_morning_close: 'Slow down. ... A deep morning breath. ... The body is awake, the head is clear, and the intention is set. ... Have a good day.',

  // שחרור
  med_release_open: 'This walk is about release. ... Start slowly, at an easy pace. ... Notice what your body is holding right now. The shoulders, the jaw, the belly. ... Don\'t change anything. Just notice.',
  med_release_p1: 'With every exhale, something small drops away. ... Breathe in through the nose. ... And a long breath out through the mouth. ... Your shoulders drop away from your ears. ... Your arms swing freely. ... Every step leaves something behind.',
  med_release_p2: 'There is one thing you\'ve been carrying since this morning. ... A thought, a conversation, a worry. ... Give it a name, silently. ... Now imagine it resting in the palm of your hand. ... And on the next step, the hand opens.',
  med_release_p3: 'Nothing needs solving right now. ... The path isn\'t asking for answers. ... It only asks for the next step. ... Whatever is out of your hands can stay here, on the trail.',
  med_release_p4: 'Notice how much lighter the body feels now. ... The breath is wider. ... The step is softer. ... This is what happens when you stop holding on.',
  med_release_close: 'Slow down. ... A deep breath in, and one last long breath out. ... What was released is released. ... Head home with empty hands.',

  // ריפוי
  med_heal_open: 'This walk is about healing. ... Start slowly. ... This body carries us every day, and asks for nothing. ... On this walk, we listen to it.',
  med_heal_p1: 'Begin with the soles of your feet. ... Feel them meet the ground. Heel, sole, toes. ... Then move up slowly. The ankles. The knees. The thighs. ... Each place gets one moment of attention.',
  med_heal_p2: 'There is one place in the body asking for more. ... Somewhere tired, or sore, or tight. ... Don\'t fight it. ... Breathe into it, as if the breath reaches exactly there. ... And on the exhale, it softens a little.',
  med_heal_p3: 'Now the heart. ... One hand can rest on your chest for a few steps. ... There are things waiting to heal there too. ... No rush. ... Healing happens at walking pace, not at running pace.',
  med_heal_p4: 'The body knows how to heal. ... It is doing it now, as you walk. ... Every step moves blood, every breath brings air. ... You can trust it.',
  med_heal_close: 'Slow down. ... One kind word to your body, silently. ... Thank you for carrying me today. ... Go gently into the rest of the day.',

  // חיבור
  med_connect_open: 'This walk is about connection. ... Start slowly. ... Feel the ground beneath your feet. ... It holds every step, without conditions.',
  med_connect_p1: 'Lift your gaze a little. ... The sky, the trees, the houses, the people. ... All of it is alive around you right now. ... There is nothing to do. ... Just walk within it, as part of it.',
  med_connect_p2: 'Think of one person it feels good to be with. ... See their face. ... For a few steps, walk as if they were here, step beside step. ... And send them, silently, one kind sentence.',
  med_connect_p3: 'And now, someone you have grown distant from. ... No judging, no fixing. ... Just wish them well, silently. ... That is enough. ... Something inside settles when you do.',
  med_connect_p4: 'And finally, a connection inward. ... The one who is walking here now. ... With everything that happened today, and everything still to come. ... The one walking here deserves one kind sentence too.',
  med_connect_close: 'Slow down. ... The ground, the world around, the people, and the heart. ... All of it is connected, even when we don\'t notice. ... Head home a little less alone.',

  // איפוס
  med_reset_open: 'This walk is about a reset. ... Start slowly. ... The head is full. That\'s fine. ... On this walk we let it empty out, little by little.',
  med_reset_p1: 'Count your steps, up to ten. ... One, two, three. ... When you reach ten, start again. ... And if you lose count on the way, start again from one. ... No frustration. ... That is the whole practice.',
  med_reset_p2: 'Now the breath and the steps together. ... Breathe in for four steps. ... Breathe out for six. ... The exhale is longer than the inhale. ... That\'s how the body learns it can settle.',
  med_reset_p3: 'Thoughts pass like cars on a road. ... You see them, and you don\'t get in. ... Every thought that arrives, passes. ... And only the step remains.',
  med_reset_p4: 'The head is quieter now. ... In this quiet, choose one thing. ... One intention for the rest of the day. ... A single word, or a short sentence. ... Say it silently three times.',
  med_reset_close: 'Slow down. ... A deep breath. ... The intention you chose carries on from here. ... Begin the rest of the day afresh.',

  // הודיה
  med_thanks_open: 'This walk is about gratitude. ... Start slowly. ... We\'re not looking for big things. ... The small things are what hold the day together.',
  med_thanks_p1: 'The first thing: something in the body that works. ... Legs that walk. Eyes that see. A heart that beats without being asked. ... Choose one, and say thank you for it, silently.',
  med_thanks_p2: 'The second thing: one person. ... Someone who did some good, today or long ago. ... Remember one moment with them. ... And let the thanks spread through your chest, like warmth.',
  med_thanks_p3: 'The third thing: something simple from today. ... A cup of coffee, the light, a kind word, a quiet moment. ... Something that almost slipped by unnoticed. ... Notice it now.',
  med_thanks_p4: 'Three good things are walking here now. ... The body, the person, and the moment. ... When you look for good, you find it. ... And when you find it, the step gets lighter.',
  med_thanks_close: 'Slow down. ... One last thank you, for this walk. ... For this time. ... Head home with a full heart.',

  // נוכחות
  med_presence_open: 'This walk is about presence. ... Start slowly. ... Most of the day we are somewhere else: in what was, or in what will be. ... On this walk, we come back here.',
  med_presence_p1: 'Begin with touch. ... Feet on the ground. Clothes on the skin. Air on the face. ... Warm or cool. ... The body feels this moment before the head thinks about it.',
  med_presence_p2: 'Now sight. ... A soft, wide gaze. ... One colour that stands out. ... One shape you hadn\'t seen before. ... Light and shadow on the path. ... Just see, without naming.',
  med_presence_p3: 'And now hearing. ... The farthest sound you can hear. ... Then the nearest. ... Your steps. Your breath. ... Every sound is happening now, in this moment only.',
  med_presence_p4: 'And now everything together. ... Touch, sight, sound, and breath. ... This is the only moment that truly exists. ... And you are already in it. ... There is nothing to add.',
  med_presence_close: 'Slow down. ... One breath, with your full attention. ... This presence is always available. ... A single step is enough to come back to it.',
};
export const MED_LINES = L;
export const MED_ANCHORS = ['med_a1', 'med_a2', 'med_a3', 'med_a4'];
export const MED_PACE = { up: 'med_pace_up', easy: 'med_pace_easy', hold: 'med_pace_hold', good: 'med_pace_good', blind: 'med_no_gps' };
// המשפט של כל מקטע במסע: i = מספר המקטע (0 = חימום, 1–4 = חלקי ההליכה, 5 = סיום)
export const medLine = (journey, i) => `med_${journey}_${['open', 'p1', 'p2', 'p3', 'p4', 'close'][i]}`;
