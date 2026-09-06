import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

const PARTICLE_COUNT = 6;

interface Props {
  /** bump this to replay the pop (e.g. a counter incremented per trade) */
  trigger: number;
}

/** A small "🪙" pop meant to sit as an absolute overlay directly on top of
 * a buy/sell confirm button — unlike ConfettiBurst (a rare, full-screen
 * "big win" moment), this is light enough to replay on every single trade
 * without feeling like spam. */
export function CoinPop({ trigger }: Props) {
  const particles = useRef(
    Array.from({ length: PARTICLE_COUNT }).map(() => ({
      progress: new Animated.Value(0),
      xDrift: (Math.random() - 0.5) * 60,
      rotate: (Math.random() - 0.5) * 60,
      delay: Math.random() * 80,
    }))
  ).current;

  useEffect(() => {
    if (trigger <= 0) return;
    particles.forEach((p) => p.progress.setValue(0));
    Animated.parallel(
      particles.map((p) =>
        Animated.sequence([
          Animated.delay(p.delay),
          Animated.timing(p.progress, {
            toValue: 1,
            duration: 550,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      )
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  return (
    <View style={styles.wrap} pointerEvents="none">
      {particles.map((p, i) => {
        const translateY = p.progress.interpolate({ inputRange: [0, 1], outputRange: [0, -46] });
        const translateX = p.progress.interpolate({ inputRange: [0, 1], outputRange: [0, p.xDrift] });
        const opacity = p.progress.interpolate({
          inputRange: [0, 0.15, 0.75, 1],
          outputRange: [0, 1, 1, 0],
        });
        const scale = p.progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.4, 1, 0.9] });
        const rotate = p.progress.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", `${p.rotate}deg`],
        });
        return (
          <Animated.Text
            key={i}
            style={[
              styles.coin,
              { opacity, transform: [{ translateX }, { translateY }, { scale }, { rotate }] },
            ]}
          >
            🪙
          </Animated.Text>
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
    height: 0,
    alignItems: "center",
    zIndex: 10,
  },
  coin: { position: "absolute", fontSize: 16 },
});
