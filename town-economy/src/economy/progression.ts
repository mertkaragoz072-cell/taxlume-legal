/** The progression appliers: the checks that run after every action and grant
 * whatever the new state has just earned — achievements, the trade/metropol/
 * legendary/mythic tier unlocks, town ranks, and daily and mini quest
 * completion.
 *
 * Each takes a state and returns it unchanged when nothing was earned, so the
 * reducer can chain them without caring which one fired. */

import { ACHIEVEMENTS } from "./achievements";
import { MINI_QUEST_TEMPLATES_BY_ID } from "./miniQuests";
import { QUEST_TEMPLATES_BY_ID } from "./quests";
import {
  townRankBeyondCount,
  townRankIcon,
  townRankIndexForNetWorth,
  townRankNameKey,
  townRankReward,
} from "./townRanks";
import { t } from "../i18n/t";
import { formatCompactNumber as formatNumberUtil } from "../utils/formatNumber";
import { EconomyEvent, EconomyState } from "./types";
import { EVENT_LOG_CAP, LEGENDARY_UNLOCK_PRESTIGE_LEVEL, MYTHIC_UNLOCK_LEGENDARY_POINTS } from "./constants";
import { computeNetWorth, effectiveMetropolUnlockNetWorth, effectiveTradeUnlockNetWorth } from "./formulas";

export function applyAchievements(state: EconomyState): EconomyState {
  const netWorth = computeNetWorth(state);
  const newlyUnlocked = ACHIEVEMENTS.filter(
    (a) => !state.unlockedAchievements.includes(a.id) && a.progress(state, netWorth) >= a.target
  );
  if (newlyUnlocked.length === 0) return state;

  let nextId = state.nextId;
  let cash = state.cash;
  const newEvents: EconomyEvent[] = [];
  for (const a of newlyUnlocked) {
    cash += a.reward;
    newEvents.push({
      id: nextId++,
      message: t(state.language, "msg.achievementUnlocked", {
        icon: a.icon,
        title: t(state.language, a.titleKey),
        reward: a.reward,
      }),
      tone: "good",
    });
  }

  return {
    ...state,
    cash,
    nextId,
    unlockedAchievements: [...state.unlockedAchievements, ...newlyUnlocked.map((a) => a.id)],
    lastEvent: newEvents[newEvents.length - 1],
    eventLog: [...newEvents].reverse().concat(state.eventLog).slice(0, EVENT_LOG_CAP),
  };
}
export function applyTradeUnlock(state: EconomyState): EconomyState {
  if (state.tradeUnlocked) return state;
  if (computeNetWorth(state) < effectiveTradeUnlockNetWorth(state)) return state;

  const event: EconomyEvent = {
    id: state.nextId,
    message: t(state.language, "msg.tradeUnlocked"),
    tone: "good",
  };
  return {
    ...state,
    tradeUnlocked: true,
    nextId: state.nextId + 1,
    lastEvent: event,
    eventLog: [event, ...state.eventLog].slice(0, EVENT_LOG_CAP),
  };
}
export function applyMetropolUnlock(state: EconomyState): EconomyState {
  if (state.metropolUnlocked) return state;
  if (computeNetWorth(state) < effectiveMetropolUnlockNetWorth(state)) return state;

  const event: EconomyEvent = {
    id: state.nextId,
    message: t(state.language, "msg.metropolUnlocked"),
    tone: "good",
  };
  return {
    ...state,
    metropolUnlocked: true,
    nextId: state.nextId + 1,
    lastEvent: event,
    eventLog: [event, ...state.eventLog].slice(0, EVENT_LOG_CAP),
  };
}
// Unlike every other content gate, this one tracks prestigeLevel (a
// permanent counter that survives every reset) rather than the current
// run's net worth — so once earned, the legendary trading partner (see
// towns.ts) stays open from tick one of every future run too.
export function applyLegendaryUnlock(state: EconomyState): EconomyState {
  if (state.legendaryUnlocked) return state;
  if (state.prestigeLevel < LEGENDARY_UNLOCK_PRESTIGE_LEVEL) return state;

  const event: EconomyEvent = {
    id: state.nextId,
    message: t(state.language, "msg.legendaryUnlocked"),
    tone: "good",
  };
  return {
    ...state,
    legendaryUnlocked: true,
    nextId: state.nextId + 1,
    lastEvent: event,
    eventLog: [event, ...state.eventLog].slice(0, EVENT_LOG_CAP),
  };
}
// Same sticky-milestone shape as applyLegendaryUnlock, one tier up — tracks
// legendaryPoints (a currency that itself only accrues post-legendary)
// rather than prestigeLevel directly.
export function applyMythicUnlock(state: EconomyState): EconomyState {
  if (state.mythicUnlocked) return state;
  if (state.legendaryPoints < MYTHIC_UNLOCK_LEGENDARY_POINTS) return state;

  const event: EconomyEvent = {
    id: state.nextId,
    message: t(state.language, "msg.mythicUnlocked"),
    tone: "good",
  };
  return {
    ...state,
    mythicUnlocked: true,
    nextId: state.nextId + 1,
    lastEvent: event,
    eventLog: [event, ...state.eventLog].slice(0, EVENT_LOG_CAP),
  };
}
// Sticky, endless net-worth milestone ladder (see townRanks.ts) — checked
// every action like an achievement, but unlike achievements a single big
// jump in net worth (e.g. a long offline catch-up) can clear several
// tiers at once, so every skipped tier's reward is paid out, not just the
// one landed on.
export function applyTownRankUp(state: EconomyState): EconomyState {
  const targetIndex = townRankIndexForNetWorth(computeNetWorth(state));
  if (targetIndex <= state.townRankIndex) return state;

  let nextId = state.nextId;
  let cash = state.cash;
  const newEvents: EconomyEvent[] = [];
  for (let index = state.townRankIndex + 1; index <= targetIndex; index++) {
    const reward = townRankReward(index);
    cash += reward;
    const beyond = townRankBeyondCount(index);
    const title =
      beyond > 0
        ? t(state.language, "townRank.beyondTitle", {
            base: t(state.language, townRankNameKey(index)),
            n: beyond + 1,
          })
        : t(state.language, townRankNameKey(index));
    newEvents.push({
      id: nextId++,
      message: t(state.language, "msg.townRankUp", {
        icon: townRankIcon(index),
        title,
        reward: formatNumberUtil(reward, state.language),
      }),
      tone: "good",
    });
  }

  return {
    ...state,
    cash,
    nextId,
    townRankIndex: targetIndex,
    lastEvent: newEvents[newEvents.length - 1],
    eventLog: [...newEvents].reverse().concat(state.eventLog).slice(0, EVENT_LOG_CAP),
  };
}
export function applyDailyQuests(state: EconomyState): EconomyState {
  const newlyCompleted = state.dailyQuests.filter((q) => {
    if (q.completed) return false;
    const template = QUEST_TEMPLATES_BY_ID[q.templateId];
    return !!template && template.progress(state.dailyProgress) >= q.target;
  });
  if (newlyCompleted.length === 0) return state;

  let nextId = state.nextId;
  let cash = state.cash;
  const newEvents: EconomyEvent[] = [];
  const completedIds = new Set(newlyCompleted.map((q) => q.id));
  for (const q of newlyCompleted) {
    const template = QUEST_TEMPLATES_BY_ID[q.templateId];
    cash += q.reward;
    newEvents.push({
      id: nextId++,
      message: t(state.language, "msg.questCompleted", {
        icon: template.icon,
        title: t(state.language, template.titleKey),
        reward: q.reward,
      }),
      tone: "good",
    });
  }

  return {
    ...state,
    cash,
    nextId,
    dailyQuests: state.dailyQuests.map((q) => (completedIds.has(q.id) ? { ...q, completed: true } : q)),
    lastEvent: newEvents[newEvents.length - 1],
    eventLog: [...newEvents].reverse().concat(state.eventLog).slice(0, EVENT_LOG_CAP),
  };
}
// Only checks completion/expiry of the active mini quest — the random
// spawn roll lives in tick() itself so it fires once per real tick, not
// once per player action (this runs after every action, like the other
// applyX post-processing steps).
export function applyMiniQuest(state: EconomyState): EconomyState {
  const mq = state.activeMiniQuest;
  if (!mq) return state;
  const template = MINI_QUEST_TEMPLATES_BY_ID[mq.templateId];
  if (!template) return { ...state, activeMiniQuest: null };

  const progress = template.metric(state.dailyProgress) - mq.baseline;
  if (progress >= mq.target) {
    const event: EconomyEvent = {
      id: state.nextId,
      message: t(state.language, "msg.miniQuestCompleted", {
        icon: template.icon,
        title: t(state.language, template.titleKey),
        reward: mq.reward,
      }),
      tone: "good",
    };
    return {
      ...state,
      cash: state.cash + mq.reward,
      activeMiniQuest: null,
      nextId: state.nextId + 1,
      lastEvent: event,
      eventLog: [event, ...state.eventLog].slice(0, EVENT_LOG_CAP),
    };
  }

  if (state.tick >= mq.expiresAtTick) {
    const event: EconomyEvent = {
      id: state.nextId,
      message: t(state.language, "msg.miniQuestExpired", {
        icon: template.icon,
        title: t(state.language, template.titleKey),
      }),
      tone: "neutral",
    };
    return {
      ...state,
      activeMiniQuest: null,
      nextId: state.nextId + 1,
      lastEvent: event,
      eventLog: [event, ...state.eventLog].slice(0, EVENT_LOG_CAP),
    };
  }

  return state;
}
