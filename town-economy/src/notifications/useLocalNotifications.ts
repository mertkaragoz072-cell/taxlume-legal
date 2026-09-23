import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { EconomyState } from "../economy/types";
import {
  cancelBackgroundNotifications,
  ensureNotificationChannel,
  scheduleBackgroundNotifications,
} from "./notifications";

/**
 * Schedules local notifications (caravan arrivals, an unhappy-villager
 * warning, a daily comeback reminder) whenever the app backgrounds, and
 * clears them when it comes back — the offline-progress summary already
 * covers "what happened" once the player reopens the app, so pending
 * notifications from a session that's now active would be redundant.
 */
export function useLocalNotifications(state: EconomyState) {
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    // Mount-only on purpose: the channel is created once, and the language
    // is read through stateRef so a later switch does not recreate it.
    ensureNotificationChannel(stateRef.current.language);
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "active") {
        cancelBackgroundNotifications();
      } else if (next === "background") {
        scheduleBackgroundNotifications(stateRef.current);
      }
    });
    return () => subscription.remove();
  }, []);
}
