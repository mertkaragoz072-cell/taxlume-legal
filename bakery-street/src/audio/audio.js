// Tiny WebAudio synth: short sound effects and a quiet looping melody (no audio files needed).
// Everything is guarded: no AudioContext, a blocked context or a throwing call never breaks the game.
const SFX = {
  tap: [[660, 0.05, 'square', 0.04]],
  coin: [[988, 0.07, 'triangle', 0.08], [1319, 0.14, 'triangle', 0.08]],
  done: [[523, 0.09, 'sine', 0.09], [659, 0.09, 'sine', 0.09], [784, 0.16, 'sine', 0.09]],
  buy: [[440, 0.06, 'triangle', 0.07], [587, 0.1, 'triangle', 0.07]],
  claim: [[784, 0.08, 'triangle', 0.09], [988, 0.08, 'triangle', 0.09], [1175, 0.08, 'triangle', 0.09], [1568, 0.2, 'triangle', 0.09]],
  error: [[196, 0.14, 'sawtooth', 0.05], [147, 0.18, 'sawtooth', 0.05]],
};
const MELODY = [392, 440, 523, 587, 659, 587, 523, 440, 392, 330, 392, 440, 523, 440, 392, 330];   // C-major pentatonic-ish loop
const STEP = 0.5;      // seconds per melody note

export class AudioManager {
  /**
   * @param {import('../game/settings.js').Settings} settings
   * @param {{createContext?:()=>any, setTimer?:Function, clearTimer?:Function}} [opts]  injectable for tests
   */
  constructor(settings, { createContext, setTimer = (fn, ms) => setInterval(fn, ms), clearTimer = (h) => clearInterval(h) } = {}) {
    this.settings = settings;
    this.createContext = createContext ?? (() => {
      const C = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
      return C ? new C() : null;
    });
    this.setTimer = setTimer; this.clearTimer = clearTimer;
    this.ctx = null; this.master = null; this.timer = null; this.nextNote = 0; this.noteIndex = 0;
    settings.on((name) => { if (name === 'music') this.syncMusic(); });
  }

  /** Create / resume the audio context. Must be called from a user gesture (browser autoplay rules). */
  unlock() {
    try {
      if (!this.ctx) { this.ctx = this.createContext(); if (!this.ctx) return false; this.master = this.ctx.createGain?.() ?? null; this.master?.connect?.(this.ctx.destination); }
      this.ctx.resume?.();
      this.syncMusic();
      return true;
    } catch { this.ctx = null; return false; }
  }

  tone(freq, start, dur, type, gain) {
    const c = this.ctx;
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = type; osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g); g.connect(this.master ?? c.destination);
    osc.start(start); osc.stop(start + dur + 0.02);
  }

  /** Plays a named effect (no-op when sound effects are off or audio is unavailable). */
  sfx(name) {
    if (!this.settings.sfx || !this.ctx || !SFX[name]) return false;
    try {
      let t = this.ctx.currentTime;
      for (const [f, d, type, g] of SFX[name]) { this.tone(f, t, d, type, g); t += d * 0.9; }
      return true;
    } catch { return false; }
  }

  /** Starts or stops the music loop to match the setting. */
  syncMusic() {
    const want = this.settings.music && !!this.ctx;
    if (want && !this.timer) {
      this.nextNote = this.ctx.currentTime + 0.1;
      this.timer = this.setTimer(() => this.scheduleAhead(), 250);
      this.scheduleAhead();
    } else if (!want && this.timer) {
      this.clearTimer(this.timer); this.timer = null;
    }
  }

  /** Queues the notes due in the next ~1.2 s (called by the timer). */
  scheduleAhead() {
    if (!this.ctx || !this.settings.music) return;
    try {
      while (this.nextNote < this.ctx.currentTime + 1.2) {
        this.tone(MELODY[this.noteIndex % MELODY.length], this.nextNote, STEP * 0.9, 'triangle', 0.025);
        this.nextNote += STEP; this.noteIndex++;
      }
    } catch { /* ignore audio failures */ }
  }
}
