#!/usr/bin/env python3
"""Remake 11 (Shuffle Night): write the spec's sound block from the director's events (build/ep111/events.json) and the timeline.

A bright street with birds and playful music; a kid-grandpa down the slide; the night pact (a slap, a clap); a paper and a sip;
the wake-up (music drops out for "Mama!"); a sob at the cookie jar and a "Grounded"; the doorbell and a hush for the old man;
the pinky handshake into silence, then a warm piano for the pact kept, to the end. Run after any timing change, then mkep + audio2.
"""
import json
E = json.load(open('build/ep111/events.json'))['events']
ep = json.load(open('build/ep111/timeline.json', encoding='utf8'))
spec_p = 'episodes/specs/ep111.json'; spec = json.load(open(spec_p, encoding='utf8'))
s = lambda i: ep['lines'][i]['start']; e = lambda i: ep['lines'][i]['end']; r3 = lambda x: round(x, 3)
cues = []
def cue(t, nm, g, **o): cues.append([str(r3(max(0, t))), nm, g] + ([o] if o else []))
END = ep['duration']
# the street, bright; Grandpa Fennick down the slide
cue(0, 'suburb', 0.2, dur=s(4) - 0.02)
for t, f in ((0.6, 1900), (2.0, 2300), (5.1, 2050), (8.4, 2400), (12.6, 1800), (14.9, 2200)): cue(t, 'chirp', 0.08, f=f)
cue(s(2) + 0.5, 'footsteps', 0.12, dur=1.6, rate=3.2)
cue(E['slideGo'] - 0.05, 'whoosh', 0.22, dur=1.1); cue(E['slideGo'] + 0.55, 'sample', 0.2, name='giggle', rev=0.6, wet=0.12)
cue(s(3) + 0.1, 'footsteps', 0.12, dur=2.9, rate=2.2)
# the pact at night
cue(s(4) - 0.02, 'roomtone', 0.1, dur=s(5) - s(4)); cue(s(4), 'tick', 0.06, dur=E['hs'] - s(4) - 0.6, rate=7)
cue(E['hs'] - 0.05, 'swish', 0.26); cue(E['hs'] + 0.1, 'pop', 0.26); cue(E['hs'] + 0.75, 'pop', 0.2); cue(E['hs'] + 1.2, 'swish', 0.2, seed=4); cue(E['hs'] + 1.3, 'chime', 0.12, note=86)
# grown-up practice
cue(s(5) - 0.02, 'roomtone', 0.1, dur=s(7) - s(5)); cue(s(5) + 0.05, 'paper', 0.28, dur=0.9)
cue(E['sip'] - 0.05, 'pop', 0.14); cue(E['shades'] - 0.08, 'swish', 0.22, seed=5); cue(E['shades'] + 0.05, 'chime', 0.12, note=91)
# the wake-up
cue(s(7) - 0.02, 'roomtone', 0.1, dur=s(9) - s(7))
for t, f in ((s(7) + 0.2, 2100), (s(7) + 0.9, 2500)): cue(t, 'chirp', 0.06, f=f)
cue(E['popup'] - 0.1, 'whoosh', 0.14, dur=0.6); cue(s(8) - 0.1, 'riser', 0.08, dur=0.25)
# the kitchen: Mom, nine; the sister, forty
cue(s(9) - 0.02, 'roomtone', 0.1, dur=s(11) - s(9))
cue(s(9) + 1.6, 'sample', 0.16, name='sob', rev=0.5, wet=0.1)
cue(s(10) + 1.4, 'stomp', 0.18); cue(s(10) + 1.45, 'sample', 0.18, name='grounded', rev=0.6, wet=0.12)
# the doorbell
cue(E['bell'], 'ding', 0.32); cue(E['open'] + 0.05, 'creak', 0.16, dur=0.7); cue(E['open'] + 0.2, 'suburb', 0.1, dur=END - E['open'] - 0.2)
cue(s(11) + 1.3, 'shimmer', 0.06, dur=2.2)
# the pinky handshake, a hush, the reveal
cue(E['pinky'] - 0.6, 'footsteps', 0.1, dur=0.6, rate=2.0); cue(E['pinky'] + 0.5, 'chime', 0.1, note=84); cue(E['pinky'] + 0.9, 'chime', 0.1, note=88)
cue(s(13) + 0.02, 'chime', 0.14, note=79)
# the pact kept: the stroller, the peas, the controller
cue(s(14) + 2.2, 'footsteps', 0.1, dur=1.4, rate=1.6)
cue(s(14) + 3.6, 'sample', 0.2, name='airplane', rev=0.5, wet=0.12); cue(s(14) + 4.9, 'whoosh', 0.1, dur=0.8)
cue(s(14) + 6.0, 'sample', 0.18, name='giggle', rate=0.95, rev=0.5, wet=0.12); cue(s(14) + 6.4, 'tick', 0.06, dur=0.8, rate=9)
# the tuck-in
cue(s(15) - 0.05, 'roomtone', 0.08, dur=END - s(15) + 0.05); cue(s(15) + 0.2, 'paper', 0.1, dur=1.0, seed=3)
spec['sound'] = {'key': 62, 'music_gain': 0.3,
  'music': [['0', 'playful'], [str(r3(s(7) + 1.4)), 'silence'], [str(r3(s(8) + 0.6)), 'playful'], [str(r3(E['bell'] - 0.05)), 'silence'],
            [str(r3(s(11) + 1.3)), 'wonder'], [str(r3(s(13) - 0.1)), 'silence'], [str(r3(s(14) - 0.05)), 'tender_hope']], 'cues': cues}
json.dump(spec, open(spec_p, 'w', encoding='utf8', newline='\n'), indent=1, ensure_ascii=False); print(len(cues), 'cues')
