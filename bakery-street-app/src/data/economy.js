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

/**
 * Recipes the player buys in the shop (see SHOP_ITEMS, category 'recipes'). They join the products above when the Shop attaches to the game
 * (Shop constructor) and can neither be made nor ordered by guests until bought. Price, ingredient cost and time are separate per product.
 * The design makes the choice real: net gold per SECOND stays close to the old products (0.8 - 1.05, so quick recipes win when the player sells from the
 * showcase), while net gold per GUEST rises with the tier (24 -> 68; bread 14, cake 60), which pays when guests are the limit (more tables, decoration).
 */
export const RECIPES = {
  simit: { name: 'Simit', icon: '🥯', station: 'oven', time: 25, ingredients: { flour: 2, sugar: 1 }, price: 46, start: 0 },                        // cost 22, net 24: quick, the best gold per second of the oven line
  latte: { name: 'Latte', icon: '🧋', station: 'coffee', time: 22, ingredients: { beans: 1, milk: 2 }, price: 46, start: 0 },                     // cost 24, net 22
  kurabiye: { name: 'Kurabiye', icon: '🍪', station: 'oven', time: 45, ingredients: { flour: 2, butter: 1, sugar: 1, egg: 1 }, price: 78, start: 0 },   // cost 42, net 36: butter-heavy
  mocha: { name: 'Mocha', icon: '🍫', station: 'coffee', time: 30, ingredients: { beans: 1, milk: 1, sugar: 2 }, price: 58, start: 0 },            // cost 29, net 29
  muffin: { name: 'Muffin', icon: '🧁', station: 'oven', time: 55, ingredients: { flour: 2, sugar: 2, egg: 1, milk: 1 }, price: 90, start: 0 },   // cost 40, net 50
  waffle: { name: 'Waffle', icon: '🧇', station: 'oven', time: 80, ingredients: { flour: 2, egg: 2, milk: 1, butter: 1, sugar: 1 }, price: 122, start: 0 },   // cost 54, net 68 over 80 s: the most per guest, the least per second of the oven line's new recipes
};

/** Ingredient storage (only enforced once the Shop is attached): units of each ingredient that can be bought and kept. Rewards are never refused. */
export const STORAGE = { base: 60 };

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
  orderWeights: { bread: 4, croissant: 3, cake: 2, coffee: 4, simit: 3, latte: 3, kurabiye: 2, mocha: 2, muffin: 2, waffle: 1 },   // how likely each product is ordered (recipes not bought yet are never ordered)
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
    name: 'Kafe masaları', icon: '🪑', costs: [1800, 6500], values: [2, 3, 4], minLevels: [2, 4],   // minLevels[i]: player level needed for level i+1 (enforced once progression exists)
    describe: (v) => `Kafede ${v} masa var, müşteri sayısı masalarla artar`,
  },
};

/**
 * Quests. `stat` names a lifetime counter kept by the game (see Game.stats); the quest is complete when it reaches `target`.
 * Rewards may contain gold and/or ingredients (added to the same shared gold and inventory the rest of the game uses).
 *   stats: produced.<product>, sold.<product>, producedTotal, soldTotal, marketPurchases, upgradesBought, goldSpent, shopBought
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
  { id: 'firstShop', name: 'Kafeni süsle', icon: '🪴', condition: "Mağaza'dan bir eşya satın al", stat: 'shopBought', target: 1, reward: { gold: 200, ingredients: { sugar: 4 } } },
  { id: 'shopFive', name: 'Gelişen kafe', icon: '🏠', condition: "Mağaza'dan 5 eşya satın al", stat: 'shopBought', target: 5, reward: { gold: 700, ingredients: { butter: 3, egg: 4 } } },
  { id: 'spendBig', name: 'Büyük yatırım', icon: '💰', condition: 'Toplam 5.000 altın harca', stat: 'goldSpent', target: 5000, reward: { gold: 800, ingredients: { beans: 4 } } },
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
  produce: { bread: 5, croissant: 8, cake: 20, coffee: 4, simit: 6, latte: 5, kurabiye: 14, mocha: 8, muffin: 22, waffle: 28 },     // per finished unit
  sale: { bread: 3, croissant: 5, cake: 12, coffee: 3, simit: 4, latte: 4, kurabiye: 9, mocha: 6, muffin: 13, waffle: 16 },        // per unit sold (showcase or customer)
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
/**
 * Limits on free, repeatable gold. A trip's gold counts towards a daily budget; once the budget is used the rest of the trip's gold pays
 * only `overRate` of its value (XP, ingredients and gems are unaffected). Resets with the (local) calendar day, never goes back when the clock does.
 */
export const EXPLORE_LIMIT = { dailyGold: 4000, overRate: 0.2 };

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

// ======================================================================================================================================
// SHOP (Mağaza): everything the player buys with gold besides ingredients, upgrades, town buildings and research. Prices, level gates and
// effects live ONLY here (src/game/shop.js applies them, the UI only shows them).
// ======================================================================================================================================

export const SHOP_CATEGORIES = [
  { id: 'ingredients', name: 'Malzeme', icon: '🛒' },
  { id: 'equipment', name: 'Ekipman', icon: '🔥' },
  { id: 'decor', name: 'Dekorasyon', icon: '🪴' },
  { id: 'recipes', name: 'Tarifler', icon: '📖' },
  { id: 'expansion', name: 'Genişletme', icon: '🏠' },
  { id: 'special', name: 'Özel', icon: '⭐' },
];

/**
 * How decoration turns into game effects. Every placed decoration adds its `appeal` points (shown in the shop); the sum
 *   - shortens the gap between arriving guests by arrivalPerPoint per point (at most arrivalMax),
 *   - gives every paying guest a tipChance (tipPerPoint per point, at most tipMax) of leaving a tip of tipShare of the bill.
 */
export const APPEAL = { arrivalPerPoint: 0.012, arrivalMax: 0.35, tipPerPoint: 0.008, tipMax: 0.25, tipShare: 0.2 };

/**
 * Cafe stages. A stage is reached when ALL of its `need` conditions hold (checked after every change; the reward is paid once). Conditions:
 *   level (player level), spent (lifetime gold spent), sold (products sold), equipment (better equipment tiers owned), items (shop items owned),
 *   upgrades (café upgrades bought), tables (open tables), recipes (shop recipes owned), research (research levels bought).
 * Shop items with `stage: n` stay locked until that stage.
 */
export const STAGES = [
  { id: 1, name: 'Küçük Kafe', note: 'Temel fırın, birkaç masa, sınırlı tarifler.' },
  { id: 2, name: 'Gelişen Kafe', note: 'Daha iyi ekipman, yeni masalar, daha çok müşteri.', need: { level: 4, spent: 4000, sold: 25, equipment: 1, recipes: 1, items: 3, upgrades: 2 }, reward: { gold: 1500, xp: 150 } },
  { id: 3, name: 'Popüler Kafe', note: 'Geniş ürün yelpazesi, güzel dekor, yüksek müşteri kapasitesi.', need: { level: 8, spent: 25000, sold: 150, equipment: 4, items: 10, tables: 3, recipes: 3 }, reward: { gold: 6000, xp: 400 } },
  { id: 4, name: 'Ünlü Kedi Kafesi', note: 'Premium ekipman, özel tarifler, nadir ziyaretçiler.', need: { level: 13, spent: 90000, sold: 600, equipment: 9, items: 22, tables: 4, recipes: 5, research: 4 }, reward: { gold: 25000, xp: 1200 } },
];

/**
 * Shop items.
 *  - kind 'equipment' (line + tier): the highest owned tier of a line is the one in force, so a tier replaces the one below it (never stacks with it)
 *  - kind 'decor'  (type, group, appeal): drawn in a slot of its type (DECOR_SLOT_TYPES) once placed; a bought piece goes into a free slot, the player can move or store it; a piece that is not placed gives no appeal
 *  - kind 'recipe' (recipe): unlocks a product from RECIPES
 *  - kind 'area' (effect.area): opens a decoration area (a section of the café that gets its own floor / wall panel); the decoration of that area requires it
 *  - kind 'upgrade' (upgrade + level): the café upgrade of that name, sold here too (the price comes from UPGRADES, one list)
 *  - kind 'special': guests and themes
 *  - effect: speed{station: fraction}, capacity{station: +jobs}, showcase +units, storage (units of each ingredient), refund fraction, queue +waiting places, vip{chance, mult}, tableTop, theme
 *  - requires: [{ item }] owned item, [{ upgrade, level }] café upgrade level
 *  - art.image: the picture name in assets/interior (preview and scene)
 */
const T = (id, line, tier, name, price, minLevel, effect, extra = {}) => ({ id, category: 'equipment', kind: 'equipment', line, tier, name, price, minLevel, effect, requires: tier > 2 ? [{ item: `${line}T${tier - 1}` }] : [], art: { image: line === 'counter' ? 'counter' : line }, ...extra });
export const SHOP_ITEMS = [
  // ---- equipment: oven (speed), coffee machine (capacity + speed), prep counter (ingredient refund), showcase (capacity), storage (ingredient capacity)
  T('ovenT2', 'oven', 2, 'Taş Fırın Pro', 3200, 3, { speed: { oven: 0.08 } }, { desc: 'Pirinç kaplamalı, daha iyi ısı tutan fırın.' }),
  T('ovenT3', 'oven', 3, 'Altın Fırın', 12000, 7, { speed: { oven: 0.16 } }, { desc: 'Altın kaplama kapı, çok hızlı pişirme.', stage: 2 }),
  T('ovenT4', 'oven', 4, 'Usta Taş Fırın', 40000, 12, { speed: { oven: 0.25 } }, { desc: 'Ünlü fırıncıların fırını.', stage: 3 }),
  T('coffeeT2', 'coffee', 2, 'Barista Kahve Makinesi', 3800, 3, { capacity: { coffee: 1 }, speed: { coffee: 0.05 } }, { desc: 'İki kahve aynı anda hazırlanır.' }),
  T('coffeeT3', 'coffee', 3, 'Espresso Pro', 14000, 7, { capacity: { coffee: 2 }, speed: { coffee: 0.12 } }, { desc: 'Üç kahve aynı anda, daha hızlı.', stage: 2 }),
  T('coffeeT4', 'coffee', 4, 'Kristal Espresso Bar', 44000, 13, { capacity: { coffee: 3 }, speed: { coffee: 0.2 } }, { desc: 'Dört kahve aynı anda.', stage: 3 }),
  T('counterT2', 'counter', 2, 'Mermer Hamur Tezgâhı', 2400, 2, { refund: 0.05 }, { desc: 'Hamur israfı azalır: malzemenin bir kısmı geri döner.' }),
  T('counterT3', 'counter', 3, 'Usta Hamur Tezgâhı', 9500, 6, { refund: 0.1 }, { desc: 'Her üretimde daha çok malzeme tasarrufu.', stage: 2 }),
  T('counterT4', 'counter', 4, 'Şef Tezgâhı', 30000, 12, { refund: 0.15 }, { desc: 'Neredeyse hiç israf yok.', stage: 3 }),
  T('showcaseT2', 'showcase', 2, 'Cam Pasta Vitrini', 2000, 2, { showcase: 10 }, { desc: 'Vitrine her üründen 10 adet daha sığar.' }),
  T('showcaseT3', 'showcase', 3, 'Panoramik Vitrin', 8000, 5, { showcase: 25 }, { desc: 'Geniş camlı vitrin: +25 adet.', stage: 2 }),
  T('showcaseT4', 'showcase', 4, 'Kristal Vitrin', 26000, 11, { showcase: 50 }, { desc: 'Her üründen 50 adet daha.', stage: 3 }),
  T('storageT2', 'storage', 2, 'Geniş Depo Rafları', 1800, 2, { storage: 120 }, { desc: 'Her malzemeden 120 adet saklanır.' }),
  T('storageT3', 'storage', 3, 'Soğuk Depo', 7000, 5, { storage: 250 }, { desc: 'Her malzemeden 250 adet.', stage: 2 }),
  T('storageT4', 'storage', 4, 'Büyük Ambar', 22000, 10, { storage: 500 }, { desc: 'Her malzemeden 500 adet.', stage: 3 }),

  // ---- furniture and decoration (each placed piece adds appeal points)
  { id: 'matPaw', category: 'decor', kind: 'decor', name: 'Pati Paspası', desc: 'Girişte misafirleri karşılar.', price: 350, minLevel: 1, type: 'mat', group: 'Halı & Paspas', appeal: 1, art: { image: 'mat-paw' } },
  { id: 'plantA', category: 'decor', kind: 'decor', name: 'Çiçekli Saksı', desc: 'Servis alanının soluna taze bir köşe.', price: 450, minLevel: 1, type: 'plant', group: 'Bitki & Çiçek', appeal: 2, art: { image: 'plant-1' } },
  { id: 'rugAisle', category: 'decor', kind: 'decor', name: 'Koridor Halısı', desc: 'Masaların arasındaki yolu yumuşatır.', price: 700, minLevel: 2, type: 'rug', group: 'Halı & Paspas', appeal: 2, requires: [{ item: 'areaAisle' }], art: { image: 'rug-green' } },
  { id: 'shelfPlants', category: 'decor', kind: 'decor', name: 'Raflı Bitki', desc: 'Duvara asılan küçük bir bitki rafı.', price: 1100, minLevel: 3, type: 'shelf', group: 'Raf & Duvar', appeal: 3, requires: [{ item: 'areaWall' }], art: { image: 'shelf-plants' } },
  { id: 'plantB', category: 'decor', kind: 'decor', name: 'Pembe Çiçekli Saksı', desc: 'Sağ köşeye renk katar.', price: 900, minLevel: 4, type: 'plant', group: 'Bitki & Çiçek', appeal: 3, art: { image: 'plant-2' } },
  { id: 'lampA', category: 'decor', kind: 'decor', name: 'Bakır Sarkıt Lamba', desc: 'Koridora sıcak bir ışık havuzu.', price: 1200, minLevel: 4, type: 'lamp', group: 'Aydınlatma', appeal: 4, requires: [{ item: 'areaAisle' }], art: { image: 'lamp' } },
  { id: 'shelfBread', category: 'decor', kind: 'decor', name: 'Ekmek Rafı', desc: 'Sepetler ve taze ekmekler.', price: 1800, minLevel: 5, type: 'shelf', group: 'Raf & Duvar', appeal: 3, requires: [{ item: 'areaWall' }], art: { image: 'shelf' } },
  { id: 'tableCake', category: 'decor', kind: 'decor', name: 'Pastalı Masa Takımı', desc: 'Boş masalar çilekli pasta ile süslenir. (Masa süsü: tek seferde biri yerleştirilir.)', price: 2200, minLevel: 5, type: 'tabletop', group: 'Masa & Sandalye', appeal: 4, effect: { tableTop: 'cake' }, art: { image: 'table-cake' } },
  { id: 'tableCup', category: 'decor', kind: 'decor', name: 'Fincanlı Masa Takımı', desc: 'Boş masalarda buğulu kahve fincanı. (Masa süsü: tek seferde biri yerleştirilir.)', price: 2200, minLevel: 5, type: 'tabletop', group: 'Masa & Sandalye', appeal: 4, effect: { tableTop: 'cup' }, art: { image: 'table-cup' } },
  { id: 'rugRunner', category: 'decor', kind: 'decor', name: 'Kırmızı Yolluk', desc: 'Koridora ikinci bir halı.', price: 1600, minLevel: 6, type: 'rug', group: 'Halı & Paspas', appeal: 3, requires: [{ item: 'areaAisle' }], art: { image: 'rug-runner' } },
  { id: 'plantC', category: 'decor', kind: 'decor', name: 'Sarkık Bitki', desc: 'Koridorun başında sarmaşıklı saksı.', price: 1500, minLevel: 6, type: 'plant', group: 'Bitki & Çiçek', appeal: 3, requires: [{ item: 'areaAisle' }], art: { image: 'plant-3' } },
  { id: 'lampB', category: 'decor', kind: 'decor', name: 'İkinci Bakır Lamba', desc: 'Koridorun sonuna ikinci lamba.', price: 2400, minLevel: 8, type: 'lamp', group: 'Aydınlatma', appeal: 4, requires: [{ item: 'lampA' }], art: { image: 'lamp' } },
  { id: 'tablePlain', category: 'decor', kind: 'decor', name: 'Sade Masa Takımı', desc: 'Vazosuz, sade ahşap masalar. (Masa süsü: tek seferde biri yerleştirilir.)', price: 500, minLevel: 2, type: 'tabletop', group: 'Masa & Sandalye', appeal: 1, effect: { tableTop: 'plain' }, art: { image: 'table-plain' } },
  { id: 'rackPots', category: 'decor', kind: 'decor', name: 'Bakır Tencere Askısı', desc: 'Duvara asılan bakır tencereler ve kepçeler. (Duvar rafı: iki raf yeri var, hangisini asacağını sen seç.)', price: 1400, minLevel: 4, type: 'shelf', group: 'Raf & Duvar', appeal: 3, requires: [{ item: 'areaWall' }], art: { image: 'rack' } },

  // ---- recipes
  { id: 'recipeSimit', category: 'recipes', kind: 'recipe', recipe: 'simit', name: 'Simit Tarifi', desc: 'Susamlı, çıtır halka ekmek.', price: 600, minLevel: 1, art: { icon: 'simit' } },
  { id: 'recipeLatte', category: 'recipes', kind: 'recipe', recipe: 'latte', name: 'Latte Tarifi', desc: 'Sütlü, kremsi kahve.', price: 900, minLevel: 3, art: { icon: 'latte' } },
  { id: 'recipeKurabiye', category: 'recipes', kind: 'recipe', recipe: 'kurabiye', name: 'Kurabiye Tarifi', desc: 'Tereyağlı kurabiye.', price: 1500, minLevel: 4, requires: [{ item: 'recipeSimit' }], art: { icon: 'kurabiye' } },
  { id: 'recipeMocha', category: 'recipes', kind: 'recipe', recipe: 'mocha', name: 'Mocha Tarifi', desc: 'Çikolatalı kahve.', price: 2400, minLevel: 6, requires: [{ item: 'recipeLatte' }], art: { icon: 'mocha' } },
  { id: 'recipeMuffin', category: 'recipes', kind: 'recipe', recipe: 'muffin', name: 'Muffin Tarifi', desc: 'Yumuşacık minik kek.', price: 3200, minLevel: 7, requires: [{ item: 'recipeKurabiye' }], art: { icon: 'muffin' } },
  { id: 'recipeWaffle', category: 'recipes', kind: 'recipe', recipe: 'waffle', name: 'Waffle Tarifi', desc: 'Kafenin en gösterişli tatlısı.', price: 6500, minLevel: 10, stage: 3, requires: [{ item: 'recipeMuffin' }], art: { icon: 'waffle' } },

  // ---- café expansion: tables are the existing café upgrade (price from UPGRADES); the waiting area and the decoration areas are new
  { id: 'areaAisle', category: 'expansion', kind: 'area', name: 'Koridor Dekor Alanı', desc: 'Masaların arasındaki koridor düzenlenir (cilalı zemin): halılar, lambalar ve bitki yerleştirilebilir.', price: 1500, minLevel: 2, effect: { area: 'aisle' }, art: { image: 'rug-green' } },
  { id: 'areaWall', category: 'expansion', kind: 'area', name: 'Duvar Dekor Alanı', desc: 'Sağ duvara ahşap bir pano çakılır: raflar yerleştirilebilir.', price: 1200, minLevel: 3, effect: { area: 'wall' }, art: { image: 'shelf' } },
  { id: 'table3', category: 'expansion', kind: 'upgrade', upgrade: 'cafeTables', level: 1, name: '3. Masa Takımı', desc: 'Aynı anda bir misafir daha oturur; müşteri akışı hızlanır.', art: { image: 'table' } },
  { id: 'table4', category: 'expansion', kind: 'upgrade', upgrade: 'cafeTables', level: 2, name: '4. Masa Takımı', desc: 'Salon tamamen dolar.', art: { image: 'table' } },
  { id: 'waitingA', category: 'expansion', kind: 'equipment', line: 'waiting', tier: 2, name: 'Bekleme Köşesi', desc: 'Vitrinin önünde bir misafir daha bekleyebilir. Halat ve direkler eklenir.', price: 2500, minLevel: 3, effect: { queue: 1 }, art: { image: 'rug-runner' } },
  { id: 'waitingB', category: 'expansion', kind: 'equipment', line: 'waiting', tier: 3, name: 'Geniş Bekleme Alanı', desc: 'İki misafir daha bekleyebilir.', price: 9000, minLevel: 8, stage: 2, effect: { queue: 2 }, requires: [{ item: 'waitingA' }], art: { image: 'rug-runner' } },

  // ---- special content: VIP guests and themes
  { id: 'vip1', category: 'special', kind: 'special', name: 'VIP Misafirler', desc: 'Bazı misafirler VIP gelir: altın taçlı, daha çok öder.', price: 9000, minLevel: 8, stage: 3, effect: { vip: { chance: 0.1, mult: 1.6 } }, line: 'vip', tier: 2, art: { icon: 'vip' } },
  { id: 'vip2', category: 'special', kind: 'special', name: 'Ünlü Ziyaretçiler', desc: 'VIP misafir sıklığı ve ödemesi artar.', price: 30000, minLevel: 13, stage: 4, effect: { vip: { chance: 0.2, mult: 2 } }, line: 'vip', tier: 3, requires: [{ item: 'vip1' }], art: { icon: 'vip' } },
  { id: 'themeSpring', category: 'special', kind: 'decor', name: 'Bahar Teması', desc: 'Pembe çiçek yaprakları süzülür. (Tema: tek seferde biri yerleştirilir.)', price: 5000, minLevel: 6, stage: 2, type: 'theme', appeal: 5, effect: { theme: 'spring' }, art: { icon: 'spring' } },
  { id: 'themeCozy', category: 'special', kind: 'decor', name: 'Kış Köşesi Teması', desc: 'Sıcak ışık ve kar taneleri. (Tema: tek seferde biri yerleştirilir.)', price: 5000, minLevel: 6, stage: 2, type: 'theme', appeal: 5, effect: { theme: 'cozy' }, art: { icon: 'cozy' } },
];

/**
 * The picture of each equipment tier: assets/game/interior/<name>.webp (registered as 'int-<name>'), same size and ground line as the plain
 * picture of the station. Tier 1 is the plain picture. A tier whose file does not exist yet is NOT replaced by anything invented: the station keeps
 * its current picture (or the best lower tier that exists) with a small level badge, and the file is listed as missing (docs/EKSIK_ASSETLER.md,
 * `node scripts/list-missing-art.mjs`). Drop the file in and run `node scripts/gen-assets.mjs`: it is used from then on, nothing else to change.
 */
export const EQUIPMENT_ART = {
  oven: { 2: 'oven-t2', 3: 'oven-t3', 4: 'oven-t4' },
  coffee: { 2: 'coffee-t2', 3: 'coffee-t3', 4: 'coffee-t4' },
  showcase: { 2: 'showcase-t2', 3: 'showcase-t3', 4: 'showcase-t4' },
  storage: { 2: 'storage-t2', 3: 'storage-t3', 4: 'storage-t4' },
  counter: { 2: 'counter-t2', 3: 'counter-t3', 4: 'counter-t4' },
};

/**
 * Decoration slots: where a piece can stand (positions are in scene/interior-layout.js DECOR_SLOTS under the same id). A decoration has a
 * `type`; it can be placed in any slot of its type, and the player moves pieces between them (Shop.place). 'tableTop' and 'theme' hold one piece
 * for the whole café.
 */
export const DECOR_SLOT_TYPES = {
  'doormat': { type: 'mat', label: 'Giriş' },
  'rug-aisle': { type: 'rug', label: 'Koridor ortası' },
  'rug-aisle-2': { type: 'rug', label: 'Koridor başı' },
  'edge-left': { type: 'plant', label: 'Sol köşe' },
  'edge-right': { type: 'plant', label: 'Sağ köşe' },
  'aisle-top': { type: 'plant', label: 'Koridor girişi' },
  'lamp-1': { type: 'lamp', label: 'Üst lamba' },
  'lamp-2': { type: 'lamp', label: 'Alt lamba' },
  'wall-r1': { type: 'shelf', label: 'Üst raf yeri' },
  'wall-r2': { type: 'shelf', label: 'Alt raf yeri' },
  'tableTop': { type: 'tabletop', label: 'Tüm masalar' },
  'theme': { type: 'theme', label: 'Tüm kafe' },
};
export const SHARED_SLOTS = ['tableTop', 'theme'];
