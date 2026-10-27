import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from "react-native";
import headerMarketImage from "../../assets/ui/header-market.webp";
import statBarChart from "../../assets/ui/statpanel2/barchart.png";
import statCoinBullet from "../../assets/ui/statpanel2/coinbullet.png";
import statCoins from "../../assets/ui/statpanel2/coins.png";
import statMoneyBag from "../../assets/ui/statpanel2/moneybag.png";
import statPanelBg from "../../assets/ui/statpanel2/panel-bg.png";
import titleplateLeft from "../../assets/ui/titleplate3-left.png";
import titleplateMid from "../../assets/ui/titleplate3-mid.png";
import titleplateRight from "../../assets/ui/titleplate3-right.png";
import { DIFFICULTIES, DifficultyId } from "../economy/difficulty";
import { TICKS_PER_GAME_DAY } from "../economy/useEconomy";
import { Language } from "../i18n/t";
import { COLORS, FONT, glowShadow, PARCHMENT, RADIUS, SPACING, TYPE, WEIGHT, withAlpha } from "../theme";
import { formatCoins as formatCoinsUtil, formatNumber, formatPercent } from "../utils/formatNumber";
import { AnimatedNumber } from "./AnimatedNumber";
import { GradientFill } from "./GradientFill";
import { PriceChart } from "./PriceChart";
import { seasonFromTick } from "../economy/seasons";
import { SpotlightTarget } from "./Spotlight";
import { SpeedBoostButton } from "./SpeedBoostButton";

interface Props {
  townName: string;
  rankIcon: string;
  rankTitle: string;
  cash: number;
  netWorth: number;
  inflationIndex: number;
  inflationRate: number;
  inflationHistory: number[];
  paused: boolean;
  muted: boolean;
  streakCount: number;
  gameDay: number;
  tick: number;
  difficulty: DifficultyId;
  language: Language;
  t: (key: string, params?: Record<string, string | number>) => string;
  onTogglePause: () => void;
  onToggleMuted: () => void;
  onToggleLanguage: () => void;
  onReset: () => void;
  onHelp: () => void;
  onEditName: () => void;
  onOpenSpeedBoost: () => void;
}

// Anchor colors for a full in-game day, walked smoothly (not in steps) so
// the header subtly "breathes" as the town's day passes — dawn -> noon ->
// dusk -> night -> back to dawn. Purely decorative, no gameplay effect.
const DAY_TINT_ANCHORS: [number, [number, number, number]][] = [
  [0, [232, 148, 74]], // dawn
  [0.25, [255, 224, 102]], // noon
  [0.5, [240, 119, 106]], // dusk
  [0.75, [58, 74, 138]], // night
  [1, [232, 148, 74]], // back to dawn
];

function dayTintColor(tick: number): string {
  const progress =
    (((tick % TICKS_PER_GAME_DAY) + TICKS_PER_GAME_DAY) % TICKS_PER_GAME_DAY) / TICKS_PER_GAME_DAY;
  let lo = DAY_TINT_ANCHORS[0];
  let hi = DAY_TINT_ANCHORS[DAY_TINT_ANCHORS.length - 1];
  for (let i = 0; i < DAY_TINT_ANCHORS.length - 1; i++) {
    if (progress >= DAY_TINT_ANCHORS[i][0] && progress <= DAY_TINT_ANCHORS[i + 1][0]) {
      lo = DAY_TINT_ANCHORS[i];
      hi = DAY_TINT_ANCHORS[i + 1];
      break;
    }
  }
  const span = hi[0] - lo[0] || 1;
  const localT = (progress - lo[0]) / span;
  const [r1, g1, b1] = lo[1];
  const [r2, g2, b2] = hi[1];
  const r = Math.round(r1 + (r2 - r1) * localT);
  const g = Math.round(g1 + (g2 - g1) * localT);
  const b = Math.round(b1 + (b2 - b1) * localT);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

// The plate's caps are fixed-width (the wheat-and-ivy ends) and the middle
// is a thin stretchable slice of its own blank wood grain — a 9-slice, not
// one static image, because the town's name is player-edited and can't be
// baked into the art. The mid tile is flex:1 rather than a fixed width: a
// fixed plate wide enough for a long English name pushed the six control
// circles half off the screen on an earlier pass, and one narrow enough to
// keep them on screen truncated "Golden Town" — flexing to whatever room
// is actually left of the controls is the only width that's never both.
const PLATE_HEIGHT = 34;
const PLATE_CAP_LEFT_W = 24;
const PLATE_CAP_RIGHT_W = 26;

export function InflationHeader({
  townName,
  rankIcon,
  rankTitle,
  cash,
  netWorth,
  inflationIndex,
  inflationRate,
  inflationHistory,
  paused,
  muted,
  streakCount,
  gameDay,
  tick,
  difficulty,
  language,
  t,
  onTogglePause,
  onToggleMuted,
  onToggleLanguage,
  onReset,
  onHelp,
  onEditName,
  onOpenSpeedBoost,
}: Props) {
  const hot = inflationRate > 0.006;
  const dayTint = dayTintColor(tick);
  const difficultyConfig = DIFFICULTIES[difficulty];
  const formatCoins = (v: number) => formatCoinsUtil(v, language);

  // A slow breathing glow on the inflation card while it's running hot, and
  // a gentle flicker on the streak flame — motion that reads as "alive"
  // even when the player isn't touching anything.
  const hotPulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!hot) {
      hotPulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(hotPulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(hotPulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [hot, hotPulse]);
  const hotGlowOpacity = hotPulse.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.4] });

  const flamePulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (streakCount <= 0) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(flamePulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(flamePulse, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [streakCount, flamePulse]);
  const flameScale = flamePulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });

  // Compounded out to a whole game day, which is the number the label
  // promises — the raw rate is per tick and means nothing to a player.
  const dailyInflationPct = (Math.pow(1 + inflationRate, TICKS_PER_GAME_DAY) - 1) * 100;

  return (
    <View style={styles.wrap}>
      {/* The town's own market street, standing in for the flat wood
          gradient this used to be — a real scene behind the header rather
          than a color. A dark scrim sits over it (transparent at the top,
          solid by the stat row) so the gold title, the chip text and the
          cash/net worth/inflation numbers all still read the way they did
          against the old solid background. */}
      <Image
        source={headerMarketImage}
        style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]}
        resizeMode="cover"
      />
      <GradientFill colors={["rgba(15,10,5,0.3)", "rgba(15,10,5,0.88)"]} x1="0" y1="0" x2="0" y2="1" />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(dayTint, 0.1) }]}
      />
      <View style={styles.goldLine} />
      {/* Name and controls share a line; the chips get one of their own.
          They used to sit in a single row with the chip strip allowed to
          wrap, and on a phone it broke into three ragged lines beside a
          block of six circles — the town's own name being the thing that
          lost the width. */}
      <View style={styles.topRow}>
        <Pressable
          onPress={onEditName}
          style={styles.townNamePressable}
          accessibilityRole="button"
          accessibilityLabel={t("a11y.editTownName")}
        >
          <Image
            source={titleplateLeft}
            style={{ width: PLATE_CAP_LEFT_W, height: PLATE_HEIGHT }}
            resizeMode="stretch"
          />
          <Image
            source={titleplateMid}
            style={{ flex: 1, minWidth: 0, height: PLATE_HEIGHT, marginHorizontal: -1 }}
            resizeMode="stretch"
          />
          <Image
            source={titleplateRight}
            style={{ width: PLATE_CAP_RIGHT_W, height: PLATE_HEIGHT }}
            resizeMode="stretch"
          />
          <View style={styles.plateTextWrap} pointerEvents="none">
            <Text style={styles.town} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
              {townName.toUpperCase()}
            </Text>
          </View>
        </Pressable>
        <View style={styles.controls}>
          <Pressable
            onPress={onToggleLanguage}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel={t("a11y.toggleLanguage")}
          >
            <Text style={styles.langBtnText}>{language === "tr" ? "TR" : "EN"}</Text>
          </Pressable>
          <SpeedBoostButton onPress={onOpenSpeedBoost} />
          <Pressable
            onPress={onHelp}
            style={[styles.iconBtn, { backgroundColor: withAlpha("#6fb8f2", 0.22) }]}
            accessibilityRole="button"
            accessibilityLabel={t("a11y.help")}
          >
            <Text style={styles.iconBtnText}>❓</Text>
          </Pressable>
          <Pressable
            onPress={onToggleMuted}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel={muted ? t("a11y.unmute") : t("a11y.mute")}
          >
            <Text style={styles.iconBtnText}>{muted ? "🔇" : "🔊"}</Text>
          </Pressable>
          <Pressable
            onPress={onTogglePause}
            style={[styles.iconBtn, { backgroundColor: withAlpha("#e8c777", 0.22) }]}
            accessibilityRole="button"
            accessibilityLabel={paused ? t("a11y.resume") : t("a11y.pause")}
          >
            <Text style={styles.iconBtnText}>{paused ? "▶" : "⏸"}</Text>
          </Pressable>
          <Pressable
            onPress={onReset}
            style={[styles.iconBtn, { backgroundColor: withAlpha("#f0776a", 0.22) }]}
            accessibilityRole="button"
            accessibilityLabel={t("a11y.newGame")}
          >
            <Text style={styles.iconBtnText}>⟳</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.chipRow}>
        <View
          style={[
            styles.streakBadge,
            styles.streakBadgeRow,
            { backgroundColor: withAlpha("#e8c777", 0.18), borderColor: withAlpha("#e8c777", 0.7) },
          ]}
        >
          <Text style={styles.streakBadgeText}>
            {rankIcon} {rankTitle}
          </Text>
        </View>
        <View
          style={[
            styles.streakBadge,
            { backgroundColor: withAlpha("#6fb8f2", 0.15), borderColor: withAlpha("#6fb8f2", 0.7) },
          ]}
        >
          <Text style={styles.streakBadgeText}>
            {difficultyConfig.icon} {t(difficultyConfig.labelKey)}
          </Text>
        </View>
        <View
          style={[
            styles.streakBadge,
            { backgroundColor: withAlpha("#7fcf8a", 0.15), borderColor: withAlpha("#7fcf8a", 0.7) },
          ]}
        >
          <Text style={styles.streakBadgeText}>
            {seasonFromTick(tick).icon} {t(seasonFromTick(tick).nameKey)} ·{" "}
            {t("header.day", { day: gameDay })}
          </Text>
        </View>
        {streakCount > 0 && (
          <View
            style={[
              styles.streakBadge,
              styles.streakBadgeRow,
              { backgroundColor: withAlpha("#f0776a", 0.18), borderColor: withAlpha("#f0776a", 0.7) },
            ]}
          >
            <Animated.Text style={[styles.flameEmoji, { transform: [{ scale: flameScale }] }]}>
              🔥
            </Animated.Text>
            <Text style={styles.streakBadgeText}>{streakCount}</Text>
          </View>
        )}
      </View>

      {/* A parchment inset within the header's own dark wood, matching the
          reference's own layering — the whole card's background (paper,
          border and all four corner clasps) is one real cropped image now,
          stretched to fill, rather than a CSS-drawn fill plus one corner
          image mirrored for the second corner. */}
      <View style={[styles.statsCard, hot && glowShadow("#e0693f")]}>
        <Image
          source={statPanelBg}
          style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]}
          resizeMode="stretch"
        />
        {hot && (
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, styles.hotGlow, { opacity: hotGlowOpacity }]}
          />
        )}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Image source={statCoins} style={styles.statIcon} resizeMode="contain" />
            <View>
              <Text style={styles.statLabel}>{t("header.cash")}</Text>
              <View style={styles.statValueRow}>
                <AnimatedNumber value={cash} formatter={formatCoins} style={styles.statValue} />
                <Image source={statCoinBullet} style={styles.statBullet} resizeMode="contain" />
              </View>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Image source={statMoneyBag} style={styles.statIcon} resizeMode="contain" />
            <View>
              <Text style={styles.statLabel}>{t("header.netWorth")}</Text>
              <View style={styles.statValueRow}>
                <AnimatedNumber value={netWorth} formatter={formatCoins} style={styles.statValue} />
                <Image source={statCoinBullet} style={styles.statBullet} resizeMode="contain" />
              </View>
            </View>
          </View>
          <View style={styles.statDivider} />
          <SpotlightTarget id="inflation" style={[styles.stat, styles.inflationStat]}>
            <Image source={statBarChart} style={styles.statIcon} resizeMode="contain" />
            <View style={styles.inflationTextCol}>
              <Text style={styles.statLabel}>{t("header.inflation")}</Text>
              {/* The daily rate is its own line rather than a small Text
                  nested inside the index. Inline, it wrapped wherever it ran
                  out of room — on a narrow phone the closing bracket ended up
                  alone on a third line, under the sparkline. */}
              <Text
                style={[styles.statValue, { color: hot ? PARCHMENT.negative : "#9c6b1f" }]}
                numberOfLines={1}
              >
                {formatNumber(inflationIndex, language, 1)}
              </Text>
              <Text
                style={[styles.inflationRate, { color: hot ? PARCHMENT.negative : PARCHMENT.inkMuted }]}
                numberOfLines={1}
              >
                {"("}
                {dailyInflationPct >= 0 ? "+" : ""}
                {formatPercent(dailyInflationPct, language, 2)}
                {t("header.perTurn")}
                {")"}
              </Text>
            </View>
            {/* A trend line rather than another number — at this size a
                second figure next to the index would just be noise, but the
                shape of it (climbing, flat, falling) reads at a glance. */}
            <PriceChart
              history={inflationHistory}
              color={hot ? PARCHMENT.negative : "#9c6b1f"}
              width={30}
              height={26}
              strokeWidth={1.5}
            />
          </SpotlightTarget>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 14,
    overflow: "hidden",
  },
  goldLine: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: COLORS.accent,
    opacity: 0.55,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  // One line, and it stays one line. A chip that runs out of room shrinks
  // its own label rather than starting a second row and pushing everything
  // below it down the screen.
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  townNamePressable: {
    flexDirection: "row",
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    height: PLATE_HEIGHT,
  },
  // The same inset on both sides (the wider of the two caps) rather than
  // each cap's own width — the caps differ by a couple of pixels, and using
  // them as-is left the text area, and so the name, imperceptibly off
  // center.
  plateTextWrap: {
    position: "absolute",
    left: Math.max(PLATE_CAP_LEFT_W, PLATE_CAP_RIGHT_W),
    right: Math.max(PLATE_CAP_LEFT_W, PLATE_CAP_RIGHT_W),
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  town: {
    color: "#ffd75e",
    fontFamily: FONT.signage,
    fontSize: TYPE.caption,
    letterSpacing: 0.2,
    textAlign: "center",
  },
  // The dark fallback color never actually shows: every call site passes
  // its own translucent backgroundColor/borderColor so the scene behind
  // the header shows through, same as the reference's own glass-like
  // chips — this only matters if a future caller forgets to.
  streakBadge: {
    backgroundColor: "#2a2016",
    borderRadius: RADIUS.chip,
    borderWidth: 1,
    borderColor: "transparent",
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    flexShrink: 1,
  },
  streakBadgeText: {
    color: COLORS.textPrimary,
    fontSize: TYPE.caption,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
  },
  streakBadgeRow: { flexDirection: "row", alignItems: "center" },
  flameEmoji: { fontSize: TYPE.caption, marginRight: 3 },
  // gap alone. Every button also carried a marginLeft, so the row was
  // spaced twice over and the name paid for it in width.
  controls: { flexDirection: "row", alignItems: "center", gap: SPACING.xs },
  iconBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#2a2016",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnText: { color: COLORS.textPrimary, fontSize: TYPE.caption, lineHeight: 18 },
  langBtnText: {
    color: COLORS.accent,
    fontSize: TYPE.micro,
    fontWeight: WEIGHT.black,
    fontFamily: FONT.black,
  },
  // A parchment inset in the header's own dark wood (see the JSX's own
  // comment) rather than the plain dark row this used to be — the corner
  // clasps sit just inside the card's edge, one image mirrored for the
  // second corner since the source only drew one.
  statsCard: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    overflow: "hidden",
  },
  statsRow: { flexDirection: "row", alignItems: "center" },
  stat: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  statIcon: { width: 22, height: 22 },
  statDivider: { width: 1, height: "80%", backgroundColor: withAlpha(PARCHMENT.woodDark, 0.3) },
  statLabel: { color: PARCHMENT.inkMuted, fontSize: TYPE.micro, marginBottom: 2 },
  statValueRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  statBullet: { width: 12, height: 12 },
  statValue: {
    color: PARCHMENT.ink,
    fontSize: TYPE.body,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
  },
  inflationStat: {
    flex: 1.3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 4,
  },
  inflationTextCol: { flex: 1 },
  inflationRate: { fontSize: 10, fontFamily: FONT.medium },
  hotGlow: { backgroundColor: "#e0693f", borderRadius: 10 },
});
