import AsyncStorage from "@react-native-async-storage/async-storage";
import { EconomyState } from "./types";
import { ASSETS } from "./assets";
import { backfillHistory } from "./priceHistory";

const STORAGE_KEY = "taxlume-town-economy-save-v1";
// Bump whenever EconomyState's shape changes in a way older saves can't
// satisfy — an outdated save is discarded rather than crashing the app.
export const SAVE_VERSION = 59;

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
    // Assets added after a save was written (new investment types) start fresh
    // instead of being undefined.
    for (const a of ASSETS) {
      if (!parsed.state.assets[a.id]) {
        parsed.state.assets[a.id] = {
          price: a.basePrice,
          history: backfillHistory(a.id, a.basePrice),
          holding: 0,
          avgCost: 0,
        };
      }
    }
    // The Turkish game used to call itself "Altın Kasaba", and that was the
    // default name of every town; the game is Golden Town in both languages now.
    if (parsed.state.townName === "Altın Kasaba") return { ...parsed.state, townName: "Golden Town" };
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
