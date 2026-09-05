import { GoodId } from "./types";

export type TownId = "windyhill" | "ironforge" | "portcity" | "grandbazaar" | "diamondharbor";

export interface ForeignTown {
  id: TownId;
  /** i18n key resolved via t() — never render directly */
  nameKey: string;
  icon: string;
  distanceTicks: number; // how many ticks a caravan takes to get there and back
  tariffRate: number; // cut taken on both exports and imports
  /** their local equilibrium price = home basePrice * specialty (their own supply/production still swings it from there) */
  specialty: Record<GoodId, number>;
  /** "town" trades as soon as tradeUnlocked; "metropol" needs metropolUnlocked too — see useEconomy.ts */
  tier: "town" | "metropol";
}

export const TOWNS: ForeignTown[] = [
  {
    id: "windyhill",
    nameKey: "place.windyhill.name",
    icon: "🌾",
    distanceTicks: 4,
    tariffRate: 0.06,
    tier: "town",
    specialty: {
      bread: 1.3,
      milk: 1.25,
      wood: 0.85,
      iron: 1.1,
      cloth: 0.95,
      fish: 1.2,
      wine: 0.8,
      leather: 1.05,
      spice: 0.9,
      silk: 0.7,
      jewelry: 0.6,
      honey: 1.3,
      cheese: 1.25,
      paper: 0.85,
      glass: 0.75,
    },
  },
  {
    id: "ironforge",
    nameKey: "place.ironforge.name",
    icon: "⛏️",
    distanceTicks: 6,
    tariffRate: 0.08,
    tier: "town",
    specialty: {
      bread: 1.15,
      milk: 1.2,
      wood: 0.75,
      iron: 0.7,
      cloth: 1.2,
      fish: 1.3,
      wine: 1.15,
      leather: 0.85,
      spice: 0.8,
      silk: 0.75,
      jewelry: 0.85,
      honey: 0.85,
      cheese: 0.9,
      paper: 1.1,
      glass: 1.15,
    },
  },
  {
    id: "portcity",
    nameKey: "place.portcity.name",
    icon: "⚓",
    distanceTicks: 8,
    tariffRate: 0.04,
    tier: "town",
    specialty: {
      bread: 1.05,
      milk: 1.05,
      wood: 1.15,
      iron: 1.1,
      cloth: 0.65,
      fish: 0.55,
      wine: 1.05,
      leather: 1.15,
      spice: 1.1,
      silk: 1.0,
      jewelry: 0.95,
      honey: 0.95,
      cheese: 0.9,
      paper: 1.2,
      glass: 1.05,
    },
  },
  // Metropolises — reached only once metropolUnlocked (a higher net-worth
  // bar than plain trade unlock). Farther away and pricier to reach, but
  // their specialty multipliers on the luxury goods run far past anything
  // a regular town pays.
  {
    id: "grandbazaar",
    nameKey: "place.grandbazaar.name",
    icon: "🕌",
    distanceTicks: 12,
    tariffRate: 0.05,
    tier: "metropol",
    specialty: {
      bread: 1.1,
      milk: 1.05,
      wood: 0.8,
      iron: 0.95,
      cloth: 1.3,
      fish: 0.9,
      wine: 1.2,
      leather: 1.1,
      spice: 2.0,
      silk: 1.9,
      jewelry: 1.3,
      honey: 1.4,
      cheese: 1.1,
      paper: 1.0,
      glass: 1.6,
    },
  },
  {
    id: "diamondharbor",
    nameKey: "place.diamondharbor.name",
    icon: "💎",
    distanceTicks: 14,
    tariffRate: 0.045,
    tier: "metropol",
    specialty: {
      bread: 0.9,
      milk: 0.85,
      wood: 0.75,
      iron: 1.0,
      cloth: 1.15,
      fish: 1.1,
      wine: 1.6,
      leather: 1.2,
      spice: 1.3,
      silk: 1.5,
      jewelry: 2.3,
      honey: 1.15,
      cheese: 1.0,
      paper: 0.9,
      glass: 1.8,
    },
  },
];

export const TOWNS_BY_ID = Object.fromEntries(TOWNS.map((t) => [t.id, t])) as Record<
  string,
  ForeignTown
>;
