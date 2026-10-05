"""Text sprites (Pillow) and RGBA compositing helpers."""
from __future__ import annotations

import functools
import math
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).parent
FONT_DIR = HERE / "fonts"

# Name -> candidates, first match wins. tools/edit/fonts/ comes first, so dropping a .ttf there
# with the same file name overrides the system fallback.
FONT_CANDIDATES = {
    "comic": ["Bangers-Regular.ttf", "C:/Windows/Fonts/impact.ttf",
              "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"],
    "headline": ["Anton-Regular.ttf", "C:/Windows/Fonts/impact.ttf",
                 "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"],
    "caption": ["C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/segoeuib.ttf",
                "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "Anton-Regular.ttf"],
    "title": ["C:/Windows/Fonts/segoeuil.ttf", "C:/Windows/Fonts/arial.ttf",
              "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
              "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"],
}


@functools.lru_cache(maxsize=None)
def font_path(name: str) -> str:
    cands = FONT_CANDIDATES.get(name, [name])
    for c in cands:
        for p in (FONT_DIR / c, Path(c)):
            if p.exists():
                return str(p)
    return ""


@functools.lru_cache(maxsize=128)
def _font(name: str, size: int):
    p = font_path(name)
    return ImageFont.truetype(p, size) if p else ImageFont.load_default()


@functools.lru_cache(maxsize=256)
def sprite(text: str, font: str = "comic", size: int = 96, fill=(255, 255, 255), stroke: int = 0,
           stroke_fill=(0, 0, 0), outer: int = 0, outer_fill=(0, 0, 0), angle: float = 0.0,
           shear: float = 0.0, max_width: int = 0, align: str = "center", spacing: int = 0,
           shadow: int = 0) -> np.ndarray:
    """Render text to a tight RGBA numpy sprite. `outer` adds a second, wider outline."""
    f = _font(font, size)
    lines = wrap(text, f, max_width) if max_width else text.split("\n")
    body = "\n".join(lines)
    pad = stroke + outer + shadow + size // 4
    probe = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    l, t, r, b = probe.multiline_textbbox((0, 0), body, font=f, stroke_width=stroke + outer,
                                          align=align, spacing=spacing or size // 6)
    w, h = int(math.ceil(r - l)) + 2 * pad, int(math.ceil(b - t)) + 2 * pad
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    org = (pad - int(l), pad - int(t))
    kw = dict(font=f, align=align, spacing=spacing or size // 6)
    if shadow:
        d.multiline_text((org[0] + shadow, org[1] + shadow), body, fill=(0, 0, 0, 150),
                         stroke_width=stroke, stroke_fill=(0, 0, 0, 150), **kw)
    if outer:
        d.multiline_text(org, body, fill=tuple(outer_fill) + (255,), stroke_width=stroke + outer,
                         stroke_fill=tuple(outer_fill) + (255,), **kw)
    d.multiline_text(org, body, fill=tuple(fill) + (255,), stroke_width=stroke,
                     stroke_fill=tuple(stroke_fill) + (255,), **kw)
    a = np.array(img)
    if shear:
        a = shear_x(a, shear)
    if angle:
        a = np.array(Image.fromarray(a).rotate(angle, resample=Image.BICUBIC, expand=True))
    return trim(a)


def wrap(text: str, font, max_width: int) -> list:
    out = []
    for para in text.split("\n"):
        line = ""
        for word in para.split():
            test = f"{line} {word}".strip()
            if line and font.getlength(test) > max_width:
                out.append(line)
                line = word
            else:
                line = test
        out.append(line)
    return out


def shear_x(rgba: np.ndarray, k: float) -> np.ndarray:
    h, w = rgba.shape[:2]
    extra = int(abs(k) * h)
    m = np.float32([[1, -k, extra if k > 0 else 0], [0, 1, 0]])
    return cv2.warpAffine(rgba, m, (w + extra, h), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))


def trim(rgba: np.ndarray) -> np.ndarray:
    ys, xs = np.nonzero(rgba[..., 3] > 0)
    if len(xs) == 0:
        return rgba[:1, :1]
    return np.ascontiguousarray(rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1])


def scaled(rgba: np.ndarray, s: float) -> np.ndarray:
    if abs(s - 1) < 1e-3:
        return rgba
    h, w = rgba.shape[:2]
    return cv2.resize(rgba, (max(1, int(w * s)), max(1, int(h * s))),
                      interpolation=cv2.INTER_AREA if s < 1 else cv2.INTER_LINEAR)


def paste(dst: np.ndarray, rgba: np.ndarray, cx: float, cy: float, opacity: float = 1.0):
    """Alpha-composite an RGBA sprite onto an RGB frame, centred at (cx, cy), clipped to the frame."""
    if opacity <= 0:
        return
    h, w = rgba.shape[:2]
    x0, y0 = int(round(cx - w / 2)), int(round(cy - h / 2))
    H, W = dst.shape[:2]
    sx0, sy0 = max(0, -x0), max(0, -y0)
    dx0, dy0 = max(0, x0), max(0, y0)
    dx1, dy1 = min(W, x0 + w), min(H, y0 + h)
    if dx1 <= dx0 or dy1 <= dy0:
        return
    src = rgba[sy0:sy0 + dy1 - dy0, sx0:sx0 + dx1 - dx0]
    a = src[..., 3:4].astype(np.float32) * (opacity / 255.0)
    region = dst[dy0:dy1, dx0:dx1]
    region[:] = (src[..., :3] * a + region * (1 - a)).astype(np.uint8)


def ease_out_back(x: float, s: float = 1.7) -> float:
    x = max(0.0, min(1.0, x)) - 1
    return x * x * ((s + 1) * x + s) + 1


def ease_out(x: float) -> float:
    x = max(0.0, min(1.0, x))
    return 1 - (1 - x) ** 3
