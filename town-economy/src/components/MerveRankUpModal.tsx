import React, { useEffect, useRef, useState } from "react";
import { Animated, Modal, StyleSheet, View } from "react-native";
import { Text } from "./AppText";
import { useSoundEffects } from "../audio/useSoundEffects";
import { useEconomyContext } from "../economy/EconomyContext";
import { FONT, SPACING, TYPE } from "../theme";
import { ConfettiBurst } from "./ConfettiBurst";
import { MentorPortrait } from "./MentorPortrait";
import { ModalBackdrop } from "./ModalBackdrop";
import { BigButton, ModalShell } from "./ModalKit";

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
export function MerveRankUpModal({ rankUp, onDismiss, sounds }: Props) {
  const { t } = useEconomyContext();
  const enter = useRef(new Animated.Value(0)).current;
  const [confettiTrigger, setConfettiTrigger] = useState(0);

  useEffect(() => {
    if (!rankUp) return;
    setConfettiTrigger((n) => n + 1);
    sounds.playSuccess();
    enter.setValue(0);
    Animated.spring(enter, { toValue: 1, useNativeDriver: true, friction: 7, tension: 55 }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankUp, enter]);

  if (!rankUp) return null;

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
          <ModalShell title={t("merveRankUp.title")}>
            <View style={styles.row}>
              <View style={styles.portrait}>
                <MentorPortrait pose="cheer" size={112} />
              </View>
              <View style={styles.speech}>
                <Text style={styles.eyebrow}>{t("merveRankUp.eyebrow")}</Text>
                <Text style={styles.body}>
                  {t("merveRankUp.body", { icon: rankUp.icon, title: rankUp.title })}
                </Text>
                <Text style={styles.lore}>{rankUp.lore}</Text>
              </View>
            </View>
            <BigButton label={t("merveRankUp.confirmBtn")} onPress={onDismiss} />
          </ModalShell>
        </Animated.View>
      </ModalBackdrop>
      <ConfettiBurst trigger={confettiTrigger} big />
    </Modal>
  );
}

const styles = StyleSheet.create({
  dock: { width: "100%", maxWidth: 360 },
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
