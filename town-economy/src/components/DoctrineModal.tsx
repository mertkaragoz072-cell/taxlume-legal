import React, { useEffect, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { Doctrine, DOCTRINES } from "../economy/doctrines";
import { useEconomyContext } from "../economy/EconomyContext";
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
  onClose: () => void;
}

function DoctrineCard({
  doctrine,
  selected,
  onPress,
  t,
}: {
  doctrine: Doctrine;
  selected: boolean;
  onPress: () => void;
  t: (key: string) => string;
}) {
  return (
    <ScalePressable
      onPress={onPress}
      accessibilityLabel={t(doctrine.nameKey)}
      aria-selected={selected}
      style={[styles.card, selected && styles.cardSelected]}
      scaleTo={0.97}
    >
      <View style={styles.cardHead}>
        <Text aria-hidden style={styles.cardIcon}>
          {doctrine.icon}
        </Text>
        <Text style={styles.cardName}>{t(doctrine.nameKey)}</Text>
      </View>
      <Text style={styles.cardDesc}>{t(doctrine.descriptionKey)}</Text>
      <Text style={styles.bonus}>+ {t(doctrine.bonusKey)}</Text>
      {/* The cost is given the same weight as the upside on purpose: a
          trade-off the player only discovers afterwards is not a choice. */}
      <Text style={styles.penalty}>− {t(doctrine.penaltyKey)}</Text>
    </ScalePressable>
  );
}

/** The one-way choice of what kind of town this is.
 *
 * Two steps, like the difficulty picker: tapping a doctrine only selects it,
 * and a separate confirm commits. It holds for the rest of the run, so a
 * mis-tap must not be able to decide it. */
export function DoctrineModal({ visible, onClose }: Props) {
  const { t, chooseDoctrine } = useEconomyContext();
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) setPending(null);
  }, [visible]);

  if (!visible) return null;

  const confirm = () => {
    if (!pending) return;
    chooseDoctrine(pending);
    onClose();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <ModalBackdrop>
        <View style={styles.sheet}>
          <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
          <Text style={styles.title}>{t("doctrine.title")}</Text>
          <Text style={styles.subtitle}>{t("doctrine.subtitle")}</Text>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {DOCTRINES.map((d) => (
              <DoctrineCard
                key={d.id}
                doctrine={d}
                selected={pending === d.id}
                onPress={() => setPending(d.id)}
                t={t}
              />
            ))}
          </ScrollView>

          <ScalePressable
            onPress={confirm}
            disabled={!pending}
            style={[styles.confirmBtn, !pending && styles.confirmBtnDisabled]}
            scaleTo={0.96}
          >
            {pending && <GradientFill colors={GOLD_GRADIENT} x1="0" y1="0" x2="0" y2="1" />}
            <Text style={[styles.confirmText, !pending && styles.confirmTextDisabled]}>
              {pending ? t("doctrine.confirmBtn") : t("doctrine.pickPrompt")}
            </Text>
          </ScalePressable>

          <ScalePressable onPress={onClose} style={styles.laterBtn} scaleTo={0.96}>
            <Text style={styles.laterText}>{t("doctrine.laterBtn")}</Text>
          </ScalePressable>
        </View>
      </ModalBackdrop>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    width: "100%",
    maxWidth: 380,
    maxHeight: "88%",
    borderRadius: RADIUS.feature,
    padding: SPACING.lg,
    overflow: "hidden",
    ...cardShadow,
  },
  title: { color: COLORS.textPrimary, fontSize: 17, fontFamily: FONT.display, textAlign: "center" },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: TYPE.micro,
    textAlign: "center",
    marginTop: 4,
    marginBottom: SPACING.md,
    lineHeight: 15,
  },
  list: { flexGrow: 0 },
  card: {
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: "#3a2d1e",
    backgroundColor: "#1f1810",
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  cardSelected: {
    borderColor: COLORS.accent,
    borderWidth: 2,
    backgroundColor: withAlpha(COLORS.accent, 0.1),
  },
  cardHead: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  cardIcon: { fontSize: 18, marginRight: SPACING.sm },
  cardName: {
    color: COLORS.textPrimary,
    fontSize: TYPE.body,
    fontWeight: WEIGHT.black,
    fontFamily: FONT.black,
  },
  cardDesc: { color: COLORS.textMuted, fontSize: TYPE.micro, lineHeight: 15, marginBottom: SPACING.sm },
  bonus: { color: COLORS.positive, fontSize: TYPE.micro, fontWeight: WEIGHT.bold, fontFamily: FONT.bold },
  penalty: {
    color: COLORS.negative,
    fontSize: TYPE.micro,
    fontWeight: WEIGHT.bold,
    fontFamily: FONT.bold,
    marginTop: 2,
  },
  confirmBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    overflow: "hidden",
    marginTop: SPACING.sm,
  },
  confirmBtnDisabled: { backgroundColor: "#2a2118" },
  confirmText: { color: "#1a1410", fontWeight: "800", fontFamily: FONT.black, fontSize: 14 },
  confirmTextDisabled: { color: COLORS.textMuted },
  laterBtn: { alignItems: "center", paddingVertical: 10, marginTop: 2 },
  laterText: { color: COLORS.textMuted, fontSize: 13, fontWeight: "600", fontFamily: FONT.medium },
});
