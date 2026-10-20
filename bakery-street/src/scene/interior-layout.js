// Where each functional area sits in the cafe interior (design space 1400 x 790) and what it does when tapped.
// `panel` names the UI opened by the area; `station` ties a machine to the production jobs it runs.
export const AREAS = [
  // against the back wall (kitchen side)
  { id: 'oven', label: 'Fırın', panel: 'oven', station: 'oven', x: 50, y: 205, w: 220, h: 220 },
  { id: 'storage', label: 'Depo', panel: 'storage', x: 1290, y: 318, w: 96, h: 118 },
  { id: 'upgrades', label: 'Geliştirmeler', panel: 'upgrades', x: 1272, y: 140, w: 124, h: 152 },
  // the service line: counters stand in front of the kitchen floor
  { id: 'counter', label: 'Üretim Tezgâhı', labelOn: 'front', panel: 'counter', x: 310, y: 378, w: 330, h: 122 },
  { id: 'showcase', label: 'Satış Vitrini', panel: 'showcase', x: 670, y: 322, w: 270, h: 178 },
  { id: 'coffee', label: 'Kahve Makinesi', panel: 'coffee', station: 'coffee', x: 975, y: 295, w: 150, h: 205 },
  // dining area, in front
  { id: 'table1', label: 'Masa 1', panel: null, x: 180, y: 566, w: 300, h: 158 },
  { id: 'table2', label: 'Masa 2', panel: null, x: 550, y: 566, w: 300, h: 158 },
  { id: 'table3', label: 'Masa 3', panel: null, x: 920, y: 566, w: 300, h: 158 },
];

/** Drawing order = depth: the kitchen side first, then the baker (behind the counters), then the counters, then the tables. */
export const DRAW_ORDER = ['oven', 'storage', 'upgrades', '_staff', 'counter', 'showcase', 'coffee', 'table1', 'table2', 'table3'];

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
export const COUNTER_Y = 500;          // front edge of the counters
export const STAFF_LANE_Y = 440;       // the baker's feet: head and shoulders show above the counters
export const SERVICE_LINE_Y = 580;     // customers' feet while they wait and when they enter
export const WAITER_LANE_Y = 560;      // the waiter's feet: strictly inside the dining area
export const WALL_Y = 96;              // top of the back wall (below the HUD)
export const FLOOR_Y = 400;            // where the back wall meets the floor

export const areaAt = (x, y) => AREAS.find((a) => x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h) ?? null;

const TABLES = AREAS.filter((a) => a.id.startsWith('table'));

/** Where a seated customer stands: beside the table on its left, so neighbours and the entrance queue never overlap. */
export const chairSpot = (index) => {
  const a = TABLES[index];
  return { x: a.x + a.w / 2 - 105, y: a.y + a.h - 6 };
};

/** Waiting spots along the service line in front of the showcase, staggered a little in depth. */
export const QUEUE_SPOTS = [{ x: 710, y: SERVICE_LINE_Y }, { x: 805, y: SERVICE_LINE_Y + 6 }, { x: 900, y: SERVICE_LINE_Y }];
