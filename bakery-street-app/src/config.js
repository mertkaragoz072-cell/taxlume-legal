// Design space: every scene module draws in a 1400 x 800 coordinate system.
// The renderer scales it to the screen and reveals extra sky / filler houses on wider phones.
export const DESIGN = {
  w: 1400,
  h: 790,
  baseY: 575,       // where building fronts meet the pavement
  curbY: 662,       // sidewalk / street edge
  groundY: 598,     // top edge of the flat, front-on ground band
  walkY: 638,       // feet line of walking characters (stand on the ground's top edge)
};

export const TEXT = {
  bakery: 'Fırın & Kafe',
  bookshop: 'Kitapçı',
  market: 'Market',
};

// Starting values of a new game (saves replace them). energy / maxEnergy are not used by any system and are hidden in the HUD.
export const PLAYER = {
  gold: 54320,
  gems: 865,
  energy: 120,
  maxEnergy: 120,
};

export const NAV = [
  { id: 'cafe', label: 'Fırın & Kafe', active: true },
  { id: 'town', label: 'Kasaba' },
  { id: 'explore', label: 'Keşif' },
  { id: 'shop', label: 'Mağaza', hidden: true },       // not available yet: hidden, not shown as if it worked
];

/** Quick buttons in the top bar. Red dots are drawn only for quests and the daily reward, and only while something is waiting. */
export const HUD_BUTTONS = [
  { id: 'quests', label: 'Görevler' },
  { id: 'mail', label: 'Posta', hidden: true },          // not available yet
  { id: 'events', label: 'Günlük Ödül' },               // opens the daily reward panel
  { id: 'settings', label: 'Ayarlar' },
];

/** Which resource pills the top bar shows. Gem and energy data stay in the game and the save; they are just not displayed yet. */
export const HUD_SHOW = { gems: false, energy: false, plus: false };
