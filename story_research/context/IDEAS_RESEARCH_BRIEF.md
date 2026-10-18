# Brief for a cloud Claude session: research short-video ideas for Toy Fan TV

> **For the user:** paste this file into your cloud Claude session (or attach it) together with
> `stories/shorts/ideas.csv` (the backlog, so it can avoid duplicates and continue the numbering). Optional: also attach
> `stories/shorts/PLAYBOOK.md` for the full format write-ups. The project repo is local only (no GitHub remote), so the
> cloud session can't read it; everything it needs is in this file. Bring its results back to a local session and say
> "merge these into the backlog".

---

## 1. Your role

You are helping **Toy Fan TV** (TikTok / YouTube handle *toyfantv*), a music producer who makes comedy, crash and horror
**shorts with Roblox characters** for TikTok and YouTube Shorts. The videos are made by *local* Claude sessions in
**Crash Sandbox**, a Roblox place built entirely from code: a scene file describes the set, the characters, their
actions and the cameras; the engine plays it in Roblox Studio, OBS records it, and Python tools voice, edit and finish it.

**Your job is research and ideation, not production.** You can't run the engine. You:
1. research what is working right now for Roblox / animated comedy shorts (creators on TikTok, YouTube Shorts,
   Instagram Reels; trending memes, sounds, slang, games, films);
2. turn what you learn into **new, original, buildable video ideas** in the backlog's exact format (section 6), plus
   proposals for new repeatable formats;
3. write full scripts for your best few ideas, so a local session can build them in minutes.

Everything you suggest must be buildable with the engine (section 3) or clearly marked as needing new work.

## 2. The strategy (why there is a backlog)

The channel aims for **hundreds to thousands of videos**. So nothing starts from a blank page:
- a **format** (series) is a repeatable skit with a fixed beat sheet, set, cast and ending;
- a **bank** is the list of things that fill its slots (idioms, teacher quotes, games, films...);
- **every video is one row** in `ideas.csv`. Local sessions pick a row, generate the scene from a series template, voice
  it with TikTok TTS, record, finish, post 1-3 a day.
- The loop: post ~3 of each format, keep the formats that perform, make 5x more of the winners, remake hits with new
  sets and casts, keep 10-20% of output for new formats and weekly trends. **Your research feeds this loop.**

## 3. What the engine can do (so your ideas are buildable)

**Sets (locations):**
- Outdoors: `city` (downtown, crossroads with traffic lights, bank, hotel, hospital), `suburb` (houses, driveways,
  lawns), `strip_mall` (shops, parking lot, gas station), `school` (school building, bus drop-off, gym, playground),
  `highway`, `t_junction`, `rail_crossing` (trains), `open_lot`, `forest` (pines, campfire, country road), `blocky_city`,
  `hollow_creek` (a small town with a clock tower, diner, library), `empty`.
- Indoors: `office` (desks, water cooler, meeting room; with `furnish = false` + desks and a whiteboard it becomes a
  **classroom**), `diner`, `living_room`, `house` (two storeys, staircase, bedroom with a gaming desk, dining table),
  `olive_garden`, `pizza_place` (counter, arcade machines), `taco_bell`, `supermarket` (aisles, shelves of cereal), a
  McDonald's set.
- Props: signs with any text, posters, menu boards, shelves, desks, chairs, tables, beds, doors (open / blown open), TVs
  (static), campfires, a moon, mist, lights, flyers, bikes, walkie-talkies, a mobility scooter, pizza boxes, a clock.
- Lighting presets (day, golden hour, sunset, night, neon night, noir, foggy...) and colour modes (vibrant, anime, toon,
  glossy, cinematic). Gravity can change mid-scene (moon gravity: everyone floats).

**Vehicles (21 real-looking Creator Store models, all crashable):** sedan, hatchback, sports car, muscle car, SUV, jeep,
pickup, van, police car, police SUV, sheriff car, ambulance, fire truck, taxi, **school bus**, city bus, semi truck,
dump truck, garbage truck, tow truck, limousine, ice cream truck, motorbike, plus a humvee and an army truck. Scripted
driving, aiming at a character, timed hits, unstoppable vehicles, ramp jumps, pile-ups, explosions, dents, flying debris.
Crashes are the engine's signature: ragdolls fly, get up and "oof".

**Characters (anyone can be dressed as anything):**
- **The cast:** 144 saved characters: the user's avatar `toy_fan_tv`; classic Roblox (Bacon Hair, Noob, Robloxian);
  limiteds (Headless, Korblox, Dominus, Valkyrie, Sparkle Time Fedora); everyday actors (city people, barista, baker,
  cowboy, a blue fish-man, a green giant "principal"); horror costumes (zombie, vampire, mummy, skeleton, reaper, witch,
  ghost kids, shadow figure); licensed costumes (Spider-Man, Wonder Woman, Aquaman, the Demogorgon, Eleven, WWE, KSI...).
- **Anime library (53):** Dragon Ball (Goku, Vegeta, Gohan, Piccolo, Frieza, Krillin, Cell, Buu, Broly...), Jujutsu
  Kaisen (Gojo, Yuji, Megumi, Nobara, Sukuna, Nanami, Toji, Geto...), One Piece (Luffy, Zoro, Sanji, Nami, Usopp, Ace,
  Shanks, Law, Whitebeard...), Chainsaw Man (Denji, Power, Makima, Aki, Reze, Kobeni), Uma Musume (Haru Urara, Oguri
  Cap, Gold Ship, Special Week...).
- **Looks:** 35 aesthetic avatars (Y2K baddie, emo, grunge, preppy, old money...), 30 dressed 3D bodies, 20 popular
  avatars (Rich Dominus, Valk + Korblox, Bacon Hair, Classic Noob...), random accessories for crowds; R6, R15, Rthro
  bodies; Roblox-style **nametags** over heads (usernames are a joke slot: "LastSliceLarry").
- **Monsters (rigs):** Siren Head, clowns, SCP-096, Slenderman, werewolf, wendigo, ghost girl, the Rake, Cartoon Cat, the
  Nun, zombies, the Mimic, a tall shadow, SCP-939, SCP-3008, a building-sized giant monster.
- **Faces:** animated dynamic heads and a cartoon face pack (smug, shocked, angry...), lip sync from the dialogue text.

**Actions (what characters can do, chained in queues):** walk, run, flee screaming, sit, stand, turn, say (speech
bubbles), punch (jab / cross / hook / body / uppercut), kick, slap, block, dodge, knock-outs, ragdoll; weapons: pistol,
rifle, shotgun (always miss people unless scripted), **bazooka** (the channel's running gag: a quick-draw blast,
everyone ragdolls), frying pan, bat, **pie** to the face; slapstick: banana slip, trip, faint, bonk, double-take;
superpowers: superhero **leap** with landing, **forceStop** (stops a bus / train with one palm), **power shout** (a shout
that blows doors open and sends people tumbling into a chair), seething with steam (`fume`), a full tumble down stairs;
gestures (laugh, facepalm, shrug, nod, point, cheer, cower, victory, think, typing, writing on a board, crack knuckles,
the six-seven meme); **100+ emotes and dances** (Griddy, Floss, the Worm, Orange Justice, Hot To Go, Gangnam Style,
Macarena, Thriller, Rat Dance, APT, the Caramelldansen... plus reactions: cower, applaud, fake death); riding bikes and
scooters; horror moves (glide, teleport, appear / vanish, glowing eyes, light flicker, TV static, camera flash, a red
sky).

**Voices and sound:** TikTok TTS voices per character (Jessie, Joey, the narrator, Ghostface, Grinch, Rocket, the wacky
voice, UK / AU accents...; "..." is a pause), ElevenLabs voices for longer stories (paid, used sparingly). Roblox sound
effects: hits, crashes, explosions, the classic **oof**, short yelps, horror foley. A TikTok's own audio can be laid
under a remake (format 17).

**Cameras:** automatic directors that cut on every beat (close-ups for lines, wide for crashes), or scripted shot lists
(fixed, chase, onboard / in-car, close-up, tracking, drone-high). Every video is composed for **16:9 and vertical 4:5**.

**Edit and finish tools:** a short title over the opening; the TV-news lower third (BREAKING / NEWS tag, headline with
red keywords, location tag, ticker, LIVE and channel bugs, six styles); the GTA **"WASTED"** ending (slow-mo, grey, big
red text); hit-stops and slow-motion on the climax; shader finishes (a Blender-like "render" look by default; anime,
cel, toon, comic, paint); generated music cues (paid, sparingly); voices mixed in after recording.

**Not possible yet (mark ideas needing these as effort B or C):** water you can swim in, boats and ships, flying
vehicles or planes, animals (except as costumes or monsters), lightsabers / wands / custom held props beyond the list
above, tornadoes and weather, a school hallway with lockers, a cafeteria, vehicles driving through house walls, on-screen
game HUDs (health bars, counters), real-world locations or real people's likenesses, anything that needs a real
human's voice.

## 4. The user's rules (every idea and script must respect them)

- **Start on the action.** The first second shows the premise; no intros, no countdown, no logo sting.
- **Short:** most formats 15-35 s (Movies in 60 Seconds up to 60 s). One premise per video.
- **At most 3 puns per video** (the hook's idiom counts). Setup, a calm beat, then the gag.
- **No hitting unless the idea calls for it**; slapstick (slips, bonks, ragdolls) is the default comedy.
- **The bazooka payoff is a quick draw:** the line is said empty-handed, then it appears and fires in under a second.
- **Screams:** in comedy, the classic Roblox **oof** or short yelps, never long screams.
- **Never canned laughter. Never klaxon / goofy car horns. No sound under titles.**
- **The user's avatar `toy_fan_tv` plays a lead by default** (the "Bro", the reporter, the asker...), and every video
  hides small easter eggs: posters of the user's two song covers and a "TOY FAN TV" sign / sticker, in the background.
- **Breaking News videos** always carry the TV lower third, in a different style each video.
- **Kid-safe slapstick:** no deaths, gore, drunk driving, shootings of people, sexual content, or slurs in headlines or
  dialogue. Victims ragdoll, get up and "oof". Laugh at situations, not at one real kid; no emergencies or school drills
  played for laughs.
- **Copyright:** never use a film's or show's audio, music or footage (Content ID mutes / claims it). Famous one-liners
  are fine; paraphrase the rest. Sound remakes (format 17) use a TikTok's original sound, credited, posted on TikTok
  with that sound.
- **Originality:** take the *pattern* from other creators, never their joke, script, characters, headline wording or
  branding.
- Colour and look are handled locally (vibrant, rich, no vignette, no letterbox bars); you don't need to specify them.

## 5. The 26 formats (the backlog's series)

| Prefix | Series | Premise | Length |
|---|---|---|---|
| BIS | Bro, I'm Sorry | "Bro, I'm sorry. Time flies." The idiom walks in as a person and acts itself out | 25-35 s |
| LIT | Take It Literally | figures of speech done literally ("cost an arm and a leg" = Korblox) | 20-30 s |
| MOM | Roblox Mom Says | a parent classic comes true ("I'll turn this car around" = a 180 drift on the highway) | 20-30 s |
| CAR | Car Puns That Crash | a car pun + a real crash ("you can crash at my place") | 15-25 s |
| LVL | Level 1 vs 100 vs 999 | one action at three power levels; 999 uses superpowers | 15-25 s |
| NPH | Noob vs Pro vs Hacker | one task three ways; the hacker gets banned | 20-30 s |
| ESC | It Escalated Quickly | a petty trigger to army-level chaos in four steps, then calm | 20-30 s |
| ANI | Anime Characters Get Jobs | a character's famous trait wrecks a normal job (Zoro as a delivery driver) | 25-35 s |
| MON | Monsters With Normal Problems | horror build-up, then a mundane twist | 20-30 s |
| TYP | Types of ___ | 4-5 quick stereotypes with title cards ("which one are you?") | 25-40 s |
| JOK | Joke Visualized | a classic Q&A joke, then the punchline happens on screen | 12-20 s |
| ROAD | Why Did the ___ Cross the Road? | a character, an answer, a different vehicle every time | 12-20 s |
| DRV | Drive-Thru | orders taken literally ("make it a combo" = combo punches) | 15-25 s |
| HON | Way Too Honest | an interview / doctor / cop stop answered far too honestly | 25-35 s |
| POV | POV | second person: the camera is you | 15-25 s |
| PUN | Pun Battle | a fighting game where every pun is a hit (needs a HUD: effort B) | 25-35 s |
| SND | Sound Remakes | a trending TikTok sound restaged with Roblox characters | 10-40 s |
| RP | Roblox RP Life | Brookhaven-style roleplay skits ("Dad went to get milk") | 25-40 s |
| NEWS | Breaking News | deadpan headlines from the Roblox-verse under a TV lower third (after @robloxianews3) | 6-25 s |
| MSHS | Middle School vs High School | the same school moment: chaos vs dead silence (+ Day 1 vs Day 180) | 15-25 s |
| TCH | The Teacher Said... | a teacher classic comes true ("We'll wait." 3 YEARS LATER) | 15-25 s |
| TLR | When the Teacher Leaves the Room | instant chaos, then the freeze when the door opens (loops) | 15-25 s |
| AURA | Minus 1000 Aura | embarrassing school moments with an aura score (calling the teacher "Mom") | 15-25 s |
| CLS | Every ___ Class Ever | one class's stereotypes (math, PE, the science volcano that explodes) | 25-35 s |
| MOV | Movies in 60 Seconds | a whole film, deadpan narration, budget casting (the Titanic is a school bus) | 45-60 s |
| SCN | Famous Movie Scenes, Roblox Edition | one iconic scene restaged, then a Roblox twist | 10-25 s |

**Proven so far:** the five voiced pun shorts (BIS: The Truth Hurts, Reality Check, What Goes Around, Hunger Strikes,
Life Comes At You Fast) and the sound remakes (Every Bathroom Pass, Day 3 of English Class, Way Too Honest Interview,
Nobody Nose, Do You Wear Wigs, When You Finally Sit Down). The user's own notes from reviewing them: fewer puns land
better; the "why did the noob cross the road" riddle didn't land, so it was reworked as a Breaking News report.

**What makes a short travel (the playbook's checklist):** the premise readable in the first second (a top caption of 8
words or fewer); 20-35 s; works with the sound off (short bubble lines, visual gags); something changes every 2-3 s; cut
on the punch, ideally looping into the first frame; series names and part numbers; recurring characters with fixed
voices; comment bait in the script ("which one are you", "rate this pun", "guess the next one"); Roblox-native
references (oof, noob, Bacon Hair, Robux, Headless / Korblox, Dominus, lag, ban, admin, six-seven, Brookhaven RP) for the
core audience, anime and movies for reach; running gags across videos (the bazooka ending, the Noob always gets hit).

## 6. Research mission

**Questions to answer:**
1. Which creators make Roblox (or Roblox-style animated / machinima) comedy shorts that get big views right now, and what
   are their repeatable formats? (Roblox animation, Roblox story / RP skits, Roblox "breaking news", Brookhaven skits,
   Roblox memes edits, "POV" Roblox skits, Roblox horror-comedy, Gacha / anime-style skits, Minecraft-style skit channels
   whose formats transfer.)
2. Which of their **formats** could become new series here (things this engine does well: crashes, slapstick, crowds,
   anime characters, monsters, emotes, TV-news overlays)?
3. What is trending **this month** for the core audience (roughly 8-16): memes and catchphrases (like six-seven, aura,
   "chicken jockey"), Gen Alpha slang, trending TikTok sounds that are dialogue skits, the top Roblox games and their
   updates (Grow a Garden, Steal a Brainrot, 99 Nights in the Forest, Brookhaven, Bloxburg, Adopt Me, Dress to Impress,
   DOORS... check what's current), new films and shows kids are talking about, school-season moments (exams, holidays,
   the first snow, Halloween, Christmas break, summer).
4. Which of our 26 formats look most like what's winning, so the user can prioritise them?

**Where to look:**
- TikTok: creator profiles sorted by **Popular**, hashtags (#roblox #robloxanimation #robloxfunny #robloxedit #brookhaven
  #robloxstory #robloxmemes #bloxburg), and **TikTok Creative Center** (public: trending hashtags, songs, creators by
  region and period).
- YouTube: Shorts search ("roblox animation", "roblox funny", "roblox story", "roblox breaking news", "brookhaven
  skit"), channel Shorts tabs sorted by **Popular**, view counts, upload dates.
- Instagram Reels, Know Your Meme (memes), Roblox's own charts (top and trending games).
- Creators already used as inspiration here (look at what else they do): **@robloxianews3** (TikTok, Roblox breaking
  news: 6-10 s of RP footage under a news lower third), **American High Shorts** (school skits; "every bathroom pass"),
  **ItsBobbyFinn** ("Day 3 of English class"), **funmations** ("Nobody nose"), **@javadoodles** / **@filmmmv** (the "do
  you wear wigs" interview). Find at least 15 more.

**How to research:**
- Note only what's public. TikTok shows log-in walls: **never sign in, create an account, or solve a CAPTCHA**; use the
  profile grid, Popular sort, video pages' captions, TikTok Creative Center, YouTube mirrors of the same creators.
- **Don't download or re-upload anyone's videos.** Take notes: what happens, timings, text, structure.
- For each creator: handle, platform, followers, 3-5 top videos (URL, views / likes, date, length), their repeatable
  format(s), the hook in the first 2 s, the structure, the on-screen text style, recurring characters, sound
  (original voices / TTS / trending sound / music), posting cadence, and **why you think it works**.
- Prefer patterns seen across several creators over one-off viral flukes; note the date of every number you quote.

## 7. What to deliver

**A. `research_report.md`**
1. Top creators (15-25): a table with the fields above, and the format each one maps to (ours or "new").
2. What's winning: hooks, lengths, structures, text styles, sounds; with examples (links).
3. Trends right now: memes, slang, sounds, games, films, seasonal moments (with dates, and how long each is likely to
   stay relevant).
4. **3-6 new format proposals**, each in the playbook's shape: name; one-line premise; beat sheet with seconds; title
   pattern; hook; ending; comment bait; sets and cast from section 3; a bank of 20+ fillers; why it travels; what it
   needs from the engine (A / B / C).
5. Which of our 26 formats to prioritise, which to drop, and why.

**B. `new_ideas.csv`**: new backlog rows, **exactly** this schema (header included, comma-separated, double-quoted where
needed, ASCII only, one row per video):

```
id,series,title,hook,payoff,set,cast,effort,status,final
NEWS-051,Breaking News,The Bus Finally Came,"Man waited *3 years* at the bus stop. Today the bus finally came","Raw: he waits on the bench; the city bus comes... through the bus stop.",city (BROOKHAVEN),"waiting man, city_bus",A,idea,
```
- `id`: an existing prefix (section 5) continuing after its highest number in the attached `ideas.csv`; for a new
  format, a new 3-5 letter prefix (not one in section 5) from 001. If you don't have `ideas.csv`, use `NEW-001...` and the
  local session renumbers.
- `hook`: the first line or the top caption (for NEWS: the headline, with `*red words*`). `payoff`: what happens, in one
  or two sentences. `set`: from section 3 (plus the game or place it pretends to be). `cast`: roles and looks from
  section 3. `effort`: **A** = buildable with section 3 as is; **B** = needs a prop, model or small edit feature (say
  which in `payoff`); **C** = needs engine work. `status`: `idea`. `final`: empty.
- Aim for **100+ rows**: about two thirds in existing formats (fresh fillers from the trends you found), one third in
  your new formats. **No duplicates** of titles or premises already in `ideas.csv`.

**C. `scripts.md`**: full scripts for your **10 best A-rated ideas**, ready to build: the cast (roles, looks, a TikTok
voice each), the set, and a beat sheet with times in seconds, every spoken line 8 words or fewer, at most 3 puns, the
gag and the ending; where it fits, the top caption and the title. For the three series that have generator templates,
write the episode as YAML in this shape (it drops straight into the local generator):

```yaml
# BIS (Bro, I'm Sorry). Beats: Bro's hook -> the idiom character's entrance (entrance: fly | leap | run) -> one gag
# (a character named after the pun runs past shouting it, and/or a setup line + the idiom's comeback) -> Bro's shot
# line, then a quick-draw bazooka -> the WASTED ending. Roles: bro (toy_fan_tv), victim (the Noob), idiom, runner,
# witness. Line slots: hook, intro, setup, runner, pun, shot, button ("" leaves an optional line out).
set: school
idiom: Time
entrance: fly
cast:
  idiom: { nameTag: "Time", label: "Time", look: 'cast = "sparkle_fedora"', voice: "tiktok:en_male_narration:0.9" }
  runner: { nameTag: "Late", label: "Late", look: 'cast = "leo"' }
lines:
  hook: "Bro, I'm sorry. Time flies."
  intro: "Hi. I'm Time."
  runner: "I'm running late!"
  shot: "Well... that was a waste of time."
extras: ["anime:Yuji", "anime:Megumi", "girl:random"]

# NEWS (Breaking News, the live-on-scene cut): the reporter reports calmly, the event happens behind her
template: news
set: city
headline: "Local noob crosses road for *free Robux*. Experts baffled"
location: BROOKHAVEN
ticker: "Noob in stable condition | Bus driver: 'He came out of nowhere' | Free Robux still not found"
vehicle: school_bus
speed: 65
pace: run
lines:
  report1: "Breaking news: a noob is crossing the road."
  shout: "FREE ROBUX!"
  report2: "Experts say he will be perfectly fine."
  button: "...Experts were wrong."
extras: ["girl:random", "boy:random"]

# ROAD (Why Did the ___ Cross the Road?). Beats: the asker's question (the row's hook) -> the hero's answer on the
# kerb -> the crossing -> the vehicle -> the button from the ground -> an optional tag (e.g. the running counter).
# Roles: hero (the Noob by default), asker (toy_fan_tv). Line slots: ask, answer, button, tag.
set: city
vehicle: ice_cream_truck        # any vehicle in section 3
speed: 85                       # at the hit (city 50-80, a bus barrelling through 85-100)
pace: run                       # walk, run or sprint
lines:
  answer: "To prove I'm not chicken!"
  button: "...Brain freeze."
  tag: "Noob deaths: two."
```

## 8. Quality bar (check every idea against it)

- Would a 12-year-old get it in one second, with the sound off?
- Is there one clear premise and one visual payoff (a crash, a leap, a ragdoll, a freeze, a reveal)?
- Does it end on the punch (or loop)? Is there a reason to comment?
- Is it original (a pattern borrowed, never a joke copied)? Is it kid-safe slapstick?
- Can the engine do it today (section 3)? If not, is the B / C need stated?
- Does it fit a series, so it can be made again and again?
