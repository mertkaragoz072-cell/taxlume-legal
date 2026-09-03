import { Good } from "./types";

export const GOODS: Good[] = [
  {
    id: "bread",
    name: "Ekmek",
    producer: "Fırın",
    icon: "🍞",
    color: "#c97b3d",
    basePrice: 6.4,
    volatility: 0.018,
    inflationSensitivity: 1,
  },
  {
    id: "milk",
    name: "Süt",
    producer: "Çiftlik",
    icon: "🥛",
    color: "#e3d6b8",
    basePrice: 4.2,
    volatility: 0.022,
    inflationSensitivity: 0.8,
  },
  {
    id: "wood",
    name: "Odun",
    producer: "Kereste",
    icon: "🪵",
    color: "#8a5a34",
    basePrice: 9.1,
    volatility: 0.026,
    inflationSensitivity: 1.1,
  },
  {
    id: "iron",
    name: "Demir",
    producer: "Maden",
    icon: "⛏️",
    color: "#7c8592",
    basePrice: 15.8,
    volatility: 0.03,
    inflationSensitivity: 1.3,
  },
  {
    id: "cloth",
    name: "Kumaş",
    producer: "Dokumahane",
    icon: "🧵",
    color: "#b5486b",
    basePrice: 11.3,
    volatility: 0.02,
    inflationSensitivity: 0.9,
  },
];

export const GOODS_BY_ID = Object.fromEntries(GOODS.map((g) => [g.id, g])) as Record<
  string,
  Good
>;
