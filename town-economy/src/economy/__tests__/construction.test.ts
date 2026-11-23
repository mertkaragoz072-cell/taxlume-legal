import {
  AD_SKIP_MS,
  finishDueImprovements,
  formatWait,
  improvementProgress,
  improvementWaitMs,
  pendingOf,
  planImprovement,
  skipImprovement,
  startImprovement,
} from "../construction";
import { upgradeCost, UPGRADES_BY_ID } from "../upgrades";
import { initialState } from "../useEconomy";

const T0 = 1_800_000_000_000;
const rich = () => ({ ...initialState(), cash: 1_000_000 });

describe("how long things take", () => {
  it("starts at 10 seconds and grows, never past half an hour", () => {
    expect(improvementWaitMs(1)).toBe(10_000);
    expect(improvementWaitMs(80)).toBe(10_000);
    expect(improvementWaitMs(300)).toBe(30_000);
    const secs = [50, 200, 500, 1000, 3000, 9000, 40_000, 1e9].map((c) => improvementWaitMs(c) / 1000);
    for (let i = 1; i < secs.length; i++) expect(secs[i]).toBeGreaterThanOrEqual(secs[i - 1]);
    expect(improvementWaitMs(1e12)).toBe(30 * 60_000);
  });

  it("matches the shape the game wants: seconds early, minutes later", () => {
    expect(improvementWaitMs(500)).toBeLessThan(60_000); // the early upgrades
    expect(improvementWaitMs(1002)).toBeGreaterThanOrEqual(60_000); // a top-level upgrade
    expect(improvementWaitMs(9000)).toBeGreaterThan(AD_SKIP_MS); // a mansion needs more than one ad
  });

  it("is shown as m:ss", () => {
    expect(formatWait(10_000)).toBe("0:10");
    expect(formatWait(90_000)).toBe("1:30");
    expect(formatWait(12 * 60_000)).toBe("12:00");
    expect(formatWait(3_900_000)).toBe("1:05:00");
    expect(formatWait(-5)).toBe("0:00");
  });
});

describe("building something", () => {
  it("charges now, applies later", () => {
    const s0 = rich();
    const cost = upgradeCost(UPGRADES_BY_ID.market, 0);
    const s1 = startImprovement(s0, "upgrade", "market", T0);
    expect(s1.cash).toBe(s0.cash - cost);
    expect(s1.upgrades.market).toBe(0); // not yet
    expect(pendingOf(s1, "upgrade")).toMatchObject({
      ref: "market",
      startedAt: T0,
      readyAt: T0 + improvementWaitMs(cost),
    });
    const mid = finishDueImprovements(s1, T0 + 5_000);
    expect(mid.upgrades.market).toBe(0);
    expect(pendingOf(mid, "upgrade")).toBeDefined();
    const done = finishDueImprovements(s1, T0 + improvementWaitMs(cost));
    expect(done.upgrades.market).toBe(1);
    expect(pendingOf(done, "upgrade")).toBeUndefined();
    expect(done.dailyProgress.upgradesBought).toBe(s0.dailyProgress.upgradesBought + 1);
    expect(done.eventLog[0].tone).toBe("good");
  });

  it("builds a property and researches a node the same way", () => {
    const s1 = startImprovement(
      startImprovement(rich(), "property", "landPlot", T0),
      "research",
      "bread_t1",
      T0
    );
    expect(s1.ownedProperties).toEqual([]);
    expect(s1.researched).toEqual([]);
    const done = finishDueImprovements(s1, T0 + 60 * 60_000);
    expect(done.ownedProperties).toContain("landPlot");
    expect(done.researched).toContain("bread_t1");
    expect(done.construction).toEqual([]);
  });

  it("allows one of each kind at a time, three kinds in parallel", () => {
    const s = startImprovement(rich(), "upgrade", "market", T0);
    expect(planImprovement(s, "upgrade", "bank")).toBeNull();
    expect(startImprovement(s, "upgrade", "bank", T0)).toBe(s);
    expect(planImprovement(s, "property", "landPlot")).not.toBeNull();
    expect(planImprovement(s, "research", "bread_t1")).not.toBeNull();
  });

  it("refuses what the instant version refused", () => {
    const poor = { ...initialState(), cash: 1 };
    expect(startImprovement(poor, "upgrade", "market", T0)).toBe(poor);
    expect(planImprovement(rich(), "upgrade", "nope")).toBeNull();
    expect(planImprovement(rich(), "research", "bread_t2")).toBeNull(); // needs tier 1 first
    const maxed = { ...rich(), upgrades: { ...rich().upgrades, market: UPGRADES_BY_ID.market.maxLevel } };
    expect(planImprovement(maxed, "upgrade", "market")).toBeNull();
    const owned = { ...rich(), ownedProperties: ["landPlot"] };
    expect(planImprovement(owned, "property", "landPlot")).toBeNull();
    expect(planImprovement({ ...rich(), gameOver: true }, "upgrade", "market")).toBeNull();
  });

  it("keeps counting while the game is closed: coming back finishes what is due", () => {
    const s = startImprovement(startImprovement(rich(), "upgrade", "market", T0), "property", "landPlot", T0);
    const later = finishDueImprovements(s, T0 + 2 * 60 * 60_000); // two hours away
    expect(later.upgrades.market).toBe(1);
    expect(later.ownedProperties).toContain("landPlot");
    expect(later.eventLog.filter((e) => e.key === "msg.improvementDone")).toHaveLength(2);
  });

  it("pulls in a wait that a moved-back phone clock would stretch", () => {
    const s = startImprovement(rich(), "research", "bread_t1", T0);
    const far = { ...s, construction: s.construction!.map((p) => ({ ...p, readyAt: T0 + 5 * 3_600_000 })) };
    const pulled = finishDueImprovements(far, T0);
    expect(pulled.construction![0].readyAt).toBe(T0 + 30 * 60_000);
  });

  it("reports progress from 0 to 1", () => {
    const item = { kind: "upgrade" as const, ref: "market", startedAt: T0, readyAt: T0 + 10_000 };
    expect(improvementProgress(item, T0)).toBe(0);
    expect(improvementProgress(item, T0 + 5_000)).toBe(0.5);
    expect(improvementProgress(item, T0 + 99_000)).toBe(1);
  });
});

describe("skipping with an ad", () => {
  const longWait = () => {
    const s = startImprovement({ ...rich() }, "property", "mansion", T0); // costs 9000: well over 5 minutes
    return s;
  };

  it("takes five minutes off a long wait", () => {
    const s = longWait();
    const before = pendingOf(s, "property")!.readyAt;
    expect(before - T0).toBeGreaterThan(AD_SKIP_MS);
    const after = skipImprovement(s, "property", T0);
    expect(pendingOf(after, "property")!.readyAt).toBe(before - AD_SKIP_MS);
    expect(after.ownedProperties).not.toContain("mansion");
  });

  it("finishes it outright when five minutes or less are left", () => {
    const s = longWait();
    const end = pendingOf(s, "property")!.readyAt;
    const nearly = skipImprovement(s, "property", end - AD_SKIP_MS); // exactly five minutes left
    expect(nearly.ownedProperties).toContain("mansion");
    expect(pendingOf(nearly, "property")).toBeUndefined();
  });

  it("finishes every short upgrade with a single ad", () => {
    for (const id of [
      "market",
      "caravanserai",
      "townhall",
      "bank",
      "guardTower",
      "earthquakeFund",
      "storageYard",
    ] as const) {
      for (let level = 0; level < UPGRADES_BY_ID[id].maxLevel; level++) {
        const s0 = { ...rich(), upgrades: { ...rich().upgrades, [id]: level } };
        const s1 = startImprovement(s0, "upgrade", id, T0);
        const wait = pendingOf(s1, "upgrade")!.readyAt - T0;
        const done = skipImprovement(s1, "upgrade", T0);
        if (wait <= AD_SKIP_MS) expect(done.upgrades[id]).toBe(level + 1);
      }
    }
  });

  it("does nothing when nothing is being built", () => {
    const s = rich();
    expect(skipImprovement(s, "upgrade", T0)).toBe(s);
  });
});
