# Story research for Toy Fan TV

Research and ideation for **Toy Fan TV** (TikTok / YouTube *toyfantv*): comedy, crash and horror shorts with Roblox
characters, staged in **Crash Sandbox** (a Roblox place built from code on the user's PC). Cloud sessions research
and write ideas and scripts; local sessions build, record and post them.

## Read first

- [`context/IDEAS_RESEARCH_BRIEF.md`](context/IDEAS_RESEARCH_BRIEF.md): **the brief for idea research.** The
  engine's sets, cast, vehicles and actions; the user's rules; the 26 formats; the `ideas.csv` row schema; the
  generator YAML shapes; the quality bar. Every idea must respect it.
- [`context/PIPELINE_BRIEF.md`](context/PIPELINE_BRIEF.md): the Crash Sandbox scene -> record -> edit pipeline
  (background; the edit code built from it is in `../crash_sandbox_edit/`).

## How to run a story-research request

1. Make a folder `story_research/<YYYY-MM-DD>_<topic>/`.
2. Write `report.md` (what was researched, sources with dates, what's working and why, new format proposals, a remix
   map if the ideas come from a specific creator), `new_ideas.csv` (exact schema from the brief, ASCII), and
   `scripts.md` (full scripts for the best A-rated ideas: lines of 8 words or fewer, at most 3 puns, YAML for BIS,
   NEWS and ROAD).
3. Check new rows against every earlier `new_ideas.csv` here (no duplicate titles or premises), and continue the id
   counters below.
4. Add a row to the log below and to [`creators.md`](creators.md), and update the counters.
5. Commit and push to the session's branch.

The user brings results back to a local session and says "merge these into the backlog". The real backlog is
`stories/shorts/ideas.csv` in the local repo (not on GitHub).

## Id counters (until the local session renumbers into `ideas.csv`)

| Prefix | Meaning | Last used |
|---|---|---|
| `NEW-` | temporary ids for rows in the 26 existing formats (the `series` column says which) | NEW-031 |
| `SLANG-` | new format: Slang Taken Literally | SLANG-014 |
| `USER-` | new format: Username Puns (nametag = a word in the line; replaced `MINI-`) | USER-019 |
| `RUSH-` | new format: Server Rush (a rare-drop announcement, the whole server stampedes; trend days) | RUSH-005 |

## Researching a YouTube channel

`tools/yt_shorts.py` lists every Short on a channel with view counts. `tools/yt_details.py` adds publish dates and
top comments for the top and newest Shorts. Comments are the best way to learn what happens in a Short without
watching it: viewers quote the lines and explain the joke. Both use YouTube's public data API
(`youtubei.googleapis.com`), which worked on 2026-10-18 even while www.youtube.com was blocked. Run them with
`python -I` and keep their output outside the repo (or in the research folder as a CSV snapshot, like
`2026-10-18_senselessbeing/channel_shorts_2026-10-18.csv`). Video length isn't available this way (the player API
needs a login).

## Network access (cloud sessions)

On 2026-10-18 the user allowed the hosts below. Later in that same session only `youtubei.googleapis.com` was
reachable (it hadn't been tried before the change); www.youtube.com, i.ytimg.com and tiktok.com were still refused. The setting probably takes effect only in a
new session. If they're still blocked, the user checks them under the environment's **Network access -> Allowed
domains** (see https://code.claude.com/docs/en/cloud-environments#network-access):

`youtube.com`, `www.youtube.com`, `m.youtube.com`, `youtu.be`, `youtubei.googleapis.com`, `i.ytimg.com`,
`yt3.ggpht.com`, `tiktok.com`, `www.tiktok.com`, `m.tiktok.com`, `ads.tiktok.com` (Creative Center), and optionally
`socialblade.com` and `playboard.co`. Never sign in, create accounts, solve CAPTCHAs, or download videos.

## Log

| Date | Folder | Request | Output |
|---|---|---|---|
| 2026-10-18 | [`2026-10-18_senselessbeing/`](2026-10-18_senselessbeing/) | Ideas from YouTube @SenselessBeing (Roblox "#literal" skits); remixes of their premises allowed | 50 rows (28 existing formats, 2 new formats: SLANG, MINI), 8 scripts |
| 2026-10-18 | same folder (second pass) | Re-run with real channel data after YouTube was unblocked | all 510 Shorts with views; the core device is the username pun; MINI -> USER; new RUSH format; Halloween + Steal An Egg rows; 69 rows, 10 scripts |
