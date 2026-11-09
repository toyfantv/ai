#!/usr/bin/env python3
"""Remake 1 (The Sorry Garden): write the spec's sound block from the director's events (build/ep101/events.json) and the timeline.

A bright village: birds and a soft street, a pop for every flower, the cart, the wind, the greenhouse going;
a quiet room for the flashback, then the dahlia crumbling and a whole street at the gate.
Run after any timing change, then mkep + audio2.
"""
import json
E = json.load(open('build/ep101/events.json'))['events']
ep = json.load(open('build/ep101/timeline.json', encoding='utf8'))
spec_p = 'episodes/specs/ep101.json'; spec = json.load(open(spec_p, encoding='utf8'))
s = lambda i: ep['lines'][i]['start']; e = lambda i: ep['lines'][i]['end']; r3 = lambda x: round(x, 3)
cues = []
def cue(t, nm, g, **o): cues.append([str(r3(max(0, t))), nm, g] + ([o] if o else []))
D = ep['duration']
# the village: a soft street and birds, except in Ruth's room
cue(0, 'suburb', 0.2, dur=s(17) - 0.1); cue(s(19) - 0.05, 'suburb', 0.2, dur=D - s(19) + 0.05)
for t, f in ((1.3, 1500), (3.6, 1750), (5.2, 1350), (14.4, 1600), (18.6, 1450), (32.2, 1250), (36.0, 1650), (59.9, 1700), (61.3, 1500), (63.0, 1800)): cue(t, 'chirp', 0.09, f=f)
# every flower: a small wet pop, a bright note for the small ones
cue(E['shove'], 'knock', 0.3); cue(E['shove'] + 0.08, 'swish', 0.14)
for k, n in (('pop0', 84), ('pop1', 88), ('pop2', 79), ('pop3', 91)): cue(E[k], 'pop', 0.42); cue(E[k] + 0.02, 'chime', 0.09, note=n)
# the sorry that works: it lets go
cue(E['drop'] - 0.05, 'dustglitter', 0.2, dur=1.4); cue(E['drop'], 'swish', 0.1)
# Nell and her cart
cue(s(4) + 0.05, 'footsteps', 0.13, dur=s(5) - s(4) - 0.3, rate=2.6)
# the gust; the cart goes; she runs; the greenhouse
cue(s(7) + 0.3, 'wind', 0.26, dur=E['imp'] - s(7) + 1.5); cue(E['go'] - 0.1, 'whoosh', 0.2, dur=0.9); cue(E['go'] + 0.02, 'creak', 0.18, dur=0.9)
cue(E['go'] + 0.1, 'rumble', 0.3, dur=E['imp'] - E['go'] - 0.05); cue(E['go'] + 0.72, 'run', 0.2, dur=s(8) - E['go'] - 0.8)
cue(E['imp'] - 0.02, 'clunk', 0.5); cue(E['imp'], 'shatter', 0.8); cue(E['imp'] + 0.08, 'glass', 0.32, dur=1.6); cue(E['imp'] + 0.5, 'tick', 0.12, dur=0.9, rate=9)
# the empty beat after "It's only glass"
cue(s(11) + 0.2, 'wind', 0.08, dur=e(11) - s(11))
# a week later: her steps on the path
cue(s(12) + 0.05, 'footsteps', 0.15, dur=1.5, rate=2.2)
cue(s(16) + 0.9, 'paper', 0.2, dur=0.8)
# Ruth's room: quiet, the flowers crossing the bed
cue(s(17) - 0.05, 'roomtone', 0.1, dur=s(19) - s(17)); cue(s(17) + 2.0, 'knock', 0.14); cue(E['give'] - 0.1, 'flutter', 0.22, dur=E['clean'] - E['give'] + 0.1, rate=7); cue(E['give'], 'swish', 0.12); cue(E['clean'], 'chime', 0.14, note=76)
# "Not one bloom was his": nothing under it
# the blackest dahlia lets go, and the petals are carried off
cue(E['reach'] + 0.1, 'swish', 0.06); cue(E['crumble'] - 0.04, 'scrape', 0.2, dur=0.7, seed=31); cue(E['crumble'], 'dustglitter', 0.34, dur=2.6); cue(E['crumble'] + 0.1, 'wind', 0.2, dur=2.4); cue(E['crumble'] + 0.05, 'chime', 0.14, note=83)
# she runs; by morning, a street of feet and the gate
cue(s(23) + 0.05, 'run', 0.18, dur=1.5); cue(s(24) + 0.05, 'crowdsteps', 0.16, dur=D - s(24) - 0.1, seed=7, per_s=9); cue(s(24) + 0.3, 'creak', 0.14, dur=1.1); cue(s(24) + 2.2, 'dustglitter', 0.2, dur=2.4); cue(D - 2.1, 'chime', 0.14, note=88)
spec['sound'] = {'key': 57, 'music_gain': 0.3,
  'music': [['0', 'tender'], [str(r3(E['go'] - 0.2)), 'suspense'], [str(r3(E['imp'] + 0.02)), 'silence'], [str(r3(s(12) - 0.1)), 'musicbox'], [str(r3(s(17) - 0.1)), 'mystery'], [str(r3(s(20) - 0.1)), 'tender_hope']], 'cues': cues}
json.dump(spec, open(spec_p, 'w', encoding='utf8', newline='\n'), indent=1, ensure_ascii=False); print(len(cues), 'cues')
