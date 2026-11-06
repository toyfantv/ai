#!/usr/bin/env python3
"""Cue-driven score + sound design + voice-first mix (Episodes 7+).

Usage: python tools/audio2.py episodes/epXX.json
The episode JSON has a "sound" block:
  "music": [[time, mood], ...]       moods: wonder, mystery, playful, suspense, dread, cosmic, silence
  "cues":  [[time, sfx, gain, {opts}], ...]
Times: "0", "L3" (start of line 3), "L3e" (end of line 3), "ev:name" (director event), each with optional "+x"/"-x".
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
from audio import (SR, Track, tt, lp, hp, bp, env_adsr, reverb, pad, bell, whale, noise, impact, water_whoosh,  # noqa: E402
                   footstep, heartbeat, crackle, glass_pings, hz)
import numpy as np  # noqa: E402
import soundfile as sf  # noqa: E402
from scipy.signal import resample_poly  # noqa: E402

rng = np.random.default_rng(11)


# ---------- extra sfx ----------
def tick(d=4.0, rate=1.0):
    x = np.zeros(int(d * SR)); t = 0.0; k = 0
    while t < d - 0.05:
        n = int(0.025 * SR); c = bp(noise(0.025), 2500, 7000) * np.exp(-np.linspace(0, 9, n)) * (1.0 if k % 2 == 0 else 0.7)
        i = int(t * SR); x[i:i + n] += c; t += 1.0 / rate / 2; k += 1
    return x


def creak(d=1.6):
    t = tt(d); f = 180 + 90 * np.sin(2 * np.pi * 0.7 * t) + 40 * np.sin(2 * np.pi * 3.1 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    saw = 2 * (ph / (2 * np.pi) % 1) - 1
    x = bp(saw * (0.5 + 0.5 * (np.sin(2 * np.pi * 23 * t) > 0)), 300, 2500)
    return reverb(x * np.sin(np.pi * t / d), 1.2, 0.3)


def wind(d=6.0):
    x = noise(d); t = tt(d)
    a = bp(x, 300, 900) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.13 * t)) + bp(x, 900, 2400) * 0.3 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.21 * t + 1))
    return a * env_adsr(len(a), 1.0, 1.0)


def rumble(d=6.0):
    x = lp(noise(d, 'brown'), 70) + 0.3 * np.sin(2 * np.pi * 33 * tt(d))
    return x * env_adsr(len(x), 1.0, 1.0)


def glitch(d=1.5, seed=3):
    r = np.random.default_rng(seed); x = np.zeros(int(d * SR)); t = 0.0
    while t < d - 0.05:
        n = int(r.uniform(0.01, 0.08) * SR); kind = r.integers(3); seg = np.arange(n) / SR
        if kind == 0: s = np.sign(np.sin(2 * np.pi * r.uniform(200, 2000) * seg)) * 0.6
        elif kind == 1: s = r.standard_normal(n) * 0.7
        else: s = np.sin(2 * np.pi * r.uniform(50, 120) * seg) * 0.9
        i = int(t * SR); m = min(n, len(x) - i); x[i:i + m] += s[:m]; t += n / SR + r.uniform(0, 0.05)
    return hp(x, 60)


def whisper(d=3.0, seed=5):
    x = bp(noise(d), 1800, 6500); t = tt(d)
    r = np.random.default_rng(seed); e = np.zeros_like(t)
    for _ in range(int(d * 3)):
        c = r.uniform(0, d); w = r.uniform(0.1, 0.35); e += np.exp(-((t - c) / w) ** 2)
    return reverb(x * np.clip(e, 0, 1), 2.0, 0.6)


def shimmer(d=2.5, seed=2):
    r = np.random.default_rng(seed); x = np.zeros(int(d * SR) + SR * 2)
    notes = [86, 88, 90, 93, 95, 98, 100]
    for _ in range(int(d * 8)):
        i = int(r.uniform(0, d) * SR); b = bell(hz(notes[r.integers(len(notes))]), 1.5) * r.uniform(0.2, 0.6)
        x[i:i + len(b)] += b
    return reverb(x, 2.5, 0.5)


def school_bell(d=2.5):
    t = tt(d); x = np.sin(2 * np.pi * 1200 * t) * (np.sin(2 * np.pi * 22 * t) > 0) + 0.5 * np.sin(2 * np.pi * 2400 * t)
    return bp(x, 600, 5000) * env_adsr(len(t), 0.01, 0.2) * 0.6


def ding():
    return reverb(bell(hz(84), 2.0) + 0.7 * bell(hz(80), 2.0), 1.2, 0.3)


def hum(d=5.0, f=60):
    t = tt(d); x = np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * 2 * f * t) + 0.15 * bp(noise(d), 200, 800)
    return x * env_adsr(len(t), 0.5, 0.5)


def horn(d=2.2):
    t = tt(d); x = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (277, 349, 415)) / 3
    return reverb(lp(x, 2500) * env_adsr(len(t), 0.08, 0.5), 2.5, 0.4)


def chug(d=4.0, rate=3.0):
    x = np.zeros(int(d * SR)); t = 0.0
    while t < d - 0.2:
        n = int(0.15 * SR); s = lp(noise(0.15), 900) * np.exp(-np.linspace(0, 6, n)); i = int(t * SR); x[i:i + n] += s; t += 1 / rate
    return x + 0.3 * lp(noise(d, 'brown'), 120)


def water_rush(d=4.0):
    x = noise(d); t = tt(d)
    y = lp(x, 1800) * 0.6 + bp(x, 1800, 6000) * 0.25
    return y * np.minimum(1, t / (d * 0.3)) * env_adsr(len(t), 0.05, 0.6)


def scream_chorus(d=2.5, seed=7):
    r = np.random.default_rng(seed); t = tt(d); x = np.zeros_like(t)
    for _ in range(9):
        f0 = r.uniform(700, 1500); f = f0 * (1 + 0.04 * np.sin(2 * np.pi * r.uniform(5, 9) * t)) * (1 + 0.3 * t / d)
        ph = 2 * np.pi * np.cumsum(f) / SR; x += np.sin(ph) + 0.3 * np.sin(2 * ph)
    x = bp(x, 500, 5000) / 9 * env_adsr(len(t), 0.15, 0.6)
    return reverb(x, 2.0, 0.5)


def sting(d=3.0):
    s = sum(np.sin(2 * np.pi * f * tt(d)) for f in (880, 932.3, 1396.9)) / 3
    return reverb(s * env_adsr(len(s), 0.03, 2.2), 2.5, 0.5)


def riser(d=3.0):
    t = tt(d); f = 80 * (1 + 5 * (t / d) ** 2)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * bp(noise(d), 500, 4000) * (t / d)
    return x * (t / d) ** 1.5


def stomp():
    return impact(1.4, 70, 35, 0.5)


def groan(d=3.5):
    t = tt(d); f = 55 + 10 * np.sin(2 * np.pi * 0.4 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.tanh(2 * (np.sin(ph) + 0.6 * np.sin(2.01 * ph) + 0.3 * np.sin(3.02 * ph)))
    return reverb(lp(x, 600) * env_adsr(len(t), 0.6, 1.0), 3.0, 0.5)


def pop():
    t = tt(0.25); return np.sin(2 * np.pi * (900 - 2400 * t) * t) * np.exp(-t * 25)


def whoosh(d=1.2):
    return water_whoosh(d)


def footsteps(d=2.0, rate=2.2):
    x = np.zeros(int(d * SR)); t = 0.0; k = 0
    while t < d - 0.1:
        s = footstep(); i = int(t * SR); x[i:i + len(s)] += s[: len(x) - i] * (1 if k % 2 else 0.8); t += 1 / rate; k += 1
    return x


def heartbeats(d=4.0, bpm=90):
    x = np.zeros(int(d * SR) + SR); t = 0.0
    while t < d:
        s = heartbeat(); i = int(t * SR); x[i:i + len(s)] += s; t += 60 / bpm
    return x[: int(d * SR)]


SFX = {
    'impact': lambda o: impact(o.get('dur', 3.0), 100, 28, 0.7), 'boom': lambda o: impact(4.0, 130, 22, 1.1),
    'stomp': lambda o: stomp(), 'whoosh': lambda o: whoosh(o.get('dur', 1.2)), 'shimmer': lambda o: shimmer(o.get('dur', 2.5)),
    'chime': lambda o: reverb(bell(hz(o.get('note', 88)), 2.5), 2.0, 0.4), 'footsteps': lambda o: footsteps(o.get('dur', 2.0), o.get('rate', 2.2)),
    'run': lambda o: footsteps(o.get('dur', 2.0), 8.5), 'heartbeat': lambda o: heartbeats(o.get('dur', 4.0), o.get('bpm', 90)),
    'creak': lambda o: creak(o.get('dur', 1.6)), 'wind': lambda o: wind(o.get('dur', 6.0)), 'rumble': lambda o: rumble(o.get('dur', 6.0)),
    'glitch': lambda o: glitch(o.get('dur', 1.5), o.get('seed', 3)), 'whisper': lambda o: whisper(o.get('dur', 3.0)),
    'crackle': lambda o: reverb(crackle(o.get('dur', 2.0), o.get('density', 60)), 1.5, 0.3), 'glass': lambda o: reverb(glass_pings(o.get('dur', 2.0), 30), 2.0, 0.4),
    'tick': lambda o: tick(o.get('dur', 4.0), o.get('rate', 1.0)), 'bell': lambda o: school_bell(o.get('dur', 2.5)), 'ding': lambda o: ding(),
    'hum': lambda o: hum(o.get('dur', 5.0), o.get('f', 60)), 'horn': lambda o: horn(o.get('dur', 2.2)), 'chug': lambda o: chug(o.get('dur', 4.0), o.get('rate', 3.0)),
    'water': lambda o: water_rush(o.get('dur', 4.0)), 'screams': lambda o: scream_chorus(o.get('dur', 2.5)), 'sting': lambda o: sting(o.get('dur', 3.0)),
    'riser': lambda o: riser(o.get('dur', 3.0)), 'groan': lambda o: groan(o.get('dur', 3.5)), 'pop': lambda o: pop(),
    'whale': lambda o: whale(3.2, o.get('f0', 160), o.get('f1', 380), o.get('f2', 220)),
}


# ---------- music moods ----------
def mood(name, d, key=50, seed=1):
    r = np.random.default_rng(seed)
    out = np.zeros(int(d * SR) + 3 * SR)
    def add(i, s, g=1.0):
        out[i:i + len(s)] += s[: len(out) - i] * g
    if name == 'silence':
        return out[: int(d * SR)]
    if name in ('wonder', 'playful'):
        add(0, pad([hz(key + n) for n in (0, 7, 12, 16, 19)], d + 0.5, a=0.3, r=1.0, bright=2400), 0.5)
        pent = [key + 24 + n for n in (0, 2, 4, 7, 9, 12, 14, 16)]
        t = 0.2; step = 0.32 if name == 'wonder' else 0.22
        while t < d:
            add(int(t * SR), bell(hz(pent[r.integers(len(pent))]), 2.0), 0.15); t += step + r.random() * 0.2
        if name == 'playful':
            t = 0.0
            while t < d: add(int(t * SR), impact(0.4, 90, 60, 0.0), 0.12); t += 0.5
    elif name == 'mystery':
        add(0, pad([hz(key + n) for n in (0, 3, 7, 10, 14)], d + 0.5, a=0.8, r=1.0, bright=1500), 0.45)
        notes = [key + 24 + n for n in (0, 3, 7, 10, 12, 15)]
        t = 0.4
        while t < d: add(int(t * SR), bell(hz(notes[r.integers(len(notes))]), 2.5), 0.1); t += 0.7 + r.random() * 0.4
    elif name == 'suspense':
        p = pad([hz(key - 12 + n) for n in (0, 1, 7, 13)], d + 0.5, a=1.2, r=0.6, bright=1100, detune=0.01)
        add(0, p * np.linspace(0.5, 1.0, len(p)), 0.5)
        t = 0.5
        while t < d: add(int(t * SR), impact(0.6, 60, 40, 0.0), 0.16); t += 0.75 - 0.3 * (t / d)
    elif name == 'dread':
        add(0, pad([hz(key - 17 + n) for n in (0, 1, 6, 12)], d + 0.5, a=1.0, r=0.5, bright=600, detune=0.015), 0.6)
        add(0, rumble(d + 0.5), 0.25)
    elif name == 'cosmic':
        add(0, pad([hz(key - 12 + n) for n in (0, 7, 14, 21, 26)], d + 0.5, a=1.5, r=1.0, bright=3000, detune=0.006), 0.45)
        add(0, shimmer(d, seed), 0.2)
    return out[: int(d * SR) + int(1.0 * SR)]


def resolve(ref, TL, EV):
    m = re.match(r'^(L\d+e?|ev:[A-Za-z0-9_]+|[\d.]+)([+-][\d.]+)?$', str(ref))
    base, off = m.group(1), float(m.group(2) or 0)
    if base.startswith('L'):
        i = int(base[1:].rstrip('e')); v = TL['lines'][i]['end' if base.endswith('e') else 'start']
    elif base.startswith('ev:'):
        v = EV[base[3:]]
    else:
        v = float(base)
    return v + off


def main():
    ep = json.load(open(sys.argv[1]))
    d = f"build/{ep['id']}"
    TL = json.load(open(f'{d}/timeline.json'))
    EV = json.load(open(f'{d}/events.json')).get('events', {})
    dur = TL['duration']
    end = EV.get('black', dur)
    music, sfx, voice = Track(dur), Track(dur), Track(dur)
    for ln in TL['lines']:
        a, sr = sf.read(ln['file'])
        a = resample_poly(a, SR, sr)
        rms = np.sqrt(np.mean(a[np.abs(a) > 0.01] ** 2)) if np.any(np.abs(a) > 0.01) else 1.0
        a = np.clip(a * (0.12 / rms), -0.98, 0.98)
        fx = ln.get('fx')
        if fx == 'radio': a = bp(a, 350, 3500); a = np.clip(a * (0.14 / (np.sqrt(np.mean(a[np.abs(a) > 0.005] ** 2)) + 1e-9)), -0.98, 0.98)
        if fx == 'giant': a = reverb(a, 3.0, 0.45)
        if fx == 'whisper': a = reverb(a, 1.6, 0.3)
        if fx == 'chorus':  # a classroom of identical voices: detuned, delayed copies
            from scipy.signal import resample
            layers = [a]
            for k, (rate, dl) in enumerate([(1.04, 0.035), (0.96, 0.06), (1.08, 0.09), (0.93, 0.12)]):
                y = resample(a, int(len(a) / rate)); y = np.concatenate([np.zeros(int(dl * SR)), y])
                layers.append(y * 0.7)
            n = max(len(y) for y in layers); a = sum(np.pad(y, (0, n - len(y))) for y in layers) / 2.2
            a = reverb(a, 1.8, 0.35)
        voice.add(ln['start'], reverb(a, 1.0, 0.08, seed=7) if not fx else a, 1.0)
    snd = ep['sound']
    key = snd.get('key', 50)
    segs = [(resolve(t, TL, EV), m) for t, m in snd['music']] + [(end, 'silence')]
    for i, (t0, m) in enumerate(segs[:-1]):
        t1 = segs[i + 1][0]
        x = mood(m, max(0.1, t1 - t0), key, seed=i + 1)
        n = len(x); fade = int(0.8 * SR)
        x[:fade] *= np.linspace(0, 1, fade)[: len(x[:fade])]
        x[-fade:] *= np.linspace(1, 0, fade)[: len(x[-fade:])]
        music.add(max(0, t0 - 0.4), x, 1.0)
    for c in snd['cues']:
        t0, name, g = resolve(c[0], TL, EV), c[1], c[2]
        o = c[3] if len(c) > 3 else {}
        sfx.add(t0, SFX[name](o), g, pan=o.get('pan', 0.0))

    MUSIC_DUCK, SFX_DUCK, VOICE_GAIN = 15.0, 15.0, 1.6
    v = voice.mono()
    hop = int(0.01 * SR)
    frames = np.sqrt(np.convolve(v ** 2, np.ones(hop * 3) / (hop * 3), 'same')[::hop])
    active = (frames > 0.006).astype(float)
    sm = np.zeros_like(active); up, dn = 1 - np.exp(-1 / 3), 1 - np.exp(-1 / 35)
    for i in range(len(active)):
        prev = sm[i - 1] if i else 0.0
        sm[i] = prev + (up if active[i] > prev else dn) * (active[i] - prev)
    sm = np.maximum(sm, np.concatenate([sm[8:], np.zeros(8)]))
    k = np.interp(np.arange(len(v)), np.arange(len(sm)) * hop, sm)
    gm = 10 ** (-MUSIC_DUCK * k / 20); gs = 10 ** (-SFX_DUCK * k / 20)
    mg = snd.get('music_gain', 0.5)
    mix = np.stack([(music.L * mg * gm + sfx.L * gs + voice.L * VOICE_GAIN), (music.R * mg * gm + sfx.R * gs + voice.R * VOICE_GAIN)], 1)[: int(dur * SR)]
    cut = int(end * SR)
    if cut < len(mix):
        f = min(int(0.02 * SR), len(mix) - cut)
        mix[cut:cut + f] *= np.linspace(1, 0, f)[:, None]; mix[cut + f:] = 0
    bg = (music.mono() * mg * gm + sfx.mono() * gs)[: len(mix)]; vv = (v * VOICE_GAIN)[: len(mix)]
    worst = 99
    for ln in TL['lines']:
        a_, b_ = int(ln['start'] * SR), int(ln['end'] * SR)
        r = 20 * np.log10(np.sqrt(np.mean(vv[a_:b_] ** 2)) / (np.sqrt(np.mean(bg[a_:b_] ** 2)) + 1e-9))
        worst = min(worst, r)
        if r < 10: print(f'  LOW {r:5.1f} dB  {ln["text"][:50]}')
    print(f'voice-over-background, worst line: {worst:.1f} dB')
    mix = np.tanh(mix / (np.max(np.abs(mix)) + 1e-9) * 1.2) * 0.89
    sf.write(f'{d}/mix.wav', mix.astype(np.float32), SR)
    json.dump({'worst_voice_margin_db': round(float(worst), 1)}, open(f'{d}/mix_report.json', 'w'))


if __name__ == '__main__':
    main()
