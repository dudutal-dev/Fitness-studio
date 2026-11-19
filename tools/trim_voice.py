"""חיתוך שקט בתחילת ובסוף כל קליפ קול — כדי שהמאמן יישמע בדיוק ברגע הנכון (ספירה בזמן החזרה) — והשוואת עוצמה בין כל הקליפים.
שומר מקור ב-assets/_src/voice_orig (פעם ראשונה) וכותב js/data/voice-timing.js עם משך כל קליפ."""
import os, subprocess, json, shutil
import numpy as np
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.join(os.path.dirname(__file__), "..")
VOICE = os.path.join(ROOT, "assets", "voice")
ORIG = os.path.join(ROOT, "assets", "_src", "voice_orig")
SR = 22050
TARGET_RMS_DB = -18
# שימוש: python3 tools/trim_voice.py                         — חיתוך + השוואת עוצמה לכל הקליפים (אחרי יצירה מחדש של הכול)
#        python3 tools/trim_voice.py --level-only a/b.mp3 …  — חיתוך רק לקליפים שנוצרו מחדש (ברשימה); לשאר רק השוואת עוצמה
import sys
#        python3 tools/trim_voice.py --coach maya              — מעבד רק מאמן אחד (חיתוך + עוצמה); הקבצים והתזמונים של השאר לא משתנים
LEVEL_ONLY = '--level-only' in sys.argv
COACH = sys.argv[sys.argv.index('--coach') + 1] if '--coach' in sys.argv else None
TRIM = set(a for a in sys.argv[1:] if not a.startswith('--') and a != COACH)

def decode(p):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32)

def bounds(x):
    w = int(SR * 0.01)
    n = len(x) // w
    rms = np.sqrt((x[: n * w].reshape(n, w) ** 2).mean(axis=1) + 1e-12)
    th = max(rms.max() * 0.06, 10 ** (-42 / 20))
    on = np.where(rms > th)[0]
    if not len(on):
        return 0, len(x) / SR
    return on[0] * 0.01, (on[-1] + 1) * 0.01

def process(rel):
    src = os.path.join(ORIG, rel)
    dst = os.path.join(VOICE, rel)
    if not os.path.exists(src) or os.path.getmtime(dst) > os.path.getmtime(src) + 1:
        os.makedirs(os.path.dirname(src), exist_ok=True)
        shutil.copy2(dst, src)  # מקור חדש/עודכן
    x = decode(src)
    if LEVEL_ONLY and rel not in TRIM:
        a, b = 0, len(x) / SR          # קליפ שכבר נחתך — רק משווים עוצמה (חיתוך חוזר מכרסם בסופי מילים)
    else:
        a, b = bounds(x)
        a, b = max(0, a - 0.03), min(len(x) / SR, b + 0.08)
    # עוצמה אחידה: כל קליפ מובא ל-RMS של ‎-18 dBFS (בלי לחצות שיא של ‎-1 dBFS) — כדי ששני המאמנים וכל המשפטים יישמעו באותה עוצמה
    seg = x[int(a * SR): int(b * SR)]
    rms = float(np.sqrt((seg ** 2).mean() + 1e-12)); peak = float(np.abs(seg).max() + 1e-9)
    gain = min(10 ** (TARGET_RMS_DB / 20) / rms, 10 ** (-1 / 20) / peak)
    gain_db = float(np.clip(20 * np.log10(gain), -9, 12))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{a:.3f}", "-to", f"{b:.3f}", "-i", src,
                    "-af", f"volume={gain_db:.2f}dB" + ("" if LEVEL_ONLY and rel not in TRIM else ",afade=t=in:d=0.01,areverse,afade=t=in:d=0.03,areverse"), "-ac", "1", "-b:a", "64k", dst], check=True)
    os.utime(src, None)
    return rel, round(b - a, 3), round(a, 3), round(len(x) / SR - b, 3)

if __name__ == "__main__":
    rels = [os.path.relpath(os.path.join(d, f), VOICE) for d, _, fs in os.walk(VOICE) for f in fs if f.endswith(".mp3")]
    keep = {}
    if COACH:
        import re
        old = json.loads(re.search(r"VOICE_TIMING = (\{.*\});", open(os.path.join(ROOT, "js", "data", "voice-timing.js")).read(), re.S).group(1))
        keep = {k: v for k, v in old.items() if not k.startswith(COACH + "/")}
        rels = [r for r in rels if r.startswith(COACH + os.sep)]
    with ThreadPoolExecutor(8) as ex:
        res = list(ex.map(process, sorted(rels)))
    timing = dict(sorted({**keep, **{r[:-4]: d for r, d, _, _ in res}}.items()))
    open(os.path.join(ROOT, "js", "data", "voice-timing.js"), "w").write(
        "// נוצר ע״י tools/trim_voice.py — משך כל קליפ קול (שניות) אחרי חיתוך שקט\nexport const VOICE_TIMING = " + json.dumps(timing, ensure_ascii=False) + ";\n")
    lead = [r[2] for r in res]; trail = [r[3] for r in res]
    print(f"{len(res)} clips · removed lead avg {np.mean(lead):.2f}s (max {max(lead):.2f}) · trail avg {np.mean(trail):.2f}s")
    for r in res:
        if any(k in r[0] for k in ("/n1.", "/n3.", "/n7.", "/down.", "/up.", "/go.", "/pull.", "/release.")) and r[0].startswith("ori"):
            print(r)
