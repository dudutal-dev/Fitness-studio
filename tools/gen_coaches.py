"""Generate the virtual coach portraits (Ori, Noa - gym track; Maya - calisthenics track).
Usage: python3 tools/gen_coaches.py [coach ids]  (default: all; existing generation ids are kept for the others)"""
import json, os, sys
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(__file__))
import el

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "_src")
STYLE = ("dark premium futuristic gym with moody teal and electric-lime rim lighting, shallow depth of field, "
         "photorealistic editorial fitness photography, 85mm, cinematic. Absolutely no text, no logos, no brand names, no lettering anywhere.")
COACHES = {
    "ori": "Portrait of Ori, a confident athletic Israeli male personal trainer, about 30, short dark hair faded on the sides, light stubble, "
           "warm determined smile, muscular but lean, wearing a plain fitted charcoal-black performance t-shirt with thin lime-green piping and black shorts, "
           "arms crossed, standing, waist-up framing. " + STYLE,
    "noa": "Portrait of Noa, a confident athletic Israeli female personal trainer, about 28, long dark-brown hair in a high ponytail, "
           "bright energetic smile, toned and strong, wearing a plain charcoal-black sports top with thin lime-green piping and black high-waist leggings, "
           "hands on hips, standing, waist-up framing. " + STYLE,
    "maya": "Portrait of Maya, a confident Israeli female calisthenics and gymnastics coach, about 27, light-brown curly hair tied up in a high bun, "
            "calm focused friendly smile, lean and very strong gymnast build with defined shoulders and arms, chalk on her hands, wearing a plain fitted black "
            "sleeveless training top with thin amber-orange piping and black leggings, standing next to a steel pull-up bar with one hand resting on it, waist-up framing. "
            "Dark premium calisthenics studio with steel pull-up bars and wooden gymnastic rings in the background, moody warm amber and soft teal rim lighting, "
            "shallow depth of field, photorealistic editorial fitness photography, 85mm, cinematic. Absolutely no text, no logos, no brand names, no lettering anywhere.",
    "guy": "Portrait of Guy, a friendly energetic Israeli male running coach, about 33, short light-brown hair, clean-shaven, lean runner's build, bright open smile, "
           "wearing a plain fitted black running t-shirt with thin amber-orange piping and black running shorts, a plain sports watch on his wrist, hands on hips, standing, waist-up framing. "
           "Outdoor running track in a city park at golden hour, soft warm amber sunlight with a hint of teal in the shadows, trees softly blurred in the background, shallow depth of field, photorealistic editorial sports photography, 85mm, cinematic. Absolutely no text, no logos, no brand names, no lettering, no race numbers anywhere.",
    "shira": "Portrait of Shira, a cheerful focused Israeli female running coach, about 29, dark-blonde hair in a low ponytail under a plain black running cap, light freckles, lean runner's build, warm confident smile, "
             "wearing a plain fitted black running tank top with thin amber-orange piping and black running tights, a plain sports watch on her wrist, arms relaxed at her sides, standing, waist-up framing. "
             "Outdoor running track in a city park at golden hour, soft warm amber sunlight with a hint of teal in the shadows, trees softly blurred in the background, shallow depth of field, photorealistic editorial sports photography, 85mm, cinematic. Absolutely no text, no logos, no brand names, no lettering, no race numbers anywhere.",
    "lia": "Portrait of Lia, an energetic confident Israeli female HIIT and Pilates instructor, about 31, shoulder-length dark wavy hair held back with a plain black headband, olive skin, bright determined smile, athletic toned build, "
           "wearing a plain fitted black cropped training top with thin amber-orange piping and black high-waist leggings, barefoot, standing on a dark exercise mat with arms relaxed and one hand holding a small towel, waist-up framing. "
           "Modern boutique fitness studio with a dark rubber floor, a large mirror and warm amber and soft teal accent lighting softly blurred in the background, shallow depth of field, photorealistic editorial fitness photography, 85mm, cinematic. Absolutely no text, no logos, no brand names, no lettering anywhere.",
    "yael": "Portrait of Yael, a serene warm Israeli female yoga teacher, about 35, long black hair in a single loose braid over one shoulder, light olive skin, "
            "soft calm smile, slender strong build with tall relaxed posture, wearing a plain fitted black sleeveless yoga top with thin amber-orange piping "
            "and black yoga leggings, standing barefoot on a dark yoga mat, hands relaxed at her sides, waist-up framing. "
            "Bright calm yoga studio with a light wooden floor, a large window with soft daylight, a few green plants and rolled yoga mats in the soft-focus background, "
            "warm amber and soft teal accent lighting, shallow depth of field, photorealistic editorial fitness photography, 85mm, cinematic. Absolutely no text, no logos, no brand names, no lettering anywhere.",
    "tamar": "Portrait of Tamar, a warm calm Israeli female mobility and flexibility coach, about 38, straight shoulder-length auburn-brown hair tucked behind one ear, "
             "gentle confident smile, lean supple build with relaxed open posture, wearing a plain fitted black long-sleeve training top with thin amber-orange piping "
             "and black leggings, standing barefoot on a wooden studio floor beside a rolled exercise mat, one hand resting lightly on her hip, waist-up framing. "
             "Calm premium movement studio with a light wooden floor, a few rolled mats and a foam roller in the soft-focus background, warm amber and soft teal "
             "accent lighting, shallow depth of field, photorealistic editorial fitness photography, 85mm, cinematic. Absolutely no text, no logos, no brand names, no lettering anywhere.",
}

def run(cid):
    gid = el.create("image", {"model_id": "gemini-3.1-flash-image", "resolution": "2K", "aspect_ratio": "3:4", "prompt": COACHES[cid]})
    r = el.wait("image", gid)
    el.download(r["content_url"], os.path.join(OUT, f"coach_{cid}.png"))
    return cid, gid

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, "coaches.json")
    res = json.load(open(path)) if os.path.exists(path) else {}
    with ThreadPoolExecutor(3) as ex:
        res.update(dict(ex.map(run, sys.argv[1:] or list(COACHES))))
    json.dump(res, open(os.path.join(OUT, "coaches.json"), "w"), indent=1)
    print(res)
