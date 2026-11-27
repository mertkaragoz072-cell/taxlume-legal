import React, { useState } from "react";
import { Image, Modal, StyleSheet, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { PROPERTIES, PropertyDef } from "../economy/properties";
import { FONT } from "../theme";
import { Text } from "./AppText";
import { ModalBackdrop } from "./ModalBackdrop";
import { ModalShell } from "./ModalKit";
import { StretchPanel } from "./PanelKit";
import { ScalePressable } from "./ScalePressable";
import { BUILDING_ART, INK, INK_GREEN, INK_SOFT } from "./TownCards";

const COLS = 3;

/** "My estate": every property as a painting. Owned ones are in full colour with a
 * gold frame (tap for the title deed), the ones still to buy are dimmed with their
 * price, so the player sees what they own and what is left to collect. */
export function PropertyShowcase() {
  const { state, t, formatCoins } = useEconomyContext();
  const [open, setOpen] = useState<PropertyDef | null>(null);
  const owned = PROPERTIES.filter((p) => state.ownedProperties.includes(p.id));
  const totalValue = owned.reduce((sum, p) => sum + p.cost, 0);
  const effectOf = (p: PropertyDef) => {
    const e = p.effectLabel();
    return t(e.key, e.params);
  };

  return (
    <>
      <StretchPanel frame="properties" title={t("town.estate.title")}>
        <View style={styles.grid}>
          {PROPERTIES.map((p) => {
            const has = state.ownedProperties.includes(p.id);
            return (
              <View key={p.id} style={styles.cellWrap}>
                <ScalePressable
                  disabled={!has}
                  onPress={() => setOpen(p)}
                  accessibilityRole="button"
                  accessibilityLabel={t(p.nameKey)}
                  style={[styles.cell, has ? styles.cellOwned : styles.cellLocked]}
                  scaleTo={0.95}
                >
                  <Image
                    source={BUILDING_ART[p.id]}
                    style={[styles.art, !has && styles.artDim]}
                    resizeMode="contain"
                  />
                  <Text style={[styles.name, !has && styles.nameDim]} numberOfLines={2}>
                    {t(p.nameKey)}
                  </Text>
                  <Text style={has ? styles.owned : styles.price} numberOfLines={1}>
                    {has ? `✓ ${t("town.propertyOwnedLabel")}` : `🔒 ${formatCoins(p.cost)}`}
                  </Text>
                </ScalePressable>
              </View>
            );
          })}
        </View>
        <Text style={styles.summary}>
          {owned.length === 0
            ? t("town.estate.none")
            : t("town.estate.summary", {
                owned: owned.length,
                total: PROPERTIES.length,
                value: formatCoins(totalValue),
              })}
        </Text>
      </StretchPanel>

      <Modal visible={open !== null} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <ModalBackdrop>
          <ModalShell title={t("town.estate.deed")} onClose={() => setOpen(null)}>
            {open ? (
              <View style={styles.deed}>
                <View style={styles.deedFrame}>
                  <Image source={BUILDING_ART[open.id]} style={styles.deedArt} resizeMode="contain" />
                </View>
                <Text style={styles.deedName}>{t(open.nameKey)}</Text>
                <Text style={styles.deedDesc}>{t(open.descriptionKey)}</Text>
                <Text style={styles.deedEffect}>{effectOf(open)}</Text>
                <Text style={styles.deedValue}>
                  {t("town.estate.value", { value: formatCoins(open.cost) })}
                </Text>
                <View style={styles.seal}>
                  <Text style={styles.sealText}>{t("town.estate.seal")}</Text>
                </View>
              </View>
            ) : null}
          </ModalShell>
        </ModalBackdrop>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -3 },
  cellWrap: { width: `${100 / COLS}%`, padding: 3 },
  cell: { borderRadius: 14, alignItems: "center", paddingVertical: 6, paddingHorizontal: 4 },
  cellOwned: { backgroundColor: "rgba(246,226,160,0.6)", borderWidth: 2.5, borderColor: "#b8892f" },
  cellLocked: {
    backgroundColor: "rgba(60,38,18,0.14)",
    borderWidth: 1.5,
    borderColor: "rgba(60,38,18,0.25)",
  },
  art: { width: "100%", aspectRatio: 1 },
  artDim: { opacity: 0.28 },
  name: { color: INK, fontFamily: FONT.bold, fontSize: 12, textAlign: "center", minHeight: 30 },
  nameDim: { color: INK_SOFT, opacity: 0.7 },
  owned: { color: INK_GREEN, fontFamily: FONT.black, fontSize: 12 },
  price: { color: INK_SOFT, fontFamily: FONT.bold, fontSize: 12 },
  summary: { color: INK_SOFT, fontFamily: FONT.bold, fontSize: 13, textAlign: "center", marginTop: 6 },
  deed: { alignItems: "center", paddingVertical: 4 },
  deedFrame: {
    width: "78%",
    aspectRatio: 1,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: "#c99a3a",
    backgroundColor: "rgba(246,226,160,0.16)",
    padding: 8,
    marginBottom: 10,
  },
  deedArt: { width: "100%", height: "100%" },
  deedName: { color: "#f6e2a0", fontFamily: FONT.black, fontSize: 22, textAlign: "center" },
  deedDesc: { color: "#eadcb6", fontFamily: FONT.medium, fontSize: 14, textAlign: "center", marginTop: 4 },
  deedEffect: { color: "#9fe0a8", fontFamily: FONT.bold, fontSize: 15, textAlign: "center", marginTop: 8 },
  deedValue: { color: "#eadcb6", fontFamily: FONT.bold, fontSize: 13, marginTop: 6 },
  seal: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#c99a3a",
    transform: [{ rotate: "-4deg" }],
  },
  sealText: { color: "#f6e2a0", fontFamily: FONT.black, fontSize: 13, letterSpacing: 2 },
});
