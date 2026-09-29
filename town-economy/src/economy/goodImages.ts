import { GoodId } from "./types";

// Painted item-icon art for a subset of goods (commissioned via an AI image
// tool, cut out from a flat chroma-key background — see assets/goods/README
// if one exists, or the git history around when this file was added).
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
  grain: require("../../assets/goods/grain.png"),
  wool: require("../../assets/goods/wool.png"),
  sand: require("../../assets/goods/sand.png"),
  bread: require("../../assets/goods/bread.png"),
  milk: require("../../assets/goods/milk.png"),
  wood: require("../../assets/goods/wood.png"),
  iron: require("../../assets/goods/iron.png"),
  cloth: require("../../assets/goods/cloth.png"),
  fish: require("../../assets/goods/fish.png"),
  wine: require("../../assets/goods/wine.png"),
  leather: require("../../assets/goods/leather.png"),
  spice: require("../../assets/goods/spice.png"),
  silk: require("../../assets/goods/silk.png"),
  jewelry: require("../../assets/goods/jewelry.png"),
  honey: require("../../assets/goods/honey.png"),
  cheese: require("../../assets/goods/cheese.png"),
  paper: require("../../assets/goods/paper.png"),
  glass: require("../../assets/goods/glass.png"),
};
