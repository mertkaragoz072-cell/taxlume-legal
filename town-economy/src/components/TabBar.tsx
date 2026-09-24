import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { COLORS, FONT, TYPE, WEIGHT, withAlpha } from "../theme";
import { ScalePressable } from "./ScalePressable";

export type ScreenId = "market" | "inventory" | "trade" | "town" | "research" | "invest" | "achievements";

const TABS: { id: ScreenId; labelKey: string; icon: string; color: string }[] = [
  { id: "market", labelKey: "tabs.market", icon: "📈", color: "#e8c777" },
  { id: "inventory", labelKey: "tabs.inventory", icon: "🎒", color: "#5fd884" },
  { id: "trade", labelKey: "tabs.trade", icon: "🚚", color: "#6fb8f2" },
  { id: "town", labelKey: "tabs.town", icon: "🏘️", color: "#c58ee0" },
  { id: "research", labelKey: "tabs.research", icon: "🔬", color: "#4fc3c9" },
  { id: "invest", labelKey: "tabs.invest", icon: "💹", color: "#e0a13f" },
  { id: "achievements", labelKey: "tabs.achievements", icon: "🏆", color: "#f0776a" },
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
}

export function TabBar({ active, onChange, spotlight = null }: Props) {
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

  const indicatorLeft = indicatorAnim.interpolate({
    inputRange: TABS.map((_, i) => i),
    outputRange: TABS.map((_, i) => `${(i / TABS.length) * 100}%`),
  });

  return (
    <View style={styles.wrap} accessibilityRole="tablist">
      <Animated.View
        pointerEvents="none"
        style={[styles.indicatorSlot, { left: indicatorLeft, width: `${100 / TABS.length}%` }]}
      >
        <View
          style={[
            styles.indicatorPill,
            { backgroundColor: withAlpha(activeColor, 0.14), borderColor: withAlpha(activeColor, 0.4) },
          ]}
        />
      </Animated.View>
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        const lit = tab.id === spotlight;
        return (
          <ScalePressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
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
            {/* The emoji is decoration for a label that is already read out;
                left visible it makes every tab announce a stray icon name. */}
            <Text aria-hidden style={[styles.icon, isActive && styles.iconActive]}>
              {tab.icon}
            </Text>
            <Text style={[styles.label, isActive && { color: tab.color }]}>{t(tab.labelKey)}</Text>
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
    paddingTop: 6,
  },
  indicatorSlot: {
    position: "absolute",
    top: 2,
    bottom: 2,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  indicatorPill: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
    borderWidth: 1,
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 4 },
  spotlight: {
    position: "absolute",
    top: 0,
    left: 4,
    right: 4,
    bottom: 0,
    borderRadius: 14,
    borderWidth: 2,
  },
  icon: { fontSize: TYPE.heading, opacity: 0.5 },
  iconActive: { opacity: 1 },
  label: {
    fontSize: TYPE.micro,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: WEIGHT.medium,
    fontFamily: FONT.medium,
  },
});
