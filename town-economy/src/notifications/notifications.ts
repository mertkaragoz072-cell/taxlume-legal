import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { GOODS_BY_ID } from "../economy/goods";
import { computeNetWorth, PRESTIGE_UNLOCK_NET_WORTH, TICK_MS } from "../economy/useEconomy";
import { EconomyState } from "../economy/types";
import { TOWNS_BY_ID } from "../economy/towns";
import { t } from "../i18n/t";

const CHANNEL_ID = "town-economy-default";
const UNHAPPY_HAPPINESS_THRESHOLD = 30;
const UNHAPPY_WARNING_DELAY_SEC = 2 * 60 * 60; // 2 hours
const LOAN_REMINDER_DELAY_SEC = 3 * 60 * 60; // 3 hours
const PRESTIGE_READY_DELAY_SEC = 60 * 60; // 1 hour
const DAILY_REMINDER_HOUR = 20;
const MIN_SCHEDULE_SECONDS = 5;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationChannel(language: EconomyState["language"]): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: t(language, "notif.channelName"),
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  } catch {
    // no-op: channels aren't available everywhere (e.g. web preview)
  }
}

async function requestPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const result = await Notifications.requestPermissionsAsync();
    return result.granted;
  } catch {
    return false;
  }
}

async function scheduleSafely(input: Notifications.NotificationRequestInput): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync(input);
  } catch {
    // scheduling isn't available everywhere (e.g. web preview); ignore
  }
}

/**
 * Called when the app goes to the background: schedules local
 * notifications for whatever the player would otherwise miss — caravans
 * arriving, villagers about to revolt, and a reminder to come back for
 * the daily bonus. Cancels anything previously scheduled first so
 * re-backgrounding doesn't stack duplicates.
 */
export async function scheduleBackgroundNotifications(state: EconomyState): Promise<void> {
  const granted = await requestPermission();
  if (!granted) return;

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }

  for (const caravan of state.caravans) {
    const remainingTicks = caravan.arrivesAtTick - state.tick;
    if (remainingTicks <= 0) continue;
    const seconds = Math.max(MIN_SCHEDULE_SECONDS, Math.round((remainingTicks * TICK_MS) / 1000));
    const town = TOWNS_BY_ID[caravan.townId];
    const good = GOODS_BY_ID[caravan.goodId];
    const townName = t(state.language, town.nameKey);
    const goodName = t(state.language, good.nameKey);
    await scheduleSafely({
      content: {
        title: t(state.language, "notif.caravanTitle"),
        body:
          caravan.direction === "export"
            ? t(state.language, "notif.caravanExportBody", { town: townName, qty: caravan.qty, good: goodName })
            : t(state.language, "notif.caravanImportBody", { town: townName, qty: caravan.qty, good: goodName }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false,
      },
    });
  }

  if (state.happiness < UNHAPPY_HAPPINESS_THRESHOLD && state.taxRate > 0 && !state.gameOver) {
    await scheduleSafely({
      content: {
        title: t(state.language, "notif.unhappyTitle"),
        body: t(state.language, "notif.unhappyBody", { happiness: Math.round(state.happiness) }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: UNHAPPY_WARNING_DELAY_SEC,
        repeats: false,
      },
    });
  }

  // A loan just sits there accruing interest while the app is closed — worth
  // a nudge distinct from the general daily reminder.
  if (state.loan && !state.gameOver) {
    await scheduleSafely({
      content: {
        title: t(state.language, "notif.loanTitle"),
        body: t(state.language, "notif.loanBody", {
          amount: Math.round(state.loan.remainingBalance),
        }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: LOAN_REMINDER_DELAY_SEC,
        repeats: false,
      },
    });
  }

  // Prestiging is a deliberate action, not something that happens on its
  // own — unlike the trade/metropol unlocks, a player who hits the net
  // worth bar and then closes the app would otherwise never be told.
  if (!state.gameOver && computeNetWorth(state) >= PRESTIGE_UNLOCK_NET_WORTH) {
    await scheduleSafely({
      content: {
        title: t(state.language, "notif.prestigeReadyTitle"),
        body: t(state.language, "notif.prestigeReadyBody"),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: PRESTIGE_READY_DELAY_SEC,
        repeats: false,
      },
    });
  }

  if (!state.gameOver) {
    // Rotates through whichever context is most relevant right now instead
    // of always showing the same generic line — a streak in progress is
    // the strongest hook, then unfinished daily quests, then a fallback.
    const incompleteDailyQuests = state.dailyQuests.filter((q) => !q.completed).length;
    const dailyReminderBody =
      state.streak.count > 0
        ? t(state.language, "notif.dailyReminderBodyStreak", { count: state.streak.count })
        : incompleteDailyQuests > 0
          ? t(state.language, "notif.dailyReminderBodyQuests", { count: incompleteDailyQuests })
          : t(state.language, "notif.dailyReminderBodyDefault");
    await scheduleSafely({
      content: {
        title: t(state.language, "notif.dailyReminderTitle"),
        body: dailyReminderBody,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: DAILY_REMINDER_HOUR,
        minute: 0,
      },
    });
  }
}

/** Called when the app comes back to the foreground: pending local
 * notifications are no longer needed since the player is here now. */
export async function cancelBackgroundNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}
