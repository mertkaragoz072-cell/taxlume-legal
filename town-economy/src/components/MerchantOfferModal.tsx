import React from "react";
import { Modal, StyleSheet } from "react-native";
import { useAds } from "../ads/AdsContext";
import icHand from "../../assets/ui/modal/ic_hand.webp";
import icRedx from "../../assets/ui/modal/ic_redx.webp";
import medGift from "../../assets/ui/modal/med_gift.webp";
import { useEconomyContext } from "../economy/EconomyContext";
import { TICK_MS } from "../economy/useEconomy";
import { FONT } from "../theme";
import { Text } from "./AppText";
import { ModalBackdrop } from "./ModalBackdrop";
import { ModalShell, OptionBar } from "./ModalKit";

/** The travelling merchant's offer, as a pop-up like the game's other offers:
 * a gift medallion, what he is offering and two bars, "watch" and "no thanks".
 * Nothing is paid unless the ad is watched to the end; the pop-up leaves by
 * itself when the time is up. It is never shown when no ad can be played (the
 * shipped app, until an ad network is connected). */
export function MerchantOfferModal() {
  const { state, t, claimMerchantOffer, dismissMerchantOffer } = useEconomyContext();
  const ads = useAds();
  const offer = state.merchantOffer;
  if (!offer || !ads.available) return null;
  const seconds = Math.max(0, Math.ceil(((offer.expiresAtTick - state.tick) * TICK_MS) / 1000));
  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismissMerchantOffer}>
      <ModalBackdrop>
        <ModalShell title={t("merchant.title")} medallion={medGift}>
          <Text style={styles.description}>{t("merchant.offer", { reward: offer.reward })}</Text>
          <OptionBar
            kind="optG"
            title={t("merchant.watch", { reward: offer.reward })}
            hint={t("merchant.watchHint")}
            icon={icHand}
            onPress={() => void ads.showRewarded().then((ok) => ok && claimMerchantOffer())}
          />
          <OptionBar
            kind="optR"
            title={t("merchant.no")}
            hint={t("merchant.noHint", { seconds })}
            icon={icRedx}
            onPress={dismissMerchantOffer}
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
    fontSize: 14.5,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 14,
    marginTop: 2,
  },
});
