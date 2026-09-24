import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { ONBOARDING_STEPS, currentOnboardingStep } from "../economy/onboarding";
import { COLORS, FONT, GOLD_GRADIENT, RADIUS, SPACING, TYPE, withAlpha } from "../theme";
import { GradientFill } from "./GradientFill";
import { ScalePressable } from "./ScalePressable";
import { ScreenId, TAB_LABEL_KEYS } from "./TabBar";

interface Props {
  onGoToScreen: (screen: ScreenId) => void;
}

/** One task at a time, across the top of every screen, until the guided
 * first session is done.
 *
 * It sits above the tabs rather than inside any one of them because the
 * tasks move the player between tabs on purpose — the point is to show that
 * Research and Invest exist at all. Tapping it goes where the task is, which
 * also means a player who has no idea what "send a caravan" means can still
 * find the screen that does it.
 *
 * Nothing here blocks play. A player who wants to ignore it and trade can,
 * and the steps will tick off behind them.
 */
export function OnboardingBanner({ onGoToScreen }: Props) {
  const { state, t } = useEconomyContext();
  const step = currentOnboardingStep(state);
  if (!step) return null;

  const onThisScreen = (screen: ScreenId) => onGoToScreen(screen);

  return (
    <ScalePressable
      style={styles.card}
      onPress={() => onThisScreen(step.screen)}
      scaleTo={0.985}
      accessibilityLabel={t(step.titleKey)}
    >
      <View style={styles.head}>
        <Text style={styles.eyebrow}>{t("onboarding.banner")}</Text>
        <Text style={styles.progress}>
          {t("onboarding.progress", {
            done: String(state.onboardingStep),
            total: String(ONBOARDING_STEPS.length),
          })}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.icon}>{step.icon}</Text>
        <View style={styles.text}>
          <Text style={styles.title}>{t(step.titleKey)}</Text>
          <Text style={styles.description}>{t(step.descriptionKey)}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.goTo}>{t("onboarding.goTo", { tab: t(TAB_LABEL_KEYS[step.screen]) })}</Text>
        <Text style={styles.reward}>+{step.reward} 🪙</Text>
      </View>

      {/* A bar rather than a number, because eight steps is short enough
          that "nearly done" is the useful signal, not the exact count. */}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${(state.onboardingStep / ONBOARDING_STEPS.length) * 100}%` }]}>
          <GradientFill colors={GOLD_GRADIENT} />
        </View>
      </View>
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: withAlpha(COLORS.accent, 0.35),
    backgroundColor: withAlpha("#e8c777", 0.08),
    gap: SPACING.sm,
  },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrow: {
    color: COLORS.accent,
    fontFamily: FONT.bold,
    fontSize: TYPE.caption,
    letterSpacing: 1.2,
  },
  progress: { color: COLORS.textMuted, fontFamily: FONT.medium, fontSize: TYPE.caption },

  row: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.md },
  icon: { fontSize: 26 },
  text: { flex: 1, gap: 2 },
  title: { color: COLORS.textPrimary, fontFamily: FONT.bold, fontSize: TYPE.body },
  description: {
    color: COLORS.textMuted,
    fontFamily: FONT.regular,
    fontSize: TYPE.caption,
    lineHeight: 17,
  },

  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  goTo: { color: COLORS.accent, fontFamily: FONT.medium, fontSize: TYPE.caption },
  reward: { color: COLORS.accent, fontFamily: FONT.bold, fontSize: TYPE.caption },

  track: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: withAlpha("#000000", 0.35),
  },
  fill: { height: "100%", borderRadius: 2, overflow: "hidden" },
});
