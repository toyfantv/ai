# Crash Sandbox: the edit pipeline

Post-production for the Roblox Crash Sandbox takes: one recorded take in, several finished cuts out
(plain, anime, cinematic, shorts; 16:9 and vertical), driven by the take's **timeline sidecar**.
Copy `tools/edit/` and `tools/produce.py` into `D:\Claude\crash-sandbox\tools\`; the `docs/` and
`game_drafts/` folders are the spec and draft code for the game side.

```
python tools/produce.py haru_bike                             # sync, record, edit, contact sheet
python tools/produce.py haru_bike --recipes anime,shorts --takes 2
python tools/produce.py haru_bike --from edit                 # re-edit the last take
python tools/produce.py --video recordings/haru_bike_20261004_174731.mp4   # any existing take
```

Outputs: `recordings/<scene>/<take>/<recipe>_<aspect>.mp4` and `contact_sheet.png` (thumbnails of
each cut's key moments, one row per cut and aspect).

Requirements: Python 3.11, ffmpeg 6+ on PATH, `pip install numpy opencv-python Pillow PyYAML`.
Encodes with `h264_nvenc` when it works, else `libx264` (`--no-gpu` forces libx264).

Proof renders on the synthetic stand-in take (all four recipes, every recipe under 2 min for a
15 s 1080p60 take on 4 CPU cores with libx264): [contact sheet](docs/proof/contact_sheet_standin.jpg),
[anime frames](docs/proof/anime_frames_standin.jpg) (intro cards, face panels, impact frame, speed lines).

## What's tested and what isn't

| Part | Status |
|---|---|
| `tools/edit/` (the editor), recipes, `produce.py --video` / `--from edit` | Tested here on a synthetic stand-in take that follows the haru_bike timeline (`python -m edit.testclip`, run from `tools/`). |
| The editor on the real sample takes | **Not yet run here**: the sample videos weren't available to this session. |
| `produce.py` sync / record / iso steps | **Untested**: they call `sync.py` / `record.py`, which need Studio and OBS. |
| `game_drafts/*` (timeline logging, ISO passes) | **Draft, untested.** The merge in `take_timeline.py` was unit-checked. |

## How it works

1. **Timeline** (`edit/timeline.py`, spec in [docs/TIMELINE_SPEC.md](docs/TIMELINE_SPEC.md)):
   cuts, dialogue, events, sounds and per-character screen tracks, all in seconds after GO.
2. **Recipe** (`edit/recipes/*.yaml`): rules of the form *on these timeline moments, do these
   actions*. New styles are new YAML files, no code.
3. **Plan** (`edit/plan.py`): the rules compile into a **time map** (which source moment each output
   frame shows: hit-stops, speed ramps, dead-air trims, the shorts hook) and effect windows placed on
   output frames, plus sound cues.
4. **Render** (`edit/render.py`): frames stream from ffmpeg, go through one camera warp (reframe for
   the aspect, punch-ins, shake), the grade, the per-frame effects and overlays, and stream back into
   ffmpeg with the rebuilt audio. No intermediate image sequences.
5. **Audio** (`edit/audio.py`): the take's audio follows the same time map: tape-style pitch-down in
   slow-mo, a decaying stutter of the contact sound during hit-stops, a tape-rewind for the hook;
   then the edit's SFX on top and two-pass loudness normalisation to -14 LUFS.

### Recipes

| Recipe | What it does |
|---|---|
| `plain` | The take as recorded, loudness-normalised. Captions available (off: the game draws bubbles). |
| `anime` | Freeze-frame name cards when main characters first appear; on the climax a 6-frame hit-stop, ink / inverted / red impact frames with concentration lines, heavy shake, "KABOOM!", speed lines and a punch-in on the victim; on power moves and hits a shorter hit-stop and impact flash, then **manga face panels** of who did it and who it hit; speed lines on leaps, small shakes and sound words on landings. |
| `cinematic` | A clean title card, slow push-ins on close-ups, a speed ramp to 0.3x through the climax (optical-flow slow-mo, then snap back) with a riser and boom, a subtle warm grade. No vignette, no letterbox bars. |
| `shorts` | Vertical. Opens on the climax as a hook, tape-rewinds to the start, trims dead air, big captions coloured by speaker, the anime hits on the climax, and the last frames crossfade into the first so it loops. |

### Recipe actions

Selectors (`on:`): `{climax: true}`, `{event: impact}` / `{event: [punch, kick], climax: false, who: goku, min_speed: 80}`,
`{first_appearance: main}`, `{dialogue: true}`, `{cut: close}`, `{start: true}`; plus `max:` and `min_gap:`.

Actions (`do:`), each with an optional `delay:` in seconds:

| Action | Parameters (defaults) |
|---|---|
| `hitstop` | `frames` (4): freeze on the moment |
| `freeze` | `seconds` (0.5) |
| `slowmo` | `speed` (0.35), `before` (0.3), `after` (1.2), `ease_in`, `ease_out` |
| `impact_frames` | `sequence` of `ink`, `invert`, `red`, `gold`, `blue`, `none`; `hold` frames each (1) |
| `flash` | `frames` (4), `color`, `strength` (0.85) |
| `shake` | `frames` (12), `amp` (fraction of height, 0.025), `rot` degrees (1.2) |
| `speed_lines` | `seconds` (0.5), `color`, `opacity` (0.75) |
| `radial_blur` | `frames` (10), `strength` (0.07) |
| `punch_in` | `zoom` (1.3), `in_frames` (4), `hold_frames` (24), `out_frames` (10) |
| `push_in` | `zoom` (1.07), over the cut or line |
| `onomatopoeia` | `text` (else the recipe's `words:` map by event kind), `frames` (42), `size`, `fill` |
| `intro_card` | `seconds` (0.8), `subtitle` (a `characters` field, e.g. `role`; off by default) |
| `face_panels` | `who` (`auto` = the event's subject and target, vehicles resolved to drivers), `also`, `seconds` (0.8), `max` (3) |
| `sfx` | `name`, `gain` (0.8), `offset` |

Global recipe keys: `aspects` (`wide`, `4x5`, `9x16`, `1x1`), `grade`, `audio` (`loudness`, `freeze`:
`stutter`/`silence`/`ring`, `slow_gain`), `captions`, `range` (`end: auto` = last event + `tail`),
`trim_dead_air`, `hook`, `loop`, `title_card`, `words`, `smooth_slowmo`.

### Sound effects

`boom`, `hit`, `thud`, `whoosh`, `zap`, `shing`, `riser`, `pop` are synthesized so every recipe
renders out of the box. Drop your own `tools/edit/sfx/<name>.wav` (or mp3/ogg/flac) to replace one,
or add new names and use them in recipes (e.g. a `laugh.wav` for a laugh-track rule).

### Framing

The 16:9 master is reframed for vertical: with `tracks`, the crop follows the subject of each shot
(smoothed, snapped on cuts); without them it uses the centre, which record.py already composes
for. Effects are drawn after reframing, so text and panels are laid out for each aspect.

### Face panels

Close-ups come from, in order: an ISO pass of that character ([docs/ISO_PASSES.md](docs/ISO_PASSES.md)),
the tracked head box, or the shot that features them (close-ups first). From a wide shot of the
~690 px tall Studio view those crops are soft; ISO passes fix that.

## Open questions for you

1. **Fonts.** Sound words and cards use Bangers, headlines Anton (both SIL OFL, bundled in
   `tools/edit/fonts/`). Want a different comic font? Drop it in that folder and name it in `text.py`.
2. **Sound words.** The default `words:` map is English ("KABOOM!", "HONK!"). Want Japanese-style
   ones ("ドン!", "ゴゴゴ") as an option for the anime cut? It needs a font with kana.
3. **Intro cards.** They freeze 0.75 s for each main character (up to 3). Too many for a 15 s
   short? The shorts recipe skips them.
4. **Slow-mo audio.** Cinematic uses tape-style pitch-down. Prefer the original pitch (time-stretch)
   or a music-friendly mute plus SFX bed?
5. **Captions.** Off for plain/anime/cinematic since the game draws bubbles; on and big for shorts.
6. **Music.** Nothing is added. A `music:` key that ducks under SFX would be easy if you want to drop
   your own tracks in.
7. **Climax.** The timeline marks it (`climax: true`) or the fastest impact wins. Should the scene
   format get an explicit `climax = "..."` field?
