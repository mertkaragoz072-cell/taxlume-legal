import React, { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { DIFFICULTIES, DIFFICULTY_ORDER, DifficultyId } from "../economy/difficulty";
import { CARD_GRADIENT, cardShadow, FONT, GOLD_GRADIENT, withAlpha } from "../theme";
import { GradientFill } from "./GradientFill";
import { ModalBackdrop } from "./ModalBackdrop";
import { ScalePressable } from "./ScalePressable";

interface Props {
  visible: boolean;
  currentDifficulty: DifficultyId;
  onSelect: (difficulty: DifficultyId) => void;
  onCancel: () => void;
}

const DIFFICULTY_COLORS: Record<DifficultyId, string> = {
  easy: "#5fd884",
  normal: "#e8c777",
  hard: "#f0776a",
};

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
      <ModalBackdrop>
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
                const color = DIFFICULTY_COLORS[id];
                return (
                  <ScalePressable
                    key={id}
                    onPress={() => setPendingDifficulty(id)}
                    style={[
                      styles.option,
                      { backgroundColor: withAlpha(color, 0.1) },
                      active && { borderColor: color },
                    ]}
                    scaleTo={0.97}
                  >
                    <Text style={styles.optionIcon}>{d.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={styles.optionTitleRow}>
                        <Text style={[styles.optionLabel, { color }]}>{t(d.labelKey)}</Text>
                        {active && (
                          <Text style={[styles.optionActiveTag, { backgroundColor: color }]}>
                            {t("difficultyModal.currentTag")}
                          </Text>
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
      </ModalBackdrop>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 18,
    padding: 18,
    overflow: "hidden",
    ...cardShadow,
  },
  title: { color: "#f0e3c8", fontSize: 16, fontFamily: FONT.display, marginBottom: 4 },
  subtitle: { color: "#a0917a", fontSize: 12, marginBottom: 14 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  optionIcon: { fontSize: 24, marginRight: 12 },
  optionTitleRow: { flexDirection: "row", alignItems: "center" },
  optionLabel: { color: "#f0e3c8", fontWeight: "700", fontFamily: FONT.bold, fontSize: 14 },
  optionActiveTag: {
    color: "#1a1410",
    backgroundColor: "#e8c777",
    fontSize: 9,
    fontWeight: "800", fontFamily: FONT.black,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  optionDesc: { color: "#a0917a", fontSize: 11, marginTop: 3 },
  cancelBtn: { alignItems: "center", paddingVertical: 10, marginTop: 4 },
  cancelText: { color: "#a0917a", fontSize: 13, fontWeight: "600", fontFamily: FONT.medium },
  confirmBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    overflow: "hidden",
    marginTop: 4,
  },
  confirmBtnText: { color: "#1a1410", fontWeight: "800", fontFamily: FONT.black, fontSize: 14 },
});
