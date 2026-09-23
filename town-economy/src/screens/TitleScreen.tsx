import { BlurView } from "expo-blur";
import React from "react";
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import logoEn from "../../assets/logo/logo-stacked-en-900.png";
import logoTr from "../../assets/logo/logo-stacked-tr-900.png";
import { Bobbing } from "../components/Bobbing";
import { GradientFill } from "../components/GradientFill";
import { TownSquareBackdrop } from "../components/TownSquareBackdrop";
import { useEconomyContext } from "../economy/EconomyContext";
import { gameDayFromTick } from "../economy/useEconomy";
import { COLORS, FONT, GOLD_GRADIENT, RADIUS, SPACING, TYPE, seasonalBackgroundGradient } from "../theme";

// The wordmark comes from assets/logo, rendered per language — the Turkish
// and English lockups are different widths, so the aspect ratio travels with
// the file rather than being hard-coded once for both. Plain `-900` names,
// not `@3x`: Metro reads `@3x` as a density variant of a base file that does
// not exist here (see the note in scripts/build-logo.js).
const LOGOS = {
  tr: { src: logoTr, ratio: 2374 / 900 },
  en: { src: logoEn, ratio: 2503 / 900 },
} as const;

/** The town square from the Town screen, blown up past the edges of the
 * screen and thrown out of focus behind the wordmark.
 *
 * Softness comes from two places on purpose, because only one of them works
 * everywhere: BlurView is the real blur, and on Android it does nothing
 * unless a blurMethod is named — it defaults to `'none'`. The scale needs no
 * platform support at all, so even where the blur is a no-op the artwork is
 * too large to show detail, and the wash and sky gradient still buy the text
 * its contrast.
 *
 * The zoom is deliberately moderate. An earlier pass scaled it to 2.3x and
 * blurred it at full strength, and what was left could not be recognised as
 * a town at all — which defeats the point of putting it there.
 */
function BlurredTown({ width, height }: { width: number; height: number }) {
  const artWidth = width * 2;
  const artHeight = artWidth / 2.5;
  const artTop = height - artHeight;

  // Where the artwork's top edge falls, as a fraction of the screen. The sky
  // gradient's stops are derived from it rather than hard-coded, because the
  // edge moves with the screen's aspect ratio and a stop in the wrong place
  // leaves the cut showing.
  const edge = artTop / height;

  return (
    <View pointerEvents="none" aria-hidden style={StyleSheet.absoluteFill}>
      <GradientFill colors={seasonalBackgroundGradient()} x1="0" y1="0" x2="0" y2="1" />

      <View
        style={{
          position: "absolute",
          // Bled off both edges, so the square never shows a seam at the side.
          left: -(artWidth - width) / 2,
          // Bottom-aligned: the square fills the lower part of the screen and
          // the sky above it is the room the wordmark needs.
          top: artTop,
          width: artWidth,
          height: artHeight,
        }}
      >
        <TownSquareBackdrop width={artWidth} height={artHeight} warmth={0.85} />
      </View>

      <BlurView
        intensity={42}
        tint="dark"
        blurMethod="dimezisBlurViewSdk31Plus"
        style={StyleSheet.absoluteFill}
      />

      {/* The artwork is 2.5:1 and a phone is not, so the square can only ever
          cover the lower part of the screen, and its top edge is a hard
          horizontal cut. This gradient is opaque across that cut and clears
          just below it, which turns the cut into a horizon: sky over a town,
          rather than a picture with its top sliced off. The last stop darkens
          the very bottom again so the button has something solid to sit on.

          width/height are spelled out because react-native-svg on web falls
          back to a 300x150 box without them, which paints a grey rectangle in
          the corner instead of covering the screen. */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <LinearGradient id="titleSky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#140f0a" stopOpacity="1" />
            <Stop offset={(edge * 0.86).toFixed(3)} stopColor="#140f0a" stopOpacity="1" />
            <Stop offset={Math.min(0.98, edge + 0.1).toFixed(3)} stopColor="#140f0a" stopOpacity="0.16" />
            <Stop offset="1" stopColor="#140f0a" stopOpacity="0.58" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#titleSky)" />
      </Svg>
    </View>
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

  return (
    // The backdrop is a sibling of the padded column, not a child of it: an
    // absolutely positioned view resolves `inset: 0` against its parent's
    // padding box, so putting it inside left an unblurred strip of plain
    // gradient down all four edges.
    <View style={styles.root}>
      <BlurredTown width={width} height={height} />

      <View style={styles.content}>
        <Pressable
          style={styles.langButton}
          onPress={() => setLanguage(state.language === "tr" ? "en" : "tr")}
          accessibilityRole="button"
          accessibilityLabel={t("a11y.toggleLanguage")}
        >
          <Text style={styles.langLabel}>{state.language === "tr" ? "EN" : "TR"}</Text>
        </Pressable>

        <View style={styles.masthead}>
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
        </View>

        <View style={styles.actions}>
          {hydrated && inProgress ? (
            <Text style={styles.saveLine}>
              {t("title.saveLine", {
                town: state.townName,
                day: String(gameDayFromTick(state.tick)),
                worth: formatCoins(netWorth, 0),
              })}
            </Text>
          ) : null}

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
  saveLine: {
    color: COLORS.accent,
    fontFamily: FONT.medium,
    fontSize: TYPE.caption,
    letterSpacing: 0.6,
    textAlign: "center",
    ...onArt,
  },
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
