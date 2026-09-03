import React, { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, TextInput, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { TOWN_NAME_MAX_LENGTH } from "../economy/useEconomy";
import { CARD_GRADIENT, cardShadow, GOLD_GRADIENT } from "../theme";
import { GradientFill } from "./GradientFill";
import { ScalePressable } from "./ScalePressable";

interface Props {
  visible: boolean;
  currentName: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}

export function TownNameModal({ visible, currentName, onSave, onCancel }: Props) {
  const { t } = useEconomyContext();
  const [draft, setDraft] = useState(currentName);

  useEffect(() => {
    if (visible) setDraft(currentName);
  }, [visible, currentName]);

  if (!visible) return null;

  const trimmed = draft.trim();
  const disabled = trimmed.length === 0;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 18,
    padding: 20,
    overflow: "hidden",
    ...cardShadow,
  },
  title: { color: "#f0e3c8", fontSize: 16, fontWeight: "800", marginBottom: 4 },
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
    fontWeight: "700",
  },
  counter: { color: "#6b5f4d", fontSize: 10, textAlign: "right", marginTop: 4, marginBottom: 14 },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    overflow: "hidden",
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: "#1a1410", fontWeight: "800", fontSize: 14 },
  cancelBtn: { alignItems: "center", paddingVertical: 10, marginTop: 4 },
  cancelBtnText: { color: "#a0917a", fontSize: 13, fontWeight: "600" },
});
