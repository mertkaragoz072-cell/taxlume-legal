import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { isEmblemUnlocked, TOWN_EMBLEMS } from "../economy/emblems";
import { TOWN_NAME_MAX_LENGTH } from "../economy/useEconomy";
import { CARD_GRADIENT, cardShadow, COLORS, FONT, GOLD_GRADIENT, RADIUS, SPACING, TYPE, WEIGHT } from "../theme";
import { GradientFill } from "./GradientFill";
import { ModalBackdrop } from "./ModalBackdrop";
import { ScalePressable } from "./ScalePressable";

interface Props {
  visible: boolean;
  currentName: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}

export function TownNameModal({ visible, currentName, onSave, onCancel }: Props) {
  const { t, state, setEmblem } = useEconomyContext();
  const [draft, setDraft] = useState(currentName);
  const [focusedEmblemId, setFocusedEmblemId] = useState(state.selectedEmblem);

  useEffect(() => {
    if (visible) {
      setDraft(currentName);
      setFocusedEmblemId(state.selectedEmblem);
    }
  }, [visible, currentName, state.selectedEmblem]);

  if (!visible) return null;

  const focusedEmblem = TOWN_EMBLEMS.find((e) => e.id === focusedEmblemId) ?? TOWN_EMBLEMS[0];

  const trimmed = draft.trim();
  const disabled = trimmed.length === 0;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <ModalBackdrop>
        <View style={styles.card}>
          <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
          <Text style={styles.title}>{t("townNameModal.title")}</Text>
          <Text style={styles.subtitle}>{t("townNameModal.subtitle")}</Text>

          <TextInput
            value={draft}
            onChangeText={(text) => setDraft(text.slice(0, TOWN_NAME_MAX_LENGTH))}
            placeholder={t("townNameModal.placeholder")}
            placeholderTextColor="#6b5f4d"
            style={styles.input}
            maxLength={TOWN_NAME_MAX_LENGTH}
            autoFocus
            selectTextOnFocus
          />
          <Text style={styles.counter}>
            {draft.length}/{TOWN_NAME_MAX_LENGTH}
          </Text>

          <Text style={styles.emblemSectionLabel}>{t("townNameModal.emblemSectionLabel")}</Text>
          <Text style={styles.emblemDisclaimer}>{t("townNameModal.emblemHint")}</Text>
          <View style={styles.emblemGrid}>
            {TOWN_EMBLEMS.map((emblem) => {
              const unlocked = isEmblemUnlocked(emblem.id, state);
              const selected = state.selectedEmblem === emblem.id;
              return (
                <Pressable
                  key={emblem.id}
                  onPress={() => {
                    setFocusedEmblemId(emblem.id);
                    if (unlocked) setEmblem(emblem.id);
                  }}
                  style={[
                    styles.emblemChip,
                    selected && styles.emblemChipSelected,
                    !unlocked && styles.emblemChipLocked,
                  ]}
                >
                  <Text style={[styles.emblemIcon, !unlocked && styles.emblemIconLocked]}>{emblem.icon}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.emblemFocusHint}>{t(focusedEmblem.hintKey)}</Text>

          <ScalePressable
            disabled={disabled}
            onPress={() => onSave(trimmed)}
            style={[styles.saveBtn, disabled && styles.saveBtnDisabled]}
            scaleTo={0.96}
          >
            <GradientFill colors={GOLD_GRADIENT} x1="0" y1="0" x2="0" y2="1" />
            <Text style={styles.saveBtnText}>{t("common.save")}</Text>
          </ScalePressable>

          <ScalePressable onPress={onCancel} style={styles.cancelBtn} scaleTo={0.96}>
            <Text style={styles.cancelBtnText}>{t("common.cancel")}</Text>
          </ScalePressable>
        </View>
      </ModalBackdrop>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 18,
    padding: 20,
    overflow: "hidden",
    ...cardShadow,
  },
  title: { color: "#f0e3c8", fontSize: 16, fontFamily: FONT.display, marginBottom: 4 },
  subtitle: { color: "#a0917a", fontSize: 12, marginBottom: 14 },
  input: {
    backgroundColor: "#1a1410",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#3a2d1e",
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#f0e3c8",
    fontSize: 15,
    fontWeight: "700", fontFamily: FONT.bold,
  },
  counter: { color: "#6b5f4d", fontSize: 10, textAlign: "right", marginTop: 4, marginBottom: 14 },
  emblemSectionLabel: {
    color: COLORS.textMuted,
    fontSize: TYPE.micro,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  emblemDisclaimer: { color: "#6b5f4d", fontSize: TYPE.micro, marginBottom: SPACING.sm },
  emblemGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, marginBottom: SPACING.xs },
  emblemChip: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.chip,
    backgroundColor: "#1a1410",
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  emblemChipSelected: { borderColor: COLORS.accent },
  emblemChipLocked: { opacity: 0.35 },
  emblemIcon: { fontSize: TYPE.heading },
  emblemIconLocked: { opacity: 0.7 },
  emblemFocusHint: { color: COLORS.textMuted, fontSize: TYPE.caption, marginBottom: 14 },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    overflow: "hidden",
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: "#1a1410", fontWeight: "800", fontFamily: FONT.black, fontSize: 14 },
  cancelBtn: { alignItems: "center", paddingVertical: 10, marginTop: 4 },
  cancelBtnText: { color: "#a0917a", fontSize: 13, fontWeight: "600", fontFamily: FONT.medium },
});
