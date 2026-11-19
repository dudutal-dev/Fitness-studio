"""מנתח כל וידאו הדגמה ומוצא את קטעי החזרות שבו (חלק מהסרטונים כוללים 2–3 חזרות).
אות תנועה = מרחק כל פריים מפריים ההתחלה (המאמן מתחיל ומסיים בתנוחת המוצא). כל שיא = נקודת מפנה של חזרה,
כל עמק בין שיאים = חזרה לתנוחת המוצא. התוצאה נכתבת ל-js/data/demo-timing.js:
  segs: [[start, turn, end], ...] בשניות — האפליקציה מנגנת קטע אחד לכל חזרה שנספרת, ומותחת אותו לטמפו."""
import json, os, subprocess
import numpy as np

ROOT = os.path.join(os.path.dirname(__file__), "..")
DEMOS = json.load(open(os.path.join(os.path.dirname(__file__), "demos.json")))
FPS = 24
FREE = {"plank", "farmer_carry", "battle_rope", "sled_push", "treadmill_run", "rower", "jumping_jacks", "arm_circles", "leg_swings", "inchworm", "bw_squat", "high_knees", "quad_stretch", "hamstring_stretch", "hip_flexor_stretch", "chest_stretch", "shoulder_stretch", "child_pose", "wrist_prep", "scap_pushup", "muscle_up", "pistol_squat", "archer_pullup"}  # לולאה רגילה, בלי סנכרון

def frames(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vf", f"fps={FPS},scale=96:170,format=gray", "-f", "rawvideo", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, 170, 96).astype(np.float32)

def motion_signal(f):
    """הציר הראשי של התנועה (PCA): ציון לכל פריים, מנורמל כך ש-0 = תנוחת המוצא ו-1 = הנקודה הרחוקה ביותר."""
    X = f.reshape(len(f), -1)
    X = X - X.mean(axis=0)
    u, sv, _ = np.linalg.svd(X, full_matrices=False)
    pc = u[:, 0] * sv[0]
    pc = np.convolve(np.pad(pc, 3, mode="edge"), np.ones(7) / 7, mode="valid")
    s = pc - np.median(pc[:4])
    far = np.max(np.abs(s))
    s = s / far if far else s
    if np.max(s) < -np.min(s):
        s = -s
    return s, float(sv[0] / max(1, np.sqrt(len(f))))

def analyze(path):
    f = frames(path)
    n = len(f)
    s, energy = motion_signal(f)
    segs, state, seg_start, last_low = [], "start", None, 0
    for i, v in enumerate(s):
        if state == "start":
            if v < 0.15:
                last_low = i
            if v > 0.6:
                state, seg_start = "far", last_low
        elif state == "far" and v < 0.25:
            # חזרה לתנוחת המוצא: סוף החזרה בפריים הנמוך הבא
            j = i
            while j + 1 < n and s[j + 1] < s[j] and s[j] > 0.08:
                j += 1
            turn = seg_start + int(np.argmax(s[seg_start:i]))
            segs.append([seg_start, turn, j])
            state, last_low = "start", j
    if state == "far" and seg_start is not None:  # חזרה אחרונה שמסתיימת בסוף הלולאה
        turn = seg_start + int(np.argmax(s[seg_start:]))
        if turn < n - 4:
            segs.append([seg_start, turn, n - 1])
    segs = [[round(a / FPS, 2), round(t / FPS, 2), round(min(n, b + 1) / FPS, 2)] for a, t, b in segs if (b - a) > 0.5 * FPS]
    return {"dur": round(n / FPS, 3), "segs": segs, "peak": round(energy, 1)}

out = {}
for coach in ("ori", "noa", "maya"):
    out[coach] = {}
    for ex in DEMOS:
        p = os.path.join(ROOT, "assets", "demos", coach, f"{ex}.mp4")
        if os.path.exists(p):
            out[coach][ex] = {"dur": 4.0, "segs": []} if ex in FREE else analyze(p)
js = ("// נוצר אוטומטית ע״י tools/analyze_demos.py — קטעי החזרות בכל וידאו הדגמה: [התחלה, נקודת מפנה, סוף] בשניות\n"
      "export const DEMO_TIMING = " + json.dumps({c: {e: {"dur": v["dur"], "segs": v["segs"]} for e, v in m.items()} for c, m in out.items()}) + ";\n")
open(os.path.join(ROOT, "js", "data", "demo-timing.js"), "w").write(js)
for c in out:
    for e, v in out[c].items():
        print(c, e, len(v["segs"]), v["segs"], v.get("peak"))
