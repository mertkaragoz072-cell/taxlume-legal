# Rewarded ads: what exists and what a real ad network needs

## What the game does today

Upgrades, properties and research are no longer instant: you pay, then wait
(`src/economy/construction.ts`). The wait grows with the price: 10 s for the
cheapest, then about 20 s, 30 s, 50 s, 1½ min, 5 min, 12 min, capped at 30 min.
It runs on the real clock, also while the game is closed; the app schedules a
local notification for when it ends. One upgrade, one property and one research
can be under way at the same time.

A **rewarded ad** takes 5 minutes off a waiting improvement, or finishes it when
5 minutes or less are left (`skipImprovement`). The buttons ("📺 −5 min",
"📺 Finish") appear in the card only when an ad can be shown.

## Which ad network answers

`getAdProvider()` in `src/ads/AdsContext.tsx` decides:

- nothing configured: **no ad is offered and the skip buttons stay hidden**. This
  is what a release build does today, so right now players simply wait;
- `EXPO_PUBLIC_ADS_MOCK=1`: a pretend ad (3 seconds) for development and
  screenshots. Never set it in a release;
- a real network: return an object with `showRewarded(): Promise<boolean>` that
  resolves `true` only when the ad was watched to the end.

## To switch on real ads (AdMob), you need to

1. **An AdMob account**, an app entry for Android and for iOS, and one _rewarded_
   ad unit per platform (app ids and ad unit ids).
2. **The SDK**: `react-native-google-mobile-ads` plus its Expo config plugin in
   `app.json` (app ids), a native rebuild (Codemagic), and a provider that wraps
   `RewardedAd` and resolves on `EARNED_REWARD`. Use Google's test ad unit ids
   while developing; real ids only in release builds.
3. **iOS tracking prompt** (App Tracking Transparency) if the ads are
   personalised, with an `NSUserTrackingUsageDescription` text; or run
   non-personalised ads only.
4. **Privacy policy and support pages** (`golden-town-privacy.html`,
   `golden-town-support.html`): they now say the game has no ads and no
   third-party SDKs. With AdMob that is no longer true. They must say that Google
   AdMob shows ads, what it may collect (device identifiers, approximate
   location, usage data), and how to limit it. Do not change them until the ads
   actually ship.
5. **Store forms**: App Store privacy labels (Identifiers, Usage Data, Advertising
   data) and Google Play "Data safety" and the ads declaration; the age rating
   and the audience (kids settings change what ads are allowed).
6. **Frequency**: the timers already limit how often a player can want an ad.
   AdMob's own frequency limits apply on top; when it has no ad to show, the
   provider should resolve `false` and the button can be hidden for a while.

Nothing in the game depends on which network is used: only the provider changes.
