import React from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { DECISION_TEMPLATES_BY_ID } from "../economy/decisions";
import { PendingDecision } from "../economy/types";
import { CARD_GRADIENT, cardShadow, COLORS, FONT, RADIUS, SPACING, TYPE, WEIGHT, withAlpha } from "../theme";

const DECISION_ACCENT = "#c58ee0";
import { GradientFill } from "./GradientFill";
import { IconBadge } from "./IconBadge";
import { ModalBackdrop } from "./ModalBackdrop";
import { ScalePressable } from "./ScalePressable";

interface Props {
  decision: PendingDecision | null;
  onResolve: (optionId: string) => void;
}

export function DecisionModal({ decision, onResolve }: Props) {
  const { t } = useEconomyContext();
  if (!decision) return null;
  const template = DECISION_TEMPLATES_BY_ID[decision.templateId];
  if (!template) return null;

  return (
    <Modal visible transparent animationType="fade">
      <ModalBackdrop>
        <View style={styles.card}>
          <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
          <IconBadge icon={template.icon} color={DECISION_ACCENT} />
          <Text style={styles.title}>{t(template.titleKey)}</Text>
          <Text style={styles.description}>{t(template.descriptionKey)}</Text>

          {template.options.map((option) => (
            <ScalePressable
              key={option.id}
              onPress={() => onResolve(option.id)}
              style={styles.option}
              scaleTo={0.96}
            >
              <Text style={styles.optionLabel}>{t(option.labelKey)}</Text>
              <Text style={styles.optionHint}>{t(option.hintKey)}</Text>
            </ScalePressable>
          ))}
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
    padding: 20,
    alignItems: "center",
    overflow: "hidden",
    ...cardShadow,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontFamily: FONT.display,
    marginBottom: SPACING.sm,
    textAlign: "center",
  },
  description: {
    color: COLORS.textMuted,
    fontSize: TYPE.body,
    textAlign: "center",
    marginBottom: 18,
    lineHeight: 18,
  },
  option: {
    width: "100%",
    backgroundColor: COLORS.onLight,
    borderRadius: RADIUS.card,
    paddingVertical: SPACING.md,
    paddingHorizontal: 14,
    marginBottom: SPACING.sm + 2,
    borderWidth: 2,
    borderColor: "#3a2d1e",
  },
  optionLabel: {
    color: COLORS.textPrimary,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    fontSize: 14,
    marginBottom: 3,
  },
  optionHint: { color: COLORS.textMuted, fontSize: TYPE.caption },
});
