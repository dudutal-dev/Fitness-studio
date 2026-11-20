// תרגילי מסלול הקליסתניקס (משקל גוף). כל תרגיל הוא שלב בסולם התקדמות — ראו js/data/cali.js.
// needs: ציוד שנדרש (מספיק אחד מהרשימה): bar מתח · pbars מקבילים · rings טבעות · pole עמוד אנכי. בלי needs = בלי ציוד.
// hold: תרגיל סטטי (החזקה בשניות). neg: שלילי — רק שלב הירידה, לאט.
// freeDemo: סרטון ההדגמה מתנגן בלולאה חופשית ולא מסונכרן לספירה (מתחיל מהתנוחה שהכי קל לזהות, לא מתחילת החזרה).
const B = { type: 'bw', cali: true, compound: true, level: 2, tempo: [2, 0, 1] };
const H = { type: 'time', cali: true, hold: true, compound: true, level: 2 };
const NONE = 'Bodyweight', BAR = 'Pull-up bar', PB = 'Parallel bars', RINGS = 'Rings', WALL = 'Wall', TABLE = 'Sturdy table / low bar', CHAIR = 'Chair / bench', POLE = 'Vertical pole / stall bars';
const bar = ['bar', 'rings'];

export const CALI_EXERCISES = [
  // ───── דחיפה אופקית ─────
  { ...B, id: 'wall_pushup', name: 'Wall push-ups', group: 'chest', pattern: 'push_h', level: 1, equip: WALL, muscles: ['chest', 'triceps', 'shoulders'],
    cues: ['Palms on the wall at chest height, body straight and leaning forward', 'Lower your chest to the wall, elbows close to your body', 'Push back until your arms are fully straight'] },
  { ...B, id: 'incline_pushup', name: 'Incline push-ups', group: 'chest', pattern: 'push_h', level: 1, equip: 'Table / bench', muscles: ['chest', 'triceps', 'shoulders'],
    cues: ['Hands on a raised surface, body in a straight line from head to heels', 'Lower your chest to the surface, abs and glutes tight', 'The lower the surface, the harder it gets'] },
  { ...B, id: 'knee_pushup', name: 'Knee push-ups', group: 'chest', pattern: 'push_h', level: 1, equip: NONE, muscles: ['chest', 'triceps', 'shoulders'],
    cues: ['Knees on the floor, straight line from knees to head', 'Chest almost touches the floor, elbows at forty-five degrees', 'Don\'t break at the hips — your body moves as one unit'] },
  { ...B, id: 'diamond_pushup', name: 'Diamond push-ups', group: 'chest', pattern: 'push_h', level: 3, equip: NONE, muscles: ['triceps', 'chest', 'shoulders'],
    cues: ['Hands together under your chest, thumbs and fingers forming a diamond', 'Elbows close to your body all the way down', 'Chest touches the backs of your hands, then push up'] },
  { ...B, id: 'archer_pushup', name: 'Archer push-ups', group: 'chest', pattern: 'push_h', level: 4, equip: NONE, unilateral: true, muscles: ['chest', 'triceps', 'shoulders'],
    cues: ['Hands very wide, lower to one side while the other arm stays straight', 'Most of the weight on the bending arm', 'Hips stable — no rotating'] },
  { ...B, id: 'pseudo_planche_pushup', name: 'Pseudo planche push-ups', group: 'chest', pattern: 'push_h', level: 4, equip: NONE, muscles: ['shoulders', 'chest', 'triceps'],
    cues: ['Hands by your waist, fingers out, shoulders leaning forward past your hands', 'Keep the forward lean on the way down and on the way up', 'Shoulder blades spread, back slightly rounded'] },
  { ...B, id: 'one_arm_pushup', name: 'One-arm push-up', group: 'chest', pattern: 'push_h', level: 5, equip: NONE, unilateral: true, tempo: [3, 0, 1], muscles: ['chest', 'triceps', 'shoulders', 'obliques'],
    cues: ['Feet wide apart, one hand under your shoulder and the other behind your back', 'Lower slowly, elbow close to your body', 'Shoulders and hips parallel to the floor — no rotation'] },

  // ───── דחיפה אנכית (מעל הראש) ─────
  { ...B, id: 'pike_pushup', name: 'Pike push-ups', group: 'shoulders', pattern: 'push_v', level: 2, equip: NONE, muscles: ['shoulders', 'triceps', 'traps'],
    cues: ['Hips high in the air, body in an inverted V, hands shoulder-width apart', 'Lower your head forward between your hands — a triangle with your palms', 'Push back up and back'] },
  { ...B, id: 'elevated_pike_pushup', name: 'Feet-elevated pike push-ups', group: 'shoulders', pattern: 'push_v', level: 3, equip: CHAIR, muscles: ['shoulders', 'triceps', 'traps'],
    cues: ['Feet on a chair, hips over your shoulders', 'Head comes down forward to the floor, elbows don\'t flare out', 'Push until your arms are fully locked'] },
  { ...B, id: 'wall_hspu_negative', name: 'Handstand — negative', group: 'shoulders', pattern: 'push_v', level: 4, equip: WALL, neg: true, tempo: [5, 0, 3], muscles: ['shoulders', 'triceps', 'traps'],
    cues: ['Handstand with your back to the wall, hands slightly wider than your shoulders', 'Lower slowly, five seconds, until your head gently touches the mat', 'Come down off the wall and kick up again for each rep'] },
  { ...B, id: 'wall_hspu', name: 'Handstand push-up', group: 'shoulders', pattern: 'push_v', level: 5, equip: WALL, muscles: ['shoulders', 'triceps', 'traps'],
    cues: ['Handstand with your back to the wall, abs and glutes tight', 'Lower with control until your head touches the mat', 'Push to full lockout, heels sliding on the wall'] },

  // ───── מקבילים ─────
  { ...H, id: 'support_hold', name: 'Support hold', group: 'chest', pattern: 'push_v', level: 1, equip: `${PB} / ${RINGS}`, needs: ['pbars', 'rings'], muscles: ['shoulders', 'triceps', 'chest'],
    cues: ['Arms straight and locked, shoulders pressed down — away from your ears', 'Body straight, legs slightly forward', 'Don\'t sink between your shoulders'] },
  { ...B, id: 'dip_negative', name: 'Dips — negative', group: 'chest', pattern: 'push_v', level: 2, equip: PB, needs: ['pbars', 'rings'], neg: true, tempo: [5, 0, 3], muscles: ['chest', 'triceps', 'shoulders'],
    cues: ['Start at the top with straight arms', 'Lower slowly, five seconds, until your shoulder is slightly below your elbow', 'Put your feet down, jump back up and repeat'] },
  { ...B, id: 'ring_dips', name: 'Ring dips', group: 'chest', pattern: 'push_v', level: 4, equip: RINGS, needs: ['rings'], muscles: ['chest', 'triceps', 'shoulders'],
    cues: ['Rings close to your body, arms locked, palms turned slightly out at the top', 'Lower with control, don\'t let the rings drift out to the sides', 'Press up to full lockout'] },

  // ───── משיכה אנכית ─────
  { ...H, id: 'dead_hang', name: 'Dead hang', group: 'back', pattern: 'pull_v', level: 1, equip: BAR, needs: bar, muscles: ['forearms', 'lats', 'shoulders'],
    cues: ['Grip slightly wider than your shoulders, arms straight', 'Active shoulders — don\'t hang off the joint', 'Core tight, legs together'] },
  { ...B, id: 'scap_pull', name: 'Scapular pulls', group: 'back', pattern: 'pull_v', level: 1, equip: BAR, needs: bar, compound: false, tempo: [1, 1, 1], muscles: ['lats', 'traps', 'upper_back'],
    cues: ['Hang with straight arms — elbows don\'t bend at all', 'Pull your shoulder blades down and back, your body rises a few centimeters', 'Pause for a second at the top and release slowly'] },
  { ...B, id: 'pullup_negative', name: 'Pull-up — negative', group: 'back', pattern: 'pull_v', level: 2, equip: BAR, needs: bar, neg: true, tempo: [5, 0, 3], muscles: ['lats', 'biceps', 'upper_back'],
    cues: ['Jump or step up from a chair until your chin is over the bar', 'Lower slowly, five seconds, until your arms are fully straight', 'Put your feet down and get back to the top'] },
  { ...B, id: 'lsit_pullup', name: 'L-sit pull-up', group: 'back', pattern: 'pull_v', level: 4, equip: BAR, needs: bar, muscles: ['lats', 'biceps', 'abs'],
    cues: ['Legs straight out in front, parallel to the floor, for the whole rep', 'Pull until your chin is over the bar', 'Lower with control without dropping your legs'] },
  { ...B, id: 'archer_pullup', freeDemo: true, name: 'Archer pull-up', group: 'back', pattern: 'pull_v', level: 5, equip: BAR, needs: bar, unilateral: true, muscles: ['lats', 'biceps', 'upper_back'],
    cues: ['Very wide grip, pull toward one hand while the other arm straightens out to the side', 'Chin reaches the pulling hand', 'Lower slowly and return to the center'] },

  // ───── חתירה (משיכה אופקית) ─────
  { ...B, id: 'door_row', name: 'Doorframe row', group: 'back', pattern: 'pull_h', level: 1, equip: 'Doorframe', muscles: ['upper_back', 'lats', 'biceps'],
    cues: ['Hold both sides of the doorframe, feet close to the threshold, and lean back with straight arms', 'Pull your chest to the doorframe, elbows close to your body', 'Return slowly, body straight as a plank'] },
  { ...B, id: 'table_row', name: 'Under-table row', group: 'back', pattern: 'pull_h', level: 2, equip: TABLE, muscles: ['upper_back', 'lats', 'biceps'],
    cues: ['Lie under a sturdy table, hold the edge, knees bent and feet on the floor', 'Pull your chest to the table edge, shoulder blades together', 'Lower slowly until fully straight'] },
  { ...B, id: 'inverted_row', name: 'Australian row', group: 'back', pattern: 'pull_h', level: 3, equip: TABLE, muscles: ['upper_back', 'lats', 'biceps'],
    cues: ['Body completely straight from heels to head, only your heels on the floor', 'Pull until your chest touches the bar or the table edge', 'Don\'t let your hips drop — glutes and abs tight'] },
  { ...B, id: 'elevated_row', name: 'Feet-elevated Australian row', group: 'back', pattern: 'pull_h', level: 4, equip: `${TABLE} + chair`, muscles: ['upper_back', 'lats', 'biceps'],
    cues: ['Heels on a chair, body horizontal and parallel to the floor', 'Pull your chest to the bar, pause briefly at the top', 'Lower with control'] },
  { ...B, id: 'archer_row', name: 'Archer row', group: 'back', pattern: 'pull_h', level: 5, equip: TABLE, unilateral: true, muscles: ['upper_back', 'lats', 'biceps'],
    cues: ['Wide grip, pull toward one hand while the other arm stays straight', 'Chest reaches the pulling hand', 'Body straight, no rotation at the hips'] },
  { ...B, id: 'prone_pull', name: 'Prone pulls', group: 'back', pattern: 'pull_h', level: 1, equip: NONE, compound: false, tempo: [2, 1, 1], muscles: ['upper_back', 'lats', 'lower_back'],
    cues: ['Lie on your stomach, arms reaching forward, chest slightly lifted', 'Pull your elbows back and down to your ribs, as if pulling a bar', 'Squeeze your shoulder blades, pause for a second, then reach forward again'] },

  // ───── סקוואט ─────
  { ...B, id: 'assisted_squat', name: 'Assisted squat', group: 'legs', pattern: 'squat', level: 1, equip: 'Doorframe / post to hold', muscles: ['quads', 'glutes', 'hamstrings'],
    cues: ['Hold the doorframe or a post in front of you, feet shoulder-width apart', 'Lower slowly into a deep squat, hands only help with balance', 'Rise through your heels, with as little help from your hands as possible'] },
  { ...B, id: 'bw_bulgarian', name: 'Bodyweight Bulgarian split squat', group: 'legs', pattern: 'lunge', level: 3, equip: CHAIR, unilateral: true, muscles: ['quads', 'glutes', 'hamstrings'],
    cues: ['Back foot on a chair, front foot far enough forward', 'Lower straight down until your front thigh is parallel to the floor', 'Push through the front heel, torso upright'] },
  { ...B, id: 'shrimp_squat', name: 'Shrimp squat', group: 'legs', pattern: 'squat', level: 4, equip: NONE, unilateral: true, tempo: [3, 0, 1], muscles: ['quads', 'glutes', 'hamstrings'],
    cues: ['Stand on one leg, the other leg bent behind you', 'Lower slowly until your back knee gently touches the floor', 'Arms forward for balance, and rise without pushing off the back leg'] },
  { ...B, id: 'box_pistol', name: 'Pistol squat to chair', group: 'legs', pattern: 'squat', level: 4, equip: 'Chair', unilateral: true, tempo: [3, 0, 1], muscles: ['quads', 'glutes', 'hamstrings'],
    cues: ['Stand on one leg in front of a chair, the other leg straight out in front', 'Lower slowly until you sit lightly on the chair', 'Stand up on the same leg, no momentum'] },
  { ...B, id: 'pistol_squat', freeDemo: true, name: 'Pistol squat', group: 'legs', pattern: 'squat', level: 5, equip: NONE, unilateral: true, tempo: [3, 0, 1], muscles: ['quads', 'glutes', 'hamstrings', 'abs'],
    cues: ['One leg straight out in front in the air, arms forward for balance', 'Lower on one leg all the way down, heel stays on the floor', 'Drive up, the front leg doesn\'t touch the floor'] },

  // ───── ירך אחורית וישבן ─────
  { ...B, id: 'single_leg_bridge', name: 'Single-leg glute bridge', group: 'legs', pattern: 'hinge', level: 2, equip: 'Mat', unilateral: true, compound: false, tempo: [2, 1, 1], muscles: ['glutes', 'hamstrings', 'lower_back'],
    cues: ['Lie on your back, one leg bent on the floor and the other straight in the air', 'Lift your hips to a straight line from shoulder to knee', 'Pause for a second at the top, hips don\'t tilt to the side'] },
  { ...B, id: 'single_leg_rdl', name: 'Single-leg Romanian deadlift', group: 'legs', pattern: 'hinge', level: 3, equip: NONE, unilateral: true, tempo: [3, 0, 1], muscles: ['hamstrings', 'glutes', 'lower_back'],
    cues: ['Stand on one leg, knee slightly bent', 'Fold forward from the hips as the other leg rises behind you — body and leg in one line', 'Back straight, return to standing by squeezing your glutes'] },
  { ...B, id: 'nordic_negative', name: 'Nordic curl — negative', group: 'legs', pattern: 'hinge', level: 4, equip: 'Ankle anchor (sofa / partner)', neg: true, tempo: [5, 0, 3], muscles: ['hamstrings', 'glutes', 'calves'],
    cues: ['On your knees, ankles anchored, body straight from knees to head', 'Fall forward as slowly as you can, braking with your hamstrings', 'Land on your hands, push back up'] },
  { ...B, id: 'nordic_curl', name: 'Nordic curl', group: 'legs', pattern: 'hinge', level: 5, equip: 'Ankle anchor (sofa / partner)', tempo: [4, 0, 2], muscles: ['hamstrings', 'glutes', 'calves'],
    cues: ['On your knees, ankles anchored, hips locked forward', 'Lower slowly until your chest is almost on the floor', 'Pull back up with your hamstrings, without breaking at the hips'] },

  // ───── ליבה ─────
  { ...B, id: 'dead_bug', name: 'Dead bug', group: 'core', pattern: 'core', level: 1, equip: 'Mat', compound: false, tempo: [2, 1, 2], muscles: ['abs', 'obliques'],
    cues: ['Lie on your back, arms up and knees at ninety degrees, lower back pressed to the floor', 'Reach one arm and the opposite leg out slowly until almost at the floor', 'Return and switch sides — your lower back stays down'] },
  { ...H, id: 'hollow_hold', name: 'Hollow body hold', group: 'core', pattern: 'core', level: 2, equip: 'Mat', compound: false, muscles: ['abs', 'obliques'],
    cues: ['Lie on your back, lower back pressed into the floor', 'Lift your shoulders and straight legs slightly off the floor, arms overhead', 'Body in a banana shape — if your back lifts off, raise your legs higher'] },
  { ...B, id: 'lying_leg_raise', name: 'Lying leg raises', group: 'core', pattern: 'core', level: 2, equip: 'Mat', compound: false, tempo: [3, 0, 1], muscles: ['abs', 'obliques'],
    cues: ['Lie on your back, arms by your sides, legs straight', 'Raise your legs to ninety degrees', 'Lower slowly until almost at the floor — your lower back stays down'] },
  { ...B, id: 'dragon_flag_negative', name: 'Dragon flag — negative', group: 'core', pattern: 'core', level: 4, equip: 'Bench / something to hold behind your head', neg: true, tempo: [5, 0, 3], muscles: ['abs', 'obliques', 'lats'],
    cues: ['Lie on your back and grip firmly behind your head, rise into a shoulder stand', 'Lower your body straight as a plank, slowly, five seconds', 'Only your shoulders on the surface — don\'t break at the hips'] },
  { ...B, id: 'dragon_flag', name: 'Dragon flag', group: 'core', pattern: 'core', level: 5, equip: 'Bench / something to hold behind your head', tempo: [4, 0, 2], muscles: ['abs', 'obliques', 'lats'],
    cues: ['Strong grip behind your head, body straight from shoulders to feet', 'Lower your body until almost at the surface without touching', 'Raise back up as one unit, no folding at the hips'] },
  { ...B, id: 'hanging_knee_raise', name: 'Hanging knee raises', group: 'core', pattern: 'core', level: 2, equip: BAR, needs: bar, compound: false, tempo: [2, 0, 1], muscles: ['abs', 'obliques', 'forearms'],
    cues: ['Hang from the bar, shoulders active', 'Raise your knees to your chest and curl your hips up slightly', 'Lower slowly, without swinging'] },
  { ...B, id: 'toes_to_bar', name: 'Toes to bar', group: 'core', pattern: 'core', level: 4, equip: BAR, needs: bar, tempo: [3, 0, 1], muscles: ['abs', 'obliques', 'lats'],
    cues: ['Hang from the bar, legs straight', 'Raise your legs until your feet touch the bar', 'Lower slowly and with control, no momentum'] },

  // ───── מיומנות: ישיבת L ─────
  { ...H, id: 'lsit_foot', name: 'L-sit with heels on the floor', group: 'core', pattern: 'skill', level: 1, equip: NONE, muscles: ['abs', 'triceps', 'shoulders'],
    cues: ['Sit with your legs straight, palms on the floor by your hips', 'Push the floor away and lift your hips — only your heels stay down', 'Shoulders down, arms locked'] },
  { ...H, id: 'lsit_tuck', name: 'Tuck L-sit', group: 'core', pattern: 'skill', level: 2, equip: NONE, muscles: ['abs', 'triceps', 'shoulders'],
    cues: ['Hands by your hips, push the floor away and lift your whole body', 'Knees tucked to your chest, feet in the air', 'Shoulders pressed down, arms straight'] },
  { ...H, id: 'lsit_one_leg', name: 'One-leg L-sit', group: 'core', pattern: 'skill', level: 3, equip: NONE, unilateral: true, muscles: ['abs', 'quads', 'triceps'],
    cues: ['From the tuck position in the air, straighten one leg forward', 'The straight leg is parallel to the floor, knee locked', 'Switch legs halfway through'] },
  { ...H, id: 'lsit', name: 'Full L-sit', group: 'core', pattern: 'skill', level: 4, equip: NONE, muscles: ['abs', 'quads', 'triceps'],
    cues: ['Arms locked, whole body in the air, both legs straight out in front', 'Legs parallel to the floor, toes pointed', 'Shoulders down, chest open'] },

  // ───── מיומנות: עמידת ידיים ─────
  { ...B, id: 'wall_walk', name: 'Wall walk', group: 'shoulders', pattern: 'skill', level: 2, equip: WALL, tempo: [3, 1, 3], muscles: ['shoulders', 'triceps', 'abs'],
    cues: ['From a push-up position with your feet on the wall, walk your feet up and your hands back', 'Stop when your chest is close to the wall, core tight', 'Come down the same way, slowly and with control'] },
  { ...H, id: 'wall_handstand', name: 'Chest-to-wall handstand', group: 'shoulders', pattern: 'skill', level: 3, equip: WALL, muscles: ['shoulders', 'traps', 'abs'],
    cues: ['Chest to the wall, hands shoulder-width apart, close to the wall', 'Push the floor away — shoulders to your ears, body straight and tight', 'Abs and glutes tight, eyes between your hands'] },
  { ...B, id: 'handstand_kickup', name: 'Handstand kick-ups', group: 'shoulders', pattern: 'skill', level: 4, equip: 'Wall (as backup)', tempo: [1, 2, 1], muscles: ['shoulders', 'traps', 'abs'],
    cues: ['Hands on the floor shoulder-width apart, one leg kicks up gently', 'Find the balance point — fingers press into the floor', 'Pause briefly at the top and come down with control'] },
  { ...H, id: 'handstand', name: 'Freestanding handstand', group: 'shoulders', pattern: 'skill', level: 5, equip: NONE, muscles: ['shoulders', 'traps', 'abs'],
    cues: ['Kick up to a handstand without a wall, body in one line', 'Balance with your fingers and the heels of your hands', 'Shoulders pushed up, abs and glutes tight'] },

  // ───── מיומנות: עליית כוח ─────
  { ...B, id: 'chest_to_bar', name: 'Chest-to-bar pull-up', group: 'back', pattern: 'skill', level: 4, equip: BAR, needs: ['bar'], tempo: [2, 0, 1], muscles: ['lats', 'biceps', 'upper_back'],
    cues: ['Pull hard and fast — the bar reaches your chest, not just your chin', 'Elbows drive back and down', 'Lower with control until fully straight'] },
  { ...B, id: 'bar_dip', name: 'Straight bar dips', group: 'chest', pattern: 'skill', level: 3, equip: BAR, needs: ['bar'], muscles: ['chest', 'triceps', 'shoulders'],
    cues: ['Support yourself above the bar with straight arms, the bar at hip height', 'Lower until your lower chest touches the bar, leaning forward', 'Push back up to lockout'] },
  { ...B, id: 'muscleup_negative', name: 'Muscle-up — negative', group: 'back', pattern: 'skill', level: 4, equip: BAR, needs: ['bar'], neg: true, tempo: [5, 0, 3], muscles: ['lats', 'chest', 'triceps'],
    cues: ['Start in support above the bar', 'Lower slowly through the transition — chest close to the bar, elbows travel behind you', 'Keep lowering to a full hang'] },
  { ...B, id: 'muscle_up', freeDemo: true, name: 'Muscle-up', group: 'back', pattern: 'skill', level: 5, equip: BAR, needs: ['bar'], tempo: [2, 0, 2], muscles: ['lats', 'chest', 'triceps', 'biceps'],
    cues: ['Pull explosively, driving the bar toward your stomach', 'In the transition, roll your chest and elbows over the bar', 'Push to lockout, then lower with control'] },

  // ───── מיומנות: באק לבר ─────
  { ...B, id: 'skin_the_cat', name: 'Skin the cat', group: 'back', pattern: 'skill', level: 3, equip: `${BAR} / ${RINGS}`, needs: bar, tempo: [3, 1, 3], muscles: ['lats', 'shoulders', 'abs'],
    cues: ['From a hang, tuck your knees and pass your legs between your arms and back', 'Continue slowly to a comfortable shoulder stretch — no further', 'Return the same way with control'] },
  { ...H, id: 'back_lever_tuck', name: 'Tuck back lever', group: 'back', pattern: 'skill', level: 3, equip: `${BAR} / ${RINGS}`, needs: bar, straight: true, muscles: ['lats', 'shoulders', 'lower_back'],
    cues: ['Pass your legs between your arms, back parallel to the floor, facing down', 'Knees tucked to your chest, arms straight', 'Palms facing down, elbows locked'] },
  { ...H, id: 'back_lever_adv_tuck', name: 'Advanced tuck back lever', group: 'back', pattern: 'skill', level: 4, equip: `${BAR} / ${RINGS}`, needs: bar, straight: true, muscles: ['lats', 'shoulders', 'lower_back'],
    cues: ['Like the tuck, but with your back flat and straight', 'Thighs at ninety degrees to your torso, knees bent', 'Arms straight, hips at shoulder height'] },
  { ...H, id: 'back_lever_straddle', name: 'Straddle back lever', group: 'back', pattern: 'skill', level: 5, equip: `${BAR} / ${RINGS}`, needs: bar, straight: true, muscles: ['lats', 'shoulders', 'lower_back', 'glutes'],
    cues: ['Body horizontal, facing down, legs straight and spread wide', 'Hips in line with your shoulders', 'Glutes tight, arms locked'] },
  { ...H, id: 'back_lever', name: 'Full back lever', group: 'back', pattern: 'skill', level: 5, equip: `${BAR} / ${RINGS}`, needs: bar, straight: true, muscles: ['lats', 'shoulders', 'lower_back', 'glutes'],
    cues: ['Body completely straight and parallel to the floor, facing down, legs together', 'Arms straight, shoulders over your hips', 'Whole body tight — glutes, abs and legs'] },

  // ───── מיומנות: פרונט לבר ─────
  { ...H, id: 'front_lever_tuck', name: 'Tuck front lever', group: 'back', pattern: 'skill', level: 4, equip: `${BAR} / ${RINGS}`, needs: bar, straight: true, muscles: ['lats', 'abs', 'upper_back'],
    cues: ['Hanging with straight arms, raise your body until your back is parallel to the floor, facing up', 'Knees tucked to your chest', 'Push the bar toward your hips, shoulder blades down'] },
  { ...H, id: 'front_lever_adv_tuck', name: 'Advanced tuck front lever', group: 'back', pattern: 'skill', level: 4, equip: `${BAR} / ${RINGS}`, needs: bar, straight: true, muscles: ['lats', 'abs', 'upper_back'],
    cues: ['Back flat and parallel to the floor', 'Thighs at ninety degrees to your torso, knees bent', 'Arms completely straight'] },
  { ...H, id: 'front_lever_straddle', name: 'Straddle front lever', group: 'back', pattern: 'skill', level: 5, equip: `${BAR} / ${RINGS}`, needs: bar, straight: true, muscles: ['lats', 'abs', 'upper_back'],
    cues: ['Body horizontal, facing up, legs straight and spread wide', 'Hips at shoulder height — no sagging', 'Arms locked, abs tight'] },
  { ...H, id: 'front_lever', name: 'Full front lever', group: 'back', pattern: 'skill', level: 5, equip: `${BAR} / ${RINGS}`, needs: bar, straight: true, muscles: ['lats', 'abs', 'upper_back'],
    cues: ['Body completely straight and parallel to the floor, facing up, legs together', 'Arms straight, pull the bar toward your hips', 'Whole body like one plank'] },

  // ───── מיומנות: פלאנש ─────
  { ...H, id: 'planche_lean', name: 'Planche lean', group: 'shoulders', pattern: 'skill', level: 3, equip: NONE, straight: true, muscles: ['shoulders', 'chest', 'abs'],
    cues: ['From a push-up position with straight arms, lean forward until your shoulders pass your hands', 'Shoulder blades spread, upper back rounded', 'Elbows locked — no bending'] },
  { ...H, id: 'frog_stand', name: 'Frog stand', group: 'shoulders', pattern: 'skill', level: 3, equip: NONE, muscles: ['shoulders', 'triceps', 'abs'],
    cues: ['Squatting, hands on the floor, knees resting on your elbows', 'Lean forward until your feet lift off', 'Eyes forward, fingers press into the floor'] },
  { ...H, id: 'planche_tuck', name: 'Tuck planche', group: 'shoulders', pattern: 'skill', level: 4, equip: NONE, straight: true, muscles: ['shoulders', 'chest', 'abs'],
    cues: ['Arms straight and locked, whole body in the air', 'Knees tucked to your chest, hips at shoulder height', 'Lean forward, shoulder blades spread'] },
  { ...H, id: 'planche_adv_tuck', name: 'Advanced tuck planche', group: 'shoulders', pattern: 'skill', level: 5, equip: NONE, straight: true, muscles: ['shoulders', 'chest', 'abs'],
    cues: ['Like the tuck, but with your back flat and parallel to the floor', 'Thighs at ninety degrees to your torso', 'Arms locked, strong forward lean'] },
  { ...H, id: 'planche_straddle', name: 'Straddle planche', group: 'shoulders', pattern: 'skill', level: 5, equip: NONE, straight: true, muscles: ['shoulders', 'chest', 'abs', 'glutes'],
    cues: ['Body horizontal above the floor, legs straight and spread wide', 'Arms locked, shoulders well in front of your hands', 'Glutes and abs tight'] },
  { ...H, id: 'planche', name: 'Full planche', group: 'shoulders', pattern: 'skill', level: 5, equip: NONE, straight: true, muscles: ['shoulders', 'chest', 'abs', 'glutes'],
    cues: ['Body straight and parallel to the floor, only your hands touching', 'Arms straight, legs together', 'Full forward lean, whole body tight'] },

  // ───── מיומנות: דגל אנושי ─────
  { ...H, id: 'flag_tuck', name: 'Tuck human flag', group: 'core', pattern: 'skill', level: 4, equip: POLE, needs: ['pole'], straight: true, muscles: ['obliques', 'lats', 'shoulders'],
    cues: ['Bottom hand pushes the pole, top hand pulls — both arms straight', 'Lift your body to the side, knees tucked', 'Switch the bottom hand every set'] },
  { ...H, id: 'flag_straddle', name: 'Straddle human flag', group: 'core', pattern: 'skill', level: 5, equip: POLE, needs: ['pole'], straight: true, muscles: ['obliques', 'lats', 'shoulders'],
    cues: ['Body horizontal beside the pole, legs straight and spread', 'Bottom hand pushes hard, top hand pulls', 'Don\'t let your hips drop'] },
  { ...H, id: 'human_flag', name: 'Full human flag', group: 'core', pattern: 'skill', level: 5, equip: POLE, needs: ['pole'], straight: true, muscles: ['obliques', 'lats', 'shoulders'],
    cues: ['Body straight and horizontal beside the pole, legs together', 'Both arms locked — push down, pull up', 'Whole body tight like a flag'] },

  // ───── חימום ייעודי ─────
  { ...H, id: 'wrist_prep', name: 'Wrist prep', group: 'mobility', pattern: 'mobility', level: 1, equip: 'Mat', warm: true, hold: false, cali: true, compound: false, muscles: ['forearms'],
    cues: ['On your knees, palms on the floor, fingers forward', 'Rock slowly forward and back', 'Turn your fingers back and repeat'] },
  { ...H, id: 'scap_pushup', name: 'Scapular push-ups', group: 'mobility', pattern: 'mobility', level: 1, equip: 'Mat', warm: true, hold: false, cali: true, compound: false, muscles: ['upper_back', 'shoulders'],
    cues: ['Push-up position with straight arms — elbows don\'t bend', 'Let your chest sink between your shoulder blades, then push the floor away and spread them', 'Small, slow movement'] },
];
