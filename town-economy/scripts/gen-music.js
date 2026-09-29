// One-off script that synthesizes the town's two looping ambient background
// tracks (no external assets/network needed — see gen-sounds.js for the same
// convention applied to the short SFX). Run with: node scripts/gen-music.js
//
// Two tracks, not one: the first version of this shipped a single 24s/4-chord
// loop, and a loop that short repeats often enough in a long idle-game
// session to become the thing a player mutes. This version doubles the loop
// length to 48s across an 8-chord progression (more harmonic movement before
// the ear notices the seam), adds a soft bass pulse under the pad for a
// little rhythmic life instead of a static wash, and renders a second track
// in a different key/mood — the app picks one at random per session, so
// repeat play sessions don't always hear the identical tune either.
//
// Loop technique (unchanged): render `LOOP_LEN + CROSSFADE` seconds of
// continuously evolving audio, then blend the crossfade-length "extra" tail
// back into the head with an equal-power fade. That makes the *join*
// seamless regardless of whether the underlying waveform is itself
// periodic, so the chord progression doesn't need a period that evenly
// divides the loop length.
const fs = require("fs");
const path = require("path");

const SAMPLE_RATE = 22050; // matches gen-sounds.js; plenty above our ~2.4kHz top partial
const SEG = 6.0; // seconds per chord
const CROSSFADE = 3.0; // seconds, blended at the loop seam

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

// Deterministic PRNG (mulberry32) — Math.random() isn't seedable, and each
// track's melody should regenerate identically every run.
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

function smoothstep(x) {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
}

// Six triads cover both tracks' progressions.
const CHORDS = {
  C: [130.81, 164.81, 196.0, 261.63], // C3 E3 G3 C4
  Dm: [146.83, 174.61, 220.0, 293.66], // D3 F3 A3 D4
  Em: [164.81, 196.0, 246.94, 329.63], // E3 G3 B3 E4
  F: [87.31, 110.0, 130.81, 174.61], // F2 A2 C3 F3
  G: [98.0, 123.47, 146.83, 196.0], // G2 B2 D3 G3
  Am: [110.0, 130.81, 164.81, 220.0], // A2 C3 E3 A3
};
// A chord's bass pulse plays its root one octave below the pad's own lowest
// note — grounds the harmony without muddying it.
const BASS_ROOT = {
  C: 65.41,
  Dm: 73.42,
  Em: 82.41,
  F: 43.65,
  G: 49.0,
  Am: 55.0,
};
const PENTATONIC = {
  C: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25],
  Dm: [293.66, 349.23, 392.0, 440.0, 523.25, 587.33],
  Em: [164.81, 196.0, 220.0, 246.94, 293.66, 329.63],
  F: [174.61, 196.0, 220.0, 261.63, 293.66, 349.23],
  G: [196.0, 220.0, 246.94, 293.66, 329.63, 392.0],
  Am: [220.0, 246.94, 261.63, 329.63, 392.0, 440.0],
};

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

// A few inharmonic decaying partials read as a small bell/kalimba rather
// than a plain decaying sine.
const BELL_PARTIALS = [
  { mult: 1.0, decay: 2.2, weight: 1.0 },
  { mult: 2.01, decay: 3.4, weight: 0.35 },
  { mult: 3.03, decay: 5.0, weight: 0.15 },
];
// Rounder, softer than the bell — fundamental plus a whisper of 2nd
// harmonic — so the rhythmic pulse reads as a soft upright-bass note, not
// another melodic voice competing with the bell.
const BASS_PARTIALS = [
  { mult: 1.0, decay: 2.0, weight: 1.0 },
  { mult: 2.0, decay: 1.2, weight: 0.12 },
];

function pluck(buf, n, f, t0, dur, amp, partials) {
  const iStart = Math.max(0, Math.floor(t0 * SAMPLE_RATE));
  const iEnd = Math.min(n, Math.floor((t0 + dur) * SAMPLE_RATE));
  for (let s = iStart; s < iEnd; s++) {
    const tl = s / SAMPLE_RATE - t0;
    let v = 0;
    for (const p of partials) {
      v += p.weight * Math.sin(2 * Math.PI * f * p.mult * tl) * Math.exp((-tl / p.decay) * 2.2);
    }
    buf[s] += v * amp;
  }
}

function renderTrack({ name, seed, sequence, outFile }) {
  const rng = mulberry32(seed);
  const choice = (arr) => arr[Math.floor(rng() * arr.length)];
  const uniform = (lo, hi) => lo + rng() * (hi - lo);

  const loopLen = sequence.length * SEG;
  const genLen = loopLen + CROSSFADE;
  const n = Math.floor(SAMPLE_RATE * genLen);
  // The sequence wraps to its own first chord for the extra crossfade tail
  // (what actually plays right after the loop point, before trimming).
  const fullSequence = [...sequence, sequence[0]];

  // --- Pad: sum chord waves, crossfaded at each chord boundary ---
  const pad = new Float64Array(n);
  const xf = 1.2; // seconds of crossfade between adjacent chords
  for (let i = 0; i < fullSequence.length; i++) {
    const freqs = CHORDS[fullSequence[i]];
    const segStart = i * SEG;
    const segEnd = segStart + SEG;
    const lo = Math.max(0, segStart - xf / 2);
    const hi = Math.min(genLen, segEnd + xf / 2);
    const iStart = Math.ceil(lo * SAMPLE_RATE);
    const iEnd = Math.min(n, Math.floor(hi * SAMPLE_RATE));
    for (let s = iStart; s < iEnd; s++) {
      const t = s / SAMPLE_RATE;
      let env = 1;
      if (i > 0 && t < segStart + xf / 2) env = smoothstep((t - lo) / xf);
      if (i < fullSequence.length - 1 && t >= segEnd - xf / 2) env = smoothstep((hi - t) / xf);
      pad[s] += chordSample(freqs, t) * env;
    }
  }
  // Slow tremolo (LFO) so the sustained pad feels alive rather than static.
  // 4s period (a whole number of cycles over any SEG-multiple loop) keeps
  // the tremolo itself loop-seamless even before the crossfade trim.
  for (let s = 0; s < n; s++) {
    const t = s / SAMPLE_RATE;
    const lfo = 0.85 + 0.15 * Math.sin((2 * Math.PI * t) / 4.0);
    pad[s] *= lfo * 0.42; // headroom under melody + bass
  }

  // --- Bass: a soft pulse on the chord's root, twice per chord (a gentle
  // "duh... duh" instead of a static pad) — the main new source of rhythmic
  // motion, aimed at not feeling like a static loop on a long play session.
  const bass = new Float64Array(n);
  for (let i = 0; i < fullSequence.length; i++) {
    const root = BASS_ROOT[fullSequence[i]];
    const segStart = i * SEG;
    pluck(bass, n, root, segStart, 3.2, 0.55, BASS_PARTIALS);
    pluck(bass, n, root, segStart + SEG / 2, 3.2, 0.4, BASS_PARTIALS);
  }

  // --- Melody: sparse bell/kalimba plucks on the chord's own pentatonic ---
  const melody = new Float64Array(n);
  for (let noteTime = 0.8; noteTime < genLen - 1.0;) {
    const segI = Math.min(Math.floor(noteTime / SEG), fullSequence.length - 1);
    const scale = PENTATONIC[fullSequence[segI]];
    pluck(melody, n, choice(scale), noteTime, 2.4, uniform(0.5, 0.9), BELL_PARTIALS);
    noteTime += uniform(1.5, 2.8);
  }
  for (let s = 0; s < n; s++) melody[s] *= 0.15; // sit well under the pad

  // --- Very soft filtered-noise air, barely-there outdoor texture ---
  let noise = new Float64Array(n);
  for (let s = 0; s < n; s++) noise[s] = rng() * 2 - 1;
  // Cheap low-pass: repeated moving-average smoothing (no FFT/filter lib
  // needed) — six passes of a 40-sample box average.
  const KERNEL = 40;
  for (let pass = 0; pass < 6; pass++) {
    const smoothed = new Float64Array(n);
    let sum = 0;
    for (let s = 0; s < n; s++) {
      sum += noise[s];
      if (s >= KERNEL) sum -= noise[s - KERNEL];
      smoothed[s] = sum / Math.min(s + 1, KERNEL);
    }
    noise = smoothed;
  }
  let noisePeak = 0;
  for (let s = 0; s < n; s++) noisePeak = Math.max(noisePeak, Math.abs(noise[s]));
  for (let s = 0; s < n; s++) noise[s] = (noise[s] / (noisePeak + 1e-9)) * 0.018;

  const full = new Float64Array(n);
  for (let s = 0; s < n; s++) full[s] = pad[s] + bass[s] + melody[s] + noise[s];

  // --- Loop-seam crossfade: blend the "extra" tail back into the head ---
  const headLen = Math.floor(SAMPLE_RATE * loopLen);
  const xfN = n - headLen; // CROSSFADE seconds long
  const looped = new Float64Array(headLen);
  for (let s = 0; s < xfN; s++) {
    const fadeIn = Math.sin((smoothstep(s / xfN) * Math.PI) / 2); // equal-power
    const fadeOut = Math.cos((smoothstep(s / xfN) * Math.PI) / 2);
    looped[s] = full[headLen + s] * fadeOut + full[s] * fadeIn;
  }
  for (let s = xfN; s < headLen; s++) looped[s] = full[s];

  // Normalize to a modest headroom — a touch quieter than the first version
  // (0.5 vs 0.55), since a track meant to sit under an entire play session
  // should read as background, not compete for attention.
  let peak = 0;
  for (let s = 0; s < headLen; s++) peak = Math.max(peak, Math.abs(looped[s]));
  for (let s = 0; s < headLen; s++) looped[s] = (looped[s] / peak) * 0.5;

  const outPath = path.join(__dirname, "..", "assets", "sounds", outFile);
  writeWav(outPath, looped);
  console.log(
    `Wrote "${name}" to ${outPath} (${(headLen / SAMPLE_RATE).toFixed(1)}s, peak was ${peak.toFixed(3)})`
  );
}

// Track A: warm C-major progression with real harmonic movement
// (I-V-vi-iii-IV-I-ii-V) rather than a simple 4-chord vamp.
renderTrack({
  name: "morning-market",
  seed: 42,
  sequence: ["C", "G", "Am", "Em", "F", "C", "Dm", "G"],
  outFile: "ambient-a.wav",
});

// Track B: A-minor, a little more wistful, different enough from A that
// hearing it on a later session doesn't feel like "the same loop again."
renderTrack({
  name: "golden-dusk",
  seed: 137,
  sequence: ["Am", "F", "C", "G", "Dm", "Am", "Em", "F"],
  outFile: "ambient-b.wav",
});
