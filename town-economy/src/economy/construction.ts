import { eventFields } from "../i18n/t";
import { researchCost } from "./formulas";
import { PROPERTIES_BY_ID } from "./properties";
import { RESEARCH_NODES_BY_ID } from "./research";
import { EconomyEvent, EconomyState, UpgradeId } from "./types";
import { UPGRADES_BY_ID, upgradeCost } from "./upgrades";

/** Upgrades, properties and research are not instant: you pay, then wait, and it
 * is done when the time is up (also while the game is closed, the clock is the
 * real one). Short at the start, longer as the things get bigger, never long
 * enough to make a player put the game down. A rewarded ad takes five minutes
 * off, or finishes it outright when five minutes or less are left. */
export type ImprovementKind = "upgrade" | "property" | "research";

export interface PendingImprovement {
  kind: ImprovementKind;
  /** upgrade id, property id or research node id */
  ref: string;
  startedAt: number;
  readyAt: number;
}

export const IMPROVEMENT_MIN_MS = 10_000;
export const IMPROVEMENT_MAX_MS = 30 * 60_000;
/** What one rewarded ad takes off a waiting improvement. */
export const AD_SKIP_MS = 5 * 60_000;
const EVENT_LOG_CAP = 30;

/** How long something that costs `cost` coins takes to build: 10 s for the
 * cheapest, then roughly 20 s, 30 s, 50 s, 1½ min, 5 min, 12 min ... capped at
 * half an hour. Rounded to friendly steps (5 s, 15 s, 1 min). */
export function improvementWaitMs(cost: number): number {
  const seconds = 10 * Math.pow(Math.max(cost, 1) / 100, 0.95);
  const clamped = Math.min(IMPROVEMENT_MAX_MS / 1000, Math.max(IMPROVEMENT_MIN_MS / 1000, seconds));
  const step = clamped < 60 ? 5 : clamped < 300 ? 15 : 60;
  return Math.max(IMPROVEMENT_MIN_MS / 1000, Math.round(clamped / step) * step) * 1000;
}

/** "0:10", "1:30", "12:00", "1:05:00" */
export function formatWait(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

export function pendingList(state: EconomyState): PendingImprovement[] {
  return state.construction ?? [];
}

/** The improvement of this kind that is being built right now, if any. */
export function pendingOf(state: EconomyState, kind: ImprovementKind): PendingImprovement | undefined {
  return pendingList(state).find((p) => p.kind === kind);
}

interface Plan {
  cost: number;
  nameKey: string;
}

/** What starting this improvement would cost, or null when it cannot be started
 * (already done, maxed, locked, one of this kind already in the works, or too
 * poor). The same rules the instant versions had. */
export function planImprovement(state: EconomyState, kind: ImprovementKind, ref: string): Plan | null {
  if (state.gameOver) return null;
  if (pendingOf(state, kind)) return null; // one of each kind at a time
  let plan: Plan;
  if (kind === "upgrade") {
    const def = UPGRADES_BY_ID[ref as UpgradeId];
    if (!def) return null;
    const level = state.upgrades[def.id];
    if (level >= def.maxLevel) return null;
    plan = { cost: upgradeCost(def, level), nameKey: def.nameKey };
  } else if (kind === "property") {
    const def = PROPERTIES_BY_ID[ref];
    if (!def || state.ownedProperties.includes(ref)) return null;
    plan = { cost: def.cost, nameKey: def.nameKey };
  } else {
    const node = RESEARCH_NODES_BY_ID[ref];
    if (!node || state.researched.includes(ref)) return null;
    if (node.requires && !state.researched.includes(node.requires)) return null;
    if (node.requiresRank !== undefined && state.townRankIndex < node.requiresRank) return null;
    plan = { cost: researchCost(state, node), nameKey: node.nameKey };
  }
  return state.cash >= plan.cost ? plan : null;
}

/** Pays and starts the wait. */
export function startImprovement(
  state: EconomyState,
  kind: ImprovementKind,
  ref: string,
  now: number
): EconomyState {
  const plan = planImprovement(state, kind, ref);
  if (!plan) return state;
  return {
    ...state,
    cash: state.cash - plan.cost,
    construction: [
      ...pendingList(state),
      { kind, ref, startedAt: now, readyAt: now + improvementWaitMs(plan.cost) },
    ],
  };
}

/** i18n key of the improvement's name. */
export function improvementNameKey(item: PendingImprovement): string {
  if (item.kind === "upgrade") return UPGRADES_BY_ID[item.ref as UpgradeId]?.nameKey ?? item.ref;
  if (item.kind === "property") return PROPERTIES_BY_ID[item.ref]?.nameKey ?? item.ref;
  return RESEARCH_NODES_BY_ID[item.ref]?.nameKey ?? item.ref;
}

/** What a finished improvement does: exactly what the instant purchase used to. */
function applyDone(state: EconomyState, item: PendingImprovement): EconomyState {
  if (item.kind === "upgrade") {
    const def = UPGRADES_BY_ID[item.ref as UpgradeId];
    if (!def) return state;
    const level = state.upgrades[def.id];
    if (level >= def.maxLevel) return state;
    return {
      ...state,
      upgrades: { ...state.upgrades, [def.id]: level + 1 },
      dailyProgress: { ...state.dailyProgress, upgradesBought: state.dailyProgress.upgradesBought + 1 },
    };
  }
  if (item.kind === "property") {
    if (!PROPERTIES_BY_ID[item.ref] || state.ownedProperties.includes(item.ref)) return state;
    return { ...state, ownedProperties: [...state.ownedProperties, item.ref] };
  }
  if (!RESEARCH_NODES_BY_ID[item.ref] || state.researched.includes(item.ref)) return state;
  return { ...state, researched: [...state.researched, item.ref] };
}

/** Completes every improvement whose time is up. */
export function finishDueImprovements(state: EconomyState, now: number): EconomyState {
  // A phone clock that was moved back after something was started would leave
  // it waiting for hours (the wait is real time): nothing is ever more than the
  // longest wait away, so pull it in.
  const latest = now + IMPROVEMENT_MAX_MS;
  const hasFar = pendingList(state).some((p) => p.readyAt > latest);
  if (hasFar) {
    state = {
      ...state,
      construction: pendingList(state).map((p) => (p.readyAt > latest ? { ...p, readyAt: latest } : p)),
    };
  }
  const list = pendingList(state);
  if (!list.some((p) => p.readyAt <= now)) return state;
  let next = state;
  const events: EconomyEvent[] = [];
  let nextId = state.nextId;
  for (const item of list) {
    if (item.readyAt > now) continue;
    next = applyDone(next, item);
    events.push({
      id: nextId++,
      ...eventFields(state.language, "msg.improvementDone", { name: { key: improvementNameKey(item) } }),
      tone: "good",
    });
  }
  return {
    ...next,
    construction: list.filter((p) => p.readyAt > now),
    nextId,
    lastEvent: events[events.length - 1],
    eventLog: [...events].reverse().concat(next.eventLog).slice(0, EVENT_LOG_CAP),
  };
}

/** A rewarded ad was watched: takes five minutes off this kind's wait, or
 * finishes it when five minutes or less are left. */
export function skipImprovement(state: EconomyState, kind: ImprovementKind, now: number): EconomyState {
  const item = pendingOf(state, kind);
  if (!item) return state;
  const remaining = item.readyAt - now;
  const readyAt = remaining <= AD_SKIP_MS ? now : item.readyAt - AD_SKIP_MS;
  const moved = pendingList(state).map((p) => (p === item ? { ...p, readyAt } : p));
  return finishDueImprovements({ ...state, construction: moved }, now);
}

/** Where an improvement is on its way, 0 to 1. */
export function improvementProgress(item: PendingImprovement, now: number): number {
  const span = Math.max(1, item.readyAt - item.startedAt);
  return Math.max(0, Math.min(1, (now - item.startedAt) / span));
}
