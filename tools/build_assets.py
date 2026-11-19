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
    for c in ("ori", "noa", "maya"):
        if not os.path.exists(f"{SRC}/coach_{c}.png"): continue  # אין מקור מקומי — משאירים את הקובץ הקיים
        im = Image.open(f"{SRC}/coach_{c}.png").convert("RGB")
        w, h = im.size
        big = im.copy(); big.thumbnail((900, 1200)); big.save(f"{OUT}/coaches/{c}.webp", quality=82)
        s = int(w * 0.46); cx, cy = (int(w * 0.54), int(h * 0.30)) if c == "maya" else (w // 2, int(h * 0.27))
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
    """אייקון האפליקציה: עיגול ענבר עם ברק (כמו כפתור האימון במרכז סרגל הניווט) על רקע כחול-לילה.
    הרקע ממלא את כל הריבוע (אייפון מעגל פינות לבד), והסמל בתוך האזור הבטוח של אייקון maskable."""
    os.makedirs(f"{OUT}/icons", exist_ok=True)
    S = 2048  # ציור גדול והקטנה — קצוות חלקים
    im = Image.new("RGB", (S, S), (15, 22, 29)); d = ImageDraw.Draw(im)
    c = S / 2
    for r, col in ((0.50, (19, 28, 37)), (0.40, (24, 35, 46))):   # הילה עדינה מאחורי העיגול
        d.ellipse([c - S * r, c - S * r, c + S * r, c + S * r], fill=col)
    R = S * 0.30
    d.ellipse([c - R, c - R, c + R, c + R], fill=(255, 138, 76))
    bolt = [(13, 2.5), (5, 13.5), (11, 13.5), (10, 21.5), (18, 10.5), (12, 10.5)]  # אותו ברק כמו באייקון bolt שבממשק (24×24)
    k = R * 1.30 / 24
    d.polygon([(c + (x - 11.5) * k, c + (y - 12) * k) for x, y in bolt], fill=(15, 22, 29))
    for size in (192, 512):
        im.resize((size, size), Image.LANCZOS).save(f"{OUT}/icons/icon-{size}.png")

if __name__ == "__main__":
    coaches(); icons()
    demos = json.load(open(os.path.join(os.path.dirname(__file__), "demos.json")))
    WHO = {"gym": ("ori", "noa"), "cali": ("maya",), "all": ("ori", "noa", "maya")}
    jobs = [(c, e) for e, v in demos.items() for c in WHO[v[2] if len(v) > 2 else "gym"]]
    with ThreadPoolExecutor(4) as ex:
        list(ex.map(demo, jobs))
    print("done")
