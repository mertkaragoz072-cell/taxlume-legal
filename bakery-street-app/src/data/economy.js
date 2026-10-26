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
  coffee: { name: 'Kahve', icon: '☕', station: 'coffee', time: 16, ingredients: { beans: 1, milk: 1 }, price: 34, start: 0 },   // time/price tuned so coffee earns ~1.1 gold/s like the oven items (it was 1.9)
};

/** Quantities offered by the "buy" buttons in the storeroom panel. */
export const BUY_AMOUNTS = [1, 5];

/**
 * Sales tuning. A customer pays the full order price (with the Usta Satıcı bonus). Selling straight from the showcase pays that
 * minus 20% of the customer's NET profit, where net = income - ingredient cost + Verimli Üretim refund, all after research bonuses.
 * `showcaseNetShare` is the share of the customer's net profit the showcase keeps: 0.8 -> the showcase nets ~20% less, whatever the
 * research levels (bread 11 vs 14, croissant 23 vs 29, cake 48 vs 60, coffee 14 vs 17 at the start). Prices and costs come only from
 * PRODUCTS and INGREDIENTS; Game.unitEconomics() is the single place that combines them.
 */
export const SALES = { showcaseNetShare: 0.8 };

/** Customer / order tuning. Times are seconds, converted to milliseconds by the code. */
export const CAFE = {
  tables: 4,                    // most tables the interior has room for (the cafeTables upgrade opens them one by one)
  tablesUpgrade: 'cafeTables',  // upgrade whose value is the number of open tables; null = all `tables` are open
  baseTables: 2,                // arrivals are paced for this many tables; more tables bring proportionally more guests
  queueMax: 1,                  // customers waiting outside for a table; nobody new arrives beyond this
  firstSpawnSec: 4,             // first customer after a fresh start
  spawnEverySec: [26, 42],      // random gap between arrivals
  queuePatienceSec: 45,         // waiting for a table before giving up
  orderPatienceSec: 100,        // waiting for the order after sitting down
  eatSec: 5,                    // a served guest stays at the table this long eating (the table is not free meanwhile); 0 = the guest leaves at once
  cleanSec: 1.5,                // after the guest has gone the table is cleared this long before the next guest may sit
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
  quantities: [5, 10],         // quick-pick amounts next to the +/- stepper (1 is reached with the stepper)
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
  cafeTables: {
    name: 'Kafe masaları', icon: '🪑', costs: [1800, 6500], values: [2, 3, 4],
    describe: (v) => `Kafede ${v} masa var, müşteri sayısı masalarla artar`,
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
  { id: 'openBookshop', name: 'Kasaba büyüyor', icon: '📚', condition: "Kasaba'da yeni bir bina aç", stat: 'buildingsOpened', target: 1, reward: { gold: 500, ingredients: { flour: 4 } } },
  { id: 'firstExplore', name: 'Kaşif', icon: '🧭', condition: 'Bir keşfi tamamla ve ödülünü al', stat: 'explorationsDone', target: 1, reward: { gold: 300, ingredients: { egg: 4 } } },
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

/**
 * Player level and XP. All numbers are tunable here.
 *  - XP.* : XP earned per successful action (only when the action really happens, never for refused ones)
 *  - LEVELS: XP needed to go from level L to L+1 = base + linear*(L-1) + quad*(L-1)^2 (strictly rising); maxLevel stops levelling
 *  - LEVEL_REWARD: given automatically once for every level reached (gold each level, ingredients every Nth level)
 */
export const XP = {
  produce: { bread: 5, croissant: 8, cake: 20, coffee: 4 },     // per finished unit
  sale: { bread: 3, croissant: 5, cake: 12, coffee: 3 },        // per unit sold (showcase or customer)
  upgrade: { base: 50, perLevel: 25 },                           // base + perLevel * (new upgrade level)
  quest: { default: 40, byId: { produceTen: 80 } },              // per quest reward collected
  research: { base: 40, perLevel: 20 },                          // base + perLevel * (new research level)
};
export const LEVELS = { base: 100, linear: 50, quad: 10, maxLevel: 30 };
export const LEVEL_REWARD = {
  gold: { base: 100, perLevel: 50 },                             // gold = base + perLevel * (level - 1)
  ingredientsEvery: 3, ingredients: { flour: 4, milk: 2, egg: 2 },   // also every 3rd level (3, 6, 9, ...)
};

/**
 * Town buildings. Conditions (TOWN_UNLOCKS) and rewards (TOWN_REWARDS) live in separate tables so each can be tuned alone.
 *  - starter buildings are always open and are the existing Bakery & Café and Market
 *  - `levels` = paid development steps of an opened building (cost + minimum player level each)
 *  - the Bookshop has no products or income yet: opening and developing it only unlocks progress, it never pays gold
 *  - `comingSoon` plots are shown but cannot be bought yet
 */
export const TOWN = [
  { id: 'bakery', name: 'Fırın & Kafe', icon: '🥐', starter: true, scene: 'interior', note: 'Üretim, müşteriler ve satış' },
  { id: 'market', name: 'Market', icon: '🛒', starter: true, scene: 'market', note: 'Malzeme alışverişi' },
  { id: 'bookshop', name: 'Kitapçı', icon: '📚', note: 'Araştırma merkezi: kalıcı bonuslar', levels: ['Raflar', 'Okuma Köşesi'] },
  { id: 'plot', name: 'Boş Arsa', icon: '🏗️', note: 'Yeni işletme yakında', comingSoon: true, hidden: true },   // hidden until the building exists
];
export const TOWN_UNLOCKS = {
  bookshop: { gold: 5000, minLevel: 3, levels: [{ gold: 3000, minLevel: 5 }, { gold: 8000, minLevel: 8 }] },
  plot: { gold: 25000, minLevel: 10 },
};
export const TOWN_REWARDS = {
  bookshop: { open: { xp: 150 }, levels: [{ xp: 100 }, { xp: 200 }] },
};

/**
 * Bookshop research centre: permanent bonuses bought with gold. Everything tunable lives here.
 *  - costs[i]  : price of level i+1;  values[i]: bonus fraction at level i (values[0] = 0, so values.length = costs.length + 1)
 *  - effect    : which system reads it (each effect belongs to exactly one research, and is applied in exactly one place):
 *      productionTime  -> Game.duration()        production time is shortened by this fraction
 *      ingredientCost  -> Game.startProduction() this fraction of the ingredients' gold value is refunded (recipes stay whole units)
 *      saleIncome      -> Game.saleIncome()      gold from every sale (showcase and customers) is increased by this fraction
 *      questXp         -> Progression.award()    XP from quest rewards is increased by this fraction
 *      upgradeCost     -> Game.nextCost()        café upgrade prices are reduced by this fraction
 *  - bookshopLevel: Bookshop development level (Town) needed before this research can be bought (0 = as soon as the Bookshop is open)
 */
export const RESEARCH = {
  bakingKnowledge: {
    name: 'Fırıncılık Bilgisi', icon: '📖', effect: 'productionTime', bookshopLevel: 0,
    costs: [1500, 3500, 7500, 15000, 30000], values: [0, 0.05, 0.10, 0.15, 0.20, 0.25],
    describe: (v) => (v ? `Üretim süresi %${Math.round(v * 100)} kısalır` : 'Bonus yok'),
  },
  efficientProduction: {
    name: 'Verimli Üretim', icon: '🧺', effect: 'ingredientCost', bookshopLevel: 0,
    costs: [1300, 2000, 2800, 3900, 5400], values: [0, 0.05, 0.10, 0.15, 0.20, 0.25],   // pays back in ~5 h of active production at each stage (see README)
    describe: (v) => (v ? `Malzeme maliyeti %${Math.round(v * 100)} azalır` : 'Bonus yok'),
  },
  masterSeller: {
    name: 'Usta Satıcı', icon: '🏷️', effect: 'saleIncome', bookshopLevel: 0,
    costs: [2300, 3400, 4700, 6500, 9000], values: [0, 0.05, 0.10, 0.15, 0.20, 0.25],   // pays back in ~5 h of active production at each stage (see README)
    describe: (v) => (v ? `Satış geliri %${Math.round(v * 100)} artar` : 'Bonus yok'),
  },
  townCulture: {
    name: 'Kasaba Kültürü', icon: '🎭', effect: 'questXp', bookshopLevel: 1,
    costs: [1800, 4500, 9000, 18000, 36000], values: [0, 0.10, 0.20, 0.30, 0.40, 0.50],
    describe: (v) => (v ? `Görev XP'si %${Math.round(v * 100)} artar` : 'Bonus yok'),
  },
  masterEquipment: {
    name: 'Usta Ekipmanları', icon: '🛠️', effect: 'upgradeCost', bookshopLevel: 2,
    costs: [2500, 6000, 12000, 24000, 48000], values: [0, 0.05, 0.10, 0.15, 0.20, 0.25],
    describe: (v) => (v ? `Fırın & Kafe geliştirmeleri %${Math.round(v * 100)} ucuzlar` : 'Bonus yok'),
  },
};

/**
 * Exploration regions (Keşif). Balance: longer trips pay more per minute (gold ~70 -> ~120 -> ~150 per min, XP ~18 -> ~24 -> ~30 per min),
 * so the 1-minute trip is the quick top-up and the 15-minute trip the best use of time away. Everything here is tunable; rewards are rolled once when an exploration STARTS and stored with it.
 *  - minLevel : player level needed;  after: { region, times } optional progress condition (finish that region N times)
 *  - duration : seconds (wall clock, also runs while the game is closed)
 *  - rewards  : gold / xp are [min, max] ranges; ingredients are drops { id, amount: [min, max], chance }; gems is one optional rare drop
 *  - map      : position of the region's marker on the map (design coordinates, left half of the screen)
 */
export const EXPLORE = [
  {
    id: 'meadow', name: 'Yeşil Çayırlar', icon: '🌿', map: { x: 268, y: 494 },
    desc: 'Çiçekli, sakin otlaklar. Kısa bir yürüyüşle malzeme toplanır.',
    minLevel: 1, duration: 60,
    rewards: { gold: [50, 90], xp: [14, 22], ingredients: [{ id: 'flour', amount: [2, 4], chance: 1 }, { id: 'egg', amount: [1, 3], chance: 0.5 }] },
  },
  {
    id: 'forest', name: 'Orman Yolu', icon: '🌲', map: { x: 536, y: 228 },
    desc: 'Gölgeli patikalar; mantar, süt ve tatlı bulmak için iyi bir yer.',
    minLevel: 4, after: { region: 'meadow', times: 1 }, duration: 300,
    rewards: { gold: [450, 750], xp: [100, 140], ingredients: [{ id: 'milk', amount: [2, 4], chance: 1 }, { id: 'sugar', amount: [2, 4], chance: 0.7 }, { id: 'butter', amount: [1, 2], chance: 0.4 }] },
  },
  {
    id: 'ruins', name: 'Eski Harabeler', icon: '🏛️', map: { x: 590, y: 440 },
    desc: 'Unutulmuş taş kalıntılar. Tehlikeli ama nadir hazineler saklar.',
    minLevel: 8, after: { region: 'forest', times: 1 }, duration: 900,
    rewards: { gold: [1800, 2700], xp: [400, 500], ingredients: [{ id: 'butter', amount: [3, 6], chance: 1 }, { id: 'beans', amount: [3, 6], chance: 0.8 }], gems: { amount: [2, 5], chance: 0.4 } },
  },
];
