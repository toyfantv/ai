#!/usr/bin/env python3
"""Build a Season 2 episode JSON from a compact spec (keeps voices/defaults identical across episodes)."""
import json, sys
NARRATOR = {"openrouter": {"model": "elevenlabs/eleven-v3-conversational", "voice": "ErXwobaYiN019PkySvjV", "pitch": 1.1, "tempo": 1.12,
                           "max_tempo": 1.15, "pace": [2.6, 3.0]}, "kokoro": "am_michael", "speed": 1.0,
            "note": "Antoni (American), In This Town preset el:ErXwobaYiN019PkySvjV:1.1:1.12 - same narrator every episode"}
def build(spec):
    voices = {"narrator": NARRATOR}
    for name, v in spec.get("cast", {}).items():
        voices[name] = {"openrouter": {"model": "elevenlabs/eleven-v3-conversational", **v}, "kokoro": "af_heart", "speed": 1.0}
    lines = []
    for l in spec["lines"]:
        if isinstance(l, str): l = {"text": l}
        l.setdefault("pause", 0.32)
        lines.append(l)
    n = spec["number"]
    return {"id": f"ep{n:02d}", "number": n, "title": spec["title"], "output": spec["output"], "tts": "openrouter",
            "youtube_title": spec["youtube_title"], "tiktok_caption": spec["tiktok_caption"], "hashtags": spec["hashtags"],
            "thumbnail_text": spec["thumbnail_text"], "thumbnail_rec": spec["thumbnail_rec"],
            "lead_in": 0.3, "tail": spec.get("tail", 2.6), "voices": voices, "highlights": spec.get("highlights", {}),
            "lines": lines, "sound": spec["sound"]}
if __name__ == "__main__":
    spec = json.load(open(sys.argv[1])); out = build(spec)
    json.dump(out, open(sys.argv[2], "w"), indent=1, ensure_ascii=False); print("wrote", sys.argv[2], len(out["lines"]), "lines")
