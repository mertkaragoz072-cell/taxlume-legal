import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View, Image, ImageSourcePropType, LayoutChangeEvent } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import angryMarketplaceImage from "../../assets/angry-marketplace.webp";
import happyMarketplaceImage from "../../assets/happy-marketplace.webp";
import mixedMarketplaceImage from "../../assets/mixed-marketplace.webp";
import summerAngryMarketplaceImage from "../../assets/summer-angry-marketplace.webp";
import summerHappyMarketplaceImage from "../../assets/summer-happy-marketplace.webp";
import summerMixedMarketplaceImage from "../../assets/summer-mixed-marketplace.webp";
import winterAngryMarketplaceImage from "../../assets/winter-angry-marketplace.webp";
import winterHappyMarketplaceImage from "../../assets/winter-happy-marketplace.webp";
import winterMixedMarketplaceImage from "../../assets/winter-mixed-marketplace.webp";
import { seasonFromTick, SeasonId } from "../economy/seasons";
import { COLORS, FONT, RADIUS, SPACING, TYPE, WEIGHT } from "../theme";

interface Props {
  happiness: number;
  /** picks a season-specific scene below (see SEASON_SCENE_IMAGES) for this
   * happiness tier when the current season has one; every other season/tier
   * combination falls back to the three plain scenes. */
  tick: number;
  label: string;
  moodLabel: string;
  moodColor: string;
}

// All three scenes share the source photo's ratio (1774×887 px). Height is
// computed from a measured width in JS rather than left to CSS
// `aspectRatio`: react-native-web resolves that against the
// absolutely-positioned <Image> inside it and grows the box to the
// picture's raw pixel size instead of the row's width, which is what was
// turning "cover" into a tiny corner of the photo.
const IMAGE_RATIO = 1774 / 887;

export type MoodTier = "angry" | "mixed" | "happy";

// Three bands, not happinessFor's five — a mood swing has to be fairly
// large before it's worth a different picture of the square, or the scene
// would flicker between near-identical art on every small happiness dip.
export function moodTierFor(h: number): MoodTier {
  if (h < 45) return "angry";
  if (h < 70) return "mixed";
  return "happy";
}

const SCENE_IMAGES: Record<MoodTier, ImageSourcePropType> = {
  angry: angryMarketplaceImage,
  mixed: mixedMarketplaceImage,
  happy: happyMarketplaceImage,
};

// Every mood tier has its own winter and summer scene now; spring and
// autumn have none of their own yet. A season/tier combination missing
// here just falls back to SCENE_IMAGES above.
const SEASON_SCENE_IMAGES: Partial<Record<SeasonId, Partial<Record<MoodTier, ImageSourcePropType>>>> = {
  winter: {
    angry: winterAngryMarketplaceImage,
    mixed: winterMixedMarketplaceImage,
    happy: winterHappyMarketplaceImage,
  },
  summer: {
    angry: summerAngryMarketplaceImage,
    mixed: summerMixedMarketplaceImage,
    happy: summerHappyMarketplaceImage,
  },
};

// A handful of warm specks drifting slowly up through the scene — dust and
// pollen by day, embers and lantern-light by night. It's the one bit of
// motion a flat painted photo can carry on its own: the villagers in it are
// baked into the picture and can't be animated individually, but a few
// motes rising past them is enough for the square to read as a place things
// are still happening in, not a still life. Kept few, small and slow on
// purpose — the brief was "barely there," not a snow globe.
interface MoteSpec {
  leftPct: number;
  topPct: number;
  size: number;
  delay: number;
  duration: number;
  drift: number;
}
const MOTES: MoteSpec[] = [
  { leftPct: 14, topPct: 72, size: 6, delay: 0, duration: 7400, drift: 9 },
  { leftPct: 37, topPct: 58, size: 5, delay: 1800, duration: 8600, drift: -8 },
  { leftPct: 61, topPct: 68, size: 6.5, delay: 3400, duration: 6800, drift: 10 },
  { leftPct: 82, topPct: 54, size: 4.5, delay: 900, duration: 9200, drift: -7 },
];

function Mote({ leftPct, topPct, size, delay, duration, drift }: MoteSpec) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration, delay, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay, duration]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -40] });
  const translateX = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, drift, 0] });
  // Fades in and out at each loop's ends rather than popping in place, so a
  // mote never appears to blink into existence mid-frame.
  const opacity = anim.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 0.85, 0.85, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: `${leftPct}%`,
        top: `${topPct}%`,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#fff3d6",
        // A dark ring, not just a bright fill — the painted scenes are warm
        // and busy enough that a plain gold dot vanished into them; the
        // ring is what actually keeps it readable against light and dark
        // backgrounds alike. A plain border rather than a shadow, since
        // shadow needs `elevation` on Android to show at all and that
        // draws its own grey box around a shape this small.
        borderWidth: 1,
        borderColor: "rgba(20, 15, 10, 0.4)",
        opacity,
        transform: [{ translateY }, { translateX }],
      }}
    />
  );
}

// A few flakes falling straight through the frame, winter only — the motes
// above work for any season, but winter's own scenes are snowy enough that
// having nothing at all falling through them read flatter than the other
// two seasons did. Unlike a mote's drift-and-fade, a snowflake just falls
// top to bottom and loops; the scene's own overflow:hidden clips it at both
// ends, so the loop seam never shows. Kept to five and modest in size —
// falling snow that actually fills the frame reads as a blizzard, not
// "barely there."
interface SnowflakeSpec {
  leftPct: number;
  size: number;
  delay: number;
  duration: number;
  drift: number;
}
const SNOWFLAKES: SnowflakeSpec[] = [
  { leftPct: 8, size: 3, delay: 0, duration: 6200, drift: 10 },
  { leftPct: 26, size: 2.5, delay: 1400, duration: 7400, drift: -8 },
  { leftPct: 48, size: 3.5, delay: 2600, duration: 5800, drift: 9 },
  { leftPct: 68, size: 2, delay: 700, duration: 7000, drift: -6 },
  { leftPct: 88, size: 3, delay: 2000, duration: 6600, drift: 8 },
];

function Snowflake({ leftPct, size, delay, duration, drift, height }: SnowflakeSpec & { height: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration, delay, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay, duration]);

  // Starts a little above the frame and falls a little past its bottom, so
  // it's never abruptly visible or invisible right at the clipped edge.
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-16, height + 16] });
  const translateX = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, drift, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: `${leftPct}%`,
        top: 0,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#ffffff",
        opacity: 0.8,
        transform: [{ translateY }, { translateX }],
      }}
    />
  );
}

// Legible over any part of the photo without a card behind it to guarantee
// contrast — the picture is meant to fill the space on its own, not sit in
// a card's dark mat.
const onArt = {
  textShadowColor: "rgba(0, 0, 0, 0.75)",
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
} as const;

/** How to label the square: the word for this mood and the colour that goes
 * with it. Lives here rather than in a screen because two of them caption
 * the same scene — the Town tab, and the Market tab during the guided first
 * session. */
export function happinessFor(h: number): { labelKey: string; emoji: string; color: string } {
  if (h < 20) return { labelKey: "town.happiness.revolt", emoji: "😡", color: "#c94b4b" };
  if (h < 45) return { labelKey: "town.happiness.unrest", emoji: "😠", color: "#e0693f" };
  if (h < 70) return { labelKey: "town.happiness.coping", emoji: "😐", color: "#e0a13f" };
  if (h < 90) return { labelKey: "town.happiness.content", emoji: "🙂", color: "#a8c777" };
  return { labelKey: "town.happiness.veryContent", emoji: "😄", color: "#3fae5c" };
}

/** Kasaba meydanı görseli — kimin resmi gösterildiği köylülerin moraline
 * (happiness) göre değişir: mutlu, karışık, sinirli. Kart arka planı/
 * çerçevesi yok: resim kendi başına duruyor, etiket ve ruh hali onun
 * üzerine yazılıyor. */
export function TownSquareScene({ happiness, tick, label, moodLabel, moodColor }: Props) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const tier = moodTierFor(happiness);
  const season = seasonFromTick(tick).id;
  const image = SEASON_SCENE_IMAGES[season]?.[tier] ?? SCENE_IMAGES[tier];
  const height = width / IMAGE_RATIO;

  return (
    <View style={styles.scene} onLayout={onLayout}>
      {width > 0 && (
        <>
          <Image source={image} style={{ width, height }} resizeMode="cover" />
          {/* A soft scrim in the two corners the captions sit in, not a flat
           * tint over the whole photo — the text needs a dark patch behind it
           * to stay legible over any part of the scene, but the painted art
           * is the point, so the scrim fades out well short of the middle. */}
          <Svg pointerEvents="none" width={width} height={height} style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="sceneTopScrim" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#0c0704" stopOpacity={0.5} />
                <Stop offset="1" stopColor="#0c0704" stopOpacity={0} />
              </LinearGradient>
              <LinearGradient id="sceneBottomScrim" x1="0" y1="1" x2="0" y2="0">
                <Stop offset="0" stopColor="#0c0704" stopOpacity={0.58} />
                <Stop offset="1" stopColor="#0c0704" stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={width} height={height * 0.32} fill="url(#sceneTopScrim)" />
            <Rect x={0} y={height * 0.68} width={width} height={height * 0.32} fill="url(#sceneBottomScrim)" />
          </Svg>
          {MOTES.map((m, i) => (
            <Mote key={i} {...m} />
          ))}
          {season === "winter" && SNOWFLAKES.map((s, i) => <Snowflake key={i} {...s} height={height} />)}
        </>
      )}
      <Text style={[styles.label, onArt]}>{label}</Text>
      <Text style={[styles.moodCaption, { color: moodColor }, onArt]}>{moodLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    width: "100%",
    // Callers that centre their children (MarketScreen's onboardingScene
    // wrapper) don't stretch them across the cross-axis by default, which
    // left `width: "100%"` resolving against nothing and the box sizing to
    // the image's own intrinsic pixel size instead. This pins it full-width
    // regardless of what the parent does.
    alignSelf: "stretch",
    borderRadius: RADIUS.feature,
    overflow: "hidden",
    marginBottom: SPACING.lg,
  },
  label: {
    position: "absolute",
    top: SPACING.sm,
    left: SPACING.sm,
    color: COLORS.textPrimary,
    fontSize: TYPE.caption,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    letterSpacing: 0.5,
  },
  moodCaption: {
    position: "absolute",
    bottom: SPACING.sm,
    left: SPACING.sm,
    fontSize: TYPE.label,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
  },
});
