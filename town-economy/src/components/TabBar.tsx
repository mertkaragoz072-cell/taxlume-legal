import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { ScalePressable } from "./ScalePressable";

export type ScreenId =
  | "market"
  | "inventory"
  | "trade"
  | "town"
  | "research"
  | "invest"
  | "achievements";

const TABS: { id: ScreenId; labelKey: string; icon: string }[] = [
  { id: "market", labelKey: "tabs.market", icon: "📈" },
  { id: "inventory", labelKey: "tabs.inventory", icon: "🎒" },
  { id: "trade", labelKey: "tabs.trade", icon: "🚚" },
  { id: "town", labelKey: "tabs.town", icon: "🏘️" },
  { id: "research", labelKey: "tabs.research", icon: "🔬" },
  { id: "invest", labelKey: "tabs.invest", icon: "💹" },
  { id: "achievements", labelKey: "tabs.achievements", icon: "🏆" },
];

interface Props {
  active: ScreenId;
  onChange: (screen: ScreenId) => void;
}

export function TabBar({ active, onChange }: Props) {
  const { t } = useEconomyContext();
  const activeIndex = TABS.findIndex((tab) => tab.id === active);
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
    <View style={styles.wrap}>
      <Animated.View
        pointerEvents="none"
        style={[styles.indicatorSlot, { left: indicatorLeft, width: `${100 / TABS.length}%` }]}
      >
        <View style={styles.indicatorPill} />
      </Animated.View>
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <ScalePressable key={tab.id} onPress={() => onChange(tab.id)} style={styles.tab} scaleTo={0.9}>
            <Text style={[styles.icon, isActive && styles.iconActive]}>{tab.icon}</Text>
            <Text style={[styles.label, isActive && styles.labelActive]}>{t(tab.labelKey)}</Text>
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
    backgroundColor: "rgba(232,199,119,0.14)",
    borderWidth: 1,
    borderColor: "rgba(232,199,119,0.35)",
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 4 },
  icon: { fontSize: 18, opacity: 0.5 },
  iconActive: { opacity: 1 },
  label: { fontSize: 10, color: "#a0917a", marginTop: 2, fontWeight: "600" },
  labelActive: { color: "#e8c777" },
});
