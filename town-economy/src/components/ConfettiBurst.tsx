import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

// Drawn from the app's own tab/accent colors (research teal, invest amber,
// achievements coral, town lilac, trade blue, inventory green) plus the
// header's hero gold, so a "break the palette" celebration moment still
// feels like it belongs to this app rather than a generic confetti burst.
const COLORS = ["#ffd75e", "#f0776a", "#5fd884", "#6fb8f2", "#c58ee0", "#4fc3c9", "#e0a13f"];
const PARTICLE_COUNT = 26;
const RIBBON_RATIO = 0.6;

interface Props {
  /** bump this to replay the burst (e.g. state.unlockedAchievements.length) */
  trigger: number;
  /** a rarer, more significant moment (a prestige, a town rank-up) than the
   * everyday achievement or streak pop this defaults to — wider spread,
   * bigger flash, particles that hang a little longer, so the handful of
   * moments a run actually turns on read as bigger than the rest rather
   * than every "big win" this component covers looking the same size. */
  big?: boolean;
}

function makeParticle() {
  // Biased into an upward cone so the burst reads as "thrown up and out"
  // rather than a flat ring, then falls back down past the origin —
  // simulated with a 3-point translateY curve (up, then past start) rather
  // than a real physics integration.
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
  const distance = 45 + Math.random() * 90;
  const isRibbon = Math.random() < RIBBON_RATIO;
  return {
    progress: new Animated.Value(0),
    isRibbon,
    xEnd: Math.cos(angle) * distance,
    peak: 60 + Math.random() * 70,
    fall: 70 + Math.random() * 110,
    rotateTurns: (Math.random() < 0.5 ? -1 : 1) * (1.5 + Math.random() * 2.5),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: isRibbon ? 8 + Math.random() * 5 : 5 + Math.random() * 6,
    delay: Math.random() * 180,
    duration: 900 + Math.random() * 500,
  };
}

/** A short-lived particle pop centered on whatever it's rendered inside —
 * meant as an absolute-positioned overlay for "big win" moments (an
 * achievement, a prestige, the daily reward wheel) rather than something
 * shown on every action. Ribbons tumble (a periodic scaleX flip mimics a
 * flat strip of paper flashing edge-on) while dots just spin, both arcing
 * up and falling back down; a quick expanding ring flashes at the origin
 * underneath for extra pop. */
export function ConfettiBurst({ trigger, big = false }: Props) {
  const particles = useRef(Array.from({ length: PARTICLE_COUNT }, makeParticle)).current;
  const flash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (trigger <= 0) return;
    particles.forEach((p) => p.progress.setValue(0));
    flash.setValue(0);
    Animated.timing(flash, {
      toValue: 1,
      duration: big ? 650 : 500,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
    Animated.parallel(
      particles.map((p) =>
        Animated.sequence([
          Animated.delay(p.delay),
          Animated.timing(p.progress, {
            toValue: 1,
            duration: big ? p.duration * 1.15 : p.duration,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      )
    ).start();
    // big is read at the moment this trigger fires (see the App.tsx call
    // site, which sets both in the same state update) rather than being a
    // dependency of its own — listing it would replay the animation a
    // second time if a caller flipped it back between bursts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  const geometryScale = big ? 1.5 : 1;
  const flashScale = flash.interpolate({ inputRange: [0, 1], outputRange: [0.3, big ? 2.9 : 2.1] });
  const flashOpacity = flash.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, big ? 0.65 : 0.5, 0] });

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View style={[styles.flash, { opacity: flashOpacity, transform: [{ scale: flashScale }] }]} />
      {particles.map((p, i) => {
        const translateX = p.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, p.xEnd * geometryScale],
        });
        const translateY = p.progress.interpolate({
          inputRange: [0, 0.35, 1],
          outputRange: [0, -p.peak * geometryScale, p.fall * geometryScale],
        });
        const opacity = p.progress.interpolate({
          inputRange: [0, 0.08, 0.8, 1],
          outputRange: [0, 1, 1, 0],
        });
        const scale = p.progress.interpolate({
          inputRange: [0, 0.2, 1],
          outputRange: [0.4, big ? 1.25 : 1, big ? 1.05 : 0.85],
        });
        const rotate = p.progress.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", `${p.rotateTurns * 360}deg`],
        });
        const flipScaleX = p.isRibbon
          ? p.progress.interpolate({
              inputRange: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1],
              outputRange: [1, 0.15, 1, 0.15, 1, 0.15, 1, 0.5],
            })
          : 1;
        return (
          <Animated.View
            key={i}
            style={[
              p.isRibbon ? styles.ribbon : styles.dot,
              {
                backgroundColor: p.color,
                width: p.isRibbon ? p.size * 1.8 : p.size,
                height: p.size,
                borderRadius: p.isRibbon ? 1.5 : p.size / 2,
                opacity,
                transform: [{ translateX }, { translateY }, { scale }, { rotate }, { scaleX: flipScaleX }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 140,
    zIndex: 50,
  },
  flash: {
    position: "absolute",
    top: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#ffd75e",
  },
  dot: { position: "absolute" },
  ribbon: { position: "absolute" },
});
