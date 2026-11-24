import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { ParticleKind, rankTheme } from "../economy/rankTheme";

interface Props {
  rankIndex: number;
  width: number;
  height: number;
  /** 1 = as designed; the rank-up reveal turns it up */
  boost?: number;
}

// Deterministic pseudo-random so particles don't jump around between renders.
function rnd(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const RISING: ParticleKind[] = ["motes", "embers", "sparks"];
const FALLING: ParticleKind[] = ["petals", "leaves"];

function Particle({
  kind,
  color,
  index,
  width,
  height,
  boost,
}: {
  kind: ParticleKind;
  color: string;
  index: number;
  width: number;
  height: number;
  boost: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const duration = (kind === "stars" ? 2200 : 6500) + rnd(index, 1) * 4500;
  const delay = rnd(index, 2) * 5000;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration, delay, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [anim, duration, delay]);

  const left = rnd(index, 3) * width;
  const sway = (rnd(index, 4) - 0.5) * 36;
  const size =
    kind === "stars"
      ? 1.5 + rnd(index, 5) * 2
      : kind === "petals" || kind === "leaves"
        ? 4 + rnd(index, 5) * 3
        : 2 + rnd(index, 5) * 2.5;
  const peak = Math.min(1, (kind === "motes" ? 0.55 : 0.85) * boost);

  let top = 0;
  let translateY: Animated.AnimatedInterpolation<number> | number = 0;
  let opacity: Animated.AnimatedInterpolation<number> = anim.interpolate({
    inputRange: [0, 0.15, 0.85, 1],
    outputRange: [0, peak, peak, 0],
  });
  if (RISING.includes(kind)) {
    translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [height + 8, -12] });
  } else if (FALLING.includes(kind)) {
    translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-12, height + 8] });
  } else if (kind === "fireflies") {
    top = height * (0.35 + rnd(index, 6) * 0.55);
    translateY = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -14, 0] });
    opacity = anim.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: [0.1, peak, 0.2, peak, 0.1],
    });
  } else {
    // stars: fixed in the upper sky, twinkling
    top = rnd(index, 6) * height * 0.5;
    opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.15, peak, 0.15] });
  }
  const translateX = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, sway, 0] });
  const rounded = kind === "leaves" ? size / 4 : size / 2;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left,
        top,
        width: kind === "leaves" || kind === "petals" ? size * 1.5 : size,
        height: size,
        borderRadius: rounded,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }, { translateX }],
        shadowColor: color,
        shadowOpacity: kind === "stars" || kind === "sparks" || kind === "fireflies" ? 0.9 : 0,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 0 },
      }}
    />
  );
}

/** The light and weather of one rank laid over a painted scene: a colour wash
 * plus a handful of drifting particles. Purely decorative, never intercepts
 * touches. */
export function RankAtmosphere({ rankIndex, width, height, boost = 1 }: Props) {
  const { atmosphere: a } = rankTheme(rankIndex);
  if (width <= 0 || height <= 0) return null;
  const count = Math.round(a.count * Math.max(1, boost));
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: a.tint }]} />
      {Array.from({ length: count }, (_, i) => (
        <Particle
          key={`${rankIndex}-${i}`}
          kind={a.particles}
          color={a.particleColor}
          index={i}
          width={width}
          height={height}
          boost={boost}
        />
      ))}
    </View>
  );
}
