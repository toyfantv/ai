#!/usr/bin/env python3
"""Episode 30: write the spec's sound block from the director's events (build/ep30/events.json) and the timeline.

A worn-out carnival at night: machinery, a detuned band organ that runs down on "stopped", a PA that is too polite, the gate and the lock; then nothing; then hundreds of feet that stop dead when the sign changes.
Run after any timing change, then mkep + audio2.
"""
import json
E = json.load(open('build/ep30/events.json'))['events']
ep = json.load(open('build/ep30/timeline.json', encoding='utf8'))
spec_p = 'episodes/specs/ep30.json'; spec = json.load(open(spec_p, encoding='utf8'))
s = lambda i: ep['lines'][i]['start']; e = lambda i: ep['lines'][i]['end']; r3 = lambda x: round(x, 3)
cues = []
def cue(t, nm, g, **o): cues.append([str(r3(t)), nm, g] + ([o] if o else []))
D = ep['duration']; A = E['stopAll']; F = E['flip']
# the night: wind through the fence, a low drone; the machines wake on "started moving"
cue(0, 'wind', 0.15, dur=A + 0.4, seed=3); cue(0, 'drone', 0.08, dur=F, f=44)
cue(E['rides'] - 0.05, 'clunk', 0.42, seed=11); cue(E['rides'], 'groan', 0.14, dur=1.9, seed=12); cue(E['rides'] + 0.1, 'ridehum', 0.16, dur=A - E['rides'] + 0.5, rate=0.9)
cue(s(2) + 0.1, 'creak', 0.2, dur=1.3, seed=13); cue(s(9) + 1.4, 'creak', 0.14, dur=1.2, seed=14); cue(s(15) + 0.05, 'creak', 0.16, dur=1.4, seed=15)
# the booth wakes: a stutter of contactors, a neon buzz
cue(E['boothOn'] - 0.02, 'flick', 0.42); cue(E['boothOn'] + 0.1, 'buzz', 0.1, dur=2.0, f=120)
# the gates; her feet
cue(s(6) - 0.2, 'creak', 0.3, dur=1.5, seed=16); cue(s(6) + 0.1, 'clunk', 0.2, seed=17)
cue(s(6) + 0.05, 'footsteps', 0.2, dur=s(7) - s(6) - 0.2, rate=2.4); cue(E['tk'], 'tick', 0.3); cue(s(9) + 0.05, 'footsteps', 0.2, dur=s(10) - s(9) - 0.2, rate=2.6); cue(s(11) - 0.05, 'footsteps', 0.2, dur=1.6, rate=2.3)
cue(s(9) + 0.25, 'scrape', 0.09, dur=1.4, seed=18)
# the creature: a low note under it, its bench creaking as it turns; the arm comes up
cue(s(11) + 1.5, 'drone', 0.14, dur=s(14) - s(11) - 1.5, f=37); cue(s(13) + 0.05, 'creak', 0.2, dur=1.3, seed=19); cue(s(13) + 1.05, 'swish', 0.14)
# the wheel: nobody there, a breath of whisper and a belt buckle ticking
cue(s(15) + 0.25, 'whisper', 0.1, dur=2.8, seed=20); cue(s(15) + 0.6, 'tick', 0.14); cue(s(16) + 0.25, 'tick', 0.13)
# the lever; the music runs down by itself; the air goes empty
cue(E['pull'], 'clunk', 0.58, seed=21); cue(E['stopCar'], 'groan', 0.17, dur=1.9, seed=22)
cue(s(18) - 0.2, 'pachime', 0.3); cue(s(18) - 0.3, 'static', 0.1, dur=e(18) - s(18) + 0.5)
# tools down; the workers go, not hurrying
cue(E['tools'] + 0.15, 'clunk', 0.22, seed=23); cue(E['tools'] + 0.45, 'tick', 0.18); cue(E['workers'] + 0.05, 'footsteps', 0.16, dur=3.2, rate=3.1)
# the creature stands and comes to her; the string changes hands; heavy soft steps to the gate
cue(E['stand'], 'creak', 0.28, dur=1.2, seed=24); cue(E['stand'] + 0.55, 'knock', 0.3, rev=0.4); cue(E['give'] - 0.5, 'knock', 0.26, rev=0.4); cue(E['give'] - 0.02, 'swish', 0.1); cue(E['give'], 'tick', 0.2)
for k in range(6): cue(s(21) + 0.2 + k * 0.56, 'knock', 0.26, rev=0.5)
# the gate: the slam, the bolt, the padlock
cue(E['slam'] - 0.14, 'whoosh', 0.34, dur=0.18); cue(E['slam'], 'doorboom', 0.74, seed=31); cue(E['slam'] + 0.02, 'clunk', 0.55, seed=32); cue(E['slam'] + 0.34, 'clunk', 0.4, seed=33); cue(E['slam'] + 0.62, 'tick', 0.48)
# the name; the PA again
cue(s(22) + 0.3, 'heartbeat', 0.2, dur=e(22) - s(22) + 0.4, bpm=62); cue(s(23) - 0.2, 'pachime', 0.28); cue(s(23) - 0.3, 'static', 0.09, dur=e(23) - s(23) + 0.5)
# everything stops; then nothing but the air, and then the feet; they stop dead when the sign changes
cue(A - 0.03, 'clunk', 0.6, seed=41); cue(A, 'groan', 0.2, dur=2.0, seed=42); cue(A + 0.4, 'roomtone', 0.06, dur=F - A)
cue(s(25) - 0.05, 'crowdsteps', 0.62, dur=F - s(25) + 0.05, seed=5, per_s=62); cue(s(25) + 1.2, 'heartbeat', 0.22, dur=F - s(25) - 1.3, bpm=96)
cue(F - 0.01, 'flick', 0.5); cue(F + 0.04, 'buzz', 0.16, dur=D - F, f=120); cue(F + 0.1, 'drone', 0.08, dur=D - F - 0.1, f=30)
# one more step, close behind her
cue(D - 1.5, 'knock', 0.42, rev=0.8)
spec['sound'] = {'key': 50, 'music_gain': 0.3,
  'music': [['0', 'silence'], [str(r3(s(3) - 0.5)), 'carousel'], [str(r3(E['stopCar'] + 0.55)), 'silence'], [str(r3(s(22) + 0.1)), 'dread'], [str(r3(A)), 'silence']], 'cues': cues}
json.dump(spec, open(spec_p, 'w', encoding='utf8', newline='\n'), indent=1, ensure_ascii=False); print(len(cues), 'cues')
