"""Generate exercise demo loops: per coach x exercise -> start-frame image (same person as the coach portrait)
-> 4s seamless video loop (start_frame == end_frame). Resumable via assets/_src/demos_state.json."""
import json, os, sys, threading
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(__file__))
import el

ROOT = os.path.join(os.path.dirname(__file__), "..")
SRC = os.path.join(ROOT, "assets", "_src")
STATE_F = os.path.join(SRC, "demos_state.json")
DEMOS = json.load(open(os.path.join(os.path.dirname(__file__), "demos.json")))
COACH_GEN = json.load(open(os.path.join(SRC, "coaches.json")))
WHO = {"ori": "the same man from the reference image (same face, hair, stubble, same black t-shirt with lime piping and black shorts)",
       "noa": "the same woman from the reference image (same face, dark ponytail, same black sports top with lime piping and black leggings)",
       "maya": "the same woman from the reference image (same face, light-brown curly hair in a high bun, same black sleeveless top with amber piping and black leggings)",
       "guy": "the same man from the reference image (same face, short light-brown hair, same black running t-shirt with thin amber piping and black running shorts, sports watch)",
       "shira": "the same woman from the reference image (same face, dark-blonde ponytail under a plain black running cap, same black running tank top with thin amber piping and black running tights, sports watch)",
       "lia": "the same woman from the reference image (same face, shoulder-length dark wavy hair with a plain black headband, same black cropped training top with thin amber piping and black high-waist leggings, barefoot)",
       "tamar": "the same woman from the reference image (same face, straight shoulder-length auburn-brown hair, same fitted black long-sleeve top with thin amber piping and black leggings, barefoot)"}
GYM = ("in a dark premium modern gym with teal and electric-lime accent lighting. Full body visible, centered, vertical 9:16 framing, "
       "photorealistic. No text, no logos, no brand names.")
PARK = ("on a red outdoor running track in a city park at golden hour, warm amber sunlight, trees softly blurred in the background. Anatomically correct body, two arms and two legs. "
        "Full body visible, centered, vertical 9:16 framing, photorealistic. No text, no logos, no brand names, no race numbers.")
STUDIO = ("in a modern boutique fitness studio with a dark rubber floor, a brick wall and warm amber and soft teal accent lighting. Anatomically correct body, two arms and two legs. "
          "Full body visible, centered, vertical 9:16 framing, photorealistic. No text, no logos, no brand names.")
SCENES = {"ori": GYM, "noa": GYM, "guy": PARK, "shira": PARK, "lia": STUDIO,
          "maya": ("in a dark premium calisthenics studio with a steel rig, warm amber and soft teal accent lighting. Anatomically correct body, two arms and two legs. "
                   "Full body visible, centered, vertical 9:16 framing, photorealistic. No text, no logos, no brand names."),
          "tamar": ("in a calm premium movement studio with a light wooden floor, rolled mats in the background, warm amber and soft teal accent lighting. "
                    "Anatomically correct body, two arms and two legs. Full body visible, centered, vertical 9:16 framing, photorealistic. No text, no logos, no brand names.")}
# מי מדגים כל תרגיל: האיבר השלישי ב-demos.json — "cali" = רק מאיה, "mob" = רק תמר, "run" = גיא ושירה, "all" = אורי, נועה ומאיה, "stretch" = כולם, בלי = אורי ונועה
COACHES_FOR = {"gym": ("ori", "noa"), "cali": ("maya",), "mob": ("tamar",), "run": ("guy", "shira"), "hiit": ("lia",), "pil": ("lia",), "all": ("ori", "noa", "maya"), "stretch": ("ori", "noa", "maya", "tamar")}
EXTRA = json.load(open(os.path.join(os.path.dirname(__file__), "demos_extra.json")))  # מאמן → תרגילים קיימים שגם הוא מדגים
def coaches_for(ex):
    return tuple(COACHES_FOR[DEMOS[ex][2] if len(DEMOS[ex]) > 2 else "gym"]) + tuple(c for c, ids in EXTRA.items() if ex in ids)
lock = threading.Lock()
state = json.load(open(STATE_F)) if os.path.exists(STATE_F) else {}

def save():
    with lock:
        json.dump(state, open(STATE_F, "w"), indent=1)

def job(coach, ex):
    key = f"{coach}/{ex}"
    st = state.setdefault(key, {})
    pose, motion = DEMOS[ex][:2]
    SCENE = SCENES[coach]
    try:
        if "img" not in st:
            gid = el.create("image", {"model_id": "gemini-3.1-flash-image", "resolution": "1K", "aspect_ratio": "9:16",
                                      "images": [{"type": "generation", "generation_id": COACH_GEN[coach]}],
                                      "prompt": f"Photo of {WHO[coach]} {pose}, {SCENE}"})
            r = el.wait("image", gid)
            el.download(r["content_url"], os.path.join(SRC, "demos", coach, f"{ex}.png"))
            st["img"] = gid; save()
        if "vid" not in st:
            ref = {"type": "generation", "generation_id": st["img"]}
            body = {"model_id": "veo-3.1-fast-generate-001", "duration_secs": 4, "resolution": "720p", "aspect_ratio": "9:16",
                    "generate_audio": False, "start_frame": ref,
                    "prompt": f"The athlete {motion}. Smooth realistic human motion, correct technique, fixed static camera, {SCENE}"}
            if ex not in ("farmer_carry", "sled_push", "treadmill_run", "outdoor_run", "battle_rope"):
                body["end_frame"] = ref  # seamless loop
            gid = el.create("video", body)
            r = el.wait("video", gid)
            el.download(r["content_url"], os.path.join(SRC, "demos", coach, f"{ex}.mp4"))
            st["vid"] = gid; save()
        return key, "ok"
    except Exception as e:  # keep going, rerun to resume
        return key, f"ERR {e}"

if __name__ == "__main__":
    only = sys.argv[1:]  # optional list of exercise ids and/or @coach
    coach_only = [a[1:] for a in only if a.startswith("@")]  # למשל @maya
    only = [a for a in only if not a.startswith("@")]
    jobs = [(c, e) for e in DEMOS for c in coaches_for(e) if (not only or e in only) and (not coach_only or c in coach_only)]
    with ThreadPoolExecutor(8) as ex:
        for key, res in ex.map(lambda a: job(*a), jobs):
            print(key, res, flush=True)
