import { clamp } from '../core/math';
import { HOME_ROOMS, type HomeRoom, type LocationId } from '../core/types';
import { ITEMS, START_INVENTORY } from '../data/items';
import { createNewGame, SAVE_VERSION, type GameState } from '../simulation/state';

export interface SaveEnvelope {
  version: number;
  savedAt: number;
  state: unknown;
}

/** Platform storage behind an interface so Capacitor/native can replace IndexedDB. */
export interface SaveStorage {
  read(key: string): Promise<string | null>;
  write(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export class MemoryStorage implements SaveStorage {
  data = new Map<string, string>();
  async read(k: string) {
    return this.data.get(k) ?? null;
  }
  async write(k: string, v: string) {
    this.data.set(k, v);
  }
  async remove(k: string) {
    this.data.delete(k);
  }
}

/** Migrations: index i upgrades version i+1 → i+2 (operating on raw parsed state). */
export const MIGRATIONS: Array<(raw: Record<string, unknown>) => Record<string, unknown>> = [
  // v1 → v2: the active workout becomes part of the saved state (v1 had none).
  (raw) => ({ ...raw, workout: null }),
  // v2 → v3: rooms, inventory (starter household), activity log, skills, sleep record.
  (raw) => ({ ...raw, room: 'bedroom', inventory: { ...START_INVENTORY }, activityLog: [], skills: { office: 0 }, sleep: { lastQuality: 0, lastWakeTime: 0 } }),
];

export function migrate(raw: Record<string, unknown>, fromVersion: number): Record<string, unknown> {
  let s = raw;
  for (let v = fromVersion; v < SAVE_VERSION; v++) {
    const step = MIGRATIONS[v - 1];
    if (!step) throw new Error(`No migration from version ${v}`);
    s = step(s);
  }
  return s;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback: number, lo = -Infinity, hi = Infinity): number =>
  typeof v === 'number' && Number.isFinite(v) ? clamp(v, lo, hi) : fallback;

/**
 * Rebuild a trustworthy GameState from untrusted data: every field is
 * type-checked and clamped, missing fields fall back to new-game defaults.
 */
export function sanitize(raw: unknown): GameState {
  const d = createNewGame();
  if (!isObj(raw)) throw new Error('Save is not an object');
  const c = isObj(raw.character) ? raw.character : {};
  const g = isObj(raw.gym) ? raw.gym : {};
  const dc = d.character;
  const lifts: GameState['gym']['lifts'] = {};
  if (isObj(g.lifts)) {
    for (const [k, v] of Object.entries(g.lifts)) {
      if (k === 'bench' && isObj(v)) {
        lifts.bench = {
          bestWeight: num(v.bestWeight, 0, 0, 1000),
          lastWeight: num(v.lastWeight, 0, 0, 1000),
          totalReps: Math.floor(num(v.totalReps, 0, 0, 1e7)),
          totalSets: Math.floor(num(v.totalSets, 0, 0, 1e7)),
          bestWorkingWeight: num(v.bestWorkingWeight, 0, 0, 1000),
        };
      }
    }
  }
  const w = isObj(raw.workout) ? raw.workout : null;
  const workout: GameState['workout'] =
    w && w.exercise === 'bench'
      ? {
          exercise: 'bench',
          phase: w.phase === 'ready' ? 'ready' : 'rest',
          weight: num(w.weight, 25, 20, 200),
          targetReps: Math.floor(num(w.targetReps, 8, 1, 30)),
          // A set in progress cannot be resumed: its reps were already banked or are dropped on restore.
          setReps: Math.floor(num(w.setReps, 0, 0, 30)),
          setActive: w.setActive === true,
          completedSets: Math.floor(num(w.completedSets, 0, 0, 1000)),
          totalReps: Math.floor(num(w.totalReps, 0, 0, 100000)),
          xpEarned: num(w.xpEarned, 0, 0),
          energySpent: num(w.energySpent, 0, 0),
          seconds: num(w.seconds, 0, 0),
          strengthBefore: num(w.strengthBefore, dc.strength, 0, 100),
          enduranceBefore: num(w.enduranceBefore, dc.endurance, 0, 100),
          levelBefore: Math.floor(num(w.levelBefore, dc.level, 1, 999)),
        }
      : null;
  const inventory: Record<string, number> = {};
  if (isObj(raw.inventory)) {
    for (const [k, v] of Object.entries(raw.inventory)) {
      if (k in ITEMS && typeof v === 'number' && Number.isFinite(v) && v >= 1) inventory[k] = Math.min(999, Math.floor(v));
    }
  } else {
    Object.assign(inventory, START_INVENTORY);
  }
  const activityLog = (Array.isArray(raw.activityLog) ? raw.activityLog : [])
    .filter(isObj)
    .map((a) => ({ id: typeof a.id === 'string' ? a.id.slice(0, 32) : '', time: num(a.time, 0, 0) }))
    .filter((a) => a.id)
    .slice(-100);
  const txs = Array.isArray(raw.transactions) ? raw.transactions : [];
  const transactions = txs.filter(isObj).map((t) => ({
    id: Math.floor(num(t.id, 0)),
    time: num(t.time, 0, 0),
    amount: Math.floor(num(t.amount, 0)),
    category: (typeof t.category === 'string' ? t.category : 'other') as GameState['transactions'][number]['category'],
    description: typeof t.description === 'string' ? t.description.slice(0, 80) : '',
    balanceAfter: Math.floor(num(t.balanceAfter, 0)),
  }));
  const nextId = Math.max(Math.floor(num(raw.nextTransactionId, 1, 1)), ...transactions.map((t) => t.id + 1), 1);
  return {
    version: SAVE_VERSION,
    time: num(raw.time, d.time, 0),
    location: (raw.location === 'gym' ? 'gym' : 'home') as LocationId,
    room: (HOME_ROOMS as string[]).includes(raw.room as string) ? (raw.room as HomeRoom) : 'bedroom',
    character: {
      name: typeof c.name === 'string' ? c.name.slice(0, 24) : dc.name,
      level: Math.floor(num(c.level, dc.level, 1, 999)),
      xp: num(c.xp, 0, 0),
      health: num(c.health, dc.health, 0, 100),
      energy: num(c.energy, dc.energy, 0, 100),
      hunger: num(c.hunger, dc.hunger, 0, 100),
      hydration: num(c.hydration, dc.hydration, 0, 100),
      sleepiness: num(c.sleepiness, dc.sleepiness, 0, 100),
      happiness: num(c.happiness, dc.happiness, 0, 100),
      wellbeing: num(c.wellbeing, dc.wellbeing, 0, 100),
      strength: num(c.strength, dc.strength, 0, 100),
      endurance: num(c.endurance, dc.endurance, 0, 100),
      fitness: num(c.fitness, dc.fitness, 0, 100),
    },
    money: Math.floor(num(raw.money, d.money, 0)),
    transactions,
    nextTransactionId: nextId,
    gym: {
      membershipUntil: num(g.membershipUntil, 0, 0),
      fatigue: num(g.fatigue, 0, 0, 100),
      lifts,
      totalWorkoutSeconds: num(g.totalWorkoutSeconds, 0, 0),
      totalXpEarned: num(g.totalXpEarned, 0, 0),
    },
    workout,
    inventory,
    activityLog,
    skills: { office: isObj(raw.skills) ? num(raw.skills.office, 0, 0, 100) : 0 },
    sleep: {
      lastQuality: isObj(raw.sleep) ? num(raw.sleep.lastQuality, 0, 0, 1.5) : 0,
      lastWakeTime: isObj(raw.sleep) ? num(raw.sleep.lastWakeTime, 0, 0) : 0,
    },
    unlockedLocations: ['home', 'gym'],
    flags: isObj(raw.flags) ? Object.fromEntries(Object.entries(raw.flags).filter(([, v]) => typeof v === 'boolean')) as Record<string, boolean> : {},
  };
}

const MAIN = 'lifesim.save';
const BACKUP = 'lifesim.save.backup';
const CORRUPT = 'lifesim.save.corrupt';

export type LoadResult = { state: GameState; source: 'save' | 'backup' | 'new'; recovered: boolean };

export class SaveManager {
  constructor(private storage: SaveStorage) {}

  serialize(state: GameState, now = Date.now()): string {
    const env: SaveEnvelope = { version: SAVE_VERSION, savedAt: now, state };
    return JSON.stringify(env);
  }

  /** Parse + migrate + sanitize one raw string. Throws on unusable data. */
  parse(text: string): GameState {
    const env = JSON.parse(text) as unknown;
    if (!isObj(env) || typeof env.version !== 'number' || !isObj(env.state)) throw new Error('Bad save envelope');
    if (env.version > SAVE_VERSION) throw new Error('Save is from a newer game version');
    return sanitize(migrate(env.state, env.version));
  }

  async save(state: GameState): Promise<void> {
    const prev = await this.storage.read(MAIN);
    if (prev) await this.storage.write(BACKUP, prev);
    await this.storage.write(MAIN, this.serialize(state));
  }

  async load(): Promise<LoadResult> {
    const main = await this.storage.read(MAIN);
    if (main === null) return { state: createNewGame(), source: 'new', recovered: false };
    try {
      return { state: this.parse(main), source: 'save', recovered: false };
    } catch {
      await this.storage.write(CORRUPT, main); // keep for manual inspection
      const backup = await this.storage.read(BACKUP);
      if (backup) {
        try {
          return { state: this.parse(backup), source: 'backup', recovered: true };
        } catch {
          /* fall through */
        }
      }
      return { state: createNewGame(), source: 'new', recovered: true };
    }
  }

  async reset(): Promise<void> {
    await this.storage.remove(MAIN);
    await this.storage.remove(BACKUP);
  }
}
