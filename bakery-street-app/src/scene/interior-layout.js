// Where each functional area sits in the cafe interior (design space 1400 x 790) and what it does when tapped.
// `panel` names the UI opened by the area; `station` ties a machine to the production jobs it runs.
/*
 * PERSPECTIVE. The floor picture (assets/game/interior/room.webp) is the ground truth: its tiles are 74 px wide at the wall and 128 px at the front
 * (measured, `tileW`), so a thing standing nearer the viewer is bigger by the same ratio. Every size below comes from `perspScale(y)`, y being the
 * world y of the line the thing stands on, so tables, chairs, rugs, equipment and people keep the same proportions to the tiles at every depth.
 * Picture rows map to world rows as y = FLOOR_Y + (row - ROOM_JOIN) * FLOOR_K (see InteriorScene.shell); on tall phones the scene applies one shared
 * vertical warp to floor and objects alike (InteriorScene.warpAt), which never changes widths, so this model stays valid.
 */
export const FLOOR_Y = 470;            // where the back wall meets the floor
export const ROOM_JOIN = 452;          // the same line in the room picture (px)
export const FLOOR_K = 1.07;           // world units per picture px, vertically
const PERSP_REF_Y = 1040;              // the first table row stands here: scale 1
export const PERSP_STRENGTH = 0.85;    // 1 = exactly the tile growth; a little less keeps the far kitchen readable
const tileW = (y) => 0.061 * (ROOM_JOIN + (y - FLOOR_Y) / FLOOR_K) + 42.4;
/** Size factor of anything standing on world line y (1 at the first table row). */
export const perspScale = (y) => 1 + PERSP_STRENGTH * (tileW(y) / tileW(PERSP_REF_Y) - 1);

/** Equipment pictures (assets/game/interior/*.webp) in px: an object of picture size (pw, ph) standing on line `base` is drawn pw*k x ph*k, k = K0 * perspScale(base). */
const EQ = { oven: [334, 333], counter: [333, 264], showcase: [384, 289], coffee: [385, 298], storage: [366, 289], upgrades: [226, 228] };
const K0 = 300 / 384 / perspScale(700);                // the showcase is 300 wide on its line (700)
const equip = (id, cx, base) => { const [pw, ph] = EQ[id], k = K0 * perspScale(base), w = Math.round(pw * k), h = Math.round(ph * k); return { x: Math.round(cx - w / 2), y: base - h, w, h }; };
/** A table slot (a 1000 x 524 unit box: table + two chairs) whose table foot stands on `base`, centred on cx; first-row width TABLE_W. */
const TABLE_W = 262;
const table = (cx, base) => { const w = Math.round(TABLE_W * perspScale(base)), h = Math.round(w * 0.5778); return { x: Math.round(cx - w / 2), y: base - h, w, h }; };

export const AREAS = [
  // PORTRAIT cafe, a 900-unit-wide world (see CAM). Back wall, kitchen row against it (oven, storage, the upgrade sign behind the coffee machine):
  { id: 'oven', label: 'Fırın', panel: 'oven', station: 'oven', ...equip('oven', 130, 482) },
  { id: 'storage', label: 'Depo', panel: 'storage', ...equip('storage', 385, 482) },
  { id: 'upgrades', label: 'Geliştirmeler', panel: 'upgrades', ...equip('upgrades', 660, 490) },
  // the service line, one row across the room in front of the kitchen: prep counter, showcase facing the guests, coffee station (all standing on line 700)
  { id: 'counter', label: 'Üretim Tezgâhı', labelOn: 'front', panel: 'counter', ...equip('counter', 138, 700) },
  { id: 'showcase', label: 'Satış Vitrini', panel: 'showcase', ...equip('showcase', 422, 700) },
  { id: 'coffee', label: 'Kahve Makinesi', panel: 'coffee', station: 'coffee', barDx: 70, barW: 130, ...equip('coffee', 728, 700) },     // barDx/barW: the progress bar sits right of the upgrade sign behind the machine
  // dining area, in front: two columns either side of a central aisle (tables 1 and 3 left, 2 and 4 right), the right column set back a little. The
  // cafeTables upgrade opens them in this order (row one first). `side` is the chair the guest takes: always the one facing the aisle (-1 left, +1
  // right), so each guest's access gap lies in the aisle. Each table is as much bigger as the floor is wider where it stands.
  { id: 'table1', label: 'Masa 1', panel: null, side: 1, flip: true, ...table(160, 1040) },
  { id: 'table2', label: 'Masa 2', panel: null, side: -1, ...table(740, 1090) },
  { id: 'table3', label: 'Masa 3', panel: null, side: 1, flip: true, ...table(150, 1290) },
  { id: 'table4', label: 'Masa 4', panel: null, side: -1, ...table(750, 1340) },
];

/** Drawing order = depth: the kitchen side first, then the baker (behind the counters), then the counters, then the tables. */
export const DRAW_ORDER = ['oven', 'storage', 'upgrades', '_staff', 'counter', 'showcase', 'coffee', 'table1', 'table2', 'table3', 'table4'];

/*
 * Depth plan (one continuous floor, no steps), back to front:
 *   back wall .......... wall/floor line FLOOR_Y; oven and storage stand against it, the sign hangs on it
 *   kitchen floor ...... the baker works here (STAFF_LANE_Y), between the wall and the counters
 *   service line ....... counters, showcase and coffee machine, their front edge on COUNTER_Y
 *   customer floor ..... guests queue in front of the showcase (SERVICE_LINE_Y), the waiter walks (WAITER_LANE_Y), tables further forward
 */
/** People in the cafe are drawn this much larger than on the street so they match the furniture (a guest is ~250 px, the counter ~120 and waist-high). */
export const PERSON_SCALE = 1.7;
export const PERSON_H = 250;                // approximate drawn height of a guest (bubbles, hit tests)
export const COUNTER_Y = 700;          // front edge of the counters
export const STAFF_LANE_Y = 545;       // the baker's feet: head and shoulders show above the counters
export const SERVICE_LINE_Y = 805;     // lane for guests walking left (from the door toward the showcase and the left tables)
export const LEAVE_LINE_Y = 822;       // lane for guests walking right (to the right-hand tables and out of the door): opposite flows pass 17 px apart
export const QUEUE_Y = 770;            // guests waiting at the showcase stand a row behind the lane, so walkers pass in front of them
export const WAITER_LANE_Y = 735;      // the waiter's feet, right in front of the counters
export const WALL_Y = 130;              // top of the back wall (below the HUD)

export const areaAt = (x, y) => AREAS.find((a) => x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h) ?? null;

const TABLES = AREAS.filter((a) => a.id.startsWith('table'));

/**
 * Where a seated customer sits: on the table's chair on its `side`. `via` is the open column in the gap beside the table that they walk down
 * and slide out of, so nobody crosses the table or its neighbour.
 */
export const chairSpot = (index) => {
  const a = TABLES[index];
  const side = a.side ?? -1;
  return { x: a.x + a.w / 2 + side * 105 * (a.w / 270), y: a.y + a.h - 27, via: a.x + a.w / 2 + side * 190, seat: true, side };
};
/**
 * Sitting: the cushion of a chair is at 38% of the table picture's height (measured on assets/interior/table.webp). A seated guest is
 * drawn lowered so the hips rest on the cushion (hips are ~118 px above the feet at the cafe scale), and everything below the cushion's
 * top edge is cut off, so the legs sit behind the chair front and nobody floats or sinks into the tabletop.
 */
/**
 * Where the picture of a seated guest (chair + guest + table, seen from the front, centred on the table) is drawn for table `a`:
 * as wide as the table slot, standing on its bottom edge; mirrored when the guest sits on the right (`side` 1).
 */
export const SEAT_TABLE_FRAC = 268 / 460;   // the table top is 268 of the 460 px of a seat picture, which is centred on the table
export const seatRect = (a, img) => {
  const k = (0.58 * a.w) / (SEAT_TABLE_FRAC * img.naturalWidth), w = img.naturalWidth * k, h = img.naturalHeight * k;   // table top as wide as the empty table's (460 of 1000 units)
  return { x: a.x + a.w / 2 - w / 2, y: a.y + a.h - h, w, h, flip: (a.side ?? -1) === 1 };
};
export const seatTop = (a) => a.y + a.h * 0.38;
export const HIP_H = 118;
export const sitFeetY = (index) => seatTop(TABLES[index]) + 12 + HIP_H;     // where the (hidden) feet of a seated guest end up
export const sitCutY = (index) => seatTop(TABLES[index]) + 24;

/** Depth key (the y of the line an object stands on): what is further back is drawn first. Tables are judged by their front edge a bit above the chair feet. */
export const depthOf = (a) => (a.id.startsWith('table') ? a.y + a.h - 35 : a.id === 'upgrades' ? a.y + a.h : a.y + a.h);

/**
 * Where shop decoration stands (see SHOP_ITEMS in data/economy.js: an item names its slot). Sizes are at the first table row's scale and grow with perspScale.
 *   flat  : lies on the floor, drawn under people and furniture (x, y = its centre, w = width)
 *   stand : stands on the floor line y (h = height), drawn depth-sorted with the people
 *   hang  : a pendant lamp whose lower end is at y (h = lamp height), hung from a fading cord, drawn above everything
 *   wall  : fixed on the back wall (x centre, y = its lower edge, w = width)
 * All of them sit in the central aisle or at the edges, clear of the walking lanes (guests use the gaps at x 350 and 550, the waiter lane is above y 740).
 */
export const DECOR_SLOTS = {
  'doormat': { x: 450, y: 1335, kind: 'flat', w: 150 },
  'rug-aisle': { x: 450, y: 1185, kind: 'flat', w: 250 },
  'rug-aisle-2': { x: 450, y: 1010, kind: 'flat', w: 250 },
  'edge-left': { x: 52, y: 885, kind: 'stand', h: 128 },
  'edge-right': { x: 848, y: 890, kind: 'stand', h: 128 },
  'aisle-top': { x: 450, y: 940, kind: 'stand', h: 135 },
  'lamp-1': { x: 450, y: 1085, kind: 'hang', h: 105 },
  'lamp-2': { x: 450, y: 1290, kind: 'hang', h: 105 },
  'wall-r1': { x: 806, y: 335, kind: 'wall', w: 150 },
  'wall-r2': { x: 806, y: 452, kind: 'wall', w: 150 },
};

/** Waiting spots in front of the showcase (centre 422), one body width apart. */
export const QUEUE_SPOTS = [{ x: 422, y: QUEUE_Y }, { x: 282, y: QUEUE_Y }, { x: 562, y: QUEUE_Y }];

/** Camera: the interior is drawn zoomed out (see InteriorScene), centred on this world x so the 30..1414 content has air on both sides. */
/**
 * The supplied empty room (assets/game/interior/room.webp, 1600 x 900): its wall/floor join is at 48% of the picture's height. It is drawn
 * so that join sits on FLOOR_Y, scaled to cover the screen; the picture's perspective (planks widening towards the viewer) is the floor.
 */
export const ROOM = { join: 0.484 };

/** Depth scale of a person standing on world line y: the same perspective as the furniture (see perspScale), about 0.77 behind the counters and 1.3 at the entrance. */
export const depthScale = (y) => perspScale(y);

/** Portrait camera: the world is 900 units wide and 1600 tall (9:16); the scene fits the width (or the height on wide screens) and is anchored to the top. */
export const CAM = { w: 900, h: 1600 };
