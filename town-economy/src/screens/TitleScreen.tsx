import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Text } from "../components/AppText";
import titleEn from "../../assets/title/title-en.webp";
import titleTr from "../../assets/title/title-tr.webp";
import { nextLanguage } from "../i18n/t";
import { useEconomyContext } from "../economy/EconomyContext";
import { gameDayFromTick } from "../economy/useEconomy";
import { FONT } from "../theme";

// The sent title paintings, 941 x 1672, one per language: the Golden Town sign
// (the game's name, the same in both) over the village, the start button
// painted in the language's own word, the studio mark at the foot. Only what
// changes is drawn live on top: the button's touch area, the language chip and
// the line about a saved town. Positions are in the art's own pixels and
// follow it as it scales.
const ART = { tr: titleTr, en: titleEn, de: titleEn, es: titleEn, fr: titleEn } as const;
const AW = 941;
const AH = 1672;

interface Props {
  onStart: () => void;
}

/** The first screen of the app: the painted Golden Town sign and one button.
 * It also stops the save from being invisible: a returning player sees their
 * town's name, day and worth above the button. */
export function TitleScreen({ onStart }: Props) {
  const { state, t, formatCoins, netWorth, hydrated, hasSave, setLanguage } = useEconomyContext();
  const { width, height } = useWindowDimensions();
  const inProgress = hasSave;

  // "cover": the canvas has a phone's shape, so this only trims a sliver on
  // other screens; the live pieces follow the same scale and offset.
  const k = Math.max(width / AW, height / AH);
  const offX = (width - AW * k) / 2;
  const offY = (height - AH * k) / 2;
  const px = (x: number) => offX + x * k;
  const py = (y: number) => offY + y * k;
  const box = (x0: number, y0: number, x1: number, y1: number) => ({
    position: "absolute" as const,
    left: px(x0),
    top: py(y0),
    width: (x1 - x0) * k,
    height: (y1 - y0) * k,
  });

  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 820,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter]);
  const enterStyle = {
    opacity: enter,
    transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  };

  const label = !hydrated ? t("title.loading") : inProgress ? t("title.continue") : t("title.start");

  return (
    <View style={styles.root}>
      <Image
        source={ART[state.language]}
        style={[styles.fill, { width, height }]}
        resizeMode="cover"
        accessibilityRole="header"
        accessibilityLabel="Golden Town"
      />

      <Animated.View style={[StyleSheet.absoluteFill, enterStyle]} pointerEvents="box-none">
        <Pressable
          style={[
            styles.chip,
            {
              position: "absolute",
              // Under the corner ornament, against the screen's own right edge:
              // the painting is cropped at the sides on narrow phones, so a
              // spot measured in its pixels can fall off the screen.
              top: py(150),
              right: 14,
              width: Math.max(56, 120 * k),
              height: Math.max(30, 56 * k),
            },
          ]}
          onPress={() => setLanguage(nextLanguage(state.language))}
          accessibilityRole="button"
          accessibilityLabel={t("a11y.toggleLanguage")}
          hitSlop={8}
        >
          <Text style={[styles.chipText, { fontSize: Math.max(13, 38 * k) }]}>
            {state.language.toUpperCase()}
          </Text>
        </Pressable>

        {hydrated && inProgress ? (
          <View style={[box(110, 1262, 830, 1322), styles.center]} pointerEvents="none">
            <View style={styles.saveChip}>
              <Text style={styles.saveLine} numberOfLines={1}>
                {t("title.saveLine", {
                  town: state.townName,
                  day: String(gameDayFromTick(state.tick)),
                  worth: formatCoins(netWorth, 0),
                })}
              </Text>
            </View>
          </View>
        ) : null}

        {/* The button is in the painting; this is its touch area. Its label is
            there for screen readers and is drawn transparent. */}
        <Pressable
          style={[box(215, 1335, 725, 1485), styles.center]}
          onPress={onStart}
          disabled={!hydrated}
          accessibilityRole="button"
          accessibilityLabel={label}
        >
          <Text style={styles.hiddenLabel}>{label}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  hiddenLabel: { color: "transparent", fontSize: 14 },
  root: { flex: 1, backgroundColor: "#180f09" },
  fill: { position: "absolute", top: 0, left: 0 },
  center: { alignItems: "center", justifyContent: "center" },
  chip: {
    borderRadius: 20,
    backgroundColor: "rgba(70,40,18,0.92)",
    borderWidth: 2,
    borderColor: "#d9a548",
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: { color: "#fbeccb", fontFamily: FONT.serif },
  saveChip: {
    backgroundColor: "rgba(20,12,6,0.72)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    maxWidth: "100%",
  },
  saveLine: { color: "#f4e8d0", fontFamily: FONT.medium, fontSize: 12.5, textAlign: "center" },
});
