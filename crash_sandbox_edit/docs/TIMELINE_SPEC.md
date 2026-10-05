# Take timeline sidecar: `<video>.timeline.json`

Written by `record.py` next to every take (`recordings/<scene>_<stamp>.mp4` →
`recordings/<scene>_<stamp>.timeline.json`). It tells the editor what happens when, and where on
screen. **t = 0 is GO = the first frame of the video**; every time is in seconds from there.
JSON Schema: [`timeline.schema.json`](timeline.schema.json). Status of the game side: **draft, untested**
(see `game_drafts/`); the editor side is implemented and tested against the hand-made fixture.

Everything except `fps` and `duration` is optional: the editor degrades gracefully (no `tracks` →
centre framing and shot-based face crops; no `events` → only global effects such as grade and title).

```jsonc
{
  "version": 1,
  "scene": "haru_bike",                 // scene name (record.py argument)
  "title": "Learning to Ride",          // scene.title, used by title cards
  "fps": 60,
  "duration": 14.8,                     // seconds of video
  "video": {
    "wide": "haru_bike_20261004_174731.mp4",          // 1920x1080, the master
    "vertical": "haru_bike_20261004_174731_4x5.mp4",  // optional companion
    "verticalCropOfWide": { "x": 528, "w": 864 }       // where the companion sits in the master
  },
  "characters": {                       // id -> how to show them
    "haru": { "label": "Haru Urara", "cast": "haru_urara", "role": "…", "color": [255, 92, 141] }
  },                                    // color (optional) tints intro cards / panel tags / captions
  "vehicles": {                         // lets events say "car" and panels find the driver
    "car": { "model": "jeep", "driver": "oguri" },
    "bike": { "model": "motorbike", "rider": "haru" }
  },
  "cuts": [                             // DirectorLog: every camera cut
    { "t": 2.617, "camera": "oguri close", "type": "onboard",
      "shows": ["oguri"], "framing": "face close-up through the windshield" }
  ],                                    // `shows` = subjects, most important first. A camera or
                                        // framing containing "close" counts as a close-up.
  "dialogue": [                         // speech bubbles as shown
    { "t": 0.3, "dur": 2.08, "who": "haru", "to": "oguri", "text": "…", "face": "nervous" }
  ],
  "events": [                           // beats from the server (ctx.beat, Damage, NPC:knock, Acting)
    { "t": 9.87, "kind": "impact", "who": "bus", "target": "haru", "speed": 150,
      "pos": [46, 3, 6.5], "climax": true }
  ],
  "sounds": [ { "t": 9.95, "cat": "scream" } ],       // SfxLog
  "tracks": {                           // client samples, 15-30 Hz, normalised to the 16:9 master
    "haru": [ { "t": 9.0, "head": [0.62, 0.41], "box": [0.55, 0.30, 0.70, 0.62], "onScreen": true } ]
  }
}
```

## Event kinds

The editor's recipes key on `kind`. Known kinds (extend freely; unknown kinds are simply ignored
unless a recipe names them):

| kind | from | notes |
|---|---|---|
| `impact` | Damage first impact / big hits | `speed` (studs/s), `pos`; the biggest one is the climax unless one has `climax: true` |
| `explode` | Blasts | `size` |
| `knock` | NPC:knock / ragdoll | `who` = character |
| `land` | ragdoll or leap landing | |
| `launch`, `stop`, `horn`, `screech` | Vehicle | `who` = vehicle id |
| `run`, `leap`, `power`, `gesture` | Acting | `gesture` carries the name (facepalm…) |
| `punch`, `kick`, `slap`, `hit`, `bonk`, `block`, `dodge` | Acting fights | `who` attacker, `target` victim |
| `shoot`, `bazooka`, `pie` | Weapons | |
| `slip`, `trip`, `faint`, `doubletake`, `flee` | Acting slapstick | |
| `say` | dialogue start (redundant with `dialogue`, optional) | |

`climax: true` marks the moment the edit builds to. The scene can set it (`climax = "bus_hit"` on an
event) or the server picks the fastest impact.

## Tracks

- Sampled on the client (`Camera:WorldToViewportPoint`) at 20 Hz for every character in
  `characters`, for the whole take.
- `head`: the head's centre. `box`: the character's screen bounding box `[x0, y0, x1, y1]` from the
  8 corners of `GetBoundingBox()`. Both normalised to **the 16:9 crop that ends up in the video**
  (x 0..1 left to right, y 0..1 top to bottom), not the raw ~2.6:1 Studio viewport.
- `onScreen`: false when behind the camera or outside the 16:9 crop (keep the sample, the editor
  skips it).
- Times use the same clock as `cuts` (GO-relative, client `os.clock()` at GO subtracted).

## Clock

Server and client already share one: `CrashState.GoTime` holds GO on the server clock and the
client's `runTime()` is `workspace:GetServerTimeNow() - GoTime.Value`. The server's TakeLog, the
client's cuts and tracks, and the replay buffer all log on that clock, so they line up without any
conversion. record.py then shifts the whole timeline by the difference between GO and the first frame
of its cut (its wall-clock GO estimate snapped to the director's cut at GO; usually a frame or two),
so that `t = 0` is the video's first frame.
