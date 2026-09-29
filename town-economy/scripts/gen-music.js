// One-off script that synthesizes the town's two looping ambient background
// tracks (no external assets/network needed — see gen-sounds.js for the same
// convention applied to the short SFX). Run with: node scripts/gen-music.js
//
// Three passes so far. The first shipped a single 24s/4-chord mono loop —
// too short, repeated too often on a long idle session. The second doubled
// the loop to 48s/8 chords and added a bass pulse for rhythmic life, but
// kept the underlying tone plain detuned sines with nowhere for the sound
// to breathe — reported back as "hasn't really changed, still doesn't sound
// modern." This pass keeps the same chord progressions and loop-seam
// technique but rebuilds the actual production: real stereo (not a mono
// signal duplicated to two channels), a soft-saturated warmer pad tone
// instead of bare sines, a proper algorithmic reverb (Freeverb-style
// parallel combs + series allpasses) so the pad has room to sit in, and a
// ping-pong stereo delay on the melody instead of a dry mono pluck. Those
// four are what a listener actually hears as "produced" vs. "synthesized."
//
// Loop technique (unchanged): render `LOOP_LEN + CROSSFADE` seconds of
// continuously evolving audio, then blend the crossfade-length "extra" tail
// back into the head with an equal-power fade. That makes the *join*
// seamless regardless of whether the underlying waveform is itself
// periodic, so the chord progression doesn't need a period that evenly
// divides the loop length. Now applied per channel.
const fs = require("fs");
const path = require("path");

const SAMPLE_RATE = 22050; // plenty above our ~3kHz top partial + reverb tail
const SEG = 6.0; // seconds per chord
const CROSSFADE = 3.0; // seconds, blended at the loop seam

function writeWavStereo(filePath, left, right) {
  const numSamples = left.length;
  const buffer = Buffer.alloc(44 + numSamples * 4);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + numSamples * 4, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(2, 22); // stereo
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 4, 28); // byte rate = rate * blockAlign
  buffer.writeUInt16LE(4, 32); // block align: 2 channels * 16 bits
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(numSamples * 4, 40);
  for (let i = 0; i < numSamples; i++) {
    const l = Math.max(-1, Math.min(1, left[i]));
    const r = Math.max(-1, Math.min(1, right[i]));
    buffer.writeInt16LE(Math.round(l * 32767), 44 + i * 4);
    buffer.writeInt16LE(Math.round(r * 32767), 44 + i * 4 + 2);
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

// Slightly different detune sets per ear — not a mono pad panned to both
// channels, but two independently-detuned renders of the same chord, which
// is what actually gives width (identical L/R content collapses back to
// mono the moment headphones are off).
const DETUNE_L = [-0.6, 0, 0.6];
const DETUNE_R = [-0.9, 0.3, 0.9];

// Fundamental plus a soft second harmonic (rounder than a bare sine, short
// of a full saw) run through gentle tanh saturation — the saturation is
// what keeps a stack of near-unison oscillators from just summing into a
// louder sine; it glues them into one warmer tone instead.
function chordSample(freqs, tLocal, detunes) {
  let out = 0;
  for (const f of freqs) {
    for (const c of detunes) {
      const fh = f * Math.pow(2, c / 1200);
      out +=
        (Math.sin(2 * Math.PI * fh * tLocal) + 0.16 * Math.sin(4 * Math.PI * fh * tLocal)) / detunes.length;
    }
  }
  out /= freqs.length;
  return Math.tanh(out * 1.6) * 0.82;
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

// --- Reverb: Freeverb-style parallel comb filters into series allpasses.
// Comb delay/allpass-delay lengths are the classic Freeverb tuning values
// (specified at 44.1kHz), scaled down to our sample rate. Two calls with
// different `spread` offsets on the same dry send produce decorrelated L/R
// tails — the thing that actually reads as "a room" instead of a mono echo
// panned down the middle.
const COMB_TUNINGS_44K = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116];
const ALLPASS_TUNINGS_44K = [556, 441, 341, 225];

function combFilter(input, delaySamples, feedback, damp) {
  const n = input.length;
  const out = new Float64Array(n);
  const buf = new Float64Array(delaySamples);
  let idx = 0;
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const delayed = buf[idx];
    lp = delayed * (1 - damp) + lp * damp;
    buf[idx] = input[i] + feedback * lp;
    out[i] = delayed;
    idx = idx + 1 === delaySamples ? 0 : idx + 1;
  }
  return out;
}

function allpassFilter(input, delaySamples, gain) {
  const n = input.length;
  const out = new Float64Array(n);
  const buf = new Float64Array(delaySamples);
  let idx = 0;
  for (let i = 0; i < n; i++) {
    const bufOut = buf[idx];
    const x = input[i];
    const y = bufOut - gain * x;
    buf[idx] = x + gain * y;
    out[i] = y;
    idx = idx + 1 === delaySamples ? 0 : idx + 1;
  }
  return out;
}

function reverb(input, spreadSamples) {
  const scale = SAMPLE_RATE / 44100;
  let sum = new Float64Array(input.length);
  for (const t of COMB_TUNINGS_44K) {
    const d = Math.max(2, Math.round(t * scale) + spreadSamples);
    const combed = combFilter(input, d, 0.82, 0.22);
    for (let i = 0; i < sum.length; i++) sum[i] += combed[i] / COMB_TUNINGS_44K.length;
  }
  let out = sum;
  for (const t of ALLPASS_TUNINGS_44K) {
    const d = Math.max(2, Math.round(t * scale) + spreadSamples);
    out = allpassFilter(out, d, 0.5);
  }
  return out;
}

// Ping-pong delay: each successive echo lands on the opposite channel from
// the last — the melody's plucks were dry and centered before, which reads
// as "synthesized." A few bouncing, decaying repeats read as a mixed track.
function pingPongEcho(mono, delayMs, feedback, taps) {
  const n = mono.length;
  const delaySamples = Math.round((SAMPLE_RATE * delayMs) / 1000);
  const L = new Float64Array(n);
  const R = new Float64Array(n);
  let gain = 1;
  let onLeft = true;
  for (let t = 0; t < taps; t++) {
    gain *= feedback;
    const shift = delaySamples * (t + 1);
    const target = onLeft ? L : R;
    for (let i = 0; i + shift < n; i++) target[i + shift] += mono[i] * gain;
    onLeft = !onLeft;
  }
  return { L, R };
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

  // --- Pad: sum chord waves, crossfaded at each chord boundary, rendered
  // twice with independent detune sets for real stereo width.
  const padL = new Float64Array(n);
  const padR = new Float64Array(n);
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
      padL[s] += chordSample(freqs, t, DETUNE_L) * env;
      padR[s] += chordSample(freqs, t, DETUNE_R) * env;
    }
  }
  // Slow tremolo (LFO) so the sustained pad feels alive rather than static.
  // 4s period (a whole number of cycles over any SEG-multiple loop) keeps
  // the tremolo itself loop-seamless even before the crossfade trim.
  for (let s = 0; s < n; s++) {
    const t = s / SAMPLE_RATE;
    const lfo = 0.85 + 0.15 * Math.sin((2 * Math.PI * t) / 4.0);
    padL[s] *= lfo * 0.42; // headroom under melody + bass
    padR[s] *= lfo * 0.42;
  }

  // --- Bass: a soft pulse on the chord's root, twice per chord (a gentle
  // "duh... duh" instead of a static pad), kept centered and mono like most
  // mixed tracks keep their low end — width down there just reads as flabby.
  const bass = new Float64Array(n);
  for (let i = 0; i < fullSequence.length; i++) {
    const root = BASS_ROOT[fullSequence[i]];
    const segStart = i * SEG;
    pluck(bass, n, root, segStart, 3.2, 0.55, BASS_PARTIALS);
    pluck(bass, n, root, segStart + SEG / 2, 3.2, 0.4, BASS_PARTIALS);
  }
  for (let s = 0; s < n; s++) bass[s] = Math.tanh(bass[s] * 1.4) * 0.75;

  // --- Melody: sparse bell/kalimba plucks, dry mono source, then split
  // into a centered dry signal plus a ping-pong stereo echo.
  const melodyDry = new Float64Array(n);
  for (let noteTime = 0.8; noteTime < genLen - 1.0;) {
    const segI = Math.min(Math.floor(noteTime / SEG), fullSequence.length - 1);
    const scale = PENTATONIC[fullSequence[segI]];
    pluck(melodyDry, n, choice(scale), noteTime, 2.4, uniform(0.5, 0.9), BELL_PARTIALS);
    noteTime += uniform(1.5, 2.8);
  }
  for (let s = 0; s < n; s++) melodyDry[s] *= 0.15; // sit well under the pad
  const echo = pingPongEcho(melodyDry, 340, 0.42, 4);

  // --- Very soft filtered-noise air, barely-there outdoor texture — two
  // independently-seeded channels (the rng stream naturally decorrelates
  // consecutive draws) for the same "real stereo, not duplicated mono" rule
  // as the pad above.
  function airChannel() {
    let noise = new Float64Array(n);
    for (let s = 0; s < n; s++) noise[s] = rng() * 2 - 1;
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
    let peak = 0;
    for (let s = 0; s < n; s++) peak = Math.max(peak, Math.abs(noise[s]));
    for (let s = 0; s < n; s++) noise[s] = (noise[s] / (peak + 1e-9)) * 0.018;
    return noise;
  }
  const noiseL = airChannel();
  const noiseR = airChannel();

  // --- Reverb send: pad (both channels averaged) plus melody, glued
  // together and run through two decorrelated reverb tails — this is what
  // gives the mix a sense of physical space instead of dry synth voices
  // stacked on top of each other.
  const sendMono = new Float64Array(n);
  for (let s = 0; s < n; s++) sendMono[s] = (padL[s] + padR[s]) * 0.5 * 0.9 + melodyDry[s] * 0.7;
  const wetL = reverb(sendMono, 0);
  const wetR = reverb(sendMono, 37);
  const WET_MIX = 0.32;

  const fullL = new Float64Array(n);
  const fullR = new Float64Array(n);
  for (let s = 0; s < n; s++) {
    fullL[s] = padL[s] + bass[s] + melodyDry[s] * 0.6 + echo.L[s] + noiseL[s] + wetL[s] * WET_MIX;
    fullR[s] = padR[s] + bass[s] + melodyDry[s] * 0.6 + echo.R[s] + noiseR[s] + wetR[s] * WET_MIX;
  }

  // --- Loop-seam crossfade: blend the "extra" tail back into the head,
  // applied independently per channel.
  const headLen = Math.floor(SAMPLE_RATE * loopLen);
  const xfN = n - headLen; // CROSSFADE seconds long
  function loopChannel(full) {
    const looped = new Float64Array(headLen);
    for (let s = 0; s < xfN; s++) {
      const fadeIn = Math.sin((smoothstep(s / xfN) * Math.PI) / 2); // equal-power
      const fadeOut = Math.cos((smoothstep(s / xfN) * Math.PI) / 2);
      looped[s] = full[headLen + s] * fadeOut + full[s] * fadeIn;
    }
    for (let s = xfN; s < headLen; s++) looped[s] = full[s];
    return looped;
  }
  const loopedL = loopChannel(fullL);
  const loopedR = loopChannel(fullR);

  // Normalize both channels by the same factor (preserves stereo balance)
  // to a modest headroom — background music shouldn't compete for
  // attention with the rest of the mix.
  let peak = 0;
  for (let s = 0; s < headLen; s++) {
    peak = Math.max(peak, Math.abs(loopedL[s]), Math.abs(loopedR[s]));
  }
  for (let s = 0; s < headLen; s++) {
    loopedL[s] = (loopedL[s] / peak) * 0.5;
    loopedR[s] = (loopedR[s] / peak) * 0.5;
  }

  const outPath = path.join(__dirname, "..", "assets", "sounds", outFile);
  writeWavStereo(outPath, loopedL, loopedR);
  console.log(
    `Wrote "${name}" to ${outPath} (${(headLen / SAMPLE_RATE).toFixed(1)}s stereo, peak was ${peak.toFixed(3)})`
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
