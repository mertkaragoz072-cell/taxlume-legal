// Phone reminders (expo-notifications): scheduled when the app goes to the background, cleared when it comes back. What to schedule comes from
// game/notify-plan.js. Everything here is best effort: a missing module (web, an old build) or a refused permission simply means no reminders.
import { Platform } from "react-native";
import { planNotifications } from "../game/notify-plan.js";

let N: any = null;
function mod() {
  if (Platform.OS === "web") return null;
  if (N) return N;
  try { N = require("expo-notifications"); N.setNotificationHandler?.({ handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false }) }); } catch { N = null; }
  return N;
}

/** Asks for permission once (iOS shows its own dialog). Returns true when reminders may be shown. */
export async function askPermission(): Promise<boolean> {
  const n = mod();
  if (!n) return false;
  try {
    const cur = await n.getPermissionsAsync();
    if (cur.granted) return true;
    if (!cur.canAskAgain) return false;
    const r = await n.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
    return !!r.granted;
  } catch { return false; }
}

/** Clears every reminder (the player is back). */
export async function clearReminders() {
  const n = mod();
  if (!n) return;
  try { await n.cancelAllScheduledNotificationsAsync(); } catch { /* ignore */ }
}

/** Schedules the reminders for the game as it is now (called when the app goes to the background). */
export async function scheduleReminders(game: any) {
  const n = mod();
  if (!n) return;
  try {
    const perm = await n.getPermissionsAsync();
    if (!perm.granted) return;
    await n.cancelAllScheduledNotificationsAsync();
    if (Platform.OS === "android") await n.setNotificationChannelAsync?.("reminders", { name: "Hatırlatmalar", importance: n.AndroidImportance?.DEFAULT ?? 3 });
    for (const p of planNotifications(game)) {
      await n.scheduleNotificationAsync({
        content: { title: p.title, body: p.body, sound: false },
        trigger: { type: n.SchedulableTriggerInputTypes?.TIME_INTERVAL ?? "timeInterval", seconds: p.seconds, repeats: false, ...(Platform.OS === "android" ? { channelId: "reminders" } : {}) },
      });
    }
  } catch { /* reminders are optional */ }
}
