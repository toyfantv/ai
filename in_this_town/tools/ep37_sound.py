#!/usr/bin/env python3
"""Episode 37: write the spec's sound block from the director's events (build/ep37/events.json).

Near silence and a low drone for the folklore half; every count a creak in the wood; silence before each scare, the hit in a gap in the
narration; scratching along the ceiling before the second one. Re-run after any timing change, then mkep + audio2.
Usage: python tools/ep37_sound.py   (then: python tools/mkep.py episodes/specs/ep37.json episodes/ep37_beneath_the_stairs.json; python tools/audio2.py episodes/ep37_beneath_the_stairs.json)
"""
import json

E = json.load(open('build/ep37/events.json'))['events']
spec_p = 'episodes/specs/ep37.json'
spec = json.load(open(spec_p, encoding='utf8'))
r3 = lambda x: round(x, 3)
cues = []
def cue(t, nm, g, **o): cues.append([t if isinstance(t, str) else str(r3(t)), nm, g] + ([o] if o else []))

# outside, the corridor, the hall: air and a low hum, the tubes buzzing
cue(0, 'wind', 0.2, dur=2.1); cue(0, 'drone', 0.16, dur=E['S1'] - 0.6, f=41)
cue(1.9, 'buzz', 0.1, dur=1.6); cue(3.4, 'roomtone', 0.2, dur=E['S1'] - 3.9)
# the counts: the tread takes a weight, dust falls, the bulb dips
for k, c in enumerate(E['count']):
    cue(c - 0.32, 'creak', 0.42 + k * 0.05, dur=0.5, seed=31 + k); cue(c - 0.3, 'clunk', 0.22, seed=41 + k); cue(c + 0.05, 'flick', 0.14, seed=44 + k)
# Quinn's footsteps on the boards, the crouch, the flashlight on the wood
cue(E['walk0'], 'footsteps', 0.38, dur=E['stop'] - E['walk0'], rate=1.5); cue(E['go'], 'footsteps', 0.38, dur=E['at'] - E['go'], rate=1.5, seed=5)
cue(E['crouch'] + 0.15, 'curtain', 0.22, dur=0.5)
# under the stairs: a faint breath, a nail on the boards; the heart picks up as the head starts to lift
cue('L9', 'whisper', 0.1, dur=E['S1'] - 18.3); cue('L10', 'scrape', 0.14, dur=1.0, seed=6)
cue('L13', 'heartbeat', 0.34, dur=E['S1'] - 25.5, bpm=92); cue('L14', 'crackle', 0.42, dur=1.9, seed=21)
# scare 1 in the gap
cue(E['S1'] - 0.12, 'whoosh', 0.6, dur=0.2); cue(E['S1'] - 0.01, 'scarehit', 0.98, dur=2.4); cue(E['S1'] + 0.02, 'groan', 0.34, dur=2.0)
cue(E['S1'] + 0.05, 'drone', 0.18, dur=E['run'] - E['S1'], f=37)
# the scream (Quinn's own), the flashlight dropped, the run
cue(E['scream'], 'sample', 1.0, name='q_scream'); cue(E['scream'] + 0.3, 'clunk', 0.5, seed=47); cue(E['scream'] + 0.42, 'clunk', 0.3, seed=48)
cue(E['run'], 'run', 0.5, dur=E['door'] - E['run']); cue(E['run'], 'heartbeat', 0.34, dur=E['door'] - E['run'], bpm=148)
# Four. Five. Six.: the lights die for an instant on each and the woman is nearer
for k, c in enumerate(E['fast']):
    cue(c - 0.06, 'clunk', 0.5, seed=71 + k); cue(c, 'flick', 0.32, seed=74 + k); cue(c, 'creak', 0.5, dur=0.4, seed=77 + k)
# the doors; the same staircase
cue(E['door'], 'doorboom', 0.62, seed=47); cue(E['open'], 'creak', 0.55, dur=0.9, seed=54); cue(E['open'] + 0.1, 'sting', 0.34, dur=2.2)
cue(E['door'] + 0.2, 'drone', 0.15, dur=E['end'] - E['door'] - 0.4, f=38); cue(E['open'] + 0.3, 'roomtone', 0.16, dur=E['end'] - E['open'] - 0.5, seed=9)
# the arm goes out with the bag, in ticks; something shifting inside it
cue('L25+0.1', 'creak', 0.3, dur=1.6, seed=62); cue('L26', 'heartbeat', 0.26, dur=4.6, bpm=74); cue('L28', 'scrape', 0.1, dur=1.4, seed=63)
# something on the ceiling: scratches closing in, then nothing, then the hit
t0 = E['S2'] - 2.7
for k, d in enumerate([0, 0.55, 1.0, 1.4, 1.75, 2.05]): cue(t0 + d, 'scrape', 0.34 + k * 0.05, dur=0.3, seed=80 + k)
cue(E['S2'] - 0.14, 'whoosh', 0.7, dur=0.18); cue(E['S2'] - 0.01, 'scarehit', 0.98, dur=3.0); cue(E['S2'] + 0.02, 'groan', 0.3, dur=2.0, seed=4)
# the head ticks upright on the last line; the creak of it crawling on over her
for k in range(4): cue(E['roll'] + k * 0.24, 'crackle', 0.6, dur=0.16, seed=90 + k)
cue('L32e+0.15', 'scrape', 0.3, dur=0.5, seed=95); cue('L32e+0.9', 'scrape', 0.3, dur=0.5, seed=96); cue('L32e+0.3', 'wind', 0.14, dur=1.7)

spec['sound'] = {'key': 38, 'music_gain': 0.22,
                 'music': [['0', 'mystery'], [f'{r3(E["count"][0] - 0.3)}', 'dread'], [f'{r3(E["S1"] - 0.55)}', 'silence'], [f'{r3(E["S1"] + 0.2)}', 'dread'],
                           [f'{r3(E["run"])}', 'suspense'], [f'{r3(E["open"])}', 'silence'], [f'{r3(E["open"] + 0.6)}', 'dread'], [f'{r3(E["S2"] - 1.4)}', 'silence'], [f'{r3(E["S2"] + 0.25)}', 'cosmic']],
                 'cues': cues}
json.dump(spec, open(spec_p, 'w', encoding='utf8', newline='\n'), indent=1, ensure_ascii=False)
print(len(cues), 'cues')
