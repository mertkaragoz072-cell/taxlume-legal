// Renders scripts/ad/ad.html to a 15-second vertical ad.
//
// This is a trailer, not a capture: it is drawn in the game's colours, type
// and artwork rather than recorded off its screens, because a feed is not
// the place to explain an economy sim — it is the place to make someone stop
// scrolling. The store preview (capture-preview-video.js) is the one that
// has to show real play.
//
//   npm --prefix /tmp/video-tools install ffmpeg-static
//   NODE_PATH=/tmp/video-tools/node_modules:/opt/node22/lib/node_modules \
//     node scripts/render-ad-video.js [--lang tr] [--fps 30]
//
// Output: store-assets/video/ad-<lang>-1080x1920.mp4
//
// Frames are drawn one at a time through the page's own __setT(t) rather
// than recorded in real time. A realtime capture of a busy page drops frames
// under load and there is no way to tell from the file which ones; here
// frame 137 is frame 137 whatever the machine was doing.

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { CHROMIUM } = require("./lib/seed-town");

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "store-assets", "video");
const PAGE = path.join(__dirname, "ad", "ad.html");

const args = process.argv.slice(2);
const argValue = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i === -1 ? fallback : args[i + 1];
};
const LANG = argValue("--lang", "tr");
const FPS = Number(argValue("--fps", "30"));
const SIZE = { width: 1080, height: 1920 };

function ffmpeg() {
  try {
    return require("ffmpeg-static");
  } catch {
    throw new Error(
      "ffmpeg-static not on NODE_PATH. Install it out of tree:\n" +
        "  npm --prefix /tmp/video-tools install ffmpeg-static\n" +
        "  NODE_PATH=/tmp/video-tools/node_modules:/opt/node22/lib/node_modules node scripts/render-ad-video.js"
    );
  }
}

async function main() {
  const FF = ffmpeg();
  if (!fs.existsSync(CHROMIUM)) throw new Error(`Chromium not found at ${CHROMIUM}`);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const frameDir = fs.mkdtempSync(path.join(require("os").tmpdir(), "ad-frames-"));
  const browser = await chromium.launch({ executablePath: CHROMIUM, args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: SIZE, deviceScaleFactor: 1 });

  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  await page.goto(`file://${PAGE}?lang=${LANG}`, { waitUntil: "networkidle" });
  // The webfonts and the merchant PNG have to be decoded before the first
  // frame, or the opening second renders in a fallback face and nobody
  // notices until the clip is already cut.
  /* eslint-disable no-undef -- these callbacks are serialised and run in the page, not in Node */
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() =>
    Promise.all([...document.images].map((img) => (img.complete ? null : img.decode().catch(() => {}))))
  );
  await page.waitForTimeout(400);

  const duration = await page.evaluate(() => window.__duration);
  /* eslint-enable no-undef */
  const total = Math.round(duration * FPS);
  process.stdout.write(`rendering ${total} frames at ${FPS}fps `);

  for (let i = 0; i < total; i++) {
    // eslint-disable-next-line no-undef -- runs in the page
    await page.evaluate((t) => window.__setT(t), i / FPS);
    await page.screenshot({
      path: path.join(frameDir, `f${String(i).padStart(5, "0")}.jpg`),
      type: "jpeg",
      quality: 95,
    });
    if (i % 60 === 0) process.stdout.write(".");
  }
  process.stdout.write("\n");
  await browser.close();

  if (errors.length)
    throw new Error(`the ad page errored while rendering:\n  ${errors.slice(0, 5).join("\n  ")}`);

  const out = path.join(OUT_DIR, `ad-${LANG}-1080x1920.mp4`);
  execFileSync(
    FF,
    [
      "-y",
      "-framerate",
      String(FPS),
      "-i",
      path.join(frameDir, "f%05d.jpg"),
      "-c:v",
      "libx264",
      "-profile:v",
      "high",
      "-level",
      "4.0",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "19",
      "-movflags",
      "+faststart",
      out,
    ],
    { stdio: ["ignore", "ignore", "pipe"] }
  );
  fs.rmSync(frameDir, { recursive: true, force: true });

  const probe = probeFile(FF, out);
  console.log(`✅ ${path.relative(ROOT, out)}  ${probe}`);
}

function probeFile(FF, file) {
  let text;
  try {
    text = execFileSync(FF, ["-hide_banner", "-i", file], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (err) {
    text = `${err.stdout ?? ""}${err.stderr ?? ""}`; // ffmpeg -i with no output exits non-zero
  }
  const d = (/Duration: (\d+):(\d+):([\d.]+),/.exec(text) ?? []).slice(1);
  const seconds = d.length ? Number(d[0]) * 3600 + Number(d[1]) * 60 + Number(d[2]) : NaN;
  const stream = (text.split("\n").find((l) => l.includes("Stream #0:0")) ?? "").trim();
  return `${seconds.toFixed(1)}s  ${stream.slice(0, 110)}`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
