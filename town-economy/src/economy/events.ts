import { GoodId } from "./types";

export interface EventTemplate {
  message: string;
  tone: "good" | "bad" | "neutral";
  inflationDelta: number; // one-off nudge to the town-wide inflation rate
  good?: GoodId; // optional: also shocks one good's local supply
  /** fractional change applied to that good's supply, e.g. -0.3 = a 30% shortage */
  supplyShockPct?: number;
}

export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    message: "Belediye vergileri artırdı! Fiyatlar geneline zam geldi.",
    tone: "bad",
    inflationDelta: 0.006,
  },
  {
    message: "Kuraklık tahılı vurdu. Ekmek fiyatları fırladı.",
    tone: "bad",
    inflationDelta: 0.001,
    good: "bread",
    supplyShockPct: -0.32,
  },
  {
    message: "Bereketli hasat! Süt bolluğu fiyatları düşürdü.",
    tone: "good",
    inflationDelta: -0.001,
    good: "milk",
    supplyShockPct: 0.3,
  },
  {
    message: "Ormanda yangın çıktı, odun arzı azaldı.",
    tone: "bad",
    inflationDelta: 0,
    good: "wood",
    supplyShockPct: -0.3,
  },
  {
    message: "Yeni maden damarı bulundu, demir ucuzladı.",
    tone: "good",
    inflationDelta: 0,
    good: "iron",
    supplyShockPct: 0.32,
  },
  {
    message: "Komşu kasabayla ticaret anlaşması enflasyonu yumuşattı.",
    tone: "good",
    inflationDelta: -0.005,
  },
  {
    message: "Kasaba festivali talebi patlattı, her şey pahalandı.",
    tone: "bad",
    inflationDelta: 0.004,
  },
  {
    message: "Merkez hazine para bastı. Enflasyon hızlandı.",
    tone: "bad",
    inflationDelta: 0.009,
  },
  {
    message: "Sıkı bütçe önlemleri enflasyonu dizginledi.",
    tone: "good",
    inflationDelta: -0.007,
  },
  {
    message: "Dokumahanede grev, kumaş fiyatı yükseldi.",
    tone: "bad",
    inflationDelta: 0,
    good: "cloth",
    supplyShockPct: -0.28,
  },
];
