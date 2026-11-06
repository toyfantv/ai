#!/usr/bin/env python3
"""Procedural score + sound design + narration mix for an episode.

Usage: python tools/audio.py ep06
Reads build/<ep>/timeline.json and build/<ep>/events.json (written by render.js),
writes build/<ep>/mix.wav (48 kHz stereo). Everything is synthesized here, so there
is nothing to license.
"""
import json
import sys

import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve, resample_poly

SR = 48000
rng = np.random.default_rng(6)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, 'low', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, 'high', fs=SR, output='sos'), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], 'band', fs=SR, output='sos'), x)


def env_adsr(n, a, r):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e


def reverb(x, secs=2.2, wet=0.35, seed=1):
    r = np.random.default_rng(seed)
    n = int(secs * SR)
    ir = r.standard_normal(n) * np.exp(-np.linspace(0, 7, n))
    ir = lp(ir, 6000)
    ir /= np.sqrt(np.sum(ir ** 2))
    y = fftconvolve(x, ir)[: len(x)]
    return x * (1 - wet) + y * wet


class Track:
    def __init__(self, dur):
        self.n = int(dur * SR) + SR
        self.L = np.zeros(self.n); self.R = np.zeros(self.n)

    def add(self, t, sig, gain=1.0, pan=0.0):
        i = int(t * SR)
        if i >= self.n or i + len(sig) <= 0: return
        if i < 0: sig = sig[-i:]; i = 0
        sig = sig[: self.n - i]
        self.L[i:i + len(sig)] += sig * gain * np.sqrt(0.5 * (1 - pan))
        self.R[i:i + len(sig)] += sig * gain * np.sqrt(0.5 * (1 + pan))

    def mono(self):
        return (self.L + self.R) * 0.5


def tt(d):
    return np.arange(int(d * SR)) / SR


# ---------- instruments ----------
def pad(freqs, d, a=1.5, r=2.0, bright=1800, detune=0.004):
    t = tt(d); x = np.zeros_like(t)
    for f in freqs:
        for k in (-1, 0, 1):
            ff = f * (1 + k * detune)
            ph = rng.random() * 6.28
            x += np.sin(2 * np.pi * ff * t + ph) + 0.35 * np.sin(4 * np.pi * ff * t + ph) + 0.15 * np.sin(6 * np.pi * ff * t)
    x = lp(x, bright) / (len(freqs) * 3)
    return x * env_adsr(len(x), a, r)


def bell(f, d=2.5):
    t = tt(d)
    x = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * dec) for m, a, dec in [(1, 1, 2.2), (2.76, 0.45, 4), (5.4, 0.25, 7), (8.9, 0.1, 10)])
    return x * env_adsr(len(x), 0.002, 0.3)


def whale(d=3.2, f0=190, f1=430, f2=250):
    t = tt(d)
    u = t / d
    f = np.where(u < 0.45, f0 + (f1 - f0) * np.sin(u / 0.45 * np.pi / 2), f1 + (f2 - f1) * np.clip((u - 0.45) / 0.55, 0, 1) ** 0.7)
    f = f * (1 + 0.012 * np.sin(2 * np.pi * 5.5 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.4 * np.sin(2 * ph) + 0.2 * np.sin(3 * ph)
    x = bp(x, 120, 1800) * np.sin(np.pi * u) ** 0.8
    return reverb(x, 3.5, 0.6, seed=3)


def noise(d, color='white'):
    x = rng.standard_normal(int(d * SR))
    if color == 'brown':
        x = np.cumsum(x); x = hp(x, 15); x /= np.max(np.abs(x)) + 1e-9
    return x


def impact(d=3.0, f0=95, f1=32, nz=0.6):
    t = tt(d)
    f = f1 + (f0 - f1) * np.exp(-t * 3)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.4)
    x += nz * lp(noise(d), 900) * np.exp(-t * 6)
    x += 0.5 * np.tanh(3 * np.sin(2 * np.pi * 45 * t)) * np.exp(-t * 2.5)
    return reverb(x, 2.5, 0.3, seed=5)


def water_whoosh(d=2.0):
    x = noise(d)
    t = tt(d)
    fc = 300 + 1500 * np.sin(np.pi * t / d)
    y = np.zeros_like(x)
    # crude moving band: blend two bands
    a, b = bp(x, 150, 600), bp(x, 600, 2500)
    m = (fc - 300) / 1500
    y = a * (1 - m) + b * m
    return y * np.sin(np.pi * t / d) ** 2


def footstep():
    d = 0.09; t = tt(d)
    x = bp(noise(d), 150, 2500) * np.exp(-t * 60) + 0.6 * np.sin(2 * np.pi * 90 * t) * np.exp(-t * 40)
    return x


def heartbeat():
    def thump(f, g):
        t = tt(0.22)
        return g * lp(np.sin(2 * np.pi * f * t) * np.exp(-t * 22), 200)
    x = np.zeros(int(0.6 * SR)); a = thump(52, 1.0); b = thump(46, 0.75)
    x[: len(a)] += a; i = int(0.24 * SR); x[i:i + len(b)] += b
    return x


def crackle(d, density=60, seed=9):
    r = np.random.default_rng(seed)
    x = np.zeros(int(d * SR))
    t = 0.0
    while t < d:
        t += r.exponential(1 / density)
        i = int(t * SR)
        if i >= len(x) - 4000: break
        n = int(r.uniform(0.004, 0.03) * SR)
        c = r.standard_normal(n) * np.exp(-np.linspace(0, 8, n)) * r.uniform(0.3, 1)
        x[i:i + n] += c
    return hp(x, 1200)


def glass_pings(d, n=25, seed=4):
    r = np.random.default_rng(seed); x = np.zeros(int(d * SR))
    for _ in range(n):
        i = int(r.uniform(0, d - 0.6) * SR); f = r.uniform(2000, 6000)
        tt_ = tt(0.6); s = np.sin(2 * np.pi * f * tt_) * np.exp(-tt_ * 12) * r.uniform(0.2, 0.6)
        x[i:i + len(s)] += s
    return x


def hz(note):
    return 440 * 2 ** ((note - 69) / 12)


# ---------- main ----------
def main():
    ep = sys.argv[1]
    d = f'build/{ep}'
    TL = json.load(open(f'{d}/timeline.json'))
    E = json.load(open(f'{d}/events.json'))['events']
    dur = TL['duration']
    S = {int(k): v for k, v in TL['scenes'].items()}
    music, sfx, voice = Track(dur), Track(dur), Track(dur)

    # --- narration ---
    for ln in TL['lines']:
        a, sr = sf.read(ln['file'])
        a = resample_poly(a, SR, sr)
        # level every line to the same loudness so whispers and quiet takes still sit on top
        rms = np.sqrt(np.mean(a[np.abs(a) > 0.01] ** 2)) if np.any(np.abs(a) > 0.01) else 1.0
        a = a * (0.12 / rms)
        a = np.clip(a, -0.98, 0.98)
        if ln['whisper']:
            # breathy whisper: voice + noise shaped by its own envelope, intimate reverb
            envl = lp(np.abs(a), 30)
            breath = bp(noise(len(a) / SR), 1500, 7000) * envl * 2.2
            a = hp(a, 160) * 0.8 + breath[: len(a)]
            a = reverb(a, 1.6, 0.35, seed=8)
            voice.add(ln['start'], a, 0.95, pan=-0.05)
        else:
            a = reverb(a, 1.0, 0.08, seed=7)
            voice.add(ln['start'], a, 1.0)

    # --- act 1: wonder (0 .. S4) ---
    music.add(0.0, pad([hz(n) for n in (50, 57, 62, 66, 69)], S[3] + 1.0, a=0.05, r=2.5, bright=2400), 0.55)   # D major-ish lydian
    music.add(S[2] - 0.5, pad([hz(n) for n in (55, 62, 67, 71, 74)], 4.5, a=1.2, r=1.5, bright=2600), 0.3)
    pent = [74, 76, 78, 81, 83, 86, 88, 90]
    r = np.random.default_rng(2)
    t = 0.4
    while t < S[3] + 1:
        dens = 0.18 if E['night0'] <= t < E['night1'] else 0.42
        music.add(t, bell(hz(pent[r.integers(len(pent))]), 2.2), 0.16, pan=r.uniform(-0.7, 0.7))
        t += dens + r.random() * 0.25
    sfx.add(0.0, impact(3.5, 70, 28, 0.4), 0.45)
    sfx.add(0.0, reverb(glass_pings(2.5, 14, seed=12), 2.5, 0.6), 0.25)
    for wt, f0, f1, f2, g in [(0.6, 180, 420, 240, 0.11), (3.6, 150, 360, 210, 0.1), (6.4, 230, 480, 300, 0.08), (14.0, 170, 380, 230, 0.06)]:
        sfx.add(wt, whale(3.4, f0, f1, f2), g, pan=r.uniform(-0.4, 0.4))
    amb = lp(noise(E['freeze'], 'brown'), 300) * 0.5 + 0.08 * bp(noise(E['freeze']), 300, 900)
    sfx.add(0, amb * env_adsr(len(amb), 0.3, 0.05), 0.07)
    sfx.add(0, lp(noise(E['freeze']), 2500) * 0.04, 1.0)  # wind / air

    # --- act 2: the rule, suspense (S3 .. freeze) ---
    dark = pad([hz(n) for n in (38, 45, 48, 53)], S[4] - S[3] + 1.5, a=1.5, r=1.0, bright=900)
    music.add(S[3] + 1.2, dark, 0.45)
    pulse_t = S[3] + 2.0
    while pulse_t < S[4]:
        music.add(pulse_t, impact(0.7, 60, 40, 0.0), 0.18); pulse_t += 0.75
    sfx.add(E['redPulse'] - 0.6, impact(2.5, 80, 30, 0.2), 0.35)
    tension = pad([hz(n) for n in (37, 44, 49, 52, 56)], E['freeze'] - S[4] + 0.2, a=2.5, r=0.08, bright=1400, detune=0.008)
    t2 = tt(len(tension) / SR); tension *= (0.4 + 0.6 * t2 / t2[-1])
    music.add(S[4], tension, 0.55)
    rumble = lp(noise(E['freeze'] - S[4], 'brown'), 90)
    sfx.add(S[4], rumble * np.linspace(0.2, 1, len(rumble)), 0.16)

    # --- act 3: silence and the thing beneath (freeze .. hands) ---
    stillt = E['hand1'] - E['freeze']
    eerie = sum(np.sin(2 * np.pi * f * tt(stillt)) for f in (1318.5, 1324.0)) * 0.5
    music.add(E['freeze'], eerie * env_adsr(len(eerie), 1.5, 0.5), 0.035)
    cosmic = lp(noise(dur - E['sil0'], 'brown'), 55) * 1.0 + 0.4 * np.sin(2 * np.pi * 36 * tt(dur - E['sil0']))
    cosmic *= env_adsr(len(cosmic), 2.5, 0.01)
    sfx.add(E['sil0'], cosmic, 0.16)
    sfx.add(E['sil0'] + 0.5, reverb(whale(4.5, 70, 110, 55), 4, 0.6), 0.25)   # distorted, deep "call"

    # --- act 4: hands ---
    for ht in (E['hand1'], E['hand2']):
        sfx.add(ht - 0.05, impact(4.0, 110, 26, 0.9), 0.45)
        sfx.add(ht - 0.6, water_whoosh(1.8), 0.35)
    t = E['harder']
    while t < E['run']:
        sfx.add(t, impact(1.6, 70, 30, 0.4), 0.22); t += 2 * np.pi / 3.4
    music.add(E['hand1'], pad([hz(n) for n in (36, 37, 43, 48)], E['run'] - E['hand1'] + 0.5, a=0.5, r=0.5, bright=700, detune=0.01), 0.45)

    # --- act 5: inside ---
    for i in range(22):
        tt_ = E['run'] + 0.05 + i * 0.105
        if tt_ > E['run'] + 2.3: break
        sfx.add(tt_, footstep(), 0.5 if i % 2 else 0.42, pan=0.1 if i % 2 else -0.1)
    t = E['run'] + 0.4
    while t < E['crack0']:
        bpm = 105 if t < E['reveal'] + 1 else 82
        sfx.add(t, heartbeat(), 0.3); t += 60 / bpm
    sting = sum(np.sin(2 * np.pi * f * tt(3.5)) for f in (880, 932.3, 1396.9)) / 3
    music.add(E['smile'] - 0.6, reverb(sting * env_adsr(len(sting), 0.05, 2.5), 2.5, 0.5), 0.07)
    hum = pad([hz(n) for n in (33, 40, 45)], E['crack0'] - E['reveal'], a=1.0, r=0.3, bright=400)
    music.add(E['reveal'], hum, 0.5)
    whisper_bed = bp(noise(E['crack0'] - E['mom']), 2500, 7000)
    whisper_bed *= 0.5 + 0.5 * np.sin(2 * np.pi * 0.7 * tt(len(whisper_bed) / SR)) ** 2
    sfx.add(E['mom'], reverb(whisper_bed, 2.5, 0.7) * env_adsr(len(whisper_bed), 1.0, 1.0), 0.04, pan=0.4)

    # --- act 6: the sky cracks ---
    cd = E['black'] - E['crack0']
    sfx.add(E['crack0'], impact(4.0, 120, 24, 1.0), 0.45)
    cr = crackle(cd, density=40)
    cr *= np.linspace(0.4, 1.0, len(cr)) ** 1.5
    sfx.add(E['crack0'], reverb(cr, 1.5, 0.3), 0.5)
    sfx.add(E['crack0'], reverb(glass_pings(cd, 40), 2.0, 0.4), 0.3)
    sfx.add(E['hole'] - 0.05, impact(3.0, 140, 22, 1.2), 1.1)
    sfx.add(E['hole'] - 0.05, crackle(0.8, density=400, seed=21), 0.9)
    riser = pad([hz(n) for n in (30, 31, 37)], E['black'] - E['eye0'] + 0.2, a=0.3, r=0.01, bright=600, detune=0.02)
    music.add(E['eye0'] - 0.2, riser, 0.9)
    music.add(E['crack0'], pad([hz(n) for n in (35, 41, 46, 47)], cd, a=0.3, r=0.01, bright=1200, detune=0.012), 0.5)

    # --- mix: voices always on top ---
    # Sidechain ducking: a smoothed voice envelope (fast attack, slow release) pulls music down by up to
    # MUSIC_DUCK dB and effects by up to SFX_DUCK dB whenever anyone is speaking.
    MUSIC_DUCK, SFX_DUCK, VOICE_GAIN = 15.0, 15.0, 1.6
    v = voice.mono()
    hop = int(0.01 * SR)
    frames = np.sqrt(np.convolve(v ** 2, np.ones(hop * 3) / (hop * 3), 'same')[::hop])
    active = (frames > 0.006).astype(float)
    sm = np.zeros_like(active); a_up, a_dn = 1 - np.exp(-1 / 3), 1 - np.exp(-1 / 35)   # ~30 ms attack, ~350 ms release
    for i in range(len(active)):
        prev = sm[i - 1] if i else 0.0
        sm[i] = prev + (a_up if active[i] > prev else a_dn) * (active[i] - prev)
    # look-ahead: start ducking 80 ms before the voice
    sm = np.maximum(sm, np.concatenate([sm[8:], np.zeros(8)]))
    k = np.interp(np.arange(len(v)), np.arange(len(sm)) * hop, sm)
    gm = 10 ** (-MUSIC_DUCK * k / 20); gs = 10 ** (-SFX_DUCK * k / 20)
    out = []
    for ch in (0, 1):
        m = (music.L, music.R)[ch] * 0.55 * gm + (sfx.L, sfx.R)[ch] * gs + (voice.L, voice.R)[ch] * VOICE_GAIN
        out.append(m)
    mix = np.stack(out, 1)[: int(dur * SR)]
    cut = int(E['black'] * SR)
    fade = int(0.02 * SR)
    mix[cut:cut + fade] *= np.linspace(1, 0, fade)[:, None][: len(mix[cut:cut + fade])]
    mix[cut + fade:] = 0
    # report speech-to-background ratio for every line (needs >= 10 dB)
    bg = ((music.mono() * 0.55 * gm + sfx.mono() * gs))[: len(mix)]
    vv = (v * VOICE_GAIN)[: len(mix)]
    worst = 99
    for ln in TL['lines']:
        a_, b_ = int(ln['start'] * SR), int(ln['end'] * SR)
        r = 20 * np.log10(np.sqrt(np.mean(vv[a_:b_] ** 2)) / (np.sqrt(np.mean(bg[a_:b_] ** 2)) + 1e-9))
        worst = min(worst, r)
        if '--debug' in sys.argv or r < 10: print(f'  {r:5.1f} dB  {ln["text"][:50]}')
    print(f'voice-over-background, worst line: {worst:.1f} dB')
    peak = np.max(np.abs(mix)) + 1e-9
    mix = np.tanh(mix / peak * 1.2) * 0.89
    sf.write(f'{d}/mix.wav', mix.astype(np.float32), SR)
    print('wrote', f'{d}/mix.wav', mix.shape[0] / SR, 's')


if __name__ == '__main__':
    main()
