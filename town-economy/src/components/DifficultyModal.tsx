import React, { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { DIFFICULTIES, DIFFICULTY_ORDER, DifficultyId } from "../economy/difficulty";
import { CARD_GRADIENT, cardShadow, GOLD_GRADIENT } from "../theme";
import { GradientFill } from "./GradientFill";
import { ScalePressable } from "./ScalePressable";

interface Props {
  visible: boolean;
  currentDifficulty: DifficultyId;
  onSelect: (difficulty: DifficultyId) => void;
  onCancel: () => void;
}

export function DifficultyModal({ visible, currentDifficulty, onSelect, onCancel }: Props) {
  const { t } = useEconomyContext();
  // Picking any difficulty here — even the current one — wipes the whole
  // save, so it always goes through this confirm step rather than firing
  // on the first tap.
  const [pendingDifficulty, setPendingDifficulty] = useState<DifficultyId | null>(null);

  useEffect(() => {
    if (!visible) setPendingDifficulty(null);
  }, [visible]);

  const pending = pendingDifficulty ? DIFFICULTIES[pendingDifficulty] : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
          {pending ? (
            <>
              <Text style={styles.title}>{t("difficultyModal.confirmTitle")}</Text>
              <Text style={styles.subtitle}>
                {t("difficultyModal.confirmBody", { difficulty: t(pending.labelKey) })}
              </Text>
              <ScalePressable
                onPress={() => onSelect(pending.id)}
                style={styles.confirmBtn}
                scaleTo={0.97}
              >
                <GradientFill colors={GOLD_GRADIENT} x1="0" y1="0" x2="0" y2="1" />
                <Text style={styles.confirmBtnText}>{t("difficultyModal.confirmButton")}</Text>
              </ScalePressable>
              <ScalePressable
                onPress={() => setPendingDifficulty(null)}
                style={styles.cancelBtn}
                scaleTo={0.97}
              >
                <Text style={styles.cancelText}>{t("difficultyModal.back")}</Text>
              </ScalePressable>
            </>
          ) : (
            <>
              <Text style={styles.title}>{t("difficultyModal.title")}</Text>
              <Text style={styles.subtitle}>{t("difficultyModal.subtitle")}</Text>

              {DIFFICULTY_ORDER.map((id) => {
                const d = DIFFICULTIES[id];
                const active = id === currentDifficulty;
                return (
                  <ScalePressable
                    key={id}
                    onPress={() => setPendingDifficulty(id)}
                    style={[styles.option, active && styles.optionActive]}
                    scaleTo={0.97}
                  >
                    <Text style={styles.optionIcon}>{d.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={styles.optionTitleRow}>
                        <Text style={styles.optionLabel}>{t(d.labelKey)}</Text>
                        {active && (
                          <Text style={styles.optionActiveTag}>{t("difficultyModal.currentTag")}</Text>
                        )}
                      </View>
                      <Text style={styles.optionDesc}>{t(d.descriptionKey)}</Text>
                    </View>
                  </ScalePressable>
                );
              })}

              <ScalePressable onPress={onCancel} style={styles.cancelBtn} scaleTo={0.97}>
                <Text style={styles.cancelText}>{t("common.cancel")}</Text>
              </ScalePressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 18,
    padding: 18,
    overflow: "hidden",
    ...cardShadow,
  },
  title: { color: "#f0e3c8", fontSize: 16, fontWeight: "800", marginBottom: 4 },
  subtitle: { color: "#a0917a", fontSize: 12, marginBottom: 14 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1410",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  optionActive: { borderColor: "#e8c777" },
  optionIcon: { fontSize: 24, marginRight: 12 },
  optionTitleRow: { flexDirection: "row", alignItems: "center" },
  optionLabel: { color: "#f0e3c8", fontWeight: "700", fontSize: 14 },
  optionActiveTag: {
    color: "#1a1410",
    backgroundColor: "#e8c777",
    fontSize: 9,
    fontWeight: "800",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  optionDesc: { color: "#a0917a", fontSize: 11, marginTop: 3 },
  cancelBtn: { alignItems: "center", paddingVertical: 10, marginTop: 4 },
  cancelText: { color: "#a0917a", fontSize: 13, fontWeight: "600" },
  confirmBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    overflow: "hidden",
    marginTop: 4,
  },
  confirmBtnText: { color: "#1a1410", fontWeight: "800", fontSize: 14 },
});
