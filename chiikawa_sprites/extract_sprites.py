#!/usr/bin/env python3
"""Extract character sprites from Chiikawa episodes.

Pipeline (per episode):
  1. Sample frames, keeping one per shot (scene-change + periodic sampling,
     skipping black/flat/blurry frames and near-duplicates).
  2. Find the characters with an anime-tuned matting model (rembg
     "isnet-anime"). The model only picks which pixels to keep: sprites are the
     untouched frame pixels with an on/off alpha, snapped to the drawn outline.
  3. Split the cut-out into connected blobs:
       - each blob  -> sprites/   (one character, or characters that overlap /
                                   touch each other, incl. held props/weapons)
       - all blobs  -> groups/    (when 2+ separate characters share the shot)
  4. Optionally (--tag) ask Claude to label every sprite (which characters,
     pose, themes, props/weapons, completeness) and copy the sprites into a
     sprite-short library (--library): one folder per character, group/, misc/,
     props/, theme-<theme>/ and a poses.json for cutout_sheets.py.

Input files may have no extension; anything OpenCV can decode as video is used.
Re-running skips episodes that are already done (delete the episode folder to
redo one).
"""

from __future__ import annotations

import argparse
import base64
import io
import json
import os
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
    outline_px: int = 4             # how far the edge may grow to take in the drawn outline
    outline_luma: int = 110         # pixels darker than this count as outline
    max_hole: float = 0.15          # fill holes smaller than this fraction of the character
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


def rgba_crop(rgb: np.ndarray, mask: np.ndarray, x0, y0, x1, y1, pad: int) -> Image.Image:
    """Crop the original frame pixels; alpha is fully opaque inside the mask, 0 outside."""
    h, w = mask.shape
    x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
    x1, y1 = min(w, x1 + pad), min(h, y1 + pad)
    alpha = np.where(mask[y0:y1, x0:x1] > 0, 255, 0).astype(np.uint8)
    rgba = np.dstack([rgb[y0:y1, x0:x1], alpha])
    return Image.fromarray(rgba, "RGBA")


def refine_mask(comp: np.ndarray, gray: np.ndarray, cfg: Config) -> np.ndarray:
    """Turn the model's rough guess into a mask that follows the drawing itself.

    The model only decides *where* a character is. The edge is snapped outward
    to the dark drawn outline (so the linework is kept whole), and small holes
    the model punched inside the character (eyes, mouth, white fur) are filled.
    """
    r = cfg.outline_px
    band = cv2.dilate(comp, np.ones((2 * r + 1, 2 * r + 1), np.uint8)) & (1 - comp)
    mask = comp | (band & (gray < cfg.outline_luma).astype(np.uint8))

    contours, hierarchy = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    if hierarchy is not None:
        outer_area = sum(cv2.contourArea(c) for c, hi in zip(contours, hierarchy[0]) if hi[3] < 0)
        for c, hi in zip(contours, hierarchy[0]):
            if hi[3] >= 0 and cv2.contourArea(c) < cfg.max_hole * outer_area:
                cv2.drawContours(mask, [c], -1, 1, thickness=cv2.FILLED)
    return mask


def cut_sprites(rgb: np.ndarray, soft: np.ndarray, cfg: Config):
    """Return (blob_sprites, group_sprite_or_None). Each blob = (Image, info)."""
    h, w = soft.shape
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    binary = (soft >= cfg.alpha_threshold).astype(np.uint8)
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, labels, stats, _ = cv2.connectedComponentsWithStats(binary, connectivity=8)

    blobs = []
    keep = np.zeros_like(binary)
    for i in range(1, n):
        area = stats[i][4]
        frac = area / (w * h)
        if frac < cfg.min_area or frac > cfg.max_area:
            continue
        mask = refine_mask((labels == i).astype(np.uint8), gray, cfg)
        keep |= mask
        ys, xs = np.nonzero(mask)
        x, y, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        img = rgba_crop(rgb, mask, x, y, x1, y1, cfg.pad)
        touches = x <= 1 or y <= 1 or x1 >= w - 1 or y1 >= h - 1
        blobs.append((img, {
            "bbox": [int(x), int(y), int(x1 - x), int(y1 - y)],
            "area_frac": round(float(frac), 4),
            "touches_edge": bool(touches),
        }))

    group = None
    if len(blobs) >= 2:
        ys, xs = np.nonzero(keep)
        group = rgba_crop(rgb, keep, xs.min(), ys.min(), xs.max() + 1, ys.max() + 1, cfg.pad)
    return blobs, group


def check_untouched(img: Image.Image, rgb: np.ndarray, bbox, pad: int) -> None:
    """Every visible sprite pixel must be the exact source-frame pixel at full opacity."""
    a = np.asarray(img)
    h, w = rgb.shape[:2]
    x0, y0 = max(0, bbox[0] - pad), max(0, bbox[1] - pad)
    src = rgb[y0:y0 + a.shape[0], x0:x0 + a.shape[1]]
    vis = a[..., 3] > 0
    if not (np.all(a[..., 3][vis] == 255) and np.array_equal(a[..., :3][vis], src[vis])):
        raise AssertionError("sprite pixels differ from the source frame")


def sprite_hash(img: Image.Image) -> int:
    a = np.asarray(img)
    gray = cv2.cvtColor(a[..., :3], cv2.COLOR_RGB2GRAY)
    gray = np.where(a[..., 3] > 0, gray, 0).astype(np.uint8)
    return dhash(gray, 16)


# ------------------------------------------------------------ extraction

def drop_from_manifest(out_root: Path, ep: str) -> None:
    """Remove an episode's lines from manifest.jsonl before it is extracted again."""
    manifest = out_root / "manifest.jsonl"
    if not manifest.exists():
        return
    lines = manifest.read_text(encoding="utf-8").splitlines()
    keep = [l for l in lines if l.strip() and json.loads(l).get("episode") != ep]
    if len(keep) != len(lines):
        manifest.write_text("".join(l + "\n" for l in keep), encoding="utf-8")


def process_episode(video: Path, out_root: Path, matter: Matter, cfg: Config) -> list[dict]:
    ep = episode_name(video)
    ep_dir = out_root / ep
    done = ep_dir / ".done"
    if done.exists():
        print(f"[{ep}] already done, skipping")
        return []
    if ep_dir.exists():
        shutil.rmtree(ep_dir)  # partial run: start the episode over
    drop_from_manifest(out_root, ep)
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
            check_untouched(img, rgb, info["bbox"], cfg.pad)
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

# Character folder names of the sprite-short library (D:\Claude\chiikawa-sprites\characters\<name>).
LIBRARY_CHARACTERS = ["chiikawa", "hachiware", "usagi", "momonga", "kurimanju", "rakko", "shisa",
                      "furuhonya", "yoroi", "chiikabu"]
ALIASES = {"yoroi-san": "yoroi", "yoroi_san": "yoroi", "yoroisan": "yoroi", "armor": "yoroi"}

ROSTER = """Known Chiikawa characters (use exactly these names, lowercase). Tell them apart by these cues:
- chiikawa: WHITE, small round bear ears on top, pink blush, no markings at all on the head
- hachiware: WHITE, with a BLUE-GRAY patch shaped like a cat's ears/cap over the top of the head
- usagi: CREAM/YELLOW body, two LONG upright rabbit ears with pink insides (yellow = usagi, never chiikawa)
- momonga: small WHITE flying squirrel with LARGE dark blue-gray ears and a big fluffy tail
- kurimanju: brown chestnut-bun shaped body with a pale bottom, often holding a drink
- rakko: tan/brown sea otter with a mane-like face, carries a sword
- shisa: small lion-dog with an orange/yellow mane
- furuhonya: shaggy, hairy creature with glasses
- yoroi: a figure in GRAY METAL ARMOR with a helmet (no ears, no blush, no visible fur)
- chiikabu: use only if you are sure
Anyone else: "other:<short description>". Enemy creatures: "monster:<short description>".
Rules: name every character visible in a cell, including ones seen from behind, partly hidden or cut off by the
cell edge (a white round back with small round ears is chiikawa). Food, cups, crackers, tools or furniture
without a face are props, not characters. If you are unsure who it is, say "other:<description>" rather
than guessing a name."""

# The sprite-short pose rows (cutout_sheets.py ROWS) and what each one means.
POSES = ["idle", "happy", "cheer", "sleep", "desk", "power", "dash"]
POSE_HELP = ("idle = standing/neutral, happy = smiling/shy/blushing, cheer = jumping/dancing/arms up, "
             "sleep = sleeping/lying down, desk = busy with something in hand (eating, reading, working), "
             "power = determined/fighting/weapon raised, dash = running/flying/moving fast")
# Theme folders (characters\theme-<theme>). Edit this list to change them.
THEMES = ["eating", "cooking", "working", "fighting", "running", "crying", "laughing", "shy", "scared",
          "angry", "surprised", "sleeping", "celebrating", "hugging", "music", "rain"]

TAG_SCHEMA = {
    "type": "object",
    "properties": {
        "is_character": {"type": "boolean",
                         "description": "True if the cut-out mainly shows one or more characters (not scenery, text, an object alone, or a matting error)."},
        "characters": {"type": "array", "items": {"type": "string"},
                       "description": "Names of every character visible, one entry per character."},
        "interaction": {"type": "boolean",
                        "description": "True if 2+ characters overlap, touch or clearly interact."},
        "props": {"type": "array", "items": {"type": "string"},
                  "description": "Accessories, held items, costumes (e.g. 'stick', 'pochette', 'hat', 'mushroom')."},
        "weapons": {"type": "array", "items": {"type": "string"},
                    "description": "Weapons held or worn (e.g. 'stick', 'sword', 'spear', 'tweezers')."},
        "action": {"type": "string",
                   "description": "1-3 lowercase words for what the lead character does, e.g. 'eating rice ball', 'running', 'crying'."},
        "pose": {"type": "string", "enum": POSES, "description": "Closest pose row: " + POSE_HELP},
        "facing": {"type": "string", "enum": ["front", "side", "back"],
                   "description": "Which way the lead character faces."},
        "cut_off": {"type": "string", "enum": ["none", "bottom", "other"],
                    "description": "none = whole body visible; bottom = only the lower body is cut off (a bust); "
                                   "other = cut off at the top or sides, or a large part missing."},
        "themes": {"type": "array", "items": {"type": "string", "enum": THEMES},
                   "description": "0-3 themes that clearly fit what is visible (no rain unless rain or umbrellas show)."},
        "has_text": {"type": "boolean",
                     "description": "True if subtitles, captions, watermarks or other written text overlap the cut-out."},
        "quality": {"type": "integer",
                    "description": "1-5 usefulness as a clean sprite for a short video (5 = clean outline, no leftover background)."},
    },
    "required": ["is_character", "characters", "interaction", "props", "weapons", "action", "pose", "facing",
                 "cut_off", "themes", "has_text", "quality"],
    "additionalProperties": False,
}

# Request options per model family. Haiku 4.5 rejects `effort`; server-side fallbacks only exist on newer models.
NO_EFFORT_MODELS = ("claude-haiku-4-5", "claude-sonnet-4-5")
FALLBACK_MODELS = ("claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5", "claude-fable-5-1")
PRICE_PER_MTOK = {"claude-opus-5-5": (4, 20), "claude-sonnet-5-5": (2, 10), "claude-haiku-4-5": (1, 5)}
SHEET_PIXELS = 1_150_000   # the API scales larger images down to about this, so a sheet is built at this size
FRAME_W, FRAME_H = 1920, 1080   # fallback when the episode's frame JPG isn't there


def sheet_schema() -> dict:
    item = {**TAG_SCHEMA, "properties": {"n": {"type": "integer", "description": "The cut-out's number on the sheet."},
                                         **TAG_SCHEMA["properties"]},
            "required": ["n"] + TAG_SCHEMA["required"]}
    return {"type": "object", "properties": {"items": {"type": "array", "items": item}},
            "required": ["items"], "additionalProperties": False}


def request_options(model: str) -> dict:
    output_config: dict = {"format": {"type": "json_schema", "schema": sheet_schema()}}
    if model not in NO_EFFORT_MODELS:
        output_config["effort"] = "low"
    opts: dict = {"output_config": output_config}
    if model in FALLBACK_MODELS:
        opts.update(betas=["server-side-fallback-2026-07-01"], fallbacks="default")
    return opts


def grid(n: int) -> tuple[int, int, int]:
    """(columns, rows, cell px) for a contact sheet of n cut-outs, at most SHEET_PIXELS and 768 px per cell."""
    cols = max(1, round((n * 4 / 3) ** 0.5))
    rows = -(-n // cols)
    return cols, rows, min(768, int((SHEET_PIXELS / (cols * rows)) ** 0.5))


def contact_sheet(paths: list[Path]) -> Image.Image:
    """Cut-outs on neutral grey, one per numbered cell (1..n), separated by white lines."""
    from PIL import ImageDraw, ImageFont

    cols, rows, cell = grid(len(paths))
    sheet = Image.new("RGB", (cols * cell, rows * cell), (255, 255, 255))
    try:
        font = ImageFont.load_default(size=max(14, cell // 11))
    except TypeError:   # Pillow < 10.1
        font = ImageFont.load_default()
    draw = ImageDraw.Draw(sheet)
    for i, path in enumerate(paths):
        x, y = (i % cols) * cell, (i // cols) * cell
        tile = Image.new("RGBA", (cell - 4, cell - 4), (128, 128, 128, 255))
        img = Image.open(path).convert("RGBA")
        img.thumbnail((cell - 12, cell - 12))
        tile.alpha_composite(img, ((tile.width - img.width) // 2, (tile.height - img.height) // 2))
        sheet.paste(tile.convert("RGB"), (x + 2, y + 2))
        label = str(i + 1)
        box = draw.textbbox((x + 6, y + 6), label, font=font)
        draw.rectangle((box[0] - 3, box[1] - 2, box[2] + 3, box[3] + 2), fill=(255, 255, 255))
        draw.text((x + 6, y + 6), label, fill=(0, 0, 0), font=font)
    return sheet


def edges_hint(rec: dict, out_root: Path, sizes: dict) -> str:
    """Which frame edges a cut-out touches (from its bbox), e.g. 'bottom, left'."""
    if "bbox" not in rec:
        return "group shot"
    if rec["episode"] not in sizes:
        frame = out_root / rec["frame"] if rec.get("frame") else None
        sizes[rec["episode"]] = Image.open(frame).size if frame and frame.exists() else (FRAME_W, FRAME_H)
    w, h = sizes[rec["episode"]]
    x, y, bw, bh = rec["bbox"]
    sides = [s for s, hit in (("top", y <= 1), ("bottom", y + bh >= h - 1), ("left", x <= 1), ("right", x + bw >= w - 1)) if hit]
    return "touches frame edge: " + ", ".join(sides) if sides else "inside the frame"


def tag_sheet(client, model: str, image: Image.Image, hints: list[str]) -> dict[int, dict]:
    """Label every numbered cut-out on a sheet. Returns {number: tags}."""
    buf = io.BytesIO()
    image.save(buf, "JPEG", quality=90)
    text = ("This contact sheet shows numbered cut-outs (each on grey) from the anime Chiikawa, meant to be reused "
            "as character sprites in short videos. Label every number, judging each cell on its own: first count "
            "the characters in the cell, then name each one using the cues below.\n"
            "Where each cut-out sat in the video frame (a character touching the bottom edge is usually a bust):\n"
            + "\n".join(f"{i + 1}: {h}" for i, h in enumerate(hints)) + "\n\n" + ROSTER)
    response = client.beta.messages.create(
        model=model,
        max_tokens=min(16000, 400 + 250 * len(hints)),
        messages=[{"role": "user", "content": [
            {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg",
                                         "data": base64.standard_b64encode(buf.getvalue()).decode()}},
            {"type": "text", "text": text},
        ]}],
        **request_options(model),
    )
    if response.stop_reason in ("refusal", "max_tokens"):
        return {}
    text = next((b.text for b in response.content if b.type == "text"), None)
    items = json.loads(text)["items"] if text else []
    return {it.pop("n"): it for it in items if 1 <= it.get("n", 0) <= len(hints)}


def slug(s: str) -> str:
    return re.sub(r"[^\w-]+", "-", s.strip().lower()).strip("-_")[:40] or "unknown"


def load_jsonl(path: Path) -> dict[str, dict]:
    """{file: record}; later lines win."""
    out: dict[str, dict] = {}
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                r = json.loads(line)
                out[r["file"]] = r
    return out


def estimate_cost(model: str, n: int, per_sheet: int) -> str:
    price = PRICE_PER_MTOK.get(model)
    if not price:
        return "unknown model price"
    sheets = -(-n // per_sheet)
    # per sheet: ~1,550 image tokens + ~600 prompt tokens + 25 per hint in; ~120 out per cut-out + 150
    usd = sheets * ((2150 + 25 * per_sheet) * price[0] + (150 + 120 * per_sheet) * price[1]) / 1e6
    return f"{sheets} sheets of up to {per_sheet}, roughly ${usd:.2f}"


def tag_all(out_root: Path, model: str, workers: int, assume_yes: bool, per_sheet: int,
            keep_sheets: bool) -> dict[str, dict]:
    """Tag every cut-out in manifest.jsonl that isn't in tags.jsonl yet, per_sheet at a time on a contact sheet.
    Returns {file: tagged record}."""
    records = {f: r for f, r in load_jsonl(out_root / "manifest.jsonl").items() if (out_root / f).exists()}
    tags_file = out_root / "tags.jsonl"
    done = {f: r for f, r in load_jsonl(tags_file).items() if f in records}
    todo = [r for f, r in sorted(records.items()) if f not in done]
    print(f"{len(records)} cut-outs in manifest.jsonl, {len(done)} already tagged, {len(todo)} to tag with {model} "
          f"({estimate_cost(model, len(todo), per_sheet)}).")
    if not todo:
        return done
    if not assume_yes and input("Send them to the Anthropic API now? [y/N] ").strip().lower() != "y":
        print("Tagging skipped.")
        return done

    import anthropic

    client = anthropic.Anthropic()
    lock = threading.Lock()
    sizes: dict[str, tuple[int, int]] = {}
    batches = [todo[i:i + per_sheet] for i in range(0, len(todo), per_sheet)]
    sheet_dir = out_root / "tag_sheets"
    if keep_sheets:
        sheet_dir.mkdir(exist_ok=True)

    def work(batch: list[dict]) -> None:
        first = Path(batch[0]["file"]).stem
        try:
            image = contact_sheet([out_root / r["file"] for r in batch])
            with lock:
                hints = [edges_hint(r, out_root, sizes) for r in batch]
            if keep_sheets:
                image.save(sheet_dir / f"{first}.jpg", quality=90)
            tags = tag_sheet(client, model, image, hints)
        except anthropic.RateLimitError:
            print(f"  rate limited at {first}; re-run --tag-only later to finish", file=sys.stderr)
            return
        except anthropic.APIStatusError as e:
            print(f"  API error {e.status_code} at {first}: {e.message}", file=sys.stderr)
            return
        except anthropic.APIConnectionError as e:
            print(f"  connection error at {first}: {e}", file=sys.stderr)
            return
        except (ValueError, KeyError) as e:   # unreadable answer: leave the batch for the next run
            print(f"  bad answer at {first}: {e}", file=sys.stderr)
            return
        with lock:
            with open(tags_file, "a", encoding="utf-8") as f:
                for k, rec in enumerate(batch, 1):
                    if k in tags:
                        out = {**rec, "tags": tags[k]}
                        done[rec["file"]] = out
                        f.write(json.dumps(out) + "\n")
            print(f"  {len(done)}/{len(records)} tagged")

    with ThreadPoolExecutor(max_workers=workers) as pool:
        list(pool.map(work, batches))
    return done


# ---------------------------------------------------------- duplicates

DUP_SIZE = 48         # signatures compare cut-outs scaled to 48x48
DUP_MIN_OVERLAP = 0.8  # shapes must overlap at least this much (intersection over union)


def dup_signature(path: Path) -> tuple[np.ndarray, np.ndarray, float, int]:
    """(rgb 48x48, mask 48x48, aspect ratio, opaque pixels) of a cut-out, cropped to its visible part."""
    img = Image.open(path).convert("RGBA")
    img = img.crop(img.getbbox() or (0, 0, 1, 1))
    a = np.asarray(img)
    grey = np.full(a.shape[:2] + (3,), 128, np.uint8)
    rgb = np.where(a[..., 3:] > 0, a[..., :3], grey)
    small = np.asarray(Image.fromarray(rgb).resize((DUP_SIZE, DUP_SIZE), Image.BILINEAR)).astype(np.int16)
    mask = np.asarray(img.getchannel("A").resize((DUP_SIZE, DUP_SIZE), Image.BILINEAR)) > 127
    return small, mask, img.width / img.height, int((a[..., 3] > 0).sum())


def is_duplicate(p, q, max_diff: float) -> bool:
    if abs(p[2] - q[2]) > 0.15 * max(p[2], q[2]):
        return False
    union = p[1] | q[1]
    if (p[1] & q[1]).sum() < DUP_MIN_OVERLAP * max(1, union.sum()):
        return False
    diff = np.abs(p[0] - q[0]).mean(-1) * union
    if diff.sum() > max_diff * union.sum():
        return False
    # any local change (eyes, mouth, a raised arm) keeps both: no 4x4 block may differ by more than 2x max_diff
    n = DUP_SIZE // 4
    blocks = diff.reshape(n, 4, n, 4).sum((1, 3)) / np.maximum(1, union.reshape(n, 4, n, 4).sum((1, 3)))
    return float(blocks.max()) <= 2 * max_diff


def dedupe(out_root: Path, max_diff: float, assume_yes: bool) -> None:
    """Delete near-identical cut-outs within each episode, keeping the most complete one of each set.

    Cut-outs whose shapes overlap >= 80%, whose colours differ by <= max_diff (0-255, mean over the shape) and
    by <= 2x max_diff in every 4x4 block of a 48x48 thumbnail (so a changed face or arm is kept) count as
    duplicates. The kept one is the one not touching the frame edge, then the largest. Deleted files
    leave manifest.jsonl and tags.jsonl, and dedupe_log.jsonl records which file each one duplicated.
    Only files in the output folder are touched.
    """
    manifest = out_root / "manifest.jsonl"
    records = {f: r for f, r in load_jsonl(manifest).items() if (out_root / f).exists()}
    by_ep: dict[str, list[dict]] = {}
    for r in records.values():
        by_ep.setdefault(r["episode"], []).append(r)
    drop: dict[str, str] = {}
    for n, (ep, recs) in enumerate(sorted(by_ep.items()), 1):
        sigs = {r["file"]: dup_signature(out_root / r["file"]) for r in recs}
        recs.sort(key=lambda r: (bool(r.get("touches_edge")), -sigs[r["file"]][3], r["file"]))
        kept: list[dict] = []
        for r in recs:
            twin = next((k for k in kept if is_duplicate(sigs[r["file"]], sigs[k["file"]], max_diff)), None)
            if twin:
                drop[r["file"]] = twin["file"]
            else:
                kept.append(r)
        print(f"  [{n}/{len(by_ep)}] {ep[:12]}: {len(recs)} cut-outs, {len(recs) - len(kept)} duplicates")
    print(f"{len(drop)} of {len(records)} cut-outs are near-duplicates (colour difference <= {max_diff}).")
    if not drop:
        return
    if not assume_yes and input("Delete them from the output folder? [y/N] ").strip().lower() != "y":
        print("Nothing deleted.")
        return
    with open(out_root / "dedupe_log.jsonl", "a", encoding="utf-8") as f:
        for gone, twin in drop.items():
            f.write(json.dumps({"file": gone, "duplicate_of": twin}) + "\n")
            (out_root / gone).unlink()
    for name in ("manifest.jsonl", "tags.jsonl"):
        path = out_root / name
        if path.exists():
            lines = path.read_text(encoding="utf-8").splitlines()
            keep = [l for l in lines if l.strip() and json.loads(l)["file"] not in drop]
            path.write_text("".join(l + "\n" for l in keep), encoding="utf-8")
    print(f"Deleted {len(drop)} duplicates; {len(records) - len(drop)} cut-outs left. Log: dedupe_log.jsonl")


# ------------------------------------------------------- library export

def character_folder(name: str) -> str | None:
    """Library folder for a tagged name, or None for side characters (other:/monster:/unknown)."""
    n = slug(name)
    n = ALIASES.get(n, n)
    return n if n in LIBRARY_CHARACTERS else None


def short_episode(ep: str) -> str:
    return slug(ep if len(ep) <= 12 else ep[:8])


def library_dest(rec: dict) -> tuple[str, str] | None:
    """(folder relative to characters/, file name) for a tagged cut-out, or (review/<why>, name), or None."""
    tags = rec.get("tags")
    stamp = Path(rec["file"]).stem.rsplit("_", 3)
    stamp = "-".join(stamp[1:]) if len(stamp) == 4 else Path(rec["file"]).stem
    base = f"ep-{short_episode(rec['episode'])}-{slug(stamp)}"
    if not tags or tags["quality"] <= 1:
        return "../review/rejected", base + ".png"
    if tags.get("has_text"):   # burned-in subtitles: not a clean sprite
        return "../review/text", f"{base}-{'+'.join(sorted(slug(c) for c in tags['characters'])) or 'none'}.png"
    names = [character_folder(c) or "other" for c in tags["characters"]]
    action = slug(tags["action"])
    extras = [x for x in (slug(x) for x in tags["weapons"] + tags["props"]) if x not in action][:2]
    words = "-".join(dict.fromkeys([action] + extras))
    if not tags["is_character"]:
        return ("props" if tags["quality"] >= 3 else "../review/rejected"), f"{base}-{words}.png"
    if tags["cut_off"] == "other":
        return "../review/partial", f"{base}-{'+'.join(sorted(set(names)))}-{words}.png"
    if rec["kind"] == "group" or len(names) >= 2:
        how = "interacting" if tags["interaction"] else "together"
        bust = "" if tags["cut_off"] == "none" else "-bust"
        return "group", f"{base}-{'+'.join(sorted(set(names)))}-{how}{bust}-{words}.png"
    lead = names[0] if names else "other"
    folder = "misc" if lead == "other" else lead
    return (folder if tags["cut_off"] == "none" else f"{folder}/bust"), f"{base}-{words}.png"


def place(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        dest.unlink()
    shutil.copy2(src, dest)


def link(src: Path, dest: Path) -> None:
    """Hard link (no extra disk space on the same drive); copy if linking isn't possible."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        dest.unlink()
    try:
        os.link(src, dest)
    except OSError:
        shutil.copy2(src, dest)


def export_library(out_root: Path, lib_root: Path, tagged: dict[str, dict]) -> None:
    """Copy tagged cut-outs into a sprite-short library:

      <lib_root>/characters/<name>/        whole single characters (cutout_sheets.py pose stills)
      <lib_root>/characters/<name>/bust/   singles cut off at the bottom
      <lib_root>/characters/group/         2+ characters (library_images.py / showcase)
      <lib_root>/characters/misc/          side characters and monsters
      <lib_root>/characters/props/         objects without a character
      <lib_root>/characters/theme-<theme>/  hard links of the above, by theme (flat, so --list works)
      <lib_root>/poses.json                pose picks for cutout_sheets.py (best first)
      <lib_root>/index.jsonl               one line per exported file with its source and tags
      <lib_root>/review/{partial,rejected}/  not used by the skill

    Only files listed in the previous index.jsonl are ever removed, so the folder can sit next to other assets.
    """
    chars = lib_root / "characters"
    index_path = lib_root / "index.jsonl"
    for old in load_jsonl(index_path):   # remove what the last export wrote, nothing else
        for p in [lib_root / old] + [chars / f"theme-{t}" / Path(old).name for t in THEMES]:
            if p.exists():
                p.unlink()

    index, poses = [], {}
    counts: dict[str, int] = {}
    for rec in sorted(tagged.values(), key=lambda r: r["file"]):
        src = out_root / rec["file"]
        dest = library_dest(rec)
        if dest is None or not src.exists():
            continue
        folder, name = dest
        rel = (Path("characters") / folder / name).as_posix().replace("characters/../", "")
        place(src, lib_root / rel)
        tags = rec.get("tags") or {}
        index.append({"file": rel, "source": rec["file"], "episode": rec["episode"], "time": rec["time"],
                      "frame": rec.get("frame"), "tags": tags})
        top = folder.split("/")[0] if not folder.startswith("..") else folder[3:]
        counts[top] = counts.get(top, 0) + 1
        if rel.startswith("characters/"):
            for theme in tags.get("themes", []):
                if theme in THEMES:
                    link(lib_root / rel, chars / f"theme-{theme}" / name)
        if folder in LIBRARY_CHARACTERS:  # whole single character: candidate pose still
            poses.setdefault(folder, []).append((tags["pose"], tags["facing"] != "front", -tags["quality"], name))

    with open(index_path, "w", encoding="utf-8") as f:
        for r in index:
            f.write(json.dumps(r) + "\n")

    pose_json = {c: {p: [n for q, _, _, n in sorted(v) if q == p] for p in POSES if any(q == p for q, *_ in v)}
                 for c, v in sorted(poses.items())}
    pose_path = lib_root / "poses.json"
    if pose_path.exists() and not (lib_root / ".sprite_export").exists():
        pose_path = lib_root / "poses_episodes.json"   # never overwrite a hand-tagged poses.json
        print(f"  {lib_root / 'poses.json'} is not ours; wrote pose picks to {pose_path.name} instead")
    pose_path.write_text(json.dumps(pose_json, indent=1), encoding="utf-8")
    (lib_root / ".sprite_export").touch()
    print(f"Exported {len(index)} cut-outs to {lib_root}: " + ", ".join(f"{k} {v}" for k, v in sorted(counts.items())))
    print(f"  use with sprite-short: cutout_sheets.py <project> <names> --lib \"{chars}\"")


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
    p.add_argument("--outline-px", type=int, default=Config.outline_px,
                   help="How far the cut edge may grow to include the drawn outline")
    p.add_argument("--no-frames", action="store_true", help="Don't save the full source frames")
    p.add_argument("--limit", type=int, default=0, help="Only process the first N episodes (for a trial run)")
    p.add_argument("--tag", action="store_true",
                   help="Label sprites with Claude and export the library (needs ANTHROPIC_API_KEY)")
    p.add_argument("--tag-only", action="store_true", help="Skip extraction; only tag and export what's in the output folder")
    p.add_argument("--export-only", action="store_true",
                   help="No extraction, no API calls: rebuild the library from tags.jsonl")
    p.add_argument("--library", type=Path, default=None,
                   help="Where to export the sprite-short library (default: <output>/library)")
    p.add_argument("--claude-model", default="claude-opus-5-5")
    p.add_argument("--workers", type=int, default=4)
    p.add_argument("--yes", action="store_true", help="Don't ask before sending cut-outs to the API")
    p.add_argument("--per-sheet", type=int, default=12,
                   help="Cut-outs per contact sheet sent in one API call (1 = one image per call, best detail)")
    p.add_argument("--dedupe", action="store_true",
                   help="Delete near-identical cut-outs per episode (asks first; runs before tagging)")
    p.add_argument("--dup-threshold", type=float, default=30,
                   help="Max mean colour difference (0-255) for two cut-outs to count as duplicates")
    p.add_argument("--keep-sheets", action="store_true", help="Save the contact sheets to <output>/tag_sheets")
    args = p.parse_args()

    cfg = Config(sample_fps=args.sample_fps, scene_threshold=args.scene_threshold, max_gap=args.max_gap,
                 min_sharpness=args.min_sharpness, min_area=args.min_area, outline_px=args.outline_px, skip_start=args.skip_start,
                 skip_end=args.skip_end, max_frames=args.max_frames, save_frames=not args.no_frames)
    out_root = args.output
    out_root.mkdir(parents=True, exist_ok=True)

    if not (args.tag_only or args.export_only or args.dedupe):
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

    if args.dedupe:
        dedupe(out_root, args.dup_threshold, args.yes)

    if args.tag or args.tag_only or args.export_only:
        if args.export_only:
            records = load_jsonl(out_root / "manifest.jsonl")
            tagged = {f: r for f, r in load_jsonl(out_root / "tags.jsonl").items() if f in records}
        else:
            tagged = tag_all(out_root, args.claude_model, args.workers, args.yes, max(1, args.per_sheet),
                             args.keep_sheets)
        export_library(out_root, args.library or out_root / "library", tagged)


if __name__ == "__main__":
    main()
