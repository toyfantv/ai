#!/usr/bin/env python3
"""Remake 6 (The Weight of the Truth): write the spec's sound block from the director's events (build/ep106/events.json) and the timeline.

A bright playful town: a soft street, boings for every lift, iron clomps; a hushed hall when the glass goes; a soft room-tone beat on her first lie,
then the launch, the bell off the dome, and a warm sunset. Run after any timing change, then mkep + audio2.
"""
import json
E = json.load(open('build/ep106/events.json'))['events']
ep = json.load(open('build/ep106/timeline.json', encoding='utf8'))
spec_p = 'episodes/specs/ep106.json'; spec = json.load(open(spec_p, encoding='utf8'))
s = lambda i: ep['lines'][i]['start']; e = lambda i: ep['lines'][i]['end']; r3 = lambda x: round(x, 3)
cues = []
def cue(t, nm, g, **o): cues.append([str(r3(max(0, t))), nm, g] + ([o] if o else []))
D = ep['duration']
# the town
cue(0, 'suburb', 0.2, dur=s(1) - 0.05); cue(s(2), 'suburb', 0.2, dur=E['court'] - s(2)); cue(s(4), 'suburb', 0.18, dur=s(5) - s(4)); cue(s(19), 'suburb', 0.16, dur=s(20) - s(19))
for t, f in ((1.1, 1500), (2.4, 1750), (7.2, 1350), (14.3, 1600), (15.6, 1450)): cue(t, 'chirp', 0.08, f=f)
cue(0.45, 'swish', 0.12)
# heels lift; the cough; the iron boots; the net
cue(s(1) + 1.75, 'swish', 0.16); cue(E['cough'], 'knock', 0.1); cue(E['cough'] + 0.25, 'knock', 0.1); cue(E['risec'], 'swish', 0.18); cue(E['risec'] + 0.4, 'whoosh', 0.1, dur=0.9)
for i in range(6): cue(s(3) + i * 0.36, 'clunk', 0.22, rate=1.3)
cue(E['court'] + 0.1, 'roomtone', 0.08, dur=s(4) - E['court'] - 0.1); cue(E['court'] + 0.5, 'creak', 0.12, dur=0.9)
# paper slippers, soft
cue(s(4) + 2.3, 'paper', 0.28, dur=0.8)
# the kitchen: he goes up, the belt pulls him down
cue(s(5) + 0.1, 'roomtone', 0.1, dur=s(8) - s(5) - 0.1); cue(E['jolt'], 'pop', 0.42); cue(E['jolt'] + 0.02, 'chime', 0.1, note=88); cue(E['belt'] + 0.1, 'whoosh', 0.16, dur=0.5); cue(E['belt'] + 0.85, 'clunk', 0.4); cue(s(7) + 2.2, 'tick', 0.16, dur=0.3, rate=3)
# the hall: applause, the drape, the glass; a dead hush
cue(s(8), 'crowdsteps', 0.12, dur=2.6, seed=3, per_s=8); cue(E['drape'] - 0.05, 'swish', 0.22); cue(E['drape'] + 0.12, 'chime', 0.12, note=84); cue(E['drape'] + 0.3, 'applause', 0.3, dur=2.0)
cue(E['ball'] - 0.05, 'whoosh', 0.26, dur=0.8); cue(E['smash'], 'clunk', 0.5); cue(E['smash'], 'shatter', 0.85); cue(E['smash'] + 0.08, 'glass', 0.38, dur=1.8); cue(E['smash'] + 0.6, 'tick', 0.14, dur=1.2, rate=9)
cue(s(11) + 0.2, 'roomtone', 0.14, dur=s(15) - s(11)); cue(s(12) - 0.1, 'footsteps', 0.16, dur=2.1, rate=2.4)
# her first lie: nothing under it
cue(E['stepIn'] + 0.05, 'footsteps', 0.2, dur=0.4, rate=3.6); cue(s(15) - 0.05, 'roomtone', 0.12, dur=E['go'] - s(15) + 0.05)
# the floor lets go; she goes up; the bell
cue(E['lift'] - 0.05, 'chime', 0.12, note=76); cue(E['lift'], 'creak', 0.1, dur=0.8); cue(E['go'] - 0.05, 'pop', 0.55); cue(E['go'], 'whoosh', 0.5, dur=2.0); cue(E['hit'], 'clunk', 0.4); cue(E['hit'] + 0.02, 'chime', 0.34, note=72); cue(E['hit'] + 0.04, 'chime', 0.22, note=84); cue(E['hit'] + 0.08, 'glass', 0.12, dur=1.2); cue(E['hit'] + 0.3, 'crowdsteps', 0.1, dur=1.2, seed=5, per_s=10)
# the fire brigade and the clock
cue(s(18), 'tick', 0.1, dur=2.3, rate=6); cue(s(18) + 1.15, 'tick', 0.22, dur=0.55, rate=26); cue(s(18) + 0.1, 'creak', 0.12, dur=1.4)
# her heavy walk; the clank of boots; the sunset
for i in range(7): cue(s(19) + 0.05 + i * 0.46, 'clunk', 0.2)
cue(s(19) + 0.05, 'footsteps', 0.08, dur=2.6, rate=1.8); cue(s(20) - 0.05, 'wind', 0.08, dur=D - s(20) + 0.05)
cue(E['unb'] - 1.1, 'tick', 0.16, dur=0.3, rate=4); cue(E['unb'] - 0.2, 'clunk', 0.42); cue(E['unb'] + 0.22, 'dustglitter', 0.22, dur=2.4); cue(E['unb'] + 0.3, 'chime', 0.12, note=81); cue(E['unb'] + 0.6, 'creak', 0.08, dur=1.4)
cue(D - 1.5, 'chime', 0.12, note=88)
spec['sound'] = {'key': 62, 'music_gain': 0.3,
  'music': [['0', 'tender'], [str(r3(E['ball'] - 0.4)), 'suspense'], [str(r3(E['smash'] + 0.02)), 'silence'], [str(r3(s(11) + 0.3)), 'mystery'], [str(r3(s(15) - 0.05)), 'silence'], [str(r3(E['go'] - 0.05)), 'fantasy'], [str(r3(s(18) - 0.1)), 'tender'], [str(r3(s(20) - 0.1)), 'tender_hope']], 'cues': cues}
json.dump(spec, open(spec_p, 'w', encoding='utf8', newline='\n'), indent=1, ensure_ascii=False); print(len(cues), 'cues')
