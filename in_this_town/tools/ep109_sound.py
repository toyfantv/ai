#!/usr/bin/env python3
"""Remake 9 (The Postman of the Birch Woods): write the spec's sound block from the director's events (build/ep109/events.json)
and the timeline.

Birchwater, where nobody says a real name aloud (a sunny street, the barber's snips); the postman of bark in the birches
(wind, a quill); the Sunday yard (a mower, the van rolling down the hill, the trike hit, "Got you!"); Mom screams the name,
a quill scratches, her face goes cold; Kit pulls off his ear defenders; the night woods (wind, footsteps, thousands of
postcards); the grab, the cold hand; Kit writes his own name and feeds hers to the lantern (a blue flare); the cap tip;
the sunrise kitchen; the treehouse at dusk and the cocoa.
Run after any timing change, then mkep + audio2.
"""
import json
E = json.load(open('build/ep109/events.json'))['events']
ep = json.load(open('build/ep109/timeline.json', encoding='utf8'))
spec_p = 'episodes/specs/ep109.json'; spec = json.load(open(spec_p, encoding='utf8'))
s = lambda i: ep['lines'][i]['start']; e = lambda i: ep['lines'][i]['end']; r3 = lambda x: round(x, 3)
cues = []
def cue(t, nm, g, **o): cues.append([str(r3(max(0, t))), nm, g] + ([o] if o else []))
END = ep['duration']
# Birchwater: a bright street, the barber's snips
cue(0, 'suburb', 0.09, dur=s(2) - 0.1); cue(0.2, 'footsteps', 0.05, dur=3.4, rate=1.6); cue(1.6, 'chirp', 0.05)
for k in range(6): cue(s(1) + 0.2 + k * 0.32, 'tick', 0.05, dur=0.08, rate=1)
cue(s(1) + 0.9, 'bell', 0.04)
# the postman of bark in the birches
cue(s(2) - 0.05, 'wind', 0.07, dur=s(4) - s(2)); cue(s(2) + 0.3, 'sting', 0.07); cue(s(2) + 1.2, 'creak', 0.06)
cue(s(3) + 1.8, 'scratch', 0.08); cue(s(3) + 2.6, 'whisper', 0.04, dur=1.2)
# the Sunday yard: the mower, Sparrow, the baby on his trike
cue(s(4) - 0.05, 'suburb', 0.08, dur=s(7) - s(4)); cue(s(4) - 0.05, 'chug', 0.04, dur=s(6) - s(4))
cue(E['vanGo'], 'creak', 0.07); cue(E['vanGo'] + 0.2, 'rumble', 0.08, dur=E['vanPass'] - E['vanGo'])
cue(E['trikeShot'] + 0.3, 'sample', 0.1, name='vroom', rev=0.15, wet=0.06)
cue(E['run0'], 'run', 0.07, dur=E['scoop'] - E['run0'])
cue(E['scoop'] - 0.05, 'whoosh', 0.08, dur=0.5); cue(E['vanPass'] - 0.05, 'whoosh', 0.07, dur=0.6)
cue(E['vanPass'], 'clunk', 0.16); cue(E['vanPass'] + 0.03, 'impact', 0.1); cue(E['vanPass'] + 0.25, 'scrape', 0.06)
cue(E['safe'] + 0.05, 'sample', 0.09, name='phew', rev=0.15, wet=0.06)
# Mom screams the name; in the birches a quill scratches; her face goes cold
cue(s(7) + 0.4, 'riser', 0.05, dur=1.4)
cue(E['quill'] - 0.2, 'wind', 0.07, dur=1.8); cue(E['quill'] + 0.05, 'scratch', 0.1); cue(E['quill'] + 0.9, 'scratch', 0.08)
cue(E['cold'] + 0.1, 'scarehit', 0.07); cue(E['cold'] + 0.2, 'drone', 0.05, dur=2.5)
# Kit, mowing in ear defenders
cue(s(10) - 0.05, 'chug', 0.06, dur=E['kitPull'] + 0.3 - s(10)); cue(E['kitPull'] + 0.3, 'pop', 0.05)
# night: up the path into the birches
cue(s(11) - 0.05, 'wind', 0.08, dur=s(18) - s(11)); cue(s(11) + 0.1, 'footsteps', 0.06, dur=2.6, rate=1.8)
cue(s(11) + 1.5, 'scratch', 0.05); cue(s(11) + 0.4, 'drone', 0.04, dur=s(13) - s(11))
# thousands of postcards
cue(E['reveal'] + 0.2, 'flutter', 0.06); cue(E['reveal'] + 0.3, 'shimmer', 0.06, dur=2.0)
cue(E['newest'] - 0.05, 'sting', 0.07)
# the grab; the cold hand
cue(E['grab'], 'paper', 0.12); cue(E['hand'] - 0.02, 'scarehit', 0.1)
cue(E['hand'] + 0.15, 'sample', 0.1, name='gasp', rev=0.2, wet=0.08)
cue(E['loom'], 'creak', 0.07); cue(E['loom'] + 0.2, 'heartbeat', 0.05, dur=s(15) - E['loom'])
cue(s(14) - 0.2, 'rumble', 0.04, dur=e(14) - s(14) + 0.2)
# he writes his own name; Marigold's card into the lantern
cue(E['write2'] - 0.1, 'scratch', 0.1); cue(E['write2'] + 0.6, 'scratch', 0.08)
cue(E['feed'], 'footsteps', 0.05, dur=0.8, rate=1.6)
cue(E['flare'] - 0.1, 'whoosh', 0.09, dur=0.7); cue(E['flare'] + 0.05, 'crackle', 0.08, dur=1.0); cue(E['flare'] + 0.1, 'shimmer', 0.08, dur=1.4)
# the cap tip
cue(E['tip'] + 0.2, 'chime', 0.06, note=76)
# sunrise: the kitchen
cue(E['dawn'] - 0.05, 'roomtone', 0.08, dur=s(20) - E['dawn']); cue(E['dawn'] + 0.2, 'chirp', 0.05)
cue(E['enter'] - 0.5, 'creak', 0.07); cue(E['enter'], 'footsteps', 0.05, dur=1.1, rate=1.5)
cue(E['blank'] - 0.1, 'sting', 0.05)
# the treehouse at dusk; the cocoa
cue(s(20) - 0.05, 'suburb', 0.06, dur=END - s(20)); cue(s(20) + 0.6, 'chirp', 0.04)
cue(E['place'], 'knock', 0.06); cue(E['place'] + 0.6, 'footsteps', 0.04, dur=1.0, rate=1.4)
cue(E['endW'], 'shimmer', 0.05, dur=1.6)
spec['sound'] = {'key': 57, 'music_gain': 0.3,
  'music': [['0', 'playful'], [str(r3(s(2) - 0.1)), 'mystery'], [str(r3(s(4) - 0.1)), 'playful'], [str(r3(s(5) - 0.1)), 'suspense'],
            [str(r3(s(7) - 0.1)), 'dread'], [str(r3(s(10) - 0.1)), 'mystery'], [str(r3(s(13) - 0.1)), 'suspense'],
            [str(r3(s(16) - 0.1)), 'wonder'], [str(r3(s(18) - 0.1)), 'tender'], [str(r3(s(20) - 0.1)), 'musicbox']], 'cues': cues}
json.dump(spec, open(spec_p, 'w', encoding='utf8', newline='\n'), indent=1, ensure_ascii=False); print(len(cues), 'cues')
