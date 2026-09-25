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
  /** the tab the player is looking at, so the banner does not send them
   * somewhere they already are */
  activeScreen: ScreenId;
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
export function OnboardingBanner({ onGoToScreen, activeScreen }: Props) {
  const { state, t } = useEconomyContext();
  const step = currentOnboardingStep(state);
  if (!step) return null;

  // "Go to the Market tab", read while standing on the Market tab, and a
  // press that lands you exactly where you were. It works, which is worse
  // than if it did not: the player presses it, nothing on screen changes,
  // and they conclude the button is broken. On the screen the task is
  // about, the banner is a standing instruction and nothing more.
  const alreadyHere = step.screen === activeScreen;

  return (
    <ScalePressable
      style={styles.card}
      onPress={() => onGoToScreen(step.screen)}
      disabled={alreadyHere}
      scaleTo={alreadyHere ? 1 : 0.985}
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
          {/* Title and reward share a line, and the tab hint rides on the end
              of the description. The three used to have a row each, which put
              the banner at a third of the screen on every tab — a standing
              instruction should not cost more room than the thing it is
              instructing about. */}
          <View style={styles.titleLine}>
            <Text style={styles.title} numberOfLines={1}>
              {t(step.titleKey)}
            </Text>
            <Text style={styles.reward}>+{step.reward} 🪙</Text>
          </View>
          <Text style={styles.description}>
            {t(step.descriptionKey)}
            {!alreadyHere && (
              <Text style={styles.goTo}>
                {" "}
                {t("onboarding.goTo", { tab: t(TAB_LABEL_KEYS[step.screen]) })} ›
              </Text>
            )}
          </Text>
        </View>
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
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: withAlpha(COLORS.accent, 0.35),
    backgroundColor: withAlpha("#e8c777", 0.08),
    gap: SPACING.xs + 2,
  },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrow: {
    color: COLORS.accent,
    fontFamily: FONT.bold,
    fontSize: TYPE.caption,
    letterSpacing: 1.2,
  },
  progress: { color: COLORS.textMuted, fontFamily: FONT.medium, fontSize: TYPE.caption },

  row: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.sm + 2 },
  icon: { fontSize: 22, lineHeight: 26 },
  text: { flex: 1, gap: 1 },
  titleLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  title: { color: COLORS.textPrimary, fontFamily: FONT.bold, fontSize: TYPE.body, flexShrink: 1 },
  description: {
    color: COLORS.textMuted,
    fontFamily: FONT.regular,
    fontSize: TYPE.caption,
    lineHeight: 16,
  },
  goTo: { color: COLORS.accent, fontFamily: FONT.medium },
  reward: { color: COLORS.accent, fontFamily: FONT.bold, fontSize: TYPE.caption },

  track: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: withAlpha("#000000", 0.35),
  },
  fill: { height: "100%", borderRadius: 2, overflow: "hidden" },
});
