import React from "react";
import { StyleSheet, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { MINI_QUEST_TEMPLATES_BY_ID } from "../economy/miniQuests";
import { TICK_MS } from "../economy/useEconomy";
import { FONT, SCREEN_PADDING } from "../theme";
import { Text } from "./AppText";
import { ScalePressable } from "./ScalePressable";

/** The flash quest that is running, on every screen: a slim strip with what to
 * do, how far along it is and how long is left. Flash quests used to show only
 * on the Goals page, which meant most of them came and went unseen. Tapping it
 * opens the Goals page. */
export function MiniQuestStrip({ onOpen }: { onOpen: () => void }) {
  const { state, t, formatCoins } = useEconomyContext();
  const quest = state.activeMiniQuest;
  const template = quest ? MINI_QUEST_TEMPLATES_BY_ID[quest.templateId] : null;
  if (!quest || !template) return null;

  const done = Math.max(0, Math.min(template.metric(state.dailyProgress) - quest.baseline, quest.target));
  const pct = quest.target > 0 ? done / quest.target : 0;
  const seconds = Math.ceil((Math.max(0, quest.expiresAtTick - state.tick) * TICK_MS) / 1000);

  return (
    <ScalePressable
      onPress={onOpen}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={`${t("achievements.miniQuestSectionLabel")}: ${t(template.titleKey)}`}
      style={styles.strip}
    >
      <Text aria-hidden style={styles.icon}>
        {template.icon}
      </Text>
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.title} numberOfLines={1}>
            {t(template.descriptionKey, { target: quest.target })}
          </Text>
          <Text style={styles.time}>{t("achievements.miniQuestTicksLeft", { seconds })}</Text>
        </View>
        <View style={styles.row}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${pct * 100}%` }]} />
          </View>
          <Text style={styles.reward}>+{formatCoins(quest.reward)}</Text>
        </View>
      </View>
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  strip: {
    marginHorizontal: SCREEN_PADDING,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#c99a3a",
    backgroundColor: "rgba(40,26,14,0.94)",
  },
  icon: { fontSize: 20 },
  body: { flex: 1, minWidth: 0, gap: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, color: "#f3e3b5", fontFamily: FONT.bold, fontSize: 12 },
  time: { color: "#e8c777", fontFamily: FONT.medium, fontSize: 12 },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(0,0,0,0.5)",
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 3, backgroundColor: "#f0b72e" },
  reward: { color: "#f6e2a0", fontFamily: FONT.black, fontSize: 12 },
});
