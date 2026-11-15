#!/usr/bin/env python3
"""Remake 3 (The Hotel of Every Year): write the spec's sound block from the director's events
(build/ep103/events.json) and the timeline.

Juniper Falls and the Almanac Hotel (a sunny street, birds); the corridor of year doors cracking open on their years;
the queue of grey-haired guests and the stamp; Mom's porch; the sepia memory (the raft, the girl who vanishes); the
birthday: Poppy slaps the desk bell, the bellhop's rules, the brass key; the 1994 door swings open on summer; Dot in
the oak tangled in her kite; kites, the raft, laughing hiccups; the bell over the HOME door rings; the bracelet; the
porch at evening, Mom's laugh with hiccups. Run after any timing change, then mkep + audio2.
"""
import json
E = json.load(open('build/ep103/events.json'))['events']
ep = json.load(open('build/ep103/timeline.json', encoding='utf8'))
spec_p = 'episodes/specs/ep103.json'; spec = json.load(open(spec_p, encoding='utf8'))
s = lambda i: ep['lines'][i]['start']; e = lambda i: ep['lines'][i]['end']; r3 = lambda x: round(x, 3)
cues = []
def cue(t, nm, g, **o): cues.append([str(r3(max(0, t))), nm, g] + ([o] if o else []))
END = ep['duration']
# Juniper Falls: the street outside the Almanac Hotel
cue(0, 'suburb', 0.06, dur=E['every'] - 0.1); cue(0.4, 'chirp', 0.04, f=1700, dur=0.4, up=0); cue(1.0, 'chirp', 0.03, f=1500, dur=0.35, up=0)
# the corridor of years: doors crack open, a shimmer of other times
cue(E['every'] - 0.1, 'roomtone', 0.06, dur=E['never'] - E['every']); cue(E['every'] + 0.1, 'shimmer', 0.045, dur=2.2)
cue(E['every'] + 0.6, 'creak', 0.05, dur=0.8); cue(E['diff'] - 0.2, 'creak', 0.045, dur=0.7)
cue(E['diff'] + 0.1, 'chime', 0.035, note=84)
# the queue of grey-haired guests; the bellhop's stamp
for k in range(3): cue(E['stay'] + 0.4 + k * 0.62, 'clunk', 0.045)
cue(E['save'] + 0.2, 'tick', 0.03, dur=1.6, rate=1); cue(E['gray'] + 0.3, 'pop', 0.03)
# Mom on her porch, smiling about one friend
cue(E['never'] - 0.1, 'suburb', 0.05, dur=E['poppy'] - E['never']); cue(E['smiled'] + 0.2, 'chime', 0.035, note=76)
# the sepia memory: the raft on the pond, the girl walks off and is gone
cue(E['poppy'] - 0.1, 'water', 0.03, dur=E['bday'] - E['poppy']); cue(E['summer'] + 0.05, 'whoosh', 0.045, dur=0.5)
cue(E['summer'] + 0.2, 'shimmer', 0.05, dur=1.0)
# the birthday: the lobby, she slaps the desk bell
cue(E['bday'] - 0.1, 'roomtone', 0.06, dur=E['behind'] - E['bday']); cue(E['bday'] + 0.2, 'footsteps', 0.04, dur=1.6, rate=2.4)
cue(E['asked'] + 0.9, 'ding', 0.09)
# the bellhop's rules; the brass key
cue(E['bell'] + 0.3, 'flick', 0.04); cue(E['rings'] + 0.2, 'ding', 0.03); cue(E['home'] + 0.1, 'lockturn', 0.04)
cue(E['sayw'] + 0.3, 'sting', 0.04)
# the 1994 door: the key turns, it swings open on summer
cue(E['behind'] + 0.1, 'lockturn', 0.06); cue(E['behind'] + 0.35, 'creak', 0.06, dur=1.0)
cue(E['behind'] + 0.5, 'shimmer', 0.05, dur=1.4); cue(E['behind'] + 0.6, 'wind', 0.03, dur=1.2)
# the meadow in 1994: birds; a girl tangled in her kite in the oak
cue(E['hung'] - 0.05, 'suburb', 0.05, dur=E['rang'] - E['hung']); cue(E['hung'] + 0.2, 'chirp', 0.04, f=1800, dur=0.4, up=0)
cue(E['hung'] + 0.9, 'chirp', 0.035, f=1500, dur=0.35, up=0); cue(E['tangled'] + 0.1, 'flutter', 0.05, dur=1.4, rate=10)
cue(E['mom12'] + 0.05, 'sting', 0.05); cue(E['help'] + 0.6, 'flutter', 0.04, dur=0.8, rate=12)
# kites, the raft, Dot laughing till she hiccups
cue(E['kites'] + 0.1, 'wind', 0.04, dur=1.1); cue(E['kites'] + 0.3, 'flutter', 0.05, dur=1.0, rate=11)
cue(E['raft'] - 0.05, 'water', 0.04, dur=1.1); cue(E['raft'] + 0.2, 'watersplit', 0.03)
cue(E['laughed'] - 0.05, 'sample', 0.05, name='dotlaugh', dur=2.3, rev=0.8, wet=0.15)
for h in [E['hic'] + 0.15, E['hic'] + 0.75, E['hic'] + 1.35, E['hit'] + 0.3, E['hit'] + 1.1]: cue(h, 'pop', 0.035)
# then it hits her
cue(E['hit'] + 0.05, 'whoosh', 0.04, dur=0.4); cue(E['lost'] + 0.6, 'sting', 0.05)
# the last evening: the bell over the HOME door rings
cue(E['last'] - 0.1, 'wind', 0.025, dur=E['athome'] - E['last']); cue(E['last'] + 0.3, 'chirp', 0.025, f=1200, dur=0.5, up=0)
for k in range(4): cue(E['rang'] + k * 0.32, 'ding', 0.07 - k * 0.012)
cue(E['tied'] + 0.3, 'paper', 0.03); cue(E['wrist'] + 0.2, 'chime', 0.04, note=79)
cue(E['every2'] + 0.6, 'creak', 0.05, dur=0.9); cue(E['every2'] + 1.3, 'shimmer', 0.05, dur=1.0)
# at home: the porch at evening, the bracelet, the raincoat, the DOT bracelet
cue(E['athome'] - 0.05, 'suburb', 0.045, dur=END - E['athome']); cue(E['athome'] + 0.3, 'chirp', 0.025, f=1300, dur=0.5, up=0)
cue(E['athome'] + 0.3, 'footsteps', 0.04, dur=E['saw'] + 0.6 - E['athome'], rate=2.2); cue(E['spelled'] + 0.2, 'chime', 0.035, note=76)
cue(E['saw'] + 0.2, 'sting', 0.035); cue(E['dotbr'] + 0.2, 'chime', 0.045, note=84)
# Mom laughs, hiccups and all
cue(E['laugh'] + 0.0, 'sample', 0.05, name='momlaugh', dur=2.0, rev=0.8, wet=0.15)
for h in [E['hiccups'] + 0.1, E['hiccups'] + 0.7, E['wasyou'] + 1.1, E['told'] + 0.4]: cue(h, 'pop', 0.035)
cue(E['laugh'] + 0.3, 'footsteps', 0.03, dur=1.6, rate=2.6); cue(E['told'] + 1.6, 'chime', 0.04, note=79)
spec['sound'] = {'key': 60, 'music_gain': 0.3,
  'music': [['0', 'mystery'], [str(r3(E['never'] - 0.1)), 'tender'], [str(r3(E['bday'] - 0.1)), 'playful'],
            [str(r3(E['behind'] - 0.1)), 'mystery'], [str(r3(E['kites'] - 0.1)), 'playful'], [str(r3(E['hit'] - 0.1)), 'suspense'],
            [str(r3(E['last'] - 0.1)), 'tender'], [str(r3(E['laugh'] - 0.1)), 'waltz']], 'cues': cues}
json.dump(spec, open(spec_p, 'w', encoding='utf8', newline='\n'), indent=1, ensure_ascii=False); print(len(cues), 'cues')
