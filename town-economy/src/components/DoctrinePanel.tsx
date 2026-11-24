import React, { useState } from "react";
import { Image, LayoutChangeEvent, StyleSheet, View } from "react-native";
import chooseArt from "../../assets/ui/doctrine/choose.webp";
import plainArt from "../../assets/ui/doctrine/plain.webp";
import { FONT, PANEL_GAP } from "../theme";
import { Text } from "./AppText";
import { ScalePressable } from "./ScalePressable";

// The sent section card is 1200 x 400 once trimmed: the wheat-wreathed banner
// with lanterns on top, a dark leather card below it. One version carries a big
// gold button along the bottom (choosing); a twin without it serves the locked
// and chosen states. Fields are in those pixels.
const ART_W = 1200;
const ART_H = 400;
const PLAQUE = { x: 290, y: 42, w: 620, h: 72 };
const BODY = { x: 56, y: 172, w: 1088, h: 190 };
const PROMPT = { x: 56, y: 172, w: 1088, h: 70 };
const BUTTON = { x: 44, y: 251, w: 1113, h: 107 };

const GOLD = "#f6e2a0";
const CREAM = "#e9d9b0";

function fit(text: string, boxW: number, max: number, em: number): number {
  return Math.min(max, (boxW * 0.96) / (Math.max(1, text.length) * em));
}

export type DoctrineState =
  | { kind: "locked"; note: string }
  | { kind: "choose"; prompt: string; buttonLabel: string; onChoose: () => void }
  | { kind: "active"; icon: string; name: string; bonus: string; penalty: string };

interface Props {
  title: string;
  state: DoctrineState;
}

/** "Kasaba Yolu": the town's chosen doctrine, on the sent banner-and-leather
 * card. Locked shows the requirement, choose a gold "pick your path" button,
 * active the doctrine's name with its upside and its price. */
export function DoctrinePanel({ title, state }: Props) {
  const [w, setW] = useState(360);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const s = w / ART_W;
  const box = (b: { x: number; y: number; w: number; h: number }) => ({
    position: "absolute" as const,
    left: b.x * s,
    top: b.y * s,
    width: b.w * s,
    height: b.h * s,
  });

  return (
    <View
      style={{ aspectRatio: ART_W / ART_H, alignSelf: "stretch", marginBottom: PANEL_GAP }}
      onLayout={onLayout}
    >
      <Image
        source={state.kind === "choose" ? chooseArt : plainArt}
        style={styles.fill}
        resizeMode="stretch"
      />

      <View style={[box(PLAQUE), styles.center]} pointerEvents="none">
        <Text
          style={[styles.title, { fontSize: Math.min(PLAQUE.h * 0.62, fit(title, PLAQUE.w, 60, 0.86)) * s }]}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {title}
        </Text>
      </View>

      {state.kind === "locked" && (
        <View style={[box(BODY), styles.center]}>
          <Text style={[styles.note, { fontSize: fit(state.note, BODY.w, 44, 0.56) * s }]} numberOfLines={2}>
            {state.note}
          </Text>
        </View>
      )}

      {state.kind === "choose" && (
        <>
          <View style={[box(PROMPT), styles.center]}>
            <Text
              style={[styles.note, { fontSize: fit(state.prompt, PROMPT.w, 42, 0.56) * s }]}
              numberOfLines={2}
            >
              {state.prompt}
            </Text>
          </View>
          <ScalePressable
            onPress={state.onChoose}
            accessibilityLabel={state.buttonLabel}
            style={box(BUTTON)}
            scaleTo={0.98}
          >
            <View style={styles.btnInner}>
              <Text
                style={[
                  styles.btnText,
                  { fontSize: Math.min(BUTTON.h * 0.4, fit(state.buttonLabel, BUTTON.w, 60, 0.66)) * s },
                ]}
                numberOfLines={1}
              >
                {state.buttonLabel}
              </Text>
            </View>
          </ScalePressable>
        </>
      )}

      {state.kind === "active" && (
        <>
          <View style={[box({ x: 70, y: 176, w: 100, h: 100 }), styles.center]}>
            <Text aria-hidden style={{ fontSize: 70 * s }}>
              {state.icon}
            </Text>
          </View>
          <View style={[box({ x: 190, y: 176, w: 940, h: 100 }), { justifyContent: "center" }]}>
            <Text style={[styles.name, { fontSize: fit(state.name, 940, 66, 0.7) * s }]} numberOfLines={1}>
              {state.name}
            </Text>
          </View>
          <View style={[box({ x: 70, y: 278, w: 1060, h: 40 }), { justifyContent: "center" }]}>
            <Text
              style={[styles.bonus, { fontSize: fit(state.bonus, 1060, 36, 0.52) * s }]}
              numberOfLines={1}
            >
              + {state.bonus}
            </Text>
          </View>
          <View style={[box({ x: 70, y: 318, w: 1060, h: 40 }), { justifyContent: "center" }]}>
            <Text
              style={[styles.penalty, { fontSize: fit(state.penalty, 1060, 36, 0.52) * s }]}
              numberOfLines={1}
            >
              − {state.penalty}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  center: { alignItems: "center", justifyContent: "center" },
  title: { color: GOLD, fontFamily: FONT.display, letterSpacing: 1.5 },
  note: { color: CREAM, fontFamily: FONT.medium, textAlign: "center" },
  btnInner: { flex: 1, alignItems: "center", justifyContent: "center" },
  btnText: { color: "#4a2a0e", fontFamily: FONT.black, textAlign: "center" },
  name: { color: "#f6ecd0", fontFamily: FONT.bold },
  bonus: { color: "#8fe0a2", fontFamily: FONT.bold },
  penalty: { color: "#f08a7e", fontFamily: FONT.bold },
});
