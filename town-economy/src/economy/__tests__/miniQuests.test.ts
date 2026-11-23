import {
  MINI_QUEST_COOLDOWN_DONE_TICKS,
  MINI_QUEST_COOLDOWN_EXPIRED_TICKS,
  NEWBIE_GRACE_TICKS,
} from "../constants";
import { isGoodUnlocked } from "../formulas";
import { GOODS } from "../goods";
import { MENTOR_DONE } from "../mentor";
import { MINI_QUEST_TEMPLATES, MINI_QUEST_TEMPLATES_BY_ID } from "../miniQuests";
import { applyMiniQuest } from "../progression";
import { pickDailyQuestTemplates, QUEST_TEMPLATES_BY_ID } from "../quests";
import { tick } from "../tick";
import { weeklyChallengeTemplateForWeek } from "../weeklyChallenges";
import { EconomyState } from "../types";
import { initialState } from "../useEconomy";

const ready = (over: Partial<EconomyState> = {}): EconomyState => ({
  ...initialState(),
  paused: false,
  mentorStep: MENTOR_DONE,
  tick: 100,
  // keeps decisions, villagers and rival offers out of the way
  lastInterruptionTick: 1_000_000,
  ...over,
});

/** ticks until a quest shows up, or null */
function ticksToSpawn(state: EconomyState, max = 200): number | null {
  let s = state;
  for (let i = 0; i < max; i++) {
    s = tick(s);
    if (s.activeMiniQuest) return i + 1;
  }
  return null;
}

describe("flash quests", () => {
  afterEach(() => jest.restoreAllMocks());

  it("turn up quickly once the breather is over", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.01);
    expect(ticksToSpawn(ready())).toBe(1);
  });

  it("wait out the breather after the last one", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.01);
    const s = ready({ miniQuestCooldownTick: 100 + 10 });
    expect(ticksToSpawn(s)).toBeGreaterThanOrEqual(9);
  });

  it("do not interrupt the tutorial or something awaiting an answer", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.01);
    expect(ticksToSpawn(ready({ mentorStep: 0 }), 20)).toBeNull();
    const pending = ready({ pendingDecision: { id: 1, templateId: "famine_relief", triggeredAtTick: 90 } });
    expect(tick(pending).activeMiniQuest).toBeNull();
  });

  it("never repeat the one that just ran", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.01);
    for (const tpl of MINI_QUEST_TEMPLATES) {
      const s = tick(ready({ lastMiniQuestId: tpl.id, tradeUnlocked: true }));
      expect(s.activeMiniQuest?.templateId).not.toBe(tpl.id);
    }
  });

  it("start a breather when finished, a longer one when they ran out", () => {
    const tpl = MINI_QUEST_TEMPLATES_BY_ID["flash_trade"];
    const quest = {
      id: 1,
      templateId: tpl.id,
      target: 1,
      reward: 15,
      triggeredAtTick: 100,
      expiresAtTick: 106,
      baseline: 0,
    };
    const base = ready({ activeMiniQuest: quest });
    const won = applyMiniQuest({ ...base, dailyProgress: { ...base.dailyProgress, trades: 1 } });
    expect(won.activeMiniQuest).toBeNull();
    expect(won.cash).toBe(base.cash + 15);
    expect(won.miniQuestCooldownTick).toBe(100 + MINI_QUEST_COOLDOWN_DONE_TICKS);
    expect(won.lastMiniQuestId).toBe("flash_trade");

    const lost = applyMiniQuest({ ...base, tick: 106 });
    expect(lost.activeMiniQuest).toBeNull();
    expect(lost.miniQuestCooldownTick).toBe(106 + MINI_QUEST_COOLDOWN_EXPIRED_TICKS);
  });

  it("count buys, sells and investment trades from older saves too", () => {
    const old = initialState().dailyProgress;
    for (const id of ["flash_buy", "flash_sell", "flash_sell_3", "flash_invest"]) {
      expect(MINI_QUEST_TEMPLATES_BY_ID[id].metric(old)).toBe(0);
    }
    expect(MINI_QUEST_TEMPLATES_BY_ID["flash_sell"].metric({ ...old, sells: 2 })).toBe(2);
  });
});

describe("a new town's first minutes", () => {
  afterEach(() => jest.restoreAllMocks());

  it("have no decisions, villagers, rival offers, crises or flash deals", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    let s = ready({ tick: 0, lastInterruptionTick: -30, mentorStep: MENTOR_DONE });
    for (let i = 0; i < NEWBIE_GRACE_TICKS - 1; i++) {
      s = tick(s);
      expect(s.pendingDecision).toBeNull();
      expect(s.pendingRequest).toBeNull();
      expect(s.pendingRivalOffer).toBeNull();
      expect(s.pendingCrisis).toBeNull();
      expect(s.activeFlashDeal).toBeNull();
    }
  });
});

describe("production quotas", () => {
  it("pay nothing for goods the town cannot trade yet", () => {
    const s = ready({ tick: 0 });
    // every quota is within reach at once, on a brand-new town
    const met = { ...s, productionQuotas: s.productionQuotas.map((q) => ({ ...q, target: 0.001 })) };
    const next = tick(met);
    const paidFor = next.eventLog.filter((e) => e.key === "msg.quotaMet").length;
    expect(paidFor).toBeGreaterThan(0);
    const unlocked = GOODS.filter((g) => isGoodUnlocked(g, met)).length;
    expect(unlocked).toBeLessThan(GOODS.length);
    expect(paidFor).toBeLessThanOrEqual(unlocked);
  });
});

describe("tasks a new player can do", () => {
  it("no daily quest or weekly challenge needs trade while trade is locked", () => {
    for (let d = 1; d <= 60; d++) {
      const seed = `2026-11-${String(d).padStart(2, "0")}-${d}`;
      for (const q of pickDailyQuestTemplates(seed, 3, false)) expect(q.requiresTrade).toBeFalsy();
      expect(
        weeklyChallengeTemplateForWeek(`2026-W${String(d).padStart(2, "0")}`, false).requiresTrade
      ).toBeFalsy();
    }
    expect(initialState().dailyQuests.every((q) => !QUEST_TEMPLATES_BY_ID[q.templateId].requiresTrade)).toBe(
      true
    );
  });

  it("they come back once trade is open", () => {
    const seen = new Set<string>();
    for (let d = 1; d <= 60; d++) for (const q of pickDailyQuestTemplates(`s${d}`, 3, true)) seen.add(q.id);
    expect(seen.has("daily_caravan")).toBe(true);
  });

  it("log small bonuses without raising a banner", () => {
    const s = ready({ tick: 0, lastEvent: null });
    const met = {
      ...s,
      productionQuotas: s.productionQuotas.map((q) => ({ ...q, target: 0.001, bonus: 1 })),
    };
    const next = tick(met);
    expect(next.eventLog.some((e) => e.key === "msg.quotaMet")).toBe(true);
    expect(next.lastEvent === null || next.lastEvent.key !== "msg.quotaMet").toBe(true);
  });
});
