import { describe, expect, it } from 'vitest';
import { ACTIVITIES } from '../data/activities';
import { ITEMS, START_INVENTORY } from '../data/items';
import { RECIPES } from '../data/recipes';
import { canTrainNow, trainBlockReason } from '../fitness/access';
import { purchaseMembership } from '../fitness/membership';
import { addItem, countOf, removeItems } from '../inventory/inventory';
import { canTravel, goToRoom, isOpen, travel } from '../navigation/travel';
import { MemoryStorage, SaveManager } from '../persistence/save';
import { cook, eat, performActivity, repeatFactor, sleep, sleepQuality } from '../simulation/activities';
import { advanceTime } from '../simulation/needs';
import { createNewGame, START_MONEY, START_TIME } from '../simulation/state';
import { DAY, HOUR, readClock } from '../simulation/time';
import { gymGame, homeGame } from './helpers';

const at = (hour: number, s = homeGame('bedroom')) => {
  s.time = hour * HOUR;
  return s;
};

describe('new game', () => {
  it('starts at home in the bedroom with a starter pantry, 08:00 Monday', () => {
    const s = createNewGame();
    expect(s.location).toBe('home');
    expect(s.room).toBe('bedroom');
    expect(s.time).toBe(START_TIME);
    expect(s.inventory).toEqual(START_INVENTORY);
    expect(s.inventory).not.toBe(START_INVENTORY); // a copy, never shared
  });
});

describe('sleep', () => {
  it('restores energy and lowers sleepiness in proportion to hours and costs game time', () => {
    const s = at(22);
    s.character.energy = 20;
    s.character.sleepiness = 80;
    const r = sleep(s, 8, 'bed');
    expect(r.ok).toBe(true);
    expect(s.time).toBe(22 * HOUR + 8 * HOUR);
    expect(s.character.energy).toBeGreaterThan(90);
    expect(s.character.sleepiness).toBeLessThan(5);
    expect(readClock(s.time).hour).toBe(6);
  });

  it('is scaled by hours: 2 hours restores less than 8', () => {
    const a = at(22);
    const b = at(22);
    a.character.energy = b.character.energy = 20;
    a.character.sleepiness = b.character.sleepiness = 80;
    sleep(a, 2, 'bed');
    sleep(b, 8, 'bed');
    expect(a.character.energy).toBeLessThan(b.character.energy);
    expect(a.character.sleepiness).toBeGreaterThan(b.character.sleepiness);
  });

  it('sleeping hungry and thirsty, or by day, or on the sofa, is worse', () => {
    const night = at(22);
    expect(sleepQuality(night, 'bed')).toBe(1);
    expect(sleepQuality(at(13), 'bed')).toBeLessThan(1);
    const hungry = at(22);
    hungry.character.hunger = 80;
    expect(sleepQuality(hungry, 'bed')).toBeLessThan(1);
    const thirsty = at(22);
    thirsty.character.hydration = 20;
    expect(sleepQuality(thirsty, 'bed')).toBeLessThan(1);
    expect(sleepQuality(at(22), 'sofa')).toBeLessThan(sleepQuality(at(22), 'bed'));
  });

  it('hunger and thirst grow slower asleep than awake', () => {
    const asleep = at(22);
    const awake = at(22);
    asleep.character.sleepiness = awake.character.sleepiness = 70;
    sleep(asleep, 6, 'bed');
    advanceTime(awake, 6 * HOUR, 'resting');
    expect(asleep.character.hunger).toBeLessThan(awake.character.hunger);
    expect(asleep.character.hydration).toBeGreaterThan(awake.character.hydration);
  });

  it('heals a fed character; a starving one does not recover health', () => {
    const fed = at(22);
    fed.character.health = 60;
    fed.character.sleepiness = 70;
    sleep(fed, 8, 'bed');
    expect(fed.character.health).toBeGreaterThan(60);
    const starving = at(22);
    starving.character.health = 60;
    starving.character.hunger = 100;
    starving.character.sleepiness = 70;
    sleep(starving, 8, 'bed');
    expect(starving.character.health).toBeLessThan(60);
  });

  it('burns workout recovery debt faster than resting', () => {
    const a = at(22);
    const b = at(22);
    a.gym.fatigue = b.gym.fatigue = 60;
    a.character.sleepiness = 70;
    sleep(a, 6, 'bed');
    advanceTime(b, 6 * HOUR, 'resting');
    expect(a.gym.fatigue).toBeLessThan(b.gym.fatigue);
  });

  it('good sleep lifts mood and well-being, poor sleep lowers them', () => {
    const good = at(22);
    good.character.sleepiness = 70;
    const h0 = good.character.happiness;
    sleep(good, 8, 'bed');
    expect(good.character.happiness).toBeGreaterThan(h0);
    const poor = at(13);
    poor.character.hunger = 90;
    poor.character.hydration = 10;
    poor.character.sleepiness = 70;
    const p0 = poor.character.wellbeing;
    sleep(poor, 4, 'bed');
    expect(poor.character.wellbeing).toBeLessThan(p0);
    expect(poor.sleep.lastQuality).toBeLessThan(0.7);
  });

  it('is refused in the wrong place, for invalid hours, or when not tired at all', () => {
    expect(sleep(homeGame('kitchen'), 8, 'bed').ok).toBe(false);
    expect(sleep(gymGame(), 8, 'bed').ok).toBe(false);
    const s = at(22);
    s.character.sleepiness = 60;
    expect(sleep(s, 0, 'bed').ok).toBe(false);
    expect(sleep(s, 13, 'bed').ok).toBe(false);
    const nap = homeGame('living');
    nap.character.sleepiness = 60;
    expect(sleep(nap, 4, 'sofa').ok).toBe(false);
    expect(sleep(nap, 2, 'sofa').ok).toBe(true);
    const fresh = at(8);
    fresh.character.sleepiness = 0;
    fresh.character.energy = 100;
    expect(sleep(fresh, 8, 'bed')).toMatchObject({ ok: false });
    expect(fresh.time).toBe(8 * HOUR); // a refused action never advances time
  });
});

describe('eating and inventory', () => {
  it('eating an owned item consumes exactly one, advances time and reduces hunger', () => {
    const s = homeGame('kitchen');
    s.character.hunger = 70;
    const before = countOf(s, 'bread');
    const t = s.time;
    const r = eat(s, 'bread');
    expect(r.ok).toBe(true);
    expect(countOf(s, 'bread')).toBe(before - 1);
    expect(s.character.hunger).toBeLessThan(70);
    expect(s.time - t).toBe(5 * 60);
  });

  it('cannot eat what you do not own, and nothing changes', () => {
    const s = homeGame('kitchen');
    s.character.hunger = 70;
    delete s.inventory.bread;
    const snapshot = JSON.stringify(s);
    expect(eat(s, 'bread')).toMatchObject({ ok: false });
    expect(JSON.stringify(s)).toBe(snapshot);
  });

  it('cannot eat a raw ingredient, an unknown item, or when not hungry', () => {
    const s = homeGame('kitchen');
    s.character.hunger = 70;
    expect(eat(s, 'eggs').ok).toBe(false);
    expect(eat(s, 'unicorn').ok).toBe(false);
    s.character.hunger = 2;
    expect(eat(s, 'bread').ok).toBe(false);
    expect(countOf(s, 'bread')).toBe(START_INVENTORY.bread);
  });

  it('must be in the kitchen', () => {
    const s = homeGame('living');
    s.character.hunger = 70;
    expect(eat(s, 'bread').ok).toBe(false);
  });

  it('drinking bottled water restores hydration; not when already hydrated', () => {
    const s = homeGame('kitchen');
    s.character.hydration = 40;
    expect(eat(s, 'water').ok).toBe(true);
    expect(s.character.hydration).toBeGreaterThan(65);
    s.character.hydration = 99;
    expect(eat(s, 'water').ok).toBe(false);
  });

  it('inventory operations are atomic and never go negative', () => {
    const s = homeGame();
    expect(removeItems(s, { bread: 2, apple: 99 })).toBe(false);
    expect(countOf(s, 'bread')).toBe(START_INVENTORY.bread); // untouched
    expect(removeItems(s, { bread: START_INVENTORY.bread! })).toBe(true);
    expect('bread' in s.inventory).toBe(false);
    expect(addItem(s, 'bread', 0)).toBe(false);
    expect(addItem(s, 'bread', -1)).toBe(false);
    expect(addItem(s, 'nonsense', 1)).toBe(false);
  });
});

describe('cooking', () => {
  it('consumes the ingredients, takes the recipe time and beats cheap snacks for recovery', () => {
    const s = homeGame('kitchen');
    s.character.hunger = 80;
    s.gym.fatigue = 30;
    const r = RECIPES.find((x) => x.id === 'chicken_rice')!;
    const t = s.time;
    expect(cook(s, r.id).ok).toBe(true);
    expect(s.time - t).toBe(r.minutes * 60);
    expect(countOf(s, 'chicken')).toBe(START_INVENTORY.chicken! - 1);
    expect(countOf(s, 'rice')).toBe(START_INVENTORY.rice! - 1);
    expect(s.character.hunger).toBeLessThan(80 - 40);
    expect(s.gym.fatigue).toBeLessThan(30); // balanced meals aid recovery (net of the time that passed)
    // a snack of noodles does not reduce recovery debt
    const n = homeGame('kitchen');
    n.character.hunger = 80;
    n.gym.fatigue = 30;
    eat(n, 'noodles');
    expect(n.gym.fatigue).toBeGreaterThan(s.gym.fatigue);
  });

  it('fails atomically without all ingredients', () => {
    const s = homeGame('kitchen');
    s.character.hunger = 80;
    delete s.inventory.tomato;
    const snap = JSON.stringify(s);
    const r = cook(s, 'chicken_rice');
    expect(r).toMatchObject({ ok: false });
    expect(JSON.stringify(s)).toBe(snap);
    if (!r.ok) expect(r.reason).toContain('Tomato');
  });

  it('every recipe only uses known items and gives a positive, consistent benefit', () => {
    for (const r of RECIPES) {
      for (const id of Object.keys(r.ingredients)) expect(ITEMS[id]).toBeDefined();
      expect(r.effects.hunger).toBeLessThan(0);
    }
  });

  it('home cooking is a viable, cheaper economy than buying (price of a balanced meal)', () => {
    const r = RECIPES.find((x) => x.id === 'chicken_rice')!;
    const cost = Object.entries(r.ingredients).reduce((sum, [id, n]) => sum + ITEMS[id]!.price * n, 0);
    expect(cost).toBeLessThan(10);
  });
});

describe('household activities', () => {
  it('shower, TV and study work in their rooms and give diminishing returns when repeated', () => {
    const s = homeGame('living');
    s.character.happiness = 40;
    const gains: number[] = [];
    for (let i = 0; i < 3; i++) {
      const h = s.character.happiness;
      expect(performActivity(s, 'watch_tv').ok).toBe(true);
      gains.push(s.character.happiness - h);
    }
    expect(gains[1]).toBeLessThan(gains[0]!);
    expect(gains[2]).toBeLessThan(gains[1]!);
    expect(gains[2]).toBeGreaterThan(0);
  });

  it('returns recover after the window passes', () => {
    const s = homeGame('living');
    performActivity(s, 'watch_tv');
    expect(repeatFactor(s, 'watch_tv', 6, 0.25)).toBeLessThan(1);
    advanceTime(s, 7 * HOUR);
    expect(repeatFactor(s, 'watch_tv', 6, 0.25)).toBe(1);
  });

  it('studying costs energy, builds office skill and xp, and needs energy', () => {
    const s = homeGame('study');
    const e = s.character.energy;
    expect(performActivity(s, 'study').ok).toBe(true);
    expect(s.skills.office).toBeGreaterThan(0);
    expect(s.character.energy).toBeLessThan(e);
    s.character.energy = 10;
    expect(performActivity(s, 'study')).toMatchObject({ ok: false });
  });

  it('drinking tap water is free and capped by thirst', () => {
    const s = homeGame('kitchen');
    s.character.hydration = 30;
    const money = s.money;
    expect(performActivity(s, 'drink_water').ok).toBe(true);
    expect(s.character.hydration).toBeGreaterThan(50);
    expect(s.money).toBe(money);
    s.character.hydration = 100;
    expect(performActivity(s, 'drink_water').ok).toBe(false);
  });

  it('activities are refused in the wrong room and at the gym', () => {
    expect(performActivity(homeGame('bedroom'), 'shower')).toMatchObject({ ok: false });
    expect(performActivity(gymGame(), 'shower')).toMatchObject({ ok: false });
  });

  it('leisure cannot be farmed for free: every action advances the clock', () => {
    const s = homeGame('living');
    const t = s.time;
    performActivity(s, 'watch_tv');
    expect(s.time).toBeGreaterThan(t);
  });

  it('every activity definition is internally consistent', () => {
    for (const a of Object.values(ACTIVITIES)) {
      expect(a.minutes).toBeGreaterThan(0);
      expect(a.object.length).toBeGreaterThan(0);
    }
  });
});

describe('well-being', () => {
  it('drifts toward a target set by mood, energy and unmet needs', () => {
    const good = homeGame();
    good.character.wellbeing = 30;
    good.character.happiness = 90;
    good.character.energy = 90;
    advanceTime(good, 6 * HOUR);
    expect(good.character.wellbeing).toBeGreaterThan(30);
    const bad = homeGame();
    bad.character.wellbeing = 80;
    bad.character.happiness = 10;
    bad.character.hunger = 95;
    bad.character.energy = 10;
    advanceTime(bad, 6 * HOUR);
    expect(bad.character.wellbeing).toBeLessThan(80);
  });
});

describe('travel and opening hours', () => {
  it('walking home → gym takes game time and a little energy and changes location', () => {
    const s = createNewGame();
    const e = s.character.energy;
    const t = s.time;
    const r = travel(s, 'gym');
    expect(r).toMatchObject({ ok: true, minutes: 12 });
    expect(s.location).toBe('gym');
    expect(s.time - t).toBe(12 * 60);
    expect(s.character.energy).toBeLessThan(e - 1);
  });

  it('is refused when the destination will be closed on arrival', () => {
    const s = at(22.9);
    s.time = 22 * HOUR + 55 * 60; // arrives 23:07, gym closes at 23:00
    expect(isOpen('gym', s.time)).toBe(true);
    expect(canTravel(s, 'gym')).toMatchObject({ ok: false });
    const night = at(2);
    expect(canTravel(night, 'gym').ok).toBe(false);
    expect(night.location).toBe('home'); // nothing changed
  });

  it('cannot travel with an active workout, to an unknown place, or to where you already are', () => {
    const g = gymGame();
    purchaseMembership(g, 'dayPass');
    g.workout = { exercise: 'bench', phase: 'rest', weight: 25, targetReps: 8, setReps: 0, setActive: false, completedSets: 1, totalReps: 8, xpEarned: 0, energySpent: 0, seconds: 0, strengthBefore: 5, enduranceBefore: 5, levelBefore: 1 };
    expect(canTravel(g, 'home')).toMatchObject({ ok: false });
    expect(canTravel(createNewGame(), 'cinema')).toMatchObject({ ok: false });
    expect(canTravel(createNewGame(), 'home')).toMatchObject({ ok: false });
  });

  it('moving between rooms costs one minute; only inside the home', () => {
    const s = createNewGame();
    const t = s.time;
    expect(goToRoom(s, 'kitchen').ok).toBe(true);
    expect(s.room).toBe('kitchen');
    expect(s.time - t).toBe(60);
    expect(goToRoom(s, 'kitchen').ok).toBe(false);
    expect(goToRoom(gymGame(), 'kitchen').ok).toBe(false);
  });

  it('training requires being at the gym, during opening hours, with a pass (one rule)', () => {
    const s = homeGame();
    purchaseMembership(s, 'dayPass');
    expect(canTrainNow(s)).toBe(false);
    expect(trainBlockReason(s)).toContain('gym');
    s.location = 'gym';
    s.time = 6 * HOUR;
    s.gym.membershipUntil = s.time + DAY;
    expect(canTrainNow(s)).toBe(true);
    s.time = 23.5 * HOUR;
    s.gym.membershipUntil = s.time + DAY;
    expect(trainBlockReason(s)).toContain('closed');
  });
});

describe('save v3', () => {
  it('round-trips location, room, inventory, activity log, skills and sleep exactly', async () => {
    const s = homeGame('living');
    performActivity(s, 'watch_tv');
    eat(homeGame('kitchen'), 'bread');
    const k = homeGame('kitchen');
    k.character.hunger = 70;
    eat(k, 'bread');
    k.skills.office = 12;
    k.sleep = { lastQuality: 0.9, lastWakeTime: 1234 };
    const mgr = new SaveManager(new MemoryStorage());
    await mgr.save(k);
    expect((await mgr.load()).state).toEqual(k);
    await mgr.save(s);
    const back = (await mgr.load()).state;
    expect(back.room).toBe('living');
    expect(back.activityLog).toHaveLength(1);
  });

  it('migrates a v2 save: keeps everything and adds a starter household at the bedroom', () => {
    const mgr = new SaveManager(new MemoryStorage());
    const s = mgr.parse(JSON.stringify({ version: 2, savedAt: 1, state: { time: 5 * HOUR, money: 250, location: 'gym', character: { strength: 20 }, gym: { membershipUntil: 3 * DAY }, workout: null } }));
    expect(s.version).toBe(3);
    expect(s.money).toBe(250);
    expect(s.location).toBe('gym');
    expect(s.character.strength).toBe(20);
    expect(s.room).toBe('bedroom');
    expect(s.inventory).toEqual(START_INVENTORY);
    expect(s.skills.office).toBe(0);
  });

  it('sanitises a corrupted inventory (negative, fractional, unknown items) without crashing', () => {
    const mgr = new SaveManager(new MemoryStorage());
    const s = mgr.parse(JSON.stringify({ version: 3, state: { inventory: { bread: -3, apple: 2.7, ghost: 5, milk: 'many', rice: 4 }, room: 'attic', location: 'moon' } }));
    expect(s.inventory).toEqual({ apple: 2, rice: 4 });
    expect(s.room).toBe('bedroom');
    expect(s.location).toBe('home');
  });

  it('money is untouched by home activities in this milestone', () => {
    const s = homeGame('kitchen');
    s.character.hunger = 80;
    cook(s, 'eggs_toast');
    eat(s, 'apple');
    expect(s.money).toBe(START_MONEY);
    expect(s.transactions).toHaveLength(0);
  });
});
