# toyfantv/ai

The user (toyfantv) is a music producer who makes Roblox comedy, crash and horror shorts for TikTok and YouTube
Shorts, staged in **Crash Sandbox** (a Roblox place built from code, on their Windows PC; that repo is local only).
This repo holds the work done in cloud sessions:

- `story_research/`: video-idea and story research. **For any request about video ideas, stories, scripts,
  creators or trends, read `story_research/README.md` first**, then `story_research/context/IDEAS_RESEARCH_BRIEF.md`
  (the engine's capabilities, the user's rules, the 26 formats, the `ideas.csv` schema). Follow its "How to run a
  story-research request" steps and continue its id counters.
- `crash_sandbox_edit/`: the post-production pipeline (anime / cinematic / shorts cuts) for Crash Sandbox takes.
- `chiikawa_sprites/`: a sprite extractor.

User preferences that apply everywhere: start videos on the action; short (15-35 s); at most 3 puns; kid-safe
slapstick (oof, ragdolls, no gore); no canned laughter, no goofy horns; `toy_fan_tv` plays the lead and every
video hides the user's song-cover posters and a "TOY FAN TV" sign; no vignette or letterbox bars; never use a film's
audio or footage; borrow other creators' patterns, never their jokes (unless the user explicitly allows remixing a
specific creator's premises).

To research a YouTube channel, use `story_research/tools/` (lists a channel's Shorts with views, dates and top
comments through YouTube's public data API). Cloud sessions can't reach youtube.com or TikTok pages unless the
environment allows those hosts: see the "Network access" section of `story_research/README.md`.
