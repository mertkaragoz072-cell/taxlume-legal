import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { Text } from "./AppText";
import { useEconomyContext } from "../economy/EconomyContext";
import { ONBOARDING_STEPS } from "../economy/onboarding";
import { QUEST_TEMPLATES_BY_ID } from "../economy/quests";
import { FONT, GOLD_GRADIENT, TYPE } from "../theme";
import { GradientFill } from "./GradientFill";
import { ParchmentBackground } from "./ParchmentBackground";

interface Props {
  visible: boolean;
  onClose: () => void;
}

type Tab = "start" | "daily";

interface Row {
  key: string;
  icon: string;
  title: string;
  note?: string;
  reward: number;
  state: "done" | "now" | "locked";
  progress?: { current: number; target: number };
}

const INK = "#3d2415";

/** One place for every quest: a parchment sheet with a Start tab (the guided
 * first steps, in order) and a Daily tab. Each row is a plank with an icon
 * slot, title, progress bar and reward; finished rows turn green with a tick,
 * the one to do now is gold, and the rest sit brown until their turn. Reads
 * the same state the quest strip and the Goals tab do, and changes nothing. */
export function QuestHub({ visible, onClose }: Props) {
  const { state, t, formatCoins } = useEconomyContext();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>("start");
  const cardW = Math.min(width - 16, 420);

  const startRows: Row[] = ONBOARDING_STEPS.map((step, i) => ({
    key: step.id,
    icon: step.icon,
    title: t(step.titleKey),
    note: i === state.onboardingStep ? t(step.descriptionKey) : undefined,
    reward: step.reward,
    state: i < state.onboardingStep ? "done" : i === state.onboardingStep ? "now" : "locked",
  }));
  const dailyRows: Row[] = state.dailyQuests.flatMap((q) => {
    const tpl = QUEST_TEMPLATES_BY_ID[q.templateId];
    if (!tpl) return [];
    const current = Math.min(tpl.progress(state.dailyProgress), q.target);
    return [
      {
        key: q.id,
        icon: tpl.icon,
        title: t(tpl.titleKey),
        note: q.completed ? undefined : t(tpl.descriptionKey, { target: q.target }),
        reward: q.reward,
        state: q.completed ? ("done" as const) : ("now" as const),
        progress: q.completed ? undefined : { current: Math.floor(current), target: q.target },
      },
    ];
  });
  const rows = tab === "start" ? startRows : dailyRows;
  const doneCount = rows.filter((r) => r.state === "done").length;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.card, { width: cardW }]} onPress={() => {}}>
          <ParchmentBackground />
          <View style={styles.head}>
            <View style={styles.titlePlate}>
              <GradientFill colors={["#2f6a45", "#1d4a30"]} x1="0" y1="0" x2="0" y2="1" />
              <Text style={styles.title} accessibilityRole="header">
                {t("onboarding.hubTitle")}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.close}
              accessibilityRole="button"
              accessibilityLabel={t("onboarding.hubClose")}
            >
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.tabs}>
            {(["start", "daily"] as Tab[]).map((id) => (
              <Pressable key={id} onPress={() => setTab(id)} style={[styles.tab, tab === id && styles.tabOn]}>
                <Text style={[styles.tabText, tab === id && styles.tabTextOn]}>
                  {id === "start" ? t("onboarding.tabStart") : t("onboarding.tabDaily")}
                </Text>
              </Pressable>
            ))}
            <Text style={styles.count}>
              {doneCount} / {rows.length}
            </Text>
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {rows.map((r) => (
              <View key={r.key} style={[styles.row, styles[r.state]]}>
                <View style={styles.slot}>
                  <Text style={styles.slotIcon}>
                    {r.state === "done" ? "✅" : r.state === "locked" ? "🔒" : r.icon}
                  </Text>
                </View>
                <View style={styles.rowMain}>
                  <Text style={[styles.rowTitle, r.state === "locked" && styles.dim]} numberOfLines={1}>
                    {r.title}
                  </Text>
                  {r.note && (
                    <Text style={styles.rowNote} numberOfLines={2}>
                      {r.note}
                    </Text>
                  )}
                  {r.progress && (
                    <View style={styles.barRow}>
                      <View style={styles.track}>
                        <View
                          style={[
                            styles.fill,
                            { width: `${(r.progress.current / Math.max(1, r.progress.target)) * 100}%` },
                          ]}
                        >
                          <GradientFill colors={GOLD_GRADIENT} />
                        </View>
                      </View>
                      <Text style={styles.barText}>
                        {r.progress.current}/{r.progress.target}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.rewardBox}>
                  <Text style={[styles.reward, r.state === "done" && styles.dim]}>
                    +{formatCoins(r.reward).replace(/\.0(?=\D|$)/, "")}
                  </Text>
                  {r.state === "now" && tab === "start" && (
                    <Text style={styles.nowTag}>{t("onboarding.hubNow")}</Text>
                  )}
                  {r.state === "done" && <Text style={styles.doneTag}>{t("onboarding.hubDone")}</Text>}
                </View>
              </View>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10,6,3,0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  card: {
    maxHeight: "86%",
    borderRadius: 18,
    borderWidth: 3,
    borderColor: "#8a5f33",
    overflow: "hidden",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
  },
  head: { alignItems: "center", marginBottom: 10 },
  titlePlate: {
    paddingHorizontal: 34,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#c9a05a",
    overflow: "hidden",
  },
  title: { color: "#f1cf7a", fontFamily: FONT.display, fontSize: TYPE.heading + 2, letterSpacing: 2 },
  close: {
    position: "absolute",
    right: -6,
    top: -6,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: "#c9a05a",
    backgroundColor: "#5a3a1e",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { color: "#f6e7c4", fontSize: TYPE.label },
  tabs: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#3b2410",
    backgroundColor: "#5a3a1e",
  },
  tabOn: { backgroundColor: "#f6d36a", borderColor: "#c9a05a" },
  tabText: { color: "#f0dfb8", fontFamily: FONT.bold, fontSize: TYPE.label },
  tabTextOn: { color: INK },
  count: { marginLeft: "auto", color: INK, fontFamily: FONT.serif, fontSize: TYPE.body },
  list: { flexGrow: 0 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 2,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginBottom: 7,
    gap: 8,
  },
  done: { backgroundColor: "#24512f", borderColor: "#6fcf86" },
  now: { backgroundColor: "#5b3a14", borderColor: "#e8b84a" },
  locked: { backgroundColor: "#3b2616", borderColor: "#6f4e2e" },
  slot: {
    width: 44,
    height: 44,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "rgba(201,160,90,0.7)",
    backgroundColor: "rgba(246,231,196,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  slotIcon: { fontSize: 24 },
  rowMain: { flex: 1, minWidth: 0 },
  rowTitle: { color: "#f6e7c4", fontFamily: FONT.serif, fontSize: TYPE.title },
  dim: { opacity: 0.6 },
  rowNote: { color: "#e2d2ae", fontSize: TYPE.caption, marginTop: 1, lineHeight: 14 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  track: { flex: 1, height: 7, borderRadius: 4, backgroundColor: "rgba(20,13,7,0.85)", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4, overflow: "hidden" },
  barText: { color: "#f6e7c4", fontFamily: FONT.bold, fontSize: TYPE.caption },
  rewardBox: { alignItems: "flex-end" },
  reward: { color: "#ffe08a", fontFamily: FONT.black, fontSize: TYPE.body },
  nowTag: { color: "#ffe08a", fontFamily: FONT.bold, fontSize: TYPE.micro, marginTop: 2 },
  doneTag: { color: "#b6f0c3", fontFamily: FONT.bold, fontSize: TYPE.micro, marginTop: 2 },
});
