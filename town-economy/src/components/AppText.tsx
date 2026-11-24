import React from "react";
import { Image, StyleSheet, Text as RNText, TextProps } from "react-native";
import silverCoin from "../../assets/ui/statpanel2/coinbullet.png";
import { GOOD_IMAGES } from "../economy/goodImages";
import { GOODS } from "../economy/goods";
import { FONT } from "../theme";
import { upperForUi } from "../utils/uiLanguage";

const COIN = "🪙";

/** Emoji -> the good's painted picture, built once. */
const GOOD_EMOJI: Record<string, number> = {};
for (const g of GOODS) {
  const img = (GOOD_IMAGES as Record<string, number | undefined>)[g.id];
  if (img) GOOD_EMOJI[g.icon] = img;
}
const EMOJI_RE = new RegExp(`(${Object.keys(GOOD_EMOJI).join("|")})`, "u");

// Largest Dynamic Type / font-scale multiplier the painted panels were laid
// out for; beyond this their fixed frames would clip the words.
const MAX_FONT_SCALE = 1.25;

/** The app's Text. Identical to react-native's, except that every 🪙 in a
 * plain string child is drawn as the game's silver coin image, sized to the
 * surrounding font — so money reads as the same coin everywhere, including
 * inside translated sentences, instead of the system's gold emoji. */
export function Text({ children, style, ...rest }: TextProps) {
  const flat = StyleSheet.flatten(style);
  const fontSize = flat?.fontSize ?? 14;
  // The display face draws lower-case letters as small capitals, and its small
  // capital "i" has no dot, which misspells Turkish ("TICARET" for "TİCARET").
  // Upper-casing the string ourselves, in the UI's language, avoids that.
  const upper = flat?.fontFamily === FONT.display;
  const size = Math.round(fontSize * 1.1);
  const mapped = React.Children.map(children, (child, i) => {
    if (typeof child !== "string") return child;
    const str = upper ? upperForUi(child) : child;
    const hasCoin = str.includes(COIN);
    // A lone emoji is a dedicated icon slot (town badge, tab...), not a word
    // in a sentence: leave those to their own components.
    const hasGood = str.trim().length > 2 && EMOJI_RE.test(str);
    if (!hasCoin && !hasGood) return str;
    const pieces = str.split(
      new RegExp(`(${COIN}${hasGood ? "|" + EMOJI_RE.source.slice(1, -1) : ""})`, "u")
    );
    return pieces.map((part, j) => {
      const src = part === COIN ? silverCoin : GOOD_EMOJI[part];
      if (!src) return <React.Fragment key={`${i}-${j}`}>{part}</React.Fragment>;
      const px = part === COIN ? size : Math.round(size * 1.15);
      return (
        <Image
          key={`${i}-${j}`}
          source={src}
          style={{ width: px, height: px, marginBottom: -Math.round(px * 0.18) }}
          resizeMode="contain"
          accessibilityElementsHidden
        />
      );
    });
  });
  return (
    <RNText style={style} maxFontSizeMultiplier={MAX_FONT_SCALE} {...rest}>
      {mapped}
    </RNText>
  );
}
