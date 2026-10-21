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
  // dining area, in front, behind a wide open corridor. Four slots; the cafeTables upgrade opens them in this order
  // (the two middle ones first, so the room always looks balanced). 80 px of floor between neighbours.
  { id: 'table1', label: 'Masa 1', panel: null, x: 378, y: 587, w: 300, h: 175 },
  { id: 'table2', label: 'Masa 2', panel: null, x: 758, y: 587, w: 300, h: 175 },
  { id: 'table3', label: 'Masa 3', panel: null, x: -2, y: 587, w: 300, h: 175 },
  { id: 'table4', label: 'Masa 4', panel: null, x: 1138, y: 587, w: 300, h: 175 },
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
export const SERVICE_LINE_Y = 565;     // customers' feet while they wait and when they enter
export const WAITER_LANE_Y = 535;      // the waiter's feet: strictly inside the dining area
export const WALL_Y = 96;              // top of the back wall (below the HUD)
export const FLOOR_Y = 400;            // where the back wall meets the floor

export const areaAt = (x, y) => AREAS.find((a) => x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h) ?? null;

const TABLES = AREAS.filter((a) => a.id.startsWith('table'));

/**
 * Where a seated customer sits: on the table's left chair. `via` is the open column in the gap left of the table that they walk down
 * and slide out of, so nobody crosses the table or its neighbour.
 */
export const chairSpot = (index) => {
  const a = TABLES[index];
  return { x: a.x + a.w / 2 - 105, y: a.y + a.h - 27, via: a.x + a.w / 2 - 190, seat: true };
};
/** Hips-down part of a seated guest is hidden behind the table: cut the sprite this far above the feet. */
export const SEAT_CUT = 95;

/** Depth key (the y of the line an object stands on): what is further back is drawn first. Tables are judged by their front edge a bit above the chair feet. */
export const depthOf = (a) => (a.id.startsWith('table') ? a.y + a.h - 35 : a.id === 'upgrades' ? a.y + a.h : a.y + a.h);

/** Waiting spots along the service line in front of the showcase, staggered a little in depth. */
export const QUEUE_SPOTS = [{ x: 875, y: SERVICE_LINE_Y }, { x: 775, y: SERVICE_LINE_Y }, { x: 975, y: SERVICE_LINE_Y }];

/** Camera: the interior is drawn zoomed out (see InteriorScene), centred on this world x so the 30..1414 content has air on both sides. */
export const CAM = { zoom: 0.8, cx: 718, baseY: 760, bottomPad: 64 };
