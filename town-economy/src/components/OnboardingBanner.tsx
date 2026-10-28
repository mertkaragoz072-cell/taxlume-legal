import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import questPanelBg from "../../assets/ui/quest-panel-bg.png";
import { useEconomyContext } from "../economy/EconomyContext";
import { ONBOARDING_STEPS, currentOnboardingStep } from "../economy/onboarding";
import { FONT, GOLD_GRADIENT, SPACING, TYPE } from "../theme";
import { GradientFill } from "./GradientFill";
import { ScalePressable } from "./ScalePressable";
import { ScreenId, TAB_LABEL_KEYS } from "./TabBar";

interface Props {
  onGoToScreen: (screen: ScreenId) => void;
  /** the tab the player is looking at, so the banner does not send them
   * somewhere they already are */
  activeScreen: ScreenId;
}

// The whole card is one illustrated panel now (frame, ribbon, cart, arrow
// and an empty progress track all baked into a single image) rather than a
// plain color card with a separate ribbon glued on top of it. Every
// position below is that image's own layout, read off its pixels and
// expressed as a fraction of its 1991x658 size — the card is pinned to
// that same aspect ratio (see `card` below) so the fractions still line up
// with the art at any screen width, and the image itself is never
// resized out of its own proportions.
const PANEL_ASPECT_RATIO = 1991 / 658;
const pct = (px: number, of: "w" | "h") => `${(px / (of === "w" ? 1991 : 658)) * 100}%` as const;

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
  const progressPct = (state.onboardingStep / ONBOARDING_STEPS.length) * 100;

  return (
    <ScalePressable
      style={styles.card}
      onPress={() => onGoToScreen(step.screen)}
      disabled={alreadyHere}
      scaleTo={alreadyHere ? 1 : 0.985}
      accessibilityLabel={t(step.titleKey)}
    >
      <Image
        source={questPanelBg}
        style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]}
        resizeMode="stretch"
      />

      {/* The ribbon shape is baked into the panel; only the label (a
          translated string) is still code — same reasoning as every other
          piece of ribbon art this session. */}
      <View style={styles.ribbonTextWrap} pointerEvents="none">
        <Text style={styles.eyebrow} numberOfLines={1}>
          {t("onboarding.banner")}
        </Text>
      </View>
      <View style={styles.progressWrap} pointerEvents="none">
        <Text style={styles.progress} numberOfLines={1}>
          {t("onboarding.progress", {
            done: String(state.onboardingStep),
            total: String(ONBOARDING_STEPS.length),
          })}
        </Text>
      </View>

      {/* The step's own icon used to sit here as an emoji; the panel's
          cart illustration now fills that same corner, so there's nothing
          left to draw a second icon over. */}
      <View style={styles.textWrap}>
        <View style={styles.titleLine}>
          <Text style={styles.title} numberOfLines={1}>
            {t(step.titleKey)}
          </Text>
          <Text style={styles.reward}>+{step.reward} 🪙</Text>
        </View>
        <Text style={styles.description} numberOfLines={2}>
          {t(step.descriptionKey)}
          {!alreadyHere && (
            <Text style={styles.goTo}> {t("onboarding.goTo", { tab: t(TAB_LABEL_KEYS[step.screen]) })}</Text>
          )}
        </Text>
      </View>

      {/* The track itself is baked into the panel (the dark groove with a
          gold cap at its left end); only the gold fill is still drawn,
          sized to the player's actual progress and positioned over that
          same groove. */}
      <View style={styles.trackWrap} pointerEvents="none">
        <View style={[styles.fill, { width: `${progressPct}%` }]}>
          {progressPct > 0 && <GradientFill colors={GOLD_GRADIENT} />}
        </View>
      </View>
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.lg,
    // EventBanner/ComboBanner above it carry no bottom margin of their own,
    // so without this the two sit flush against each other with no seam —
    // exactly the crowded look this was reported for.
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    aspectRatio: PANEL_ASPECT_RATIO,
    overflow: "hidden",
  },
  ribbonTextWrap: {
    position: "absolute",
    left: pct(230, "w"),
    right: `${100 - (815 / 1991) * 100}%`,
    top: pct(65, "h"),
    bottom: `${100 - (210 / 658) * 100}%`,
    justifyContent: "center",
  },
  eyebrow: {
    color: "#f4e8ce",
    fontFamily: FONT.bold,
    fontSize: TYPE.caption,
    letterSpacing: 1.2,
  },
  progressWrap: {
    position: "absolute",
    right: "9%",
    top: pct(150, "h"),
    bottom: `${100 - (210 / 658) * 100}%`,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  progress: {
    color: "#8a5a1f",
    fontFamily: FONT.medium,
    fontSize: TYPE.caption,
  },
  textWrap: {
    position: "absolute",
    left: pct(430, "w"),
    right: "9%",
    // The baked ribbon art fills this column down to ~y=210, and the baked
    // progress groove starts at ~y=430 — this band is already as tall as
    // the art allows, so the font sizes below are tuned to fit inside it
    // (not the app's usual TYPE scale) rather than the other way around.
    top: pct(215, "h"),
    bottom: `${100 - (428 / 658) * 100}%`,
    justifyContent: "center",
    // A safety net, not the fit itself: on a screen narrow enough that two
    // lines of a long description still don't fit this band, clip rather
    // than let it spill text over the baked progress groove below.
    overflow: "hidden",
  },
  titleLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  title: { color: "#3d2415", fontFamily: FONT.bold, fontSize: 11, flexShrink: 1 },
  description: {
    color: "#6b5436",
    fontFamily: FONT.regular,
    fontSize: 9,
    lineHeight: 10,
  },
  goTo: { color: "#8a5a1f", fontFamily: FONT.medium },
  reward: { color: "#8a5a1f", fontFamily: FONT.bold, fontSize: 9 },

  trackWrap: {
    position: "absolute",
    left: pct(475, "w"),
    right: pct(95, "w"),
    top: pct(428, "h"),
    bottom: `${100 - (462 / 658) * 100}%`,
    borderRadius: 999,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 999, overflow: "hidden" },
});
