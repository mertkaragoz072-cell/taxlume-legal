import { AchievementId } from "./achievements";

// Same idea as goodImages.ts: a lookup, not a field replacing `icon` (which
// stays the plain emoji every notification/text context already uses).
// hot_hand has no entry — it keeps showing its emoji everywhere, same as any
// achievement here didn't get art for.
export const ACHIEVEMENT_IMAGES: Partial<Record<AchievementId, number>> = {
  first_trade: require("../../assets/achievements/first_trade.png"),
  trader_10: require("../../assets/achievements/trader_10.png"),
  trader_50: require("../../assets/achievements/trader_50.png"),
  first_caravan: require("../../assets/achievements/first_caravan.png"),
  caravan_master_10: require("../../assets/achievements/caravan_master_10.png"),
  three_towns: require("../../assets/achievements/three_towns.png"),
  diversify: require("../../assets/achievements/diversify.png"),
  net_1000: require("../../assets/achievements/net_1000.png"),
  net_5000: require("../../assets/achievements/net_5000.png"),
  net_20000: require("../../assets/achievements/net_20000.png"),
  survive_100: require("../../assets/achievements/survive_100.png"),
  survive_300: require("../../assets/achievements/survive_300.png"),
  streak_3: require("../../assets/achievements/streak_3.png"),
  streak_7: require("../../assets/achievements/streak_7.png"),
  streak_30: require("../../assets/achievements/streak_30.png"),
  prestige_1: require("../../assets/achievements/prestige_1.png"),
  workforce: require("../../assets/achievements/workforce.png"),
  debt_free: require("../../assets/achievements/debt_free.png"),
  metropol_trader: require("../../assets/achievements/metropol_trader.png"),
  researcher: require("../../assets/achievements/researcher.png"),
  investor: require("../../assets/achievements/investor.png"),
  landlord: require("../../assets/achievements/landlord.png"),
  real_estate_mogul: require("../../assets/achievements/real_estate_mogul.png"),
  skilled_ruler: require("../../assets/achievements/skilled_ruler.png"),
  speculator: require("../../assets/achievements/speculator.png"),
};
