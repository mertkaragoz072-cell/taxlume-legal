// Ses: harici dosya YOK — tüm efektler ve müzik Web Audio ile üretilir (yerel, sıfır indirme).
// Tarayıcılar sesi ilk kullanıcı dokunuşuna kadar kilitler; Audio.unlock() ilk dokunuşta çağrılır.
// Ses açık/kapalı (gear düğmesi / M) kaydedilir. Yeni ses = SFX tablosuna fonksiyon eklemek.
const LS = 'nexora_sound';
let musicOn = true, sfxOn = true;
let ctx = null, master = null, musicGain = null, sfxGain = null, noiseBuf = null, muted = false, musicTimer = null, step = 0, lastAt = {};
try { muted = localStorage.getItem(LS) === 'off'; } catch (_) { /* yoksay */ }

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(ctx.destination);
  sfxGain = ctx.createGain(); sfxGain.gain.value = sfxOn ? 0.55 : 0; sfxGain.connect(master);
  musicGain = ctx.createGain(); musicGain.gain.value = musicOn ? 0.16 : 0; musicGain.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

function tone(type, f0, f1, dur, vol = 0.4, delay = 0, dest = sfxGain) {
  const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, f0, f1, vol = 0.3, delay = 0, q = 1.2) {
  const t = ctx.currentTime + delay, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; f.type = 'bandpass'; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(sfxGain); s.start(t); s.stop(t + dur + 0.02);
}
const N = (semi) => 261.63 * Math.pow(2, semi / 12);      // C4 = 0

const SFX = {
  slash: () => { noise(0.14, 1800, 500, 0.32, 0, 0.8); tone('triangle', 520, 260, 0.1, 0.12); },
  hit: () => { tone('square', 180 + Math.random() * 40, 70, 0.09, 0.3); noise(0.07, 2500, 800, 0.28); },
  kill: () => { tone('sawtooth', 220, 60, 0.22, 0.28); noise(0.16, 1200, 200, 0.3); },
  heartbeat: () => { tone('sine', 70, 45, 0.16, 0.5); tone('sine', 62, 40, 0.18, 0.4, 0.2); },
  hurt: () => { tone('sawtooth', 320, 110, 0.24, 0.32); noise(0.1, 900, 300, 0.2); },
  coin: () => { tone('sine', 988, 988, 0.07, 0.3); tone('sine', 1319, 1319, 0.14, 0.3, 0.06); },
  gem: () => { [0, 4, 7, 12].forEach((s, i) => tone('sine', N(s + 12), N(s + 12), 0.16, 0.26, i * 0.07)); },
  levelup: () => { [0, 4, 7, 12, 16].forEach((s, i) => { tone('triangle', N(s), N(s), 0.22, 0.3, i * 0.09); tone('sine', N(s + 12), N(s + 12), 0.22, 0.14, i * 0.09); }); },
  skill1: () => { noise(0.35, 400, 3200, 0.38, 0, 0.7); tone('sawtooth', 200, 800, 0.3, 0.16); },
  skill2: () => { tone('sine', 120, 40, 0.5, 0.6); noise(0.4, 900, 100, 0.42, 0.02, 0.6); [0, 7, 12].forEach((s, i) => tone('triangle', N(s + 12), N(s + 12), 0.18, 0.18, 0.1 + i * 0.06)); },
  gameover: () => { [7, 4, 0, -5].forEach((s, i) => tone('triangle', N(s), N(s), 0.38, 0.3, i * 0.22)); },
  click: () => tone('square', 660, 880, 0.05, 0.14),
};

// Müzik: Do majör pentatonik, yumuşak çalan basit bir döngü (bas + rastgele melodi). Sakin, savaşı bastırmayacak seviyede.
const PENTA = [0, 2, 4, 7, 9], BASS = [0, 0, -3, -5, -3, -5, 0, -5];
function musicStep() {
  if (!ctx || muted) return;
  const t = step++ % 32, bar = Math.floor(t / 4);
  if (t % 4 === 0) { tone('sine', N(BASS[bar % 8] - 12), N(BASS[bar % 8] - 12), 0.5, 0.5, 0, musicGain); tone('triangle', N(BASS[bar % 8]), N(BASS[bar % 8]), 0.45, 0.14, 0, musicGain); }
  if (Math.random() < 0.7) { const n = PENTA[Math.floor(Math.random() * 5)] + (Math.random() < 0.3 ? 12 : 0); tone('triangle', N(n + 12), N(n + 12), 0.34, 0.2, 0, musicGain); }
}

export const Audio = {
  unlock() {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (!musicTimer) musicTimer = setInterval(musicStep, 330);
  },
  play(name) {
    if (muted || !ctx || ctx.state !== 'running' || !SFX[name]) return;
    const now = performance.now(); if (now - (lastAt[name] || 0) < (name === 'hit' ? 45 : 25)) return;   // aynı sesi üst üste yığma
    lastAt[name] = now; SFX[name]();
  },
  get muted() { return muted; },
  setChannels(music, sfx) { musicOn = !!music; sfxOn = !!sfx; if (musicGain) musicGain.gain.value = musicOn ? 0.16 : 0; if (sfxGain) sfxGain.gain.value = sfxOn ? 0.55 : 0; },
  toggle() {
    muted = !muted; try { localStorage.setItem(LS, muted ? 'off' : 'on'); } catch (_) { /* yoksay */ }
    if (master) master.gain.value = muted ? 0 : 0.9;
    if (!muted) { this.unlock(); this.play('click'); }
    return muted;
  },
};
