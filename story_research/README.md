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
| `NEW-` | temporary ids for rows in the 26 existing formats (the `series` column says which) | NEW-028 |
| `SLANG-` | new format: Slang Taken Literally | SLANG-014 |
| `MINI-` | new format: Literal Minis | MINI-008 |

## Network access (cloud sessions)

The cloud environment's network policy blocked these on 2026-10-18; web search still worked. To research creators
properly, the user adds them under the environment's **Network access -> Allowed domains**
(see https://code.claude.com/docs/en/cloud-environments#network-access), then starts a new session:

`youtube.com`, `www.youtube.com`, `m.youtube.com`, `youtu.be`, `youtubei.googleapis.com`, `i.ytimg.com`,
`yt3.ggpht.com`, `tiktok.com`, `www.tiktok.com`, `m.tiktok.com`, `ads.tiktok.com` (Creative Center), and optionally
`socialblade.com` and `playboard.co`. Never sign in, create accounts, solve CAPTCHAs, or download videos.

## Log

| Date | Folder | Request | Output |
|---|---|---|---|
| 2026-10-18 | [`2026-10-18_senselessbeing/`](2026-10-18_senselessbeing/) | Ideas from YouTube @SenselessBeing (Roblox "#literal" skits); remixes of their premises allowed | 50 rows (28 existing formats, 2 new formats: SLANG, MINI), 8 scripts |
