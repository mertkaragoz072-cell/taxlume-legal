/** Every tuning constant the simulation runs on, in one place.
 *
 * These were inline in useEconomy.ts, which made the reducer hard to read and
 * made "what number controls this?" a search rather than a lookup. Nothing
 * here has behaviour; changing a value here changes the game's balance. */

import { DifficultyId } from "./difficulty";

export const HISTORY_LEN = 40;
export const TICK_MS = 3000;
// "Watch an ad to speed up" — a temporary, real-time-bound multiplier on the
// tick rate itself (not on TICKS_PER_GAME_DAY or any per-day rate), so a
// boosted day plays out faster in wall-clock time without changing what a
// game day means anywhere else.
export const SPEED_BOOST_MULTIPLIER = 3;
export const SPEED_BOOST_DURATION_MS = 30 * 60 * 1000;
export const BOOSTED_TICK_MS = Math.round(TICK_MS / SPEED_BOOST_MULTIPLIER);
export const EVENT_LOG_CAP = 30;
export const DEFAULT_DIFFICULTY: DifficultyId = "normal";
export const TOWN_NAME_MAX_LENGTH = 24;
// A new town starts local-market-only; once its net worth proves the
// player can run an economy, inter-city trade (and the caravan/foreign-
// town system) opens up. Sticky once crossed — see applyTradeUnlock.
export const TRADE_UNLOCK_NET_WORTH = 500;
// A further milestone past ordinary inter-city trade: once the town has
// grown enough, the far-off metropolises (see towns.ts' "metropol" tier —
// pricier caravans, but far better payoff for the luxury goods) open up.
// Sticky once crossed — see applyMetropolUnlock.
export const METROPOL_UNLOCK_NET_WORTH = 3000;
// The one content gate tied to prestigeLevel rather than the current run's
// net worth — see towns.ts' "legendary" tier and applyLegendaryUnlock.
export const LEGENDARY_UNLOCK_PRESTIGE_LEVEL = 3;
// A second, scarcer prestige currency — legendaryPoints only start accruing
// once legendaryUnlocked is already true, one per prestige from then on (see
// prestige() below). Reaching the milestone opens towns.ts' "mythic" tier.
export const LEGENDARY_POINTS_PER_PRESTIGE = 1;
export const MYTHIC_UNLOCK_LEGENDARY_POINTS = 3;
export const DAILY_QUEST_COUNT = 3;
// --- In-game day cycle -----------------------------------------------------
// A separate clock from the real-world calendar day used for daily
// check-ins/streaks/quests: this one is purely simulation time, ticking
// forward with play (and offline catch-up) rather than the wall clock, so
// systems like loan interest can be priced in a humane "per day" unit
// instead of the raw ~1.5s tick.
export const TICKS_PER_GAME_DAY = 40;
// --- Prestige ------------------------------------------------------------
// The "end of a run" milestone: cash in a well-grown town for a permanent,
// stacking bonus that survives every future reset (see PRESTIGE below and
// the RESET case, which both carry prestigeLevel forward).
export const PRESTIGE_UNLOCK_NET_WORTH = 10000;
export const PRESTIGE_PRODUCTION_BONUS_PER_LEVEL = 0.08;
export const PRESTIGE_CASH_BONUS_PER_LEVEL = 60;
// Points earned each prestige, spent on prestigePerks.ts — a player-chosen
// permanent tree layered on top of the automatic level bonus above.
export const PRESTIGE_POINTS_PER_PRESTIGE = 1;
// --- Town ranks ------------------------------------------------------------
// An endless, sticky title ladder driven by net worth alone (see
// townRanks.ts) — every tier ever reached stays reached even if net worth
// later falls, and each one adds a permanent sliver to production so there
// is always a next rank worth chasing within a single run, not just across
// resets like prestige.
export const TOWN_RANK_PRODUCTION_BONUS_PER_RANK = 0.004;
// --- Banking / loans -------------------------------------------------------
// A loan is cash now against interest that compounds every tick until
// repaid — real leverage, real risk. At most one outstanding at a time.
// Rates are priced per in-game DAY (see TICKS_PER_GAME_DAY above) — a much
// more legible unit than the raw tick — then converted to an equivalent
// per-tick rate so the balance still compounds smoothly every tick.
export const LOAN_MIN_CAP = 100;
export const LOAN_MAX_NET_WORTH_PCT = 0.6;
export const LOAN_BASE_INTEREST_RATE_PER_DAY = 0.05;
// A higher Banka upgrade level buys a cheaper loan, floored so it's never free.
export const LOAN_BANK_DISCOUNT_PER_LEVEL_PER_DAY = 0.006;
export const LOAN_MIN_INTEREST_RATE_PER_DAY = 0.015;
export const LOAN_MAX_INTEREST_RATE_PER_DAY = 0.35;
// The rate offered reflects how hot inflation is running right now, like a
// real central bank's policy rate — capped so a runaway inflation spiral
// can't make every loan instantly unpayable. inflationRate is a per-tick
// drift, so it's first compounded out to what it implies for a full
// in-game day before the sensitivity multiplier is applied.
export const LOAN_INFLATION_SENSITIVITY = 0.4;
export const LOAN_MAX_INFLATION_DAY_CONTRIB = 0.15;
// Term choice at signing: longer commitments carry more rate risk for the
// bank, so they lock in a higher (but fixed for the life of the loan) rate.
// LOAN_TERM_DAYS_PER_MONTH is purely a flavor conversion so a term reads as
// a real number of in-game days (no repayment schedule is enforced — the
// term only sets the rate offered, repayment stays free-form any time).
export const LOAN_TERM_MONTHS_STEPS = [3, 6, 12, 24];
export const LOAN_TERM_RATE_PER_MONTH_PER_DAY = 0.0015;
export const LOAN_TERM_DAYS_PER_MONTH = 20;
// How much an all-consuming debt (balance ≈ net worth) drags down the
// villagers' target happiness, on top of whatever the tax rate is already doing.
export const DEBT_HAPPINESS_DRAG = 20;
// --- Forward contracts ---------------------------------------------------
// A cash-settled bet on a good's home price at signing vs. its price at
// maturity — "long" pays off if it rose, "short" if it fell. Margin is
// collateral pulled up front; a loss is capped at that margin (see
// settlement in tick()) so a bad bet can never push cash negative.
export const CONTRACT_MAX_ACTIVE = 3;
export const CONTRACT_MARGIN_PCT = 0.25;
export const CONTRACT_TERM_DAY_STEPS = [1, 3, 5, 10];
// A bulk delivery contract reserves goods the player already holds today
// (see openBulkContract) and guarantees a locked-in payout at maturity —
// today's price plus a fixed bonus, paid regardless of where the price
// actually moves. Unlike ForwardContract above, no margin is ever at risk
// and the outcome is never a loss, only a delayed, boosted sale.
export const BULK_CONTRACT_MAX_ACTIVE = 3;
export const BULK_CONTRACT_BONUS_PCT = 0.15;
export const BULK_CONTRACT_TERM_DAY_STEPS = [2, 5, 10];
// A standing order: when a good's price crosses the threshold captured at
// creation time (current price minus/plus one of these percentages), the
// rule re-fires trade() every tick the condition still holds — no one-shot
// bookkeeping, just a repeating conditional buy/sell the player sets and
// forgets. See applyAutoTradeRules, run once per tick right after tick().
export const AUTO_TRADE_MAX_RULES = 3;
export const AUTO_TRADE_TRIGGER_PCT_STEPS = [0.1, 0.2, 0.3];
// --- Supply & demand pricing -------------------------------------------
// price = basePrice * (townPriceIndex / 100) * scarcity(supply)
// scarcity = clamp((baseSupply / supply) ^ elasticity, SCARCITY_MIN, SCARCITY_MAX)
// Buying/selling and production/consumption all move `supply`, not price
// directly — price is always a pure function of supply + the town price
// index, so every good's price stays proportional to its base price and
// to the same macro inflation everything else feels.
export const SCARCITY_MIN = 0.5;
export const SCARCITY_MAX = 2.2;
export const SUPPLY_MIN_FACTOR = 0.15;
export const SUPPLY_MAX_FACTOR = 3;
export const PRODUCTION_NOISE = 0.2; // ± fraction of baseProduction, random per tick
export const PRODUCTION_PENALTY_FACTOR = 0.7; // unhappy villagers produce down to 30% of normal
export const PRODUCTION_BONUS_FACTOR = 0.15; // content villagers produce up to 15% more
export const EFFICIENCY_MIN = 0.3;
export const EFFICIENCY_MAX = 1.15;
export const FOREIGN_SUPPLY_REVERSION = 0.06; // foreign markets restock toward equilibrium each tick
export const FOREIGN_NOISE = 0.15;
// --- Demand pressure ------------------------------------------------------
// Supply alone drifts back toward (and past) baseSupply within a tick or two
// once villagers are happy and producing above baseline — too fast for a
// player's own buy/sell to feel like it moved anything. demandPressure is a
// separate multiplier on top of the supply-driven price, nudged by every
// trade and decaying slowly on its own clock, so a big order visibly bends
// the price and that bend lingers for a couple minutes of real play before
// fading — long enough to feel like your trade mattered, short enough that
// the market always finds its own level again.
export const DEMAND_PRESSURE_DECAY = 0.98; // per tick (TICK_MS=3000ms) => ~50-tick / ~150s half-life
export const DEMAND_PRESSURE_SENSITIVITY = 0.35; // price swing per "one baseSupply's worth" traded, before market depth
export const DEMAND_PRESSURE_MAX = 0.4; // clamp so no single order can send price to an absurd multiple
// --- Bid/ask spread ---------------------------------------------------------
// Real markets charge a toll on every round trip — without one, buying and
// immediately selling back is free, so profit is pure luck rather than a
// real read on where the price is headed. Buying costs a bit above the
// quoted price, selling nets a bit below it; a deeper Pazar Yeri (the same
// upgrade that dampens price impact) narrows the spread too.
export const MARKET_SPREAD = 0.03; // total round-trip cost at market upgrade level 0
// --- Hot streak -------------------------------------------------------------
// A skill-expression layer on top of realized profit/loss: sell at a profit
// (goods or assets, same counter) and the streak grows, paying a bonus on
// top of that trade's own profit — sell at a loss and it's back to zero.
// No bonus on the first win of a streak; it only starts compounding once
// you've proven you can string wins together, so the tension is real
// ("do I cash out now or risk the streak on one more trade?").
export const HOT_STREAK_BONUS_PER_TRADE = 0.03; // +3% of that trade's profit per streak length past 1
export const HOT_STREAK_MAX_BONUS = 0.3; // capped at +30%
// --- Investable assets (gold, oil, stocks) -----------------------------
// A pure random walk (drift + noise, occasionally a fatter-tailed spike)
// bounded so a bad run can't send a price to zero or off to infinity.
export const ASSET_MIN_FACTOR = 0.2;
export const ASSET_MAX_FACTOR = 6;
export const ASSET_SPIKE_CHANCE = 0.03;
export const ASSET_SPIKE_MULT = 5;
export const TAX_RATE_MAX = 0.5;
export const TAX_RATE_STEPS = [0, 0.1, 0.2, 0.3, 0.4, 0.5];
// Tax is levied on the town's real output (production × current price, a
// GDP-style base) rather than a flat number, so revenue naturally scales
// with both prices and how much villagers are actually producing.
export const TAX_OUTPUT_FACTOR = 0.008;
export const INFLATION_REVERSION_RATE = 0.035; // pull toward the difficulty's baseline drift, per tick
export const HAPPINESS_TARGET_SLOPE = 220;
export const HAPPINESS_EASE = 0.04;
export const PRODUCTION_INFLATION_FACTOR = 0.003;
export const CONTENT_BONUS_FACTOR = 0.001;
export const ANGRY_THRESHOLD = 20;
export const ANGRY_EVENT_CHANCE = 0.1;
export const ANGRY_CASH_PENALTY = 25;
export const CONTENT_THRESHOLD = 85;
export const CONTENT_EVENT_CHANCE = 0.06;
export const CONTENT_CASH_BONUS = 15;
// --- Offline progress ----------------------------------------------------
// How long the app was closed is capped so a multi-day absence doesn't
// either freeze the UI simulating tens of thousands of ticks or hand out
// unbounded free progress; a modest, always-fast catch-up is the goal.
export const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000; // 8 hours
// Kept deliberately modest: baseInflationDrift compounds every tick, so
// thousands of simulated ticks would compound even the mild live-session
// drift into hyperinflation almost every time — turning "welcome back"
// into "sorry, it's all gone" regardless of policy. This cap keeps the
// catch-up meaningful (tax income, a caravan or two, a little price
// drift) without exposing an absence to a crash a live player wouldn't
// have hit in the same stretch either.
export const MAX_OFFLINE_TICKS = 240;
export const MIN_OFFLINE_MS_TO_SHOW = 60 * 1000; // don't pop up for a quick app switch
// Rarer than passive news (EVENT_TEMPLATES) so each one feels like a
// distinct moment; freezes the tick loop until answered (see the guard
// at the top of tick()).
export const DECISION_EVENT_CHANCE = 0.02;
// A separate, simpler kind of interruption from decisions: a villager just
// wants some of one good, not a policy choice with varied outcomes.
export const VILLAGER_REQUEST_CHANCE = 0.018;
// Rarer still — a rival trader's bulk-buy offer pays a premium over market
// price, so it should feel like an occasional windfall, not a routine ask.
export const RIVAL_OFFER_CHANCE = 0.014;
// Unlike a decision or villager request, a mini quest never freezes the
// tick loop — it just runs in the background against a short deadline
// (see miniQuests.ts) while the player keeps playing normally.
export const MINI_QUEST_CHANCE = 0.02;
// Much rarer than a mini quest — a seasonal event runs far longer (tens of
// ticks) so overlapping spawns would just mean "always some price boost
// active," which defeats the "special occasion" feel (see seasonalEvents.ts).
export const SEASONAL_EVENT_CHANCE = 0.006;
// A caravan out on the road risks a bandit raid on arrival unless the player
// paid to insure it — see sendCaravan and the caravan-completion loop in tick().
export const CARAVAN_RAID_CHANCE = 0.15;
export const CARAVAN_RAID_LOSS_MIN = 0.4;
export const CARAVAN_RAID_LOSS_MAX = 0.7;
// Upfront premium, as a fraction of the caravan's own value, that fully
// waives raid risk for that one caravan.
export const CARAVAN_INSURANCE_COST_PCT = 0.08;
// A rare, purely positive windfall — no choice or interruption, just a nice
// surprise. Sized off current cash (with a floor so it's never trivial
// early on) rather than a flat amount, so it stays a meaningful treat at
// every stage of a run instead of fading into irrelevance late-game.
export const LOST_TREASURE_CHANCE = 0.008;
export const LOST_TREASURE_PCT_OF_CASH = 0.05;
export const LOST_TREASURE_MIN_AMOUNT = 20;
// A simulated "ghost" rival — grows steadily on its own (no strategy, just
// a rough backdrop pace) so the player has something to race against
// besides their own past runs. Purely a flavor comparison; nothing the
// player does affects it directly.
export const RIVAL_TOWN_GROWTH_RATE = 0.0015;
export const RIVAL_TOWN_GROWTH_JITTER = 0.002;
// A rare, broad disaster hitting every good's home supply at once — see the
// earthquake roll in tick() and the Earthquake Fund upgrade that softens it.
export const EARTHQUAKE_CHANCE = 0.003;
export const EARTHQUAKE_LOSS_MIN = 0.1;
export const EARTHQUAKE_LOSS_MAX = 0.25;
export const EARTHQUAKE_LOSS_FLOOR = 0.02;
// A generous default so this never binds during ordinary early/mid-game
// play — it only starts to matter once a player is genuinely hoarding
// several goods at once, which is exactly the late-game tension it's meant
// to add. Only the home-market buy path is capped (not caravan imports,
// whose cash is already spent by the time the goods would arrive, so
// clamping there would just make goods vanish rather than block a choice).
export const STORAGE_BASE_CAPACITY = 600;
export const DAILY_BONUS_BASE = 20;
export const DAILY_BONUS_PER_STREAK_DAY = 8;
export const DAILY_BONUS_CAP = 90;
export const MS_PER_DAY = 86400000;
