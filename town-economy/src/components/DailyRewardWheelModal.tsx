import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Modal, StyleSheet, View } from "react-native";
import { Text } from "./AppText";
import { useSoundEffects } from "../audio/useSoundEffects";
import { useEconomyContext } from "../economy/EconomyContext";
import { dailyBonusForStreak } from "../economy/formulas";
import { cardShadow, COLORS, FONT, glowShadow, RADIUS, SPACING, TYPE, WEIGHT, withAlpha } from "../theme";
import { ConfettiBurst } from "./ConfettiBurst";
import medGift from "../../assets/ui/modal/med_gift.webp";
import discArt from "../../assets/ui/wheel/disc.webp";
import hubArt from "../../assets/ui/wheel/hub.webp";
import icFerris from "../../assets/ui/wheel/ic_ferris.webp";
import ringArt from "../../assets/ui/wheel/ring.webp";
import { ModalBackdrop } from "./ModalBackdrop";
import { BigButton, ModalShell } from "./ModalKit";

interface Props {
  visible: boolean;
  amount: number;
  streakCount: number;
  onDismiss: () => void;
  onRevealed: () => void;
  sounds: ReturnType<typeof useSoundEffects>;
}

// The sent wheel art, in its own pixels (square crop around the centre).
const ART = 704;
const WHEEL_SIZE = 296;
const DISC = 528;
const HUB = 188;

/** A 7-pip strip showing where today sits in the current week of the
 * streak, rather than the raw (and eventually large) streak count — a
 * player on day 23 still just sees "day 2 of this week," which reads the
 * same every week instead of needing ever-bigger numbers to feel legible.
 * The streak itself never resets on a 7-day cycle (see dailyCheckIn), only
 * this display does; day 8 is streak-day 8 same as day 1 was streak-day 1,
 * just drawn as week 2's first pip.
 *
 * Each pip's amount comes from dailyBonusForStreak — the same formula that
 * actually pays it — so a "future" pip previews the real number, not a
 * placeholder that could drift from what the player gets on that day. */
function StreakCalendar({ streakCount }: { streakCount: number }) {
  const { t, state, formatCoins } = useEconomyContext();
  const posInWeek = (streakCount - 1) % 7;
  const weekStartCount = streakCount - posInWeek;
  const days = Array.from({ length: 7 }, (_, i) => {
    const dayCount = weekStartCount + i;
    const kind: "past" | "today" | "future" = i < posInWeek ? "past" : i === posInWeek ? "today" : "future";
    return { dayCount, kind, amount: dailyBonusForStreak(state, dayCount) };
  });

  return (
    <View style={styles.calendarWrap}>
      <Text style={styles.calendarTitle}>{t("dailyWheel.streakCalendarTitle")}</Text>
      <View style={styles.calendarRow}>
        {days.map((d, i) => (
          <View
            key={i}
            style={[
              styles.calendarPip,
              d.kind === "today" && styles.calendarPipToday,
              d.kind === "future" && styles.calendarPipFuture,
            ]}
          >
            <Text style={[styles.calendarPipDay, d.kind === "today" && styles.calendarPipDayToday]}>
              {i + 1}
            </Text>
            <Text style={styles.calendarPipIcon}>{d.kind === "future" ? "🔒" : "🪙"}</Text>
            <Text style={[styles.calendarPipAmount, d.kind === "future" && styles.calendarPipAmountFuture]}>
              {formatCoins(d.amount, 0)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** A once-a-day spin-to-reveal wheel over the daily check-in bonus. The
 * amount is already fixed by the streak formula (see dailyCheckIn in
 * useEconomy.ts) and already in the player's cash by the time this shows —
 * the spin is a celebratory reveal animation, not real randomness. */
export function DailyRewardWheelModal({
  visible,
  amount,
  streakCount,
  onDismiss,
  onRevealed,
  sounds,
}: Props) {
  const { t } = useEconomyContext();
  const [spinning, setSpinning] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const lastDegRef = useRef(0);

  useEffect(() => {
    if (visible) {
      setSpinning(false);
      setRevealed(false);
      rotateAnim.setValue(0);
      lastDegRef.current = 0;
    }
  }, [visible, rotateAnim]);

  if (!visible) return null;

  const spin = () => {
    setRevealed(false);
    setSpinning(true);
    const nextDeg = lastDegRef.current + 360 * 5 + Math.floor(Math.random() * 360);
    lastDegRef.current = nextDeg;
    Animated.timing(rotateAnim, {
      toValue: nextDeg,
      duration: 2600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setSpinning(false);
      setRevealed(true);
      sounds.playSuccess();
      // The app-level confetti (App.tsx) renders behind this modal's own
      // native portal layer and would be invisible here, so this modal
      // pops its own burst on top of its own content instead.
      setConfettiTrigger((n) => n + 1);
      onRevealed();
    });
  };

  const rotateDeg = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "1deg"] });

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <ModalBackdrop>
        <ModalShell title={t("dailyWheel.title")} medallion={medGift}>
          <View style={styles.inner}>
            <Text style={styles.subtitle}>
              {revealed ? t("dailyWheel.streakLabel", { count: streakCount }) : t("dailyWheel.subtitle")}
            </Text>

            <View style={styles.wheelWrap}>
              <Animated.View
                style={[styles.disc, { transform: [{ rotate: rotateDeg }] }]}
                pointerEvents="none"
              >
                <Image source={discArt} style={styles.fillImg} resizeMode="stretch" />
              </Animated.View>
              <Image source={ringArt} style={styles.fillImg} resizeMode="stretch" />
              <Image source={hubArt} style={styles.hub} resizeMode="stretch" />
            </View>

            {revealed ? (
              <>
                <Text style={styles.wonTitle}>{t("dailyWheel.wonTitle")}</Text>
                <Text style={styles.wonAmount}>{t("dailyWheel.wonAmount", { amount })}</Text>
                <StreakCalendar streakCount={streakCount} />
                <BigButton label={t("dailyWheel.claimBtn")} onPress={onDismiss} />
              </>
            ) : (
              <BigButton
                icon={icFerris}
                label={spinning ? t("dailyWheel.spinning") : t("dailyWheel.spinBtn")}
                disabled={spinning}
                onPress={spin}
              />
            )}
          </View>
        </ModalShell>
      </ModalBackdrop>
      <ConfettiBurst trigger={confettiTrigger} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: RADIUS.feature,
    borderWidth: 1,
    borderColor: withAlpha(COLORS.accent, 0.3),
    padding: 20,
    alignItems: "center",
    overflow: "hidden",
    ...cardShadow,
  },
  inner: { alignItems: "center" },
  title: { color: COLORS.textPrimary, fontSize: TYPE.title, fontFamily: FONT.display, marginBottom: 4 },
  subtitle: { color: "#f4e8d0", fontSize: TYPE.label, marginBottom: SPACING.lg, textAlign: "center" },
  fillImg: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  wheelWrap: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: -24,
    marginTop: -28,
  },
  disc: {
    position: "absolute",
    width: (WHEEL_SIZE * DISC) / ART,
    height: (WHEEL_SIZE * DISC) / ART,
    left: (WHEEL_SIZE - (WHEEL_SIZE * DISC) / ART) / 2,
    top: (WHEEL_SIZE - (WHEEL_SIZE * DISC) / ART) / 2,
  },
  hub: {
    position: "absolute",
    width: (WHEEL_SIZE * HUB) / ART,
    height: (WHEEL_SIZE * HUB) / ART,
    left: (WHEEL_SIZE - (WHEEL_SIZE * HUB) / ART) / 2,
    top: (WHEEL_SIZE - (WHEEL_SIZE * HUB) / ART) / 2,
  },
  wonTitle: { color: "#ffd75e", fontSize: TYPE.title, fontWeight: WEIGHT.black, fontFamily: FONT.black },
  wonAmount: {
    color: COLORS.positive,
    fontSize: TYPE.title + 8,
    fontWeight: WEIGHT.black,
    fontFamily: FONT.black,
    marginTop: 4,
    marginBottom: SPACING.lg,
  },
  calendarWrap: { width: "100%", alignItems: "center", marginBottom: SPACING.lg },
  calendarTitle: {
    color: COLORS.textMuted,
    fontSize: TYPE.label,
    fontWeight: WEIGHT.medium,
    fontFamily: FONT.medium,
    marginBottom: SPACING.xs + 2,
  },
  calendarRow: { flexDirection: "row", gap: 4 },
  calendarPip: {
    width: 38,
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: RADIUS.chip,
    borderWidth: 1,
    borderColor: withAlpha(COLORS.accent, 0.25),
    backgroundColor: withAlpha("#0c0704", 0.35),
  },
  calendarPipToday: {
    borderColor: COLORS.accent,
    backgroundColor: withAlpha(COLORS.accent, 0.2),
    ...glowShadow(COLORS.accent),
  },
  calendarPipFuture: { opacity: 0.55 },
  calendarPipDay: {
    color: COLORS.textMuted,
    fontSize: TYPE.micro,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
  },
  calendarPipDayToday: { color: COLORS.accent },
  calendarPipIcon: { fontSize: 14, marginVertical: 2 },
  calendarPipAmount: {
    color: COLORS.textPrimary,
    fontSize: 9,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
  },
  calendarPipAmountFuture: { color: COLORS.textMuted },
  spinBtn: {
    width: "100%",
    borderRadius: RADIUS.card,
    paddingVertical: 12,
    alignItems: "center",
    overflow: "hidden",
  },
  spinBtnText: { color: COLORS.onLight, fontWeight: WEIGHT.black, fontFamily: FONT.black, fontSize: 14 },
});
