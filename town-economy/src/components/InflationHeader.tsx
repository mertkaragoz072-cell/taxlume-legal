import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { DIFFICULTIES, DifficultyId } from "../economy/difficulty";
import { Language } from "../i18n/t";
import { COLORS, FONT, glowShadow, SPACING, TYPE, WEIGHT, withAlpha } from "../theme";
import { formatCoins as formatCoinsUtil } from "../utils/formatNumber";
import { AnimatedNumber } from "./AnimatedNumber";
import { GradientFill } from "./GradientFill";
import { PriceChart } from "./PriceChart";

interface Props {
  townName: string;
  emblem: string;
  emblemColor: string;
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
  difficulty: DifficultyId;
  language: Language;
  t: (key: string, params?: Record<string, string | number>) => string;
  onTogglePause: () => void;
  onToggleMuted: () => void;
  onToggleLanguage: () => void;
  onReset: () => void;
  onHelp: () => void;
  onEditName: () => void;
}

export function InflationHeader({
  townName,
  emblem,
  emblemColor,
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
  difficulty,
  language,
  t,
  onTogglePause,
  onToggleMuted,
  onToggleLanguage,
  onReset,
  onHelp,
  onEditName,
}: Props) {
  const hot = inflationRate > 0.006;
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

  return (
    <View style={styles.wrap}>
      <GradientFill colors={["#3a2a16", "#1c140c"]} x1="0" y1="0" x2="0" y2="1" />
      <View style={styles.goldLine} />
      <View style={styles.nameRow}>
        <Pressable
          onPress={onEditName}
          style={styles.townNamePressable}
          accessibilityRole="button"
          accessibilityLabel={t("a11y.editTownName")}
        >
          <Text style={styles.town} numberOfLines={1}>
            <Text style={{ textShadowColor: emblemColor }}>{emblem}</Text>{" "}
            {townName.toUpperCase()} ✏️
          </Text>
        </Pressable>
      </View>
      <View style={styles.metaRow}>
        <View style={styles.townRow}>
          <View style={[styles.streakBadge, styles.streakBadgeRow, { backgroundColor: withAlpha("#e8c777", 0.22) }]}>
            <Text style={styles.streakBadgeText}>
              {rankIcon} {rankTitle}
            </Text>
          </View>
          <View style={[styles.streakBadge, { backgroundColor: withAlpha("#6fb8f2", 0.18) }]}>
            <Text style={styles.streakBadgeText}>
              {difficultyConfig.icon} {t(difficultyConfig.labelKey)}
            </Text>
          </View>
          <View style={[styles.streakBadge, { backgroundColor: withAlpha("#e8c777", 0.18) }]}>
            <Text style={styles.streakBadgeText}>📅 {t("header.day", { day: gameDay })}</Text>
          </View>
          {streakCount > 0 && (
            <View
              style={[
                styles.streakBadge,
                styles.streakBadgeRow,
                { backgroundColor: withAlpha("#f0776a", 0.22) },
              ]}
            >
              <Animated.Text style={[styles.flameEmoji, { transform: [{ scale: flameScale }] }]}>
                🔥
              </Animated.Text>
              <Text style={styles.streakBadgeText}>{streakCount}</Text>
            </View>
          )}
        </View>
        <View style={styles.controls}>
          <Pressable
            onPress={onToggleLanguage}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel={t("a11y.toggleLanguage")}
          >
            <Text style={styles.langBtnText}>{language === "tr" ? "TR" : "EN"}</Text>
          </Pressable>
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

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>{t("header.cash")}</Text>
          <AnimatedNumber value={cash} formatter={formatCoins} style={styles.statValue} />
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>{t("header.netWorth")}</Text>
          <AnimatedNumber value={netWorth} formatter={formatCoins} style={styles.statValue} />
        </View>
        <View
          style={[
            styles.stat,
            styles.inflationStat,
            hot && glowShadow("#e0693f"),
          ]}
        >
          {hot && (
            <Animated.View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                styles.hotGlow,
                { opacity: hotGlowOpacity },
              ]}
            />
          )}
          <View style={styles.inflationTextCol}>
            <Text style={styles.statLabel}>{t("header.inflation")}</Text>
            <Text style={[styles.statValue, { color: hot ? "#ff8a5c" : "#e8c777" }]}>
              {inflationIndex.toFixed(1)}{" "}
              <Text style={{ fontSize: 11 }}>
                ({inflationRate >= 0 ? "+" : ""}
                {(inflationRate * 100).toFixed(2)}%{t("header.perTurn")})
              </Text>
            </Text>
          </View>
          <PriceChart
            history={inflationHistory}
            color={hot ? "#ff8a5c" : "#e8c777"}
            width={70}
            height={30}
            strokeWidth={1.5}
          />
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
  nameRow: { marginBottom: SPACING.xs + 2 },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  townRow: { flexDirection: "row", alignItems: "center", flexShrink: 1, flexWrap: "wrap" },
  townNamePressable: { alignSelf: "flex-start" },
  town: {
    color: "#ffd75e",
    fontFamily: FONT.display,
    fontSize: TYPE.title,
    letterSpacing: 0.5,
    textShadowColor: "rgba(255, 200, 90, 0.55)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  streakBadge: {
    backgroundColor: "#2a2016",
    borderRadius: 10,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    marginLeft: SPACING.sm,
  },
  streakBadgeText: { color: COLORS.textPrimary, fontSize: TYPE.caption, fontWeight: WEIGHT.bold, fontFamily: FONT.bold },
  streakBadgeRow: { flexDirection: "row", alignItems: "center" },
  flameEmoji: { fontSize: TYPE.caption, marginRight: 3 },
  controls: { flexDirection: "row", gap: SPACING.sm },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#2a2016",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: SPACING.sm,
  },
  iconBtnText: { color: COLORS.textPrimary, fontSize: TYPE.body },
  langBtnText: { color: COLORS.accent, fontSize: TYPE.micro, fontWeight: WEIGHT.black, fontFamily: FONT.black },
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  stat: { flex: 1 },
  statLabel: { color: COLORS.textMuted, fontSize: TYPE.micro, marginBottom: 2 },
  statValue: { color: COLORS.textPrimary, fontSize: TYPE.title, fontWeight: WEIGHT.bold, fontFamily: FONT.bold },
  inflationStat: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inflationTextCol: { flex: 1 },
  hotGlow: { backgroundColor: "#e0693f", borderRadius: 10 },
});
