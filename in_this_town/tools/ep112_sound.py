#!/usr/bin/env python3
"""Remake 12 (The Ink Fountains): write the spec's sound block from the director's events (build/ep112/events.json) and the timeline.

A night street with crickets and a mystery bed; the first fountain gushes up; the trash can chomps; Wren's kick; Checkers eeps;
the seal (a shimmer, a gold chime); the morning tick; the rumor fountain; a hush and footsteps at the hedge, drips; the door creak;
the crack, the yank, the empty armor; the jar's flicker; the heart flies home; gold light; the stars ping back on; a quiet last morning.
Run after any timing change, then mkep + audio2.
"""
import json
E = json.load(open('build/ep112/events.json'))['events']
ep = json.load(open('build/ep112/timeline.json', encoding='utf8'))
spec_p = 'episodes/specs/ep112.json'; spec = json.load(open(spec_p, encoding='utf8'))
s = lambda i: ep['lines'][i]['start']; e = lambda i: ep['lines'][i]['end']; r3 = lambda x: round(x, 3)
cues = []
def cue(t, nm, g, **o): cues.append([str(r3(max(0, t))), nm, g] + ([o] if o else []))
END = ep['duration']
# the street at night
cue(0, 'roomtone', 0.12, dur=s(5) - 0.05)
for t, f in ((0.4, 4200), (1.9, 4600), (3.3, 4400), (6.2, 4800), (9.0, 4300), (13.4, 4700), (16.8, 4500)): cue(t, 'chirp', 0.04, f=f)
cue(E['burst1'] - 0.2, 'riser', 0.12, dur=0.3); cue(E['burst1'], 'water', 0.3, dur=3.6); cue(E['burst1'] + 0.05, 'whoosh', 0.22, dur=1.0)
cue(E['wake'], 'pop', 0.2); cue(E['wake'] + 0.3, 'clash', 0.06); cue(E['wake'] + 0.5, 'stomp', 0.12); cue(E['wake'] + 0.95, 'stomp', 0.1)
cue(s(1) + 0.1, 'water', 0.12, dur=s(3) - s(1))
cue(s(1) + 1.6, 'shimmer', 0.07, dur=1.6); cue(E['eat'] - 0.1, 'chime', 0.1, note=88); cue(E['eat'] + 0.4, 'chime', 0.08, note=81)
cue(s(2) + 0.2, 'chime', 0.08, note=84)
cue(E['kick'] - 0.5, 'footsteps', 0.12, dur=0.6, rate=4.0); cue(E['kick'] - 0.05, 'sample', 0.2, name='hiyah', rev=0.4, wet=0.1); cue(E['kick'], 'kickhit', 0.3); cue(E['kick'] + 0.1, 'whoosh', 0.16, dur=0.7)
cue(E['eep'], 'sample', 0.2, name='eep', rev=0.4, wet=0.1); cue(E['eep'] + 0.05, 'swish', 0.14)
# the seal
cue(E['seal0'] - 0.2, 'water', 0.16, dur=E['seal1'] - E['seal0'] + 0.2); cue(E['seal0'], 'shimmer', 0.1, dur=2.2); cue(E['seal1'] - 0.2, 'chime', 0.14, note=91); cue(E['seal1'] + 0.1, 'chime', 0.1, note=86)
cue(s(5) + 3.1, 'chime', 0.06, note=76); cue(s(5) + 3.5, 'chime', 0.05, note=74)
cue(s(5) + 4.15, 'roomtone', 0.1, dur=s(6) - s(5) - 4.15); cue(s(5) + 4.25, 'tick', 0.05, dur=1.6, rate=4)
# the rumor
cue(s(6) - 0.05, 'roomtone', 0.12, dur=s(9) - s(6) + 1.3)
cue(E['burst3'] - 0.2, 'riser', 0.12, dur=0.3); cue(E['burst3'], 'water', 0.28, dur=3.0); cue(E['burst3'] + 0.05, 'whoosh', 0.2, dur=1.0)
cue(s(7) + 0.5, 'pop', 0.12); cue(s(7) + 0.75, 'pop', 0.1)
# the hedge: a hush, his heavy shuffle, the drips
cue(s(8) - 0.3, 'footsteps', 0.16, dur=s(9) - s(8) + 0.2, rate=1.5); cue(s(8) + 0.4, 'hum', 0.05, dur=4.0)
for k in range(9): cue(s(8) + 0.6 + k * 0.45, 'tick', 0.04, dur=0.06, rate=2)
cue(s(9) + 0.3, 'creak', 0.18, dur=0.9); cue(s(9) + 1.4, 'footsteps', 0.1, dur=1.0, rate=1.6)
# the room: the crack, the yank, empty
cue(s(9) + 1.38, 'roomtone', 0.1, dur=END - s(9) - 1.38 - (END - s(16)))
cue(E['crack'], 'crackle', 0.22, dur=1.2); cue(E['crack'] + 0.1, 'rockbreak', 0.12); cue(E['crack'] + 0.4, 'water', 0.1, dur=3.0)
cue(E['yank'] - 0.4, 'footsteps', 0.12, dur=0.4, rate=4); cue(E['yank'] - 0.05, 'clash', 0.14); cue(E['yank'] + 0.05, 'swish', 0.2)
cue(E['yank'] + 0.25, 'sample', 0.16, name='gasp', rev=0.4, wet=0.1)
cue(E['empty'] - 0.1, 'hum', 0.08, dur=2.4); cue(E['empty'], 'chime', 0.08, note=70)
# the jar, the realisation
cue(s(11) + 0.2, 'shimmer', 0.07, dur=3.4); cue(s(11) + 2.0, 'chime', 0.07, note=83); cue(s(12) + 0.2, 'water', 0.08, dur=2.8)
# the heart flies home; gold light
cue(E['lid'] - 0.1, 'pop', 0.2); cue(E['fly0'], 'whoosh', 0.16, dur=0.9); cue(E['fly0'] + 0.1, 'shimmer', 0.1, dur=1.2); cue(E['fly1'], 'chime', 0.14, note=88)
cue(E['hold'], 'shimmer', 0.12, dur=3.2); cue(E['hold'] + 0.3, 'riser', 0.06, dur=1.8); cue(E['hold'] + 2.4, 'chime', 0.12, note=91); cue(E['hold'] + 2.7, 'chime', 0.1, note=95)
# the stars come back
for k in range(8): cue(E['starsOn'] + 0.1 + k * 0.22, 'chime', 0.06, note=[84, 88, 91, 86, 93, 89, 96, 91][k])
cue(s(15) - 0.05, 'roomtone', 0.08, dur=s(16) - s(15))
for t, f in ((s(15) + 0.4, 4400), (s(15) + 1.6, 4700)): cue(t, 'chirp', 0.03, f=f)
# the last morning
cue(s(16) - 0.05, 'roomtone', 0.08, dur=END - s(16) + 0.05)
for t, f in ((s(16) + 0.3, 2100), (s(16) + 1.2, 2500), (s(16) + 2.6, 2300)): cue(t, 'chirp', 0.06, f=f)
cue(s(16) + 2.6, 'chime', 0.08, note=70); cue(s(16) + 2.9, 'water', 0.05, dur=0.6)
spec['sound'] = {'key': 57, 'music_gain': 0.3,
  'music': [['0', 'mystery'], [str(r3(s(2) - 0.1)), 'wonder'], [str(r3(s(5) + 3.0)), 'mystery'], [str(r3(s(6) - 0.1)), 'suspense'],
            [str(r3(s(10) - 0.1)), 'dread'], [str(r3(s(11) - 0.1)), 'mystery'], [str(r3(s(14) - 0.1)), 'tender_hope'],
            [str(r3(s(16) - 0.1)), 'musicbox']], 'cues': cues}
json.dump(spec, open(spec_p, 'w', encoding='utf8', newline='\n'), indent=1, ensure_ascii=False); print(len(cues), 'cues')
