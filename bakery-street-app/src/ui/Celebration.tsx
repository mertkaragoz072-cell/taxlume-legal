// Small pieces of the app shell: the celebration card (stage reached, level-up with new shop items), the panel error guard and the sale toast text.
import React from "react";
import { Animated, Text } from "react-native";
import { Btn, useAppear } from "./kit";
import { C, FONT, fs, useU, TYPE } from "./theme";
import { MOTION } from "./motion";

/** Shown once when the café reaches a new stage: what changed and what comes next. The café itself already looks different behind it. */
export function StageCard({ c, onClose }: { c: { icon: string; title: string; lines: string[] }; onClose: () => void }) {
  const u = useU(), a = useAppear(MOTION.panelEnter, MOTION.panelLeave);
  return (
    <Animated.View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 40, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(70,48,32,0.55)", opacity: a }}>
      <Animated.View style={{ width: "84%", maxWidth: u * 80, padding: u * 3, borderRadius: u * 3, borderWidth: u * 0.5, borderColor: C.honeyDark, backgroundColor: C.cream, alignItems: "center", gap: u * 1.4, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }}>
        <Text allowFontScaling={false} style={{ fontSize: fs(u, 7) }}>{c.icon}</Text>
        <Text allowFontScaling={false} style={{ color: C.brownDark, fontFamily: FONT.bold, fontSize: fs(u, TYPE.title), textAlign: "center" }}>{c.title}</Text>
        <Text allowFontScaling={false} style={{ color: C.brown, fontFamily: FONT.regular, fontSize: fs(u, TYPE.body), textAlign: "center" }}>{c.lines.join("\n")}</Text>
        <Btn label="Harika!" onPress={onClose} />
      </Animated.View>
    </Animated.View>
  );
}


/** One panel that fails to draw must not take the whole game down: it is closed and the player is told, the café keeps running. */
export class PanelBoundary extends React.Component<{ onFail: () => void; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFail(); }
  render() { return this.state.failed ? null : this.props.children; }
}


/** Extra line of the sale toast: which service bonuses applied. */
export function saleNotes(e: any): string {
  const b = e.bonus;
  if (!b?.pct) return "";
  return ` · ${[b.event ? "⭐ haftanın ürünü" : "", b.variety ? "🎨 çeşitlilik" : "", b.favorite ? "♥ favori" : "", b.fast ? "⚡ hızlı servis" : "", b.combo > 1 ? `🔥 ×${b.combo} seri` : ""].filter(Boolean).join(" ")}`;
}

