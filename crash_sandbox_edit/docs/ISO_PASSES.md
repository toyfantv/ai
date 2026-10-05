# ISO passes: extra camera angles of the same take, from the replay buffer

**Status: spec + draft, untested** (needs Studio). The editor already consumes ISO clips
(`render._closeup`, step 1); until they exist, face panels use crops of the main take.

## Why

Physics isn't deterministic, so re-recording never gives the same crash twice. The client's replay
buffer (30 Hz CFrames of every moving part, `scene.replaySeconds`, default 14) can re-show *this*
take from any camera. A face panel cropped from a wide shot of a ~690 px tall viewport is very
soft; a close-up rendered from the replay is sharp.

## Which windows and cameras (derived from the timeline)

For each of these, one clip per character listed:

| trigger | window | characters | camera |
|---|---|---|---|
| the climax event | t-0.6 → t+1.2 | `who`/`target` resolved to people (vehicle → driver/rider) | `face` |
| every `power`, `hit`, `punch`, `kick`, `slap`, `explode` | t-0.4 → t+0.8 | same | `face` |
| first appearance of each main character | first_seen+0.2 → +1.0 | that character | `face` |
| each dialogue line ≥ 1.5 s (optional) | line | the speaker | `face` |

Merge windows of the same character that overlap. Skip windows that start before the replay
buffer's oldest sample (`t < duration - replaySeconds`).

`face` camera: 2.2 studs in front of the head, 0.15 studs up, looking back at the head
(`CFrame.lookAt(head.Position + head.CFrame.LookVector * 2.2 + Vector3.yAxis * 0.15, head.Position)`),
FOV 40, following the puppet's head every frame. Fallback `face34`: 30° to the side, for when the
front is inside a vehicle part (raycast from the head to the camera; if blocked, try ±30°, then
±60°).

## How record.py drives it

`python tools/record.py <scene> --iso <take.timeline.json>`, run right after the main take while
Play is still running (the replay buffer lives in the client):

1. Read the timeline, compute the windows above.
2. For each window: set the player attribute `CrashReplay` to
   `"iso:<who>:<from>:<to>:face"` (times = GO-relative seconds, same clock as the timeline). The
   client's replay code (CrashClient `startReplay({from, to, once = true, speed = 1, camera = ...})`)
   plays that range once at 1x through the requested camera, hides UI and bubbles, then sets
   `CrashReplay` back to `""`.
3. Record each window with OBS like the main take (same profile, 60 fps), audio off. Pre-roll
   0.3 s: start OBS, wait for the client attribute `CrashReplayState == "playing"` (set when the
   first replay frame is posed), then note the wall clock; trim the head of the file to that moment.
4. Write `recordings/<take>_iso/<who>_<from>.mp4` (1080x1080 is enough: crop the centre square)
   and a manifest `recordings/<take>.iso.json`:

```json
{ "clips": [ { "who": "haru", "t0": 9.27, "t1": 11.07, "camera": "face", "path": "<take>_iso/haru_9.27.mp4" } ] }
```

`produce.py` reads that manifest (`iso` step) and passes the clips to the renderer, which takes the
frame at `t - t0` of the matching clip for each face panel.

## Limits

- Puppets are rigid copies: no facial animation, no lip sync, no bubbles, no particles (sparks,
  smoke). Fine for inserts held 0.3-1.0 s; the edit freezes on them anyway.
- Dynamic heads: the replay copies don't carry FaceControls poses; set the copy's head to the
  expression the character had at that moment (the `face` field of the nearest dialogue line or a
  per-event default: impact → "scream", power → "angry") if Faces can pose puppets.
- The buffer is 14 s by default: for longer takes, raise `scene.replaySeconds` or ISO only the end.
- Each pass costs its window's length in real time plus ~1 s of setup.

## Draft client code (untested)

See `game_drafts/CrashClient_iso.lua` for the attribute handler and the face camera.
