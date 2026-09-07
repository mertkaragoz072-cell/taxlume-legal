import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, View } from "react-native";
import { useSoundEffects } from "../audio/useSoundEffects";
import { useEconomyContext } from "../economy/EconomyContext";
import { SPEED_BOOST_MULTIPLIER } from "../economy/useEconomy";
import { CARD_GRADIENT, cardShadow, COLORS, FONT, GOLD_GRADIENT, RADIUS, SPACING, TYPE, WEIGHT } from "../theme";
import { formatCountdown } from "./SpeedBoostButton";
import { GradientFill } from "./GradientFill";
import { ModalBackdrop } from "./ModalBackdrop";
import { ScalePressable } from "./ScalePressable";

interface Props {
  visible: boolean;
  onClose: () => void;
  sounds: ReturnType<typeof useSoundEffects>;
}

// Purely a UX placeholder for a rewarded-ad flow (a real SDK — e.g. AdMob —
// isn't wired up yet); the delay just gives the "watch ad" tap a believable
// beat before the reward lands.
const AD_SIMULATION_MS = 2200;

export function SpeedBoostModal({ visible, onClose, sounds }: Props) {
  const { state, t, activateSpeedBoost } = useEconomyContext();
  const [watching, setWatching] = useState(false);
  const [, forceTick] = useState(0);
  const active = state.speedBoostExpiresAt !== null;

  useEffect(() => {
    if (!visible || !active) return;
    const interval = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, [visible, active]);

  useEffect(() => {
    if (!visible) setWatching(false);
  }, [visible]);

  const watchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (watchTimeout.current) clearTimeout(watchTimeout.current);
    };
  }, []);

  if (!visible) return null;

  const remainingMs = active ? Math.max(0, state.speedBoostExpiresAt! - Date.now()) : 0;

  const watchAd = () => {
    setWatching(true);
    watchTimeout.current = setTimeout(() => {
      activateSpeedBoost();
      sounds.playSuccess();
      setWatching(false);
    }, AD_SIMULATION_MS);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <ModalBackdrop>
        <View style={styles.card}>
          <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />

          {watching ? (
            <View style={styles.watchingBlock}>
              <ActivityIndicator size="large" color={COLORS.accent} />
              <Text style={styles.watchingText}>{t("speedBoost.watching")}</Text>
            </View>
          ) : active ? (
            <>
              <Text style={styles.title}>{t("speedBoost.activeTitle")}</Text>
              <Text style={styles.subtitle}>
                {t("speedBoost.activeSubtitle", { multiplier: SPEED_BOOST_MULTIPLIER })}
              </Text>
              <View style={styles.countdownBlock}>
                <Text style={styles.remainingLabel}>{t("speedBoost.remainingLabel")}</Text>
                <Text style={styles.countdown}>{formatCountdown(remainingMs)}</Text>
              </View>
              <ScalePressable onPress={watchAd} style={styles.watchBtn} scaleTo={0.96}>
                <GradientFill colors={GOLD_GRADIENT} x1="0" y1="0" x2="0" y2="1" />
                <Text style={styles.watchBtnText}>{t("speedBoost.watchAgainBtn")}</Text>
              </ScalePressable>
            </>
          ) : (
            <>
              <Text style={styles.title}>{t("speedBoost.title")}</Text>
              <Text style={styles.subtitle}>
                {t("speedBoost.subtitle", { multiplier: SPEED_BOOST_MULTIPLIER })}
              </Text>
              <ScalePressable onPress={watchAd} style={styles.watchBtn} scaleTo={0.96}>
                <GradientFill colors={GOLD_GRADIENT} x1="0" y1="0" x2="0" y2="1" />
                <Text style={styles.watchBtnText}>{t("speedBoost.watchAdBtn")}</Text>
              </ScalePressable>
            </>
          )}

          <ScalePressable onPress={onClose} style={styles.cancelBtn} scaleTo={0.96}>
            <Text style={styles.cancelBtnText}>{t("common.cancel")}</Text>
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
  subtitle: { color: "#a0917a", fontSize: 12, marginBottom: SPACING.lg },
  watchingBlock: { alignItems: "center", paddingVertical: SPACING.lg },
  watchingText: {
    color: COLORS.textPrimary,
    fontSize: TYPE.body,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    marginTop: SPACING.md,
  },
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
  watchBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    overflow: "hidden",
  },
  watchBtnText: { color: "#1a1410", fontWeight: "800", fontFamily: FONT.black, fontSize: 14 },
  cancelBtn: { alignItems: "center", paddingVertical: 10, marginTop: 4 },
  cancelBtnText: { color: "#a0917a", fontSize: 13, fontWeight: "600", fontFamily: FONT.medium },
});
