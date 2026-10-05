"""Edit sound effects. A file in tools/edit/sfx/<name>.(wav|mp3|ogg|flac) wins; otherwise a
built-in synthesized version is used, so recipes always render."""
from __future__ import annotations

import functools
import subprocess
from pathlib import Path

import numpy as np

from .media import SAMPLE_RATE, ffmpeg

SFX_DIR = Path(__file__).parent / "sfx"
SR = SAMPLE_RATE


@functools.lru_cache(maxsize=None)
def load(name: str) -> np.ndarray | None:
    for ext in ("wav", "mp3", "ogg", "flac", "m4a"):
        p = SFX_DIR / f"{name}.{ext}"
        if p.exists():
            raw = subprocess.run([ffmpeg(), "-v", "error", "-i", str(p), "-f", "f32le", "-ac", "2",
                                  "-ar", str(SR), "-"], check=True, capture_output=True).stdout
            return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()
    synth = SYNTH.get(name)
    if synth is None:
        return None
    mono = synth(np.random.default_rng(sum(map(ord, name))))
    mono = mono / max(1e-6, np.abs(mono).max()) * 0.9
    return _stereo(mono)


def _stereo(m: np.ndarray, width: float = 0.0) -> np.ndarray:
    return np.stack([m, m], -1).astype(np.float32)


def _t(sec: float) -> np.ndarray:
    return np.arange(int(sec * SR)) / SR


def _env(t: np.ndarray, attack: float, decay: float) -> np.ndarray:
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-np.maximum(t - attack, 0) / decay)


def _sweep(f0: float, f1: float, t: np.ndarray, curve: float = 1.0) -> np.ndarray:
    """Phase of a sine sweeping f0 -> f1 over len(t)."""
    k = (t / t[-1]) ** curve
    f = f0 + (f1 - f0) * k
    return 2 * np.pi * np.cumsum(f) / SR


def _band_noise(rng, n: int, centers: np.ndarray, q: float = 1.5, hop: int = 1024) -> np.ndarray:
    """White noise through a moving band-pass (overlap-add FFT)."""
    noise = rng.standard_normal(n + 2 * hop)
    out = np.zeros_like(noise)
    win = np.hanning(2 * hop)
    freqs = np.fft.rfftfreq(2 * hop, 1 / SR)
    for i in range(0, n, hop):
        c = centers[min(i, n - 1)]
        band = np.exp(-0.5 * (np.log2(np.maximum(freqs, 1) / c) * q * 2) ** 2)
        seg = np.fft.irfft(np.fft.rfft(noise[i:i + 2 * hop] * win) * band)
        out[i:i + 2 * hop] += seg
    return out[:n]


def _lowpass_noise(rng, n: int, cutoff: float) -> np.ndarray:
    spec = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    spec *= 1 / (1 + (f / cutoff) ** 4)
    return np.fft.irfft(spec, n)


def boom(rng):
    t = _t(1.8)
    sub = np.sin(_sweep(70, 28, t, 0.5)) * _env(t, 0.004, 0.55)
    rumble = _lowpass_noise(rng, len(t), 220) * _env(t, 0.01, 0.5) * 4
    crack = _lowpass_noise(rng, len(t), 4000) * _env(t, 0.001, 0.06) * 2
    return np.tanh(1.6 * (sub + 0.6 * rumble / np.abs(rumble).max() + 0.5 * crack / np.abs(crack).max()))


def hit(rng):
    t = _t(0.4)
    thump = np.sin(_sweep(190, 60, t, 0.4)) * _env(t, 0.001, 0.08)
    snap = _lowpass_noise(rng, len(t), 6000) * _env(t, 0.0005, 0.025)
    return np.tanh(2 * (thump + 0.8 * snap / np.abs(snap).max()))


def thud(rng):
    t = _t(0.5)
    body = np.sin(_sweep(95, 42, t, 0.5)) * _env(t, 0.002, 0.12)
    dirt = _lowpass_noise(rng, len(t), 900) * _env(t, 0.002, 0.07)
    return body + 0.5 * dirt / np.abs(dirt).max()


def whoosh(rng):
    t = _t(0.55)
    k = t / t[-1]
    centers = 350 + 2600 * np.sin(np.pi * k) ** 2
    n = _band_noise(rng, len(t), centers, q=1.2)
    return n * np.sin(np.pi * k) ** 2


def zap(rng):
    t = _t(0.6)
    car = np.sin(_sweep(1800, 140, t, 0.6) + 3 * np.sin(2 * np.pi * 55 * t))
    buzz = np.sign(np.sin(_sweep(220, 60, t))) * 0.25
    return (car + buzz) * _env(t, 0.003, 0.22)


def shing(rng):
    t = _t(1.1)
    partials = [2637, 3951, 5274, 7040]
    s = sum(np.sin(2 * np.pi * f * t * (1 + 0.002 * np.sin(2 * np.pi * 7 * t))) / (i + 1)
            for i, f in enumerate(partials))
    scrape = _band_noise(rng, len(t), np.full(len(t), 6000.0), q=1.0) * _env(t, 0.01, 0.12)
    return s * _env(t, 0.004, 0.35) + 0.6 * scrape / np.abs(scrape).max()


def riser(rng):
    t = _t(1.2)
    k = t / t[-1]
    n = _band_noise(rng, len(t), 400 + 5000 * k ** 2, q=1.4)
    return n * k ** 2


def pop(rng):
    t = _t(0.18)
    return np.sin(_sweep(500, 1400, t, 0.3)) * _env(t, 0.001, 0.04)


SYNTH = {"boom": boom, "hit": hit, "thud": thud, "whoosh": whoosh, "zap": zap, "shing": shing,
         "riser": riser, "pop": pop}
