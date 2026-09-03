import React from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { DECISION_TEMPLATES_BY_ID } from "../economy/decisions";
import { PendingDecision } from "../economy/types";
import { ScalePressable } from "./ScalePressable";

interface Props {
  decision: PendingDecision | null;
  onResolve: (optionId: string) => void;
}

export function DecisionModal({ decision, onResolve }: Props) {
  if (!decision) return null;
  const template = DECISION_TEMPLATES_BY_ID[decision.templateId];
  if (!template) return null;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.icon}>{template.icon}</Text>
          <Text style={styles.title}>{template.title}</Text>
          <Text style={styles.description}>{template.description}</Text>

          {template.options.map((option) => (
            <ScalePressable
              key={option.id}
              onPress={() => onResolve(option.id)}
              style={styles.option}
              scaleTo={0.96}
            >
              <Text style={styles.optionLabel}>{option.label}</Text>
              <Text style={styles.optionHint}>{option.hint}</Text>
            </ScalePressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#2a2016",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
  },
  icon: { fontSize: 40, marginBottom: 8 },
  title: { color: "#f0e3c8", fontSize: 17, fontWeight: "800", marginBottom: 8, textAlign: "center" },
  description: {
    color: "#a0917a",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 18,
    lineHeight: 18,
  },
  option: {
    width: "100%",
    backgroundColor: "#1a1410",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "#3a2d1e",
  },
  optionLabel: { color: "#f0e3c8", fontWeight: "700", fontSize: 14, marginBottom: 3 },
  optionHint: { color: "#a0917a", fontSize: 11 },
});
