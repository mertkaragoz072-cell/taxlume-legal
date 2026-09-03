import { Good } from "./types";

// price = basePrice * (townPriceIndex / 100) * scarcity, where scarcity comes
// from how far current supply sits from baseSupply (see useEconomy's tick()).
// Elasticity sets how hard a shortage/glut swings that scarcity factor —
// staples stay steadier, raw materials swing harder — mirroring how real
// commodity prices behave relative to finished/staple goods.
export const GOODS: Good[] = [
  {
    id: "bread",
    nameKey: "good.bread.name",
    producerKey: "good.bread.producer",
    icon: "🍞",
    color: "#c97b3d",
    basePrice: 6.4,
    baseSupply: 220,
    baseProduction: 22,
    elasticity: 0.45,
  },
  {
    id: "milk",
    nameKey: "good.milk.name",
    producerKey: "good.milk.producer",
    icon: "🥛",
    color: "#e3d6b8",
    basePrice: 4.2,
    baseSupply: 220,
    baseProduction: 22,
    elasticity: 0.5,
  },
  {
    id: "wood",
    nameKey: "good.wood.name",
    producerKey: "good.wood.producer",
    icon: "🪵",
    color: "#8a5a34",
    basePrice: 9.1,
    baseSupply: 180,
    baseProduction: 16,
    elasticity: 0.6,
  },
  {
    id: "iron",
    nameKey: "good.iron.name",
    producerKey: "good.iron.producer",
    icon: "⛏️",
    color: "#7c8592",
    basePrice: 15.8,
    baseSupply: 140,
    baseProduction: 11,
    elasticity: 0.75,
  },
  {
    id: "cloth",
    nameKey: "good.cloth.name",
    producerKey: "good.cloth.producer",
    icon: "🧵",
    color: "#b5486b",
    basePrice: 11.3,
    baseSupply: 170,
    baseProduction: 14,
    elasticity: 0.55,
  },
  {
    id: "fish",
    nameKey: "good.fish.name",
    producerKey: "good.fish.producer",
    icon: "🐟",
    color: "#5a95a8",
    basePrice: 5.6,
    baseSupply: 200,
    baseProduction: 20,
    elasticity: 0.5,
  },
  {
    id: "wine",
    nameKey: "good.wine.name",
    producerKey: "good.wine.producer",
    icon: "🍷",
    color: "#5c3a70",
    basePrice: 22.5,
    baseSupply: 100,
    baseProduction: 8,
    elasticity: 0.85,
  },
  {
    id: "leather",
    nameKey: "good.leather.name",
    producerKey: "good.leather.producer",
    icon: "🥾",
    color: "#a67c52",
    basePrice: 13.4,
    baseSupply: 150,
    baseProduction: 12,
    elasticity: 0.65,
  },
];

export const GOODS_BY_ID = Object.fromEntries(GOODS.map((g) => [g.id, g])) as Record<
  string,
  Good
>;
