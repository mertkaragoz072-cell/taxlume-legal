import React from "react";
import { Image, StyleSheet } from "react-native";
import defneSource from "../../assets/mentor-defne.png";

interface Props {
  /** displayed width; the height follows the artwork's own proportions */
  size?: number;
}

/** Defne, the market trader who shows a new mayor around the town.
 *
 * She was drawn as vector first, which kept her weightless in the bundle and
 * let the expression change per beat, but it also capped how much life she
 * could have: flat fills, a handful of gradients, and a face built from
 * circles. This is a painted portrait instead — a real smile, lit skin, a
 * braid with strands in it — because she is the first thing a new player
 * meets and she was the one place in the game where "good enough" showed.
 *
 * The art was generated, its watermark painted out, and its paper background
 * flood-filled to alpha from the edges inward rather than by thresholding
 * brightness: her eye whites and teeth are as bright as the paper, and a
 * plain threshold punched holes through them.
 */
const ASPECT = 420 / 300;

export function MentorPortrait({ size = 84 }: Props) {
  return (
    <Image
      source={defneSource}
      style={[styles.portrait, { width: size, height: size * ASPECT }]}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  portrait: { alignSelf: "flex-start" },
});
