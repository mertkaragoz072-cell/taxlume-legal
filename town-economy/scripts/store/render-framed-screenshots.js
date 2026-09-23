// Turns the raw captures in store-assets/screenshots/ into the set that
// actually goes on a store listing: each screen under a headline, in a
// device frame, on the game's own background.
//
// The raw ones are the truth about what the app looks like. They are not
// what sells it — nobody browsing a store reads a screenshot, they read the
// line above it, and a bare app screen at listing size is a wall of small
// type. Both sets are kept: these are for uploading, the raw ones are the
// source and the thing to re-shoot when the UI changes.
//
//   NODE_PATH=/opt/node22/lib/node_modules node scripts/store/render-framed-screenshots.js
//
// Output: store-assets/screenshots-framed/<lang>/NN-name.png, 1290x2796.

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { CHROMIUM } = require("../lib/seed-town");

const ROOT = path.join(__dirname, "..", "..");
const SRC = path.join(ROOT, "store-assets", "screenshots");
const OUT = path.join(ROOT, "store-assets", "screenshots-framed");
const PAGE = path.join(__dirname, "frame.html");
const SIZE = { width: 1290, height: 2796 };

async function main() {
  if (!fs.existsSync(CHROMIUM)) throw new Error(`Chromium not found at ${CHROMIUM}`);
  const browser = await chromium.launch({ executablePath: CHROMIUM, args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: SIZE, deviceScaleFactor: 1 });

  const problems = [];
  page.on("pageerror", (e) => problems.push(e.message));

  for (const lang of ["tr", "en"]) {
    const dir = path.join(SRC, lang);
    const shots = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".png"))
      .map((f) => f.replace(/\.png$/, ""))
      .sort();
    fs.mkdirSync(path.join(OUT, lang), { recursive: true });

    for (const shot of shots) {
      await page.goto(`file://${PAGE}?lang=${lang}&shot=${shot}`, { waitUntil: "networkidle" });
      /* eslint-disable no-undef -- serialised into the page */
      await page.evaluate(() => document.fonts.ready);
      // The capture is 1.3MB of PNG; screenshotting before it decodes writes
      // a frame around an empty box, and nothing about the file says so.
      const decoded = await page.evaluate(async () => {
        const img = document.getElementById("shot");
        if (!img.complete) await img.decode().catch(() => {});
        return img.naturalWidth;
      });
      /* eslint-enable no-undef */
      if (!decoded) {
        problems.push(`${lang}/${shot}: the screenshot never decoded`);
        continue;
      }
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(OUT, lang, `${shot}.png`) });
      console.log(`✅ ${lang}/${shot}.png`);
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
