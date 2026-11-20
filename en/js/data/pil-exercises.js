// תרגילי מסלול הפילאטיס (ליה): פילאטיס מזרן, בלי ציוד. כולם לפי זמן, בתנועה איטית ומבוקרת.
// area: core מרכז · back גב · hips ירכיים וישבן · flow חיבור וזרימה. kind: dynamic = חזרות איטיות · static = החזקה.
// level: 1 בסיס · 2 ביניים · 3 מתקדם. המקורות והכללים: docs/PILATES.md
const P = { group: 'core', pattern: 'pilates', type: 'time', pil: true, level: 1, equip: 'Mat' };

export const PIL_EXERCISES = [
  // ───── פתיחה וחיבור ─────
  { ...P, id: 'p_breathing', name: 'Lateral breathing', area: 'flow', kind: 'static', muscles: ['abs', 'obliques'],
    cues: ['Lie on your back, knees bent, hands on your ribs', 'Inhale through the nose — the ribs open out to the sides', 'Exhale through the mouth — the ribs close and the belly draws in'] },
  { ...P, id: 'p_pelvic_curl', name: 'Pelvic curl', area: 'back', kind: 'dynamic', muscles: ['glutes', 'hamstrings', 'lower_back'],
    cues: ['Lie on your back, knees bent, feet hip-width apart', 'Curl your pelvis and lift one vertebra at a time to a straight line', 'Lower slowly the same way, from the upper back to the tailbone'] },
  { ...P, id: 'p_toe_taps', name: 'Toe taps', area: 'core', kind: 'dynamic', muscles: ['abs'],
    cues: ['Lie on your back, both legs in the air at a right angle', 'Lower one leg until the toe touches the mat, and return', 'Your lower back doesn\'t leave the mat'] },
  // ───── מרכז ─────
  { ...P, id: 'p_hundred', name: 'The Hundred', area: 'core', kind: 'dynamic', level: 2, muscles: ['abs'],
    cues: ['Head and shoulders lifted, legs in the air, arms straight by your sides', 'Pump your arms up and down in a small, quick movement', 'Five pumps on the inhale, five on the exhale. Look at your belly'] },
  { ...P, id: 'p_single_leg', name: 'Single-leg stretch', area: 'core', kind: 'dynamic', muscles: ['abs'],
    cues: ['Head and shoulders lifted, one knee to your chest and the other leg straight in the air', 'Switch legs in one continuous movement', 'Hips steady, elbows wide'] },
  { ...P, id: 'p_double_leg', name: 'Double-leg stretch', area: 'core', kind: 'dynamic', level: 2, muscles: ['abs'],
    cues: ['Head and shoulders lifted, hugging both knees', 'Reach your arms back and your legs forward, lengthening your body', 'Circle your arms around and return to the hug'] },
  { ...P, id: 'p_scissors', name: 'Scissors', area: 'core', kind: 'dynamic', level: 2, muscles: ['abs', 'hamstrings'],
    cues: ['Head and shoulders lifted, both legs straight in the air', 'One leg comes toward your face, the other lowers — and switch', 'Two small pulses on each leg'] },
  { ...P, id: 'p_dead_bug', name: 'Dead bug', area: 'core', kind: 'dynamic', muscles: ['abs'],
    cues: ['Lie on your back, arms to the ceiling, legs at a right angle', 'Reach one arm back and the opposite leg forward, and return', 'Keep your lower back pressed into the mat'] },
  { ...P, id: 'p_leg_circles', name: 'Leg circles', area: 'hips', kind: 'dynamic', unilateral: true, muscles: ['abs', 'glutes'],
    cues: ['Lie on your back, one leg straight up to the ceiling', 'Draw a small, precise circle with the leg', 'Hips stay still. Switch legs halfway'] },
  // ───── גב ─────
  { ...P, id: 'p_swimming', name: 'Swimming', area: 'back', kind: 'dynamic', level: 2, muscles: ['lower_back', 'glutes', 'upper_back'],
    cues: ['Lie on your stomach, arms reaching forward', 'Lift one arm and the opposite leg slightly, and alternate in rhythm', 'Belly drawn in, gaze at the mat'] },
  { ...P, id: 'p_swan', name: 'Swan', area: 'back', kind: 'dynamic', muscles: ['upper_back', 'lower_back'],
    cues: ['Lie on your stomach, palms beside your shoulders', 'Lift your chest using your back, elbows close to your body', 'Shoulders away from your ears, and lower slowly'] },
  { ...P, id: 'p_bird_dog', name: 'Bird dog', area: 'back', kind: 'dynamic', muscles: ['lower_back', 'glutes', 'abs'],
    cues: ['On all fours, back flat like a table', 'Reach one arm forward and the opposite leg back, and return', 'Hips don\'t rotate — as if a glass of water sits on your back'] },
  { ...P, id: 'p_spine_stretch', name: 'Spine stretch', area: 'back', kind: 'dynamic', muscles: ['lower_back', 'hamstrings'],
    cues: ['Sit tall, legs straight and apart, arms forward', 'Round forward from the head, as if over a big ball', 'Roll back up to sitting tall, one vertebra at a time'] },
  // ───── ירכיים וישבן ─────
  { ...P, id: 'p_side_leg', name: 'Side-lying leg lifts', area: 'hips', kind: 'dynamic', unilateral: true, muscles: ['glutes', 'obliques'],
    cues: ['Lie on your side, body in a straight line, head on your arm', 'Lift the top leg to hip height, and lower it slowly', 'Hips don\'t roll back. Switch sides halfway'] },
  { ...P, id: 'p_clam', name: 'Clamshell', area: 'hips', kind: 'dynamic', unilateral: true, muscles: ['glutes'],
    cues: ['Lie on your side, knees bent, feet together', 'Open the top knee like a clamshell, and close slowly', 'Feet stay together, hips steady'] },
  { ...P, id: 'p_side_plank', name: 'Side plank', area: 'core', kind: 'static', unilateral: true, level: 2, muscles: ['obliques', 'shoulders'],
    cues: ['Rest on one forearm, elbow under your shoulder', 'Lift your hips to a straight line from head to feet', 'You can lower the bottom knee. Switch sides halfway'] },
  // ───── מתקדם ─────
  { ...P, id: 'p_teaser', name: 'Teaser', area: 'core', kind: 'dynamic', level: 3, muscles: ['abs'],
    cues: ['Lie on your back, legs straight on a diagonal', 'Roll up into a V shape, arms parallel to your legs', 'Lower slowly, one vertebra at a time'] },
  { ...P, id: 'p_mermaid', name: 'Mermaid', area: 'flow', kind: 'static', unilateral: true, muscles: ['obliques', 'lats'],
    cues: ['Sit on one side, legs folded to one side', 'One arm rises overhead, and lean to the other side', 'Both sit bones down. Switch sides halfway'] },
];
// תרגילים קיימים שליה משתמשת בהם גם בפילאטיס: [מזהה, אזור, סוג]
export const PIL_SHARED = [['glute_bridge', 'hips', 'dynamic'], ['plank', 'core', 'static'], ['child_pose', 'flow', 'static']];
export const PIL_AREAS = { core: 'Core', back: 'Back', hips: 'Hips & glutes', flow: 'Breathing & length' };
export const PIL_TIPS = {
  p_breathing: 'Ribs open out to the sides. Shoulders relaxed.', p_pelvic_curl: 'One vertebra at a time. Knees don\'t fall open.', p_toe_taps: 'Keep your lower back on the mat.',
  p_hundred: 'Small pumps. Neck long.', p_single_leg: 'Hips steady. Elbows wide.', p_double_leg: 'Lower back on the mat.',
  p_scissors: 'Legs straight. Two pulses.', p_dead_bug: 'Back pressed into the mat. Slowly.', p_leg_circles: 'Hips stay still. A small circle.',
  p_swimming: 'Belly drawn in. Gaze at the mat.', p_swan: 'Shoulders away from your ears.', p_bird_dog: 'Hips don\'t rotate.', p_spine_stretch: 'Round from the head. Roll back up one vertebra at a time.',
  p_side_leg: 'Hips don\'t roll back.', p_clam: 'Feet together.', p_side_plank: 'A straight line from head to feet.', p_teaser: 'No momentum. Your belly does the work.', p_mermaid: 'Both sit bones down.',
};
