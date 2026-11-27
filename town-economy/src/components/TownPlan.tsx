import React, { useState } from "react";
import { Image, Modal, ScrollView, StyleSheet, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { PROPERTIES_BY_ID } from "../economy/properties";
import {
  builtBuildings,
  layoutHappinessBonus,
  layoutOf,
  plotCount,
  PLOT_MAX,
  unplacedBuildings,
} from "../economy/townLayout";
import { UPGRADES_BY_ID } from "../economy/upgrades";
import { UpgradeId } from "../economy/types";
import { FONT } from "../theme";
import { Text } from "./AppText";
import { ModalBackdrop } from "./ModalBackdrop";
import { ModalShell } from "./ModalKit";
import { GoldButton, StretchPanel } from "./PanelKit";
import { ScalePressable } from "./ScalePressable";
import { BUILDING_ART, INK_SOFT } from "./TownCards";

const COLS = 4;

function nameKeyOf(id: string): string {
  return UPGRADES_BY_ID[id as UpgradeId]?.nameKey ?? PROPERTIES_BY_ID[id]?.nameKey ?? id;
}

/** The town plan: a grid of plots. Tap an empty plot to put one of the built
 * buildings on it, tap a building to swap or clear it. Every placed building adds a
 * little beauty to the town (see townLayout.ts). */
export function TownPlan() {
  const { state, t, placeBuilding, autoLayout } = useEconomyContext();
  const [picking, setPicking] = useState<number | null>(null);
  const open = plotCount(state.townRankIndex);
  const layout = layoutOf(state);
  const waiting = unplacedBuildings(state);
  const built = builtBuildings(state);
  const placedCount = built.length - waiting.length;
  const bonus = layoutHappinessBonus(state);
  const current = picking !== null ? layout[picking] : null;

  return (
    <>
      <StretchPanel frame="upgrades" title={t("town.plan.title")}>
        <View style={styles.grid}>
          {Array.from({ length: PLOT_MAX }, (_, i) => {
            const id = layout[i];
            const locked = i >= open;
            return (
              <View key={i} style={styles.cellWrap}>
                <ScalePressable
                  disabled={locked}
                  onPress={() => setPicking(i)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    id ? t(nameKeyOf(id)) : locked ? t("town.plan.locked") : t("town.plan.empty")
                  }
                  style={[styles.cell, id ? styles.cellFull : locked ? styles.cellLocked : styles.cellEmpty]}
                  scaleTo={0.94}
                >
                  {id ? (
                    <>
                      <Image source={BUILDING_ART[id]} style={styles.art} resizeMode="contain" />
                      {UPGRADES_BY_ID[id as UpgradeId] ? (
                        <View style={styles.lv}>
                          <Text style={styles.lvText}>{state.upgrades[id as UpgradeId]}</Text>
                        </View>
                      ) : null}
                    </>
                  ) : (
                    <Text style={locked ? styles.lock : styles.plus}>{locked ? "🔒" : "+"}</Text>
                  )}
                </ScalePressable>
              </View>
            );
          })}
        </View>

        <Text style={styles.summary}>
          {built.length === 0
            ? t("town.plan.nothingBuilt")
            : t("town.plan.summary", { placed: placedCount, total: built.length, bonus: bonus.toFixed(1) })}
        </Text>
        {waiting.length > 0 && open > layout.filter(Boolean).length ? (
          <View style={styles.autoRow}>
            <GoldButton label={t("town.plan.auto")} height={30} onPress={autoLayout} />
          </View>
        ) : null}
      </StretchPanel>

      <Modal
        visible={picking !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPicking(null)}
      >
        <ModalBackdrop>
          <ModalShell title={t("town.plan.pick")} onClose={() => setPicking(null)}>
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {waiting.length === 0 && !current ? (
                <Text style={styles.none}>{t("town.plan.noneToPlace")}</Text>
              ) : null}
              {waiting.map((id) => (
                <ScalePressable
                  key={id}
                  onPress={() => {
                    if (picking !== null) placeBuilding(picking, id);
                    setPicking(null);
                  }}
                  accessibilityRole="button"
                  style={styles.row}
                  scaleTo={0.97}
                >
                  <Image source={BUILDING_ART[id]} style={styles.rowArt} resizeMode="contain" />
                  <Text style={styles.rowName} numberOfLines={2}>
                    {t(nameKeyOf(id))}
                  </Text>
                </ScalePressable>
              ))}
              {current ? (
                <ScalePressable
                  onPress={() => {
                    if (picking !== null) placeBuilding(picking, null);
                    setPicking(null);
                  }}
                  accessibilityRole="button"
                  style={[styles.row, styles.rowClear]}
                  scaleTo={0.97}
                >
                  <Text style={styles.rowClearText}>
                    {t("town.plan.clear", { name: t(nameKeyOf(current)) })}
                  </Text>
                </ScalePressable>
              ) : null}
            </ScrollView>
          </ModalShell>
        </ModalBackdrop>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -3 },
  cellWrap: { width: `${100 / COLS}%`, padding: 3 },
  cell: {
    aspectRatio: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cellEmpty: {
    backgroundColor: "rgba(90,61,34,0.12)",
    borderWidth: 2,
    borderColor: "rgba(90,61,34,0.4)",
    borderStyle: "dashed",
  },
  cellFull: { backgroundColor: "rgba(246,226,160,0.55)", borderWidth: 2, borderColor: "#b8892f" },
  cellLocked: {
    backgroundColor: "rgba(60,38,18,0.18)",
    borderWidth: 1.5,
    borderColor: "rgba(60,38,18,0.25)",
  },
  art: { width: "86%", height: "86%" },
  plus: { color: INK_SOFT, fontFamily: FONT.black, fontSize: 28, opacity: 0.7 },
  lock: { fontSize: 18, opacity: 0.6 },
  lv: {
    position: "absolute",
    right: 3,
    bottom: 3,
    minWidth: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: "#3a2616",
    alignItems: "center",
  },
  lvText: { color: "#f6e2a0", fontFamily: FONT.black, fontSize: 11 },
  summary: { color: INK_SOFT, fontFamily: FONT.bold, fontSize: 13, textAlign: "center", marginTop: 6 },
  autoRow: { alignItems: "center", marginTop: 8 },
  none: { color: "#eadcb6", fontFamily: FONT.medium, fontSize: 14, textAlign: "center", padding: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 8,
    marginBottom: 6,
    borderRadius: 14,
    backgroundColor: "rgba(246,226,160,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(201,154,58,0.6)",
  },
  rowArt: { width: 52, height: 52 },
  rowName: { flex: 1, color: "#f6e2a0", fontFamily: FONT.bold, fontSize: 15 },
  rowClear: {
    justifyContent: "center",
    borderColor: "rgba(201,100,80,0.7)",
    backgroundColor: "rgba(150,40,30,0.18)",
  },
  rowClearText: { color: "#f3b4a8", fontFamily: FONT.bold, fontSize: 14, textAlign: "center" },
});
