"""Make a synthetic stand-in take that follows a timeline's timing (cuts, characters, events,
sounds), plus a copy of the timeline with `tracks` for where the stand-in characters are drawn.
For developing the editor without a real recording:

    python -m edit.testclip samples/haru_bike_20261004_174731.timeline.json out/standin.mp4
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import cv2
import numpy as np

from .media import SAMPLE_RATE, VideoWriter, write_wav
from .text import paste, sprite
from .timeline import Timeline

W, H, FPS = 1920, 1080, 60
SKIES = [(120, 190, 255), (255, 170, 120), (140, 220, 200), (200, 160, 255), (255, 210, 120), (150, 200, 255)]


def _pos(who: str, cut_i: int, t: float, tl: Timeline, shows: list) -> tuple:
    """Normalised head position of a stand-in character (moves a little within each shot)."""
    k = shows.index(who) if who in shows else 0
    n = max(1, len(shows))
    base_x = 0.5 + (k - (n - 1) / 2) * min(0.22, 0.6 / n)
    x = base_x + 0.04 * math.sin(t * 1.3 + k)
    y = 0.42 + 0.03 * math.sin(t * 2.1 + k * 2)
    for e in tl.events:
        if e["kind"] in ("knock",) and tl.person(e.get("who")) == who and t > e["t"]:
            dt = t - e["t"]
            y = 0.42 - 0.9 * dt + 0.6 * dt * dt
            x += 0.15 * dt
    return x, y


def make(timeline_path: Path, out: Path):
    tl = Timeline.load(timeline_path)
    dur = tl.duration or 12
    n = int(dur * FPS)
    tracks = {w: [] for w in tl.characters}
    wav = out.with_suffix(".wav")
    _audio(tl, dur, wav)
    writer = VideoWriter(out, W, H, FPS, wav, prefer_gpu=False)
    for i in range(n):
        t = i / FPS
        cut = tl.cut_at(t)
        ci = tl.cuts.index(cut)
        shows = [tl.person(s) or s for s in cut.get("shows", [])]
        close = tl.is_close(cut)
        sky = SKIES[ci % len(SKIES)]
        img = np.empty((H, W, 3), np.uint8)
        grad = np.linspace(0, 1, H)[:, None, None]
        img[:] = (np.array(sky) * (1 - 0.35 * grad)).astype(np.uint8)
        horizon = int(H * 0.62)
        img[horizon:] = (70, 74, 82)
        # buildings and lane marks scroll so there is real motion for the flow interpolation
        off = int(t * 240 * (1 if ci % 2 else -1))
        for b in range(-1, 9):
            x = (b * 260 + off) % (W + 260) - 260
            hgt = 160 + (b * 73 % 5) * 50
            cv2.rectangle(img, (x, horizon - hgt), (x + 200, horizon), (200 - b * 9, 170, 150 + b * 7), -1)
            cv2.rectangle(img, (x + 20, horizon - hgt + 20), (x + 60, horizon - hgt + 60), (250, 250, 220), -1)
        for b in range(12):
            x = (b * 200 + off * 2) % (W + 200) - 200
            cv2.rectangle(img, (x, int(H * 0.8)), (x + 110, int(H * 0.8) + 12), (240, 240, 240), -1)
        scale = 2.2 if close else 1.0
        for who in tl.characters:
            if who not in shows:
                continue
            x, y = _pos(who, ci, t, tl, shows)
            col = tl.color(who)
            hs = int(70 * scale)
            cx, cy = int(x * W), int(y * H)
            cv2.rectangle(img, (cx - hs, cy + hs), (cx + hs, cy + int(hs * 3.2)), col, -1)
            cv2.rectangle(img, (cx - hs, cy - hs), (cx + hs, cy + hs), (255, 220, 180), -1)
            cv2.rectangle(img, (cx - hs, cy - hs), (cx + hs, cy - hs // 3), col, -1)
            cv2.circle(img, (cx - hs // 3, cy + hs // 6), max(3, hs // 9), (20, 20, 20), -1)
            cv2.circle(img, (cx + hs // 3, cy + hs // 6), max(3, hs // 9), (20, 20, 20), -1)
            cv2.ellipse(img, (cx, cy + hs // 2), (hs // 3, hs // 6), 0, 0, 180, (120, 30, 30), 3)
            paste(img, sprite(tl.label(who), "caption", int(24 * scale), fill=(255, 255, 255), stroke=3), cx, cy - hs - 30)
            bx = [(cx - hs) / W, (cy - hs) / H, (cx + hs) / W, (cy + hs * 3.2) / H]
            if i % 2 == 0:
                tracks[who].append({"t": round(t, 3), "head": [round(x, 4), round(y, 4)],
                                    "box": [round(v, 4) for v in bx], "onScreen": 0 < y < 1})
        if "car" in cut.get("shows", []) or "bus" in cut.get("shows", []):
            cx = int(W * (0.3 + 0.1 * math.sin(t)))
            cv2.rectangle(img, (cx, horizon - 40), (cx + 380, horizon + 110), (230, 60, 40), -1)
            cv2.circle(img, (cx + 80, horizon + 110), 45, (20, 20, 20), -1)
            cv2.circle(img, (cx + 300, horizon + 110), 45, (20, 20, 20), -1)
        for e in tl.events:
            if 0 <= t - e["t"] < 0.15:
                img = cv2.addWeighted(img, 0.6, np.full_like(img, 255), 0.4, 0)
        paste(img, sprite(f"{cut.get('camera', '')}  t={t:5.2f}", "caption", 26, fill=(255, 255, 255), stroke=3),
              260, 40)
        # mimic the game's frame-rate dip after the climax: repeated frames
        c = tl.climax()
        if c and 0 < t - c["t"] < 1.5 and i % 3:
            img = last
        writer.write(img)
        last = img
    writer.close()
    wav.unlink()
    d = json.loads(Path(timeline_path).read_text(encoding="utf-8"))
    d["video"] = {"wide": out.name}
    d["tracks"] = tracks
    d["_note"] = "Synthetic stand-in made by edit/testclip.py; tracks are where the stand-ins are drawn."
    out.with_suffix(".timeline.json").write_text(json.dumps(d, indent=1), encoding="utf-8")
    return out


def _audio(tl: Timeline, dur: float, path: Path):
    sr = SAMPLE_RATE
    t = np.arange(int(dur * sr)) / sr
    a = 0.05 * np.sin(2 * np.pi * 90 * t) * (1 + 0.3 * np.sin(2 * np.pi * 0.5 * t))  # engine hum
    for s in tl.sounds:
        p = int(s["t"] * sr)
        n = int(0.35 * sr)
        tt = np.arange(n) / sr
        f = 300 + (sum(map(ord, s["cat"])) % 7) * 120
        burst = 0.5 * np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.08)
        a[p:p + n] += burst[:len(a[p:p + n])]
    write_wav(path, np.stack([a, a], -1).astype(np.float32))


if __name__ == "__main__":
    make(Path(sys.argv[1]), Path(sys.argv[2]))
