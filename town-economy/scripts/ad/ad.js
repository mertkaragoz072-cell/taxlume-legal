/* A 15-second ad for Altın Kasaba, drawn in the game's own colours, type and
 * artwork rather than out of its screens — it is a trailer, not a capture.
 *
 * Every visible property is a pure function of one number, the timeline
 * position in seconds, and `window.__setT(t)` moves the whole scene there.
 * Nothing animates on a wall clock. That is what lets the renderer draw
 * frame 137 of 450 exactly, however long the machine took to get there, and
 * it means a dropped frame is impossible rather than merely unlikely.
 */

const DURATION = 15;
const W = 1080;

// ---------------------------------------------------------------- copy ----
const LANG = new URLSearchParams(location.search).get("lang") === "en" ? "en" : "tr";
const COPY = {
  tr: {
    goods: ["Ekmek", "Odun", "Baharat"],
    hook: "FİYATLAR\nDURMUYOR",
    town: "KASABAN\nSANA BAKIYOR",
    trade: "SEN\nTÜCCARSIN",
    empire: "SERVETİNİ\nBÜYÜT",
    sub1: "Her gün her şey biraz daha pahalı",
    sub2: "Ucuza al, pahalıya sat, kasabayı ayakta tut",
    buy: "UCUZA AL",
    sell: "PAHALIYA SAT",
    cta: "ŞİMDİ OYNA",
    logo: "../../assets/logo/logo-stacked-tr-900.png",
  },
  en: {
    goods: ["Bread", "Wood", "Spice"],
    hook: "PRICES\nNEVER STOP",
    town: "YOUR TOWN\nIS WATCHING",
    trade: "YOU ARE\nTHE TRADER",
    empire: "BUILD\nYOUR FORTUNE",
    sub1: "Everything costs a little more every day",
    sub2: "Buy low, sell high, keep the town standing",
    buy: "BUY LOW",
    sell: "SELL HIGH",
    cta: "PLAY NOW",
    logo: "../../assets/logo/logo-stacked-en-900.png",
  },
}[LANG];

// ------------------------------------------------------------- helpers ----
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
/** Progress through [t0, t1], clamped. The unit every beat is written in. */
const seg = (t, t0, t1) => clamp01((t - t0) / (t1 - t0));
const lerp = (a, b, p) => a + (b - a) * p;
const easeOut = (p) => 1 - Math.pow(1 - p, 3);
const easeIn = (p) => p * p * p;
const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
/** Overshoots past 1 and settles — what makes a card land rather than arrive. */
const backOut = (p) => {
  const c = 1.7;
  const q = p - 1;
  return 1 + (c + 1) * q * q * q + c * q * q;
};
/** Fades in over `up`, holds, fades out over `down`. */
const window_ = (t, t0, t1, up = 0.25, down = 0.3) =>
  Math.min(easeOut(seg(t, t0, t0 + up)), 1 - easeIn(seg(t, t1 - down, t1)));

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const nf = new Intl.NumberFormat(LANG === "tr" ? "tr-TR" : "en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const nf0 = new Intl.NumberFormat(LANG === "tr" ? "tr-TR" : "en-US", { maximumFractionDigits: 0 });

const $ = (id) => document.getElementById(id);
const px = (n) => `${n}px`;
function set(el, { x = 0, y = 0, s = 1, r = 0, o = 1 }) {
  el.style.transform = `translate(${x}px, ${y}px) scale(${s}) rotate(${r}deg)`;
  el.style.opacity = String(o);
}

// ----------------------------------------------------------- the scene ----
// Four beats, not five. An earlier cut gave the town its own three seconds
// and they played as three seconds of almost nothing: a small skyline at the
// bottom of an otherwise empty frame. The town works better as the thing the
// prices are happening *to*, so it rises underneath them while they are still
// climbing and then stays lit for the rest of the ad — the lower third is
// never empty again.
const SCENES = {
  hook: [0.0, 4.0],
  trade: [4.0, 8.5],
  empire: [8.5, 12.0],
  logo: [12.0, 15.0],
};
const TOWN_RISE = 2.3;

const ROWS = [$("row0"), $("row1"), $("row2")];
const BASE = [6.4, 9.1, 12.8];
ROWS.forEach((row, i) => {
  row.querySelector(".name").textContent = COPY.goods[i];
});
$("chipBuy").textContent = COPY.buy;
$("chipSell").textContent = COPY.sell;
$("ctaPill").textContent = COPY.cta;
$("logo").src = COPY.logo;

// The town mark's own geometry, stretched into a skyline — the decoration is
// the brand rather than a stock silhouette. Built once; only its transform
// and the roof-light opacity move per frame.
(function buildSkyline() {
  const svg = $("skyline");
  // Varied widths and heights, with roofs and lit windows. An earlier pass
  // used twelve identical thin bodies and read as a picket fence: a town is
  // recognisable by its irregularity, not by its roofline alone.
  const houses = [
    { w: 132, h: 210 },
    { w: 96, h: 300 },
    { w: 168, h: 175 },
    { w: 118, h: 355 },
    { w: 150, h: 235 },
    { w: 104, h: 290 },
    { w: 176, h: 195 },
    { w: 126, h: 265 },
  ];
  const gap = 8;
  const floor = 620;
  const total = houses.reduce((n, h) => n + h.w + gap, -gap);
  let x = (1080 - total) / 2;
  let d = "";
  for (const { w, h } of houses) {
    const top = floor - h;
    const pitch = Math.round(w * 0.42);
    const eave = 16;
    d += `<path d="M${x} ${top} h${w} v${h} h-${w} Z" fill="url(#g)"/>`;
    d += `<path d="M${x - eave} ${top} L${x + w / 2} ${top - pitch} L${x + w + eave} ${top} Z" fill="url(#roof)"/>`;
    // two rows of windows, so scale reads: these are buildings, not posts
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        const ww = 26;
        const wx = x + w / 2 + (col === 0 ? -ww - 14 : 14);
        const wy = top + 46 + row * 74;
        if (wy + 40 < floor) {
          d += `<rect class="win" x="${wx}" y="${wy}" width="${ww}" height="38" rx="6" fill="#ffe9a8"/>`;
        }
      }
    }
    x += w + gap;
  }
  svg.innerHTML =
    `<defs>` +
    `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#d9b96b"/><stop offset="1" stop-color="#6b4d16"/></linearGradient>` +
    `<linearGradient id="roof" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#f0d68c"/><stop offset="1" stop-color="#a87c24"/></linearGradient>` +
    `</defs>${d}`;
})();

// Coin stacks for the fortune beat: five columns that grow as the counter
// climbs. The counter alone is a number on a dark field; the stacks are what
// makes the number feel like money.
const STACKS = (() => {
  const host = $("stacks");
  const cols = [];
  const xs = [150, 340, 530, 720, 910];
  for (let i = 0; i < xs.length; i++) {
    const coins = [];
    for (let j = 0; j < 14; j++) {
      const el = document.createElement("div");
      el.className = "stackCoin";
      el.style.left = px(xs[i] - 66);
      el.style.top = px(1560 - j * 26);
      el.style.opacity = "0";
      host.appendChild(el);
      coins.push(el);
    }
    cols.push({ coins, height: 6 + ((i * 3) % 9) });
  }
  return cols;
})();

// Coin particles. Deterministic, and each one is only ever read back as a
// function of t, so scrubbing the timeline backwards looks identical.
const COINS = (() => {
  const r = rng(0x9e3779b9);
  const host = $("coins");
  const list = [];
  for (let i = 0; i < 46; i++) {
    const el = document.createElement("div");
    el.className = "coin";
    const size = 26 + r() * 58;
    el.style.width = px(size);
    el.style.height = px(size);
    host.appendChild(el);
    list.push({
      el,
      x: r() * W,
      delay: r() * 2.4,
      speed: 260 + r() * 420,
      spin: (r() - 0.5) * 900,
      burstAngle: r() * Math.PI * 2,
      burstDist: 260 + r() * 620,
      size,
    });
  }
  return list;
})();

function frame(t) {
  // ---- headline + subhead: one element, re-used per scene ----------------
  const heads = [
    [COPY.hook, 0.5, 3.9],
    [COPY.trade, 4.35, 8.35],
    [COPY.empire, 8.75, 11.9],
  ];
  const head = $("head");
  let shown = null;
  for (const [text, a, b] of heads) if (t >= a && t < b) shown = [text, a, b];
  if (shown) {
    const [text, a, b] = shown;
    head.innerHTML = text.replace("\n", "<br/>");
    const p = seg(t, a, a + 0.45);
    head.style.fontSize = px(104);
    head.style.top = px(170);
    set(head, {
      y: lerp(-70, 0, backOut(p)),
      s: lerp(0.86, 1, easeOut(p)),
      o: window_(t, a, b, 0.3, 0.25),
    });
  } else {
    head.style.opacity = "0";
  }

  const sub = $("sub");
  const subShown =
    t >= 1.7 && t < 3.9 ? [COPY.sub1, 1.7, 3.9] : t >= 5.4 && t < 8.35 ? [COPY.sub2, 5.4, 8.35] : null;
  if (subShown) {
    const [text, a, b] = subShown;
    sub.textContent = text;
    sub.style.fontSize = px(40);
    sub.style.top = px(420);
    set(sub, { y: lerp(26, 0, easeOut(seg(t, a, a + 0.4))), o: window_(t, a, b, 0.35, 0.3) });
  } else {
    sub.style.opacity = "0";
  }

  // ---- scene 1: the prices running away ---------------------------------
  // The hook is the whole reason someone stops scrolling, so it is the one
  // thing on screen for the first second and a half: three numbers going up.
  const runaway = easeInOut(seg(t, 0.55, 3.5));
  ROWS.forEach((row, i) => {
    // Popped in place rather than flown in from off-screen: frame zero is the
    // thumbnail a feed shows before anyone taps, and it should already say
    // what the ad is about.
    const a = i * 0.11;
    const inP = backOut(seg(t, a, a + 0.42));
    const out = 1 - easeIn(seg(t, 3.55, 4.0));
    const shake = t > 2.6 && t < 3.7 ? Math.sin(t * 58 + i) * 8 * seg(t, 2.6, 3.1) : 0;
    row.style.top = px(600 + i * 186);
    set(row, {
      x: shake,
      y: lerp(40, 0, inP),
      s: lerp(0.86, 1, inP) * lerp(1, 1.04, Math.sin(runaway * Math.PI)),
      o: Math.min(inP, out),
    });
    const mult = 1 + runaway * 1.28;
    row.querySelector(".price").textContent = `${nf.format(BASE[i] * mult)} 🪙`;
    row.querySelector(".delta").textContent = `▲ ${nf0.format(runaway * 128)}%`;
  });

  // ---- scene 2: the town ------------------------------------------------
  const townIn = easeOut(seg(t, TOWN_RISE, TOWN_RISE + 1.1));
  const sky = $("skyline");
  sky.style.transformOrigin = "50% 100%";
  // Recedes a little behind the merchant rather than leaving, so the bottom of
  // the frame keeps its horizon all the way to the logo.
  const recede = 1 - 0.35 * easeOut(seg(t, SCENES.trade[0], SCENES.trade[0] + 0.8));
  set(sky, { y: lerp(460, 0, townIn), s: 1, o: townIn * recede });
  // Windows warm up as the town rises, then the lights hold through the ad.
  const warm = 0.35 + 0.65 * townIn;
  for (const w of sky.querySelectorAll(".win")) w.setAttribute("opacity", String(warm));

  // ---- scene 3: the merchant and the two moves --------------------------
  const m = $("merchant");
  const mIn = seg(t, SCENES.trade[0] + 0.05, SCENES.trade[0] + 0.75);
  const mOut = 1 - easeIn(seg(t, SCENES.empire[0] - 0.4, SCENES.empire[0] + 0.2));
  m.style.left = px(60);
  m.style.top = px(640);
  const bob = Math.sin((t - SCENES.trade[0]) * 2.2) * 14;
  set(m, {
    x: lerp(620, 0, backOut(mIn)),
    y: bob,
    s: lerp(0.82, 1, easeOut(mIn)),
    o: Math.min(easeOut(mIn), mOut),
  });

  const chipA = $("chipBuy");
  const chipB = $("chipSell");
  chipA.style.left = px(40);
  chipA.style.top = px(620);
  chipB.style.left = px(470);
  chipB.style.top = px(1470);
  const cA = seg(t, 5.5, 6.05);
  const cB = seg(t, 6.15, 6.7);
  set(chipA, {
    x: lerp(-560, 0, backOut(cA)),
    r: lerp(-14, -7, easeOut(cA)),
    o: Math.min(cA > 0 ? 1 : 0, mOut),
  });
  set(chipB, {
    x: lerp(620, 0, backOut(cB)),
    r: lerp(16, 7, easeOut(cB)),
    o: Math.min(cB > 0 ? 1 : 0, mOut),
  });

  // ---- scene 4: the fortune ---------------------------------------------
  const counter = $("counter");
  const cw = window_(t, SCENES.empire[0] + 0.1, SCENES.empire[1] + 0.05, 0.3, 0.25);
  const grow = easeOut(seg(t, SCENES.empire[0] + 0.15, SCENES.empire[1] - 0.25));
  counter.style.top = px(740);
  counter.style.fontSize = px(140);
  counter.textContent = `${nf0.format(lerp(270, 214800, grow))} 🪙`;
  set(counter, { s: lerp(0.8, 1, easeOut(seg(t, SCENES.empire[0], SCENES.empire[0] + 0.5))), o: cw });

  const stackP = easeOut(seg(t, SCENES.empire[0] + 0.2, SCENES.empire[1] - 0.2));
  const stackFade = window_(t, SCENES.empire[0] + 0.1, SCENES.logo[0] + 0.45, 0.3, 0.35);
  STACKS.forEach((col, i) => {
    col.coins.forEach((el, j) => {
      const shown = j < Math.floor(stackP * col.height * (1 + i * 0.12));
      const pop = clamp01((stackP * col.height * (1 + i * 0.12) - j) * 3);
      set(el, { y: lerp(30, 0, pop), s: lerp(0.7, 1, pop), o: shown ? stackFade : 0 });
    });
  });

  // ---- coins -------------------------------------------------------------
  // Two behaviours from one set of particles: raining down through the hook
  // and the town, then bursting out of the merchant when the trade lands.
  const burst = seg(t, 6.6, 7.9);
  const rain = window_(t, 0.4, 4.6, 0.7, 0.7);
  const empireRise = seg(t, SCENES.empire[0], SCENES.empire[1]);
  for (const c of COINS) {
    let x,
      y,
      o,
      s = 1,
      r;
    if (burst > 0) {
      const p = easeOut(burst);
      x = 540 + Math.cos(c.burstAngle) * c.burstDist * p - c.size / 2;
      y = 1080 + Math.sin(c.burstAngle) * c.burstDist * p * 0.8 + p * p * 420 - c.size / 2;
      o = (1 - easeIn(burst)) * 0.95;
      r = c.spin * p;
      s = lerp(0.4, 1, Math.min(1, p * 3));
    } else if (empireRise > 0) {
      // rising, like a balance sheet
      const p = (empireRise + c.delay * 0.3) % 1;
      x = c.x - c.size / 2;
      y = 1920 - p * 2100;
      o = Math.sin(p * Math.PI) * 0.85 * window_(t, SCENES.empire[0], SCENES.logo[0] + 0.2, 0.3, 0.3);
      r = c.spin * p * 0.35;
    } else {
      const p = ((t + c.delay) * c.speed) / 2400;
      x = c.x - c.size / 2;
      y = (p % 1) * 2300 - 300;
      o = rain * 0.55;
      r = c.spin * p;
    }
    set(c.el, { x, y, s, r, o });
  }

  // ---- scene 5: the lockup ----------------------------------------------
  const logo = $("logo");
  const lp = seg(t, SCENES.logo[0], SCENES.logo[0] + 0.7);
  logo.style.top = px(700);
  set(logo, { y: lerp(60, 0, backOut(lp)), s: lerp(0.84, 1, easeOut(lp)), o: easeOut(lp) });

  const shine = $("shine");
  const sp = seg(t, SCENES.logo[0] + 0.45, SCENES.logo[0] + 1.35);
  shine.style.top = px(500);
  set(shine, { x: lerp(-560, 1500, easeInOut(sp)), o: sp > 0 && sp < 1 ? 1 : 0 });

  const cta = $("cta");
  const cp = seg(t, SCENES.logo[0] + 0.55, SCENES.logo[0] + 1.1);
  cta.style.top = px(1240);
  cta.style.fontSize = px(52);
  set(cta, {
    y: lerp(50, 0, backOut(cp)),
    s: lerp(0.9, 1, easeOut(cp)) * (1 + 0.025 * Math.sin((t - SCENES.logo[0]) * 7)),
    o: easeOut(cp),
  });

  // ---- full-frame punctuation -------------------------------------------
  // One red flash on the beat the prices peak, and one warm flash when the
  // merchant lands. Both very short: a flash that lingers reads as a bug.
  const f1 = 1 - clamp01(Math.abs(t - 3.72) / 0.13);
  const f2 = 1 - clamp01(Math.abs(t - 4.12) / 0.15);
  const flash = $("flash");
  flash.style.background = f2 > f1 ? "#ffd98a" : "#ff5a48";
  flash.style.opacity = String(Math.max(f1 * 0.5, f2 * 0.42));
}

window.__setT = (t) => frame(Math.max(0, Math.min(DURATION, t)));
window.__duration = DURATION;
window.__setT(0);
