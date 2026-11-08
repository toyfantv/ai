#!/usr/bin/env python3
"""Episode 39: write the spec's sound block from the director's events (build/ep39/events.json).

Wind and a radio at the mouth; inside, only wet rock: drips, breath, cloth scraping on stone; silence before each scare and the hit in a gap in
the narration; whoosh, hit and a bass boom on each contact of the fight; dozens of voices calling his name, cut dead by daylight; a radio crackle;
a low drone under the last line, and nothing else on the final image.
Usage: python tools/ep39_sound.py   (then: python tools/mkep.py episodes/specs/ep39.json episodes/ep39_voice_tunnel.json; python tools/audio2.py episodes/ep39_voice_tunnel.json)
"""
import json
import random

E = json.load(open('build/ep39/events.json'))['events']
ep = json.load(open('build/ep39/timeline.json', encoding='utf8'))
spec_p = 'episodes/specs/ep39.json'
spec = json.load(open(spec_p, encoding='utf8'))
r3 = lambda x: round(x, 3)
s = lambda i: ep['lines'][i]['start']
e = lambda i: ep['lines'][i]['end']
cues = []
def cue(t, nm, g, **o): cues.append([str(r3(t)), nm, g] + ([o] if o else []))
R = random.Random(39)

IN0, DAY = s(2) - 0.06, s(21) - 0.06     # the tunnel runs from the flashback to daylight
# outside: wind, a few birds, the radio's hiss under the first line
cue(0, 'wind', 0.16, dur=IN0); cue(0.2, 'chirp', 0.06, dur=IN0 - 0.4); cue(0.15, 'static', 0.075, dur=e(0) - 0.05); cue(e(0) + 0.02, 'clunk', 0.26, seed=3)
cue(s(1) + 0.1, 'footsteps', 0.2, dur=s(2) - s(1) - 0.3, rate=0.95, seed=5)

# inside: the rock's own air, and water
cue(IN0, 'drone', 0.16, dur=s(13) - IN0 - 0.2, f=46); cue(IN0, 'roomtone', 0.2, dur=s(13) - IN0 - 0.2, seed=9)
t = IN0 + 0.3
while t < DAY - 0.3:
    quiet = (s(13) - 0.1 < t < E['S1'] + 0.5) or (E['S2'] - 0.7 < t < E['flipOut'])
    if not quiet: cue(t, 'pop', 0.05 + 0.07 * R.random())
    t += 0.7 + 1.1 * R.random()

# her flashlight on the floor: a faint electrical whine, nothing else
cue(s(4) - 0.1, 'hum', 0.09, dur=1.5, f=196)

# the crawl: cloth and knees on stone
cue(s(5) - 0.05, 'scrape', 0.2, dur=s(6) - s(5) - 0.1); cue(s(6) + 0.1, 'scrape', 0.12, dur=0.9)
# something breathing ahead: his breath, slowed, from the wrong direction
cue(s(7) + 0.45, 'sample', 0.3, name='d_breath', rate=0.72, pan=-0.3, wet=0.5); cue(s(10) + 0.1, 'scrape', 0.16, dur=e(10) - s(10) - 0.1)
# narrower: his own breath, the stone tighter, the heart coming up; a held beat on the flicker
cue(s(11) - 0.05, 'scrape', 0.26, dur=e(12) - s(11)); cue(s(11), 'sample', 0.22, name='d_breath', rate=1.15, wet=0.15); cue(s(11) + 0.2, 'heartbeat', 0.28, dur=e(12) - s(11) - 0.2, bpm=98)

# scare 1, in the gap
cue(E['S1'] - 0.12, 'whoosh', 0.5, dur=0.16); cue(E['S1'] - 0.01, 'scarehit', 0.98, dur=0.6); cue(E['S1'] + 0.02, 'groan', 0.12, dur=1.7, seed=5)
# she smiles; something wet moves under the words
cue(E['S1'] + 0.7, 'drone', 0.2, dur=E['S2'] - 0.55 - E['S1'] - 0.7, f=39); cue(s(15), 'whisper', 0.09, dur=e(16) - s(15), seed=4); cue(s(16) + 0.2, 'groan', 0.12, dur=2.0, seed=11)
cue(s(17) - 0.05, 'scrape', 0.34, dur=e(17) - s(17) + 0.05); cue(s(17), 'sample', 0.24, name='d_breath', rate=1.4, wet=0.15)

# scare 2: the lunge. Everything out, then the hit
cue(E['S2'] - 0.12, 'whoosh', 0.7, dur=0.18); cue(E['S2'] - 0.01, 'scarehit', 0.98, dur=0.3); cue(E['S2'] + 0.02, 'groan', 0.12, dur=1.7, seed=8)
cue(E['S2'] - 0.02, 'sample', 0.16, name='d_yell', wet=0.3)
# the claws
cue(E['lcHit'] - 0.14, 'whoosh', 0.62, dur=0.14); cue(E['lcHit'], 'impact', 0.56); cue(E['lcHit'], 'doorboom', 0.3, seed=61); cue(E['lcHit'] + 0.03, 'splat', 0.26)
# the kick
cue(E['kcHit'] - 0.16, 'whoosh', 0.66, dur=0.15); cue(E['kcHit'], 'impact', 0.7); cue(E['kcHit'], 'doorboom', 0.4, seed=62); cue(E['kcHit'] + 0.03, 'splat', 0.22)
cue(E['kcHit'] + 0.32, 'bodyfall', 0.42); cue(E['kcHit'] + 0.3, 'scrape', 0.2, dur=0.6)

# running: scraping, the heart, and every voice it ever learned
cue(E['flipOut'], 'scrape', 0.34, dur=DAY - E['flipOut']); cue(E['flipOut'], 'heartbeat', 0.3, dur=DAY - E['flipOut'], bpm=138); cue(E['flipOut'], 'sample', 0.2, name='d_breath', rate=1.5, wet=0.2)
names = ['v_d1', 'v_d2', 'v_d3', 'v_d4']
t = s(20) + 0.05; k = 0
while t < DAY - 0.25:
    u = (t - s(20)) / (DAY - s(20)); rate = R.choice([0.86, 0.92, 0.98, 1.04, 1.1, 1.18])
    cue(t, 'sample', 0.12 + 0.16 * u, name=names[k % 4], rate=rate, pan=R.uniform(-0.8, 0.8), rev=1.4, wet=0.65)
    t += 0.15 + 0.16 * (1 - u) * R.random(); k += 1

# daylight cuts it dead
cue(DAY, 'wind', 0.2, dur=s(25) - DAY); cue(DAY + 0.1, 'chirp', 0.09, dur=s(26) - DAY - 0.2); cue(DAY + 0.05, 'sample', 0.2, name='d_breath', wet=0.05)
cue(s(22) + 0.4, 'scrape', 0.2, dur=0.9); cue(s(23) - 0.25, 'bodyfall', 0.2)

# the radio
cue(s(25) - 0.2, 'static', 0.24, dur=0.5); cue(s(25) - 0.2, 'clunk', 0.28, seed=15); cue(s(25) + 0.35, 'static', 0.09, dur=s(26) - s(25) - 0.3)
cue(s(27) - 0.15, 'static', 0.14, dur=0.2); cue(s(27), 'static', 0.06, dur=e(27) - s(27) + 0.1); cue(e(27) + 0.08, 'clunk', 0.22, seed=19)

# the birds have stopped. A long low note
cue(s(26) + 0.6, 'wind', 0.08, dur=E['end'] - s(26) - 1.4)
cue(s(28) - 0.1, 'drone', 0.18, dur=E['end'] - s(28), f=37)
cue(E['end'] - 2.0, 'sample', 0.2, name='d_breath', rate=0.7, wet=0.4)

spec['sound'] = {'key': 39, 'music_gain': 0.16,
                 'music': [['0', 'mystery'], [str(r3(IN0)), 'dread'], [str(r3(s(13) - 0.1)), 'silence'], [str(r3(E['S1'] + 0.3)), 'dread'],
                           [str(r3(E['S2'] - 0.55)), 'silence'], [str(r3(E['flipOut'])), 'suspense'], [str(r3(DAY)), 'silence'], [str(r3(s(28))), 'dread']],
                 'cues': cues}
json.dump(spec, open(spec_p, 'w', encoding='utf8', newline='\n'), indent=1, ensure_ascii=False)
print(len(cues), 'cues')
