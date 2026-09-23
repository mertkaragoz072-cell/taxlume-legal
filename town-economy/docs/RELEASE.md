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

```bash
eas submit --profile production --platform ios
eas submit --profile production --platform android
```

iOS asks for the Apple ID and the App Store Connect app; Android needs a
Google Play service account JSON. `eas.json`'s `submit.production` is empty
on purpose — those are account credentials and they do not belong in a
repository. Either let the CLI prompt, or set them through EAS secrets.

## 5. After

Play: roll out to a small percentage first and watch the crash rate in
Android vitals before going to 100%. That is the safety net iOS does not
have.

iOS: if App Review rejects, the reply usually names the guideline. A launch
crash on a device is the likeliest one here, for the reason in step 1.

## Version bookkeeping

`app.json` holds 1.0.0 / buildNumber 1 / versionCode 1 as the starting point.
For the next release bump `version`; EAS increments the build numbers itself.
`SAVE_VERSION` in `src/economy/persist.ts` is a different number and moves
only when the save shape changes — it is 51, and bumping it discards every
existing save, so never move it to match the app version.
