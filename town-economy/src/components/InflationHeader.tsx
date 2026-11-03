import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Text } from "./AppText";
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
import {
  COLORS,
  CONTENT_MAX_WIDTH,
  FONT,
  glowShadow,
  PARCHMENT,
  RADIUS,
  SPACING,
  TYPE,
  WEIGHT,
  withAlpha,
} from "../theme";
import { formatNumber, formatPercent } from "../utils/formatNumber";
import { AnimatedNumber } from "./AnimatedNumber";
import { GradientFill } from "./GradientFill";
import { PriceChart } from "./PriceChart";
import { seasonFromTick } from "../economy/seasons";
import { SpotlightTarget } from "./Spotlight";
import { SettingsMenu } from "./SettingsMenu";

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
const SCENE_HEIGHT = 112;
const PLATE_HEIGHT = 46;
const PLATE_CAP_LEFT_W = 32;
const PLATE_CAP_RIGHT_W = 35;
// Below this width the header drops its optional extras (sparkline, coin
// bullets) and tightens the controls so nothing truncates or wraps.
const COMPACT_WIDTH = 380;

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
  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = Math.min(windowWidth, CONTENT_MAX_WIDTH);
  const compact = screenWidth < COMPACT_WIDTH;
  // The town name is player-edited and the plate has a fixed amount of
  // room between the laurels, so size the lettering to fit it rather than
  // letting it truncate (adjustsFontSizeToFit does nothing on web).
  const btnSize = compact ? 34 : 38;
  const controlsWidth = btnSize;
  const narrow = screenWidth < 340;
  const capLeft = narrow ? 22 : compact ? 26 : PLATE_CAP_LEFT_W;
  const capRight = narrow ? 24 : compact ? 28 : PLATE_CAP_RIGHT_W;
  const nameRoom = screenWidth - 24 - controlsWidth - SPACING.sm - capLeft - capRight - 8;
  const nameFontSize = Math.max(7, Math.min(TYPE.body, nameRoom / (Math.max(townName.length, 6) * 0.9)));
  // The plate hugs its lettering instead of stretching across the whole row:
  // signage lettering runs roughly 0.85em per capital, plus a little air.
  const plateWidth = Math.min(
    nameRoom + capLeft + capRight,
    Math.round(townName.length * nameFontSize * 0.85 + 2 * Math.max(capLeft, capRight) + 14)
  );
  const hot = inflationRate > 0.006;
  const dayTint = dayTintColor(tick);
  const difficultyConfig = DIFFICULTIES[difficulty];
  // The stat row already shows a coin-bullet image right after each value
  // — stacking formatCoins's own 🪙 emoji on top of that doubled up the
  // "this is money" marker and, at this card's larger text size, wrapped
  // the emoji onto its own line. formatNumber alone leaves the image to
  // carry that meaning by itself.
  const formatCash = (v: number) => formatNumber(v, language, 1);

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
      {/* The town's own market street as a bright, undimmed scene across
          the top of the header, fading into the dark wood below it (where
          the stat row sits) rather than a scrim over the whole header —
          the scene is the point, the controls and chips carry their own
          solid backgrounds so they read without any darkening. */}
      <View style={styles.scene} pointerEvents="none">
        <Image source={headerMarketImage} style={styles.sceneImage} resizeMode="cover" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(dayTint, 0.08) }]} />
        <View style={styles.sceneFade}>
          <GradientFill colors={["rgba(42,26,14,0)", "rgba(42,26,14,1)"]} x1="0" y1="0" x2="0" y2="1" />
        </View>
      </View>
      <View style={styles.goldLine} />
      {/* Name and controls share a line; the chips get one of their own.
          They used to sit in a single row with the chip strip allowed to
          wrap, and on a phone it broke into three ragged lines beside a
          block of six circles — the town's own name being the thing that
          lost the width. */}
      <View style={styles.topRow}>
        <Pressable
          onPress={onEditName}
          style={[styles.townNamePressable, { width: plateWidth }]}
          accessibilityRole="button"
          accessibilityLabel={t("a11y.editTownName")}
        >
          <Image
            source={titleplateLeft}
            style={{ width: capLeft, height: PLATE_HEIGHT }}
            resizeMode="stretch"
          />
          <Image
            source={titleplateMid}
            style={{ flex: 1, minWidth: 0, height: PLATE_HEIGHT, marginHorizontal: -1 }}
            resizeMode="stretch"
          />
          <Image
            source={titleplateRight}
            style={{ width: capRight, height: PLATE_HEIGHT }}
            resizeMode="stretch"
          />
          <Text style={styles.pencil} pointerEvents="none">
            ✎
          </Text>
          <View
            style={[
              styles.plateTextWrap,
              { left: Math.max(capLeft, capRight) + 2, right: Math.max(capLeft, capRight) - 2 },
            ]}
            pointerEvents="none"
          >
            <Text style={[styles.town, { fontSize: nameFontSize }]} numberOfLines={1}>
              {townName.toUpperCase()}
            </Text>
          </View>
        </Pressable>
        <SettingsMenu
          size={btnSize}
          language={language}
          muted={muted}
          paused={paused}
          onToggleLanguage={onToggleLanguage}
          onOpenSpeedBoost={onOpenSpeedBoost}
          onHelp={onHelp}
          onToggleMuted={onToggleMuted}
          onTogglePause={onTogglePause}
          onReset={onReset}
        />
      </View>

      <View style={styles.chipRow}>
        <View
          style={[
            styles.streakBadge,
            styles.streakBadgeRow,
            { backgroundColor: "#5a3a1a", borderColor: "#d1a860" },
          ]}
        >
          <Text style={styles.streakBadgeText} numberOfLines={1}>
            {rankIcon} {rankTitle}
          </Text>
        </View>
        <View style={[styles.streakBadge, { backgroundColor: "#1f4a78", borderColor: "#7db8ea" }]}>
          <Text style={styles.streakBadgeText} numberOfLines={1}>
            {difficultyConfig.icon} {t(difficultyConfig.labelKey)}
          </Text>
        </View>
        <View style={[styles.streakBadge, { backgroundColor: "#2e5a2e", borderColor: "#8fd698" }]}>
          <Text style={styles.streakBadgeText} numberOfLines={1}>
            {seasonFromTick(tick).icon} {t("header.day", { day: gameDay })}
          </Text>
        </View>
        {streakCount > 0 && (
          <View
            style={[
              styles.streakBadge,
              styles.streakBadgeRow,
              { backgroundColor: "#6b1f1f", borderColor: "#f0776a" },
            ]}
          >
            <Animated.Text style={[styles.flameEmoji, { transform: [{ scale: flameScale }] }]}>
              🔥
            </Animated.Text>
            <Text style={styles.streakBadgeText} numberOfLines={1}>
              {streakCount}
            </Text>
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
            {!compact && <Image source={statCoins} style={styles.statIcon} resizeMode="contain" />}
            <View style={styles.statTextCol}>
              <Text style={styles.statLabel} numberOfLines={1}>
                {t("header.cash")}
              </Text>
              <View style={styles.statValueRow}>
                <AnimatedNumber
                  value={cash}
                  formatter={formatCash}
                  style={[styles.statValue, compact && styles.statValueCompact]}
                />
                {!compact && <Image source={statCoinBullet} style={styles.statBullet} resizeMode="contain" />}
              </View>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            {!compact && <Image source={statMoneyBag} style={styles.statIcon} resizeMode="contain" />}
            <View style={styles.statTextCol}>
              <Text style={styles.statLabel} numberOfLines={1}>
                {t("header.netWorth")}
              </Text>
              <View style={styles.statValueRow}>
                <AnimatedNumber
                  value={netWorth}
                  formatter={formatCash}
                  style={[styles.statValue, compact && styles.statValueCompact]}
                />
                {!compact && <Image source={statCoinBullet} style={styles.statBullet} resizeMode="contain" />}
              </View>
            </View>
          </View>
          <View style={styles.statDivider} />
          <SpotlightTarget id="inflation" style={[styles.stat, styles.inflationStat]}>
            {!compact && <Image source={statBarChart} style={styles.statIcon} resizeMode="contain" />}
            <View style={styles.inflationTextCol}>
              <Text style={styles.statLabel} numberOfLines={1}>
                {t("header.inflation")}
              </Text>
              {/* The daily rate is its own line rather than a small Text
                  nested inside the index. Inline, it wrapped wherever it ran
                  out of room — on a narrow phone the closing bracket ended up
                  alone on a third line, under the sparkline. */}
              <Text
                style={[
                  styles.statValue,
                  compact && styles.statValueCompact,
                  { color: hot ? PARCHMENT.negative : "#8a5a14" },
                ]}
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
            {!compact && (
              <PriceChart
                history={inflationHistory}
                color={hot ? PARCHMENT.negative : "#8a5a14"}
                width={24}
                height={22}
                strokeWidth={1.5}
              />
            )}
          </SpotlightTarget>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    // Headroom above the title row so the market-street scene shows.
    paddingTop: 30,
    paddingBottom: 4,
    paddingHorizontal: 12,
    overflow: "hidden",
    backgroundColor: "#2a1a0e",
  },
  scene: { position: "absolute", top: 0, left: 0, right: 0, height: SCENE_HEIGHT, overflow: "hidden" },
  // Taller than the box and shifted up so the sky is cropped away and the
  // rooftops and market awnings land behind the title row.
  sceneFade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 50 },
  sceneImage: { position: "absolute", top: -40, left: 0, width: "100%", height: SCENE_HEIGHT + 40 },
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
    // The plate art has transparent padding top and bottom, so the chip
    // row below can start inside the row's own height.
    marginBottom: -6,
  },
  // One line, and it stays one line. A chip that runs out of room shrinks
  // its own label rather than starting a second row and pushing everything
  // below it down the screen.
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: SPACING.xs,
  },
  townNamePressable: {
    flexDirection: "row",
    flexGrow: 0,
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
    // Nudged right and up a couple of px: the wood board the name sits on
    // runs a little past the laurels on the right, and its visual middle is
    // above the plate image's own box middle.
    left: Math.max(PLATE_CAP_LEFT_W, PLATE_CAP_RIGHT_W) + 2,
    right: Math.max(PLATE_CAP_LEFT_W, PLATE_CAP_RIGHT_W) - 2,
    top: 0,
    bottom: 5,
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
    borderWidth: 2,
    borderColor: "transparent",
    paddingHorizontal: 8,
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
  controls: { flexDirection: "row", alignItems: "center", gap: 3 },
  iconBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#2b1a0e",
    borderWidth: 2,
    borderColor: "#b88a4a",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnText: { color: COLORS.textPrimary, fontSize: TYPE.body, lineHeight: 16 },
  pencil: { position: "absolute", right: 14, top: 18, color: "#ffd75e", fontSize: TYPE.title },
  langBtnText: {
    color: COLORS.accent,
    fontSize: TYPE.label,
    fontWeight: WEIGHT.black,
    fontFamily: FONT.black,
  },
  // A parchment inset in the header's own dark wood (see the JSX's own
  // comment) rather than the plain dark row this used to be — the corner
  // clasps sit just inside the card's edge, one image mirrored for the
  // second corner since the source only drew one.
  statsCard: {
    // Breaks out of wrap's own 14px side padding so this card runs flush
    // with the screen edges, the same as the banner below it, instead of
    // floating narrower than the art it sits on.
    marginHorizontal: -12,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 14,
    overflow: "hidden",
  },
  statsRow: { flexDirection: "row", alignItems: "center" },
  stat: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, minWidth: 0 },
  statIcon: { width: 32, height: 32 },
  statIconCompact: { width: 24, height: 24 },
  // Margin on the divider itself, not just left to whatever space a
  // column's content doesn't use — at the bigger icon/text sizes above,
  // a column could fill its whole flex share and butt straight into the
  // next column's icon with no gap at all.
  statDivider: {
    width: 1,
    height: "80%",
    marginHorizontal: 6,
    backgroundColor: withAlpha(PARCHMENT.woodDark, 0.3),
  },
  statTextCol: { flexShrink: 1, minWidth: 0 },
  statLabel: { color: "#5c3f26", fontFamily: FONT.bold, fontSize: TYPE.caption, marginBottom: 2 },
  statValueCompact: { fontSize: TYPE.title },
  statValueRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  statBullet: { width: 13, height: 13 },
  statValue: {
    color: PARCHMENT.ink,
    fontSize: TYPE.heading,
    fontVariant: ["tabular-nums"],
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
  },
  inflationStat: {
    flex: 1.6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 4,
  },
  inflationTextCol: { flex: 1 },
  inflationRate: { fontSize: TYPE.caption, fontFamily: FONT.bold },
  hotGlow: { backgroundColor: "#e0693f", borderRadius: 10 },
});
