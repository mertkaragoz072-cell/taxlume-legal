import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

const COLORS = ["#e8c777", "#3fae5c", "#4a90c9", "#c94b4b", "#b5486b", "#d9a94a"];
const PARTICLE_COUNT = 16;

interface Props {
  /** bump this to replay the burst (e.g. state.unlockedAchievements.length) */
  trigger: number;
}

/** A short-lived particle pop centered on whatever it's rendered inside —
 * meant as an absolute-positioned overlay for "big win" moments (an
 * achievement, a prestige) rather than something shown on every action. */
export function ConfettiBurst({ trigger }: Props) {
  const particles = useRef(
    Array.from({ length: PARTICLE_COUNT }).map(() => ({
      progress: new Animated.Value(0),
      angle: Math.random() * Math.PI * 2,
      distance: 50 + Math.random() * 70,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 5 + Math.random() * 7,
    }))
  ).current;

  useEffect(() => {
    if (trigger <= 0) return;
    particles.forEach((p) => p.progress.setValue(0));
    Animated.parallel(
      particles.map((p) =>
        Animated.timing(p.progress, {
          toValue: 1,
          duration: 650 + Math.random() * 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  return (
    <View style={styles.wrap} pointerEvents="none">
      {particles.map((p, i) => {
        const translateX = p.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, Math.cos(p.angle) * p.distance],
        });
        const translateY = p.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, Math.sin(p.angle) * p.distance - 24],
        });
        const opacity = p.progress.interpolate({
          inputRange: [0, 0.15, 0.7, 1],
          outputRange: [0, 1, 1, 0],
        });
        const scale = p.progress.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
        return (
          <Animated.View
            key={i}
            style={[
              styles.particle,
              {
                backgroundColor: p.color,
                width: p.size,
                height: p.size,
                borderRadius: p.size / 3,
                opacity,
                transform: [{ translateX }, { translateY }, { scale }],
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
  particle: { position: "absolute" },
});
