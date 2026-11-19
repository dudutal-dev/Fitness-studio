"""מתקן הגייה: לכל קליפ שקיבל ציון נמוך בבדיקה — מייצר כמה גרסאות (eleven_v3/v4, עם/בלי ניקוד),
מתמלל כל אחת ב-Scribe ושומר את הטובה ביותר. שימוש: python3 tools/fix_voice.py lines2.json [threshold] [key ...]"""
import json, os, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(__file__))
from verify_voice import stt, norm
import difflib

ROOT = os.path.join(os.path.dirname(__file__), "..")
LINES = json.load(open(sys.argv[1]))
TH = float(sys.argv[2]) if len(sys.argv) > 2 else 0.85
ONLY = sys.argv[3:]
VOICES = {"ori": "PBHwEnXdzx0yfhIO2UCH", "noa": "s0T0DT6EAPeX57MQpn3I", "maya": "tPkZ8BPQfux4koA8Wyli", "tamar": "cgSgspJ2msm6clMCkdW9", "guy": "SSaO8heNHx6ee5ZRpZ1X", "shira": "RrrmZPMES7HQ6Dm2L7GF", "lia": "1rNBx0CqYBvQubC1R0kV", "yael": "lxMfkT0dhgEot7mUeEV9"}
CHECK_F = os.path.join(ROOT, "assets", "_src", "voice_check.json")
check = json.load(open(CHECK_F))
TMP = os.path.join(ROOT, "assets", "_src", "voice_tmp"); os.makedirs(TMP, exist_ok=True)

def tts(text, voice, model, out):
    h = {"Content-Type": "application/json"}
    if os.environ.get("XI_API_KEY"): h["xi-api-key"] = os.environ["XI_API_KEY"]
    body = {"text": text, "model_id": model, "language_code": "he", "voice_settings": {"stability": 0.5, "similarity_boost": 0.8}}
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_64", data=json.dumps(body).encode(), headers=h, method="POST")
    with urllib.request.urlopen(req, timeout=120) as r, open(out, "wb") as f:
        f.write(r.read())

def score(text, path):
    heard = stt(path)
    return round(difflib.SequenceMatcher(None, norm(text), norm(heard)).ratio(), 3), heard

def fix(key):
    coach, k = key.split("/")[0], key.split("/")[-1]
    L = LINES[key]
    best = (check[key].get("score", 0), check[key].get("heard"), None)
    texts = list(dict.fromkeys(t for t in [L["spoken"], L["text"]] if t))
    cands = [(m, t) for m in ("eleven_v4", "eleven_v3") for t in texts] + [("eleven_v4", texts[0])]
    for i, (model, text) in enumerate(cands):
        out = os.path.join(TMP, f"{key.replace('/', '_')}_{i}.mp3")
        try:
            tts(text, VOICES[coach], model, out)
            sc, heard = score(L["text"], out)
        except Exception as e:
            continue
        if sc > best[0]:
            best = (sc, heard, out)
        if sc >= 0.95:
            break
    if best[2]:
        os.replace(best[2], os.path.join(ROOT, "assets", "voice", key + ".mp3"))
        check[key] = {"text": L["text"], "heard": best[1], "score": best[0], "fixed": True}
    return key, best[0], best[1]

if __name__ == "__main__":
    keys = [k for k, v in check.items() if k in LINES and (v.get("score", 0) < TH) and (not ONLY or k.split("/")[-1] in ONLY)]  # רק מפתחות שבקובץ השורות (אפשר לתת קובץ של מאמן אחד)
    print("fixing", len(keys))
    with ThreadPoolExecutor(3) as ex:
        for key, sc, heard in ex.map(fix, keys):
            print(sc, key, "|", LINES[key]["text"], "|", heard, flush=True)
    json.dump(check, open(CHECK_F, "w"), ensure_ascii=False, indent=1)
