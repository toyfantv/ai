#!/usr/bin/env python3
"""Episode 29: write the spec's sound block from the director's events (build/ep29/events.json) and the timeline.

Near silence, fluorescent hum and wind in a huge empty shaft, slow distant echoes, a jump's thud; the tower stops dead; footsteps from above; the door, the slam, a tone; the fall.
Run after any timing change, then mkep + audio2.
"""
import json
E = json.load(open('build/ep29/events.json'))['events']
ep = json.load(open('build/ep29/timeline.json', encoding='utf8'))
spec_p = 'episodes/specs/ep29.json'; spec = json.load(open(spec_p, encoding='utf8'))
s = lambda i: ep['lines'][i]['start']; e = lambda i: ep['lines'][i]['end']; r3 = lambda x: round(x, 3)
cues = []
def cue(t, nm, g, **o): cues.append([str(r3(t)), nm, g] + ([o] if o else []))
D = ep['duration']; S = E['STOP']
# the shaft: fluorescent buzz, ventilation, wind moving past; they hold until the end of the tower
cue(0, 'buzz', 0.2, dur=S + 0.05, f=120); cue(0, 'vent', 0.17, dur=S + 0.05); cue(0, 'wind', 0.16, dur=S + 0.05, seed=3); cue(0, 'drone', 0.13, dur=S + 0.05, f=46)
# jumps: a push and a landing on hollow plastic, echoing
for k, j in enumerate(E['jumpsAt']):
    cue(j + 0.03, 'swish', 0.2); cue(j + 0.72, 'clunk', 0.34, seed=20 + k)
# far off, slow echoes of someone else's feet
for k, (a, b) in enumerate([(2.6, 1.4), (5.4, 1.2), (9.0, 1.0), (14.4, 1.1)]): cue(a, 'footsteps', 0.12, dur=b, rate=0.9, seed=30 + k)
# the paint roller; the chalk; the scratch of the message
cue(s(4) - 0.3, 'scrape', 0.14, dur=1.3, seed=8)
cue(E['give'] - 0.02, 'tick', 0.26)
cue(s(6) + 1.9, 'whisper', 0.1, dur=2.4, seed=12)
cue(E['stroke0'], 'scrape', 0.34, dur=max(0.4, E['stroke1'] - E['stroke0']), seed=15)
# level seventy: everything stops. A clunk, then nothing but the wind gone thin
cue(S - 0.03, 'clunk', 0.74, seed=41); cue(S, 'doorboom', 0.4, seed=42); cue(S + 0.1, 'buzz', 0.08, dur=E['door0'] - S - 0.2, f=120); cue(S + 0.2, 'wind', 0.08, dur=E['door0'] - S - 0.2, seed=17); cue(S + 0.2, 'drone', 0.1, dur=E['door0'] - S - 0.2, f=38)
# level ninety: footsteps overhead, slow, nobody there
for k, c in enumerate(E['steps90']): cue(c, 'knock', 0.46 - k * 0.02, rev=0.6); cue(c + 0.01, 'creak', 0.08, dur=0.2, seed=60 + k)
cue(s(12) + 0.5, 'whisper', 0.08, dur=1.4, seed=14)
# the white door: hum returns, thin and high; the latch, the swing
cue(E['door0'], 'roomtone', 0.13, dur=E['slam'] - E['door0'] + 0.3); cue(E['doorOpen'] - 0.1, 'clunk', 0.28, seed=71); cue(E['doorOpen'], 'creak', 0.38, dur=1.3, seed=72)
# through: an enormous reversed air; the same hum, slowed
cue(s(16) + 0.1, 'groan', 0.18, dur=2.6, seed=73); cue(s(16), 'drone', 0.16, dur=E['slam'] - s(16), f=33); cue(s(16), 'wind', 0.14, dur=E['slam'] - s(16), seed=31)
# the boy's feet, on the wrong side of the world
for k in range(3): cue(E['boy0'] + 0.65 + k * ((E['boyEnd'] - E['boy0']) / 3), 'knock', 0.3, rev=1.6)
cue(E['point0'], 'swish', 0.14)
cue(s(21), 'heartbeat', 0.26, dur=E['slam'] - s(21) - 0.3, bpm=68); cue(s(22) + 0.1, 'whisper', 0.12, dur=2.6, seed=44)
# the slam; a long ring; silence with one low note for the voice
cue(E['slam'] - 0.14, 'whoosh', 0.5, dur=0.18); cue(E['slam'], 'doorboom', 0.86, seed=91); cue(E['slam'] + 0.02, 'clunk', 0.58, seed=92)
cue(E['slam'] + 0.3, 'drone', 0.12, dur=s(26) - E['slam'] - 0.1, f=29); cue(s(25) - 0.16, 'pachime', 0.3)
# the floor goes, the long fall: wind rising, towers rushing past
cue(E['floor'] - 0.06, 'rockbreak', 0.5, dur=1.0, seed=95); cue(E['floor'] + 0.02, 'whoosh', 0.42, dur=0.5); cue(E['floor'] + 0.25, 'wind', 0.42, dur=D - E['floor'] - 0.4, seed=37); cue(E['FALL'], 'drone', 0.2, dur=D - E['FALL'], f=36)
spec['sound'] = {'key': 29, 'music_gain': 0.16,
  'music': [['0', 'dread'], [str(r3(S - 0.6)), 'silence'], [str(r3(s(11))), 'dread'], [str(r3(E['door0'])), 'mystery'], [str(r3(s(16))), 'dread'], [str(r3(E['slam'])), 'silence'], [str(r3(s(26))), 'dread']], 'cues': cues}
json.dump(spec, open(spec_p, 'w', encoding='utf8', newline='\n'), indent=1, ensure_ascii=False); print(len(cues), 'cues')
