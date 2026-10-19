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
  oven: { name: 'Fırın', capacityUpgrade: 'ovenCapacity' },   // number of simultaneous jobs comes from this upgrade (others: 1)
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

/**
 * What the Market building sells. Prices come from INGREDIENTS (one price list for the whole game).
 * Butter is included because croissant and cake recipes need it; without it those recipes could not be supplied.
 */
export const MARKET = {
  items: ['flour', 'milk', 'egg', 'sugar', 'beans', 'butter'],
  quantities: [1, 5, 10],      // quick-pick amounts next to the +/- stepper
  maxPerPurchase: 99,
};

/**
 * Upgrades for the bakery & cafe. `values[level]` is the effect at that level (index 0 = not upgraded);
 * `costs[level - 1]` is the gold price to reach that level, so costs.length = number of purchasable levels (5).
 *   ovenCapacity     -> how many items the oven can bake at the same time
 *   productionSpeed  -> multiplier applied to every recipe's production time
 *   showcaseCapacity -> how many finished units of each product can be kept (production refuses to start when full)
 */
export const UPGRADES = {
  ovenCapacity: {
    name: 'Fırın kapasitesi', icon: '🔥', costs: [800, 2500, 6000, 12000, 25000], values: [1, 2, 3, 4, 5, 6],
    describe: (v) => `Fırın aynı anda ${v} ürün pişirir`,
  },
  productionSpeed: {
    name: 'Üretim hızı', icon: '⚡', costs: [600, 2000, 5000, 10000, 22000], values: [1, 0.9, 0.8, 0.7, 0.6, 0.5],
    describe: (v) => (v === 1 ? 'Normal hız' : `Hazırlanma süresi %${Math.round((1 - v) * 100)} kısalır`),
  },
  showcaseCapacity: {
    name: 'Satış vitrini', icon: '🗄️', costs: [400, 1200, 3000, 7000, 15000], values: [10, 15, 20, 30, 40, 60],
    describe: (v) => `Vitrin her üründen ${v} adet tutar`,
  },
};

/**
 * Quests. `stat` names a lifetime counter kept by the game (see Game.stats); the quest is complete when it reaches `target`.
 * Rewards may contain gold and/or ingredients (added to the same shared gold and inventory the rest of the game uses).
 *   stats: produced.<product>, sold.<product>, producedTotal, soldTotal, marketPurchases, upgradesBought
 */
export const QUESTS = [
  { id: 'firstBread', name: 'İlk ekmeğin', icon: '🍞', condition: 'Bir ekmek üret', stat: 'produced.bread', target: 1, reward: { gold: 100 } },
  { id: 'firstSale', name: 'İlk satış', icon: '💰', condition: 'Bir ürün sat', stat: 'soldTotal', target: 1, reward: { gold: 150, ingredients: { flour: 4 } } },
  { id: 'marketTrip', name: 'Market alışverişi', icon: '🛒', condition: "Market'ten malzeme satın al", stat: 'marketPurchases', target: 1, reward: { gold: 100, ingredients: { milk: 2 } } },
  { id: 'sellFive', name: 'Tezgâh hareketleniyor', icon: '🧾', condition: 'Toplam 5 ürün sat', stat: 'soldTotal', target: 5, reward: { gold: 300, ingredients: { butter: 2 } } },
  { id: 'firstUpgrade', name: 'Büyüyen işletme', icon: '⬆️', condition: 'Bir geliştirme satın al', stat: 'upgradesBought', target: 1, reward: { gold: 250, ingredients: { sugar: 4 } } },
  { id: 'produceTen', name: 'Üretim hattı', icon: '🏭', condition: 'Toplam 10 ürün üret', stat: 'producedTotal', target: 10, reward: { gold: 400, ingredients: { beans: 4, milk: 2 } } },
];

/**
 * Seven-day daily reward cycle (index 0 = day 1). Each reward may contain gold, gems and/or ingredients.
 * Rule for missed days: claiming on the day after your last claim moves to the next day of the cycle (day 7 -> day 1);
 * if one or more calendar days were skipped, the cycle restarts at day 1.
 */
export const DAILY = [
  { gold: 200 },
  { ingredients: { flour: 6, milk: 3 } },
  { gold: 300 },
  { gems: 5 },
  { ingredients: { butter: 3, sugar: 3, egg: 4 } },
  { gold: 500 },
  { gems: 20, gold: 1000 },
];
