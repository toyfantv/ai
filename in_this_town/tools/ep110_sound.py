#!/usr/bin/env python3
"""Remake 10 (The City Where It's Always Noon): write the spec's sound block from the director's events
(build/ep110/events.json) and the timeline.

Sunmere at noon (a bright plaza, the clock tower's bell stuck at twelve); bedtime masks; the Rim (a low hum);
balloons popping at one height; Grandpa's brass key; the snore and the slip; the walk to the Rim at "night"
(footsteps), the hedge, the crew door; the guard, the alarm clock thrown into the bushes (ringing), the key turned,
the door sliding; black sky and stars; the ship and its lamp; Grandpa's hand; the green planet; tomorrow we land;
the sun switched off for the first time.
Run after any timing change, then mkep + audio2.
"""
import json
E = json.load(open('build/ep110/events.json'))['events']
ep = json.load(open('build/ep110/timeline.json', encoding='utf8'))
spec_p = 'episodes/specs/ep110.json'; spec = json.load(open(spec_p, encoding='utf8'))
s = lambda i: ep['lines'][i]['start']; e = lambda i: ep['lines'][i]['end']; r3 = lambda x: round(x, 3)
cues = []
def cue(t, nm, g, **o): cues.append([str(r3(max(0, t))), nm, g] + ([o] if o else []))
END = ep['duration']
# Sunmere at noon: the plaza, the stuck bell
cue(0, 'suburb', 0.09, dur=s(2) - 0.1); cue(0.4, 'chirp', 0.05); cue(0.6, 'footsteps', 0.04, dur=2.6, rate=1.5)
cue(1.2, 'bell', 0.05, dur=2.0)
# bedtime: everyone pulls on a sleep mask
cue(E['masks'] - 0.15, 'whoosh', 0.05, dur=0.4); cue(E['masks'] + 0.25, 'flick', 0.05); cue(E['masks'] + 0.5, 'flick', 0.04)
# the Rim, the white wall
cue(E['rim'] - 0.2, 'wind', 0.06, dur=s(3) - E['rim'] + 0.2); cue(E['rim'] + 0.1, 'hum', 0.05, dur=2.6, f=55)
cue(E['rim'] + 0.3, 'sting', 0.05)
# balloons always pop at the same height
cue(s(3) - 0.05, 'suburb', 0.07, dur=s(4) - s(3)); cue(E['balloons'] + 0.4, 'pop', 0.08)
cue(E['balloons'] + 1.1, 'pop', 0.07); cue(E['same'] + 0.2, 'pop', 0.08); cue(E['same'] + 0.9, 'ding', 0.04)
# Grandpa's brass key
cue(s(4) - 0.05, 'suburb', 0.06, dur=s(6) - s(4)); cue(E['key'] - 0.1, 'shimmer', 0.05, dur=1.2)
cue(E['junk'] + 0.6, 'clunk', 0.04)
# bedtime: the snore, the slip
cue(s(6) - 0.05, 'roomtone', 0.07, dur=s(7) - s(6)); cue(E['bed'] + 0.15, 'tick', 0.04, dur=3.0, rate=1)
cue(E['bed'] + 0.1, 'sample', 0.06, name='snore', rev=0.15, wet=0.05)
cue(E['slip'] + 0.2, 'creak', 0.05); cue(E['neck'] + 0.1, 'chime', 0.04, note=79)
# the walk to the Rim, the hedge, the crew door
cue(s(7) - 0.05, 'wind', 0.06, dur=s(9) - s(7)); cue(E['walk'] + 0.1, 'footsteps', 0.06, dur=1.6, rate=1.6)
cue(E['hedge'] + 0.2, 'flutter', 0.05); cue(E['door'] + 0.1, 'drone', 0.04, dur=2.3); cue(E['crew'] + 0.2, 'sting', 0.05)
# the guard; the alarm clock into the bushes; the key turns
cue(E['guard'] + 0.1, 'footsteps', 0.05, dur=1.2, rate=1.2)
cue(E['throw'] - 0.1, 'whoosh', 0.08, dur=0.5); cue(E['throw'] + 0.45, 'flutter', 0.06)
cue(E['ring'] - 0.05, 'ringtone', 0.07, dur=E['open'] + 1.4 - E['ring'])
cue(E['turn'] + 0.3, 'lockturn', 0.11); cue(E['turn'] + 0.9, 'clunk', 0.07)
# the door slides: black sky, a billion stars
cue(E['open'] - 0.1, 'chainslide', 0.08); cue(E['open'] + 0.1, 'riser', 0.04, dur=1.0)
cue(E['open'] + 0.4, 'shimmer', 0.08, dur=2.6); cue(E['open'] + 0.5, 'drone', 0.05, dur=s(11) - E['open'] - 0.4)
cue(E['stars'] + 0.4, 'sample', 0.07, name='whoa', rev=0.3, wet=0.1)
# a ship; the sun was a lamp
cue(E['ship'] - 0.1, 'rumble', 0.06, dur=E['lampT'] - E['ship'] + 0.4); cue(E['ship'] + 0.2, 'hum', 0.05, dur=4.0, f=48)
cue(E['lampT'] + 0.1, 'sting', 0.07); cue(E['lampT'] + 0.4, 'hum', 0.04, dur=1.6, f=110)
# Grandpa: let her go, Tomas; the dying world; the green planet
cue(E['tomas'] - 0.4, 'footsteps', 0.05, dur=0.9, rate=1.3)
cue(s(12) - 0.05, 'hum', 0.04, dur=s(14) - s(12), f=52); cue(E['carries'] + 0.2, 'whisper', 0.03, dur=1.2)
cue(E['planet'] + 0.1, 'shimmer', 0.07, dur=2.2); cue(E['planet'] + 0.3, 'chime', 0.05, note=76)
# we steer it; why tomorrow; because tomorrow we land
cue(E['steer'] + 0.3, 'clunk', 0.04); cue(E['land'] + 0.2, 'riser', 0.05, dur=1.6)
cue(E['weland'] + 0.1, 'chime', 0.06, note=81)
# the sun switches off for the first time
cue(E['off'] - 0.1, 'winddown', 0.08, dur=2.4); cue(E['off'] + 0.6, 'flick', 0.05)
cue(E['offW'] + 0.2, 'shimmer', 0.07, dur=2.4); cue(E['offW'] + 0.6, 'chirp', 0.03)
spec['sound'] = {'key': 57, 'music_gain': 0.3,
  'music': [['0', 'playful'], [str(r3(s(2) - 0.1)), 'mystery'], [str(r3(s(3) - 0.1)), 'playful'], [str(r3(s(6) - 0.1)), 'musicbox'],
            [str(r3(s(7) - 0.1)), 'suspense'], [str(r3(E['open'] - 0.1)), 'cosmic'], [str(r3(s(11) - 0.1)), 'tender'],
            [str(r3(s(13) - 0.1)), 'wonder'], [str(r3(s(17) - 0.1)), 'tender']], 'cues': cues}
json.dump(spec, open(spec_p, 'w', encoding='utf8', newline='\n'), indent=1, ensure_ascii=False); print(len(cues), 'cues')
