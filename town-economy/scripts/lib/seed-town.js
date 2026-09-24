// The late-game town that the store screenshots and the preview video are
// both shot in. It lives here rather than in either script because the two
// have to agree: a video of one town cut next to screenshots of a different
// one reads as two different games.
//
// Store assets have to show a town that has actually been played for a
// while, and playing one takes hours of real time. So the capture seeds the
// save slot directly: boot the app once to get a genuine initialState (which
// means this can never go stale against EconomyState — anything it does not
// deliberately override comes from the game itself), patch that state into a
// late-game town, write it to localStorage, and reload.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");

const SAVE_KEY = "taxlume-town-economy-save-v1";
const TUTORIAL_KEY = "taxlume-tutorial-seen-v1";
const CHROMIUM = "/opt/pw-browsers/chromium";

// Read straight out of persist.ts rather than duplicating the number: a save
// written under the wrong version is silently discarded and the capture would
// quietly shoot a brand-new town instead of the seeded one.
const SAVE_VERSION = Number(
  /export const SAVE_VERSION = (\d+);/.exec(
    fs.readFileSync(path.join(ROOT, "src/economy/persist.ts"), "utf8")
  )[1]
);

const DAY = 40; // TICKS_PER_GAME_DAY
const SEED_DAY = 64;
const TICK = SEED_DAY * DAY;
// Day 64 of compounding inflation, applied to every price in the seed so the
// numbers on screen are consistent with the inflation index in the header.
const PRICE_INFLATION = 1.72;

// Kept in step with src/economy/achievements.ts by the check at the bottom of
// this file, so a new achievement cannot quietly start firing mid-capture.
const ACHIEVEMENT_IDS = [
  "first_trade",
  "trader_10",
  "trader_50",
  "first_caravan",
  "caravan_master_10",
  "three_towns",
  "diversify",
  "net_1000",
  "net_5000",
  "net_20000",
  "survive_100",
  "survive_300",
  "streak_3",
  "streak_7",
  "streak_30",
  "prestige_1",
  "workforce",
  "debt_free",
  "metropol_trader",
  "researcher",
  "investor",
  "landlord",
  "real_estate_mogul",
  "skilled_ruler",
  "speculator",
  "hot_hand",
];

function assertAchievementsInSync() {
  const source = fs.readFileSync(path.join(ROOT, "src/economy/achievements.ts"), "utf8");
  const listStart = source.indexOf("export const ACHIEVEMENTS: AchievementDef[]");
  const actual = [...source.slice(listStart).matchAll(/^\s{4}id: "(\w+)",$/gm)].map((m) => m[1]);
  const missing = actual.filter((id) => !ACHIEVEMENT_IDS.includes(id));
  if (missing.length > 0) {
    throw new Error(`achievements.ts has ids this script doesn't know about: ${missing.join(", ")}`);
  }
}

const HISTORY_LEN = 40;

/** Deterministic PRNG, so the seeded numbers — and therefore the shape of
 * every chart — are the same on every run. The PNGs themselves still differ
 * slightly between runs: the app animates on entry and tints the header by
 * time of day, so the pixels are not reproducible even when the data is. */
function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A price history ending at `end`, built backwards so the last point is
 * exactly today's price. A fresh save is only a handful of ticks old and its
 * prices have barely moved, which draws every chart in the game as a flat
 * line — the one thing a screenshot of a trading game must not show. */
function priceWalk(end, rng, volatility = 0.05) {
  const out = new Array(HISTORY_LEN);
  out[HISTORY_LEN - 1] = end;
  for (let i = HISTORY_LEN - 2; i >= 0; i--) {
    const drift = 1 - (0.003 + rng() * 0.008); // older points sit lower
    out[i] = out[i + 1] * drift * (1 + (rng() - 0.5) * volatility);
  }
  return out;
}

function curve(from, to, points) {
  return Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    // Eased rather than linear, so the header sparkline has a shape.
    return from + (to - from) * (t * t * (3 - 2 * t));
  });
}

function scalePrices(record) {
  const out = {};
  for (const [id, value] of Object.entries(record)) out[id] = value * PRICE_INFLATION;
  return out;
}

/** Turns a freshly-booted state into a town roughly 64 days in: a capital,
 * mid-prestige, most systems unlocked and visibly in use. */
function seed(base) {
  const state = JSON.parse(JSON.stringify(base));

  state.tick = TICK;
  state.paused = true; // nothing drifts or pops a modal mid-capture
  state.cash = 186_400;
  state.happiness = 88;
  state.taxRate = 0.12;
  state.difficulty = "normal";

  state.inflationIndex = 168.4;
  state.inflationHistory = curve(100, 168.4, HISTORY_LEN);
  state.inflationRate = 0.000_23;
  state.netWorthHistory = curve(4_200, 214_800, HISTORY_LEN);
  state.rivalNetWorth = 171_300;
  state.rivalCurrentlyAhead = false;

  state.tradeUnlocked = true;
  state.metropolUnlocked = true;
  state.legendaryUnlocked = true;
  state.mythicUnlocked = false;
  state.townRankIndex = 5; // Capital — 100k threshold

  const rng = makeRng(20_260_918);
  for (const [id, good] of Object.entries(state.goods)) {
    good.price *= PRICE_INFLATION;
    good.history = priceWalk(good.price, rng);
    good.supply = Math.round(good.supply);
    const holdings = { bread: 48, milk: 30, wood: 22, iron: 64, cloth: 18, wine: 26, silk: 12, spice: 9 };
    good.holding = holdings[id] ?? 0;
    good.avgCost = good.holding > 0 ? good.price * 0.86 : 0;
  }
  for (const town of Object.values(state.foreignTowns)) {
    town.prices = scalePrices(town.prices);
  }
  for (const [id, asset] of Object.entries(state.assets)) {
    asset.price *= PRICE_INFLATION;
    asset.history = priceWalk(asset.price, rng, 0.09); // assets swing harder than goods
    asset.holding = { gold: 24, oil: 40 }[id] ?? 0;
    // Without a cost basis the card reads "avg. cost 0.00" next to a profit
    // figure, which looks like a bug rather than a position.
    asset.avgCost = asset.holding > 0 ? asset.price * 0.88 : 0;
  }

  state.upgrades = {
    ...state.upgrades,
    market: 4,
    caravanserai: 3,
    townhall: 3,
    bank: 2,
    guardTower: 2,
    earthquakeFund: 1,
    storageYard: 4,
  };
  state.researched = [
    "bread_t1",
    "bread_t2",
    "milk_t1",
    "wood_t1",
    "iron_t1",
    "iron_t2",
    "cloth_t1",
    "wine_t1",
  ];
  state.workers = { ...state.workers, bread: 3, milk: 2, wood: 2, iron: 3, cloth: 1 };
  state.ownedProperties = ["landPlot", "house", "warehouse", "farm"];

  state.doctrine = "merchants";
  state.prestigeLevel = 1;
  state.prestigePoints = 3;
  state.bestNetWorthEver = 214_800;
  state.priorBestNetWorth = 96_400;

  state.stats = {
    ...state.stats,
    totalTrades: 412,
    totalCaravansSent: 63,
    totalCaravansCompleted: 61,
    townsTradedWith: ["windyhill", "ironforge", "portcity", "grandbazaar", "diamondharbor"],
    loansRepaid: 2,
    contractsWon: 7,
    totalRealizedProfit: 96_300,
    bestTradeStreak: 11,
  };
  // Everything the seeded town has already earned. It has to be exhaustive:
  // an achievement whose target the seed meets but whose id is missing here
  // unlocks the moment the app boots, and the celebration lands over the tab
  // bar. The two left out are genuinely unmet (a 30-day streak, three
  // prestige perks), so the Goals screen still shows something to chase.
  state.unlockedAchievements = ACHIEVEMENT_IDS.filter(
    (id) => id !== "streak_30" && id !== "real_estate_mogul"
  );
  // Yesterday, so this is a returning player and not a first launch. The
  // daily wheel only opens for someone coming back, and a fixture with no
  // last-opened date reads as day one — which made the "saved" scenarios
  // silently skip the wheel they exist to exercise.
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  state.streak = { count: 7, lastOpenedDate: yesterday };
  state.tradeStreak = 4;

  // The weekly challenge measures a stat against where it stood when the week
  // started, so seeding 412 lifetime trades against a startValue of 0
  // completes it the moment the app boots — which fires a celebration that
  // sits over the tab bar and blocks the capture. Start it partway instead.
  const weeklyStart = {
    weekly_trader: state.stats.totalTrades - 26,
    weekly_logistics: state.stats.totalCaravansCompleted - 3,
    weekly_profiteer: state.stats.totalRealizedProfit - 380,
  };
  state.weeklyChallenge = {
    ...state.weeklyChallenge,
    startValue: weeklyStart[state.weeklyChallenge.templateId] ?? 0,
    claimed: false,
  };

  // The systems that are the point of this screenshot refresh: a demand
  // cycle running with the next one already telegraphed, rival houses
  // working foreign markets, caravans on the road.
  state.demandCycle = {
    startTick: TICK - 28,
    endTick: TICK + 92,
    hotGoodIds: ["silk", "wine"],
    gluttedGoodId: "wood",
  };
  state.nextDemandCycle = {
    startTick: TICK + 92,
    endTick: TICK + 212,
    hotGoodIds: ["iron", "jewelry"],
    gluttedGoodId: "bread",
  };
  state.tradingHouses = [
    { houseId: "goldenScales", townId: "legendharbor", goodId: "silk", side: "buying", untilTick: TICK + 64 },
    { houseId: "saltRoad", townId: "grandbazaar", goodId: "spice", side: "selling", untilTick: TICK + 38 },
  ];
  state.caravans = [
    {
      id: 9001,
      townId: "grandbazaar",
      goodId: "silk",
      direction: "export",
      qty: 30,
      amount: 2_480,
      departedTick: TICK - 14,
      arrivesAtTick: TICK + 10,
      insured: true,
    },
    {
      id: 9002,
      townId: "ironforge",
      goodId: "iron",
      direction: "import",
      qty: 45,
      amount: 45,
      departedTick: TICK - 6,
      arrivesAtTick: TICK + 18,
      insured: false,
    },
  ];
  state.nextId = 9100;

  // Off by default; individual shots turn the ones they want back on.
  state.pendingCrisis = null;
  state.pendingDecision = null;
  state.pendingRequest = null;
  state.pendingRivalOffer = null;
  state.dailyBonusPending = null;
  state.offlineSummary = null;
  state.activeMiniQuest = null;
  state.loan = null;
  state.speedBoostExpiresAt = null;
  state.gameOver = false;

  state.lastEvent = null;
  state.eventLog = state.eventLog.slice(0, 3);

  return state;
}

/** The localized default town name, read out of strings.ts rather than
 * duplicated here.
 *
 * The capture boots the app to get a real initialState, and that boot is in
 * the app's default language — so `townName` comes back "Altın Kasaba" no
 * matter which language the shot is for. Flipping `state.language` afterwards
 * does not rename the town, and it should not: renaming a player's own town
 * on a language switch would be wrong. The seed has to set it explicitly, or
 * the English store screenshots show a Turkish town name that no English
 * player would ever see.
 */
function defaultTownName(lang) {
  const source = fs.readFileSync(path.join(ROOT, "src/i18n/strings.ts"), "utf8");
  const names = [...source.matchAll(/defaultTownName: "([^"]+)"/g)].map((m) => m[1]);
  if (names.length !== 2) {
    throw new Error(`expected two defaultTownName entries in strings.ts, found ${names.length}`);
  }
  // strings.ts holds tr first, then en — the same order check:i18n relies on.
  return lang === "en" ? names[1] : names[0];
}

module.exports = {
  defaultTownName,
  CHROMIUM,
  SAVE_KEY,
  TUTORIAL_KEY,
  SAVE_VERSION,
  TICK,
  SEED_DAY,
  HISTORY_LEN,
  ACHIEVEMENT_IDS,
  assertAchievementsInSync,
  makeRng,
  priceWalk,
  seed,
};
