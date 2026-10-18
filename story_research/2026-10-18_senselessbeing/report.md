# SenselessBeing: creator notes and the ideas they inspired (updated 2026-10-18)

**Request:** use the YouTube channel https://www.youtube.com/@SenselessBeing for Toy Fan TV video ideas. Remixing the
channel's own premises is allowed, as long as each version is changed a little (user's instruction, 2026-10-18).

**Folder contents:**
- `new_ideas.csv`: 69 backlog rows in the `ideas.csv` schema
- `scripts.md`: 10 full scripts
- `channel_shorts_2026-10-18.csv`: all 510 of the channel's Shorts with views (and dates for 114 of them)
- this report

## 0. What changed in this second pass

The first pass relied on search snippets because youtube.com and tiktok.com were blocked. After the user changed the
network settings, `youtubei.googleapis.com` (YouTube's own public data API) was reachable; the first pass hadn't
tried it. www.youtube.com and tiktok.com were still refused in this session. Through that API I pulled:
- the full Shorts list with view counts;
- publish dates for the top 80 and the newest 40;
- the top comments on 55 of them. Viewers quote the lines and explain the jokes, which shows what happens in each
  Short without watching it.

The scripts are in `../tools/`.

Corrections to the first pass:

| First pass said | Actually |
|---|---|
| ~112K subscribers, ~1.1K videos | **119K subscribers, 516 videos** (510 public Shorts), ~213M Shorts views in total |
| "the train came" ~1.3M views | **5.6M** on YouTube (Feb 2, 2026). The 1.3M was a TikTok listing |
| Generic "literal" skits | The core device is the **Roblox username**: a player whose name is a word in the line appears and makes the line literal |
| Steady channel | **Peaked Dec 2025 - Feb 2026, declining since**: Sep-Oct 2026 Shorts get ~30K-185K views |
| Biggest hits are literal skits | The two biggest (34M, 10M) are **Grow a Garden trend-jacks** from June 2025 |

Still unverified (TikTok only, which stays blocked): the "big house = animal cage" and "text your first crush"
clips.

## 1. The channel

| Field | Value (2026-10-18) |
|---|---|
| Handles | YouTube **@SenselessBeing** (`UCB9YyGpeAJ-CEw4cAu6pVKQ`), bio "i have no sense"; TikTok **@senselessbeingyt** |
| Size | 119K subscribers, 516 videos, 510 public Shorts, ~213M total views |
| Spread | median Short 98.5K views; 252 Shorts over 100K, 79 over 500K, 41 over 1M |
| How it's made | real Roblox gameplay recorded with friends ("a skit made with my friends", top video's description). Usernames are set with Roblox friend nicknames, which only the camera account sees (a commenter explains the trick). Many friends' names are Filipino dishes (manok, sisig, adobo) |
| Titles | a lowercase phrase ("the train came", "i fell down") until ~May 2026, then **emoji only** ("💔🥀💔"). Hashtags #literal #roblox #robloxfyp #fyp #xybca |
| Cadence | ~2 a day at the peak (Dec-Jan); ~1 a day in spring; ~2-3 a week since July |

### Eras (monthly figures estimated from the 114 dated Shorts, interpolated by upload order)

| Period | What they posted | Shorts / month | Median views | 1M+ |
|---|---|---|---|---|
| Jun-Jul 2025 | Grow a Garden reaction skits ("ember lily in stock") | 30-64 | 40-50K | 4 (incl. 34M, 10M) |
| Aug-Nov 2025 | mixed skits | ~30 | 26-46K | 1 |
| **Dec 2025-Feb 2026** | **username puns, ~2 a day** | 47-62 | **140K-350K** | **27** |
| Mar-May 2026 | username puns, fewer posts | 19-31 | ~100-130K | 4 |
| Jun-Aug 2026 | emoji titles; restaged viral meme lines; crush / girlfriend jokes | 10-13 | ~210K | 5 |
| Sep-Oct 2026 | same, less often | 2-9 | ~50K | 0 |

### Top Shorts and what happens in them (from the comments)

| Views | Date | Title | What happens |
|---|---|---|---|
| 34M | 2025-06-09 | ember lily | Grow a Garden: "ember lily in stock!" and the whole server races to the seed shop (speedrun timer) |
| 10M | 2025-12-24 | he aint btw | username joke in a gunpoint scene ("username matches perfectly"). Weapons: not for us |
| 10M | 2025-06-12 | even in another game | saying "ember lily on stock" in a different game makes the whole server leave |
| 8.4M | 2026-01-30 | bro got some ammo | a player named "AM MOP" = "ammo", in a shooter game |
| 5.6M | 2026-02-02 | the train came | a player named "train" arrives, and gets hit by a train |
| 5.4M | 2026-05-04 | what did he do | "Go to sleep" and a player named "sleep" says hello; a cop |
| 5.3M | 2026-02-15 | idk | "Where are we?" "idk" and a sign reads "Welcome to IDK" |
| 3.4M | 2026-04-10 | they have to play fair | a player named "fair" gets played; a player named "hacks" |
| 3.4M | 2026-01-03 | I fell down | "I think I will fall" and a player named "I" drops from the sky |
| 3.0M | 2025-12-25 | damn this is crazy | introducing a player named "crazy" to one named "damn" |
| 2.9M | 2026-01-08 | he saw a firefly | a player named "fire" flies |
| 2.8M | 2026-01-12 | a butterfly | "butter" flies |
| 2.4M | 2025-12-27 | he is right | word-named players introduced ("this is my bro") |
| 2.3M | 2026-08-09 | 🥀👮‍♂️😭🤙 | a rookie cop takes "copy that" literally |
| 2.3M | 2026-01-24 | this is getting old | a double-meaning line ("saying 2 meanings in 1 sentence is crazy part 39") |
| 2.2M | 2025-07-19 | is not that obvious | friends badly hide a "body" (Hide the Body game). Not for us |
| 1.8M | 2025-12-28 | he is cooked | username pun ("hey, I'm cooked") |
| 1.7M | 2026-02-16 | it must been the wind | a player named after Genshin's wind character = "the wind" |
| 1.7M | 2026-01-25 | they saw a waterfall | a player named "water" falls |
| 1.7M | 2026-01-17 | well thats bad | players named "well" and "bad" greet each other |
| 1.6M | 2026-01-17 | hes scared | "I'm scared of school", answered with "Hi, scared" |
| 1.6M | 2026-01-02 | atleast he got | "I love robux" and a player named "robux" receives the love |
| 1.5M | 2026-07-07 | 🌨🥀😭 | "where did the snow come from?" It's dandruff |
| 1.4M | 2026-02-17 | bro waited | "hold on" and a player named "on" |
| 1.4M | 2026-01-27 | they hit the road | the players literally attack the road |
| 1.4M | 2025-12-28 | nobody loves him | a player named "nobody" loves him |
| 1.3M | 2026-06-15 | 💔🥀💔 | restages the viral line "that's a (swear) asteroid" |
| 1.3M | 2026-07-28 | 💧💦🥀😭 | restages "it's time to stay hydrated" (a bath-water joke) |
| 1.3M | 2026-08-29 | 👴💔✌️ | restages a viral AI video ("hey daddy" / "I wouldn't miss it for the world") |
| 1.3M | 2026-01-17 | the sidewalk | "have you seen the sidewalk?" and the "side" is walking |
| 1.2M | 2026-02-17 | are you fr | a player named "fr" just trying to get his pizza |
| 1.1M | 2026-02-19 | there late | two players named "late" run for the bus |

Full list with links: `channel_shorts_2026-10-18.csv`.

## 2. How the username pun works

Every peak-era hit is one of five patterns. All rely on the nametag being readable on screen:

1. **Split a compound word:** fire + fly, butter + fly, water + fall, side + walk, star + fish, under + stand.
2. **Name a player after a little word:** I, nobody, idk, fr, on, he ("he is going to die" and a player named "he").
3. **"X, this is Y" introductions:** damn / crazy, well / bad, "hi scared". Fans keep asking for more ("wow / cool",
   "lowkey / good").
4. **The noun shows up:** train, robux, sleep, life, late, fair / hacks.
5. **A place-name sign:** "Welcome to IDK".

Plus two non-pun hits: **trend-jacking the #1 game** at its peak (Grow a Garden, 34M + 10M), and, recently,
**restaging viral meme lines** (1.3-2.3M).

### Why it works (my read)

1. **One glance at a name explains the joke.** Viewers rewatch, then comment the explanation for each other: "i
   didnt know until i read their users", "for those who didn't get it...". Those explainer threads are free
   engagement.
2. **Fans pitch the next one.** Comment sections fill with "do 'X'" requests, so the idea bank refills itself. The
   comment meme "Saying 2 meanings in 1 sentence is crazy part N" shows viewers treat it as a series.
3. **Near-zero production cost** (friends plus nicknames) allowed 2 posts a day at the peak.
4. **Trend timing:** the 34M hit landed while Grow a Garden was at its all-time peak.

### Possible reasons for the decline (correlation, not proof)

- Titles changed to emoji only in summer 2026, so there's no phrase to hook a scroller or a search.
- The jokes moved to meme-line restagings, which only land if you know the meme, and to crush / girlfriend jokes and
  crude humour.
- Cadence fell from ~2 a day to ~2 a week.
- A commenter notes many people re-uploaded their videos without credit.

## 3. What this means for Toy Fan TV

1. **Build the username pun as a series: Username Puns (`USER`).** The peak era (Dec 2025 - Feb 2026), when nearly
   every Short was a username pun, produced 27 of their 41 million-view Shorts. Our engine already has nametags
   ("usernames are a joke slot"). It is Bro, I'm Sorry's
   quick cousin: same "word as a person" idea, but one line and one reveal, no bazooka. Our edge over them: crashes,
   force-stops, anime cast, directed cameras and a clean look.
2. **Keep the phrase readable:** a top caption with the line, the nametag big and legible, a lowercase recap at the
   end. Don't go emoji-only.
3. **Pin "comment a phrase and we'll make it"** on every USER / SLANG post, and mine the replies for the bank.
4. **Trend-jack with `Server Rush`** (new format, below). **Steal An Egg** is Roblox's #1 game this month (~0.8-1M
   concurrent players, Oct 2026; rare eggs are announced in system chat and the fastest player wins). That's the same
   setup as their 34M Grow a Garden hit. **Halloween (Oct 31)** is two weeks away: the batch includes 5 Halloween
   rows.
5. **Stay kid-safe.** Their weapon, "hide the body", crude and crush/gender jokes are exactly what our rules exclude,
   and those came as their views dropped.

**Priority:** USER first (strongest evidence), then LIT and CAR, RUSH on trend days, SLANG as a 3-post test. Keep
posting BIS (it's the same mechanism, and the user's BIS shorts are already proven). Their own titles include "the
truth hurts" and "time flies", which are two of the user's BIS episodes.

## 4. Format proposals

### USER: Username Puns (8-12 s). Replaces the first pass's "Literal Minis"

- **Premise:** someone says an everyday line; a player whose **nametag** is a word in it appears and makes it literal.
- **Beat sheet:** 0-3 s the line, said mid-situation (top caption = the line); 3-4 s a beat; 4-7 s the reveal (the
  nametag must be big and on screen); 7-8.5 s an optional button; 8-10 s a lowercase recap caption, then a hard cut
  back to frame 1.
- **Title pattern:** the recap ("Nobody Came", "Milkshake").
- **Comment bait:** "comment a phrase for part 2" / "did you get it?"
- **Sets / cast:** any. `toy_fan_tv` says the line; the word-player is any look; the Noob is the straight man.
- **Bank (30, our own words; each checked against all 510 of their titles):** bill, server, deadline, beat (dropped), nobody
  (came to the party), it (went over his head), gym (hit back), wi-fi (weak), break (dance), yet (are we there yet),
  what (is up on the roof), milk (shake), key (board), earth (quake), copy (do you copy), trick / treat, boo,
  nothing (happened), slow (dance, B), somebody (stop that bus: a force-stop), fan (turn on the fan: a player in a
  TOY FAN TV shirt spins), pop (quiz), game (over: falls over the fence), door (hold the door), line (cut the
  line), lights (went out), meeting (ran late), mood (dropped), joke (landed: a superhero landing), coast (is clear).
- **Engine:** A (nametags + existing actions). Make the nametag font big enough to read on a phone.

### SLANG: Slang Taken Literally (12-20 s). Unchanged from the first pass

See the first-pass write-up in the rows (`SLANG-001..014`). Note: SenselessBeing has used several of the same slang
phrases in titles ("let bro cooked", "he is cooked", "why crash out", "he did a glowup", "just let bro touch grass",
"this hits different"). Our payoffs are different, but the phrases aren't exclusive. Test 3 before making more.

### RUSH: Server Rush (15-20 s). New, for trend days

- **Premise:** a server message announces something rare, and the whole server stampedes. Crash Sandbox's crowds,
  vehicles and pile-ups make it bigger than a real Roblox clip; the twist decides who actually gets it.
- **Beat sheet:** 0-1.5 s a yellow system-chat caption ("[SERVER] A SECRET EGG spawned at the gas station");
  1.5-4 s every head turns (a double-take wave); 4-10 s the stampede (sprinting, cars, a bus, superhero leaps,
  speed lines); 10-14 s a pile-up at the target; 14-18 s the twist: the AFK Noob was already sitting on it, the
  grandma on the mobility scooter rolls up, or the sign flips to "jk". Optional caption "speedrun: 0.4 s".
- **Comment bait:** "what would make YOU run?"
- **Bank (20):** Steal An Egg secret egg (now), whatever the next hit farming game's rare item is ("X in stock"),
  free Robux at the bank, admin joined (everyone instantly behaves), ice cream truck outside, last slice, candy bowl
  unattended (Halloween), double XP weekend, new update dropped, limited UGC drop, snow day announced, free samples
  at the supermarket, the arcade machine is free, Mom says dinner's ready (stairs tumble), Black Friday at the
  supermarket (cart pile-up), someone dropped a Dominus, the bus is early, the Wi-Fi is back, free period, a new
  Robux gift card at the gas station. Never fire drills or emergencies.
- **Engine:** A, except an egg model (B; a glowing sign is the A stand-in).

## 5. Remix map: their premise -> our version (changed, not copied)

| SenselessBeing Short (views) | Ours | What changed |
|---|---|---|
| the train came (5.6M): a player named "train" | NEW-001 Train of Thought | the phrase is "train of thought"; a real train hits Bro's empty parked car |
| nobody loves him (1.4M): a player named "nobody" | USER-005 Nobody Came | "nobody's coming to my party" and NOBODY shows up with a wave |
| 🥀👮‍♂️😭🤙 (2.3M): a cop and "copy that" | USER-015 Do You Copy? | "do you copy?" and identical cops keep stepping out |
| idk (5.3M): "Welcome to IDK" sign | USER-010 Are We There Yet? | a road trip that ends in a town called Yet |
| ember lily (34M): server-wide race to the shop | RUSH-001 Secret Egg Spawned + RUSH format | Steal An Egg's secret egg; vehicles and pile-ups; the AFK Noob wins |
| they hit the road (1.4M) | NEW-008 Hit the Road | the road "hits back" with a semi truck |
| he is fired (716K) | NEW-020 Fired Means Fired | Breaking News; the fire department responds |
| the air got out (snippet only) | NEW-010 He Got Some Air, NEW-002 Walking on Air | a ramp launch; moon gravity |
| are you fr (1.2M): a player named "fr" | SLANG-011 Are You Fr | "not fr" = she's an NPC walking into a wall |
| he ran out ("time flies" is theirs too) | NEW-018 You're Running Out of Time | TIME is an Uma Musume runner who sprints out of an exam |
| having a crush / TikTok crush clip | NEW-007 The Crush Replied | "crush" = the garbage truck |
| bro saw something 1 | NEW-028 Bro Saw Something | Siren Head wants a phone charger |
| average iq | NEW-024 IQ 1 vs 100 vs 999 | IQ 999 Gojo force-stops the bus |
| big house = animal cage (TikTok snippet) | NEW-027 Bro Bought a Mansion | the mansion is a school bus |

## 6. Notes for the local session

- Existing-format rows use temporary ids `NEW-001..031`; renumber them on merge. New formats: `SLANG-001..014`,
  `USER-001..019` (the first pass's `MINI-` rows, now Username Puns), `RUSH-001..005`.
- Flagged "check ideas.csv" (common premises): NEW-017, NEW-019. Effort B: USER-019, RUSH-001, NEW-031 (each says
  what it needs).
- SLANG-007, USER-004 and NEW-006 use the user's own music. SLANG-011 swaps a nametag across a cut.

## Sources

- Channel data: YouTube InnerTube API (`youtubei.googleapis.com`), pulled 2026-10-18; the full list is in
  `channel_shorts_2026-10-18.csv`.
- Roblox charts: [livecounts.nl Roblox charts](https://livecounts.nl/roblox-charts/),
  [rblxstat most played](https://rblxstat.com/lists/most-played-roblox-games),
  [Adellion simulator picks (Oct 2026)](https://adellion.com/roblox-simulator-games),
  [Steal An Egg on RoWatcher](https://rowatcher.com/games/10563114921/steal-an-egg),
  [Pocket Gamer: Steal An Egg tips](https://www.pocketgamer.com/roblox/steal-an-egg-codes-and-tips/).
- First-pass TikTok snippets: [@senselessbeingyt "the air got out"](https://www.tiktok.com/@senselessbeingyt/video/7603299572433112327),
  ["are you fr"](https://www.tiktok.com/@senselessbeingyt/video/7607775787441474834),
  [TikTok "Literal Memes Roblox"](https://www.tiktok.com/discover/literal-memes-roblox).
