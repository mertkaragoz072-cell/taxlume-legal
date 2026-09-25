import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { GoodGroup } from "../economy/goods";
import { daysUntilNextSeason, nextSeasonFromTick, seasonFromTick } from "../economy/seasons";
import { CARD_GRADIENT, cardShadow, COLORS, FONT, RADIUS, SPACING, TYPE, WEIGHT, withAlpha } from "../theme";
import { GradientFill } from "./GradientFill";

const GROUP_LABEL: Record<GoodGroup, string> = {
  food: "season.groupFood",
  raw: "season.groupRaw",
  crafted: "season.groupCrafted",
  luxury: "season.groupLuxury",
};

const GROUP_ORDER: GoodGroup[] = ["food", "raw", "crafted", "luxury"];

/** Where the year is, what it is doing to production, and when it turns.
 *
 * All three matter or none do. A season that only showed its name would be
 * decoration; what makes it playable is seeing that food output is down a
 * third *and* that it lasts two more days, because that is the whole of the
 * plan — buy the cheap thing now, hold it into the season that makes it
 * dear.
 *
 * Groups at 1.0 are left out. A season that does nothing to crafted goods
 * has nothing to say about them, and four rows of which one reads "+0%" is
 * how a useful panel turns into a wall.
 */
export function SeasonStrip() {
  const { state, t } = useEconomyContext();
  const season = seasonFromTick(state.tick);
  const next = nextSeasonFromTick(state.tick);
  const days = daysUntilNextSeason(state.tick);

  const effects = GROUP_ORDER.filter((g) => season.production[g] !== 1).map((g) => ({
    group: g,
    pct: Math.round((season.production[g] - 1) * 100),
  }));

  return (
    <View style={styles.card}>
      <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />

      <View style={styles.headRow}>
        <Text style={styles.title}>
          {season.icon} {t(season.nameKey)}
        </Text>
        <Text style={styles.countdown}>
          {days <= 1
            ? t("season.nextTomorrow", { season: `${next.icon} ${t(next.nameKey)}` })
            : t("season.nextIn", { season: `${next.icon} ${t(next.nameKey)}`, days })}
        </Text>
      </View>

      <View style={styles.chips}>
        {effects.map(({ group, pct }) => {
          const tint = pct > 0 ? COLORS.positive : COLORS.negative;
          return (
            <View
              key={group}
              style={[
                styles.chip,
                { borderColor: withAlpha(tint, 0.5), backgroundColor: withAlpha(tint, 0.12) },
              ]}
            >
              <Text style={[styles.chipText, { color: tint }]}>
                {t(GROUP_LABEL[group])} {pct > 0 ? "+" : ""}
                {pct}%
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    overflow: "hidden",
    ...cardShadow,
  },
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: {
    color: COLORS.textPrimary,
    fontFamily: FONT.bold,
    fontWeight: WEIGHT.bold,
    fontSize: TYPE.body,
  },
  countdown: { color: COLORS.textMuted, fontFamily: FONT.medium, fontSize: TYPE.caption },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs, marginTop: SPACING.sm },
  chip: {
    borderWidth: 1,
    borderRadius: RADIUS.chip,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  chipText: { fontFamily: FONT.bold, fontWeight: WEIGHT.bold, fontSize: TYPE.caption },
});
