#!/usr/bin/env python3
"""Extract character sprites from Chiikawa episodes.

Pipeline (per episode):
  1. Sample frames, keeping one per shot (scene-change + periodic sampling,
     skipping black/flat/blurry frames and near-duplicates).
  2. Cut the characters out of each kept frame with an anime-tuned matting
     model (rembg "isnet-anime"), producing a transparent PNG.
  3. Split the cut-out into connected blobs:
       - each blob  -> sprites/   (one character, or characters that overlap /
                                   touch each other, incl. held props/weapons)
       - all blobs  -> groups/    (when 2+ separate characters share the shot)
  4. Optionally (--tag) ask Claude to label every sprite (which characters,
     interaction, accessories/weapons, completeness) and copy the sprites into
     sorted/ folders by character / group / props.

Input files may have no extension; anything OpenCV can decode as video is used.
Re-running skips episodes that are already done (delete the episode folder to
redo one).
"""

from __future__ import annotations

import argparse
import base64
import io
import json
import re
import shutil
import sys
import threading
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

SKIP_EXTENSIONS = {
    ".nfo", ".txt", ".srt", ".ass", ".ssa", ".sub", ".idx", ".par2", ".sfv",
    ".nzb", ".jpg", ".jpeg", ".png", ".gif", ".url", ".md5", ".json", ".db",
    ".ini", ".log", ".exe", ".zip", ".7z",
}


@dataclass
class Config:
    sample_fps: float = 2.0
    scene_threshold: float = 10.0   # mean abs diff (0-255) on a 64x36 thumbnail
    max_gap: float = 3.0            # keep a frame at least this often (seconds) within long shots
    min_sharpness: float = 40.0     # Laplacian variance; lower = blurrier
    skip_start: float = 0.0
    skip_end: float = 0.0
    min_area: float = 0.004         # smallest sprite, as a fraction of the frame
    max_area: float = 0.85          # larger blobs are usually a failed matte
    alpha_threshold: int = 128
    pad: int = 12
    save_frames: bool = True
    max_frames: int = 0             # 0 = unlimited


# ---------------------------------------------------------------- utilities

def dhash(gray: np.ndarray, size: int = 8) -> int:
    small = cv2.resize(gray, (size + 1, size), interpolation=cv2.INTER_AREA)
    bits = (small[:, 1:] > small[:, :-1]).flatten()
    return int("".join("1" if b else "0" for b in bits), 2)


def hamming(a: int, b: int) -> int:
    return bin(a ^ b).count("1")


def is_video(path: Path) -> bool:
    if path.suffix.lower() in SKIP_EXTENSIONS or not path.is_file():
        return False
    if path.stat().st_size < 50_000:
        return False
    cap = cv2.VideoCapture(str(path))
    try:
        ok, _ = cap.read()
        return ok and cap.get(cv2.CAP_PROP_FPS) > 0
    finally:
        cap.release()


def episode_name(path: Path) -> str:
    m = re.search(r"S\d{2}E\d{2,4}", path.name, re.I)
    name = m.group(0).upper() if m else path.stem
    return re.sub(r"[^\w.-]+", "_", name)


# ----------------------------------------------------------- frame sampling

def sample_frames(video: Path, cfg: Config):
    """Yield (timestamp_seconds, bgr_frame) for frames worth cutting out."""
    cap = cv2.VideoCapture(str(video))
    fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration = total / fps if total else float("inf")
    step = max(1, round(fps / cfg.sample_fps))

    last_thumb = None
    last_kept_t = -1e9
    recent_hashes: list[int] = []
    kept = 0
    idx = -1
    while True:
        if not cap.grab():
            break
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
        thumb = cv2.resize(gray, (64, 36), interpolation=cv2.INTER_AREA).astype(np.int16)
        if thumb.std() < 8:  # black / white / flat card
            continue
        changed = last_thumb is None or np.abs(thumb - last_thumb).mean() > cfg.scene_threshold
        if not changed and t - last_kept_t < cfg.max_gap:
            continue
        if cv2.Laplacian(gray, cv2.CV_64F).var() < cfg.min_sharpness:
            continue
        h = dhash(gray)
        if any(hamming(h, o) <= 3 for o in recent_hashes):
            continue

        recent_hashes = (recent_hashes + [h])[-40:]
        last_thumb, last_kept_t = thumb, t
        kept += 1
        yield t, frame
        if cfg.max_frames and kept >= cfg.max_frames:
            break
    cap.release()


# ------------------------------------------------------------- cut-outs

class Matter:
    def __init__(self, model: str):
        from rembg import new_session  # imported lazily: slow import
        self.session = new_session(model)

    def alpha(self, rgb: Image.Image) -> np.ndarray:
        from rembg import remove
        mask = remove(rgb, session=self.session, only_mask=True, post_process_mask=True)
        return np.asarray(mask.convert("L"))


def rgba_crop(rgb: np.ndarray, alpha: np.ndarray, x0, y0, x1, y1, pad: int) -> Image.Image:
    h, w = alpha.shape
    x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
    x1, y1 = min(w, x1 + pad), min(h, y1 + pad)
    rgba = np.dstack([rgb[y0:y1, x0:x1], alpha[y0:y1, x0:x1]])
    return Image.fromarray(rgba, "RGBA")


def cut_sprites(rgb: np.ndarray, soft: np.ndarray, cfg: Config):
    """Return (blob_sprites, group_sprite_or_None). Each blob = (Image, info)."""
    h, w = soft.shape
    binary = (soft >= cfg.alpha_threshold).astype(np.uint8)
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, labels, stats, _ = cv2.connectedComponentsWithStats(binary, connectivity=8)

    blobs = []
    keep = np.zeros_like(binary)
    for i in range(1, n):
        x, y, bw, bh, area = stats[i]
        frac = area / (w * h)
        if frac < cfg.min_area or frac > cfg.max_area:
            continue
        comp = (labels == i).astype(np.uint8)
        # Grow the hard mask slightly so the soft anti-aliased edge survives.
        grown = cv2.dilate(comp, np.ones((7, 7), np.uint8))
        alpha = (soft * grown).astype(np.uint8)
        keep |= grown
        img = rgba_crop(rgb, alpha, x, y, x + bw, y + bh, cfg.pad)
        touches = x <= 1 or y <= 1 or x + bw >= w - 1 or y + bh >= h - 1
        blobs.append((img, {
            "bbox": [int(x), int(y), int(bw), int(bh)],
            "area_frac": round(float(frac), 4),
            "touches_edge": bool(touches),
        }))

    group = None
    if len(blobs) >= 2:
        ys, xs = np.nonzero(keep)
        alpha = (soft * keep).astype(np.uint8)
        group = rgba_crop(rgb, alpha, xs.min(), ys.min(), xs.max() + 1, ys.max() + 1, cfg.pad)
    return blobs, group


def sprite_hash(img: Image.Image) -> int:
    a = np.asarray(img)
    gray = cv2.cvtColor(a[..., :3], cv2.COLOR_RGB2GRAY)
    gray = np.where(a[..., 3] > 0, gray, 0).astype(np.uint8)
    return dhash(gray, 16)


# ------------------------------------------------------------ extraction

def process_episode(video: Path, out_root: Path, matter: Matter, cfg: Config) -> list[dict]:
    ep = episode_name(video)
    ep_dir = out_root / ep
    done = ep_dir / ".done"
    if done.exists():
        print(f"[{ep}] already done, skipping")
        return []
    if ep_dir.exists():
        shutil.rmtree(ep_dir)  # partial run: start the episode over
    (ep_dir / "sprites").mkdir(parents=True)
    (ep_dir / "groups").mkdir()
    if cfg.save_frames:
        (ep_dir / "frames").mkdir()

    records: list[dict] = []
    seen: list[int] = []
    n_frames = 0
    for t, frame in sample_frames(video, cfg):
        n_frames += 1
        stamp = f"{int(t // 60):02d}m{t % 60:05.2f}s".replace(".", "_")
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        soft = matter.alpha(Image.fromarray(rgb))
        blobs, group = cut_sprites(rgb, soft, cfg)
        if not blobs:
            continue
        frame_rel = None
        if cfg.save_frames:
            frame_rel = f"{ep}/frames/{ep}_{stamp}.jpg"
            cv2.imwrite(str(out_root / frame_rel), frame, [cv2.IMWRITE_JPEG_QUALITY, 92])

        for k, (img, info) in enumerate(blobs):
            hsh = sprite_hash(img)
            if any(hamming(hsh, o) <= 12 for o in seen[-60:]):
                continue
            seen.append(hsh)
            rel = f"{ep}/sprites/{ep}_{stamp}_{k}.png"
            img.save(out_root / rel)
            records.append({"kind": "sprite", "file": rel, "episode": ep, "time": round(t, 2),
                            "frame": frame_rel, "blobs_in_frame": len(blobs), **info})
        if group is not None:
            rel = f"{ep}/groups/{ep}_{stamp}_group.png"
            group.save(out_root / rel)
            records.append({"kind": "group", "file": rel, "episode": ep, "time": round(t, 2),
                            "frame": frame_rel, "blobs_in_frame": len(blobs)})

    with open(out_root / "manifest.jsonl", "a", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r) + "\n")
    done.touch()
    print(f"[{ep}] {n_frames} frames -> {sum(r['kind'] == 'sprite' for r in records)} sprites, "
          f"{sum(r['kind'] == 'group' for r in records)} group shots")
    return records


# --------------------------------------------------------------- tagging

ROSTER = """Known Chiikawa characters (use these names, lowercase):
- chiikawa: small white bear-like creature, pink blush, round ears, timid
- hachiware: white cat-like creature with a blue-gray split "hachiware" pattern over the top of the head, cheerful
- usagi: yellow/cream rabbit-like creature with long ears, wild expressions
- momonga: small white flying squirrel with big dark-blue-tinted ears/tail, fluffy
- kurimanju: chestnut-bun shaped creature, brown top, often drinking
- rakko: sea otter, strong swordsman, tan with a mane-like face
- shisa: small shisa (lion-dog), orange/yellow mane, works at the ramen shop
- furuhonya: used-bookstore keeper, hairy, glasses
- yoroi-san: armored people (pot/armor helmets) who run the labor office and shops
- kani-chan / momonga etc.: use the closest known name; otherwise "other:<short description>"
- chimera / monster: any enemy creature (describe briefly as "monster:<description>")"""

TAG_SCHEMA = {
    "type": "object",
    "properties": {
        "is_character": {"type": "boolean",
                         "description": "True if the cut-out mainly shows one or more characters (not scenery, text, food alone, or a matting error)."},
        "characters": {"type": "array", "items": {"type": "string"},
                       "description": "Names of every character visible, one entry per character."},
        "interaction": {"type": "boolean",
                        "description": "True if 2+ characters overlap, touch or clearly interact."},
        "props": {"type": "array", "items": {"type": "string"},
                  "description": "Accessories, held items, costumes (e.g. 'stick', 'pochette', 'hat', 'mushroom')."},
        "weapons": {"type": "array", "items": {"type": "string"},
                    "description": "Weapons held or worn (e.g. 'stick', 'sword', 'spear', 'tweezers')."},
        "pose": {"type": "string", "description": "Short pose/action, e.g. 'running', 'crying', 'hugging hachiware'."},
        "complete": {"type": "boolean",
                     "description": "True if the characters are whole (not cut off by the frame edge) with little leftover background."},
        "quality": {"type": "integer", "description": "1-5 usefulness as a clean sprite for a short video."},
    },
    "required": ["is_character", "characters", "interaction", "props", "weapons", "pose", "complete", "quality"],
    "additionalProperties": False,
}


def sprite_png_b64(path: Path, max_side: int = 768) -> str:
    img = Image.open(path).convert("RGBA")
    img.thumbnail((max_side, max_side))
    bg = Image.new("RGBA", img.size, (128, 128, 128, 255))  # neutral grey shows the cut edge
    bg.alpha_composite(img)
    buf = io.BytesIO()
    bg.convert("RGB").save(buf, "PNG")
    return base64.standard_b64encode(buf.getvalue()).decode()


def tag_sprite(client, model: str, path: Path) -> dict | None:
    response = client.beta.messages.create(
        model=model,
        max_tokens=2000,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        output_config={"effort": "low", "format": {"type": "json_schema", "schema": TAG_SCHEMA}},
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": "image/png",
                                             "data": sprite_png_b64(path)}},
                {"type": "text", "text": (
                    "This is a cut-out (on grey) from the anime Chiikawa, meant to be reused as a "
                    "character sprite in short videos. Label it.\n\n" + ROSTER)},
            ],
        }],
    )
    if response.stop_reason == "refusal":
        return None
    text = next((b.text for b in response.content if b.type == "text"), None)
    return json.loads(text) if text else None


def slug(s: str) -> str:
    return re.sub(r"[^\w-]+", "_", s.strip().lower())[:40] or "unknown"


def sort_dest(out_root: Path, rec: dict) -> Path | None:
    tags = rec.get("tags")
    if not tags or not tags["is_character"] or tags["quality"] <= 1:
        return out_root / "sorted" / "rejected"
    chars = tags["characters"]
    if not tags["complete"]:  # cut off by the frame edge or messy matte
        return out_root / "sorted" / "partial" / "+".join(sorted(slug(c) for c in chars) or ["unknown"])
    if rec["kind"] == "group" or len(chars) >= 2:
        sub = "interacting" if tags["interaction"] else "together"
        return out_root / "sorted" / sub / "+".join(sorted(slug(c) for c in chars))
    base = out_root / "sorted" / ("with_weapon" if tags["weapons"] else
                                  "with_props" if tags["props"] else "single")
    return base / slug(chars[0] if chars else "unknown")


def tag_all(out_root: Path, model: str, workers: int) -> None:
    import anthropic

    manifest = out_root / "manifest.jsonl"
    tags_file = out_root / "tags.jsonl"
    records = list({r["file"]: r for r in (json.loads(l) for l in
                    manifest.read_text(encoding="utf-8").splitlines() if l.strip())}.values())
    done: dict[str, dict] = {}
    if tags_file.exists():
        for line in tags_file.read_text(encoding="utf-8").splitlines():
            if line.strip():
                r = json.loads(line)
                done[r["file"]] = r
    todo = [r for r in records if r["file"] not in done]
    print(f"Tagging {len(todo)} cut-outs ({len(done)} already tagged) with {model}")

    client = anthropic.Anthropic()
    lock = threading.Lock()

    def work(rec: dict) -> None:
        try:
            tags = tag_sprite(client, model, out_root / rec["file"])
        except anthropic.RateLimitError:
            print(f"  rate limited on {rec['file']}; re-run --tag later to finish", file=sys.stderr)
            return
        except anthropic.APIStatusError as e:
            print(f"  API error {e.status_code} on {rec['file']}: {e.message}", file=sys.stderr)
            return
        except anthropic.APIConnectionError as e:
            print(f"  connection error on {rec['file']}: {e}", file=sys.stderr)
            return
        out = {**rec, "tags": tags}
        with lock:
            done[rec["file"]] = out
            with open(tags_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(out) + "\n")
            if len(done) % 25 == 0:
                print(f"  {len(done)}/{len(records)} tagged")

    with ThreadPoolExecutor(max_workers=workers) as pool:
        list(pool.map(work, todo))

    sorted_dir = out_root / "sorted"
    if sorted_dir.exists():
        shutil.rmtree(sorted_dir)
    for rec in done.values():
        dest = sort_dest(out_root, rec)
        dest.mkdir(parents=True, exist_ok=True)
        shutil.copy2(out_root / rec["file"], dest / Path(rec["file"]).name)
    print(f"Sorted {len(done)} cut-outs into {sorted_dir}")


# ------------------------------------------------------------------ main

def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("input", type=Path, help="Folder of episodes (files may lack extensions), or one video file")
    p.add_argument("-o", "--output", type=Path, default=Path("chiikawa_sprites_out"))
    p.add_argument("--model", default="isnet-anime", help="rembg matting model (default: isnet-anime)")
    p.add_argument("--sample-fps", type=float, default=Config.sample_fps)
    p.add_argument("--scene-threshold", type=float, default=Config.scene_threshold)
    p.add_argument("--max-gap", type=float, default=Config.max_gap)
    p.add_argument("--min-sharpness", type=float, default=Config.min_sharpness)
    p.add_argument("--min-area", type=float, default=Config.min_area)
    p.add_argument("--skip-start", type=float, default=0.0, help="Seconds to skip at the start (e.g. opening)")
    p.add_argument("--skip-end", type=float, default=0.0, help="Seconds to skip at the end (e.g. credits)")
    p.add_argument("--max-frames", type=int, default=0, help="Max frames per episode (0 = no limit)")
    p.add_argument("--no-frames", action="store_true", help="Don't save the full source frames")
    p.add_argument("--limit", type=int, default=0, help="Only process the first N episodes (for a trial run)")
    p.add_argument("--tag", action="store_true", help="Label sprites with Claude and sort them (needs ANTHROPIC_API_KEY)")
    p.add_argument("--tag-only", action="store_true", help="Skip extraction; only tag/sort what's in the output folder")
    p.add_argument("--claude-model", default="claude-opus-5-5")
    p.add_argument("--workers", type=int, default=4)
    args = p.parse_args()

    cfg = Config(sample_fps=args.sample_fps, scene_threshold=args.scene_threshold, max_gap=args.max_gap,
                 min_sharpness=args.min_sharpness, min_area=args.min_area, skip_start=args.skip_start,
                 skip_end=args.skip_end, max_frames=args.max_frames, save_frames=not args.no_frames)
    out_root = args.output
    out_root.mkdir(parents=True, exist_ok=True)

    if not args.tag_only:
        if args.input.is_file():
            videos = [args.input]
        else:
            videos = sorted(f for f in args.input.iterdir() if is_video(f))
        if args.limit:
            videos = videos[: args.limit]
        if not videos:
            sys.exit(f"No decodable video files found in {args.input}")
        print(f"Found {len(videos)} episode(s). Loading matting model '{args.model}' "
              "(first run downloads it)...")
        matter = Matter(args.model)
        for v in videos:
            try:
                process_episode(v, out_root, matter, cfg)
            except Exception as e:  # keep going on a bad file
                print(f"[{v.name}] failed: {e}", file=sys.stderr)

    if args.tag or args.tag_only:
        tag_all(out_root, args.claude_model, args.workers)


if __name__ == "__main__":
    main()
