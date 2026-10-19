// Where each functional area sits in the cafe interior (design space 1400 x 790) and what it does when tapped.
// `panel` names the UI opened by the area; `station` ties a machine to the production jobs it runs.
export const AREAS = [
  { id: 'oven', label: 'Fırın', panel: 'oven', station: 'oven', x: 40, y: 170, w: 310, h: 310 },
  { id: 'counter', label: 'Üretim Tezgâhı', panel: 'counter', x: 370, y: 330, w: 330, h: 150 },
  { id: 'showcase', label: 'Satış Vitrini', panel: 'showcase', x: 725, y: 250, w: 330, h: 230 },
  { id: 'coffee', label: 'Kahve Makinesi', panel: 'coffee', station: 'coffee', x: 1085, y: 230, w: 175, h: 250 },
  { id: 'storage', label: 'Depo', panel: 'storage', x: 1285, y: 330, w: 95, h: 150 },
  { id: 'upgrades', label: 'Geliştirmeler', panel: 'upgrades', x: 1285, y: 140, w: 100, h: 140 },
  { id: 'table1', label: 'Masa 1', panel: null, x: 150, y: 560, w: 230, h: 170 },
  { id: 'table2', label: 'Masa 2', panel: null, x: 540, y: 575, w: 230, h: 170 },
  { id: 'table3', label: 'Masa 3', panel: null, x: 930, y: 560, w: 230, h: 170 },
];

export const WALL_Y = 96;     // top of the back wall (below the HUD)
export const FLOOR_Y = 480;   // where the back wall meets the floor

export const areaAt = (x, y) => AREAS.find((a) => x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h) ?? null;

const TABLES = AREAS.filter((a) => a.id.startsWith('table'));

/** Where a seated customer stands: beside the table on its left, so neighbours and the entrance queue never overlap. */
export const chairSpot = (index) => {
  const a = TABLES[index];
  return { x: a.x + a.w / 2 - 95, y: a.y + a.h - 6 };
};

/** Waiting spots by the entrance (right side), staggered in depth so the queue does not pile up. */
export const QUEUE_SPOTS = [{ x: 1352, y: 708 }, { x: 1262, y: 734 }, { x: 1176, y: 708 }];
