#!/usr/bin/env python3
"""Generate narration audio for an episode and build its timeline.

Usage: python tools/tts.py episodes/ep06_ocean_sky.json

Writes build/<id>/voice/line_XX.wav and build/<id>/timeline.json.

Backends:
  * kokoro (default, offline). Needs KOKORO_MODEL and KOKORO_VOICES pointing at
    kokoro-v1.0.onnx and voices-v1.0.bin (github.com/thewh1teagle/kokoro-onnx releases).
  * elevenlabs: set ELEVENLABS_API_KEY plus ELEVENLABS_VOICE_<ROLE> (e.g.
    ELEVENLABS_VOICE_NARRATOR, ELEVENLABS_VOICE_MOTHER) to voice ids.
"""
import json
import os
import re
import sys
import urllib.request

import numpy as np
import soundfile as sf

SR = 24000


def trim(audio, thresh=0.01, pad=0.03):
    idx = np.where(np.abs(audio) > thresh)[0]
    if len(idx) == 0:
        return audio
    a = max(0, idx[0] - int(pad * SR))
    b = min(len(audio), idx[-1] + int(pad * SR))
    return audio[a:b]


class KokoroTTS:
    def __init__(self):
        from kokoro_onnx import Kokoro
        self.k = Kokoro(os.environ.get("KOKORO_MODEL", "kokoro-v1.0.onnx"),
                        os.environ.get("KOKORO_VOICES", "voices-v1.0.bin"))

    def say(self, text, role, cfg):
        audio, sr = self.k.create(text, voice=cfg["kokoro"], speed=cfg.get("speed", 1.0), lang="en-us")
        if sr != SR:
            from scipy.signal import resample_poly
            audio = resample_poly(audio, SR, sr)
        return np.asarray(audio, dtype=np.float32)


class ElevenLabsTTS:
    def __init__(self):
        self.key = os.environ["ELEVENLABS_API_KEY"]

    def say(self, text, role, cfg):
        voice = os.environ.get(f"ELEVENLABS_VOICE_{role.upper()}") or cfg.get("elevenlabs")
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=pcm_24000"
        body = json.dumps({"text": text, "model_id": "eleven_multilingual_v2"}).encode()
        req = urllib.request.Request(url, body, {"xi-api-key": self.key, "Content-Type": "application/json"})
        pcm = urllib.request.urlopen(req).read()
        return np.frombuffer(pcm, dtype="<i2").astype(np.float32) / 32768.0


def word_weights(text):
    # Rough syllable-ish weight per word, used to spread caption chunks across a line.
    words = text.split()
    return [max(1.0, len(re.sub(r"[^A-Za-z']", "", w)) / 3.2) + (0.6 if re.search(r"[,.]$", w) else 0) for w in words]


def main():
    ep_path = sys.argv[1]
    ep = json.load(open(ep_path))
    out = os.path.join("build", ep["id"])
    os.makedirs(os.path.join(out, "voice"), exist_ok=True)
    tts = ElevenLabsTTS() if os.environ.get("ELEVENLABS_API_KEY") else KokoroTTS()

    t = ep.get("lead_in", 0.3)
    timeline = {"lines": [], "captions": [], "scenes": {}}
    for i, line in enumerate(ep["lines"]):
        role = line.get("voice", "narrator")
        audio = trim(tts.say(line["text"], role, ep["voices"][role]))
        path = os.path.join(out, "voice", f"line_{i:02d}.wav")
        sf.write(path, audio, SR)
        dur = len(audio) / SR
        timeline["lines"].append({"i": i, "role": role, "text": line["text"], "start": round(t, 3),
                                  "end": round(t + dur, 3), "file": path,
                                  "whisper": ep["voices"][role].get("whisper", False)})
        timeline["scenes"].setdefault(str(line["scene"]), round(t, 3))

        # Caption chunks: weight by the words each chunk covers.
        chunks = line["captions"]
        w = [sum(word_weights(c[0])) for c in chunks]
        acc = t
        for c, wi in zip(chunks, w):
            d = dur * wi / sum(w)
            timeline["captions"].append({"text": c[0], "hl": c[1] if len(c) > 1 else "",
                                         "color": c[2] if len(c) > 2 else "yellow",
                                         "start": round(acc, 3), "end": round(acc + d, 3)})
            acc += d
        print(f"{t:6.2f}s  {dur:5.2f}s  [{role}] {line['text']}")
        t += dur + line.get("pause", 0.3)

    timeline["duration"] = round(t + ep.get("tail", 3.0), 3)
    # captions stay up until the next one (or a short hold)
    caps = timeline["captions"]
    for a, b in zip(caps, caps[1:]):
        a["end"] = round(min(b["start"], a["end"] + 0.6), 3)
    caps[-1]["end"] = round(caps[-1]["end"] + 1.2, 3)
    json.dump(timeline, open(os.path.join(out, "timeline.json"), "w"), indent=1)
    print("duration", timeline["duration"])


if __name__ == "__main__":
    main()
