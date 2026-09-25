import { GOODS } from "./goods";
import { GoodId } from "./types";

/** A disaster the town can see coming.
 *
 * The earthquake this replaces was a pure dice roll: it hit without warning,
 * and the only counterplay was an upgrade bought long beforehand. Nothing the
 * player knew or did in the moment mattered, which makes a bad roll feel
 * arbitrary rather than dramatic.
 *
 * A crisis is announced a couple of in-game days before it lands, so the
 * window between the warning and the strike is real play: stockpile the good
 * that is about to go scarce, sell what is about to be dumped on the market,
 * insure the caravans that are about to cross bandit country. The dice still
 * decide what happens; the player decides what to do about it. */
export interface CrisisTemplate {
  id: string;
  icon: string;
  /** the disaster itself, used when it lands */
  titleKey: string;
  /** the sign that precedes it, used while it is still coming.
   *
   * A town cannot be told that an earthquake will happen in two days, and
   * it certainly cannot be told that a workshop will catch fire — that was
   * the nonsense here. What a town can notice is a foreshock, or a week of
   * dry wind, or the sound of a crowd in the square. The warning names the
   * sign; the strike names the disaster. */
  warningTitleKey: string;
  /** shown on the warning banner: what to do with the days you have */
  adviceKey: string;
  /** goods whose home supply the strike destroys; empty means every good */
  affectedGoods: GoodId[];
  /** fraction of home supply lost, before the Earthquake Fund softens it */
  supplyLossMin: number;
  supplyLossMax: number;
  /** happiness points the strike costs, on top of the supply damage */
  happinessLoss: number;
  /** true when the Earthquake Fund upgrade softens this one — it insures
   * against physical damage to stores, not against unrest or banditry */
  softenedByFund: boolean;
}

const FOOD: GoodId[] = ["bread", "milk", "fish", "cheese", "honey"];
const CRAFTED: GoodId[] = ["cloth", "leather", "silk", "paper", "glass"];

export const CRISIS_TEMPLATES: CrisisTemplate[] = [
  {
    id: "earthquake",
    icon: "🌋",
    titleKey: "crisis.earthquake.title",
    warningTitleKey: "crisis.earthquake.warningTitle",
    adviceKey: "crisis.earthquake.advice",
    affectedGoods: [],
    supplyLossMin: 0.1,
    supplyLossMax: 0.25,
    happinessLoss: 6,
    softenedByFund: true,
  },
  {
    id: "drought",
    icon: "🌵",
    titleKey: "crisis.drought.title",
    warningTitleKey: "crisis.drought.warningTitle",
    adviceKey: "crisis.drought.advice",
    affectedGoods: FOOD,
    supplyLossMin: 0.25,
    supplyLossMax: 0.45,
    happinessLoss: 10,
    softenedByFund: false,
  },
  {
    id: "fire",
    icon: "🔥",
    titleKey: "crisis.fire.title",
    warningTitleKey: "crisis.fire.warningTitle",
    adviceKey: "crisis.fire.advice",
    affectedGoods: CRAFTED,
    supplyLossMin: 0.3,
    supplyLossMax: 0.5,
    happinessLoss: 4,
    softenedByFund: true,
  },
  {
    id: "unrest",
    icon: "🪧",
    titleKey: "crisis.unrest.title",
    warningTitleKey: "crisis.unrest.warningTitle",
    adviceKey: "crisis.unrest.advice",
    affectedGoods: [],
    supplyLossMin: 0.05,
    supplyLossMax: 0.12,
    happinessLoss: 18,
    softenedByFund: false,
  },
];

export const CRISIS_TEMPLATES_BY_ID: Record<string, CrisisTemplate> = Object.fromEntries(
  CRISIS_TEMPLATES.map((c) => [c.id, c])
);

/** How often a crisis is scheduled, per tick. Higher than the unannounced
 * earthquake it replaces: a disaster you get two days to prepare for can
 * afford to be more frequent, and the preparation is the interesting part. */
export const CRISIS_CHANCE = 0.005;

/** Days between the announcement and the strike — long enough to act on
 * (stockpile, sell, insure), short enough that the warning still has teeth. */
export const CRISIS_WARNING_DAYS = 2;

/** Floor on the damage, so the Earthquake Fund softens a crisis but can never
 * make one a non-event. */
export const CRISIS_LOSS_FLOOR = 0.02;

export function rollCrisisTemplate(): CrisisTemplate {
  return CRISIS_TEMPLATES[Math.floor(Math.random() * CRISIS_TEMPLATES.length)];
}

/** Which goods a crisis actually damages — an empty affectedGoods list on the
 * template means "everything", resolved here so callers never special-case it. */
export function crisisAffectedGoodIds(template: CrisisTemplate): GoodId[] {
  return template.affectedGoods.length > 0 ? template.affectedGoods : GOODS.map((g) => g.id);
}

/** The supply loss this strike deals, after the Earthquake Fund is applied to
 * the crises it covers. `fundReduction` is the upgrade's total effect. */
export function crisisSupplyLoss(template: CrisisTemplate, fundReduction: number): number {
  const raw = template.supplyLossMin + Math.random() * (template.supplyLossMax - template.supplyLossMin);
  if (!template.softenedByFund) return raw;
  return Math.max(CRISIS_LOSS_FLOOR, raw - fundReduction);
}

/** An announced crisis waiting to land. */
export interface ScheduledCrisis {
  id: number;
  templateId: string;
  announcedAtTick: number;
  strikesAtTick: number;
}
