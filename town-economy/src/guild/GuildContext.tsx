import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useEconomyContext } from "../economy/EconomyContext";
import { guildStorageRoom } from "../economy/guildTrade";
import { GoodId } from "../economy/types";
import { getGuildApi } from "./getGuildApi";
import { guildRewardFor } from "./reward";
import {
  CheerCode,
  GuildApi,
  GuildErrorCode,
  GuildError,
  GuildInfo,
  guildLevel,
  ReportReason,
} from "./types";

const BASELINE_KEY = "guild.baseline.v1";
// Set once the player has made or joined a guild. Until then the app never
// talks to the server at all: no account is created just for having guilds.
const MEMBER_KEY = "guild.member.v1";
const SYNC_MS = 60_000;
const HUB_REFRESH_MS = 20_000;

type Status = "unavailable" | "loading" | "none" | "in";

interface GuildContextValue {
  status: Status;
  guild: GuildInfo | null;
  error: GuildErrorCode | null;
  busy: boolean;
  hubOpen: boolean;
  openHub: () => void;
  closeHub: () => void;
  refresh: () => Promise<void>;
  create: (name: string) => Promise<boolean>;
  join: (code: string) => Promise<boolean>;
  leave: () => Promise<void>;
  cheer: (toUserId: string, emote: CheerCode) => Promise<void>;
  claim: () => Promise<void>;
  /** gives up to `qty` of this week's order good from the player's stock */
  donate: (qty: number) => Promise<void>;
  claimOrder: () => Promise<void>;
  requestGood: (goodId: GoodId, qty: number) => Promise<boolean>;
  cancelRequest: () => Promise<void>;
  /** sends up to `qty` of a requested good to a friend, from the player's stock */
  fulfill: (requestId: string, goodId: GoodId, qty: number) => Promise<void>;
  report: (reason: ReportReason) => Promise<boolean>;
  clearError: () => void;
}

const GuildContext = createContext<GuildContextValue | null>(null);

function asCode(e: unknown): GuildErrorCode {
  return e instanceof GuildError ? e.code : "network";
}

export function GuildProvider({
  children,
  api: apiProp,
}: {
  children: React.ReactNode;
  api?: GuildApi | null;
}) {
  const { state, netWorth, grantGuildReward, guildGoodsOut, guildGoodsIn, setGuildLevel } =
    useEconomyContext();
  const api = useMemo(() => (apiProp !== undefined ? apiProp : getGuildApi()), [apiProp]);
  const [status, setStatus] = useState<Status>(api ? "loading" : "unavailable");
  const [remembered, setRemembered] = useState<boolean | null>(null);
  const [guild, setGuild] = useState<GuildInfo | null>(null);
  const [error, setError] = useState<GuildErrorCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [hubOpen, setHubOpen] = useState(false);

  // latest game numbers for the background sync, without restarting its timer
  const live = useRef<{
    trades: number;
    name: string;
    rank: number;
    netWorth: number;
    room: number;
    streak: number;
    held: Record<string, number>;
  }>({ trades: 0, name: "", rank: 0, netWorth: 0, room: 0, streak: 0, held: {} });
  live.current = {
    trades: state.stats.totalTrades,
    name: state.townName,
    rank: state.townRankIndex,
    netWorth,
    room: guildStorageRoom(state),
    streak: guild?.streak ?? 0,
    held: Object.fromEntries(Object.entries(state.goods).map(([id, g]) => [id, Math.floor(g.holding)])),
  };

  const apply = useCallback(
    (g: GuildInfo | null) => {
      setGuild(g);
      setStatus(g ? "in" : "none");
      // the guild's level gives the town a small output bonus (see guildPerks.ts)
      setGuildLevel(g ? guildLevel(g.totalContribution) : 0);
    },
    [setGuildLevel]
  );

  const setBaseline = useCallback(async (trades: number) => {
    try {
      await AsyncStorage.setItem(BASELINE_KEY, String(trades));
    } catch {
      // a lost baseline only means the next report starts from the current count
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!api) return;
    try {
      apply(await api.getMyGuild());
      setError(null);
    } catch (e) {
      setError(asCode(e));
      setStatus((s) => (s === "loading" ? "none" : s));
    }
  }, [api, apply]);

  const markMember = useCallback(async (on: boolean) => {
    try {
      if (on) await AsyncStorage.setItem(MEMBER_KEY, "1");
      else await AsyncStorage.removeItem(MEMBER_KEY);
    } catch {
      // without the flag the player simply starts from "no guild" next launch
    }
    setRemembered(on);
  }, []);

  // On launch, only a player who already belongs to a guild contacts the server.
  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    (async () => {
      const flag = await AsyncStorage.getItem(MEMBER_KEY)
        .then((v) => v === "1")
        .catch(() => false);
      if (cancelled) return;
      setRemembered(flag);
      if (flag) {
        try {
          const g = await api.getMyGuild();
          if (cancelled) return;
          apply(g);
          if (!g) await markMember(false);
        } catch (e) {
          if (!cancelled) {
            setError(asCode(e));
            setStatus("none");
          }
        }
      } else {
        setStatus("none");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, apply, markMember]);

  /** collects goods friends sent, as many as the warehouse has room for */
  const collectDeliveries = useCallback(async () => {
    if (!api || live.current.room <= 0) return;
    const got = await api.claimDeliveries(live.current.room);
    for (const d of got) guildGoodsIn(d.goodId as GoodId, d.qty, d.fromName);
  }, [api, guildGoodsIn]);

  /** reports finished trades since the last report and refreshes the profile */
  const sync = useCallback(async () => {
    if (!api) return;
    try {
      const raw = await AsyncStorage.getItem(BASELINE_KEY);
      const baseline = raw === null ? live.current.trades : Number(raw);
      const delta = live.current.trades - baseline;
      if (delta > 0) await api.reportContribution(delta);
      if (delta > 0 || raw === null) await setBaseline(live.current.trades);
      await api.syncProfile({
        displayName: live.current.name,
        rankIndex: live.current.rank,
        netWorth: live.current.netWorth,
      });
      await collectDeliveries();
      apply(await api.getMyGuild());
    } catch (e) {
      setError(asCode(e));
    }
  }, [api, apply, setBaseline, collectDeliveries]);

  const inGuild = status === "in";
  useEffect(() => {
    if (!inGuild) return;
    void sync();
    const id = setInterval(() => void sync(), SYNC_MS);
    return () => clearInterval(id);
  }, [inGuild, sync]);

  useEffect(() => {
    if (!hubOpen || !inGuild) return;
    const id = setInterval(() => void refresh(), HUB_REFRESH_MS);
    return () => clearInterval(id);
  }, [hubOpen, inGuild, refresh]);

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(asCode(e));
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const value = useMemo<GuildContextValue>(
    () => ({
      status,
      guild,
      error,
      busy,
      hubOpen,
      openHub: () => {
        setHubOpen(true);
        if (remembered) void collectDeliveries().then(refresh);
      },
      closeHub: () => setHubOpen(false),
      refresh,
      clearError: () => setError(null),
      create: async (name) => {
        if (!api) return false;
        const g = await run(() => api.createGuild(name));
        if (!g) return false;
        await setBaseline(live.current.trades);
        await markMember(true);
        apply(g);
        return true;
      },
      join: async (code) => {
        if (!api) return false;
        const g = await run(() => api.joinGuild(code));
        if (!g) return false;
        await setBaseline(live.current.trades);
        await markMember(true);
        apply(g);
        return true;
      },
      leave: async () => {
        if (!api) return;
        // run() gives back null when the call failed: stay in the guild then
        if ((await run(() => api.leaveGuild())) === null) return;
        try {
          await AsyncStorage.removeItem(BASELINE_KEY);
        } catch {
          // nothing to clean up
        }
        await markMember(false);
        apply(null);
      },
      report: async (reason) => {
        if (!api) return false;
        return (await run(() => api.reportGuild(reason))) !== null;
      },
      cheer: async (toUserId, emote) => {
        if (!api) return;
        await run(() => api.sendCheer(toUserId, emote));
        await refresh();
      },
      donate: async (qty) => {
        if (!api || !guild) return;
        const goodId = guild.order.goodId as GoodId;
        const amount = Math.min(Math.floor(qty), live.current.held[goodId] ?? 0);
        if (amount <= 0) return;
        const accepted = await run(() => api.donateToOrder(amount));
        // take from the player only what the server accepted
        if (accepted && accepted > 0) guildGoodsOut(goodId, accepted, "order");
        await refresh();
      },
      claimOrder: async () => {
        if (!api) return;
        const took = await run(() => api.claimOrderReward());
        if (took) grantGuildReward(guildRewardFor(live.current.rank, live.current.streak));
        await refresh();
      },
      requestGood: async (goodId, qty) => {
        if (!api) return false;
        const ok = (await run(() => api.createRequest(goodId, qty))) !== null;
        await refresh();
        return ok;
      },
      cancelRequest: async () => {
        if (!api) return;
        await run(() => api.cancelRequest());
        await refresh();
      },
      fulfill: async (requestId, goodId, qty) => {
        if (!api) return;
        const amount = Math.min(Math.floor(qty), live.current.held[goodId] ?? 0);
        if (amount <= 0) return;
        const accepted = await run(() => api.fulfillRequest(requestId, amount));
        if (accepted && accepted > 0) guildGoodsOut(goodId, accepted, "friend");
        await refresh();
      },
      claim: async () => {
        if (!api) return;
        const took = await run(() => api.claimWeeklyReward());
        if (took) grantGuildReward(guildRewardFor(live.current.rank, live.current.streak));
        await refresh();
      },
    }),
    [
      status,
      guild,
      error,
      busy,
      hubOpen,
      api,
      remembered,
      refresh,
      collectDeliveries,
      run,
      apply,
      setBaseline,
      markMember,
      grantGuildReward,
      guildGoodsOut,
    ]
  );

  return <GuildContext.Provider value={value}>{children}</GuildContext.Provider>;
}

export function useGuild(): GuildContextValue {
  const ctx = useContext(GuildContext);
  if (!ctx) throw new Error("useGuild must be used within a GuildProvider");
  return ctx;
}
