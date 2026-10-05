"""Rebuild the take's audio along the time map, then lay the edit's sound effects on top."""
from __future__ import annotations

import numpy as np

from . import sfx
from .media import SAMPLE_RATE as SR
from .timemap import TimeMap


def _runs(frames: list) -> list:
    """Split output frames into runs that play continuously (one source path, no jumps)."""
    runs, start = [], 0
    for i in range(1, len(frames) + 1):
        if i == len(frames):
            runs.append((start, i))
            break
        a, b = frames[i - 1], frames[i]
        brk = b.cut or a.kind != b.kind or a.freeze_id != b.freeze_id or a.part != b.part
        if brk:
            runs.append((start, i))
            start = i
    return runs


def _fade_edges(x: np.ndarray, ms: float = 4.0):
    n = min(len(x) // 2, int(SR * ms / 1000))
    if n > 0:
        ramp = np.linspace(0, 1, n, dtype=np.float32)[:, None]
        x[:n] *= ramp
        x[-n:] *= ramp[::-1]
    return x


def build(src: np.ndarray, tm: TimeMap, cues: list, freeze_mode: str = "stutter",
          slow_gain: float = 1.0, rewind_gain: float = 0.45) -> np.ndarray:
    fps = tm.fps
    frames = tm.frames
    spf = SR / fps
    total = int(round(len(frames) * spf))
    out = np.zeros((total, 2), np.float32)
    idx = np.arange(len(src))
    for i0, i1 in _runs(frames):
        a = int(round(i0 * spf))
        b = int(round(i1 * spf))
        n = b - a
        first = frames[i0]
        if first.kind == "freeze":
            seg = _freeze_audio(src, first.src, n, freeze_mode)
        else:
            times = np.array([f.src for f in frames[i0:i1]] + [frames[i1 - 1].src + frames[i1 - 1].speed / fps])
            u = np.arange(n) / spf
            pos = np.interp(u, np.arange(len(times)), times) * SR
            pos = np.clip(pos, 0, len(src) - 1)
            seg = np.stack([np.interp(pos, idx, src[:, c]) for c in (0, 1)], -1).astype(np.float32)
            if first.kind == "rewind":
                seg *= rewind_gain
            elif slow_gain != 1.0:
                speeds = np.interp(u, np.arange(i1 - i0), [f.speed for f in frames[i0:i1]])
                seg *= np.where(speeds < 0.95, slow_gain, 1.0)[:, None].astype(np.float32)
        out[a:b] += _fade_edges(seg)
    for t, name, gain in cues:
        s = sfx.load(name)
        if s is None:
            print(f"  (no sound '{name}': skipped)")
            continue
        p = int(round(t * SR))
        if p >= total:
            continue
        p0 = max(0, p)
        seg = s[p0 - p:p0 - p + total - p0]
        out[p0:p0 + len(seg)] += seg * gain
    peak = float(np.abs(out).max() or 1.0)
    if peak > 0.98:
        out *= 0.98 / peak
    return out


def _freeze_audio(src: np.ndarray, t: float, n: int, mode: str) -> np.ndarray:
    """Audio under a hit-stop: a decaying stutter of the contact sound, silence, or the moment ringing on."""
    p = int(t * SR)
    if mode == "silence":
        return np.zeros((n, 2), np.float32)
    if mode == "ring":
        seg = src[p:p + n].copy()
        seg = np.pad(seg, ((0, n - len(seg)), (0, 0)))
        seg *= np.linspace(1, 0, n, dtype=np.float32)[:, None] ** 2
        return seg
    grain_n = int(0.055 * SR)
    grain = _fade_edges(src[p:p + grain_n].copy(), 3)
    if len(grain) < 8:
        return np.zeros((n, 2), np.float32)
    out = np.zeros((n, 2), np.float32)
    k, pos = 0, 0
    while pos < n:
        g = grain[:n - pos] * (0.8 ** k)
        out[pos:pos + len(g)] += g
        pos += len(grain)
        k += 1
    return out
