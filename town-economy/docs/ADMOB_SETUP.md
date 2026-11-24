# AdMob + karagozstudios.com: setup checklist

Everything here happens in accounts only the owner can open. The code side is done
(see `ADS.md`); ads stay off until `EXPO_PUBLIC_ADS=1` is set in Codemagic.

## 1. app-ads.txt on karagozstudios.com (fixes "uygulamayı doğrulayamadık")

1. Upload `docs/app-ads.txt` (one line, already holds the publisher id) in Squarespace:
   Pages -> Not Linked -> + -> File. It gets an address like `/s/app-ads.txt`.
2. Settings -> Developer Tools -> URL Mappings, add: `/app-ads.txt -> /s/app-ads.txt 301`
3. Open `https://karagozstudios.com/app-ads.txt` in a browser. The line must be
   **shown** on the page, not downloaded. If it downloads, tell Claude.
4. App Store Connect -> the app -> App Information -> **Marketing URL**:
   `https://karagozstudios.com`. (Google Play: developer contact website, same.)
5. AdMob -> app -> "Güncellemeleri kontrol edin". Verification can take up to 24 h.

## 2. Ids to hand over (not secret)

- AdMob **app id** for iOS and for Android: `ca-app-pub-XXXXXXXXXXXXXXXX~NNNNNNNNNN`
- **Rewarded ad unit id** for iOS and Android: `ca-app-pub-XXXXXXXXXXXXXXXX/NNNNNNNNNN`

App ids go into `app.json` (replacing Google's sample ids); the unit ids go into Codemagic
as `EXPO_PUBLIC_ADMOB_REWARDED_IOS` / `EXPO_PUBLIC_ADMOB_REWARDED_ANDROID`.

## 3. Before switching ads on in a release

Privacy policy and support pages, App Store privacy labels, Play Data safety and the
store description all say "no ads" today and must change first (see `ADS.md`, step 4-5).
