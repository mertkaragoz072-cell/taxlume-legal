import React from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { DIFFICULTIES, DIFFICULTY_ORDER, DifficultyId } from "../economy/difficulty";
import { ScalePressable } from "./ScalePressable";

interface Props {
  visible: boolean;
  currentDifficulty: DifficultyId;
  onSelect: (difficulty: DifficultyId) => void;
  onCancel: () => void;
}

export function DifficultyModal({ visible, currentDifficulty, onSelect, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Yeni Oyun Başlat</Text>
          <Text style={styles.subtitle}>
            Bir zorluk seviyesi seç. Mevcut kasaba ilerlemenin üzerine yazılacak.
          </Text>

          {DIFFICULTY_ORDER.map((id) => {
            const d = DIFFICULTIES[id];
            const active = id === currentDifficulty;
            return (
              <ScalePressable
                key={id}
                onPress={() => onSelect(id)}
                style={[styles.option, active && styles.optionActive]}
                scaleTo={0.97}
              >
                <Text style={styles.optionIcon}>{d.icon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={styles.optionTitleRow}>
                    <Text style={styles.optionLabel}>{d.label}</Text>
                    {active && <Text style={styles.optionActiveTag}>ŞU AN</Text>}
                  </View>
                  <Text style={styles.optionDesc}>{d.description}</Text>
                </View>
              </ScalePressable>
            );
          })}

          <ScalePressable onPress={onCancel} style={styles.cancelBtn} scaleTo={0.97}>
            <Text style={styles.cancelText}>Vazgeç</Text>
          </ScalePressable>
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
    backgroundColor: "#2a2016",
    borderRadius: 18,
    padding: 18,
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
});
