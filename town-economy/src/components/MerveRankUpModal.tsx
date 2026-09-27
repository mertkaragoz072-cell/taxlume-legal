import React, { useEffect, useRef, useState } from "react";
import { Animated, Modal, StyleSheet, Text, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { CARD_GRADIENT, cardShadow, COLORS, FONT, GOLD_GRADIENT, RADIUS, SPACING, TYPE, WEIGHT, withAlpha } from "../theme";
import { ConfettiBurst } from "./ConfettiBurst";
import { GradientFill } from "./GradientFill";
import { MentorPortrait } from "./MentorPortrait";
import { ModalBackdrop } from "./ModalBackdrop";
import { ScalePressable } from "./ScalePressable";

interface Props {
  rankUp: { icon: string; title: string } | null;
  onDismiss: () => void;
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

  useEffect(() => {
    if (!rankUp) return;
    setConfettiTrigger((n) => n + 1);
    enter.setValue(0);
    Animated.spring(enter, { toValue: 1, useNativeDriver: true, friction: 7, tension: 55 }).start();
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
          <View style={styles.card}>
            <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />

            <View style={styles.row}>
              {/* A spacer, not the portrait itself — see portraitFloat below.
                  Squeezing her into the row would cap her at the row's own
                  height instead of letting her stand taller than the text
                  beside her. */}
              <View style={styles.portraitSpacer} />
              <View style={styles.speech}>
                <Text style={styles.eyebrow}>{t("merveRankUp.eyebrow")}</Text>
                <Text style={styles.title}>{t("merveRankUp.title")}</Text>
                <Text style={styles.body}>
                  {t("merveRankUp.body", { icon: rankUp.icon, title: rankUp.title })}
                </Text>
              </View>
            </View>

            <ScalePressable onPress={onDismiss} style={styles.confirmBtn} scaleTo={0.96}>
              <GradientFill colors={GOLD_GRADIENT} x1="0" y1="0" x2="0" y2="1" />
              <Text style={styles.confirmBtnText}>{t("merveRankUp.confirmBtn")}</Text>
            </ScalePressable>
          </View>

          {/* Sibling of the card, not a child — the card clips its own
              content (overflow: hidden, for its rounded corners), which
              would crop her at its edge. Positioned against the dock rather
              than the card so her left edge can break past the card's own
              border instead of sitting tucked inside it — the same trick the
              caravan tutorial card uses for its guide. */}
          <View style={styles.portraitFloat} pointerEvents="none">
            <MentorPortrait size={150} />
          </View>
        </Animated.View>
      </ModalBackdrop>
      <ConfettiBurst trigger={confettiTrigger} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  dock: { width: "100%", maxWidth: 340 },
  card: {
    borderRadius: RADIUS.feature,
    borderWidth: 1,
    borderColor: withAlpha(COLORS.accent, 0.35),
    padding: SPACING.lg,
    overflow: "hidden",
    ...cardShadow,
  },
  row: { flexDirection: "row", alignItems: "flex-start", marginBottom: SPACING.lg },
  // Reserves the row's own horizontal space for the floating portrait below;
  // carries no image itself. Narrower than her own width — she starts
  // further left, past the card's padding, than this spacer needs to reach.
  portraitSpacer: { width: 118, marginRight: SPACING.sm },
  // Pulled past the card's own left padding with a negative offset so she
  // reads as stepping out of the card like a comic panel, not just floating
  // inside it. Bottom-anchored not to the card's own bottom edge but to the
  // row's — offset up by the confirm button's height plus the paddings
  // around it, all fixed regardless of how many lines the message wraps to
  // — so she meets the bottom of the speech row and never overlaps the
  // button under her raised hand.
  portraitFloat: { position: "absolute", left: -SPACING.md, bottom: SPACING.lg + 41 + SPACING.lg },
  speech: { flex: 1, paddingTop: 2 },
  eyebrow: {
    color: COLORS.accent,
    fontSize: TYPE.caption,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    letterSpacing: 1,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: TYPE.heading,
    fontFamily: FONT.display,
    marginTop: 4,
    marginBottom: 4,
  },
  body: {
    color: COLORS.textMuted,
    fontSize: TYPE.body,
    lineHeight: 19,
  },
  confirmBtn: {
    width: "100%",
    borderRadius: RADIUS.card,
    paddingVertical: SPACING.md,
    alignItems: "center",
    overflow: "hidden",
  },
  confirmBtnText: { color: COLORS.onLight, fontWeight: WEIGHT.black, fontFamily: FONT.black, fontSize: TYPE.body },
});
