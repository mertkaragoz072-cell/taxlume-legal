import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Text } from "../components/AppText";
import titleArt from "../../assets/title/title-v3.webp";
import { BigButton } from "../components/ModalKit";
import { useEconomyContext } from "../economy/EconomyContext";
import { gameDayFromTick } from "../economy/useEconomy";
import { FONT } from "../theme";

// The sent title painting, 941 x 1672: the Golden Town sign (the game's name,
// the same in both languages) over the village, with the studio mark at the
// foot. Only the pieces that change are drawn live on top of it: the button,
// the language chip and the line about a saved town. Positions are in the
// art's own pixels and follow it as it scales.
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
        source={titleArt}
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
          onPress={() => setLanguage(state.language === "tr" ? "en" : "tr")}
          accessibilityRole="button"
          accessibilityLabel={t("a11y.toggleLanguage")}
          hitSlop={8}
        >
          <Text style={[styles.chipText, { fontSize: Math.max(13, 38 * k) }]}>
            {state.language === "tr" ? "TR" : "EN"}
          </Text>
        </Pressable>

        {hydrated && inProgress ? (
          <View style={[box(110, 1128, 830, 1190), styles.center]} pointerEvents="none">
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

        <View style={box(165, 1205, 775, 1330)}>
          <BigButton laurel label={label} onPress={onStart} disabled={!hydrated} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
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
