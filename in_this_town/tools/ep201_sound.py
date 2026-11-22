#!/usr/bin/env python3
"""LIM-001 (Now Serving 4,812): write the spec's sound block from the director's events (build/ep201/events.json) and the timeline.

A waiting hall that never calls anyone: the fluorescent buzz and the vent under everything (the same bed at the first
and last frame, so the loop closes); the knitter's needles; the dry mop; a far vending-machine thunk; then the DING -
and the buzz drops out: silence while the whole hall stands; the board clicks back to 4,812, the buzz returns, chairs
creak as they sit. No music, no laugh track.
Run after any timing change, then mkep + audio2.
"""
import json
E = json.load(open('build/ep201/events.json'))['events']
ep = json.load(open('build/ep201/timeline.json', encoding='utf8'))
spec_p = 'episodes/specs/ep201.json'; spec = json.load(open(spec_p, encoding='utf8'))
s = lambda i: ep['lines'][i]['start']; e = lambda i: ep['lines'][i]['end']; r3 = lambda x: round(x, 3)
cues = []
def cue(t, nm, g, **o): cues.append([str(r3(max(0, t))), nm, g] + ([o] if o else []))
END = ep['duration']
# the bed: tube buzz + vent + room tone until the DING
cue(0, 'buzz', 0.06, dur=E['ding'] + 0.05, f=120); cue(0, 'vent', 0.05, dur=E['ding'] + 0.05); cue(0, 'roomtone', 0.05, dur=E['ding'])
cue(s(1) + 0.6, 'flick', 0.03)                                          # the flickering panel
# the knitter's needles; the dry mop; a far vending thunk
cue(s(2) - 0.05, 'tick', 0.035, dur=1.2, rate=6.5)
cue(s(2) + 1.0, 'scrape', 0.05, dur=1.1, seed=5); cue(s(2) + 2.2, 'scrape', 0.04, dur=0.9, seed=7)
cue(E['thunk'], 'clunk', 0.05)
# the DING: then nothing but breath and chairs
cue(E['ding'], 'pachime', 0.22)
for k in range(5): cue(E['rise'] + 0.04 * k + 0.02 * (k % 2), 'scrape', 0.07 - 0.008 * k, dur=0.45, seed=11 + k)
cue(E['rise'] + 0.25, 'creak', 0.05)
# the board clicks back; the buzz returns; they sit
cue(E['click'], 'flick', 0.12, dur=0.25); cue(E['click'] + 0.02, 'clunk', 0.06)
cue(E['click'] + 0.05, 'buzz', 0.06, dur=END - E['click'], f=120); cue(E['click'] + 0.05, 'vent', 0.05, dur=END - E['click'])
cue(E['click'] + 0.05, 'roomtone', 0.05, dur=END - E['click'])
for k in range(4): cue(E['sit'] + 0.05 * k, 'scrape', 0.05, dur=0.35, seed=21 + k)
cue(E['sit'] + 0.15, 'creak', 0.05)
cue(E['close'] + 0.6, 'tick', 0.03, dur=1.0, rate=6.5)               # the needles again
spec['sound'] = {'key': 57, 'music_gain': 0.0, 'music': [], 'cues': cues}
json.dump(spec, open(spec_p, 'w', encoding='utf8', newline='\n'), indent=1, ensure_ascii=False); print(len(cues), 'cues')
