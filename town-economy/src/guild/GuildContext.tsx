import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useEconomyContext } from "../economy/EconomyContext";
import { getGuildApi } from "./getGuildApi";
import { guildRewardFor } from "./reward";
import { CheerEmote, GuildApi, GuildErrorCode, GuildError, GuildInfo } from "./types";

const BASELINE_KEY = "guild.baseline.v1";
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
  cheer: (toUserId: string, emote: CheerEmote) => Promise<void>;
  claim: () => Promise<void>;
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
  const { state, netWorth, grantGuildReward } = useEconomyContext();
  const api = useMemo(() => (apiProp !== undefined ? apiProp : getGuildApi()), [apiProp]);
  const [status, setStatus] = useState<Status>(api ? "loading" : "unavailable");
  const [guild, setGuild] = useState<GuildInfo | null>(null);
  const [error, setError] = useState<GuildErrorCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [hubOpen, setHubOpen] = useState(false);

  // latest game numbers for the background sync, without restarting its timer
  const live = useRef({ trades: 0, name: "", rank: 0, netWorth: 0 });
  live.current = {
    trades: state.stats.totalTrades,
    name: state.townName,
    rank: state.townRankIndex,
    netWorth,
  };

  const apply = useCallback((g: GuildInfo | null) => {
    setGuild(g);
    setStatus(g ? "in" : "none");
  }, []);

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

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
      apply(await api.getMyGuild());
    } catch (e) {
      setError(asCode(e));
    }
  }, [api, apply, setBaseline]);

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
        void refresh();
      },
      closeHub: () => setHubOpen(false),
      refresh,
      clearError: () => setError(null),
      create: async (name) => {
        if (!api) return false;
        const g = await run(() => api.createGuild(name));
        if (!g) return false;
        await setBaseline(live.current.trades);
        apply(g);
        return true;
      },
      join: async (code) => {
        if (!api) return false;
        const g = await run(() => api.joinGuild(code));
        if (!g) return false;
        await setBaseline(live.current.trades);
        apply(g);
        return true;
      },
      leave: async () => {
        if (!api) return;
        await run(() => api.leaveGuild());
        try {
          await AsyncStorage.removeItem(BASELINE_KEY);
        } catch {
          // nothing to clean up
        }
        apply(null);
      },
      cheer: async (toUserId, emote) => {
        if (!api) return;
        await run(() => api.sendCheer(toUserId, emote));
        await refresh();
      },
      claim: async () => {
        if (!api) return;
        const took = await run(() => api.claimWeeklyReward());
        if (took) grantGuildReward(guildRewardFor(live.current.rank));
        await refresh();
      },
    }),
    [status, guild, error, busy, hubOpen, api, refresh, run, apply, setBaseline, grantGuildReward]
  );

  return <GuildContext.Provider value={value}>{children}</GuildContext.Provider>;
}

export function useGuild(): GuildContextValue {
  const ctx = useContext(GuildContext);
  if (!ctx) throw new Error("useGuild must be used within a GuildProvider");
  return ctx;
}
