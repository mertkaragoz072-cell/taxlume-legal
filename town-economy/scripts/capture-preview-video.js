// Records a scripted playthrough of the real running app and encodes it as a
// store preview / social ad clip.
//
// The footage is a genuine capture, not a mock-up — Apple requires an app
// preview to be the app itself, and an ad that shows something the player
// will not find when they install is worse than no ad. What is staged is the
// save: it seeds the same late-game town the store screenshots use (see
// lib/seed-town.js) so the clip opens on a capital rather than a day-1
// village.
//
//   npx expo start --web --port 8251
//   npm --prefix /tmp/video-tools install ffmpeg-static
//   NODE_PATH=/tmp/video-tools/node_modules:/opt/node22/lib/node_modules \
//     node scripts/capture-preview-video.js [--port 8251] [--lang tr]
//
// Output, in store-assets/video/:
//   preview-<lang>-886x1920.mp4  the app's own frame, nothing added — the
//                                one to upload as an App Store preview
//   preview-<lang>-1080x1920.mp4 the same cut composed onto a 9:16 canvas,
//                                for TikTok / Reels / Meta, where anything
//                                narrower than 9:16 gets letterboxed by the
//                                platform into something worse

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const {
  CHROMIUM,
  SAVE_KEY,
  SAVE_VERSION,
  TUTORIAL_KEY,
  assertAchievementsInSync,
  seed,
} = require("./lib/seed-town");

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "store-assets", "video");

const args = process.argv.slice(2);
const argValue = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i === -1 ? fallback : args[i + 1];
};
const PORT = argValue("--port", "8251");
const LANG = argValue("--lang", "tr");
const APP_URL = `http://localhost:${PORT}`;

// 443x960 at 2x is 886x1920 — a real phone's proportions, and one of the
// sizes App Store Connect accepts, so the app's own frame needs no
// resampling. The 9:16 social cut is composed from it afterwards.
const VIEWPORT = { width: 443, height: 960 };
const VIDEO = { width: 886, height: 1920 };

const TABS = {
  tr: { market: "Piyasa", trade: "Ticaret", town: "Kasaba", invest: "Yatırım", goals: "Hedefler" },
  en: { market: "Market", trade: "Trade", town: "Town", invest: "Invest", goals: "Goals" },
};
const START = { tr: /^(BAŞLA|DEVAM ET)$/, en: /^(START|CONTINUE)$/ };

function ffmpeg() {
  try {
    return require("ffmpeg-static");
  } catch {
    throw new Error(
      "ffmpeg-static not on NODE_PATH. Install it out of tree:\n" +
        "  npm --prefix /tmp/video-tools install ffmpeg-static\n" +
        "  NODE_PATH=/tmp/video-tools/node_modules:/opt/node22/lib/node_modules node scripts/capture-preview-video.js"
    );
  }
}

/** A beat of the clip. `hold` is how long the frame sits still afterwards —
 * the whole difference between a clip that reads and one that flickers. An
 * ad is watched once, at a glance, so every screen needs long enough for the
 * eye to land on it and find the one thing it is there to show. */
const BUY_CONFIRM = { tr: "SATIN AL", en: "BUY" };

/** A beat of the clip. `hold` is how long the frame sits still afterwards —
 * the whole difference between a clip that reads and one that flickers. An
 * ad is watched once, at a glance, so every screen needs long enough for the
 * eye to land on it and find the one thing it is there to show, and no
 * longer: App Store previews cap at 30 seconds and a feed scrolls past well
 * before that. The holds below come out around 24s end to end.
 */
const BEATS = [
  { name: "title", hold: 1100, async run() {} }, // the opening frame is the title screen
  {
    name: "enter the town",
    hold: 2300,
    async run(page) {
      await page.getByText(START[LANG], { exact: true }).click();
    },
  },
  {
    name: "market prices",
    hold: 2100,
    async run(page) {
      await page.mouse.wheel(0, 260);
    },
  },
  {
    name: "buy something",
    hold: 2300,
    async run(page) {
      // The confirm button reads "<label> <good icon>", while the buy/sell
      // toggle above it reads the label alone — and in English both labels
      // are the word "BUY", so a substring match lands on the toggle and
      // silently trades nothing. Requiring a second token after the label is
      // what tells the two apart.
      const cashBefore = await readCash(page);
      const confirm = new RegExp(`^${BUY_CONFIRM[LANG]}\\s+\\S`);
      await page.getByText(confirm).first().click({ timeout: 8_000 });
      await page.waitForTimeout(900);
      const cashAfter = await readCash(page);
      if (cashBefore !== null && cashAfter !== null && cashBefore === cashAfter) {
        throw new Error(`the buy did not register — cash stayed at ${cashAfter}`);
      }
    },
  },
  {
    name: "trade map",
    hold: 2500,
    async run(page) {
      await clickTab(page, "trade");
    },
  },
  {
    name: "the town itself",
    hold: 2500,
    async run(page) {
      await clickTab(page, "town");
    },
  },
  {
    name: "investments",
    hold: 2100,
    async run(page) {
      await clickTab(page, "invest");
    },
  },
  {
    name: "goals",
    hold: 2100,
    async run(page) {
      await clickTab(page, "goals");
    },
  },
];

/** The header's cash figure, as a number, or null if it cannot be read — used
 * only to check that a trade actually happened. */
async function readCash(page) {
  const raw = await page.evaluate((key) => {
    try {
      return JSON.parse(localStorage.getItem(key)).state.cash;
    } catch {
      return null;
    }
  }, SAVE_KEY);
  return typeof raw === "number" ? raw : null;
}

async function clickTab(page, key) {
  await page.locator(`[aria-label="${TABS[LANG][key]}"]`).first().click({ timeout: 10_000 });
}

async function main() {
  assertAchievementsInSync();
  if (!fs.existsSync(CHROMIUM)) throw new Error(`Chromium not found at ${CHROMIUM}`);
  const FF = ffmpeg();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const rawDir = path.join(OUT_DIR, ".raw");
  fs.rmSync(rawDir, { recursive: true, force: true });
  fs.mkdirSync(rawDir, { recursive: true });

  const browser = await chromium.launch({ executablePath: CHROMIUM, args: ["--no-sandbox"] });

  // Boot once with empty storage to get a real initialState to patch.
  const probe = await browser.newPage({ viewport: VIEWPORT });
  await probe.goto(APP_URL, { waitUntil: "networkidle" });
  await probe.waitForFunction((k) => localStorage.getItem(k) !== null, SAVE_KEY, { timeout: 90_000 });
  const raw = await probe.evaluate((k) => localStorage.getItem(k), SAVE_KEY);
  await probe.close();

  const parsed = JSON.parse(raw);
  if (parsed.version !== SAVE_VERSION) {
    throw new Error(`the app wrote save version ${parsed.version}, but persist.ts says ${SAVE_VERSION}`);
  }

  const state = seed(parsed.state);
  state.language = LANG;
  // The screenshots freeze the town so nothing drifts mid-shot. A video wants
  // the opposite: the clock running is the product.
  state.paused = false;
  state.lastSavedAt = Date.now();

  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    recordVideo: { dir: rawDir, size: VIDEO },
  });
  await ctx.addInitScript(
    ([saveKey, tutorialKey, version, next]) => {
      localStorage.setItem(saveKey, JSON.stringify({ version, state: next }));
      localStorage.setItem(tutorialKey, "1");
    },
    [SAVE_KEY, TUTORIAL_KEY, SAVE_VERSION, state]
  );

  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(APP_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(2_000); // fonts, entry animations, the blurred backdrop

  for (const beat of BEATS) {
    try {
      await beat.run(page);
    } catch (err) {
      throw new Error(`beat "${beat.name}" failed: ${err.message}`, { cause: err });
    }
    await page.waitForTimeout(beat.hold);
    console.log(`  · ${beat.name}`);
  }

  await ctx.close(); // flushes the webm
  await browser.close();
  if (errors.length) console.warn("⚠  page errors during capture:", errors.slice(0, 5));

  const webm = path.join(
    rawDir,
    fs.readdirSync(rawDir).find((f) => f.endsWith(".webm"))
  );

  // 1. The app's own frame. Nothing added, nothing cropped.
  const appCut = path.join(OUT_DIR, `preview-${LANG}-886x1920.mp4`);
  run(FF, ["-y", "-i", webm, "-vf", `scale=${VIDEO.width}:${VIDEO.height},fps=30`, ...H264, "-an", appCut]);

  // 2. The 9:16 social cut. The app is taller and narrower than 9:16, so the
  //    gap at the sides is filled with a blurred blow-up of the footage
  //    itself — every platform pads a narrow video anyway, and it pads it
  //    with black.
  const socialCut = path.join(OUT_DIR, `preview-${LANG}-1080x1920.mp4`);
  run(FF, [
    "-y",
    "-i",
    webm,
    "-filter_complex",
    "[0:v]split=2[bg][fg];" +
      "[bg]scale=1080:-1,crop=1080:1920,boxblur=28:2,eq=brightness=-0.09[blurred];" +
      `[fg]scale=${VIDEO.width}:${VIDEO.height}[sharp];` +
      "[blurred][sharp]overlay=(W-w)/2:(H-h)/2,fps=30[v]",
    "-map",
    "[v]",
    ...H264,
    "-an",
    socialCut,
  ]);

  for (const f of [appCut, socialCut]) {
    const probeOut = runCapture(FF, ["-hide_banner", "-i", f]);
    const line = probeOut.split("\n").find((l) => l.includes("Stream #0:0")) ?? "";
    const dur = (/Duration: (\d+):(\d+):([\d.]+),/.exec(probeOut) ?? []).slice(1);
    const seconds = dur.length ? Number(dur[0]) * 3600 + Number(dur[1]) * 60 + Number(dur[2]) : NaN;
    console.log(`✅ ${path.relative(ROOT, f)}  ${seconds.toFixed(1)}s  ${line.trim().slice(0, 110)}`);
    // App Store previews must land between 15 and 30 seconds. The clip's
    // length is the sum of the holds plus however long the app took to
    // respond to each tap, so it drifts whenever a screen gets slower —
    // better to fail here than in App Store Connect.
    if (seconds > 30 || seconds < 15) {
      throw new Error(
        `${path.basename(f)} is ${seconds.toFixed(1)}s; App Store previews must be 15-30s. ` +
          "Adjust the holds in BEATS."
      );
    }
  }

  fs.rmSync(rawDir, { recursive: true, force: true });
}

const H264 = [
  "-c:v",
  "libx264",
  "-profile:v",
  "high",
  "-level",
  "4.0",
  "-pix_fmt",
  "yuv420p",
  "-crf",
  "20",
  "-movflags",
  "+faststart",
];

function run(bin, argv) {
  execFileSync(bin, argv, { stdio: ["ignore", "ignore", "pipe"] });
}

function runCapture(bin, argv) {
  try {
    return execFileSync(bin, argv, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (err) {
    return `${err.stdout ?? ""}${err.stderr ?? ""}`; // ffmpeg -i with no output exits non-zero
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
