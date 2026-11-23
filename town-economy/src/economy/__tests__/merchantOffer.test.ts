import { MENTOR_DONE } from "../mentor";
import {
  claimMerchantOffer,
  dismissMerchantOffer,
  expireMerchantOffer,
  MERCHANT_COOLDOWN_TICKS,
  MERCHANT_FIRST_DELAY_TICKS,
  MERCHANT_OFFER_TICKS,
  merchantReward,
} from "../merchantOffer";
import { tick } from "../tick";
import { EconomyState } from "../types";
import { initialState } from "../useEconomy";

const ready = (over: Partial<EconomyState> = {}): EconomyState => ({
  ...initialState(),
  paused: false,
  mentorStep: MENTOR_DONE,
  tick: MERCHANT_FIRST_DELAY_TICKS,
  lastInterruptionTick: 1_000_000,
  ...over,
});

describe("the travelling merchant", () => {
  afterEach(() => jest.restoreAllMocks());

  it("is worth 100 coins to a new town and grows with it", () => {
    expect(merchantReward(initialState())).toBe(100);
    const rich = { ...initialState(), townRankIndex: 5, cash: 500_000 };
    expect(merchantReward(rich)).toBeGreaterThan(5_000);
  });

  it("does not come during a new town's first minutes", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    expect(tick(ready({ tick: 20 })).merchantOffer ?? null).toBeNull();
  });

  it("turns up when nothing else is waiting", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const s = tick(ready());
    expect(s.merchantOffer).not.toBeNull();
    expect(s.merchantOffer!.reward).toBe(100);
  });

  it("stays away during the tutorial or while a decision waits", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    expect(tick(ready({ mentorStep: 0 })).merchantOffer ?? null).toBeNull();
    const waiting = ready({ pendingDecision: { id: 1, templateId: "famine_relief", triggeredAtTick: 1 } });
    expect(tick(waiting).merchantOffer ?? null).toBeNull();
  });

  it("pays once, then rests", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const offered = tick(ready());
    const paid = claimMerchantOffer(offered);
    expect(paid.cash).toBe(offered.cash + 100);
    expect(paid.merchantOffer).toBeNull();
    expect(claimMerchantOffer(paid).cash).toBe(paid.cash);
    // inside the breather: no new offer
    expect(tick({ ...paid, paused: false }).merchantOffer ?? null).toBeNull();
    expect(paid.merchantCooldownTick).toBe(paid.tick + MERCHANT_COOLDOWN_TICKS);
  });

  it("leaves by itself, and 'no thanks' pays nothing", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const offered = tick(ready());
    expect(expireMerchantOffer({ ...offered, tick: offered.tick + 1 })).toEqual({
      ...offered,
      tick: offered.tick + 1,
    });
    const late = expireMerchantOffer({ ...offered, tick: offered.tick + MERCHANT_OFFER_TICKS + 2 });
    expect(late.merchantOffer).toBeNull();
    const no = dismissMerchantOffer(offered);
    expect(no.merchantOffer).toBeNull();
    expect(no.cash).toBe(offered.cash);
  });
});
