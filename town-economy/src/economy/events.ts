import { GoodId } from "./types";

export interface EventTemplate {
  message: string;
  tone: "good" | "bad" | "neutral";
  inflationDelta: number; // one-off nudge to the inflation rate
  good?: GoodId; // optional: also jolts one good's momentum
  goodMomentum?: number;
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
    goodMomentum: 0.08,
  },
  {
    message: "Bereketli hasat! Süt bolluğu fiyatları düşürdü.",
    tone: "good",
    inflationDelta: -0.001,
    good: "milk",
    goodMomentum: -0.07,
  },
  {
    message: "Ormanda yangın çıktı, odun arzı azaldı.",
    tone: "bad",
    inflationDelta: 0,
    good: "wood",
    goodMomentum: 0.09,
  },
  {
    message: "Yeni maden damarı bulundu, demir ucuzladı.",
    tone: "good",
    inflationDelta: 0,
    good: "iron",
    goodMomentum: -0.08,
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
    goodMomentum: 0.07,
  },
];
