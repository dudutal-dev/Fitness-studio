#!/usr/bin/env python3
"""מעתיק את התוכן של מסלול הטאי צ'י מהריפו dudutal-dev/taichi אל האפליקציה.
סרטונים (רק קליפים שאושרו): content/video/<clip>_916.mp4 → assets/demos/mei/t_<id>[__<clip>].mp4 (540×960) + תמונת פתיחה webp.
קריינות (רק שורות שאושרו): content/audio/narration/<id>.mp3 → assets/voice/mei/ex_t_<id>.mp3 ו-tc_<id>.mp3.
דיוקן: content/character/front.png → assets/coaches/mei.webp + mei_face.webp.
הרצה: node tools/tai_plan.mjs > plan.json && python3 tools/build_tai.py <path-to-taichi-repo> plan.json
"""
import json, os, shutil, subprocess, sys
from PIL import Image

SRC, PLAN = sys.argv[1], json.load(open(sys.argv[2]))
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
man = json.load(open(f"{SRC}/content/manifest.json"))
clips = {c["id"]: c for m in man["movements"] for c in (m.get("clips") or [])}
narr = man["narration"]
demos, voice = f"{ROOT}/assets/demos/mei", f"{ROOT}/assets/voice/mei"
os.makedirs(demos, exist_ok=True); os.makedirs(voice, exist_ok=True)

for clip, name in PLAN["videos"]:
    c = clips[clip]
    assert c["qa"] == "approved", f"{clip} is not approved"
    src = f"{SRC}/content/" + c["url"].replace(".mp4", "_916.mp4")
    out = f"{demos}/{name}.mp4"
    if not os.path.exists(out):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-an", "-vf", "scale=540:960", "-r", "24", "-c:v", "libx264", "-preset", "slow", "-crf", "29",
                        "-pix_fmt", "yuv420p", "-movflags", "+faststart", out], check=True)
    if not os.path.exists(f"{demos}/{name}.webp"):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", out, "-frames:v", "1", f"{demos}/{name}.png"], check=True)
        Image.open(f"{demos}/{name}.png").save(f"{demos}/{name}.webp", quality=78); os.remove(f"{demos}/{name}.png")

for nid, key in PLAN["voice"]:
    n = narr[nid]
    assert n["qa"] == "approved", f"{nid} is not approved"
    shutil.copyfile(f"{SRC}/content/" + n["url"], f"{voice}/{key}.mp3")

im = Image.open(f"{SRC}/content/character/front.png").convert("RGB")
p = im.crop((1020, 40, 1740, 1000)).resize((900, 1200), Image.LANCZOS)
p.save(f"{ROOT}/assets/coaches/mei.webp", quality=84)
w, h = p.size; s = int(w * 0.46); cx, cy = int(w * 0.5), int(h * 0.215)
p.crop((cx - s // 2, cy - int(s * 0.6), cx + s // 2, cy + int(s * 0.6))).resize((360, 432), Image.LANCZOS).save(f"{ROOT}/assets/coaches/mei_face.webp", quality=84)
print(len(PLAN["videos"]), "videos,", len(PLAN["voice"]), "narration clips")
