#!/usr/bin/env python3
"""Synthesises the game's sound effects and the two music loops.

    python3 scripts/gen-audio.py

Everything is built from scratch (no samples): plucked-string and marimba-like
additive voices, inharmonic coin/bell partials, a breathy flute, soft pads and
shakers, then run through a small stereo room reverb and a soft limiter.
Output: assets/sounds/*.wav (effects) and assets/sounds/ambient-{a,b}.m4a
(music, encoded with ffmpeg). Seeded, so it renders identically every time.
"""
import os
import subprocess
import wave

import numpy as np
from scipy import signal

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "sounds")
rng = np.random.default_rng(7)


# ------------------------------------------------------------------ helpers
def t_axis(dur):
    return np.arange(int(SR * dur)) / SR


def adsr(n, a=0.005, d=0.1, s=0.6, r=0.1):
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    env = np.ones(n) * s
    a = min(a, n)
    env[:a] = np.linspace(0, 1, a, endpoint=False)
    d_end = min(a + d, n)
    env[a:d_end] = np.linspace(1, s, d_end - a, endpoint=False)
    r = min(r, n)
    env[n - r:] *= np.linspace(1, 0, r)
    return env


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lowpass(x, fc, order=2):
    sos = signal.butter(order, fc / (SR / 2), "low", output="sos")
    return signal.sosfilt(sos, x, axis=0)


def highpass(x, fc, order=2):
    sos = signal.butter(order, fc / (SR / 2), "high", output="sos")
    return signal.sosfilt(sos, x, axis=0)


def pan(mono, p):
    """p in [-1, 1] -> (n, 2) with equal-power panning."""
    ang = (p + 1) * np.pi / 4
    return np.stack([mono * np.cos(ang), mono * np.sin(ang)], axis=1)


def place(buf, clip, start):
    i = int(start * SR)
    end = min(len(buf), i + len(clip))
    if i < len(buf):
        buf[i:end] += clip[: end - i]


def add(*clips):
    """Sum clips of different lengths."""
    n = max(len(c) for c in clips)
    out = np.zeros(n)
    for c in clips:
        out[: len(c)] += c
    return out


def pluck(f, dur=1.6, bright=1.0, decay=3.0):
    """Lute / marimba-ish: harmonics that die faster the higher they are."""
    t = t_axis(dur)
    x = np.zeros_like(t)
    for h in range(1, 14):
        amp = (1.0 / h ** 1.15) * bright ** (h - 1)
        x += amp * np.sin(2 * np.pi * f * h * t) * np.exp(-t * decay * (1 + 0.55 * (h - 1)))
    x *= adsr(len(t), 0.002, 0.05, 1.0, 0.05)
    return x


def bell(f, dur=1.2, decay=5.0, ratios=(1, 2.76, 5.4, 8.93), amps=(1, 0.55, 0.3, 0.15)):
    t = t_axis(dur)
    x = np.zeros_like(t)
    for r, a in zip(ratios, amps):
        x += a * np.sin(2 * np.pi * f * r * t + rng.uniform(0, 6)) * np.exp(-t * decay * (0.7 + 0.45 * r ** 0.5))
    return x * adsr(len(t), 0.001, 0.02, 1.0, 0.04)


def coin(f, dur=0.5):
    """Short bright metal 'tink': strongly inharmonic, very fast attack."""
    t = t_axis(dur)
    x = np.zeros_like(t)
    for r, a, d in ((1, 1, 9), (1.504, 0.7, 11), (2.74, 0.55, 14), (4.18, 0.4, 18), (6.9, 0.25, 26)):
        x += a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d)
    n = highpass(rng.normal(0, 1, len(t)), 4000) * np.exp(-t * 90) * 0.35
    return (x + n) * adsr(len(t), 0.0007, 0.01, 1.0, 0.03)


def flute(f, dur, vib=5.0):
    t = t_axis(dur)
    vdepth = np.clip(t / 0.35, 0, 1) * 0.0045
    ph = 2 * np.pi * np.cumsum(f * (1 + vdepth * np.sin(2 * np.pi * vib * t))) / SR
    x = np.sin(ph) + 0.28 * np.sin(2 * ph) + 0.08 * np.sin(3 * ph)
    breath = lowpass(highpass(rng.normal(0, 1, len(t)), 1800), 5500) * 0.05
    return (x + breath) * adsr(len(t), 0.04, 0.08, 0.8, 0.12)


def brass(f, dur):
    t = t_axis(dur)
    x = np.zeros_like(t)
    swell = np.clip(t / 0.12, 0, 1)
    for h in range(1, 12):
        x += (1.0 / h) * (swell ** (0.6 + h * 0.18)) * np.sin(2 * np.pi * f * h * t + 0.3 * h)
    return x * adsr(len(t), 0.03, 0.12, 0.75, 0.25)


def pad(f, dur):
    t = t_axis(dur)
    x = np.zeros_like(t)
    for det in (-0.004, 0.0, 0.004):
        x += np.sin(2 * np.pi * f * (1 + det) * t + rng.uniform(0, 6))
        x += 0.35 * np.sin(2 * np.pi * 2 * f * (1 + det) * t + rng.uniform(0, 6))
    x *= 0.5 + 0.1 * np.sin(2 * np.pi * 0.23 * t + rng.uniform(0, 6))
    return lowpass(x, 1400) * adsr(len(t), 0.9, 0.2, 0.9, 1.1)


def soft_drum(dur=0.35, f0=95):
    t = t_axis(dur)
    f = f0 * (1 + 1.6 * np.exp(-t * 28))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11)
    return x + 0.1 * lowpass(rng.normal(0, 1, len(t)), 900) * np.exp(-t * 40)


def shaker(dur=0.12):
    t = t_axis(dur)
    n = highpass(rng.normal(0, 1, len(t)), 5500)
    return n * np.exp(-t * 38) * np.clip(t / 0.006, 0, 1)


def room(dur=1.8, decay=3.2, damp=5200, wet_pre=0.012):
    n = int(SR * dur)
    t = np.arange(n) / SR
    ir = np.zeros((n, 2))
    for c in range(2):
        noise = rng.normal(0, 1, n) * np.exp(-t * decay)
        noise = lowpass(noise, damp, 1)
        ir[:, c] = noise
    ir[: int(wet_pre * SR)] = 0
    ir /= np.sqrt((ir ** 2).sum()) + 1e-9
    return ir


def reverb(x, wet=0.22, **kw):
    ir = room(**kw)
    out = np.zeros((len(x) + len(ir) - 1, 2))
    for c in range(2):
        out[:, c] = signal.fftconvolve(x[:, c], ir[:, c])
    dry = np.zeros_like(out)
    dry[: len(x)] = x
    return dry * (1 - wet) + out * wet * 3.2


def limit(x, ceiling=0.89):
    """Soft saturation, then a hard ceiling."""
    x = np.tanh(x * 1.15) / np.tanh(1.15)
    peak = np.abs(x).max()
    return x * (ceiling / peak) if peak > ceiling else x


def set_rms(x, target_db):
    rms = np.sqrt((x ** 2).mean()) + 1e-9
    return x * (10 ** (target_db / 20) / rms)


def to_stereo(x):
    return x if x.ndim == 2 else np.stack([x, x], axis=1)


def write_wav(path, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def fade_edges(x, ms=6):
    n = int(SR * ms / 1000)
    x = x.copy()
    x[:n] *= np.linspace(0, 1, n)[:, None]
    x[-n:] *= np.linspace(1, 0, n)[:, None]
    return x


# ------------------------------------------------------------------ effects
def sfx(name, x, wet=0.18, rms_db=-19.0, ceiling=0.5, **rv):
    x = to_stereo(x)
    x = np.vstack([x, np.zeros((int(SR * 0.9), 2))])
    x = reverb(x, wet=wet, **rv) if wet else x
    x = set_rms(x, rms_db)
    x = limit(x, ceiling)
    # trim where the tail has fallen 45 dB under the peak, then fade out
    keep = np.nonzero(np.abs(x).max(axis=1) > np.abs(x).max() * 0.0056)[0][-1] + 1
    x = x[:keep]
    fo = min(len(x), int(SR * 0.08))
    x[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 2
    x = fade_edges(x, 4)
    write_wav(os.path.join(OUT, name + ".wav"), x)
    print(f"{name}: {len(x)/SR:.2f}s peak {np.abs(x).max():.2f}")


def build_sfx():
    # buy: coins leaving the purse -> two quick low-ish clinks
    b = np.zeros((int(SR * 0.7), 2))
    place(b, pan(coin(1850, 0.4), -0.25), 0.0)
    place(b, pan(coin(1480, 0.45) * 0.8, 0.2), 0.065)
    place(b, pan(bell(784, 0.5, 9) * 0.18, 0.0), 0.0)
    sfx("buy", b, wet=0.16, rms_db=-24, dur=0.7, decay=6)

    # sell: cha-ching, a bright rising pair plus a little shimmer
    s = np.zeros((int(SR * 1.0), 2))
    place(s, pan(coin(2200, 0.45), -0.2), 0.0)
    place(s, pan(coin(2640, 0.5), 0.2), 0.07)
    place(s, pan(bell(1318, 0.9, 5) * 0.32, 0.0), 0.09)
    place(s, pan(bell(1976, 0.8, 6) * 0.2, 0.15), 0.15)
    sfx("sell", s, wet=0.2, rms_db=-23, dur=0.9, decay=5)

    # event: soft double marimba note
    e = np.zeros((int(SR * 1.1), 2))
    place(e, pan(pluck(midi(79), 0.9, 0.55, 5.5), -0.1), 0.0)
    place(e, pan(pluck(midi(84), 1.0, 0.5, 5.0) * 0.8, 0.1), 0.13)
    sfx("event", e, wet=0.24, rms_db=-25, dur=1.0, decay=4.5)

    # success: rising three-note chime
    c = np.zeros((int(SR * 1.5), 2))
    for i, m in enumerate((72, 76, 79)):
        place(c, pan(add(bell(midi(m), 1.1, 4.2) * 0.8, pluck(midi(m + 12), 0.7, 0.5, 6) * 0.25), (i - 1) * 0.3), 0.09 * i)
    place(c, pan(bell(midi(88), 1.0, 4) * 0.25, 0), 0.3)
    sfx("success", c, wet=0.26, rms_db=-24, dur=1.2, decay=4)

    # tap: very short wooden tick for tab changes
    t = t_axis(0.09)
    tick = (np.sin(2 * np.pi * 520 * t) * np.exp(-t * 70) + 0.4 * np.sin(2 * np.pi * 1180 * t) * np.exp(-t * 110)) * adsr(len(t), 0.0008, 0.01, 1, 0.01)
    sfx("tap", tick, wet=0, rms_db=-30, ceiling=0.3)

    # crash: low thud, a falling detuned drone and a dark noise sweep
    t = t_axis(2.4)
    f = 150 * np.exp(-t * 0.55)
    drone = (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.8 * np.sin(2 * np.pi * np.cumsum(f * 1.0595) / SR)) * np.exp(-t * 1.1)
    sweep = lowpass(rng.normal(0, 1, len(t)), 700) * np.exp(-t * 1.6) * 0.5
    thud = soft_drum(0.5, 70) * 1.4
    x = drone * 0.5 + sweep
    x[: len(thud)] += thud
    sfx("crash", x, wet=0.24, rms_db=-22, ceiling=0.6, decay=3)

    # fanfare: a little brass arpeggio resolving on a major chord, bell on top
    d = np.zeros((int(SR * 3.4), 2))
    for i, m in enumerate((60, 64, 67, 72)):
        place(d, pan(brass(midi(m), 0.5 + 0.1 * i) * 0.55, (i - 1.5) * 0.15), 0.13 * i)
    for m in (60, 64, 67, 72, 76):
        place(d, pan(brass(midi(m), 1.9) * 0.4, (m - 66) * 0.03), 0.62)
    place(d, pan(bell(midi(96), 1.8, 3.5) * 0.3, 0.1), 0.62)
    place(d, pan(bell(midi(91), 1.6, 3.5) * 0.22, -0.1), 0.7)
    place(d, pan(soft_drum(0.5, 80) * 0.8, 0), 0.62)
    sfx("fanfare", d, wet=0.3, rms_db=-22, ceiling=0.6, decay=3)


# ------------------------------------------------------------------- music
def build_track(name, root, prog, bpm, melody_seed, scale, shaker_amp=0.5):
    spb = 60.0 / bpm
    bars = len(prog) * 4
    length = bars * 4 * spb
    n = int(SR * length)
    tail = int(SR * 3.0)
    mix = np.zeros((n + tail, 2))
    r = np.random.default_rng(melody_seed)
    for bar in range(bars):
        chord = prog[bar % len(prog)]  # list of semitone offsets from root, bass first
        t0 = bar * 4 * spb
        # pad
        for k in chord[1:]:
            place(mix, pan(pad(midi(root + 12 + k), 4 * spb + 1.0) * 0.1, r.uniform(-0.5, 0.5)), t0)
        # bass pluck on 1 and 3
        place(mix, pan(pluck(midi(root - 12 + chord[0]), 1.4, 0.35, 2.6) * 0.5, -0.1), t0)
        place(mix, pan(pluck(midi(root - 12 + chord[0]), 1.0, 0.35, 3.2) * 0.35, -0.1), t0 + 2 * spb)
        # lute arpeggio, eighth notes
        pattern = [0, 2, 1, 2, 3, 2, 1, 2] if bar % 2 == 0 else [0, 1, 2, 3, 2, 1, 2, 1]
        tones = [chord[1], chord[2], chord[3] if len(chord) > 3 else chord[1] + 12, chord[1] + 12]
        for i, p in enumerate(pattern):
            vel = 0.5 if i % 2 == 0 else 0.34
            place(mix, pan(pluck(midi(root + 12 + tones[p]), 1.1, 0.55, 3.6) * vel * 0.5, 0.25), t0 + i * spb / 2)
        # soft percussion
        place(mix, pan(soft_drum() * 0.22, 0), t0)
        place(mix, pan(soft_drum(0.3, 110) * 0.12, 0), t0 + 2 * spb)
        for i in range(8):
            place(mix, pan(shaker() * shaker_amp * (0.1 if i % 2 else 0.05), 0.35), t0 + i * spb / 2 + spb / 4)
    # melody: two-bar phrases from the scale, long notes, answered in the second half
    notes_per_phrase = 4
    motif = [r.choice(len(scale)) for _ in range(notes_per_phrase)]
    pos = 0.0
    phrase = 0
    while pos < length - 2 * spb:
        if phrase % 4 == 3:
            pos += 4 * spb  # a breath
            phrase += 1
            continue
        if phrase % 2 == 1:
            motif = [min(len(scale) - 1, max(0, m + r.choice([-1, 0, 1]))) for m in motif]
        for m in motif:
            dur = r.choice([1.0, 1.5, 2.0]) * spb
            if pos + dur > length:
                break
            place(mix, pan(flute(midi(root + 24 + scale[m]), dur + 0.25) * 0.2, -0.15), pos)
            pos += dur + (0.5 * spb if r.random() < 0.4 else 0)
        phrase += 1
        pos += spb
    mix = reverb(mix, wet=0.3, dur=2.4, decay=2.0)
    mix = mix[: n + tail]
    # loop seam: fold the reverb tail back onto the start
    body = mix[:n].copy()
    body[: min(tail, n)] += mix[n : n + min(tail, n)]
    body = highpass(body, 55)
    body = set_rms(body, -22)
    body = limit(body, 0.8)
    wav_path = os.path.join(OUT, name + ".wav")
    write_wav(wav_path, body)
    m4a = os.path.join(OUT, name + ".m4a")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav_path, "-c:a", "aac", "-b:a", "112k", m4a], check=True)
    os.remove(wav_path)
    print(f"{name}: {length:.1f}s, {os.path.getsize(m4a)//1024} KB")


def build_music():
    # D major pentatonic over I - V - vi - IV (bass note first, then the chord)
    prog_a = [[0, 0, 4, 7], [-5, -5, 2, 7], [-3, -3, 0, 4], [-7, -7, -3, 2]]
    build_track("ambient-a", 62, prog_a, 84, 11, [0, 2, 4, 7, 9, 12])
    # G major, a touch slower and warmer: I - vi - IV - V
    prog_b = [[0, 0, 4, 7], [-3, -3, 0, 4], [-7, -7, -3, 2], [-5, -5, 2, 7]]
    build_track("ambient-b", 55, prog_b, 76, 23, [0, 2, 4, 7, 9, 12])


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    build_sfx()
    build_music()
