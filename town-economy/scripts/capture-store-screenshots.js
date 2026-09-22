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
const {
  CHROMIUM,
  SAVE_KEY,
  SAVE_VERSION,
  TICK,
  TUTORIAL_KEY,
  assertAchievementsInSync,
  seed,
} = require("./lib/seed-town");

const ROOT = path.join(__dirname, "..");

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

// Both labels, because the seeded save could in principle be missing and the
// button would read "start" instead — matching either keeps the capture from
// failing on a distinction that does not matter to it.
const START_BUTTON = { tr: /^(BAŞLA|DEVAM ET)$/, en: /^(START|CONTINUE)$/ };

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

      // The app opens on the title screen, so every shot has to go through it
      // first. A seeded save makes the button say "continue", not "start".
      await page
        .getByText(START_BUTTON[lang], { exact: true })
        .click({ timeout: 20_000 })
        .catch((err) => {
          throw new Error(`${lang}/${shot.name}: could not leave the title screen`, { cause: err });
        });
      await page.waitForTimeout(2_500);

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
