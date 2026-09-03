import React, { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, TextInput, View } from "react-native";
import { TOWN_NAME_MAX_LENGTH } from "../economy/useEconomy";
import { ScalePressable } from "./ScalePressable";

interface Props {
  visible: boolean;
  currentName: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}

export function TownNameModal({ visible, currentName, onSave, onCancel }: Props) {
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
          <Text style={styles.title}>🏘️ Kasabanı Adlandır</Text>
          <Text style={styles.subtitle}>Kasabana istediğin ismi ver.</Text>

          <TextInput
            value={draft}
            onChangeText={(text) => setDraft(text.slice(0, TOWN_NAME_MAX_LENGTH))}
            placeholder="Kasaba ismi"
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
            <Text style={styles.saveBtnText}>Kaydet</Text>
          </ScalePressable>

          <ScalePressable onPress={onCancel} style={styles.cancelBtn} scaleTo={0.96}>
            <Text style={styles.cancelBtnText}>Vazgeç</Text>
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
    backgroundColor: "#2a2016",
    borderRadius: 18,
    padding: 20,
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
    backgroundColor: "#e8c777",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: "#1a1410", fontWeight: "800", fontSize: 14 },
  cancelBtn: { alignItems: "center", paddingVertical: 10, marginTop: 4 },
  cancelBtnText: { color: "#a0917a", fontSize: 13, fontWeight: "600" },
});
