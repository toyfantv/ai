"""Contact sheets: thumbnails of the key moments of each cut, to compare recipes at a glance."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from .text import _font


def contact_sheet(rows: list, path: Path, fps: float, title: str = "", cols: int = 8):
    """rows: [(row label, [(out frame, label, thumb RGB)])]. One row per cut, wrapped at `cols`."""
    pad, label_h = 10, 26
    lines = []
    for name, thumbs in rows:
        thumbs = _pick(thumbs, cols)
        if thumbs:
            lines.append((name, thumbs))
    if not lines:
        return None
    tw = max(t[2].shape[1] for _, ts in lines for t in ts)
    th = max(t[2].shape[0] for _, ts in lines for t in ts)
    head = 44 if title else 0
    name_w = 150
    W = name_w + cols * (tw + pad) + pad
    Hh = head + len(lines) * (th + label_h + pad) + pad
    img = Image.new("RGB", (W, Hh), (24, 24, 28))
    d = ImageDraw.Draw(img)
    if title:
        d.text((pad, 10), title, fill=(240, 240, 240), font=_font("caption", 24))
    y = head + pad
    for name, thumbs in lines:
        d.text((pad, y + th // 2 - 12), name, fill=(255, 210, 80), font=_font("caption", 20))
        x = name_w
        for i, lbl, thumb in thumbs:
            img.paste(Image.fromarray(thumb), (x, y))
            d.text((x, y + thumb.shape[0] + 3), f"{i / fps:5.2f}s  {lbl}", fill=(200, 200, 200), font=_font("caption", 15))
            x += tw + pad
        y += th + label_h + pad
    img.save(path)
    return path


def _pick(thumbs: list, n: int) -> list:
    thumbs = sorted(thumbs, key=lambda t: t[0])
    if len(thumbs) <= n:
        return thumbs
    idx = np.linspace(0, len(thumbs) - 1, n).round().astype(int)
    return [thumbs[i] for i in sorted(set(idx))]
