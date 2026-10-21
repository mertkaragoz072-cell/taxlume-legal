import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/game.js';
import { Cafe } from '../src/game/customers.js';
import { Quests } from '../src/game/quests.js';
import { Progression } from '../src/game/progression.js';
import { Town } from '../src/game/town.js';
import { Research, validateResearch } from '../src/game/research.js';
import { SaveManager, SAVE_KEY, SAVE_VERSION } from '../src/game/save.js';
import { RESEARCH, PRODUCTS, UPGRADES, INGREDIENTS, XP } from '../src/data/economy.js';

class FakeStorage {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}
const T0 = 1_700_000_000_000;
/** opened: Bookshop already open; shopLevel: its development level. */
function make({ gold = 1_000_000, opened = true, shopLevel = 0, cfg } = {}) {
  const clock = { now: T0 }, player = { gold, gems: 0 };
  const game = new Game(player, {}, () => clock.now);
  const quests = new Quests(game);
  const prog = new Progression(game);
  const town = new Town(game);
  const research = new Research(game, cfg);
  const cafe = new Cafe(game, { rng: () => 0.5, config: { tables: 3, queueMax: 3, firstSpawnSec: 999, spawnEverySec: [999, 999], queuePatienceSec: 999, orderPatienceSec: 999, maxStepSec: 2, history: 20, orderWeights: { bread: 1, croissant: 0, cake: 0, coffee: 0 } } });
  cafe.setActive(true);
  prog.level = 30; prog.xp = 0; prog.rewardedLevel = 30;       // keep XP from triggering level-ups in these tests
  if (opened) { town.opened.add('bookshop'); town.levels.bookshop = shopLevel; }
  for (const k of Object.keys(game.ingredients)) game.ingredients[k] = 500;
  game.upgrades.showcaseCapacity = 5;
  return { game, player, prog, town, research, quests, cafe, clock };
}
const R = RESEARCH;

test('five researches exist, each with at least 5 levels, rising costs and rising bonuses', () => {
  assert.deepEqual(Object.keys(R), ['bakingKnowledge', 'efficientProduction', 'masterSeller', 'townCulture', 'masterEquipment']);
  for (const [id, d] of Object.entries(R)) {
    assert.ok(d.costs.length >= 5, id);
    assert.equal(d.values.length, d.costs.length + 1, id);
    assert.equal(d.values[0], 0, id);
    for (let i = 1; i < d.costs.length; i++) assert.ok(d.costs[i] > d.costs[i - 1], `${id} cost ${i}`);
    for (let i = 1; i < d.values.length; i++) assert.ok(d.values[i] > d.values[i - 1], `${id} bonus ${i}`);
  }
});

test('purchase: gold drops once, level rises, effect only afterwards', () => {
  const { research, player, game } = make({ gold: 5000 });
  assert.equal(game.bonus('productionTime'), 0);
  const r = research.buy('bakingKnowledge', 0);
  assert.ok(r.ok);
  assert.equal(player.gold, 5000 - R.bakingKnowledge.costs[0]);
  assert.equal(research.level('bakingKnowledge'), 1);
  assert.equal(game.bonus('productionTime'), R.bakingKnowledge.values[1]);
  assert.equal(game.stats.researchBought, 1);
});

test('too little gold blocks the purchase: nothing is spent and no bonus appears', () => {
  const { research, player, game } = make({ gold: R.masterSeller.costs[0] - 1 });
  const r = research.buy('masterSeller', 0);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'gold');
  assert.equal(player.gold, R.masterSeller.costs[0] - 1);
  assert.equal(game.bonus('saleIncome'), 0);
  assert.equal(research.level('masterSeller'), 0);
});

test('a replayed tap cannot buy a second level; max level cannot be bought again', () => {
  const { research, player } = make();
  assert.ok(research.buy('masterSeller', 0).ok);
  const g = player.gold;
  assert.equal(research.buy('masterSeller', 0).reason, 'stale');
  assert.equal(player.gold, g);
  for (let i = 1; i < 5; i++) assert.ok(research.buy('masterSeller', i).ok);
  assert.equal(research.level('masterSeller'), 5);
  const g2 = player.gold;
  assert.equal(research.buy('masterSeller').reason, 'max');
  assert.equal(player.gold, g2);
  assert.equal(research.nextCost('masterSeller'), null);
});

test('closed Bookshop: nothing can be bought', () => {
  const { research, player } = make({ opened: false });
  const r = research.buy('bakingKnowledge', 0);
  assert.equal(r.reason, 'closed');
  assert.equal(player.gold, 1_000_000);
  assert.equal(research.status('masterSeller'), 'closed');
});

test('Kasaba Kültürü and Usta Ekipmanları need Bookshop development levels', () => {
  const a = make({ shopLevel: 0 });
  assert.equal(a.research.buy('townCulture', 0).reason, 'locked');
  assert.equal(a.research.buy('masterEquipment', 0).reason, 'locked');
  const b = make({ shopLevel: 1 });
  assert.ok(b.research.buy('townCulture', 0).ok);
  assert.equal(b.research.buy('masterEquipment', 0).reason, 'locked');
  const c = make({ shopLevel: 2 });
  assert.ok(c.research.buy('masterEquipment', 0).ok);
});

test('Fırıncılık Bilgisi really shortens production time (and jobs finish in the shortened time)', () => {
  const { game, research, clock } = make();
  game.products.bread = 0;
  const base = game.duration('bread');
  assert.equal(base, PRODUCTS.bread.time);
  research.levels.bakingKnowledge = 5;
  const d = game.duration('bread');
  assert.equal(d, Math.round(PRODUCTS.bread.time * (1 - R.bakingKnowledge.values[5]) * 10) / 10);
  assert.ok(game.startProduction('bread').ok);
  clock.now += (d - 0.5) * 1000; game.tick();
  assert.equal(game.products.bread, 0);
  clock.now += 1000; game.tick();
  assert.equal(game.products.bread, 1);
});

test('production time bonus stacks with the café speed upgrade without double counting', () => {
  const { game, research } = make();
  game.upgrades.productionSpeed = 5;                       // x0.5
  research.levels.bakingKnowledge = 5;                     // -25%
  assert.equal(game.duration('cake'), Math.round(PRODUCTS.cake.time * 0.5 * 0.75 * 10) / 10);
});

test('Verimli Üretim refunds a share of the ingredient value, once per production start', () => {
  const { game, research, player } = make();
  game.upgrades.ovenCapacity = 3;
  const value = Object.entries(PRODUCTS.cake.ingredients).reduce((s, [i, n]) => s + n * INGREDIENTS[i].price, 0);
  game.ingredients.flour = 500;
  const g0 = player.gold;
  assert.ok(game.startProduction('cake').ok);
  assert.equal(player.gold, g0);                           // no research: no refund
  research.levels.efficientProduction = 3;
  const g1 = player.gold, flour = game.ingredients.flour;
  const r = game.startProduction('cake');
  assert.ok(r.ok);
  const refund = Math.ceil(value * R.efficientProduction.values[3]);
  assert.equal(r.rebate, refund);
  assert.equal(player.gold, g1 + refund);
  assert.equal(game.ingredients.flour, flour - PRODUCTS.cake.ingredients.flour);   // recipes stay whole units
  assert.ok(refund < value);
});

test('a refused production start gives no refund', () => {
  const { game, research, player } = make();
  research.levels.efficientProduction = 5;
  game.ingredients.flour = 0;
  const g = player.gold;
  assert.equal(game.startProduction('bread').ok, false);
  assert.equal(player.gold, g);
});

test('Usta Satıcı raises showcase income', () => {
  const { game, research, player } = make();
  game.products.bread = 4;
  game.sellProduct('bread', 1);
  assert.equal(player.gold, 1_000_000 + game.showcaseIncome('bread'));
  research.levels.masterSeller = 5;
  const g = player.gold;
  const r = game.sellProduct('bread', 2);
  const cost = game.ingredientCost('bread'), price = PRODUCTS.bread.price;
  const unit = Math.round((cost + Math.round((price - cost) * game.sales.showcaseNetShare)) * (1 + R.masterSeller.values[5]));
  assert.equal(r.income, unit * 2);
  assert.equal(player.gold, g + unit * 2);
});

test('customer delivery pays the bonus income (manual order)', () => {
  const { game, research, cafe, player } = make();
  research.levels.masterSeller = 3;
  const c = { id: 1, state: 'waiting', table: 0, orderId: 1, product: 'bread' };
  cafe.customers.push(c);
  cafe.orders.push({ id: 1, product: 'bread', price: PRODUCTS.bread.price, status: 'open', customerId: 1 });
  game.products.bread = 2;
  const g = player.gold;
  const r = cafe.deliver(1);
  assert.ok(r.ok, r.message);
  const expected = Math.round(PRODUCTS.bread.price * (1 + R.masterSeller.values[3]));
  assert.equal(r.income, expected);
  assert.equal(player.gold, g + expected);
  assert.equal(cafe.deliver(1).ok, false);
  assert.equal(player.gold, g + expected);
});

test('Kasaba Kültürü raises XP from quest rewards only', () => {
  const { game, research, prog, quests } = make({ shopLevel: 1 });
  prog.level = 1; prog.rewardedLevel = 1; prog.xp = 0;
  game.stats.soldTotal = 1;
  research.levels.townCulture = 5;
  const q = quests.claim('firstSale');
  assert.ok(q.ok);
  assert.equal(prog.xp, Math.round(XP.quest.default * (1 + R.townCulture.values[5])));
  const before = prog.xp;
  prog.award('produce', 'bread');
  assert.equal(prog.xp - before, XP.produce.bread);        // other XP sources are unchanged
});

test('Usta Ekipmanları lowers café upgrade prices, and the discounted price is what is charged', () => {
  const { game, research, player } = make({ gold: 100_000 });
  const base = UPGRADES.ovenCapacity.costs[0];
  assert.equal(game.nextCost('ovenCapacity'), base);
  research.levels.masterEquipment = 4;
  const cost = Math.round(base * (1 - R.masterEquipment.values[4]));
  assert.equal(game.nextCost('ovenCapacity'), cost);
  const r = game.buyUpgrade('ovenCapacity', 0);
  assert.ok(r.ok);
  assert.equal(r.cost, cost);
  assert.equal(player.gold, 100_000 - cost);
  const poor = make({ gold: cost - 1 });
  poor.research.levels.masterEquipment = 4;
  assert.equal(poor.game.buyUpgrade('ovenCapacity', 0).ok, poor.player.gold >= cost);
});

test('research does not change Market prices or the Bookshop development cost', () => {
  const { game, research, town } = make({ gold: 1_000_000, shopLevel: 0 });
  for (const id of Object.keys(R)) research.levels[id] = 5;
  const gold = game.player.gold;
  assert.ok(game.purchase('flour', 5).ok);
  assert.equal(game.player.gold, gold - INGREDIENTS.flour.price * 5);
  assert.equal(town.need(town.unlocks.bookshop.levels[0]).gold, town.unlocks.bookshop.levels[0].gold);
});

test('each research gives XP once per purchase', () => {
  const { research, prog } = make();
  prog.level = 1; prog.rewardedLevel = 1; prog.xp = 0;
  research.buy('masterSeller', 0);
  assert.equal(prog.xp, XP.research.base + XP.research.perLevel * 1);
});

test('persistence: levels survive a reload and the bonuses are active again', () => {
  const st = new FakeStorage();
  const a = make({ shopLevel: 2 });
  const sa = new SaveManager(a.game, st); sa.load();
  a.research.buy('masterSeller', 0); a.research.buy('masterSeller', 1); a.research.buy('masterEquipment', 0);
  sa.save();
  const saved = JSON.parse(st.getItem(SAVE_KEY));
  assert.equal(saved.version, SAVE_VERSION);
  assert.equal(saved.research.levels.masterSeller, 2);
  const b = make({ opened: false });
  new SaveManager(b.game, st).load();
  assert.equal(b.research.level('masterSeller'), 2);
  assert.equal(b.research.level('masterEquipment'), 1);
  assert.equal(b.game.bonus('saleIncome'), R.masterSeller.values[2]);
  assert.equal(b.game.stats.researchBought, 3);
});

test('old saves (v7, no research data) load with all researches at level 0', () => {
  const st = new FakeStorage();
  st.setItem(SAVE_KEY, JSON.stringify({ version: 7, gold: 999, ingredients: {}, products: {}, jobs: {}, upgrades: {}, stats: {}, town: { opened: ['bookshop'], levels: { bookshop: 1 } } }));
  const a = make({ opened: false });
  assert.equal(new SaveManager(a.game, st).load().status, 'loaded');
  assert.equal(a.player.gold, 999);
  assert.ok(Object.values(a.research.levels).every((v) => v === 0));
  assert.equal(a.town.isOpen('bookshop'), true);
});

test('invalid saved research data is repaired, never trusted', () => {
  const { research } = make();
  const v = validateResearch({ levels: { masterSeller: 99, bakingKnowledge: -2, townCulture: 1.5, ghost: 3, masterEquipment: 'x' } }, research);
  assert.equal(v.levels.masterSeller, 5);
  assert.equal(v.levels.bakingKnowledge, 0);
  assert.equal(v.levels.townCulture, 0);
  assert.equal(v.levels.masterEquipment, 0);
  assert.equal('ghost' in v.levels, false);
  assert.deepEqual(validateResearch(undefined, research).levels, Object.fromEntries(research.ids().map((i) => [i, 0])));
});

test('confirmed reset clears research', () => {
  const st = new FakeStorage();
  const a = make();
  const s = new SaveManager(a.game, st); s.load();
  a.research.buy('masterSeller', 0);
  assert.ok(s.reset({ confirmed: true }).ok);
  assert.equal(a.research.level('masterSeller'), 0);
  assert.equal(a.game.bonus('saleIncome'), 0);
});

test('costs and bonuses come from a separate, replaceable table', () => {
  const cfg = { masterSeller: { name: 'X', icon: 'x', effect: 'saleIncome', bookshopLevel: 0, costs: [10], values: [0, 1], describe: () => '' } };
  const { research, game, player } = make({ gold: 10, cfg });
  assert.ok(research.buy('masterSeller', 0).ok);
  assert.equal(player.gold, 0);
  assert.equal(game.saleIncome(30), 60);
});
