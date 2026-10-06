# Chiikawa sprite extractor

Pulls character cut-outs (transparent PNGs) out of Chiikawa episodes for use in
sprite-based short videos:

- **Single characters**: one sprite per character in a shot.
- **Interacting characters**: characters that overlap or touch come out as one sprite.
- **Group shots**: when 2+ separate characters share a shot, all of them in one PNG.
- **Accessories and weapons**: held items such as sticks, pochettes or swords stay attached to the character.
- **Optional `--tag`**: Claude labels every cut-out and sorts it by character, interaction and props/weapons.

The episode files don't need an extension. Any file OpenCV can decode as video is used.

## Cut-outs keep the original pixels

The AI model only decides **which** pixels belong to a character. Every visible
pixel in a sprite is the exact pixel from the episode frame. Nothing is
regenerated, recoloured, resized or blended:

- Alpha is strictly on/off (255 or 0), with no semi-transparent edge blending.
- The model's rough edge is snapped outward to the drawn dark outline, so the linework is kept whole.
- Small holes the model punches inside a character (eyes, mouth, white fur) are filled with the original pixels.
- Before each sprite is saved, the script checks that it matches the source frame pixel for pixel.
- PNGs are lossless and are full resolution (1080p).

The trade-off of hard edges: a 1-pixel fringe of the episode's anti-aliased
outline (a bit of background tint) can remain around a character.
`--outline-px` sets how far the edge may grow to catch the outline.

## Setup (Windows, once)

```powershell
cd C:\path\to\ai\chiikawa_sprites
py -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

The first run downloads the anime matting model (`isnet-anime`, about 170 MB) to `%USERPROFILE%\.rembg`.

## Run

Do a trial on 2 episodes first:

```powershell
python extract_sprites.py "C:\Users\liwos\AppData\Local\Alt.Binz\download\Chiikawa.S01.2022.1080p.WEB-DL.H.264.AAC-ADWeb (1)" -o D:\Claude\chiikawa-sprites\anime\episodes --limit 2
```

Then run without `--limit` for the whole season. Finished episodes are skipped on re-run.

## Sprite-short library (optional, uses the Anthropic API)

`--tag` asks Claude to label every cut-out and then exports a library in the
layout the **sprite-short** skill reads (`cutout_sheets.py --lib`, `library_images.py --lib`).
Extract into a working folder, then tag and export next to the existing library:

```powershell
# 1. extract (free, local)
python extract_sprites.py "<episodes folder>" -o D:\Claude\chiikawa-sprites\anime\episodes
# 2. tag + export (paid). Set the key in your own window first: $env:ANTHROPIC_API_KEY = "..."
python extract_sprites.py "<episodes folder>" -o D:\Claude\chiikawa-sprites\anime\episodes --tag-only `
    --library D:\Claude\chiikawa-sprites\anime --claude-model claude-haiku-4-5
# rebuild the library from tags.jsonl without any API calls (e.g. after editing THEMES):
python extract_sprites.py "<episodes folder>" -o D:\Claude\chiikawa-sprites\anime\episodes --export-only `
    --library D:\Claude\chiikawa-sprites\anime
```

Cut-outs are sent 12 at a time on a numbered contact sheet (one API call per sheet, ~309 px per cut-out),
together with which frame edges each one touched. `--per-sheet 1` sends each cut-out on its own at up to
768 px (more detail, ~4x the cost); `--keep-sheets` saves the sheets to `<output>\tag_sheets\` for checking.
Before sending anything, the script prints the number of sheets and a rough cost, and asks for confirmation
(`--yes` skips the question). Tagging resumes: already-tagged files are skipped, and a sheet whose answer
is missing a number leaves that cut-out for the next run.
Rough cost for 11,000 cut-outs at 12 per sheet: Haiku 4.5 ~$10, Sonnet 5.5 ~$20, Opus 5.5 ~$40.
Try a copy of 1-2 episodes first.

```
D:\Claude\chiikawa-sprites\anime\
  characters\
    chiikawa\ hachiware\ usagi\ ...   whole single characters (pose stills for cutout_sheets.py)
      bust\                           cut off at the bottom (stickers sliding up from the bottom)
    group\                            2+ characters ("interacting" or "together" in the name)
    misc\                             side characters and monsters
    props\                            objects without a character
    theme-eating\ theme-rain\ ...      the same files again, by theme (hard links: no extra space)
  poses.json        pose picks per character, best first (front-facing, highest quality)
  index.jsonl       every exported file with its source episode, time and Claude's tags
  review\partial\   cut off at the top/sides, not used by the skill
  review\rejected\  not a character or poor cut-out
  episodes\         the extraction output (-o): per-episode sprites, manifest.jsonl, tags.jsonl
```

File names start with `ep-<episode>-<time>` followed by the action, props and characters, for example
`ep-0162bceb-01m12-50s-0-eating-rice-ball.png`. Use the library with sprite-short:

```powershell
python %SK%\cutout_sheets.py D:\Claude\animations\<name> chiikawa usagi --lib D:\Claude\chiikawa-sprites\anime\characters
python %SK%\library_images.py D:\Claude\animations\<name> --list theme-eating --lib D:\Claude\chiikawa-sprites\anime\characters
```

The export never touches the hand-curated `D:\Claude\chiikawa-sprites\characters` library. Re-exporting
only removes files the previous export wrote (listed in `index.jsonl`), and an existing `poses.json` that
the export didn't write is left alone (the picks then go to `poses_episodes.json`). Theme names are the
`THEMES` list in `extract_sprites.py`; character folders are `LIBRARY_CHARACTERS`.

## Output

```
<-o folder>\
  <episode>\
    frames\   full source frames (one per shot), for reference
    sprites\  one PNG per character blob (single, or overlapping/interacting)
    groups\   all characters of a multi-character shot in one PNG
  manifest.jsonl   one line per cut-out: episode, timestamp, bbox, touches_edge...
  tags.jsonl       (--tag) Claude's labels per cut-out
```

Episode folders are named after the file name's `S01E001` part, or the whole file name when it has none.

## Tuning

| Flag | Default | Effect |
|---|---|---|
| `--sample-fps` | 2 | How often frames are checked |
| `--scene-threshold` | 10 | Lower = more frames kept per shot |
| `--max-gap` | 3 s | Also keep a frame at least this often within long shots (catches pose changes) |
| `--min-sharpness` | 40 | Drops motion-blurred frames; lower it if too few frames are kept |
| `--min-area` | 0.004 | Smallest sprite as a fraction of the frame |
| `--skip-start` / `--skip-end` | 0 | Seconds to skip, e.g. the opening/ending |
| `--model` | `isnet-anime` | rembg matting model; try `isnet-general-use` or `u2net` if cut-outs miss characters |
| `--outline-px` | 4 | How far the cut edge may grow to take in the drawn outline |
| `--no-frames` | off | Don't save the full frames |

Notes:
- The model can still misjudge *which* area is a character (leftover background or a missing piece).
  `--tag` puts those into `review\partial\` or `review\rejected\`, and `touches_edge` in the manifest flags
  characters cut off by the frame.
- It runs on CPU by default (about 1 minute per episode on a desktop CPU). For a speed-up on a recent NVIDIA GPU, install `rembg[gpu]` instead of `rembg[cpu]`. Current onnxruntime-gpu builds need CUDA 12/13 and have no kernels for GTX 10xx (Pascal) cards, so stay on CPU there. Never install `onnxruntime` and `onnxruntime-gpu` side by side: uninstalling one deletes the folder they share (fix with `pip install --force-reinstall --no-deps onnxruntime`).
