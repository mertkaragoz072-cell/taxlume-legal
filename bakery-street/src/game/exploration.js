// Exploration (Keşif): one timed trip at a time. Time is the wall clock (game.clock = Date.now), so a trip keeps running
// while the game is closed. Rewards are rolled ONCE when the trip starts and stored with it, so reloading cannot re-roll them,
// and claiming is a single atomic step (reward -> shared gold / XP / inventory, trip cleared, one 'change' event), so a trip can
// never pay twice. Gold, XP, gems and ingredients all go into the existing player / progression / inventory systems.
import { EXPLORE } from '../data/economy.js';

export function formatDuration(sec) {
  const s = Math.max(0, Math.ceil(sec));
  if (s >= 3600) return `${Math.floor(s / 3600)} sa ${Math.floor((s % 3600) / 60)} dk`;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export class Exploration {
  /** @param {import('./game.js').Game} game  @param {{regions?:object[], rng?:()=>number}} [opts] */
  constructor(game, { regions = EXPLORE, rng = Math.random } = {}) {
    this.game = game;
    this.regions = regions;
    this.rng = rng;
    this.active = null;            // { id, region, startedAt, duration, reward:{gold,xp,gems,ingredients} }
    this.done = {};                // region id -> number of trips completed and claimed
    this.nextId = 1;
    this.announced = new Set();    // trip ids already announced as ready (not saved: a returning player is told again)
    game.exploration = this;
  }

  region(id) { return this.regions.find((r) => r.id === id) ?? null; }
  get playerLevel() { return this.game.progression?.level ?? 1; }
  timesDone(id) { return this.done[id] ?? 0; }

  /** Unmet conditions of a region as text (empty when it is unlocked). */
  missing(id) {
    const r = this.region(id), out = [];
    if (this.playerLevel < r.minLevel) out.push(`Seviye ${r.minLevel} gerekli (şu an ${this.playerLevel})`);
    if (r.after && this.timesDone(r.after.region) < r.after.times) {
      const prev = this.region(r.after.region);
      out.push(`${prev.name} keşfini ${r.after.times} kez tamamla (${this.timesDone(r.after.region)}/${r.after.times})`);
    }
    return out;
  }
  isUnlocked(id) { return this.missing(id).length === 0; }

  /** Seconds left of the active trip (0 when finished or none). */
  remaining() {
    const a = this.active;
    if (!a) return 0;
    return Math.max(0, (a.startedAt + a.duration * 1000 - this.game.clock()) / 1000);
  }
  progress() { const a = this.active; return a ? 1 - this.remaining() / a.duration : 0; }
  isReady() { return !!this.active && this.remaining() <= 0; }

  /** 'locked' | 'available' | 'active' | 'ready' | 'busy' (unlocked, but another trip is running) for each region. */
  status(id) {
    if (this.active?.region === id) return this.isReady() ? 'ready' : 'active';
    if (!this.isUnlocked(id)) return 'locked';
    return this.active ? 'busy' : 'available';
  }

  list() { return this.regions.map((r) => ({ def: r, status: this.status(r.id), missing: this.missing(r.id), done: this.timesDone(r.id) })); }

  roll(def) {
    const between = ([a, b]) => a + Math.floor(this.rng() * (b - a + 1));
    const rw = def.rewards, reward = { gold: between(rw.gold), xp: between(rw.xp), gems: 0, ingredients: {} };
    for (const d of rw.ingredients ?? []) if (this.rng() < d.chance) reward.ingredients[d.id] = (reward.ingredients[d.id] ?? 0) + between(d.amount);
    if (rw.gems && this.rng() < rw.gems.chance) reward.gems = between(rw.gems.amount);
    return reward;
  }

  /** Starts a trip. Only one can run (or wait to be claimed) at a time. */
  start(regionId) {
    const fail = (reason, message) => ({ ok: false, reason, message });
    const def = this.region(regionId);
    if (!def) return fail('unknown', 'Bölge bulunamadı.');
    if (this.active) {
      const cur = this.region(this.active.region).name;
      return fail('busy', this.isReady() ? `${cur} keşfi tamamlandı: önce ödülünü al.` : `Zaten bir keşif sürüyor (${cur}).`);
    }
    const missing = this.missing(regionId);
    if (missing.length) return fail('locked', `${def.name} kilitli: ${missing.join(' · ')}.`);
    this.active = { id: this.nextId++, region: regionId, startedAt: this.game.clock(), duration: def.duration, reward: this.roll(def) };
    this.game.emit('change', { type: 'exploreStart', region: regionId });
    return { ok: true, region: def, duration: def.duration };
  }

  /** Collects the finished trip's reward. `expectedId` (the trip id the button was drawn for) blocks a replayed tap. */
  claim(expectedId = null) {
    const fail = (reason, message) => ({ ok: false, reason, message });
    const a = this.active;
    if (!a) return fail('none', 'Alınacak keşif ödülü yok.');
    if (expectedId != null && expectedId !== a.id) return fail('stale', 'Bu ödül zaten alındı.');
    if (!this.isReady()) return fail('running', `Keşif sürüyor: ${formatDuration(this.remaining())} kaldı.`);
    const g = this.game, r = a.reward;
    this.active = null;                                   // cleared first: nothing below can pay this trip a second time
    this.announced.delete(a.id);
    this.done[a.region] = this.timesDone(a.region) + 1;
    g.stats.explorationsDone += 1;
    g.player.gold += r.gold;
    if (r.gems) g.player.gems = (g.player.gems ?? 0) + r.gems;
    for (const [ing, n] of Object.entries(r.ingredients)) g.ingredients[ing] += n;
    g.progression?.gain(r.xp);
    g.emit('change', { type: 'explore', region: a.region });
    return { ok: true, reward: r, region: this.region(a.region) };
  }

  /** Called every frame by Game.tick(): fires 'exploreReady' once per finished trip (also right after a reload). */
  tick() {
    const a = this.active;
    if (!a) return;
    if (a.startedAt > this.game.clock()) a.startedAt = this.game.clock();   // device clock moved back: count from now, never stall
    if (this.remaining() <= 0 && !this.announced.has(a.id)) {
      this.announced.add(a.id);
      this.game.emit('exploreReady', { region: this.region(a.region), reward: a.reward });
    }
  }

  exportState() { return { active: this.active ? { ...this.active, reward: { ...this.active.reward, ingredients: { ...this.active.reward.ingredients } } } : null, done: { ...this.done }, nextId: this.nextId }; }

  importState(state) {
    const v = validateExploration(state, this);
    this.active = v.active; this.done = v.done; this.nextId = v.nextId;
    this.announced = new Set();
  }
}

const isInt = (n, max = 1e9) => Number.isInteger(n) && n >= 0 && n <= max;

/** Sanitizes saved exploration data (never throws): an unreadable active trip is dropped, bad counts become 0. */
export function validateExploration(raw, ex) {
  const done = {};
  for (const r of ex.regions) done[r.id] = isInt(raw?.done?.[r.id], 1e6) ? raw.done[r.id] : 0;
  let active = null;
  const a = raw?.active;
  if (a && ex.region(a.region) && Number.isFinite(a.startedAt) && a.startedAt > 0 && Number.isFinite(a.duration) && a.duration >= 1 && a.duration <= 7 * 86400 && a.reward && typeof a.reward === 'object') {
    const ingredients = {};
    for (const [id, n] of Object.entries(a.reward.ingredients ?? {})) if (ex.game.ingredientsDef[id] && isInt(n, 1e6) && n > 0) ingredients[id] = n;
    active = {
      id: isInt(a.id, 1e9) && a.id > 0 ? a.id : 1, region: a.region, startedAt: a.startedAt, duration: a.duration,
      reward: { gold: isInt(a.reward.gold, 1e8) ? a.reward.gold : 0, xp: isInt(a.reward.xp, 1e8) ? a.reward.xp : 0, gems: isInt(a.reward.gems, 1e6) ? a.reward.gems : 0, ingredients },
    };
  }
  const nextId = Math.max(isInt(raw?.nextId, 1e9) ? raw.nextId : 1, (active?.id ?? 0) + 1);
  return { active, done, nextId };
}
