# Fırın & Kafe — iOS / Android uygulaması (TestFlight yolu)

Oyun (`../bakery-street`, HTML5 canvas) tam ekran bir WebView içinde çalışır. Golden Town ile aynı hat kullanılır: **Expo + EAS Build**. Build Expo'nun bulutunda yapılır, **Mac gerekmez**; Apple imzasını EAS senin Apple hesabınla halleder.

## Nasıl çalışır

- `scripts/build-game.mjs` oyunu paketler: `src/main.js` tek bir klasik script olur (file:// sayfalar ES modülü yükleyemez), `index.html` buna göre düzeltilir, resimler `game-assets/` altına kopyalanır ve `src/generated/game.ts` yazılır. Üretilen her şey git'e girmez; `npm run build:game` ile yeniden oluşur, EAS'ta `eas-build-post-install` bunu otomatik çalıştırır.
- `App.tsx` ilk açılışta oyun dosyalarını uygulamanın belgeler klasörüne kopyalar ve `index.html`'i oradan açar. İnternet gerekmez.
- **Kayıtlar:** oyun ilerlemesini `localStorage`'a yazar. Her yazma `AsyncStorage`'a yansıtılır ve oyun başlamadan önce geri yüklenir; yani iOS/Android WebView deposunu silse bile ilerleme kaybolmaz.
- WebView çökerse (`onContentProcessDidTerminate`, `onRenderProcessGone`) sayfa yeniden yüklenir.
- Yatay mod kilitli, durum çubuğu gizli, `viewport-fit=cover` ile çentik alanları oyunun kendi güvenli alanlarıyla işlenir.

## Yerel kontrol

```bash
cd bakery-street-app
npm ci
npm run typecheck            # oyunu paketler + TypeScript denetimi
npx expo export --platform ios --output-dir /tmp/exp   # Metro paketinin kurulabildiğini doğrular
```

## TestFlight'a yükleme

Gerekenler: **Apple Developer Program üyeliği** (99 USD/yıl) ve bir **Expo hesabı** (ücretsiz).

```bash
git clone https://github.com/mertkaragoz072-cell/taxlume-legal.git
cd taxlume-legal/bakery-street-app
npm ci
npm install -g eas-cli
eas login                    # Expo hesabın
eas init                     # ilk seferde: EAS projesini bağlar, app.json'a extra.eas.projectId yazar → bunu COMMIT et
eas build --profile production --platform ios
```

İlk build'de EAS Apple ID'ni sorar ve dağıtım sertifikası ile provisioning profile'ı kendisi oluşturur ("let EAS handle it"). Build 10–25 dakika sürer.

```bash
eas submit --profile production --platform ios
```

Bu komut build'i App Store Connect'e yükler (App Store Connect'te önce uygulama kaydı gerekir, aşağıya bak). Birkaç dakika sonra build TestFlight'ta görünür:

- **İç test (App Store Connect kullanıcıları):** inceleme gerekmez, hemen kurulur.
- **Dış test (herkese açık bağlantı):** Apple kısa bir beta incelemesi yapar.

### App Store Connect'te uygulama kaydı

| Alan | Değer |
|---|---|
| Platform | iOS, yalnızca iPhone (`supportsTablet: false`) |
| Ad | Fırın & Kafe |
| Bundle ID | `com.firinkafe.app` (istersen `app.json`'da değiştir; sonradan değişmez) |
| SKU | firin-kafe-1 |
| Dil | Türkçe |
| Kategori | Oyunlar → Simülasyon |
| Fiyat | Ücretsiz |
| Yaş sınırı | 4+ (şiddet, küfür, kullanıcı içeriği, kumar yok) |
| Gizlilik | "Veri toplanmıyor": hesap, analitik, reklam ve ağ çağrısı yok |
| İhracat uyumu | İkilide cevaplanmış (`usesNonExemptEncryption: false`) |

Gizlilik politikası adresi gerekir; Golden Town'daki gibi `privacy.html` sayfası GitHub Pages'ten yayınlanabilir (`../privacy.html` var, oyuna göre uyarlanmalı).

## Sürüm numaraları

`app.json`: `version` 1.0.0, `buildNumber`/`versionCode` yalnızca başlangıç değeri; `eas.json` `appVersionSource: "remote"` + `autoIncrement` ile EAS build numarasını kendisi artırır. Yeni sürümde `version`'ı artır.

## Bilinen sınırlar (dürüst durum)

- **Hiçbir yerde gerçek cihazda denenmedi.** Doğrulananlar: oyunun paketlenmiş hâli bir tarayıcıda `file://` üzerinden açılıp çalışıyor, kayıt köprüsü doğru yansıtıp geri yüklüyor, TypeScript denetimi ve `expo export` (iOS Hermes paketi) başarılı. WKWebView'da performans, ses ve dokunma hissi ilk TestFlight sürümünde mutlaka telefonda kontrol edilmeli. Apple, açılışta çöken bir uygulamayı reddeder.
- İlk açılışta ~107 resim diske kopyalanır (birkaç saniye); sonraki açılışlar hızlıdır.
- Gökyüzü kenar renkleri uygulamada sabit tonlara düşer (WebView `file://` resimlerinin piksellerini okumaya izin vermez); görüntü farkı küçüktür.
- Apple yalnızca web sitesi saran uygulamaları reddedebilir (yönerge 4.2). Bu oyun tamamen yerelde çalışan, kendi içeriği olan bir oyun; yine de incelemede karar Apple'ındır.
- Android için `eas build --profile production --platform android` aynı şekilde çalışır (Play Console iç test); keystore'u yedekle (Golden Town `RELEASE.md`'deki uyarı geçerli).
