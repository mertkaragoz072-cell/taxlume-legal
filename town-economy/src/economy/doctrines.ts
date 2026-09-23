export type DoctrineId = "merchants" | "artisans" | "bankers";

/** The one choice in the game that closes a door.
 *
 * Every other system here is additive: research, upgrades, properties and
 * prestige perks are all strictly-better purchases, so a long enough run buys
 * all of them and two players' towns end up identical. Nothing ever costs
 * anything except time.
 *
 * A doctrine is the opposite. Each one is genuinely strong in its lane and
 * genuinely worse in another, it is picked once, and it holds for the rest of
 * the run — so "what kind of town is this?" becomes a real question with a
 * real answer, and prestige becomes a chance to be a different town rather
 * than the same one again with bigger numbers. */
export interface Doctrine {
  id: DoctrineId;
  icon: string;
  nameKey: string;
  descriptionKey: string;
  /** the upside, phrased for the player */
  bonusKey: string;
  /** the price, phrased just as plainly — never buried */
  penaltyKey: string;

  /** multiplier on the tariff a caravan pays (below 1 is cheaper) */
  tariffMult: number;
  /** multiplier on caravan travel time (below 1 is faster) */
  caravanSpeedMult: number;
  /** multiplier on every good's home production */
  productionMult: number;
  /** multiplier on the cost of a research node */
  researchCostMult: number;
  /** multiplier on the per-day loan interest rate offered */
  loanRateMult: number;
  /** multiplier on tax collected per tick */
  taxIncomeMult: number;
  /** multiplier on passive income from owned properties */
  propertyIncomeMult: number;
}

/** What "no doctrine chosen" means numerically, so every call site can just
 * multiply instead of branching on null. */
export const NEUTRAL_DOCTRINE: Omit<
  Doctrine,
  "id" | "icon" | "nameKey" | "descriptionKey" | "bonusKey" | "penaltyKey"
> = {
  tariffMult: 1,
  caravanSpeedMult: 1,
  productionMult: 1,
  researchCostMult: 1,
  loanRateMult: 1,
  taxIncomeMult: 1,
  propertyIncomeMult: 1,
};

export const DOCTRINES: Doctrine[] = [
  {
    // Buys what it needs instead of making it: cheap, fast caravans, but the
    // workshops at home wind down.
    id: "merchants",
    icon: "🐫",
    nameKey: "doctrine.merchants.name",
    descriptionKey: "doctrine.merchants.description",
    bonusKey: "doctrine.merchants.bonus",
    penaltyKey: "doctrine.merchants.penalty",
    tariffMult: 0.55,
    caravanSpeedMult: 0.75,
    productionMult: 0.85,
    researchCostMult: 1,
    loanRateMult: 1,
    taxIncomeMult: 1,
    propertyIncomeMult: 1,
  },
  {
    // Makes everything itself and gets very good at it, at the cost of being
    // an expensive place for outsiders to trade with.
    id: "artisans",
    icon: "⚒️",
    nameKey: "doctrine.artisans.name",
    descriptionKey: "doctrine.artisans.description",
    bonusKey: "doctrine.artisans.bonus",
    penaltyKey: "doctrine.artisans.penalty",
    tariffMult: 1.4,
    caravanSpeedMult: 1,
    productionMult: 1.25,
    researchCostMult: 0.7,
    loanRateMult: 1,
    taxIncomeMult: 1,
    propertyIncomeMult: 1,
  },
  {
    // Runs on capital rather than goods: cheap credit and fat rents, paid for
    // with the tax exemptions the counting houses negotiate for themselves.
    id: "bankers",
    icon: "🏦",
    nameKey: "doctrine.bankers.name",
    descriptionKey: "doctrine.bankers.description",
    bonusKey: "doctrine.bankers.bonus",
    penaltyKey: "doctrine.bankers.penalty",
    tariffMult: 1,
    caravanSpeedMult: 1,
    productionMult: 1,
    researchCostMult: 1,
    loanRateMult: 0.6,
    taxIncomeMult: 0.75,
    propertyIncomeMult: 2,
  },
];

export const DOCTRINES_BY_ID: Record<string, Doctrine> = Object.fromEntries(DOCTRINES.map((d) => [d.id, d]));

const DOCTRINE_IDS: ReadonlySet<string> = new Set(DOCTRINES.map((d) => d.id));

/** The modifiers in force right now — the chosen doctrine's, or the neutral
 * set when the town has not committed to one yet. */
export function doctrineModifiers(doctrineId: string | null): typeof NEUTRAL_DOCTRINE {
  if (!doctrineId || !isDoctrineId(doctrineId)) return NEUTRAL_DOCTRINE;
  return DOCTRINES_BY_ID[doctrineId];
}

/** Validates an id from outside the type system — a persisted save, or a
 * string handed to the reducer. Checked against the real id set rather than
 * with `in`, which walks the prototype chain and would happily accept
 * "toString" and hand back a function where a Doctrine is expected. */
export function isDoctrineId(value: string): value is DoctrineId {
  return DOCTRINE_IDS.has(value);
}
