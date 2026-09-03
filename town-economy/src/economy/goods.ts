import { Good } from "./types";

// price = basePrice * (townPriceIndex / 100) * scarcity, where scarcity comes
// from how far current supply sits from baseSupply (see useEconomy's tick()).
// Elasticity sets how hard a shortage/glut swings that scarcity factor —
// staples stay steadier, raw materials swing harder — mirroring how real
// commodity prices behave relative to finished/staple goods.
export const GOODS: Good[] = [
  {
    id: "bread",
    name: "Ekmek",
    producer: "Fırın",
    icon: "🍞",
    color: "#c97b3d",
    basePrice: 6.4,
    baseSupply: 220,
    baseProduction: 22,
    elasticity: 0.45,
  },
  {
    id: "milk",
    name: "Süt",
    producer: "Çiftlik",
    icon: "🥛",
    color: "#e3d6b8",
    basePrice: 4.2,
    baseSupply: 220,
    baseProduction: 22,
    elasticity: 0.5,
  },
  {
    id: "wood",
    name: "Odun",
    producer: "Kereste",
    icon: "🪵",
    color: "#8a5a34",
    basePrice: 9.1,
    baseSupply: 180,
    baseProduction: 16,
    elasticity: 0.6,
  },
  {
    id: "iron",
    name: "Demir",
    producer: "Maden",
    icon: "⛏️",
    color: "#7c8592",
    basePrice: 15.8,
    baseSupply: 140,
    baseProduction: 11,
    elasticity: 0.75,
  },
  {
    id: "cloth",
    name: "Kumaş",
    producer: "Dokumahane",
    icon: "🧵",
    color: "#b5486b",
    basePrice: 11.3,
    baseSupply: 170,
    baseProduction: 14,
    elasticity: 0.55,
  },
];

export const GOODS_BY_ID = Object.fromEntries(GOODS.map((g) => [g.id, g])) as Record<
  string,
  Good
>;
