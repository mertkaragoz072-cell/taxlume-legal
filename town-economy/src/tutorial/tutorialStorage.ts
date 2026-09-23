import AsyncStorage from "@react-native-async-storage/async-storage";

// Deliberately a separate key from the game save — whether the player
// has seen the tutorial shouldn't reset just because they start a new
// game (RESET) or an old save gets discarded by a version bump.
const TUTORIAL_SEEN_KEY = "taxlume-tutorial-seen-v1";

export async function hasSeenTutorial(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(TUTORIAL_SEEN_KEY)) === "1";
  } catch {
    return true; // fail open: never block play over a storage error
  }
}

export async function markTutorialSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(TUTORIAL_SEEN_KEY, "1");
  } catch {
    // ignore
  }
}
