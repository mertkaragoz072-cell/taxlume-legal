import { Platform } from "react-native";
import {
  AdEventType,
  MobileAds,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from "react-native-google-mobile-ads";
import type { RewardedAdProvider } from "./AdsContext";

/** AdMob rewarded ads. The ad unit ids come from the build (EXPO_PUBLIC_ADMOB_REWARDED_IOS /
 * _ANDROID); without them there is no provider, so no "watch an ad" offer appears. In a
 * development build Google's test unit is used, so real ads are never shown while developing. */
export function createAdmobProvider(): RewardedAdProvider | null {
  const real =
    Platform.OS === "ios"
      ? process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS
      : process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID;
  const unitId = __DEV__ ? TestIds.REWARDED : real;
  if (!unitId) return null;

  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    void MobileAds().initialize();
  };

  return {
    showRewarded: () => {
      start();
      return new Promise<boolean>((resolve) => {
        // Non-personalised ads only: no tracking prompt is needed.
        const ad = RewardedAd.createForAdRequest(unitId, { requestNonPersonalizedAdsOnly: true });
        let earned = false;
        let settled = false;
        const finish = (ok: boolean) => {
          if (settled) return;
          settled = true;
          unsubs.forEach((u) => u());
          resolve(ok);
        };
        const unsubs = [
          ad.addAdEventListener(RewardedAdEventType.LOADED, () => void ad.show().catch(() => finish(false))),
          ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
            earned = true;
          }),
          ad.addAdEventListener(AdEventType.CLOSED, () => finish(earned)),
          ad.addAdEventListener(AdEventType.ERROR, () => finish(false)),
        ];
        // No fill or a stuck load: give up after 15 s rather than leave the button hanging.
        setTimeout(() => finish(false), 15000);
        ad.load();
      });
    },
  };
}
