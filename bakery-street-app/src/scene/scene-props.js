// Where the supplied prop art stands on the Market and Bookshop screens (design px; feet at `y`, `h` = height).
// `back` props are drawn before the building, `front` props after it. The panel covers the right half, so everything stays at x < 640.
export const MARKET_PROPS = {
  back: [{ name: 'fountain', x: 560, y: 600, h: 150 }],
  front: [
    { name: 'crates', x: 70, y: 660, h: 92 },
    { name: 'barrel', x: 468, y: 650, h: 100 },
    { name: 'barrel2', x: 528, y: 662, h: 88 },
    { name: 'cart', x: 400, y: 690, h: 118, flip: true },
  ],
};
export const BOOKSHOP_PROPS = {
  back: [{ name: 'lamp_triple', x: 560, y: 590, h: 250 }],
  front: [
    { name: 'planter_blue', x: 90, y: 668, h: 82 },
    { name: 'chalkboard', x: 440, y: 650, h: 96 },
    { name: 'bench_wood', x: 150, y: 700, h: 100 },
    { name: 'planter_blue2', x: 330, y: 672, h: 86 },
    { name: 'planter_green', x: 520, y: 676, h: 74 },
    { name: 'planter_box', x: 250, y: 724, h: 56 },
    { name: 'urn', x: 40, y: 640, h: 62 },
  ],
};
