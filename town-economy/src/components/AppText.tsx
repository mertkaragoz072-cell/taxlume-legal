import React from "react";
import { Image, StyleSheet, Text as RNText, TextProps } from "react-native";
import silverCoin from "../../assets/ui/statpanel2/coinbullet.png";
import { FONT } from "../theme";
import { upperForUi } from "../utils/uiLanguage";

const COIN = "🪙";

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
    if (!str.includes(COIN)) return str;
    const parts = str.split(COIN);
    return parts.map((part, j) => (
      <React.Fragment key={`${i}-${j}`}>
        {part}
        {j < parts.length - 1 && (
          <Image
            source={silverCoin}
            style={{ width: size, height: size, marginBottom: -Math.round(size * 0.18) }}
            resizeMode="contain"
            accessibilityElementsHidden
          />
        )}
      </React.Fragment>
    ));
  });
  return (
    <RNText style={style} {...rest}>
      {mapped}
    </RNText>
  );
}
