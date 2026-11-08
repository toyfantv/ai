#!/usr/bin/env python3
"""Episode 38: write the spec's sound block from the director's events (build/ep38/events.json).

A quiet bedroom and a laptop's hum; tape hiss under everything seen on the recording; silence before each scare and the hit in a gap in
the narration; the slam, then three knocks alone in the room. Re-run after any timing change, then mkep + audio2.
Usage: python tools/ep38_sound.py   (then: python tools/mkep.py episodes/specs/ep38.json episodes/ep38_tomorrow_recording.json; python tools/audio2.py episodes/ep38_tomorrow_recording.json)
"""
import json

E = json.load(open('build/ep38/events.json'))['events']
ep = json.load(open('build/ep38/timeline.json', encoding='utf8'))
spec_p = 'episodes/specs/ep38.json'
spec = json.load(open(spec_p, encoding='utf8'))
r3 = lambda x: round(x, 3)
s = lambda i: ep['lines'][i]['start']
e = lambda i: ep['lines'][i]['end']
cues = []
def cue(t, nm, g, **o): cues.append([str(r3(t)), nm, g] + ([o] if o else []))

# the room at night, the laptop's fan; the click on the trackpad
cue(0, 'roomtone', 0.2, dur=E['cut'] - 0.1); cue(0, 'hum', 0.07, dur=E['cut'], f=118)
cue(E['click'], 'clunk', 0.2, seed=3); cue(E['click'] + 0.05, 'flick', 0.1, seed=4)

# the recording: tape hiss, a corridor's hum, the door, his steps, a sob he doesn't know he's making
cue(E['feed0'], 'static', 0.075, dur=E['cut'] - E['feed0']); cue(E['feed0'], 'hum', 0.1, dur=E['cut'] - E['feed0'], f=60)
cue(E['feed0'], 'drone', 0.12, dur=E['cut'] - E['feed0'], f=44)
cue(E['doorOpen'], 'creak', 0.5, dur=1.9, seed=11)
cue(E['out'] + 0.1, 'footsteps', 0.3, dur=s(7) - 0.3 - E['out'], rate=1.1, seed=7)
cue(s(7) - 0.7, 'sample', 0.34, name='e_sob')
# cut to black: the tape stops dead
cue(E['cut'], 'clunk', 0.42, seed=15); cue(E['cut'], 'flick', 0.26, seed=16)

# morning, birds; the phone
cue(E['morn'] + 0.05, 'chirp', 0.16, dur=E['night'] - E['morn'] - 0.6); cue(E['morn'] + 0.05, 'suburb', 0.14, dur=E['night'] - E['morn'] - 0.3)
cue(s(10) - 0.28, 'phonebuzz', 0.46); cue(s(12) + 0.12, 'pop', 0.2)

# that night: the room is wrong. The door changes; the digits land one at a time
cue(E['night'], 'roomtone', 0.18, dur=E['TS'] - E['night'], seed=9); cue(E['night'], 'drone', 0.14, dur=E['S1'] - 0.7 - E['night'], f=41)
cue(E['swap'] - 0.3, 'creak', 0.4, dur=1.3, seed=21); cue(E['swap'], 'groan', 0.2, dur=1.8, seed=2)
for k, d in enumerate(E['dig']):
    cue(d, 'clunk', 0.42, seed=31 + k); cue(d + 0.01, 'ding', 0.07 + k * 0.02)
cue(E['back0'], 'footsteps', 0.32, dur=E['back1'] - E['back0'], rate=1.4, seed=13)

# the laptop starts by itself; hiss builds under the second recording
cue(E['lit'], 'static', 0.26, dur=0.3); cue(E['lit'] + 0.05, 'flick', 0.26, seed=23)
cue(E['lit'] + 0.25, 'static', 0.075, dur=E['S1'] - 0.75 - E['lit']); cue(s(19), 'heartbeat', 0.24, dur=E['S1'] - 0.72 - s(19), bpm=70)
cue(s(20), 'whisper', 0.1, dur=E['S1'] - 0.72 - s(20))

# scare 1, in the gap: tape, a held beat of nothing, the figure
cue(E['S1'] - 0.1, 'whoosh', 0.56, dur=0.18); cue(E['S1'] - 0.01, 'scarehit', 0.98, dur=2.2); cue(E['S1'] + 0.01, 'glitch', 0.5, dur=0.34); cue(E['S1'] + 0.03, 'groan', 0.3, dur=1.6, seed=5)
cue(E['turn'], 'swish', 0.36)
# nothing behind him: only the room
cue(s(23) - 0.1, 'static', 0.05, dur=s(24) - s(23))
# closer, and closer: each jump a tear in the tape; the heart climbs, then stops before the face
cue(s(24) - 0.1, 'glitch', 0.42, dur=0.3); cue(s(24) - 0.1, 'static', 0.11, dur=E['S2'] - 0.62 - s(24) + 0.1)
cue(s(25) - 0.1, 'glitch', 0.54, dur=0.32); cue(s(24), 'heartbeat', 0.32, dur=E['S2'] - 0.62 - s(24), bpm=118); cue(s(26), 'whisper', 0.16, dur=E['S2'] - 0.62 - s(26), seed=4)
# scare 2, in the gap
cue(E['S2'] - 0.12, 'whoosh', 0.7, dur=0.18); cue(E['S2'] - 0.01, 'scarehit', 0.98, dur=1.5); cue(E['S2'] + 0.02, 'glitch', 0.66, dur=0.4); cue(E['S2'] + 0.03, 'groan', 0.26, dur=1.3, seed=8)
cue(E['S2'] + 0.25, 'static', 0.06, dur=E['TS'] - E['S2'] - 0.25)

# the slam cuts everything; the room, and the knocks by themselves
cue(E['TS'], 'doorboom', 0.62, seed=44); cue(E['TS'] + 0.01, 'clunk', 0.5, seed=45)
cue(E['TS'] + 0.5, 'roomtone', 0.12, dur=E['end'] - E['TS'] - 0.6, seed=17)
for k, c in enumerate(E['knocks']): cue(c, 'knock', 0.74 + k * 0.08)

# the door, slowly; a small hotel bell, far off, on the last frame's held beat
cue(E['opn'], 'creak', 0.5, dur=3.2, seed=52); cue(E['opn'] - 0.1, 'drone', 0.16, dur=E['end'] - E['opn'] + 0.1, f=38); cue(E['opn'] + 0.5, 'wind', 0.1, dur=E['end'] - E['opn'] - 0.6)
cue(E['end'] - 1.25, 'ding', 0.14)

spec['sound'] = {'key': 38, 'music_gain': 0.2,
                 'music': [['0', 'mystery'], [str(r3(E['cut'])), 'silence'], [str(r3(E['morn'] + 0.3)), 'mystery'], [str(r3(E['night'])), 'dread'],
                           [str(r3(E['S1'] - 0.7)), 'silence'], [str(r3(E['S1'] + 0.25)), 'dread'], [str(r3(s(22) - 0.2)), 'silence'], [str(r3(s(24) - 0.1)), 'suspense'],
                           [str(r3(E['S2'] - 0.62)), 'silence'], [str(r3(E['S2'] + 0.3)), 'silence'], [str(r3(E['TS'])), 'silence'], [str(r3(E['opn'])), 'dread']],
                 'cues': cues}
json.dump(spec, open(spec_p, 'w', encoding='utf8', newline='\n'), indent=1, ensure_ascii=False)
print(len(cues), 'cues')
