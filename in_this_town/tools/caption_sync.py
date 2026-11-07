#!/usr/bin/env python3
"""Moves each caption chunk onto the moment its first word is spoken (faster-whisper word times, runs locally).
tts.py spreads chunks across a line by word length, which drifts on lines with pauses or numbers.
  python tools/caption_sync.py episodes/epXX.json        # rewrites build/<id>/timeline.json; run after tts.py, before frames
A line whose words the model hears differently is mapped by word position, so a misheard word costs nothing."""
import json, sys
from faster_whisper import WhisperModel


def main():
    ep = json.load(open(sys.argv[1], encoding='utf8'))
    p = f"build/{ep['id']}/timeline.json"
    tl = json.load(open(p, encoding='utf8'))
    model = WhisperModel('small', device='cpu', compute_type='int8')
    caps, moved = tl['captions'], []
    for ln in tl['lines']:
        mine = [c for c in caps if ln['start'] - 0.01 <= c['start'] < ln['end'] - 0.01]
        if len(mine) < 2: continue
        segs, _ = model.transcribe(ln['file'], language='en', word_timestamps=True, condition_on_previous_text=False)   # an initial_prompt loses words
        words = [w for s in segs for w in s.words if not w.word.strip().startswith('.')]   # "p" ".m." is one word
        if not words: continue
        n = sum(len(c['text'].split()) for c in mine)
        i = 0
        for c in mine:
            k = min(len(words) - 1, round(i * len(words) / n))
            t = round(ln['start'] + (words[k].start if i else 0) - (0.04 if i else 0), 3)
            moved.append(abs(t - c['start'])); c['start'] = t
            i += len(c['text'].split())
    for a, b in zip(caps, caps[1:]):
        a['end'] = round(min(b['start'], max(a['start'] + 0.5, a['end'] + 0.6)), 3)
    json.dump(tl, open(p, 'w', encoding='utf8'), indent=1)
    print(f'{len(moved)} chunks checked, largest move {max(moved, default=0):.2f} s')


if __name__ == '__main__':
    main()
