// One-off script that synthesizes tiny WAV sound effects for the game
// (no external assets needed). Run with: node scripts/gen-sounds.js
const fs = require("fs");
const path = require("path");

const SAMPLE_RATE = 22050;

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

function tone(freqStart, freqEnd, durationSec, volume = 0.5) {
  const n = Math.floor(SAMPLE_RATE * durationSec);
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const progress = i / n;
    const freq = freqStart + (freqEnd - freqStart) * progress;
    const envelope = Math.sin(Math.PI * progress); // fade in/out
    out[i] = Math.sin(2 * Math.PI * freq * t) * envelope * volume;
  }
  return out;
}

function concat(...chunks) {
  return chunks.flat();
}

// Buy: quick cheerful upward two-note chime
const buy = concat(tone(660, 660, 0.07, 0.5), tone(990, 990, 0.09, 0.5));

// Sell: soft downward chime
const sell = concat(tone(720, 720, 0.07, 0.45), tone(520, 520, 0.09, 0.45));

// Event: single neutral notification blip
const event = tone(440, 520, 0.14, 0.4);

// Crash: low descending doom tone for hyperinflation game over
const crash = concat(tone(300, 120, 0.35, 0.55), tone(160, 60, 0.45, 0.5));

const outDir = path.join(__dirname, "..", "assets", "sounds");
writeWav(path.join(outDir, "buy.wav"), buy);
writeWav(path.join(outDir, "sell.wav"), sell);
writeWav(path.join(outDir, "event.wav"), event);
writeWav(path.join(outDir, "crash.wav"), crash);

console.log("Wrote sound effects to", outDir);
