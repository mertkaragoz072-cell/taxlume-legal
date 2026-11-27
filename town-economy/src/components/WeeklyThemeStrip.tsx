import React from "react";
import { StyleSheet, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { GOODS_BY_ID } from "../economy/goods";
import { todayKey, weeklyThemeForDate } from "../economy/weeklyTheme";
import { useClock } from "../hooks/useClock";
import { FONT } from "../theme";
import { Text } from "./AppText";

/** This week's market theme under the season strip: which two goods are in fashion
 * and by how much. */
export function WeeklyThemeStrip() {
  const { t } = useEconomyContext();
  const now = useClock(60_000);
  const theme = weeklyThemeForDate(todayKey(now));
  const pct = Math.round((theme.priceMultiplier - 1) * 100);
  return (
    <View style={styles.strip}>
      <Text aria-hidden style={styles.icon}>
        {theme.icon}
      </Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.label} numberOfLines={1}>
          {t("weeklyTheme.label")}
        </Text>
        <Text style={styles.title} numberOfLines={1}>
          {t(theme.titleKey)}
        </Text>
        <Text style={styles.goods} numberOfLines={2}>
          {theme.goods.map((g) => `${GOODS_BY_ID[g].icon} ${t(GOODS_BY_ID[g].nameKey)}`).join("  ·  ")}
          {"  "}+{pct}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#c99a3a",
    backgroundColor: "rgba(60,38,18,0.9)",
  },
  icon: { fontSize: 26 },
  label: { color: "#cdbb94", fontFamily: FONT.medium, fontSize: 11 },
  title: { color: "#f6e2a0", fontFamily: FONT.display, fontSize: 14 },
  goods: { color: "#eadcb6", fontFamily: FONT.medium, fontSize: 13, marginTop: 1 },
});
