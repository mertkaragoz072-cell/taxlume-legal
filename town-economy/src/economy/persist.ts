import AsyncStorage from "@react-native-async-storage/async-storage";
import { EconomyState } from "./types";

const STORAGE_KEY = "taxlume-town-economy-save-v1";

export async function loadEconomyState(): Promise<EconomyState | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as EconomyState;
  } catch {
    return null;
  }
}

export async function saveEconomyState(state: EconomyState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
