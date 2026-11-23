import React from "react";
import { Image, Modal, StyleSheet, useWindowDimensions, View } from "react-native";
import { useAds } from "../ads/AdsContext";
import cardArt from "../../assets/ui/mervecard/merchant.webp";
import characterArt from "../../assets/ui/mervecard/merchant_char.webp";
import { useEconomyContext } from "../economy/EconomyContext";
import { TICK_MS } from "../economy/useEconomy";
import { FONT } from "../theme";
import { Text } from "./AppText";
import { ModalBackdrop } from "./ModalBackdrop";
import { ScalePressable } from "./ScalePressable";

// The card is Merve's tutorial card with the travelling merchant standing in
// the portrait window: the same 1616 x 853 art, so every field sits where hers do
// (positions in the art's own pixels, scaled by card width / ART_W).
const ART_W = 1616;
const ART_H = 853;
const NAME = { x: 662, y: 120, w: 638, h: 83 };
const TAG = { x: 1327, y: 120, w: 225, h: 77 };
const TITLE = { x: 688, y: 245, w: 810, h: 110 };
const BODY = { x: 688, y: 405, w: 880, h: 225 };
const SKIP = { x: 842, y: 660, w: 218, h: 93 };
const NEXT = { x: 1093, y: 637, w: 414, h: 128 };

/** The travelling merchant's offer, as a pop-up in Merve's style: his portrait,
 * the name plaque, the time he stays, what he offers and two buttons — "no"
 * and "watch an ad". Nothing is paid unless the ad is watched to the end, and
 * the pop-up leaves by itself when the time is up. It is never shown when no ad
 * can be played (the shipped app, until an ad network is connected). */
export function MerchantOfferModal() {
  const { state, t, claimMerchantOffer, dismissMerchantOffer } = useEconomyContext();
  const ads = useAds();
  const { width: windowWidth } = useWindowDimensions();
  const offer = state.merchantOffer;
  if (!offer || !ads.available) return null;

  const seconds = Math.max(0, Math.ceil(((offer.expiresAtTick - state.tick) * TICK_MS) / 1000));
  const cardW = Math.min(windowWidth - 16, 480);
  const s = cardW / ART_W;
  const cardH = ART_H * s;
  const w = (px: number) => px * s;
  const fit = (text: string, boxW: number, maxSize: number, em: number) =>
    Math.max(8, Math.min(maxSize, (boxW * 0.92) / (text.length * em)));

  const name = t("merchant.title");
  const headline = t("merchant.headline");
  const body = t("merchant.offer", { reward: offer.reward });
  const tip = t("merchant.tip");
  const timeLeft = t("merchant.seconds", { seconds });
  const watch = t("merchant.watch", { reward: offer.reward });
  const no = t("merchant.no");

  // sized from the length, like Merve's card: the largest size at which the
  // sentence and its tip still fit the field
  const fieldW = w(BODY.w);
  const fieldH = w(BODY.h);
  let bodySize = 14;
  const lines = (size: number) =>
    Math.ceil((body.length * 0.52 * size) / fieldW) + Math.ceil(((tip.length + 3) * 0.52 * size) / fieldW);
  while (bodySize > 8.5 && lines(bodySize) * bodySize * 1.17 > fieldH) bodySize -= 0.25;

  const box = (f: { x: number; y: number; w: number; h: number }) => ({
    left: w(f.x),
    top: w(f.y),
    width: w(f.w),
    height: w(f.h),
  });

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismissMerchantOffer}>
      <ModalBackdrop>
        <View style={{ width: cardW, height: cardH }}>
          <Image source={cardArt} style={styles.art} resizeMode="stretch" />
          {/* The merchant stands in front of the window, like Merve: his
              hat and the coin in his hand reach past the window's edge. */}
          <View
            pointerEvents="none"
            style={{ position: "absolute", left: w(14), top: w(150), width: w(690), height: w(644) }}
          >
            <Image source={characterArt} style={styles.character} resizeMode="contain" />
          </View>

          <View style={[styles.field, box(NAME)]}>
            <Text
              style={[styles.name, { fontSize: fit(name, w(NAME.w), w(NAME.h) * 0.5, 0.84) }]}
              numberOfLines={1}
            >
              {name}
            </Text>
          </View>
          <View style={[styles.field, box(TAG)]}>
            <Text
              style={[styles.tag, { fontSize: fit(timeLeft, w(TAG.w), w(TAG.h) * 0.46, 0.62) }]}
              numberOfLines={1}
            >
              {timeLeft}
            </Text>
          </View>
          <View style={[styles.field, box(TITLE)]}>
            <Text
              accessibilityRole="header"
              style={[styles.title, { fontSize: fit(headline, w(TITLE.w), w(TITLE.h) * 0.46, 0.86) }]}
              numberOfLines={1}
            >
              {headline}
            </Text>
          </View>
          <View style={[styles.bodyBox, box(BODY)]}>
            <Text style={[styles.body, { fontSize: bodySize, lineHeight: bodySize * 1.17 }]}>{body}</Text>
            <Text style={[styles.tip, { fontSize: bodySize, lineHeight: bodySize * 1.17 }]}>▸ {tip}</Text>
          </View>

          <ScalePressable
            onPress={dismissMerchantOffer}
            accessibilityRole="button"
            accessibilityLabel={no}
            style={[styles.field, box(SKIP)]}
            scaleTo={0.96}
          >
            <Text style={[styles.skipText, { fontSize: fit(no, w(SKIP.w), w(SKIP.h) * 0.5, 0.62) }]}>
              {no}
            </Text>
          </ScalePressable>
          <ScalePressable
            onPress={() => void ads.showRewarded().then((ok) => ok && claimMerchantOffer())}
            accessibilityRole="button"
            accessibilityLabel={watch}
            style={[styles.field, box(NEXT)]}
            scaleTo={0.96}
          >
            <Text style={[styles.nextText, { fontSize: fit(watch, w(NEXT.w), w(NEXT.h) * 0.4, 0.62) }]}>
              {watch}
            </Text>
          </ScalePressable>
        </View>
      </ModalBackdrop>
    </Modal>
  );
}

const styles = StyleSheet.create({
  art: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  character: { width: "100%", height: "100%" },
  field: { position: "absolute", alignItems: "center", justifyContent: "center" },
  bodyBox: { position: "absolute", overflow: "hidden" },
  name: { color: "#f6e2a0", fontFamily: FONT.display, textAlign: "center", letterSpacing: 0.5 },
  tag: { color: "#f1e3b8", fontFamily: FONT.bold, textAlign: "center" },
  title: { color: "#4a2f1a", fontFamily: FONT.display, textAlign: "center" },
  body: { color: "#3d2415", fontFamily: FONT.medium },
  tip: { color: "#1f6b32", fontFamily: FONT.bold, marginTop: 1 },
  skipText: { color: "#5a3d22", fontFamily: FONT.bold, textAlign: "center" },
  nextText: { color: "#f6e2a0", fontFamily: FONT.black, textAlign: "center" },
});
