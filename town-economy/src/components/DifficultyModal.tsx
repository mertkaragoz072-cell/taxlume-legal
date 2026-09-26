import React, { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { DIFFICULTIES, DIFFICULTY_ORDER, DifficultyId } from "../economy/difficulty";
import { NG_PLUS_MODIFIERS, ngPlusBonusPrestigePoints } from "../economy/ngPlusModifiers";
import {
  CARD_GRADIENT,
  cardShadow,
  COLORS,
  FONT,
  GOLD_GRADIENT,
  RADIUS,
  SPACING,
  TYPE,
  WEIGHT,
  withAlpha,
} from "../theme";
import { GradientFill } from "./GradientFill";
import { ModalBackdrop } from "./ModalBackdrop";
import { ScalePressable } from "./ScalePressable";

interface Props {
  visible: boolean;
  currentDifficulty: DifficultyId;
  /** New Game Plus modifiers are only offered once the player has prestiged
   * at least once — before that "harder for a bonus" has nothing to pay out into */
  prestigeLevel: number;
  onSelect: (difficulty: DifficultyId, ngPlusModifiers: string[]) => void;
  onCancel: () => void;
}

const DIFFICULTY_COLORS: Record<DifficultyId, string> = {
  easy: "#5fd884",
  normal: "#e8c777",
  hard: "#f0776a",
};

export function DifficultyModal({ visible, currentDifficulty, prestigeLevel, onSelect, onCancel }: Props) {
  const { t } = useEconomyContext();
  // Picking any difficulty here — even the current one — wipes the whole
  // save, so it always goes through this confirm step rather than firing
  // on the first tap.
  const [pendingDifficulty, setPendingDifficulty] = useState<DifficultyId | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);

  useEffect(() => {
    if (!visible) {
      setPendingDifficulty(null);
      setSelectedModifiers([]);
    }
  }, [visible]);

  const pending = pendingDifficulty ? DIFFICULTIES[pendingDifficulty] : null;
  const bonusPoints = ngPlusBonusPrestigePoints(selectedModifiers);

  function toggleModifier(id: string) {
    setSelectedModifiers((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }

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

              {prestigeLevel > 0 && (
                <View style={styles.ngPlusSection}>
                  <Text style={styles.ngPlusTitle}>{t("difficultyModal.ngPlusTitle")}</Text>
                  <Text style={styles.ngPlusSubtitle}>{t("difficultyModal.ngPlusSubtitle")}</Text>
                  {NG_PLUS_MODIFIERS.map((mod) => {
                    const active = selectedModifiers.includes(mod.id);
                    return (
                      <ScalePressable
                        key={mod.id}
                        onPress={() => toggleModifier(mod.id)}
                        style={[styles.ngPlusOption, active && styles.ngPlusOptionActive]}
                        scaleTo={0.98}
                      >
                        <Text style={styles.ngPlusIcon}>{mod.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.ngPlusLabel}>{t(mod.labelKey)}</Text>
                          <Text style={styles.ngPlusDesc}>{t(mod.descriptionKey)}</Text>
                        </View>
                        <Text style={styles.ngPlusBonus}>
                          {t("difficultyModal.ngPlusPointsBadge", { points: mod.bonusPrestigePoints })}
                        </Text>
                      </ScalePressable>
                    );
                  })}
                  {selectedModifiers.length > 0 && (
                    <Text style={styles.ngPlusTotalBonus}>
                      {t("difficultyModal.ngPlusTotalBonus", { points: bonusPoints })}
                    </Text>
                  )}
                </View>
              )}

              <ScalePressable
                onPress={() => onSelect(pending.id, selectedModifiers)}
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
    borderRadius: RADIUS.feature,
    borderWidth: 1,
    borderColor: withAlpha(COLORS.accent, 0.3),
    padding: 18,
    overflow: "hidden",
    ...cardShadow,
  },
  title: { color: COLORS.textPrimary, fontSize: TYPE.title, fontFamily: FONT.display, marginBottom: 4 },
  subtitle: { color: COLORS.textMuted, fontSize: TYPE.label, marginBottom: 14 },
  ngPlusSection: { marginBottom: 6 },
  ngPlusTitle: {
    color: COLORS.accent,
    fontSize: TYPE.body,
    fontWeight: WEIGHT.black,
    fontFamily: FONT.black,
    marginBottom: 2,
  },
  ngPlusSubtitle: { color: COLORS.textMuted, fontSize: TYPE.caption, marginBottom: 10 },
  ngPlusOption: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.card - 2,
    padding: 10,
    marginBottom: SPACING.sm,
    backgroundColor: "rgba(232,199,119,0.06)",
    borderWidth: 2,
    borderColor: "transparent",
  },
  ngPlusOptionActive: { borderColor: COLORS.accent, backgroundColor: "rgba(232,199,119,0.16)" },
  ngPlusIcon: { fontSize: 20, marginRight: 10 },
  ngPlusLabel: { color: COLORS.textPrimary, fontWeight: WEIGHT.bold, fontFamily: FONT.bold, fontSize: TYPE.body },
  ngPlusDesc: { color: COLORS.textMuted, fontSize: TYPE.micro, marginTop: 2 },
  ngPlusBonus: {
    color: COLORS.accent,
    fontWeight: WEIGHT.black,
    fontFamily: FONT.black,
    fontSize: TYPE.label,
    marginLeft: SPACING.sm,
  },
  ngPlusTotalBonus: {
    color: COLORS.accent,
    fontSize: TYPE.label,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    textAlign: "center",
    marginTop: 2,
    marginBottom: 6,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    marginBottom: SPACING.sm + 2,
    borderWidth: 2,
    borderColor: "transparent",
  },
  optionIcon: { fontSize: 24, marginRight: SPACING.md },
  optionTitleRow: { flexDirection: "row", alignItems: "center" },
  optionLabel: { color: COLORS.textPrimary, fontWeight: WEIGHT.bold, fontFamily: FONT.bold, fontSize: 14 },
  optionActiveTag: {
    color: COLORS.onLight,
    backgroundColor: COLORS.accent,
    fontSize: 9,
    fontWeight: WEIGHT.black,
    fontFamily: FONT.black,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: SPACING.sm,
  },
  optionDesc: { color: COLORS.textMuted, fontSize: TYPE.caption, marginTop: 3 },
  cancelBtn: { alignItems: "center", paddingVertical: 10, marginTop: 4 },
  cancelText: { color: COLORS.textMuted, fontSize: TYPE.body, fontWeight: WEIGHT.medium, fontFamily: FONT.medium },
  confirmBtn: {
    borderRadius: RADIUS.card - 2,
    paddingVertical: SPACING.md,
    alignItems: "center",
    overflow: "hidden",
    marginTop: 4,
  },
  confirmBtnText: { color: COLORS.onLight, fontWeight: WEIGHT.black, fontFamily: FONT.black, fontSize: 14 },
});
