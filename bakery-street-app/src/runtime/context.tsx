import React, { createContext, useContext, useEffect, useState } from "react";
import type { SceneId, World } from "./world";

/** What the panels can ask of the app shell. */
export interface Actions {
  toast: (text: string, ms?: number) => void;
  /** a warning: toast + error sound + buzz */
  warn: (text: string, ms?: number) => void;
  sfx: (name: string) => void;
  buzz: (pattern?: number | number[]) => void;
  go: (id: SceneId) => void;
  openOverlay: (id: "quests" | "daily" | "settings" | "town" | "shop" | null) => void;
  /** Opens the shop (optionally on a tab: goal | ingredients | equipment | furniture | recipes | expansion | special). */
  openShop: (tab?: string) => void;
  /** Hides the shop sheet for a moment so a new item can be seen in the café. */
  peek: (ms?: number) => void;
  closePanel: () => void;
}
const Ctx = createContext<{ world: World; act: Actions } | null>(null);
export const WorldProvider = ({ world, act, children }: { world: World; act: Actions; children: React.ReactNode }) => <Ctx.Provider value={{ world, act }}>{children}</Ctx.Provider>;
export function useWorld() {
  const v = useContext(Ctx);
  if (!v) throw new Error("WorldProvider missing");
  return v;
}

/** Re-renders the component when the game changes (throttled to ~12 per second) and, optionally, on a timer for countdowns. */
export function useRefresh(everyMs = 0, events: string[] = ["change", "levelUp", "exploreReady"]) {
  const { world } = useWorld();
  const [, set] = useState(0);
  useEffect(() => {
    let pending: ReturnType<typeof setTimeout> | null = null;
    const bump = () => { if (!pending) pending = setTimeout(() => { pending = null; set((n) => n + 1); }, 80); };
    const offs = events.map((e) => world.game.on(e, bump));
    const timer = everyMs ? setInterval(() => set((n) => n + 1), everyMs) : null;
    return () => { offs.forEach((o: any) => o?.()); if (timer) clearInterval(timer); if (pending) clearTimeout(pending); };
  }, [world, everyMs]);   // eslint-disable-line react-hooks/exhaustive-deps
}
