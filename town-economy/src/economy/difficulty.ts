export type DifficultyId = "easy" | "normal" | "hard";

/** Per-tick odds of a news event, and how hard one lands.
 *
 * These used to be 0.12 / 0.16 / 0.22, which with 40 ticks to a game day
 * meant six or seven headlines a day on Normal — a new one every twenty
 * seconds of real play, out of a list of eleven, so the same drought kept
 * coming round. The banner was never empty and nothing in it felt like
 * news.
 *
 * They are now about a seventh of that: roughly one headline every game
 * day on Hard, every day and a half on Normal, every other day on Easy. A
 * game day is two real minutes, so that is a headline every three or four
 * minutes of play — often enough that the town feels alive, rare enough
 * that each one is an event rather than wallpaper. The severity climbs to
 * match, because something that arrives this seldom can afford to land.
 */
export interface DifficultyConfig {
  id: DifficultyId;
  labelKey: string;
  icon: string;
  descriptionKey: string;
  startingCash: number;
  baseInflationDrift: number;
  inflationMin: number;
  inflationMax: number;
  eventChance: number;
  /** multiplies every event template's inflationDelta */
  eventSeverity: number;
  /** town price index that triggers hyperinflation game over */
  hyperinflationIndex: number;
}

export const DIFFICULTIES: Record<DifficultyId, DifficultyConfig> = {
  easy: {
    id: "easy",
    labelKey: "difficulty.easy.label",
    icon: "🌱",
    descriptionKey: "difficulty.easy.description",
    startingCash: 400,
    baseInflationDrift: 0.0008,
    inflationMin: -0.004,
    inflationMax: 0.014,
    eventChance: 0.012,
    eventSeverity: 0.9,
    hyperinflationIndex: 420,
  },
  normal: {
    id: "normal",
    labelKey: "difficulty.normal.label",
    icon: "⚖️",
    descriptionKey: "difficulty.normal.description",
    startingCash: 250,
    baseInflationDrift: 0.0015,
    inflationMin: -0.004,
    inflationMax: 0.02,
    eventChance: 0.018,
    eventSeverity: 1.3,
    hyperinflationIndex: 320,
  },
  hard: {
    id: "hard",
    labelKey: "difficulty.hard.label",
    icon: "🔥",
    descriptionKey: "difficulty.hard.description",
    startingCash: 150,
    baseInflationDrift: 0.0026,
    inflationMin: -0.003,
    inflationMax: 0.03,
    eventChance: 0.026,
    eventSeverity: 1.7,
    hyperinflationIndex: 240,
  },
};

export const DIFFICULTY_ORDER: DifficultyId[] = ["easy", "normal", "hard"];
