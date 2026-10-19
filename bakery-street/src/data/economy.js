// All tunable game numbers live here: ingredients, products, stations and starting stock.
// Change a value and the production panels, recipes and economy follow; no other file holds balance numbers.

/** Raw materials. `price` = gold to buy one unit; `start` = units the player owns at the beginning. */
export const INGREDIENTS = {
  flour: { name: 'Un', icon: '🌾', price: 8, start: 12 },
  butter: { name: 'Tereyağı', icon: '🧈', price: 15, start: 4 },
  sugar: { name: 'Şeker', icon: '🍬', price: 6, start: 4 },
  egg: { name: 'Yumurta', icon: '🥚', price: 5, start: 6 },
  milk: { name: 'Süt', icon: '🥛', price: 7, start: 6 },
  beans: { name: 'Kahve çekirdeği', icon: '🫘', price: 10, start: 6 },
};

/** Machines that run one production job at a time. */
export const STATIONS = {
  oven: { name: 'Fırın' },
  coffee: { name: 'Kahve Makinesi' },
};

/**
 * Sellable products.
 * time = production seconds, ingredients = units consumed when production starts,
 * price = gold received per unit sold, start = units in stock at the beginning.
 */
export const PRODUCTS = {
  bread: { name: 'Ekmek', icon: '🍞', station: 'oven', time: 20, ingredients: { flour: 2 }, price: 30, start: 2 },
  croissant: { name: 'Kruvasan', icon: '🥐', station: 'oven', time: 40, ingredients: { flour: 2, butter: 1 }, price: 60, start: 0 },
  cake: { name: 'Pasta', icon: '🍰', station: 'oven', time: 75, ingredients: { flour: 2, sugar: 2, egg: 2, butter: 1, milk: 1 }, price: 120, start: 0 },
  coffee: { name: 'Kahve', icon: '☕', station: 'coffee', time: 12, ingredients: { beans: 1, milk: 1 }, price: 40, start: 0 },
};

/** Quantities offered by the "buy" buttons in the storeroom panel. */
export const BUY_AMOUNTS = [1, 5];

/** Customer / order tuning. Times are seconds, converted to milliseconds by the code. */
export const CAFE = {
  tables: 3,                    // seats available for customers (matches the 3 tables in the interior)
  queueMax: 3,                  // customers waiting outside for a table; nobody new arrives beyond this
  firstSpawnSec: 4,             // first customer after a fresh start
  spawnEverySec: [14, 26],      // random gap between arrivals
  queuePatienceSec: 45,         // waiting for a table before giving up
  orderPatienceSec: 100,        // waiting for the order after sitting down
  maxStepSec: 2,                // longest time one tick may advance patience (a hidden tab never burns patience)
  orderWeights: { bread: 4, croissant: 3, cake: 2, coffee: 4 },   // how likely each product is ordered
  history: 20,                  // closed orders kept for reference
};
