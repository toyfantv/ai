#!/usr/bin/env python3
"""Extract moving characters from Chiikawa episodes as transparent animated clips.

Per episode:
  1. Scan the episode at --clip-fps, split it into shots and keep the most active
     window (up to --clip-len frames) of the --max-clips shots with the most motion.
  2. Cut every character out of every frame of a window with the same matting model,
     outline snapping and hole filling as extract_sprites.py. Visible pixels are the
     untouched frame pixels with on/off alpha (checked per frame before saving).
  3. Follow each character through the window (overlapping boxes from frame to frame).
     Each character that moves becomes a clip; 2+ characters also give a group clip.
  4. Save each clip as
       <ep>/<name>.zip   sprite sheet for sprite-short: sprite.png (one row of frames)
                         + manifest.json, loadable with key_sprites.py
       <ep>/<name>.webp  looping transparent animated WebP, to preview or use elsewhere
       <ep>/<name>.png   the middle frame (what --tag labels)
     and add a line to <out>/manifest.jsonl.

Optionally (--tag / --tag-only) label the clips with Claude on numbered contact sheets
(same labels as extract_sprites.py) and export them into a library folder by character,
group and theme (--library). Re-running skips finished episodes.
"""

from __future__ import annotations

import argparse
import io
import json
import shutil
import sys
import time
import zipfile
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

import extract_sprites as es

# every pose name kit.js knows (DEFAULT_ROWS), so any scene plays the clip's single row
KIT_POSES = ["idle", "happy", "shy", "cheer", "notice", "sleep", "desk", "determined", "power", "surprised", "dash"]
WEBP_MAX = 16383   # largest WebP side; key_sprites.py stores sheets as WebP


@dataclass
class ClipConfig(es.Config):
    clip_fps: float = 8.0       # frames per second in a clip (kit.js plays sheets at 8 fps by default)
    clip_len: int = 16          # max frames per clip
    min_frames: int = 6         # shorter shots/characters are skipped
    max_clips: int = 8          # most active shots per episode (0 = every shot that moves)
    clip_size: int = 512        # longest side of a clip frame (0 = original pixels, no scaling)
    min_motion: float = 1.0     # mean change per frame (0-255, 64x36 thumbnail) for a shot to count as moving
    hold_eps: float = 0.6       # below this change a frame is a held drawing: reuse the previous mask
    track_motion: float = 1.5   # a character whose cut-out changes less than this is static: no clip
    min_overlap: float = 0.2    # box overlap (IoU) that links a character from one frame to the next
    min_area_ratio: float = 0.7  # a frame whose cut-out is <70% or >143% of the clip's median size is dropped
    cut_subtitles: bool = True   # remove burned-in subtitles by cutting the clip off at the subtitle line


# ----------------------------------------------------------- shot windows

def scan(video: Path, cfg: ClipConfig):
    """[(frame index, seconds, 64x36 thumbnail)] sampled at clip_fps."""
    cap = cv2.VideoCapture(str(video))
    fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration = total / fps if total else float("inf")
    step = max(1, round(fps / cfg.clip_fps))
    samples, idx = [], -1
    while cap.grab():
        idx += 1
        if idx % step:
            continue
        t = idx / fps
        if t < cfg.skip_start or t > duration - cfg.skip_end:
            continue
        ok, frame = cap.retrieve()
        if not ok:
            continue
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        samples.append((idx, t, cv2.resize(gray, (64, 36), interpolation=cv2.INTER_AREA).astype(np.int16)))
    cap.release()
    return samples


def pick_windows(samples, cfg: ClipConfig) -> list[list[int]]:
    """Indices into samples: the most active run of up to clip_len samples in each moving shot."""
    shots, cur = [], []
    for k, (_, _, thumb) in enumerate(samples):
        if thumb.std() < 8:   # black / flat card ends a shot
            if cur:
                shots.append(cur)
            cur = []
            continue
        if cur and np.abs(thumb - samples[cur[-1]][2]).mean() > cfg.scene_threshold:
            shots.append(cur)
            cur = []
        cur.append(k)
    if cur:
        shots.append(cur)
    wins = []
    for shot in shots:
        if len(shot) < cfg.min_frames:
            continue
        diffs = [float(np.abs(samples[a][2] - samples[b][2]).mean()) for a, b in zip(shot, shot[1:])]
        n = min(cfg.clip_len, len(shot))
        best = max(range(len(shot) - n + 1), key=lambda i: sum(diffs[i:i + n - 1]))
        score = sum(diffs[best:best + n - 1]) / (n - 1)
        if score >= cfg.min_motion:
            wins.append((score, shot[best:best + n]))
    wins.sort(key=lambda w: -w[0])
    if cfg.max_clips:
        wins = wins[:cfg.max_clips]
    return sorted(w for _, w in wins)


def window_frames(video: Path, samples, windows):
    """Yield (window, [BGR frames]) in time order, reading the video once."""
    want = {samples[k][0]: (w, j) for w, win in enumerate(windows) for j, k in enumerate(win)}
    if not want:
        return
    last = max(want)
    cap = cv2.VideoCapture(str(video))
    frames: dict[int, list] = {}
    idx = -1
    while idx < last and cap.grab():
        idx += 1
        if idx not in want:
            continue
        ok, frame = cap.retrieve()
        w, j = want[idx]
        frames.setdefault(w, [None] * len(windows[w]))[j] = frame if ok else None
        if j == len(windows[w]) - 1:
            yield w, frames.pop(w)
    cap.release()


# ----------------------------------------------------------- cut-outs

def blob_masks(rgb: np.ndarray, soft: np.ndarray, cfg: ClipConfig):
    """[(mask, (x0, y0, x1, y1))] per character blob: the same steps as extract_sprites.cut_sprites."""
    h, w = soft.shape
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    binary = (soft >= cfg.alpha_threshold).astype(np.uint8)
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, labels, stats, _ = cv2.connectedComponentsWithStats(binary, connectivity=8)
    out = []
    for i in range(1, n):
        frac = stats[i][4] / (w * h)
        if frac < cfg.min_area or frac > cfg.max_area:
            continue
        mask = es.refine_mask((labels == i).astype(np.uint8), gray, cfg)
        ys, xs = np.nonzero(mask)
        out.append((mask, (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)))
    return out


def subtitle_top(rgb: np.ndarray, band: float = 0.84) -> int | None:
    """Top y of a burned-in subtitle line (white text with a dark outline, centred low in the frame), or None."""
    h, w = rgb.shape[:2]
    y0 = int(h * band)
    part = rgb[y0:]
    white = (part.min(-1) > 215).astype(np.uint8)
    dark = (cv2.cvtColor(part, cv2.COLOR_RGB2GRAY) < 80).astype(np.uint8)
    thin = white & (1 - cv2.morphologyEx(white, cv2.MORPH_OPEN, np.ones((17, 17), np.uint8)))   # strokes, not bodies
    strokes = thin & cv2.dilate(dark, np.ones((5, 5), np.uint8))                              # ...with an outline
    lines = cv2.morphologyEx(strokes, cv2.MORPH_CLOSE, np.ones((9, 31), np.uint8))           # glyphs -> one line
    n, _, stats, _ = cv2.connectedComponentsWithStats(lines, connectivity=8)
    tops = []
    for i in range(1, n):
        x, y, bw, bh, area = stats[i]
        if not (12 <= bh <= 0.12 * h and bw >= 3 * bh and bw >= 0.06 * w):
            continue
        if abs(x + bw / 2 - w / 2) > 0.3 * w or y0 + y + bh < 0.9 * h:   # subtitles are centred, at the very bottom
            continue
        if strokes[y:y + bh, x:x + bw].sum() < 0.06 * bw * bh:
            continue
        tops.append(y0 + int(y))
    return min(tops) if tops else None


def iou(a, b) -> float:
    ix = max(0, min(a[2], b[2]) - max(a[0], b[0]))
    iy = max(0, min(a[3], b[3]) - max(a[1], b[1]))
    inter = ix * iy
    union = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / union if union else 0.0


def follow(blobs: list[list], min_overlap: float) -> list[list]:
    """Link blobs frame to frame. Returns tracks: per frame the (mask, box) of that character or None."""
    n = len(blobs)
    tracks = [[b] + [None] * (n - 1) for b in blobs[0]]
    for k in range(1, n):
        last = [next(t[j] for j in range(k - 1, -1, -1) if t[j] is not None)[1] for t in tracks]
        pairs = sorted(((iou(last[ti], b[1]), ti, j) for ti in range(len(tracks)) for j, b in enumerate(blobs[k])),
                       reverse=True)
        took_t, took_b = set(), set()
        for score, ti, j in pairs:
            if score < min_overlap or ti in took_t or j in took_b:
                continue
            tracks[ti][k] = blobs[k][j]
            took_t.add(ti)
            took_b.add(j)
    return tracks


def fit(img: Image.Image, size: int) -> Image.Image:
    """Scale so the longest side is at most size, keeping on/off alpha."""
    if not size or max(img.size) <= size:
        return img
    s = size / max(img.size)
    small = np.asarray(img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)).copy()
    small[..., 3] = np.where(small[..., 3] >= 128, 255, 0)
    return Image.fromarray(small, "RGBA")


def build_clip(frames_rgb: list, entries: list, cfg: ClipConfig):
    """Frames of one character (or a group): all cropped to the same box, so its movement in the shot is kept.
    Returns (frames, union box) or None if it barely moves or its cut-out flickers."""
    # frames where the cut-out suddenly grows or shrinks are model mistakes (background swallowed, a limb lost)
    areas = [int(e[1].sum()) for e in entries]
    med = float(np.median(areas))
    steady = [e for e, a in zip(entries, areas) if cfg.min_area_ratio * med <= a <= med / cfg.min_area_ratio]
    if len(steady) < max(cfg.min_frames, 0.75 * len(entries)):
        return None
    entries = steady
    x0 = max(0, min(e[2][0] for e in entries) - cfg.pad)
    y0 = max(0, min(e[2][1] for e in entries) - cfg.pad)
    h, w = frames_rgb[entries[0][0]].shape[:2]
    x1 = min(w, max(e[2][2] for e in entries) + cfg.pad)
    y1 = min(h, max(e[2][3] for e in entries) + cfg.pad)
    out, sig = [], []
    for k, mask, _ in entries:
        rgb = frames_rgb[k]
        alpha = np.where(mask[y0:y1, x0:x1] > 0, 255, 0).astype(np.uint8)
        img = Image.fromarray(np.dstack([rgb[y0:y1, x0:x1], alpha]), "RGBA")
        es.check_untouched(img, rgb, [x0, y0, x1 - x0, y1 - y0], 0)
        out.append(img)
        g = cv2.cvtColor(rgb[y0:y1, x0:x1], cv2.COLOR_RGB2GRAY).astype(np.int16) * (alpha > 0)
        sig.append(cv2.resize(g, (64, 64), interpolation=cv2.INTER_AREA))
    motion = np.mean([np.abs(a - b).mean() for a, b in zip(sig, sig[1:])]) if len(sig) > 1 else 0
    if motion < cfg.track_motion:
        return None
    total = max(1, len(out))
    fitted = [fit(f, cfg.clip_size) for f in out]
    fw = fitted[0].width
    if fw * total > WEBP_MAX:   # keep one row of frames under the WebP size limit
        fitted = [fit(f, max(1, WEBP_MAX // total) * max(f.size) // f.width) for f in fitted]
    return fitted, (x0, y0, x1, y1)


def save_clip(frames: list, out_root: Path, rel_stem: str, fps: float, info: dict) -> None:
    fw, fh = frames[0].size
    sheet = Image.new("RGBA", (fw * len(frames), fh))
    for i, f in enumerate(frames):
        sheet.paste(f, (i * fw, 0))
    n = len(frames)
    manifest = {
        "frameWidth": fw, "frameHeight": fh, "columns": n, "rows": 1, "spriteFile": "sprite.png", "fps": fps,
        "source": info,
        "story": {"rows": {p: 0 for p in KIT_POSES}, "frames": {p: list(range(n)) for p in KIT_POSES},
                  "note": f"animated clip: {n} frames recorded at {fps:g} fps (drawChar fps {fps:g} plays it at real speed)"},
    }
    buf = io.BytesIO()
    sheet.save(buf, "PNG", optimize=True)
    with zipfile.ZipFile(out_root / f"{rel_stem}.zip", "w", zipfile.ZIP_STORED) as z:
        z.writestr("sprite.png", buf.getvalue())
        z.writestr("manifest.json", json.dumps(manifest, indent=1))
    frames[0].save(out_root / f"{rel_stem}.webp", save_all=True, append_images=frames[1:],
                   duration=round(1000 / fps), loop=0, lossless=True, method=4)
    frames[n // 2].save(out_root / f"{rel_stem}.png")


# ----------------------------------------------------------- episodes

def episode_names(videos: list[Path], prefix: str) -> dict[Path, str]:
    """<prefix>-001, <prefix>-002, ... in file-name order of the whole input folder (stable across --limit)."""
    return {v: f"{prefix}-{i:03d}" for i, v in enumerate(sorted(videos), 1)}


def process_episode(video: Path, ep: str, out_root: Path, matter, cfg: ClipConfig) -> list[dict]:
    ep_dir = out_root / ep
    if (ep_dir / ".done").exists():
        print(f"[{ep}] already done, skipping")
        return []
    if ep_dir.exists():
        shutil.rmtree(ep_dir)   # partial run: start the episode over
    es.drop_from_manifest(out_root, ep)
    ep_dir.mkdir(parents=True)

    samples = scan(video, cfg)
    windows = pick_windows(samples, cfg)
    records: list[dict] = []
    for w, frames in window_frames(video, samples, windows):
        win = windows[w]
        keep = [j for j, f in enumerate(frames) if f is not None]
        rgbs = [cv2.cvtColor(frames[j], cv2.COLOR_BGR2RGB) for j in keep]
        thumbs = [samples[win[j]][2] for j in keep]
        softs = []
        for k, rgb in enumerate(rgbs):
            held = k and np.abs(thumbs[k] - thumbs[k - 1]).mean() < cfg.hold_eps
            softs.append(softs[-1] if held else matter.alpha(Image.fromarray(rgb)))
        cut_y = None
        if cfg.cut_subtitles:   # drop everything from the subtitle line down, at one height for the whole clip
            tops = [t for t in (subtitle_top(rgb) for rgb in rgbs) if t is not None]
            if tops:
                cut_y = max(0, min(tops) - 6)
                softs = [s.copy() for s in softs]
                for s in softs:
                    s[cut_y:] = 0
        blobs = [blob_masks(rgb, soft, cfg) for rgb, soft in zip(rgbs, softs)]
        if not blobs or not blobs[0]:
            continue
        tracks = follow(blobs, cfg.min_overlap)
        t0 = samples[win[keep[0]]][1]
        stamp = f"{int(t0 // 60):02d}m{t0 % 60:05.2f}s".replace(".", "_")
        h, wd = rgbs[0].shape[:2]
        kept_tracks = []
        for ti, tr in enumerate(tracks):
            entries = [(k, *e) for k, e in enumerate(tr) if e is not None]
            if len(entries) < cfg.min_frames or len(entries) < 0.75 * (entries[-1][0] + 1):
                continue
            kept_tracks.append(entries)
        groups = [(f"{ti}", e, "sprite") for ti, e in enumerate(kept_tracks)]
        if len(kept_tracks) >= 2:   # all characters together, frames where every one of them is present
            common = set.intersection(*({k for k, *_ in e} for e in kept_tracks))
            if len(common) >= cfg.min_frames:
                merged = []
                for k in sorted(common):
                    parts = [next(x for x in e if x[0] == k) for e in kept_tracks]
                    mask = np.maximum.reduce([p[1] for p in parts])
                    box = (min(p[2][0] for p in parts), min(p[2][1] for p in parts),
                           max(p[2][2] for p in parts), max(p[2][3] for p in parts))
                    merged.append((k, mask, box))
                groups.append(("group", merged, "group"))
        for label, entries, kind in groups:
            built = build_clip(rgbs, entries, cfg)
            if built is None:
                continue
            frames_out, (x0, y0, x1, y1) = built
            rel_stem = f"{ep}/{ep}_{stamp}_{label}"
            t1 = samples[win[keep[entries[-1][0]]]][1]
            info = {"episode": ep, "time": round(t0, 2), "end": round(t1, 2), "bbox": [x0, y0, x1 - x0, y1 - y0]}
            save_clip(frames_out, out_root, rel_stem, cfg.clip_fps, info)
            records.append({"kind": kind, "file": f"{rel_stem}.png", "sheet": f"{rel_stem}.zip",
                            "preview": f"{rel_stem}.webp", "episode": ep, "source_file": video.name,
                            "time": round(t0, 2), "end": round(t1, 2),
                            "frames": len(frames_out), "fps": cfg.clip_fps, "frame": None,
                            "blobs_in_frame": len(kept_tracks), "bbox": [x0, y0, x1 - x0, y1 - y0],
                            "subtitle_cut_y": cut_y,
                            "touches_edge": bool(x0 <= 1 or y0 <= 1 or x1 >= wd - 1 or y1 >= h - 1
                                                 or (cut_y is not None and y1 >= cut_y - 1))})
    with open(out_root / "manifest.jsonl", "a", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r) + "\n")
    (ep_dir / ".done").touch()
    print(f"[{ep}] {len(windows)} moving shots -> {sum(r['kind'] == 'sprite' for r in records)} character clips, "
          f"{sum(r['kind'] == 'group' for r in records)} group clips")
    return records


# ----------------------------------------------------------- library export

def export_clips(out_root: Path, lib_root: Path, tagged: dict[str, dict]) -> None:
    """Copy tagged clips (.zip sheet + .webp preview) into <lib_root>/<character|group|misc>/[bust/],
    theme-<theme>/ (hard links) and review/{partial,text,messy}/. Only clean clips (nothing but the
    character and what it holds, no subtitles, quality 3+) reach the character folders; objects on their own
    and junk are left out. Only files the previous export wrote (index.jsonl) are ever removed."""
    index_path = lib_root / "index.jsonl"
    for old in es.load_jsonl(index_path):
        for ext in (".zip", ".webp"):
            p = (lib_root / old).with_suffix(ext)
            for q in [p] + [lib_root / f"theme-{t}" / p.name for t in es.THEMES]:
                if q.exists():
                    q.unlink()
    index, counts, skipped = [], {}, 0
    for rec in sorted(tagged.values(), key=lambda r: r["file"]):
        if not (out_root / rec["sheet"]).exists():
            continue
        tags = rec.get("tags") or {}
        folder, name = es.library_dest(rec)
        folder = folder[3:] if folder.startswith("../") else folder
        if folder in ("props", "review/rejected") or not tags.get("is_character"):
            skipped += 1   # objects on their own and junk: characters only in the clip library
            continue
        if not folder.startswith("review") and (tags.get("quality", 0) <= 2 or not tags.get("only_characters")):
            folder = "review/messy"   # furniture, scenery or leftover background included, or a rough cut-out
        name = name[3:] if name.startswith("ep-") else name   # chiikawa-001-00m12-50s-0-... rather than ep-...
        stem = Path(folder) / Path(name).stem
        for src, ext in ((rec["sheet"], ".zip"), (rec["preview"], ".webp")):
            es.place(out_root / src, lib_root / stem.with_suffix(ext))
        if not folder.startswith("review"):
            for theme in tags.get("themes", []):
                if theme in es.THEMES:
                    for ext in (".zip", ".webp"):
                        es.link(lib_root / stem.with_suffix(ext), lib_root / f"theme-{theme}" / stem.with_suffix(ext).name)
        index.append({"file": stem.with_suffix(".zip").as_posix(), "preview": stem.with_suffix(".webp").as_posix(),
                      "source": rec["sheet"], "episode": rec["episode"], "time": rec["time"], "end": rec["end"],
                      "frames": rec["frames"], "fps": rec["fps"], "tags": tags})
        top = "/".join(folder.split("/")[:2]) if folder.startswith("review") else folder.split("/")[0]
        counts[top] = counts.get(top, 0) + 1
    lib_root.mkdir(parents=True, exist_ok=True)
    with open(index_path, "w", encoding="utf-8") as f:
        for r in index:
            f.write(json.dumps(r) + "\n")
    print(f"Exported {len(index)} clips to {lib_root}: " + ", ".join(f"{k} {v}" for k, v in sorted(counts.items()))
          + f" ({skipped} objects/junk left out)")
    print('  use with sprite-short: key_sprites.py <project> <name>="<clip>.zip", then paste the clip\'s '
          'manifest "story" rows/frames into CHARACTERS and draw it with fps 8')


# ----------------------------------------------------------- main

def fmt_time(seconds: float) -> str:
    m, s = divmod(int(round(seconds)), 60)
    h, m = divmod(m, 60)
    return f"{h}h {m:02d}m" if h else f"{m}m {s:02d}s"


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("input", type=Path, help="Folder of episodes (files may lack extensions), or one video file")
    p.add_argument("-o", "--output", type=Path, default=Path("chiikawa_clips_out"))
    p.add_argument("--model", default="isnet-anime", help="rembg matting model (default: isnet-anime)")
    p.add_argument("--clip-fps", type=float, default=ClipConfig.clip_fps)
    p.add_argument("--clip-len", type=int, default=ClipConfig.clip_len, help="Max frames per clip")
    p.add_argument("--min-frames", type=int, default=ClipConfig.min_frames)
    p.add_argument("--max-clips", type=int, default=ClipConfig.max_clips,
                   help="Moving shots per episode, most active first (0 = all)")
    p.add_argument("--clip-size", type=int, default=ClipConfig.clip_size,
                   help="Longest side of a clip frame in px (0 = original pixels)")
    p.add_argument("--min-motion", type=float, default=ClipConfig.min_motion)
    p.add_argument("--scene-threshold", type=float, default=ClipConfig.scene_threshold)
    p.add_argument("--min-area", type=float, default=ClipConfig.min_area)
    p.add_argument("--outline-px", type=int, default=ClipConfig.outline_px)
    p.add_argument("--keep-subtitles", action="store_true",
                   help="Don't cut clips off at burned-in subtitle lines")
    p.add_argument("--skip-start", type=float, default=0.0)
    p.add_argument("--skip-end", type=float, default=0.0)
    p.add_argument("--limit", type=int, default=0, help="Only process the first N episodes (for a trial run)")
    p.add_argument("--prefix", default="chiikawa", help="Episode name prefix: <prefix>-001, <prefix>-002, ...")
    p.add_argument("--tag", action="store_true", help="Label clips with Claude and export the library")
    p.add_argument("--tag-only", action="store_true", help="Skip extraction; only tag and export")
    p.add_argument("--export-only", action="store_true", help="No extraction, no API calls: rebuild the library")
    p.add_argument("--library", type=Path, default=None, help="Clip library folder (default: <output>/library)")
    p.add_argument("--claude-model", default="claude-opus-5-5")
    p.add_argument("--workers", type=int, default=4)
    p.add_argument("--per-sheet", type=int, default=6, help="Clips per contact sheet (6 = bigger thumbnails)")
    p.add_argument("--keep-sheets", action="store_true")
    p.add_argument("--yes", action="store_true", help="Don't ask before sending clips to the API")
    args = p.parse_args()

    cfg = ClipConfig(clip_fps=args.clip_fps, clip_len=args.clip_len, min_frames=args.min_frames,
                     max_clips=args.max_clips, clip_size=args.clip_size, min_motion=args.min_motion,
                     scene_threshold=args.scene_threshold, min_area=args.min_area, outline_px=args.outline_px,
                     skip_start=args.skip_start, skip_end=args.skip_end, cut_subtitles=not args.keep_subtitles)
    out_root = args.output
    out_root.mkdir(parents=True, exist_ok=True)

    if not (args.tag_only or args.export_only):
        videos = [args.input] if args.input.is_file() else sorted(f for f in args.input.iterdir() if es.is_video(f))
        names = episode_names(videos, args.prefix)
        mapping = out_root / "episodes.json"   # which source file each episode name stands for
        known = json.loads(mapping.read_text(encoding="utf-8")) if mapping.exists() else {}
        known.update({names[v]: v.name for v in videos})
        mapping.write_text(json.dumps(known, indent=1, sort_keys=True), encoding="utf-8")
        if args.limit:
            videos = videos[: args.limit]
        if not videos:
            sys.exit(f"No decodable video files found in {args.input}")
        print(f"Found {len(videos)} episode(s). Loading matting model '{args.model}'...")
        matter = es.Matter(args.model)
        timed: list[float] = []
        started = time.monotonic()
        for v in videos:
            if (out_root / names[v] / ".done").exists():
                print(f"[{names[v]}] already done, skipping")
                continue
            t0 = time.monotonic()
            try:
                process_episode(v, names[v], out_root, matter, cfg)
            except Exception as e:  # keep going on a bad file
                print(f"[{v.name}] failed: {e}", file=sys.stderr)
                continue
            timed.append(time.monotonic() - t0)
            print(f"    took {fmt_time(timed[-1])}")
        if timed:
            left = sum(1 for n in names.values() if not (out_root / n / ".done").exists())
            avg = sum(timed) / len(timed)
            print(f"Done: {len(timed)} episode(s) in {fmt_time(time.monotonic() - started)} "
                  f"(average {fmt_time(avg)} per episode). {left} of {len(names)} episodes still to do: "
                  f"about {fmt_time(avg * left)} at this pace.")

    if args.tag or args.tag_only or args.export_only:
        if args.export_only:
            records = es.load_jsonl(out_root / "manifest.jsonl")
            tagged = {f: r for f, r in es.load_jsonl(out_root / "tags.jsonl").items() if f in records}
        else:
            tagged = es.tag_all(out_root, args.claude_model, args.workers, args.yes, max(1, args.per_sheet),
                                args.keep_sheets)
        export_clips(out_root, args.library or out_root / "library", tagged)


if __name__ == "__main__":
    main()
