#!/usr/bin/env python3
"""Remake 8 (The Smallest Kid): write the spec's sound block from the director's events (build/ep108/events.json) and the timeline.

Fernbrook, where every thank-you said to your face makes you an inch taller (a street, pops and chimes on the growth spurts);
the crossing guard ducking under a lamp, the pocket-sized greedy man; Milo on a stool at the fountain; the Phantom's work
(a pump hiss at dawn, homework with a note); the grease, the bike chain behind the gym (wrench clinks); "It's you!"; the
grandpa flashback (tender); the banner over the front doors; the line of thank-yous (pops, chimes, crowd steps); his head
bumping the lights; he kneels to June, thanks her, and she grows one inch.
Run after any timing change, then mkep + audio2.
"""
import json
E = json.load(open('build/ep108/events.json'))['events']
ep = json.load(open('build/ep108/timeline.json', encoding='utf8'))
spec_p = 'episodes/specs/ep108.json'; spec = json.load(open(spec_p, encoding='utf8'))
s = lambda i: ep['lines'][i]['start']; e = lambda i: ep['lines'][i]['end']; r3 = lambda x: round(x, 3)
cues = []
def cue(t, nm, g, **o): cues.append([str(r3(max(0, t))), nm, g] + ([o] if o else []))
END = ep['duration']
def grow(t, g=0.07, base=84):
    cue(t, 'pop', g + 0.02); cue(t + 0.05, 'shimmer', g, dur=1.0); cue(t + 0.1, 'chime', g * 0.8, note=base); cue(t + 0.35, 'chime', g * 0.7, note=base + 7)
# the street: a granny thanks the helper kid; he pops an inch
cue(0, 'suburb', 0.09, dur=s(2) - 0.1)
cue(1.3, 'sample', 0.1, name='granny', rev=0.2, wet=0.08)
grow(E['pop0'])
# the guard ducks under a lamp; the greedy man
cue(E['duck'] - 0.1, 'whoosh', 0.06, dur=0.6); cue(E['duck'] + 0.3, 'clunk', 0.05)
cue(E['greedy'] + 0.1, 'ding', 0.05); cue(E['greedy'] + 0.9, 'groan', 0.04)
# the hallway: Milo on a stool at the fountain
cue(s(2) - 0.05, 'roomtone', 0.08, dur=s(4) - s(2)); cue(s(2) + 1.2, 'creak', 0.06); cue(s(2) + 2.4, 'water', 0.06, dur=1.4)
cue(s(3) + 0.3, 'whisper', 0.04, dur=1.6)
# the Phantom at dawn: tyres pumped, homework back with a note
cue(s(4) - 0.05, 'suburb', 0.06, dur=E['hw'] - s(4)); cue(s(4) + 1.0, 'sting', 0.07)
for k in range(3): cue(E['pump'] - 0.1 + k * 0.55, 'whoosh', 0.05, dur=0.45)
cue(E['hw'] - 0.05, 'roomtone', 0.07, dur=s(6) - E['hw']); cue(E['hw'] + 0.3, 'paper', 0.1); cue(E['hw'] + 1.6, 'paper', 0.08)
# the grease on his fingers
cue(E['grease'] - 0.1, 'sting', 0.08); cue(E['grease'] + 0.5, 'sample', 0.1, name='gasp', rev=0.2, wet=0.08)
# behind the gym: the bike chain
cue(s(6) - 0.05, 'suburb', 0.07, dur=s(8) - s(6)); cue(s(6) + 0.2, 'footsteps', 0.06, dur=1.2, rate=1.8)
for k in range(5): cue(E['fix'] + 0.15 + k * 0.42, 'tick', 0.05, dur=0.1, rate=1)
cue(E['chain'] + 0.1, 'chainslide', 0.1); cue(E['chain'] + 0.6, 'paper', 0.06)
# "It's you! You're the Phantom!"
cue(E['you'] - 0.1, 'scarehit', 0.07); cue(E['phantom'] + 0.1, 'riser', 0.06, dur=0.8)
# the grandpa flashback; apples on a porch
cue(s(8) - 0.05, 'suburb', 0.05, dur=s(9) - s(8)); cue(s(8) + 0.4, 'chirp', 0.05)
cue(s(8) + 2.6, 'footsteps', 0.05, dur=1.6, rate=1.4)
# unseen; please don't tell
cue(s(9) - 0.05, 'roomtone', 0.07, dur=s(11) - s(9)); cue(s(9) + 0.4, 'footsteps', 0.05, dur=1.5, rate=3.0)
# June hangs the banner
cue(s(11) - 0.05, 'roomtone', 0.08, dur=s(13) - s(11)); cue(E['hung'] - 0.1, 'whoosh', 0.07, dur=0.7); cue(E['hung'] + 0.2, 'paper', 0.12)
cue(E['hung'] + 0.5, 'shimmer', 0.06, dur=1.4); cue(E['enter'], 'crowdsteps', 0.07, dur=2.0)
# Nadia's thank-you: one inch
grow(E['inch'], 0.08, 84)
# the flat-tyre kid, the homework kid, the whole hallway
cue(E['flat'] - 0.15, 'sample', 0.1, name='tyb', rev=0.2, wet=0.08); grow(E['flat'] + 0.55, 0.08, 86)
cue(E['hwk'] - 0.1, 'sample', 0.1, name='tyg', rev=0.2, wet=0.08); grow(E['hwk'] + 0.55, 0.08, 88)
cue(E['line'], 'crowdsteps', 0.07, dur=E['bump'] - E['line'])
for k in range(6): t = E['line'] + 0.3 + k * 0.55; cue(t, 'pop', 0.06); cue(t + 0.05, 'chime', 0.05, note=[89, 91, 93, 95, 96, 98][k])
cue(E['princ'] + 0.2, 'riser', 0.06, dur=1.8)
# his head bumps the lights
cue(E['bump'], 'clunk', 0.16); cue(E['bump'] + 0.02, 'ding', 0.05); cue(E['bump'] + 0.15, 'sample', 0.12, name='ow', rev=0.2, wet=0.08)
cue(E['bump'] + 0.3, 'creak', 0.07)
# he kneels; "Thank you, June."; she grows one inch
cue(E['kneel'] + 0.2, 'bodyfall', 0.05)
grow(E['jgrow'], 0.08, 91)
cue(E['jgrow'] + 0.9, 'sample', 0.1, name='hehe', rev=0.2, wet=0.08)
spec['sound'] = {'key': 62, 'music_gain': 0.3,
  'music': [['0', 'playful'], [str(r3(s(2) - 0.1)), 'tender'], [str(r3(s(4) - 0.1)), 'mystery'], [str(r3(s(7) - 0.1)), 'suspense'],
            [str(r3(s(8) - 0.1)), 'musicbox'], [str(r3(s(10) - 0.1)), 'tender'], [str(r3(s(11) - 0.1)), 'playful'],
            [str(r3(s(13) - 0.1)), 'wonder'], [str(r3(s(15) - 0.1)), 'tender']], 'cues': cues}
json.dump(spec, open(spec_p, 'w', encoding='utf8', newline='\n'), indent=1, ensure_ascii=False); print(len(cues), 'cues')
