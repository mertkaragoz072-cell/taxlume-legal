import React from "react";
import { Modal, StyleSheet } from "react-native";
import medCase from "../../assets/ui/modal/med_case.webp";
import icHand from "../../assets/ui/modal/ic_hand.webp";
import icRedx from "../../assets/ui/modal/ic_redx.webp";
import { Text } from "./AppText";
import { useEconomyContext } from "../economy/EconomyContext";
import { GOODS_BY_ID } from "../economy/goods";
import { GoodState, RivalTraderOffer } from "../economy/types";
import { FONT } from "../theme";
import { ModalBackdrop } from "./ModalBackdrop";
import { ModalShell, OptionBar } from "./ModalKit";

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
        <ModalShell title={t("rivalOffer.title")} medallion={medCase}>
          <Text style={styles.description}>
            {t("rivalOffer.description", {
              qty: offer.qty,
              icon: good.icon,
              good: t(good.nameKey),
              price: formatCoins(offer.pricePerUnit, 2),
              total: formatCoins(total),
            })}
          </Text>
          <OptionBar
            kind="optG"
            title={t("rivalOffer.acceptBtn")}
            hint={
              canAccept
                ? t("rivalOffer.acceptHint")
                : t("rivalOffer.insufficientHint", { good: t(good.nameKey) })
            }
            icon={icHand}
            disabled={!canAccept}
            onPress={() => onResolve(true)}
          />
          <OptionBar
            kind="optR"
            title={t("rivalOffer.declineBtn")}
            hint={t("rivalOffer.declineHint")}
            icon={icRedx}
            onPress={() => onResolve(false)}
          />
        </ModalShell>
      </ModalBackdrop>
    </Modal>
  );
}

const styles = StyleSheet.create({
  description: {
    color: "#f4e8d0",
    fontFamily: FONT.medium,
    fontSize: 13.5,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 14,
    marginTop: 2,
  },
});
