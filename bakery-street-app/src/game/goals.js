// Daily goals: three short goals a day, picked from a pool in rotation by calendar day. Progress is today's share of the game's lifetime counters
// (the counter now minus its value when the day began), so every action that already counts for quests counts here with no extra wiring.
// Stored: the day, the counters at the start of that day and which goals were collected. Collecting is one atomic step (flag + gold).
import { GOALS } from '../data/economy.js';
import { dateKey, dayNumber } from './daily.js';
import { weekOf } from './events.js';

export class DailyGoals {
  /** @param {import('./game.js').Game} game */
  constructor(game, cfg = GOALS) {
    this.game = game;
    this.cfg = cfg;
    this.date = null;
    this.baseline = {};
    this.claimed = new Set();
    this.announced = new Set();
    this.week = null;                  // the weekly goal: week number, counters at the start of the week, collected?
    this.weekBase = {};
    this.weekClaimed = false;
    game.goals = this;
    game.on('change', () => { this.roll(); this.announce(); });
  }

  value(path) { return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), this.game.stats) ?? 0; }
  today() { return dateKey(this.game.clock()); }
  mult() { return 1 + this.cfg.stageGrowth * Math.max(0, (this.game.shop?.stageId ?? 1) - 1); }

  /** Which pool entries are today's goals (consecutive from a day-dependent start, so the set changes every day). */
  pick(date = this.today()) {
    const pool = this.cfg.pool, n = Math.min(this.cfg.perDay, pool.length), start = ((dayNumber(date) % pool.length) + pool.length) % pool.length;
    return Array.from({ length: n }, (_, i) => pool[(start + i) % pool.length]);
  }

  /** Starts a new day when the calendar date changed (or the saved date is from the future: a clock set back must not freeze the goals). */
  roll() {
    const today = this.today();
    if (this.date === today) return false;
    this.date = today;
    this.baseline = Object.fromEntries(this.cfg.pool.map((g) => [g.stat, this.value(g.stat)]));
    this.claimed = new Set();
    this.announced = new Set();
    return true;
  }

  /** Starts a new week (Monday) the same way a new day starts. */
  rollWeek() {
    const w = weekOf(this.game.clock());
    if (this.week === w) return false;
    this.week = w;
    this.weekBase = Object.fromEntries((this.cfg.weekly ?? []).map((g) => [g.stat, this.value(g.stat)]));
    this.weekClaimed = false;
    return true;
  }

  /** This week's goal with its state, or null when the config has none. */
  weekly() {
    const pool = this.cfg.weekly ?? [];
    if (!pool.length) return null;
    this.rollWeek();
    const g = pool[((this.week % pool.length) + pool.length) % pool.length], m = this.mult();
    const target = Math.max(1, Math.round(g.target * m)), gold = Math.round(g.gold * m);
    const progress = Math.min(target, Math.max(0, this.value(g.stat) - (this.weekBase[g.stat] ?? 0)));
    return { id: g.id, name: g.name, icon: g.icon, text: `${target.toLocaleString('tr-TR')} ${g.label}`, target, gold, progress, complete: progress >= target, claimed: this.weekClaimed };
  }

  claimWeekly() {
    const g = this.weekly();
    if (!g) return { ok: false, reason: 'unknown', message: 'Bu hafta hedef yok.' };
    if (g.claimed) return { ok: false, reason: 'claimed', message: 'Bu haftanın ödülü zaten alındı.' };
    if (!g.complete) return { ok: false, reason: 'incomplete', message: `Hedef henüz tamamlanmadı (${g.progress}/${g.target}).` };
    this.weekClaimed = true;
    this.game.earn(g.gold, 'goal', `Haftalık hedef: ${g.name}`);
    this.game.emit('change', { type: 'goal', goal: g.id });
    return { ok: true, gold: g.gold, goal: g };
  }

  /** Today's goals with their state. */
  list() {
    this.roll();
    const m = this.mult();
    return this.pick(this.date).map((g) => {
      const target = Math.max(1, Math.round(g.target * m)), gold = Math.round(g.gold * m);
      const progress = Math.min(target, Math.max(0, this.value(g.stat) - (this.baseline[g.stat] ?? 0)));
      return { id: g.id, name: g.name, icon: g.icon, text: `${target.toLocaleString('tr-TR')} ${g.label}`, target, gold, progress, complete: progress >= target, claimed: this.claimed.has(g.id) };
    });
  }

  claimable() { const w = this.weekly(); return [...this.list().filter((g) => g.complete && !g.claimed), ...(w && w.complete && !w.claimed ? [w] : [])]; }

  claim(id) {
    const g = this.list().find((x) => x.id === id);
    if (!g) return { ok: false, reason: 'unknown', message: 'Bu hedef bugün yok.' };
    if (g.claimed) return { ok: false, reason: 'claimed', message: 'Bu hedefin ödülü zaten alındı.' };
    if (!g.complete) return { ok: false, reason: 'incomplete', message: `Hedef henüz tamamlanmadı (${g.progress}/${g.target}).` };
    this.claimed.add(id);
    this.game.earn(g.gold, 'goal', `Günlük hedef: ${g.name}`);
    this.game.emit('change', { type: 'goal', goal: id });
    return { ok: true, gold: g.gold, goal: g };
  }

  /** 'goalComplete' once for each goal that just reached its target (not for goals already complete when the game was loaded). */
  announce() {
    for (const g of this.list()) {
      if (!g.complete || this.announced.has(g.id)) continue;
      this.announced.add(g.id);
      if (!g.claimed) this.game.emit('goalComplete', { goal: g });
    }
  }

  exportState() { this.roll(); this.rollWeek(); return { date: this.date, baseline: { ...this.baseline }, claimed: [...this.claimed], week: this.week, weekBase: { ...this.weekBase }, weekClaimed: this.weekClaimed }; }

  importState(state) {
    this.date = state?.date ?? null;
    this.baseline = { ...(state?.baseline ?? {}) };
    this.claimed = new Set(state?.claimed ?? []);
    if (this.date != null && this.date > this.today() && dayNumber(this.date) - dayNumber(this.today()) > 1) this.date = null;   // saved day is more than a day ahead: the clock was changed
    this.week = state?.week ?? null;
    this.weekBase = { ...(state?.weekBase ?? {}) };
    this.weekClaimed = !!state?.weekClaimed;
    this.roll(); this.rollWeek();
    this.announced = new Set(this.list().filter((g) => g.complete).map((g) => g.id));        // no announcements for old completions
  }
}

/** Sanitizes saved goal data: never throws. Anything unreadable starts the day fresh. */
export function validateGoals(raw, cfg = GOALS) {
  const stats = new Set(cfg.pool.map((g) => g.stat)), ids = new Set(cfg.pool.map((g) => g.id));
  const date = raw && Number.isFinite(dayNumber(raw.date)) ? raw.date : null;
  const baseline = {};
  if (date) for (const [k, v] of Object.entries(raw.baseline ?? {})) if (stats.has(k) && Number.isFinite(v) && v >= 0 && v < 1e12) baseline[k] = Math.floor(v);
  const claimed = date ? [...new Set(Array.isArray(raw.claimed) ? raw.claimed.filter((id) => ids.has(id)) : [])] : [];
  const wstats = new Set((cfg.weekly ?? []).map((g) => g.stat));
  const week = raw && Number.isInteger(raw.week) && raw.week > 0 && raw.week < 1e6 ? raw.week : null;
  const weekBase = {};
  if (week) for (const [k, v] of Object.entries(raw.weekBase ?? {})) if (wstats.has(k) && Number.isFinite(v) && v >= 0 && v < 1e12) weekBase[k] = Math.floor(v);
  return { date, baseline, claimed, week, weekBase, weekClaimed: week ? raw.weekClaimed === true : false };
}
