import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ScalePressable } from "./ScalePressable";

export type ScreenId = "market" | "inventory" | "trade" | "town" | "achievements";

const TABS: { id: ScreenId; label: string; icon: string }[] = [
  { id: "market", label: "Piyasa", icon: "📈" },
  { id: "inventory", label: "Envanter", icon: "🎒" },
  { id: "trade", label: "Ticaret", icon: "🚚" },
  { id: "town", label: "Kasaba", icon: "🏘️" },
  { id: "achievements", label: "Hedefler", icon: "🏆" },
];

interface Props {
  active: ScreenId;
  onChange: (screen: ScreenId) => void;
}

export function TabBar({ active, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <ScalePressable key={tab.id} onPress={() => onChange(tab.id)} style={styles.tab} scaleTo={0.9}>
            <Text style={[styles.icon, isActive && styles.iconActive]}>{tab.icon}</Text>
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
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
  tab: { flex: 1, alignItems: "center", paddingVertical: 4 },
  icon: { fontSize: 18, opacity: 0.5 },
  iconActive: { opacity: 1 },
  label: { fontSize: 10, color: "#a0917a", marginTop: 2, fontWeight: "600" },
  labelActive: { color: "#e8c777" },
});
