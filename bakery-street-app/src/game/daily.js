// Daily reward: one claim per calendar day (device local date), a 7-day cycle, restart at day 1 after a skipped day.
// Dates are plain 'YYYY-MM-DD' strings; all day arithmetic uses UTC day numbers of those strings, so DST never skews it.
import { DAILY } from '../data/economy.js';

const CLOCK_SLACK_MS = 5 * 60_000;   // the clock may differ this much from the last claim (sync jitter) before it counts as set back
const CLOCK_BOGUS_MS = 400 * 86_400_000;   // a last claim this far ahead of the clock came from a clock set absurdly far forward and is ignored (never locks a player out for years)
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Local calendar date of a millisecond timestamp. */
export function dateKey(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Whole-day number of a 'YYYY-MM-DD' string (NaN when it is not a real date). */
export function dayNumber(key) {
  const m = DATE_RE.exec(key ?? '');
  if (!m) return NaN;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const t = Date.UTC(y, mo - 1, d);
  const back = new Date(t);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return NaN;   // 2024-02-31 etc.
  return t / 86_400_000;
}

export class DailyReward {
  /** @param {import('./game.js').Game} game */
  constructor(game, defs = DAILY) {
    this.game = game;
    this.defs = defs;
    this.lastDate = null;   // date of the last collected reward
    this.day = 0;           // cycle day (1..7) of that reward; 0 = never claimed
    this.lastAt = null;     // the real time (ms) of the last claim: a clock set back before it cannot claim again
    game.daily = this;
  }

  today() { return dateKey(this.game.clock()); }

  /**
   * State for today. nextDay = the cycle day a claim now would give.
   *  - never claimed, or 2+ days since the last claim -> day 1 (streakBroken when a streak existed)
   *  - exactly the next day -> next day of the cycle (7 wraps to 1)
   *  - same day -> already claimed
   *  - date moved backwards by one day (time-zone change) -> still counts as claimed
   *  - date moved back by more than a day (clock changed) -> claimable again, restarting at day 1
   */
  status() {
    const today = this.today(), n = this.defs.length;
    if (this.lastAt != null && this.game.clock() < this.lastAt - CLOCK_SLACK_MS && this.game.clock() > this.lastAt - CLOCK_BOGUS_MS) return { today, canClaim: false, claimedToday: true, nextDay: this.day % n + 1, streakBroken: false, streak: this.day, clockBack: true };
    if (this.lastDate == null) return { today, canClaim: true, claimedToday: false, nextDay: 1, streakBroken: false, streak: 0 };
    const diff = dayNumber(today) - dayNumber(this.lastDate);
    if (diff === 0 || diff === -1) return { today, canClaim: false, claimedToday: true, nextDay: this.day % n + 1, streakBroken: false, streak: this.day };
    if (diff === 1) return { today, canClaim: true, claimedToday: false, nextDay: this.day % n + 1, streakBroken: false, streak: this.day };
    return { today, canClaim: true, claimedToday: false, nextDay: 1, streakBroken: diff > 1 && this.day > 0, streak: this.day, clockChanged: diff < -1 };
  }

  /** Collects today's reward: date + day + rewards are updated in one step. */
  claim() {
    const s = this.status();
    if (!s.canClaim) return { ok: false, reason: 'claimed', message: 'Bugünün ödülü zaten alındı. Yarın tekrar gel!' };
    const reward = this.defs[s.nextDay - 1], g = this.game;
    if (reward.gold) g.earn(reward.gold, 'daily', `Günlük ödül: gün ${s.nextDay}`);
    if (reward.gems) g.player.gems = (g.player.gems ?? 0) + reward.gems;
    for (const [id, n] of Object.entries(reward.ingredients ?? {})) g.ingredients[id] += n;
    this.lastDate = s.today;
    this.lastAt = g.clock();
    this.day = s.nextDay;
    g.emit('change', { type: 'daily', day: this.day });
    return { ok: true, day: this.day, reward, streakBroken: s.streakBroken };
  }

  exportState() { return { lastDate: this.lastDate, day: this.day, lastAt: this.lastAt }; }

  importState(state) {
    this.lastDate = state?.lastDate ?? null;
    this.day = state?.day ?? 0;
    this.lastAt = Number.isFinite(state?.lastAt) ? state.lastAt : null;
  }
}

/** Strict validation of saved daily data (throws a readable Error). Missing data = never claimed. */
export function validateDaily(raw, defs = DAILY) {
  if (raw === undefined) return { lastDate: null, day: 0, lastAt: null };
  if (!raw || typeof raw !== 'object') throw new Error('günlük ödül kaydı geçersiz');
  const { lastDate = null, day = 0 } = raw, lastAt = Number.isFinite(raw.lastAt) && raw.lastAt > 0 ? raw.lastAt : null;
  if (!Number.isInteger(day) || day < 0 || day > defs.length) throw new Error('günlük ödül günü geçersiz');
  if (lastDate === null) { if (day !== 0) throw new Error('günlük ödül kaydı tutarsız'); return { lastDate: null, day: 0, lastAt: null }; }
  if (typeof lastDate !== 'string' || Number.isNaN(dayNumber(lastDate))) throw new Error('günlük ödül tarihi geçersiz');
  if (day < 1) throw new Error('günlük ödül kaydı tutarsız');
  return { lastDate, day, lastAt };
}
