"""Render a plan to finished MP4s, one per aspect."""
from __future__ import annotations

import time
from pathlib import Path

import cv2
import numpy as np

from . import audio, fx, panels
from .frames import FrameSource
from .media import loudnorm, read_audio, write_wav, VideoWriter
from .plan import Plan
from .text import ease_out, ease_out_back, paste, scaled, sprite

ASPECTS = {"wide": (1920, 1080), "4x5": (1080, 1350), "9x16": (1080, 1920), "1x1": (1080, 1080)}


def render(plan: Plan, video: Path, out_dir: Path, prefer_gpu: bool = True, iso_clips: list | None = None,
           thumbs: bool = True) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    name = plan.recipe["name"]
    src = FrameSource(video)
    tm = plan.timemap
    t0 = time.time()

    # audio first: the writer muxes it while frames stream in
    a_src = read_audio(video, src.duration)
    a = audio.build(a_src, tm, plan.cues, plan.recipe.get("audio", {}).get("freeze", "stutter"),
                    plan.recipe.get("audio", {}).get("slow_gain", 1.0))
    raw_wav, wav = out_dir / f".{name}_raw.wav", out_dir / f".{name}.wav"
    write_wav(raw_wav, a)
    loudnorm(raw_wav, wav, plan.recipe.get("audio", {}).get("loudness", -14.0))
    raw_wav.unlink()

    stills = FrameSource(video, cache_frames=8)
    crops = _panel_crops(plan, stills, iso_clips or [])
    stills.close()

    results = {}
    for aspect in plan.aspects:
        size = ASPECTS[aspect]
        path = out_dir / f"{name}_{aspect}.mp4"
        sheet = _render_aspect(plan, src, size, path, wav, crops, prefer_gpu, thumbs)
        results[aspect] = {"path": path, "thumbs": sheet}
    wav.unlink()
    src.close()
    print(f"  {name}: {len(tm.frames)} frames ({tm.duration:.1f} s) x {len(plan.aspects)} aspects "
          f"in {time.time() - t0:.0f} s")
    return results


# ---- framing -----------------------------------------------------------------------------------------
def _rects(plan: Plan, W: int, H: int, size: tuple) -> list:
    """Per-frame crop of the source for an aspect: full height, following the tracked subject,
    smoothed within a shot and snapped on cuts. Without tracks: the centre (record.py composes
    the action into the centre 4:5 slice)."""
    ow, oh = size
    ar = ow / oh
    if W / H > ar:
        cw, ch = H * ar, H
    else:
        cw, ch = W, W / ar
    tl = plan.timeline
    xs, last_cut, x = [], None, None
    for f in plan.timemap.frames:
        cut = tl.cut_index(f.src)
        focus = tl.focus(f.src) if tl.tracks else None
        target = (focus[0] * W) if focus else W / 2
        if x is None or cut != last_cut or f.cut:
            x = target
        else:
            x += (target - x) * 0.08
        last_cut = cut
        cx = min(max(x, cw / 2), W - cw / 2)
        xs.append((cx - cw / 2, (H - ch) / 2, cw, ch))
    return xs


def _to_out(pt, rect, W, H):
    """Source-normalised point -> position inside the crop rect (0-1)."""
    x, y, w, h = rect
    return ((pt[0] * W - x) / w, (pt[1] * H - y) / h)


# ---- panels -----------------------------------------------------------------------------------------
def _panel_crops(plan: Plan, stills: FrameSource, iso_clips: list) -> dict:
    """For each face-panel effect, a close-up image per character."""
    out = {}
    for e in plan.effects:
        if e.kind != "face_panels":
            continue
        imgs, names = [], []
        for who in e.params["who"]:
            img = _closeup(plan, stills, who, e.params["t"], iso_clips)
            if img is not None:
                imgs.append(img)
                names.append(who)
        out[id(e)] = (imgs, names)
    return out


def _closeup(plan: Plan, stills: FrameSource, who: str, t: float, iso_clips: list):
    tl = plan.timeline
    W, H = stills.w, stills.h
    # 1. an ISO pass of this character around t (sharp, rendered from the replay)
    for c in iso_clips:
        if c.get("who") == who and c["t0"] - 0.5 <= t <= c["t1"] + 1.5:
            iso = FrameSource(c["path"], cache_frames=2)
            img = iso.at(min(max(0.0, t - c["t0"]), iso.duration - 0.05)).copy()
            iso.close()
            return img
    # 2. tracked head box near t
    for dt in (0, -0.2, 0.2, -0.5, 0.5, -1.0, 1.0):
        tr = tl.track(who, t + dt)
        if tr and "box" in tr:
            x0, y0, x1, y1 = tr["box"]
            hx, hy = tr.get("head", ((x0 + x1) / 2, y0 + (y1 - y0) * 0.15))
            side = max((y1 - y0) * 0.75, 0.22)
            frame = stills.at(t + dt)
            return _crop(frame, hx, hy + side * 0.15, side * H / W, side)
    # 3. a shot that features them: close-ups first, then the nearest shot showing them first
    shots = [c for c in tl.cuts if c.get("shows") and tl.person(c["shows"][0]) == who]
    if not shots:
        shots = [c for c in tl.cuts if who in [tl.person(s) for s in c.get("shows", [])]]
    if not shots:
        return None
    # a close-up of them alone beats a shot they share; then fewer subjects; then nearest in time
    shots.sort(key=lambda c: (len(c.get("shows", [])) > 1 or not tl.is_close(c), len(c.get("shows", [])),
                              abs((c["t"] + tl.cut_end(c)) / 2 - t)))
    c = shots[0]
    a, b = c["t"], tl.cut_end(c)
    tt = min(max(t, a + 0.15), b - 0.15) if a + 0.3 < b else (a + b) / 2
    frame = stills.at(tt)
    zoom = 0.8 if tl.is_close(c) else 0.5
    return _crop(frame, 0.5, 0.45, zoom * 0.5625 * 1.4, zoom)


def _crop(frame, cx, cy, w, h):
    H, W = frame.shape[:2]
    w, h = min(1, w), min(1, h)
    x0 = int(min(max(cx - w / 2, 0), 1 - w) * W)
    y0 = int(min(max(cy - h / 2, 0), 1 - h) * H)
    return frame[y0:y0 + int(h * H), x0:x0 + int(w * W)].copy()


# ---- the frame loop ------------------------------------------------------------------------------------
def _render_aspect(plan: Plan, src: FrameSource, size, path, wav, crops, prefer_gpu, thumbs):
    tm, tl, recipe = plan.timemap, plan.timeline, plan.recipe
    ow, oh = size
    W, H = src.w, src.h
    rects = _rects(plan, W, H, size)
    grade = recipe.get("grade", {})
    smooth = recipe.get("smooth_slowmo", True)
    by_frame: dict[int, list] = {}
    for e in plan.effects:
        for i in range(e.start, min(len(tm.frames), e.start + e.frames)):
            by_frame.setdefault(i, []).append(e)
    loop = recipe.get("loop", {})
    loop_n = int(loop.get("crossfade", 0) * tm.fps)
    first = None
    mark_set = {i: lbl for i, lbl in plan.marks}
    sheet = []
    writer = VideoWriter(path, ow, oh, tm.fps, wav, prefer_gpu)
    for i, f in enumerate(tm.frames):
        active = by_frame.get(i, [])
        img = src.at(f.src, smooth=smooth and f.kind == "play" and f.speed < 0.98)
        rect = rects[i]
        zoom, focus, shake = 1.0, (0.5, 0.5), [0.0, 0.0, 0.0]
        for e in active:
            k = e.k(i)
            if e.kind == "punch_in":
                p = e.params
                if k < p["in"]:
                    z = ease_out((k + 1) / p["in"])
                elif k < p["in"] + p["hold"]:
                    z = 1.0
                else:
                    z = 1 - ease_out((k - p["in"] - p["hold"] + 1) / p["out"])
                zoom *= 1 + (p["zoom"] - 1) * z
                focus = _to_out(p["center"], rect, W, H)
            elif e.kind == "push_in":
                zoom *= 1 + (e.params["zoom"] - 1) * (k / e.frames)
                focus = _to_out(e.params["center"], rect, W, H)
            elif e.kind == "shake":
                d = fx.shake_offset(k, e.frames, e.params["amp"] * oh, e.params["seed"], e.params["rot"])
                shake = [a + b for a, b in zip(shake, d)]
        if f.kind == "rewind":
            shake[0] += (np.random.default_rng(i).uniform(-1, 1)) * oh * 0.004
        frame = fx.camera(img, rect, size, zoom, focus, tuple(shake))
        if grade:
            frame = fx.grade(frame, **grade)
        if f.kind == "rewind":
            frame = _rewind_look(frame, i)
        frame = _apply(frame, active, i, plan, rect, W, H, crops, f)
        if loop_n and i >= len(tm.frames) - loop_n and first is not None:
            k = (i - (len(tm.frames) - loop_n) + 1) / loop_n
            frame = fx.crossfade(frame, first, k)
        if i == 0:
            first = frame.copy()
        writer.write(frame)
        if thumbs and i in mark_set:
            sheet.append((i, mark_set[i], cv2.resize(frame, (ow // 4, oh // 4), interpolation=cv2.INTER_AREA)))
    writer.close()
    return sheet


def _rewind_look(frame, i):
    out = fx.grade(frame, contrast=1.15, saturation=0.6)
    h = out.shape[0]
    band = (i * 97) % h
    out[band:band + h // 40] = np.clip(out[band:band + h // 40].astype(np.int16) + 60, 0, 255).astype(np.uint8)
    tri = sprite("<<", "headline", h // 9, fill=(255, 255, 255), shadow=3)
    paste(out, tri, out.shape[1] * 0.1, h * 0.12)
    return out


def _apply(frame, active, i, plan, rect, W, H, crops, f):
    oh, ow = frame.shape[:2]
    m = min(ow, oh)
    for e in sorted(active, key=lambda e: ORDER.get(e.kind, 50)):
        k, p = e.k(i), e.params
        if e.kind == "speed_lines":
            o = p["opacity"] * min(1.0, (e.frames - k) / 6)
            frame = fx.speed_lines(frame, _to_out(p["center"], rect, W, H), seed=p["seed"] + k // 2,
                                   color=p["color"], opacity=o)
        elif e.kind == "radial_blur":
            frame = fx.radial_blur(frame, _to_out(p["center"], rect, W, H), p["strength"] * (1 - k / e.frames))
        elif e.kind == "impact_frames":
            style = p["sequence"][min(len(p["sequence"]) - 1, k // p["hold"])]
            if style != "none":
                frame = fx.impact_frame(frame, style, _to_out(p["center"], rect, W, H), seed=p["seed"] + k)
        elif e.kind == "flash":
            frame = fx.flash(frame, p["strength"] * (1 - k / e.frames), p["color"])
        elif e.kind == "intro_card":
            frame = panels.intro_card(frame, p["name"], p["color"], k, e.frames, p.get("subtitle", ""))
        elif e.kind == "face_panels":
            imgs, names = crops.get(id(e), ([], []))
            if imgs:
                g = plan.recipe.get("grade", {})
                imgs = [fx.grade(x, **g) if g else x for x in imgs]
                frame = panels.face_panels(frame, imgs, k, e.frames, [plan.timeline.label(n) for n in names],
                                           [plan.timeline.color(n) for n in names],
                                           base_panel=e.params.get("base_panel", len(imgs) < 2))
        elif e.kind == "onomatopoeia":
            frame = _onomatopoeia(frame, p, k, e.frames, rect, W, H)
        elif e.kind == "caption":
            frame = _caption(frame, p, k, e.frames, plan, f, rect, W, H)
        elif e.kind == "title_card":
            frame = panels.title_card(frame, p["title"], k, e.frames, p.get("subtitle", ""))
    return frame


ORDER = {"speed_lines": 10, "radial_blur": 5, "impact_frames": 20, "flash": 25, "intro_card": 30,
         "face_panels": 35, "onomatopoeia": 40, "caption": 45, "title_card": 50}


def _onomatopoeia(frame, p, k, n, rect, W, H):
    oh, ow = frame.shape[:2]
    m = min(ow, oh)
    rng = np.random.default_rng(p["seed"])
    angle = float(rng.uniform(-12, 12))
    spr = sprite(p["text"], "comic", int(m * p["size"]), fill=p["fill"], stroke=max(4, m // 140),
                 stroke_fill=(0, 0, 0), outer=max(6, m // 90), outer_fill=(255, 255, 255), angle=angle)
    s = 0.35 + 0.65 * ease_out_back((k + 1) / 6, 2.4)
    o = 1.0
    if k > n - 8:
        s *= 1 + 0.15 * (k - n + 8) / 8
        o = max(0.0, (n - k) / 8)
    c = _to_out(p["center"], rect, W, H)
    # sit beside the action, not on top of it, and stay inside the frame
    x = c[0] + (0.22 if c[0] < 0.5 else -0.22) * (oh / ow if oh > ow else 1)
    y = c[1] - 0.18
    sw, sh = spr.shape[1] * s / ow, spr.shape[0] * s / oh
    x = min(max(x, sw / 2 + 0.03), 1 - sw / 2 - 0.03)
    y = min(max(y, sh / 2 + 0.05), 1 - sh / 2 - 0.05)
    jitter = (rng.uniform(-1, 1, 2) * m * 0.004) if k < 10 else (0, 0)
    paste(frame, scaled(spr, s), x * ow + jitter[0], y * oh + jitter[1], o)
    return frame


def _caption(frame, p, k, n, plan, f, rect, W, H):
    oh, ow = frame.shape[:2]
    m = min(ow, oh)
    big = p.get("style") == "big"
    size = int(m * (0.075 if big else 0.05))
    who = p["who"]
    outer = tuple(plan.timeline.color(who)) if p.get("color_by_speaker") else (0, 0, 0)
    spr = sprite(p["text"], "headline" if big else "caption", size, fill=(255, 255, 255),
                 stroke=max(3, size // 12), stroke_fill=(0, 0, 0), outer=max(3, size // 10) if p.get("color_by_speaker") else 0,
                 outer_fill=outer, max_width=int(ow * 0.84))
    o = min(1.0, (k + 1) / 5, (n - k) / 5)
    s = 0.8 + 0.2 * ease_out_back((k + 1) / 6) if big else 1.0
    y = (0.74 if oh > ow else 0.85) * oh
    tr = plan.timeline.track(who, f.src) if p.get("near_speaker", True) else None
    x = ow / 2
    if tr and "head" in tr:
        hx, hy = _to_out(tr["head"], rect, W, H)
        if 0.05 < hx < 0.95 and 0.05 < hy < 0.95:
            x = min(max(hx * ow, spr.shape[1] / 2 + 20), ow - spr.shape[1] / 2 - 20)
            y = max(spr.shape[0], hy * oh - m * 0.12)
    paste(frame, scaled(spr, s), x, y - spr.shape[0] / 2, o)
    return frame
