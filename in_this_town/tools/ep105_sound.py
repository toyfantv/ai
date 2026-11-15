#!/usr/bin/env python3
"""Remake 5 (The Most Common Name): write the spec's sound block from the director's events
(build/ep105/events.json) and the timeline.

Pebble Creek (a sunny street, birds); the pumpkin's pop; the tailor's sneeze and the fabric whirl; Ezra's strain and
nothing; Brock creaking the lamp post over; the toss into the trash can; the park memory: the goose's honks and the
chase, "Dad!", Dad holding the goose; the corn maze rustle and the tap; the school bell and the whistle; the alley
behind the arcade (the neon buzz); the stop sign knotted with a metal groan; the taunt; "Dad?" and the POOF: a
teleport, sparkles, the pancake flipping and landing; the name sign's dings; the office line; "DAD!" echoing into
nothing (wind, a cricket, the paper bag); next morning, the polite wave. Run after any timing change, then mkep + audio2.
"""
import json
E = json.load(open('build/ep105/events.json'))['events']
ep = json.load(open('build/ep105/timeline.json', encoding='utf8'))
spec_p = 'episodes/specs/ep105.json'; spec = json.load(open(spec_p, encoding='utf8'))
r3 = lambda x: round(x, 3)
cues = []
def cue(t, nm, g, **o): cues.append([str(r3(max(0, t))), nm, g] + ([o] if o else []))
END = ep['duration']
# Pebble Creek: the street, birds
cue(0, 'suburb', 0.06, dur=E['goose'] - 0.1); cue(0.6, 'chirp', 0.04, f=1700, dur=0.4, up=0); cue(1.5, 'chirp', 0.03, f=1450, dur=0.35, up=0)
# the pumpkin grows in a blink; the tailor's sneeze whirls a suit together
cue(E['blink'] - 0.05, 'whoosh', 0.04, dur=0.4); cue(E['blink'] + 0.1, 'pop', 0.06); cue(E['blink'] + 0.15, 'shimmer', 0.035, dur=0.9)
cue(E['sneeze'] - 0.6, 'riser', 0.02, dur=0.55); cue(E['sneeze'] - 0.05, 'impact', 0.035); cue(E['sneeze'] + 0.05, 'whoosh', 0.05, dur=0.8)
cue(E['sneeze'] + 0.2, 'paper', 0.035, dur=0.6, seed=3); cue(E['sneeze'] + 0.7, 'ding', 0.04)
# Ezra strains for a power: a hum, then nothing
cue(E['power'] - 0.4, 'hum', 0.025, dur=1.6, f=140); cue(E['power'] + 1.3, 'winddown', 0.03, dur=0.9)
# Brock bends the lamp post; the toss into the can
cue(E['posts'] + 0.05, 'creak', 0.06, dur=1.0); cue(E['posts'] + 0.3, 'scrape', 0.035, dur=0.6, seed=5)
cue(E['called'] + 0.4, 'whoosh', 0.05, dur=0.7); cue(E['dumped'] + 0.15, 'impact', 0.06); cue(E['dumped'] + 0.2, 'clash', 0.035)
cue(E['dumped'] + 0.35, 'sample', 0.035, name='crowdlaugh', dur=1.3, rev=0.6, wet=0.15)
# the park: the goose chase
cue(E['goose'] - 0.1, 'wind', 0.025, dur=E['principal'] - E['goose']); cue(E['goose'] - 0.05, 'whoosh', 0.04, dur=0.5)
cue(E['goose'] + 0.1, 'sample', 0.06, name='goose', dur=1.4); cue(E['goose'] + 0.1, 'run', 0.05, dur=1.9)
for k in range(4): cue(E['goose'] + 0.2 + k * 0.32, 'flutter', 0.04, dur=0.25, rate=14)
cue(E['there'] + 0.05, 'sting', 0.03, dur=2.4); cue(E['there'] + 0.4, 'sample', 0.035, name='goose', dur=0.7, rate=1.1)
# the corn maze: rustle, the whisper, the tap
cue(E['corn'] - 0.05, 'scrape', 0.02, dur=1.2, seed=8); cue(E['corn'] + 1.4, 'scrape', 0.018, dur=1.0, seed=11)
cue(E['tap'] - 0.05, 'pop', 0.04); cue(E['tap'] + 0.05, 'chime', 0.03, note=72)
# Dad the principal: the school bell, the whistle
cue(E['principal'] - 0.05, 'beep', 0.025, f=1250, dur=0.5); cue(E['principal'] + 0.6, 'chirp', 0.05, f=3000, dur=0.4, up=1)
cue(E['principal'] + 0.3, 'crowdsteps', 0.03, dur=1.8)
# the alley behind the arcade
cue(E['alley'] - 0.1, 'buzz', 0.015, dur=E['now'] - E['alley'] - 0.1); cue(E['alley'] - 0.1, 'roomtone', 0.03, dur=E['now'] - E['alley'] - 0.1)
cue(E['alley'] + 0.2, 'footsteps', 0.04, dur=1.8, rate=1.6)
cue(E['knot'] - 0.5, 'creak', 0.06, dur=1.1); cue(E['knot'] - 0.2, 'chainslide', 0.035, dur=0.8); cue(E['knot'] + 0.5, 'clash', 0.03)
cue(E['taunt'] - 0.1, 'sting', 0.025, dur=2.4)
# "Dad?" ... POOF
cue(E['whisper'] + 0.2, 'riser', 0.03, dur=0.3); cue(E['poof'] - 0.03, 'teleport', 0.07); cue(E['poof'] + 0.02, 'pop', 0.07)
cue(E['poof'] + 0.05, 'shimmer', 0.05, dur=1.6); cue(E['poof'] + 0.1, 'whoosh', 0.04, dur=0.8)
for k in range(4): cue(E['poof'] + 0.15 + k * 1.05, 'swish', 0.03)
cue(E['land'] + 0.0, 'impact', 0.04); cue(E['land'] + 0.05, 'ding', 0.035)
# the name sign: WILSON -> WIL SON -> WILL'S SON
cue(E['means'] - 0.05, 'pop', 0.04); cue(E['means'] + 0.35, 'ding', 0.045); cue(E['means'] + 1.15, 'chime', 0.045, note=76)
cue(E['son'] + 0.1, 'shimmer', 0.03, dur=1.6)
# the office line; cheating; nope
cue(E['office'] + 0.1, 'sting', 0.03, dur=2.4); cue(E['cheat'] - 0.05, 'stomp', 0.04)
cue(E['nope'] + 0.3, 'pop', 0.03)
# "DAD!" into nothing: an echo, wind, a cricket, a paper bag
cue(E['dadyell'] + 0.05, 'riser', 0.02, dur=0.6); cue(E['nothing'] - 0.05, 'wind', 0.06, dur=2.4)
for k in range(3): cue(E['nothing'] + 0.5 + k * 0.45, 'chirp', 0.03, f=4200, dur=0.12, up=0)
cue(E['nothing'] + 0.2, 'paper', 0.04, dur=1.8, seed=6)
# next morning: birds, footsteps, the polite wave
cue(E['now'] - 0.1, 'suburb', 0.05, dur=END - E['now'] + 0.1); cue(E['now'] + 0.2, 'chirp', 0.035, f=1600, dur=0.35, up=1)
cue(E['now'] + 0.1, 'footsteps', 0.035, dur=END - E['now'] - 0.6, rate=1.8); cue(E['morning'] + 1.6, 'chime', 0.035, note=79)
spec['sound'] = {'key': 62, 'music_gain': 0.3,
  'music': [['0', 'playful'], [str(r3(E['goose'] - 0.1)), 'action'], [str(r3(E['corn'] - 0.1)), 'tender'],
            [str(r3(E['alley'] - 0.1)), 'suspense'], [str(r3(E['poof'] - 0.05)), 'wonder'], [str(r3(E['office'] - 0.1)), 'playful'],
            [str(r3(E['nothing'] - 0.05)), 'mystery'], [str(r3(E['now'] - 0.1)), 'tender_hope']], 'cues': cues}
json.dump(spec, open(spec_p, 'w', encoding='utf8', newline='\n'), indent=1, ensure_ascii=False); print(len(cues), 'cues')
