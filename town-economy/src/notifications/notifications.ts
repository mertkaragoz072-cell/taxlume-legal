import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { GOODS_BY_ID } from "../economy/goods";
import { TICK_MS } from "../economy/useEconomy";
import { EconomyState } from "../economy/types";
import { TOWNS_BY_ID } from "../economy/towns";

const CHANNEL_ID = "town-economy-default";
const UNHAPPY_HAPPINESS_THRESHOLD = 30;
const UNHAPPY_WARNING_DELAY_SEC = 2 * 60 * 60; // 2 hours
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

export async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Kasaba Bildirimleri",
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
    await scheduleSafely({
      content: {
        title: "🚚 Kervan geldi!",
        body:
          caravan.direction === "export"
            ? `${town.name}'a gönderdiğin ${caravan.qty} ${good.name} satıldı.`
            : `${town.name}'dan ${caravan.qty} ${good.name} teslim edildi.`,
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
        title: "😡 Köylüler sinirli!",
        body: "Vergi oranını düşürmezsen isyan çıkabilir. Kasabana göz at.",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: UNHAPPY_WARNING_DELAY_SEC,
        repeats: false,
      },
    });
  }

  if (!state.gameOver) {
    await scheduleSafely({
      content: {
        title: "🏘️ Kasaban seni bekliyor",
        body: "Günlük bonusunu almayı ve piyasayı kontrol etmeyi unutma!",
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
