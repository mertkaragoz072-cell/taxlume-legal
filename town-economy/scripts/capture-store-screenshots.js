// Captures the App Store / Play Store screenshot set from the real running
// app, at the 1290x2796 the App Store wants for a 6.7" iPhone.
//
// Store screenshots have to show a town that has actually been played for a
// while, and playing one takes hours of real time. So each shot seeds the
// save slot directly: the script boots the app once to get a genuine
// initialState (which means it can never go stale against EconomyState —
// anything it doesn't deliberately override comes from the game itself),
// patches that state into a late-game town, writes it to localStorage, and
// reloads. Every shot re-seeds, so the crisis banner can be present in one
// frame and absent in the next.
//
// Usage:
//   npx expo start --web --port 8251
//   node scripts/capture-store-screenshots.js [--port 8251] [--lang tr|en|both]
//
// Output: store-assets/screenshots/<lang>/NN-name.png

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const SAVE_KEY = "taxlume-town-economy-save-v1";
const TUTORIAL_KEY = "taxlume-tutorial-seen-v1";
const CHROMIUM = "/opt/pw-browsers/chromium";
const ROOT = path.join(__dirname, "..");

// Read straight out of persist.ts rather than duplicating the number: a save
// written under the wrong version is silently discarded and the capture would
// quietly shoot a brand-new town instead of the seeded one.
const SAVE_VERSION = Number(
  /export const SAVE_VERSION = (\d+);/.exec(
    fs.readFileSync(path.join(ROOT, "src/economy/persist.ts"), "utf8")
  )[1]
);

const args = process.argv.slice(2);
const argValue = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i === -1 ? fallback : args[i + 1];
};
const PORT = argValue("--port", "8251");
const LANG_ARG = argValue("--lang", "both");
const LANGS = LANG_ARG === "both" ? ["tr", "en"] : [LANG_ARG];
const APP_URL = `http://localhost:${PORT}`;

// A 6.7" iPhone: 430x932 CSS pixels at 3x is exactly the 1290x2796 the App
// Store requires, so the frames need no resampling afterwards.
const VIEWPORT = { width: 430, height: 932 };
const SCALE = 3;

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

/** Deterministic PRNG, so a re-run produces byte-identical screenshots. */
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
  state.streak = { count: 7, lastOpenedDate: state.streak.lastOpenedDate };
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

const SHOTS = [
  {
    name: "01-market",
    tab: { tr: "Piyasa", en: "Market" },
    // The one frame that carries the crisis countdown: it is the system
    // hardest to explain in a store description and easiest to show.
    patch: (s) => {
      s.pendingCrisis = {
        id: 77,
        templateId: "drought",
        announcedAtTick: TICK - 16,
        strikesAtTick: TICK + 24,
      };
    },
  },
  { name: "02-trade-map", tab: { tr: "Ticaret", en: "Trade" } },
  { name: "03-town", tab: { tr: "Kasaba", en: "Town" }, patch: (s) => (s.happiness = 94) },
  { name: "04-research", tab: { tr: "Araştırma", en: "Research" } },
  { name: "05-invest", tab: { tr: "Yatırım", en: "Invest" } },
  { name: "06-goals", tab: { tr: "Hedefler", en: "Goals" } },
  { name: "07-inventory", tab: { tr: "Envanter", en: "Inventory" } },
  {
    // No tab to click: App.tsx offers the doctrine choice by itself as soon as
    // a town without one passes DOCTRINE_UNLOCK_NET_WORTH, so clearing the
    // doctrine is the whole setup — the modal is already up on load.
    name: "08-doctrine",
    patch: (s) => (s.doctrine = null),
    after: async (page, lang) => {
      // Pick one, so the frame shows the choice being made rather than the
      // confirm button greyed out reading "pick a path".
      await page
        .locator(`text=${lang === "tr" ? "Tüccar Loncası" : "Merchants' Guild"}`)
        .first()
        .click({ timeout: 8_000 });
      await page.waitForTimeout(900);
    },
  },
];

async function main() {
  assertAchievementsInSync();
  if (!fs.existsSync(CHROMIUM)) throw new Error(`Chromium not found at ${CHROMIUM}`);
  const browser = await chromium.launch({ executablePath: CHROMIUM, args: ["--no-sandbox"] });

  // Boot once with empty storage to get a real initialState to patch.
  const probe = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: SCALE });
  await probe.goto(APP_URL, { waitUntil: "networkidle" });
  await probe.waitForFunction((k) => localStorage.getItem(k) !== null, SAVE_KEY, { timeout: 90_000 });
  const raw = await probe.evaluate((k) => localStorage.getItem(k), SAVE_KEY);
  await probe.close();

  const parsed = JSON.parse(raw);
  if (parsed.version !== SAVE_VERSION) {
    throw new Error(`the app wrote save version ${parsed.version}, but persist.ts says ${SAVE_VERSION}`);
  }
  const base = seed(parsed.state);

  for (const lang of LANGS) {
    const outDir = path.join(ROOT, "store-assets", "screenshots", lang);
    fs.mkdirSync(outDir, { recursive: true });

    for (const shot of SHOTS) {
      const state = JSON.parse(JSON.stringify(base));
      state.language = lang;
      // Stamped per shot, not once for the whole run: a full two-language
      // capture takes minutes, and a save that looks minutes old trips the
      // "while you were away" summary, which then covers the tab bar.
      state.lastSavedAt = Date.now();
      if (shot.patch) shot.patch(state);

      const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: SCALE });
      // The seed has to be in storage before any app code runs. Loading the
      // page first and writing afterwards races the app's own first save,
      // which then wins on the reload and shoots a day-1 town instead.
      await page.addInitScript(
        ([saveKey, tutorialKey, version, next]) => {
          localStorage.setItem(saveKey, JSON.stringify({ version, state: next }));
          localStorage.setItem(tutorialKey, "1");
        },
        [SAVE_KEY, TUTORIAL_KEY, SAVE_VERSION, state]
      );
      await page.goto(APP_URL, { waitUntil: "networkidle" });
      await page.waitForTimeout(5_000);

      try {
        // Retried rather than one long click: what blocks the tab bar is
        // always something transient animating over it, and a single 15s
        // attempt fails on whichever frame it started in.
        if (shot.tab) {
          const tab = page.locator(`[aria-label="${shot.tab[lang]}"]`).first();
          for (let attempt = 1; ; attempt++) {
            try {
              await tab.click({ timeout: 10_000 });
              break;
            } catch (err) {
              if (attempt === 3) throw err;
              await page.waitForTimeout(3_000);
            }
          }
        }
      } catch (err) {
        // Almost always a modal the seed forgot to switch off, sitting over
        // the tab bar. Say which one rather than just "intercepts pointer
        // events" 30 lines deep in a Playwright trace.
        // Walk up from the point the tab bar occupies and report the first
        // ancestor with text: that names the overlay that is in the way.
        /* eslint-disable no-undef -- this callback is serialised and run in the page, not in Node */
        const blocker = await page.evaluate(() => {
          let node = document.elementFromPoint(60, window.innerHeight - 30);
          for (let i = 0; i < 8 && node; i++, node = node.parentElement) {
            const text = (node.innerText || "").trim();
            if (text) return text.slice(0, 200);
          }
          return "(nothing with text)";
        });
        /* eslint-enable no-undef */
        throw new Error(`${lang}/${shot.name}: could not reach the tab bar. Blocked by:\n${blocker}`, {
          cause: err,
        });
      }
      // Long enough for the entry animations and the SVG map to settle.
      await page.waitForTimeout(2_500);
      if (shot.after) await shot.after(page, lang);

      const file = path.join(outDir, `${shot.name}.png`);
      await page.screenshot({ path: file });
      console.log(`✅ ${lang}/${shot.name}.png`);
      await page.close();
    }
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
