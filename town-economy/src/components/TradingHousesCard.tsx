import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { GOODS_BY_ID } from "../economy/goods";
import { TOWNS_BY_ID } from "../economy/towns";
import { TRADING_HOUSES_BY_ID, TradingHouseActivity } from "../economy/tradingHouses";
import { CARD_GRADIENT, cardShadow, COLORS, FONT, RADIUS, SPACING, TYPE, WEIGHT, withAlpha } from "../theme";
import { GradientFill } from "./GradientFill";

const BUYING = "#f0a04b";
const SELLING = "#6fb8f2";

interface Props {
  activities: TradingHouseActivity[];
}

/** What the rival houses are working right now.
 *
 * Published on purpose. A house buying up iron makes iron there scarce and
 * dear, which is the moment to sell into that town and the worst moment to
 * buy from it — but only if the player can see it, so this is the whole
 * interface to the competition. */
export function TradingHousesCard({ activities }: Props) {
  const { t } = useEconomyContext();
  if (activities.length === 0) return null;

  return (
    <View style={styles.card}>
      <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
      {activities.map((a) => {
        const house = TRADING_HOUSES_BY_ID[a.houseId];
        const town = TOWNS_BY_ID[a.townId];
        const good = GOODS_BY_ID[a.goodId];
        if (!house || !town || !good) return null;
        const buying = a.side === "buying";
        const tint = buying ? BUYING : SELLING;
        return (
          <View key={a.houseId} style={styles.row}>
            <Text aria-hidden style={styles.houseIcon}>
              {house.icon}
            </Text>
            <View style={styles.body}>
              <Text style={styles.houseName} numberOfLines={1}>
                {t(house.nameKey)}
              </Text>
              <Text style={styles.action} numberOfLines={1}>
                {t(buying ? "tradingHouse.buyingIn" : "tradingHouse.sellingIn", {
                  good: `${good.icon} ${t(good.nameKey)}`,
                  town: t(town.nameKey),
                })}
              </Text>
            </View>
            <View
              style={[
                styles.tag,
                { borderColor: withAlpha(tint, 0.5), backgroundColor: withAlpha(tint, 0.14) },
              ]}
            >
              <Text style={[styles.tagText, { color: tint }]}>
                {t(buying ? "tradingHouse.priceUp" : "tradingHouse.priceDown")}
              </Text>
            </View>
          </View>
        );
      })}
      <Text style={styles.hint}>{t("tradingHouse.hint")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.feature,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    overflow: "hidden",
    ...cardShadow,
  },
  row: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.sm },
  houseIcon: { fontSize: 18, marginRight: SPACING.sm },
  body: { flex: 1 },
  houseName: {
    color: COLORS.textPrimary,
    fontSize: TYPE.micro,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
  },
  action: { color: COLORS.textMuted, fontSize: TYPE.micro, marginTop: 1 },
  tag: {
    borderWidth: 1,
    borderRadius: RADIUS.chip,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    marginLeft: SPACING.sm,
  },
  tagText: { fontSize: 9, fontWeight: WEIGHT.black, fontFamily: FONT.black },
  hint: { color: COLORS.textMuted, fontSize: TYPE.micro, marginTop: 2, lineHeight: 15 },
});
