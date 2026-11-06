import React, { useState } from "react";
import { Image, LayoutChangeEvent, StyleSheet, View } from "react-native";
import botArt from "../../assets/ui/perks/card_bot.webp";
import medalArt from "../../assets/ui/perks/medal.webp";
import midArt from "../../assets/ui/perks/card_mid.webp";
import topArt from "../../assets/ui/perks/card_top.webp";
import { FONT } from "../theme";
import { Text } from "./AppText";
import { GoldButton } from "./PanelKit";

// The sent perk card is 1107 px wide; its rounded top and bottom (95 px each)
// stay put and the dark middle stretches, so a card is as tall as its words.
const ART_W = 1107;
const CAP = 95;

interface CardProps {
  icon: string;
  name: string;
  /** e.g. "Owned" next to the name */
  tag?: string;
  description: string;
  effect: string;
  /** shown under the effect while the perk's prerequisite is missing */
  requires?: string;
  buttonLabel: string;
  buttonDisabled: boolean;
  onPress: () => void;
}

/** One prestige perk on the sent dark card: its icon, what it does, and the
 * gold cost button (grey when it cannot be bought). */
export function PerkCard({
  icon,
  name,
  tag,
  description,
  effect,
  requires,
  buttonLabel,
  buttonDisabled,
  onPress,
}: CardProps) {
  const [w, setW] = useState(360);
  const [h, setH] = useState(100);
  const s = w / ART_W;
  return (
    <View
      style={styles.wrap}
      onLayout={(e: LayoutChangeEvent) => {
        setW(e.nativeEvent.layout.width);
        setH(e.nativeEvent.layout.height);
      }}
    >
      {/* The stretchy middle runs 2px under both caps so no subpixel gap can
          show the wood behind the card. */}
      <Image
        source={midArt}
        style={{
          position: "absolute",
          left: 0,
          width: "100%",
          top: CAP * s - 2,
          height: Math.max(0, h - 2 * CAP * s + 4),
        }}
        resizeMode="stretch"
      />
      <Image
        source={topArt}
        style={{ position: "absolute", left: 0, top: 0, width: "100%", height: CAP * s }}
        resizeMode="stretch"
      />
      <Image
        source={botArt}
        style={{ position: "absolute", left: 0, bottom: 0, width: "100%", height: CAP * s }}
        resizeMode="stretch"
      />
      <View style={[styles.content, { paddingVertical: 34 * s, paddingLeft: 40 * s, paddingRight: 30 * s }]}>
        <Text aria-hidden style={styles.icon}>
          {icon}
        </Text>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            {tag ? <Text style={styles.tag}>{tag}</Text> : null}
          </View>
          <Text style={styles.desc}>{description}</Text>
          <Text style={styles.effect}>{effect}</Text>
          {requires ? <Text style={styles.requires}>{requires}</Text> : null}
        </View>
        <GoldButton label={buttonLabel} onPress={onPress} disabled={buttonDisabled} height={34} />
      </View>
    </View>
  );
}

/** The "0 perk points" line under the section banner, with the sent medal. */
export function PointsLine({
  text,
  tone = "gold",
  medal = true,
}: {
  text: string;
  tone?: "gold" | "violet";
  medal?: boolean;
}) {
  return (
    <View style={styles.points}>
      {medal ? <Image source={medalArt} style={styles.medal} resizeMode="contain" /> : null}
      <Text style={[styles.pointsText, tone === "violet" && { color: "#d6b3f2" }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 8, minHeight: 72 },
  content: { flexDirection: "row", alignItems: "center" },
  icon: { fontSize: 28, width: 40, textAlign: "center", marginRight: 6 },
  body: { flex: 1, marginRight: 8 },
  titleRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  name: { color: "#f6ecd0", fontFamily: FONT.bold, fontSize: 14, flexShrink: 1 },
  tag: { color: "#f6d27a", fontFamily: FONT.bold, fontSize: 10, marginLeft: 6 },
  desc: { color: "#cdbb94", fontFamily: FONT.medium, fontSize: 11, lineHeight: 15, marginTop: 2 },
  effect: { color: "#8fe0a2", fontFamily: FONT.bold, fontSize: 11, lineHeight: 15, marginTop: 3 },
  requires: { color: "#f08a7e", fontFamily: FONT.medium, fontSize: 10.5, lineHeight: 14, marginTop: 3 },
  points: { flexDirection: "row", alignItems: "center", marginBottom: 6, paddingLeft: 6 },
  medal: { width: 18, height: 28, marginRight: 8 },
  pointsText: { color: "#f6d27a", fontFamily: FONT.bold, fontSize: 13 },
});
