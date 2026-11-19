"""Converts raw generated media (assets/_src) into web-optimized assets:
coaches -> webp (+face crop), demos -> H.264 540x960 mp4 (no audio, faststart) + webp poster, app icons."""
import os, subprocess, json
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), "..")
SRC = os.path.join(ROOT, "assets", "_src")
OUT = os.path.join(ROOT, "assets")

def coaches():
    os.makedirs(f"{OUT}/coaches", exist_ok=True)
    for c in ("ori", "noa", "maya", "tamar", "guy", "shira", "lia", "yael"):
        if not os.path.exists(f"{SRC}/coach_{c}.png"): continue  # אין מקור מקומי — משאירים את הקובץ הקיים
        im = Image.open(f"{SRC}/coach_{c}.png").convert("RGB")
        w, h = im.size
        big = im.copy(); big.thumbnail((900, 1200)); big.save(f"{OUT}/coaches/{c}.webp", quality=82)
        s = int(w * 0.46); cx, cy = (int(w * 0.54), int(h * 0.30)) if c == "maya" else (int(w * 0.5), int(h * 0.19)) if c in ("tamar", "yael") else (int(w * 0.5), int(h * 0.33)) if c == "guy" else (int(w * 0.51), int(h * 0.20)) if c == "lia" else (int(w * 0.52), int(h * 0.30)) if c == "shira" else (w // 2, int(h * 0.27))
        face = im.crop((cx - s // 2, cy - s // 2, cx + s // 2, cy + s // 2 + int(s * 0.2))).resize((360, 432), Image.LANCZOS)
        face.save(f"{OUT}/coaches/{c}_face.webp", quality=84)

def demo(job):
    coach, ex = job
    src = f"{SRC}/demos/{coach}/{ex}"
    dst = f"{OUT}/demos/{coach}/{ex}"
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if os.path.exists(src + ".mp4") and not os.path.exists(dst + ".mp4"):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src + ".mp4", "-an", "-vf", "scale=540:-2,fps=24",
                        "-c:v", "libx264", "-preset", "slow", "-crf", "29", "-g", "12", "-keyint_min", "6", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
                        dst + ".mp4"], check=True)
    if os.path.exists(src + ".png") and not os.path.exists(dst + ".webp"):
        im = Image.open(src + ".png").convert("RGB"); im.thumbnail((540, 960)); im.save(dst + ".webp", quality=76)
    return job

def icons():
    """אייקון האפליקציה: שלוש קשתות מסתובבות (ענבר, אלמוג, ציאן) — שלושה מסלולים — על רקע כחול-לילה — נוצר ב-AI ונשמר כמקור
    ב-assets/icons/icon-source.png (1024×1024, רקע מלא בלי פינות מעוגלות). כאן רק מקטינים לגדלים שהדפדפן צריך."""
    src = Image.open(f"{OUT}/icons/icon-source.png").convert("RGB")
    for size in (192, 512):
        src.resize((size, size), Image.LANCZOS).save(f"{OUT}/icons/icon-{size}.png")

if __name__ == "__main__":
    coaches(); icons()
    demos = json.load(open(os.path.join(os.path.dirname(__file__), "demos.json")))
    WHO = {"gym": ("ori", "noa"), "cali": ("maya",), "mob": ("tamar",), "run": ("guy", "shira"), "hiit": ("lia",), "pil": ("lia",), "yoga": ("yael",), "all": ("ori", "noa", "maya"), "stretch": ("ori", "noa", "maya", "tamar")}
    extra = json.load(open(os.path.join(os.path.dirname(__file__), "demos_extra.json")))
    jobs = [(c, e) for e, v in demos.items() for c in WHO[v[2] if len(v) > 2 else "gym"]] + [(c, e) for c, ids in extra.items() for e in ids]
    with ThreadPoolExecutor(4) as ex:
        list(ex.map(demo, jobs))
    print("done")
