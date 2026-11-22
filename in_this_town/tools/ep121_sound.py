#!/usr/bin/env python3
"""LORE-001 / episode 121 (We Lie Down When the Shadow Comes): write the spec's sound block from the director's events
(build/ep121/events.json) and the timeline.

A noon village: insects, a folk-tender bed, wind over wheat; the shadow's slow wing whoosh as it sweeps; bodies dropping
flat; the noon bell; the halt (the insects and the music cut out: held breath); a smoke crackle at the edge; last
spring's memory (a gust takes the hat); the feather's thud; the shadow growing (one huge wingbeat, the wheat flattening);
the look up (5.7 s of near silence, then a held drone and the fire crackling high up); the feet landing; "Stay down!";
I stand up; one, two... up (cut). No laugh track, no meme sounds.
Run after any timing change, then mkep + audio2.
"""
import json
E = json.load(open('build/ep121/events.json'))['events']
ep = json.load(open('build/ep121/timeline.json', encoding='utf8'))
spec_p = 'episodes/specs/ep121.json'; spec = json.load(open(spec_p, encoding='utf8'))
s = lambda i: ep['lines'][i]['start']; e = lambda i: ep['lines'][i]['end']; r3 = lambda x: round(x, 3)
cues = []
def cue(t, nm, g, **o): cues.append([str(r3(max(0, t))), nm, g] + ([o] if o else []))
END = ep['duration']
# noon outdoor ambience (birds, distant life) (out while the shadow is overhead on the hook, and from today's halt on)
cue(0, 'suburb', 0.06, dur=s(3) - 0.1); cue(s(5) - 0.05, 'suburb', 0.06, dur=s(12) - s(5))
cue(0, 'wind', 0.05, dur=END)
# L0 the edge sweeps the street; everyone drops
cue(0.2, 'whoosh', 0.12, dur=2.4); cue(0.6, 'rumble', 0.07, dur=2.0)
for k, t in enumerate([1.15, 1.35, 1.6, 1.8, 2.05, 2.3]): cue(t, 'bodyfall', 0.07 - k * 0.004)
# L1 one stayed standing: lifted away
cue(E['rise'] - 0.2, 'riser', 0.08, dur=1.6); cue(E['rise'], 'whoosh', 0.1, dur=1.4)
# L2 a flat wedding, a flat haircut
cue(s(2) + 0.2, 'chime', 0.05, note=84); cue(s(2) + 0.45, 'chime', 0.05, note=88)
cue(E['barber'] + 0.1, 'roomtone', 0.07, dur=s(3) - E['barber']); [cue(E['barber'] + 0.3 + k * 0.22, 'scratch', 0.05) for k in range(5)]
# L3-4 today it stopped over our house: the halt, held breath, the glare
cue(s(3) - 0.1, 'whoosh', 0.12, dur=1.6); cue(E['halt'] - 0.4, 'rumble', 0.1, dur=1.8)
cue(E['halt'], 'sting', 0.1); cue(s(4), 'drone', 0.06, dur=e(4) - s(4) + 0.4); cue(E['glare'], 'shimmer', 0.08, dur=1.0)
# L5 noon: the clock bell; ten breaths then gone
cue(E['noon'], 'towerbell', 0.1); cue(E['cross'], 'whoosh', 0.12, dur=2.4); cue(E['cross'] + 0.3, 'flutter', 0.05, dur=1.6)
# L6 going up for the view; L7 babies drop; L8 no kites; L9 hotter
cue(E['getup'] + 0.2, 'clunk', 0.04); cue(E['getup'] + 0.8, 'chirp', 0.04)
cue(E['drop7'] + 0.12, 'bodyfall', 0.07); cue(E['drop7'] + 0.85, 'bodyfall', 0.08)
cue(s(8) + 0.3, 'suburb', 0.05, dur=1.6)
cue(s(9), 'hum', 0.05, dur=e(9) - s(9) + 0.3); cue(E['fan'] + 0.1, 'swish', 0.04); cue(E['fan'] + 0.5, 'swish', 0.04)
# L10-11 today: Pip; one, two, flat
cue(E['step'] + 1.0, 'creak', 0.06); cue(E['flat'] - 0.9, 'whoosh', 0.1, dur=1.4)
cue(E['flat'] + 0.12, 'bodyfall', 0.1); cue(E['flat'] + 0.3, 'bodyfall', 0.09); cue(E['flat'] + 0.45, 'bodyfall', 0.08)
# L12 ten breaths, twenty, a hundred: still here (no insects now; a heartbeat)
cue(s(12), 'heartbeat', 0.07, dur=e(12) - s(12)); cue(E['still'], 'rumble', 0.06, dur=2.0)
cue(s(13), 'drone', 0.05, dur=s(18) - s(13))
# L15 one o'clock
cue(E['one13'], 'towerbell', 0.08)
# L17 Mr. Abara since Tuesday (a small snore-like groan)
cue(s(17) + 1.2, 'groan', 0.04); cue(s(17) + 2.6, 'groan', 0.035)
# L18 the edge: grass smoking (crackle grows on from here)
cue(s(18), 'crackle', 0.06, dur=s(20) - s(18)); cue(s(18) + 0.2, 'wind', 0.04, dur=3.0)
# L20 last spring (memory): a gust takes his hat; he goes up
cue(s(20) - 0.1, 'shimmer', 0.06, dur=1.0); cue(E['gust'], 'wind', 0.1, dur=2.4); cue(E['gust'] + 0.1, 'whoosh', 0.08, dur=1.2)
cue(s(21), 'crackle', 0.05, dur=s(22) - s(21)); cue(s(22) - 0.3, 'riser', 0.06, dur=2.2)
# L23-25 something drops: the feather; the burnt tips
cue(E['drop23'] - 1.2, 'whoosh', 0.1, dur=1.1); cue(E['drop23'], 'impact', 0.13); cue(E['drop23'] + 0.05, 'dustglitter', 0.06, dur=1.4)
cue(E['drop23'] + 0.3, 'crackle', 0.07, dur=s(26) - E['drop23'])
# L26 the shadow grows: one huge wingbeat, the wheat flattening, coming down
cue(E['grow'] - 0.2, 'whoosh', 0.16, dur=1.8); cue(E['grow'], 'thunder', 0.07); cue(E['grow'] + 0.2, 'wind', 0.14, dur=3.4)
cue(E['down'] - 0.2, 'rumble', 0.14, dur=2.4); cue(s(26), 'heartbeat', 0.08, dur=s(30) - s(26) + 0.4)
# L27-29 flatter, Pip; is it hungry; I don't know
cue(s(27) + 0.1, 'bodyfall', 0.06); cue(s(28), 'wind', 0.05, dur=3.4)
# L30 so I look up: she rolls over; then 5.7 s of near silence: a held drone, fire high up, embers
cue(E['roll'], 'scrape', 0.04, dur=0.6); cue(e(30) - 0.2, 'riser', 0.05, dur=1.0)
cue(E['pov'], 'drone', 0.08, dur=s(34) - E['pov']); cue(E['pov'] + 0.5, 'crackle', 0.06, dur=END - E['pov'] - 0.5)
cue(E['pov'] + 1.2, 'shimmer', 0.07, dur=3.0); cue(E['pov2'], 'flutter', 0.04, dur=2.2)
# L31-33 it isn't hunting us; the sun; burning
cue(E['sunfill'], 'shimmer', 0.08, dur=2.4); cue(E['burn'], 'crackle', 0.09, dur=2.6); cue(E['burn'] + 0.2, 'firewall', 0.05, dur=2.0)
# L34-35 he was calling us (memory)
cue(E['mem3'] - 0.1, 'shimmer', 0.06, dur=2.0); cue(E['mem4'], 'chime', 0.05, note=79); cue(E['mem4'] + 0.4, 'chime', 0.05, note=84)
# L36 its feet: down into the street, open
cue(E['feet'], 'whoosh', 0.14, dur=1.6); cue(E['feet'] + 1.95, 'stomp', 0.16); cue(E['feet'] + 2.0, 'rumble', 0.12, dur=1.6)
cue(E['feet'] + 2.05, 'dustglitter', 0.06, dur=1.4); cue(E['open36'], 'creak', 0.1); cue(E['open36'] + 0.5, 'creak', 0.08)
# L37 stay down! L38 we lie down. L39 I stand up. L40 one, two... up (cut)
cue(s(37) - 0.1, 'scarehit', 0.08); cue(s(38), 'drone', 0.06, dur=s(39) - s(38))
cue(E['stand'], 'scrape', 0.06, dur=0.7); cue(E['stand'] + 0.2, 'riser', 0.08, dur=E['up'] - E['stand'])
cue(E['reach'], 'heartbeat', 0.08, dur=E['up'] - E['reach']); cue(E['up'] + 0.3, 'whoosh', 0.12, dur=0.5)
spec['sound'] = {'key': 57, 'music_gain': 0.3,
  'music': [['0', 'tender'], [str(r3(s(3) - 0.15)), 'silence'], [str(r3(s(5) - 0.1)), 'tender'], [str(r3(s(10) - 0.1)), 'tender_hope'],
            [str(r3(s(12) - 0.1)), 'silence'], [str(r3(s(13) - 0.1)), 'dread'], [str(r3(s(20) - 0.1)), 'mystery'], [str(r3(s(23) - 0.1)), 'suspense'],
            [str(r3(s(30) + 0.6)), 'silence'], [str(r3(E['gold'] - 0.2)), 'cosmic'], [str(r3(s(36) - 0.1)), 'dread'],
            [str(r3(s(38) - 0.1)), 'silence'], [str(r3(E['stand'])), 'cosmic']], 'cues': cues}
json.dump(spec, open(spec_p, 'w', encoding='utf8', newline='\n'), indent=1, ensure_ascii=False); print(len(cues), 'cues')
