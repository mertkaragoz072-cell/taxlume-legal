import { GoodId } from "./types";

export type TownId = "windyhill" | "ironforge" | "portcity";

export interface ForeignTown {
  id: TownId;
  name: string;
  icon: string;
  distanceTicks: number; // how many ticks a caravan takes to get there and back
  tariffRate: number; // cut taken on both exports and imports
  multipliers: Record<GoodId, number>; // their local price = home base price * multiplier
}

export const TOWNS: ForeignTown[] = [
  {
    id: "windyhill",
    name: "Rüzgar Tepesi",
    icon: "🌾",
    distanceTicks: 4,
    tariffRate: 0.06,
    multipliers: { bread: 1.3, milk: 1.25, wood: 0.85, iron: 1.1, cloth: 0.95 },
  },
  {
    id: "ironforge",
    name: "Demirocak",
    icon: "⛏️",
    distanceTicks: 6,
    tariffRate: 0.08,
    multipliers: { bread: 1.15, milk: 1.2, wood: 0.75, iron: 0.7, cloth: 1.2 },
  },
  {
    id: "portcity",
    name: "Liman Şehri",
    icon: "⚓",
    distanceTicks: 8,
    tariffRate: 0.04,
    multipliers: { bread: 1.05, milk: 1.05, wood: 1.15, iron: 1.1, cloth: 0.65 },
  },
];

export const TOWNS_BY_ID = Object.fromEntries(TOWNS.map((t) => [t.id, t])) as Record<
  string,
  ForeignTown
>;
