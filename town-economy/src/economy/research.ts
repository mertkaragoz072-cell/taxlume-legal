import { RESEARCH_TIER3_UNLOCK_RANK } from "./constants";
import { GoodId } from "./types";

export interface ResearchNode {
  id: string;
  goodId: GoodId;
  tier: 1 | 2 | 3;
  nameKey: string;
  descriptionKey: string;
  icon: string;
  cost: number;
  /** tier-2/tier-3 nodes require their good's previous tier researched first */
  requires?: string;
  /** tier-3 only: also needs the town to have reached this rank (see
   * townRanks.ts) — the tech tree's own answer to the "always something new
   * to reveal" problem the rank ladder is chasing everywhere else, so the
   * capstone tier isn't just one more purchase sitting there unlocked from
   * minute one like tier 1 and 2 always were. */
  requiresRank?: number;
  productionBonusPct: number;
  valueBonusPct: number;
}

function tier1(goodId: GoodId, cost: number, icon: string): ResearchNode {
  return {
    id: `${goodId}_t1`,
    goodId,
    tier: 1,
    nameKey: `research.${goodId}.t1.name`,
    descriptionKey: `research.${goodId}.t1.description`,
    icon,
    cost,
    productionBonusPct: 0.2,
    valueBonusPct: 0,
  };
}

function tier2(goodId: GoodId, cost: number, icon: string): ResearchNode {
  return {
    id: `${goodId}_t2`,
    goodId,
    tier: 2,
    nameKey: `research.${goodId}.t2.name`,
    descriptionKey: `research.${goodId}.t2.description`,
    icon,
    cost,
    requires: `${goodId}_t1`,
    productionBonusPct: 0.1,
    valueBonusPct: 0.25,
  };
}

function tier3(goodId: GoodId, cost: number, icon: string): ResearchNode {
  return {
    id: `${goodId}_t3`,
    goodId,
    tier: 3,
    nameKey: `research.${goodId}.t3.name`,
    descriptionKey: `research.${goodId}.t3.description`,
    icon,
    cost,
    requires: `${goodId}_t2`,
    requiresRank: RESEARCH_TIER3_UNLOCK_RANK,
    productionBonusPct: 0.15,
    valueBonusPct: 0.35,
  };
}

// Costs scale with each good's basePrice (goods.ts) — a rough "9x for the
// first tier, ~2.3x more for the second, ~2.3x again for the third" curve,
// the same spirit as the town upgrades' cost growth (see upgrades.ts). The
// third tier's real gate is requiresRank above, not this cost — by the
// rank it opens at, a figure in the hundreds or low thousands is easily
// affordable; it's priced to still feel like a purchase, not a formality.
export const RESEARCH_NODES: ResearchNode[] = [
  tier1("bread", 58, "🌾"),
  tier2("bread", 133, "🍞"),
  tier3("bread", 306, "🥖"),
  tier1("milk", 38, "🐄"),
  tier2("milk", 87, "🥛"),
  tier3("milk", 200, "🧈"),
  tier1("wood", 82, "🪓"),
  tier2("wood", 189, "🪵"),
  tier3("wood", 435, "🪑"),
  tier1("iron", 142, "⚒️"),
  tier2("iron", 327, "⛏️"),
  tier3("iron", 752, "⚔️"),
  tier1("cloth", 102, "🧶"),
  tier2("cloth", 235, "🧵"),
  tier3("cloth", 541, "👘"),
  tier1("fish", 50, "🎣"),
  tier2("fish", 115, "🐟"),
  tier3("fish", 265, "🍣"),
  tier1("wine", 203, "🍇"),
  tier2("wine", 467, "🍷"),
  tier3("wine", 1074, "🥂"),
  tier1("leather", 121, "🐐"),
  tier2("leather", 278, "🥾"),
  tier3("leather", 639, "🎒"),
  tier1("spice", 171, "🌱"),
  tier2("spice", 392, "🌶️"),
  tier3("spice", 902, "🍛"),
  tier1("silk", 234, "🐛"),
  tier2("silk", 536, "🧣"),
  tier3("silk", 1233, "👗"),
  tier1("jewelry", 378, "💎"),
  tier2("jewelry", 866, "💍"),
  tier3("jewelry", 1992, "👑"),
];

export const RESEARCH_NODES_BY_ID = Object.fromEntries(RESEARCH_NODES.map((n) => [n.id, n])) as Record<
  string,
  ResearchNode
>;

/** the combined multiplier from every researched node for one good — 1 = no
 * bonus yet, 1.3 = +30%, etc. */
export function researchMultiplier(
  researched: string[],
  goodId: GoodId,
  kind: "production" | "value"
): number {
  let mult = 1;
  for (const node of RESEARCH_NODES) {
    if (node.goodId !== goodId) continue;
    if (!researched.includes(node.id)) continue;
    mult += kind === "production" ? node.productionBonusPct : node.valueBonusPct;
  }
  return mult;
}
