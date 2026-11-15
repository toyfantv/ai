#!/usr/bin/env python3
"""Remake 14 (The Door in Her Wall): write the spec's sound block from the director's events (build/ep114/events.json) and the timeline.

A kid's bedroom where a door grows out of the wall (rumble, creak, shimmer); the rule (a sting); Felix's paper folding;
Mae's mint door and padlock; night after night; his birthday with no door; the sneak in; her world (wonder: chimes,
the milk river, the bridge); his sneakers creaking into wood; the red stars and the paper foxes diving; the fort and the
wooden boy; his shout; the freeze, the sawdust; Mae running in; the second key.
Run after any timing change, then mkep + audio2.
"""
import json
E = json.load(open('build/ep114/events.json'))['events']
ep = json.load(open('build/ep114/timeline.json', encoding='utf8'))
spec_p = 'episodes/specs/ep114.json'; spec = json.load(open(spec_p, encoding='utf8'))
s = lambda i: ep['lines'][i]['start']; e = lambda i: ep['lines'][i]['end']; r3 = lambda x: round(x, 3)
cues = []
def cue(t, nm, g, **o): cues.append([str(r3(max(0, t))), nm, g] + ([o] if o else []))
END = ep['duration']
# the door grows out of a bedroom wall
cue(0, 'roomtone', 0.1, dur=s(1))
cue(E['grow0'] - 0.3, 'rumble', 0.12, dur=1.6); cue(E['grow0'], 'creak', 0.12); cue(E['grow0'] + 0.6, 'shimmer', 0.08, dur=1.4)
cue(E['open1'] - 0.1, 'creak', 0.1); cue(E['open1'] + 0.1, 'shimmer', 0.1, dur=2.2)
for k in range(4): cue(E['open1'] + 0.3 + k * 0.35, 'chime', 0.05, note=[84, 88, 91, 96][k])
# the rule: never enter uninvited
cue(s(2) - 0.05, 'roomtone', 0.08, dur=s(3) - s(2)); cue(E['sneak'], 'footsteps', 0.06, dur=1.4, rate=1.6)
cue(E['woodR'] - 0.1, 'scarehit', 0.14); cue(E['woodR'] + 0.1, 'creak', 0.12)
# Felix folds; Mae keeps every one
cue(s(3) - 0.05, 'suburb', 0.06, dur=s(4) - s(3)); cue(s(3) + 0.4, 'paper', 0.12); cue(E['fox'], 'paper', 0.1)
cue(E['fox'] + 0.1, 'pop', 0.08); cue(E['box'] + 0.3, 'clunk', 0.06)
# Mae's mint door and padlock
cue(s(4) - 0.05, 'roomtone', 0.08, dur=s(7) - s(4)); cue(E['grow4'] - 0.2, 'rumble', 0.1, dur=1.2); cue(E['grow4'], 'creak', 0.1)
cue(E['grow4'] + 1.4, 'lockturn', 0.14); cue(E['grow4'] + 1.5, 'chime', 0.05, note=79)
cue(E['enter5'], 'creak', 0.08); cue(E['enter5'] + 0.4, 'shimmer', 0.06, dur=1.2)
cue(s(6) - 0.2, 'knock', 0.1); cue(s(6) + 1.6, 'clunk', 0.1)
# his birthday: no door
cue(s(7) - 0.05, 'roomtone', 0.08, dur=s(9) - s(7))
[cue(s(7) + 0.2 + k * 0.25, 'pop', 0.05) for k in range(3)]
cue(s(7) + 1.1, 'groan', 0.05); cue(s(7) + 1.2, 'tick', 0.05, dur=0.8, rate=1)
# her door hung open; he slips in
cue(s(8) + 0.2, 'creak', 0.12); cue(E['push'] - 0.6, 'footsteps', 0.08, dur=1.0, rate=2.2)
cue(E['push'], 'whoosh', 0.14, dur=0.7); cue(E['push'] + 0.2, 'shimmer', 0.12, dur=2.0)
# her world: stars, the milk river, the bridge
cue(s(9), 'water', 0.08, dur=s(10) - s(9)); cue(s(9) + 0.3, 'sample', 0.14, name='whoa', rev=0.3, wet=0.1)
for k in range(5): cue(s(9) + 0.6 + k * 0.5, 'chime', 0.05, note=[84, 88, 91, 86, 93][k])
cue(s(9) + 2.6, 'clunk', 0.08); cue(s(9) + 3.0, 'tick', 0.05, dur=0.6, rate=4)
# his sneakers creak: wood up to his knees
cue(E['creak'], 'creak', 0.18); cue(E['creak'] + 0.9, 'creak', 0.16); cue(E['creak'] + 1.6, 'scrape', 0.1, dur=1.0)
cue(E['creak'] + 0.5, 'heartbeat', 0.1, dur=2.4); cue(E['creak'] + 1.9, 'sample', 0.15, name='ohno', rev=0.3, wet=0.1)
# the stars turn red; paper foxes dive
cue(E['red'] - 0.1, 'scarehit', 0.18); cue(E['red'], 'drone', 0.1, dur=E['shout'] - E['red'])
cue(E['dive'] - 0.2, 'whoosh', 0.16, dur=0.8); cue(E['dive'] + 0.4, 'flutter', 0.12, dur=1.6); cue(E['dive'] + 0.6, 'paper', 0.12)
cue(E['run'], 'footsteps', 0.14, dur=E['hide'] - E['run'] + 0.2, rate=3.2); cue(E['run'] + 0.6, 'flutter', 0.1, dur=1.4)
# the fort, the wooden boy in his beanie
cue(E['hide'] + 0.1, 'bodyfall', 0.08); cue(s(12) + 2.0, 'sting', 0.12); cue(s(12) + 2.3, 'sample', 0.14, name='huh', rev=0.3, wet=0.1)
cue(s(13), 'heartbeat', 0.08, dur=s(14) - s(13) - 0.2); cue(s(13) + 1.6, 'paper', 0.08)
# his shout; the freeze; the sawdust
cue(E['shout'] - 0.1, 'riser', 0.1, dur=0.6)
cue(E['freeze'], 'freeze', 0.14); cue(E['freeze'] + 0.05, 'scratch', 0.08)
cue(E['gold'], 'shimmer', 0.12, dur=2.4); cue(E['crumble'], 'rockbreak', 0.12); cue(E['crumble'] + 0.1, 'dustglitter', 0.14, dur=2.0)
cue(E['maeRun'], 'footsteps', 0.12, dur=1.4, rate=2.6); cue(E['maeRun'] + 0.1, 'sample', 0.15, name='pant', rev=0.3, wet=0.1)
# Mae's answer; the second key
cue(s(16) - 0.05, 'water', 0.05, dur=s(17) - s(16))
cue(E['key'] + 0.6, 'lockturn', 0.14); cue(E['key'] + 0.7, 'chime', 0.07, note=84); cue(E['key'] + 0.9, 'chime', 0.06, note=91)
cue(E['key'] + 1.2, 'shimmer', 0.08, dur=1.8); cue(e(17) - 0.1, 'sample', 0.12, name='hehe', rev=0.3, wet=0.1)
spec['sound'] = {'key': 62, 'music_gain': 0.3,
  'music': [['0', 'wonder'], [str(r3(s(2) - 0.1)), 'mystery'], [str(r3(s(3) - 0.1)), 'playful'], [str(r3(s(7) - 0.1)), 'tender'],
            [str(r3(s(8) - 0.1)), 'mystery'], [str(r3(s(9) - 0.1)), 'wonder'], [str(r3(s(10) - 0.1)), 'suspense'],
            [str(r3(E['red'] - 0.1)), 'action'], [str(r3(s(13) - 0.1)), 'dread'], [str(r3(s(15) + 1.3)), 'tender'],
            [str(r3(s(17) - 0.1)), 'musicbox']], 'cues': cues}
json.dump(spec, open(spec_p, 'w', encoding='utf8', newline='\n'), indent=1, ensure_ascii=False); print(len(cues), 'cues')
