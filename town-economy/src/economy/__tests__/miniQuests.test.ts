import { MINI_QUEST_COOLDOWN_DONE_TICKS, MINI_QUEST_COOLDOWN_EXPIRED_TICKS } from "../constants";
import { MENTOR_DONE } from "../mentor";
import { MINI_QUEST_TEMPLATES, MINI_QUEST_TEMPLATES_BY_ID } from "../miniQuests";
import { applyMiniQuest } from "../progression";
import { tick } from "../tick";
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
