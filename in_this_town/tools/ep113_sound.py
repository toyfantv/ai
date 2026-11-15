#!/usr/bin/env python3
"""Remake 13 (Don't Picture Him): write the spec's sound block from the director's events (build/ep113/events.json) and the timeline.

A bright town square (suburb bed, soft chimes for the bubbles); the donut drop; the counter's clicks; the dream-void drone for
Mister Stilts; the classroom click and scream; the mayor's PA; the lunchroom; the basket; billboards, boxes, the blimp's hum;
the counter climbing (ticks), the pizza guy's pop; the ladder, the megaphone; the bubbles flipping to tutus; the 200 bell,
the burst, his tap dance, the faint; the party; night crickets and the finger tapping glass.
Run after any timing change, then mkep + audio2.
"""
import json
E = json.load(open('build/ep113/events.json'))['events']
ep = json.load(open('build/ep113/timeline.json', encoding='utf8'))
spec_p = 'episodes/specs/ep113.json'; spec = json.load(open(spec_p, encoding='utf8'))
s = lambda i: ep['lines'][i]['start']; e = lambda i: ep['lines'][i]['end']; r3 = lambda x: round(x, 3)
cues = []
def cue(t, nm, g, **o): cues.append([str(r3(max(0, t))), nm, g] + ([o] if o else []))
END = ep['duration']
# the square: daydream bubbles pop up, the rule, the donut
cue(0, 'suburb', 0.1, dur=s(3) - 0.1)
for k, t in enumerate((0.5, 1.2, 1.9, 2.6)): cue(t, 'pop', 0.08); cue(t + 0.05, 'chime', 0.05, note=[84, 88, 91, 86][k])
for k in range(6): cue(E['swap1'] + k * 0.12, 'pop', 0.07)
cue(E['drop'] - 0.6, 'whoosh', 0.18, dur=0.7); cue(E['drop'], 'impact', 0.3); cue(E['drop'] + 0.05, 'splat', 0.14)
cue(s(2) + 0.2, 'pop', 0.1); cue(s(2) + 0.25, 'chime', 0.06, note=79)
# the dream: Mister Stilts and his hundred eyes
cue(s(3) - 0.1, 'drone', 0.12, dur=s(4) - s(3)); cue(s(3) + 0.1, 'scarehit', 0.16); cue(s(3) + 2.0, 'flutter', 0.1, dur=1.2)
# the tower counts
cue(s(4) - 0.05, 'suburb', 0.08, dur=s(5) - s(4)); cue(s(4) + 0.6, 'towerbell', 0.12)
# class: the click, the scream
cue(s(5) - 0.05, 'roomtone', 0.1, dur=s(7) - s(5)); cue(E['there'], 'pop', 0.12); cue(E['there'] + 0.05, 'chime', 0.06, note=76)
cue(E['click'] + 0.75, 'clunk', 0.2); cue(E['one'] + 0.05, 'beep', 0.08)
cue(E['scream'], 'screams', 0.12, dur=1.4); cue(E['scream'] + 0.1, 'sample', 0.16, name='ohno', rev=0.3, wet=0.1)
# the mayor
cue(s(7) - 0.05, 'suburb', 0.08, dur=s(8) - s(7)); cue(s(7) - 0.2, 'ding', 0.08); cue(s(7) + 0.9, 'pop', 0.1)
# forty; lunch; the basket
cue(E['forty'], 'clunk', 0.16); cue(E['forty'] + 0.3, 'tick', 0.06, dur=0.5, rate=6)
cue(E['blamed'] - 0.1, 'roomtone', 0.1, dur=E['mom'] - E['blamed']); cue(E['blamed'] + 0.4, 'groan', 0.06)
cue(E['mom'] - 0.25, 'roomtone', 0.1, dur=s(9) - E['mom'] + 0.25); cue(E['mom'] + 0.9, 'swish', 0.14); cue(E['mom'] + 1.3, 'clunk', 0.12)
cue(E['mom'] + 1.5, 'sample', 0.14, name='gasp', rev=0.3, wet=0.1)
# louder: billboard, boxes, blimp
cue(s(9) - 0.05, 'suburb', 0.08, dur=s(11) - s(9)); cue(s(9) + 0.2, 'stomp', 0.12); cue(E['box'] - 0.1, 'paper', 0.12)
cue(E['blimp'], 'ridehum', 0.08, dur=1.4)
cue(E['c150'], 'clunk', 0.16); cue(E['c150'] + 0.2, 'tick', 0.06, dur=0.4, rate=8)
cue(E['c199'], 'clunk', 0.18); cue(E['c199'] + 0.2, 'heartbeat', 0.12, dur=1.6)
# the pizza guy reads his own box
cue(s(11) - 0.5, 'footsteps', 0.12, dur=1.4, rate=2.0); cue(E['read'], 'paper', 0.08)
cue(E['eyes'], 'pop', 0.2); cue(E['eyes'] + 0.05, 'scarehit', 0.12); cue(E['eyes'] + 0.3, 'clunk', 0.1)
cue(s(12) + 0.3, 'hum', 0.05, dur=2.4)
# the roof, the ladder, the megaphone
cue(E['climb0'], 'footsteps', 0.12, dur=E['climb1'] - E['climb0'], rate=2.4); cue(E['climb1'] + 0.1, 'clunk', 0.1)
cue(s(14) - 0.6, 'buzz', 0.05, dur=1.2)
for k in range(8): cue(E['swap'] + 0.15 * k, 'pop', 0.07); cue(E['swap'] + 0.15 * k + 0.03, 'chime', 0.04, note=[84, 88, 91, 86, 93, 89, 96, 91][k])
# two hundred: he walks out, in a tutu
cue(E['two'] - 0.6, 'riser', 0.12, dur=0.6); cue(E['two'], 'towerbell', 0.16); cue(E['two'] + 0.05, 'clunk', 0.18)
cue(E['appear'], 'boom', 0.18); cue(E['appear'] + 0.05, 'dustglitter', 0.16, dur=2.2); cue(E['appear'] + 0.3, 'shimmer', 0.1, dur=2.0)
cue(E['appear'] + 1.0, 'crowdsteps', 0.06, dur=2.5)
# the tap dance, the faint
for k in range(14): cue(s(16) + 0.2 + k * 0.17, 'tick', 0.1, dur=0.05, rate=2)
cue(E['faint'] - 0.15, 'sample', 0.16, name='faint', rev=0.3, wet=0.1); cue(E['faint'] + 0.3, 'bodyfall', 0.16)
# birthday parties
cue(s(17) - 0.05, 'suburb', 0.08, dur=s(18) - s(17)); cue(s(17) + 0.3, 'applause', 0.08, dur=2.2); cue(s(17) + 0.5, 'sample', 0.12, name='hehe', rev=0.3, wet=0.1)
for k in range(4): cue(s(17) + 0.6 + k * 0.4, 'pop', 0.06)
# night: crickets, the finger on the glass
cue(s(18) - 0.05, 'roomtone', 0.1, dur=END - s(18) + 0.05)
for t, f in ((s(18) + 0.3, 4400), (s(18) + 1.4, 4700), (s(18) + 3.0, 4500), (s(18) + 4.4, 4600)): cue(t, 'chirp', 0.04, f=f)
for k in range(3): cue(E['tap'] + k * 0.29, 'knock', 0.12)
cue(s(18) + 2.4, 'pop', 0.08); cue(s(18) + 2.45, 'chime', 0.06, note=88)
spec['sound'] = {'key': 60, 'music_gain': 0.3,
  'music': [['0', 'playful'], [str(r3(s(3) - 0.1)), 'mystery'], [str(r3(s(5) - 0.1)), 'playful'], [str(r3(s(6) + 0.6)), 'suspense'],
            [str(r3(s(10) - 0.1)), 'dread'], [str(r3(s(13) - 0.1)), 'action'], [str(r3(s(15) - 0.1)), 'carousel'],
            [str(r3(s(18) - 0.1)), 'musicbox']], 'cues': cues}
json.dump(spec, open(spec_p, 'w', encoding='utf8', newline='\n'), indent=1, ensure_ascii=False); print(len(cues), 'cues')
