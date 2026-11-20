import { isGuildCode, normalizeGuildCode, validateGuildName } from "../guildName";
import { createMockGuildApi, KeyValueStore, MOCK_DEMO_CODE } from "../mockApi";
import { guildRewardFor } from "../reward";
import { GuildError, goalTargetFor, guildLevel, weekStartOf } from "../types";

function memoryStore(): KeyValueStore {
  const m = new Map<string, string>();
  return {
    getItem: async (k) => m.get(k) ?? null,
    setItem: async (k, v) => void m.set(k, v),
    removeItem: async (k) => void m.delete(k),
  };
}

const MONDAY = Date.UTC(2026, 10, 16, 12); // a Monday at noon UTC
const DAY = 86_400_000;

describe("guild names and codes", () => {
  it("accepts ordinary names and rejects bad ones", () => {
    expect(validateGuildName("Altın Tüccarlar")).toBe(true);
    expect(validateGuildName("ab")).toBe(false);
    expect(validateGuildName("x".repeat(21))).toBe(false);
    expect(validateGuildName("Lonca <3 !!")).toBe(false);
    expect(validateGuildName("fuck guild")).toBe(false);
    expect(validateGuildName("Sik Kardeşler")).toBe(false);
    expect(validateGuildName("Musiki Loncası")).toBe(true);
    expect(validateGuildName("Gotham Capital")).toBe(true);
  });

  it("normalises invite codes", () => {
    expect(normalizeGuildCode(" demo-42x ")).toBe("DEMO42");
    expect(isGuildCode("demo42")).toBe(true);
    expect(isGuildCode("demo")).toBe(false);
  });
});

describe("guild maths", () => {
  it("scales the goal with members and levels with total trades", () => {
    expect(goalTargetFor(1)).toBe(120);
    expect(goalTargetFor(5)).toBe(600);
    expect(guildLevel(0)).toBe(1);
    expect(guildLevel(60)).toBe(2);
    expect(guildLevel(100000)).toBeGreaterThan(guildLevel(1000));
  });

  it("weeks start on Monday 00:00 UTC", () => {
    const start = weekStartOf(MONDAY + 3 * DAY);
    expect(new Date(start).getUTCDay()).toBe(1);
    expect(start).toBe(Date.UTC(2026, 10, 16));
    expect(weekStartOf(start - 1)).toBe(start - 7 * DAY);
  });

  it("pays more at higher ranks", () => {
    expect(guildRewardFor(5)).toBeGreaterThan(guildRewardFor(1));
  });
});

describe("mock guild backend", () => {
  it("creates a guild with you as the only member", async () => {
    const api = createMockGuildApi(memoryStore(), () => MONDAY);
    expect(await api.getMyGuild()).toBeNull();
    const g = await api.createGuild("Dostlar");
    expect(g.memberCount).toBe(1);
    expect(g.members[0].isYou && g.members[0].isOwner).toBe(true);
    expect(g.goalTarget).toBe(120);
    await expect(api.createGuild("Baska")).rejects.toMatchObject({ code: "already_in_guild" });
  });

  it("rejects bad names and unknown codes", async () => {
    const api = createMockGuildApi(memoryStore(), () => MONDAY);
    await expect(api.createGuild("ab")).rejects.toBeInstanceOf(GuildError);
    await expect(api.joinGuild("ZZZZZZ")).rejects.toMatchObject({ code: "not_found" });
  });

  it("joins the demo guild, counts your trades and pays the chest once", async () => {
    let now = MONDAY;
    const api = createMockGuildApi(memoryStore(), () => now);
    const g = await api.joinGuild(MOCK_DEMO_CODE);
    expect(g.memberCount).toBe(5);
    expect(g.goalTarget).toBe(600);
    expect(await api.claimWeeklyReward()).toBe(false); // goal not reached yet

    await api.reportContribution(400);
    const after = await api.getMyGuild();
    expect(after!.goalProgress).toBeGreaterThanOrEqual(600);
    expect(after!.members.find((m) => m.isYou)!.weekContribution).toBe(400);

    expect(await api.claimWeeklyReward()).toBe(true);
    expect(await api.claimWeeklyReward()).toBe(false); // only once
    expect((await api.getMyGuild())!.rewardClaimed).toBe(true);

    now += 7 * DAY; // a new week starts with a fresh goal and a fresh chest
    const next = await api.getMyGuild();
    expect(next!.rewardClaimed).toBe(false);
    expect(next!.members.find((m) => m.isYou)!.weekContribution).toBe(0);
  });

  it("records cheers and lets you leave", async () => {
    const api = createMockGuildApi(memoryStore(), () => MONDAY);
    await api.joinGuild(MOCK_DEMO_CODE);
    await api.sendCheer("b1", "🎉");
    const g = await api.getMyGuild();
    expect(g!.cheers[0]).toMatchObject({ emote: "🎉", toYou: false });
    await api.leaveGuild();
    expect(await api.getMyGuild()).toBeNull();
    await expect(api.leaveGuild()).rejects.toMatchObject({ code: "not_in_guild" });
  });

  it("keeps your profile current in the member list", async () => {
    const api = createMockGuildApi(memoryStore(), () => MONDAY);
    await api.joinGuild(MOCK_DEMO_CODE);
    await api.syncProfile({ displayName: "Kasaba X", rankIndex: 3, netWorth: 12345 });
    const me = (await api.getMyGuild())!.members.find((m) => m.isYou)!;
    expect(me).toMatchObject({ name: "Kasaba X", rankIndex: 3, netWorth: 12345 });
  });
});
