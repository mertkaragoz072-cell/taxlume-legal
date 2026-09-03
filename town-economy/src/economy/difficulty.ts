export type DifficultyId = "easy" | "normal" | "hard";

export interface DifficultyConfig {
  id: DifficultyId;
  label: string;
  icon: string;
  description: string;
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
    label: "Kolay",
    icon: "🌱",
    description: "Daha çok başlangıç sermayesi, yavaş enflasyon, seyrek ve hafif olaylar.",
    startingCash: 400,
    baseInflationDrift: 0.0008,
    inflationMin: -0.004,
    inflationMax: 0.014,
    eventChance: 0.12,
    eventSeverity: 0.7,
    hyperinflationIndex: 420,
  },
  normal: {
    id: "normal",
    label: "Orta",
    icon: "⚖️",
    description: "Dengeli bir kasaba ekonomisi. Standart oynanış.",
    startingCash: 250,
    baseInflationDrift: 0.0015,
    inflationMin: -0.004,
    inflationMax: 0.02,
    eventChance: 0.16,
    eventSeverity: 1,
    hyperinflationIndex: 320,
  },
  hard: {
    id: "hard",
    label: "Zor",
    icon: "🔥",
    description: "Az sermaye, hızlı enflasyon, sık ve şiddetli krizler. Dikkatli yönet.",
    startingCash: 150,
    baseInflationDrift: 0.0026,
    inflationMin: -0.003,
    inflationMax: 0.03,
    eventChance: 0.22,
    eventSeverity: 1.4,
    hyperinflationIndex: 240,
  },
};

export const DIFFICULTY_ORDER: DifficultyId[] = ["easy", "normal", "hard"];
