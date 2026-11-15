#!/usr/bin/env python3
"""Remake 4 (The Sloth Bite): write the spec's sound block from the director's events
(build/ep104/events.json) and the timeline.

Copper Hollow (a sunny street, birds); the falcon nip and a sparkle; the gecko kid's scramble up the wall; the skunk
kid's cloud; the price boards; the petting zoo memory: the sloth's slow, slow bite; the school courtyard (the fountain,
kids laughing, Bo's parrot squawks); the dodgeball drifting, the lunch clock crawling; Zane the hare kid zipping round
the courtyard; the grab; the taunt and the crowd's laugh; Hazel's glare: the laugh stretches like taffy, a held glassy
freeze; the sloth's world rushing past; the stroll; the blink; the sprint and the splash; the walk. Run after any
timing change, then mkep + audio2.
"""
import json
E = json.load(open('build/ep104/events.json'))['events']
ep = json.load(open('build/ep104/timeline.json', encoding='utf8'))
spec_p = 'episodes/specs/ep104.json'; spec = json.load(open(spec_p, encoding='utf8'))
s = lambda i: ep['lines'][i]['start']; e = lambda i: ep['lines'][i]['end']; r3 = lambda x: round(x, 3)
cues = []
def cue(t, nm, g, **o): cues.append([str(r3(max(0, t))), nm, g] + ([o] if o else []))
END = ep['duration']
# Copper Hollow: the street, birds
cue(0, 'suburb', 0.06, dur=E['three'] - 0.1); cue(0.5, 'chirp', 0.04, f=1700, dur=0.4, up=0); cue(1.3, 'chirp', 0.03, f=1450, dur=0.35, up=0)
# the falcon nips the kid's finger; a sparkle of power
cue(E['power'] + 0.05, 'flutter', 0.05, dur=0.6, rate=12); cue(E['power'] + 0.1, 'pop', 0.04); cue(E['power'] + 0.2, 'shimmer', 0.05, dur=1.2)
# the gecko kid scrambling up the wall
cue(E['gecko'] - 0.05, 'scrape', 0.04, dur=0.5, seed=3); cue(E['gecko'] + 0.5, 'scrape', 0.035, dur=0.5, seed=5); cue(E['gecko'] + 1.0, 'scrape', 0.03, dur=0.5, seed=7)
# the skunk cloud; Nora backs off
cue(E['skunk'] - 0.1, 'whoosh', 0.04, dur=0.8); cue(E['argue'] + 0.1, 'groan', 0.025, dur=1.8)
# the price boards
cue(E['mansions'] + 0.05, 'ding', 0.05); cue(E['mansions'] + 0.2, 'sting', 0.03, dur=2.6)
# the memory: the petting zoo; the sloth takes an age to bite
cue(E['three'] - 0.1, 'wind', 0.03, dur=E['school'] - E['three']); cue(E['three'] + 0.1, 'shimmer', 0.04, dur=1.0)
cue(E['three'] + 0.4, 'creak', 0.035, dur=1.4); cue(E['slothw'] + 0.05, 'pop', 0.05); cue(E['slothw'] + 0.1, 'chime', 0.03, note=72)
# the school courtyard: the fountain, kids laughing at Hazel
cue(E['school'] - 0.1, 'water', 0.02, dur=E['nobody'] + 6 - E['school']); cue(E['school'] - 0.1, 'roomtone', 0.03, dur=E['zane'] - E['school'])
cue(E['slow1'] - 0.1, 'sample', 0.04, name='crowdlaugh', dur=1.4, rev=0.8, wet=0.2)
# Bo's parrot squawks along
for k, f in enumerate([2100, 1900, 2300]): cue(E['parrot'] + 0.1 + k * 0.28, 'chirp', 0.045, f=f, dur=0.18, up=k % 2)
for k in range(3): cue(E['bo'] + 0.15 + k * 0.5, 'chirp', 0.04, f=2000 + k * 150, dur=0.2, up=1)
# the dodgeball drifting like a soap bubble; the lunch clock crawling
cue(E['dodge'] - 0.1, 'whoosh', 0.04, dur=1.6); cue(E['dodge'] + 0.6, 'shimmer', 0.035, dur=1.6)
cue(E['clock'] - 0.1, 'tick', 0.05, dur=1.9, rate=0.45)
# Zane, the hare kid: zipping laps, snatching cookies and phones
cue(E['zane'] + 0.2, 'swish', 0.05); cue(E['hare'] + 0.3, 'whoosh', 0.05, dur=0.6)
cue(E['hare'] + 0.5, 'run', 0.04, dur=1.8)
for t in [E['faster'] + 0.2, E['faster'] + 0.7]: cue(t, 'swish', 0.05)
cue(E['zip'] + 0.1, 'whoosh', 0.06, dur=0.7)
for k in range(4): cue(E['snatch'] + k * 0.22, 'pop', 0.035)
cue(E['snatch'] + 0.9, 'phonebuzz', 0.02, dur=0.4)
# the grab: a gust and the sketchbook is gone
cue(E['grab'] + 0.7, 'swish', 0.06); cue(E['grab'] + 0.75, 'paper', 0.05, dur=0.6)
# the taunt; everyone laughs
cue(E['taunt'] + 0.1, 'paper', 0.035, dur=0.5, seed=4)
cue(E['laughed'] + 0.05, 'sample', 0.05, name='crowdlaugh', dur=1.6, rev=0.8, wet=0.2)
cue(E['laughed'] + 0.25, 'sample', 0.045, name='zanelaugh', dur=1.6, rev=0.6, wet=0.15)
# the glare: the laugh stretches like taffy, time thickens
cue(E['glared'] + 0.1, 'riser', 0.035, dur=1.5); cue(E['taffy'] - 0.1, 'sample', 0.05, name='zanelaugh', dur=1.0, rate=0.32, rev=1.2, wet=0.3)
cue(E['taffy'] + 0.2, 'freeze', 0.05, dur=2.2); cue(E['taffy'] + 0.6, 'hum', 0.02, dur=E['real'] - E['taffy'], f=110)
# the sloth's world rushing past in fast-forward
cue(E['real'] - 0.05, 'wind', 0.03, dur=E['power2'] - E['real']); cue(E['rushes'] + 0.05, 'whoosh', 0.05, dur=0.5)
cue(E['rushes'] + 0.45, 'whoosh', 0.045, dur=0.5); cue(E['rushes'] + 0.85, 'whoosh', 0.04, dur=0.5)
cue(E['power2'] + 0.1, 'chime', 0.035, note=76); cue(E['making'] + 0.1, 'shimmer', 0.05, dur=1.6)
# she keeps staring: Zane hangs mid-leap in a held glassy hum
cue(E['kept'] - 0.05, 'hum', 0.025, dur=E['blink'] - E['kept'], f=96); cue(E['hung'] + 0.1, 'freeze', 0.04, dur=2.0)
# the stroll; she takes everything back
cue(E['stroll'] + 0.1, 'footsteps', 0.05, dur=1.2, rate=1.8)
for k in range(5): cue(E['took'] + 0.2 + k * 0.17, 'pop', 0.03)
cue(E['took'] + 0.3, 'paper', 0.035, dur=0.6, seed=6)
# she turns him toward the fountain, and blinks
cue(E['turned'] + 0.3, 'scrape', 0.03, dur=0.4, seed=9); cue(E['blink'] - 0.02, 'ding', 0.05)
# the sprint and the splash
cue(E['U0'] + 0.0, 'whoosh', 0.07, dur=0.8); cue(E['U0'] + 0.1, 'run', 0.05, dur=1.3)
cue(E['splash'] - 0.05, 'watersplit', 0.08, dur=2.4); cue(E['splash'] + 0.5, 'sample', 0.035, name='crowdlaugh', dur=1.5, rev=0.8, wet=0.2)
# "Take your time." then the walk: everyone studies their shoes
cue(E['take'] - 0.1, 'sting', 0.025, dur=2.6)
cue(E['nobody'] + 0.1, 'footsteps', 0.04, dur=END - E['nobody'] - 0.6, rate=1.9); cue(E['shoes'] + 0.3, 'chime', 0.035, note=79)
cue(END - 1.0, 'chirp', 0.025, f=1500, dur=0.35, up=0)
spec['sound'] = {'key': 62, 'music_gain': 0.3,
  'music': [['0', 'playful'], [str(r3(E['three'] - 0.1)), 'tender'], [str(r3(E['school'] - 0.1)), 'playful'],
            [str(r3(E['zane'] - 0.1)), 'action'], [str(r3(E['glared'] - 0.1)), 'suspense'], [str(r3(E['real'] - 0.1)), 'wonder'],
            [str(r3(E['kept'] - 0.1)), 'mystery'], [str(r3(E['U0'] - 0.05)), 'playful'], [str(r3(E['nobody'] - 0.1)), 'tender_hope']], 'cues': cues}
json.dump(spec, open(spec_p, 'w', encoding='utf8', newline='\n'), indent=1, ensure_ascii=False); print(len(cues), 'cues')
