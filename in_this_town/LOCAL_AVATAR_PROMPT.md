Paste the block below into a Claude Code session on the Windows PC (the one with `D:\Claude\crash-sandbox`).

```
Goal: render In This Town shorts with the real Roblox characters that already exist in the video-farm cast,
instead of the procedural blocky bodies.

Two codebases:
- Video farm: D:\Claude\crash-sandbox. The cast lives in cast/cast.json, which tools/cast.py compiles into
  src/shared/Cast.lua. Read HANDOFF.md first, especially the gotchas and the rules for Studio and the farm.
- In This Town (the three.js renderer): GitHub toyfantv/ai, branch claude/adoring-lovelace-ppu17j, folder
  in_this_town/. Clone it next to crash-sandbox (D:\Claude\ai) if it isn't there yet, then `npm install` in in_this_town/.
  Read in_this_town/README.md, section "Real Roblox avatars", plus tools/roblox_avatar.py and web/engine/roblox.js.

How the renderer takes avatars: one folder per character in in_this_town/web/assets/avatars/<key>/ holding
model.obj, model.mtl, textures and avatar.json, listed in web/assets/avatars/index.json.
`python tools/roblox_avatar.py import <key> <folder with an .obj>` builds that folder from any OBJ export.
A CAST entry in web/engine/cast.js with `avatar: '<key>'` is then drawn with the real mesh, and the existing
poses drive it.

Steps:
1. Read cast/cast.json and list the farm characters: key, what each is built from (user id, outfit, bundle
   or asset ids, HumanoidDescription fields, body colours, R6/R15), and which videos use them. Show me the
   list and ask which characters to bring over, and which In This Town role each should play (ethan,
   sophie, lucas, ava, ruby, ryan, chloe, max, grace, leo, or new CAST entries). Don't go further until I answer.
2. Get a 3D model of each chosen character. Try these in order, and stop at the first that works:
   a. If a character is a real user's avatar: `python tools/roblox_avatar.py fetch <key> --user-id <id>`.
      It needs ROBLOSECURITY set to a .ROBLOSECURITY cookie. Ask me for it, and never print it or write it
      to a file.
   b. If a character is built from asset ids: try Roblox's avatar-definition renderer
      (POST https://avatar.roblox.com/v1/avatar/render with thumbnailConfig.thumbnailType "3d" and an
      avatarDefinition of assets, bodyColors, scales and playerAvatarType). Fetch an x-csrf-token from the
      first 403 response. Poll until the returned imageUrl is ready. That metadata has the same
      obj/mtl/textures shape as the avatar-3d endpoint, so pass it to save_model() in roblox_avatar.py.
      If it works, add it to roblox_avatar.py as `fetch <key> --cast <cast.json key>`.
   c. Otherwise use Studio, but only when HANDOFF.md / the farm says Studio is free. Claim it the way the
      farm expects and release it when you're done. Build the rig the same way the game does (Cast.lua /
      HumanoidDescription), select the Model, then Export Selection > .obj. Then run
      `python tools/roblox_avatar.py import <key> <export folder>`. If Export Selection needs my click,
      set everything up and tell me exactly what to click.
3. Point the chosen In This Town CAST entries at the new keys (web/engine/cast.js). Then render the check page:
   `node render.js stills avatars 0.5 0.5 1.5 2.5 3.5 4.5 5.5` (from in_this_town/). Open the stills
   in build/avatars/stills/ yourself before showing me, and check:
   - each character faces the camera (t = .5) and shows its back at whole seconds;
   - arms, legs and head move as one piece in walk, wave, point, sit and run;
   - nothing from the torso is carried away by an arm, and no gaps open at the shoulders;
   - hats and hair stay on the head.
   Fix problems through each avatar.json (yaw, landmarks {hipY, neckY, shoulderX}, head_only group names)
   before touching roblox.js. Then show me a contact sheet of the stills.
4. Render one existing episode with the new cast as a test (for example ep08, whose lead is sophie), using
   make_episode.sh or tools/produce_episode.sh as the README describes. Check that
   `python tools/runpod_render.py launch` doesn't refuse the bundle for size (4 MB cap; fall back to a local
   render if it does). Show me stills from the shots where real avatars are on screen. Their own Roblox
   faces replace the drawn expressions, so tell me any shot where the story depended on an expression
   (scared, shock, creepy).

Rules:
- Don't change cast/cast.json, src/shared/Cast.lua or tools/cast.py, and don't commit anything in
  crash-sandbox. Other sessions have uncommitted cast work there, and Cast.lua must stay under Studio's
  200,000-character limit.
- Don't start, resume or queue farm jobs, and don't rent Runpod pods except through runpod_render.py for step 4.
- Commit in_this_town changes (code, avatar folders, cast.js) on claude/adoring-lovelace-ppu17j and push.
  Avatar textures are fine to commit unless a folder is over 5 MB; ask me first if one is.
- At the end, tell me which characters were converted, which route each took, anything that failed, and
  where the stills and test episode are.
```
