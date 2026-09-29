// One-off script that synthesizes the town's two looping background music
// tracks (no external assets/network needed — see gen-sounds.js for the same
// convention applied to the short SFX). Run with: node scripts/gen-music.js
//
// Four passes so far, and worth recording why each one changed. (1) shipped
// a single 24s/4-chord mono loop — too short, repeated too often on a long
// idle session. (2) doubled the loop to 48s/8 chords and added a bass pulse,
// but kept the underlying tone plain detuned sines with nowhere to breathe —
// reported back as still not sounding modern. (3) chased "modern" by adding
// real stereo, warmer saturated tone, and a proper algorithmic reverb on a
// *sustained* pad — and that combination (long detuned unison notes slowly
// beating against each other, under a long cavernous reverb tail, plus
// deliberately inharmonic bell partials) is, it turns out, close to the
// standard horror-ambience recipe. Reported back as flatly "eerie."
//
// This pass keeps what (3) got right (real stereo, warm saturated tone, a
// touch of reverb, a stereo delay) but throws out the part that was actually
// causing the problem: the long sustained drone. In its place, a rhythmic
// plucked-chord comping pattern (like a ukulele/guitar strum) plus a soft
// shaker on the off-beat — the chords now decay every strum instead of
// hanging in the air, which is what turns "atmospheric" into "unsettling."
// The melody's partials are also now exactly harmonic (2x/3x, not 2.01x/
// 3.03x) — a small mistuning is what makes a bell read as a detuned wind
// chime instead of a music box. This is meant to land as a cheerful little
// village/market tune, not ambience.
//
// Loop technique (unchanged): render `LOOP_LEN + CROSSFADE` seconds of
// continuously evolving audio, then blend the crossfade-length "extra" tail
// back into the head with an equal-power fade. That makes the *join*
// seamless regardless of whether the underlying waveform is itself
// periodic, applied independently per channel.
const fs = require("fs");
const path = require("path");

const SAMPLE_RATE = 22050;
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
// track's melody/shaker pattern should regenerate identically every run.
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
// A chord's bass pulse plays its root one octave below the comping chord's
// own lowest note — grounds the harmony without muddying it.
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

// Ukulele/guitar-like comping tone: purely harmonic partials (unlike the
// bell below, no deliberate mistuning here either — a comping chord reads
// as "plucked string" precisely because its overtones line up cleanly) with
// a fairly quick decay, since this plays every strum rather than sustaining.
const STRUM_PARTIALS = [
  { mult: 1.0, decay: 1.15, weight: 1.0 },
  { mult: 2.0, decay: 0.75, weight: 0.32 },
  { mult: 3.0, decay: 0.5, weight: 0.14 },
];
// A music-box/kalimba read needs partials at *exact* integer multiples —
// the previous pass used 2.01x/3.03x for "character," but that fractional
// mistuning is exactly what makes a bell read as a detuned wind chime
// rather than a toy piano. Exact multiples, same taper, reads warm instead.
const BELL_PARTIALS = [
  { mult: 1.0, decay: 1.8, weight: 1.0 },
  { mult: 2.0, decay: 1.3, weight: 0.3 },
  { mult: 3.0, decay: 0.9, weight: 0.12 },
];
// Rounder, softer than the bell — fundamental plus a whisper of 2nd
// harmonic — so the rhythmic pulse reads as a soft upright-bass note, not
// another melodic voice competing with the bell.
const BASS_PARTIALS = [
  { mult: 1.0, decay: 2.0, weight: 1.0 },
  { mult: 2.0, decay: 1.2, weight: 0.12 },
];

// Strums a full chord as a quick, gently staggered pluck of each note (like
// a real hand not hitting every string in perfect unison) instead of a
// sustained wash — this is the main thing separating "cheerful village
// tune" from "ambient drone."
function strumChord(buf, n, freqs, t0, amp, staggerMs) {
  freqs.forEach((f, i) => {
    pluck(buf, n, f, t0 + i * (staggerMs / 1000), 1.6, amp / Math.sqrt(freqs.length), STRUM_PARTIALS);
  });
}

// A short, bright, high-passed noise burst — a soft shaker/tambourine tick
// rather than the low filtered "outdoor air" texture this used to be the
// only noise source for. A simple one-pole difference filter is enough to
// push a white-noise burst's energy up into "shaker" territory without a
// real FFT/filter-design dependency.
function shaker(buf, n, t0, amp, rng) {
  const dur = 0.07;
  const iStart = Math.max(0, Math.floor(t0 * SAMPLE_RATE));
  const iEnd = Math.min(n, Math.floor((t0 + dur) * SAMPLE_RATE));
  let prev = 0;
  for (let s = iStart; s < iEnd; s++) {
    const tl = (s - iStart) / SAMPLE_RATE;
    const white = rng() * 2 - 1;
    const bright = white - prev; // one-pole high-pass: emphasizes the hiss, cuts the rumble
    prev = white;
    const env = Math.exp(-tl / 0.018);
    buf[s] += bright * env * amp;
  }
}

// --- Reverb: Freeverb-style parallel comb filters into series allpasses,
// tuned this pass for a small, quick room (short feedback, heavy damping,
// low wet mix) rather than a concert hall — just enough to glue the
// comping/melody/shaker together, not enough to hang in the air.
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
    const combed = combFilter(input, d, 0.55, 0.4);
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
// the last, so the melody's plucks aren't dry and dead-centered.
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

  // --- Comping: four strums per 6s chord (a "down-down-up-up" feel), each
  // strum's notes gently staggered. Two independent, lightly-detuned mono
  // renders (not the same signal duplicated) give real stereo width without
  // the slow beating a *sustained* detuned unison produces — each strum
  // decays well before the detune would be audible as its own pulse.
  const strumL = new Float64Array(n);
  const strumR = new Float64Array(n);
  const STRUM_OFFSETS = [0, 1.5, 3.0, 4.5];
  for (let i = 0; i < fullSequence.length; i++) {
    const freqs = CHORDS[fullSequence[i]];
    const segStart = i * SEG;
    for (const off of STRUM_OFFSETS) {
      const t0 = segStart + off;
      if (t0 >= genLen) continue;
      strumChord(strumL, n, freqs, t0, 0.34, 14);
      strumChord(strumR, n, freqs, t0, 0.34, 22);
    }
  }
  for (let s = 0; s < n; s++) {
    strumL[s] = Math.tanh(strumL[s] * 1.3) * 0.8;
    strumR[s] = Math.tanh(strumR[s] * 1.3) * 0.8;
  }

  // --- Bass: a soft pulse on the chord's root, twice per chord (a gentle
  // "duh... duh" walking feel), kept centered and mono like most mixed
  // tracks keep their low end.
  const bass = new Float64Array(n);
  for (let i = 0; i < fullSequence.length; i++) {
    const root = BASS_ROOT[fullSequence[i]];
    const segStart = i * SEG;
    pluck(bass, n, root, segStart, 3.2, 0.5, BASS_PARTIALS);
    pluck(bass, n, root, segStart + SEG / 2, 3.2, 0.36, BASS_PARTIALS);
  }
  for (let s = 0; s < n; s++) bass[s] = Math.tanh(bass[s] * 1.4) * 0.72;

  // --- Melody: sparse pentatonic plucks, dry mono source, then split into
  // a centered dry signal plus a ping-pong stereo echo.
  const melodyDry = new Float64Array(n);
  for (let noteTime = 0.8; noteTime < genLen - 1.0;) {
    const segI = Math.min(Math.floor(noteTime / SEG), fullSequence.length - 1);
    const scale = PENTATONIC[fullSequence[segI]];
    pluck(melodyDry, n, choice(scale), noteTime, 1.8, uniform(0.5, 0.85), BELL_PARTIALS);
    noteTime += uniform(1.1, 2.0);
  }
  for (let s = 0; s < n; s++) melodyDry[s] *= 0.24;
  const echo = pingPongEcho(melodyDry, 300, 0.38, 3);

  // --- Shaker: one tick on each strum's offbeat (the "and" between two
  // strums), alternating which channel leads — the main source of forward
  // rhythmic motion, and a texture that reads unambiguously as "instrument
  // being played," not "atmosphere."
  const shakerL = new Float64Array(n);
  const shakerR = new Float64Array(n);
  for (let i = 0; i < fullSequence.length; i++) {
    const segStart = i * SEG;
    for (let k = 0; k < STRUM_OFFSETS.length; k++) {
      const t0 = segStart + STRUM_OFFSETS[k] + 0.75;
      if (t0 >= genLen) continue;
      const leadLeft = k % 2 === 0;
      shaker(leadLeft ? shakerL : shakerR, n, t0, 0.16, rng);
      shaker(leadLeft ? shakerR : shakerL, n, t0, 0.07, rng);
    }
  }

  // --- Reverb send: comping + melody, glued together and run through two
  // decorrelated short-room reverb tails — just enough to feel like a real
  // room, tuned this pass to decay fast rather than hang.
  const sendMono = new Float64Array(n);
  for (let s = 0; s < n; s++) sendMono[s] = (strumL[s] + strumR[s]) * 0.5 * 0.8 + melodyDry[s] * 0.6;
  const wetL = reverb(sendMono, 0);
  const wetR = reverb(sendMono, 37);
  const WET_MIX = 0.16;

  const fullL = new Float64Array(n);
  const fullR = new Float64Array(n);
  for (let s = 0; s < n; s++) {
    fullL[s] = strumL[s] + bass[s] + melodyDry[s] * 0.6 + echo.L[s] + shakerL[s] + wetL[s] * WET_MIX;
    fullR[s] = strumR[s] + bass[s] + melodyDry[s] * 0.6 + echo.R[s] + shakerR[s] + wetR[s] * WET_MIX;
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
    loopedL[s] = (loopedL[s] / peak) * 0.52;
    loopedR[s] = (loopedR[s] / peak) * 0.52;
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
// hearing it on a later session doesn't feel like "the same loop again" —
// still a plucked, rhythmic comping arrangement, not a drone, so the minor
// key reads as folk/wistful rather than ominous.
renderTrack({
  name: "golden-dusk",
  seed: 137,
  sequence: ["Am", "F", "C", "G", "Dm", "Am", "Em", "F"],
  outFile: "ambient-b.wav",
});
