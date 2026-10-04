Help me run a Python script on this Windows PC that extracts Chiikawa character sprites from video files.

**Code:** GitHub repo `toyfantv/ai`, branch `claude/peaceful-meitner-mjhjqz`, folder `chiikawa_sprites/`. Read `chiikawa_sprites/README.md` and `chiikawa_sprites/extract_sprites.py` before running anything.

**Input folder** (every file in it is an episode MP4, even the ones with no extension):
`C:\Users\liwos\AppData\Local\Alt.Binz\download\Chiikawa.S01.2022.1080p.WEB-DL.H.264.AAC-ADWeb (1)`
Never modify, rename or move anything in this folder. Treat it as read-only.

**Output folder:** `D:\Claude\chiikawa-sprites\anime\episodes` (extraction) and `D:\Claude\chiikawa-sprites\anime` (the sprite-short library from step 7). Never write into `D:\Claude\chiikawa-sprites\characters`: it is a hand-curated library. If there is no D: drive or it's short on space, suggest another location and ask me. A full season can take several GB.

Steps:
1. **Get the code.** Clone `https://github.com/toyfantv/ai.git` (or pull it if it's already here) and check out the branch above.
2. **Set up Python.** You need Python 3.10 or newer. Check with `py --version`, and tell me if it's missing. Create a venv inside `chiikawa_sprites` and run `pip install -r requirements.txt`. If I have an NVIDIA GPU (check with `nvidia-smi`), install `rembg[gpu]` instead of `rembg[cpu]`. The first run downloads a ~170 MB model.
3. **Trial run** on 2 episodes:
   `python extract_sprites.py "<input folder>" -o D:\Claude\chiikawa-sprites\anime\episodes --limit 2`
   Quote the input path, because it contains spaces and parentheses.
4. **Check the results with me.** Report how many frames, sprites and group shots each episode produced. Open a handful of PNGs from `sprites\` and `groups\` (look at them yourself if you can view images) and tell me whether the cut-outs look clean: whole characters, outlines intact, little leftover background. Wait for my go-ahead before the full run.
5. **Tune if needed.** Use the README's Tuning table:
   - characters missed or cut-outs poor → try `--model isnet-general-use` or `--model u2net`
   - too few frames → lower `--scene-threshold` or `--min-sharpness`
   - too many near-duplicates → raise `--scene-threshold`
   - tiny junk sprites → raise `--min-area`

   The script skips episodes that already have a `.done` file. To redo an episode after changing settings, delete its output folder (e.g. `D:\Claude\chiikawa-sprites\anime\episodes\S01E001`), or use a fresh `-o` folder.
6. **Full run.** Same command without `--limit`. It can take a long time on CPU, so run it so that I can see progress. If it's interrupted, re-running resumes where it left off.
7. **Optional labeling (costs money).** `--tag-only --library D:\Claude\chiikawa-sprites\anime` uses the Anthropic API to label every cut-out and export a sprite-short library (one folder per character, `group\`, `misc\`, `props\`, `theme-<theme>\`, `poses.json`). Don't run it unless I say so. Before running, tell me how many cut-outs are in `manifest.jsonl` so I can judge the cost (the script also prints an estimate and asks before sending). Suggest a cheaper model (`--claude-model claude-sonnet-5-5` or `claude-haiku-4-5`) and a trial on a copy of 1-2 episodes first. It needs `ANTHROPIC_API_KEY`: ask me to set it myself, and don't ask me to paste the key into chat. `--export-only` rebuilds the library from `tags.jsonl` without any API calls.

Rules:
- Don't change the cut-out logic in `extract_sprites.py`. Sprites must stay pixel-identical to the video frames, with on/off transparency, and the script checks this before saving. If you think a code change is needed, explain it and ask first.
- If a command fails, show me the actual error and your proposed fix before trying something different.
- At the end, summarize where the outputs are and how many sprites were produced per episode.
