// Where each functional area sits in the cafe interior (design space 1400 x 790) and what it does when tapped.
// `panel` names the UI opened by the area; `station` ties a machine to the production jobs it runs.
export const AREAS = [
  // against the back wall (kitchen side), left to right: oven, prep counter, showcase facing the guests, coffee station, storage
  { id: 'oven', label: 'Fırın', panel: 'oven', station: 'oven', x: 30, y: 205, w: 222, h: 224 },
  { id: 'storage', label: 'Depo', panel: 'storage', x: 1252, y: 306, w: 150, h: 127 },
  { id: 'upgrades', label: 'Geliştirmeler', panel: 'upgrades', x: 1268, y: 130, w: 118, h: 148 },
  // the service line: counters stand in front of the kitchen floor, about 80 px apart
  { id: 'counter', label: 'Üretim Tezgâhı', labelOn: 'front', panel: 'counter', x: 300, y: 232, w: 330, h: 258 },
  { id: 'showcase', label: 'Satış Vitrini', panel: 'showcase', x: 715, y: 259, w: 300, h: 231 },
  { id: 'coffee', label: 'Kahve Makinesi', panel: 'coffee', station: 'coffee', x: 1025, y: 261, w: 215, h: 229 },
  // dining area, in front, behind a wide open corridor: two groups either side of a central aisle (tables 3+1 left, 2+4 right), the outer
  // table of each group set back a little. The cafeTables upgrade opens them in this order (the two aisle tables first), so the room always
  // looks balanced. `side` is the chair the guest takes (-1 left, +1 right); each guest's access gap lies on that side.
  { id: 'table1', label: 'Masa 1', panel: null, side: -1, x: 352, y: 576, w: 270, h: 156 },
  { id: 'table2', label: 'Masa 2', panel: null, side: 1, x: 806, y: 630, w: 290, h: 168, flip: true },
  { id: 'table3', label: 'Masa 3', panel: null, side: -1, x: -22, y: 618, w: 290, h: 168 },
  { id: 'table4', label: 'Masa 4', panel: null, side: 1, x: 1186, y: 584, w: 270, h: 156, flip: true },
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
export const COUNTER_Y = 490;          // front edge of the counters
export const STAFF_LANE_Y = 432;       // the baker's feet: head and shoulders show above the counters
export const SERVICE_LINE_Y = 575;     // lane for guests walking left (from the door toward the showcase and the left tables)
export const LEAVE_LINE_Y = 592;       // lane for guests walking right (to the right-hand tables and out of the door): opposite flows pass 17 px apart
export const QUEUE_Y = 538;            // guests waiting at the showcase stand a row behind the lane, so walkers pass in front of them
export const WAITER_LANE_Y = 505;      // the waiter's feet, right in front of the counters
export const WALL_Y = 96;              // top of the back wall (below the HUD)
export const FLOOR_Y = 400;            // where the back wall meets the floor

export const areaAt = (x, y) => AREAS.find((a) => x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h) ?? null;

const TABLES = AREAS.filter((a) => a.id.startsWith('table'));

/**
 * Where a seated customer sits: on the table's chair on its `side`. `via` is the open column in the gap beside the table that they walk down
 * and slide out of, so nobody crosses the table or its neighbour.
 */
export const chairSpot = (index) => {
  const a = TABLES[index];
  const side = a.side ?? -1;
  return { x: a.x + a.w / 2 + side * 105, y: a.y + a.h - 27, via: a.x + a.w / 2 + side * 190, seat: true, side };
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

/** Waiting spots in front of the showcase (centre 855), one body width apart. */
export const QUEUE_SPOTS = [{ x: 855, y: QUEUE_Y }, { x: 735, y: QUEUE_Y }, { x: 975, y: QUEUE_Y }];

/** Camera: the interior is drawn zoomed out (see InteriorScene), centred on this world x so the 30..1414 content has air on both sides. */
/**
 * The supplied empty room (assets/game/interior/room.webp, 1600 x 900): its wall/floor join is at 48% of the picture's height. It is drawn
 * so that join sits on FLOOR_Y, scaled to cover the screen; the picture's perspective (planks widening towards the viewer) is the floor.
 */
export const ROOM = { join: 0.484 };

/** Depth scale: the nearer to the viewer (larger y), the larger a person or table is drawn (perspective), 0.86 at the wall to 1.04 at the front. */
export const depthScale = (y) => 0.86 + 0.18 * Math.max(0, Math.min(1, (y - 430) / 380));

export const CAM = { zoom: 0.97, cx: 790, baseY: 760, bottomPad: 40 };
