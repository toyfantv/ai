"""Per-frame image effects (numpy / OpenCV). Frames are RGB uint8, HxWx3."""
from __future__ import annotations

import functools
import math

import cv2
import numpy as np


# ---- camera -----------------------------------------------------------------------------------
def camera(src: np.ndarray, rect: tuple, out_size: tuple, zoom: float = 1.0, focus=(0.5, 0.5),
           shake=(0.0, 0.0, 0.0)) -> np.ndarray:
    """One affine warp: crop `rect` (x, y, w, h in source px), zoom about `focus` (0-1 within the
    rect), then shake (dx, dy in output px, degrees). Never shows a border: the view is clamped
    inside the source and over-zoomed just enough to hide shake."""
    H, W = src.shape[:2]
    ow, oh = out_size
    x, y, w, h = rect
    dx, dy, rot = shake
    margin = 1.0 + 2.2 * max(abs(dx) / ow, abs(dy) / oh) + abs(math.radians(rot)) * 1.2
    z = max(1.0, zoom) * margin
    cw, ch = w / z, h / z
    fx, fy = x + focus[0] * w, y + focus[1] * h
    # keep the focus point at the same place on screen while zooming
    cx = fx - (fx - (x + w / 2)) / z
    cy = fy - (fy - (y + h / 2)) / z
    cx = min(max(cx, cw / 2), W - cw / 2)
    cy = min(max(cy, ch / 2), H - ch / 2)
    s = ow / cw
    m = np.float64([[s, 0, ow / 2 - s * cx], [0, s, oh / 2 - s * cy]])
    if dx or dy or rot:
        r = cv2.getRotationMatrix2D((ow / 2, oh / 2), rot, 1.0)
        m = r @ np.vstack([m, [0, 0, 1]])
        m[:, 2] += (dx, dy)
    interp = cv2.INTER_AREA if s < 0.75 else cv2.INTER_LINEAR
    return cv2.warpAffine(src, m, (ow, oh), flags=interp, borderMode=cv2.BORDER_REFLECT)


def shake_offset(k: int, frames: int, amp: float, seed: int = 0, rot: float = 0.0) -> tuple:
    """Decaying random shake for frame k of a `frames`-long window."""
    if k < 0 or k >= frames:
        return (0.0, 0.0, 0.0)
    rng = np.random.default_rng(seed * 1000 + k)
    d = (1 - k / frames) ** 1.6
    return (amp * d * rng.uniform(-1, 1), amp * d * rng.uniform(-1, 1), rot * d * rng.uniform(-1, 1))


# ---- colour -----------------------------------------------------------------------------------------
@functools.lru_cache(maxsize=16)
def _grade_lut(contrast: float, warmth: float, lift: float, gamma: float) -> np.ndarray:
    x = np.arange(256, dtype=np.float32) / 255
    x = np.clip(x * (1 - lift) + lift, 0, 1) ** (1 / gamma)
    s = x + (contrast - 1) * (x - x * x) * (2 * x - 1) * 2  # gentle S-curve about mid-grey
    s = np.clip(s, 0, 1)
    lut = np.stack([np.clip(s * (1 + warmth), 0, 1), s, np.clip(s * (1 - warmth), 0, 1)], -1)
    return (lut * 255).astype(np.uint8).reshape(256, 1, 3)


def grade(img: np.ndarray, contrast=1.0, saturation=1.0, warmth=0.0, lift=0.0, gamma=1.0) -> np.ndarray:
    if contrast != 1 or warmth or lift or gamma != 1:
        img = cv2.LUT(img, _grade_lut(contrast, warmth, lift, gamma))
    if saturation != 1:
        g = cv2.cvtColor(cv2.cvtColor(img, cv2.COLOR_RGB2GRAY), cv2.COLOR_GRAY2RGB)
        img = cv2.addWeighted(img, saturation, g, 1 - saturation, 0)
    return img


def flash(img: np.ndarray, amount: float, color=(255, 255, 255)) -> np.ndarray:
    if amount <= 0:
        return img
    c = np.empty_like(img)
    c[:] = color
    return cv2.addWeighted(img, 1 - amount, c, amount, 0)


def desaturate(img: np.ndarray, amount: float, darken: float = 0.0) -> np.ndarray:
    out = grade(img, saturation=1 - amount)
    return cv2.convertScaleAbs(out, alpha=1 - darken) if darken else out


# ---- impact frames ------------------------------------------------------------------------------------
def ink(img: np.ndarray, invert: bool = False, palette=((0, 0, 0), (255, 255, 255))) -> np.ndarray:
    """High-contrast two-tone manga frame: shapes from luminance, outlines from edges."""
    g = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    small = cv2.resize(g, None, fx=0.5, fy=0.5, interpolation=cv2.INTER_AREA)
    small = cv2.GaussianBlur(small, (0, 0), 1.6)
    thr = float(np.percentile(small, 52))
    mask = (small > thr).astype(np.uint8) * 255
    edges = cv2.Canny(small, 40, 110)
    edges = cv2.dilate(edges, np.ones((2, 2), np.uint8))
    mask[edges > 0] = 0
    mask = cv2.resize(mask, (img.shape[1], img.shape[0]), interpolation=cv2.INTER_LINEAR)
    mask = (mask > 127)
    if invert:
        mask = ~mask
    dark, light = np.array(palette[0], np.uint8), np.array(palette[1], np.uint8)
    out = np.empty_like(img)
    out[mask] = light
    out[~mask] = dark
    return out


IMPACT_STYLES = {
    # name: (invert, palette, line colour)
    "ink": (False, ((0, 0, 0), (255, 255, 255)), (0, 0, 0)),
    "invert": (True, ((0, 0, 0), (255, 255, 255)), (255, 255, 255)),
    "red": (False, ((20, 0, 0), (235, 30, 45)), (20, 0, 0)),
    "gold": (True, ((25, 10, 0), (255, 205, 60)), (255, 240, 200)),
    "blue": (False, ((5, 10, 40), (90, 200, 255)), (5, 10, 40)),
}


def impact_frame(img: np.ndarray, style: str, center=(0.5, 0.5), seed: int = 0) -> np.ndarray:
    invert, palette, line = IMPACT_STYLES.get(style, IMPACT_STYLES["ink"])
    out = ink(img, invert, palette)
    return speed_lines(out, center, seed=seed, color=line, opacity=1.0, density=150, inner=0.2)


# ---- speed lines (concentration lines) -------------------------------------------------------------
@functools.lru_cache(maxsize=24)
def _lines_mask(w: int, h: int, cx: int, cy: int, seed: int, density: int, inner: float) -> np.ndarray:
    rng = np.random.default_rng(seed)
    mask = np.zeros((h, w), np.uint8)
    R = math.hypot(w, h)
    r_min = inner * min(w, h)
    for _ in range(density):
        a = rng.uniform(0, 2 * math.pi)
        width = rng.uniform(0.004, 0.02)          # angular width at the outer edge
        r0 = r_min * rng.uniform(1.0, 1.9)         # where the line tapers to a point
        tip = (cx + r0 * math.cos(a), cy + r0 * math.sin(a))
        p1 = (cx + R * math.cos(a - width), cy + R * math.sin(a - width))
        p2 = (cx + R * math.cos(a + width), cy + R * math.sin(a + width))
        cv2.fillPoly(mask, [np.int32([tip, p1, p2])], 255, lineType=cv2.LINE_AA)
    return mask


def speed_lines(img: np.ndarray, center=(0.5, 0.5), seed: int = 0, color=(255, 255, 255),
                opacity: float = 0.8, density: int = 110, inner: float = 0.28) -> np.ndarray:
    h, w = img.shape[:2]
    # lines are drawn at half size and scaled up: cheap and soft-edged
    sw, sh = w // 2, h // 2
    cx, cy = int(center[0] * sw), int(center[1] * sh)
    m = _lines_mask(sw, sh, cx // 8 * 8, cy // 8 * 8, seed, density, inner)
    m = cv2.resize(m, (w, h), interpolation=cv2.INTER_LINEAR)
    a = (m.astype(np.float32) * (opacity / 255.0))[..., None]
    return (img * (1 - a) + np.array(color, np.float32) * a).astype(np.uint8)


def radial_blur(img: np.ndarray, center=(0.5, 0.5), strength: float = 0.06, steps: int = 6) -> np.ndarray:
    """Zoom blur that keeps the centre sharp."""
    h, w = img.shape[:2]
    acc = img.astype(np.float32)
    cx, cy = center[0] * w, center[1] * h
    for i in range(1, steps + 1):
        s = 1 + strength * i / steps
        m = np.float32([[s, 0, cx - s * cx], [0, s, cy - s * cy]])
        acc += cv2.warpAffine(img, m, (w, h), borderMode=cv2.BORDER_REFLECT)
    blurred = acc / (steps + 1)
    yy, xx = np.ogrid[:h, :w]
    r = np.sqrt(((xx - cx) / w) ** 2 + ((yy - cy) / h) ** 2)
    k = np.clip((r - 0.08) / 0.35, 0, 1)[..., None]
    return (img * (1 - k) + blurred * k).astype(np.uint8)


def fade(img: np.ndarray, amount: float, color=(0, 0, 0)) -> np.ndarray:
    return flash(img, amount, color)


def crossfade(a: np.ndarray, b: np.ndarray, k: float) -> np.ndarray:
    return cv2.addWeighted(a, 1 - k, b, k, 0)
