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
python extract_sprites.py "C:\Users\liwos\AppData\Local\Alt.Binz\download\Chiikawa.S01.2022.1080p.WEB-DL.H.264.AAC-ADWeb (1)" -o D:\chiikawa_sprites --limit 2
```

Then run without `--limit` for the whole season. Finished episodes are skipped on re-run.

Add labeling and sorting (needs an Anthropic API key):

```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
python extract_sprites.py "<episodes folder>" -o D:\chiikawa_sprites --tag
# or tag what was already extracted:
python extract_sprites.py "<episodes folder>" -o D:\chiikawa_sprites --tag-only
```

Tagging sends one image per cut-out. A season produces thousands of them. To
cut cost, use `--claude-model claude-haiku-4-5`, or tag a trial batch first.
Tagging can be resumed: already-tagged files are skipped.

## Output

```
D:\chiikawa_sprites\
  S01E001\
    frames\   full source frames (one per shot), for reference
    sprites\  one PNG per character blob (single, or overlapping/interacting)
    groups\   all characters of a multi-character shot in one PNG
  manifest.jsonl   one line per cut-out: episode, timestamp, bbox, touches_edge...
  tags.jsonl       (--tag) Claude's labels per cut-out
  sorted\          (--tag) copies sorted into:
    single\<character>\           clean single character
    with_props\<character>\       character with accessories
    with_weapon\<character>\      character holding/wearing a weapon
    interacting\<a+b>\            overlapping / interacting characters
    together\<a+b>\               characters sharing a shot without touching
    partial\<names>\              cut off by the frame edge or messy cut-out
    rejected\                     not a character (scenery, matte errors)
```

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
  `--tag` puts those into `partial\` or `rejected\`, and `touches_edge` in the manifest flags
  characters cut off by the frame.
- It runs on CPU by default. For a big speed-up on an NVIDIA GPU, install `rembg[gpu]` instead of `rembg[cpu]`.
