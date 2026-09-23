// Renders the poster-style listing screenshots: the app screen inside a phone,
// on a painted town, under a wooden sign and a ribbon headline.
//
// The first shot is the hero — it carries the merchant and the call to action
// the way a casual-game listing's lead image does. The other seven keep the
// same sign, ribbon and background so the set reads as one piece, without the
// character covering the screen they exist to show.
//
//   NODE_PATH=/opt/node22/lib/node_modules node scripts/store/render-posters.js [--cta 0]
//
// Output: store-assets/screenshots-poster/<lang>/NN-name.png, 1290x2796.
//
// `--cta 0` drops the download button. Apple's screenshot guidance is that a
// preview shows the app; a "download now" control is a Google Play habit and
// carries a real rejection risk on the App Store, so the two stores can want
// different sets.

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { CHROMIUM } = require("../lib/seed-town");

const ROOT = path.join(__dirname, "..", "..");
const SRC = path.join(ROOT, "store-assets", "screenshots");
const OUT = path.join(ROOT, "store-assets", "screenshots-poster");
const PAGE = path.join(__dirname, "poster.html");
const SIZE = { width: 1290, height: 2796 };

const args = process.argv.slice(2);
const CTA = args.includes("--cta") ? args[args.indexOf("--cta") + 1] !== "0" : true;

async function main() {
  if (!fs.existsSync(CHROMIUM)) throw new Error(`Chromium not found at ${CHROMIUM}`);
  const browser = await chromium.launch({ executablePath: CHROMIUM, args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: SIZE, deviceScaleFactor: 1 });
  const problems = [];
  page.on("pageerror", (e) => problems.push(e.message));

  for (const lang of ["tr", "en"]) {
    const shots = fs
      .readdirSync(path.join(SRC, lang))
      .filter((f) => f.endsWith(".png"))
      .map((f) => f.replace(/\.png$/, ""))
      .sort();
    fs.mkdirSync(path.join(OUT, lang), { recursive: true });

    for (const [i, shot] of shots.entries()) {
      const url = `file://${PAGE}?lang=${lang}&shot=${shot}` + `&hero=${i === 0 ? 1 : 0}&cta=${CTA ? 1 : 0}`;
      await page.goto(url, { waitUntil: "networkidle" });
      /* eslint-disable no-undef -- serialised into the page */
      await page.evaluate(() => document.fonts.ready);
      const missing = await page.evaluate(async () => {
        const imgs = [...document.images];
        await Promise.all(imgs.map((i) => (i.complete ? null : i.decode().catch(() => {}))));
        return imgs.filter((i) => !i.naturalWidth).map((i) => i.id || i.src);
      });
      /* eslint-enable no-undef */
      if (missing.length) {
        problems.push(`${lang}/${shot}: images never decoded — ${missing.join(", ")}`);
        continue;
      }
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(OUT, lang, `${shot}.png`) });
      console.log(`✅ ${lang}/${shot}.png${i === 0 ? "  (hero)" : ""}`);
    }
  }

  await browser.close();
  if (problems.length) {
    console.error("\n🔴 problems:");
    problems.forEach((p) => console.error("  " + p));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
