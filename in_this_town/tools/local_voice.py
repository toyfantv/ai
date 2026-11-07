#!/usr/bin/env python3
"""Episode narration with no paid voice: Silencio speaks each line, Seed-VC converts it onto clips of the series voices
(voice_samples/local_refs/), then the pace is set. Files land in build/<ep>/local_lines/line_NN.wav and the spec's lines get "audio":
tts.py then uses them as they are. Remove every "audio" key from the spec to go back to ElevenLabs when credit returns; shots follow L(i),
so timings carry over by themselves.

  python tools/local_voice.py episodes/specs/ep21.json [--only 3,7] [--src en_us_010]   # make lines; --only re-makes them
  python tools/local_voice.py episodes/specs/ep21.json --check                          # transcript of every line, WER per line and overall

A spec line's voice picks its entry in VOICES; "speak" is the text said, "text" what the captions show. "local" on a line overrides
source voice, tempo, pitch and rate for that line ({"src": "en_us_006", "tempo": 1.0}). A spec's "local_rate" (Episode 22: 1.22) makes Silencio
speak every narrator line that much faster before conversion: the source voice runs about 2.4 words a second, too slow for the 1.15 tempo cap.
"""
import json, os, pathlib, re, subprocess, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
FARM = pathlib.Path(r"D:\Claude\crash-sandbox\tools")
REFS = ROOT / "voice_samples" / "local_refs"
# role: Silencio source voice, Seed-VC reference (None: no conversion), words a second aimed for, pitch shift after (formants move too)
VOICES = {"narrator": {"src": "en_us_009", "ref": "ref_narrator.wav", "wps": 2.9},
          "system": {"src": "en_us_007", "ref": "ref_system.wav", "wps": 0},
          "boy": {"src": "en_us_006", "ref": None, "wps": 0, "pitch": 1.28}}
MAX_TEMPO = 1.15


def say_text(l):
    return l.get("speak", l["text"]).strip('"')


def dur(p):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)], capture_output=True, text=True).stdout)


def finish(raw, out, cfg, words):
    """pace and pitch"""
    d, af, t = dur(raw), [], cfg.get("tempo")
    if t is None:
        w = cfg.get("wps", 0)
        t = min(MAX_TEMPO, max(1.0, d / (words / w))) if w and words >= 3 else 1.0   # atempo t makes it d / t long
    p = cfg.get("pitch")
    if p:
        af.append(f"asetrate=24000*{p},aresample=24000,atempo={t / p:.4f}")
    elif abs(t - 1) > 0.005:
        af.append(f"atempo={t:.4f}")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw), "-ar", "24000", "-ac", "1"] + (["-af", ",".join(af)] if af else []) + [str(out)], check=True)
    return t


def make(spec, ep, only, src):
    sys.path.insert(0, str(FARM))
    import local_tts as T
    d = ROOT / "build" / ep / "local_lines"; d.mkdir(parents=True, exist_ok=True)
    jobs = []
    for i, l in enumerate(spec["lines"]):
        if only and i not in only: continue
        cfg = {**VOICES[l.get("voice", "narrator")], **({"rate": spec["local_rate"]} if spec.get("local_rate") and l.get("voice", "narrator") == "narrator" else {}), **l.get("local", {})}
        if src and l.get("voice", "narrator") == "narrator": cfg["src"] = src
        jobs.append((i, l, cfg))
    def cfg_of(c):
        """Silencio's voice file; "rate" > 1 has it speak faster natively (a cleaner way to pace than atempo past 1.15)"""
        f = T.voice_file(c["src"]); r = c.get("rate", 1.0)
        if abs(r - 1) < 1e-3: return str(f)
        v = json.loads(f.read_text(encoding="utf-8")); v["speed"] = v["speed"] * r
        out = d / f"cfg_{c['src']}_{r:.2f}.json"; out.write_text(json.dumps(v), encoding="utf-8"); return str(out)
    say = [{"voice": c["src"], "text": say_text(l), "out": str(d / f"src_{i:02d}.wav"), "cfg": cfg_of(c)} for i, l, c in jobs]
    T.run_worker(T.SILENCIO_PY, "_say", say)
    vc = [{"src": str(d / f"src_{i:02d}.wav"), "out": str(d / f"vc_{i:02d}.wav"), "ref": str(REFS / c["ref"])} for i, l, c in jobs if c.get("ref")]
    if vc: T.run_worker(T.SEEDVC_PY, "_polish", vc)
    for i, l, c in jobs:
        raw = d / (f"vc_{i:02d}.wav" if c.get("ref") else f"src_{i:02d}.wav"); out = d / f"line_{i:02d}.wav"
        t = finish(raw, out, c, len(say_text(l).split()))
        print(f"{i:2d} {dur(out):5.2f}s tempo {t:.2f}  {say_text(l)}", flush=True)
        l["audio"] = f"build/{ep}/local_lines/line_{i:02d}.wav"


NUM = {"99": "ninety nine", "100": "one hundred", "000": "zero zero zero", "0": "zero", "5": "five", "10": "ten", "20": "twenty"}


def norm(s):
    s = re.sub(r"0-0-0|0 0 0", "000", s.lower())
    s = re.sub(r"\d+", lambda m: NUM.get(m.group(0), m.group(0)), s)
    return re.sub(r"[^a-z0-9' ]", " ", s.replace("-", " ")).split()


def wer(a, b):
    n, m = len(a), len(b); D = list(range(m + 1))
    for i in range(1, n + 1):
        p, D[0] = D[0], i
        for j in range(1, m + 1):
            p, D[j] = D[j], min(D[j] + 1, D[j - 1] + 1, p + (a[i - 1] != b[j - 1]))
    return D[m]


def check(spec, ep):
    from faster_whisper import WhisperModel
    m = WhisperModel(os.environ.get("WHISPER", "small.en"), device="cpu", compute_type="int8")
    E = N = 0; bad = []
    for i, l in enumerate(spec["lines"]):
        p = ROOT / "build" / ep / "local_lines" / f"line_{i:02d}.wav"
        segs, _ = m.transcribe(str(p), language="en", beam_size=5)
        got = " ".join(s.text for s in segs).strip(); a, b = norm(say_text(l)), norm(got); e = wer(a, b); E += e; N += len(a)
        print(f"{i:2d} {e}/{len(a)} {dur(p):5.2f}s {'' if not e else 'HEARD: ' + got}", flush=True)
        if e: bad.append(i)
    print(f"WER {E / N:.3f} ({E}/{N}); lines to look at: {','.join(map(str, bad))}")


def main():
    a = sys.argv[1:]; p = pathlib.Path(a[0]); spec = json.load(open(p, encoding="utf8")); ep = f"ep{spec['number']:02d}"
    if "--check" in a: return check(spec, ep)
    only = {int(x) for x in a[a.index("--only") + 1].split(",")} if "--only" in a else None
    src = a[a.index("--src") + 1] if "--src" in a else None
    make(spec, ep, only, src)
    json.dump(spec, open(p, "w", encoding="utf8", newline="\n"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
