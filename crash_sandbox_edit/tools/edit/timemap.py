"""The time map: which source moment each output frame shows (speed ramps, hit-stops, trims, hooks)."""
from __future__ import annotations

import bisect
from dataclasses import dataclass, field


@dataclass
class OutFrame:
    src: float            # source time (s)
    kind: str             # play | freeze | rewind
    speed: float = 1.0    # source seconds per output second (0 when frozen)
    part: str = "main"    # main | hook
    cut: bool = False     # a jump (trim, hook, rewind) lands on this frame
    freeze_id: int = -1


@dataclass
class Ramp:
    a: float
    b: float
    speed: float
    ease_in: float = 0.25
    ease_out: float = 0.25

    def at(self, t: float) -> float:
        if t < self.a or t >= self.b:
            return 1.0
        k = 1.0
        if self.ease_in > 0 and t < self.a + self.ease_in:
            k = _smooth((t - self.a) / self.ease_in)
        if self.ease_out > 0 and t > self.b - self.ease_out:
            k = min(k, _smooth((self.b - t) / self.ease_out))
        return 1.0 + (self.speed - 1.0) * k


@dataclass
class Freeze:
    t: float
    seconds: float
    tag: str = ""
    id: int = 0


@dataclass
class TimeMap:
    fps: float
    start: float
    end: float
    ramps: list = field(default_factory=list)
    freezes: list = field(default_factory=list)
    removed: list = field(default_factory=list)   # (a, b) source spans to drop
    hook: tuple | None = None                      # (a, b) played first, then a rewind
    rewind_frames: int = 14
    frames: list = field(default_factory=list)

    def add_freeze(self, t: float, seconds: float, tag: str = "") -> Freeze:
        t = round(t * self.fps) / self.fps  # on a source frame, so 1x playback stays frame-exact
        f = Freeze(t, seconds, tag, len(self.freezes))
        self.freezes.append(f)
        return f

    def speed(self, t: float) -> float:
        return min([r.at(t) for r in self.ramps] + [1.0])

    def build(self) -> list:
        fps = self.fps
        out: list[OutFrame] = []
        if self.hook:
            a, b = self.hook
            n = int(round((b - a) * fps))
            out += [OutFrame(a + i / fps, "play", 1.0, "hook", cut=(i == 0)) for i in range(n)]
            # tape-rewind scrub from the hook's end back to the start of the take
            for i in range(self.rewind_frames):
                k = (i + 1) / (self.rewind_frames + 1)
                src = b + (self.start - b) * _smooth(k)
                out.append(OutFrame(src, "rewind", -(b - self.start) / (self.rewind_frames / fps), "hook"))
        pending = sorted(self.freezes, key=lambda f: (f.t, f.id))
        pos = self.start * fps            # in source frames; exact integers at 1x
        end = self.end * fps
        jump = bool(self.hook)
        while pos < end - 1e-6:
            t = pos / fps
            dropped = next(((a, b) for a, b in self.removed if a <= t < b), None)
            if dropped:
                pos = dropped[1] * fps
                jump = True
                pending = [f for f in pending if f.t >= dropped[1] - 1e-9]
                continue
            while pending and pending[0].t * fps <= pos + 1e-6:
                fr = pending.pop(0)
                for i in range(max(1, int(round(fr.seconds * fps)))):
                    out.append(OutFrame(fr.t, "freeze", 0.0, "main", cut=jump, freeze_id=fr.id))
                    jump = False
            s = self.speed(t)
            out.append(OutFrame(t, "play", s, "main", cut=jump))
            jump = False
            nxt = pos + s
            # don't step over a freeze point: land on it so the frozen frame is exact
            if pending and pos < pending[0].t * fps < nxt:
                nxt = pending[0].t * fps
            pos = nxt
        self.frames = out
        self._main = [i for i, f in enumerate(out) if f.part == "main"]
        self._main_src = [out[i].src for i in self._main]
        return out

    # ---- lookups ---------------------------------------------------------------------------------
    def index(self, t: float, part: str = "main") -> int | None:
        """First output frame showing source time >= t (a freeze at t counts)."""
        if part == "hook":
            for i, f in enumerate(self.frames):
                if f.part == "hook" and f.kind == "play" and f.src >= t - 1e-6:
                    return i if f.src - t < 2 / self.fps else None
            return None
        k = bisect.bisect_left(self._main_src, t - 1e-6)
        if k >= len(self._main):
            return None
        return self._main[k]

    def freeze_index(self, freeze: Freeze) -> int | None:
        for i, f in enumerate(self.frames):
            if f.freeze_id == freeze.id:
                return i
        return None

    @property
    def duration(self) -> float:
        return len(self.frames) / self.fps


def _smooth(x: float) -> float:
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)
