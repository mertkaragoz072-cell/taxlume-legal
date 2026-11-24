import { GoodId } from "./types";

// Painted item-icon art for every good: the first four from the resource
// sheet (assets/resources), the rest cut from the later icon sheet
// (assets/goods2).
// Deliberately a *lookup*, not a field on Good itself: `good.icon` stays the
// plain emoji every text/notification context already interpolates it into
// (villager requests, caravan labels, achievement descriptions...), and only
// the few dedicated "show one big icon" card components — GoodCard,
// InventoryScreen's row, the achievements compendium — opt into a picture
// via GoodIcon when one exists here, falling back to that same emoji
// everywhere else. A good with no entry here (or an asset like gold/oil that
// isn't in GoodId at all) just keeps showing its emoji, no code change
// needed when this list is partial.
export const GOOD_IMAGES: Partial<Record<GoodId, number>> = {
  grain: require("../../assets/resources/wheat.png"),
  wool: require("../../assets/resources/cotton.png"),
  sand: require("../../assets/resources/sand_sack.png"),
  bread: require("../../assets/resources/bread.png"),
  milk: require("../../assets/goods2/milk.png"),
  wood: require("../../assets/goods2/wood.png"),
  iron: require("../../assets/goods2/iron.png"),
  cloth: require("../../assets/goods2/cloth.png"),
  fish: require("../../assets/goods2/fish.png"),
  wine: require("../../assets/goods2/wine.png"),
  leather: require("../../assets/goods2/leather.png"),
  spice: require("../../assets/goods2/spice.png"),
  silk: require("../../assets/goods2/silk.png"),
  jewelry: require("../../assets/goods2/jewelry.png"),
  honey: require("../../assets/goods2/honey.png"),
  cheese: require("../../assets/goods2/cheese.png"),
  paper: require("../../assets/goods2/paper.png"),
  glass: require("../../assets/goods2/glass.png"),
};
