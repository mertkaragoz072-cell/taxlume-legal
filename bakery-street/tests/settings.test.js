import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/game.js';
import { SaveManager, SAVE_KEY } from '../src/game/save.js';
import { Settings, SETTINGS_KEY, DEFAULT_SETTINGS } from '../src/game/settings.js';
import { AudioManager } from '../src/audio/audio.js';
import { vibrate, vibrationSupported } from '../src/audio/haptics.js';

class FakeStorage {
  constructor() { this.m = new Map(); this.fail = false; this.failRead = false; }
  getItem(k) { if (this.failRead) throw new Error('blocked'); return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { if (this.fail) throw new Error('QuotaExceededError'); this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}
const mk = (st, problems = []) => new Settings(st, { onProblem: (p) => problems.push(p) });

test('defaults: sound effects, music and vibration are on', () => {
  const s = mk(new FakeStorage());
  s.load();
  assert.deepEqual(s.values, DEFAULT_SETTINGS);
  assert.deepEqual([s.sfx, s.music, s.vibration], [true, true, true]);
});

test('each setting toggles independently and is saved at once', () => {
  const st = new FakeStorage(); const s = mk(st); s.load();
  s.toggle('music');
  assert.deepEqual(s.values, { sfx: true, music: false, vibration: true });
  assert.equal(JSON.parse(st.getItem(SETTINGS_KEY)).music, false);
  s.set('sfx', false); s.set('vibration', false);
  assert.deepEqual(s.values, { sfx: false, music: false, vibration: false });
  s.set('music', true);
  assert.deepEqual(s.values, { sfx: false, music: true, vibration: false });
});

test('settings are kept after a reload (all combinations)', () => {
  for (const sfx of [true, false]) for (const music of [true, false]) for (const vibration of [true, false]) {
    const st = new FakeStorage(); const a = mk(st); a.load();
    a.set('sfx', sfx); a.set('music', music); a.set('vibration', vibration);
    const b = mk(st); b.load();
    assert.deepEqual(b.values, { sfx, music, vibration });
  }
});

test('invalid names and values are ignored and never saved', () => {
  const st = new FakeStorage(); const s = mk(st); s.load();
  assert.equal(s.set('volume', true), false);
  assert.equal(s.set('sfx', 'no'), false);
  assert.equal(s.set('music', 0), false);
  assert.deepEqual(s.values, DEFAULT_SETTINGS);
  assert.equal(st.getItem(SETTINGS_KEY), null);
});

test('a damaged settings record falls back to defaults and tells the player; bad single fields keep their default', () => {
  const st = new FakeStorage(), problems = [];
  st.setItem(SETTINGS_KEY, '{oops');
  const s = mk(st, problems); s.load();
  assert.deepEqual(s.values, DEFAULT_SETTINGS);
  assert.ok(problems.some((p) => p.kind === 'corrupt'));
  const st2 = new FakeStorage(); st2.setItem(SETTINGS_KEY, JSON.stringify({ sfx: false, music: 'loud', vibration: null, extra: 1 }));
  const t = mk(st2); t.load();
  assert.deepEqual(t.values, { sfx: false, music: true, vibration: true });
});

test('if saving fails the setting still applies for the session and the player is warned', () => {
  const st = new FakeStorage(), problems = []; const s = mk(st, problems); s.load();
  st.fail = true;
  assert.equal(s.set('music', false), false);
  assert.equal(s.music, false);
  assert.ok(problems.some((p) => p.kind === 'write'));
});

test('unreadable or missing storage does not break settings', () => {
  const st = new FakeStorage(); st.failRead = true; const problems = [];
  const s = mk(st, problems); s.load();
  assert.deepEqual(s.values, DEFAULT_SETTINGS);
  const n = new Settings(null, { onProblem: (p) => problems.push(p) }); n.load();
  assert.equal(n.set('sfx', false), false); assert.equal(n.sfx, false);
  assert.ok(problems.length >= 2);
});

test('listeners are told about changes', () => {
  const s = mk(new FakeStorage()); s.load();
  const seen = []; s.on((name, v) => seen.push([name, v]));
  s.toggle('sfx'); s.set('music', false);
  assert.deepEqual(seen, [['sfx', false], ['music', false]]);
});

// ---------------------------------------------------------------------------------- audio
function fakeAudio() {
  const log = { oscillators: 0, resumed: 0 };
  const ctx = {
    currentTime: 0, destination: {}, resume() { log.resumed++; },
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; },
    createOscillator() { log.oscillators++; return { type: '', frequency: {}, connect() {}, start() {}, stop() {} }; },
  };
  const timers = new Map(); let id = 0;
  const opts = { createContext: () => ctx, setTimer: (fn) => { timers.set(++id, fn); return id; }, clearTimer: (h) => timers.delete(h) };
  return { ctx, log, timers, opts };
}

test('sound effects play when enabled and are silent when disabled', () => {
  const s = mk(new FakeStorage()); s.load();
  const f = fakeAudio(); const a = new AudioManager(s, f.opts);
  assert.equal(a.sfx('coin'), false);                     // before the first user gesture nothing plays
  assert.equal(a.unlock(), true);
  f.log.oscillators = 0;
  assert.equal(a.sfx('coin'), true);
  assert.ok(f.log.oscillators > 0);
  s.set('sfx', false);
  f.log.oscillators = 0;
  for (const name of ['coin', 'done', 'buy', 'claim', 'error', 'tap']) assert.equal(a.sfx(name), false);
  assert.equal(f.log.oscillators, 0);
  s.set('sfx', true);
  assert.equal(a.sfx('done'), true);
  assert.equal(a.sfx('does-not-exist'), false);
});

test('music starts after unlock when on, stops when switched off, and restarts when switched on again', () => {
  const s = mk(new FakeStorage()); s.load();
  const f = fakeAudio(); const a = new AudioManager(s, f.opts);
  assert.equal(f.timers.size, 0);
  a.unlock();
  assert.equal(f.timers.size, 1);                          // loop is scheduled
  assert.ok(f.log.oscillators > 0);                        // and the first notes were queued
  s.set('music', false);
  assert.equal(f.timers.size, 0);
  const n = f.log.oscillators; a.scheduleAhead();
  assert.equal(f.log.oscillators, n);                      // nothing is scheduled while off
  s.set('music', true);
  assert.equal(f.timers.size, 1);
});

test('music setting off from the start: unlocking does not start music, sound effects still follow their own setting', () => {
  const st = new FakeStorage(); const pre = mk(st); pre.load(); pre.set('music', false);
  const s = mk(st); s.load();
  const f = fakeAudio(); const a = new AudioManager(s, f.opts); a.unlock();
  assert.equal(f.timers.size, 0);
  assert.equal(a.sfx('tap'), true);
});

test('audio never throws when the device has no audio, or the context fails', () => {
  const s = mk(new FakeStorage()); s.load();
  const none = new AudioManager(s, { createContext: () => null });
  assert.equal(none.unlock(), false);
  assert.equal(none.sfx('coin'), false);
  s.set('music', false); s.set('music', true);
  const boom = new AudioManager(s, { createContext: () => { throw new Error('no audio'); } });
  assert.equal(boom.unlock(), false);
  assert.equal(boom.sfx('coin'), false);
  const f = fakeAudio(); f.ctx.createOscillator = () => { throw new Error('bad'); };
  const flaky = new AudioManager(s, f.opts); flaky.unlock();
  assert.equal(flaky.sfx('coin'), false);                  // a failing oscillator is swallowed
});

// ---------------------------------------------------------------------------------- vibration
test('vibration: works when enabled and supported; silent when disabled; harmless when unsupported or throwing', () => {
  const s = mk(new FakeStorage()); s.load();
  const calls = []; const nav = { vibrate: (p) => { calls.push(p); return true; } };
  assert.equal(vibrationSupported(nav), true);
  assert.equal(vibrate(s, 30, nav), true);
  assert.deepEqual(calls, [30]);
  s.set('vibration', false);
  assert.equal(vibrate(s, 30, nav), false);
  assert.equal(calls.length, 1);
  s.set('vibration', true);
  assert.equal(vibrationSupported({}), false);
  assert.equal(vibrate(s, 30, {}), false);                 // device without vibration: no error
  assert.equal(vibrate(s, 30, null), false);
  assert.equal(vibrate(s, 30, { vibrate() { throw new Error('denied'); } }), false);
});

// ---------------------------------------------------------------------------------- settings vs progress reset
test('resetting progress does not change settings, and settings do not touch the game save', () => {
  const st = new FakeStorage();
  const settings = mk(st); settings.load(); settings.set('music', false); settings.set('vibration', false);
  const player = { gold: 1000, gems: 5 }, game = new Game(player, {}, () => 1);
  const saves = new SaveManager(game, st); saves.load(); saves.attach();
  game.buyIngredient('flour', 3);
  assert.equal(saves.reset({ confirmed: true }).ok, true);
  const after = mk(st); after.load();
  assert.deepEqual(after.values, { sfx: true, music: false, vibration: false });      // settings survived the reset
  assert.equal(JSON.parse(st.getItem(SAVE_KEY)).gold, 1000);
  assert.ok(!('music' in JSON.parse(st.getItem(SAVE_KEY))));                           // and live in their own record
});
