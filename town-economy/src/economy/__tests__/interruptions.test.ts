import { STRINGS } from "../../i18n/strings";
import { t } from "../../i18n/t";
import { INTERRUPTION_COOLDOWN_TICKS, TICKS_PER_GAME_DAY } from "../constants";
import { isGoodUnlocked } from "../formulas";
import { GOODS, GOODS_BY_ID } from "../goods";
import { MENTOR_STEPS } from "../mentor";
import { rollRivalTraderOffer } from "../rivalTrader";
import { tick } from "../tick";
import { EconomyState, GoodId } from "../types";
import { initialState } from "../useEconomy";
import { rollVillagerRequest } from "../villagerRequests";

const LANGS = Object.keys(STRINGS) as (keyof typeof STRINGS)[];

function fresh(): EconomyState {
  return { ...initialState(), paused: false };
}

/** A town that has been running long enough for every good to exist, with a
 * full warehouse — the state in which a rival offer is most likely to pick
 * something the player cannot deliver, if it still could. */
function stocked(holding: number): EconomyState {
  const state = fresh();
  const goods = { ...state.goods };
  for (const g of GOODS) goods[g.id] = { ...goods[g.id], holding };
  return { ...state, goods, tick: 30 * TICKS_PER_GAME_DAY };
}

describe("rival trader offers", () => {
  it("never asks for a good the player cannot deliver", () => {
    const state = stocked(40);
    for (let i = 0; i < 400; i++) {
      const offer = rollRivalTraderOffer(state);
      expect(offer).not.toBeNull();
      expect(offer!.qty).toBeLessThanOrEqual(state.goods[offer!.goodId].holding);
    }
  });

  it("never picks a good the town has not unlocked yet", () => {
    // Day one, but with stock of everything — only the day-one goods may
    // be offered, because the rest are not tradeable yet.
    const state = { ...stocked(40), tick: 0 };
    const locked = GOODS.filter((g) => !isGoodUnlocked(g, state)).map((g) => g.id);
    expect(locked.length).toBeGreaterThan(0); // the test would be vacuous otherwise
    for (let i = 0; i < 400; i++) {
      const offer = rollRivalTraderOffer(state);
      expect(locked).not.toContain(offer!.goodId);
    }
  });

  it("declines to fire at all when the warehouse is empty", () => {
    // Which is exactly the day-one case: a brand-new town holds nothing, so
    // no wholesaler calls until the player has bought something.
    expect(rollRivalTraderOffer(fresh())).toBeNull();
  });

  it("pays above the market price it is quoting against", () => {
    const state = stocked(40);
    for (let i = 0; i < 100; i++) {
      const offer = rollRivalTraderOffer(state)!;
      expect(offer.pricePerUnit).toBeGreaterThan(state.goods[offer.goodId].price);
    }
  });
});

describe("villager requests", () => {
  it("only asks for goods the town has unlocked", () => {
    const state = { ...fresh(), tick: 0 };
    const locked = GOODS.filter((g) => !isGoodUnlocked(g, state)).map((g) => g.id as GoodId);
    for (let i = 0; i < 400; i++) {
      expect(locked).not.toContain(rollVillagerRequest(state).goodId);
    }
  });
});

describe("interruption cooldown", () => {
  it("never lands two blocking modals inside the cooldown", () => {
    // Run a long stretch of real ticks and record the tick of every modal
    // that appeared. Any two closer together than the cooldown would be the
    // back-to-back pair the cooldown exists to prevent.
    let state = stocked(200);
    state = { ...state, lastInterruptionTick: -INTERRUPTION_COOLDOWN_TICKS };
    const firedAt: number[] = [];
    let had = false;

    for (let i = 0; i < 4000; i++) {
      // Answering is out of scope here, so clear whatever is pending and
      // keep the clock moving — the cooldown is what is under test.
      const pending = Boolean(state.pendingDecision || state.pendingRequest || state.pendingRivalOffer);
      if (pending) {
        if (!had) firedAt.push(state.tick);
        had = true;
        state = { ...state, pendingDecision: null, pendingRequest: null, pendingRivalOffer: null };
      } else {
        had = false;
      }
      state = tick(state);
    }

    expect(firedAt.length).toBeGreaterThan(0);
    for (let i = 1; i < firedAt.length; i++) {
      expect(firedAt[i] - firedAt[i - 1]).toBeGreaterThanOrEqual(INTERRUPTION_COOLDOWN_TICKS);
    }
  });
});

describe("mentor script", () => {
  it("gives every beat a distinct id", () => {
    expect(new Set(MENTOR_STEPS.map((s) => s.id)).size).toBe(MENTOR_STEPS.length);
  });

  it("resolves every line in both languages", () => {
    for (const lang of LANGS) {
      for (const step of MENTOR_STEPS) {
        const line = t(lang, step.textKey);
        expect(line).not.toBe(step.textKey);
        expect(line.length).toBeGreaterThan(20);
      }
      for (const key of ["mentor.name", "mentor.role", "mentor.next", "mentor.done", "mentor.skip"]) {
        expect(t(lang, key)).not.toBe(key);
      }
    }
  });

  it("starts by welcoming the player before naming any screen", () => {
    expect(MENTOR_STEPS[0].screen).toBeUndefined();
    expect(MENTOR_STEPS[0].id).toBe("greet");
  });

  it("only points at tabs that exist on the tab bar", () => {
    const tabs = ["market", "inventory", "trade", "town", "research", "invest", "achievements"];
    for (const step of MENTOR_STEPS) {
      if (step.screen) expect(tabs).toContain(step.screen);
    }
  });
});

describe("GOODS_BY_ID", () => {
  it("covers every good the offers index into", () => {
    for (const g of GOODS) expect(GOODS_BY_ID[g.id]).toBe(g);
  });
});
