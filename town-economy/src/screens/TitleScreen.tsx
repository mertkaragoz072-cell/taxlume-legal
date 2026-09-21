import React, { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import logoEn from "../../assets/logo/logo-stacked-en-900.png";
import logoTr from "../../assets/logo/logo-stacked-tr-900.png";
import { Bobbing } from "../components/Bobbing";
import { GradientFill } from "../components/GradientFill";
import { TownSquareBackdrop } from "../components/TownSquareBackdrop";
import { VillagerIllustration } from "../components/VillagerIllustration";
import { useEconomyContext } from "../economy/EconomyContext";
import { GOODS_BY_ID, gameDayFromTick } from "../economy/useEconomy";
import {
  CARD_GRADIENT,
  COLORS,
  FONT,
  GOLD_GRADIENT,
  RADIUS,
  SPACING,
  TYPE,
  seasonalBackgroundGradient,
} from "../theme";

// The wordmark comes from assets/logo, rendered per language — the Turkish
// and English lockups are different widths, so the aspect ratio travels with
// the file rather than being hard-coded once for both. Plain `-900` names,
// not `@3x`: Metro reads `@3x` as a density variant of a base file that does
// not exist here (see the note in scripts/build-logo.js).
const LOGOS = {
  tr: { src: logoTr, ratio: 2374 / 900 },
  en: { src: logoEn, ratio: 2503 / 900 },
} as const;

// A staple, a raw material and a luxury — three rows that between them span
// the range the game actually trades across, rather than three near-identical
// numbers.
const DEMO_GOODS = ["bread", "wood", "spice"] as const;

// How fast the demo board climbs. Not the real economy's rate: this has to be
// legible in the few seconds someone looks at the screen, so it runs far
// hotter than a game does, and it loops back before the numbers stop being
// believable prices.
const DEMO_STEP_MS = 900;
const DEMO_RATE = 0.019;
const DEMO_RESET_AT = 1.9;

/** The title screen's one moving part: a price board with the prices visibly
 * climbing on it.
 *
 * This is the premise stated without a line of tutorial — goods have prices,
 * the prices rise on their own, and the index at the bottom counts how far
 * they have got. A still picture of a market could say the first part; only
 * motion says the second, which is the part the game is about.
 */
function MarketBoard({ width }: { width: number }) {
  const { t, formatCoins } = useEconomyContext();
  const [factor, setFactor] = useState(1);

  useEffect(() => {
    const id = setInterval(() => {
      setFactor((f) => (f >= DEMO_RESET_AT ? 1 : f * (1 + DEMO_RATE)));
    }, DEMO_STEP_MS);
    return () => clearInterval(id);
  }, []);

  const pct = (factor - 1) * 100;

  return (
    <View style={[styles.board, { width }]}>
      <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
      <Text style={styles.boardLabel}>{t("title.boardLabel")}</Text>

      {DEMO_GOODS.map((id) => {
        const good = GOODS_BY_ID[id];
        return (
          <View key={id} style={styles.row}>
            <Text style={styles.rowIcon}>{good.icon}</Text>
            <Text style={styles.rowName} numberOfLines={1}>
              {t(good.nameKey)}
            </Text>
            <Text style={styles.rowPrice}>{formatCoins(good.basePrice * factor)}</Text>
            <Text style={styles.rowDelta}>▲ {pct.toFixed(1)}%</Text>
          </View>
        );
      })}

      <View style={styles.boardFooter}>
        <Text style={styles.footerLabel}>{t("title.boardIndex")}</Text>
        <Text style={styles.footerValue}>{(100 * factor).toFixed(1)}</Text>
      </View>
    </View>
  );
}

/** The town the prices are happening to: the same painted square the Town
 * screen uses, with a small crowd standing in it. Without it the board is an
 * abstraction; with it, the screen says whose bread this is. */
function TownStrip({ width }: { width: number }) {
  const height = Math.round(width / 2.5);
  return (
    <View style={[styles.strip, { width, height }]}>
      <View aria-hidden style={StyleSheet.absoluteFill}>
        <TownSquareBackdrop width={width} height={height} warmth={0.82} />
      </View>
      <View style={styles.crowd}>
        <Bobbing delay={0}>
          <VillagerIllustration size={44} mood="happy" variant={1} />
        </Bobbing>
        <Bobbing delay={220}>
          <VillagerIllustration size={58} mood="happy" variant={0} />
        </Bobbing>
        <Bobbing delay={440}>
          <VillagerIllustration size={40} mood="happy" variant={2} />
        </Bobbing>
      </View>
    </View>
  );
}

interface Props {
  onStart: () => void;
}

/** The first screen of the app: what the game is, and one button into it.
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
  const contentWidth = Math.min(width - SPACING.xl * 2, 432);
  const logoWidth = Math.min(contentWidth, 300);

  return (
    <View style={styles.root}>
      <GradientFill colors={seasonalBackgroundGradient()} x1="0" y1="0" x2="0" y2="1" />

      <Pressable
        style={styles.langButton}
        onPress={() => setLanguage(state.language === "tr" ? "en" : "tr")}
        accessibilityRole="button"
        accessibilityLabel={t("a11y.toggleLanguage")}
      >
        <Text style={styles.langLabel}>{state.language === "tr" ? "EN" : "TR"}</Text>
      </Pressable>

      <View style={styles.spacerTop} />

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

      <View style={styles.spacerBottom} />

      <MarketBoard width={contentWidth} />
      <TownStrip width={contentWidth} />

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
  root: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xl,
    gap: SPACING.lg,
  },
  masthead: { alignItems: "center", gap: SPACING.md },
  // A tall screen has slack to give away, and where it goes decides whether
  // the screen reads as composed or as broken. Two thirds above the logo
  // reads as headroom; the same emptiness between the tagline and the price
  // board reads as a layout that failed. On a short phone both collapse to
  // nothing and the stack simply fills the screen.
  spacerTop: { flex: 2 },
  spacerBottom: { flex: 1 },
  tagline: {
    color: COLORS.textMuted,
    fontFamily: FONT.regular,
    fontSize: TYPE.body,
    textAlign: "center",
    letterSpacing: 0.4,
  },

  board: {
    borderRadius: RADIUS.feature,
    overflow: "hidden",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: "#4a3a1c",
  },
  boardLabel: {
    color: COLORS.textMuted,
    fontFamily: FONT.bold,
    fontSize: TYPE.micro,
    letterSpacing: 1.4,
    marginBottom: SPACING.xs,
  },
  row: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  rowIcon: { fontSize: TYPE.title },
  rowName: { flex: 1, color: COLORS.textPrimary, fontFamily: FONT.regular, fontSize: TYPE.body },
  rowPrice: {
    color: COLORS.textPrimary,
    fontFamily: FONT.bold,
    fontSize: TYPE.body,
    // A fixed slot, so the prices do not jitter sideways as digits change.
    width: 78,
    textAlign: "right",
  },
  rowDelta: {
    color: COLORS.negative,
    fontFamily: FONT.medium,
    fontSize: TYPE.caption,
    width: 58,
    textAlign: "right",
  },
  boardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: "#4a3a1c",
  },
  footerLabel: {
    color: COLORS.textMuted,
    fontFamily: FONT.medium,
    fontSize: TYPE.caption,
    letterSpacing: 0.4,
  },
  footerValue: { color: COLORS.warning, fontFamily: FONT.bold, fontSize: TYPE.title },

  strip: { borderRadius: RADIUS.card, overflow: "hidden", justifyContent: "flex-end" },
  crowd: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: SPACING.lg,
    paddingBottom: 4,
  },

  actions: { alignSelf: "stretch", alignItems: "center", gap: SPACING.md },
  saveLine: {
    color: COLORS.accent,
    fontFamily: FONT.medium,
    fontSize: TYPE.caption,
    letterSpacing: 0.6,
    textAlign: "center",
  },
  cta: {
    width: "100%",
    maxWidth: 432,
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
