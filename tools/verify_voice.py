"""בדיקת הגייה אוטומטית: מתמלל כל קובץ קול עם ElevenLabs Scribe ומשווה לטקסט המקורי.
שימוש: python3 tools/verify_voice.py lines.json [key ...]  -> כותב assets/_src/voice_check.json"""
import json, os, re, sys, difflib, uuid, urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.join(os.path.dirname(__file__), "..")
LINES = {k: (v["text"] if isinstance(v, dict) else v) for k, v in json.load(open(sys.argv[1])).items()}
ONLY = sys.argv[2:]
DIG = {str(i): w for i, w in enumerate(["", "אחת", "שתיים", "שלוש", "ארבע", "חמש", "שש", "שבע", "שמונה", "תשע", "עשר", "אחת עשרה",
       "שתים עשרה", "שלוש עשרה", "ארבע עשרה", "חמש עשרה", "שש עשרה", "שבע עשרה", "שמונה עשרה", "תשע עשרה", "עשרים"]) if i}

def norm(t):
    t = re.sub(r"\[[^\]]*\]|\([^)]*\)", " ", t)
    t = re.sub(r"[֑-ׇ]", "", t)               # ניקוד
    t = re.sub(r"\d+", lambda m: f" {DIG.get(m.group(), m.group())} ", t)
    t = re.sub(r"[^א-ת\s]", " ", t)
    t = t.replace("ך", "כ").replace("ם", "מ").replace("ן", "נ").replace("ף", "פ").replace("ץ", "צ")
    return " ".join(t.split())

def stt(path):
    b = "----" + uuid.uuid4().hex
    parts = []
    for k, v in (("model_id", "scribe_v2"), ("language_code", "he"), ("tag_audio_events", "false"), ("timestamps_granularity", "none")):
        parts.append(f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
    parts.append(f'--{b}\r\nContent-Disposition: form-data; name="file"; filename="a.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n'.encode() + open(path, "rb").read() + b"\r\n")
    parts.append(f"--{b}--\r\n".encode())
    h = {"Content-Type": f"multipart/form-data; boundary={b}"}
    if os.environ.get("XI_API_KEY"): h["xi-api-key"] = os.environ["XI_API_KEY"]
    req = urllib.request.Request("https://api.elevenlabs.io/v1/speech-to-text", data=b"".join(parts), headers=h, method="POST")
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())["text"]

def check(key):
    path = os.path.join(ROOT, "assets", "voice", key + ".mp3")
    try:
        heard = stt(path)
    except Exception as e:
        return key, {"err": str(e)}
    a, b = norm(LINES[key]), norm(heard)
    return key, {"text": LINES[key], "heard": heard, "score": round(difflib.SequenceMatcher(None, a, b).ratio(), 3)}

if __name__ == "__main__":
    keys = [k for k in LINES if not ONLY or k.split("/")[-1] in ONLY or ("/names/" in k and "names" in ONLY)]
    out_f = os.path.join(ROOT, "assets", "_src", "voice_check.json")
    res = json.load(open(out_f)) if os.path.exists(out_f) else {}
    with ThreadPoolExecutor(6) as ex:
        for k, r in ex.map(check, keys):
            res[k] = r
    json.dump(res, open(out_f, "w"), ensure_ascii=False, indent=1)
    bad = sorted(((k, r) for k, r in res.items() if k in keys and (r.get("err") or r["score"] < 0.85)), key=lambda x: x[1].get("score", 0))
    print(f"checked {len(keys)}, flagged {len(bad)}")
    for k, r in bad:
        print(f'{r.get("score")}\t{k}\n  want: {r.get("text")}\n  got:  {r.get("heard", r.get("err"))}')
