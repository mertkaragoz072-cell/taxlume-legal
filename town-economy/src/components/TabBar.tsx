import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { COLORS, FONT, glowShadow, TYPE, WEIGHT, withAlpha } from "../theme";
import { ScalePressable } from "./ScalePressable";

export type ScreenId = "market" | "inventory" | "trade" | "town" | "research" | "invest" | "achievements";

const TABS: { id: ScreenId; labelKey: string; icon: string; color: string }[] = [
  { id: "market", labelKey: "tabs.market", icon: "📈", color: "#e8c777" },
  { id: "inventory", labelKey: "tabs.inventory", icon: "🎒", color: "#5fd884" },
  { id: "trade", labelKey: "tabs.trade", icon: "🚚", color: "#6fb8f2" },
  { id: "town", labelKey: "tabs.town", icon: "🏘️", color: "#c58ee0" },
  { id: "research", labelKey: "tabs.research", icon: "🔬", color: "#4fc3c9" },
  { id: "invest", labelKey: "tabs.invest", icon: "💹", color: "#e0a13f" },
  { id: "achievements", labelKey: "tabs.achievements", icon: "🏆", color: "#f0776a" },
];

/** Tab id to its label key, so anything that needs to *name* a tab — the
 * onboarding banner pointing a player at one — reads the same list the tab
 * bar renders, rather than keeping a second copy that drifts. */
export const TAB_LABEL_KEYS: Record<ScreenId, string> = Object.fromEntries(
  TABS.map((tab) => [tab.id, tab.labelKey])
) as Record<ScreenId, string>;

interface Props {
  active: ScreenId;
  onChange: (screen: ScreenId) => void;
  /** a tab to call attention to — the mentor's walk-through names one tab
   * per beat and this is how the bar points at it. Null the rest of the
   * time, which is every moment after the first session. */
  spotlight?: ScreenId | null;
}

export function TabBar({ active, onChange, spotlight = null }: Props) {
  const { t } = useEconomyContext();
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
    <View style={styles.wrap} accessibilityRole="tablist">
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
            onPress={() => onChange(tab.id)}
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
            {/* Every tab carries its own colour on a badge behind the icon
                now, not just the active one — a plain emoji glyph reads
                differently (and often flatly) across platforms, where a
                colour badge we draw ourselves reads the same everywhere and
                is what actually makes the bar feel designed rather than a
                row of system emoji. Genuinely tinted even at rest — the
                first version of this only saturated on tap and read as
                muddy the rest of the time — then goes to a fully solid
                fill plus a glow in its own colour.
                The badge itself is a plain, unanimated View on purpose: an
                earlier version put the spring "pop" and the shadow on the
                very same native-driven layer, and on a real phone that
                left the active badge permanently soft/blurry — two known
                iOS quirks compounding (a shadowed view gets its own
                offscreen render pass, and a view that has ever been
                natively transformed can stay promoted to a GPU layer whose
                resolution doesn't always end up matching the screen's).
                Keeping the shadow on a static view and moving the bounce to
                the small inner wrapper below — which carries no shadow of
                its own — keeps both effects without stacking them on one
                layer. */}
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: isActive ? tab.color : withAlpha(tab.color, 0.22),
                  borderColor: withAlpha(tab.color, isActive ? 0.9 : 0.32),
                },
                isActive && glowShadow(tab.color),
              ]}
            >
              <Animated.View style={{ transform: [{ scale: badgeScale[i] }] }}>
                {/* The emoji is decoration for a label that is already read
                    out; left visible it makes every tab announce a stray
                    icon name. */}
                <Text aria-hidden style={[styles.icon, isActive && styles.iconActive]}>
                  {tab.icon}
                </Text>
              </Animated.View>
            </View>
            <Text style={[styles.label, isActive && { color: tab.color, fontFamily: FONT.bold }]}>
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
    backgroundColor: "#1a1410",
    borderTopWidth: 1,
    borderTopColor: "#3a2d1e",
    paddingBottom: 6,
    paddingTop: 8,
  },
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
    width: 38,
    height: 38,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: TYPE.title, opacity: 0.75 },
  iconActive: { opacity: 1 },
  label: {
    fontSize: TYPE.micro,
    color: COLORS.textMuted,
    fontWeight: WEIGHT.medium,
    fontFamily: FONT.medium,
  },
});
