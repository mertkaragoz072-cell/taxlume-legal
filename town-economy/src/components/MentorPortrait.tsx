import React from "react";
import { Image, StyleSheet } from "react-native";
import merveCheerSource from "../../assets/mentor-merve-cheer.png";
import merveGuideSource from "../../assets/mentor-merve.png";

interface Props {
  /** displayed width; the height follows the artwork's own proportions */
  size?: number;
  /** "guide" (default) is her usual tour-guide pose; "cheer" is the
   * fists-up, eyes-closed laugh used for the rank-up congratulations —
   * a different painting, not a crop of the same one, so it carries its
   * own aspect ratio below. */
  pose?: "guide" | "cheer";
}

/** Merve, the market trader who shows a new mayor around the town.
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
 * plain threshold punched holes through them. The cheer pose's source also
 * had a ring of sparkle/burst decorations around her that were never asked
 * for — those were dropped the same way as the background, by keeping only
 * the largest connected opaque shape (her) and discarding every smaller one.
 */
const ASPECT = { guide: 316 / 360, cheer: 584 / 480 };
const SOURCE = { guide: merveGuideSource, cheer: merveCheerSource };

export function MentorPortrait({ size = 112, pose = "guide" }: Props) {
  return (
    <Image
      source={SOURCE[pose]}
      style={[styles.portrait, { width: size, height: size * ASPECT[pose] }]}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  portrait: { alignSelf: "flex-start" },
});
