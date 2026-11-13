import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Text } from "../components/AppText";
import logoEn from "../../assets/title/logo_en.webp";
import logoTr from "../../assets/title/logo_tr.webp";
import titleArt from "../../assets/title/title-v2.webp";
import { BigButton } from "../components/ModalKit";
import { useEconomyContext } from "../economy/EconomyContext";
import { gameDayFromTick } from "../economy/useEconomy";
import { FONT } from "../theme";

// The sent title painting, 1054 x 2281 once placed on its walnut canvas (the
// art itself is scaled 1.3x and sits at y=170). The lettering on the plaque,
// the button and the language chip were erased from the art; they are drawn
// live so both languages and the save state read correctly. Positions below
// are in canvas pixels and follow the image as it scales.
const CW = 1054;
const CHT = 2281;
const S = 1.3;
const OY = 170;
// The wordmark cut from the sent paintings, one per language: [x, y, w, h]
// in the original art's pixels.
const LOGOS = {
  tr: { src: logoTr, box: [205, 452, 670, 113] },
  en: { src: logoEn, box: [205, 452, 670, 114] },
} as const;
const ax = (x: number) => (x - CW / 2) * S + CW / 2;
const ay = (y: number) => y * S + OY;

interface Props {
  onStart: () => void;
}

/** The first screen of the app: the painted market square, the plaque with the
 * town's name, one button. It also stops the save from being invisible: a
 * returning player sees their town's name, day and worth above the button. */
export function TitleScreen({ onStart }: Props) {
  const { state, t, formatCoins, netWorth, hydrated, hasSave, setLanguage } = useEconomyContext();
  const { width, height } = useWindowDimensions();
  const inProgress = hasSave;

  // "cover": the canvas has a phone's shape, so this only trims a sliver on
  // other screens; the live pieces follow the same scale and offset.
  const k = Math.max(width / CW, height / CHT);
  const offX = (width - CW * k) / 2;
  const offY = (height - CHT * k) / 2;
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

  const name = t("app.defaultTownName");
  const logo = LOGOS[state.language];
  const label = !hydrated ? t("title.loading") : inProgress ? t("title.continue") : t("title.start");

  return (
    <View style={styles.root}>
      <Image source={titleArt} style={[styles.fill, { width, height }]} resizeMode="cover" />

      <Animated.View style={[StyleSheet.absoluteFill, enterStyle]} pointerEvents="box-none">
        <Image
          source={logo.src}
          style={box(
            ax(logo.box[0]),
            ay(logo.box[1]),
            ax(logo.box[0] + logo.box[2]),
            ay(logo.box[1] + logo.box[3])
          )}
          resizeMode="contain"
          accessibilityRole="header"
          accessibilityLabel={name}
        />

        <View style={[box(ax(130), ay(655), ax(924), ay(740)), styles.center]} pointerEvents="none">
          <View style={styles.taglinePill}>
            <Text style={[styles.tagline, { fontSize: Math.max(12, 38 * k) }]}>{t("title.tagline")}</Text>
          </View>
        </View>

        <Pressable
          style={[box(878, 50, 1018, 114), styles.chip]}
          onPress={() => setLanguage(state.language === "tr" ? "en" : "tr")}
          accessibilityRole="button"
          accessibilityLabel={t("a11y.toggleLanguage")}
          hitSlop={8}
        >
          <Text style={[styles.chipText, { fontSize: Math.max(13, 40 * k) }]}>
            {state.language === "tr" ? "TR" : "EN"}
          </Text>
        </Pressable>

        {hydrated && inProgress ? (
          <View style={[box(ax(120), ay(1160), ax(934), ay(1235)), styles.center]} pointerEvents="none">
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

        <View style={box(ax(175), ay(1262), ax(885), ay(1398))}>
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
  tagline: {
    color: "#fff4d8",
    fontFamily: FONT.bold,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  taglinePill: {
    backgroundColor: "rgba(20,12,6,0.62)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
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
