import type { RewardedAdProvider } from "./AdsContext";

/** Web has no AdMob: no provider, so no ad is ever offered there. */
export function createAdmobProvider(): RewardedAdProvider | null {
  return null;
}
