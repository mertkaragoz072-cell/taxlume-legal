import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { CRISIS_TEMPLATES_BY_ID, ScheduledCrisis } from "../economy/crises";
import { useEconomyContext } from "../economy/EconomyContext";
import { TICKS_PER_GAME_DAY } from "../economy/useEconomy";
import { COLORS, FONT, RADIUS, SPACING, TYPE, WEIGHT, withAlpha } from "../theme";

const ALERT = "#f0776a";

interface Props {
  crisis: ScheduledCrisis | null;
  tick: number;
}

/** The countdown between a crisis being announced and it landing.
 *
 * This bar is the feature: the disaster itself is a dice roll, but the days it
 * gives you first are yours. It says what is coming, how long you have, and
 * what to do with the time — and it pulses harder as the strike closes in. */
export function CrisisWarningBanner({ crisis, tick }: Props) {
  const { t, tPlural } = useEconomyContext();
  const pulse = useRef(new Animated.Value(0)).current;
  const template = crisis ? CRISIS_TEMPLATES_BY_ID[crisis.templateId] : null;

  const ticksLeft = crisis ? Math.max(0, crisis.strikesAtTick - tick) : 0;
  const imminent = ticksLeft <= TICKS_PER_GAME_DAY;

  useEffect(() => {
    if (!crisis) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: imminent ? 600 : 1300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: imminent ? 600 : 1300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [crisis, imminent, pulse]);

  if (!crisis || !template) return null;

  const daysLeft = Math.ceil(ticksLeft / TICKS_PER_GAME_DAY);
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] });

  return (
    <Animated.View style={[styles.wrap, { opacity }]}>
      <Text aria-hidden style={styles.icon}>
        {template.icon}
      </Text>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {t("crisis.warningPrefix")} {t(template.warningTitleKey)}
        </Text>
        <Text style={styles.advice} numberOfLines={2}>
          {t(template.adviceKey)}
        </Text>
      </View>
      <View style={styles.countBox}>
        <Text style={styles.countValue}>{daysLeft}</Text>
        <Text style={styles.countUnit}>{tPlural("crisis.daysUnit", daysLeft)}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: withAlpha(ALERT, 0.55),
    backgroundColor: withAlpha(ALERT, 0.13),
  },
  icon: { fontSize: 20, marginRight: SPACING.sm },
  body: { flex: 1 },
  title: { color: ALERT, fontSize: TYPE.caption, fontWeight: WEIGHT.black, fontFamily: FONT.black },
  advice: { color: COLORS.textMuted, fontSize: TYPE.micro, marginTop: 1 },
  countBox: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 38,
    marginLeft: SPACING.sm,
  },
  countValue: { color: ALERT, fontSize: TYPE.heading, fontWeight: WEIGHT.black, fontFamily: FONT.black },
  countUnit: { color: COLORS.textMuted, fontSize: 9, marginTop: -2 },
});
