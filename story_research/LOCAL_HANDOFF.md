# Hand-off: bring story research into the local video pipeline

Paste the prompt below into the local Claude Code session that runs in the Crash Sandbox repo
(`D:\Claude\crash-sandbox`). Step 6 updates your video-making skill so later sessions pick up new research by
themselves. After that, you only need to say "check for new story research".

---

Help me merge story research from my cloud sessions into the shorts backlog, and teach my video-making skill to
find it from now on.

**Research:** GitHub repo `toyfantv/ai`, folder `story_research/`. Until I merge it into `main`, it's on branch
`claude/hopeful-galileo-9cy3kw`. Read `story_research/README.md` first, then the newest research folder's
`report.md` (right now `story_research/2026-10-18_senselessbeing/`).

Steps:
1. **Get it.** If `D:\Claude\ai` doesn't exist, run `git clone https://github.com/toyfantv/ai.git D:\Claude\ai`.
   Otherwise run `git -C D:\Claude\ai pull`. If `story_research/` isn't on the checked-out branch, check out the
   branch above.
2. **Merge the ideas.** Add the research folder's `new_ideas.csv` rows to `stories/shorts/ideas.csv`:
   - `NEW-xxx` rows get the next free id of the prefix of the series in their `series` column (e.g. a
     `Take It Literally` row becomes the next `LIT-` number);
   - `SLANG-`, `USER-` and `RUSH-` rows are new series: keep their ids;
   - skip any row whose title or premise is already in `ideas.csv`, and list what you skipped;
   - keep `status = idea` and an empty `final`. Don't reorder or edit existing rows.
3. **Add the new series** (Slang Taken Literally, Username Puns, Server Rush) to `stories/shorts/PLAYBOOK.md`.
   Use the report's "Format proposals" section: premise, beat sheet, title pattern, comment bait and filler bank.
4. **Save the scripts.** Put the episodes from `scripts.md` where episode scripts live in this repo. The BIS and
   NEWS YAML blocks are already in the generator's format. Note anything a script needs that the engine can't do
   yet.
5. **Check the rules still hold.** The research follows `story_research/context/IDEAS_RESEARCH_BRIEF.md`. If
   anything in this repo has changed since that brief (new sets, cast, actions, rules), point out ideas that no
   longer fit.
6. **Teach the skill.** Find the skill I use to make shorts (in `.claude/skills/`) and add the section below to its
   `SKILL.md`, with `Last merged` set to the folder you just merged.
7. **Report back:** how many rows you merged, the ids you assigned, what you skipped and why, and the file paths you
   changed. Don't build, record or post anything yet.

Section to add to the skill:

```markdown
## Story research (from cloud sessions)

Idea research from cloud sessions lives in `D:\Claude\ai\story_research` (GitHub `toyfantv/ai`). When asked to
"check for new story research", and before choosing what to make next:
1. Run `git -C D:\Claude\ai pull`.
2. Read `story_research/README.md`. Every row of its Log newer than **Last merged** below is unmerged: merge that
   folder's `new_ideas.csv` into `stories/shorts/ideas.csv` (renumber `NEW-` ids into their series, keep new
   series' ids, skip duplicates), add any new series to `PLAYBOOK.md`, save its scripts, then update Last merged.
3. When choosing what to make, follow the newest report's "Priority" section and prefer its A-rated rows.

Last merged: 2026-10-18_senselessbeing
```
