// תרגילי מסלול ה-HIIT (ליה): אינטרוולים במשקל גוף, בלי ציוד. כולם לפי זמן.
// cat: legs רגליים · cardio דופק · core ליבה · upper פלג עליון. impact: high = קפיצות. low: החלופה בלי קפיצות.
// המקורות והכללים: docs/HIIT.md
const H = { group: 'conditioning', pattern: 'hiit', type: 'time', hiit: true, level: 1, equip: 'Bodyweight' };

export const HIIT_EXERCISES = [
  { ...H, id: 'h_squat_jump', name: 'Jump squat', cat: 'legs', impact: 'high', low: 'air_squat', level: 2, muscles: ['quads', 'glutes', 'calves'],
    cues: ['Lower into a squat and jump straight up', 'Land softly on the balls of your feet and go straight into the next squat', 'Knees in line with your toes, chest lifted'] },
  { ...H, id: 'h_jump_lunge', name: 'Jumping lunges', cat: 'legs', impact: 'high', low: 'h_reverse_lunge', level: 3, muscles: ['quads', 'glutes', 'hamstrings'],
    cues: ['Lower into a lunge and jump, switching legs in the air', 'A soft, quiet landing, back knee almost touching', 'Torso upright, arms helping with the swing'] },
  { ...H, id: 'h_reverse_lunge', name: 'Reverse lunge', cat: 'legs', impact: 'low', muscles: ['quads', 'glutes', 'hamstrings'],
    cues: ['A big step back and lower until the back knee almost touches', 'Push through the front heel and return to standing', 'Switch legs every rep'] },
  { ...H, id: 'h_wall_sit', name: 'Wall sit', cat: 'legs', impact: 'low', equip: 'Wall', hold: true, muscles: ['quads', 'glutes'],
    cues: ['Back against the wall, knees at ninety degrees', 'Thighs parallel to the floor, heels under your knees', 'Keep breathing — don\'t hold your breath'] },
  { ...H, id: 'h_skater', name: 'Skater jumps', cat: 'cardio', impact: 'high', low: 'h_step_jack', level: 2, muscles: ['glutes', 'quads', 'calves'],
    cues: ['Jump sideways from leg to leg, like an ice skater', 'The back leg crosses behind, the opposite hand reaches close to the floor', 'A soft, steady landing before the next jump'] },
  { ...H, id: 'h_butt_kicks', name: 'Butt kicks', cat: 'cardio', impact: 'high', low: 'h_march', muscles: ['hamstrings', 'calves'],
    cues: ['Run in place, heels coming up to your glutes', 'Torso upright, arms working in rhythm', 'A fast, light pace on the balls of your feet'] },
  { ...H, id: 'h_fast_feet', name: 'Fast feet', cat: 'cardio', impact: 'high', low: 'h_march', level: 2, muscles: ['calves', 'quads'],
    cues: ['Short, quick steps in place, in a low stance', 'Knees slightly bent, weight on the balls of your feet', 'As many floor touches as you can'] },
  { ...H, id: 'h_step_jack', name: 'Step jacks', cat: 'cardio', impact: 'low', muscles: ['shoulders', 'calves', 'glutes'],
    cues: ['Step out to the side with one leg, and your arms rise overhead', 'Return to the center and step to the other side', 'No jumping — a brisk, continuous pace'] },
  { ...H, id: 'h_march', name: 'High-knee march', cat: 'cardio', impact: 'low', muscles: ['quads', 'abs', 'calves'],
    cues: ['Lift your knee to hip height, one leg after the other', 'The opposite arm rises with the knee', 'Torso upright, belly drawn in, fast pace'] },
  { ...H, id: 'h_plank_jack', name: 'Plank jacks', cat: 'core', impact: 'high', low: 'h_plank_tap', level: 2, muscles: ['abs', 'shoulders', 'glutes'],
    cues: ['High plank, jump your feet apart and back together', 'Hips stay at one height — they don\'t bounce up', 'Shoulders over your hands'] },
  { ...H, id: 'h_plank_tap', name: 'Plank shoulder taps', cat: 'core', impact: 'low', muscles: ['abs', 'shoulders', 'obliques'],
    cues: ['High plank, feet slightly apart', 'One hand taps the opposite shoulder, and switch', 'Hips don\'t rock from side to side'] },
  { ...H, id: 'h_bicycle', name: 'Bicycle crunches', cat: 'core', impact: 'low', muscles: ['abs', 'obliques'],
    cues: ['Lie on your back, hands behind your head, legs in the air', 'Elbow to the opposite knee, as the other leg straightens', 'Slow and controlled — the twist comes from the torso, not the neck'] },
  { ...H, id: 'h_russian_twist', name: 'Russian twists', cat: 'core', impact: 'low', muscles: ['obliques', 'abs'],
    cues: ['Sit, torso leaning back slightly, knees bent', 'Rotate your torso from side to side, hands touching the floor', 'Long back, open chest'] },
];
// תרגילים קיימים שליה משתמשת בהם גם (יש להם הדגמה שלה): [מזהה, קטגוריה, עומס, חלופה בלי קפיצות]
export const HIIT_SHARED = [
  ['burpee', 'cardio', 'high', 'inchworm'], ['mountain_climber', 'core', 'high', 'h_plank_tap'], ['jumping_jacks', 'cardio', 'high', 'h_step_jack'], ['high_knees', 'cardio', 'high', 'h_march'],
  ['air_squat', 'legs', 'low'], ['bw_lunge', 'legs', 'low'], ['glute_bridge', 'legs', 'low'], ['pushup', 'upper', 'low'], ['knee_pushup', 'upper', 'low'], ['plank', 'core', 'low'], ['inchworm', 'upper', 'low'],
];
// חימום ומתיחות של אימוני ה-HIIT (גם להם יש הדגמה של ליה)
export const HIIT_WARM = ['h_march', 'arm_circles', 'bw_squat', 'leg_swings'];
export const HIIT_COOL = ['quad_stretch', 'hamstring_stretch', 'hip_flexor_stretch', 'chest_stretch', 'child_pose'];
export const HIIT_TIPS = {
  h_squat_jump: 'Soft landing. Knees in line with your toes.', h_jump_lunge: 'Quiet landing. Torso upright.', h_reverse_lunge: 'Push through the front heel.', h_wall_sit: 'Thighs parallel to the floor. Breathe.',
  h_skater: 'Land steady, and only then jump again.', h_butt_kicks: 'Torso upright, light pace.', h_fast_feet: 'Short steps, as fast as you can.', h_step_jack: 'Arms all the way overhead.',
  h_march: 'Knee to hip height. Belly drawn in.', h_plank_jack: 'Hips stay at one height.', h_plank_tap: 'Hips don\'t rock.', h_bicycle: 'Slowly. The twist comes from the torso.',
  h_russian_twist: 'Long back, open chest.',
};
