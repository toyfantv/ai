"""Load a take's <video>.timeline.json sidecar (docs/TIMELINE_SPEC.md) and answer questions about it."""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

PALETTE = [(255, 92, 141), (90, 200, 255), (255, 196, 61), (124, 230, 120), (190, 140, 255), (255, 140, 66)]


@dataclass
class Timeline:
    scene: str = "take"
    title: str = ""
    fps: float = 60.0
    duration: float = 0.0
    characters: dict = field(default_factory=dict)
    vehicles: dict = field(default_factory=dict)
    cuts: list = field(default_factory=list)
    dialogue: list = field(default_factory=list)
    events: list = field(default_factory=list)
    sounds: list = field(default_factory=list)
    tracks: dict = field(default_factory=dict)
    raw: dict = field(default_factory=dict)

    # ---- loading ---------------------------------------------------------------------------
    @classmethod
    def load(cls, path: Path | None, duration: float = 0.0, fps: float = 60.0) -> "Timeline":
        if path is None or not Path(path).exists():
            return cls(duration=duration, fps=fps, cuts=[{"t": 0.0, "camera": "main", "shows": []}])
        d = json.loads(Path(path).read_text(encoding="utf-8"))
        tl = cls(
            scene=d.get("scene", "take"), title=d.get("title", ""),
            fps=float(d.get("fps", fps)), duration=float(d.get("duration") or duration),
            characters=d.get("characters", {}), vehicles=d.get("vehicles", {}),
            cuts=sorted(d.get("cuts", []), key=lambda c: c["t"]),
            dialogue=_chain_dialogue(d.get("dialogue", [])),
            events=sorted(d.get("events", []), key=lambda e: e["t"]),
            sounds=sorted(d.get("sounds", []), key=lambda s: s["t"]),
            tracks={k: sorted(v, key=lambda s: s["t"]) for k, v in d.get("tracks", {}).items()},
            raw=d,
        )
        if duration:
            tl.duration = min(tl.duration or duration, duration)
        if not tl.cuts or tl.cuts[0]["t"] > 0:
            tl.cuts.insert(0, {"t": 0.0, "camera": "start", "shows": []})
        return tl

    # ---- characters ------------------------------------------------------------------------
    def label(self, who: str) -> str:
        return self.characters.get(who, {}).get("label") or who.replace("_", " ").title()

    def color(self, who: str) -> tuple:
        c = self.characters.get(who, {}).get("color")
        if c:
            return tuple(c)
        names = list(self.characters) or [who]
        i = names.index(who) if who in names else sum(map(ord, who))
        return PALETTE[i % len(PALETTE)]

    def person(self, who: str) -> str | None:
        """A character id for `who`, resolving vehicles to their driver / rider."""
        if who in self.characters:
            return who
        v = self.vehicles.get(who, {})
        return v.get("driver") or v.get("rider")

    def main_characters(self) -> list:
        """Characters that speak or have a label, in order of first appearance."""
        talkers = {d["who"] for d in self.dialogue}
        keep = [w for w, c in self.characters.items()
                if w in talkers or (c.get("role") and c.get("role") != "background")]
        return sorted(keep, key=lambda w: self.first_seen(w) if self.first_seen(w) is not None else 1e9)

    # ---- cuts --------------------------------------------------------------------------------
    def cut_at(self, t: float) -> dict:
        cur = self.cuts[0]
        for c in self.cuts:
            if c["t"] <= t + 1e-6:
                cur = c
        return cur

    def cut_end(self, cut: dict) -> float:
        later = [c["t"] for c in self.cuts if c["t"] > cut["t"]]
        return min(later) if later else self.duration

    def cut_index(self, t: float) -> int:
        return self.cuts.index(self.cut_at(t))

    def first_seen(self, who: str) -> float | None:
        for c in self.cuts:
            if who in c.get("shows", []):
                return c["t"]
        for d in self.dialogue:
            if d["who"] == who:
                return d["t"]
        return None

    @staticmethod
    def is_close(cut: dict) -> bool:
        text = (cut.get("camera", "") + " " + cut.get("framing", "") + " " + cut.get("type", "")).lower()
        return "close" in text

    # ---- tracks ------------------------------------------------------------------------------
    def track(self, who: str, t: float, max_gap: float = 0.25) -> dict | None:
        """Interpolated screen sample for a character, or None when unknown / off screen."""
        s = self.tracks.get(who)
        if not s:
            return None
        lo, hi = 0, len(s) - 1
        if t <= s[0]["t"]:
            a = b = s[0]
        elif t >= s[-1]["t"]:
            a = b = s[-1]
        else:
            while hi - lo > 1:
                mid = (lo + hi) // 2
                if s[mid]["t"] <= t:
                    lo = mid
                else:
                    hi = mid
            a, b = s[lo], s[hi]
        if min(abs(a["t"] - t), abs(b["t"] - t)) > max_gap:
            return None
        if not (a.get("onScreen", True) and b.get("onScreen", True)):
            return None
        if a is b or b["t"] == a["t"]:
            return a
        k = (t - a["t"]) / (b["t"] - a["t"])
        out = {"t": t, "onScreen": True}
        for key in ("head", "box"):
            if key in a and key in b:
                out[key] = [x + (y - x) * k for x, y in zip(a[key], b[key])]
        return out

    def focus(self, t: float) -> tuple | None:
        """Normalised (x, y) of what the shot is about at t: the first tracked character it shows."""
        cut = self.cut_at(t)
        candidates = [self.person(w) or w for w in cut.get("shows", [])] + list(self.tracks)
        for who in candidates:
            tr = self.track(who, t)
            if tr and "head" in tr:
                return tuple(tr["head"])
        return None

    # ---- activity ------------------------------------------------------------------------------
    def activity_spans(self) -> list:
        """(start, end) spans where something happens: events, sounds, dialogue, cuts."""
        spans = [(e["t"], e["t"] + 0.3) for e in self.events]
        spans += [(s["t"], s["t"] + 0.3) for s in self.sounds]
        spans += [(d["t"], d["t"] + d.get("dur", 1.5)) for d in self.dialogue]
        spans += [(c["t"], c["t"] + 0.2) for c in self.cuts if c["t"] > 0]
        return sorted(spans)

    def climax(self) -> dict | None:
        for e in self.events:
            if e.get("climax"):
                return e
        impacts = [e for e in self.events if e["kind"] in ("impact", "explode", "crash")]
        if impacts:
            return max(impacts, key=lambda e: e.get("speed", 0))
        return self.events[-1] if self.events else None


def _chain_dialogue(lines: list) -> list:
    """Lines without `t` follow the previous one (the scene format's conversation rhythm)."""
    out, t = [], 0.0
    for d in lines:
        d = dict(d)
        if "t" not in d:
            d["t"] = t + 0.25
        d.setdefault("dur", max(1.0, 0.065 * len(d.get("text", ""))))
        t = d["t"] + d["dur"]
        out.append(d)
    return sorted(out, key=lambda d: d["t"])


def guess(video: Path, duration: float, fps: float, max_hits: int = 4) -> Timeline:
    """A rough timeline for a take recorded without a sidecar: camera cuts from scene changes and
    'hit' events from sharp peaks in the audio (the loudest is the climax). No characters or tracks."""
    import subprocess

    import numpy as np

    from .media import SAMPLE_RATE, ffmpeg, read_audio
    r = subprocess.run([ffmpeg(), "-hide_banner", "-i", str(video), "-vf", "select='gt(scene,0.3)',showinfo",
                        "-an", "-f", "null", "-"], capture_output=True, text=True)
    import re
    cuts = [{"t": 0.0, "camera": "start", "shows": []}]
    cuts += [{"t": round(float(t), 3), "camera": f"shot {i + 2}", "shows": []}
             for i, t in enumerate(re.findall(r"pts_time:([\d.]+)", r.stderr))]
    a = read_audio(video, duration).mean(1)
    hop = SAMPLE_RATE // 100                       # 10 ms
    n = len(a) // hop
    rms = np.sqrt((a[:n * hop].reshape(n, hop) ** 2).mean(1) + 1e-12)
    onset = np.maximum(0, rms[1:] - rms[:-1])          # rise over 10 ms
    thr = np.median(rms) * 1.8
    cand = sorted(((float(rms[i + 1]), (i + 1) / 100) for i in range(len(onset))
                   if rms[i + 1] > thr and onset[i] > rms[i + 1] * 0.25), reverse=True)
    hits = []
    for level, t in cand:
        if all(abs(t - h[1]) > 1.5 for h in hits):
            hits.append((level, t))
        if len(hits) >= max_hits:
            break
    events = [{"t": round(t, 3), "kind": "hit", "level": round(lv, 4)} for lv, t in sorted(hits, key=lambda h: h[1])]
    if events:
        max(events, key=lambda e: e["level"])["climax"] = True
    return Timeline(scene=Path(video).stem, duration=duration, fps=fps, cuts=cuts, events=events)
