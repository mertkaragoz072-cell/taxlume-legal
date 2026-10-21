// Renders the game's short sound effects and the music loop to WAV files (the web version synthesised them live; phones play files).
//   node scripts/gen-sounds.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "sounds");
mkdirSync(out, { recursive: true });
const RATE = 22050;

const SFX = {
  tap: [[660, 0.05, "square", 0.04]],
  coin: [[988, 0.07, "triangle", 0.08], [1319, 0.14, "triangle", 0.08]],
  done: [[523, 0.09, "sine", 0.09], [659, 0.09, "sine", 0.09], [784, 0.16, "sine", 0.09]],
  buy: [[440, 0.06, "triangle", 0.07], [587, 0.1, "triangle", 0.07]],
  claim: [[784, 0.08, "triangle", 0.09], [988, 0.08, "triangle", 0.09], [1175, 0.08, "triangle", 0.09], [1568, 0.2, "triangle", 0.09]],
  error: [[196, 0.14, "sawtooth", 0.05], [147, 0.18, "sawtooth", 0.05]],
};
const MELODY = [392, 440, 523, 587, 659, 587, 523, 440, 392, 330, 392, 440, 523, 440, 392, 330];
const STEP = 0.5;

const wave = (type, ph) => {
  const x = ph - Math.floor(ph);
  if (type === "square") return x < 0.5 ? 1 : -1;
  if (type === "sawtooth") return 2 * x - 1;
  if (type === "triangle") return 4 * Math.abs(x - 0.5) - 1;
  return Math.sin(2 * Math.PI * ph);
};
/** Adds one note to the buffer with the same envelope the web synth used: a 10 ms rise, then an exponential fall. */
function tone(buf, freq, start, dur, type, gain) {
  const a = Math.floor(start * RATE), n = Math.floor((dur + 0.02) * RATE);
  for (let i = 0; i < n && a + i < buf.length; i++) {
    const t = i / RATE;
    const env = t < 0.01 ? 0.0001 * Math.pow(gain / 0.0001, t / 0.01) : t < dur ? gain * Math.pow(0.0001 / gain, (t - 0.01) / (dur - 0.01)) : 0;
    buf[a + i] += wave(type, freq * t) * env;
  }
}
function wav(buf) {
  const data = Buffer.alloc(buf.length * 2);
  for (let i = 0; i < buf.length; i++) data.writeInt16LE(Math.max(-1, Math.min(1, buf[i] * 2.2)) * 32767 | 0, i * 2);   // a little make-up gain: the notes are quiet
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + data.length, 4); h.write("WAVEfmt ", 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(RATE, 24); h.writeUInt32LE(RATE * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}
for (const [name, notes] of Object.entries(SFX)) {
  const total = notes.reduce((s, [, d]) => s + d * 0.9, 0) + 0.15;
  const buf = new Float32Array(Math.ceil(total * RATE));
  let t = 0;
  for (const [f, d, type, g] of notes) { tone(buf, f, t, d, type, g); t += d * 0.9; }
  writeFileSync(join(out, `${name}.wav`), wav(buf));
}
const music = new Float32Array(Math.round(MELODY.length * STEP * RATE));
MELODY.forEach((f, i) => tone(music, f, i * STEP, STEP * 0.9, "triangle", 0.025));
writeFileSync(join(out, "music.wav"), wav(music));
console.log("sounds written");
