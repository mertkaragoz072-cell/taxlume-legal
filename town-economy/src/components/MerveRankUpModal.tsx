import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, LayoutChangeEvent, Modal, StyleSheet, View } from "react-native";
import { Text } from "./AppText";
import { useSoundEffects } from "../audio/useSoundEffects";
import { useEconomyContext } from "../economy/EconomyContext";
import { FONT, SPACING, TYPE } from "../theme";
import { ConfettiBurst } from "./ConfettiBurst";
import { ModalBackdrop } from "./ModalBackdrop";
import frameArt from "../../assets/ui/merve/frame.webp";
import { BigButton } from "./ModalKit";

interface Props {
  rankUp: { icon: string; title: string; lore: string } | null;
  onDismiss: () => void;
  sounds: ReturnType<typeof useSoundEffects>;
}

/** Merve, stepping out of her usual guide role to congratulate the player in
 * person the moment the town reaches a new rank — village to town, town to
 * city, and every tier after. The rank-up event still lands in the log
 * (see applyTownRankUp) for the player who wants the full record; this is
 * the one that actually stops them and makes the milestone feel earned. */
export function MerveRankUpModal({ rankUp, onDismiss }: Props) {
  const { t } = useEconomyContext();
  const enter = useRef(new Animated.Value(0)).current;
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [w, setW] = useState(340);

  useEffect(() => {
    if (!rankUp) return;
    setConfettiTrigger((n) => n + 1);
    enter.setValue(0);
    Animated.spring(enter, { toValue: 1, useNativeDriver: true, friction: 7, tension: 55 }).start();
  }, [rankUp, enter]);

  if (!rankUp) return null;
  const k = w / ART_W;
  const u = Math.max(0.82, Math.min(1.08, w / 350));
  const box = (x: number, y: number, bw: number, bh: number) => ({
    position: "absolute" as const,
    left: x * k,
    top: y * k,
    width: bw * k,
    height: bh * k,
  });
  const titleText = t("merveRankUp.title");
  const titleSize = Math.min(22 * u, (410 * k * 0.96) / (titleText.length * 0.86));
  // Body and lore share one size, shrunk until the whole block fits the
  // painted text field (phone fonts run wider than the browser's).
  const bodyText = t("merveRankUp.body", { icon: rankUp.icon, title: rankUp.title });
  const fieldW = 410 * k;
  const fieldH = 350 * k - 14 * u - titleSize * 1.4 - 14;
  let textSize = 14 * u;
  const linesAt = (sz: number) =>
    Math.ceil((bodyText.length * 0.56 * sz) / fieldW) +
    Math.ceil((rankUp.lore.length * 0.56 * sz) / fieldW) +
    0.6;
  while (textSize > 8.5 && linesAt(textSize) * textSize * 1.3 > fieldH) textSize -= 0.25;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <ModalBackdrop>
        <Animated.View
          style={[
            styles.dock,
            {
              opacity: enter,
              transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
            },
          ]}
        >
          <View
            style={{ aspectRatio: ART_W / ART_H, width: "100%" }}
            onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
          >
            <Image source={frameArt} style={styles.fill} resizeMode="stretch" />
            <View style={box(310, 108, 410, 350)}>
              <Text style={[styles.eyebrow, { fontSize: 11.5 * u }]}>{t("merveRankUp.eyebrow")}</Text>
              <Text style={[styles.title, { fontSize: titleSize }]} numberOfLines={2}>
                {t("merveRankUp.title")}
              </Text>
              <Text style={[styles.body, { fontSize: textSize, lineHeight: textSize * 1.3 }]}>
                {bodyText}
              </Text>
              <Text style={[styles.lore, { fontSize: textSize * 0.92, lineHeight: textSize * 1.2 }]}>
                {rankUp.lore}
              </Text>
            </View>
            <View style={box(56, 466, 674, 80)}>
              <BigButton laurel label={t("merveRankUp.confirmBtn")} onPress={onDismiss} />
            </View>
          </View>
        </Animated.View>
      </ModalBackdrop>
      <ConfettiBurst trigger={confettiTrigger} big />
    </Modal>
  );
}

const ART_W = 786;
const ART_H = 630;

const styles = StyleSheet.create({
  fill: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  title: { color: "#f6e2a0", fontFamily: FONT.display, marginVertical: 3 },
  dock: { width: "100%", maxWidth: 400 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.md },
  portrait: { width: 104, alignItems: "center", marginRight: SPACING.sm },
  speech: { flex: 1 },
  eyebrow: { color: "#f4c43c", fontSize: TYPE.caption, fontFamily: FONT.bold, letterSpacing: 1 },
  body: { color: "#f4e8d0", fontSize: TYPE.body, fontFamily: FONT.medium, lineHeight: 19, marginTop: 3 },
  lore: {
    color: "#e8c777",
    fontSize: TYPE.caption,
    fontStyle: "italic",
    lineHeight: 17,
    marginTop: SPACING.sm,
  },
});
