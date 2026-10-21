// The game's save code expects a synchronous localStorage-like object. On the phone it is an in-memory copy that is loaded from
// AsyncStorage once at start-up and written back (debounced) after every change, and immediately when the app goes to the background.
import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "firin-kafe:";

export class NativeStorage {
  private data = new Map<string, string>();
  private dirty = new Set<string>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  /** Reads every stored key into memory. Call once before the game starts. */
  async hydrate(): Promise<void> {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
    const pairs = await AsyncStorage.getMany(keys);
    for (const [k, v] of Object.entries(pairs)) if (v != null) this.data.set(k.slice(PREFIX.length), v);
  }

  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  setItem(key: string, value: string): void { this.data.set(key, String(value)); this.touch(key); }
  removeItem(key: string): void { this.data.delete(key); this.touch(key); }
  get length(): number { return this.data.size; }

  private touch(key: string) {
    this.dirty.add(key);
    if (!this.timer) this.timer = setTimeout(() => { void this.flush(); }, 400);
  }

  /** Writes pending changes now (called when the app is backgrounded). */
  async flush(): Promise<void> {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    const keys = [...this.dirty]; this.dirty.clear();
    const set: Record<string, string> = {}, del: string[] = [];
    for (const k of keys) { const v = this.data.get(k); if (v === undefined) del.push(PREFIX + k); else set[PREFIX + k] = v; }
    try {
      if (Object.keys(set).length) await AsyncStorage.setMany(set);
      if (del.length) await AsyncStorage.removeMany(del);
    } catch (e) { for (const k of keys) this.dirty.add(k); console.warn("[storage]", String(e)); }
  }
}
