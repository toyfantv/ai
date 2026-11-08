#!/usr/bin/env python3
"""Cue-driven score + sound design + voice-first mix (Episodes 7+).

Usage: python tools/audio2.py episodes/epXX.json
The episode JSON has a "sound" block:
  "music": [[time, mood], ...]       moods: wonder, mystery, playful, suspense, dread, cosmic, silence, runway, runway_dark, tender, tender_hope, musicbox
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


def knock():
    """One knuckle on a wooden door."""
    n = int(SR * 0.2)
    t = np.arange(n) / SR
    x = (np.sin(2 * np.pi * 185 * t) + 0.45 * np.sin(2 * np.pi * 420 * t)) * np.exp(-t * 34) + 0.5 * rng.standard_normal(n) * np.exp(-t * 170)
    return reverb(x * 0.8, 0.3, 0.18)


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


# Episode 27 (the liminal hospital): fluorescent buzz, ventilation, the PA chime, TV static, a breaker clunk, a low drone
def tube_buzz(d=8.0, f=120, seed=4):
    r = np.random.default_rng(seed); t = tt(d)
    x = sum(a * np.sin(2 * np.pi * f * k * t + r.uniform(0, 6)) for k, a in ((1, 1.0), (2, 0.55), (3, 0.3), (5, 0.18), (7, 0.1)))
    x = x * (0.85 + 0.15 * np.sin(2 * np.pi * 0.37 * t)) + 0.12 * bp(noise(d), 2500, 7000) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.9 * t))
    return x * env_adsr(len(t), 0.4, 0.6) * 0.5


def vent(d=8.0):
    x = lp(noise(d, 'brown'), 400) + 0.25 * bp(noise(d), 400, 1200)
    return x / (np.max(np.abs(x)) + 1e-9) * env_adsr(len(x), 1.0, 1.0) * 0.6


def pa_chime():
    a = bell(hz(76), 1.6) * 0.8; b = bell(hz(72), 2.0) * 0.8; x = np.zeros(int(2.6 * SR)); x[:len(a)] += a; i = int(0.55 * SR); x[i:i + len(b)] += b[: len(x) - i]
    return reverb(bp(x, 300, 4000), 2.4, 0.45)


def static(d=3.0, seed=6):
    r = np.random.default_rng(seed); x = bp(r.standard_normal(int(d * SR)), 800, 7500)
    return x / (np.max(np.abs(x)) + 1e-9) * env_adsr(len(x), 0.02, 0.15) * 0.5


def clunk():
    t = tt(0.9); x = np.sin(2 * np.pi * (55 + 40 * np.exp(-t * 30)) * t) * np.exp(-t * 9) + 0.6 * hp(noise(0.9), 1500) * np.exp(-t * 60)
    return reverb(x * 0.9, 1.4, 0.35)


def drone(d=8.0, f=55):
    t = tt(d); x = np.sin(2 * np.pi * f * t) + 0.6 * np.sin(2 * np.pi * f * 1.498 * t + 1) + 0.3 * np.sin(2 * np.pi * f * 2.01 * t)
    x = x * (0.8 + 0.2 * np.sin(2 * np.pi * 0.11 * t))
    return reverb(lp(x, 900) * env_adsr(len(t), min(2.5, d / 3), min(2.5, d / 3)) * 0.5, 2.5, 0.3)


def flick(d=0.6, seed=8):
    r = np.random.default_rng(seed); x = np.zeros(int(d * SR)); t = 0.0
    while t < d - 0.03:
        n = int(r.uniform(0.008, 0.03) * SR); i = int(t * SR); m = min(n, len(x) - i)
        x[i:i + m] += (hp(r.standard_normal(n), 1200) * np.hanning(n))[:m] * r.uniform(0.4, 1.0); t += r.uniform(0.03, 0.12)
    return x * 0.7


# ---------- Episode 32: swords, stone, storm ----------
def clash(seed=1, f=1900):
    # steel on steel: a bright inharmonic ring over a noise crack, then a short metallic tail
    r = np.random.default_rng(seed); t = tt(1.6)
    ring = sum(a * np.sin(2 * np.pi * f * m * t + r.random() * 6) * np.exp(-t * dec) for m, a, dec in [(1, 1, 5), (1.53, 0.7, 7), (2.41, 0.5, 9), (3.7, 0.35, 12), (5.2, 0.2, 16)])
    crack = hp(r.standard_normal(len(t)), 2500) * np.exp(-t * 60)
    thump = impact(1.6, 120, 50, 0.0)[: len(t)]
    return reverb(ring * 0.5 + crack * 0.8 + thump * 0.5, 1.4, 0.3)


def swish(d=0.45, seed=2):
    # a blade cutting air: band noise sweeping up then down, fast
    r = np.random.default_rng(seed); n = int(d * SR); t = np.arange(n) / SR
    x = r.standard_normal(n); out = np.zeros(n); k = 512
    for i in range(0, n, k):
        u = i / n; fc = 600 + 3800 * np.sin(np.pi * u) ** 2
        out[i:i + k] = bp(x[i:i + k], fc * 0.6, min(fc * 1.6, 16000))
    return out * np.sin(np.pi * t / d) ** 1.5 * 1.6


def rockbreak(d=2.2, seed=3):
    # stone splitting: a deep hit, a crunch, then debris
    r = np.random.default_rng(seed); t = tt(d)
    crunch = lp(r.standard_normal(len(t)), 2400) * np.exp(-t * 7)
    deb = np.zeros(len(t))
    for _ in range(40):
        i = int((0.08 + r.random() ** 2 * (d - 0.4)) * SR); g = np.exp(-np.arange(int(0.05 * SR)) / (0.006 * SR))
        deb[i:i + len(g)] += bp(r.standard_normal(len(g)), 900, 5000) * g * (0.15 + r.random() * 0.4) * (1 - i / len(t))
    return reverb(impact(d, 90, 26, 0.8)[: len(t)] * 0.9 + crunch * 0.6 + deb, 1.6, 0.3)


def thunder(d=4.5, seed=4):
    r = np.random.default_rng(seed); t = tt(d)
    x = lp(np.cumsum(r.standard_normal(len(t))), 300); x = hp(x, 25); x /= np.max(np.abs(x)) + 1e-9
    crack = hp(r.standard_normal(len(t)), 1800) * np.exp(-t * 18) * 0.5
    env = np.exp(-t * 0.9) * (1 + 0.5 * np.sin(2 * np.pi * 1.7 * t) ** 2)
    return reverb(x * env + crack, 2.5, 0.35)


def rain(d=10.0, seed=5):
    r = np.random.default_rng(seed); x = bp(r.standard_normal(int(d * SR)), 1200, 9000) * 0.5
    x += lp(r.standard_normal(len(x)), 500) * 0.25
    drops = (r.random(len(x)) < 0.0012) * r.random(len(x)); x += hp(drops, 3000) * 2.0
    f = int(0.6 * SR); x[:f] *= np.linspace(0, 1, f); x[-f:] *= np.linspace(1, 0, f)
    return x


def sea(d=10.0, seed=6):
    r = np.random.default_rng(seed); t = tt(d)
    x = lp(r.standard_normal(len(t)), 700) * (0.5 + 0.5 * np.sin(2 * np.pi * t / 4.3) ** 2)
    f = int(0.8 * SR); x[:f] *= np.linspace(0, 1, f); x[-f:] *= np.linspace(1, 0, f)
    return x


def watersplit(d=3.5, seed=7):
    # the ocean tearing open: a rising roar of water with a low boom under it
    r = np.random.default_rng(seed); t = tt(d)
    roar = water_whoosh(d)[: len(t)] * 1.2 + lp(r.standard_normal(len(t)), 900) * np.sin(np.pi * np.minimum(t / d * 1.2, 1)) * 0.8
    return reverb(roar + impact(d, 70, 24, 0.4)[: len(t)] * 0.7, 2.4, 0.35)


def freeze(d=2.2, seed=8):
    # time stops: a whoosh dropping into a glassy held tone
    t = tt(d); x = sum(np.sin(2 * np.pi * f * t) for f in (880, 1320, 1975)) * np.exp(-t * 1.2) * 0.25
    s = whoosh(0.6); x[: len(s)] += s[: len(x)] * 0.6
    return reverb(x, 3.0, 0.5)


def crackopen(d=2.6, seed=9):
    # a tear in time: a rising tone that splits with a glassy crack
    r = np.random.default_rng(seed); t = tt(d)
    f = 300 * (1 + 4 * t / d) ** 1.2; x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d) * 0.3
    i = int(0.62 * SR); g = glass_pings(1.6, 40)[: len(t) - i]; x[i:i + len(g)] += g * 0.8
    c = hp(r.standard_normal(int(0.4 * SR)), 2000) * np.exp(-np.arange(int(0.4 * SR)) / (0.04 * SR)); x[i:i + len(c)] += c
    sh = shimmer(d, seed)[: len(t)]; x[: len(sh)] += sh * 0.3
    return reverb(x, 2.5, 0.45)


def armorbreak(d=3.0, seed=10):
    # plate armour bursting: a heavy clash, shards of metal and glass, plates landing
    r = np.random.default_rng(seed); x = np.zeros(int(d * SR))
    c = clash(seed, 1400); x[: len(c)] += c[: len(x)] * 1.0
    g = glass_pings(1.8, 70); x[: len(g)] += g[: len(x)] * 0.5
    for k in range(9):
        i = int((0.55 + r.random() * 1.8) * SR); n = int(0.5 * SR)
        h = clash(seed + k + 1, 700 + r.random() * 900)[:n] * np.exp(-np.arange(n) / (0.08 * SR))
        x[i:i + n] += h[: len(x) - i] * (0.25 + 0.2 * r.random())
    return x


def wallcrash(d=2.6, seed=11):
    # a body through a stone wall: the hit, the bricks tumbling
    x = rockbreak(d, seed); s = impact(1.5, 140, 45, 0.9); x[: len(s)] += s[: len(x)] * 0.9
    return x


def swordwake(d=6.0, seed=12):
    # thousands of blades waking: a swelling metallic shimmer over a sub drone, scattered rings
    r = np.random.default_rng(seed); t = tt(d); x = np.zeros(len(t)); dr = drone(d, 41)[: len(t)]; x[: len(dr)] += dr * 0.6
    for _ in range(90):
        i = int(r.random() ** 0.6 * (d - 1.2) * SR); f = 1200 + r.random() * 3000
        h = np.sin(2 * np.pi * f * tt(1.0)) * np.exp(-tt(1.0) * 6) * (0.03 + 0.06 * r.random()) * (i / len(t) + 0.2)
        x[i:i + len(h)] += h[: len(t) - i]
    return reverb(x * np.minimum(1, t / 1.5), 3.0, 0.5)


def helmet_voice(a):
    # a voice from inside an empty helmet: a metallic comb (short resonant delays), a boxed band, a long cold hall
    a = bp(a, 220, 4200)
    for ms, g in ((3.1, 0.55), (7.4, 0.35)):
        n = int(ms / 1000 * SR); y = np.zeros_like(a); y[n:] = a[:-n] * g; a = a + y
    a = a * (0.13 / (np.sqrt(np.mean(a[np.abs(a) > 0.004] ** 2)) + 1e-9))
    return reverb(a, 3.2, 0.4)


SFX = {
    'impact': lambda o: impact(o.get('dur', 3.0), 100, 28, 0.7), 'boom': lambda o: impact(4.0, 130, 22, 1.1),
    'stomp': lambda o: stomp(), 'knock': lambda o: knock(), 'whoosh': lambda o: whoosh(o.get('dur', 1.2)), 'shimmer': lambda o: shimmer(o.get('dur', 2.5)),
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
    'sample': lambda o: sample(o), 'scratch': lambda o: scratch(o.get('dur', 3.0), o.get('rate', 7.0)),
    'buzz': lambda o: tube_buzz(o.get('dur', 8.0), o.get('f', 120)), 'vent': lambda o: vent(o.get('dur', 8.0)), 'pachime': lambda o: pa_chime(),
    'static': lambda o: static(o.get('dur', 3.0)), 'clunk': lambda o: clunk(), 'drone': lambda o: drone(o.get('dur', 8.0), o.get('f', 55)), 'flick': lambda o: flick(o.get('dur', 0.6)),
    'scrape': lambda o: scrape(o.get('dur', 0.7), o.get('seed', 3)), 'paper': lambda o: paper(o.get('dur', 0.9), o.get('seed', 2)),
    'winddown': lambda o: winddown(o.get('dur', 2.4), o.get('key', 45)),
    'phonebuzz': lambda o: phonebuzz(o.get('dur', 0.9)), 'ringtone': lambda o: ringtone(o.get('dur', 4.0)), 'lockturn': lambda o: lockturn(o.get('seed', 52)),
    'chainslide': lambda o: chainslide(o.get('seed', 53)), 'curtain': lambda o: curtain(o.get('dur', 1.6)), 'scarehit': lambda o: scarehit(o.get('dur', 3.2)),
    'roomtone': lambda o: roomtone(o.get('dur', 8.0)), 'suburb': lambda o: suburb(o.get('dur', 10.0)),
    'flutter': lambda o: flutter(o.get('dur', 1.2), o.get('rate', 9.0)), 'chirp': lambda o: chirp(o.get('f', 1300), o.get('dur', 0.32), o.get('up', 1)),
}


SFX.update({
    'clash': lambda o: clash(o.get('seed', 1), o.get('f', 1900)), 'swish': lambda o: swish(o.get('dur', 0.45), o.get('seed', 2)),
    'rockbreak': lambda o: rockbreak(o.get('dur', 2.2), o.get('seed', 3)), 'thunder': lambda o: thunder(o.get('dur', 4.5), o.get('seed', 4)),
    'rain': lambda o: rain(o.get('dur', 10.0)), 'sea': lambda o: sea(o.get('dur', 10.0)), 'watersplit': lambda o: watersplit(o.get('dur', 3.5)),
    'freeze': lambda o: freeze(o.get('dur', 2.2)), 'crackopen': lambda o: crackopen(o.get('dur', 2.6)), 'armorbreak': lambda o: armorbreak(o.get('dur', 3.0)),
    'wallcrash': lambda o: wallcrash(o.get('dur', 2.6)), 'swordwake': lambda o: swordwake(o.get('dur', 6.0)),
})


# Episode 33: magic duel sounds (fire wall, energy orbs, a rune shield, electric arcs, a teleport, a deep tower bell,
# a violet shockwave, a cloak turning to glittering dust)
def firewall(d=4.0, seed=31):
    # flames roaring up: a low whoosh swell, a band-noise roar that flickers, crackles on top
    r = np.random.default_rng(seed); t = tt(d)
    roar = bp(r.standard_normal(len(t)), 120, 1400) * (0.7 + 0.3 * lp(r.standard_normal(len(t)), 6) * 4)
    sw = np.minimum(1, t / 0.5) * np.exp(-np.maximum(0, t - d + 1.0) * 3)
    cr = crackle(d, 90)[: len(t)] * 0.5
    return reverb(roar * sw * 0.8 + cr * sw, 1.6, 0.25)


def orb(d=0.9, seed=32):
    # an energy blast leaving the hand: a rising buzz and a soft thump
    r = np.random.default_rng(seed); t = tt(d); f = 180 + 900 * (t / d) ** 0.6
    buzz = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.6 + 0.4 * np.sin(2 * np.pi * 37 * t)) * np.exp(-t * 3.5)
    air = bp(r.standard_normal(len(t)), 800, 5000) * np.exp(-t * 7) * 0.5
    return reverb(buzz * 0.5 + air + impact(d, 140, 40, 0.0)[: len(t)] * 0.4, 1.2, 0.3)


def shieldhit(seed=33):
    # an orb on the rune shield: a glassy, bell-like ring and a crack
    r = np.random.default_rng(seed); t = tt(1.8)
    ring = sum(a * np.sin(2 * np.pi * f * t + r.random() * 6) * np.exp(-t * dc) for f, a, dc in [(620, 1, 3), (1490, 0.6, 5), (2310, 0.4, 7), (3870, 0.25, 11)])
    crack = hp(r.standard_normal(len(t)), 2000) * np.exp(-t * 40)
    return reverb(ring * 0.45 + crack * 0.7 + impact(1.8, 110, 35, 0.0)[: len(t)] * 0.6, 1.8, 0.4)


def zap(d=1.2, seed=34):
    # electric arcs: buzzing, crackling, stuttering noise
    r = np.random.default_rng(seed); t = tt(d)
    buzz = np.sign(np.sin(2 * np.pi * 95 * t)) * 0.3 + bp(r.standard_normal(len(t)), 1500, 9000)
    gate = (lp(r.standard_normal(len(t)), 30) > -0.02).astype(float) * 0.7 + 0.3
    return reverb(buzz * gate * np.minimum(1, t / 0.02) * np.exp(-np.maximum(0, t - d + 0.3) * 8), 1.0, 0.25) * 0.8


def teleport(d=0.8, seed=35):
    # a vanish: a reversed swell into a soft pop
    r = np.random.default_rng(seed); t = tt(d)
    sw = bp(r.standard_normal(len(t)), 400, 6000) * (t / d) ** 3
    return reverb(sw * 0.8 + np.concatenate([np.zeros(int(len(t) * 0.85)), pop()])[: len(t)] * 0.5, 1.4, 0.35)


def towerbell(d=6.0, note=40):
    # one deep, cold toll
    t = tt(d); f = hz(note)
    x = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * dc) for m, a, dc in [(0.5, 0.6, 0.5), (1, 1, 0.7), (2.0, 0.5, 1.2), (2.4, 0.4, 1.4), (3.0, 0.3, 2), (4.2, 0.2, 3)])
    return reverb(x * 0.5, 4.0, 0.5)


def shockboom(d=5.0, seed=36):
    # the shockwave: a sub drop, a rushing wall of air, debris
    r = np.random.default_rng(seed); t = tt(d)
    air = bp(r.standard_normal(len(t)), 150, 4000) * np.exp(-t * 1.4)
    return reverb(impact(d, 140, 18, 1.2)[: len(t)] + air * 0.5 + rockbreak(d, seed)[: len(t)] * 0.4, 2.8, 0.4)


def dustglitter(d=3.0, seed=37):
    # a cloak dissolving: a soft rising shimmer of tiny chimes, airy
    r = np.random.default_rng(seed); t = tt(d); x = bp(r.standard_normal(len(t)), 3000, 12000) * 0.12 * np.sin(np.pi * t / d)
    for _ in range(70):
        i = int(r.random() * (d - 0.6) * SR); f = 2200 + r.random() * 3500; h = np.sin(2 * np.pi * f * tt(0.5)) * np.exp(-tt(0.5) * 9) * 0.05
        x[i:i + len(h)] += h[: len(t) - i]
    return reverb(x, 2.5, 0.5)


def kickhit(seed=38):
    # a kick landing in the ribs: a heavy body punch and a swish
    r = np.random.default_rng(seed); t = tt(1.0)
    body = impact(1.0, 95, 45, 0.3)[: len(t)]; slap = lp(r.standard_normal(len(t)), 3500) * np.exp(-t * 35)
    return reverb(body * 0.9 + slap * 0.6, 0.8, 0.2)


SFX.update({
    'firewall': lambda o: firewall(o.get('dur', 4.0)), 'orb': lambda o: orb(o.get('dur', 0.9), o.get('seed', 32)),
    'shieldhit': lambda o: shieldhit(o.get('seed', 33)), 'zap': lambda o: zap(o.get('dur', 1.2), o.get('seed', 34)),
    'teleport': lambda o: teleport(o.get('dur', 0.8)), 'towerbell': lambda o: towerbell(o.get('dur', 6.0), o.get('note', 40)),
    'shockboom': lambda o: shockboom(o.get('dur', 5.0)), 'dustglitter': lambda o: dustglitter(o.get('dur', 3.0)),
    'kickhit': lambda o: kickhit(o.get('seed', 38)),
})


# Episode 34: tactical sounds (rifle shots, machine-synced volleys, casings, a reload, ricochets, concrete hits, a steel door
# kicked open, an alarm, a security camera's servo, wet hits for the toon blood)
_GS = {}
def gunshot(seed=0, far=0.0):
    key = (seed, round(far, 2))
    if key in _GS: return _GS[key]
    r = np.random.default_rng(400 + seed); t = tt(0.9)
    crack = hp(r.standard_normal(len(t)), 1800) * np.exp(-t * 110)
    body = bp(r.standard_normal(len(t)), 140, 1600) * np.exp(-t * 32)
    thump = np.sin(2 * np.pi * (62 + 8 * r.random()) * t) * np.exp(-t * 22)
    mech = bp(r.standard_normal(len(t)), 2500, 6000) * np.exp(-np.maximum(0, t - 0.035) * 160) * (t > 0.035) * 0.25
    x = crack * (1.1 - 0.8 * far) + body * 0.85 + thump * (1.0 - 0.3 * far) + mech * (1 - far)
    if far > 0: x = lp(x, 6000 - 4800 * far)
    x = np.tanh(x * 1.6) / 1.6
    _GS[key] = x; return x


def gunburst(times, seed=1, far=0.0, stack=1, rev=2.4, wet=0.35, jitter=0.006, casings=False):
    # every time in times (seconds from the cue) gets a shot; stack copies with a few ms jitter thicken a synced volley
    r = np.random.default_rng(seed); end = max(times) + 1.2 if times else 1.0; x = np.zeros(int(end * SR))
    for k, t0 in enumerate(times):
        for j in range(stack):
            g = gunshot(int(r.integers(6)), far) * (1.0 if j == 0 else 0.55); i = int((t0 + (r.random() * jitter if j else 0)) * SR)
            x[i:i + len(g)] += g[: len(x) - i]
        if casings and k % 2 == 0:
            for c in range(2):
                tc = t0 + 0.32 + 0.09 * c + r.random() * 0.05; i = int(tc * SR); f = 3400 + r.random() * 2200
                h = (np.sin(2 * np.pi * f * tt(0.18)) + 0.5 * np.sin(2 * np.pi * f * 1.47 * tt(0.18))) * np.exp(-tt(0.18) * 28) * 0.12
                x[i:i + len(h)] += h[: max(0, len(x) - i)]
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.9
    return reverb(x, rev, wet)


def _click(f=2400, d=0.05, seed=0):
    r = np.random.default_rng(seed); t = tt(d)
    return (bp(r.standard_normal(len(t)), f * 0.6, f * 2.2) * np.exp(-t * 140) + np.sin(2 * np.pi * f * 0.5 * t) * np.exp(-t * 90) * 0.4)


def _slide(d=0.12, f0=900, f1=3000, seed=0):
    r = np.random.default_rng(seed); t = tt(d)
    return bp(r.standard_normal(len(t)), f0, f1) * np.sin(np.pi * t / d) * 0.5


def _seq(parts):
    end = max(t0 + len(a) / SR for t0, a in parts) + 0.05; x = np.zeros(int(end * SR))
    for t0, a in parts: i = int(t0 * SR); x[i:i + len(a)] += a[: len(x) - i]
    return x


def rack(seed=41):
    return reverb(_seq([(0, _click(2100, 0.05, seed)), (0.03, _slide(0.1, 800, 3200, seed)), (0.14, _click(2600, 0.06, seed + 1) * 1.2)]), 0.6, 0.15)


def magout(seed=42):
    return reverb(_seq([(0, _click(1800, 0.05, seed)), (0.02, _slide(0.14, 500, 2200, seed) * 0.7), (0.42, impact(0.4, 160, 60, 0.0)[: int(0.4 * SR)] * 0.5)]), 0.6, 0.2)


def magin(seed=43):
    return reverb(_seq([(0, _slide(0.1, 600, 2400, seed) * 0.6), (0.1, _click(1500, 0.07, seed) * 1.4), (0.1, impact(0.3, 140, 70, 0.0)[: int(0.3 * SR)] * 0.4)]), 0.6, 0.15)


def ricochet(seed=44, d=0.55):
    r = np.random.default_rng(seed); t = tt(d); f = (3400 + 600 * r.random()) * (1 - 0.55 * t / d)
    wh = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6) * 0.35 + hp(r.standard_normal(len(t)), 3000) * np.exp(-t * 50) * 0.6
    return reverb(wh, 1.4, 0.35)


def concrete(seed=45, d=0.7):
    r = np.random.default_rng(seed); t = tt(d)
    c = hp(r.standard_normal(len(t)), 1200) * np.exp(-t * 70) + bp(r.standard_normal(len(t)), 200, 1200) * np.exp(-t * 25) * 0.6
    return reverb(c + crackle(d, 50)[: len(t)] * 0.25 * np.exp(-t * 4), 1.2, 0.3)


def doorboom(seed=46, d=3.0):
    r = np.random.default_rng(seed); t = tt(d)
    ring = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * dc) for f, a, dc in [(118, 1, 2.2), (263, 0.7, 3.2), (447, 0.5, 4.5), (731, 0.35, 6), (1180, 0.25, 9)])
    bang = impact(d, 110, 20, 1.0)[: len(t)] + hp(r.standard_normal(len(t)), 1500) * np.exp(-t * 60) * 0.8
    rattle = bp(r.standard_normal(len(t)), 600, 3000) * np.exp(-t * 5) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 21 * t))) * 0.25
    return reverb(bang * 0.9 + ring * 0.35 + rattle, 2.6, 0.35)


def alarm(d=6.0, f1=760, f2=570, rate=1.6):
    t = tt(d); f = np.where((t * rate) % 1 < 0.5, f1, f2); ph = 2 * np.pi * np.cumsum(f) / SR
    sq = np.sign(np.sin(ph)) * 0.5 + np.sin(ph) * 0.5
    return reverb(bp(sq, 300, 3000) * 0.35 * np.minimum(1, t / 0.05) * np.minimum(1, (d - t) / 0.2), 2.8, 0.45)


def servo(d=2.4, seed=47):
    r = np.random.default_rng(seed); t = tt(d); f = 180 + 120 * np.sin(np.pi * t / d)
    ph = 2 * np.pi * np.cumsum(f) / SR; m = (np.sign(np.sin(ph)) * 0.4 + np.sin(2 * ph) * 0.3) * (0.7 + 0.3 * np.sin(2 * np.pi * 31 * t))
    gear = bp(r.standard_normal(len(t)), 1500, 5000) * 0.15
    env = np.minimum(1, t / 0.08) * np.minimum(1, (d - t) / 0.12)
    return reverb(bp(m, 120, 4000) * env * 0.5 + gear * env, 1.0, 0.2)


def splat(seed=48):
    r = np.random.default_rng(seed); t = tt(0.6)
    wet = lp(r.standard_normal(len(t)), 1400) * np.exp(-t * 18) * 1.2 + bp(r.standard_normal(len(t)), 2500, 7000) * np.exp(-t * 35) * 0.3
    return reverb(wet + impact(0.6, 90, 45, 0.0)[: len(t)] * 0.8, 0.7, 0.2)


def bodyfall(seed=49):
    r = np.random.default_rng(seed); return _seq([(0, impact(0.8, 85, 30, 0.2)[: int(0.8 * SR)]), (0.12, impact(0.6, 120, 40, 0.0)[: int(0.6 * SR)] * 0.5), (0.05, _click(900, 0.1, seed) * 0.6)])


SFX.update({
    'gunburst': lambda o: gunburst(o['times'], o.get('seed', 1), o.get('far', 0.0), o.get('stack', 1), o.get('rev', 2.4), o.get('wet', 0.35), casings=o.get('casings', False)),
    'gunshot': lambda o: reverb(gunshot(o.get('seed', 0), o.get('far', 0.0)), 2.4, 0.35), 'rack': lambda o: rack(o.get('seed', 41)),
    'magout': lambda o: magout(o.get('seed', 42)), 'magin': lambda o: magin(o.get('seed', 43)), 'ricochet': lambda o: ricochet(o.get('seed', 44)),
    'concrete': lambda o: concrete(o.get('seed', 45)), 'doorboom': lambda o: doorboom(o.get('seed', 46)), 'alarm': lambda o: alarm(o.get('dur', 6.0)),
    'servo': lambda o: servo(o.get('dur', 2.4)), 'splat': lambda o: splat(o.get('seed', 48)), 'bodyfall': lambda o: bodyfall(o.get('seed', 49)),
})


# Episode 36: a game show (a studio audience's applause, a brassy fanfare, the countdown's beeps), a roll-down security shutter,
# a shop window shattering
def applause(d=4.0, seed=61, n=260):
    r = np.random.default_rng(seed); x = np.zeros(int(d * SR)); clap = lambda: bp(r.standard_normal(int(0.03 * SR)), 900, 5200) * np.exp(-tt(0.03) * 160)
    for _ in range(int(n * d)):
        i = int(r.random() * (d - 0.05) * SR); c = clap() * (0.4 + 0.6 * r.random()); x[i:i + len(c)] += c[: len(x) - i]
    e = np.minimum(1, tt(d) / 0.25) * np.minimum(1, (d - tt(d)) / 0.9); return reverb(np.tanh(x * e * 0.5), 1.8, 0.35)


def fanfare(d=2.4, key=50):
    # three brassy chords (a saw stack with a soft attack), the last held
    t = tt(d); x = np.zeros(len(t))
    for t0, dur, notes in ((0.0, 0.18, (0, 4, 7)), (0.2, 0.18, (2, 5, 9)), (0.42, d - 0.5, (4, 7, 12, 16))):
        i0, n = int(t0 * SR), int(dur * SR); tl = tt(dur)
        for nn in notes:
            f = hz(key + nn); v = sum(np.sin(2 * np.pi * f * k * tl) / k for k in range(1, 7)) * 0.16
            x[i0:i0 + n] += (v * np.minimum(1, tl / 0.02) * np.minimum(1, (dur - tl) / 0.08))[: len(x) - i0]
    return reverb(lp(x, 4200), 1.6, 0.3)


def beep(f=1320, d=0.14):
    t = tt(d); return (np.sign(np.sin(2 * np.pi * f * t)) * 0.25 + np.sin(2 * np.pi * f * t) * 0.5) * np.minimum(1, t / 0.004) * np.minimum(1, (d - t) / 0.02)


def rollgate(d=2.0, seed=62):
    # a steel shutter rattling down its rails: a fast irregular slat clatter over a low metallic rumble
    r = np.random.default_rng(seed); t = tt(d); x = bp(r.standard_normal(len(t)), 60, 400) * 0.35
    k = 0.0
    while k < d - 0.03:
        c = bp(r.standard_normal(int(0.02 * SR)), 1500, 6000) * np.exp(-tt(0.02) * 220) * (0.4 + 0.6 * r.random()); i = int(k * SR); x[i:i + len(c)] += c[: len(x) - i]; k += 0.018 + 0.03 * r.random()
    return reverb(x * np.minimum(1, t / 0.05) * np.minimum(1, (d - t) / 0.2), 1.6, 0.3)


def shatter(seed=63):
    r = np.random.default_rng(seed); burst = hp(r.standard_normal(int(0.5 * SR)), 2500) * np.exp(-tt(0.5) * 14) * 0.8
    thump = impact(0.4, 110, 40, 0.0)[: int(0.4 * SR)] * 0.6; tink = glass_pings(1.6, 40) * 0.8
    return reverb(_seq([(0, burst), (0, thump), (0.04, tink)]), 1.8, 0.3)


SFX.update({
    'applause': lambda o: applause(o.get('dur', 4.0), o.get('seed', 61)), 'fanfare': lambda o: fanfare(o.get('dur', 2.4), o.get('key', 50)),
    'beep': lambda o: beep(o.get('f', 1320), o.get('dur', 0.14)), 'rollgate': lambda o: rollgate(o.get('dur', 2.0), o.get('seed', 62)),
    'shatter': lambda o: shatter(o.get('seed', 63)),
})


# Episode 23: a small dragon's wings (soft feathery beats) and its voice (a bright squeak that bends up or down)
# ---------- Episode 35: phone, locks, curtain, the scare ----------
def phonebuzz(d=0.9, seed=51):
    """A phone vibrating on a nightstand: two pulses of a rattling motor."""
    t = tt(d); gate = ((t % 0.45) < 0.32).astype(float)
    x = np.sin(2 * np.pi * 172 * t) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 38 * t))) * gate
    x = x + 0.35 * bp(np.random.default_rng(seed).standard_normal(len(t)), 900, 4000) * gate
    return reverb(lp(x, 2600) * 0.7, 0.35, 0.12)


def ringtone(d=4.0):
    """A plain marimba-like phone ring, two-note phrase repeated."""
    out = np.zeros(int(d * SR)); notes = [(0.0, 76), (0.15, 81), (0.3, 79), (0.45, 84)]
    for k in range(int(d / 1.4) + 1):
        for o, n in notes:
            t0 = k * 1.4 + o
            if t0 >= d: continue
            tn = tt(0.4); f = hz(n)
            x = (np.sin(2 * np.pi * f * tn) + 0.3 * np.sin(2 * np.pi * 4 * f * tn)) * np.exp(-tn * 9)
            i = int(t0 * SR); out[i:i + len(x)] += x[: len(out) - i] * 0.45
    return reverb(out, 0.6, 0.15)


def lockturn(seed=52):
    """A deadbolt's thumb turn: a short scrape, then the bolt clacks home."""
    return reverb(_seq([(0, _slide(0.14, 600, 2400, seed) * 0.8), (0.12, _click(1500, 0.07, seed) * 1.4), (0.13, impact(0.3, 140, 70, 0.2)[: int(0.3 * SR)] * 0.35)]), 0.5, 0.15)


def chainslide(seed=53):
    """A door chain: rattling links run along the track and drop into the slot."""
    r = np.random.default_rng(seed); parts = [(0.03 * i + 0.01 * r.random(), _click(2800 + 600 * r.random(), 0.04, seed + i) * 0.6) for i in range(14)]
    parts.append((0.48, _click(2200, 0.06, seed + 30) * 1.3)); parts.append((0.0, _slide(0.45, 1500, 5000, seed) * 0.5))
    return reverb(_seq(parts), 0.5, 0.15)


def curtain(d=1.6, seed=54):
    """Heavy fabric drawn along a rod: rings rasp and the cloth swishes."""
    t = tt(d); r = np.random.default_rng(seed)
    cloth = bp(r.standard_normal(len(t)), 300, 2500) * np.sin(np.pi * t / d) ** 0.7 * 0.35
    rings = sum(_click(3400, 0.03, seed + i) for i in range(1)) if False else 0
    rasp = bp(r.standard_normal(len(t)), 2500, 7000) * (0.5 + 0.5 * np.sin(2 * np.pi * 11 * t)) * np.sin(np.pi * t / d) * 0.12
    return reverb(cloth + rasp + 0 * rings, 0.5, 0.15)


def scarehit(d=3.2, seed=55):
    """The jump scare: a low thud, a scraped metal screech and a dissonant cluster that rings out."""
    t = tt(d); r = np.random.default_rng(seed)
    thud = impact(d, 90, 30, 0.8)[: len(t)]
    f = 1800 + 500 * np.sin(2 * np.pi * 3.1 * t) + 300 * r.standard_normal(1)[0]
    screech = np.tanh(3 * np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.exp(-t * 2.2) * 0.25
    cluster = sum(np.sin(2 * np.pi * fr * t) for fr in (233.1, 246.9, 349.2, 370.0, 493.9)) / 5 * np.exp(-t * 1.1) * 0.6
    return reverb(thud * 0.9 + bp(screech, 900, 6000) + cluster, 2.6, 0.4)


def roomtone(d=8.0, seed=56):
    """A quiet bedroom at night: a soft fridge-like hum far off and air."""
    t = tt(d); r = np.random.default_rng(seed)
    return lp(r.standard_normal(len(t)), 500) * 0.12 + np.sin(2 * np.pi * 50 * t) * 0.02


def suburb(d=10.0, seed=57):
    """An afternoon street: distant traffic wash, a few birds."""
    t = tt(d); r = np.random.default_rng(seed)
    wash = lp(r.standard_normal(len(t)), 700) * 0.18
    out = wash.copy()
    for k in range(int(d * 0.8)):
        t0 = r.random() * (d - 0.5); i = int(t0 * SR); c = chirp(2400 + 1200 * r.random(), 0.12, 1) * 0.12
        out[i:i + len(c)] += c[: len(out) - i]
    return out


def flutter(d=1.2, rate=9.0, seed=5):
    r = np.random.default_rng(seed); x = np.zeros(int(d * SR)); t = 0.0
    while t < d - 0.08:
        n = int(0.07 * SR); s = bp(r.standard_normal(n), 300, 2200) * np.hanning(n) * r.uniform(0.6, 1.0)
        i = int(t * SR); x[i:i + n] += s[: len(x) - i]; t += 1 / rate * r.uniform(0.9, 1.1)
    return reverb(x / (np.max(np.abs(x)) + 1e-9) * 0.6, 0.6, 0.15)


def chirp(f=1300, d=0.32, up=1):
    t = tt(d); k = t / d
    fr = f * (1 + (0.55 * k if up > 0 else -0.35 * k) + 0.05 * np.sin(2 * np.pi * 28 * t))
    ph = 2 * np.pi * np.cumsum(fr) / SR
    x = (np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.12 * np.sin(3 * ph)) * np.sin(np.pi * np.clip(k, 0, 1)) ** 0.6
    return reverb(x * 0.5, 0.8, 0.2)


def piano(f, d=3.0, vel=1.0):
    t = tt(d); x = np.zeros(len(t))
    for h, a in ((1, 1.0), (2, 0.42), (3, 0.2), (4, 0.11), (5, 0.06), (6, 0.03)):
        x += a * np.sin(2 * np.pi * f * h * (1 + 0.0004 * h * h) * t) * np.exp(-t * (1.1 + 0.9 * h) * (0.6 + f / 900))
    att = np.minimum(1, t / 0.004)
    return lp(x * att * vel * 0.5, 5200)


def musicbox(f, d=2.0):
    t = tt(d); return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 3.01 * t) + 0.12 * np.sin(2 * np.pi * f * 5.4 * t)) * np.exp(-t * 3.2) * np.minimum(1, t / 0.002) * 0.5


# a spoken sample from build/<id>/samples (tts.py "samples"): a name in the trees, slowed or raised with rate, in a room of rev seconds
BUILD = {'dir': ''}
def sample(o):
    a, sr = sf.read(f"{BUILD['dir']}/samples/{o['name']}.wav")
    a = resample_poly(a, SR, sr)
    r = o.get('rate', 1.0)
    if r != 1.0: a = np.interp(np.arange(0, len(a), r), np.arange(len(a)), a)
    if o.get('dur'): a = a[: int(o['dur'] * SR)]
    a = a / (np.max(np.abs(a)) + 1e-9) * 0.7
    return reverb(a, o.get('rev', 1.8), o.get('wet', 0.35))


def scratch(d=3.0, rate=7.0, seed=4):
    r = np.random.default_rng(seed); x = np.zeros(int(d * SR)); t = 0.0
    while t < d - 0.15:
        n = int(r.uniform(0.05, 0.11) * SR); s = bp(r.standard_normal(n), r.uniform(1400, 2400), r.uniform(5000, 8000)) * np.hanning(n) * r.uniform(0.6, 1.0)
        i = int(t * SR); x[i:i + n] += s[: len(x[i:i + n])]; t += 1 / rate * r.uniform(0.7, 1.3)
    return x / (np.max(np.abs(x)) + 1e-9) * 0.7


# Episode 28: a heavy chair dragged over parquet (stick-slip judder through a wooden body); paper sliding over a floor
def scrape(d=0.7, seed=3):
    r = np.random.default_rng(seed); t = tt(d); n = len(t)
    jr = r.uniform(26, 44) * (1 + 0.25 * np.sin(2 * np.pi * r.uniform(1.5, 3) * t))
    ph = np.cumsum(jr) / SR; judder = (np.abs(np.sin(np.pi * ph)) ** 6)
    body = bp(r.standard_normal(n), 220, 1400) * (0.35 + judder) + bp(r.standard_normal(n), 1500, 3800) * judder * 0.35
    thump = np.sin(2 * np.pi * 95 * t) * np.exp(-t * 30) * 0.6
    e = np.minimum(1, t / 0.03) * np.minimum(1, (d - t) / 0.12)
    x = (body * e + thump); return reverb(x / (np.max(np.abs(x)) + 1e-9) * 0.75, 1.6, 0.35)


def paper(d=0.9, seed=2):
    r = np.random.default_rng(seed); t = tt(d); n = len(t)
    x = bp(r.standard_normal(n), 1800, 7000) * (0.6 + 0.4 * lp(r.standard_normal(n), 30) * 8) * np.sin(np.pi * t / d) ** 0.7
    return x / (np.max(np.abs(x)) + 1e-9) * 0.5


# a gramophone running down: the waltz's last bar sagging in pitch and tempo into silence
def winddown(d=2.4, key=45):
    t = tt(d); sag = np.exp(-t * 1.4)
    out = np.zeros(len(t))
    for k, n in enumerate((12, 16, 19, 24)):
        f = hz(key + n) * (0.55 + 0.45 * sag); ph = 2 * np.pi * np.cumsum(f) / SR
        out += np.sin(ph) * np.exp(-((t - k * 0.32) % 0.9) * 2.5) * (t > k * 0.32) * 0.25
    out = lp(out * sag, 1800) + bp(np.random.default_rng(4).standard_normal(len(t)), 900, 4000) * 0.02 * sag
    return reverb(out, 1.8, 0.4)


def _gramo(x, warp=0.0, seed=9):
    """a distant record: band-limited, a little wow, crackle, a big empty room"""
    r = np.random.default_rng(seed); n = len(x); t = np.arange(n) / SR
    wow = 1 + (0.0025 + warp * 0.012) * np.sin(2 * np.pi * 0.55 * t) + warp * 0.006 * np.sin(2 * np.pi * 0.13 * t)
    idx = np.clip(np.cumsum(wow) - 1, 0, n - 1); x = np.interp(idx, np.arange(n), x)
    x = bp(x, 260, 2600 - warp * 900)
    x = x + reverb(crackle(n / SR, 40), 0.4, 0.2)[:n] * 0.05
    return reverb(x, 2.6, 0.55)[:n]


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
    elif name == 'fantasy':
        # tropical magic: a lydian string bed, a harp arpeggio that walks through four chords, a thin shimmer on top
        add(0, pad([hz(key + n) for n in (0, 7, 12, 18, 19)], d + 0.5, a=0.6, r=1.0, bright=2200, detune=0.005), 0.42)
        add(0, shimmer(d, seed), 0.08)
        chords = [(0, 4, 7, 11, 14), (2, 6, 9, 14, 18), (-3, 4, 7, 12, 16), (5, 9, 12, 16, 19)]
        t, i = 0.1, 0
        while t < d:
            c = chords[(i // 8) % 4]
            add(int(t * SR), bell(hz(key + 12 + c[[0, 1, 2, 3, 4, 3, 2, 1][i % 8]]), 1.6), 0.13); t += 0.21; i += 1
    elif name == 'ancient':
        # the first world: low brass fifths, a choir-like stack that opens up, slow timpani, shimmering strings
        add(0, pad([hz(key - 24 + n) for n in (0, 7, 12, 19)], d + 0.5, a=1.0, r=1.0, bright=900, detune=0.006), 0.5)
        p2 = pad([hz(key + n) for n in (0, 7, 12, 16, 19, 24)], d + 0.5, a=2.2, r=1.2, bright=3200, detune=0.005)
        add(0, p2 * np.linspace(0.35, 1.0, len(p2)), 0.4)
        add(0, shimmer(d, seed), 0.16)
        t = 0.3
        while t < d: add(int(t * SR), impact(0.9, 70, 46, 0.0), 0.2); t += 1.6
        notes = [key + 24 + n for n in (0, 4, 7, 12, 16, 19, 24)]
        t, i = 0.6, 0
        while t < d: add(int(t * SR), bell(hz(notes[i % 7]), 2.6), 0.1); t += 0.4; i += 1
    elif name in ('runway', 'runway_dark'):
        # a fashion-show beat (Episode 22): four-on-the-floor at 122 bpm, off-beat hats, a minor pad, a plucked arpeggio; runway_dark drops the
        # kick for a filtered, colder pulse
        beat = 60 / 122; dark = name == 'runway_dark'
        add(0, pad([hz(key + n) for n in (0, 3, 7, 10, 15)], d + 0.5, a=0.4, r=0.8, bright=900 if dark else 2000, detune=0.008), 0.34)
        hat = bp(r.standard_normal(int(0.05 * SR)), 6000, 12000) * np.exp(-np.linspace(0, 9, int(0.05 * SR)))
        arp = [key + 12 + n for n in (0, 3, 7, 10, 12, 10, 7, 3)]
        t, i = 0.0, 0
        while t < d:
            if not dark: add(int(t * SR), impact(0.35, 110, 48, 0.0), 0.3)
            add(int((t + beat / 2) * SR), hat, 0.05 if dark else 0.09)
            add(int(t * SR), bell(hz(arp[i % 8]), 0.5), 0.05 if dark else 0.08); add(int((t + beat / 2) * SR), bell(hz(arp[(i + 4) % 8] + 12), 0.4), 0.04)
            t += beat; i += 1
    elif name in ('tender', 'tender_hope'):
        # Episode 23: gentle piano over a warm string bed: I - V - vi - IV, a broken-chord left hand, a slow melody on top; tender_hope opens up
        bright = 2600 if name == 'tender_hope' else 1500
        add(0, pad([hz(key - 12 + n) for n in (0, 7, 12, 16)], d + 0.5, a=1.2, r=1.2, bright=bright, detune=0.004), 0.32)
        if name == 'tender_hope': add(0, shimmer(d, seed), 0.07)
        prog = [(0, 4, 7), (7, 11, 14), (9, 12, 16), (5, 9, 12)]
        mel = [16, 14, 12, 14, 19, 16, 14, 12, 21, 19, 16, 14, 17, 16, 14, 12]
        beat = 0.5; t, i = 0.05, 0
        while t < d:
            c = prog[(i // 8) % 4]
            add(int(t * SR), piano(hz(key - 12 + c[[0, 1, 2, 1, 0, 1, 2, 1][i % 8]] + (12 if i % 8 in (2, 6) else 0)), 2.4, 0.55), 0.5)
            if i % 2 == 0: add(int(t * SR), piano(hz(key + 12 + mel[(i // 2) % 16]), 3.0, 0.8 if i % 8 == 0 else 0.6), 0.42)
            t += beat; i += 1
    elif name == 'musicbox':
        # a music-box lullaby (the pet shop): a slow plucked tune in the high register, a soft bed under it
        add(0, pad([hz(key + n) for n in (0, 7, 12, 16)], d + 0.5, a=0.5, r=1.0, bright=2200), 0.22)
        tune = [12, 16, 19, 24, 23, 19, 21, 19, 16, 19, 17, 14, 12, 14, 16, 12]
        t, i = 0.05, 0
        while t < d:
            add(int(t * SR), reverb(musicbox(hz(key + 24 + tune[i % 16])), 1.2, 0.3), 0.26); t += 0.3; i += 1
    elif name in ('waltz', 'waltz_warp'):
        # Episode 28: an old waltz from an empty ballroom (3/4, oom-pah-pah under a slow melody), heard through doors; waltz_warp slows and
        # detunes it, as if the record were melting
        warp = 1.0 if name == 'waltz_warp' else 0.0
        prog = [(0, 4, 7), (-5, 2, 7), (-5, 2, 5), (0, 4, 7), (-3, 0, 4), (2, 5, 9), (-5, 2, 7), (0, 4, 7)]
        mel = [16, 19, 24, 23, 21, 19, 17, 14, 19, 17, 16, 14, 16, 12, 16, 19, 21, 24, 23, 21, 19, 17, 14, 12]
        x = np.zeros(int(d * SR) + 3 * SR); t, i = 0.05, 0; beat = 0.42
        def ad(i0, sg, g):
            x[i0:i0 + len(sg)] += sg[: len(x) - i0] * g
        while t < d:
            c = prog[(i // 3) % 8]; b = i % 3
            if b == 0: ad(int(t * SR), piano(hz(key - 12 + c[0]), 1.6, 0.8), 0.45)
            else: ad(int(t * SR), piano(hz(key + c[1]), 0.8, 0.5), 0.22); ad(int(t * SR), piano(hz(key + c[2]), 0.8, 0.5), 0.2)
            if b != 2: ad(int(t * SR), piano(hz(key + 12 + mel[(i // 3 * 2 + b) % 24] - 12), 2.0, 0.7), 0.32)
            t += beat * (1 + warp * 0.35 * (t / max(d, 1))); i += 1
        add(0, _gramo(x, warp, seed), 1.0)
    elif name in ('action', 'action_hit'):
        # Episode 32: a sword fight in a storm: a driving low minor ostinato in 8ths, taiko-like hits, a brass-like fifth stab every bar;
        # action_hit doubles the drums
        beat = 60 / 132; hit = name == 'action_hit'
        add(0, pad([hz(key - 12 + n) for n in (0, 7, 12, 15)], d + 0.5, a=0.3, r=0.6, bright=1300, detune=0.008), 0.3)
        ost = [0, 0, 12, 0, 3, 0, 12, 7]
        t, i = 0.0, 0
        while t < d:
            add(int(t * SR), pad([hz(key - 12 + ost[i % 8])], 0.22, a=0.005, r=0.08, bright=1600), 0.32)
            if i % 4 == 0: add(int(t * SR), impact(0.7, 95, 42, 0.15), 0.34 if hit else 0.24)
            if hit and i % 4 == 2: add(int(t * SR), impact(0.5, 120, 60, 0.2), 0.18)
            if i % 16 == 0: add(int(t * SR), pad([hz(key + n) for n in (0, 7, 12)], beat * 1.5, a=0.02, r=0.4, bright=2600), 0.22)
            t += beat / 2; i += 1
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
    ep = json.load(open(sys.argv[1], encoding='utf8'))
    d = f"build/{ep['id']}"
    BUILD['dir'] = d
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
        if fx == 'helmet': a = helmet_voice(a)
        if fx == 'whisper': a = reverb(a, 1.6, 0.3)
        if fx == 'muffled': a = reverb(bp(a, 260, 2700), 0.5, 0.2)  # a small voice from inside a closed bag (Episode 37)
        if fx == 'pa':  # a ceiling loudspeaker in a long hard corridor
            a = bp(a, 450, 3200); a = np.tanh(a * 3.0) / 3.0
            a = a * (0.13 / (np.sqrt(np.mean(a[np.abs(a) > 0.004] ** 2)) + 1e-9)); a = reverb(a, 2.6, 0.42)
        if fx == 'tv':  # a voice from an old CRT speaker: thin, a little crushed, close
            a = bp(a, 380, 3800); a = np.tanh(a * 2.2) / 2.2
            a = a * (0.12 / (np.sqrt(np.mean(a[np.abs(a) > 0.004] ** 2)) + 1e-9)); a = reverb(a, 0.6, 0.12)
        if fx == 'phone':  # a voice down a phone line (Episode 35): narrow band, a little crushed, dry, a faint line hiss
            a = bp(a, 300, 3400, order=4); a = np.tanh(a * 2.6) / 2.6
            a = a * (0.13 / (np.sqrt(np.mean(a[np.abs(a) > 0.004] ** 2)) + 1e-9))
            a = a + bp(np.random.default_rng(35).standard_normal(len(a)), 800, 3000) * 0.0035
            a = reverb(a, 0.25, 0.05)
        if fx == 'cave':  # a voice carried along wet rock (Episode 39): long, hollow, a little dark
            a = reverb(bp(a, 160, 5200, order=2), 1.8, 0.34)
        if fx == 'mimic':  # the speaker's own voice with something a hair behind it: a faint detuned copy, so it stays recognisable (Episode 39)
            from scipy.signal import resample
            y = resample(a, int(len(a) / 0.985)); y = np.concatenate([np.zeros(int(0.018 * SR)), y])
            n = max(len(a), len(y)); a = np.pad(a, (0, n - len(a))) + np.pad(y, (0, n - len(y))) * 0.2
            a = reverb(a, 0.5, 0.06)
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
