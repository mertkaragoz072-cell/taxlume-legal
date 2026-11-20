import { TOWN_RANK_TIERS } from "./townRanks";
import { UpgradeId } from "./types";

/** What one side of an era charter does. Everything here rides on levers the
 * game already has (free upgrade level, instant research, happiness, cash). */
export type DecreeEffect =
  | { kind: "upgrade"; id: UpgradeId }
  | { kind: "research" }
  | { kind: "festival" }
  | { kind: "cash"; mult: number };

export interface Era {
  /** matches the rank tier's own key: "town", "city", ... */
  key: string;
  /** the charter the player signs on entering the era; none for the very first */
  decree?: { a: DecreeEffect; b: DecreeEffect };
}

/** One era per named rank tier. Reaching a rank starts its era: a chapter card,
 * a story beat from Merve, era-flavoured headlines and a charter to sign. */
export const ERAS: Era[] = [
  { key: "village" },
  { key: "town", decree: { a: { kind: "upgrade", id: "market" }, b: { kind: "festival" } } },
  { key: "city", decree: { a: { kind: "upgrade", id: "guardTower" }, b: { kind: "research" } } },
  { key: "metropolis", decree: { a: { kind: "upgrade", id: "storageYard" }, b: { kind: "research" } } },
  { key: "tradeHub", decree: { a: { kind: "upgrade", id: "caravanserai" }, b: { kind: "cash", mult: 2 } } },
  { key: "capital", decree: { a: { kind: "upgrade", id: "bank" }, b: { kind: "festival" } } },
  {
    key: "kingdom",
    decree: { a: { kind: "upgrade", id: "earthquakeFund" }, b: { kind: "upgrade", id: "guardTower" } },
  },
  { key: "empire", decree: { a: { kind: "upgrade", id: "townhall" }, b: { kind: "cash", mult: 2 } } },
  { key: "goldenAge", decree: { a: { kind: "festival" }, b: { kind: "research" } } },
  { key: "legendaryMarket", decree: { a: { kind: "upgrade", id: "storageYard" }, b: { kind: "festival" } } },
  {
    key: "worldPower",
    decree: { a: { kind: "upgrade", id: "bank" }, b: { kind: "upgrade", id: "caravanserai" } },
  },
  { key: "tradeDynasty", decree: { a: { kind: "research" }, b: { kind: "cash", mult: 2 } } },
  { key: "immortalLegend", decree: { a: { kind: "festival" }, b: { kind: "research" } } },
];

/** The era a rank index belongs to; every rank past the last named tier stays
 * in the last era (the ladder never ends, the story's last chapter does). */
export function eraForRank(townRankIndex: number): Era {
  return ERAS[Math.max(0, Math.min(townRankIndex, ERAS.length - 1))];
}

/** Chapter number shown on the chapter card ("BÖLÜM 3"). */
export function eraChapterNumber(townRankIndex: number): number {
  return Math.max(0, Math.floor(townRankIndex)) + 1;
}

export function eraTitleKey(townRankIndex: number): string {
  return `era.${eraForRank(townRankIndex).key}.title`;
}
export function eraStoryKey(townRankIndex: number): string {
  return `era.${eraForRank(townRankIndex).key}.story`;
}

/** id of the decision template carrying this era's charter */
export function eraDecreeId(townRankIndex: number): string | null {
  const era = eraForRank(townRankIndex);
  return era.decree ? `era_${era.key}` : null;
}

// Guard: the era list has to mirror the rank tier list one-to-one.
if (ERAS.length !== TOWN_RANK_TIERS.length) {
  throw new Error("ERAS must have one entry per town rank tier");
}
