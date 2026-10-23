# Codemagic → TestFlight (Fırın & Kafe)

Diğer oyunlarla (Golden Town, Clashborn) aynı düzen. Yapılandırma dosyası depo kökünde: `codemagic.yaml` (iş akışı `firin-kafe-ios`).
Ortak kurulum zaten var: App Store Connect API anahtarı `taxlume-admin` ve `ios_signing` değişken grubu (CERTIFICATE_PRIVATE_KEY). Bu oyun için yeni olan yalnızca App Store Connect'teki uygulama kaydı.

## Bir kerelik: uygulama kaydı (appstoreconnect.apple.com)
1. **Bundle ID kaydı (gerekirse):** developer.apple.com → Certificates, Identifiers & Profiles → Identifiers → "+" → App IDs → App → açıklama "Fırın & Kafe", Bundle ID (Explicit) `com.firinkafe.app` → Register. (İlk Codemagic derlemesi de bunu kendisi kaydeder; App Store Connect kaydını açabilmek için önceden elle kaydetmek en kolayı.)
2. **Uygulama oluştur:** App Store Connect → Apps → "+" → New App → Platform iOS, Ad `Fırın & Kafe`, Birincil dil Türkçe, Bundle ID `com.firinkafe.app`, SKU `firin-kafe-1`, User Access Full Access → Create. İsim başkasında kullanılıyorsa başka bir ad yaz (ana ekranda görünen ad değişmez, bu yalnızca mağaza adı).

## Her derleme
1. codemagic.io → `taxlume-legal` uygulaması → **Start new build**.
2. Branch: `claude/bakery-street-step1` (ya da birleştirdiğin dal). Workflow: **Fırın & Kafe — iOS (IPA for TestFlight)**. Start.
3. İşlem sırası: bağımlılıklar → tip kontrolü ve testler → derleme numarası → Expo prebuild → pod install → imzalama → arşiv/IPA → App Store Connect'e yükleme. Yaklaşık 15–25 dakika.
4. Bitince App Store Connect → uygulama → **TestFlight**: derleme 10–30 dk "işleniyor" görünür, sonra hazır olur. "Internal Testing" altında bir grup oluşturup kendini ekle; telefonda TestFlight uygulamasından kur. İç test için Apple incelemesi gerekmez.

## Sık sorunlar
- **Tip kontrolü / test adımı kırmızı:** buraya yapıştır, birlikte bakarız (derleme başlamadan, saniyeler içinde durur).
- **"Cannot save Signing Certificates without certificate private key":** `ios_signing` grubunda `CERTIFICATE_PRIVATE_KEY` değişkeni yok ya da başka bir key. Golden Town'daki aynı grup kullanılır.
- **"No matching profiles" / bundle id yok:** yukarıdaki 1. adım. API anahtarının rolü App Manager veya Admin olmalı.
- **Yükleme adımı "app not found":** App Store Connect'te uygulama kaydı (2. adım) yok ya da bundle id farklı.
- **Aynı derleme numarası:** Codemagic `BUILD_NUMBER` kullanır (her çalıştırmada artar). Başka bir iş akışıyla aynı uygulamayı yüklersen numaralar çakışabilir; `app.json` `buildNumber` yalnızca başlangıçtır.

## Notlar
- Proje adı app.json adından türer ("Fırın & Kafe" → `FrnKafe`); iş akışı workspace ve scheme'i kendisi bulur.
- `src/generated/assetModules.ts` git'te yoktur; `npm ci` sırasında `postinstall` üretir (yeni resim eklendiğinde `npm run gen:assets`).
- Derleme yalnızca elle başlar (otomatik tetikleyici yok).
