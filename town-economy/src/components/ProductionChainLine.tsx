import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { GOODS_BY_ID } from "../economy/goods";
import { COLORS, FONT, RADIUS, SPACING, TYPE, WEIGHT, withAlpha } from "../theme";
import { Good } from "../economy/types";

/** What this good is made from, and whether that is currently a problem.
 *
 * The chain is worthless as a hidden rule. A player who cannot see that
 * cloth comes from wool experiences a wool shortage as cloth prices moving
 * for no reason — which is exactly the arbitrary feel the chains were
 * added to remove. So each input is named, with its own shelves read off
 * beside it: ample in green, scarce in red, and scarce is the buy signal,
 * because this good's price is about to follow.
 */
export function ProductionChainLine({ good }: { good: Good }) {
  const { state, t } = useEconomyContext();
  if (!good.inputs || good.inputs.length === 0) return null;

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{t("market.madeFrom")}</Text>
      {good.inputs.map((id) => {
        const input = GOODS_BY_ID[id];
        const ratio = state.goods[id].supply / input.baseSupply;
        const scarce = ratio < 0.85;
        const tint = scarce ? COLORS.negative : COLORS.positive;
        return (
          <View
            key={id}
            style={[
              styles.chip,
              { borderColor: withAlpha(tint, 0.45), backgroundColor: withAlpha(tint, 0.1) },
            ]}
          >
            <Text aria-hidden style={styles.chipIcon}>
              {input.icon}
            </Text>
            <Text style={styles.chipName}>{t(input.nameKey)}</Text>
            <Text style={[styles.chipState, { color: tint }]}>
              {scarce ? t("market.inputScarce") : t("market.inputAmple")}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  label: { color: COLORS.textMuted, fontFamily: FONT.medium, fontSize: TYPE.caption },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: RADIUS.chip,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  chipIcon: { fontSize: TYPE.caption },
  chipName: { color: COLORS.textPrimary, fontFamily: FONT.medium, fontSize: TYPE.caption },
  chipState: { fontFamily: FONT.bold, fontWeight: WEIGHT.bold, fontSize: TYPE.micro },
});
