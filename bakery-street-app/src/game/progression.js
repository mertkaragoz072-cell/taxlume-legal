// Player level and XP. XP is awarded by Game / Quests inside the same synchronous step as the action that earns it,
// so the action, the XP and any level-up reward always end up in one autosave snapshot.
import { XP, LEVELS, LEVEL_REWARD } from '../data/economy.js';

const isInt = (n) => Number.isInteger(n) && n >= 0 && n < 1e12;

export class Progression {
  /** @param {import('./game.js').Game} game */
  constructor(game, { xp = XP, levels = LEVELS, rewards = LEVEL_REWARD } = {}) {
    this.game = game;
    this.xpDef = xp; this.levels = levels; this.rewardDef = rewards;
    this.level = 1;
    this.xp = 0;                 // XP inside the current level (0 .. xpToNext - 1)
    this.rewardedLevel = 1;      // highest level whose reward has been given (level 1 has none); makes rewards one-time
    game.progression = this;
  }

  get maxLevel() { return this.levels.maxLevel; }
  get isMax() { return this.level >= this.maxLevel; }

  /** XP needed to go from `level` to the next one (null at the maximum level). */
  xpToNext(level = this.level) {
    if (level >= this.maxLevel) return null;
    const n = level - 1, { base, linear, quad } = this.levels;
    return base + linear * n + quad * n * n;
  }

  /** Gold and ingredients given for reaching `level` (level 1 gives nothing). */
  rewardFor(level) {
    if (level < 2) return { gold: 0, ingredients: {} };
    const { gold, ingredientsEvery, ingredients } = this.rewardDef;
    return { gold: gold.base + gold.perLevel * (level - 1), ingredients: level % ingredientsEvery === 0 ? { ...ingredients } : {} };
  }

  /** XP value of an action: kind = 'produce' | 'sale' | 'upgrade' | 'quest'. */
  xpFor(kind, key) {
    const d = this.xpDef;
    switch (kind) {
      case 'produce': return d.produce[key] ?? 0;
      case 'sale': return d.sale[key] ?? 0;
      case 'upgrade': return d.upgrade.base + d.upgrade.perLevel * key;
      case 'quest': return d.quest.byId?.[key] ?? d.quest.default;
      case 'research': return d.research ? d.research.base + d.research.perLevel * key : 0;
      default: return 0;
    }
  }

  /** Convenience used by the game: award the configured XP for an action (qty = number of units). */
  award(kind, key, qty = 1) {
    let xp = this.xpFor(kind, key) * qty;
    if (kind === 'quest') xp = Math.round(xp * (1 + this.game.bonus('questXp')));   // Kasaba Kültürü research
    return this.gain(xp);
  }

  /**
   * Adds XP and levels up as often as needed (several levels in one go are supported). Every newly reached level pays its
   * reward exactly once into the shared gold / inventory. At the maximum level XP is ignored.
   */
  gain(amount) {
    const result = { gained: 0, levels: [] };
    if (!Number.isFinite(amount) || amount < 1 || this.isMax) return result;
    amount = Math.floor(amount);
    result.gained = amount;
    this.xp += amount;
    let need;
    while ((need = this.xpToNext()) !== null && this.xp >= need) {
      this.xp -= need;
      this.level += 1;
      if (this.level > this.rewardedLevel) {                       // one-time guard: never pay a level twice
        const reward = this.rewardFor(this.level);
        this.game.earn(reward.gold, 'level', `Seviye ${this.level} ödülü`);
        for (const [id, n] of Object.entries(reward.ingredients)) this.game.ingredients[id] += n;
        this.rewardedLevel = this.level;
        result.levels.push({ level: this.level, reward });
      }
    }
    if (this.isMax) this.xp = 0;
    for (const l of result.levels) this.game.emit('levelUp', l);
    return result;
  }

  /** 0..1 progress inside the current level (1 at the maximum level). */
  fraction() { const need = this.xpToNext(); return need === null ? 1 : this.xp / need; }

  exportState() { return { level: this.level, xp: this.xp, rewardedLevel: this.rewardedLevel }; }

  importState(state) {
    this.level = state?.level ?? 1;
    this.xp = state?.xp ?? 0;
    this.rewardedLevel = state?.rewardedLevel ?? 1;
  }
}

/** Strict validation of saved progression data. Missing data = a new player (level 1, 0 XP). */
export function validateProgression(raw, prog) {
  if (raw === undefined) return { level: 1, xp: 0, rewardedLevel: 1 };
  if (!raw || typeof raw !== 'object') throw new Error('seviye kaydı geçersiz');
  const { level, xp = 0, rewardedLevel } = raw;
  if (!Number.isInteger(level) || level < 1 || level > prog.maxLevel) throw new Error('seviye geçersiz');
  const need = prog.xpToNext(level);
  if (!isInt(xp) || (need === null ? xp !== 0 : xp >= need)) throw new Error('XP değeri geçersiz');
  const rewarded = rewardedLevel === undefined ? level : rewardedLevel;
  if (!Number.isInteger(rewarded) || rewarded < 1 || rewarded > level) throw new Error('seviye ödülü kaydı geçersiz');
  // a reward pointer behind the level (hand-edited save) is moved up instead of paying old levels again
  return { level, xp, rewardedLevel: Math.max(rewarded, level) };
}
