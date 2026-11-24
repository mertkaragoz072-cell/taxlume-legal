import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "taxlume-crash-log-v1";
const MAX = 5;

export interface CrashEntry {
  at: string;
  message: string;
  stack?: string;
}

/** Keeps the last few errors on the device so a bug report can include what
 * actually happened. Local only: nothing is sent anywhere. */
export async function recordCrash(error: unknown): Promise<void> {
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    const prev = await readCrashLog();
    const next: CrashEntry[] = [
      { at: new Date().toISOString(), message: err.message.slice(0, 300), stack: err.stack?.slice(0, 1500) },
      ...prev,
    ].slice(0, MAX);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Already handling a failure; never throw from the logger.
  }
}

export async function readCrashLog(): Promise<CrashEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CrashEntry[]) : [];
  } catch {
    return [];
  }
}
