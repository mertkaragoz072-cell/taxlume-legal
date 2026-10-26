import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { COLORS, FONT, glowShadow, TYPE, WEIGHT } from "../theme";
import { ScalePressable } from "./ScalePressable";
import achievementsBadge from "../../assets/ui/tabs/achievements.png";
import inventoryBadge from "../../assets/ui/tabs/inventory.png";
import investBadge from "../../assets/ui/tabs/invest.png";
import marketBadge from "../../assets/ui/tabs/market.png";
import researchBadge from "../../assets/ui/tabs/research.png";
import townBadge from "../../assets/ui/tabs/town.png";
import tradeBadge from "../../assets/ui/tabs/trade.png";

export type ScreenId = "market" | "inventory" | "trade" | "town" | "research" | "invest" | "achievements";

// One painted badge per tab, cropped straight from the reskin reference
// sheet — each already carries its own colour and wood frame, so the badge
// is no longer drawn (a tinted View plus a vector glyph); only which state
// a tab is in (active, spotlit, just tapped) is still rendered in code, as
// an opacity/glow/scale layered over this same image for every tab.
const TAB_IMAGES: Record<ScreenId, number> = {
  market: marketBadge,
  inventory: inventoryBadge,
  trade: tradeBadge,
  town: townBadge,
  research: researchBadge,
  invest: investBadge,
  achievements: achievementsBadge,
};

const TABS: { id: ScreenId; labelKey: string; color: string }[] = [
  { id: "market", labelKey: "tabs.market", color: "#e8c777" },
  { id: "inventory", labelKey: "tabs.inventory", color: "#5fd884" },
  { id: "trade", labelKey: "tabs.trade", color: "#6fb8f2" },
  { id: "town", labelKey: "tabs.town", color: "#c58ee0" },
  { id: "research", labelKey: "tabs.research", color: "#4fc3c9" },
  { id: "invest", labelKey: "tabs.invest", color: "#e0a13f" },
  { id: "achievements", labelKey: "tabs.achievements", color: "#f0776a" },
];

/** Tab id to its label key, so anything that needs to *name* a tab — the
 * onboarding banner pointing a player at one — reads the same list the tab
 * bar renders, rather than keeping a second copy that drifts. */
export const TAB_LABEL_KEYS: Record<ScreenId, string> = Object.fromEntries(
  TABS.map((tab) => [tab.id, tab.labelKey])
) as Record<ScreenId, string>;

interface Props {
  active: ScreenId;
  onChange: (screen: ScreenId) => void;
  /** a tab to call attention to — the mentor's walk-through names one tab
   * per beat and this is how the bar points at it. Null the rest of the
   * time, which is every moment after the first session. */
  spotlight?: ScreenId | null;
  /** follows the app's one sound/haptic mute switch (see useSoundEffects) —
   * a tab switch has no sound of its own to mute, but the tap still ought
   * to go quiet with everything else rather than becoming the one thing
   * "quiet mode" doesn't quiet. */
  muted?: boolean;
}

export function TabBar({ active, onChange, spotlight = null, muted = false }: Props) {
  const { t } = useEconomyContext();
  // A slow breath rather than a blink: the tour holds on one tab for as
  // long as the player takes to read a sentence, and anything faster turns
  // into a flicker sitting under the text they are reading.
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!spotlight) return;
    pulse.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, spotlight]);
  const activeIndex = TABS.findIndex((tab) => tab.id === active);
  const activeColor = TABS[activeIndex].color;
  const indicatorAnim = useRef(new Animated.Value(activeIndex)).current;

  useEffect(() => {
    // Animating a percentage "left" string can't use the native driver.
    Animated.spring(indicatorAnim, {
      toValue: activeIndex,
      useNativeDriver: false,
      friction: 8,
      tension: 60,
    }).start();
  }, [activeIndex, indicatorAnim]);

  // A little jelly pop on whichever badge just became active — a static
  // 1.06 scale (the previous version of this bar) reads as "slightly
  // bigger," not "alive." One shared value per tab rather than driving the
  // active tab's scale off a single value that would have to jump between
  // positions in the array: each tab owns its own resting size, and only
  // the one that just got tapped overshoots past it before settling.
  const badgeScale = useRef(TABS.map(() => new Animated.Value(1))).current;
  useEffect(() => {
    badgeScale[activeIndex].setValue(0.6);
    Animated.spring(badgeScale[activeIndex], {
      toValue: 1,
      useNativeDriver: true,
      friction: 4.5,
      tension: 260,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  const indicatorLeft = indicatorAnim.interpolate({
    inputRange: TABS.map((_, i) => i),
    outputRange: TABS.map((_, i) => `${(i / TABS.length) * 100}%`),
  });

  return (
    <View style={styles.wrap} accessibilityRole="tablist">
      {/* A slim underline riding above the tabs rather than a pill sitting
          behind one — each tab now carries its own colour on its icon badge
          below, so a second full-width colour wash back there just muddied
          it. The moving bar keeps the "where am I" continuity between taps
          without competing with the badges for attention. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.indicatorSlot, { left: indicatorLeft, width: `${100 / TABS.length}%` }]}
      >
        <View style={[styles.indicatorBar, { backgroundColor: activeColor }, glowShadow(activeColor)]} />
      </Animated.View>
      {TABS.map((tab, i) => {
        const isActive = tab.id === active;
        const lit = tab.id === spotlight;
        return (
          <ScalePressable
            key={tab.id}
            onPress={() => {
              if (!muted) Haptics.selectionAsync().catch(() => {});
              onChange(tab.id);
            }}
            style={styles.tab}
            scaleTo={0.9}
            accessibilityRole="tab"
            aria-selected={isActive}
            accessibilityLabel={t(tab.labelKey)}
          >
            {lit && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.spotlight,
                  {
                    borderColor: tab.color,
                    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.95] }),
                    transform: [
                      { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.04] }) },
                    ],
                  },
                ]}
              />
            )}
            {/* The painted badge carries its own colour and frame now, so
                only the active/inactive *state* is still drawn: a resting
                tab's badge sits dimmed, an active one at full strength plus
                a glow in the tab's own colour — the same shadow-isolation
                trick as before (the shadow lives on this static View, the
                spring "pop" on the Animated.View nested inside it, never
                the same native-driven layer, or an active badge stays
                permanently blurred on a real phone). */}
            <View style={[styles.iconBadge, isActive && glowShadow(tab.color)]}>
              <Animated.View style={{ transform: [{ scale: badgeScale[i] }], opacity: isActive ? 1 : 0.6 }}>
                <Image source={TAB_IMAGES[tab.id]} style={styles.badgeImage} resizeMode="contain" />
              </Animated.View>
            </View>
            <Text style={[styles.label, isActive && { color: tab.color, fontFamily: FONT.bold }]}>
              {t(tab.labelKey)}
            </Text>
          </ScalePressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    backgroundColor: "#1a1410",
    borderTopWidth: 1,
    borderTopColor: "#3a2d1e",
    paddingBottom: 6,
    paddingTop: 8,
  },
  indicatorSlot: {
    position: "absolute",
    top: 0,
    alignItems: "center",
  },
  indicatorBar: {
    width: 28,
    height: 3,
    borderRadius: 2,
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 4, gap: 3 },
  spotlight: {
    position: "absolute",
    top: 0,
    left: 4,
    right: 4,
    bottom: 0,
    borderRadius: 14,
    borderWidth: 2,
  },
  iconBadge: {
    width: 36,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeImage: { width: 36, height: 32 },
  label: {
    fontSize: TYPE.micro,
    color: COLORS.textMuted,
    fontWeight: WEIGHT.medium,
    fontFamily: FONT.medium,
  },
});
