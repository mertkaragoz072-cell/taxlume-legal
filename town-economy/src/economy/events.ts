import { GoodId } from "./types";

export interface EventTemplate {
  message: string;
  tone: "good" | "bad" | "neutral";
  inflationDelta: number; // one-off nudge to the town-wide inflation rate
  good?: GoodId; // optional: also shocks one good's local supply
  /** fractional change applied to that good's supply, e.g. -0.3 = a 30% shortage */
  supplyShockPct?: number;
}

// inflationDelta values are deliberately small and roughly balanced
// (the list sums to ~0) — they're meant to read as one-off news that
// nudges the rate and fades via reversion, not as a structural bias
// that would drag a long, passive session toward hyperinflation on its
// own. "Merkez hazine para bastı" is intentionally the single largest
// shock (money-printing is the canonical worst case), everything else
// is modest by comparison.
export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    message: "Belediye vergileri artırdı! Fiyatlar geneline zam geldi.",
    tone: "bad",
    inflationDelta: 0.003,
  },
  {
    message: "Kuraklık tahılı vurdu. Ekmek fiyatları fırladı.",
    tone: "bad",
    inflationDelta: 0.0005,
    good: "bread",
    supplyShockPct: -0.32,
  },
  {
    message: "Bereketli hasat! Süt bolluğu fiyatları düşürdü.",
    tone: "good",
    inflationDelta: -0.0005,
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
    inflationDelta: -0.0025,
  },
  {
    message: "Kasaba festivali talebi patlattı, her şey pahalandı.",
    tone: "bad",
    inflationDelta: 0.002,
  },
  {
    message: "Merkez hazine para bastı. Enflasyon hızlandı.",
    tone: "bad",
    inflationDelta: 0.004,
  },
  {
    message: "Sıkı bütçe önlemleri enflasyonu dizginledi.",
    tone: "good",
    inflationDelta: -0.0035,
  },
  {
    message: "Dokumahanede grev, kumaş fiyatı yükseldi.",
    tone: "bad",
    inflationDelta: 0,
    good: "cloth",
    supplyShockPct: -0.28,
  },
];
