#!/usr/bin/env python3
"""The "pretty" face library (Episode 22), next to AltiWyre's pack: glamorous girl faces from the Roblox Creator Store.

  python tools/pretty_pack.py      # -> web/assets/faces/pretty/index.json + <image id>.png (700x700, transparent)

Two packs (each pack's terms are copied into index.json):
  lash  smoshmlp2's "Female Face Pack (Eyes)", Creator Store model 17769829463: 15 lashed eye sets (no mouths). The creator:
        "You can use this face pack for female characters in your animation/movies!"
  glam  caffeinatedhell's face decals ("faces - ..."), original designs only (their fan-art faces of existing characters are left
        out): whole faces with lashes, irises, blush and lips, one expression each. The creator: "anyone can use!" (and asks to be
        told where they're used: a comment on the decal; the renderer can't post one).
Images come from Roblox's public thumbnails, like tools/alti_pack.py. Engine side: web/engine/altiface.js ("lash:" and "glam:" names).
The decal ids inside model 17769829463 were read in Studio (game:GetObjects); the model itself needs a login to download.
"""
import json
import pathlib
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "web" / "assets" / "faces" / "pretty"

# lash: the pack's eye sets in its own order, named by what they show
LASH = {"open": 17764848850, "soft": 17768131955, "soft2": 17768495307, "angry": 17768580707, "flat": 17768619609, "wink": 17768831361,
        "flick": 17768688283, "tired": 17768910761, "raised": 17768951589, "angry2": 17768961416, "flat2": 17768980862,
        "closed_happy": 17769067289, "closed": 17769151706, "closed_sad": 17769183824, "closed_angry": 17769218061}
# lash presets: eyes (blink: closed eyes) + the Alti preset whose mouth / extras are used
LASH_PRESETS = {
    "neutral": {"eyes": "flick", "blink": "closed", "alti": "neutral"},
    "happy": {"eyes": "flick", "blink": "closed_happy", "alti": "happy"},
    "smile": {"eyes": "soft", "blink": "closed_happy", "alti": "happy"},
    "laugh": {"eyes": "closed_happy", "alti": "laugh"},
    "grin": {"eyes": "closed_happy", "alti": "grin"},
    "smug": {"eyes": "flat2", "blink": "closed", "alti": "smug"},
    "surprised": {"eyes": "raised", "blink": "closed", "alti": "surprised"},
    "shocked": {"eyes": "raised", "alti": "shocked"},
    "nervous": {"eyes": "tired", "blink": "closed_sad", "alti": "nervous"},
    "scared": {"eyes": "tired", "alti": "scared"},
    "terrified": {"eyes": "raised", "alti": "terrified"},
    "sad": {"eyes": "tired", "blink": "closed_sad", "alti": "sad"},
    "angry": {"eyes": "angry", "blink": "closed_angry", "alti": "angry"},
    "suspicious": {"eyes": "flat", "blink": "closed", "alti": "suspicious"},
    "wink": {"eyes": "wink", "alti": "happy"},
}
# glam: whole faces
GLAM = {"brown_beauty": 5375371897, "beauty_spots": 5385672347, "cocoa_bunny": 4759260967, "silver_bunny": 4801837930,
        "spring_pastel": 4767791908, "fantasy": 4928614446, "cloudy_night": 5376064557, "egghunt": 4793292397}
PACKS = {
    "lash": {"name": "Female Face Pack (Eyes)", "creator": "smoshmlp2", "source": "https://create.roblox.com/store/asset/17769829463",
             "terms": "You can use this face pack for female characters in your animation/movies!"},
    "glam": {"name": "faces - ... (decals)", "creator": "caffeinatedhell", "source": "https://create.roblox.com/store/asset/5385672347 and the creator's other decals",
             "terms": "Please let me know in the comments if you use any of my faces and what game! Originally intended for Royale High, but anyone can use!"},
}


def http(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "itt-renderer/1.0"}), timeout=60).read()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    idx = {"packs": PACKS, "lash": {k: str(v) for k, v in LASH.items()}, "lash_presets": LASH_PRESETS, "glam": {k: str(v) for k, v in GLAM.items()}}
    (OUT / "index.json").write_text(json.dumps(idx, indent=1), encoding="utf-8")
    todo = [i for i in [*LASH.values(), *GLAM.values()] if not (OUT / f"{i}.png").exists()]
    print(len(todo), "images to fetch")
    for k in range(0, len(todo), 50):
        part = todo[k:k + 50]
        for _ in range(8):
            d = json.loads(http("https://thumbnails.roblox.com/v1/assets?assetIds=" + ",".join(map(str, part)) + "&returnPolicy=PlaceHolder&size=700x700&format=Png&isCircular=false"))["data"]
            if not [x for x in d if x["state"] == "Pending"]:
                break
            time.sleep(3)
        for x in d:
            if x["state"] == "Completed":
                (OUT / f"{x['targetId']}.png").write_bytes(http(x["imageUrl"]))
            else:
                print("no image:", x["targetId"], x["state"])
    print("done", len(list(OUT.glob("*.png"))))


if __name__ == "__main__":
    main()
