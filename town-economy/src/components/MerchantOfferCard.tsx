import React from "react";
import { StyleSheet, View } from "react-native";
import { useAds } from "../ads/AdsContext";
import { useEconomyContext } from "../economy/EconomyContext";
import { TICK_MS } from "../economy/useEconomy";
import { FONT, SCREEN_PADDING } from "../theme";
import { Text } from "./AppText";
import { GoldButton } from "./PanelKit";
import { ScalePressable } from "./ScalePressable";

/** The travelling merchant's offer: a card under the header with the gift, a
 * button that plays the ad and a plain "no". Nothing happens unless the ad is
 * watched to the end, and the card leaves by itself when the time is up. It is
 * not shown at all when no ad can be played (the shipped app, until an ad network
 * is connected). */
export function MerchantOfferCard() {
  const { state, t, claimMerchantOffer, dismissMerchantOffer } = useEconomyContext();
  const ads = useAds();
  const offer = state.merchantOffer;
  if (!offer || !ads.available) return null;
  const seconds = Math.max(0, Math.ceil(((offer.expiresAtTick - state.tick) * TICK_MS) / 1000));
  return (
    <View style={styles.card} accessibilityRole="alert">
      <Text aria-hidden style={styles.icon}>
        🧳
      </Text>
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.title} numberOfLines={2}>
            {t("merchant.title")}
          </Text>
          <Text style={styles.time}>{t("merchant.seconds", { seconds })}</Text>
        </View>
        <Text style={styles.text}>{t("merchant.offer", { reward: offer.reward })}</Text>
        <View style={styles.buttons}>
          <View>
            <GoldButton
              label={t("merchant.watch", { reward: offer.reward })}
              height={38}
              onPress={() => void ads.showRewarded().then((ok) => ok && claimMerchantOffer())}
            />
          </View>
          <ScalePressable
            onPress={dismissMerchantOffer}
            accessibilityRole="button"
            accessibilityLabel={t("merchant.no")}
            style={styles.no}
          >
            <Text style={styles.noText}>{t("merchant.no")}</Text>
          </ScalePressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SCREEN_PADDING,
    marginTop: 8,
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#d9a548",
    backgroundColor: "rgba(40,26,14,0.96)",
  },
  icon: { fontSize: 34 },
  body: { flex: 1, minWidth: 0, gap: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, color: "#f6e2a0", fontFamily: FONT.display, fontSize: 15, lineHeight: 19 },
  time: { color: "#e8c777", fontFamily: FONT.medium, fontSize: 12 },
  text: { color: "#f3e8cc", fontFamily: FONT.medium, fontSize: 14, lineHeight: 19 },
  buttons: { gap: 2, marginTop: 2 },
  no: { alignSelf: "flex-end", paddingHorizontal: 6, paddingVertical: 6 },
  noText: { color: "#d8cba8", fontFamily: FONT.medium, fontSize: 13 },
});
