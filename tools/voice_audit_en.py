#!/usr/bin/env python3
"""ביקורת ותיקון לקובצי הקול באנגלית (assets/voice-en): מתמלל כל קליפ, משווה מילה-מילה לטקסט, ומקליט מחדש את מה שלא עבר.
ok — המילים תואמות והמתמלל בטוח בהן · bad — מילים שונות, חסרות או נוספות (גם קליפ שנשמע בו טקסט נוסף) · suspect — מילה שהמתמלל לא בטוח בה.
שימוש: node tools/voice_manifest_en.mjs m.json && python3 tools/voice_audit_en.py m.json [--fix] [--takes 6]
"""
import hashlib, json, os, re, sys, time, uuid, urllib.request, difflib
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
VOICE = os.path.join(ROOT, "assets", "voice-en")
CACHE_F = os.path.join(ROOT, "assets", "_src", "voice_audit_en_cache.json")
OUT_F = os.path.join(ROOT, "assets", "_src", "voice_audit_en.json")
NUM = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty".split()
TENS = {30: "thirty", 40: "forty", 45: "forty five", 50: "fifty", 60: "sixty", 90: "ninety", 100: "one hundred"}
UNIT = {"km": "kilometers", "kg": "kilograms", "min": "minutes", "sec": "seconds", "cm": "centimeters", "kcal": "calories", "g": "grams", "l": "liters", "pr": "p r", "hiit": "hit", "vs": "versus", "ok": "okay"}
SAME = {"kilometer": "kilometers", "kilometre": "kilometers", "kilometres": "kilometers", "kilogram": "kilograms", "minute": "minutes", "second": "seconds", "centimeter": "centimeters", "gonna": "going to", "alright": "all right", "pushups": "push ups", "pullups": "pull ups", "warmup": "warm up"}

def words(t):
    t = re.sub(r"\[[^\]]*\]", " ", t.lower()).replace("’", "'").replace("-", " ").replace("—", " ")
    t = re.sub(r"\d+", lambda m: f" {NUM[int(m.group())] if int(m.group()) < len(NUM) else TENS.get(int(m.group()), m.group())} ", t)
    out = []
    for w in re.sub(r"[^a-z0-9' ]", " ", t).split():
        w = w.strip("'"); w = UNIT.get(w, SAME.get(w, w))
        out += w.split()
    return [re.sub(r"'s$|s$", "", w) if len(w) > 3 else w for w in out]

def stt(path):
    b = "----" + uuid.uuid4().hex
    parts = [f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode() for k, v in (("model_id", "scribe_v2"), ("language_code", "en"), ("tag_audio_events", "false"), ("timestamps_granularity", "word"))]
    parts.append(f'--{b}\r\nContent-Disposition: form-data; name="file"; filename="a.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n'.encode() + open(path, "rb").read() + b"\r\n"); parts.append(f"--{b}--\r\n".encode())
    h = {"Content-Type": f"multipart/form-data; boundary={b}", "xi-api-key": os.environ.get("XI_API_KEY", "dummy")}
    for a in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request("https://api.elevenlabs.io/v1/speech-to-text", data=b"".join(parts), headers=h, method="POST"), timeout=120) as r: d = json.loads(r.read())
            return {"text": d["text"], "lp": [round(w.get("logprob", 0), 3) for w in d.get("words", []) if w.get("type") == "word"]}
        except Exception as e: err = str(e); time.sleep(2 + a * 3)
    return {"err": err}

def judge(text, heard):
    if "err" in heard: return "bad", 0.0
    a, b = words(text), words(heard["text"])
    r = difflib.SequenceMatcher(None, a, b, autojunk=False).ratio() if a or b else 1.0
    if a != b and r < (1.0 if len(a) <= 2 else 0.9): return "bad", r
    if a != b or (heard["lp"] and min(heard["lp"]) < -0.7): return "suspect", r
    return "ok", r

def tts(text, voice, seed, out):
    body = {"text": text, "model_id": "eleven_v3", "language_code": "en", "seed": seed, "voice_settings": {"stability": 0.5, "similarity_boost": 0.8}}
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_64", data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "xi-api-key": os.environ.get("XI_API_KEY", "dummy")}, method="POST")
    with urllib.request.urlopen(req, timeout=120) as r, open(out, "wb") as f: f.write(r.read())

if __name__ == "__main__":
    args = sys.argv[1:]; lines = json.load(open(args[0])); FIX = "--fix" in args; TAKES = int(args[args.index("--takes") + 1]) if "--takes" in args else 6
    cache = json.load(open(CACHE_F)) if os.path.exists(CACHE_F) else {}
    def one(k):
        p = os.path.join(VOICE, k + ".mp3")
        if not os.path.exists(p): return k, None, {"err": "missing file"}
        h = hashlib.md5(open(p, "rb").read()).hexdigest()
        if cache.get(k, {}).get("h") == h and "err" not in cache[k]["r"]: return k, h, cache[k]["r"]
        return k, h, stt(p)
    report = {}
    with ThreadPoolExecutor(6) as ex:
        for n, (k, h, r) in enumerate(ex.map(one, list(lines))):
            if h: cache[k] = {"h": h, "r": r}
            st, ratio = judge(lines[k]["text"], r); report[k] = {"state": st, "text": lines[k]["text"], "heard": r.get("text", r.get("err")), "ratio": round(ratio, 2)}
            if n % 200 == 199: json.dump(cache, open(CACHE_F, "w")); print(f"  {n + 1}/{len(lines)}", flush=True)
    json.dump(cache, open(CACHE_F, "w")); json.dump(report, open(OUT_F, "w"), ensure_ascii=False, indent=1)
    cnt = lambda: {s: sum(1 for v in report.values() if v["state"] == s) for s in ("ok", "suspect", "bad")}
    print("checked", len(report), cnt(), flush=True)
    if FIX:
        voices = json.loads(os.popen(f"node -e \"import('{ROOT}/tools/voice_manifest_en.mjs').then(m=>console.log(JSON.stringify(m.VOICES_EN)))\"").read())
        tmp = os.path.join(ROOT, "assets", "_src", "voice_tmp"); os.makedirs(tmp, exist_ok=True); RANK = {"ok": 2, "suspect": 1, "bad": 0}
        def fix(k):
            cur = report[k]; best = ((RANK[cur["state"]], cur["ratio"]), None, cur["heard"], cur["state"])
            for i in range(TAKES):
                out = os.path.join(tmp, f"en_{k.replace('/', '_')}_{i}.mp3")
                try: tts(lines[k]["spoken"], voices[k.split("/")[0]], 3000 + i * 53, out); h = stt(out); st, ratio = judge(lines[k]["text"], h)
                except Exception: continue
                if (RANK[st], ratio) > best[0]: best = ((RANK[st], ratio), out, h.get("text"), st)
                if st == "ok": break
            if best[1]: os.replace(best[1], os.path.join(VOICE, k + ".mp3"))
            return k, cur["state"], best[3], best[2], bool(best[1])
        todo = [k for k, v in report.items() if v["state"] != "ok"]; changed = []
        print("repairing", len(todo), flush=True)
        with ThreadPoolExecutor(3) as ex:
            for k, was, now, heard, repl in ex.map(fix, todo):
                if repl: changed.append(k + ".mp3")
                if now != "ok": print(f"  {was} → {now} {k} | {lines[k]['text'][:60]} | {str(heard)[:60]}", flush=True)
        open(os.path.join(ROOT, "assets", "_src", "voice_repaired_en.txt"), "w").write("".join(c + "\n" for c in changed)); print("replaced", len(changed))
