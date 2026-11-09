import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, useWindowDimensions, View } from "react-native";
import { Text } from "./AppText";
import leafBand from "../../assets/ui/tabbar-leaf-band.png";
import { useEconomyContext } from "../economy/EconomyContext";
import { COLORS, CONTENT_MAX_WIDTH, FONT, glowShadow, TYPE, WEIGHT, withAlpha } from "../theme";
import { ScalePressable } from "./ScalePressable";
import { TabIcon } from "./TabIcons";

export type ScreenId = "market" | "inventory" | "trade" | "town" | "research" | "invest" | "achievements";

const TABS: { id: ScreenId; labelKey: string; color: string }[] = [
  { id: "market", labelKey: "tabs.market", color: "#e8c777" },
  { id: "inventory", labelKey: "tabs.inventory", color: "#5fd884" },
  { id: "trade", labelKey: "tabs.trade", color: "#6fb8f2" },
  { id: "town", labelKey: "tabs.town", color: "#c58ee0" },
  { id: "research", labelKey: "tabs.research", color: "#4fc3c9" },
  { id: "invest", labelKey: "tabs.invest", color: "#e0a13f" },
  { id: "achievements", labelKey: "tabs.achievements", color: "#f0776a" },
];

interface Props {
  active: ScreenId;
  onChange: (screen: ScreenId) => void;
  /** a tab to call attention to — the mentor's walk-through names one tab
   * per beat and this is how the bar points at it. Null the rest of the
   * time, which is every moment after the first session. */
  spotlight?: ScreenId | null;
  /** follows the app's one sound/haptic mute switch (see useSoundEffects) —
   * a tab switch has no sound of its own to mute, but the tap still ought
   * to go quiet with everything else rather than becoming the one thing
   * "quiet mode" doesn't quiet. */
  muted?: boolean;
  /** home-indicator strip the bar is extended under */
  bottomInset?: number;
}

export function TabBar({ active, onChange, spotlight = null, muted = false, bottomInset = 0 }: Props) {
  const { t } = useEconomyContext();
  // Seven tabs share the width, so on a narrow phone the badges and labels
  // shrink together instead of the labels running into each other.
  const { width: windowWidth } = useWindowDimensions();
  const slot = Math.min(windowWidth, CONTENT_MAX_WIDTH) / TABS.length;
  const badgeSize = Math.max(34, Math.min(44, Math.floor(slot - 4)));
  const labelSize = slot < 50 ? 9 : slot < 54 ? TYPE.micro : TYPE.caption;
  // A slow breath rather than a blink: the tour holds on one tab for as
  // long as the player takes to read a sentence, and anything faster turns
  // into a flicker sitting under the text they are reading.
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!spotlight) return;
    pulse.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, spotlight]);
  const activeIndex = TABS.findIndex((tab) => tab.id === active);
  const activeColor = TABS[activeIndex].color;
  const indicatorAnim = useRef(new Animated.Value(activeIndex)).current;

  useEffect(() => {
    // Animating a percentage "left" string can't use the native driver.
    Animated.spring(indicatorAnim, {
      toValue: activeIndex,
      useNativeDriver: false,
      friction: 8,
      tension: 60,
    }).start();
  }, [activeIndex, indicatorAnim]);

  // A little jelly pop on whichever badge just became active — a static
  // 1.06 scale (the previous version of this bar) reads as "slightly
  // bigger," not "alive." One shared value per tab rather than driving the
  // active tab's scale off a single value that would have to jump between
  // positions in the array: each tab owns its own resting size, and only
  // the one that just got tapped overshoots past it before settling.
  const badgeScale = useRef(TABS.map(() => new Animated.Value(1))).current;
  useEffect(() => {
    badgeScale[activeIndex].setValue(0.6);
    Animated.spring(badgeScale[activeIndex], {
      toValue: 1,
      useNativeDriver: true,
      friction: 4.5,
      tension: 260,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  const indicatorLeft = indicatorAnim.interpolate({
    inputRange: TABS.map((_, i) => i),
    outputRange: TABS.map((_, i) => `${(i / TABS.length) * 100}%`),
  });

  return (
    <View style={[styles.wrap, { paddingBottom: 24 + bottomInset }]} accessibilityRole="tablist">
      {/* The bar's own backdrop — cropped from the wood background's own
          bottom edge (the leaf vines, barrels and stone path it already
          carried) — rather than just staying transparent over whatever the
          active screen's background happens to be. The market screen swaps
          in its own illustrated scene above this (see App.tsx), which has
          no matching leaf/stone treatment at its own bottom edge, so the
          bar needs this to look the same — leaves at the corners — no
          matter which screen is open. */}
      <Image source={leafBand} style={[StyleSheet.absoluteFill, styles.leafBand]} resizeMode="cover" />
      {/* A slim underline riding above the tabs rather than a pill sitting
          behind one — each tab now carries its own colour on its icon badge
          below, so a second full-width colour wash back there just muddied
          it. The moving bar keeps the "where am I" continuity between taps
          without competing with the badges for attention. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.indicatorSlot, { left: indicatorLeft, width: `${100 / TABS.length}%` }]}
      >
        <View style={[styles.indicatorBar, { backgroundColor: activeColor }, glowShadow(activeColor)]} />
      </Animated.View>
      {TABS.map((tab, i) => {
        const isActive = tab.id === active;
        const lit = tab.id === spotlight;
        return (
          <ScalePressable
            key={tab.id}
            onPress={() => {
              if (!muted) Haptics.selectionAsync().catch(() => {});
              onChange(tab.id);
            }}
            style={styles.tab}
            scaleTo={0.9}
            accessibilityRole="tab"
            aria-selected={isActive}
            accessibilityLabel={t(tab.labelKey)}
          >
            {lit && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.spotlight,
                  {
                    borderColor: tab.color,
                    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.95] }),
                    transform: [
                      { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.04] }) },
                    ],
                  },
                ]}
              />
            )}
            {/* The badge is a complete painted asset now (panel, carved
                corners and icon all baked into one image — see TabIcons)
                rather than a glyph laid over a panel this file drew itself,
                so there is nothing left for this wrapper to fill, tint or
                border — just a plain, unanimated View to carry the active
                tab's glow shadow. An earlier version put that shadow and
                the spring "pop" on the very same native-driven layer, and
                on a real phone that left the active badge permanently
                soft/blurry — two known iOS quirks compounding (a shadowed
                view gets its own offscreen render pass, and a view that
                has ever been natively transformed can stay promoted to a
                GPU layer whose resolution doesn't always end up matching
                the screen's). Keeping the shadow here and the bounce on
                the inner wrapper below, which carries no shadow of its
                own, keeps both effects without stacking them on one
                layer. */}
            <View
              style={[
                styles.iconBadge,
                { width: badgeSize, height: badgeSize },
                isActive && glowShadow(tab.color),
              ]}
            >
              <Animated.View style={{ transform: [{ scale: badgeScale[i] }] }}>
                <TabIcon id={tab.id} size={badgeSize} active={isActive} />
              </Animated.View>
            </View>
            <Text
              numberOfLines={1}
              style={[styles.label, { fontSize: labelSize }, isActive && { color: tab.color }]}
            >
              {t(tab.labelKey)}
            </Text>
          </ScalePressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    // Transparent rather than a solid dark bar — see leafBand below for
    // what actually shows behind the tabs now.
    backgroundColor: "transparent",
    borderTopWidth: 1,
    borderTopColor: withAlpha("#3a2d1e", 0.6),
    // Pushes the whole row up off the bottom edge — the leaf band's own
    // art has the stone path running along its last ~15%, and the label
    // text was landing right on top of that seam instead of staying on
    // the wood above it.
    paddingBottom: 24,
    paddingTop: 8,
    overflow: "hidden",
  },
  leafBand: { width: "100%", height: "100%" },
  indicatorSlot: {
    position: "absolute",
    top: 0,
    alignItems: "center",
  },
  indicatorBar: {
    width: 28,
    height: 3,
    borderRadius: 2,
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 4, gap: 3 },
  spotlight: {
    position: "absolute",
    top: 0,
    left: 4,
    right: 4,
    bottom: 0,
    borderRadius: 14,
    borderWidth: 2,
  },
  // A rounded-square badge behind each icon rather than bare text — same
  // trick a card uses to read as "designed": colour, given a shape and a
  // boundary, reads as an intentional choice instead of whatever an emoji
  // font happened to draw.
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: TYPE.caption,
    color: COLORS.textPrimary,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
  },
});
