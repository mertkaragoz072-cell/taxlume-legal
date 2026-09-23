// Generates the Golden Town logo family into assets/logo/.
//
// Built as code rather than drawn once, because the family is a dozen files
// that all have to agree — mark alone, two lockups, two languages, plates,
// monochrome — and hand-editing a dozen SVGs in step is how a logo family
// drifts out of alignment.
//
// Usage:
//   npm --prefix /tmp/logo-tools install opentype.js@1.3.4
//   NODE_PATH=/tmp/logo-tools/node_modules:/opt/node22/lib/node_modules \
//     node scripts/build-logo.js
//
// opentype.js outlines the type; Playwright renders the PNGs and is optional
// (the script says so and carries on without it). Neither is a project
// dependency: they build an asset that changes about once a year.
//
// The opentype.js version is pinned deliberately. 2.0.0 silently ignores the
// letterSpacing option — so the tracking below does nothing — and emits NaN
// into the coordinates of some glyph outlines in both of these fonts. An SVG
// path is invalid from its first NaN onward, so the browser draws part of a
// letter and abandons the rest: Ü came out as a bare diaeresis and Y as a
// single diagonal, in files that otherwise looked perfectly well-formed.

const fs = require("fs");
const path = require("path");
const opentype = require("opentype.js");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "assets", "logo");
const FONTS = path.join(ROOT, "node_modules/@expo-google-fonts");

// --- palette --------------------------------------------------------------
// Drawn from src/theme.ts so the logo cannot invent its own gold. The extra
// tones exist only to fake a lit metal surface: a face ramp, a cut-edge rim,
// and a keyline dark enough to hold the shape against any background.
const FACE_TOP = "#fff6d2";
const FACE_MID = "#f6c85a";
const FACE_LOW = "#e0a637"; // GOLD_GRADIENT[1]
const FACE_DEEP = "#b9781f";
const RIM = "#a9691b";
const KEYLINE = "#241505";
const DARK = "#1a1410"; // COLORS.onLight
const MUTED = "#c9a463";
const PLATE_A = "#2a2016";
const PLATE_B = "#140f0a";

// --- the mark -------------------------------------------------------------
// Three buildings of rising height on a common base: a town if you read the
// roofs, the columns of a rising chart if you read the bodies. Equal-width
// bodies carry the chart, pitched roofs carry the town. An early draft used
// bare chevrons with no bodies and read, to everyone who saw it, as a
// mountain range.
const BASE = 74;
const BODY_W = 18;
const BODY_GAP = 5.5; // wide enough that the relief keyline cannot close it up
const X0 = 19;
const TOPS = [56, 47, 36];
const EAVE = 3.2;
const PITCH = 11;
const PLINTH_Y = BASE + 1.4;
const PLINTH_H = 4.6;

const MARK_INK = { left: X0 - EAVE, right: X0 + 2 * (BODY_W + BODY_GAP) + BODY_W + EAVE };
MARK_INK.top = TOPS[2] - PITCH;
MARK_INK.bottom = PLINTH_Y + PLINTH_H;
MARK_INK.width = MARK_INK.right - MARK_INK.left;
MARK_INK.height = MARK_INK.bottom - MARK_INK.top;

/** The mark as bare <path> elements with no fill of their own, so the relief
 *  treatment below can stamp the same geometry once per layer. */
function markPaths() {
  let d = "";
  for (let i = 0; i < 3; i++) {
    const x = X0 + i * (BODY_W + BODY_GAP);
    const top = TOPS[i];
    const cx = x + BODY_W / 2;
    d += `<path d="M${x} ${top} h${BODY_W} v${BASE - top} h-${BODY_W} Z"/>`;
    d += `<path d="M${x - EAVE} ${top} L${cx} ${top - PITCH} L${x + BODY_W + EAVE} ${top} Z"/>`;
  }
  d += `<path d="M16.5 ${PLINTH_Y} h67 v${PLINTH_H} h-67 Z"/>`;
  return d;
}

// --- the relief -----------------------------------------------------------
// What makes a logo read as a game logo is not the shapes, it is the
// treatment: a heavy keyline so it survives any background, a rim that reads
// as the cut edge of struck metal, a lit face, and a sheen across the top.
// A flat mark with elegant capitals — the first attempt here — reads as a
// banking app.
//
// Each layer is the same geometry stamped again, largest stroke first. The
// keyline is proportional to the type size rather than fixed: at a fixed
// width a thick stroke closes up the counters of lighter faces, which is what
// turned an S into a blob in an early draft.
let uid = 0;
function relief(inner, y0, y1, keyline, rim) {
  const id = `r${uid++}`;
  const defs = `
    <linearGradient id="face${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${y0}" x2="0" y2="${y1}">
      <stop offset="0" stop-color="${FACE_TOP}"/>
      <stop offset="0.42" stop-color="${FACE_MID}"/>
      <stop offset="0.56" stop-color="${FACE_LOW}"/>
      <stop offset="1" stop-color="${FACE_DEEP}"/>
    </linearGradient>
    <linearGradient id="sheen${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${y0}" x2="0" y2="${y1}">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.5"/>
      <stop offset="0.38" stop-color="#ffffff" stop-opacity="0.05"/>
      <stop offset="0.4" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <filter id="drop${id}" x="-15%" y="-15%" width="130%" height="140%">
      <feDropShadow dx="0" dy="${(keyline * 0.42).toFixed(2)}" stdDeviation="${(keyline * 0.36).toFixed(2)}" flood-color="#000000" flood-opacity="0.5"/>
    </filter>`;
  const markup = `  <g filter="url(#drop${id})">
    <g fill="${KEYLINE}" stroke="${KEYLINE}" stroke-width="${keyline}" stroke-linejoin="round">${inner}</g>
    <g fill="${RIM}" stroke="${RIM}" stroke-width="${rim}" stroke-linejoin="round">${inner}</g>
    <g fill="url(#face${id})">${inner}</g>
    <g fill="url(#sheen${id})">${inner}</g>
  </g>`;
  return { defs, markup };
}

// --- type -----------------------------------------------------------------
const cinzelBlack = opentype.loadSync(`${FONTS}/cinzel/900Black/Cinzel_900Black.ttf`);
const manrope = opentype.loadSync(`${FONTS}/manrope/800ExtraBold/Manrope_800ExtraBold.ttf`);
const CAP_RATIO = 0.7; // Cinzel cap height as a fraction of em

/** Lays glyphs along a gentle arch. A dead-flat baseline is most of why the
 *  first attempt read as an app header rather than a title: game titles sit
 *  on a curve, which makes the words an object instead of a label.
 *  `rise` is how far the centre lifts above the ends, in user units. */
function setType(font, text, size, tracking, rise) {
  const opts = { letterSpacing: tracking };
  const paths = font.getPaths(text, 0, 0, size, opts);
  const centres = [];
  let total = 0;
  font.forEachGlyph(text, 0, 0, size, opts, (glyph, gx) => {
    const w = (glyph.advanceWidth / font.unitsPerEm) * size;
    centres.push(gx + w / 2);
    total = gx + w;
  });
  // Radius of the circle whose chord is the text and whose sagitta is `rise`.
  const R = rise > 0 ? (total * total) / (8 * rise) + rise / 2 : 0;

  let markup = "";
  paths.forEach((p, i) => {
    const cx = centres[i];
    const d = p.toPathData(2);
    if (!d) return; // spaces carry no outline
    if (R === 0) {
      markup += `<path d="${d}"/>`;
      return;
    }
    const theta = (cx - total / 2) / R;
    const tx = total / 2 + R * Math.sin(theta);
    const ty = R * (1 - Math.cos(theta));
    const rot = (theta * 180) / Math.PI;
    // The glyph is already at its absolute x, so it is rotated about its own
    // centre and then nudged onto the arc.
    markup += `<g transform="translate(${(tx - cx).toFixed(2)} ${ty.toFixed(2)}) rotate(${rot.toFixed(2)} ${cx.toFixed(2)} 0)"><path d="${d}"/></g>`;
  });
  return { markup, width: total, capTop: -size * CAP_RATIO, bottom: rise };
}

// --- assembly -------------------------------------------------------------
function svg(x, y, w, h, defs, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r(x)} ${r(y)} ${r(w)} ${r(h)}" width="${Math.round(w)}" height="${Math.round(h)}">
  <defs>${defs}
  </defs>
${body}
</svg>\n`;
}
const r = (n) => Math.round(n * 100) / 100;

// The face ramp runs light at its top to deep at its bottom. The mark's mass
// sits low — three solid bodies under thin roofs — so fitting the ramp to the
// mark's own height drops most of that mass into the deep end, and the mark
// goes brown beside gold lettering. Running the ramp well past the bottom
// keeps the mark in the same register as the type next to it.
const markRamp = (top, height) => [top - height * 0.1, top + height * 1.55];

function placedMark(inkHeight, dx, dy) {
  const s = inkHeight / MARK_INK.height;
  return {
    scale: s,
    width: MARK_INK.width * s,
    markup: `<g transform="translate(${r(dx - MARK_INK.left * s)} ${r(dy - MARK_INK.top * s)}) scale(${s.toFixed(4)})">${markPaths()}</g>`,
  };
}

/** The hero lockup: mark above an arched title, with a subtitle on a rule. */
function stacked(text, sub) {
  uid = 0;
  const SIZE = 150;
  const RISE = SIZE * 0.17;
  const PAD = SIZE * 0.3;

  const word = setType(cinzelBlack, text, SIZE, 0.05, RISE);
  const markInk = SIZE * 1.2;
  const markBottom = word.capTop - SIZE * 0.3;
  const mark = placedMark(
    markInk,
    (word.width - MARK_INK.width * (markInk / MARK_INK.height)) / 2,
    markBottom - markInk
  );

  const subSize = SIZE * 0.17;
  const subType = setType(manrope, sub, subSize, 0.34, 0);
  const subBaseline = word.bottom + SIZE * 0.46;

  // The mark's own details — the gaps between buildings, the eaves — are far
  // finer than a letterform's, so it takes a lighter keyline than the type
  // beside it. At the type's weight they filled in and the mark went muddy.
  const markRelief = relief(
    mark.markup,
    ...markRamp(markBottom - markInk, markInk),
    SIZE * 0.055,
    SIZE * 0.03
  );
  const wordRelief = relief(word.markup, word.capTop, word.bottom, SIZE * 0.11, SIZE * 0.06);

  // A rule either side of the subtitle, with a small diamond at each end —
  // the ornament that stops a lone line of small caps reading as a caption.
  const ruleY = subBaseline - subSize * CAP_RATIO * 0.5;
  const ruleGap = subSize * 0.9;
  const ruleLen = SIZE * 0.42;
  const rules = [-1, 1]
    .map((dir) => {
      const inner = word.width / 2 + dir * (subType.width / 2 + ruleGap);
      const outer = inner + dir * ruleLen;
      const tip = outer + dir * subSize * 0.34;
      return `    <path d="M${r(inner)} ${r(ruleY)} H${r(outer)}" stroke="${MUTED}" stroke-width="${r(subSize * 0.09)}" stroke-linecap="round" opacity="0.85"/>
    <path d="M${r(outer + (dir * subSize) / 6)} ${r(ruleY - subSize / 6)} L${r(tip)} ${r(ruleY)} L${r(outer + (dir * subSize) / 6)} ${r(ruleY + subSize / 6)} Z" fill="${MUTED}" opacity="0.85"/>`;
    })
    .join("\n");

  const top = markBottom - markInk - PAD;
  const bottom = subBaseline + PAD;
  const left = -PAD;
  const width = word.width + PAD * 2;

  const body = `${markRelief.markup}
${wordRelief.markup}
  <g fill="${MUTED}" transform="translate(${r((word.width - subType.width) / 2)} ${r(subBaseline)})">${subType.markup}</g>
${rules}`;
  return svg(left, top, width, bottom - top, markRelief.defs + wordRelief.defs, body);
}

/** The wide lockup: mark left of a flat-baseline title. An arch fights a
 *  mark sitting beside it, so this one stays level. */
function horizontal(text) {
  uid = 0;
  const SIZE = 150;
  const PAD = SIZE * 0.22;
  const word = setType(cinzelBlack, text, SIZE, 0.05, 0);
  const markInk = SIZE * 1.15;
  const gap = SIZE * 0.34;
  const markTop = word.capTop - (markInk - SIZE * CAP_RATIO) / 2;
  const mark = placedMark(markInk, 0, markTop);
  const wordShift = mark.width + gap;

  const markRelief = relief(mark.markup, ...markRamp(markTop, markInk), SIZE * 0.055, SIZE * 0.03);
  const wordRelief = relief(
    `<g transform="translate(${r(wordShift)} 0)">${word.markup}</g>`,
    word.capTop,
    0,
    SIZE * 0.11,
    SIZE * 0.06
  );

  const top = markTop - PAD;
  const bottom = markTop + markInk + PAD;
  return svg(
    -PAD,
    top,
    wordShift + word.width + PAD * 2,
    bottom - top,
    markRelief.defs + wordRelief.defs,
    `${markRelief.markup}\n${wordRelief.markup}`
  );
}

/** Mark on its own, in relief, on a transparent ground. */
function markOnly() {
  uid = 0;
  const PAD = 8;
  const m = placedMark(MARK_INK.height, MARK_INK.left, MARK_INK.top);
  const rel = relief(m.markup, ...markRamp(MARK_INK.top, MARK_INK.height), 7, 3.8);
  return svg(
    MARK_INK.left - PAD,
    MARK_INK.top - PAD,
    MARK_INK.width + PAD * 2,
    MARK_INK.height + PAD * 2,
    rel.defs,
    rel.markup
  );
}

/** App icon: the mark in relief on the app's own dark plate. Square with no
 *  corner radius — both stores apply their own mask, and a baked-in radius
 *  leaves a pale halo inside theirs. */
function icon() {
  uid = 0;
  const inkH = 52;
  const m = placedMark(inkH, (100 - MARK_INK.width * (inkH / MARK_INK.height)) / 2, 26);
  const rel = relief(m.markup, ...markRamp(26, inkH), 6.5, 3.6);
  const plate = `
    <linearGradient id="plate" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="${PLATE_A}"/>
      <stop offset="1" stop-color="${PLATE_B}"/>
    </linearGradient>`;
  return svg(
    0,
    0,
    100,
    100,
    plate + rel.defs,
    `  <rect width="100" height="100" fill="url(#plate)"/>\n${rel.markup}`
  );
}

/** One flat colour, no relief: favicons, embossing, print, anywhere the
 *  gradient stack would turn to mud. */
function markMono(fill) {
  const PAD = 8;
  return svg(
    MARK_INK.left - PAD,
    MARK_INK.top - PAD,
    MARK_INK.width + PAD * 2,
    MARK_INK.height + PAD * 2,
    "",
    `  <g fill="${fill}">${markPaths()}</g>`
  );
}

// --- outputs --------------------------------------------------------------
const WORDS = {
  tr: { title: "ALTIN KASABA", sub: "EKONOMİ SİMÜLASYONU" },
  en: { title: "GOLDEN TOWN", sub: "TOWN ECONOMY SIM" },
};

fs.mkdirSync(OUT, { recursive: true });
const write = (name, content) => {
  // A single NaN silently truncates an SVG path at the browser, which is how
  // a broken subtitle nearly shipped: the file looked fine, every glyph was
  // present in the markup, and the letters simply stopped being drawn part
  // way. Cheap insurance against the toolchain regressing again.
  if (content.includes("NaN")) {
    throw new Error(`${name} contains NaN in its path data — refusing to write a corrupt logo`);
  }
  fs.writeFileSync(path.join(OUT, name), content);
  console.log(`✅ ${name}`);
};

write("mark.svg", markOnly());
write("mark-mono.svg", markMono("currentColor"));
write("mark-dark.svg", markMono(DARK));
write("icon.svg", icon());
for (const [lang, w] of Object.entries(WORDS)) {
  write(`logo-stacked-${lang}.svg`, stacked(w.title, w.sub));
  write(`logo-horizontal-${lang}.svg`, horizontal(w.title));
}

// --- raster ---------------------------------------------------------------
// SVG is the source of truth, but Expo's icon/splash fields and both store
// consoles want PNG, so the sizes that actually get uploaded are rendered
// here rather than exported by hand.
//
// The size goes in the name as a plain suffix (`-900`), never as `@3x`:
// Metro reads `@3x` as a density variant of a base file, so a title screen
// that requires `logo-stacked-tr@3x.png` asks for a 1x `logo-stacked-tr.png`
// that does not exist.
const RASTERS = [
  { src: "icon.svg", name: "icon-1024.png", width: 1024, height: 1024 },
  { src: "mark.svg", name: "mark-1024.png", height: 1024 },
  ...Object.keys(WORDS).flatMap((lang) => [
    { src: `logo-stacked-${lang}.svg`, name: `logo-stacked-${lang}-900.png`, height: 900 },
    { src: `logo-horizontal-${lang}.svg`, name: `logo-horizontal-${lang}-300.png`, height: 300 },
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
  for (const spec of RASTERS) {
    const source = fs.readFileSync(path.join(OUT, spec.src), "utf8");
    // Read the intrinsic ratio off the viewBox so height-only entries keep
    // their proportions instead of being squashed to a guess.
    const [, , , vw, vh] = /viewBox="(\S+) (\S+) (\S+) (\S+)"/.exec(source);
    const height = spec.height;
    const width = spec.width ?? Math.round((Number(vw) / Number(vh)) * height);
    const page = await browser.newPage({ viewport: { width, height } });
    await page.setContent(
      `<body style="margin:0">${source.replace(/width="\d+" height="\d+"/, `width="${width}" height="${height}"`)}</body>`
    );
    await page.screenshot({ path: path.join(OUT, spec.name), omitBackground: true });
    await page.close();
    console.log(`✅ ${spec.name}  ${width}×${height}`);
  }
  await browser.close();
}

rasterize().then(() => console.log(`\nWrote ${fs.readdirSync(OUT).length} files to assets/logo/`));
