"""Manga face panels, character intro cards and title cards."""
from __future__ import annotations

import cv2
import numpy as np

from . import fx
from .text import ease_out, ease_out_back, paste, scaled, sprite


def cover(img: np.ndarray, w: int, h: int, zoom: float = 1.0, focus=(0.5, 0.45)) -> np.ndarray:
    """Scale-and-crop img to exactly w x h (like CSS object-fit: cover)."""
    ih, iw = img.shape[:2]
    s = max(w / iw, h / ih) * zoom
    cw, ch = w / s, h / s
    cx = min(max(focus[0] * iw, cw / 2), iw - cw / 2)
    cy = min(max(focus[1] * ih, ch / 2), ih - ch / 2)
    m = np.float32([[s, 0, w / 2 - s * cx], [0, s, h / 2 - s * cy]])
    return cv2.warpAffine(img, m, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)


def _layout(n: int, w: int, h: int, vertical: bool) -> list:
    """n slanted panels covering the frame, as polygons in output pixels."""
    slant = 0.06
    polys = []
    for i in range(n):
        a, b = i / n, (i + 1) / n
        if vertical:   # stacked rows with slanted borders
            ya0, ya1 = a + (slant if i else 0), a - (slant if i else 0)
            yb0, yb1 = b + (slant if i < n - 1 else 0), b - (slant if i < n - 1 else 0)
            polys.append(np.float32([[0, ya0 * h], [w, ya1 * h], [w, yb1 * h], [0, yb0 * h]]))
        else:          # side-by-side columns with slanted borders
            xa0, xa1 = a + (slant if i else 0), a - (slant if i else 0)
            xb0, xb1 = b + (slant if i < n - 1 else 0), b - (slant if i < n - 1 else 0)
            polys.append(np.float32([[xa0 * w, 0], [xb0 * w, 0], [xb1 * w, h], [xa1 * w, h]]))
    return polys


def face_panels(base: np.ndarray, crops: list, k: int, frames: int, labels: list | None = None,
                colors: list | None = None, stagger: int = 3, slide: int = 6, gutter: int = 0) -> np.ndarray:
    """Composite frame k of a panel sequence. Panel 0 is the base frame; the rest are close-ups
    that slide in one after another. White gutters, black outlines, a name tag per close-up."""
    h, w = base.shape[:2]
    vertical = h > w
    n = len(crops) + 1
    gutter = gutter or max(8, int(min(w, h) * 0.014))
    out = base.copy()
    polys = _layout(n, w, h, vertical)
    shown = []
    for i, poly in enumerate(polys):
        t0 = i * stagger
        if k < t0:
            continue
        p = ease_out((k - t0 + 1) / slide)
        x0, y0 = poly.min(0)
        x1, y1 = poly.max(0)
        pw, ph = int(x1 - x0) + 2, int(y1 - y0) + 2
        drift = 1.0 + 0.05 * (k / max(1, frames))   # slow push-in inside the panel
        src = base if i == 0 else crops[i - 1]
        content = cover(src, pw, ph, zoom=drift * (1.12 if i == 0 else 1.0))
        # slide in along the panel's long axis, alternating directions
        off = (1 - p) * (h if vertical is False else w) * (1 if i % 2 else -1)
        ox, oy = (0, off) if not vertical else (off, 0)
        shifted = poly + np.float32([ox, oy])
        mask = np.zeros((h, w), np.uint8)
        cv2.fillPoly(mask, [np.int32(shifted)], 255, lineType=cv2.LINE_AA)
        canvas = np.zeros_like(base)
        X0, Y0 = int(x0 + ox), int(y0 + oy)
        _blit(canvas, content, X0, Y0)
        a = (mask.astype(np.float32) / 255)[..., None]
        out = (canvas * a + out * (1 - a)).astype(np.uint8)
        shown.append(shifted)
    for i, poly in enumerate(shown):
        cv2.polylines(out, [np.int32(poly)], True, (255, 255, 255), gutter, lineType=cv2.LINE_AA)
        cv2.polylines(out, [np.int32(poly)], True, (0, 0, 0), max(2, gutter // 3), lineType=cv2.LINE_AA)
    # frame border so the outer panels read as panels too
    cv2.rectangle(out, (0, 0), (w - 1, h - 1), (255, 255, 255), gutter)
    for i, poly in enumerate(shown):
        if i == 0 or not labels or not labels[i - 1]:
            continue
        col = tuple(colors[i - 1]) if colors else (255, 255, 255)
        tag = sprite(labels[i - 1].upper(), "comic", int(min(w, h) * 0.05), fill=(255, 255, 255),
                     stroke=3, stroke_fill=(0, 0, 0), outer=5, outer_fill=col)
        cx, cy = poly.mean(0)
        if vertical:
            cy = poly[:, 1].max() - tag.shape[0] * 0.9
        else:
            cy = h - tag.shape[0] * 0.9
        paste(out, tag, cx, cy)
    return out


def _blit(dst: np.ndarray, img: np.ndarray, x: int, y: int):
    H, W = dst.shape[:2]
    h, w = img.shape[:2]
    sx, sy = max(0, -x), max(0, -y)
    dx0, dy0 = max(0, x), max(0, y)
    dx1, dy1 = min(W, x + w), min(H, y + h)
    if dx1 > dx0 and dy1 > dy0:
        dst[dy0:dy1, dx0:dx1] = img[sy:sy + dy1 - dy0, sx:sx + dx1 - dx0]


def intro_card(frame: np.ndarray, name: str, color, k: int, frames: int, subtitle: str = "") -> np.ndarray:
    """Freeze-frame character intro: the frame desaturates, a coloured band slides in with the name."""
    h, w = frame.shape[:2]
    p = ease_out((k + 1) / 7)
    out = fx.desaturate(frame, 0.55 * p, darken=0.15 * p)
    vertical = h > w
    band_h = int(h * (0.13 if not vertical else 0.09))
    cy = int(h * (0.72 if not vertical else 0.68))
    slope = band_h * 0.6
    x_end = w * (1.2 * p) - w * 0.1
    poly = np.int32([[-10, cy - band_h / 2 + slope / 2], [x_end, cy - band_h / 2 - slope / 2],
                     [x_end - slope, cy + band_h / 2 - slope / 2], [-10, cy + band_h / 2 + slope / 2]])
    stripe = poly + np.int32([0, band_h * 0.18])
    cv2.fillPoly(out, [stripe], (255, 255, 255), lineType=cv2.LINE_AA)
    cv2.fillPoly(out, [poly], tuple(int(c) for c in color), lineType=cv2.LINE_AA)
    size = int(band_h * 0.95)
    tag = sprite(name.upper(), "comic", size, fill=(255, 255, 255), stroke=4, stroke_fill=(0, 0, 0),
                 shear=0.18, angle=4)
    tx = w * 0.06 + tag.shape[1] / 2 + (1 - ease_out_back((k - 2) / 7)) * -w * 0.4
    paste(out, tag, tx, cy - band_h * 0.05)
    if subtitle:
        sub = sprite(subtitle, "caption", int(band_h * 0.28), fill=(255, 255, 255), stroke=3,
                     stroke_fill=(0, 0, 0))
        paste(out, sub, w * 0.07 + sub.shape[1] / 2, cy + band_h * 0.75, opacity=min(1, max(0, (k - 5) / 5)))
    return out


def title_card(frame: np.ndarray, title: str, k: int, frames: int, subtitle: str = "") -> np.ndarray:
    """Clean centred title over the opening shot, fading in and out."""
    h, w = frame.shape[:2]
    fade_n = min(18, frames // 3)
    o = min(1.0, (k + 1) / fade_n, (frames - k) / fade_n)
    if o <= 0:
        return frame
    out = fx.fade(frame, 0.28 * o)
    size = int(min(w, h) * 0.085)
    t = sprite(title.upper(), "headline", size, fill=(255, 255, 255), shadow=max(2, size // 22),
               spacing=0)
    t = scaled(t, 1.0 + 0.03 * k / frames)
    paste(out, t, w / 2, h * 0.46, opacity=o)
    if subtitle:
        s = sprite(subtitle, "title", int(size * 0.32), fill=(235, 235, 235), shadow=2)
        paste(out, s, w / 2, h * 0.46 + t.shape[0] * 0.75, opacity=o)
    return out
