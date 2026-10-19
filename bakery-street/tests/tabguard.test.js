import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/game.js';
import { SaveManager, SAVE_KEY } from '../src/game/save.js';
import { TabGuard, OWNER_KEY } from '../src/game/tabguard.js';

class FakeStorage {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}
const tab = (storage, id) => {
  const lost = [];
  const guard = new TabGuard(storage, { id, onLost: () => lost.push(id) });
  const game = new Game({ gold: 100, gems: 0 }, {}, () => 1_700_000_000_000);
  const saves = new SaveManager(game, storage, { guard });
  return { guard, game, saves, lost };
};

test('the newest tab owns the game; the older tab is told once and stops saving', () => {
  const st = new FakeStorage();
  const a = tab(st, 'A'), b = tab(st, 'B');
  a.guard.claim();
  assert.equal(a.guard.isOwner(), true);
  b.guard.claim();                                             // a second tab opens
  assert.equal(a.guard.isOwner(), false);
  assert.equal(b.guard.isOwner(), true);
  a.guard.handle({ key: OWNER_KEY }); a.guard.handle({ key: OWNER_KEY });   // two storage events
  assert.deepEqual(a.lost, ['A']);
  assert.deepEqual(b.lost, []);
});

test('a tab that lost the game cannot overwrite the save; the owner still can', () => {
  const st = new FakeStorage();
  const a = tab(st, 'A'), b = tab(st, 'B');
  a.guard.claim(); a.saves.load();
  b.guard.claim(); b.saves.load();
  b.game.player.gold = 777; assert.ok(b.saves.save().ok);
  a.game.player.gold = 5;
  const r = a.saves.save();
  assert.equal(r.ok, false);
  assert.equal(JSON.parse(st.getItem(SAVE_KEY)).gold, 777);   // the owner's progress is intact
});

test('autosave and pagehide flush of a lost tab are blocked too', () => {
  const st = new FakeStorage();
  const a = tab(st, 'A'), b = tab(st, 'B');
  a.guard.claim(); a.saves.load(); a.saves.attach(null);
  b.guard.claim(); b.saves.load(); b.game.player.gold = 321; b.saves.save();
  a.game.player.gold = 1; a.game.emit('change', { type: 'x' });
  assert.equal(JSON.parse(st.getItem(SAVE_KEY)).gold, 321);
});

test('claiming again (the "continue here" button) makes the tab the owner and clears the lost flag', () => {
  const st = new FakeStorage();
  const a = tab(st, 'A'), b = tab(st, 'B');
  a.guard.claim(); b.guard.claim();
  a.guard.handle({ key: OWNER_KEY });
  assert.equal(a.guard.lost, true);
  a.guard.claim();
  assert.equal(a.guard.lost, false);
  assert.equal(a.guard.isOwner(), true);
  assert.equal(b.guard.isOwner(), false);
});

test('unrelated storage keys are ignored; missing or blocked storage never locks the player out', () => {
  const st = new FakeStorage();
  const a = tab(st, 'A');
  a.guard.claim();
  a.guard.handle({ key: SAVE_KEY });
  assert.equal(a.lost.length, 0);
  assert.equal(new TabGuard(null).isOwner(), true);
  const blocked = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } };
  const g = new TabGuard(blocked, { id: 'Z' });
  assert.doesNotThrow(() => g.claim());
  assert.equal(g.isOwner(), true);
  st.setItem(OWNER_KEY, '{not json');
  assert.equal(a.guard.isOwner(), true);                       // a damaged marker is treated as "nobody owns it"
});

test('a save written by another tab is no longer merged into a running game', () => {
  const st = new FakeStorage();
  const listeners = [];
  const win = { addEventListener: (n, fn) => listeners.push([n, fn]), document: null };
  const a = tab(st, 'A'); a.guard.claim(); a.saves.load();
  a.saves.attach(win);
  assert.ok(!listeners.some(([n]) => n === 'storage'), 'SaveManager must not apply foreign saves any more');
});
