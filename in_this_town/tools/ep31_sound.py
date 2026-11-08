#!/usr/bin/env python3
"""Episode 31: write the spec's sound block from the director's events (build/ep31/events.json) and the timeline.

A bright, empty mall: fluorescent hum and vents, no music at all. Doors, a PA that is too polite, one escalator starting up and then all of them; a shuffle when everyone turns; the lights sag and a low note comes in; the doors open at the far end.
Run after any timing change, then mkep + audio2.
"""
import json
E = json.load(open('build/ep31/events.json'))['events']
ep = json.load(open('build/ep31/timeline.json', encoding='utf8'))
spec_p = 'episodes/specs/ep31.json'; spec = json.load(open(spec_p, encoding='utf8'))
s = lambda i: ep['lines'][i]['start']; e = lambda i: ep['lines'][i]['end']; r3 = lambda x: round(x, 3)
cues = []
def cue(t, nm, g, **o): cues.append([str(r3(t)), nm, g] + ([o] if o else []))
D = ep['duration']; F = E['freeze']; T = E['turn']; M = E['dim']; X = E['door']
# the room: the tubes and the vents, all the way through (the tubes sag when the lights dim)
cue(s(0) + 1.6, 'buzz', 0.1, dur=M - s(0) - 1.6 + 0.1, f=120); cue(s(0) + 1.6, 'vent', 0.1, dur=D - s(0) - 1.6, seed=3); cue(M + 0.1, 'buzz', 0.05, dur=D - M - 0.1, f=100)
# outside: a little air; her feet; the first doors
cue(0, 'wind', 0.08, dur=2.2, seed=2); cue(0.3, 'footsteps', 0.2, dur=3.2, rate=2.2); cue(E['dA0'], 'whoosh', 0.18, dur=0.6); cue(E['dA1'] + 0.55, 'clunk', 0.16, seed=6)
# walking through the empty mall; a tick from the phone
cue(s(2) + 0.5, 'footsteps', 0.13, dur=s(7) - s(2) - 0.6, rate=2.2, rev=0.35); cue(s(8), 'footsteps', 0.18, dur=s(9) - s(8) - 0.1, rate=2.4, rev=0.3); cue(s(1) + 0.45, 'tick', 0.16); cue(s(7) + 0.1, 'creak', 0.05, dur=1.2, seed=7)
# the doors that open on the same mall; her turning; the doors onto a wall
cue(E['dB0'], 'whoosh', 0.22, dur=0.7); cue(E['dB1'] + 0.4, 'clunk', 0.16, seed=8); cue(s(11) + 0.1, 'footsteps', 0.18, dur=0.7, rate=2.3); cue(E['dB2'], 'whoosh', 0.2, dur=0.7); cue(s(13) + 0.55, 'drone', 0.09, dur=2.0, f=46)
# the people of the second mall: a voice, a guard; the PA
cue(s(16) + 0.9, 'footsteps', 0.12, dur=1.0, rate=2.4); cue(s(18) - 0.28, 'pachime', 0.3); cue(s(18) - 0.3, 'static', 0.09, dur=e(18) - s(18) + 0.5)
# they leave: the mop goes down, bags are left, a lot of people walking and no one speaking
cue(F + 1.5, 'clunk', 0.42, seed=11); cue(F + 1.62, 'tick', 0.2); cue(F + 0.2, 'crowdsteps', 0.2, dur=3.3, seed=5, per_s=9)
# the escalator starts: a thud, a hum; then every other one joins
L = E['lane']; cue(s(19) + 0.2, 'clunk', 0.34, seed=13); cue(s(19) + 0.3, 'ridehum', 0.13, dur=T - s(19) - 0.1, rate=0.7)
for i, k in enumerate((1, 3, 0)): cue(L[k] - 0.05, 'clunk', 0.22, seed=14 + i); cue(L[k], 'ridehum', 0.07, dur=T - L[k], rate=0.8 + i * 0.07)
cue(s(20) + 0.4, 'drone', 0.08, dur=s(25) - s(20), f=38); cue(s(25) + 0.2, 'heartbeat', 0.14, dur=e(26) - s(25) + 0.2, bpm=66)
cue(s(26) - 0.28, 'pachime', 0.28); cue(s(26) - 0.3, 'static', 0.08, dur=e(26) - s(26) + 0.5)
cue(s(27) + 0.3, 'tick', 0.16)
# they all stop; they all turn; nothing
cue(T - 0.08, 'clunk', 0.5, seed=21); cue(T, 'groan', 0.12, dur=1.9, seed=22); cue(T + 0.02, 'crowdsteps', 0.32, dur=0.55, seed=6, per_s=40); cue(T + 0.5, 'heartbeat', 0.2, dur=M - T - 0.3, bpm=88)
# the lights
cue(M, 'flick', 0.32); cue(M + 0.05, 'drone', 0.14, dur=D - M - 0.05, f=33)
cue(s(31) - 0.28, 'pachime', 0.26); cue(s(31) - 0.3, 'static', 0.08, dur=e(32) - s(31) + 0.5)
# the far doors; someone's steps, unhurried, very far away
cue(X - 0.3, 'whoosh', 0.14, dur=0.7, rev=0.7); cue(X + 0.15, 'footsteps', 0.1, dur=D - X - 0.3, rate=1.9, rev=0.8)
spec['sound'] = {'key': 50, 'music_gain': 0.0, 'music': [['0', 'silence']], 'cues': cues}
json.dump(spec, open(spec_p, 'w', encoding='utf8', newline='\n'), indent=1, ensure_ascii=False); print(len(cues), 'cues')
