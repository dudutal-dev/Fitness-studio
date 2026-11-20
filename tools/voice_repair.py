#!/usr/bin/env python3
"""תיקון הגייה אוטומטי לפי דוח הביקורת (tools/voice_audit.py).
לכל קליפ שסומן bad / suspect: מקליט כמה גרסאות (הטקסט המנוקד, הטקסט הרגיל, ו-seed שונה בכל פעם), בודק כל אחת מילה-מילה
באותה ביקורת, ושומר את הטובה ביותר — רק אם היא טובה מהקליפ הקיים. עוצר בגרסה הראשונה שכל המילים בה זוהו בביטחון.
שימוש: python3 tools/voice_repair.py m.json audit.json [--takes 6] [--only bad] [--coach mei]
אחריו: python3 tools/trim_voice.py --files <הקבצים שהוחלפו> (הרשימה נכתבת ל-assets/_src/voice_repaired.txt), ואז שוב voice_audit.
"""
import json, os, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from voice_audit import stt, best_judge, ROOT

args = sys.argv[1:]
LINES, AUDIT = json.load(open(args[0])), json.load(open(args[1]))
TAKES = int(args[args.index("--takes") + 1]) if "--takes" in args else 6
ONLY = args[args.index("--only") + 1] if "--only" in args else None
COACH = args[args.index("--coach") + 1].split(",") if "--coach" in args else None
VOICES = json.loads(os.popen(f"node -e \"import('{ROOT}/tools/voice_manifest.mjs').then(m=>console.log(JSON.stringify(m.VOICES)))\"").read())
TMP = os.path.join(ROOT, "assets", "_src", "voice_tmp"); os.makedirs(TMP, exist_ok=True)
RANK = {"ok": 2, "suspect": 1, "bad": 0}

def tts(text, voice, seed, out):
    h = {"Content-Type": "application/json"}
    if os.environ.get("XI_API_KEY"): h["xi-api-key"] = os.environ["XI_API_KEY"]
    body = {"text": text, "model_id": "eleven_v3", "language_code": "he", "seed": seed, "voice_settings": {"stability": 0.5, "similarity_boost": 0.8}}
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_64", data=json.dumps(body).encode(), headers=h, method="POST")
    with urllib.request.urlopen(req, timeout=120) as r, open(out, "wb") as f: f.write(r.read())

def grade(line, path):
    r = stt(path)
    if "err" in r: return (-1, -9), "bad", r["err"], []
    state, issues = best_judge(line, r)
    worst = min([w[3] for w in r["words"]] or [0])
    return (RANK[state], worst), state, r["text"], issues

def fix(key):
    L, cur = LINES[key], AUDIT[key]
    best = ((RANK[cur["state"]], -1 if cur["state"] != "ok" else 0), cur["state"], cur["heard"], None)
    texts = list(dict.fromkeys(t for t in [L["spoken"], L["text"]] if t))
    tries = 0
    for i in range(TAKES):
        out = os.path.join(TMP, f"{key.replace('/', '_')}_{i}.mp3")
        try:
            tts(texts[i % len(texts)], VOICES[key.split("/")[0]], 1000 + i * 77, out); tries += 1
            sc, state, heard, issues = grade(L, out)
        except Exception as e:
            continue
        if sc > best[0]: best = (sc, state, heard, out)
        if state == "ok" and sc[1] > -0.15: break
    if best[3]:
        os.replace(best[3], os.path.join(ROOT, "assets", "voice", key + ".mp3"))
    return key, cur["state"], best[1], best[2], bool(best[3]), tries

if __name__ == "__main__":
    keys = [k for k, v in AUDIT.items() if k in LINES and v["state"] != "ok" and (not ONLY or v["state"] == ONLY) and (not COACH or k.split("/")[0] in COACH)]
    print("repairing", len(keys), flush=True)
    changed, left = [], []
    with ThreadPoolExecutor(3) as ex:
        for key, was, now, heard, repl, tries in ex.map(fix, keys):
            if repl: changed.append(key + ".mp3")
            if now != "ok": left.append(key)
            print(f"{was} → {now}{' (replaced)' if repl else ''} [{tries} takes] {key} | {LINES[key]['text']} | {heard}", flush=True)
    open(os.path.join(ROOT, "assets", "_src", "voice_repaired.txt"), "a").write("".join(c + "\n" for c in changed))
    print(f"replaced {len(changed)}, still not ok {len(left)}")
