import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";
import logoIllustratedEn from "../../assets/logo/logo-illustrated-en-1000.webp";
import logoIllustratedTr from "../../assets/logo/logo-illustrated-tr-1000.webp";
import titleBg from "../../assets/title/title-bg-900.webp";
import { Bobbing } from "../components/Bobbing";
import { GradientFill } from "../components/GradientFill";
import { useEconomyContext } from "../economy/EconomyContext";
import { gameDayFromTick } from "../economy/useEconomy";
import { COLORS, FONT, glowShadow, GOLD_GRADIENT, RADIUS, SPACING, TYPE, withAlpha } from "../theme";

// The wordmark comes from assets/logo, rendered per language — the two
// painted market-square banners are cropped independently (their lettering
// takes different amounts of width), so the aspect ratio travels with the
// file rather than being hard-coded once for both. Plain `-1000` names, not
// `@3x`: Metro reads `@3x` as a density variant of a base file that does not
// exist here (see the note in scripts/build-logo.js). See
// assets/logo/README.md for how these two were cut out from their source
// art.
const LOGOS = {
  tr: { src: logoIllustratedTr, ratio: 1000 / 475 },
  en: { src: logoIllustratedEn, ratio: 1000 / 491 },
} as const;

/** The market-square painting behind the wordmark, filling the screen edge
 * to edge.
 *
 * It replaces an earlier procedural backdrop that only ever covered the
 * screen's lower portion (that art was a fixed 2.5:1 strip, a shape no
 * phone is), which needed an opaque gradient to hide the seam where it cut
 * off. This painting is close to a phone's own aspect ratio and already has
 * the soft, out-of-focus look that backdrop had to fake with a runtime
 * BlurView, so `cover` alone fills the screen cleanly with nothing left to
 * paper over and no blur pass needed.
 *
 * The gradient on top is a plain contrast wash, not a horizon line: the
 * painting is bright and busy across its whole height, and the title's text
 * relies on a per-line shadow (see `onArt` below) plus this darkening to
 * stay readable over it, most of all at the bottom where the gold button
 * sits.
 */
function BlurredTown({ width, height }: { width: number; height: number }) {
  return (
    <View pointerEvents="none" aria-hidden style={StyleSheet.absoluteFill}>
      {/* Explicit numeric width/height, not just the position:absolute +
          inset:0 that StyleSheet.absoluteFill gives every other layer here.
          A bundled local image is the one thing on this screen react-native-
          web sizes to its own intrinsic pixel dimensions (900x1945, this
          asset's actual file size) by default rather than stretching to
          fill an absolutely-positioned parent the way a native Image does —
          without the override it showed only the top sliver of the picture,
          rendered at file resolution in the corner, instead of the whole
          thing scaled to cover the screen. */}
      <Image source={titleBg} style={[StyleSheet.absoluteFill, { width, height }]} resizeMode="cover" />

      {/* width/height are spelled out because react-native-svg on web falls
          back to a 300x150 box without them, which paints a grey rectangle in
          the corner instead of covering the screen — and as numbers rather
          than "100%" strings, because react-native-svg resolves a percentage
          against whatever the enclosing layout has settled to *at that
          moment*, a separate and sometimes earlier pass than the surrounding
          flex box's own. The gold CTA button's gradient hit exactly that on
          a real device (cut off partway across); width/height are already
          known numbers here (useWindowDimensions, not a layout measurement),
          so there's no percentage to resolve at all. */}
      <Svg style={StyleSheet.absoluteFill} width={width} height={height} pointerEvents="none">
        <Defs>
          <LinearGradient id="titleWash" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#140f0a" stopOpacity="0.35" />
            <Stop offset="0.45" stopColor="#140f0a" stopOpacity="0.18" />
            <Stop offset="0.75" stopColor="#140f0a" stopOpacity="0.4" />
            <Stop offset="1" stopColor="#140f0a" stopOpacity="0.72" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#titleWash)" />
      </Svg>
    </View>
  );
}

/** A soft warm wash centred where the wordmark sits — the masthead used to
 * float in a plain black void above the blurred town, which read as empty
 * rather than composed. This gives the eye somewhere the light is "coming
 * from" without adding any shape that competes with the logo itself. */
function LogoGlow({ width, height }: { width: number; height: number }) {
  return (
    <Svg style={StyleSheet.absoluteFill} width={width} height={height} pointerEvents="none">
      <Defs>
        <RadialGradient id="titleGlow" cx="50%" cy="38%" r="60%">
          <Stop offset="0" stopColor="#e8c777" stopOpacity="0.22" />
          <Stop offset="0.55" stopColor="#e8c777" stopOpacity="0.07" />
          <Stop offset="1" stopColor="#e8c777" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill="url(#titleGlow)" />
    </Svg>
  );
}

interface Props {
  onStart: () => void;
}

/** The first screen of the app: the town out of focus, the logo, one button.
 *
 * Its other job is to stop the save from being invisible. The game restores
 * silently on launch, so dropping straight into the market gave a returning
 * player no acknowledgement that their town had survived — this names it,
 * and says which day they are on.
 */
export function TitleScreen({ onStart }: Props) {
  const { state, t, formatCoins, netWorth, hydrated, hasSave, setLanguage } = useEconomyContext();
  const { width, height } = useWindowDimensions();

  // Until the stored save has been read neither label is known to be right,
  // so the button waits rather than flashing "Start" and correcting itself a
  // frame later.
  const inProgress = hasSave;
  const logo = LOGOS[state.language];
  const logoWidth = Math.min(width - SPACING.xl * 2, 320);

  // A quiet rise-and-fade on first mount rather than everything simply
  // appearing at once — the one moment a player is guaranteed to be looking
  // at nothing but this screen, so it is the cheapest place in the whole app
  // to spend a little polish. Runs once; there is nothing to clean up since
  // it never repeats.
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

  return (
    // The backdrop is a sibling of the padded column, not a child of it: an
    // absolutely positioned view resolves `inset: 0` against its parent's
    // padding box, so putting it inside left an unblurred strip of plain
    // gradient down all four edges.
    <View style={styles.root}>
      <BlurredTown width={width} height={height} />
      <LogoGlow width={width} height={height} />

      <View style={styles.content}>
        <Pressable
          style={styles.langButton}
          onPress={() => setLanguage(state.language === "tr" ? "en" : "tr")}
          accessibilityRole="button"
          accessibilityLabel={t("a11y.toggleLanguage")}
        >
          {/* The language you are in, not the one you would switch to. The
              header's button says the same thing; this one used to say the
              opposite, so the identical-looking chip meant "Turkish" on one
              screen and "switch to Turkish" on the next. */}
          <Text style={styles.langLabel}>{state.language === "tr" ? "TR" : "EN"}</Text>
        </Pressable>

        <Animated.View style={[styles.masthead, enterStyle]}>
          <Bobbing distance={5} duration={2600}>
            <Image
              source={logo.src}
              style={{ width: logoWidth, height: logoWidth / logo.ratio }}
              resizeMode="contain"
              accessibilityRole="image"
              accessibilityLabel={t("title.logoAlt")}
            />
          </Bobbing>
          <Text style={styles.tagline}>{t("title.tagline")}</Text>
        </Animated.View>

        <Animated.View style={[styles.actions, enterStyle]}>
          {hydrated && inProgress ? (
            <View style={styles.saveChip}>
              <Text style={styles.saveLine}>
                {t("title.saveLine", {
                  town: state.townName,
                  day: String(gameDayFromTick(state.tick)),
                  worth: formatCoins(netWorth, 0),
                })}
              </Text>
            </View>
          ) : null}

          <View style={hydrated && styles.ctaGlow}>
            <Pressable
              style={({ pressed }) => [
                styles.cta,
                pressed && styles.ctaPressed,
                !hydrated && styles.ctaWaiting,
              ]}
              onPress={onStart}
              disabled={!hydrated}
              accessibilityRole="button"
              accessibilityState={{ disabled: !hydrated }}
            >
              <GradientFill colors={GOLD_GRADIENT} />
              <Text style={styles.ctaLabel}>
                {!hydrated ? t("title.loading") : inProgress ? t("title.continue") : t("title.start")}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

// Text sitting on artwork rather than on a card, so every line carries its
// own shadow instead of trusting the wash to be dark enough everywhere.
const onArt = {
  textShadowColor: "rgba(0, 0, 0, 0.8)",
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 7,
} as const;

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl * 2,
    paddingBottom: SPACING.xl * 2,
  },

  // Takes all the height the button does not, and centres the logo in it, so
  // the wordmark sits a little above the middle of the screen.
  masthead: { flex: 1, alignItems: "center", justifyContent: "center", gap: SPACING.lg },
  tagline: {
    color: COLORS.textPrimary,
    fontFamily: FONT.regular,
    fontSize: TYPE.body,
    textAlign: "center",
    letterSpacing: 0.4,
    ...onArt,
  },

  actions: { alignSelf: "stretch", alignItems: "center", gap: SPACING.md },
  // A frosted pill instead of plain shadowed text on the artwork — this is
  // the one line on the screen reporting a fact (your town, by name, is
  // still there), and a small card reads as a status readout in a way that
  // text floating on the photo doesn't.
  saveChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.chip,
    borderWidth: 1,
    borderColor: withAlpha(COLORS.accent, 0.3),
    backgroundColor: withAlpha("#0c0704", 0.45),
  },
  saveLine: {
    color: COLORS.accent,
    fontFamily: FONT.medium,
    fontSize: TYPE.caption,
    letterSpacing: 0.6,
    textAlign: "center",
  },
  // Wraps the button rather than sitting on it: cta itself clips to its
  // rounded corners for the gold fill, and a shadow on a clipped view can
  // paint incorrectly on iOS. An unclipped wrapper is the one place the glow
  // can live without touching that.
  ctaGlow: { width: "100%", maxWidth: 360, borderRadius: RADIUS.feature, ...glowShadow(COLORS.accent) },
  cta: {
    width: "100%",
    maxWidth: 360,
    height: 58,
    borderRadius: RADIUS.feature,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaPressed: { opacity: 0.86 },
  ctaWaiting: { opacity: 0.5 },
  ctaLabel: {
    color: COLORS.onLight,
    fontFamily: FONT.display,
    fontSize: TYPE.heading,
    letterSpacing: 1.6,
  },
  langButton: {
    position: "absolute",
    top: SPACING.lg,
    right: SPACING.xl,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.chip,
    borderWidth: 1,
    borderColor: "rgba(232, 199, 119, 0.35)",
    backgroundColor: "rgba(16, 11, 7, 0.4)",
    zIndex: 1,
  },
  langLabel: {
    color: COLORS.accent,
    fontFamily: FONT.bold,
    fontSize: TYPE.caption,
    letterSpacing: 1,
  },
});
