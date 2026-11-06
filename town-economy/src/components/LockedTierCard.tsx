import React from "react";
import { StyleSheet, View } from "react-native";
import lockCard from "../../assets/ui/tradesheet/lock.webp";
import { FONT } from "../theme";
import { Text } from "./AppText";
import { FixedPanel } from "./ImagePanels";

// The sent card is 774 x 249: the castle and its padlock are painted on the
// left, the dark right half is left empty for the words.
const ART_W = 774;
const ART_H = 249;
const TEXT = { x: 345, w: 385 };

interface Props {
  title: string;
  description: string;
  progressText: string;
  /** 0..1 */
  progress: number;
}

/** A tier that is not open yet: painted castle + padlock card with the live
 * requirement, progress groove and count drawn over its empty half. */
export function LockedTierCard({ title, description, progressText, progress }: Props) {
  return (
    <FixedPanel source={lockCard} aspect={ART_W / ART_H} style={{ marginBottom: 8 }}>
      {(w) => {
        const s = w / ART_W;
        const fTitle = Math.max(10, 23 * s);
        const fBody = Math.max(8.5, 19 * s);
        const barH = Math.max(12, 25 * s);
        return (
          <View style={[styles.text, { left: TEXT.x * s, width: TEXT.w * s, top: 24 * s, bottom: 28 * s }]}>
            <Text
              style={[styles.title, { fontSize: fTitle, lineHeight: fTitle * 1.15 }]}
              numberOfLines={2}
              accessibilityRole="header"
            >
              {title}
            </Text>
            <Text style={[styles.desc, { fontSize: fBody, lineHeight: fBody * 1.2 }]} numberOfLines={4}>
              {description}
            </Text>
            <View style={{ flex: 1 }} />
            <View style={[styles.track, { height: barH, borderRadius: barH / 2 }]}>
              <View style={[styles.fill, { width: `${Math.max(0, Math.min(1, progress)) * 100}%` }]} />
              <Text style={[styles.progress, { fontSize: fBody, lineHeight: barH }]} numberOfLines={1}>
                {progressText}
              </Text>
            </View>
          </View>
        );
      }}
    </FixedPanel>
  );
}

const styles = StyleSheet.create({
  text: { position: "absolute" },
  title: { color: "#f3d27a", fontFamily: FONT.display, letterSpacing: 1 },
  desc: { color: "#d9c39a", fontFamily: FONT.serif, marginTop: 3 },
  track: {
    backgroundColor: "#1d130b",
    borderWidth: 1,
    borderColor: "#7a5532",
    overflow: "hidden",
    justifyContent: "center",
  },
  fill: { position: "absolute", top: 0, left: 0, bottom: 0, backgroundColor: "#c98a1d" },
  progress: {
    color: "#fff3c8",
    fontFamily: FONT.bold,
    textAlign: "center",
    textShadowColor: "rgba(20,10,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
