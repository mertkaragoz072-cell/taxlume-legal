import React from "react";
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import logoEn from "../../assets/logo/logo-stacked-en-900.png";
import logoTr from "../../assets/logo/logo-stacked-tr-900.png";
import { GradientFill } from "../components/GradientFill";
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

/** A roofline of the logo's own buildings, repeated across the foot of the
 * screen. It is the mark's geometry — equal bodies, pitched roofs, a common
 * base — stretched into a skyline, so the decoration is the brand rather than
 * a stock silhouette. Drawn at a low opacity: it should register as depth
 * under the button, not as a second thing to read.
 */
function Skyline() {
  const HEIGHTS = [16, 26, 20, 34, 22, 30, 18, 28, 24, 32, 19, 27, 21, 31, 17, 25];
  const BODY = 14;
  const GAP = 6;
  const EAVE = 3;
  const PITCH = 9;
  const FLOOR = 95;
  const VIEW_W = HEIGHTS.length * (BODY + GAP);

  return (
    <Svg
      style={styles.skyline}
      viewBox={`0 0 ${VIEW_W} ${FLOOR}`}
      // The box is sized to match the viewBox's proportions closely, so
      // stretching it to fill costs almost no distortion — and it keeps the
      // roofline flush with the bottom edge instead of letting "meet" scale
      // the buildings up and crop them.
      preserveAspectRatio="none"
      pointerEvents="none"
    >
      <Defs>
        <RadialGradient id="titleGlow" cx="0.5" cy="1" r="0.9">
          <Stop offset="0" stopColor="#e8c777" stopOpacity="0.14" />
          <Stop offset="1" stopColor="#e8c777" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#titleGlow)" />
      {HEIGHTS.map((h, i) => {
        const x = i * (BODY + GAP) + GAP / 2;
        const top = FLOOR - h;
        return (
          <React.Fragment key={i}>
            <Path d={`M${x} ${top} h${BODY} v${h} h-${BODY} Z`} fill="#e8c777" opacity={0.1} />
            <Path
              d={`M${x - EAVE} ${top} L${x + BODY / 2} ${top - PITCH} L${x + BODY + EAVE} ${top} Z`}
              fill="#e8c777"
              opacity={0.1}
            />
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

interface Props {
  onStart: () => void;
}

/** The first screen of the app: the logo, and one button into the town.
 *
 * Its other job is to stop the save from being invisible. The game restores
 * silently on launch, so dropping straight into the market gave a returning
 * player no acknowledgement that their town had survived — this names it,
 * and says which day they are on.
 */
export function TitleScreen({ onStart }: Props) {
  const { state, t, formatCoins, netWorth, hydrated, hasSave, setLanguage } = useEconomyContext();
  const { width } = useWindowDimensions();

  // Until the stored save has been read neither label is known to be right,
  // so the button waits rather than flashing "Start" and correcting itself a
  // frame later.
  const inProgress = hasSave;
  const logo = LOGOS[state.language];
  const logoWidth = Math.min(width - SPACING.xl * 2, 340);

  return (
    <View style={styles.root}>
      <GradientFill colors={seasonalBackgroundGradient()} x1="0" y1="0" x2="0" y2="1" />
      <Skyline />

      <Pressable
        style={styles.langButton}
        onPress={() => setLanguage(state.language === "tr" ? "en" : "tr")}
        accessibilityRole="button"
        accessibilityLabel={t("a11y.toggleLanguage")}
      >
        <Text style={styles.langLabel}>{state.language === "tr" ? "EN" : "TR"}</Text>
      </Pressable>

      <View style={styles.center}>
        <Image
          source={logo.src}
          style={{ width: logoWidth, height: logoWidth / logo.ratio }}
          resizeMode="contain"
          accessibilityRole="image"
          accessibilityLabel={t("title.logoAlt")}
        />
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
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed, !hydrated && styles.ctaWaiting]}
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
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xl * 2 },
  // The logo sits above the middle rather than dead centre: on a tall phone
  // a centred lockup leaves a void between it and the button, and the button
  // itself wants to stay inside thumb reach.
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.lg,
    paddingBottom: SPACING.xl * 3,
  },
  // Absolutely placed so it underlays the button rather than taking layout
  // space away from it.
  skyline: { position: "absolute", left: 0, right: 0, bottom: 0, height: 128 },
  tagline: {
    color: COLORS.textMuted,
    fontFamily: FONT.regular,
    fontSize: TYPE.body,
    textAlign: "center",
    letterSpacing: 0.4,
  },
  actions: { alignItems: "center", gap: SPACING.md },
  saveLine: {
    color: COLORS.accent,
    fontFamily: FONT.medium,
    fontSize: TYPE.caption,
    letterSpacing: 0.6,
    textAlign: "center",
  },
  cta: {
    width: "100%",
    maxWidth: 320,
    height: 56,
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
    borderColor: "#4a3a1c",
    zIndex: 1,
  },
  langLabel: {
    color: COLORS.accent,
    fontFamily: FONT.bold,
    fontSize: TYPE.caption,
    letterSpacing: 1,
  },
});
