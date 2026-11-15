#!/usr/bin/env python3
"""Remake 2 (The Town That Erased Its Names): write the spec's sound block from the director's events
(build/ep102/events.json) and the timeline.

Gullhaven on Name Day (a sunny harbour plaza, gulls and sea); chalk on slates; the mayor's PUDDING; the chiseled plaque;
the man in the tall hat walking up, knocking, every door slamming; Tilly under the portrait; "Brenda? Really?";
the knock at No. 7, the teapot shattering ("Oh no"); the ledger and the sepia flashback (a quill, the chisel); the
bill unrolling; "you owe us the town"; the thumb-lick and the wipe; the door slammed in his face; "Hmm... Brenda?".
Run after any timing change, then mkep + audio2.
"""
import json
E = json.load(open('build/ep102/events.json'))['events']
ep = json.load(open('build/ep102/timeline.json', encoding='utf8'))
spec_p = 'episodes/specs/ep102.json'; spec = json.load(open(spec_p, encoding='utf8'))
s = lambda i: ep['lines'][i]['start']; e = lambda i: ep['lines'][i]['end']; r3 = lambda x: round(x, 3)
cues = []
def cue(t, nm, g, **o): cues.append([str(r3(max(0, t))), nm, g] + ([o] if o else []))
END = ep['duration']
# Gullhaven on Name Day: sea, gulls, the plaza
cue(0, 'sea', 0.07, dur=s(4) - 0.1); cue(0, 'suburb', 0.06, dur=s(4) - 0.1)
cue(0.5, 'chirp', 0.04, f=1700, dur=0.4, up=0); cue(1.9, 'chirp', 0.035, f=1500, dur=0.35, up=0)
# chalked on a slate (the stall), the mayor writes PUDDING
cue(s(1) + 0.3, 'scratch', 0.05, dur=1.3, rate=7); cue(E['chalked'] - 0.2, 'scratch', 0.05, dur=1.3, rate=8)
cue(s(2) - 0.3, 'scratch', 0.05, dur=E['pudding'] - s(2) + 0.15, rate=8); cue(E['pudding'], 'ding', 0.04)
cue(E['socks'] + 0.2, 'paper', 0.05)
# the founder's name chiseled off the plaque
cue(E['founder'] - 0.1, 'shimmer', 0.04, dur=1.2); cue(E['chisel'] + 0.1, 'scrape', 0.05, dur=0.5)
cue(E['chisel'] + 0.5, 'scrape', 0.045, dur=0.4, seed=5)
# the man in the tall hat walks up and knocks; every door shuts fast
cue(s(4) - 0.05, 'suburb', 0.07, dur=s(7) - s(4)); cue(s(4) + 0.2, 'footsteps', 0.05, dur=E['knock'] - s(4) - 0.4, rate=1.8)
cue(E['tall'] + 0.1, 'sting', 0.05)
for k in range(4): cue(E['knock'] + 0.16 + k * 0.31, 'knock', 0.08)
cue(E['every'] + 0.0, 'creak', 0.05, dur=0.6)
cue(E['shut'] + 0.45, 'clunk', 0.09)
for j in range(3): cue(E['shut'] + 0.8 + j * 0.22, 'clunk', 0.07)
cue(E['shut'] + 0.5, 'chirp', 0.03, f=1600, dur=0.4, up=0)
# Tilly under the portrait; the kitchen
cue(s(7) - 0.05, 'roomtone', 0.06, dur=s(10) - s(7)); cue(E['grandma'] + 0.1, 'chime', 0.04, note=79)
cue(E['kept'] + 0.1, 'footsteps', 0.04, dur=1.4, rate=2.4); cue(E['brenda'] + 0.4, 'tick', 0.03, dur=2.0, rate=1)
cue(E['really'] + 1.2, 'pop', 0.04)
# next morning: the knock at No. 7
cue(s(10) - 0.05, 'suburb', 0.06, dur=s(14) - s(10)); cue(E['morning'] - 0.3, 'chirp', 0.04, f=1400, dur=0.4)
for k in range(3): cue(E['morning'] + 0.15 + k * 0.29, 'knock', 0.09)
cue(E['morning'] + 0.95, 'creak', 0.06, dur=1.0); cue(E['doorstep'] + 0.1, 'sting', 0.05)
cue(E['reads'] - 0.6, 'paper', 0.06); cue(E['me'] + 0.3, 'ding', 0.04)
# Mom drops the teapot
cue(E['drop'] + 0.2, 'whoosh', 0.04, dur=0.4); cue(E['drop'] + 0.42, 'shatter', 0.09)
cue(E['drop'] + 0.5, 'sample', 0.05, name='oops')
# the ledger; the sepia flashback: a quill on paper, the harbour, the chisel, everyone wipes their slates
cue(E['ledger'] + 0.1, 'paper', 0.07); cue(E['ledger'] + 0.5, 'paper', 0.05, seed=4)
cue(E['century'] - 0.15, 'whoosh', 0.06, dur=0.6); cue(E['century'] + 0.0, 'shimmer', 0.05, dur=1.4)
cue(E['century'] + 0.2, 'scratch', 0.04, dur=1.6, rate=9)
cue(E['harbor'] - 0.05, 'sea', 0.06, dur=s(15) - E['harbor']); cue(E['harbor'] + 0.4, 'chirp', 0.035, f=1600, dur=0.4, up=0)
for k in range(5): cue(E['paying'] + 0.3 + k * 0.35, 'clunk', 0.04)
cue(E['made'] + 0.2, 'scratch', 0.05, dur=1.6, rate=10)
cue(E['custom'] - 0.25, 'whoosh', 0.06, dur=0.5)
# the bill unrolls: you owe us the town, three times
cue(s(16) - 0.05, 'suburb', 0.05, dur=END - s(16)); cue(E['custom'] + 0.4, 'paper', 0.06, seed=7)
cue(E['hiding'] - 0.3, 'chainslide', 0.05); cue(E['hiding'] + 0.2, 'sting', 0.05)
cue(E['interest'] + 0.2, 'hum', 0.03, dur=2.0, f=55); cue(E['three'] + 0.3, 'ding', 0.05)
# the thumb-lick and the wipe; "Sorry, mister. Wrong house. I'm Brenda."
cue(E['lick'] + 0.3, 'pop', 0.03); cue(E['wipe'] + 0.1, 'scrape', 0.05, dur=0.7, seed=9)
# she shuts the door; "Hmm... Brenda?"
cue(E['shutE'] + 0.2, 'whoosh', 0.04, dur=0.3); cue(E['shutE'] + 0.42, 'clunk', 0.1)
cue(E['shutE'] + 0.6, 'chirp', 0.03, f=1500, dur=0.4, up=0)
cue(E['shutE'] + 1.75, 'sample', 0.07, name='hm')
spec['sound'] = {'key': 55, 'music_gain': 0.3,
  'music': [['0', 'playful'], [str(r3(s(4) - 0.1)), 'mystery'], [str(r3(s(7) - 0.1)), 'tender'],
            [str(r3(s(10) - 0.1)), 'suspense'], [str(r3(E['drop'] + 0.3)), 'playful'], [str(r3(E['century'] - 0.1)), 'waltz'],
            [str(r3(E['custom'] - 0.1)), 'suspense'], [str(r3(E['lick'] - 0.1)), 'playful']], 'cues': cues}
json.dump(spec, open(spec_p, 'w', encoding='utf8', newline='\n'), indent=1, ensure_ascii=False); print(len(cues), 'cues')
