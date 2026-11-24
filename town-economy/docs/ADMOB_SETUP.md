# AdMob + karagozstudios.com: setup checklist

Everything here happens in accounts only the owner can open. The code side is done
(see `ADS.md`); ads stay off until `EXPO_PUBLIC_ADS=1` is set in Codemagic.

## 1. app-ads.txt on karagozstudios.com (fixes "uygulamayı doğrulayamadık")

`karagozstudios.com` is registered at Squarespace Domains but has no website behind it, so
the simplest host is the GitHub Pages site that already serves the privacy and support
pages: with the custom domain on it, `app-ads.txt` in the repo root is served at
`https://karagozstudios.com/app-ads.txt`.

1. Squarespace -> Domains -> karagozstudios.com -> **DNS**: remove the default records that
   point to Squarespace's placeholder, then add four **A** records for `@` (host empty):
   `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`, and one
   **CNAME** `www` -> `mertkaragoz072-cell.github.io`.
2. GitHub -> repo `taxlume-legal` -> Settings -> Pages -> **Custom domain**:
   `karagozstudios.com`, then tick **Enforce HTTPS** once it is offered (can take minutes
   to an hour). This also writes the `CNAME` file by itself.
3. `app-ads.txt` (repo root) must be on the branch Pages publishes (`master`); it is on the
   working branch and needs merging.
4. Open `https://karagozstudios.com/app-ads.txt`: the line must show in the browser.
5. App Store Connect -> App Information -> **Marketing URL**: `https://karagozstudios.com`
   (Google Play: developer website, same).
6. AdMob -> the app -> "Güncellemeleri kontrol edin". Verification can take up to 24 h.

Caveat: once the domain points to GitHub Pages it cannot also be a Squarespace site; if a
Squarespace site is wanted later, `app-ads.txt` has to be served from there instead.

## 2. Ids to hand over (not secret)

- AdMob **app id** for iOS and for Android: `ca-app-pub-XXXXXXXXXXXXXXXX~NNNNNNNNNN`
- **Rewarded ad unit id** for iOS and Android: `ca-app-pub-XXXXXXXXXXXXXXXX/NNNNNNNNNN`

App ids go into `app.json` (replacing Google's sample ids); the unit ids go into Codemagic
as `EXPO_PUBLIC_ADMOB_REWARDED_IOS` / `EXPO_PUBLIC_ADMOB_REWARDED_ANDROID`.

## 3. Before switching ads on in a release

Privacy policy and support pages, App Store privacy labels, Play Data safety and the
store description all say "no ads" today and must change first (see `ADS.md`, step 4-5).
