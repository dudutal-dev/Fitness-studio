"""איורי ששת המסעות של "מדיטציה בתנועה" (אור) — נוצרים ב-ElevenLabs (Gemini Flash Image), 9:16.
שימוש: python3 tools/gen_med_art.py [מזהי מסעות]   ← assets/_src/med/<מסע>.png ; אחר כך tools/build_med_art.py"""
import os, sys
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(__file__))
import el

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "_src", "med")
STYLE = ("Sacred visionary psychedelic illustration, painterly digital art with fine luminous linework and soft glowing gradients, "
         "deep indigo and violet night tones with warm gold, rose and turquoise light, subtle sacred-geometry patterns woven into the scene, "
         "ethereal, spiritual, serene and uplifting, highly detailed, elegant composition with the main subject in the upper-middle and calm open space below. "
         "Vertical poster format. Absolutely no text, no letters, no symbols of any religion, no logos, no watermark.")
ART = {
    "morning": "A person walking on a path toward a huge radiant rising sun at dawn, arms slightly open, the first golden rays spreading across a wide sky as the last stars fade, dew sparkling on the grass, birds of light taking off, a soft sun mandala around the sunrise, fresh awakening energy. Theme: morning, a new day beginning. ",
    "release": "A silhouette of a person walking away on a winding path at dawn, open hands at their sides, while hundreds of glowing leaves, feathers and small birds of light lift off from their shoulders and dissolve into a vast luminous sky; flowing ribbons of wind and light. Theme: letting go, release. ",
    "heal": "A translucent human figure walking calmly, the body filled with a soft golden-green light that flows like rivers through it, a glowing lotus-like bloom of warm light at the heart, healing water and tender plants growing along the path at their feet, gentle rain of light. Theme: healing. ",
    "connect": "A person walking barefoot on a path whose footprints grow glowing roots into the earth, shimmering threads of light connecting their heart to trees, birds, distant houses, stars and other small walking figures on the horizon, forming one great web of light. Theme: connection, belonging. ",
    "reset": "A person walking along the still shore of a perfectly calm mirror-like lake at first light, one single ripple circle expanding on the water, a clear empty sky with one bright morning star, minimal, spacious and quiet, concentric circles of soft light like a fresh beginning. Theme: reset, clear mind. ",
    "thanks": "A person walking through a field at golden sunset with open raised palms, three radiant floating lanterns of warm light rising from their hands, golden wheat, blossoms and fireflies glowing all around, a huge warm sun mandala in the sky. Theme: gratitude. ",
    "presence": "A person walking slowly on a forest path fully awake to the moment, every leaf, dewdrop, stone and ray of light rendered in vivid shimmering detail around them, a soft aura around the figure, time standing still, floating particles of light, a large open luminous eye-like sun shape made of petals in the sky. Theme: presence, here and now. ",
}

def run(k):
    gid = el.create("image", {"model_id": "gemini-3.1-flash-image", "resolution": "2K", "aspect_ratio": "9:16", "prompt": ART[k] + STYLE})
    r = el.wait("image", gid)
    el.download(r["content_url"], os.path.join(OUT, f"{k}.png"))
    return k

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    with ThreadPoolExecutor(3) as ex:
        print(list(ex.map(run, sys.argv[1:] or list(ART))))
