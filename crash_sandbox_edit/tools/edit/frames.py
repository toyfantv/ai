"""Source frames at any time: exact frames, repeated-frame aware, optical-flow in-betweens for slow-mo."""
from __future__ import annotations

from collections import OrderedDict
from pathlib import Path

import cv2
import numpy as np

from .media import VideoReader, probe


class FrameSource:
    def __init__(self, path: Path, cache_frames: int = 48):
        self.path = Path(path)
        self.info = probe(self.path)
        self.w, self.h, self.fps = self.info["width"], self.info["height"], self.info["fps"]
        self.count = self.info["frames"]
        self.reader = VideoReader(self.path, self.w, self.h, self.fps)
        self.cache: OrderedDict[int, np.ndarray] = OrderedDict()
        self.cache_frames = cache_frames
        self._dup: dict[int, bool] = {}
        self._flow: OrderedDict[tuple, tuple] = OrderedDict()
        self.dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)

    @property
    def duration(self) -> float:
        return self.count / self.fps

    def frame(self, i: int) -> np.ndarray:
        i = max(0, min(self.count - 1, i))
        if i in self.cache:
            self.cache.move_to_end(i)
            return self.cache[i]
        f = self.reader.read(i)
        while f is None and i > 0:  # nb_frames can over-count by a frame or two
            self.count = i
            i -= 1
            f = self.reader.read(i)
        self.cache[i] = f
        if len(self.cache) > self.cache_frames:
            self.cache.popitem(last=False)
        return f

    def at(self, t: float, smooth: bool = False) -> np.ndarray:
        """Frame at source time t. Fractional positions blend or interpolate between frames."""
        f = t * self.fps
        i0 = int(np.floor(f + 1e-6))
        a = f - i0
        if not smooth:
            return self.frame(int(round(f)))
        if a < 0.02 and not self.is_dup(i0):
            return self.frame(i0)
        # Repeated frames (the game dipped below 60 fps) carry no motion: interpolate between the
        # distinct frames around them, by time, so slow-mo stays fluid through the dip.
        lo = i0
        while lo > 0 and self.is_dup(lo) and i0 - lo < 8:
            lo -= 1
        hi = i0 + 1
        while hi < self.count - 1 and self.is_dup(hi) and hi - i0 < 8:
            hi += 1
        k = (f - lo) / max(1, hi - lo)
        if k < 0.02:
            return self.frame(lo)
        if k > 0.98:
            return self.frame(hi)
        return self.interpolate(lo, hi, k)

    def is_dup(self, i: int) -> bool:
        """True when frame i repeats frame i-1."""
        if i <= 0:
            return False
        if i not in self._dup:
            a = cv2.resize(self.frame(i - 1), (160, 90), interpolation=cv2.INTER_AREA)
            b = cv2.resize(self.frame(i), (160, 90), interpolation=cv2.INTER_AREA)
            self._dup[i] = float(np.mean(cv2.absdiff(a, b))) < 0.6
        return self._dup[i]

    def interpolate(self, i: int, j: int, k: float) -> np.ndarray:
        f0, f1 = self.frame(i), self.frame(j)
        fw, bw = self._flows(i, j, f0, f1)
        h, w = f0.shape[:2]
        gx, gy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
        w0 = cv2.remap(f0, gx - k * fw[..., 0], gy - k * fw[..., 1], cv2.INTER_LINEAR,
                       borderMode=cv2.BORDER_REPLICATE)
        w1 = cv2.remap(f1, gx - (1 - k) * bw[..., 0], gy - (1 - k) * bw[..., 1], cv2.INTER_LINEAR,
                       borderMode=cv2.BORDER_REPLICATE)
        return cv2.addWeighted(w0, 1 - k, w1, k, 0)

    def _flows(self, i, j, f0, f1):
        key = (i, j)
        if key not in self._flow:
            h, w = f0.shape[:2]
            s = 0.5 if w > 1000 else 1.0
            g0 = cv2.cvtColor(cv2.resize(f0, None, fx=s, fy=s, interpolation=cv2.INTER_AREA), cv2.COLOR_RGB2GRAY)
            g1 = cv2.cvtColor(cv2.resize(f1, None, fx=s, fy=s, interpolation=cv2.INTER_AREA), cv2.COLOR_RGB2GRAY)
            fw = cv2.resize(self.dis.calc(g0, g1, None), (w, h)) / s
            bw = cv2.resize(self.dis.calc(g1, g0, None), (w, h)) / s
            self._flow[key] = (fw, bw)
            if len(self._flow) > 4:
                self._flow.popitem(last=False)
        return self._flow[key]

    def close(self):
        self.reader.close()
