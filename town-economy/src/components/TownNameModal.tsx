import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Text } from "./AppText";
import { useEconomyContext } from "../economy/EconomyContext";
import { EMBLEM_COLORS, isEmblemUnlocked, TOWN_EMBLEMS } from "../economy/emblems";
import { TOWN_NAME_MAX_LENGTH } from "../economy/useEconomy";
import { cardShadow, COLORS, FONT, RADIUS, SPACING, TYPE, WEIGHT, withAlpha } from "../theme";
import icCastle from "../../assets/ui/modal/ic_castle.webp";
import { ModalBackdrop } from "./ModalBackdrop";
import { BigButton, ModalShell } from "./ModalKit";
import { ScalePressable } from "./ScalePressable";

interface Props {
  visible: boolean;
  currentName: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}

export function TownNameModal({ visible, currentName, onSave, onCancel }: Props) {
  const { t, state, setEmblem, setEmblemColor } = useEconomyContext();
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
        <ModalShell title={t("townNameModal.title")} plateIcon={icCastle} onClose={onCancel}>
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
                    selected && { borderColor: state.selectedEmblemColor },
                    !unlocked && styles.emblemChipLocked,
                  ]}
                >
                  <Text style={[styles.emblemIcon, !unlocked && styles.emblemIconLocked]}>{emblem.icon}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.emblemFocusHint}>{t(focusedEmblem.hintKey)}</Text>

          <Text style={styles.emblemSectionLabel}>{t("townNameModal.emblemColorLabel")}</Text>
          <View style={styles.colorRow}>
            {EMBLEM_COLORS.map((color) => (
              <Pressable
                key={color}
                onPress={() => setEmblemColor(color)}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: color },
                  state.selectedEmblemColor === color && styles.colorSwatchSelected,
                ]}
              />
            ))}
          </View>

          <BigButton label={t("common.save")} disabled={disabled} onPress={() => onSave(trimmed)} />

          <ScalePressable onPress={onCancel} style={styles.cancelBtn} scaleTo={0.96}>
            <Text style={styles.cancelBtnText}>{t("common.cancel")}</Text>
          </ScalePressable>
        </ModalShell>
      </ModalBackdrop>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: RADIUS.feature,
    borderWidth: 1,
    borderColor: withAlpha(COLORS.accent, 0.3),
    padding: 20,
    overflow: "hidden",
    ...cardShadow,
  },
  title: { color: COLORS.textPrimary, fontSize: TYPE.title, fontFamily: FONT.display, marginBottom: 4 },
  subtitle: { color: "#f4e8d0", fontSize: TYPE.label, marginBottom: 12, textAlign: "center" },
  input: {
    backgroundColor: "rgba(0,0,0,0.28)",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#c8843c",
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
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
    backgroundColor: "rgba(0,0,0,0.28)",
    borderWidth: 2,
    borderColor: "rgba(200,132,60,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  emblemChipLocked: { opacity: 0.35 },
  emblemIcon: { fontSize: TYPE.heading },
  emblemIconLocked: { opacity: 0.7 },
  emblemFocusHint: { color: COLORS.textMuted, fontSize: TYPE.caption, marginBottom: 14 },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, marginBottom: 14 },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorSwatchSelected: { borderColor: "#fff" },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    overflow: "hidden",
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: COLORS.onLight, fontWeight: WEIGHT.black, fontFamily: FONT.black, fontSize: 14 },
  cancelBtn: { alignItems: "center", paddingVertical: 10, marginTop: 4 },
  cancelBtnText: {
    color: COLORS.textMuted,
    fontSize: TYPE.body,
    fontWeight: WEIGHT.medium,
    fontFamily: FONT.medium,
  },
});
