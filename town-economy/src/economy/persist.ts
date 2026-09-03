import AsyncStorage from "@react-native-async-storage/async-storage";
import { EconomyState } from "./types";

const STORAGE_KEY = "taxlume-town-economy-save-v1";
// Bump whenever EconomyState's shape changes in a way older saves can't
// satisfy — an outdated save is discarded rather than crashing the app.
const SAVE_VERSION = 13;

interface SaveFile {
  version: number;
  state: EconomyState;
}

export async function loadEconomyState(): Promise<EconomyState | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SaveFile;
    if (parsed.version !== SAVE_VERSION) return null;
    return parsed.state;
  } catch {
    return null;
  }
}

export async function saveEconomyState(state: EconomyState): Promise<void> {
  try {
    const file: SaveFile = { version: SAVE_VERSION, state };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(file));
  } catch {
    // best-effort persistence; ignore write failures (e.g. full storage)
  }
}

export async function clearEconomyState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
