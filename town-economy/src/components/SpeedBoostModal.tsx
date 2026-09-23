import React, { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { useSoundEffects } from "../audio/useSoundEffects";
import { useEconomyContext } from "../economy/EconomyContext";
import { SPEED_BOOST_MULTIPLIER, todayString } from "../economy/useEconomy";
import {
  CARD_GRADIENT,
  cardShadow,
  COLORS,
  FONT,
  GOLD_GRADIENT,
  RADIUS,
  SPACING,
  TYPE,
  WEIGHT,
} from "../theme";
import { maybeRequestReview } from "../utils/reviewPrompt";
import { formatCountdown } from "./SpeedBoostButton";
import { GradientFill } from "./GradientFill";
import { ModalBackdrop } from "./ModalBackdrop";
import { ScalePressable } from "./ScalePressable";

interface Props {
  visible: boolean;
  onClose: () => void;
  sounds: ReturnType<typeof useSoundEffects>;
}

/** Today's speed boost: free, claimable once a calendar day, and good for a
 * full day of doubled tick rate once taken.
 *
 * It used to be gated behind a simulated "watch an ad" wait, which was a
 * problem two ways over: no ad SDK was ever wired up, so the app was telling
 * the player an ad was playing when none was, and both the store listing and
 * the privacy policy state the game carries no advertising.
 *
 * Claiming is also where the app asks for a store review — a moment the
 * player has just been handed something good. The boost is granted either
 * way and the app never learns what they did with the sheet: rewarding a
 * review is against both stores' rules, and requestReview() resolves to void
 * regardless, so there is nothing to condition on even if it were allowed. */
export function SpeedBoostModal({ visible, onClose, sounds }: Props) {
  const { state, t, claimSpeedBoost } = useEconomyContext();
  // The clock the countdown reads is state this component owns, so rendering
  // stays a pure function of props and state.
  const [now, setNow] = useState(() => Date.now());
  const active = state.speedBoostExpiresAt !== null;
  const claimedToday = state.speedBoostClaimedDate === todayString();

  useEffect(() => {
    if (!visible || !active) return;
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [visible, active]);

  if (!visible) return null;

  const remainingMs = active ? Math.max(0, state.speedBoostExpiresAt! - now) : 0;

  const claim = () => {
    claimSpeedBoost();
    sounds.playSuccess();
    onClose();
    // Fire-and-forget: maybeRequestReview swallows its own failures and only
    // ever asks once per install, so nothing here depends on the outcome.
    void maybeRequestReview();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <ModalBackdrop>
        <View style={styles.card}>
          <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />

          {active ? (
            <>
              <Text style={styles.title}>{t("speedBoost.activeTitle")}</Text>
              <Text style={styles.subtitle}>
                {t("speedBoost.activeSubtitle", { multiplier: SPEED_BOOST_MULTIPLIER })}
              </Text>
              <View style={styles.countdownBlock}>
                <Text style={styles.remainingLabel}>{t("speedBoost.remainingLabel")}</Text>
                <Text style={styles.countdown}>{formatCountdown(remainingMs)}</Text>
              </View>
            </>
          ) : claimedToday ? (
            <>
              <Text style={styles.title}>{t("speedBoost.claimedTitle")}</Text>
              <Text style={styles.subtitle}>{t("speedBoost.claimedSubtitle")}</Text>
            </>
          ) : (
            <>
              <Text style={styles.title}>{t("speedBoost.title")}</Text>
              <Text style={styles.subtitle}>
                {t("speedBoost.subtitle", { multiplier: SPEED_BOOST_MULTIPLIER })}
              </Text>
              <ScalePressable onPress={claim} style={styles.claimBtn} scaleTo={0.96}>
                <GradientFill colors={GOLD_GRADIENT} x1="0" y1="0" x2="0" y2="1" />
                <Text style={styles.claimBtnText}>{t("speedBoost.claimBtn")}</Text>
              </ScalePressable>
            </>
          )}

          <ScalePressable onPress={onClose} style={styles.cancelBtn} scaleTo={0.96}>
            <Text style={styles.cancelBtnText}>{t("common.close")}</Text>
          </ScalePressable>
        </View>
      </ModalBackdrop>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 18,
    padding: 20,
    overflow: "hidden",
    ...cardShadow,
  },
  title: { color: "#f0e3c8", fontSize: 16, fontFamily: FONT.display, marginBottom: 4 },
  subtitle: { color: "#a0917a", fontSize: 12, marginBottom: SPACING.lg, lineHeight: 17 },
  countdownBlock: {
    alignItems: "center",
    backgroundColor: "#1a1410",
    borderRadius: RADIUS.card,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.lg,
  },
  remainingLabel: { color: COLORS.textMuted, fontSize: TYPE.micro, letterSpacing: 0.5 },
  countdown: {
    color: "#ffd75e",
    fontSize: TYPE.title + 6,
    fontWeight: WEIGHT.black,
    fontFamily: FONT.black,
    marginTop: 2,
  },
  claimBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    overflow: "hidden",
  },
  claimBtnText: { color: "#1a1410", fontWeight: "800", fontFamily: FONT.black, fontSize: 14 },
  cancelBtn: { alignItems: "center", paddingVertical: 10, marginTop: 4 },
  cancelBtnText: { color: "#a0917a", fontSize: 13, fontWeight: "600", fontFamily: FONT.medium },
});
