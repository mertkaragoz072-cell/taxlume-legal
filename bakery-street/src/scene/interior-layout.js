// Where each functional area sits in the cafe interior (design space 1400 x 790) and what it does when tapped.
// `panel` names the UI opened by the area; `station` ties a machine to the production jobs it runs.
export const AREAS = [
  // against the back wall (kitchen side), left to right: oven, prep counter, showcase facing the guests, coffee station, storage
  { id: 'oven', label: 'Fırın', panel: 'oven', station: 'oven', x: 30, y: 205, w: 220, h: 220 },
  { id: 'storage', label: 'Depo', panel: 'storage', x: 1230, y: 318, w: 96, h: 118 },
  { id: 'upgrades', label: 'Geliştirmeler', panel: 'upgrades', x: 1212, y: 140, w: 124, h: 152 },
  // the service line: counters stand in front of the kitchen floor, about 80 px apart
  { id: 'counter', label: 'Üretim Tezgâhı', labelOn: 'front', panel: 'counter', x: 310, y: 368, w: 330, h: 122 },
  { id: 'showcase', label: 'Satış Vitrini', panel: 'showcase', x: 720, y: 312, w: 270, h: 178 },
  { id: 'coffee', label: 'Kahve Makinesi', panel: 'coffee', station: 'coffee', x: 1060, y: 285, w: 150, h: 205 },
  // dining area, in front, behind a wide open corridor: two groups either side of a central aisle (tables 3+1 left, 2+4 right), the outer
  // table of each group set back a little. The cafeTables upgrade opens them in this order (the two aisle tables first), so the room always
  // looks balanced. `side` is the chair the guest takes (-1 left, +1 right); each guest's access gap lies on that side.
  { id: 'table1', label: 'Masa 1', panel: null, side: -1, x: 368, y: 600, w: 280, h: 162 },
  { id: 'table2', label: 'Masa 2', panel: null, side: 1, x: 788, y: 600, w: 280, h: 162 },
  { id: 'table3', label: 'Masa 3', panel: null, side: -1, x: -12, y: 590, w: 280, h: 162 },
  { id: 'table4', label: 'Masa 4', panel: null, side: 1, x: 1168, y: 590, w: 280, h: 162 },
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
/** Hips-down part of a seated guest is hidden behind the table: cut the sprite this far above the feet. */
export const SEAT_CUT = 95;

/** Depth key (the y of the line an object stands on): what is further back is drawn first. Tables are judged by their front edge a bit above the chair feet. */
export const depthOf = (a) => (a.id.startsWith('table') ? a.y + a.h - 35 : a.id === 'upgrades' ? a.y + a.h : a.y + a.h);

/** Waiting spots in front of the showcase (centre 855), one body width apart. */
export const QUEUE_SPOTS = [{ x: 855, y: QUEUE_Y }, { x: 760, y: QUEUE_Y }, { x: 950, y: QUEUE_Y }];

/** Camera: the interior is drawn zoomed out (see InteriorScene), centred on this world x so the 30..1414 content has air on both sides. */
export const CAM = { zoom: 0.8, cx: 718, baseY: 760, bottomPad: 64 };
