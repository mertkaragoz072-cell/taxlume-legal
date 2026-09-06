import React from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { useEconomyContext } from "../economy/EconomyContext";
import { GOODS_BY_ID } from "../economy/goods";
import { GoodState, RivalTraderOffer } from "../economy/types";
import { CARD_GRADIENT, cardShadow, COLORS, FONT } from "../theme";
import { GradientFill } from "./GradientFill";
import { IconBadge } from "./IconBadge";
import { ModalBackdrop } from "./ModalBackdrop";
import { ScalePressable } from "./ScalePressable";

const RIVAL_ACCENT = "#e0a13f";

interface Props {
  offer: RivalTraderOffer | null;
  holding: GoodState | null;
  onResolve: (accept: boolean) => void;
}

export function RivalTraderModal({ offer, holding, onResolve }: Props) {
  const { t, formatCoins } = useEconomyContext();
  if (!offer) return null;
  const good = GOODS_BY_ID[offer.goodId];
  const canAccept = (holding?.holding ?? 0) >= offer.qty;
  const total = offer.qty * offer.pricePerUnit;

  return (
    <Modal visible transparent animationType="fade">
      <ModalBackdrop>
        <View style={styles.card}>
          <GradientFill colors={CARD_GRADIENT} x1="0" y1="0" x2="1" y2="1" />
          <IconBadge icon="💼" color={RIVAL_ACCENT} />
          <Text style={styles.title}>{t("rivalOffer.title")}</Text>
          <Text style={styles.description}>
            {t("rivalOffer.description", {
              qty: offer.qty,
              icon: good.icon,
              good: t(good.nameKey),
              price: formatCoins(offer.pricePerUnit, 2),
              total: formatCoins(total),
            })}
          </Text>

          <ScalePressable
            onPress={() => onResolve(true)}
            style={[styles.option, canAccept && { borderColor: RIVAL_ACCENT }, !canAccept && styles.optionDisabled]}
            scaleTo={0.96}
          >
            <Text style={styles.optionLabel}>{t("rivalOffer.acceptBtn")}</Text>
            <Text style={styles.optionHint}>
              {canAccept ? t("rivalOffer.acceptHint") : t("rivalOffer.insufficientHint", { good: t(good.nameKey) })}
            </Text>
          </ScalePressable>

          <ScalePressable onPress={() => onResolve(false)} style={styles.option} scaleTo={0.96}>
            <Text style={styles.optionLabel}>{t("rivalOffer.declineBtn")}</Text>
            <Text style={styles.optionHint}>{t("rivalOffer.declineHint")}</Text>
          </ScalePressable>
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
    padding: 20,
    alignItems: "center",
    overflow: "hidden",
    ...cardShadow,
  },
  title: { color: COLORS.textPrimary, fontSize: 17, fontFamily: FONT.display, marginBottom: 8, textAlign: "center" },
  description: {
    color: COLORS.textMuted,
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
  optionDisabled: { opacity: 0.5 },
  optionLabel: { color: COLORS.textPrimary, fontWeight: "700", fontFamily: FONT.bold, fontSize: 14, marginBottom: 3 },
  optionHint: { color: COLORS.textMuted, fontSize: 11 },
});
