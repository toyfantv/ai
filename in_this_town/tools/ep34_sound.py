#!/usr/bin/env python3
"""Episode 34: write the spec's sound block from the director's events (build/ep34/events.json).

The soldiers fire in machine sync on the director's volley times (events.vol) and Eli's shots are events.esh, so the gunfire
cues are generated from those lists (absolute times) instead of typed by hand. Re-run after any timing change, then mkep + audio2.
Usage: python tools/ep34_sound.py   (then: python tools/mkep.py episodes/specs/ep34.json; python tools/audio2.py episodes/ep34_endless_training.json)
"""
import json

E = json.load(open('build/ep34/events.json'))['events']
spec_p = 'episodes/specs/ep34.json'
spec = json.load(open(spec_p, encoding='utf8'))
vol, esh = E['vol'], E['esh']
cut = E['kick'] + 0.2
hall = [v for v in vol if v < cut]
room = [v for v in vol if v >= cut]
r3 = lambda x: round(x, 3)
cues = []
def cue(t, name, g, **o): cues.append([t if isinstance(t, str) else str(r3(t)), name, g] + ([o] if o else []))
# 2 AM: the clock, the power coming on, every head lifting at once
cue(0, 'tick', 0.35, dur=2.0, rate=1.0); cue(0, 'vent', 0.18, dur=7.5)
cue(E['clock'] - 0.05, 'clunk', 0.6); cue(E['wake'] - 0.1, 'hum', 0.22, dur=4.0, f=60); cue(E['wake'], 'stomp', 0.55)
# outside: wind, a buzzing sodium lamp, wet footsteps; inside: footsteps on concrete
cue(E['ext0'], 'wind', 0.35, dur=4.4); cue(E['ext0'], 'buzz', 0.12, dur=4.2, f=120); cue(E['ext0'] + 0.1, 'footsteps', 0.4, dur=3.9, rate=1.9)
cue(E['in0'], 'footsteps', 0.45, dur=2.6, rate=2.0); cue(E['in0'], 'vent', 0.16, dur=8.0)
# the lights go red, the alarm, the PA
cue(E['red0'] - 0.05, 'clunk', 0.8); cue(E['red0'], 'alarm', 0.22, dur=5.0)
cue('L5-0.55', 'pachime', 0.45); cue('L22-0.55', 'pachime', 0.45)
# every target turns (hundreds of boots at once), every rifle comes up
cue(E['gturn'], 'scrape', 0.35, dur=0.4); cue(E['turn'] + 0.05, 'stomp', 0.9); cue(E['raise'] + 0.1, 'rack', 0.75); cue(E['raise'] + 0.12, 'rack', 0.5, seed=52)
# the volleys: synced, thick, in the hall; muffled through the walls once he is in the control room
cue(hall[0], 'gunburst', 0.7, times=[r3(v - hall[0]) for v in hall], stack=3, far=0.1, casings=True, seed=3)
if room: cue(room[0], 'gunburst', 0.32, times=[r3(v - room[0]) for v in room if v < E['stop']], stack=2, far=0.8, seed=5, rev=1.2, wet=0.3)
# the dive: a whoosh, the landing, the hand slapped on concrete; bullets on the barrier
cue(E['dive0'] - 0.05, 'whoosh', 0.6, dur=0.7); cue(E['land'], 'bodyfall', 0.8); cue(E['land'] + 0.3, 'knock', 0.4)
for k, dt in enumerate([0.15, 0.55, 1.05, 1.6, 2.2, 2.9, 3.5]): cue(f'L9+{dt}', 'concrete', 0.45, seed=60 + k)
for k, dt in enumerate([0.35, 1.3, 2.5, 3.3]): cue(f'L9+{dt}', 'ricochet', 0.45, seed=70 + k)
# the rifle: grabbed, racked; his shots (louder, close), casings
cue(E['grab'] + 0.3, 'clunk', 0.4); cue(E['grab'] + 0.9, 'rack', 0.9)
cue(esh[0], 'gunburst', 0.75, times=[r3(v - esh[0]) for v in esh], stack=1, far=0.0, casings=True, seed=9, rev=1.8)
# the hits: wet toon blood bursts, bodies dropping; the fallen glitch back
for h in ('hitA', 'hitB', 'hitC'):
    cue(E[h] + 0.04, 'splat', 0.65, seed=80 + len(cues)); cue(E[h] + 0.9, 'bodyfall', 0.5)
for b in ('backA', 'backB', 'backC'): cue(E[b] - 0.12, 'glitch', 0.4, dur=0.7, seed=90 + len(cues))
# the reload
cue(E['mout'], 'magout', 0.85); cue(E['min'], 'magin', 0.9); cue(E['rack2'], 'rack', 0.9, seed=53)
# the sprint, the door
cue(E['spr0'] + 0.25, 'run', 0.45, dur=E['kick'] - E['spr0'] - 0.3); cue(E['kc'], 'doorboom', 0.75)
# the control room: a server hum, the screen's static; the message; the soldiers stop; the masks turn
cue(E['kc'] + 0.4, 'hum', 0.2, dur=E['end'] - E['kc'] - 0.6, f=50); cue('L18-0.2', 'static', 0.25, dur=1.4)
cue(E['msg'] - 0.05, 'sting', 0.32, dur=2.5); cue(E['stop'] + 0.1, 'winddown', 0.3, dur=1.6)
cue(E['masks'], 'stomp', 0.6); cue(E['masks'] + 0.05, 'scrape', 0.4, dur=0.5)
# the original: a glitch, ORIGINAL LOCATED, the camera turning toward us
cue(E['orig'] - 0.05, 'glitch', 0.35, dur=0.6, seed=99); cue(E['view'], 'drone', 0.22, dur=E['end'] - E['view'], f=41)
cue(E['view'] + 0.6, 'sting', 0.28, dur=3.0); cue(E['cam0'], 'servo', 0.7, dur=2.4); cue(E['end'] - 0.6, 'clunk', 0.5)
spec['sound'] = {'key': 38, 'music_gain': 0.3,
                 'music': [['0', 'dread'], [f'{r3(E["red0"])}', 'suspense'], [f'{r3(E["fire0"] - 0.1)}', 'action'], [f'{r3(E["kc"] - 0.05)}', 'action_hit'],
                           [f'{r3(E["walkIn0"] + 0.4)}', 'dread'], [f'{r3(E["msg"])}', 'suspense'], [f'{r3(E["stop"])}', 'silence'],
                           [f'{r3(E["masks"] + 0.2)}', 'dread'], [f'{r3(E["view"])}', 'cosmic']],
                 'cues': cues}
json.dump(spec, open(spec_p, 'w', encoding='utf8', newline='\n'), indent=1, ensure_ascii=False)
print(len(cues), 'cues;', len(hall), 'hall shots,', len(room), 'muffled,', len(esh), "Eli's")
