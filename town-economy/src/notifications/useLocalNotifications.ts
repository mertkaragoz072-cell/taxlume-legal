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
    ensureNotificationChannel(stateRef.current.language);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
