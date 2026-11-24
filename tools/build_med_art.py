"""איורי המסעות → assets/med: <מסע>.webp (רקע מסך ההליכה, 720×1290), <מסע>_sq.webp (כרטיס הבחירה, 480×480) ו-<מסע>.mp4 (לולאת תקריב איטית, 540×960).
המקור: assets/_src/med/<מסע>.png (tools/gen_med_art.py)."""
import os, subprocess, sys
from PIL import Image
ROOT = os.path.join(os.path.dirname(__file__), "..")
SRC, OUT = f"{ROOT}/assets/_src/med", f"{ROOT}/assets/med"
os.makedirs(OUT, exist_ok=True)
for k in sys.argv[1:] or ["wake", "intent", "sleep", "morning", "release", "heal", "connect", "reset", "thanks", "presence"]:
    im = Image.open(f"{SRC}/{k}.png").convert("RGB"); w, h = im.size
    im.resize((720, 1290), Image.LANCZOS).save(f"{OUT}/{k}.webp", quality=80)
    top = int(h * 0.10); im.crop((0, top, w, top + w)).resize((480, 480), Image.LANCZOS).save(f"{OUT}/{k}_sq.webp", quality=80)
    tmp = f"{SRC}/{k}_tall.png"; im.resize((1080, 1936), Image.LANCZOS).crop((0, 8, 1080, 1928)).save(tmp)
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-loop", "1", "-i", tmp, "-vf",
                    "zoompan=z='1.05+0.05*sin(2*PI*on/300)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)+12*sin(2*PI*on/300)':d=300:s=540x960:fps=25",
                    "-t", "12", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "27", "-an", "-movflags", "+faststart", f"{OUT}/{k}.mp4"], check=True)
    os.remove(tmp); print(k, "✓")
