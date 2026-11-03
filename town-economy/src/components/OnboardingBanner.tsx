import React, { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import coinIcon from "../../assets/ui/statpanel2/coinbullet.png";
import { useEconomyContext } from "../economy/EconomyContext";
import { ONBOARDING_STEPS, currentOnboardingStep } from "../economy/onboarding";
import { FONT, GOLD_GRADIENT, PARCHMENT, SPACING, TYPE } from "../theme";
import { GradientFill } from "./GradientFill";
import { ScalePressable } from "./ScalePressable";
import { RibbonLabel } from "./SectionLabel";
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
 * Collapsed it is one compact strip (title, reward, progress); the arrow at
 * its right end opens the full description. Nothing here blocks play. A
 * player who wants to ignore it and trade can, and the steps will tick off
 * behind them.
 */
export function OnboardingBanner({ onGoToScreen, activeScreen }: Props) {
  const { state, t } = useEconomyContext();
  const [expanded, setExpanded] = useState(false);
  const step = currentOnboardingStep(state);
  if (!step) return null;

  // "Go to the Market tab", read while standing on the Market tab, and a
  // press that lands you exactly where you were. It works, which is worse
  // than if it did not: the player presses it, nothing on screen changes,
  // and they conclude the button is broken. On the screen the task is
  // about, the banner is a standing instruction and nothing more.
  const alreadyHere = step.screen === activeScreen;
  const progressPct = (state.onboardingStep / ONBOARDING_STEPS.length) * 100;

  return (
    <View style={styles.card}>
      <ScalePressable
        style={styles.main}
        onPress={() => onGoToScreen(step.screen)}
        disabled={alreadyHere}
        scaleTo={alreadyHere ? 1 : 0.985}
        accessibilityLabel={t(step.titleKey)}
      >
        <View style={styles.topLine}>
          <RibbonLabel text={t("onboarding.banner")} height={28} fontSize={TYPE.label} />
          <Text style={styles.title} numberOfLines={1}>
            {t(step.titleKey)}
          </Text>
          <View style={styles.rewardWrap}>
            <Text style={styles.reward}>+{step.reward}</Text>
            <Image source={coinIcon} style={styles.coin} resizeMode="contain" />
          </View>
        </View>
        <View style={styles.barLine}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progressPct}%` }]}>
              {progressPct > 0 && <GradientFill colors={GOLD_GRADIENT} />}
            </View>
          </View>
          <Text style={styles.progress} numberOfLines={1}>
            {t("onboarding.progress", {
              done: String(state.onboardingStep),
              total: String(ONBOARDING_STEPS.length),
            })}
          </Text>
        </View>
        {expanded && (
          <Text style={styles.description}>
            {t(step.descriptionKey)}
            {!alreadyHere && (
              <Text style={styles.goTo}>
                {" "}
                {t("onboarding.goTo", { tab: t(TAB_LABEL_KEYS[step.screen]) })}
              </Text>
            )}
          </Text>
        )}
      </ScalePressable>
      <Pressable
        style={styles.toggle}
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={t(step.descriptionKey)}
        accessibilityState={{ expanded }}
        hitSlop={6}
      >
        <Text style={styles.chevron}>{expanded ? "▴" : "▾"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
    marginHorizontal: 6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#b88a4a",
    backgroundColor: PARCHMENT.paper,
    overflow: "hidden",
  },
  main: { flex: 1, paddingVertical: 6, paddingLeft: 8, paddingRight: 2 },
  topLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, color: PARCHMENT.ink, fontFamily: FONT.bold, fontSize: TYPE.body },
  rewardWrap: { flexDirection: "row", alignItems: "center", gap: 3 },
  reward: { color: "#8a5a1f", fontFamily: FONT.bold, fontSize: TYPE.label },
  coin: { width: 15, height: 15 },
  barLine: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 5 },
  track: {
    flex: 1,
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(61,36,21,0.55)",
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 999, overflow: "hidden" },
  progress: { color: "#8a5a1f", fontFamily: FONT.medium, fontSize: TYPE.caption },
  description: {
    color: "#6b5436",
    fontFamily: FONT.regular,
    fontSize: TYPE.label,
    lineHeight: 16,
    marginTop: 5,
  },
  goTo: { color: "#8a5a1f", fontFamily: FONT.medium },
  toggle: { paddingHorizontal: 10, paddingVertical: 6, alignSelf: "stretch", justifyContent: "center" },
  chevron: { color: "#8a5a1f", fontSize: TYPE.title },
});
