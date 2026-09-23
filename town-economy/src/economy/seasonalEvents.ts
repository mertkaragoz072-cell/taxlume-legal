import { GoodId } from "./types";

export interface SeasonalEventTemplate {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: string;
  /** how many ticks the price boost lasts once it starts */
  durationTicks: number;
  /** home-market goods whose price is multiplied while this is active */
  affectedGoods: GoodId[];
  priceMultiplier: number;
}

// Unlike EVENT_TEMPLATES (events.ts) — instant inflation/supply jolts —
// these are longer-lived "occasions" that boost specific goods' home-market
// price for a while, giving the player a real window to sell into. Applied
// in tick() alongside researchedValueMult, home market only.
export const SEASONAL_EVENT_TEMPLATES: SeasonalEventTemplate[] = [
  {
    id: "spice_festival",
    titleKey: "seasonalEvent.spice_festival.title",
    descriptionKey: "seasonalEvent.spice_festival.description",
    icon: "🌶️",
    durationTicks: 60,
    affectedGoods: ["spice"],
    priceMultiplier: 1.5,
  },
  {
    id: "wine_harvest",
    titleKey: "seasonalEvent.wine_harvest.title",
    descriptionKey: "seasonalEvent.wine_harvest.description",
    icon: "🍇",
    durationTicks: 60,
    affectedGoods: ["wine"],
    priceMultiplier: 1.4,
  },
  {
    id: "silk_road_boom",
    titleKey: "seasonalEvent.silk_road_boom.title",
    descriptionKey: "seasonalEvent.silk_road_boom.description",
    icon: "🧣",
    durationTicks: 55,
    affectedGoods: ["silk", "spice"],
    priceMultiplier: 1.3,
  },
  {
    id: "jewelry_gala",
    titleKey: "seasonalEvent.jewelry_gala.title",
    descriptionKey: "seasonalEvent.jewelry_gala.description",
    icon: "💍",
    durationTicks: 50,
    affectedGoods: ["jewelry"],
    priceMultiplier: 1.6,
  },
  {
    id: "harvest_festival",
    titleKey: "seasonalEvent.harvest_festival.title",
    descriptionKey: "seasonalEvent.harvest_festival.description",
    icon: "🌾",
    durationTicks: 70,
    affectedGoods: ["bread", "milk"],
    priceMultiplier: 1.3,
  },
  {
    id: "smiths_fair",
    titleKey: "seasonalEvent.smiths_fair.title",
    descriptionKey: "seasonalEvent.smiths_fair.description",
    icon: "⚒️",
    durationTicks: 55,
    affectedGoods: ["iron", "leather"],
    priceMultiplier: 1.35,
  },
];

export const SEASONAL_EVENT_TEMPLATES_BY_ID = Object.fromEntries(
  SEASONAL_EVENT_TEMPLATES.map((e) => [e.id, e])
) as Record<string, SeasonalEventTemplate>;
