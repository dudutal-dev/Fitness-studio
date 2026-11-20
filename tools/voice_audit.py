#!/usr/bin/env python3
"""ביקורת הגייה ברמת המילה לכל קובצי הקול.
מתמלל כל קליפ ב-ElevenLabs Scribe עם חותמות זמן וציון ביטחון לכל מילה, ומשווה מילה-מילה לטקסט שהיה אמור להיאמר:
  bad     — מילה שנשמעה אחרת (או חסרה / נוספה)
  suspect — נשמע דומה אבל נכתב אחרת (למשל "עם מוט" ← "אמות"), או שהמתמלל לא היה בטוח במילה,
            או שאותה מילה נשמעת טוב בקליפים אחרים של אותו מאמן ובקליפ הזה פחות (חוסר עקביות)
  ok      — כל המילים זוהו בביטחון
התמלולים נשמרים במטמון לפי תוכן הקובץ, כך שהרצה חוזרת מתמללת רק קליפים שהשתנו.
שימוש: node tools/voice_manifest.mjs m.json && python3 tools/voice_audit.py m.json [--coach mei] [--out report.json]
"""
import hashlib, json, os, re, statistics, sys, time, uuid, urllib.request, difflib
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
CACHE_F = os.path.join(ROOT, "assets", "_src", "voice_audit_cache.json")
LOW = -0.5         # מתחת לזה המתמלל לא היה בטוח במילה
OUTLIER = -0.35    # מילה שבדרך כלל ברורה (חציון מעל -0.03) ובקליפ הזה מתחת לסף הזה
DIG = ["", "אחת", "שתיים", "שלוש", "ארבע", "חמש", "שש", "שבע", "שמונה", "תשע", "עשר", "אחת עשרה", "שתים עשרה", "שלוש עשרה", "ארבע עשרה", "חמש עשרה",
       "שש עשרה", "שבע עשרה", "שמונה עשרה", "תשע עשרה", "עשרים"]
TENS = {30: "שלושים", 40: "ארבעים", 45: "ארבעים וחמש", 50: "חמישים", 60: "שישים", 90: "תשעים", 9090: "תשעים תשעים"}
FINAL = str.maketrans("ךםןףץ", "כמנפצ")
SOUND = str.maketrans("עטקחש", "אתככס")   # אותיות שנשמעות אותו דבר (ש שמאלית = ס; המתמלל לא מבחין)
# המתמלל כותב לפעמים מונחים לועזיים באותיות לטיניות ("go", "front lever", "L"): תעתיק גס לעברית, להשוואת צליל בלבד
LAT = {"a": "א", "b": "ב", "c": "ק", "d": "ד", "e": "", "f": "פ", "g": "ג", "h": "ה", "i": "י", "j": "ג", "k": "ק", "l": "ל", "m": "מ", "n": "נ", "o": "ו", "p": "פ", "q": "ק", "r": "ר", "s": "ס", "t": "ט", "u": "ו", "v": "ו", "w": "ו", "x": "קס", "y": "י", "z": "ז"}
LETTER = {"l": "אל", "v": "וי", "t": "טי", "x": "אקס", "i": "אני", "me": "מי"}
def heb(w): return w if not re.search(r"[a-z]", w) else LETTER.get(w, "".join(LAT.get(ch, ch) for ch in w))

def words(t):
    t = re.sub(r"\[[^\]]*\]|\([^)]*\)", " ", t)
    t = re.sub(r"[֑-ׇ]", "", t)                       # ניקוד וטעמים
    t = t.replace("ק״ג", "קילו").replace('ק"ג', "קילו").replace("ק״מ", "קילומטר")
    t = t.replace("'", "").replace("׳", "").replace("’", "")
    t = t.replace("־", " ").replace("-", " ")   # מקף מחבר: שתי מילים
    t = re.sub(r"\d+", lambda m: f" {DIG[int(m.group())] if int(m.group()) < len(DIG) else TENS.get(int(m.group()), m.group())} ", t)
    t = re.sub(r"[^א-תa-zA-Z0-9\s]", " ", t).translate(FINAL).lower()
    return t.split()

def spell(w):   # כתיב מלא / חסר: בלי אימות קריאה באמצע המילה, ובלי אותיות כפולות
    core = w[0] + re.sub(r"[וי]", "", w[1:]) if len(w) > 2 else w
    return re.sub(r"(.)\1+", r"\1", core)
sound = lambda w: re.sub(r"(.)\1+", r"\1", re.sub(r"[אהוי]", "", spell(heb(w)).translate(SOUND)))
same = lambda a, b: a == b or spell(a) == spell(b)

def stt(path):
    b = "----" + uuid.uuid4().hex
    parts = [f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()
             for k, v in (("model_id", "scribe_v2"), ("language_code", "he"), ("tag_audio_events", "false"), ("timestamps_granularity", "word"))]
    parts.append(f'--{b}\r\nContent-Disposition: form-data; name="file"; filename="a.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n'.encode() + open(path, "rb").read() + b"\r\n")
    parts.append(f"--{b}--\r\n".encode())
    h = {"Content-Type": f"multipart/form-data; boundary={b}"}
    if os.environ.get("XI_API_KEY"): h["xi-api-key"] = os.environ["XI_API_KEY"]
    for attempt in range(4):
        try:
            req = urllib.request.Request("https://api.elevenlabs.io/v1/speech-to-text", data=b"".join(parts), headers=h, method="POST")
            with urllib.request.urlopen(req, timeout=120) as r:
                d = json.loads(r.read())
            return {"text": d["text"], "words": [[w["text"], round(w["start"], 2), round(w["end"], 2), round(w.get("logprob", 0), 3)] for w in d.get("words", []) if w.get("type") == "word"]}
        except Exception as e:
            err = str(e); time.sleep(2 + attempt * 3)
    return {"err": err}

def judge(text, heard):
    """משווה את המילים שהיו אמורות להיאמר למילים שנשמעו. מחזיר (מצב, רשימת בעיות)."""
    exp = words(text)
    got = [(words(w[0]), w) for w in heard["words"]]
    got = [(x[0], w) for x, w in got if x]            # מילה אחת לכל פריט (סימני פיסוק נפלו)
    g = [x[0] for x in got]
    issues, state = [], "ok"
    sm = difflib.SequenceMatcher(None, [spell(w) for w in exp], [spell(w) for w in g], autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            for i, j in zip(range(i1, i2), range(j1, j2)):
                lp = got[j][1][3]
                if lp < LOW: issues.append({"kind": "unsure", "want": exp[i], "heard": g[j], "t": got[j][1][1], "lp": lp})
            continue
        want, hrd = exp[i1:i2], g[j1:j2]
        t = got[j1][1][1] if j1 < len(got) else (got[-1][1][2] if got else 0)
        # נשמע אותו דבר? (אותיות הומופוניות, או חלוקה אחרת למילים)
        close = difflib.SequenceMatcher(None, "".join(sound(w) for w in want), "".join(sound(w) for w in hrd)).ratio() if want and hrd else 0
        sw, sh = "".join(sound(w) for w in want), "".join(sound(w) for w in hrd)
        if sw == sh and (len(want) == len(hrd) or any(re.search(r"[a-z]", w) for w in hrd)): continue   # אותו צליל בדיוק, רק כתיב אחר ("במוט"/"במות", "גו"/"go")
        issues.append({"kind": "sounds-like" if close >= 0.8 else "wrong", "want": " ".join(want), "heard": " ".join(hrd), "t": t})
    if any(x["kind"] == "wrong" for x in issues): state = "bad"
    elif issues: state = "suspect"
    return state, issues

def best_judge(line, heard):
    """הכתובית והנוסח שנשלח להקלטה (מנוקד) לפעמים שונים ("תרגיל הבא" / "התרגיל הבא"): מספיק שהקליפ תואם לאחד מהם."""
    cands = [judge(t, heard) for t in dict.fromkeys([line["text"], line.get("spoken") or line["text"]])]
    return max(cands, key=lambda x: ({"ok": 2, "suspect": 1, "bad": 0}[x[0]], -len(x[1])))

def main():
    args = sys.argv[1:]
    lines = json.load(open(args[0]))
    coach = args[args.index("--coach") + 1] if "--coach" in args else None
    out_f = args[args.index("--out") + 1] if "--out" in args else os.path.join(ROOT, "assets", "_src", "voice_audit.json")
    keys = [k for k in lines if not coach or k.split("/")[0] in coach.split(",")]
    cache = json.load(open(CACHE_F)) if os.path.exists(CACHE_F) else {}
    def one(k):
        p = os.path.join(ROOT, "assets", "voice", k + ".mp3")
        if not os.path.exists(p): return k, None, {"err": "missing file"}
        h = hashlib.md5(open(p, "rb").read()).hexdigest()
        if cache.get(k, {}).get("h") == h and "err" not in cache[k]["r"]: return k, h, cache[k]["r"]
        return k, h, stt(p)
    res, n = {}, 0
    with ThreadPoolExecutor(6) as ex:
        for k, h, r in ex.map(one, keys):
            n += 1
            if h: cache[k] = {"h": h, "r": r}
            res[k] = r
            if n % 100 == 0:
                print(f"  {n}/{len(keys)}", flush=True); json.dump(cache, open(CACHE_F, "w"), ensure_ascii=False)
    json.dump(cache, open(CACHE_F, "w"), ensure_ascii=False)
    report = {}
    by_word = {}   # (מאמן, מילה) → ציוני הביטחון שלה בכל הקליפים
    for k, r in res.items():
        if "err" in r: report[k] = {"state": "bad", "text": lines[k]["text"], "heard": r["err"], "issues": [{"kind": "error", "want": "", "heard": r["err"], "t": 0}]}; continue
        state, issues = best_judge(lines[k], r)
        report[k] = {"state": state, "text": lines[k]["text"], "heard": r["text"], "issues": issues}
        for w in r["words"]:
            for x in words(w[0]): by_word.setdefault((k.split("/")[0], spell(x)), []).append((w[3], k, w[1]))
    # עקביות: אותה מילה אצל אותו מאמן — קליפים שבהם היא ברורה הרבה פחות מהרגיל
    for (c, w), xs in by_word.items():
        if len(xs) < 3: continue
        med = statistics.median(x[0] for x in xs)
        if med < -0.03: continue
        for lp, k, t in xs:
            if lp < OUTLIER and not any(i.get("t") == t for i in report[k]["issues"]):
                report[k]["issues"].append({"kind": "inconsistent", "want": w, "heard": w, "t": t, "lp": lp, "usual": round(med, 3)})
                if report[k]["state"] == "ok": report[k]["state"] = "suspect"
    json.dump(report, open(out_f, "w"), ensure_ascii=False, indent=1)
    cnt = {s: sum(1 for v in report.values() if v["state"] == s) for s in ("ok", "suspect", "bad")}
    print(f"checked {len(report)}: ok {cnt['ok']}, suspect {cnt['suspect']}, bad {cnt['bad']}")
    per = {}
    for k, v in report.items(): per.setdefault(k.split("/")[0], {"ok": 0, "suspect": 0, "bad": 0})[v["state"]] += 1
    for c, v in sorted(per.items()): print(f"  {c}: {v}")

if __name__ == "__main__":
    main()
