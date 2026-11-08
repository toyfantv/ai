#!/usr/bin/env python3
"""Episode 36: write the spec's sound block from the director's events (build/ep36/events.json).

The hunters' shots (events.shots) and the shop windows breaking (events.glass) come from the director, so the gunfire and the
glass are generated from those lists instead of typed by hand. Times are video times (the director unmaps the two impact
sequences). Re-run after any timing change, then mkep + audio2.
Usage: python tools/ep36_sound.py   (then: python tools/mkep.py episodes/specs/ep36.json; python tools/audio2.py episodes/ep36_last_contestant.json)
"""
import json

E = json.load(open('build/ep36/events.json'))['events']
spec_p = 'episodes/specs/ep36.json'
spec = json.load(open(spec_p, encoding='utf8'))
shots, glass = E['shots'], E['glass']
r3 = lambda x: round(x, 3)
cues = []
def cue(t, name, g, **o): cues.append([t if isinstance(t, str) else str(r3(t)), name, g] + ([o] if o else []))

# the TV switches itself on: a static pop, the show's fanfare and its audience through the little speakers
cue(E['tvOn'], 'static', 0.35, dur=0.45); cue(E['tvOn'], 'clunk', 0.3); cue(E['tvOn'] + 0.2, 'fanfare', 0.22, dur=2.0); cue(E['tvOn'] + 0.3, 'applause', 0.12, dur=2.2)
cue(0, 'roomtone', 0.2, dur=E['wall'])
# the walls fall: a creak, the slam, the arena's lights banging on one bank at a time, a long rumble in the huge space
cue(E['wall'] - 0.12, 'creak', 0.45, dur=0.7); cue(E['slam'], 'wallcrash', 0.6); cue(E['slam'] + 0.05, 'rumble', 0.28, dur=3.2)
for k in range(3): cue(E['wall'] + 0.05 + k * 0.22, 'clunk', 0.55 - k * 0.1)
cue(E['slam'] + 0.4, 'vent', 0.16, dur=E['run'] - E['slam'])
# the countdown appears (a beep and the ticking that runs under the chase)
cue(E['cd'], 'beep', 0.4, f=990, dur=0.25); cue(E['cd'] + 2.3, 'tick', 0.18, dur=E['ten'] - E['cd'] - 2.3, rate=1.6)
# the hunters' gate rolls up, red light, fog; three masked figures walk out in step
cue(E['gate'], 'rollgate', 0.45, dur=1.4); cue(E['gate'], 'servo', 0.35, dur=1.4); cue(E['gate'] + 1.35, 'clunk', 0.6)
cue(E['out'], 'footsteps', 0.55, dur=E['hstop'] - E['out'], rate=1.6); cue(E['hstop'], 'stomp', 0.7)
cue(E['gate'] + 0.2, 'drone', 0.2, dur=E['run'] - E['gate'], f=46)
# he runs; the chase down the corridor
cue(E['run'] + 0.25, 'run', 0.35, dur=E['sS'] - E['run'] - 0.25)
cue(shots[0], 'gunburst', 0.4, times=[r3(v - shots[0]) for v in shots], stack=1, far=0.0, casings=True, seed=7, rev=2.2)
for k, g in enumerate(glass): cue(g, 'shatter', 0.42 if k else 0.5, seed=70 + k)
cut = next((g for g in glass if E['cor'] + 1.0 < g < E['sS'] - 0.4), glass[min(2, len(glass) - 1)])
cue(cut + 0.06, 'splat', 0.35, seed=81)
# the security gate rolls down; he slides under it (and so does the hunter behind him); it slams shut
cue(25.6, 'rollgate', 0.32, dur=E['h1E'] - 25.4, seed=64); cue(E['sS'] - 0.05, 'whoosh', 0.4, dur=0.7); cue(E['sS'], 'scrape', 0.38, dur=0.9)
cue(E['h1S'], 'scrape', 0.4, dur=0.9, seed=5); cue(E['h1E'] - 0.05, 'clunk', 0.85)
# the pipe: grabbed off the pallet, the swing, the hit across the mask (the impact sequence), the crack, the faceplate falling away
cue(E['grab'] + 0.1, 'clunk', 0.45); cue(E['grab'] + 0.12, 'scrape', 0.3, dur=0.4, seed=8)
cue(E['c1'] - 0.32, 'whoosh', 0.65, dur=0.5); cue(E['c1'], 'clash', 0.95, f=1150, seed=3); cue(E['c1'], 'kickhit', 0.6, seed=39); cue(E['c1'] + 0.02, 'crackopen', 0.35, dur=1.2)
cue(E['crack'], 'crackopen', 0.65, dur=1.8, seed=11); cue(E['open'], 'glass', 0.45, dur=1.2); cue(E['open'] + 0.02, 'static', 0.5, dur=E['faceOn'] - E['open'])
# scare 2: the screen snaps to Grayson's own face
cue(E['faceOn'] - 0.02, 'scarehit', 0.95, dur=2.6); cue(E['faceOn'] + 0.1, 'static', 0.25, dur=0.6, seed=9)
# the second hunter: out of the dark shop, the tackle, pinned; the kick (the second impact sequence) through a window
cue(E['lunge'], 'run', 0.3, dur=E['c2'] - E['lunge']); cue(E['c2'], 'bodyfall', 0.62); cue(E['c2'], 'kickhit', 0.35, seed=40); cue(E['land'], 'bodyfall', 0.42, seed=50)
cue(E['c3'] - 0.2, 'whoosh', 0.55, dur=0.4); cue(E['c3'], 'kickhit', 0.95, seed=38)
# up and sprinting for the exit; the host's countdown; beeps on the last seconds; the doors burst; white
cue(E['spr'], 'run', 0.55, dur=E['door'] - E['spr']); cue(E['spr'], 'heartbeat', 0.35, dur=E['door'] - E['spr'], bpm=150)
for k in ('ten', 'nine', 'eight'): cue(E[k], 'beep', 0.45, f=1320)
cue(E['door'], 'doorboom', 0.9); cue(E['door'] + 0.02, 'whoosh', 0.5, dur=0.6)
# home: the bedroom door bangs open, he falls, panting; the TV's audience applauds; the fanfare; the host
cue(E['bed'], 'doorboom', 0.55, seed=47); cue(E['fall'], 'bodyfall', 0.8, seed=51); cue(E['fall'] + 0.2, 'heartbeat', 0.4, dur=E['clap'] - E['fall'] - 0.1, bpm=120)
cue(E['bed'] + 0.3, 'roomtone', 0.22, dur=E['end'] - E['bed'] - 0.3)
cue(E['clap'], 'applause', 0.4, dur=E['won'] - E['clap'] + 2.4); cue(E['won'] + 0.02, 'fanfare', 0.32, dur=2.2, key=52)
# the blinds; the empty street; every window lighting up with a TV, one after another
cue(E['blinds'] - 0.05, 'curtain', 0.4, dur=0.7); cue(E['blinds'] + 0.3, 'wind', 0.22, dur=E['end'] - E['blinds'] - 0.3)
for k in range(7): cue(E['tvWave'] + k * 0.18, 'clunk', 0.3 - k * 0.02, seed=k)
cue(E['tvWave'], 'hum', 0.16, dur=E['end'] - E['tvWave'], f=60); cue('L30-0.1', 'sting', 0.3, dur=2.6)
# the host's last line; the reflection and every TV wearing the mask
cue(E['mask'] - 0.12, 'glitch', 0.45, dur=0.6, seed=12); cue(E['mask'], 'scarehit', 0.75, dur=3.2); cue(E['mask'], 'drone', 0.24, dur=E['end'] - E['mask'], f=41)

spec['sound'] = {'key': 40, 'music_gain': 0.3,
                 'music': [['0', 'suspense'], [f'{r3(E["wall"] - 0.05)}', 'silence'], [f'{r3(E["slam"] + 0.9)}', 'dread'], [f'{r3(E["gate"])}', 'suspense'],
                           [f'{r3(E["run"])}', 'action'], [f'{r3(E["c1"])}', 'action_hit'], [f'{r3(E["faceOn"] - 0.05)}', 'silence'],
                           [f'{r3(E["lunge"])}', 'action_hit'], [f'{r3(E["door"])}', 'silence'], [f'{r3(E["clap"] + 0.4)}', 'suspense'],
                           [f'{r3(E["look"])}', 'dread'], [f'{r3(E["mask"])}', 'cosmic']],
                 'cues': cues}
json.dump(spec, open(spec_p, 'w', encoding='utf8', newline='\n'), indent=1, ensure_ascii=False)
print(len(cues), 'cues;', len(shots), 'shots,', len(glass), 'windows')
