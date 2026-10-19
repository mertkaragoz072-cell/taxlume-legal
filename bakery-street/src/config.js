// Design space: every scene module draws in a 1400 x 800 coordinate system.
// The renderer scales it to the screen and reveals extra sky / filler houses on wider phones.
export const DESIGN = {
  w: 1400,
  h: 730,
  baseY: 575,       // where building fronts meet the pavement
  curbY: 662,       // sidewalk / street edge
  groundY: 598,     // top edge of the flat, front-on ground band
  walkY: 604,       // feet line of walking characters (stand on the ground's top edge)
};

export const TEXT = {
  bakery: 'Fırın & Kafe',
  bookshop: 'Kitapçı',
  market: 'Market',
};

// Placeholder player state; a real save system can replace this later.
export const PLAYER = {
  level: 12,
  xp: 0.55,
  gold: 54320,
  gems: 865,
  energy: 120,
  maxEnergy: 120,
};

export const NAV = [
  { id: 'cafe', label: 'Fırın & Kafe', active: true },
  { id: 'town', label: 'Kasaba' },
  { id: 'explore', label: 'Keşif', locked: true },
  { id: 'shop', label: 'Mağaza', badge: true },
];

export const HUD_BUTTONS = [
  { id: 'quests', label: 'Görevler', badge: true },
  { id: 'mail', label: 'Posta', badge: true },
  { id: 'events', label: 'Etkinlik', badge: true },
  { id: 'settings', label: 'Ayarlar' },
];
