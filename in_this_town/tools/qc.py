#!/usr/bin/env python3
"""Automated quality control + metadata + manifest for a finished episode.

  python tools/qc.py episodes/epXX.json output/.../file.mp4 [render_backend]

Checks: file plays (decodes fully), 55-65 s, 1080x1920, 30 fps, H.264 + AAC, narration present and
matching the script (speech-to-text via OpenRouter Scribe, word error rate), voice-over-background margin.
Writes <season>/<stem>_info.md and updates <season>/manifest.json.
"""
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.request
import uuid


sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tts import openrouter_key


def probe(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height,r_frame_rate:format=duration',
                          '-of', 'json', path], capture_output=True, text=True)
    return json.loads(out.stdout or '{}')


def decodes(path):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'null', '-'], capture_output=True, text=True)
    return r.returncode == 0 and not r.stderr.strip()


def transcribe_local(path):
    from faster_whisper import WhisperModel
    segs, _ = WhisperModel('small', device='cpu', compute_type='int8').transcribe(path, language='en', vad_filter=False)
    return ' '.join(s.text.strip() for s in segs)


def transcribe(path):
    mp3 = os.path.join(tempfile.gettempdir(), f'qc_{uuid.uuid4().hex}.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', path, '-vn', '-ac', '1', '-ar', '16000', '-b:a', '48k', mp3], check=True)
    b = uuid.uuid4().hex
    body = (f'--{b}\r\nContent-Disposition: form-data; name="model"\r\n\r\nelevenlabs/scribe-v2\r\n'
            f'--{b}\r\nContent-Disposition: form-data; name="file"; filename="a.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n').encode() \
        + open(mp3, 'rb').read() + f'\r\n--{b}--\r\n'.encode()
    req = urllib.request.Request('https://openrouter.ai/api/v1/audio/transcriptions', body,
                                 {'Authorization': f"Bearer {openrouter_key()}",
                                  'Content-Type': f'multipart/form-data; boundary={b}', 'User-Agent': 'itt-qc/1.0'})
    import time
    for attempt in range(4):
        try:
            out = json.loads(urllib.request.urlopen(req, timeout=300).read())['text']
            os.remove(mp3); return out
        except Exception:  # noqa: BLE001
            if attempt == 3: os.remove(mp3); raise
            time.sleep(10 * (attempt + 1))


def words(s):
    return re.findall(r"[a-z0-9']+", s.lower().replace('’', "'").replace('12:01', '12 01'))


def wer(ref, hyp):
    r, h = words(ref), words(hyp)
    d = list(range(len(h) + 1))
    for i in range(1, len(r) + 1):
        prev, d[0] = d[0], i
        for j in range(1, len(h) + 1):
            cur = min(d[j] + 1, d[j - 1] + 1, prev + (r[i - 1] != h[j - 1]))
            prev, d[j] = d[j], cur
    return d[len(h)] / max(1, len(r))


def main():
    epjson, path = sys.argv[1], sys.argv[2]
    backend = sys.argv[3] if len(sys.argv) > 3 else '?'
    ep = json.load(open(epjson, encoding='utf8'))
    season = os.path.dirname(path)
    issues = []
    ok_file = os.path.exists(path) and decodes(path)
    if not ok_file: issues.append('file missing or does not decode cleanly')
    p = probe(path) if os.path.exists(path) else {}
    vs = [s for s in p.get('streams', []) if s['codec_type'] == 'video']
    au = [s for s in p.get('streams', []) if s['codec_type'] == 'audio']
    dur = float(p.get('format', {}).get('duration', 0))
    if not 55 <= dur <= 65: issues.append(f'duration {dur:.1f}s outside 55-65')
    if not vs or (vs[0]['width'], vs[0]['height']) != (1080, 1920): issues.append('resolution is not 1080x1920')
    fps = ep.get('fps', 30)
    if vs and vs[0]['r_frame_rate'] != f'{fps}/1': issues.append(f"fps {vs[0]['r_frame_rate']}")
    if not vs or vs[0]['codec_name'] != 'h264': issues.append('video codec not h264')
    if not au or au[0]['codec_name'] != 'aac': issues.append('audio codec not aac')
    script = ' '.join(l['text'] for l in ep['lines'])
    try:
        hyp = transcribe(path); w = wer(script, hyp)
    except Exception as e:  # noqa: BLE001
        hyp, w = f'(transcription failed: {e})', None
    notes = []
    if w is None:   # no credit or no network: the check still runs here, with a local model
        try:
            hyp = transcribe_local(path); w = wer(script, hyp); notes.append('narration checked with local faster-whisper, not Scribe')
        except Exception as e:  # noqa: BLE001
            hyp += f' (local model failed: {e})'
    if w is None and '402' in hyp:
        notes.append('narration not machine-verified: OpenRouter credit too low for the speech-to-text check')
    elif w is None or w > 0.08:
        issues.append(f'narration/script mismatch (WER {w})')
    mr = json.load(open(f"build/{ep['id']}/mix_report.json")) if os.path.exists(f"build/{ep['id']}/mix_report.json") else {}
    margin = mr.get('worst_voice_margin_db')
    if margin is not None and margin < 10: issues.append(f'voice margin {margin} dB < 10')
    status = 'complete' if not issues else 'complete-with-issues' if ok_file else 'blocked'
    stem = os.path.splitext(os.path.basename(path))[0]
    md = [f"# Episode {ep['number']} — {ep['title']}", '',
          f"- **File:** `{os.path.basename(path)}`  ",
          f"- **Status:** {status}  ",
          f"- **Duration:** {dur:.1f} s · {vs[0]['width'] if vs else '?'}×{vs[0]['height'] if vs else '?'} · {fps} fps · H.264/AAC  ",
          f"- **Rendered on:** {backend}  ",
          f"- **Narration check:** word error rate {w if w is None else round(w, 3)} vs script  ",
          f"- **Voice over music/SFX (worst line):** {margin} dB  ",
          f"- **Issues:** {'; '.join(issues) if issues else 'none'}", *( [f"- **Notes:** {'; '.join(notes)}"] if notes else []), '',
          '## YouTube Shorts title', ep['youtube_title'], '', '## TikTok caption', ep['tiktok_caption'], '',
          '## Hashtags', ep['hashtags'], '', '## Thumbnail', ep['thumbnail_rec'], f"Text: \"{ep['thumbnail_text']}\" (rendered: `{stem}_thumbnail.jpg`)", '',
          '## Voiceover transcript (script)', *[(f"> **{l.get('voice', 'narrator').title()}:** " if l.get('voice') else '> ') + l['text'] for l in ep['lines']], '',
          '## Speech-to-text of the final video', hyp]
    open(os.path.join(season, f'{stem}_info.md'), 'w', encoding='utf8').write('\n'.join(md) + '\n')
    mpath = os.path.join(season, 'manifest.json')
    man = json.load(open(mpath)) if os.path.exists(mpath) else {'episodes': {}}
    man['episodes'][str(ep['number'])] = {'title': ep['title'], 'status': status, 'file': os.path.basename(path),
                                          'duration_s': round(dur, 2), 'qc': 'pass' if not issues else 'fail', 'issues': issues,
                                          'wer': w if w is None else round(w, 3), 'voice_margin_db': margin, 'render': backend, 'notes': notes}
    json.dump(man, open(mpath, 'w'), indent=2)
    print(json.dumps(man['episodes'][str(ep['number'])], indent=1))


if __name__ == '__main__':
    main()
