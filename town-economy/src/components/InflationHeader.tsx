import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from "react-native";
import skylineImage from "../../assets/ui/header-skyline.webp";
import chipRankLeft from "../../assets/ui/chips/chip-rank-left.png";
import chipSeasonLeft from "../../assets/ui/chips/chip-season-left.png";
import chipStreakLeft from "../../assets/ui/chips/chip-streak-left.png";
import chipVillageLeft from "../../assets/ui/chips/chip-village-left.png";
import titleplateLeft from "../../assets/ui/titleplate-left.png";
import titleplateMid from "../../assets/ui/titleplate-mid.png";
import titleplateRight from "../../assets/ui/titleplate-right.png";
import { DIFFICULTIES, DifficultyId } from "../economy/difficulty";
import { TICKS_PER_GAME_DAY } from "../economy/useEconomy";
import { Language } from "../i18n/t";
import { COLORS, FONT, glowShadow, SPACING, TYPE, WEIGHT, withAlpha } from "../theme";
import { formatCoins as formatCoinsUtil, formatNumber, formatPercent } from "../utils/formatNumber";
import { AnimatedNumber } from "./AnimatedNumber";
import { GradientFill } from "./GradientFill";
import { seasonFromTick } from "../economy/seasons";
import { SpotlightTarget } from "./Spotlight";
import { PriceChart } from "./PriceChart";
import { SpeedBoostButton } from "./SpeedBoostButton";

interface Props {
  townName: string;
  emblem: string;
  emblemColor: string;
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

// The four status chips (rank, difficulty, season+day, streak) each need
// dynamic/localized text, so only their left cap — icon plus the rounded
// left edge, cropped straight from the reference sheet — is real art. The
// rest of the pill is a plain solid fill (sampled from that same sheet)
// with the right corners rounded in code, which is pixel-identical to a
// crop of it since the source pill's body has no texture of its own.
const CHIP_HEIGHT = 24;
function StatusChip({
  cap,
  fill,
  capWidth,
  children,
}: {
  cap: number;
  fill: string;
  capWidth: number;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.chip}>
      <Image source={cap} style={{ width: capWidth, height: CHIP_HEIGHT }} resizeMode="stretch" />
      <View style={[styles.chipBody, { backgroundColor: fill }]}>{children}</View>
    </View>
  );
}

// The plate's caps are fixed-width (the left wheat sheaf, the right pencil
// — see the reference sheet) and the middle is a thin stretchable slice of
// its own wood grain, the same 9-slice trick as the ribbon banner. Sized to
// the ~190px the row already budgeted the town name (six 26px controls take
// the rest), rather than growing with the available space the way a true
// flex mid-tile would — a short name would otherwise leave the pencil cap
// stranded far from the text with a slab of bare wood between them.
const PLATE_WIDTH = 190;
const PLATE_HEIGHT = 34;
const PLATE_CAP_LEFT_W = 46;
const PLATE_CAP_RIGHT_W = 48;

export function InflationHeader({
  townName,
  emblem,
  emblemColor,
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
    <View style={styles.outer}>
      {/* The town's own skyline, cropped from the reskin reference sheet —
          a decorative band sitting above the control panel rather than
          behind it, the same layering the reference itself uses: this busy
          a daytime painting behind the gold stat numbers and six small
          control icons would have wrecked their contrast. */}
      <Image source={skylineImage} style={styles.skyline} resizeMode="cover" />
      <View style={styles.wrap}>
        <GradientFill colors={["#3a2a16", "#1c140c"]} x1="0" y1="0" x2="0" y2="1" />
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
              style={{
                width: PLATE_WIDTH - PLATE_CAP_LEFT_W - PLATE_CAP_RIGHT_W,
                height: PLATE_HEIGHT,
                marginHorizontal: -1,
              }}
              resizeMode="stretch"
            />
            <Image
              source={titleplateRight}
              style={{ width: PLATE_CAP_RIGHT_W, height: PLATE_HEIGHT }}
              resizeMode="stretch"
            />
            {/* The pencil (tap-to-rename) is already baked into the right
                cap's art, so there's no separate ✏️ to draw — only the
                town's own name, shrinking to fit rather than truncating. */}
            <View style={styles.plateTextWrap} pointerEvents="none">
              <Text style={styles.town} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                <Text style={{ textShadowColor: emblemColor }}>{emblem}</Text> {townName.toUpperCase()}
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
          <StatusChip cap={chipVillageLeft} fill="#55361a" capWidth={26}>
            <Text style={styles.streakBadgeText} numberOfLines={1}>
              {rankTitle}
            </Text>
          </StatusChip>
          <StatusChip cap={chipRankLeft} fill="#133b5d" capWidth={30}>
            <Text style={styles.streakBadgeText} numberOfLines={1}>
              {t(difficultyConfig.labelKey)}
            </Text>
          </StatusChip>
          <StatusChip cap={chipSeasonLeft} fill="#244b21" capWidth={26}>
            <Text style={styles.streakBadgeText} numberOfLines={1}>
              {t(seasonFromTick(tick).nameKey)} · {t("header.day", { day: gameDay })}
            </Text>
          </StatusChip>
          {streakCount > 0 && (
            <StatusChip cap={chipStreakLeft} fill="#6e241d" capWidth={30}>
              <Animated.Text style={[styles.streakBadgeText, { transform: [{ scale: flameScale }] }]}>
                {streakCount}
              </Animated.Text>
            </StatusChip>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>{t("header.cash")}</Text>
            <AnimatedNumber value={cash} formatter={formatCoins} style={styles.statValue} />
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>{t("header.netWorth")}</Text>
            <AnimatedNumber value={netWorth} formatter={formatCoins} style={styles.statValue} />
          </View>
          <SpotlightTarget
            id="inflation"
            style={[styles.stat, styles.inflationStat, hot && glowShadow("#e0693f")]}
          >
            {hot && (
              <Animated.View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, styles.hotGlow, { opacity: hotGlowOpacity }]}
              />
            )}
            <View style={styles.inflationTextCol}>
              <Text style={styles.statLabel}>{t("header.inflation")}</Text>
              {/* The daily rate is its own line rather than a small Text nested
                inside the index. Inline, it wrapped wherever it ran out of
                room — on a narrow phone the closing bracket ended up alone on
                a third line, under the sparkline. */}
              <Text style={[styles.statValue, { color: hot ? "#ff8a5c" : "#e8c777" }]} numberOfLines={1}>
                {formatNumber(inflationIndex, language, 1)}
              </Text>
              <Text style={[styles.inflationRate, { color: hot ? "#ff8a5c" : "#e8c777" }]} numberOfLines={1}>
                {"("}
                {dailyInflationPct >= 0 ? "+" : ""}
                {formatPercent(dailyInflationPct, language, 2)}
                {t("header.perTurn")}
                {")"}
              </Text>
            </View>
            <PriceChart
              history={inflationHistory}
              color={hot ? "#ff8a5c" : "#e8c777"}
              width={70}
              height={30}
              strokeWidth={1.5}
            />
          </SpotlightTarget>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { overflow: "hidden" },
  skyline: { width: "100%", height: 52 },
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
  townNamePressable: { flexDirection: "row", width: PLATE_WIDTH, height: PLATE_HEIGHT },
  plateTextWrap: {
    position: "absolute",
    left: PLATE_CAP_LEFT_W - 2,
    right: PLATE_CAP_RIGHT_W - 6,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  town: {
    color: "#ffd75e",
    fontFamily: FONT.display,
    fontSize: TYPE.body,
    letterSpacing: 0.3,
    textShadowColor: "rgba(255, 200, 90, 0.55)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  // The chip's own cap image carries the icon and the rounded left edge;
  // the body is a plain flex:1 fill in the pill's sampled color with the
  // right corners rounded here, rather than a second cropped image — the
  // source pill's body has no texture of its own, so a flat code-drawn fill
  // is pixel-identical to a crop of it (see StatusChip's own comment).
  chip: { flexDirection: "row", alignItems: "center", height: CHIP_HEIGHT, flexShrink: 1 },
  chipBody: {
    flex: 1,
    height: CHIP_HEIGHT,
    borderTopRightRadius: CHIP_HEIGHT / 2,
    borderBottomRightRadius: CHIP_HEIGHT / 2,
    justifyContent: "center",
    paddingLeft: 4,
    paddingRight: SPACING.sm,
  },
  streakBadgeText: {
    color: COLORS.textPrimary,
    fontSize: TYPE.caption,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
  },
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
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  stat: { flex: 1 },
  statLabel: { color: COLORS.textMuted, fontSize: TYPE.micro, marginBottom: 2 },
  statValue: {
    color: COLORS.textPrimary,
    fontSize: TYPE.title,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
  },
  inflationStat: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inflationTextCol: { flex: 1 },
  inflationRate: { fontSize: 11, fontFamily: FONT.medium },
  hotGlow: { backgroundColor: "#e0693f", borderRadius: 10 },
});
