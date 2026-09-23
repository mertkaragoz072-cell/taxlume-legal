# Release runbook — Golden Town 1.0.0

Every value a console will ask for, in the order it asks. Copy from here
rather than deciding at the keyboard; the wording in `STORE_LISTING.md` is
the source for the descriptions, this is the source for everything else.

## 0. Publish the legal pages first

The privacy URL must resolve before either console will take a submission,
and GitHub Pages serves this repository from the root of `master`. Until the
branch lands there, both URLs 404.

```bash
git checkout master && git merge claude/town-economy-inflation-game-v4riky
git push origin master
```

Then open both in a browser and confirm they load — not "should load":

- https://mertkaragoz072-cell.github.io/taxlume-legal/golden-town-privacy.html
- https://mertkaragoz072-cell.github.io/taxlume-legal/golden-town-support.html

Pages can take a minute or two to rebuild after the push.

## 1. Build

Two routes. **Codemagic** is the one this repository is set up for: the build
runs on their machines from `codemagic.yaml`, so nothing has to be installed
on your laptop, and the Apple account already connected there does the
signing. EAS is the fallback, and it needs Node and a local checkout.

### 1a. Codemagic — the checked-in route

`codemagic.yaml` sits at the root of this repository and defines two
workflows, `android-release` and `ios-release`. Both run `expo prebuild`
themselves, so `ios/` and `android/` never need to exist on your disk.

One-time setup:

1. **Connect the repository.** codemagic.io → Add application → GitHub →
   `mertkaragoz072-cell/taxlume-legal`. When it asks how the build is
   configured, choose **codemagic.yaml**; it finds the file itself.

2. **Upload the Android keystore.** Generate one if you have not:

   ```bash
   keytool -genkey -v -keystore golden-town-upload.jks -storetype JKS \
     -keyalg RSA -keysize 2048 -validity 10000 -alias upload
   ```

   **Back that file and its passwords up somewhere that is not this laptop.**
   Google Play identifies the app by this key forever — lose it and you
   cannot update the listing, only start a new one under a new package name.

   Then: Codemagic → Teams/Personal settings → Code signing identities →
   Android keystores → upload it with reference name **`golden_town_upload`**.
   Exactly that name — `codemagic.yaml` asks for it by name, and a mismatch
   stops the build at the signing step rather than shipping something broken.

3. **Connect Apple.** Teams/Personal settings → Integrations → Developer
   Portal → your App Store Connect API key, named **`codemagic`** (or change
   `integrations.app_store_connect` in the YAML to whatever you called it).
   The bundle identifier `com.goldentown.app` has to exist in App Store
   Connect already, or there is no profile for the signing step to fetch.

Then: **Start new build** → choose the workflow. Android takes roughly 15
minutes and hands back a `.aab` to download; iOS takes 20–25 and uploads
itself to TestFlight.

Neither workflow has a `triggering:` block, so nothing builds on push — you
start builds by hand. What the steps are for:

| Step                                                | Why it is there                                                                                                                                                                                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm ci`                                            | Builds from the lockfile rather than the version ranges.                                                                                                                                                                             |
| `npm run verify` (Android only)                     | Typecheck, lint, format, i18n, 190 tests — fails in a minute instead of at the end of a 20-minute Gradle run. Run once, on the Android workflow, rather than twice.                                                                  |
| `set-build-number.js`                               | Stamps Codemagic's `$BUILD_NUMBER` into `app.json` before prebuild copies it into Info.plist and build.gradle. Without it every build is number 1, and both stores refuse a number they have already seen.                           |
| `expo prebuild`                                     | Generates `ios/` and `android/` from `app.json`. Gitignored on purpose: build output, not source.                                                                                                                                    |
| `patch-android-signing.js`                          | prebuild signs the _release_ build type with the _debug_ key. This repoints it at the uploaded keystore, and throws if the keystore variables are absent — so a debug-signed bundle, which Play rejects, cannot be produced quietly. |
| `gradlew bundleRelease` / `xcode-project build-ipa` | The artifact itself.                                                                                                                                                                                                                 |

### 1b. EAS — the fallback

EAS builds in Expo's cloud, but the CLI uploads the project from your disk —
so the repository has to be checked out locally first. Node 22 and npm 10 are
what this was developed against.

```bash
git clone https://github.com/mertkaragoz072-cell/taxlume-legal.git
cd taxlume-legal/town-economy
npm ci                         # ci, not install: builds from the lockfile
npm install -g eas-cli
eas login                      # your Expo account, not Apple or Google
eas init                       # links the app to an EAS project, first time only
eas build --profile production --platform all
```

`eas init` writes `extra.eas.projectId` into `app.json`. **Commit that.**
Without it in the repository the next machine creates a second EAS project
and the build numbering starts over.

The first build asks for signing credentials and the answer to both is "let
EAS handle it":

- **iOS** — sign in with the Apple ID on the Developer Program. EAS creates
  the distribution certificate and provisioning profile for you.
- **Android** — EAS generates an upload keystore and keeps it. **This
  keystore is how Google Play identifies the app forever.** Lose it and you
  cannot ship an update to the same listing, only a new listing under a new
  package name. Back it up the day it is created:
  `eas credentials` → Android → download the keystore, and keep it somewhere
  that is not only this laptop.

Builds run for 10–25 minutes. The CLI prints a link; the artifacts also sit
under Builds at expo.dev, and that is where the .ipa and .aab download from.

`eas.json` sets `appVersionSource: "remote"` with `autoIncrement`, so EAS owns
the build numbers from here on; `app.json`'s `buildNumber` / `versionCode` are
only the starting point.

### Either route: check it on a phone

**Install the .aab or the iOS build on a phone before submitting.** It costs
five minutes on a build you are producing anyway. On iOS this is not optional
in practice: App Review opens the app on a real device, and an app that
crashes on launch is rejected, not updated — a rejection costs another 24–48
hour round trip, while a device check costs five minutes.

What to look at, since none of it has ever run outside a browser: the app
opens without crashing, sounds play, haptics fire on a trade, the save
survives backgrounding and returning, and the notification permission prompt
appears and can be declined without breaking anything.

## 2. App Store Connect

| Field             | Value                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------- |
| Platform          | iOS, iPhone only (`supportsTablet: false`)                                                    |
| Name              | Golden Town                                                                                   |
| Bundle ID         | com.goldentown.app                                                                            |
| SKU               | golden-town-1                                                                                 |
| Primary language  | English (U.S.)                                                                                |
| Category          | Games → Simulation. Secondary: Strategy                                                       |
| Price             | Free                                                                                          |
| Age rating        | 4+ — no violence, no profanity, no user content, no gambling                                  |
| Export compliance | Already answered in the binary (`usesNonExemptEncryption: false`), so no prompt should appear |
| Content rights    | Does not contain, show or access third-party content                                          |
| Localizations     | English (U.S.) and Turkish                                                                    |

Screenshots: `store-assets/screenshots-poster/en/` and `/tr/`, eight each,
1290×2796 — the poster set, not the plainer framed set or the raw captures
next to it. Upload in filename order — the first two or three are what the listing shows
without scrolling, which is why Market and the trade map lead.

App preview video is optional. `preview-<lang>-886x1920.mp4` is there if you
want it, with the caveat in `STORE_LISTING.md` that it was captured from the
web build rather than a device.

**App Privacy: "Data Not Collected."** Answer no to every category. The app
has no account, no analytics, no ads, no network calls at all — this is the
same claim the privacy policy and the store description both make, and all
three have to agree.

## 3. Google Play Console

| Field            | Value                                                                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App name         | Golden Town                                                                                                                                                     |
| Package          | com.goldentown.app                                                                                                                                              |
| Default language | English (United States)                                                                                                                                         |
| Category         | Games → Simulation                                                                                                                                              |
| Price            | Free                                                                                                                                                            |
| Content rating   | Fill the IARC questionnaire: no violence, no sexuality, no profanity, no controlled substances, no gambling, no user interaction, no data sharing               |
| Target audience  | 13+ (the game is about inflation and trading; nothing stops it being lower, but it is not designed for children and a Families declaration brings extra policy) |
| Ads              | Contains no ads                                                                                                                                                 |
| Data safety      | No data collected, no data shared                                                                                                                               |
| Privacy policy   | the URL above                                                                                                                                                   |

Graphics Play asks for that the App Store does not:

| Asset             | Size                   | Where it is                                     |
| ----------------- | ---------------------- | ----------------------------------------------- |
| App icon          | 512×512 PNG            | `store-assets/play-icon-512.png`                |
| Feature graphic   | 1024×500               | `store-assets/play-feature-<lang>-1024x500.png` |
| Phone screenshots | 1290×2796 are accepted | `store-assets/screenshots-poster/<lang>/`       |

## 4. Submit

**From Codemagic.** iOS needs nothing further: `ios-release` publishes to
TestFlight itself, and promoting that build to the App Store is a button in
App Store Connect once the listing in step 2 is filled in. Android is a
manual upload for the first release — download the `.aab` from the build
page and drop it into Play Console. Automating it needs a Google Play
service account JSON stored as a secure variable; the `publishing:` block
for it is in `codemagic.yaml`, commented out, waiting for that file.

**From EAS.**

```bash
eas submit --profile production --platform ios
eas submit --profile production --platform android
```

iOS asks for the Apple ID and the App Store Connect app; Android needs the
same Google Play service account JSON. `eas.json`'s `submit.production` is
empty on purpose — those are account credentials and they do not belong in
a repository. Either let the CLI prompt, or set them through EAS secrets.

## 5. After

Play: roll out to a small percentage first and watch the crash rate in
Android vitals before going to 100%. That is the safety net iOS does not
have.

iOS: if App Review rejects, the reply usually names the guideline. A launch
crash on a device is the likeliest one here, for the reason in step 1.

## Version bookkeeping

`app.json` holds 1.0.0 / buildNumber 1 / versionCode 1 as the starting point.
For the next release bump `version` — the marketing number is a decision, so
no script touches it. The build numbers underneath it are a counter and are
handled for you: Codemagic stamps `$BUILD_NUMBER` in via
`scripts/ci/set-build-number.js`, and EAS increments them itself under
`appVersionSource: "remote"`.
`SAVE_VERSION` in `src/economy/persist.ts` is a different number and moves
only when the save shape changes — it is 51, and bumping it discards every
existing save, so never move it to match the app version.
