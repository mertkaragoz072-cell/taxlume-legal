import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { DemandCycle } from "../economy/demandCycles";
import { GOODS_BY_ID } from "../economy/goods";
import { useEconomyContext } from "../economy/EconomyContext";
import { TICKS_PER_GAME_DAY } from "../economy/useEconomy";
import { CARD_GRADIENT, cardShadow, COLORS, FONT, RADIUS, SPACING, TYPE, WEIGHT } from "../theme";
import { GradientFill } from "./GradientFill";
import blueLeft from "../../assets/ui/demandpill/blue-left.png";
import blueMid from "../../assets/ui/demandpill/blue-mid.png";
import blueRight from "../../assets/ui/demandpill/blue-right.png";
import tanLeft from "../../assets/ui/demandpill/tan-left.png";
import tanMid from "../../assets/ui/demandpill/tan-mid.png";
import tanRight from "../../assets/ui/demandpill/tan-right.png";

// Row-label colors (unchanged — these sit on the dark card, not the pill).
const HOT = "#f0a04b";
const GLUT = "#6fb8f2";

// A CSS-painted fill/rim came close to the reference's two chip colors, but
// not close enough — this crops the real pill art instead (its own gold rim
// and fill baked in), the same left-cap/stretchy-middle/right-cap pattern
// as the title plate and the quest ribbon. Each cap keeps the source art's
// own aspect ratio at a fixed render height, so a long good name just makes
// the middle stretch wider rather than distorting the rounded ends.
const CAP_HEIGHT = 26;
const PILL_TONES = {
  hot: { left: tanLeft, mid: tanMid, right: tanRight, capAspect: 230 / 295 },
  glut: { left: blueLeft, mid: blueMid, right: blueRight, capAspect: 113 / 109 },
} as const;

interface Props {
  cycle: DemandCycle;
  next: DemandCycle | null;
  tick: number;
}

function GoodChip({
  goodId,
  tone,
  t,
}: {
  goodId: string;
  tone: keyof typeof PILL_TONES;
  t: (k: string) => string;
}) {
  const good = GOODS_BY_ID[goodId as keyof typeof GOODS_BY_ID];
  if (!good) return null;
  const { left, mid, right, capAspect } = PILL_TONES[tone];
  const capWidth = Math.round(CAP_HEIGHT * capAspect);
  return (
    <View style={styles.chip}>
      <View style={[StyleSheet.absoluteFill, styles.chipBg]} pointerEvents="none">
        <Image source={left} style={{ width: capWidth, height: CAP_HEIGHT }} resizeMode="stretch" />
        <Image source={mid} style={{ flex: 1, height: CAP_HEIGHT }} resizeMode="stretch" />
        <Image source={right} style={{ width: capWidth, height: CAP_HEIGHT }} resizeMode="stretch" />
      </View>
      <Text aria-hidden style={styles.chipIcon}>
        {good.icon}
      </Text>
      <Text style={styles.chipText} numberOfLines={1}>
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
            <GoodChip key={id} goodId={id} tone="hot" t={t} />
          ))}
        </View>
      </View>

      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: GLUT }]}>▼ {t("market.demand.glutLabel")}</Text>
        <View style={styles.chips}>
          <GoodChip goodId={cycle.gluttedGoodId} tone="glut" t={t} />
        </View>
      </View>

      {next && (
        <View style={styles.nextBlock}>
          <Text style={styles.nextLabel}>{t("market.demand.nextLabel")}</Text>
          <View style={styles.chips}>
            {next.hotGoodIds.map((id) => (
              <GoodChip key={id} goodId={id} tone="hot" t={t} />
            ))}
            <GoodChip goodId={next.gluttedGoodId} tone="glut" t={t} />
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
    height: CAP_HEIGHT,
    paddingHorizontal: SPACING.sm + 4,
  },
  // The 3-slice pill art behind the icon/text — a plain row so the two caps
  // and the stretchy middle lay out left to right, sized to match the chip
  // exactly via absoluteFill on this wrapper.
  chipBg: { flexDirection: "row" },
  chipIcon: { fontSize: 13, marginRight: 5 },
  chipText: { color: "#f4e8ce", fontSize: TYPE.micro, fontWeight: WEIGHT.bold, fontFamily: FONT.bold },
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
