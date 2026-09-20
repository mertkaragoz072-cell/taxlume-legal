// Generates the Golden Town logo family into assets/logo/.
//
// The logo is built as code rather than drawn once and saved, because it has
// to exist in a dozen consistent forms — mark alone, two lockups, two
// languages, dark and gold plates, monochrome — and hand-editing twelve SVGs
// in step is how a logo family drifts out of alignment.
//
// The wordmark is converted to outlines with opentype.js rather than left as
// <text>. An SVG that names a font renders as a fallback face anywhere that
// font is not installed, which for a logo means it renders wrong almost
// everywhere it matters.
//
// Usage:  node scripts/build-logo.js
// Requires opentype.js, which is not a project dependency — install it into a
// scratch directory and point NODE_PATH at it:
//   npm --prefix /tmp/logo-tools install opentype.js
//   NODE_PATH=/tmp/logo-tools/node_modules node scripts/build-logo.js

const fs = require("fs");
const path = require("path");
const opentype = require("opentype.js");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "assets", "logo");
const CINZEL = path.join(ROOT, "node_modules/@expo-google-fonts/cinzel/700Bold/Cinzel_700Bold.ttf");

// Straight from src/theme.ts — the logo must not invent its own gold.
const GOLD_A = "#ffdf8e"; // GOLD_GRADIENT[0]
const GOLD_B = "#e0a637"; // GOLD_GRADIENT[1]
const CREAM = "#f4e4bd";
const DARK = "#1a1410"; // COLORS.onLight
const PLATE_A = "#2a2016";
const PLATE_B = "#140f0a";

// --- the mark -------------------------------------------------------------
// Three buildings of increasing height on a common base. Read as a town, or
// read as the columns of a rising chart — the pun is the idea, and it only
// works because the bodies are equal-width bars and the roofs are pitched.
// An earlier attempt used bare chevrons with no bodies and read, flatly, as
// a mountain range.
const BASE = 74; // ground line: where every building foot sits
const W = 18; // body width, equal for all three so they read as bar columns
const GAP = 4;
const X0 = 19;
const TOPS = [56, 47, 36]; // body top of each building, stepping upward
const EAVE = 3.2; // roof overhang past the body on each side
const PITCH = 11; // roof rise above the body top
// The drawing's true vertical extent is 25 (tallest ridge) to 80 (base
// underside), whose midpoint is 52.5 — so the whole mark is nudged up to sit
// optically centred in a 100-unit box.
const Y_NUDGE = -2.5;

// The drawing does not fill its 100-unit box — it leaves padding so the mark
// can be dropped into a square icon plate. Every lockup therefore aligns on
// this ink box rather than on the box itself; measuring off the box is what
// made the first draft's mark look like an undersized afterthought sitting
// low beside the wordmark.
const INK = {
  left: X0 - EAVE,
  right: X0 + 2 * (W + GAP) + W + EAVE,
  top: TOPS[2] - PITCH + Y_NUDGE,
  bottom: BASE + 1.4 + 4.6 + Y_NUDGE,
};
INK.width = INK.right - INK.left;
INK.height = INK.bottom - INK.top;

/** Places the mark so its ink — not its box — starts at (dx, dy) and stands
 *  `inkHeight` tall. */
function placeMark(inkHeight, dx, dy, bodyFill, roofFill) {
  const s = inkHeight / INK.height;
  const tx = dx - INK.left * s;
  const ty = dy - INK.top * s;
  return `  <g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s.toFixed(4)})">
${markBody(bodyFill, roofFill)}
  </g>`;
}

function markBody(bodyFill, roofFill) {
  let out = "";
  for (let i = 0; i < 3; i++) {
    const x = X0 + i * (W + GAP);
    const top = TOPS[i];
    const cx = x + W / 2;
    out += `    <rect x="${x}" y="${top}" width="${W}" height="${BASE - top}" rx="1.6" fill="${bodyFill}"/>\n`;
    out += `    <path d="M${x - EAVE} ${top} L${cx} ${top - PITCH} L${x + W + EAVE} ${top} Z" fill="${roofFill}"/>\n`;
  }
  out += `    <rect x="16.5" y="${BASE + 1.4}" width="67" height="4.6" rx="2.3" fill="${bodyFill}"/>\n`;
  return `  <g transform="translate(0 ${Y_NUDGE})">\n${out}  </g>`;
}

// userSpaceOnUse, not the default objectBoundingBox: the mark is seven
// separate shapes, and a per-shape bounding box would give each of them its
// own full light-to-dark ramp — the 4.6-unit base bar would run the whole
// gradient in its own height and stop matching the towers above it. In user
// space all seven share one ramp across the 100-unit box, so the mark lights
// as a single object.
const goldGradient = (
  id
) => `    <linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="35" y2="100">
      <stop offset="0" stop-color="${GOLD_A}"/>
      <stop offset="1" stop-color="${GOLD_B}"/>
    </linearGradient>`;
// The wordmark is a single path, so a bounding-box ramp is already continuous
// across it and adapts to each language's different width.
const goldTextGradient = (id) => `    <linearGradient id="${id}" x1="0" y1="0" x2="0.2" y2="1">
      <stop offset="0" stop-color="${GOLD_A}"/>
      <stop offset="1" stop-color="${GOLD_B}"/>
    </linearGradient>`;
const plateGradient = (id) => `    <linearGradient id="${id}" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="${PLATE_A}"/>
      <stop offset="1" stop-color="${PLATE_B}"/>
    </linearGradient>`;

function svg(w, h, inner, defs) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
${defs ? `  <defs>\n${defs}\n  </defs>\n` : ""}${inner}
</svg>\n`;
}

// --- the wordmark ---------------------------------------------------------
// Cinzel is the app's display face (FONT.display), so the logo speaks in the
// same voice as the town names and modal titles inside the game.
const font = opentype.parse(fs.readFileSync(CINZEL));
const TRACKING = 0.15; // em; Cinzel is a Roman capital face and wants air

function wordmarkPath(text, fontSize, fill) {
  const p = font.getPath(text, 0, 0, fontSize, { letterSpacing: TRACKING });
  const box = p.getBoundingBox();
  // Re-origin to the glyph ink, not the typographic box, so lockup spacing is
  // measured off what the eye actually sees.
  const d = p.toPathData(2);
  return {
    d,
    width: box.x2 - box.x1,
    height: box.y2 - box.y1,
    x1: box.x1,
    y1: box.y1,
    render: (dx, dy) =>
      `  <path transform="translate(${(dx - box.x1).toFixed(2)} ${(dy - box.y1).toFixed(2)})" d="${d}" fill="${fill}"/>`,
  };
}

// --- outputs --------------------------------------------------------------
const WORDS = { tr: "ALTIN KASABA", en: "GOLDEN TOWN" };

function write(name, content) {
  fs.writeFileSync(path.join(OUT, name), content);
  console.log(`✅ ${name}`);
}

fs.mkdirSync(OUT, { recursive: true });

// 1. The mark on its own, transparent — the primary asset everything else
//    is built from.
write("mark.svg", svg(100, 100, markBody("url(#gold)", "url(#gold)"), goldGradient("gold")));
write("mark-two-tone.svg", svg(100, 100, markBody("url(#gold)", CREAM), goldGradient("gold")));
// 2. One flat colour, for embossing, watermarks and anywhere a gradient is
//    not available. currentColor so a host can recolour it.
write("mark-mono.svg", svg(100, 100, markBody("currentColor", "currentColor"), null));

// 3. App icon plates. Square with no rounding: both stores apply their own
//    mask, and baking a radius in leaves a pale halo inside theirs.
write(
  "icon.svg",
  svg(
    100,
    100,
    `  <rect width="100" height="100" fill="url(#plate)"/>\n${markBody("url(#gold)", CREAM)}`,
    `${plateGradient("plate")}\n${goldGradient("gold")}`
  )
);
write(
  "icon-gold.svg",
  svg(
    100,
    100,
    `  <rect width="100" height="100" fill="url(#gold)"/>\n${markBody(DARK, DARK)}`,
    goldGradient("gold")
  )
);

// 4. Lockups. Sizes are expressed as multiples of the wordmark's cap height
//    so the two languages, whose words differ in length, still produce the
//    same relationship between mark and type.
const CAP = 34;

for (const [lang, text] of Object.entries(WORDS)) {
  const build = (inkFill, roofFill, wordFill, defs) => {
    const word = wordmarkPath(text, CAP * 1.39, wordFill); // Cinzel caps ≈ 0.72em

    // Horizontal: the mark stands a little taller than the capitals, which
    // keeps it from reading as a bullet point in front of the words.
    const hMarkInk = CAP * 1.26;
    const hGap = CAP * 0.5;
    const hMarkW = hMarkInk * (INK.width / INK.height);
    const hW = hMarkW + hGap + word.width;
    const hH = hMarkInk;
    const horizontal =
      placeMark(hMarkInk, 0, 0, inkFill, roofFill) +
      "\n" +
      word.render(hMarkW + hGap, (hH - word.height) / 2);

    // Stacked: for the title screen and anywhere square-ish.
    const sMarkInk = CAP * 1.85;
    const sGap = CAP * 0.62;
    const sMarkW = sMarkInk * (INK.width / INK.height);
    const sW = Math.max(sMarkW, word.width);
    const sH = sMarkInk + sGap + word.height;
    const stacked =
      placeMark(sMarkInk, (sW - sMarkW) / 2, 0, inkFill, roofFill) +
      "\n" +
      word.render((sW - word.width) / 2, sMarkInk + sGap);

    return {
      horizontal: svg(round(hW), round(hH), horizontal, defs),
      stacked: svg(round(sW), round(sH), stacked, defs),
    };
  };

  // On brand (dark) surfaces: gold mark, cream roofs, gold type.
  const onDark = build(
    "url(#gold)",
    CREAM,
    "url(#goldText)",
    `${goldGradient("gold")}\n${goldTextGradient("goldText")}`
  );
  write(`logo-horizontal-${lang}.svg`, onDark.horizontal);
  write(`logo-stacked-${lang}.svg`, onDark.stacked);

  // On light surfaces gold-on-cream loses almost all its contrast, so the
  // light-background lockup is solid dark rather than a tinted version of the
  // gold one. Needed for press shots, invoices, anything printed.
  const onLight = build(DARK, DARK, DARK, null);
  write(`logo-horizontal-${lang}-dark.svg`, onLight.horizontal);
  write(`logo-stacked-${lang}-dark.svg`, onLight.stacked);
}

function round(n) {
  return Math.round(n * 100) / 100;
}

// 5. Raster exports. SVG is the source of truth, but Expo's icon and splash
//    fields and both store consoles all want PNG, so the sizes that actually
//    get uploaded are rendered here rather than exported by hand.
//    Playwright is a global tool here rather than a project dependency, the
//    same as scripts/capture-store-screenshots.js uses it:
//      NODE_PATH=/opt/node22/lib/node_modules:... node scripts/build-logo.js
const RASTERS = [
  { src: "icon.svg", name: "icon-1024.png", width: 1024, height: 1024 },
  { src: "icon-gold.svg", name: "icon-gold-1024.png", width: 1024, height: 1024 },
  { src: "mark-two-tone.svg", name: "mark-1024.png", width: 1024, height: 1024 },
  ...Object.keys(WORDS).flatMap((lang) => [
    { src: `logo-horizontal-${lang}.svg`, name: `logo-horizontal-${lang}@3x.png`, height: 240 },
    { src: `logo-stacked-${lang}.svg`, name: `logo-stacked-${lang}@3x.png`, height: 480 },
  ]),
];

async function rasterize() {
  let chromium;
  try {
    ({ chromium } = require("playwright"));
  } catch {
    console.log("\nℹ  playwright not on NODE_PATH — skipped the PNG exports.");
    return;
  }
  const browser = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium",
    args: ["--no-sandbox"],
  });
  for (const r of RASTERS) {
    const source = fs.readFileSync(path.join(OUT, r.src), "utf8");
    // Read the intrinsic size off the SVG so height-only entries keep their
    // aspect ratio instead of being squashed to a guess.
    const [, vw, vh] = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(source);
    const height = r.height;
    const width = r.width ?? Math.round((Number(vw) / Number(vh)) * height);
    const page = await browser.newPage({ viewport: { width, height } });
    await page.setContent(
      `<body style="margin:0">${source.replace(/width="[\d.]+" height="[\d.]+"/, `width="${width}" height="${height}"`)}</body>`
    );
    await page.screenshot({ path: path.join(OUT, r.name), omitBackground: true });
    await page.close();
    console.log(`✅ ${r.name}  ${width}×${height}`);
  }
  await browser.close();
}

rasterize().then(() => {
  console.log(`\nWrote ${fs.readdirSync(OUT).length} files to assets/logo/`);
});
