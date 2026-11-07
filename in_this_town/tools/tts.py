#!/usr/bin/env python3
"""Generate narration audio for an episode and build its timeline.

Usage: python tools/tts.py episodes/ep06_ocean_sky.json

Writes build/<id>/voice/line_XX.wav and build/<id>/timeline.json.

Backends (episode "tts" field, or TTS_BACKEND env):
  * openrouter: ElevenLabs models through OpenRouter (/api/v1/audio/speech). The key is sent as
    Authorization: Bearer $OPENROUTER_API_KEY (in Claude cloud sessions the proxy injects it).
    Per-line "tag" values (e.g. "[in awe]") are prepended for Eleven v3/v4 delivery control.
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

    def say(self, text, role, cfg, tag=""):
        audio, sr = self.k.create(text, voice=cfg["kokoro"], speed=cfg.get("speed", 1.0), lang="en-us")
        if sr != SR:
            from scipy.signal import resample_poly
            audio = resample_poly(audio, SR, sr)
        return np.asarray(audio, dtype=np.float32)


def decode_to_sr(data, af=None):
    import subprocess
    out = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', '-'] + (['-af', af] if af else []) + ['-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'],
                         input=data, capture_output=True, check=True).stdout
    return np.frombuffer(out, dtype=np.float32).copy()


def openrouter_key():
    """The environment, then ~/.env (this PC), else the cloud proxy's placeholder. Never printed."""
    k = os.environ.get("OPENROUTER_API_KEY")
    env = os.path.expanduser("~/.env")
    if not k and os.path.exists(env):
        for line in open(env, encoding="utf8"):
            m = re.match(r"\s*OPENROUTER_API_KEY\s*=\s*(.*)$", line)
            if m: k = m.group(1).strip().strip("'\"")
    return k or "proxy-injected"


class OpenRouterTTS:
    """ElevenLabs via OpenRouter, with a per-take mp3 cache and pace control.

    cfg.openrouter: {model, voice, pitch, tempo, max_tempo, pace: [lo, hi] words/sec}
    Lines (3+ words) outside the pace window get up to 3 takes; slow ones may raise tempo up to max_tempo.
    """
    def __init__(self):
        self.key = openrouter_key()
        self.cache = os.path.join("build", "tts_cache"); os.makedirs(self.cache, exist_ok=True)

    def raw(self, o, text, take):
        import hashlib
        h = hashlib.sha1(json.dumps([o.get("model"), o["voice"], text, take]).encode()).hexdigest()[:16]
        f = os.path.join(self.cache, h + ".mp3")
        if not os.path.exists(f):
            body = json.dumps({"model": o.get("model", "elevenlabs/eleven-v4"), "voice": o["voice"],
                               "input": text, "response_format": "mp3"}).encode()
            req = urllib.request.Request("https://openrouter.ai/api/v1/audio/speech", body,
                                         {"Authorization": f"Bearer {self.key}", "Content-Type": "application/json"})
            data = urllib.request.urlopen(req, timeout=120).read()   # read first: a failed request must not leave an empty cache file
            open(f, "wb").write(data)
        return open(f, "rb").read()

    @staticmethod
    def shape(data, p, t):
        # The API ignores speed: apply pitch/tempo afterwards (pitch shifts by p, overall speed by t).
        return trim(decode_to_sr(data, f"asetrate=44100*{p},aresample=44100,atempo={t / p:.5f}" if (p, t) != (1.0, 1.0) else None))

    def say(self, text, role, cfg, tag=""):
        o = cfg["openrouter"]
        inp = (tag + " " + text).strip() if tag else text
        p, t0 = float(o.get("pitch", 1.0)), float(o.get("tempo", 1.0))
        tmax = float(o.get("max_tempo", t0))
        lo, hi = o.get("pace", [0, 99])
        words = len(text.split())
        best = None
        for take in range(3):
            data = self.raw(o, inp, take)
            a = self.shape(data, p, t0)
            wps = words / (len(a) / SR)
            t = t0
            if words >= 3 and wps < lo and tmax > t0:   # slow line: allowed to speed up to max_tempo
                t = min(tmax, t0 * lo / wps); a = self.shape(data, p, t); wps = words / (len(a) / SR)
            tmin = float(o.get("min_tempo", t0))
            if words >= 3 and wps > hi and tmin < t0:   # a fast line may slow down to min_tempo (an episode can set it)
                t = max(tmin, t0 * hi / wps); a = self.shape(data, p, t); wps = words / (len(a) / SR)
            miss = 0 if words < 3 or lo <= wps <= hi else min(abs(wps - lo), abs(wps - hi))
            if best is None or miss < best[0]:
                best = (miss, a, take, t, wps)
            if miss == 0:
                break
        miss, a, take, t, wps = best
        print(f"      take {take} tempo {t:.3f} -> {wps:.2f} wps" + ("" if miss == 0 else "  (outside pace window)"))
        return a


class ElevenLabsTTS:
    def __init__(self):
        self.key = os.environ["ELEVENLABS_API_KEY"]

    def say(self, text, role, cfg, tag=""):
        voice = os.environ.get(f"ELEVENLABS_VOICE_{role.upper()}") or cfg.get("elevenlabs")
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=pcm_24000"
        body = json.dumps({"text": text, "model_id": "eleven_multilingual_v2"}).encode()
        req = urllib.request.Request(url, body, {"xi-api-key": self.key, "Content-Type": "application/json"})
        pcm = urllib.request.urlopen(req).read()
        return np.frombuffer(pcm, dtype="<i2").astype(np.float32) / 32768.0


def auto_captions(text, highlights):
    """Split a line into 2-4 word caption chunks (break at punctuation) with highlight phrases."""
    words = text.upper().replace("\u2019", "'").split()
    chunks, cur = [], []
    for w in words:
        cur.append(w)
        if len(cur) >= 4 or (len(cur) >= 2 and re.search(r"[,.!?:;\u201d\"]$", w)):
            chunks.append(cur); cur = []
    if cur:
        if len(cur) == 1 and chunks and len(chunks[-1]) < 5: chunks[-1] += cur
        else: chunks.append(cur)
    out = []
    for c in chunks:
        txt = " ".join(c)
        hls = []
        for phrase, color in highlights.items():
            if phrase.upper() in txt:
                hls.append([phrase.upper(), color])
        out.append([txt, hls] if hls else [txt])
    return out


def word_weights(text):
    # Rough syllable-ish weight per word, used to spread caption chunks across a line.
    words = text.split()
    return [max(1.0, len(re.sub(r"[^A-Za-z']", "", w)) / 3.2) + (0.6 if re.search(r"[,.]$", w) else 0) for w in words]


def main():
    ep_path = sys.argv[1]
    ep = json.load(open(ep_path, encoding="utf8"))
    out = os.path.join("build", ep["id"])
    os.makedirs(os.path.join(out, "voice"), exist_ok=True)
    backend = os.environ.get("TTS_BACKEND") or ep.get("tts") or ("elevenlabs" if os.environ.get("ELEVENLABS_API_KEY") else "kokoro")
    tts = {"openrouter": OpenRouterTTS, "elevenlabs": ElevenLabsTTS, "kokoro": KokoroTTS}[backend]()
    print("tts backend:", backend)

    t = ep.get("lead_in", 0.3)
    timeline = {"lines": [], "captions": [], "scenes": {}}
    for i, line in enumerate(ep["lines"]):
        role = line.get("voice", "narrator")
        if line.get("audio"):   # a line made another way (a local voice conversion when the credit ran out): used as it is
            import subprocess
            raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', line["audio"], '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
            audio = trim(np.frombuffer(raw, dtype=np.float32).copy())
        else:
            audio = trim(tts.say(line.get("speak", line["text"]), role, ep["voices"][role], line.get("tag", "")))
        path = os.path.join(out, "voice", f"line_{i:02d}.wav")
        sf.write(path, audio, SR)
        dur = len(audio) / SR
        timeline["lines"].append({"i": i, "role": role, "text": line["text"], "start": round(t, 3),
                                  "end": round(t + dur, 3), "file": path,
                                  "whisper": ep["voices"][role].get("whisper", False), "fx": line.get("fx")})
        timeline["scenes"].setdefault(str(line.get("scene", i)), round(t, 3))

        # Caption chunks: weight by the words each chunk covers.
        chunks = line.get("captions") or auto_captions(line["text"], ep.get("highlights", {}))
        w = [sum(word_weights(c[0])) for c in chunks]
        acc = t
        for c, wi in zip(chunks, w):
            d = dur * wi / sum(w)
            timeline["captions"].append({"text": c[0], "hl": c[1] if len(c) > 1 and isinstance(c[1], str) else "",
                                         "hls": c[1] if len(c) > 1 and isinstance(c[1], list) else None,
                                         "color": c[2] if len(c) > 2 else "yellow",
                                         "start": round(acc, 3), "end": round(acc + d, 3)})
            acc += d
        print(f"{t:6.2f}s  {dur:5.2f}s  [{role}] {line['text']}")
        t += dur + line.get("pause", 0.3)

    # extra spoken sounds for audio2's "sample" cue (whispered names under the narration); not in the captions or the script
    for name, sm in ep.get("samples", {}).items():
        os.makedirs(os.path.join(out, "samples"), exist_ok=True)
        if os.path.exists(os.path.join(out, "samples", name + ".wav")): continue   # already made, or made by hand
        sf.write(os.path.join(out, "samples", name + ".wav"), trim(tts.say(sm["text"], sm["voice"], ep["voices"][sm["voice"]], sm.get("tag", ""))), SR)

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
