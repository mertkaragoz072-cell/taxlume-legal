import React, { useState } from "react";
import { Image, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Text } from "./AppText";
import Svg, { Circle } from "react-native-svg";
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
  /** opens the quest panel (owned by the app shell) */
  onOpenHub: () => void;
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
export function OnboardingBanner({ onGoToScreen, activeScreen, onOpenHub }: Props) {
  const { state, t } = useEconomyContext();
  const { width: windowWidth } = useWindowDimensions();
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

  // Off the Market tab the task shrinks to one slim pill — progress ring,
  // the task's name and a chevron — so it stays one tap away without
  // pushing every other screen's content down. Where the task is done it
  // opens its description in place; anywhere else a tap goes to the task.
  if (activeScreen !== "market") {
    const R = 11;
    const C = 2 * Math.PI * R;
    return (
      <View style={styles.pillWrap}>
        <Pressable
          style={styles.pill}
          onPress={() => (alreadyHere ? setExpanded((v) => !v) : onGoToScreen(step.screen))}
          accessibilityRole="button"
          accessibilityLabel={t(step.titleKey)}
          accessibilityState={{ expanded }}
        >
          <Pressable
            style={styles.ring}
            onPress={() => onOpenHub()}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={t("onboarding.hubTitle")}
          >
            <Svg width={28} height={28} viewBox="0 0 28 28">
              <Circle cx={14} cy={14} r={R} stroke="rgba(244,232,206,0.18)" strokeWidth={3} fill="none" />
              <Circle
                cx={14}
                cy={14}
                r={R}
                stroke="#e8c777"
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${(C * Math.max(progressPct, 6)) / 100} ${C}`}
                transform="rotate(-90 14 14)"
              />
            </Svg>
            <Text style={styles.ringText}>{state.onboardingStep}</Text>
          </Pressable>
          <Text style={styles.pillTitle} numberOfLines={1}>
            {t(step.titleKey)}
          </Text>
          <Text style={styles.pillReward}>+{step.reward}</Text>
          <Image source={coinIcon} style={styles.pillCoin} resizeMode="contain" />
          <Text style={styles.pillChevron}>{alreadyHere ? (expanded ? "▴" : "▾") : "›"}</Text>
        </Pressable>
        {alreadyHere && expanded && (
          <View style={styles.pillNote}>
            <Text style={styles.pillNoteText}>{t(step.descriptionKey)}</Text>
          </View>
        )}
      </View>
    );
  }

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
          <RibbonLabel text={t("onboarding.banner")} height={24} fontSize={TYPE.caption} />
          <Text
            style={[
              styles.title,
              windowWidth < 370 && { fontSize: windowWidth < 350 ? TYPE.caption : TYPE.label },
            ]}
            numberOfLines={1}
          >
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
        onPress={() => onOpenHub()}
        accessibilityRole="button"
        accessibilityLabel={t("onboarding.hubTitle")}
        hitSlop={6}
      >
        <Text style={styles.chevron}>☰</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pillWrap: { alignItems: "flex-end", marginHorizontal: 6, marginTop: SPACING.xs, marginBottom: SPACING.xs },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "100%",
    gap: 7,
    paddingVertical: 4,
    paddingLeft: 5,
    paddingRight: 11,
    borderRadius: 999,
    backgroundColor: "rgba(36,22,12,0.88)",
    borderWidth: 1.5,
    borderColor: "rgba(232,199,119,0.65)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  ring: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  ringText: {
    position: "absolute",
    color: "#f4e8ce",
    fontFamily: FONT.black,
    fontSize: TYPE.caption,
  },
  pillTitle: { flexShrink: 1, color: "#f4e8ce", fontFamily: FONT.bold, fontSize: TYPE.label },
  pillReward: { color: "#e8c777", fontFamily: FONT.bold, fontSize: TYPE.label },
  pillCoin: { width: 13, height: 13, marginLeft: -4 },
  pillChevron: { color: "#e8c777", fontFamily: FONT.bold, fontSize: TYPE.title, marginTop: -1 },
  pillNote: {
    marginTop: 4,
    alignSelf: "stretch",
    padding: SPACING.sm,
    borderRadius: 12,
    backgroundColor: "rgba(36,22,12,0.92)",
    borderWidth: 1,
    borderColor: "rgba(232,199,119,0.35)",
  },
  pillNoteText: { color: "#e9dcc0", fontFamily: FONT.regular, fontSize: TYPE.label, lineHeight: 16 },
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
  main: { flex: 1, paddingVertical: 4, paddingLeft: 8, paddingRight: 2 },
  topLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, color: PARCHMENT.ink, fontFamily: FONT.bold, fontSize: TYPE.body },
  rewardWrap: { flexDirection: "row", alignItems: "center", gap: 3 },
  reward: { color: "#8a5a1f", fontFamily: FONT.bold, fontSize: TYPE.label },
  coin: { width: 15, height: 15 },
  barLine: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3 },
  track: {
    flex: 1,
    height: 6,
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
