import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";

// Deliberately a separate key from the game save — whether we've already
// asked for a review is a device/install concern, not game state, so it
// shouldn't reset on RESET or a save-version bump.
const REVIEW_PROMPTED_KEY = "taxlume-review-prompted-v1";

/** Ask for a store review at most once per install, and only at a moment
 * the player is likely happy (first prestige, several achievements) — never
 * lets a platform quirk (web has no store, API throws) affect gameplay. */
export async function maybeRequestReview(): Promise<void> {
  try {
    const alreadyPrompted = (await AsyncStorage.getItem(REVIEW_PROMPTED_KEY)) === "1";
    if (alreadyPrompted) return;
    const available = await StoreReview.isAvailableAsync();
    if (!available) return;
    await AsyncStorage.setItem(REVIEW_PROMPTED_KEY, "1");
    await StoreReview.requestReview();
  } catch {
    // best-effort only
  }
}
