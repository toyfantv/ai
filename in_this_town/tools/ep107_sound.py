#!/usr/bin/env python3
"""Remake 7 (The Voice in Every Ear): write the spec's sound block from the director's events (build/ep107/events.json) and the timeline.

A bright harbour with gulls and warm music; a sneeze and a rolling bead; dead air while Dez freezes; twenty sleeves at once and one whispered answer under the class;
the table's flat laugh in a single voice, cut dead; a drone and a swell of whispers for the one Sunny; the sea at dusk; two voices in one, then a hard stop.
Run after any timing change, then mkep + audio2.
"""
import json
E = json.load(open('build/ep107/events.json'))['events']
ep = json.load(open('build/ep107/timeline.json', encoding='utf8'))
spec_p = 'episodes/specs/ep107.json'; spec = json.load(open(spec_p, encoding='utf8'))
s = lambda i: ep['lines'][i]['start']; e = lambda i: ep['lines'][i]['end']; r3 = lambda x: round(x, 3)
cues = []
def cue(t, nm, g, **o): cues.append([str(r3(max(0, t))), nm, g] + ([o] if o else []))
D = ep['duration']; END = e(23) + 0.3
# the town, bright
cue(0, 'suburb', 0.2, dur=s(3) - 0.02)
for t, f in ((0.7, 1900), (2.1, 2300), (5.3, 2050), (8.9, 2400), (11.2, 1800)): cue(t, 'chirp', 0.08, f=f)
cue(E['ins'] - 0.02, 'pop', 0.3); cue(E['ins'], 'chime', 0.14, note=88); cue(s(1) - 0.05, 'dustglitter', 0.12, dur=1.4)
cue(s(2) + 2.95, 'chime', 0.12, note=84); cue(s(2) + 3.2, 'chime', 0.12, note=84)
# the ferry; the sneeze; the bead rolls
cue(s(3) - 0.02, 'sea', 0.22, dur=s(6) - s(3)); cue(s(3) + 0.3, 'hum', 0.05, dur=s(6) - s(3) - 0.4)
for t, f in ((s(3) + 0.5, 2000), (s(3) + 2.1, 2500)): cue(t, 'chirp', 0.08, f=f)
cue(E['snz'] - 0.62, 'sample', 0.6, name='sneeze', rev=0.3, wet=0.08)
cue(E['snz'], 'pop', 0.34); cue(E['snz'] + 0.6, 'pop', 0.22); cue(E['snz'] + 0.95, 'pop', 0.16); cue(E['snz'] + 1.0, 'tick', 0.14, dur=0.9, rate=15)
# now she can hear them
for t, f in ((s(5) + 0.1, 2200), (s(5) + 0.45, 2700), (s(5) + 0.8, 1950), (s(5) + 1.15, 2450), (s(5) + 1.4, 2800)): cue(t, 'chirp', 0.18, f=f)
cue(s(5) - 0.02, 'sea', 0.2, dur=1.8)
# the yard; dead air while he stops
cue(s(6) - 0.02, 'suburb', 0.17, dur=E['frz'] - s(6)); cue(E['frz'] + 0.1, 'hum', 0.06, dur=E['res'] - E['frz'] - 0.1); cue(E['frz'], 'tick', 0.12, dur=0.2, rate=4); cue(E['res'], 'suburb', 0.14, dur=s(9) - E['res'])
# the class: twenty sleeves, one whisper
cue(s(9) - 0.02, 'roomtone', 0.1, dur=s(12) - s(9)); cue(E['hands'] - 0.02, 'swish', 0.3); cue(E['hands'], 'clunk', 0.24)
cue(s(10) + 0.4, 'sample', 0.13, name='whisper_answer', rev=1.2, wet=0.3); cue(s(11) - 0.1, 'sample', 0.13, name='whisper_answer', rate=0.98, rev=1.2, wet=0.3); cue(s(11) + 1.2, 'sample', 0.16, name='whisper_answer', rate=1.02, rev=1.2, wet=0.3)
# the laugh in one voice, cut dead
cue(s(12) - 0.02, 'roomtone', 0.1, dur=E['stop'] - s(12)); cue(s(12), 'crowdsteps', 0.08, dur=E['laugh'] - s(12), seed=4, per_s=6)
hl = (E['stop'] - E['laugh']) / 2
for k in (0, 1):
    for g, r in ((0.3, 1.0), (0.2, 0.97), (0.16, 1.03)): cue(E['laugh'] + k * hl, 'sample', g, name='laugh_flat', rate=r, dur=hl, rev=0.5, wet=0.12)
cue(E['stop'] + 0.02, 'roomtone', 0.06, dur=s(15) - E['stop'])
# there is only one
cue(s(15) - 0.05, 'drone', 0.2, dur=s(18) - s(15), f=55); cue(s(15), 'whisper', 0.12, dur=s(18) - s(15)); cue(E['one'] - 0.9, 'riser', 0.18, dur=1.0); cue(E['one'] + 0.02, 'chime', 0.14, note=60); cue(E['one'] + 0.1, 'sample', 0.16, name='whisper_answer', rate=0.82, rev=2.2, wet=0.45)
# dusk, the empty ferry
cue(s(18) - 0.02, 'sea', 0.24, dur=END - s(18)); cue(s(18) - 0.02, 'wind', 0.07, dur=END - s(18)); cue(s(18) + 0.05, 'footsteps', 0.16, dur=1.5, rate=2.3); cue(s(19) - 0.05, 'hum', 0.09, dur=2.1); cue(E['stand'] + 0.1, 'footsteps', 0.15, dur=1.4, rate=2.3)
# the dock
cue(E['walk'], 'footsteps', 0.14, dur=E['turn'] - E['walk'], rate=2.2); cue(E['turn'] - 0.02, 'creak', 0.16, dur=0.65); cue(E['turn'], 'drone', 0.12, dur=END - E['turn'], f=49)
cue(s(23), 'sample', 0.34, name='both_dez', rev=0.5, wet=0.15); cue(s(23), 'sample', 0.28, name='both_sunny', rev=0.5, wet=0.15)
spec['sound'] = {'key': 62, 'music_gain': 0.3,
  'music': [['0', 'tender'], [str(r3(E['snz'] - 0.05)), 'silence'], [str(r3(s(6) - 0.05)), 'tender'], [str(r3(E['frz'] - 0.02)), 'silence'], [str(r3(E['res'] + 0.5)), 'suspense'], [str(r3(E['stop'])), 'silence'], [str(r3(s(15) + 0.1)), 'mystery'], [str(r3(s(19) - 0.1)), 'suspense'], [str(r3(E['turn'] - 0.02)), 'silence']], 'cues': cues}
json.dump(spec, open(spec_p, 'w', encoding='utf8', newline='\n'), indent=1, ensure_ascii=False); print(len(cues), 'cues')
