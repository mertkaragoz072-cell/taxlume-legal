import { GoodId } from "./types";

export interface ResearchNode {
  id: string;
  goodId: GoodId;
  tier: 1 | 2;
  nameKey: string;
  descriptionKey: string;
  icon: string;
  cost: number;
  /** tier-2 nodes require their good's tier-1 node researched first */
  requires?: string;
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

// Costs scale with each good's basePrice (goods.ts) — a rough "9x for the
// first tier, ~2.3x more for the second" curve, the same spirit as the
// town upgrades' cost growth (see upgrades.ts).
export const RESEARCH_NODES: ResearchNode[] = [
  tier1("bread", 58, "🌾"),
  tier2("bread", 133, "🍞"),
  tier1("milk", 38, "🐄"),
  tier2("milk", 87, "🥛"),
  tier1("wood", 82, "🪓"),
  tier2("wood", 189, "🪵"),
  tier1("iron", 142, "⚒️"),
  tier2("iron", 327, "⛏️"),
  tier1("cloth", 102, "🧶"),
  tier2("cloth", 235, "🧵"),
  tier1("fish", 50, "🎣"),
  tier2("fish", 115, "🐟"),
  tier1("wine", 203, "🍇"),
  tier2("wine", 467, "🍷"),
  tier1("leather", 121, "🐐"),
  tier2("leather", 278, "🥾"),
  tier1("spice", 171, "🌱"),
  tier2("spice", 392, "🌶️"),
  tier1("silk", 234, "🐛"),
  tier2("silk", 536, "🧣"),
  tier1("jewelry", 378, "💎"),
  tier2("jewelry", 866, "💍"),
];

export const RESEARCH_NODES_BY_ID = Object.fromEntries(
  RESEARCH_NODES.map((n) => [n.id, n])
) as Record<string, ResearchNode>;

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
