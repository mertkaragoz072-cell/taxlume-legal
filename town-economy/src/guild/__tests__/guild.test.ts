import { isGuildCode, normalizeGuildCode, validateGuildName } from "../guildName";
import { createMockGuildApi, KeyValueStore, MOCK_DEMO_CODE } from "../mockApi";
import { guildProductionBonus } from "../../economy/guildPerks";
import { GUILD_BADGES } from "../badges";
import { guildRewardFor } from "../reward";
import { GuildError, goalTargetFor, guildLevel, streakMultiplier, weekStartOf } from "../types";

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

  it("only accepts a report from a guild member", async () => {
    const api = createMockGuildApi(memoryStore(), () => MONDAY);
    await expect(api.reportGuild("other")).rejects.toMatchObject({ code: "not_in_guild" });
    await api.joinGuild(MOCK_DEMO_CODE);
    await expect(api.reportGuild("member_name")).resolves.toBeUndefined();
  });

  it("keeps your profile current in the member list", async () => {
    const api = createMockGuildApi(memoryStore(), () => MONDAY);
    await api.joinGuild(MOCK_DEMO_CODE);
    await api.syncProfile({ displayName: "Kasaba X", rankIndex: 3, netWorth: 12345 });
    const me = (await api.getMyGuild())!.members.find((m) => m.isYou)!;
    expect(me).toMatchObject({ name: "Kasaba X", rankIndex: 3, netWorth: 12345 });
  });
});

describe("guild trade (mock backend)", () => {
  it("shows a weekly order the guild fills together, capped at its target", async () => {
    const api = createMockGuildApi(memoryStore(), () => MONDAY);
    const g = await api.joinGuild(MOCK_DEMO_CODE);
    expect(g.order.target).toBe(200); // 40 per member, 5 members
    expect(g.order.progress).toBe(21);
    expect(await api.claimOrderReward()).toBe(false); // not complete
    expect(await api.donateToOrder(50)).toBe(50);
    expect(await api.donateToOrder(500)).toBe(200 - 21 - 50); // never past what it needs
    expect(await api.donateToOrder(10)).toBe(0);
    const done = await api.getMyGuild();
    expect(done!.order.progress).toBe(200);
    expect(done!.order.myDonated).toBe(179);
    expect(await api.claimOrderReward()).toBe(true);
    expect(await api.claimOrderReward()).toBe(false);
  });

  it("only pays the order chest to someone who gave something", async () => {
    let now = MONDAY;
    const api = createMockGuildApi(memoryStore(), () => now);
    await api.joinGuild(MOCK_DEMO_CODE);
    now += 6 * DAY; // the guild's computer players keep chipping in
    for (let i = 0; i < 3; i++) {
      now += 1000;
      await api.getMyGuild();
    }
    await api.donateToOrder(0);
    // nobody can claim without giving
    expect(await api.claimOrderReward()).toBe(false);
  });

  it("lets you ask for a good, once at a time, and cancel", async () => {
    const api = createMockGuildApi(memoryStore(), () => MONDAY);
    await api.joinGuild(MOCK_DEMO_CODE);
    await api.createRequest("grain", 10);
    await expect(api.createRequest("wool", 5)).rejects.toMatchObject({ code: "request_open" });
    await expect(api.createRequest("diamond", 5)).rejects.toMatchObject({ code: "request_invalid" });
    const mine = (await api.getMyGuild())!.requests.find((r) => r.isMine)!;
    expect(mine).toMatchObject({ goodId: "grain", qty: 10, filled: 0 });
    await api.cancelRequest();
    expect((await api.getMyGuild())!.requests.some((r) => r.isMine)).toBe(false);
    await api.createRequest("wool", 5); // a new one is allowed again
  });

  it("sends goods to a friend's request and refuses your own", async () => {
    const api = createMockGuildApi(memoryStore(), () => MONDAY);
    const g = await api.joinGuild(MOCK_DEMO_CODE);
    const theirs = g.requests.find((r) => !r.isMine)!;
    const need = theirs.qty - theirs.filled;
    expect(await api.fulfillRequest(theirs.id, 1000)).toBe(need); // at most what is still needed
    await expect(api.fulfillRequest(theirs.id, 1)).rejects.toMatchObject({ code: "request_gone" });
    const me = (await api.getMyGuild())!.members.find((m) => m.isYou)!;
    expect(me.gifted).toBe(need);
    await api.createRequest("sand", 5);
    const own = (await api.getMyGuild())!.requests.find((r) => r.isMine)!;
    await expect(api.fulfillRequest(own.id, 1)).rejects.toMatchObject({ code: "own_request" });
  });

  it("delivers goods friends sent, as many whole deliveries as fit", async () => {
    let now = MONDAY;
    const api = createMockGuildApi(memoryStore(), () => now);
    await api.joinGuild(MOCK_DEMO_CODE);
    await api.createRequest("grain", 10);
    expect(await api.claimDeliveries(100)).toEqual([]); // nobody has answered yet
    now += 25_000;
    const first = await api.claimDeliveries(100);
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({ goodId: "grain", qty: 5 });
    now += 25_000;
    expect(await api.claimDeliveries(3)).toEqual([]); // no room: it waits
    const later = await api.claimDeliveries(100);
    expect(later[0].qty).toBe(5);
    expect((await api.getMyGuild())!.requests.some((r) => r.isMine)).toBe(false); // filled, so closed
  });
});

describe("guild perks", () => {
  it("pays streaks more, up to +50%", () => {
    expect(streakMultiplier(0)).toBe(1);
    expect(streakMultiplier(3)).toBeCloseTo(1.3);
    expect(streakMultiplier(99)).toBeCloseTo(1.5);
    expect(guildRewardFor(2, 5)).toBeGreaterThan(guildRewardFor(2, 0));
  });

  it("gives a small output bonus from guild level 2, capped", () => {
    expect(guildProductionBonus(undefined)).toBe(0);
    expect(guildProductionBonus(0)).toBe(0);
    expect(guildProductionBonus(1)).toBe(0);
    expect(guildProductionBonus(2)).toBeCloseTo(0.005);
    expect(guildProductionBonus(500)).toBeCloseTo(0.05);
  });

  it("counts a streak of finished weeks in the demo guild and earns badges", async () => {
    const api = createMockGuildApi(memoryStore(), () => MONDAY);
    const g = await api.joinGuild(MOCK_DEMO_CODE);
    expect(g.streak).toBe(2);
    const badge = (id: string, level = 1) => GUILD_BADGES.find((b) => b.id === id)!.earned(g, level);
    expect(badge("streak")).toBe(false); // two weeks is not yet three
    expect(badge("trader")).toBe(false);
    expect(badge("veteran", 5)).toBe(true);
    await api.reportContribution(150);
    await api.donateToOrder(60);
    const after = (await api.getMyGuild())!;
    expect(after.myTotals).toMatchObject({ trades: 150, donated: 60 });
    expect(GUILD_BADGES.find((b) => b.id === "trader")!.earned(after, 1)).toBe(true);
    expect(GUILD_BADGES.find((b) => b.id === "giver")!.earned(after, 1)).toBe(true);
  });

  it("sends fixed phrases like emoji, and refuses anything else", async () => {
    const api = createMockGuildApi(memoryStore(), () => MONDAY);
    await api.joinGuild(MOCK_DEMO_CODE);
    await api.sendCheer("b1", "thanks");
    await api.sendCheer("b1", "not a phrase" as never);
    const cheers = (await api.getMyGuild())!.cheers;
    expect(cheers[0].emote).toBe("thanks");
    expect(cheers.some((c) => (c.emote as string) === "not a phrase")).toBe(false);
  });
});
