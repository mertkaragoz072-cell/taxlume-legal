import React from "react";
import { Image, Modal, StyleSheet, useWindowDimensions, View } from "react-native";
import panelArt from "../../assets/ui/offline/panel.webp";
import { Text } from "./AppText";
import { useEconomyContext } from "../economy/EconomyContext";
import { OfflineSummary } from "../economy/types";
import { resolveEventMessage } from "../i18n/t";
import { FONT } from "../theme";
import { GradientFill } from "./GradientFill";
import { ScalePressable } from "./ScalePressable";

interface Props {
  summary: OfflineSummary | null;
  onDismiss: () => void;
}

function formatElapsed(
  ms: number,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return t("offline.minutes", { n: minutes });
  if (minutes === 0) return t("offline.hours", { n: hours });
  return t("offline.hoursMinutes", { h: hours, m: minutes });
}

const FADE = "#1a120d";
const ART_W = 1024;
const ART_H = 1536;

/** One entry in the event list: the icon (a quest tick, an achievement cup, a
 * scroll for a plain event) and its sentence. */
interface Entry {
  key: string;
  icon: string;
  text: string;
}

// Placement of every dynamic piece, read off the sent panel as shares of its
// 1024 x 1536 art: the five parchment slots in the list, the two stat tiles,
// the title plaque and the gold button. Text is sized from the card's width.
const SLOTS = [
  { top: 716, height: 90 },
  { top: 815, height: 90 },
  { top: 915, height: 72 },
  { top: 995, height: 72 },
  { top: 1076, height: 95 },
];

export function OfflineSummaryModal({ summary, onDismiss }: Props) {
  const { state, t, formatCoins } = useEconomyContext();
  const { width: windowWidth } = useWindowDimensions();
  if (!summary) return null;

  const w = Math.min(windowWidth - 8, 430);
  const f = (px: number) => (px / ART_W) * w;
  const pctX = (px: number) => `${(px / ART_W) * 100}%` as const;
  const pctY = (px: number) => `${(px / ART_H) * 100}%` as const;

  const entries: Entry[] = [
    ...(summary.caravansCompleted > 0
      ? [
          {
            key: "caravans",
            icon: "🚚",
            text: `${t("offline.caravansCompleted")}: ${summary.caravansCompleted}`,
          },
        ]
      : []),
    ...summary.newQuests.map((title) => ({ key: `q-${title}`, icon: "✅", text: title })),
    ...summary.newAchievements.map((title) => ({ key: `a-${title}`, icon: "🏆", text: title })),
    ...summary.recentEvents.map((event) => ({
      key: `e-${event.id}`,
      icon: "📜",
      text: resolveEventMessage(state.language, event),
    })),
  ];
  const shown = entries.slice(0, SLOTS.length);
  const hidden = entries.length - shown.length;
  // The plaque holds ~500 art-px of lettering; a long title (English) shrinks to fit.
  const titleSize = Math.min(46, 430 / (t("offline.title").length * 0.7));
  const tone = (n: number) => (n >= 0 ? "#1b6b2c" : "#a33f3a");
  const signed = (n: number) => `${n >= 0 ? "+" : ""}${formatCoins(n)}`;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop} aria-modal>
        <View style={{ width: w, height: (w * ART_H) / ART_W }}>
          <Image source={panelArt} style={styles.art} resizeMode="stretch" />
          {/* The art ships with its own blurred night-town backdrop; the
              edges fade into the modal's dark so it reads as a card. */}
          <View pointerEvents="none" style={styles.fadeTop}>
            <GradientFill colors={[FADE, "rgba(26,18,13,0)"]} x1="0" y1="0" x2="0" y2="1" />
          </View>
          <View pointerEvents="none" style={styles.fadeBottom}>
            <GradientFill colors={["rgba(26,18,13,0)", FADE]} x1="0" y1="0" x2="0" y2="1" />
          </View>
          <View pointerEvents="none" style={styles.fadeLeft}>
            <GradientFill colors={[FADE, "rgba(26,18,13,0)"]} x1="0" y1="0" x2="1" y2="0" />
          </View>
          <View pointerEvents="none" style={styles.fadeRight}>
            <GradientFill colors={["rgba(26,18,13,0)", FADE]} x1="0" y1="0" x2="1" y2="0" />
          </View>

          <Text
            style={[
              styles.title,
              {
                left: pctX(235),
                width: pctX(555),
                top: pctY(284),
                height: pctY(76),
                fontSize: f(titleSize),
                lineHeight: f(76),
              },
            ]}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {t("offline.title").toUpperCase()}
          </Text>
          <Text
            style={[styles.subtitle, { left: pctX(110), right: pctX(110), top: pctY(372), fontSize: f(27) }]}
            numberOfLines={2}
          >
            {t("offline.subtitle", { elapsed: formatElapsed(summary.elapsedMs, t) })}
          </Text>

          {[
            { left: 270, label: t("header.cash"), value: summary.cashDelta },
            { left: 672, label: t("header.netWorth"), value: summary.netWorthDelta },
          ].map((tile) => (
            <View
              key={tile.label}
              style={[styles.tile, { left: pctX(tile.left), top: pctY(474), width: pctX(215) }]}
            >
              <Text style={[styles.tileLabel, { fontSize: f(27) }]} numberOfLines={1}>
                {tile.label}
              </Text>
              <Text
                style={[styles.tileValue, { fontSize: f(40), color: tone(tile.value) }]}
                numberOfLines={1}
              >
                {signed(tile.value)}
              </Text>
            </View>
          ))}

          <Text
            style={[
              styles.banner,
              {
                left: pctX(200),
                width: pctX(390),
                top: pctY(636),
                height: pctY(60),
                fontSize: f(34),
                lineHeight: f(58),
              },
            ]}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {t("offline.eventsSectionLabel")}
          </Text>
          {hidden > 0 && (
            <Text style={[styles.more, { right: pctX(110), top: pctY(660), fontSize: f(26) }]}>
              +{hidden}
            </Text>
          )}

          {summary.hyperinflationHappened && (
            <Text
              style={[styles.crisis, { left: pctX(130), right: pctX(130), top: pctY(1182), fontSize: f(24) }]}
              numberOfLines={2}
            >
              {t("offline.hyperinflation")}
            </Text>
          )}

          {shown.map((entry, i) => (
            <View
              key={entry.key}
              style={[
                styles.slot,
                { top: pctY(SLOTS[i].top), height: pctY(SLOTS[i].height), left: pctX(150), right: pctX(140) },
              ]}
            >
              <Text style={[styles.slotIcon, { fontSize: f(42), width: f(84) }]}>{entry.icon}</Text>
              <Text style={[styles.slotText, { fontSize: f(26), lineHeight: f(30) }]} numberOfLines={2}>
                {entry.text}
              </Text>
            </View>
          ))}

          <ScalePressable
            onPress={onDismiss}
            style={[
              styles.confirm,
              { left: pctX(175), width: pctX(670), top: pctY(1243), height: pctY(114) },
            ]}
            scaleTo={0.97}
            accessibilityLabel={t("offline.confirmBtn")}
          >
            <Text style={[styles.confirmText, { fontSize: f(46) }]}>{t("offline.confirmBtn")}</Text>
          </ScalePressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(20,14,10,0.94)",
  },
  art: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  fadeTop: { position: "absolute", top: 0, left: 0, right: 0, height: "4.5%" },
  fadeBottom: { position: "absolute", bottom: 0, left: 0, right: 0, height: "7%" },
  fadeLeft: { position: "absolute", top: 0, bottom: 0, left: 0, width: "3.6%" },
  fadeRight: { position: "absolute", top: 0, bottom: 0, right: 0, width: "3.6%" },
  title: {
    position: "absolute",
    textAlign: "center",
    color: "#f3d27a",
    fontFamily: FONT.display,
    letterSpacing: 2,
  },
  subtitle: { position: "absolute", textAlign: "center", color: "#3d2415", fontFamily: FONT.serif },
  tile: { position: "absolute" },
  tileLabel: { color: "#3d2415", fontFamily: FONT.bold },
  tileValue: { fontFamily: FONT.black, marginTop: 2 },
  banner: {
    position: "absolute",
    textAlign: "center",
    color: "#f1e3b8",
    fontFamily: FONT.display,
    letterSpacing: 1.5,
  },
  more: { position: "absolute", color: "#f1e3b8", fontFamily: FONT.black },
  crisis: { position: "absolute", textAlign: "center", color: "#a33f3a", fontFamily: FONT.bold },
  slot: { position: "absolute", flexDirection: "row", alignItems: "center" },
  slotIcon: { textAlign: "center" },
  slotText: { flex: 1, color: "#3d2415", fontFamily: FONT.serif },
  confirm: { position: "absolute", alignItems: "center", justifyContent: "center" },
  confirmText: { color: "#3d2415", fontFamily: FONT.serif },
});
