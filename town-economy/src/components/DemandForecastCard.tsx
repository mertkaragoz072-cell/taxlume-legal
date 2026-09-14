import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { DemandCycle } from "../economy/demandCycles";
import { GOODS_BY_ID } from "../economy/goods";
import { useEconomyContext } from "../economy/EconomyContext";
import { TICKS_PER_GAME_DAY } from "../economy/useEconomy";
import { CARD_GRADIENT, cardShadow, COLORS, FONT, RADIUS, SPACING, TYPE, WEIGHT, withAlpha } from "../theme";
import { GradientFill } from "./GradientFill";

const HOT = "#f0a04b";
const GLUT = "#6fb8f2";

interface Props {
  cycle: DemandCycle;
  next: DemandCycle | null;
  tick: number;
}

function GoodChip({ goodId, tint, t }: { goodId: string; tint: string; t: (k: string) => string }) {
  const good = GOODS_BY_ID[goodId as keyof typeof GOODS_BY_ID];
  if (!good) return null;
  return (
    <View
      style={[styles.chip, { borderColor: withAlpha(tint, 0.5), backgroundColor: withAlpha(tint, 0.12) }]}
    >
      <Text aria-hidden style={styles.chipIcon}>
        {good.icon}
      </Text>
      <Text style={[styles.chipText, { color: tint }]} numberOfLines={1}>
        {t(good.nameKey)}
      </Text>
    </View>
  );
}

/** What the town wants this cycle, and what it will want next.
 *
 * The forecast half is the point: knowing a good goes scarce in two days turns
 * stockpiling into a plan rather than a reaction, which is the difference
 * between reading the market and guessing at it. */
export function DemandForecastCard({ cycle, next, tick }: Props) {
  const { t } = useEconomyContext();
  const ticksLeft = Math.max(0, cycle.endTick - tick);
  const daysLeft = Math.ceil(ticksLeft / TICKS_PER_GAME_DAY);

  return (
    <View style={styles.card}>
      <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />

      <View style={styles.headRow}>
        <Text style={styles.title}>{t("market.demand.sectionLabel")}</Text>
        <Text style={styles.countdown}>
          {daysLeft <= 1 ? t("market.demand.lastDay") : t("market.demand.daysLeft", { days: daysLeft })}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: HOT }]}>▲ {t("market.demand.hotLabel")}</Text>
        <View style={styles.chips}>
          {cycle.hotGoodIds.map((id) => (
            <GoodChip key={id} goodId={id} tint={HOT} t={t} />
          ))}
        </View>
      </View>

      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: GLUT }]}>▼ {t("market.demand.glutLabel")}</Text>
        <View style={styles.chips}>
          <GoodChip goodId={cycle.gluttedGoodId} tint={GLUT} t={t} />
        </View>
      </View>

      {next && (
        <View style={styles.nextBlock}>
          <Text style={styles.nextLabel}>{t("market.demand.nextLabel")}</Text>
          <View style={styles.chips}>
            {next.hotGoodIds.map((id) => (
              <GoodChip key={id} goodId={id} tint={HOT} t={t} />
            ))}
            <GoodChip goodId={next.gluttedGoodId} tint={GLUT} t={t} />
          </View>
        </View>
      )}

      <Text style={styles.hint}>{t("market.demand.hint")}</Text>
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
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  title: {
    color: COLORS.textMuted,
    fontSize: TYPE.caption,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    letterSpacing: 1,
  },
  countdown: { color: COLORS.accent, fontSize: TYPE.micro, fontWeight: WEIGHT.bold, fontFamily: FONT.bold },
  row: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.xs + 2 },
  rowLabel: {
    width: 82,
    fontSize: TYPE.micro,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", flex: 1, gap: SPACING.xs },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: RADIUS.chip,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  chipIcon: { fontSize: 12, marginRight: 4 },
  chipText: { fontSize: TYPE.micro, fontWeight: WEIGHT.bold, fontFamily: FONT.bold },
  nextBlock: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.xs,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: "#3a2d1e",
  },
  nextLabel: {
    width: 82,
    color: COLORS.textMuted,
    fontSize: TYPE.micro,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
  },
  hint: { color: COLORS.textMuted, fontSize: TYPE.micro, marginTop: SPACING.sm, lineHeight: 15 },
});
