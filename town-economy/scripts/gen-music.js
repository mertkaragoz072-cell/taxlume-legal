// One-off script that synthesizes the town's looping ambient background
// track (no external assets/network needed — see gen-sounds.js for the
// same convention applied to the short SFX). Run with: node scripts/gen-music.js
//
// Loop technique: render `LOOP_LEN + CROSSFADE` seconds of continuously
// evolving audio, then blend the crossfade-length "extra" tail back into
// the head with an equal-power fade. That makes the *join* seamless
// regardless of whether the underlying waveform is itself periodic, so the
// chord frequencies below don't need periods that evenly divide the loop
// length.
const fs = require("fs");
const path = require("path");

const SAMPLE_RATE = 22050; // matches gen-sounds.js; plenty above our ~2.4kHz top partial
const LOOP_LEN = 24.0; // seconds, final looped duration
const CROSSFADE = 3.0; // seconds, blended at the loop seam
const GEN_LEN = LOOP_LEN + CROSSFADE;
const N = Math.floor(SAMPLE_RATE * GEN_LEN);

function writeWav(filePath, samples) {
  const numSamples = samples.length;
  const buffer = Buffer.alloc(44 + numSamples * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(numSamples * 2, 40);
  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
}

// Deterministic PRNG (mulberry32) — Math.random() isn't seedable, and the
// melody's note schedule should regenerate identically every run.
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(42);
const choice = (arr) => arr[Math.floor(rng() * arr.length)];
const uniform = (lo, hi) => lo + rng() * (hi - lo);

function smoothstep(x) {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
}

// Warm I-vi-IV-V progression (C major), one chord per 6s, wrapping back to
// C for the extra crossfade tail beyond the loop point.
const CHORDS = {
  C: [130.81, 164.81, 196.0, 261.63], // C3 E3 G3 C4
  Am: [110.0, 130.81, 164.81, 220.0], // A2 C3 E3 A3
  F: [87.31, 110.0, 130.81, 174.61], // F2 A2 C3 F3
  G: [98.0, 123.47, 146.83, 196.0], // G2 B2 D3 G3
};
const SEQUENCE = ["C", "Am", "F", "G", "C"]; // 5th entry covers the crossfade tail
const SEG = 6.0;

// Detuned-sine pad for one chord: a few slightly-detuned partials per note
// give it body without needing a filter.
function chordSample(freqs, tLocal) {
  let out = 0;
  for (const f of freqs) {
    for (const detuneCents of [-0.4, 0, 0.4]) {
      const fh = f * Math.pow(2, detuneCents / 1200);
      out += Math.sin(2 * Math.PI * fh * tLocal) / (3 * freqs.length);
    }
  }
  return out;
}

// --- Pad: sum chord waves, crossfaded at each chord boundary ---
const pad = new Float64Array(N);
const xf = 1.2; // seconds of crossfade between adjacent chords
for (let i = 0; i < SEQUENCE.length; i++) {
  const name = SEQUENCE[i];
  const freqs = CHORDS[name];
  const segStart = i * SEG;
  const segEnd = segStart + SEG;
  const lo = Math.max(0, segStart - xf / 2);
  const hi = Math.min(GEN_LEN, segEnd + xf / 2);
  const iStart = Math.ceil(lo * SAMPLE_RATE);
  const iEnd = Math.min(N, Math.floor(hi * SAMPLE_RATE));
  for (let s = iStart; s < iEnd; s++) {
    const t = s / SAMPLE_RATE;
    let env = 1;
    if (i > 0 && t < segStart + xf / 2) {
      env = smoothstep((t - lo) / xf);
    }
    if (i < SEQUENCE.length - 1 && t >= segEnd - xf / 2) {
      env = smoothstep((hi - t) / xf);
    }
    pad[s] += chordSample(freqs, t) * env;
  }
}
// Slow tremolo (LFO) so the sustained pad feels alive rather than static.
// 4s period (a whole number of cycles over the 24s loop) keeps the tremolo
// itself loop-seamless even before the crossfade trim.
for (let s = 0; s < N; s++) {
  const t = s / SAMPLE_RATE;
  const lfo = 0.85 + 0.15 * Math.sin((2 * Math.PI * t) / 4.0);
  pad[s] *= lfo * 0.5; // *0.5 leaves headroom under the melody layer
}

// --- Melody: sparse bell/kalimba plucks on the chord's own pentatonic ---
const PENTATONIC = {
  C: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25],
  Am: [220.0, 246.94, 261.63, 329.63, 392.0, 440.0],
  F: [174.61, 196.0, 220.0, 261.63, 293.66, 349.23],
  G: [196.0, 220.0, 246.94, 293.66, 329.63, 392.0],
};

const melody = new Float64Array(N);
// A few inharmonic decaying partials read as a small bell/kalimba rather
// than a plain decaying sine.
const PARTIALS = [
  { mult: 1.0, decay: 2.2, weight: 1.0 },
  { mult: 2.01, decay: 3.4, weight: 0.35 },
  { mult: 3.03, decay: 5.0, weight: 0.15 },
];
function pluck(f, t0, dur, amp) {
  const iStart = Math.max(0, Math.floor(t0 * SAMPLE_RATE));
  const iEnd = Math.min(N, Math.floor((t0 + dur) * SAMPLE_RATE));
  for (let s = iStart; s < iEnd; s++) {
    const tl = s / SAMPLE_RATE - t0;
    let v = 0;
    for (const p of PARTIALS) {
      v += p.weight * Math.sin(2 * Math.PI * f * p.mult * tl) * Math.exp((-tl / p.decay) * 2.2);
    }
    melody[s] += v * amp;
  }
}
// Deterministic sparse note schedule: roughly one note every 1.6-3.2s,
// skipping a bit of the very start/end so the crossfade region stays
// uncluttered.
for (let noteTime = 0.8; noteTime < GEN_LEN - 1.0;) {
  const segI = Math.min(Math.floor(noteTime / SEG), SEQUENCE.length - 1);
  const scale = PENTATONIC[SEQUENCE[segI]];
  pluck(choice(scale), noteTime, 2.4, uniform(0.5, 0.9));
  noteTime += uniform(1.6, 3.2);
}
for (let s = 0; s < N; s++) melody[s] *= 0.16; // sit well under the pad

// --- Very soft filtered-noise air, barely-there outdoor texture ---
let noise = new Float64Array(N);
for (let s = 0; s < N; s++) noise[s] = rng() * 2 - 1;
// Cheap low-pass: repeated moving-average smoothing (no FFT/filter lib
// needed) — six passes of a 40-sample box average.
const KERNEL = 40;
for (let pass = 0; pass < 6; pass++) {
  const smoothed = new Float64Array(N);
  let sum = 0;
  for (let s = 0; s < N; s++) {
    sum += noise[s];
    if (s >= KERNEL) sum -= noise[s - KERNEL];
    smoothed[s] = sum / Math.min(s + 1, KERNEL);
  }
  noise = smoothed;
}
let noisePeak = 0;
for (let s = 0; s < N; s++) noisePeak = Math.max(noisePeak, Math.abs(noise[s]));
for (let s = 0; s < N; s++) noise[s] = (noise[s] / (noisePeak + 1e-9)) * 0.02;

const full = new Float64Array(N);
for (let s = 0; s < N; s++) full[s] = pad[s] + melody[s] + noise[s];

// --- Loop-seam crossfade: blend the "extra" tail back into the head ---
const headLen = Math.floor(SAMPLE_RATE * LOOP_LEN);
const xfN = N - headLen; // CROSSFADE seconds long
const looped = new Float64Array(headLen);
for (let s = 0; s < xfN; s++) {
  const fadeIn = Math.sin((smoothstep(s / xfN) * Math.PI) / 2); // equal-power
  const fadeOut = Math.cos((smoothstep(s / xfN) * Math.PI) / 2);
  looped[s] = full[headLen + s] * fadeOut + full[s] * fadeIn;
}
for (let s = xfN; s < headLen; s++) looped[s] = full[s];

// Normalize to a sane headroom (this plays under sound effects, keep it modest).
let peak = 0;
for (let s = 0; s < headLen; s++) peak = Math.max(peak, Math.abs(looped[s]));
for (let s = 0; s < headLen; s++) looped[s] = (looped[s] / peak) * 0.55;

const outPath = path.join(__dirname, "..", "assets", "sounds", "ambient.wav");
writeWav(outPath, looped);
console.log(
  `Wrote ambient track to ${outPath} (${(headLen / SAMPLE_RATE).toFixed(1)}s, peak was ${peak.toFixed(3)})`
);
