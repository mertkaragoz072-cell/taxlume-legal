export type AssetId = "gold" | "oil" | "techStock" | "bankStock" | "bond" | "realEstate" | "grain" | "crypto";

export interface InvestAsset {
  id: AssetId;
  nameKey: string;
  descriptionKey: string;
  icon: string;
  color: string;
  basePrice: number;
  /** average price drift per tick, e.g. 0.0002 = a slow +0.02%/tick trend */
  drift: number;
  /** stddev of the per-tick price noise, as a fraction of price */
  volatility: number;
}

// These trade independently of the town's goods economy — a separate,
// faster-moving market for speculation. Price is a pure random walk
// (drift + noise, see tick() in useEconomy.ts) rather than supply/demand,
// so it can go up or down regardless of what the player does — real
// profit and loss, not just a market they can game by controlling supply.
export const ASSETS: InvestAsset[] = [
  {
    id: "gold",
    nameKey: "asset.gold.name",
    descriptionKey: "asset.gold.description",
    icon: "🥇",
    color: "#e0c14c",
    basePrice: 95,
    drift: 0.00006,
    volatility: 0.008,
  },
  {
    id: "oil",
    nameKey: "asset.oil.name",
    descriptionKey: "asset.oil.description",
    icon: "🛢️",
    color: "#7c7367",
    basePrice: 38,
    drift: 0,
    volatility: 0.022,
  },
  {
    id: "techStock",
    nameKey: "asset.techStock.name",
    descriptionKey: "asset.techStock.description",
    icon: "💻",
    color: "#4c8fe0",
    basePrice: 60,
    drift: 0.0002,
    volatility: 0.03,
  },
  {
    id: "bankStock",
    nameKey: "asset.bankStock.name",
    descriptionKey: "asset.bankStock.description",
    icon: "🏦",
    color: "#5c9a6c",
    basePrice: 25,
    drift: 0.00003,
    volatility: 0.015,
  },
  {
    id: "bond",
    nameKey: "asset.bond.name",
    descriptionKey: "asset.bond.description",
    icon: "📜",
    color: "#8a7fb8",
    basePrice: 50,
    drift: 0.00008,
    volatility: 0.004,
  },
  {
    id: "realEstate",
    nameKey: "asset.realEstate.name",
    descriptionKey: "asset.realEstate.description",
    icon: "🏘️",
    color: "#c9824a",
    basePrice: 120,
    drift: 0.00012,
    volatility: 0.01,
  },
  {
    id: "grain",
    nameKey: "asset.grain.name",
    descriptionKey: "asset.grain.description",
    icon: "🌾",
    color: "#d4a62e",
    basePrice: 30,
    drift: 0,
    volatility: 0.018,
  },
  {
    id: "crypto",
    nameKey: "asset.crypto.name",
    descriptionKey: "asset.crypto.description",
    icon: "🪙",
    color: "#e08a3c",
    basePrice: 20,
    drift: 0.0001,
    volatility: 0.05,
  },
];

export const ASSETS_BY_ID = Object.fromEntries(ASSETS.map((a) => [a.id, a])) as Record<AssetId, InvestAsset>;
